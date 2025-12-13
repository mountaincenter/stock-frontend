// components/stock_list_new/tables/technical/TechnicalTableDesktop.tsx
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
  Row,
} from "../../types";
import type { DisplayDensity } from "../../types/density";
import { getDensityStyles, DENSITY_VALUES } from "../../types/density";
import type { SortDirection, TechSortKey } from "../../utils/sort";
import { TECH_SORT_COLUMNS } from "../../utils/sort";
import { SortButtonGroup } from "../../parts/SortButtonGroup";
import { CustomTooltip } from "../../parts/CustomTooltip";
import { GrokTags } from "../../parts/GrokTags";

type Props = {
  rows: TechCoreRow[];
  nf2: Intl.NumberFormat;
  // 追加: v2 の判定結果（任意）
  decisionByTicker?: Record<string, TechDecisionItem>;
  sortKey: TechSortKey | null;
  direction: SortDirection;
  onSort: (key: TechSortKey, direction: SortDirection) => void;
  priceDataByTicker?: Record<string, Row>;
  density?: DisplayDensity;
};

/**
 * テクニカルの列幅（フレキシブル版）
 * 1:コード(110固定) 2:銘柄名(min240,1.2fr) 3:日付(110固定)
 * 4〜7: 評価4列(各min90,1fr) 8〜11: KPI4列(各min85,1fr)
 */
const COLS_TECH = "110px minmax(240px, 1.2fr) 110px minmax(90px, 1fr) minmax(90px, 1fr) minmax(90px, 1fr) minmax(90px, 1fr) minmax(85px, 1fr) minmax(85px, 1fr) minmax(85px, 1fr) minmax(85px, 1fr)";

const INITIAL_DISPLAY_COUNT = 50; // 初期表示件数
const LOAD_MORE_COUNT = 50; // 追加読み込み件数

function toneBySign(v: number | null | undefined) {
  if (typeof v !== "number" || !Number.isFinite(v) || v === 0)
    return "text-card-foreground";
  return v > 0 ? "text-[rgb(76,175,80)]" : "text-[rgb(244,67,54)]";
}
function fmt(v: number | null | undefined, f: Intl.NumberFormat, suffix = "") {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  return `${f.format(v)}${suffix}`;
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
        tone: "text-[rgb(76,175,80)]",
      };
    case "売り":
      return {
        icon: <ChevronDown className="w-4 h-4 stroke-[2.25]" />,
        tone: "text-[rgb(244,67,54)]",
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
    <div
      className={`flex items-center justify-center gap-1 ${tone} text-sm font-semibold leading-none whitespace-nowrap`}
      title={title}
    >
      {icon}
      <span className="text-sm">{label}</span>
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
    bb_percent_b: v.percent_b ?? null, // ← v2 は percent_b
    sma25_dev_pct: v.sma25_dev_pct ?? null,
  };
}

// 行コンポーネントをメモ化
const TechnicalRow = React.memo(({
  row,
  nf2,
  decisionByTicker,
  priceDataByTicker,
  density = "normal"
}: {
  row: TechCoreRow;
  nf2: Intl.NumberFormat;
  decisionByTicker?: Record<string, TechDecisionItem>;
  priceDataByTicker?: Record<string, Row>;
  density?: DisplayDensity;
}) => {
  const r = row;
  const d: TechDecisionItem | undefined = decisionByTicker
    ? decisionByTicker[r.ticker]
    : undefined;

  const densityValues = DENSITY_VALUES[density];
  const densityStyles = getDensityStyles(density);
  const paddingY = `${densityValues.rowPaddingY}rem`;

  // ラベルは v2 があれば優先、なければ従来 rows
  const overallLabel = d?.overall?.label ?? r.overall_rating;
  const techLabel = d?.votes?.["tech"]?.label ?? r.tech_rating;
  const maLabel = d?.votes?.["ma"]?.label ?? r.ma_rating;
  const ichiLabel = d?.votes?.["ichimoku"]?.label ?? r.ichimoku_rating;

  // 数値は v2 があれば優先
  const core = pickCoreValues(d?.values);
  const rsi14 = core.rsi14 ?? r.rsi14;
  const macd = core.macd_hist ?? r.macd_hist;
  const pb = core.bb_percent_b ?? r.bb_percent_b;
  const dev = core.sma25_dev_pct ?? r.sma25_dev_pct;

  // 価格データを取得
  const priceData = priceDataByTicker?.[r.ticker];
  const nf0 = React.useMemo(() => new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 }), []);
  const nf1Local = React.useMemo(() => new Intl.NumberFormat("ja-JP", { minimumFractionDigits: 1, maximumFractionDigits: 1 }), []);

  // 価格差を計算
  const priceDiff = priceData?.close != null && priceData?.prevClose != null
    ? priceData.close - priceData.prevClose
    : null;

  // 前日差の文字列を生成
  const diffText = React.useMemo(() => {
    if (priceDiff == null || priceData?.pct_diff == null) return "—";
    const sign = priceDiff > 0 ? "+" : "";
    const priceStr = `${sign}${nf0.format(priceDiff)}円`;
    const pctSign = priceData.pct_diff > 0 ? "+" : "";
    const pctStr = `${pctSign}${nf1Local.format(priceData.pct_diff)}%`;
    return `${priceStr} (${pctStr})`;
  }, [priceDiff, priceData?.pct_diff, nf0, nf1Local]);

  // Grok銘柄の判定
  const isGrokStock = r.categories?.includes("GROK") ?? false;

  const tooltipContent = (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">前日終値:</span>
        <span className="font-semibold tabular-nums">
          {priceData?.prevClose != null ? `¥${nf0.format(priceData.prevClose)}` : "—"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">前日差:</span>
        <span className={`font-semibold tabular-nums ${
          priceDiff == null ? "" :
          priceDiff > 0 ? "text-[rgb(76,175,80)]" :
          priceDiff < 0 ? "text-[rgb(244,67,54)]" : ""
        }`}>
          {diffText}
        </span>
      </div>
    </div>
  );

  return (
    <CustomTooltip content={tooltipContent}>
      <Link
        href={`/${encodeURIComponent(r.ticker)}`}
        className="group/row block rounded-xl bg-gradient-to-r from-card/50 via-card/80 to-card/50 text-card-foreground transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 hover:bg-gradient-to-r hover:from-card/70 hover:via-card/95 hover:to-card/70"
        style={{
          display: "grid",
          gridTemplateColumns: COLS_TECH,
          columnGap: `${densityValues.columnGap}px`,
        }}
      >
          {/* 先頭3列 */}
          <div className="px-3 flex items-center" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
            <span className={`font-sans tabular-nums font-semibold ${densityStyles.fontSize.code}`}>
              {r.code ?? r.ticker}
            </span>
          </div>
          <div className="px-3 min-w-0 flex flex-col justify-center gap-1" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
            <h3 className={`font-semibold ${densityStyles.fontSize.stockName} leading-snug hover:text-primary transition-colors line-clamp-1`}>
              {r.stock_name}
            </h3>
            {isGrokStock && <GrokTags tags={r.tags} selectionScore={r.selection_score} />}
          </div>
          <div className="px-3 flex items-center justify-center" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
            <span className={`${densityStyles.fontSize.date} font-sans tabular-nums text-muted-foreground`}>
              {d?.date ?? r.date ?? "—"}
            </span>
          </div>

      {/* 評価4（均等割） */}
      <div className="px-2" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
        <RatingInline label={overallLabel} title="総合評価" />
      </div>
      <div className="px-2" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
        <RatingInline label={techLabel} title="テクニカル評価" />
      </div>
      <div className="px-2" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
        <RatingInline label={maLabel} title="MA評価" />
      </div>
      <div className="px-2" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
        <RatingInline label={ichiLabel} title="一目均衡表評価" />
      </div>

      {/* KPI4（均等割・Perf と同じ text-base） */}
      <div className="px-3 text-right flex items-center justify-end" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
        <span className={`font-sans tabular-nums ${densityStyles.fontSize.data}`}>
          {fmt(rsi14, nf1Local)}
        </span>
      </div>
      <div className="px-3 text-right flex items-center justify-end" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
        <span
          className={`font-sans tabular-nums ${densityStyles.fontSize.data} ${toneBySign(
            macd
          )}`}
        >
          {fmt(macd, nf2)}
        </span>
      </div>
      <div className="px-3 text-right flex items-center justify-end" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
        <span className={`font-sans tabular-nums ${densityStyles.fontSize.data}`}>
          {fmt(pb, nf2)}
        </span>
      </div>
      <div className="px-3 text-right flex items-center justify-end" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
        <span
          className={`font-sans tabular-nums ${densityStyles.fontSize.data} ${toneBySign(
            dev
          )}`}
        >
          {fmt(dev, nf1Local, "%")}
        </span>
      </div>
      </Link>
    </CustomTooltip>
  );
});

TechnicalRow.displayName = 'TechnicalRow';

export default function TechnicalTableDesktop({
  rows,
  nf2,
  decisionByTicker,
  sortKey,
  direction,
  onSort,
  priceDataByTicker,
  density = "normal",
}: Props) {
  const [displayCount, setDisplayCount] = React.useState(INITIAL_DISPLAY_COUNT);
  const densityValues = DENSITY_VALUES[density];

  // 表示する行を制限
  const displayedRows = React.useMemo(() => {
    return rows.slice(0, displayCount);
  }, [rows, displayCount]);

  const hasMore = displayCount < rows.length;

  const loadMore = React.useCallback(() => {
    setDisplayCount(prev => Math.min(prev + LOAD_MORE_COUNT, rows.length));
  }, [rows.length]);

  // rowsが変わったら表示件数をリセット
  React.useEffect(() => {
    setDisplayCount(INITIAL_DISPLAY_COUNT);
  }, [rows]);

  if (!rows?.length)
    return (
      <div className="text-muted-foreground text-xs px-2 py-3.5">
        データがありません
      </div>
    );

  return (
    <div className={`${DENSITY_VALUES[density].rowSpacing === 0.5 ? 'space-y-2' : DENSITY_VALUES[density].rowSpacing === 0.625 ? 'space-y-2.5' : 'space-y-3'}`}>
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
          columnGap: `${densityValues.columnGap}px`,
        }}
      >
        <SortButtonGroup
          columnKey="code"
          label="コード"
          activeKey={sortKey}
          direction={direction}
          onSort={onSort}
          align="left"
          defaultAscending={true}
        />
        <SortButtonGroup
          columnKey="stock_name"
          label="銘柄名"
          activeKey={sortKey}
          direction={direction}
          onSort={onSort}
          align="left"
          defaultAscending={true}
        />
        <SortButtonGroup
          columnKey="date"
          label="日付"
          activeKey={sortKey}
          direction={direction}
          onSort={onSort}
          align="center"
        />
        {TECH_SORT_COLUMNS.map((column) => (
          <SortButtonGroup
            key={column.key}
            columnKey={column.key}
            label={column.label}
            activeKey={sortKey}
            direction={direction}
            onSort={onSort}
            align={column.align ?? "right"}
            tooltip={column.tooltip}
          />
        ))}
      </div>

      {/* テーブル行 */}
      {displayedRows.map((r) => (
        <TechnicalRow
          key={r.ticker}
          row={r}
          nf2={nf2}
          decisionByTicker={decisionByTicker}
          priceDataByTicker={priceDataByTicker}
          density={density}
        />
      ))}

      {/* もっと見るボタン */}
      {hasMore && (
        <div className="flex justify-center py-4">
          <button
            onClick={loadMore}
            className="px-6 py-2 text-sm font-medium text-foreground bg-muted/30 hover:bg-muted/50 border border-border/40 rounded-lg transition-all duration-200 hover:shadow-md"
          >
            もっと見る ({rows.length - displayCount}件)
          </button>
        </div>
      )}
    </div>
  );
}
