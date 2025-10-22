// constants.ts
import type { PriceSortKey, RealtimeSortKey } from "./types";

export const PRICE_LABELS = {
  code: "コード",
  stock_name: "銘柄名",
  close: "終値",
  diff: "前日差",
  pct_diff: "前日差(%)",
  volume: "出来高",
  vol_ma10: "出来高(10)",
} as const satisfies Record<PriceSortKey, string>;

export const SIMPLE_PRICE_KEYS = [
  "close",
  "diff",
  "pct_diff",
] as const satisfies readonly PriceSortKey[];

// ★ pickLabels を fromEntries ではなく reduce で実装
export function pickLabels<
  T extends Record<string, string>,
  const K extends readonly (keyof T)[]
>(labels: T, keys: K): { [P in K[number]]: string } {
  const out = {} as { [P in K[number]]: string };
  for (const k of keys) {
    // k は K[number] として扱い、labels[k] は string（T は string 値）なのでOK
    out[k as K[number]] = labels[k];
  }
  return out;
}

export const SIMPLE_PRICE_LABELS = pickLabels(PRICE_LABELS, SIMPLE_PRICE_KEYS);

export const REALTIME_LABELS = {
  code: "コード",
  stock_name: "銘柄名",
  marketTime: "時刻",
  close: "現在値",
  diff: "前日比",
  pct_diff: "前日比%",
  open: "始値",
  high: "高値",
  low: "安値",
  volume: "出来高",
} as const satisfies Record<RealtimeSortKey, string>;
