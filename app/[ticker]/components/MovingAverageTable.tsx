// app/[ticker]/components/MovingAverageTable.tsx
import React from "react";
import IndicatorRow from "./IndicatorRow";
import {
  formatNumber,
  nf0,
  nf1,
  toneBySign,
  na,
} from "../lib/tech-helpers";
import type { RatingLabel3 } from "../lib/types";

interface MovingAverageTableProps {
  maRows: { name: string; value: number | null; action: RatingLabel3 }[];
  lastClose: number | null;
}

export default function MovingAverageTable({ maRows, lastClose }: MovingAverageTableProps) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/40">
      <div className="px-3 py-2.5 text-sm font-bold border-b border-border/30">移動平均</div>
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
          {maRows.length ? (
            maRows.map((r) => {
              const maVal = r.value;
              const deltaPct =
                !na(lastClose) && !na(maVal) && maVal !== 0
                  ? (lastClose! - maVal!) / maVal!
                  : null;
              return (
                <IndicatorRow
                  key={r.name}
                  name={r.name}
                  currentValue={formatNumber(lastClose, nf0)}
                  threshold={formatNumber(maVal, nf0)}
                  delta={formatNumber(
                    deltaPct !== null ? deltaPct * 100 : null,
                    nf1,
                    "%"
                  )}
                  deltaClassName={toneBySign(deltaPct)}
                  action={r.action}
                />
              );
            })
          ) : (
            <tr className="bg-card/60">
              <td className="px-2 py-2 text-center" colSpan={5}>
                データなし
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
