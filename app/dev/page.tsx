"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  Calendar,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronUp,
  Search,
  Star,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";
import { DashboardData } from "@/lib/grok-backtest-types";

interface OverallStats {
  total_trades: number;
  avg_return: number | null;
  win_rate: number | null;
  max_return: number | null;
  min_return: number | null;
  total_days: number;
}

interface DailyStats {
  date: string;
  total_stocks: number;
  valid_results: number;
  avg_return: number | null;
  win_rate: number | null;
  max_return: number | null;
  min_return: number | null;
  top5_avg_return: number | null;
  top5_win_rate: number | null;
}

interface BacktestSummary {
  overall: OverallStats;
  daily_stats: DailyStats[];
}

type SortField = "date" | "avg_return" | "win_rate" | "top5_avg_return";
type SortDirection = "asc" | "desc";

export default function DevDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMetric, setSelectedMetric] = useState<"return" | "winrate">("return");

  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    fetch(`${API_BASE}/api/dev/backtest/summary`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch summary");
        return res.json();
      })
      .then((dashData) => {
        setDashboardData(dashData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const sortedStats = useMemo(() => {
    if (!dashboardData) return [];

    const filtered = dashboardData.daily_stats.filter((stat) =>
      stat.date.includes(searchTerm)
    );

    filtered.sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDirection === "asc"
        ? Number(aVal) - Number(bVal)
        : Number(bVal) - Number(aVal);
    });

    return filtered;
  }, [dashboardData, sortField, sortDirection, searchTerm]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

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
          <p className="text-blue-200 text-lg">Loading Dashboard...</p>
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

  const { overall, daily_stats } = data;

  // Chart data
  const chartData = daily_stats
    .slice(0, 20)
    .reverse()
    .map((s) => ({
      date: new Date(s.date).toLocaleDateString("ja-JP", { month: "short", day: "numeric" }),
      平均リターン: s.avg_return ?? 0,
      勝率: s.win_rate ?? 0,
      "Top5平均": s.top5_avg_return ?? 0,
      "Top5勝率": s.top5_win_rate ?? 0,
    }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -top-48 -left-48 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl top-1/2 -right-48 animate-pulse delay-1000"></div>
        <div className="absolute w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -bottom-48 left-1/2 animate-pulse delay-2000"></div>
      </div>

      <div className="relative container mx-auto px-6 py-3 max-w-[1600px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-4"
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-100">
                GROK Backtest Dashboard
              </h1>
              <p className="text-slate-500 text-[10px]">
                Phase1戦略: 9:00寄付買い → 11:30前引け売り
              </p>
            </div>
          </div>
        </motion.div>

        {/* Alerts */}
        {dashboardData?.alerts && dashboardData.alerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-3 space-y-1.5"
          >
            {dashboardData.alerts.map((alert, index) => (
              <div
                key={index}
                className={`p-2 rounded-lg border backdrop-blur-xl ${
                  alert.type === 'success'
                    ? 'bg-green-500/10 border-green-500/30'
                    : alert.type === 'warning'
                    ? 'bg-yellow-500/10 border-yellow-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                }`}
              >
                <div className="flex items-start gap-2">
                  {alert.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  ) : alert.type === 'warning' ? (
                    <Info className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-semibold mb-0.5 text-sm ${
                      alert.type === 'success'
                        ? 'text-green-100'
                        : alert.type === 'warning'
                        ? 'text-yellow-100'
                        : 'text-red-100'
                    }`}>
                      {alert.title}
                    </h4>
                    <p className={`text-xs ${
                      alert.type === 'success'
                        ? 'text-green-200/80'
                        : alert.type === 'warning'
                        ? 'text-yellow-200/80'
                        : 'text-red-200/80'
                    }`}>
                      {alert.message}
                    </p>
                    {alert.action && (
                      <div className="mt-1.5">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                          alert.type === 'success'
                            ? 'bg-green-500/20 text-green-300'
                            : alert.type === 'warning'
                            ? 'bg-yellow-500/20 text-yellow-300'
                            : 'bg-red-500/20 text-red-300'
                        }`}>
                          💡 {alert.action}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* KPI Cards - 統合レイアウト */}
        {dashboardData && (
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-100 mb-2 flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-blue-400" />
              パフォーマンス指標
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
              {/* Average Profit per 100 shares */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                whileHover={{ scale: 1.02, y: -5 }}
                className="group relative bg-slate-800/40 backdrop-blur-xl rounded-xl p-3 border border-slate-700/50 overflow-hidden"
              >
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-medium text-slate-400 leading-tight">平均利益/100株</span>
                    <TrendingUp className={`w-3.5 h-3.5 flex-shrink-0 ${
                      dashboardData.overall_stats.avg_profit_per_100_shares >= 0 ? "text-green-500" : "text-red-500"
                    }`} />
                  </div>

                  {/* 全体 */}
                  <div className="mb-3 pb-3 border-b border-slate-700/50">
                    <div className="text-[10px] text-slate-500 mb-1">全体</div>
                    <div className={`text-xl font-black leading-tight text-right ${
                      dashboardData.overall_stats.avg_profit_per_100_shares >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    }`}>
                      {dashboardData.overall_stats.avg_profit_per_100_shares >= 0 ? '+' : ''}
                      {Math.round(dashboardData.overall_stats.avg_profit_per_100_shares).toLocaleString()}円
                    </div>
                  </div>

                  {/* Top5 */}
                  <div>
                    <div className="text-[10px] text-slate-500 mb-1">Top5</div>
                    <div className={`text-xl font-black leading-tight text-right ${
                      dashboardData.top5_stats.avg_profit_per_100_shares >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    }`}>
                      {dashboardData.top5_stats.avg_profit_per_100_shares >= 0 ? '+' : ''}
                      {Math.round(dashboardData.top5_stats.avg_profit_per_100_shares).toLocaleString()}円
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 text-right">
                      差額: {dashboardData.top5_stats.outperformance_profit_per_100_shares >= 0 ? '+' : ''}
                      {Math.round(dashboardData.top5_stats.outperformance_profit_per_100_shares).toLocaleString()}円
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Win Rate */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                whileHover={{ scale: 1.02, y: -5 }}
                className="group relative bg-slate-800/40 backdrop-blur-xl rounded-xl p-3 border border-slate-700/50 overflow-hidden"
              >
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-medium text-slate-400 leading-tight">勝率</span>
                    <Award className={`w-3.5 h-3.5 flex-shrink-0 ${
                      overall.win_rate && overall.win_rate >= 50 ? "text-green-500" : "text-red-500"
                    }`} />
                  </div>

                  {/* 全体 */}
                  <div className="mb-3 pb-3 border-b border-slate-700/50">
                    <div className="text-[10px] text-slate-500 mb-1">全体</div>
                    <div className={`text-xl font-black leading-tight text-right ${
                      overall.win_rate && overall.win_rate >= 50 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    }`}>
                      {overall.win_rate !== null ? `${overall.win_rate.toFixed(1)}%` : "—"}
                    </div>
                  </div>

                  {/* Top5 */}
                  <div>
                    <div className="text-[10px] text-slate-500 mb-1">Top5</div>
                    <div className={`text-xl font-black leading-tight text-right ${
                      dashboardData.top5_stats.win_rate >= 50 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    }`}>
                      {dashboardData.top5_stats.win_rate.toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 text-right">
                      {overall.total_trades}回の取引
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Total Profit */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                whileHover={{ scale: 1.02, y: -5 }}
                className="group relative bg-slate-800/40 backdrop-blur-xl rounded-xl p-3 border border-slate-700/50 overflow-hidden"
              >
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-medium text-slate-400 leading-tight">累計利益/100株</span>
                    <Activity className={`w-3.5 h-3.5 flex-shrink-0 ${
                      dashboardData.overall_stats.total_profit_per_100_shares >= 0 ? "text-green-500" : "text-red-500"
                    }`} />
                  </div>

                  {/* 全体 */}
                  <div className="mb-3 pb-3 border-b border-slate-700/50">
                    <div className="text-[10px] text-slate-500 mb-1">全体</div>
                    <div className={`text-xl font-black leading-tight text-right ${
                      dashboardData.overall_stats.total_profit_per_100_shares >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    }`}>
                      {dashboardData.overall_stats.total_profit_per_100_shares >= 0 ? '+' : ''}
                      {Math.round(dashboardData.overall_stats.total_profit_per_100_shares).toLocaleString()}円
                    </div>
                  </div>

                  {/* Top5 */}
                  <div>
                    <div className="text-[10px] text-slate-500 mb-1">Top5</div>
                    <div className={`text-xl font-black leading-tight text-right ${
                      dashboardData.top5_stats.total_profit_per_100_shares >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    }`}>
                      {dashboardData.top5_stats.total_profit_per_100_shares >= 0 ? '+' : ''}
                      {Math.round(dashboardData.top5_stats.total_profit_per_100_shares).toLocaleString()}円
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 text-right">
                      {overall.total_days}営業日
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}

        {/* L-Shaped Layout: Chart + Data Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="mb-4"
        >
          <h2 className="text-base font-bold text-slate-100 mb-2">パフォーマンス分析</h2>

          {/* Grid Layout: Chart on left, Table on right (Desktop) or stacked (Mobile) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Chart Section */}
            <div>
              <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl p-3 border border-slate-700/50 shadow-2xl h-full">
                {/* Chart Toggle */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-200">トレンド</h3>
                  <div className="flex gap-2 bg-slate-800/50 p-1 rounded-xl">
                    <button
                      onClick={() => setSelectedMetric("return")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedMetric === "return"
                          ? "bg-blue-500/80 text-white"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      リターン
                    </button>
                    <button
                      onClick={() => setSelectedMetric("winrate")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedMetric === "winrate"
                          ? "bg-blue-500/80 text-white"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      勝率
                    </button>
                  </div>
                </div>

                {/* Chart */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedMetric}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {selectedMetric === "return" ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorReturn" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorTop5" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                          <XAxis
                            dataKey="date"
                            stroke="#64748b"
                            style={{ fontSize: '10px' }}
                          />
                          <YAxis
                            stroke="#64748b"
                            style={{ fontSize: '10px' }}
                            tickFormatter={(value) => `${value}%`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(15, 23, 42, 0.9)',
                              border: '1px solid rgba(148, 163, 184, 0.2)',
                              borderRadius: '12px',
                              backdropFilter: 'blur(10px)',
                            }}
                            labelStyle={{ color: '#cbd5e1' }}
                            formatter={(value: number) => [`${value.toFixed(2)}%`, '']}
                          />
                          <Legend
                            wrapperStyle={{ paddingTop: '10px' }}
                            iconType="circle"
                          />
                          <Area
                            type="monotone"
                            dataKey="平均リターン"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            fill="url(#colorReturn)"
                            animationDuration={1000}
                          />
                          <Area
                            type="monotone"
                            dataKey="Top5平均"
                            stroke="#22c55e"
                            strokeWidth={3}
                            fill="url(#colorTop5)"
                            animationDuration={1000}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                          <XAxis
                            dataKey="date"
                            stroke="#64748b"
                            style={{ fontSize: '10px' }}
                          />
                          <YAxis
                            stroke="#64748b"
                            style={{ fontSize: '10px' }}
                            tickFormatter={(value) => `${value}%`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(15, 23, 42, 0.9)',
                              border: '1px solid rgba(148, 163, 184, 0.2)',
                              borderRadius: '12px',
                              backdropFilter: 'blur(10px)',
                            }}
                            labelStyle={{ color: '#cbd5e1' }}
                            formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
                          />
                          <Legend
                            wrapperStyle={{ paddingTop: '10px' }}
                            iconType="circle"
                          />
                          <Bar
                            dataKey="勝率"
                            fill="#3b82f6"
                            radius={[8, 8, 0, 0]}
                            animationDuration={1000}
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.勝率 > 50 ? "#3b82f6" : "#ef4444"} />
                            ))}
                          </Bar>
                          <Bar
                            dataKey="Top5勝率"
                            fill="#22c55e"
                            radius={[8, 8, 0, 0]}
                            animationDuration={1000}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Data Table Section */}
            <div>
              <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl p-3 border border-slate-700/50 shadow-2xl h-full">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-slate-200">バックテスト履歴</h3>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="日付で検索..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-900/90 backdrop-blur-sm z-10">
                      <tr className="border-b border-slate-700/50">
                        <th
                          className="px-3 py-2 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-blue-400 transition-colors"
                          onClick={() => handleSort("date")}
                        >
                          <div className="flex items-center gap-1">
                            日付
                            {sortField === "date" && (
                              sortDirection === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                            )}
                          </div>
                        </th>
                        <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          取引数
                        </th>
                        <th
                          className="px-3 py-2 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-blue-400 transition-colors"
                          onClick={() => handleSort("avg_return")}
                        >
                          <div className="flex items-center justify-end gap-1">
                            平均
                            {sortField === "avg_return" && (
                              sortDirection === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                            )}
                          </div>
                        </th>
                        <th
                          className="px-3 py-2 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-blue-400 transition-colors"
                          onClick={() => handleSort("win_rate")}
                        >
                          <div className="flex items-center justify-end gap-1">
                            勝率
                            {sortField === "win_rate" && (
                              sortDirection === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                            )}
                          </div>
                        </th>
                        <th
                          className="px-3 py-2 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-blue-400 transition-colors"
                          onClick={() => handleSort("top5_avg_return")}
                        >
                          <div className="flex items-center justify-end gap-1">
                            Top5
                            {sortField === "top5_avg_return" && (
                              sortDirection === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                            )}
                          </div>
                        </th>
                        <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          詳細
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {sortedStats.slice(0, 20).map((stat, index) => (
                          <motion.tr
                            key={stat.date}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3, delay: index * 0.02 }}
                            className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group"
                          >
                            <td className="px-3 py-2 text-xs font-medium text-slate-200">
                              {stat.date}
                            </td>
                            <td className="px-3 py-2 text-xs text-right text-slate-300">
                              {stat.valid_results}
                            </td>
                            <td className={`px-3 py-2 text-xs text-right font-bold ${
                              stat.avg_return !== null
                                ? stat.avg_return > 0
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                                : "text-slate-500"
                            }`}>
                              {stat.avg_return !== null
                                ? `${stat.avg_return >= 0 ? "+" : ""}${stat.avg_return.toFixed(2)}%`
                                : "—"}
                            </td>
                            <td className="px-3 py-2 text-xs text-right text-slate-300">
                              {stat.win_rate !== null ? `${stat.win_rate.toFixed(1)}%` : "—"}
                            </td>
                            <td className={`px-3 py-2 text-xs text-right font-bold ${
                              stat.top5_avg_return !== null
                                ? stat.top5_avg_return > 0
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                                : "text-slate-500"
                            }`}>
                              {stat.top5_avg_return !== null
                                ? `${stat.top5_avg_return >= 0 ? "+" : ""}${stat.top5_avg_return.toFixed(2)}%`
                                : "—"}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <Link
                                href={`/dev/daily/${stat.date}`}
                                className="inline-flex items-center gap-0.5 px-2 py-1 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-all"
                              >
                                <ArrowUpRight className="w-3 h-3" />
                              </Link>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="text-center text-slate-500 text-sm mt-12 pt-8 border-t border-slate-800/50"
        >
          <p>GROK Backtest Dashboard v2.0 | Powered by xAI</p>
        </motion.div>
      </div>
    </div>
  );
}
