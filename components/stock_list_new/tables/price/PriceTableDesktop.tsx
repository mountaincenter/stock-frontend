// components/stock_list_new/tables/PriceTableDesktop.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import type { Row } from "../../types";
import { CloseCell, DiffBadge, NumCell } from "../../parts/Cells";
import type { PriceSortKey, SortDirection } from "../../utils/sort";
import { PRICE_SORT_COLUMNS } from "../../utils/sort";
import { SortButtonGroup } from "../../parts/SortButtonGroup";

/**
 * 共有の先頭3列
 * 1:コード(110) 2:銘柄名(300) 3:日付(110)
 */
const COLS_BASE = "110px 300px 110px";

/**
 * 価格タブ（列順・幅）
 * 4:終値(90) 5:前日差(110) 6:前日差%(90)
 * 7:TR(90) 8:TR%(90) 9:ATR14(90) 10:ATR14%(90)
 * 11:出来高(110) 12:出来高(10)(96)
 */
const COLS_PRICE = `${COLS_BASE} 90px 110px 90px 90px 90px 90px 90px 110px 96px`;

type Props = {
  rows: Row[];
  nf0: Intl.NumberFormat;
  nf2: Intl.NumberFormat;
  sortKey: PriceSortKey | null;
  direction: SortDirection;
  onSort: (key: PriceSortKey, direction: SortDirection) => void;
};

const INITIAL_DISPLAY_COUNT = 50; // 初期表示件数
const LOAD_MORE_COUNT = 50; // 追加読み込み件数

// 行コンポーネントをメモ化してパフォーマンス向上
const PriceRow = React.memo(({
  row,
  nf0,
  nf2
}: {
  row: Row;
  nf0: Intl.NumberFormat;
  nf2: Intl.NumberFormat;
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

  return (
    <Link
        href={`/${encodeURIComponent(r.ticker)}`}
        className="group/row block rounded-xl border border-border/60 bg-gradient-to-r from-card/50 via-card/80 to-card/50 text-card-foreground transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 hover:bg-gradient-to-r hover:from-card/70 hover:via-card/95 hover:to-card/70 mb-2"
        style={{
          display: "grid",
          gridTemplateColumns: COLS_PRICE,
          columnGap: "12px",
        }}
      >
        {/* 先頭3列 */}
        <div className="px-3 py-3 flex items-center">
          <span className="font-sans tabular-nums font-semibold text-base">
            {r.code}
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

        {/* 終値 */}
        <div className="px-3 py-3 text-right">
          <CloseCell v={r.close} nf0={nf0} />
        </div>

        {/* 前日差 */}
        <div className="px-3 py-3 text-right">
          <DiffBadge diff={r.diff} nf0={nf0} />
        </div>

        {/* 前日差(%) */}
        <div className="px-3 py-3 text-right">
          {pct == null || !Number.isFinite(pct) ? (
            <span className="text-muted-foreground">―</span>
          ) : (
            <span
              className={
                (pct > 0
                  ? "text-emerald-300"
                  : pct < 0
                  ? "text-rose-300"
                  : "text-muted-foreground") + " font-sans tabular-nums"
              }
            >
              {pct > 0 ? "+" : ""}
              {nf2.format(pct)}%
            </span>
          )}
        </div>

        {/* TR */}
        <div className="px-3 py-3 text-right">
          {r.tr == null || !Number.isFinite(r.tr) ? (
            <span className="text-muted-foreground">―</span>
          ) : (
            <span className="font-sans tabular-nums">
              {nf2.format(r.tr)}
            </span>
          )}
        </div>

        {/* TR(%) */}
        <div className="px-3 py-3 text-right">
          {r.tr_pct == null || !Number.isFinite(r.tr_pct) ? (
            <span className="text-muted-foreground">―</span>
          ) : (
            <span className="font-sans tabular-nums">
              {nf2.format(r.tr_pct)}%
            </span>
          )}
        </div>

        {/* ATR14 */}
        <div className="px-3 py-3 text-right">
          {r.atr14 == null || !Number.isFinite(r.atr14) ? (
            <span className="text-muted-foreground">―</span>
          ) : (
            <span className="font-sans tabular-nums">
              {nf2.format(r.atr14)}
            </span>
          )}
        </div>

        {/* ATR14(%) */}
        <div className="px-3 py-3 text-right">
          {r.atr14_pct == null || !Number.isFinite(r.atr14_pct) ? (
            <span className="text-muted-foreground">―</span>
          ) : (
            <span className="font-sans tabular-nums">
              {nf2.format(r.atr14_pct)}%
            </span>
          )}
        </div>

        {/* 出来高 */}
        <div className="px-3 py-3 text-right">
          <NumCell v={r.volume} nf0={nf0} />
        </div>

        {/* 出来高(10) */}
        <div className="px-3 py-3 text-right">
          <NumCell v={r.vol_ma10} nf0={nf0} />
        </div>
      </Link>
  );
});

PriceRow.displayName = 'PriceRow';

export default function PriceTableDesktop({
  rows,
  nf0,
  nf2,
  sortKey,
  direction,
  onSort,
}: Props) {
  const [displayCount, setDisplayCount] = React.useState(INITIAL_DISPLAY_COUNT);

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
    <div className="space-y-2">
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
          columnGap: "12px",
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
          />
        ))}
      </div>

      {/* テーブル行 */}
      {displayedRows.map((r) => (
        <PriceRow key={r.ticker} row={r} nf0={nf0} nf2={nf2} />
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
