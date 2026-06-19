'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { DevNavLinks } from '../../../components/dev';

// Types
interface SegmentStats {
  profit: number;
  winRate: number | null;
  count: number;
  mean: number | null;
  pf: number | null;
}

interface SegmentStatsPct {
  pctReturn: number;
  winRate: number | null;
  count: number;
  meanPct: number | null;
  pf: number | null;
}

interface TimeSegment {
  key: string;
  label: string;
  time: string;
}

interface DataScope {
  scope?: string;
  analysisStartDate?: string;
  excludedLegacyRows?: number;
  rows?: number;
  analysisSource?: string;
  priceBasis?: string;
}

interface PriceRangeData {
  label: string;
  count: number;
  segments11: Record<string, SegmentStats>;
  segments4: Record<string, SegmentStats>;
  pctSegments11: Record<string, SegmentStatsPct>;
  pctSegments4: Record<string, SegmentStatsPct>;
}

interface MarginData {
  type: string;
  count: number;
  segments11: Record<string, SegmentStats>;
  segments4: Record<string, SegmentStats>;
  pctSegments11: Record<string, SegmentStatsPct>;
  pctSegments4: Record<string, SegmentStatsPct>;
  priceRanges: PriceRangeData[];
}

interface WeekdayRule {
  weekday: string;
  direction: string;
  rule: string;
  pf: number;
  note: string;
}

interface WeekdayData {
  weekday: string;
  seido: MarginData;
  ichinichi: MarginData;
  weekday_rule?: WeekdayRule | null;
}

interface StrategyCandidate {
  weekday: string;
  weekdayIndex: number;
  marginKey: string;
  marginLabel: string;
  bucket: string;
  bucketDecision?: string | null;
  probMode?: 'bin' | 'regime';
  count: number;
  decision: 'GO' | 'CONDITIONAL' | 'SKIP';
  reason: string;
  bestSegment: {
    key: string;
    label: string;
    time: string;
    profit: number;
    winRate: number | null;
    count: number;
    mean: number | null;
    pf: number | null;
  } | null;
  closeSegment: {
    key: string;
    label: string;
    time: string;
    profit: number;
    winRate: number | null;
    count: number;
    mean: number | null;
    pf: number | null;
  } | null;
  pfDelta: number | null;
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
    count: number;
    seidoCount: number;
    ichinichiCount: number;
    segments11: Record<string, SegmentStats>;
    segments4: Record<string, SegmentStats>;
    pctSegments11: Record<string, SegmentStatsPct>;
    pctSegments4: Record<string, SegmentStatsPct>;
  };
  weekdays: WeekdayData[];
  strategyCandidates?: StrategyCandidate[];
  excludeExtreme: boolean;
  direction: string;
  dataScope?: DataScope;
  filters: {
    priceMin: number;
    priceMax: number;
    priceStep: number;
    buckets: string[];
  };
  bucketInfo?: {
    available: boolean;
    buckets: string[];
    thresholds: { low: number; high: number };
  };
}

type SegmentMode = '4seg' | '11seg';
type DisplayMode = 'amount' | 'pct';
type DetailViewType = 'daily' | 'weekly' | 'monthly' | 'weekday';
type Direction = 'short' | 'long';

interface DetailStock {
  date: string;
  ticker: string;
  stockName: string;
  marginType: string;
  priceRange: string;
  prevClose: number | null;
  buyPrice: number | null;
  shares: number | null;
  mlProb: number | null;
  bucket: string | null;
  segments: Record<string, number | null>;
}

interface DetailGroup {
  key: string;
  count: number;
  segments: Record<string, number>;
  stocks: DetailStock[];
}

interface DetailResponse {
  view: string;
  excludeExtreme: boolean;
  direction: string;
  timeSegments: TimeSegment[];
  results: DetailGroup[];
}

const DETAIL_VIEW_LABELS: Record<DetailViewType, string> = {
  daily: '日別',
  weekly: '週別',
  monthly: '月別',
  weekday: '曜日別',
};

const BUCKET_LABELS = ['LOW_PROB_HEAT', 'MID_PROB_HEAT', 'HIGH_PROB_HEAT'] as const;
const PROB_BIN_LABELS = [
  '0.0-0.1',
  '0.1-0.2',
  '0.2-0.3',
  '0.3-0.4',
  '0.4-0.5',
  '0.5-0.6',
  '0.6-0.7',
  '0.7-0.8',
  '0.8-0.9',
  '0.9-1.0',
];
const BUCKET_COLORS: Record<string, string> = {
  LOW_PROB_HEAT: 'text-sky-400',
  MID_PROB_HEAT: 'text-amber-400',
  HIGH_PROB_HEAT: 'text-fuchsia-300',
};
const BUCKET_ORDER: Record<string, number> = {
  LOW_PROB_HEAT: 0,
  MID_PROB_HEAT: 1,
  HIGH_PROB_HEAT: 2,
  ...Object.fromEntries(PROB_BIN_LABELS.map((label, index) => [label, index])),
};
const WEEKDAY_SLUGS = ['mon', 'tue', 'wed', 'thu', 'fri'] as const;

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

const formatProfit = (val: number) => {
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val.toLocaleString()}`;
};

const formatPct = (val: number) => {
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}%`;
};

const formatPF = (pf: number | null) => {
  if (pf === null) return '-';
  return pf.toFixed(2);
};

const pfClass = (pf: number | null) => {
  if (pf === null) return 'text-muted-foreground';
  if (pf >= 2.0) return 'text-emerald-400 font-bold';
  if (pf >= 1.5) return 'text-emerald-400';
  if (pf >= 1.0) return 'text-foreground';
  if (pf >= 0.7) return 'text-rose-400';
  return 'text-rose-400 font-bold';
};

const decisionClass = (decision: StrategyCandidate['decision']) => ({
  GO: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  CONDITIONAL: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  SKIP: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
}[decision]);

const DECISION_ORDER: Record<StrategyCandidate['decision'], number> = {
  GO: 0,
  CONDITIONAL: 1,
  SKIP: 2,
};

const DECISION_LABELS: Record<StrategyCandidate['decision'], string> = {
  GO: '大引け',
  CONDITIONAL: '条件',
  SKIP: '見送り',
};

type CandidateClassKey = 'HOLD_OK' | 'TIME_EXIT' | 'EARLY_EXIT' | 'REVIEW' | 'NO_EDGE' | 'LOW_N';
const CANDIDATE_CLASS_ORDER: CandidateClassKey[] = ['HOLD_OK', 'TIME_EXIT', 'EARLY_EXIT', 'REVIEW', 'NO_EDGE', 'LOW_N'];

const CANDIDATE_CLASS_META: Record<CandidateClassKey, { label: string; shortLabel: string; tone: string; order: number }> = {
  HOLD_OK: {
    label: '大引け採用',
    shortLabel: '大引け',
    tone: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    order: 0,
  },
  TIME_EXIT: {
    label: '時間指定',
    shortLabel: '時間',
    tone: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    order: 1,
  },
  EARLY_EXIT: {
    label: '早期利確',
    shortLabel: '早利',
    tone: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
    order: 2,
  },
  REVIEW: {
    label: '詳細確認',
    shortLabel: '確認',
    tone: 'border-violet-500/40 bg-violet-500/10 text-violet-300',
    order: 3,
  },
  NO_EDGE: {
    label: '期待値不足',
    shortLabel: '不足',
    tone: 'border-rose-500/35 bg-rose-500/10 text-rose-300',
    order: 4,
  },
  LOW_N: {
    label: 'サンプル不足',
    shortLabel: '少数',
    tone: 'border-border/40 bg-muted/20 text-muted-foreground',
    order: 5,
  },
};

const CANDIDATE_CLASS_DESCRIPTIONS: Record<CandidateClassKey, string> = {
  HOLD_OK: '最適出口が大引けで、最適PF>=1.5・大引けPF>=1.0・合計損益>0。途中で逃げなくても期待値が残る候補。',
  TIME_EXIT: '最適PF>=1.2・合計損益>0だが、大引けPF<1.0。大引けまで持たず、表示された最適時間で切る前提。',
  EARLY_EXIT: '最適PF>=1.2・合計損益>0で、大引けPFは1.0以上だが、途中出口が大引けよりPF+0.3以上良い候補。',
  REVIEW: '最適PF>=1.2・合計損益>0だが、時間指定/早期利確に明確分類できない候補。曜日詳細でDD/CVaR・地合い・出口を確認。',
  NO_EDGE: '最適PF<1.2、または合計損益<=0。現時点では採用しない候補。',
  LOW_N: '件数が10未満、またはPFが算出できない候補。統計的に判断しない。',
};

const classifyCandidate = (row: StrategyCandidate): CandidateClassKey => {
  if (row.count < 10 || !row.bestSegment || row.bestSegment.pf === null) return 'LOW_N';
  if (row.decision === 'GO') return 'HOLD_OK';
  if (row.decision === 'CONDITIONAL') {
    if ((row.closeSegment?.pf ?? null) !== null && (row.closeSegment?.pf ?? 0) < 1.0) return 'TIME_EXIT';
    if (row.bestSegment.key !== 'seg_1530' && (row.pfDelta ?? 0) >= 0.3) return 'EARLY_EXIT';
    return 'REVIEW';
  }
  return 'NO_EDGE';
};

const regimeShortLabel = (regime: string) => {
  if (regime === 'LOW_PROB_HEAT') return 'LOW';
  if (regime === 'MID_PROB_HEAT') return 'MID';
  if (regime === 'HIGH_PROB_HEAT') return 'HIGH';
  return regime;
};

const strategyBucketClass = (row: StrategyCandidate) =>
  row.bucketDecision ? (BUCKET_COLORS[row.bucketDecision] ?? 'text-foreground') : (BUCKET_COLORS[row.bucket] ?? 'text-foreground');

const strategyBucketLabel = (row: StrategyCandidate) =>
  row.probMode === 'bin' ? row.bucket : regimeShortLabel(row.bucket);

const dataSourceLabel = (scope?: DataScope) => {
  if (scope?.analysisSource === 'grok_master_jquants_segments') return 'J-Quants分足master';
  if (scope?.analysisSource === 'grok_trending_archive') return 'archive seg';
  return scope?.analysisSource ?? 'source未確認';
};

const priceBasisLabel = (scope?: DataScope) => {
  if (scope?.priceBasis === 'jquants_minute') return 'JQ分足価格';
  if (scope?.priceBasis === 'archive_seg') return 'archive価格';
  return scope?.priceBasis ?? '価格基準未確認';
};

const sortStrategyCandidates = (a: StrategyCandidate, b: StrategyCandidate) =>
  CANDIDATE_CLASS_META[classifyCandidate(a)].order - CANDIDATE_CLASS_META[classifyCandidate(b)].order
  || DECISION_ORDER[a.decision] - DECISION_ORDER[b.decision]
  || a.weekdayIndex - b.weekdayIndex
  || a.marginLabel.localeCompare(b.marginLabel)
  || (BUCKET_ORDER[a.bucket] ?? 99) - (BUCKET_ORDER[b.bucket] ?? 99);

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

  const result: Record<string, string> = {};
  values.forEach(v => {
    if (positives.length >= 1 && v.value === positives[0].value) {
      result[v.key] = 'text-emerald-400';
    } else if (positives.length >= 2 && v.value === positives[1].value) {
      result[v.key] = 'text-emerald-500';
    } else if (negatives.length >= 1 && v.value === negatives[0].value) {
      result[v.key] = 'text-rose-400';
    } else if (negatives.length >= 2 && v.value === negatives[1].value) {
      result[v.key] = 'text-rose-500';
    } else {
      result[v.key] = 'text-foreground';
    }
  });

  return result;
};

const winrateClass = (rate: number | null) => {
  if (rate === null) return 'text-muted-foreground';
  return rate > 50 ? 'text-emerald-400' : rate < 50 ? 'text-rose-400' : 'text-foreground';
};

export default function AnalysisCustomPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI State
  const [segmentMode, setSegmentMode] = useState<SegmentMode>('4seg');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('amount');
  const [excludeExtreme, setExcludeExtreme] = useState(false);
  const [direction] = useState<Direction>('short');

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
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // prob_regime filters
  const [selectedBuckets, setSelectedBuckets] = useState<Set<string>>(new Set());
  const [bucketsAvailable, setBucketsAvailable] = useState(false);

  // Detail filters
  const MARGIN_TYPE_LABELS = ['制度信用', 'いちにち信用'];
  const [priceRangeFilters, setPriceRangeFilters] = useState<Set<string>>(new Set());
  const [marginTypeFilters, setMarginTypeFilters] = useState<Set<string>>(new Set(MARGIN_TYPE_LABELS));

  const isInitialLoad = useRef(true);
  const fetchData = useCallback(async () => {
    const isBucketOnlyChange = !isInitialLoad.current && data !== null;
    if (!isBucketOnlyChange) {
      setLoading(true);
    }
    setError(null);
    try {
      const params = new URLSearchParams({
        exclude_extreme: excludeExtreme.toString(),
        price_min: priceMin.toString(),
        price_max: priceMax.toString(),
        price_step: priceStep.toString(),
        direction,
      });
      if (selectedBuckets.size > 0) {
        params.set('buckets', Array.from(selectedBuckets).join(','));
      }
      const res = await fetch(`${API_BASE}/dev/analysis-custom/summary?${params}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const json = await res.json();
      setData(json);
      if (json.bucketInfo) {
        setBucketsAvailable(json.bucketInfo.available);
      }
      // 価格帯フィルターをAPIレスポンスから初期化
      if (isInitialLoad.current && json.priceRanges) {
        setPriceRangeFilters(new Set(json.priceRanges));
      }
      isInitialLoad.current = false;
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [excludeExtreme, priceMin, priceMax, priceStep, selectedBuckets, direction]);

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
        direction,
      });
      if (selectedBuckets.size > 0) {
        params.set('buckets', Array.from(selectedBuckets).join(','));
      }
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
  }, [excludeExtreme, priceMin, priceMax, priceStep, selectedBuckets, direction]);

  useEffect(() => {
    if (!loading && data) {
      fetchDetailData(detailView);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, detailView, excludeExtreme, priceMin, priceMax, priceStep, direction]);

  const togglePriceRange = (label: string) => {
    setPriceRangeFilters(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };
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
  const directionLabel = direction === 'short' ? 'SHORT' : 'LONG';
  const overallSegs = getSegmentsData(
    overall.segments11,
    overall.segments4,
    overall.pctSegments11,
    overall.pctSegments4
  );
  const segClasses = getSegmentClasses(overallSegs, timeSegments, displayMode);
  const strategyCandidates = data.strategyCandidates ?? [];
  const sortedStrategyCandidates = [...strategyCandidates].sort(sortStrategyCandidates);
  const strategyClassCounts = CANDIDATE_CLASS_ORDER.reduce((acc, key) => {
    acc[key] = strategyCandidates.filter(r => classifyCandidate(r) === key).length;
    return acc;
  }, {} as Record<CandidateClassKey, number>);
  const weekdayCandidateGroups = WEEKDAY_SLUGS.map((slug, idx) => {
    const rows = sortedStrategyCandidates.filter(r => r.weekdayIndex === idx);
    const activeRows = rows.filter(r => r.decision !== 'SKIP');
    return {
      slug,
      index: idx,
      weekday: weekdays[idx]?.weekday ?? `${idx + 1}`,
      rule: weekdays[idx]?.weekday_rule ?? null,
      rows,
      activeRows,
      primaryRows: activeRows.length > 0 ? activeRows : rows.slice(0, 2),
      classCounts: CANDIDATE_CLASS_ORDER.reduce((acc, key) => {
        acc[key] = rows.filter(r => classifyCandidate(r) === key).length;
        return acc;
      }, {} as Record<CandidateClassKey, number>),
    };
  });

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
            <h1 className="text-xl font-bold text-foreground">
              カスタム分析
              <span className={`ml-2 text-base ${direction === 'short' ? 'text-rose-400' : 'text-emerald-400'}`}>
                {directionLabel}
              </span>
            </h1>
            <p className="text-muted-foreground text-sm">
              {dateRange.from} ~ {dateRange.to} ({dateRange.tradingDays}営業日)
              {direction === 'short' && ' | 制度+いちにち残あり'}
              {direction === 'long' && ' | 制度+いちにち全部'}
              {excludeExtreme && <span className="ml-2 text-amber-400">(異常日除外中)</span>}
            </p>
            <div className="mt-1 flex flex-wrap gap-2 text-xs">
              <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-cyan-300">
                {dataSourceLabel(data.dataScope)}
              </span>
              <span className="rounded border border-border/40 bg-muted/20 px-2 py-0.5 text-muted-foreground">
                {priceBasisLabel(data.dataScope)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs text-rose-300">
              SHORT運用
            </span>
            <span className="text-border">|</span>
            {/* 異常日除外トグル */}
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={excludeExtreme}
                onChange={(e) => setExcludeExtreme(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-amber-500/50 bg-muted/30 text-amber-500 focus:ring-amber-500/50"
              />
              <span className="text-xs text-amber-400 whitespace-nowrap">異常日除外</span>
            </label>
            {/* prob_regime フィルター */}
            {bucketsAvailable && (
              <>
                <span className="text-border">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Regime:</span>
                  {BUCKET_LABELS.map((b) => (
                    <label key={b} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedBuckets.has(b)}
                        onChange={() => {
                          setSelectedBuckets(prev => {
                            const next = new Set(prev);
                            if (next.has(b)) next.delete(b);
                            else next.add(b);
                            return next;
                          });
                        }}
                        className="w-3.5 h-3.5 rounded border-cyan-500/50 bg-muted/30 text-cyan-500 focus:ring-cyan-500/50"
                      />
                      <span className={`text-xs ${selectedBuckets.has(b) ? BUCKET_COLORS[b] : 'text-muted-foreground'}`}>{b}</span>
                    </label>
                  ))}
                  {selectedBuckets.size > 0 && (
                    <button
                      onClick={() => setSelectedBuckets(new Set())}
                      className="text-xs text-muted-foreground hover:text-foreground ml-1"
                    >
                      x
                    </button>
                  )}
                </div>
              </>
            )}
            <span className="text-border">|</span>
            <DevNavLinks />
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

        {/* Strategy Candidates */}
        {strategyCandidates.length > 0 && (
          <section className="mb-6 rounded-xl border border-border/50 bg-card/80 p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">戦略候補一覧</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  曜日を主軸に、信用区分とprob区間で実行候補を絞る。詳細は曜日リンクから出口・DD・CVaRを確認。
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {CANDIDATE_CLASS_ORDER.map(key => (
                  <span key={key} className={`rounded border px-2 py-1 ${CANDIDATE_CLASS_META[key].tone}`}>
                    {CANDIDATE_CLASS_META[key].label} {strategyClassCounts[key]}
                  </span>
                ))}
              </div>
            </div>

            <details className="mb-4 rounded-lg border border-border/40 bg-background/30">
              <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted/20">
                分類定義を表示
              </summary>
              <div className="border-t border-border/30 px-3 py-3">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                  {CANDIDATE_CLASS_ORDER.map(key => (
                    <div key={key} className={`rounded-md border px-3 py-2 ${CANDIDATE_CLASS_META[key].tone}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-bold">{CANDIDATE_CLASS_META[key].label}</div>
                        <div className="text-xs tabular-nums">件数 {strategyClassCounts[key]}</div>
                      </div>
                      <div className="mt-1 text-xs leading-5 text-muted-foreground">
                        {CANDIDATE_CLASS_DESCRIPTIONS[key]}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs leading-5 text-muted-foreground">
                  注: この上位画面の分類はPF・損益・出口時刻ベース。DD/CVaRは曜日詳細画面の出口ルールで確認する。
                </div>
              </div>
            </details>

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-3 mb-4">
              {weekdayCandidateGroups.map(group => (
                <div key={group.slug} className="rounded-lg border border-border/40 bg-background/35 p-3 min-h-[210px]">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <Link href={`/dev/analysis/${group.slug}`} className="text-base font-bold text-primary hover:underline">
                        {group.weekday.replace('曜日', '')}
                      </Link>
                      {group.rule && (
                        <div className="mt-1 text-[11px] text-muted-foreground leading-snug">
                          {group.rule.rule}
                        </div>
                      )}
                    </div>
                    <div className="text-right text-[11px] leading-5">
                      {CANDIDATE_CLASS_ORDER
                        .filter(key => group.classCounts[key] > 0 && key !== 'NO_EDGE' && key !== 'LOW_N')
                        .slice(0, 2)
                        .map(key => (
                          <div key={key} className={CANDIDATE_CLASS_META[key].tone.split(' ').find(c => c.startsWith('text-')) ?? 'text-muted-foreground'}>
                            {CANDIDATE_CLASS_META[key].shortLabel} {group.classCounts[key]}
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {group.primaryRows.map(row => {
                      const classKey = classifyCandidate(row);
                      const classMeta = CANDIDATE_CLASS_META[classKey];
                      return (
                        <Link
                          key={`${row.weekday}-${row.marginKey}-${row.bucket}`}
                          href={`/dev/analysis/${group.slug}`}
                          className={`block rounded-md border px-2.5 py-2 transition-colors hover:bg-muted/30 ${classMeta.tone}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="rounded border border-current/40 px-1.5 py-0.5 text-[10px] font-bold">
                              {classMeta.label}
                            </span>
                            <span className={`text-[11px] font-medium ${strategyBucketClass(row)}`}>
                              {strategyBucketLabel(row)}
                            </span>
                          </div>
                          <div className="mt-1 flex items-baseline justify-between gap-2">
                            <span className="text-sm text-foreground">{row.marginLabel}</span>
                            <span className={`text-lg font-bold tabular-nums ${pfClass(row.bestSegment?.pf ?? null)}`}>
                              PF {formatPF(row.bestSegment?.pf ?? null)}
                            </span>
                          </div>
                          <div className="mt-1 flex justify-between gap-2 text-[11px] text-muted-foreground">
                            <span>{row.bestSegment ? `${row.bestSegment.time} ${row.bestSegment.label}` : '-'}</span>
                            <span className="tabular-nums">{row.count}件</span>
                          </div>
                          <div className={`mt-1 text-right text-xs tabular-nums ${(row.bestSegment?.profit ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {row.bestSegment ? formatProfit(row.bestSegment.profit) : '-'}
                          </div>
                        </Link>
                      );
                    })}

                    {group.activeRows.length === 0 && (
                      <div className="rounded-md border border-border/30 bg-muted/10 px-2.5 py-3 text-xs text-muted-foreground">
                        採用候補なし。詳細側で例外条件だけ確認。
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto rounded-lg border border-border/30">
              <div className="flex items-center justify-between gap-3 border-b border-border/30 bg-muted/20 px-3 py-2">
                <div className="text-sm font-semibold text-foreground">詳細テーブル</div>
                <div className="text-xs text-muted-foreground">曜日リンクから深掘りへ移動</div>
              </div>
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-muted/30 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">分類</th>
                    <th className="text-left px-3 py-2 font-medium">粗判定</th>
                    <th className="text-left px-3 py-2 font-medium">曜日</th>
                    <th className="text-left px-3 py-2 font-medium">信用区分</th>
                    <th className="text-left px-3 py-2 font-medium">prob区間</th>
                    <th className="text-right px-3 py-2 font-medium">件数</th>
                    <th className="text-left px-3 py-2 font-medium">最適時間</th>
                    <th className="text-right px-3 py-2 font-medium">最適PF</th>
                    <th className="text-right px-3 py-2 font-medium">大引けPF</th>
                    <th className="text-right px-3 py-2 font-medium">PF差</th>
                    <th className="text-right px-3 py-2 font-medium">最適損益</th>
                    <th className="text-left px-3 py-2 font-medium">理由</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStrategyCandidates.map(row => {
                    const classKey = classifyCandidate(row);
                    const classMeta = CANDIDATE_CLASS_META[classKey];
                    return (
                      <tr key={`${row.weekday}-${row.marginKey}-${row.bucket}`} className="border-t border-border/20">
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded border text-xs font-bold ${classMeta.tone}`}>
                            {classMeta.label}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded border text-xs ${decisionClass(row.decision)}`}>
                            {DECISION_LABELS[row.decision]}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <Link href={`/dev/analysis/${WEEKDAY_SLUGS[row.weekdayIndex]}`} className="text-primary hover:underline">
                            {row.weekday.replace('曜日', '')}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-foreground">{row.marginLabel}</td>
                        <td className={`px-3 py-2 font-medium ${strategyBucketClass(row)}`}>{strategyBucketLabel(row)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-foreground">{row.count}</td>
                        <td className="px-3 py-2 text-foreground">
                          {row.bestSegment ? `${row.bestSegment.time} ${row.bestSegment.label}` : '-'}
                        </td>
                        <td className={`px-3 py-2 text-right tabular-nums ${pfClass(row.bestSegment?.pf ?? null)}`}>
                          {formatPF(row.bestSegment?.pf ?? null)}
                        </td>
                        <td className={`px-3 py-2 text-right tabular-nums ${pfClass(row.closeSegment?.pf ?? null)}`}>
                          {formatPF(row.closeSegment?.pf ?? null)}
                        </td>
                        <td className={`px-3 py-2 text-right tabular-nums ${(row.pfDelta ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {row.pfDelta !== null ? `${row.pfDelta >= 0 ? '+' : ''}${row.pfDelta.toFixed(2)}` : '-'}
                        </td>
                        <td className={`px-3 py-2 text-right tabular-nums ${(row.bestSegment?.profit ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {row.bestSegment ? formatProfit(row.bestSegment.profit) : '-'}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{row.reason}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Top Summary Cards */}
        <div className={`grid gap-3 mb-6 ${segmentMode === '4seg' ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6'}`}>
          {/* 総件数 */}
          <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-5 shadow-lg shadow-black/5 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="flex items-center mb-2">
                <span className="text-muted-foreground text-sm">総件数</span>
              </div>
              <div className="text-2xl font-bold text-right tabular-nums text-foreground">{overall.count}</div>
              <div className="text-muted-foreground text-xs text-right mt-1">
                制度{overall.seidoCount} / いちにち{overall.ichinichiCount}
              </div>
            </div>
          </div>

          {/* Segment Cards */}
          {timeSegments.map(seg => {
            const stats = overallSegs[seg.key];
            const value = displayMode === 'amount'
              ? (stats as SegmentStats)?.profit ?? 0
              : (stats as SegmentStatsPct)?.meanPct ?? 0;
            const winRate = stats?.winRate ?? null;
            const pf = stats?.pf ?? null;
            return (
              <div key={seg.key} className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-5 shadow-lg shadow-black/5 backdrop-blur-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
                <div className="relative">
                  <div className="flex items-center mb-2">
                    <span className="text-muted-foreground text-sm whitespace-nowrap">{seg.label}</span>
                    <span className={`ml-auto text-xs ${pfClass(pf)}`}>PF {formatPF(pf)}</span>
                  </div>
                  <div className={`text-2xl font-bold text-right tabular-nums whitespace-nowrap ${segClasses[seg.key]}`}>
                    {displayMode === 'amount' ? `${formatProfit(value)}円` : formatPct(value)}
                  </div>
                  <div className={`text-xs text-right mt-1 ${winrateClass(winRate)}`}>
                    勝率 {winRate !== null ? `${Math.round(winRate)}%` : '-'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Weekday Cards */}
        {weekdays.map((wd, idx) => {
          const seidoSegs = getSegmentsData(
            wd.seido.segments11,
            wd.seido.segments4,
            wd.seido.pctSegments11,
            wd.seido.pctSegments4
          );
          const ichiSegs = getSegmentsData(
            wd.ichinichi.segments11,
            wd.ichinichi.segments4,
            wd.ichinichi.pctSegments11,
            wd.ichinichi.pctSegments4
          );

          return (
            <div key={wd.weekday} className="mb-6">
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2 flex-wrap">
                <Link href={`/dev/analysis/${['mon','tue','wed','thu','fri'][idx]}`} className="hover:text-primary transition-colors">
                  {wd.weekday} →
                </Link>
                {wd.weekday_rule && (
                  <>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      wd.weekday_rule.direction === "long"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : wd.weekday_rule.direction === "excluded"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-rose-500/20 text-rose-400"
                    }`}>
                      {wd.weekday_rule.rule}
                    </span>
                    <span className="text-xs text-muted-foreground">PF {wd.weekday_rule.pf.toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground hidden lg:inline">— {wd.weekday_rule.note}</span>
                  </>
                )}
              </h2>
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
                            const pf = stats?.pf ?? null;
                            return (
                              <div key={seg.key} className="text-right min-w-[70px]">
                                <div className="text-muted-foreground text-sm">{seg.label}</div>
                                <div className={`text-xl font-bold tabular-nums ${classes[seg.key]}`}>
                                  {displayMode === 'amount' ? formatProfit(value) : formatPct(value)}
                                </div>
                                <div className={`text-xs ${pfClass(pf)}`}>PF {formatPF(pf)}</div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                    {/* Price range table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-base min-w-[900px]">
                        <thead>
                          <tr className="text-muted-foreground text-base border-b border-border/30">
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
                            const prSegs = getSegmentsData(pr.segments11, pr.segments4, pr.pctSegments11, pr.pctSegments4);
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
                                  const winRate = stats?.winRate ?? null;
                                  const pf = stats?.pf ?? null;
                                  return (
                                    <td key={seg.key} className="text-right px-2 py-2.5">
                                      <div className={`tabular-nums whitespace-nowrap ${classes[seg.key]}`}>
                                        {displayMode === 'amount' ? formatProfit(value) : formatPct(value)}
                                      </div>
                                      <div className="flex justify-end gap-2">
                                        <span className={`text-sm ${winrateClass(winRate)}`}>
                                          {winRate !== null ? `${Math.round(winRate)}%` : '-'}
                                        </span>
                                        <span className={`text-sm ${pfClass(pf)}`}>
                                          {formatPF(pf)}
                                        </span>
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
                      <span className="text-muted-foreground text-base">{wd.ichinichi.count}件</span>
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
                            const pf = stats?.pf ?? null;
                            return (
                              <div key={seg.key} className="text-right min-w-[70px]">
                                <div className="text-muted-foreground text-sm">{seg.label}</div>
                                <div className={`text-xl font-bold tabular-nums ${classes[seg.key]}`}>
                                  {displayMode === 'amount' ? formatProfit(value) : formatPct(value)}
                                </div>
                                <div className={`text-xs ${pfClass(pf)}`}>PF {formatPF(pf)}</div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                    {/* Price range table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-base min-w-[900px]">
                        <thead>
                          <tr className="text-muted-foreground text-base border-b border-border/30">
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
                          {wd.ichinichi.priceRanges.map(pr => {
                            const prSegs = getSegmentsData(pr.segments11, pr.segments4, pr.pctSegments11, pr.pctSegments4);
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
                                  const winRate = stats?.winRate ?? null;
                                  const pf = stats?.pf ?? null;
                                  return (
                                    <td key={seg.key} className="text-right px-2 py-2.5">
                                      <div className={`tabular-nums whitespace-nowrap ${classes[seg.key]}`}>
                                        {displayMode === 'amount' ? formatProfit(value) : formatPct(value)}
                                      </div>
                                      <div className="flex justify-end gap-2">
                                        <span className={`text-sm ${winrateClass(winRate)}`}>
                                          {winRate !== null ? `${Math.round(winRate)}%` : '-'}
                                        </span>
                                        <span className={`text-sm ${pfClass(pf)}`}>
                                          {formatPF(pf)}
                                        </span>
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
            {/* Price Range Filter */}
            <div className="flex items-center gap-2 border-l border-border/40 pl-4">
              <span className="text-xs md:text-sm text-muted-foreground">価格帯:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => data?.priceRanges && setPriceRangeFilters(new Set(data.priceRanges))}
                  className="px-1.5 py-0.5 text-[9px] md:text-[10px] rounded border bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50"
                >
                  全
                </button>
                <button
                  onClick={() => setPriceRangeFilters(new Set())}
                  className="px-1.5 py-0.5 text-[9px] md:text-[10px] rounded border bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50"
                >
                  解除
                </button>
              </div>
              <div className="flex gap-1 md:gap-1.5 flex-wrap">
                {data.priceRanges.map(label => (
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
                const filteredStocks = group.stocks.filter(s => {
                  const passPriceRange = priceRangeFilters.has(s.priceRange);
                  const passMarginType = marginTypeFilters.has(s.marginType);
                  return passPriceRange && passMarginType;
                });
                const grpCount = filteredStocks.length;

                const displaySegs = segmentMode === '11seg' ? data?.timeSegments11 : data?.timeSegments4;
                const grpSegTotals: Record<string, number> = {};
                if (displaySegs) {
                  displaySegs.forEach(seg => {
                    grpSegTotals[seg.key] = filteredStocks.reduce((sum, s) => sum + (s.segments[seg.key] ?? 0), 0);
                  });
                }

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
                            <th className="text-right py-2.5 font-medium whitespace-nowrap">prob</th>
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
                            const openColor = s.buyPrice !== null && s.prevClose !== null
                              ? s.buyPrice > s.prevClose ? 'text-rose-400' : s.buyPrice < s.prevClose ? 'text-emerald-400' : 'text-foreground'
                              : 'text-foreground';

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
                                <td className="py-2.5 text-right text-sm whitespace-nowrap">
                                  {s.mlProb !== null ? (
                                    <span className={BUCKET_COLORS[s.bucket ?? ''] || 'text-foreground'}>
                                      {s.mlProb.toFixed(2)}
                                    </span>
                                  ) : '-'}
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
