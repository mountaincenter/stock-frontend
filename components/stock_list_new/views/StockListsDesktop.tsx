"use client";

import React from "react";
import { LayoutGrid, List, LineChart } from "lucide-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import type { Row, TechCoreRow } from "../types";
import PriceTableDesktop from "../tables/price/PriceTableDesktop";
import PerfTableDesktop from "../tables/perf/PerfTableDesktop";
import TechnicalTableDesktop from "../tables/technical/TechnicalTableDesktop";
import type {
  PriceSortKey,
  PerfSortKey,
  TechSortKey,
  SortDirection,
} from "../utils/sort";
import { TableWrapper } from "../wrappers/TableWrapper";

interface StockListsDesktopProps {
  priceRows: Row[];
  perfRows: Row[];
  techRows: TechCoreRow[];
  techStatus: "idle" | "loading" | "success" | "error";
  nf0: Intl.NumberFormat;
  nf2: Intl.NumberFormat;
  activeTab: "price" | "perf" | "technical";
  onTabChange: (value: "price" | "perf" | "technical") => void;
  priceSortKey: PriceSortKey | null;
  priceSortDirection: SortDirection;
  onPriceSort: (key: PriceSortKey, direction: SortDirection) => void;
  perfSortKey: PerfSortKey | null;
  perfSortDirection: SortDirection;
  onPerfSort: (key: PerfSortKey, direction: SortDirection) => void;
  techSortKey: TechSortKey | null;
  techSortDirection: SortDirection;
  onTechSort: (key: TechSortKey, direction: SortDirection) => void;
}

export default function StockListsDesktop({
  priceRows,
  perfRows,
  techRows,
  techStatus,
  nf0,
  nf2,
  activeTab,
  onTabChange,
  priceSortKey,
  priceSortDirection,
  onPriceSort,
  perfSortKey,
  perfSortDirection,
  onPerfSort,
  techSortKey,
  techSortDirection,
  onTechSort,
}: StockListsDesktopProps) {
  return (
    <div className="hidden md:flex md:flex-col flex-1 min-h-0">
      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          onTabChange(value as "price" | "perf" | "technical")
        }
        className="h-full flex flex-col"
      >
        <TableWrapper
          toolbar={
            <TabsList
              className="
                grid w-fit grid-cols-3
                bg-card/70 supports-[backdrop-filter]:bg-card/50 backdrop-blur
                border border-border/60 rounded-md h-8
              "
            >
              <TabsTrigger
                value="price"
                className="flex items-center gap-1 px-2 text-xs h-7 data-[state=active]:bg-muted/40"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                価格
              </TabsTrigger>
              <TabsTrigger
                value="perf"
                className="flex items-center gap-1 px-2 text-xs h-7 data-[state=active]:bg-muted/40"
              >
                <List className="w-3.5 h-3.5" />
                パフォーマンス
              </TabsTrigger>
              <TabsTrigger
                value="technical"
                className="flex items-center gap-1 px-2 text-xs h-7 data-[state=active]:bg-muted/40"
              >
                <LineChart className="w-3.5 h-3.5" />
                テクニカル
              </TabsTrigger>
            </TabsList>
          }
          heightClass="h-full"
        >
          <div className="h-full flex flex-col">
            <TabsContent value="price" className="h-full px-0">
              <div className="h-full flex flex-col">
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-0">
                  <PriceTableDesktop
                    rows={priceRows}
                    nf0={nf0}
                    nf2={nf2}
                    sortKey={priceSortKey}
                    direction={priceSortDirection}
                    onSort={onPriceSort}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="perf" className="h-full px-0">
              <div className="h-full flex flex-col">
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-0">
                  <PerfTableDesktop
                    rows={perfRows}
                    nf2={nf2}
                    sortKey={perfSortKey}
                    direction={perfSortDirection}
                    onSort={onPerfSort}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="technical" className="h-full px-0">
              <div className="h-full flex flex-col">
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-0">
                  {techStatus === "error" ? (
                    <div className="text-destructive text-xs px-2 py-2">
                      テクニカルの取得に失敗しました（/tech/decision/snapshot）
                    </div>
                  ) : (
                    <TechnicalTableDesktop
                      rows={techRows}
                      nf2={nf2}
                      sortKey={techSortKey}
                      direction={techSortDirection}
                      onSort={onTechSort}
                    />
                  )}
                </div>
              </div>
            </TabsContent>
          </div>
        </TableWrapper>
      </Tabs>
    </div>
  );
}
