// components/stock_list_new/types.ts

export interface StockMeta {
  code: string;
  stock_name: string;
  ticker: string;
}

export interface SnapshotRow {
  ticker: string;
  date: string | null;
  close: number | null;
  prevClose: number | null;
  diff: number | null;
  volume?: number | null;
  vol_ma10?: number | null;
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
}

// 共通ユーティリティ型（計算可能な「欠損許容」数値）
export type MaybeNumber = number | null;

// パフォーマンスキーを一元管理（3y を追加）
export type PerfKey =
  | "r_5d"
  | "r_1mo"
  | "r_3mo"
  | "r_ytd"
  | "r_1y"
  | "r_3y" // ← 追加
  | "r_5y"
  | "r_all";

// 将来の拡張に強い表現（Record で束ねる）
export type PerfMap = Record<PerfKey, MaybeNumber>;

export type Row = StockMeta & {
  // 価格タブ
  date: string | null;
  close: MaybeNumber;
  prevClose: MaybeNumber;
  diff: MaybeNumber;
  volume: MaybeNumber;
  vol_ma10: MaybeNumber;
} & PerfMap;

// ソート関連
export type SortDir = "asc" | "desc";

export type PriceSortKey =
  | "code"
  | "stock_name"
  | "close"
  | "diff"
  | "pct_diff"
  | "volume"
  | "vol_ma10";

// 3y を追加
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

export interface SortSpec<K extends string> {
  key: K;
  dir: SortDir;
}

/* =========================
   テクニカル（事実のみ4指標 + 評価4カラム）
   - RSI(14): 0–100（数値）
   - MACD Hist(12,26,9): 実数（0基準）
   - %b (BB 20,2σ): 0–1（数値）
   - SMA25 乖離%: 実数（%）
   - 評価（日本語5段階）: テクニカル / MA / 一目 / 総合
     「強い買い」「買い」「中立」「売り」「強い売り」
   ========================= */

// コア4指標のキー（モバイル/デスクトップ共通の最小集合）
export type TechCoreKey =
  | "rsi14"
  | "macd_hist"
  | "bb_percent_b"
  | "sma25_dev_pct";

export type TechCoreMap = Record<TechCoreKey, MaybeNumber>;

// 5段階評価（日本語）
export type RatingLabel = "強い買い" | "買い" | "中立" | "売り" | "強い売り";

// 評価4カラム
export interface TechRatings {
  tech_rating: RatingLabel; // テクニカル合成（RSI/%b/MACD/乖離）
  ma_rating: RatingLabel; // 移動平均（位置+クロス）
  ichimoku_rating: RatingLabel; // 一目均衡表
  overall_rating: RatingLabel; // 総合（単純平均丸め）
}

// 1銘柄の直近スナップショット（一覧表示用）
export type TechCoreRow = StockMeta & {
  date: string | null; // YYYY-MM-DD など
} & TechCoreMap &
  TechRatings;

// 並び替えキー（テーブル用）
export type TechCoreSortKey = "code" | "stock_name" | "date" | TechCoreKey;

/* デスクトップ版の初期実装はコア4指標と同一スキーマで開始。
   以後、CCI/ストキャス/ADX/一目数値化を追加する際は
   - TechDesktopKey を拡張
   - TechDesktopRow/SortKey を追補
   とする（既存は不変）。 */

export type TechDesktopKey = TechCoreKey;

export type TechDesktopRow = TechCoreRow;

export type TechDesktopSortKey =
  | "code"
  | "stock_name"
  | "date"
  | TechDesktopKey;
