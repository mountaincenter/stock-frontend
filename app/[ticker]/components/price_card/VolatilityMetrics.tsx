// app/[ticker]/components/price_card/VolatilityMetrics.tsx
import React from "react";
import type { Snapshot } from "../../lib/types";
import { formatNumber, nf2 } from "../../lib/tech-helpers";

interface VolatilityMetricsProps {
  snap: Snapshot | null;
}

export default function VolatilityMetrics({ snap }: VolatilityMetricsProps) {
  const isHighVolatility = snap?.atr14_pct != null && snap.atr14_pct > 5.0;

  const metrics = [
    { label: "True Range", value: formatNumber(snap?.tr, nf2) },
    { label: "TR Percent", value: formatNumber(snap?.tr_pct, nf2, "%") },
    { label: "ATR (14d)", value: formatNumber(snap?.atr14, nf2) },
    { label: "ATR Percent", value: formatNumber(snap?.atr14_pct, nf2, "%"), highlight: isHighVolatility },
  ];

  return (
    <div className="mt-8 pt-6 border-t border-border/30">
      <div className="mb-3">
        <div className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold">
          Volatility Metrics
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4 px-2">
        {metrics.map((metric, index) => (
          <div key={index} className="relative">
            <div
              className={`px-3 md:px-4 py-3 md:py-3.5 rounded-lg border transition-all relative ${
                metric.highlight
                  ? "bg-rose-500/10 border-rose-400/40 ring-1 ring-rose-400/30 dark:border-rose-500/40 dark:ring-rose-500/30"
                  : "bg-muted/30 border-border/20"
              }`}
            >
              {metric.highlight && isHighVolatility && (
                <div className="absolute top-2 right-2">
                  <div className="flex items-center gap-1 px-1.5 md:px-2 py-0.5 rounded-md bg-rose-500/20 ring-2 ring-rose-400/60 shadow-[0_0_12px_rgba(251,113,133,0.3)] whitespace-nowrap">
                    <svg className="w-2.5 md:w-3 h-2.5 md:h-3 text-rose-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wide text-rose-300">High Risk</span>
                  </div>
                </div>
              )}
              <div className="text-[10px] md:text-[11px] text-muted-foreground/60 uppercase tracking-wide mb-1.5 pl-1">
                {metric.label}
              </div>
              <div
                className={`text-lg md:text-xl font-bold font-sans tabular-nums pl-1 ${
                  metric.highlight ? "text-rose-300" : ""
                }`}
              >
                {metric.value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
