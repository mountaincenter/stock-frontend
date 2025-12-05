"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { DevNavLinks, FilterButtonGroup } from "@/components/dev";

interface SummaryItem {
  label: string;
  signals: number;
  trades: number;
  avg_profit: number;
  total_profit: number;
  win_rate: number;
}

interface PriceRangeItem {
  range: string;
  count: number;
  avg_profit: number;
  total_profit: number;
  win_rate: number;
}

interface DailyItem {
  date: string;
  count: number;
  avg_profit: number;
  total_profit: number;
  win_rate: number;
}

interface StockItem {
  backtest_date: string;
  ticker: string;
  stock_name: string;
  v3_action: string;
  v3_label: string;
  holding_days: number;
  buy_price: number;
  sell_price?: number;
  daily_close?: number;
  can_trade: boolean;
  margin_code: number;
  margin_code_name: string;
  jsf_restricted: boolean;
  is_shortable: boolean;
  profit?: number;
  day0_profit?: number;
  day5_profit?: number;
}

interface V3Data {
  summary: SummaryItem[];
  price_range: Record<string, PriceRangeItem[]>;
  generated_at: string;
  total_records: number;
}

interface DailyData {
  daily: DailyItem[];
}

interface StocksData {
  stocks: StockItem[];
  total: number;
}

const formatProfit = (value: number | undefined | null) => {
  if (value === undefined || value === null) return "-";
  const formatted = Math.abs(value).toLocaleString();
  if (value >= 0) return `+${formatted}`;
  return `-${formatted}`;
};

const getActionBadge = (label: string) => {
  const base = "px-1.5 py-0.5 text-xs font-medium";
  switch (label) {
    case "買い":
      return <span className={`${base} bg-[#ff9800]/20 text-[#ff9800]`}>買い</span>;
    case "買い5":
      return <span className={`${base} bg-[#ff9800]/15 text-[#ffb74d]`}>買い5</span>;
    case "売り":
      return <span className={`${base} bg-[var(--tv-accent)]/20 text-[var(--tv-accent)]`}>売り</span>;
    case "売り5":
      return <span className={`${base} bg-[var(--tv-accent)]/15 text-[#5c8eff]`}>売り5</span>;
    default:
      return <span className={`${base} bg-[var(--tv-bg-tertiary)] text-[var(--tv-text-tertiary)]`}>静観</span>;
  }
};

const ACTION_OPTIONS = [
  { value: "all", label: "全体" },
  { value: "買い", label: "買い" },
  { value: "買い5", label: "買い5" },
  { value: "静観", label: "静観" },
  { value: "売り", label: "売り" },
  { value: "売り5", label: "売り5" },
];

export default function V3AnalysisPage() {
  const [data, setData] = useState<V3Data | null>(null);
  const [dailyData, setDailyData] = useState<DailyData | null>(null);
  const [stocksData, setStocksData] = useState<Record<string, StocksData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<string>("all");
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/dev/v3/summary`).then((r) => r.json()),
      fetch(`${API_BASE}/api/dev/v3/daily`).then((r) => r.json()),
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
  }, [API_BASE]);

  const toggleDate = async (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
      if (!stocksData[date]) {
        const res = await fetch(`${API_BASE}/api/dev/v3/stocks?date=${date}&limit=50`);
        const data = await res.json();
        setStocksData((prev) => ({ ...prev, [date]: data }));
      }
    }
    setExpandedDates(newExpanded);
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

  const filteredPriceRange =
    selectedAction === "all" ? null : data.price_range[selectedAction] || [];

  return (
    <div className="min-h-screen bg-[var(--tv-bg-primary)] tv-dark">
      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="mb-4">
          <DevNavLinks links={["dashboard"]} className="mb-3" />
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-medium text-[var(--tv-text-primary)]">
                v3.0 スイング分析
              </h1>
              <p className="text-xs text-[var(--tv-text-tertiary)]">価格帯最適化戦略</p>
            </div>
            <div className="text-xs text-[var(--tv-text-tertiary)]">
              {data.total_records} records
            </div>
          </div>
        </div>

        {/* Summary Grid */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-px bg-[var(--tv-border)] mb-4">
          {data.summary.map((item) => (
            <div
              key={item.label}
              className={`p-3 ${
                item.label === "全体"
                  ? "bg-[var(--tv-bg-tertiary)]"
                  : "bg-[var(--tv-bg-secondary)]"
              }`}
            >
              <div className="text-xs text-[var(--tv-text-tertiary)] mb-1">{item.label}</div>
              <div
                className={`text-sm tabular-nums font-medium ${
                  item.total_profit > 0
                    ? "text-[var(--tv-up)]"
                    : item.total_profit < 0
                    ? "text-[var(--tv-down)]"
                    : "text-[var(--tv-text-secondary)]"
                }`}
              >
                {formatProfit(item.total_profit)}円
              </div>
              <div className="flex items-center justify-between mt-1.5 text-xs">
                <span className="text-[var(--tv-text-tertiary)]">{item.trades}件</span>
                <span
                  className={
                    item.win_rate >= 60
                      ? "text-[var(--tv-up)]"
                      : item.win_rate >= 50
                      ? "text-yellow-500"
                      : "text-[var(--tv-down)]"
                  }
                >
                  {item.win_rate.toFixed(1)}%
                </span>
              </div>
              <div className="text-xs text-[var(--tv-text-tertiary)] mt-0.5">
                平均 {formatProfit(item.avg_profit)}
              </div>
            </div>
          ))}
        </div>

        {/* Action Filter */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs text-[var(--tv-text-secondary)]">フィルター</span>
          <FilterButtonGroup
            options={ACTION_OPTIONS}
            value={selectedAction}
            onChange={setSelectedAction}
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Price Range Performance */}
          {selectedAction !== "all" && filteredPriceRange && (
            <div className="bg-[var(--tv-bg-secondary)] border border-[var(--tv-border)]">
              <div className="px-4 py-3 border-b border-[var(--tv-border)]">
                <h2 className="text-sm font-medium text-[var(--tv-text-primary)]">
                  {selectedAction} 価格帯別
                </h2>
              </div>
              <div className="divide-y divide-[var(--tv-border)]">
                {filteredPriceRange.length === 0 ? (
                  <div className="text-[var(--tv-text-tertiary)] text-xs p-4">データなし</div>
                ) : (
                  filteredPriceRange.map((item) => (
                    <div
                      key={item.range}
                      className="flex items-center justify-between px-4 py-2 text-xs"
                    >
                      <span className="text-[var(--tv-text-primary)] tabular-nums">{item.range}円</span>
                      <div className="flex items-center gap-4">
                        <span className="text-[var(--tv-text-tertiary)]">{item.count}件</span>
                        <span
                          className={`tabular-nums ${
                            item.avg_profit > 0
                              ? "text-[var(--tv-up)]"
                              : item.avg_profit < 0
                              ? "text-[var(--tv-down)]"
                              : "text-[var(--tv-text-secondary)]"
                          }`}
                        >
                          平均{formatProfit(item.avg_profit)}
                        </span>
                        <span
                          className={
                            item.win_rate >= 60
                              ? "text-[var(--tv-up)]"
                              : item.win_rate >= 50
                              ? "text-yellow-500"
                              : "text-[var(--tv-down)]"
                          }
                        >
                          {item.win_rate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Daily Performance */}
          <div
            className={`bg-[var(--tv-bg-secondary)] border border-[var(--tv-border)] ${
              selectedAction === "all" ? "lg:col-span-2" : ""
            }`}
          >
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
                        {item.count}件
                      </span>
                      <span
                        className={`text-xs ${
                          item.win_rate >= 60
                            ? "text-[var(--tv-up)]"
                            : item.win_rate >= 50
                            ? "text-yellow-500"
                            : "text-[var(--tv-down)]"
                        }`}
                      >
                        {item.win_rate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-sm tabular-nums font-medium ${
                          item.total_profit > 0
                            ? "text-[var(--tv-up)]"
                            : item.total_profit < 0
                            ? "text-[var(--tv-down)]"
                            : "text-[var(--tv-text-secondary)]"
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
                      {stocksData[item.date] ? (
                        <div className="space-y-1.5 pt-2">
                          {stocksData[item.date].stocks.map((s, i) => (
                            <div
                              key={i}
                              className="p-2.5 bg-[var(--tv-bg-secondary)] border border-[var(--tv-border)]"
                            >
                              {/* Row 1: Stock info */}
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="tabular-nums text-sm text-[var(--tv-accent)]">
                                    {s.ticker.replace(".T", "")}
                                  </span>
                                  <span className="text-xs text-[var(--tv-text-secondary)] truncate max-w-[140px]">
                                    {s.stock_name}
                                  </span>
                                  {getActionBadge(s.v3_label)}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`text-xs px-1 py-0.5 ${
                                      s.margin_code === 2
                                        ? "bg-[var(--tv-up)]/20 text-[var(--tv-up)]"
                                        : s.margin_code === 1
                                        ? "bg-yellow-500/20 text-yellow-500"
                                        : "bg-[var(--tv-down)]/20 text-[var(--tv-down)]"
                                    }`}
                                  >
                                    {s.margin_code_name ||
                                      (s.margin_code === 2
                                        ? "貸借"
                                        : s.margin_code === 1
                                        ? "信用"
                                        : "他")}
                                  </span>
                                  {s.jsf_restricted && (
                                    <span className="text-xs px-1 py-0.5 bg-[var(--tv-down)]/20 text-[var(--tv-down)]">
                                      日証金
                                    </span>
                                  )}
                                </div>
                              </div>
                              {/* Row 2: Price / Profit */}
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-3 text-[var(--tv-text-tertiary)]">
                                  <span>
                                    始値{" "}
                                    <span className="text-[var(--tv-text-secondary)] tabular-nums">
                                      {s.buy_price?.toLocaleString()}
                                    </span>
                                  </span>
                                  <span>
                                    終値{" "}
                                    <span className="text-[var(--tv-text-secondary)] tabular-nums">
                                      {s.daily_close?.toLocaleString() || "-"}
                                    </span>
                                  </span>
                                </div>
                                <span
                                  className={`tabular-nums font-medium ${
                                    (s.profit ?? 0) > 0
                                      ? "text-[var(--tv-up)]"
                                      : (s.profit ?? 0) < 0
                                      ? "text-[var(--tv-down)]"
                                      : "text-[var(--tv-text-secondary)]"
                                  }`}
                                >
                                  {formatProfit(s.profit)}円
                                </span>
                              </div>
                            </div>
                          ))}
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
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-xs text-[var(--tv-text-tertiary)]">
          Generated: {data.generated_at}
        </div>
      </div>
    </div>
  );
}
