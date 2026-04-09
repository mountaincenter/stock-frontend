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
interface B4EntryResponse {
  vi: number | null; cme_gap: number | null; n225_chg: number | null;
  decision: string; date: string | null;
  total_b4_signals: number;
  candidates: { ticker: string; stock_name: string; close: number; dev_from_sma20: number; entry_price_est: number; sector: string }[];
  selected: { ticker: string; stock_name: string; close: number; dev_from_sma20: number; entry_price_est: number; sector: string }[];
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
const fmtPnl = (v: number | null | undefined) => { const n = v ?? 0; return <span className={n >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{n >= 0 ? '+' : ''}{fmt(n)}円</span>; };
const fmtPct = (v: number | null | undefined, d = 1) => { const n = v ?? 0; return `${n >= 0 ? '+' : ''}${n.toFixed(d)}%`; };
const shortDate = (d: string) => { const m = d.match(/\d{4}-(\d{2})-(\d{2})/); return m ? `${m[1]}/${m[2]}` : d; };
const fmtZ = (v: number) => <span className={Math.abs(v) >= 2.0 ? (v > 0 ? 'text-rose-400' : 'text-emerald-400') : Math.abs(v) >= 1.5 ? 'text-amber-400' : 'text-muted-foreground'}>{v >= 0 ? '+' : ''}{v.toFixed(2)}</span>;

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
  <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-3 sm:p-4 shadow-lg shadow-black/5 backdrop-blur-xl">
    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
    <div className="relative">
      <div className="text-muted-foreground text-xs mb-1">{label}</div>
      <div className="text-xl sm:text-2xl font-bold text-right tabular-nums">{children}</div>
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

const EmptyState = ({ message }: { message: string }) => (
  <div className="px-4 py-8 text-center text-muted-foreground text-sm">{message}</div>
);

const TickerLink = ({ ticker }: { ticker: string }) => (
  <button type="button" className="hover:text-primary font-semibold"
    onClick={() => window.open(`/dev/${ticker.replace('.T', '')}`, 'stock-detail')}>
    {ticker.replace('.T', '')}
  </button>
);

// === Main ===
export default function DashboardPage() {
  const [posData, setPosData] = useState<PositionsResponse | null>(null);
  const [b4Entry, setB4Entry] = useState<B4EntryResponse | null>(null);
  const [signals, setSignals] = useState<SignalsResponse | null>(null);
  const [pairsData, setPairsData] = useState<PairsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/dev/granville/positions`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/api/dev/granville/b4_entry`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/api/dev/reversal/signals`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/api/dev/pairs/signals`).then(r => r.json()).catch(() => null),
    ]).then(([pos, b4, sig, pairs]) => {
      setPosData(pos); setB4Entry(b4); setSignals(sig); setPairsData(pairs);
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
  const b4Sort = useSortable<Signal>(signals?.b4 || [], 'dev_from_sma20');
  const bearishSort = useSortable<Signal>(signals?.bearish || [], 'body_pct');
  const pairSort = useSortable<PairSignal>(pairsData?.entry || [], 'z_abs');

  if (loading) {
    return (
      <main className="relative min-h-screen">
        <div className="fixed inset-0 -z-10"><div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" /></div>
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
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-blue-500/8 via-indigo-500/3 to-transparent blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-5">
          <StatCard label="日経VI" sub={vi !== null && vi >= 20 ? 'VI>=20: 逆張り有効' : 'VI<20'}>
            <span className={vi !== null && vi >= 20 ? 'text-emerald-400' : 'text-rose-400'}>
              {vi ?? '-'}
            </span>
          </StatCard>
          <StatCard label="保有" sub={`Exit候補: ${exits.length}件`}>
            <span className="text-foreground">{active.length}件</span>
          </StatCard>
          <StatCard label="含み損益">
            {fmtPnl(totalPnl)}
          </StatCard>
          <StatCard label="本日シグナル" sub={`B4: ${signals?.b4_count ?? 0} / 大陰線: ${signals?.bearish_count ?? 0} / Pairs: ${pairsData?.entry_count ?? 0}`}>
            <span className="text-foreground">{(signals?.b4_count ?? 0) + (signals?.bearish_count ?? 0) + (pairsData?.entry_count ?? 0)}</span>
          </StatCard>
        </div>

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
                      <td className="px-2 py-3 text-center">
                        <span className={`inline-block px-1.5 py-0.5 text-xs rounded leading-none border ${p.direction === '売建' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                          {p.direction || '-'}
                        </span>
                      </td>
                      <td className="px-2 py-3 tabular-nums"><TickerLink ticker={p.ticker} /></td>
                      <td className="px-2 py-3 max-w-[140px] truncate">{p.stock_name}</td>
                      <td className="px-2 py-3 text-right tabular-nums text-muted-foreground text-xs">{p.entry_date ? shortDate(p.entry_date) : '-'}</td>
                      <td className="px-2 py-3 text-right tabular-nums">{p.hold_days}/{p.max_hold || 15}</td>
                      <td className="px-2 py-3 text-right tabular-nums">&yen;{fmt(p.entry_price)}</td>
                      <td className="px-2 py-3 text-right tabular-nums">&yen;{fmt(p.current_price)}</td>
                      <td className={`px-2 py-3 text-right tabular-nums font-semibold ${p.high_20d > 0 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                        {p.high_20d > 0 ? `¥${fmt(Math.round(p.high_20d))}` : '-'}
                      </td>
                      <td className={`px-2 py-3 text-right tabular-nums ${p.unrealized_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtPct(p.unrealized_pct, 2)}</td>
                      <td className="px-2 py-3 text-right tabular-nums">{fmtPnl(p.unrealized_yen)}</td>
                      <td className="px-2 py-3 text-center">
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
                      <td className="px-2 py-3 text-center">
                        <span className={`inline-block px-1.5 py-0.5 text-xs rounded leading-none border ${p.direction === '売建' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                          {p.direction || '-'}
                        </span>
                      </td>
                      <td className="px-2 py-3 tabular-nums"><TickerLink ticker={p.ticker} /></td>
                      <td className="px-2 py-3 max-w-[140px] truncate">{p.stock_name}</td>
                      <td className="px-2 py-3 text-center text-xs text-muted-foreground">{p.margin_type}</td>
                      <td className="px-2 py-3 text-right tabular-nums text-muted-foreground text-xs">{p.entry_date ? shortDate(p.entry_date) : '-'}</td>
                      <td className="px-2 py-3 text-right tabular-nums">{p.hold_days}/{p.max_hold || 15}</td>
                      <td className="px-2 py-3 text-right tabular-nums">&yen;{fmt(p.entry_price)}</td>
                      <td className="px-2 py-3 text-right tabular-nums">&yen;{fmt(p.current_price)}</td>
                      <td className={`px-2 py-3 text-right tabular-nums font-semibold ${p.high_20d > 0 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                        {p.high_20d > 0 ? `¥${fmt(Math.round(p.high_20d))}` : '-'}
                      </td>
                      <td className={`px-2 py-3 text-right tabular-nums ${p.unrealized_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtPct(p.unrealized_pct, 2)}</td>
                      <td className="px-2 py-3 text-right tabular-nums">{fmtPnl(p.unrealized_yen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {/* ===== B4 Entry Candidates ===== */}
        <Panel title={
          <div className="flex items-center gap-2">
            <h2 className="text-base md:text-lg font-semibold">B4 エントリー候補</h2>
            <span className="text-xs text-muted-foreground">SMA20乖離 &le; -15% / 前日比陽線</span>
            {signals && signals.b4.length > 0 && (
              <span className="ml-auto text-xs tabular-nums text-rose-400">{signals.b4.length}件</span>
            )}
          </div>
        } border={signals && signals.b4.length > 0 ? 'border-rose-500/40' : undefined}>
          {signals && signals.b4.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm md:text-base">
                <thead><tr className="text-foreground border-b border-border/40 bg-muted/30">
                  <th className="text-center px-2 py-3 text-xs font-medium whitespace-nowrap">#</th>
                  <SortHeader<Signal> label="コード" field="ticker" {...b4Sort} className="text-left px-2 py-3 text-xs font-medium whitespace-nowrap" />
                  <th className="text-left px-2 py-3 text-xs font-medium whitespace-nowrap">銘柄</th>
                  <SortHeader<Signal> label="終値" field="close" {...b4Sort} className="text-right px-2 py-3 text-xs font-medium whitespace-nowrap" />
                  <SortHeader<Signal> label="SMA20乖離" field="dev_from_sma20" {...b4Sort} className="text-right px-2 py-3 text-xs font-medium whitespace-nowrap" />
                  <th className="text-right px-2 py-3 text-xs font-medium whitespace-nowrap">推定IN</th>
                  <th className="text-left px-2 py-3 text-xs font-medium whitespace-nowrap">セクター</th>
                </tr></thead>
                <tbody className="divide-y divide-border/30">
                  {b4Sort.sorted.map((s, i) => (
                    <tr key={s.ticker} className="hover:bg-muted/10">
                      <td className="text-center px-2 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-2 py-3 tabular-nums"><TickerLink ticker={s.ticker} /></td>
                      <td className="px-2 py-3">{s.stock_name}</td>
                      <td className="text-right px-2 py-3 tabular-nums">{fmt(s.close)}</td>
                      <td className="text-right px-2 py-3 tabular-nums text-rose-400 font-semibold">{s.dev_from_sma20.toFixed(1)}%</td>
                      <td className="text-right px-2 py-3 tabular-nums">{fmt(s.entry_price_est)}</td>
                      <td className="px-2 py-3 text-muted-foreground text-xs max-w-[120px] truncate">{s.sector}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message="本日のB4シグナルなし" />
          )}
        </Panel>

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
                  <th className="text-center px-2 py-3 text-xs font-medium whitespace-nowrap">#</th>
                  <SortHeader<Signal> label="コード" field="ticker" {...bearishSort} className="text-left px-2 py-3 text-xs font-medium whitespace-nowrap" />
                  <th className="text-left px-2 py-3 text-xs font-medium whitespace-nowrap">銘柄</th>
                  <SortHeader<Signal> label="終値" field="close" {...bearishSort} className="text-right px-2 py-3 text-xs font-medium whitespace-nowrap" />
                  <SortHeader<Signal> label="実体%" field="body_pct" {...bearishSort} className="text-right px-2 py-3 text-xs font-medium whitespace-nowrap" />
                  <SortHeader<Signal> label="SMA20乖離" field="dev_from_sma20" {...bearishSort} className="text-right px-2 py-3 text-xs font-medium whitespace-nowrap" />
                  <th className="text-right px-2 py-3 text-xs font-medium whitespace-nowrap">SMA20</th>
                  <th className="text-right px-2 py-3 text-xs font-medium whitespace-nowrap">推定IN</th>
                  <th className="text-left px-2 py-3 text-xs font-medium whitespace-nowrap">セクター</th>
                </tr></thead>
                <tbody className="divide-y divide-border/30">
                  {bearishSort.sorted.map((s, i) => (
                    <tr key={s.ticker} className="hover:bg-muted/10">
                      <td className="text-center px-2 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-2 py-3 tabular-nums"><TickerLink ticker={s.ticker} /></td>
                      <td className="px-2 py-3">{s.stock_name}</td>
                      <td className="text-right px-2 py-3 tabular-nums">{fmt(s.close)}</td>
                      <td className="text-right px-2 py-3 tabular-nums text-rose-400 font-semibold">{s.body_pct.toFixed(1)}%</td>
                      <td className="text-right px-2 py-3 tabular-nums text-rose-400">{s.dev_from_sma20.toFixed(1)}%</td>
                      <td className="text-right px-2 py-3 tabular-nums text-muted-foreground">{fmt(Math.round(s.sma20))}</td>
                      <td className="text-right px-2 py-3 tabular-nums">{fmt(s.entry_price_est)}</td>
                      <td className="px-2 py-3 text-muted-foreground text-xs max-w-[120px] truncate">{s.sector}</td>
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
                  <th className="text-left px-2 py-3 text-xs font-medium whitespace-nowrap">銘柄1</th>
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
                    return (
                      <tr key={`${p.tk1}-${p.tk2}`} className="hover:bg-muted/10">
                        <td className="text-center px-2 py-3 text-muted-foreground align-top">{i + 1}</td>
                        <td className="px-2 py-3 align-top">
                          <div className="flex items-start gap-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded mt-0.5 shrink-0 ${isLong ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                              {isLong ? 'L' : 'S'}
                            </span>
                            <div className="min-w-0">
                              <div className="tabular-nums"><TickerLink ticker={p.tk1} /></div>
                              <div className="text-sm text-muted-foreground leading-snug">{p.name1}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-3 align-top">
                          <div className="flex items-start gap-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded mt-0.5 shrink-0 ${isLong ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                              {isLong ? 'S' : 'L'}
                            </span>
                            <div className="min-w-0">
                              <div className="tabular-nums"><TickerLink ticker={p.tk2} /></div>
                              <div className="text-sm text-muted-foreground leading-snug">{p.name2}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-right px-2 py-3 tabular-nums font-semibold align-top">{fmtZ(p.z_latest)}</td>
                        <td className="text-right px-2 py-3 tabular-nums align-top">{p.shares1}:{p.shares2}</td>
                        <td className="text-right px-2 py-3 tabular-nums align-top">{p.full_pf.toFixed(2)}</td>
                        <td className="text-right px-2 py-3 tabular-nums text-muted-foreground hidden md:table-cell align-top">{p.lookback}</td>
                        <td className="text-right px-2 py-3 tabular-nums text-muted-foreground hidden md:table-cell align-top">{p.half_life.toFixed(1)}d</td>
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
