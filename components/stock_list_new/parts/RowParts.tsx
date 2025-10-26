// components/stock_list_new/parts/RowParts.tsx
import React from "react";
import Link from "next/link";

/** 行全体をクリック可能にする共通ラッパ（Link + 共通クラス） */
export function RowCardLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="
        block premium-card rounded-xl
        border border-border
        bg-card text-card-foreground
        hover:border-primary/50 hover:scale-[1.02]
        transition-all duration-200
      "
    >
      {children}
    </Link>
  );
}

/** 銘柄の上部ヘッダー（コード/日付/銘柄名）— モバイル/デスクトップ共通で使用可能 */
export function CodeNameHeader({
  code,
  name,
  date,
  className = "",
  selectionScore,
  selectionRank,
}: {
  code: string;
  name: string;
  date: string | null;
  className?: string;
  selectionScore?: number | null;
  selectionRank?: number | null;
}) {
  const isTop5 = selectionRank != null && selectionRank <= 5;
  const showScore = selectionScore != null;

  return (
    <div className={`min-w-0 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="font-mono font-bold text-base text-card-foreground">
          {code}
        </span>
        <span className="text-xs text-muted-foreground">{date ?? "—"}</span>
        {isTop5 && (
          <span className="inline-flex items-center gap-0.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            ⭐ Top5
          </span>
        )}
        {showScore && (
          <span className="text-[10px] font-mono text-muted-foreground/70">
            Score: {selectionScore!.toFixed(1)}
          </span>
        )}
      </div>
      <h3 className="font-semibold text-sm leading-tight mt-0.5 line-clamp-2 text-card-foreground">
        {name}
      </h3>
    </div>
  );
}

/** モバイル用：ラベル付きミニセル（価格タブなどの汎用） */
export function Metric({
  label,
  children,
  align = "right",
}: {
  label: string;
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-sm text-card-foreground">{children}</div>
    </div>
  );
}

/** モバイル用：パフォーマンスの簡易表示（色付き%） */
export function PerfMini({
  label,
  value,
  nf2,
}: {
  label: string;
  value: number | null;
  nf2: Intl.NumberFormat;
}) {
  const isFiniteNumber =
    typeof value === "number" && Number.isFinite(value as number);
  const cls = !isFiniteNumber
    ? "text-muted-foreground"
    : value! > 0
    ? "text-[rgb(76,175,80)]"
    : value! < 0
    ? "text-[rgb(244,67,54)]"
    : "text-muted-foreground";
  const sign = isFiniteNumber && value! > 0 ? "+" : "";
  return (
    <div className="text-right">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-sm">
        {!isFiniteNumber ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className={cls}>
            {sign}
            {nf2.format(value as number)}%
          </span>
        )}
      </div>
    </div>
  );
}
