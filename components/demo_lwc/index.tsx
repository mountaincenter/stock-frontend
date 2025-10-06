"use client";

import { useMemo, useState } from "react";
import type { RangeKey } from "./types";
import { RangeSwitcher } from "./RangeSwitcher";
import { usePrices } from "./usePrices";
import { LwcJaChart } from "./Chart";
import MiniLineChart from "./MiniLineChart";
import { nfPrice } from "./locale";

/** モック通り忠実再現：上部カード+右上スパークライン+ローソク＋出来高 */
export default function Index() {
  const [range, setRange] = useState<RangeKey>("1年");
  const { rows, loading, err, footnote } = usePrices(range);

  const last = useMemo(() => rows.at(-1), [rows]);
  const prev = useMemo(
    () => (rows.length > 1 ? rows.at(-2) : undefined),
    [rows]
  );

  const closeText = last ? nfPrice.format(last.Close) : "-";
  const diffText =
    last && prev
      ? (() => {
          const diff = last.Close - prev.Close;
          const pct = (diff / prev.Close) * 100;
          const sign = diff > 0 ? "+" : diff < 0 ? "−" : "";
          return `${sign}${nfPrice.format(
            Math.abs(diff)
          )} (${sign}${pct.toFixed(2)}%)`;
        })()
      : "-";

  return (
    <div className="p-4 space-y-4">
      {/* 上段: 銘柄名・価格・スパークライン・期間切替 */}
      <div className="flex items-start justify-between">
        {/* 左側情報 */}
        <div>
          <div className="text-sm font-semibold">3350.T</div>
          <div className="text-xs text-neutral-500 mt-0.5">
            {range}（{footnote || "…"}）
          </div>
          <div className="text-sm mt-1">
            終値: <span className="font-semibold">{closeText}</span>{" "}
            <span
              className={
                last && prev
                  ? last.Close >= prev.Close
                    ? "text-emerald-600"
                    : "text-red-600"
                  : "text-neutral-500"
              }
            >
              {diffText}
            </span>
          </div>
        </div>

        {/* 右上: スパークライン + 範囲切替 */}
        <div className="flex flex-col items-end gap-1">
          <div className="w-32 h-10">
            <MiniLineChart rows={rows} height={40} />
          </div>
          <RangeSwitcher value={range} onChange={setRange} />
        </div>
      </div>

      {/* 下段: 本チャート（ローソク＋出来高） */}
      <div className="text-xs text-neutral-500">
        {loading ? "読み込み中…" : err ? `エラー: ${err}` : ""}
      </div>
      <div className="border-t border-neutral-200 pt-2">
        <LwcJaChart rows={rows} height={400} />
      </div>
    </div>
  );
}
