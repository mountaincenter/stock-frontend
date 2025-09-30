"use client";

import * as React from "react";
import type { Row } from "../../types";
import PerfTableDesktop from "./PerfTableDesktop";
import PerfListMobile from "./PerfListMobile";

export type PerfTableProps = {
  rows: Row[];
  nf2: Intl.NumberFormat;
};

export default function PerfTable({ rows, nf2 }: PerfTableProps) {
  return (
    <>
      {/* md+ */}
      <div className="hidden md:block">
        <PerfTableDesktop rows={rows} nf2={nf2} />
      </div>
      {/* <md */}
      <div className="md:hidden">
        <PerfListMobile rows={rows} nf2={nf2} />
      </div>
    </>
  );
}

export { PerfTableDesktop, PerfListMobile };
