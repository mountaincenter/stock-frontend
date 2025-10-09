// components/stock_list_new/types.ts

export interface StockMeta {
  code: string;
  stock_name: string;
  ticker: string;
  market?: string | null;
  sectors?: string | null;
  series?: string | null;
  topixnewindexseries?: string | null;
  tag1?: string | null;
  tag2?: string | null;
  tag3?: string | null;
}

export interface SnapshotRow {
  ticker: string;
  date: string | null;
  close: number | null;
  prevClose: number | null;
  diff: number | null;
  volume?: number | null;
  vol_ma10?: number | null;
  // 追加: 1日ボラ(TR)とATR(14)
  tr?: number | null;
  tr_pct?: number | null;
  atr14?: number | null;
  atr14_pct?: number | null;
}

export interface PerfRow {
  ticker: string;
  date: string; // YYYY-MM-DD
  [key: string]: string | number | null;
}

export type FetchState = "idle" | "loading" | "success" | "error";

export interface Props {
  apiBase?: string;
  initialMeta?: StockMeta[];
  initialSnapshot?: SnapshotRow[];
  initialPerf?: PerfRow[];
  initialTag?: string;
}

// 共通ユーティリティ型（計算可能な「欠損許容」数値）
export type MaybeNumber = number | null;

// パフォーマンスキー（3y を含む）
export type PerfKey =
  | "r_5d"
  | "r_1mo"
  | "r_3mo"
  | "r_ytd"
  | "r_1y"
  | "r_3y"
  | "r_5y"
  | "r_all";

export type PerfMap = Record<PerfKey, MaybeNumber>;

export type Row = StockMeta & {
  // 価格タブ
  date: string | null;
  close: MaybeNumber;
  prevClose: MaybeNumber;
  diff: MaybeNumber;
  pct_diff?: MaybeNumber;
  volume: MaybeNumber;
  vol_ma10: MaybeNumber;
  tr: MaybeNumber;
  tr_pct: MaybeNumber;
  atr14: MaybeNumber;
  atr14_pct: MaybeNumber;
} & PerfMap;

// ソート関連（現状で使用しているキーのみ）
export type SortDir = "asc" | "desc";
export type PriceSortKey =
  | "code"
  | "stock_name"
  | "close"
  | "diff"
  | "pct_diff"
  | "volume"
  | "vol_ma10";

export type PerfSortKey =
  | "code"
  | "stock_name"
  | "r_5d"
  | "r_1mo"
  | "r_3mo"
  | "r_ytd"
  | "r_1y"
  | "r_3y"
  | "r_5y"
  | "r_all";

/* =========================
   テクニカル（事実のみ4指標 + 評価4カラム）
   - RSI(14)
   - MACD Hist(12,26,9)
   - %b (BB 20,2σ) ← UIでは bb_percent_b のキーで保持
   - SMA25 乖離%
   - 評価（日本語5段階）
   ========================= */

export type TechCoreKey =
  | "rsi14"
  | "macd_hist"
  | "bb_percent_b"
  | "sma25_dev_pct";

export type TechCoreMap = Record<TechCoreKey, MaybeNumber>;

export type RatingLabel = "強い買い" | "買い" | "中立" | "売り" | "強い売り";

export interface TechRatings {
  tech_rating: RatingLabel;
  ma_rating: RatingLabel;
  ichimoku_rating: RatingLabel;
  overall_rating: RatingLabel;
}

export type TechCoreRow = StockMeta & {
  date: string | null;
} & TechCoreMap &
  TechRatings;

export type TechCoreSortKey = "code" | "stock_name" | "date" | TechCoreKey;

// デスクトップ版は現状コアと同一
export type TechDesktopKey = TechCoreKey;
export type TechDesktopRow = TechCoreRow;
export type TechDesktopSortKey =
  | "code"
  | "stock_name"
  | "date"
  | TechDesktopKey;

/* =========================
   v2 判定（フロント参照用の型）
   ========================= */

export type VoteEntry = { score: number; label: RatingLabel };

export type TechDecisionValues = {
  rsi14: MaybeNumber;
  macd_hist: MaybeNumber;
  percent_b: MaybeNumber; // ← APIは percent_b 名
  sma25_dev_pct: MaybeNumber;
  roc12: MaybeNumber;
  donchian_dist_up: MaybeNumber;
  donchian_dist_dn: MaybeNumber;
  atr14_pct: MaybeNumber;
  rv20: MaybeNumber;
  er14: MaybeNumber;
  obv_slope: MaybeNumber;
  cmf20: MaybeNumber;
  vol_z20: MaybeNumber;
};

export type TechDecisionVotes = Record<string, VoteEntry>;

export type TechDecisionItem = {
  ticker: string;
  date: string; // YYYY-MM-DD
  values: TechDecisionValues;
  votes: TechDecisionVotes; // { rsi14, macd_hist, percent_b, ..., ma, ichimoku }
  overall: VoteEntry;
};
