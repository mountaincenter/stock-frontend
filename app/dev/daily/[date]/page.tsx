"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface BacktestResult {
  ticker: string;
  stock_name: string;
  selection_score: number | null;
  grok_rank: number;
  reason: string | null;
  selected_time: string | null;
  buy_price: number | null;
  sell_price: number | null;
  phase1_return: number | null;
  phase1_win: boolean | null;
}

interface DailyStats {
  total_stocks: number;
  valid_results: number;
  avg_return: number | null;
  win_rate: number | null;
  max_return: number | null;
  min_return: number | null;
  top5_avg_return: number | null;
  top5_win_rate: number | null;
}

interface DailyBacktest {
  date: string;
  stats: DailyStats;
  results: BacktestResult[];
}

export default function DailyDetailPage() {
  const params = useParams();
  const date = params.date as string;

  const [data, setData] = useState<DailyBacktest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!date) return;

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    fetch(`${API_BASE}/api/dev/backtest/daily/${date}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [date]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-destructive">Error: {error || "No data"}</div>
      </div>
    );
  }

  const { stats, results } = data;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Navigation */}
        <div className="mb-6">
          <Link href="/dev" className="text-blue-500 hover:text-blue-400">
            ← ダッシュボードに戻る
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">📅 {date} のバックテスト結果</h1>
          <p className="text-muted-foreground">Phase1戦略: 9:00寄付買い → 11:30前引け売り</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-6 shadow-lg">
            <div className="text-blue-200 text-sm font-medium mb-2">取引数</div>
            <div className="text-3xl font-bold">{stats.valid_results}</div>
            <div className="text-blue-200 text-xs mt-2">/ {stats.total_stocks} 銘柄</div>
          </div>

          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-6 shadow-lg">
            <div className="text-green-200 text-sm font-medium mb-2">平均リターン</div>
            <div className="text-3xl font-bold">
              {stats.avg_return !== null ? `${stats.avg_return >= 0 ? '+' : ''}${stats.avg_return.toFixed(2)}%` : "—"}
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg p-6 shadow-lg">
            <div className="text-purple-200 text-sm font-medium mb-2">勝率</div>
            <div className="text-3xl font-bold">
              {stats.win_rate !== null ? `${stats.win_rate.toFixed(1)}%` : "—"}
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg p-6 shadow-lg">
            <div className="text-orange-200 text-sm font-medium mb-2">Top5平均</div>
            <div className="text-3xl font-bold">
              {stats.top5_avg_return !== null ? `${stats.top5_avg_return >= 0 ? '+' : ''}${stats.top5_avg_return.toFixed(2)}%` : "—"}
            </div>
            <div className="text-orange-200 text-xs mt-2">
              勝率: {stats.top5_win_rate !== null ? `${stats.top5_win_rate.toFixed(1)}%` : "—"}
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-card rounded-lg shadow-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr className="text-muted-foreground text-sm">
                  <th className="px-4 py-3 text-left">結果</th>
                  <th className="px-4 py-3 text-left">ランク</th>
                  <th className="px-4 py-3 text-left">コード</th>
                  <th className="px-4 py-3 text-left">銘柄名</th>
                  <th className="px-4 py-3 text-right">スコア</th>
                  <th className="px-4 py-3 text-right">買値(9:00)</th>
                  <th className="px-4 py-3 text-right">売値(11:30)</th>
                  <th className="px-4 py-3 text-right">リターン</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => {
                    const isWin = result.phase1_win === true;
                    const isLoss = result.phase1_win === false;
                    const returnClass = isWin
                      ? "text-green-500"
                      : isLoss
                      ? "text-red-500"
                      : "text-muted-foreground";

                    return (
                      <tr
                        key={result.ticker}
                        className="border-b border-border hover:bg-muted/20"
                      >
                        <td className="px-4 py-3 text-sm">
                          {isWin ? "✅" : isLoss ? "❌" : "⚠️"}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">{result.grok_rank}</td>
                        <td className="px-4 py-3 text-sm">
                          <Link
                            href={`/${result.ticker}`}
                            className="text-blue-500 hover:text-blue-400"
                          >
                            {result.ticker}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm max-w-xs truncate" title={result.stock_name}>
                          {result.stock_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          {result.selection_score !== null
                            ? result.selection_score.toFixed(1)
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          {result.buy_price !== null
                            ? `¥${result.buy_price.toLocaleString()}`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          {result.sell_price !== null
                            ? `¥${result.sell_price.toLocaleString()}`
                            : "—"}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-bold text-lg ${returnClass}`}>
                          {result.phase1_return !== null
                            ? `${result.phase1_return >= 0 ? '+' : ''}${result.phase1_return.toFixed(2)}%`
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-muted-foreground text-sm mt-12 pt-8 border-t border-border">
          <p>GROK Backtest Dashboard v1.0</p>
        </div>
      </div>
    </div>
  );
}
