'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type {
  IChartApi,
  Time,
  BusinessDay,
  UTCTimestamp,
} from 'lightweight-charts';

// === Types ===
interface SeriesPoint {
  date: string;
  norm1: number;
  norm2: number;
  z: number | null;
  hl: number | null;
}
interface PairChartData {
  tk1: string; tk2: string;
  name1: string; name2: string;
  c1: number; c2: number;
  chg1: number; chg2: number;
  chg1_pct: number; chg2_pct: number;
  lookback: number; full_pf: number; full_n: number; revert_1d: number;
  z_latest: number; direction: string;
  tk1_upper: number; tk1_lower: number;
  series: SeriesPoint[];
}

// === Slug parsing ===
function parsePairSlug(slug: string): { tk1: string; tk2: string } | null {
  const parts = slug.split('-');
  if (parts.length !== 2) return null;
  return {
    tk1: parts[0].replace(/T$/, '.T'),
    tk2: parts[1].replace(/T$/, '.T'),
  };
}

// === Data hook ===
function usePairChartData(tk1: string, tk2: string, days: number) {
  const [data, setData] = useState<PairChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialLoaded = useRef(false);

  useEffect(() => {
    if (!tk1 || !tk2) return;
    // 期間切替時はローディングスケルトンを出さない
    if (!initialLoaded.current) setLoading(true);
    setError(null);

    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
    const url = `${apiBase}/api/dev/pairs/chart?tk1=${encodeURIComponent(tk1)}&tk2=${encodeURIComponent(tk2)}&days=${days}`;

    fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((d: PairChartData) => { setData(d); setLoading(false); initialLoaded.current = true; })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [tk1, tk2, days]);

  return { data, loading, error };
}

// === Chart helpers ===
function toBusinessDay(dateStr: string): BusinessDay {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { year: y, month: m, day: d };
}

// === Price Overlay Chart (Panel 1) ===
function PriceOverlayChart({ series, name1, name2 }: { series: SeriesPoint[]; name1: string; name2: string }) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = (resolvedTheme ?? theme) === 'dark';

  const containerRef = useRef<HTMLDivElement | null>(null);
  const s1Ref = useRef<any>(null);
  const s2Ref = useRef<any>(null);
  const [hovered, setHovered] = useState<{ date: string; v1: number; v2: number; x: number; y: number } | null>(null);

  const style = useMemo(() => ({
    paper: isDark ? '#0b0b0c' : '#ffffff',
    text: isDark ? '#e5e7eb' : '#111827',
    grid: isDark ? '#303034' : '#e5e7eb',
    cross: isDark ? '#6b7280' : '#9ca3af',
    line1: '#3b82f6',
    line2: '#f59e0b',
  }), [isDark]);

  useEffect(() => {
    if (!mounted || series.length === 0) return;
    let chart: IChartApi | undefined;
    let disposed = false;
    let ro: ResizeObserver | undefined;

    const setup = async () => {
      const { createChart, ColorType, LineSeries } = await import('lightweight-charts');
      if (disposed) return;
      const el = containerRef.current;
      if (!el) return;

      const chartApi = createChart(el, {
        layout: { background: { type: ColorType.Solid, color: style.paper }, textColor: style.text },
        width: el.clientWidth,
        height: 420,
        grid: { vertLines: { color: style.grid }, horzLines: { color: style.grid } },
        timeScale: { borderColor: style.grid, timeVisible: false },
        rightPriceScale: { borderColor: style.grid },
        crosshair: { vertLine: { color: style.cross }, horzLine: { color: style.cross } },
        localization: {
          locale: 'ja-JP',
          priceFormatter: (p: number) => p.toFixed(1),
          timeFormatter: (t: UTCTimestamp | BusinessDay) => {
            if (typeof t === 'object' && 'year' in t) return `${t.year}/${String(t.month).padStart(2, '0')}/${String(t.day).padStart(2, '0')}`;
            return String(t);
          },
        },
        handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
        handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true, axisDoubleClickReset: true },
      });
      chart = chartApi;

      const s1 = chartApi.addSeries(LineSeries, {
        color: style.line1, lineWidth: 2,
        priceLineVisible: false, lastValueVisible: false,
        crosshairMarkerVisible: true, title: '',
      });
      s1.setData(series.map(p => ({ time: toBusinessDay(p.date) as Time, value: p.norm1 })));
      s1Ref.current = s1;

      const s2 = chartApi.addSeries(LineSeries, {
        color: style.line2, lineWidth: 2,
        priceLineVisible: false, lastValueVisible: false,
        crosshairMarkerVisible: true, title: '',
      });
      s2.setData(series.map(p => ({ time: toBusinessDay(p.date) as Time, value: p.norm2 })));
      s2Ref.current = s2;

      chartApi.subscribeCrosshairMove((param) => {
        if (disposed) return;
        if (!param.time || !param.seriesData?.size || !param.point) { setHovered(null); return; }
        const t = param.time as BusinessDay;
        const date = `${t.year}/${String(t.month).padStart(2, '0')}/${String(t.day).padStart(2, '0')}`;
        const d1 = param.seriesData.get(s1Ref.current);
        const d2 = param.seriesData.get(s2Ref.current);
        if (d1 && d2) setHovered({ date, v1: (d1 as any).value, v2: (d2 as any).value, x: param.point.x, y: param.point.y });
      });

      chartApi.timeScale().fitContent();

      ro = new ResizeObserver(() => {
        if (containerRef.current && chart) {
          chart.applyOptions({ width: containerRef.current.clientWidth });
        }
      });
      ro.observe(el);
    };

    setup();
    return () => { disposed = true; ro?.disconnect(); chart?.remove(); };
  }, [mounted, series, name1, name2, style]);

  if (!mounted) return <div className="h-[420px] bg-card/50 rounded-2xl animate-pulse" />;

  const tipFlip = hovered && containerRef.current ? hovered.x > containerRef.current.clientWidth * 0.65 : false;

  return (
    <div className="relative">
      {hovered && (
        <div
          style={{
            ...(tipFlip ? { right: (containerRef.current?.clientWidth ?? 0) - hovered.x + 16 } : { left: hovered.x + 16 }),
            top: Math.max(8, hovered.y - 20),
          }}
          className="absolute z-10 bg-card border border-border rounded-lg px-3 py-2 text-xs space-y-0.5 pointer-events-none whitespace-nowrap"
        >
          <div className="text-muted-foreground">{hovered.date}</div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-blue-500 inline-block rounded" />
            <span className="text-muted-foreground">{name1}</span>
            <span className="text-foreground font-medium tabular-nums">{hovered.v1.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-amber-500 inline-block rounded" />
            <span className="text-muted-foreground">{name2}</span>
            <span className="text-foreground font-medium tabular-nums">{hovered.v2.toFixed(1)}</span>
          </div>
        </div>
      )}
      <div ref={containerRef} className="w-full h-[420px]" />
    </div>
  );
}

// === Z-Score Chart (Panel 2) ===
function ZScoreChart({ series }: { series: SeriesPoint[] }) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = (resolvedTheme ?? theme) === 'dark';

  const containerRef = useRef<HTMLDivElement | null>(null);
  const zSeriesRef = useRef<any>(null);
  const hlSeriesRef = useRef<any>(null);
  const [hovered, setHovered] = useState<{ date: string; z: number; hl: number | null; x: number; y: number } | null>(null);

  const style = useMemo(() => ({
    paper: isDark ? '#0b0b0c' : '#ffffff',
    text: isDark ? '#e5e7eb' : '#111827',
    grid: isDark ? '#303034' : '#e5e7eb',
    cross: isDark ? '#6b7280' : '#9ca3af',
    zLine: isDark ? '#a78bfa' : '#7c3aed',
    hlLine: isDark ? 'rgba(251,191,36,0.7)' : 'rgba(217,119,6,0.7)',
    entryHigh: isDark ? 'rgba(244,63,94,0.5)' : 'rgba(225,29,72,0.4)',
    entryLow: isDark ? 'rgba(52,211,153,0.5)' : 'rgba(16,185,129,0.4)',
    zero: isDark ? 'rgba(107,114,128,0.5)' : 'rgba(156,163,175,0.5)',
  }), [isDark]);

  const zData = useMemo(() =>
    series.filter(p => p.z !== null).map(p => ({
      time: toBusinessDay(p.date) as Time,
      value: p.z!,
    })),
  [series]);

  const hlData = useMemo(() =>
    series.filter(p => p.hl !== null).map(p => ({
      time: toBusinessDay(p.date) as Time,
      value: p.hl!,
    })),
  [series]);

  useEffect(() => {
    if (!mounted || zData.length === 0) return;
    let chart: IChartApi | undefined;
    let disposed = false;
    let ro: ResizeObserver | undefined;

    const setup = async () => {
      const { createChart, ColorType, LineSeries } = await import('lightweight-charts');
      if (disposed) return;
      const el = containerRef.current;
      if (!el) return;

      const chartApi = createChart(el, {
        layout: { background: { type: ColorType.Solid, color: style.paper }, textColor: style.text },
        width: el.clientWidth,
        height: 380,
        grid: { vertLines: { color: style.grid }, horzLines: { color: style.grid } },
        timeScale: { borderColor: style.grid, timeVisible: false },
        rightPriceScale: { borderColor: style.grid },
        leftPriceScale: { borderColor: style.grid, visible: true },
        crosshair: { vertLine: { color: style.cross }, horzLine: { color: style.cross } },
        localization: {
          locale: 'ja-JP',
          priceFormatter: (p: number) => p.toFixed(2),
          timeFormatter: (t: UTCTimestamp | BusinessDay) => {
            if (typeof t === 'object' && 'year' in t) return `${t.year}/${String(t.month).padStart(2, '0')}/${String(t.day).padStart(2, '0')}`;
            return String(t);
          },
        },
        handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
        handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true, axisDoubleClickReset: true },
      });
      chart = chartApi;

      const zSeries = chartApi.addSeries(LineSeries, {
        color: style.zLine, lineWidth: 2,
        priceLineVisible: false, lastValueVisible: false,
        crosshairMarkerVisible: true, title: '',
      });
      zSeries.setData(zData);
      zSeriesRef.current = zSeries;

      const bandData = (val: number) => zData.map(p => ({ time: p.time, value: val }));

      const plus2 = chartApi.addSeries(LineSeries, {
        color: style.entryHigh, lineWidth: 1, lineStyle: 2,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, title: '',
      });
      plus2.setData(bandData(2.0));

      const minus2 = chartApi.addSeries(LineSeries, {
        color: style.entryLow, lineWidth: 1, lineStyle: 2,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, title: '',
      });
      minus2.setData(bandData(-2.0));

      const zeroLine = chartApi.addSeries(LineSeries, {
        color: style.zero, lineWidth: 1, lineStyle: 2,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, title: '',
      });
      zeroLine.setData(bandData(0));

      // ローリング半減期（左Y軸）
      if (hlData.length > 0) {
        const hlSeries = chartApi.addSeries(LineSeries, {
          color: style.hlLine, lineWidth: 1,
          priceLineVisible: false, lastValueVisible: false,
          crosshairMarkerVisible: true, title: '',
          priceScaleId: 'left',
        });
        hlSeries.setData(hlData);
        hlSeriesRef.current = hlSeries;
      }

      chartApi.subscribeCrosshairMove((param) => {
        if (disposed) return;
        if (!param.time || !param.seriesData?.size || !param.point) { setHovered(null); return; }
        const t = param.time as BusinessDay;
        const date = `${t.year}/${String(t.month).padStart(2, '0')}/${String(t.day).padStart(2, '0')}`;
        const d = param.seriesData.get(zSeriesRef.current);
        const h = hlSeriesRef.current ? param.seriesData.get(hlSeriesRef.current) : null;
        if (d) setHovered({ date, z: (d as any).value, hl: h ? (h as any).value : null, x: param.point.x, y: param.point.y });
      });

      chartApi.timeScale().fitContent();

      ro = new ResizeObserver(() => {
        if (containerRef.current && chart) {
          chart.applyOptions({ width: containerRef.current.clientWidth });
        }
      });
      ro.observe(el);
    };

    setup();
    return () => { disposed = true; ro?.disconnect(); chart?.remove(); };
  }, [mounted, zData, hlData, style]);

  if (!mounted) return <div className="h-[380px] bg-card/50 rounded-2xl animate-pulse" />;

  const tipFlip = hovered && containerRef.current ? hovered.x > containerRef.current.clientWidth * 0.65 : false;

  return (
    <div className="relative">
      {hovered && (
        <div
          style={{
            ...(tipFlip ? { right: (containerRef.current?.clientWidth ?? 0) - hovered.x + 16 } : { left: hovered.x + 16 }),
            top: Math.max(8, hovered.y - 20),
          }}
          className="absolute z-10 bg-card border border-border rounded-lg px-3 py-2 text-xs pointer-events-none whitespace-nowrap"
        >
          <span className="text-muted-foreground">{hovered.date}</span>
          <span className="ml-2 text-foreground font-medium tabular-nums">
            z = {hovered.z >= 0 ? '+' : ''}{hovered.z.toFixed(3)}
          </span>
          {hovered.hl != null && (
            <span className="ml-2 text-amber-400 font-medium tabular-nums">
              HL = {hovered.hl.toFixed(0)}日
            </span>
          )}
        </div>
      )}
      <div ref={containerRef} className="w-full h-[380px]" />
    </div>
  );
}

// === Main Page ===
export default function PairChartPage() {
  const params = useParams();
  const pair = parsePairSlug(typeof params.pair === 'string' ? params.pair : '');

  if (!pair) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2">Invalid pair URL</h1>
          <p className="text-muted-foreground text-sm">Expected format: /pairs/8801T-8830T</p>
          <Link href="/dev/pairs" className="text-primary text-sm mt-4 inline-block hover:underline">Back to Pairs</Link>
        </div>
      </main>
    );
  }

  return <PairChartContent tk1={pair.tk1} tk2={pair.tk2} />;
}

function PairChartContent({ tk1, tk2 }: { tk1: string; tk2: string }) {
  const [days, setDays] = useState(500);
  const { data, loading, error } = usePairChartData(tk1, tk2, days);

  // フック呼び出しは早期returnの前に配置（Rules of Hooks）
  const zStats = useMemo(() => {
    if (!data?.series?.length) return null;
    let maxZ = -Infinity, minZ = Infinity, maxDate = '', minDate = '';
    for (const p of data.series) {
      if (p.z === null) continue;
      if (p.z > maxZ) { maxZ = p.z; maxDate = p.date; }
      if (p.z < minZ) { minZ = p.z; minDate = p.date; }
    }
    const lastDate = data.series[data.series.length - 1]?.date ?? '';
    return { maxZ, maxDate, minZ, minDate, lastDate };
  }, [data?.series]);

  if (loading) {
    return (
      <main className="relative min-h-screen">
        <div className="fixed inset-0 -z-10 bg-background" />
        <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
          <div className="h-8 w-64 bg-muted/30 rounded animate-pulse" />
          <div className="h-[420px] bg-card/50 rounded-xl animate-pulse" />
          <div className="h-[380px] bg-card/50 rounded-xl animate-pulse" />
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="relative min-h-screen">
        <div className="fixed inset-0 -z-10 bg-background" />
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <h1 className="text-xl font-bold mb-2">Error</h1>
            <p className="text-muted-foreground text-sm">{error || 'Data not found'}</p>
            <Link href="/dev/pairs" className="text-primary text-sm mt-4 inline-block hover:underline">Back to Pairs</Link>
          </div>
        </div>
      </main>
    );
  }

  const zColor = Math.abs(data.z_latest) >= 2.0
    ? (data.z_latest > 0 ? 'text-price-down' : 'text-price-up')
    : Math.abs(data.z_latest) >= 1.5 ? 'text-amber-400' : 'text-muted-foreground';

  const priceFormatter = new Intl.NumberFormat('ja-JP', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  const isShortTk1 = data.direction === 'short_tk1';
  const pairedStocks = [
    {
      name: data.name1,
      ticker: data.tk1,
      close: data.c1,
      change: data.chg1,
      pct: data.chg1_pct,
      side: isShortTk1 ? 'Short' as const : 'Long' as const,
      threshold: isShortTk1 ? data.tk1_upper : data.tk1_lower,
      thresholdLabel: isShortTk1 ? '以上' : '以下',
    },
    {
      name: data.name2,
      ticker: data.tk2,
      close: data.c2,
      change: data.chg2,
      pct: data.chg2_pct,
      side: isShortTk1 ? 'Long' as const : 'Short' as const,
      threshold: null as number | null,
      thresholdLabel: null as string | null,
    }
  ];

  const getBadgeTone = (value: number | null | undefined) =>
    value != null && value > 0
      ? 'bg-emerald-500/20 text-price-up'
      : value != null && value < 0
        ? 'bg-rose-500/20 text-price-down'
        : 'bg-muted text-muted-foreground';

  return (
    <main className="relative min-h-screen leading-[1.8] tracking-[0.02em]">
      <div className="fixed inset-0 -z-10 bg-background" />

      <div className="max-w-7xl mx-auto px-4 py-4 leading-[1.8] tracking-[0.02em] font-sans space-y-4">
        {/* Navigation */}
        <div className="flex items-center gap-3">
          <Link href="/dev/pairs" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
            &larr; Pairs
          </Link>
          <Link href="/dev/dashboard" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
            Dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="rounded-xl border border-border bg-card p-4 md:p-6">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {pairedStocks.map((stock) => {
                const changeValue = Number.isFinite(stock.change) ? stock.change : 0;
                const pctValue = Number.isFinite(stock.pct) ? stock.pct : 0;
                const changeTone = getBadgeTone(changeValue);

                return (
                  <div
                    key={stock.ticker}
                    className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="truncate text-xl font-bold leading-tight tracking-tight">
                          {stock.name}
                        </h2>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold leading-none ${stock.side === 'Short' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                          {stock.side}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-mono text-base text-muted-foreground font-semibold">
                          {stock.ticker}
                        </span>
                      </div>
                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-black font-sans tabular-nums leading-none text-foreground">
                          ¥{priceFormatter.format(stock.close)}
                        </span>
                        <span className="text-sm text-muted-foreground/70">Close</span>
                        {stock.threshold != null && stock.threshold > 0 && (
                          <span className={`text-sm font-medium tabular-nums ${stock.side === 'Short' ? 'text-price-down' : 'text-price-up'}`}>
                            ¥{priceFormatter.format(Math.round(stock.threshold))}{stock.thresholdLabel}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <div className={`inline-flex flex-col items-end gap-1 rounded-xl px-4 py-3 ${changeTone}`}>
                        <div className="text-3xl font-black font-sans tabular-nums leading-none">
                          {pctValue > 0 ? '+' : ''}{pctValue.toFixed(2)}%
                        </div>
                        <div className="text-base font-bold font-sans tabular-nums opacity-90">
                          {changeValue > 0 ? '+' : ''}{changeValue.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stats — 5項目均等 */}
            <div className="grid grid-cols-5 gap-4 text-center">
              <div>
                <div className="text-xs text-muted-foreground">Z-Score</div>
                <div className={`text-xl font-bold tabular-nums ${zColor}`}>
                  {data.z_latest >= 0 ? '+' : ''}{data.z_latest.toFixed(3)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">参照期間</div>
                <div className="text-xl font-bold text-foreground">{data.lookback}日</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">PF</div>
                <div className={`text-xl font-bold ${data.full_pf >= 2.5 ? 'text-emerald-400' : data.full_pf >= 2.0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {data.full_pf.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">取引回数</div>
                <div className="text-xl font-bold text-foreground">{data.full_n}回</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">1d回帰率</div>
                <div className="text-xl font-bold text-foreground">{data.revert_1d.toFixed(0)}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Panel 1: Normalized Price Overlay */}
        <div className="rounded-xl border border-border bg-card p-4 md:p-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-medium text-foreground">Normalized Price</h2>
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-0.5 bg-blue-500 inline-block rounded" />
                    <span className="text-muted-foreground">{data.name1}</span>
                    <span className="text-foreground tabular-nums font-medium">{data.series[data.series.length - 1]?.norm1.toFixed(1)}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-0.5 bg-amber-500 inline-block rounded" />
                    <span className="text-muted-foreground">{data.name2}</span>
                    <span className="text-foreground tabular-nums font-medium">{data.series[data.series.length - 1]?.norm2.toFixed(1)}</span>
                  </span>
                </div>
              </div>
            </div>
            <PriceOverlayChart series={data.series} name1={data.name1} name2={data.name2} />
          </div>
        </div>

        {/* Panel 2: Z-Score */}
        <div className="rounded-xl border border-border bg-card p-4 md:p-6">
          <div>
            <div className="flex flex-col gap-2 mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-medium text-foreground">Z-Score</h2>
                  <div className="flex items-center gap-1 ml-1">
                    {[
                      { label: '2Y', d: 500 },
                      { label: '3Y', d: 750 },
                      { label: '5Y', d: 1250 },
                    ].map(opt => (
                      <button key={opt.d} onClick={() => setDays(opt.d)}
                        className={`px-2 py-0.5 text-xs rounded transition-colors ${days === opt.d ? 'bg-primary/20 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-0 border-t border-dashed border-rose-400 inline-block" />
                    <span className="text-muted-foreground">±2.0</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-0 border-t border-dashed border-muted-foreground inline-block" />
                    <span className="text-muted-foreground">0</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-0 border-t border-amber-400/70 inline-block" />
                    <span className="text-muted-foreground">HL(左軸)</span>
                  </span>
                </div>
              </div>
              {zStats && (
                <div className="flex items-center gap-4 text-xs">
                  <span>
                    <span className="text-muted-foreground">z-score </span>
                    <span className={`font-bold tabular-nums ${zColor}`}>{data.z_latest >= 0 ? '+' : ''}{data.z_latest.toFixed(3)}</span>
                    <span className="text-muted-foreground/70 ml-1">:{zStats.lastDate}</span>
                  </span>
                  <span>
                    <span className="text-muted-foreground">最大 </span>
                    <span className="font-bold tabular-nums text-price-down">{zStats.maxZ >= 0 ? '+' : ''}{zStats.maxZ.toFixed(3)}</span>
                    <span className="text-muted-foreground/70 ml-1">:{zStats.maxDate}</span>
                  </span>
                  <span>
                    <span className="text-muted-foreground">最小 </span>
                    <span className="font-bold tabular-nums text-price-up">{zStats.minZ >= 0 ? '+' : ''}{zStats.minZ.toFixed(3)}</span>
                    <span className="text-muted-foreground/70 ml-1">:{zStats.minDate}</span>
                  </span>
                </div>
              )}
            </div>
            <ZScoreChart series={data.series} />
          </div>
        </div>

        {/* Bottom nav */}
        <div className="flex items-center justify-center pt-1">
          <div className="flex items-center gap-2">
            <div className="h-px w-8 bg-border" />
            <Link href="/dev/pairs" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Back to Pairs
            </Link>
            <div className="h-px w-8 bg-border" />
          </div>
        </div>
      </div>
    </main>
  );
}
