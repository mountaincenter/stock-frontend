// components/stock_list_new/tables/PerfTableDesktop.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import type { Row } from "../../types";
import { PerfCell } from "../../parts/Cells";
import type { PerfSortKey, SortDirection } from "../../utils/sort";
import { PERF_SORT_COLUMNS } from "../../utils/sort";
import { SortButtonGroup } from "../../parts/SortButtonGroup";

/**
 * 列幅:
 * 1:コード(110) 2:銘柄名(300) 3:日付(110)
 * 4〜11: パフォーマンス8カラムを均等割付け
 */
const COLS_PERF = "110px 300px 110px repeat(8, minmax(84px, 1fr))";

type Props = {
  rows: Row[];
  nf2: Intl.NumberFormat;
  sortKey: PerfSortKey | null;
  direction: SortDirection;
  onSort: (key: PerfSortKey, direction: SortDirection) => void;
};

export default function PerfTableDesktop({
  rows,
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
          gridTemplateColumns: COLS_PERF,
          columnGap: "12px",
        }}
      >
        <SortButtonGroup
          columnKey="code"
          label="コード"
          activeKey={null}
          direction={null}
          onSort={() => undefined}
          align="left"
        />
        <SortButtonGroup
          columnKey="stock_name"
          label="銘柄名"
          activeKey={null}
          direction={null}
          onSort={() => undefined}
          align="left"
        />
        <SortButtonGroup
          columnKey="date"
          label="日付"
          activeKey={null}
          direction={null}
          onSort={() => undefined}
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
          />
        ))}
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
