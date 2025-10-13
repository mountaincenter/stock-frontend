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

const INITIAL_DISPLAY_COUNT = 50; // 初期表示件数
const LOAD_MORE_COUNT = 50; // 追加読み込み件数

type Props = {
  rows: Row[];
  nf2: Intl.NumberFormat;
  sortKey: PerfSortKey | null;
  direction: SortDirection;
  onSort: (key: PerfSortKey, direction: SortDirection) => void;
};

// 行コンポーネントをメモ化
const PerfRow = React.memo(({
  row,
  nf2
}: {
  row: Row;
  nf2: Intl.NumberFormat;
}) => {
  const r = row;
  return (
    <Link
      href={`/${encodeURIComponent(r.ticker)}`}
      className="group/row block rounded-xl border border-border/60 bg-gradient-to-r from-card/50 via-card/80 to-card/50 text-card-foreground transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 hover:bg-gradient-to-r hover:from-card/70 hover:via-card/95 hover:to-card/70"
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
  );
});

PerfRow.displayName = 'PerfRow';

export default function PerfTableDesktop({
  rows,
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
          gridTemplateColumns: COLS_PERF,
          columnGap: "12px",
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
          />
        ))}
      </div>

      {/* テーブル行 */}
      {displayedRows.map((r) => (
        <PerfRow key={r.ticker} row={r} nf2={nf2} />
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
