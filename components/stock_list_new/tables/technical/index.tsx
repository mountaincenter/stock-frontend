"use client";

import * as React from "react";
import type { TechCoreRow } from "../../types";
import type { TechSortKey, SortDirection } from "../../utils/sort";
import TechnicalTableDesktop from "./TechnicalTableDesktop";
import TechnicalListMobile from "./TechnicalListMobile";

export type TechnicalTableProps = {
  rows: TechCoreRow[];
  nf2: Intl.NumberFormat;
  sortKey?: TechSortKey | null;
  direction?: SortDirection;
  onSort?: (key: TechSortKey, direction: SortDirection) => void;
};

export default function TechnicalTable({
  rows,
  nf2,
  sortKey = null,
  direction = null,
  onSort,
}: TechnicalTableProps) {
  return (
    <>
      {/* md+ */}
      <div className="hidden md:block">
        <TechnicalTableDesktop
          rows={rows}
          nf2={nf2}
          sortKey={sortKey}
          direction={direction}
          onSort={onSort ?? (() => undefined)}
        />
      </div>
      {/* <md */}
      <div className="md:hidden">
        <TechnicalListMobile rows={rows} nf2={nf2} />
      </div>
    </>
  );
}

export { TechnicalTableDesktop, TechnicalListMobile };
