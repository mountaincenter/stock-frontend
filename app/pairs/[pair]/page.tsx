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
function usePairChartData(tk1: string, tk2: string) {
  const [data, setData] = useState<PairChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tk1 || !tk2) return;
    setLoading(true);
    setError(null);

    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
    const url = `${apiBase}/api/dev/pairs/chart?tk1=${encodeURIComponent(tk1)}&tk2=${encodeURIComponent(tk2)}&days=500`;

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
  }, [tk1, tk2]);

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
        height: 320,
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

      // Series 1 (tk1)
      const s1 = chartApi.addSeries(LineSeries, {
        color: style.line1, lineWidth: 2,
        priceLineVisible: false, lastValueVisible: true,
        crosshairMarkerVisible: true, title: name1,
      });
      s1.setData(series.map(p => ({ time: toBusinessDay(p.date) as Time, value: p.norm1 })));

      // Series 2 (tk2)
      const s2 = chartApi.addSeries(LineSeries, {
        color: style.line2, lineWidth: 2,
        priceLineVisible: false, lastValueVisible: true,
        crosshairMarkerVisible: true, title: name2,
      });
      s2.setData(series.map(p => ({ time: toBusinessDay(p.date) as Time, value: p.norm2 })));

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

  if (!mounted) return <div className="h-[320px] bg-card/50 rounded-2xl animate-pulse" />;

  return <div ref={containerRef} className="w-full h-[320px]" />;
}

// === Z-Score Chart (Panel 2) ===
function ZScoreChart({ series }: { series: SeriesPoint[] }) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = (resolvedTheme ?? theme) === 'dark';

  const containerRef = useRef<HTMLDivElement | null>(null);

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
        height: 240,
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

      // Z-score line
      const zSeries = chartApi.addSeries(LineSeries, {
        color: style.zLine, lineWidth: 2,
        priceLineVisible: false, lastValueVisible: true,
        crosshairMarkerVisible: true, title: 'Z-Score',
      });
      zSeries.setData(zData);

      // Band: +2.0 (entry short)
      const bandData = (val: number) => zData.map(p => ({ time: p.time, value: val }));

      const plus2 = chartApi.addSeries(LineSeries, {
        color: style.entryHigh, lineWidth: 1, lineStyle: 2, // Dashed
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, title: '',
      });
      plus2.setData(bandData(2.0));

      const minus2 = chartApi.addSeries(LineSeries, {
        color: style.entryLow, lineWidth: 1, lineStyle: 2, // Dashed
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, title: '',
      });
      minus2.setData(bandData(-2.0));

      // Zero line (mean reversion target)
      const zeroLine = chartApi.addSeries(LineSeries, {
        color: style.zero, lineWidth: 1, lineStyle: 2, // Dashed
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, title: '',
      });
      zeroLine.setData(bandData(0));

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

  if (!mounted) return <div className="h-[240px] bg-card/50 rounded-2xl animate-pulse" />;

  return <div ref={containerRef} className="w-full h-[240px]" />;
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
  const { data, loading, error } = usePairChartData(tk1, tk2);

  if (loading) {
    return (
      <main className="relative min-h-screen">
        <div className="fixed inset-0 -z-10 bg-gradient-to-br from-background via-background to-muted/20" />
        <div className="w-full md:w-[92%] lg:w-[90%] xl:w-[88%] 2xl:w-[86%] mx-auto px-3 md:px-4 py-6 space-y-4">
          <div className="h-8 w-64 bg-muted/30 rounded animate-pulse" />
          <div className="h-[320px] bg-card/50 rounded-2xl animate-pulse" />
          <div className="h-[240px] bg-card/50 rounded-2xl animate-pulse" />
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Pair names + prices */}
            <div className="space-y-1.5">
              <div className="flex items-baseline gap-3">
                <div>
                  <span className="text-blue-400 font-bold text-base md:text-lg">{data.name1}</span>
                  <span className="text-muted-foreground text-xs ml-1.5">{data.tk1}</span>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  ¥{data.c1.toLocaleString('ja-JP')}
                  <span className={data.chg1 >= 0 ? 'text-emerald-400 ml-1' : 'text-rose-400 ml-1'}>
                    {data.chg1 >= 0 ? '+' : ''}{data.chg1.toFixed(1)} ({data.chg1_pct >= 0 ? '+' : ''}{data.chg1_pct.toFixed(2)}%)
                  </span>
                </span>
              </div>
              <div className="flex items-baseline gap-3">
                <div>
                  <span className="text-amber-400 font-bold text-base md:text-lg">{data.name2}</span>
                  <span className="text-muted-foreground text-xs ml-1.5">{data.tk2}</span>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  ¥{data.c2.toLocaleString('ja-JP')}
                  <span className={data.chg2 >= 0 ? 'text-emerald-400 ml-1' : 'text-rose-400 ml-1'}>
                    {data.chg2 >= 0 ? '+' : ''}{data.chg2.toFixed(1)} ({data.chg2_pct >= 0 ? '+' : ''}{data.chg2_pct.toFixed(2)}%)
                  </span>
                </span>
              </div>
            </div>

            {/* Z-score + direction */}
            <div className="flex items-center gap-4">
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
          <div className="mt-4 pt-4 border-t border-border/30 grid grid-cols-4 gap-4 text-center text-sm md:text-base">
            <div>
              <div className="text-xs text-muted-foreground">Lookback</div>
              <div className="font-medium text-foreground">{data.lookback}d</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">PF</div>
              <div className={`font-medium ${data.full_pf >= 2.5 ? 'text-emerald-400' : data.full_pf >= 2.0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                {data.full_pf.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Trades</div>
              <div className="font-medium text-foreground">{data.full_n}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Half-Life</div>
              <div className="font-medium text-foreground">{data.half_life.toFixed(0)}d</div>
            </div>
          </div>
        </div>

        {/* Panel 1: Normalized Price Overlay */}
        <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 md:p-6 shadow-xl shadow-black/5 backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-foreground">Normalized Price (base=100)</h2>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-blue-500 inline-block rounded" />
                  <span className="text-muted-foreground">{data.name1}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-amber-500 inline-block rounded" />
                  <span className="text-muted-foreground">{data.name2}</span>
                </span>
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
              <h2 className="text-sm font-medium text-foreground">Z-Score</h2>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-6 h-0 border-t border-dashed border-rose-400 inline-block" />
                  <span className="text-muted-foreground">+2.0 Entry</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-6 h-0 border-t border-dashed border-emerald-400 inline-block" />
                  <span className="text-muted-foreground">-2.0 Entry</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-6 h-0 border-t border-dashed border-muted-foreground inline-block" />
                  <span className="text-muted-foreground">0 Target</span>
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
