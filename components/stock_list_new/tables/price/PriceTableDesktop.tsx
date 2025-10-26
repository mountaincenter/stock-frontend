// components/stock_list_new/tables/PriceTableDesktop.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import type { Row } from "../../types";
import type { DisplayDensity } from "../../types/density";
import { getDensityStyles, DENSITY_VALUES } from "../../types/density";
import { CloseCell, DiffBadge, NumCell } from "../../parts/Cells";
import type { PriceSortKey, SortDirection } from "../../utils/sort";
import { PRICE_SORT_COLUMNS } from "../../utils/sort";
import { SortButtonGroup } from "../../parts/SortButtonGroup";
import { CustomTooltip } from "../../parts/CustomTooltip";
import { GrokTags } from "../../parts/GrokTags";

/**
 * 価格タブ（列順・幅）フレキシブル版
 * 1:コード(110固定) 2:銘柄名(min240,1fr) 3:日付(110固定)
 * 4:終値(min90) 5:前日差(min100) 6:前日差%(min80)
 * 7〜10:TR/ATR系(min80) 11〜12:出来高(min100)
 */
const COLS_PRICE = "110px minmax(240px, 1fr) 110px minmax(90px, 0.9fr) minmax(100px, 1fr) minmax(80px, 0.8fr) minmax(80px, 0.8fr) minmax(80px, 0.8fr) minmax(80px, 0.8fr) minmax(80px, 0.8fr) minmax(100px, 1fr) minmax(100px, 1fr)";

type Props = {
  rows: Row[];
  nf0: Intl.NumberFormat;
  nf2: Intl.NumberFormat;
  sortKey: PriceSortKey | null;
  direction: SortDirection;
  onSort: (key: PriceSortKey, direction: SortDirection) => void;
  density?: DisplayDensity;
};

const INITIAL_DISPLAY_COUNT = 50; // 初期表示件数
const LOAD_MORE_COUNT = 50; // 追加読み込み件数

// 行コンポーネントをメモ化してパフォーマンス向上
const PriceRow = React.memo(({
  row,
  nf0,
  nf2,
  density = "normal"
}: {
  row: Row;
  nf0: Intl.NumberFormat;
  nf2: Intl.NumberFormat;
  density?: DisplayDensity;
}) => {
  const r = row;
  const pct =
    r.diff != null &&
    r.prevClose != null &&
    Number.isFinite(r.diff) &&
    Number.isFinite(r.prevClose) &&
    r.prevClose !== 0
      ? (r.diff / r.prevClose) * 100
      : null;

  const densityValues = DENSITY_VALUES[density];
  const densityStyles = getDensityStyles(density);
  const paddingY = `${densityValues.rowPaddingY}rem`;

  // Grok銘柄の判定とtooltip用のreason取得
  const isGrokStock = r.categories?.includes("GROK") ?? false;
  const grokReason = isGrokStock && r.tags && r.tags.length > 1 ? r.tags[1] : null;

  const rowContent = (
    <Link
        href={`/${encodeURIComponent(r.ticker)}`}
        className="group/row block rounded-xl bg-gradient-to-r from-card/50 via-card/80 to-card/50 text-card-foreground transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 hover:bg-gradient-to-r hover:from-card/70 hover:via-card/95 hover:to-card/70"
        style={{
          display: "grid",
          gridTemplateColumns: COLS_PRICE,
          columnGap: `${densityValues.columnGap}px`,
        }}
      >
        {/* 先頭3列 */}
        <div className="px-3 flex items-center" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
          <span className={`font-sans tabular-nums font-semibold ${densityStyles.fontSize.code}`}>
            {r.code}
          </span>
        </div>
        <div className="px-3 min-w-0 flex flex-col justify-center gap-1" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
          <h3 className={`font-semibold ${densityStyles.fontSize.stockName} leading-snug hover:text-primary transition-colors line-clamp-1`}>
            {r.stock_name}
          </h3>
          {isGrokStock && <GrokTags tags={r.tags} />}
        </div>
        <div className="px-3 flex items-center justify-center" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
          <span className={`${densityStyles.fontSize.date} font-sans tabular-nums text-muted-foreground`}>
            {r.date ?? "—"}
          </span>
        </div>

        {/* 終値 */}
        <div className="px-3 text-right" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
          <CloseCell v={r.close} nf0={nf0} />
        </div>

        {/* 前日差 */}
        <div className="px-3 text-right" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
          <DiffBadge diff={r.diff} nf0={nf0} />
        </div>

        {/* 前日差(%) */}
        <div className="px-3 text-right" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
          {pct == null || !Number.isFinite(pct) ? (
            <span className="text-muted-foreground">―</span>
          ) : (
            <span
              className={
                (pct > 0
                  ? "text-[rgb(76,175,80)]"
                  : pct < 0
                  ? "text-[rgb(244,67,54)]"
                  : "text-muted-foreground") + ` font-bold font-sans tabular-nums ${densityStyles.fontSize.data}`
              }
            >
              {pct > 0 ? "+" : ""}
              {nf2.format(pct)}%
            </span>
          )}
        </div>

        {/* TR */}
        <div className="px-3 text-right" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
          {r.tr == null || !Number.isFinite(r.tr) ? (
            <span className="text-muted-foreground">―</span>
          ) : (
            <span className={`font-sans tabular-nums ${densityStyles.fontSize.data}`}>
              {nf2.format(r.tr)}
            </span>
          )}
        </div>

        {/* TR(%) */}
        <div className="px-3 text-right" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
          {r.tr_pct == null || !Number.isFinite(r.tr_pct) ? (
            <span className="text-muted-foreground">―</span>
          ) : (
            <span className={`font-sans tabular-nums ${densityStyles.fontSize.data}`}>
              {nf2.format(r.tr_pct)}%
            </span>
          )}
        </div>

        {/* ATR14 */}
        <div className="px-3 text-right" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
          {r.atr14 == null || !Number.isFinite(r.atr14) ? (
            <span className="text-muted-foreground">―</span>
          ) : (
            <span className={`font-sans tabular-nums ${densityStyles.fontSize.data}`}>
              {nf2.format(r.atr14)}
            </span>
          )}
        </div>

        {/* ATR14(%) */}
        <div className="px-3 text-right" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
          {r.atr14_pct == null || !Number.isFinite(r.atr14_pct) ? (
            <span className="text-muted-foreground">―</span>
          ) : (
            <span className={`font-sans tabular-nums ${densityStyles.fontSize.data}`}>
              {nf2.format(r.atr14_pct)}%
            </span>
          )}
        </div>

        {/* 出来高 */}
        <div className="px-3 text-right" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
          <NumCell v={r.volume} nf0={nf0} />
        </div>

        {/* 出来高(10) */}
        <div className="px-3 text-right" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
          <NumCell v={r.vol_ma10} nf0={nf0} />
        </div>
      </Link>
  );

  // GROK銘柄の場合は行全体にtooltipを適用
  if (isGrokStock && grokReason) {
    return (
      <CustomTooltip
        content={
          <div className="max-w-md whitespace-normal">
            <div className="font-semibold text-xs mb-1">選定理由:</div>
            <div className="text-xs leading-relaxed">{grokReason}</div>
          </div>
        }
      >
        {rowContent}
      </CustomTooltip>
    );
  }

  return rowContent;
});

PriceRow.displayName = 'PriceRow';

export default function PriceTableDesktop({
  rows,
  nf0,
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
          gridTemplateColumns: COLS_PRICE,
          columnGap: `${densityValues.columnGap}px`,
        }}
      >
        {PRICE_SORT_COLUMNS.map((column) => (
          <SortButtonGroup
            key={column.key}
            columnKey={column.key}
            label={column.label}
            activeKey={sortKey}
            direction={direction}
            onSort={onSort}
            align={column.align ?? "right"}
            defaultAscending={column.key === "code" || column.key === "stock_name"}
            tooltip={column.tooltip}
          />
        ))}
      </div>

      {/* テーブル行 */}
      {displayedRows.map((r) => (
        <PriceRow key={r.ticker} row={r} nf0={nf0} nf2={nf2} density={density} />
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
