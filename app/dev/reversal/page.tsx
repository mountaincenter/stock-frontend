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
  bearish: Signal[];
  bearish_count: number;
  bearish_date: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

// === Helpers ===
const fmt = (v: number | null | undefined) => (v ?? 0).toLocaleString('ja-JP');
const fmtPct = (v: number | null | undefined, d = 1) => { const n = v ?? 0; return `${n >= 0 ? '+' : ''}${n.toFixed(d)}%`; };

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

// === Main ===
export default function ReversalPage() {
  const [signals, setSignals] = useState<SignalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/dev/reversal/signals`).then(r => r.json()).catch(() => null)
      .then(sig => { setSignals(sig); setLoading(false); });
  };

  useEffect(() => { fetchData(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch(`${API_BASE}/api/dev/reversal/refresh`, { method: 'POST' });
      fetchData();
    } finally { setRefreshing(false); }
  };

  const bearishSort = useSortable<Signal>(signals?.bearish || [], 'body_pct');
  const vi = signals?.bearish?.[0]?.vi ?? null;

  if (loading) {
    return (
      <main className="relative min-h-screen">
        <div className="fixed inset-0 -z-10 bg-background" />
        <div className="max-w-[1600px] mx-auto px-4 py-4 leading-[1.8] tracking-[0.02em]">
          <div className="h-6 w-64 bg-muted/50 rounded mb-4 animate-pulse" />
          {[...Array(2)].map((_, i) => <div key={i} className="rounded-2xl border border-border/40 bg-card/50 h-48 mb-5 animate-pulse" />)}
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
            <h1 className="text-xl font-bold text-foreground">大陰線リバーサル</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              実体≤-5% / VI≥20 / 株価≤¥15,000 / 急騰除外
              {signals?.bearish_date ? ` (${signals.bearish_date})` : ''}
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

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard label="大陰線シグナル" sub={signals?.bearish_date ?? undefined}>
            <span className={signals && signals.bearish_count > 0 ? 'text-violet-400' : 'text-muted-foreground'}>
              {signals?.bearish_count ?? 0}件
            </span>
          </StatCard>
          <StatCard label="日経VI" sub={vi != null && vi >= 20 ? 'VI≥20: 逆張り有効' : 'VI<20: 逆張り無効'}>
            <span className={vi != null && vi >= 20 ? 'text-price-up' : 'text-price-down'}>
              {vi?.toFixed(1) ?? '-'}
            </span>
          </StatCard>
          <StatCard label="出口ルール">
            <span className="text-foreground text-base">SMA20回帰 指値</span>
          </StatCard>
          <StatCard label="MAX_HOLD" sub="Day3損切り: -3%">
            <span className="text-foreground">30日</span>
          </StatCard>
        </div>

        {/* 大陰線シグナル */}
        <Panel title={
          <div className="flex items-center gap-2">
            <h2 className="text-base md:text-lg font-semibold">シグナル一覧</h2>
            {signals && signals.bearish.length > 0 && (
              <span className="ml-auto text-xs tabular-nums text-violet-400">{signals.bearish.length}件</span>
            )}
          </div>
        } border={signals && signals.bearish.length > 0 ? 'border-violet-500/40' : undefined}
          footer={signals && signals.bearish.length > 0 ? <span>出口: SMA20回帰→SMA20指値（GD時は翌日指値+大引不成） / Day3損切り(-3%) / MAX_HOLD 30日</span> : undefined}>
          {signals && signals.bearish.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm md:text-base">
                <thead><tr className="text-foreground border-b border-border/40 bg-muted/30">
                  <SortHeader<Signal> label="コード" field="ticker" {...bearishSort} className="text-left px-2 py-2 text-xs font-medium whitespace-nowrap" />
                  <th className="text-left px-2 py-2 text-xs font-medium whitespace-nowrap">銘柄</th>
                  <th className="text-left px-2 py-2 text-xs font-medium whitespace-nowrap hidden md:table-cell">セクター</th>
                  <SortHeader<Signal> label="終値" field="close" {...bearishSort} className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap" />
                  <SortHeader<Signal> label="実体%" field="body_pct" {...bearishSort} className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap" />
                  <SortHeader<Signal> label="SMA20乖離" field="dev_from_sma20" {...bearishSort} className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap" />
                  <th className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap">SMA20</th>
                  <th className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap">推定IN</th>
                </tr></thead>
                <tbody className="divide-y divide-border/30">
                  {bearishSort.sorted.map((s) => (
                    <tr key={s.ticker} className="hover:bg-muted/10">
                      <td className="px-2 py-2.5 tabular-nums font-semibold">
                        <button type="button" className="hover:text-primary text-primary" onClick={() => window.open(`/${s.ticker.replace('.T', '')}`, 'stock-detail')}>
                          {s.ticker.replace('.T', '')}
                        </button>
                      </td>
                      <td className="px-2 py-2.5 text-muted-foreground max-w-[160px] truncate">{s.stock_name}</td>
                      <td className="px-2 py-2.5 text-muted-foreground max-w-[120px] truncate hidden md:table-cell">{s.sector}</td>
                      <td className="text-right px-2 py-2.5 tabular-nums">¥{fmt(s.close)}</td>
                      <td className="text-right px-2 py-2.5 tabular-nums text-price-down font-semibold">{s.body_pct.toFixed(1)}%</td>
                      <td className="text-right px-2 py-2.5 tabular-nums text-price-down">{fmtPct(s.dev_from_sma20, 1)}</td>
                      <td className="text-right px-2 py-2.5 tabular-nums text-muted-foreground">¥{fmt(Math.round(s.sma20))}</td>
                      <td className="text-right px-2 py-2.5 tabular-nums font-semibold">¥{fmt(s.entry_price_est)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message={
              vi != null && vi < 20
                ? `VI=${vi.toFixed(1)} < 20: 平穏相場では大陰線シグナルは発生しません`
                : '本日の大陰線シグナルなし'
            } />
          )}
        </Panel>

        {/* 戦略説明 */}
        <Panel title="戦略パラメータ">
          <div className="overflow-x-auto">
            <table className="w-full text-sm md:text-base">
              <tbody className="divide-y divide-border/30">
                {([
                  ['シグナル条件', '実体 ≤ -5% & VI≥20 & 急騰フィルター除外'],
                  ['対象', 'Core+Large 100銘柄 / 株価 ≤ ¥15,000'],
                  ['エントリー', '翌営業日寄付'],
                  ['Exit（利確）', 'SMA20回帰 → SMA20指値（GD時は翌日指値+大引不成）'],
                  ['Exit（損切）', 'Day3終値 ≤ -3% → 翌寄付'],
                  ['MAX_HOLD', '30日'],
                  ['BT: PF', '5.40'],
                  ['BT: 勝率', '77.3%'],
                  ['BT: 平均利益', '+4.74%'],
                ] as [string, string][]).map(([label, value]) => (
                  <tr key={label} className="hover:bg-muted/10">
                    <td className="px-4 py-2.5 text-muted-foreground w-[180px]">{label}</td>
                    <td className="px-4 py-2.5 tabular-nums">{value}</td>
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
