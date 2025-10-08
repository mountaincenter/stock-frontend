// app/[ticker]/components/SummaryLabels.tsx
import React from "react";
import { renderAction } from "../lib/tech-helpers";
import type { RatingLabel5 } from "../lib/types";

interface SummaryLabelsProps {
  overall: RatingLabel5 | "データなし";
  oscillator: RatingLabel5 | "データなし";
  ma: RatingLabel5 | "データなし";
  ichimoku: RatingLabel5 | "データなし";
}

export default function SummaryLabels({ overall, oscillator, ma, ichimoku }: SummaryLabelsProps) {
  const labels = [
    { k: "総合", v: overall },
    { k: "オシレーター", v: oscillator },
    { k: "移動平均", v: ma },
    { k: "一目", v: ichimoku },
  ];

  return (
    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
      {labels.map((x) => (
        <div key={x.k} className="px-3 py-3 rounded-lg bg-card/50 text-center border border-border/30">
          <div className="text-xs font-medium text-muted-foreground/70 mb-1.5">{x.k}</div>
          <div className="text-base font-bold">
            {renderAction(x.v)}
          </div>
        </div>
      ))}
    </div>
  );
}
