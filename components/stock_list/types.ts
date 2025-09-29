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
