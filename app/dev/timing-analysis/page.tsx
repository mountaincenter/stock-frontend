"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  ArrowLeft,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react";

interface TimingData {
  summary: {
    total: number;
    profitTiming: {
      morningBetter: number;
      dayBetter: number;
      morningBetterPct: number;
    };
    lossTiming: {
      morningBetter: number;
      dayBetter: number;
      morningBetterPct: number;
    };
    avgProfitMorning: number;
    avgProfitDay: number;
    avgProfitMorningPct: number;
    avgProfitDayPct: number;
  };
  byRecommendation: Array<{
    action: string;
    total: number;
    morningBetter: number;
    dayBetter: number;
    morningBetterPct: number;
    avgProfitMorning: number;
    avgProfitDay: number;
  }>;
  byVolatility: Array<{
    group: string;
    total: number;
    morningBetter: number;
    morningBetterPct: number;
    avgVolatility: number;
  }>;
  byScore: Array<{
    group: string;
    total: number;
    morningBetter: number;
    morningBetterPct: number;
    avgScore: number;
  }>;
  daily: Array<{
    date: string;
    total: number;
    morningBetter: number;
    morningBetterPct: number;
    avgProfitMorning: number;
    avgProfitDay: number;
  }>;
  metadata: {
    totalRecords: number;
    recordsWithTiming: number;
    dateRange: {
      start: string;
      end: string;
    };
  };
}

export default function TimingAnalysisPage() {
  const [data, setData] = useState<TimingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/timing-analysis")
      .then((res) => {
        if (!res.ok) throw new Error("データ取得に失敗しました");
        return res.json();
      })
      .then((responseData) => {
        setData(responseData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-slate-200 text-xl"
        >
          読み込み中...
        </motion.div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-900/20 backdrop-blur-xl border border-red-700/50 rounded-2xl p-8"
        >
          <p className="text-red-200">{error || "データがありません"}</p>
        </motion.div>
      </div>
    );
  }

  const pieData = [
    { name: "前場有利", value: data.summary.profitTiming.morningBetter, fill: "#10b981" },
    { name: "大引有利", value: data.summary.profitTiming.dayBetter, fill: "#f59e0b" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dev"
              className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>戻る</span>
            </Link>
            <h1 className="text-2xl font-bold text-slate-100">
              <Clock className="w-6 h-6 inline mr-2" />
              売買タイミング最適化分析
            </h1>
          </div>
          <p className="text-slate-400 mt-2 text-sm">
            前場終値(11:30) vs 大引値(15:30) の比較分析
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <div className="text-slate-400 text-sm mb-2">分析銘柄数</div>
            <div className="text-3xl font-bold text-slate-100">
              {data.metadata.recordsWithTiming}
            </div>
            <div className="text-slate-500 text-xs mt-1">
              {data.metadata.dateRange.start} ~ {data.metadata.dateRange.end}
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <div className="text-slate-400 text-sm mb-2">前場有利ケース</div>
            <div className="text-3xl font-bold text-emerald-400">
              {data.summary.profitTiming.morningBetterPct?.toFixed(1)}%
            </div>
            <div className="text-slate-500 text-xs mt-1">
              {data.summary.profitTiming.morningBetter}件 / {data.summary.total}件
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <div className="text-slate-400 text-sm mb-2">平均利益差</div>
            <div className="text-3xl font-bold text-amber-400">
              {(data.summary.avgProfitMorning - data.summary.avgProfitDay).toFixed(0)}円
            </div>
            <div className="text-slate-500 text-xs mt-1">
              前場: {data.summary.avgProfitMorning?.toFixed(0)}円 / 大引: {data.summary.avgProfitDay?.toFixed(0)}円
            </div>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
          <h2 className="text-xl font-bold text-slate-100 mb-4">
            利益タイミング分布
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(1)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* By Recommendation */}
        {data.byRecommendation && data.byRecommendation.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <h2 className="text-xl font-bold text-slate-100 mb-4">
              売買推奨別タイミング
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.byRecommendation}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="action" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #475569",
                  }}
                />
                <Legend />
                <Bar dataKey="morningBetterPct" name="前場有利率(%)" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Daily Trend */}
        {data.daily && data.daily.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <h2 className="text-xl font-bold text-slate-100 mb-4">
              日別タイミング推移
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #475569",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="morningBetterPct"
                  name="前場有利率(%)"
                  stroke="#10b981"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Volatility & Score */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.byVolatility && data.byVolatility.length > 0 && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
              <h2 className="text-xl font-bold text-slate-100 mb-4">
                ボラティリティ別
              </h2>
              <div className="space-y-2">
                {data.byVolatility.map((item) => (
                  <div key={item.group} className="flex justify-between items-center p-3 bg-slate-900/50 rounded">
                    <span className="text-slate-300">{item.group}ボラ</span>
                    <span className="text-emerald-400 font-bold">
                      {item.morningBetterPct?.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.byScore && data.byScore.length > 0 && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
              <h2 className="text-xl font-bold text-slate-100 mb-4">
                スコア別
              </h2>
              <div className="space-y-2">
                {data.byScore.map((item) => (
                  <div key={item.group} className="flex justify-between items-center p-3 bg-slate-900/50 rounded">
                    <span className="text-slate-300">{item.group}</span>
                    <span className="text-emerald-400 font-bold">
                      {item.morningBetterPct?.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
