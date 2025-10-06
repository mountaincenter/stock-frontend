import { API_BASE, fmtDate, startOfYTD } from "./utils";
import type { RangeKey } from "./types";

/**
 * 範囲に応じて period/interval と start/end(日付のみ) を決定
 * - 1日  -> 60d/5m
 * - 5日  -> 60d/15m
 * - 1ヶ月-> max/1h
 * - 3ヶ月/6ヶ月/YTD/1年/3年/MAX -> max/1d（日足）
 * サーバ側は end=YYYY-MM-DD を翌日0:00未満で解釈するため、当日分を取りこぼさない。
 */
export function rangeConfig(
  key: RangeKey,
  today = new Date()
): {
  url: URL;
  start?: string; // MAX は undefined（全期間）
  end: string;
  label: string; // 例: "5分足" / "日足"
} {
  const end = fmtDate(today);

  if (key === "1日") {
    const start = new Date(today);
    start.setDate(start.getDate() - 1);
    const url = new URL(`${API_BASE}/demo/prices/60d/5m/3350T`);
    return { url, start: fmtDate(start), end, label: "5分足" };
  }

  if (key === "5日") {
    const start = new Date(today);
    start.setDate(start.getDate() - 5);
    const url = new URL(`${API_BASE}/demo/prices/60d/15m/3350T`);
    return { url, start: fmtDate(start), end, label: "15分足" };
  }

  if (key === "1ヶ月") {
    const start = new Date(today);
    start.setMonth(start.getMonth() - 1);
    const url = new URL(`${API_BASE}/demo/prices/max/1h/3350T`);
    return { url, start: fmtDate(start), end, label: "1時間足" };
  }

  // 以降は日足
  const url = new URL(`${API_BASE}/demo/prices/max/1d/3350T`);

  if (key === "3ヶ月") {
    const start = new Date(today);
    start.setMonth(start.getMonth() - 3);
    return { url, start: fmtDate(start), end, label: "日足" };
  }

  if (key === "6ヶ月") {
    const start = new Date(today);
    start.setMonth(start.getMonth() - 6);
    return { url, start: fmtDate(start), end, label: "日足" };
  }

  if (key === "YTD") {
    const start = startOfYTD(today);
    return { url, start: fmtDate(start), end, label: "日足" };
  }

  if (key === "1年") {
    const start = new Date(today);
    start.setFullYear(start.getFullYear() - 1);
    return { url, start: fmtDate(start), end, label: "日足" };
  }

  if (key === "3年") {
    const start = new Date(today);
    start.setFullYear(start.getFullYear() - 3);
    return { url, start: fmtDate(start), end, label: "日足" };
  }

  // MAX
  return { url, end, label: "日足" }; // start 未指定＝全期間
}
