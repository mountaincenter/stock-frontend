// components/stock_list_new/tables/technical/TechnicalListMobile.tsx
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
import type {
  TechCoreRow,
  RatingLabel,
  TechDecisionItem,
  TechDecisionValues,
} from "../../types";

type Props = {
  rows: TechCoreRow[];
  nf2: Intl.NumberFormat; // %b・MACD Hist（2桁）
  decisionByTicker?: Record<string, TechDecisionItem>;
};

// RSI/乖離% は 1桁
const nf1 = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function toneBySign(v: number | null | undefined) {
  if (typeof v !== "number" || !Number.isFinite(v) || v === 0)
    return "text-card-foreground";
  return v > 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500";
}

function ratingVisual(label: RatingLabel) {
  switch (label) {
    case "強い買い":
      return {
        icon: <ChevronsUp className="w-4 h-4 stroke-[2.25]" />,
        tone: "text-emerald-500 dark:text-emerald-300",
      };
    case "買い":
      return {
        icon: <ChevronUp className="w-4 h-4 stroke-[2.25]" />,
        tone: "text-green-600 dark:text-green-500",
      };
    case "売り":
      return {
        icon: <ChevronDown className="w-4 h-4 stroke-[2.25]" />,
        tone: "text-red-600 dark:text-red-500",
      };
    case "強い売り":
      return {
        icon: <ChevronsDown className="w-4 h-4 stroke-[2.25]" />,
        tone: "text-red-500 dark:text-red-300",
      };
    default:
      return {
        icon: <Minus className="w-4 h-4 stroke-[2.25]" />,
        tone: "text-muted-foreground",
      };
  }
}

function RatingInline({ label, title }: { label: RatingLabel; title: string }) {
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

// v2 の数値 → 既存キーへマッピング（%b のみ名称差異）
function pickCoreValues(v?: TechDecisionValues | null) {
  if (!v)
    return {
      rsi14: null,
      macd_hist: null,
      bb_percent_b: null,
      sma25_dev_pct: null,
    };
  return {
    rsi14: v.rsi14 ?? null,
    macd_hist: v.macd_hist ?? null,
    bb_percent_b: v.percent_b ?? null,
    sma25_dev_pct: v.sma25_dev_pct ?? null,
  };
}

export default function TechnicalListMobile({
  rows,
  nf2,
  decisionByTicker,
}: Props) {
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
    <div className="flex flex-col gap-1.5">
      {rows.map((r) => {
        const d: TechDecisionItem | undefined = decisionByTicker
          ? decisionByTicker[r.ticker]
          : undefined;

        // ラベル優先
        const overallLabel: RatingLabel =
          (d?.overall?.label as RatingLabel) ?? r.overall_rating;
        const techLabel: RatingLabel =
          (d?.votes?.["tech"]?.label as RatingLabel) ?? r.tech_rating;
        const maLabel: RatingLabel =
          (d?.votes?.["ma"]?.label as RatingLabel) ?? r.ma_rating;
        const ichiLabel: RatingLabel =
          (d?.votes?.["ichimoku"]?.label as RatingLabel) ?? r.ichimoku_rating;

        // 数値優先
        const core = pickCoreValues(d?.values);
        const rsi14 = core.rsi14 ?? r.rsi14;
        const macd = core.macd_hist ?? r.macd_hist;
        const pb = core.bb_percent_b ?? r.bb_percent_b;
        const dev = core.sma25_dev_pct ?? r.sma25_dev_pct;

        return (
          <Link
            key={r.ticker}
            href={`/${encodeURIComponent(r.ticker)}`}
            className="
            inline-block w-full rounded-xl
            bg-card text-card-foreground
            hover:shadow-lg hover:shadow-primary/5 active:bg-muted/60
            transition-all duration-150
            touch-manipulation
          "
          >
            <div className="px-3 py-2.5">
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
                  {r.code ?? r.ticker}{" "}
                  {d?.date ? ` ${d.date}` : r.date ? ` ${r.date}` : " —"}
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
                  <RatingInline label={overallLabel} title="総合評価" />
                </div>
                <div className={CELL}>
                  <RatingInline label={techLabel} title="テクニカル評価" />
                </div>
                <div className={CELL}>
                  <RatingInline label={maLabel} title="MA評価" />
                </div>
                <div className={CELL}>
                  <RatingInline label={ichiLabel} title="一目均衡表評価" />
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
                  <Kpi value={rsi14} fmt={nf1} alignRight />
                </div>
                <div className={CELL}>
                  <Kpi value={pb} fmt={nf2} alignRight />
                </div>
                <div className={CELL}>
                  <Kpi value={macd} fmt={nf2} coloredBySign alignRight />
                </div>
                <div className={CELL}>
                  <Kpi
                    value={dev}
                    fmt={nf1}
                    suffix="%"
                    coloredBySign
                    alignRight
                  />
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
