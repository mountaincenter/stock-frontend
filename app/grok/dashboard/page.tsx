// app/grok/dashboard/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { DashboardData } from '@/lib/grok-backtest-types';
import { AlertBanner } from '@/components/grok-dashboard/AlertBanner';
import { StatsCard } from '@/components/grok-dashboard/StatsCard';
import { PerformanceChart } from '@/components/grok-dashboard/PerformanceChart';
import { Top5Section } from '@/components/grok-dashboard/Top5Section';
import { TrendingUp, Target, BarChart3, Activity, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function GrokDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/grok/backtest-dashboard');

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // 5分ごとに自動更新
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">ダッシュボードを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto">
            <Activity className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-semibold">エラーが発生しました</h2>
          <p className="text-muted-foreground">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const trendIcon = data.trend_analysis.trend === 'improving'
    ? <TrendingUp className="w-4 h-4 text-green-600" />
    : data.trend_analysis.trend === 'declining'
    ? <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />
    : null;

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/?tag=grok"
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold">GROK バックテスト ダッシュボード</h1>
                <p className="text-sm text-muted-foreground">
                  Phase1戦略（9:00寄付買い → 11:30以降売却）のパフォーマンス分析
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {lastUpdate && (
                <div className="text-sm text-muted-foreground">
                  最終更新: {lastUpdate.toLocaleTimeString('ja-JP')}
                </div>
              )}
              <button
                onClick={fetchData}
                disabled={loading}
                className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Alerts */}
        {data.alerts && data.alerts.length > 0 && (
          <AlertBanner alerts={data.alerts} />
        )}

        {/* Overall Stats */}
        <section>
          <h2 className="text-xl font-bold mb-4">全体パフォーマンス</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="平均利益/100株"
              value={`${data.overall_stats.avg_profit_per_100_shares >= 0 ? '+' : ''}¥${Math.round(data.overall_stats.avg_profit_per_100_shares).toLocaleString()}`}
              subtitle={`平均リターン: ${data.overall_stats.avg_return.toFixed(2)}%`}
              trend={data.trend_analysis.trend === 'improving' ? 'up' : data.trend_analysis.trend === 'declining' ? 'down' : 'neutral'}
              trendValue={data.trend_analysis.trend !== 'stable' ? `${data.trend_analysis.change.toFixed(1)}%` : undefined}
              icon={<TrendingUp className="w-16 h-16" />}
            />

            <StatsCard
              title="勝率"
              value={`${data.overall_stats.win_rate.toFixed(1)}%`}
              subtitle={`${data.overall_stats.win_count}勝 / ${data.overall_stats.lose_count}敗`}
              icon={<Target className="w-16 h-16" />}
            />

            <StatsCard
              title="累計利益/100株"
              value={`${data.overall_stats.total_profit_per_100_shares >= 0 ? '+' : ''}¥${Math.round(data.overall_stats.total_profit_per_100_shares).toLocaleString()}`}
              subtitle={`${data.overall_stats.valid_count}回の取引`}
              icon={<BarChart3 className="w-16 h-16" />}
            />

            <StatsCard
              title="最高 / 最低利益"
              value={`+¥${Math.round(data.overall_stats.best_profit_per_100_shares).toLocaleString()}`}
              subtitle={`最低: ¥${Math.round(data.overall_stats.worst_profit_per_100_shares).toLocaleString()}`}
              icon={<Activity className="w-16 h-16" />}
            />
          </div>
        </section>

        {/* Trend */}
        {data.trend_analysis.trend !== 'stable' && (
          <section className={cn(
            "p-4 rounded-lg border",
            data.trend_analysis.trend === 'improving' ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"
          )}>
            <div className="flex items-start gap-3">
              {trendIcon}
              <div>
                <h3 className={cn(
                  "font-semibold mb-1",
                  data.trend_analysis.trend === 'improving' ? "text-green-900 dark:text-green-100" : "text-red-900 dark:text-red-100"
                )}>
                  {data.trend_analysis.trend === 'improving' ? '📈 パフォーマンス改善中' : '📉 パフォーマンス低下傾向'}
                </h3>
                <p className={cn(
                  "text-sm",
                  data.trend_analysis.trend === 'improving' ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"
                )}>
                  直近5日の平均リターン: {data.trend_analysis.recent_avg.toFixed(2)}%
                  （全期間: {data.trend_analysis.overall_avg.toFixed(2)}%、変化率: {data.trend_analysis.change >= 0 ? '+' : ''}{data.trend_analysis.change.toFixed(1)}%）
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Performance Chart */}
        <section>
          <h2 className="text-xl font-bold mb-4">日次パフォーマンス推移</h2>
          <div className="p-6 rounded-lg border bg-card">
            <PerformanceChart data={data.daily_stats} type="line" />
          </div>
        </section>

        {/* Top5 Section */}
        <section>
          <Top5Section
            top5Stats={data.top5_stats}
            overallStats={data.overall_stats}
          />
        </section>

        {/* Recent Records */}
        {data.recent_records && data.recent_records.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4">直近のバックテスト結果</h2>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">日付</th>
                    <th className="px-4 py-3 text-left font-medium">銘柄</th>
                    <th className="px-4 py-3 text-right font-medium">ランク</th>
                    <th className="px-4 py-3 text-right font-medium">買値</th>
                    <th className="px-4 py-3 text-right font-medium">売値</th>
                    <th className="px-4 py-3 text-right font-medium">リターン</th>
                    <th className="px-4 py-3 text-center font-medium">結果</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.recent_records.map((record, index) => (
                    <tr key={index} className="hover:bg-muted/20">
                      <td className="px-4 py-3">{record.backtest_date}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{record.ticker}</div>
                        <div className="text-xs text-muted-foreground">{record.stock_name}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {record.grok_rank !== null && record.grok_rank <= 5 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary">
                            #{record.grok_rank}
                          </span>
                        )}
                        {record.grok_rank !== null && record.grok_rank > 5 && (
                          <span className="text-muted-foreground">#{record.grok_rank}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {record.buy_price !== null ? `¥${record.buy_price.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {record.sell_price !== null ? `¥${record.sell_price.toLocaleString()}` : '-'}
                      </td>
                      <td className={cn(
                        "px-4 py-3 text-right font-semibold",
                        record.phase1_return !== null && record.phase1_return >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      )}>
                        {record.phase1_return !== null
                          ? `${record.phase1_return >= 0 ? '+' : ''}${(record.phase1_return * 100).toFixed(2)}%`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {record.phase1_win === true && <span className="text-green-600 dark:text-green-400">✓</span>}
                        {record.phase1_win === false && <span className="text-red-600 dark:text-red-400">✗</span>}
                        {record.phase1_win === null && <span className="text-muted-foreground">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Footer Note */}
        <div className="text-xs text-muted-foreground text-center p-4 border-t">
          <p>このダッシュボードは過去のバックテスト結果に基づいており、将来の投資成果を保証するものではありません。</p>
          <p>投資判断は自己責任で行ってください。</p>
        </div>
      </div>
    </main>
  );
}
