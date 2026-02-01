'use client';

import { useEffect, useState, useCallback } from 'react';
import { DevNavLinks } from '../../../components/dev';

// Types
interface SegmentStats {
  profit: number;
  winRate: number;
  count: number;
  mean: number;
}

interface SegmentStatsPct {
  pctReturn: number;
  winRate: number;
  count: number;
  meanPct: number;
}

interface TimeSegment {
  key: string;
  label: string;
  time: string;
}

interface PriceRangeData {
  label: string;
  count: number;
  segments11: Record<string, SegmentStats>;
  segments4: Record<string, SegmentStats>;
  pctSegments11: Record<string, SegmentStatsPct>;
  pctSegments4: Record<string, SegmentStatsPct>;
}

interface SeidoData {
  type: string;
  count: number;
  segments11: Record<string, SegmentStats>;
  segments4: Record<string, SegmentStats>;
  pctSegments11: Record<string, SegmentStatsPct>;
  pctSegments4: Record<string, SegmentStatsPct>;
  priceRanges: PriceRangeData[];
}

interface IchinichiData {
  type: string;
  count: { all: number; ex0: number };
  segments11: {
    all: Record<string, SegmentStats>;
    ex0: Record<string, SegmentStats>;
  };
  segments4: {
    all: Record<string, SegmentStats>;
    ex0: Record<string, SegmentStats>;
  };
  pctSegments11: {
    all: Record<string, SegmentStatsPct>;
    ex0: Record<string, SegmentStatsPct>;
  };
  pctSegments4: {
    all: Record<string, SegmentStatsPct>;
    ex0: Record<string, SegmentStatsPct>;
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
  timeSegments11: TimeSegment[];
  timeSegments4: TimeSegment[];
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
    segments11: {
      all: Record<string, SegmentStats>;
      ex0: Record<string, SegmentStats>;
    };
    segments4: {
      all: Record<string, SegmentStats>;
      ex0: Record<string, SegmentStats>;
    };
    pctSegments11: {
      all: Record<string, SegmentStatsPct>;
      ex0: Record<string, SegmentStatsPct>;
    };
    pctSegments4: {
      all: Record<string, SegmentStatsPct>;
      ex0: Record<string, SegmentStatsPct>;
    };
  };
  weekdays: WeekdayData[];
  excludeExtreme: boolean;
  filters: {
    priceMin: number;
    priceMax: number;
    priceStep: number;
  };
}

type FilterType = 'all' | 'ex0';
type SegmentMode = '4seg' | '11seg';
type DisplayMode = 'amount' | 'pct';
type DetailViewType = 'daily' | 'weekly' | 'monthly' | 'weekday';

interface DetailStock {
  date: string;
  ticker: string;
  stockName: string;
  marginType: string;
  priceRange: string;
  prevClose: number | null;
  buyPrice: number | null;
  shares: number | null;
  segments: Record<string, number | null>;
}

interface DetailGroup {
  key: string;
  count: { all: number; ex0: number };
  segments: {
    all: Record<string, number>;
    ex0: Record<string, number>;
  };
  stocks: DetailStock[];
}

interface DetailResponse {
  view: string;
  excludeExtreme: boolean;
  timeSegments: TimeSegment[];
  results: DetailGroup[];
}

const DETAIL_VIEW_LABELS: Record<DetailViewType, string> = {
  daily: '日別',
  weekly: '週別',
  monthly: '月別',
  weekday: '曜日別',
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

// Price presets
const PRICE_PRESETS = [
  { label: "全て", min: 0, max: 999999 },
  { label: "~1000", min: 0, max: 1000 },
  { label: "1000-3000", min: 1000, max: 3000 },
  { label: "3000-5000", min: 3000, max: 5000 },
  { label: "5000~", min: 5000, max: 999999 },
];

const STEP_OPTIONS = [500, 1000];

// Format profit (amount)
const formatProfit = (val: number) => {
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val.toLocaleString()}`;
};

// Format pct return (平均)
const formatPct = (val: number) => {
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}%`;
};

// Color classes for segments
const getSegmentClasses = (
  segments: Record<string, SegmentStats | SegmentStatsPct>,
  timeSegments: TimeSegment[],
  displayMode: DisplayMode
): Record<string, string> => {
  const values = timeSegments.map(seg => ({
    key: seg.key,
    value: displayMode === 'amount'
      ? (segments[seg.key] as SegmentStats)?.profit ?? 0
      : (segments[seg.key] as SegmentStatsPct)?.meanPct ?? 0,
  }));

  const positives = values.filter(v => v.value > 0).sort((a, b) => b.value - a.value);
  const negatives = values.filter(v => v.value < 0).sort((a, b) => a.value - b.value);

  const WHITE = 'text-foreground';
  const GREEN_1 = 'text-emerald-400';
  const GREEN_2 = 'text-emerald-500';
  const RED_1 = 'text-rose-400';
  const RED_2 = 'text-rose-500';

  const result: Record<string, string> = {};
  values.forEach(v => {
    if (positives.length >= 1 && v.value === positives[0].value) {
      result[v.key] = GREEN_1;
    } else if (positives.length >= 2 && v.value === positives[1].value) {
      result[v.key] = GREEN_2;
    } else if (negatives.length >= 1 && v.value === negatives[0].value) {
      result[v.key] = RED_1;
    } else if (negatives.length >= 2 && v.value === negatives[1].value) {
      result[v.key] = RED_2;
    } else {
      result[v.key] = WHITE;
    }
  });

  return result;
};

const winrateClass = (rate: number) =>
  rate > 50 ? 'text-emerald-400' : rate < 50 ? 'text-rose-400' : 'text-foreground';

export default function AnalysisCustomPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI State
  const [segmentMode, setSegmentMode] = useState<SegmentMode>('11seg');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('amount');
  const [excludeExtreme, setExcludeExtreme] = useState(false);
  const [overallFilter, setOverallFilter] = useState<FilterType>('all');
  const [ichinichiFilters, setIchinichiFilters] = useState<Record<number, FilterType>>({});

  // Price filters
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(999999);
  const [priceStep, setPriceStep] = useState(0);
  const [customMin, setCustomMin] = useState('');
  const [customMax, setCustomMax] = useState('');
  const [customStep, setCustomStep] = useState(500);
  const [activePreset, setActivePreset] = useState(0);

  // Detail section
  const [detailView, setDetailView] = useState<DetailViewType>('daily');
  const [detailData, setDetailData] = useState<DetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailFilter, setDetailFilter] = useState<FilterType>('all');
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // Detail filters
  const PRICE_RANGE_LABELS = ['~1,000円', '1,000~3,000円', '3,000~5,000円', '5,000~10,000円', '10,000円~'];
  const MARGIN_TYPE_LABELS = ['制度信用', 'いちにち信用'];
  const [priceRangeFilters, setPriceRangeFilters] = useState<Set<string>>(new Set(PRICE_RANGE_LABELS));
  const [marginTypeFilters, setMarginTypeFilters] = useState<Set<string>>(new Set(MARGIN_TYPE_LABELS));

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        exclude_extreme: excludeExtreme.toString(),
        price_min: priceMin.toString(),
        price_max: priceMax.toString(),
        price_step: priceStep.toString(),
      });
      const res = await fetch(`${API_BASE}/dev/analysis-custom/summary?${params}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [excludeExtreme, priceMin, priceMax, priceStep]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch detail data
  const fetchDetailData = useCallback(async (view: DetailViewType) => {
    setDetailLoading(true);
    setExpandedDays(new Set());
    try {
      const params = new URLSearchParams({
        view,
        exclude_extreme: excludeExtreme.toString(),
        price_min: priceMin.toString(),
        price_max: priceMax.toString(),
        price_step: priceStep.toString(),
      });
      const res = await fetch(`${API_BASE}/dev/analysis-custom/details?${params}`);
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
  }, [excludeExtreme, priceMin, priceMax, priceStep]);

  useEffect(() => {
    if (!loading && data) {
      fetchDetailData(detailView);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, detailView, excludeExtreme, priceMin, priceMax, priceStep]);

  // Filter toggles
  const togglePriceRange = (label: string) => {
    setPriceRangeFilters(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };
  const selectAllPriceRanges = () => setPriceRangeFilters(new Set(PRICE_RANGE_LABELS));
  const selectNonePriceRanges = () => setPriceRangeFilters(new Set());
  const toggleMarginType = (label: string) => {
    setMarginTypeFilters(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const toggleDay = (date: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const handlePresetClick = (idx: number) => {
    setActivePreset(idx);
    const preset = PRICE_PRESETS[idx];
    setCustomMin(preset.min > 0 ? preset.min.toString() : '');
    setCustomMax(preset.max < 999999 ? preset.max.toString() : '');
    setPriceMin(preset.min);
    setPriceMax(preset.max);
    setPriceStep(0);
  };

  const handleCustomApply = () => {
    const min = parseInt(customMin) || 0;
    const max = parseInt(customMax) || 999999;
    if (min >= max) return;
    const shouldUseStep = min > 0 || max <= 20000;
    setPriceMin(min);
    setPriceMax(max);
    setPriceStep(shouldUseStep ? customStep : 0);
    setActivePreset(-1);
  };

  const getIchinichiFilter = (idx: number): FilterType => ichinichiFilters[idx] || 'all';
  const setIchinichiFilter = (idx: number, f: FilterType) => {
    setIchinichiFilters(prev => ({ ...prev, [idx]: f }));
  };

  const getTimeSegments = (): TimeSegment[] => {
    if (!data) return [];
    return segmentMode === '11seg' ? data.timeSegments11 : data.timeSegments4;
  };

  const getSegmentsData = (
    data11: Record<string, SegmentStats>,
    data4: Record<string, SegmentStats>,
    pct11: Record<string, SegmentStatsPct>,
    pct4: Record<string, SegmentStatsPct>
  ) => {
    if (displayMode === 'amount') {
      return segmentMode === '11seg' ? data11 : data4;
    } else {
      return segmentMode === '11seg' ? pct11 : pct4;
    }
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="rounded-xl border border-border/40 bg-card/50 h-24 animate-pulse" />
            ))}
          </div>
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

  const timeSegments = getTimeSegments();
  const { weekdays, overall, dateRange } = data;
  const overallSegs = getSegmentsData(
    overallFilter === 'ex0' ? overall.segments11.ex0 : overall.segments11.all,
    overallFilter === 'ex0' ? overall.segments4.ex0 : overall.segments4.all,
    overallFilter === 'ex0' ? overall.pctSegments11.ex0 : overall.pctSegments11.all,
    overallFilter === 'ex0' ? overall.pctSegments4.ex0 : overall.pctSegments4.all
  );
  const overallCount = overallFilter === 'ex0' ? overall.count.ex0 : overall.count.all;
  const ichinichiCount = overallFilter === 'ex0' ? overall.ichinichiCount.ex0 : overall.ichinichiCount.all;
  const segClasses = getSegmentClasses(overallSegs, timeSegments, displayMode);

  return (
    <main className="relative min-h-screen">
      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-primary/8 via-primary/3 to-transparent blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-1/3 -left-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-accent/10 via-accent/4 to-transparent blur-3xl animate-pulse-slower" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 leading-[1.8] tracking-[0.02em] font-sans">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4 pb-3 border-b border-border/30">
          <div>
            <h1 className="text-xl font-bold text-foreground">カスタム分析</h1>
            <p className="text-muted-foreground text-sm">
              {dateRange.from} ~ {dateRange.to} ({dateRange.tradingDays}営業日) | ショート基準
              {excludeExtreme && <span className="ml-2 text-amber-400">（異常日除外中）</span>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* 異常日除外トグル */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={excludeExtreme}
                onChange={(e) => setExcludeExtreme(e.target.checked)}
                className="w-4 h-4 rounded border-amber-500/50 bg-muted/30 text-amber-500 focus:ring-amber-500/50"
              />
              <span className="text-xs text-amber-400 whitespace-nowrap">異常日除外</span>
            </label>
            <DevNavLinks links={["dashboard", "analysis", "recommendations"]} />
          </div>
        </header>

        {/* Control Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Segment Mode */}
          <div className="flex gap-1">
            <button
              onClick={() => setSegmentMode('4seg')}
              className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                segmentMode === '4seg'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
              }`}
            >
              4区分
            </button>
            <button
              onClick={() => setSegmentMode('11seg')}
              className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                segmentMode === '11seg'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
              }`}
            >
              11区分
            </button>
          </div>

          <span className="text-border mx-1">|</span>

          {/* Display Mode */}
          <div className="flex gap-1">
            <button
              onClick={() => setDisplayMode('amount')}
              className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                displayMode === 'amount'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
              }`}
            >
              実額
            </button>
            <button
              onClick={() => setDisplayMode('pct')}
              className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                displayMode === 'pct'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
              }`}
            >
              比率
            </button>
          </div>
        </div>

        {/* Price Presets */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {PRICE_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handlePresetClick(idx)}
              className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                activePreset === idx
                  ? 'bg-muted/50 border-border/60 text-foreground'
                  : 'bg-transparent border-border/30 text-muted-foreground hover:bg-muted/30'
              }`}
            >
              {preset.label}
            </button>
          ))}
          <span className="text-border mx-1">|</span>
          <input
            type="number"
            value={customMin}
            onChange={(e) => setCustomMin(e.target.value)}
            placeholder="下限"
            className="w-20 px-2 py-1 text-xs rounded border border-border/40 bg-muted/30 text-foreground"
          />
          <span className="text-muted-foreground text-xs">~</span>
          <input
            type="number"
            value={customMax}
            onChange={(e) => setCustomMax(e.target.value)}
            placeholder="上限"
            className="w-20 px-2 py-1 text-xs rounded border border-border/40 bg-muted/30 text-foreground"
          />
          <select
            value={customStep}
            onChange={(e) => setCustomStep(parseInt(e.target.value))}
            className="px-2 py-1 text-xs rounded border border-border/40 bg-muted/30 text-foreground"
          >
            {STEP_OPTIONS.map(step => (
              <option key={step} value={step}>{step}円</option>
            ))}
          </select>
          <button
            onClick={handleCustomApply}
            className="px-3 py-1 text-xs rounded-md border border-primary bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
          >
            適用
          </button>
        </div>

        {/* Top Summary Cards */}
        <div className={`grid gap-3 mb-6 ${segmentMode === '4seg' ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6'}`}>
          {/* 総件数 */}
          <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-5 shadow-lg shadow-black/5 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="flex items-center mb-2">
                <span className="text-muted-foreground text-sm">総件数</span>
                <div className="flex gap-1 ml-auto">
                  <button
                    onClick={() => setOverallFilter('all')}
                    className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                      overallFilter === 'all'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    全
                  </button>
                  <button
                    onClick={() => setOverallFilter('ex0')}
                    className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                      overallFilter === 'ex0'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    除0
                  </button>
                </div>
              </div>
              <div className="text-2xl font-bold text-right tabular-nums text-foreground">{overallCount}</div>
              <div className="text-muted-foreground text-xs text-right mt-1">
                制度{overall.seidoCount} / いちにち{ichinichiCount}
              </div>
            </div>
          </div>

          {/* Segment Cards */}
          {timeSegments.map(seg => {
            const stats = overallSegs[seg.key];
            const value = displayMode === 'amount'
              ? (stats as SegmentStats)?.profit ?? 0
              : (stats as SegmentStatsPct)?.meanPct ?? 0;
            const winRate = stats?.winRate ?? 0;
            return (
              <div key={seg.key} className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-5 shadow-lg shadow-black/5 backdrop-blur-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
                <div className="relative">
                  <div className="flex items-center mb-2">
                    <span className="text-muted-foreground text-sm whitespace-nowrap">{seg.label}</span>
                  </div>
                  <div className={`text-2xl font-bold text-right tabular-nums whitespace-nowrap ${segClasses[seg.key]}`}>
                    {displayMode === 'amount' ? `${formatProfit(value)}円` : formatPct(value)}
                  </div>
                  <div className={`text-xs text-right mt-1 ${winrateClass(winRate)}`}>
                    勝率 {Math.round(winRate)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Weekday Cards */}
        {weekdays.map((wd, idx) => {
          const ichFilter = getIchinichiFilter(idx);

          const seidoSegs = getSegmentsData(
            wd.seido.segments11,
            wd.seido.segments4,
            wd.seido.pctSegments11,
            wd.seido.pctSegments4
          );

          const ichiSegs = getSegmentsData(
            ichFilter === 'ex0' ? wd.ichinichi.segments11.ex0 : wd.ichinichi.segments11.all,
            ichFilter === 'ex0' ? wd.ichinichi.segments4.ex0 : wd.ichinichi.segments4.all,
            ichFilter === 'ex0' ? wd.ichinichi.pctSegments11.ex0 : wd.ichinichi.pctSegments11.all,
            ichFilter === 'ex0' ? wd.ichinichi.pctSegments4.ex0 : wd.ichinichi.pctSegments4.all
          );

          const ichiPriceRanges = ichFilter === 'ex0'
            ? wd.ichinichi.priceRanges.ex0
            : wd.ichinichi.priceRanges.all;
          const ichiCount = ichFilter === 'ex0' ? wd.ichinichi.count.ex0 : wd.ichinichi.count.all;

          return (
            <div key={wd.weekday} className="mb-6">
              <h2 className="text-sm font-semibold text-foreground mb-3">{wd.weekday}</h2>
              <div className="grid grid-cols-1 gap-4">
                {/* Seido Card */}
                <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-semibold text-lg text-foreground">制度信用</span>
                      <span className="text-muted-foreground text-base">{wd.seido.count}件</span>
                    </div>
                    {/* Summary row */}
                    <div className="overflow-x-auto mb-3 pb-3 border-b border-border/30">
                      <div className="flex justify-end gap-5 min-w-[900px]">
                        {(() => {
                          const classes = getSegmentClasses(seidoSegs, timeSegments, displayMode);
                          return timeSegments.map(seg => {
                            const stats = seidoSegs[seg.key];
                            const value = displayMode === 'amount'
                              ? (stats as SegmentStats)?.profit ?? 0
                              : (stats as SegmentStatsPct)?.meanPct ?? 0;
                            return (
                              <div key={seg.key} className="text-right min-w-[70px]">
                                <div className="text-muted-foreground text-sm">{seg.label}</div>
                                <div className={`text-xl font-bold tabular-nums ${classes[seg.key]}`}>
                                  {displayMode === 'amount' ? formatProfit(value) : formatPct(value)}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                    {/* Price range table */}
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
                            const prSegs = getSegmentsData(
                              pr.segments11,
                              pr.segments4,
                              pr.pctSegments11,
                              pr.pctSegments4
                            );
                            const classes = getSegmentClasses(prSegs, timeSegments, displayMode);
                            return (
                              <tr key={pr.label} className="border-b border-border/20">
                                <td className="text-right px-2 py-2.5 tabular-nums text-foreground whitespace-nowrap">{pr.label}</td>
                                <td className="text-right px-2 py-2.5 tabular-nums text-foreground">{pr.count}</td>
                                {timeSegments.map(seg => {
                                  const stats = prSegs[seg.key];
                                  const value = displayMode === 'amount'
                                    ? (stats as SegmentStats)?.profit ?? 0
                                    : (stats as SegmentStatsPct)?.meanPct ?? 0;
                                  const winRate = stats?.winRate ?? 0;
                                  return (
                                    <td key={seg.key} className="text-right px-2 py-2.5">
                                      <div className={`tabular-nums whitespace-nowrap ${classes[seg.key]}`}>
                                        {displayMode === 'amount' ? formatProfit(value) : formatPct(value)}
                                      </div>
                                      <div className={`text-xs ${winrateClass(winRate)}`}>
                                        {Math.round(winRate)}%
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

                {/* Ichinichi Card */}
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
                    {/* Summary row */}
                    <div className="overflow-x-auto mb-3 pb-3 border-b border-border/30">
                      <div className="flex justify-end gap-5 min-w-[900px]">
                        {(() => {
                          const classes = getSegmentClasses(ichiSegs, timeSegments, displayMode);
                          return timeSegments.map(seg => {
                            const stats = ichiSegs[seg.key];
                            const value = displayMode === 'amount'
                              ? (stats as SegmentStats)?.profit ?? 0
                              : (stats as SegmentStatsPct)?.meanPct ?? 0;
                            return (
                              <div key={seg.key} className="text-right min-w-[70px]">
                                <div className="text-muted-foreground text-sm">{seg.label}</div>
                                <div className={`text-xl font-bold tabular-nums ${classes[seg.key]}`}>
                                  {displayMode === 'amount' ? formatProfit(value) : formatPct(value)}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                    {/* Price range table */}
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
                            const prSegs = getSegmentsData(
                              pr.segments11,
                              pr.segments4,
                              pr.pctSegments11,
                              pr.pctSegments4
                            );
                            const classes = getSegmentClasses(prSegs, timeSegments, displayMode);
                            return (
                              <tr key={pr.label} className="border-b border-border/20">
                                <td className="text-right px-2 py-2.5 tabular-nums text-foreground whitespace-nowrap">{pr.label}</td>
                                <td className="text-right px-2 py-2.5 tabular-nums text-foreground">{pr.count}</td>
                                {timeSegments.map(seg => {
                                  const stats = prSegs[seg.key];
                                  const value = displayMode === 'amount'
                                    ? (stats as SegmentStats)?.profit ?? 0
                                    : (stats as SegmentStatsPct)?.meanPct ?? 0;
                                  const winRate = stats?.winRate ?? 0;
                                  return (
                                    <td key={seg.key} className="text-right px-2 py-2.5">
                                      <div className={`tabular-nums whitespace-nowrap ${classes[seg.key]}`}>
                                        {displayMode === 'amount' ? formatProfit(value) : formatPct(value)}
                                      </div>
                                      <div className={`text-xs ${winrateClass(winRate)}`}>
                                        {Math.round(winRate)}%
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

        {/* Detail Section */}
        <div className="mt-8 mb-6">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <h2 className="text-sm md:text-base font-semibold text-foreground">詳細</h2>
            <div className="flex gap-1">
              <button
                onClick={() => setDetailFilter('all')}
                className={`px-2 py-0.5 text-[10px] md:text-xs rounded border transition-colors ${
                  detailFilter === 'all'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
                }`}
              >
                全数
              </button>
              <button
                onClick={() => setDetailFilter('ex0')}
                className={`px-2 py-0.5 text-[10px] md:text-xs rounded border transition-colors ${
                  detailFilter === 'ex0'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
                }`}
              >
                除0株
              </button>
            </div>
            {/* Price Range Filter */}
            <div className="flex items-center gap-2 border-l border-border/40 pl-4">
              <span className="text-xs md:text-sm text-muted-foreground">価格帯:</span>
              <div className="flex gap-1">
                <button
                  onClick={selectAllPriceRanges}
                  className="px-1.5 py-0.5 text-[9px] md:text-[10px] rounded border bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50"
                >
                  全
                </button>
                <button
                  onClick={selectNonePriceRanges}
                  className="px-1.5 py-0.5 text-[9px] md:text-[10px] rounded border bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50"
                >
                  解除
                </button>
              </div>
              <div className="flex gap-1 md:gap-1.5 flex-wrap">
                {PRICE_RANGE_LABELS.map(label => (
                  <label key={label} className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={priceRangeFilters.has(label)}
                      onChange={() => togglePriceRange(label)}
                      className="w-3 h-3 md:w-3.5 md:h-3.5 rounded border-border/40 bg-muted/30 text-primary focus:ring-primary/50"
                    />
                    <span className={`text-[10px] md:text-[11px] ${priceRangeFilters.has(label) ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            {/* Margin Type Filter */}
            <div className="flex items-center gap-2 border-l border-border/40 pl-4">
              <span className="text-xs md:text-sm text-muted-foreground">区分:</span>
              <div className="flex gap-2">
                {MARGIN_TYPE_LABELS.map(label => (
                  <label key={label} className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={marginTypeFilters.has(label)}
                      onChange={() => toggleMarginType(label)}
                      className="w-3 h-3 md:w-3.5 md:h-3.5 rounded border-border/40 bg-muted/30 text-primary focus:ring-primary/50"
                    />
                    <span className={`text-[10px] md:text-[11px] ${marginTypeFilters.has(label) ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {label === '制度信用' ? '制度' : 'いちにち'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 ml-auto">
              {(Object.keys(DETAIL_VIEW_LABELS) as DetailViewType[]).map(dv => (
                <button
                  key={dv}
                  onClick={() => setDetailView(dv)}
                  className={`px-3 py-1 text-xs md:text-sm rounded-md border transition-colors ${
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
                // Filter stocks by detailFilter, priceRangeFilters, and marginTypeFilters
                const filteredStocks = group.stocks.filter(s => {
                  const passDetailFilter = detailFilter === 'all' || s.marginType === '制度信用' || s.shares === null || (s.shares ?? 0) > 0;
                  const passPriceRange = priceRangeFilters.has(s.priceRange);
                  const passMarginType = marginTypeFilters.has(s.marginType);
                  return passDetailFilter && passPriceRange && passMarginType;
                });
                const grpCount = filteredStocks.length;

                // Calculate group totals for displayed segments
                const displaySegs = segmentMode === '11seg' ? data?.timeSegments11 : data?.timeSegments4;
                const grpSegTotals: Record<string, number> = {};
                if (displaySegs) {
                  displaySegs.forEach(seg => {
                    grpSegTotals[seg.key] = filteredStocks.reduce((sum, s) => sum + (s.segments[seg.key] ?? 0), 0);
                  });
                }

                // Color classes for group totals
                const values = displaySegs?.map(seg => ({ key: seg.key, value: grpSegTotals[seg.key] ?? 0 })) ?? [];
                const positives = values.filter(v => v.value > 0).sort((a, b) => b.value - a.value);
                const negatives = values.filter(v => v.value < 0).sort((a, b) => a.value - b.value);
                const grpSegClasses: Record<string, string> = {};
                values.forEach(v => {
                  if (positives.length >= 1 && v.value === positives[0].value) {
                    grpSegClasses[v.key] = 'text-emerald-400';
                  } else if (positives.length >= 2 && v.value === positives[1].value) {
                    grpSegClasses[v.key] = 'text-emerald-500';
                  } else if (negatives.length >= 1 && v.value === negatives[0].value) {
                    grpSegClasses[v.key] = 'text-rose-400';
                  } else if (negatives.length >= 2 && v.value === negatives[1].value) {
                    grpSegClasses[v.key] = 'text-rose-500';
                  } else {
                    grpSegClasses[v.key] = 'text-foreground';
                  }
                });

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
                      <div className="ml-auto tabular-nums text-sm flex items-center gap-1 sm:gap-3 overflow-x-auto">
                        {displaySegs?.map(seg => (
                          <div key={seg.key} className="text-center min-w-[50px]">
                            <span className="text-muted-foreground text-xs block">{seg.label}</span>
                            <span className={`block text-center ${grpSegClasses[seg.key]}`}>
                              {formatProfit(grpSegTotals[seg.key] ?? 0)}
                            </span>
                          </div>
                        ))}
                      </div>
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
                            {displaySegs?.map(seg => (
                              <th key={seg.key} className="text-right py-2.5 font-medium whitespace-nowrap">{seg.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredStocks
                            .sort((a, b) => b.date.localeCompare(a.date))
                            .map((s, idx) => {
                            // GU（始値>前終）は赤、GD（始値<前終）は緑
                            const openColor = s.buyPrice !== null && s.prevClose !== null
                              ? s.buyPrice > s.prevClose ? 'text-rose-400' : s.buyPrice < s.prevClose ? 'text-emerald-400' : 'text-foreground'
                              : 'text-foreground';

                            // Stock segment color classes
                            const sValues = displaySegs?.map(seg => ({ key: seg.key, value: s.segments[seg.key] ?? 0 })) ?? [];
                            const sPositives = sValues.filter(v => v.value > 0).sort((a, b) => b.value - a.value);
                            const sNegatives = sValues.filter(v => v.value < 0).sort((a, b) => a.value - b.value);
                            const sSegClasses: Record<string, string> = {};
                            sValues.forEach(v => {
                              if (sPositives.length >= 1 && v.value === sPositives[0].value) {
                                sSegClasses[v.key] = 'text-emerald-400';
                              } else if (sPositives.length >= 2 && v.value === sPositives[1].value) {
                                sSegClasses[v.key] = 'text-emerald-500';
                              } else if (sNegatives.length >= 1 && v.value === sNegatives[0].value) {
                                sSegClasses[v.key] = 'text-rose-400';
                              } else if (sNegatives.length >= 2 && v.value === sNegatives[1].value) {
                                sSegClasses[v.key] = 'text-rose-500';
                              } else {
                                sSegClasses[v.key] = 'text-foreground';
                              }
                            });

                            return (
                              <tr key={idx} className="border-b border-border/20">
                                {detailView !== 'daily' && (
                                  <td className="py-2.5 text-sm text-muted-foreground whitespace-nowrap">{s.date}</td>
                                )}
                                <td className="py-2.5 whitespace-nowrap">
                                  <span className="text-foreground">{s.ticker.replace('.T', '')}</span>
                                  <span className="text-foreground ml-2 text-sm" title={s.stockName}>
                                    {[...s.stockName].length > 5 ? [...s.stockName].slice(0, 5).join('') + '...' : s.stockName}
                                  </span>
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
                                {displaySegs?.map(seg => (
                                  <td key={seg.key} className={`py-2.5 text-right tabular-nums whitespace-nowrap ${sSegClasses[seg.key]}`}>
                                    {s.segments[seg.key] !== null ? formatProfit(s.segments[seg.key]!) : '-'}
                                  </td>
                                ))}
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
          Generated: {new Date(data.generatedAt).toLocaleString('ja-JP')}
        </div>
      </div>
    </main>
  );
}
