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
import { TableWrapper } from "./wrappers/TableWrapper";

/**
 * ルートを flex 縦積みにし、各セクションは flex-1 min-h-0 で
 * 余白による高さズレを防ぎつつ、スクロール領域が残り高さを吸収する。
 */
export default function StockLists(props: Props & { className?: string }) {
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
      <div className="flex flex-col gap-3 flex-1 min-h-0">
        <div className="h-9 w-full bg-slate-800/60 rounded-md animate-pulse" />
        <div className="flex-1 min-h-0 bg-slate-800/40 rounded-md animate-pulse" />
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
    <div
      className={`flex flex-col gap-3 md:gap-6 flex-1 min-h-0 ${
        props.className ?? ""
      }`}
    >
      {/* Search */}
      <SearchInput value={searchTerm} onChange={setSearchTerm} />

      <div className="text-slate-400 text-sm">
        {filtered.length}銘柄を表示中 (全{rows.length}銘柄)
      </div>

      {/* --- デスクトップ: 価格 / パフォーマンス --- */}
      <div className="hidden md:flex md:flex-col flex-1 min-h-0">
        <Tabs defaultValue="price" className="h-full flex flex-col">
          <TableWrapper
            toolbar={
              <TabsList className="grid w-fit grid-cols-2 bg-slate-800/50 border border-slate-600/50">
                <TabsTrigger value="price" className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4" />
                  価格
                </TabsTrigger>
                <TabsTrigger value="perf" className="flex items-center gap-2">
                  <List className="w-4 h-4" />
                  パフォーマンス
                </TabsTrigger>
              </TabsList>
            }
            // md 以上は高さ 70vh、モバイルは TableWrapper 側が高さを持たず親の flex に委譲
            heightClass="md:h-[70vh]"
          >
            <div className="h-full flex flex-col">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-0">
                <TabsContent value="price" className="h-full px-0">
                  <PriceTable rows={filtered} nf0={nf0} nf2={nf2} />
                </TabsContent>
                <TabsContent value="perf" className="h-full px-0">
                  <PerfTable rows={filtered} nf2={nf2} />
                </TabsContent>
              </div>
            </div>
          </TableWrapper>
        </Tabs>
      </div>

      {/* --- モバイル: シンプル / 価格 / パフォーマンス --- */}
      <div className="md:hidden flex flex-col flex-1 min-h-0">
        <Tabs defaultValue="simple" className="h-full flex flex-col">
          <TableWrapper
            toolbar={
              <TabsList className="grid w-fit grid-cols-3 bg-slate-800/50 border border-slate-600/50">
                <TabsTrigger value="simple" className="flex items-center gap-1">
                  <Sparkles className="w-4 h-4" />
                  シンプル
                </TabsTrigger>
                <TabsTrigger value="price" className="flex items-center gap-1">
                  <LayoutGrid className="w-4 h-4" />
                  価格
                </TabsTrigger>
                <TabsTrigger value="perf" className="flex items-center gap-1">
                  <List className="w-4 h-4" />
                  パフォーマンス
                </TabsTrigger>
              </TabsList>
            }
            // モバイルは高さクラス無し（親の flex で埋める）
            heightClass=""
          >
            <div className="h-full flex flex-col">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-0">
                {/* シンプル = テーブル詰め表示 */}
                <TabsContent value="simple" className="h-full px-0">
                  <PriceSimpleMobile rows={filtered} nf0={nf0} nf2={nf2} />
                </TabsContent>

                {/* 価格 = カード版フル */}
                <TabsContent value="price" className="h-full px-0">
                  <PriceListMobile rows={filtered} nf0={nf0} nf2={nf2} />
                </TabsContent>

                <TabsContent value="perf" className="h-full px-0">
                  <PerfTable rows={filtered} nf2={nf2} />
                </TabsContent>
              </div>
            </div>
          </TableWrapper>
        </Tabs>
      </div>

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="text-center py-10 text-slate-400 text-sm">
          該当する銘柄が見つかりません。検索条件を変更してお試しください。
        </div>
      )}
    </div>
  );
}
