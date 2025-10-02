// components/stock_list_new/tables/PerfTableDesktop.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import type { Row } from "../../types";
import { PerfCell } from "../../parts/Cells";

/**
 * 列幅:
 * 1:コード(110) 2:銘柄名(300) 3:日付(110)
 * 4〜11: パフォーマンス8カラムを均等割付け
 */
const COLS_PERF = "110px 300px 110px repeat(8, minmax(84px, 1fr))";

export default function PerfTableDesktop({
  rows,
  nf2,
}: {
  rows: Row[];
  nf2: Intl.NumberFormat;
}) {
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
          gridTemplateColumns: COLS_PERF,
          columnGap: "12px",
        }}
      >
        <div>コード</div>
        <div>銘柄名</div>
        <div className="text-center">日付</div>
        {/* 1週〜全期間：中央揃え & 均等割 */}
        <div className="text-center">1週</div>
        <div className="text-center">1ヶ月</div>
        <div className="text-center">3ヶ月</div>
        <div className="text-center">年初来</div>
        <div className="text-center">1年</div>
        <div className="text-center">3年</div>
        <div className="text-center">5年</div>
        <div className="text-center">全期間</div>
      </div>

      {rows.map((r) => (
        <Link
          key={r.ticker}
          href={`/${encodeURIComponent(r.ticker)}`}
          className="block rounded-lg border border-border bg-card text-card-foreground hover:border-primary/50 transition-colors"
          style={{
            display: "grid",
            gridTemplateColumns: COLS_PERF,
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

          {/* パフォーマンス（均等割・右寄せの数値） */}
          <div className="px-3 py-3 text-right">
            <PerfCell v={r.r_5d} nf2={nf2} />
          </div>
          <div className="px-3 py-3 text-right">
            <PerfCell v={r.r_1mo} nf2={nf2} />
          </div>
          <div className="px-3 py-3 text-right">
            <PerfCell v={r.r_3mo} nf2={nf2} />
          </div>
          <div className="px-3 py-3 text-right">
            <PerfCell v={r.r_ytd} nf2={nf2} />
          </div>
          <div className="px-3 py-3 text-right">
            <PerfCell v={r.r_1y} nf2={nf2} />
          </div>
          <div className="px-3 py-3 text-right">
            <PerfCell v={r.r_3y} nf2={nf2} />
          </div>
          <div className="px-3 py-3 text-right">
            <PerfCell v={r.r_5y} nf2={nf2} />
          </div>
          <div className="px-3 py-3 text-right">
            <PerfCell v={r.r_all} nf2={nf2} />
          </div>
        </Link>
      ))}
    </div>
  );
}
