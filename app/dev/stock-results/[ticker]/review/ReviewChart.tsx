// app/dev/stock-results/[ticker]/review/ReviewChart.tsx
"use client";

import React, { useEffect, useRef, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import type {
  IChartApi,
  ISeriesApi,
  Time,
  CandlestickData as LwcCandleData,
  UTCTimestamp,
} from "lightweight-charts";
import { toUtcSeconds } from "@/app/[ticker]/lib/chart-helpers";

export type PriceRow = {
  date: string;
  Open: number;
  High: number;
  Low: number;
  Close: number;
  Volume?: number | null;
};

export type Signal = {
  time: string;
  type: "entry" | "exit";
  price: number;
  rsi: number;
};

interface ReviewChartProps {
  data: PriceRow[];
  rsiValues: (number | null)[];
  signals: Signal[];
}

const dfTimeOnly = new Intl.DateTimeFormat("ja-JP", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Tokyo",
});

function formatTickMark(time: number): string {
  const d = new Date(time * 1000);
  return dfTimeOnly.format(d);
}

export default function ReviewChart({ data, rsiValues, signals }: ReviewChartProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = resolvedTheme === "dark";

  const priceChartRef = useRef<HTMLDivElement>(null);
  const rsiChartRef = useRef<HTMLDivElement>(null);
  const volumeChartRef = useRef<HTMLDivElement>(null);

  const priceChartApi = useRef<IChartApi | null>(null);
  const rsiChartApi = useRef<IChartApi | null>(null);
  const volumeChartApi = useRef<IChartApi | null>(null);

  const candleSeries = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const rsiSeries = useRef<ISeriesApi<"Line"> | null>(null);
  const volumeSeries = useRef<ISeriesApi<"Histogram"> | null>(null);

  const style = useMemo(() => {
    const paper = isDark ? "#0b0b0c" : "#ffffff";
    const text = isDark ? "#e5e7eb" : "#111827";
    const grid = isDark ? "#303034" : "#e5e7eb";
    const up = isDark ? "#22c55e" : "#16a34a";
    const down = isDark ? "#ef4444" : "#dc2626";
    return { paper, text, grid, up, down };
  }, [isDark]);

  const candleData = useMemo<LwcCandleData<Time>[]>(() => {
    return data
      .filter((r) => r.Open != null && r.High != null && r.Low != null && r.Close != null)
      .map((r) => ({
        time: toUtcSeconds(r.date) as Time,
        open: r.Open,
        high: r.High,
        low: r.Low,
        close: r.Close,
      }));
  }, [data]);

  const rsiData = useMemo(() => {
    return data
      .map((r, i) => ({
        time: toUtcSeconds(r.date) as Time,
        value: rsiValues[i],
      }))
      .filter((d) => d.value != null) as { time: Time; value: number }[];
  }, [data, rsiValues]);

  const volumeData = useMemo(() => {
    return data
      .filter((r) => r.Volume != null && r.Volume > 0)
      .map((r) => ({
        time: toUtcSeconds(r.date) as Time,
        value: r.Volume!,
        color: r.Close >= r.Open ? style.up + "80" : style.down + "80",
      }));
  }, [data, style.up, style.down]);

  // Entry/Exit markers
  const entryMarkers = useMemo(() => {
    return signals
      .filter((s) => s.type === "entry")
      .map((s) => ({
        time: toUtcSeconds(s.time) as Time,
        position: "aboveBar" as const,
        color: "#ff6b6b",
        shape: "arrowDown" as const,
        text: `E ${s.price.toFixed(0)}`,
      }));
  }, [signals]);

  const exitMarkers = useMemo(() => {
    return signals
      .filter((s) => s.type === "exit")
      .map((s) => ({
        time: toUtcSeconds(s.time) as Time,
        position: "belowBar" as const,
        color: "#4ecdc4",
        shape: "arrowUp" as const,
        text: `X ${s.price.toFixed(0)}`,
      }));
  }, [signals]);

  useEffect(() => {
    if (!mounted) return;

    let disposed = false;

    const setup = async () => {
      const { createChart, ColorType, CandlestickSeries, LineSeries, HistogramSeries } = await import(
        "lightweight-charts"
      );

      if (disposed) return;

      const commonOptions = {
        layout: {
          background: { type: ColorType.Solid, color: style.paper },
          textColor: style.text,
        },
        grid: {
          vertLines: { color: style.grid },
          horzLines: { color: style.grid },
        },
        timeScale: {
          borderColor: style.grid,
          timeVisible: true,
          secondsVisible: false,
          tickMarkFormatter: (time: UTCTimestamp) => formatTickMark(time as number),
        },
        localization: {
          timeFormatter: (time: UTCTimestamp) => formatTickMark(time as number),
        },
        crosshair: {
          mode: 0,
        },
      };

      // Price chart
      if (priceChartRef.current && !priceChartApi.current) {
        const chart = createChart(priceChartRef.current, {
          ...commonOptions,
          width: priceChartRef.current.clientWidth,
          height: 320,
          rightPriceScale: {
            borderColor: style.grid,
          },
        });
        priceChartApi.current = chart;

        const series = chart.addSeries(CandlestickSeries, {
          upColor: style.up,
          downColor: style.down,
          borderUpColor: style.up,
          borderDownColor: style.down,
          wickUpColor: style.up,
          wickDownColor: style.down,
        });
        candleSeries.current = series;
      }

      // RSI chart
      if (rsiChartRef.current && !rsiChartApi.current) {
        const chart = createChart(rsiChartRef.current, {
          ...commonOptions,
          width: rsiChartRef.current.clientWidth,
          height: 140,
          rightPriceScale: {
            borderColor: style.grid,
            scaleMargins: { top: 0.1, bottom: 0.1 },
          },
        });
        rsiChartApi.current = chart;

        const series = chart.addSeries(LineSeries, {
          color: "#ffd93d",
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
        });
        rsiSeries.current = series;

        // RSI levels: 80, 70, 30
        series.createPriceLine({
          price: 80,
          color: "#ff6b6b",
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: "",
        });
        series.createPriceLine({
          price: 70,
          color: style.down,
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: "",
        });
        series.createPriceLine({
          price: 30,
          color: style.up,
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: "",
        });
      }

      // Volume chart
      if (volumeChartRef.current && !volumeChartApi.current) {
        const chart = createChart(volumeChartRef.current, {
          ...commonOptions,
          width: volumeChartRef.current.clientWidth,
          height: 100,
          rightPriceScale: {
            borderColor: style.grid,
          },
        });
        volumeChartApi.current = chart;

        const series = chart.addSeries(HistogramSeries, {
          priceFormat: { type: "volume" },
        });
        volumeSeries.current = series;
      }

      // Sync time scales
      const charts = [priceChartApi.current, rsiChartApi.current, volumeChartApi.current].filter(Boolean) as IChartApi[];
      charts.forEach((chart, i) => {
        chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
          if (range) {
            charts.forEach((otherChart, j) => {
              if (i !== j) {
                otherChart.timeScale().setVisibleLogicalRange(range);
              }
            });
          }
        });
      });

      // Resize observer
      const ro = new ResizeObserver(() => {
        if (priceChartRef.current && priceChartApi.current) {
          priceChartApi.current.applyOptions({ width: priceChartRef.current.clientWidth });
        }
        if (rsiChartRef.current && rsiChartApi.current) {
          rsiChartApi.current.applyOptions({ width: rsiChartRef.current.clientWidth });
        }
        if (volumeChartRef.current && volumeChartApi.current) {
          volumeChartApi.current.applyOptions({ width: volumeChartRef.current.clientWidth });
        }
      });

      if (priceChartRef.current) ro.observe(priceChartRef.current);

      return () => {
        ro.disconnect();
      };
    };

    setup();

    return () => {
      disposed = true;
      priceChartApi.current?.remove();
      rsiChartApi.current?.remove();
      volumeChartApi.current?.remove();
      priceChartApi.current = null;
      rsiChartApi.current = null;
      volumeChartApi.current = null;
      candleSeries.current = null;
      rsiSeries.current = null;
      volumeSeries.current = null;
    };
  }, [mounted, style]);

  // Update data
  useEffect(() => {
    if (candleSeries.current && candleData.length > 0) {
      candleSeries.current.setData(candleData);
      // Add markers
      const allMarkers = [...entryMarkers, ...exitMarkers].sort(
        (a, b) => (a.time as number) - (b.time as number)
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (candleSeries.current as any).setMarkers(allMarkers);
    }
    if (rsiSeries.current && rsiData.length > 0) {
      rsiSeries.current.setData(rsiData);
    }
    if (volumeSeries.current && volumeData.length > 0) {
      volumeSeries.current.setData(volumeData);
    }

    // Fit content
    [priceChartApi.current, rsiChartApi.current, volumeChartApi.current].forEach((chart) => {
      chart?.timeScale().fitContent();
    });
  }, [candleData, rsiData, volumeData, entryMarkers, exitMarkers]);

  if (!mounted) {
    return (
      <div className="animate-pulse">
        <div className="h-[320px] bg-muted/30 rounded-lg mb-2" />
        <div className="h-[140px] bg-muted/30 rounded-lg mb-2" />
        <div className="h-[100px] bg-muted/30 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Price Chart */}
      <div className="relative">
        <div className="absolute top-2 left-2 text-xs text-muted-foreground font-medium z-10">
          5分足
        </div>
        <div ref={priceChartRef} className="w-full rounded-lg overflow-hidden" />
      </div>

      {/* RSI Chart */}
      <div className="relative">
        <div className="absolute top-2 left-2 text-xs text-muted-foreground font-medium z-10">
          RSI(9)
        </div>
        <div ref={rsiChartRef} className="w-full rounded-lg overflow-hidden" />
      </div>

      {/* Volume Chart */}
      <div className="relative">
        <div className="absolute top-2 left-2 text-xs text-muted-foreground font-medium z-10">
          出来高
        </div>
        <div ref={volumeChartRef} className="w-full rounded-lg overflow-hidden" />
      </div>
    </div>
  );
}
