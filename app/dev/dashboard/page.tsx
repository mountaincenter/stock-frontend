'use client';

import { useEffect, useState } from 'react';
import { DevNavLinks } from '../../../components/dev';
import { RefreshCw } from 'lucide-react';

// === Types (granville positions準拠: hold_stocks.parquetベース) ===
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

// B4 Entry (vi情報含む)
interface B4Candidate {
  ticker: string; stock_name: string; sector: string;
  close: number; entry_price_est: number;
  dev_from_sma20: number; max_cost?: number;
}
interface B4EntryResponse {
  vi: number | null; cme_gap: number | null; n225_chg: number | null;
  decision: string; date: string | null;
  excluded_rules: string[];
  total_b4_signals: number;
  candidates: B4Candidate[]; selected: B4Candidate[];
}

// Regime + Long Recommendations (Granville B1-B3)
interface Regime {
  n225_above_sma20: boolean | null; n225_ret20: number | null;
  cme_gap: number | null; vi: number | null;
  n225_close: number | null; n225_sma20: number | null;
  cme_close: number | null;
}
interface LongRecommendation {
  ticker: string; stock_name: string; sector: string; rule: string;
  long_grade: string; hvb_grade?: string; hold_days: number; expected_pf: number;
  close: number; entry_price_est: number; sma20: number;
  dev_from_sma20: number; atr10_pct: number;
}
interface LongRecommendationsResponse {
  long_recommendations: LongRecommendation[]; count: number;
  date: string | null; regime: Regime;
}

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
  revert_1d: number;
  is_entry: boolean; direction: string;
  signal_date: string;
}
interface PairsResponse {
  pairs: PairSignal[];
  entry: PairSignal[];
  signal_date: string | null;
  total: number;
  entry_count: number;
}

// Calendar (dashboard用の最小型)
interface CalendarResponse {
  today: { flags: string[] };
  upcoming: { date: string; flags: string[] }[];
  sq4: {
    next_sq4: { entry_date: string; exit_date: string | null } | null;
    stats_cme_down: { total: number; wr: number; pf: number | null; total_pnl_100: number };
    candidates: { as_of: string; count: number };
  };
  etf1306: {
    stats: { total: number; wr: number; pf: number; total_ret: number; pnl_1000: number };
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

// === Helpers ===
const fmt = (v: number | null | undefined) => (v ?? 0).toLocaleString('ja-JP');
const fmtPnl = (v: number | null | undefined) => { const n = v ?? 0; return <span className={n >= 0 ? 'text-price-up' : 'text-price-down'}>{n >= 0 ? '+' : ''}{fmt(n)}円</span>; };
const fmtPct = (v: number | null | undefined, d = 1) => { const n = v ?? 0; return `${n >= 0 ? '+' : ''}${n.toFixed(d)}%`; };
const shortDate = (d: string) => { const m = d.match(/\d{4}-(\d{2})-(\d{2})/); return m ? `${m[1]}/${m[2]}` : d; };
const fmtZ = (v: number) => <span className={Math.abs(v) >= 2.0 ? (v > 0 ? 'text-price-down' : 'text-price-up') : Math.abs(v) >= 1.5 ? 'text-amber-400' : 'text-muted-foreground'}>{v >= 0 ? '+' : ''}{v.toFixed(2)}</span>;

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
  const [posData, setPosData] = useState<PositionsResponse | null>(null);
  const [b4Entry, setB4Entry] = useState<B4EntryResponse | null>(null);
  const [longRecs, setLongRecs] = useState<LongRecommendationsResponse | null>(null);
  const [pairsData, setPairsData] = useState<PairsResponse | null>(null);
  const [calData, setCalData] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/dev/granville/positions`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API_BASE}/api/dev/granville/b4_entry`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API_BASE}/api/dev/granville/long-recommendations`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API_BASE}/api/dev/pairs/signals`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API_BASE}/api/dev/calendar`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([pos, b4, lr, pairs, cal]) => {
      setPosData(pos); setB4Entry(b4); setLongRecs(lr); setPairsData(pairs); setCalData(cal);
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetch(`${API_BASE}/api/dev/granville/refresh`, { method: 'POST' }),
        fetch(`${API_BASE}/api/dev/pairs/refresh`, { method: 'POST' }),
        fetch(`${API_BASE}/api/dev/calendar/refresh`, { method: 'POST' }),
      ]);
      fetchData();
    } finally { setRefreshing(false); }
  };

  // Positions from hold_stocks
  const exits = posData?.exits || [];
  const active = posData?.positions || [];
  const totalPnl = active.reduce((s, p) => s + p.unrealized_yen, 0);

  // VI from b4_entry
  const vi = b4Entry?.vi ?? null;

  // Sortable hooks
  const exitSort = useSortable<Position>(exits, 'unrealized_pct');
  const activeSort = useSortable<Position>(active, 'unrealized_pct');

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

      <div className="max-w-[1600px] mx-auto px-4 py-4 leading-[1.8] tracking-[0.02em]">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4 pb-3 border-b border-border/30">
          <div>
            <h1 className="text-xl font-bold text-foreground">Trading Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              B4 + Pairs + Calendar
              {b4Entry?.date ? ` (${b4Entry.date})` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={handleRefresh} disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border/40 rounded-lg hover:bg-muted/20 transition-colors disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              更新
            </button>
            <DevNavLinks />
          </div>
        </header>

        {/* ===== Market Summary ===== */}
        {(() => {
          const regime = longRecs?.regime;
          const cmeGap = regime?.cme_gap ?? b4Entry?.cme_gap;
          return (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
              <StatCard label={`N225 トレンド${b4Entry?.date ? ` ${b4Entry.date}` : ''}`} sub={regime?.n225_close != null && regime?.n225_sma20 != null ? `N225: ${fmt(regime.n225_close)} / SMA20: ${fmt(regime.n225_sma20)}${regime?.n225_ret20 != null ? ` / ret20: ${regime.n225_ret20 >= 0 ? '+' : ''}${regime.n225_ret20.toFixed(1)}%` : ''}` : undefined}>
                <span className={regime?.n225_above_sma20 ? 'text-price-up' : regime?.n225_above_sma20 === false ? 'text-price-down' : 'text-muted-foreground'}>
                  {regime?.n225_above_sma20 != null ? (regime.n225_above_sma20 ? 'Uptrend' : 'Downtrend') : '-'}
                </span>
              </StatCard>
              <StatCard label="CME gap" sub={regime?.cme_close != null && regime?.n225_close != null ? `CME: ${fmt(regime.cme_close)} / N225: ${fmt(regime.n225_close)}${b4Entry?.n225_chg != null ? ` / 前日比: ${b4Entry.n225_chg >= 0 ? '+' : ''}${b4Entry.n225_chg.toFixed(2)}%` : ''}` : cmeGap != null && Math.abs(cmeGap) <= 0.5 ? 'flat (±0.5%)' : undefined}>
                <span className={cmeGap != null ? (cmeGap >= 0 ? 'text-price-up' : 'text-price-down') : 'text-muted-foreground'}>
                  {cmeGap != null ? `${cmeGap >= 0 ? '+' : ''}${cmeGap.toFixed(2)}%` : '-'}
                </span>
              </StatCard>
              <StatCard label="日経VI" sub={vi !== null && vi >= 30 ? 'H1発動圏' : vi !== null && vi >= 25 ? 'B4発動圏' : vi !== null && vi >= 20 ? '逆張り有効' : undefined}>
                <span className={vi !== null && vi >= 30 ? 'text-price-down' : vi !== null && vi >= 25 ? 'text-amber-400' : vi !== null && vi >= 20 ? 'text-price-up' : 'text-muted-foreground'}>
                  {vi ?? '-'}
                </span>
              </StatCard>
              <StatCard label="含み損益" sub={`${active.length}件保有 / Exit: ${exits.length}件`}>
                <span className={totalPnl >= 0 ? 'text-price-up' : 'text-price-down'}>{totalPnl >= 0 ? '+' : ''}{fmt(totalPnl)}円</span>
              </StatCard>
              <StatCard label="本日シグナル" sub={`B4: ${b4Entry?.selected?.length ?? 0} / P: ${pairsData?.entry_count ?? 0}`}>
                <span className="text-foreground">{(b4Entry?.selected?.length ?? 0) + (pairsData?.entry_count ?? 0)}</span>
              </StatCard>
            </div>
          );
        })()}

        {/* ===== Exit Candidates ===== */}
        {exits.length > 0 && (
          <Panel title={
            <h2 className="text-base md:text-lg font-semibold text-amber-400">
              Exit候補 — {exits.length}件
            </h2>
          } border="border-amber-500/40">
            <div className="overflow-x-auto">
              <table className="w-full text-sm md:text-base">
                <thead><tr className="text-foreground border-b border-border/40 bg-muted/30">
                  <th className="text-center px-2 py-2 text-xs font-medium whitespace-nowrap">売買</th>
                  <SortHeader<Position> label="コード" field="ticker" {...exitSort} className="text-left px-2 py-2 text-xs font-medium whitespace-nowrap" />
                  <th className="text-left px-2 py-2 text-xs font-medium whitespace-nowrap">銘柄</th>
                  <th className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap">建日</th>
                  <th className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap">日数/MH</th>
                  <th className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap">建単価</th>
                  <th className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap">現在値</th>
                  <th className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap">発火ライン</th>
                  <SortHeader<Position> label="含み%" field="unrealized_pct" {...exitSort} className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap" />
                  <SortHeader<Position> label="含み損益" field="unrealized_yen" {...exitSort} className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap" />
                  <th className="text-center px-2 py-2 text-xs font-medium whitespace-nowrap">アクション</th>
                </tr></thead>
                <tbody className="divide-y divide-border/30">
                  {exitSort.sorted.map((p, i) => (
                    <tr key={`exit-${p.ticker}-${i}`} className="hover:bg-amber-500/5">
                      <td className="px-2 py-2.5 text-center">
                        <span className={`inline-block min-w-[40px] text-center px-2 py-1 text-xs rounded border ${p.direction === '売建' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                          {p.direction || '-'}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 tabular-nums"><TickerLink ticker={p.ticker} /></td>
                      <td className="px-2 py-2.5 text-foreground max-w-[140px] truncate">{p.stock_name}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground text-xs">{p.entry_date ? shortDate(p.entry_date) : '-'}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground">{p.hold_days}/{p.max_hold || 15}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground whitespace-nowrap">&yen;{fmt(p.entry_price)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-foreground whitespace-nowrap">&yen;{fmt(p.current_price)}</td>
                      <td className={`px-2 py-2.5 text-right tabular-nums font-semibold ${p.high_20d > 0 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                        {p.high_20d > 0 ? `¥${fmt(Math.round(p.high_20d))}` : '-'}
                      </td>
                      <td className={`px-2 py-2.5 text-right tabular-nums ${p.unrealized_pct >= 0 ? 'text-price-up' : 'text-price-down'}`}>{fmtPct(p.unrealized_pct, 2)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{fmtPnl(p.unrealized_yen)}</td>
                      <td className="px-2 py-2.5 text-center">
                        {p.hold_days >= (p.max_hold || 15) ? (
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">損切り</span>
                        ) : p.exit_type === 'high_update' ? (
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">利確</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">{p.exit_type || '-'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {/* ===== Active Positions ===== */}
        {active.length > 0 && (
          <Panel title={`保有ポジション — ${active.length}件 (${posData?.as_of || '-'})`}
            footer={<span>合計含み損益: <span className="font-bold tabular-nums ml-1">{fmtPnl(totalPnl)}</span></span>}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm md:text-base">
                <thead><tr className="text-foreground border-b border-border/40 bg-muted/30">
                  <th className="text-center px-2 py-2 text-xs font-medium whitespace-nowrap">売買</th>
                  <SortHeader<Position> label="コード" field="ticker" {...activeSort} className="text-left px-2 py-2 text-xs font-medium whitespace-nowrap" />
                  <th className="text-left px-2 py-2 text-xs font-medium whitespace-nowrap">銘柄</th>
                  <th className="text-center px-2 py-2 text-xs font-medium whitespace-nowrap">信用区分</th>
                  <th className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap">建日</th>
                  <th className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap">日数/MH</th>
                  <th className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap">建単価</th>
                  <th className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap">現在値</th>
                  <th className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap">発火ライン</th>
                  <SortHeader<Position> label="含み%" field="unrealized_pct" {...activeSort} className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap" />
                  <SortHeader<Position> label="含み損益" field="unrealized_yen" {...activeSort} className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap" />
                </tr></thead>
                <tbody className="divide-y divide-border/30">
                  {activeSort.sorted.map((p, i) => (
                    <tr key={`pos-${p.ticker}-${i}`} className="hover:bg-muted/5">
                      <td className="px-2 py-2.5 text-center">
                        <span className={`inline-block min-w-[40px] text-center px-2 py-1 text-xs rounded border ${p.direction === '売建' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                          {p.direction || '-'}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 tabular-nums"><TickerLink ticker={p.ticker} /></td>
                      <td className="px-2 py-2.5 text-foreground max-w-[140px] truncate">{p.stock_name}</td>
                      <td className="px-2 py-2.5 text-center text-xs text-muted-foreground">{p.margin_type}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground text-xs">{p.entry_date ? shortDate(p.entry_date) : '-'}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground">{p.hold_days}/{p.max_hold || 15}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground whitespace-nowrap">&yen;{fmt(p.entry_price)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-foreground whitespace-nowrap">&yen;{fmt(p.current_price)}</td>
                      <td className={`px-2 py-2.5 text-right tabular-nums font-semibold ${p.high_20d > 0 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                        {p.high_20d > 0 ? `¥${fmt(Math.round(p.high_20d))}` : '-'}
                      </td>
                      <td className={`px-2 py-2.5 text-right tabular-nums ${p.unrealized_pct >= 0 ? 'text-price-up' : 'text-price-down'}`}>{fmtPct(p.unrealized_pct, 2)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{fmtPnl(p.unrealized_yen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {/* ===== 3 Strategy Overview ===== */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
          {/* ── B4 ── */}
          <div className={`rounded-xl border bg-card overflow-hidden ${(b4Entry?.selected?.length ?? 0) > 0 ? 'border-emerald-500/30' : 'border-border'}`}>
            <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                <a href="/dev/granville" className="hover:text-primary transition-colors">Granville B4</a>
              </h2>
              <div className="flex items-center gap-1.5">
                {vi != null && <span className={`text-xs px-1.5 py-0.5 rounded border tabular-nums ${vi >= 25 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-muted/30 text-muted-foreground border-border/40'}`}>VI {vi}</span>}
                {b4Entry?.decision && (
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${
                    b4Entry.decision === 'strong_entry' || b4Entry.decision === 'entry' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : b4Entry.decision === 'consider' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : 'bg-muted/30 text-muted-foreground border-border/40'
                  }`}>{b4Entry.decision === 'strong_entry' ? 'ENTRY' : b4Entry.decision === 'entry' ? 'ENTRY' : b4Entry.decision === 'consider' ? 'CONSIDER' : b4Entry.decision === 'excluded' ? '除外' : 'WAIT'}</span>
                )}
              </div>
            </div>
            <div className="px-4 py-2">
              {b4Entry?.selected && b4Entry.selected.length > 0 ? (
                <table className="w-full text-xs">
                  <thead><tr className="text-muted-foreground border-b border-border/20">
                    <th className="text-left py-1.5 font-medium">コード</th>
                    <th className="text-left py-1.5 font-medium">銘柄</th>
                    <th className="text-right py-1.5 font-medium">乖離</th>
                    <th className="text-right py-1.5 font-medium">推定IN</th>
                  </tr></thead>
                  <tbody>
                    {b4Entry.selected.map(c => (
                      <tr key={c.ticker} className="border-b border-border/10 hover:bg-muted/5">
                        <td className="py-1.5 tabular-nums font-semibold"><TickerLink ticker={c.ticker} /></td>
                        <td className="py-1.5 text-foreground truncate max-w-[120px]">{c.stock_name}</td>
                        <td className="py-1.5 text-right tabular-nums text-price-down">{c.dev_from_sma20.toFixed(1)}%</td>
                        <td className="py-1.5 text-right tabular-nums text-muted-foreground">{fmt(Math.round(c.entry_price_est))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-6 text-center text-muted-foreground text-xs">
                  {b4Entry?.decision === 'excluded' ? '除外ルール該当' :
                   b4Entry?.decision === 'wait' ? `VI=${vi} < 25: 待機` :
                   'シグナルなし'}
                </div>
              )}
            </div>
            {b4Entry?.total_b4_signals != null && b4Entry.total_b4_signals > 0 && (
              <div className="px-4 py-2 border-t border-border/40 text-xs text-muted-foreground">
                シグナル {b4Entry.total_b4_signals}件 → 選定 {b4Entry.selected?.length ?? 0}件
                {b4Entry.excluded_rules?.length > 0 && <span className="ml-2 text-rose-400">除外: {b4Entry.excluded_rules.join(', ')}</span>}
              </div>
            )}
          </div>

          {/* ── Pairs ── */}
          <div className={`rounded-xl border bg-card overflow-hidden ${(pairsData?.entry_count ?? 0) > 0 ? 'border-blue-500/40' : 'border-border'}`}>
            <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                <a href="/dev/pairs" className="hover:text-primary transition-colors">Pairs</a>
              </h2>
              {pairsData && <span className="text-xs text-muted-foreground tabular-nums">{pairsData.entry_count}件 / {pairsData.total}ペア</span>}
            </div>
            <div className="px-4 py-2">
              {pairsData && pairsData.entry.length > 0 ? (
                <table className="w-full text-xs">
                  <thead><tr className="text-muted-foreground border-b border-border/20">
                    <th className="text-left py-1.5 font-medium">ペア</th>
                    <th className="text-right py-1.5 font-medium">z</th>
                    <th className="text-right py-1.5 font-medium">PF</th>
                    <th className="text-right py-1.5 font-medium">株数</th>
                  </tr></thead>
                  <tbody>
                    {pairsData.entry.map(p => {
                      const isLong = p.direction === 'long_tk1';
                      return (
                        <tr key={`${p.tk1}-${p.tk2}`} className="border-b border-border/10 hover:bg-muted/5 cursor-pointer"
                          onClick={() => window.open(`/pairs/${p.tk1.replace('.', '')}-${p.tk2.replace('.', '')}`, '_blank')}>
                          <td className="py-1.5">
                            <span className="tabular-nums font-semibold">{p.tk1.replace('.T','')}</span>
                            <span className={`mx-0.5 text-[10px] ${isLong ? 'text-emerald-400' : 'text-rose-400'}`}>{isLong ? 'L' : 'S'}</span>
                            <span className="text-muted-foreground/50">/</span>
                            <span className="tabular-nums font-semibold ml-0.5">{p.tk2.replace('.T','')}</span>
                            <span className={`mx-0.5 text-[10px] ${isLong ? 'text-rose-400' : 'text-emerald-400'}`}>{isLong ? 'S' : 'L'}</span>
                          </td>
                          <td className="py-1.5 text-right tabular-nums font-semibold">{fmtZ(p.z_latest)}</td>
                          <td className="py-1.5 text-right tabular-nums">{p.full_pf.toFixed(2)}</td>
                          <td className="py-1.5 text-right tabular-nums text-muted-foreground">{p.shares1}:{p.shares2}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="py-6 text-center text-muted-foreground text-xs">エントリーなし</div>
              )}
            </div>
            {pairsData?.signal_date && (
              <div className="px-4 py-2 border-t border-border/40 text-xs text-muted-foreground">{pairsData.signal_date}</div>
            )}
          </div>

          {/* ── Calendar ── */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                <a href="/dev/calendar" className="hover:text-primary transition-colors">Calendar</a>
              </h2>
              {calData?.today?.flags && calData.today.flags.length > 0 && (
                <div className="flex items-center gap-1">
                  {calData.today.flags.map(f => (
                    <span key={f} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      f.includes('買い') ? 'bg-emerald-500/20 text-emerald-400' :
                      f.includes('決済') ? 'bg-amber-500/20 text-amber-400' :
                      'bg-white/5 text-muted-foreground'
                    }`}>{f}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="px-4 py-2 space-y-3">
              {/* SQ-4 next */}
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">SQ-4</div>
                {calData?.sq4?.next_sq4 ? (
                  <div>
                    <div className="text-sm font-semibold tabular-nums">
                      {(() => { const d = new Date(calData.sq4.next_sq4.entry_date); return `${d.getMonth()+1}/${d.getDate()}`; })()}
                      <span className="text-muted-foreground font-normal mx-1">→</span>
                      {calData.sq4.next_sq4.exit_date ? (() => { const d = new Date(calData.sq4.next_sq4.exit_date); return `${d.getMonth()+1}/${d.getDate()}`; })() : '?'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                      CME↓ PF {calData.sq4.stats_cme_down?.pf?.toFixed(2) ?? '—'} / WR {calData.sq4.stats_cme_down?.wr?.toFixed(0) ?? '—'}% / N={calData.sq4.stats_cme_down?.total ?? 0}
                    </div>
                  </div>
                ) : <div className="text-sm text-muted-foreground/40">—</div>}
              </div>

              {/* 1306 stats */}
              {calData?.etf1306?.stats && (
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">1306 四半期末</div>
                  <div className="text-xs tabular-nums space-y-0.5">
                    <div>PF <span className="font-semibold text-foreground">{calData.etf1306.stats.pf?.toFixed(2) ?? '—'}</span> / WR {calData.etf1306.stats.wr?.toFixed(0) ?? '—'}% / N={calData.etf1306.stats.total ?? 0}</div>
                    <div>累計 <span className={`font-semibold ${(calData.etf1306.stats.pnl_1000 ?? 0) >= 0 ? 'text-price-up' : 'text-price-down'}`}>{(calData.etf1306.stats.pnl_1000 ?? 0) >= 0 ? '+' : ''}{fmt(calData.etf1306.stats.pnl_1000 ?? 0)}円</span><span className="text-muted-foreground ml-1">(1000株)</span></div>
                  </div>
                </div>
              )}

              {/* Upcoming events */}
              {calData?.upcoming && calData.upcoming.length > 0 && (
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Upcoming</div>
                  <div className="space-y-1">
                    {calData.upcoming.filter(e => e.flags.some(f => /^\dQ|買い|決済/.test(f))).slice(0, 4).map(ev => (
                      <div key={ev.date} className="flex items-center gap-2 text-xs">
                        <span className="tabular-nums text-muted-foreground w-12">{(() => { const d = new Date(ev.date); return `${d.getMonth()+1}/${d.getDate()}`; })()}</span>
                        <div className="flex gap-1">
                          {ev.flags.map(f => (
                            <span key={f} className={`px-1 py-0.5 rounded text-[10px] leading-none ${
                              f.includes('買い') ? 'bg-emerald-500/20 text-emerald-400' :
                              f.includes('決済') ? 'bg-amber-500/20 text-amber-400' :
                              'bg-white/5 text-muted-foreground'
                            }`}>{f}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
