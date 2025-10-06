// app/components/DemoPricesLwc.tsx  ← あなたの配置名に合わせてください
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

function fmt(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// 幅から見やすい高さを決める（スマホ縦で縦長に）
function calcChartHeight(width: number): number {
  if (!width || width <= 0) return 520;
  const isNarrow = width < 480;
  const ratio = isNarrow ? 1.1 : 0.6; // 狭い時は縦長、広い時は低め
  return Math.max(260, Math.round(width * ratio));
}

export default function DemoPricesLwcMobile() {
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

  // 初期化＆テーマ変更で再構築（レスポンシブ高さにも対応）
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // 再作成前のクリーンアップ
    try {
      roRef.current?.disconnect();
      chartRef.current?.remove();
    } catch {}
    chartRef.current = null;
    seriesRef.current = null;
    roRef.current = null;

    // 初期サイズ
    const initW = el.clientWidth || 640;
    const initH = calcChartHeight(initW);

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: style.paper },
        textColor: style.text,
      },
      width: initW,
      height: initH,
      grid: {
        vertLines: { color: style.grid },
        horzLines: { color: style.grid },
      },
      timeScale: {
        borderColor: style.grid,
        timeVisible: true,
        secondsVisible: false,
        // 右寄り感の緩和
        rightOffset: 0,
        fixLeftEdge: true,
        fixRightEdge: true,
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

    // ResizeObserver で幅・高さを両方更新（スマホ縦：縦長に）
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = Math.floor(entry.contentRect.width);
      const height = calcChartHeight(width);
      chart.applyOptions({ width, height });
      // 右余白が出ないよう再設定（保険）
      chart.timeScale().applyOptions({ rightOffset: 0 });
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
    // fitContent 後も右余白をゼロ
    chartRef.current.timeScale().applyOptions({ rightOffset: 0 });
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
        className="border rounded-xl p-4 mx-auto w-full max-w-screen-sm md:max-w-3xl"
        style={{ width: "100%", height: calcChartHeight(600) }}
      />
    </div>
  );
}
