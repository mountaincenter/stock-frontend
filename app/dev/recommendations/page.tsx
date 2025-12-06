"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { DevNavLinks, FilterButtonGroup } from "@/components/dev";
import MarketSummary from "@/components/MarketSummary";
import type {
  TradingRecommendationResponse,
  Stock,
  ActionType,
} from "@/types/trading-recommendation";
import {
  formatPercent,
  formatScore,
  formatPrice,
} from "@/types/trading-recommendation";

type FilterType = ActionType | "all" | "restricted";

const FILTER_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "buy", label: "買い" },
  { value: "sell", label: "売り" },
  { value: "hold", label: "静観" },
  { value: "restricted", label: "制限" },
];

export default function RecommendationsPage() {
  const [data, setData] = useState<TradingRecommendationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    fetch("/api/trading-recommendations")
      .then((res) => {
        if (!res.ok) throw new Error("データ取得に失敗しました");
        return res.json();
      })
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <main className="relative min-h-screen flex items-center justify-center">
        <div className="fixed inset-0 -z-10 bg-gradient-to-br from-background via-background to-muted/20" />
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-muted-foreground text-sm">読み込み中...</p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="relative min-h-screen flex items-center justify-center">
        <div className="fixed inset-0 -z-10 bg-gradient-to-br from-background via-background to-muted/20" />
        <div className="text-rose-400 text-sm">エラー: {error || "データがありません"}</div>
      </main>
    );
  }

  const filteredStocks =
    filter === "all"
      ? data.stocks
      : filter === "buy"
        ? data.stocks.filter((s) => s.recommendation.action === "buy" && !s.tradingRestriction?.isRestricted)
        : filter === "sell"
          ? data.stocks.filter((s) => s.recommendation.action === "sell" && !s.tradingRestriction?.isRestricted)
          : filter === "hold"
            ? data.stocks.filter((s) => s.recommendation.action === "hold" && !s.tradingRestriction?.isRestricted)
            : data.stocks.filter((s) => s.tradingRestriction?.isRestricted);

  return (
    <main className="relative min-h-screen">
      {/* Premium background */}
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
                Grok推奨銘柄 売買判断
              </h1>
              <p className="text-sm text-muted-foreground">
                過去{data.dataSource.backtestCount}件のバックテスト + テクニカル分析
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              {new Date(data.generatedAt + "+09:00").toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
            </div>
          </div>
        </div>

        {/* Summary Grid */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="text-2xl tabular-nums font-bold text-emerald-400">{data.summary.buy}</div>
              <div className="text-xs text-muted-foreground mt-1 whitespace-nowrap">買い候補</div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="text-2xl tabular-nums font-bold text-rose-400">{data.summary.sell}</div>
              <div className="text-xs text-muted-foreground mt-1 whitespace-nowrap">売り候補</div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="text-2xl tabular-nums font-bold text-amber-400">{data.summary.hold}</div>
              <div className="text-xs text-muted-foreground mt-1 whitespace-nowrap">静観</div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="text-2xl tabular-nums font-bold text-muted-foreground">{data.summary.restricted || 0}</div>
              <div className="text-xs text-muted-foreground mt-1 whitespace-nowrap">取引制限</div>
            </div>
          </div>
        </div>

        {/* Warnings */}
        {data.warnings && data.warnings.length > 0 && (
          <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card/80 to-card/50 px-4 py-3 mb-4 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent pointer-events-none" />
            <ul className="relative text-sm text-amber-400 space-y-1">
              {data.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground">フィルター</span>
          <FilterButtonGroup
            options={FILTER_OPTIONS}
            value={filter}
            onChange={(v) => setFilter(v as FilterType)}
          />
          <span className="text-sm tabular-nums text-muted-foreground ml-auto">
            {filteredStocks.length}件
          </span>
        </div>

        {/* Table */}
        <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 shadow-xl shadow-black/5 backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-muted/30">
                  <th className="px-3 py-2.5 text-left text-muted-foreground font-medium text-xs whitespace-nowrap">銘柄</th>
                  <th className="px-3 py-2.5 text-left text-muted-foreground font-medium text-xs whitespace-nowrap">名称</th>
                  <th className="px-2 py-2.5 text-center text-muted-foreground font-medium text-xs whitespace-nowrap">Rank</th>
                  <th className="px-2 py-2.5 text-right text-muted-foreground font-medium text-xs whitespace-nowrap">終値</th>
                  <th className="px-2 py-2.5 text-right text-muted-foreground font-medium text-xs whitespace-nowrap">変化率</th>
                  <th className="px-2 py-2.5 text-right text-muted-foreground font-medium text-xs whitespace-nowrap">ATR</th>
                  <th className="px-3 py-2.5 text-center text-primary font-medium text-xs whitespace-nowrap">v3判断</th>
                  <th className="px-2 py-2.5 text-center text-muted-foreground font-medium text-xs whitespace-nowrap">v2.0.3</th>
                  <th className="px-2 py-2.5 text-center text-muted-foreground font-medium text-xs whitespace-nowrap">v2.1</th>
                  <th className="px-2 py-2.5 text-center text-muted-foreground font-medium text-xs whitespace-nowrap">制限</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredStocks.map((stock) => (
                  <StockRow key={stock.ticker} stock={stock} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Strategy Info */}
        <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 mt-4 px-4 py-3 shadow-lg shadow-black/5 backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
          <div className="relative">
            <h2 className="text-sm font-medium text-foreground mb-3">
              v3戦略（価格帯ベース判断）
            </h2>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <h3 className="text-emerald-400 font-medium mb-1.5">買いシグナル</h3>
                <ul className="text-muted-foreground space-y-0.5 tabular-nums text-xs">
                  <li>7,500〜10,000円 → 買い5日</li>
                  <li>5,000〜7,500円 → 買い（当日）</li>
                  <li>その他 → 買い（当日）</li>
                </ul>
              </div>
              <div>
                <h3 className="text-amber-400 font-medium mb-1.5">静観シグナル</h3>
                <ul className="text-muted-foreground space-y-0.5 tabular-nums text-xs">
                  <li>1,500〜3,000円 → 買い5日（転換）</li>
                  <li>その他 → 静観</li>
                </ul>
              </div>
              <div>
                <h3 className="text-rose-400 font-medium mb-1.5">売りシグナル</h3>
                <ul className="text-muted-foreground space-y-0.5 tabular-nums text-xs">
                  <li>2,000〜10,000円 → 売り5日</li>
                  <li>その他 → 売り（当日）</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Market Summary */}
        <MarketSummary className="mt-4" />

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-muted-foreground/70">
          投資は自己責任で行ってください。このレポートは投資助言ではありません。
        </div>
      </div>
    </main>
  );
}

function StockRow({ stock }: { stock: Stock }) {
  const [expanded, setExpanded] = useState(false);

  const getV3Badge = (label: string | undefined, action: string | undefined) => {
    if (!label) return <span className="text-muted-foreground">-</span>;
    const color =
      action === "buy"
        ? "bg-emerald-500/20 text-emerald-400"
        : action === "sell"
        ? "bg-rose-500/20 text-rose-400"
        : "bg-amber-500/20 text-amber-400";
    return <span className={`px-2 py-0.5 rounded text-sm font-medium ${color}`}>{label}</span>;
  };

  const getActionText = (action: Stock["recommendation"]["action"]) => {
    switch (action) {
      case "buy":
        return <span className="text-emerald-400">買い</span>;
      case "sell":
        return <span className="text-rose-400">売り</span>;
      case "hold":
        return <span className="text-amber-400">静観</span>;
    }
  };

  const isRestricted = stock.tradingRestriction?.isRestricted === true;

  const hasDeepAnalysis =
    stock.deepAnalysis &&
    (stock.deepAnalysis.latestNews ||
      stock.deepAnalysis.sectorTrend ||
      stock.deepAnalysis.risks ||
      stock.deepAnalysis.opportunities);

  const rowBg = isRestricted
    ? "bg-muted/30"
    : stock.recommendation.action === "buy"
    ? "bg-emerald-500/5"
    : stock.recommendation.action === "sell"
    ? "bg-rose-500/5"
    : "";

  return (
    <>
      <tr
        className={`hover:bg-primary/5 transition-colors ${rowBg} ${
          hasDeepAnalysis ? "cursor-pointer" : ""
        }`}
        onClick={() => hasDeepAnalysis && setExpanded(!expanded)}
      >
        <td className="px-3 py-2 tabular-nums text-foreground whitespace-nowrap">
          <div className="flex items-center gap-1">
            {hasDeepAnalysis &&
              (expanded ? (
                <ChevronUp className="w-3 h-3 text-primary" />
              ) : (
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              ))}
            {stock.ticker}
          </div>
        </td>
        <td className="px-3 py-2 text-muted-foreground">
          <a
            href={`https://finance.yahoo.co.jp/quote/${stock.ticker}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors block max-w-[10em] truncate"
            title={stock.stockName || stock.ticker}
            onClick={(e) => e.stopPropagation()}
          >
            {stock.stockName || stock.ticker}
          </a>
        </td>
        <td className="px-2 py-2 text-center tabular-nums text-muted-foreground">
          {stock.grokRank || "-"}
        </td>
        <td className={`px-2 py-2 text-right tabular-nums ${
          stock.technicalData?.prevDayChangePct
            ? stock.technicalData.prevDayChangePct > 0
              ? "text-emerald-400"
              : stock.technicalData.prevDayChangePct < 0
              ? "text-rose-400"
              : "text-muted-foreground"
            : "text-muted-foreground"
        }`}>
          {stock.technicalData?.prevClose ? formatPrice(stock.technicalData.prevClose) : "-"}
        </td>
        <td className={`px-2 py-2 text-right tabular-nums ${
          stock.technicalData?.prevDayChangePct
            ? stock.technicalData.prevDayChangePct > 0
              ? "text-emerald-400"
              : stock.technicalData.prevDayChangePct < 0
              ? "text-rose-400"
              : "text-muted-foreground"
            : "text-muted-foreground"
        }`}>
          {stock.technicalData?.prevDayChangePct
            ? formatPercent(stock.technicalData.prevDayChangePct)
            : "-"}
        </td>
        <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
          {stock.technicalData?.atr?.value ? formatPercent(stock.technicalData.atr.value, 1) : "-"}
        </td>
        <td className="px-3 py-2 text-center whitespace-nowrap">
          {getV3Badge(stock.recommendation.v3_label, stock.recommendation.v3_action)}
        </td>
        <td className="px-2 py-2 text-center whitespace-nowrap">
          <div className="flex flex-col items-center">
            {stock.recommendation.v2_0_3_action && (
              <span className="text-sm">{getActionText(stock.recommendation.v2_0_3_action)}</span>
            )}
            {stock.recommendation.v2_0_3_score !== undefined && (
              <span
                className={`text-xs tabular-nums ${
                  stock.recommendation.v2_0_3_score >= 0
                    ? "text-emerald-400/70"
                    : "text-rose-400/70"
                }`}
              >
                {formatScore(stock.recommendation.v2_0_3_score)}
              </span>
            )}
          </div>
        </td>
        <td className="px-2 py-2 text-center whitespace-nowrap">
          <div className="flex flex-col items-center">
            <span className="text-sm">{getActionText(stock.recommendation.action)}</span>
            <span
              className={`text-xs tabular-nums ${
                stock.recommendation.score >= 0 ? "text-emerald-400/70" : "text-rose-400/70"
              }`}
            >
              {formatScore(stock.recommendation.score)}
            </span>
          </div>
        </td>
        <td className="px-2 py-2 text-center whitespace-nowrap">
          {isRestricted ? (
            <span
              className="text-xs px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400"
              title={stock.tradingRestriction?.reason ?? undefined}
            >
              停止
            </span>
          ) : (
            <span className="tabular-nums text-emerald-400">○</span>
          )}
        </td>
      </tr>

      {/* Expanded Deep Analysis */}
      {expanded && hasDeepAnalysis && (
        <tr className={rowBg}>
          <td colSpan={10} className="px-4 py-3 bg-muted/20">
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-3">
                {stock.deepAnalysis?.latestNews && stock.deepAnalysis.latestNews.length > 0 && (
                  <div>
                    <h4 className="text-primary font-medium mb-1.5">最新ニュース</h4>
                    <ul className="text-muted-foreground space-y-1">
                      {stock.deepAnalysis.latestNews.map((news, i) => (
                        <li key={i} className="pl-2 border-l-2 border-border/50">
                          {news}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {stock.deepAnalysis?.sectorTrend && (
                  <div>
                    <h4 className="text-primary font-medium mb-1.5">セクター動向</h4>
                    <p className="text-muted-foreground pl-2 border-l-2 border-border/50">
                      {stock.deepAnalysis.sectorTrend}
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                {stock.deepAnalysis?.risks && stock.deepAnalysis.risks.length > 0 && (
                  <div>
                    <h4 className="text-rose-400 font-medium mb-1.5">リスク</h4>
                    <ul className="text-muted-foreground space-y-1">
                      {stock.deepAnalysis.risks.map((risk, i) => (
                        <li key={i} className="pl-2 border-l-2 border-rose-500/30">
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {stock.deepAnalysis?.opportunities && stock.deepAnalysis.opportunities.length > 0 && (
                  <div>
                    <h4 className="text-emerald-400 font-medium mb-1.5">機会</h4>
                    <ul className="text-muted-foreground space-y-1">
                      {stock.deepAnalysis.opportunities.map((opp, i) => (
                        <li key={i} className="pl-2 border-l-2 border-emerald-500/30">
                          {opp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {stock.deepAnalysis?.verdict && (
                  <div>
                    <h4 className="text-foreground font-medium mb-1.5">総合判断</h4>
                    <p className="text-muted-foreground pl-2 border-l-2 border-amber-500/30 italic">
                      {stock.deepAnalysis.verdict}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
