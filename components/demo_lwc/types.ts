export type PriceRow = {
  date: string; // intraday: "YYYY-MM-DDTHH:mm:ss", daily: "YYYY-MM-DD"
  Open: number;
  High: number;
  Low: number;
  Close: number;
  Volume?: number;
  ticker?: string;
};

export type RangeKey =
  | "1日"
  | "5日"
  | "1ヶ月"
  | "3ヶ月"
  | "6ヶ月"
  | "YTD"
  | "1年"
  | "3年"
  | "MAX";

export const RANGE_LABELS: RangeKey[] = [
  "1日",
  "5日",
  "1ヶ月",
  "3ヶ月",
  "6ヶ月",
  "YTD",
  "1年",
  "3年",
  "MAX",
];
