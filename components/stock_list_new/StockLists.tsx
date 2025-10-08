// components/stock_list_new/StockLists.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { Props, Row } from "./types";
import { useStockData } from "./hooks/useStockData";
import { SearchInput } from "./wrappers/SearchInput";
import StockListsDesktop from "./views/StockListsDesktop";
import StockListsMobile, { MobileTab } from "./views/StockListsMobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { normalizeSelectTag } from "@/lib/tag-utils";

const TAG_OPTIONS = [
  { value: "takaichi", label: "高市銘柄" },
  { value: "core30", label: "TOPIX Core30" },
] as const;

type TagValue = (typeof TAG_OPTIONS)[number]["value"];

export default function StockLists(props: Props & { className?: string }) {
  const { className, ...rest } = props;
  const { initialTag: initialTagProp, ...restProps } = rest;
  const initialTag =
    normalizeSelectTag(initialTagProp as string | undefined) ?? "takaichi";
  const [selectedTag, setSelectedTag] = useState<TagValue>(initialTag);
  const [desktopTab, setDesktopTab] = useState<"price" | "perf" | "technical">(
    "price"
  );
  const [mobileTab, setMobileTab] = useState<MobileTab>("simple");
  const { rows, status, nf0, nf2, techRows, techStatus } = useStockData({
    ...restProps,
    initialTag,
    tag: selectedTag,
  });
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setSelectedTag(initialTag);
  }, [initialTag]);

  useEffect(() => {
    setSearchTerm("");
  }, [selectedTag]);

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

  const activeTagLabel = useMemo(() => {
    return (
      TAG_OPTIONS.find((option) => option.value === selectedTag)?.label ??
      selectedTag
    );
  }, [selectedTag]);

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
        データ取得に失敗しました（/stocks, /prices/snapshot/last2,
        /prices/perf/returns）。 サーバを確認してください。
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-2 md:gap-4 flex-1 min-h-0 w-full ${
        className ?? ""
      }`}
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">リスト</span>
          <Select
            value={selectedTag}
            onValueChange={(value) => setSelectedTag(value as TagValue)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TAG_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <SearchInput value={searchTerm} onChange={setSearchTerm} />
      </div>

      <div className="text-muted-foreground text-xs">
        {filtered.length}銘柄を表示中 ({activeTagLabel} / 全{rows.length}銘柄)
      </div>

      <StockListsDesktop
        rows={filtered}
        techRows={techRows}
        techStatus={techStatus}
        nf0={nf0}
        nf2={nf2}
        activeTab={desktopTab}
        onTabChange={(value) => setDesktopTab(value)}
      />

      <StockListsMobile
        rows={filtered}
        techRows={techRows}
        techStatus={techStatus}
        nf0={nf0}
        nf2={nf2}
        activeTab={mobileTab}
        onTabChange={(value) => setMobileTab(value)}
      />

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          該当する銘柄が見つかりません。検索条件を変更してお試しください。
        </div>
      )}
    </div>
  );
}
