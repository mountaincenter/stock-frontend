"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  createChart,
  ColorType,
  CandlestickSeries,
  LineSeries,
  type IChartApi,
  type Time,
  type CandlestickData as LwcCandleData,
  type LineData as LwcLineData,
  type CandlestickSeriesPartialOptions,
  type LineSeriesPartialOptions,
} from "lightweight-charts";

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
      chikou?: IchSeries; // 無い場合あり
    };
  };
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!;
const ENDPOINT = `${API_BASE}/demo/ichimoku/3350T`; // /demo/json/ichimoku_3350T_demo.json でもOK

export default function DemoPricesLwcIchimoku() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [payload, setPayload] = useState<IchPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // ---- fetch JSON ----
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const r = await fetch(ENDPOINT, { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = (await r.json()) as IchPayload;
        // 直近1年に圧縮（LWC は重いレンダリングを避ける）
        const cutoff = new Date();
        cutoff.setFullYear(cutoff.getFullYear() - 1);
        const toDate = (s: string) => new Date(s);
        const idx = j.series.ohlc.x.findIndex((d) => toDate(d) >= cutoff);
        const from = idx >= 0 ? idx : 0;

        const slice = <T,>(arr: T[]) => arr.slice(from);
        const sliced = {
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
        } as IchPayload;

        setPayload(sliced);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "fetch error");
        setPayload(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ---- styling ----
  const style = useMemo(() => {
    const paper = isDark ? "#0b0b0c" : "#ffffff";
    const text = isDark ? "#e5e7eb" : "#111827";
    const grid = isDark ? "#303034" : "#e5e7eb";
    const up = isDark ? "#34d399" : "#059669";
    const down = isDark ? "#f87171" : "#dc2626";
    // ichimoku lines
    const colTenkan = isDark ? "#60a5fa" : "#2563eb";
    const colKijun = isDark ? "#f59e0b" : "#d97706";
    const colSenkouA = isDark ? "#22c55e" : "#16a34a";
    const colSenkouB = isDark ? "#ef4444" : "#dc2626";
    const colChikou = isDark ? "#a78bfa" : "#7c3aed";
    return {
      paper,
      text,
      grid,
      up,
      down,
      colTenkan,
      colKijun,
      colSenkouA,
      colSenkouB,
      colChikou,
    };
  }, [isDark]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ReturnType<IChartApi["addSeries"]> | null>(null);
  const lineRefs = useRef<
    Record<string, ReturnType<IChartApi["addSeries"]> | null>
  >({});

  // ---- chart init ----
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    try {
      chartRef.current?.remove();
    } catch {}
    chartRef.current = null;
    candleRef.current = null;
    lineRefs.current = {};

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: style.paper },
        textColor: style.text,
      },
      width: el.clientWidth,
      height: 560,
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

    const copt: CandlestickSeriesPartialOptions = {
      upColor: style.up,
      downColor: style.down,
      borderUpColor: style.up,
      borderDownColor: style.down,
      wickUpColor: style.up,
      wickDownColor: style.down,
    };
    candleRef.current = chart.addSeries(CandlestickSeries, copt);

    const addLine = (color: string): ReturnType<IChartApi["addSeries"]> => {
      const opt: LineSeriesPartialOptions = { color, lineWidth: 2 };
      return chart.addSeries(LineSeries, opt);
    };
    lineRefs.current["tenkan"] = addLine(style.colTenkan);
    lineRefs.current["kijun"] = addLine(style.colKijun);
    lineRefs.current["senkou_a"] = addLine(style.colSenkouA);
    lineRefs.current["senkou_b"] = addLine(style.colSenkouB);
    lineRefs.current["chikou"] = addLine(style.colChikou);

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
      candleRef.current = null;
      lineRefs.current = {};
    };
  }, [style]);

  // ---- set data ----
  useEffect(() => {
    if (!payload || !chartRef.current || !candleRef.current) return;

    const { ohlc, ichimoku } = payload.series;

    // candles
    const candles: LwcCandleData<Time>[] = ohlc.x.map((t, i) => ({
      time: t as unknown as Time,
      open: ohlc.open[i],
      high: ohlc.high[i],
      low: ohlc.low[i],
      close: ohlc.close[i],
    }));
    candleRef.current.setData(candles);

    // helper to map line series
    const mapLine = (s?: IchSeries): LwcLineData<Time>[] | null =>
      s
        ? s.x.map((t, i) => ({ time: t as unknown as Time, value: s.y[i] }))
        : null;

    // chikou が JSON に無ければ自前生成（Close を -26日遅行）
    let chikou = ichimoku.chikou ? mapLine(ichimoku.chikou)! : null;
    if (!chikou) {
      const shift = 26;
      const arr: LwcLineData<Time>[] = [];
      for (let i = 0; i < ohlc.x.length; i++) {
        const k = i - shift;
        if (k >= 0) {
          arr.push({
            time: ohlc.x[i] as unknown as Time,
            value: ohlc.close[k],
          });
        }
      }
      chikou = arr;
    }

    const tenkan = mapLine(ichimoku.tenkan);
    const kijun = mapLine(ichimoku.kijun);
    const senA = mapLine(ichimoku.senkou_a);
    const senB = mapLine(ichimoku.senkou_b);

    if (tenkan) lineRefs.current["tenkan"]?.setData(tenkan);
    if (kijun) lineRefs.current["kijun"]?.setData(kijun);
    if (senA) lineRefs.current["senkou_a"]?.setData(senA);
    if (senB) lineRefs.current["senkou_b"]?.setData(senB);
    if (chikou) lineRefs.current["chikou"]?.setData(chikou);

    chartRef.current.timeScale().fitContent();
  }, [payload]);

  return (
    <div className="space-y-3 p-4">
      <div className="text-sm text-muted-foreground">
        {loading ? (
          "読み込み中…"
        ) : err ? (
          <span className="text-red-500">エラー: {err}</span>
        ) : (
          "3350.T 一目均衡表（直近1年）"
        )}
      </div>
      <div
        ref={containerRef}
        className="border rounded-xl p-4"
        style={{ width: "100%", height: 560 }}
      />
      <div className="text-xs text-muted-foreground">
        LWC
        では雲の塗りつぶしは未対応のため、先行スパンA/Bはライン表示のみです。
      </div>
    </div>
  );
}
