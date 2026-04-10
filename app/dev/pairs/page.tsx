'use client';

import { useEffect, useState } from 'react';
import { DevNavLinks } from '../../../components/dev';
import { RefreshCw } from 'lucide-react';

// === Types (v2) ===
interface PairSignal {
  tk1: string; tk2: string;
  name1: string; name2: string;
  c1: number; c2: number;
  z_latest: number; z_abs: number;
  tk1_upper: number; tk1_lower: number;
  mu: number; sigma: number;
  lookback: number;
  shares1: number; shares2: number;
  notional1: number; notional2: number;
  imbalance_pct: number;
  full_pf: number; full_n: number;
  half_life: number;
  is_entry: boolean; direction: string;
  signal_date: string;
}

interface SignalsResponse {
  pairs: PairSignal[];
  entry: PairSignal[];
  signal_date: string | null;
  total: number;
  entry_count: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

// === Helpers ===
const fmt = (v: number | null | undefined) => (v ?? 0).toLocaleString('ja-JP');
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

const DirectionBadge = ({ direction, z }: { direction: string; z: number }) => {
  if (Math.abs(z) < 1.5) return <span className="text-muted-foreground text-xs">--</span>;
  const isShort = direction === 'short_tk1';
  const isEntry = Math.abs(z) >= 2.0;
  const cls = isEntry
    ? (isShort ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30')
    : 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  const label = isShort ? 'SHORT tk1' : 'LONG tk1';
  return <span className={`inline-block px-1.5 py-0.5 text-xs rounded leading-none border ${cls}`}>{label}</span>;
};

// === Main ===
export default function PairsPage() {
  const [signals, setSignals] = useState<SignalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/dev/pairs/signals`)
      .then(r => r.json())
      .then((data: SignalsResponse) => { setSignals(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch(`${API_BASE}/api/dev/pairs/refresh`, { method: 'POST' });
      fetchData();
    } finally {
      setRefreshing(false);
    }
  };

  const allPairs = signals?.pairs || [];
  const entryPairs = signals?.entry || [];
  const top3 = entryPairs.slice(0, 3);
  const pairSort = useSortable<PairSignal>(allPairs, 'z_abs');

  if (loading) {
    return (
      <main className="relative min-h-screen">
        <div className="fixed inset-0 -z-10"><div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" /></div>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="h-6 w-48 bg-muted/50 rounded mb-4 animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[...Array(4)].map((_, i) => <div key={i} className="rounded-xl border border-border/40 bg-card/50 p-5 h-24 animate-pulse" />)}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-cyan-500/8 via-cyan-500/3 to-transparent blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4 pb-3 border-b border-border/30">
          <div>
            <h1 className="text-xl font-bold text-foreground">Pairs v2 — ペアトレード</h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              共和分ベース161ペア | z=2.0エントリー | イントラデイ | 200万円 | |z|優先
              {signals?.signal_date ? ` (${signals.signal_date})` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={handleRefresh} disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border/40 rounded-lg hover:bg-muted/20 transition-colors disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              S3同期
            </button>
            <DevNavLinks />
          </div>
        </header>

        {/* Status Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <StatCard label="監視ペア数" sub="共和分+ADF検定済">
            <span className="text-foreground">{signals?.total ?? 0}</span>
          </StatCard>
          <StatCard label="エントリー可 (|z|>=2.0)" sub="|z|降順で推奨">
            <span className={entryPairs.length > 0 ? 'text-rose-400' : 'text-muted-foreground'}>
              {entryPairs.length}
            </span>
          </StatCard>
          <StatCard label="注目 (|z|>=1.5)" sub="翌日エントリー候補">
            <span className={allPairs.filter(p => p.z_abs >= 1.5 && p.z_abs < 2.0).length > 0 ? 'text-amber-400' : 'text-muted-foreground'}>
              {allPairs.filter(p => p.z_abs >= 1.5 && p.z_abs < 2.0).length}
            </span>
          </StatCard>
          <StatCard label="データ日付">
            <span className="text-foreground text-base">{signals?.signal_date ?? '-'}</span>
          </StatCard>
        </div>

        {/* TOP 3 Recommendations */}
        {top3.length > 0 ? (
          <Panel title={
            <h2 className="text-base md:text-lg font-semibold text-rose-400">
              TOP {top3.length} 推奨 — |z|上位（明朝エントリー）
            </h2>
          } border="border-rose-500/40">
            <div className="divide-y divide-border/20">
              {top3.map((p, rank) => {
                const isShort = p.direction === 'short_tk1';
                const threshPrice = isShort ? p.tk1_upper : p.tk1_lower;
                const threshLabel = isShort ? '以上で寄ったら' : '以下で寄ったら';
                return (
                  <div key={`${p.tk1}-${p.tk2}`} className="px-4 md:px-5 py-4 cursor-pointer hover:bg-muted/10 transition-colors" onClick={() => window.open(`/pairs/${p.tk1.replace('.', '')}-${p.tk2.replace('.', '')}`, '_blank')}>
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold">{rank + 1}</span>
                          <span className="text-base font-semibold text-foreground">{p.name1}</span>
                          <span className="text-xs text-muted-foreground">{p.tk1}</span>
                          <span className="text-xs tabular-nums text-muted-foreground">¥{fmt(p.c1)}</span>
                          <span className="text-muted-foreground/50">/</span>
                          <span className="text-base font-semibold text-foreground">{p.name2}</span>
                          <span className="text-xs text-muted-foreground">{p.tk2}</span>
                          <span className="text-xs tabular-nums text-muted-foreground">¥{fmt(p.c2)}</span>
                          <DirectionBadge direction={p.direction} z={p.z_latest} />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-xs text-muted-foreground ml-8">
                          <div>z: <span className="text-sm text-foreground font-semibold">{p.z_latest >= 0 ? '+' : ''}{p.z_latest.toFixed(2)}</span></div>
                          <div>参照: <span className="text-foreground">{p.lookback}日</span></div>
                          <div>PF: <span className={`text-sm ${p.full_pf >= 2.5 ? 'text-emerald-400 font-semibold' : 'text-foreground'}`}>{p.full_pf.toFixed(2)}</span> ({p.full_n}回)</div>
                          <div>半減期: <span className="text-foreground">{p.half_life.toFixed(0)}日</span></div>
                        </div>
                      </div>
                      <div className="text-right md:min-w-[280px]">
                        <div className="text-xs mb-1">
                          <span className="text-muted-foreground">{p.name1}が</span>
                          <span className="font-bold text-rose-400 mx-1">¥{fmt(Math.round(threshPrice))}</span>
                          <span className="text-muted-foreground">{threshLabel}</span>
                        </div>
                        <div className="text-xs space-y-0.5 text-muted-foreground">
                          <div>
                            <span className={isShort ? 'text-rose-400' : 'text-emerald-400'}>{p.name1} {isShort ? 'Short' : 'Long'}</span>
                            <span className="mx-1">×</span>
                            <span className="text-foreground">{p.shares1}株</span>
                            <span className="ml-1">(¥{fmt(p.notional1)})</span>
                          </div>
                          <div>
                            <span className={isShort ? 'text-emerald-400' : 'text-rose-400'}>{p.name2} {isShort ? 'Long' : 'Short'}</span>
                            <span className="mx-1">×</span>
                            <span className="text-foreground">{p.shares2}株</span>
                            <span className="ml-1">(¥{fmt(p.notional2)})</span>
                          </div>
                          {p.imbalance_pct > 5 && (
                            <div className="text-amber-400/70">不均衡: {p.imbalance_pct.toFixed(1)}%</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-4 md:px-5 py-2.5 border-t border-border/40 text-xs text-muted-foreground">
              資金制約下TOP2-3ペアが最適（Phase 73d検証済み）。100株単位等金額。指値推奨。
            </div>
          </Panel>
        ) : (
          <Panel title="推奨ペア">
            <div className="px-5 py-8 text-center text-muted-foreground text-sm">
              全ペア |z| &lt; 2.0 — 本日エントリーなし
            </div>
          </Panel>
        )}

        {/* Entry + Watch list */}
        {entryPairs.length > 3 && (
          <Panel title={
            <h2 className="text-base md:text-lg font-semibold text-amber-400">
              その他エントリー可 — {entryPairs.length - 3}ペア
            </h2>
          } border="border-amber-500/30">
            <div className="divide-y divide-border/20">
              {entryPairs.slice(3).map((p) => {
                const isShort = p.direction === 'short_tk1';
                return (
                  <div key={`${p.tk1}-${p.tk2}`} className="px-4 md:px-5 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{p.name1} / {p.name2}</span>
                      <DirectionBadge direction={p.direction} z={p.z_latest} />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>z: {fmtZ(p.z_latest)}</span>
                      <span>LB={p.lookback}</span>
                      <span>PF={p.full_pf.toFixed(2)}</span>
                      <span>{p.shares1}/{p.shares2}株</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        )}

        {/* All Pairs Table */}
        <Panel title={
          <div className="flex items-center gap-2">
            <h2 className="text-base md:text-lg font-semibold">全ペア一覧</h2>
            <span className="text-xs text-muted-foreground">161ペア | ペア固有LB | z=2.0エントリー | 引成決済</span>
          </div>
        } footer={`${allPairs.length} pairs | z_entry=2.0 | 200万円 (100株単位等金額)`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-muted-foreground border-b border-border/30 bg-muted/10">
                <th className="text-center px-2 py-2 text-xs font-medium">#</th>
                <SortHeader<PairSignal> label="ペア" field="name1" {...pairSort} className="text-left px-2 py-2 text-xs font-medium" />
                <SortHeader<PairSignal> label="終値1" field="c1" {...pairSort} className="text-right px-2 py-2 text-xs font-medium" />
                <SortHeader<PairSignal> label="終値2" field="c2" {...pairSort} className="text-right px-2 py-2 text-xs font-medium" />
                <SortHeader<PairSignal> label="|z|" field="z_abs" {...pairSort} className="text-right px-2 py-2 text-xs font-medium" />
                <th className="text-center px-2 py-2 text-xs font-medium">方向</th>
                <SortHeader<PairSignal> label="LB" field="lookback" {...pairSort} className="text-right px-2 py-2 text-xs font-medium hidden md:table-cell" />
                <th className="text-right px-2 py-2 text-xs font-medium hidden md:table-cell">Short閾値</th>
                <th className="text-right px-2 py-2 text-xs font-medium hidden md:table-cell">Long閾値</th>
                <SortHeader<PairSignal> label="PF" field="full_pf" {...pairSort} className="text-right px-2 py-2 text-xs font-medium" />
                <th className="text-right px-2 py-2 text-xs font-medium hidden md:table-cell">株数</th>
                <SortHeader<PairSignal> label="HL" field="half_life" {...pairSort} className="text-right px-2 py-2 text-xs font-medium hidden lg:table-cell" />
              </tr></thead>
              <tbody>
                {pairSort.sorted.map((p, i) => {
                  const isEntry = p.z_abs >= 2.0;
                  const isWatch = p.z_abs >= 1.5 && p.z_abs < 2.0;
                  return (
                    <tr key={`${p.tk1}-${p.tk2}`}
                      className={`border-b border-border/20 hover:bg-muted/10 cursor-pointer ${isEntry ? 'bg-rose-500/5' : isWatch ? 'bg-amber-500/5' : ''}`}
                      onClick={() => window.open(`/pairs/${p.tk1.replace('.', '')}-${p.tk2.replace('.', '')}`, '_blank')}>
                      <td className="text-center px-2 py-2 text-muted-foreground text-xs">{i + 1}</td>
                      <td className="px-2 py-2">
                        <div className="font-medium text-foreground text-sm">
                          {p.name1.length > 8 ? p.name1.slice(0, 8) + '…' : p.name1}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {p.name2.length > 8 ? p.name2.slice(0, 8) + '…' : p.name2}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-sm">¥{fmt(p.c1)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-sm">¥{fmt(p.c2)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-sm font-semibold">
                        {fmtZ(p.z_latest)}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <DirectionBadge direction={p.direction} z={p.z_latest} />
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-xs text-muted-foreground hidden md:table-cell">
                        {p.lookback}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-rose-400/70 text-xs hidden md:table-cell">
                        ¥{fmt(Math.round(p.tk1_upper))}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-emerald-400/70 text-xs hidden md:table-cell">
                        ¥{fmt(Math.round(p.tk1_lower))}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums font-semibold text-sm">
                        <span className={p.full_pf >= 2.5 ? 'text-emerald-400' : p.full_pf >= 2.0 ? 'text-foreground' : 'text-muted-foreground'}>
                          {p.full_pf.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-xs text-muted-foreground hidden md:table-cell">
                        {p.shares1}/{p.shares2}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-xs text-muted-foreground hidden lg:table-cell">
                        {p.half_life.toFixed(0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Action Guide */}
        <Panel title="翌朝 9:00 アクション手順">
          <div className="px-4 md:px-5 py-4 text-sm text-muted-foreground space-y-2">
            <div className="flex gap-3"><span className="text-foreground font-semibold">1.</span><span>TOP推奨ペアを優先（|z|上位2-3ペアが最適）</span></div>
            <div className="flex gap-3"><span className="text-foreground font-semibold">2.</span>
              <div>
                <span>9:00 寄付価格を確認</span>
                <div className="mt-1 ml-2 space-y-0.5 text-xs">
                  <div>→ tk1の寄付が<span className="text-rose-400">Short閾値以上</span> → tk1空売り + tk2買い</div>
                  <div>→ tk1の寄付が<span className="text-emerald-400">Long閾値以下</span> → tk1買い + tk2空売り</div>
                </div>
              </div>
            </div>
            <div className="flex gap-3"><span className="text-foreground font-semibold">3.</span><span>表示株数で両銘柄同時発注（100株単位等金額）</span></div>
            <div className="flex gap-3"><span className="text-foreground font-semibold">4.</span><span>15:25 引成で両方決済</span></div>
            <div className="mt-3 pt-3 border-t border-border/30 text-xs space-y-1">
              <div>Phase 70-75 検証済みパラメータ: 共和分ペア選定 / ペア固有LB / |z|優先 / 等金額100株単位 / レジームフィルタ不要</div>
              <div>指値推奨（成行はスリッページでPF低下）</div>
            </div>
          </div>
        </Panel>
      </div>
    </main>
  );
}
