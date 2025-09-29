"use client";

import { useEffect, useMemo, useState } from "react";
import Plot from "react-plotly.js";
import { useTheme } from "next-themes";
import type { Data, Layout, Config } from "plotly.js";

type SeriesXY = { x: string[]; y: number[] };
type BbPayload = {
  meta?: { ticker?: string; period?: string; interval?: string; note?: string };
  series: {
    close?: SeriesXY;
    ma?: SeriesXY;
    ma20?: SeriesXY;
    upper?: SeriesXY;
    lower?: SeriesXY;
    bandwidth?: SeriesXY;
  };
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!;
const ENDPOINT = `${API_BASE}/demo/bb/3350T`;

function fmt(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default function DemoPricesBB() {
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
        setPayload(j); // サーバの upper/lower をそのまま使用
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "fetch error");
        setPayload(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [range.end, range.start]);

  const layout: Partial<Layout> = useMemo(
    () => ({
      title: {
        text:
          (payload?.meta?.note
            ? `3350.T ${payload.meta.note}`
            : "3350.T Bollinger Bands") + "（直近1年）",
      },
      paper_bgcolor: isDark ? "#0b0b0c" : "#ffffff",
      plot_bgcolor: isDark ? "#0b0b0c" : "#ffffff",
      font: { color: isDark ? "#e5e7eb" : "#111827" },
      xaxis: { gridcolor: isDark ? "#303034" : "#e5e7eb", type: "date" },
      yaxis: { gridcolor: isDark ? "#303034" : "#e5e7eb" },
      margin: { l: 60, r: 20, t: 50, b: 40 },
      showlegend: true,
      legend: { orientation: "h" },
    }),
    [isDark, payload?.meta?.note]
  );

  const config: Partial<Config> = useMemo(
    () => ({ displayModeBar: true, responsive: true }),
    []
  );

  if (loading)
    return <div className="p-4 text-sm text-muted-foreground">読み込み中…</div>;
  if (err) return <div className="p-4 text-sm text-red-500">エラー: {err}</div>;
  if (!payload?.series?.close?.x?.length)
    return <div className="p-4 text-sm">データがありません</div>;

  const s = payload.series;
  const maSeries = s.ma20 ?? s.ma;

  const data: Partial<Data>[] = [];

  if (s.upper && s.lower) {
    data.push({
      type: "scatter",
      mode: "lines",
      name: "Upper (server)",
      x: s.upper.x,
      y: s.upper.y,
      line: { width: 1 },
    });
    data.push({
      type: "scatter",
      mode: "lines",
      name: "Lower (server)",
      x: s.lower.x,
      y: s.lower.y,
      fill: "tonexty",
      line: { width: 1 },
      opacity: 0.25,
    });
  }
  if (maSeries) {
    data.push({
      type: "scatter",
      mode: "lines",
      name: "MA(20)",
      x: maSeries.x,
      y: maSeries.y,
      line: { width: 2 },
    });
  }
  if (s.close) {
    data.push({
      type: "scatter",
      mode: "lines",
      name: "Close",
      x: s.close.x,
      y: s.close.y,
      line: { width: 1.5 },
    });
  }

  return (
    <div className="p-4 border rounded-xl">
      <Plot
        data={data}
        layout={layout}
        config={config}
        style={{ width: "100%", height: 520 }}
        useResizeHandler
      />
    </div>
  );
}
