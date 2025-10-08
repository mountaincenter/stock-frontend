// app/[ticker]/components/price_card/PriceFocus.tsx
import React from "react";
import type { Snapshot } from "../../lib/types";
import { formatNumber, nf0 } from "../../lib/tech-helpers";

interface PriceFocusProps {
  snap: Snapshot | null;
  colorMain: string;
}

export default function PriceFocus({ snap, colorMain }: PriceFocusProps) {
  return (
    <div className="mt-6 flex items-end gap-6">
      {/* Left: Current Price */}
      <div className="flex-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium mb-1">
          Current Price
        </div>
        <div
          className={`text-6xl md:text-7xl font-black font-sans tabular-nums leading-none ${colorMain} tracking-tighter drop-shadow-sm`}
        >
          {formatNumber(snap?.close, nf0)}
        </div>
      </div>

      {/* Right: Previous Close */}
      <div className="flex-shrink-0 pb-1.5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">
          Prev Close
        </div>
        <div className="text-2xl font-bold font-sans tabular-nums text-muted-foreground/80">
          {formatNumber(snap?.prevClose, nf0)}
        </div>
      </div>
    </div>
  );
}
