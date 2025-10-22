// app/[ticker]/components/price_card/PriceFocus.tsx
import React from "react";
import type { Snapshot } from "../../lib/types";
import { formatNumber, nf0 } from "../../lib/tech-helpers";

interface PriceFocusProps {
  snap: Snapshot | null;
  colorMain: string;
  currentPrice?: number | null;
  currentDiff?: number | null;
  currentMarketTime?: string | null;
}

export default function PriceFocus({
  snap,
  colorMain,
  currentPrice,
  currentDiff,
  currentMarketTime
}: PriceFocusProps) {
  // 時刻フォーマット (HH:mm)
  const formatTime = (timeStr: string | null | undefined): string | null => {
    if (!timeStr) return null;
    try {
      const date = new Date(timeStr);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return null;
    }
  };

  const displayPrice = currentPrice ?? snap?.close;
  const timeStr = formatTime(currentMarketTime);

  return (
    <div className="mt-6 flex items-end gap-4 md:gap-6">
      {/* Left: Current Price */}
      <div className="flex-1">
        <div className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold mb-1.5">
          Current Price
        </div>
        <div className="flex items-baseline gap-2">
          <div
            className={`text-4xl md:text-7xl font-black font-sans tabular-nums leading-none ${colorMain} tracking-tighter drop-shadow-sm`}
          >
            {formatNumber(displayPrice, nf0)}
          </div>
          {timeStr && (
            <div className="text-sm md:text-base text-muted-foreground/70 font-mono pb-1 md:pb-2">
              ({timeStr})
            </div>
          )}
        </div>
      </div>

      {/* Right: Previous Close */}
      <div className="flex-shrink-0 pb-1 md:pb-2">
        <div className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground/60 font-medium mb-1">
          Prev Close
        </div>
        <div className="text-xl md:text-3xl font-bold font-sans tabular-nums text-muted-foreground/90">
          {formatNumber(snap?.prevClose, nf0)}
        </div>
      </div>
    </div>
  );
}
