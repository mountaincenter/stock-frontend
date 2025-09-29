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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ========= 型 ========= */
type MetaItem = { code: string; stock_name: string; ticker: string };
type PriceRow = {
  date: string; // "YYYY-MM-DD"
  Open: number;
  High: number;
  Low: number;
  Close: number;
  Volume?: number;
  ticker: string;
};

/* ========= 環境変数 ========= */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!;

/* ========= ユーティリティ ========= */
function fmt(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/* ========= メインコンポーネント ========= */
export default function Core30LwcPrices() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [meta, setMeta] = useState<MetaItem[]>([]);
  const [ticker, setTicker] = useState<string | undefined>(undefined);
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Core30 メタ（Select用）
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/core30/meta`, { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j: MetaItem[] = await r.json();
        setMeta(j);
        if (!ticker && j.length) setTicker(j[0].ticker);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "meta fetch error");
      } finally {
        setLoadingMeta(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 選択銘柄の直近1年の価格（バックエンドのクエリAPIを利用）
  useEffect(() => {
    if (!ticker) return;
    const today = new Date();
    const start = new Date(today);
    start.setFullYear(today.getFullYear() - 1);
    const startStr = fmt(start);
    const endStr = fmt(today);

    setLoading(true);
    setErr(null);

    (async () => {
      try {
        const url = new URL(`${API_BASE}/core30/prices/1d`);
        url.searchParams.set("ticker", ticker);
        url.searchParams.set("start", startStr);
        url.searchParams.set("end", endStr);
        const r = await fetch(url.toString(), { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j: PriceRow[] = await r.json();
        j.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
        setRows(j);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "prices fetch error");
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [ticker]);

  // 軸/色などのテーマ設定
  const style = useMemo(() => {
    const paper = isDark ? "#0b0b0c" : "#ffffff";
    const text = isDark ? "#e5e7eb" : "#111827";
    const grid = isDark ? "#303034" : "#e5e7eb";
    const up = isDark ? "#34d399" : "#059669";
    const down = isDark ? "#f87171" : "#dc2626";
    return { paper, text, grid, up, down };
  }, [isDark]);

  // LWC 用データに変換
  const candleData = useMemo<LwcCandleData<Time>[]>(() => {
    return rows.map((r) => ({
      time: r.date as unknown as Time, // "YYYY-MM-DD" 文字列でOK
      open: r.Open,
      high: r.High,
      low: r.Low,
      close: r.Close,
    }));
  }, [rows]);

  // セレクト用 options
  const options = useMemo(
    () =>
      meta.map((m) => ({
        value: m.ticker,
        label: `${m.ticker} — ${m.stock_name}`,
      })),
    [meta]
  );

  /* ====== チャート描画（LWC） ====== */
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ReturnType<IChartApi["addSeries"]> | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  // 初期化 & テーマ変更時の再作成
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // 既存を破棄
    try {
      roRef.current?.disconnect();
      chartRef.current?.remove();
    } catch {
      /* noop */
    }
    chartRef.current = null;
    seriesRef.current = null;
    roRef.current = null;

    // 新規作成
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

    // 親幅に追従
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

  // データの差し替え（シリーズを作り直さず setData のみ）
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return;
    seriesRef.current.setData(candleData);
    chartRef.current.timeScale().fitContent();
  }, [candleData]);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3">
        <label className="text-sm text-muted-foreground">銘柄</label>
        <Select
          value={ticker}
          onValueChange={(v) => setTicker(v)}
          disabled={loadingMeta}
        >
          <SelectTrigger className="w-[340px]">
            <SelectValue
              placeholder={loadingMeta ? "読み込み中…" : "銘柄を選択"}
            />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {loading && (
          <span className="text-sm text-muted-foreground">読込中…</span>
        )}
        {err && <span className="text-sm text-red-500">エラー: {err}</span>}
      </div>

      <div
        ref={containerRef}
        className="border rounded-xl p-4"
        style={{ width: "100%", height: 520 }}
      />
    </div>
  );
}
