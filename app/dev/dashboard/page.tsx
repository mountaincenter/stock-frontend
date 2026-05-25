'use client';

import { useEffect, useState } from 'react';
import { DevNavLinks } from '../../../components/dev';
import { RefreshCw } from 'lucide-react';

// Pairs
interface PairSignal {
  tk1: string; tk2: string;
  name1: string; name2: string;
  c1: number; c2: number;
  z_latest: number; z_abs: number;
  lookback: number;
  shares1: number; shares2: number;
  notional1: number; notional2: number;
  imbalance_pct: number;
  full_pf: number; full_n: number;
  revert_1d: number; half_life?: number;
  is_entry: boolean; direction: string;
  signal_date: string;
}
interface PairsResponse {
  pairs: PairSignal[];
  entry?: PairSignal[];
  hot?: PairSignal[];
  signal_date: string | null;
  total: number;
  entry_count?: number;
  hot_count?: number;
}

// Grok
interface GrokStock {
  ticker: string;
  stock_name: string;
  grok_rank: number | null;
  close: number | null;
  price_diff: number | null;
  prob_up: number | null;
  prob_bin: string | null;
  expected_pf: number | null;
  expected_pnl_avg: number | null;
  expected_wr: number | null;
  credit_bucket: string | null;
  shortable: boolean;
  day_trade: boolean;
  ng: boolean;
  day_trade_available_shares: number | null;
  max_cost_100: number | null;
  short_recommended: boolean;
  reason_category: string | null;
}
interface GrokResponse {
  total: number;
  stocks: GrokStock[];
  market?: { futures_change_pct: number | null; nikkei_change_pct: number | null };
  weekday_rule?: { label?: string; direction?: string; allowed?: boolean };
}

// Calendar
interface CalendarCandidate {
  date: string; code: string; name: string; strategy: string;
  direction: string; pf: number | null; execution: string;
  prev_close: number | null; prev_day_ret: number | null;
  excluded: boolean; exclude_reason: string | null;
}
interface CalendarResponse {
  today: { flags: string[] };
  upcoming: Array<{ date: string; flags: string[] }>;
  next_trading_date: string | null;
  etf_latest: { close: number; change_pct: number | null };
  sp500_latest?: { date?: string; change_pct?: number | null };
  sq4: {
    stats_cme_down: { pf: number | null } | null;
    next_sq4: { entry_date: string } | null;
    candidates: { picks?: Array<{ code: string; name: string; prev_close: number; ret_5d: number }> };
  };
  sq_plus1: {
    stats: { pf: number | null };
    next_sq_plus1: { entry_date: string; picks?: Array<{ code: string; name: string; prev_close: number; prev_day_ret: number }>; cme_direction?: string } | null;
  };
  etf1306: { stats: { pf: number } };
  weekday_edge: {
    stock_stats: Array<{ code: string; stats_filtered: { pf: number | null } }>;
    next_entries: Array<{
      date: string;
      code: string;
      name: string;
      direction: string;
      dow_label: string;
      prev_close: number | null;
      prev_day_ret: number | null;
      exit_rule?: string;
      expected_pf?: number | null;
      earnings_alert?: string | null;
    }>;
  };
}

// Strategy Matrix
interface StrategyWeekdayStats { n: number; wins: number; wr: number; pf: number | null; total_pnl: number; }
interface StrategyMatrixResponse {
  generated_at: string | null;
  weekdays: string[];
  strategies: {
    grok_short: { label: string; by_weekday: Record<string, StrategyWeekdayStats> };
    grok_short_seido?: { label: string; by_weekday: Record<string, StrategyWeekdayStats> };
    grok_short_daytrade?: { label: string; by_weekday: Record<string, StrategyWeekdayStats> };
    weekday_edge: { label: string; by_weekday: Record<string, StrategyWeekdayStats> };
    pairs: { label: string; by_weekday: Record<string, StrategyWeekdayStats> };
    calendar: { label: string; summary: Record<string, { pf: number | null; n: number; wr: number }> };
  };
  ratings: Record<string, Record<string, string>>;
}

interface UnifiedRecommendation {
  source: 'Calendar' | 'Pair' | 'Grok';
  date: string | null;
  code: string;
  name: string;
  pairCode?: string;
  pairName?: string;
  direction: string;
  strategy: string;
  pf: number | null;
  rank?: number | null;
  price: number | null;
  pairPrice?: number | null;
  execution: string;
  note: string;
  excluded?: boolean;
}

interface RealtimeQuote {
  price: number | null;
  open: number | null;
  marketState: string | null;
  marketTime: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

// === Helpers ===
const parseDateUtc = (s: string) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const isUsFilterReady = (entryDate: string, spDate?: string | null) => {
  if (!entryDate || !spDate) return false;
  const entryMs = parseDateUtc(entryDate);
  const spMs = parseDateUtc(spDate);
  const diffDays = Math.floor((entryMs - spMs) / 86400000);
  const entryDow = new Date(entryMs).getUTCDay();
  return diffDays === (entryDow === 1 ? 3 : 1);
};
const passesWeekdayUsFilter = (direction: string, spPct?: number | null) => {
  if (spPct == null) return false;
  return direction === 'LONG' ? spPct <= 0 : spPct >= 0;
};
const fmt = (v: number | null | undefined) => (v ?? 0).toLocaleString('ja-JP');
const fmtZ = (v: number) => <span className={Math.abs(v) >= 2.0 ? (v > 0 ? 'text-price-down' : 'text-price-up') : Math.abs(v) >= 1.5 ? 'text-amber-400' : 'text-muted-foreground'}>{v >= 0 ? '+' : ''}{v.toFixed(2)}</span>;
const toYahooTicker = (code: string) => code.includes('.') ? code : `${code}.T`;

// === Sortable ===
type SortDir = 'asc' | 'desc' | null;
function useSortable<T>(data: T[], defaultKey?: keyof T) {
  const [sortKey, setSortKey] = useState<keyof T | null>(defaultKey ?? null);
  const [sortDir, setSortDir] = useState<SortDir>(defaultKey ? 'desc' : null);
  const toggle = (key: keyof T) => {
    if (sortKey === key) {
      setSortDir(d => d === 'desc' ? 'asc' : d === 'asc' ? null : 'desc');
      if (sortDir === 'asc') setSortKey(null);
    } else { setSortKey(key); setSortDir('desc'); }
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
        {sortKey === field ? (sortDir === 'desc' ? ' ▼' : ' ▲') : ''}
      </span>
    </span>
  </th>
);

// === Layout Components ===
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

const EmptyState = ({ message }: { message: string }) => (
  <div className="px-4 py-8 text-center text-muted-foreground text-sm">{message}</div>
);

const TickerLink = ({ ticker }: { ticker: string }) => (
  <button type="button" className="hover:text-primary font-semibold text-foreground"
    onClick={() => window.open(`/dev/${ticker.replace('.T', '')}`, 'stock-detail')}>
    {ticker.replace('.T', '')}
  </button>
);

// === Main ===
export default function DashboardPage() {
  const [pairsData, setPairsData] = useState<PairsResponse | null>(null);
  const [calendarData, setCalendarData] = useState<CalendarResponse | null>(null);
  const [grokData, setGrokData] = useState<GrokResponse | null>(null);
  const [matrixData, setMatrixData] = useState<StrategyMatrixResponse | null>(null);
  const [realtimeData, setRealtimeData] = useState<Record<string, RealtimeQuote>>({});
  const [realtimeLoading, setRealtimeLoading] = useState(false);
  const [realtimeTimestamp, setRealtimeTimestamp] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const buildCalendarCandidates = (cal: CalendarResponse): CalendarCandidate[] => {
    const rows: CalendarCandidate[] = [];
    const { weekday_edge, sq4, sq_plus1, upcoming, etf_latest, etf1306, next_trading_date, sp500_latest } = cal;
    const targetDate = next_trading_date;
    if (!targetDate) return [];
    const sqPlus1SegPf = (ret: number): number | null => {
      if (ret > 10) return 1.84; if (ret > 7) return 2.85; if (ret > 5) return 2.09;
      if (ret > 3) return 1.71; if (ret > 2) return 0.44; return null;
    };
    const wePfMap: Record<string, number | null> = {};
    for (const s of weekday_edge?.stock_stats ?? []) wePfMap[s.code] = s.stats_filtered?.pf ?? null;
    for (const e of weekday_edge?.next_entries ?? []) {
      if (e.date !== targetDate) continue;
      const usReady = isUsFilterReady(e.date, sp500_latest?.date);
      const usPassed = passesWeekdayUsFilter(e.direction, sp500_latest?.change_pct);
      rows.push({ date: e.date, code: e.code.replace(/0$/, ''), name: e.name,
        strategy: `曜日${e.direction}(${e.dow_label})`, direction: e.direction,
        pf: e.expected_pf ?? wePfMap[e.code] ?? null, execution: e.exit_rule ?? '寄成IN→引成OUT',
        prev_close: e.prev_close ?? null, prev_day_ret: e.prev_day_ret ?? null,
        excluded: usReady && !usPassed,
        exclude_reason: !usReady
          ? 'US判定待ち'
          : !usPassed
            ? 'US条件未成立'
            : e.earnings_alert ?? null });
    }
    if (sq4?.next_sq4?.entry_date === targetDate) {
      const picks = sq4.candidates?.picks;
      if (picks?.length) {
        for (const p of picks) {
          rows.push({ date: sq4.next_sq4.entry_date, code: p.code, name: p.name,
            strategy: `SQ-4 (5日ret ${p.ret_5d > 0 ? '+' : ''}${p.ret_5d}%)`,
            direction: 'LONG', pf: sq4.stats_cme_down?.pf ?? null, execution: '寄成→翌寄成',
            prev_close: p.prev_close, prev_day_ret: null, excluded: false, exclude_reason: null });
        }
      }
    }
    const sp1Next = sq_plus1?.next_sq_plus1;
    if (sp1Next?.entry_date === targetDate) {
      const sp1Picks = sp1Next.picks;
      const cmeDir = sp1Next.cme_direction ?? '';
      if (sp1Picks?.length) {
        for (const p of sp1Picks) {
          const isCmeUpHigh = cmeDir === 'UP' && p.prev_close >= 5000;
          rows.push({ date: sp1Next.entry_date, code: p.code.replace(/0$/, ''), name: p.name,
            strategy: `SQ+1 (前日+${p.prev_day_ret}%)`, direction: 'SHORT',
            pf: isCmeUpHigh ? 0.63 : sqPlus1SegPf(p.prev_day_ret), execution: '寄成→引成',
            prev_close: p.prev_close, prev_day_ret: p.prev_day_ret,
            excluded: isCmeUpHigh, exclude_reason: isCmeUpHigh ? 'CME↑×5000+' : null });
        }
      }
    }
    const upcomingEtf = upcoming.filter(ev => ev.date === targetDate && ev.flags.some(f => f.includes('買い')));
    for (const ev of upcomingEtf) {
      const qLabel = ev.flags[0]?.match(/^\dQ/)?.[0] ?? 'Q';
      rows.push({ date: ev.date, code: '1306', name: 'TOPIX連動型上場投信',
        strategy: `${qLabel} 四半期末`, direction: 'LONG', pf: etf1306?.stats?.pf ?? null, execution: '引成',
        prev_close: etf_latest?.close ?? null, prev_day_ret: etf_latest?.change_pct ?? null,
        excluded: false, exclude_reason: null });
    }
    return rows.sort((a, b) => {
      if (a.excluded !== b.excluded) return a.excluded ? 1 : -1;
      return (b.pf ?? 0) - (a.pf ?? 0);
    });
  };

  const buildGrokCandidates = (grok: GrokResponse | null): GrokStock[] => {
    if (!grok?.stocks?.length) return [];
    return grok.stocks
      .filter((s) => !s.ng && (s.shortable || (s.day_trade && (s.day_trade_available_shares ?? 0) > 0)))
      .sort((a, b) => {
        const pfCmp = (b.expected_pf ?? -1) - (a.expected_pf ?? -1);
        if (pfCmp !== 0) return pfCmp;
        const pnlCmp = (b.expected_pnl_avg ?? -1_000_000) - (a.expected_pnl_avg ?? -1_000_000);
        if (pnlCmp !== 0) return pnlCmp;
        return (a.grok_rank ?? 999) - (b.grok_rank ?? 999);
      });
  };

  const buildUnifiedRecommendations = (): UnifiedRecommendation[] => {
    const rows: UnifiedRecommendation[] = [];
    const calRows = calendarData ? buildCalendarCandidates(calendarData) : [];
    for (const c of calRows) {
      rows.push({
        source: 'Calendar',
        date: c.date,
        code: c.code,
        name: c.name,
        direction: c.direction,
        strategy: c.strategy,
        pf: c.pf,
        price: c.prev_close,
        execution: c.execution,
        note: c.exclude_reason ?? '',
        excluded: c.excluded,
      });
    }

    for (const p of pairEntries) {
      const longFirst = p.direction === 'long_tk1';
      rows.push({
        source: 'Pair',
        date: p.signal_date,
        code: p.tk1.replace('.T', ''),
        name: p.name1,
        pairCode: p.tk2.replace('.T', ''),
        pairName: p.name2,
        direction: longFirst ? 'L/S' : 'S/L',
        strategy: `Pair |z| ${p.z_abs.toFixed(2)}`,
        pf: p.full_pf,
        price: p.c1,
        pairPrice: p.c2,
        execution: '寄成→引成',
        note: `${p.shares1}:${p.shares2} / 不均衡 ${p.imbalance_pct.toFixed(1)}%`,
      });
    }

    for (const g of buildGrokCandidates(grokData)) {
      rows.push({
        source: 'Grok',
        date: null,
        code: g.ticker.replace('.T', ''),
        name: g.stock_name,
        direction: 'SHORT',
        strategy: g.reason_category ?? 'Grok SHORT',
        pf: g.expected_pf,
        rank: g.grok_rank,
        price: g.close,
        execution: '寄成→引成',
        note: `${g.credit_bucket ?? '-'}${g.expected_pnl_avg != null ? ` / 平均${fmt(Math.round(g.expected_pnl_avg))}円` : ''}`,
      });
    }

    const sourceOrder: Record<UnifiedRecommendation['source'], number> = { Calendar: 0, Pair: 1, Grok: 2 };
    return rows
      .filter((r) => !r.excluded)
      .sort((a, b) => {
        const pfCmp = (b.pf ?? -1) - (a.pf ?? -1);
        if (pfCmp !== 0) return pfCmp;
        const srcCmp = sourceOrder[a.source] - sourceOrder[b.source];
        if (srcCmp !== 0) return srcCmp;
        return (a.rank ?? 999) - (b.rank ?? 999);
      });
  };

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/dev/pairs/signals`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API_BASE}/api/dev/calendar`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API_BASE}/dev/day-trade-list`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API_BASE}/api/dev/backtest/strategy-weekday-matrix`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([pairs, cal, grok, matrix]) => {
      setPairsData(pairs ?? null);
      setCalendarData(cal ?? null);
      setGrokData(grok ?? null);
      setMatrixData(matrix ?? null);
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(); }, []);

  const pairEntriesAll = pairsData?.entry ?? pairsData?.hot ?? [];
  const pairEntries = pairEntriesAll.slice().sort((a, b) => b.z_abs - a.z_abs).slice(0, 3);
  const pairEntryCount = pairEntries.length;
  const grokCandidates = buildGrokCandidates(grokData);
  const unifiedRecommendations = buildUnifiedRecommendations();
  const realtimeTickers = Array.from(new Set(unifiedRecommendations.flatMap((r) => [
    toYahooTicker(r.code),
    ...(r.pairCode ? [toYahooTicker(r.pairCode)] : []),
  ])));
  const hasMatrix =
    Boolean(matrixData?.weekdays?.length) &&
    Boolean(matrixData?.strategies?.grok_short?.by_weekday) &&
    Boolean(matrixData?.strategies?.weekday_edge?.by_weekday) &&
    Boolean(matrixData?.strategies?.pairs?.by_weekday);

  // Sortable hooks
  const pairSort = useSortable<PairSignal>(pairEntries, 'z_abs');

  const fetchRealtime = async (force = false) => {
    if (realtimeTickers.length === 0) return;
    setRealtimeLoading(true);
    try {
      const url = `/api/realtime?tickers=${encodeURIComponent(realtimeTickers.join(','))}${force ? '&force=true' : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`realtime fetch failed: ${res.status}`);
      const json = await res.json();
      const quotes = Array.isArray(json?.data) ? json.data : [];
      const map: Record<string, RealtimeQuote> = {};
      quotes.forEach((q: any) => {
        if (!q?.ticker) return;
        map[q.ticker] = {
          price: q.price ?? null,
          open: q.open ?? null,
          marketState: q.marketState ?? null,
          marketTime: q.marketTime ?? null,
        };
      });
      setRealtimeData(map);
      setRealtimeTimestamp(json.timestamp ? new Date(json.timestamp).toLocaleTimeString('ja-JP') : null);
    } catch (err) {
      console.error('リアルタイム取得エラー:', err);
    } finally {
      setRealtimeLoading(false);
    }
  };

  const hasOpenedToday = (rt: RealtimeQuote | undefined) => {
    if (!rt || rt.price === null || rt.open === null || rt.open <= 0) return false;
    const now = new Date();
    const jst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const jstTime = jst.getHours() * 60 + jst.getMinutes();
    const jstDay = jst.getDay();
    const isWeekday = jstDay >= 1 && jstDay <= 5;
    const isZaraba = isWeekday && jstTime >= 540 && jstTime <= 930;
    if (isZaraba && rt.marketTime) {
      const mt = new Date(rt.marketTime);
      const mtJst = new Date(mt.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
      if (mtJst.toDateString() !== jst.toDateString()) return false;
    }
    return true;
  };

  const renderPriceCell = (r: UnifiedRecommendation) => (
    <span>
      {r.price != null ? r.price.toLocaleString('ja-JP', { maximumFractionDigits: 1 }) : '—'}
      {r.pairCode && (
        <>
          <span className="text-muted-foreground mx-1">/</span>
          {r.pairPrice != null ? r.pairPrice.toLocaleString('ja-JP', { maximumFractionDigits: 1 }) : '—'}
        </>
      )}
    </span>
  );

  const renderOpenDiffValue = (code: string) => {
    const rt = realtimeData[toYahooTicker(code)];
    if (!hasOpenedToday(rt)) return <span className="text-muted-foreground">-</span>;
    const diff = (rt!.price as number) - (rt!.open as number);
    const cls = diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-rose-400' : 'text-muted-foreground';
    return <span className={cls}>{diff > 0 ? '+' : ''}{diff.toLocaleString('ja-JP', { maximumFractionDigits: 1 })}</span>;
  };

  const renderOpenDiffCell = (r: UnifiedRecommendation) => (
    <span>
      {renderOpenDiffValue(r.code)}
      {r.pairCode && (
        <>
          <span className="text-muted-foreground mx-1">/</span>
          {renderOpenDiffValue(r.pairCode)}
        </>
      )}
    </span>
  );

  if (loading) {
    return (
      <main className="relative min-h-screen">
        <div className="fixed inset-0 -z-10 bg-background" />
        <div className="max-w-[1600px] mx-auto px-4 py-4 leading-[1.8] tracking-[0.02em]">
          <div className="h-6 w-64 bg-muted/50 rounded mb-4 animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[...Array(4)].map((_, i) => <div key={i} className="rounded-xl border border-border/40 bg-card/50 p-5 h-24 animate-pulse" />)}
          </div>
          {[...Array(3)].map((_, i) => <div key={i} className="rounded-2xl border border-border/40 bg-card/50 h-48 mb-5 animate-pulse" />)}
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen">
      <div className="fixed inset-0 -z-10 bg-background" />

      <div className="max-w-[1600px] mx-auto px-2 md:px-4 py-4 leading-[1.8] tracking-[0.02em]">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4 pb-3 border-b border-border/30">
          <div>
            <h1 className="text-xl font-bold text-foreground">Trading Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Grok + Calendar + Pair
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => fetchRealtime(true)} disabled={realtimeLoading || realtimeTickers.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-400 text-xs font-medium hover:bg-sky-500/30 transition-colors whitespace-nowrap disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${realtimeLoading ? 'animate-spin' : ''}`} />
              寄付
              {realtimeTimestamp && <span className="text-sky-400/60 ml-1">{realtimeTimestamp}</span>}
            </button>
            <DevNavLinks />
          </div>
        </header>

        {/* ===== Unified Recommendations ===== */}
        <Panel title={
          <div className="flex items-center gap-2">
            <h2 className="text-base md:text-lg font-semibold">推奨銘柄一覧</h2>
            <span className="text-xs text-muted-foreground">Grok / Calendar / Pair をPF順に統合</span>
            {unifiedRecommendations.length > 0 && (
              <span className="ml-auto text-xs tabular-nums text-primary">{unifiedRecommendations.length}件</span>
            )}
          </div>
        } border={unifiedRecommendations.length > 0 ? 'border-primary/40' : undefined}>
          {unifiedRecommendations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-[760px] md:w-full text-sm md:text-base">
                <thead>
                  <tr className="text-foreground border-b border-border/40 bg-muted/30">
                    <th className="text-left px-2 py-2 text-xs font-medium whitespace-nowrap">種別</th>
                    <th className="text-left px-2 py-2 text-xs font-medium whitespace-nowrap">tk1/銘柄</th>
                    <th className="text-left px-2 py-2 text-xs font-medium whitespace-nowrap">tk1名</th>
                    <th className="text-left px-2 py-2 text-xs font-medium whitespace-nowrap">tk2/補足</th>
                    <th className="text-center px-2 py-2 text-xs font-medium whitespace-nowrap">方向</th>
                    <th className="text-left px-2 py-2 text-xs font-medium whitespace-nowrap">理由</th>
                    <th className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap">PF</th>
                    <th className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap">終値</th>
                    <th className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap">寄付差</th>
                    <th className="text-left px-2 py-2 text-xs font-medium whitespace-nowrap">執行</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {unifiedRecommendations.map((r, i) => (
                    <tr key={`${r.source}-${r.code}-${r.pairCode ?? ''}-${i}`} className="hover:bg-muted/10">
                      <td className="px-2 py-2.5 whitespace-nowrap">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${
                          r.source === 'Calendar' ? 'bg-teal-500/20 text-teal-400' :
                          r.source === 'Pair' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-amber-500/20 text-amber-400'
                        }`}>
                          {r.source}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 tabular-nums whitespace-nowrap"><TickerLink ticker={`${r.code}.T`} /></td>
                      <td className="px-2 py-2.5 text-foreground whitespace-nowrap">{r.name}</td>
                      <td className="px-2 py-2.5 text-muted-foreground whitespace-nowrap">
                        {r.pairCode ? <><TickerLink ticker={`${r.pairCode}.T`} /> <span className="ml-1">{r.pairName}</span></> : r.note}
                      </td>
                      <td className="px-2 py-2.5 text-center whitespace-nowrap">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${
                          r.direction.includes('LONG') || r.direction.startsWith('L') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                        }`}>{r.direction}</span>
                      </td>
                      <td className="px-2 py-2.5 text-muted-foreground whitespace-nowrap">{r.strategy}</td>
                      <td className={`px-2 py-2.5 text-right tabular-nums whitespace-nowrap ${r.pf != null && r.pf >= 1.5 ? 'text-teal-400' : r.pf != null && r.pf < 1 ? 'text-rose-400' : ''}`}>
                        {r.pf?.toFixed(2) ?? '—'}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground whitespace-nowrap">{renderPriceCell(r)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums whitespace-nowrap">{renderOpenDiffCell(r)}</td>
                      <td className="px-2 py-2.5 text-muted-foreground whitespace-nowrap">{r.execution}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message="統合推奨候補なし" />
          )}
        </Panel>

        {/* ===== Strategy × Weekday Matrix ===== */}
        {matrixData && hasMatrix && (
          <Panel title={
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-semibold">戦略×曜日 PFマトリクス</h2>
              <span className="text-xs text-muted-foreground">{matrixData.generated_at ? `更新: ${matrixData.generated_at.split('T')[0]}` : ''}</span>
            </div>
          }>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-foreground border-b border-border/40 bg-muted/30">
                    <th className="text-center px-3 py-2 text-xs font-medium">曜日</th>
                    <th className="text-center px-3 py-2 text-xs font-medium">Grok 制度</th>
                    <th className="text-center px-3 py-2 text-xs font-medium">Grok いちにち除0</th>
                    <th className="text-center px-3 py-2 text-xs font-medium">曜日20銘柄</th>
                    <th className="text-center px-3 py-2 text-xs font-medium">pair Top3</th>
                    <th className="text-center px-3 py-2 text-xs font-medium">Calendar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {matrixData.weekdays.map((dow) => {
                    const grokSeido = matrixData.strategies.grok_short_seido?.by_weekday[dow]
                      ?? matrixData.strategies.grok_short.by_weekday[dow];
                    const grokDaytrade = matrixData.strategies.grok_short_daytrade?.by_weekday[dow];
                    const we = matrixData.strategies.weekday_edge.by_weekday[dow];
                    const pair = matrixData.strategies.pairs.by_weekday[dow];
                    const ratings = matrixData.ratings[dow] || {};
                    const calLabel = dow === '月' ? 'SQ+1d' : dow === '金' ? '1306' : '-';
                    const ratingCls = (r: string) => r === '◎' ? 'text-price-up font-bold' : r === '○' ? 'text-price-up' : r === '△' ? 'text-amber-400' : r === '×' ? 'text-price-down' : 'text-muted-foreground';
                    const pfCell = (stats: StrategyWeekdayStats | undefined, rating: string) => {
                      if (!stats?.pf) return <span className="text-muted-foreground">-</span>;
                      return (
                        <span className={ratingCls(rating)}>
                          {rating} {stats.pf.toFixed(2)}
                          <span className="text-[10px] text-muted-foreground ml-1">({stats.n})</span>
                        </span>
                      );
                    };
                    return (
                      <tr key={dow} className="hover:bg-muted/5">
                        <td className="text-center px-3 py-2.5 font-medium text-foreground">{dow}</td>
                        <td className="text-center px-3 py-2.5 tabular-nums">{pfCell(grokSeido, ratings.grok_short_seido || ratings.grok_short || '-')}</td>
                        <td className="text-center px-3 py-2.5 tabular-nums">{pfCell(grokDaytrade, ratings.grok_short_daytrade || '-')}</td>
                        <td className="text-center px-3 py-2.5 tabular-nums">{pfCell(we, ratings.weekday_edge || '-')}</td>
                        <td className="text-center px-3 py-2.5 tabular-nums">{pfCell(pair, ratings.pairs || '-')}</td>
                        <td className="text-center px-3 py-2.5 text-muted-foreground text-xs">{calLabel}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {(() => {
              const cal = matrixData.strategies.calendar?.summary ?? {};
              return (
                <div className="px-4 py-2.5 border-t border-border/40 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  {cal.sq4 && <span>SQ-4: PF{cal.sq4.pf?.toFixed(2)} (N={cal.sq4.n})</span>}
                  {cal.sq_plus1 && <span>SQ+1: PF{cal.sq_plus1.pf?.toFixed(2)} (N={cal.sq_plus1.n})</span>}
                  {cal.etf1306 && <span>1306: PF{cal.etf1306.pf?.toFixed(2)} (N={cal.etf1306.n})</span>}
                </div>
              );
            })()}
          </Panel>
        )}

        {/* ===== Calendar Entry Candidates ===== */}
        {(() => {
          const calCandidates = calendarData ? buildCalendarCandidates(calendarData) : [];
          const entryDate = calCandidates.length > 0 ? calCandidates[0].date : null;
          return (
            <Panel title={
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-semibold"><a href="/dev/calendar" className="hover:text-primary transition-colors">Calendar エントリー候補</a></h2>
                <span className="text-xs text-muted-foreground">曜日 / SQ-4 / SQ+1 / 1306</span>
                {calCandidates.length > 0 && (
                  <span className="ml-auto text-xs tabular-nums text-teal-400">{calCandidates.filter(c => !c.excluded).length}件{entryDate ? ` (${entryDate})` : ''}</span>
                )}
              </div>
            } border={calCandidates.filter(c => !c.excluded).length > 0 ? 'border-teal-500/40' : undefined}>
              {calCandidates.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-[640px] md:w-full text-sm md:text-base">
                    <thead><tr className="text-foreground border-b border-border/40 bg-muted/30">
                      <th className="text-left px-2 py-2 text-xs font-medium whitespace-nowrap">銘柄</th>
                      <th className="text-left px-2 py-2 text-xs font-medium whitespace-nowrap">銘柄名</th>
                      <th className="text-left px-2 py-2 text-xs font-medium whitespace-nowrap">選定理由</th>
                      <th className="text-center px-2 py-2 text-xs font-medium whitespace-nowrap">方向</th>
                      <th className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap">前日終値</th>
                      <th className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap">前日比</th>
                      <th className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap">期待PF</th>
                      <th className="text-left px-2 py-2 text-xs font-medium whitespace-nowrap">執行</th>
                    </tr></thead>
                    <tbody className="divide-y divide-border/30">
                      {calCandidates.map((r, i) => (
                        <tr key={`cal-${r.code}-${i}`} className={`${r.excluded ? 'opacity-40 line-through' : 'hover:bg-muted/10'}`}>
                          <td className="px-2 py-2.5 tabular-nums whitespace-nowrap">{r.code !== '—' ? <TickerLink ticker={`${r.code}.T`} /> : '—'}</td>
                          <td className="px-2 py-2.5 text-foreground whitespace-nowrap">{r.name}</td>
                          <td className="px-2 py-2.5 text-muted-foreground whitespace-nowrap">
                            {r.strategy}
                            {r.excluded && r.exclude_reason && <span className="ml-1.5 no-underline inline-flex px-1.5 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">{r.exclude_reason}</span>}
                          </td>
                          <td className="px-2 py-2.5 text-center whitespace-nowrap">
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${r.direction === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{r.direction}</span>
                          </td>
                          <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground whitespace-nowrap">{r.prev_close != null ? r.prev_close.toLocaleString('ja-JP', { maximumFractionDigits: 1 }) : '—'}</td>
                          <td className={`px-2 py-2.5 text-right tabular-nums whitespace-nowrap ${r.prev_day_ret != null ? (r.prev_day_ret > 0 ? 'text-emerald-400' : r.prev_day_ret < 0 ? 'text-rose-400' : 'text-muted-foreground') : 'text-muted-foreground'}`}>
                            {r.prev_day_ret != null ? `${r.prev_day_ret > 0 ? '+' : ''}${r.prev_day_ret.toFixed(2)}%` : '—'}
                          </td>
                          <td className={`px-2 py-2.5 text-right tabular-nums whitespace-nowrap ${r.pf != null && r.pf >= 1.5 ? 'text-teal-400' : r.pf != null && r.pf < 1 ? 'text-rose-400' : ''}`}>{r.pf?.toFixed(2) ?? '—'}</td>
                          <td className="px-2 py-2.5 text-muted-foreground whitespace-nowrap">{r.execution}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState message={calendarData ? '直近のCalendar候補なし' : 'Calendar データ取得失敗'} />
              )}
            </Panel>
          );
        })()}

        {/* ===== Pairs Entry Candidates ===== */}
        <Panel title={
          <div className="flex items-center gap-2">
            <h2 className="text-base md:text-lg font-semibold"><a href="/dev/pairs" className="hover:text-primary transition-colors">ペア エントリー候補</a></h2>
            <span className="text-xs text-muted-foreground">|z| &ge; 2.0 / 共和分ベース161ペア</span>
            {pairsData && pairEntries.length > 0 && (
              <span className="ml-auto text-xs tabular-nums text-blue-400">{pairEntries.length}件</span>
            )}
          </div>
        } border={pairsData && pairEntries.length > 0 ? 'border-blue-500/40' : undefined}
          footer={pairsData ? <span>{pairsData.total}ペア中 Top{pairEntryCount} / 候補{pairEntriesAll.length}件 ({pairsData.signal_date})</span> : undefined}>
          {pairsData && pairEntries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-[640px] md:w-full text-sm md:text-base">
                <thead><tr className="text-foreground border-b border-border/40 bg-muted/30">
                  <th className="text-center px-2 py-2 text-xs font-medium whitespace-nowrap">L/S</th>
                  <th className="text-left px-2 py-2 text-xs font-medium whitespace-nowrap">コード1</th>
                  <th className="text-left px-2 py-2 text-xs font-medium whitespace-nowrap">銘柄1</th>
                  <th className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap">終値1</th>
                  <th className="text-center px-2 py-2 text-xs font-medium whitespace-nowrap">L/S</th>
                  <th className="text-left px-2 py-2 text-xs font-medium whitespace-nowrap">コード2</th>
                  <th className="text-left px-2 py-2 text-xs font-medium whitespace-nowrap">銘柄2</th>
                  <th className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap">終値2</th>
                  <SortHeader<PairSignal> label="z-score" field="z_abs" {...pairSort} className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap" />
                  <th className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap">株数</th>
                  <SortHeader<PairSignal> label="PF" field="full_pf" {...pairSort} className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap" />
                  <th className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap hidden md:table-cell">LB</th>
                  <th className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap hidden md:table-cell">1d回帰</th>
                </tr></thead>
                <tbody className="divide-y divide-border/30">
                  {pairSort.sorted.map((p, i) => {
                    const isLong = p.direction === 'long_tk1';
                    const pairHref = `/pairs/${p.tk1.replace('.', '')}-${p.tk2.replace('.', '')}`;
                    return (
                      <tr key={`${p.tk1}-${p.tk2}`} className="hover:bg-muted/10 cursor-pointer" onClick={() => window.open(pairHref, '_blank')}>
                        <td className="text-center px-2 py-2.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${isLong ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                            {isLong ? 'L' : 'S'}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 tabular-nums"><TickerLink ticker={p.tk1} /></td>
                        <td className="px-2 py-2.5 text-foreground">{p.name1}</td>
                        <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground whitespace-nowrap">&yen;{fmt(p.c1)}</td>
                        <td className="text-center px-2 py-2.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${isLong ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                            {isLong ? 'S' : 'L'}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 tabular-nums"><TickerLink ticker={p.tk2} /></td>
                        <td className="px-2 py-2.5 text-foreground">{p.name2}</td>
                        <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground whitespace-nowrap">&yen;{fmt(p.c2)}</td>
                        <td className="text-right px-2 py-2.5 tabular-nums font-semibold">{fmtZ(p.z_latest)}</td>
                        <td className="text-right px-2 py-2.5 tabular-nums text-muted-foreground">{p.shares1}:{p.shares2}</td>
                        <td className="text-right px-2 py-2.5 tabular-nums text-foreground">{p.full_pf.toFixed(2)}</td>
                        <td className="text-right px-2 py-2.5 tabular-nums text-muted-foreground hidden md:table-cell">{p.lookback}</td>
                        <td className="text-right px-2 py-2.5 tabular-nums text-muted-foreground hidden md:table-cell">{(p.revert_1d ?? p.half_life ?? 0).toFixed(0)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message="本日のペアエントリーなし" />
          )}
        </Panel>

        {/* ===== Grok Entry Candidates ===== */}
        <Panel title={
          <div className="flex items-center gap-2">
            <h2 className="text-base md:text-lg font-semibold"><a href="/dev/recommendations" className="hover:text-primary transition-colors">Grok エントリー候補</a></h2>
            <span className="text-xs text-muted-foreground">expected PF / 信用可否 / ML確率</span>
            {grokCandidates.length > 0 && (
              <span className="ml-auto text-xs tabular-nums text-amber-400">{grokCandidates.length}件</span>
            )}
          </div>
        } border={grokCandidates.length > 0 ? 'border-amber-500/40' : undefined}
          footer={grokData ? <span>{grokData.total}件中 {grokCandidates.length}件が実行候補</span> : undefined}>
          {grokCandidates.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-[720px] md:w-full text-sm md:text-base">
                <thead>
                  <tr className="text-foreground border-b border-border/40 bg-muted/30">
                    <th className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap">Rank</th>
                    <th className="text-left px-2 py-2 text-xs font-medium whitespace-nowrap">銘柄</th>
                    <th className="text-left px-2 py-2 text-xs font-medium whitespace-nowrap">銘柄名</th>
                    <th className="text-center px-2 py-2 text-xs font-medium whitespace-nowrap">方向</th>
                    <th className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap">終値</th>
                    <th className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap">期待PF</th>
                    <th className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap">期待PnL</th>
                    <th className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap">勝率</th>
                    <th className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap">上昇確率</th>
                    <th className="text-left px-2 py-2 text-xs font-medium whitespace-nowrap">信用</th>
                    <th className="text-left px-2 py-2 text-xs font-medium whitespace-nowrap">理由</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {grokCandidates.map((g) => (
                    <tr key={g.ticker} className="hover:bg-muted/10">
                      <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground">{g.grok_rank ?? '—'}</td>
                      <td className="px-2 py-2.5 tabular-nums whitespace-nowrap"><TickerLink ticker={g.ticker} /></td>
                      <td className="px-2 py-2.5 text-foreground whitespace-nowrap">{g.stock_name}</td>
                      <td className="px-2 py-2.5 text-center whitespace-nowrap">
                        <span className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">SHORT</span>
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground whitespace-nowrap">{g.close != null ? fmt(g.close) : '—'}</td>
                      <td className={`px-2 py-2.5 text-right tabular-nums whitespace-nowrap ${g.expected_pf != null && g.expected_pf >= 1.5 ? 'text-teal-400' : g.expected_pf != null && g.expected_pf < 1 ? 'text-rose-400' : ''}`}>{g.expected_pf?.toFixed(2) ?? '—'}</td>
                      <td className={`px-2 py-2.5 text-right tabular-nums whitespace-nowrap ${(g.expected_pnl_avg ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{g.expected_pnl_avg != null ? `${g.expected_pnl_avg >= 0 ? '+' : ''}${fmt(Math.round(g.expected_pnl_avg))}` : '—'}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground whitespace-nowrap">{g.expected_wr != null ? `${g.expected_wr.toFixed(1)}%` : '—'}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground whitespace-nowrap">{g.prob_up != null ? `${(g.prob_up * 100).toFixed(0)}%` : g.prob_bin ?? '—'}</td>
                      <td className="px-2 py-2.5 text-muted-foreground whitespace-nowrap">{g.credit_bucket ?? (g.shortable ? '制度' : 'いちにち')}</td>
                      <td className="px-2 py-2.5 text-muted-foreground whitespace-nowrap">{g.reason_category ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message={grokData ? 'Grok 実行候補なし' : 'Grok データ取得失敗'} />
          )}
        </Panel>

      </div>
    </main>
  );
}
