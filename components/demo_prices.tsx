"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });
import type { CandlestickData, Layout, Config } from "plotly.js";
import { useTheme } from "next-themes";

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

export default function DemoPrices() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [rows, setRows] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

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
      } catch (e) {
        setErr(e instanceof Error ? e.message : "fetch error");
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const x = useMemo<string[]>(() => rows.map((r) => r.date), [rows]);
  const open = useMemo<number[]>(() => rows.map((r) => r.Open), [rows]);
  const high = useMemo<number[]>(() => rows.map((r) => r.High), [rows]);
  const low = useMemo<number[]>(() => rows.map((r) => r.Low), [rows]);
  const close = useMemo<number[]>(() => rows.map((r) => r.Close), [rows]);

  const trace: Partial<CandlestickData> = useMemo(
    () => ({
      type: "candlestick",
      x,
      open,
      high,
      low,
      close,
      increasing: { line: { color: isDark ? "#34d399" : "#059669" } },
      decreasing: { line: { color: isDark ? "#f87171" : "#dc2626" } },
      name: "OHLC",
    }),
    [x, open, high, low, close, isDark]
  );

  const layout: Partial<Layout> = useMemo(
    () => ({
      title: { text: "3350.T（日足・直近1年）" }, // ← 文字列ではなく { text } に
      paper_bgcolor: isDark ? "#0b0b0c" : "#ffffff",
      plot_bgcolor: isDark ? "#0b0b0c" : "#ffffff",
      font: { color: isDark ? "#e5e7eb" : "#111827" },
      xaxis: {
        gridcolor: isDark ? "#303034" : "#e5e7eb",
        type: "date",
      },
      yaxis: { gridcolor: isDark ? "#303034" : "#e5e7eb" },
      margin: { l: 60, r: 20, t: 50, b: 40 },
      showlegend: false,
    }),
    [isDark]
  );

  const config: Partial<Config> = useMemo(
    () => ({ displayModeBar: true, responsive: true }),
    []
  );

  if (loading)
    return <div className="p-4 text-sm text-muted-foreground">読み込み中…</div>;
  if (err) return <div className="p-4 text-sm text-red-500">エラー: {err}</div>;
  if (!rows.length)
    return <div className="p-4 text-sm">データがありません</div>;

  return (
    <div className="p-4 border rounded-xl">
      <Plot
        data={[trace]}
        layout={layout}
        config={config}
        style={{ width: "100%", height: 520 }}
        useResizeHandler
      />
    </div>
  );
}
