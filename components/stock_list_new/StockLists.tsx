// components/stock_list_new/StockLists.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { Props, Row } from "./types";
import { useStockData } from "./hooks/useStockData";
import { SearchInput } from "./wrappers/SearchInput";
import StockListsDesktop from "./views/StockListsDesktop";
import StockListsMobile, { MobileTab } from "./views/StockListsMobile";
import { PolicyFilters } from "./parts/PolicyFilters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { normalizeSelectTag } from "@/lib/tag-utils";
import {
  PRICE_SORT_COLUMNS,
  PERF_SORT_COLUMNS,
  TECH_SORT_COLUMNS,
  sortPriceRows,
  sortPerfRows,
  sortTechRows,
  type SortDirection,
  type PriceSortKey,
  type PerfSortKey,
  type TechSortKey,
} from "./utils/sort";
import { MobileSortToolbar } from "./parts/MobileSortToolbar";

const TAG_OPTIONS = [
  { value: "takaichi", label: "高市銘柄" },
  { value: "core30", label: "TOPIX Core30" },
  { value: "all", label: "全て" },
] as const;

type TagValue = (typeof TAG_OPTIONS)[number]["value"];

type SortConfig<K extends string> = {
  key: K | null;
  direction: SortDirection;
};

const DEFAULT_SORT_STATE: {
  price: SortConfig<PriceSortKey>;
  perf: SortConfig<PerfSortKey>;
  tech: SortConfig<TechSortKey>;
} = {
  price: { key: null, direction: null },
  perf: { key: null, direction: null },
  tech: { key: null, direction: null },
};

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
  const [sortState, setSortState] = useState(() => ({
    price: { ...DEFAULT_SORT_STATE.price },
    perf: { ...DEFAULT_SORT_STATE.perf },
    tech: { ...DEFAULT_SORT_STATE.tech },
  }));
  const { rows, status, nf0, nf2, techRows, techStatus } = useStockData({
    ...restProps,
    initialTag,
    tag: selectedTag,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);

  useEffect(() => {
    setSelectedTag(initialTag);
  }, [initialTag]);

  useEffect(() => {
    setSearchTerm("");
    setSelectedPolicies([]);
  }, [selectedTag]);

  useEffect(() => {
    setSortState({
      price: { ...DEFAULT_SORT_STATE.price },
      perf: { ...DEFAULT_SORT_STATE.perf },
      tech: { ...DEFAULT_SORT_STATE.tech },
    });
  }, [selectedTag]);

  const policyOptions = useMemo(() => {
    if (selectedTag !== "takaichi") return [];
    const set = new Set<string>();
    rows.forEach((row) => {
      const tags = [row.tag2, row.tag3];
      tags.forEach((tag) => {
        const value = tag?.toString().trim();
        if (value) set.add(value);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ja"));
  }, [rows, selectedTag]);

  const rowsAfterPolicy = useMemo(() => {
    if (selectedTag !== "takaichi" || selectedPolicies.length === 0) {
      return rows;
    }
    const policySet = new Set(selectedPolicies);
    return rows.filter((row) => {
      const tags = [row.tag2, row.tag3]
        .map((value) => value?.toString().trim())
        .filter((value): value is string => Boolean(value));
      return tags.some((tag) => policySet.has(tag));
    });
  }, [rows, selectedPolicies, selectedTag]);

  useEffect(() => {
    if (selectedTag !== "takaichi") return;
    setSelectedPolicies((prev) =>
      prev.filter((value) => policyOptions.includes(value))
    );
  }, [policyOptions, selectedTag]);

  const filtered: Row[] = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rowsAfterPolicy;
    return rowsAfterPolicy.filter(
      (s) =>
        s.stock_name.toLowerCase().includes(q) ||
        s.code.includes(searchTerm) ||
        s.ticker.toLowerCase().includes(q)
    );
  }, [rowsAfterPolicy, searchTerm]);

  const techFilteredRows = useMemo(() => {
    const allowed = new Set(filtered.map((row) => row.ticker));
    return techRows.filter((row) => allowed.has(row.ticker));
  }, [filtered, techRows]);

  const priceSortedRows = useMemo(
    () =>
      sortPriceRows(
        filtered,
        sortState.price.key,
        sortState.price.direction
      ),
    [filtered, sortState.price.key, sortState.price.direction]
  );

  const perfSortedRows = useMemo(
    () =>
      sortPerfRows(
        filtered,
        sortState.perf.key,
        sortState.perf.direction
      ),
    [filtered, sortState.perf.key, sortState.perf.direction]
  );

  const techSortedRows = useMemo(
    () =>
      sortTechRows(
        techFilteredRows,
        sortState.tech.key,
        sortState.tech.direction
      ),
    [techFilteredRows, sortState.tech.key, sortState.tech.direction]
  );

  const handlePriceSort = useCallback(
    (key: PriceSortKey, direction: SortDirection) => {
      setSortState((prev) => ({
        ...prev,
        price: {
          key: direction ? key : null,
          direction,
        },
      }));
    },
    []
  );

  const handlePerfSort = useCallback(
    (key: PerfSortKey, direction: SortDirection) => {
      setSortState((prev) => ({
        ...prev,
        perf: {
          key: direction ? key : null,
          direction,
        },
      }));
    },
    []
  );

  const handleTechSort = useCallback(
    (key: TechSortKey, direction: SortDirection) => {
      setSortState((prev) => ({
        ...prev,
        tech: {
          key: direction ? key : null,
          direction,
        },
      }));
    },
    []
  );

  const mobileSortConfig = (() => {
    const pane =
      mobileTab === "perf"
        ? "perf"
        : mobileTab === "technical"
        ? "technical"
        : "price";
    switch (pane) {
      case "perf":
        return {
          columns: PERF_SORT_COLUMNS,
          activeKey: sortState.perf.key,
          direction: sortState.perf.direction,
          onSort: handlePerfSort,
        } as const;
      case "technical":
        return {
          columns: TECH_SORT_COLUMNS,
          activeKey: sortState.tech.key,
          direction: sortState.tech.direction,
          onSort: handleTechSort,
        } as const;
      default:
        return {
          columns: PRICE_SORT_COLUMNS,
          activeKey: sortState.price.key,
          direction: sortState.price.direction,
          onSort: handlePriceSort,
        } as const;
    }
  })();

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
            <SelectTrigger className="h-8 w-[176px] rounded-full border border-border/50 bg-card/70 px-3 text-xs font-medium text-muted-foreground/80 shadow-sm backdrop-blur-sm transition-colors hover:border-primary/60 hover:text-primary focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none focus-visible:ring-primary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TAG_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="text-xs"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <SearchInput value={searchTerm} onChange={setSearchTerm} />
      </div>

      {selectedTag === "takaichi" && policyOptions.length > 0 && (
        <PolicyFilters
          options={policyOptions}
          selected={selectedPolicies}
          onToggle={(value, checked) =>
            setSelectedPolicies((prev) => {
              if (checked) {
                if (prev.includes(value)) return prev;
                return [...prev, value];
              }
              return prev.filter((item) => item !== value);
            })
          }
          onReset={() => setSelectedPolicies([])}
        />
      )}

      <div className="md:hidden">
        <div className="overflow-x-auto -mx-1 px-1">
      <MobileSortToolbar {...mobileSortConfig} />
    </div>
  </div>

  <div className="text-muted-foreground text-xs">
    {filtered.length}銘柄を表示中 ({activeTagLabel} / 全{rowsAfterPolicy.length}銘柄)
  </div>

  <StockListsDesktop
    priceRows={priceSortedRows}
    perfRows={perfSortedRows}
    techRows={techSortedRows}
    techStatus={techStatus}
    nf0={nf0}
    nf2={nf2}
    activeTab={desktopTab}
    onTabChange={(value) => setDesktopTab(value)}
    priceSortKey={sortState.price.key}
    priceSortDirection={sortState.price.direction}
    onPriceSort={handlePriceSort}
    perfSortKey={sortState.perf.key}
    perfSortDirection={sortState.perf.direction}
    onPerfSort={handlePerfSort}
    techSortKey={sortState.tech.key}
    techSortDirection={sortState.tech.direction}
    onTechSort={handleTechSort}
  />

  <StockListsMobile
    priceRows={priceSortedRows}
    perfRows={perfSortedRows}
        techRows={techSortedRows}
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
