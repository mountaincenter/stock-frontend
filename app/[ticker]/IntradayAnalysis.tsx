"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

type TableRow = {
  date: string;
  dayOfWeek: string;
  prevClose: number | null;
  open: number;
  high: number;
  highTime: string;
  low: number;
  lowTime: string;
  amClose: number | null;
  amPnl: number | null;
  close: number;
  dayPnl: number;
  volatility: number;
};

type NormalizedPrice = {
  time: string;
  value: number;
};

type IntradayData = {
  table: TableRow[];
  normalizedPrices: {
    date: string;
    ticker: NormalizedPrice[];
    nikkei: NormalizedPrice[];
    topix: NormalizedPrice[];
    avg5d?: NormalizedPrice[];
    avg10d?: NormalizedPrice[];
    avgMon?: NormalizedPrice[];
    avgTue?: NormalizedPrice[];
    avgWed?: NormalizedPrice[];
    avgThu?: NormalizedPrice[];
    avgFri?: NormalizedPrice[];
  };
  summary: {
    highAmPct: number;
    lowAmPct: number;
    longWinRate: number;
    amLongWinRate: number;
    totalDays: number;
  };
};

function formatNumber(n: number | null): string {
  if (n === null) return "-";
  return n.toLocaleString();
}

function formatPnl(n: number | null): string {
  if (n === null) return "-";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toLocaleString()}`;
}

function pnlColor(n: number | null): string {
  if (n === null) return "";
  if (n > 0) return "text-emerald-400";
  if (n < 0) return "text-red-400";
  return "";
}

export default function IntradayAnalysis({ ticker }: { ticker: string }) {
  const [data, setData] = useState<IntradayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNikkei, setShowNikkei] = useState(true);
  const [showTopix, setShowTopix] = useState(false);
  const [showAvg5d, setShowAvg5d] = useState(false);
  const [showAvg10d, setShowAvg10d] = useState(false);
  const [selectedWeekday, setSelectedWeekday] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const url = `${API_BASE}/dev/intraday-analysis?ticker=${encodeURIComponent(ticker)}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
        setSelectedDate(json.normalizedPrices?.date ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "データ取得エラー");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [ticker]);

  // チャートデータを統合 (Hooks はearly returnの前に呼ぶ必要がある)
  const chartData = useMemo(() => {
    if (!data) return [];
    const { normalizedPrices } = data;
    type ChartPoint = {
      time: string;
      ticker?: number;
      nikkei?: number;
      topix?: number;
      avg5d?: number;
      avg10d?: number;
      weekdayAvg?: number;
    };
    const timeMap = new Map<string, ChartPoint>();

    normalizedPrices.ticker.forEach((p) => {
      if (!timeMap.has(p.time)) timeMap.set(p.time, { time: p.time });
      timeMap.get(p.time)!.ticker = p.value;
    });
    normalizedPrices.nikkei.forEach((p) => {
      if (!timeMap.has(p.time)) timeMap.set(p.time, { time: p.time });
      timeMap.get(p.time)!.nikkei = p.value;
    });
    normalizedPrices.topix.forEach((p) => {
      if (!timeMap.has(p.time)) timeMap.set(p.time, { time: p.time });
      timeMap.get(p.time)!.topix = p.value;
    });
    normalizedPrices.avg5d?.forEach((p) => {
      if (!timeMap.has(p.time)) timeMap.set(p.time, { time: p.time });
      timeMap.get(p.time)!.avg5d = p.value;
    });
    normalizedPrices.avg10d?.forEach((p) => {
      if (!timeMap.has(p.time)) timeMap.set(p.time, { time: p.time });
      timeMap.get(p.time)!.avg10d = p.value;
    });

    // 曜日別平均
    const weekdayKey = selectedWeekday
      ? (`avg${selectedWeekday}` as keyof typeof normalizedPrices)
      : null;
    if (weekdayKey && normalizedPrices[weekdayKey]) {
      (normalizedPrices[weekdayKey] as NormalizedPrice[]).forEach((p) => {
        if (!timeMap.has(p.time)) timeMap.set(p.time, { time: p.time });
        timeMap.get(p.time)!.weekdayAvg = p.value;
      });
    }

    return Array.from(timeMap.values()).sort((a, b) => a.time.localeCompare(b.time));
  }, [data, selectedWeekday]);

  // Y軸の範囲を計算
  const yDomain = useMemo(() => {
    const allValues = chartData.flatMap((d) =>
      [d.ticker, d.nikkei, d.topix, d.avg5d, d.avg10d, d.weekdayAvg].filter((v): v is number => v !== undefined)
    );
    if (allValues.length === 0) return [98, 102] as [number, number];
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.1 || 1;
    return [Math.floor(min - padding), Math.ceil(max + padding)] as [number, number];
  }, [chartData]);

  if (loading) {
    return (
      <section className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 md:p-6 shadow-xl backdrop-blur-xl">
        <div className="animate-pulse text-muted-foreground text-sm">読み込み中...</div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 md:p-6 shadow-xl backdrop-blur-xl">
        <div className="text-red-400 text-sm">{error ?? "データなし"}</div>
      </section>
    );
  }

  const { table, normalizedPrices, summary } = data;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 md:p-6 shadow-xl backdrop-blur-xl">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />

      <div className="relative space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 md:gap-3 mb-2">
            <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />
            <h2 className="text-base md:text-lg font-bold tracking-tight">
              日中高値安値分析
            </h2>
          </div>
          <div className="flex items-center gap-2 text-[10px] md:text-xs text-muted-foreground/60">
            <div className="h-px w-6 md:w-8 bg-gradient-to-r from-border/40 to-transparent" />
            <span className="tracking-wide uppercase font-medium">
              過去{summary.totalDays}営業日
            </span>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl bg-background/40 border border-border/30 p-3">
            <div className="text-[10px] text-muted-foreground mb-1">高値 前場率</div>
            <div className="text-lg font-bold">{summary.highAmPct}%</div>
          </div>
          <div className="rounded-xl bg-background/40 border border-border/30 p-3">
            <div className="text-[10px] text-muted-foreground mb-1">安値 前場率</div>
            <div className="text-lg font-bold">{summary.lowAmPct}%</div>
          </div>
          <div className="rounded-xl bg-background/40 border border-border/30 p-3">
            <div className="text-[10px] text-muted-foreground mb-1">日中ロング勝率</div>
            <div className={`text-lg font-bold ${summary.longWinRate >= 50 ? "text-emerald-400" : "text-red-400"}`}>
              {summary.longWinRate}%
            </div>
          </div>
          <div className="rounded-xl bg-background/40 border border-border/30 p-3">
            <div className="text-[10px] text-muted-foreground mb-1">前場ロング勝率</div>
            <div className={`text-lg font-bold ${summary.amLongWinRate >= 50 ? "text-emerald-400" : "text-red-400"}`}>
              {summary.amLongWinRate}%
            </div>
          </div>
        </div>

        {/* Normalized Price Chart */}
        <div className="rounded-xl bg-background/40 border border-border/30 p-4">
          <div className="flex flex-col gap-2 mb-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">
                前日終値=100 価格推移
                <span className="ml-2 text-xs text-muted-foreground">({normalizedPrices.date})</span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showNikkei}
                    onChange={(e) => setShowNikkei(e.target.checked)}
                    className="w-3 h-3 rounded accent-blue-500"
                  />
                  <span className="text-blue-400">日経平均</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showTopix}
                    onChange={(e) => setShowTopix(e.target.checked)}
                    className="w-3 h-3 rounded accent-orange-500"
                  />
                  <span className="text-orange-400">TOPIX</span>
                </label>
              </div>
            </div>
            {/* 平均線コントロール */}
            <div className="flex items-center gap-4 text-xs flex-wrap">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAvg5d}
                  onChange={(e) => setShowAvg5d(e.target.checked)}
                  className="w-3 h-3 rounded accent-emerald-500"
                />
                <span className="text-emerald-400">5日平均</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAvg10d}
                  onChange={(e) => setShowAvg10d(e.target.checked)}
                  className="w-3 h-3 rounded accent-purple-500"
                />
                <span className="text-purple-400">10日平均</span>
              </label>
              <select
                value={selectedWeekday ?? ""}
                onChange={(e) => setSelectedWeekday(e.target.value || null)}
                className="bg-background/60 border border-border/30 rounded px-2 py-0.5 text-xs"
              >
                <option value="">曜日平均</option>
                <option value="Mon">月曜</option>
                <option value="Tue">火曜</option>
                <option value="Wed">水曜</option>
                <option value="Thu">木曜</option>
                <option value="Fri">金曜</option>
              </select>
            </div>
          </div>
          <div className="h-48">
            {isMounted && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={192}>
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10, fill: "#888" }}
                    tickLine={false}
                    axisLine={{ stroke: "#333" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={yDomain}
                    tick={{ fontSize: 10, fill: "#888" }}
                    tickLine={false}
                    axisLine={{ stroke: "#333" }}
                    tickFormatter={(v) => v.toFixed(0)}
                  />
                  <ReferenceLine y={100} stroke="#666" strokeDasharray="3 3" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0,0,0,0.8)",
                      border: "1px solid #333",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "#888" }}
                    formatter={(value) => [(value as number)?.toFixed(2) ?? "-", ""]}
                  />
                  <Line
                    type="monotone"
                    dataKey="ticker"
                    stroke="#fff"
                    strokeWidth={2}
                    dot={false}
                    name="銘柄"
                  />
                  {showNikkei && (
                    <Line
                      type="monotone"
                      dataKey="nikkei"
                      stroke="#3b82f6"
                      strokeWidth={1.5}
                      dot={false}
                      name="日経平均"
                    />
                  )}
                  {showTopix && (
                    <Line
                      type="monotone"
                      dataKey="topix"
                      stroke="#f97316"
                      strokeWidth={1.5}
                      dot={false}
                      name="TOPIX"
                    />
                  )}
                  {showAvg5d && (
                    <Line
                      type="monotone"
                      dataKey="avg5d"
                      stroke="#10b981"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="5日平均"
                    />
                  )}
                  {showAvg10d && (
                    <Line
                      type="monotone"
                      dataKey="avg10d"
                      stroke="#a855f7"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="10日平均"
                    />
                  )}
                  {selectedWeekday && (
                    <Line
                      type="monotone"
                      dataKey="weekdayAvg"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="3 3"
                      dot={false}
                      name={`${selectedWeekday}曜平均`}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                {!isMounted ? "読み込み中..." : "データなし"}
              </div>
            )}
          </div>
        </div>

        {/* Table (Collapsible) */}
        <div>
          <button
            onClick={() => setShowTable(!showTable)}
            className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-background/40 border border-border/30 hover:bg-background/60 transition-colors"
          >
            <span className="text-sm font-medium text-muted-foreground">
              詳細データ ({table.length}件)
            </span>
            <svg
              className={`w-4 h-4 text-muted-foreground transition-transform ${showTable ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showTable && (
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-border/30 text-muted-foreground">
                    <th className="text-left py-2 px-1 font-medium">日付</th>
                    <th className="text-center py-2 px-1 font-medium">曜日</th>
                    <th className="text-right py-2 px-1 font-medium">前終</th>
                    <th className="text-right py-2 px-1 font-medium">始値</th>
                    <th className="text-right py-2 px-1 font-medium">高値</th>
                    <th className="text-center py-2 px-1 font-medium">時間</th>
                    <th className="text-right py-2 px-1 font-medium">安値</th>
                    <th className="text-center py-2 px-1 font-medium">時間</th>
                    <th className="text-right py-2 px-1 font-medium">前場終</th>
                    <th className="text-right py-2 px-1 font-medium">前場PnL</th>
                    <th className="text-right py-2 px-1 font-medium">終値</th>
                    <th className="text-right py-2 px-1 font-medium">日中PnL</th>
                    <th className="text-right py-2 px-1 font-medium">ボラ</th>
                  </tr>
                </thead>
                <tbody>
                  {table.map((row) => (
                    <tr
                      key={row.date}
                      className="border-b border-border/20 hover:bg-background/30 transition-colors"
                    >
                      <td className="py-2 px-1 font-mono">{row.date.slice(5)}</td>
                      <td className="py-2 px-1 text-center">{row.dayOfWeek}</td>
                      <td className="py-2 px-1 text-right font-mono">{formatNumber(row.prevClose)}</td>
                      <td className="py-2 px-1 text-right font-mono">{formatNumber(row.open)}</td>
                      <td className="py-2 px-1 text-right font-mono text-emerald-400">{formatNumber(row.high)}</td>
                      <td className="py-2 px-1 text-center font-mono text-muted-foreground">{row.highTime}</td>
                      <td className="py-2 px-1 text-right font-mono text-red-400">{formatNumber(row.low)}</td>
                      <td className="py-2 px-1 text-center font-mono text-muted-foreground">{row.lowTime}</td>
                      <td className="py-2 px-1 text-right font-mono">{formatNumber(row.amClose)}</td>
                      <td className={`py-2 px-1 text-right font-mono ${pnlColor(row.amPnl)}`}>
                        {formatPnl(row.amPnl)}
                      </td>
                      <td className="py-2 px-1 text-right font-mono">{formatNumber(row.close)}</td>
                      <td className={`py-2 px-1 text-right font-mono ${pnlColor(row.dayPnl)}`}>
                        {formatPnl(row.dayPnl)}
                      </td>
                      <td className="py-2 px-1 text-right font-mono text-muted-foreground">
                        {formatNumber(row.volatility)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
