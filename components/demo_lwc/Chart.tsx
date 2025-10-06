"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  createChart,
  ColorType,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type Time,
  type CandlestickData as LwcCandleData,
  type CandlestickSeriesPartialOptions,
  type HistogramData,
  type HistogramSeriesPartialOptions,
  UTCTimestamp,
  BusinessDay,
} from "lightweight-charts";
import type { PriceRow } from "./types";
import { toUtcSeconds } from "./utils";
import { nfPrice, nfVolume, formatLwcTime } from "./locale";

/** 描画のみ（SRP） */
export function LwcJaChart({
  rows,
  height = 520,
}: {
  rows: PriceRow[];
  height?: number;
}) {
  // LWC に渡すデータ（DRY: 一元化）
  const candles: LwcCandleData<Time>[] = useMemo(() => {
    return rows.map((r) => ({
      time: toUtcSeconds(r.date) as Time,
      open: r.Open,
      high: r.High,
      low: r.Low,
      close: r.Close,
    }));
  }, [rows]);

  const volumes: HistogramData<Time>[] = useMemo(() => {
    return rows.map((r) => {
      const upbar = r.Close >= r.Open;
      return {
        time: toUtcSeconds(r.date) as Time,
        value: (r.Volume ?? 0) as number,
        color: upbar ? "#059669" : "#dc2626",
      };
    });
  }, [rows]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ReturnType<IChartApi["addSeries"]> | null>(null);
  const volRef = useRef<ReturnType<IChartApi["addSeries"]> | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  // 初期化
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // 既存破棄
    try {
      roRef.current?.disconnect();
      chartRef.current?.remove();
    } catch {}
    chartRef.current = null;
    seriesRef.current = null;
    volRef.current = null;
    roRef.current = null;

    const chart = createChart(el, {
      width: el.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#111827",
      },
      grid: {
        vertLines: { color: "rgba(0,0,0,0.08)" },
        horzLines: { color: "rgba(0,0,0,0.08)" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "rgba(0,0,0,0.15)",
      },
      rightPriceScale: { borderColor: "rgba(0,0,0,0.15)" },
      handleScale: { mouseWheel: false }, // ホイールズーム無効（要件より）
      localization: {
        locale: "ja-JP",
        priceFormatter: (p: number) => nfPrice.format(p),
        timeFormatter: (t: UTCTimestamp | BusinessDay) => formatLwcTime(t),
      },
    });
    chartRef.current = chart;

    // 価格（ローソク）
    const candleOpts: CandlestickSeriesPartialOptions = {
      upColor: "#059669",
      downColor: "#dc2626",
      borderUpColor: "#059669",
      borderDownColor: "#dc2626",
      wickUpColor: "#059669",
      wickDownColor: "#dc2626",
      priceScaleId: "right",
    };
    const s = chart.addSeries(CandlestickSeries, candleOpts);
    seriesRef.current = s;

    // 価格スケール下にマージン → 下部に出来高領域
    chart.priceScale("right").applyOptions({
      scaleMargins: { top: 0.05, bottom: 0.25 },
    });

    // 出来高（整数・千区切り）
    const volOpts: HistogramSeriesPartialOptions = {
      priceScaleId: "volume",
      priceFormat: {
        type: "custom",
        minMove: 1,
        formatter: (v: number) => nfVolume.format(Math.round(v)),
      },
    };
    const v = chart.addSeries(HistogramSeries, volOpts);
    volRef.current = v;

    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0.0 },
      borderVisible: false,
    });

    // リサイズ
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
      seriesRef.current = null;
      volRef.current = null;
    };
  }, [height]);

  // データ適用
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current || !volRef.current) return;
    seriesRef.current.setData(candles);
    volRef.current.setData(volumes);
    chartRef.current.timeScale().fitContent();
  }, [candles, volumes]);

  return (
    <div
      ref={containerRef}
      className="border rounded-xl p-4"
      style={{ width: "100%", height }}
    />
  );
}
