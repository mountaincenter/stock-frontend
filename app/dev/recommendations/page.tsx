"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Activity,
  AlertCircle,
  CheckCircle,
  Target,
  ShoppingCart,
  XCircle,
  Minus,
  ChevronDown,
  ChevronUp,
  Newspaper,
  TrendingUpIcon,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import type {
  TradingRecommendationResponse,
  Stock,
  ActionType,
} from "@/types/trading-recommendation";
import {
  getBuyStocks,
  getSellStocks,
  getHoldStocks,
  getRestrictedStocks,
  getNonRestrictedStocks,
  sortByScore,
  formatPercent,
  formatScore,
  formatStopLoss,
  formatPrice,
} from "@/types/trading-recommendation";

// Filter type extended with "restricted"
type FilterType = ActionType | "all" | "restricted";

export default function RecommendationsPage() {
  const [data, setData] = useState<TradingRecommendationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    fetch("/api/trading-recommendations")
      .then((res) => {
        if (!res.ok) throw new Error("データ取得に失敗しました");
        return res.json();
      })
      .then((data) => {
        setData(data);
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
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-200 text-lg">読み込み中...</p>
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
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 text-lg">エラー: {error || "データがありません"}</p>
        </motion.div>
      </div>
    );
  }

  // グループ化ソート: 買い→売り→静観→取引制限 の順で、各グループ内はスコア順
  const sortByActionAndScore = (stocks: Stock[]) => {
    const nonRestricted = getNonRestrictedStocks(stocks);
    const restricted = getRestrictedStocks(stocks);

    const buyStocks = sortByScore(getBuyStocks(nonRestricted));
    const sellStocks = sortByScore(getSellStocks(nonRestricted));
    const holdStocks = sortByScore(getHoldStocks(nonRestricted));
    const restrictedStocks = sortByScore(restricted);

    return [...buyStocks, ...sellStocks, ...holdStocks, ...restrictedStocks];
  };

  const filteredStocks =
    filter === "all"
      ? sortByActionAndScore(data.stocks)
      : filter === "buy"
        ? sortByScore(getBuyStocks(getNonRestrictedStocks(data.stocks)))
        : filter === "sell"
          ? sortByScore(getSellStocks(getNonRestrictedStocks(data.stocks)))
          : filter === "hold"
            ? sortByScore(getHoldStocks(getNonRestrictedStocks(data.stocks)))
            : sortByScore(getRestrictedStocks(data.stocks));

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
          <Link
            href="/dev/grok-analysis"
            className="inline-flex items-center text-slate-400 hover:text-white mb-4 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Grok分析レポートへ戻る
          </Link>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-lg">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-100">
                Grok推奨銘柄 売買判断レポート
              </h1>
              <p className="text-slate-500 text-[10px]">
                過去{data.dataSource.backtestCount}件のバックテスト + テクニカル分析
              </p>
            </div>
          </div>
        </motion.div>

        {/* Meta情報 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 mb-4 backdrop-blur-xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-slate-400">生成日時: </span>
              <span className="text-slate-200 font-semibold">
                {new Date(data.generatedAt).toLocaleString("ja-JP")}
              </span>
            </div>
            <div>
              <span className="text-slate-400">対象銘柄数: </span>
              <span className="text-slate-200 font-semibold">{data.summary.total}銘柄</span>
            </div>
            <div>
              <span className="text-slate-400">バックテスト期間: </span>
              <span className="text-slate-200 font-semibold">
                {data.dataSource.backtestPeriod.start} 〜 {data.dataSource.backtestPeriod.end}
              </span>
            </div>
          </div>
        </motion.div>

        {/* サマリーカード */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"
        >
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-2 border-green-500/30 rounded-xl p-4 text-center backdrop-blur-xl">
            <ShoppingCart className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <h3 className="text-3xl font-bold text-green-400">{data.summary.buy}</h3>
            <p className="text-slate-300 text-sm mt-1">買い候補</p>
          </div>
          <div className="bg-gradient-to-br from-red-500/10 to-pink-500/10 border-2 border-red-500/30 rounded-xl p-4 text-center backdrop-blur-xl">
            <XCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <h3 className="text-3xl font-bold text-red-400">{data.summary.sell}</h3>
            <p className="text-slate-300 text-sm mt-1">売り候補</p>
          </div>
          <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-2 border-orange-500/30 rounded-xl p-4 text-center backdrop-blur-xl">
            <Minus className="w-6 h-6 text-orange-400 mx-auto mb-2" />
            <h3 className="text-3xl font-bold text-orange-400">{data.summary.hold}</h3>
            <p className="text-slate-300 text-sm mt-1">静観</p>
          </div>
          <div className="bg-gradient-to-br from-slate-500/10 to-gray-500/10 border-2 border-slate-500/30 rounded-xl p-4 text-center backdrop-blur-xl">
            <AlertCircle className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <h3 className="text-3xl font-bold text-slate-400">{data.summary.restricted || 0}</h3>
            <p className="text-slate-300 text-sm mt-1">取引制限</p>
          </div>
        </motion.div>

        {/* 警告 */}
        {data.warnings && data.warnings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 mb-4 backdrop-blur-xl"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-orange-100 mb-1">⚠️ 重要な注意事項</h4>
                <ul className="list-disc list-inside space-y-0.5 text-sm text-orange-200/80">
                  {data.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        {/* フィルター */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-4"
        >
          <div className="flex gap-2 bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                filter === "all"
                  ? "bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg shadow-blue-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/30"
              }`}
            >
              すべて
            </button>
            <button
              onClick={() => setFilter("buy")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                filter === "buy"
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/30"
              }`}
            >
              買い候補
            </button>
            <button
              onClick={() => setFilter("sell")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                filter === "sell"
                  ? "bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg shadow-red-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/30"
              }`}
            >
              売り候補
            </button>
            <button
              onClick={() => setFilter("hold")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                filter === "hold"
                  ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/30"
              }`}
            >
              静観
            </button>
            <button
              onClick={() => setFilter("restricted")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                filter === "restricted"
                  ? "bg-gradient-to-r from-slate-500 to-gray-600 text-white shadow-lg shadow-slate-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/30"
              }`}
            >
              取引制限
            </button>
          </div>
        </motion.div>

        {/* テーブル */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="bg-slate-900/50 backdrop-blur-xl rounded-xl p-3 border border-slate-700/50 shadow-2xl mb-4"
        >
          <h2 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            推奨銘柄一覧 ({filteredStocks.length}件)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/90 backdrop-blur-sm sticky top-0 z-10">
                <tr className="border-b border-slate-700/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    ティッカー
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    銘柄名
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    ランク
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    前日終値
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    前日変化率
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    ATR(%)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    v2.0.3判断
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    v2.0.3スコア
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    v2.1判断
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    v2.1スコア
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    信頼度
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    損切り
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    制限
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredStocks.map((stock, index) => (
                    <StockRow key={stock.ticker} stock={stock} index={index} />
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* スコアリングルール */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 backdrop-blur-xl mb-4"
        >
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-400" />
            📋 判断基準（複合スコアリング）
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-bold mb-2 text-slate-200">スコア計算ルール</h3>
              <ul className="list-disc list-inside text-sm space-y-1 text-slate-300">
                <li>Grokランク: 上位25%=40点、上位50%=20点、下位25%=-10点 + バックテスト勝率調整</li>
                <li>ROE: 15%以上=+20点、マイナス=-15点</li>
                <li>営業利益成長: 50%以上=+25点、-30%以下=-20点</li>
                <li>前日変動: -3%以下=+15点（反発期待）、+10%以上=-10点</li>
                <li>ボラティリティ: 3%未満=+10点、8%超=-15点</li>
                <li>移動平均: 25日線から±5%以上乖離=±10点</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-slate-200">行動判定</h3>
              <ul className="list-disc list-inside text-sm space-y-1 text-slate-300">
                <li>スコア +30以上: 買い候補</li>
                <li>スコア -30以下: 売り候補</li>
                <li>スコア -29 ~ +29: 静観</li>
              </ul>

              <h3 className="font-bold mt-3 mb-2 text-slate-200">推奨損切りライン</h3>
              <ul className="list-disc list-inside text-sm space-y-1 text-slate-300">
                <li>買い: ATRの80%、最小2%、最大5%</li>
                <li>売り: ATRの120%、最小5%、最大10%</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* フッター */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="text-center text-slate-500 text-sm mt-8 pt-6 border-t border-slate-800/50"
        >
          <p>生成日時: {new Date(data.generatedAt).toLocaleString("ja-JP")}</p>
          <p className="text-red-400 font-bold mt-2">
            投資は自己責任で行ってください。このレポートは投資助言ではありません。
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function StockRow({ stock, index }: { stock: Stock; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const getActionBadge = (action: Stock["recommendation"]["action"]) => {
    switch (action) {
      case "buy":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-xs">
            <TrendingUp className="w-3 h-3" />
            買い
          </span>
        );
      case "sell":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-red-500 to-pink-600 text-white font-bold text-xs">
            <TrendingDown className="w-3 h-3" />
            売り
          </span>
        );
      case "hold":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold text-xs">
            <Minus className="w-3 h-3" />
            静観
          </span>
        );
    }
  };

  const getConfidenceBadge = (confidence: Stock["recommendation"]["confidence"]) => {
    switch (confidence) {
      case "high":
        return <span className="text-green-400 font-bold">高</span>;
      case "medium":
        return <span className="text-yellow-400 font-bold">中</span>;
      case "low":
        return <span className="text-red-400 font-bold">低</span>;
    }
  };

  const getSentimentBadge = (sentiment?: string) => {
    if (!sentiment) return null;
    switch (sentiment) {
      case "positive":
        return <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold">ポジティブ</span>;
      case "negative":
        return <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold">ネガティブ</span>;
      case "very_negative":
        return <span className="px-2 py-1 rounded-full bg-red-600/30 text-red-300 text-xs font-bold">強ネガティブ</span>;
      default:
        return <span className="px-2 py-1 rounded-full bg-slate-500/20 text-slate-400 text-xs font-bold">中立</span>;
    }
  };

  const isRestricted = stock.tradingRestriction?.isRestricted === true;

  const bgColor = isRestricted
    ? "bg-slate-500/10 hover:bg-slate-500/15"
    : stock.recommendation.action === "buy"
      ? "bg-green-500/5 hover:bg-green-500/10"
      : stock.recommendation.action === "sell"
        ? "bg-red-500/5 hover:bg-red-500/10"
        : "bg-orange-500/5 hover:bg-orange-500/10";

  const getRestrictionBadge = () => {
    if (!isRestricted) {
      return <span className="text-green-400 text-xs font-bold">○</span>;
    }
    const reason = stock.tradingRestriction?.reason || "制限あり";
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-bold cursor-help animate-pulse"
        title={reason}
      >
        <AlertCircle className="w-3 h-3" />
        停止
      </span>
    );
  };

  const hasDeepAnalysis = stock.deepAnalysis && (
    stock.deepAnalysis.latestNews ||
    stock.deepAnalysis.sectorTrend ||
    stock.deepAnalysis.risks ||
    stock.deepAnalysis.opportunities
  );

  return (
    <>
      <motion.tr
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3, delay: index * 0.02 }}
        className={`border-b border-slate-800/50 transition-colors ${bgColor} ${hasDeepAnalysis ? 'cursor-pointer' : ''}`}
        onClick={() => hasDeepAnalysis && setExpanded(!expanded)}
      >
        <td className="px-4 py-3 text-sm font-medium text-slate-200">
          <div className="flex items-center gap-2">
            {hasDeepAnalysis && (
              expanded ? <ChevronUp className="w-4 h-4 text-blue-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
            {stock.ticker}
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-slate-300">
          <a
            href={`https://finance.yahoo.co.jp/quote/${stock.ticker}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-400 hover:underline transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {stock.stockName || stock.ticker}
          </a>
        </td>
        <td className="px-4 py-3 text-sm text-center text-slate-300">{stock.grokRank || 'N/A'}</td>
        <td className="px-4 py-3 text-sm text-right text-slate-300 font-mono">
          {stock.technicalData?.prevClose ? formatPrice(stock.technicalData.prevClose) : 'N/A'}
        </td>
        <td className="px-4 py-3 text-sm text-right text-slate-300">
          {stock.technicalData?.prevDayChangePct ? formatPercent(stock.technicalData.prevDayChangePct) : 'N/A'}
        </td>
        <td className="px-4 py-3 text-sm text-right text-slate-300">
          {stock.technicalData?.atr?.value ? formatPercent(stock.technicalData.atr.value) : 'N/A'}
        </td>
        <td className="px-4 py-3 text-center">
          {stock.recommendation.v2_0_3_action && getActionBadge(stock.recommendation.v2_0_3_action)}
        </td>
        <td className="px-4 py-3 text-sm text-right font-mono">
          {stock.recommendation.v2_0_3_score !== undefined && (
            <span className={stock.recommendation.v2_0_3_score >= 0 ? "text-green-400" : "text-red-400"}>
              {formatScore(stock.recommendation.v2_0_3_score)}
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-center">{getActionBadge(stock.recommendation.action)}</td>
        <td className="px-4 py-3 text-sm text-right font-mono font-bold">
          <span
            className={
              stock.recommendation.score >= 0 ? "text-green-400" : "text-red-400"
            }
          >
            {formatScore(stock.recommendation.score)}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-center">
          {getConfidenceBadge(stock.recommendation.confidence)}
        </td>
        <td className="px-4 py-3 text-sm text-right font-mono text-slate-300">
          {stock.recommendation.stopLoss ? formatStopLoss(stock.recommendation.stopLoss) : 'N/A'}
        </td>
        <td className="px-4 py-3 text-sm text-center">
          {getRestrictionBadge()}
        </td>
      </motion.tr>

      {/* Deep Analysis Expanded Section */}
      {expanded && hasDeepAnalysis && (
        <motion.tr
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className={bgColor}
        >
          <td colSpan={13} className="px-6 py-4">
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
              {/* Header */}
              <div className="flex items-center gap-2 border-b border-slate-700 pb-2">
                <Newspaper className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold text-slate-200">深掘り分析</h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left Column */}
                <div className="space-y-3">
                  {/* Latest News */}
                  {stock.deepAnalysis?.latestNews && stock.deepAnalysis.latestNews.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                        <Newspaper className="w-4 h-4 text-blue-400" />
                        最新ニュース
                      </h4>
                      <ul className="space-y-1.5">
                        {stock.deepAnalysis.latestNews.map((news, i) => (
                          <li key={i} className="text-sm text-slate-300 pl-4 border-l-2 border-blue-500/30">
                            {news}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Sector Trend */}
                  {stock.deepAnalysis?.sectorTrend && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                        <TrendingUpIcon className="w-4 h-4 text-purple-400" />
                        セクター動向
                      </h4>
                      <p className="text-sm text-slate-300 pl-4 border-l-2 border-purple-500/30">
                        {stock.deepAnalysis.sectorTrend}
                      </p>
                    </div>
                  )}

                  {/* Market Sentiment */}
                  {stock.deepAnalysis?.marketSentiment && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-300 mb-2">市場センチメント</h4>
                      {getSentimentBadge(stock.deepAnalysis.marketSentiment)}
                    </div>
                  )}
                </div>

                {/* Right Column */}
                <div className="space-y-3">
                  {/* Risks */}
                  {stock.deepAnalysis?.risks && stock.deepAnalysis.risks.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        リスク
                      </h4>
                      <ul className="space-y-1.5">
                        {stock.deepAnalysis.risks.map((risk, i) => (
                          <li key={i} className="text-sm text-red-300 pl-4 border-l-2 border-red-500/30">
                            {risk}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Opportunities */}
                  {stock.deepAnalysis?.opportunities && stock.deepAnalysis.opportunities.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-green-400" />
                        機会
                      </h4>
                      <ul className="space-y-1.5">
                        {stock.deepAnalysis.opportunities.map((opp, i) => (
                          <li key={i} className="text-sm text-green-300 pl-4 border-l-2 border-green-500/30">
                            {opp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Verdict */}
                  {stock.deepAnalysis?.verdict && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-300 mb-2">総合判断</h4>
                      <p className="text-sm text-slate-300 pl-4 border-l-2 border-yellow-500/30 italic">
                        {stock.deepAnalysis.verdict}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </td>
        </motion.tr>
      )}
    </>
  );
}
