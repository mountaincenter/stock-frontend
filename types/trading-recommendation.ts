/**
 * Trading Recommendation API Types
 * @version 1.0
 */

/**
 * メインレスポンス型
 */
export interface TradingRecommendationResponse {
  version: string;
  generatedAt: string; // ISO 8601 format
  dataSource: DataSource;
  summary: Summary;
  warnings?: string[];
  stocks: Stock[];
  scoringRules?: ScoringRules;
}

/**
 * データソース情報
 */
export interface DataSource {
  backtestCount: number;
  backtestPeriod: {
    start: string; // YYYY-MM-DD
    end: string; // YYYY-MM-DD
  };
  technicalDataDate: string; // YYYY-MM-DD
}

/**
 * サマリー情報
 */
export interface Summary {
  total: number;
  buy: number;
  sell: number;
  hold: number;
}

/**
 * 銘柄情報
 */
export interface Stock {
  ticker: string;
  stockName: string;
  grokRank: number;
  technicalData: TechnicalData;
  recommendation: Recommendation;
  deepAnalysis?: DeepAnalysis;
  categories: string[];
}

/**
 * テクニカルデータ
 */
export interface TechnicalData {
  prevClose?: number | null;
  prevDayChangePct: number | null;
  atr: ATR;
  volume?: number | null;
  volatilityLevel: '低ボラ' | '中ボラ' | '高ボラ';
}

/**
 * ATR情報
 */
export interface ATR {
  value: number | null;
  level: 'low' | 'medium' | 'high';
}

/**
 * 売買推奨
 */
export interface Recommendation {
  action: 'buy' | 'sell' | 'hold';
  score: number; // -100 ~ +100 (v2_1_score)
  confidence: 'high' | 'medium' | 'low';
  stopLoss: StopLoss;
  reasons: Reason[];
  // v2_0_3 情報（比較用）
  v2_0_3_action?: 'buy' | 'sell' | 'hold';
  v2_0_3_score?: number;
  v2_0_3_reasons?: string;
}

/**
 * 損切りライン
 */
export interface StopLoss {
  percent: number;
  calculation: string;
}

/**
 * 判断理由
 */
export interface Reason {
  type: 'grok_rank' | 'prev_day_change' | 'volatility' | 'category' | 'deep_analysis';
  description: string;
  impact: number;
}

/**
 * 深掘り分析
 */
export interface DeepAnalysis {
  v2Score?: number;
  finalScore?: number;
  scoreAdjustment?: number;
  recommendation?: string;
  confidence?: string;
  verdict?: string;
  adjustmentReasons?: string[];
  risks?: string[];
  opportunities?: string[];
  latestNews?: string[];
  sectorTrend?: string;
  marketSentiment?: 'positive' | 'neutral' | 'negative' | 'very_negative';
  newsHeadline?: string;
  // 旧フィールド（互換性維持）
  fundamentals?: Fundamentals;
  riskFactors?: string[];
  specialNotes?: string[];
}

/**
 * ファンダメンタルズ情報
 */
export interface Fundamentals {
  operatingProfitGrowth?: number;
  eps?: number;
  epsNote?: string;
  nextEarningsDate?: string; // ISO 8601 format
}

/**
 * スコアリングルール
 */
export interface ScoringRules {
  grokRank: {
    high: RankRule;
    medium: RankRule;
    low: RankRule;
    veryLow: RankRule & { avgReturn: number };
  };
  prevDayChange: {
    negative: ChangeRule;
    positiveWithLowRank: ChangeRule & { condition: string };
  };
  volatility: {
    low: VolatilityRule;
    high: VolatilityRule;
  };
  actionThresholds: {
    buy: number;
    sell: number;
  };
  stopLoss: {
    buy: StopLossRule;
    sell: StopLossRule;
  };
}

/**
 * ランクルール
 */
export interface RankRule {
  ranks: number[];
  score: number;
  winRate: number;
}

/**
 * 変化率ルール
 */
export interface ChangeRule {
  score: number;
  reason: string;
}

/**
 * ボラティリティルール
 */
export interface VolatilityRule {
  score: number;
  threshold: number;
}

/**
 * 損切りルール
 */
export interface StopLossRule {
  formula: string;
  min: number;
  max: number;
}

/**
 * エラーレスポンス
 */
export interface ErrorResponse {
  error: {
    code: 'NOT_FOUND' | 'INTERNAL_ERROR';
    message: string;
    details?: string;
  };
}

/**
 * Type Guards
 */

export function isErrorResponse(response: unknown): response is ErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response &&
    typeof (response as ErrorResponse).error === 'object'
  );
}

export function isTradingRecommendationResponse(
  response: unknown
): response is TradingRecommendationResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'version' in response &&
    'stocks' in response &&
    Array.isArray((response as TradingRecommendationResponse).stocks)
  );
}

/**
 * Utility Types
 */

export type ActionType = Recommendation['action'];
export type ConfidenceLevel = Recommendation['confidence'];
export type VolatilityLevel = TechnicalData['volatilityLevel'];
export type ReasonType = Reason['type'];

/**
 * Filter Helpers
 */

export function filterByAction(stocks: Stock[], action: ActionType): Stock[] {
  return stocks.filter((s) => s.recommendation.action === action);
}

export function sortByScore(stocks: Stock[], ascending = false): Stock[] {
  return [...stocks].sort((a, b) =>
    ascending
      ? a.recommendation.score - b.recommendation.score
      : b.recommendation.score - a.recommendation.score
  );
}

export function filterByConfidence(
  stocks: Stock[],
  confidence: ConfidenceLevel
): Stock[] {
  return stocks.filter((s) => s.recommendation.confidence === confidence);
}

export function filterWithDeepAnalysis(stocks: Stock[]): Stock[] {
  return stocks.filter((s) => s.deepAnalysis !== undefined);
}

export function getBuyStocks(stocks: Stock[]): Stock[] {
  return filterByAction(stocks, 'buy');
}

export function getSellStocks(stocks: Stock[]): Stock[] {
  return filterByAction(stocks, 'sell');
}

export function getHoldStocks(stocks: Stock[]): Stock[] {
  return filterByAction(stocks, 'hold');
}

export function getHighConfidenceStocks(stocks: Stock[]): Stock[] {
  return filterByConfidence(stocks, 'high');
}

/**
 * Formatting Helpers
 */

export function formatStopLoss(stopLoss: StopLoss): string {
  return `${stopLoss.percent.toFixed(1)}%`;
}

export function formatScore(score: number): string {
  return score >= 0 ? `+${score}` : `${score}`;
}

export function formatPercent(value: number | null, decimals = 2): string {
  if (value === null) return 'N/A';
  return `${value.toFixed(decimals)}%`;
}

export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A';
  return `${value.toLocaleString('ja-JP')}円`;
}

export function getActionColor(action: ActionType): string {
  switch (action) {
    case 'buy':
      return '#4CAF50';
    case 'sell':
      return '#F44336';
    case 'hold':
      return '#FF9800';
  }
}

export function getActionLabel(action: ActionType): string {
  switch (action) {
    case 'buy':
      return '買い';
    case 'sell':
      return '売り';
    case 'hold':
      return '静観';
  }
}

export function getConfidenceLabel(confidence: ConfidenceLevel): string {
  switch (confidence) {
    case 'high':
      return '高';
    case 'medium':
      return '中';
    case 'low':
      return '低';
  }
}
