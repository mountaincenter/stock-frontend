// components/stock_list_new/parts/Cells.tsx
import React from "react";

/* -------- utils -------- */

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

const cx = (...xs: Array<string | false | undefined>) =>
  xs.filter(Boolean).join(" ");

const toneBySign = (v: number) =>
  v > 0 ? "text-emerald-300" : v < 0 ? "text-rose-300" : "text-slate-300";

/** 10%以上=小数0桁, 1%以上=1桁, それ未満=2桁 */
function formatPctSmart(v: number) {
  const a = Math.abs(v);
  const max = a >= 10 ? 0 : a >= 1 ? 1 : 2;
  return new Intl.NumberFormat("ja-JP", {
    minimumFractionDigits: 0,
    maximumFractionDigits: max,
  }).format(v);
}

/* -------- primitives -------- */

function Dash({
  className,
  fixedWidthCh,
  mono = false, // ★ デフォルトを“サンセリフ”へ（金融向け）
}: {
  className?: string;
  fixedWidthCh?: number;
  /** 等幅を使うか（既定: 金融向けサンセリフ） */
  mono?: boolean;
}) {
  const style = fixedWidthCh
    ? ({ minWidth: `${fixedWidthCh}ch` } as const)
    : undefined;
  return (
    <span
      className={cx(
        mono ? "font-mono tabular-nums" : "font-sans tabular-nums",
        "text-slate-400",
        className
      )}
      style={style}
    >
      —
    </span>
  );
}

/** 数値セルのベース：金融向け（サンセリフ＋タビュラー）に一本化 */
function NumBase({
  children,
  className,
  fixedWidthCh,
  mono = false, // ★ デフォルトを“サンセリフ”へ
}: {
  children: React.ReactNode;
  className?: string;
  fixedWidthCh?: number;
  mono?: boolean;
}) {
  const style = fixedWidthCh
    ? ({ minWidth: `${fixedWidthCh}ch` } as const)
    : undefined;
  return (
    <span
      className={cx(
        mono ? "font-mono tabular-nums" : "font-sans tabular-nums",
        className
      )}
      style={style}
    >
      {children}
    </span>
  );
}

/* -------- cells -------- */

/** 前日差（数値のみ、±で色） */
export function DiffBadge({
  diff,
  nf0,
  className,
  fixedWidthCh,
  mono = false, // ★ デフォルト変更
}: {
  diff: number | null;
  nf0: Intl.NumberFormat;
  className?: string;
  fixedWidthCh?: number;
  mono?: boolean;
}) {
  if (!isFiniteNumber(diff))
    return (
      <Dash className={className} fixedWidthCh={fixedWidthCh} mono={mono} />
    );

  return (
    <NumBase
      mono={mono}
      fixedWidthCh={fixedWidthCh}
      className={cx(toneBySign(diff), className)}
    >
      {diff > 0 ? "+" : ""}
      {nf0.format(diff)}
    </NumBase>
  );
}

/** 終値など整数表示 */
export function CloseCell({
  v,
  nf0,
  className,
  fixedWidthCh,
  mono = false, // ★ デフォルト変更
}: {
  v: number | null;
  nf0: Intl.NumberFormat;
  className?: string;
  fixedWidthCh?: number;
  mono?: boolean;
}) {
  if (!isFiniteNumber(v))
    return (
      <Dash className={className} fixedWidthCh={fixedWidthCh} mono={mono} />
    );

  return (
    <NumBase
      mono={mono}
      fixedWidthCh={fixedWidthCh}
      className={cx("text-slate-50", className)}
    >
      {nf0.format(v)}
    </NumBase>
  );
}

/** 出来高など整数表示 */
export function NumCell({
  v,
  nf0,
  className,
  fixedWidthCh,
  mono = false, // ★ デフォルト変更
}: {
  v: number | null;
  nf0: Intl.NumberFormat;
  className?: string;
  fixedWidthCh?: number;
  mono?: boolean;
}) {
  if (!isFiniteNumber(v))
    return (
      <Dash className={className} fixedWidthCh={fixedWidthCh} mono={mono} />
    );

  return (
    <NumBase
      mono={mono}
      fixedWidthCh={fixedWidthCh}
      className={cx("text-slate-100", className)}
    >
      {nf0.format(v)}
    </NumBase>
  );
}

/** パフォーマンス（%表示、±で色） */
export function PerfCell({
  v,
  nf2,
  smart = true,
  className,
  fixedWidthCh,
  mono = false, // ★ デフォルト変更
}: {
  v: number | null;
  nf2: Intl.NumberFormat; // 互換用（smart=false の場合に使用）
  smart?: boolean;
  className?: string;
  fixedWidthCh?: number;
  mono?: boolean;
}) {
  if (!isFiniteNumber(v))
    return (
      <Dash className={className} fixedWidthCh={fixedWidthCh} mono={mono} />
    );

  const body = smart ? formatPctSmart(v) : nf2.format(v);

  return (
    <NumBase
      mono={mono}
      fixedWidthCh={fixedWidthCh}
      className={cx(toneBySign(v), className)}
    >
      {v > 0 ? "+" : ""}
      {body}%
    </NumBase>
  );
}

/* 共有ユーティリティ（必要なら他でも利用） */
export const CellsUtil = {
  isFiniteNumber,
  toneBySign,
  formatPctSmart,
};
