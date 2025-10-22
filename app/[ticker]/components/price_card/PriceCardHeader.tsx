// app/[ticker]/components/price_card/PriceCardHeader.tsx
"use client";

import React from "react";
import type { Meta, Snapshot } from "../../lib/types";
import { formatNumber, nf0, nf2 } from "../../lib/tech-helpers";
import { ExternalLink, RefreshCw } from "lucide-react";

interface PriceCardHeaderProps {
  meta: Meta;
  snap: Snapshot | null;
  badgeTone: string;
  pct: number | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  lastUpdated?: string | null;
}

export default function PriceCardHeader({
  meta,
  snap,
  badgeTone,
  pct,
  onRefresh,
  isRefreshing = false,
  lastUpdated
}: PriceCardHeaderProps) {
  // Yahoo! Finance URL
  const yahooFinanceUrl = `https://finance.yahoo.co.jp/quote/${meta.ticker}`;

  return (
    <div className="flex items-start justify-between gap-4">
      {/* Left: Ticker Name, Sector/Series, Code and Date */}
      <div className="flex-1 min-w-0">
        {/* Stock Name with Yahoo! Finance Link and Refresh Button */}
        <div className="flex items-center gap-2 mb-1">
          <a
            href={yahooFinanceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1.5 text-xl font-bold leading-tight tracking-tight hover:opacity-80 transition-opacity"
          >
            <h1 className="truncate">{meta.stock_name}</h1>
            <ExternalLink className="h-4 w-4 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
          </a>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center opacity-60 hover:opacity-100 transition-opacity"
              aria-label="リアルタイム価格を更新"
            >
              <RefreshCw className={`h-4 w-4 text-muted-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {/* Sector and Series */}
        {(meta.sectors || meta.series) && (
          <div className="flex items-center gap-2 mb-2 text-xs">
            {meta.sectors && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/50 text-muted-foreground/80 font-medium">
                {meta.sectors}
              </span>
            )}
            {meta.series && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/30 text-muted-foreground/70 font-normal">
                {meta.series}
              </span>
            )}
          </div>
        )}

        {/* Code and Date */}
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-mono text-base text-muted-foreground font-semibold">
            {meta.ticker}
          </span>
          {lastUpdated ? (
            <span className="text-sm text-muted-foreground/70 font-mono">
              {lastUpdated} 更新
            </span>
          ) : snap?.date ? (
            <span className="text-sm text-muted-foreground/70">
              {snap.date}
            </span>
          ) : null}
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
