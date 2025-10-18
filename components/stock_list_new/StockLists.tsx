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
import { ChevronDown, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const TAG_OPTIONS = [
  {
    value: "takaichi",
    label: "高市銘柄",
    description:
      "高市早苗自民党総裁の政策に関連する銘柄 - 防衛・安全保障、サイバーセキュリティ、エネルギー、半導体国産化、経済安全保障、宇宙産業、地方創生などの重点政策分野",
  },
  {
    value: "core30",
    label: "TOPIX Core30",
    description:
      "東証TOPIX構成銘柄のうち時価総額・流動性が特に高い30銘柄 - 日本を代表する超大型株",
  },
  {
    value: "scalping_entry",
    label: "スキャルピング Entry",
    description:
      "初心者向けスキャルピング銘柄 - 株価100〜1500円、出来高1億円以上、ATR14% 1.0〜3.5%の安定的なボラティリティ、変動幅±3%以内の予測しやすい値動き",
  },
  {
    value: "scalping_active",
    label: "スキャルピング Active",
    description:
      "上級者向けスキャルピング銘柄 - 株価100〜3000円、出来高5千万円以上または出来高急増、ATR14% 2.5%以上の高ボラティリティ、変動幅±2%以上の大きな値動き",
  },
  { value: "all", label: "全て", description: "全ての銘柄を表示" },
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

  // タグ選択時にsessionStorageに保存（個別銘柄から戻る時のため）
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('lastSelectedTag', selectedTag);
    }
  }, [selectedTag]);
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
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);

  useEffect(() => {
    setSelectedTag(initialTag);
  }, [initialTag]);

  useEffect(() => {
    setSearchTerm("");
    setSelectedPolicies([]);
    setMobileToolsOpen(false);
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
      // tags配列から政策フィルタを抽出
      const tagsArray = Array.isArray(row.tags) ? row.tags : [];
      tagsArray.forEach((tag) => {
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
      // tags配列から政策タグを取得してフィルタリング
      const tagsArray = Array.isArray(row.tags) ? row.tags : [];
      const tags = tagsArray
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
      sortPriceRows(filtered, sortState.price.key, sortState.price.direction),
    [filtered, sortState.price.key, sortState.price.direction]
  );

  const perfSortedRows = useMemo(
    () => sortPerfRows(filtered, sortState.perf.key, sortState.perf.direction),
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

  const priceDataByTicker = useMemo(() => {
    const map: Record<string, Row> = {};
    filtered.forEach((row) => {
      map[row.ticker] = row;
    });
    return map;
  }, [filtered]);

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

  const mobileSortToolbar = (() => {
    const pane =
      mobileTab === "perf"
        ? "perf"
        : mobileTab === "technical"
        ? "technical"
        : "price";
    switch (pane) {
      case "perf":
        return (
          <MobileSortToolbar<PerfSortKey>
            columns={PERF_SORT_COLUMNS}
            activeKey={sortState.perf.key}
            direction={sortState.perf.direction}
            onSort={handlePerfSort}
          />
        );
      case "technical":
        return (
          <MobileSortToolbar<TechSortKey>
            columns={TECH_SORT_COLUMNS}
            activeKey={sortState.tech.key}
            direction={sortState.tech.direction}
            onSort={handleTechSort}
          />
        );
      default:
        return (
          <MobileSortToolbar<PriceSortKey>
            columns={PRICE_SORT_COLUMNS}
            activeKey={sortState.price.key}
            direction={sortState.price.direction}
            onSort={handlePriceSort}
          />
        );
    }
  })();

  const hasPolicyFilters =
    selectedTag === "takaichi" && policyOptions.length > 0;

  const renderPolicyFilters = () => {
    if (!hasPolicyFilters) return null;
    return (
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
    );
  };

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
      className={`flex flex-col gap-2 md:gap-2 flex-1 min-h-0 w-full ${
        className ?? ""
      }`}
    >
      {/* Premium glassmorphism header */}
      <div className="hidden md:block">
        <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card/95 via-card/90 to-card/95 p-4 shadow-xl shadow-black/5 backdrop-blur-xl">
          {/* Subtle shine effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent" />

          <div className="relative flex items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/50 backdrop-blur-sm border border-border/50">
                <div className="h-1.5 w-1.5 rounded-full bg-primary/80 animate-pulse" />
                <span className="text-[13px] font-semibold text-foreground/90 tracking-tight">
                  リスト
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedTag}
                  onValueChange={(value) => setSelectedTag(value as TagValue)}
                >
                  <SelectTrigger className="h-9 w-[190px] rounded-xl border border-border/50 bg-background/60 px-4 text-[13px] font-medium text-foreground/90 shadow-sm backdrop-blur-md transition-all duration-200 hover:border-primary/40 hover:bg-background/80 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0 focus-visible:outline-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/50 backdrop-blur-xl">
                    {TAG_OPTIONS.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        className="text-[13px] rounded-lg"
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center opacity-60 hover:opacity-100 transition-opacity"
                      >
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      align="start"
                      className="max-w-md text-xs bg-popover/95 backdrop-blur-sm"
                    >
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">
                          {
                            TAG_OPTIONS.find((opt) => opt.value === selectedTag)
                              ?.label
                          }
                        </p>
                        <p className="text-muted-foreground">
                          {
                            TAG_OPTIONS.find((opt) => opt.value === selectedTag)
                              ?.description
                          }
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              className="w-80"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2 md:hidden">
        <div className="rounded-xl border border-border/60 bg-card/60 p-3 shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              リスト
            </span>
            <div className="flex-1 flex items-center gap-2">
              <Select
                value={selectedTag}
                onValueChange={(value) => setSelectedTag(value as TagValue)}
              >
                <SelectTrigger className="h-8 w-full rounded-full border border-border/50 bg-card/70 px-3 text-xs font-medium text-muted-foreground/80 shadow-sm backdrop-blur-sm transition-colors hover:border-primary/60 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none focus-visible:ring-primary">
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
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
                    >
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    align="start"
                    className="max-w-xs text-xs bg-popover/95 backdrop-blur-sm"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">
                        {
                          TAG_OPTIONS.find((opt) => opt.value === selectedTag)
                            ?.label
                        }
                      </p>
                      <p className="text-muted-foreground">
                        {
                          TAG_OPTIONS.find((opt) => opt.value === selectedTag)
                            ?.description
                        }
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            className="w-full"
          />
          <button
            type="button"
            onClick={() => setMobileToolsOpen((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-card/70 px-3 py-2 text-xs font-medium text-muted-foreground/80 shadow-sm"
          >
            <span>フィルタ & ソート</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                mobileToolsOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {mobileToolsOpen && (
            <div className="pt-2 space-y-3">
              {hasPolicyFilters && <div>{renderPolicyFilters()}</div>}
              <div className="overflow-x-auto -mx-1 px-1">
                {mobileSortToolbar}
              </div>
            </div>
          )}
        </div>
      </div>

      {hasPolicyFilters && (
        <div className="hidden md:block">{renderPolicyFilters()}</div>
      )}

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
        priceDataByTicker={priceDataByTicker}
        displayedCount={filtered.length}
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
