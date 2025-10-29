"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  Calendar,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

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
  profit_per_100?: number | null;
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-200 text-lg">Loading...</p>
        </motion.div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/50 rounded-2xl p-8 backdrop-blur-xl"
        >
          <p className="text-red-400 text-lg">Error: {error || "No data"}</p>
        </motion.div>
      </div>
    );
  }

  const { stats, results } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -top-48 -left-48 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-purple-500/10 rounded-full blur-3xl top-1/2 -right-48 animate-pulse delay-1000"></div>
        <div className="absolute w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -bottom-48 left-1/2 animate-pulse delay-2000"></div>
      </div>

      <div className="relative container mx-auto px-4 py-8 max-w-7xl">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <Link
            href="/dev"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            ダッシュボードに戻る
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg shadow-blue-500/50">
              <Calendar className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-5xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                {date}
              </h1>
              <p className="text-blue-200/60 text-sm mt-1">
                Phase1戦略バックテスト結果 | 9:00寄付買い → 11:30前引け売り
              </p>
            </div>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            whileHover={{ scale: 1.02, y: -5 }}
            className="group relative bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-xl rounded-3xl p-6 border border-blue-500/20 shadow-xl shadow-blue-500/10 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/10 group-hover:to-cyan-500/10 transition-all duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-blue-200/60 text-sm font-medium">取引数</span>
                <Target className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-4xl font-black mb-2 text-blue-100">{stats.valid_results}</div>
              <div className="text-blue-300/60 text-xs">/ {stats.total_stocks} 銘柄</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            whileHover={{ scale: 1.02, y: -5 }}
            className={`group relative backdrop-blur-xl rounded-3xl p-6 border shadow-xl overflow-hidden ${
              stats.avg_return !== null && stats.avg_return > 0
                ? "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20 shadow-green-500/10"
                : "bg-gradient-to-br from-red-500/10 to-rose-500/10 border-red-500/20 shadow-red-500/10"
            }`}
          >
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-medium ${stats.avg_return !== null && stats.avg_return > 0 ? "text-green-200/60" : "text-red-200/60"}`}>
                  平均リターン
                </span>
                {stats.avg_return !== null && stats.avg_return > 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-400" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-400" />
                )}
              </div>
              <div className={`text-4xl font-black mb-2 ${stats.avg_return !== null && stats.avg_return > 0 ? "text-green-100" : "text-red-100"}`}>
                {stats.avg_return !== null ? `${stats.avg_return >= 0 ? "+" : ""}${stats.avg_return.toFixed(2)}%` : "—"}
              </div>
              <div className={`text-xs ${stats.avg_return !== null && stats.avg_return > 0 ? "text-green-300/60" : "text-red-300/60"}`}>
                全銘柄平均
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            whileHover={{ scale: 1.02, y: -5 }}
            className="group relative bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl rounded-3xl p-6 border border-purple-500/20 shadow-xl shadow-purple-500/10 overflow-hidden"
          >
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-purple-200/60 text-sm font-medium">勝率</span>
                <Award className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-4xl font-black mb-2 text-purple-100">
                {stats.win_rate !== null ? `${stats.win_rate.toFixed(1)}%` : "—"}
              </div>
              <div className="text-purple-300/60 text-xs">プラス決済</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            whileHover={{ scale: 1.02, y: -5 }}
            className={`group relative backdrop-blur-xl rounded-3xl p-6 border shadow-xl overflow-hidden ${
              stats.top5_avg_return !== null && stats.top5_avg_return > 0
                ? "bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-500/20 shadow-orange-500/10"
                : "bg-gradient-to-br from-slate-500/10 to-gray-500/10 border-slate-500/20 shadow-slate-500/10"
            }`}
          >
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-orange-200/60 text-sm font-medium">Top5平均</span>
                <Award className="w-5 h-5 text-orange-400" />
              </div>
              <div className={`text-4xl font-black mb-2 ${stats.top5_avg_return !== null && stats.top5_avg_return > 0 ? "text-orange-100" : "text-slate-100"}`}>
                {stats.top5_avg_return !== null ? `${stats.top5_avg_return >= 0 ? "+" : ""}${stats.top5_avg_return.toFixed(2)}%` : "—"}
              </div>
              <div className="text-orange-300/60 text-xs">
                勝率: {stats.top5_win_rate !== null ? `${stats.top5_win_rate.toFixed(1)}%` : "—"}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Results Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mb-12"
        >
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-2xl">
            <h2 className="text-2xl font-bold text-blue-100 mb-6">銘柄別パフォーマンス</h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      結果
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      銘柄
                    </th>
                    <th className="px-4 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      スコア
                    </th>
                    <th className="px-4 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      買値(9:00)
                    </th>
                    <th className="px-4 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      売値(11:30)
                    </th>
                    <th className="px-4 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      リターン
                    </th>
                    <th className="px-4 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      100株利益
                    </th>
                    <th className="px-4 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      理由
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => {
                    const isWin = result.phase1_win === true;
                    const isLoss = result.phase1_win === false;

                    return (
                      <motion.tr
                        key={result.ticker}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group"
                      >
                        <td className="px-4 py-4 text-sm">
                          <div className="flex items-center gap-2">
                            {isWin ? (
                              <div className="w-2 h-2 rounded-full bg-green-400 shadow-lg shadow-green-400/50 animate-pulse"></div>
                            ) : isLoss ? (
                              <div className="w-2 h-2 rounded-full bg-red-400 shadow-lg shadow-red-400/50 animate-pulse"></div>
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                            )}
                            <span className="text-lg">
                              {isWin ? "✅" : isLoss ? "❌" : "⚠️"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Link
                            href={`/${result.ticker}`}
                            className="group/link flex items-center gap-2 hover:text-blue-400 transition-colors"
                          >
                            <div>
                              <div className="text-sm font-bold text-slate-200 group-hover/link:text-blue-400 transition-colors">
                                {result.ticker}
                              </div>
                              <div className="text-xs text-slate-400 max-w-[200px] truncate">
                                {result.stock_name}
                              </div>
                            </div>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                          </Link>
                        </td>
                        <td className="px-4 py-4 text-sm text-right">
                          <span className="inline-flex items-center px-2 py-1 rounded-lg bg-blue-500/10 text-blue-300 font-medium">
                            {result.selection_score !== null ? result.selection_score.toFixed(1) : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-right text-slate-300 font-mono">
                          {result.buy_price !== null ? `¥${result.buy_price.toLocaleString()}` : "—"}
                        </td>
                        <td className="px-4 py-4 text-sm text-right text-slate-300 font-mono">
                          {result.sell_price !== null ? `¥${result.sell_price.toLocaleString()}` : "—"}
                        </td>
                        <td className={`px-4 py-4 text-sm text-right font-bold text-lg ${
                          isWin ? "text-green-400" : isLoss ? "text-red-400" : "text-slate-500"
                        }`}>
                          {result.phase1_return !== null ? (
                            <div className="flex items-center justify-end gap-1">
                              {result.phase1_return >= 0 ? (
                                <TrendingUp className="w-4 h-4" />
                              ) : (
                                <TrendingDown className="w-4 h-4" />
                              )}
                              {result.phase1_return >= 0 ? "+" : ""}
                              {result.phase1_return.toFixed(2)}%
                            </div>
                          ) : "—"}
                        </td>
                        <td className={`px-4 py-4 text-sm text-right font-bold font-mono ${
                          result.profit_per_100 !== null && result.profit_per_100 !== undefined && result.profit_per_100 > 0
                            ? "text-green-400"
                            : result.profit_per_100 !== null && result.profit_per_100 !== undefined && result.profit_per_100 < 0
                            ? "text-red-400"
                            : "text-slate-500"
                        }`}>
                          {result.profit_per_100 !== null && result.profit_per_100 !== undefined ? (
                            <>
                              {result.profit_per_100 >= 0 ? "+" : ""}
                              ¥{result.profit_per_100.toLocaleString()}
                            </>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-4 text-sm text-right">
                          {result.reason ? (
                            <div className="group/reason relative inline-block">
                              <button className="text-slate-400 hover:text-blue-400 transition-colors">
                                <ChevronRight className="w-4 h-4" />
                              </button>
                              <div className="absolute right-0 bottom-full mb-2 hidden group-hover/reason:block w-80 p-4 bg-slate-800/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl z-10">
                                <p className="text-xs text-slate-300 leading-relaxed">
                                  {result.reason}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center text-slate-500 text-sm mt-12 pt-8 border-t border-slate-800/50"
        >
          <p>GROK Backtest Dashboard v2.0 | Powered by xAI</p>
        </motion.div>
      </div>
    </div>
  );
}
