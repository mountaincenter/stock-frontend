"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  createChart,
  ColorType,
  LineSeries,
  type IChartApi,
  type Time,
  type LineData as LwcLineData,
  type DeepPartial,
  type LineSeriesOptions,
  type LineWidth,
} from "lightweight-charts";

type SeriesXY = { x: string[]; y: number[] };
type BbPayload = {
  meta?: { ticker?: string; period?: string; interval?: string; note?: string };
  series: {
    close?: SeriesXY;
    // サーバ側は ma というキー名の可能性があるので両対応
    ma?: SeriesXY;
    ma20?: SeriesXY;
    upper?: SeriesXY;
    lower?: SeriesXY;
    bandwidth?: SeriesXY;
  };
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!;
const ENDPOINT = `${API_BASE}/demo/bb/3350T`; // start/end をクエリで渡す

function fmt(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function toLineData(s?: SeriesXY): LwcLineData<Time>[] | null {
  if (!s || !s.x || !s.y || s.x.length !== s.y.length) return null;
  const out: LwcLineData<Time>[] = [];
  for (let i = 0; i < s.x.length; i++) {
    const t = s.x[i] as unknown as Time;
    const v = s.y[i];
    if (v == null || Number.isNaN(v)) continue;
    out.push({ time: t, value: v });
  }
  return out;
}

export default function DemoPricesLwcBB() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [payload, setPayload] = useState<BbPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const range = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setFullYear(today.getFullYear() - 1);
    return { start: fmt(start), end: fmt(today) };
  }, []);

  // ---- fetch JSON（サーバ側で±2σ済みのupper/lowerをそのまま取得）----
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const url = new URL(ENDPOINT);
        url.searchParams.set("start", range.start);
        url.searchParams.set("end", range.end);
        const r = await fetch(url.toString(), { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = (await r.json()) as BbPayload;
        setPayload(j);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "fetch error");
        setPayload(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [range.end, range.start]);

  // ---- styling ----
  const style = useMemo(() => {
    const paper = isDark ? "#0b0b0c" : "#ffffff";
    const text = isDark ? "#e5e7eb" : "#111827";
    const grid = isDark ? "#303034" : "#e5e7eb";
    const colClose = isDark ? "#e5e7eb" : "#111827";
    const colMA = isDark ? "#60a5fa" : "#2563eb";
    const colUp = isDark ? "#22c55e" : "#16a34a";
    const colLow = isDark ? "#ef4444" : "#dc2626";
    return { paper, text, grid, colClose, colMA, colUp, colLow };
  }, [isDark]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const lineRefs = useRef<
    Record<
      "close" | "ma" | "upper" | "lower",
      ReturnType<IChartApi["addSeries"]> | null
    >
  >({ close: null, ma: null, upper: null, lower: null });

  // ---- chart init ----
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    try {
      chartRef.current?.remove();
    } catch {}
    chartRef.current = null;
    lineRefs.current = { close: null, ma: null, upper: null, lower: null };

    const chart = createChart(el, {
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
      },
      rightPriceScale: { borderColor: style.grid },
    });
    chartRef.current = chart;

    const mkLine = (
      color: string,
      width: LineWidth = 2
    ): ReturnType<IChartApi["addSeries"]> => {
      const opt: DeepPartial<LineSeriesOptions> = { color, lineWidth: width };
      return chart.addSeries(LineSeries, opt);
    };

    lineRefs.current.close = mkLine(style.colClose, 1);
    lineRefs.current.ma = mkLine(style.colMA, 2);
    lineRefs.current.upper = mkLine(style.colUp, 2);
    lineRefs.current.lower = mkLine(style.colLow, 2);

    const ro = new ResizeObserver((entries) => {
      const w = Math.floor(entries[0].contentRect.width);
      chart.applyOptions({ width: w });
    });
    ro.observe(el);

    return () => {
      try {
        ro.disconnect();
      } catch {}
      try {
        chart.remove();
      } catch {}
      chartRef.current = null;
      lineRefs.current = { close: null, ma: null, upper: null, lower: null };
    };
  }, [style]);

  // ---- set data（サーバの値をそのまま使用）----
  useEffect(() => {
    if (!payload || !chartRef.current) return;

    const src = payload.series || {};
    // ma20 or ma のどちらか
    const maSeries = src.ma20 ?? src.ma;

    const close = toLineData(src.close);
    const ma = toLineData(maSeries);
    const upper = toLineData(src.upper);
    const lower = toLineData(src.lower);

    if (close) lineRefs.current.close?.setData(close);
    if (ma) lineRefs.current.ma?.setData(ma);
    if (upper) lineRefs.current.upper?.setData(upper);
    if (lower) lineRefs.current.lower?.setData(lower);

    chartRef.current.timeScale().fitContent();
  }, [payload]);

  const title = payload?.meta?.note || "Bollinger Bands";

  return (
    <div className="space-y-3 p-4">
      <div className="text-sm text-muted-foreground">
        {loading ? (
          "読み込み中…"
        ) : err ? (
          <span className="text-red-500">エラー: {err}</span>
        ) : (
          `3350.T ${title}（直近1年）`
        )}
      </div>
      <div
        ref={containerRef}
        className="border rounded-xl p-4"
        style={{ width: "100%", height: 520 }}
      />
      <div className="text-xs text-muted-foreground">
        LWC
        は塗りつぶし未対応のため、上限/下限はライン表示のみです（再計算なし）。
      </div>
    </div>
  );
}
