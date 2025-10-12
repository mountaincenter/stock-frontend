// app/[ticker]/hooks/useTickerData.ts
import { useState, useEffect } from "react";
import { rangeConfigs, RangeKey } from "../config/chartRangeConfig";
import { fmtDate } from "../lib/chart-helpers";
import { buildApiUrl } from "@/lib/api-base";

// Get the most recent trading day by trying to fetch data
// Falls back up to 7 days to handle weekends and holidays
async function getLatestTradingDay(ticker: string): Promise<string | null> {
  const today = new Date();

  // Try each day going back up to 7 days
  for (let i = 0; i < 7; i++) {
    const testDate = new Date(today);
    testDate.setDate(testDate.getDate() - i);

    const year = testDate.getFullYear();
    const month = String(testDate.getMonth() + 1).padStart(2, "0");
    const day = String(testDate.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    try {
      const params = new URLSearchParams({
        ticker,
        interval: "1d",
        start: dateStr,
        end: dateStr,
      });

      const url = buildApiUrl(`/prices?${params.toString()}`);
      const res = await fetch(url, { cache: "no-store" });

      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json) && json.length > 0) {
          return dateStr;
        }
      }
    } catch (_e) {
      // Continue to next date
    }
  }

  return null;
}

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

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        // Get the latest trading day
        const latestDay = await getLatestTradingDay(ticker);
        if (!latestDay) {
          throw new Error("No trading data available");
        }

        const latestDate = new Date(latestDay);
        const config = rangeConfigs[activeRange];
        const start = config.getStart(latestDate);
        const end = config.isIntraday && config.getEnd ? config.getEnd(latestDate) : fmtDate(latestDate);

        // For MA75 calculation, we need at least 75 data points before the display range
        // Fetch extra data for short-term charts (1d, 5d)
        let fetchStart = start;
        if (config.isIntraday && (activeRange === "r_5d" || activeRange === "r_1mo")) {
          const extendedDate = new Date(latestDate);
          // Get approximately 100 days of data for MA calculation
          extendedDate.setDate(extendedDate.getDate() - 100);
          fetchStart = fmtDate(extendedDate);
        }

        const search = new URLSearchParams();
        search.set("ticker", ticker);
        search.set("interval", config.interval);
        const startValue = fetchStart ?? (activeRange === "r_all" ? "1900-01-01" : undefined);
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
