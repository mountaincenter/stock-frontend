// app/[ticker]/PriceCard.tsx
import * as React from "react";
import type { Meta, Snapshot } from "./lib/types";
import PriceCardHeader from "./components/price_card/PriceCardHeader";
import PriceFocus from "./components/price_card/PriceFocus";
import VolumeInsight from "./components/price_card/VolumeInsight";
import VolatilityMetrics from "./components/price_card/VolatilityMetrics";
import MiniChartContainer from "./components/price_card/MiniChartContainer";

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
      ? "text-emerald-300"
      : sign < 0
      ? "text-rose-300"
      : "text-muted-foreground";

  const badgeTone =
    sign > 0
      ? "bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-400/60 shadow-[0_0_12px_rgba(52,211,153,0.3)]"
      : sign < 0
      ? "bg-rose-500/20 text-rose-300 ring-2 ring-rose-400/60 shadow-[0_0_12px_rgba(251,113,133,0.3)]"
      : "bg-muted text-muted-foreground ring-1 ring-border/40";

  // ─────────────────────────────────────────────────
  // JSX: Composition of Zones with 2-Column Layout
  // ─────────────────────────────────────────────────
  return (
    <section
      className="group relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 md:p-8 shadow-xl shadow-black/5 backdrop-blur-xl transition-all duration-300 hover:shadow-xl hover:shadow-black/10"
      aria-label="価格サマリー"
    >
      {/* Premium shine overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />

      {/* Subtle animated accent on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/[0.02] via-transparent to-accent/[0.02] pointer-events-none" />

      <div className="relative flex flex-col lg:flex-row gap-6">
        {/* Left Column: All existing content (about 2/3 width) */}
        <div className="flex-1 lg:flex-[2] space-y-6">
          {/* ZONE 0: Header */}
          <PriceCardHeader meta={meta} snap={snap} badgeTone={badgeTone} pct={pct} />

          {/* ZONE 1: Price Focus */}
          <PriceFocus snap={snap} colorMain={colorMain} />

          {/* ZONE 2: Volume Insight */}
          <VolumeInsight snap={snap} />

          {/* ZONE 3: Volatility Metrics */}
          <VolatilityMetrics snap={snap} />

          {/* ZONE 4: Reserved Space for TDnet / Fundamental Alerts (Future Phase) */}
          <div className="mt-4 pt-3 border-t border-border/20">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-medium flex items-center gap-2 mb-2">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/20 to-transparent" />
              <span>Fundamental Alerts (Reserved)</span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent via-border/20 to-transparent" />
            </div>
            <div className="text-[9px] text-muted-foreground/40 leading-relaxed">
              <p className="mb-1">
                <span className="font-semibold">データ出典:</span> Yahoo Finance (yfinance)
              </p>
              <p>
                本サービスで提供される情報は、投資判断の参考として提供するものであり、投資勧誘を目的としたものではありません。
                投資に関する最終決定は、利用者ご自身の判断でなさるようお願いいたします。
                本サービスの情報に基づいて被ったいかなる損害についても、当方は一切の責任を負いかねます。
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Mini Chart (desktop only) */}
        <div className="hidden lg:block lg:w-[400px] lg:flex-shrink-0 min-h-[300px]">
          <MiniChartContainer
            ticker={meta.ticker}
            currentPrice={snap?.close ?? null}
            percentChange={pct}
            prevClose={snap?.prevClose ?? null}
          />
        </div>
      </div>
    </section>
  );
}