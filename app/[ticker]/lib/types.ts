// app/[ticker]/lib/types.ts

export type RatingLabel5 = "強い買い" | "買い" | "中立" | "売り" | "強い売り";
export type RatingLabel3 = "買い" | "中立" | "売り" | "データなし";

export type VoteEntry = { score: number; label: RatingLabel5 };

export type DecisionItem = {
  ticker: string;
  date: string;
  values: {
    rsi14: number | null;
    macd_hist: number | null;
    percent_b: number | null; // APIは percent_b
    sma25_dev_pct: number | null;
  };
  votes: Record<string, VoteEntry>; // ma, ichimoku など含む
  overall: VoteEntry;
};

export type PriceRow = {
  date: string; // ISO
  ticker: string;
  Open: number | null;
  High: number | null;
  Low: number | null;
  Close: number | null;
};

export type IchimokuDetail = {
  lastClose: number;
  tenkan: number;
  kijun: number;
  spanA: number;
  spanB: number;
  cloudTop: number;
  cloudBot: number;
  chikou: number | null; // 26本前の終値
};

export type Meta = {
  code: string;
  stock_name: string;
  ticker: string;
  sectors?: string | null;
  series?: string | null;
  market?: string | null;
};

export type Snapshot = {
  ticker: string;
  date: string | null;
  close: number | null;
  prevClose: number | null;
  diff: number | null;
  volume?: number | null;
  vol_ma10?: number | null;
  tr?: number | null;
  tr_pct?: number | null;
  atr14?: number | null;
  atr14_pct?: number | null;
};

// For TechnicalSummary
export type TechDecisionVotes = Record<string, VoteEntry>;

export type TechDecisionItem = {
  ticker: string;
  date: string; // YYYY-MM-DD
  votes: TechDecisionVotes; 
  overall: VoteEntry;
};

export type LegacyRow = {
  ticker: string;
  stock_name: string;
  code: string;
  date: string | null;
  overall_rating: RatingLabel5;
  tech_rating: RatingLabel5;
  ma_rating: RatingLabel5;
  ichimoku_rating: RatingLabel5;
};

export type Counts3 = { sell: number; neutral: number; buy: number };
