// app/[ticker]/components/OscillatorTable.tsx
import React from "react";
import IndicatorRow from "./IndicatorRow";
import {
  formatNumber,
  nf1,
  nf2,
  toneBySign,
  nearestDelta,
  na,
} from "../lib/tech-helpers";
import { judgeOsc } from "../lib/technical-analysis";
import type { DecisionItem } from "../lib/types";

interface OscillatorTableProps {
  decision: DecisionItem | null;
}

export default function OscillatorTable({ decision }: OscillatorTableProps) {
  const oscValues = {
    rsi14: decision?.values.rsi14 ?? null,
    percent_b: decision?.values.percent_b ?? null,
    macd_hist: decision?.values.macd_hist ?? null,
    sma25_dev_pct: decision?.values.sma25_dev_pct ?? null,
  };

  return (
    <div className="rounded-lg border border-border/50 bg-card/40">
      <div className="px-3 py-2.5 text-sm font-bold border-b border-border/30">オシレーター</div>
      <table className="w-full text-sm leading-6 border-separate border-spacing-y-1">
        <thead>
          <tr className="text-xs font-semibold text-muted-foreground/80">
            <th className="text-left px-2 py-1.5">指標</th>
            <th className="text-right px-2 py-1.5">現在値</th>
            <th className="text-right px-2 py-1.5">閾値</th>
            <th className="text-right px-2 py-1.5">乖離</th>
            <th className="text-center px-2 py-1.5">判定</th>
          </tr>
        </thead>
        <tbody>
          <IndicatorRow
            name="RSI(14)"
            currentValue={formatNumber(oscValues.rsi14, nf1)}
            threshold="30 / 70"
            delta={na(oscValues.rsi14) ? "データなし" : nf1.format(nearestDelta(oscValues.rsi14, 30, 70).delta)}
            deltaClassName={toneBySign(na(oscValues.rsi14) ? null : nearestDelta(oscValues.rsi14, 30, 70).delta)}
            action={judgeOsc("rsi", oscValues.rsi14)}
          />
          <IndicatorRow
            name="%b (20,2σ)"
            currentValue={formatNumber(oscValues.percent_b, nf2)}
            threshold="0.05 / 0.95"
            delta={na(oscValues.percent_b) ? "データなし" : nf2.format(nearestDelta(oscValues.percent_b, 0.05, 0.95).delta)}
            deltaClassName={toneBySign(na(oscValues.percent_b) ? null : nearestDelta(oscValues.percent_b, 0.05, 0.95).delta)}
            action={judgeOsc("percentB", oscValues.percent_b)}
          />
          <IndicatorRow
            name="MACD Hist"
            currentValue={formatNumber(oscValues.macd_hist, nf2)}
            threshold="0"
            delta={formatNumber(oscValues.macd_hist, nf2)}
            deltaClassName={toneBySign(oscValues.macd_hist)}
            action={judgeOsc("macdHist", oscValues.macd_hist)}
          />
          <IndicatorRow
            name="乖離%(25)"
            currentValue={formatNumber(oscValues.sma25_dev_pct, nf1, "%")}
            threshold="±2.0%"
            delta={na(oscValues.sma25_dev_pct) ? "データなし" : nf1.format(nearestDelta(oscValues.sma25_dev_pct, 2.0, -2.0).delta) + "%"}
            deltaClassName={toneBySign(na(oscValues.sma25_dev_pct) ? null : nearestDelta(oscValues.sma25_dev_pct, 2.0, -2.0).delta)}
            action={judgeOsc("smaDev", oscValues.sma25_dev_pct)}
          />
        </tbody>
      </table>
    </div>
  );
}
