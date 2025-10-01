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
