'use client';

import { useEffect, useState } from 'react';
import { DevNavLinks } from '../../../components/dev';

// Types
interface Stats {
  count: number;
  seidoCount: number;
  ichinichiCount: number;
  p1: number;
  p2: number;
  win1: number;
  win2: number;
}

interface PeriodStats {
  all: Stats;
  ex0: Stats;
}

interface PriceRangeStats {
  label: string;
  count: number;
  shares?: number;
  p1: number;
  p2: number;
  win1: number;
  win2: number;
}

interface SeidoData {
  type: string;
  count: number;
  p1Total: number;
  p2Total: number;
  priceRanges: PriceRangeStats[];
  position: string;
}

interface IchinichiData {
  type: string;
  count: { all: number; ex0: number };
  p1Total: { all: number; ex0: number };
  p2Total: { all: number; ex0: number };
  priceRanges: { all: PriceRangeStats[]; ex0: PriceRangeStats[] };
  position: string;
}

interface WeekdayData {
  weekday: string;
  seido: SeidoData;
  ichinichi: IchinichiData;
  position: string;
}

interface Stock {
  ticker: string;
  stockName: string;
  marginType: string;
  buyPrice: number | null;
  shares: number | null;
  p1: number;
  p2: number;
  win1: boolean;
  win2: boolean;
}

interface DailyDetail {
  date: string;
  count: { all: number; ex0: number };
  p1: { all: number; ex0: number };
  p2: { all: number; ex0: number };
  stocks: Stock[];
  position: string;
}

interface Meta {
  generatedAt: string;
  dateRange: { start: string; end: string };
  totalRecords: number;
  mode: string;
}

interface StrategyData {
  periodStats: {
    daily: PeriodStats;
    weekly: PeriodStats;
    monthly: PeriodStats;
    all: PeriodStats;
  };
  weekdayData: WeekdayData[];
  dailyDetails: DailyDetail[];
  meta: Meta;
}

interface AnalysisResponse {
  short: StrategyData;
  long: StrategyData;
  weekdayStrategy: StrategyData;
}

type StrategyType = 'short' | 'long' | 'weekdayStrategy';
type PeriodType = 'daily' | 'weekly' | 'monthly' | 'all';
type FilterType = 'all' | 'ex0';
type PositionType = 'S' | 'L';

const STRATEGY_LABELS: Record<StrategyType, string> = {
  short: 'ショート',
  long: 'ロング',
  weekdayStrategy: '曜日別戦略',
};

const WEEKDAY_LABELS = ['月', '火', '水', '木', '金'];
const DEFAULT_WEEKDAY_POSITIONS: PositionType[] = ['S', 'S', 'S', 'S', 'L'];

const PERIOD_LABELS: Record<PeriodType, string> = {
  daily: '日別',
  weekly: '週別',
  monthly: '月別',
  all: '全期間',
};

// Color helpers matching frontend: emerald-400, rose-400
const profitClass = (val: number) =>
  val > 0 ? 'text-emerald-400' : val < 0 ? 'text-rose-400' : 'text-foreground';

const winrateClass = (rate: number) =>
  rate > 50 ? 'text-emerald-400' : rate < 50 ? 'text-rose-400' : 'text-foreground';

const formatProfit = (val: number) => {
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val.toLocaleString()}`;
};

// Compare classes for phase1 vs phase2
const getCompareClasses = (p1: number, p2: number): [string, string] => {
  if (p1 >= 0 && p2 >= 0) {
    if (p1 > p2) return ['text-emerald-400', 'text-foreground'];
    if (p2 > p1) return ['text-foreground', 'text-emerald-400'];
    return ['text-foreground', 'text-foreground'];
  } else if (p1 < 0 && p2 < 0) {
    if (Math.abs(p1) > Math.abs(p2)) return ['text-rose-400', 'text-foreground'];
    if (Math.abs(p2) > Math.abs(p1)) return ['text-foreground', 'text-rose-400'];
    return ['text-foreground', 'text-foreground'];
  } else {
    return [
      p1 > 0 ? 'text-emerald-400' : 'text-rose-400',
      p2 > 0 ? 'text-emerald-400' : 'text-rose-400',
    ];
  }
};

function AnalysisContent() {
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<StrategyType>('short');
  const [period, setPeriod] = useState<PeriodType>('all');
  const [topFilter, setTopFilter] = useState<FilterType>('all');
  const [ichinichiFilters, setIchinichiFilters] = useState<Record<number, FilterType>>({});
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [weekdayPositions, setWeekdayPositions] = useState<PositionType[]>([...DEFAULT_WEEKDAY_POSITIONS]);
  const [customLoading, setCustomLoading] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

  useEffect(() => {
    fetch(`${API_BASE}/dev/analysis/day-trade-summary`)
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [API_BASE]);

  // カスタム曜日戦略を取得
  const fetchCustomWeekday = async (positions: PositionType[]) => {
    setCustomLoading(true);
    try {
      const params = new URLSearchParams({
        mon: positions[0],
        tue: positions[1],
        wed: positions[2],
        thu: positions[3],
        fri: positions[4],
      });
      const res = await fetch(`${API_BASE}/dev/analysis/custom-weekday?${params}`);
      const json = await res.json();
      setData(prev => prev ? { ...prev, weekdayStrategy: json } : null);
    } catch (err) {
      console.error('Failed to fetch custom weekday strategy:', err);
    } finally {
      setCustomLoading(false);
    }
  };

  // 曜日ポジションをトグル
  const toggleWeekdayPosition = (idx: number) => {
    const newPositions = [...weekdayPositions];
    newPositions[idx] = newPositions[idx] === 'S' ? 'L' : 'S';
    setWeekdayPositions(newPositions);
    fetchCustomWeekday(newPositions);
  };

  const toggleDay = (date: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

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
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-xl border border-border/40 bg-card/50 p-5 h-28 animate-pulse" />
            ))}
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="mb-4">
              <div className="h-5 w-20 bg-muted/50 rounded mb-3 animate-pulse" />
              <div className="grid grid-cols-2 gap-4">
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

  const currentData = data[strategy];
  const stats = currentData.periodStats[period][topFilter];

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
            <h1 className="text-xl font-bold text-foreground">Grok分析</h1>
            <p className="text-muted-foreground text-sm">
              {currentData.meta.dateRange.start} ~ {currentData.meta.dateRange.end} ({currentData.meta.totalRecords}件)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <DevNavLinks links={["dashboard", "recommendations", "stock-results"]} />
          </div>
        </header>

        {/* Strategy Tabs */}
        <div className="flex gap-2 mb-4">
          {(Object.keys(STRATEGY_LABELS) as StrategyType[]).map(s => (
            <button
              key={s}
              onClick={() => setStrategy(s)}
              className={`px-4 py-1.5 text-xs rounded-md border transition-colors ${
                strategy === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
              }`}
            >
              {STRATEGY_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Weekday Position Toggles (only for weekdayStrategy) */}
        {strategy === 'weekdayStrategy' && (
          <div className="flex items-center gap-1 mb-4">
            <span className="text-muted-foreground text-xs mr-2">曜日設定:</span>
            {WEEKDAY_LABELS.map((label, idx) => (
              <button
                key={idx}
                onClick={() => toggleWeekdayPosition(idx)}
                disabled={customLoading}
                className={`px-2 py-1 text-xs rounded border transition-colors min-w-[48px] ${
                  weekdayPositions[idx] === 'L'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                    : 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                } ${customLoading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 cursor-pointer'}`}
              >
                {label}
                <span className="ml-1 font-semibold">{weekdayPositions[idx]}</span>
              </button>
            ))}
            {customLoading && (
              <span className="ml-2 text-muted-foreground text-xs animate-pulse">更新中...</span>
            )}
          </div>
        )}

        {/* Period Tabs */}
        <div className="flex gap-2 mb-4">
          {(Object.keys(PERIOD_LABELS) as PeriodType[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                period === p
                  ? 'bg-muted/50 border-border/60 text-foreground'
                  : 'bg-transparent border-border/30 text-muted-foreground hover:bg-muted/30'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Top Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {/* 総件数 */}
          <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-5 shadow-lg shadow-black/5 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="flex items-center mb-2">
                <span className="text-muted-foreground text-xs">総件数</span>
                <div className="flex gap-1 ml-auto">
                  <button
                    onClick={() => setTopFilter('all')}
                    className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                      topFilter === 'all'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    全数
                  </button>
                  <button
                    onClick={() => setTopFilter('ex0')}
                    className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                      topFilter === 'ex0'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    除0株
                  </button>
                </div>
              </div>
              <div className="text-2xl font-bold text-right tabular-nums text-foreground">{stats.count}</div>
              <div className="text-muted-foreground text-xs text-right mt-1">
                制度{stats.seidoCount} / いちにち{stats.ichinichiCount}
              </div>
            </div>
          </div>

          {/* 前場引け */}
          <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-5 shadow-lg shadow-black/5 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="flex items-center mb-2">
                <span className="text-muted-foreground text-xs">前場引け</span>
                <div className="flex gap-1 ml-auto">
                  <button
                    onClick={() => setTopFilter('all')}
                    className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                      topFilter === 'all'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    全数
                  </button>
                  <button
                    onClick={() => setTopFilter('ex0')}
                    className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                      topFilter === 'ex0'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    除0株
                  </button>
                </div>
              </div>
              <div className={`text-2xl font-bold text-right tabular-nums whitespace-nowrap ${profitClass(stats.p1)}`}>
                {formatProfit(stats.p1)}円
              </div>
              <div className={`text-xs text-right mt-1 ${winrateClass(stats.win1)}`}>
                勝率 {Math.round(stats.win1)}%
              </div>
            </div>
          </div>

          {/* 大引け */}
          <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-5 shadow-lg shadow-black/5 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="flex items-center mb-2">
                <span className="text-muted-foreground text-xs">大引け</span>
                <div className="flex gap-1 ml-auto">
                  <button
                    onClick={() => setTopFilter('all')}
                    className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                      topFilter === 'all'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    全数
                  </button>
                  <button
                    onClick={() => setTopFilter('ex0')}
                    className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                      topFilter === 'ex0'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    除0株
                  </button>
                </div>
              </div>
              <div className={`text-2xl font-bold text-right tabular-nums whitespace-nowrap ${profitClass(stats.p2)}`}>
                {formatProfit(stats.p2)}円
              </div>
              <div className={`text-xs text-right mt-1 ${winrateClass(stats.win2)}`}>
                勝率 {Math.round(stats.win2)}%
              </div>
            </div>
          </div>
        </div>

        {/* Weekday Cards */}
        {currentData.weekdayData.map((wd, idx) => {
          const ichFilter = getIchinichiFilter(idx);
          const ichPriceRanges = ichFilter === 'ex0' ? wd.ichinichi.priceRanges.ex0 : wd.ichinichi.priceRanges.all;
          const ichCount = ichFilter === 'ex0' ? wd.ichinichi.count.ex0 : wd.ichinichi.count.all;
          const ichP1Total = ichFilter === 'ex0' ? wd.ichinichi.p1Total.ex0 : wd.ichinichi.p1Total.all;
          const ichP2Total = ichFilter === 'ex0' ? wd.ichinichi.p2Total.ex0 : wd.ichinichi.p2Total.all;

          const [seidoP1Class, seidoP2Class] = getCompareClasses(wd.seido.p1Total, wd.seido.p2Total);
          const [ichP1Class, ichP2Class] = getCompareClasses(ichP1Total, ichP2Total);

          return (
            <div key={wd.weekday} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold text-foreground">{wd.weekday}</h2>
                {strategy === 'weekdayStrategy' && (
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    wd.position === 'ロング' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {wd.position}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 制度信用カード */}
                <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-semibold text-sm text-foreground">制度信用</span>
                      <span className="text-muted-foreground text-xs">{wd.seido.count}件</span>
                    </div>
                    <div className="flex justify-end gap-6 mb-3 pb-3 border-b border-border/30">
                      <div className="text-right">
                        <div className="text-muted-foreground text-[11px]">前場</div>
                        <div className={`text-lg font-bold tabular-nums ${seidoP1Class}`}>
                          {formatProfit(wd.seido.p1Total)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-muted-foreground text-[11px]">大引</div>
                        <div className={`text-lg font-bold tabular-nums ${seidoP2Class}`}>
                          {formatProfit(wd.seido.p2Total)}
                        </div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[400px]">
                        <thead>
                          <tr className="text-muted-foreground text-xs border-b border-border/30">
                            <th className="text-right py-2 font-medium whitespace-nowrap">価格帯</th>
                            <th className="text-right py-2 font-medium whitespace-nowrap">件</th>
                            <th className="text-right py-2 font-medium whitespace-nowrap">前場損益</th>
                            <th className="text-right py-2 font-medium whitespace-nowrap">前場勝率</th>
                            <th className="text-right py-2 font-medium whitespace-nowrap">大引損益</th>
                            <th className="text-right py-2 font-medium whitespace-nowrap">大引勝率</th>
                          </tr>
                        </thead>
                        <tbody>
                          {wd.seido.priceRanges.map(pr => {
                            const [prP1Class, prP2Class] = getCompareClasses(pr.p1, pr.p2);
                            return (
                              <tr key={pr.label} className="border-b border-border/20">
                                <td className="text-right py-2 tabular-nums text-foreground whitespace-nowrap">{pr.label}</td>
                                <td className="text-right py-2 tabular-nums text-foreground">{pr.count}</td>
                                <td className={`text-right py-2 tabular-nums whitespace-nowrap ${prP1Class}`}>
                                  {formatProfit(pr.p1)}
                                </td>
                                <td className={`text-right py-2 tabular-nums ${winrateClass(pr.win1)}`}>
                                  {Math.round(pr.win1)}%
                                </td>
                                <td className={`text-right py-2 tabular-nums whitespace-nowrap ${prP2Class}`}>
                                  {formatProfit(pr.p2)}
                                </td>
                                <td className={`text-right py-2 tabular-nums ${winrateClass(pr.win2)}`}>
                                  {Math.round(pr.win2)}%
                                </td>
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
                      <span className="font-semibold text-sm text-foreground">いちにち信用</span>
                      <span className="text-muted-foreground text-xs">{ichCount}件</span>
                      <div className="flex gap-1 ml-auto">
                        <button
                          onClick={() => setIchinichiFilter(idx, 'all')}
                          className={`px-2 py-0.5 text-[11px] rounded border transition-colors ${
                            ichFilter === 'all'
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
                          }`}
                        >
                          全数
                        </button>
                        <button
                          onClick={() => setIchinichiFilter(idx, 'ex0')}
                          className={`px-2 py-0.5 text-[11px] rounded border transition-colors ${
                            ichFilter === 'ex0'
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
                          }`}
                        >
                          除0株
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-end gap-6 mb-3 pb-3 border-b border-border/30">
                      <div className="text-right">
                        <div className="text-muted-foreground text-[11px]">前場</div>
                        <div className={`text-lg font-bold tabular-nums ${ichP1Class}`}>
                          {formatProfit(ichP1Total)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-muted-foreground text-[11px]">大引</div>
                        <div className={`text-lg font-bold tabular-nums ${ichP2Class}`}>
                          {formatProfit(ichP2Total)}
                        </div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[480px]">
                        <thead>
                          <tr className="text-muted-foreground text-xs border-b border-border/30">
                            <th className="text-right py-2 font-medium whitespace-nowrap">価格帯</th>
                            <th className="text-right py-2 font-medium whitespace-nowrap">件</th>
                            <th className="text-right py-2 font-medium whitespace-nowrap">株数</th>
                            <th className="text-right py-2 font-medium whitespace-nowrap">前場損益</th>
                            <th className="text-right py-2 font-medium whitespace-nowrap">前場勝率</th>
                            <th className="text-right py-2 font-medium whitespace-nowrap">大引損益</th>
                            <th className="text-right py-2 font-medium whitespace-nowrap">大引勝率</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ichPriceRanges.map(pr => {
                            const [prP1Class, prP2Class] = getCompareClasses(pr.p1, pr.p2);
                            return (
                              <tr key={pr.label} className="border-b border-border/20">
                                <td className="text-right py-2 tabular-nums text-foreground whitespace-nowrap">{pr.label}</td>
                                <td className="text-right py-2 tabular-nums text-foreground">{pr.count}</td>
                                <td className="text-right py-2 tabular-nums text-muted-foreground whitespace-nowrap">
                                  {pr.shares && pr.shares > 0 ? pr.shares.toLocaleString() : '-'}
                                </td>
                                <td className={`text-right py-2 tabular-nums whitespace-nowrap ${prP1Class}`}>
                                  {formatProfit(pr.p1)}
                                </td>
                                <td className={`text-right py-2 tabular-nums ${winrateClass(pr.win1)}`}>
                                  {Math.round(pr.win1)}%
                                </td>
                                <td className={`text-right py-2 tabular-nums whitespace-nowrap ${prP2Class}`}>
                                  {formatProfit(pr.p2)}
                                </td>
                                <td className={`text-right py-2 tabular-nums ${winrateClass(pr.win2)}`}>
                                  {Math.round(pr.win2)}%
                                </td>
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

        {/* Daily Details */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold mb-4 text-foreground">日別詳細</h2>
          {currentData.dailyDetails.map(day => {
            const isExpanded = expandedDays.has(day.date);
            const dayP1All = day.p1.all;
            const dayP2All = day.p2.all;
            const dayP1Ex0 = day.p1.ex0;
            const dayP2Ex0 = day.p2.ex0;
            const [dayP1Class, dayP2Class] = getCompareClasses(dayP1All, dayP2All);

            return (
              <details
                key={day.date}
                className="mb-2 rounded-lg border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 overflow-hidden"
                open={isExpanded}
                onToggle={(e) => {
                  const target = e.target as HTMLDetailsElement;
                  if (target.open && !isExpanded) toggleDay(day.date);
                  if (!target.open && isExpanded) toggleDay(day.date);
                }}
              >
                <summary className="px-4 py-3 cursor-pointer flex flex-wrap items-center gap-2 sm:gap-4 text-sm hover:bg-muted/10 transition-colors">
                  <span className="font-semibold text-foreground whitespace-nowrap">{day.date}</span>
                  {strategy === 'weekdayStrategy' && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      day.position === 'ロング' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {day.position}
                    </span>
                  )}
                  <span className="text-muted-foreground text-xs">{day.count.all}件</span>
                  <div className="ml-auto tabular-nums text-xs sm:text-sm flex items-center flex-wrap gap-x-2 sm:gap-x-4">
                    <span className="whitespace-nowrap">
                      <span className="text-muted-foreground mr-1">前場</span>
                      <span className={dayP1Class}>{formatProfit(dayP1All)}</span>
                      <span className="text-muted-foreground text-[10px] sm:text-xs ml-1">({formatProfit(dayP1Ex0)})</span>
                    </span>
                    <span className="whitespace-nowrap">
                      <span className="text-muted-foreground mr-1">大引</span>
                      <span className={dayP2Class}>{formatProfit(dayP2All)}</span>
                      <span className="text-muted-foreground text-[10px] sm:text-xs ml-1">({formatProfit(dayP2Ex0)})</span>
                    </span>
                  </div>
                </summary>
                <div className="px-4 pb-3 border-t border-border/30 overflow-x-auto">
                  <table className="w-full text-sm min-w-[500px]">
                    <thead>
                      <tr className="text-muted-foreground text-xs border-b border-border/30">
                        <th className="text-left py-2 font-medium whitespace-nowrap">銘柄</th>
                        <th className="text-left py-2 font-medium whitespace-nowrap">区分</th>
                        <th className="text-right py-2 font-medium whitespace-nowrap">買値</th>
                        <th className="text-right py-2 font-medium whitespace-nowrap">株数</th>
                        <th className="text-right py-2 font-medium whitespace-nowrap">前場損益</th>
                        <th className="text-right py-2 font-medium whitespace-nowrap">大引損益</th>
                      </tr>
                    </thead>
                    <tbody>
                      {day.stocks.map((s, idx) => {
                        const [sP1Class, sP2Class] = getCompareClasses(s.p1, s.p2);
                        return (
                          <tr key={idx} className="border-b border-border/20">
                            <td className="py-2 whitespace-nowrap">
                              <span className="text-foreground">{s.ticker.replace('.T', '')}</span>
                              <span className="text-muted-foreground ml-2 text-xs">{s.stockName}</span>
                            </td>
                            <td className="py-2 text-xs text-foreground whitespace-nowrap">
                              {s.marginType === '制度信用' ? '制度' : 'いちにち'}
                            </td>
                            <td className="py-2 text-right tabular-nums text-foreground whitespace-nowrap">
                              {s.buyPrice?.toLocaleString() ?? '-'}
                            </td>
                            <td className="py-2 text-right tabular-nums text-muted-foreground whitespace-nowrap">
                              {s.shares?.toLocaleString() ?? '-'}
                            </td>
                            <td className={`py-2 text-right tabular-nums whitespace-nowrap ${sP1Class}`}>
                              {formatProfit(s.p1)}
                            </td>
                            <td className={`py-2 text-right tabular-nums whitespace-nowrap ${sP2Class}`}>
                              {formatProfit(s.p2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center text-muted-foreground text-xs mt-6 pb-6">
          Generated: {new Date(currentData.meta.generatedAt).toLocaleString('ja-JP')}
        </div>
      </div>
    </main>
  );
}

export default function AnalysisPage() {
  return <AnalysisContent />;
}
