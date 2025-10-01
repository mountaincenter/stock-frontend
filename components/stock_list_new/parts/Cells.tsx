// components/stock_list_new/parts/Cells.tsx
import React from "react";

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

const cx = (...xs: Array<string | false | undefined>) =>
  xs.filter(Boolean).join(" ");

/** 値の符号に応じた色（+緑 / -赤 / 0=グレー） */
const toneBySign = (v: number) =>
  v > 0 ? "text-emerald-300" : v < 0 ? "text-rose-300" : "text-slate-300";

/** パーセントの賢い丸め： 10%以上=小数0, 1%以上=小数1, それ未満=小数2 */
function formatPctSmart(v: number) {
  const a = Math.abs(v);
  const max = a >= 10 ? 0 : a >= 1 ? 1 : 2;
  return new Intl.NumberFormat("ja-JP", {
    minimumFractionDigits: 0,
    maximumFractionDigits: max,
  }).format(v);
}

/** 共通：不正値のダッシュ表示 */
function Dash({ className }: { className?: string }) {
  return <span className={cx("text-slate-400", className)}>—</span>;
}

/** 前日差（数値のみ、±で色） */
export function DiffBadge({
  diff,
  nf0,
  className,
  fixedWidthCh,
}: {
  diff: number | null;
  nf0: Intl.NumberFormat;
  className?: string;
  /** 右寄せ桁揃えをしたい場合に min-width を `ch` 単位で付与 */
  fixedWidthCh?: number;
}) {
  if (!isFiniteNumber(diff)) return <Dash className={className} />;
  const style = fixedWidthCh
    ? ({ minWidth: `${fixedWidthCh}ch` } as const)
    : undefined;
  return (
    <span
      className={cx(toneBySign(diff), "font-mono tabular-nums", className)}
      style={style}
    >
      {diff > 0 ? "+" : ""}
      {nf0.format(diff)}
    </span>
  );
}

/** 終値など整数表示 */
export function CloseCell({
  v,
  nf0,
  className,
  fixedWidthCh,
}: {
  v: number | null;
  nf0: Intl.NumberFormat;
  className?: string;
  fixedWidthCh?: number;
}) {
  if (!isFiniteNumber(v)) return <Dash className={className} />;
  const style = fixedWidthCh
    ? ({ minWidth: `${fixedWidthCh}ch` } as const)
    : undefined;
  return (
    <span
      className={cx("font-mono tabular-nums text-slate-50", className)}
      style={style}
    >
      {nf0.format(v)}
    </span>
  );
}

/** 出来高など整数表示 */
export function NumCell({
  v,
  nf0,
  className,
  fixedWidthCh,
}: {
  v: number | null;
  nf0: Intl.NumberFormat;
  className?: string;
  fixedWidthCh?: number;
}) {
  if (!isFiniteNumber(v)) return <Dash className={className} />;
  const style = fixedWidthCh
    ? ({ minWidth: `${fixedWidthCh}ch` } as const)
    : undefined;
  return (
    <span
      className={cx("font-mono tabular-nums text-slate-100", className)}
      style={style}
    >
      {nf0.format(v)}
    </span>
  );
}

/** パフォーマンス（%表示、±で色） */
export function PerfCell({
  v,
  nf2,
  smart = true,
  className,
  fixedWidthCh,
}: {
  v: number | null;
  nf2: Intl.NumberFormat; // 従来との互換のため残置
  smart?: boolean; // 既定: 賢い丸め（true）
  className?: string;
  fixedWidthCh?: number;
}) {
  if (!isFiniteNumber(v)) return <Dash className={className} />;
  const style = fixedWidthCh
    ? ({ minWidth: `${fixedWidthCh}ch` } as const)
    : undefined;
  const body = smart ? formatPctSmart(v) : nf2.format(v);
  return (
    <span
      className={cx("font-mono tabular-nums", toneBySign(v), className)}
      style={style}
    >
      {v > 0 ? "+" : ""}
      {body}%
    </span>
  );
}
