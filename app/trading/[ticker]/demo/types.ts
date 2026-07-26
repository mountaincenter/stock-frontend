export type Decision = "buy" | "sell" | "wait";

export interface ReplayCaseSummary {
  id: string;
  ticker: string;
  name: string;
  date: string;
  cutoff: string;
}

export interface DailyBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma25: number | null;
  sma75: number | null;
  sma200: number | null;
  bb_mid: number | null;
  bb_upper: number | null;
  bb_lower: number | null;
  rsi14: number | null;
  macd: number | null;
  macd_signal: number | null;
  macd_hist: number | null;
}

export interface IntradayBar {
  datetime: string;
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap: number | null;
  sma5: number | null;
  sma20: number | null;
  bb_mid: number | null;
  bb_upper: number | null;
  bb_lower: number | null;
  rsi14: number | null;
  macd: number | null;
  macd_signal: number | null;
  macd_hist: number | null;
}

export interface TickTempoBar {
  datetime: string;
  end: string;
  time: string;
  price: number;
  trades: number;
  volume: number;
  turnover: number;
}

export interface IndicatorSnapshot {
  sma25?: number | null;
  sma75?: number | null;
  sma200?: number | null;
  vwap?: number | null;
  sma5?: number | null;
  sma20?: number | null;
  bb_mid?: number | null;
  bb_upper?: number | null;
  bb_lower?: number | null;
  rsi14?: number | null;
  macd?: number | null;
  macd_signal?: number | null;
  macd_hist?: number | null;
}

export interface DailyContext {
  previousDate: string;
  previousClose: number;
  previousHigh: number;
  previousLow: number;
  previousVolume: number;
  averageVolume20: number;
  recentHigh20: number;
  recentLow20: number;
  sma25Slope5: number | null;
  sma75Slope5: number | null;
  sma200Slope5: number | null;
  sma25DistancePct: number | null;
  sma75DistancePct: number | null;
  sma200DistancePct: number | null;
  recentGaps: Array<{
    date: string;
    direction: "up" | "down";
    lower: number;
    upper: number;
  }>;
  indicators: IndicatorSnapshot;
}

export interface IntradayContext {
  open: number;
  firstTradeTime: string;
  lateOpen: boolean;
  lastVisiblePrice: number;
  visibleHigh: number;
  visibleLow: number;
  visibleVolume: number;
  tickTrades30sAverage: number | null;
  indicators: IndicatorSnapshot;
  marketSectorStatus: string;
}

export interface CaseListResponse {
  defaultCutoff: string;
  ticker: string | null;
  cases: ReplayCaseSummary[];
  availableTickers: string[];
}

export interface DailyStageResponse {
  case: ReplayCaseSummary;
  daily: DailyBar[];
  dailyContext: DailyContext;
}

export interface IntradayStageResponse {
  case: ReplayCaseSummary;
  intraday: IntradayBar[];
  tickTempo: TickTempoBar[];
  intradayContext: IntradayContext;
}

export interface Guidance {
  daily: Decision;
  intraday: Decision;
  pattern: string;
  lesson: string;
  rationale: string;
  invalidation: string;
  warning: string;
}

export interface SideOutcome {
  side: "buy" | "sell";
  entryPrice: number;
  entryTime: string;
  stopLevel: number;
  stopReached: boolean;
  stopTime: string | null;
  stopArrivalPrice: number | null;
  closePrice: number;
  closeTime: string;
  closePnl: number;
  mfe: number;
  mfeTime: string;
  mae: number;
  maeTime: string;
  firstProfitTime: string | null;
  plus5000Time: string | null;
  stopVsPlusOrder: "neither" | "plus-first" | "stop-first" | "same-time";
  profitIntervals: Array<{ start: string; end: string }>;
  positiveMinutes: number;
}

export interface WaitOutcome {
  referencePrice: number;
  referenceTime: string;
  maxUpPerShare: number;
  maxUp100Shares: number;
  maxUpTime: string;
  maxDownPerShare: number;
  maxDown100Shares: number;
  maxDownTime: string;
  closeChangePerShare: number;
  closeChange100Shares: number;
  closePrice: number;
  closeTime: string;
}

export interface ResultStageResponse {
  case: ReplayCaseSummary;
  decisions: {
    daily: Decision;
    intraday: Decision;
  };
  guidance: Guidance;
  fullIntraday: IntradayBar[];
  fullTickTempo: TickTempoBar[];
  outcome: SideOutcome | WaitOutcome;
}

export interface StoredAttempt {
  dailyDecision?: Decision;
  intradayDecision?: Decision;
  note?: string;
  dailyLockedAt?: string;
  intradayLockedAt?: string;
  revealedAt?: string;
}
