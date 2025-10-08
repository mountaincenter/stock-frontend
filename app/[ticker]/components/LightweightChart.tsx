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

type PriceRow = {
  date: string;
  Open: number;
  High: number;
  Low: number;
  Close: number;
};

interface LightweightChartProps {
  rows: PriceRow[];
  rangeKey?: RangeKey;
}

export default function LightweightChart({
  rows,
  rangeKey,
}: LightweightChartProps) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = (resolvedTheme ?? theme) === "dark";

  const style = useMemo(() => {
    const paper = isDark ? "#0b0b0c" : "#ffffff";
    const text = isDark ? "#e5e7eb" : "#111827";
    const grid = isDark ? "#303034" : "#e5e7eb";
    const up = isDark ? "#34d399" : "#059669";
    const down = isDark ? "#f87171" : "#dc2626";
    const cross = isDark ? "#6b7280" : "#9ca3af";
    return { paper, text, grid, up, down, cross };
  }, [isDark]);

  const candleData = useMemo<LwcCandleData<Time>[]>(() => {
    const map = new Map<string, LwcCandleData<Time>>();
    rows.forEach((r) => {
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

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  useEffect(() => {
    if (!mounted) return;
    let chart: IChartApi | undefined;
    let series: ISeriesApi<"Candlestick"> | undefined;
    let ro: ResizeObserver | undefined;
    let disposed = false;

    const setup = async () => {
      const { createChart, ColorType, CandlestickSeries } = await import(
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
        height: 520,
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
        rightPriceScale: { borderColor: style.grid },
        crosshair: {
          vertLine: { color: style.cross },
          horzLine: { color: style.cross },
        },
        localization: {
          locale: "ja-JP",
          priceFormatter: (p: number) =>
            new Intl.NumberFormat("ja-JP", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 6,
            }).format(p),
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

      const candlestickSeries = chartApi.addSeries(CandlestickSeries, {
        upColor: style.up,
        downColor: style.down,
        borderUpColor: style.up,
        borderDownColor: style.down,
        wickUpColor: style.up,
        wickDownColor: style.down,
        priceLineVisible: true,
      });

      series = candlestickSeries;

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

      candlestickSeries.setData(candleData);
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
        className="border rounded-xl p-3 bg-background"
        style={{ width: "100%", height: 520 }}
      />
      <ChartTooltip tooltip={tooltip} />
    </div>
  );
}
