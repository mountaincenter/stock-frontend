// app/dev/stock-results/[ticker]/review/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReviewChart, { type PriceRow, type Signal } from "./ReviewChart";
import SignalTable from "./SignalTable";
import { buildApiUrl } from "@/lib/api-base";
import { calculateRSI } from "@/app/[ticker]/lib/indicators";

// Aggregate 1m data to 5m candlesticks by actual time slots
function aggregateTo5m(data1m: PriceRow[]): PriceRow[] {
  if (data1m.length === 0) return [];

  const grouped = new Map<string, PriceRow[]>();

  data1m.forEach((row) => {
    const dateStr = row.date.replace(" ", "T");
    const date = new Date(dateStr);
    const minutes = date.getMinutes();
    const slotMinutes = Math.floor(minutes / 5) * 5;
    date.setMinutes(slotMinutes, 0, 0);
    const slotKey = date.toISOString();

    if (!grouped.has(slotKey)) grouped.set(slotKey, []);
    grouped.get(slotKey)!.push(row);
  });

  const result: PriceRow[] = [];
  grouped.forEach((chunk) => {
    result.push({
      date: chunk[0].date,
      Open: chunk[0].Open,
      High: Math.max(...chunk.map((c) => c.High)),
      Low: Math.min(...chunk.map((c) => c.Low)),
      Close: chunk[chunk.length - 1].Close,
      Volume: chunk.reduce((sum, c) => sum + (c.Volume ?? 0), 0),
    });
  });

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

// Find RSI signals
function findSignals(
  data: PriceRow[],
  rsiValues: (number | null)[],
  maxEntryHour: number = 14
): Signal[] {
  const signals: Signal[] = [];

  for (let i = 1; i < data.length; i++) {
    const prevRsi = rsiValues[i - 1];
    const currRsi = rsiValues[i];

    if (prevRsi === null || currRsi === null) continue;

    // Parse time for entry filter
    const timeStr = data[i].date;
    const hour = parseInt(timeStr.split(" ")[1]?.split(":")[0] ?? "0", 10);

    // Entry: RSI was > 70, now falling
    if (prevRsi > 70 && currRsi < prevRsi && hour <= maxEntryHour) {
      signals.push({
        time: data[i].date,
        type: "entry",
        price: data[i].Close,
        rsi: currRsi,
      });
    }

    // Exit: RSI crosses below 30
    if (prevRsi >= 30 && currRsi < 30) {
      signals.push({
        time: data[i].date,
        type: "exit",
        price: data[i].Close,
        rsi: currRsi,
      });
    }
  }

  return signals;
}

type DateOption = {
  value: string;
  label: string;
};

export default function ReviewPage() {
  const params = useParams();
  const ticker = decodeURIComponent(params.ticker as string);

  const [allData, setAllData] = useState<PriceRow[]>([]);
  const [is1mMode, setIs1mMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [stockName, setStockName] = useState<string>("");

  // Get available dates (sorted descending)
  const availableDates = useMemo<DateOption[]>(() => {
    const dateSet = new Set<string>();
    allData.forEach((row) => {
      const datePart = row.date.split(" ")[0].split("T")[0];
      dateSet.add(datePart);
    });
    return Array.from(dateSet)
      .sort((a, b) => b.localeCompare(a))
      .map((d) => ({ value: d, label: d }));
  }, [allData]);

  // Filter data by selected date
  const filteredData = useMemo(() => {
    if (!selectedDate) return [];
    return allData.filter((row) => {
      const datePart = row.date.split(" ")[0].split("T")[0];
      return datePart === selectedDate;
    });
  }, [allData, selectedDate]);

  // Convert to 5m if 1m mode
  const chartData = useMemo(() => {
    if (!is1mMode) return filteredData;
    return aggregateTo5m(filteredData);
  }, [filteredData, is1mMode]);

  // Calculate RSI (period 9, EMA method - 楽天MARKETSPEED compatible)
  const rsiValues = useMemo(() => {
    if (chartData.length === 0) return [];
    const closes = chartData.map((d) => d.Close);
    return calculateRSI(closes, 9);
  }, [chartData]);

  // Find signals
  const signals = useMemo(() => {
    return findSignals(chartData, rsiValues);
  }, [chartData, rsiValues]);

  // Fetch data
  useEffect(() => {
    if (!ticker) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      // Fetch stock name
      try {
        const metaUrl = buildApiUrl(`/stocks`);
        const metaRes = await fetch(metaUrl, { cache: "no-store" });
        if (metaRes.ok) {
          const metaData = await metaRes.json();
          if (Array.isArray(metaData)) {
            const found = metaData.find((s: { ticker: string }) => s.ticker === ticker);
            if (found) {
              setStockName(found.stock_name || "");
            }
          }
        }
      } catch {
        // Ignore
      }

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      // Try 1m data first
      try {
        const params1m = new URLSearchParams({
          ticker,
          interval: "1m",
          start: startDate.toISOString().split("T")[0],
          end: endDate.toISOString().split("T")[0],
        });

        const url1m = buildApiUrl(`/prices?${params1m.toString()}`);
        const res1m = await fetch(url1m, { cache: "no-store" });

        if (res1m.ok) {
          const data1m = (await res1m.json()) as PriceRow[];
          const validData = data1m.filter(
            (row) => row.Open > 0 && row.High > 0 && row.Low > 0 && row.Close > 0
          );

          if (validData.length > 0) {
            validData.sort((a, b) => a.date.localeCompare(b.date));
            setAllData(validData);
            setIs1mMode(true);

            const latestDate = validData[validData.length - 1].date.split(" ")[0].split("T")[0];
            setSelectedDate(latestDate);
            setLoading(false);
            return;
          }
        }
      } catch {
        // 1m failed, try 5m
      }

      // Fallback to 5m
      try {
        const params5m = new URLSearchParams({
          ticker,
          interval: "5m",
          start: startDate.toISOString().split("T")[0],
          end: endDate.toISOString().split("T")[0],
        });

        const url5m = buildApiUrl(`/prices?${params5m.toString()}`);
        const res5m = await fetch(url5m, { cache: "no-store" });

        if (!res5m.ok) {
          throw new Error(`HTTP ${res5m.status}`);
        }

        const data5m = (await res5m.json()) as PriceRow[];
        const validData = data5m.filter(
          (row) => row.Open > 0 && row.High > 0 && row.Low > 0 && row.Close > 0
        );

        if (validData.length === 0) {
          throw new Error("価格データがありません");
        }

        validData.sort((a, b) => a.date.localeCompare(b.date));
        setAllData(validData);
        setIs1mMode(false);

        const latestDate = validData[validData.length - 1].date.split(" ")[0].split("T")[0];
        setSelectedDate(latestDate);
      } catch (e) {
        setError(e instanceof Error ? e.message : "データ取得エラー");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [ticker]);

  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDate(e.target.value);
  }, []);

  if (loading) {
    return (
      <main className="relative flex flex-col min-h-screen overflow-hidden">
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
        </div>
        <div className="flex-1 py-8">
          <div className="w-full md:w-[92%] lg:w-[88%] mx-auto px-4">
            <div className="animate-pulse space-y-4">
              <div className="h-8 w-48 bg-muted/30 rounded" />
              <div className="h-[560px] bg-muted/30 rounded-xl" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="relative flex flex-col min-h-screen overflow-hidden">
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
        </div>
        <div className="flex-1 py-8">
          <div className="w-full md:w-[92%] lg:w-[88%] mx-auto px-4">
            <div className="p-6 rounded-xl border border-destructive/50 bg-destructive/10">
              <h2 className="text-lg font-semibold text-destructive mb-2">エラー</h2>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Link
                href={`/${ticker}`}
                className="mt-4 inline-flex items-center text-sm text-primary hover:underline"
              >
                ← 銘柄ページに戻る
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex flex-col min-h-screen overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-primary/8 via-primary/3 to-transparent blur-3xl" />
        <div className="absolute -bottom-1/3 -left-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-accent/10 via-accent/4 to-transparent blur-3xl" />
      </div>

      <div className="flex-1 py-4 md:py-6">
        <div className="w-full md:w-[95%] lg:w-[92%] xl:w-[88%] mx-auto px-3 md:px-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/${ticker}`}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                戻る
              </Link>
              <h1 className="text-xl font-bold">
                {ticker}{" "}
                {stockName && <span className="text-muted-foreground font-normal">{stockName}</span>}{" "}
                <span className="text-muted-foreground font-normal">RSIレビュー</span>
              </h1>
            </div>

            {/* Date selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">日付:</label>
              <select
                value={selectedDate}
                onChange={handleDateChange}
                className="px-3 py-1.5 rounded-lg bg-muted/30 border border-border/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {availableDates.map((date) => (
                  <option key={date.value} value={date.value}>
                    {date.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Chart */}
          <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-xl backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              {chartData.length > 0 ? (
                <ReviewChart data={chartData} rsiValues={rsiValues} signals={signals} />
              ) : (
                <div className="h-[560px] flex items-center justify-center text-muted-foreground">
                  データがありません
                </div>
              )}
            </div>
          </div>

          {/* Signal Table */}
          <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-xl backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <h2 className="text-lg font-semibold mb-4">機械判定シグナル (RSI&gt;70下落 → RSI&lt;30)</h2>
              <SignalTable signals={signals} />
            </div>
          </div>

          {/* Info */}
          <div className="text-xs text-muted-foreground text-center">
            {is1mMode ? (
              <>チャート: 5分足 ({chartData.length}本) | RSI(9) EMA方式 - 楽天MARKETSPEED互換</>
            ) : (
              <>5分足 ({chartData.length}本) | RSI(9) EMA方式</>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
