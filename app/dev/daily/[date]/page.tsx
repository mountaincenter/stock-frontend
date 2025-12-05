"use client";

import { useEffect, useState, Fragment } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  Calendar,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import MarketSummary from "@/components/MarketSummary";

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

interface BacktestResult {
  ticker: string;
  stock_name: string;
  selection_score: number | null;
  grok_rank: number;
  reason: string | null;
  selected_time: string | null;
  buy_price: number | null;
  sell_price: number | null;
  phase_return: number | null;
  phase_win: boolean | null;
  profit_per_100?: number | null;
  morning_high: number | null;
  morning_low: number | null;
  morning_max_gain_pct: number | null;
  morning_max_drawdown_pct: number | null;
  high: number | null;
  low: number | null;
  daily_max_gain_pct: number | null;
  daily_max_drawdown_pct: number | null;
  morning_volume: number | null;
}

interface DailyStats {
  total_stocks: number;
  valid_results: number;
  avg_return: number | null;
  win_rate: number | null;
  max_return: number | null;
  min_return: number | null;
  total_profit_per_100: number | null;
  top5_avg_return: number | null;
  top5_win_rate: number | null;
  top5_total_profit_per_100: number | null;
}

interface DailyBacktest {
  date: string;
  stats: DailyStats;
  results: BacktestResult[];
}

export default function DailyDetailPage() {
  const params = useParams();
  const date = params.date as string;

  const [data, setData] = useState<DailyBacktest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<Phase>("phase2"); // デフォルトはPhase 2

  useEffect(() => {
    if (!date) return;

    setLoading(true);
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    fetch(`${API_BASE}/api/dev/backtest/daily/${date}?phase=${selectedPhase}`)
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
  }, [date, selectedPhase]);

  if (loading) {
    return (
      <main className="relative min-h-screen flex items-center justify-center">
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
          <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-primary/8 via-primary/3 to-transparent blur-3xl animate-pulse-slow" />
          <div className="absolute -bottom-1/3 -left-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-accent/10 via-accent/4 to-transparent blur-3xl animate-pulse-slower" />
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">読み込み中...</p>
        </motion.div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="relative min-h-screen flex items-center justify-center">
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-xl border border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-card/80 to-card/50 p-8 backdrop-blur-xl"
        >
          <p className="text-rose-400">エラー: {error || "データがありません"}</p>
        </motion.div>
      </main>
    );
  }

  const { stats, results } = data;

  return (
    <main className="relative min-h-screen">
      {/* Premium background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-primary/8 via-primary/3 to-transparent blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-1/3 -left-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-accent/10 via-accent/4 to-transparent blur-3xl animate-pulse-slower" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 leading-[1.8] tracking-[0.02em] font-sans">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4"
        >
          <Link
            href="/dev"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors group text-sm"
          >
            <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
            ダッシュボードに戻る
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-5"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl border border-primary/20">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {date}
                </h1>
                <p className="text-muted-foreground text-xs">
                  {PHASE_INFO[selectedPhase].title}戦略: {PHASE_INFO[selectedPhase].description}
                </p>
              </div>
            </div>

            {/* Phase選択 */}
            <div className="lg:min-w-[300px]">
              <div className="flex flex-wrap gap-1 bg-muted/30 p-2 rounded-xl border border-border/40">
                {(Object.keys(PHASE_INFO) as Phase[]).map((phase) => (
                  <button
                    key={phase}
                    onClick={() => setSelectedPhase(phase)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                      selectedPhase === phase
                        ? "bg-primary text-primary-foreground shadow-md ring-1 ring-primary/50"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {PHASE_INFO[phase].label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {/* 取引数 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            whileHover={{ scale: 1.02, y: -3 }}
            className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="text-xs text-muted-foreground mb-2">取引数</div>
              <div className="text-2xl font-bold text-foreground text-right tabular-nums">{stats.valid_results}</div>
              <div className="text-xs text-muted-foreground/70">/ {stats.total_stocks} 銘柄</div>
            </div>
          </motion.div>

          {/* 勝率 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            whileHover={{ scale: 1.02, y: -3 }}
            className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="text-xs text-muted-foreground mb-2">勝率</div>
              <div className="flex justify-between items-baseline mb-1">
                <div className="text-xs text-muted-foreground/70">全銘柄</div>
                <div className={`text-lg font-bold tabular-nums ${stats.win_rate && stats.win_rate >= 50 ? "text-emerald-400" : "text-rose-400"}`}>
                  {stats.win_rate !== null ? `${stats.win_rate.toFixed(1)}%` : "—"}
                </div>
              </div>
              <div className="flex justify-between items-baseline">
                <div className="text-xs text-muted-foreground/70">Top5</div>
                <div className={`text-lg font-bold tabular-nums ${stats.top5_win_rate !== null && stats.top5_win_rate >= 50 ? "text-emerald-400" : "text-rose-400"}`}>
                  {stats.top5_win_rate !== null ? `${stats.top5_win_rate.toFixed(1)}%` : "—"}
                </div>
              </div>
            </div>
          </motion.div>

          {/* 累計損益 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            whileHover={{ scale: 1.02, y: -3 }}
            className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="text-xs text-muted-foreground mb-2">累計損益/100株</div>
              <div className="flex justify-between items-baseline mb-1">
                <div className="text-xs text-muted-foreground/70">全銘柄</div>
                <div className={`text-lg font-bold tabular-nums ${stats.total_profit_per_100 !== null && stats.total_profit_per_100 >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {stats.total_profit_per_100 !== null ? `${stats.total_profit_per_100 >= 0 ? "+" : ""}${Math.round(stats.total_profit_per_100).toLocaleString()}円` : "—"}
                </div>
              </div>
              <div className="flex justify-between items-baseline">
                <div className="text-xs text-muted-foreground/70">Top5</div>
                <div className={`text-lg font-bold tabular-nums ${stats.top5_total_profit_per_100 !== null && stats.top5_total_profit_per_100 >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {stats.top5_total_profit_per_100 !== null ? `${stats.top5_total_profit_per_100 >= 0 ? "+" : ""}${Math.round(stats.top5_total_profit_per_100).toLocaleString()}円` : "—"}
                </div>
              </div>
            </div>
          </motion.div>

          {/* 平均リターン */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            whileHover={{ scale: 1.02, y: -3 }}
            className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="text-xs text-muted-foreground mb-2">平均リターン</div>
              <div className="flex justify-between items-baseline mb-1">
                <div className="text-xs text-muted-foreground/70">全銘柄</div>
                <div className={`text-lg font-bold tabular-nums ${stats.avg_return !== null && stats.avg_return >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {stats.avg_return !== null ? `${stats.avg_return >= 0 ? "+" : ""}${stats.avg_return.toFixed(2)}%` : "—"}
                </div>
              </div>
              <div className="flex justify-between items-baseline">
                <div className="text-xs text-muted-foreground/70">Top5</div>
                <div className={`text-lg font-bold tabular-nums ${stats.top5_avg_return !== null && stats.top5_avg_return >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {stats.top5_avg_return !== null ? `${stats.top5_avg_return >= 0 ? "+" : ""}${stats.top5_avg_return.toFixed(2)}%` : "—"}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Results Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mb-4"
        >
          <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-xl shadow-black/5 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <h2 className="text-sm font-bold text-foreground mb-3">銘柄別パフォーマンス</h2>

              <div className="overflow-x-auto max-h-[700px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card/95 backdrop-blur-sm z-10">
                    <tr className="border-b border-border/40">
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                        結果
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                        銘柄
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">
                        スコア
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">
                        買値
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">
                        売値
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">
                        {selectedPhase === "phase1" ? "前場高値" : "高値"}
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">
                        {selectedPhase === "phase1" ? "前場安値" : "安値"}
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">
                        最大上昇率
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">
                        最大下落率
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">
                        リターン
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">
                        100株損益
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">
                        理由
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                  {results.map((result, index) => {
                    const isFlat = result.phase_return !== null && result.phase_return === 0;
                    const isWin = !isFlat && result.phase_win === true;
                    const isLoss = !isFlat && result.phase_win === false;

                    return (
                      <motion.tr
                        key={result.ticker}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.01 }}
                        className="border-b border-border/30 hover:bg-primary/5 transition-colors group"
                      >
                        <td className="px-3 py-2 text-sm">
                          {isFlat ? "➖" : isWin ? "✅" : isLoss ? "❌" : "⚠️"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-sm font-bold text-foreground">{result.stock_name}</div>
                          <div className="text-xs text-muted-foreground tabular-nums">{result.ticker}</div>
                        </td>
                        <td className="px-3 py-2 text-sm text-right">
                          <span className="text-primary font-medium">
                            {result.selection_score !== null ? result.selection_score.toFixed(1) : "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm text-right text-muted-foreground tabular-nums">
                          {result.buy_price !== null ? `${result.buy_price.toLocaleString()}円` : "—"}
                        </td>
                        <td className={`px-3 py-2 text-sm text-right tabular-nums font-bold ${
                          isWin && result.sell_price !== null &&
                          (selectedPhase === "phase1" ? result.morning_high : result.high) !== null &&
                          result.sell_price >= (selectedPhase === "phase1" ? result.morning_high! : result.high!)
                            ? "text-emerald-400"
                            : isLoss && result.sell_price !== null &&
                            (selectedPhase === "phase1" ? result.morning_low : result.low) !== null &&
                            result.sell_price >= (selectedPhase === "phase1" ? result.morning_low! : result.low!)
                            ? "text-rose-400"
                            : "text-muted-foreground"
                        }`}>
                          {result.sell_price !== null ? `${result.sell_price.toLocaleString()}円` : "—"}
                        </td>
                        <td className={`px-3 py-2 text-sm text-right tabular-nums font-bold ${
                          isWin && result.sell_price !== null &&
                          (selectedPhase === "phase1" ? result.morning_high : result.high) !== null &&
                          result.sell_price < (selectedPhase === "phase1" ? result.morning_high! : result.high!)
                            ? "text-emerald-400"
                            : "text-muted-foreground"
                        }`}>
                          {selectedPhase === "phase1"
                            ? (result.morning_high !== null ? `${result.morning_high.toLocaleString()}円` : "—")
                            : (result.high !== null ? `${result.high.toLocaleString()}円` : "—")
                          }
                        </td>
                        <td className={`px-3 py-2 text-sm text-right tabular-nums font-bold ${
                          isLoss && result.sell_price !== null &&
                          (selectedPhase === "phase1" ? result.morning_low : result.low) !== null &&
                          result.sell_price < (selectedPhase === "phase1" ? result.morning_low! : result.low!)
                            ? "text-rose-400"
                            : "text-muted-foreground"
                        }`}>
                          {selectedPhase === "phase1"
                            ? (result.morning_low !== null ? `${result.morning_low.toLocaleString()}円` : "—")
                            : (result.low !== null ? `${result.low.toLocaleString()}円` : "—")
                          }
                        </td>
                        <td className={`px-3 py-2 text-sm text-right font-bold ${
                          (selectedPhase === "phase1"
                            ? (result.morning_max_gain_pct !== null && result.morning_max_gain_pct > 0)
                            : (result.daily_max_gain_pct !== null && result.daily_max_gain_pct > 0)
                          ) ? "text-emerald-400" : "text-muted-foreground/50"
                        }`}>
                          {selectedPhase === "phase1"
                            ? (result.morning_max_gain_pct !== null ? `+${result.morning_max_gain_pct.toFixed(2)}%` : "—")
                            : (result.daily_max_gain_pct !== null ? `+${result.daily_max_gain_pct.toFixed(2)}%` : "—")
                          }
                        </td>
                        <td className={`px-3 py-2 text-sm text-right font-bold ${
                          (selectedPhase === "phase1"
                            ? (result.morning_max_drawdown_pct !== null && result.morning_max_drawdown_pct < 0)
                            : (result.daily_max_drawdown_pct !== null && result.daily_max_drawdown_pct < 0)
                          ) ? "text-rose-400" : "text-muted-foreground/50"
                        }`}>
                          {selectedPhase === "phase1"
                            ? (result.morning_max_drawdown_pct !== null ? `${result.morning_max_drawdown_pct.toFixed(2)}%` : "—")
                            : (result.daily_max_drawdown_pct !== null ? `${result.daily_max_drawdown_pct.toFixed(2)}%` : "—")
                          }
                        </td>
                        <td className={`px-3 py-2 text-sm text-right font-bold ${
                          isWin ? "text-emerald-400" : isLoss ? "text-rose-400" : isFlat ? "text-muted-foreground" : "text-muted-foreground/50"
                        }`}>
                          {result.phase_return !== null ? (
                            <>
                              {result.phase_return > 0 ? "+" : ""}
                              {result.phase_return.toFixed(2)}%
                            </>
                          ) : "—"}
                        </td>
                        <td className={`px-3 py-2 text-sm text-right font-bold tabular-nums ${
                          result.profit_per_100 !== null && result.profit_per_100 !== undefined && result.profit_per_100 > 0
                            ? "text-emerald-400"
                            : result.profit_per_100 !== null && result.profit_per_100 !== undefined && result.profit_per_100 < 0
                            ? "text-rose-400"
                            : result.profit_per_100 !== null && result.profit_per_100 !== undefined && result.profit_per_100 === 0
                            ? "text-muted-foreground"
                            : "text-muted-foreground/50"
                        }`}>
                          {result.profit_per_100 !== null && result.profit_per_100 !== undefined ? (
                            <>
                              {result.profit_per_100 > 0 ? "+" : ""}
                              {result.profit_per_100.toLocaleString()}円
                            </>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-2 text-sm text-right">
                          {result.reason ? (
                            <div className="group/reason relative inline-block">
                              <button className="text-muted-foreground hover:text-primary transition-colors">
                                <ChevronRight className="w-4 h-4" />
                              </button>
                              <div className="absolute right-0 bottom-full mb-2 hidden group-hover/reason:block w-80 p-3 bg-card/95 backdrop-blur-xl border border-border/40 rounded-lg shadow-2xl z-10">
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {result.reason}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Market Summary for this date */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mb-4"
        >
          <MarketSummary date={date} />
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center text-muted-foreground/70 text-xs mt-6 pt-4 border-t border-border/30"
        >
          <p>GROK Backtest Dashboard v2.0 | Powered by xAI</p>
        </motion.div>
      </div>
    </main>
  );
}
