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
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">
          Volatility Metrics
        </div>
        {isHighVolatility && (
          <div className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold uppercase tracking-wide">
            High Risk
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg border transition-all ${
              metric.highlight
                ? "bg-rose-500/10 border-rose-400/40 ring-1 ring-rose-400/30"
                : "bg-muted/30 border-border/20"
            }`}
          >
            <div className="text-[10px] text-muted-foreground/60 uppercase tracking-wide mb-1.5">
              {metric.label}
            </div>
            <div
              className={`text-xl font-bold font-sans tabular-nums ${
                metric.highlight ? "text-rose-300" : ""
              }`}
            >
              {metric.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
