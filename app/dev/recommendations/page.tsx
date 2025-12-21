"use client";

import { useEffect, useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { DevNavLinks, FilterButtonGroup } from "@/components/dev";

type DayTradeStock = {
  ticker: string;
  stock_name: string;
  grok_rank: number | null;
  close: number | null;
  change_pct: number | null;
  atr_pct: number | null;
  market_cap_oku: number | null;
  skip_by_market_cap: boolean;
  shortable: boolean;
  day_trade: boolean;
  ng: boolean;
  day_trade_available_shares: number | null;
};

type Summary = {
  unchecked: number;
  shortable: number;
  day_trade: number;
  ng: number;
  skip_by_market_cap: number;
};

type FilterType = "all" | "unchecked" | "shortable" | "day_trade" | "ng" | "skip_market_cap";

const FILTER_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "unchecked", label: "未チェック" },
  { value: "shortable", label: "制度" },
  { value: "day_trade", label: "いちにち" },
  { value: "ng", label: "NG" },
  { value: "skip_market_cap", label: "見送り" },
];

export default function DayTradeListPage() {
  const [stocks, setStocks] = useState<DayTradeStock[]>([]);
  const [summary, setSummary] = useState<Summary>({ unchecked: 0, shortable: 0, day_trade: 0, ng: 0, skip_by_market_cap: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [editedStocks, setEditedStocks] = useState<Record<string, { shortable: boolean; day_trade: boolean; ng: boolean; day_trade_available_shares: number | null }>>({});
  const [saving, setSaving] = useState(false);

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
        skip_by_market_cap: updated.filter((s) => s.skip_by_market_cap).length,
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
            : filter === "skip_market_cap"
              ? stocks.filter((s) => s.skip_by_market_cap)
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
        <div className="grid grid-cols-5 gap-3 mb-6">
          <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="text-2xl tabular-nums font-bold text-teal-400">{summary.shortable}</div>
              <div className="text-xs text-muted-foreground mt-1 whitespace-nowrap">制度信用</div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="text-2xl tabular-nums font-bold text-orange-400">{summary.day_trade}</div>
              <div className="text-xs text-muted-foreground mt-1 whitespace-nowrap">いちにち</div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="text-2xl tabular-nums font-bold text-rose-400">{summary.ng}</div>
              <div className="text-xs text-muted-foreground mt-1 whitespace-nowrap">NG</div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="text-2xl tabular-nums font-bold text-purple-400">{summary.skip_by_market_cap ?? 0}</div>
              <div className="text-xs text-muted-foreground mt-1 whitespace-nowrap">見送り</div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-amber-500/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="text-2xl tabular-nums font-bold text-amber-400">{summary.unchecked}</div>
              <div className="text-xs text-muted-foreground mt-1 whitespace-nowrap">未チェック</div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground">フィルター</span>
          <FilterButtonGroup
            options={FILTER_OPTIONS}
            value={filter}
            onChange={(v) => setFilter(v as FilterType)}
          />
          <div className="flex items-center gap-3 ml-auto">
            {bulkEditMode ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={saveBulkEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  保存
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={cancelBulkEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-400 text-sm font-medium hover:bg-rose-500/30 transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  キャンセル
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={startBulkEdit}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                一括編集
              </button>
            )}
            <span className="text-sm tabular-nums text-muted-foreground">
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

                  return (
                    <tr key={stock.ticker} className="hover:bg-primary/5 transition-colors">
                      <td className="px-4 py-4 tabular-nums text-muted-foreground whitespace-nowrap">
                        {stock.ticker}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        <button
                          type="button"
                          className="hover:text-primary transition-colors block max-w-[12em] truncate text-left"
                          title={stock.stock_name}
                          onClick={() => window.open(`/${stock.ticker}`, "stock-detail")}
                        >
                          {stock.stock_name}
                        </button>
                      </td>
                      <td className="px-3 py-4 text-center tabular-nums text-muted-foreground">
                        {stock.grok_rank ?? "-"}
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
                      <td className={`px-3 py-4 text-right tabular-nums whitespace-nowrap ${
                        stock.skip_by_market_cap ? "text-purple-400" : "text-muted-foreground"
                      }`}>
                        {stock.market_cap_oku != null ? `${stock.market_cap_oku.toLocaleString()}億` : "-"}
                      </td>
                      {bulkEditMode ? (
                        <>
                          <td className="px-3 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={edited?.shortable ?? stock.shortable}
                              onChange={(e) => updateEditedStock(stock.ticker, "shortable", e.target.checked)}
                              className="w-4 h-4 accent-teal-500"
                            />
                          </td>
                          <td className="px-3 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={edited?.day_trade ?? stock.day_trade}
                              onChange={(e) => updateEditedStock(stock.ticker, "day_trade", e.target.checked)}
                              className="w-4 h-4 accent-orange-500"
                            />
                          </td>
                          <td className="px-3 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={edited?.ng ?? stock.ng}
                              onChange={(e) => updateEditedStock(stock.ticker, "ng", e.target.checked)}
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
