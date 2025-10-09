"use client";

import * as React from "react";
import type { Row } from "../../types";
import type { PerfSortKey, SortDirection } from "../../utils/sort";
import PerfTableDesktop from "./PerfTableDesktop";
import PerfListMobile from "./PerfListMobile";

export type PerfTableProps = {
  rows: Row[];
  nf2: Intl.NumberFormat;
  sortKey?: PerfSortKey | null;
  direction?: SortDirection;
  onSort?: (key: PerfSortKey, direction: SortDirection) => void;
};

export default function PerfTable({
  rows,
  nf2,
  sortKey = null,
  direction = null,
  onSort,
}: PerfTableProps) {
  return (
    <>
      {/* md+ */}
      <div className="hidden md:block">
        <PerfTableDesktop
          rows={rows}
          nf2={nf2}
          sortKey={sortKey}
          direction={direction}
          onSort={onSort ?? (() => undefined)}
        />
      </div>
      {/* <md */}
      <div className="md:hidden">
        <PerfListMobile rows={rows} nf2={nf2} />
      </div>
    </>
  );
}

export { PerfTableDesktop, PerfListMobile };
