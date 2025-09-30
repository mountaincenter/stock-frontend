// components/stock_list_new/parts/Cells.tsx
import React from "react";

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

/** 前日差（数値のみ、±で色） */
export function DiffBadge({
  diff,
  nf0,
}: {
  diff: number | null;
  nf0: Intl.NumberFormat;
}) {
  if (!isFiniteNumber(diff)) return <span className="text-slate-400">―</span>;
  const cls =
    diff > 0
      ? "text-emerald-300"
      : diff < 0
      ? "text-rose-300"
      : "text-slate-300";
  return (
    <span className={cls}>
      {diff > 0 ? "+" : ""}
      {nf0.format(diff)}
    </span>
  );
}

/** 終値など整数表示 */
export function CloseCell({
  v,
  nf0,
}: {
  v: number | null;
  nf0: Intl.NumberFormat;
}) {
  return !isFiniteNumber(v) ? (
    <span className="text-slate-400">―</span>
  ) : (
    <span className="font-mono">{nf0.format(v)}</span>
  );
}

/** 出来高など整数表示 */
export function NumCell({
  v,
  nf0,
}: {
  v: number | null;
  nf0: Intl.NumberFormat;
}) {
  return !isFiniteNumber(v) ? (
    <span className="text-slate-400">―</span>
  ) : (
    <span className="font-mono">{nf0.format(v)}</span>
  );
}

/** パフォーマンス（%表示、±で色） */
export function PerfCell({
  v,
  nf2,
}: {
  v: number | null;
  nf2: Intl.NumberFormat;
}) {
  if (!isFiniteNumber(v)) return <span className="text-slate-400">—</span>;
  const cls =
    v > 0 ? "text-emerald-300" : v < 0 ? "text-rose-300" : "text-slate-300";
  const sign = v > 0 ? "+" : "";
  return (
    <span className={cls}>
      {sign}
      {nf2.format(v)}%
    </span>
  );
}
