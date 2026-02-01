'use client';

import { useEffect, useState } from 'react';
import { DevNavLinks } from '../../../components/dev';

// Types
interface SegmentStats {
  profit: number;
  winRate: number;
  count: number;
  mean: number;
}

interface TimeSegment {
  key: string;
  label: string;
  time: string;
}

interface PriceRangeData {
  label: string;
  count: number;
  segments: Record<string, SegmentStats>;
}

interface SeidoData {
  type: string;
  count: number;
  segments: Record<string, SegmentStats>;
  priceRanges: PriceRangeData[];
}

interface IchinichiData {
  type: string;
  count: { all: number; ex0: number };
  segments: {
    all: Record<string, SegmentStats>;
    ex0: Record<string, SegmentStats>;
  };
  priceRanges: {
    all: PriceRangeData[];
    ex0: PriceRangeData[];
  };
}

interface WeekdayData {
  weekday: string;
  seido: SeidoData;
  ichinichi: IchinichiData;
}

interface ApiResponse {
  generatedAt: string;
  timeSegments: TimeSegment[];
  priceRanges: string[];
  dateRange: {
    from: string;
    to: string;
    tradingDays: number;
  };
  overall: {
    count: { all: number; ex0: number };
    seidoCount: number;
    ichinichiCount: { all: number; ex0: number };
    segments: {
      all: Record<string, SegmentStats>;
      ex0: Record<string, SegmentStats>;
    };
  };
  weekdays: WeekdayData[];
}

type FilterType = 'all' | 'ex0';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

// Format profit
const formatProfit = (val: number) => {
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val.toLocaleString()}`;
};

// 色分けルール: 最大プラスを緑、最大マイナスを赤、他を白
const getSegmentClasses = (segments: Record<string, SegmentStats>, timeSegments: TimeSegment[]): Record<string, string> => {
  const values = timeSegments.map(seg => ({
    key: seg.key,
    profit: segments[seg.key]?.profit ?? 0,
  }));

  const positives = values.filter(v => v.profit > 0);
  const negatives = values.filter(v => v.profit < 0);

  const WHITE = 'text-foreground';
  const GREEN = 'text-emerald-400';
  const RED = 'text-rose-400';

  const maxPositive = positives.length > 0 ? Math.max(...positives.map(v => v.profit)) : null;
  const minNegative = negatives.length > 0 ? Math.min(...negatives.map(v => v.profit)) : null;

  const result: Record<string, string> = {};
  values.forEach(v => {
    if (v.profit > 0 && v.profit === maxPositive) {
      result[v.key] = GREEN;
    } else if (v.profit < 0 && v.profit === minNegative) {
      result[v.key] = RED;
    } else {
      result[v.key] = WHITE;
    }
  });

  return result;
};

const winrateClass = (rate: number) =>
  rate > 50 ? 'text-emerald-400' : rate < 50 ? 'text-rose-400' : 'text-foreground';

export default function Analysis11SegPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overallFilter, setOverallFilter] = useState<FilterType>('all');
  const [ichinichiFilters, setIchinichiFilters] = useState<Record<number, FilterType>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE}/dev/analysis-11seg/summary`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getIchinichiFilter = (idx: number): FilterType => ichinichiFilters[idx] || 'all';
  const setIchinichiFilter = (idx: number, f: FilterType) => {
    setIchinichiFilters(prev => ({ ...prev, [idx]: f }));
  };

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
          {[...Array(5)].map((_, i) => (
            <div key={i} className="mb-4">
              <div className="h-5 w-20 bg-muted/50 rounded mb-3 animate-pulse" />
              <div className="grid grid-cols-1 gap-4">
                <div className="rounded-xl border border-border/40 bg-card/50 h-48 animate-pulse" />
                <div className="rounded-xl border border-border/40 bg-card/50 h-48 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

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

  const { timeSegments, weekdays, overall, dateRange } = data;

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
            <h1 className="text-xl font-bold text-foreground">11時間区分分析</h1>
            <p className="text-muted-foreground text-sm">
              {dateRange.from} ~ {dateRange.to} ({dateRange.tradingDays}営業日) | ショート基準
            </p>
          </div>
          <DevNavLinks />
        </header>

        {/* Overall Summary Card */}
        {(() => {
          const overallSegs = overallFilter === 'ex0' ? overall.segments.ex0 : overall.segments.all;
          const overallCount = overallFilter === 'ex0' ? overall.count.ex0 : overall.count.all;
          const ichinichiCount = overallFilter === 'ex0' ? overall.ichinichiCount.ex0 : overall.ichinichiCount.all;
          return (
            <div className="mb-6 relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-semibold text-lg text-foreground">全体サマリー</span>
                  <span className="text-muted-foreground text-base">{overallCount}件</span>
                  <span className="text-muted-foreground text-sm">(制度{overall.seidoCount} / いちにち{ichinichiCount})</span>
                  <div className="flex gap-1 ml-auto">
                    <button
                      onClick={() => setOverallFilter('all')}
                      className={`px-2.5 py-1 text-sm rounded border transition-colors ${
                        overallFilter === 'all'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      全数
                    </button>
                    <button
                      onClick={() => setOverallFilter('ex0')}
                      className={`px-2.5 py-1 text-sm rounded border transition-colors ${
                        overallFilter === 'ex0'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      除0株
                    </button>
                  </div>
                </div>
                {/* 合計行 */}
                <div className="overflow-x-auto mb-3 pb-3 border-b border-border/30">
                  <div className="flex justify-end gap-5 min-w-[900px]">
                    {(() => {
                      const classes = getSegmentClasses(overallSegs, timeSegments);
                      return timeSegments.map(seg => {
                        const stats = overallSegs[seg.key];
                        return (
                          <div key={seg.key} className="text-right min-w-[70px]">
                            <div className="text-muted-foreground text-sm">{seg.label}</div>
                            <div className={`text-xl font-bold tabular-nums ${classes[seg.key]}`}>
                              {formatProfit(stats?.profit ?? 0)}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Weekday Cards */}
        {weekdays.map((wd, idx) => {
          const ichFilter = getIchinichiFilter(idx);
          const ichiSegs = ichFilter === 'ex0' ? wd.ichinichi.segments.ex0 : wd.ichinichi.segments.all;
          const ichiPriceRanges = ichFilter === 'ex0' ? wd.ichinichi.priceRanges.ex0 : wd.ichinichi.priceRanges.all;
          const ichiCount = ichFilter === 'ex0' ? wd.ichinichi.count.ex0 : wd.ichinichi.count.all;

          return (
            <div key={wd.weekday} className="mb-6">
              <h2 className="text-sm font-semibold text-foreground mb-3">{wd.weekday}</h2>
              <div className="grid grid-cols-1 gap-4">
                {/* 制度信用カード */}
                <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-semibold text-lg text-foreground">制度信用</span>
                      <span className="text-muted-foreground text-base">{wd.seido.count}件</span>
                    </div>
                    {/* 合計行 */}
                    <div className="overflow-x-auto mb-3 pb-3 border-b border-border/30">
                      <div className="flex justify-end gap-5 min-w-[900px]">
                        {(() => {
                          const classes = getSegmentClasses(wd.seido.segments, timeSegments);
                          return timeSegments.map(seg => {
                            const stats = wd.seido.segments[seg.key];
                            return (
                              <div key={seg.key} className="text-right min-w-[70px]">
                                <div className="text-muted-foreground text-sm">{seg.label}</div>
                                <div className={`text-xl font-bold tabular-nums ${classes[seg.key]}`}>
                                  {formatProfit(stats?.profit ?? 0)}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                    {/* 価格帯テーブル */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[900px]">
                        <thead>
                          <tr className="text-muted-foreground text-sm border-b border-border/30">
                            <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">価格帯</th>
                            <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">件</th>
                            {timeSegments.map(seg => (
                              <th key={seg.key} className="text-right px-2 py-2.5 font-medium whitespace-nowrap">
                                {seg.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {wd.seido.priceRanges.map(pr => {
                            const classes = getSegmentClasses(pr.segments, timeSegments);
                            return (
                              <tr key={pr.label} className="border-b border-border/20">
                                <td className="text-right px-2 py-2.5 tabular-nums text-foreground whitespace-nowrap">{pr.label}</td>
                                <td className="text-right px-2 py-2.5 tabular-nums text-foreground">{pr.count}</td>
                                {timeSegments.map(seg => {
                                  const stats = pr.segments[seg.key];
                                  return (
                                    <td key={seg.key} className="text-right px-2 py-2.5">
                                      <div className={`tabular-nums whitespace-nowrap ${classes[seg.key]}`}>
                                        {formatProfit(stats?.profit ?? 0)}
                                      </div>
                                      <div className={`text-xs ${winrateClass(stats?.winRate ?? 0)}`}>
                                        {Math.round(stats?.winRate ?? 0)}%
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* いちにち信用カード */}
                <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-semibold text-lg text-foreground">いちにち信用</span>
                      <span className="text-muted-foreground text-base">{ichiCount}件</span>
                      <div className="flex gap-1 ml-auto">
                        <button
                          onClick={() => setIchinichiFilter(idx, 'all')}
                          className={`px-2.5 py-1 text-sm rounded border transition-colors ${
                            ichFilter === 'all'
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
                          }`}
                        >
                          全数
                        </button>
                        <button
                          onClick={() => setIchinichiFilter(idx, 'ex0')}
                          className={`px-2.5 py-1 text-sm rounded border transition-colors ${
                            ichFilter === 'ex0'
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
                          }`}
                        >
                          除0株
                        </button>
                      </div>
                    </div>
                    {/* 合計行 */}
                    <div className="overflow-x-auto mb-3 pb-3 border-b border-border/30">
                      <div className="flex justify-end gap-5 min-w-[900px]">
                        {(() => {
                          const classes = getSegmentClasses(ichiSegs, timeSegments);
                          return timeSegments.map(seg => {
                            const stats = ichiSegs[seg.key];
                            return (
                              <div key={seg.key} className="text-right min-w-[70px]">
                                <div className="text-muted-foreground text-sm">{seg.label}</div>
                                <div className={`text-xl font-bold tabular-nums ${classes[seg.key]}`}>
                                  {formatProfit(stats?.profit ?? 0)}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                    {/* 価格帯テーブル */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[900px]">
                        <thead>
                          <tr className="text-muted-foreground text-sm border-b border-border/30">
                            <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">価格帯</th>
                            <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">件</th>
                            {timeSegments.map(seg => (
                              <th key={seg.key} className="text-right px-2 py-2.5 font-medium whitespace-nowrap">
                                {seg.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ichiPriceRanges.map(pr => {
                            const classes = getSegmentClasses(pr.segments, timeSegments);
                            return (
                              <tr key={pr.label} className="border-b border-border/20">
                                <td className="text-right px-2 py-2.5 tabular-nums text-foreground whitespace-nowrap">{pr.label}</td>
                                <td className="text-right px-2 py-2.5 tabular-nums text-foreground">{pr.count}</td>
                                {timeSegments.map(seg => {
                                  const stats = pr.segments[seg.key];
                                  return (
                                    <td key={seg.key} className="text-right px-2 py-2.5">
                                      <div className={`tabular-nums whitespace-nowrap ${classes[seg.key]}`}>
                                        {formatProfit(stats?.profit ?? 0)}
                                      </div>
                                      <div className={`text-xs ${winrateClass(stats?.winRate ?? 0)}`}>
                                        {Math.round(stats?.winRate ?? 0)}%
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Footer */}
        <div className="text-center text-muted-foreground text-xs mt-6 pb-6">
          Generated: {new Date(data.generatedAt).toLocaleString('ja-JP')}
        </div>
      </div>
    </main>
  );
}
