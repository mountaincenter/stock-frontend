'use client';

import { useEffect, useState } from 'react';
import { DevNavLinks } from '../../../components/dev';
import { ChevronDown, ChevronRight } from 'lucide-react';

// Types
interface Signal {
  ticker: string;
  stock_name: string;
  sector: string;
  signal_type: string;
  close: number;
  sma20: number;
  dev_from_sma20: number;
  sl_price: number;
}

interface SignalsResponse {
  signals: Signal[];
  count: number;
  signal_date: string | null;
}

interface Overall {
  count: number;
  total_pnl: number;
  win_rate: number;
  pf: number;
  avg_ret: number;
  sl_count: number;
  sl_rate: number;
}

interface MonthlyStats {
  month: string;
  count: number;
  pnl: number;
  win_rate: number;
  pf: number;
  sl_count: number;
  uptrend_pct: number;
}

interface SummaryResponse {
  overall: Overall;
  monthly: MonthlyStats[];
  count: number;
}

interface Trade {
  signal_date: string;
  entry_date: string;
  exit_date: string;
  ticker: string;
  stock_name: string;
  sector: string;
  signal_type: string;
  entry_price: number;
  exit_price: number;
  ret_pct: number;
  pnl_yen: number;
  exit_type: string;
}

interface TradeGroup {
  key: string;
  count: number;
  pnl: number;
  win_count: number;
  trades: Trade[];
}

interface TradesResponse {
  view: string;
  results: TradeGroup[];
}

interface OptimRow {
  signal_type: string;
  price_band: string;
  hold_days: number;
  count: number;
  win_rate: number;
  pf: number;
  avg_ret: number;
  total_pnl: number;
  avg_pnl: number;
  sl_rate: number;
}

interface StatusResponse {
  market_uptrend: boolean | null;
  ci_expand: boolean | null;
  nk225_close: number | null;
  nk225_sma20: number | null;
  nk225_diff_pct: number | null;
  ci_latest: number | null;
  ci_chg3m: number | null;
  as_of: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

const fmt = (v: number) => v.toLocaleString('ja-JP');
const fmtPnl = (v: number) => {
  const cls = v >= 0 ? 'text-emerald-400' : 'text-rose-400';
  return <span className={cls}>{v >= 0 ? '+' : ''}{fmt(v)}円</span>;
};
const fmtPct = (v: number, decimals = 1) => `${v >= 0 ? '+' : ''}${v.toFixed(decimals)}%`;

function GranvilleContent() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [signals, setSignals] = useState<SignalsResponse | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [trades, setTrades] = useState<TradesResponse | null>(null);
  const [optimGrid, setOptimGrid] = useState<OptimRow[]>([]);
  const [tradeView, setTradeView] = useState<'daily' | 'weekly' | 'monthly' | 'by-stock'>('daily');
  const [loading, setLoading] = useState(true);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [optimSignalType, setOptimSignalType] = useState<'A' | 'B'>('A');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/dev/granville/status`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/api/dev/granville/signals`).then(r => r.json()).catch(() => ({ signals: [], count: 0, signal_date: null })),
      fetch(`${API_BASE}/api/dev/granville/summary`).then(r => r.json()).catch(() => ({ overall: {}, monthly: [], count: 0 })),
      fetch(`${API_BASE}/api/dev/granville/trades?view=daily`).then(r => r.json()).catch(() => ({ view: 'daily', results: [] })),
      fetch(`${API_BASE}/api/dev/granville/optimization`).then(r => r.json()).catch(() => ({ grid: [] })),
    ]).then(([st, sig, sum, tr, opt]) => {
      setStatus(st);
      setSignals(sig);
      setSummary(sum);
      setTrades(tr);
      setOptimGrid(opt?.grid || []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (loading) return;
    fetch(`${API_BASE}/api/dev/granville/trades?view=${tradeView === 'by-stock' ? 'by-stock' : tradeView}`)
      .then(r => r.json())
      .then(setTrades)
      .catch(() => {});
  }, [tradeView, loading]);

  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  if (loading) {
    return (
      <main className="relative min-h-screen">
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
        </div>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4 pb-3 border-b border-border/30">
            <div>
              <div className="h-6 w-48 bg-muted/50 rounded mb-2 animate-pulse" />
              <div className="h-4 w-64 bg-muted/50 rounded animate-pulse" />
            </div>
            <div className="h-8 w-32 bg-muted/50 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl border border-border/40 bg-card/50 p-4 h-24 animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl border border-border/40 bg-card/50 p-4 h-20 animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  const o = summary?.overall;

  return (
    <main className="relative min-h-screen">
      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-primary/8 via-primary/3 to-transparent blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-1/3 -left-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-accent/10 via-accent/4 to-transparent blur-3xl animate-pulse-slower" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 leading-[1.8] tracking-[0.02em] font-sans">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4 pb-3 border-b border-border/30">
          <div>
            <h1 className="text-xl font-bold text-foreground">グランビルIFDロング戦略</h1>
            <p className="text-muted-foreground text-sm">
              SL -3% / 7日引け決済 / ¥2万未満 / uptrend+CI拡大
              {status?.as_of ? ` (${status.as_of})` : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <DevNavLinks links={["dashboard", "analysis", "recommendations", "stock-results", "reports"]} />
          </div>
        </header>

        {/* フィルター状態 */}
        {status && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-5 shadow-lg shadow-black/5 backdrop-blur-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
              <div className="relative">
                <div className="text-muted-foreground text-sm mb-2">市場トレンド</div>
                <div className={`text-2xl font-bold text-right tabular-nums whitespace-nowrap ${status.market_uptrend === true ? 'text-emerald-400' : status.market_uptrend === false ? 'text-rose-400' : 'text-muted-foreground'}`}>
                  {status.market_uptrend === true ? '○' : status.market_uptrend === false ? '×' : '-'}
                  {status.nk225_close != null && ` ¥${fmt(status.nk225_close)}`}
                </div>
                <div className="text-xs text-right mt-1 text-muted-foreground tabular-nums">
                  {status.nk225_close != null ? `SMA20 ¥${fmt(status.nk225_sma20!)} / 乖離 ${fmtPct(status.nk225_diff_pct!)}` : '-'}
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-5 shadow-lg shadow-black/5 backdrop-blur-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
              <div className="relative">
                <div className="text-muted-foreground text-sm mb-2">景気動向指数 (CI先行)</div>
                <div className={`text-2xl font-bold text-right tabular-nums whitespace-nowrap ${status.ci_expand === true ? 'text-emerald-400' : status.ci_expand === false ? 'text-rose-400' : 'text-muted-foreground'}`}>
                  {status.ci_expand === true ? '○' : status.ci_expand === false ? '×' : '-'}
                  {status.ci_latest != null && ` ${status.ci_latest}`}
                </div>
                <div className="text-xs text-right mt-1 text-muted-foreground tabular-nums">
                  {status.ci_latest != null ? `3ヶ月変化: ${status.ci_chg3m! >= 0 ? '+' : ''}${status.ci_chg3m}` : '-'}
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-5 shadow-lg shadow-black/5 backdrop-blur-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
              <div className="relative">
                <div className="text-muted-foreground text-sm mb-2">データ基準日</div>
                <div className="text-2xl font-bold text-right tabular-nums text-foreground">{status.as_of || '-'}</div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-5 shadow-lg shadow-black/5 backdrop-blur-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
              <div className="relative">
                <div className="text-muted-foreground text-sm mb-2">戦略パラメータ</div>
                <div className="text-2xl font-bold text-right tabular-nums text-foreground whitespace-nowrap">SL -3%</div>
                <div className="text-xs text-right mt-1 text-muted-foreground">7日引け / ¥2万未満</div>
              </div>
            </div>
          </div>
        )}

        {/* 今日のシグナル */}
        <section className="mb-6">
          <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 shadow-lg shadow-black/5 backdrop-blur-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border/40">
              <h2 className="text-sm font-semibold text-foreground">
                シグナル ({signals?.signal_date || '-'}) — {signals?.count || 0}件
              </h2>
            </div>
            {signals && signals.signals.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border/30 bg-muted/10">
                      <th className="text-left px-4 py-2.5 font-medium">コード</th>
                      <th className="text-left px-4 py-2.5 font-medium">銘柄</th>
                      <th className="text-left px-4 py-2.5 font-medium">セクター</th>
                      <th className="text-center px-4 py-2.5 font-medium">種別</th>
                      <th className="text-right px-4 py-2.5 font-medium">終値</th>
                      <th className="text-right px-4 py-2.5 font-medium">SMA20</th>
                      <th className="text-right px-4 py-2.5 font-medium">乖離%</th>
                      <th className="text-right px-4 py-2.5 font-medium">SL価格</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signals.signals.map((s, i) => (
                      <tr key={i} className="border-b border-border/20 hover:bg-muted/5 transition-colors">
                        <td className="px-4 py-2.5 font-mono tabular-nums">{s.ticker.replace('.T', '')}</td>
                        <td className="px-4 py-2.5">{s.stock_name}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{s.sector}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`px-1.5 py-0.5 text-xs rounded ${s.signal_type === 'A' ? 'bg-blue-500/20 text-blue-400' : s.signal_type === 'B' ? 'bg-amber-500/20 text-amber-400' : 'bg-purple-500/20 text-purple-400'}`}>
                            {s.signal_type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">¥{fmt(s.close)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">¥{fmt(s.sma20)}</td>
                        <td className={`px-4 py-2.5 text-right tabular-nums ${s.dev_from_sma20 < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {fmtPct(s.dev_from_sma20, 2)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-rose-400">¥{fmt(s.sl_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-muted-foreground text-sm py-8 text-center">
                本日のシグナルはありません
              </div>
            )}
            {/* シグナル種別説明 */}
            <div className="px-5 py-3 border-t border-border/40 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <div><span className="inline-block px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 mr-1.5">A</span>押し目買い — SMA20から-3~-8%乖離、終値反発</div>
              <div><span className="inline-block px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 mr-1.5">B</span>SMA支持反発 — 上昇SMA20上で乖離0-2%、前日≤0.5%から反発</div>
              <div><span className="inline-block px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 mr-1.5">A+B</span>両条件同時成立</div>
            </div>
          </div>
        </section>

        {/* バックテスト概要 (2025/1~) */}
        {(() => {
          // 2025/1以降のmonthlyデータから集計
          const recentMonths = summary?.monthly?.filter(m => m.month >= '2025-01') || [];
          if (recentMonths.length === 0) return null;

          const rCount = recentMonths.reduce((s, m) => s + m.count, 0);
          const rPnl = recentMonths.reduce((s, m) => s + m.pnl, 0);
          const rSl = recentMonths.reduce((s, m) => s + m.sl_count, 0);
          // 勝率は件数加重平均
          const rWinRate = rCount > 0 ? recentMonths.reduce((s, m) => s + m.win_rate * m.count, 0) / rCount : 0;
          // PFはAPIのoverallから再計算不可なので、勝ちPnL/負けPnLの近似は使えない。overallのpfをそのまま使わず、recentのみで算出
          // → monthly単位のpnlからは正確なPFは出せないので省略、代わりにSL率を表示
          const rSlRate = rCount > 0 ? (rSl / rCount) * 100 : 0;

          const pnlClass = rPnl >= 0 ? 'text-emerald-400' : 'text-rose-400';
          const winClass = rWinRate >= 55 ? 'text-emerald-400' : rWinRate >= 45 ? 'text-amber-400' : 'text-rose-400';

          return (
            <section className="mb-6">
              <h2 className="text-sm font-semibold text-foreground mb-3">バックテスト概要 (2025/1~)</h2>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-5 shadow-lg shadow-black/5 backdrop-blur-xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
                  <div className="relative">
                    <div className="text-muted-foreground text-sm mb-2">取引数</div>
                    <div className="text-2xl font-bold text-right tabular-nums text-foreground">{rCount}</div>
                    <div className="text-xs text-right mt-1 text-muted-foreground">{recentMonths.length}ヶ月</div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-5 shadow-lg shadow-black/5 backdrop-blur-xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
                  <div className="relative">
                    <div className="text-muted-foreground text-sm mb-2">損益合計</div>
                    <div className={`text-2xl font-bold text-right tabular-nums whitespace-nowrap ${pnlClass}`}>
                      {rPnl >= 0 ? '+' : ''}{fmt(rPnl)}円
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-5 shadow-lg shadow-black/5 backdrop-blur-xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
                  <div className="relative">
                    <div className="text-muted-foreground text-sm mb-2">勝率</div>
                    <div className={`text-2xl font-bold text-right tabular-nums ${winClass}`}>
                      {rWinRate.toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-5 shadow-lg shadow-black/5 backdrop-blur-xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
                  <div className="relative">
                    <div className="text-muted-foreground text-sm mb-2">SL発動</div>
                    <div className="text-2xl font-bold text-right tabular-nums text-foreground">{rSl}</div>
                    <div className="text-xs text-right mt-1 text-muted-foreground">{rSlRate.toFixed(1)}%</div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-5 shadow-lg shadow-black/5 backdrop-blur-xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
                  <div className="relative">
                    <div className="text-muted-foreground text-sm mb-2">月平均損益</div>
                    <div className={`text-2xl font-bold text-right tabular-nums whitespace-nowrap ${pnlClass}`}>
                      {fmt(Math.round(rPnl / recentMonths.length))}円
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        })()}

        {/* 保有日数×価格帯 最適化グリッド */}
        {optimGrid.length > 0 && (() => {
          const BAND_ORDER = ['~1000', '1000~3000', '3000~5000', '5000~10000', '10000~20000'];
          const BAND_LABEL: Record<string, string> = { '~1000': '~¥1,000', '1000~3000': '¥1,000~3,000', '3000~5000': '¥3,000~5,000', '5000~10000': '¥5,000~10,000', '10000~20000': '¥10,000~20,000' };
          const filtered = optimGrid.filter(r => r.signal_type === optimSignalType);
          const grouped = BAND_ORDER.map(pb => ({
            band: pb,
            label: BAND_LABEL[pb] || pb,
            rows: filtered.filter(r => r.price_band === pb).sort((a, b) => a.hold_days - b.hold_days),
          })).filter(g => g.rows.length > 0);

          // 各価格帯のベストPF行を特定
          const bestHoldByBand: Record<string, number> = {};
          grouped.forEach(g => {
            const best = g.rows.reduce((a, b) => a.pf > b.pf ? a : b);
            bestHoldByBand[g.band] = best.hold_days;
          });

          return (
            <section className="mb-6">
              <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 shadow-lg shadow-black/5 backdrop-blur-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-border/40 flex items-center gap-3">
                  <h2 className="text-sm font-semibold text-foreground">保有日数×価格帯 最適化</h2>
                  <div className="flex gap-1">
                    {(['A', 'B'] as const).map(st => (
                      <button key={st} onClick={() => setOptimSignalType(st)}
                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${optimSignalType === st ? (st === 'A' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' : 'bg-amber-500/20 text-amber-400 border-amber-500/40') : 'border-border/40 text-muted-foreground hover:text-foreground hover:border-border'}`}>
                        {st === 'A' ? 'A 押し目買い' : 'B SMA支持反発'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[650px]">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border/30 bg-muted/10">
                        <th className="text-left px-4 py-2 font-medium">価格帯</th>
                        <th className="text-center px-3 py-2 font-medium">保有日</th>
                        <th className="text-right px-3 py-2 font-medium">件数</th>
                        <th className="text-right px-3 py-2 font-medium">勝率</th>
                        <th className="text-right px-3 py-2 font-medium">PF</th>
                        <th className="text-right px-3 py-2 font-medium">平均PnL</th>
                        <th className="text-right px-3 py-2 font-medium">SL率</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grouped.map(g => g.rows.map((r, i) => {
                        const isBest = r.hold_days === bestHoldByBand[g.band];
                        const pfClass = r.pf >= 1.5 ? 'text-emerald-400 font-bold' : r.pf >= 1.35 ? 'text-emerald-400' : r.pf < 1.0 ? 'text-rose-400' : 'text-foreground';
                        return (
                          <tr key={`${g.band}-${r.hold_days}`} className={`border-b border-border/20 ${isBest ? 'bg-primary/5' : 'hover:bg-muted/5'} transition-colors`}>
                            {i === 0 ? <td rowSpan={g.rows.length} className="px-4 py-2 font-medium text-foreground border-r border-border/20 align-top">{g.label}</td> : null}
                            <td className="px-3 py-2 text-center tabular-nums">{r.hold_days}日{isBest ? <span className="ml-1 text-amber-400 text-xs">★</span> : ''}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{r.count.toLocaleString()}</td>
                            <td className={`px-3 py-2 text-right tabular-nums ${r.win_rate >= 50 ? 'text-emerald-400' : 'text-foreground'}`}>{r.win_rate.toFixed(1)}%</td>
                            <td className={`px-3 py-2 text-right tabular-nums ${pfClass}`}>{r.pf.toFixed(2)}</td>
                            <td className={`px-3 py-2 text-right tabular-nums ${r.avg_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>¥{r.avg_pnl >= 0 ? '+' : ''}{r.avg_pnl.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{r.sl_rate.toFixed(1)}%</td>
                          </tr>
                        );
                      }))}
                    </tbody>
                  </table>
                </div>
                <div className="px-5 py-2 border-t border-border/40 text-xs text-muted-foreground">
                  ★ = 価格帯内でPF最大の保有日数 / SL -3%固定 / 全期間データ
                </div>
              </div>
            </section>
          );
        })()}

        {/* トレード一覧 (2025/1~) */}
        {(() => {
          const CUTOFF = '2025-01';
          const allGroups = trades?.results || [];

          // daily/monthly: keyが日付・月文字列、by-stock: 個別tradeのentry_dateで判定
          const isRecentGroup = (g: TradeGroup) => {
            if (tradeView === 'by-stock') return g.trades.some(t => t.entry_date >= CUTOFF);
            return g.key >= CUTOFF;
          };

          const recentGroups = allGroups.filter(g => isRecentGroup(g));

          // by-stock: recent trades だけにフィルタ
          const filteredRecent = tradeView === 'by-stock'
            ? recentGroups.map(g => {
                const rt = g.trades.filter(t => t.entry_date >= CUTOFF);
                return { ...g, trades: rt, count: rt.length, pnl: rt.reduce((s, t) => s + t.pnl_yen, 0), win_count: rt.filter(t => t.pnl_yen > 0).length };
              }).filter(g => g.count > 0)
            : recentGroups;

          // アーカイブ集計 (~2024/12)
          const archiveGroups = allGroups.filter(g => !isRecentGroup(g));
          const archiveTrades = tradeView === 'by-stock'
            ? allGroups.flatMap(g => g.trades.filter(t => t.entry_date < CUTOFF))
            : archiveGroups.flatMap(g => g.trades);
          const archiveCount = archiveTrades.length;
          const archivePnl = archiveTrades.reduce((s, t) => s + t.pnl_yen, 0);
          const archiveWin = archiveTrades.filter(t => t.pnl_yen > 0).length;
          const archiveWinRate = archiveCount > 0 ? (archiveWin / archiveCount) * 100 : 0;
          const archiveSl = archiveTrades.filter(t => t.exit_type === 'SL').length;

          return (
            <>
              <section className="mb-6">
                <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 shadow-lg shadow-black/5 backdrop-blur-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-border/40 flex items-center gap-3">
                    <h2 className="text-sm font-semibold text-foreground">トレード一覧 (2025/1~)</h2>
                    <div className="flex gap-1">
                      {(['daily', 'weekly', 'monthly', 'by-stock'] as const).map(v => (
                        <button
                          key={v}
                          onClick={() => setTradeView(v)}
                          className={`px-3 py-1 text-xs rounded-full border transition-colors ${tradeView === v ? 'bg-primary text-primary-foreground border-primary' : 'border-border/40 text-muted-foreground hover:text-foreground hover:border-border'}`}
                        >
                          {v === 'daily' ? '日別' : v === 'weekly' ? '週別' : v === 'monthly' ? '月別' : '銘柄別'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredRecent.map(group => {
                    const isExpanded = expandedKeys.has(group.key);
                    return (
                      <div key={group.key} className="border-b border-border/20 last:border-b-0">
                        <button
                          onClick={() => toggleExpand(group.key)}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                          <span className="font-mono font-semibold tabular-nums">{group.key}</span>
                          <span className="text-muted-foreground">{group.count}件</span>
                          <span className="ml-auto tabular-nums">{fmtPnl(group.pnl)}</span>
                          <span className="text-muted-foreground text-xs">{group.win_count}勝</span>
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-4 overflow-x-auto">
                            <table className="w-full text-sm md:text-base">
                              <thead>
                                <tr className="border-b border-border/30">
                                  <th className="px-2 py-2 text-left text-muted-foreground font-medium">エントリー</th>
                                  <th className="px-2 py-2 text-left text-muted-foreground font-medium">決済</th>
                                  <th className="px-2 py-2 text-left text-muted-foreground font-medium">コード</th>
                                  <th className="px-2 py-2 text-left text-muted-foreground font-medium">銘柄</th>
                                  <th className="px-2 py-2 text-left text-muted-foreground font-medium">種別</th>
                                  <th className="px-2 py-2 text-right text-muted-foreground font-medium whitespace-nowrap">エントリー価格</th>
                                  <th className="px-2 py-2 text-right text-muted-foreground font-medium whitespace-nowrap">決済価格</th>
                                  <th className="px-2 py-2 text-right text-muted-foreground font-medium">リターン%</th>
                                  <th className="px-2 py-2 text-right text-muted-foreground font-medium">損益</th>
                                  <th className="px-2 py-2 text-left text-muted-foreground font-medium">決済理由</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/20">
                                {group.trades.map((t, i) => (
                                  <tr key={i} className="hover:bg-muted/20">
                                    <td className="py-2 px-2 font-mono tabular-nums">{t.entry_date}</td>
                                    <td className="py-2 px-2 font-mono tabular-nums">{t.exit_date}</td>
                                    <td className="py-2 px-2 font-mono tabular-nums">{t.ticker.replace('.T', '')}</td>
                                    <td className="py-2 px-2">{t.stock_name}</td>
                                    <td className="py-2 px-2 text-center">
                                      <span className={`px-1.5 py-0.5 text-[10px] rounded ${t.signal_type === 'A' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                        {t.signal_type}
                                      </span>
                                    </td>
                                    <td className="py-2 px-2 text-right tabular-nums">¥{fmt(t.entry_price)}</td>
                                    <td className="py-2 px-2 text-right tabular-nums">¥{fmt(t.exit_price)}</td>
                                    <td className={`py-2 px-2 text-right tabular-nums ${t.ret_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                      {fmtPct(t.ret_pct, 2)}
                                    </td>
                                    <td className="py-2 px-2 text-right tabular-nums">{fmtPnl(t.pnl_yen)}</td>
                                    <td className={`py-2 px-2 text-center ${t.exit_type === 'SL' ? 'text-rose-400' : 'text-muted-foreground'}`}>
                                      {t.exit_type === 'SL' ? 'SL発動' : '期限決済'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {filteredRecent.length === 0 && (
                    <div className="text-muted-foreground text-sm py-8 text-center">
                      2025/1以降のトレードデータがありません
                    </div>
                  )}
                </div>
              </section>

              {/* アーカイブサマリー (~2024/12) */}
              {archiveCount > 0 && (
                <section className="mb-6">
                  <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 shadow-lg shadow-black/5 backdrop-blur-xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-border/40">
                      <h2 className="text-sm font-semibold text-foreground">アーカイブ (~2024/12)</h2>
                    </div>
                    <div className="px-5 py-4 flex flex-wrap gap-6 text-sm">
                      <div>
                        <span className="text-muted-foreground">取引数</span>
                        <span className="ml-2 font-bold tabular-nums text-foreground">{archiveCount}件</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">損益</span>
                        <span className="ml-2 font-bold tabular-nums">{fmtPnl(archivePnl)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">勝率</span>
                        <span className={`ml-2 font-bold tabular-nums ${archiveWinRate >= 55 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {archiveWinRate.toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">勝敗</span>
                        <span className="ml-2 tabular-nums">
                          <span className="text-emerald-400 font-bold">{archiveWin}勝</span>
                          <span className="text-muted-foreground mx-1">/</span>
                          <span className="text-rose-400 font-bold">{archiveCount - archiveWin}敗</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">SL発動</span>
                        <span className="ml-2 font-bold tabular-nums text-muted-foreground">{archiveSl}件</span>
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </>
          );
        })()}
      </div>
    </main>
  );
}

export default function GranvillePage() {
  return <GranvilleContent />;
}
