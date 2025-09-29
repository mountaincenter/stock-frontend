"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Layout, CandlestickData } from "plotly.js";
import { useTheme } from "next-themes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ★ ここを修正：サーバでは評価させない
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!;

function fmt(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default function Core30Prices() {
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
      } catch (e: any) {
        setErr(e?.message ?? "meta fetch error");
      } finally {
        setLoadingMeta(false);
      }
    })();
  }, []); // eslint-disable-line

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
      } catch (e: any) {
        setErr(e?.message ?? "prices fetch error");
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [ticker]); // eslint-disable-line

  // レイアウト（ダーク対応）— title は { text: string } で型に準拠
  const layout = useMemo<Partial<Layout>>(() => {
    const paper = isDark ? "#0b0b0c" : "#ffffff";
    const text = isDark ? "#e5e7eb" : "#111827";
    const grid = isDark ? "#303034" : "#e5e7eb";
    return {
      title: { text: `${ticker ?? ""} — 直近1年（1D）` },
      margin: { t: 48, r: 16, b: 32, l: 48 },
      height: 520,
      paper_bgcolor: paper,
      plot_bgcolor: paper,
      font: { color: text },
      xaxis: { showgrid: true, gridcolor: grid, tickformat: "%Y-%m-%d" },
      yaxis: { showgrid: true, gridcolor: grid },
      dragmode: "pan",
    };
  }, [ticker, isDark]);

  // ローソク足トレース
  const candleTrace = useMemo<Partial<CandlestickData>>(() => {
    const x = rows.map((r) => r.date);
    const open = rows.map((r) => r.Open);
    const high = rows.map((r) => r.High);
    const low = rows.map((r) => r.Low);
    const close = rows.map((r) => r.Close);
    const inc = isDark ? "#34d399" : "#059669";
    const dec = isDark ? "#f87171" : "#dc2626";
    return {
      type: "candlestick",
      x,
      open,
      high,
      low,
      close,
      increasing: { line: { color: inc } },
      decreasing: { line: { color: dec } },
      name: "OHLC",
    };
  }, [rows, isDark]);

  const options = useMemo(
    () =>
      meta.map((m) => ({
        value: m.ticker,
        label: `${m.ticker} — ${m.stock_name}`,
      })),
    [meta]
  );

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

      <div className="border rounded-xl p-4">
        <Plot
          data={[candleTrace as any]}
          layout={layout as any}
          config={{ displayModeBar: true }}
          style={{ width: "100%", height: 520 }}
          useResizeHandler
        />
      </div>
    </div>
  );
}
