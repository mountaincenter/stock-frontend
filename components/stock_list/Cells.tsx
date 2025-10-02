// components/stock_list/Cells.tsx
import React from "react";

export function DiffBadge({
  diff,
  nf0,
}: {
  diff: number | null;
  base: number | null;
  nf0: Intl.NumberFormat;
  nf2: Intl.NumberFormat;
}) {
  if (diff == null || !isFinite(diff)) {
    return <span>―</span>;
  }
  const cls =
    diff > 0
      ? "text-emerald-300"
      : diff < 0
      ? "text-rose-300"
      : "text-slate-500 dark:text-slate-300"; // ← lightは500、darkは300

  return (
    <span className={cls}>
      {diff > 0 ? "+" : ""}
      {nf0.format(diff)}
    </span>
  );
}

export function CloseCell({
  v,
  nf0,
}: {
  v: number | null;
  nf0: Intl.NumberFormat;
}) {
  return v == null || !isFinite(v) ? (
    <span>―</span>
  ) : (
    <span className="font-mono">{nf0.format(v)}</span>
  );
}

export function NumCell({
  v,
  nf0,
}: {
  v: number | null;
  nf0: Intl.NumberFormat;
}) {
  return v == null || !isFinite(v) ? (
    <span>―</span>
  ) : (
    <span className="font-mono">{nf0.format(v)}</span>
  );
}

export function PerfCell({
  v,
  nf2,
}: {
  v: number | null;
  nf2: Intl.NumberFormat;
}) {
  if (v == null || !isFinite(v)) return <span>—</span>;
  const cls =
    v > 0
      ? "text-emerald-300"
      : v < 0
      ? "text-rose-300"
      : "text-slate-500 dark:text-slate-300"; // ← lightは500、darkは300

  const sign = v > 0 ? "+" : "";
  return (
    <span className={cls}>
      {sign}
      {nf2.format(v)}%
    </span>
  );
}
