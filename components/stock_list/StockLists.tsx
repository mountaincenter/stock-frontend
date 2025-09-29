// components/stock_list/StockLists.tsx
"use client";

import React, { useMemo, useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import type { Props, Row } from "./types";
import { useStockData } from "./useStockData";
import { SearchInput } from "./SearchInput";
import { PriceTable } from "./PriceTable";
import { PerfTable } from "./PerfTable";

/**
 * Public コンポーネント（既存 API/表示のまま）
 * - md 以上は従来グリッド、sm はカード型に切替（Price/Perf 各テーブル側）
 */
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
      {/* Search */}
      <SearchInput value={searchTerm} onChange={setSearchTerm} />

      <div className="text-slate-400 text-sm">
        {filtered.length}銘柄を表示中 (全{rows.length}銘柄)
      </div>

      <Tabs defaultValue="price" className="w-full">
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

        <TabsContent value="price" className="mt-6">
          <PriceTable rows={filtered} nf0={nf0} nf2={nf2} />
        </TabsContent>

        <TabsContent value="perf" className="mt-6">
          <PerfTable rows={filtered} nf2={nf2} />
        </TabsContent>
      </Tabs>

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="text-center py-12">
          <div className="text-slate-400 text-lg mb-2">
            該当する銘柄が見つかりません
          </div>
          <div className="text-slate-500 text-sm">
            検索条件を変更してお試しください
          </div>
        </div>
      )}
    </div>
  );
}
