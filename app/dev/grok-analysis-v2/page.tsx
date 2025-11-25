'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { ArrowLeft, Target } from 'lucide-react';

// 型定義
interface Metadata {
  totalStocks: number;
  uniqueStocks: number;
  dateRange: {
    start: string;
    end: string;
  };
  generatedAt: string;
  version: string;
}

interface ActionCount {
  buy: number;
  sell: number;
  hold: number;
}

interface ActionStats {
  action: string;
  actionJp: string;
  total: number;
  winCount: number;
  loseCount: number;
  winRate: number | null;
  totalProfit: number | null;
  avgProfit: number | null;
  avgReturn: number | null;
}

interface ComparisonStats {
  summary: {
    total: number;
    dateRange: {
      start: string;
      end: string;
    };
  };
  v2_0_3Actions: ActionCount;
  v2_1Actions: ActionCount;
  actionChanges: Record<string, number>;
  v2_0_3Stats: ActionStats[];
  v2_1Stats: ActionStats[];
}

interface StopLossTierStats {
  stopLossPct: number | null;
  total: number;
  buyTotal: number;
  buyWinCount: number;
  buyWinRate: number | null;
  buyTotalProfit: number | null;
  buyAvgProfit: number | null;
  buyAvgReturn: number | null;
  allWinCount: number;
  allWinRate: number | null;
}

interface ActionChangePattern {
  from: string;
  fromJp: string;
  to: string;
  toJp: string;
  total: number;
  winCount: number;
  winRate: number | null;
  avgReturn: number | null;
  stocks: Array<{
    ticker: string;
    companyName: string;
    grokRank: number;
    date: string;
    v2_0_3Score: number | null;
    v2_1Score: number | null;
    v2_0_3Reasons: string;
    v2_1Reasons: string | string[];
  }>;
}

interface PhaseStats {
  phase: string;
  winRate: number | null;
  avgReturn: number | null;
  medianReturn: number | null;
  winCount: number;
  loseCount: number;
}

interface RiskStats {
  winCount: number;
  loseCount: number;
  winRate: number | null;
  avgWinReturn: number | null;
  avgLossReturn: number | null;
  maxGain: number | null;
  maxLoss: number | null;
  avgMaxGain: number | null;
  avgMaxLoss: number | null;
  riskRewardRatio: number | null;
  sharpeRatio: number | null;
  avgReturn: number | null;
  stdDev: number | null;
}

interface DateStats {
  date: string;
  total: number;
  v2_0_3Actions: ActionCount;
  v2_1Actions: ActionCount;
  buyWinRate: number | null;
  buyAvgReturn: number | null;
}

interface AnalysisData {
  metadata: Metadata;
  comparisonStats: ComparisonStats;
  stopLossStats: StopLossTierStats[];
  actionChangeStats: ActionChangePattern[];
  phaseStats: PhaseStats[];
  riskStats: RiskStats;
  dateStats: DateStats[];
}

// カラーパレット
const COLORS = {
  buy: '#10b981',      // green-500
  sell: '#ef4444',     // red-500
  hold: '#f59e0b',     // amber-500
  primary: '#3b82f6',  // blue-500
  secondary: '#8b5cf6', // violet-500
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function GrokAnalysisV2Page() {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedActionChange, setSelectedActionChange] = useState<ActionChangePattern | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('https://stock.api.ymnk.jp/api/dev/grok-analysis-v2');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">データ読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-xl mb-4">エラーが発生しました</p>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  // v2.0.3 vs v2.1のアクション分布比較データ
  const actionDistributionData = [
    {
      name: 'v2.0.3',
      買い: data.comparisonStats.v2_0_3Actions.buy,
      売り: data.comparisonStats.v2_0_3Actions.sell,
      静観: data.comparisonStats.v2_0_3Actions.hold,
    },
    {
      name: 'v2.1',
      買い: data.comparisonStats.v2_1Actions.buy,
      売り: data.comparisonStats.v2_1Actions.sell,
      静観: data.comparisonStats.v2_1Actions.hold,
    },
  ];

  // アクション変更マトリックスデータ
  const actionChangeMatrixData = [
    { from: '買い', to: '買い', count: data.comparisonStats.actionChanges.buy_to_buy },
    { from: '買い', to: '売り', count: data.comparisonStats.actionChanges.buy_to_sell },
    { from: '買い', to: '静観', count: data.comparisonStats.actionChanges.buy_to_hold },
    { from: '売り', to: '買い', count: data.comparisonStats.actionChanges.sell_to_buy },
    { from: '売り', to: '売り', count: data.comparisonStats.actionChanges.sell_to_sell },
    { from: '売り', to: '静観', count: data.comparisonStats.actionChanges.sell_to_hold },
    { from: '静観', to: '買い', count: data.comparisonStats.actionChanges.hold_to_buy },
    { from: '静観', to: '売り', count: data.comparisonStats.actionChanges.hold_to_sell },
    { from: '静観', to: '静観', count: data.comparisonStats.actionChanges.hold_to_hold },
  ];

  // 損切り水準別統計データ
  const stopLossChartData = data.stopLossStats.map(tier => ({
    tier: `${tier.stopLossPct}%`,
    勝率: tier.buyWinRate,
    平均リターン: tier.buyAvgReturn,
    件数: tier.buyTotal,
  }));

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-blue-900 to-violet-900 py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/dev"
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">ダッシュボードに戻る</span>
            </Link>
            <Link
              href="/dev/recommendations"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-lg font-semibold text-sm hover:shadow-xl hover:shadow-green-500/50 hover:scale-105 transition-all"
            >
              <Target className="w-4 h-4" />
              <span>今日の売買推奨</span>
            </Link>
          </div>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold mb-2"
          >
            Grok銘柄分析 v2.0.3 vs v2.1 比較
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-gray-300"
          >
            {data.metadata.dateRange.start} ～ {data.metadata.dateRange.end}（全{data.metadata.totalStocks}件、
            {data.metadata.uniqueStocks}銘柄）
          </motion.p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* サマリーカード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-lg p-6 border border-gray-800"
          >
            <h3 className="text-sm font-medium text-gray-400 mb-2">総データ数</h3>
            <p className="text-3xl font-bold text-blue-400">{data.metadata.totalStocks}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-900 rounded-lg p-6 border border-gray-800"
          >
            <h3 className="text-sm font-medium text-gray-400 mb-2">ユニーク銘柄数</h3>
            <p className="text-3xl font-bold text-green-400">{data.metadata.uniqueStocks}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-900 rounded-lg p-6 border border-gray-800"
          >
            <h3 className="text-sm font-medium text-gray-400 mb-2">分析期間</h3>
            <p className="text-sm font-bold text-violet-400">
              {data.metadata.dateRange.start} ～ {data.metadata.dateRange.end}
            </p>
          </motion.div>
        </div>

        {/* v2.0.3 vs v2.1 アクション分布比較 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900 rounded-lg p-6 border border-gray-800"
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <span className="bg-blue-500 w-1 h-6 mr-3 rounded"></span>
            アクション分布比較（v2.0.3 vs v2.1）
          </h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={actionDistributionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                }}
              />
              <Legend />
              <Bar dataKey="買い" fill={COLORS.buy} />
              <Bar dataKey="売り" fill={COLORS.sell} />
              <Bar dataKey="静観" fill={COLORS.hold} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* v2.0.3 vs v2.1 統計テーブル */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* v2.0.3統計 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gray-900 rounded-lg p-6 border border-gray-800"
          >
            <h2 className="text-xl font-bold mb-4">v2.0.3 統計</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2 px-3">アクション</th>
                    <th className="text-right py-2 px-3">件数</th>
                    <th className="text-right py-2 px-3">勝率</th>
                    <th className="text-right py-2 px-3">平均利益</th>
                  </tr>
                </thead>
                <tbody>
                  {data.comparisonStats.v2_0_3Stats.map((stat) => (
                    <tr key={stat.action} className="border-b border-gray-800">
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            stat.action === 'buy'
                              ? 'bg-green-900/50 text-green-300'
                              : stat.action === 'sell'
                              ? 'bg-red-900/50 text-red-300'
                              : 'bg-amber-900/50 text-amber-300'
                          }`}
                        >
                          {stat.actionJp}
                        </span>
                      </td>
                      <td className="text-right py-2 px-3 text-gray-300">{stat.total}</td>
                      <td className="text-right py-2 px-3 text-gray-300">
                        {stat.winRate !== null ? `${stat.winRate.toFixed(1)}%` : '-'}
                      </td>
                      <td className="text-right py-2 px-3 text-gray-300">
                        {stat.avgProfit !== null ? `¥${stat.avgProfit.toFixed(0)}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* v2.1統計 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gray-900 rounded-lg p-6 border border-gray-800"
          >
            <h2 className="text-xl font-bold mb-4">v2.1 統計</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2 px-3">アクション</th>
                    <th className="text-right py-2 px-3">件数</th>
                    <th className="text-right py-2 px-3">勝率</th>
                    <th className="text-right py-2 px-3">平均利益</th>
                  </tr>
                </thead>
                <tbody>
                  {data.comparisonStats.v2_1Stats.map((stat) => (
                    <tr key={stat.action} className="border-b border-gray-800">
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            stat.action === 'buy'
                              ? 'bg-green-900/50 text-green-300'
                              : stat.action === 'sell'
                              ? 'bg-red-900/50 text-red-300'
                              : 'bg-amber-900/50 text-amber-300'
                          }`}
                        >
                          {stat.actionJp}
                        </span>
                      </td>
                      <td className="text-right py-2 px-3 text-gray-300">{stat.total}</td>
                      <td className="text-right py-2 px-3 text-gray-300">
                        {stat.winRate !== null ? `${stat.winRate.toFixed(1)}%` : '-'}
                      </td>
                      <td className="text-right py-2 px-3 text-gray-300">
                        {stat.avgProfit !== null ? `¥${stat.avgProfit.toFixed(0)}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>

        {/* 損切り水準別統計 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900 rounded-lg p-6 border border-gray-800"
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <span className="bg-violet-500 w-1 h-6 mr-3 rounded"></span>
            損切り水準別パフォーマンス（買いアクションのみ）
          </h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={stopLossChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="tier" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                }}
              />
              <Legend />
              <Bar dataKey="勝率" fill={COLORS.primary} />
              <Bar dataKey="件数" fill={COLORS.secondary} />
            </BarChart>
          </ResponsiveContainer>

          {/* 損切り水準別テーブル */}
          <div className="overflow-x-auto mt-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 px-3">損切り水準</th>
                  <th className="text-right py-2 px-3">買い件数</th>
                  <th className="text-right py-2 px-3">勝率</th>
                  <th className="text-right py-2 px-3">平均リターン</th>
                  <th className="text-right py-2 px-3">平均利益</th>
                </tr>
              </thead>
              <tbody>
                {data.stopLossStats.map((tier, idx) => (
                  <tr key={idx} className="border-b border-gray-800">
                    <td className="py-2 px-3">
                      <span className="font-medium text-violet-400">
                        {tier.stopLossPct !== null ? `${tier.stopLossPct}%` : 'なし'}
                      </span>
                    </td>
                    <td className="text-right py-2 px-3 text-gray-300">{tier.buyTotal}</td>
                    <td className="text-right py-2 px-3 text-gray-300">
                      {tier.buyWinRate !== null ? `${tier.buyWinRate.toFixed(1)}%` : '-'}
                    </td>
                    <td className="text-right py-2 px-3 text-gray-300">
                      {tier.buyAvgReturn !== null ? `${tier.buyAvgReturn.toFixed(2)}%` : '-'}
                    </td>
                    <td className="text-right py-2 px-3 text-gray-300">
                      {tier.buyAvgProfit !== null ? `¥${tier.buyAvgProfit.toFixed(0)}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* アクション変更分析 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900 rounded-lg p-6 border border-gray-800"
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <span className="bg-green-500 w-1 h-6 mr-3 rounded"></span>
            アクション変更分析（v2.0.3 → v2.1）
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 px-3">変更パターン</th>
                  <th className="text-right py-2 px-3">件数</th>
                  <th className="text-right py-2 px-3">勝率</th>
                  <th className="text-right py-2 px-3">平均リターン</th>
                  <th className="text-center py-2 px-3">詳細</th>
                </tr>
              </thead>
              <tbody>
                {data.actionChangeStats.map((pattern, idx) => (
                  <tr key={idx} className="border-b border-gray-800">
                    <td className="py-2 px-3">
                      <span className="text-gray-400">{pattern.fromJp}</span>
                      <span className="mx-2 text-gray-600">→</span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          pattern.to === 'buy'
                            ? 'bg-green-900/50 text-green-300'
                            : pattern.to === 'sell'
                            ? 'bg-red-900/50 text-red-300'
                            : 'bg-amber-900/50 text-amber-300'
                        }`}
                      >
                        {pattern.toJp}
                      </span>
                    </td>
                    <td className="text-right py-2 px-3 text-gray-300">{pattern.total}</td>
                    <td className="text-right py-2 px-3 text-gray-300">
                      {pattern.winRate !== null ? `${pattern.winRate.toFixed(1)}%` : '-'}
                    </td>
                    <td className="text-right py-2 px-3 text-gray-300">
                      {pattern.avgReturn !== null ? `${pattern.avgReturn.toFixed(2)}%` : '-'}
                    </td>
                    <td className="text-center py-2 px-3">
                      <button
                        onClick={() => setSelectedActionChange(pattern)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs transition"
                      >
                        詳細
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Phase別統計 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900 rounded-lg p-6 border border-gray-800"
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <span className="bg-amber-500 w-1 h-6 mr-3 rounded"></span>
            Phase別パフォーマンス
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 px-3">Phase</th>
                  <th className="text-right py-2 px-3">勝率</th>
                  <th className="text-right py-2 px-3">平均リターン</th>
                  <th className="text-right py-2 px-3">中央値</th>
                  <th className="text-right py-2 px-3">勝ち数</th>
                  <th className="text-right py-2 px-3">負け数</th>
                </tr>
              </thead>
              <tbody>
                {data.phaseStats.map((phase, idx) => (
                  <tr key={idx} className="border-b border-gray-800">
                    <td className="py-2 px-3 text-amber-400 font-medium">{phase.phase}</td>
                    <td className="text-right py-2 px-3 text-gray-300">
                      {phase.winRate !== null ? `${phase.winRate.toFixed(1)}%` : '-'}
                    </td>
                    <td className="text-right py-2 px-3 text-gray-300">
                      {phase.avgReturn !== null ? `${phase.avgReturn.toFixed(2)}%` : '-'}
                    </td>
                    <td className="text-right py-2 px-3 text-gray-300">
                      {phase.medianReturn !== null ? `${phase.medianReturn.toFixed(2)}%` : '-'}
                    </td>
                    <td className="text-right py-2 px-3 text-green-400">{phase.winCount}</td>
                    <td className="text-right py-2 px-3 text-red-400">{phase.loseCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* アクション変更詳細モーダル */}
      {selectedActionChange && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedActionChange(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4">
              {selectedActionChange.fromJp} → {selectedActionChange.toJp} 詳細
            </h2>
            <div className="mb-4 grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-400">件数</p>
                <p className="text-xl font-bold text-blue-400">{selectedActionChange.total}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">勝率</p>
                <p className="text-xl font-bold text-green-400">
                  {selectedActionChange.winRate !== null
                    ? `${selectedActionChange.winRate.toFixed(1)}%`
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">平均リターン</p>
                <p className="text-xl font-bold text-violet-400">
                  {selectedActionChange.avgReturn !== null
                    ? `${selectedActionChange.avgReturn.toFixed(2)}%`
                    : '-'}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2 px-3">銘柄</th>
                    <th className="text-center py-2 px-3">Rank</th>
                    <th className="text-center py-2 px-3">日付</th>
                    <th className="text-right py-2 px-3">v2.0.3スコア</th>
                    <th className="text-right py-2 px-3">v2.1スコア</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedActionChange.stocks.map((stock, idx) => (
                    <tr key={idx} className="border-b border-gray-800">
                      <td className="py-2 px-3">
                        <div>
                          <p className="font-medium text-gray-200">{stock.companyName}</p>
                          <p className="text-xs text-gray-500">{stock.ticker}</p>
                        </div>
                      </td>
                      <td className="text-center py-2 px-3 text-gray-300">{stock.grokRank}</td>
                      <td className="text-center py-2 px-3 text-gray-400 text-xs">
                        {stock.date}
                      </td>
                      <td className="text-right py-2 px-3 text-gray-300">
                        {stock.v2_0_3Score !== null ? stock.v2_0_3Score : '-'}
                      </td>
                      <td className="text-right py-2 px-3 text-gray-300">
                        {stock.v2_1Score !== null ? stock.v2_1Score : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={() => setSelectedActionChange(null)}
              className="mt-6 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition"
            >
              閉じる
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
