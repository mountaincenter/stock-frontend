// components/grok-dashboard/Top5Section.tsx
"use client";

import React from 'react';
import { BacktestStats, Top5Stats } from '@/lib/grok-backtest-types';
import { StatsCard } from './StatsCard';
import { cn } from '@/lib/utils';
import { Star, TrendingUp, Target, Award } from 'lucide-react';

interface Top5SectionProps {
  top5Stats: Top5Stats;
  overallStats: BacktestStats;
  className?: string;
}

export function Top5Section({ top5Stats, overallStats, className }: Top5SectionProps) {
  const winRateDiff = top5Stats.win_rate - overallStats.win_rate;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Star className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Top5 銘柄分析</h2>
          <p className="text-sm text-muted-foreground">
            スコア上位5銘柄の詳細パフォーマンス
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Top5 平均利益/100株"
          value={`${top5Stats.avg_profit_per_100_shares >= 0 ? '+' : ''}¥${Math.round(top5Stats.avg_profit_per_100_shares).toLocaleString()}`}
          subtitle={`全体: ${overallStats.avg_profit_per_100_shares >= 0 ? '+' : ''}¥${Math.round(overallStats.avg_profit_per_100_shares).toLocaleString()}`}
          trend={top5Stats.outperformance_profit_per_100_shares > 0 ? 'up' : top5Stats.outperformance_profit_per_100_shares < 0 ? 'down' : 'neutral'}
          trendValue={`${top5Stats.outperformance_profit_per_100_shares >= 0 ? '+' : ''}¥${Math.round(top5Stats.outperformance_profit_per_100_shares).toLocaleString()}`}
          icon={<TrendingUp className="w-16 h-16" />}
          highlight
        />

        <StatsCard
          title="Top5 勝率"
          value={`${top5Stats.win_rate.toFixed(1)}%`}
          subtitle={`全体: ${overallStats.win_rate.toFixed(1)}%`}
          trend={winRateDiff > 0 ? 'up' : winRateDiff < 0 ? 'down' : 'neutral'}
          trendValue={`${winRateDiff >= 0 ? '+' : ''}${winRateDiff.toFixed(1)}%`}
          icon={<Target className="w-16 h-16" />}
          highlight
        />

        <StatsCard
          title="Top5 累計利益/100株"
          value={`${top5Stats.total_profit_per_100_shares >= 0 ? '+' : ''}¥${Math.round(top5Stats.total_profit_per_100_shares).toLocaleString()}`}
          subtitle={`${top5Stats.valid_count}回の取引`}
          icon={<Award className="w-16 h-16" />}
          highlight
        />

        <StatsCard
          title="Top5 vs 全体の差"
          value={`${top5Stats.outperformance_profit_per_100_shares >= 0 ? '+' : ''}¥${Math.round(top5Stats.outperformance_profit_per_100_shares).toLocaleString()}`}
          subtitle={`1回あたりの差額`}
          trend={top5Stats.outperformance_profit_per_100_shares > 0 ? 'up' : top5Stats.outperformance_profit_per_100_shares < 0 ? 'down' : 'neutral'}
          icon={<Star className="w-16 h-16" />}
          highlight
        />
      </div>

      {/* Recommendation */}
      {top5Stats.outperformance_profit_per_100_shares > 500 && (
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
          <div className="flex items-start gap-3">
            <Star className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-semibold text-primary mb-1">
                💡 推奨: Top5銘柄への絞り込み
              </h4>
              <p className="text-sm text-primary/90">
                Top5銘柄は全体より1回あたり平均<strong>¥{Math.round(top5Stats.outperformance_profit_per_100_shares).toLocaleString()}/100株</strong>多く利益を出しています。
                {top5Stats.valid_count > 0 && (
                  <>
                    <br />累計では<strong>¥{Math.round(top5Stats.total_profit_per_100_shares).toLocaleString()}/100株</strong>の利益（{top5Stats.valid_count}回の取引）。
                    GROKの選定精度が高く、上位銘柄への集中投資が有効です。
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Table */}
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">指標</th>
              <th className="px-4 py-3 text-right font-medium">Top5</th>
              <th className="px-4 py-3 text-right font-medium">全体</th>
              <th className="px-4 py-3 text-right font-medium">差分</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr className="hover:bg-muted/20 bg-primary/5">
              <td className="px-4 py-3 font-semibold">平均利益/100株</td>
              <td className={cn(
                "px-4 py-3 text-right font-semibold",
                top5Stats.avg_profit_per_100_shares >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                ¥{Math.round(top5Stats.avg_profit_per_100_shares).toLocaleString()}
              </td>
              <td className={cn(
                "px-4 py-3 text-right font-semibold",
                overallStats.avg_profit_per_100_shares >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                ¥{Math.round(overallStats.avg_profit_per_100_shares).toLocaleString()}
              </td>
              <td className={cn(
                "px-4 py-3 text-right font-bold",
                top5Stats.outperformance_profit_per_100_shares >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {top5Stats.outperformance_profit_per_100_shares >= 0 ? '+' : ''}¥{Math.round(top5Stats.outperformance_profit_per_100_shares).toLocaleString()}
              </td>
            </tr>
            <tr className="hover:bg-muted/20 bg-primary/5">
              <td className="px-4 py-3 font-semibold">累計利益/100株</td>
              <td className={cn(
                "px-4 py-3 text-right font-semibold",
                top5Stats.total_profit_per_100_shares >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                ¥{Math.round(top5Stats.total_profit_per_100_shares).toLocaleString()}
              </td>
              <td className={cn(
                "px-4 py-3 text-right font-semibold",
                overallStats.total_profit_per_100_shares >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                ¥{Math.round(overallStats.total_profit_per_100_shares).toLocaleString()}
              </td>
              <td className={cn(
                "px-4 py-3 text-right font-bold",
                (top5Stats.total_profit_per_100_shares - overallStats.total_profit_per_100_shares) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {(top5Stats.total_profit_per_100_shares - overallStats.total_profit_per_100_shares) >= 0 ? '+' : ''}¥{Math.round(top5Stats.total_profit_per_100_shares - overallStats.total_profit_per_100_shares).toLocaleString()}
              </td>
            </tr>
            <tr className="hover:bg-muted/20">
              <td className="px-4 py-3">平均リターン</td>
              <td className={cn(
                "px-4 py-3 text-right font-medium",
                top5Stats.avg_return >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {top5Stats.avg_return.toFixed(2)}%
              </td>
              <td className={cn(
                "px-4 py-3 text-right font-medium",
                overallStats.avg_return >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {overallStats.avg_return.toFixed(2)}%
              </td>
              <td className={cn(
                "px-4 py-3 text-right font-semibold",
                top5Stats.outperformance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {top5Stats.outperformance >= 0 ? '+' : ''}{top5Stats.outperformance.toFixed(2)}%
              </td>
            </tr>
            <tr className="hover:bg-muted/20">
              <td className="px-4 py-3">勝率</td>
              <td className="px-4 py-3 text-right font-medium">{top5Stats.win_rate.toFixed(1)}%</td>
              <td className="px-4 py-3 text-right font-medium">{overallStats.win_rate.toFixed(1)}%</td>
              <td className={cn(
                "px-4 py-3 text-right font-semibold",
                winRateDiff >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {winRateDiff >= 0 ? '+' : ''}{winRateDiff.toFixed(1)}%
              </td>
            </tr>
            <tr className="hover:bg-muted/20">
              <td className="px-4 py-3">標準偏差</td>
              <td className="px-4 py-3 text-right font-medium">{top5Stats.std_return.toFixed(2)}%</td>
              <td className="px-4 py-3 text-right font-medium">{overallStats.std_return.toFixed(2)}%</td>
              <td className="px-4 py-3 text-right text-muted-foreground">
                {(top5Stats.std_return - overallStats.std_return).toFixed(2)}%
              </td>
            </tr>
            <tr className="hover:bg-muted/20">
              <td className="px-4 py-3">サンプル数</td>
              <td className="px-4 py-3 text-right font-medium">{top5Stats.valid_count}</td>
              <td className="px-4 py-3 text-right font-medium">{overallStats.valid_count}</td>
              <td className="px-4 py-3 text-right text-muted-foreground">
                {top5Stats.valid_count - overallStats.valid_count}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
