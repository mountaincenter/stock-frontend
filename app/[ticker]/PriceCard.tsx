// app/[ticker]/PriceCard.tsx
import * as React from "react";
import type { Meta, Snapshot } from "./lib/types";
import PriceCardHeader from "./components/price_card/PriceCardHeader";
import PriceFocus from "./components/price_card/PriceFocus";
import VolumeInsight from "./components/price_card/VolumeInsight";
import VolatilityMetrics from "./components/price_card/VolatilityMetrics";

export default function PriceCard({
  meta,
  snap,
}: {
  meta: Meta;
  snap: Snapshot | null;
}) {

  // ───────────── Derived Values & Dynamic Styles ─────────────
  const pct =
    snap?.diff != null && snap?.prevClose != null && snap.prevClose !== 0
      ? (snap.diff / snap.prevClose) * 100
      : null;

  const sign = snap?.diff == null ? 0 : Math.sign(snap.diff);

  const colorMain =
    sign > 0
      ? "text-emerald-400"
      : sign < 0
      ? "text-rose-400"
      : "text-muted-foreground";

  const badgeTone =
    sign > 0
      ? "bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-400/60 shadow-[0_0_12px_rgba(52,211,153,0.3)]"
      : sign < 0
      ? "bg-rose-500/20 text-rose-300 ring-2 ring-rose-400/60 shadow-[0_0_12px_rgba(251,113,133,0.3)]"
      : "bg-muted text-muted-foreground ring-1 ring-border/40";

  // ─────────────────────────────────────────────────
  // JSX: Composition of Zones
  // ─────────────────────────────────────────────────
  return (
    <section
      className="relative rounded-xl border border-border/50 bg-gradient-to-br from-background to-background/95 p-6 shadow-lg backdrop-blur-sm transition-all hover:shadow-xl"
      aria-label="価格サマリー"
    >
      {/* ZONE 0: Header */}
      <PriceCardHeader meta={meta} snap={snap} badgeTone={badgeTone} pct={pct} />

      {/* ZONE 1: Price Focus */}
      <PriceFocus snap={snap} colorMain={colorMain} />

      {/* ZONE 2: Volume Insight */}
      <VolumeInsight snap={snap} />

      {/* ZONE 3: Volatility Metrics */}
      <VolatilityMetrics snap={snap} />

      {/* ZONE 4: Footer */}
      <div className="mt-6 text-[10px] text-muted-foreground/50 text-right">
        Data: FastAPI Snapshot
      </div>
    </section>
  );
}