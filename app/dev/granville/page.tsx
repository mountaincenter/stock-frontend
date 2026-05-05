'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { DevNavLinks } from '../../../components/dev';

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

const Checkbox = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button type="button" onClick={onChange}
    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${checked ? 'bg-primary border-primary text-primary-foreground' : 'border-border/60 hover:border-primary/50'}`}>
    {checked && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
  </button>
);

// === Types ===
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
interface MonthlyStats { month: string; count: number; pnl: number; win_rate: number; }
interface YearSummary { year: number; n: number; wins: number; wr: number; pnl: number; total_ret: number; pf: number | null; }
interface MaxDD { amount: number; pct: number; }
interface B4Trade { ticker: string; stock_name: string; entry_date: string; exit_date: string; entry_price: number; exit_price: number; ret_pct: number; pnl_yen: number; exit_type: string; }
interface StatsResponse { by_rule: Record<string, unknown>; monthly: MonthlyStats[]; trades?: B4Trade[]; total_trades: number; total_pnl?: number; win_rate?: number; pf?: number; max_dd?: MaxDD; year_summary?: YearSummary[]; }

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

// === Helpers ===
const fmt = (v: number | null | undefined) => (v ?? 0).toLocaleString('ja-JP');
const fmtPnl = (v: number | null | undefined) => { const n = v ?? 0; return <span className={n >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{n >= 0 ? '+' : ''}{fmt(n)}円</span>; };
const fmtPct = (v: number | null | undefined, d = 1) => { const n = v ?? 0; return `${n >= 0 ? '+' : ''}${n.toFixed(d)}%`; };
const shortDate = (d: string) => { const m = d.match(/\d{4}-(\d{2})-(\d{2})/); return m ? `${m[1]}/${m[2]}` : d; };

export default function GranvillePage() {
  const [b4Entry, setB4Entry] = useState<B4EntryResponse | null>(null);
  const [posData, setPosData] = useState<PositionsResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const toggleYear = (y: number) => setExpandedYears(prev => { const next = new Set(prev); next.has(y) ? next.delete(y) : next.add(y); return next; });
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const toggleMonth = (m: string) => setExpandedMonths(prev => { const next = new Set(prev); next.has(m) ? next.delete(m) : next.add(m); return next; });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/dev/granville/b4_entry`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/api/dev/granville/positions`).then(r => r.json()).catch(() => ({ positions: [], exits: [], as_of: null })),
      fetch(`${API_BASE}/api/dev/granville/stats?rule=B4`).then(r => r.json()).catch(() => null),
    ]).then(([b4, pos, sta]) => {
      setB4Entry(b4);
      setPosData(pos);
      setStats(sta);
      setLoading(false);
    });
  }, []);

  const exitChecks = useCheckedState('exit', posData?.as_of ?? null);

  // B4ポジションのみ
  const b4Positions = posData?.positions.filter(p => p.rule === 'B4') || [];
  const b4Exits = posData?.exits.filter(p => p.rule === 'B4') || [];

  if (loading) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="h-6 w-48 bg-muted/50 rounded mb-4 animate-pulse" />
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[...Array(3)].map((_, i) => <div key={i} className="rounded-xl border border-border/40 bg-card/50 p-5 h-20 animate-pulse" />)}
          </div>
        </div>
      </main>
    );
  }

  const decision = b4Entry?.decision;
  const isEntry = decision === 'strong_entry' || decision === 'entry' || decision === 'consider';
  const isExcluded = decision === 'excluded';

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Header */}
        <header className="flex items-center justify-between mb-4 pb-3 border-b border-border/30">
          <div>
            <h1 className="text-xl font-bold">Granville B4 — 暴落反発</h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              SMA20乖離 &lt; -15% / VI≥25 / MH15 / 直近高値更新→翌寄付Exit
              {b4Entry?.date && ` (${b4Entry.date})`}
            </p>
          </div>
          <DevNavLinks />
        </header>

        {/* Market Conditions */}
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-5">
          <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
            <p className="text-sm text-muted-foreground mb-1">日経VI</p>
            <p className={`text-xl font-bold tabular-nums ${(b4Entry?.vi ?? 0) >= 40 ? 'text-emerald-400' : (b4Entry?.vi ?? 0) >= 30 ? 'text-rose-400' : (b4Entry?.vi ?? 0) >= 25 ? 'text-amber-400' : 'text-muted-foreground'}`}>
              {b4Entry?.vi != null ? b4Entry.vi.toFixed(1) : '—'}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
            <p className="text-sm text-muted-foreground mb-1">CME gap</p>
            <p className={`text-xl font-bold tabular-nums ${(b4Entry?.cme_gap ?? 0) < 0 ? 'text-rose-400' : 'text-muted-foreground'}`}>
              {b4Entry?.cme_gap != null ? `${b4Entry.cme_gap >= 0 ? '+' : ''}${b4Entry.cme_gap.toFixed(2)}%` : '—'}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
            <p className="text-sm text-muted-foreground mb-1">N225 前日比</p>
            <p className={`text-xl font-bold tabular-nums ${(b4Entry?.n225_chg ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {b4Entry?.n225_chg != null ? `${b4Entry.n225_chg > 0 ? '+' : ''}${b4Entry.n225_chg.toFixed(2)}%` : '—'}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
            <p className="text-sm text-muted-foreground mb-1">B4シグナル</p>
            <p className="text-xl font-bold tabular-nums">{b4Entry?.total_b4_signals ?? 0}件</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
            <p className="text-sm text-muted-foreground mb-1">判定</p>
            <p className={`text-xl font-bold ${isEntry ? 'text-emerald-400' : isExcluded ? 'text-rose-400' : 'text-muted-foreground'}`}>
              {decision === 'strong_entry' ? 'STRONG' : decision === 'entry' ? 'ENTRY' : decision === 'consider' ? 'CONSIDER' : decision === 'excluded' ? 'EXCLUDED' : 'WAIT'}
            </p>
          </div>
        </div>

        {/* Excluded Rules */}
        {b4Entry?.excluded_rules && b4Entry.excluded_rules.length > 0 && (
          <div className="mb-4 px-4 py-2 rounded-lg border border-rose-500/30 bg-rose-500/5 text-rose-400 text-sm">
            除外: {b4Entry.excluded_rules.join(', ')}
          </div>
        )}

        {/* B4 Selected Candidates */}
        <section className="mb-5 rounded-xl border border-border/40 bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
            <h2 className="text-base font-semibold">B4 選定候補</h2>
            {b4Entry?.selected && b4Entry.selected.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-sm font-bold border text-emerald-400 bg-emerald-500/10 border-emerald-500/30">{b4Entry.selected.length}件</span>
            )}
          </div>
          {b4Entry?.selected && b4Entry.selected.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border/30">
                    <th className="px-4 py-2 text-left">銘柄</th>
                    <th className="px-3 py-2 text-left hidden md:table-cell">セクター</th>
                    <th className="px-3 py-2 text-right">終値</th>
                    <th className="px-3 py-2 text-right">SMA20乖離</th>
                    <th className="px-3 py-2 text-right hidden md:table-cell">ATR%</th>
                    <th className="px-3 py-2 text-right">取引上限</th>
                  </tr>
                </thead>
                <tbody>
                  {b4Entry.selected.map((c, i) => (
                    <tr key={c.ticker} className="border-b border-border/20 hover:bg-muted/30">
                      <td className="px-4 py-2.5">
                        <span className="font-semibold tabular-nums">{c.ticker.replace('.T', '')}</span>
                        <span className="ml-1.5 text-muted-foreground text-xs">{c.stock_name}</span>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs hidden md:table-cell">{c.sector}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">¥{fmt(c.close)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-rose-400">{fmtPct(c.dev_from_sma20, 1)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground hidden md:table-cell">{c.atr_pct.toFixed(1)}%</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">¥{fmt(c.max_cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-muted-foreground text-sm">
              {isExcluded ? '除外ルール該当 — エントリーなし' :
               decision === 'wait' ? `待機 (VI=${b4Entry?.vi?.toFixed(1)} < 25)` :
               b4Entry?.total_b4_signals === 0 ? 'B4シグナルなし（SMA20 -15%乖離銘柄なし）' :
               '選定候補なし'}
            </div>
          )}
          {b4Entry?.selected && b4Entry.selected.length > 0 && (
            <div className="px-4 py-2 border-t border-border/20 text-xs text-muted-foreground flex justify-between">
              <span>取引合計: ¥{fmt(b4Entry.selected_cost)}</span>
              <span>残余力: ¥{fmt(b4Entry.budget_remaining)}</span>
            </div>
          )}
        </section>

        {/* Exit Candidates */}
        {b4Exits.length > 0 && (
          <section className="mb-5 rounded-xl border border-amber-500/40 bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-amber-500/30 flex items-center justify-between">
              <h2 className="text-base font-semibold text-amber-400">Exit候補 — {b4Exits.length}件（翌朝寄付で決済）</h2>
              <span className="text-xs text-muted-foreground tabular-nums">{exitChecks.checked.size}/{b4Exits.length} 決済済み</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-muted-foreground border-b border-border/30">
                  <th className="px-3 py-2 w-8">
                    <Checkbox checked={b4Exits.every(p => exitChecks.checked.has(p.ticker))}
                      onChange={() => exitChecks.toggleAll(b4Exits.map(p => p.ticker))} />
                  </th>
                  <th className="px-3 py-2 text-left">銘柄</th>
                  <th className="px-3 py-2 text-right">IN日</th>
                  <th className="px-3 py-2 text-right hidden md:table-cell">IN価格</th>
                  <th className="px-3 py-2 text-right hidden md:table-cell">現在値</th>
                  <th className="px-3 py-2 text-right">損益%</th>
                  <th className="px-3 py-2 text-right">損益</th>
                  <th className="px-3 py-2 text-right">日数</th>
                  <th className="px-3 py-2 text-left">理由</th>
                </tr></thead>
                <tbody>
                  {b4Exits.map((p, i) => {
                    const isExited = exitChecks.checked.has(p.ticker);
                    const reason = p.exit_type === 'high_update' || p.exit_type === '20d_high' ? '高値更新' : 'MH到達';
                    return (
                      <tr key={i} className={`border-b border-border/20 ${isExited ? 'opacity-40' : ''}`}>
                        <td className="px-3 py-2"><Checkbox checked={isExited} onChange={() => exitChecks.toggle(p.ticker)} /></td>
                        <td className="px-3 py-2"><span className="font-semibold tabular-nums">{p.ticker.replace('.T', '')}</span> <span className="text-xs text-muted-foreground">{p.stock_name}</span></td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{shortDate(p.entry_date)}</td>
                        <td className="px-3 py-2 text-right tabular-nums hidden md:table-cell">¥{fmt(p.entry_price)}</td>
                        <td className="px-3 py-2 text-right tabular-nums hidden md:table-cell">¥{fmt(p.current_price)}</td>
                        <td className={`px-3 py-2 text-right tabular-nums ${p.unrealized_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtPct(p.unrealized_pct, 2)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtPnl(p.unrealized_yen)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{p.hold_days}/{p.max_hold}</td>
                        <td className={`px-3 py-2 ${reason === '高値更新' ? 'text-emerald-400' : 'text-amber-400'}`}>{reason}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Active Positions */}
        {b4Positions.length > 0 && (
          <section className="mb-5 rounded-xl border border-border/40 bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
              <h2 className="text-base font-semibold">保有ポジション — {b4Positions.length}件</h2>
              <span className="text-sm tabular-nums">{fmtPnl(b4Positions.reduce((s, p) => s + p.unrealized_yen, 0))}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-muted-foreground border-b border-border/30">
                  <th className="px-3 py-2 text-left">銘柄</th>
                  <th className="px-3 py-2 text-right">IN日</th>
                  <th className="px-3 py-2 text-right">IN価格</th>
                  <th className="px-3 py-2 text-right">現在値</th>
                  <th className="px-3 py-2 text-right">発火ライン</th>
                  <th className="px-3 py-2 text-right">損益%</th>
                  <th className="px-3 py-2 text-right">損益</th>
                  <th className="px-3 py-2 text-right">日数</th>
                </tr></thead>
                <tbody>
                  {b4Positions.map((p, i) => (
                    <tr key={i} className="border-b border-border/20 hover:bg-muted/30">
                      <td className="px-3 py-2.5"><span className="font-semibold tabular-nums">{p.ticker.replace('.T', '')}</span> <span className="text-xs text-muted-foreground">{p.stock_name}</span></td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{shortDate(p.entry_date)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">¥{fmt(p.entry_price)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">¥{fmt(p.current_price)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-amber-400 font-semibold">{p.high_20d > 0 ? `¥${fmt(Math.round(p.high_20d))}` : '-'}</td>
                      <td className={`px-3 py-2.5 text-right tabular-nums ${p.unrealized_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtPct(p.unrealized_pct, 2)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{fmtPnl(p.unrealized_yen)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{p.hold_days}/{p.max_hold || 15}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* B4 Performance Summary */}
        {stats && stats.total_trades > 0 && (
          <section className="mb-5 rounded-xl border border-border/40 bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border/30">
              <h2 className="text-base font-semibold">B4 パフォーマンス</h2>
            </div>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 px-4 py-3">
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Trades</div>
                <div className="text-lg font-bold tabular-nums">{stats.total_trades}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">WR</div>
                <div className="text-lg font-bold tabular-nums">{stats.win_rate?.toFixed(0)}%</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">PF</div>
                <div className="text-lg font-bold tabular-nums">{stats.pf?.toFixed(2)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Total PnL</div>
                <div className={`text-lg font-bold tabular-nums ${(stats.total_pnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{stats.total_pnl != null ? `${stats.total_pnl >= 0 ? '+' : ''}${fmt(stats.total_pnl)}円` : '-'}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">MaxDD</div>
                <div className="text-lg font-bold tabular-nums text-rose-400">{stats.max_dd ? `${fmt(stats.max_dd.amount)}円` : '-'}</div>
                {stats.max_dd && <div className="text-xs text-muted-foreground tabular-nums">{stats.max_dd.pct.toFixed(1)}%</div>}
              </div>
            </div>

            {/* Year → Month → Trade 3-level drill-down */}
            {stats.year_summary && stats.year_summary.length > 0 && (
              <div className="overflow-x-auto border-t border-border/20">
                <table className="w-full min-w-[1000px]">
                  <thead><tr className="text-xs text-muted-foreground border-b border-border/30">
                    <th className="px-4 py-2 text-left">年</th>
                    <th className="px-4 py-2 text-right">Trades</th>
                    <th className="px-4 py-2 text-right">WR</th>
                    <th className="px-4 py-2 text-right" colSpan={2}>PnL</th>
                    <th className="px-4 py-2 text-right">PF</th>
                    <th className="px-4 py-2 text-right" colSpan={2}></th>
                    <th className="px-4 py-2 w-8"></th>
                  </tr></thead>
                  <tbody>
                    {stats.year_summary.slice().reverse().flatMap(ys => {
                      const isYearOpen = expandedYears.has(ys.year);
                      const yearMonths = stats.monthly.filter(m => m.month.startsWith(String(ys.year))).slice().reverse();
                      const rows: React.ReactNode[] = [
                        <tr key={`y-${ys.year}`} className="border-b border-border/20 hover:bg-muted/50 cursor-pointer h-9 md:h-14" onClick={() => toggleYear(ys.year)}>
                          <td className="px-4 py-2 text-sm md:text-base font-medium tabular-nums">{ys.year}</td>
                          <td className="px-4 py-2 text-sm md:text-base text-right tabular-nums">{ys.n}</td>
                          <td className="px-4 py-2 text-sm md:text-base text-right tabular-nums">{ys.wr.toFixed(1)}%</td>
                          <td className="px-4 py-2 text-sm md:text-base text-right tabular-nums font-medium" colSpan={2}>{fmtPnl(ys.pnl)}</td>
                          <td className="px-4 py-2 text-sm md:text-base text-right tabular-nums">{ys.pf != null ? ys.pf.toFixed(2) : '-'}</td>
                          <td className="px-4 py-2" colSpan={2}></td>
                          <td className="px-4 py-2 text-muted-foreground">{isYearOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}</td>
                        </tr>,
                      ];
                      if (isYearOpen) {
                        yearMonths.forEach(m => {
                          const isMonthOpen = expandedMonths.has(m.month);
                          const monthTrades = (stats.trades || []).filter(t => t.entry_date.startsWith(m.month)).sort((a, b) => b.entry_date.localeCompare(a.entry_date));
                          rows.push(
                            <tr key={`m-${m.month}`} className="border-b border-border/20 bg-muted/10 hover:bg-muted/30 cursor-pointer h-9" onClick={() => toggleMonth(m.month)}>
                              <td className="px-4 py-2 pl-8 text-sm tabular-nums text-muted-foreground">{parseInt(m.month.slice(5))}月</td>
                              <td className="px-4 py-2 text-sm text-right tabular-nums">{m.count}</td>
                              <td className={`px-4 py-2 text-sm text-right tabular-nums ${m.win_rate >= 55 ? 'text-emerald-400' : m.win_rate >= 45 ? 'text-amber-400' : 'text-rose-400'}`}>{m.win_rate.toFixed(1)}%</td>
                              <td className="px-4 py-2 text-sm text-right tabular-nums font-medium" colSpan={2}>{fmtPnl(m.pnl)}</td>
                              <td className="px-4 py-2" colSpan={3}></td>
                              <td className="px-4 py-2 text-muted-foreground">{isMonthOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}</td>
                            </tr>
                          );
                          if (isMonthOpen && monthTrades.length > 0) {
                            rows.push(
                              <tr key={`mh-${m.month}`} className="border-b border-border/20 bg-muted/20">
                                <td className="px-4 py-1 pl-12 text-[10px] md:text-[11px] text-muted-foreground">コード</td>
                                <td className="px-4 py-1 text-[10px] md:text-[11px] text-muted-foreground">銘柄</td>
                                <td className="px-4 py-1 text-[10px] md:text-[11px] text-muted-foreground text-right">エントリー日</td>
                                <td className="px-4 py-1 text-[10px] md:text-[11px] text-muted-foreground text-right">エントリー価格</td>
                                <td className="px-4 py-1 text-[10px] md:text-[11px] text-muted-foreground text-right">イグジット日</td>
                                <td className="px-4 py-1 text-[10px] md:text-[11px] text-muted-foreground text-right">イグジット価格</td>
                                <td className="px-4 py-1 text-[10px] md:text-[11px] text-muted-foreground text-right">PnL</td>
                                <td className="px-4 py-1 text-[10px] md:text-[11px] text-muted-foreground text-right">PnL%</td>
                                <td></td>
                              </tr>
                            );
                            monthTrades.forEach(t => {
                              const d1 = new Date(t.entry_date);
                              const d2 = new Date(t.exit_date);
                              const inStr = `${d1.getMonth() + 1}/${d1.getDate()}`;
                              const outStr = `${d2.getMonth() + 1}/${d2.getDate()}`;
                              const exitLabel = t.exit_type === '20d_high' || t.exit_type === 'high_update' ? '高値' : 'MH';
                              rows.push(
                                <tr key={`t-${t.entry_date}-${t.ticker}`} className="border-b border-border/10 bg-muted/20 hover:bg-muted/40 h-9">
                                  <td className="px-4 py-1.5 pl-12 text-xs md:text-sm tabular-nums font-medium">{t.ticker.replace('.T', '')}</td>
                                  <td className="px-4 py-1.5 text-xs md:text-sm text-muted-foreground">{t.stock_name}</td>
                                  <td className="px-4 py-1.5 text-xs md:text-sm text-right tabular-nums">{inStr}</td>
                                  <td className="px-4 py-1.5 text-xs md:text-sm text-right tabular-nums">{fmt(t.entry_price)}</td>
                                  <td className="px-4 py-1.5 text-xs md:text-sm text-right tabular-nums">{outStr} <span className={`${exitLabel === '高値' ? 'text-emerald-400' : 'text-amber-400'}`}>{exitLabel}</span></td>
                                  <td className="px-4 py-1.5 text-xs md:text-sm text-right tabular-nums">{fmt(t.exit_price)}</td>
                                  <td className="px-4 py-1.5 text-xs md:text-sm text-right tabular-nums font-medium">{fmtPnl(t.pnl_yen)}</td>
                                  <td className={`px-4 py-1.5 text-xs md:text-sm text-right tabular-nums ${t.ret_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{t.ret_pct >= 0 ? '+' : ''}{t.ret_pct.toFixed(2)}%</td>
                                  <td></td>
                                </tr>
                              );
                            });
                          }
                        });
                      }
                      return rows;
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Theory Reference */}
        <details className="mb-5 rounded-xl border border-border/40 bg-card overflow-hidden">
          <summary className="px-4 py-3 text-sm text-muted-foreground cursor-pointer hover:text-foreground">B4理論・ルール定義</summary>
          <div className="px-4 pb-4 space-y-3 text-sm">
            <div>
              <div className="font-medium mb-1">シグナル条件</div>
              <p className="text-muted-foreground">SMA20乖離 &lt; -15% かつ 陽線（終値 &gt; 始値）。急騰フィルター: 前日比+10%超の銘柄は除外</p>
            </div>
            <div>
              <div className="font-medium mb-1">エントリー判定</div>
              <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                <li>VI ≥ 40: STRONG — 全候補エントリー</li>
                <li>VI ≥ 30: ENTRY — 乖離深い順に資金枠内</li>
                <li>VI ≥ 25: CONSIDER — 最大2銘柄</li>
                <li>VI &lt; 25: WAIT — 見送り</li>
              </ul>
            </div>
            <div>
              <div className="font-medium mb-1">除外ルール</div>
              <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                <li>VI 30-40 × CME膠着 (±1%以内)</li>
                <li>VI 30-40 × CME GU (+1%以上)</li>
                <li>N225 前日比 &lt; -3%</li>
              </ul>
            </div>
            <div>
              <div className="font-medium mb-1">Exit</div>
              <p className="text-muted-foreground">直近20日高値更新 → 翌寄付で利確。最大保有15日到達 → 翌寄付で損切り。</p>
            </div>
            <div>
              <div className="font-medium mb-1">バックテスト (2020-2025)</div>
              <p className="text-muted-foreground">N=871, WR 82%, PF 6.46, avg +4.40%。ただしフィルター前の全シグナル基準。</p>
            </div>
          </div>
        </details>
      </div>
    </main>
  );
}
