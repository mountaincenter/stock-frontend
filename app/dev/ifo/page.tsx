"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { DevNavLinks, FilterButtonGroup } from "@/components/dev";

interface SessionSummary {
  count: number;
  total_profit: number;
  avg_profit: number;
  win_rate: number;
  take_profit_count: number;
  stop_loss_count: number;
  timeout_count: number;
}

interface IFOSummary {
  summary: {
    morning: Record<string, SessionSummary>;
    afternoon: Record<string, SessionSummary>;
  };
  total: {
    profit: number;
    morning_profit: number;
    afternoon_profit: number;
  };
  shortable_count: number;
  generated_at: string;
}

interface TradeItem {
  date: string;
  ticker: string;
  stock_name: string;
  session: string;
  entry_price: number;
  exit_price: number;
  exit_reason: string;
  pnl_amount: number;
}

interface DailyItem {
  date: string;
  morning_count: number;
  morning_profit: number;
  morning_win_rate: number;
  afternoon_count: number;
  afternoon_profit: number;
  afternoon_win_rate: number;
  total_profit: number;
}

interface DailyData {
  daily: DailyItem[];
  take_profit_pct: number;
}

interface TradesData {
  trades: TradeItem[];
  total: number;
}

const formatProfit = (value: number) => {
  const formatted = Math.abs(value).toLocaleString();
  if (value >= 0) return `+${formatted}`;
  return `-${formatted}`;
};

const getExitReasonBadge = (reason: string) => {
  switch (reason) {
    case "take_profit":
      return (
        <span className="px-1.5 py-0.5 text-xs bg-[var(--tv-up)]/20 text-[var(--tv-up)]">
          利確
        </span>
      );
    case "stop_loss":
      return (
        <span className="px-1.5 py-0.5 text-xs bg-[var(--tv-down)]/20 text-[var(--tv-down)]">
          損切
        </span>
      );
    default:
      return (
        <span className="px-1.5 py-0.5 text-xs bg-[var(--tv-bg-tertiary)] text-[var(--tv-text-tertiary)]">
          TO
        </span>
      );
  }
};

const TP_OPTIONS = [
  { value: "0.5", label: "0.5%" },
  { value: "1.0", label: "1.0%" },
  { value: "1.5", label: "1.5%" },
  { value: "2.0", label: "2.0%" },
];

export default function IFOAnalysisPage() {
  const [data, setData] = useState<IFOSummary | null>(null);
  const [dailyData, setDailyData] = useState<DailyData | null>(null);
  const [tradesData, setTradesData] = useState<Record<string, TradesData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTpPct, setSelectedTpPct] = useState<string>("2.0");
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/dev/ifo/summary`).then((r) => r.json()),
      fetch(`${API_BASE}/api/dev/ifo/daily?take_profit_pct=${selectedTpPct}`).then((r) => r.json()),
    ])
      .then(([summaryRes, dailyRes]) => {
        setData(summaryRes);
        setDailyData(dailyRes);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [selectedTpPct, API_BASE]);

  const toggleDate = async (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
      if (!tradesData[date]) {
        const res = await fetch(
          `${API_BASE}/api/dev/ifo/trades?date=${date}&take_profit_pct=${selectedTpPct}`
        );
        const data = await res.json();
        setTradesData((prev) => ({ ...prev, [date]: data }));
      }
    }
    setExpandedDates(newExpanded);
  };

  const handleTpChange = (value: string) => {
    setSelectedTpPct(value);
    setExpandedDates(new Set());
    setTradesData({});
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--tv-bg-primary)] tv-dark flex items-center justify-center">
        <div className="text-[var(--tv-text-secondary)] text-sm">Loading...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[var(--tv-bg-primary)] tv-dark flex items-center justify-center">
        <div className="text-[var(--tv-down)]">Error: {error || "Data not found"}</div>
      </div>
    );
  }

  const takeProfitPcts = ["0.5", "1.0", "1.5", "2.0"];

  return (
    <div className="min-h-screen bg-[var(--tv-bg-primary)] tv-dark">
      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="mb-4">
          <DevNavLinks links={["dashboard"]} className="mb-3" />
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-medium text-[var(--tv-text-primary)]">
                ショートIFO戦略
              </h1>
              <p className="text-xs text-[var(--tv-text-tertiary)]">
                前場（9:00-10:00）+ 後場（12:30-15:00）
              </p>
            </div>
            <div className="text-xs text-[var(--tv-text-tertiary)]">
              空売り可能: {data.shortable_count}件
            </div>
          </div>
        </div>

        {/* Total Summary */}
        <div className="bg-[var(--tv-bg-secondary)] border border-[var(--tv-border)] mb-4">
          <div className="p-4 text-center">
            <div className="text-xs text-[var(--tv-text-tertiary)] mb-1">
              合計損益（利確 {selectedTpPct}%）
            </div>
            <div
              className={`text-3xl tabular-nums font-bold ${
                data.total.profit >= 0 ? "text-[var(--tv-up)]" : "text-[var(--tv-down)]"
              }`}
            >
              {formatProfit(data.total.profit)}
              <span className="text-lg ml-1">円</span>
            </div>
            <div className="mt-2 flex justify-center gap-6 text-xs">
              <span className="text-[var(--tv-text-secondary)]">
                前場:{" "}
                <span
                  className={`tabular-nums ${
                    data.total.morning_profit >= 0 ? "text-[var(--tv-up)]" : "text-[var(--tv-down)]"
                  }`}
                >
                  {formatProfit(data.total.morning_profit)}
                </span>
              </span>
              <span className="text-[var(--tv-text-secondary)]">
                後場:{" "}
                <span
                  className={`tabular-nums ${
                    data.total.afternoon_profit >= 0 ? "text-[var(--tv-up)]" : "text-[var(--tv-down)]"
                  }`}
                >
                  {formatProfit(data.total.afternoon_profit)}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Take Profit Filter */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs text-[var(--tv-text-secondary)]">利確%</span>
          <FilterButtonGroup
            options={TP_OPTIONS}
            value={selectedTpPct}
            onChange={handleTpChange}
          />
        </div>

        {/* Session Summary Grid */}
        <div className="grid md:grid-cols-2 gap-px bg-[var(--tv-border)] mb-4">
          {/* Morning */}
          <div className="bg-[var(--tv-bg-secondary)] p-4">
            <h2 className="text-sm font-medium text-[var(--tv-accent)] mb-3">
              前場（9:00-10:00）
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {takeProfitPcts.map((pct) => {
                const s = data.summary.morning[pct];
                if (!s) return null;
                const isSelected = pct === selectedTpPct;
                return (
                  <div
                    key={pct}
                    className={`p-2 bg-[var(--tv-bg-tertiary)] ${
                      isSelected ? "ring-1 ring-[var(--tv-accent)]" : ""
                    }`}
                  >
                    <div className="text-xs text-[var(--tv-text-tertiary)] mb-1">
                      {pct}%利確
                    </div>
                    <div
                      className={`text-sm tabular-nums font-medium ${
                        s.total_profit >= 0 ? "text-[var(--tv-up)]" : "text-[var(--tv-down)]"
                      }`}
                    >
                      {formatProfit(s.total_profit)}円
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-[var(--tv-text-tertiary)]">{s.count}件</span>
                      <span
                        className={
                          s.win_rate >= 50
                            ? "text-[var(--tv-up)]"
                            : s.win_rate >= 30
                            ? "text-yellow-500"
                            : "text-[var(--tv-down)]"
                        }
                      >
                        {s.win_rate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Afternoon */}
          <div className="bg-[var(--tv-bg-secondary)] p-4">
            <h2 className="text-sm font-medium text-[#ff9800] mb-3">
              後場（12:30-15:00）
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {takeProfitPcts.map((pct) => {
                const s = data.summary.afternoon[pct];
                if (!s) return null;
                const isSelected = pct === selectedTpPct;
                return (
                  <div
                    key={pct}
                    className={`p-2 bg-[var(--tv-bg-tertiary)] ${
                      isSelected ? "ring-1 ring-[#ff9800]" : ""
                    }`}
                  >
                    <div className="text-xs text-[var(--tv-text-tertiary)] mb-1">
                      {pct}%利確
                    </div>
                    <div
                      className={`text-sm tabular-nums font-medium ${
                        s.total_profit >= 0 ? "text-[var(--tv-up)]" : "text-[var(--tv-down)]"
                      }`}
                    >
                      {formatProfit(s.total_profit)}円
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-[var(--tv-text-tertiary)]">{s.count}件</span>
                      <span
                        className={
                          s.win_rate >= 50
                            ? "text-[var(--tv-up)]"
                            : s.win_rate >= 30
                            ? "text-yellow-500"
                            : "text-[var(--tv-down)]"
                        }
                      >
                        {s.win_rate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Daily Performance */}
        <div className="bg-[var(--tv-bg-secondary)] border border-[var(--tv-border)]">
          <div className="px-4 py-3 border-b border-[var(--tv-border)] flex items-center justify-between">
            <h2 className="text-sm font-medium text-[var(--tv-text-primary)]">
              日別パフォーマンス
            </h2>
            <span className="text-xs text-[var(--tv-text-tertiary)]">
              クリックで詳細表示
            </span>
          </div>

          <div className="divide-y divide-[var(--tv-border)]">
            {dailyData?.daily.slice(0, 20).map((item) => (
              <div key={item.date}>
                <button
                  onClick={() => toggleDate(item.date)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[var(--tv-bg-tertiary)] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-[var(--tv-text-primary)] tabular-nums">
                      {item.date}
                    </span>
                    <span className="text-xs text-[var(--tv-text-tertiary)]">
                      前場({item.morning_count}) / 後場({item.afternoon_count})
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm tabular-nums font-medium ${
                        item.total_profit >= 0 ? "text-[var(--tv-up)]" : "text-[var(--tv-down)]"
                      }`}
                    >
                      {formatProfit(item.total_profit)}円
                    </span>
                    {expandedDates.has(item.date) ? (
                      <ChevronUp className="w-3.5 h-3.5 text-[var(--tv-text-tertiary)]" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-[var(--tv-text-tertiary)]" />
                    )}
                  </div>
                </button>

                {expandedDates.has(item.date) && (
                  <div className="px-4 pb-3 bg-[var(--tv-bg-primary)]">
                    {tradesData[item.date] ? (
                      <div className="grid md:grid-cols-2 gap-4 pt-2">
                        {/* Morning Trades */}
                        <div>
                          <h4 className="text-xs font-medium text-[var(--tv-accent)] mb-2">
                            前場
                          </h4>
                          <div className="space-y-1">
                            {tradesData[item.date].trades
                              .filter((t) => t.session === "morning")
                              .map((t, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between text-xs p-2 bg-[var(--tv-bg-secondary)]"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-[var(--tv-text-primary)] tabular-nums">
                                      {t.ticker}
                                    </span>
                                    <span className="text-[var(--tv-text-tertiary)] truncate max-w-[80px]">
                                      {t.stock_name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {getExitReasonBadge(t.exit_reason)}
                                    <span
                                      className={`tabular-nums ${
                                        t.pnl_amount >= 0
                                          ? "text-[var(--tv-up)]"
                                          : "text-[var(--tv-down)]"
                                      }`}
                                    >
                                      {formatProfit(t.pnl_amount)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            {tradesData[item.date].trades.filter((t) => t.session === "morning")
                              .length === 0 && (
                              <div className="text-xs text-[var(--tv-text-tertiary)] p-2">
                                取引なし
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Afternoon Trades */}
                        <div>
                          <h4 className="text-xs font-medium text-[#ff9800] mb-2">後場</h4>
                          <div className="space-y-1">
                            {tradesData[item.date].trades
                              .filter((t) => t.session === "afternoon")
                              .map((t, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between text-xs p-2 bg-[var(--tv-bg-secondary)]"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-[var(--tv-text-primary)] tabular-nums">
                                      {t.ticker}
                                    </span>
                                    <span className="text-[var(--tv-text-tertiary)] truncate max-w-[80px]">
                                      {t.stock_name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {getExitReasonBadge(t.exit_reason)}
                                    <span
                                      className={`tabular-nums ${
                                        t.pnl_amount >= 0
                                          ? "text-[var(--tv-up)]"
                                          : "text-[var(--tv-down)]"
                                      }`}
                                    >
                                      {formatProfit(t.pnl_amount)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            {tradesData[item.date].trades.filter((t) => t.session === "afternoon")
                              .length === 0 && (
                              <div className="text-xs text-[var(--tv-text-tertiary)] p-2">
                                取引なし
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[var(--tv-text-tertiary)] text-xs text-center py-3">
                        Loading...
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-xs text-[var(--tv-text-tertiary)]">
          Generated: {data.generated_at}
        </div>
      </div>
    </div>
  );
}
