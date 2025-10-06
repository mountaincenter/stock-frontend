"use client";

// ───────────────────────────────────────────────────────────────────────
// TickerDailyChart.tsx - 範囲スイッチャー対応版（時間足・日足統合）
// ───────────────────────────────────────────────────────────────────────
// ■ 機能:
//   - perfItems をクリック可能な範囲スイッチャーとして機能
//   - 1日=5分足、5日=15分足、1ヶ月=1時間足、それ以降=日足
//   - ツールチップで OHLC 表示
//   - 時間足エラー対策（demo_lwc 方式採用）
// ───────────────────────────────────────────────────────────────────────

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
  UTCTimestamp,
  BusinessDay,
} from "lightweight-charts";

// ───────────────────────────────────────────────
// 型定義
// ───────────────────────────────────────────────
type PriceRow = {
  date: string; // ISO形式 "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ss"
  Open: number;
  High: number;
  Low: number;
  Close: number;
  Volume?: number | null;
  ticker?: string;
};

type Perf =
  | (Record<string, number | string | null> & {
      ticker: string;
      date: string;
    })
  | undefined;

type RangeKey =
  | "r_5d"
  | "r_1mo"
  | "r_3mo"
  | "r_ytd"
  | "r_1y"
  | "r_3y"
  | "r_5y"
  | "r_all";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

// ───────────────────────────────────────────────
// ユーティリティ関数
// ───────────────────────────────────────────────
function fmtDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function toUtcSeconds(t: string): number {
  return Math.floor(new Date(t).getTime() / 1000);
}

// LWC時間フォーマッター
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

function formatLwcTime(t: UTCTimestamp | BusinessDay): string {
  if (typeof t === "number") {
    return dfDateTime.format(new Date(t * 1000));
  }
  const { year, month, day } = t;
  return dfDateOnly.format(new Date(year, month - 1, day));
}

// ───────────────────────────────────────────────
// 範囲設定（demo_lwc方式を踏襲）
// ───────────────────────────────────────────────
type RangeConfig = {
  period: string;
  interval: string;
  label: string;
  isIntraday: boolean; // 時間足フラグ
  getStart: (today: Date) => string | undefined;
  getEnd?: (today: Date) => string; // 時間足用の終了時刻
};

const rangeConfigs: Record<RangeKey, RangeConfig> = {
  r_5d: {
    period: "60d",
    interval: "5m",
    label: "1日（5分足）",
    isIntraday: true,
    getStart: (today) => {
      const d = new Date(today);
      d.setDate(d.getDate() - 1);
      return fmtDate(d);
    },
    getEnd: (today) => {
      return fmtDate(today);
    },
  },
  r_1mo: {
    period: "60d",
    interval: "15m",
    label: "5日（15分足）",
    isIntraday: true,
    getStart: (today) => {
      const d = new Date(today);
      d.setDate(d.getDate() - 5);
      return fmtDate(d);
    },
    getEnd: (today) => {
      return fmtDate(today);
    },
  },
  r_3mo: {
    period: "730d",
    interval: "1h",
    label: "1ヶ月（1時間足）",
    isIntraday: true,
    getStart: (today) => {
      const d = new Date(today);
      d.setMonth(d.getMonth() - 1);
      return fmtDate(d);
    },
    getEnd: (today) => {
      return fmtDate(today);
    },
  },
  r_ytd: {
    period: "max",
    interval: "1d",
    label: "6ヶ月（日足）",
    isIntraday: false,
    getStart: (today) => {
      const d = new Date(today);
      d.setMonth(d.getMonth() - 6);
      return fmtDate(d);
    },
  },
  r_1y: {
    period: "max",
    interval: "1d",
    label: "年初来（日足）",
    isIntraday: false,
    getStart: (today) => {
      return fmtDate(new Date(today.getFullYear(), 0, 1));
    },
  },
  r_3y: {
    period: "max",
    interval: "1d",
    label: "1年（日足）",
    isIntraday: false,
    getStart: (today) => {
      const d = new Date(today);
      d.setFullYear(d.getFullYear() - 1);
      return fmtDate(d);
    },
  },
  r_5y: {
    period: "max",
    interval: "1d",
    label: "5年（日足）",
    isIntraday: false,
    getStart: (today) => {
      const d = new Date(today);
      d.setFullYear(d.getFullYear() - 5);
      return fmtDate(d);
    },
  },
  r_all: {
    period: "max",
    interval: "1d",
    label: "全期間（日足）",
    isIntraday: false,
    getStart: () => undefined, // 全期間 = startなし
  },
};

// ───────────────────────────────────────────────
// メインコンポーネント
// ───────────────────────────────────────────────
export default function TickerDailyChart({
  ticker,
  perf,
}: {
  ticker: string;
  perf?: Perf;
}) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = (resolvedTheme ?? theme) === "dark";

  const [activeRange, setActiveRange] = useState<RangeKey>("r_1y");
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // ───────────── データ取得 ─────────────
  useEffect(() => {
    if (!API_BASE || !ticker) return;

    const today = new Date();
    const config = rangeConfigs[activeRange];
    const start = config.getStart(today);
    // 時間足の場合は時刻付き終了時刻、日足の場合は日付のみ
    const end =
      config.isIntraday && config.getEnd
        ? config.getEnd(today)
        : fmtDate(today);

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const url = new URL(`${API_BASE}/core30/prices`);
        url.searchParams.set("ticker", ticker);
        url.searchParams.set("period", config.period);
        url.searchParams.set("interval", config.interval);
        if (start) url.searchParams.set("start", start);
        url.searchParams.set("end", end);

        const r = await fetch(url.toString(), { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = (await r.json()) as PriceRow[];

        j.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
        setRows(j);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "fetch error");
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [ticker, activeRange]);

  // ───────────── テーマ配色 ─────────────
  const style = useMemo(() => {
    const paper = isDark ? "#0b0b0c" : "#ffffff";
    const text = isDark ? "#e5e7eb" : "#111827";
    const grid = isDark ? "#303034" : "#e5e7eb";
    const up = isDark ? "#34d399" : "#059669";
    const down = isDark ? "#f87171" : "#dc2626";
    const cross = isDark ? "#6b7280" : "#9ca3af";
    return { paper, text, grid, up, down, cross };
  }, [isDark]);

  const candleData = useMemo<LwcCandleData<Time>[]>(() => {
    // 時刻重複を排除（同一時刻は最新データを優先）
    const map = new Map<number, LwcCandleData<Time>>();
    rows.forEach((r) => {
      const ts = toUtcSeconds(r.date);
      map.set(ts, {
        time: ts as Time,
        open: r.Open,
        high: r.High,
        low: r.Low,
        close: r.Close,
      });
    });

    // 時刻昇順でソート（lightweight-chartsの要件）
    return Array.from(map.values()).sort((a, b) => {
      const timeA = typeof a.time === "number" ? a.time : 0;
      const timeB = typeof b.time === "number" ? b.time : 0;
      return timeA - timeB;
    });
  }, [rows]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ReturnType<IChartApi["addSeries"]> | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  // ツールチップ用状態
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
  } | null>(null);

  // ───────────── チャート初期化 ─────────────
  useEffect(() => {
    if (!mounted) return;
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
      crosshair: {
        vertLine: { color: style.cross },
        horzLine: { color: style.cross },
      },
      localization: {
        locale: "ja-JP",
        priceFormatter: (p: number) =>
          new Intl.NumberFormat("ja-JP", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 6,
          }).format(p),
        timeFormatter: (t: UTCTimestamp | BusinessDay) => formatLwcTime(t),
      },
      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: false,
        horzTouchDrag: false,
        vertTouchDrag: false,
      },
      handleScale: {
        mouseWheel: false,
        pinch: false,
        axisPressedMouseMove: false,
        axisDoubleClickReset: false,
      },
    });
    chartRef.current = chart;

    const opts: CandlestickSeriesPartialOptions = {
      upColor: style.up,
      downColor: style.down,
      borderUpColor: style.up,
      borderDownColor: style.down,
      wickUpColor: style.up,
      wickDownColor: style.down,
      priceLineVisible: true,
    };
    const series = chart.addSeries(CandlestickSeries, opts);
    seriesRef.current = series;

    // ツールチップハンドラー（crosshair移動時）
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point) {
        setTooltip(null);
        return;
      }

      const data = param.seriesData.get(series) as
        | LwcCandleData<Time>
        | undefined;
      if (!data) {
        setTooltip(null);
        return;
      }

      const timeStr = formatLwcTime(param.time as UTCTimestamp | BusinessDay);

      setTooltip({
        visible: true,
        x: param.point.x,
        y: param.point.y,
        time: timeStr,
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close,
      });
    });

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
  }, [mounted, style]);

  // ───────────── データ適用 ─────────────
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return;
    seriesRef.current.setData(candleData);
    chartRef.current.timeScale().fitContent();
  }, [candleData]);

  // ───────────── パフォーマンス表示用 ─────────────
  const nf2 = useMemo(
    () =>
      new Intl.NumberFormat("ja-JP", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );
  const toneBySign = (v: number | null | undefined) =>
    typeof v === "number"
      ? v > 0
        ? "text-emerald-400"
        : v < 0
        ? "text-rose-400"
        : "text-muted-foreground"
      : "text-muted-foreground";

  const perfItems: Array<{
    key: RangeKey;
    label: string;
    value: number | null | undefined;
  }> = [
    {
      key: "r_5d",
      label: "1日",
      value: perf?.["r_5d"] as number | null | undefined,
    },
    {
      key: "r_1mo",
      label: "5日",
      value: perf?.["r_1mo"] as number | null | undefined,
    },
    {
      key: "r_3mo",
      label: "1ヶ月",
      value: perf?.["r_3mo"] as number | null | undefined,
    },
    {
      key: "r_ytd",
      label: "6ヶ月",
      value: perf?.["r_ytd"] as number | null | undefined,
    },
    {
      key: "r_1y",
      label: "年初来",
      value: perf?.["r_1y"] as number | null | undefined,
    },
    {
      key: "r_3y",
      label: "1年",
      value: perf?.["r_3y"] as number | null | undefined,
    },
    {
      key: "r_5y",
      label: "5年",
      value: perf?.["r_5y"] as number | null | undefined,
    },
    {
      key: "r_all",
      label: "全期間",
      value: perf?.["r_all"] as number | null | undefined,
    },
  ];

  const nfOhlc = useMemo(
    () =>
      new Intl.NumberFormat("ja-JP", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }),
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <div className="text-base font-medium text-muted-foreground/80">
          {loading ? (
            "読み込み中…"
          ) : err ? (
            <span className="text-red-500">エラー: {err}</span>
          ) : (
            `${ticker} - ${rangeConfigs[activeRange].label}`
          )}
        </div>
        {perf?.date && (
          <div className="text-xs text-muted-foreground/60">
            基準日: {perf.date}
          </div>
        )}
      </div>

      <div className="relative">
        <div
          ref={containerRef}
          className="border rounded-xl p-3 bg-background"
          style={{ width: "100%", height: 520 }}
        />

        {/* カスタムツールチップ */}
        {tooltip && tooltip.visible && (
          <div
            ref={tooltipRef}
            className="absolute pointer-events-none z-50 rounded-lg border border-border/80 bg-background/95 backdrop-blur-sm shadow-xl px-3 py-2.5"
            style={{
              left: Math.min(tooltip.x + 12, window.innerWidth - 200),
              top: Math.max(tooltip.y - 120, 10),
            }}
          >
            <div className="text-xs font-medium text-muted-foreground/80 mb-1.5">
              {tooltip.time}
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <div className="text-muted-foreground/70">始値</div>
              <div className="font-semibold font-sans tabular-nums text-right">
                {nfOhlc.format(tooltip.open)}
              </div>
              <div className="text-muted-foreground/70">高値</div>
              <div className="font-semibold font-sans tabular-nums text-right text-emerald-400">
                {nfOhlc.format(tooltip.high)}
              </div>
              <div className="text-muted-foreground/70">安値</div>
              <div className="font-semibold font-sans tabular-nums text-right text-rose-400">
                {nfOhlc.format(tooltip.low)}
              </div>
              <div className="text-muted-foreground/70">終値</div>
              <div
                className={`font-bold font-sans tabular-nums text-right ${
                  tooltip.close >= tooltip.open
                    ? "text-emerald-400"
                    : "text-rose-400"
                }`}
              >
                {nfOhlc.format(tooltip.close)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 範囲スイッチャー（perfItems） */}
      <div className="mt-4">
        <div className="text-sm font-medium text-muted-foreground/80 mb-2">
          パフォーマンス＆範囲選択
        </div>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {perfItems.map(({ key, label, value }) => {
            const isActive = activeRange === key;
            return (
              <button
                key={key}
                onClick={() => setActiveRange(key)}
                className={`
                  rounded-lg border px-3 py-2.5 flex flex-col items-center justify-center
                  transition-all cursor-pointer
                  ${
                    isActive
                      ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-md"
                      : "border-border/50 bg-background hover:border-border hover:shadow-sm"
                  }
                `}
              >
                <div
                  className={`text-xs font-medium mb-1 ${
                    isActive ? "text-primary" : "text-muted-foreground/70"
                  }`}
                >
                  {label}
                </div>
                <div
                  className={`text-base font-bold font-sans tabular-nums ${
                    isActive
                      ? "text-primary"
                      : toneBySign(value as number | null)
                  }`}
                >
                  {typeof value === "number" && Number.isFinite(value)
                    ? `${value > 0 ? "+" : ""}${nf2.format(value)}%`
                    : "—"}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
