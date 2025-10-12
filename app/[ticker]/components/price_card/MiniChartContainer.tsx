// app/[ticker]/components/price_card/MiniChartContainer.tsx
"use client";

import React, { useState, useEffect } from "react";
import { buildApiUrl } from "@/lib/api-base";
import { fmtDate } from "../../lib/chart-helpers";
import MiniSparkline, { type PeriodKey, type MiniChartData } from "./MiniSparkline";

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

interface MiniChartContainerProps {
  ticker: string;
  currentPrice: number | null;
  percentChange: number | null;
  prevClose: number | null;
}

// Period configuration matching chartRangeConfig.ts
const PERIODS: {
  key: PeriodKey;
  label: string;
  interval: string;
  getStart: (latestTradingDay: Date) => string;
  getEnd: (latestTradingDay: Date) => string;
  isIntraday: boolean;
}[] = [
  {
    key: "1d",
    label: "1日",
    interval: "5m",
    isIntraday: true,
    getStart: (latestTradingDay) => {
      // Use the latest trading day directly
      return fmtDate(latestTradingDay);
    },
    getEnd: (latestTradingDay) => {
      return fmtDate(latestTradingDay);
    },
  },
  {
    key: "5d",
    label: "5日",
    interval: "15m",
    isIntraday: true,
    getStart: (latestTradingDay) => {
      const d = new Date(latestTradingDay);
      d.setDate(d.getDate() - 7); // Extra buffer for weekends
      return fmtDate(d);
    },
    getEnd: (latestTradingDay) => {
      return fmtDate(latestTradingDay);
    },
  },
  {
    key: "1mo",
    label: "1ヶ月",
    interval: "1h",
    isIntraday: true,
    getStart: (latestTradingDay) => {
      const d = new Date(latestTradingDay);
      d.setMonth(d.getMonth() - 1);
      return fmtDate(d);
    },
    getEnd: (latestTradingDay) => {
      return fmtDate(latestTradingDay);
    },
  },
  {
    key: "1y",
    label: "1年",
    interval: "1d",
    isIntraday: false,
    getStart: (latestTradingDay) => {
      const d = new Date(latestTradingDay);
      d.setFullYear(d.getFullYear() - 1);
      return fmtDate(d);
    },
    getEnd: (latestTradingDay) => {
      return fmtDate(latestTradingDay);
    },
  },
];

export default function MiniChartContainer({
  ticker,
  currentPrice,
  percentChange,
  prevClose,
}: MiniChartContainerProps) {
  const [activePeriod, setActivePeriod] = useState<PeriodKey>("5d");
  const [data, setData] = useState<MiniChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const config = PERIODS.find((p) => p.key === activePeriod);
        if (!config) throw new Error("Invalid period");

        // Get the latest trading day
        const latestDay = await getLatestTradingDay(ticker);
        if (!latestDay) {
          throw new Error("No trading data available");
        }

        const latestDate = new Date(latestDay);

        // Build API URL using latest trading day
        const params = new URLSearchParams({
          ticker,
          interval: config.interval,
          start: config.getStart(latestDate),
          end: config.getEnd(latestDate),
        });

        const url = buildApiUrl(`/prices?${params.toString()}`);
        const res = await fetch(url, { cache: "no-store" });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();

        // Transform to MiniChartData (OHLC)
        const chartData: MiniChartData[] = (
          json as Array<{
            date?: string;
            Open?: number;
            High?: number;
            Low?: number;
            Close?: number;
          }>
        )
          .filter((row) => row.date && row.Open != null && row.High != null && row.Low != null && row.Close != null)
          .map((row) => ({
            date: row.date as string,
            open: Number(row.Open),
            high: Number(row.High),
            low: Number(row.Low),
            close: Number(row.Close),
          }))
          .filter((d) => !isNaN(d.open) && !isNaN(d.high) && !isNaN(d.low) && !isNaN(d.close));

        // Sort by date
        chartData.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

        setData(chartData);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
        setLoading(false);
        setData([]);
      }
    };

    fetchData();
  }, [ticker, activePeriod]);

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Period Selector */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/30 border border-border/30">
        {PERIODS.map((period) => {
          const isActive = activePeriod === period.key;
          return (
            <button
              key={period.key}
              onClick={() => setActivePeriod(period.key)}
              className={`
                flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-200
                ${
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }
              `}
            >
              {period.label}
            </button>
          );
        })}
      </div>

      {/* Chart Area */}
      <div className="flex-1 relative min-h-[220px] rounded-xl border border-border/30 bg-gradient-to-br from-muted/10 via-muted/5 to-transparent overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <div className="text-xs text-muted-foreground">Loading...</div>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-xs text-destructive/70">エラー: {error}</div>
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <MiniSparkline
            data={data}
            periodKey={activePeriod}
            currentPrice={currentPrice}
            percentChange={percentChange}
            prevClose={prevClose}
          />
        )}

        {!loading && !error && data.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-xs text-muted-foreground/50">データがありません</div>
          </div>
        )}
      </div>
    </div>
  );
}
