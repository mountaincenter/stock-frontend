// hover_card_chart.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  createChart,
  ColorType,
  LineSeries,
  type IChartApi,
  type Time,
  type LineData as LwcLineData,
  type LineSeriesPartialOptions,
  type BusinessDay,
} from "lightweight-charts";

type PriceRec = {
  date: string; // "YYYY-MM-DD"
  Close: number;
  ticker: string;
};

type FetchState = "idle" | "loading" | "success" | "error";

export interface HoverCardChartProps {
  /** 例: "7203.T" */
  ticker: string;
  /** 例: "トヨタ自動車"（任意） */
  stockName?: string;
  /** API ベースURL（省略時は NEXT_PUBLIC_API_BASE_URL） */
  apiBase?: string;
  /** 取得する日数（既定 120） */
  days?: number;
  /** ホバートリガー（例: <span>7203 トヨタ</span>） */
  children: React.ReactNode;
}

const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

function parseBusinessDay(ymd: string): BusinessDay | null {
  // "YYYY-MM-DD"
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  return {
    year: Number(m[1]),
    month: Number(m[2]) as BusinessDay["month"],
    day: Number(m[3]) as BusinessDay["day"],
  };
}

function toLineData(arr: PriceRec[]): LwcLineData<Time>[] {
  const out: LwcLineData<Time>[] = [];
  for (const r of arr) {
    if (!Number.isFinite(r.Close)) continue;
    const bd = parseBusinessDay(r.date);
    if (!bd) continue;
    out.push({ time: bd, value: r.Close as number });
  }
  return out;
}

export function HoverCardChart({
  ticker,
  stockName,
  apiBase,
  days = 120,
  children,
}: HoverCardChartProps) {
  const base = useMemo(
    () => apiBase ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
    [apiBase]
  );
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<FetchState>("idle");
  const [data, setData] = useState<PriceRec[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const lineRef = useRef<ReturnType<IChartApi["addSeries"]> | null>(null);
  const fetchedRef = useRef(false);
  const roRef = useRef<ResizeObserver | null>(null);

  // 色など（あなたの実装に寄せる）
  const style = useMemo(() => {
    const paper = isDark ? "#0b0b0c" : "#ffffff";
    const text = isDark ? "#e5e7eb" : "#111827";
    const grid = isDark ? "#303034" : "#e5e7eb";
    const colClose = isDark ? "#e5e7eb" : "#111827";
    return { paper, text, grid, colClose };
  }, [isDark]);

  // 開閉コールバック
  const handleOpenChange = useCallback(
    async (next: boolean) => {
      setOpen(next);
      if (!next) return;

      // 初回だけフェッチ
      if (!fetchedRef.current) {
        fetchedRef.current = true;
        try {
          setStatus("loading");
          const end = new Date();
          const start = new Date();
          start.setDate(end.getDate() - days);

          const url = `${base}/core30/prices/1d?ticker=${encodeURIComponent(
            ticker
          )}&start=${toYMD(start)}&end=${toYMD(end)}`;
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = (await res.json()) as PriceRec[];
          setData(Array.isArray(json) ? json : []);
          setStatus("success");
        } catch (e) {
          console.error(e);
          setStatus("error");
        }
      }
    },
    [base, ticker, days]
  );

  // open時にチャート作成、close時に破棄（HoverCardのライフサイクルに合わせる）
  useEffect(() => {
    const el = containerRef.current;
    if (!open || !el) return;

    // 念のため既存破棄
    try {
      chartRef.current?.remove();
    } catch {}
    chartRef.current = null;
    lineRef.current = null;

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: style.text,
      },
      width: el.clientWidth || 320,
      height: 120,
      grid: {
        vertLines: { color: "transparent" },
        horzLines: { color: "transparent" },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: false,
        secondsVisible: false,
      },
      rightPriceScale: { borderVisible: false, visible: false },
      leftPriceScale: { borderVisible: false, visible: false },
      handleScroll: { mouseWheel: false, pressedMouseMove: false },
      handleScale: {
        axisPressedMouseMove: false,
        mouseWheel: false,
        pinch: false,
      },
      crosshair: { vertLine: { visible: false }, horzLine: { visible: false } },
    });
    chartRef.current = chart;

    const opt: LineSeriesPartialOptions = {
      color: style.colClose,
      lineWidth: 2,
    };
    const line = chart.addSeries(LineSeries, opt);
    lineRef.current = line;

    // すでにデータがあれば即反映
    if (status === "success" && data.length > 0) {
      line.setData(toLineData(data));
      chart.timeScale().fitContent();
    }

    // リサイズ監視（open中のみ）
    const ro = new ResizeObserver((entries) => {
      const w = Math.max(160, Math.floor(entries[0].contentRect.width));
      chart.applyOptions({ width: w });
    });
    ro.observe(el);
    roRef.current = ro;

    return () => {
      try {
        roRef.current?.disconnect();
      } catch {}
      roRef.current = null;
      try {
        chart.remove();
      } catch {}
      chartRef.current = null;
      lineRef.current = null;
    };
  }, [open, style, status, data]);

  // データ到着後、チャートが存在するなら描画
  useEffect(() => {
    if (!open) return;
    if (status !== "success") return;
    if (!chartRef.current || !lineRef.current) return;

    lineRef.current.setData(toLineData(data));
    chartRef.current.timeScale().fitContent();
  }, [open, status, data]);

  // 前日比
  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  const close = last?.Close ?? null;
  const diff = close != null && prev?.Close != null ? close - prev.Close : null;
  const pct = diff != null && prev?.Close ? (diff / prev.Close) * 100 : null;

  return (
    <HoverCard openDelay={120} closeDelay={70} onOpenChange={handleOpenChange}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-80 space-y-3">
        <div className="text-sm font-medium text-white line-clamp-2">
          {stockName ?? ticker}
        </div>

        <div className="rounded-lg border border-slate-700/60 bg-slate-900/50 p-2">
          {/* content が mount された時点で ref が入る */}
          <div ref={containerRef} className="h-[120px] w-full" />
        </div>

        <div className="text-xs text-slate-300">
          {status === "idle" && "ホバーでプレビューを読み込みます…"}
          {status === "loading" && "読み込み中…"}
          {status === "error" && (
            <span className="text-red-300">プレビューの取得に失敗しました</span>
          )}
          {status === "success" && close != null && (
            <div className="flex items-center justify-between">
              <span>
                終値:{" "}
                <span className="font-mono">{close.toLocaleString()}</span>
              </span>
              {diff != null && pct != null && (
                <span
                  className={diff >= 0 ? "text-emerald-300" : "text-rose-300"}
                >
                  {diff >= 0 ? "+" : ""}
                  {diff.toFixed(0)} ({pct.toFixed(2)}%)
                </span>
              )}
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
