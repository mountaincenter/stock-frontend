"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Activity,
  Calendar,
  Database,
  AlertCircle,
  CheckCircle,
  Award,
  Target,
} from "lucide-react";

type Strategy = "phase1" | "phase2" | "phase3_1pct" | "phase3_2pct" | "phase3_3pct" | "phase4";

type SegmentData = {
  segment: string;
  count: number;
  strategies: {
    [key in Strategy]: {
      profit: number;
      return_pct: number;
      win_rate: number;
      avg_profit: number;
    };
  };
};

type MarketSegmentsResponse = {
  nikkei_direction: SegmentData[];
  topix_direction: SegmentData[];
  nikkei_volatility: SegmentData[];
  mothers_direction: SegmentData[];
};

type AnalysisSummary = {
  period: {
    start: string;
    end: string;
  };
  total_trades: number;
  market_data_availability: {
    daily_nikkei: number;
    daily_topix: number;
    morning_nikkei: number;
  };
};

type RobustStrategyStats = {
  count: number;
  win_rate: number;
  median_profit: number;
  mean_profit: number;
  trimmed_mean: number;
  expected_value: number;
  avg_win: number;
  avg_loss: number;
  lower_25_avg: number;
  max_loss: number;
  is_recommended: boolean;
};

type RobustStats = {
  [segment: string]: {
    [direction: string]: {
      [strategy in Strategy]: RobustStrategyStats;
    };
  };
};

type AsymmetricThreshold = {
  label: string;
  profit_pct: number;
  loss_pct: number;
  total_profit: number;
  cumulative_return_pct: number;
  win_rate: number;
  avg_profit: number;
  count: number;
  exit_profit: number;
  exit_loss: number;
  exit_close: number;
};

type GrokDailyAnalysis = {
  date: string;
  total_profit: number;
  win_rate: number;
  avg_return: number;
  count: number;
  worst3: Array<{
    ticker: string;
    company_name: string;
    profit_per_100_shares_phase2: number;
    return_pct: number;
    category: string;
    reason: string;
  }>;
  best3: Array<{
    ticker: string;
    company_name: string;
    profit_per_100_shares_phase2: number;
    return_pct: number;
    category: string;
    reason: string;
  }>;
  category_stats: Array<{
    category: string;
    total_profit: number;
    wins: number;
    count: number;
    win_rate: number;
  }>;
};

type GrokAnalysis = {
  daily_analysis: GrokDailyAnalysis[];
  overall_stats: {
    total_profit: number;
    total_count: number;
    avg_win_rate: number;
    days_analyzed: number;
  };
  category_analysis: Array<{
    category: string;
    total_profit: number;
    win_rate: number;
    count: number;
    days_count: number;
  }>;
  insights: {
    worst_patterns: Array<{
      pattern: string;
      impact: string;
      win_rate: string;
      description: string;
    }>;
    best_patterns: Array<{
      pattern: string;
      impact: string;
      win_rate: string;
      description: string;
    }>;
    recommendations: Array<{
      type: string;
      pattern: string;
      reason: string;
    }>;
  };
};

const STRATEGY_LABELS: { [key in Strategy]: string } = {
  phase1: "Phase1（前場）",
  phase2: "Phase2（大引）",
  phase3_1pct: "±1%",
  phase3_2pct: "±2%",
  phase3_3pct: "±3%",
  phase4: "Phase4（+2% -4% + TOPIX判断）",
};

const STRATEGY_COLORS: { [key in Strategy]: string } = {
  phase1: "#ef4444",
  phase2: "#10b981",
  phase3_1pct: "#3b82f6",
  phase3_2pct: "#8b5cf6",
  phase3_3pct: "#f59e0b",
  phase4: "#ec4899",
};

const SEGMENT_LABELS: { [key: string]: string } = {
  nikkei_direction: "📈 日経平均騰落",
  topix_direction: "📊 TOPIX騰落",
  nikkei_volatility: "🌊 日経変動幅",
  mothers_direction: "🚀 マザーズ騰落",
};

export default function DevAnalyzePage() {
  const [summary, setSummary] = useState<AnalysisSummary | null>(null);
  const [marketSegments, setMarketSegments] = useState<MarketSegmentsResponse | null>(null);
  const [robustStats, setRobustStats] = useState<RobustStats | null>(null);
  const [asymmetricThresholds, setAsymmetricThresholds] = useState<AsymmetricThreshold[] | null>(null);
  const [grokAnalysis, setGrokAnalysis] = useState<GrokAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<string>("nikkei_direction");

  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

    Promise.all([
      fetch(`${API_BASE}/api/dev/analyze/summary`).then((res) => res.json()),
      fetch(`${API_BASE}/api/dev/analyze/market_segments`).then((res) => res.json()),
      fetch(`${API_BASE}/api/dev/analyze/robust_stats`).then((res) => res.json()),
      fetch(`${API_BASE}/api/dev/analyze/asymmetric_thresholds`).then((res) => res.json()),
      fetch(`${API_BASE}/api/dev/analyze/grok-selection-analysis`).then((res) => res.json()),
    ])
      .then(([summaryData, segmentsData, robustData, asymmetricData, grokData]) => {
        setSummary(summaryData);
        setMarketSegments(segmentsData);
        setRobustStats(robustData);
        setAsymmetricThresholds(asymmetricData.results);
        setGrokAnalysis(grokData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#1a1f3a] to-[#0f1419] flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-16 h-16 text-[#667eea] animate-pulse mx-auto mb-4" />
          <p className="text-gray-400 text-lg">データ読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#1a1f3a] to-[#0f1419] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 text-lg">エラー: {error}</p>
        </div>
      </div>
    );
  }

  // 全体統計の計算
  const calculateOverallStats = () => {
    if (!marketSegments) return null;

    const allSegments = Object.values(marketSegments).flat();
    const strategies: Strategy[] = ["phase1", "phase2", "phase3_1pct", "phase3_2pct", "phase3_3pct"];

    return strategies.map((strategy) => {
      const totalProfit = allSegments.reduce((sum, seg) => sum + (seg.strategies[strategy]?.profit || 0), 0);
      const avgWinRate = allSegments.reduce((sum, seg) => sum + (seg.strategies[strategy]?.win_rate || 0), 0) / allSegments.length;
      const avgReturn = allSegments.reduce((sum, seg) => sum + (seg.strategies[strategy]?.return_pct || 0), 0) / allSegments.length;

      return {
        strategy: STRATEGY_LABELS[strategy],
        profit: totalProfit,
        winRate: avgWinRate,
        return: avgReturn,
      };
    });
  };

  const overallStats = calculateOverallStats();

  // ベスト戦略を見つける
  const findBestStrategy = (segments: SegmentData[]) => {
    const strategies: Strategy[] = ["phase1", "phase2", "phase3_1pct", "phase3_2pct", "phase3_3pct"];

    return segments.map((seg) => {
      const bestStrategy = strategies.reduce((best, current) => {
        const currentProfit = seg.strategies[current]?.profit || -Infinity;
        const bestProfit = seg.strategies[best]?.profit || -Infinity;
        return currentProfit > bestProfit ? current : best;
      });

      return {
        segment: seg.segment,
        count: seg.count,
        bestStrategy: STRATEGY_LABELS[bestStrategy],
        bestProfit: seg.strategies[bestStrategy]?.profit || 0,
        bestWinRate: seg.strategies[bestStrategy]?.win_rate || 0,
        allStrategies: seg.strategies,
      };
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#1a1f3a] to-[#0f1419] text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dev"
            className="inline-flex items-center text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            戻る
          </Link>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent mb-2">
            マーケット要因別パフォーマンス分析
          </h1>
          <p className="text-gray-400">
            市場環境に応じた最適戦略を発見 - データ駆動型トレーディング
          </p>
        </div>

        {/* タイトル下に期間・取引数 */}
        {summary && (
          <div className="text-center text-sm text-gray-400 mb-6 -mt-2">
            分析期間: {summary.period.start} 〜 {summary.period.end} | 総取引数: {summary.total_trades}銘柄
          </div>
        )}

        {/* 結論カード（Phase1〜Phase4比較） */}
        {summary && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500/50 rounded-lg p-6 mb-8"
          >
            <div className="text-center mb-4">
              <div className="text-sm text-gray-300 mb-2">✅ 結論: 最も稼げる戦略</div>
              <div className="text-4xl font-bold text-white mb-2">Phase2</div>
              <div className="text-sm text-gray-400">9:00寄付 → 15:30大引けまで何もせず保有</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="bg-black/30 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-400 mb-1">Phase1</div>
                <div className="text-lg font-mono text-gray-400">前場引け</div>
                <div className="text-xs text-gray-500 mt-1">11:30決済</div>
              </div>

              <div className="bg-black/30 rounded-lg p-3 text-center ring-2 ring-green-400">
                <div className="text-xs text-green-400 mb-1 font-bold">⭐ Phase2</div>
                <div className="text-2xl font-bold text-green-400">最善</div>
                <div className="text-xs text-gray-300 mt-1">15:30決済</div>
              </div>

              <div className="bg-black/30 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-400 mb-1">Phase3</div>
                <div className="text-lg font-mono text-gray-400">±閾値</div>
                <div className="text-xs text-gray-500 mt-1">利確・損切</div>
              </div>

              <div className="bg-black/30 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-400 mb-1">Phase4</div>
                <div className="text-lg font-mono text-gray-400">条件付</div>
                <div className="text-xs text-gray-500 mt-1">TOPIX判断</div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-500/20 rounded border border-blue-500/30 text-sm text-gray-200">
              <strong>📝 結論:</strong> 寄付で買って、<strong className="text-white">何もせず15:30大引けまで保有</strong>が最も稼げる。
              早めの利確・損切は利益を減らす傾向。
            </div>

            <div className="mt-3 p-3 bg-purple-500/10 rounded border border-purple-500/20 text-xs text-gray-300">
              <strong>🔮 次フェーズ構想:</strong> 基本Phase2、ただし条件によりPhase4切替
              （前場TOPIX/日経下落 or 前日終値騰落 → Phase4）→ 機械学習で最適Phase選択
            </div>
          </motion.div>
        )}

        {/* Grok銘柄選定分析セクション */}
        {grokAnalysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-2 border-red-500/30 rounded-xl p-6 mb-8"
          >
            <h2 className="text-2xl font-bold mb-4 flex items-center text-red-300">
              <AlertCircle className="w-6 h-6 mr-2" />
              🔍 Grok銘柄選定の問題点分析
            </h2>

            {/* 全体統計 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-black/30 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">分析期間</div>
                <div className="text-lg font-bold text-white">{grokAnalysis.overall_stats.days_analyzed}日間</div>
              </div>
              <div className="bg-black/30 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">総銘柄数</div>
                <div className="text-lg font-bold text-white">{grokAnalysis.overall_stats.total_count}銘柄</div>
              </div>
              <div className="bg-black/30 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">累積利益</div>
                <div className={`text-lg font-bold ${grokAnalysis.overall_stats.total_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {grokAnalysis.overall_stats.total_profit.toLocaleString()}円
                </div>
              </div>
              <div className="bg-black/30 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">平均勝率</div>
                <div className="text-lg font-bold text-white">{grokAnalysis.overall_stats.avg_win_rate.toFixed(1)}%</div>
              </div>
            </div>

            {/* 推奨事項 */}
            {grokAnalysis.insights.recommendations.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-red-300">⚠️ 改善推奨</h3>
                {grokAnalysis.insights.recommendations.map((rec, idx) => (
                  <div key={idx} className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-3">
                    <div className="flex items-start gap-3">
                      <div className="bg-red-500/20 px-2 py-1 rounded text-xs font-bold text-red-300">{rec.type}</div>
                      <div className="flex-1">
                        <div className="font-bold text-white mb-1">{rec.pattern}</div>
                        <div className="text-sm text-gray-300">{rec.reason}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ワーストパターン */}
            {grokAnalysis.insights.worst_patterns.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-red-300">❌ ワーストパターン（絶対避けるべき）</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {grokAnalysis.insights.worst_patterns.map((pattern, idx) => (
                    <div key={idx} className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
                      <div className="font-bold text-red-300 mb-2">{pattern.pattern || '（カテゴリなし）'}</div>
                      <div className="text-xl font-bold text-red-400 mb-1">{pattern.impact}</div>
                      <div className="text-sm text-gray-400">勝率: {pattern.win_rate}</div>
                      <div className="text-xs text-gray-500 mt-1">{pattern.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ベストパターン */}
            {grokAnalysis.insights.best_patterns.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-green-300">✅ ベストパターン（継続すべき）</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {grokAnalysis.insights.best_patterns.map((pattern, idx) => (
                    <div key={idx} className="bg-green-900/20 border border-green-500/50 rounded-lg p-4">
                      <div className="font-bold text-green-300 mb-2">{pattern.pattern || '（カテゴリなし）'}</div>
                      <div className="text-xl font-bold text-green-400 mb-1">{pattern.impact}</div>
                      <div className="text-sm text-gray-400">勝率: {pattern.win_rate}</div>
                      <div className="text-xs text-gray-500 mt-1">{pattern.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 日別詳細（全期間） */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-300">📅 日別詳細（全{grokAnalysis.daily_analysis.length}日）</h3>
              {grokAnalysis.daily_analysis.slice().reverse().map((day, idx) => (
                <div key={idx} className="bg-black/30 rounded-lg p-4 mb-3">
                  <div className="flex justify-between items-center mb-3">
                    <div className="text-white font-bold">{day.date}</div>
                    <div className={`text-lg font-bold ${day.total_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {day.total_profit >= 0 ? '+' : ''}{day.total_profit.toLocaleString()}円
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                    <div>銘柄数: {day.count}</div>
                    <div>勝率: {day.win_rate.toFixed(1)}%</div>
                    <div>平均: {day.avg_return >= 0 ? '+' : ''}{day.avg_return.toFixed(2)}%</div>
                  </div>

                  {/* ワースト3 */}
                  <div className="text-xs">
                    <div className="text-red-300 font-bold mb-1">▼ ワースト3:</div>
                    {day.worst3.map((stock, sidx) => (
                      <div key={sidx} className="text-gray-400 mb-1 pl-2">
                        • {stock.ticker} ({stock.company_name}): {stock.profit_per_100_shares_phase2.toLocaleString()}円 ({stock.return_pct >= 0 ? '+' : ''}{stock.return_pct.toFixed(2)}%)
                        {stock.category && <span className="text-gray-500 ml-2">[{stock.category}]</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 全体パフォーマンス比較 - 新規追加 */}
        {overallStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-[#1e2742] to-[#181d33] rounded-xl p-6 border border-gray-700/50 mb-8"
          >
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <Award className="w-6 h-6 mr-2 text-[#fbbf24]" />
              全体パフォーマンス比較
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 累積利益チャート */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-300">累積利益</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={overallStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="strategy" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e2742",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => `${value.toLocaleString('ja-JP', {minimumFractionDigits: 1, maximumFractionDigits: 1})}円`}
                    />
                    <Bar dataKey="profit" fill="#667eea" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* 勝率レーダーチャート */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-300">戦略別勝率</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={overallStats}>
                    <PolarGrid stroke="#374151" />
                    <PolarAngleAxis dataKey="strategy" stroke="#9ca3af" />
                    <PolarRadiusAxis stroke="#9ca3af" domain={[0, 100]} />
                    <Radar
                      name="勝率"
                      dataKey="winRate"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.6}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e2742",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => `${value.toFixed(1)}%`}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}

        {/* Key Findings - 改善版 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-r from-[#1e3a8a] to-[#3730a3] rounded-xl p-6 border-2 border-[#4c51bf] mb-8"
        >
          <h2 className="text-2xl font-bold mb-4 flex items-center text-[#fbbf24]">
            <Target className="w-6 h-6 mr-2" />
            🎯 主要な発見
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-lg p-4 border-l-4 border-[#10b981]">
              <h3 className="font-bold text-[#10b981] mb-2 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                市場上昇時
              </h3>
              <p className="text-sm text-gray-200">
                Phase2（大引け売り）が最適
                <br />
                <span className="text-xs text-gray-300">利益 180,000-200,000円、勝率 60-73%</span>
              </p>
            </div>

            <div className="bg-white/10 rounded-lg p-4 border-l-4 border-[#ef4444]">
              <h3 className="font-bold text-[#ef4444] mb-2 flex items-center">
                <TrendingDown className="w-5 h-5 mr-2" />
                市場下落時
              </h3>
              <p className="text-sm text-gray-200">
                Phase3 ±3%（損切り）で防御
                <br />
                <span className="text-xs text-gray-300">損失最小化、Phase2は危険</span>
              </p>
            </div>

            <div className="bg-white/10 rounded-lg p-4 border-l-4 border-[#3b82f6]">
              <h3 className="font-bold text-[#3b82f6] mb-2 flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                実践戦略
              </h3>
              <p className="text-sm text-gray-200">
                11:30で市場確認
                <br />
                <span className="text-xs text-gray-300">上昇→Phase2、下落→Phase3</span>
              </p>
            </div>
          </div>
        </motion.div>

        {/* 推奨戦略（再現性重視） - 新規追加 */}
        {robustStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-gradient-to-br from-[#1e2742] to-[#181d33] rounded-xl p-6 border border-gray-700/50 mb-8"
          >
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <CheckCircle className="w-6 h-6 mr-2 text-[#10b981]" />
              💰 推奨戦略（再現性重視）
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              守谷商会のような大当たりを除いた「通常時の稼ぎ」を重視。勝率60%以上、中央値プラス、リスク許容範囲内の戦略を推奨。
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Object.entries(robustStats).map(([segmentKey, directions]) =>
                Object.entries(directions).map(([direction, strategies]) => {
                  // 推奨戦略を抽出
                  const recommendedStrategies = Object.entries(strategies)
                    .filter(([_, stats]) => stats.is_recommended)
                    .sort((a, b) => b[1].expected_value - a[1].expected_value);

                  if (recommendedStrategies.length === 0) return null;

                  const bestStrategy = recommendedStrategies[0];
                  const stats = bestStrategy[1];

                  return (
                    <motion.div
                      key={`${segmentKey}-${direction}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-gradient-to-br from-[#10b981]/10 to-[#059669]/10 border border-[#10b981]/30 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-lg">
                            {SEGMENT_LABELS[segmentKey] || segmentKey}
                          </h3>
                          <p className="text-sm text-gray-400">{direction}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400">ベスト</div>
                          <div className="text-lg font-bold text-[#10b981]">
                            {STRATEGY_LABELS[bestStrategy[0] as Strategy]}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-[#0f1419]/50 rounded p-2">
                          <div className="text-xs text-gray-400">勝率</div>
                          <div className="text-lg font-bold text-[#10b981]">
                            {stats.win_rate.toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-500">
                            10回中{Math.round(stats.win_rate / 10)}回勝つ
                          </div>
                        </div>

                        <div className="bg-[#0f1419]/50 rounded p-2">
                          <div className="text-xs text-gray-400">中央値</div>
                          <div className="text-lg font-bold text-white">
                            {stats.median_profit.toLocaleString('ja-JP', {minimumFractionDigits: 1, maximumFractionDigits: 1})}円
                          </div>
                          <div className="text-xs text-gray-500">通常時の稼ぎ</div>
                        </div>

                        <div className="bg-[#0f1419]/50 rounded p-2">
                          <div className="text-xs text-gray-400">期待値</div>
                          <div className="text-lg font-bold text-[#3b82f6]">
                            {stats.expected_value.toLocaleString('ja-JP', {minimumFractionDigits: 1, maximumFractionDigits: 1})}円
                          </div>
                          <div className="text-xs text-gray-500">1回あたり</div>
                        </div>

                        <div className="bg-[#0f1419]/50 rounded p-2">
                          <div className="text-xs text-gray-400">下位25%</div>
                          <div
                            className={`text-lg font-bold ${
                              stats.lower_25_avg >= -3000
                                ? "text-[#10b981]"
                                : stats.lower_25_avg >= -5000
                                ? "text-[#f59e0b]"
                                : "text-[#ef4444]"
                            }`}
                          >
                            {stats.lower_25_avg.toLocaleString('ja-JP', {minimumFractionDigits: 1, maximumFractionDigits: 1})}円
                          </div>
                          <div className="text-xs text-gray-500">4回に1回の損失</div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-700/50 text-xs text-gray-400">
                        <div className="flex justify-between">
                          <span>平均勝ち: {stats.avg_win.toLocaleString('ja-JP', {minimumFractionDigits: 1, maximumFractionDigits: 1})}円</span>
                          <span>平均負け: {stats.avg_loss.toLocaleString('ja-JP', {minimumFractionDigits: 1, maximumFractionDigits: 1})}円</span>
                        </div>
                        <div className="mt-1">最大損失: {stats.max_loss.toLocaleString('ja-JP', {minimumFractionDigits: 1, maximumFractionDigits: 1})}円</div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            <div className="mt-6 p-4 bg-[#fbbf24]/10 border border-[#fbbf24]/30 rounded-lg">
              <h4 className="font-bold text-[#fbbf24] mb-2 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                判断基準
              </h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>✅ 勝率 &gt; 60%: 3回に2回勝つ再現性</li>
                <li>✅ 中央値 &gt; 0: 大当たり除外でもプラス</li>
                <li>✅ 下位25% &gt; -5,000円: リスク許容範囲内</li>
              </ul>
            </div>
          </motion.div>
        )}

        {/* セグメント選択タブ - 新規追加 */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {marketSegments && Object.keys(marketSegments).map((segmentKey) => (
            <button
              key={segmentKey}
              onClick={() => setSelectedSegment(segmentKey)}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all ${
                selectedSegment === segmentKey
                  ? "bg-[#667eea] text-white"
                  : "bg-[#1e2742] text-gray-400 hover:bg-[#2a3456]"
              }`}
            >
              {SEGMENT_LABELS[segmentKey] || segmentKey}
            </button>
          ))}
        </div>

        {/* 選択されたセグメントの詳細分析 */}
        {marketSegments && selectedSegment && (
          <motion.div
            key={selectedSegment}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-[#1e2742] to-[#181d33] rounded-xl p-6 border border-gray-700/50 mb-8"
          >
            <h2 className="text-2xl font-bold mb-6">
              {SEGMENT_LABELS[selectedSegment]} - 詳細分析
            </h2>

            {findBestStrategy(marketSegments[selectedSegment as keyof MarketSegmentsResponse]).map((seg) => (
              <div key={seg.segment} className="mb-8 last:mb-0">
                {/* セグメントヘッダー */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-700">
                  <div className="flex items-center">
                    {seg.segment.includes("上昇") || seg.segment.includes("大幅上昇") ? (
                      <TrendingUp className="w-6 h-6 mr-2 text-[#10b981]" />
                    ) : (
                      <TrendingDown className="w-6 h-6 mr-2 text-[#ef4444]" />
                    )}
                    <h3 className="text-xl font-bold">{seg.segment}</h3>
                    <span className="ml-3 text-sm text-gray-400">({seg.count}銘柄)</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">ベスト戦略</div>
                    <div className="text-lg font-bold text-[#fbbf24]">{seg.bestStrategy}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 利益チャート */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-400 mb-3">累積利益比較</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart
                        data={Object.entries(seg.allStrategies).map(([strategy, stats]) => ({
                          name: STRATEGY_LABELS[strategy as Strategy],
                          profit: stats.profit,
                          color: STRATEGY_COLORS[strategy as Strategy],
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="name" stroke="#9ca3af" angle={-15} textAnchor="end" height={80} />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1e2742",
                            border: "1px solid #374151",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => `${value.toLocaleString('ja-JP', {minimumFractionDigits: 1, maximumFractionDigits: 1})}円`}
                        />
                        <Bar dataKey="profit" radius={[8, 8, 0, 0]}>
                          {Object.entries(seg.allStrategies).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={STRATEGY_COLORS[entry[0] as Strategy]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* 勝率チャート */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-400 mb-3">勝率比較</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart
                        data={Object.entries(seg.allStrategies).map(([strategy, stats]) => ({
                          name: STRATEGY_LABELS[strategy as Strategy],
                          winRate: stats.win_rate,
                          color: STRATEGY_COLORS[strategy as Strategy],
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="name" stroke="#9ca3af" angle={-15} textAnchor="end" height={80} />
                        <YAxis stroke="#9ca3af" domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1e2742",
                            border: "1px solid #374151",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => `${value.toFixed(1)}%`}
                        />
                        <Bar dataKey="winRate" radius={[8, 8, 0, 0]}>
                          {Object.entries(seg.allStrategies).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={STRATEGY_COLORS[entry[0] as Strategy]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 詳細テーブル */}
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-3 text-gray-400">戦略</th>
                        <th className="text-right py-3 px-3 text-gray-400">累積利益</th>
                        <th className="text-right py-3 px-3 text-gray-400">累積利益率</th>
                        <th className="text-right py-3 px-3 text-gray-400">勝率</th>
                        <th className="text-right py-3 px-3 text-gray-400">平均利益</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(seg.allStrategies).map(([strategy, stats]) => {
                        const isBest = STRATEGY_LABELS[strategy as Strategy] === seg.bestStrategy;
                        return (
                          <tr
                            key={strategy}
                            className={`border-b border-gray-800 ${
                              isBest ? "bg-[#fbbf24]/10" : ""
                            }`}
                          >
                            <td className="py-3 px-3 flex items-center font-semibold">
                              {isBest && <Award className="w-4 h-4 mr-2 text-[#fbbf24]" />}
                              <span style={{ color: STRATEGY_COLORS[strategy as Strategy] }}>
                                {STRATEGY_LABELS[strategy as Strategy]}
                              </span>
                            </td>
                            <td className="text-right py-3 px-3 font-semibold">
                              {stats.profit.toLocaleString('ja-JP', {minimumFractionDigits: 1, maximumFractionDigits: 1})}円
                            </td>
                            <td
                              className={`text-right py-3 px-3 font-semibold ${
                                stats.return_pct >= 0 ? "text-[#10b981]" : "text-[#ef4444]"
                              }`}
                            >
                              {stats.return_pct >= 0 ? "+" : ""}
                              {stats.return_pct.toFixed(1)}%
                            </td>
                            <td className="text-right py-3 px-3">
                              {stats.win_rate.toFixed(1)}%
                            </td>
                            <td className="text-right py-3 px-3">
                              {stats.avg_profit.toLocaleString('ja-JP', {minimumFractionDigits: 1, maximumFractionDigits: 1})}円
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </motion.div>
        )}

      </div>
    </div>
  );
}
