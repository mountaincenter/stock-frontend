"use client";

import { useEffect, useMemo, useState } from "react";
import Plot from "react-plotly.js";
import { useTheme } from "next-themes";

type IchSeries = { x: string[]; y: number[] };
type IchPayload = {
  meta?: { ticker?: string };
  series: {
    ohlc: {
      x: string[];
      open: number[];
      high: number[];
      low: number[];
      close: number[];
    };
    ichimoku: {
      tenkan?: IchSeries;
      kijun?: IchSeries;
      senkou_a?: IchSeries;
      senkou_b?: IchSeries;
      chikou?: IchSeries; // 無ければ後段で生成
    };
  };
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!;
const ENDPOINT = `${API_BASE}/demo/ichimoku/3350T`;

export default function DemoPricesIchimoku() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [payload, setPayload] = useState<IchPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const r = await fetch(ENDPOINT, { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = (await r.json()) as IchPayload;

        // 直近1年にトリム
        const cutoff = new Date();
        cutoff.setFullYear(cutoff.getFullYear() - 1);
        const toDate = (s: string) => new Date(s);
        const idx = j.series.ohlc.x.findIndex((d) => toDate(d) >= cutoff);
        const from = idx >= 0 ? idx : 0;
        const slice = <T,>(arr: T[]) => arr.slice(from);

        const sliced: IchPayload = {
          ...j,
          series: {
            ...j.series,
            ohlc: {
              x: slice(j.series.ohlc.x),
              open: slice(j.series.ohlc.open),
              high: slice(j.series.ohlc.high),
              low: slice(j.series.ohlc.low),
              close: slice(j.series.ohlc.close),
            },
            ichimoku: {
              tenkan: j.series.ichimoku.tenkan
                ? {
                    x: slice(j.series.ichimoku.tenkan.x),
                    y: slice(j.series.ichimoku.tenkan.y),
                  }
                : undefined,
              kijun: j.series.ichimoku.kijun
                ? {
                    x: slice(j.series.ichimoku.kijun.x),
                    y: slice(j.series.ichimoku.kijun.y),
                  }
                : undefined,
              senkou_a: j.series.ichimoku.senkou_a
                ? {
                    x: slice(j.series.ichimoku.senkou_a.x),
                    y: slice(j.series.ichimoku.senkou_a.y),
                  }
                : undefined,
              senkou_b: j.series.ichimoku.senkou_b
                ? {
                    x: slice(j.series.ichimoku.senkou_b.x),
                    y: slice(j.series.ichimoku.senkou_b.y),
                  }
                : undefined,
              chikou: j.series.ichimoku.chikou
                ? {
                    x: slice(j.series.ichimoku.chikou.x),
                    y: slice(j.series.ichimoku.chikou.y),
                  }
                : undefined,
            },
          },
        };
        setPayload(sliced);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "fetch error");
        setPayload(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const plot = useMemo(() => {
    if (!payload) return null;

    const { ohlc, ichimoku } = payload.series;

    // 遅行スパン足りなければ生成（Close を -26）
    let chikou = ichimoku.chikou;
    if (!chikou) {
      const shift = 26;
      const x: string[] = [];
      const y: number[] = [];
      for (let i = 0; i < ohlc.x.length; i++) {
        const k = i - shift;
        if (k >= 0) {
          x.push(ohlc.x[i]);
          y.push(ohlc.close[k]);
        }
      }
      chikou = { x, y };
    }

    // カラー
    const paper = isDark ? "#0b0b0c" : "#ffffff";
    const plotbg = paper;
    const grid = isDark ? "#303034" : "#e5e7eb";
    const font = isDark ? "#e5e7eb" : "#111827";
    const up = isDark ? "#34d399" : "#059669";
    const down = isDark ? "#f87171" : "#dc2626";
    const tenkanC = isDark ? "#2563eb" : "#1d4ed8";
    const kijunC = isDark ? "#f59e0b" : "#d97706";
    const senA = isDark ? "#22c55e" : "#16a34a";
    const senB = isDark ? "#ef4444" : "#dc2626";
    const chikouC = isDark ? "#a78bfa" : "#7c3aed";

    const data: any[] = [];

    // ロウソク
    data.push({
      type: "candlestick",
      x: ohlc.x,
      open: ohlc.open,
      high: ohlc.high,
      low: ohlc.low,
      close: ohlc.close,
      increasing: { line: { color: up } },
      decreasing: { line: { color: down } },
      name: "OHLC",
      yaxis: "y",
      xaxis: "x",
    });

    // 先行スパン A/B（雲）…A→B の順に追加して fill: "tonexty"
    if (ichimoku.senkou_a) {
      data.push({
        type: "scatter",
        mode: "lines",
        name: "Senkou A",
        x: ichimoku.senkou_a.x,
        y: ichimoku.senkou_a.y,
        line: { width: 1.5, color: senA },
        hoverinfo: "skip",
      });
    }
    if (ichimoku.senkou_b) {
      data.push({
        type: "scatter",
        mode: "lines",
        name: "Senkou B",
        x: ichimoku.senkou_b.x,
        y: ichimoku.senkou_b.y,
        line: { width: 1.5, color: senB },
        fill: "tonexty",
        fillcolor: isDark ? "rgba(34,197,94,0.12)" : "rgba(16,185,129,0.12)",
        hoverinfo: "skip",
      });
    }

    // 転換線・基準線・遅行スパン
    if (ichimoku.tenkan) {
      data.push({
        type: "scatter",
        mode: "lines",
        name: "Tenkan",
        x: ichimoku.tenkan.x,
        y: ichimoku.tenkan.y,
        line: { width: 2, color: tenkanC },
        hoverinfo: "skip",
      });
    }
    if (ichimoku.kijun) {
      data.push({
        type: "scatter",
        mode: "lines",
        name: "Kijun",
        x: ichimoku.kijun.x,
        y: ichimoku.kijun.y,
        line: { width: 2, color: kijunC },
        hoverinfo: "skip",
      });
    }
    if (chikou) {
      data.push({
        type: "scatter",
        mode: "lines",
        name: "Chikou",
        x: chikou.x,
        y: chikou.y,
        line: { width: 2, color: chikouC, dash: "dot" },
        hoverinfo: "skip",
      });
    }

    const layout: Partial<Plotly.Layout> = {
      title: "3350.T 一目均衡表（直近1年）",
      paper_bgcolor: paper,
      plot_bgcolor: plotbg,
      font: { color: font },
      xaxis: { gridcolor: grid, type: "date" },
      yaxis: { gridcolor: grid },
      margin: { l: 60, r: 20, t: 50, b: 40 },
      showlegend: true,
      legend: { orientation: "h" },
    };

    const config = { displayModeBar: true, responsive: true };

    return { data, layout, config };
  }, [payload, isDark]);

  if (loading)
    return <div className="p-4 text-sm text-muted-foreground">読み込み中…</div>;
  if (err) return <div className="p-4 text-sm text-red-500">エラー: {err}</div>;
  if (!plot) return <div className="p-4 text-sm">データがありません</div>;

  return (
    <div className="p-4 border rounded-xl">
      <Plot
        data={plot.data as any}
        layout={plot.layout as any}
        config={plot.config as any}
        style={{ width: "100%", height: 560 }}
        useResizeHandler
      />
    </div>
  );
}
