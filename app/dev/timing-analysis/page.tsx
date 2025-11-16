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
  companyName: string;
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
            前場終値(11:30) vs 大引値(15:30) の比較分析
          </p>
          <div className="mt-4 text-sm text-slate-300">
            分析期間: <span className="font-bold text-amber-400">{data.metadata.dateRange.start} ~ {data.metadata.dateRange.end}</span>
          </div>
        </motion.div>

        {/* サマリーカード (5枚) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8"
        >
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
              {data.summary.profitTiming.morningBetter}件 / {data.summary.total}件
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
            <div className="text-slate-400 text-sm mb-2">平均利益差</div>
            <div className={`text-3xl font-bold ${profitDiff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {profitDiff >= 0 ? '+' : ''}{profitDiff.toFixed(0)}円
            </div>
            <div className="text-slate-500 text-xs mt-1">
              前場 - 大引
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
            <div className="text-slate-400 text-sm mb-2">勝率（前場不成）</div>
            <div className="text-3xl font-bold text-green-400">
              {data.winRates.morning?.toFixed(1)}%
            </div>
            <div className="text-slate-500 text-xs mt-1">
              前場: {data.summary.avgProfitMorning?.toFixed(0)}円
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
            <div className="text-slate-400 text-sm mb-2">勝率（大引不成）</div>
            <div className="text-3xl font-bold text-cyan-400">
              {data.winRates.dayClose?.toFixed(1)}%
            </div>
            <div className="text-slate-500 text-xs mt-1">
              大引: {data.summary.avgProfitDay?.toFixed(0)}円
            </div>
          </div>
        </motion.div>

        {/* 利確タイミング比較 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-slate-100 mb-2 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
              利確タイミング比較
            </h2>
            <p className="text-slate-400 mb-6 text-sm">
              どちらのタイミングで売却した方が利益が大きかったか
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-300 font-semibold">前場不成（11:30）</span>
                  <span className="text-amber-400 font-bold">
                    {data.summary.profitTiming.morningBetter}件 ({data.summary.profitTiming.morningBetterPct?.toFixed(1)}%)
                  </span>
                </div>
                <div className="relative h-8 bg-slate-800/50 rounded-full overflow-hidden">
                  <div
                    className="absolute h-full bg-gradient-to-r from-amber-500 to-amber-600 flex items-center justify-end px-4 text-sm font-bold text-white transition-all duration-500"
                    style={{ width: `${data.summary.profitTiming.morningBetterPct}%` }}
                  >
                    {data.summary.profitTiming.morningBetterPct?.toFixed(1)}%
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-300 font-semibold">大引不成（15:30）</span>
                  <span className="text-cyan-400 font-bold">
                    {data.summary.profitTiming.dayBetter}件 ({(100 - (data.summary.profitTiming.morningBetterPct || 0)).toFixed(1)}%)
                  </span>
                </div>
                <div className="relative h-8 bg-slate-800/50 rounded-full overflow-hidden">
                  <div
                    className="absolute h-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-end px-4 text-sm font-bold text-white transition-all duration-500"
                    style={{ width: `${100 - (data.summary.profitTiming.morningBetterPct || 0)}%` }}
                  >
                    {(100 - (data.summary.profitTiming.morningBetterPct || 0)).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-cyan-900/20 border-l-4 border-cyan-500 rounded">
              <strong className="text-cyan-300">結論:</strong>
              <span className="text-slate-200 ml-2">
                {data.summary.profitTiming.morningBetterPct > 50
                  ? `前場不成（11:30）の方が有利なケースが多い（${data.summary.profitTiming.morningBetterPct.toFixed(1)}%）`
                  : `大引不成（15:30）の方が有利なケースが多い（${(100 - data.summary.profitTiming.morningBetterPct).toFixed(1)}%）`}
              </span>
            </div>
          </div>
        </motion.section>

        {/* 損切りタイミング比較 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-slate-100 mb-2 flex items-center gap-2">
              <TrendingDown className="w-6 h-6 text-red-400" />
              損切りタイミング比較
            </h2>
            <p className="text-slate-400 mb-6 text-sm">
              どちらのタイミングで損切りした方が損失が小さかったか
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-300 font-semibold">前場損切り（11:30）</span>
                  <span className="text-amber-400 font-bold">
                    {data.summary.lossTiming.morningBetter}件 ({data.summary.lossTiming.morningBetterPct?.toFixed(1)}%)
                  </span>
                </div>
                <div className="relative h-8 bg-slate-800/50 rounded-full overflow-hidden">
                  <div
                    className="absolute h-full bg-gradient-to-r from-amber-500 to-amber-600 flex items-center justify-end px-4 text-sm font-bold text-white transition-all duration-500"
                    style={{ width: `${data.summary.lossTiming.morningBetterPct}%` }}
                  >
                    {data.summary.lossTiming.morningBetterPct?.toFixed(1)}%
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-300 font-semibold">大引精算（15:30）</span>
                  <span className="text-cyan-400 font-bold">
                    {data.summary.lossTiming.dayBetter}件 ({(100 - (data.summary.lossTiming.morningBetterPct || 0)).toFixed(1)}%)
                  </span>
                </div>
                <div className="relative h-8 bg-slate-800/50 rounded-full overflow-hidden">
                  <div
                    className="absolute h-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-end px-4 text-sm font-bold text-white transition-all duration-500"
                    style={{ width: `${100 - (data.summary.lossTiming.morningBetterPct || 0)}%` }}
                  >
                    {(100 - (data.summary.lossTiming.morningBetterPct || 0)).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-cyan-900/20 border-l-4 border-cyan-500 rounded">
              <strong className="text-cyan-300">結論:</strong>
              <span className="text-slate-200 ml-2">
                {data.summary.lossTiming.morningBetterPct > 50
                  ? `前場損切り（11:30）の方が損失が小さいケースが多い（${data.summary.lossTiming.morningBetterPct.toFixed(1)}%）`
                  : `大引精算（15:30）の方が損失が小さいケースが多い（${(100 - data.summary.lossTiming.morningBetterPct).toFixed(1)}%）`}
              </span>
            </div>
          </div>
        </motion.section>

        {/* 銘柄別詳細データ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-2">
              <Activity className="w-6 h-6 text-blue-400" />
              銘柄別詳細データ
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/90 backdrop-blur-sm">
                  <tr className="border-b-2 border-slate-700">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">日付</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">銘柄コード</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">企業名</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase">売買推奨</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">前場利益</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">大引利益</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">前場利益率</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">大引利益率</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase">有利なタイミング</th>
                  </tr>
                </thead>
                <tbody>
                  {data.stocks.map((stock, idx) => (
                    <tr
                      key={`${stock.ticker}-${idx}`}
                      className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-300">{stock.backtestDate}</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-200">{stock.ticker}</td>
                      <td className="px-4 py-3 text-slate-300">{stock.companyName}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                            stock.recommendationAction === 'buy'
                              ? 'bg-green-500/20 text-green-300'
                              : stock.recommendationAction === 'sell'
                              ? 'bg-red-500/20 text-red-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {stock.recommendationAction === 'buy' ? '買い' : stock.recommendationAction === 'sell' ? '売り' : '静観'}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-mono font-bold ${(stock.profitMorning || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {(stock.profitMorning || 0) >= 0 ? '+' : ''}{Math.round(stock.profitMorning || 0).toLocaleString()}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono font-bold ${(stock.profitDayClose || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {(stock.profitDayClose || 0) >= 0 ? '+' : ''}{Math.round(stock.profitDayClose || 0).toLocaleString()}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono ${(stock.profitMorningPct || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {(stock.profitMorningPct || 0) >= 0 ? '+' : ''}{stock.profitMorningPct?.toFixed(2)}%
                      </td>
                      <td className={`px-4 py-3 text-right font-mono ${(stock.profitDayClosePct || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {(stock.profitDayClosePct || 0) >= 0 ? '+' : ''}{stock.profitDayClosePct?.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                            stock.betterProfitTiming === 'morning_close'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                          }`}
                        >
                          {stock.betterProfitTiming === 'morning_close' ? '前場' : '大引'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.section>

        {/* フッター */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-slate-500 text-sm mt-8 pt-6 border-t border-slate-800/50"
        >
          <p>分析期間: {data.metadata.dateRange.start} ~ {data.metadata.dateRange.end}</p>
          <p className="mt-2">データソース: Yahoo Finance (5分足データ)</p>
        </motion.div>
      </div>
    </div>
  );
}
