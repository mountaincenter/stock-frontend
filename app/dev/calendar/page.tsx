'use client';

import { useEffect, useState } from 'react';
import { DevNavLinks } from '../../../components/dev';
import { RefreshCw, Calendar, TrendingUp, TrendingDown } from 'lucide-react';

// === Types ===
interface UpcomingEvent { date: string; flags: string[]; qe_remain: number | null; }
interface EtfLatest { date: string; close: number; prev_close: number | null; change: number | null; change_pct: number | null; }
interface Trade { entry_date: string; exit_date: string; month: number; year: number; ret_pct: number; entry_price: number | null; exit_price: number | null; pnl_100: number | null; }
interface YearSummary { year: number; n: number; wins: number; wr: number; total_ret: number; pnl_100: number | null; pf: number | null; max_dd: number; }
interface Stats { total: number; wins: number; losses: number; wr: number; avg: number; median: number; max: number; min: number; pf: number; total_ret: number; pnl_100: number; }
interface CalendarResponse {
  today: { sq_day?: boolean; sq4_entry?: boolean; sq3_exit?: boolean; qe_remain?: number | null; qe_1306_buy?: boolean; qe_1306_sell?: boolean; };
  upcoming: UpcomingEvent[];
  etf_latest: EtfLatest;
  etf1306: { stats: Stats; year_summary: YearSummary[]; trades: Trade[]; };
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

const fmtNum = (v: number | null | undefined) => v != null ? v.toLocaleString('ja-JP') : '—';
const fmtPct = (v: number | null | undefined) => {
  if (v == null) return '—';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(3)}%`;
};
const fmtPrice = (v: number | null | undefined) => v != null ? v.toFixed(1) : '—';
const fmtPnl = (v: number | null | undefined) => {
  if (v == null) return '—';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toLocaleString('ja-JP')}`;
};
const pnlColor = (v: number | null | undefined) => {
  if (v == null || v === 0) return '';
  return v > 0 ? 'text-price-up' : 'text-price-down';
};

export default function CalendarPage() {
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/dev/calendar`);
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch(`${API_BASE}/api/dev/calendar/refresh`, { method: 'POST' });
      await fetchData();
    } catch { /* ignore */ }
    setRefreshing(false);
  };

  useEffect(() => { fetchData(); }, []);

  const toggleYear = (year: number) => {
    setExpandedYears(prev => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year); else next.add(year);
      return next;
    });
  };

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-4"><DevNavLinks /><p className="text-muted-foreground mt-8">Loading...</p></div>;
  if (!data) return <div className="max-w-7xl mx-auto px-4 py-4"><DevNavLinks /><p className="text-destructive mt-8">Failed to load calendar data</p></div>;

  const { today, upcoming, etf_latest, etf1306 } = data;
  const { stats, year_summary, trades } = etf1306;
  const hasActiveFlag = today.sq4_entry || today.sq3_exit || today.qe_1306_buy || today.qe_1306_sell || today.sq_day;

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DevNavLinks />
        </div>
        <button onClick={handleRefresh} disabled={refreshing}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <h1 className="text-xl font-bold">Calendar Trades</h1>

      {/* Today's Status + 1306 Price */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">Today</p>
          {hasActiveFlag ? (
            <div className="mt-1 space-y-1">
              {today.sq4_entry && <span className="inline-block px-2 py-0.5 rounded text-sm font-semibold bg-primary/10 text-primary">SQ-4 買い</span>}
              {today.sq3_exit && <span className="inline-block px-2 py-0.5 rounded text-sm font-semibold bg-amber-500/20 text-amber-400">SQ-3 売り</span>}
              {today.sq_day && <span className="inline-block px-2 py-0.5 rounded text-sm font-semibold bg-white/5 text-muted-foreground">SQ日</span>}
              {today.qe_1306_buy && <span className="inline-block px-2 py-0.5 rounded text-sm font-semibold bg-emerald-500/20 text-emerald-400">1306 買い</span>}
              {today.qe_1306_sell && <span className="inline-block px-2 py-0.5 rounded text-sm font-semibold bg-rose-500/20 text-rose-400">1306 売り</span>}
              {today.qe_remain != null && <p className="text-xs text-muted-foreground">四半期末 残{today.qe_remain}日</p>}
            </div>
          ) : (
            <p className="text-lg font-bold mt-1 text-muted-foreground">—</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">1306.T</p>
          {etf_latest.close ? (
            <>
              <p className="text-lg font-bold tabular-nums mt-1">{etf_latest.close.toFixed(1)}</p>
              {etf_latest.change != null && (
                <p className={`text-sm tabular-nums ${pnlColor(etf_latest.change)}`}>
                  {fmtPnl(etf_latest.change)} ({etf_latest.change_pct != null ? `${etf_latest.change_pct > 0 ? '+' : ''}${etf_latest.change_pct.toFixed(2)}%` : ''})
                </p>
              )}
              <p className="text-xs text-muted-foreground">{etf_latest.date}</p>
            </>
          ) : <p className="text-lg font-bold mt-1 text-muted-foreground">—</p>}
        </div>

        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">PF / WR</p>
          <p className="text-lg font-bold tabular-nums mt-1">{stats.pf?.toFixed(2) ?? '—'}</p>
          <p className="text-sm text-muted-foreground tabular-nums">{stats.wr}% ({stats.wins}/{stats.total})</p>
        </div>

        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">累計 PnL(100株)</p>
          <p className={`text-lg font-bold tabular-nums mt-1 ${pnlColor(stats.pnl_100)}`}>{fmtPnl(stats.pnl_100)}円</p>
          <p className={`text-sm tabular-nums ${pnlColor(stats.total_ret)}`}>{fmtPct(stats.total_ret)}</p>
        </div>
      </div>

      {/* Upcoming Events */}
      {upcoming.length > 0 && (
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Calendar className="w-4 h-4" />Upcoming</p>
          <div className="flex flex-wrap gap-2">
            {upcoming.slice(0, 10).map((ev, i) => (
              <div key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/30 text-sm">
                <span className="text-muted-foreground tabular-nums">{ev.date.slice(5)}</span>
                {ev.flags.map((f, fi) => (
                  <span key={fi} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    f.includes('買い') ? 'bg-emerald-500/20 text-emerald-400' :
                    f.includes('売り') ? 'bg-rose-500/20 text-rose-400' :
                    f.includes('SQ日') ? 'bg-white/5 text-muted-foreground' :
                    'bg-primary/10 text-primary'
                  }`}>{f}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Year Summary Table */}
      <div className="rounded-xl border border-border bg-card">
        <div className="px-4 py-3 border-b border-border/30">
          <p className="text-lg font-semibold">1306 ETF 四半期末 — 年間サマリー</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="text-sm text-muted-foreground border-b border-border/30">
                <th className="px-4 py-2 text-left">年</th>
                <th className="px-4 py-2 text-right">Trades</th>
                <th className="px-4 py-2 text-right">WR</th>
                <th className="px-4 py-2 text-right">PnL(100株)</th>
                <th className="px-4 py-2 text-right">PnL(%)</th>
                <th className="px-4 py-2 text-right">PF</th>
                <th className="px-4 py-2 text-right">MaxDD</th>
                <th className="px-4 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {year_summary.slice().reverse().map(ys => {
                const isExpanded = expandedYears.has(ys.year);
                const yearTrades = trades.filter(t => t.year === ys.year).reverse();
                return (
                  <tbody key={ys.year}>
                    <tr className="border-b border-border/20 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => toggleYear(ys.year)}>
                      <td className="px-4 py-2 font-medium">{ys.year}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{ys.n}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{ys.wr}%</td>
                      <td className={`px-4 py-2 text-right tabular-nums ${pnlColor(ys.pnl_100)}`}>{fmtPnl(ys.pnl_100)}</td>
                      <td className={`px-4 py-2 text-right tabular-nums ${pnlColor(ys.total_ret)}`}>{fmtPct(ys.total_ret)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{ys.pf ?? '—'}</td>
                      <td className={`px-4 py-2 text-right tabular-nums ${ys.max_dd < 0 ? 'text-price-down' : ''}`}>{ys.max_dd < 0 ? ys.max_dd.toFixed(3) + '%' : '—'}</td>
                      <td className="px-4 py-2 text-center text-muted-foreground">
                        {isExpanded ? <TrendingDown className="w-3.5 h-3.5 inline" /> : <TrendingUp className="w-3.5 h-3.5 inline" />}
                      </td>
                    </tr>
                    {isExpanded && yearTrades.map(t => (
                      <tr key={`${t.entry_date}-${t.exit_date}`} className="border-b border-border/10 bg-muted/20 text-sm">
                        <td className="px-4 py-1.5 pl-8 text-muted-foreground tabular-nums">{t.entry_date} → {t.exit_date.slice(5)}</td>
                        <td className="px-4 py-1.5 text-right tabular-nums text-muted-foreground">{t.month}月 残{t.month === 3 || t.month === 6 || t.month === 9 || t.month === 12 ? '' : '?'}</td>
                        <td className="px-4 py-1.5 text-right tabular-nums">{fmtPrice(t.entry_price)} → {fmtPrice(t.exit_price)}</td>
                        <td className={`px-4 py-1.5 text-right tabular-nums ${pnlColor(t.pnl_100)}`}>{fmtPnl(t.pnl_100)}</td>
                        <td className={`px-4 py-1.5 text-right tabular-nums ${pnlColor(t.ret_pct)}`}>{fmtPct(t.ret_pct)}</td>
                        <td className="px-4 py-1.5" colSpan={2}></td>
                        <td></td>
                      </tr>
                    ))}
                  </tbody>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
