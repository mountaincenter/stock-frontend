'use client';

import { useEffect, useState } from 'react';
import { DevNavLinks } from '../../../components/dev';
import { ChevronDown, ChevronRight } from 'lucide-react';

// === Types (新API対応) ===
interface Recommendation {
  ticker: string; stock_name: string; sector: string; rule: string;
  close: number; entry_price_est: number; sma20: number; dev_from_sma20: number;
  margin: number; concentration_pct: number; max_hold: number;
  rsi14: number;
}
interface RecommendationsResponse { recommendations: Recommendation[]; count: number; total_margin: number; date: string | null; }

interface Signal {
  ticker: string; stock_name: string; sector: string; rule: string;
  close: number; sma20: number; dev_from_sma20: number; sma20_slope: number;
  entry_price_est: number; rsi14: number;
}
interface SignalsResponse { signals: Signal[]; count: number; signal_date: string | null; }

interface Position {
  ticker: string; rule: string; entry_date: string; entry_price: number;
  current_price: number; unrealized_pct: number; unrealized_yen: number;
  hold_days: number; max_hold: number; remaining_days: number; exit_type: string;
}
interface PositionsResponse { positions: Position[]; exits: Position[]; as_of: string | null; }

interface StatusResponse {
  available_margin: number; total_margin_used: number;
  signal_count: number; signal_date: string | null;
  open_positions: number; exit_candidates: number;
  recommendation_count: number;
  rule_breakdown: Record<string, number>;
}

interface RuleStats { count: number; win_rate: number; total_pnl: number; avg_pnl: number; }
interface MonthlyStats { month: string; count: number; pnl: number; win_rate: number; }
interface StatsResponse { by_rule: Record<string, RuleStats>; monthly: MonthlyStats[]; total_trades: number; }

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

// === Helpers ===
const fmt = (v: number) => v.toLocaleString('ja-JP');
const fmtPnl = (v: number) => <span className={v >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{v >= 0 ? '+' : ''}{fmt(v)}円</span>;
const fmtPct = (v: number, d = 1) => `${v >= 0 ? '+' : ''}${v.toFixed(d)}%`;
const shortDate = (d: string) => { const m = d.match(/\d{4}-(\d{2})-(\d{2})/); return m ? `${m[1]}/${m[2]}` : d; };

// === Rule Badge ===
const RuleBadge = ({ rule }: { rule: string }) => {
  const cls = rule === 'B4' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
    : rule === 'B1' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    : rule === 'B3' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    : 'bg-purple-500/20 text-purple-400 border-purple-500/30';
  return <span className={`inline-block px-1.5 py-0.5 text-xs rounded leading-none border ${cls}`}>{rule}</span>;
};

const ruleLabel = (r: string) => {
  if (r === 'B1') return 'GC突破';
  if (r === 'B2') return '押し目';
  if (r === 'B3') return 'SMA支持';
  if (r === 'B4') return '暴落反発';
  return r;
};

const exitLabel = (t: string) => {
  if (t === '20d_high') return { text: '20日高値', cls: 'text-emerald-400' };
  if (t === 'max_hold') return { text: 'MAX_HOLD', cls: 'text-amber-400' };
  return { text: t || '保有中', cls: 'text-muted-foreground' };
};

// === Components ===
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

function GranvilleContent() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationsResponse | null>(null);
  const [signals, setSignals] = useState<SignalsResponse | null>(null);
  const [posData, setPosData] = useState<PositionsResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllSignals, setShowAllSignals] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/dev/granville/status`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/api/dev/granville/recommendations`).then(r => r.json()).catch(() => ({ recommendations: [], count: 0, total_margin: 0, date: null })),
      fetch(`${API_BASE}/api/dev/granville/signals`).then(r => r.json()).catch(() => ({ signals: [], count: 0, signal_date: null })),
      fetch(`${API_BASE}/api/dev/granville/positions`).then(r => r.json()).catch(() => ({ positions: [], exits: [], as_of: null })),
      fetch(`${API_BASE}/api/dev/granville/stats`).then(r => r.json()).catch(() => null),
    ]).then(([st, rec, sig, pos, sta]) => {
      setStatus(st); setRecommendations(rec); setSignals(sig); setPosData(pos); setStats(sta); setLoading(false);
    });
  }, []);

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

  const marginPct = status ? (status.total_margin_used / status.available_margin * 100) : 0;

  return (
    <main className="relative min-h-screen">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-primary/8 via-primary/3 to-transparent blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4 pb-3 border-b border-border/30">
          <div>
            <h1 className="text-xl font-bold text-foreground">Granville B1-B4</h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              TOPIX 1,660銘柄 / 20日高値Exit / ML優先順位 / 証拠金管理
              {status?.signal_date ? ` (${status.signal_date})` : ''}
            </p>
          </div>
          <DevNavLinks links={["dashboard", "analysis", "recommendations", "stock-results", "reports"]} />
        </header>

        {/* Status Bar */}
        {status && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
            <StatCard label="利用可能証拠金" sub={`使用率 ${marginPct.toFixed(1)}%`}>
              <span className="text-foreground">¥{fmt(status.available_margin)}</span>
            </StatCard>
            <StatCard label="推奨銘柄" sub={status.total_margin_used > 0 ? `証拠金 ¥${fmt(status.total_margin_used)}` : undefined}>
              <span className="text-foreground">{status.recommendation_count}</span>
            </StatCard>
            <StatCard label="シグナル数" sub={
              <span className="flex gap-2 justify-end">
                {['B4', 'B1', 'B3', 'B2'].map(r => {
                  const n = status.rule_breakdown[r] || 0;
                  return n > 0 ? <span key={r}>{r}:{n}</span> : null;
                })}
              </span>
            }>
              <span className="text-foreground">{status.signal_count}</span>
            </StatCard>
            <StatCard label="ポジション" sub={status.exit_candidates > 0 ? `Exit候補: ${status.exit_candidates}件` : undefined}>
              <span className="text-foreground">{status.open_positions}</span>
            </StatCard>
            <StatCard label="基準日">
              <span className="text-foreground text-lg">{status.signal_date || '-'}</span>
            </StatCard>
          </div>
        )}

        {/* Exit Candidates Alert */}
        {posData && posData.exits.length > 0 && (
          <Panel title={<h2 className="text-base md:text-lg font-semibold text-amber-400">Exit候補 - {posData.exits.length}件（翌朝寄付で決済）</h2>} border="border-amber-500/40">
            <div className="overflow-x-auto">
              <table className="w-full text-sm md:text-base">
                <thead><tr className="text-muted-foreground border-b border-border/30 bg-muted/10">
                  <th className="text-left px-4 py-2.5 text-xs font-medium">コード</th>
                  <th className="text-center px-3 py-2.5 text-xs font-medium">ルール</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium">IN日</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium hidden md:table-cell">IN価格</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium hidden md:table-cell">現在値</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium">損益%</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium">損益</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium">日数</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium">理由</th>
                </tr></thead>
                <tbody>
                  {posData.exits.map((p, i) => {
                    const el = exitLabel(p.exit_type);
                    return (
                      <tr key={i} className="border-b border-border/20 hover:bg-muted/5">
                        <td className="px-4 py-2.5 tabular-nums font-semibold">
                          <button type="button" className="hover:text-primary" onClick={() => window.open(`/${p.ticker.replace('.T', '')}`, 'stock-detail')}>
                            {p.ticker.replace('.T', '')}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 text-center"><RuleBadge rule={p.rule} /></td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{shortDate(p.entry_date)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums hidden md:table-cell">¥{fmt(p.entry_price)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums hidden md:table-cell">¥{fmt(p.current_price)}</td>
                        <td className={`px-4 py-2.5 text-right tabular-nums ${p.unrealized_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtPct(p.unrealized_pct, 2)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{fmtPnl(p.unrealized_yen)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{p.hold_days}/{p.max_hold}</td>
                        <td className={`px-4 py-2.5 ${el.cls}`}>{el.text}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {/* Recommendations */}
        <Panel title={`推奨銘柄 (${recommendations?.date || '-'}) - ${recommendations?.count || 0}件`}
          footer={<div className="flex flex-wrap gap-x-5 gap-y-1">
            <span><RuleBadge rule="B4" /> {ruleLabel('B4')} 乖離{'<'}-8%</span>
            <span><RuleBadge rule="B1" /> {ruleLabel('B1')} prev{'<'}SMA20, now{'>'}SMA20</span>
            <span><RuleBadge rule="B3" /> {ruleLabel('B3')} 乖離0-3%縮小</span>
            <span><RuleBadge rule="B2" /> {ruleLabel('B2')} 乖離-5~0%</span>
          </div>}>
          {recommendations && recommendations.recommendations.length > 0 ? (
            <>
              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-border/20">
                {recommendations.recommendations.map((r, i) => (
                  <div key={i} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <RuleBadge rule={r.rule} />
                        <button type="button" className="font-semibold tabular-nums hover:text-primary" onClick={() => window.open(`/${r.ticker.replace('.T', '')}`, 'stock-detail')}>
                          {r.ticker.replace('.T', '')}
                        </button>
                        <span className="truncate max-w-[120px]">{r.stock_name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">RSI {r.rsi14.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>¥{fmt(r.entry_price_est)} / 証拠金 ¥{fmt(r.margin)} ({r.concentration_pct}%)</span>
                      <span className={r.dev_from_sma20 < 0 ? 'text-rose-400' : 'text-emerald-400'}>{fmtPct(r.dev_from_sma20, 2)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground/60 mt-0.5">
                      MAX_HOLD {r.max_hold}日 / Exit: 20日高値
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-muted-foreground border-b border-border/30 bg-muted/10">
                    <th className="text-center px-3 py-2.5 text-xs font-medium">ルール</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium">コード</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium">銘柄</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium">セクター</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium">Entry価格</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium">SMA20</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium">乖離%</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium">証拠金</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium">集中%</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium">MAX_HOLD</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium">RSI14</th>
                  </tr></thead>
                  <tbody>
                    {recommendations.recommendations.map((r, i) => (
                      <tr key={i} className="border-b border-border/20 hover:bg-muted/5">
                        <td className="px-3 py-2.5 text-center"><RuleBadge rule={r.rule} /></td>
                        <td className="px-4 py-2.5 tabular-nums">
                          <button type="button" className="hover:text-primary font-semibold" onClick={() => window.open(`/${r.ticker.replace('.T', '')}`, 'stock-detail')}>
                            {r.ticker.replace('.T', '')}
                          </button>
                        </td>
                        <td className="px-4 py-2.5 max-w-[140px] truncate">{r.stock_name}</td>
                        <td className="px-4 py-2.5 text-muted-foreground max-w-[100px] truncate">{r.sector}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">¥{fmt(r.entry_price_est)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">¥{fmt(r.sma20)}</td>
                        <td className={`px-4 py-2.5 text-right tabular-nums ${r.dev_from_sma20 < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{fmtPct(r.dev_from_sma20, 2)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">¥{fmt(r.margin)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{r.concentration_pct}%</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{r.max_hold}日</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{r.rsi14.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : <div className="text-muted-foreground text-sm py-8 text-center">推奨銘柄はありません</div>}
        </Panel>

        {/* Positions */}
        {posData && posData.positions.length > 0 && (
          <Panel title={`保有ポジション - ${posData.positions.length}件 (${posData.as_of || '-'})`}
            footer={<span>合計含み損益: <span className="font-bold tabular-nums ml-1">{fmtPnl(posData.positions.reduce((s, p) => s + p.unrealized_yen, 0))}</span></span>}>
            {/* Mobile */}
            <div className="md:hidden divide-y divide-border/20">
              {posData.positions.map((p, i) => (
                <div key={i} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <RuleBadge rule={p.rule} />
                      <button type="button" className="font-semibold tabular-nums hover:text-primary" onClick={() => window.open(`/${p.ticker.replace('.T', '')}`, 'stock-detail')}>
                        {p.ticker.replace('.T', '')}
                      </button>
                    </div>
                    <span className={`font-bold tabular-nums ${p.unrealized_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtPct(p.unrealized_pct, 2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{shortDate(p.entry_date)} / ¥{fmt(p.entry_price)} → ¥{fmt(p.current_price)}</span>
                    <span className="tabular-nums">{fmtPnl(p.unrealized_yen)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1 text-muted-foreground/60">
                    <span>{p.hold_days}/{p.max_hold}日 (残{p.remaining_days}日)</span>
                    <span>Exit: 20日高値</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-muted-foreground border-b border-border/30 bg-muted/10">
                  <th className="text-center px-3 py-2.5 text-xs font-medium">ルール</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium">コード</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium">IN日</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium">IN価格</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium">現在値</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium">含み%</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium">含み損益</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium">保有日</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium">残日数</th>
                </tr></thead>
                <tbody>
                  {posData.positions.map((p, i) => (
                    <tr key={i} className="border-b border-border/20 hover:bg-muted/5">
                      <td className="px-3 py-2.5 text-center"><RuleBadge rule={p.rule} /></td>
                      <td className="px-4 py-2.5 tabular-nums">
                        <button type="button" className="hover:text-primary font-semibold" onClick={() => window.open(`/${p.ticker.replace('.T', '')}`, 'stock-detail')}>
                          {p.ticker.replace('.T', '')}
                        </button>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{shortDate(p.entry_date)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">¥{fmt(p.entry_price)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">¥{fmt(p.current_price)}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums ${p.unrealized_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtPct(p.unrealized_pct, 2)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtPnl(p.unrealized_yen)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{p.hold_days}/{p.max_hold}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums ${p.remaining_days <= 2 ? 'text-amber-400' : 'text-muted-foreground'}`}>{p.remaining_days}日</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {/* All Signals (collapsible) */}
        <section className="mb-5">
          <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 shadow-lg shadow-black/5 backdrop-blur-xl overflow-hidden">
            <button onClick={() => setShowAllSignals(!showAllSignals)} className="w-full px-4 md:px-5 py-3 border-b border-border/40 flex items-center gap-3 hover:bg-muted/30 transition-colors">
              {showAllSignals ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              <h2 className="text-base md:text-lg font-semibold text-foreground">全シグナル ({signals?.signal_date || '-'}) - {signals?.count || 0}件</h2>
            </button>
            {showAllSignals && signals && signals.signals.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-muted-foreground border-b border-border/30 bg-muted/10">
                    <th className="text-center px-3 py-2.5 text-xs font-medium">ルール</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium">コード</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium">銘柄</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium hidden md:table-cell">セクター</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium">終値</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium hidden md:table-cell">SMA20</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium">乖離%</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium">RSI14</th>
                  </tr></thead>
                  <tbody>
                    {signals.signals.map((s, i) => (
                      <tr key={i} className="border-b border-border/20 hover:bg-muted/5">
                        <td className="px-3 py-2.5 text-center"><RuleBadge rule={s.rule} /></td>
                        <td className="px-4 py-2.5 tabular-nums">
                          <button type="button" className="hover:text-primary font-semibold" onClick={() => window.open(`/${s.ticker.replace('.T', '')}`, 'stock-detail')}>
                            {s.ticker.replace('.T', '')}
                          </button>
                        </td>
                        <td className="px-4 py-2.5 max-w-[140px] truncate">{s.stock_name}</td>
                        <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">{s.sector}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">¥{fmt(s.close)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground hidden md:table-cell">¥{fmt(s.sma20)}</td>
                        <td className={`px-4 py-2.5 text-right tabular-nums ${s.dev_from_sma20 < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{fmtPct(s.dev_from_sma20, 2)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{s.rsi14.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {showAllSignals && (!signals || signals.signals.length === 0) && (
              <div className="text-muted-foreground text-sm py-8 text-center">シグナルはありません</div>
            )}
          </div>
        </section>

        {/* Stats */}
        {stats && stats.total_trades > 0 && (
          <>
            {/* Rule Performance */}
            {Object.keys(stats.by_rule).length > 0 && (
              <Panel title="ルール別パフォーマンス">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-muted-foreground border-b border-border/30 bg-muted/10">
                      <th className="text-center px-4 py-2.5 text-xs font-medium">ルール</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium">件数</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium">勝率</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium">合計PnL</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium">平均PnL</th>
                    </tr></thead>
                    <tbody>
                      {Object.entries(stats.by_rule).map(([rule, s]) => (
                        <tr key={rule} className="border-b border-border/20 hover:bg-muted/5">
                          <td className="px-4 py-2.5 text-center"><RuleBadge rule={rule} /></td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{s.count}</td>
                          <td className={`px-4 py-2.5 text-right tabular-nums ${s.win_rate >= 55 ? 'text-emerald-400' : s.win_rate >= 45 ? 'text-amber-400' : 'text-rose-400'}`}>{s.win_rate.toFixed(1)}%</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{fmtPnl(s.total_pnl)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{fmtPnl(s.avg_pnl)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            )}

            {/* Monthly PnL */}
            {stats.monthly.length > 0 && (
              <Panel title="月別パフォーマンス">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-muted-foreground border-b border-border/30 bg-muted/10">
                      <th className="text-left px-4 py-2.5 text-xs font-medium">月</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium">件数</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium">PnL</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium">勝率</th>
                    </tr></thead>
                    <tbody>
                      {stats.monthly.map((m) => (
                        <tr key={m.month} className="border-b border-border/20 hover:bg-muted/5">
                          <td className="px-4 py-2.5 tabular-nums font-semibold">{m.month}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{m.count}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{fmtPnl(m.pnl)}</td>
                          <td className={`px-4 py-2.5 text-right tabular-nums ${m.win_rate >= 55 ? 'text-emerald-400' : m.win_rate >= 45 ? 'text-amber-400' : 'text-rose-400'}`}>{m.win_rate.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default function GranvillePage() {
  return <GranvilleContent />;
}
