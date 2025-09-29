"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, type IChartApi } from "lightweight-charts";

type Props = {
  height?: number;
  backgroundColor?: string;
  textColor?: string;
};

export default function LwcEmptyFrame({
  height = 300,
  backgroundColor = "#ffffff", // ダークにするなら "#0b0b0c" など
  textColor = "#111827", // ダークにするなら "#e5e7eb"
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: backgroundColor },
        textColor,
      },
      width: el.clientWidth,
      height,
      grid: {
        vertLines: { color: "#e5e7eb" },
        horzLines: { color: "#e5e7eb" },
      },
      timeScale: {
        borderColor: "#e5e7eb",
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: { borderColor: "#e5e7eb" },
    });
    chartRef.current = chart;

    // 親幅に追従
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      chart.applyOptions({ width: Math.floor(entry.contentRect.width) });
    });
    ro.observe(el);
    roRef.current = ro;

    return () => {
      try {
        ro.disconnect();
      } catch {}
      try {
        chart.remove();
      } catch {}
      roRef.current = null;
      chartRef.current = null;
    };
  }, [height, backgroundColor, textColor]);

  // 高さを確保しないと何も表示されません
  return <div ref={containerRef} style={{ width: "100%", height }} />;
}
