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
}
interface PairChartData {
  tk1: string; tk2: string;
  name1: string; name2: string;
  c1: number; c2: number;
  chg1: number; chg2: number;
  chg1_pct: number; chg2_pct: number;
  lookback: number; full_pf: number; full_n: number; half_life: number;
  z_latest: number; direction: string;
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

  useEffect(() => {
    if (!tk1 || !tk2) return;
    setLoading(true);
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
      .then((d: PairChartData) => { setData(d); setLoading(false); })
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
  const [hovered, setHovered] = useState<{ date: string; v1: number; v2: number } | null>(null);

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
        if (!param.time || !param.seriesData?.size) { setHovered(null); return; }
        const t = param.time as BusinessDay;
        const date = `${t.year}/${String(t.month).padStart(2, '0')}/${String(t.day).padStart(2, '0')}`;
        const d1 = param.seriesData.get(s1Ref.current);
        const d2 = param.seriesData.get(s2Ref.current);
        if (d1 && d2) setHovered({ date, v1: (d1 as any).value, v2: (d2 as any).value });
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

  return (
    <div className="relative">
      {hovered && (
        <div className="absolute top-2 left-2 z-10 bg-card/90 backdrop-blur-sm border border-border/30 rounded-lg px-3 py-2 text-xs space-y-0.5 pointer-events-none">
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
  const [hovered, setHovered] = useState<{ date: string; z: number } | null>(null);

  const style = useMemo(() => ({
    paper: isDark ? '#0b0b0c' : '#ffffff',
    text: isDark ? '#e5e7eb' : '#111827',
    grid: isDark ? '#303034' : '#e5e7eb',
    cross: isDark ? '#6b7280' : '#9ca3af',
    zLine: isDark ? '#a78bfa' : '#7c3aed',
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

      chartApi.subscribeCrosshairMove((param) => {
        if (disposed) return;
        if (!param.time || !param.seriesData?.size) { setHovered(null); return; }
        const t = param.time as BusinessDay;
        const date = `${t.year}/${String(t.month).padStart(2, '0')}/${String(t.day).padStart(2, '0')}`;
        const d = param.seriesData.get(zSeriesRef.current);
        if (d) setHovered({ date, z: (d as any).value });
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
  }, [mounted, zData, style]);

  if (!mounted) return <div className="h-[380px] bg-card/50 rounded-2xl animate-pulse" />;

  return (
    <div className="relative">
      {hovered && (
        <div className="absolute top-2 left-2 z-10 bg-card/90 backdrop-blur-sm border border-border/30 rounded-lg px-3 py-2 text-xs pointer-events-none">
          <span className="text-muted-foreground">{hovered.date}</span>
          <span className="ml-2 text-foreground font-medium tabular-nums">
            z = {hovered.z >= 0 ? '+' : ''}{hovered.z.toFixed(3)}
          </span>
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

  if (loading) {
    return (
      <main className="relative min-h-screen">
        <div className="fixed inset-0 -z-10 bg-gradient-to-br from-background via-background to-muted/20" />
        <div className="w-full md:w-[92%] lg:w-[90%] xl:w-[88%] 2xl:w-[86%] mx-auto px-3 md:px-4 py-6 space-y-4">
          <div className="h-8 w-64 bg-muted/30 rounded animate-pulse" />
          <div className="h-[420px] bg-card/50 rounded-2xl animate-pulse" />
          <div className="h-[380px] bg-card/50 rounded-2xl animate-pulse" />
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="relative min-h-screen">
        <div className="fixed inset-0 -z-10 bg-gradient-to-br from-background via-background to-muted/20" />
        <div className="w-full md:w-[92%] lg:w-[90%] xl:w-[88%] 2xl:w-[86%] mx-auto px-3 md:px-4 py-6">
          <div className="rounded-2xl border border-border/40 bg-card/80 p-8 text-center">
            <h1 className="text-xl font-bold mb-2">Error</h1>
            <p className="text-muted-foreground text-sm">{error || 'Data not found'}</p>
            <Link href="/dev/pairs" className="text-primary text-sm mt-4 inline-block hover:underline">Back to Pairs</Link>
          </div>
        </div>
      </main>
    );
  }

  const zColor = Math.abs(data.z_latest) >= 2.0
    ? (data.z_latest > 0 ? 'text-rose-400' : 'text-emerald-400')
    : Math.abs(data.z_latest) >= 1.5 ? 'text-amber-400' : 'text-muted-foreground';

  const dirBadge = data.direction === 'short_tk1'
    ? { label: `SHORT ${data.name1}`, cls: 'bg-rose-500/15 text-rose-400' }
    : { label: `LONG ${data.name1}`, cls: 'bg-emerald-500/15 text-emerald-400' };

  const priceFormatter = new Intl.NumberFormat('ja-JP', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  const pairedStocks = [
    {
      name: data.name1,
      ticker: data.tk1,
      close: data.c1,
      change: data.chg1,
      pct: data.chg1_pct
    },
    {
      name: data.name2,
      ticker: data.tk2,
      close: data.c2,
      change: data.chg2,
      pct: data.chg2_pct
    }
  ];

  const getBadgeTone = (value: number | null | undefined) =>
    value != null && value > 0
      ? 'bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-400/60 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
      : value != null && value < 0
        ? 'bg-rose-500/20 text-rose-300 ring-2 ring-rose-400/60 shadow-[0_0_12px_rgba(251,113,133,0.3)]'
        : 'bg-muted text-muted-foreground ring-1 ring-border/40';

  return (
    <main className="relative min-h-screen leading-[1.8] tracking-[0.02em]">
      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-primary/8 via-primary/3 to-transparent blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/3 -left-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-accent/10 via-accent/4 to-transparent blur-3xl" />
      </div>

      <div className="w-full md:w-[92%] lg:w-[90%] xl:w-[88%] 2xl:w-[86%] mx-auto px-3 md:px-4 py-4 md:py-6 space-y-4">
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
        <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 md:p-6 shadow-xl shadow-black/5 backdrop-blur-xl">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {pairedStocks.map((stock) => {
                const changeValue = Number.isFinite(stock.change) ? stock.change : 0;
                const pctValue = Number.isFinite(stock.pct) ? stock.pct : 0;
                const changeTone = getBadgeTone(changeValue);

                return (
                  <div
                    key={stock.ticker}
                    className="flex items-start justify-between gap-4 rounded-xl border border-border/30 bg-card/60 p-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="truncate text-xl font-bold leading-tight tracking-tight">
                          {stock.name}
                        </h2>
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

            {/* Z-score + direction */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Z-Score</div>
                <div className={`text-2xl md:text-3xl font-bold tabular-nums ${zColor}`}>
                  {data.z_latest >= 0 ? '+' : ''}{data.z_latest.toFixed(3)}
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${dirBadge.cls}`}>
                {dirBadge.label}
              </span>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-4 pt-4 border-t border-border/30 grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-xs text-muted-foreground">参照期間</div>
              <div className="text-sm md:text-base font-medium text-foreground">{data.lookback}日</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">PF</div>
              <div className={`text-sm md:text-base font-medium ${data.full_pf >= 2.5 ? 'text-emerald-400' : data.full_pf >= 2.0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                {data.full_pf.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">取引回数</div>
              <div className="text-sm md:text-base font-medium text-foreground">{data.full_n}回</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">半減期</div>
              <div className="text-sm md:text-base font-medium text-foreground">{data.half_life.toFixed(0)}日</div>
            </div>
          </div>
        </div>

        {/* Panel 1: Normalized Price Overlay */}
        <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 md:p-6 shadow-xl shadow-black/5 backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />
          <div className="relative">
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
        <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 md:p-6 shadow-xl shadow-black/5 backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-medium text-foreground">Z-Score</h2>
                <span className={`text-sm font-bold tabular-nums ${zColor}`}>
                  {data.z_latest >= 0 ? '+' : ''}{data.z_latest.toFixed(3)}
                </span>
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
              </div>
            </div>
            <ZScoreChart series={data.series} />
          </div>
        </div>

        {/* Bottom nav */}
        <div className="flex items-center justify-center pt-1">
          <div className="flex items-center gap-2">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-border/40" />
            <Link href="/dev/pairs" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Back to Pairs
            </Link>
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-border/40" />
          </div>
        </div>
      </div>
    </main>
  );
}
