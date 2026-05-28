'use client';

import { useEffect, useMemo, useState } from 'react';
import { DevNavLinks } from '@/components/dev';
import { RefreshCw } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

type Decision = 'BUY_CANDIDATE' | 'WATCH' | 'AVOID';
type CandidateFilter = 'ALL' | '実弾候補' | '指標銘柄' | '過熱注意' | '見送り';
type SemiconView = 'OPERATE' | 'FLOW' | 'DETAIL';

interface SemiconSignal {
  code: string;
  ticker: string;
  name: string;
  label: string;
  segment: string;
  core_segment?: string;
  sub_segment?: string;
  theme_layer?: string;
  flow_group?: string;
  theme_driver?: string;
  classification_basis?: string;
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

interface MorningPilotEvidence {
  label: string;
  variant: string;
  entry: string;
  exit: string;
  n: number;
  days: number;
  pf?: number;
  win_rate?: number;
  sum_pnl_100?: number;
  avg_pnl_100?: number;
  max_dd_100?: number;
  worst_trade_100?: number;
  cvar05_100?: number;
}

interface MorningPilot {
  available: boolean;
  label: string;
  entry_window: string;
  exit_window: string;
  max_positions: number;
  max_shares: number;
  rules: string[];
  entry_checks: string[];
  exit_rules: string[];
  evidence: MorningPilotEvidence[];
  takeaway?: string;
  source?: string;
  reason?: string;
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

interface FlowSegmentRow {
  segment: string;
  n: number;
  turnover_bil?: number;
  turnover_ex_top1_bil?: number;
  turnover_vs5?: number;
  turnover_vs20?: number;
  turnover_vs60?: number;
  avg_ret1?: number;
  up_ratio?: number;
  top_code?: string;
  top_name?: string;
  top_share?: number;
  hint?: string;
  action_hint?: string;
}

interface FlowIndividualRow {
  code: string;
  name: string;
  core_segment: string;
  sub_segment: string;
  theme_layer?: string;
  flow_group?: string;
  ret1?: number;
  turnover_bil?: number;
  turnover_vs5?: number;
  turnover_vs20?: number;
  turnover_vs60?: number;
  flow_fit?: string;
}

interface FlowAnalysis {
  available: boolean;
  date?: string;
  reason?: string;
  market?: {
    turnover_bil?: number;
    turnover_vs5?: number;
    turnover_vs20?: number;
    turnover_vs60?: number;
    n?: number;
  };
  universe?: {
    turnover_bil?: number;
    turnover_ex_top1_bil?: number;
    turnover_vs5?: number;
    turnover_vs20?: number;
    turnover_vs60?: number;
    market_share?: number;
    avg_ret1?: number;
    up_ratio?: number;
    n?: number;
    top_code?: string;
    top_name?: string;
    top_share?: number;
  };
  core_segments?: FlowSegmentRow[];
  sub_segments?: FlowSegmentRow[];
  theme_layers?: FlowSegmentRow[];
  flow_groups?: FlowSegmentRow[];
  individuals?: FlowIndividualRow[];
  notes?: string[];
}

interface BucketSummaryRow {
  bucket: string;
  count: number;
  leaders: Array<{ code?: string; name?: string; score?: number }>;
}

interface ClassificationBasisRow {
  layer: string;
  basis: string;
  use: string;
}

interface HoldShortExposure {
  code: string;
  ticker: string;
  name: string;
  segment: string;
  label: string;
  side: string;
  quantity?: number;
  current_price?: number;
  entry_value?: number;
  pnl?: number;
  pnl_pct?: number;
  risk_level?: string;
  note?: string;
}

interface RealtimeQuote {
  price: number | null;
  open: number | null;
  change?: number | null;
  changePercent?: number | null;
  marketState: string | null;
  marketTime: string | null;
}

interface MarketIndicator {
  ticker: string;
  name: string;
  role: string;
  risk_note: string;
  good_when: 'up' | 'down' | 'mixed';
  date?: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  ret1?: number;
  ret5?: number;
  ret20?: number;
  source?: string;
  missing?: boolean;
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
  classification_basis?: ClassificationBasisRow[];
  segment_strength?: SegmentStrengthRow[];
  flow_analysis?: FlowAnalysis;
  bucket_summary?: BucketSummaryRow[];
  hold_short_exposures?: HoldShortExposure[];
  market_indicators?: MarketIndicator[];
  market_indicator_date?: string;
  market_indicator_source?: string;
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
  morning_pilot?: MorningPilot;
}

const fmt = (v?: number, digits = 1) => v == null || Number.isNaN(v) ? '-' : v.toLocaleString('ja-JP', { maximumFractionDigits: digits, minimumFractionDigits: digits });
const pct = (v?: number) => v == null || Number.isNaN(v) ? '-' : `${v > 0 ? '+' : ''}${v.toFixed(2)}%`;
const mult = (v?: number) => v == null || Number.isNaN(v) ? '-' : `${v.toFixed(2)}x`;
const oku = (v?: number) => v == null || Number.isNaN(v) ? '-' : (v * 10).toLocaleString('ja-JP', { maximumFractionDigits: 0 });
const clsPct = (v?: number) => v == null ? 'text-muted-foreground' : v > 0 ? 'text-emerald-400' : v < 0 ? 'text-rose-400' : 'text-muted-foreground';
const yen = (v?: number) => v == null || Number.isNaN(v) ? '-' : `${v >= 0 ? '+' : ''}${Math.round(v).toLocaleString('ja-JP')}円`;
const yenAbs = (v?: number) => v == null || Number.isNaN(v) ? '-' : `${Math.round(v).toLocaleString('ja-JP')}円`;
const fmtPrice = (v?: number | null, digits = 2) => v == null || Number.isNaN(v) ? '-' : v.toLocaleString('ja-JP', { maximumFractionDigits: digits, minimumFractionDigits: digits });

const indicatorTone = (indicator: MarketIndicator, ret1?: number | null) => {
  if (ret1 == null || Number.isNaN(ret1)) return 'neutral';
  if (indicator.good_when === 'mixed') return Math.abs(ret1) >= 0.5 ? 'warn' : 'neutral';
  const aligned = indicator.good_when === 'up' ? ret1 > 0 : ret1 < 0;
  return aligned ? 'good' : 'bad';
};

const indicatorDecision = (indicator: MarketIndicator, ret1?: number | null) => {
  const tone = indicatorTone(indicator, ret1);
  if (tone === 'good') return '追い風';
  if (tone === 'bad') return '逆風';
  if (tone === 'warn') return '混在';
  return '未判定';
};

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
    BUY_CANDIDATE: '候補',
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
  return <span className={`inline-flex shrink-0 items-center rounded border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${cls}`}>{label}</span>;
}

function TradeBucketBadge({ bucket }: { bucket?: string }) {
  const cls = bucket === '実弾候補'
    ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
    : bucket === '指標銘柄'
      ? 'border-sky-400/40 bg-sky-400/10 text-sky-200'
      : bucket === '見送り'
        ? 'border-rose-400/40 bg-rose-400/10 text-rose-200'
        : 'border-amber-400/40 bg-amber-400/10 text-amber-200';
  return (
    <span className={`inline-flex shrink-0 items-center rounded border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${cls}`}>
      {bucket || '-'}
    </span>
  );
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
  ['候補銘柄', '寄付差過大でない、前日高値を意識。VWAPは証券画面で手動確認'],
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
    tickers: '日立 / 三菱電機 / 富士電機 / 住友電工',
    use: 'データセンター・電力増強の波及。地合い悪化時でも相対的に残るかを見る。',
  },
  {
    segment: '光通信',
    role: '実弾候補',
    tickers: 'フジクラ / 古河電工 / 住友電工',
    use: 'AIサーバー接続・データセンター投資の波及。急騰後は寄り天に注意。',
  },
  {
    segment: '冷却/空調',
    role: '監視候補',
    tickers: 'ダイキン',
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

const usImpactRows: Record<string, { target: string; read: string; domestic: string }> = {
  '^SOX': {
    target: '半導体コア全体',
    read: '半導体全体の温度計。上昇でも日本側が寄り天なら過熱優先。',
    domestic: 'TEL / アドバンテスト / ディスコ / SCREEN / KOKUSAI',
  },
  NVDA: {
    target: 'AIサーバー本流',
    read: 'GPU/AI投資の中心。装置・基板・光通信・電力に波及するかを見る。',
    domestic: 'イビデン / フジクラ / 古河電工 / 村田 / ルネサス',
  },
  AVGO: {
    target: 'ASIC/ネットワーク',
    read: 'AIカスタムASICとネットワーク投資。基板・光通信・受動部品への波及を見る。',
    domestic: 'イビデン / フジクラ / 古河電工 / 村田 / 東京応化',
  },
  MU: {
    target: 'メモリ/MLCC周辺',
    read: 'HBM/DRAM/NAND市況の温度計。キオクシア、材料、受動部品への波及を見る。',
    domestic: 'キオクシア / SUMCO / 信越 / 村田 / 太陽誘電系',
  },
  TSM: {
    target: 'ファウンドリ/前工程',
    read: '先端ロジック投資の温度計。前工程装置・材料の反応を見る。',
    domestic: 'TEL / SCREEN / KOKUSAI / 東京応化 / レゾナック',
  },
  '^IXIC': {
    target: 'グロース地合い',
    read: 'リスクオン/オフの土台。単独では買い根拠にしない。',
    domestic: '半導体グロース / 宇宙・防衛など隣接テーマ',
  },
  'NQ=F': {
    target: '寄付前グロース地合い',
    read: '朝の寄付前確認。強くても寄り後維持までは待つ。',
    domestic: '半導体/AIインフラ全体',
  },
  'NKD=F': {
    target: '日本寄付前地合い',
    read: '日本株全体の寄付方向。半導体だけ強いか全体高かを分ける。',
    domestic: '日経寄与度高い半導体/電機',
  },
  'JPY=X': {
    target: '為替/輸出採算',
    read: '円安は支え、急円高は逆風。原油高円安は質が悪いので警戒。',
    domestic: '輸出系半導体 / 電機 / 材料',
  },
};

const adjacentThemeRows = [
  {
    theme: '防衛/宇宙',
    source: '国策・防衛予算・宇宙基本計画',
    watch: '官公庁調達、受注、打上げ成功、通信/観測契約、防衛用途との接続',
    action: '原則監視。出来高と寄り後維持がなければ触らない',
  },
  {
    theme: 'サイバー/量子',
    source: '経済安全保障・重要技術育成',
    watch: '補助金、政府調達、実証採択、既存売上への接続',
    action: '材料だけでは見送り。売上化が見えるものだけ監視',
  },
  {
    theme: 'ロボット/FA',
    source: '人手不足・フィジカルAI・工場自動化',
    watch: '受注、設備投資、半導体/電子部品の需要接続',
    action: '半導体本流が一服した時の資金移動候補',
  },
  {
    theme: '核融合/次世代電力',
    source: 'エネルギー安全保障・電力制約',
    watch: '実証段階、設備メーカー、電源/素材への波及',
    action: '長期監視。短期売買は過熱と左尾を優先して避ける',
  },
];

const entryPlan = (row: SemiconSignal) => {
  const gapLimit = row.trade_bucket === '実弾候補' ? '原則 +0〜+2.5%' : '原則待ち';
  const openAction = row.trade_bucket === '実弾候補'
    ? '寄り買いしない。寄り後30分で維持を確認'
    : row.trade_bucket === '過熱注意'
      ? '寄り高なら見送り。押し目か前日高値再突破だけ確認'
      : '温度計として見る';
  const trigger = row.entry_trigger_price
    ? `${fmt(row.entry_trigger_price, 0)}超え`
    : row.entry_rule?.includes('終値')
      ? `終値${fmt(row.close, 0)}奪回`
      : '前日高値または寄り後維持';
  const invalidation = row.trade_bucket === '実弾候補'
    ? '寄り後失速、指数失速、金上昇継続'
    : row.trade_bucket === '過熱注意'
      ? '寄り天、25日線乖離拡大、左尾悪化'
      : '主力全体が弱い';
  return { gapLimit, openAction, trigger, invalidation };
};

const triggerPriceFor = (row: SemiconSignal) => {
  if (row.entry_trigger_price != null) return row.entry_trigger_price;
  if (row.entry_rule?.includes('終値') && row.close != null) return row.close;
  return undefined;
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
    checks: ['寄付差が大きすぎる', '寄り後失速', '前日高値超え失敗', '25日線乖離が大きすぎる', '左尾高', '決算/材料直後でボラ過大'],
    action: '2つ以上該当なら見送り',
  },
  {
    title: '行動ルール',
    tone: 'good',
    checks: ['混在ならノートレ', '地合いNGなら全体見送り', '個別NGが1つならロットを落とす', '実弾候補でも寄り買いしない'],
    action: '勝つより変な負け方を避ける',
  },
];

const viewTabs: Array<{ key: SemiconView; label: string; note: string }> = [
  { key: 'OPERATE', label: '運用', note: '朝の判断と実弾候補' },
  { key: 'FLOW', label: '資金フロー', note: 'どこに資金が来ているか' },
  { key: 'DETAIL', label: '詳細', note: '分類・検証・全銘柄' },
];

export default function SemiconPage() {
  const [data, setData] = useState<SemiconResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<CandidateFilter>('ALL');
  const [view, setView] = useState<SemiconView>('OPERATE');
  const [realtimeData, setRealtimeData] = useState<Record<string, RealtimeQuote>>({});
  const [realtimeLoading, setRealtimeLoading] = useState(false);
  const [realtimeTimestamp, setRealtimeTimestamp] = useState<string | null>(null);

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

  const fetchRealtime = async () => {
    const tickers = Array.from(new Set((data?.signals || []).map((s) => s.ticker).filter(Boolean)));
    if (tickers.length === 0) return;
    setRealtimeLoading(true);
    try {
      const res = await fetch(`/api/realtime?tickers=${encodeURIComponent(tickers.join(','))}&force=true`);
      if (!res.ok) throw new Error(`realtime API ${res.status}`);
      const json = await res.json();
      const map: Record<string, RealtimeQuote> = {};
      for (const q of json.data || []) {
        map[q.ticker] = {
          price: q.price ?? null,
          open: q.open ?? null,
          change: q.change ?? null,
          changePercent: q.changePercent ?? null,
          marketState: q.marketState ?? null,
          marketTime: q.marketTime ?? null,
        };
      }
      setRealtimeData(map);
      setRealtimeTimestamp(json.timestamp ? new Date(json.timestamp).toLocaleTimeString('ja-JP') : null);
    } catch (e) {
      console.error('semicon realtime fetch failed', e);
    } finally {
      setRealtimeLoading(false);
    }
  };

  const rows = useMemo(() => {
    const base = data?.signals || [];
    return filter === 'ALL' ? base : base.filter((r) => r.trade_bucket === filter);
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

  const holdShorts = data?.hold_short_exposures || [];
  const highRiskShorts = holdShorts.filter((r) => r.risk_level === '高' || r.risk_level === '中');
  const readyRows = entryRows.filter((r) => r.entry_status === 'READY');
  const morningPilot = data?.morning_pilot;
  const hotThemeRows = (data?.segment_strength || []).slice(0, 3);
  const flow = data?.flow_analysis;
  const flowThemeRows = (flow?.theme_layers || flow?.core_segments || []).slice(0, 6);
  const flowGroupRows = (flow?.flow_groups || flow?.sub_segments || []).slice(0, 10);
  const flowIndividualRows = (flow?.individuals || []).slice(0, 10);
  const flowScoreByGroup = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of flow?.flow_groups || flow?.sub_segments || []) {
      const ret = row.avg_ret1 ?? 0;
      const breadth = row.up_ratio ?? 0;
      const vs20 = row.turnover_vs20 ?? 0;
      const vs60 = row.turnover_vs60 ?? 0;
      const topSharePenalty = (row.top_share ?? 0) >= 70 ? 2 : 0;
      const score = ret * 2 + breadth / 20 + vs20 * 4 + vs60 - topSharePenalty;
      map.set(row.segment, score);
    }
    return map;
  }, [flow]);
  const primaryFlow = useMemo(() => {
    const rows = flow?.flow_groups || flow?.sub_segments || [];
    return [...rows]
      .filter((row) => (row.avg_ret1 ?? 0) > 0 && (row.up_ratio ?? 0) >= 50 && (row.turnover_vs20 ?? 0) >= 1.2)
      .sort((a, b) => (flowScoreByGroup.get(b.segment) ?? 0) - (flowScoreByGroup.get(a.segment) ?? 0))[0];
  }, [flow, flowScoreByGroup]);
  const morningPilotRows = useMemo(() => {
    const primarySegment = primaryFlow?.segment;
    const rows = primarySegment
      ? entryRows.filter((r) => (r.flow_group || r.sub_segment || '') === primarySegment)
      : entryRows.filter((r) => r.trade_bucket === '実弾候補' && r.entry_status === 'READY');
    return rows
      .sort((a, b) => {
        const flowA = flowScoreByGroup.get(a.flow_group || a.sub_segment || '') ?? -999;
        const flowB = flowScoreByGroup.get(b.flow_group || b.sub_segment || '') ?? -999;
        if (flowA !== flowB) return flowB - flowA;
        if ((a.entry_status === 'READY') !== (b.entry_status === 'READY')) return a.entry_status === 'READY' ? -1 : 1;
        return (b.entry_priority || 0) - (a.entry_priority || 0);
      })
      .slice(0, 6);
  }, [entryRows, flowScoreByGroup, primaryFlow]);
  const actionableHeadline = highRiskShorts.length > 0
    ? '既存ショートの踏み上げ警戒を最優先'
    : readyRows.length > 0
      ? '寄り後条件通過なら小さく順張り'
      : '無理に入らず監視';

  const realtimeFor = (ticker: string) => realtimeData[ticker];
  const isRealtimeFreshForZaraba = (rt?: RealtimeQuote) => {
    if (!rt?.marketTime) return true;
    const now = new Date();
    const jst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const jstTime = jst.getHours() * 60 + jst.getMinutes();
    const jstDay = jst.getDay();
    const isWeekday = jstDay >= 1 && jstDay <= 5;
    const isZaraba = isWeekday && jstTime >= 540 && jstTime <= 930;
    if (!isZaraba) return true;
    const mt = new Date(rt.marketTime);
    const mtJst = new Date(mt.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    return mtJst.toDateString() === jst.toDateString();
  };
  const priceDiffFromClose = (row: SemiconSignal) => {
    const rt = realtimeFor(row.ticker);
    if (!isRealtimeFreshForZaraba(rt)) return null;
    if (rt?.price == null || row.close == null) return null;
    return rt.price - row.close;
  };
  const priceDiffFromOpen = (row: SemiconSignal) => {
    const rt = realtimeFor(row.ticker);
    if (!isRealtimeFreshForZaraba(rt)) return null;
    if (rt?.price == null || rt.open == null || rt.open <= 0) return null;
    return rt.price - rt.open;
  };

  const marketTone = data?.market.state === 'RISK_ON' ? 'good' : data?.market.state === 'RISK_OFF' ? 'bad' : 'warn';
  const marketIndicators = data?.market_indicators || [];
  const hasMarketIndicators = marketIndicators.length > 0;
  const riskOffCount = marketIndicators.filter((indicator) => indicatorTone(indicator, indicator.ret1) === 'bad').length;
  const riskOnCount = marketIndicators.filter((indicator) => indicatorTone(indicator, indicator.ret1) === 'good').length;
  const externalRegime = !hasMarketIndicators
    ? '未取得'
    : riskOffCount >= 3
      ? '逆風優勢'
      : riskOnCount >= 3
        ? '追い風優勢'
        : '混在';
  const classificationBasisRows = data?.classification_basis || [];
  const bucketCount = (bucket: string) => data?.bucket_summary?.find((row) => row.bucket === bucket)?.count ?? 0;
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1500px] px-3 py-4 md:px-5">
        <header className="mb-4 flex flex-wrap items-center gap-3 border-b border-border/50 pb-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">AIインフラ順張り</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              半導体コア、MLCC、光通信、電力、冷却を主戦場に、隣接国策テーマは監視棚として扱う半裁量画面
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
          <StatCard label="実弾候補" value={bucketCount('実弾候補')} sub="寄り後条件付き" tone="good" />
          <StatCard label="過熱注意" value={bucketCount('過熱注意')} sub="待ち/小ロット" tone="warn" />
          <StatCard label="指標銘柄" value={bucketCount('指標銘柄')} sub="温度計" />
          <StatCard label="見送り" value={bucketCount('見送り')} sub={`対象 ${data?.counts.total ?? 0}`} tone="bad" />
        </section>

        <section className="mb-4 rounded-lg border border-border bg-card p-2">
          <div className="grid gap-2 md:grid-cols-3">
            {viewTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setView(tab.key)}
                className={`rounded-md border px-3 py-2 text-left transition-colors ${
                  view === tab.key
                    ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100'
                    : 'border-border/50 bg-background/40 text-muted-foreground hover:bg-muted/30'
                }`}
              >
                <div className="text-sm font-semibold">{tab.label}</div>
                <div className="mt-0.5 text-xs">{tab.note}</div>
              </button>
            ))}
          </div>
        </section>

        <section className={`${view === 'OPERATE' ? '' : 'hidden '}mb-4 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-4`}>
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs text-emerald-200/80">実弾パイロット</div>
              <h2 className="mt-1 text-lg font-semibold text-emerald-100">午前だけ取る順張り</h2>
              <p className="mt-2 max-w-5xl text-sm leading-6 text-emerald-100/80">
                前日終値で候補を絞り、寄り直後は見送る。9:20-9:25に地合い・セグメント・個別が崩れていない時だけ100株まで候補化し、10時台で閉じる。
              </p>
            </div>
            <button type="button" onClick={fetchRealtime} disabled={realtimeLoading || !data}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-400/30 px-3 py-1.5 text-xs text-emerald-100 hover:bg-emerald-400/10 disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${realtimeLoading ? 'animate-spin' : ''}`} />
              寄付確認
              {realtimeTimestamp && <span className="text-emerald-100/60">{realtimeTimestamp}</span>}
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-border/60 bg-background/45 p-3">
              <div className="text-xs text-muted-foreground">見るだけ</div>
              <div className="mt-1 text-lg font-semibold">9:00-9:15</div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">寄り直後の飛びつきを避け、指数とセグメントの崩れを確認。</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/45 p-3">
              <div className="text-xs text-muted-foreground">候補化</div>
              <div className="mt-1 text-lg font-semibold">{morningPilot?.entry_window || '09:20-09:25'}</div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">VWAP上または回復、同一フロー層が崩れていない銘柄だけ。</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/45 p-3">
              <div className="text-xs text-muted-foreground">撤退</div>
              <div className="mt-1 text-lg font-semibold">{morningPilot?.exit_window || '10:15-10:45'}</div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">利益が出ても伸ばしすぎない。後場の再上昇期待で粘らない。</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/45 p-3">
              <div className="text-xs text-muted-foreground">上限</div>
              <div className="mt-1 text-lg font-semibold">{morningPilot?.max_positions ?? 1}銘柄 / {morningPilot?.max_shares ?? 100}株</div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">混在ならノートレ。10時以降は新規ロングを作らない。</div>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">今日の主役フロー:</span>{' '}
            {primaryFlow ? (
              <>
                <span className="text-emerald-300">{primaryFlow.segment}</span>
                <span className="ml-2">売買代金 {oku(primaryFlow.turnover_bil)}億円</span>
                <span className="ml-2">20日比 {mult(primaryFlow.turnover_vs20)}</span>
                <span className={`ml-2 ${clsPct(primaryFlow.avg_ret1)}`}>騰落 {pct(primaryFlow.avg_ret1)}</span>
                <span className="ml-2">上昇 {fmt(primaryFlow.up_ratio, 0)}%</span>
              </>
            ) : (
              <>明確な主役なし。混在ならノートレ。</>
            )}
          </div>

          <div className="mt-3">
            <div className="overflow-x-auto rounded-lg border border-border/60 bg-background/40">
              <table className="w-full min-w-[1120px] text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20 text-muted-foreground">
                    <th className="px-3 py-2 text-left">候補</th>
                    <th className="px-3 py-2 text-left">フロー</th>
                    <th className="px-3 py-2 text-right">優先度</th>
                    <th className="px-3 py-2 text-right">終値</th>
                    <th className="px-3 py-2 text-right">現在</th>
                    <th className="px-3 py-2 text-right">寄付差</th>
                    <th className="px-3 py-2 text-right">5日</th>
                    <th className="px-3 py-2 text-right">25日線比</th>
                    <th className="px-3 py-2 text-right">CVaR5</th>
                    <th className="px-3 py-2 text-left">9:20判定</th>
                  </tr>
                </thead>
                <tbody>
                  {morningPilotRows.length === 0 ? (
                    <tr><td colSpan={10} className="px-4 py-6 text-center text-muted-foreground">候補なし。ノートレ優先。</td></tr>
                  ) : morningPilotRows.map((row) => {
                    const rt = realtimeFor(row.ticker);
                    const openDiff = priceDiffFromOpen(row) ?? undefined;
                    const check = row.entry_status === 'READY'
                      ? '候補。VWAP上とセグメント維持を確認'
                      : row.trade_bucket === '実弾候補'
                        ? '待ち。寄り後の維持確認'
                        : '過熱注意。押し目以外は待ち';
                    return (
                      <tr key={`pilot-${row.code}`} className="border-b border-border/20">
                        <td className="px-3 py-2">
                          <div className="font-medium">{row.name}</div>
                          <div className="text-xs text-muted-foreground">{row.ticker}</div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{row.flow_group || row.sub_segment || '-'}</div>
                          <div className="text-xs text-muted-foreground">{row.theme_layer || row.core_segment || '-'}</div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmt(row.entry_priority, 1)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(row.close, 1)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(rt?.price ?? undefined, 1)}</td>
                        <td className={`px-3 py-2 text-right tabular-nums ${clsPct(openDiff)}`}>{yenAbs(openDiff)}</td>
                        <td className={`px-3 py-2 text-right tabular-nums ${clsPct(row.ret5)}`}>{pct(row.ret5)}</td>
                        <td className={`px-3 py-2 text-right tabular-nums ${clsPct(row.vs25)}`}>{pct(row.vs25)}</td>
                        <td className={`px-3 py-2 text-right tabular-nums ${clsPct(row.cvar05)}`}>{pct(row.cvar05)}</td>
                        <td className="px-3 py-2 text-xs leading-5 text-muted-foreground"><div className="max-w-[260px]">{check}</div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <details className="mt-3 rounded-lg border border-border/60 bg-background/40 p-3">
              <summary className="cursor-pointer select-none text-sm font-semibold text-muted-foreground hover:text-foreground">
                検証根拠を表示
              </summary>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-muted-foreground">{morningPilot?.source || 'semicon_intraday_long_short_grid.csv'}</div>
                </div>
                <span className={`rounded border px-2 py-0.5 text-xs ${
                  morningPilot?.available ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200' : 'border-amber-400/40 bg-amber-400/10 text-amber-200'
                }`}>
                  {morningPilot?.available ? '5分足検証あり' : '検証未読込'}
                </span>
              </div>
              <div className="space-y-2">
                {(morningPilot?.evidence || []).slice(0, 4).map((row) => (
                  <div key={`${row.variant}-${row.entry}-${row.exit}`} className="rounded border border-border/50 bg-muted/10 p-2">
                    <div className="text-xs font-medium">{row.label}</div>
                    <div className="mt-1 grid grid-cols-4 gap-2 text-xs">
                      <div><div className="text-muted-foreground">N</div><div className="text-right tabular-nums">{row.n}</div></div>
                      <div><div className="text-muted-foreground">PF</div><div className="text-right font-semibold tabular-nums text-emerald-300">{fmt(row.pf, 2)}</div></div>
                      <div><div className="text-muted-foreground">損益</div><div className={`text-right tabular-nums ${clsPct(row.sum_pnl_100)}`}>{yen(row.sum_pnl_100)}</div></div>
                      <div><div className="text-muted-foreground">DD</div><div className="text-right tabular-nums text-rose-300">{yen(row.max_dd_100)}</div></div>
                    </div>
                  </div>
                ))}
                {(!morningPilot?.evidence || morningPilot.evidence.length === 0) && (
                  <div className="rounded border border-border/50 bg-muted/10 p-2 text-xs text-muted-foreground">
                    {morningPilot?.reason || '午前検証サマリーなし'}
                  </div>
                )}
              </div>
              <div className="mt-3 rounded border border-border/50 bg-muted/10 px-2 py-1.5 text-xs leading-5 text-muted-foreground">
                {morningPilot?.takeaway || '9:20以降に崩れていないものだけを小さく扱う。'}
              </div>
            </details>
          </div>
        </section>

        <section className={`${view === 'FLOW' ? '' : 'hidden '}mb-4 rounded-lg border border-border bg-card p-4`}>
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs text-muted-foreground">資金流入マップ</div>
              <h2 className="mt-1 text-lg font-semibold">3層で端緒を見る</h2>
              <p className="mt-2 max-w-5xl text-sm leading-6 text-muted-foreground">
                テーマ層で投資家が一塊で見る単位、フロー層で実際に一緒に買われる単位、行動層で乗る/待つ/触らないを分けます。売買代金は買いシグナルではなく観測レイヤーです。
              </p>
            </div>
            <div className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground">
              date: {flow?.date || data?.data_date || '-'}
            </div>
          </div>
          {flow?.available ? (
            <>
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-border/60 bg-background/45 p-3">
                  <div className="text-xs text-muted-foreground">市場全体</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">{oku(flow.market?.turnover_bil)}億円</div>
                  <div className="mt-1 text-xs text-muted-foreground">5日 {mult(flow.market?.turnover_vs5)} / 20日 {mult(flow.market?.turnover_vs20)} / 60日 {mult(flow.market?.turnover_vs60)}</div>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/45 p-3">
                  <div className="text-xs text-muted-foreground">AI/半導体周辺</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">{oku(flow.universe?.turnover_bil)}億円</div>
                  <div className="mt-1 text-xs text-muted-foreground">市場比 {fmt(flow.universe?.market_share, 1)}% / 5日 {mult(flow.universe?.turnover_vs5)} / 20日 {mult(flow.universe?.turnover_vs20)}</div>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/45 p-3">
                  <div className="text-xs text-muted-foreground">top1除外</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">{oku(flow.universe?.turnover_ex_top1_bil)}億円</div>
                  <div className="mt-1 text-xs text-muted-foreground">top1 {flow.universe?.top_name || '-'} / 占有 {fmt(flow.universe?.top_share, 1)}%</div>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/45 p-3">
                  <div className="text-xs text-muted-foreground">広がり</div>
                  <div className={`mt-1 text-lg font-semibold tabular-nums ${clsPct(flow.universe?.avg_ret1)}`}>{pct(flow.universe?.avg_ret1)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">上昇比率 {fmt(flow.universe?.up_ratio, 0)}% / 対象 {flow.universe?.n ?? '-'}</div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <div className="overflow-x-auto rounded-lg border border-border/60">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/20 text-muted-foreground">
                        <th className="px-3 py-2 text-left">テーマ層</th>
                        <th className="px-3 py-2 text-right">売買代金</th>
                        <th className="px-3 py-2 text-right">5日比</th>
                        <th className="px-3 py-2 text-right">20日比</th>
                        <th className="px-3 py-2 text-right">60日比</th>
                        <th className="px-3 py-2 text-right">騰落</th>
                        <th className="px-3 py-2 text-right">上昇</th>
                        <th className="px-3 py-2 text-left">端緒</th>
                        <th className="px-3 py-2 text-left">行動</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flowThemeRows.map((row) => (
                        <tr key={row.segment} className="border-b border-border/20">
                          <td className="px-3 py-2">
                            <div className="font-semibold">{row.segment}</div>
                            <div className="text-xs text-muted-foreground">top {row.top_name || '-'} / {fmt(row.top_share, 0)}%</div>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{oku(row.turnover_bil)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{mult(row.turnover_vs5)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{mult(row.turnover_vs20)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{mult(row.turnover_vs60)}</td>
                          <td className={`px-3 py-2 text-right tabular-nums ${clsPct(row.avg_ret1)}`}>{pct(row.avg_ret1)}</td>
                          <td className={`px-3 py-2 text-right tabular-nums ${clsPct((row.up_ratio || 0) - 50)}`}>{fmt(row.up_ratio, 0)}%</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{row.hint || '-'}</td>
                          <td className="px-3 py-2 text-xs font-medium">{row.action_hint || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="overflow-x-auto rounded-lg border border-border/60">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/20 text-muted-foreground">
                        <th className="px-3 py-2 text-left">フロー層</th>
                        <th className="px-3 py-2 text-right">売買代金</th>
                        <th className="px-3 py-2 text-right">5日比</th>
                        <th className="px-3 py-2 text-right">20日比</th>
                        <th className="px-3 py-2 text-right">60日比</th>
                        <th className="px-3 py-2 text-right">騰落</th>
                        <th className="px-3 py-2 text-right">上昇</th>
                        <th className="px-3 py-2 text-left">端緒</th>
                        <th className="px-3 py-2 text-left">行動</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flowGroupRows.map((row) => (
                        <tr key={row.segment} className="border-b border-border/20">
                          <td className="px-3 py-2">
                            <div className="font-semibold">{row.segment}</div>
                            <div className="text-xs text-muted-foreground">top {row.top_name || '-'} / {fmt(row.top_share, 0)}%</div>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{oku(row.turnover_bil)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{mult(row.turnover_vs5)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{mult(row.turnover_vs20)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{mult(row.turnover_vs60)}</td>
                          <td className={`px-3 py-2 text-right tabular-nums ${clsPct(row.avg_ret1)}`}>{pct(row.avg_ret1)}</td>
                          <td className={`px-3 py-2 text-right tabular-nums ${clsPct((row.up_ratio || 0) - 50)}`}>{fmt(row.up_ratio, 0)}%</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{row.hint || '-'}</td>
                          <td className="px-3 py-2 text-xs font-medium">{row.action_hint || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-lg border border-border/60">
                <table className="w-full min-w-[980px] text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/20 text-muted-foreground">
                      <th className="px-3 py-2 text-left">個別上位</th>
                      <th className="px-3 py-2 text-left">3層分類</th>
                      <th className="px-3 py-2 text-right">売買代金</th>
                      <th className="px-3 py-2 text-right">5日比</th>
                      <th className="px-3 py-2 text-right">20日比</th>
                      <th className="px-3 py-2 text-right">60日比</th>
                      <th className="px-3 py-2 text-right">1日</th>
                      <th className="px-3 py-2 text-left">フロー内</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flowIndividualRows.map((row) => (
                      <tr key={row.code} className="border-b border-border/20">
                        <td className="px-3 py-2">
                          <div className="font-semibold">{row.name}</div>
                          <div className="text-xs text-muted-foreground">{row.code}</div>
                        </td>
                        <td className="px-3 py-2">
                          <div>{row.theme_layer || row.core_segment}</div>
                          <div className="text-xs text-muted-foreground">{row.flow_group || row.sub_segment}</div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{oku(row.turnover_bil)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{mult(row.turnover_vs5)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{mult(row.turnover_vs20)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{mult(row.turnover_vs60)}</td>
                        <td className={`px-3 py-2 text-right tabular-nums ${clsPct(row.ret1)}`}>{pct(row.ret1)}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{row.flow_fit || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-border/60 bg-background/45 p-3 text-sm text-muted-foreground">
              資金流入データ未生成: {flow?.reason || 'no flow analysis'}
            </div>
          )}
        </section>

        <section className={`${view === 'FLOW' ? '' : 'hidden '}mb-4 rounded-lg border border-border bg-card p-4`}>
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs text-muted-foreground">外部地合い</div>
              <h2 className="mt-1 text-lg font-semibold">米国・先物・為替地合い</h2>
              <p className="mt-2 max-w-5xl text-sm leading-6 text-muted-foreground">
                半導体ロングの前提確認。SOX、NVIDIA、Broadcom、Micron、TSMC、NASDAQ先物、日経CME、USDJPYを分けて見ます。強弱が割れた日は全面買いではなく、セグメント別に寄り後維持を確認します。
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                externalRegime === '追い風優勢'
                  ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
                  : externalRegime === '逆風優勢'
                    ? 'border-rose-400/40 bg-rose-400/10 text-rose-200'
                    : 'border-amber-400/40 bg-amber-400/10 text-amber-200'
              }`}>
                判定: {externalRegime}
              </div>
              <div className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground">
                date: {data?.market_indicator_date || '-'}
              </div>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {marketIndicators.map((indicator) => {
              const tone = indicatorTone(indicator, indicator.ret1);
              return (
                <div key={indicator.ticker} className="rounded-lg border border-border/60 bg-background/45 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold">{indicator.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{indicator.ticker} / {indicator.role}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {indicator.date && indicator.date !== data?.market_indicator_date && (
                        <span className="rounded border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[11px] text-amber-200 whitespace-nowrap">
                          date {indicator.date}
                        </span>
                      )}
                      <span className={`rounded border px-2 py-0.5 text-xs whitespace-nowrap ${
                        tone === 'good'
                          ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
                          : tone === 'bad'
                            ? 'border-rose-400/40 bg-rose-400/10 text-rose-200'
                            : tone === 'warn'
                              ? 'border-amber-400/40 bg-amber-400/10 text-amber-200'
                          : 'border-border text-muted-foreground'
                      }`}>
                        {indicatorDecision(indicator, indicator.ret1)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">終値</div>
                      <div className="mt-1 text-right text-base font-semibold tabular-nums">{fmtPrice(indicator.close)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">1日</div>
                      <div className={`mt-1 text-right text-base font-semibold tabular-nums ${clsPct(indicator.ret1)}`}>{pct(indicator.ret1)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">5日</div>
                      <div className={`mt-1 text-right text-base font-semibold tabular-nums ${clsPct(indicator.ret5)}`}>{pct(indicator.ret5)}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs leading-5 text-muted-foreground">{indicator.risk_note}</div>
                  <div className="mt-2 text-[11px] text-muted-foreground/70">source: {indicator.source || data?.market_indicator_source || '-'}</div>
                </div>
              );
            })}
            {marketIndicators.length === 0 && (
              <div className="rounded-lg border border-border/60 bg-background/45 p-3 text-sm text-muted-foreground">
                外部地合いデータ未生成。1645/0700 pipeline の semicon artifact に market_indicators を入れる必要があります。
              </div>
            )}
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-border/60 bg-background/45 p-3">
              <div className="text-xs font-semibold text-emerald-300">順張りしやすい形</div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">日経CMEが強く、WTIとGoldが落ち着き、銅が弱くない。寄り後に主力と周辺の過半が維持。</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/45 p-3">
              <div className="text-xs font-semibold text-amber-300">混在の形</div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">株先物は高いがWTI/Goldも高い。寄り高から利確されやすく、寄り買いではなく30分確認。</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/45 p-3">
              <div className="text-xs font-semibold text-rose-300">見送りの形</div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">Gold上昇、WTI急騰、日経CME失速のどれかが強い。候補があってもノートレ優先。</div>
            </div>
          </div>
        </section>

        <section className={`${view === 'OPERATE' ? '' : 'hidden '}mb-4 rounded-lg border border-emerald-500/25 bg-card p-4`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs text-muted-foreground">今日の実務判断</div>
              <h2 className="mt-1 text-xl font-semibold">{actionableHeadline}</h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
                目的はAIインフラ周辺の強い流れに乗ること。ただし、寄り買いではなく、地合い・セグメント強度・寄付差・寄り後の維持を通過した銘柄だけ候補化する。
              </p>
            </div>
            <button type="button" onClick={fetchRealtime} disabled={realtimeLoading || !data}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/30 disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${realtimeLoading ? 'animate-spin' : ''}`} />
              リアルタイム
              {realtimeTimestamp && <span className="text-muted-foreground/70">{realtimeTimestamp}</span>}
            </button>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-4">
            <div className="rounded-lg border border-border/60 bg-background/45 p-3">
              <div className="text-xs text-muted-foreground">新規ロング</div>
              <div className={`mt-1 text-lg font-semibold ${readyRows.length > 0 ? 'text-emerald-300' : 'text-amber-300'}`}>
                {readyRows.length > 0 ? `${readyRows.length}件 条件付き` : '原則待ち'}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">READYでも寄り後維持/前日高値確認が前提</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/45 p-3">
              <div className="text-xs text-muted-foreground">既存ショート</div>
              <div className={`mt-1 text-lg font-semibold ${highRiskShorts.length > 0 ? 'text-rose-300' : 'text-muted-foreground'}`}>
                {highRiskShorts.length > 0 ? `${highRiskShorts.length}件 警戒` : '該当薄い'}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">テーマ該当売建は新規ロング判断より先に確認</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/45 p-3">
              <div className="text-xs text-muted-foreground">強いセグメント</div>
              <div className="mt-1 space-y-1 text-sm">
                {hotThemeRows.map((row) => (
                  <div key={row.segment} className="flex justify-between gap-2">
                    <span className="truncate">{row.segment}</span>
                    <span className={`tabular-nums ${clsPct(row.avg_ret5)}`}>{pct(row.avg_ret5)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/45 p-3">
              <div className="text-xs text-muted-foreground">ノートレ条件</div>
              <div className="mt-1 text-sm leading-5 text-muted-foreground">
                地合い混在、寄りで飛びすぎ、セグメント内の過半失速、候補が寄り後に失速。
              </div>
            </div>
          </div>
        </section>

        {view === 'OPERATE' && holdShorts.length > 0 && (
          <section className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4">
            <div className="mb-3">
              <div className="text-xs text-rose-200/80">既存ショート警戒</div>
              <h2 className="mt-1 text-lg font-semibold text-rose-100">AIインフラ周辺の売建を先に見る</h2>
              <p className="mt-2 text-sm leading-6 text-rose-100/80">
                ここは新規エントリー候補ではなく、テーマ順張り相場で踏まれやすい既存ショートの確認欄です。
              </p>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border/60 bg-background/50">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground">
                    <th className="px-3 py-2 text-left">銘柄</th>
                    <th className="px-3 py-2 text-left">分類</th>
                    <th className="px-3 py-2 text-right">数量</th>
                    <th className="px-3 py-2 text-right">時価</th>
                    <th className="px-3 py-2 text-right">評価損益</th>
                    <th className="px-3 py-2 text-right">損益率</th>
                    <th className="px-3 py-2 text-left">警戒</th>
                  </tr>
                </thead>
                <tbody>
                  {holdShorts.map((row) => (
                    <tr key={row.code} className="border-b border-border/20">
                      <td className="px-3 py-2">
                        <div className="font-medium">{row.name}</div>
                        <div className="text-xs text-muted-foreground">{row.ticker}</div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{row.segment}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(row.quantity, 0)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(row.current_price, 1)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums font-semibold ${row.pnl != null && row.pnl < 0 ? 'text-rose-300' : 'text-emerald-300'}`}>{yen(row.pnl)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums ${clsPct(row.pnl_pct)}`}>{pct(row.pnl_pct)}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded border px-2 py-0.5 text-xs ${
                          row.risk_level === '高'
                            ? 'border-rose-400/40 bg-rose-400/10 text-rose-200'
                            : row.risk_level === '中'
                              ? 'border-amber-400/40 bg-amber-400/10 text-amber-200'
                              : 'border-border text-muted-foreground'
                        }`}>
                          {row.risk_level || '-'}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">{row.note}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <details className={`${view === 'DETAIL' ? '' : 'hidden '}mb-4 rounded-lg border border-border/60 bg-card/60 px-4 py-3 text-sm`}>
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

        <section className={`${view === 'DETAIL' ? '' : 'hidden '}mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4`}>
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

        <section className={`${view === 'DETAIL' ? '' : 'hidden '}mb-4 rounded-lg border border-sky-500/30 bg-sky-500/10 p-4`}>
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

        <section className={`${view === 'DETAIL' ? '' : 'hidden '}mb-4 rounded-lg border border-border bg-card p-4`}>
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs text-muted-foreground">分類の根拠</div>
              <h2 className="mt-1 text-lg font-semibold">経産省の半導体分類を骨格に、AIインフラ周辺を別枠で見る</h2>
              <p className="mt-2 max-w-5xl text-sm leading-6 text-muted-foreground">
                半導体ど真ん中は経産省のデバイス・製造装置・部素材・後工程を起点にする。MLCC、光通信、電力、冷却、DC建設は、AIサーバー需要で株価が動く周辺産業として TrendForce / 矢野経済 / 富士経済系の市場分類を使って分ける。
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/45 px-3 py-2 text-xs text-muted-foreground">
              表示: core / sub / driver / basis
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {classificationBasisRows.map((row) => (
              <div key={row.layer} className="rounded-lg border border-border/60 bg-background/45 p-3">
                <div className="text-sm font-semibold">{row.layer}</div>
                <div className="mt-2 text-xs leading-5 text-muted-foreground">{row.basis}</div>
                <div className="mt-3 rounded border border-border/50 bg-muted/20 px-2 py-1.5 text-xs leading-5 text-foreground">
                  {row.use}
                </div>
              </div>
            ))}
            {classificationBasisRows.length === 0 && (
              <div className="rounded-lg border border-border/60 bg-background/45 p-3 text-sm text-muted-foreground">
                分類根拠が API にありません。semicon artifact または API 正規化の確認が必要です。
              </div>
            )}
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-border/60 bg-background/45 p-3">
              <div className="text-xs font-semibold text-sky-300">core</div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">半導体コア / AIサーバー部品 / 電力・冷却 / 光・通信 / DC建設設備。</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/45 p-3">
              <div className="text-xs font-semibold text-emerald-300">driver</div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">SOX連動、NAND、MLCC需給、AIデータセンター接続、電力制約など、株価が動く理由。</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/45 p-3">
              <div className="text-xs font-semibold text-amber-300">basis</div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">経産省は本体、TrendForceはMLCC、矢野経済はDC/冷却、富士経済は光通信の根拠として使う。</div>
            </div>
          </div>
        </section>

        <section className={`${view === 'DETAIL' ? '' : 'hidden '}mb-4 rounded-lg border border-border bg-card p-4`}>
          <div className="mb-3">
            <div className="text-xs text-muted-foreground">隣接国策テーマ・監視棚</div>
            <h2 className="mt-1 text-lg font-semibold">買う棚ではなく、資金ローテーションを早めに察知する棚</h2>
            <p className="mt-2 max-w-5xl text-sm leading-6 text-muted-foreground">
              防衛、宇宙、サイバー、量子、ロボット、次世代電力は国策として重要。ただし左尾が大きい銘柄が多いため、一次情報と出来高、寄り後維持が揃うまで実弾候補にしない。
            </p>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full min-w-[1080px] text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20 text-muted-foreground">
                  <th className="px-3 py-2 text-left">テーマ</th>
                  <th className="px-3 py-2 text-left">一次情報の棚</th>
                  <th className="px-3 py-2 text-left">見るもの</th>
                  <th className="px-3 py-2 text-left">扱い</th>
                </tr>
              </thead>
              <tbody>
                {adjacentThemeRows.map((row) => (
                  <tr key={row.theme} className="border-b border-border/20">
                    <td className="px-3 py-2 font-semibold">{row.theme}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.source}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.watch}</td>
                    <td className="px-3 py-2 text-amber-200">{row.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${view === 'DETAIL' ? '' : 'hidden '}mb-4 rounded-lg border border-border bg-card p-4`}>
          <div className="mb-3">
            <h2 className="text-sm font-semibold">ユニバース整理</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              半導体主力を温度計、AIインフラ/電力/光/材料を実弾候補として分ける。主力が高すぎる日は、周辺の出遅れと寄り後の資金流入を優先する。
            </p>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full min-w-[1480px] text-sm">
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

        <section className={`${view === 'DETAIL' ? '' : 'hidden '}mb-4 rounded-lg border border-border bg-card p-4`}>
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
                  <th className="px-3 py-2 text-left whitespace-nowrap">区分</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">状態</th>
                  <th className="px-3 py-2 text-left">銘柄</th>
                  <th className="px-3 py-2 text-left">分類</th>
                  <th className="px-3 py-2 text-left">core/sub</th>
                  <th className="px-3 py-2 text-left">driver</th>
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
                    <td className="px-3 py-2 whitespace-nowrap">
                      <TradeBucketBadge bucket={row.trade_bucket} />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap"><EntryStatusBadge status={row.entry_status} /></td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-muted-foreground">{row.ticker}</div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{row.segment}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{row.core_segment || '-'}</div>
                      <div className="text-xs text-muted-foreground">{row.sub_segment || '-'}</div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground"><div className="max-w-[220px] leading-5">{row.theme_driver || '-'}</div></td>
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

        <section className={`${view === 'OPERATE' ? '' : 'hidden '}mb-4 rounded-lg border border-border bg-card p-4`}>
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">エントリー条件</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                ここは発注指示ではなく、寄付前と寄り後30分で確認する条件表。寄り買いではなく、前日高値と寄り後の維持を見てから候補化する。VWAPは証券画面で手動確認する。
              </p>
            </div>
            <button type="button" onClick={fetchRealtime} disabled={realtimeLoading || !data}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-sky-500/20 px-3 py-1.5 text-xs font-medium text-sky-300 transition-colors hover:bg-sky-500/30 disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${realtimeLoading ? 'animate-spin' : ''}`} />
              寄付
              {realtimeTimestamp && <span className="ml-1 text-sky-300/60">{realtimeTimestamp}</span>}
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full min-w-[1680px] text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20 text-muted-foreground">
                  <th className="px-3 py-2 text-left whitespace-nowrap">銘柄</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">状態</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">区分</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">優先度</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">終値</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">現在</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">前日比</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">寄付差</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">発火価格</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">寄付条件</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">寄り後</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">入る条件</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">無効条件</th>
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
                      <td className="px-3 py-2 whitespace-nowrap"><EntryStatusBadge status={row.entry_status} /></td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <TradeBucketBadge bucket={row.trade_bucket} />
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold whitespace-nowrap">{fmt(row.entry_priority, 1)}</td>
                      <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{fmt(row.close, 1)}</td>
                      <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{fmt(realtimeFor(row.ticker)?.price ?? undefined, 1)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums whitespace-nowrap ${clsPct(priceDiffFromClose(row) ?? undefined)}`}>{yenAbs(priceDiffFromClose(row) ?? undefined)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums whitespace-nowrap ${clsPct(priceDiffFromOpen(row) ?? undefined)}`}>{yenAbs(priceDiffFromOpen(row) ?? undefined)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold whitespace-nowrap">{fmt(triggerPriceFor(row), 0)}</td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{plan.gapLimit}</td>
                      <td className="px-3 py-2 text-muted-foreground"><div className="max-w-[220px] leading-5">{plan.openAction}</div></td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{plan.trigger}</td>
                      <td className="px-3 py-2 text-muted-foreground"><div className="max-w-[260px] leading-5">{plan.invalidation}</div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${view === 'OPERATE' ? '' : 'hidden '}mb-4 rounded-lg border border-rose-500/25 bg-rose-500/10 p-4`}>
          <div className="mb-3">
            <div className="text-xs text-rose-200/80">見送り条件</div>
            <h2 className="mt-1 text-lg font-semibold text-rose-100">高値掴みと落ちるナイフを避ける</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-rose-100/85">
              AIインフラ周辺は強いテーマだが、寄り天・過熱・地政学で一撃の左尾が出る。条件が崩れた日は、候補があってもノートレを正解にする。
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

        <section className={`${view === 'FLOW' ? '' : 'hidden '}mb-4 rounded-lg border border-border bg-card p-4`}>
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

        <section className={`${view === 'DETAIL' ? '' : 'hidden '}mb-4 rounded-lg border border-border bg-card p-4`}>
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

        <section className={`${view === 'OPERATE' ? '' : 'hidden '}mb-4 rounded-lg border border-border bg-card p-4`}>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">優先監視</h2>
              <p className="mt-1 text-xs text-muted-foreground">発火価格、寄付差、米地合いを通過した銘柄だけ小さく候補化します。VWAPは証券画面で確認します。</p>
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

        <section className={`${view === 'DETAIL' ? '' : 'hidden '}mb-4 rounded-lg border border-border bg-card p-4`}>
          <h2 className="mb-3 text-sm font-semibold">米市場</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px] text-sm">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground">
                  <th className="px-2 py-2 text-left">指標</th>
                  <th className="px-2 py-2 text-left">国内ターゲット</th>
                  <th className="px-2 py-2 text-right">終値</th>
                  <th className="px-2 py-2 text-right">1日</th>
                  <th className="px-2 py-2 text-right">5日</th>
                  <th className="px-2 py-2 text-right">20日</th>
                  <th className="px-2 py-2 text-left">読み方</th>
                </tr>
              </thead>
              <tbody>
                {(data?.overseas || []).map((r) => {
                  const impact = usImpactRows[r.ticker];
                  return (
                    <tr key={r.ticker} className="border-b border-border/20">
                      <td className="px-2 py-2">
                        <span className="font-medium">{r.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{r.ticker}</span>
                      </td>
                      <td className="px-2 py-2">
                        <div className="font-medium">{impact?.target || '-'}</div>
                        <div className="mt-0.5 max-w-[260px] text-xs leading-5 text-muted-foreground">{impact?.domestic || '-'}</div>
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmt(r.close, 2)}</td>
                      <td className={`px-2 py-2 text-right tabular-nums ${clsPct(r.ret1)}`}>{pct(r.ret1)}</td>
                      <td className={`px-2 py-2 text-right tabular-nums ${clsPct(r.ret5)}`}>{pct(r.ret5)}</td>
                      <td className={`px-2 py-2 text-right tabular-nums ${clsPct(r.ret20)}`}>{pct(r.ret20)}</td>
                      <td className="px-2 py-2 text-xs leading-5 text-muted-foreground"><div className="max-w-[320px]">{impact?.read || '-'}</div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${view === 'DETAIL' ? '' : 'hidden '}rounded-lg border border-border bg-card`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-4 py-3">
            <h2 className="text-sm font-semibold">候補銘柄</h2>
            <div className="flex gap-1">
              {(['ALL', '実弾候補', '指標銘柄', '過熱注意', '見送り'] as const).map((key) => (
                <button key={key} type="button" onClick={() => setFilter(key)}
                  className={`rounded-md px-2.5 py-1 text-xs ${filter === key ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/30'}`}>
                  {key === 'ALL' ? '全て' : key}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1600px] text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20 text-muted-foreground">
                  <th className="px-3 py-2 text-left">銘柄</th>
                  <th className="px-3 py-2 text-center">判定</th>
                  <th className="px-3 py-2 text-left">core/sub</th>
                  <th className="px-3 py-2 text-left">driver</th>
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
                  <tr><td colSpan={15} className="px-4 py-8 text-center text-muted-foreground">読み込み中...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={15} className="px-4 py-8 text-center text-muted-foreground">該当なし</td></tr>
                ) : rows.map((r) => (
                  <tr key={r.code} className="border-b border-border/20 hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.ticker} / {r.segment} / {r.label}</div>
                    </td>
                    <td className="px-3 py-2 text-center"><DecisionBadge decision={r.decision} /></td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.core_segment || '-'}</div>
                      <div className="text-xs text-muted-foreground">{r.sub_segment || '-'}</div>
                    </td>
                    <td className="px-3 py-2 text-xs leading-5 text-muted-foreground"><div className="max-w-[220px]">{r.theme_driver || '-'}</div></td>
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
