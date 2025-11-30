// types/grok-analysis.ts
/**
 * Grok推奨銘柄詳細分析データの型定義
 */

export interface PhaseStats {
  phase: string;
  winRate: number;
  avgReturn: number;
  medianReturn: number;
  winCount: number;
  loseCount: number;
}

export interface CategoryStats {
  category: string;
  total: number;
  winCount: number;
  winRate: number;
  avgReturn: number;
  medianReturn: number;
  stdDev: number;
  avgMaxGain: number;
  avgMaxLoss: number;
}

export interface RankStats {
  rank: number;
  total: number;
  winCount: number;
  winRate: number;
  avgReturn: number;
}

export interface RiskStats {
  winCount: number;
  loseCount: number;
  winRate: number;
  avgWinReturn: number;
  avgLossReturn: number;
  maxGain: number;
  maxLoss: number;
  avgMaxGain: number;
  avgMaxLoss: number;
  riskRewardRatio: number;
  sharpeRatio: number;
  avgReturn: number;
  stdDev: number;
}

export interface VolatilityGroup {
  group: string;
  total: number;
  winCount: number;
  winRate: number;
  avgReturn: number;
  avgVolatility: number;
  avgMaxGain: number;
  avgMaxLoss: number;
}

export interface VolatilityStats {
  groups: VolatilityGroup[];
  corrVolatilityReturn: number;
  corrVolatilityWin: number;
}

export interface PrevDayStats {
  direction: string;
  count: number;
  phase1WinRate: number;
  phase2WinRate: number;
  phase1AvgReturn: number;
  phase2AvgReturn: number;
}

export interface DailyStats {
  date: string;
  phase1AvgReturn: number;
  phase2AvgReturn: number;
  phase3AvgReturn: number;
  count: number;
}

export interface Metadata {
  totalStocks: number;
  uniqueStocks: number;
  dateRange: {
    start: string;
    end: string;
  };
  generatedAt: string;
}

export interface RecommendationActionStats {
  action: 'buy' | 'sell' | 'hold';
  total: number;
  winCount: number;
  loseCount: number;
  winRate: number;
  avgReturn: number;
  medianReturn: number;
}

export interface RecommendationLatestActionStats {
  action: 'buy' | 'sell' | 'hold';
  total: number;
  winCount: number;
  winRate: number;
  avgReturn: number;
}

export interface RecommendationStockDetail {
  ticker: string;
  stockName: string;
  action: 'buy' | 'sell' | 'hold';
  grokRank: number;
  isWin: boolean;
  returnPct: number;
  profitPer100: number;
  buyPrice: number;
  sellPrice: number;
}

export interface RecommendationStats {
  summary: {
    total: number;
    buy: number;
    sell: number;
    hold: number;
  };
  actionStats: RecommendationActionStats[];
  latestStats: {
    date: string;
    total: number;
    actions: RecommendationLatestActionStats[];
    stocks: RecommendationStockDetail[];
  } | null;
}

export interface V2ActionActionStats {
  action: 'buy' | 'sell' | 'hold';
  actionJp: '買い' | '売り' | '静観';
  total: number;
  winCount: number;
  loseCount: number;
  winRate: number;
  winRateExclDraw: number;
  totalProfit: number;
  avgProfit: number;
  avgReturn: number;
}

export interface V2StockDetail {
  ticker: string;
  stockName: string;
  grokRank: number;
  prevDayClose: number;
  v2Score: number;
  v2Action: '買い' | '売り' | '静観';
  buyPrice: number;
  sellPrice: number;
  high: number;
  low: number;
  profitPer100: number;
  returnPct: number;
  isWin: boolean | null;
}

export interface V2DateActionStats {
  action: 'buy' | 'sell' | 'hold';
  actionJp: '買い' | '売り' | '静観';
  total: number;
  stocks: V2StockDetail[];
}

export interface V2DateStats {
  date: string;
  total: number;
  actions: V2DateActionStats[];
}

export interface V2ActionStats {
  summary: {
    total: number;
    buy: number;
    sell: number;
    hold: number;
  };
  actionStats: V2ActionActionStats[];
  dateStats: V2DateStats[];
  v2ScoreStats: {
    mean: number;
    median: number;
    min: number;
    max: number;
  };
}

export interface GrokAnalysisResponse {
  metadata: Metadata;
  phaseStats: PhaseStats[];
  categoryStats: CategoryStats[];
  rankStats: RankStats[];
  riskStats: RiskStats;
  volatilityStats: VolatilityStats;
  prevDayStats: PrevDayStats[] | null;
  dailyStats: DailyStats[];
  v2ActionStats: V2ActionStats | null;
  recommendationStats: RecommendationStats | null;
}

// ユーティリティ関数

/**
 * フォーマット: パーセント表示
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * フォーマット: 数値表示（小数点付き）
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

/**
 * フォーマット: 勝率の色
 */
export function getWinRateColor(winRate: number): string {
  if (winRate >= 60) return '#4CAF50'; // 緑
  if (winRate >= 50) return '#8BC34A'; // 薄緑
  if (winRate >= 40) return '#FFC107'; // 黄色
  return '#F44336'; // 赤
}

/**
 * フォーマット: リターンの色
 */
export function getReturnColor(returnValue: number): string {
  return returnValue >= 0 ? '#4CAF50' : '#F44336';
}

/**
 * リスクリワード比の評価
 */
export function evaluateRiskReward(ratio: number): string {
  if (ratio >= 2.0) return '優秀';
  if (ratio >= 1.5) return '良好';
  if (ratio >= 1.0) return '許容範囲';
  if (ratio >= 0.5) return '要改善';
  return '不良';
}

/**
 * シャープレシオの評価
 */
export function evaluateSharpe(ratio: number): string {
  if (ratio >= 1.0) return '優秀';
  if (ratio >= 0.5) return '良好';
  if (ratio >= 0.0) return '許容範囲';
  return '不良';
}

/**
 * 相関係数の解釈
 */
export function interpretCorrelation(corr: number): string {
  const abs = Math.abs(corr);
  if (abs >= 0.7) return '強い相関';
  if (abs >= 0.4) return '中程度の相関';
  if (abs >= 0.2) return '弱い相関';
  return '相関なし';
}
