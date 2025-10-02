// components/stock_list_new/tables/TechnicalTableDesktop.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  Minus,
} from "lucide-react";
import type { TechCoreRow } from "../../types";

type Props = { rows: TechCoreRow[]; nf2: Intl.NumberFormat };

// 1桁（RSI/乖離）
const nf1 = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/**
 * テクニカルの列幅（基準表）
 * 1:コード(110) 2:銘柄名(300) 3:日付(110)
 * 4〜11: 評価/KPI 8カラムを均等割付け
 */
const COLS_TECH = "110px 300px 110px repeat(8, minmax(84px, 1fr))";

function toneBySign(v: number | null | undefined) {
  if (typeof v !== "number" || !Number.isFinite(v) || v === 0)
    return "text-card-foreground";
  return v > 0 ? "text-emerald-300" : "text-rose-300";
}
function fmt(v: number | null | undefined, f: Intl.NumberFormat, suffix = "") {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  return `${f.format(v)}${suffix}`;
}
function ratingVisual(label: TechCoreRow["tech_rating"]) {
  switch (label) {
    case "強い買い":
      return {
        icon: <ChevronsUp className="w-4 h-4 stroke-[2.25]" />,
        tone: "text-emerald-400",
      };
    case "買い":
      return {
        icon: <ChevronUp className="w-4 h-4 stroke-[2.25]" />,
        tone: "text-emerald-300",
      };
    case "売り":
      return {
        icon: <ChevronDown className="w-4 h-4 stroke-[2.25]" />,
        tone: "text-rose-300",
      };
    case "強い売り":
      return {
        icon: <ChevronsDown className="w-4 h-4 stroke-[2.25]" />,
        tone: "text-rose-400",
      };
    default:
      return {
        icon: <Minus className="w-4 h-4 stroke-[2.25]" />,
        tone: "text-muted-foreground",
      };
  }
}
function RatingInline({
  label,
  title,
}: {
  label: TechCoreRow["tech_rating"];
  title: string;
}) {
  const { icon, tone } = ratingVisual(label);
  return (
    <div
      className={`flex items-center justify-center gap-1 ${tone} text-sm font-semibold leading-none`}
      title={title}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </div>
  );
}

export default function TechnicalTableDesktop({ rows, nf2 }: Props) {
  if (!rows?.length)
    return (
      <div className="text-muted-foreground text-xs px-2 py-3">
        データがありません
      </div>
    );

  return (
    <div className="space-y-2">
      {/* ヘッダ（基準表） */}
      <div
        className="
          px-3 py-2 text-muted-foreground text-xs font-medium
          border-b border-border sticky top-0 z-20
          bg-card/85 backdrop-blur supports-[backdrop-filter]:bg-card/60
        "
        style={{
          display: "grid",
          gridTemplateColumns: COLS_TECH,
          columnGap: "12px",
        }}
      >
        <div>コード</div>
        <div>銘柄名</div>
        <div className="text-center">日付</div>
        <div className="text-center">総合</div>
        <div className="text-center">Tech</div>
        <div className="text-center">MA</div>
        <div className="text-center">一目</div>
        <div className="text-center">RSI(14)</div>
        <div className="text-center">MACD Hist</div>
        <div className="text-center">%b</div>
        <div className="text-center">乖離%(25)</div>
      </div>

      {rows.map((r) => (
        <Link
          key={r.ticker}
          href={`/${encodeURIComponent(r.ticker)}`}
          className="block rounded-lg border border-border bg-card text-card-foreground hover:border-primary/50 transition-colors"
          style={{
            display: "grid",
            gridTemplateColumns: COLS_TECH,
            columnGap: "12px",
          }}
        >
          {/* 先頭3列 */}
          <div className="px-3 py-3 flex items-center">
            <span className="font-sans tabular-nums font-semibold text-base">
              {r.code ?? r.ticker}
            </span>
          </div>
          <div className="px-3 py-3 min-w-0 flex items-center">
            <h3 className="font-semibold text-sm leading-snug hover:text-primary transition-colors line-clamp-1">
              {r.stock_name}
            </h3>
          </div>
          <div className="px-3 py-3 flex items-center justify-center">
            <span className="text-[12px] font-sans tabular-nums text-muted-foreground">
              {r.date ?? "—"}
            </span>
          </div>

          {/* 評価4（均等割） */}
          <div className="px-2 py-3">
            <RatingInline label={r.overall_rating} title="総合評価" />
          </div>
          <div className="px-2 py-3">
            <RatingInline label={r.tech_rating} title="テクニカル評価" />
          </div>
          <div className="px-2 py-3">
            <RatingInline label={r.ma_rating} title="MA評価" />
          </div>
          <div className="px-2 py-3">
            <RatingInline label={r.ichimoku_rating} title="一目均衡表評価" />
          </div>

          {/* KPI4（均等割・Perf と同じ text-base） */}
          <div className="px-3 py-3 text-right">
            <span className="font-sans tabular-nums text-base">
              {fmt(r.rsi14, nf1)}
            </span>
          </div>
          <div className="px-3 py-3 text-right">
            <span
              className={`font-sans tabular-nums text-base ${toneBySign(
                r.macd_hist
              )}`}
            >
              {fmt(r.macd_hist, nf2)}
            </span>
          </div>
          <div className="px-3 py-3 text-right">
            <span className="font-sans tabular-nums text-base">
              {fmt(r.bb_percent_b, nf2)}
            </span>
          </div>
          <div className="px-3 py-3 text-right">
            <span
              className={`font-sans tabular-nums text-base ${toneBySign(
                r.sma25_dev_pct
              )}`}
            >
              {fmt(r.sma25_dev_pct, nf1, "%")}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
