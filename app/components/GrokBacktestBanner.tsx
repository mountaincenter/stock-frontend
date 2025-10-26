"use client";

import { useEffect, useState } from "react";

interface BacktestMeta {
  metric: string;
  value: string;
}

export function GrokBacktestBanner() {
  const [meta, setMeta] = useState<BacktestMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBacktestMeta = async () => {
      try {
        // Next.js API routeを使用（相対パス）
        const url = "/api/grok_backtest_meta";

        const res = await fetch(url);
        if (!res.ok) {
          console.warn("Failed to fetch grok_backtest_meta:", res.status);
          setLoading(false);
          return;
        }

        const data: BacktestMeta[] = await res.json();
        setMeta(data);
      } catch (error) {
        console.error("Error fetching grok_backtest_meta:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBacktestMeta();
  }, []);

  if (loading) {
    return null;
  }

  if (meta.length === 0) {
    return null;
  }

  // メトリクスを取得
  const getMetric = (key: string): string => {
    const item = meta.find((m) => m.metric === key);
    return item?.value || "N/A";
  };

  const morningWinRate = getMetric("morning_win_rate");
  const morningAvgReturn = getMetric("morning_avg_return");
  const top5MorningWinRate = getMetric("top5_morning_win_rate");
  const top5MorningAvgReturn = getMetric("top5_morning_avg_return");
  const dateRange = getMetric("date_range");
  const totalStocks = getMetric("total_stocks");

  return (
    <div className="mb-6 rounded-lg border border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-2xl">🎯</span>
        <h2 className="text-xl font-bold text-gray-800">
          Grok AI Selection - Backtest Results
        </h2>
      </div>

      <div className="mb-4 text-sm text-gray-600">
        <span className="font-semibold">Test Period:</span> {dateRange} ({totalStocks} stocks tested)
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* All Stocks Strategy */}
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">
            📊 All Stocks (Top 10)
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Morning Win Rate:</span>
              <span className="font-semibold text-green-600">{morningWinRate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Avg Return:</span>
              <span className="font-semibold text-green-600">{morningAvgReturn}</span>
            </div>
          </div>
        </div>

        {/* Top 5 Strategy */}
        <div className="rounded-lg bg-white p-4 shadow-sm border-2 border-purple-300">
          <h3 className="mb-3 text-sm font-semibold text-purple-700 flex items-center gap-1">
            ⭐ Top 5 Strategy (Recommended)
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Morning Win Rate:</span>
              <span className="font-semibold text-purple-600">{top5MorningWinRate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Avg Return:</span>
              <span className="font-semibold text-purple-600">{top5MorningAvgReturn}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-blue-50 p-4">
        <h3 className="mb-2 text-sm font-semibold text-blue-800">💡 Strategy</h3>
        <p className="text-sm text-blue-700">
          Buy at <strong>9:00 AM open</strong>, sell at <strong>11:30 AM close</strong> (morning session only).
          <br />
          Focus on <strong className="text-purple-700">Top 5 stocks by selection score</strong> for best results.
        </p>
      </div>

      <div className="mt-3 text-xs text-gray-500">
        Selection score = sentiment_score × 100 + policy_link bonus + premium mention bonus
      </div>
    </div>
  );
}
