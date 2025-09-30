"use client";

// import Core30Prices from "../components/core30_prices";
// import Core30LwcPrices from "@/components/core30_prices_lwc";
import DemoPrices from "@/components/demo_prices";
import DemoPricesLwc from "@/components/demo_prices_lwc";
import LwcEmptyFrame from "../components/lwc_tutorial";
import LwcAreaMin, { lwcAreaDemoData } from "../components/lwc_area_min";
import DemoPricesIchimoku from "@/components/demo_prices_ichimoku";
import DemoPricesLwcIchimoku from "@/components/demo_prices_lwc_ichimoku";
import DemoPricesBB from "@/components/demo_prices_bb";
import DemoPricesLwcBB from "@/components/demo_prices_lwc_bb";
// import StockLists from "@/components/stock_lists";
import StockListsTradingViewFlavor from "@/components/stock_lists_flavor";
import { StockLists as StockListsNew } from "@/components/stock_list_new";

// import { StockLists } from "@/components/stock_list";

export default function Page() {
  return (
    <main className="p-6 text-lg">
      <StockListsNew />
      {/* <StockLists /> */}
      {/* <StockLists /> */}
      <StockListsTradingViewFlavor />
      <DemoPrices />
      <DemoPricesLwc />
      <DemoPricesIchimoku />
      <DemoPricesLwcIchimoku />
      <DemoPricesBB />
      <DemoPricesLwcBB />
      <LwcEmptyFrame
        height={320}
        backgroundColor="#0b0b0c"
        textColor="#e5e7eb"
      />
      <LwcAreaMin data={lwcAreaDemoData} height={320} />
    </main>
  );
}
