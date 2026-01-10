'use client';

import { useEffect, useState } from 'react';
import { DevNavLinks } from '../../../components/dev';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import type { ElectionData, StockCorrelation } from './types';

// Card component
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
    <div className="relative">{children}</div>
  </div>
);

// Value color helper
const valueColor = (v: number) => (v >= 0 ? 'text-emerald-400' : 'text-rose-400');
const valueSign = (v: number) => (v >= 0 ? '+' : '');

export default function ElectionAnomalyPage() {
  const [data, setData] = useState<ElectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/election-data.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: ElectionData) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Loading state
  if (loading) {
    return (
      <main className="relative min-h-screen">
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
        </div>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4 pb-3 border-b border-border/30">
            <div>
              <div className="h-6 w-48 bg-muted/50 rounded mb-2 animate-pulse" />
              <div className="h-4 w-64 bg-muted/50 rounded animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl border border-border/40 bg-card/50 p-4 h-24 animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="rounded-xl border border-border/40 bg-card/50 h-80 animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <main className="relative min-h-screen">
        <div className="fixed inset-0 -z-10 bg-gradient-to-br from-background via-background to-muted/20" />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-rose-400 text-sm">Error: {error || 'No data'}</div>
        </div>
      </main>
    );
  }

  const { n225Summary, n225Results, n225Daily, correlations, pickBalanced, pickHighCorr } = data;

  // Find stock data by ticker
  const findStock = (ticker: string) => correlations.find((s) => s.ticker === ticker);

  // Chart data: normalized daily returns
  const chartData = n225Daily[0]?.data.map((_, dayIndex) => {
    const point: Record<string, number | string> = { day: dayIndex };
    n225Daily.forEach((series) => {
      point[`${series.num}回`] = series.data[dayIndex] ?? 0;
    });
    return point;
  }) || [];

  // High correlation count
  const highCorrCount = correlations.filter((s) => s.correlation >= 0.6).length;

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
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4 pb-3 border-b border-border/30">
          <div>
            <h1 className="text-xl font-bold text-foreground">選挙アノマリー分析</h1>
            <p className="text-muted-foreground text-sm">
              衆院解散〜投票日の N225 騰落率と個別銘柄の相関分析
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <DevNavLinks links={['dashboard', 'recommendations']} />
          </div>
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Card>
            <div className="text-muted-foreground text-xs mb-1">N225 勝率</div>
            <div className="text-2xl tabular-nums font-bold text-emerald-400">
              {n225Summary.wins}/{n225Summary.total}
            </div>
            <div className="text-muted-foreground text-xs">
              ({((n225Summary.wins / n225Summary.total) * 100).toFixed(0)}%)
            </div>
          </Card>
          <Card>
            <div className="text-muted-foreground text-xs mb-1">平均騰落率</div>
            <div className={`text-2xl tabular-nums font-bold ${valueColor(n225Summary.avgReturn)}`}>
              {valueSign(n225Summary.avgReturn)}{n225Summary.avgReturn.toFixed(2)}%
            </div>
            <div className="text-muted-foreground text-xs">
              {valueSign(n225Summary.maxReturn)}{n225Summary.maxReturn.toFixed(1)}% 〜 {n225Summary.minReturn.toFixed(1)}%
            </div>
          </Card>
          <Card>
            <div className="text-muted-foreground text-xs mb-1">分析対象</div>
            <div className="text-2xl tabular-nums font-bold text-foreground">
              {correlations.length}銘柄
            </div>
            <div className="text-muted-foreground text-xs">
              政策銘柄 + Core30
            </div>
          </Card>
          <Card>
            <div className="text-muted-foreground text-xs mb-1">高相関 (≥0.6)</div>
            <div className="text-2xl tabular-nums font-bold text-amber-400">
              {highCorrCount}銘柄
            </div>
            <div className="text-muted-foreground text-xs">
              {((highCorrCount / correlations.length) * 100).toFixed(0)}% の銘柄
            </div>
          </Card>
        </div>

        {/* Pickup Stocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          {/* Balanced */}
          <Card className="p-5">
            <div className="text-muted-foreground text-sm mb-3">バランス型ピックアップ</div>
            <div className="space-y-3">
              {pickBalanced.map((ticker) => {
                const stock = findStock(ticker);
                if (!stock) return null;
                const isExpanded = expandedTicker === ticker;
                return (
                  <div key={ticker} className="border-b border-border/20 pb-3 last:border-0 last:pb-0">
                    <button
                      className="w-full text-left flex items-center justify-between hover:bg-muted/20 rounded px-2 py-1 -mx-2 transition-colors"
                      onClick={() => setExpandedTicker(isExpanded ? null : ticker)}
                    >
                      <div>
                        <span className="text-foreground font-medium">{stock.stockName}</span>
                        <span className="text-muted-foreground text-xs ml-2">{stock.ticker}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`tabular-nums text-sm ${valueColor(stock.avgReturn)}`}>
                          {valueSign(stock.avgReturn)}{stock.avgReturn.toFixed(2)}%
                        </span>
                        <span className="text-muted-foreground text-xs">
                          相関 {stock.correlation.toFixed(2)}
                        </span>
                        <span className="text-muted-foreground text-xs">▾</span>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="mt-2 ml-2 text-xs">
                        <div className="text-muted-foreground mb-1">直近 {stock.latestClose.toLocaleString()}円</div>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-muted-foreground border-b border-border/20">
                              <th className="text-left py-1">回</th>
                              <th className="text-right py-1">解散日</th>
                              <th className="text-right py-1">投票日</th>
                              <th className="text-right py-1">騰落率</th>
                              <th className="text-right py-1">100株損益</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stock.details.map((d) => (
                              <tr key={d.num} className="border-b border-border/10 last:border-0">
                                <td className="py-1">{d.num}回</td>
                                <td className="text-right tabular-nums">{d.startPrice.toLocaleString()}</td>
                                <td className="text-right tabular-nums">{d.endPrice.toLocaleString()}</td>
                                <td className={`text-right tabular-nums ${valueColor(d.returnPct)}`}>
                                  {valueSign(d.returnPct)}{d.returnPct.toFixed(2)}%
                                </td>
                                <td className={`text-right tabular-nums ${valueColor(d.profit100)}`}>
                                  {valueSign(d.profit100)}{d.profit100.toLocaleString()}円
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* High Correlation */}
          <Card className="p-5">
            <div className="text-muted-foreground text-sm mb-3">高相関ピックアップ</div>
            <div className="space-y-3">
              {pickHighCorr.map((ticker) => {
                const stock = findStock(ticker);
                if (!stock) return null;
                const isExpanded = expandedTicker === ticker;
                return (
                  <div key={ticker} className="border-b border-border/20 pb-3 last:border-0 last:pb-0">
                    <button
                      className="w-full text-left flex items-center justify-between hover:bg-muted/20 rounded px-2 py-1 -mx-2 transition-colors"
                      onClick={() => setExpandedTicker(isExpanded ? null : ticker)}
                    >
                      <div>
                        <span className="text-foreground font-medium">{stock.stockName}</span>
                        <span className="text-muted-foreground text-xs ml-2">{stock.ticker}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`tabular-nums text-sm ${valueColor(stock.avgReturn)}`}>
                          {valueSign(stock.avgReturn)}{stock.avgReturn.toFixed(2)}%
                        </span>
                        <span className="text-muted-foreground text-xs">
                          相関 {stock.correlation.toFixed(2)}
                        </span>
                        <span className="text-muted-foreground text-xs">▾</span>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="mt-2 ml-2 text-xs">
                        <div className="text-muted-foreground mb-1">直近 {stock.latestClose.toLocaleString()}円</div>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-muted-foreground border-b border-border/20">
                              <th className="text-left py-1">回</th>
                              <th className="text-right py-1">解散日</th>
                              <th className="text-right py-1">投票日</th>
                              <th className="text-right py-1">騰落率</th>
                              <th className="text-right py-1">100株損益</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stock.details.map((d) => (
                              <tr key={d.num} className="border-b border-border/10 last:border-0">
                                <td className="py-1">{d.num}回</td>
                                <td className="text-right tabular-nums">{d.startPrice.toLocaleString()}</td>
                                <td className="text-right tabular-nums">{d.endPrice.toLocaleString()}</td>
                                <td className={`text-right tabular-nums ${valueColor(d.returnPct)}`}>
                                  {valueSign(d.returnPct)}{d.returnPct.toFixed(2)}%
                                </td>
                                <td className={`text-right tabular-nums ${valueColor(d.profit100)}`}>
                                  {valueSign(d.profit100)}{d.profit100.toLocaleString()}円
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* N225 Daily Chart */}
        <Card className="p-5 mb-6">
          <div className="text-muted-foreground text-sm mb-3">N225 日次累積リターン（解散日=0%）</div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis
                  dataKey="day"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value) => value !== undefined ? [`${Number(value).toFixed(2)}%`] : []}
                />
                <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <Legend
                  wrapperStyle={{ fontSize: '10px' }}
                  formatter={(value) => <span style={{ color: 'hsl(var(--muted-foreground))' }}>{value}</span>}
                />
                {n225Daily.map((series, i) => (
                  <Line
                    key={series.num}
                    type="monotone"
                    dataKey={`${series.num}回`}
                    stroke={series.win ? `hsl(${120 + i * 15}, 70%, 50%)` : `hsl(0, 70%, 50%)`}
                    strokeWidth={1.5}
                    dot={false}
                    opacity={0.7}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Correlation Table */}
        <Card className="p-5 mb-6">
          <div className="text-muted-foreground text-sm mb-3">相関ランキング（上位20銘柄）</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border/30 text-xs">
                  <th className="text-left py-2 font-normal">#</th>
                  <th className="text-left py-2 font-normal">銘柄</th>
                  <th className="text-left py-2 font-normal">カテゴリ</th>
                  <th className="text-right py-2 font-normal">相関係数</th>
                  <th className="text-right py-2 font-normal">平均騰落率</th>
                  <th className="text-right py-2 font-normal">勝率</th>
                  <th className="text-right py-2 font-normal">直近終値</th>
                </tr>
              </thead>
              <tbody>
                {correlations.slice(0, 20).map((stock, i) => (
                  <tr
                    key={stock.ticker}
                    className="border-b border-border/20 hover:bg-muted/10 transition-colors"
                  >
                    <td className="py-2 text-muted-foreground">{i + 1}</td>
                    <td className="py-2">
                      <span className="text-foreground">{stock.stockName}</span>
                      <span className="text-muted-foreground text-xs ml-1">{stock.ticker}</span>
                    </td>
                    <td className="py-2 text-muted-foreground text-xs">{stock.category}</td>
                    <td className="py-2 text-right tabular-nums text-amber-400">
                      {stock.correlation.toFixed(3)}
                    </td>
                    <td className={`py-2 text-right tabular-nums ${valueColor(stock.avgReturn)}`}>
                      {valueSign(stock.avgReturn)}{stock.avgReturn.toFixed(2)}%
                    </td>
                    <td className={`py-2 text-right tabular-nums ${stock.winRate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {stock.winRate.toFixed(0)}%
                    </td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">
                      {stock.latestClose.toLocaleString()}円
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* N225 Election Details */}
        <Card className="p-5">
          <div className="text-muted-foreground text-sm mb-3">N225 選挙別詳細</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border/30 text-xs">
                  <th className="text-left py-2 font-normal">回</th>
                  <th className="text-left py-2 font-normal">解散日</th>
                  <th className="text-left py-2 font-normal">投票日</th>
                  <th className="text-right py-2 font-normal">日数</th>
                  <th className="text-right py-2 font-normal">解散日終値</th>
                  <th className="text-right py-2 font-normal">投票日終値</th>
                  <th className="text-right py-2 font-normal">騰落率</th>
                  <th className="text-left py-2 font-normal">備考</th>
                </tr>
              </thead>
              <tbody>
                {n225Results.map((r) => (
                  <tr
                    key={r.num}
                    className="border-b border-border/20 hover:bg-muted/10 transition-colors"
                  >
                    <td className="py-2 text-muted-foreground">{r.num}</td>
                    <td className="py-2 tabular-nums text-muted-foreground">{r.dissolution}</td>
                    <td className="py-2 tabular-nums text-muted-foreground">{r.election}</td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">{r.days}</td>
                    <td className="py-2 text-right tabular-nums">{r.startPrice.toLocaleString()}</td>
                    <td className="py-2 text-right tabular-nums">{r.endPrice.toLocaleString()}</td>
                    <td className={`py-2 text-right tabular-nums font-medium ${valueColor(r.returnPct)}`}>
                      {valueSign(r.returnPct)}{r.returnPct.toFixed(2)}%
                    </td>
                    <td className="py-2 text-muted-foreground text-xs">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center text-muted-foreground text-xs">
          Generated: {data.generatedAt}
        </div>
      </div>
    </main>
  );
}
