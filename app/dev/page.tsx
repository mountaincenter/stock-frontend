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
} from "lucide-react";

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

// Animated counter component
function AnimatedCounter({ value, suffix = "", decimals = 0 }: { value: number; suffix?: string; decimals?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) return;

    const duration = 1000;
    const increment = end / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if ((increment > 0 && start >= end) || (increment < 0 && start <= end)) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span>
      {count.toFixed(decimals)}
      {suffix}
    </span>
  );
}

export default function DevDashboard() {
  const [data, setData] = useState<BacktestSummary | null>(null);
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
  }, []);

  const sortedStats = useMemo(() => {
    if (!data) return [];

    const filtered = data.daily_stats.filter((stat) =>
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
  }, [data, sortField, sortDirection, searchTerm]);

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

  const isPositive = (val: number | null) => val !== null && val > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -top-48 -left-48 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-purple-500/10 rounded-full blur-3xl top-1/2 -right-48 animate-pulse delay-1000"></div>
        <div className="absolute w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -bottom-48 left-1/2 animate-pulse delay-2000"></div>
      </div>

      <div className="relative container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg shadow-blue-500/50">
              <Activity className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-5xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                GROK Backtest Dashboard
              </h1>
              <p className="text-blue-200/60 text-sm mt-1">
                Phase1戦略: 9:00寄付買い → 11:30前引け売り | リアルタイムパフォーマンス分析
              </p>
            </div>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Total Trades */}
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
                <span className="text-blue-200/60 text-sm font-medium">総取引数</span>
                <Target className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-4xl font-black mb-2 text-blue-100">
                <AnimatedCounter value={overall.total_trades} />
              </div>
              <div className="text-blue-300/60 text-xs">
                {overall.total_days}営業日
              </div>
            </div>
          </motion.div>

          {/* Average Return */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            whileHover={{ scale: 1.02, y: -5 }}
            className={`group relative backdrop-blur-xl rounded-3xl p-6 border shadow-xl overflow-hidden ${
              isPositive(overall.avg_return)
                ? "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20 shadow-green-500/10"
                : "bg-gradient-to-br from-red-500/10 to-rose-500/10 border-red-500/20 shadow-red-500/10"
            }`}
          >
            <div className={`absolute inset-0 transition-all duration-500 ${
              isPositive(overall.avg_return)
                ? "bg-gradient-to-br from-green-500/0 to-emerald-500/0 group-hover:from-green-500/10 group-hover:to-emerald-500/10"
                : "bg-gradient-to-br from-red-500/0 to-rose-500/0 group-hover:from-red-500/10 group-hover:to-rose-500/10"
            }`}></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-medium ${isPositive(overall.avg_return) ? "text-green-200/60" : "text-red-200/60"}`}>
                  平均リターン
                </span>
                {isPositive(overall.avg_return) ? (
                  <TrendingUp className="w-5 h-5 text-green-400" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-400" />
                )}
              </div>
              <div className={`text-4xl font-black mb-2 ${isPositive(overall.avg_return) ? "text-green-100" : "text-red-100"}`}>
                {overall.avg_return !== null ? (
                  <>
                    {overall.avg_return >= 0 ? "+" : ""}
                    <AnimatedCounter value={overall.avg_return} decimals={2} suffix="%" />
                  </>
                ) : "—"}
              </div>
              <div className={`text-xs ${isPositive(overall.avg_return) ? "text-green-300/60" : "text-red-300/60"}`}>
                全期間平均
              </div>
            </div>
          </motion.div>

          {/* Win Rate */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            whileHover={{ scale: 1.02, y: -5 }}
            className="group relative bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl rounded-3xl p-6 border border-purple-500/20 shadow-xl shadow-purple-500/10 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-pink-500/0 group-hover:from-purple-500/10 group-hover:to-pink-500/10 transition-all duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-purple-200/60 text-sm font-medium">勝率</span>
                <Award className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-4xl font-black mb-2 text-purple-100">
                {overall.win_rate !== null ? (
                  <AnimatedCounter value={overall.win_rate} decimals={1} suffix="%" />
                ) : "—"}
              </div>
              <div className="text-purple-300/60 text-xs">
                プラス決済の割合
              </div>
            </div>
          </motion.div>

          {/* Max/Min */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            whileHover={{ scale: 1.02, y: -5 }}
            className="group relative bg-gradient-to-br from-orange-500/10 to-amber-500/10 backdrop-blur-xl rounded-3xl p-6 border border-orange-500/20 shadow-xl shadow-orange-500/10 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 to-amber-500/0 group-hover:from-orange-500/10 group-hover:to-amber-500/10 transition-all duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-orange-200/60 text-sm font-medium">最高/最低</span>
                <Calendar className="w-5 h-5 text-orange-400" />
              </div>
              <div className="space-y-1">
                {overall.max_return !== null && overall.min_return !== null ? (
                  <>
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="w-4 h-4 text-green-400" />
                      <span className="text-xl font-bold text-green-300">
                        +{overall.max_return.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowDownRight className="w-4 h-4 text-red-400" />
                      <span className="text-xl font-bold text-red-300">
                        {overall.min_return.toFixed(2)}%
                      </span>
                    </div>
                  </>
                ) : "—"}
              </div>
              <div className="text-orange-300/60 text-xs mt-2">
                リターン範囲
              </div>
            </div>
          </motion.div>
        </div>

        {/* Charts Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mb-12"
        >
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-2xl">
            {/* Chart Toggle */}
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-blue-100">パフォーマンストレンド</h2>
              <div className="flex gap-2 bg-slate-800/50 p-1 rounded-xl">
                <button
                  onClick={() => setSelectedMetric("return")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedMetric === "return"
                      ? "bg-blue-500 text-white shadow-lg shadow-blue-500/50"
                      : "text-blue-300 hover:text-blue-100"
                  }`}
                >
                  リターン
                </button>
                <button
                  onClick={() => setSelectedMetric("winrate")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedMetric === "winrate"
                      ? "bg-purple-500 text-white shadow-lg shadow-purple-500/50"
                      : "text-purple-300 hover:text-purple-100"
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
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorReturn" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorTop5" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                      <XAxis
                        dataKey="date"
                        stroke="#64748b"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis
                        stroke="#64748b"
                        style={{ fontSize: '12px' }}
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
                        wrapperStyle={{ paddingTop: '20px' }}
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
                        stroke="#a855f7"
                        strokeWidth={3}
                        fill="url(#colorTop5)"
                        animationDuration={1000}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                      <XAxis
                        dataKey="date"
                        stroke="#64748b"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis
                        stroke="#64748b"
                        style={{ fontSize: '12px' }}
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
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="circle"
                      />
                      <Bar
                        dataKey="勝率"
                        fill="#10b981"
                        radius={[8, 8, 0, 0]}
                        animationDuration={1000}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.勝率 > 50 ? "#10b981" : "#ef4444"} />
                        ))}
                      </Bar>
                      <Bar
                        dataKey="Top5勝率"
                        fill="#a855f7"
                        radius={[8, 8, 0, 0]}
                        animationDuration={1000}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Data Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mb-12"
        >
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-blue-100">バックテスト履歴</h2>

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

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th
                      className="px-4 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-blue-400 transition-colors"
                      onClick={() => handleSort("date")}
                    >
                      <div className="flex items-center gap-2">
                        日付
                        {sortField === "date" && (
                          sortDirection === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      取引数
                    </th>
                    <th
                      className="px-4 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-blue-400 transition-colors"
                      onClick={() => handleSort("avg_return")}
                    >
                      <div className="flex items-center justify-end gap-2">
                        平均リターン
                        {sortField === "avg_return" && (
                          sortDirection === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-blue-400 transition-colors"
                      onClick={() => handleSort("win_rate")}
                    >
                      <div className="flex items-center justify-end gap-2">
                        勝率
                        {sortField === "win_rate" && (
                          sortDirection === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-blue-400 transition-colors"
                      onClick={() => handleSort("top5_avg_return")}
                    >
                      <div className="flex items-center justify-end gap-2">
                        Top5平均
                        {sortField === "top5_avg_return" && (
                          sortDirection === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Top5勝率
                    </th>
                    <th className="px-4 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      詳細
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {sortedStats.slice(0, 15).map((stat, index) => (
                      <motion.tr
                        key={stat.date}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3, delay: index * 0.03 }}
                        className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group"
                      >
                        <td className="px-4 py-4 text-sm font-medium text-slate-200">
                          {stat.date}
                        </td>
                        <td className="px-4 py-4 text-sm text-right text-slate-300">
                          {stat.valid_results}
                        </td>
                        <td className={`px-4 py-4 text-sm text-right font-bold ${
                          stat.avg_return !== null
                            ? stat.avg_return > 0
                              ? "text-green-400"
                              : "text-red-400"
                            : "text-slate-500"
                        }`}>
                          {stat.avg_return !== null
                            ? `${stat.avg_return >= 0 ? "+" : ""}${stat.avg_return.toFixed(2)}%`
                            : "—"}
                        </td>
                        <td className="px-4 py-4 text-sm text-right text-slate-300">
                          {stat.win_rate !== null ? `${stat.win_rate.toFixed(1)}%` : "—"}
                        </td>
                        <td className={`px-4 py-4 text-sm text-right font-bold ${
                          stat.top5_avg_return !== null
                            ? stat.top5_avg_return > 0
                              ? "text-green-400"
                              : "text-red-400"
                            : "text-slate-500"
                        }`}>
                          {stat.top5_avg_return !== null
                            ? `${stat.top5_avg_return >= 0 ? "+" : ""}${stat.top5_avg_return.toFixed(2)}%`
                            : "—"}
                        </td>
                        <td className="px-4 py-4 text-sm text-right text-slate-300">
                          {stat.top5_win_rate !== null ? `${stat.top5_win_rate.toFixed(1)}%` : "—"}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Link
                            href={`/dev/daily/${stat.date}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-all group-hover:scale-105"
                          >
                            詳細
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
