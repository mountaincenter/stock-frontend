"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Pencil, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { DevNavLinks, FilterButtonGroup } from "@/components/dev";

type DayTradeStock = {
  ticker: string;
  stock_name: string;
  grok_rank: number | null;
  close: number | null;
  change_pct: number | null;
  atr_pct: number | null;
  market_cap_oku: number | null;
  shortable: boolean;
  day_trade: boolean;
  ng: boolean;
  day_trade_available_shares: number | null;
  appearance_count: number;
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
  ng: number;
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
  const [summary, setSummary] = useState<Summary>({ unchecked: 0, shortable: 0, day_trade: 0, ng: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [editedStocks, setEditedStocks] = useState<Record<string, { shortable: boolean; day_trade: boolean; ng: boolean; day_trade_available_shares: number | null }>>({});
  const [saving, setSaving] = useState(false);
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<Record<string, HistoryRecord[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/dev/day-trade-list");
      if (!res.ok) throw new Error("データ取得に失敗しました");
      const data = await res.json();
      setStocks(data.stocks);
      setSummary(data.summary);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラー");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
    if (appearanceCount <= 1) return; // 1回以下は展開不可

    if (expandedTicker === ticker) {
      setExpandedTicker(null);
    } else {
      setExpandedTicker(ticker);
      fetchHistory(ticker);
    }
  };

  const startBulkEdit = () => {
    // 現在の状態をコピー
    const initial: Record<string, { shortable: boolean; day_trade: boolean; ng: boolean; day_trade_available_shares: number | null }> = {};
    stocks.forEach((s) => {
      initial[s.ticker] = { shortable: s.shortable, day_trade: s.day_trade, ng: s.ng, day_trade_available_shares: s.day_trade_available_shares };
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

  const saveBulkEdit = async () => {
    setSaving(true);
    try {
      // 変更があった銘柄のみ抽出
      const changes: { ticker: string; stockName: string; shortable: boolean; day_trade: boolean; ng: boolean; day_trade_available_shares: number | null }[] = [];
      stocks.forEach((s) => {
        const edited = editedStocks[s.ticker];
        if (edited && (
          edited.shortable !== s.shortable ||
          edited.day_trade !== s.day_trade ||
          edited.ng !== s.ng ||
          edited.day_trade_available_shares !== s.day_trade_available_shares
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
      setSummary({
        unchecked: updated.filter((s) => !s.shortable && !s.day_trade && !s.ng).length,
        shortable: updated.filter((s) => s.shortable).length,
        day_trade: updated.filter((s) => s.day_trade && !s.shortable).length,
        ng: updated.filter((s) => s.ng).length,
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

  if (loading) {
    return (
      <main className="relative min-h-screen">
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
        </div>
        <div className="max-w-7xl mx-auto px-4 py-4">
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

  const filteredStocks =
    filter === "all"
      ? stocks
      : filter === "unchecked"
        ? stocks.filter((s) => !s.shortable && !s.day_trade && !s.ng)
        : filter === "shortable"
          ? stocks.filter((s) => s.shortable)
          : filter === "day_trade"
            ? stocks.filter((s) => s.day_trade && !s.shortable)
            : stocks.filter((s) => s.ng);

  return (
    <main className="relative min-h-screen">
      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-primary/8 via-primary/3 to-transparent blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-1/3 -left-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-accent/10 via-accent/4 to-transparent blur-3xl animate-pulse-slower" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 leading-[1.8] tracking-[0.02em] font-sans">
        {/* Header */}
        <div className="mb-6">
          <DevNavLinks links={["dashboard"]} className="mb-3" />
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Grok デイトレードリスト
              </h1>
              <p className="text-sm text-muted-foreground">
                空売り対象銘柄の管理（制度信用・いちにち信用）
              </p>
            </div>
          </div>
        </div>

        {/* Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6">
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
              <div className="text-xl sm:text-2xl tabular-nums font-bold text-orange-400">{summary.day_trade}</div>
              <div className="text-xs text-muted-foreground mt-1 whitespace-nowrap">いちにち</div>
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

        {/* Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">フィルター</span>
            <FilterButtonGroup
              options={FILTER_OPTIONS}
              value={filter}
              onChange={(v) => setFilter(v as FilterType)}
            />
          </div>
          <div className="flex items-center gap-2 sm:gap-3 sm:ml-auto">
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
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-muted/30">
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium text-xs whitespace-nowrap">銘柄</th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium text-xs whitespace-nowrap">名称</th>
                  <th className="px-3 py-3 text-center text-muted-foreground font-medium text-xs whitespace-nowrap">Rank</th>
                  <th className="px-3 py-3 text-center text-muted-foreground font-medium text-xs whitespace-nowrap">登場回数</th>
                  <th className="px-3 py-3 text-right text-muted-foreground font-medium text-xs whitespace-nowrap">終値</th>
                  <th className="px-3 py-3 text-right text-muted-foreground font-medium text-xs whitespace-nowrap">変化率</th>
                  <th className="px-3 py-3 text-right text-muted-foreground font-medium text-xs whitespace-nowrap">ATR</th>
                  <th className="px-3 py-3 text-right text-muted-foreground font-medium text-xs whitespace-nowrap">時価総額</th>
                  <th className="px-4 py-3 text-center text-muted-foreground font-medium text-xs whitespace-nowrap">
                    {bulkEditMode ? "制度" : "信用区分"}
                  </th>
                  {bulkEditMode && (
                    <>
                      <th className="px-3 py-3 text-center text-muted-foreground font-medium text-xs whitespace-nowrap">いち</th>
                      <th className="px-3 py-3 text-center text-muted-foreground font-medium text-xs whitespace-nowrap">NG</th>
                      <th className="px-3 py-3 text-center text-muted-foreground font-medium text-xs whitespace-nowrap">株数</th>
                    </>
                  )}
                  {!bulkEditMode && (
                    <th className="px-3 py-3 text-center text-muted-foreground font-medium text-xs whitespace-nowrap">株数</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredStocks.map((stock) => {
                  const status = getStatusLabel(stock);
                  const edited = editedStocks[stock.ticker];
                  const isExpanded = expandedTicker === stock.ticker;
                  const canExpand = !bulkEditMode && stock.appearance_count > 1;
                  const history = historyData[stock.ticker] || [];
                  const isLoadingHistory = loadingHistory === stock.ticker;
                  const colSpan = bulkEditMode ? 12 : 10;

                  return (
                    <React.Fragment key={stock.ticker}>
                      <tr
                        className={`hover:bg-primary/5 transition-colors ${canExpand ? "cursor-pointer" : ""} ${isExpanded ? "bg-primary/5" : ""}`}
                        onClick={() => canExpand && toggleExpand(stock.ticker, stock.appearance_count)}
                      >
                        <td className="px-4 py-4 tabular-nums text-muted-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {canExpand && (
                              isExpanded ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-muted-foreground/50" />
                            )}
                            {stock.ticker}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-muted-foreground">
                          <button
                            type="button"
                            className="hover:text-primary transition-colors block max-w-[12em] truncate text-left"
                            title={stock.stock_name}
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/${stock.ticker}`, "stock-detail");
                            }}
                          >
                            {stock.stock_name}
                          </button>
                        </td>
                        <td className="px-3 py-4 text-center tabular-nums text-muted-foreground">
                          {stock.grok_rank ?? "-"}
                        </td>
                        <td className={`px-3 py-4 text-center tabular-nums ${stock.appearance_count > 1 ? "text-primary font-medium" : "text-muted-foreground"}`}>
                          {stock.appearance_count}
                        </td>
                        <td className={`px-3 py-4 text-right tabular-nums whitespace-nowrap ${
                          stock.change_pct !== null
                            ? stock.change_pct > 0
                              ? "text-emerald-400"
                              : stock.change_pct < 0
                                ? "text-rose-400"
                                : "text-muted-foreground"
                            : "text-muted-foreground"
                        }`}>
                          {formatPrice(stock.close)}
                        </td>
                        <td className={`px-3 py-4 text-right tabular-nums ${
                          stock.change_pct !== null
                            ? stock.change_pct > 0
                              ? "text-emerald-400"
                              : stock.change_pct < 0
                                ? "text-rose-400"
                                : "text-muted-foreground"
                            : "text-muted-foreground"
                        }`}>
                          {formatPercent(stock.change_pct)}
                        </td>
                        <td className="px-3 py-4 text-right tabular-nums text-muted-foreground">
                          {formatPercent(stock.atr_pct, 1)}
                        </td>
                        <td className="px-3 py-4 text-right tabular-nums whitespace-nowrap text-muted-foreground">
                          {stock.market_cap_oku != null ? `${stock.market_cap_oku.toLocaleString()}億` : "-"}
                        </td>
                        {bulkEditMode ? (
                          <>
                            <td className="px-3 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={edited?.shortable ?? stock.shortable}
                                onChange={(e) => updateEditedStock(stock.ticker, "shortable", e.target.checked)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-4 h-4 accent-teal-500"
                              />
                            </td>
                            <td className="px-3 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={edited?.day_trade ?? stock.day_trade}
                                onChange={(e) => updateEditedStock(stock.ticker, "day_trade", e.target.checked)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-4 h-4 accent-orange-500"
                              />
                            </td>
                            <td className="px-3 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={edited?.ng ?? stock.ng}
                                onChange={(e) => updateEditedStock(stock.ticker, "ng", e.target.checked)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-4 h-4 accent-rose-500"
                              />
                            </td>
                            <td className="px-3 py-4 text-center">
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
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-4 text-center whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded text-sm font-medium ${status.color}`}>
                                {status.label}
                              </span>
                            </td>
                            <td className={`px-3 py-4 tabular-nums text-muted-foreground ${
                              stock.day_trade_available_shares != null ? "text-right" : "text-center"
                            }`}>
                              {stock.day_trade_available_shares != null ? stock.day_trade_available_shares.toLocaleString() : "-"}
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
                                      <th className="px-2 py-2 text-left text-muted-foreground font-medium">日付</th>
                                      <th className="px-2 py-2 text-center text-muted-foreground font-medium">曜日</th>
                                      <th className="px-2 py-2 text-right text-muted-foreground font-medium">前終</th>
                                      <th className="px-2 py-2 text-right text-muted-foreground font-medium">始値</th>
                                      <th className="px-2 py-2 text-right text-muted-foreground font-medium">高値</th>
                                      <th className="px-2 py-2 text-right text-muted-foreground font-medium">安値</th>
                                      <th className="px-2 py-2 text-right text-muted-foreground font-medium">終値</th>
                                      <th className="px-2 py-2 text-right text-muted-foreground font-medium">出来高</th>
                                      <th className="px-2 py-2 text-right text-muted-foreground font-medium">前場</th>
                                      <th className="px-2 py-2 text-right text-muted-foreground font-medium">大引</th>
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
                                          <td className="px-2 py-2 tabular-nums text-muted-foreground">{h.date}</td>
                                          <td className="px-2 py-2 text-center text-muted-foreground">{h.weekday}</td>
                                          <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{formatPrice(h.prev_close)}</td>
                                          <td className={`px-2 py-2 text-right tabular-nums ${openColor}`}>{formatPrice(h.open)}</td>
                                          <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{formatPrice(h.high)}</td>
                                          <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{formatPrice(h.low)}</td>
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

        {/* Info */}
        <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 mt-4 px-4 py-3 shadow-lg shadow-black/5 backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
          <div className="relative text-sm text-muted-foreground">
            <p><span className="text-teal-400 font-medium">制度</span>: 制度信用で空売り可能（貸株料あり）</p>
            <p><span className="text-orange-400 font-medium">いちにち</span>: いちにち信用のみ対象（当日決済必須）</p>
            <p><span className="text-rose-400 font-medium">NG</span>: トレード対象外</p>
          </div>
        </div>
      </div>
    </main>
  );
}
