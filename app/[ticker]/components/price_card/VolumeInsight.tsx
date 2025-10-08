// app/[ticker]/components/price_card/VolumeInsight.tsx
import React from "react";
import type { Snapshot } from "../../lib/types";
import { formatNumber, nf0, nf2 } from "../../lib/tech-helpers";

interface VolumeInsightProps {
  snap: Snapshot | null;
}

export default function VolumeInsight({ snap }: VolumeInsightProps) {
  const volRatio =
    snap?.volume != null &&
    snap?.vol_ma10 != null &&
    snap.vol_ma10 !== 0 &&
    Number.isFinite(snap.volume) &&
    Number.isFinite(snap.vol_ma10)
      ? snap.volume / snap.vol_ma10
      : null;

  const isVolAnomalous = volRatio != null && volRatio >= 1.5;

  const volBarColor =
    volRatio == null
      ? "bg-border/20"
      : volRatio >= 1.5
      ? "bg-amber-400/80"
      : volRatio >= 1.0
      ? "bg-sky-400/60"
      : "bg-border/40";

  return (
    <div className="mt-8 relative">
      {/* Volume Labels */}
      <div className="flex items-end justify-between mb-2.5">
        <div className="flex items-baseline gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-1">
              Volume
            </div>
            <div className="text-3xl font-extrabold font-sans tabular-nums">
              {formatNumber(snap?.volume, nf0)}
            </div>
          </div>
          <div className="text-muted-foreground/60 text-lg pb-0.5">/</div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1">
              MA10
            </div>
            <div className="text-2xl font-semibold font-sans tabular-nums text-muted-foreground/80">
              {formatNumber(snap?.vol_ma10, nf0)}
            </div>
          </div>
        </div>

        {/* Volume Ratio Badge */}
        {volRatio != null && (
          <div
            className={`px-3 py-1.5 rounded-lg font-bold font-sans tabular-nums text-base transition-all ${
              isVolAnomalous
                ? "bg-amber-500/20 text-amber-300 ring-2 ring-amber-400/50 shadow-[0_0_10px_rgba(251,191,36,0.4)]"
                : "bg-muted/50 text-foreground/70"
            }`}
          >
            ×{nf2.format(volRatio)}
          </div>
        )}
      </div>

      {/* Volume Visual Bar */}
      <div className="h-2 bg-border/20 rounded-full overflow-hidden">
        <div
          className={`h-full ${volBarColor} transition-all duration-500 rounded-full`}
          style={{
            width: volRatio != null ? `${Math.min(volRatio * 100, 200)}%` : "0%",
          }}
        />
      </div>
      {volRatio != null && (
        <div className="text-[10px] text-muted-foreground/60 mt-1 text-right">
          {volRatio >= 1.5
            ? "⚠ 異常出来高（平均の1.5倍超）"
            : volRatio >= 1.0
            ? "活発な取引"
            : "平均以下の出来高"}
        </div>
      )}
    </div>
  );
}
