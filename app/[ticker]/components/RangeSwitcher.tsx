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
      ? "text-emerald-400"
      : v < 0
      ? "text-rose-400"
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
    key: RangeKey;
    label: string;
    value: number | null | undefined;
  }> = [
    { key: "r_5d", label: "1日", value: perf?.["r_5d"] as number | null | undefined },
    { key: "r_1mo", label: "5日", value: perf?.["r_1mo"] as number | null | undefined },
    { key: "r_3mo", label: "1ヶ月", value: perf?.["r_3mo"] as number | null | undefined },
    { key: "r_ytd", label: "6ヶ月", value: perf?.["r_ytd"] as number | null | undefined },
    { key: "r_1y", label: "年初来", value: perf?.["r_1y"] as number | null | undefined },
    { key: "r_3y", label: "1年", value: perf?.["r_3y"] as number | null | undefined },
    { key: "r_5y", label: "5年", value: perf?.["r_5y"] as number | null | undefined },
    { key: "r_all", label: "全期間", value: perf?.["r_all"] as number | null | undefined },
  ];

  return (
    <div className="mt-4">
      <div className="text-sm font-medium text-muted-foreground/80 mb-2">
        パフォーマンス＆範囲選択
      </div>
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
        {perfItems.map(({ key, label, value }) => {
          const isActive = activeRange === key;
          return (
            <button
              key={key}
              onClick={() => setActiveRange(key)}
              className={`
                rounded-lg border px-3 py-2.5 flex flex-col items-center justify-center
                transition-all cursor-pointer
                ${
                  isActive
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-md"
                    : "border-border/50 bg-background hover:border-border hover:shadow-sm"
                }
              `}
            >
              <div
                className={`text-xs font-medium mb-1 ${
                  isActive ? "text-primary" : "text-muted-foreground/70"
                }`}>
                {label}
              </div>
              <div
                className={`text-base font-bold font-sans tabular-nums ${
                  isActive
                    ? "text-primary"
                    : toneBySign(value as number | null)
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
