// app/[ticker]/TechDetailTable.tsx
// Server Component

import React from "react";
import { fetchDecisionV2, fetchPrices1d } from "./lib/api";
import { ema, sma, ichimokuFromOHLC, judgeMA } from "./lib/technical-analysis";
import type { RatingLabel5, DecisionItem } from "./lib/types";
import SummaryLabels from "./components/SummaryLabels";
import OscillatorTable from "./components/OscillatorTable";
import MovingAverageTable from "./components/MovingAverageTable";
import IchimokuTable from "./components/IchimokuTable";

// オシレーターの総合評価を計算
function calculateTechRating(decision: DecisionItem | null): RatingLabel5 | "データなし" {
  if (!decision?.votes) return "データなし";
  const keys = ["rsi14", "percent_b", "macd_hist", "sma25_dev_pct"] as const;
  const nums = keys
    .map((k) => decision.votes[k]?.score)
    .filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  if (nums.length === 0) return "中立";
  
  const avg = Math.round(
    Math.max(-2, Math.min(2, nums.reduce((a, b) => a + b, 0) / nums.length))
  );

  return avg >= 2
    ? "強い買い"
    : avg === 1
    ? "買い"
    : avg === 0
    ? "中立"
    : avg === -1
    ? "売り"
    : "強い売り";
}

export default async function TechDetailTable({ ticker }: { ticker: string }) {
  const [decision, prices] = await Promise.all([
    fetchDecisionV2(ticker),
    fetchPrices1d(ticker),
  ]);

  // 価格系列（計算用）
  const closes: number[] = prices.map((p) => p.Close as number);
  const highs: number[] = prices.map((p) => p.High as number);
  const lows: number[] = prices.map((p) => p.Low as number);
  const lastClose: number | null =
    closes.length > 0 && Number.isFinite(closes[closes.length - 1])
      ? closes[closes.length - 1]
      : null;

  // MA（EMA/SMA 10,20,30,50,100,200）
  const periods = [10, 20, 30, 50, 100, 200] as const;
  const maRows = periods
    .flatMap((p) => [
      { name: `EMA(${p})`, value: ema(closes, p), action: judgeMA(lastClose, ema(closes, p)) },
      { name: `SMA(${p})`, value: sma(closes, p), action: judgeMA(lastClose, sma(closes, p)) },
    ]);

  // 一目（高安終値ベース）
  const ichi = ichimokuFromOHLC(highs, lows, closes);

  // 総合評価ラベル
  const overall_rating = decision?.overall?.label ?? "データなし";
  const ma_rating = decision?.votes?.ma?.label as RatingLabel5 | undefined ?? "データなし";
  const ichimoku_rating = decision?.votes?.ichimoku?.label as RatingLabel5 | undefined ?? "データなし";
  const tech_rating = calculateTechRating(decision);

  return (
    <section className="group relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card/95 via-card/90 to-card/95 p-6 md:p-8 shadow-2xl shadow-black/5 backdrop-blur-xl">
      {/* Premium shine overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative">
        {/* Enhanced header with gradient accent */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />
            <h2 className="text-xl font-bold tracking-tight">
              テクニカル判断の内訳
            </h2>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60">
            <div className="h-px w-8 bg-gradient-to-r from-border/40 to-transparent" />
            <span className="tracking-wide uppercase font-medium">最新日</span>
          </div>
        </div>

        <SummaryLabels
          overall={overall_rating}
          oscillator={tech_rating}
          ma={ma_rating}
          ichimoku={ichimoku_rating}
        />

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          <OscillatorTable decision={decision} />
          <MovingAverageTable maRows={maRows} lastClose={lastClose} />
          <IchimokuTable ichi={ichi} />
        </div>
      </div>
    </section>
  );
}