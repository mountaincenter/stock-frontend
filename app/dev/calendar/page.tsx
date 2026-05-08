'use client';

import { useEffect, useMemo, useState } from 'react';
import { DevNavLinks } from '../../../components/dev';
import { RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';

// === Types ===
interface UpcomingEvent { date: string; flags: string[]; }
interface EtfLatest { date: string; close: number; prev_close: number | null; change: number | null; change_pct: number | null; }
interface Trade { entry_date: string; exit_date: string; month: number; year: number; ret_pct: number; entry_price: number | null; exit_price: number | null; pnl_1000: number | null; }
interface YearSummary { year: number; n: number; wins: number; wr: number; total_ret: number; pnl_1000: number | null; pf: number | null; max_dd: number; }
interface Stats { total: number; wins: number; losses: number; wr: number; avg: number; median: number; max: number; min: number; pf: number; total_ret: number; pnl_1000: number; }
interface Sq4Stats { total: number; wins: number; losses: number; wr: number; avg_ret: number; pf: number | null; total_ret: number; total_pnl_100: number; }
interface Sq4Pick { code: string; name: string; prev_close: number; ret_5d?: number; entry_price: number; exit_price: number; ret_pct: number; pnl_100: number; entry_date?: string; exit_date?: string; }
interface Sq4Monthly { month: string; entry_date: string; exit_date: string; n_picks: number; total_ret: number; total_pnl_100: number; cme_change: number | null; cme_ret: number | null; picks: Sq4Pick[]; }
interface SqPlus1Pick { code: string; name: string; prev_close: number; prev_day_ret: number; entry_price: number; exit_price: number; ret_pct: number; pnl_100: number; }
interface SqPlus1Monthly { month: string; sq_date: string; entry_date: string; exit_date: string; n_picks: number; total_ret: number; total_pnl_100: number; cme_change: number | null; cme_ret: number | null; cme_direction: string; picks: SqPlus1Pick[]; }
interface MaxDD { amount: number; pct: number; }
interface CmeLatest { date: string; close: number; prev_close: number; change: number; change_pct: number; }
interface Sq4Data { stats: Sq4Stats; stats_cme_down: Sq4Stats; stats_cme_up: Sq4Stats; max_dd: MaxDD; max_dd_cme_down: MaxDD; next_sq4: { entry_date: string; exit_date: string | null } | null; candidates: { as_of: string; count: number; sector: string }; monthly: Sq4Monthly[]; }
interface SqPlus1Data { stats: Sq4Stats; stats_cme_down: Sq4Stats; stats_cme_up: Sq4Stats; max_dd: MaxDD; max_dd_cme_down: MaxDD; next_sq_plus1: { sq_date: string; entry_date: string } | null; monthly: SqPlus1Monthly[]; }
interface WeekdayEdgeStockStats { code: string; name: string; direction: string; group: string; dow: number; dow_label: string; stats_filtered: Sq4Stats; stats_all: Sq4Stats; n_filtered: number; n_all: number; }
interface WeekdayEdgePick { date: string; code: string; name: string; direction: string; group: string; dow_label: string; adj_open: number; adj_close: number; ret_pct: number; pnl_100: number; us_prev_ret: number | null; }
interface WeekdayEdgeWeekly { week: string; start_date: string; end_date: string; n_trades: number; total_ret: number; total_pnl_100: number; picks: WeekdayEdgePick[]; }
interface WeekdayEdgeYearly { year: number; total: number; wins: number; wr: number; pf: number | null; total_ret: number; total_pnl_100: number; max_dd: MaxDD; }
interface WeekdayEdgeNextEntry { date: string; code: string; name: string; direction: string; dow_label: string; }
interface WeekdayEdgeData { params: Record<string, string | number>; stats_filtered: Sq4Stats; stats_all: Sq4Stats; max_dd_filtered: MaxDD; yearly: WeekdayEdgeYearly[]; stock_stats: WeekdayEdgeStockStats[]; next_entries: WeekdayEdgeNextEntry[]; weekly: WeekdayEdgeWeekly[]; }
interface CalendarResponse {
  today: { flags: string[] };
  upcoming: UpcomingEvent[];
  etf_latest: EtfLatest;
  cme_latest: CmeLatest;
  etf1306: { stats: Stats; max_dd: MaxDD; year_summary: YearSummary[]; trades: Trade[]; };
  sq4: Sq4Data;
  sq_plus1: SqPlus1Data;
  weekday_edge: WeekdayEdgeData;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const getWeekday = (dateStr: string) => WEEKDAYS[new Date(dateStr).getDay()];

const fmtPct = (v: number | null | undefined) => {
  if (v == null) return '—';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(3)}%`;
};
const fmtPct2 = (v: number | null | undefined) => {
  if (v == null) return '—';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(2)}%`;
};
const fmtPrice = (v: number | null | undefined) => v != null ? v.toFixed(1) : '—';
const fmtInt = (v: number | null | undefined) => {
  if (v == null) return '—';
  return Number.isInteger(v) ? v.toLocaleString('ja-JP') : v.toFixed(1);
};
const fmtPnl = (v: number | null | undefined) => {
  if (v == null) return '—';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toLocaleString('ja-JP')}`;
};
const fmtDateWd = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]})`;
};
const pnlColor = (v: number | null | undefined) => {
  if (v == null || v === 0) return '';
  return v > 0 ? 'text-price-up' : 'text-price-down';
};

const flagStyle = (flag: string) =>
  flag.includes('買い') ? 'bg-emerald-500/20 text-emerald-400' :
  flag.includes('売り') ? 'bg-red-500/20 text-red-400' :
  flag.includes('決済') ? 'bg-amber-500/20 text-amber-400' :
  flag === '曜日LONG' ? 'bg-emerald-500/10 text-emerald-400/80' :
  flag === '曜日SHORT' ? 'bg-red-500/10 text-red-400/80' :
  'bg-white/5 text-muted-foreground';

const isQFlag = (flag: string) => /^\dQ/.test(flag);

export default function CalendarPage() {
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const [expandedSq4Months, setExpandedSq4Months] = useState<Set<string>>(new Set());
  const [sq4SectionOpen, setSq4SectionOpen] = useState(false);
  const [sqPlus1SectionOpen, setSqPlus1SectionOpen] = useState(false);
  const [expandedSqPlus1Months, setExpandedSqPlus1Months] = useState<Set<string>>(new Set());
  const [etfSectionOpen, setEtfSectionOpen] = useState(false);
  const [weekdayEdgeSectionOpen, setWeekdayEdgeSectionOpen] = useState(false);
  const [weekdayEdgeView, setWeekdayEdgeView] = useState<string>('weekly');
  const [expandedWeekdayWeeks, setExpandedWeekdayWeeks] = useState<Set<string>>(new Set());

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

  const toggleSq4Month = (month: string) => {
    setExpandedSq4Months(prev => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month); else next.add(month);
      return next;
    });
  };

  const toggleSqPlus1Month = (month: string) => {
    setExpandedSqPlus1Months(prev => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month); else next.add(month);
      return next;
    });
  };

  const toggleWeekdayWeek = (week: string) => {
    setExpandedWeekdayWeeks(prev => {
      const next = new Set(prev);
      if (next.has(week)) next.delete(week); else next.add(week);
      return next;
    });
  };

  // 曜日エッジ: 全picks展開 + ビュー別集約（hooks はearly returnの前に置く）
  const weAggregate = (picks: WeekdayEdgePick[]) => {
    if (picks.length === 0) return { n: 0, wins: 0, losses: 0, wr: 0, pf: null as number | null, total_pnl: 0, total_ret: 0 };
    const rets = picks.map(p => p.ret_pct);
    const wins = rets.filter(r => r > 0).length;
    const gain = rets.filter(r => r > 0).reduce((a, b) => a + b, 0);
    const loss = -rets.filter(r => r <= 0).reduce((a, b) => a + b, 0);
    return {
      n: picks.length,
      wins,
      losses: picks.length - wins,
      wr: Math.round(wins / picks.length * 1000) / 10,
      pf: loss > 0 ? Math.round(gain / loss * 100) / 100 : null,
      total_pnl: Math.round(picks.reduce((a, p) => a + p.pnl_100, 0)),
      total_ret: Math.round(rets.reduce((a, b) => a + b, 0) * 100) / 100,
    };
  };

  const allWePicks = useMemo(() => {
    if (!data?.weekday_edge?.weekly) return [];
    return data.weekday_edge.weekly.flatMap(w => w.picks);
  }, [data]);

  const weGrouped = useMemo(() => {
    if (allWePicks.length === 0) return { daily: [], monthly: [], weekday: [] };
    const byDate: Record<string, WeekdayEdgePick[]> = {};
    const byMonth: Record<string, WeekdayEdgePick[]> = {};
    const byDow: Record<string, WeekdayEdgePick[]> = {};
    for (const p of allWePicks) {
      (byDate[p.date] ??= []).push(p);
      (byMonth[p.date.slice(0, 7)] ??= []).push(p);
      (byDow[p.dow_label] ??= []).push(p);
    }
    const daily = Object.entries(byDate).sort(([a], [b]) => b.localeCompare(a)).map(([key, picks]) => ({ key, picks, ...weAggregate(picks) }));
    const monthly = Object.entries(byMonth).sort(([a], [b]) => b.localeCompare(a)).map(([key, picks]) => ({ key, picks, ...weAggregate(picks) }));
    const dowOrder = ['月', '火', '水', '木', '金'];
    const weekday = dowOrder.filter(d => byDow[d]).map(d => {
      const picks = byDow[d];
      const longPicks = picks.filter(p => p.direction === 'LONG');
      const shortPicks = picks.filter(p => p.direction === 'SHORT');
      return { key: d, picks, ...weAggregate(picks), long: weAggregate(longPicks), short: weAggregate(shortPicks) };
    });
    return { daily, monthly, weekday };
  }, [allWePicks]);

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

  const { today, upcoming, etf_latest, cme_latest, etf1306, sq4, sq_plus1, weekday_edge } = data;
  const { stats, max_dd: etfMaxDd, year_summary, trades } = etf1306;

  // Upcoming の Q イベントに過去パフォーマンスを紐付け
  const tradesByQMonth: Record<number, Trade[]> = {};
  for (const t of trades) {
    if (!tradesByQMonth[t.month]) tradesByQMonth[t.month] = [];
    tradesByQMonth[t.month].push(t);
  }

  const upcomingEtf = upcoming
    .filter(ev => ev.flags.some(isQFlag))
    .map(ev => {
      const evMonth = parseInt(ev.date.slice(5, 7), 10);
      const evYear = parseInt(ev.date.slice(0, 4), 10);
      const qMonth = Math.ceil(evMonth / 3) * 3;
      const qTrades = tradesByQMonth[qMonth] || [];
      const allRets = qTrades.map(t => t.ret_pct);
      const avgRet = allRets.length > 0 ? allRets.reduce((a, b) => a + b, 0) / allRets.length : null;
      const prevYearTrade = qTrades.find(t => t.year === evYear - 1);
      return {
        ...ev,
        q_avg_ret: avgRet,
        prev_year_ret: prevYearTrade?.ret_pct ?? null,
        prev_year_pnl: prevYearTrade?.pnl_1000 ?? null,
      };
    });

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4 pb-3 border-b border-border/30">
        <div>
          <h1 className="text-xl font-bold text-foreground">Calendar Trades</h1>
          <p className="text-sm text-muted-foreground mt-0.5">SQ-4 + SQ+1 + 1306ETF四半期末 + 曜日エッジ</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleRefresh} disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border/40 rounded-lg hover:bg-muted/20 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>更新</span>
          </button>
          <DevNavLinks />
        </div>
      </header>

      {/* SQ-4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
          <p className="text-sm text-muted-foreground mb-1">SQ-4 Next</p>
          {sq4?.next_sq4 ? (
            <>
              <p className="text-xl font-bold tabular-nums">{fmtDateWd(sq4.next_sq4.entry_date)}</p>
              <p className="text-xs text-muted-foreground">→ {sq4.next_sq4.exit_date ? fmtDateWd(sq4.next_sq4.exit_date) : '?'} 決済</p>
            </>
          ) : <p className="text-xl font-bold text-muted-foreground/40">—</p>}
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
          <p className="text-sm text-muted-foreground mb-1">CME ({cme_latest?.date?.slice(5) ?? ''})</p>
          {cme_latest?.close ? (
            <>
              <p className="text-xl font-bold tabular-nums">{cme_latest.close.toLocaleString('ja-JP')}</p>
              <p className={`text-sm tabular-nums ${pnlColor(cme_latest.change)}`}>
                {fmtPnl(cme_latest.change)} ({cme_latest.change_pct > 0 ? '+' : ''}{cme_latest.change_pct.toFixed(2)}%)
              </p>
            </>
          ) : <p className="text-xl font-bold text-muted-foreground tabular-nums">—</p>}
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
          <p className="text-sm text-muted-foreground mb-1">CME下落時 PnL(100株)</p>
          <p className={`text-xl font-bold tabular-nums ${pnlColor(sq4?.stats_cme_down?.total_pnl_100)}`}>{fmtPnl(sq4?.stats_cme_down?.total_pnl_100)}</p>
          <p className="text-sm text-muted-foreground tabular-nums">PF {sq4?.stats_cme_down?.pf?.toFixed(2) ?? '—'} / N={sq4?.stats_cme_down?.total ?? 0}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
          <p className="text-sm text-muted-foreground mb-1">MaxDD</p>
          <p className={`text-xl font-bold tabular-nums text-price-down`}>{fmtPnl(sq4?.max_dd_cme_down?.amount)}</p>
          <p className="text-sm text-muted-foreground tabular-nums">{sq4?.max_dd_cme_down?.pct != null ? `${sq4.max_dd_cme_down.pct.toFixed(2)}%` : '—'}</p>
        </div>
      </div>

      {/* 1306 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Q Next */}
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
          <p className="text-sm text-muted-foreground mb-1">{upcomingEtf.length > 0 ? upcomingEtf[0].flags[0]?.replace(/ .*/, '') : 'Q'} Next</p>
          {upcomingEtf.length > 0 ? (
            <>
              <p className="text-xl font-bold tabular-nums">{fmtDateWd(upcomingEtf[0].date)}</p>
              <p className="text-xs text-muted-foreground">{upcomingEtf[0].flags.join(' / ')}</p>
            </>
          ) : <p className="text-xl font-bold text-muted-foreground/40">—</p>}
        </div>

        {/* 1306 Price */}
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
          <p className="text-sm text-muted-foreground mb-1">1306.T ({etf_latest.date?.slice(5) ?? ''})</p>
          {etf_latest.close ? (
            <>
              <p className="text-xl font-bold tabular-nums">{etf_latest.close.toFixed(1)}</p>
              {etf_latest.change != null && (
                <p className={`text-sm tabular-nums ${pnlColor(etf_latest.change)}`}>
                  {fmtPnl(etf_latest.change)} ({etf_latest.change_pct != null ? `${etf_latest.change_pct > 0 ? '+' : ''}${etf_latest.change_pct.toFixed(2)}%` : ''})
                </p>
              )}
            </>
          ) : <p className="text-xl font-bold text-muted-foreground tabular-nums">—</p>}
        </div>

        {/* Cumulative PnL */}
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
          <p className="text-sm text-muted-foreground mb-1">累計 PnL(1000株)</p>
          <p className={`text-xl font-bold tabular-nums ${pnlColor(stats.pnl_1000)}`}>{fmtPnl(stats.pnl_1000)}円</p>
          <p className="text-sm text-muted-foreground tabular-nums">PF {stats.pf?.toFixed(2) ?? '—'} / N={stats.total}</p>
        </div>

        {/* MaxDD */}
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
          <p className="text-sm text-muted-foreground mb-1">MaxDD</p>
          <p className="text-xl font-bold tabular-nums text-price-down">{fmtPnl(etfMaxDd?.amount)}</p>
          <p className="text-sm text-muted-foreground tabular-nums">{etfMaxDd?.pct != null ? `${etfMaxDd.pct.toFixed(3)}%` : '—'}</p>
        </div>
      </div>

      {/* Weekday Edge Summary Cards */}
      {weekday_edge && weekday_edge.stats_filtered?.total > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
            <p className="text-sm text-muted-foreground mb-1">USフィルタ有 PnL(100株)</p>
            <p className={`text-xl font-bold tabular-nums ${pnlColor(weekday_edge.stats_filtered?.total_pnl_100)}`}>{fmtPnl(weekday_edge.stats_filtered?.total_pnl_100)}</p>
            <p className="text-sm text-muted-foreground tabular-nums">PF {weekday_edge.stats_filtered?.pf?.toFixed(2) ?? '—'} / N={weekday_edge.stats_filtered?.total ?? 0}</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
            <p className="text-sm text-muted-foreground mb-1">勝率</p>
            <p className="text-xl font-bold tabular-nums">{weekday_edge.stats_filtered?.wr?.toFixed(1) ?? '—'}%</p>
            <p className="text-sm text-muted-foreground tabular-nums">W{weekday_edge.stats_filtered?.wins ?? 0} / L{weekday_edge.stats_filtered?.losses ?? 0}</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
            <p className="text-sm text-muted-foreground mb-1">MaxDD</p>
            <p className="text-xl font-bold tabular-nums text-price-down">{fmtPnl(weekday_edge.max_dd_filtered?.amount)}</p>
            <p className="text-sm text-muted-foreground tabular-nums">{weekday_edge.max_dd_filtered?.pct != null ? `${weekday_edge.max_dd_filtered.pct.toFixed(2)}%` : '—'}</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
            <p className="text-sm text-muted-foreground mb-1">銘柄構成</p>
            <p className="text-xl font-bold tabular-nums">{weekday_edge.stock_stats?.length ?? 0}</p>
            <p className="text-sm text-muted-foreground tabular-nums">L{weekday_edge.stock_stats?.filter(s => s.direction === 'LONG').length ?? 0} / S{weekday_edge.stock_stats?.filter(s => s.direction === 'SHORT').length ?? 0}</p>
          </div>
        </div>
      )}

      {/* 次のエントリー候補 */}
      {weekday_edge && (weekday_edge.next_entries?.length ?? 0) > 0 && (() => {
        const entries = weekday_edge.next_entries;
        const byDateDir: Record<string, WeekdayEdgeNextEntry[]> = {};
        for (const e of entries) {
          const k = `${e.date}-${e.direction}`;
          (byDateDir[k] ??= []).push(e);
        }
        const groups = Object.values(byDateDir).sort((a, b) => {
          const dc = a[0].date.localeCompare(b[0].date);
          if (dc !== 0) return dc;
          return a[0].direction === 'LONG' ? -1 : 1;
        });
        return (
          <div className="rounded-xl border border-border bg-card">
            <div className="px-4 py-2 border-b border-border/30">
              <p className="text-lg font-semibold">次のエントリー候補</p>
              <p className="text-xs text-muted-foreground">USフィルタ: LONG≤+1% / SHORT≥-1% / アドバンテスト&lt;-1% — 寄前にS&amp;P500前夜を確認</p>
            </div>
            <div className="divide-y divide-border/20">
              {groups.map(g => {
                const isLong = g[0].direction === 'LONG';
                return (
                  <div key={`${g[0].date}-${g[0].direction}`} className="px-4 py-2">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm font-medium tabular-nums">{fmtDateWd(g[0].date)}</span>
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${isLong ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{g[0].direction}</span>
                      <span className="text-xs text-muted-foreground">{g.length}銘柄 / 寄成→引成</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 pl-2">
                      {g.map(e => (
                        <span key={e.code} className="text-sm tabular-nums">
                          <span className="text-muted-foreground">{e.code.replace(/0$/, '')}</span>
                          <span className="ml-1">{e.name}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Upcoming — 全イベント日付順 */}
      {(upcomingEtf.length > 0 || sq4?.next_sq4 || (weekday_edge?.next_entries?.length ?? 0) > 0) && (() => {
        // 全イベントを統一配列に集約して日付ソート
        type UpcomingRow = { date: string; label: React.ReactNode; action: string; pf: string };
        const allRows: UpcomingRow[] = [];

        // SQ-4 CME判定 + entry + exit
        if (sq4?.next_sq4) {
          const d = new Date(sq4.next_sq4.entry_date);
          while (d.getDay() !== 5) d.setDate(d.getDate() - 1);
          const cmeDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          allRows.push({
            date: cmeDate,
            label: <span className="inline-flex px-2 py-0.5 rounded text-xs md:text-sm font-medium bg-blue-500/20 text-blue-400">SQ-4 判定</span>,
            action: 'CME確認',
            pf: sq4.stats_cme_down?.pf?.toFixed(2) ?? '—',
          });
          allRows.push({
            date: sq4.next_sq4.entry_date,
            label: <span className="inline-flex px-2 py-0.5 rounded text-xs md:text-sm font-medium bg-emerald-500/20 text-emerald-400">SQ-4 買い</span>,
            action: '寄成',
            pf: '—',
          });
          if (sq4.next_sq4.exit_date) {
            allRows.push({
              date: sq4.next_sq4.exit_date,
              label: <span className="inline-flex px-2 py-0.5 rounded text-xs md:text-sm font-medium bg-amber-500/20 text-amber-400">SQ-4 売り</span>,
              action: '寄成',
              pf: '—',
            });
          }
        }

        // SQ+1 CME判定 + short
        upcoming.filter(ev => ev.flags.some(f => f.includes('SQ+1'))).forEach(ev => {
          // SQ+1の前日(SQ金曜)にCME判定を追加
          const sqFri = new Date(ev.date);
          sqFri.setDate(sqFri.getDate() - ((sqFri.getDay() + 6) % 7)); // 直前の金曜
          while (sqFri.getDay() !== 5) sqFri.setDate(sqFri.getDate() - 1);
          const sqFriStr = `${sqFri.getFullYear()}-${String(sqFri.getMonth()+1).padStart(2,'0')}-${String(sqFri.getDate()).padStart(2,'0')}`;
          allRows.push({
            date: sqFriStr,
            label: (<><span className="inline-flex px-2 py-0.5 rounded text-xs md:text-sm font-medium bg-blue-500/20 text-blue-400">SQ+1 判定</span><span className="ml-2 text-xs text-muted-foreground">CME↓→Top5 / CME↑→Top10</span></>),
            action: 'CME確認(土曜朝)',
            pf: '2.59 / 1.51',
          });
          allRows.push({
            date: ev.date,
            label: (<><span className="inline-flex px-2 py-0.5 rounded text-xs md:text-sm font-medium bg-red-500/20 text-red-400">SQ+1 売り</span><span className="ml-2 text-xs text-muted-foreground">前日上昇Top N 寄成SHORT→引成</span></>),
            action: '寄成',
            pf: '1.51',
          });
        });

        // Q events
        upcomingEtf.forEach((ev, i) => {
          const hasBuy = ev.flags.some(f => f.includes('買い'));
          const hasSell = ev.flags.some(f => f.includes('決済'));
          const action = hasBuy && hasSell ? '引成(売+買)' : hasBuy ? '引成' : hasSell ? '引成' : '';
          const showPf = i === 0 && stats.pf;
          allRows.push({
            date: ev.date,
            label: (<div className="flex items-center gap-1.5">{ev.flags.map((f, fi) => (<span key={fi} className={`inline-flex px-2 py-0.5 rounded text-xs md:text-sm font-medium ${flagStyle(f)}`}>{f}</span>))}</div>),
            action,
            pf: showPf ? stats.pf.toFixed(2) : '—',
          });
        });

        // Weekday Edge entries (deduplicate by date+direction)
        const weSeenDates = new Set<string>();
        (weekday_edge?.next_entries ?? []).forEach(entry => {
          const key = `${entry.date}-${entry.direction}`;
          if (weSeenDates.has(key)) return;
          weSeenDates.add(key);
          const isLong = entry.direction === 'LONG';
          const nStocks = (weekday_edge?.next_entries ?? []).filter(e => e.date === entry.date && e.direction === entry.direction).length;
          allRows.push({
            date: entry.date,
            label: (<><span className={`inline-flex px-2 py-0.5 rounded text-xs md:text-sm font-medium ${isLong ? 'bg-emerald-500/10 text-emerald-400/80' : 'bg-red-500/10 text-red-400/80'}`}>曜日{isLong ? 'LONG' : 'SHORT'}</span><span className="ml-2 text-xs text-muted-foreground">{entry.dow_label} {nStocks}銘柄</span></>),
            action: '寄成→引成',
            pf: weekday_edge?.stats_filtered?.pf?.toFixed(2) ?? '—',
          });
        });

        allRows.sort((a, b) => a.date.localeCompare(b.date));

        return (
        <div className="rounded-xl border border-border bg-card">
          <div className="px-4 py-2 border-b border-border/30">
            <p className="text-lg font-semibold">Upcoming</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border/30">
                  <th className="px-4 py-1.5 text-left">日付</th>
                  <th className="px-4 py-1.5 text-left">イベント</th>
                  <th className="px-4 py-1.5 text-left">アクション</th>
                  <th className="px-4 py-1.5 text-right">PF</th>
                </tr>
              </thead>
              <tbody>
                {allRows.map((row, i) => (
                  <tr key={i} className="border-b border-border/10 hover:bg-muted/50 transition-colors h-9 md:h-12">
                    <td className="px-4 py-1.5 text-sm md:text-base tabular-nums">{fmtDateWd(row.date)}</td>
                    <td className="px-4 py-1.5">{row.label}</td>
                    <td className="px-4 py-1.5 text-sm md:text-base text-muted-foreground">{row.action}</td>
                    <td className="px-4 py-1.5 text-sm md:text-base text-right tabular-nums">{row.pf}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        );
      })()}

      {/* SQ-4 Section */}
      {sq4 && (
        <>

          {/* SQ-4 Monthly Results */}
          <div className="rounded-xl border border-border bg-card">
            <div className="px-4 py-2 border-b border-border/30 cursor-pointer flex items-center justify-between hover:bg-muted/30 transition-colors"
                 onClick={() => setSq4SectionOpen(v => !v)}>
              <p className="text-lg font-semibold">SQ-4 外需×5日ret worst10 — 月次結果</p>
              {sq4SectionOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </div>
            {sq4SectionOpen && <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border/30">
                    <th className="px-4 py-2 text-left">月</th>
                    <th className="px-4 py-2 text-left" colSpan={2}>Entry → Exit</th>
                    <th className="px-4 py-2 text-right">CME(土曜朝)</th>
                    <th className="px-4 py-2 text-right">N</th>
                    <th className="px-4 py-2 text-right">PnL(100株)</th>
                    <th className="px-4 py-2 text-right">PnL(%)</th>
                  </tr>
                </thead>
                <tbody>
                  {sq4.monthly.slice().reverse().flatMap(m => {
                    const isExpanded = expandedSq4Months.has(m.month);
                    const rows = [
                      <tr key={`sq4-${m.month}`}
                          className="border-b border-border/20 hover:bg-muted/50 transition-colors cursor-pointer h-9 md:h-12"
                          onClick={() => toggleSq4Month(m.month)}>
                        <td className="px-4 py-1.5 text-sm md:text-base font-medium">{m.month}</td>
                        <td className="px-4 py-1.5 text-sm md:text-base tabular-nums text-muted-foreground" colSpan={2}>{fmtDateWd(m.entry_date)} → {fmtDateWd(m.exit_date)}</td>
                        <td className={`px-4 py-1.5 text-sm md:text-base text-right tabular-nums ${pnlColor(m.cme_change)}`}>{m.cme_change != null ? `${m.cme_change > 0 ? '+' : ''}${m.cme_change.toLocaleString()}(${fmtPct2(m.cme_ret)})` : '—'}</td>
                        <td className="px-4 py-1.5 text-sm md:text-base text-right tabular-nums">{m.n_picks}</td>
                        <td className={`px-4 py-1.5 text-sm md:text-base text-right tabular-nums font-medium ${pnlColor(m.total_pnl_100)}`}>{fmtPnl(m.total_pnl_100)}</td>
                        <td className={`px-4 py-1.5 text-sm md:text-base text-right tabular-nums font-medium ${pnlColor(m.total_ret)}`}>{fmtPct2(m.total_ret)}</td>
                      </tr>,
                    ];
                    if (isExpanded) {
                      rows.push(
                        <tr key={`sq4h-${m.month}`} className="border-b border-border/20 bg-muted/10">
                          <td className="px-4 py-1.5 pl-8 text-xs text-muted-foreground" colSpan={2}>銘柄</td>
                          <td className="px-4 py-1.5 text-xs text-muted-foreground text-right">5日ret</td>
                          <td className="px-4 py-1.5 text-xs text-muted-foreground text-right">前日終値</td>
                          <td className="px-4 py-1.5 text-xs text-muted-foreground text-right">当日終値</td>
                          <td className="px-4 py-1.5 text-xs text-muted-foreground text-right">PnL(100株)</td>
                          <td className="px-4 py-1.5 text-xs text-muted-foreground text-right">PnL(%)</td>
                        </tr>
                      );
                      m.picks.forEach((p, pi) => {
                        rows.push(
                          <tr key={`sq4p-${m.month}-${pi}`} className="border-b border-border/10 hover:bg-muted/30 transition-colors h-9">
                            <td className="px-4 py-1.5 pl-8 text-sm tabular-nums">{p.code}</td>
                            <td className="px-4 py-1.5 text-sm text-muted-foreground truncate max-w-[140px]">{p.name}</td>
                            <td className={`px-4 py-1.5 text-sm text-right tabular-nums ${pnlColor(p.ret_5d)}`}>{fmtPct2(p.ret_5d)}</td>
                            <td className="px-4 py-1.5 text-sm text-right tabular-nums">{fmtInt(p.prev_close)}</td>
                            <td className="px-4 py-1.5 text-sm text-right tabular-nums">{fmtInt(p.exit_price)}</td>
                            <td className={`px-4 py-1.5 text-sm text-right tabular-nums font-medium ${pnlColor(p.pnl_100)}`}>{fmtPnl(p.pnl_100)}</td>
                            <td className={`px-4 py-1.5 text-sm text-right tabular-nums font-medium ${pnlColor(p.ret_pct)}`}>{fmtPct2(p.ret_pct)}</td>
                          </tr>
                        );
                      });
                    }
                    return rows;
                  })}
                </tbody>
              </table>
            </div>}
            {/* Loss Month Macro Analysis */}
            {sq4SectionOpen && <details className="px-4 py-3 border-t border-border/20">
              <summary className="text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors">負け月分析（10回 / 49回）</summary>
              <div className="mt-3 space-y-2 text-sm">
                {[
                  { month: '2026/04', cme: 'DOWN', pnl: -11.43, yen: -47050, reason: 'イラン地政学（ホルムズ海峡封鎖脅威、原油急騰）' },
                  { month: '2025/11', cme: 'UP', pnl: -2.26, yen: 40950, reason: '11/5 AI急落余波。SQ-4反発だが半導体戻り鈍い' },
                  { month: '2025/10', cme: 'UP', pnl: -7.75, yen: -30000, reason: '高市トレード+2175円急騰。外需worst銘柄は恩恵外' },
                  { month: '2024/10', cme: 'UP', pnl: -15.89, yen: -50250, reason: '石破ショック回復+697円。外需worst銘柄は戻り遅く逆行' },
                  { month: '2024/02', cme: 'UP', pnl: -13.68, yen: -46200, reason: '日経+0.54%上昇日。マクロ要因なし、銘柄固有' },
                  { month: '2023/12', cme: 'DOWN', pnl: -3.88, yen: 10350, reason: '植田「チャレンジング」発言→円高141円+SQデルタヘッジ' },
                  { month: '2023/07', cme: 'UP', pnl: -17.33, yen: -38340, reason: '急速な円高145→142。外需5日続落' },
                  { month: '2022/12', cme: 'DOWN', pnl: -6.40, yen: -14680, reason: 'SQ週膠着。FOMC前+SQ需給（本格下落は12/20 YCC修正）' },
                  { month: '2022/10', cme: '横', pnl: -24.78, yen: -66020, reason: '米雇用統計+3連休前売り（日経-0.71%小幅）' },
                  { month: '2022/05', cme: 'UP', pnl: -9.78, yen: -65580, reason: 'FOMC 0.5%利上げ+QT決定→世界リスクオフ' },
                ].map(r => (
                  <div key={r.month} className="flex items-baseline gap-2 px-2 py-1 rounded hover:bg-muted/30">
                    <span className="tabular-nums font-medium w-[58px] shrink-0">{r.month}</span>
                    <span className={`w-[44px] shrink-0 text-center font-medium ${r.cme === 'DOWN' ? 'text-red-400' : r.cme === 'UP' ? 'text-green-400' : 'text-muted-foreground'}`}>{r.cme}</span>
                    <span className="tabular-nums text-red-400 w-[55px] shrink-0 text-right">{r.pnl.toFixed(1)}%</span>
                    <span className={`tabular-nums w-[70px] shrink-0 text-right ${r.yen >= 0 ? 'text-green-400' : 'text-red-400'}`}>{r.yen >= 0 ? '+' : ''}{(r.yen / 10000).toFixed(1)}万</span>
                    <span className="text-muted-foreground">{r.reason}</span>
                  </div>
                ))}
                <p className="pt-2 text-xs text-muted-foreground/70 px-2">実額=100株×10銘柄。CME DOWN=構造ショック。CME UP=市場上昇中の銘柄固有損失。</p>
              </div>
            </details>}
          </div>
        </>
      )}

      {/* SQ+1 Section */}
      {sq_plus1 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="px-4 py-2 border-b border-border/30 cursor-pointer flex items-center justify-between hover:bg-muted/30 transition-colors"
               onClick={() => setSqPlus1SectionOpen(v => !v)}>
            <p className="text-lg font-semibold">SQ+1 前日上昇Top N SHORT — 月次結果</p>
            {sqPlus1SectionOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
          {sqPlus1SectionOpen && <>
            <div className="px-4 py-2 flex flex-wrap gap-4 text-sm border-b border-border/20">
              <span>全体 PF <span className="font-medium tabular-nums">{sq_plus1.stats?.pf?.toFixed(2) ?? '—'}</span> / N={sq_plus1.stats?.total ?? 0}</span>
              <span>CME↓ PF <span className="font-medium tabular-nums text-red-400">{sq_plus1.stats_cme_down?.pf?.toFixed(2) ?? '—'}</span> (N={sq_plus1.stats_cme_down?.total ?? 0})</span>
              <span>CME↑ PF <span className="font-medium tabular-nums text-green-400">{sq_plus1.stats_cme_up?.pf?.toFixed(2) ?? '—'}</span> (N={sq_plus1.stats_cme_up?.total ?? 0})</span>
              <span>MaxDD <span className="font-medium tabular-nums text-price-down">{fmtPnl(sq_plus1.max_dd?.amount)}</span></span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border/30">
                    <th className="px-4 py-2 text-left">月</th>
                    <th className="px-4 py-2 text-left" colSpan={2}>SQ日 → Entry</th>
                    <th className="px-4 py-2 text-right">CME(土曜朝)</th>
                    <th className="px-4 py-2 text-right">N</th>
                    <th className="px-4 py-2 text-right">PnL(100株)</th>
                    <th className="px-4 py-2 text-right">PnL(%)</th>
                  </tr>
                </thead>
                <tbody>
                  {sq_plus1.monthly.slice().reverse().flatMap(m => {
                    const isExpanded = expandedSqPlus1Months.has(m.month);
                    const rows = [
                      <tr key={`sp1-${m.month}`}
                          className="border-b border-border/20 hover:bg-muted/50 transition-colors cursor-pointer h-9 md:h-12"
                          onClick={() => toggleSqPlus1Month(m.month)}>
                        <td className="px-4 py-1.5 text-sm md:text-base font-medium">{m.month}</td>
                        <td className="px-4 py-1.5 text-sm md:text-base tabular-nums text-muted-foreground" colSpan={2}>{fmtDateWd(m.sq_date)} → {fmtDateWd(m.entry_date)}</td>
                        <td className={`px-4 py-1.5 text-sm md:text-base text-right tabular-nums ${pnlColor(m.cme_change)}`}>
                          {m.cme_change != null ? `${m.cme_change > 0 ? '+' : ''}${m.cme_change.toLocaleString()}(${fmtPct2(m.cme_ret)})` : '—'}
                          <span className={`ml-1 text-xs ${m.cme_direction === 'DOWN' ? 'text-red-400' : 'text-green-400'}`}>{m.cme_direction === 'DOWN' ? '↓5' : '↑10'}</span>
                        </td>
                        <td className="px-4 py-1.5 text-sm md:text-base text-right tabular-nums">{m.n_picks}</td>
                        <td className={`px-4 py-1.5 text-sm md:text-base text-right tabular-nums font-medium ${pnlColor(m.total_pnl_100)}`}>{fmtPnl(m.total_pnl_100)}</td>
                        <td className={`px-4 py-1.5 text-sm md:text-base text-right tabular-nums font-medium ${pnlColor(m.total_ret)}`}>{fmtPct2(m.total_ret)}</td>
                      </tr>,
                    ];
                    if (isExpanded) {
                      rows.push(
                        <tr key={`sp1h-${m.month}`} className="border-b border-border/20 bg-muted/10">
                          <td className="px-4 py-1.5 pl-8 text-xs text-muted-foreground" colSpan={2}>銘柄</td>
                          <td className="px-4 py-1.5 text-xs text-muted-foreground text-right">前日上昇率</td>
                          <td className="px-4 py-1.5 text-xs text-muted-foreground text-right">寄値(売)</td>
                          <td className="px-4 py-1.5 text-xs text-muted-foreground text-right">引値(買戻)</td>
                          <td className="px-4 py-1.5 text-xs text-muted-foreground text-right">PnL(100株)</td>
                          <td className="px-4 py-1.5 text-xs text-muted-foreground text-right">PnL(%)</td>
                        </tr>
                      );
                      m.picks.forEach((p, pi) => {
                        rows.push(
                          <tr key={`sp1p-${m.month}-${pi}`} className="border-b border-border/10 hover:bg-muted/30 transition-colors h-9">
                            <td className="px-4 py-1.5 pl-8 text-sm tabular-nums">{p.code}</td>
                            <td className="px-4 py-1.5 text-sm text-muted-foreground truncate max-w-[140px]">{p.name}</td>
                            <td className={`px-4 py-1.5 text-sm text-right tabular-nums ${pnlColor(p.prev_day_ret)}`}>{fmtPct2(p.prev_day_ret)}</td>
                            <td className="px-4 py-1.5 text-sm text-right tabular-nums">{fmtInt(p.entry_price)}</td>
                            <td className="px-4 py-1.5 text-sm text-right tabular-nums">{fmtInt(p.exit_price)}</td>
                            <td className={`px-4 py-1.5 text-sm text-right tabular-nums font-medium ${pnlColor(p.pnl_100)}`}>{fmtPnl(p.pnl_100)}</td>
                            <td className={`px-4 py-1.5 text-sm text-right tabular-nums font-medium ${pnlColor(p.ret_pct)}`}>{fmtPct2(p.ret_pct)}</td>
                          </tr>
                        );
                      });
                    }
                    return rows;
                  })}
                </tbody>
              </table>
            </div>
          </>}
        </div>
      )}

      {/* Weekday Edge Results */}
      {weekday_edge && weekday_edge.stats_filtered?.total > 0 && (
          <div className="rounded-xl border border-border bg-card">
            <div className="px-4 py-2 border-b border-border/30 cursor-pointer flex items-center justify-between hover:bg-muted/30 transition-colors"
                 onClick={() => setWeekdayEdgeSectionOpen(v => !v)}>
              <p className="text-lg font-semibold">曜日×USエッジ — パフォーマンス</p>
              {weekdayEdgeSectionOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </div>
            {weekdayEdgeSectionOpen && <>
              {/* Year summary bar */}
              <div className="px-4 py-2 flex flex-wrap gap-4 text-sm border-b border-border/20">
                {(weekday_edge.yearly ?? []).slice().reverse().map(y => (
                  <span key={y.year} className="tabular-nums">
                    {y.year} <span className={`font-medium ${pnlColor(y.total_pnl_100)}`}>{fmtPnl(y.total_pnl_100)}</span>
                    <span className="text-muted-foreground ml-1">PF {y.pf?.toFixed(2) ?? '—'}</span>
                  </span>
                ))}
              </div>
              {/* Tab buttons */}
              <div className="flex gap-1 px-4 py-2 border-b border-border/20">
                {[
                  { key: 'daily', label: '日別' },
                  { key: 'weekly', label: '週別' },
                  { key: 'monthly', label: '月別' },
                  { key: 'weekday', label: '曜日別' },
                ].map(({ key, label }) => (
                  <button key={key}
                    onClick={() => { setWeekdayEdgeView(key); setExpandedWeekdayWeeks(new Set()); }}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${weekdayEdgeView === key ? 'bg-primary/20 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/30'}`}>
                    {label}
                  </button>
                ))}
              </div>
              {/* Stock breakdown */}
              <details className="px-4 py-2 border-b border-border/20">
                <summary className="text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors">銘柄別パフォーマンス</summary>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs text-muted-foreground border-b border-border/30">
                        <th className="px-3 py-1.5 text-left">銘柄</th>
                        <th className="px-3 py-1.5 text-center">曜日</th>
                        <th className="px-3 py-1.5 text-center">方向</th>
                        <th className="px-3 py-1.5 text-right">N</th>
                        <th className="px-3 py-1.5 text-right">WR</th>
                        <th className="px-3 py-1.5 text-right">PF</th>
                        <th className="px-3 py-1.5 text-right">PnL(100株)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(weekday_edge.stock_stats ?? []).map(s => (
                        <tr key={`${s.code}-${s.dow}`} className="border-b border-border/10 hover:bg-muted/30 transition-colors h-8">
                          <td className="px-3 py-1 text-sm">{s.name} <span className="text-xs text-muted-foreground">{s.code}</span></td>
                          <td className="px-3 py-1 text-sm text-center">{s.dow_label}</td>
                          <td className="px-3 py-1 text-sm text-center"><span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${s.direction === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{s.direction}</span></td>
                          <td className="px-3 py-1 text-sm text-right tabular-nums">{s.n_filtered}</td>
                          <td className="px-3 py-1 text-sm text-right tabular-nums">{s.stats_filtered?.wr?.toFixed(1) ?? '—'}%</td>
                          <td className="px-3 py-1 text-sm text-right tabular-nums">{s.stats_filtered?.pf?.toFixed(2) ?? '—'}</td>
                          <td className={`px-3 py-1 text-sm text-right tabular-nums font-medium ${pnlColor(s.stats_filtered?.total_pnl_100)}`}>{fmtPnl(s.stats_filtered?.total_pnl_100)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>

              {/* === 日別 === */}
              {weekdayEdgeView === 'daily' && (
                <div className="overflow-x-auto">
                  {weGrouped.daily.map(g => {
                    const isOpen = expandedWeekdayWeeks.has(g.key);
                    return (
                      <div key={g.key} className="border-b border-border/20">
                        <button onClick={() => toggleWeekdayWeek(g.key)}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted/30 transition-colors">
                          <span className="text-muted-foreground/60">{isOpen ? '▼' : '▶'}</span>
                          <span className="font-medium min-w-[90px] text-left tabular-nums">{fmtDateWd(g.key)}</span>
                          <span className="text-muted-foreground">N={g.n}</span>
                          <span className={g.wr >= 55 ? 'text-emerald-400' : g.wr < 45 ? 'text-rose-400' : 'text-muted-foreground'}>勝率{g.wr}%</span>
                          <span className={g.pf != null && g.pf >= 1.5 ? 'text-teal-400' : g.pf != null && g.pf < 1 ? 'text-rose-400' : 'text-muted-foreground'}>PF {g.pf?.toFixed(2) ?? '—'}</span>
                          <span className={`tabular-nums ${pnlColor(g.total_pnl)}`}>{fmtPnl(g.total_pnl)}</span>
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-2">
                            <table className="w-full text-sm">
                              <thead><tr className="border-b border-border/40">
                                <th className="px-2 py-1 text-left text-muted-foreground">銘柄</th>
                                <th className="px-2 py-1 text-center text-muted-foreground">方向</th>
                                <th className="px-2 py-1 text-right text-muted-foreground">始値</th>
                                <th className="px-2 py-1 text-right text-muted-foreground">終値</th>
                                <th className="px-2 py-1 text-right text-muted-foreground">PnL(100株)</th>
                                <th className="px-2 py-1 text-right text-muted-foreground">PnL(%)</th>
                                <th className="px-2 py-1 text-right text-muted-foreground">US前夜</th>
                              </tr></thead>
                              <tbody>
                                {g.picks.map((p, pi) => (
                                  <tr key={pi} className="border-b border-border/10 hover:bg-muted/20">
                                    <td className="px-2 py-1">{p.name} <span className="text-xs text-muted-foreground">{p.code}</span></td>
                                    <td className="px-2 py-1 text-center"><span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${p.direction === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{p.direction}</span></td>
                                    <td className="px-2 py-1 text-right tabular-nums">{fmtPrice(p.adj_open)}</td>
                                    <td className="px-2 py-1 text-right tabular-nums">{fmtPrice(p.adj_close)}</td>
                                    <td className={`px-2 py-1 text-right tabular-nums font-medium ${pnlColor(p.pnl_100)}`}>{fmtPnl(p.pnl_100)}</td>
                                    <td className={`px-2 py-1 text-right tabular-nums ${pnlColor(p.ret_pct)}`}>{fmtPct2(p.ret_pct)}</td>
                                    <td className={`px-2 py-1 text-right tabular-nums ${pnlColor(p.us_prev_ret)}`}>{p.us_prev_ret != null ? `${p.us_prev_ret > 0 ? '+' : ''}${p.us_prev_ret.toFixed(2)}%` : '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* === 週別 === */}
              {weekdayEdgeView === 'weekly' && (
                <div className="overflow-x-auto">
                  {(weekday_edge.weekly ?? []).slice().reverse().map(w => {
                    const isOpen = expandedWeekdayWeeks.has(w.week);
                    const agg = weAggregate(w.picks);
                    return (
                      <div key={w.week} className="border-b border-border/20">
                        <button onClick={() => toggleWeekdayWeek(w.week)}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted/30 transition-colors">
                          <span className="text-muted-foreground/60">{isOpen ? '▼' : '▶'}</span>
                          <span className="font-medium min-w-[80px] text-left tabular-nums">{w.week}</span>
                          <span className="text-muted-foreground tabular-nums">{fmtDateWd(w.start_date)}→{fmtDateWd(w.end_date)}</span>
                          <span className="text-muted-foreground">N={w.n_trades}</span>
                          <span className={agg.wr >= 55 ? 'text-emerald-400' : agg.wr < 45 ? 'text-rose-400' : 'text-muted-foreground'}>勝率{agg.wr}%</span>
                          <span className={agg.pf != null && agg.pf >= 1.5 ? 'text-teal-400' : agg.pf != null && agg.pf < 1 ? 'text-rose-400' : 'text-muted-foreground'}>PF {agg.pf?.toFixed(2) ?? '—'}</span>
                          <span className={`tabular-nums ${pnlColor(w.total_pnl_100)}`}>{fmtPnl(w.total_pnl_100)}</span>
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-2">
                            <table className="w-full text-sm">
                              <thead><tr className="border-b border-border/40">
                                <th className="px-2 py-1 text-left text-muted-foreground">日付</th>
                                <th className="px-2 py-1 text-left text-muted-foreground">銘柄</th>
                                <th className="px-2 py-1 text-center text-muted-foreground">方向</th>
                                <th className="px-2 py-1 text-right text-muted-foreground">PnL(100株)</th>
                                <th className="px-2 py-1 text-right text-muted-foreground">PnL(%)</th>
                              </tr></thead>
                              <tbody>
                                {w.picks.map((p, pi) => (
                                  <tr key={pi} className="border-b border-border/10 hover:bg-muted/20">
                                    <td className="px-2 py-1 tabular-nums">{fmtDateWd(p.date)}</td>
                                    <td className="px-2 py-1 text-muted-foreground">{p.name} <span className="text-xs">{p.code}</span></td>
                                    <td className="px-2 py-1 text-center"><span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${p.direction === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{p.direction}</span></td>
                                    <td className={`px-2 py-1 text-right tabular-nums font-medium ${pnlColor(p.pnl_100)}`}>{fmtPnl(p.pnl_100)}</td>
                                    <td className={`px-2 py-1 text-right tabular-nums ${pnlColor(p.ret_pct)}`}>{fmtPct2(p.ret_pct)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* === 月別 === */}
              {weekdayEdgeView === 'monthly' && (
                <div className="overflow-x-auto">
                  {weGrouped.monthly.map(g => {
                    const isOpen = expandedWeekdayWeeks.has(g.key);
                    return (
                      <div key={g.key} className="border-b border-border/20">
                        <button onClick={() => toggleWeekdayWeek(g.key)}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted/30 transition-colors">
                          <span className="text-muted-foreground/60">{isOpen ? '▼' : '▶'}</span>
                          <span className="font-medium min-w-[70px] text-left">{g.key}</span>
                          <span className="text-muted-foreground">N={g.n}</span>
                          <span className={g.wr >= 55 ? 'text-emerald-400' : g.wr < 45 ? 'text-rose-400' : 'text-muted-foreground'}>勝率{g.wr}%</span>
                          <span className={g.pf != null && g.pf >= 1.5 ? 'text-teal-400' : g.pf != null && g.pf < 1 ? 'text-rose-400' : 'text-muted-foreground'}>PF {g.pf?.toFixed(2) ?? '—'}</span>
                          <span className={`tabular-nums ${pnlColor(g.total_pnl)}`}>{fmtPnl(g.total_pnl)}</span>
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-2">
                            <table className="w-full text-sm">
                              <thead><tr className="border-b border-border/40">
                                <th className="px-2 py-1 text-left text-muted-foreground">日付</th>
                                <th className="px-2 py-1 text-left text-muted-foreground">銘柄</th>
                                <th className="px-2 py-1 text-center text-muted-foreground">方向</th>
                                <th className="px-2 py-1 text-right text-muted-foreground">PnL(100株)</th>
                                <th className="px-2 py-1 text-right text-muted-foreground">PnL(%)</th>
                                <th className="px-2 py-1 text-right text-muted-foreground">US前夜</th>
                              </tr></thead>
                              <tbody>
                                {g.picks.map((p, pi) => (
                                  <tr key={pi} className="border-b border-border/10 hover:bg-muted/20">
                                    <td className="px-2 py-1 tabular-nums">{fmtDateWd(p.date)}</td>
                                    <td className="px-2 py-1 text-muted-foreground">{p.name} <span className="text-xs">{p.code}</span></td>
                                    <td className="px-2 py-1 text-center"><span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${p.direction === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{p.direction}</span></td>
                                    <td className={`px-2 py-1 text-right tabular-nums font-medium ${pnlColor(p.pnl_100)}`}>{fmtPnl(p.pnl_100)}</td>
                                    <td className={`px-2 py-1 text-right tabular-nums ${pnlColor(p.ret_pct)}`}>{fmtPct2(p.ret_pct)}</td>
                                    <td className={`px-2 py-1 text-right tabular-nums ${pnlColor(p.us_prev_ret)}`}>{p.us_prev_ret != null ? `${p.us_prev_ret > 0 ? '+' : ''}${p.us_prev_ret.toFixed(2)}%` : '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* === 曜日別 === */}
              {weekdayEdgeView === 'weekday' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/30 text-muted-foreground">
                        <th className="px-4 py-2 text-left">曜日</th>
                        <th className="px-4 py-2 text-center">方向</th>
                        <th className="px-4 py-2 text-right">N</th>
                        <th className="px-4 py-2 text-right">勝率</th>
                        <th className="px-4 py-2 text-right">PF</th>
                        <th className="px-4 py-2 text-right">PnL(100株)</th>
                        <th className="px-4 py-2 text-right">PnL(%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weGrouped.weekday.flatMap(g => {
                        const rows: React.ReactNode[] = [];
                        if (g.long.n > 0) rows.push(
                          <tr key={`${g.key}-L`} className="border-b border-border/10 hover:bg-muted/20">
                            <td className="px-4 py-1.5 font-medium">{g.key}</td>
                            <td className="px-4 py-1.5 text-center"><span className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400">LONG</span></td>
                            <td className="px-4 py-1.5 text-right tabular-nums">{g.long.n}</td>
                            <td className={`px-4 py-1.5 text-right tabular-nums ${g.long.wr >= 55 ? 'text-emerald-400' : g.long.wr < 45 ? 'text-rose-400' : ''}`}>{g.long.wr}%</td>
                            <td className={`px-4 py-1.5 text-right tabular-nums ${g.long.pf != null && g.long.pf >= 1.5 ? 'text-teal-400' : g.long.pf != null && g.long.pf < 1 ? 'text-rose-400' : ''}`}>{g.long.pf?.toFixed(2) ?? '—'}</td>
                            <td className={`px-4 py-1.5 text-right tabular-nums font-medium ${pnlColor(g.long.total_pnl)}`}>{fmtPnl(g.long.total_pnl)}</td>
                            <td className={`px-4 py-1.5 text-right tabular-nums ${pnlColor(g.long.total_ret)}`}>{fmtPct2(g.long.total_ret)}</td>
                          </tr>
                        );
                        if (g.short.n > 0) rows.push(
                          <tr key={`${g.key}-S`} className="border-b border-border/10 hover:bg-muted/20">
                            <td className="px-4 py-1.5 font-medium">{rows.length === 0 ? g.key : ''}</td>
                            <td className="px-4 py-1.5 text-center"><span className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">SHORT</span></td>
                            <td className="px-4 py-1.5 text-right tabular-nums">{g.short.n}</td>
                            <td className={`px-4 py-1.5 text-right tabular-nums ${g.short.wr >= 55 ? 'text-emerald-400' : g.short.wr < 45 ? 'text-rose-400' : ''}`}>{g.short.wr}%</td>
                            <td className={`px-4 py-1.5 text-right tabular-nums ${g.short.pf != null && g.short.pf >= 1.5 ? 'text-teal-400' : g.short.pf != null && g.short.pf < 1 ? 'text-rose-400' : ''}`}>{g.short.pf?.toFixed(2) ?? '—'}</td>
                            <td className={`px-4 py-1.5 text-right tabular-nums font-medium ${pnlColor(g.short.total_pnl)}`}>{fmtPnl(g.short.total_pnl)}</td>
                            <td className={`px-4 py-1.5 text-right tabular-nums ${pnlColor(g.short.total_ret)}`}>{fmtPct2(g.short.total_ret)}</td>
                          </tr>
                        );
                        rows.push(
                          <tr key={`${g.key}-total`} className="border-b border-border/20 bg-muted/10">
                            <td className="px-4 py-1.5 font-medium text-muted-foreground">{rows.length <= 1 ? g.key : ''} 合計</td>
                            <td className="px-4 py-1.5"></td>
                            <td className="px-4 py-1.5 text-right tabular-nums font-medium">{g.n}</td>
                            <td className={`px-4 py-1.5 text-right tabular-nums font-medium ${g.wr >= 55 ? 'text-emerald-400' : g.wr < 45 ? 'text-rose-400' : ''}`}>{g.wr}%</td>
                            <td className={`px-4 py-1.5 text-right tabular-nums font-medium ${g.pf != null && g.pf >= 1.5 ? 'text-teal-400' : g.pf != null && g.pf < 1 ? 'text-rose-400' : ''}`}>{g.pf?.toFixed(2) ?? '—'}</td>
                            <td className={`px-4 py-1.5 text-right tabular-nums font-medium ${pnlColor(g.total_pnl)}`}>{fmtPnl(g.total_pnl)}</td>
                            <td className={`px-4 py-1.5 text-right tabular-nums font-medium ${pnlColor(g.total_ret)}`}>{fmtPct2(g.total_ret)}</td>
                          </tr>
                        );
                        return rows;
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>}
          </div>
      )}

      {/* Year Summary + Trade Detail */}
      <div className="rounded-xl border border-border bg-card">
        <div className="px-4 py-2 border-b border-border/30 cursor-pointer flex items-center justify-between hover:bg-muted/30 transition-colors"
             onClick={() => setEtfSectionOpen(v => !v)}>
          <p className="text-lg font-semibold">1306 ETF 四半期末 — 年間サマリー</p>
          {etfSectionOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
        {etfSectionOpen && <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border/30">
                <th className="px-4 py-2 text-left">年</th>
                <th className="px-4 py-2 text-right">Trades</th>
                <th className="px-4 py-2 text-right">WR</th>
                <th className="px-4 py-2 text-right">PnL(1000株)</th>
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
                    <td className={`px-4 py-2 text-sm md:text-base text-right tabular-nums font-medium ${pnlColor(ys.pnl_1000)}`}>{fmtPnl(ys.pnl_1000)}</td>
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
                      <td className="px-4 py-1 pl-8 text-[10px] md:text-[11px] text-muted-foreground">Entry日</td>
                      <td className="px-4 py-1 text-[10px] md:text-[11px] text-muted-foreground text-left" colSpan={2}>Exit日</td>
                      <td className="px-4 py-1 text-[10px] md:text-[11px] text-muted-foreground text-right">Entry</td>
                      <td className="px-4 py-1 text-[10px] md:text-[11px] text-muted-foreground text-right">Exit</td>
                      <td className="px-4 py-1 text-[10px] md:text-[11px] text-muted-foreground text-right">PnL(1000株)</td>
                      <td className="px-4 py-1 text-[10px] md:text-[11px] text-muted-foreground text-right">PnL(%)</td>
                      <td></td>
                    </tr>
                  );
                  yearTrades.forEach(t => {
                    rows.push(
                      <tr key={`t-${t.entry_date}`} className="border-b border-border/10 hover:bg-muted/30 transition-colors h-9">
                        <td className="px-4 py-1.5 pl-8 text-xs md:text-sm tabular-nums">{t.entry_date} ({getWeekday(t.entry_date)})</td>
                        <td className="px-4 py-1.5 text-xs md:text-sm tabular-nums text-muted-foreground text-left" colSpan={2}>{t.exit_date} ({getWeekday(t.exit_date)})</td>
                        <td className="px-4 py-1.5 text-xs md:text-sm text-right tabular-nums">{fmtPrice(t.entry_price)}</td>
                        <td className="px-4 py-1.5 text-xs md:text-sm text-right tabular-nums">{fmtPrice(t.exit_price)}</td>
                        <td className={`px-4 py-1.5 text-xs md:text-sm text-right tabular-nums font-medium ${pnlColor(t.pnl_1000)}`}>{fmtPnl(t.pnl_1000)}</td>
                        <td className={`px-4 py-1.5 text-xs md:text-sm text-right tabular-nums ${pnlColor(t.ret_pct)}`}>{fmtPct(t.ret_pct)}</td>
                        <td></td>
                      </tr>
                    );
                  });
                }
                return rows;
              })}
            </tbody>
          </table>
        </div>}
      </div>
    </div>
  );
}
