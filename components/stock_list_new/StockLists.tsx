// components/stock_list_new/StockLists.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { Props, Row } from "./types";
import { useStockData } from "./hooks/useStockData";
import { SearchInput } from "./wrappers/SearchInput";
import StockListsDesktop from "./views/StockListsDesktop";
import StockListsMobile, { MobileTab } from "./views/StockListsMobile";
import { PolicyFilters } from "./parts/PolicyFilters";
import { shouldFetchRealtimePrice } from "@/lib/market-hours";
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
  sortRealtimeRows,
  type SortDirection,
  type PriceSortKey,
  type PerfSortKey,
  type TechSortKey,
  type RealtimeSortKey,
} from "./utils/sort";
import { sortByGrokScore } from "@/lib/grok-utils";
import { MobileSortToolbar } from "./parts/MobileSortToolbar";
import { ChevronDown, HelpCircle, RefreshCw } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GrokBacktestBanner } from "@/app/components/GrokBacktestBanner";

interface RealtimeQuote {
  ticker: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  marketTime: string | null;
  marketState: string | null;
  open: number | null;
  high: number | null;
  low: number | null;
}

const TAG_OPTIONS = [
  {
    value: "policy",
    label: "政策銘柄",
    description:
      "連立政権の重点政策に関連する銘柄 - 防衛・安全保障、半導体・先端技術、エネルギー安全保障、経済安全保障、インフラ・建設、デジタル・AI、地方創生などの政策分野",
  },
  {
    value: "core30",
    label: "TOPIX Core30",
    description:
      "東証TOPIX構成銘柄のうち時価総額・流動性が特に高い30銘柄 - 日本を代表する超大型株",
  },
  {
    value: "grok",
    label: "GROK トレンド",
    description:
      "GROK AIが選定したトレンド銘柄 - AI分析による注目株の抽出",
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
  realtime: SortConfig<RealtimeSortKey>;
} = {
  price: { key: null, direction: null },
  perf: { key: null, direction: null },
  tech: { key: null, direction: null },
  realtime: { key: null, direction: null },
};

export default function StockLists(props: Props & { className?: string }) {
  const { className, ...rest } = props;
  const { initialTag: initialTagProp, ...restProps} = rest;
  const initialTag =
    normalizeSelectTag(initialTagProp as string | undefined) ?? "grok";
  const [selectedTag, setSelectedTag] = useState<TagValue>(initialTag);

  // タグ選択時にsessionStorageに保存（個別銘柄から戻る時のため）
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('lastSelectedTag', selectedTag);
    }
  }, [selectedTag]);
  const [desktopTab, setDesktopTab] = useState<"price" | "perf" | "technical" | "realtime">(
    "realtime"
  );
  const [mobileTab, setMobileTab] = useState<MobileTab>("simple");
  const [sortState, setSortState] = useState(() => ({
    price: { ...DEFAULT_SORT_STATE.price },
    perf: { ...DEFAULT_SORT_STATE.perf },
    tech: { ...DEFAULT_SORT_STATE.tech },
    realtime: { ...DEFAULT_SORT_STATE.realtime },
  }));
  const { rows, status, nf0, nf2, techRows, techStatus } = useStockData({
    ...restProps,
    initialTag,
    tag: selectedTag,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [realtimeData, setRealtimeData] = useState<{ticker: string; price: number; timestamp: string} | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [realtimePrices, setRealtimePrices] = useState<Map<string, {
    price: number | null;
    change: number | null;
    changePercent: number | null;
    volume: number | null;
    marketTime: string | null;
    marketState: string | null;
    open: number | null;
    high: number | null;
    low: number | null;
  }>>(new Map());

  const fetchRealtimePrice = useCallback(async (forceRefresh = false) => {
    if (rows.length === 0) return;

    setIsRefreshing(true);
    try {
      // 全銘柄のティッカーを取得
      const tickers = rows.map(r => r.ticker).join(',');
      console.log(`[Realtime] Fetching ${rows.length} tickers${forceRefresh ? ' (force refresh)' : ''}`);
      const url = `/api/realtime?tickers=${tickers}${forceRefresh ? '&force=true' : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch realtime prices');
      }

      const result = await response.json();
      console.log(`[Realtime] Response received, cached: ${result.cached}`);

      // 取得したデータをMapに保存
      if (result.data && result.data.length > 0) {
        const newPrices = new Map<string, Omit<RealtimeQuote, 'ticker'>>();
        result.data.forEach((quote: RealtimeQuote) => {
          newPrices.set(quote.ticker, {
            price: quote.price,
            change: quote.change,
            changePercent: quote.changePercent,
            volume: quote.volume,
            marketTime: quote.marketTime,
            marketState: quote.marketState,
            open: quote.open,
            high: quote.high,
            low: quote.low,
          });
        });
        setRealtimePrices(newPrices);
        console.log(`[Realtime] Updated ${newPrices.size} prices`);

        // 最初の銘柄の価格を表示用に保存（タイムスタンプは更新実行時刻）
        const firstQuote = result.data[0];
        const now = new Date();

        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const formattedTime = `${year}-${month}-${day} ${hours}:${minutes}`;

        setRealtimeData({
          ticker: firstQuote.ticker,
          price: firstQuote.price,
          timestamp: formattedTime
        });
      }
    } catch (error) {
      console.error('Error fetching realtime prices:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [rows]);

  // タグ変更時、データロード完了時に自動で最新株価を取得
  useEffect(() => {
    if (status === 'success' && rows.length > 0) {
      (async () => {
        const shouldFetch = await shouldFetchRealtimePrice();
        if (shouldFetch) {
          console.log(`[Realtime] Auto-fetching prices for ${rows.length} stocks`);
          fetchRealtimePrice();
        } else {
          console.log('[Realtime] Skipping realtime fetch');
        }
      })();
    }
  }, [status, rows.length, fetchRealtimePrice]);

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
      realtime: { ...DEFAULT_SORT_STATE.realtime },
    });
  }, [selectedTag]);

  const policyOptions = useMemo(() => {
    if (selectedTag !== "policy") return [];
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
    let result = rows;

    // Policy tag: フィルタリング
    if (selectedTag === "policy" && selectedPolicies.length > 0) {
      const policySet = new Set(selectedPolicies);
      result = rows.filter((row) => {
        // tags配列から政策タグを取得してフィルタリング
        const tagsArray = Array.isArray(row.tags) ? row.tags : [];
        const tags = tagsArray
          .map((value) => value?.toString().trim())
          .filter((value): value is string => Boolean(value));
        return tags.some((tag) => policySet.has(tag));
      });
    }

    // GROK tag: 選定スコアでソート（降順）
    if (selectedTag === "grok") {
      result = sortByGrokScore(result);
    }

    return result;
  }, [rows, selectedPolicies, selectedTag]);

  useEffect(() => {
    if (selectedTag !== "policy") return;
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

  // リアルタイムデータをマージした配列を作成
  const filteredWithRealtime = useMemo(() => {
    if (realtimePrices.size === 0) return filtered;

    let matchedCount = 0;
    const result = filtered.map(row => {
      const realtimeData = realtimePrices.get(row.ticker);
      if (!realtimeData) return row;

      matchedCount++;

      return {
        ...row,
        close: realtimeData.price ?? row.close,
        diff: realtimeData.change ?? row.diff,
        pct_diff: realtimeData.changePercent ?? row.pct_diff,
        volume: realtimeData.volume ?? row.volume,
        marketTime: realtimeData.marketTime ?? row.marketTime,
        marketState: realtimeData.marketState ?? row.marketState,
        open: realtimeData.open ?? row.open,
        high: realtimeData.high ?? row.high,
        low: realtimeData.low ?? row.low,
      };
    });

    console.log(`[Realtime] Merged ${matchedCount} of ${filtered.length} rows with live data`);
    return result;
  }, [filtered, realtimePrices]);

  const priceSortedRows = useMemo(
    () =>
      sortPriceRows(filteredWithRealtime, sortState.price.key, sortState.price.direction),
    [filteredWithRealtime, sortState.price.key, sortState.price.direction]
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

  const realtimeSortedRows = useMemo(
    () => sortRealtimeRows(filteredWithRealtime, sortState.realtime?.key ?? null, sortState.realtime?.direction ?? null),
    [filteredWithRealtime, sortState.realtime?.key, sortState.realtime?.direction]
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

  const handleRealtimeSort = useCallback(
    (key: RealtimeSortKey, direction: SortDirection) => {
      setSortState((prev) => ({
        ...prev,
        realtime: {
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
    selectedTag === "policy" && policyOptions.length > 0;

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
      className={`flex flex-col gap-1 md:gap-2 flex-1 min-h-0 w-full ${
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
                <button
                  type="button"
                  onClick={() => {
                    fetchRealtimePrice(true); // forceRefresh=true でキャッシュを無視して常に最新データ取得
                  }}
                  className="inline-flex items-center opacity-60 hover:opacity-100 transition-opacity"
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 text-muted-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
                <div className="flex flex-col gap-0.5">
                  {realtimeData && (
                    <div className="text-xs text-muted-foreground font-mono">
                      最終更新: {realtimeData.timestamp}
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground/70">
                    Yahoo Finance API（20分ディレイ・15分間隔）
                  </div>
                </div>
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

      <div className="space-y-1 md:hidden">
        <div className="rounded-none border-0 border-b border-border/40 bg-card/60 px-2 py-1.5 shadow-sm space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium text-muted-foreground">
              リスト
            </span>
            <div className="flex-1 flex items-center gap-2">
              <Select
                value={selectedTag}
                onValueChange={(value) => setSelectedTag(value as TagValue)}
              >
                <SelectTrigger className="h-7 w-full rounded-md border border-border/50 bg-card/70 px-2 text-[11px] font-medium text-muted-foreground/80 shadow-sm backdrop-blur-sm transition-colors hover:border-primary/60 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none focus-visible:ring-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAG_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="text-[11px]"
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
              <button
                type="button"
                onClick={() => {
                  fetchRealtimePrice(true);
                }}
                className="inline-flex items-center opacity-60 hover:opacity-100 transition-opacity"
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 text-muted-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <div className="flex flex-col gap-0">
                {realtimeData && (
                  <div className="text-[9px] text-muted-foreground font-mono leading-tight">
                    {realtimeData.timestamp}
                  </div>
                )}
                <div className="text-[8px] text-muted-foreground/70 leading-tight">
                  Yahoo Finance API
                </div>
              </div>
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
            className="flex w-full items-center justify-between rounded-md border border-border/60 bg-card/70 px-2 py-1 text-[11px] font-medium text-muted-foreground/80 shadow-sm"
          >
            <span>フィルタ & ソート</span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${
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

      {/* Grok Backtest Banner - GROK タグの場合のみ表示（リスト選択の下、テーブルの上） */}
      {selectedTag === "grok" && <GrokBacktestBanner />}

      <StockListsDesktop
        priceRows={priceSortedRows}
        perfRows={perfSortedRows}
        techRows={techSortedRows}
        realtimeRows={realtimeSortedRows}
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
        realtimeSortKey={sortState.realtime.key}
        realtimeSortDirection={sortState.realtime.direction}
        onRealtimeSort={handleRealtimeSort}
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
