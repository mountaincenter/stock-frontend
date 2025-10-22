"use client";

import React from "react";
import { LayoutGrid, List, LineChart, Zap } from "lucide-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import type { Row, TechCoreRow } from "../types";
import type { DisplayDensity } from "../types/density";
import PriceTableDesktop from "../tables/price/PriceTableDesktop";
import PerfTableDesktop from "../tables/perf/PerfTableDesktop";
import TechnicalTableDesktop from "../tables/technical/TechnicalTableDesktop";
import { RealtimeTableDesktop } from "../tables/realtime/RealtimeTableDesktop";
import type {
  PriceSortKey,
  PerfSortKey,
  TechSortKey,
  RealtimeSortKey,
  SortDirection,
} from "../utils/sort";
import { TableWrapper } from "../wrappers/TableWrapper";
import { DensitySelector } from "../parts/DensitySelector";

interface StockListsDesktopProps {
  priceRows: Row[];
  perfRows: Row[];
  techRows: TechCoreRow[];
  realtimeRows: Row[];
  techStatus: "idle" | "loading" | "success" | "error";
  nf0: Intl.NumberFormat;
  nf2: Intl.NumberFormat;
  activeTab: "price" | "perf" | "technical" | "realtime";
  onTabChange: (value: "price" | "perf" | "technical" | "realtime") => void;
  priceSortKey: PriceSortKey | null;
  priceSortDirection: SortDirection;
  onPriceSort: (key: PriceSortKey, direction: SortDirection) => void;
  perfSortKey: PerfSortKey | null;
  perfSortDirection: SortDirection;
  onPerfSort: (key: PerfSortKey, direction: SortDirection) => void;
  techSortKey: TechSortKey | null;
  techSortDirection: SortDirection;
  onTechSort: (key: TechSortKey, direction: SortDirection) => void;
  realtimeSortKey: RealtimeSortKey | null;
  realtimeSortDirection: SortDirection;
  onRealtimeSort: (key: RealtimeSortKey, direction: SortDirection) => void;
  priceDataByTicker?: Record<string, Row>;
  displayedCount?: number;
}

export default function StockListsDesktop({
  priceRows,
  perfRows,
  techRows,
  realtimeRows,
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
  realtimeSortKey,
  realtimeSortDirection,
  onRealtimeSort,
  priceDataByTicker,
  displayedCount,
}: StockListsDesktopProps) {
  const [density, setDensity] = React.useState<DisplayDensity>("normal");

  return (
    <div className="hidden md:block">
      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          onTabChange(value as "price" | "perf" | "technical" | "realtime")
        }
      >
        <TableWrapper
          toolbar={
            <div className="relative flex items-center justify-between gap-4">
              {/* Backdrop blur container */}
              <div className="absolute inset-0 -z-10 bg-gradient-to-b from-card/40 via-card/60 to-card/40 backdrop-blur-xl rounded-2xl" />

              <div className="flex items-center gap-3">
                <TabsList className="grid w-fit grid-cols-4 gap-1 bg-muted/30 backdrop-blur-sm border border-border/40 rounded-xl p-1 h-10 shadow-lg shadow-black/5">
                <TabsTrigger
                  value="realtime"
                  className="flex items-center gap-1.5 px-4 text-[13px] font-medium h-8 rounded-lg transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground/70 data-[state=inactive]:hover:text-foreground/80"
                >
                  <Zap className="w-3.5 h-3.5" />
                  リアルタイム
                </TabsTrigger>
                <TabsTrigger
                  value="price"
                  className="flex items-center gap-1.5 px-4 text-[13px] font-medium h-8 rounded-lg transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground/70 data-[state=inactive]:hover:text-foreground/80"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  価格
                </TabsTrigger>
                <TabsTrigger
                  value="perf"
                  className="flex items-center gap-1.5 px-4 text-[13px] font-medium h-8 rounded-lg transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground/70 data-[state=inactive]:hover:text-foreground/80"
                >
                  <List className="w-3.5 h-3.5" />
                  パフォーマンス
                </TabsTrigger>
                <TabsTrigger
                  value="technical"
                  className="flex items-center gap-1.5 px-4 text-[13px] font-medium h-8 rounded-lg transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground/70 data-[state=inactive]:hover:text-foreground/80"
                >
                  <LineChart className="w-3.5 h-3.5" />
                  テクニカル
                </TabsTrigger>
              </TabsList>

              <DensitySelector value={density} onChange={setDensity} />
              </div>

              {displayedCount !== undefined && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/20 border border-border/30">
                  <span className="text-[13px] text-muted-foreground font-medium">
                    <span className="text-foreground font-semibold">{displayedCount}</span>件
                  </span>
                </div>
              )}
            </div>
          }
          heightClass="h-auto"
        >
          <TabsContent value="realtime" className="mt-0">
            <div className="max-h-[80vh] overflow-y-auto">
              <RealtimeTableDesktop
                rows={realtimeRows}
                nf0={nf0}
                nf2={nf2}
                sortKey={realtimeSortKey}
                direction={realtimeSortDirection}
                onSort={onRealtimeSort}
                density={density}
              />
            </div>
          </TabsContent>

          <TabsContent value="price" className="mt-0">
            <div className="max-h-[80vh] overflow-y-auto">
              <PriceTableDesktop
                rows={priceRows}
                nf0={nf0}
                nf2={nf2}
                sortKey={priceSortKey}
                direction={priceSortDirection}
                onSort={onPriceSort}
                density={density}
              />
            </div>
          </TabsContent>

          <TabsContent value="perf" className="mt-0">
            <div className="max-h-[80vh] overflow-y-auto">
              <PerfTableDesktop
                rows={perfRows}
                nf2={nf2}
                sortKey={perfSortKey}
                direction={perfSortDirection}
                onSort={onPerfSort}
                density={density}
              />
            </div>
          </TabsContent>

          <TabsContent value="technical" className="mt-0">
            <div className="max-h-[80vh] overflow-y-auto">
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
                  priceDataByTicker={priceDataByTicker}
                  density={density}
                />
              )}
            </div>
          </TabsContent>
        </TableWrapper>
      </Tabs>
    </div>
  );
}
