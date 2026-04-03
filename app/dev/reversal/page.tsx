'use client';

import { useEffect, useState } from 'react';
import { DevNavLinks } from '../../../components/dev';
import { RefreshCw } from 'lucide-react';

// === Types ===
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

interface StatusResponse {
  vi: number | null; vi_signal: string;
  cash_margin: number; position_count: number;
  bearish_count: number; bearish_date: string | null;
  bearish_open: number; bearish_exit: number;
  b4_count: number; b4_date: string | null;
  signal_date: string | null;
}

interface Position {
  ticker: string; stock_name: string; strategy: string;
  entry_date: string; entry_price: number; current_price: number; sma20: number;
  pct: number; pnl: number; hold_days: number; max_hold: number;
  status: string; exit_type: string;
}
interface PositionsResponse {
  positions: Position[]; exits: Position[];
  bearish_count: number; b4_count: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

// === Helpers ===
const fmt = (v: number | null | undefined) => (v ?? 0).toLocaleString('ja-JP');
const fmtPnl = (v: number | null | undefined) => { const n = v ?? 0; return <span className={n >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{n >= 0 ? '+' : ''}{fmt(n)}円</span>; };
const fmtPct = (v: number | null | undefined, d = 1) => { const n = v ?? 0; return `${n >= 0 ? '+' : ''}${n.toFixed(d)}%`; };
const shortDate = (d: string) => { const m = d.match(/\d{4}-(\d{2})-(\d{2})/); return m ? `${m[1]}/${m[2]}` : d; };

// === Strategy Badge ===
const StrategyBadge = ({ strategy }: { strategy: string }) => {
  const cls = strategy === 'bearish'
    ? 'bg-violet-500/20 text-violet-400 border-violet-500/30'
    : 'bg-rose-500/20 text-rose-400 border-rose-500/30';
  const label = strategy === 'bearish' ? '大陰線' : 'B4';
  return <span className={`inline-block px-1.5 py-0.5 text-xs rounded leading-none border ${cls}`}>{label}</span>;
};

const exitLabel = (t: string) => {
  if (t === 'sma20_return') return { text: 'SMA20回帰→SMA20指値', cls: 'text-emerald-400' };
  if (t === 'stop_loss') return { text: 'Day3損切り→翌寄付', cls: 'text-rose-400' };
  if (t === 'max_hold') return { text: 'MAX_HOLD→翌寄付', cls: 'text-amber-400' };
  if (t === 'high_update') return { text: '高値更新→翌寄付', cls: 'text-emerald-400' };
  if (t === '20d_high') return { text: '高値更新→翌寄付', cls: 'text-emerald-400' };
  return { text: t || '保有中', cls: 'text-muted-foreground' };
};

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
  <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 px-5 py-4 shadow-lg shadow-black/5 backdrop-blur-xl">
    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
    <div className="relative">
      <div className="text-muted-foreground text-sm mb-2">{label}</div>
      <div className="text-xl font-bold text-right tabular-nums">{children}</div>
      {sub && <div className="text-sm text-right mt-1 text-muted-foreground tabular-nums">{sub}</div>}
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

// === Main ===
export default function ReversalPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [signals, setSignals] = useState<SignalsResponse | null>(null);
  const [posData, setPosData] = useState<PositionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/dev/reversal/status`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/api/dev/reversal/signals`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/api/dev/reversal/positions`).then(r => r.json()).catch(() => null),
    ]).then(([st, sig, pos]) => {
      setStatus(st); setSignals(sig); setPosData(pos); setLoading(false);
    });
  };

  useEffect(() => { fetchData(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch(`${API_BASE}/api/dev/reversal/refresh`, { method: 'POST' });
      fetchData();
    } finally {
      setRefreshing(false);
    }
  };

  // Sortable hooks
  const bearishSort = useSortable<Signal>(signals?.bearish || [], 'body_pct');
  const b4Sort = useSortable<Signal>(signals?.b4 || [], 'dev_from_sma20');
  const posSort = useSortable<Position>(posData?.positions || [], 'pct');

  if (loading) {
    return (
      <main className="relative min-h-screen">
        <div className="fixed inset-0 -z-10"><div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" /></div>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="h-6 w-48 bg-muted/50 rounded mb-4 animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {[...Array(5)].map((_, i) => <div key={i} className="rounded-xl border border-border/40 bg-card/50 p-5 h-24 animate-pulse" />)}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-violet-500/8 via-violet-500/3 to-transparent blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4 pb-3 border-b border-border/30">
          <div>
            <h1 className="text-xl font-bold text-foreground">Reversal — 逆張り統合</h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              B4(-15%暴落反発) + 大陰線(-5%逆張り) 統合ビュー
              {status?.signal_date ? ` (${status.signal_date})` : ''}
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

        {/* Status Bar */}
        {status && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
            <StatCard label="日経VI" sub={status.vi_signal === 'green' ? 'VI≥20: 逆張り有効' : 'VI<20: 逆張り無効'}>
              <span className={status.vi && status.vi >= 20 ? 'text-emerald-400' : 'text-rose-400'}>
                {status.vi ?? '-'}
              </span>
            </StatCard>
            <StatCard label="現金保証金">
              <span className="text-foreground">¥{fmt(status.cash_margin)}</span>
            </StatCard>
            <StatCard label="大陰線シグナル" sub={status.bearish_open > 0 ? `保有中: ${status.bearish_open}件` : undefined}>
              <span className={status.bearish_count > 0 ? 'text-violet-400' : 'text-muted-foreground'}>
                {status.bearish_count}
              </span>
            </StatCard>
            <StatCard label="B4シグナル">
              <span className={status.b4_count > 0 ? 'text-rose-400' : 'text-muted-foreground'}>
                {status.b4_count}
              </span>
            </StatCard>
            <StatCard label="ポジション合計">
              <span className="text-foreground">{status.position_count}</span>
            </StatCard>
          </div>
        )}

        {/* Exit Candidates */}
        {posData && posData.exits.length > 0 && (
          <Panel title={
            <h2 className="text-base md:text-lg font-semibold text-amber-400">
              Exit候補 — {posData.exits.length}件
            </h2>
          } border="border-amber-500/40">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-muted-foreground border-b border-border/30 bg-muted/10">
                  <th className="text-center px-3 py-2 text-xs font-medium">戦略</th>
                  <th className="text-left px-3 py-2 text-xs font-medium">コード</th>
                  <th className="text-left px-3 py-2 text-xs font-medium">銘柄</th>
                  <th className="text-right px-3 py-2 text-xs font-medium">IN日</th>
                  <th className="text-right px-3 py-2 text-xs font-medium">IN価格</th>
                  <th className="text-right px-3 py-2 text-xs font-medium">現在値</th>
                  <th className="text-right px-3 py-2 text-xs font-medium">損益%</th>
                  <th className="text-right px-3 py-2 text-xs font-medium">損益</th>
                  <th className="text-right px-3 py-2 text-xs font-medium">日数</th>
                  <th className="text-left px-3 py-2 text-xs font-medium">理由</th>
                  <th className="text-right px-3 py-2 text-xs font-medium">指値</th>
                </tr></thead>
                <tbody>
                  {posData.exits.map((p, i) => {
                    const el = exitLabel(p.exit_type);
                    const limitPrice = p.strategy === 'bearish' && p.exit_type === 'sma20_return' && p.sma20 > 0
                      ? Math.round(p.sma20) : null;
                    return (
                      <tr key={i} className="border-b border-border/20 hover:bg-muted/5">
                        <td className="px-3 py-2.5 text-center"><StrategyBadge strategy={p.strategy} /></td>
                        <td className="px-3 py-2.5 tabular-nums font-semibold">
                          <button type="button" className="hover:text-primary" onClick={() => window.open(`/${p.ticker.replace('.T', '')}`, 'stock-detail')}>
                            {p.ticker.replace('.T', '')}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 max-w-[140px] truncate">{p.stock_name}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{shortDate(p.entry_date)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">¥{fmt(p.entry_price)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">¥{fmt(p.current_price)}</td>
                        <td className={`px-3 py-2.5 text-right tabular-nums ${p.pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtPct(p.pct, 2)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{fmtPnl(p.pnl)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{p.hold_days}/{p.max_hold}</td>
                        <td className={`px-3 py-2.5 ${el.cls}`}>{el.text}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-amber-400 font-semibold">
                          {limitPrice ? `¥${fmt(limitPrice)}` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {/* 大陰線シグナル */}
        <Panel title={
          <div className="flex items-center gap-2">
            <h2 className="text-base md:text-lg font-semibold">大陰線シグナル</h2>
            <span className="text-xs text-muted-foreground">実体≤-5% / VI≥20 / 株価≤¥15,000 / 急騰除外</span>
          </div>
        } border={signals && signals.bearish.length > 0 ? 'border-violet-500/40' : undefined}>
          {signals && signals.bearish.length > 0 ? (
            <>
              <div className="px-4 py-2 text-xs text-muted-foreground">
                出口: SMA20回帰→SMA20指値（GD時は翌日指値+大引不成） / Day3損切り(-3%) / MAX_HOLD 30日
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-muted-foreground border-b border-border/30 bg-muted/10">
                    <th className="text-center px-3 py-2 text-xs font-medium">#</th>
                    <SortHeader<Signal> label="コード" field="ticker" {...bearishSort} className="text-left px-3 py-2 text-xs font-medium" />
                    <th className="text-left px-3 py-2 text-xs font-medium">銘柄</th>
                    <SortHeader<Signal> label="終値" field="close" {...bearishSort} className="text-right px-3 py-2 text-xs font-medium" />
                    <SortHeader<Signal> label="実体%" field="body_pct" {...bearishSort} className="text-right px-3 py-2 text-xs font-medium" />
                    <SortHeader<Signal> label="SMA20乖離" field="dev_from_sma20" {...bearishSort} className="text-right px-3 py-2 text-xs font-medium" />
                    <th className="text-right px-3 py-2 text-xs font-medium">SMA20</th>
                    <th className="text-right px-3 py-2 text-xs font-medium">推定IN</th>
                    <th className="text-left px-3 py-2 text-xs font-medium">セクター</th>
                  </tr></thead>
                  <tbody>
                    {bearishSort.sorted.map((s, i) => (
                      <tr key={s.ticker} className="border-b border-border/20 hover:bg-muted/10">
                        <td className="text-center px-3 py-2.5 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2.5 tabular-nums">
                          <button type="button" className="hover:text-primary font-semibold" onClick={() => window.open(`/${s.ticker.replace('.T', '')}`, 'stock-detail')}>
                            {s.ticker.replace('.T', '')}
                          </button>
                        </td>
                        <td className="px-3 py-2.5">{s.stock_name}</td>
                        <td className="text-right px-3 py-2.5 tabular-nums">{fmt(s.close)}</td>
                        <td className="text-right px-3 py-2.5 tabular-nums text-rose-400 font-semibold">{s.body_pct.toFixed(1)}%</td>
                        <td className="text-right px-3 py-2.5 tabular-nums text-rose-400">{s.dev_from_sma20.toFixed(1)}%</td>
                        <td className="text-right px-3 py-2.5 tabular-nums text-muted-foreground">{fmt(Math.round(s.sma20))}</td>
                        <td className="text-right px-3 py-2.5 tabular-nums">{fmt(s.entry_price_est)}</td>
                        <td className="px-3 py-2.5 text-muted-foreground text-xs max-w-[120px] truncate">{s.sector}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
              {status?.vi && status.vi < 20
                ? `VI=${status.vi} < 20: 平穏相場では大陰線シグナルは発生しません`
                : '本日の大陰線シグナルなし'}
            </div>
          )}
        </Panel>

        {/* B4シグナル */}
        <Panel title={
          <div className="flex items-center gap-2">
            <h2 className="text-base md:text-lg font-semibold">B4シグナル</h2>
            <span className="text-xs text-muted-foreground">SMA20乖離≤-15% / 前日比陽線 / 急騰除外</span>
          </div>
        } border={signals && signals.b4.length > 0 ? 'border-rose-500/40' : undefined}>
          {signals && signals.b4.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-muted-foreground border-b border-border/30 bg-muted/10">
                  <th className="text-center px-3 py-2 text-xs font-medium">#</th>
                  <SortHeader<Signal> label="コード" field="ticker" {...b4Sort} className="text-left px-3 py-2 text-xs font-medium" />
                  <th className="text-left px-3 py-2 text-xs font-medium">銘柄</th>
                  <SortHeader<Signal> label="終値" field="close" {...b4Sort} className="text-right px-3 py-2 text-xs font-medium" />
                  <SortHeader<Signal> label="SMA20乖離" field="dev_from_sma20" {...b4Sort} className="text-right px-3 py-2 text-xs font-medium" />
                  <th className="text-right px-3 py-2 text-xs font-medium">推定IN</th>
                  <th className="text-left px-3 py-2 text-xs font-medium">セクター</th>
                </tr></thead>
                <tbody>
                  {b4Sort.sorted.map((s, i) => (
                    <tr key={s.ticker} className="border-b border-border/20 hover:bg-muted/10">
                      <td className="text-center px-3 py-2.5 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2.5 tabular-nums">
                        <button type="button" className="hover:text-primary font-semibold" onClick={() => window.open(`/${s.ticker.replace('.T', '')}`, 'stock-detail')}>
                          {s.ticker.replace('.T', '')}
                        </button>
                      </td>
                      <td className="px-3 py-2.5">{s.stock_name}</td>
                      <td className="text-right px-3 py-2.5 tabular-nums">{fmt(s.close)}</td>
                      <td className="text-right px-3 py-2.5 tabular-nums text-rose-400 font-semibold">{s.dev_from_sma20.toFixed(1)}%</td>
                      <td className="text-right px-3 py-2.5 tabular-nums">{fmt(s.entry_price_est)}</td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs max-w-[120px] truncate">{s.sector}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
              本日のB4(-15%)シグナルなし
            </div>
          )}
        </Panel>

        {/* 統合ポジション */}
        {posData && posData.positions.length > 0 && (
          <Panel title={`保有ポジション — ${posData.positions.length}件`}
            footer={<span>合計含み損益: <span className="font-bold tabular-nums ml-1">{fmtPnl(posData.positions.reduce((s, p) => s + p.pnl, 0))}</span></span>}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-muted-foreground border-b border-border/30 bg-muted/10">
                  <th className="text-center px-3 py-2 text-xs font-medium">戦略</th>
                  <SortHeader<Position> label="コード" field="ticker" {...posSort} className="text-left px-3 py-2 text-xs font-medium" />
                  <th className="text-left px-3 py-2 text-xs font-medium">銘柄</th>
                  <th className="text-right px-3 py-2 text-xs font-medium">IN日</th>
                  <th className="text-right px-3 py-2 text-xs font-medium">IN価格</th>
                  <th className="text-right px-3 py-2 text-xs font-medium">現在値</th>
                  <th className="text-right px-3 py-2 text-xs font-medium hidden md:table-cell">SMA20</th>
                  <SortHeader<Position> label="損益%" field="pct" {...posSort} className="text-right px-3 py-2 text-xs font-medium" />
                  <SortHeader<Position> label="損益" field="pnl" {...posSort} className="text-right px-3 py-2 text-xs font-medium" />
                  <SortHeader<Position> label="日数" field="hold_days" {...posSort} className="text-right px-3 py-2 text-xs font-medium" />
                </tr></thead>
                <tbody>
                  {posSort.sorted.map((p, i) => (
                    <tr key={`${p.strategy}-${p.ticker}-${i}`} className="border-b border-border/20 hover:bg-muted/5">
                      <td className="px-3 py-2.5 text-center"><StrategyBadge strategy={p.strategy} /></td>
                      <td className="px-3 py-2.5 tabular-nums font-semibold">
                        <button type="button" className="hover:text-primary" onClick={() => window.open(`/${p.ticker.replace('.T', '')}`, 'stock-detail')}>
                          {p.ticker.replace('.T', '')}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 max-w-[140px] truncate">{p.stock_name}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{shortDate(p.entry_date)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">¥{fmt(p.entry_price)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">¥{fmt(p.current_price)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground hidden md:table-cell">
                        {p.sma20 > 0 ? `¥${fmt(Math.round(p.sma20))}` : '-'}
                      </td>
                      <td className={`px-3 py-2.5 text-right tabular-nums ${p.pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtPct(p.pct, 2)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{fmtPnl(p.pnl)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{p.hold_days}/{p.max_hold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {/* 戦略比較 */}
        <Panel title="戦略パラメータ比較">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-muted-foreground border-b border-border/30 bg-muted/10">
                <th className="text-left px-4 py-2 text-xs font-medium">項目</th>
                <th className="text-center px-4 py-2 text-xs font-medium"><StrategyBadge strategy="B4" /></th>
                <th className="text-center px-4 py-2 text-xs font-medium"><StrategyBadge strategy="bearish" /></th>
              </tr></thead>
              <tbody className="text-sm">
                {[
                  ['シグナル条件', 'SMA20乖離 ≤ -15% & 陽線', '実体 ≤ -5% & VI≥20'],
                  ['対象', 'TOPIX 1,660銘柄', 'Core+Large 100銘柄'],
                  ['株価制限', 'なし', '≤ ¥15,000'],
                  ['エントリー', '翌営業日寄付', '翌営業日寄付'],
                  ['Exit (利確)', '20日高値更新→翌寄付', 'SMA20回帰→SMA20指値'],
                  ['Exit (損切)', 'なし', 'Day3終値 ≤ -3%→翌寄付'],
                  ['MAX_HOLD', '15日', '30日'],
                  ['BT: PF', '4.13', '5.40'],
                  ['BT: 勝率', '82.1%', '77.3%'],
                  ['BT: 平均利益', '+4.40%', '+4.74%'],
                  ['性格', '安定収益', '暴落時ブースター'],
                ].map(([label, b4, bearish]) => (
                  <tr key={label} className="border-b border-border/20">
                    <td className="px-4 py-2 text-muted-foreground">{label}</td>
                    <td className="px-4 py-2 text-center tabular-nums">{b4}</td>
                    <td className="px-4 py-2 text-center tabular-nums">{bearish}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

      </div>
    </main>
  );
}
