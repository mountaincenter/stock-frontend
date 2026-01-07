"use client";

import React, { useEffect, useState } from "react";

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
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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

        {/* Normalized Price Chart Placeholder */}
        <div className="rounded-xl bg-background/40 border border-border/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium">前日終値=100 価格推移</div>
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showNikkei}
                  onChange={(e) => setShowNikkei(e.target.checked)}
                  className="w-3 h-3 rounded"
                />
                <span className="text-blue-400">日経平均</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTopix}
                  onChange={(e) => setShowTopix(e.target.checked)}
                  className="w-3 h-3 rounded"
                />
                <span className="text-orange-400">TOPIX</span>
              </label>
            </div>
          </div>
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
            {/* TODO: lightweight-charts integration */}
            <div className="text-center">
              <div className="mb-2">基準日: {normalizedPrices.date}</div>
              <div className="text-xs text-muted-foreground/60">
                銘柄: {normalizedPrices.ticker.length}本 /
                日経: {normalizedPrices.nikkei.length}本 /
                TOPIX: {normalizedPrices.topix.length}本
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
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
      </div>
    </section>
  );
}
