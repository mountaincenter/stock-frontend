"use client";

import { useEffect, useMemo, useRef, useCallback } from "react";
import {
  createChart,
  ColorType,
  AreaSeries,
  type IChartApi,
  type Time,
  type AreaData,
} from "lightweight-charts";
import type { PriceRow } from "./types";
import { toUtcSeconds } from "./utils";

/**
 * MiniLineChart
 * - 形重視：LTTB で形保持ダウンサンプリング
 * - 視認性：始点比の％変化 → 0..100 に正規化して縦レンジを使い切る
 * - エリア塗り＋太線、軸/グリッド/クロスヘア非表示
 * - time は厳密昇順・重複なし
 */
export default function MiniLineChart({
  rows,
  height = 48,
  maxPoints = 300, // 入力上限
}: {
  rows: PriceRow[];
  height?: number;
  maxPoints?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ReturnType<IChartApi["addSeries"]> | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  /** time 昇順・重複除去（最後に現れた値を優先） */
  const uniqByTimeAsc = useCallback((d: { time: number; value: number }[]) => {
    const map = new Map<number, number>();
    for (const p of d) map.set(p.time, p.value);
    const out: { time: number; value: number }[] = [];
    for (const [t, v] of [...map.entries()].sort((a, b) => a[0] - b[0])) {
      out.push({ time: t, value: v });
    }
    return out;
  }, []);

  /** LTTB（Largest-Triangle-Three-Buckets） */
  const lttb = useCallback(
    (d: { time: number; value: number }[], threshold: number) => {
      const n = d.length;
      if (threshold >= n || threshold < 3) return d.slice();
      const sampled: { time: number; value: number }[] = new Array(threshold);
      let a = 0; // 先頭固定
      sampled[0] = d[a];
      const every = (n - 2) / (threshold - 2);

      for (let i = 0; i < threshold - 2; i++) {
        const avgRangeStart = Math.floor((i + 1) * every) + 1;
        const avgRangeEnd = Math.floor((i + 2) * every) + 1;
        const avgRangeEndClamped = Math.min(avgRangeEnd, n);

        let avgX = 0;
        let avgY = 0;
        const avgRangeLength = avgRangeEndClamped - avgRangeStart;
        for (let j = avgRangeStart; j < avgRangeEndClamped; j++) {
          avgX += d[j].time;
          avgY += d[j].value;
        }
        avgX /= Math.max(1, avgRangeLength);
        avgY /= Math.max(1, avgRangeLength);

        const rangeOffs = Math.floor(i * every) + 1;
        const rangeTo = Math.floor((i + 1) * every) + 1;

        let maxArea = -1;
        let maxAreaPointIndex = -1;

        for (let j = rangeOffs; j < rangeTo; j++) {
          const area =
            Math.abs(
              (d[a].time - avgX) * (d[j].value - d[a].value) -
                (d[a].time - d[j].time) * (avgY - d[a].value)
            ) * 0.5;
          if (area > maxArea) {
            maxArea = area;
            maxAreaPointIndex = j;
          }
        }
        sampled[i + 1] = d[maxAreaPointIndex];
        a = maxAreaPointIndex;
      }
      sampled[threshold - 1] = d[n - 1];
      return uniqByTimeAsc(sampled);
    },
    [uniqByTimeAsc]
  );

  const { areaData, lineColor } = useMemo(() => {
    // 1) UTC秒 + Close
    const base = rows.map((r) => ({
      time: toUtcSeconds(r.date),
      value: r.Close,
    }));

    // 2) time 昇順・重複除去
    const asc = uniqByTimeAsc(base);

    // 3) 末尾 maxPoints に制限
    const tail = asc.length > maxPoints ? asc.slice(-maxPoints) : asc;
    if (tail.length === 0) {
      return { areaData: [] as AreaData<Time>[], lineColor: "#64748b" };
    }

    // 4) 始点比の％変化に変換
    const baseVal = tail[0].value || 1;
    const pct = tail.map((p) => ({
      time: p.time,
      value: (p.value / baseVal - 1) * 100, // %
    }));

    // 5) ％系列を 0..100 にリスケール
    let minV = Infinity;
    let maxV = -Infinity;
    for (const p of pct) {
      if (p.value < minV) minV = p.value;
      if (p.value > maxV) maxV = p.value;
    }
    const span = maxV - minV || 1;
    const norm = pct.map((p) => ({
      time: p.time,
      value: ((p.value - minV) / span) * 100,
    }));

    // 6) 形保持ダウンサンプリング
    const target = Math.min(240, norm.length);
    const shaped = lttb(norm, target);

    // 7) LWC 形式へ
    const out: AreaData<Time>[] = shaped.map((p) => ({
      time: p.time as Time,
      value: p.value,
    }));

    // 8) トレンドで色分け
    const first = out[0]?.value ?? 0;
    const last = out[out.length - 1]?.value ?? 0;
    const up = last > first;
    const down = last < first;
    const color = up ? "#0ea5e9" : down ? "#f97316" : "#64748b";

    return { areaData: out, lineColor: color };
  }, [rows, maxPoints, uniqByTimeAsc, lttb]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    try {
      roRef.current?.disconnect();
      chartRef.current?.remove();
    } catch {}
    chartRef.current = null;
    seriesRef.current = null;
    roRef.current = null;

    const chart = createChart(el, {
      width: Math.max(0, el.clientWidth),
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "transparent",
      },
      grid: {
        vertLines: { color: "transparent" },
        horzLines: { color: "transparent" },
      },
      timeScale: {
        timeVisible: false,
        secondsVisible: false,
        borderVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.12, bottom: 0.12 },
      },
      crosshair: {
        vertLine: { visible: false },
        horzLine: { visible: false },
      },
      handleScale: {
        mouseWheel: false,
        pinch: false,
        axisPressedMouseMove: false,
      },
      handleScroll: { mouseWheel: false, pressedMouseMove: false },
    });
    chartRef.current = chart;

    // v5: addSeries(AreaSeries, options)
    const s = chart.addSeries(AreaSeries, {
      lineWidth: 3,
      lineColor,
      topColor: `${lineColor}66`,
      bottomColor: `${lineColor}00`,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    seriesRef.current = s;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.floor(entry.contentRect.width);
      if (w > 0) chart.applyOptions({ width: w });
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
    };
  }, [height, lineColor]);

  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return;
    seriesRef.current.setData(areaData);
    chartRef.current.timeScale().fitContent();
  }, [areaData]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height, display: "block" }}
      aria-label="sparkline"
    />
  );
}
