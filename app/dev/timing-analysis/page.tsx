"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  BarChart3,
} from "lucide-react";

interface TimingStock {
  ticker: string;
  stockName: string;
  backtestDate: string;
  recommendationAction: string;
  grokRank: number | null;
  buyPrice: number | null;
  morningClosePrice: number | null;
  dayClosePrice: number | null;
  profitMorning: number | null;
  profitDayClose: number | null;
  profitMorningPct: number | null;
  profitDayClosePct: number | null;
  betterProfitTiming: string;
  betterLossTiming: string;
  isWinMorning: boolean | null;
  isWinDayClose: boolean | null;
  highPrice: number | null;
  lowPrice: number | null;
}

interface FactorAnalysis {
  group: string;
  total: number;
  morningBetter: number;
  morningBetterPct: number;
  avgProfitMorning: number;
  avgProfitDay: number;
  winRateMorning?: number;
  winRateDay?: number;
  avgVolatility?: number;
  avgScore?: number;
  avgPrice?: number;
  avgVolume?: number;
}

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
  winRates: {
    morning: number;
    dayClose: number;
  };
  byRecommendation: FactorAnalysis[];
  byVolatility: FactorAnalysis[];
  byScore: FactorAnalysis[];
  byMarketCap: FactorAnalysis[];
  byPriceLevel: FactorAnalysis[];
  byVolume: FactorAnalysis[];
  stocks: TimingStock[];
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-amber-950 to-slate-950 flex items-center justify-center">
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-amber-950 to-slate-950 flex items-center justify-center">
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

  const profitDiff = (data.summary.avgProfitMorning || 0) - (data.summary.avgProfitDay || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-amber-950 to-slate-950 relative overflow-hidden">
      {/* 背景装飾 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
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
            href="/dev/grok-analysis"
            className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors group"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Grok分析レポート
          </Link>
          <Link
            href="/dev/recommendations"
            className="inline-flex items-center text-green-400 hover:text-green-300 transition-colors group"
          >
            <Target className="w-4 h-4 mr-2" />
            売買推奨レポート
          </Link>
        </motion.div>

        {/* ヘッダー */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-slate-100 mb-2 flex items-center gap-3">
            <Clock className="w-10 h-10 text-amber-400" />
            売買タイミング最適化分析
          </h1>
          <p className="text-slate-400 text-lg">
            前場終値(11:30) vs 大引値(15:30) の比較分析（2025-11-14以降）
          </p>
          <div className="mt-4 text-sm text-slate-300">
            分析期間: <span className="font-bold text-amber-400">{data.metadata.dateRange.start} ~ {data.metadata.dateRange.end}</span>
          </div>
        </motion.div>

        {/* サマリーカード (2段 x 5列 = 10枚) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8"
        >
          {/* 1段目 */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
            <div className="text-slate-400 text-sm mb-2">分析銘柄数</div>
            <div className="text-3xl font-bold text-blue-400">
              {data.metadata.recordsWithTiming}
            </div>
            <div className="text-slate-500 text-xs mt-1">件</div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
            <div className="text-slate-400 text-sm mb-2">前場有利率</div>
            <div className="text-3xl font-bold text-amber-400">
              {data.summary.profitTiming.morningBetterPct?.toFixed(1)}%
            </div>
            <div className="text-slate-500 text-xs mt-1">
              {data.summary.profitTiming.morningBetter}件
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
            <div className="text-slate-400 text-sm mb-2">大引有利率</div>
            <div className="text-3xl font-bold text-cyan-400">
              {(100 - (data.summary.profitTiming.morningBetterPct || 0)).toFixed(1)}%
            </div>
            <div className="text-slate-500 text-xs mt-1">
              {data.summary.profitTiming.dayBetter}件
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
            <div className="text-slate-400 text-sm mb-2">勝率（前場不成）</div>
            <div className="text-3xl font-bold text-green-400">
              {data.winRates.morning?.toFixed(1)}%
            </div>
            <div className="text-slate-500 text-xs mt-1">勝ち判定</div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
            <div className="text-slate-400 text-sm mb-2">勝率（大引不成）</div>
            <div className="text-3xl font-bold text-cyan-400">
              {data.winRates.dayClose?.toFixed(1)}%
            </div>
            <div className="text-slate-500 text-xs mt-1">勝ち判定</div>
          </div>

          {/* 2段目 */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
            <div className="text-slate-400 text-sm mb-2">平均利益差</div>
            <div className={`text-3xl font-bold ${profitDiff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {profitDiff >= 0 ? '+' : ''}{profitDiff.toFixed(0)}円
            </div>
            <div className="text-slate-500 text-xs mt-1">前場 - 大引</div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
            <div className="text-slate-400 text-sm mb-2">平均利益（前場）</div>
            <div className={`text-3xl font-bold ${(data.summary.avgProfitMorning || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {(data.summary.avgProfitMorning || 0) >= 0 ? '+' : ''}{(data.summary.avgProfitMorning || 0).toFixed(0)}円
            </div>
            <div className="text-slate-500 text-xs mt-1">
              {(data.summary.avgProfitMorningPct || 0).toFixed(2)}%
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
            <div className="text-slate-400 text-sm mb-2">平均利益（大引）</div>
            <div className={`text-3xl font-bold ${(data.summary.avgProfitDay || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {(data.summary.avgProfitDay || 0) >= 0 ? '+' : ''}{(data.summary.avgProfitDay || 0).toFixed(0)}円
            </div>
            <div className="text-slate-500 text-xs mt-1">
              {(data.summary.avgProfitDayPct || 0).toFixed(2)}%
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
            <div className="text-slate-400 text-sm mb-2">損切り（前場有利）</div>
            <div className="text-3xl font-bold text-amber-400">
              {data.summary.lossTiming.morningBetterPct?.toFixed(1)}%
            </div>
            <div className="text-slate-500 text-xs mt-1">
              {data.summary.lossTiming.morningBetter}件
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
            <div className="text-slate-400 text-sm mb-2">損切り（大引有利）</div>
            <div className="text-3xl font-bold text-cyan-400">
              {(100 - (data.summary.lossTiming.morningBetterPct || 0)).toFixed(1)}%
            </div>
            <div className="text-slate-500 text-xs mt-1">
              {data.summary.lossTiming.dayBetter}件
            </div>
          </div>
        </motion.div>

        {/* 要因別分析セクション */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8 mb-8"
        >
          <h2 className="text-3xl font-bold text-slate-100 mb-6 flex items-center gap-3">
            <Activity className="w-8 h-8 text-amber-400" />
            要因別タイミング分析
          </h2>

          {/* ボラティリティ別 */}
          {data.byVolatility && data.byVolatility.length > 0 && (
            <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-slate-100 mb-4">📈 ボラティリティ別</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.byVolatility.map((item) => (
                  <div key={item.group} className="bg-slate-800/50 rounded-xl p-4">
                    <div className="text-lg font-bold text-slate-200 mb-2">{item.group}ボラティリティ</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">前場有利率:</span>
                        <span className="text-amber-400 font-bold">{item.morningBetterPct.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">大引有利率:</span>
                        <span className="text-cyan-400 font-bold">{(100 - item.morningBetterPct).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">件数:</span>
                        <span className="text-slate-300">{item.total}件</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 時価総額別 */}
          {data.byMarketCap && data.byMarketCap.length > 0 && (
            <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-slate-100 mb-4">💼 時価総額別</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.byMarketCap.map((item) => (
                  <div key={item.group} className="bg-slate-800/50 rounded-xl p-4">
                    <div className="text-lg font-bold text-slate-200 mb-2">{item.group}</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">前場有利率:</span>
                        <span className="text-amber-400 font-bold">{item.morningBetterPct.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">大引有利率:</span>
                        <span className="text-cyan-400 font-bold">{(100 - item.morningBetterPct).toFixed(1)}%</span>
                      </div>
                      {item.winRateMorning && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">前場勝率:</span>
                          <span className="text-green-400 font-bold">{item.winRateMorning.toFixed(1)}%</span>
                        </div>
                      )}
                      {item.winRateDay && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">大引勝率:</span>
                          <span className="text-green-400 font-bold">{item.winRateDay.toFixed(1)}%</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-400">件数:</span>
                        <span className="text-slate-300">{item.total}件</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 株価水準別 */}
          {data.byPriceLevel && data.byPriceLevel.length > 0 && (
            <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-slate-100 mb-4">💰 株価水準別</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.byPriceLevel.map((item) => (
                  <div key={item.group} className="bg-slate-800/50 rounded-xl p-4">
                    <div className="text-lg font-bold text-slate-200 mb-2">{item.group}</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">前場有利率:</span>
                        <span className="text-amber-400 font-bold">{item.morningBetterPct.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">大引有利率:</span>
                        <span className="text-cyan-400 font-bold">{(100 - item.morningBetterPct).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">平均株価:</span>
                        <span className="text-slate-300">{item.avgPrice?.toFixed(0)}円</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">件数:</span>
                        <span className="text-slate-300">{item.total}件</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 出来高別 */}
          {data.byVolume && data.byVolume.length > 0 && (
            <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-slate-100 mb-4">📊 出来高別</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.byVolume.map((item) => (
                  <div key={item.group} className="bg-slate-800/50 rounded-xl p-4">
                    <div className="text-lg font-bold text-slate-200 mb-2">{item.group}</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">前場有利率:</span>
                        <span className="text-amber-400 font-bold">{item.morningBetterPct.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">大引有利率:</span>
                        <span className="text-cyan-400 font-bold">{(100 - item.morningBetterPct).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">件数:</span>
                        <span className="text-slate-300">{item.total}件</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 売買推奨別 */}
          {data.byRecommendation && data.byRecommendation.length > 0 && (
            <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-slate-100 mb-4">🎯 売買推奨別</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.byRecommendation.map((item) => (
                  <div key={item.group} className="bg-slate-800/50 rounded-xl p-4">
                    <div className="text-lg font-bold text-slate-200 mb-2">
                      {item.group === 'buy' ? '買い推奨' : item.group === 'sell' ? '売り推奨' : '静観'}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">前場有利率:</span>
                        <span className="text-amber-400 font-bold">{item.morningBetterPct.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">大引有利率:</span>
                        <span className="text-cyan-400 font-bold">{(100 - item.morningBetterPct).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">件数:</span>
                        <span className="text-slate-300">{item.total}件</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* スコア別 */}
          {data.byScore && data.byScore.length > 0 && (
            <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-slate-100 mb-4">⭐ スコア別</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.byScore.map((item) => (
                  <div key={item.group} className="bg-slate-800/50 rounded-xl p-4">
                    <div className="text-lg font-bold text-slate-200 mb-2">{item.group}</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">前場有利率:</span>
                        <span className="text-amber-400 font-bold">{item.morningBetterPct.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">大引有利率:</span>
                        <span className="text-cyan-400 font-bold">{(100 - item.morningBetterPct).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">平均スコア:</span>
                        <span className="text-slate-300">{item.avgScore?.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">件数:</span>
                        <span className="text-slate-300">{item.total}件</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* 株式レベル詳細テーブル */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-900/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 overflow-hidden"
        >
          <h2 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-amber-400" />
            株式レベル詳細
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/90 backdrop-blur-sm sticky top-0 z-10">
                <tr className="border-b-2 border-slate-700">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">日付</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">コード</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">企業名</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase">推奨</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">前場利益</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">大引利益</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase">有利</th>
                </tr>
              </thead>
              <tbody>
                {data.stocks.slice(0, 100).map((stock, idx) => (
                  <tr key={`${stock.ticker}-${idx}`} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-slate-300">{stock.backtestDate}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-200">{stock.ticker}</td>
                    <td className="px-4 py-3 text-slate-300 max-w-xs truncate">{stock.stockName}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                        stock.recommendationAction === 'buy' ? 'bg-green-500/20 text-green-300'
                        : stock.recommendationAction === 'sell' ? 'bg-red-500/20 text-red-300'
                        : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {stock.recommendationAction === 'buy' ? '買い' : stock.recommendationAction === 'sell' ? '売り' : '静観'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${(stock.profitMorning || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {(stock.profitMorning || 0) >= 0 ? '+' : ''}{Math.round(stock.profitMorning || 0).toLocaleString()}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${(stock.profitDayClose || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {(stock.profitDayClose || 0) >= 0 ? '+' : ''}{Math.round(stock.profitDayClose || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                        stock.betterProfitTiming === 'morning_close' ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-cyan-500/20 text-cyan-300'
                      }`}>
                        {stock.betterProfitTiming === 'morning_close' ? '前場' : '大引'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
