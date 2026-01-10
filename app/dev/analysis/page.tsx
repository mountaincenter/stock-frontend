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
  // 4区分用
  me?: number;
  ae?: number;
  winMe?: number;
  winAe?: number;
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
  // 4区分用
  me?: number;
  ae?: number;
  winMe?: number;
  winAe?: number;
}

interface SeidoData {
  type: string;
  count: number;
  p1Total: number;
  p2Total: number;
  priceRanges: PriceRangeStats[];
  position: string;
  // 4区分用
  meTotal?: number;
  aeTotal?: number;
}

interface IchinichiData {
  type: string;
  count: { all: number; ex0: number };
  p1Total: { all: number; ex0: number };
  p2Total: { all: number; ex0: number };
  priceRanges: { all: PriceRangeStats[]; ex0: PriceRangeStats[] };
  position: string;
  // 4区分用
  meTotal?: { all: number; ex0: number };
  aeTotal?: { all: number; ex0: number };
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
  // 4区分用
  me?: number;
  ae?: number;
  winMe?: boolean;
  winAe?: boolean;
}

interface DailyDetail {
  date: string;
  count: { all: number; ex0: number };
  p1: { all: number; ex0: number };
  p2: { all: number; ex0: number };
  stocks: Stock[];
  position: string;
  // 4区分用
  me?: { all: number; ex0: number };
  ae?: { all: number; ex0: number };
}

interface Meta {
  generatedAt: string;
  dateRange: { start: string; end: string };
  totalRecords: number;
  mode: string;
  segments?: number;
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

type DetailViewType = 'daily' | 'weekly' | 'monthly' | 'weekday';
const DETAIL_VIEW_LABELS: Record<DetailViewType, string> = {
  daily: '日別',
  weekly: '週別',
  monthly: '月別',
  weekday: '曜日別',
};

interface DetailStock {
  date: string;
  ticker: string;
  stockName: string;
  marginType: string;
  prevClose: number | null;
  buyPrice: number | null;
  sellPrice: number | null;
  dailyClose: number | null;
  shares: number | null;
  p1: number;
  p2: number;
  win1: boolean;
  win2: boolean;
  position: string;
  // 4区分用
  me?: number;
  ae?: number;
  winMe?: boolean;
  winAe?: boolean;
}

interface DetailGroup {
  key: string;
  count: { all: number; ex0: number };
  p1: { all: number; ex0: number };
  p2: { all: number; ex0: number };
  stocks: DetailStock[];
  // 4区分用
  me?: { all: number; ex0: number };
  ae?: { all: number; ex0: number };
}

interface DetailResponse {
  view: string;
  mode: string;
  results: DetailGroup[];
}

// Color helpers matching frontend: emerald-400, rose-400
const profitClass = (val: number) =>
  val > 0 ? 'text-emerald-400' : val < 0 ? 'text-rose-400' : 'text-foreground';

const winrateClass = (rate: number) =>
  rate > 50 ? 'text-emerald-400' : rate < 50 ? 'text-rose-400' : 'text-foreground';

const formatProfit = (val: number) => {
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val.toLocaleString()}`;
};

// 4区分の色分けルール
// 1. 全部プラス: 最大値を緑、他を白
// 2. 全部マイナス: 最小値（絶対値最大）を赤、他を白
// 3. プラス3,マイナス1: プラス最大値を緑、マイナスを赤、他を白
// 4. プラス2,マイナス2: プラス最大値を緑、マイナス最小値を赤、他を白
// 5. プラス1,マイナス3: プラスを緑、マイナス最小値を赤、他を白
const getQuadrantClasses = (me: number, p1: number, ae: number, p2: number): [string, string, string, string] => {
  const values = [me, p1, ae, p2];
  const positives = values.filter(v => v > 0);
  const negatives = values.filter(v => v < 0);

  const WHITE = 'text-foreground';
  const GREEN = 'text-emerald-400';
  const RED = 'text-rose-400';

  // 全部プラス
  if (positives.length === 4) {
    const maxVal = Math.max(...values);
    return values.map(v => v === maxVal ? GREEN : WHITE) as [string, string, string, string];
  }

  // 全部マイナス
  if (negatives.length === 4) {
    const minVal = Math.min(...values); // 最もマイナスが大きい
    return values.map(v => v === minVal ? RED : WHITE) as [string, string, string, string];
  }

  // 全部ゼロ
  if (positives.length === 0 && negatives.length === 0) {
    return [WHITE, WHITE, WHITE, WHITE];
  }

  // 混在: プラス最大値を緑、マイナス最小値を赤、他を白
  const maxPositive = positives.length > 0 ? Math.max(...positives) : null;
  const minNegative = negatives.length > 0 ? Math.min(...negatives) : null;

  return values.map(v => {
    if (v > 0 && v === maxPositive) return GREEN;
    if (v < 0 && v === minNegative) return RED;
    return WHITE;
  }) as [string, string, string, string];
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
  const [detailView, setDetailView] = useState<DetailViewType>('daily');
  const [detailData, setDetailData] = useState<DetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailFilter, setDetailFilter] = useState<FilterType>('all');

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

  useEffect(() => {
    fetch(`${API_BASE}/dev/analysis/day-trade-summary?segments=4`)
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

  // 詳細データ取得
  const fetchDetailData = async (view: DetailViewType) => {
    setDetailLoading(true);
    setExpandedDays(new Set()); // リセット
    try {
      const modeParam = strategy === 'weekdayStrategy' ? 'weekday_strategy' : strategy;
      const params = new URLSearchParams({ view, mode: modeParam, segments: '4' });
      if (strategy === 'weekdayStrategy') {
        params.set('mon', weekdayPositions[0]);
        params.set('tue', weekdayPositions[1]);
        params.set('wed', weekdayPositions[2]);
        params.set('thu', weekdayPositions[3]);
        params.set('fri', weekdayPositions[4]);
      }
      const res = await fetch(`${API_BASE}/dev/analysis/details?${params}`);
      if (!res.ok) {
        console.error('API error:', res.status);
        setDetailData(null);
        return;
      }
      const json = await res.json();
      setDetailData(json);
    } catch (err) {
      console.error('Failed to fetch detail data:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // 初回および戦略/view変更時に詳細データ取得
  useEffect(() => {
    if (!loading && data) {
      fetchDetailData(detailView);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, strategy, detailView, weekdayPositions]);

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
        segments: '4',
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

        {/* Top Cards - 5カード (総件数 + 4区分) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {/* 総件数 */}
          <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-5 shadow-lg shadow-black/5 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="flex items-center mb-2">
                <span className="text-muted-foreground text-sm">総件数</span>
                <div className="flex gap-1 ml-auto">
                  <button
                    onClick={() => setTopFilter('all')}
                    className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                      topFilter === 'all'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    全
                  </button>
                  <button
                    onClick={() => setTopFilter('ex0')}
                    className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                      topFilter === 'ex0'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    除0
                  </button>
                </div>
              </div>
              <div className="text-2xl font-bold text-right tabular-nums text-foreground">{stats.count}</div>
              <div className="text-muted-foreground text-xs text-right mt-1">
                制度{stats.seidoCount} / いちにち{stats.ichinichiCount}
              </div>
            </div>
          </div>

          {(() => {
            const [meClass, p1Class, aeClass, p2Class] = getQuadrantClasses(stats.me ?? 0, stats.p1, stats.ae ?? 0, stats.p2);
            return (
              <>
                {/* 10:25 */}
                <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-5 shadow-lg shadow-black/5 backdrop-blur-xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
                  <div className="relative">
                    <div className="flex items-center mb-2">
                      <span className="text-muted-foreground text-sm">10:25</span>
                    </div>
                    <div className={`text-2xl font-bold text-right tabular-nums whitespace-nowrap ${meClass}`}>
                      {formatProfit(stats.me ?? 0)}円
                    </div>
                    <div className={`text-xs text-right mt-1 ${winrateClass(stats.winMe ?? 0)}`}>
                      勝率 {Math.round(stats.winMe ?? 0)}%
                    </div>
                  </div>
                </div>

                {/* 前場引け */}
                <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-5 shadow-lg shadow-black/5 backdrop-blur-xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
                  <div className="relative">
                    <div className="flex items-center mb-2">
                      <span className="text-muted-foreground text-sm">前場引け</span>
                    </div>
                    <div className={`text-2xl font-bold text-right tabular-nums whitespace-nowrap ${p1Class}`}>
                      {formatProfit(stats.p1)}円
                    </div>
                    <div className={`text-xs text-right mt-1 ${winrateClass(stats.win1)}`}>
                      勝率 {Math.round(stats.win1)}%
                    </div>
                  </div>
                </div>

                {/* 14:45 */}
                <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-5 shadow-lg shadow-black/5 backdrop-blur-xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
                  <div className="relative">
                    <div className="flex items-center mb-2">
                      <span className="text-muted-foreground text-sm">14:45</span>
                    </div>
                    <div className={`text-2xl font-bold text-right tabular-nums whitespace-nowrap ${aeClass}`}>
                      {formatProfit(stats.ae ?? 0)}円
                    </div>
                    <div className={`text-xs text-right mt-1 ${winrateClass(stats.winAe ?? 0)}`}>
                      勝率 {Math.round(stats.winAe ?? 0)}%
                    </div>
                  </div>
                </div>

                {/* 大引け(15:30) */}
                <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-5 shadow-lg shadow-black/5 backdrop-blur-xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
                  <div className="relative">
                    <div className="flex items-center mb-2">
                      <span className="text-muted-foreground text-sm">大引け(15:30)</span>
                    </div>
                    <div className={`text-2xl font-bold text-right tabular-nums whitespace-nowrap ${p2Class}`}>
                      {formatProfit(stats.p2)}円
                    </div>
                    <div className={`text-xs text-right mt-1 ${winrateClass(stats.win2)}`}>
                      勝率 {Math.round(stats.win2)}%
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>

        {/* Weekday Cards - 4区分対応・縦並び */}
        {currentData.weekdayData.map((wd, idx) => {
          const ichFilter = getIchinichiFilter(idx);
          const ichPriceRanges = ichFilter === 'ex0' ? wd.ichinichi.priceRanges.ex0 : wd.ichinichi.priceRanges.all;
          const ichCount = ichFilter === 'ex0' ? wd.ichinichi.count.ex0 : wd.ichinichi.count.all;
          const ichMeTotal = ichFilter === 'ex0' ? (wd.ichinichi.meTotal?.ex0 ?? 0) : (wd.ichinichi.meTotal?.all ?? 0);
          const ichP1Total = ichFilter === 'ex0' ? wd.ichinichi.p1Total.ex0 : wd.ichinichi.p1Total.all;
          const ichAeTotal = ichFilter === 'ex0' ? (wd.ichinichi.aeTotal?.ex0 ?? 0) : (wd.ichinichi.aeTotal?.all ?? 0);
          const ichP2Total = ichFilter === 'ex0' ? wd.ichinichi.p2Total.ex0 : wd.ichinichi.p2Total.all;

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
              <div className="grid grid-cols-1 gap-4">
                {/* 制度信用カード */}
                <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-semibold text-lg text-foreground">制度信用</span>
                      <span className="text-muted-foreground text-base">{wd.seido.count}件</span>
                    </div>
                    {(() => {
                      const [seidoMeClass, seidoP1Class, seidoAeClass, seidoP2Class] = getQuadrantClasses(wd.seido.meTotal ?? 0, wd.seido.p1Total, wd.seido.aeTotal ?? 0, wd.seido.p2Total);
                      return (
                        <div className="flex justify-end gap-5 mb-3 pb-3 border-b border-border/30">
                          <div className="text-right">
                            <div className="text-muted-foreground text-sm">10:25</div>
                            <div className={`text-xl font-bold tabular-nums ${seidoMeClass}`}>
                              {formatProfit(wd.seido.meTotal ?? 0)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-muted-foreground text-sm">前場引け</div>
                            <div className={`text-xl font-bold tabular-nums ${seidoP1Class}`}>
                              {formatProfit(wd.seido.p1Total)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-muted-foreground text-sm">14:45</div>
                            <div className={`text-xl font-bold tabular-nums ${seidoAeClass}`}>
                              {formatProfit(wd.seido.aeTotal ?? 0)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-muted-foreground text-sm">大引け(15:30)</div>
                            <div className={`text-xl font-bold tabular-nums ${seidoP2Class}`}>
                              {formatProfit(wd.seido.p2Total)}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-muted-foreground text-sm border-b border-border/30">
                            <th className="text-right py-2.5 font-medium whitespace-nowrap">価格帯</th>
                            <th className="text-right py-2.5 font-medium whitespace-nowrap">件</th>
                            <th className="text-right py-2.5 font-medium whitespace-nowrap">10:25</th>
                            <th className="text-right py-2.5 font-medium whitespace-nowrap">%</th>
                            <th className="text-right py-2.5 font-medium whitespace-nowrap">前場引</th>
                            <th className="text-right py-2.5 font-medium whitespace-nowrap">%</th>
                            <th className="text-right py-2.5 font-medium whitespace-nowrap">14:45</th>
                            <th className="text-right py-2.5 font-medium whitespace-nowrap">%</th>
                            <th className="text-right py-2.5 font-medium whitespace-nowrap">大引</th>
                            <th className="text-right py-2.5 font-medium whitespace-nowrap">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {wd.seido.priceRanges.map(pr => {
                            const [prMeClass, prP1Class, prAeClass, prP2Class] = getQuadrantClasses(pr.me ?? 0, pr.p1, pr.ae ?? 0, pr.p2);
                            return (
                            <tr key={pr.label} className="border-b border-border/20">
                              <td className="text-right py-2.5 tabular-nums text-foreground whitespace-nowrap">{pr.label}</td>
                              <td className="text-right py-2.5 tabular-nums text-foreground">{pr.count}</td>
                              <td className={`text-right py-2.5 tabular-nums whitespace-nowrap ${prMeClass}`}>
                                {formatProfit(pr.me ?? 0)}
                              </td>
                              <td className={`text-right py-2.5 tabular-nums ${winrateClass(pr.winMe ?? 0)}`}>
                                {Math.round(pr.winMe ?? 0)}%
                              </td>
                              <td className={`text-right py-2.5 tabular-nums whitespace-nowrap ${prP1Class}`}>
                                {formatProfit(pr.p1)}
                              </td>
                              <td className={`text-right py-2.5 tabular-nums ${winrateClass(pr.win1)}`}>
                                {Math.round(pr.win1)}%
                              </td>
                              <td className={`text-right py-2.5 tabular-nums whitespace-nowrap ${prAeClass}`}>
                                {formatProfit(pr.ae ?? 0)}
                              </td>
                              <td className={`text-right py-2.5 tabular-nums ${winrateClass(pr.winAe ?? 0)}`}>
                                {Math.round(pr.winAe ?? 0)}%
                              </td>
                              <td className={`text-right py-2.5 tabular-nums whitespace-nowrap ${prP2Class}`}>
                                {formatProfit(pr.p2)}
                              </td>
                              <td className={`text-right py-2.5 tabular-nums ${winrateClass(pr.win2)}`}>
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
                      <span className="font-semibold text-lg text-foreground">いちにち信用</span>
                      <span className="text-muted-foreground text-base">{ichCount}件</span>
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
                    {(() => {
                      const [ichMeClass, ichP1Class, ichAeClass, ichP2Class] = getQuadrantClasses(ichMeTotal, ichP1Total, ichAeTotal, ichP2Total);
                      return (
                        <div className="flex justify-end gap-5 mb-3 pb-3 border-b border-border/30">
                          <div className="text-right">
                            <div className="text-muted-foreground text-sm">10:25</div>
                            <div className={`text-xl font-bold tabular-nums ${ichMeClass}`}>
                              {formatProfit(ichMeTotal)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-muted-foreground text-sm">前場引け</div>
                            <div className={`text-xl font-bold tabular-nums ${ichP1Class}`}>
                              {formatProfit(ichP1Total)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-muted-foreground text-sm">14:45</div>
                            <div className={`text-xl font-bold tabular-nums ${ichAeClass}`}>
                              {formatProfit(ichAeTotal)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-muted-foreground text-sm">大引け(15:30)</div>
                            <div className={`text-xl font-bold tabular-nums ${ichP2Class}`}>
                              {formatProfit(ichP2Total)}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-muted-foreground text-sm border-b border-border/30">
                            <th className="text-right py-2.5 font-medium whitespace-nowrap">価格帯</th>
                            <th className="text-right py-2.5 font-medium whitespace-nowrap">件</th>
                            <th className="text-right py-2.5 font-medium whitespace-nowrap">10:25</th>
                            <th className="text-right py-2.5 font-medium whitespace-nowrap">%</th>
                            <th className="text-right py-2.5 font-medium whitespace-nowrap">前場引</th>
                            <th className="text-right py-2.5 font-medium whitespace-nowrap">%</th>
                            <th className="text-right py-2.5 font-medium whitespace-nowrap">14:45</th>
                            <th className="text-right py-2.5 font-medium whitespace-nowrap">%</th>
                            <th className="text-right py-2.5 font-medium whitespace-nowrap">大引</th>
                            <th className="text-right py-2.5 font-medium whitespace-nowrap">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ichPriceRanges.map(pr => {
                            const [prMeClass, prP1Class, prAeClass, prP2Class] = getQuadrantClasses(pr.me ?? 0, pr.p1, pr.ae ?? 0, pr.p2);
                            return (
                            <tr key={pr.label} className="border-b border-border/20">
                              <td className="text-right py-2.5 tabular-nums text-foreground whitespace-nowrap">{pr.label}</td>
                              <td className="text-right py-2.5 tabular-nums text-foreground">{pr.count}</td>
                              <td className={`text-right py-2.5 tabular-nums whitespace-nowrap ${prMeClass}`}>
                                {formatProfit(pr.me ?? 0)}
                              </td>
                              <td className={`text-right py-2.5 tabular-nums ${winrateClass(pr.winMe ?? 0)}`}>
                                {Math.round(pr.winMe ?? 0)}%
                              </td>
                              <td className={`text-right py-2.5 tabular-nums whitespace-nowrap ${prP1Class}`}>
                                {formatProfit(pr.p1)}
                              </td>
                              <td className={`text-right py-2.5 tabular-nums ${winrateClass(pr.win1)}`}>
                                {Math.round(pr.win1)}%
                              </td>
                              <td className={`text-right py-2.5 tabular-nums whitespace-nowrap ${prAeClass}`}>
                                {formatProfit(pr.ae ?? 0)}
                              </td>
                              <td className={`text-right py-2.5 tabular-nums ${winrateClass(pr.winAe ?? 0)}`}>
                                {Math.round(pr.winAe ?? 0)}%
                              </td>
                              <td className={`text-right py-2.5 tabular-nums whitespace-nowrap ${prP2Class}`}>
                                {formatProfit(pr.p2)}
                              </td>
                              <td className={`text-right py-2.5 tabular-nums ${winrateClass(pr.win2)}`}>
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

        {/* Detail Section */}
        <div className="mt-8">
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-sm font-semibold text-foreground">詳細</h2>
            <div className="flex gap-1">
              <button
                onClick={() => setDetailFilter('all')}
                className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                  detailFilter === 'all'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
                }`}
              >
                全数
              </button>
              <button
                onClick={() => setDetailFilter('ex0')}
                className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                  detailFilter === 'ex0'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
                }`}
              >
                除0株
              </button>
            </div>
            <div className="flex gap-2 ml-auto">
              {(Object.keys(DETAIL_VIEW_LABELS) as DetailViewType[]).map(dv => (
                <button
                  key={dv}
                  onClick={() => setDetailView(dv)}
                  className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                    detailView === dv
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  {DETAIL_VIEW_LABELS[dv]}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            {detailLoading && (
              <div className="absolute inset-0 bg-card/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {detailData?.results?.map(group => {
              const isExpanded = expandedDays.has(group.key);
              const grpMe = detailFilter === 'ex0' ? (group.me?.ex0 ?? 0) : (group.me?.all ?? 0);
              const grpP1 = detailFilter === 'ex0' ? group.p1.ex0 : group.p1.all;
              const grpAe = detailFilter === 'ex0' ? (group.ae?.ex0 ?? 0) : (group.ae?.all ?? 0);
              const grpP2 = detailFilter === 'ex0' ? group.p2.ex0 : group.p2.all;
              const grpCount = detailFilter === 'ex0' ? group.count.ex0 : group.count.all;

              return (
                <details
                  key={group.key}
                  className="mb-2 rounded-lg border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 overflow-hidden"
                  open={isExpanded}
                  onToggle={(e) => {
                    const target = e.target as HTMLDetailsElement;
                    if (target.open && !isExpanded) toggleDay(group.key);
                    if (!target.open && isExpanded) toggleDay(group.key);
                  }}
                >
                  <summary className="px-4 py-3 cursor-pointer flex flex-wrap items-center gap-2 sm:gap-4 text-base hover:bg-muted/10 transition-colors">
                    <span className="font-semibold text-foreground whitespace-nowrap">{group.key}</span>
                    <span className="text-muted-foreground text-sm">{grpCount}件</span>
                    {(() => {
                      const [meClass, p1Class, aeClass, p2Class] = getQuadrantClasses(grpMe, grpP1, grpAe, grpP2);
                      return (
                        <div className="ml-auto tabular-nums text-sm sm:text-base flex items-center gap-4">
                          <div className="text-center min-w-[80px]">
                            <span className="text-muted-foreground text-xs block">10:25</span>
                            <span className={`block text-center ${meClass}`}>{formatProfit(grpMe)}</span>
                          </div>
                          <div className="text-center min-w-[80px]">
                            <span className="text-muted-foreground text-xs block">前場引</span>
                            <span className={`block text-center ${p1Class}`}>{formatProfit(grpP1)}</span>
                          </div>
                          <div className="text-center min-w-[80px]">
                            <span className="text-muted-foreground text-xs block">14:45</span>
                            <span className={`block text-center ${aeClass}`}>{formatProfit(grpAe)}</span>
                          </div>
                          <div className="text-center min-w-[80px]">
                            <span className="text-muted-foreground text-xs block">大引</span>
                            <span className={`block text-center ${p2Class}`}>{formatProfit(grpP2)}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </summary>
                  <div className="px-4 pb-3 border-t border-border/30 overflow-x-auto">
                    <table className="w-full text-sm min-w-[900px]">
                      <thead>
                        <tr className="text-muted-foreground text-sm border-b border-border/30">
                          {detailView !== 'daily' && (
                            <th className="text-left py-2.5 font-medium whitespace-nowrap">日付</th>
                          )}
                          <th className="text-left py-2.5 font-medium whitespace-nowrap">銘柄</th>
                          <th className="text-left py-2.5 font-medium whitespace-nowrap">区分</th>
                          <th className="text-right py-2.5 font-medium whitespace-nowrap">前終</th>
                          <th className="text-right py-2.5 font-medium whitespace-nowrap">始値</th>
                          <th className="text-right py-2.5 font-medium whitespace-nowrap">株数</th>
                          <th className="text-right py-2.5 font-medium whitespace-nowrap">10:25</th>
                          <th className="text-right py-2.5 font-medium whitespace-nowrap">前場引</th>
                          <th className="text-right py-2.5 font-medium whitespace-nowrap">14:45</th>
                          <th className="text-right py-2.5 font-medium whitespace-nowrap">大引</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.stocks
                          .filter(s => detailFilter === 'all' || s.shares !== 0)
                          .sort((a, b) => b.date.localeCompare(a.date))
                          .map((s, idx) => {
                          // GU（始値>前終）は赤、GD（始値<前終）は緑
                          const openColor = s.buyPrice !== null && s.prevClose !== null
                            ? s.buyPrice > s.prevClose ? 'text-rose-400' : s.buyPrice < s.prevClose ? 'text-emerald-400' : 'text-foreground'
                            : 'text-foreground';
                          const [sMeClass, sP1Class, sAeClass, sP2Class] = getQuadrantClasses(s.me ?? 0, s.p1, s.ae ?? 0, s.p2);
                          return (
                            <tr key={idx} className="border-b border-border/20">
                              {detailView !== 'daily' && (
                                <td className="py-2.5 text-sm text-muted-foreground whitespace-nowrap">{s.date}</td>
                              )}
                              <td className="py-2.5 whitespace-nowrap">
                                <span className="text-foreground">{s.ticker.replace('.T', '')}</span>
                                <span className="text-foreground ml-2 text-sm">{s.stockName}</span>
                              </td>
                              <td className="py-2.5 text-sm text-foreground whitespace-nowrap">
                                {s.marginType === '制度信用' ? '制度' : 'いちにち'}
                              </td>
                              <td className="py-2.5 text-right tabular-nums text-foreground whitespace-nowrap">
                                {s.prevClose?.toLocaleString() ?? '-'}
                              </td>
                              <td className={`py-2.5 text-right tabular-nums whitespace-nowrap ${openColor}`}>
                                {s.buyPrice?.toLocaleString() ?? '-'}
                              </td>
                              <td className="py-2.5 text-right tabular-nums text-muted-foreground whitespace-nowrap">
                                {s.shares?.toLocaleString() ?? '-'}
                              </td>
                              <td className={`py-2.5 text-right tabular-nums whitespace-nowrap ${sMeClass}`}>
                                {formatProfit(s.me ?? 0)}
                              </td>
                              <td className={`py-2.5 text-right tabular-nums whitespace-nowrap ${sP1Class}`}>
                                {formatProfit(s.p1)}
                              </td>
                              <td className={`py-2.5 text-right tabular-nums whitespace-nowrap ${sAeClass}`}>
                                {formatProfit(s.ae ?? 0)}
                              </td>
                              <td className={`py-2.5 text-right tabular-nums whitespace-nowrap ${sP2Class}`}>
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
