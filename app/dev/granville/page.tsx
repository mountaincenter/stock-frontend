'use client';

import { useEffect, useState } from 'react';
import { DevNavLinks } from '../../../components/dev';
import { ChevronDown, ChevronRight } from 'lucide-react';

// Types
interface Signal { ticker: string; stock_name: string; sector: string; signal_type: string; close: number; sma20: number; dev_from_sma20: number; sl_price: number; exit_rule: string; }
interface SignalsResponse { signals: Signal[]; count: number; signal_date: string | null; }
interface Overall { count: number; total_pnl: number; win_rate: number; pf: number; avg_ret: number; sl_count: number; sl_rate: number; }
interface MonthlyStats { month: string; count: number; pnl: number; win_rate: number; pf: number; sl_count: number; uptrend_pct: number; }
interface SummaryResponse { overall: Overall; monthly: MonthlyStats[]; count: number; }
interface Trade { signal_date: string; entry_date: string; exit_date: string; ticker: string; stock_name: string; sector: string; signal_type: string; entry_price: number; exit_price: number; ret_pct: number; pnl_yen: number; exit_type: string; }
interface TradeGroup { key: string; count: number; pnl: number; win_count: number; trades: Trade[]; }
interface TradesResponse { view: string; results: TradeGroup[]; }
interface Position { ticker: string; stock_name: string; signal_type: string; entry_date: string; entry_price: number; current_price: number; unrealized_pct: number; unrealized_yen: number; sl_price: number; trail_sl?: number; hold_days: number; exit_type?: string; }
interface ExitSignal { ticker: string; stock_name: string; signal_type: string; entry_date: string; entry_price: number; current_price: number; ret_pct: number; pnl_yen: number; exit_type: string; }
interface PositionsResponse { positions: Position[]; exits: ExitSignal[]; as_of: string | null; }
interface StatusResponse { market_uptrend: boolean | null; ci_expand: boolean | null; nk225_close: number | null; nk225_sma20: number | null; nk225_diff_pct: number | null; ci_latest: number | null; ci_chg3m: number | null; as_of: string | null; }
interface CompStrategyRow { label: string; count: number; pnl: number; pf: number; win_rate: number; avg_hold: number; }
interface ComparisonResponse { strategies: { all: CompStrategyRow[]; '14m': CompStrategyRow[]; '2026': CompStrategyRow[]; }; }

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

/* ── 書式ヘルパー ── */
const fmt = (v: number) => v.toLocaleString('ja-JP');
const fmtPnl = (v: number) => <span className={v >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{v >= 0 ? '+' : ''}{fmt(v)}円</span>;
const fmtPct = (v: number, d = 1) => `${v >= 0 ? '+' : ''}${v.toFixed(d)}%`;
const shortDate = (d: string) => { const m = d.match(/\d{4}-(\d{2})-(\d{2})/); return m ? `${m[1]}/${m[2]}` : d; };

/* ── 種別バッジ ── */
const TypeBadge = ({ t }: { t: string }) => (
  <span className={`inline-block px-1.5 py-0.5 text-xs rounded leading-none ${t === 'A' ? 'bg-blue-500/20 text-blue-400' : t === 'B' ? 'bg-amber-500/20 text-amber-400' : 'bg-purple-500/20 text-purple-400'}`}>{t}</span>
);

/* ── 決済理由ラベル ── */
const exitLabel = (t: string) => {
  if (t === 'SL') return { text: 'SL', cls: 'text-rose-400' };
  if (t === 'TP') return { text: 'TP+10%', cls: 'text-emerald-400' };
  if (t === 'SMA20_touch') return { text: 'SMA20', cls: 'text-emerald-400' };
  if (t === 'dead_cross') return { text: 'DC', cls: 'text-amber-400' };
  if (t === 'time_cut') return { text: '7日切', cls: 'text-rose-400' };
  return { text: t || '期限', cls: 'text-muted-foreground' };
};

function GranvilleContent() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [signals, setSignals] = useState<SignalsResponse | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [trades, setTrades] = useState<TradesResponse | null>(null);
  const [posData, setPosData] = useState<PositionsResponse | null>(null);
  const [comparison, setComparison] = useState<ComparisonResponse | null>(null);
  const [tradeView, setTradeView] = useState<'daily' | 'weekly' | 'monthly' | 'by-stock'>('daily');
  const [loading, setLoading] = useState(true);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/dev/granville/status`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/api/dev/granville/signals`).then(r => r.json()).catch(() => ({ signals: [], count: 0, signal_date: null })),
      fetch(`${API_BASE}/api/dev/granville/summary`).then(r => r.json()).catch(() => ({ overall: {}, monthly: [], count: 0 })),
      fetch(`${API_BASE}/api/dev/granville/trades?view=daily`).then(r => r.json()).catch(() => ({ view: 'daily', results: [] })),
      fetch(`${API_BASE}/api/dev/granville/positions`).then(r => r.json()).catch(() => ({ positions: [], exits: [], as_of: null })),
      fetch(`${API_BASE}/api/dev/granville/comparison`).then(r => r.json()).catch(() => null),
    ]).then(([st, sig, sum, tr, pos, comp]) => {
      setStatus(st); setSignals(sig); setSummary(sum); setTrades(tr); setPosData(pos); setComparison(comp); setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (loading) return;
    fetch(`${API_BASE}/api/dev/granville/trades?view=${tradeView === 'by-stock' ? 'by-stock' : tradeView}`)
      .then(r => r.json()).then(setTrades).catch(() => {});
  }, [tradeView, loading]);

  const toggle = (key: string) => setExpandedKeys(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

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

  /* ── 共通: カード（stock-results準拠: p-4, text-xs mb-2, 値 text-lg/text-2xl） ── */
  const StatCard = ({ label, children, sub }: { label: string; children: React.ReactNode; sub?: React.ReactNode }) => (
    <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
      <div className="relative">
        <div className="text-muted-foreground text-xs mb-2">{label}</div>
        <div className="text-2xl font-bold text-right tabular-nums">{children}</div>
        {sub && <div className="text-xs text-right mt-1 text-muted-foreground tabular-nums">{sub}</div>}
      </div>
    </div>
  );

  /* ── 共通: セクション ── */
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

  return (
    <main className="relative min-h-screen">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-primary/8 via-primary/3 to-transparent blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* ── Header ── */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4 pb-3 border-b border-border/30">
          <div>
            <h1 className="text-xl font-bold text-foreground">グランビルIFDロング</h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              SL-3% / TP+10% / グランビル出口 / ¥2万未満 / uptrend+CI
              {status?.as_of ? ` (${status.as_of})` : ''}
            </p>
          </div>
          <DevNavLinks links={["dashboard", "analysis", "recommendations", "stock-results", "reports"]} />
        </header>

        {/* ── フィルター状態 ── */}
        {status && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatCard label="市場トレンド" sub={status.nk225_close != null ? `SMA20 ¥${fmt(status.nk225_sma20!)} / ${fmtPct(status.nk225_diff_pct!)}` : undefined}>
              <span className={status.market_uptrend ? 'text-emerald-400' : status.market_uptrend === false ? 'text-rose-400' : 'text-muted-foreground'}>
                {status.market_uptrend ? '○' : status.market_uptrend === false ? '×' : '-'}
                {status.nk225_close != null && <span className="ml-1">¥{fmt(status.nk225_close)}</span>}
              </span>
            </StatCard>
            <StatCard label="CI先行指数" sub={status.ci_latest != null ? `3M変化: ${status.ci_chg3m! >= 0 ? '+' : ''}${status.ci_chg3m}` : undefined}>
              <span className={status.ci_expand ? 'text-emerald-400' : status.ci_expand === false ? 'text-rose-400' : 'text-muted-foreground'}>
                {status.ci_expand ? '○' : status.ci_expand === false ? '×' : '-'}
                {status.ci_latest != null && <span className="ml-1">{status.ci_latest}</span>}
              </span>
            </StatCard>
            <StatCard label="基準日"><span className="text-foreground">{status.as_of || '-'}</span></StatCard>
            <StatCard label="パラメータ" sub="グランビル出口 / ¥2万未満"><span className="text-foreground whitespace-nowrap">SL-3% / TP+10%</span></StatCard>
          </div>
        )}

        {/* ── シグナル ── */}
        <Panel title={`シグナル (${signals?.signal_date || '-'}) — ${signals?.count || 0}件`}
          footer={<div className="flex flex-wrap gap-x-5 gap-y-1">
            <span><TypeBadge t="A" /> 押し目買い(乖離-3~-8%)</span>
            <span><TypeBadge t="B" /> SMA支持反発(乖離0-2%)</span>
            <span className="text-muted-foreground/60">SL-3%(IFD) / TP+10%(IFD) / 翌朝売り</span>
          </div>}>
          {signals && signals.signals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm md:text-base">
                <thead><tr className="text-muted-foreground border-b border-border/30 bg-muted/10">
                  <th className="text-left px-4 py-2.5 text-xs md:text-sm font-medium">コード</th>
                  <th className="text-left px-4 py-2.5 text-xs md:text-sm font-medium">銘柄</th>
                  <th className="text-left px-4 py-2.5 text-xs md:text-sm font-medium hidden md:table-cell">セクター</th>
                  <th className="text-center px-4 py-2.5 text-xs md:text-sm font-medium">種別</th>
                  <th className="text-right px-4 py-2.5 text-xs md:text-sm font-medium">終値</th>
                  <th className="text-right px-4 py-2.5 text-xs md:text-sm font-medium hidden md:table-cell">SMA20</th>
                  <th className="text-right px-4 py-2.5 text-xs md:text-sm font-medium">乖離%</th>
                  <th className="text-right px-4 py-2.5 text-xs md:text-sm font-medium">SL価格</th>
                </tr></thead>
                <tbody>
                  {signals.signals.map((s, i) => (
                    <tr key={i} className="border-b border-border/20 hover:bg-muted/5">
                      <td className="px-4 py-2.5 tabular-nums">{s.ticker.replace('.T', '')}</td>
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          className="hover:text-primary transition-colors block max-w-[140px] truncate text-left"
                          title={s.stock_name}
                          onClick={(e) => { e.stopPropagation(); window.open(`/${s.ticker.replace('.T', '')}`, 'stock-detail'); }}
                        >{s.stock_name}</button>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">{s.sector}</td>
                      <td className="px-4 py-2.5 text-center"><TypeBadge t={s.signal_type} /></td>
                      <td className="px-4 py-2.5 text-right tabular-nums">¥{fmt(s.close)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground hidden md:table-cell">¥{fmt(s.sma20)}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums ${s.dev_from_sma20 < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{fmtPct(s.dev_from_sma20, 2)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-rose-400">¥{fmt(s.sl_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="text-muted-foreground text-sm py-8 text-center">本日のシグナルはありません</div>}
        </Panel>

        {/* ── 本日イグジット ── */}
        {posData && posData.exits.length > 0 && (
          <Panel title={<h2 className="text-base md:text-lg font-semibold text-amber-400">本日イグジット — {posData.exits.length}件（翌朝寄付で成行売り）</h2>} border="border-amber-500/40">
            <div className="overflow-x-auto">
              <table className="w-full text-sm md:text-base">
                <thead><tr className="text-muted-foreground border-b border-border/30 bg-muted/10">
                  <th className="text-left px-4 py-2.5 text-xs md:text-sm font-medium">コード</th>
                  <th className="text-left px-4 py-2.5 text-xs md:text-sm font-medium">銘柄</th>
                  <th className="text-center px-4 py-2.5 text-xs md:text-sm font-medium">種別</th>
                  <th className="text-right px-4 py-2.5 text-xs md:text-sm font-medium">エントリー</th>
                  <th className="text-right px-4 py-2.5 text-xs md:text-sm font-medium hidden md:table-cell">IN価格</th>
                  <th className="text-right px-4 py-2.5 text-xs md:text-sm font-medium hidden md:table-cell">現在値</th>
                  <th className="text-right px-4 py-2.5 text-xs md:text-sm font-medium">損益%</th>
                  <th className="text-right px-4 py-2.5 text-xs md:text-sm font-medium">損益</th>
                  <th className="text-left px-4 py-2.5 text-xs md:text-sm font-medium">理由</th>
                </tr></thead>
                <tbody>
                  {posData.exits.map((ex, i) => {
                    const el = exitLabel(ex.exit_type);
                    return (
                      <tr key={i} className="border-b border-border/20 hover:bg-muted/5">
                        <td className="px-4 py-2.5 tabular-nums">{ex.ticker.replace('.T', '')}</td>
                        <td className="px-4 py-2.5">
                          <button type="button" className="hover:text-primary transition-colors block max-w-[140px] truncate text-left" title={ex.stock_name} onClick={(e) => { e.stopPropagation(); window.open(`/${ex.ticker.replace('.T', '')}`, 'stock-detail'); }}>{ex.stock_name}</button>
                        </td>
                        <td className="px-4 py-2.5 text-center"><TypeBadge t={ex.signal_type} /></td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{shortDate(ex.entry_date)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums hidden md:table-cell">¥{fmt(ex.entry_price)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums hidden md:table-cell">¥{fmt(ex.current_price)}</td>
                        <td className={`px-4 py-2.5 text-right tabular-nums ${ex.ret_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtPct(ex.ret_pct, 2)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{fmtPnl(ex.pnl_yen)}</td>
                        <td className={`px-4 py-2.5 ${el.cls}`}>{el.text}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {/* ── 保有ポジション ── */}
        {posData && posData.positions.length > 0 && (
          <Panel title={`保有ポジション — ${posData.positions.length}件 (${posData.as_of || '-'})`}
            footer={<span>合計含み損益: <span className="font-bold tabular-nums ml-1">{fmtPnl(posData.positions.reduce((s, p) => s + p.unrealized_yen, 0))}</span></span>}>
            {/* モバイル */}
            <div className="md:hidden divide-y divide-border/20">
              {posData.positions.map((p, i) => (
                <div key={i} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums font-semibold">{p.ticker.replace('.T', '')}</span>
                      <button type="button" className="hover:text-primary transition-colors truncate max-w-[140px] text-left" title={p.stock_name} onClick={(e) => { e.stopPropagation(); window.open(`/${p.ticker.replace('.T', '')}`, 'stock-detail'); }}>{p.stock_name}</button>
                      <TypeBadge t={p.signal_type} />
                    </div>
                    <span className={`font-bold tabular-nums ${p.unrealized_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtPct(p.unrealized_pct, 2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{shortDate(p.entry_date)} / IN ¥{fmt(p.entry_price)} → ¥{fmt(p.current_price)} / {p.hold_days}日</span>
                    <span className="tabular-nums">{fmtPnl(p.unrealized_yen)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-rose-400/70">SL ¥{fmt(p.sl_price)}</span>
                    <span className={(p.trail_sl ?? p.sl_price) > p.entry_price ? 'text-emerald-400' : (p.trail_sl ?? p.sl_price) > p.sl_price ? 'text-amber-400' : 'text-rose-400/70'}>Trail ¥{fmt(p.trail_sl ?? p.sl_price)}</span>
                    {p.exit_type ? (
                      <span className="px-1.5 py-0.5 text-xs rounded bg-amber-500/20 text-amber-400">
                        {p.exit_type === 'dead_cross' ? 'DC→翌朝売' : p.exit_type === 'SMA20_touch' ? 'SMA20→翌朝売' : p.exit_type === 'time_cut' ? '7日→翌朝売' : p.exit_type}
                      </span>
                    ) : <span className="text-muted-foreground/40">保有中</span>}
                  </div>
                </div>
              ))}
            </div>
            {/* デスクトップ */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm md:text-base">
                <thead><tr className="text-muted-foreground border-b border-border/30 bg-muted/10">
                  <th className="text-left px-4 py-2.5 text-xs md:text-sm font-medium">コード</th>
                  <th className="text-left px-4 py-2.5 text-xs md:text-sm font-medium">銘柄</th>
                  <th className="text-center px-4 py-2.5 text-xs md:text-sm font-medium">種別</th>
                  <th className="text-right px-4 py-2.5 text-xs md:text-sm font-medium">エントリー</th>
                  <th className="text-right px-4 py-2.5 text-xs md:text-sm font-medium">IN価格</th>
                  <th className="text-right px-4 py-2.5 text-xs md:text-sm font-medium">現在値</th>
                  <th className="text-right px-4 py-2.5 text-xs md:text-sm font-medium">含み%</th>
                  <th className="text-right px-4 py-2.5 text-xs md:text-sm font-medium">含み損益</th>
                  <th className="text-right px-4 py-2.5 text-xs md:text-sm font-medium">SL価格</th>
                  <th className="text-right px-4 py-2.5 text-xs md:text-sm font-medium">Trail SL</th>
                  <th className="text-right px-4 py-2.5 text-xs md:text-sm font-medium">日数</th>
                  <th className="text-left px-4 py-2.5 text-xs md:text-sm font-medium">状態</th>
                </tr></thead>
                <tbody>
                  {posData.positions.map((p, i) => (
                    <tr key={i} className="border-b border-border/20 hover:bg-muted/5">
                      <td className="px-4 py-2.5 tabular-nums">{p.ticker.replace('.T', '')}</td>
                      <td className="px-4 py-2.5">
                        <button type="button" className="hover:text-primary transition-colors block max-w-[160px] truncate text-left" title={p.stock_name} onClick={(e) => { e.stopPropagation(); window.open(`/${p.ticker.replace('.T', '')}`, 'stock-detail'); }}>{p.stock_name}</button>
                      </td>
                      <td className="px-4 py-2.5 text-center"><TypeBadge t={p.signal_type} /></td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{shortDate(p.entry_date)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">¥{fmt(p.entry_price)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">¥{fmt(p.current_price)}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums ${p.unrealized_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtPct(p.unrealized_pct, 2)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtPnl(p.unrealized_yen)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-rose-400">¥{fmt(p.sl_price)}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums ${(p.trail_sl ?? p.sl_price) > p.entry_price ? 'text-emerald-400' : (p.trail_sl ?? p.sl_price) > p.sl_price ? 'text-amber-400' : 'text-rose-400'}`}>¥{fmt(p.trail_sl ?? p.sl_price)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{p.hold_days}日</td>
                      <td className="px-4 py-2.5">
                        {p.exit_type ? (
                          <span className="px-1.5 py-0.5 text-xs rounded bg-amber-500/20 text-amber-400">
                            {p.exit_type === 'dead_cross' ? 'DC→翌朝売' : p.exit_type === 'SMA20_touch' ? 'SMA20→翌朝売' : p.exit_type === 'time_cut' ? '7日→翌朝売' : p.exit_type}
                          </span>
                        ) : <span className="text-muted-foreground/40">保有中</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {/* ── バックテスト概要 (2025/1~) ── */}
        {(() => {
          const months = summary?.monthly?.filter(m => m.month >= '2025-01') || [];
          if (!months.length) return null;
          const cnt = months.reduce((s, m) => s + m.count, 0);
          const pnl = months.reduce((s, m) => s + m.pnl, 0);
          const sl = months.reduce((s, m) => s + m.sl_count, 0);
          const wr = cnt > 0 ? months.reduce((s, m) => s + m.win_rate * m.count, 0) / cnt : 0;
          const pnlCls = pnl >= 0 ? 'text-emerald-400' : 'text-rose-400';
          const wrCls = wr >= 55 ? 'text-emerald-400' : wr >= 45 ? 'text-amber-400' : 'text-rose-400';
          return (
            <section className="mb-5">
              <h2 className="text-base md:text-lg font-semibold text-foreground mb-2">バックテスト概要 (2025/1~)</h2>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                <StatCard label="取引数" sub={`${months.length}ヶ月`}><span className="text-foreground">{cnt}</span></StatCard>
                <StatCard label="損益合計"><span className={`whitespace-nowrap ${pnlCls}`}>{pnl >= 0 ? '+' : ''}{fmt(pnl)}円</span></StatCard>
                <StatCard label="勝率"><span className={wrCls}>{wr.toFixed(1)}%</span></StatCard>
                <StatCard label="SL発動" sub={`${cnt > 0 ? (sl / cnt * 100).toFixed(1) : 0}%`}><span className="text-foreground">{sl}</span></StatCard>
                <StatCard label="月平均"><span className={`whitespace-nowrap ${pnlCls}`}>{fmt(Math.round(pnl / months.length))}円</span></StatCard>
              </div>
            </section>
          );
        })()}

        {/* ── 戦略比較 ── */}
        {comparison?.strategies && (
          <Panel title="戦略比較（TP+10% vs 7日引け vs 利確なし）"
            footer="TP+10%: IFD指値利確 / 7日引け: 7営業日後の引け決済 / 利確なし: グランビル出口のみ">
            <div className="overflow-x-auto">
              <table className="w-full text-sm md:text-base">
                <thead><tr className="text-muted-foreground border-b border-border/30 bg-muted/10">
                  <th className="text-left px-4 py-2.5 text-xs md:text-sm font-medium">期間</th>
                  <th className="text-left px-4 py-2.5 text-xs md:text-sm font-medium">戦略</th>
                  <th className="text-right px-4 py-2.5 text-xs md:text-sm font-medium">件数</th>
                  <th className="text-right px-4 py-2.5 text-xs md:text-sm font-medium">損益</th>
                  <th className="text-right px-4 py-2.5 text-xs md:text-sm font-medium">PF</th>
                  <th className="text-right px-4 py-2.5 text-xs md:text-sm font-medium">勝率</th>
                  <th className="text-right px-4 py-2.5 text-xs md:text-sm font-medium hidden md:table-cell">平均保有</th>
                </tr></thead>
                <tbody>
                  {([{ label: '14M', key: '14m' as const }, { label: '2026', key: '2026' as const }, { label: '全期間', key: 'all' as const }] as const).map(({ label: pLabel, key }) => {
                    const rows = comparison.strategies[key] || [];
                    return rows.map((r, ri) => (
                      <tr key={`${key}-${ri}`} className={`border-b border-border/20 hover:bg-muted/5 ${ri === 0 ? 'border-t border-border/40' : ''}`}>
                        {ri === 0 && <td rowSpan={rows.length} className="px-4 py-2.5 font-semibold text-foreground align-top border-r border-border/20">{pLabel}</td>}
                        <td className={`px-4 py-2.5 ${r.label === 'TP+10%' ? 'text-emerald-400 font-medium' : 'text-muted-foreground'}`}>{r.label}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{r.count}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{fmtPnl(r.pnl)}</td>
                        <td className={`px-4 py-2.5 text-right tabular-nums font-bold ${r.pf >= 1.5 ? 'text-emerald-400' : r.pf >= 1.0 ? 'text-foreground' : 'text-rose-400'}`}>{r.pf}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{r.win_rate}%</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground hidden md:table-cell">{r.avg_hold}日</td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {/* ── トレード一覧 ── */}
        {(() => {
          const CUTOFF = '2025-01';
          const all = trades?.results || [];
          const isRecent = (g: TradeGroup) => tradeView === 'by-stock' ? g.trades.some(t => t.exit_date >= CUTOFF) : g.key >= CUTOFF;
          const recent = all.filter(isRecent);
          const filtered = tradeView === 'by-stock'
            ? recent.map(g => { const rt = g.trades.filter(t => t.exit_date >= CUTOFF); return { ...g, trades: rt, count: rt.length, pnl: rt.reduce((s, t) => s + t.pnl_yen, 0), win_count: rt.filter(t => t.pnl_yen > 0).length }; }).filter(g => g.count > 0)
            : recent;
          const archAll = all.filter(g => !isRecent(g));
          const archTrades = tradeView === 'by-stock' ? all.flatMap(g => g.trades.filter(t => t.exit_date < CUTOFF)) : archAll.flatMap(g => g.trades);
          const archCnt = archTrades.length;
          const archPnl = archTrades.reduce((s, t) => s + t.pnl_yen, 0);
          const archWin = archTrades.filter(t => t.pnl_yen > 0).length;
          const archWr = archCnt > 0 ? (archWin / archCnt) * 100 : 0;
          const archSl = archTrades.filter(t => t.exit_type === 'SL').length;

          return (
            <>
              <section className="mb-5">
                <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 shadow-lg shadow-black/5 backdrop-blur-xl overflow-hidden">
                  <div className="px-4 md:px-5 py-3 border-b border-border/40 flex flex-wrap items-center gap-3">
                    <h2 className="text-base md:text-lg font-semibold text-foreground">トレード一覧 (2025/1~ 決済日基準)</h2>
                    <div className="flex gap-1">
                      {(['daily', 'weekly', 'monthly', 'by-stock'] as const).map(v => (
                        <button key={v} onClick={() => setTradeView(v)}
                          className={`px-3 py-1 text-xs rounded-full border transition-colors ${tradeView === v ? 'bg-primary text-primary-foreground border-primary' : 'border-border/40 text-muted-foreground hover:text-foreground hover:border-border'}`}>
                          {v === 'daily' ? '日別' : v === 'weekly' ? '週別' : v === 'monthly' ? '月別' : '銘柄別'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filtered.map(group => {
                    const open = expandedKeys.has(group.key);
                    return (
                      <div key={group.key} className="border-b border-border/20 last:border-b-0">
                        <button onClick={() => toggle(group.key)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors text-sm md:text-base">
                          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                          <span className="font-semibold tabular-nums">{group.key}</span>
                          <span className="text-muted-foreground">{group.count}件</span>
                          <span className="ml-auto tabular-nums">{fmtPnl(group.pnl)}</span>
                          <span className="text-muted-foreground text-xs">{group.win_count}勝</span>
                        </button>
                        {open && (
                          <>
                            {/* モバイル */}
                            <div className="md:hidden px-4 pb-3 space-y-2">
                              {group.trades.map((t, i) => {
                                const el = exitLabel(t.exit_type);
                                return (
                                  <div key={i} className="rounded-lg bg-muted/10 px-4 py-2.5.5">
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center gap-2">
                                        <span className="tabular-nums font-semibold">{t.ticker.replace('.T', '')}</span>
                                        <span className="truncate max-w-[120px]">{t.stock_name}</span>
                                        <TypeBadge t={t.signal_type} />
                                      </div>
                                      <span className={`font-bold tabular-nums ${t.ret_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtPct(t.ret_pct, 2)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                      <span>{shortDate(t.entry_date)} → {shortDate(t.exit_date)} / ¥{fmt(t.entry_price)} → ¥{fmt(t.exit_price)}</span>
                                      <div className="flex items-center gap-2">
                                        <span className="tabular-nums">{fmtPnl(t.pnl_yen)}</span>
                                        <span className={el.cls}>{el.text}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            {/* デスクトップ */}
                            <div className="hidden md:block px-4 pb-4 overflow-x-auto">
                              <table className="w-full text-sm md:text-base">
                                <thead><tr className="border-b border-border/30">
                                  <th className="text-left px-4 py-2.5 text-xs md:text-sm text-muted-foreground font-medium">エントリー</th>
                                  <th className="text-left px-4 py-2.5 text-xs md:text-sm text-muted-foreground font-medium">決済</th>
                                  <th className="text-left px-4 py-2.5 text-xs md:text-sm text-muted-foreground font-medium">コード</th>
                                  <th className="text-left px-4 py-2.5 text-xs md:text-sm text-muted-foreground font-medium">銘柄</th>
                                  <th className="text-center px-4 py-2.5 text-xs md:text-sm text-muted-foreground font-medium">種別</th>
                                  <th className="text-right px-4 py-2.5 text-xs md:text-sm text-muted-foreground font-medium">IN価格</th>
                                  <th className="text-right px-4 py-2.5 text-xs md:text-sm text-muted-foreground font-medium">OUT価格</th>
                                  <th className="text-right px-4 py-2.5 text-xs md:text-sm text-muted-foreground font-medium">リターン</th>
                                  <th className="text-right px-4 py-2.5 text-xs md:text-sm text-muted-foreground font-medium">損益</th>
                                  <th className="text-center px-4 py-2.5 text-xs md:text-sm text-muted-foreground font-medium">理由</th>
                                </tr></thead>
                                <tbody className="divide-y divide-border/20">
                                  {group.trades.map((t, i) => {
                                    const el = exitLabel(t.exit_type);
                                    return (
                                      <tr key={i} className="hover:bg-muted/20">
                                        <td className="px-4 py-2.5 tabular-nums">{shortDate(t.entry_date)}</td>
                                        <td className="px-4 py-2.5 tabular-nums">{shortDate(t.exit_date)}</td>
                                        <td className="px-4 py-2.5 tabular-nums">{t.ticker.replace('.T', '')}</td>
                                        <td className="px-4 py-2.5 max-w-[140px] truncate">{t.stock_name}</td>
                                        <td className="px-4 py-2.5 text-center"><TypeBadge t={t.signal_type} /></td>
                                        <td className="px-4 py-2.5 text-right tabular-nums">¥{fmt(t.entry_price)}</td>
                                        <td className="px-4 py-2.5 text-right tabular-nums">¥{fmt(t.exit_price)}</td>
                                        <td className={`px-4 py-2.5 text-right tabular-nums ${t.ret_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtPct(t.ret_pct, 2)}</td>
                                        <td className="px-4 py-2.5 text-right tabular-nums">{fmtPnl(t.pnl_yen)}</td>
                                        <td className={`px-4 py-2.5 text-center ${el.cls}`}>{el.text}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                  {!filtered.length && <div className="text-muted-foreground text-sm py-8 text-center">2025/1以降のトレードデータがありません</div>}
                </div>
              </section>

              {archCnt > 0 && (
                <Panel title="アーカイブ (~2024/12)">
                  <div className="px-4 md:px-5 py-3 flex flex-wrap gap-4 md:gap-6 text-sm">
                    <div><span className="text-muted-foreground">取引数</span> <span className="font-bold tabular-nums">{archCnt}件</span></div>
                    <div><span className="text-muted-foreground">損益</span> <span className="font-bold tabular-nums">{fmtPnl(archPnl)}</span></div>
                    <div><span className="text-muted-foreground">勝率</span> <span className={`font-bold tabular-nums ${archWr >= 55 ? 'text-emerald-400' : 'text-amber-400'}`}>{archWr.toFixed(1)}%</span></div>
                    <div><span className="text-muted-foreground">勝敗</span> <span className="text-emerald-400 font-bold tabular-nums">{archWin}勝</span> / <span className="text-rose-400 font-bold tabular-nums">{archCnt - archWin}敗</span></div>
                    <div><span className="text-muted-foreground">SL</span> <span className="font-bold tabular-nums">{archSl}件</span></div>
                  </div>
                </Panel>
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
