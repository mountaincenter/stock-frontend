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

// === B4 Entry Types ===
interface B4Candidate {
  ticker: string; stock_name: string; sector: string;
  close: number; entry_price_est: number;
  dev_from_sma20: number; atr_pct: number; ret5d: number;
  max_cost: number; expected_pf: number;
}
interface B4EntryResponse {
  decision: string; vi: number | null;
  cme_gap: number | null; n225_chg: number | null;
  excluded_rules: string[];
  weekday: string | null;
  total_b4_signals: number;
  candidates: B4Candidate[]; selected: B4Candidate[];
  selected_cost: number; budget_remaining: number;
  date: string | null;
}

// === Types (backend dev_granville.py 準拠) ===
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

interface Regime {
  n225_above_sma20: boolean | null; n225_ret20: number | null;
  cme_gap: number | null; vi: number | null;
}
interface LongRecommendation {
  ticker: string; stock_name: string; sector: string; rule: string;
  long_grade: string; hold_days: number; expected_pf: number;
  close: number; entry_price_est: number; sma20: number;
  dev_from_sma20: number; atr10_pct: number;
}
interface LongRecommendationsResponse {
  long_recommendations: LongRecommendation[]; count: number;
  date: string | null; regime: Regime;
}

interface RuleStats {
  count: number; win_rate: number; total_pnl: number; avg_pnl: number;
  avg_pct: number; exit_high_update: number; exit_max_hold: number;
}
interface MonthlyStats { month: string; count: number; pnl: number; win_rate: number; }
interface StatsResponse { by_rule: Record<string, RuleStats>; monthly: MonthlyStats[]; total_trades: number; total_pnl?: number; win_rate?: number; pf?: number; rule_filter?: string | null; }

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

// === Helpers ===
const fmt = (v: number | null | undefined) => (v ?? 0).toLocaleString('ja-JP');
const fmtPnl = (v: number | null | undefined) => { const n = v ?? 0; return <span className={n >= 0 ? 'text-price-up' : 'text-price-down'}>{n >= 0 ? '+' : ''}{fmt(n)}円</span>; };
const fmtPct = (v: number | null | undefined, d = 1) => { const n = v ?? 0; return `${n >= 0 ? '+' : ''}${n.toFixed(d)}%`; };
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
  if (t === 'high_update') return { text: '直近高値更新→翌寄付', cls: 'text-price-up' };
  if (t === '20d_high') return { text: '直近高値更新→翌寄付', cls: 'text-price-up' };
  if (t === 'max_hold') return { text: 'MAX_HOLD→翌寄付', cls: 'text-amber-400' };
  return { text: t || '保有中', cls: 'text-muted-foreground' };
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
  <div className="rounded-xl border border-border bg-card px-4 py-3">
    <div className="text-muted-foreground text-sm mb-1">{label}</div>
    <div className="text-xl sm:text-2xl font-bold text-right tabular-nums">{children}</div>
    {sub && <div className="text-xs text-right mt-1 text-muted-foreground tabular-nums">{sub}</div>}
  </div>
);

const Panel = ({ title, border, children, footer }: { title: React.ReactNode; border?: string; children: React.ReactNode; footer?: React.ReactNode }) => (
  <section className="mb-5">
    <div className={`rounded-xl border ${border || 'border-border'} bg-card overflow-hidden`}>
      <div className={`px-4 md:px-5 py-3 border-b ${border || 'border-b-border/40'}`}>
        {typeof title === 'string' ? <h2 className="text-base md:text-lg font-semibold text-foreground">{title}</h2> : title}
      </div>
      {children}
      {footer && <div className="px-4 md:px-5 py-2.5 border-t border-border/40 text-xs text-muted-foreground">{footer}</div>}
    </div>
  </section>
);

function GranvilleContent() {
  const [signals, setSignals] = useState<SignalsResponse | null>(null);
  const [posData, setPosData] = useState<PositionsResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [b4Entry, setB4Entry] = useState<B4EntryResponse | null>(null);
  const [longRecs, setLongRecs] = useState<LongRecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllSignals, setShowAllSignals] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/dev/granville/signals`).then(r => r.json()).catch(() => ({ signals: [], count: 0, signal_date: null })),
      fetch(`${API_BASE}/api/dev/granville/positions`).then(r => r.json()).catch(() => ({ positions: [], exits: [], as_of: null })),
      fetch(`${API_BASE}/api/dev/granville/stats?rule=B4`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/api/dev/granville/b4_entry`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/api/dev/granville/long-recommendations`).then(r => r.ok ? r.json() : { long_recommendations: [], count: 0, date: null, regime: null }).catch(() => ({ long_recommendations: [], count: 0, date: null, regime: null })),
    ]).then(([sig, pos, sta, b4, lr]) => {
      setSignals(sig); setPosData(pos); setStats(sta); setB4Entry(b4); setLongRecs(lr); setLoading(false);
    });
  }, []);

  // チェック状態（localStorage永続化）
  const exitChecks = useCheckedState('exit', posData?.as_of ?? null);

  // Sortable hooks
  const sigSort = useSortable<Signal>(signals?.signals || []);

  if (loading) {
    return (
      <main className="relative min-h-screen">
        <div className="fixed inset-0 -z-10 bg-background" />
        <div className="max-w-[1600px] mx-auto px-4 py-4 leading-[1.8] tracking-[0.02em]">
          <div className="h-6 w-64 bg-muted/50 rounded mb-4 animate-pulse" />
          {[...Array(3)].map((_, i) => <div key={i} className="rounded-2xl border border-border/40 bg-card/50 h-48 mb-5 animate-pulse" />)}
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen">
      <div className="fixed inset-0 -z-10 bg-background" />

      <div className="max-w-[1600px] mx-auto px-4 py-4 leading-[1.8] tracking-[0.02em]">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4 pb-3 border-b border-border/30">
          <div>
            <h1 className="text-xl font-bold text-foreground">Granville B1-B4</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              B4(-15%) / 急騰フィルター / MH15 / 翌寄付Exit
              {b4Entry?.date ? ` (${b4Entry.date})` : ''}
            </p>
          </div>
          <DevNavLinks />
        </header>

        {/* B1-B4 エントリー判定 */}
        {(() => {
          const regime = longRecs?.regime;
          const lrCount = longRecs?.count ?? 0;
          const gradeLabel = (g: string) => g === 'H1' ? 'VI≥30 反発' : g === 'H2' ? '上昇+CME静' : g === 'H3' ? '急落後B1' : g;
          const gradeCls = (g: string) => g === 'H1' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
            : g === 'H2' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            : g === 'B4' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
            : 'bg-amber-500/20 text-amber-400 border-amber-500/30';
          const b4Decision = b4Entry?.decision;
          const hasB4 = b4Decision === 'strong_entry' || b4Decision === 'entry' || b4Decision === 'consider';
          const totalEntries = lrCount + (b4Entry?.selected?.length ?? 0);
          const borderColor = totalEntries > 0 ? 'border-emerald-500/30' : hasB4 ? 'border-amber-500/30' : undefined;

          return (
            <Panel title={
              <div className="flex items-center justify-between">
                <h2 className="text-base md:text-lg font-semibold">
                  B1-B4 エントリー判定
                  {b4Entry?.date && <span className="ml-2 text-sm font-normal text-muted-foreground">({b4Entry.date})</span>}
                </h2>
                {totalEntries > 0
                  ? <span className="px-3 py-1 rounded-full text-sm font-bold border text-emerald-400 bg-emerald-500/10 border-emerald-500/30">{totalEntries}件</span>
                  : <span className="px-3 py-1 rounded-full text-sm border text-muted-foreground bg-muted/10 border-border">候補なし</span>
                }
              </div>
            } border={borderColor}>
              {/* 市場環境 — regime + b4Entry統合 */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 px-4 py-3">
                <div className="rounded-lg border border-border px-3 py-2">
                  <div className="text-xs text-muted-foreground">N225 vs SMA20</div>
                  <div className={`text-lg font-bold ${regime?.n225_above_sma20 ? 'text-price-up' : regime?.n225_above_sma20 === false ? 'text-price-down' : 'text-muted-foreground'}`}>
                    {regime?.n225_above_sma20 != null ? (regime.n225_above_sma20 ? '上昇' : '下降') : '-'}
                  </div>
                </div>
                <div className="rounded-lg border border-border px-3 py-2">
                  <div className="text-xs text-muted-foreground">N225 ret20</div>
                  <div className={`text-lg font-bold tabular-nums ${(regime?.n225_ret20 ?? 0) >= 0 ? 'text-price-up' : 'text-price-down'}`}>
                    {regime?.n225_ret20 != null ? `${regime.n225_ret20 >= 0 ? '+' : ''}${regime.n225_ret20.toFixed(1)}%` : '-'}
                  </div>
                </div>
                <div className="rounded-lg border border-border px-3 py-2">
                  <div className="text-xs text-muted-foreground">CME gap</div>
                  <div className={`text-lg font-bold tabular-nums ${regime?.cme_gap != null || b4Entry?.cme_gap != null ? (Math.abs((regime?.cme_gap ?? b4Entry?.cme_gap ?? 0)) <= 0.5 ? 'text-price-up' : 'text-muted-foreground') : 'text-muted-foreground'}`}>
                    {(() => { const v = regime?.cme_gap ?? b4Entry?.cme_gap; return v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '-'; })()}
                    {(() => { const v = regime?.cme_gap ?? b4Entry?.cme_gap; return v != null && Math.abs(v) <= 0.5 ? <span className="text-[10px] ml-0.5">(flat)</span> : null; })()}
                  </div>
                </div>
                <div className="rounded-lg border border-border px-3 py-2">
                  <div className="text-xs text-muted-foreground">日経VI</div>
                  <div className={`text-lg font-bold tabular-nums ${(regime?.vi ?? b4Entry?.vi ?? 0) >= 40 ? 'text-price-up' : (regime?.vi ?? b4Entry?.vi ?? 0) >= 30 ? 'text-price-down font-semibold' : (regime?.vi ?? b4Entry?.vi ?? 0) >= 25 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                    {(() => { const v = regime?.vi ?? b4Entry?.vi; return v != null ? v.toFixed(1) : '-'; })()}
                  </div>
                </div>
                <div className="rounded-lg border border-border px-3 py-2">
                  <div className="text-xs text-muted-foreground">N225 前日比</div>
                  <div className={`text-lg font-bold tabular-nums ${b4Entry?.n225_chg != null ? (b4Entry.n225_chg >= 0 ? 'text-price-up' : 'text-price-down') : 'text-muted-foreground'}`}>
                    {b4Entry?.n225_chg != null ? `${b4Entry.n225_chg > 0 ? '+' : ''}${b4Entry.n225_chg.toFixed(2)}%` : '-'}
                  </div>
                </div>
              </div>

              {/* フィルター判定バッジ */}
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {regime?.vi != null && regime.vi >= 30 && <span className="px-1.5 py-0.5 text-xs rounded border bg-rose-500/20 text-rose-400 border-rose-500/30">H1可</span>}
                {regime?.n225_above_sma20 && regime?.cme_gap != null && Math.abs(regime.cme_gap) <= 0.5 && <span className="px-1.5 py-0.5 text-xs rounded border bg-emerald-500/20 text-emerald-400 border-emerald-500/30">H2可</span>}
                {regime?.n225_ret20 != null && regime.n225_ret20 < -5 && <span className="px-1.5 py-0.5 text-xs rounded border bg-amber-500/20 text-amber-400 border-amber-500/30">H3可</span>}
                {b4Entry && b4Entry.total_b4_signals > 0 && <span className="px-1.5 py-0.5 text-xs rounded border bg-blue-500/20 text-blue-400 border-blue-500/30">B4 {b4Entry.total_b4_signals}件</span>}
                {b4Entry?.excluded_rules && b4Entry.excluded_rules.length > 0 && <span className="px-1.5 py-0.5 text-xs rounded border bg-rose-500/10 text-rose-400 border-rose-500/30">除外: {b4Entry.excluded_rules.join(', ')}</span>}
              </div>

              {/* シグナル・フィルター説明（折りたたみ） */}
              <details className="px-4 pb-3">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground/70 select-none">シグナル・フィルター定義</summary>
                <div className="mt-2 space-y-3 text-xs leading-relaxed">
                  <div>
                    <div className="font-medium text-foreground/80 mb-1">Granville買いシグナル</div>
                    <table className="w-full border-collapse">
                      <tbody className="text-muted-foreground">
                        <tr className="border-b border-border"><td className="py-1 pr-3 font-medium text-foreground/70 w-10">B1</td><td className="py-1">MA上抜けブレイク — 前日SMA20下→当日上抜け、SMA上昇中</td></tr>
                        <tr className="border-b border-border"><td className="py-1 pr-3 font-medium text-foreground/70">B2</td><td className="py-1">上昇中の押し目 — SMA上昇中、乖離-5~0%、陽線、SMA下</td></tr>
                        <tr className="border-b border-border"><td className="py-1 pr-3 font-medium text-foreground/70">B3</td><td className="py-1">MA接近で反発 — SMA上昇中+上、乖離0~3%で縮小中、陽線</td></tr>
                        <tr><td className="py-1 pr-3 font-medium text-foreground/70">B4</td><td className="py-1">暴落リバウンド — SMA20乖離 &lt; -15%、陽線、急騰フィルター付き</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <div className="font-medium text-foreground/80 mb-1">ロングフィルター（B1-B3に適用）</div>
                    <table className="w-full border-collapse">
                      <tbody className="text-muted-foreground">
                        <tr className="border-b border-border"><td className="py-1 pr-3 w-10"><span className="px-1 py-0.5 rounded border bg-rose-500/20 text-rose-400 border-rose-500/30">H1</span></td><td className="py-1">VI&ge;30 + B1 &rarr; 9日保有 — 恐怖局面でのMA上抜け反発</td><td className="py-1 text-right tabular-nums">PF 2.13</td></tr>
                        <tr className="border-b border-border"><td className="py-1 pr-3"><span className="px-1 py-0.5 rounded border bg-emerald-500/20 text-emerald-400 border-emerald-500/30">H2</span></td><td className="py-1">N225&gt;SMA20 + CME flat(&plusmn;0.5%) + B3 &rarr; 9日保有 — 静かな上昇トレンドの押し目</td><td className="py-1 text-right tabular-nums">PF 2.67</td></tr>
                        <tr><td className="py-1 pr-3"><span className="px-1 py-0.5 rounded border bg-amber-500/20 text-amber-400 border-amber-500/30">H3</span></td><td className="py-1">N225 ret20&lt;-5% + B1 &rarr; 4日保有 — 急落後のブレイク反発</td><td className="py-1 text-right tabular-nums">PF 2.38</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <div className="font-medium text-foreground/80 mb-1">B4エントリー条件</div>
                    <p className="text-muted-foreground">VI&ge;25で発動。乖離深い順に資金枠内で選定。出口: 直近高値更新&rarr;翌寄付 or MH15。PF 2.79（全期間）</p>
                    <p className="text-muted-foreground mt-0.5">除外: VI30-40&times;CME膠着 / VI30-40&times;GU / N225&lt;-3%</p>
                  </div>
                  <div>
                    <div className="font-medium text-foreground/80 mb-1">市場環境指標</div>
                    <table className="w-full border-collapse">
                      <tbody className="text-muted-foreground">
                        <tr className="border-b border-border"><td className="py-1 pr-3 font-medium text-foreground/70 whitespace-nowrap">N225 vs SMA20</td><td className="py-1">日経平均がSMA20の上(上昇)か下(下降)か</td></tr>
                        <tr className="border-b border-border"><td className="py-1 pr-3 font-medium text-foreground/70 whitespace-nowrap">N225 ret20</td><td className="py-1">過去20営業日リターン（H3の-5%判定に使用）</td></tr>
                        <tr className="border-b border-border"><td className="py-1 pr-3 font-medium text-foreground/70 whitespace-nowrap">CME gap</td><td className="py-1">CME日経先物(NKD)終値 vs N225前日終値の乖離率</td></tr>
                        <tr className="border-b border-border"><td className="py-1 pr-3 font-medium text-foreground/70 whitespace-nowrap">日経VI</td><td className="py-1">恐怖指数。&ge;30でH1発動、&ge;25でB4発動</td></tr>
                        <tr><td className="py-1 pr-3 font-medium text-foreground/70 whitespace-nowrap">N225 前日比</td><td className="py-1">日経平均の前日終値比（B4除外の-3%判定に使用）</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </details>

              {/* 統合テーブル（グレード優先） */}
              {(() => {
                const gradeOrder: Record<string, number> = { B4: 0, H2: 1, H3: 2, H1: 3 };
                type UnifiedRow = { ticker: string; stock_name: string; rule: string; grade: string; close: number; dev_from_sma20: number; hold_days: number; max_cost?: number; };
                const rows: UnifiedRow[] = [];
                if (longRecs) {
                  for (const r of longRecs.long_recommendations) {
                    rows.push({ ticker: r.ticker, stock_name: r.stock_name, rule: r.rule, grade: r.long_grade, close: r.close, dev_from_sma20: r.dev_from_sma20, hold_days: r.hold_days });
                  }
                }
                if (b4Entry?.selected) {
                  for (const c of b4Entry.selected) {
                    rows.push({ ticker: c.ticker, stock_name: c.stock_name, rule: 'B4', grade: 'B4', close: c.close, dev_from_sma20: c.dev_from_sma20, hold_days: 15, max_cost: c.max_cost });
                  }
                }
                rows.sort((a, b) => (gradeOrder[a.grade] ?? 99) - (gradeOrder[b.grade] ?? 99));

                if (rows.length === 0) return (
                  <div className="px-4 py-4 text-center text-muted-foreground text-sm border-t border-border">
                    {b4Decision === 'excluded' ? 'B4除外ルール該当' :
                     b4Decision === 'wait' ? `B4待機 (VI=${b4Entry?.vi} < 25)` :
                     lrCount === 0 && (!b4Entry || b4Entry.total_b4_signals === 0) ? 'B1-B3フィルター不成立 / B4シグナルなし' :
                     'エントリー候補なし'}
                  </div>
                );

                return (
                  <div className="overflow-x-auto border-t border-border/20">
                    <table className="w-full text-sm md:text-base">
                      <thead><tr className="text-foreground border-b border-border/40 bg-muted/30">
                        <th className="text-center px-2 py-2 text-xs font-medium whitespace-nowrap">ルール</th>
                        <th className="text-center px-2 py-2 text-xs font-medium whitespace-nowrap">グレード</th>
                        <th className="text-left px-2 py-2 text-xs font-medium whitespace-nowrap">コード</th>
                        <th className="text-left px-2 py-2 text-xs font-medium whitespace-nowrap">銘柄</th>
                        <th className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap">終値</th>
                        <th className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap">SMA20乖離</th>
                        <th className="text-center px-2 py-2 text-xs font-medium whitespace-nowrap">保有</th>
                        {rows.some(r => r.max_cost) && <th className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap">取引上限</th>}
                      </tr></thead>
                      <tbody className="divide-y divide-border/30">
                        {rows.map((r) => (
                          <tr key={`${r.ticker}-${r.rule}`} className="hover:bg-muted/10">
                            <td className="px-2 py-2.5 text-center"><RuleBadge rule={r.rule} /></td>
                            <td className="px-2 py-2.5 text-center">
                              <span className={`inline-block px-1.5 py-0.5 text-xs rounded leading-none border ${gradeCls(r.grade)}`}>
                                {r.grade === 'B4' ? 'B4' : `${r.grade} ${gradeLabel(r.grade)}`}
                              </span>
                            </td>
                            <td className="px-2 py-2.5 tabular-nums font-semibold">
                              <a href={`/${r.ticker.replace('.T', '')}`} className="text-primary hover:underline">{r.ticker.replace('.T', '')}</a>
                            </td>
                            <td className="px-2 py-2.5 text-muted-foreground max-w-[160px] truncate">{r.stock_name}</td>
                            <td className="px-2 py-2.5 text-right tabular-nums">¥{r.close.toLocaleString()}</td>
                            <td className="px-2 py-2.5 text-right tabular-nums">{fmtPct(r.dev_from_sma20, 1)}</td>
                            <td className="px-2 py-2.5 text-center">{r.hold_days}d</td>
                            {rows.some(x => x.max_cost) && <td className="px-2 py-2.5 text-right tabular-nums">{r.max_cost ? fmt(r.max_cost) : '-'}</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </Panel>
          );
        })()}

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
                <thead><tr className="text-muted-foreground border-b border-border bg-muted/10">
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
                      <tr key={i} className={`border-b border-border hover:bg-muted/5 ${isExited ? 'opacity-50' : ''}`}>
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
                        <td className={`px-4 py-2.5 text-right tabular-nums ${p.unrealized_pct >= 0 ? 'text-price-up' : 'text-price-down'}`}>{fmtPct(p.unrealized_pct, 2)}</td>
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

        {/* All Signals (collapsible) */}
        <section className="mb-5">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <button onClick={() => setShowAllSignals(!showAllSignals)} className="w-full px-4 md:px-5 py-3 border-b border-border flex items-center gap-3 hover:bg-muted/30 transition-colors">
              {showAllSignals ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              <h2 className="text-base md:text-lg font-semibold text-foreground">全シグナル ({signals?.signal_date || '-'}) - {signals?.count || 0}件</h2>
            </button>
            {showAllSignals && signals && signals.signals.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm md:text-base">
                  <thead><tr className="text-muted-foreground border-b border-border bg-muted/10">
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
                      <tr key={i} className="border-b border-border hover:bg-muted/5">
                        <td className="px-3 py-2.5 text-center"><RuleBadge rule={s.rule} /></td>
                        <td className="px-4 py-2.5 tabular-nums">
                          <button type="button" className="hover:text-primary font-semibold" onClick={() => window.open(`/${s.ticker.replace('.T', '')}`, 'stock-detail')}>
                            {s.ticker.replace('.T', '')}
                          </button>
                        </td>
                        <td className="px-4 py-2.5 max-w-[140px] truncate">{s.stock_name}</td>
                        <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">{s.sector}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">¥{fmt(s.close)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground hidden md:table-cell">¥{fmt(Math.round(s.sma20))}</td>
                        <td className={`px-4 py-2.5 text-right tabular-nums ${s.dev_from_sma20 < 0 ? 'text-price-down' : 'text-price-up'}`}>{fmtPct(s.dev_from_sma20, 2)}</td>
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
            {/* Monthly PnL */}
            {stats.monthly.length > 0 && (
              <Panel title={
                <div className="flex items-center justify-between">
                  <h2 className="text-base md:text-lg font-semibold">B4(-15%) 月別パフォーマンス</h2>
                  {stats.total_pnl != null && (
                    <div className="flex gap-4 text-sm tabular-nums">
                      <span>{stats.total_trades}件</span>
                      <span>WR {stats.win_rate?.toFixed(0)}%</span>
                      <span>PF {stats.pf?.toFixed(2)}</span>
                      <span className={stats.total_pnl >= 0 ? 'text-price-up' : 'text-price-down'}>
                        {stats.total_pnl >= 0 ? '+' : ''}{fmt(stats.total_pnl)}円
                      </span>
                    </div>
                  )}
                </div>
              }>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm md:text-base">
                    <thead><tr className="text-muted-foreground border-b border-border bg-muted/10">
                      <th className="text-left px-4 py-2.5 text-xs font-medium">月</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium">件数</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium">PnL</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium">勝率</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium hidden md:table-cell">累計</th>
                    </tr></thead>
                    <tbody>
                      {(() => {
                        // 累計は古い順で計算、表示は新しい順
                        const withCum: { m: MonthlyStats; cum: number }[] = [];
                        let cumPnl = 0;
                        for (const m of stats.monthly) {
                          cumPnl += m.pnl;
                          withCum.push({ m, cum: cumPnl });
                        }
                        return withCum.reverse().map(({ m, cum }) => (
                            <tr key={m.month} className="border-b border-border hover:bg-muted/5">
                              <td className="px-4 py-2.5 tabular-nums font-semibold">{m.month}</td>
                              <td className="px-4 py-2.5 text-right tabular-nums">{m.count}</td>
                              <td className="px-4 py-2.5 text-right tabular-nums">{fmtPnl(m.pnl)}</td>
                              <td className={`px-4 py-2.5 text-right tabular-nums ${m.win_rate >= 55 ? 'text-price-up' : m.win_rate >= 45 ? 'text-amber-400' : 'text-price-down'}`}>{m.win_rate.toFixed(1)}%</td>
                              <td className="px-4 py-2.5 text-right tabular-nums hidden md:table-cell">{fmtPnl(cum)}</td>
                            </tr>
                        ));
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
