// app/[ticker]/components/IndicatorRow.tsx
import React from "react";
import { renderAction } from "../lib/tech-helpers";
import type { RatingLabel3 } from "../lib/types";

interface IndicatorRowProps {
  name: string;
  currentValue: string;
  threshold: string;
  delta: string;
  deltaClassName?: string;
  action: RatingLabel3 | "データなし";
}

export default function IndicatorRow({
  name,
  currentValue,
  threshold,
  delta,
  deltaClassName = "",
  action,
}: IndicatorRowProps) {
  return (
    <tr className="bg-card/60">
      <td className="px-2 py-1">{name}</td>
      <td className="px-2 py-1 text-right font-sans tabular-nums">
        {currentValue}
      </td>
      <td className="px-2 py-1 text-right font-sans tabular-nums">
        {threshold}
      </td>
      <td
        className={`px-2 py-1 text-right font-sans tabular-nums ${deltaClassName}`}>
        {delta}
      </td>
      <td className="px-2 py-1 text-center">{renderAction(action)}</td>
    </tr>
  );
}
