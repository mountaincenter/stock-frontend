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
  overseas: OverseasRow[];
  report_available: boolean;
  report_url?: string;
}

const fmt = (v?: number, digits = 1) => v == null || Number.isNaN(v) ? '-' : v.toLocaleString('ja-JP', { maximumFractionDigits: digits, minimumFractionDigits: digits });
const pct = (v?: number) => v == null || Number.isNaN(v) ? '-' : `${v > 0 ? '+' : ''}${v.toFixed(2)}%`;
const clsPct = (v?: number) => v == null ? 'text-muted-foreground' : v > 0 ? 'text-emerald-400' : v < 0 ? 'text-rose-400' : 'text-muted-foreground';

function DecisionBadge({ decision }: { decision: Decision }) {
  const map = {
    BUY_CANDIDATE: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    WATCH: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    AVOID: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  };
  const label = {
    BUY_CANDIDATE: '買い候補',
    WATCH: '監視',
    AVOID: '見送り',
  };
  return <span className={`inline-block rounded border px-2 py-0.5 text-xs whitespace-nowrap ${map[decision]}`}>{label[decision]}</span>;
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

export default function SemiconPage() {
  const [data, setData] = useState<SemiconResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Decision | 'ALL'>('ALL');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/dev/semicon/signals`, { cache: 'no-store' });
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const rows = useMemo(() => {
    const base = data?.signals || [];
    return filter === 'ALL' ? base : base.filter((r) => r.decision === filter);
  }, [data, filter]);

  const marketTone = data?.market.state === 'RISK_ON' ? 'good' : data?.market.state === 'RISK_OFF' ? 'bad' : 'warn';

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1500px] px-3 py-4 md:px-5">
        <header className="mb-4 flex flex-wrap items-center gap-3 border-b border-border/50 pb-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">AI/半導体 順張り v1</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              AI/半導体および周辺産業の資金流入を、米SOX・個別トレンド・左尾・ファンダで半裁量判定
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

        <section className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard label="米国地合い" value={data?.market.label || '-'} sub={data?.data_date ? `data ${data.data_date}` : undefined} tone={marketTone} />
          <StatCard label="買い候補" value={data?.counts.buy ?? 0} tone="good" />
          <StatCard label="監視" value={data?.counts.watch ?? 0} tone="warn" />
          <StatCard label="見送り" value={data?.counts.avoid ?? 0} tone="bad" />
          <StatCard label="対象" value={data?.counts.total ?? 0} sub="AI/半導体+周辺" />
        </section>

        <section className="mb-4 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">運用ルール</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                買い候補でも寄りで飛びすぎなら待つ。SOX/NVIDIA/Micron/TSMC が逆風の日は、個別材料が強くてもロットを落とすか見送る。
              </p>
            </div>
            {data?.report_available && data.report_url && (
              <a href={`${API_BASE}${data.report_url}`} target="_blank" rel="noreferrer"
                className="rounded-lg border border-primary/40 px-3 py-1.5 text-xs text-primary hover:bg-primary/10">
                詳細HTMLを開く
              </a>
            )}
          </div>
          {data?.data_stale && (
            <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              シグナル計算データが {data.stale_days} 日前です。実運用では詳細HTMLと最新生成後のデータで確認してください。
            </div>
          )}
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
                  <tr><td colSpan={12} className="px-4 py-8 text-center text-muted-foreground">読み込み中...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={12} className="px-4 py-8 text-center text-muted-foreground">該当なし</td></tr>
                ) : rows.map((r) => (
                  <tr key={r.code} className="border-b border-border/20 hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.ticker} / {r.segment} / {r.label}</div>
                    </td>
                    <td className="px-3 py-2 text-center"><DecisionBadge decision={r.decision} /></td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmt(r.score, 1)}</td>
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
