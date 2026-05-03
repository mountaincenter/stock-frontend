'use client';

import { useEffect, useState } from 'react';
import { DevNavLinks } from '../../../components/dev';
import { RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';

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

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const getWeekday = (dateStr: string) => WEEKDAYS[new Date(dateStr).getDay()];

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

const flagStyle = (flag: string) =>
  flag.includes('買い') ? 'bg-emerald-500/20 text-emerald-400' :
  flag.includes('売り') ? 'bg-rose-500/20 text-rose-400' :
  'bg-white/5 text-muted-foreground';

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

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      <DevNavLinks />
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">読み込み中...</span>
      </div>
    </div>
  );
  if (!data) return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      <DevNavLinks />
      <div className="mt-8 p-6 rounded-xl border border-destructive/50 bg-destructive/10 text-destructive text-sm">
        Failed to load calendar data
      </div>
    </div>
  );

  const { today, upcoming, etf_latest, etf1306 } = data;
  const { stats, year_summary, trades } = etf1306;
  const hasActiveFlag = today.sq4_entry || today.sq3_exit || today.qe_1306_buy || today.qe_1306_sell || today.sq_day;

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
      {/* Nav + Refresh */}
      <div className="flex items-center justify-between">
        <DevNavLinks />
        <button onClick={handleRefresh} disabled={refreshing}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <h1 className="text-xl font-bold">Calendar Trades</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {/* Today */}
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground mb-1">Today</p>
          {hasActiveFlag ? (
            <div className="space-y-1">
              {today.sq4_entry && <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary">SQ-4 買い</span>}
              {today.sq3_exit && <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-400">SQ-3 売り</span>}
              {today.sq_day && <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-white/5 text-muted-foreground">SQ日</span>}
              {today.qe_1306_buy && <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-400">1306 買い</span>}
              {today.qe_1306_sell && <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/20 text-rose-400">1306 売り</span>}
              {today.qe_remain != null && <p className="text-sm text-muted-foreground">四半期末 残{today.qe_remain}日</p>}
            </div>
          ) : (
            <p className="text-xl sm:text-2xl font-bold text-muted-foreground tabular-nums">—</p>
          )}
        </div>

        {/* 1306 Price */}
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground mb-1">1306.T ({etf_latest.date?.slice(5) ?? ''})</p>
          {etf_latest.close ? (
            <>
              <p className="text-xl sm:text-2xl font-bold tabular-nums">{etf_latest.close.toFixed(1)}</p>
              {etf_latest.change != null && (
                <p className={`text-sm tabular-nums ${pnlColor(etf_latest.change)}`}>
                  {fmtPnl(etf_latest.change)} ({etf_latest.change_pct != null ? `${etf_latest.change_pct > 0 ? '+' : ''}${etf_latest.change_pct.toFixed(2)}%` : ''})
                </p>
              )}
            </>
          ) : <p className="text-xl sm:text-2xl font-bold text-muted-foreground tabular-nums">—</p>}
        </div>

        {/* PF / WR */}
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground mb-1">PF / WR</p>
          <p className="text-xl sm:text-2xl font-bold tabular-nums">{stats.pf?.toFixed(2) ?? '—'}</p>
          <p className="text-sm text-muted-foreground tabular-nums">{stats.wr}% ({stats.wins}W {stats.losses}L / {stats.total})</p>
        </div>

        {/* Cumulative PnL */}
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground mb-1">累計 PnL(100株)</p>
          <p className={`text-xl sm:text-2xl font-bold tabular-nums ${pnlColor(stats.pnl_100)}`}>{fmtPnl(stats.pnl_100)}円</p>
          <p className={`text-sm tabular-nums ${pnlColor(stats.total_ret)}`}>{fmtPct(stats.total_ret)}</p>
        </div>
      </div>

      {/* Upcoming Events — テーブル形式 */}
      {upcoming.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="px-4 py-2 border-b border-border/30">
            <p className="text-lg font-semibold">Upcoming</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border/30">
                <th className="px-4 py-1.5 text-left w-24">日付</th>
                <th className="px-4 py-1.5 text-left w-10">曜日</th>
                <th className="px-4 py-1.5 text-left">イベント</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.slice(0, 12).map((ev, i) => (
                <tr key={i} className="border-b border-border/10 hover:bg-muted/50 transition-colors h-9">
                  <td className="px-4 py-1.5 text-sm tabular-nums">{ev.date.slice(5)}</td>
                  <td className="px-4 py-1.5 text-sm text-muted-foreground">{getWeekday(ev.date)}</td>
                  <td className="px-4 py-1.5">
                    <div className="flex items-center gap-1.5">
                      {ev.flags.map((f, fi) => (
                        <span key={fi} className={`inline-flex px-1.5 py-0.5 rounded text-[10px] md:text-[11px] font-medium ${flagStyle(f)}`}>{f}</span>
                      ))}
                      {ev.qe_remain != null && <span className="text-[10px] md:text-[11px] text-muted-foreground">残{ev.qe_remain}日</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Year Summary + Trade Detail */}
      <div className="rounded-xl border border-border bg-card">
        <div className="px-4 py-2 border-b border-border/30">
          <p className="text-lg font-semibold">1306 ETF 四半期末 — 年間サマリー</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border/30">
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
              {year_summary.slice().reverse().flatMap(ys => {
                const isExpanded = expandedYears.has(ys.year);
                const yearTrades = trades.filter(t => t.year === ys.year);
                const rows = [
                  <tr key={`y-${ys.year}`}
                      className="border-b border-border/20 hover:bg-muted/50 transition-colors cursor-pointer h-9 md:h-14"
                      onClick={() => toggleYear(ys.year)}>
                    <td className="px-4 py-2 text-sm md:text-base font-medium">{ys.year}</td>
                    <td className="px-4 py-2 text-sm md:text-base text-right tabular-nums">{ys.n}</td>
                    <td className="px-4 py-2 text-sm md:text-base text-right tabular-nums">{ys.wr.toFixed(1)}%</td>
                    <td className={`px-4 py-2 text-sm md:text-base text-right tabular-nums font-medium ${pnlColor(ys.pnl_100)}`}>{fmtPnl(ys.pnl_100)}</td>
                    <td className={`px-4 py-2 text-sm md:text-base text-right tabular-nums ${pnlColor(ys.total_ret)}`}>{fmtPct(ys.total_ret)}</td>
                    <td className="px-4 py-2 text-sm md:text-base text-right tabular-nums">{ys.pf ?? '—'}</td>
                    <td className={`px-4 py-2 text-sm md:text-base text-right tabular-nums ${ys.max_dd < 0 ? 'text-price-down' : ''}`}>{ys.max_dd < 0 ? ys.max_dd.toFixed(3) + '%' : '—'}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </td>
                  </tr>,
                ];
                if (isExpanded) {
                  rows.push(
                    <tr key={`h-${ys.year}`} className="border-b border-border/20 bg-muted/10">
                      <td className="px-4 py-1 pl-8 text-[10px] md:text-[11px] text-muted-foreground">エントリー日</td>
                      <td className="px-4 py-1 text-[10px] md:text-[11px] text-muted-foreground text-left" colSpan={2}>イグジット日</td>
                      <td className="px-4 py-1 text-[10px] md:text-[11px] text-muted-foreground text-right">Entry → Exit</td>
                      <td className="px-4 py-1 text-[10px] md:text-[11px] text-muted-foreground text-right">PnL(100株)</td>
                      <td className="px-4 py-1 text-[10px] md:text-[11px] text-muted-foreground text-right">PnL(%)</td>
                      <td colSpan={2}></td>
                    </tr>
                  );
                  yearTrades.forEach(t => {
                    rows.push(
                      <tr key={`t-${t.entry_date}`} className="border-b border-border/10 hover:bg-muted/30 transition-colors h-9">
                        <td className="px-4 py-1.5 pl-8 text-xs md:text-sm tabular-nums">{t.entry_date} ({getWeekday(t.entry_date)})</td>
                        <td className="px-4 py-1.5 text-xs md:text-sm tabular-nums text-muted-foreground text-left" colSpan={2}>{t.exit_date} ({getWeekday(t.exit_date)})</td>
                        <td className="px-4 py-1.5 text-xs md:text-sm text-right tabular-nums">{fmtPrice(t.entry_price)} → {fmtPrice(t.exit_price)}</td>
                        <td className={`px-4 py-1.5 text-xs md:text-sm text-right tabular-nums font-medium ${pnlColor(t.pnl_100)}`}>{fmtPnl(t.pnl_100)}</td>
                        <td className={`px-4 py-1.5 text-xs md:text-sm text-right tabular-nums ${pnlColor(t.ret_pct)}`}>{fmtPct(t.ret_pct)}</td>
                        <td colSpan={2}></td>
                      </tr>
                    );
                  });
                }
                return rows;
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
