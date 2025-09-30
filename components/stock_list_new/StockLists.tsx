// components/stock_list_new/StockLists.tsx
"use client";

import React, { useMemo, useState } from "react";
import { LayoutGrid, List, Sparkles } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import type { Props, Row } from "./types";
import { useStockData } from "./hooks/useStockData";
import { SearchInput } from "./wrappers/SearchInput";
import PriceTable, { PriceListMobile, PriceSimpleMobile } from "./tables/price";
import PerfTable from "./tables/perf";

export default function StockLists(props: Props) {
  const { rows, status, nf0, nf2 } = useStockData(props);
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

  if (status === "loading" || status === "idle") {
    return (
      <div className="space-y-4">
        <div className="h-10 w-full bg-slate-800/60 rounded-xl animate-pulse" />
        <div className="h-96 w-full bg-slate-800/40 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
        データ取得に失敗しました（/core30/meta, /core30/prices/snapshot/last2,
        /core30/perf/returns）。 サーバを確認してください。
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SearchInput value={searchTerm} onChange={setSearchTerm} />

      <div className="text-slate-400 text-sm">
        {filtered.length}銘柄を表示中 (全{rows.length}銘柄)
      </div>

      {/* --- デスクトップ: 価格/パフォーマンス --- */}
      <div className="hidden md:block">
        <div className="h-[70vh] min-h-[520px] rounded-xl border border-slate-700/40 overflow-hidden">
          <Tabs defaultValue="price" className="h-full">
            <div className="sticky top-0 z-20 bg-slate-900/85 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60 border-b border-slate-700/50">
              <div className="p-2">
                <TabsList className="grid w-fit grid-cols-2 bg-slate-800/50 border border-slate-600/50">
                  <TabsTrigger
                    value="price"
                    className="flex items-center gap-2"
                  >
                    <LayoutGrid className="w-4 h-4" />
                    価格
                  </TabsTrigger>
                  <TabsTrigger value="perf" className="flex items-center gap-2">
                    <List className="w-4 h-4" />
                    パフォーマンス
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            <div className="h-[calc(100%-56px)] overflow-y-auto overscroll-contain p-0">
              <TabsContent value="price" className="mt-4 px-0">
                <PriceTable rows={filtered} nf0={nf0} nf2={nf2} />
              </TabsContent>
              <TabsContent value="perf" className="mt-4 px-0">
                <PerfTable rows={filtered} nf2={nf2} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* --- モバイル: シンプル(=テーブル)/価格(=カード)/パフォーマンス --- */}
      <div className="md:hidden">
        <div className="h-[70vh] min-h-[520px] rounded-xl border border-slate-700/40 overflow-hidden">
          <Tabs defaultValue="simple" className="h-full">
            <div className="sticky top-0 z-20 bg-slate-900/85 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60 border-b border-slate-700/50">
              <div className="p-2">
                <TabsList className="grid w-fit grid-cols-3 bg-slate-800/50 border border-slate-600/50">
                  <TabsTrigger
                    value="simple"
                    className="flex items-center gap-1"
                  >
                    <Sparkles className="w-4 h-4" />
                    シンプル
                  </TabsTrigger>
                  <TabsTrigger
                    value="price"
                    className="flex items-center gap-1"
                  >
                    <LayoutGrid className="w-4 h-4" />
                    価格
                  </TabsTrigger>
                  <TabsTrigger value="perf" className="flex items-center gap-1">
                    <List className="w-4 h-4" />
                    パフォーマンス
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            <div className="h-[calc(100%-56px)] overflow-y-auto overscroll-contain p-0">
              {/* シンプル = “テーブル版”（列を最小限に） */}
              <TabsContent value="simple" className="mt-4 px-0">
                <PriceSimpleMobile rows={filtered} nf0={nf0} nf2={nf2} />
              </TabsContent>

              {/* 価格 = “カード版フル” */}
              <TabsContent value="price" className="mt-4 px-0">
                <PriceListMobile rows={filtered} nf0={nf0} nf2={nf2} />
              </TabsContent>

              <TabsContent value="perf" className="mt-4 px-0">
                <PerfTable rows={filtered} nf2={nf2} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
