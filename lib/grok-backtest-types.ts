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
  profit_per_100_shares: number | null; // 100株あたりの損益
  morning_high: number | null; // 前場の最高値
  morning_low: number | null; // 前場の最安値
  morning_volume: number | null; // 前場の出来高
  max_gain_pct: number | null; // 始値からの最大上昇率
  max_drawdown_pct: number | null; // 始値からの最大下落率
  prompt_version: string; // プロンプトバージョン (例: "v1_0_baseline")
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
  avg_profit_per_100_shares: number; // 100株あたりの平均利益
  total_profit_per_100_shares: number; // 100株あたりの累計利益
  best_profit_per_100_shares: number; // 100株あたりの最高利益
  worst_profit_per_100_shares: number; // 100株あたりの最低利益
  total_days: number; // 取引日数
}

export interface Top5Stats extends BacktestStats {
  outperformance: number; // Top5の平均リターン - 全体の平均リターン
  outperformance_profit_per_100_shares: number; // Top5の100株あたり平均利益 - 全体の100株あたり平均利益
}

export interface DailyStats {
  date: string;
  win_rate: number;
  avg_return: number;
  count: number;
  total_profit_per_100: number; // 100株あたりの日次損益
  top5_total_profit_per_100: number; // Top5の100株あたりの日次損益
  top5_avg_return: number; // Top5の平均リターン
  top5_win_rate: number; // Top5の勝率
  cumulative_profit_per_100: number; // 累積損益
  cumulative_top5_profit_per_100: number; // Top5累積損益
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
  available_versions?: string[]; // 利用可能なプロンプトバージョンのリスト
  current_version?: string; // 現在表示中のバージョン
}
