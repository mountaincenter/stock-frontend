// components/stock_list_new/tables/PriceTableDesktop.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import type { Row } from "../../types";
import { CloseCell, DiffBadge, NumCell } from "../../parts/Cells";

/**
 * 共有の先頭3列：テクニカル基準に合わせる
 * 1:コード(110) 2:銘柄名(minmax 220..480) 3:日付(110)
 */
const COLS_BASE = "110px 300px 110px";

/**
 * 価格タブ：終値以降の列幅をテクニカルのKPI幅に合わせる（左詰め）
 * 4:終値(=RSI相当 72) 5:前日差(=MACD相当 110) 6:前日差%(=%b相当 72)
 * 7:出来高(=新設 110) 8:出来高(10)(=乖離相当 96)
 */
const COLS_PRICE = `${COLS_BASE} 72px 110px 72px 110px 96px`;

export default function PriceTableDesktop({
  rows,
  nf0,
  nf2,
}: {
  rows: Row[];
  nf0: Intl.NumberFormat;
  nf2: Intl.NumberFormat;
}) {
  return (
    <div className="space-y-2">
      {/* ヘッダ（先頭3列固定 + 終値以降はKPI幅） */}
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
        <div>コード</div>
        <div>銘柄名</div>
        <div className="text-center">日付</div>
        <div className="text-right">終値</div>
        <div className="text-right">前日差</div>
        <div className="text-right">前日差(%)</div>
        <div className="text-right">出来高</div>
        <div className="text-right">出来高(10)</div>
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

            {/* 終値以降（KPI幅に揃える） */}
            <div className="px-3 py-3 text-right">
              <CloseCell v={r.close} nf0={nf0} />
            </div>
            <div className="px-3 py-3 text-right">
              <DiffBadge diff={r.diff} nf0={nf0} />
            </div>
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
            <div className="px-3 py-3 text-right">
              <NumCell v={r.volume} nf0={nf0} />
            </div>
            <div className="px-3 py-3 text-right">
              <NumCell v={r.vol_ma10} nf0={nf0} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
