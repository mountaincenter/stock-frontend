"use client";

import type { Row, TechCoreRow, RatingLabel } from "../types";

export type SortDirection = "asc" | "desc" | null;

export type PriceSortKey =
  | "code"
  | "stock_name"
  | "date"
  | "close"
  | "diff"
  | "pct_diff"
  | "tr"
  | "tr_pct"
  | "atr14"
  | "atr14_pct"
  | "volume"
  | "vol_ma10";

export type PerfSortKey =
  | "r_5d"
  | "r_1mo"
  | "r_3mo"
  | "r_ytd"
  | "r_1y"
  | "r_3y"
  | "r_5y"
  | "r_all";

export type TechSortKey =
  | "code"
  | "stock_name"
  | "date"
  | "overall_rating"
  | "tech_rating"
  | "ma_rating"
  | "ichimoku_rating"
  | "rsi14"
  | "macd_hist"
  | "bb_percent_b"
  | "sma25_dev_pct";

export type SortableColumn<K extends string> = {
  key: K;
  label: string;
  align?: "left" | "center" | "right";
};

const ratingOrder: Record<RatingLabel, number> = {
  強い売り: 0,
  売り: 1,
  中立: 2,
  買い: 3,
  強い買い: 4,
};

const parseDate = (value: string | null | undefined): number => {
  if (!value) return Number.NaN;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : Number.NaN;
};

const ratingValue = (label: RatingLabel | string | null | undefined): number =>
  ratingOrder[label as RatingLabel] ?? Number.NaN;

const compareNumber = (
  a: number,
  b: number,
  direction: Exclude<SortDirection, null>
) => {
  if (Number.isNaN(a) && Number.isNaN(b)) return 0;
  if (Number.isNaN(a)) return direction === "asc" ? 1 : -1;
  if (Number.isNaN(b)) return direction === "asc" ? -1 : 1;
  return direction === "asc" ? a - b : b - a;
};

const compareString = (
  a: string,
  b: string,
  direction: Exclude<SortDirection, null>
) => {
  const result = a.localeCompare(b, "ja");
  return direction === "asc" ? result : -result;
};

const priceValue = (row: Row, key: PriceSortKey): number | string => {
  switch (key) {
    case "code":
    case "stock_name":
      return row[key] ?? "";
    case "date":
      return parseDate(row.date ?? null);
    case "close":
    case "diff":
    case "tr":
    case "tr_pct":
    case "atr14":
    case "atr14_pct":
    case "volume":
    case "vol_ma10":
      return typeof row[key] === "number" ? (row[key] as number) : Number.NaN;
    case "pct_diff":
      return typeof row.pct_diff === "number"
        ? row.pct_diff
        : typeof row.diff === "number" &&
          typeof row.prevClose === "number" &&
          row.prevClose !== 0
        ? (row.diff / row.prevClose) * 100
        : Number.NaN;
    default:
      return Number.NaN;
  }
};

const perfValue = (row: Row, key: PerfSortKey): number =>
  typeof row[key] === "number" ? (row[key] as number) : Number.NaN;

const techValue = (row: TechCoreRow, key: TechSortKey): number | string => {
  switch (key) {
    case "code":
    case "stock_name":
      return row[key] ?? "";
    case "date":
      return parseDate(row.date ?? null);
    case "overall_rating":
    case "tech_rating":
    case "ma_rating":
    case "ichimoku_rating":
      return ratingValue(row[key]);
    case "rsi14":
    case "macd_hist":
    case "bb_percent_b":
    case "sma25_dev_pct":
      return typeof row[key] === "number"
        ? (row[key] as number)
        : Number.NaN;
    default:
      return Number.NaN;
  }
};

const applySort = <T>(
  rows: T[],
  key: string | null,
  direction: SortDirection,
  getValue: (row: T) => number | string
) => {
  if (!key || !direction) return rows;
  const comparator = (a: T, b: T) => {
    const valueA = getValue(a);
    const valueB = getValue(b);
    if (typeof valueA === "string" && typeof valueB === "string") {
      return compareString(valueA, valueB, direction);
    }
    return compareNumber(
      typeof valueA === "number" ? valueA : Number.NaN,
      typeof valueB === "number" ? valueB : Number.NaN,
      direction
    );
  };
  return [...rows].sort(comparator);
};

export const PRICE_SORT_COLUMNS: SortableColumn<PriceSortKey>[] = [
  { key: "code", label: "コード", align: "left" },
  { key: "stock_name", label: "銘柄名", align: "left" },
  { key: "date", label: "日付", align: "center" },
  { key: "close", label: "終値", align: "right" },
  { key: "diff", label: "前日差", align: "right" },
  { key: "pct_diff", label: "前日差(%)", align: "right" },
  { key: "tr", label: "TR", align: "right" },
  { key: "tr_pct", label: "TR(%)", align: "right" },
  { key: "atr14", label: "ATR14", align: "right" },
  { key: "atr14_pct", label: "ATR14(%)", align: "right" },
  { key: "volume", label: "出来高", align: "right" },
  { key: "vol_ma10", label: "出来高(10)", align: "right" },
];

export const PERF_SORT_COLUMNS: SortableColumn<PerfSortKey>[] = [
  { key: "r_5d", label: "1週", align: "right" },
  { key: "r_1mo", label: "1ヶ月", align: "right" },
  { key: "r_3mo", label: "3ヶ月", align: "right" },
  { key: "r_ytd", label: "年初来", align: "right" },
  { key: "r_1y", label: "1年", align: "right" },
  { key: "r_3y", label: "3年", align: "right" },
  { key: "r_5y", label: "5年", align: "right" },
  { key: "r_all", label: "全期間", align: "right" },
];

export const TECH_SORT_COLUMNS: SortableColumn<TechSortKey>[] = [
  { key: "overall_rating", label: "総合", align: "center" },
  { key: "tech_rating", label: "Tech", align: "center" },
  { key: "ma_rating", label: "MA", align: "center" },
  { key: "ichimoku_rating", label: "一目", align: "center" },
  { key: "rsi14", label: "RSI(14)", align: "right" },
  { key: "macd_hist", label: "MACD Hist", align: "right" },
  { key: "bb_percent_b", label: "%b", align: "right" },
  { key: "sma25_dev_pct", label: "乖離%(25)", align: "right" },
];

export const sortPriceRows = (
  rows: Row[],
  key: PriceSortKey | null,
  direction: SortDirection
): Row[] =>
  applySort(rows, key, direction, (row) => priceValue(row, key ?? "code"));

export const sortPerfRows = (
  rows: Row[],
  key: PerfSortKey | null,
  direction: SortDirection
): Row[] =>
  applySort(rows, key, direction, (row) => perfValue(row, key ?? "r_5d"));

export const sortTechRows = (
  rows: TechCoreRow[],
  key: TechSortKey | null,
  direction: SortDirection
): TechCoreRow[] =>
  applySort(rows, key, direction, (row) => techValue(row, key ?? "code"));

export const nextSortDirection = (
  current: SortDirection,
  requested: SortDirection
): SortDirection => {
  if (current === requested) {
    return null;
  }
  return requested;
};
