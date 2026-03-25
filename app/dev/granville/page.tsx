'use client';

import { useCallback, useEffect, useState } from 'react';
import { DevNavLinks } from '../../../components/dev';
import { ChevronDown, ChevronRight } from 'lucide-react';

// === localStorage チェック状態管理 ===
function useCheckedState(prefix: string, date: string | null) {
  const key = `granville_${prefix}_${date || 'none'}`;
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) setChecked(new Set(JSON.parse(stored)));
    } catch { /* ignore */ }
  }, [key]);

  const toggle = useCallback((ticker: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker); else next.add(ticker);
      try { localStorage.setItem(key, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }, [key]);

  const toggleAll = useCallback((tickers: string[]) => {
    setChecked(prev => {
      const allChecked = tickers.every(t => prev.has(t));
      const next = allChecked ? new Set<string>() : new Set(tickers);
      try { localStorage.setItem(key, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }, [key]);

  return { checked, toggle, toggleAll };
}

const Checkbox = ({ checked, onChange, className }: { checked: boolean; onChange: () => void; className?: string }) => (
  <button type="button" onClick={onChange}
    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${checked ? 'bg-primary border-primary text-primary-foreground' : 'border-border/60 hover:border-primary/50'} ${className || ''}`}>
    {checked && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
  </button>
);

// === Types (backend dev_granville.py 準拠) ===
interface Recommendation {
  ticker: string; stock_name: string; sector: string; rule: string;
  rank_score: number; close: number; entry_price_est: number; prev_close: number;
  sma20: number; dev_from_sma20: number; atr10_pct: number; vol_ratio: number;
  expected_profit: number; margin: number; margin_pct: number; max_hold: number;
}
interface RecommendationsResponse { recommendations: Recommendation[]; count: number; total_margin: number; date: string | null; }

interface Signal {
  ticker: string; stock_name: string; sector: string; rule: string;
  close: number; sma20: number; dev_from_sma20: number; sma20_slope: number;
  entry_price_est: number; prev_close: number;
}
interface SignalsResponse { signals: Signal[]; count: number; signal_date: string | null; }

interface Position {
  ticker: string; stock_name: string; rule: string; direction: string;
  margin_type: string; deadline: string;
  entry_date: string; entry_price: number;
  current_price: number; quantity: number; cost_total: number; market_value: number;
  high_20d: number; atr10: number; gap_to_high: number;
  unrealized_pct: number; unrealized_yen: number;
  hold_days: number; max_hold: number; remaining_days: number; exit_type: string;
}
interface PositionsResponse { positions: Position[]; exits: Position[]; as_of: string | null; }

interface Triggers {
  cme_gap: number | null; cme_signal: string; cme_close: number | null;
  nk_close: number | null; sma20_60_gap: number | null; sma_signal: string;
  vix: number | null; vix_signal: string; strategy: string;
}
interface StatusResponse {
  triggers?: Triggers;
  cash_margin: number; credit_capacity: number; position_value: number;
  total_margin_used: number;
  signal_count: number; signal_date: string | null;
  open_positions: number; exit_candidates: number;
  recommendation_count: number;
  rule_breakdown: Record<string, number>;
}

interface RuleStats {
  count: number; win_rate: number; total_pnl: number; avg_pnl: number;
  avg_pct: number; exit_20d_high: number; exit_max_hold: number;
}
interface MonthlyStats { month: string; count: number; pnl: number; win_rate: number; }
interface StatsResponse { by_rule: Record<string, RuleStats>; monthly: MonthlyStats[]; total_trades: number; }

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

// === Helpers ===
const fmt = (v: number) => v.toLocaleString('ja-JP');
const fmtPnl = (v: number) => <span className={v >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{v >= 0 ? '+' : ''}{fmt(v)}円</span>;
const fmtPct = (v: number, d = 1) => `${v >= 0 ? '+' : ''}${v.toFixed(d)}%`;
const shortDate = (d: string) => { const m = d.match(/\d{4}-(\d{2})-(\d{2})/); return m ? `${m[1]}/${m[2]}` : d; };

// === Rule Badge ===
const RuleBadge = ({ rule }: { rule: string }) => {
  const cls = rule === 'B4' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
    : rule === 'B1' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    : rule === 'B3' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    : 'bg-purple-500/20 text-purple-400 border-purple-500/30';
  return <span className={`inline-block px-1.5 py-0.5 text-xs rounded leading-none border ${cls}`}>{rule}</span>;
};

const ruleLabel = (r: string) => {
  if (r === 'B1') return 'GC突破';
  if (r === 'B2') return '押し目';
  if (r === 'B3') return 'SMA支持';
  if (r === 'B4') return '暴落反発';
  return r;
};

const exitLabel = (t: string) => {
  if (t === '20d_high') return { text: '20日高値', cls: 'text-emerald-400' };
  if (t === 'max_hold') return { text: 'MAX_HOLD', cls: 'text-amber-400' };
  return { text: t || '保有中', cls: 'text-muted-foreground' };
};

// === Grade (rank_score → A/B/C) ===
const GradeBadge = ({ score }: { score: number }) => {
  const grade = score >= 70 ? 'A' : score >= 40 ? 'B' : 'C';
  const cls = grade === 'A' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    : grade === 'B' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
  return <span className={`inline-block px-1.5 py-0.5 text-xs rounded leading-none border ${cls}`}>{grade}</span>;
};

// === Sortable Table ===
type SortDir = 'asc' | 'desc' | null;
function useSortable<T>(data: T[], defaultKey?: keyof T) {
  const [sortKey, setSortKey] = useState<keyof T | null>(defaultKey ?? null);
  const [sortDir, setSortDir] = useState<SortDir>(defaultKey ? 'desc' : null);

  const toggle = (key: keyof T) => {
    if (sortKey === key) {
      setSortDir(d => d === 'desc' ? 'asc' : d === 'asc' ? null : 'desc');
      if (sortDir === 'asc') setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = sortKey && sortDir
    ? [...data].sort((a, b) => {
        const va = a[sortKey], vb = b[sortKey];
        const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
        return sortDir === 'desc' ? -cmp : cmp;
      })
    : data;

  return { sorted, sortKey, sortDir, toggle };
}

const SortHeader = <T,>({ label, field, sortKey, sortDir, toggle, className }: {
  label: string; field: keyof T;
  sortKey: keyof T | null; sortDir: SortDir;
  toggle: (k: keyof T) => void; className?: string;
}) => (
  <th className={`${className || ''} cursor-pointer select-none hover:text-foreground transition-colors`}
    onClick={() => toggle(field)}>
    <span className="inline-flex items-center gap-0.5">
      {label}
      <span className="text-[10px] opacity-60">
        {sortKey === field ? (sortDir === 'desc' ? ' \u25BC' : ' \u25B2') : ''}
      </span>
    </span>
  </th>
);

// === Layout Components ===
const StatCard = ({ label, children, sub }: { label: string; children: React.ReactNode; sub?: React.ReactNode }) => (
  <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl">
    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
    <div className="relative">
      <div className="text-muted-foreground text-xs mb-2">{label}</div>
      <div className="text-2xl font-bold text-right tabular-nums">{children}</div>
      {sub && <div className="text-xs text-right mt-1 text-muted-foreground tabular-nums">{sub}</div>}
    </div>
  </div>
);

const Panel = ({ title, border, children, footer }: { title: React.ReactNode; border?: string; children: React.ReactNode; footer?: React.ReactNode }) => (
  <section className="mb-5">
    <div className={`rounded-2xl border ${border || 'border-border/40'} bg-gradient-to-br from-card/50 via-card/80 to-card/50 shadow-lg shadow-black/5 backdrop-blur-xl overflow-hidden`}>
      <div className={`px-4 md:px-5 py-3 border-b ${border || 'border-b-border/40'}`}>
        {typeof title === 'string' ? <h2 className="text-base md:text-lg font-semibold text-foreground">{title}</h2> : title}
      </div>
      {children}
      {footer && <div className="px-4 md:px-5 py-2.5 border-t border-border/40 text-xs text-muted-foreground">{footer}</div>}
    </div>
  </section>
);

function GranvilleContent() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationsResponse | null>(null);
  const [signals, setSignals] = useState<SignalsResponse | null>(null);
  const [posData, setPosData] = useState<PositionsResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllSignals, setShowAllSignals] = useState(false);
  const [statsMode, setStatsMode] = useState<'expected' | 'actual'>('expected');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/dev/granville/status`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/api/dev/granville/recommendations`).then(r => r.json()).catch(() => ({ recommendations: [], count: 0, total_margin: 0, date: null })),
      fetch(`${API_BASE}/api/dev/granville/signals`).then(r => r.json()).catch(() => ({ signals: [], count: 0, signal_date: null })),
      fetch(`${API_BASE}/api/dev/granville/positions`).then(r => r.json()).catch(() => ({ positions: [], exits: [], as_of: null })),
      fetch(`${API_BASE}/api/dev/granville/stats`).then(r => r.json()).catch(() => null),
    ]).then(([st, rec, sig, pos, sta]) => {
      setStatus(st); setRecommendations(rec); setSignals(sig); setPosData(pos); setStats(sta); setLoading(false);
    });
  }, []);

  // チェック状態（localStorage永続化）
  const entryChecks = useCheckedState('entry', recommendations?.date ?? null);
  const exitChecks = useCheckedState('exit', posData?.as_of ?? null);

  // Sortable hooks
  const recSort = useSortable<Recommendation>(recommendations?.recommendations || [], 'rank_score');
  const posSort = useSortable<Position>(posData?.positions || []);
  const sigSort = useSortable<Signal>(signals?.signals || []);

  if (loading) {
    return (
      <main className="relative min-h-screen">
        <div className="fixed inset-0 -z-10"><div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" /></div>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="h-6 w-48 bg-muted/50 rounded mb-4 animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[...Array(4)].map((_, i) => <div key={i} className="rounded-xl border border-border/40 bg-card/50 p-5 h-24 animate-pulse" />)}
          </div>
        </div>
      </main>
    );
  }

  const marginPct = status && status.credit_capacity > 0 ? (status.total_margin_used / status.credit_capacity * 100) : 0;

  return (
    <main className="relative min-h-screen">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-primary/8 via-primary/3 to-transparent blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4 pb-3 border-b border-border/30">
          <div>
            <h1 className="text-xl font-bold text-foreground">Granville B1-B4</h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              TOPIX 1,660銘柄 / 20日高値Exit / 証拠金管理
              {status?.signal_date ? ` (${status.signal_date})` : ''}
            </p>
          </div>
          <DevNavLinks />
        </header>

        {/* Trigger Cards */}
        {status?.triggers && (() => {
          const t = status.triggers;
          const sigColor = (s: string) => s === 'green' ? 'text-emerald-400' : s === 'yellow' ? 'text-amber-400' : s === 'red' ? 'text-rose-400' : 'text-muted-foreground';
          const sigBg = (s: string) => s === 'green' ? 'border-emerald-500/30 bg-emerald-500/5' : s === 'yellow' ? 'border-amber-500/30 bg-amber-500/5' : s === 'red' ? 'border-rose-500/30 bg-rose-500/5' : 'border-border/40';
          const strategyColor = t.strategy === '積極' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : t.strategy === '消極' ? 'text-rose-400 bg-rose-500/10 border-rose-500/30' : t.strategy === '限定エントリー' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' : 'text-muted-foreground bg-muted/10 border-border/40';
          return (
            <div className={`rounded-xl border-2 ${strategyColor} p-4 mb-5`}>
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">判定</span>
                  <span className="text-2xl font-bold">{t.strategy}</span>
                </div>
                <div className="h-8 w-px bg-border/40 hidden md:block" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">CME Gap</span>
                  <span className={`text-lg font-bold tabular-nums ${sigColor(t.cme_signal)}`}>{t.cme_gap != null ? `${t.cme_gap > 0 ? '+' : ''}${t.cme_gap.toFixed(2)}%` : '-'}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${t.cme_signal === 'green' ? 'bg-emerald-500/15 text-emerald-400' : t.cme_signal === 'red' ? 'bg-rose-500/15 text-rose-400' : 'bg-amber-500/15 text-amber-400'}`}>{t.cme_signal === 'green' ? 'GO' : t.cme_signal === 'red' ? 'SKIP' : '検討'}</span>
                </div>
                <div className="h-8 w-px bg-border/40 hidden md:block" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">SMA乖離</span>
                  <span className={`text-lg font-bold tabular-nums ${sigColor(t.sma_signal)}`}>{t.sma20_60_gap != null ? `${t.sma20_60_gap > 0 ? '+' : ''}${t.sma20_60_gap.toFixed(2)}%` : '-'}</span>
                </div>
                <div className="h-8 w-px bg-border/40 hidden md:block" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">VIX</span>
                  <span className={`text-lg font-bold tabular-nums ${sigColor(t.vix_signal)}`}>{t.vix != null ? t.vix.toFixed(1) : '-'}</span>
                </div>
                <div className="h-8 w-px bg-border/40 hidden md:block" />
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-sm font-bold tabular-nums">N225 ¥{t.nk_close ? fmt(t.nk_close) : '-'}</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-sm font-bold tabular-nums">CME ¥{t.cme_close ? fmt(t.cme_close) : '-'}</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Status Bar */}
        {status && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-5">
            <StatCard label="現金保証金" sub={`建玉評価 ¥${fmt(status.position_value)}`}>
              <span className="text-foreground">¥{fmt(status.cash_margin)}</span>
            </StatCard>
            <StatCard label="信用余力" sub={`使用率 ${marginPct.toFixed(1)}%`}>
              <span className="text-foreground">¥{fmt(status.credit_capacity)}</span>
            </StatCard>
            <StatCard label="推奨銘柄" sub={status.total_margin_used > 0 ? `証拠金 ¥${fmt(status.total_margin_used)}` : undefined}>
              <span className="text-foreground">{status.recommendation_count}</span>
            </StatCard>
            <StatCard label="シグナル数" sub={
              <span className="flex gap-2 justify-end">
                {['B4', 'B1', 'B3', 'B2'].map(r => {
                  const n = status.rule_breakdown[r] || 0;
                  return n > 0 ? <span key={r}>{r}:{n}</span> : null;
                })}
              </span>
            }>
              <span className="text-foreground">{status.signal_count}</span>
            </StatCard>
            <StatCard label="ポジション" sub={status.exit_candidates > 0 ? `Exit候補: ${status.exit_candidates}件` : undefined}>
              <span className="text-foreground">{status.open_positions}</span>
            </StatCard>
            <StatCard label="基準日">
              <span className="text-foreground text-lg">{status.signal_date || '-'}</span>
            </StatCard>
          </div>
        )}

        {/* Exit Candidates Alert */}
        {posData && posData.exits.length > 0 && (
          <Panel title={
            <div className="flex items-center justify-between">
              <h2 className="text-base md:text-lg font-semibold text-amber-400">Exit候補 - {posData.exits.length}件（翌朝寄付で決済）</h2>
              <span className="text-xs text-muted-foreground tabular-nums">{exitChecks.checked.size}/{posData.exits.length} 決済済み</span>
            </div>
          } border="border-amber-500/40">
            <div className="overflow-x-auto">
              <table className="w-full text-sm md:text-base">
                <thead><tr className="text-muted-foreground border-b border-border/30 bg-muted/10">
                  <th className="px-3 py-2.5 text-xs font-medium w-8">
                    <Checkbox checked={posData.exits.length > 0 && posData.exits.every(p => exitChecks.checked.has(p.ticker))}
                      onChange={() => exitChecks.toggleAll(posData.exits.map(p => p.ticker))} />
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium">コード</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium">銘柄</th>
                  <th className="text-center px-3 py-2.5 text-xs font-medium">ルール</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium">IN日</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium hidden md:table-cell">IN価格</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium hidden md:table-cell">現在値</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium">損益%</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium">損益</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium">日数</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium">理由</th>
                </tr></thead>
                <tbody>
                  {posData.exits.map((p, i) => {
                    const el = exitLabel(p.exit_type);
                    const isExited = exitChecks.checked.has(p.ticker);
                    return (
                      <tr key={i} className={`border-b border-border/20 hover:bg-muted/5 ${isExited ? 'opacity-50' : ''}`}>
                        <td className="px-3 py-2.5"><Checkbox checked={isExited} onChange={() => exitChecks.toggle(p.ticker)} /></td>
                        <td className="px-4 py-2.5 tabular-nums font-semibold">
                          <button type="button" className="hover:text-primary" onClick={() => window.open(`/${p.ticker.replace('.T', '')}`, 'stock-detail')}>
                            {p.ticker.replace('.T', '')}
                          </button>
                        </td>
                        <td className="px-4 py-2.5 max-w-[140px] truncate">{p.stock_name}</td>
                        <td className="px-3 py-2.5 text-center"><RuleBadge rule={p.rule} /></td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{shortDate(p.entry_date)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums hidden md:table-cell">¥{fmt(p.entry_price)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums hidden md:table-cell">¥{fmt(p.current_price)}</td>
                        <td className={`px-4 py-2.5 text-right tabular-nums ${p.unrealized_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtPct(p.unrealized_pct, 2)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{fmtPnl(p.unrealized_yen)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{p.hold_days}/{p.max_hold}</td>
                        <td className={`px-4 py-2.5 ${el.cls}`}>{el.text}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {/* Recommendations */}
        <Panel title={
          <div className="flex items-center justify-between">
            <h2 className="text-base md:text-lg font-semibold text-foreground">推奨銘柄 ({recommendations?.date || '-'}) - {recommendations?.count || 0}件</h2>
            <span className="text-xs text-muted-foreground tabular-nums">{entryChecks.checked.size}/{recommendations?.count || 0} エントリー済み</span>
          </div>
        }
          footer={<div className="flex flex-wrap gap-x-5 gap-y-1">
            <span><RuleBadge rule="B4" /> {ruleLabel('B4')} 乖離{'<'}-8%</span>
            <span><RuleBadge rule="B1" /> {ruleLabel('B1')} prev{'<'}SMA20, now{'>'}SMA20</span>
            <span><RuleBadge rule="B3" /> {ruleLabel('B3')} 乖離0-3%縮小</span>
            <span><RuleBadge rule="B2" /> {ruleLabel('B2')} 乖離-5~0%</span>
          </div>}>
          {recommendations && recommendations.recommendations.length > 0 ? (
            <>
              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-border/20">
                {recSort.sorted.map((r, i) => {
                  const isEntered = entryChecks.checked.has(r.ticker);
                  return (
                  <div key={i} className={`px-4 py-3 ${isEntered ? 'bg-primary/5' : ''}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Checkbox checked={isEntered} onChange={() => entryChecks.toggle(r.ticker)} />
                        <RuleBadge rule={r.rule} />
                        <GradeBadge score={r.rank_score} />
                        <button type="button" className="font-semibold tabular-nums hover:text-primary" onClick={() => window.open(`/${r.ticker.replace('.T', '')}`, 'stock-detail')}>
                          {r.ticker.replace('.T', '')}
                        </button>
                        <span className="truncate max-w-[100px] text-sm">{r.stock_name}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>¥{fmt(r.entry_price_est)} / 証拠金 ¥{fmt(r.margin)} ({r.margin_pct}%)</span>
                      <span className={r.dev_from_sma20 < 0 ? 'text-rose-400' : 'text-emerald-400'}>{fmtPct(r.dev_from_sma20, 2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground/60 mt-0.5">
                      <span>ATR {r.atr10_pct}% / 出来高比 {r.vol_ratio}x</span>
                      <span>期待利益 ¥{fmt(r.expected_profit)} / {r.max_hold}日</span>
                    </div>
                  </div>
                  );
                })}
              </div>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-muted-foreground border-b border-border/30 bg-muted/10">
                    <th className="px-3 py-2.5 text-xs font-medium w-8">
                      <Checkbox checked={(recommendations?.recommendations.length ?? 0) > 0 && recommendations!.recommendations.every(r => entryChecks.checked.has(r.ticker))}
                        onChange={() => entryChecks.toggleAll(recommendations!.recommendations.map(r => r.ticker))} />
                    </th>
                    <SortHeader<Recommendation> label="ルール" field="rule" {...recSort} className="text-center px-3 py-2.5 text-xs font-medium" />
                    <th className="text-left px-4 py-2.5 text-xs font-medium">コード</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium">銘柄</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium">セクター</th>
                    <SortHeader<Recommendation> label="Entry" field="entry_price_est" {...recSort} className="text-right px-4 py-2.5 text-xs font-medium" />
                    <SortHeader<Recommendation> label="乖離%" field="dev_from_sma20" {...recSort} className="text-right px-4 py-2.5 text-xs font-medium" />
                    <SortHeader<Recommendation> label="ATR%" field="atr10_pct" {...recSort} className="text-right px-4 py-2.5 text-xs font-medium" />
                    <SortHeader<Recommendation> label="出来高比" field="vol_ratio" {...recSort} className="text-right px-4 py-2.5 text-xs font-medium" />
                    <SortHeader<Recommendation> label="期待利益" field="expected_profit" {...recSort} className="text-right px-4 py-2.5 text-xs font-medium" />
                    <th className="text-right px-4 py-2.5 text-xs font-medium">証拠金</th>
                    <SortHeader<Recommendation> label="Score" field="rank_score" {...recSort} className="text-right px-4 py-2.5 text-xs font-medium" />
                    <th className="text-right px-4 py-2.5 text-xs font-medium">HOLD</th>
                  </tr></thead>
                  <tbody>
                    {recSort.sorted.map((r, i) => {
                      const isEntered = entryChecks.checked.has(r.ticker);
                      return (
                      <tr key={i} className={`border-b border-border/20 hover:bg-muted/5 ${isEntered ? 'bg-primary/5' : ''}`}>
                        <td className="px-3 py-2.5"><Checkbox checked={isEntered} onChange={() => entryChecks.toggle(r.ticker)} /></td>
                        <td className="px-3 py-2.5 text-center"><RuleBadge rule={r.rule} /></td>
                        <td className="px-4 py-2.5 tabular-nums">
                          <button type="button" className="hover:text-primary font-semibold" onClick={() => window.open(`/${r.ticker.replace('.T', '')}`, 'stock-detail')}>
                            {r.ticker.replace('.T', '')}
                          </button>
                        </td>
                        <td className="px-4 py-2.5 max-w-[120px] truncate">{r.stock_name}</td>
                        <td className="px-4 py-2.5 text-muted-foreground max-w-[100px] truncate">{r.sector}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">¥{fmt(r.entry_price_est)}</td>
                        <td className={`px-4 py-2.5 text-right tabular-nums ${r.dev_from_sma20 < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{fmtPct(r.dev_from_sma20, 2)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{r.atr10_pct}%</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{r.vol_ratio}x</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{fmtPnl(r.expected_profit)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">¥{fmt(r.margin)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <GradeBadge score={r.rank_score} />
                          <span className="ml-1 text-xs tabular-nums text-muted-foreground">{r.rank_score}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{r.max_hold}日</td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : <div className="text-muted-foreground text-sm py-8 text-center">推奨銘柄はありません</div>}
        </Panel>

        {/* Positions */}
        {posData && posData.positions.length > 0 && (
          <Panel title={`保有ポジション - ${posData.positions.length}件 (${posData.as_of || '-'})`}
            footer={<span>合計含み損益: <span className="font-bold tabular-nums ml-1">{fmtPnl(posData.positions.reduce((s, p) => s + p.unrealized_yen, 0))}</span></span>}>
            {/* Mobile */}
            <div className="md:hidden divide-y divide-border/20">
              {posSort.sorted.map((p, i) => (
                <div key={i} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block px-1.5 py-0.5 text-xs rounded leading-none border ${p.direction === '売建' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                        {p.direction || '-'}
                      </span>
                      <button type="button" className="font-semibold tabular-nums hover:text-primary" onClick={() => window.open(`/${p.ticker.replace('.T', '')}`, 'stock-detail')}>
                        {p.ticker.replace('.T', '')}
                      </button>
                      <span className="truncate max-w-[100px] text-sm">{p.stock_name}</span>
                    </div>
                    <span className={`font-bold tabular-nums ${p.unrealized_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtPct(p.unrealized_pct, 2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{p.margin_type} / ¥{fmt(p.entry_price)} → ¥{fmt(p.current_price)}</span>
                    <span className="tabular-nums">{fmtPnl(p.unrealized_yen)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1 text-muted-foreground/60">
                    <span>{p.entry_date || '-'} ({p.hold_days}日)</span>
                    <span className="text-amber-400 font-semibold">Exit: {p.high_20d > 0 ? `¥${fmt(p.high_20d)}` : '-'}</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-muted-foreground border-b border-border/30 bg-muted/10">
                  <th className="text-center px-3 py-2.5 text-xs font-medium">売買</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium">コード</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium">銘柄</th>
                  <th className="text-center px-3 py-2.5 text-xs font-medium">信用区分</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium">建日</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium">保有日数</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium">建単価</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium">現在値</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium">Exit指値</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium">指値差</th>
                  <SortHeader<Position> label="含み%" field="unrealized_pct" {...posSort} className="text-right px-4 py-2.5 text-xs font-medium" />
                  <SortHeader<Position> label="含み損益" field="unrealized_yen" {...posSort} className="text-right px-4 py-2.5 text-xs font-medium" />
                </tr></thead>
                <tbody>
                  {posSort.sorted.map((p, i) => (
                    <tr key={i} className="border-b border-border/20 hover:bg-muted/5">
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-block px-1.5 py-0.5 text-xs rounded leading-none border ${p.direction === '売建' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                          {p.direction || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">
                        <button type="button" className="hover:text-primary font-semibold" onClick={() => window.open(`/${p.ticker.replace('.T', '')}`, 'stock-detail')}>
                          {p.ticker.replace('.T', '')}
                        </button>
                      </td>
                      <td className="px-4 py-2.5 max-w-[120px] truncate">{p.stock_name}</td>
                      <td className="px-3 py-2.5 text-center text-xs text-muted-foreground">{p.margin_type}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-xs text-muted-foreground">{p.entry_date || '-'}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{p.hold_days}日</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">¥{fmt(p.entry_price)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">¥{fmt(p.current_price)}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${p.high_20d > 0 ? 'text-amber-400' : 'text-muted-foreground'}`}>{p.high_20d > 0 ? `¥${fmt(p.high_20d)}` : '-'}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums text-xs ${p.gap_to_high > 0 ? 'text-emerald-400' : p.gap_to_high < 0 ? 'text-rose-400' : 'text-muted-foreground'}`}>{p.gap_to_high !== 0 ? `${p.gap_to_high > 0 ? '+' : ''}¥${fmt(Math.abs(p.gap_to_high))}` : '-'}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums ${p.unrealized_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtPct(p.unrealized_pct, 2)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtPnl(p.unrealized_yen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {/* All Signals (collapsible) */}
        <section className="mb-5">
          <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 shadow-lg shadow-black/5 backdrop-blur-xl overflow-hidden">
            <button onClick={() => setShowAllSignals(!showAllSignals)} className="w-full px-4 md:px-5 py-3 border-b border-border/40 flex items-center gap-3 hover:bg-muted/30 transition-colors">
              {showAllSignals ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              <h2 className="text-base md:text-lg font-semibold text-foreground">全シグナル ({signals?.signal_date || '-'}) - {signals?.count || 0}件</h2>
            </button>
            {showAllSignals && signals && signals.signals.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-muted-foreground border-b border-border/30 bg-muted/10">
                    <SortHeader<Signal> label="ルール" field="rule" {...sigSort} className="text-center px-3 py-2.5 text-xs font-medium" />
                    <th className="text-left px-4 py-2.5 text-xs font-medium">コード</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium">銘柄</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium hidden md:table-cell">セクター</th>
                    <SortHeader<Signal> label="終値" field="close" {...sigSort} className="text-right px-4 py-2.5 text-xs font-medium" />
                    <th className="text-right px-4 py-2.5 text-xs font-medium hidden md:table-cell">SMA20</th>
                    <SortHeader<Signal> label="乖離%" field="dev_from_sma20" {...sigSort} className="text-right px-4 py-2.5 text-xs font-medium" />
                    <th className="text-right px-4 py-2.5 text-xs font-medium hidden md:table-cell">Slope</th>
                  </tr></thead>
                  <tbody>
                    {sigSort.sorted.map((s, i) => (
                      <tr key={i} className="border-b border-border/20 hover:bg-muted/5">
                        <td className="px-3 py-2.5 text-center"><RuleBadge rule={s.rule} /></td>
                        <td className="px-4 py-2.5 tabular-nums">
                          <button type="button" className="hover:text-primary font-semibold" onClick={() => window.open(`/${s.ticker.replace('.T', '')}`, 'stock-detail')}>
                            {s.ticker.replace('.T', '')}
                          </button>
                        </td>
                        <td className="px-4 py-2.5 max-w-[140px] truncate">{s.stock_name}</td>
                        <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">{s.sector}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">¥{fmt(s.close)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground hidden md:table-cell">¥{fmt(s.sma20)}</td>
                        <td className={`px-4 py-2.5 text-right tabular-nums ${s.dev_from_sma20 < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{fmtPct(s.dev_from_sma20, 2)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground hidden md:table-cell">{s.sma20_slope.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {showAllSignals && (!signals || signals.signals.length === 0) && (
              <div className="text-muted-foreground text-sm py-8 text-center">シグナルはありません</div>
            )}
          </div>
        </section>

        {/* Stats */}
        {stats && stats.total_trades > 0 && (
          <>
            {/* Rule Performance */}
            {Object.keys(stats.by_rule).length > 0 && (
              <Panel title={
                <div className="flex items-center justify-between">
                  <h2 className="text-base md:text-lg font-semibold text-foreground">ルール別パフォーマンス ({fmt(stats.total_trades)}トレード)</h2>
                  <div className="flex items-center gap-1 text-xs">
                    <button type="button" onClick={() => setStatsMode('expected')}
                      className={`px-2.5 py-1 rounded-l border ${statsMode === 'expected' ? 'bg-primary/20 text-primary border-primary/40' : 'border-border/40 text-muted-foreground hover:text-foreground'}`}>想定</button>
                    <button type="button" onClick={() => setStatsMode('actual')}
                      className={`px-2.5 py-1 rounded-r border border-l-0 ${statsMode === 'actual' ? 'bg-primary/20 text-primary border-primary/40' : 'border-border/40 text-muted-foreground hover:text-foreground'}`}>実際</button>
                  </div>
                </div>
              }>
                {statsMode === 'actual' && (
                  <div className="px-4 md:px-5 py-2 text-xs text-muted-foreground bg-muted/5 border-b border-border/20">
                    エントリー済みチェック: {entryChecks.checked.size}件 / 決済済みチェック: {exitChecks.checked.size}件で集計
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-muted-foreground border-b border-border/30 bg-muted/10">
                      <th className="text-center px-4 py-2.5 text-xs font-medium">ルール</th>
                      <th className="text-left px-3 py-2.5 text-xs font-medium hidden md:table-cell">名称</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium">件数</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium">勝率</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium">平均%</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium">合計PnL</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium">平均PnL</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium hidden md:table-cell">20日高値</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium hidden md:table-cell">MAX_HOLD</th>
                    </tr></thead>
                    <tbody>
                      {['B4', 'B1', 'B3', 'B2'].map(rule => {
                        const s = stats.by_rule[rule];
                        if (!s || s.count === 0) return null;
                        return (
                          <tr key={rule} className="border-b border-border/20 hover:bg-muted/5">
                            <td className="px-4 py-2.5 text-center"><RuleBadge rule={rule} /></td>
                            <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell">{ruleLabel(rule)}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{fmt(s.count)}</td>
                            <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${s.win_rate >= 55 ? 'text-emerald-400' : s.win_rate >= 45 ? 'text-amber-400' : 'text-rose-400'}`}>{s.win_rate.toFixed(1)}%</td>
                            <td className={`px-4 py-2.5 text-right tabular-nums ${s.avg_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtPct(s.avg_pct, 2)}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{fmtPnl(s.total_pnl)}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{fmtPnl(s.avg_pnl)}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground hidden md:table-cell">{s.exit_20d_high}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground hidden md:table-cell">{s.exit_max_hold}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Panel>
            )}

            {/* Monthly PnL */}
            {stats.monthly.length > 0 && (
              <Panel title="月別パフォーマンス">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-muted-foreground border-b border-border/30 bg-muted/10">
                      <th className="text-left px-4 py-2.5 text-xs font-medium">月</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium">件数</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium">PnL</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium">勝率</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium hidden md:table-cell">累計</th>
                    </tr></thead>
                    <tbody>
                      {(() => {
                        let cumPnl = 0;
                        return stats.monthly.map((m) => {
                          cumPnl += m.pnl;
                          return (
                            <tr key={m.month} className="border-b border-border/20 hover:bg-muted/5">
                              <td className="px-4 py-2.5 tabular-nums font-semibold">{m.month}</td>
                              <td className="px-4 py-2.5 text-right tabular-nums">{m.count}</td>
                              <td className="px-4 py-2.5 text-right tabular-nums">{fmtPnl(m.pnl)}</td>
                              <td className={`px-4 py-2.5 text-right tabular-nums ${m.win_rate >= 55 ? 'text-emerald-400' : m.win_rate >= 45 ? 'text-amber-400' : 'text-rose-400'}`}>{m.win_rate.toFixed(1)}%</td>
                              <td className="px-4 py-2.5 text-right tabular-nums hidden md:table-cell">{fmtPnl(cumPnl)}</td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </Panel>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default function GranvillePage() {
  return <GranvilleContent />;
}
