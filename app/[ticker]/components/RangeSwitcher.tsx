// app/[ticker]/components/RangeSwitcher.tsx
"use client";

import React from "react";
import { useMemo } from "react";
import type { RangeKey } from "../config/chartRangeConfig";

type Perf =
  | (Record<string, number | string | null> & {
      ticker: string;
      date: string;
    })
  | undefined;

interface RangeSwitcherProps {
  perf?: Perf;
  activeRange: RangeKey;
  setActiveRange: (range: RangeKey) => void;
}

const toneBySign = (v: number | null | undefined) =>
  typeof v === "number"
    ? v > 0
      ? "text-green-600 dark:text-green-500"
      : v < 0
      ? "text-red-600 dark:text-red-500"
      : "text-muted-foreground"
    : "text-muted-foreground";

export default function RangeSwitcher({ perf, activeRange, setActiveRange }: RangeSwitcherProps) {
  const nf2 = useMemo(
    () =>
      new Intl.NumberFormat("ja-JP", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );

  const perfItems: Array<{
    rangeKey: RangeKey;
    label: string;
    perfKey: string;
  }> = [
    { rangeKey: "r_5d", label: "1日", perfKey: "r_1d" },
    { rangeKey: "r_1mo", label: "5日", perfKey: "r_5d" },
    { rangeKey: "r_3mo", label: "1ヶ月", perfKey: "r_1mo" },
    { rangeKey: "r_ytd", label: "6ヶ月", perfKey: "r_6mo" },
    { rangeKey: "r_1y", label: "年初来", perfKey: "r_ytd" },
    { rangeKey: "r_3y", label: "1年", perfKey: "r_1y" },
    { rangeKey: "r_5y", label: "5年", perfKey: "r_5y" },
    { rangeKey: "r_all", label: "全期間", perfKey: "r_all" },
  ];

  return (
    <div className="mt-3">
      <div className="text-[13px] font-medium text-muted-foreground mb-1.5">
        パフォーマンス＆範囲選択
      </div>
      <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5">
        {perfItems.map(({ rangeKey, label, perfKey }) => {
          const isActive = activeRange === rangeKey;
          const value = perf?.[perfKey] as number | null | undefined;
          return (
            <button
              key={rangeKey}
              onClick={() => setActiveRange(rangeKey)}
              className={`
                rounded-lg border px-2 py-2 flex flex-col items-center justify-center
                transition-all cursor-pointer
                ${
                  isActive
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30 shadow-sm"
                    : "border-border/50 bg-background hover:border-border hover:shadow-sm"
                }
              `}
            >
              <div
                className={`text-[11px] font-medium mb-0.5 ${
                  isActive ? "text-primary" : "text-muted-foreground/70"
                }`}>
                {label}
              </div>
              <div
                className={`text-[13px] font-bold font-sans tabular-nums ${
                  isActive
                    ? "text-primary"
                    : toneBySign(value)
                }`}>
                {typeof value === "number" && Number.isFinite(value)
                  ? `${value > 0 ? "+" : ""}${nf2.format(value)}%`
                  : "—"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
