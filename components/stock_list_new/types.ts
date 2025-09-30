// components/stock_list/types.ts

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

export type Row = StockMeta & {
  // 価格タブ
  date: string | null;
  close: number | null;
  prevClose: number | null;
  diff: number | null;
  volume: number | null;
  vol_ma10: number | null;
  // パフォーマンス
  r_5d: number | null;
  r_1mo: number | null;
  r_3mo: number | null;
  r_ytd: number | null;
  r_1y: number | null;
  r_5y: number | null;
  r_all: number | null;
};
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
  | "r_5y"
  | "r_all";

export interface SortSpec<K extends string> {
  key: K;
  dir: SortDir;
}
