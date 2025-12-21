// app/[ticker]/demo/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import DemoChart, { type PriceRow } from "./DemoChart";
import PlaybackControls from "./PlaybackControls";
import TradingPanel, { type Positions, type Trade, type TradeMode } from "./TradingPanel";
import { usePlayback } from "./hooks/usePlayback";
import { buildApiUrl } from "@/lib/api-base";
import { calculateRSI } from "../lib/indicators";

// Calculate OHLC average price
function getOhlcAverage(row: PriceRow): number {
  return (row.Open + row.High + row.Low + row.Close) / 4;
}

// Aggregate 1m data to 5m candlesticks (for full dataset)
function aggregateTo5m(data1m: PriceRow[]): PriceRow[] {
  if (data1m.length === 0) return [];

  const result: PriceRow[] = [];

  for (let i = 0; i < data1m.length; i += 5) {
    const chunk = data1m.slice(i, Math.min(i + 5, data1m.length));
    if (chunk.length === 0) continue;

    const aggregated: PriceRow = {
      date: chunk[0].date, // Use first bar's timestamp
      Open: chunk[0].Open,
      High: Math.max(...chunk.map(c => c.High)),
      Low: Math.min(...chunk.map(c => c.Low)),
      Close: chunk[chunk.length - 1].Close,
      Volume: chunk.reduce((sum, c) => sum + (c.Volume ?? 0), 0),
    };
    result.push(aggregated);
  }

  return result;
}

// Aggregate 1m data to 5m candlesticks dynamically (includes forming bar)
// Groups by actual 5-minute time slots (9:00, 9:05, 9:10, etc.)
function aggregateTo5mDynamic(data1m: PriceRow[]): PriceRow[] {
  if (data1m.length === 0) return [];

  const grouped = new Map<string, PriceRow[]>();

  // Group by 5-minute slot based on actual time
  data1m.forEach(row => {
    // Parse date: "2025-01-15 09:01" or "2025-01-15T09:01:00"
    const dateStr = row.date.replace(' ', 'T');
    const date = new Date(dateStr);

    // Round down to 5-minute slot
    const minutes = date.getMinutes();
    const slotMinutes = Math.floor(minutes / 5) * 5;
    date.setMinutes(slotMinutes, 0, 0);

    const slotKey = date.toISOString();

    if (!grouped.has(slotKey)) grouped.set(slotKey, []);
    grouped.get(slotKey)!.push(row);
  });

  // Aggregate each group
  const result: PriceRow[] = [];
  grouped.forEach((chunk) => {
    result.push({
      date: chunk[0].date, // Use first bar's timestamp for the slot
      Open: chunk[0].Open,
      High: Math.max(...chunk.map(c => c.High)),
      Low: Math.min(...chunk.map(c => c.Low)),
      Close: chunk[chunk.length - 1].Close,
      Volume: chunk.reduce((sum, c) => sum + (c.Volume ?? 0), 0),
    });
  });

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

type DateOption = {
  value: string;
  label: string;
};

export default function DemoTradePage() {
  const params = useParams();
  const ticker = decodeURIComponent(params.ticker as string);

  // Raw data (1m or 5m depending on availability)
  const [allData, setAllData] = useState<PriceRow[]>([]);
  // Whether using 1m data (true) or fallback 5m (false)
  const [is1mMode, setIs1mMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [stockName, setStockName] = useState<string>("");

  // Trading state
  const [positions, setPositions] = useState<Positions>({ long: null, short: null });
  const [trades, setTrades] = useState<Trade[]>([]);

  // Get available dates from data (sorted descending)
  const availableDates = useMemo<DateOption[]>(() => {
    const dateSet = new Set<string>();
    allData.forEach((row) => {
      const datePart = row.date.split(" ")[0].split("T")[0];
      dateSet.add(datePart);
    });
    return Array.from(dateSet)
      .sort((a, b) => b.localeCompare(a))
      .map((d) => ({
        value: d,
        label: d,
      }));
  }, [allData]);

  // Filter raw data by selected date (for playback - 1m or 5m)
  const filteredData = useMemo(() => {
    if (!selectedDate) return [];
    return allData.filter((row) => {
      const datePart = row.date.split(" ")[0].split("T")[0];
      return datePart === selectedDate;
    });
  }, [allData, selectedDate]);

  // Playback hook - must be defined before useMemos that use currentIndex
  const {
    currentIndex,
    isPlaying,
    speed,
    togglePlay,
    setSpeed,
    stepForward,
    stepBackward,
    jumpTo,
    reset,
    progress,
  } = usePlayback({
    totalBars: filteredData.length,
  });

  // Full chart data for the day (used for chart scale)
  const fullChartData = useMemo(() => {
    if (!is1mMode) return filteredData;
    return aggregateTo5m(filteredData);
  }, [filteredData, is1mMode]);

  // Current visible chart data: dynamically aggregated up to currentIndex
  // This makes the forming 5m bar update in real-time as 1m data progresses
  const chartData = useMemo(() => {
    if (!is1mMode) {
      return filteredData.slice(0, currentIndex + 1);
    }
    // In 1m mode: aggregate data up to currentIndex dynamically
    const dataUpToNow = filteredData.slice(0, currentIndex + 1);
    return aggregateTo5mDynamic(dataUpToNow);
  }, [filteredData, currentIndex, is1mMode]);

  // Calculate RSI using current day data only (5m bars) - 楽天MARKETSPEED互換
  // EMA方式、期間9、当日データのみ
  const rsiValues = useMemo(() => {
    if (chartData.length === 0) return [];

    const closes = chartData.map((d) => d.Close);
    return calculateRSI(closes, 9);
  }, [chartData]);

  // Chart visible index: now simply the last index of chartData
  // (chartData is already sliced/aggregated up to currentIndex)
  const chartVisibleIndex = useMemo(() => {
    return Math.max(0, chartData.length - 1);
  }, [chartData.length]);

  // Current time display
  const currentTime = useMemo(() => {
    if (filteredData.length === 0 || currentIndex >= filteredData.length) return "";
    const row = filteredData[currentIndex];
    return row.date.includes(" ") || row.date.includes("T")
      ? row.date.replace("T", " ").slice(0, 16)
      : row.date;
  }, [filteredData, currentIndex]);

  // Current price (OHLC average)
  const currentPrice = useMemo(() => {
    if (filteredData.length === 0 || currentIndex >= filteredData.length) return null;
    return getOhlcAverage(filteredData[currentIndex]);
  }, [filteredData, currentIndex]);

  // Entry handler
  const handleEntry = useCallback((mode: TradeMode) => {
    if (!currentPrice || positions[mode]) return;
    setPositions((prev) => ({
      ...prev,
      [mode]: {
        entryPrice: currentPrice,
        entryTime: currentTime,
        shares: 100,
      },
    }));
  }, [currentPrice, currentTime, positions]);

  // Exit handler
  const handleExit = useCallback((mode: TradeMode) => {
    const pos = positions[mode];
    if (!currentPrice || !pos) return;
    const pnl = mode === "long"
      ? (currentPrice - pos.entryPrice) * pos.shares
      : (pos.entryPrice - currentPrice) * pos.shares;
    setTrades((prev) => [
      ...prev,
      {
        type: mode,
        entryPrice: pos.entryPrice,
        entryTime: pos.entryTime,
        exitPrice: currentPrice,
        exitTime: currentTime,
        shares: pos.shares,
        pnl,
      },
    ]);
    setPositions((prev) => ({
      ...prev,
      [mode]: null,
    }));
  }, [currentPrice, currentTime, positions]);

  // Fetch price data: try 1m first, fallback to 5m
  useEffect(() => {
    if (!ticker) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      // Fetch stock name in parallel
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
        // Ignore meta fetch errors
      }

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 10);

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

          // Filter out invalid data (0 prices or null values)
          const validData = data1m.filter(row =>
            row.Open > 0 && row.High > 0 && row.Low > 0 && row.Close > 0
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

      // Fallback to 5m data
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

        // Filter out invalid data (0 prices or null values)
        const validData = data5m.filter(row =>
          row.Open > 0 && row.High > 0 && row.Low > 0 && row.Close > 0
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

  // Reset playback and trading when date changes
  useEffect(() => {
    reset();
    setPositions({ long: null, short: null });
    setTrades([]);
  }, [selectedDate, reset]);

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
              <div className="h-[520px] bg-muted/30 rounded-xl" />
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
                {ticker} {stockName && <span className="text-muted-foreground font-normal">{stockName}</span>} <span className="text-muted-foreground font-normal">デモトレード</span>
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
                <DemoChart
                  allData={chartData}
                  rsiValues={rsiValues}
                  visibleIndex={chartVisibleIndex}
                  totalBars={fullChartData.length}
                />
              ) : (
                <div className="h-[520px] flex items-center justify-center text-muted-foreground">
                  データがありません
                </div>
              )}
            </div>
          </div>

          {/* Combined Trading & Playback Controls */}
          {filteredData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left: Trading Panel */}
              <TradingPanel
                currentPrice={currentPrice}
                currentTime={currentTime}
                positions={positions}
                trades={trades}
                onEntry={handleEntry}
                onExit={handleExit}
              />

              {/* Right: Playback Controls */}
              <PlaybackControls
                isPlaying={isPlaying}
                speed={speed}
                currentIndex={currentIndex}
                totalBars={filteredData.length}
                progress={progress}
                onTogglePlay={togglePlay}
                onSpeedChange={setSpeed}
                onStepForward={stepForward}
                onStepBackward={stepBackward}
                onReset={reset}
                onSeek={jumpTo}
                currentTime={currentTime}
              />
            </div>
          )}

          {/* Info */}
          <div className="text-xs text-muted-foreground text-center">
            {is1mMode ? (
              <>チャート: 5分足 ({chartData.length}本) | 再生: 1分足 ({filteredData.length}本)</>
            ) : (
              <>5分足 | {filteredData.length}本</>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
