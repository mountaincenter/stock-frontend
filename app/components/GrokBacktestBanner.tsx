"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface BacktestMeta {
  metric: string;
  value: string;
}

interface TopStock {
  target_date: string;
  ticker: string;
  stock_name: string;
  selection_score: number;
  rank: number;
  categories: string;
  sentiment_score?: number;
  policy_link?: string;
  has_mention?: boolean;
  morning_change_pct?: number;
  daily_change_pct?: number;
}

export function GrokBacktestBanner() {
  const [meta, setMeta] = useState<BacktestMeta[]>([]);
  const [top5Stocks, setTop5Stocks] = useState<TopStock[]>([]);
  const [top10Stocks, setTop10Stocks] = useState<TopStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTop5List, setShowTop5List] = useState(false);
  const [showTop10List, setShowTop10List] = useState(false);

  // バナーを開いた時にTop5リストも自動的に開く
  const handleExpandToggle = () => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    // バナーを開く時はTop5も開く、閉じる時はTop5も閉じる
    if (newExpandedState) {
      setShowTop5List(true);
    } else {
      setShowTop5List(false);
      setShowTop10List(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // バックテストメタ情報を取得
        const metaRes = await fetch("/api/grok_backtest_meta");
        if (metaRes.ok) {
          const metaData: BacktestMeta[] = await metaRes.json();
          setMeta(metaData);
        }

        // Top5銘柄リストを取得
        const top5Res = await fetch("/api/grok_top_stocks?category=top5");
        if (top5Res.ok) {
          const top5Data: TopStock[] = await top5Res.json();
          setTop5Stocks(top5Data);
        }

        // Top10銘柄リストを取得
        const top10Res = await fetch("/api/grok_top_stocks?category=top10");
        if (top10Res.ok) {
          const top10Data: TopStock[] = await top10Res.json();
          setTop10Stocks(top10Data);
        }
      } catch (error) {
        console.error("Error fetching grok backtest data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading || meta.length === 0) {
    return null;
  }

  const getMetric = (key: string): string => {
    const item = meta.find((m) => m.metric === key);
    return item?.value || "N/A";
  };

  const morningWinRate = getMetric("morning_win_rate");
  const morningAvgReturn = getMetric("morning_avg_return");
  const top5MorningWinRate = getMetric("top5_morning_win_rate");
  const top5MorningAvgReturn = getMetric("top5_morning_avg_return");
  const dateRange = getMetric("date_range");
  const totalStocks = getMetric("total_stocks");

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/40 bg-card/40 p-3">
      {/* ヘッダー（折りたたみ可能） */}
      <button
        type="button"
        onClick={handleExpandToggle}
        className="flex w-full items-center justify-between text-left transition-colors hover:text-primary"
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
            🎯 Grok バックテスト結果
          </span>
          <span className="text-[10px] text-muted-foreground/50">
            毎日23時更新 | Top5推奨（前場戦略）
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground/50">
            {dateRange} ({totalStocks}銘柄)
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground/70" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground/70" />
          )}
        </div>
      </button>

      {/* 展開時のコンテンツ */}
      {isExpanded && (
        <div className="flex flex-col gap-3 pt-2">
          {/* 戦略比較 */}
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {/* Top 10戦略 */}
            <div className="rounded-lg border border-border/30 bg-card/60 p-3">
              <div className="mb-2 text-xs font-medium text-muted-foreground/80">
                📊 全銘柄（Top10）
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground/70">前場勝率:</span>
                  <span className="font-semibold text-foreground">{morningWinRate}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground/70">平均リターン:</span>
                  <span className="font-semibold text-foreground">{morningAvgReturn}</span>
                </div>
              </div>
            </div>

            {/* Top 5戦略（推奨） */}
            <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
              <div className="mb-2 flex items-center gap-1 text-xs font-medium text-primary">
                ⭐ Top5戦略（推奨）
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground/70">前場勝率:</span>
                  <span className="font-semibold text-primary">{top5MorningWinRate}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground/70">平均リターン:</span>
                  <span className="font-semibold text-primary">{top5MorningAvgReturn}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 戦略説明 */}
          <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
            <div className="mb-1.5 text-xs font-medium text-muted-foreground/80">
              💡 推奨戦略
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground/70">
              <strong>9:00 寄付で買い → 11:30 前引けで売却</strong>（前場のみ）<br />
              選定スコア上位5銘柄に絞ることで勝率向上
            </p>
          </div>

          {/* スコアリング説明 */}
          <div className="text-[10px] text-muted-foreground/50">
            選定スコア = センチメント×100 + 政策リンク + プレミアム言及
          </div>

          {/* Top5銘柄リスト */}
          {top5Stocks.length > 0 && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <button
                type="button"
                onClick={() => setShowTop5List(!showTop5List)}
                className="flex w-full items-center justify-between text-left transition-colors hover:text-primary"
              >
                <span className="text-xs font-medium text-primary">
                  ⭐ Top5 推奨銘柄 ({top5Stocks.length}銘柄)
                </span>
                {showTop5List ? (
                  <ChevronUp className="h-3 w-3 text-primary" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-primary" />
                )}
              </button>

              {showTop5List && (
                <div className="mt-2 space-y-1">
                  {top5Stocks.map((stock, idx) => (
                    <div
                      key={`${stock.ticker}-${idx}`}
                      className="flex items-center justify-between rounded border border-border/20 bg-card/40 p-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground/70">
                          #{stock.rank}
                        </span>
                        <span className="font-semibold text-foreground">
                          {stock.ticker}
                        </span>
                        <span className="text-muted-foreground/70">
                          {stock.stock_name}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-primary">
                        {stock.selection_score.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Top10銘柄リスト */}
          {top10Stocks.length > 0 && (
            <div className="rounded-lg border border-border/30 bg-card/60 p-3">
              <button
                type="button"
                onClick={() => setShowTop10List(!showTop10List)}
                className="flex w-full items-center justify-between text-left transition-colors hover:text-primary"
              >
                <span className="text-xs font-medium text-muted-foreground/80">
                  📊 Top10 全銘柄 ({top10Stocks.length}銘柄)
                </span>
                {showTop10List ? (
                  <ChevronUp className="h-3 w-3 text-muted-foreground/70" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-muted-foreground/70" />
                )}
              </button>

              {showTop10List && (
                <div className="mt-2 space-y-1">
                  {top10Stocks.map((stock, idx) => (
                    <div
                      key={`${stock.ticker}-${idx}`}
                      className="flex items-center justify-between rounded border border-border/20 bg-card/40 p-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground/70">
                          #{stock.rank}
                        </span>
                        <span className="font-semibold text-foreground">
                          {stock.ticker}
                        </span>
                        <span className="text-muted-foreground/70">
                          {stock.stock_name}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground/70">
                        {stock.selection_score.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
