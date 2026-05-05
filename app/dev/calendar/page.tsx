'use client';

import { useEffect, useState } from 'react';
import { DevNavLinks } from '../../../components/dev';
import { RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';

// === Types ===
interface UpcomingEvent { date: string; flags: string[]; }
interface EtfLatest { date: string; close: number; prev_close: number | null; change: number | null; change_pct: number | null; }
interface Trade { entry_date: string; exit_date: string; month: number; year: number; ret_pct: number; entry_price: number | null; exit_price: number | null; pnl_1000: number | null; }
interface YearSummary { year: number; n: number; wins: number; wr: number; total_ret: number; pnl_1000: number | null; pf: number | null; max_dd: number; }
interface Stats { total: number; wins: number; losses: number; wr: number; avg: number; median: number; max: number; min: number; pf: number; total_ret: number; pnl_1000: number; }
interface Sq4Stats { total: number; wins: number; losses: number; wr: number; avg_ret: number; pf: number | null; total_ret: number; total_pnl_100: number; }
interface Sq4Pick { code: string; name: string; prev_close: number; entry_price: number; exit_price: number; gap_pct: number; ret_pct: number; pnl_100: number; entry_date?: string; exit_date?: string; }
interface Sq4Monthly { month: string; entry_date: string; exit_date: string; n_picks: number; total_ret: number; total_pnl_100: number; cme_change: number | null; cme_ret: number | null; picks: Sq4Pick[]; }
interface MaxDD { amount: number; pct: number; }
interface CmeLatest { date: string; close: number; prev_close: number; change: number; change_pct: number; }
interface Sq4Data { stats: Sq4Stats; stats_by_price: Record<string, Sq4Stats>; stats_cme_down: Sq4Stats; stats_cme_up: Sq4Stats; max_dd: MaxDD; max_dd_cme_down: MaxDD; next_sq4: { entry_date: string; exit_date: string | null } | null; candidates: { as_of: string; count: number; price_5000_plus: number; price_under_5000: number }; monthly: Sq4Monthly[]; }
interface CalendarResponse {
  today: { flags: string[] };
  upcoming: UpcomingEvent[];
  etf_latest: EtfLatest;
  cme_latest: CmeLatest;
  etf1306: { stats: Stats; max_dd: MaxDD; year_summary: YearSummary[]; trades: Trade[]; };
  sq4: Sq4Data;
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
  flag.includes('決済') ? 'bg-amber-500/20 text-amber-400' :
  'bg-white/5 text-muted-foreground';

const isQFlag = (flag: string) => /^\dQ/.test(flag);

export default function CalendarPage() {
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const [expandedSq4Months, setExpandedSq4Months] = useState<Set<string>>(new Set());

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

  const { today, upcoming, etf_latest, cme_latest, etf1306, sq4 } = data;
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
      {/* Nav + Refresh */}
      <div className="flex items-center justify-between">
        <DevNavLinks />
        <button onClick={handleRefresh} disabled={refreshing}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <h1 className="text-xl font-bold">Calendar Trades</h1>

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

      {/* Upcoming — SQ-4 + Q統合 */}
      {(upcomingEtf.length > 0 || (sq4?.next_sq4)) && (() => {
        const getFriday = (dateStr: string) => {
          const d = new Date(dateStr);
          const day = d.getDay();
          const diff = day === 0 ? 2 : day === 6 ? 1 : day === 1 ? 3 : day;
          d.setDate(d.getDate() - diff + 5);
          if (d.getDay() !== 5) d.setDate(d.getDate() - (d.getDay() - 5 + 7) % 7);
          return d;
        };
        const cmeCheckDate = sq4?.next_sq4 ? (() => {
          const entry = new Date(sq4.next_sq4.entry_date);
          const fri = new Date(entry);
          fri.setDate(entry.getDate() - ((entry.getDay() + 6) % 7) - 2);
          if (fri.getDay() !== 5) {
            const diff = (fri.getDay() + 2) % 7;
            fri.setDate(fri.getDate() - diff);
          }
          // Simply: Friday before entry
          const d = new Date(sq4.next_sq4.entry_date);
          while (d.getDay() !== 5) d.setDate(d.getDate() - 1);
          return d;
        })() : null;

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
                {/* SQ-4 CME確認 */}
                {sq4?.next_sq4 && cmeCheckDate && (
                  <tr className="border-b border-border/10 hover:bg-muted/50 transition-colors h-9 md:h-12">
                    <td className="px-4 py-1.5 text-sm md:text-base tabular-nums">{`${cmeCheckDate.getMonth() + 1}/${cmeCheckDate.getDate()}(${WEEKDAYS[cmeCheckDate.getDay()]})`}</td>
                    <td className="px-4 py-1.5">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs md:text-sm font-medium bg-blue-500/20 text-blue-400">SQ-4 判定</span>
                    </td>
                    <td className="px-4 py-1.5 text-sm md:text-base text-muted-foreground">CME確認</td>
                    <td className="px-4 py-1.5 text-sm md:text-base text-right tabular-nums">{sq4.stats_cme_down?.pf?.toFixed(2) ?? '—'}</td>
                  </tr>
                )}
                {/* SQ-4 entry */}
                {sq4?.next_sq4 && (
                  <tr className="border-b border-border/10 hover:bg-muted/50 transition-colors h-9 md:h-12">
                    <td className="px-4 py-1.5 text-sm md:text-base tabular-nums">{fmtDateWd(sq4.next_sq4.entry_date)}</td>
                    <td className="px-4 py-1.5">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs md:text-sm font-medium bg-emerald-500/20 text-emerald-400">SQ-4 買い</span>
                      <span className="ml-2 text-xs text-muted-foreground">→ {sq4.next_sq4.exit_date ? fmtDateWd(sq4.next_sq4.exit_date) : '?'}</span>
                    </td>
                    <td className="px-4 py-1.5 text-sm md:text-base text-muted-foreground">寄成</td>
                    <td className="px-4 py-1.5 text-sm md:text-base text-right tabular-nums text-muted-foreground">—</td>
                  </tr>
                )}
                {/* Q events */}
                {upcomingEtf.map((ev, i) => {
                  const hasBuy = ev.flags.some(f => f.includes('買い'));
                  const hasSell = ev.flags.some(f => f.includes('決済'));
                  const action = hasBuy && hasSell ? '引成(売+買)' : hasBuy ? '引成' : hasSell ? '引成' : '';
                  const showPf = i === 0 && stats.pf;
                  return (
                  <tr key={i} className="border-b border-border/10 hover:bg-muted/50 transition-colors h-9 md:h-12">
                    <td className="px-4 py-1.5 text-sm md:text-base tabular-nums">{fmtDateWd(ev.date)}</td>
                    <td className="px-4 py-1.5">
                      <div className="flex items-center gap-1.5">
                        {ev.flags.map((f, fi) => (
                          <span key={fi} className={`inline-flex px-2 py-0.5 rounded text-xs md:text-sm font-medium ${flagStyle(f)}`}>{f}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-1.5 text-sm md:text-base text-muted-foreground">{action}</td>
                    <td className="px-4 py-1.5 text-sm md:text-base text-right tabular-nums">{showPf ? stats.pf.toFixed(2) : '—'}</td>
                  </tr>
                  );
                })}
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
            <div className="px-4 py-2 border-b border-border/30">
              <p className="text-lg font-semibold">SQ-4 Gap-down Top10 — 月次結果</p>
            </div>
            <div className="overflow-x-auto">
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
                          <td className="px-4 py-1.5 text-xs text-muted-foreground text-right">Gap</td>
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
                            <td className={`px-4 py-1.5 text-sm text-right tabular-nums ${pnlColor(p.gap_pct)}`}>{fmtPct2(p.gap_pct)}</td>
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
            </div>
          </div>
        </>
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
        </div>
      </div>
    </div>
  );
}
