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
  BarChart3,
} from "lucide-react";
import { DashboardData } from "@/lib/grok-backtest-types";
import MarketSummary from "@/components/MarketSummary";

type SortField = "date" | "win_rate" | "count";
type SortDirection = "asc" | "desc";
type Phase = "phase1" | "phase2" | "phase3";

const PHASE_INFO = {
  phase1: {
    label: "Phase 1",
    title: "前場引け売り",
    description: "9:00寄付買い → 11:30前引け売り"
  },
  phase2: {
    label: "Phase 2",
    title: "大引け売り",
    description: "9:00寄付買い → 15:30大引け売り"
  },
  phase3: {
    label: "Phase 3",
    title: "利確損切戦略",
    description: "9:00寄付買い → +3%利確 または -3%損切り"
  }
} as const;

export default function DevDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMetric, setSelectedMetric] = useState<"return" | "winrate" | "cumulative">("return");
  const [dateFilter, setDateFilter] = useState<"all" | "week" | "month">("all");
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<Phase>("phase2"); // デフォルトはPhase 2

  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    const params = new URLSearchParams();
    params.append("phase", selectedPhase);
    if (selectedVersion) {
      params.append("prompt_version", selectedVersion);
    }
    const url = `${API_BASE}/api/dev/backtest/summary?${params.toString()}`;

    setLoading(true);
    fetch(url)
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
  }, [selectedVersion, selectedPhase]);

  const sortedStats = useMemo(() => {
    if (!dashboardData) return [];

    // 期間フィルター適用
    const sorted = dashboardData.daily_stats.slice().sort((a, b) => a.date.localeCompare(b.date));
    let dateFiltered = sorted;
    if (dateFilter === "week") {
      dateFiltered = sorted.slice(-7);
    } else if (dateFilter === "month") {
      dateFiltered = sorted.slice(-30);
    }

    // 検索フィルター
    const filtered = dateFiltered.filter((stat) =>
      stat.date.includes(searchTerm)
    );

    // ソート
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
  }, [dashboardData, sortField, sortDirection, searchTerm, dateFilter]);

  // 期間フィルター処理
  const filteredDailyStats = useMemo(() => {
    if (!dashboardData) return [];
    const sorted = dashboardData.daily_stats.slice().sort((a, b) => a.date.localeCompare(b.date));
    if (dateFilter === "all") return sorted;

    const filterDays = dateFilter === "week" ? 7 : 30;
    return sorted.slice(-filterDays);
  }, [dashboardData, dateFilter]);

  // Chart data (最新が右側になるよう、古い順でソート)
  const chartData = useMemo(() => {
    return filteredDailyStats.map((s) => ({
      date: new Date(s.date).toLocaleDateString("ja-JP", { month: "short", day: "numeric" }),
      平均リターン: s.avg_return ?? 0,
      Top5平均: s.top5_avg_return ?? 0,
      勝率: s.win_rate ?? 0,
      Top5勝率: s.top5_win_rate ?? 0,
      累積損益: s.cumulative_profit_per_100 ?? 0,
      Top5累積損益: s.cumulative_top5_profit_per_100 ?? 0,
    }));
  }, [filteredDailyStats]);

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

  if (error || !dashboardData) {
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

  const { overall_stats, top5_stats, daily_stats, trend_analysis, alerts } = dashboardData;

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
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            {/* タイトルセクション */}
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-100">
                  GROK Backtest Dashboard
                </h1>
                <p className="text-slate-500 text-[10px]">
                  {PHASE_INFO[selectedPhase].title}戦略: {PHASE_INFO[selectedPhase].description}
                </p>
              </div>
            </div>

            {/* フィルターセクション */}
            <div className="flex flex-col lg:flex-row gap-2">
            {/* 分析リンク */}
            <div>
              <div className="text-[9px] text-slate-500 font-medium mb-1 uppercase tracking-wider lg:hidden">
                Analysis
              </div>
              <Link
                href="/dev/analyze"
                className="group relative flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white rounded-lg font-semibold text-sm whitespace-nowrap overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/50 hover:scale-105"
                title="マーケット要因分析"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <TrendingUp className="w-4 h-4 relative z-10 group-hover:rotate-12 transition-transform duration-300" />
                <span className="relative z-10">分析</span>
              </Link>
            </div>

            {/* Grok分析リンク */}
            <div>
              <div className="text-[9px] text-slate-500 font-medium mb-1 uppercase tracking-wider lg:hidden">
                Grok Analysis
              </div>
              <Link
                href="/dev/grok-analysis"
                className="group relative flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 text-white rounded-lg font-semibold text-sm whitespace-nowrap overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/50 hover:scale-105"
                title="Grok推奨銘柄詳細分析"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <BarChart3 className="w-4 h-4 relative z-10 group-hover:rotate-12 transition-transform duration-300" />
                <span className="relative z-10">Grok分析</span>
              </Link>
            </div>

            {/* タイミング分析リンク */}
            <div>
              <div className="text-[9px] text-slate-500 font-medium mb-1 uppercase tracking-wider lg:hidden">
                Timing Analysis
              </div>
              <Link
                href="/dev/timing-analysis"
                className="group relative flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-br from-amber-500 via-orange-500 to-red-600 text-white rounded-lg font-semibold text-sm whitespace-nowrap overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/50 hover:scale-105"
                title="売買タイミング最適化分析"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <Activity className="w-4 h-4 relative z-10 group-hover:rotate-12 transition-transform duration-300" />
                <span className="relative z-10">タイミング分析</span>
              </Link>
            </div>

            {/* Grok v2比較リンク */}
            <div>
              <div className="text-[9px] text-slate-500 font-medium mb-1 uppercase tracking-wider lg:hidden">
                Grok v2 Compare
              </div>
              <Link
                href="/dev/grok-analysis-v2"
                className="group relative flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-600 text-white rounded-lg font-semibold text-sm whitespace-nowrap overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-violet-500/50 hover:scale-105"
                title="v2.0.3 vs v2.1 比較分析"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <BarChart3 className="w-4 h-4 relative z-10 group-hover:rotate-12 transition-transform duration-300" />
                <span className="relative z-10">v2比較</span>
              </Link>
            </div>

            {/* 売買推奨リンク */}
            <div>
              <div className="text-[9px] text-slate-500 font-medium mb-1 uppercase tracking-wider lg:hidden">
                Recommendations
              </div>
              <Link
                href="/dev/recommendations"
                className="group relative flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 text-white rounded-lg font-semibold text-sm whitespace-nowrap overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/50 hover:scale-105"
                title="今日の売買推奨"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <Target className="w-4 h-4 relative z-10 group-hover:rotate-12 transition-transform duration-300" />
                <span className="relative z-10">売買推奨</span>
              </Link>
            </div>

            {/* Phase選択 */}
            <div>
              <div className="text-[9px] text-slate-500 font-medium mb-1 uppercase tracking-wider lg:hidden">
                Phase Strategy
              </div>
              <div className="flex gap-1 bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
                {(Object.keys(PHASE_INFO) as Phase[]).map((phase) => (
                  <button
                    key={phase}
                    onClick={() => setSelectedPhase(phase)}
                    className={`px-3 py-2 rounded text-xs font-semibold transition-all whitespace-nowrap ${
                      selectedPhase === phase
                        ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/30"
                    }`}
                  >
                    {PHASE_INFO[phase].label}
                  </button>
                ))}
              </div>
            </div>

            {/* プロンプトバージョン選択 */}
            {dashboardData?.available_versions && dashboardData.available_versions.length > 0 && (
              <div>
                <div className="text-[9px] text-slate-500 font-medium mb-1 uppercase tracking-wider lg:hidden">
                  Prompt Version
                </div>
                <div className="flex gap-1 bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
                  <button
                    onClick={() => setSelectedVersion(null)}
                    className={`px-3 py-2 rounded text-xs font-semibold transition-all ${
                      !selectedVersion
                        ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/30"
                    }`}
                  >
                    All
                  </button>
                  {dashboardData.available_versions.map((version) => (
                    <button
                      key={version}
                      onClick={() => setSelectedVersion(version)}
                      className={`px-3 py-2 rounded text-xs font-semibold transition-all whitespace-nowrap ${
                        selectedVersion === version
                          ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/30"
                      }`}
                    >
                      {version.replace(/_/g, ' ').toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 期間フィルター */}
            <div>
              <div className="text-[9px] text-slate-500 font-medium mb-1 uppercase tracking-wider lg:hidden">
                Period
              </div>
              <div className="flex gap-1 bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
                <button
                  onClick={() => setDateFilter("week")}
                  className={`px-4 py-2 rounded text-xs font-semibold transition-all ${
                    dateFilter === "week"
                      ? "bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg shadow-blue-500/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/30"
                  }`}
                >
                  7D
                </button>
                <button
                  onClick={() => setDateFilter("month")}
                  className={`px-4 py-2 rounded text-xs font-semibold transition-all ${
                    dateFilter === "month"
                      ? "bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg shadow-blue-500/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/30"
                  }`}
                >
                  30D
                </button>
                <button
                  onClick={() => setDateFilter("all")}
                  className={`px-4 py-2 rounded text-xs font-semibold transition-all ${
                    dateFilter === "all"
                      ? "bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg shadow-blue-500/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/30"
                  }`}
                >
                  ALL
                </button>
              </div>
            </div>
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
              {/* Win Rate */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                whileHover={{ scale: 1.02, y: -5 }}
                className="group relative bg-slate-800/40 backdrop-blur-xl rounded-xl p-2.5 border border-slate-700/50 overflow-hidden"
              >
                <div className="relative h-full flex flex-col">
                  <div className="h-[20px] flex items-center mb-2">
                    <span className="text-xs font-semibold text-slate-300 leading-none">勝率</span>
                  </div>

                  {/* 全体 */}
                  <div className="mb-2 pb-2 border-b border-slate-700/50">
                    <div className="h-[16px] flex items-center mb-0.5">
                      <span className="text-[11px] text-slate-400 leading-none">全体</span>
                    </div>
                    <div className={`h-[24px] flex items-center justify-end text-lg font-black ${
                      overall_stats.win_rate && overall_stats.win_rate >= 50 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    }`}>
                      {overall_stats.win_rate !== null ? `${overall_stats.win_rate.toFixed(1)}%` : "—"}
                    </div>
                    <div className="h-[12px]"></div>
                  </div>

                  {/* Top5 */}
                  <div>
                    <div className="h-[16px] flex items-center mb-0.5">
                      <span className="text-[11px] text-slate-400 leading-none">Top5</span>
                    </div>
                    <div className={`h-[24px] flex items-center justify-end text-lg font-black ${
                      dashboardData.top5_stats.win_rate >= 50 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    }`}>
                      {dashboardData.top5_stats.win_rate.toFixed(1)}%
                    </div>
                    <div className="h-[16px] flex items-center justify-end mt-0.5">
                      <span className="text-[11px] text-slate-400 leading-none">{overall_stats.valid_count}回の取引</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Average Profit per 100 shares */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                whileHover={{ scale: 1.02, y: -5 }}
                className="group relative bg-slate-800/40 backdrop-blur-xl rounded-xl p-2.5 border border-slate-700/50 overflow-hidden"
              >
                <div className="relative h-full flex flex-col">
                  <div className="h-[20px] flex items-center mb-2">
                    <span className="text-xs font-semibold text-slate-300 leading-none">平均損益/100株</span>
                  </div>

                  {/* 全体 */}
                  <div className="mb-2 pb-2 border-b border-slate-700/50">
                    <div className="h-[16px] flex items-center mb-0.5">
                      <span className="text-[11px] text-slate-400 leading-none">全体</span>
                    </div>
                    <div className={`h-[24px] flex items-center justify-end text-lg font-black ${
                      dashboardData.overall_stats.avg_profit_per_100_shares >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    }`}>
                      {dashboardData.overall_stats.avg_profit_per_100_shares >= 0 ? '+' : ''}
                      {Math.round(dashboardData.overall_stats.avg_profit_per_100_shares).toLocaleString()}円
                    </div>
                    <div className="h-[12px] flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
                      <span>中央値: {Math.round((dashboardData.overall_stats.median_return / 100) * ((dashboardData.overall_stats.avg_profit_per_100_shares / dashboardData.overall_stats.avg_return) * 100)).toLocaleString()}円</span>
                      <span>σ: {Math.round((dashboardData.overall_stats.std_return / 100) * ((dashboardData.overall_stats.avg_profit_per_100_shares / dashboardData.overall_stats.avg_return) * 100)).toLocaleString()}円</span>
                    </div>
                  </div>

                  {/* Top5 */}
                  <div>
                    <div className="h-[16px] flex items-center mb-0.5">
                      <span className="text-[11px] text-slate-400 leading-none">Top5</span>
                    </div>
                    <div className={`h-[24px] flex items-center justify-end text-lg font-black ${
                      dashboardData.top5_stats.avg_profit_per_100_shares >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    }`}>
                      {dashboardData.top5_stats.avg_profit_per_100_shares >= 0 ? '+' : ''}
                      {Math.round(dashboardData.top5_stats.avg_profit_per_100_shares).toLocaleString()}円
                    </div>
                    <div className="h-[16px] flex items-center justify-end mt-0.5">
                      <span className="text-[11px] text-slate-400 leading-none">
                        差額: {dashboardData.top5_stats.outperformance_profit_per_100_shares >= 0 ? '+' : ''}
                        {Math.round(dashboardData.top5_stats.outperformance_profit_per_100_shares).toLocaleString()}円
                      </span>
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
                className="group relative bg-slate-800/40 backdrop-blur-xl rounded-xl p-2.5 border border-slate-700/50 overflow-hidden"
              >
                <div className="relative h-full flex flex-col">
                  <div className="h-[20px] flex items-center mb-2">
                    <span className="text-xs font-semibold text-slate-300 leading-none">累計損益/100株</span>
                  </div>

                  {/* 全体 */}
                  <div className="mb-2 pb-2 border-b border-slate-700/50">
                    <div className="h-[16px] flex items-center mb-0.5">
                      <span className="text-[11px] text-slate-400 leading-none">全体</span>
                    </div>
                    <div className={`h-[24px] flex items-center justify-end text-lg font-black ${
                      dashboardData.overall_stats.total_profit_per_100_shares >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    }`}>
                      {dashboardData.overall_stats.total_profit_per_100_shares >= 0 ? '+' : ''}
                      {Math.round(dashboardData.overall_stats.total_profit_per_100_shares).toLocaleString()}円
                    </div>
                    <div className="h-[12px]"></div>
                  </div>

                  {/* Top5 */}
                  <div>
                    <div className="h-[16px] flex items-center mb-0.5">
                      <span className="text-[11px] text-slate-400 leading-none">Top5</span>
                    </div>
                    <div className={`h-[24px] flex items-center justify-end text-lg font-black ${
                      dashboardData.top5_stats.total_profit_per_100_shares >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    }`}>
                      {dashboardData.top5_stats.total_profit_per_100_shares >= 0 ? '+' : ''}
                      {Math.round(dashboardData.top5_stats.total_profit_per_100_shares).toLocaleString()}円
                    </div>
                    <div className="h-[16px] flex items-center justify-end mt-0.5">
                      <span className="text-[11px] text-slate-400 leading-none">{overall_stats.total_days}営業日</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}

        {/* Performance Analysis Section */}
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
                  <div className="flex gap-1 bg-slate-800/50 p-0.5 rounded-lg">
                    <button
                      onClick={() => setSelectedMetric("return")}
                      className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                        selectedMetric === "return"
                          ? "bg-blue-500/80 text-white"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      リターン
                    </button>
                    <button
                      onClick={() => setSelectedMetric("winrate")}
                      className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                        selectedMetric === "winrate"
                          ? "bg-blue-500/80 text-white"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      勝率
                    </button>
                    <button
                      onClick={() => setSelectedMetric("cumulative")}
                      className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                        selectedMetric === "cumulative"
                          ? "bg-blue-500/80 text-white"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      累積損益
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
                    {selectedMetric === "return" && (
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
                    )}
                    {selectedMetric === "winrate" && (
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
                    {selectedMetric === "cumulative" && (
                      <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorCumulativeTop5" x1="0" y1="0" x2="0" y2="1">
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
                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k円`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(15, 23, 42, 0.9)',
                              border: '1px solid rgba(148, 163, 184, 0.2)',
                              borderRadius: '12px',
                              backdropFilter: 'blur(10px)',
                            }}
                            labelStyle={{ color: '#cbd5e1' }}
                            formatter={(value: number) => [`${Math.round(value).toLocaleString()}円`, '']}
                          />
                          <Legend
                            wrapperStyle={{ paddingTop: '10px' }}
                            iconType="circle"
                          />
                          <Area
                            type="monotone"
                            dataKey="累積損益"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            fill="url(#colorCumulative)"
                            animationDuration={1000}
                          />
                          <Area
                            type="monotone"
                            dataKey="Top5累積損益"
                            stroke="#22c55e"
                            strokeWidth={3}
                            fill="url(#colorCumulativeTop5)"
                            animationDuration={1000}
                          />
                        </AreaChart>
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
                          onClick={() => handleSort("win_rate")}
                        >
                          <div className="flex items-center justify-end gap-1">
                            勝率
                            {sortField === "win_rate" && (
                              sortDirection === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                            )}
                          </div>
                        </th>
                        <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          累計損益/100株
                        </th>
                        <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          Top5累計損益/100株
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
                              {stat.count}
                            </td>
                            <td className="px-3 py-2 text-xs text-right text-slate-300">
                              {stat.win_rate !== null ? `${stat.win_rate.toFixed(1)}%` : "—"}
                            </td>
                            <td className={`px-3 py-2 text-xs text-right font-mono font-bold ${
                              stat.total_profit_per_100 >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                            }`}>
                              {stat.total_profit_per_100 >= 0 ? '+' : ''}{Math.round(stat.total_profit_per_100).toLocaleString()}円
                            </td>
                            <td className={`px-3 py-2 text-xs text-right font-mono font-bold ${
                              stat.top5_total_profit_per_100 >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                            }`}>
                              {stat.top5_total_profit_per_100 >= 0 ? '+' : ''}{Math.round(stat.top5_total_profit_per_100).toLocaleString()}円
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

        {/* Market Summary Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="mb-4"
        >
          <MarketSummary />
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
