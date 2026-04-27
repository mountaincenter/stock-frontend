"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Pencil, Check, X, ChevronDown, ChevronUp, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw } from "lucide-react";
import { DevNavLinks, FilterButtonGroup } from "@/components/dev";

type DayTradeStock = {
  ticker: string;
  stock_name: string;
  grok_rank: number | null;
  close: number | null;
  price_diff: number | null;
  rsi9: number | null;
  atr_pct: number | null;
  prob_up: number | null;
  bucket: string | null;
  shortable: boolean;
  day_trade: boolean;
  ng: boolean;
  day_trade_available_shares: number | null;
  margin_sell_balance: number | null;  // 売り残
  margin_buy_balance: number | null;   // 買い残
  appearance_count: number;
  max_cost_100: number | null;
  short_recommended: boolean;
  reason_category: string | null;
};

type HistoryRecord = {
  date: string;
  weekday: string;
  prev_close: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  profit_phase1: number | null;
  profit_phase2: number | null;
};

type Summary = {
  unchecked: number;
  shortable: number;
  day_trade: number;
  day_trade_nonzero: number;
  ng: number;
  total_funds_shortable: number;
  total_funds_day_trade_nonzero: number;
  total_required_funds: number;
};

type ProbBinCell = {
  label: string;
  n: number;
  pf: number | null;
  winRate: number | null;
  avg: number | null;
  total: number | null;
  avgReturn: number | null;
};

type ProbBinGroup = {
  key: string;
  count: number;
  total: number;
  pf: number | null;
  winRate: number | null;
  avgReturn: number | null;
  bins: ProbBinCell[];
};

type ProbBinPfData = {
  view: string;
  probLabels: string[];
  dataRange: { start: string | null; end: string | null; tradingDays: number };
  total: number;
  results: ProbBinGroup[];
};

type FilterType = "all" | "unchecked" | "shortable" | "day_trade" | "ng";

const FILTER_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "unchecked", label: "未チェック" },
  { value: "shortable", label: "制度" },
  { value: "day_trade", label: "いちにち" },
  { value: "ng", label: "NG" },
];

export default function DayTradeListPage() {
  const [stocks, setStocks] = useState<DayTradeStock[]>([]);
  const [summary, setSummary] = useState<Summary>({
    unchecked: 0, shortable: 0, day_trade: 0, day_trade_nonzero: 0, ng: 0,
    total_funds_shortable: 0, total_funds_day_trade_nonzero: 0, total_required_funds: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [excludeZeroShares, setExcludeZeroShares] = useState(false);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [editedStocks, setEditedStocks] = useState<Record<string, { shortable: boolean; day_trade: boolean; ng: boolean; day_trade_available_shares: number | null; margin_sell_balance: number | null; margin_buy_balance: number | null }>>({});
  const [saving, setSaving] = useState(false);
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<Record<string, HistoryRecord[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<keyof DayTradeStock | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // リアルタイム寄付価格
  const [realtimeData, setRealtimeData] = useState<Record<string, { price: number | null; open: number | null; marketState: string | null; marketTime: string | null }>>({});
  const [realtimeLoading, setRealtimeLoading] = useState(false);
  const [realtimeTimestamp, setRealtimeTimestamp] = useState<string | null>(null);

  // マーケット指標（先物変化率等）
  const [marketData, setMarketData] = useState<{ futures_change_pct: number | null; nikkei_change_pct: number | null } | null>(null);

  // prob別パフォーマンス
  const [probPfData, setProbPfData] = useState<ProbBinPfData | null>(null);
  const [probPfView, setProbPfView] = useState<string>("daily");
  const [probPfPriceFilter, setProbPfPriceFilter] = useState<string>("all");
  const [probPfMarginFilter, setProbPfMarginFilter] = useState<string>("");
  const [probPfLoading, setProbPfLoading] = useState(false);
  const [probPfExpanded, setProbPfExpanded] = useState<Set<string>>(new Set());

  // 曜日ルール
  const [weekdayRule, setWeekdayRule] = useState<{
    weekday: string;
    direction: string;
    rule: string;
    pf: number;
    note: string;
  } | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/dev/day-trade-list");
      if (!res.ok) throw new Error("データ取得に失敗しました");
      const data = await res.json();
      setStocks(data.stocks);
      setSummary(data.summary);
      if (data.market) setMarketData(data.market);
      if (data.weekday_rule) setWeekdayRule(data.weekday_rule);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラー");
      setLoading(false);
    }
  };

  const fetchProbPf = useCallback(async (view: string, priceFilter: string, marginFilter: string) => {
    setProbPfLoading(true);
    try {
      const params = new URLSearchParams({ view });
      if (priceFilter !== "all") {
        const [min, max] = priceFilter.split("-").map(Number);
        params.set("price_min", String(min));
        params.set("price_max", String(max));
      }
      if (marginFilter) params.set("margin_type", marginFilter);
      const res = await fetch(`/api/dev/prob-bin-pf?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProbPfData(data);
      }
    } catch {
    } finally {
      setProbPfLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchProbPf("daily", "all", "");
  }, [fetchProbPf]);

  const fetchRealtime = useCallback(async (force: boolean = false) => {
    if (stocks.length === 0) return;
    setRealtimeLoading(true);
    try {
      const tickers = stocks.map((s) => s.ticker).join(",");
      const url = `/api/realtime?tickers=${encodeURIComponent(tickers)}${force ? "&force=true" : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("リアルタイムデータ取得失敗");
      const json = await res.json();
      const map: Record<string, { price: number | null; open: number | null; marketState: string | null; marketTime: string | null }> = {};
      for (const q of json.data) {
        map[q.ticker] = { price: q.price ?? null, open: q.open ?? null, marketState: q.marketState ?? null, marketTime: q.marketTime ?? null };
      }
      setRealtimeData(map);
      setRealtimeTimestamp(json.timestamp ? new Date(json.timestamp).toLocaleTimeString("ja-JP") : null);
    } catch (err) {
      console.error("リアルタイム取得エラー:", err);
    } finally {
      setRealtimeLoading(false);
    }
  }, [stocks]);

  const fetchHistory = useCallback(async (ticker: string) => {
    if (historyData[ticker]) return; // キャッシュがあればスキップ

    setLoadingHistory(ticker);
    try {
      const res = await fetch(`/api/dev/day-trade-list/history/${ticker}`);
      if (!res.ok) throw new Error("履歴取得に失敗");
      const data = await res.json();
      setHistoryData((prev) => ({ ...prev, [ticker]: data.history }));
    } catch (err) {
      console.error("履歴取得エラー:", err);
    } finally {
      setLoadingHistory(null);
    }
  }, [historyData]);

  const toggleExpand = (ticker: string, appearanceCount: number) => {
    if (bulkEditMode) return; // 編集モード中は展開不可
    if (appearanceCount < 1) return; // 0回は展開不可

    if (expandedTicker === ticker) {
      setExpandedTicker(null);
    } else {
      setExpandedTicker(ticker);
      fetchHistory(ticker);
    }
  };

  const startBulkEdit = () => {
    // 現在の状態をコピー
    const initial: Record<string, { shortable: boolean; day_trade: boolean; ng: boolean; day_trade_available_shares: number | null; margin_sell_balance: number | null; margin_buy_balance: number | null }> = {};
    stocks.forEach((s) => {
      initial[s.ticker] = { shortable: s.shortable, day_trade: s.day_trade, ng: s.ng, day_trade_available_shares: s.day_trade_available_shares, margin_sell_balance: s.margin_sell_balance, margin_buy_balance: s.margin_buy_balance };
    });
    setEditedStocks(initial);
    setBulkEditMode(true);
  };

  const cancelBulkEdit = () => {
    setEditedStocks({});
    setBulkEditMode(false);
  };

  const updateEditedStock = (ticker: string, field: "shortable" | "day_trade" | "ng", value: boolean) => {
    setEditedStocks((prev) => ({
      ...prev,
      [ticker]: { ...prev[ticker], [field]: value },
    }));
  };

  const updateEditedShares = (ticker: string, value: string) => {
    const numValue = value === "" ? null : parseInt(value, 10);
    setEditedStocks((prev) => ({
      ...prev,
      [ticker]: { ...prev[ticker], day_trade_available_shares: isNaN(numValue as number) ? null : numValue },
    }));
  };

  const updateEditedMargin = (ticker: string, field: "margin_sell_balance" | "margin_buy_balance", value: string) => {
    const numValue = value === "" ? null : parseInt(value, 10);
    setEditedStocks((prev) => ({
      ...prev,
      [ticker]: { ...prev[ticker], [field]: isNaN(numValue as number) ? null : numValue },
    }));
  };

  const saveBulkEdit = async () => {
    setSaving(true);
    try {
      // 変更があった銘柄のみ抽出
      const changes: { ticker: string; stockName: string; shortable: boolean; day_trade: boolean; ng: boolean; day_trade_available_shares: number | null; margin_sell_balance: number | null; margin_buy_balance: number | null }[] = [];
      stocks.forEach((s) => {
        const edited = editedStocks[s.ticker];
        if (edited && (
          edited.shortable !== s.shortable ||
          edited.day_trade !== s.day_trade ||
          edited.ng !== s.ng ||
          edited.day_trade_available_shares !== s.day_trade_available_shares ||
          edited.margin_sell_balance !== s.margin_sell_balance ||
          edited.margin_buy_balance !== s.margin_buy_balance
        )) {
          changes.push({ ticker: s.ticker, stockName: s.stock_name, ...edited });
        }
      });

      if (changes.length === 0) {
        setBulkEditMode(false);
        return;
      }

      // 一括更新API呼び出し
      const res = await fetch("/api/dev/day-trade-list/bulk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes.map((c) => ({
          ticker: c.ticker, // tickerで検索
          shortable: c.shortable,
          day_trade: c.day_trade,
          ng: c.ng,
          day_trade_available_shares: c.day_trade_available_shares,
          margin_sell_balance: c.margin_sell_balance,
          margin_buy_balance: c.margin_buy_balance,
        }))),
      });

      if (!res.ok) throw new Error("一括更新に失敗しました");

      // ローカル状態を更新
      setStocks((prev) =>
        prev.map((s) => {
          const edited = editedStocks[s.ticker];
          return edited ? { ...s, ...edited } : s;
        })
      );

      // サマリー再計算
      const updated = stocks.map((s) => {
        const edited = editedStocks[s.ticker];
        return edited ? { ...s, ...edited } : s;
      });
      const shortableStocks = updated.filter((s) => s.shortable);
      const dayTradeStocks = updated.filter((s) => s.day_trade && !s.shortable);
      const dayTradeNonzeroStocks = dayTradeStocks.filter((s) =>
        s.day_trade_available_shares != null && s.day_trade_available_shares > 0
      );
      const totalFundsShortable = shortableStocks.reduce(
        (sum, s) => sum + (s.max_cost_100 ?? 0), 0
      );
      const totalFundsDayTradeNonzero = dayTradeNonzeroStocks.reduce(
        (sum, s) => sum + (s.max_cost_100 ?? 0), 0
      );
      const totalRequiredFunds = updated
        .filter((s) => !s.ng && (
          s.shortable || (s.day_trade && s.day_trade_available_shares != null && s.day_trade_available_shares > 0)
        ))
        .reduce((sum, s) => sum + (s.max_cost_100 ?? 0), 0);

      setSummary({
        unchecked: updated.filter((s) => !s.shortable && !s.day_trade && !s.ng).length,
        shortable: shortableStocks.length,
        day_trade: dayTradeStocks.length,
        day_trade_nonzero: dayTradeNonzeroStocks.length,
        ng: updated.filter((s) => s.ng).length,
        total_funds_shortable: totalFundsShortable,
        total_funds_day_trade_nonzero: totalFundsDayTradeNonzero,
        total_required_funds: totalRequiredFunds,
      });

      setEditedStocks({});
      setBulkEditMode(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "更新エラー");
    } finally {
      setSaving(false);
    }
  };

  const getStatusLabel = (stock: DayTradeStock) => {
    if (stock.ng) return { label: "NG", color: "bg-rose-500/20 text-rose-400" };
    if (stock.shortable) return { label: "制度", color: "bg-teal-500/20 text-teal-400" };
    if (stock.day_trade) return { label: "いちにち", color: "bg-orange-500/20 text-orange-400" };
    return { label: "未", color: "bg-amber-500/20 text-amber-400" };
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return "-";
    return price.toLocaleString("ja-JP", { maximumFractionDigits: 0 });
  };

  const formatPercent = (pct: number | null, decimals = 2) => {
    if (pct === null) return "-";
    const sign = pct >= 0 ? "+" : "";
    return `${sign}${pct.toFixed(decimals)}%`;
  };

  const formatProfit = (profit: number | null) => {
    if (profit === null) return "-";
    const sign = profit >= 0 ? "+" : "";
    return `${sign}${profit.toLocaleString()}`;
  };

  const formatVolume = (vol: number | null) => {
    if (vol === null) return "-";
    if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
    if (vol >= 1_000) return `${(vol / 1_000).toFixed(0)}K`;
    return vol.toLocaleString();
  };

  const toggleSort = (key: keyof DayTradeStock) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else { setSortKey(null); setSortDir("asc"); }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: keyof DayTradeStock }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 opacity-30 ml-0.5 inline" />;
    return sortDir === "asc"
      ? <ArrowUp className="w-3 h-3 text-primary ml-0.5 inline" />
      : <ArrowDown className="w-3 h-3 text-primary ml-0.5 inline" />;
  };

  const filteredStocks = useMemo(() => {
    let list = filter === "all"
      ? stocks
      : filter === "unchecked"
        ? stocks.filter((s) => !s.shortable && !s.day_trade && !s.ng)
        : filter === "shortable"
          ? stocks.filter((s) => s.shortable)
          : filter === "day_trade"
            ? stocks.filter((s) => s.day_trade && !s.shortable)
            : stocks.filter((s) => s.ng);

    // 除0: いちにち信用かつ株数0を除外（制度信用は常に表示）
    if (excludeZeroShares) {
      list = list.filter(s => s.shortable || (s.day_trade_available_shares != null && s.day_trade_available_shares > 0));
    }

    if (sortKey) {
      const bucketRank: Record<string, number> = { SHORT: 0, DISC: 1, LONG: 2 };
      list = [...list].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        let cmp: number;
        if (sortKey === "bucket") {
          cmp = (bucketRank[av as string] ?? 99) - (bucketRank[bv as string] ?? 99);
        } else {
          cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
        }
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return list;
  }, [stocks, filter, sortKey, sortDir, excludeZeroShares]);

  if (loading) {
    return (
      <main className="relative min-h-screen">
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
        </div>
        <div className="max-w-[1600px] mx-auto px-4 py-4">
          <div className="mb-6">
            <div className="h-4 w-24 bg-muted/50 rounded mb-3 animate-pulse" />
            <div className="h-6 w-64 bg-muted/50 rounded mb-2 animate-pulse" />
          </div>
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl border border-border/40 bg-card/50 p-4 h-20 animate-pulse" />
            ))}
          </div>
          <div className="rounded-2xl border border-border/40 bg-card/50 overflow-hidden">
            <div className="h-10 bg-muted/30 border-b border-border/40" />
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-12 border-b border-border/20 animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="relative min-h-screen flex items-center justify-center">
        <div className="fixed inset-0 -z-10 bg-gradient-to-br from-background via-background to-muted/20" />
        <div className="text-rose-400 text-sm">エラー: {error}</div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen">
      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-primary/8 via-primary/3 to-transparent blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-1/3 -left-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-accent/10 via-accent/4 to-transparent blur-3xl animate-pulse-slower" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <div className="max-w-[1600px] mx-auto px-4 py-4 leading-[1.8] tracking-[0.02em] font-sans">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4 pb-3 border-b border-border/30">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Grok デイトレードリスト
            </h1>
            <p className="text-sm text-muted-foreground">
              空売り対象銘柄の管理（制度信用・いちにち信用）
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <DevNavLinks />
          </div>
        </header>

        {/* 曜日ルールバナー */}
        {weekdayRule && (
          <div className={`mb-4 rounded-xl border px-4 py-3 flex items-center gap-3 ${
            weekdayRule.direction === "long"
              ? "border-emerald-500/40 bg-emerald-500/10"
              : weekdayRule.direction === "excluded"
                ? "border-amber-500/40 bg-amber-500/10"
                : "border-rose-500/40 bg-rose-500/10"
          }`}>
            <span className={`text-lg font-bold ${
              weekdayRule.direction === "long"
                ? "text-emerald-400"
                : weekdayRule.direction === "excluded"
                  ? "text-amber-400"
                  : "text-rose-400"
            }`}>
              {weekdayRule.weekday}
            </span>
            <div className="flex-1">
              <span className={`text-sm font-medium ${
                weekdayRule.direction === "long"
                  ? "text-emerald-400"
                  : weekdayRule.direction === "excluded"
                    ? "text-amber-400"
                    : "text-rose-400"
              }`}>
                {weekdayRule.rule}
              </span>
              <span className="text-xs text-muted-foreground ml-2">PF {weekdayRule.pf.toFixed(2)}</span>
            </div>
            <span className="text-xs text-muted-foreground max-w-xs hidden sm:block">{weekdayRule.note}</span>
          </div>
        )}

        {/* Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
          <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-3 sm:p-4 shadow-lg shadow-black/5 backdrop-blur-xl text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="text-xl sm:text-2xl tabular-nums font-bold text-teal-400">{summary.shortable}</div>
              <div className="text-xs text-muted-foreground mt-1 whitespace-nowrap">制度信用</div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-3 sm:p-4 shadow-lg shadow-black/5 backdrop-blur-xl text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="text-xl sm:text-2xl tabular-nums font-bold text-orange-400">
                {summary.day_trade_nonzero}<span className="text-sm text-muted-foreground">/{summary.day_trade}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1 whitespace-nowrap">いちにち除0/全</div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-3 sm:p-4 shadow-lg shadow-black/5 backdrop-blur-xl text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="text-xl sm:text-2xl tabular-nums font-bold text-rose-400">{summary.ng}</div>
              <div className="text-xs text-muted-foreground mt-1 whitespace-nowrap">NG</div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-amber-500/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-3 sm:p-4 shadow-lg shadow-black/5 backdrop-blur-xl text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="text-xl sm:text-2xl tabular-nums font-bold text-amber-400">{summary.unchecked}</div>
              <div className="text-xs text-muted-foreground mt-1 whitespace-nowrap">未チェック</div>
            </div>
          </div>
        </div>

        {/* Required Funds Summary */}
        <div className="relative overflow-hidden rounded-xl border border-primary/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-3 sm:p-4 shadow-lg shadow-black/5 backdrop-blur-xl mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
          <div className="relative">
            <div className="text-xs text-muted-foreground mb-2">必要資金（100株ベース・制限値幅込み）</div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg sm:text-xl tabular-nums font-bold text-teal-400">
                  {(summary.total_funds_shortable / 10000).toLocaleString("ja-JP", { maximumFractionDigits: 0 })}
                  <span className="text-xs text-muted-foreground ml-0.5">万</span>
                </div>
                <div className="text-xs text-muted-foreground">制度信用</div>
              </div>
              <div>
                <div className="text-lg sm:text-xl tabular-nums font-bold text-orange-400">
                  {(summary.total_funds_day_trade_nonzero / 10000).toLocaleString("ja-JP", { maximumFractionDigits: 0 })}
                  <span className="text-xs text-muted-foreground ml-0.5">万</span>
                </div>
                <div className="text-xs text-muted-foreground">いちにち除0</div>
              </div>
              <div>
                <div className="text-lg sm:text-xl tabular-nums font-bold text-primary">
                  {(summary.total_required_funds / 10000).toLocaleString("ja-JP", { maximumFractionDigits: 0 })}
                  <span className="text-xs text-muted-foreground ml-0.5">万</span>
                </div>
                <div className="text-xs text-muted-foreground">合計</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        {/* マーケット指標カード */}
        {marketData && (
          <div className="flex items-center gap-3 mb-4">
            {marketData.futures_change_pct !== null && (() => {
              const v = marketData.futures_change_pct;
              const isWarning = v > -0.5 && v <= 0;
              const color = isWarning ? "border-amber-500/60 bg-amber-500/10" : v > 0 ? "border-emerald-500/40 bg-emerald-500/10" : "border-rose-500/40 bg-rose-500/10";
              const textColor = isWarning ? "text-amber-400" : v > 0 ? "text-emerald-400" : "text-rose-400";
              return (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${color}`}>
                  <span className="text-xs text-muted-foreground">先物gap</span>
                  <span className={`text-sm font-medium tabular-nums ${textColor}`}>{v >= 0 ? "+" : ""}{v.toFixed(2)}%</span>
                  {isWarning && <span className="text-[10px] text-amber-400/80">⚠ SHORT注意</span>}
                </div>
              );
            })()}
            {marketData.nikkei_change_pct !== null && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${marketData.nikkei_change_pct > 1 ? "border-amber-500/60 bg-amber-500/10" : "border-border/40 bg-muted/20"}`}>
                <span className="text-xs text-muted-foreground">N225前日比</span>
                <span className={`text-sm font-medium tabular-nums ${marketData.nikkei_change_pct > 1 ? "text-amber-400" : marketData.nikkei_change_pct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{marketData.nikkei_change_pct >= 0 ? "+" : ""}{marketData.nikkei_change_pct.toFixed(2)}%</span>
                {marketData.nikkei_change_pct > 1 && <span className="text-[10px] text-amber-400/80">⚠ SHORT注意</span>}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">フィルター</span>
            <FilterButtonGroup
              options={FILTER_OPTIONS}
              value={filter}
              onChange={(v) => setFilter(v as FilterType)}
            />
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={excludeZeroShares}
                onChange={(e) => setExcludeZeroShares(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-amber-500/50 bg-muted/30 text-amber-500 focus:ring-amber-500/50"
              />
              <span className="text-xs text-amber-400 whitespace-nowrap">除0株</span>
            </label>
          <div className="flex items-center gap-2 sm:gap-3 sm:ml-auto">
            <button
              type="button"
              disabled={realtimeLoading}
              onClick={() => fetchRealtime(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-400 text-xs font-medium hover:bg-sky-500/30 transition-colors whitespace-nowrap disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${realtimeLoading ? "animate-spin" : ""}`} />
              寄付
              {realtimeTimestamp && (
                <span className="text-sky-400/60 ml-1">{realtimeTimestamp}</span>
              )}
            </button>
            {bulkEditMode ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={saveBulkEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span className="whitespace-nowrap">保存</span>
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={cancelBulkEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-400 text-sm font-medium hover:bg-rose-500/30 transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  <span className="whitespace-nowrap">キャンセル</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={startBulkEdit}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-colors whitespace-nowrap"
              >
                <Pencil className="w-3.5 h-3.5" />
                一括編集
              </button>
            )}
            <span className="text-sm tabular-nums text-muted-foreground whitespace-nowrap">
              {filteredStocks.length}件
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 shadow-xl shadow-black/5 backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm md:text-base">
              <thead>
                <tr className="border-b border-border/40 bg-muted/30">
                  <th className="px-2 py-3 text-left text-foreground font-medium text-xs whitespace-nowrap cursor-pointer select-none hover:text-primary" onClick={() => toggleSort("ticker")}>銘柄<SortIcon col="ticker" /></th>
                  <th className="px-2 py-3 text-left text-foreground font-medium text-xs whitespace-nowrap cursor-pointer select-none hover:text-primary" onClick={() => toggleSort("stock_name")}>名称<SortIcon col="stock_name" /></th>
                  <th className="px-2 py-3 text-center text-foreground font-medium text-xs whitespace-nowrap cursor-pointer select-none hover:text-primary" onClick={() => toggleSort("grok_rank")}>Rank<SortIcon col="grok_rank" /></th>
                  <th className="px-2 py-3 text-center text-foreground font-medium text-xs whitespace-nowrap cursor-pointer select-none hover:text-primary" onClick={() => toggleSort("appearance_count")}>登場<SortIcon col="appearance_count" /></th>
                  <th className="px-2 py-3 text-right text-foreground font-medium text-xs whitespace-nowrap cursor-pointer select-none hover:text-primary" onClick={() => toggleSort("close")}>終値<SortIcon col="close" /></th>
                  <th className="px-2 py-3 text-right text-foreground font-medium text-xs whitespace-nowrap cursor-pointer select-none hover:text-primary" onClick={() => toggleSort("price_diff")}>前日差<SortIcon col="price_diff" /></th>
                  <th className="px-2 py-3 text-right text-foreground font-medium text-xs whitespace-nowrap">寄付差</th>
                  <th className="px-2 py-3 text-right text-foreground font-medium text-xs whitespace-nowrap cursor-pointer select-none hover:text-primary" onClick={() => toggleSort("prob_up")}>prob<SortIcon col="prob_up" /></th>
                  <th className="px-2 py-3 text-center text-foreground font-medium text-xs whitespace-nowrap cursor-pointer select-none hover:text-primary" onClick={() => toggleSort("bucket")}>Bucket<SortIcon col="bucket" /></th>
                  <th className="px-2 py-3 text-right text-foreground font-medium text-xs whitespace-nowrap cursor-pointer select-none hover:text-primary" onClick={() => toggleSort("atr_pct")}>ATR%<SortIcon col="atr_pct" /></th>
                  <th className="px-2 py-3 text-center text-foreground font-medium text-xs whitespace-nowrap">
                    {bulkEditMode ? "制度" : "信用区分"}
                  </th>
                  {bulkEditMode && (
                    <>
                      <th className="px-2 py-3 text-center text-foreground font-medium text-xs whitespace-nowrap">いち</th>
                      <th className="px-2 py-3 text-center text-foreground font-medium text-xs whitespace-nowrap">NG</th>
                      <th className="px-2 py-3 text-center text-foreground font-medium text-xs whitespace-nowrap">株数</th>
                      <th className="px-2 py-3 text-center text-foreground font-medium text-xs whitespace-nowrap">売残</th>
                      <th className="px-2 py-3 text-center text-foreground font-medium text-xs whitespace-nowrap">買残</th>
                    </>
                  )}
                  {!bulkEditMode && (
                    <>
                      <th className="px-2 py-3 text-center text-foreground font-medium text-xs whitespace-nowrap cursor-pointer select-none hover:text-primary" onClick={() => toggleSort("day_trade_available_shares")}>株数<SortIcon col="day_trade_available_shares" /></th>
                      <th className="px-2 py-3 text-right text-foreground font-medium text-xs whitespace-nowrap cursor-pointer select-none hover:text-primary" onClick={() => toggleSort("margin_sell_balance")}>売残<SortIcon col="margin_sell_balance" /></th>
                      <th className="px-2 py-3 text-right text-foreground font-medium text-xs whitespace-nowrap cursor-pointer select-none hover:text-primary" onClick={() => toggleSort("margin_buy_balance")}>買残<SortIcon col="margin_buy_balance" /></th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredStocks.map((stock) => {
                  const status = getStatusLabel(stock);
                  const edited = editedStocks[stock.ticker];
                  const isExpanded = expandedTicker === stock.ticker;
                  const canExpand = !bulkEditMode && stock.appearance_count >= 1;
                  const history = historyData[stock.ticker] || [];
                  const isLoadingHistory = loadingHistory === stock.ticker;
                  const colSpan = bulkEditMode ? 16 : 14;

                  return (
                    <React.Fragment key={stock.ticker}>
                      <tr
                        className={`hover:bg-primary/5 transition-colors ${canExpand ? "cursor-pointer" : ""} ${isExpanded ? "bg-primary/5" : ""}`}
                        onClick={() => canExpand && toggleExpand(stock.ticker, stock.appearance_count)}
                      >
                        <td className="px-2 py-4 tabular-nums text-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {canExpand && (
                              isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-primary" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50" />
                            )}
                            {stock.ticker}
                          </div>
                        </td>
                        <td className="px-2 py-4 text-foreground">
                          <button
                            type="button"
                            className="hover:text-primary transition-colors block max-w-[9em] truncate text-left"
                            title={stock.stock_name}
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/${stock.ticker}`, "stock-detail");
                            }}
                          >
                            {stock.stock_name}
                          </button>
                          <div className="flex gap-1 mt-0.5">
                            {stock.short_recommended && (
                              <span className="text-[10px] px-1 py-0 rounded bg-emerald-500/20 text-emerald-400 font-medium">SHORT推奨</span>
                            )}
                            {stock.reason_category && (
                              <span className="text-[10px] px-1 py-0 rounded bg-white/5 text-muted-foreground">{stock.reason_category}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-4 text-center tabular-nums text-foreground">
                          {stock.grok_rank ?? "-"}
                        </td>
                        <td className={`px-2 py-4 text-center tabular-nums ${stock.appearance_count > 1 ? "text-primary font-medium" : "text-muted-foreground"}`}>
                          {stock.appearance_count}
                        </td>
                        <td className="px-2 py-4 text-right tabular-nums whitespace-nowrap text-muted-foreground">
                          {formatPrice(stock.close)}
                        </td>
                        <td className={`px-2 py-4 text-right tabular-nums whitespace-nowrap ${
                          stock.price_diff !== null
                            ? stock.price_diff > 0
                              ? "text-emerald-400"
                              : stock.price_diff < 0
                                ? "text-rose-400"
                                : "text-muted-foreground"
                            : "text-muted-foreground"
                        }`}>
                          {stock.price_diff !== null
                            ? (stock.price_diff > 0 ? "+" : "") + stock.price_diff.toLocaleString()
                            : "-"}
                        </td>
                        {/* 寄付差: price - open
                            常に表示。未寄付時（ザラ場中にmarketTimeが当日でない）のみ"-"
                        */}
                        <td className={`px-2 py-4 text-right tabular-nums whitespace-nowrap ${
                          (() => {
                            const rt = realtimeData[stock.ticker];
                            if (!rt || rt.price === null || rt.open === null || rt.open <= 0) return "text-muted-foreground";
                            // 未寄付判定: ザラ場中にmarketTimeが当日9:00以降でなければ未寄付
                            const now = new Date();
                            const jst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
                            const jstTime = jst.getHours() * 60 + jst.getMinutes();
                            const jstDay = jst.getDay();
                            const isWeekday = jstDay >= 1 && jstDay <= 5;
                            const isZaraba = isWeekday && jstTime >= 540 && jstTime <= 930;
                            if (isZaraba && rt.marketTime) {
                              const mt = new Date(rt.marketTime);
                              const mtJst = new Date(mt.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
                              const today = jst.toDateString();
                              if (mtJst.toDateString() !== today) return "text-muted-foreground"; // 未寄付
                            }
                            const diff = rt.price - rt.open;
                            return diff > 0 ? "text-emerald-400" : diff < 0 ? "text-rose-400" : "text-muted-foreground";
                          })()
                        }`}>
                          {(() => {
                            const rt = realtimeData[stock.ticker];
                            if (!rt || rt.price === null || rt.open === null || rt.open <= 0) return "-";
                            const now = new Date();
                            const jst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
                            const jstTime = jst.getHours() * 60 + jst.getMinutes();
                            const jstDay = jst.getDay();
                            const isWeekday = jstDay >= 1 && jstDay <= 5;
                            const isZaraba = isWeekday && jstTime >= 540 && jstTime <= 930;
                            if (isZaraba && rt.marketTime) {
                              const mt = new Date(rt.marketTime);
                              const mtJst = new Date(mt.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
                              const today = jst.toDateString();
                              if (mtJst.toDateString() !== today) return "-"; // 未寄付
                            }
                            const diff = rt.price - rt.open;
                            return (diff > 0 ? "+" : "") + diff.toLocaleString();
                          })()}
                        </td>
                        <td className={`px-2 py-4 text-right tabular-nums ${
                          stock.prob_up !== null
                            ? stock.prob_up <= 0.16
                              ? "text-emerald-400 font-medium"
                              : stock.prob_up >= 0.61
                                ? "text-rose-400 font-medium"
                                : "text-muted-foreground"
                            : "text-muted-foreground"
                        }`}>
                          {stock.prob_up !== null ? stock.prob_up.toFixed(2) : "-"}
                        </td>
                        <td className={`px-2 py-4 text-center tabular-nums font-medium ${
                          stock.bucket === "SHORT" ? "text-rose-400" :
                          stock.bucket === "DISC" ? "text-amber-400" :
                          stock.bucket === "LONG" ? "text-emerald-400" :
                          "text-muted-foreground"
                        }`}>
                          {stock.bucket ?? "-"}
                        </td>
                        <td className={`px-2 py-4 text-right tabular-nums whitespace-nowrap ${
                          stock.atr_pct !== null && stock.atr_pct < 3
                            ? "text-rose-400 font-medium"
                            : stock.atr_pct !== null && stock.atr_pct >= 6
                              ? "text-emerald-400 font-medium"
                              : "text-muted-foreground"
                        }`}>
                          {stock.atr_pct !== null ? stock.atr_pct.toFixed(1) : "-"}
                        </td>
                        {bulkEditMode ? (
                          <>
                            <td className="px-2 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={edited?.shortable ?? stock.shortable}
                                onChange={(e) => updateEditedStock(stock.ticker, "shortable", e.target.checked)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-4 h-4 accent-teal-500"
                              />
                            </td>
                            <td className="px-2 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={edited?.day_trade ?? stock.day_trade}
                                onChange={(e) => updateEditedStock(stock.ticker, "day_trade", e.target.checked)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-4 h-4 accent-orange-500"
                              />
                            </td>
                            <td className="px-2 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={edited?.ng ?? stock.ng}
                                onChange={(e) => updateEditedStock(stock.ticker, "ng", e.target.checked)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-4 h-4 accent-rose-500"
                              />
                            </td>
                            <td className="px-2 py-4 text-center">
                              <input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                max={999999}
                                step={100}
                                value={edited?.day_trade_available_shares ?? ""}
                                onChange={(e) => updateEditedShares(stock.ticker, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                placeholder="-"
                                disabled={!(edited?.day_trade ?? stock.day_trade)}
                                className={`w-24 px-2 py-1 text-right tabular-nums bg-muted/50 border border-border/40 rounded focus:outline-none focus:border-primary/50 ${
                                  !(edited?.day_trade ?? stock.day_trade) ? "opacity-30 cursor-not-allowed" : ""
                                }`}
                              />
                            </td>
                            <td className="px-2 py-4 text-center">
                              <input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                step={1000}
                                value={edited?.margin_sell_balance ?? ""}
                                onChange={(e) => updateEditedMargin(stock.ticker, "margin_sell_balance", e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                placeholder="-"
                                className="w-24 px-2 py-1 text-right tabular-nums bg-muted/50 border border-border/40 rounded focus:outline-none focus:border-primary/50"
                              />
                            </td>
                            <td className="px-2 py-4 text-center">
                              <input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                step={1000}
                                value={edited?.margin_buy_balance ?? ""}
                                onChange={(e) => updateEditedMargin(stock.ticker, "margin_buy_balance", e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                placeholder="-"
                                className="w-24 px-2 py-1 text-right tabular-nums bg-muted/50 border border-border/40 rounded focus:outline-none focus:border-primary/50"
                              />
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-4 text-center whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded text-sm font-medium ${status.color}`}>
                                {status.label}
                              </span>
                            </td>
                            <td className={`px-2 py-4 tabular-nums text-muted-foreground ${
                              stock.day_trade_available_shares != null ? "text-right" : "text-center"
                            }`}>
                              {stock.day_trade_available_shares != null ? stock.day_trade_available_shares.toLocaleString() : "-"}
                            </td>
                            <td className="px-2 py-4 text-right tabular-nums text-muted-foreground">
                              {stock.margin_sell_balance != null ? stock.margin_sell_balance.toLocaleString() : "-"}
                            </td>
                            <td className="px-2 py-4 text-right tabular-nums text-muted-foreground">
                              {stock.margin_buy_balance != null ? stock.margin_buy_balance.toLocaleString() : "-"}
                            </td>
                          </>
                        )}
                      </tr>
                      {/* 履歴展開行 */}
                      {isExpanded && (
                        <tr className="bg-muted/20">
                          <td colSpan={colSpan} className="px-4 py-3">
                            {isLoadingHistory ? (
                              <div className="text-center text-sm text-muted-foreground py-2">読み込み中...</div>
                            ) : history.length === 0 ? (
                              <div className="text-center text-sm text-muted-foreground py-2">履歴データなし</div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-border/30">
                                      <th className="px-2 py-2 text-left text-foreground font-medium">日付</th>
                                      <th className="px-2 py-2 text-center text-foreground font-medium">曜日</th>
                                      <th className="px-2 py-2 text-right text-foreground font-medium">前終</th>
                                      <th className="px-2 py-2 text-right text-foreground font-medium">始値</th>
                                      <th className="px-2 py-2 text-right text-foreground font-medium">高値</th>
                                      <th className="px-2 py-2 text-right text-foreground font-medium">安値</th>
                                      <th className="px-2 py-2 text-right text-foreground font-medium">終値</th>
                                      <th className="px-2 py-2 text-right text-foreground font-medium">出来高</th>
                                      <th className="px-2 py-2 text-right text-foreground font-medium">前場</th>
                                      <th className="px-2 py-2 text-right text-foreground font-medium">大引</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border/20">
                                    {history.map((h, idx) => {
                                      // ショートベース: GU(始値>前終)は赤、GD(始値<前終)は緑
                                      const openColor = h.open !== null && h.prev_close !== null
                                        ? h.open > h.prev_close ? "text-rose-400" : h.open < h.prev_close ? "text-emerald-400" : "text-muted-foreground"
                                        : "text-muted-foreground";
                                      // ショートベース: 終値>始値は赤、終値<始値は緑
                                      const closeColor = h.close !== null && h.open !== null
                                        ? h.close > h.open ? "text-rose-400" : h.close < h.open ? "text-emerald-400" : "text-muted-foreground"
                                        : "text-muted-foreground";
                                      return (
                                        <tr key={`${h.date}-${idx}`} className="hover:bg-primary/5">
                                          <td className="px-2 py-2 tabular-nums text-foreground">{h.date}</td>
                                          <td className="px-2 py-2 text-center text-foreground">{h.weekday}</td>
                                          <td className="px-2 py-2 text-right tabular-nums text-foreground">{formatPrice(h.prev_close)}</td>
                                          <td className={`px-2 py-2 text-right tabular-nums ${openColor}`}>{formatPrice(h.open)}</td>
                                          <td className="px-2 py-2 text-right tabular-nums text-foreground">{formatPrice(h.high)}</td>
                                          <td className="px-2 py-2 text-right tabular-nums text-foreground">{formatPrice(h.low)}</td>
                                          <td className={`px-2 py-2 text-right tabular-nums ${closeColor}`}>{formatPrice(h.close)}</td>
                                          <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{formatVolume(h.volume)}</td>
                                          <td className={`px-2 py-2 text-right tabular-nums ${h.profit_phase1 !== null ? (h.profit_phase1 >= 0 ? "text-emerald-400" : "text-rose-400") : "text-muted-foreground"}`}>
                                            {formatProfit(h.profit_phase1)}
                                          </td>
                                          <td className={`px-2 py-2 text-right tabular-nums ${h.profit_phase2 !== null ? (h.profit_phase2 >= 0 ? "text-emerald-400" : "text-rose-400") : "text-muted-foreground"}`}>
                                            {formatProfit(h.profit_phase2)}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ML Bucket Legend */}
        <div className="relative overflow-hidden rounded-xl border border-primary/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 mt-4 px-4 py-3 shadow-lg shadow-black/5 backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
          <div className="relative">
            <div className="text-xs text-muted-foreground mb-2 font-medium">ML予測 閾値区分（PFテーブル用）</div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span><span className="text-rose-400 font-medium">SHORT</span>: prob &lt; 0.45</span>
              <span><span className="text-amber-400 font-medium">DISC</span>: 0.45 ≤ prob ≤ 0.70</span>
              <span><span className="text-emerald-400 font-medium">LONG</span>: prob &gt; 0.70</span>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              prob: 株価上昇確率 / ATR: <span className="text-rose-400">3%未満</span>=負け傾向 <span className="text-emerald-400">6%以上</span>=高ボラ
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 mt-4 px-4 py-3 shadow-lg shadow-black/5 backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
          <div className="relative text-sm text-muted-foreground">
            <p><span className="text-teal-400 font-medium">制度</span>: 制度信用で空売り可能（貸株料あり）</p>
            <p><span className="text-orange-400 font-medium">いちにち</span>: いちにち信用のみ対象（当日決済必須）</p>
            <p><span className="text-rose-400 font-medium">NG</span>: トレード対象外</p>
          </div>
        </div>

        {/* prob別パフォーマンス */}
        <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 mt-4 shadow-lg shadow-black/5 backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
          <div className="relative px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-muted-foreground font-medium">prob別パフォーマンス（SHORT基準 / 残0除外）</div>
              {probPfData && (
                <div className="text-xs text-muted-foreground">
                  {probPfData.dataRange.start}～{probPfData.dataRange.end}（{probPfData.dataRange.tradingDays}日 / n={probPfData.total}）
                </div>
              )}
            </div>

            {/* タブ */}
            <div className="flex gap-1 mb-3">
              {[
                { key: "daily", label: "日別" },
                { key: "weekly", label: "週別" },
                { key: "monthly", label: "月別" },
                { key: "weekday", label: "曜日別" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => { setProbPfView(key); fetchProbPf(key, probPfPriceFilter, probPfMarginFilter); }}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${probPfView === key ? "bg-primary/20 text-primary font-medium" : "text-muted-foreground hover:bg-muted/30"}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* フィルター */}
            <div className="flex flex-wrap gap-2 mb-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>価格帯:</span>
                {[
                  { key: "all", label: "全" },
                  { key: "0-1000", label: "~1,000円" },
                  { key: "1000-3000", label: "1,000~3,000円" },
                  { key: "3000-5000", label: "3,000~5,000円" },
                  { key: "5000-10000", label: "5,000~10,000円" },
                  { key: "10000-999999", label: "10,000円~" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => { setProbPfPriceFilter(key); fetchProbPf(probPfView, key, probPfMarginFilter); }}
                    className={`px-2 py-0.5 rounded text-xs transition-colors ${probPfPriceFilter === key ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted/30"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>区分:</span>
                {[
                  { key: "", label: "全" },
                  { key: "制度", label: "制度" },
                  { key: "いちにち", label: "いちにち" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => { setProbPfMarginFilter(key); fetchProbPf(probPfView, probPfPriceFilter, key); }}
                    className={`px-2 py-0.5 rounded text-xs transition-colors ${probPfMarginFilter === key ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted/30"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 折りたたみ式テーブル */}
            {probPfLoading ? (
              <div className="text-xs text-muted-foreground py-4 text-center">読み込み中...</div>
            ) : probPfData && probPfData.results.length > 0 ? (
              <div className="space-y-1 max-h-[700px] overflow-y-auto">
                {probPfData.results.map((group) => {
                  const isOpen = probPfExpanded.has(group.key);
                  const maxTotal = Math.max(...group.bins.filter(b => b.total !== null).map(b => Math.abs(b.total!)), 1);
                  return (
                    <div key={group.key} className="border border-border/30 rounded-lg overflow-hidden">
                      <button
                        onClick={() => {
                          const next = new Set(probPfExpanded);
                          if (isOpen) next.delete(group.key); else next.add(group.key);
                          setProbPfExpanded(next);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-xs hover:bg-muted/30 transition-colors"
                      >
                        <span className="text-muted-foreground/60">{isOpen ? "▼" : "▶"}</span>
                        <span className="font-medium text-foreground min-w-[80px] text-left">{group.key}</span>
                        <span className="text-muted-foreground">N={group.count}</span>
                        <span className={group.winRate !== null && group.winRate >= 55 ? "text-emerald-400" : group.winRate !== null && group.winRate < 45 ? "text-rose-400" : "text-muted-foreground"}>
                          勝率{group.winRate ?? "-"}%
                        </span>
                        <span className={group.pf !== null && group.pf >= 1.5 ? "text-teal-400" : group.pf !== null && group.pf < 1 ? "text-rose-400" : "text-muted-foreground"}>
                          PF {group.pf?.toFixed(2) ?? "-"}
                        </span>
                        <span className={`tabular-nums ${group.total > 0 ? "text-emerald-400" : group.total < 0 ? "text-rose-400" : "text-muted-foreground"}`}>
                          ¥{group.total.toLocaleString()}
                        </span>
                      </button>
                      {isOpen && (
                        <div className="px-3 pb-3">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border/40">
                                <th className="px-2 py-1.5 text-left text-muted-foreground font-medium">prob区間</th>
                                <th className="px-2 py-1.5 text-right text-muted-foreground font-medium">件数</th>
                                <th className="px-2 py-1.5 text-right text-muted-foreground font-medium">勝率</th>
                                <th className="px-2 py-1.5 text-right text-muted-foreground font-medium">平均リターン</th>
                                <th className="px-2 py-1.5 text-right text-muted-foreground font-medium">平均損益/100株</th>
                                <th className="px-2 py-1.5 text-right text-muted-foreground font-medium">合計損益/100株</th>
                                <th className="px-2 py-1.5 text-muted-foreground font-medium" style={{ minWidth: 100 }}>損益バー</th>
                                <th className="px-2 py-1.5 text-right text-muted-foreground font-medium">PF</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.bins.map((bin) => {
                                if (bin.n === 0) return (
                                  <tr key={bin.label} className="border-b border-border/20">
                                    <td className="px-2 py-1.5 font-medium">{bin.label}</td>
                                    <td className="px-2 py-1.5 text-right text-muted-foreground/40">0</td>
                                    <td colSpan={6} className="px-2 py-1.5 text-center text-muted-foreground/30">-</td>
                                  </tr>
                                );
                                const wrColor = bin.winRate !== null && bin.winRate >= 55 ? "text-emerald-400" : bin.winRate !== null && bin.winRate < 45 ? "text-rose-400" : "text-muted-foreground";
                                const avgColor = bin.avg !== null && bin.avg > 0 ? "text-emerald-400" : bin.avg !== null && bin.avg < 0 ? "text-rose-400" : "text-muted-foreground";
                                const totalColor = bin.total !== null && bin.total > 0 ? "text-emerald-400" : bin.total !== null && bin.total < 0 ? "text-rose-400" : "text-muted-foreground";
                                const pfColor = bin.pf !== null && bin.pf >= 1.5 ? "text-emerald-400" : bin.pf !== null && bin.pf >= 1 ? "text-muted-foreground" : "text-rose-400";
                                const retColor = bin.avgReturn !== null && bin.avgReturn > 0 ? "text-emerald-400" : bin.avgReturn !== null && bin.avgReturn < 0 ? "text-rose-400" : "text-muted-foreground";
                                const barWidth = bin.total !== null ? Math.min(Math.abs(bin.total) / maxTotal * 100, 100) : 0;
                                const barColor = bin.total !== null && bin.total >= 0 ? "bg-emerald-500/60" : "bg-rose-500/60";
                                return (
                                  <tr key={bin.label} className="border-b border-border/20 hover:bg-muted/20">
                                    <td className="px-2 py-1.5 font-medium">{bin.label}</td>
                                    <td className="px-2 py-1.5 text-right tabular-nums">{bin.n}</td>
                                    <td className={`px-2 py-1.5 text-right tabular-nums ${wrColor}`}>{bin.winRate !== null ? `${bin.winRate}%` : "-"}</td>
                                    <td className={`px-2 py-1.5 text-right tabular-nums ${retColor}`}>{bin.avgReturn !== null ? `${bin.avgReturn >= 0 ? "+" : ""}${bin.avgReturn.toFixed(2)}%` : "-"}</td>
                                    <td className={`px-2 py-1.5 text-right tabular-nums ${avgColor}`}>{bin.avg !== null ? `¥${bin.avg >= 0 ? "+" : ""}${bin.avg.toLocaleString()}` : "-"}</td>
                                    <td className={`px-2 py-1.5 text-right tabular-nums ${totalColor}`}>{bin.total !== null ? `¥${bin.total >= 0 ? "+" : ""}${bin.total.toLocaleString()}` : "-"}</td>
                                    <td className="px-2 py-1.5"><div className={`${barColor} rounded-sm`} style={{ width: `${barWidth}%`, height: 14 }} /></td>
                                    <td className={`px-2 py-1.5 text-right tabular-nums ${pfColor}`}>{bin.pf !== null ? bin.pf.toFixed(2) : "-"}</td>
                                  </tr>
                                );
                              })}
                              <tr className="bg-muted/20 font-medium">
                                <td className="px-2 py-1.5">合計</td>
                                <td className="px-2 py-1.5 text-right tabular-nums">{group.count}</td>
                                <td className={`px-2 py-1.5 text-right tabular-nums ${group.winRate !== null && group.winRate >= 55 ? "text-emerald-400" : group.winRate !== null && group.winRate < 45 ? "text-rose-400" : "text-muted-foreground"}`}>{group.winRate ?? "-"}%</td>
                                <td className={`px-2 py-1.5 text-right tabular-nums ${group.avgReturn !== null && group.avgReturn > 0 ? "text-emerald-400" : group.avgReturn !== null && group.avgReturn < 0 ? "text-rose-400" : "text-muted-foreground"}`}>{group.avgReturn !== null ? `${group.avgReturn >= 0 ? "+" : ""}${group.avgReturn.toFixed(2)}%` : "-"}</td>
                                <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">-</td>
                                <td className={`px-2 py-1.5 text-right tabular-nums ${group.total > 0 ? "text-emerald-400" : group.total < 0 ? "text-rose-400" : "text-muted-foreground"}`}>¥{group.total >= 0 ? "+" : ""}{group.total.toLocaleString()}</td>
                                <td className="px-2 py-1.5"></td>
                                <td className={`px-2 py-1.5 text-right tabular-nums ${group.pf !== null && group.pf >= 1.5 ? "text-emerald-400" : group.pf !== null && group.pf < 1 ? "text-rose-400" : "text-muted-foreground"}`}>{group.pf?.toFixed(2) ?? "-"}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground py-4 text-center">データなし</div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
