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
  long_grade: string; hold_days: number; expected_pf: number;
  close: number; entry_price_est: number; sma20: number;
  dev_from_sma20: number; atr10_pct: number;
}
interface LongRecommendationsResponse {
  long_recommendations: LongRecommendation[]; count: number;
  date: string | null; regime: Regime;
}

// Reversal signals (bearish + b4)
interface Signal {
  ticker: string; stock_name: string; sector: string; strategy: string;
  close: number; open: number; body_pct: number;
  sma20: number; dev_from_sma20: number;
  entry_price_est: number; prev_close: number; vi: number;
}
interface SignalsResponse {
  bearish: Signal[]; b4: Signal[];
  bearish_count: number; b4_count: number;
  bearish_date: string | null; b4_date: string | null;
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
  half_life: number;
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
    <div className="text-muted-foreground text-xs mb-1">{label}</div>
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

const RuleBadge = ({ rule }: { rule: string }) => {
  const cls = rule === 'B4' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
    : rule === 'B1' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    : rule === 'B3' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    : 'bg-purple-500/20 text-purple-400 border-purple-500/30';
  return <span className={`inline-block min-w-[40px] text-center px-2 py-1 text-xs rounded border ${cls}`}>{rule}</span>;
};

// === Main ===
export default function DashboardPage() {
  const [posData, setPosData] = useState<PositionsResponse | null>(null);
  const [b4Entry, setB4Entry] = useState<B4EntryResponse | null>(null);
  const [longRecs, setLongRecs] = useState<LongRecommendationsResponse | null>(null);
  const [signals, setSignals] = useState<SignalsResponse | null>(null);
  const [pairsData, setPairsData] = useState<PairsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/dev/granville/positions`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API_BASE}/api/dev/granville/b4_entry`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API_BASE}/api/dev/granville/long-recommendations`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API_BASE}/api/dev/reversal/signals`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API_BASE}/api/dev/pairs/signals`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([pos, b4, lr, sig, pairs]) => {
      setPosData(pos); setB4Entry(b4); setLongRecs(lr); setSignals(sig); setPairsData(pairs);
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetch(`${API_BASE}/api/dev/granville/refresh`, { method: 'POST' }),
        fetch(`${API_BASE}/api/dev/reversal/refresh`, { method: 'POST' }),
        fetch(`${API_BASE}/api/dev/pairs/refresh`, { method: 'POST' }),
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
  const bearishSort = useSortable<Signal>(signals?.bearish || [], 'body_pct');
  const pairSort = useSortable<PairSignal>(pairsData?.entry || [], 'z_abs');

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
              Granville + Bearish Reversal + Pairs
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
              <StatCard label="本日シグナル" sub={`G: ${(longRecs?.count ?? 0) + (b4Entry?.selected?.length ?? 0)} / 陰線: ${signals?.bearish_count ?? 0} / P: ${pairsData?.entry_count ?? 0}`}>
                <span className="text-foreground">{(longRecs?.count ?? 0) + (b4Entry?.selected?.length ?? 0) + (signals?.bearish_count ?? 0) + (pairsData?.entry_count ?? 0)}</span>
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
                  <th className="text-center px-2 py-3 text-xs font-medium whitespace-nowrap">売買</th>
                  <SortHeader<Position> label="コード" field="ticker" {...exitSort} className="text-left px-2 py-3 text-xs font-medium whitespace-nowrap" />
                  <th className="text-left px-2 py-3 text-xs font-medium whitespace-nowrap">銘柄</th>
                  <th className="text-right px-2 py-3 text-xs font-medium whitespace-nowrap">建日</th>
                  <th className="text-right px-2 py-3 text-xs font-medium whitespace-nowrap">日数/MH</th>
                  <th className="text-right px-2 py-3 text-xs font-medium whitespace-nowrap">建単価</th>
                  <th className="text-right px-2 py-3 text-xs font-medium whitespace-nowrap">現在値</th>
                  <th className="text-right px-2 py-3 text-xs font-medium whitespace-nowrap">発火ライン</th>
                  <SortHeader<Position> label="含み%" field="unrealized_pct" {...exitSort} className="text-right px-2 py-3 text-xs font-medium whitespace-nowrap" />
                  <SortHeader<Position> label="含み損益" field="unrealized_yen" {...exitSort} className="text-right px-2 py-3 text-xs font-medium whitespace-nowrap" />
                  <th className="text-center px-2 py-3 text-xs font-medium whitespace-nowrap">アクション</th>
                </tr></thead>
                <tbody className="divide-y divide-border/30">
                  {exitSort.sorted.map((p, i) => (
                    <tr key={`exit-${p.ticker}-${i}`} className="hover:bg-amber-500/5">
                      <td className="px-2 py-4 text-center">
                        <span className={`inline-block min-w-[40px] text-center px-2 py-1 text-xs rounded border ${p.direction === '売建' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                          {p.direction || '-'}
                        </span>
                      </td>
                      <td className="px-2 py-4 tabular-nums"><TickerLink ticker={p.ticker} /></td>
                      <td className="px-2 py-4 text-foreground max-w-[140px] truncate">{p.stock_name}</td>
                      <td className="px-2 py-4 text-right tabular-nums text-muted-foreground text-xs">{p.entry_date ? shortDate(p.entry_date) : '-'}</td>
                      <td className="px-2 py-4 text-right tabular-nums text-muted-foreground">{p.hold_days}/{p.max_hold || 15}</td>
                      <td className="px-2 py-4 text-right tabular-nums text-muted-foreground whitespace-nowrap">&yen;{fmt(p.entry_price)}</td>
                      <td className="px-2 py-4 text-right tabular-nums text-foreground whitespace-nowrap">&yen;{fmt(p.current_price)}</td>
                      <td className={`px-2 py-4 text-right tabular-nums font-semibold ${p.high_20d > 0 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                        {p.high_20d > 0 ? `¥${fmt(Math.round(p.high_20d))}` : '-'}
                      </td>
                      <td className={`px-2 py-4 text-right tabular-nums ${p.unrealized_pct >= 0 ? 'text-price-up' : 'text-price-down'}`}>{fmtPct(p.unrealized_pct, 2)}</td>
                      <td className="px-2 py-4 text-right tabular-nums">{fmtPnl(p.unrealized_yen)}</td>
                      <td className="px-2 py-4 text-center">
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
                  <th className="text-center px-2 py-3 text-xs font-medium whitespace-nowrap">売買</th>
                  <SortHeader<Position> label="コード" field="ticker" {...activeSort} className="text-left px-2 py-3 text-xs font-medium whitespace-nowrap" />
                  <th className="text-left px-2 py-3 text-xs font-medium whitespace-nowrap">銘柄</th>
                  <th className="text-center px-2 py-3 text-xs font-medium whitespace-nowrap">信用区分</th>
                  <th className="text-right px-2 py-3 text-xs font-medium whitespace-nowrap">建日</th>
                  <th className="text-right px-2 py-3 text-xs font-medium whitespace-nowrap">日数/MH</th>
                  <th className="text-right px-2 py-3 text-xs font-medium whitespace-nowrap">建単価</th>
                  <th className="text-right px-2 py-3 text-xs font-medium whitespace-nowrap">現在値</th>
                  <th className="text-right px-2 py-3 text-xs font-medium whitespace-nowrap">発火ライン</th>
                  <SortHeader<Position> label="含み%" field="unrealized_pct" {...activeSort} className="text-right px-2 py-3 text-xs font-medium whitespace-nowrap" />
                  <SortHeader<Position> label="含み損益" field="unrealized_yen" {...activeSort} className="text-right px-2 py-3 text-xs font-medium whitespace-nowrap" />
                </tr></thead>
                <tbody className="divide-y divide-border/30">
                  {activeSort.sorted.map((p, i) => (
                    <tr key={`pos-${p.ticker}-${i}`} className="hover:bg-muted/5">
                      <td className="px-2 py-4 text-center">
                        <span className={`inline-block min-w-[40px] text-center px-2 py-1 text-xs rounded border ${p.direction === '売建' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                          {p.direction || '-'}
                        </span>
                      </td>
                      <td className="px-2 py-4 tabular-nums"><TickerLink ticker={p.ticker} /></td>
                      <td className="px-2 py-4 text-foreground max-w-[140px] truncate">{p.stock_name}</td>
                      <td className="px-2 py-4 text-center text-xs text-muted-foreground">{p.margin_type}</td>
                      <td className="px-2 py-4 text-right tabular-nums text-muted-foreground text-xs">{p.entry_date ? shortDate(p.entry_date) : '-'}</td>
                      <td className="px-2 py-4 text-right tabular-nums text-muted-foreground">{p.hold_days}/{p.max_hold || 15}</td>
                      <td className="px-2 py-4 text-right tabular-nums text-muted-foreground whitespace-nowrap">&yen;{fmt(p.entry_price)}</td>
                      <td className="px-2 py-4 text-right tabular-nums text-foreground whitespace-nowrap">&yen;{fmt(p.current_price)}</td>
                      <td className={`px-2 py-4 text-right tabular-nums font-semibold ${p.high_20d > 0 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                        {p.high_20d > 0 ? `¥${fmt(Math.round(p.high_20d))}` : '-'}
                      </td>
                      <td className={`px-2 py-4 text-right tabular-nums ${p.unrealized_pct >= 0 ? 'text-price-up' : 'text-price-down'}`}>{fmtPct(p.unrealized_pct, 2)}</td>
                      <td className="px-2 py-4 text-right tabular-nums">{fmtPnl(p.unrealized_yen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {/* ===== B1-B4 エントリー判定 (Granville統合) ===== */}
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
                  ? <span className="px-3 py-1 rounded-full text-sm font-bold border text-price-up bg-emerald-500/10 border-emerald-500/30">{totalEntries}件</span>
                  : <span className="px-3 py-1 rounded-full text-sm border text-muted-foreground bg-muted/10 border-border/40">候補なし</span>
                }
              </div>
            } border={borderColor}>
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
                        <tr className="border-b border-border/20"><td className="py-1 pr-3 font-medium text-foreground/70 w-10">B1</td><td className="py-1">MA上抜けブレイク — 前日SMA20下→当日上抜け、SMA上昇中</td></tr>
                        <tr className="border-b border-border/20"><td className="py-1 pr-3 font-medium text-foreground/70">B2</td><td className="py-1">上昇中の押し目 — SMA上昇中、乖離-5~0%、陽線、SMA下</td></tr>
                        <tr className="border-b border-border/20"><td className="py-1 pr-3 font-medium text-foreground/70">B3</td><td className="py-1">MA接近で反発 — SMA上昇中+上、乖離0~3%で縮小中、陽線</td></tr>
                        <tr><td className="py-1 pr-3 font-medium text-foreground/70">B4</td><td className="py-1">暴落リバウンド — SMA20乖離 &lt; -15%、陽線、急騰フィルター付き</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <div className="font-medium text-foreground/80 mb-1">ロングフィルター（B1-B3に適用）</div>
                    <table className="w-full border-collapse">
                      <tbody className="text-muted-foreground">
                        <tr className="border-b border-border/20"><td className="py-1 pr-3 w-10"><span className="px-1 py-0.5 rounded border bg-rose-500/20 text-rose-400 border-rose-500/30">H1</span></td><td className="py-1">VI&ge;30 + B1 &rarr; 9日保有 — 恐怖局面でのMA上抜け反発</td><td className="py-1 text-right tabular-nums">PF 2.13</td></tr>
                        <tr className="border-b border-border/20"><td className="py-1 pr-3"><span className="px-1 py-0.5 rounded border bg-emerald-500/20 text-emerald-400 border-emerald-500/30">H2</span></td><td className="py-1">N225&gt;SMA20 + CME flat(&plusmn;0.5%) + B3 &rarr; 9日保有 — 静かな上昇トレンドの押し目</td><td className="py-1 text-right tabular-nums">PF 2.67</td></tr>
                        <tr><td className="py-1 pr-3"><span className="px-1 py-0.5 rounded border bg-amber-500/20 text-amber-400 border-amber-500/30">H3</span></td><td className="py-1">N225 ret20&lt;-5% + B1 &rarr; 4日保有 — 急落後のブレイク反発</td><td className="py-1 text-right tabular-nums">PF 2.38</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <div className="font-medium text-foreground/80 mb-1">B4エントリー条件</div>
                    <p className="text-muted-foreground">VI&ge;25で発動。乖離深い順に資金枠内で選定。出口: 直近高値更新&rarr;翌寄付 or MH15。PF 2.79（全期間）</p>
                    <p className="text-muted-foreground mt-0.5">除外: VI30-40&times;CME膠着 / VI30-40&times;GU / N225&lt;-3%</p>
                  </div>
                </div>
              </details>

              {/* 統合テーブル（グレード優先） */}
              {(() => {
                const gradeOrder: Record<string, number> = { B4: 0, H2: 1, H3: 2, H1: 3 };
                type UnifiedRow = { ticker: string; stock_name: string; sector: string; rule: string; grade: string; close: number; dev_from_sma20: number; hold_days: number; max_cost?: number; };
                const rows: UnifiedRow[] = [];
                if (longRecs) {
                  for (const r of longRecs.long_recommendations) {
                    rows.push({ ticker: r.ticker, stock_name: r.stock_name, sector: r.sector, rule: r.rule, grade: r.long_grade, close: r.close, dev_from_sma20: r.dev_from_sma20, hold_days: r.hold_days });
                  }
                }
                if (b4Entry?.selected) {
                  for (const c of b4Entry.selected) {
                    rows.push({ ticker: c.ticker, stock_name: c.stock_name, sector: c.sector, rule: 'B4', grade: 'B4', close: c.close, dev_from_sma20: c.dev_from_sma20, hold_days: 15, max_cost: c.max_cost });
                  }
                }
                rows.sort((a, b) => (gradeOrder[a.grade] ?? 99) - (gradeOrder[b.grade] ?? 99));

                if (rows.length === 0) return (
                  <div className="px-4 py-4 text-center text-muted-foreground text-sm border-t border-border/20">
                    {b4Decision === 'excluded' ? 'B4除外ルール該当' :
                     b4Decision === 'wait' ? `B4待機 (VI=${b4Entry?.vi} < 25)` :
                     lrCount === 0 && (!b4Entry || b4Entry.total_b4_signals === 0) ? 'B1-B3フィルター不成立 / B4シグナルなし' :
                     'エントリー候補なし'}
                  </div>
                );

                return (
                  <div className="overflow-x-auto border-t border-border/20">
                    <table className="w-full text-sm md:text-base">
                            <thead>
                        <tr className="text-foreground border-b border-border/40 bg-muted/30">
                          <th className="text-center px-2 py-3 text-xs font-medium whitespace-nowrap">ルール</th>
                          <th className="text-left px-2 py-3 text-xs font-medium whitespace-nowrap">コード</th>
                          <th className="text-left px-2 py-3 text-xs font-medium whitespace-nowrap">銘柄</th>
                          <th className="text-left px-2 py-3 text-xs font-medium whitespace-nowrap">セクター</th>
                          <th className="text-center px-2 py-3 text-xs font-medium whitespace-nowrap">グレード</th>
                          <th className="text-right px-2 py-3 text-xs font-medium whitespace-nowrap">終値</th>
                          <th className="text-right px-2 py-3 text-xs font-medium whitespace-nowrap">SMA20乖離</th>
                          <th className="text-center px-2 py-3 text-xs font-medium whitespace-nowrap">保有</th>
                          {rows.some(r => r.max_cost) && <th className="text-right px-2 py-3 text-xs font-medium whitespace-nowrap">取引上限</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {rows.map((r, i) => (
                          <tr key={`${r.ticker}-${r.rule}`} className="hover:bg-muted/5">
                            <td className="px-2 py-4 text-center"><RuleBadge rule={r.rule} /></td>
                            <td className="px-2 py-4 tabular-nums"><TickerLink ticker={r.ticker} /></td>
                            <td className="px-2 py-4 text-foreground">{r.stock_name}</td>
                            <td className="px-2 py-4 text-muted-foreground text-xs max-w-[120px] truncate">{r.sector}</td>
                            <td className="px-2 py-4 text-center">
                              <span className={`inline-block min-w-[40px] text-center px-2 py-1 text-xs rounded border ${gradeCls(r.grade)}`}>
                                {r.grade === 'B4' ? 'B4' : `${r.grade} ${gradeLabel(r.grade)}`}
                              </span>
                            </td>
                            <td className="px-2 py-4 text-right tabular-nums">&yen;{r.close.toLocaleString()}</td>
                            <td className="px-2 py-4 text-right tabular-nums">{fmtPct(r.dev_from_sma20, 1)}</td>
                            <td className="px-2 py-4 text-center">{r.hold_days}d</td>
                            {rows.some(x => x.max_cost) && <td className="px-2 py-4 text-right tabular-nums">{r.max_cost ? fmt(r.max_cost) : '-'}</td>}
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

        {/* ===== Bearish Entry Candidates ===== */}
        <Panel title={
          <div className="flex items-center gap-2">
            <h2 className="text-base md:text-lg font-semibold">大陰線 エントリー候補</h2>
            <span className="text-xs text-muted-foreground">実体 &le; -5% / VI &ge; 20 / &le; &yen;15,000</span>
            {signals && signals.bearish.length > 0 && (
              <span className="ml-auto text-xs tabular-nums text-violet-400">{signals.bearish.length}件</span>
            )}
          </div>
        } border={signals && signals.bearish.length > 0 ? 'border-violet-500/40' : undefined}>
          {signals && signals.bearish.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm md:text-base">
                <thead><tr className="text-foreground border-b border-border/40 bg-muted/30">
                  <th className="text-center px-2 py-3 text-xs font-medium whitespace-nowrap">戦略</th>
                  <SortHeader<Signal> label="コード" field="ticker" {...bearishSort} className="text-left px-2 py-3 text-xs font-medium whitespace-nowrap" />
                  <th className="text-left px-2 py-3 text-xs font-medium whitespace-nowrap">銘柄</th>
                  <th className="text-left px-2 py-3 text-xs font-medium whitespace-nowrap">セクター</th>
                  <SortHeader<Signal> label="終値" field="close" {...bearishSort} className="text-right px-2 py-3 text-xs font-medium whitespace-nowrap" />
                  <SortHeader<Signal> label="実体%" field="body_pct" {...bearishSort} className="text-right px-2 py-3 text-xs font-medium whitespace-nowrap" />
                  <SortHeader<Signal> label="SMA20乖離" field="dev_from_sma20" {...bearishSort} className="text-right px-2 py-3 text-xs font-medium whitespace-nowrap" />
                  <th className="text-right px-2 py-3 text-xs font-medium whitespace-nowrap">SMA20</th>
                  <th className="text-right px-2 py-3 text-xs font-medium whitespace-nowrap">推定IN</th>
                </tr></thead>
                <tbody className="divide-y divide-border/30">
                  {bearishSort.sorted.map((s, i) => (
                    <tr key={s.ticker} className="hover:bg-muted/10">
                      <td className="px-2 py-4 text-center">
                        <span className="inline-block min-w-[40px] text-center px-2 py-1 text-xs rounded border bg-violet-500/20 text-violet-400 border-violet-500/30">陰線</span>
                      </td>
                      <td className="px-2 py-4 tabular-nums"><TickerLink ticker={s.ticker} /></td>
                      <td className="px-2 py-4 text-foreground">{s.stock_name}</td>
                      <td className="px-2 py-4 text-muted-foreground text-xs max-w-[120px] truncate">{s.sector}</td>
                      <td className="text-right px-2 py-4 tabular-nums text-muted-foreground whitespace-nowrap">{fmt(s.close)}</td>
                      <td className="text-right px-2 py-4 tabular-nums text-price-down font-semibold">{s.body_pct.toFixed(1)}%</td>
                      <td className="text-right px-2 py-4 tabular-nums text-price-down">{s.dev_from_sma20.toFixed(1)}%</td>
                      <td className="text-right px-2 py-4 tabular-nums text-muted-foreground whitespace-nowrap">{fmt(Math.round(s.sma20))}</td>
                      <td className="text-right px-2 py-4 tabular-nums text-muted-foreground whitespace-nowrap">{fmt(s.entry_price_est)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message={
              vi !== null && vi < 20
                ? `VI=${vi} < 20: 平穏相場では大陰線シグナルは発生しません`
                : '本日の大陰線シグナルなし'
            } />
          )}
        </Panel>

        {/* ===== Pairs Entry Candidates ===== */}
        <Panel title={
          <div className="flex items-center gap-2">
            <h2 className="text-base md:text-lg font-semibold">ペア エントリー候補</h2>
            <span className="text-xs text-muted-foreground">|z| &ge; 2.0 / 共和分ベース161ペア</span>
            {pairsData && pairsData.entry.length > 0 && (
              <span className="ml-auto text-xs tabular-nums text-blue-400">{pairsData.entry.length}件</span>
            )}
          </div>
        } border={pairsData && pairsData.entry.length > 0 ? 'border-blue-500/40' : undefined}
          footer={pairsData ? <span>{pairsData.total}ペア中 {pairsData.entry_count}件エントリー ({pairsData.signal_date})</span> : undefined}>
          {pairsData && pairsData.entry.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm md:text-base">
                <thead><tr className="text-foreground border-b border-border/40 bg-muted/30">
                  <th className="text-center px-2 py-3 text-xs font-medium whitespace-nowrap">#</th>
                  <th className="text-center px-2 py-3 text-xs font-medium whitespace-nowrap">L/S</th>
                  <th className="text-left px-2 py-3 text-xs font-medium whitespace-nowrap">コード1</th>
                  <th className="text-left px-2 py-3 text-xs font-medium whitespace-nowrap">銘柄1</th>
                  <th className="text-center px-2 py-3 text-xs font-medium whitespace-nowrap">L/S</th>
                  <th className="text-left px-2 py-3 text-xs font-medium whitespace-nowrap">コード2</th>
                  <th className="text-left px-2 py-3 text-xs font-medium whitespace-nowrap">銘柄2</th>
                  <SortHeader<PairSignal> label="z-score" field="z_abs" {...pairSort} className="text-right px-2 py-3 text-xs font-medium whitespace-nowrap" />
                  <th className="text-right px-2 py-3 text-xs font-medium whitespace-nowrap">株数</th>
                  <SortHeader<PairSignal> label="PF" field="full_pf" {...pairSort} className="text-right px-2 py-3 text-xs font-medium whitespace-nowrap" />
                  <th className="text-right px-2 py-3 text-xs font-medium whitespace-nowrap hidden md:table-cell">LB</th>
                  <th className="text-right px-2 py-3 text-xs font-medium whitespace-nowrap hidden md:table-cell">半減期</th>
                </tr></thead>
                <tbody className="divide-y divide-border/30">
                  {pairSort.sorted.map((p, i) => {
                    const isLong = p.direction === 'long_tk1';
                    const pairHref = `/pairs/${p.tk1.replace('.', '')}-${p.tk2.replace('.', '')}`;
                    return (
                      <tr key={`${p.tk1}-${p.tk2}`} className="hover:bg-muted/10 cursor-pointer" onClick={() => window.open(pairHref, '_blank')}>
                        <td className="text-center px-2 py-4 text-muted-foreground">{i + 1}</td>
                        <td className="text-center px-2 py-4">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${isLong ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                            {isLong ? 'L' : 'S'}
                          </span>
                        </td>
                        <td className="px-2 py-4 tabular-nums"><TickerLink ticker={p.tk1} /></td>
                        <td className="px-2 py-4 text-foreground">{p.name1}</td>
                        <td className="text-center px-2 py-4">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${isLong ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                            {isLong ? 'S' : 'L'}
                          </span>
                        </td>
                        <td className="px-2 py-4 tabular-nums"><TickerLink ticker={p.tk2} /></td>
                        <td className="px-2 py-4 text-foreground">{p.name2}</td>
                        <td className="text-right px-2 py-4 tabular-nums font-semibold">{fmtZ(p.z_latest)}</td>
                        <td className="text-right px-2 py-4 tabular-nums text-muted-foreground">{p.shares1}:{p.shares2}</td>
                        <td className="text-right px-2 py-4 tabular-nums text-foreground">{p.full_pf.toFixed(2)}</td>
                        <td className="text-right px-2 py-4 tabular-nums text-muted-foreground hidden md:table-cell">{p.lookback}</td>
                        <td className="text-right px-2 py-4 tabular-nums text-muted-foreground hidden md:table-cell">{p.half_life.toFixed(1)}d</td>
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

      </div>
    </main>
  );
}
