// components/stock_list_new/tables/PerfTableDesktop.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import type { Row } from "../../types";
import type { DisplayDensity } from "../../types/density";
import { getDensityStyles, DENSITY_VALUES } from "../../types/density";
import { PerfCell } from "../../parts/Cells";
import type { PerfSortKey, SortDirection } from "../../utils/sort";
import { PERF_SORT_COLUMNS } from "../../utils/sort";
import { SortButtonGroup } from "../../parts/SortButtonGroup";
import { CustomTooltip } from "../../parts/CustomTooltip";
import { GrokTags } from "../../parts/GrokTags";

/**
 * 列幅（フレキシブル版）:
 * 1:コード(110固定) 2:銘柄名(min240,1.2fr) 3:日付(110固定)
 * 4〜11: パフォーマンス8カラム(各min85,1fr)
 */
const COLS_PERF = "110px minmax(240px, 1.2fr) 110px minmax(85px, 1fr) minmax(85px, 1fr) minmax(85px, 1fr) minmax(85px, 1fr) minmax(85px, 1fr) minmax(85px, 1fr) minmax(85px, 1fr) minmax(85px, 1fr)";

const INITIAL_DISPLAY_COUNT = 50; // 初期表示件数
const LOAD_MORE_COUNT = 50; // 追加読み込み件数

type Props = {
  rows: Row[];
  nf2: Intl.NumberFormat;
  sortKey: PerfSortKey | null;
  direction: SortDirection;
  onSort: (key: PerfSortKey, direction: SortDirection) => void;
  density?: DisplayDensity;
};

// 行コンポーネントをメモ化
const PerfRow = React.memo(({
  row,
  nf2,
  density = "normal"
}: {
  row: Row;
  nf2: Intl.NumberFormat;
  density?: DisplayDensity;
}) => {
  const r = row;
  const nf0 = React.useMemo(() => new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 }), []);
  const nf1 = React.useMemo(() => new Intl.NumberFormat("ja-JP", { minimumFractionDigits: 1, maximumFractionDigits: 1 }), []);

  const densityValues = DENSITY_VALUES[density];
  const densityStyles = getDensityStyles(density);
  const paddingY = `${densityValues.rowPaddingY}rem`;

  // 価格差を計算
  const priceDiff = r.close != null && r.prevClose != null ? r.close - r.prevClose : null;

  // 前日差の文字列を生成
  const diffText = React.useMemo(() => {
    if (priceDiff == null || r.pct_diff == null) return "—";
    const sign = priceDiff > 0 ? "+" : "";
    const priceStr = `${sign}${nf0.format(priceDiff)}円`;
    const pctSign = r.pct_diff > 0 ? "+" : "";
    const pctStr = `${pctSign}${nf1.format(r.pct_diff)}%`;
    return `${priceStr} (${pctStr})`;
  }, [priceDiff, r.pct_diff, nf0, nf1]);

  // Grok銘柄の判定
  const isGrokStock = r.categories?.includes("GROK") ?? false;

  const tooltipContent = (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">前日終値:</span>
        <span className="font-semibold tabular-nums">
          {r.prevClose != null ? `¥${nf0.format(r.prevClose)}` : "—"}
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
        className="group/row block rounded-xl bg-gradient-to-r from-card/50 via-card/80 to-card/50 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 hover:bg-gradient-to-r hover:from-card/70 hover:via-card/95 hover:to-card/70"
        style={{
          display: "grid",
          gridTemplateColumns: COLS_PERF,
          columnGap: `${densityValues.columnGap}px`,
        }}
      >
          {/* 先頭3列 */}
          <div className="px-3 flex items-center" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
            <span className={`font-sans tabular-nums font-semibold text-card-foreground ${densityStyles.fontSize.code}`}>
              {r.code}
            </span>
          </div>
          <div className="px-3 min-w-0 flex flex-col justify-center gap-1" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
            <h3 className={`font-semibold text-card-foreground ${densityStyles.fontSize.stockName} leading-snug hover:text-primary transition-colors line-clamp-1`}>
              {r.stock_name}
            </h3>
            {isGrokStock && <GrokTags tags={r.tags} selectionScore={r.selection_score} />}
          </div>
          <div className="px-3 flex items-center justify-center" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
            <span className={`${densityStyles.fontSize.date} font-sans tabular-nums text-muted-foreground`}>
              {r.date ?? "—"}
            </span>
          </div>

      {/* パフォーマンス（均等割・右寄せの数値） */}
      <div className="px-3 text-right flex items-center justify-end" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
        <PerfCell v={r.r_5d} nf2={nf2} />
      </div>
      <div className="px-3 text-right flex items-center justify-end" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
        <PerfCell v={r.r_1mo} nf2={nf2} />
      </div>
      <div className="px-3 text-right flex items-center justify-end" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
        <PerfCell v={r.r_3mo} nf2={nf2} />
      </div>
      <div className="px-3 text-right flex items-center justify-end" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
        <PerfCell v={r.r_ytd} nf2={nf2} />
      </div>
      <div className="px-3 text-right flex items-center justify-end" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
        <PerfCell v={r.r_1y} nf2={nf2} />
      </div>
      <div className="px-3 text-right flex items-center justify-end" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
        <PerfCell v={r.r_3y} nf2={nf2} />
      </div>
      <div className="px-3 text-right flex items-center justify-end" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
        <PerfCell v={r.r_5y} nf2={nf2} />
      </div>
      <div className="px-3 text-right flex items-center justify-end" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
        <PerfCell v={r.r_all} nf2={nf2} />
      </div>
      </Link>
    </CustomTooltip>
  );
});

PerfRow.displayName = 'PerfRow';

export default function PerfTableDesktop({
  rows,
  nf2,
  sortKey,
  direction,
  onSort,
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

  return (
    <div className={`${DENSITY_VALUES[density].rowSpacing === 0.5 ? 'space-y-2' : DENSITY_VALUES[density].rowSpacing === 0.625 ? 'space-y-2.5' : 'space-y-3'}`}>
      {/* ヘッダ */}
      <div
        className="
          px-3 py-2 text-muted-foreground text-xs font-medium
          border-b border-border sticky top-0 z-20
          bg-card/85 backdrop-blur supports-[backdrop-filter]:bg-card/60
        "
        style={{
          display: "grid",
          gridTemplateColumns: COLS_PERF,
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
        {PERF_SORT_COLUMNS.map((column) => (
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
        <PerfRow key={r.ticker} row={r} nf2={nf2} density={density} />
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
