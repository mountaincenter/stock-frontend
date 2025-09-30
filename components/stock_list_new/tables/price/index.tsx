// components/stock_list_new/tables/price/index.tsx
"use client";

import * as React from "react";
import type { Row } from "../../types";
import PriceTableDesktop from "./PriceTableDesktop";
import PriceListMobile from "./PriceListMobile";
import PriceSimpleMobile from "./PriceSimpleMobile";

export type Props = {
  rows: Row[];
  nf0: Intl.NumberFormat;
  nf2: Intl.NumberFormat;
  /** モバイルの表示バリアント: シンプル表 or フル（カード） */
  mobileVariant?: "simple" | "full";
};

export default function PriceTable({
  rows,
  nf0,
  nf2,
  mobileVariant = "full",
}: Props) {
  return (
    <>
      {/* md+ は常にデスクトップ版テーブル */}
      <div className="hidden md:block">
        <PriceTableDesktop rows={rows} nf0={nf0} nf2={nf2} />
      </div>

      {/* <md は simple / full を切替 */}
      <div className="md:hidden">
        {mobileVariant === "simple" ? (
          <PriceSimpleMobile rows={rows} nf0={nf0} nf2={nf2} />
        ) : (
          <PriceListMobile rows={rows} nf0={nf0} nf2={nf2} />
        )}
      </div>
    </>
  );
}

export { PriceTableDesktop, PriceListMobile, PriceSimpleMobile };
