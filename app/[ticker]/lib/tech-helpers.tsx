import React from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  Minus,
} from "lucide-react";
import type { RatingLabel5, RatingLabel3 } from "./types";

/* ======================= 数値表示 ======================= */
export const nf0 = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 });
export const nf1 = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
export const nf2 = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatNumber(
  v: number | null | undefined,
  formatter: Intl.NumberFormat = nf0,
  suffix = ""
): string {
  if (v == null || !Number.isFinite(v)) {
    return "—";
  }
  return `${formatter.format(v)}${suffix}`;
}

export function toneBySign(v: number | null | undefined): string {
  if (typeof v !== "number" || !Number.isFinite(v) || v === 0)
    return "text-muted-foreground";
  return v > 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500";
}

/* ======================= 判定ラベル → アイコン＋色 ======================= */
/** 色は「買い系=緑 / 売り系=赤 / 中立・データなし=ミュート」。強弱で色は変えない */
export function colorClassByLabel(
  label: RatingLabel5 | RatingLabel3 | "データなし"
): string {
  if (label === "強い買い" || label === "買い") return "text-green-600 dark:text-green-500";
  if (label === "強い売り" || label === "売り") return "text-red-600 dark:text-red-500";
  return "text-muted-foreground";
}

export function iconByLabel(label: RatingLabel5 | RatingLabel3 | "データなし") {
  const cls = "inline-block align-[-2px] mr-1 w-3.5 h-3.5";
  if (label === "強い買い") return <ChevronsUp className={cls} />;
  if (label === "買い") return <ChevronUp className={cls} />;
  if (label === "強い売り") return <ChevronsDown className={cls} />;
  if (label === "売り") return <ChevronDown className={cls} />;
  return <Minus className={cls} />;
}

export function renderAction(label: RatingLabel5 | RatingLabel3 | "データなし") {
  return (
    <span className={`inline-flex items-center ${colorClassByLabel(label)}`}>
      {iconByLabel(label)}
      {label}
    </span>
  );
}

// v is null, undefined, or non-finite number
export function na<T>(v: T | null | undefined): v is null | undefined {
  return v == null || (typeof v === "number" && !Number.isFinite(v as number));
}

/* ===== 閾値と乖離（血液検査票スタイル） ===== */
export function nearestDelta(
  value: number,
  a: number,
  b?: number
): { ref: string; delta: number } {
  if (b == null || !Number.isFinite(b)) {
    return { ref: nf2.format(a), delta: value - a };
  }
  const da = Math.abs(value - a);
  const db = Math.abs(value - b);
  const refv = da <= db ? a : b;
  return { ref: `${nf2.format(a)} / ${nf2.format(b)}`, delta: value - refv };
}
