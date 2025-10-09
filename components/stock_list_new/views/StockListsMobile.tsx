// components/stock_list_new/views/StockListsMobile.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import type { CarouselApi } from "@/components/ui/carousel";
import type { Row, TechCoreRow } from "../types";
import { PriceListMobile, PriceSimpleMobile } from "../tables/price";
import PerfTable from "../tables/perf";
import TechnicalTable from "../tables/technical";
import { TableWrapper } from "../wrappers/TableWrapper";

/* ====== モバイル：配列から生成 ====== */
const MOBILE_PANES = [
  { key: "simple", label: "シンプル" },
  { key: "price", label: "価格" },
  { key: "perf", label: "パフォーマンス" },
  { key: "technical", label: "テクニカル" },
] as const;

export type MobileTab = (typeof MOBILE_PANES)[number]["key"];

interface StockListsMobileProps {
  priceRows: Row[];
  perfRows: Row[];
  techRows: TechCoreRow[];
  techStatus: "idle" | "loading" | "success" | "error";
  nf0: Intl.NumberFormat;
  nf2: Intl.NumberFormat;
  activeTab: MobileTab;
  onTabChange: (value: MobileTab) => void;
}
const ORDER: MobileTab[] = MOBILE_PANES.map((p) => p.key);
const toIndex = (v: MobileTab) => ORDER.indexOf(v);
const toValue = (i: number) =>
  ORDER[Math.max(0, Math.min(ORDER.length - 1, i))] as MobileTab;

function getWindow3(active: MobileTab) {
  const idx = toIndex(active);
  const start = Math.min(Math.max(idx - 1, 0), Math.max(ORDER.length - 3, 0));
  return ORDER.slice(start, start + 3);
}

function renderMobilePane(
  key: MobileTab,
  priceRows: Row[],
  perfRows: Row[],
  nf0: Intl.NumberFormat,
  nf2: Intl.NumberFormat,
  techStatus: "idle" | "loading" | "success" | "error",
  techRows: TechCoreRow[]
) {
  switch (key) {
    case "simple":
      return <PriceSimpleMobile rows={priceRows} nf0={nf0} nf2={nf2} />;
    case "price":
      return <PriceListMobile rows={priceRows} nf0={nf0} nf2={nf2} />;
    case "perf":
      return <PerfTable rows={perfRows} nf2={nf2} />;
    case "technical":
      return techStatus === "error" ? (
        <div className="text-destructive text-xs px-2 py-2">
          テクニカルの取得に失敗しました（/tech/decision/snapshot）
        </div>
      ) : (
        <TechnicalTable rows={techRows} nf2={nf2} />
      );
    default:
      return null;
  }
}

export default function StockListsMobile({
  priceRows,
  perfRows,
  techRows,
  techStatus,
  nf0,
  nf2,
  activeTab,
  onTabChange,
}: StockListsMobileProps) {
  const [api, setApi] = useState<CarouselApi | undefined>(undefined);

  useEffect(() => {
    if (!api) return;
    const idx = toIndex(activeTab);
    if (idx >= 0 && api.selectedScrollSnap() !== idx) api.scrollTo(idx);
  }, [activeTab, api]);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => onTabChange(toValue(api.selectedScrollSnap()));
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api, onTabChange]);

  return (
    <div className="md:hidden flex flex-col flex-1 min-h-0">
      <Tabs
        value={activeTab}
        onValueChange={(v) => onTabChange(v as MobileTab)}
        className="h-full flex flex-col"
      >
        <TableWrapper
          stretch={false}
          heightClass="h-auto md:h-[70vh]"
          toolbar={
            <TabsList
              className="
                grid grid-cols-3 w-full
                bg-card/80 supports-[backdrop-filter]:bg-card/60 backdrop-blur
                border-0 rounded-none
              "
            >
              {getWindow3(activeTab).map((key) => {
                const label = MOBILE_PANES.find((p) => p.key === key)!.label;
                return (
                  <TabsTrigger
                    key={key}
                    value={key}
                    className="
                      h-8 leading-8 px-1 text-[11px] tracking-tight
                      rounded-none border-b-2 border-transparent
                      data-[state=active]:border-b-primary
                      text-muted-foreground
                    "
                  >
                    <span className="whitespace-nowrap">{label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          }
          heightClass=""
        >
          <div className="overflow-hidden">
            <Carousel
              setApi={setApi}
              opts={{ align: "start", loop: true, dragFree: false }}
            >
              <CarouselContent>
                {ORDER.map((key) => (
                  <CarouselItem key={key} className="basis-full">
                    <div className="touch-pan-y">
                      {renderMobilePane(
                        key as MobileTab,
                        priceRows,
                        perfRows,
                        nf0,
                        nf2,
                        techStatus,
                        techRows as TechCoreRow[]
                      )}
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>
        </TableWrapper>
      </Tabs>
    </div>
  );
}
