// app/[ticker]/review/SignalTable.tsx
"use client";

import type { Signal } from "./ReviewChart";

interface SignalTableProps {
  signals: Signal[];
}

export default function SignalTable({ signals }: SignalTableProps) {
  if (signals.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        シグナルがありません
      </div>
    );
  }

  // Group signals into pairs (entry + exit)
  const pairs: { entry: Signal | null; exit: Signal | null; pnl: number | null }[] = [];
  let currentEntry: Signal | null = null;

  for (const signal of signals) {
    if (signal.type === "entry") {
      if (currentEntry) {
        // Previous entry without exit
        pairs.push({ entry: currentEntry, exit: null, pnl: null });
      }
      currentEntry = signal;
    } else if (signal.type === "exit" && currentEntry) {
      const pnl = currentEntry.price - signal.price; // Short: entry - exit
      pairs.push({ entry: currentEntry, exit: signal, pnl });
      currentEntry = null;
    }
  }

  // Handle remaining entry without exit
  if (currentEntry) {
    pairs.push({ entry: currentEntry, exit: null, pnl: null });
  }

  const totalPnl = pairs.reduce((sum, p) => sum + (p.pnl ?? 0), 0);
  const wins = pairs.filter((p) => p.pnl !== null && p.pnl > 0).length;
  const losses = pairs.filter((p) => p.pnl !== null && p.pnl < 0).length;
  const completedTrades = pairs.filter((p) => p.pnl !== null).length;
  const winRate = completedTrades > 0 ? (wins / completedTrades) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 text-sm">
        <div className="bg-muted/20 rounded-lg p-3">
          <div className="text-muted-foreground text-xs">トレード数</div>
          <div className="text-lg font-bold">{completedTrades}</div>
        </div>
        <div className="bg-muted/20 rounded-lg p-3">
          <div className="text-muted-foreground text-xs">勝率</div>
          <div className={`text-lg font-bold ${winRate >= 60 ? "text-green-500" : winRate >= 50 ? "text-yellow-500" : "text-red-500"}`}>
            {winRate.toFixed(1)}%
          </div>
        </div>
        <div className="bg-muted/20 rounded-lg p-3">
          <div className="text-muted-foreground text-xs">勝敗</div>
          <div className="text-lg font-bold">
            <span className="text-green-500">{wins}</span>
            <span className="text-muted-foreground mx-1">/</span>
            <span className="text-red-500">{losses}</span>
          </div>
        </div>
        <div className="bg-muted/20 rounded-lg p-3">
          <div className="text-muted-foreground text-xs">合計損益</div>
          <div className={`text-lg font-bold ${totalPnl > 0 ? "text-green-500" : totalPnl < 0 ? "text-red-500" : ""}`}>
            {totalPnl > 0 ? "+" : ""}{totalPnl.toFixed(0)}円
          </div>
        </div>
      </div>

      {/* Signal list */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40">
              <th className="text-left py-2 px-2 text-muted-foreground font-medium">#</th>
              <th className="text-left py-2 px-2 text-muted-foreground font-medium">Entry</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">価格</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">RSI</th>
              <th className="text-left py-2 px-2 text-muted-foreground font-medium">Exit</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">価格</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">RSI</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">損益</th>
            </tr>
          </thead>
          <tbody>
            {pairs.map((pair, i) => {
              const entryTime = pair.entry?.time.split(" ")[1]?.slice(0, 5) ?? "-";
              const exitTime = pair.exit?.time.split(" ")[1]?.slice(0, 5) ?? "-";

              return (
                <tr key={i} className="border-b border-border/20 hover:bg-muted/10">
                  <td className="py-2 px-2 text-muted-foreground">{i + 1}</td>
                  <td className="py-2 px-2 text-red-400">{entryTime}</td>
                  <td className="py-2 px-2 text-right">{pair.entry?.price.toFixed(0) ?? "-"}</td>
                  <td className="py-2 px-2 text-right text-muted-foreground">
                    {pair.entry?.rsi.toFixed(1) ?? "-"}
                  </td>
                  <td className="py-2 px-2 text-cyan-400">{exitTime}</td>
                  <td className="py-2 px-2 text-right">{pair.exit?.price.toFixed(0) ?? "-"}</td>
                  <td className="py-2 px-2 text-right text-muted-foreground">
                    {pair.exit?.rsi.toFixed(1) ?? "-"}
                  </td>
                  <td className={`py-2 px-2 text-right font-medium ${
                    pair.pnl === null ? "text-muted-foreground" :
                    pair.pnl > 0 ? "text-green-500" : pair.pnl < 0 ? "text-red-500" : ""
                  }`}>
                    {pair.pnl !== null ? `${pair.pnl > 0 ? "+" : ""}${pair.pnl.toFixed(0)}` : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-red-400 rounded-full" />
          <span>Entry (RSI&gt;70下落)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-cyan-400 rounded-full" />
          <span>Exit (RSI&lt;30)</span>
        </div>
      </div>
    </div>
  );
}
