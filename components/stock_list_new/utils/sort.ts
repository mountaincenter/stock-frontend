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
  | "code"
  | "stock_name"
  | "date"
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
  tooltip?: {
    description: string;
    formula?: string;
  };
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

const perfValue = (row: Row, key: PerfSortKey): number | string => {
  switch (key) {
    case "code":
    case "stock_name":
      return row[key] ?? "";
    case "date":
      return parseDate(row.date ?? null);
    case "r_5d":
    case "r_1mo":
    case "r_3mo":
    case "r_ytd":
    case "r_1y":
    case "r_3y":
    case "r_5y":
    case "r_all":
      return typeof row[key] === "number" ? (row[key] as number) : Number.NaN;
    default:
      return Number.NaN;
  }
};

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
  { key: "date", label: "日付", align: "center", tooltip: { description: "価格データの日付（東証取引日）" } },
  {
    key: "close",
    label: "終値",
    align: "right",
    tooltip: {
      description: "東証大引け15:30時点の終値",
      formula: "Close"
    }
  },
  {
    key: "diff",
    label: "前日差",
    align: "right",
    tooltip: {
      description: "前営業日終値からの価格差",
      formula: "今日の終値 - 前営業日の終値"
    }
  },
  {
    key: "pct_diff",
    label: "前日差(%)",
    align: "right",
    tooltip: {
      description: "前営業日終値からの変化率（パーセント）",
      formula: "(今日の終値 - 前営業日の終値) / 前営業日の終値 × 100"
    }
  },
  {
    key: "tr",
    label: "TR",
    align: "right",
    tooltip: {
      description: "真の値幅（True Range）- 本日のボラティリティを表す指標",
      formula: "max(高値-安値, |高値-前日終値|, |安値-前日終値|)"
    }
  },
  {
    key: "tr_pct",
    label: "TR(%)",
    align: "right",
    tooltip: {
      description: "真の値幅を株価で割った割合（ボラティリティ%）",
      formula: "TR / 前日終値 × 100"
    }
  },
  {
    key: "atr14",
    label: "ATR14",
    align: "right",
    tooltip: {
      description: "平均真の値幅（Average True Range 14日）- 過去14日間のボラティリティ平均",
      formula: "TRの14日間指数移動平均（EMA）"
    }
  },
  {
    key: "atr14_pct",
    label: "ATR14(%)",
    align: "right",
    tooltip: {
      description: "ATR14を株価で割った割合（平均ボラティリティ%）",
      formula: "ATR14 / 終値 × 100"
    }
  },
  {
    key: "volume",
    label: "出来高",
    align: "right",
    tooltip: {
      description: "当日の売買高（取引された株数）",
      formula: "Volume"
    }
  },
  {
    key: "vol_ma10",
    label: "出来高(10)",
    align: "right",
    tooltip: {
      description: "出来高の10日移動平均",
      formula: "過去10日間の出来高の平均"
    }
  },
];

export const PERF_SORT_COLUMNS: SortableColumn<PerfSortKey>[] = [
  {
    key: "r_5d",
    label: "1週",
    align: "right",
    tooltip: {
      description: "過去5営業日（約1週間）のリターン",
      formula: "(現在価格 / 5営業日前価格 - 1) × 100"
    }
  },
  {
    key: "r_1mo",
    label: "1ヶ月",
    align: "right",
    tooltip: {
      description: "過去30日（約1ヶ月）のリターン",
      formula: "(現在価格 / 30日前価格 - 1) × 100"
    }
  },
  {
    key: "r_3mo",
    label: "3ヶ月",
    align: "right",
    tooltip: {
      description: "過去90日（約3ヶ月）のリターン",
      formula: "(現在価格 / 90日前価格 - 1) × 100"
    }
  },
  {
    key: "r_ytd",
    label: "年初来",
    align: "right",
    tooltip: {
      description: "今年の1月1日以降のリターン",
      formula: "(現在価格 / 年初価格 - 1) × 100"
    }
  },
  {
    key: "r_1y",
    label: "1年",
    align: "right",
    tooltip: {
      description: "過去1年間（365日）のリターン",
      formula: "(現在価格 / 365日前価格 - 1) × 100"
    }
  },
  {
    key: "r_3y",
    label: "3年",
    align: "right",
    tooltip: {
      description: "過去3年間（1095日）のリターン",
      formula: "(現在価格 / 3年前価格 - 1) × 100"
    }
  },
  {
    key: "r_5y",
    label: "5年",
    align: "right",
    tooltip: {
      description: "過去5年間（1825日）のリターン",
      formula: "(現在価格 / 5年前価格 - 1) × 100"
    }
  },
  {
    key: "r_all",
    label: "全期間",
    align: "right",
    tooltip: {
      description: "データ取得開始時点からの全期間リターン",
      formula: "(現在価格 / 最初の価格 - 1) × 100"
    }
  },
];

export const TECH_SORT_COLUMNS: SortableColumn<TechSortKey>[] = [
  {
    key: "overall_rating",
    label: "総合",
    align: "center",
    tooltip: {
      description: "全テクニカル指標を総合した売買判定（強い買い/買い/中立/売り/強い売り）"
    }
  },
  {
    key: "tech_rating",
    label: "Tech",
    align: "center",
    tooltip: {
      description: "テクニカル指標（RSI, MACD, ボリンジャー等）の総合判定"
    }
  },
  {
    key: "ma_rating",
    label: "MA",
    align: "center",
    tooltip: {
      description: "移動平均線（Moving Average）の売買判定 - トレンド方向を示す"
    }
  },
  {
    key: "ichimoku_rating",
    label: "一目",
    align: "center",
    tooltip: {
      description: "一目均衡表の売買判定 - 雲・転換線・基準線・遅行スパンから総合判断"
    }
  },
  {
    key: "rsi14",
    label: "RSI(14)",
    align: "right",
    tooltip: {
      description: "相対力指数（Relative Strength Index 14日）- 買われすぎ/売られすぎを判定",
      formula: "0〜100の範囲。30以下=売られすぎ、70以上=買われすぎ"
    }
  },
  {
    key: "macd_hist",
    label: "MACD Hist",
    align: "right",
    tooltip: {
      description: "MACDヒストグラム - トレンドの強さと転換点を示す",
      formula: "MACD線 - シグナル線。正=上昇トレンド、負=下降トレンド"
    }
  },
  {
    key: "bb_percent_b",
    label: "%b",
    align: "right",
    tooltip: {
      description: "ボリンジャーバンド内での価格位置 - ボラティリティと相対位置を判定",
      formula: "(価格 - 下限) / (上限 - 下限)。0=下限、0.5=中心、1=上限"
    }
  },
  {
    key: "sma25_dev_pct",
    label: "乖離%(25)",
    align: "right",
    tooltip: {
      description: "25日単純移動平均からの乖離率 - トレンドからの乖離度を示す",
      formula: "(価格 - SMA25) / SMA25 × 100"
    }
  },
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
