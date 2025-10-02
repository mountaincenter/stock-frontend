"use client";

import * as React from "react";
import type { TechCoreRow } from "../../types";
import TechnicalTableDesktop from "./TechnicalTableDesktop";
import TechnicalListMobile from "./TechnicalListMobile";

export type TechnicalTableProps = {
  rows: TechCoreRow[];
  nf2: Intl.NumberFormat;
};

export default function TechnicalTable({ rows, nf2 }: TechnicalTableProps) {
  return (
    <>
      {/* md+ */}
      <div className="hidden md:block">
        <TechnicalTableDesktop rows={rows} nf2={nf2} />
      </div>
      {/* <md */}
      <div className="md:hidden">
        <TechnicalListMobile rows={rows} nf2={nf2} />
      </div>
    </>
  );
}

export { TechnicalTableDesktop, TechnicalListMobile };
