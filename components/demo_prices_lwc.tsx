"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  createChart,
  ColorType,
  CandlestickSeries,
  type IChartApi,
  type Time,
  type CandlestickData as LwcCandleData,
  type CandlestickSeriesPartialOptions,
} from "lightweight-charts";

type PriceRow = {
  date: string; // "YYYY-MM-DD"
  Open: number;
  High: number;
  Low: number;
  Close: number;
  Volume?: number;
  ticker?: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!;
const TICKER = "3350.T";

function fmt(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default function DemoPricesLwc() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [rows, setRows] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // 直近1年の範囲を計算＆取得
  useEffect(() => {
    const today = new Date();
    const start = new Date(today);
    start.setFullYear(today.getFullYear() - 1);
    const startStr = fmt(start);
    const endStr = fmt(today);

    (async () => {
      try {
        setLoading(true);
        setErr(null);
        // ★ demo/parquetベースのJSON化APIに合わせる
        const url = new URL(`${API_BASE}/demo/prices/max/1d/3350T`);
        url.searchParams.set("start", startStr);
        url.searchParams.set("end", endStr);
        const r = await fetch(url.toString(), { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j: PriceRow[] = await r.json();
        j.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
        setRows(j);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "fetch error");
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const style = useMemo(() => {
    const paper = isDark ? "#0b0b0c" : "#ffffff";
    const text = isDark ? "#e5e7eb" : "#111827";
    const grid = isDark ? "#303034" : "#e5e7eb";
    const up = isDark ? "#34d399" : "#059669";
    const down = isDark ? "#f87171" : "#dc2626";
    return { paper, text, grid, up, down };
  }, [isDark]);

  const candleData = useMemo<LwcCandleData<Time>[]>(() => {
    return rows.map((r) => ({
      time: r.date as unknown as Time,
      open: r.Open,
      high: r.High,
      low: r.Low,
      close: r.Close,
    }));
  }, [rows]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ReturnType<IChartApi["addSeries"]> | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  // 初期化＆テーマ変更で再構築
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

    const opts: CandlestickSeriesPartialOptions = {
      upColor: style.up,
      downColor: style.down,
      borderUpColor: style.up,
      borderDownColor: style.down,
      wickUpColor: style.up,
      wickDownColor: style.down,
    };
    const series = chart.addSeries(CandlestickSeries, opts);
    seriesRef.current = series;

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
    };
  }, [style]);

  // データ適用
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return;
    seriesRef.current.setData(candleData);
    chartRef.current.timeScale().fitContent();
  }, [candleData]);

  return (
    <div className="space-y-3 p-4">
      <div className="text-sm text-muted-foreground">
        {loading ? (
          "読み込み中…"
        ) : err ? (
          <span className="text-red-500">エラー: {err}</span>
        ) : (
          `3350.T（日足・直近1年）`
        )}
      </div>
      <div
        ref={containerRef}
        className="border rounded-xl p-4"
        style={{ width: "100%", height: 520 }}
      />
    </div>
  );
}
