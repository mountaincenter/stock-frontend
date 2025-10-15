// app/[ticker]/components/ChartTooltip.tsx
"use client";

import React, { useMemo } from "react";

export interface TooltipData {
  visible: boolean;
  x: number;
  y: number;
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface ChartTooltipProps {
  tooltip: TooltipData | null;
}

export default function ChartTooltip({ tooltip }: ChartTooltipProps) {
  const nfOhlc = useMemo(
    () =>
      new Intl.NumberFormat("ja-JP", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }),
    []
  );

  if (!tooltip || !tooltip.visible) {
    return null;
  }

  return (
    <div
      className="absolute pointer-events-none z-50 rounded-lg border border-border/80 bg-background/95 backdrop-blur-sm shadow-xl px-3 py-2.5"
      style={{
        left: Math.min(tooltip.x + 12, window.innerWidth - 200),
        top: Math.max(tooltip.y - 120, 10),
      }}
    >
      <div className="text-xs font-medium text-muted-foreground/80 mb-1.5">
        {tooltip.time}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        <div className="text-muted-foreground/70">始値</div>
        <div className="font-semibold font-sans tabular-nums text-right">
          {nfOhlc.format(tooltip.open)}
        </div>
        <div className="text-muted-foreground/70">高値</div>
        <div className="font-semibold font-sans tabular-nums text-right text-green-600 dark:text-green-500">
          {nfOhlc.format(tooltip.high)}
        </div>
        <div className="text-muted-foreground/70">安値</div>
        <div className="font-semibold font-sans tabular-nums text-right text-red-600 dark:text-red-500">
          {nfOhlc.format(tooltip.low)}
        </div>
        <div className="text-muted-foreground/70">終値</div>
        <div
          className={`font-bold font-sans tabular-nums text-right ${
            tooltip.close >= tooltip.open
              ? "text-green-600 dark:text-green-500"
              : "text-red-600 dark:text-red-500"
          }`}
        >
          {nfOhlc.format(tooltip.close)}
        </div>
      </div>
    </div>
  );
}
