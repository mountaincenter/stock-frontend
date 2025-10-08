// app/[ticker]/hooks/useTickerData.ts
import { useState, useEffect } from "react";
import { rangeConfigs, RangeKey } from "../config/chartRangeConfig";
import { fmtDate } from "../lib/chart-helpers";
import { buildApiUrl } from "@/lib/api-base";

type PriceRow = {
  date: string; 
  Open: number;
  High: number;
  Low: number;
  Close: number;
  Volume?: number | null;
  ticker?: string;
};

export function useTickerData(ticker: string, activeRange: RangeKey) {
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!ticker) return;

    const today = new Date();
    const config = rangeConfigs[activeRange];
    const start = config.getStart(today);
    const end = config.isIntraday && config.getEnd ? config.getEnd(today) : fmtDate(today);

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const search = new URLSearchParams();
        search.set("ticker", ticker);
        search.set("interval", config.interval);
        const startValue = start ?? (activeRange === "r_all" ? "1900-01-01" : undefined);
        if (startValue) search.set("start", startValue);
        if (end && activeRange !== "r_all") search.set("end", end);

        const requestUrl = buildApiUrl(`/prices?${search.toString()}`);

        const r = await fetch(requestUrl, { cache: "no-store" });
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

  return { rows, loading, err };
}
