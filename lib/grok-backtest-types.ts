// lib/grok-backtest-types.ts
/**
 * GROKバックテストデータの型定義
 */

export interface BacktestRecord {
  ticker: string;
  stock_name: string;
  selection_score: number | null;
  grok_rank: number | null;
  reason: string;
  selected_time: string;
  backtest_date: string;
  buy_price: number | null;
  sell_price: number | null;
  phase1_return: number | null;
  phase1_win: boolean | null;
}

export interface BacktestStats {
  total_count: number;
  valid_count: number;
  win_count: number;
  lose_count: number;
  win_rate: number;
  avg_return: number;
  median_return: number;
  std_return: number;
  best_return: number;
  worst_return: number;
}

export interface Top5Stats extends BacktestStats {
  outperformance: number; // Top5の平均リターン - 全体の平均リターン
}

export interface DailyStats {
  date: string;
  win_rate: number;
  avg_return: number;
  count: number;
}

export interface TrendAnalysis {
  trend: 'improving' | 'declining' | 'stable';
  recent_avg: number; // 直近5日の平均リターン
  overall_avg: number; // 全期間の平均リターン
  change: number; // 変化率
}

export interface Alert {
  type: 'success' | 'warning' | 'danger';
  title: string;
  message: string;
  action?: string;
}

export interface DashboardData {
  overall_stats: BacktestStats;
  top5_stats: Top5Stats;
  daily_stats: DailyStats[];
  recent_records: BacktestRecord[];
  trend_analysis: TrendAnalysis;
  alerts: Alert[];
}
