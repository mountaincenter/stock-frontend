// app/[ticker]/components/price_card/MiniSparkline.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import type {
  IChartApi,
  Time,
  LineData,
  UTCTimestamp,
  BusinessDay,
  MouseEventParams,
  TickMarkType,
} from "lightweight-charts";
import { toUtcSeconds, formatLwcTime, formatTickLabel } from "../../lib/chart-helpers";

export type PeriodKey = "1d" | "5d" | "1mo" | "1y";

export interface MiniChartData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface MiniSparklineProps {
  data: MiniChartData[];
  periodKey: PeriodKey;
  currentPrice: number | null;
  percentChange: number | null;
  prevClose: number | null;
}

function convertToLwcTime(dateStr: string): Time {
  // Date format: YYYY-MM-DD or YYYY-MM-DD HH:MM:SS
  if (dateStr.length <= 10 && dateStr.includes("-")) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return { year: y, month: m, day: d } as BusinessDay;
  }
  // Timestamp for intraday data
  return toUtcSeconds(dateStr) as UTCTimestamp;
}

export default function MiniSparkline({
  data,
  periodKey,
  prevClose,
}: MiniSparklineProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | undefined>(undefined);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
  } | null>(null);

  // Create a map for quick OHLC lookup
  const dataMap = useRef<Map<number, MiniChartData>>(new Map());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !containerRef.current || data.length === 0) return;

    let disposed = false;

    // Build dataMap for OHLC lookup
    dataMap.current = new Map();
    data.forEach((d) => {
      const time = convertToLwcTime(d.date);
      const timeKey = typeof time === "number"
        ? time
        : typeof time === "string"
        ? toUtcSeconds(time)
        : Date.UTC(time.year, time.month - 1, time.day) / 1000;
      dataMap.current.set(timeKey, d);
    });

    const initChart = async () => {
      const { createChart, ColorType, AreaSeries, LineSeries } = await import("lightweight-charts");
      if (disposed || !containerRef.current) return;

      const isDark = resolvedTheme === "dark";

      // Simple colors matching text color
      const lineColor = isDark ? "#e5e7eb" : "#374151";
      const gradientTopColor = isDark
        ? "rgba(229, 231, 235, 0.25)"
        : "rgba(55, 65, 81, 0.20)";
      const gradientBottomColor = isDark
        ? "rgba(229, 231, 235, 0.02)"
        : "rgba(55, 65, 81, 0.02)";

      // Create chart
      const chart = createChart(containerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: isDark ? "#9ca3af" : "#6b7280",
        },
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight || 220,
        grid: {
          vertLines: { visible: false },
          horzLines: { visible: false },
        },
        timeScale: {
          visible: true,
          borderVisible: false,
          timeVisible: periodKey === "1d" || periodKey === "5d" || periodKey === "1mo",
          secondsVisible: false,
          tickMarkFormatter: (time: Time, tickMarkType: TickMarkType) => {
            const rangeKeyMap: Record<PeriodKey, string> = {
              "1d": "r_5d",
              "5d": "r_1mo",
              "1mo": "r_3mo",
              "1y": "r_1y",
            };
            return formatTickLabel(time, tickMarkType, rangeKeyMap[periodKey] as "r_5d" | "r_1mo" | "r_3mo" | "r_1y");
          },
        },
        rightPriceScale: {
          visible: true,
          borderVisible: false,
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
        },
        localization: {
          locale: "ja-JP",
          priceFormatter: (price: number) => Math.round(price).toString(),
          timeFormatter: (t: UTCTimestamp | BusinessDay) => formatLwcTime(t),
        },
        leftPriceScale: {
          visible: false,
          borderVisible: false,
        },
        crosshair: {
          vertLine: {
            visible: true,
            color: isDark ? "#4b5563" : "#d1d5db",
            width: 1,
            style: 2,
            labelVisible: false,
          },
          horzLine: {
            visible: true,
            color: isDark ? "#4b5563" : "#d1d5db",
            width: 1,
            style: 2,
            labelVisible: false,
          },
        },
        handleScroll: {
          mouseWheel: false,
          pressedMouseMove: false,
        },
        handleScale: {
          mouseWheel: false,
          pinch: false,
        },
      });

      chartRef.current = chart;

      // Add area series (line chart with gradient)
      const areaSeries = chart.addSeries(AreaSeries, {
        lineColor: lineColor,
        lineWidth: 2,
        topColor: gradientTopColor,
        bottomColor: gradientBottomColor,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
      });

      // Transform data to line data (using Close price)
      const lineData: LineData<Time>[] = data
        .map((d) => ({
          time: convertToLwcTime(d.date),
          value: d.close,
        }))
        .sort((a, b) => {
          const resolveTime = (t: Time): number => {
            if (typeof t === "number") return t;
            if (typeof t === "string") return toUtcSeconds(t);
            return Date.UTC(t.year, t.month - 1, t.day) / 1000;
          };
          return resolveTime(a.time) - resolveTime(b.time);
        });

      areaSeries.setData(lineData);
      chart.timeScale().fitContent();

      // Add previous close line if available
      if (prevClose !== null && prevClose > 0) {
        const prevCloseLine = chart.addSeries(LineSeries, {
          color: isDark ? "#6b7280" : "#9ca3af",
          lineWidth: 2,
          lineStyle: 0, // Solid
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });

        const prevCloseData = lineData.map((d) => ({
          time: d.time,
          value: prevClose,
        }));

        prevCloseLine.setData(prevCloseData);
      }

      // Crosshair handler for tooltip with OHLC data
      const crosshairHandler = (param: MouseEventParams<Time>) => {
        if (
          !param.time ||
          !param.point ||
          !param.seriesData.has(areaSeries)
        ) {
          setTooltip(null);
          return;
        }

        // Get the time and look up OHLC data
        const timeKey = typeof param.time === "number"
          ? param.time
          : typeof param.time === "string"
          ? toUtcSeconds(param.time)
          : Date.UTC(param.time.year, param.time.month - 1, param.time.day) / 1000;

        const ohlcData = dataMap.current.get(timeKey);

        if (ohlcData) {
          setTooltip({
            visible: true,
            x: param.point.x,
            y: param.point.y,
            time: formatLwcTime(param.time as UTCTimestamp | BusinessDay),
            open: ohlcData.open,
            high: ohlcData.high,
            low: ohlcData.low,
            close: ohlcData.close,
          });
        } else {
          setTooltip(null);
        }
      };

      chart.subscribeCrosshairMove(crosshairHandler);

      // Handle resize
      const ro = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry || !chart) return;
        const width = Math.floor(entry.contentRect.width);
        const height = Math.floor(entry.contentRect.height);
        if (width > 0 && height > 0) {
          chart.applyOptions({ width, height });
          chart.timeScale().fitContent();
        }
      });
      ro.observe(containerRef.current);

      return () => {
        chart.unsubscribeCrosshairMove(crosshairHandler);
        ro.disconnect();
      };
    };

    let cleanup: (() => void) | undefined;
    initChart().then((fn) => {
      cleanup = fn;
    });

    return () => {
      disposed = true;
      cleanup?.();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = undefined;
      }
    };
  }, [mounted, data, periodKey, prevClose, resolvedTheme]);

  if (!mounted) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-xs text-muted-foreground">Loading chart...</div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {tooltip && tooltip.visible && (
        <div
          className="absolute pointer-events-none bg-background/95 border border-border rounded-lg px-2 py-1.5 shadow-lg text-xs z-10"
          style={{
            left: `${tooltip.x + 10}px`,
            top: `${tooltip.y - 60}px`,
          }}
        >
          <div className="font-medium text-[11px]">{tooltip.time}</div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1 text-[10px]">
            <span className="text-muted-foreground">始:</span>
            <span className="font-medium">{Math.round(tooltip.open)}</span>
            <span className="text-muted-foreground">高:</span>
            <span className="font-medium">{Math.round(tooltip.high)}</span>
            <span className="text-muted-foreground">安:</span>
            <span className="font-medium">{Math.round(tooltip.low)}</span>
            <span className="text-muted-foreground">終:</span>
            <span className="font-medium">{Math.round(tooltip.close)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
