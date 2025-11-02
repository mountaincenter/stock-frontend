// app/api/grok/backtest-dashboard/route.ts
import { NextResponse } from 'next/server';
import type {
  BacktestRecord,
  BacktestStats,
  Top5Stats,
  DailyStats,
  TrendAnalysis,
  Alert,
  DashboardData
} from '@/lib/grok-backtest-types';

// キャッシュ
let cachedData: DashboardData | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5分

/**
 * バックテスト統計を計算
 */
function calculateStats(records: BacktestRecord[]): BacktestStats {
  const validRecords = records.filter(r => r.phase1_return !== null && r.buy_price !== null);
  const returns = validRecords.map(r => r.phase1_return!);
  const winCount = validRecords.filter(r => r.phase1_win === true).length;

  // 100株あたりの利益計算
  const profitsPerShare = validRecords.map(r => {
    const buyPrice = r.buy_price!;
    const sellPrice = r.sell_price!;
    return (sellPrice - buyPrice) * 100; // 100株分
  });

  returns.sort((a, b) => a - b);
  const median = returns.length > 0
    ? returns[Math.floor(returns.length / 2)]
    : 0;

  const avg = returns.length > 0
    ? returns.reduce((a, b) => a + b, 0) / returns.length
    : 0;

  const variance = returns.length > 0
    ? returns.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / returns.length
    : 0;

  const avgProfit = profitsPerShare.length > 0
    ? profitsPerShare.reduce((a, b) => a + b, 0) / profitsPerShare.length
    : 0;

  const totalProfit = profitsPerShare.reduce((a, b) => a + b, 0);

  // Extract unique dates from records
  const uniqueDates = new Set(records.map(r => r.backtest_date));

  return {
    total_count: records.length,
    valid_count: validRecords.length,
    win_count: winCount,
    lose_count: validRecords.length - winCount,
    win_rate: validRecords.length > 0 ? (winCount / validRecords.length) * 100 : 0,
    avg_return: avg * 100, // パーセント表示
    median_return: median * 100,
    std_return: Math.sqrt(variance) * 100,
    best_return: returns.length > 0 ? Math.max(...returns) * 100 : 0,
    worst_return: returns.length > 0 ? Math.min(...returns) * 100 : 0,
    avg_profit_per_100_shares: avgProfit,
    total_profit_per_100_shares: totalProfit,
    best_profit_per_100_shares: profitsPerShare.length > 0 ? Math.max(...profitsPerShare) : 0,
    worst_profit_per_100_shares: profitsPerShare.length > 0 ? Math.min(...profitsPerShare) : 0,
    total_days: uniqueDates.size,
  };
}

/**
 * 日次統計を計算
 */
function calculateDailyStats(records: BacktestRecord[]): DailyStats[] {
  const groupedByDate = new Map<string, BacktestRecord[]>();

  records.forEach(record => {
    const date = record.backtest_date;
    if (!groupedByDate.has(date)) {
      groupedByDate.set(date, []);
    }
    groupedByDate.get(date)!.push(record);
  });

  const dailyStats: DailyStats[] = [];

  groupedByDate.forEach((dayRecords, date) => {
    const validRecords = dayRecords.filter(r => r.phase1_return !== null);
    const winCount = validRecords.filter(r => r.phase1_win === true).length;
    const avgReturn = validRecords.length > 0
      ? validRecords.reduce((sum, r) => sum + (r.phase1_return! * 100), 0) / validRecords.length
      : 0;

    // Calculate profit per 100 shares
    const totalProfit = validRecords.reduce((sum, r) => sum + (r.profit_per_100_shares || 0), 0);

    // Top 5 stocks (by grok_rank or selection_score)
    const top5Records = dayRecords
      .filter(r => r.grok_rank !== null && r.grok_rank <= 5)
      .filter(r => r.phase1_return !== null);

    const top5WinCount = top5Records.filter(r => r.phase1_win === true).length;
    const top5AvgReturn = top5Records.length > 0
      ? top5Records.reduce((sum, r) => sum + (r.phase1_return! * 100), 0) / top5Records.length
      : 0;
    const top5TotalProfit = top5Records.reduce((sum, r) => sum + (r.profit_per_100_shares || 0), 0);

    dailyStats.push({
      date,
      win_rate: validRecords.length > 0 ? (winCount / validRecords.length) * 100 : 0,
      avg_return: avgReturn,
      count: validRecords.length,
      total_profit_per_100: totalProfit,
      top5_total_profit_per_100: top5TotalProfit,
      top5_avg_return: top5AvgReturn,
      top5_win_rate: top5Records.length > 0 ? (top5WinCount / top5Records.length) * 100 : 0,
      cumulative_profit_per_100: 0, // Will be calculated after sorting
      cumulative_top5_profit_per_100: 0, // Will be calculated after sorting
    });
  });

  // 日付でソート
  dailyStats.sort((a, b) => a.date.localeCompare(b.date));

  // Calculate cumulative profits
  let cumulativeProfit = 0;
  let cumulativeTop5Profit = 0;
  dailyStats.forEach(stat => {
    cumulativeProfit += stat.total_profit_per_100;
    cumulativeTop5Profit += stat.top5_total_profit_per_100;
    stat.cumulative_profit_per_100 = cumulativeProfit;
    stat.cumulative_top5_profit_per_100 = cumulativeTop5Profit;
  });

  return dailyStats;
}

/**
 * トレンド分析
 */
function analyzeTrend(dailyStats: DailyStats[]): TrendAnalysis {
  if (dailyStats.length === 0) {
    return {
      trend: 'stable',
      recent_avg: 0,
      overall_avg: 0,
      change: 0,
    };
  }

  // 直近5日の平均
  const recentDays = dailyStats.slice(-5);
  const recentAvg = recentDays.length > 0
    ? recentDays.reduce((sum, d) => sum + d.avg_return, 0) / recentDays.length
    : 0;

  // 全期間の平均
  const overallAvg = dailyStats.reduce((sum, d) => sum + d.avg_return, 0) / dailyStats.length;

  const change = overallAvg !== 0 ? ((recentAvg - overallAvg) / Math.abs(overallAvg)) * 100 : 0;

  let trend: 'improving' | 'declining' | 'stable' = 'stable';
  if (change > 10) {
    trend = 'improving';
  } else if (change < -10) {
    trend = 'declining';
  }

  return {
    trend,
    recent_avg: recentAvg,
    overall_avg: overallAvg,
    change,
  };
}

/**
 * アラート生成
 */
function generateAlerts(
  overallStats: BacktestStats,
  top5Stats: Top5Stats,
  trendAnalysis: TrendAnalysis
): Alert[] {
  const alerts: Alert[] = [];

  // 勝率アラート
  if (overallStats.win_rate < 40) {
    alerts.push({
      type: 'danger',
      title: '⚠️ 勝率が低下しています',
      message: `現在の勝率: ${overallStats.win_rate.toFixed(1)}%。戦略の見直しを検討してください。`,
      action: '戦略を見直す',
    });
  } else if (overallStats.win_rate >= 60) {
    alerts.push({
      type: 'success',
      title: '✅ 高い勝率を維持',
      message: `現在の勝率: ${overallStats.win_rate.toFixed(1)}%。戦略は順調です。`,
    });
  }

  // トレンドアラート
  if (trendAnalysis.trend === 'declining') {
    alerts.push({
      type: 'warning',
      title: '📉 パフォーマンスが低下傾向',
      message: `直近5日の平均リターン: ${trendAnalysis.recent_avg.toFixed(2)}%（全期間: ${trendAnalysis.overall_avg.toFixed(2)}%）`,
      action: '様子見を推奨',
    });
  } else if (trendAnalysis.trend === 'improving') {
    alerts.push({
      type: 'success',
      title: '📈 パフォーマンスが改善中',
      message: `直近5日の平均リターン: ${trendAnalysis.recent_avg.toFixed(2)}%（全期間: ${trendAnalysis.overall_avg.toFixed(2)}%）`,
    });
  }

  // Top5推奨アラート
  if (top5Stats.outperformance > 0.5) {
    alerts.push({
      type: 'success',
      title: '⭐ Top5銘柄への絞り込みを推奨',
      message: `Top5は全体より平均${top5Stats.outperformance.toFixed(2)}%高いリターンを記録しています。`,
      action: 'Top5のみにトレード',
    });
  }

  // サンプルサイズアラート
  if (overallStats.valid_count < 10) {
    alerts.push({
      type: 'warning',
      title: '📊 データが不足しています',
      message: `有効なバックテスト結果: ${overallStats.valid_count}件。統計的な信頼性を高めるため、より多くのデータが必要です。`,
    });
  }

  return alerts;
}

export async function GET() {
  try {
    const now = Date.now();

    // キャッシュが有効ならそれを返す
    if (cachedData && (now - cacheTimestamp < CACHE_TTL)) {
      console.log('[backtest-dashboard] Returning cached data');
      return NextResponse.json(cachedData);
    }

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

    if (!API_BASE) {
      console.error('[backtest-dashboard] NEXT_PUBLIC_API_BASE_URL is not set');
      return NextResponse.json(
        { error: 'API_BASE_URL is not configured' },
        { status: 500 }
      );
    }

    // バックテストアーカイブデータを取得
    const url = `${API_BASE}/grok_backtest_archive`;
    console.log(`[backtest-dashboard] Fetching from: ${url}`);

    const response = await fetch(url, {
      next: { revalidate: 300 } // 5分キャッシュ
    });

    if (!response.ok) {
      console.error(`[backtest-dashboard] API returned ${response.status}`);

      if (response.status === 404) {
        // データがまだない場合は空のダッシュボードを返す
        return NextResponse.json({
          overall_stats: {
            total_count: 0,
            valid_count: 0,
            win_count: 0,
            lose_count: 0,
            win_rate: 0,
            avg_return: 0,
            median_return: 0,
            std_return: 0,
            best_return: 0,
            worst_return: 0,
            avg_profit_per_100_shares: 0,
            total_profit_per_100_shares: 0,
            best_profit_per_100_shares: 0,
            worst_profit_per_100_shares: 0,
            total_days: 0,
          },
          top5_stats: {
            total_count: 0,
            valid_count: 0,
            win_count: 0,
            lose_count: 0,
            win_rate: 0,
            avg_return: 0,
            median_return: 0,
            std_return: 0,
            best_return: 0,
            worst_return: 0,
            avg_profit_per_100_shares: 0,
            total_profit_per_100_shares: 0,
            best_profit_per_100_shares: 0,
            worst_profit_per_100_shares: 0,
            total_days: 0,
            outperformance: 0,
            outperformance_profit_per_100_shares: 0,
          },
          daily_stats: [],
          recent_records: [],
          trend_analysis: {
            trend: 'stable',
            recent_avg: 0,
            overall_avg: 0,
            change: 0,
          },
          alerts: [{
            type: 'warning',
            title: 'データが生成されていません',
            message: 'バックテストデータはまだ生成されていません。次回の実行をお待ちください。',
          }],
        } as DashboardData);
      }

      return NextResponse.json(
        { error: `API returned ${response.status}` },
        { status: response.status }
      );
    }

    const allRecords: BacktestRecord[] = await response.json();
    console.log(`[backtest-dashboard] Fetched ${allRecords.length} records`);

    // 全体統計
    const overallStats = calculateStats(allRecords);

    // Top5統計
    const top5Records = allRecords.filter(r => r.grok_rank !== null && r.grok_rank <= 5);
    const top5StatsBase = calculateStats(top5Records);
    const top5Stats: Top5Stats = {
      ...top5StatsBase,
      outperformance: top5StatsBase.avg_return - overallStats.avg_return,
      outperformance_profit_per_100_shares: top5StatsBase.avg_profit_per_100_shares - overallStats.avg_profit_per_100_shares,
    };

    // 日次統計
    const dailyStats = calculateDailyStats(allRecords);

    // トレンド分析
    const trendAnalysis = analyzeTrend(dailyStats);

    // アラート生成
    const alerts = generateAlerts(overallStats, top5Stats, trendAnalysis);

    // 直近のレコード（最新10件）
    const recentRecords = allRecords
      .sort((a, b) => b.backtest_date.localeCompare(a.backtest_date))
      .slice(0, 10);

    const dashboardData: DashboardData = {
      overall_stats: overallStats,
      top5_stats: top5Stats,
      daily_stats: dailyStats,
      recent_records: recentRecords,
      trend_analysis: trendAnalysis,
      alerts,
    };

    // キャッシュに保存
    cachedData = dashboardData;
    cacheTimestamp = now;

    console.log(`[backtest-dashboard] Dashboard data generated successfully`);
    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('[backtest-dashboard] Error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
