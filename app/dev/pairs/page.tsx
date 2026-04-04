'use client';

import { useEffect, useState } from 'react';
import { DevNavLinks } from '../../../components/dev';
import { RefreshCw } from 'lucide-react';

// === Types ===
interface PairSignal {
  tk1: string; tk2: string;
  name1: string; name2: string;
  c1: number; c2: number;
  z_latest: number;
  tk1_upper: number; tk1_lower: number;
  mu: number; sigma: number;
  recent_n: number; recent_wr: number; recent_pf: number;
  full_pf: number; full_n: number;
  is_hot: boolean; direction: string;
  signal_date: string;
}

interface SignalsResponse {
  pairs: PairSignal[];
  hot: PairSignal[];
  signal_date: string | null;
  total: number;
  hot_count: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

// === Helpers ===
const fmt = (v: number | null | undefined) => (v ?? 0).toLocaleString('ja-JP');
const fmtZ = (v: number) => <span className={Math.abs(v) >= 1.5 ? (v > 0 ? 'text-rose-400' : 'text-emerald-400') : 'text-muted-foreground'}>{v >= 0 ? '+' : ''}{v.toFixed(2)}</span>;

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
  if (Math.abs(z) < 1.5) return <span className="text-muted-foreground text-xs">待ち</span>;
  const isShort = direction === 'short_tk1';
  const cls = isShort
    ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  const label = isShort ? 'tk1 Short' : 'tk1 Long';
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

  // z_latest の絶対値でソート
  const allPairs = signals?.pairs || [];
  const hotPairs = signals?.hot || [];
  const pairSort = useSortable<PairSignal>(allPairs, 'z_latest');

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
            <h1 className="text-xl font-bold text-foreground">Pairs — ペアトレード</h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              z-score平均回帰 デイトレ（寄り→引け） 200万円運用
              {signals?.signal_date ? ` (${signals.signal_date})` : ''}
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <StatCard label="監視ペア数">
            <span className="text-foreground">{signals?.total ?? 0}</span>
          </StatCard>
          <StatCard label="ホット (|z|>1.5)" sub="翌朝シグナル候補">
            <span className={hotPairs.length > 0 ? 'text-amber-400' : 'text-muted-foreground'}>
              {hotPairs.length}
            </span>
          </StatCard>
          <StatCard label="エントリー済 (|z|>2.0)" sub="z=2.0超えペア">
            <span className={allPairs.filter(p => Math.abs(p.z_latest) >= 2.0).length > 0 ? 'text-rose-400' : 'text-muted-foreground'}>
              {allPairs.filter(p => Math.abs(p.z_latest) >= 2.0).length}
            </span>
          </StatCard>
          <StatCard label="データ日付">
            <span className="text-foreground text-base">{signals?.signal_date ?? '-'}</span>
          </StatCard>
        </div>

        {/* Hot Pairs — 明日シグナル候補 */}
        {hotPairs.length > 0 && (
          <Panel title={
            <h2 className="text-base md:text-lg font-semibold text-amber-400">
              翌朝シグナル候補 — {hotPairs.length}ペア（|z| &gt; 1.5）
            </h2>
          } border="border-amber-500/40">
            <div className="divide-y divide-border/20">
              {hotPairs.map((p) => {
                const isShort = p.direction === 'short_tk1';
                const threshPrice = isShort ? p.tk1_upper : p.tk1_lower;
                const threshLabel = isShort ? '以上で寄ったら' : '以下で寄ったら';
                const action1 = isShort ? `${p.name1} ショート` : `${p.name1} ロング`;
                const action2 = isShort ? `${p.name2} ロング` : `${p.name2} ショート`;
                return (
                  <div key={`${p.tk1}-${p.tk2}`} className="px-4 md:px-5 py-3">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-foreground">{p.name1}</span>
                          <span className="text-muted-foreground">/</span>
                          <span className="font-semibold text-foreground">{p.name2}</span>
                          <DirectionBadge direction={p.direction} z={p.z_latest} />
                        </div>
                        <div className="text-xs text-muted-foreground space-x-3">
                          <span>z: {fmtZ(p.z_latest)}</span>
                          <span>終値: ¥{fmt(p.c1)} / ¥{fmt(p.c2)}</span>
                          <span>5年PF: {p.full_pf.toFixed(2)} ({p.full_n}回)</span>
                          {p.recent_n >= 10 && <span>直近: WR{p.recent_wr.toFixed(0)}% PF{p.recent_pf.toFixed(1)}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">
                          <span className="text-muted-foreground">{p.name1}が</span>
                          <span className="font-bold text-amber-400 mx-1">¥{fmt(Math.round(threshPrice))}</span>
                          <span className="text-muted-foreground">{threshLabel}</span>
                        </div>
                        <div className="text-xs mt-0.5">
                          <span className={isShort ? 'text-rose-400' : 'text-emerald-400'}>{action1}</span>
                          <span className="text-muted-foreground mx-1">+</span>
                          <span className={isShort ? 'text-emerald-400' : 'text-rose-400'}>{action2}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-4 md:px-5 py-2.5 border-t border-border/40 text-xs text-muted-foreground">
              ※ 100株/100株から開始。月曜日・前日急騰後はPFが高い傾向。
            </div>
          </Panel>
        )}

        {hotPairs.length === 0 && (
          <Panel title="翌朝シグナル候補">
            <div className="px-5 py-8 text-center text-muted-foreground text-sm">
              全ペア |z| &lt; 1.5 — 明日は待ち
            </div>
          </Panel>
        )}

        {/* All Pairs Table */}
        <Panel title={
          <div className="flex items-center gap-2">
            <h2 className="text-base md:text-lg font-semibold">全ペア エントリー閾値</h2>
            <span className="text-xs text-muted-foreground">z=±2.0 でエントリー / 引成で決済</span>
          </div>
        } footer={`${allPairs.length} pairs | lookback=20日 | z_entry=2.0 | 200万円運用`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-muted-foreground border-b border-border/30 bg-muted/10">
                <th className="text-center px-3 py-2 text-xs font-medium">#</th>
                <SortHeader<PairSignal> label="ペア" field="name1" {...pairSort} className="text-left px-3 py-2 text-xs font-medium" />
                <SortHeader<PairSignal> label="終値1" field="c1" {...pairSort} className="text-right px-3 py-2 text-xs font-medium" />
                <SortHeader<PairSignal> label="終値2" field="c2" {...pairSort} className="text-right px-3 py-2 text-xs font-medium" />
                <SortHeader<PairSignal> label="z" field="z_latest" {...pairSort} className="text-right px-3 py-2 text-xs font-medium" />
                <th className="text-center px-3 py-2 text-xs font-medium">方向</th>
                <th className="text-right px-3 py-2 text-xs font-medium hidden md:table-cell">Short閾値</th>
                <th className="text-right px-3 py-2 text-xs font-medium hidden md:table-cell">Long閾値</th>
                <SortHeader<PairSignal> label="5年PF" field="full_pf" {...pairSort} className="text-right px-3 py-2 text-xs font-medium" />
                <th className="text-right px-3 py-2 text-xs font-medium hidden md:table-cell">5年n</th>
                <th className="text-right px-3 py-2 text-xs font-medium hidden md:table-cell">直近</th>
              </tr></thead>
              <tbody>
                {pairSort.sorted.map((p, i) => {
                  const isHot = Math.abs(p.z_latest) >= 1.5;
                  const isEntry = Math.abs(p.z_latest) >= 2.0;
                  return (
                    <tr key={`${p.tk1}-${p.tk2}`}
                      className={`border-b border-border/20 hover:bg-muted/10 ${isEntry ? 'bg-rose-500/5' : isHot ? 'bg-amber-500/5' : ''}`}>
                      <td className="text-center px-3 py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-foreground text-xs">
                          {p.name1.length > 8 ? p.name1.slice(0, 8) + '…' : p.name1}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {p.name2.length > 8 ? p.name2.slice(0, 8) + '…' : p.name2}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">¥{fmt(p.c1)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">¥{fmt(p.c2)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold">
                        {fmtZ(p.z_latest)}
                        {isHot && <span className="ml-1 text-amber-400">★</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <DirectionBadge direction={p.direction} z={p.z_latest} />
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-rose-400/70 hidden md:table-cell">
                        ¥{fmt(Math.round(p.tk1_upper))}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-emerald-400/70 hidden md:table-cell">
                        ¥{fmt(Math.round(p.tk1_lower))}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold">
                        <span className={p.full_pf >= 2.5 ? 'text-emerald-400' : p.full_pf >= 2.0 ? 'text-foreground' : 'text-muted-foreground'}>
                          {p.full_pf.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground hidden md:table-cell">
                        {p.full_n}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground hidden md:table-cell text-xs">
                        {p.recent_n >= 10
                          ? `${p.recent_n}回 PF${p.recent_pf.toFixed(1)}`
                          : p.recent_n >= 1
                            ? `${p.recent_n}回`
                            : '-'
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* アクション手順 */}
        <Panel title="翌朝 9:00 アクション手順">
          <div className="px-4 md:px-5 py-4 text-sm text-muted-foreground space-y-2">
            <div className="flex gap-3"><span className="text-foreground font-semibold">1.</span><span>★マークのペアを優先チェック</span></div>
            <div className="flex gap-3"><span className="text-foreground font-semibold">2.</span>
              <div>
                <span>9:00 寄付価格を確認</span>
                <div className="mt-1 ml-2 space-y-0.5 text-xs">
                  <div>→ tk1の寄付が<span className="text-rose-400">ショート閾値以上</span> → tk1空売り + tk2買い</div>
                  <div>→ tk1の寄付が<span className="text-emerald-400">ロング閾値以下</span> → tk1買い + tk2空売り</div>
                </div>
              </div>
            </div>
            <div className="flex gap-3"><span className="text-foreground font-semibold">3.</span><span>指値 or 成行で両銘柄同時発注</span></div>
            <div className="flex gap-3"><span className="text-foreground font-semibold">4.</span><span>15:25 引成で両方決済（or スプレッド縮小で早期利確）</span></div>
            <div className="mt-3 pt-3 border-t border-border/30 text-xs space-y-1">
              <div>※ 100株/100株から。慣れたらロット増。</div>
              <div>※ 月曜日・前日急騰後はPFが高い傾向（優先的にトレード）。</div>
              <div>※ スリッページ感度が高い — 指値推奨（成行はPF低下）。</div>
            </div>
          </div>
        </Panel>
      </div>
    </main>
  );
}
