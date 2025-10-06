"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

/** API ベースURL（.env で設定済み前提） */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!;

type PriceRow = {
  date: string; // APIからの時刻（intradayは ISO 例: "2025-10-06T09:05:00"、日足は "YYYY-MM-DD"）
  Open: number;
  High: number;
  Low: number;
  Close: number;
  Volume?: number;
  ticker?: string;
};

/** ===== 日付/数値フォーマッタ（ja-JP） ===== */
const nfPrice = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 6,
});
const nfVolume = new Intl.NumberFormat("ja-JP", {
  useGrouping: true,
  maximumFractionDigits: 0,
});
const dfDateOnly = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const dfDateTime = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** LWC の time を日本語表示へ */
function formatLwcTime(t: UTCTimestamp | BusinessDay): string {
  if (typeof t === "number") {
    return dfDateTime.format(new Date(t * 1000));
  }
  const { year, month, day } = t;
  return dfDateOnly.format(new Date(year, month - 1, day));
}

/** 日付フォーマッタ（クエリは常に YYYY-MM-DD のみ） */
function fmtDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** ISO/日付文字列 → UTCTimestamp 秒（LWC推奨） */
function toUtcSeconds(t: string): number {
  return Math.floor(new Date(t).getTime() / 1000);
}

/** ===== 範囲スイッチャー ===== */
type RangeKey = "1日" | "5日" | "1ヶ月";
const RANGE_LABELS: RangeKey[] = ["1日", "5日", "1ヶ月"];

/**
 * 範囲に応じて period/interval と start/end(日付のみ) を決定
 * - 1日  -> 60d/5m
 * - 5日  -> 60d/15m
 * - 1ヶ月-> max/1h
 * サーバ側は end=YYYY-MM-DD を翌日0:00未満で解釈するため、当日分を取りこぼさない。
 */
function rangeConfig(
  key: RangeKey,
  today = new Date()
): {
  url: URL;
  start: string;
  end: string;
} {
  const end = fmtDate(today);

  if (key === "1日") {
    const start = new Date(today);
    start.setDate(start.getDate() - 1);
    const url = new URL(`${API_BASE}/demo/prices/60d/5m/3350T`);
    return { url, start: fmtDate(start), end };
  }

  if (key === "5日") {
    const start = new Date(today);
    start.setDate(start.getDate() - 5);
    const url = new URL(`${API_BASE}/demo/prices/60d/15m/3350T`);
    return { url, start: fmtDate(start), end };
  }

  // 1ヶ月
  const start = new Date(today);
  start.setMonth(start.getMonth() - 1);
  const url = new URL(`${API_BASE}/demo/prices/max/1h/3350T`);
  return { url, start: fmtDate(start), end };
}

export default function Demo5mOneDayWithSwitcher() {
  const [range, setRange] = useState<RangeKey>("1日");
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // 取得
  useEffect(() => {
    const { url, start, end } = rangeConfig(range);
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        url.searchParams.set("start", start);
        url.searchParams.set("end", end); // ★ 時刻は付けない（サーバで翌日未満扱い）

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
  }, [range]);

  // LWCに渡すデータ
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

  // チャート初期化（ja-JP ロケール）
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

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
      height: 480,
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
      handleScale: { mouseWheel: false },
      localization: {
        locale: "ja-JP",
        priceFormatter: (p: number) => nfPrice.format(p),
        timeFormatter: (t: UTCTimestamp | BusinessDay) => formatLwcTime(t),
      },
    });
    chartRef.current = chart;

    // ローソク
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

    // 出来高
    chart.priceScale("right").applyOptions({
      scaleMargins: { top: 0.05, bottom: 0.25 },
    });

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
  }, []);

  // データ適用
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current || !volRef.current) return;
    seriesRef.current.setData(candles);
    volRef.current.setData(volumes);
    chartRef.current.timeScale().fitContent();
  }, [candles, volumes]);

  // スイッチャー
  const RangeSwitcher = (
    <div className="inline-flex items-center gap-1 rounded-full border px-1 py-1">
      {RANGE_LABELS.map((key) => {
        const active = key === range;
        return (
          <button
            key={key}
            onClick={() => setRange(key)}
            className={[
              "px-3 py-1 text-xs rounded-full transition-colors",
              active
                ? "bg-foreground text-background"
                : "hover:bg-black/5 dark:hover:bg-white/10",
            ].join(" ")}
          >
            {key}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 text-sm text-neutral-500">
        <div>
          {loading
            ? "読み込み中…"
            : err
            ? `エラー: ${err}`
            : `3350.T — ${range}`}
        </div>
        {RangeSwitcher}
      </div>
      <div
        ref={containerRef}
        className="border rounded-xl p-4"
        style={{ width: "100%", height: 480 }}
      />
    </div>
  );
}
