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

export default function PriceTableDesktop({
  rows,
  nf0,
  nf2,
  sortKey,
  direction,
  onSort,
}: Props) {
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
          />
        ))}
      </div>

      {rows.map((r) => {
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
            key={r.ticker}
            href={`/${encodeURIComponent(r.ticker)}`}
            className="block rounded-lg border border-border bg-card text-card-foreground hover:border-primary/50 transition-colors"
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
      })}
    </div>
  );
}
