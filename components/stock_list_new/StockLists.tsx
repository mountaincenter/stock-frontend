// components/stock_list_new/StockLists.tsx
"use client";

import React, { useMemo, useState, useEffect } from "react";
import { LayoutGrid, List, LineChart } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import type { Props, Row, TechCoreRow } from "./types";
import { useStockData } from "./hooks/useStockData";
import { SearchInput } from "./wrappers/SearchInput";
import PriceTable, { PriceListMobile, PriceSimpleMobile } from "./tables/price";
import PerfTable from "./tables/perf";
import TechnicalTable from "./tables/technical";
import { TableWrapper } from "./wrappers/TableWrapper";
import { Carousel, CarouselContent, CarouselItem } from "../ui/carousel";
import type { CarouselApi } from "../ui/carousel";

/* ====== モバイル：配列から生成 ====== */
const MOBILE_PANES = [
  { key: "simple", label: "シンプル" },
  { key: "price", label: "価格" },
  { key: "perf", label: "パフォーマンス" },
  { key: "technical", label: "テクニカル" },
] as const;

type MobileTab = (typeof MOBILE_PANES)[number]["key"];
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
  filtered: Row[],
  nf0: Intl.NumberFormat,
  nf2: Intl.NumberFormat,
  techStatus: "idle" | "loading" | "success" | "error",
  techRows: TechCoreRow[]
) {
  switch (key) {
    case "simple":
      return <PriceSimpleMobile rows={filtered} nf0={nf0} nf2={nf2} />;
    case "price":
      return <PriceListMobile rows={filtered} nf0={nf0} nf2={nf2} />;
    case "perf":
      return <PerfTable rows={filtered} nf2={nf2} />;
    case "technical":
      return techStatus === "error" ? (
        <div className="text-destructive text-xs px-2 py-2">
          テクニカルの取得に失敗しました（/core30/tech/decision/snapshot）
        </div>
      ) : (
        <TechnicalTable rows={techRows} nf2={nf2} />
      );
    default:
      return null;
  }
}

export default function StockLists(props: Props & { className?: string }) {
  const { rows, status, nf0, nf2, techRows, techStatus } = useStockData(props);
  const [searchTerm, setSearchTerm] = useState("");

  const filtered: Row[] = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (s) =>
        s.stock_name.toLowerCase().includes(q) ||
        s.code.includes(searchTerm) ||
        s.ticker.toLowerCase().includes(q)
    );
  }, [rows, searchTerm]);

  /* ====== Mobile: Tabs と Carousel 同期 ====== */
  const [mobileTab, setMobileTab] = useState<MobileTab>(ORDER[0]);
  const [api, setApi] = useState<CarouselApi | undefined>(undefined);

  useEffect(() => {
    if (!api) return;
    const idx = toIndex(mobileTab);
    if (idx >= 0 && api.selectedScrollSnap() !== idx) api.scrollTo(idx);
  }, [mobileTab, api]);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setMobileTab(toValue(api.selectedScrollSnap()));
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  if (status === "loading" || status === "idle") {
    return (
      <div className="flex flex-col gap-2 flex-1 min-h-0">
        <div className="h-8 w-full bg-muted/60 rounded-md animate-pulse" />
        <div className="flex-1 min-h-0 bg-muted/40 rounded-md animate-pulse" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive text-sm">
        データ取得に失敗しました（/core30/meta, /core30/prices/snapshot/last2,
        /core30/perf/returns）。 サーバを確認してください。
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-2 md:gap-4 flex-1 min-h-0 w-full ${
        props.className ?? ""
      }`}
    >
      {/* Search */}
      <SearchInput value={searchTerm} onChange={setSearchTerm} />

      <div className="text-muted-foreground text-xs">
        {filtered.length}銘柄を表示中 (全{rows.length}銘柄)
      </div>

      {/* --- デスクトップ --- */}
      <div className="hidden md:flex md:flex-col flex-1 min-h-0">
        <Tabs defaultValue="price" className="h-full flex flex-col">
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
                    <PriceTable rows={filtered} nf0={nf0} nf2={nf2} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="perf" className="h-full px-0">
                <div className="h-full flex flex-col">
                  <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-0">
                    <PerfTable rows={filtered} nf2={nf2} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="technical" className="h-full px-0">
                <div className="h-full flex flex-col">
                  <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-0">
                    {techStatus === "error" ? (
                      <div className="text-destructive text-xs px-2 py-2">
                        テクニカルの取得に失敗しました（/core30/tech/decision/snapshot）
                      </div>
                    ) : (
                      <TechnicalTable rows={techRows} nf2={nf2} />
                    )}
                  </div>
                </div>
              </TabsContent>
            </div>
          </TableWrapper>
        </Tabs>
      </div>

      {/* --- モバイル --- */}
      <div className="md:hidden flex flex-col flex-1 min-h-0">
        <Tabs
          value={mobileTab}
          onValueChange={(v) => setMobileTab(v as MobileTab)}
          className="h-full flex flex-col"
        >
          <TableWrapper
            toolbar={
              <TabsList
                className="
                  grid grid-cols-3 w-full
                  bg-card/80 supports-[backdrop-filter]:bg-card/60 backdrop-blur
                  border-0 rounded-none
                "
              >
                {getWindow3(mobileTab).map((key) => {
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
            <div className="flex-1 min-h-0 overflow-hidden">
              <Carousel
                setApi={setApi}
                opts={{ align: "start", loop: true, dragFree: false }}
                className="h-full"
              >
                <CarouselContent className="h-full">
                  {ORDER.map((key) => (
                    <CarouselItem key={key} className="basis-full">
                      <div className="h-full touch-pan-y">
                        {renderMobilePane(
                          key as MobileTab,
                          filtered,
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

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          該当する銘柄が見つかりません。検索条件を変更してお試しください。
        </div>
      )}
    </div>
  );
}
