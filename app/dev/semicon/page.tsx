'use client';

import { useEffect, useMemo, useState } from 'react';
import { DevNavLinks } from '@/components/dev';
import { RefreshCw } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

type Decision = 'BUY_CANDIDATE' | 'WATCH' | 'AVOID';

interface SemiconSignal {
  code: string;
  ticker: string;
  name: string;
  label: string;
  segment: string;
  decision: Decision;
  score: number;
  reasons: string[];
  warnings: string[];
  entry_rule: string;
  entry_trigger_price?: number;
  date?: string;
  close?: number;
  ret5?: number;
  ret20?: number;
  vs25?: number;
  dist20hi?: number;
  max_dd_60d?: number;
  cvar05?: number;
  revenue_growth?: number;
  op_margin?: number;
  left_tail?: string;
  judgement?: string;
  trade_bucket?: string;
  trade_bucket_reasons?: string[];
  entry_status?: 'READY' | 'WAIT' | 'AVOID';
  entry_priority?: number;
  entry_reasons?: string[];
}

interface OverseasRow {
  ticker: string;
  name: string;
  date?: string;
  close?: number;
  ret1?: number;
  ret5?: number;
  ret20?: number;
}

interface BacktestRow {
  variant: string;
  n: number;
  days: number;
  pf?: number;
  win_rate?: number;
  sum_pnl_100?: number;
  avg_pnl_100?: number;
  max_dd_100?: number;
  worst_trade_100?: number;
  q05_100?: number;
  cvar05_100?: number;
  from?: string;
  to?: string;
}

interface SegmentStrengthRow {
  segment: string;
  count: number;
  avg_ret5?: number;
  avg_ret20?: number;
  avg_vs25?: number;
  breadth5?: number;
  breadth20?: number;
  watch_count: number;
  leader_code?: string;
  leader_name?: string;
  leader_score?: number;
}

interface BucketSummaryRow {
  bucket: string;
  count: number;
  leaders: Array<{ code?: string; name?: string; score?: number }>;
}

interface SemiconResponse {
  generated_at?: string;
  data_date?: string;
  data_stale?: boolean;
  stale_days?: number;
  market: {
    state: string;
    label: string;
    positive_count?: number;
    negative_1d_count?: number;
    sox_ret5?: number;
    nvda_ret5?: number;
  };
  counts: { buy: number; watch: number; avoid: number; total: number };
  signals: SemiconSignal[];
  segment_strength?: SegmentStrengthRow[];
  bucket_summary?: BucketSummaryRow[];
  overseas: OverseasRow[];
  report_available: boolean;
  report_url?: string;
  source?: string;
  source_environment?: string;
  source_data_mode?: 'local' | 's3';
  source_data_mode_reason?: string;
  source_data_mode_error?: string | null;
  operation?: {
    headline: string;
    primary_action: string;
    morning_checks: string[];
    avoid_rules: string[];
  };
  backtest?: {
    available: boolean;
    rows: BacktestRow[];
    report_url?: string | null;
    takeaway: string;
  };
}

const fmt = (v?: number, digits = 1) => v == null || Number.isNaN(v) ? '-' : v.toLocaleString('ja-JP', { maximumFractionDigits: digits, minimumFractionDigits: digits });
const pct = (v?: number) => v == null || Number.isNaN(v) ? '-' : `${v > 0 ? '+' : ''}${v.toFixed(2)}%`;
const clsPct = (v?: number) => v == null ? 'text-muted-foreground' : v > 0 ? 'text-emerald-400' : v < 0 ? 'text-rose-400' : 'text-muted-foreground';
const yen = (v?: number) => v == null || Number.isNaN(v) ? '-' : `${v >= 0 ? '+' : ''}${Math.round(v).toLocaleString('ja-JP')}円`;

const variantLabel = (variant: string) => {
  const map: Record<string, string> = {
    all_top3: '全銘柄 Top3',
    tradable_top1: '国内現実株 Top1',
    tradable_top3: '国内現実株 Top3',
    tradable_left_tail_guard: '左尾ガード Top3',
    tradable_price_guard: '値嵩除外 Top3',
    market_momentum_top1: 'SOX×MU/NVDA Top1',
    market_momentum_top3: 'SOX×MU/NVDA Top3',
    market_momentum_guard_top1: 'SOX×MU/NVDA+過熱除外 Top1',
  };
  return map[variant] || variant;
};

function DecisionBadge({ decision }: { decision: Decision }) {
  const map = {
    BUY_CANDIDATE: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    WATCH: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    AVOID: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  };
  const label = {
    BUY_CANDIDATE: '買い候補',
    WATCH: '条件監視',
    AVOID: '見送り',
  };
  return <span className={`inline-block rounded border px-2 py-0.5 text-xs whitespace-nowrap ${map[decision]}`}>{label[decision]}</span>;
}

function EntryStatusBadge({ status }: { status?: string }) {
  const label = status === 'READY' ? '候補' : status === 'AVOID' ? '回避' : '待ち';
  const cls = status === 'READY'
    ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
    : status === 'AVOID'
      ? 'border-rose-400/40 bg-rose-400/10 text-rose-200'
      : 'border-amber-400/40 bg-amber-400/10 text-amber-200';
  return <span className={`rounded border px-2 py-0.5 text-xs ${cls}`}>{label}</span>;
}

function StatCard({ label, value, sub, tone = 'default' }: { label: string; value: string | number; sub?: string; tone?: 'default' | 'good' | 'warn' | 'bad' }) {
  const toneCls = tone === 'good' ? 'text-emerald-300' : tone === 'warn' ? 'text-amber-300' : tone === 'bad' ? 'text-rose-300' : 'text-foreground';
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums text-right ${toneCls}`}>{value}</div>
      {sub && <div className="mt-1 text-right text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

const mondayRegimeRows = [
  { signal: '金↑ / CME弱い / 円高 / NASDAQ先物弱い', regime: 'リスクオフ', shortAction: '保有して様子見', longAction: 'なし', note: 'ショート含み損改善を待つ' },
  { signal: '金↑ / CME強い / 円安 / NASDAQ先物強い', regime: '混在', shortAction: '寄りで切らない', longAction: '原則なし', note: '株は強いが安全資産買いが残る' },
  { signal: '金↓ / CME強い / 円安 / NASDAQ先物強い', regime: 'リスクオン', shortAction: '全損切り候補', longAction: '半導体/AI周辺を小さく', note: '踏み上げ警戒。Top1-Top3だけ' },
  { signal: '金↓ / CME弱い / 円高', regime: '不明/弱い', shortAction: '様子見', longAction: 'なし', note: 'ノートレでよい' },
  { signal: '原油急騰 / 金↑ / CME弱い', regime: '地政学悪化', shortAction: '保有または改善待ち', longAction: 'なし', note: '防衛/資源以外は触らない' },
  { signal: '原油急落 / 金↓ / CME強い', regime: '和平リスクオン', shortAction: '切る寄り', longAction: '半導体/AI周辺候補', note: 'ただし寄り買いしない' },
  { signal: '原油急落 / 金↑ / CME強い', regime: '和平期待+保険買い', shortAction: '寄り後確認', longAction: '30分待ち', note: '足元の混在形。決め打ちしない' },
];

const intradayChecks = [
  ['半導体主力', 'TEL / アドバンテスト / ディスコ / レーザーテック / SCREEN の過半がプラス'],
  ['周辺テーマ', 'フジクラ / 古河電工 / イビデン / 村田 / 信越 / ルネサスの過半がプラス'],
  ['指数', '日経・TOPIXが寄り後に失速していない'],
  ['為替', '急な円高でない'],
  ['金・原油', '金がさらに上、原油急騰なら警戒'],
  ['候補銘柄', 'VWAP上、寄付差過大でない、前日高値を意識'],
];

const semiconUniverseGroups = [
  {
    segment: '半導体主力',
    role: '指標銘柄',
    tickers: 'TEL / アドバンテスト / ディスコ / レーザーテック / SCREEN / キオクシア',
    use: 'テーマ全体の温度計。強さは見るが、寄り高・値嵩で実弾は慎重。',
  },
  {
    segment: 'AIインフラ',
    role: '実弾候補',
    tickers: 'フジクラ / 古河電工 / 村田製作所 / イビデン / KOKUSAI / ルネサス',
    use: '資金流入の本命候補。半導体主力より出遅れなら優先。',
  },
  {
    segment: '電力',
    role: '実弾候補',
    tickers: '日立 / 三菱電機 / 富士電機 / 住友電工 / SWCC',
    use: 'データセンター・電力増強の波及。地合い悪化時でも相対的に残るかを見る。',
  },
  {
    segment: '光通信',
    role: '実弾候補',
    tickers: 'フジクラ / 古河電工 / 住友電工 / SWCC',
    use: 'AIサーバー接続・データセンター投資の波及。急騰後は寄り天に注意。',
  },
  {
    segment: '冷却/空調',
    role: '監視候補',
    tickers: 'ダイキン / 大気社',
    use: 'AIデータセンターの熱対策。株価反応が遅れている時だけ候補化。',
  },
  {
    segment: '材料/基板',
    role: '実弾候補',
    tickers: 'イビデン / 東京応化 / レゾナック / SUMCO / 信越化学',
    use: 'パッケージ基板・レジスト・ウエハ。半導体主力より資金の二段目を狙う。',
  },
  {
    segment: 'DC建設/不動産',
    role: '周辺監視',
    tickers: '大林組 / 大和ハウス / 三井不動産 / 三菱地所 / 日揮HD',
    use: 'テーマの末端波及。短期売買では主役ではなく、出遅れ確認用。',
  },
];

const entryPlan = (row: SemiconSignal) => {
  const gapLimit = row.trade_bucket === '実弾候補' ? '原則 +0〜+2.5%' : '原則待ち';
  const openAction = row.trade_bucket === '実弾候補'
    ? '寄り買いしない。寄り後30分でVWAP上を確認'
    : row.trade_bucket === '過熱注意'
      ? '寄り高なら見送り。押し目か前日高値再突破だけ確認'
      : '温度計として見る';
  const trigger = row.entry_trigger_price ? `${fmt(row.entry_trigger_price, 0)}超え` : '前日高値/VWAP上維持';
  const invalidation = row.trade_bucket === '実弾候補'
    ? 'VWAP割れ、指数失速、金上昇継続'
    : row.trade_bucket === '過熱注意'
      ? '寄り天、25日線乖離拡大、左尾悪化'
      : '主力全体が弱い';
  return { gapLimit, openAction, trigger, invalidation };
};

const avoidCheckGroups = [
  {
    title: '地合いNG',
    tone: 'bad',
    checks: ['金上昇継続', '原油急騰', 'CME/SGX失速', 'USDJPY急円高', 'NASDAQ/SOX先物弱い'],
    action: '1つでも強ければ新規ロングを止める',
  },
  {
    title: 'テーマ内NG',
    tone: 'warn',
    checks: ['半導体主力の過半がマイナス', 'AIインフラ周辺の過半がマイナス', '対象セグメントが5日/20日で弱い', 'リーダー銘柄が寄り後失速'],
    action: 'セグメント資金流入が弱ければ候補から外す',
  },
  {
    title: '個別NG',
    tone: 'warn',
    checks: ['寄付差が大きすぎる', 'VWAP割れ', '前日高値超え失敗', '25日線乖離が大きすぎる', '左尾高', '決算/材料直後でボラ過大'],
    action: '2つ以上該当なら見送り',
  },
  {
    title: '行動ルール',
    tone: 'good',
    checks: ['混在ならノートレ', '地合いNGなら全体見送り', '個別NGが1つならロットを落とす', '実弾候補でも寄り買いしない'],
    action: '勝つより変な負け方を避ける',
  },
];

export default function SemiconPage() {
  const [data, setData] = useState<SemiconResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Decision | 'ALL'>('ALL');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/dev/semicon/signals`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.detail || `API error ${res.status}`);
      }
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'semicon API の取得に失敗しました');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const rows = useMemo(() => {
    const base = data?.signals || [];
    return filter === 'ALL' ? base : base.filter((r) => r.decision === filter);
  }, [data, filter]);

  const priorityRows = useMemo(() => {
    return (data?.signals || []).filter((r) => r.decision !== 'AVOID').slice(0, 6);
  }, [data]);

  const bucketRows = useMemo(() => {
    return (data?.signals || []).filter((r) => r.trade_bucket && r.trade_bucket !== '見送り');
  }, [data]);

  const entryRows = useMemo(() => {
    return (data?.signals || [])
      .filter((r) => ['実弾候補', '過熱注意'].includes(r.trade_bucket || ''))
      .sort((a, b) => (b.entry_priority || 0) - (a.entry_priority || 0))
      .slice(0, 10);
  }, [data]);

  const marketTone = data?.market.state === 'RISK_ON' ? 'good' : data?.market.state === 'RISK_OFF' ? 'bad' : 'warn';
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1500px] px-3 py-4 md:px-5">
        <header className="mb-4 flex flex-wrap items-center gap-3 border-b border-border/50 pb-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">AI/半導体 順張り v1</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              無条件買いではなく、米地合い・発火価格・VWAP・左尾で当日朝に候補化する半裁量画面
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={fetchData} disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/30 disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              更新
            </button>
            <DevNavLinks />
          </div>
        </header>

        {error && (
          <section className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            Semicon API error: {error}
          </section>
        )}

        <section className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard label="米国地合い" value={data?.market.label || '-'} sub={data?.data_date ? `data ${data.data_date}` : undefined} tone={marketTone} />
          <StatCard label="買い候補" value={data?.counts.buy ?? 0} tone="good" />
          <StatCard label="条件監視" value={data?.counts.watch ?? 0} tone="warn" />
          <StatCard label="見送り" value={data?.counts.avoid ?? 0} tone="bad" />
          <StatCard label="対象" value={data?.counts.total ?? 0} sub="AI/半導体+周辺" />
        </section>

        <details className="mb-4 rounded-lg border border-border/60 bg-card/60 px-4 py-3 text-sm">
          <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground hover:text-foreground">
            開発情報
          </summary>
          <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2 lg:grid-cols-4">
            <div><span className="text-foreground">source_data_mode:</span> {data?.source_data_mode || '-'}</div>
            <div><span className="text-foreground">environment:</span> {data?.source_environment || '-'}</div>
            <div><span className="text-foreground">reason:</span> {data?.source_data_mode_reason || '-'}</div>
            <div><span className="text-foreground">source:</span> {data?.source || '-'}</div>
            <div><span className="text-foreground">generated_at:</span> {data?.generated_at || '-'}</div>
            <div><span className="text-foreground">data_date:</span> {data?.data_date || '-'}</div>
            <div><span className="text-foreground">error:</span> {error || data?.source_data_mode_error || '-'}</div>
          </div>
        </details>

        <section className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-4xl">
              <div className="text-xs text-amber-200/80">今日の実務結論</div>
              <h2 className="mt-1 text-lg font-semibold text-amber-100">{data?.operation?.headline || '無条件買いなし。条件付き監視'}</h2>
              <p className="mt-2 text-sm leading-6 text-amber-100/85">
                {data?.operation?.primary_action || '寄り後条件を満たす銘柄だけ小さく候補化'}。この画面の `条件監視` は買い指示ではなく、朝の確認を通過した場合だけエントリー検討するリストです。
              </p>
            </div>
            {data?.report_available && data.report_url && (
              <a href={`${API_BASE}${data.report_url}`} target="_blank" rel="noreferrer"
                className="rounded-lg border border-amber-300/40 px-3 py-1.5 text-xs text-amber-100 hover:bg-amber-300/10">
                詳細HTMLを開く
              </a>
            )}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-border/60 bg-background/50 p-3">
              <h3 className="text-sm font-semibold">朝の確認</h3>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {(data?.operation?.morning_checks || []).map((item) => <li key={item}>・{item}</li>)}
              </ul>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/50 p-3">
              <h3 className="text-sm font-semibold">見送り条件</h3>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {(data?.operation?.avoid_rules || []).map((item) => <li key={item}>・{item}</li>)}
              </ul>
            </div>
          </div>
          {data?.data_stale && (
            <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              シグナル計算データが {data.stale_days} 日前です。実運用では詳細HTMLと最新生成後のデータで確認してください。
            </div>
          )}
        </section>

        <section className="mb-4 rounded-lg border border-sky-500/30 bg-sky-500/10 p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs text-sky-200/80">月曜朝レジーム判定</div>
              <h2 className="mt-1 text-lg font-semibold text-sky-100">混在ならノートレを正解にする</h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-sky-100/85">
                米祝日・地政学ヘッドライン・サンデー気配が混ざる日は、当てに行くより分岐を固定する。リスクオン確定まで既存ショートも新規ロングも決め打ちしない。
              </p>
            </div>
            <div className="rounded-lg border border-sky-300/30 bg-background/40 px-3 py-2 text-xs text-sky-100">
              行動: リスクオフ=ロングなし / リスクオン=ショート処理+小ロング / 混在=待つ
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border/60 bg-background/50">
            <table className="w-full min-w-[1120px] text-sm">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground">
                  <th className="px-3 py-2 text-left">観測</th>
                  <th className="px-3 py-2 text-left">判定</th>
                  <th className="px-3 py-2 text-left">既存ショート</th>
                  <th className="px-3 py-2 text-left">新規ロング</th>
                  <th className="px-3 py-2 text-left">コメント</th>
                </tr>
              </thead>
              <tbody>
                {mondayRegimeRows.map((row) => (
                  <tr key={row.signal} className="border-b border-border/20">
                    <td className="px-3 py-2 text-muted-foreground">{row.signal}</td>
                    <td className="px-3 py-2 font-semibold text-foreground">{row.regime}</td>
                    <td className="px-3 py-2 text-amber-200">{row.shortAction}</td>
                    <td className="px-3 py-2 text-emerald-200">{row.longAction}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {intradayChecks.map(([label, check]) => (
              <div key={label} className="rounded-lg border border-border/60 bg-background/45 p-3">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="mt-1 text-sm leading-5 text-foreground">{check}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-4 rounded-lg border border-border bg-card p-4">
          <div className="mb-3">
            <h2 className="text-sm font-semibold">ユニバース整理</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              半導体主力を温度計、AIインフラ/電力/光/材料を実弾候補として分ける。主力が高すぎる日は、周辺の出遅れと寄り後の資金流入を優先する。
            </p>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full min-w-[1080px] text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20 text-muted-foreground">
                  <th className="px-3 py-2 text-left">セグメント</th>
                  <th className="px-3 py-2 text-left">扱い</th>
                  <th className="px-3 py-2 text-left">見る銘柄</th>
                  <th className="px-3 py-2 text-left">使い方</th>
                </tr>
              </thead>
              <tbody>
                {semiconUniverseGroups.map((row) => (
                  <tr key={row.segment} className="border-b border-border/20">
                    <td className="px-3 py-2 font-semibold">{row.segment}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded border px-2 py-0.5 text-xs ${
                        row.role === '指標銘柄'
                          ? 'border-sky-400/40 bg-sky-400/10 text-sky-200'
                          : row.role === '実弾候補'
                            ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
                            : 'border-amber-400/40 bg-amber-400/10 text-amber-200'
                      }`}>
                        {row.role}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{row.tickers}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-4 rounded-lg border border-border bg-card p-4">
          <div className="mb-3">
            <h2 className="text-sm font-semibold">実弾候補フィルタ</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              主力・値嵩は温度計、短期過熱・左尾高は注意、寄り後条件付きで現実的に入れるものだけを実弾候補に寄せる。
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            {(data?.bucket_summary || []).map((bucket) => (
              <div key={bucket.bucket} className="rounded-lg border border-border/60 bg-background/45 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground">{bucket.bucket}</div>
                  <div className="text-lg font-semibold tabular-nums">{bucket.count}</div>
                </div>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {bucket.leaders.map((leader) => (
                    <div key={`${bucket.bucket}-${leader.code}`}>{leader.name || '-'} <span className="tabular-nums">({leader.code || '-'})</span></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full min-w-[1080px] text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20 text-muted-foreground">
                  <th className="px-3 py-2 text-left">区分</th>
                  <th className="px-3 py-2 text-left">状態</th>
                  <th className="px-3 py-2 text-left">銘柄</th>
                  <th className="px-3 py-2 text-left">分類</th>
                  <th className="px-3 py-2 text-right">優先度</th>
                  <th className="px-3 py-2 text-right">点</th>
                  <th className="px-3 py-2 text-right">終値</th>
                  <th className="px-3 py-2 text-right">5日</th>
                  <th className="px-3 py-2 text-right">25日線比</th>
                  <th className="px-3 py-2 text-right">CVaR5</th>
                  <th className="px-3 py-2 text-left">理由</th>
                  <th className="px-3 py-2 text-left">判定理由</th>
                </tr>
              </thead>
              <tbody>
                {bucketRows.map((row) => (
                  <tr key={`bucket-${row.code}`} className="border-b border-border/20">
                    <td className="px-3 py-2">
                      <span className={`rounded border px-2 py-0.5 text-xs ${
                        row.trade_bucket === '実弾候補'
                          ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
                          : row.trade_bucket === '指標銘柄'
                            ? 'border-sky-400/40 bg-sky-400/10 text-sky-200'
                            : 'border-amber-400/40 bg-amber-400/10 text-amber-200'
                      }`}>
                        {row.trade_bucket}
                      </span>
                    </td>
                    <td className="px-3 py-2"><EntryStatusBadge status={row.entry_status} /></td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-muted-foreground">{row.ticker}</div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{row.segment}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmt(row.entry_priority, 1)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmt(row.score, 1)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(row.close, 1)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${clsPct(row.ret5)}`}>{pct(row.ret5)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${clsPct(row.vs25)}`}>{pct(row.vs25)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${clsPct(row.cvar05)}`}>{pct(row.cvar05)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{(row.trade_bucket_reasons || []).join(' / ') || '-'}</td>
                    <td className="px-3 py-2 text-muted-foreground">{(row.entry_reasons || []).join(' / ') || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-4 rounded-lg border border-border bg-card p-4">
          <div className="mb-3">
            <h2 className="text-sm font-semibold">エントリー条件</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              ここは発注指示ではなく、寄付前と寄り後30分で確認する条件表。寄り買いではなく、VWAP上維持と前日高値を見てから候補化する。
            </p>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full min-w-[1280px] text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20 text-muted-foreground">
                  <th className="px-3 py-2 text-left">銘柄</th>
                  <th className="px-3 py-2 text-left">状態</th>
                  <th className="px-3 py-2 text-left">区分</th>
                  <th className="px-3 py-2 text-right">優先度</th>
                  <th className="px-3 py-2 text-right">終値</th>
                  <th className="px-3 py-2 text-right">発火価格</th>
                  <th className="px-3 py-2 text-left">寄付差</th>
                  <th className="px-3 py-2 text-left">寄り後</th>
                  <th className="px-3 py-2 text-left">入る条件</th>
                  <th className="px-3 py-2 text-left">無効条件</th>
                </tr>
              </thead>
              <tbody>
                {entryRows.map((row) => {
                  const plan = entryPlan(row);
                  return (
                    <tr key={`entry-${row.code}`} className="border-b border-border/20">
                      <td className="px-3 py-2">
                        <div className="font-medium">{row.name}</div>
                        <div className="text-xs text-muted-foreground">{row.ticker} / {row.segment}</div>
                      </td>
                      <td className="px-3 py-2"><EntryStatusBadge status={row.entry_status} /></td>
                      <td className="px-3 py-2">
                        <span className={`rounded border px-2 py-0.5 text-xs ${
                          row.trade_bucket === '実弾候補'
                            ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
                            : 'border-amber-400/40 bg-amber-400/10 text-amber-200'
                        }`}>
                          {row.trade_bucket}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmt(row.entry_priority, 1)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(row.close, 1)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmt(row.entry_trigger_price, 0)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{plan.gapLimit}</td>
                      <td className="px-3 py-2 text-muted-foreground">{plan.openAction}</td>
                      <td className="px-3 py-2 text-muted-foreground">{plan.trigger}</td>
                      <td className="px-3 py-2 text-muted-foreground">{plan.invalidation}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-4 rounded-lg border border-rose-500/25 bg-rose-500/10 p-4">
          <div className="mb-3">
            <div className="text-xs text-rose-200/80">見送り条件</div>
            <h2 className="mt-1 text-lg font-semibold text-rose-100">高値掴みと落ちるナイフを避ける</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-rose-100/85">
              AI/半導体周辺は強いテーマだが、寄り天・過熱・地政学で一撃の左尾が出る。条件が崩れた日は、候補があってもノートレを正解にする。
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {avoidCheckGroups.map((group) => (
              <div key={group.title} className="rounded-lg border border-border/60 bg-background/50 p-3">
                <div className={`text-sm font-semibold ${
                  group.tone === 'bad' ? 'text-rose-300' : group.tone === 'warn' ? 'text-amber-300' : 'text-emerald-300'
                }`}>
                  {group.title}
                </div>
                <ul className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">
                  {group.checks.map((check) => <li key={check}>・{check}</li>)}
                </ul>
                <div className="mt-3 rounded border border-border/50 bg-muted/20 px-2 py-1.5 text-xs text-foreground">
                  {group.action}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-4 rounded-lg border border-border bg-card p-4">
          <div className="mb-3">
            <h2 className="text-sm font-semibold">セグメント強弱</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              直近5日と20日の平均騰落、上昇銘柄比率、セグメント内リーダーを見る。強いセグメントから実弾候補を選び、弱いセグメントは見送る。
            </p>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20 text-muted-foreground">
                  <th className="px-3 py-2 text-left">セグメント</th>
                  <th className="px-3 py-2 text-right">銘柄数</th>
                  <th className="px-3 py-2 text-right">5日平均</th>
                  <th className="px-3 py-2 text-right">20日平均</th>
                  <th className="px-3 py-2 text-right">25日線比</th>
                  <th className="px-3 py-2 text-right">5日上昇比率</th>
                  <th className="px-3 py-2 text-right">監視数</th>
                  <th className="px-3 py-2 text-left">リーダー</th>
                </tr>
              </thead>
              <tbody>
                {(data?.segment_strength || []).map((row) => (
                  <tr key={row.segment} className="border-b border-border/20">
                    <td className="px-3 py-2 font-semibold">{row.segment}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.count}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${clsPct(row.avg_ret5)}`}>{pct(row.avg_ret5)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${clsPct(row.avg_ret20)}`}>{pct(row.avg_ret20)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${clsPct(row.avg_vs25)}`}>{pct(row.avg_vs25)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${clsPct((row.breadth5 || 0) - 50)}`}>{fmt(row.breadth5, 0)}%</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.watch_count}</td>
                    <td className="px-3 py-2">
                      <span className="font-medium">{row.leader_name || '-'}</span>
                      {row.leader_code && <span className="ml-2 text-xs text-muted-foreground">{row.leader_code}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-4 rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">検証: 市場モメンタム順張り</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                条件: SOX 5日上昇、かつ MU または NVIDIA が5日上昇。翌営業日寄付エントリー、大引け決済、100株換算。
              </p>
            </div>
            {data?.backtest?.report_url && (
              <a href={`${API_BASE}${data.backtest.report_url}`} target="_blank" rel="noreferrer"
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/30">
                検証HTMLを開く
              </a>
            )}
          </div>
          <div className="mb-3 rounded-md border border-border/60 bg-background/50 px-3 py-2 text-sm text-muted-foreground">
            {data?.backtest?.takeaway || '検証結果なし'}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground">
                  <th className="px-2 py-2 text-left">モデル</th>
                  <th className="px-2 py-2 text-right">件数</th>
                  <th className="px-2 py-2 text-right">PF</th>
                  <th className="px-2 py-2 text-right">勝率</th>
                  <th className="px-2 py-2 text-right">損益</th>
                  <th className="px-2 py-2 text-right">DD</th>
                  <th className="px-2 py-2 text-right">最大損失</th>
                  <th className="px-2 py-2 text-right">左尾CVaR5</th>
                </tr>
              </thead>
              <tbody>
                {(data?.backtest?.rows || []).map((r) => (
                  <tr key={r.variant} className="border-b border-border/20">
                    <td className="px-2 py-2">
                      <div className="font-medium">{variantLabel(r.variant)}</div>
                      <div className="text-xs text-muted-foreground">{r.from} - {r.to}</div>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{r.n.toLocaleString('ja-JP')}</td>
                    <td className={`px-2 py-2 text-right tabular-nums font-semibold ${r.pf != null && r.pf >= 1.2 ? 'text-emerald-300' : r.pf != null && r.pf < 1 ? 'text-rose-300' : 'text-amber-300'}`}>{fmt(r.pf, 2)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{fmt(r.win_rate, 1)}%</td>
                    <td className={`px-2 py-2 text-right tabular-nums ${clsPct(r.sum_pnl_100)}`}>{yen(r.sum_pnl_100)}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-rose-300">{yen(r.max_dd_100)}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-rose-300">{yen(r.worst_trade_100)}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-rose-300">{yen(r.cvar05_100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-4 rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">優先監視</h2>
              <p className="mt-1 text-xs text-muted-foreground">発火価格、VWAP、米地合いを通過した銘柄だけ小さく候補化します。</p>
            </div>
            <div className="text-xs text-muted-foreground">source: {data?.source || '-'}</div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {priorityRows.map((r) => (
              <div key={r.code} className="rounded-lg border border-border bg-background/40 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{r.name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{r.ticker} / {r.segment}</div>
                  </div>
                  <DecisionBadge decision={r.decision} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">発火価格</div>
                    <div className="mt-1 text-right text-base font-semibold tabular-nums">{fmt(r.entry_trigger_price, 0)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">終値</div>
                    <div className="mt-1 text-right text-base font-semibold tabular-nums">{fmt(r.close, 1)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">左尾</div>
                    <div className={`mt-1 text-right text-base font-semibold ${r.left_tail === '高' ? 'text-amber-300' : 'text-muted-foreground'}`}>{r.left_tail || '-'}</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div><div className="text-muted-foreground">5日</div><div className={`text-right tabular-nums ${clsPct(r.ret5)}`}>{pct(r.ret5)}</div></div>
                  <div><div className="text-muted-foreground">25日線比</div><div className={`text-right tabular-nums ${clsPct(r.vs25)}`}>{pct(r.vs25)}</div></div>
                  <div><div className="text-muted-foreground">CVaR5</div><div className={`text-right tabular-nums ${clsPct(r.cvar05)}`}>{pct(r.cvar05)}</div></div>
                </div>
                <div className="mt-3 text-xs leading-5 text-muted-foreground">{r.entry_rule}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-4 rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">米市場</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground">
                  <th className="px-2 py-2 text-left">指標</th>
                  <th className="px-2 py-2 text-right">終値</th>
                  <th className="px-2 py-2 text-right">1日</th>
                  <th className="px-2 py-2 text-right">5日</th>
                  <th className="px-2 py-2 text-right">20日</th>
                </tr>
              </thead>
              <tbody>
                {(data?.overseas || []).map((r) => (
                  <tr key={r.ticker} className="border-b border-border/20">
                    <td className="px-2 py-2"><span className="font-medium">{r.name}</span><span className="ml-2 text-xs text-muted-foreground">{r.ticker}</span></td>
                    <td className="px-2 py-2 text-right tabular-nums">{fmt(r.close, 2)}</td>
                    <td className={`px-2 py-2 text-right tabular-nums ${clsPct(r.ret1)}`}>{pct(r.ret1)}</td>
                    <td className={`px-2 py-2 text-right tabular-nums ${clsPct(r.ret5)}`}>{pct(r.ret5)}</td>
                    <td className={`px-2 py-2 text-right tabular-nums ${clsPct(r.ret20)}`}>{pct(r.ret20)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-4 py-3">
            <h2 className="text-sm font-semibold">候補銘柄</h2>
            <div className="flex gap-1">
              {(['ALL', 'BUY_CANDIDATE', 'WATCH', 'AVOID'] as const).map((key) => (
                <button key={key} type="button" onClick={() => setFilter(key)}
                  className={`rounded-md px-2.5 py-1 text-xs ${filter === key ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/30'}`}>
                  {key === 'ALL' ? '全て' : key === 'BUY_CANDIDATE' ? '買い候補' : key === 'WATCH' ? '監視' : '見送り'}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px] text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20 text-muted-foreground">
                  <th className="px-3 py-2 text-left">銘柄</th>
                  <th className="px-3 py-2 text-center">判定</th>
                  <th className="px-3 py-2 text-right">点</th>
                  <th className="px-3 py-2 text-right">発火価格</th>
                  <th className="px-3 py-2 text-right">終値</th>
                  <th className="px-3 py-2 text-right">5日</th>
                  <th className="px-3 py-2 text-right">20日</th>
                  <th className="px-3 py-2 text-right">25日線比</th>
                  <th className="px-3 py-2 text-right">20日高値比</th>
                  <th className="px-3 py-2 text-right">CVaR5</th>
                  <th className="px-3 py-2 text-right">60日DD</th>
                  <th className="px-3 py-2 text-left">理由/警告</th>
                  <th className="px-3 py-2 text-left">翌朝条件</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={13} className="px-4 py-8 text-center text-muted-foreground">読み込み中...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={13} className="px-4 py-8 text-center text-muted-foreground">該当なし</td></tr>
                ) : rows.map((r) => (
                  <tr key={r.code} className="border-b border-border/20 hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.ticker} / {r.segment} / {r.label}</div>
                    </td>
                    <td className="px-3 py-2 text-center"><DecisionBadge decision={r.decision} /></td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmt(r.score, 1)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmt(r.entry_trigger_price, 0)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(r.close, 1)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${clsPct(r.ret5)}`}>{pct(r.ret5)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${clsPct(r.ret20)}`}>{pct(r.ret20)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${clsPct(r.vs25)}`}>{pct(r.vs25)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${clsPct(r.dist20hi)}`}>{pct(r.dist20hi)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${clsPct(r.cvar05)}`}>{pct(r.cvar05)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${clsPct(r.max_dd_60d)}`}>{pct(r.max_dd_60d)}</td>
                    <td className="px-3 py-2">
                      <div className="max-w-[260px] whitespace-normal text-xs leading-5 text-emerald-300">{r.reasons.join(' / ') || '-'}</div>
                      {r.warnings.length > 0 && <div className="max-w-[260px] whitespace-normal text-xs leading-5 text-amber-300">{r.warnings.join(' / ')}</div>}
                    </td>
                    <td className="px-3 py-2"><div className="max-w-[300px] whitespace-normal text-xs leading-5 text-muted-foreground">{r.entry_rule}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
