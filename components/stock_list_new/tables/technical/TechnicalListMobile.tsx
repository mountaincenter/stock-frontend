// components/stock_list_new/tables/mobile/TechnicalListMobile.tsx
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

type Props = {
  rows: TechCoreRow[];
  nf2: Intl.NumberFormat; // %b・MACD Hist（2桁）
};

// RSI/乖離% は 1桁
const nf1 = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function toneBySign(v: number | null | undefined) {
  if (typeof v !== "number" || !Number.isFinite(v) || v === 0)
    return "text-card-foreground";
  return v > 0 ? "text-emerald-400" : "text-rose-400";
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
    // KPI 値と同じタイポ（text-sm font-semibold）
    <div
      className={`flex items-center justify-center gap-1 ${tone} text-sm font-semibold leading-none`}
      title={title}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

function Kpi({
  value,
  fmt,
  suffix = "",
  coloredBySign = false,
  alignRight = false,
}: {
  value: number | null | undefined;
  fmt: Intl.NumberFormat;
  suffix?: string;
  coloredBySign?: boolean;
  alignRight?: boolean;
}) {
  const tone = coloredBySign ? toneBySign(value) : "text-card-foreground";
  const isNum = typeof value === "number" && Number.isFinite(value);
  return (
    <div
      className={`font-sans tabular-nums text-sm font-semibold ${tone} ${
        alignRight ? "text-right" : "text-center"
      }`}
    >
      {isNum ? (
        <>
          {fmt.format(value as number)}
          {suffix && <span className="text-muted-foreground">{suffix}</span>}
        </>
      ) : (
        "—"
      )}
    </div>
  );
}

export default function TechnicalListMobile({ rows, nf2 }: Props) {
  if (!rows?.length) {
    return (
      <div className="text-muted-foreground text-sm px-2 py-3">
        データがありません
      </div>
    );
  }

  // 4列：縦線は控えめトーンで統一
  const ROW = "grid grid-cols-4 gap-0 divide-x divide-border/60";
  const CELL = "px-2 py-2"; // 高さを揃える

  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => (
        <Link
          key={r.ticker}
          href={`/${encodeURIComponent(r.ticker)}`}
          className="
            block rounded-xl border border-border
            bg-card text-card-foreground
            hover:border-primary/50 transition-colors
          "
        >
          <div className="px-3 py-3">
            {/* 見出し */}
            <div className="min-w-0 text-left">
              <h3
                className="
                  font-semibold leading-tight text-card-foreground
                  [font-size:clamp(13px,4.2vw,15px)]
                  line-clamp-1
                "
                title={r.stock_name}
              >
                {r.stock_name}
              </h3>
              <div className="mt-0.5 text-[11px] text-muted-foreground font-sans tabular-nums">
                {r.code ?? r.ticker} {r.date ? ` ${r.date}` : " —"}
              </div>
            </div>

            {/* ── 評価ヘッダ（中央寄せ） */}
            <div className={`mt-2 ${ROW}`}>
              {["総合", "テクニカル", "MA", "一目"].map((h) => (
                <div
                  key={h}
                  className={`${CELL} text-center text-[11px] text-muted-foreground`}
                >
                  {h}
                </div>
              ))}
            </div>

            {/* 評価（中央寄せ・枠なし） */}
            <div className={`${ROW}`}>
              <div className={CELL}>
                <RatingInline label={r.overall_rating} title="総合評価" />
              </div>
              <div className={CELL}>
                <RatingInline label={r.tech_rating} title="テクニカル評価" />
              </div>
              <div className={CELL}>
                <RatingInline label={r.ma_rating} title="MA評価" />
              </div>
              <div className={CELL}>
                <RatingInline
                  label={r.ichimoku_rating}
                  title="一目均衡表評価"
                />
              </div>
            </div>

            {/* ── KPIヘッダ（中央寄せ） */}
            <div className={`mt-2 ${ROW}`}>
              {["RSI(14)", "%b", "MACD Hist", "乖離%(25)"].map((h) => (
                <div
                  key={h}
                  className={`${CELL} text-center text-[11px] text-muted-foreground`}
                >
                  {h}
                </div>
              ))}
            </div>

            {/* KPI（右寄せ） */}
            <div className={`${ROW}`}>
              <div className={CELL}>
                <Kpi value={r.rsi14} fmt={nf1} alignRight />
              </div>
              <div className={CELL}>
                <Kpi value={r.bb_percent_b} fmt={nf2} alignRight />
              </div>
              <div className={CELL}>
                <Kpi value={r.macd_hist} fmt={nf2} coloredBySign alignRight />
              </div>
              <div className={CELL}>
                <Kpi
                  value={r.sma25_dev_pct}
                  fmt={nf1}
                  suffix="%"
                  coloredBySign
                  alignRight
                />
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
