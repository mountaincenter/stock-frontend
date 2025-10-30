"use client";

import { useEffect, useState, Fragment } from "react";
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
        <div className="absolute w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -top-48 -left-48 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl top-1/2 -right-48 animate-pulse delay-1000"></div>
        <div className="absolute w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -bottom-48 left-1/2 animate-pulse delay-2000"></div>
      </div>

      <div className="relative container mx-auto px-4 py-3 max-w-7xl">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-3"
        >
          <Link
            href="/dev"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors group text-sm"
          >
            <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
            ダッシュボードに戻る
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-4"
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-100">
                {date}
              </h1>
              <p className="text-slate-500 text-[10px]">
                Phase1戦略: 9:00寄付買い → 11:30前引け売り
              </p>
            </div>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            whileHover={{ scale: 1.02, y: -5 }}
            className="group relative bg-slate-800/40 backdrop-blur-xl rounded-xl p-2 border border-slate-700/50 overflow-hidden"
          >
            <div className="relative">
              <div className="text-[10px] text-slate-400 mb-1">取引数</div>
              <div className="text-xl font-black text-slate-100 text-right">{stats.valid_results}</div>
              <div className="text-[9px] text-slate-500">/ {stats.total_stocks} 銘柄</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            whileHover={{ scale: 1.02, y: -5 }}
            className="group relative bg-slate-800/40 backdrop-blur-xl rounded-xl p-2 border border-slate-700/50 overflow-hidden"
          >
            <div className="relative">
              <div className="text-[10px] text-slate-400 mb-1">平均リターン</div>
              <div className={`text-xl font-black text-right ${stats.avg_return !== null && stats.avg_return > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {stats.avg_return !== null ? `${stats.avg_return >= 0 ? "+" : ""}${stats.avg_return.toFixed(2)}%` : "—"}
              </div>
              <div className="text-slate-500 text-[9px]">全銘柄平均</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            whileHover={{ scale: 1.02, y: -5 }}
            className="group relative bg-slate-800/40 backdrop-blur-xl rounded-xl p-2 border border-slate-700/50 overflow-hidden"
          >
            <div className="relative">
              <div className="text-[10px] text-slate-400 mb-1">勝率</div>
              <div className={`text-xl font-black text-right ${stats.win_rate && stats.win_rate >= 50 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {stats.win_rate !== null ? `${stats.win_rate.toFixed(1)}%` : "—"}
              </div>
              <div className="text-slate-500 text-[9px]">プラス決済</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            whileHover={{ scale: 1.02, y: -5 }}
            className="group relative bg-slate-800/40 backdrop-blur-xl rounded-xl p-2 border border-slate-700/50 overflow-hidden"
          >
            <div className="relative">
              <div className="text-[10px] text-slate-400 mb-1">Top5平均</div>
              <div className={`text-xl font-black text-right ${stats.top5_avg_return !== null && stats.top5_avg_return > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {stats.top5_avg_return !== null ? `${stats.top5_avg_return >= 0 ? "+" : ""}${stats.top5_avg_return.toFixed(2)}%` : "—"}
              </div>
              <div className="text-slate-500 text-[9px]">
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
          className="mb-4"
        >
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl p-4 border border-slate-700/50 shadow-2xl">
            <h2 className="text-base font-bold text-slate-100 mb-3">銘柄別パフォーマンス</h2>

            <div className="overflow-x-auto max-h-[700px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-900/90 backdrop-blur-sm z-10">
                  <tr className="border-b border-slate-700/50">
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      結果
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      銘柄
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      スコア
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      買値
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      売値
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      リターン
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      100株利益
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      理由
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => {
                    const isFlat = result.phase1_return !== null && result.phase1_return === 0;
                    const isWin = !isFlat && result.phase1_win === true;
                    const isLoss = !isFlat && result.phase1_win === false;

                    return (
                      <motion.tr
                        key={result.ticker}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.01 }}
                        className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group"
                      >
                        <td className="px-3 py-3 text-sm">
                          {isFlat ? "➖" : isWin ? "✅" : isLoss ? "❌" : "⚠️"}
                        </td>
                        <td className="px-3 py-3">
                          <div className="text-sm font-bold text-slate-100">{result.stock_name}</div>
                          <div className="text-xs text-slate-500 font-mono">{result.ticker}</div>
                        </td>
                        <td className="px-3 py-3 text-sm text-right">
                          <span className="text-blue-300 font-medium">
                            {result.selection_score !== null ? result.selection_score.toFixed(1) : "—"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm text-right text-slate-300 font-mono">
                          {result.buy_price !== null ? `${result.buy_price.toLocaleString()}円` : "—"}
                        </td>
                        <td className="px-3 py-3 text-sm text-right text-slate-300 font-mono">
                          {result.sell_price !== null ? `${result.sell_price.toLocaleString()}円` : "—"}
                        </td>
                        <td className={`px-3 py-3 text-sm text-right font-bold ${
                          isWin ? "text-green-600 dark:text-green-400" : isLoss ? "text-red-600 dark:text-red-400" : isFlat ? "text-slate-400" : "text-slate-500"
                        }`}>
                          {result.phase1_return !== null ? (
                            <>
                              {result.phase1_return > 0 ? "+" : ""}
                              {result.phase1_return.toFixed(2)}%
                            </>
                          ) : "—"}
                        </td>
                        <td className={`px-3 py-3 text-sm text-right font-bold font-mono ${
                          result.profit_per_100 !== null && result.profit_per_100 !== undefined && result.profit_per_100 > 0
                            ? "text-green-600 dark:text-green-400"
                            : result.profit_per_100 !== null && result.profit_per_100 !== undefined && result.profit_per_100 < 0
                            ? "text-red-600 dark:text-red-400"
                            : result.profit_per_100 !== null && result.profit_per_100 !== undefined && result.profit_per_100 === 0
                            ? "text-slate-400"
                            : "text-slate-500"
                        }`}>
                          {result.profit_per_100 !== null && result.profit_per_100 !== undefined ? (
                            <>
                              {result.profit_per_100 > 0 ? "+" : ""}
                              {result.profit_per_100.toLocaleString()}円
                            </>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-3 text-sm text-right">
                          {result.reason ? (
                            <div className="group/reason relative inline-block">
                              <button className="text-slate-400 hover:text-blue-400 transition-colors">
                                <ChevronRight className="w-4 h-4" />
                              </button>
                              <div className="absolute right-0 bottom-full mb-2 hidden group-hover/reason:block w-80 p-3 bg-slate-800/95 backdrop-blur-xl border border-slate-700 rounded-lg shadow-2xl z-10">
                                <p className="text-sm text-slate-300 leading-relaxed">
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
          className="text-center text-slate-500 text-xs mt-4 pt-4 border-t border-slate-800/50"
        >
          <p>GROK Backtest Dashboard v2.0 | Powered by xAI</p>
        </motion.div>
      </div>
    </div>
  );
}
