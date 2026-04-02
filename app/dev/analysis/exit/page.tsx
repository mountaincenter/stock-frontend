'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Cell,
} from 'recharts';

// ===== Types =====
interface TimeSegment { key: string; label: string; time: string; }

interface DetailStock {
  date: string;
  ticker: string;
  stockName: string;
  marginType: string;
  priceRange: string;
  prevClose: number | null;
  buyPrice: number | null;
  shares: number | null;
  mlGrade: string | null;
  segments: Record<string, number | null>;
}

interface DetailGroup {
  key: string;
  count: { all: number; ex0: number };
  segments: { all: Record<string, number>; ex0: Record<string, number> };
  stocks: DetailStock[];
}

interface DetailResponse {
  view: string;
  excludeExtreme: boolean;
  timeSegments: TimeSegment[];
  results: DetailGroup[];
}

// ===== Constants =====
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const WEEKDAYS = ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日'] as const;
const WEEKDAY_SHORT = ['月', '火', '水', '木', '金'] as const;
const GRADE_OPTIONS = ['全体', 'G1', 'G2', 'G3', 'G4'] as const;
const PRICE_RANGE_LABELS = ['~1,000円', '1,000~3,000円', '3,000~5,000円', '5,000~10,000円', '10,000円~'];

// P&Lバケット（金額ベース）
const PNL_BUCKETS = [
  { label: '大損 (<-2000)', min: -Infinity, max: -2000, color: 'bg-rose-500/20' },
  { label: '小損 (-2000~0)', min: -2000, max: 0, color: 'bg-rose-400/10' },
  { label: '微益 (0~+500)', min: 0, max: 500, color: 'bg-muted/20' },
  { label: '小益 (+500~+2000)', min: 500, max: 2000, color: 'bg-emerald-400/10' },
  { label: '中益 (+2000~+5000)', min: 2000, max: 5000, color: 'bg-emerald-500/15' },
  { label: '大益 (+5000~)', min: 5000, max: Infinity, color: 'bg-emerald-500/20' },
];

// ===== Helpers =====
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

const formatProfit = (val: number) => `${val >= 0 ? '+' : ''}${val.toLocaleString()}`;

const fmt = (v: number) => {
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(1)}万`;
  return v.toLocaleString();
};

// ===== Component =====
export default function ExitStrategyPage() {
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedGrade, setSelectedGrade] = useState<string>('全体');
  const [excludeExtreme, setExcludeExtreme] = useState(false);

  // Fetch
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = `exclude_extreme=${excludeExtreme}&price_min=0&price_max=999999&price_step=0`;
      const res = await fetch(`${API_BASE}/dev/analysis-custom/details?view=weekday&${params}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      setData(await res.json());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [excludeExtreme]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 銘柄フィルタリング
  const stocks = useMemo(() => {
    if (!data) return [];
    const weekdayGroup = data.results.find(r => r.key === WEEKDAYS[selectedDay]);
    if (!weekdayGroup) return [];
    let filtered = weekdayGroup.stocks;
    if (selectedGrade !== '全体') {
      filtered = filtered.filter(s => s.mlGrade === selectedGrade);
    }
    return filtered;
  }, [data, selectedDay, selectedGrade]);

  const segments = data?.timeSegments || [];

  // チェックポイント（分析対象の時刻）— 未使用だがStep2以降で活用予定

  // ===== 条件付き確率分布テーブル =====
  // 各チェックポイント × P&Lバケット → 残り時間のP&L分布
  const conditionalDistribution = useMemo(() => {
    if (segments.length === 0 || stocks.length === 0) return [];
    const lastKey = segments[segments.length - 1]?.key;
    if (!lastKey) return [];

    return segments.slice(0, -1).map((cpSeg, cpIdx) => {
      const buckets = PNL_BUCKETS.map(bucket => {
        const group = stocks.filter(s => {
          const v = s.segments[cpSeg.key] ?? 0;
          return v >= bucket.min && v < bucket.max;
        });

        if (group.length === 0) return null;

        const cpVals = group.map(s => s.segments[cpSeg.key] ?? 0);
        const finalVals = group.map(s => s.segments[lastKey] ?? 0);
        const deltas = group.map(s => (s.segments[lastKey] ?? 0) - (s.segments[cpSeg.key] ?? 0));

        const avgAtCP = cpVals.reduce((a, b) => a + b, 0) / group.length;
        const avgFinal = finalVals.reduce((a, b) => a + b, 0) / group.length;
        const avgDelta = deltas.reduce((a, b) => a + b, 0) / group.length;
        const stdDelta = Math.sqrt(deltas.reduce((a, d) => a + (d - avgDelta) ** 2, 0) / group.length);

        // マイ転確率: cpでプラスだったのに大引けでマイナスになった割合
        const wasPositive = group.filter(s => (s.segments[cpSeg.key] ?? 0) > 0);
        const turnedNegative = wasPositive.filter(s => (s.segments[lastKey] ?? 0) < 0);
        const reversalRate = wasPositive.length > 0 ? (turnedNegative.length / wasPositive.length) * 100 : 0;

        // 各後続セグメントでの期待値
        const futureSegs = segments.slice(cpIdx + 1).map(futureSeg => {
          const vals = group.map(s => s.segments[futureSeg.key] ?? 0);
          const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
          return { key: futureSeg.key, label: futureSeg.label, avgPnl: Math.round(avg) };
        });

        // 最適イグジット: 期待値が最大のセグメント
        const bestExit = futureSegs.reduce((best, seg) =>
          seg.avgPnl > best.avgPnl ? seg : best, { key: cpSeg.key, label: cpSeg.label, avgPnl: Math.round(avgAtCP) });

        return {
          bucket: bucket.label,
          bucketColor: bucket.color,
          count: group.length,
          avgAtCP: Math.round(avgAtCP),
          avgFinal: Math.round(avgFinal),
          avgDelta: Math.round(avgDelta),
          stdDelta: Math.round(stdDelta),
          reversalRate,
          bestExitLabel: bestExit.label,
          bestExitPnl: bestExit.avgPnl,
          // 持越しのリスクリワード
          upsideExpected: Math.round(deltas.filter(d => d > 0).length > 0
            ? deltas.filter(d => d > 0).reduce((a, b) => a + b, 0) / deltas.filter(d => d > 0).length : 0),
          downsideExpected: Math.round(deltas.filter(d => d < 0).length > 0
            ? deltas.filter(d => d < 0).reduce((a, b) => a + b, 0) / deltas.filter(d => d < 0).length : 0),
          holdWinRate: deltas.length > 0 ? (deltas.filter(d => d > 0).length / deltas.length) * 100 : 0,
          futureSegs,
        };
      }).filter((b): b is NonNullable<typeof b> => b !== null);

      return { checkpoint: cpSeg, cpIdx, buckets };
    }).filter(cp => cp.buckets.length > 0);
  }, [stocks, segments]);

  // ===== 最適イグジットマップ =====
  // 全チェックポイント × 全バケット → 最適イグジット時刻のマトリックス
  const exitMap = useMemo(() => {
    if (segments.length === 0 || stocks.length === 0) return [];
    return segments.slice(0, -1).map((cpSeg, cpIdx) => {
      const row = PNL_BUCKETS.map(bucket => {
        const group = stocks.filter(s => {
          const v = s.segments[cpSeg.key] ?? 0;
          return v >= bucket.min && v < bucket.max;
        });
        if (group.length < 3) return { bucket: bucket.label, count: group.length, bestTime: '-', bestPnl: 0, exitNowPnl: 0, improvement: 0 };

        const cpAvg = group.reduce((a, s) => a + (s.segments[cpSeg.key] ?? 0), 0) / group.length;

        // 各将来セグメント + 現在時点を含めて最適を探す
        let bestTime = cpSeg.label;
        let bestPnl = Math.round(cpAvg);

        segments.slice(cpIdx + 1).forEach(futureSeg => {
          const avg = group.reduce((a, s) => a + (s.segments[futureSeg.key] ?? 0), 0) / group.length;
          if (avg > bestPnl) {
            bestPnl = Math.round(avg);
            bestTime = futureSeg.label;
          }
        });

        return {
          bucket: bucket.label,
          count: group.length,
          bestTime,
          bestPnl,
          exitNowPnl: Math.round(cpAvg),
          improvement: bestPnl - Math.round(cpAvg),
        };
      }).filter(b => b.count >= 3);

      return { time: cpSeg.label, key: cpSeg.key, buckets: row };
    }).filter(r => r.buckets.length > 0);
  }, [stocks, segments]);

  // ===== ピーク→利益還元分析（価格帯別） =====
  const retentionByPriceRange = useMemo(() => {
    if (segments.length === 0 || stocks.length === 0) return [];

    return PRICE_RANGE_LABELS.map(pr => {
      const prStocks = stocks.filter(s => s.priceRange === pr);
      if (prStocks.length < 3) return null;

      const analysis = prStocks.map(s => {
        let peakVal = -Infinity;
        let peakTime = '';
        segments.forEach(seg => {
          const v = s.segments[seg.key] ?? -Infinity;
          if (v > peakVal) { peakVal = v; peakTime = seg.label; }
        });
        const lastKey = segments[segments.length - 1]?.key;
        const finalVal = lastKey ? (s.segments[lastKey] ?? 0) : 0;
        const retention = peakVal > 0 ? (finalVal / peakVal) * 100 : 0;
        return { peakVal, peakTime, finalVal, retention };
      });

      const profitTrades = analysis.filter(a => a.peakVal > 0);
      const avgRetention = profitTrades.length > 0
        ? profitTrades.reduce((a, t) => a + t.retention, 0) / profitTrades.length : 0;
      const avgPeak = profitTrades.length > 0
        ? profitTrades.reduce((a, t) => a + t.peakVal, 0) / profitTrades.length : 0;
      const avgFinal = prStocks.length > 0
        ? prStocks.reduce((a, s) => a + (s.segments[segments[segments.length - 1]?.key] ?? 0), 0) / prStocks.length : 0;
      const avgGivenBack = avgPeak - avgFinal;

      return {
        priceRange: pr,
        count: prStocks.length,
        profitCount: profitTrades.length,
        avgRetention,
        avgPeak: Math.round(avgPeak),
        avgFinal: Math.round(avgFinal),
        avgGivenBack: Math.round(avgGivenBack),
      };
    }).filter((r): r is NonNullable<typeof r> => r !== null);
  }, [stocks, segments]);

  if (loading) return <div className="min-h-screen bg-background p-6 flex items-center justify-center"><div className="text-muted-foreground">読み込み中...</div></div>;
  if (error) return <div className="min-h-screen bg-background p-6 flex items-center justify-center"><div className="text-rose-400">エラー: {error}</div></div>;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 max-w-[1600px] mx-auto">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold">
              Exit Strategy Lab
              <span className="text-sm text-muted-foreground ml-3">{stocks.length}件</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              条件付き確率分布ベースのイグジット最適化。裁量排除のためのルール抽出。
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* 曜日 */}
            {WEEKDAY_SHORT.map((d, i) => (
              <button key={i} onClick={() => setSelectedDay(i)}
                className={`px-3 py-1 text-xs rounded-md border transition-colors ${selectedDay === i ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'}`}
              >{d}</button>
            ))}
            <span className="text-border">|</span>
            {/* グレード */}
            {GRADE_OPTIONS.map(g => (
              <button key={g} onClick={() => setSelectedGrade(g)}
                className={`px-3 py-1 text-xs rounded-md border transition-colors ${selectedGrade === g ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'}`}
              >{g}</button>
            ))}
            <span className="text-border">|</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={excludeExtreme} onChange={(e) => setExcludeExtreme(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-amber-500/50 bg-muted/30 text-amber-500" />
              <span className="text-xs text-amber-400">異常日除外</span>
            </label>
            <span className="text-border">|</span>
            <Link href="/dev/analysis" className="text-xs text-muted-foreground hover:text-foreground">← Analysis</Link>
          </div>
        </div>
      </header>

      {/* ===== Section 1: 最適イグジットマップ ===== */}
      <section className="bg-card border border-border rounded-xl p-4 mb-6">
        <h2 className="font-semibold text-foreground mb-1">最適イグジットマップ</h2>
        <p className="text-xs text-muted-foreground mb-4">
          各時刻のP&L状態から、期待値が最大になるイグジット時刻。n &lt; 3 は非表示。
        </p>

        {exitMap.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-sm border-b border-border/30">
                  <th className="text-left px-2 py-2.5 font-medium whitespace-nowrap">判定時刻</th>
                  <th className="text-left px-2 py-2.5 font-medium whitespace-nowrap">含み益レベル</th>
                  <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">n</th>
                  <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">今利確</th>
                  <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">最適時刻</th>
                  <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">最適P&L</th>
                  <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">改善幅</th>
                </tr>
              </thead>
              <tbody>
                {exitMap.map(row => (
                  row.buckets.map((b, bi) => (
                    <tr key={`${row.key}-${bi}`} className="border-b border-border/20">
                      {bi === 0 && (
                        <td className="text-left px-2 py-2.5 font-semibold text-foreground whitespace-nowrap align-top" rowSpan={row.buckets.length}>
                          {row.time}
                        </td>
                      )}
                      <td className="text-left px-2 py-2.5 tabular-nums text-foreground whitespace-nowrap">{b.bucket}</td>
                      <td className="text-right px-2 py-2.5 tabular-nums text-muted-foreground">{b.count}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums ${b.exitNowPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatProfit(b.exitNowPnl)}</td>
                      <td className="text-right px-2 py-2.5 tabular-nums font-semibold text-cyan-400 whitespace-nowrap">{b.bestTime}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums font-semibold ${b.bestPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatProfit(b.bestPnl)}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums ${b.improvement > 0 ? 'text-emerald-400' : b.improvement < 0 ? 'text-rose-400' : 'text-foreground'}`}>
                        {b.improvement !== 0 ? formatProfit(b.improvement) : '='}
                      </td>
                    </tr>
                  ))
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-muted-foreground text-sm">データなし</div>
        )}
      </section>

      {/* ===== Section 2: 条件付き確率分布 ===== */}
      {conditionalDistribution.map(cp => (
        <section key={cp.checkpoint.key} className="bg-card border border-border rounded-xl p-4 mb-4">
          <h2 className="font-semibold text-foreground mb-1">
            {cp.checkpoint.label} 時点の確率分布
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            この時点のP&L状態別に、大引けまで持った場合の期待値・リスクを推定。
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-sm border-b border-border/30">
                  <th className="text-left px-2 py-2.5 font-medium whitespace-nowrap">P&L状態</th>
                  <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">n</th>
                  <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">時点P&L</th>
                  <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">大引けP&L</th>
                  <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">δ期待値</th>
                  <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">σ</th>
                  <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">マイ転率</th>
                  <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">持越し勝率</th>
                  <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">Upside</th>
                  <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">Downside</th>
                  <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">最適Exit</th>
                  <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">判定</th>
                </tr>
              </thead>
              <tbody>
                {cp.buckets.map(b => {
                  // 判定ロジック
                  let verdict: string;
                  let verdictClass: string;
                  if (b.avgDelta > 200 && b.holdWinRate >= 55) {
                    verdict = '持越し◎'; verdictClass = 'text-emerald-400';
                  } else if (b.avgDelta > 0 && b.holdWinRate >= 50) {
                    verdict = '持越し○'; verdictClass = 'text-emerald-500';
                  } else if (b.reversalRate > 30 && b.avgAtCP > 0) {
                    verdict = '利確◎'; verdictClass = 'text-rose-400';
                  } else if (b.avgDelta < -200) {
                    verdict = '利確◎'; verdictClass = 'text-rose-400';
                  } else {
                    verdict = '微妙'; verdictClass = 'text-amber-400';
                  }

                  return (
                    <tr key={b.bucket} className={`border-b border-border/20 ${b.bucketColor}`}>
                      <td className="text-left px-2 py-2.5 tabular-nums text-foreground whitespace-nowrap">{b.bucket}</td>
                      <td className="text-right px-2 py-2.5 tabular-nums text-muted-foreground">{b.count}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums ${b.avgAtCP >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatProfit(b.avgAtCP)}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums font-semibold ${b.avgFinal >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>{formatProfit(b.avgFinal)}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums font-semibold ${b.avgDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatProfit(b.avgDelta)}</td>
                      <td className="text-right px-2 py-2.5 tabular-nums text-muted-foreground">±{fmt(b.stdDelta)}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums ${b.reversalRate > 30 ? 'text-rose-400 font-semibold' : b.reversalRate > 15 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {b.reversalRate > 0 ? `${b.reversalRate.toFixed(0)}%` : '-'}
                      </td>
                      <td className={`text-right px-2 py-2.5 tabular-nums ${b.holdWinRate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{b.holdWinRate.toFixed(0)}%</td>
                      <td className="text-right px-2 py-2.5 tabular-nums text-emerald-400">{formatProfit(b.upsideExpected)}</td>
                      <td className="text-right px-2 py-2.5 tabular-nums text-rose-400">{formatProfit(b.downsideExpected)}</td>
                      <td className="text-right px-2 py-2.5 tabular-nums font-semibold text-cyan-400 whitespace-nowrap">{b.bestExitLabel}</td>
                      <td className={`text-right px-2 py-2.5 font-semibold ${verdictClass}`}>{verdict}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 将来セグメント別の期待値推移チャート */}
          {cp.buckets.length > 0 && (
            <details className="mt-4">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                P&L推移チャートを表示 ▶
              </summary>
              <div className="mt-2">
                <ResponsiveContainer width="100%" height={250}>
                  <ComposedChart margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" type="category" allowDuplicatedCategory={false} tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} tickFormatter={(v) => formatProfit(Math.round(v))} />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                    <Tooltip
                      contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 13, color: '#fafafa' }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(value: any, name: any) => [`¥${formatProfit(Math.round(value))}`, name]}
                    />
                    {cp.buckets.map((b, i) => {
                      const colors = ['#fb7185', '#f59e0b', '#a1a1aa', '#34d399', '#22d3ee', '#818cf8'];
                      return (
                        <Line
                          key={b.bucket}
                          data={b.futureSegs}
                          dataKey="avgPnl"
                          name={`${b.bucket} (${b.count})`}
                          stroke={colors[i % colors.length]}
                          strokeWidth={2}
                          dot={{ fill: colors[i % colors.length], r: 3 }}
                          type="monotone"
                        />
                      );
                    })}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </details>
          )}
        </section>
      ))}

      {/* ===== Section 3: 価格帯別 利益還元率 ===== */}
      <section className="bg-card border border-border rounded-xl p-4 mb-4">
        <h2 className="font-semibold text-foreground mb-1">価格帯別 利益還元率</h2>
        <p className="text-xs text-muted-foreground mb-4">
          含み益ピークに対して大引けで何%残せているか。低いほど「持ちすぎ」のサイン。
        </p>

        {retentionByPriceRange.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={retentionByPriceRange} margin={{ top: 5, right: 40, bottom: 5, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="priceRange" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                <YAxis yAxisId="val" tick={{ fill: '#a1a1aa', fontSize: 12 }} tickFormatter={(v) => formatProfit(Math.round(v))} />
                <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} tick={{ fill: '#a1a1aa', fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                <ReferenceLine yAxisId="val" y={0} stroke="rgba(255,255,255,0.2)" />
                <Tooltip
                  contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 13, color: '#fafafa' }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any) => {
                    if (name === '還元率') return [`${Number(value).toFixed(1)}%`, name];
                    return [`¥${formatProfit(Math.round(value))}`, name];
                  }}
                />
                <Bar yAxisId="val" dataKey="avgPeak" name="平均ピーク" fill="rgba(251,191,36,0.4)" radius={[3, 3, 0, 0]} />
                <Bar yAxisId="val" dataKey="avgFinal" name="平均大引け" radius={[3, 3, 0, 0]}>
                  {retentionByPriceRange.map((d, i) => (
                    <Cell key={i} fill={d.avgFinal >= 0 ? 'rgba(52,211,153,0.5)' : 'rgba(251,113,133,0.5)'} />
                  ))}
                </Bar>
                <Line yAxisId="pct" type="monotone" dataKey="avgRetention" stroke="#22d3ee" strokeWidth={2.5} dot={{ fill: '#22d3ee', r: 4 }} name="還元率" />
              </ComposedChart>
            </ResponsiveContainer>

            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground text-sm border-b border-border/30">
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">価格帯</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">件数</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">含益件</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">平均ピーク</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">平均大引け</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">吐き出し</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">還元率</th>
                  </tr>
                </thead>
                <tbody>
                  {retentionByPriceRange.map(d => (
                    <tr key={d.priceRange} className="border-b border-border/20">
                      <td className="text-right px-2 py-2.5 tabular-nums text-foreground whitespace-nowrap">{d.priceRange}</td>
                      <td className="text-right px-2 py-2.5 tabular-nums text-foreground">{d.count}</td>
                      <td className="text-right px-2 py-2.5 tabular-nums text-muted-foreground">{d.profitCount}</td>
                      <td className="text-right px-2 py-2.5 tabular-nums text-amber-400">{formatProfit(d.avgPeak)}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums font-semibold ${d.avgFinal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatProfit(d.avgFinal)}</td>
                      <td className="text-right px-2 py-2.5 tabular-nums text-rose-400">{d.avgGivenBack > 0 ? `-${fmt(d.avgGivenBack)}` : '0'}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums font-semibold ${d.avgRetention >= 60 ? 'text-emerald-400' : d.avgRetention >= 30 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {d.avgRetention.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="text-muted-foreground text-sm">データなし</div>
        )}
      </section>
    </div>
  );
}
