// app/[ticker]/components/price_card/PriceCardHeader.tsx
import React from "react";
import type { Meta, Snapshot } from "../../lib/types";
import { formatNumber, nf0, nf2 } from "../../lib/tech-helpers";

interface PriceCardHeaderProps {
  meta: Meta;
  snap: Snapshot | null;
  badgeTone: string;
  pct: number | null;
}

export default function PriceCardHeader({ meta, snap, badgeTone, pct }: PriceCardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      {/* Left: Ticker Name and Date */}
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-bold leading-tight tracking-tight truncate">
          {meta.stock_name}
        </h1>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="font-mono text-base text-muted-foreground font-semibold">
            {meta.ticker}
          </span>
          {snap?.date && (
            <span className="text-sm text-muted-foreground/70">
              {snap.date}
            </span>
          )}
        </div>
      </div>

      {/* Right: Change Badge */}
      <div className="flex-shrink-0">
        {snap?.diff != null && Number.isFinite(snap.diff) ? (
          <div
            className={`inline-flex flex-col items-end gap-1 rounded-xl px-4 py-3 ${badgeTone} transition-all duration-300`}
          >
            <div className="text-3xl font-black font-sans tabular-nums leading-none">
              {formatNumber(pct, nf2, "%")}
            </div>
            <div className="text-base font-bold font-sans tabular-nums opacity-90">
              {snap.diff > 0 ? "+" : ""}
              {formatNumber(snap.diff, nf0)}
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground text-base">—</div>
        )}
      </div>
    </div>
  );
}
