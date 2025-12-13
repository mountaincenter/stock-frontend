// components/stock_list_new/tables/realtime/RealtimeTableDesktop.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import type { Row } from "../../types";
import type { DisplayDensity } from "../../types/density";
import { getDensityStyles, DENSITY_VALUES } from "../../types/density";
import { CloseCell, DiffBadge, NumCell } from "../../parts/Cells";
import type { RealtimeSortKey, SortDirection } from "../../utils/sort";
import { REALTIME_SORT_COLUMNS } from "../../utils/sort";
import { SortButtonGroup } from "../../parts/SortButtonGroup";
import { CustomTooltip } from "../../parts/CustomTooltip";
import { GrokTags } from "../../parts/GrokTags";

/**
 * リアルタイムタブ（10カラム）- 寄付買い前場引け売り戦略用
 * 1:コード(110固定) 2:銘柄名(min240,1fr) 3:時刻(90固定)
 * 4:現在値(min90) 5:寄付比(min100) 6:寄付比%(min80)
 * 7:前日比(min100) 8:高値(min90) 9:安値(min90) 10:出来高(min100)
 */
const COLS_REALTIME = "110px minmax(240px, 1fr) 90px minmax(90px, 0.9fr) minmax(100px, 1fr) minmax(80px, 0.8fr) minmax(100px, 1fr) minmax(90px, 0.9fr) minmax(90px, 0.9fr) minmax(100px, 1fr)";

type Props = {
  rows: Row[];
  nf0: Intl.NumberFormat;
  nf2: Intl.NumberFormat;
  sortKey: RealtimeSortKey | null;
  direction: SortDirection;
  onSort: (key: RealtimeSortKey, direction: SortDirection) => void;
  density?: DisplayDensity;
};

const INITIAL_DISPLAY_COUNT = 50;
const LOAD_MORE_COUNT = 50;

// 時刻フォーマット (HH:mm)
const formatTime = (marketTime: string | null | undefined): string => {
  if (!marketTime) return "—";
  try {
    const date = new Date(marketTime);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return "—";
  }
};

const RealtimeRow = React.memo(({
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

  // 寄付比 = 現在値 - 始値
  const openDiff =
    r.close != null &&
    r.open != null &&
    Number.isFinite(r.close) &&
    Number.isFinite(r.open)
      ? r.close - r.open
      : null;

  // 寄付比% = (現在値 - 始値) / 始値 * 100
  const openDiffPct =
    r.close != null &&
    r.open != null &&
    Number.isFinite(r.close) &&
    Number.isFinite(r.open) &&
    r.open !== 0
      ? ((r.close - r.open) / r.open) * 100
      : null;

  const densityValues = DENSITY_VALUES[density];
  const densityStyles = getDensityStyles(density);
  const paddingY = `${densityValues.rowPaddingY}rem`;

  // Grok銘柄の判定とtooltip用のreason取得
  const isGrokStock = r.categories?.includes("GROK") ?? false;
  const grokReason = isGrokStock ? r.reason : null;

  // 未寄付判定（marketState === 'PRE'）
  const isNotOpened = r.marketState === 'PRE';

  const rowContent = (
    <Link
      href={`/${encodeURIComponent(r.ticker)}`}
      className="group/row block rounded-xl bg-gradient-to-r from-card/50 via-card/80 to-card/50 text-card-foreground transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 hover:bg-gradient-to-r hover:from-card/70 hover:via-card/95 hover:to-card/70"
      style={{
        display: "grid",
        gridTemplateColumns: COLS_REALTIME,
        columnGap: `${densityValues.columnGap}px`,
      }}
    >
      {/* コード */}
      <div className="px-3 flex items-center" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
        <span className={`font-sans tabular-nums font-semibold ${densityStyles.fontSize.code}`}>
          {r.code}
        </span>
      </div>

      {/* 銘柄名 + Grokタグ */}
      <div className="px-3 min-w-0 flex flex-col justify-center gap-1" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
        <h3 className={`font-semibold ${densityStyles.fontSize.stockName} leading-snug hover:text-primary transition-colors line-clamp-1`}>
          {r.stock_name}
        </h3>
        {isGrokStock && <GrokTags tags={r.tags} selectionScore={r.selection_score} />}
      </div>

      {/* 時刻 */}
      <div className="px-3 flex items-center justify-center gap-1.5" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
        <span className={`${densityStyles.fontSize.date} font-sans tabular-nums text-muted-foreground`}>
          {formatTime(r.marketTime)}
        </span>
        {isNotOpened && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/20 text-amber-400 rounded">
            未寄付
          </span>
        )}
      </div>

      {/* 現在値 */}
      <div className="px-3 text-right flex items-center justify-end" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
        <CloseCell v={r.close} nf0={nf0} />
      </div>

      {/* 寄付比 */}
      <div className="px-3 text-right flex items-center justify-end" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
        <DiffBadge diff={openDiff} nf0={nf0} />
      </div>

      {/* 寄付比% */}
      <div className="px-3 text-right flex items-center justify-end" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
        <DiffBadge diff={openDiffPct} nf0={nf2} />
      </div>

      {/* 前日比 */}
      <div className="px-3 text-right flex items-center justify-end" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
        <DiffBadge diff={r.diff} nf0={nf0} />
      </div>

      {/* 高値 */}
      <div className="px-3 text-right flex items-center justify-end" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
        <NumCell v={r.high ?? null} nf0={nf0} />
      </div>

      {/* 安値 */}
      <div className="px-3 text-right flex items-center justify-end" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
        <NumCell v={r.low ?? null} nf0={nf0} />
      </div>

      {/* 出来高 */}
      <div className="px-3 text-right flex items-center justify-end" style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
        <NumCell v={r.volume} nf0={nf0} />
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

RealtimeRow.displayName = "RealtimeRow";

export function RealtimeTableDesktop({
  rows,
  nf0,
  nf2,
  sortKey,
  direction,
  onSort,
  density = "normal",
}: Props) {
  const [displayCount, setDisplayCount] = React.useState(INITIAL_DISPLAY_COUNT);

  const displayedRows = React.useMemo(
    () => rows.slice(0, displayCount),
    [rows, displayCount]
  );

  const hasMore = displayCount < rows.length;

  const handleLoadMore = React.useCallback(() => {
    setDisplayCount((prev) => Math.min(prev + LOAD_MORE_COUNT, rows.length));
  }, [rows.length]);

  React.useEffect(() => {
    setDisplayCount(INITIAL_DISPLAY_COUNT);
  }, [rows]);

  const densityValues = DENSITY_VALUES[density];

  return (
    <div className={`${DENSITY_VALUES[density].rowSpacing === 0.5 ? 'space-y-2' : DENSITY_VALUES[density].rowSpacing === 0.625 ? 'space-y-2.5' : 'space-y-3'}`}>
      {/* Header */}
      <div
        className="px-3 py-2 text-muted-foreground text-xs font-medium border-b border-border sticky top-0 z-20 bg-card/85 backdrop-blur supports-[backdrop-filter]:bg-card/60"
        style={{
          display: "grid",
          gridTemplateColumns: COLS_REALTIME,
          columnGap: `${densityValues.columnGap}px`,
        }}
      >
        {REALTIME_SORT_COLUMNS.map((col) => (
          <SortButtonGroup
            key={col.key}
            columnKey={col.key}
            label={col.label}
            activeKey={sortKey}
            direction={direction}
            onSort={onSort}
            align={col.align ?? "right"}
            defaultAscending={col.key === "code" || col.key === "stock_name"}
          />
        ))}
      </div>

      {/* Rows */}
      {displayedRows.map((row) => (
        <RealtimeRow
          key={row.ticker}
          row={row}
          nf0={nf0}
          nf2={nf2}
          density={density}
        />
      ))}

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center py-4">
          <button
            onClick={handleLoadMore}
            className="px-6 py-2 text-sm font-medium text-foreground bg-muted/30 hover:bg-muted/50 border border-border/40 rounded-lg transition-all duration-200 hover:shadow-md"
          >
            さらに読み込む ({rows.length - displayCount}件)
          </button>
        </div>
      )}

      {rows.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          データがありません
        </div>
      )}
    </div>
  );
}
