"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  AreaSeries, // v5: シリーズ作成はトークンを第1引数に渡す
  type IChartApi,
  type AreaSeriesPartialOptions,
  type AreaData, // { time: string | number | BusinessDay, value: number }
} from "lightweight-charts";

type Props = {
  height?: number;
  data?: AreaData[]; // 未指定ならデモデータを使用
  backgroundColor?: string;
  textColor?: string;
  gridColor?: string;
  lineColor?: string;
  areaTopColor?: string;
  areaBottomColor?: string;
};

const demoData: AreaData[] = [
  { time: "2018-12-22", value: 32.51 },
  { time: "2018-12-23", value: 31.11 },
  { time: "2018-12-24", value: 27.02 },
  { time: "2018-12-25", value: 27.32 },
  { time: "2018-12-26", value: 25.17 },
  { time: "2018-12-27", value: 28.89 },
  { time: "2018-12-28", value: 25.46 },
  { time: "2018-12-29", value: 23.92 },
  { time: "2018-12-30", value: 22.68 },
  { time: "2018-12-31", value: 22.67 },
];

export default function LwcAreaMin({
  height = 300,
  data = demoData,
  backgroundColor = "#ffffff",
  textColor = "#111827",
  gridColor = "#e5e7eb",
  lineColor = "#2962FF",
  areaTopColor = "#2962FF",
  areaBottomColor = "rgba(41, 98, 255, 0.28)",
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  // addSeries の戻り値型に追従（版差の影響を受けにくい）
  const seriesRef = useRef<ReturnType<IChartApi["addSeries"]> | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // チャート本体
    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: backgroundColor },
        textColor,
      },
      width: el.clientWidth,
      height,
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      timeScale: {
        borderColor: gridColor,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: { borderColor: gridColor },
    });
    chartRef.current = chart;

    // エリアシリーズ 1 本（v5: トークン API）
    const seriesOpts: AreaSeriesPartialOptions = {
      lineColor,
      topColor: areaTopColor,
      bottomColor: areaBottomColor,
    };
    const series = chart.addSeries(AreaSeries, seriesOpts);
    seriesRef.current = series;

    // データ設定
    series.setData(Array.isArray(data) ? data : []);
    chart.timeScale().fitContent();

    // 親幅に追従
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      chart.applyOptions({ width: Math.floor(entry.contentRect.width) });
    });
    ro.observe(el);
    roRef.current = ro;

    // クリーンアップ
    return () => {
      try {
        ro.disconnect();
      } catch {
        /* noop */
      }
      try {
        chart.remove();
      } catch {
        /* noop */
      }
      roRef.current = null;
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [
    height,
    data,
    backgroundColor,
    textColor,
    gridColor,
    lineColor,
    areaTopColor,
    areaBottomColor,
  ]);

  // 高さを必ず確保
  return <div ref={containerRef} style={{ width: "100%", height }} />;
}

export { demoData as lwcAreaDemoData };
