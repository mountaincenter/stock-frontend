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
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  Award,
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import type { GrokAnalysisResponse } from "@/types/grok-analysis";
import {
  formatPercent,
  formatNumber,
  getWinRateColor,
  getReturnColor,
  evaluateRiskReward,
  evaluateSharpe,
  interpretCorrelation,
} from "@/types/grok-analysis";

export default function GrokAnalysisPage() {
  const [data, setData] = useState<GrokAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dev/grok-analysis")
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 relative overflow-hidden">
      {/* 背景装飾 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 px-4 py-8 max-w-7xl mx-auto">
        {/* ナビゲーション */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex gap-4"
        >
          <Link
            href="/dev"
            className="inline-flex items-center text-slate-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            ダッシュボードへ戻る
          </Link>
          <Link
            href="/dev/recommendations"
            className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors group"
          >
            <Target className="w-4 h-4 mr-2" />
            売買推奨レポート
            <ExternalLink className="w-3 h-3 ml-1 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </motion.div>

        {/* ヘッダー */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-slate-100 mb-2">
            📊 Grok推奨銘柄 詳細分析
          </h1>
          <p className="text-slate-400">
            バックテスト結果の多角的分析レポート
          </p>
          <div className="mt-4 flex gap-4 text-sm text-slate-300">
            <div>
              分析銘柄数: <span className="font-bold text-blue-400">{data.metadata.totalStocks}</span>
            </div>
            <div>
              期間: <span className="font-bold text-blue-400">{data.metadata.dateRange.start} ~ {data.metadata.dateRange.end}</span>
            </div>
            <div>
              ユニーク銘柄: <span className="font-bold text-blue-400">{data.metadata.uniqueStocks}</span>
            </div>
          </div>
        </motion.div>

        {/* Phase別勝率 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-slate-100 mb-4 flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-400" />
            Phase別勝率比較
          </h2>
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.phaseStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="phase" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #475569",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Legend />
                <Bar dataKey="winRate" fill="#3b82f6" name="勝率 (%)">
                  {data.phaseStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.winRate && entry.winRate >= 50 ? "#10b981" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {data.phaseStats.map((phase, idx) => (
                <div key={idx} className="bg-slate-800/50 rounded-lg p-4">
                  <div className="text-sm text-slate-400 mb-1">{phase.phase}</div>
                  <div className="text-2xl font-bold" style={{ color: getWinRateColor(phase.winRate || 0) }}>
                    {formatPercent(phase.winRate || 0)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {phase.winCount}勝 / {phase.loseCount}敗
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* リスクリワード分析 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-slate-100 mb-4 flex items-center gap-2">
            <Activity className="w-6 h-6 text-green-400" />
            リスクリワード分析
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
              <div className="text-slate-400 text-sm mb-2">勝率</div>
              <div className="text-3xl font-bold text-blue-400">
                {formatPercent(data.riskStats.winRate || 0)}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                {data.riskStats.winCount}勝 / {data.riskStats.loseCount}敗
              </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
              <div className="text-slate-400 text-sm mb-2">リスクリワード比</div>
              <div className="text-3xl font-bold text-green-400">
                {formatNumber(data.riskStats.riskRewardRatio || 0, 2)}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                {evaluateRiskReward(data.riskStats.riskRewardRatio || 0)}
              </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
              <div className="text-slate-400 text-sm mb-2">シャープレシオ</div>
              <div className="text-3xl font-bold text-purple-400">
                {formatNumber(data.riskStats.sharpeRatio || 0, 3)}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                {evaluateSharpe(data.riskStats.sharpeRatio || 0)}
              </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
              <div className="text-slate-400 text-sm mb-2">平均リターン</div>
              <div className="text-3xl font-bold" style={{ color: getReturnColor(data.riskStats.avgReturn || 0) }}>
                {formatPercent(data.riskStats.avgReturn || 0, 2)}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                標準偏差: {formatPercent(data.riskStats.stdDev || 0, 2)}
              </div>
            </div>
          </div>

          <div className="mt-4 bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-slate-100 mb-4">勝ち/負けトレード比較</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-900/20 rounded-lg p-4">
                <div className="text-green-300 font-bold mb-2">
                  <TrendingUp className="inline w-5 h-5 mr-2" />
                  平均勝ちリターン
                </div>
                <div className="text-3xl font-bold text-green-400">
                  {formatPercent(data.riskStats.avgWinReturn || 0, 2)}
                </div>
              </div>

              <div className="bg-red-900/20 rounded-lg p-4">
                <div className="text-red-300 font-bold mb-2">
                  <TrendingDown className="inline w-5 h-5 mr-2" />
                  平均負けリターン
                </div>
                <div className="text-3xl font-bold text-red-400">
                  {formatPercent(data.riskStats.avgLossReturn || 0, 2)}
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Grokランク別分析 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-slate-100 mb-4 flex items-center gap-2">
            <Award className="w-6 h-6 text-yellow-400" />
            Grokランク別分析
          </h2>
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.rankStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="rank" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #475569",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="winRate" fill="#eab308" name="勝率 (%)" />
                <Bar dataKey="avgReturn" fill="#06b6d4" name="平均リターン (%)" />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left p-2 text-slate-400">ランク</th>
                    <th className="text-right p-2 text-slate-400">データ数</th>
                    <th className="text-right p-2 text-slate-400">勝率</th>
                    <th className="text-right p-2 text-slate-400">平均リターン</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rankStats.map((rank) => (
                    <tr key={rank.rank} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="p-2 text-slate-300 font-bold">Rank {rank.rank}</td>
                      <td className="p-2 text-right text-slate-300">{rank.total}</td>
                      <td className="p-2 text-right font-bold" style={{ color: getWinRateColor(rank.winRate || 0) }}>
                        {formatPercent(rank.winRate || 0)}
                      </td>
                      <td className="p-2 text-right font-bold" style={{ color: getReturnColor(rank.avgReturn || 0) }}>
                        {formatPercent(rank.avgReturn || 0, 2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.section>

        {/* ボラティリティ分析 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-slate-100 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-orange-400" />
            ボラティリティ分析
          </h2>
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {data.volatilityStats.groups.map((group) => (
                <div key={group.group} className="bg-slate-800/50 rounded-lg p-4">
                  <div className="text-slate-400 text-sm mb-2">{group.group}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-slate-500">勝率</div>
                      <div className="font-bold" style={{ color: getWinRateColor(group.winRate || 0) }}>
                        {formatPercent(group.winRate || 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">平均リターン</div>
                      <div className="font-bold" style={{ color: getReturnColor(group.avgReturn || 0) }}>
                        {formatPercent(group.avgReturn || 0, 2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">平均ボラ</div>
                      <div className="font-bold text-orange-400">
                        {formatPercent(group.avgVolatility || 0, 2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">データ数</div>
                      <div className="font-bold text-slate-300">{group.total}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-900/20 rounded-lg p-4">
              <h3 className="text-lg font-bold text-blue-300 mb-2">相関係数</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-slate-400">ボラティリティ vs リターン</div>
                  <div className="text-xl font-bold text-blue-400">
                    {formatNumber(data.volatilityStats.corrVolatilityReturn || 0, 3)}
                  </div>
                  <div className="text-xs text-slate-500">
                    {interpretCorrelation(data.volatilityStats.corrVolatilityReturn || 0)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">ボラティリティ vs 勝率</div>
                  <div className="text-xl font-bold text-blue-400">
                    {formatNumber(data.volatilityStats.corrVolatilityWin || 0, 3)}
                  </div>
                  <div className="text-xs text-slate-500">
                    {interpretCorrelation(data.volatilityStats.corrVolatilityWin || 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* カテゴリー別分析 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-slate-100 mb-4">カテゴリー別分析</h2>
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left p-2 text-slate-400">カテゴリー</th>
                  <th className="text-right p-2 text-slate-400">データ数</th>
                  <th className="text-right p-2 text-slate-400">勝率</th>
                  <th className="text-right p-2 text-slate-400">平均リターン</th>
                  <th className="text-right p-2 text-slate-400">標準偏差</th>
                </tr>
              </thead>
              <tbody>
                {data.categoryStats.slice(0, 10).map((cat) => (
                  <tr key={cat.category} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="p-2 text-slate-300">{cat.category}</td>
                    <td className="p-2 text-right text-slate-300">{cat.total}</td>
                    <td className="p-2 text-right font-bold" style={{ color: getWinRateColor(cat.winRate || 0) }}>
                      {formatPercent(cat.winRate || 0)}
                    </td>
                    <td className="p-2 text-right font-bold" style={{ color: getReturnColor(cat.avgReturn || 0) }}>
                      {formatPercent(cat.avgReturn || 0, 2)}
                    </td>
                    <td className="p-2 text-right text-slate-400">
                      {cat.stdDev ? formatPercent(cat.stdDev, 2) : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* 日別推移 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-slate-100 mb-4">日別平均リターン推移</h2>
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.dailyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #475569",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="phase1AvgReturn" stroke="#3b82f6" name="Phase1" />
                <Line type="monotone" dataKey="phase2AvgReturn" stroke="#10b981" name="Phase2" />
                <Line type="monotone" dataKey="phase3AvgReturn" stroke="#f59e0b" name="Phase3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        {/* 前日動向別分析 */}
        {data.prevDayStats && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold text-slate-100 mb-4">前日動向別分析</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.prevDayStats.map((stat) => (
                <div key={stat.direction} className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
                  <div className="text-xl font-bold text-slate-100 mb-4">
                    前日{stat.direction}銘柄 ({stat.count}銘柄)
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-slate-400 mb-1">Phase1 勝率</div>
                      <div className="text-2xl font-bold" style={{ color: getWinRateColor(stat.phase1WinRate || 0) }}>
                        {formatPercent(stat.phase1WinRate || 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400 mb-1">Phase2 勝率</div>
                      <div className="text-2xl font-bold" style={{ color: getWinRateColor(stat.phase2WinRate || 0) }}>
                        {formatPercent(stat.phase2WinRate || 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400 mb-1">Phase1 平均</div>
                      <div className="text-xl font-bold" style={{ color: getReturnColor(stat.phase1AvgReturn || 0) }}>
                        {formatPercent(stat.phase1AvgReturn || 0, 2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400 mb-1">Phase2 平均</div>
                      <div className="text-xl font-bold" style={{ color: getReturnColor(stat.phase2AvgReturn || 0) }}>
                        {formatPercent(stat.phase2AvgReturn || 0, 2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* 売買判断の振り返り */}
        {data.recommendationStats && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold text-slate-100 mb-4 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-green-400" />
              売買判断の振り返り
            </h2>
            <div className="mb-4 p-3 bg-blue-900/20 backdrop-blur-xl border border-blue-700/30 rounded-xl text-sm text-slate-300">
              <span className="font-semibold text-blue-300">ℹ️ 注:</span> 売り推奨の「勝率」と「平均リターン」は反転表示しています。下落=勝ち、上昇=負けとしてカウントされます。
            </div>

            {/* 最新日の結果 */}
            {data.recommendationStats.latestStats && (
              <div className="bg-gradient-to-br from-green-900/20 via-blue-900/20 to-purple-900/20 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-100">
                    📅 {data.recommendationStats.latestStats.date} の判断結果
                  </h3>
                  <span className="text-sm text-slate-400">
                    {data.recommendationStats.latestStats.total}銘柄
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {data.recommendationStats.latestStats.actions.map((action) => (
                    <div
                      key={action.action}
                      className={`p-4 rounded-xl border ${
                        action.action === 'buy'
                          ? 'bg-green-500/10 border-green-500/30'
                          : action.action === 'sell'
                          ? 'bg-red-500/10 border-red-500/30'
                          : 'bg-yellow-500/10 border-yellow-500/30'
                      }`}
                    >
                      <div className="text-sm font-semibold text-slate-300 mb-3">
                        {action.action === 'buy' ? '🟢 BUY（買い推奨）' : action.action === 'sell' ? '🔴 SELL（売り推奨）' : '🟡 HOLD（静観推奨）'}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-slate-400 mb-1">銘柄数</div>
                          <div className="text-xl font-bold text-slate-200">{action.total}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-1">勝ち</div>
                          <div className="text-xl font-bold text-green-400">{action.winCount}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-1">勝率</div>
                          <div className="text-xl font-bold" style={{ color: getWinRateColor(action.winRate || 0) }}>
                            {formatPercent(action.winRate || 0)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-1">平均</div>
                          <div className="text-xl font-bold" style={{ color: getReturnColor(action.avgReturn || 0) }}>
                            {formatPercent(action.avgReturn || 0, 2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 判断精度の評価 */}
                <div className="mt-6 p-4 bg-slate-800/30 rounded-xl">
                  <div className="text-sm font-semibold text-slate-300 mb-2">💡 判断精度の評価</div>
                  <div className="text-xs text-slate-400 space-y-1">
                    {data.recommendationStats.latestStats.actions.map((action) => {
                      let evaluation = '';
                      if (action.action === 'buy') {
                        evaluation = action.winRate >= 60 ? '✅ 買い推奨は的中' : action.winRate >= 40 ? '⚠️ 買い推奨は微妙' : '❌ 買い推奨は外れ';
                      } else if (action.action === 'sell') {
                        evaluation = action.winRate >= 80 ? '✅ 売り推奨は的中（下落を回避）' : action.winRate >= 60 ? '⚠️ 売り推奨は微妙' : '❌ 売り推奨は外れ';
                      } else {
                        evaluation = action.winRate >= 50 ? '✅ 静観推奨は妥当' : '⚠️ 静観推奨は微妙';
                      }
                      return <div key={action.action}>{evaluation}</div>;
                    })}
                  </div>
                </div>

                {/* 銘柄別の結果 */}
                <div className="mt-6">
                  <h4 className="text-base font-bold text-slate-100 mb-3">📋 銘柄別の詳細結果</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-2 px-3 text-slate-300">銘柄</th>
                          <th className="text-center py-2 px-3 text-slate-300">判断</th>
                          <th className="text-right py-2 px-3 text-slate-300">Rank</th>
                          <th className="text-right py-2 px-3 text-slate-300">リターン</th>
                          <th className="text-right py-2 px-3 text-slate-300">100株損益</th>
                          <th className="text-center py-2 px-3 text-slate-300">結果</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recommendationStats.latestStats.stocks
                          .sort((a, b) => {
                            // 判断順: buy → hold → sell
                            const actionOrder = { buy: 0, hold: 1, sell: 2 };
                            const orderDiff = actionOrder[a.action] - actionOrder[b.action];
                            if (orderDiff !== 0) return orderDiff;
                            // 同じ判断内ではリターン降順
                            return (b.returnPct || 0) - (a.returnPct || 0);
                          })
                          .map((stock, idx) => (
                            <tr key={stock.ticker} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                              <td className="py-2 px-3">
                                <div className="font-semibold text-slate-200">{stock.companyName}</div>
                                <div className="text-xs text-slate-400">{stock.ticker}</div>
                              </td>
                              <td className="text-center py-2 px-3">
                                <span
                                  className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                                    stock.action === 'buy'
                                      ? 'bg-green-500/20 text-green-300'
                                      : stock.action === 'sell'
                                      ? 'bg-red-500/20 text-red-300'
                                      : 'bg-yellow-500/20 text-yellow-300'
                                  }`}
                                >
                                  {stock.action === 'buy' ? 'BUY' : stock.action === 'sell' ? 'SELL' : 'HOLD'}
                                </span>
                              </td>
                              <td className="text-right py-2 px-3 text-slate-300">{stock.grokRank}</td>
                              <td className="text-right py-2 px-3 font-bold" style={{ color: getReturnColor(stock.returnPct || 0) }}>
                                {formatPercent(stock.returnPct || 0, 2)}
                              </td>
                              <td className="text-right py-2 px-3 font-bold font-mono" style={{ color: getReturnColor(stock.profitPer100 || 0) }}>
                                {(stock.profitPer100 || 0) >= 0 ? '+' : ''}{Math.round(stock.profitPer100 || 0).toLocaleString()}円
                              </td>
                              <td className="text-center py-2 px-3">
                                {stock.isWin ? (
                                  <span className="text-green-400 font-bold">✅ 勝ち</span>
                                ) : (
                                  <span className="text-red-400 font-bold">❌ 負け</span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 全期間の統計 */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-slate-100 mb-4">
                📈 全期間の判断統計（{data.recommendationStats.summary.total}銘柄）
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-slate-300">判断</th>
                      <th className="text-right py-3 px-4 text-slate-300">銘柄数</th>
                      <th className="text-right py-3 px-4 text-slate-300">勝ち</th>
                      <th className="text-right py-3 px-4 text-slate-300">負け</th>
                      <th className="text-right py-3 px-4 text-slate-300">勝率</th>
                      <th className="text-right py-3 px-4 text-slate-300">平均</th>
                      <th className="text-right py-3 px-4 text-slate-300">中央値</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recommendationStats.actionStats.map((action) => (
                      <tr key={action.action} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-semibold">
                          {action.action === 'buy' ? '🟢 BUY' : action.action === 'sell' ? '🔴 SELL' : '🟡 HOLD'}
                        </td>
                        <td className="text-right py-3 px-4 text-slate-200">{action.total}</td>
                        <td className="text-right py-3 px-4 text-green-400 font-semibold">{action.winCount}</td>
                        <td className="text-right py-3 px-4 text-red-400 font-semibold">{action.loseCount}</td>
                        <td className="text-right py-3 px-4 font-bold" style={{ color: getWinRateColor(action.winRate || 0) }}>
                          {formatPercent(action.winRate || 0)}
                        </td>
                        <td className="text-right py-3 px-4 font-bold" style={{ color: getReturnColor(action.avgReturn || 0) }}>
                          {formatPercent(action.avgReturn || 0, 2)}
                        </td>
                        <td className="text-right py-3 px-4" style={{ color: getReturnColor(action.medianReturn || 0) }}>
                          {formatPercent(action.medianReturn || 0, 2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
}
