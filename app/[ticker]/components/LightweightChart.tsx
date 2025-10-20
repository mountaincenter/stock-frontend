// app/[ticker]/components/LightweightChart.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import type {
  IChartApi,
  ISeriesApi,
  Time,
  CandlestickData as LwcCandleData,
  MouseEventParams,
  UTCTimestamp,
  BusinessDay,
  TickMarkType,
} from "lightweight-charts";
import {
  toUtcSeconds,
  formatLwcTime,
  formatTickLabel,
} from "../lib/chart-helpers";
import type { RangeKey } from "../config/chartRangeConfig";
import ChartTooltip, { type TooltipData } from "./ChartTooltip";
import { calculateSMA, calculateBollingerBands } from "../lib/indicators";

type PriceRow = {
  date: string;
  Open: number;
  High: number;
  Low: number;
  Close: number;
  Volume?: number | null;
};

export interface ChartOptions {
  showMA5: boolean;
  showMA25: boolean;
  showMA75: boolean;
  showBollinger: boolean;
  showVolume: boolean;
}

interface LightweightChartProps {
  rows: PriceRow[];
  rangeKey?: RangeKey;
  options?: ChartOptions;
}

export default function LightweightChart({
  rows,
  rangeKey,
  options,
}: LightweightChartProps) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = (resolvedTheme ?? theme) === "dark";

  const style = useMemo(() => {
    const paper = isDark ? "#0b0b0c" : "#ffffff";
    const text = isDark ? "#e5e7eb" : "#111827";
    const grid = isDark ? "#303034" : "#e5e7eb";
    // Material Design colors matching root page: green-600/green-500, red-600/red-500
    const up = isDark ? "#22c55e" : "#16a34a";
    const down = isDark ? "#ef4444" : "#dc2626";
    const cross = isDark ? "#6b7280" : "#9ca3af";
    return { paper, text, grid, up, down, cross };
  }, [isDark]);

  const candleData = useMemo<LwcCandleData<Time>[]>(() => {
    const map = new Map<string, LwcCandleData<Time>>();
    rows.forEach((r) => {
      // Skip rows with null OHLC data
      if (r.Open == null || r.High == null || r.Low == null || r.Close == null) {
        return;
      }

      const value = (() => {
        if (r.date.length <= 10) {
          const [y, m, d] = r.date.split("-").map((v) => Number(v));
          const time: BusinessDay = { year: y, month: m, day: d };
          return {
            key: `${y}-${m}-${d}`,
            data: {
              time: time as Time,
              open: r.Open,
              high: r.High,
              low: r.Low,
              close: r.Close,
            } satisfies LwcCandleData<Time>,
          };
        }
        const ts = toUtcSeconds(r.date);
        return {
          key: String(ts),
          data: {
            time: ts as Time,
            open: r.Open,
            high: r.High,
            low: r.Low,
            close: r.Close,
          } satisfies LwcCandleData<Time>,
        };
      })();
      map.set(value.key, value.data);
    });
    const resolve = (time: Time): number => {
      if (typeof time === "number") return time;
      if (typeof time === "string") return toUtcSeconds(time);
      return Date.UTC(time.year, time.month - 1, time.day) / 1000;
    };
    return Array.from(map.values()).sort(
      (a, b) => resolve(a.time) - resolve(b.time)
    );
  }, [rows]);

  // Calculate technical indicators
  const indicators = useMemo(() => {
    const closePrices = candleData.map((d) => d.close);

    const ma5 = calculateSMA(closePrices, 5);
    const ma25 = calculateSMA(closePrices, 25);
    const ma75 = calculateSMA(closePrices, 75);
    const bollinger = calculateBollingerBands(closePrices, 20, 2);

    return {
      ma5: candleData.map((d, i) => ({ time: d.time, value: ma5[i] ?? 0 })).filter((d) => d.value !== 0),
      ma25: candleData.map((d, i) => ({ time: d.time, value: ma25[i] ?? 0 })).filter((d) => d.value !== 0),
      ma75: candleData.map((d, i) => ({ time: d.time, value: ma75[i] ?? 0 })).filter((d) => d.value !== 0),
      bollingerUpper: candleData.map((d, i) => ({ time: d.time, value: bollinger.upper[i] ?? 0 })).filter((d) => d.value !== 0),
      bollingerMiddle: candleData.map((d, i) => ({ time: d.time, value: bollinger.middle[i] ?? 0 })).filter((d) => d.value !== 0),
      bollingerLower: candleData.map((d, i) => ({ time: d.time, value: bollinger.lower[i] ?? 0 })).filter((d) => d.value !== 0),
    };
  }, [candleData]);

  // Volume data
  const volumeData = useMemo(() => {
    return rows
      .filter((r) => r.Volume != null && r.Volume > 0)
      .map((r) => {
        if (r.date.length <= 10) {
          const [y, m, d] = r.date.split("-").map(Number);
          const time: BusinessDay = { year: y, month: m, day: d };
          return {
            time: time as Time,
            value: r.Volume!,
            color: r.Close >= r.Open ? style.up : style.down,
          };
        }
        const ts = toUtcSeconds(r.date);
        return {
          time: ts as Time,
          value: r.Volume!,
          color: r.Close >= r.Open ? style.up : style.down,
        };
      });
  }, [rows, style.up, style.down]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  useEffect(() => {
    if (!mounted) return;
    let chart: IChartApi | undefined;
    let series: ISeriesApi<"Candlestick"> | undefined;
    let ro: ResizeObserver | undefined;
    let disposed = false;

    const setup = async () => {
      const { createChart, ColorType, CandlestickSeries, LineSeries, HistogramSeries } = await import(
        "lightweight-charts"
      );
      if (disposed) return;
      const el = containerRef.current;
      if (!el) return;

      const chartApi = createChart(el, {
        layout: {
          background: { type: ColorType.Solid, color: style.paper },
          textColor: style.text,
        },
        width: el.clientWidth,
        height: options?.showVolume ? 620 : 520,
        grid: {
          vertLines: { color: style.grid },
          horzLines: { color: style.grid },
        },
        timeScale: {
          borderColor: style.grid,
          timeVisible: true,
          secondsVisible: false,
          tickMarkFormatter: (time: Time, tickMarkType: TickMarkType) =>
            formatTickLabel(time, tickMarkType, rangeKey),
        },
        rightPriceScale: {
          borderColor: style.grid,
          scaleMargins: options?.showVolume ? { top: 0.1, bottom: 0.3 } : { top: 0.1, bottom: 0.1 },
        },
        crosshair: {
          vertLine: { color: style.cross },
          horzLine: { color: style.cross },
        },
        localization: {
          locale: "ja-JP",
          priceFormatter: (p: number) => Math.round(p).toString(),
          timeFormatter: (t: UTCTimestamp | BusinessDay) => formatLwcTime(t),
        },
        handleScroll: {
          mouseWheel: false,
          pressedMouseMove: false,
          horzTouchDrag: false,
          vertTouchDrag: false,
        },
        handleScale: {
          mouseWheel: false,
          pinch: false,
          axisPressedMouseMove: false,
          axisDoubleClickReset: false,
        },
      });

      chart = chartApi;

      // Volume histogram FIRST (so it's on bottom layer)
      if (options?.showVolume && volumeData.length > 0) {
        const volumeSeries = chartApi.addSeries(HistogramSeries, {
          color: "#26a69a",
          priceFormat: {
            type: "volume",
          },
          priceScaleId: "", // Empty string uses a separate left scale
        });

        volumeSeries.priceScale().applyOptions({
          scaleMargins: {
            top: 0.75,
            bottom: 0,
          },
        });

        volumeSeries.setData(volumeData);
      }

      // Candlestick series (on top of volume)
      const candlestickSeries = chartApi.addSeries(CandlestickSeries, {
        upColor: style.up,
        downColor: style.down,
        borderUpColor: style.up,
        borderDownColor: style.down,
        wickUpColor: style.up,
        wickDownColor: style.down,
        priceLineVisible: true,
        lastValueVisible: true,
      });

      series = candlestickSeries;
      candlestickSeries.setData(candleData);

      // Moving averages (on top of candlesticks)
      if (options?.showMA5) {
        const ma5Series = chartApi.addSeries(LineSeries, {
          color: isDark ? "#eab308" : "#ca8a04",
          lineWidth: 2,
          priceLineVisible: true,
          lastValueVisible: true,
          crosshairMarkerVisible: false,
          title: "MA5",
        });
        ma5Series.setData(indicators.ma5);
      }

      if (options?.showMA25) {
        const ma25Series = chartApi.addSeries(LineSeries, {
          color: isDark ? "#3b82f6" : "#2563eb",
          lineWidth: 2,
          priceLineVisible: true,
          lastValueVisible: true,
          crosshairMarkerVisible: false,
          title: "MA25",
        });
        ma25Series.setData(indicators.ma25);
      }

      if (options?.showMA75) {
        const ma75Series = chartApi.addSeries(LineSeries, {
          color: isDark ? "#a855f7" : "#9333ea",
          lineWidth: 2,
          priceLineVisible: true,
          lastValueVisible: true,
          crosshairMarkerVisible: false,
          title: "MA75",
        });
        ma75Series.setData(indicators.ma75);
      }

      // Bollinger Bands (on top)
      if (options?.showBollinger) {
        const bollingerColor = isDark ? "#06b6d4" : "#0891b2";

        const upperSeries = chartApi.addSeries(LineSeries, {
          color: bollingerColor,
          lineWidth: 1,
          lineStyle: 2, // Dashed
          priceLineVisible: true,
          lastValueVisible: true,
          crosshairMarkerVisible: false,
          title: "BB Upper",
        });
        upperSeries.setData(indicators.bollingerUpper);

        const middleSeries = chartApi.addSeries(LineSeries, {
          color: bollingerColor,
          lineWidth: 1,
          priceLineVisible: true,
          lastValueVisible: true,
          crosshairMarkerVisible: false,
          title: "BB Middle",
        });
        middleSeries.setData(indicators.bollingerMiddle);

        const lowerSeries = chartApi.addSeries(LineSeries, {
          color: bollingerColor,
          lineWidth: 1,
          lineStyle: 2, // Dashed
          priceLineVisible: true,
          lastValueVisible: true,
          crosshairMarkerVisible: false,
          title: "BB Lower",
        });
        lowerSeries.setData(indicators.bollingerLower);
      }

      const crosshairHandler = (param: MouseEventParams<Time>) => {
        const activeSeries = series;
        if (
          !param.time ||
          !param.point ||
          !activeSeries ||
          !param.seriesData.has(activeSeries)
        ) {
          setTooltip(null);
          return;
        }
        const data = param.seriesData.get(activeSeries) as LwcCandleData<Time>;
        setTooltip({
          visible: true,
          x: param.point.x,
          y: param.point.y,
          time: formatLwcTime(param.time as UTCTimestamp | BusinessDay),
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
        });
      };

      chartApi.subscribeCrosshairMove(crosshairHandler);

      ro = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry || !chartApi) return;
        chartApi.applyOptions({ width: Math.floor(entry.contentRect.width) });
      });
      ro.observe(el);

      chartApi.timeScale().fitContent();

      return () => {
        chartApi.unsubscribeCrosshairMove(crosshairHandler);
      };
    };

    let cleanupCrosshair: (() => void) | undefined;
    setup().then((cleanup) => {
      cleanupCrosshair = cleanup;
    });

    return () => {
      disposed = true;
      cleanupCrosshair?.();
      ro?.disconnect();
      chart?.remove();
    };
  });

  return (
    <div className="relative">
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: options?.showVolume ? 620 : 520
        }}
      />
      <ChartTooltip tooltip={tooltip} />
    </div>
  );
}
