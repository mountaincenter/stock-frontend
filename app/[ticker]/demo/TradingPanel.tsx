// app/[ticker]/demo/TradingPanel.tsx
"use client";

import React from "react";

export type TradeMode = "long" | "short";

export type PositionData = {
  entryPrice: number;
  entryTime: string;
  shares: number;
};

export type Positions = {
  long: PositionData | null;
  short: PositionData | null;
};

export type Trade = {
  type: TradeMode;
  entryPrice: number;
  entryTime: string;
  exitPrice: number;
  exitTime: string;
  shares: number;
  pnl: number;
};

interface TradingPanelProps {
  currentPrice: number | null;
  currentTime: string;
  positions: Positions;
  trades: Trade[];
  onEntry: (mode: TradeMode) => void;
  onExit: (mode: TradeMode) => void;
}

export default function TradingPanel({
  currentPrice,
  currentTime,
  positions,
  trades,
  onEntry,
  onExit,
}: TradingPanelProps) {
  // Calculate unrealized P&L for each position
  const longPnl = positions.long && currentPrice
    ? (currentPrice - positions.long.entryPrice) * positions.long.shares
    : 0;
  const shortPnl = positions.short && currentPrice
    ? (positions.short.entryPrice - currentPrice) * positions.short.shares
    : 0;
  const totalUnrealizedPnl = longPnl + shortPnl;

  // Calculate total realized P&L
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);

  return (
    <div className="space-y-3">
      {/* Current price */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-card/50 border border-border/40 backdrop-blur-sm">
        <div>
          <div className="text-xs text-muted-foreground">現在価格 (OHLC平均)</div>
          <div className="text-2xl font-bold font-mono">
            {currentPrice ? `¥${Math.round(currentPrice).toLocaleString()}` : "---"}
          </div>
        </div>
        {(positions.long || positions.short) && (
          <div className="text-right">
            <div className="text-xs text-muted-foreground">含み損益合計</div>
            <div className={`text-lg font-bold font-mono ${
              totalUnrealizedPnl >= 0 ? "text-green-500" : "text-red-500"
            }`}>
              {totalUnrealizedPnl >= 0 ? "+" : ""}¥{Math.round(totalUnrealizedPnl).toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Long & Short buttons side by side */}
      <div className="grid grid-cols-2 gap-3">
        {/* Long section */}
        <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/20">
          <div className="text-xs text-green-400 font-medium mb-2">現物買</div>
          {!positions.long ? (
            <button
              onClick={() => onEntry("long")}
              disabled={!currentPrice}
              className="w-full px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              買い (100株)
            </button>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                {positions.long.shares}株 @ ¥{Math.round(positions.long.entryPrice).toLocaleString()}
              </div>
              <div className={`text-sm font-bold font-mono ${longPnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                {longPnl >= 0 ? "+" : ""}¥{Math.round(longPnl).toLocaleString()}
              </div>
              <button
                onClick={() => onExit("long")}
                disabled={!currentPrice}
                className="w-full px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
              >
                売り決済
              </button>
            </div>
          )}
        </div>

        {/* Short section */}
        <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20">
          <div className="text-xs text-red-400 font-medium mb-2">信用売</div>
          {!positions.short ? (
            <button
              onClick={() => onEntry("short")}
              disabled={!currentPrice}
              className="w-full px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              売り (100株)
            </button>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                {positions.short.shares}株 @ ¥{Math.round(positions.short.entryPrice).toLocaleString()}
              </div>
              <div className={`text-sm font-bold font-mono ${shortPnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                {shortPnl >= 0 ? "+" : ""}¥{Math.round(shortPnl).toLocaleString()}
              </div>
              <button
                onClick={() => onExit("short")}
                disabled={!currentPrice}
                className="w-full px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
              >
                買い決済
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Trade history & Total P&L */}
      {trades.length > 0 && (
        <div className="p-4 rounded-xl bg-card/50 border border-border/40">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium">取引履歴</div>
            <div className={`text-lg font-bold font-mono ${
              totalPnl >= 0 ? "text-green-500" : "text-red-500"
            }`}>
              合計: {totalPnl >= 0 ? "+" : ""}¥{Math.round(totalPnl).toLocaleString()}
            </div>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {trades.map((trade, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border/20 last:border-0">
                <div className="text-muted-foreground">
                  <span className={`px-1 py-0.5 rounded text-[10px] font-medium ${
                    trade.type === "long" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                  }`}>
                    {trade.type === "long" ? "買→売" : "売→買"}
                  </span>
                  <span className="ml-2">
                    ¥{Math.round(trade.entryPrice).toLocaleString()}
                    <span className="mx-1">→</span>
                    ¥{Math.round(trade.exitPrice).toLocaleString()}
                  </span>
                </div>
                <div className={`font-mono font-medium ${
                  trade.pnl >= 0 ? "text-green-500" : "text-red-500"
                }`}>
                  {trade.pnl >= 0 ? "+" : ""}¥{Math.round(trade.pnl).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
