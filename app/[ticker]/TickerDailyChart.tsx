// app/[ticker]/TickerDailyChart.tsx
"use client";

import React, { useState } from "react";
import { useTickerData } from "./hooks/useTickerData";
import { rangeConfigs, type RangeKey } from "./config/chartRangeConfig";
import LightweightChart from "./components/LightweightChart";
import RangeSwitcher from "./components/RangeSwitcher";

type Perf =
  | (Record<string, number | string | null> & {
      ticker: string;
      date: string;
    })
  | undefined;

export default function TickerDailyChart({
  ticker,
  perf,
}: {
  ticker: string;
  perf?: Perf;
}) {
  const [activeRange, setActiveRange] = useState<RangeKey>("r_1y");
  const { rows, loading, err } = useTickerData(ticker, activeRange);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <div className="text-base font-medium text-muted-foreground/80">
          {loading ? (
            "読み込み中…"
          ) : err ? (
            <span className="text-red-500">エラー: {err}</span>
          ) : (
            `${ticker} - ${rangeConfigs[activeRange].label}`
          )}
        </div>
        {perf?.date && (
          <div className="text-xs text-muted-foreground/60">
            基準日: {perf.date}
          </div>
        )}
      </div>

      <LightweightChart rows={rows} rangeKey={activeRange} />

      <RangeSwitcher
        perf={perf}
        activeRange={activeRange}
        setActiveRange={setActiveRange}
      />
    </div>
  );
}
