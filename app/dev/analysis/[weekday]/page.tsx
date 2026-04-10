'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Cell,
} from 'recharts';
import { DevNavLinks } from '../../../../components/dev';

// ===== Types =====
interface TimeSegment {
  key: string;
  label: string;
  time: string;
}

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
  timeSegments: TimeSegment[];
  results: DetailGroup[];
}

interface SegmentStats { profit: number; winRate: number; count: number; mean: number; }
interface SegmentStatsPct { pctReturn: number; winRate: number; count: number; meanPct: number; }
interface PriceRangeData {
  label: string; count: number;
  segments11: Record<string, SegmentStats>; segments4: Record<string, SegmentStats>;
  pctSegments11: Record<string, SegmentStatsPct>; pctSegments4: Record<string, SegmentStatsPct>;
}
interface SeidoData {
  type: string; count: number;
  segments11: Record<string, SegmentStats>; segments4: Record<string, SegmentStats>;
  pctSegments11: Record<string, SegmentStatsPct>; pctSegments4: Record<string, SegmentStatsPct>;
  priceRanges: PriceRangeData[];
}
interface IchinichiData {
  type: string; count: number;
  segments11: Record<string, SegmentStats>;
  segments4: Record<string, SegmentStats>;
  pctSegments11: Record<string, SegmentStatsPct>;
  pctSegments4: Record<string, SegmentStatsPct>;
  priceRanges: PriceRangeData[];
}
interface WeekdayData { weekday: string; seido: SeidoData; ichinichi: IchinichiData; }
interface SummaryResponse {
  timeSegments11: TimeSegment[]; timeSegments4: TimeSegment[];
  weekdays: WeekdayData[];
  bucketInfo?: { available: boolean; buckets: string[]; thresholds: { short: number; long: number } };
}

// ===== Constants =====
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const WEEKDAYS = ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日'] as const;
const WEEKDAY_SHORT = ['月', '火', '水', '木', '金'] as const;
const WEEKDAY_SLUG_MAP: Record<string, number> = {
  mon: 0, tue: 1, wed: 2, thu: 3, fri: 4,
  monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4,
};
const PRICE_RANGE_LABELS = ['~1,000円', '1,000~3,000円', '3,000~5,000円', '5,000~10,000円', '10,000円~'];
const MARGIN_TYPES = ['制度信用', 'いちにち信用'];
const BUCKET_SECTIONS = ['全体', 'SHORT', 'DISC', 'LONG'] as const;

type DisplayMode = 'amount' | 'pct';
type SegmentMode = '4seg' | '11seg';
type FilterType = 'all' | 'ex0';

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

function fmt(v: number): string {
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(1)}万`;
  return v.toLocaleString();
}

const formatProfit = (val: number) => {
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val.toLocaleString()}`;
};

const formatPctLabel = (val: number) => {
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}%`;
};

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
    if (positives.length >= 1 && v.value === positives[0].value) result[v.key] = 'text-emerald-400';
    else if (positives.length >= 2 && v.value === positives[1].value) result[v.key] = 'text-emerald-500';
    else if (negatives.length >= 1 && v.value === negatives[0].value) result[v.key] = 'text-rose-400';
    else if (negatives.length >= 2 && v.value === negatives[1].value) result[v.key] = 'text-rose-500';
    else result[v.key] = 'text-foreground';
  });
  return result;
};

const winrateClass = (rate: number) =>
  rate > 50 ? 'text-emerald-400' : rate < 50 ? 'text-rose-400' : 'text-foreground';

// filteredStocksからサマリーテーブル用の集計を行う
function aggregateStocks(
  stocks: DetailStock[],
  timeSegments: TimeSegment[],
) {
  const buildMarginGroup = (marginType: string, filterEx0 = false) => {
    let filtered = stocks.filter(s => s.marginType === marginType);
    if (filterEx0) filtered = filtered.filter(s => (s.shares ?? 0) > 0);
    const count = filtered.length;

    const computeSegStats = (items: DetailStock[]): Record<string, SegmentStats> => {
      const result: Record<string, SegmentStats> = {};
      for (const seg of timeSegments) {
        const vals = items.map(s => s.segments[seg.key]).filter((v): v is number => v !== null);
        const profit = vals.reduce((a, b) => a + b, 0);
        const wins = vals.filter(v => v > 0).length;
        result[seg.key] = {
          profit,
          winRate: vals.length > 0 ? (wins / vals.length) * 100 : 0,
          count: vals.length,
          mean: vals.length > 0 ? profit / vals.length : 0,
        };
      }
      return result;
    };

    const computeSegStatsPct = (items: DetailStock[]): Record<string, SegmentStatsPct> => {
      const result: Record<string, SegmentStatsPct> = {};
      for (const seg of timeSegments) {
        const vals = items
          .filter(s => s.segments[seg.key] !== null && s.buyPrice && s.buyPrice > 0)
          .map(s => ((s.segments[seg.key]! / (s.buyPrice! * 100)) * 100));
        const pctReturn = vals.reduce((a, b) => a + b, 0);
        const wins = vals.filter(v => v > 0).length;
        result[seg.key] = {
          pctReturn,
          winRate: vals.length > 0 ? (wins / vals.length) * 100 : 0,
          count: vals.length,
          meanPct: vals.length > 0 ? pctReturn / vals.length : 0,
        };
      }
      return result;
    };

    const segments = computeSegStats(filtered);
    const pctSegments = computeSegStatsPct(filtered);

    // 価格帯別
    const priceRanges = PRICE_RANGE_LABELS.map(pr => {
      const prItems = filtered.filter(s => s.priceRange === pr);
      return {
        label: pr,
        count: prItems.length,
        segments: computeSegStats(prItems),
        pctSegments: computeSegStatsPct(prItems),
      };
    }).filter(pr => pr.count > 0);

    return { count, segments, pctSegments, priceRanges };
  };

  return {
    seido: buildMarginGroup('制度信用'),
    ichinichiAll: buildMarginGroup('いちにち信用', false),
    ichinichiEx0: buildMarginGroup('いちにち信用', true),
  };
}

// ===== Component =====
export default function WeekdayAnalysisPage() {
  const params = useParams();
  const slug = (params.weekday as string || 'mon').toLowerCase();
  const dayIndex = WEEKDAY_SLUG_MAP[slug] ?? 0;

  const selectedDay = dayIndex;
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [excludeExtreme, setExcludeExtreme] = useState(false);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<Set<string>>(new Set(PRICE_RANGE_LABELS));
  const [selectedMarginTypes, setSelectedMarginTypes] = useState<Set<string>>(new Set(MARGIN_TYPES));
  const [displayMode, setDisplayMode] = useState<DisplayMode>('amount');
  const [segmentMode] = useState<SegmentMode>('11seg');
  const [summaryData, setSummaryData] = useState<SummaryResponse | null>(null);
  const [ichFilter, setIchFilter] = useState<FilterType>('all');
  const [ichChartFilter, setIchChartFilter] = useState<FilterType>('all');

  // 拡張パネルデータ
  const [panelsData, setPanelsData] = useState<Record<string, unknown> | null>(null);
  const [futuresGapData, setFuturesGapData] = useState<{ rows: { label: string; SHORT: Record<string, unknown>; DISC: Record<string, unknown>; LONG: Record<string, unknown> }[] } | null>(null);
  const [nikkeiChangeData, setNikkeiChangeData] = useState<{ rows: { label: string; SHORT: Record<string, unknown>; DISC: Record<string, unknown>; LONG: Record<string, unknown> }[] } | null>(null);

  // アコーディオン state
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['全体']));
  const toggleSection = (key: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };
  const allOpen = openSections.size === BUCKET_SECTIONS.length;
  const toggleAll = () => {
    if (allOpen) {
      setOpenSections(new Set());
    } else {
      setOpenSections(new Set(BUCKET_SECTIONS));
    }
  };

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const baseParams = `exclude_extreme=${excludeExtreme}&price_min=0&price_max=999999&price_step=0`;

      const [detailRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE}/dev/analysis-custom/details?view=weekday&${baseParams}`),
        fetch(`${API_BASE}/dev/analysis-custom/summary?${baseParams}`),
      ]);

      if (!detailRes.ok) throw new Error(`API error: ${detailRes.status}`);
      const detailJson: DetailResponse = await detailRes.json();
      setData(detailJson);

      if (summaryRes.ok) {
        const summaryJson: SummaryResponse = await summaryRes.json();
        setSummaryData(summaryJson);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [excludeExtreme]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 拡張パネル取得
  useEffect(() => {
    const dir = 'short';
    Promise.all([
      fetch(`${API_BASE}/dev/analysis-custom/weekday-panels?weekday=${dayIndex}&direction=${dir}`).then(r => r.ok ? r.json() : null),
      fetch(`${API_BASE}/dev/analysis-custom/futures-gap-pf?weekday=${dayIndex}&direction=${dir}`).then(r => r.ok ? r.json() : null),
      fetch(`${API_BASE}/dev/analysis-custom/nikkei-change-pf?weekday=${dayIndex}&direction=${dir}`).then(r => r.ok ? r.json() : null),
    ]).then(([panels, futures, nikkei]) => {
      if (panels) setPanelsData(panels);
      if (futures) setFuturesGapData(futures);
      if (nikkei) setNikkeiChangeData(nikkei);
    }).catch(() => {});
  }, [dayIndex]);

  // Get current weekday data
  const weekdayGroup = useMemo(() => {
    if (!data) return null;
    return data.results.find(r => r.key === WEEKDAYS[selectedDay]) || null;
  }, [data, selectedDay]);

  // Filter stocks (no grade filter — grade is handled per section)
  const filteredStocks = useMemo(() => {
    if (!weekdayGroup) return [];
    return weekdayGroup.stocks.filter(s => {
      if (!selectedPriceRanges.has(s.priceRange)) return false;
      if (!selectedMarginTypes.has(s.marginType)) return false;
      return true;
    });
  }, [weekdayGroup, selectedPriceRanges, selectedMarginTypes]);

  const segments = data?.timeSegments || [];
  const timeSegments = useMemo(() => {
    if (!summaryData) return segments;
    return segmentMode === '11seg' ? summaryData.timeSegments11 : summaryData.timeSegments4;
  }, [summaryData, segmentMode, segments]);

  // Bucket別に銘柄を分類
  const stocksByBucket = useMemo(() => {
    const result: Record<string, DetailStock[]> = { '全体': filteredStocks };
    for (const b of ['SHORT', 'DISC', 'LONG']) {
      result[b] = filteredStocks.filter(s => s.bucket === b);
    }
    return result;
  }, [filteredStocks]);

  // Bucket別の集計
  const aggregationByBucket = useMemo(() => {
    const result: Record<string, ReturnType<typeof aggregateStocks>> = {};
    for (const key of BUCKET_SECTIONS) {
      result[key] = aggregateStocks(stocksByBucket[key] || [], timeSegments);
    }
    return result;
  }, [stocksByBucket, timeSegments]);

  // ===== 判断サマリー自動抽出 =====
  const tradeSummary = useMemo(() => {
    if (!panelsData && !futuresGapData && !nikkeiChangeData) return null;

    const summary: { category: string; icon: string; label: string; value: string; detail: string; color: string }[] = [];

    // ENTRY: 先物Gap帯で最もPFが高い帯
    if (futuresGapData?.rows) {
      const bestGap = futuresGapData.rows
        .map(r => ({ label: r.label, pf: (r.SHORT as { pf: number | null; n: number })?.pf, n: (r.SHORT as { n: number })?.n ?? 0 }))
        .filter(r => r.pf !== null && r.n >= 10)
        .sort((a, b) => (b.pf ?? 0) - (a.pf ?? 0))[0];
      if (bestGap) {
        summary.push({
          category: 'ENTRY', icon: '▶', label: '先物Gap最適帯',
          value: `${bestGap.label} → PF ${bestGap.pf!.toFixed(2)}`,
          detail: `(n=${bestGap.n})`,
          color: bestGap.pf! >= 1.5 ? 'emerald' : bestGap.pf! >= 1 ? 'amber' : 'rose',
        });
      }
    }

    // ENTRY: N225変化率で最もPFが高い帯
    if (nikkeiChangeData?.rows) {
      const bestN225 = nikkeiChangeData.rows
        .map(r => ({ label: r.label, pf: (r.SHORT as { pf: number | null; n: number })?.pf, n: (r.SHORT as { n: number })?.n ?? 0 }))
        .filter(r => r.pf !== null && r.n >= 10)
        .sort((a, b) => (b.pf ?? 0) - (a.pf ?? 0))[0];
      if (bestN225) {
        summary.push({
          category: 'ENTRY', icon: '▶', label: 'N225最適帯',
          value: `${bestN225.label} → PF ${bestN225.pf!.toFixed(2)}`,
          detail: `(n=${bestN225.n})`,
          color: bestN225.pf! >= 1.5 ? 'emerald' : bestN225.pf! >= 1 ? 'amber' : 'rose',
        });
      }
    }

    // TIMING: Phase遷移の最適/最悪状態
    if (panelsData?.phase_matrix) {
      const phases = (panelsData.phase_matrix as { phase1_label: string; n: number; phase2_avg_pct: number | null; phase2_win_rate: number | null; phase2_pf: number | null }[])
        .filter(p => p.n >= 5 && p.phase2_pf !== null);
      if (phases.length > 0) {
        const best = phases.sort((a, b) => (b.phase2_pf ?? 0) - (a.phase2_pf ?? 0))[0];
        summary.push({
          category: 'TIMING', icon: '⏱', label: '後場有利パターン',
          value: `前場${best.phase1_label} → 後場PF ${best.phase2_pf!.toFixed(2)}`,
          detail: `勝率${best.phase2_win_rate?.toFixed(0)}% (n=${best.n})`,
          color: best.phase2_pf! >= 1.5 ? 'emerald' : best.phase2_pf! >= 1 ? 'amber' : 'rose',
        });
        const worst = phases.sort((a, b) => (a.phase2_pf ?? 0) - (b.phase2_pf ?? 0))[0];
        if (worst.phase1_label !== best.phase1_label) {
          summary.push({
            category: 'TIMING', icon: '⏱', label: '後場不利パターン',
            value: `前場${worst.phase1_label} → 後場PF ${worst.phase2_pf!.toFixed(2)}`,
            detail: `勝率${worst.phase2_win_rate?.toFixed(0)}% (n=${worst.n})`,
            color: 'rose',
          });
        }
      }
    }

    // RISK: 損切ライン + 最大DD中央値
    if (panelsData?.stop_loss) {
      const stops = (panelsData.stop_loss as { trigger: string; n: number; pf: number | null; avg: number | null; win_rate: number | null }[])
        .filter(s => s.pf !== null && s.n >= 10);
      if (stops.length > 0) {
        const best = stops.sort((a, b) => (b.pf ?? 0) - (a.pf ?? 0))[0];
        const allBelowOne = stops.every(s => (s.pf ?? 0) < 1);
        summary.push({
          category: 'RISK', icon: '🛡',
          label: allBelowOne ? '損切で回復しない構造' : '推奨損切ライン',
          value: allBelowOne
            ? `全トリガーPF<1 (最良: ${best.trigger} PF ${best.pf!.toFixed(2)})`
            : `${best.trigger} (PF ${best.pf!.toFixed(2)})`,
          detail: allBelowOne
            ? '前場マイナスなら即撤退が最善'
            : `勝率${best.win_rate?.toFixed(0)}%, 平均${best.avg !== null ? formatProfit(best.avg) : '-'}`,
          color: best.pf! >= 1.5 ? 'emerald' : best.pf! >= 1 ? 'amber' : 'rose',
        });
      }
    }
    if (panelsData?.excursion) {
      const ddKey = Object.keys(panelsData.excursion as Record<string, unknown>).find(k => k.includes('daily_max_drawdown'));
      if (ddKey) {
        const dd = (panelsData.excursion as Record<string, { label: string; p50: number | null; p90: number | null }>)[ddKey];
        if (dd?.p50 !== null) {
          summary.push({
            category: 'RISK', icon: '🛡', label: '最大DD中央値',
            value: `${dd.p50 >= 0 ? '+' : ''}${dd.p50.toFixed(2)}%`,
            detail: `P90: ${dd.p90 !== null ? `${dd.p90 >= 0 ? '+' : ''}${dd.p90.toFixed(2)}%` : '-'}`,
            color: Math.abs(dd.p50) <= 2 ? 'amber' : 'rose',
          });
        }
      }
    }

    // EXIT: 利確タイミング + 吐き出し率
    if (panelsData?.hold_vs_exit) {
      const hve = panelsData.hold_vs_exit as Record<string, { label?: string; pf?: number | null; avg?: number | null; win_rate?: number | null; n?: number }>;
      const timings = Object.entries(hve)
        .filter(([k, v]) => k !== 'giveback_pct' && v.pf !== null && (v.n ?? 0) >= 10)
        .map(([, v]) => v)
        .sort((a, b) => (b.pf ?? 0) - (a.pf ?? 0));
      if (timings.length > 0) {
        const best = timings[0];
        const allBelowOne = timings.every(t => (t.pf ?? 0) < 1);
        summary.push({
          category: 'EXIT', icon: '🚪',
          label: allBelowOne ? '全タイミングPF<1' : '最適利確',
          value: allBelowOne
            ? `最良でも ${best.label} PF ${best.pf!.toFixed(2)}`
            : `${best.label} (PF ${best.pf!.toFixed(2)})`,
          detail: allBelowOne
            ? 'エントリー条件を絞らないと全体では負ける'
            : `平均${best.avg !== null ? formatProfit(best.avg!) : '-'}`,
          color: best.pf! >= 1.5 ? 'emerald' : best.pf! >= 1 ? 'amber' : 'rose',
        });
      }
      if (hve.giveback_pct !== undefined) {
        const gb = hve.giveback_pct as unknown as number;
        summary.push({
          category: 'EXIT', icon: '🚪', label: '吐き出し率',
          value: `${gb.toFixed(1)}%`,
          detail: '最大含み益→引けまでに失う割合',
          color: gb <= 30 ? 'emerald' : gb <= 50 ? 'amber' : 'rose',
        });
      }
    }

    return summary.length > 0 ? summary : null;
  }, [panelsData, futuresGapData, nikkeiChangeData]);

  // ===== チャート用グレード切替 =====
  const [chartBucket, setChartGrade] = useState<string>('全体');
  const chartStocks = useMemo(() => stocksByBucket[chartBucket] || [], [stocksByBucket, chartBucket]);

  // ===== Pareto data =====
  const [paretoSegIdx, setParetoSegIdx] = useState(4);
  const paretoData = useMemo(() => {
    const segKey = segments[paretoSegIdx]?.key;
    if (!segKey) return [];

    const items = chartStocks
      .map(s => {
        const rawPnl = s.segments[segKey] ?? 0;
        const pnl = displayMode === 'pct' && s.buyPrice && s.buyPrice > 0
          ? (rawPnl / (s.buyPrice * 100)) * 100
          : rawPnl;
        return { ticker: s.ticker, name: s.stockName, date: s.date, pnl };
      })
      .sort((a, b) => b.pnl - a.pnl);

    const totalPositive = items.filter(i => i.pnl > 0).reduce((a, i) => a + i.pnl, 0);
    let cumulative = 0;
    return items.map((item, idx) => {
      cumulative += item.pnl;
      return {
        ...item,
        rank: idx + 1,
        cumPct: totalPositive > 0 ? (cumulative / totalPositive) * 100 : 0,
      };
    });
  }, [chartStocks, segments, paretoSegIdx, displayMode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-muted-foreground">データ読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-rose-400">エラー: {error}</div>
      </div>
    );
  }

  const stockCount = filteredStocks.length;

  // ===== サマリーテーブル描画関数 =====
  const renderBucketSection = (bucketKey: string) => {
    const agg = aggregationByBucket[bucketKey];
    if (!agg) return null;
    const stocks = stocksByBucket[bucketKey] || [];
    if (stocks.length === 0) return null;

    const ichData = ichFilter === 'ex0' ? agg.ichinichiEx0 : agg.ichinichiAll;

    const getSegs = (segs: Record<string, SegmentStats>, pctSegs: Record<string, SegmentStatsPct>) =>
      displayMode === 'amount' ? segs : pctSegs;

    const seidoSegs = getSegs(agg.seido.segments, agg.seido.pctSegments);
    const ichiSegs = getSegs(ichData.segments, ichData.pctSegments);

    const renderSummaryRow = (segs: Record<string, SegmentStats | SegmentStatsPct>) => {
      const classes = getSegmentClasses(segs, timeSegments, displayMode);
      return (
        <div className="overflow-x-auto mb-3 pb-3 border-b border-border/30">
          <div className="flex justify-end gap-5 min-w-[900px]">
            {timeSegments.map(seg => {
              const stats = segs[seg.key];
              const value = displayMode === 'amount'
                ? (stats as SegmentStats)?.profit ?? 0
                : (stats as SegmentStatsPct)?.meanPct ?? 0;
              return (
                <div key={seg.key} className="text-right min-w-[70px]">
                  <div className="text-muted-foreground text-sm">{seg.label}</div>
                  <div className={`text-xl font-bold tabular-nums ${classes[seg.key]}`}>
                    {displayMode === 'amount' ? formatProfit(value) : formatPctLabel(value)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    const renderPriceTable = (priceRanges: { label: string; count: number; segments: Record<string, SegmentStats>; pctSegments: Record<string, SegmentStatsPct> }[]) => (
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="text-muted-foreground text-sm border-b border-border/30">
              <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">価格帯</th>
              <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">件</th>
              {timeSegments.map(seg => (
                <th key={seg.key} className="text-right px-2 py-2.5 font-medium whitespace-nowrap">{seg.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {priceRanges.map(pr => {
              const prSegs = getSegs(pr.segments, pr.pctSegments);
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
                    const winRate = (stats as SegmentStats)?.winRate ?? (stats as SegmentStatsPct)?.winRate ?? 0;
                    return (
                      <td key={seg.key} className="text-right px-2 py-2.5">
                        <div className={`tabular-nums whitespace-nowrap ${classes[seg.key]}`}>
                          {displayMode === 'amount' ? formatProfit(value) : formatPctLabel(value)}
                        </div>
                        <div className={`text-xs ${winrateClass(winRate)}`}>{Math.round(winRate)}%</div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );

    const isOpen = openSections.has(bucketKey);

    return (
      <div key={bucketKey} className="mb-3">
        {/* アコーディオンヘッダー */}
        <button
          onClick={() => toggleSection(bucketKey)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border/40 bg-card/80 hover:bg-card transition-colors"
        >
          <span className={`text-xs transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
          <span className="font-semibold text-foreground">{bucketKey}</span>
          <span className="text-sm text-muted-foreground">{stocks.length}件</span>
          {agg.seido.count > 0 && (
            <span className="text-xs text-muted-foreground">制度{agg.seido.count}</span>
          )}
          {agg.ichinichiAll.count > 0 && (
            <span className="text-xs text-muted-foreground">いちにち{agg.ichinichiAll.count}</span>
          )}
        </button>

        {isOpen && (
          <div className="mt-2 space-y-4">
            {/* 制度信用 */}
            {agg.seido.count > 0 && (
              <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-semibold text-lg text-foreground">制度信用</span>
                    <span className="text-muted-foreground text-base">{agg.seido.count}件</span>
                  </div>
                  {renderSummaryRow(seidoSegs)}
                  {renderPriceTable(agg.seido.priceRanges)}
                </div>
              </div>
            )}

            {/* いちにち信用 */}
            {agg.ichinichiAll.count > 0 && (
              <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-semibold text-lg text-foreground">いちにち信用</span>
                    <span className="text-muted-foreground text-base">{ichData.count}件</span>
                    <div className="flex gap-1 ml-auto">
                      <button
                        onClick={() => setIchFilter('all')}
                        className={`px-2.5 py-1 text-sm rounded border transition-colors ${
                          ichFilter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
                        }`}
                      >全数</button>
                      <button
                        onClick={() => setIchFilter('ex0')}
                        className={`px-2.5 py-1 text-sm rounded border transition-colors ${
                          ichFilter === 'ex0' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
                        }`}
                      >除0株</button>
                    </div>
                  </div>
                  {renderSummaryRow(ichiSegs)}
                  {renderPriceTable(ichData.priceRanges)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 max-w-[1600px] mx-auto">
      {/* Header */}
      <header className="mb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold">
              曜日別深掘り分析
              <span className="ml-2 text-2xl text-primary">{WEEKDAY_SHORT[selectedDay]}曜日</span>
              <span className="text-sm text-muted-foreground ml-3">{stockCount}銘柄</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* 曜日タブ */}
            {(['mon', 'tue', 'wed', 'thu', 'fri'] as const).map((s, i) => (
              <Link
                key={s}
                href={`/dev/analysis/${s}`}
                className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                  selectedDay === i
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
                }`}
              >
                {WEEKDAY_SHORT[i]}
              </Link>
            ))}
            <span className="text-border">|</span>
            {/* 表示切替 */}
            <button
              onClick={() => setDisplayMode(displayMode === 'amount' ? 'pct' : 'amount')}
              className="px-2 py-1 text-xs rounded border border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted/50"
            >
              {displayMode === 'amount' ? '実額' : '%'}
            </button>
            {/* 異常日除外 */}
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={excludeExtreme}
                onChange={(e) => setExcludeExtreme(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-amber-500/50 bg-muted/30 text-amber-500 focus:ring-amber-500/50"
              />
              <span className="text-xs text-amber-400">異常日除外</span>
            </label>
            <span className="text-border">|</span>
            <Link href="/dev/analysis" className="text-xs text-muted-foreground hover:text-foreground">
              ← Analysis
            </Link>
            <DevNavLinks className="ml-2" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {/* 信用区分 */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">信用:</span>
            {MARGIN_TYPES.map(m => (
              <label key={m} className="flex items-center gap-0.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedMarginTypes.has(m)}
                  onChange={() => {
                    setSelectedMarginTypes(prev => {
                      const next = new Set(prev);
                      next.has(m) ? next.delete(m) : next.add(m);
                      return next;
                    });
                  }}
                  className="w-3 h-3 rounded border-purple-500/50 bg-muted/30 text-purple-500"
                />
                <span className={`text-xs ${selectedMarginTypes.has(m) ? 'text-purple-400' : 'text-muted-foreground'}`}>
                  {m === '制度信用' ? '制度' : 'いちにち'}
                </span>
              </label>
            ))}
          </div>
          <span className="text-border">|</span>
          {/* 価格帯 */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">価格帯:</span>
            {PRICE_RANGE_LABELS.map(p => (
              <label key={p} className="flex items-center gap-0.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedPriceRanges.has(p)}
                  onChange={() => {
                    setSelectedPriceRanges(prev => {
                      const next = new Set(prev);
                      next.has(p) ? next.delete(p) : next.add(p);
                      return next;
                    });
                  }}
                  className="w-3 h-3 rounded border-emerald-500/50 bg-muted/30 text-emerald-500"
                />
                <span className={`text-xs ${selectedPriceRanges.has(p) ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                  {p.replace('円', '').replace('~', '-')}
                </span>
              </label>
            ))}
          </div>
        </div>
      </header>

      {/* ===== 判断サマリー ===== */}
      {tradeSummary && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-foreground border-b border-border/30 pb-2 mb-4">
            判断サマリー — {WEEKDAY_SHORT[selectedDay]}曜日
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(['ENTRY', 'TIMING', 'RISK', 'EXIT'] as const).map(cat => {
              const items = tradeSummary.filter(s => s.category === cat);
              if (items.length === 0) return null;
              const catColorClass = { ENTRY: 'text-blue-400', TIMING: 'text-purple-400', RISK: 'text-orange-400', EXIT: 'text-cyan-400' }[cat];
              return (
                <div key={cat} className="rounded-xl border border-border/40 bg-card/80 p-4">
                  <div className={`text-sm font-bold mb-3 ${catColorClass}`}>{items[0].icon} {cat}</div>
                  <div className="space-y-3">
                    {items.map((item, i) => {
                      const valClass = { emerald: 'text-emerald-400', amber: 'text-amber-400', rose: 'text-rose-400' }[item.color] ?? 'text-foreground';
                      return (
                        <div key={i}>
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm text-muted-foreground">{item.label}:</span>
                            <span className={`text-xl font-bold tabular-nums ${valClass}`}>{item.value}</span>
                          </div>
                          <div className="text-sm text-muted-foreground pl-2">{item.detail}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== Grade別サマリーテーブル（アコーディオン） ===== */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={toggleAll}
            className="px-2.5 py-1 text-xs rounded border border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            {allOpen ? '全て閉じる' : '全て開く'}
          </button>
        </div>
        {BUCKET_SECTIONS.map(g => renderBucketSection(g))}
      </div>

      {/* ===== チャート用グレード切替タブ ===== */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-muted-foreground">グラフ:</span>
        {BUCKET_SECTIONS.map(g => (
          <button
            key={g}
            onClick={() => setChartGrade(g)}
            className={`px-3 py-1 text-xs rounded-md border transition-colors ${
              chartBucket === g
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
            }`}
          >
            {g}{stocksByBucket[g]?.length ? ` (${stocksByBucket[g].length})` : ''}
          </button>
        ))}
      </div>

      {/* ===== Charts: 制度信用 / いちにち信用 分布 ===== */}
      {summaryData && (() => {
        const wd = summaryData.weekdays[selectedDay];
        if (!wd) return null;
        const tSegs = segmentMode === '11seg' ? summaryData.timeSegments11 : summaryData.timeSegments4;

        // 個別銘柄データから分布を計算
        const getVal = (s: DetailStock, segKey: string): number | null => {
          const raw = s.segments[segKey];
          if (raw === null) return null;
          if (displayMode === 'pct' && s.buyPrice && s.buyPrice > 0) {
            return (raw / (s.buyPrice * 100)) * 100;
          }
          return raw;
        };

        const buildDistribution = (marginType: string, filterFn?: (s: DetailStock) => boolean) => {
          const stocks = chartStocks.filter(s => {
            if (s.marginType !== marginType) return false;
            if (filterFn && !filterFn(s)) return false;
            return true;
          });

          const priceRangeGroups = PRICE_RANGE_LABELS.map(pr => {
            const prStocks = stocks.filter(s => s.priceRange === pr);
            const segData = tSegs.map(seg => {
              const values = prStocks
                .map(s => getVal(s, seg.key))
                .filter((v): v is number => v !== null);
              return {
                time: seg.label,
                key: seg.key,
                count: values.length,
                mean: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
                median: percentile(values, 50),
                q1: percentile(values, 25),
                q3: percentile(values, 75),
                p10: percentile(values, 10),
                p90: percentile(values, 90),
                winRate: values.length > 0 ? (values.filter(v => v > 0).length / values.length) * 100 : 0,
              };
            });
            return { label: pr, count: prStocks.length, data: segData };
          }).filter(g => g.count > 0);

          const allSegData = tSegs.map(seg => {
            const values = stocks
              .map(s => getVal(s, seg.key))
              .filter((v): v is number => v !== null);
            return {
              time: seg.label,
              key: seg.key,
              count: values.length,
              mean: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
              median: percentile(values, 50),
              q1: percentile(values, 25),
              q3: percentile(values, 75),
              p10: percentile(values, 10),
              p90: percentile(values, 90),
              winRate: values.length > 0 ? (values.filter(v => v > 0).length / values.length) * 100 : 0,
            };
          });

          const summaryByPR = PRICE_RANGE_LABELS.map(pr => {
            const prStocks = stocks.filter(s => s.priceRange === pr);
            const lastSegKey = tSegs[tSegs.length - 1]?.key;
            const values = prStocks
              .map(s => lastSegKey ? getVal(s, lastSegKey) : null)
              .filter((v): v is number => v !== null);
            return {
              label: pr,
              count: values.length,
              mean: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
              median: percentile(values, 50),
              q1: percentile(values, 25),
              q3: percentile(values, 75),
              p10: percentile(values, 10),
              p90: percentile(values, 90),
              min: values.length > 0 ? Math.min(...values) : 0,
              max: values.length > 0 ? Math.max(...values) : 0,
              winRate: values.length > 0 ? (values.filter(v => v > 0).length / values.length) * 100 : 0,
            };
          }).filter(g => g.count > 0);

          return { total: stocks.length, all: allSegData, byPriceRange: priceRangeGroups, summaryByPR };
        };

        const seidoDist = buildDistribution('制度信用');
        const ichDist = buildDistribution('いちにち信用',
          ichChartFilter === 'ex0' ? (s) => (s.shares ?? 0) > 0 : undefined
        );

        const tooltipStyle = { background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 13, color: '#fafafa' };
        const tooltipLabelStyle = { color: '#a1a1aa', fontSize: 13 };
        const tooltipItemStyle = { color: '#fafafa', fontSize: 13 };

        const bandColors = {
          p90: 'rgba(251,113,133,0.35)',
          q3:  'rgba(251,191,36,0.25)',
          median: 'rgba(255,255,255,0.1)',
          q1:  'rgba(96,165,250,0.2)',
        };

        type DistSegData = typeof seidoDist.all;

        const distValueFmt = displayMode === 'pct'
          ? (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
          : (v: number) => formatProfit(Math.round(v));
        const distTickFmt = displayMode === 'pct'
          ? (v: number) => `${v.toFixed(1)}%`
          : (v: number) => formatProfit(Math.round(v));
        const distTooltipFmt = displayMode === 'pct'
          ? (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
          : (v: number) => `¥${formatProfit(Math.round(v))}`;

        const renderDistChart = (segData: DistSegData, _label: string) => (
          <div className="mb-4">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={segData} margin={{ top: 5, right: 40, bottom: 5, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="time" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                <YAxis yAxisId="val" tick={{ fill: '#a1a1aa', fontSize: 12 }} tickFormatter={distTickFmt} />
                <YAxis yAxisId="wr" orientation="right" domain={[0, 100]} tick={{ fill: '#a1a1aa', fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                <ReferenceLine yAxisId="val" y={0} stroke="rgba(255,255,255,0.2)" />
                <ReferenceLine yAxisId="wr" y={50} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <Tooltip
                  contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any) => {
                    if (name === '勝率') return [`${Number(value).toFixed(1)}%`, name];
                    return [distTooltipFmt(Number(value)), name];
                  }}
                />
                <Bar yAxisId="val" dataKey="p10" stackId="band" fill="transparent" />
                <Bar yAxisId="val" dataKey={(d: DistSegData[0]) => d.q1 - d.p10} stackId="band" fill={bandColors.q1} name="P10-Q1（損切り検討）" />
                <Bar yAxisId="val" dataKey={(d: DistSegData[0]) => d.median - d.q1} stackId="band" fill={bandColors.median} name="Q1-中央値（静観）" />
                <Bar yAxisId="val" dataKey={(d: DistSegData[0]) => d.q3 - d.median} stackId="band" fill={bandColors.q3} name="中央値-Q3（利確検討）" />
                <Bar yAxisId="val" dataKey={(d: DistSegData[0]) => d.p90 - d.q3} stackId="band" fill={bandColors.p90} name="Q3-P90（即利確）" />
                <Line yAxisId="val" type="monotone" dataKey="mean" stroke="#60a5fa" strokeWidth={2.5} dot={{ fill: '#60a5fa', r: 4 }} name="平均" />
                <Line yAxisId="val" type="monotone" dataKey="median" stroke="#fbbf24" strokeWidth={2.5} strokeDasharray="5 3" dot={{ fill: '#fbbf24', r: 4 }} name="中央値" />
                <Line yAxisId="val" type="monotone" dataKey="p90" stroke="#fb7185" strokeWidth={1.5} strokeDasharray="4 2" dot={{ fill: '#fb7185', r: 2 }} name="P90" />
                <Line yAxisId="val" type="monotone" dataKey="q3" stroke="rgba(251,191,36,0.7)" strokeWidth={1.5} strokeDasharray="4 2" dot={{ fill: '#fbbf24', r: 2 }} name="Q3" />
                <Line yAxisId="val" type="monotone" dataKey="q1" stroke="rgba(96,165,250,0.7)" strokeWidth={1.5} strokeDasharray="4 2" dot={{ fill: '#60a5fa', r: 2 }} name="Q1" />
                <Line yAxisId="val" type="monotone" dataKey="p10" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="4 2" dot={{ fill: '#a78bfa', r: 2 }} name="P10" />
                <Line yAxisId="wr" type="monotone" dataKey="winRate" stroke="#34d399" strokeWidth={2.5} dot={{ fill: '#34d399', r: 4 }} name="勝率" />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground text-sm border-b border-border/30">
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">時刻</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap text-rose-400/70">P90</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap text-amber-400/70">Q3</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">中央値</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap text-blue-400/70">平均</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap text-blue-400/70">Q1</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap text-purple-400/70">P10</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">勝率</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">n</th>
                  </tr>
                </thead>
                <tbody>
                  {segData.map(d => (
                    <tr key={d.key} className="border-b border-border/20">
                      <td className="text-right px-2 py-2.5 tabular-nums text-foreground whitespace-nowrap">{d.time}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums ${d.p90 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{distValueFmt(d.p90)}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums ${d.q3 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{distValueFmt(d.q3)}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums font-semibold ${d.median >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{distValueFmt(d.median)}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums font-semibold ${d.mean >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>{distValueFmt(d.mean)}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums ${d.q1 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{distValueFmt(d.q1)}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums ${d.p10 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{distValueFmt(d.p10)}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums ${d.winRate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{d.winRate.toFixed(1)}%</td>
                      <td className="text-right px-2 py-2.5 tabular-nums text-foreground">{d.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

        const renderSection = (title: string, dist: typeof seidoDist, extraHeader?: React.ReactNode) => (
          <section className="bg-card border border-border rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-semibold text-foreground">{title}</span>
              <span className="text-muted-foreground text-sm">{dist.total}件</span>
              {extraHeader}
            </div>

            <h3 className="text-xs text-muted-foreground mb-2">価格帯別 P&L分布（大引け基準）</h3>
            <ResponsiveContainer width="100%" height={Math.max(200, dist.summaryByPR.length * 50 + 40)}>
              <ComposedChart data={dist.summaryByPR} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <YAxis dataKey="label" type="category" tick={{ fill: '#fafafa', fontSize: 13 }} width={110} />
                <XAxis type="number" tick={{ fill: '#a1a1aa', fontSize: 12 }} tickFormatter={distTickFmt} />
                <ReferenceLine x={0} stroke="rgba(255,255,255,0.2)" />
                <Tooltip
                  contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any) => {
                    if (name === '勝率') return [`${Number(value).toFixed(1)}%`, name];
                    return [distTooltipFmt(Number(value)), name];
                  }}
                />
                <Bar dataKey="p10" stackId="box" fill="transparent" name="P10" />
                <Bar dataKey={(d: typeof dist.summaryByPR[0]) => d.q1 - d.p10} stackId="box" fill={bandColors.q1} name="P10-Q1（損切り検討）" />
                <Bar dataKey={(d: typeof dist.summaryByPR[0]) => d.median - d.q1} stackId="box" fill={bandColors.median} name="Q1-中央値（静観）" />
                <Bar dataKey={(d: typeof dist.summaryByPR[0]) => d.q3 - d.median} stackId="box" fill={bandColors.q3} name="中央値-Q3（利確検討）" />
                <Bar dataKey={(d: typeof dist.summaryByPR[0]) => d.p90 - d.q3} stackId="box" fill={bandColors.p90} name="Q3-P90（即利確）" />
              </ComposedChart>
            </ResponsiveContainer>

            <div className="overflow-x-auto mt-2 mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground text-sm border-b border-border/30">
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">価格帯</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">件</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap text-rose-400/70">P90</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap text-amber-400/70">Q3</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">中央値</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap text-blue-400/70">平均</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap text-blue-400/70">Q1</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap text-purple-400/70">P10</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">勝率</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">IQR</th>
                  </tr>
                </thead>
                <tbody>
                  {dist.summaryByPR.map(d => {
                    const iqr = d.q3 - d.q1;
                    return (
                      <tr key={d.label} className="border-b border-border/20">
                        <td className="text-right px-2 py-2.5 tabular-nums text-foreground whitespace-nowrap">{d.label}</td>
                        <td className="text-right px-2 py-2.5 tabular-nums text-foreground">{d.count}</td>
                        <td className={`text-right px-2 py-2.5 tabular-nums ${d.p90 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{distValueFmt(d.p90)}</td>
                        <td className={`text-right px-2 py-2.5 tabular-nums ${d.q3 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{distValueFmt(d.q3)}</td>
                        <td className={`text-right px-2 py-2.5 tabular-nums font-semibold ${d.median >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{distValueFmt(d.median)}</td>
                        <td className={`text-right px-2 py-2.5 tabular-nums font-semibold ${d.mean >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>{distValueFmt(d.mean)}</td>
                        <td className={`text-right px-2 py-2.5 tabular-nums ${d.q1 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{distValueFmt(d.q1)}</td>
                        <td className={`text-right px-2 py-2.5 tabular-nums ${d.p10 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{distValueFmt(d.p10)}</td>
                        <td className={`text-right px-2 py-2.5 tabular-nums ${d.winRate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{d.winRate.toFixed(1)}%</td>
                        <td className="text-right px-2 py-2.5 tabular-nums text-amber-400">{distValueFmt(iqr)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <details className="mt-4">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                時間帯別分布を表示 ▶
              </summary>
              <div className="mt-2">
                <p className="text-[10px] text-muted-foreground/60 mb-2">
                  赤帯=即利確(Q3-P90) / 黄帯=利確検討(中央値-Q3) / 灰帯=静観(Q1-中央値) / 青帯=損切り検討(P10-Q1)
                </p>
                {renderDistChart(dist.all, '全体')}

                {dist.byPriceRange.map(pr => (
                  <div key={pr.label}>
                    <h3 className="text-xs text-muted-foreground mb-1 mt-4">{pr.label}（{pr.count}件）</h3>
                    {renderDistChart(pr.data, pr.label)}
                  </div>
                ))}
              </div>
            </details>
          </section>
        );

        return (
          <>
            {renderSection('制度信用 分布', seidoDist)}
            {renderSection('いちにち信用 分布', ichDist,
              <div className="flex gap-1 ml-auto">
                <button onClick={() => setIchChartFilter('all')} className={`px-2.5 py-1 text-sm rounded border transition-colors ${ichChartFilter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'}`}>全数</button>
                <button onClick={() => setIchChartFilter('ex0')} className={`px-2.5 py-1 text-sm rounded border transition-colors ${ichChartFilter === 'ex0' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'}`}>除0株</button>
              </div>
            )}
          </>
        );
      })()}

      {/* ===== Chart 4: Pareto (P&L Contribution) ===== */}
      <section className="bg-card border border-border rounded-xl p-4 mb-4">
        <h2 className="text-sm font-semibold mb-2 text-muted-foreground">
          {displayMode === 'pct' ? 'リターン率寄与度' : 'P&L寄与度'}（パレート図）
          <span className="text-xs ml-2 text-muted-foreground/70">
            特定銘柄依存 or 均等分散を判定
          </span>
        </h2>
        <div className="flex gap-1 mb-3">
          {segments.map((seg, i) => (
            <button
              key={seg.key}
              onClick={() => setParetoSegIdx(i)}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                paretoSegIdx === i
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {seg.time}
            </button>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={paretoData.slice(0, 30)} margin={{ top: 10, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="rank" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
            <YAxis yAxisId="pnl" tick={{ fill: '#a1a1aa', fontSize: 10 }} tickFormatter={(v) => displayMode === 'pct' ? `${v.toFixed(1)}%` : fmt(v)} />
            <YAxis yAxisId="cum" orientation="right" domain={[0, 100]} tick={{ fill: '#a1a1aa', fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
            <ReferenceLine yAxisId="pnl" y={0} stroke="rgba(255,255,255,0.15)" />
            <Tooltip
              contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 11, color: '#fafafa' }}
              labelStyle={{ color: '#a1a1aa' }}
              itemStyle={{ color: '#fafafa' }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => {
                if (name === '累積寄与') return [`${value.toFixed(1)}%`, name];
                return [displayMode === 'pct' ? `${Number(value).toFixed(2)}%` : `¥${fmt(value)}`, name];
              }}
              labelFormatter={(label) => {
                const item = paretoData[Number(label) - 1];
                return item ? `#${label} ${item.ticker} ${item.name} (${item.date})` : `#${label}`;
              }}
            />
            <Bar yAxisId="pnl" dataKey="pnl" name={displayMode === 'pct' ? 'リターン率' : '損益'} radius={[2, 2, 0, 0]}>
              {paretoData.slice(0, 30).map((entry, idx) => (
                <Cell key={idx} fill={entry.pnl >= 0 ? 'rgba(52,211,153,0.6)' : 'rgba(251,113,133,0.6)'} />
              ))}
            </Bar>
            <Line yAxisId="cum" type="monotone" dataKey="cumPct" stroke="#60a5fa" strokeWidth={2} dot={false} name="累積寄与" />
          </ComposedChart>
        </ResponsiveContainer>

        {paretoData.length > 0 && (() => {
          const top3Pct = paretoData.length >= 3 ? paretoData[2].cumPct : 0;
          const top5Pct = paretoData.length >= 5 ? paretoData[4].cumPct : 0;
          const top10Pct = paretoData.length >= 10 ? paretoData[9].cumPct : 0;
          return (
            <div className="flex gap-4 mt-2 text-xs">
              <div className="bg-muted/20 rounded-lg px-3 py-2">
                <span className="text-muted-foreground">Top 3:</span>
                <span className={`ml-1 font-semibold ${top3Pct > 60 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {top3Pct.toFixed(1)}%
                </span>
              </div>
              <div className="bg-muted/20 rounded-lg px-3 py-2">
                <span className="text-muted-foreground">Top 5:</span>
                <span className={`ml-1 font-semibold ${top5Pct > 70 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {top5Pct.toFixed(1)}%
                </span>
              </div>
              <div className="bg-muted/20 rounded-lg px-3 py-2">
                <span className="text-muted-foreground">Top 10:</span>
                <span className={`ml-1 font-semibold ${top10Pct > 85 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {top10Pct.toFixed(1)}%
                </span>
              </div>
              <div className="bg-muted/20 rounded-lg px-3 py-2 text-muted-foreground">
                {top3Pct > 60 ? '⚠ 特定銘柄に偏重' : '✓ 比較的均等'}
              </div>
            </div>
          );
        })()}
      </section>

      {/* ===== 仮説1: ギャップアップ率 vs 収益 ===== */}
      {(() => {
        const GAP_BUCKETS = [
          { label: '-3%以下', min: -Infinity, max: -3 },
          { label: '-3〜-1%', min: -3, max: -1 },
          { label: '-1〜+1%', min: -1, max: 1 },
          { label: '+1〜+3%', min: 1, max: 3 },
          { label: '+3%以上', min: 3, max: Infinity },
        ];

        const stocksWithGap = chartStocks
          .filter(s => s.buyPrice && s.prevClose && s.prevClose > 0)
          .map(s => ({
            ...s,
            gapPct: ((s.buyPrice! - s.prevClose!) / s.prevClose!) * 100,
          }));

        const lastSegKey = segments[segments.length - 1]?.key;
        const amSegKey = 'seg_1130';

        const toVal = (s: typeof stocksWithGap[0], segKey: string): number => {
          const raw = s.segments[segKey] ?? 0;
          if (displayMode === 'pct' && s.buyPrice && s.buyPrice > 0) {
            return (raw / (s.buyPrice * 100)) * 100;
          }
          return raw;
        };

        const gapData = GAP_BUCKETS.map(bucket => {
          const group = stocksWithGap.filter(s => s.gapPct >= bucket.min && s.gapPct < bucket.max);
          const finalPnls = group.map(s => lastSegKey ? toVal(s, lastSegKey) : 0);
          const amPnls = group.map(s => toVal(s, amSegKey));
          const wins = finalPnls.filter(v => v > 0).length;
          return {
            label: bucket.label,
            count: group.length,
            meanFinal: finalPnls.length > 0 ? finalPnls.reduce((a, b) => a + b, 0) / finalPnls.length : 0,
            medianFinal: percentile(finalPnls, 50),
            meanAM: amPnls.length > 0 ? amPnls.reduce((a, b) => a + b, 0) / amPnls.length : 0,
            winRate: group.length > 0 ? (wins / group.length) * 100 : 0,
            p90: percentile(finalPnls, 90),
            q3: percentile(finalPnls, 75),
            q1: percentile(finalPnls, 25),
            p10: percentile(finalPnls, 10),
          };
        }).filter(d => d.count > 0);

        return (
          <section className="bg-card border border-border rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-semibold text-foreground">ギャップアップ率 vs 収益</span>
              <span className="text-muted-foreground text-sm">{stocksWithGap.length}件</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              寄付きギャップ率 = (買値 - 前日終値) / 前日終値。ギャップ率別の大引け損益分布。
            </p>

            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={gapData} margin={{ top: 5, right: 40, bottom: 5, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                <YAxis yAxisId="val" tick={{ fill: '#a1a1aa', fontSize: 12 }} tickFormatter={(v) => displayMode === 'pct' ? `${v.toFixed(1)}%` : formatProfit(Math.round(v))} />
                <YAxis yAxisId="wr" orientation="right" domain={[0, 100]} tick={{ fill: '#a1a1aa', fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                <ReferenceLine yAxisId="val" y={0} stroke="rgba(255,255,255,0.2)" />
                <ReferenceLine yAxisId="wr" y={50} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <Tooltip
                  contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 13, color: '#fafafa' }}
                  labelStyle={{ color: '#a1a1aa', fontSize: 13 }}
                  itemStyle={{ color: '#fafafa', fontSize: 13 }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any) => {
                    if (name === '勝率') return [`${Number(value).toFixed(1)}%`, name];
                    return [displayMode === 'pct' ? `${Number(value).toFixed(2)}%` : `¥${formatProfit(Math.round(value))}`, name];
                  }}
                />
                <Bar yAxisId="val" dataKey="meanFinal" name={displayMode === 'pct' ? '平均リターン（大引け）' : '平均損益（大引け）'} radius={[3, 3, 0, 0]}>
                  {gapData.map((d, i) => (
                    <Cell key={i} fill={d.meanFinal >= 0 ? 'rgba(52,211,153,0.6)' : 'rgba(251,113,133,0.6)'} />
                  ))}
                </Bar>
                <Line yAxisId="val" type="monotone" dataKey="medianFinal" stroke="#fbbf24" strokeWidth={2.5} strokeDasharray="5 3" dot={{ fill: '#fbbf24', r: 4 }} name="中央値（大引け）" />
                <Line yAxisId="val" type="monotone" dataKey="meanAM" stroke="#a78bfa" strokeWidth={2} dot={{ fill: '#a78bfa', r: 3 }} name={displayMode === 'pct' ? '平均リターン（前場引け）' : '平均損益（前場引け）'} />
                <Line yAxisId="wr" type="monotone" dataKey="winRate" stroke="#34d399" strokeWidth={2.5} dot={{ fill: '#34d399', r: 4 }} name="勝率" />
              </ComposedChart>
            </ResponsiveContainer>

            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground text-sm border-b border-border/30">
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">ギャップ率</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">件</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">前場平均</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">大引け平均</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">中央値</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap text-rose-400/70">P90</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap text-amber-400/70">Q3</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap text-blue-400/70">Q1</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap text-purple-400/70">P10</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">勝率</th>
                  </tr>
                </thead>
                <tbody>
                  {gapData.map(d => (
                    <tr key={d.label} className="border-b border-border/20">
                      <td className="text-right px-2 py-2.5 tabular-nums text-foreground whitespace-nowrap">{d.label}</td>
                      <td className="text-right px-2 py-2.5 tabular-nums text-foreground">{d.count}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums ${d.meanAM >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{displayMode === 'pct' ? formatPctLabel(d.meanAM) : formatProfit(Math.round(d.meanAM))}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums font-semibold ${d.meanFinal >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>{displayMode === 'pct' ? formatPctLabel(d.meanFinal) : formatProfit(Math.round(d.meanFinal))}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums font-semibold ${d.medianFinal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{displayMode === 'pct' ? formatPctLabel(d.medianFinal) : formatProfit(Math.round(d.medianFinal))}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums ${d.p90 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{displayMode === 'pct' ? formatPctLabel(d.p90) : formatProfit(Math.round(d.p90))}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums ${d.q3 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{displayMode === 'pct' ? formatPctLabel(d.q3) : formatProfit(Math.round(d.q3))}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums ${d.q1 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{displayMode === 'pct' ? formatPctLabel(d.q1) : formatProfit(Math.round(d.q1))}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums ${d.p10 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{displayMode === 'pct' ? formatPctLabel(d.p10) : formatProfit(Math.round(d.p10))}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums ${d.winRate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{d.winRate.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })()}

      {/* ===== 仮説2: 前場利益 → 後場の振る舞い ===== */}
      {(() => {
        const amKey = 'seg_1130';
        const lastKey = segments[segments.length - 1]?.key;
        if (!lastKey) return null;

        const toPctVal = (s: DetailStock, segKey: string): number => {
          const raw = s.segments[segKey] ?? 0;
          if (displayMode === 'pct' && s.buyPrice && s.buyPrice > 0) {
            return (raw / (s.buyPrice * 100)) * 100;
          }
          return raw;
        };

        const stocksWithAM = chartStocks
          .filter(s => s.segments[amKey] !== null && s.segments[amKey] !== undefined
                    && s.segments[lastKey] !== null && s.segments[lastKey] !== undefined)
          .map(s => ({
            ...s,
            amPnl: toPctVal(s, amKey),
            finalPnl: toPctVal(s, lastKey),
          }));

        const amPlus = stocksWithAM.filter(s => s.amPnl > 0);
        const amMinus = stocksWithAM.filter(s => s.amPnl < 0);
        const amZero = stocksWithAM.filter(s => s.amPnl === 0);

        const calcTransition = (group: typeof amPlus, label: string) => {
          const finalPlus = group.filter(s => s.finalPnl > 0).length;
          const finalMinus = group.filter(s => s.finalPnl < 0).length;
          const finalZero = group.filter(s => s.finalPnl === 0).length;
          const improved = group.filter(s => s.finalPnl > s.amPnl).length;
          const worsened = group.filter(s => s.finalPnl < s.amPnl).length;
          const avgAM = group.length > 0 ? group.reduce((a, s) => a + s.amPnl, 0) / group.length : 0;
          const avgFinal = group.length > 0 ? group.reduce((a, s) => a + s.finalPnl, 0) / group.length : 0;
          const medianFinal = percentile(group.map(s => s.finalPnl), 50);

          const segTransition = segments.map(seg => {
            const vals = group.map(s => toPctVal(s, seg.key)).filter((v): v is number => v !== null);
            return {
              time: seg.label,
              mean: vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0,
              median: percentile(vals, 50),
              winRate: vals.length > 0 ? (vals.filter(v => v > 0).length / vals.length) * 100 : 0,
            };
          });

          return {
            label,
            count: group.length,
            avgAM, avgFinal, medianFinal,
            maintainRate: group.length > 0 ? (finalPlus / group.length) * 100 : 0,
            reverseRate: group.length > 0 ? (finalMinus / group.length) * 100 : 0,
            improvedRate: group.length > 0 ? (improved / group.length) * 100 : 0,
            worsenedRate: group.length > 0 ? (worsened / group.length) * 100 : 0,
            finalPlus, finalMinus, finalZero,
            segTransition,
          };
        };

        const transitions = [
          calcTransition(amPlus, '前場プラス'),
          calcTransition(amMinus, '前場マイナス'),
          ...(amZero.length > 0 ? [calcTransition(amZero, '前場ゼロ')] : []),
        ];

        return (
          <section className="bg-card border border-border rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-semibold text-foreground">前場利益 → 後場の振る舞い</span>
              <span className="text-muted-foreground text-sm">{stocksWithAM.length}件</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              11:30時点の損益で分類し、大引けまでの維持率・反転率を分析。
            </p>

            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground text-sm border-b border-border/30">
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">分類</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">件</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">前場平均</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">大引け平均</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">大引け中央値</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">→プラス</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">→マイナス</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">改善率</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">悪化率</th>
                  </tr>
                </thead>
                <tbody>
                  {transitions.map(t => (
                    <tr key={t.label} className="border-b border-border/20">
                      <td className="text-right px-2 py-2.5 tabular-nums text-foreground whitespace-nowrap font-semibold">{t.label}</td>
                      <td className="text-right px-2 py-2.5 tabular-nums text-foreground">{t.count}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums ${t.avgAM >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{displayMode === 'pct' ? formatPctLabel(t.avgAM) : formatProfit(Math.round(t.avgAM))}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums font-semibold ${t.avgFinal >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>{displayMode === 'pct' ? formatPctLabel(t.avgFinal) : formatProfit(Math.round(t.avgFinal))}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums font-semibold ${t.medianFinal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{displayMode === 'pct' ? formatPctLabel(t.medianFinal) : formatProfit(Math.round(t.medianFinal))}</td>
                      <td className="text-right px-2 py-2.5 tabular-nums text-emerald-400">{t.finalPlus}({t.maintainRate.toFixed(0)}%)</td>
                      <td className="text-right px-2 py-2.5 tabular-nums text-rose-400">{t.finalMinus}({t.reverseRate.toFixed(0)}%)</td>
                      <td className="text-right px-2 py-2.5 tabular-nums text-emerald-400">{t.improvedRate.toFixed(1)}%</td>
                      <td className="text-right px-2 py-2.5 tabular-nums text-rose-400">{t.worsenedRate.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {transitions.filter(t => t.count > 0).map(t => (
              <div key={t.label} className="mb-4">
                <h3 className="text-sm text-foreground mb-2 font-semibold">{t.label}（{t.count}件）→ 時間帯別推移</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={t.segTransition} margin={{ top: 5, right: 40, bottom: 5, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="time" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                    <YAxis yAxisId="val" tick={{ fill: '#a1a1aa', fontSize: 12 }} tickFormatter={(v) => displayMode === 'pct' ? `${v.toFixed(1)}%` : formatProfit(Math.round(v))} />
                    <YAxis yAxisId="wr" orientation="right" domain={[0, 100]} tick={{ fill: '#a1a1aa', fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                    <ReferenceLine yAxisId="val" y={0} stroke="rgba(255,255,255,0.2)" />
                    <ReferenceLine yAxisId="wr" y={50} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                    <Tooltip
                      contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 13, color: '#fafafa' }}
                      labelStyle={{ color: '#a1a1aa', fontSize: 13 }}
                      itemStyle={{ color: '#fafafa', fontSize: 13 }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(value: any, name: any) => {
                        if (name === '勝率') return [`${Number(value).toFixed(1)}%`, name];
                        return [displayMode === 'pct' ? `${Number(value).toFixed(2)}%` : `¥${formatProfit(Math.round(value))}`, name];
                      }}
                    />
                    <Line yAxisId="val" type="monotone" dataKey="mean" stroke="#60a5fa" strokeWidth={2.5} dot={{ fill: '#60a5fa', r: 4 }} name="平均" />
                    <Line yAxisId="val" type="monotone" dataKey="median" stroke="#fbbf24" strokeWidth={2.5} strokeDasharray="5 3" dot={{ fill: '#fbbf24', r: 4 }} name="中央値" />
                    <Line yAxisId="wr" type="monotone" dataKey="winRate" stroke="#34d399" strokeWidth={2.5} dot={{ fill: '#34d399', r: 4 }} name="勝率" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ))}
          </section>
        );
      })()}

      {/* ===== ピークタイミング分析 ===== */}
      {(() => {
        if (segments.length === 0 || chartStocks.length === 0) return null;

        // 各銘柄の最大含み益セグメントを特定
        const peakToVal = (s: DetailStock, segKey: string): number => {
          const raw = s.segments[segKey] ?? 0;
          if (displayMode === 'pct' && s.buyPrice && s.buyPrice > 0) {
            return (raw / (s.buyPrice * 100)) * 100;
          }
          return raw;
        };

        const peakAnalysis = chartStocks.map(s => {
          let peakSeg = segments[0]?.key || '';
          let peakVal = -Infinity;
          let peakIdx = 0;
          segments.forEach((seg, i) => {
            const v = peakToVal(s, seg.key);
            if (v > peakVal) { peakVal = v; peakSeg = seg.key; peakIdx = i; }
          });
          const lastKey = segments[segments.length - 1]?.key;
          const finalVal = lastKey ? peakToVal(s, lastKey) : 0;
          const givenBack = peakVal > 0 ? peakVal - finalVal : 0;
          const retentionRate = peakVal > 0 ? (finalVal / peakVal) * 100 : (finalVal <= 0 ? 0 : 100);
          return { ...s, peakSeg, peakVal, peakIdx, finalVal, givenBack, retentionRate };
        });

        // セグメント別のピーク集計
        const peakBySegment = segments.map((seg) => {
          const peaked = peakAnalysis.filter(s => s.peakSeg === seg.key);
          const avgPeak = peaked.length > 0 ? peaked.reduce((a, s) => a + s.peakVal, 0) / peaked.length : 0;
          const avgFinal = peaked.length > 0 ? peaked.reduce((a, s) => a + s.finalVal, 0) / peaked.length : 0;
          const avgGivenBack = peaked.length > 0 ? peaked.reduce((a, s) => a + s.givenBack, 0) / peaked.length : 0;
          const avgRetention = peaked.length > 0 ? peaked.reduce((a, s) => a + s.retentionRate, 0) / peaked.length : 0;
          return {
            time: seg.label,
            key: seg.key,
            count: peaked.length,
            pct: chartStocks.length > 0 ? (peaked.length / chartStocks.length) * 100 : 0,
            avgPeak,
            avgFinal,
            avgGivenBack,
            avgRetention,
          };
        });

        // 全体の利益還元率統計
        const profitStocks = peakAnalysis.filter(s => s.peakVal > 0);
        const avgRetentionAll = profitStocks.length > 0
          ? profitStocks.reduce((a, s) => a + s.retentionRate, 0) / profitStocks.length : 0;
        const medianRetention = percentile(profitStocks.map(s => s.retentionRate), 50);

        return (
          <section className="bg-card border border-border rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-semibold text-foreground">ピークタイミング分析</span>
              <span className="text-muted-foreground text-sm">{chartStocks.length}件</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              日中最大含み益がどの時間帯で発生するか。ピーク後に利益をどれだけ吐き出しているかを可視化。
            </p>

            {/* サマリーカード */}
            <div className="flex gap-4 mb-4 text-xs">
              <div className="bg-muted/20 rounded-lg px-3 py-2">
                <span className="text-muted-foreground">平均利益還元率:</span>
                <span className={`ml-1 font-semibold ${avgRetentionAll >= 60 ? 'text-emerald-400' : avgRetentionAll >= 30 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {avgRetentionAll.toFixed(1)}%
                </span>
              </div>
              <div className="bg-muted/20 rounded-lg px-3 py-2">
                <span className="text-muted-foreground">中央値:</span>
                <span className={`ml-1 font-semibold ${medianRetention >= 60 ? 'text-emerald-400' : medianRetention >= 30 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {medianRetention.toFixed(1)}%
                </span>
              </div>
              <div className="bg-muted/20 rounded-lg px-3 py-2 text-muted-foreground">
                {avgRetentionAll < 50 ? '⚠ ピーク後の吐き出しが大きい → 早期利確検討' : '✓ 利益維持率は良好'}
              </div>
            </div>

            {/* ピーク分布チャート */}
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={peakBySegment} margin={{ top: 5, right: 40, bottom: 5, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="time" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                <YAxis yAxisId="cnt" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} tick={{ fill: '#a1a1aa', fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                <ReferenceLine yAxisId="pct" y={50} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <Tooltip
                  contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 13, color: '#fafafa' }}
                  labelStyle={{ color: '#a1a1aa' }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any) => {
                    if (name === '利益還元率') return [`${Number(value).toFixed(1)}%`, name];
                    if (name === '割合') return [`${Number(value).toFixed(1)}%`, name];
                    if (name === 'ピーク件数') return [`${value}件`, name];
                    return [displayMode === 'pct' ? `${Number(value).toFixed(2)}%` : `¥${formatProfit(Math.round(value))}`, name];
                  }}
                />
                <Bar yAxisId="cnt" dataKey="count" name="ピーク件数" radius={[3, 3, 0, 0]}>
                  {peakBySegment.map((_, i) => (
                    <Cell key={i} fill={i <= 4 ? 'rgba(251,191,36,0.5)' : 'rgba(96,165,250,0.5)'} />
                  ))}
                </Bar>
                <Line yAxisId="pct" type="monotone" dataKey="avgRetention" stroke="#34d399" strokeWidth={2.5} dot={{ fill: '#34d399', r: 4 }} name="利益還元率" />
                <Line yAxisId="pct" type="monotone" dataKey="pct" stroke="#a78bfa" strokeWidth={2} strokeDasharray="4 2" dot={{ fill: '#a78bfa', r: 3 }} name="割合" />
              </ComposedChart>
            </ResponsiveContainer>

            {/* テーブル */}
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground text-sm border-b border-border/30">
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">時刻</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">ピーク件数</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">割合</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">平均ピーク</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">平均大引け</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">吐き出し</th>
                    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">還元率</th>
                  </tr>
                </thead>
                <tbody>
                  {peakBySegment.map(d => (
                    <tr key={d.key} className="border-b border-border/20">
                      <td className="text-right px-2 py-2.5 tabular-nums text-foreground whitespace-nowrap">{d.time}</td>
                      <td className="text-right px-2 py-2.5 tabular-nums text-foreground">{d.count}</td>
                      <td className="text-right px-2 py-2.5 tabular-nums text-muted-foreground">{d.pct.toFixed(1)}%</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums ${d.avgPeak >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{displayMode === 'pct' ? formatPctLabel(d.avgPeak) : formatProfit(Math.round(d.avgPeak))}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums font-semibold ${d.avgFinal >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>{displayMode === 'pct' ? formatPctLabel(d.avgFinal) : formatProfit(Math.round(d.avgFinal))}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums ${d.avgGivenBack > 0 ? 'text-rose-400' : 'text-foreground'}`}>{d.avgGivenBack > 0 ? (displayMode === 'pct' ? `-${d.avgGivenBack.toFixed(2)}%` : `-${formatProfit(Math.round(d.avgGivenBack))}`) : '0'}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums font-semibold ${d.avgRetention >= 60 ? 'text-emerald-400' : d.avgRetention >= 30 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {d.count > 0 ? `${d.avgRetention.toFixed(1)}%` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })()}

      {/* ===== 条件付きイグジット分析 ===== */}
      {(() => {
        if (segments.length < 3 || chartStocks.length === 0) return null;

        // 判定時刻の候補（前場中盤〜引け）
        const checkpoints = segments
          .filter(seg => ['seg_1030', 'seg_1130', 'seg_1300', 'seg_1430'].includes(seg.key))
          .map(seg => ({ ...seg, idx: segments.findIndex(s => s.key === seg.key) }))
          .filter(seg => seg.idx >= 0);

        if (checkpoints.length === 0) return null;

        const lastKey = segments[segments.length - 1]?.key;
        if (!lastKey) return null;

        // 含み益バケット
        const PNL_BUCKETS = displayMode === 'pct'
          ? [
              { label: '損失 (<0%)', min: -Infinity, max: 0 },
              { label: '微益 (0~+0.5%)', min: 0, max: 0.5 },
              { label: '小益 (+0.5~+2%)', min: 0.5, max: 2 },
              { label: '中益 (+2~+5%)', min: 2, max: 5 },
              { label: '大益 (+5%~)', min: 5, max: Infinity },
            ]
          : [
              { label: '損失 (<0)', min: -Infinity, max: 0 },
              { label: '微益 (0~+500)', min: 0, max: 500 },
              { label: '小益 (+500~+2000)', min: 500, max: 2000 },
              { label: '中益 (+2000~+5000)', min: 2000, max: 5000 },
              { label: '大益 (+5000~)', min: 5000, max: Infinity },
            ];

        const exitToVal = (s: DetailStock, segKey: string): number => {
          const raw = s.segments[segKey] ?? 0;
          if (displayMode === 'pct' && s.buyPrice && s.buyPrice > 0) {
            return (raw / (s.buyPrice * 100)) * 100;
          }
          return raw;
        };

        const checkpointData = checkpoints.map(cp => {
          const buckets = PNL_BUCKETS.map(bucket => {
            const group = chartStocks.filter(s => {
              const cpVal = exitToVal(s, cp.key);
              return cpVal >= bucket.min && cpVal < bucket.max;
            });

            if (group.length === 0) return { ...bucket, count: 0, avgAtCP: 0, avgFinal: 0, delta: 0, holdBetter: 0, exitBetter: 0, holdBetterPct: 0 };

            const avgAtCP = group.reduce((a, s) => a + exitToVal(s, cp.key), 0) / group.length;
            const avgFinal = group.reduce((a, s) => a + exitToVal(s, lastKey), 0) / group.length;
            const delta = avgFinal - avgAtCP;
            const holdBetter = group.filter(s => exitToVal(s, lastKey) > exitToVal(s, cp.key)).length;
            const exitBetter = group.length - holdBetter;

            return {
              ...bucket,
              count: group.length,
              avgAtCP,
              avgFinal,
              delta,
              holdBetter,
              exitBetter,
              holdBetterPct: (holdBetter / group.length) * 100,
            };
          }).filter(b => b.count > 0);

          return { ...cp, buckets };
        });

        return (
          <section className="bg-card border border-border rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-semibold text-foreground">条件付きイグジット分析</span>
              <span className="text-muted-foreground text-sm">{chartStocks.length}件</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              特定時刻の含み益レベル別に「その時点で利確 vs 大引けまで持ち越し」の期待値を比較。
              δ &gt; 0 なら持ち越し有利、δ &lt; 0 なら利確有利。
            </p>

            {checkpointData.map(cp => (
              <div key={cp.key} className="mb-6">
                <h3 className="text-sm font-semibold text-foreground mb-2">
                  {cp.label} 時点の判断
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground text-sm border-b border-border/30">
                        <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">含み益レベル</th>
                        <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">件数</th>
                        <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">時点P&L</th>
                        <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">大引けP&L</th>
                        <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">δ (持越し効果)</th>
                        <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">判定</th>
                        <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">持越し勝率</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cp.buckets.map(b => {
                        const deltaThreshHigh = displayMode === 'pct' ? 0.1 : 100;
                        const deltaThreshLow = displayMode === 'pct' ? -0.1 : -100;
                        const verdict = b.delta > deltaThreshHigh ? '持越し◎' : b.delta > 0 ? '持越し○' : b.delta > deltaThreshLow ? '微妙' : '利確◎';
                        const verdictClass = b.delta > deltaThreshHigh ? 'text-emerald-400' : b.delta > 0 ? 'text-emerald-500' : b.delta > deltaThreshLow ? 'text-amber-400' : 'text-rose-400';
                        const fmtVal = (v: number) => displayMode === 'pct' ? formatPctLabel(v) : formatProfit(Math.round(v));
                        return (
                          <tr key={b.label} className="border-b border-border/20">
                            <td className="text-right px-2 py-2.5 tabular-nums text-foreground whitespace-nowrap">{b.label}</td>
                            <td className="text-right px-2 py-2.5 tabular-nums text-foreground">{b.count}</td>
                            <td className={`text-right px-2 py-2.5 tabular-nums ${b.avgAtCP >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtVal(b.avgAtCP)}</td>
                            <td className={`text-right px-2 py-2.5 tabular-nums font-semibold ${b.avgFinal >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>{fmtVal(b.avgFinal)}</td>
                            <td className={`text-right px-2 py-2.5 tabular-nums font-semibold ${b.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtVal(b.delta)}</td>
                            <td className={`text-right px-2 py-2.5 font-semibold ${verdictClass}`}>{verdict}</td>
                            <td className={`text-right px-2 py-2.5 tabular-nums ${b.holdBetterPct >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {b.holdBetterPct.toFixed(0)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </section>
        );
      })()}

      {/* ===== 拡張パネル (#1〜#6) ===== */}
      {(futuresGapData || nikkeiChangeData || panelsData) && (
        <div className="mt-8 space-y-6">
          <h2 className="text-lg font-bold text-foreground border-b border-border/30 pb-2">
            トレード判断パネル — {WEEKDAY_SHORT[selectedDay]}曜日（詳細データ）
          </h2>

          {/* #1 マクロゲーティング */}
          {(futuresGapData || nikkeiChangeData) && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">ENTRY: マクロゲーティング</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {futuresGapData && (
                  <div className="rounded-xl border border-border/40 bg-card/80 p-4">
                    <div className="text-xs text-muted-foreground mb-2">先物Gap帯 × Bucket PF</div>
                    <table className="w-full text-sm">
                      <thead><tr className="text-muted-foreground border-b border-border/30">
                        <th className="text-left px-2 py-1.5">Gap帯</th>
                        <th className="text-right px-2 py-1.5">SHORT</th>
                        <th className="text-right px-2 py-1.5">DISC</th>
                        <th className="text-right px-2 py-1.5">LONG</th>
                      </tr></thead>
                      <tbody>{futuresGapData.rows.map(r => (
                        <tr key={r.label} className="border-b border-border/20">
                          <td className="px-2 py-1.5 text-foreground">{r.label}</td>
                          {(['SHORT','DISC','LONG'] as const).map(b => {
                            const cell = r[b] as { pf: number|null; n: number; avg: number|null; winRate: number|null };
                            return <td key={b} className={`text-right px-2 py-1.5 tabular-nums ${cell.pf !== null ? (cell.pf >= 1.5 ? 'text-emerald-400 font-bold' : cell.pf >= 1 ? 'text-foreground' : 'text-rose-400') : 'text-muted-foreground'}`}>
                              {cell.pf !== null ? `${cell.pf.toFixed(2)} (${cell.n})` : cell.n > 0 ? `- (${cell.n})` : '-'}
                            </td>;
                          })}
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
                {nikkeiChangeData && (
                  <div className="rounded-xl border border-border/40 bg-card/80 p-4">
                    <div className="text-xs text-muted-foreground mb-2">N225変化率帯 × Bucket PF</div>
                    <table className="w-full text-sm">
                      <thead><tr className="text-muted-foreground border-b border-border/30">
                        <th className="text-left px-2 py-1.5">N225帯</th>
                        <th className="text-right px-2 py-1.5">SHORT</th>
                        <th className="text-right px-2 py-1.5">DISC</th>
                        <th className="text-right px-2 py-1.5">LONG</th>
                      </tr></thead>
                      <tbody>{nikkeiChangeData.rows.map(r => (
                        <tr key={r.label} className="border-b border-border/20">
                          <td className="px-2 py-1.5 text-foreground">{r.label}</td>
                          {(['SHORT','DISC','LONG'] as const).map(b => {
                            const cell = r[b] as { pf: number|null; n: number; avg: number|null; winRate: number|null };
                            return <td key={b} className={`text-right px-2 py-1.5 tabular-nums ${cell.pf !== null ? (cell.pf >= 1.5 ? 'text-emerald-400 font-bold' : cell.pf >= 1 ? 'text-foreground' : 'text-rose-400') : 'text-muted-foreground'}`}>
                              {cell.pf !== null ? `${cell.pf.toFixed(2)} (${cell.n})` : cell.n > 0 ? `- (${cell.n})` : '-'}
                            </td>;
                          })}
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}

          {panelsData && (
            <>
              {/* #2 流動性 */}
              {panelsData.liquidity && (
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-2">ENTRY: 流動性・ポジションサイズ</h3>
                  <div className="rounded-xl border border-border/40 bg-card/80 p-4">
                    <table className="w-full text-sm">
                      <thead><tr className="text-muted-foreground border-b border-border/30">
                        <th className="text-left px-2 py-1.5">Bucket</th>
                        <th className="text-right px-2 py-1.5">件数</th>
                        <th className="text-right px-2 py-1.5">出来高中央</th>
                        <th className="text-right px-2 py-1.5">株数中央</th>
                        <th className="text-right px-2 py-1.5">売残中央</th>
                        <th className="text-right px-2 py-1.5">買残中央</th>
                      </tr></thead>
                      <tbody>{(['SHORT','DISC','LONG'] as const).map(b => {
                        const d = (panelsData.liquidity as Record<string, { n: number; volume_median: number|null; shares_median: number|null; sell_balance_median: number|null; buy_balance_median: number|null }>)[b];
                        if (!d || d.n === 0) return null;
                        return <tr key={b} className="border-b border-border/20">
                          <td className={`px-2 py-1.5 font-medium ${b === 'SHORT' ? 'text-rose-400' : b === 'LONG' ? 'text-emerald-400' : 'text-amber-400'}`}>{b}</td>
                          <td className="text-right px-2 py-1.5 tabular-nums text-foreground">{d.n}</td>
                          <td className="text-right px-2 py-1.5 tabular-nums text-foreground">{d.volume_median?.toLocaleString() ?? '-'}</td>
                          <td className="text-right px-2 py-1.5 tabular-nums text-foreground">{d.shares_median?.toLocaleString() ?? '-'}</td>
                          <td className="text-right px-2 py-1.5 tabular-nums text-foreground">{d.sell_balance_median?.toLocaleString() ?? '-'}</td>
                          <td className="text-right px-2 py-1.5 tabular-nums text-foreground">{d.buy_balance_median?.toLocaleString() ?? '-'}</td>
                        </tr>;
                      })}</tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* #3 Phase遷移マトリクス */}
              {(panelsData.phase_matrix as { phase1_label: string; n: number; phase2_avg_pct: number|null; phase2_win_rate: number|null; phase2_pf: number|null }[])?.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-2">TIMING: 前場→後場 遷移マトリクス</h3>
                  <div className="rounded-xl border border-border/40 bg-card/80 p-4">
                    <div className="text-xs text-muted-foreground mb-2">前場の含み益/損 → 後場どうなるか</div>
                    <table className="w-full text-sm">
                      <thead><tr className="text-muted-foreground border-b border-border/30">
                        <th className="text-left px-2 py-1.5">前場状態</th>
                        <th className="text-right px-2 py-1.5">件数</th>
                        <th className="text-right px-2 py-1.5">後場平均%</th>
                        <th className="text-right px-2 py-1.5">後場勝率</th>
                        <th className="text-right px-2 py-1.5">後場PF</th>
                      </tr></thead>
                      <tbody>{(panelsData.phase_matrix as { phase1_label: string; n: number; phase2_avg_pct: number|null; phase2_win_rate: number|null; phase2_pf: number|null }[]).map(r => (
                        <tr key={r.phase1_label} className="border-b border-border/20">
                          <td className="px-2 py-1.5 text-foreground">{r.phase1_label}</td>
                          <td className="text-right px-2 py-1.5 tabular-nums text-foreground">{r.n}</td>
                          <td className={`text-right px-2 py-1.5 tabular-nums ${(r.phase2_avg_pct ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {r.phase2_avg_pct !== null ? `${r.phase2_avg_pct >= 0 ? '+' : ''}${r.phase2_avg_pct.toFixed(2)}%` : '-'}
                          </td>
                          <td className={`text-right px-2 py-1.5 tabular-nums ${(r.phase2_win_rate ?? 0) >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {r.phase2_win_rate !== null ? `${r.phase2_win_rate.toFixed(1)}%` : '-'}
                          </td>
                          <td className={`text-right px-2 py-1.5 tabular-nums font-bold ${(r.phase2_pf ?? 0) >= 1.5 ? 'text-emerald-400' : (r.phase2_pf ?? 0) >= 1 ? 'text-foreground' : 'text-rose-400'}`}>
                            {r.phase2_pf !== null ? r.phase2_pf.toFixed(2) : '-'}
                          </td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* #4 エクスカーション */}
              {panelsData.excursion && Object.keys(panelsData.excursion as Record<string, unknown>).length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-2">RISK: エクスカーション（含み益/損パーセンタイル）</h3>
                  <div className="rounded-xl border border-border/40 bg-card/80 p-4">
                    <table className="w-full text-sm">
                      <thead><tr className="text-muted-foreground border-b border-border/30">
                        <th className="text-left px-2 py-1.5">指標</th>
                        <th className="text-right px-2 py-1.5">件数</th>
                        <th className="text-right px-2 py-1.5">P10</th>
                        <th className="text-right px-2 py-1.5">P25</th>
                        <th className="text-right px-2 py-1.5 font-bold">P50</th>
                        <th className="text-right px-2 py-1.5">P75</th>
                        <th className="text-right px-2 py-1.5">P90</th>
                      </tr></thead>
                      <tbody>{Object.values(panelsData.excursion as Record<string, { label: string; n: number; p10: number|null; p25: number|null; p50: number|null; p75: number|null; p90: number|null }>).map(e => (
                        <tr key={e.label} className="border-b border-border/20">
                          <td className="px-2 py-1.5 text-foreground whitespace-nowrap">{e.label}</td>
                          <td className="text-right px-2 py-1.5 tabular-nums text-foreground">{e.n}</td>
                          {(['p10','p25','p50','p75','p90'] as const).map(p => (
                            <td key={p} className={`text-right px-2 py-1.5 tabular-nums ${p === 'p50' ? 'font-bold' : ''} ${(e[p] ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {e[p] !== null ? `${(e[p]! >= 0 ? '+' : '')}${e[p]!.toFixed(2)}%` : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* #5 多段トリガー比較 */}
              {(panelsData.stop_loss as { trigger: string; n: number; pf: number|null; avg: number|null; win_rate: number|null; exit_reasons: Record<string, number> }[])?.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-2">EXIT: 損切トリガー比較</h3>
                  <div className="rounded-xl border border-border/40 bg-card/80 p-4">
                    <table className="w-full text-sm">
                      <thead><tr className="text-muted-foreground border-b border-border/30">
                        <th className="text-left px-2 py-1.5">トリガー</th>
                        <th className="text-right px-2 py-1.5">件数</th>
                        <th className="text-right px-2 py-1.5">PF</th>
                        <th className="text-right px-2 py-1.5">平均P&L</th>
                        <th className="text-right px-2 py-1.5">勝率</th>
                        <th className="text-left px-2 py-1.5">Exit理由</th>
                      </tr></thead>
                      <tbody>{(panelsData.stop_loss as { trigger: string; n: number; pf: number|null; avg: number|null; win_rate: number|null; exit_reasons: Record<string, number> }[]).map(r => (
                        <tr key={r.trigger} className="border-b border-border/20">
                          <td className="px-2 py-1.5 text-foreground font-medium">{r.trigger}</td>
                          <td className="text-right px-2 py-1.5 tabular-nums text-foreground">{r.n}</td>
                          <td className={`text-right px-2 py-1.5 tabular-nums font-bold ${(r.pf ?? 0) >= 1.5 ? 'text-emerald-400' : (r.pf ?? 0) >= 1 ? 'text-foreground' : 'text-rose-400'}`}>
                            {r.pf !== null ? r.pf.toFixed(2) : '-'}
                          </td>
                          <td className={`text-right px-2 py-1.5 tabular-nums ${(r.avg ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {r.avg !== null ? formatProfit(r.avg) : '-'}
                          </td>
                          <td className={`text-right px-2 py-1.5 tabular-nums ${(r.win_rate ?? 0) >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {r.win_rate !== null ? `${r.win_rate.toFixed(1)}%` : '-'}
                          </td>
                          <td className="px-2 py-1.5 text-xs text-muted-foreground">
                            {Object.entries(r.exit_reasons).map(([k, v]) => `${k}:${v}`).join(' / ') || '-'}
                          </td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* #6 朝利確 vs 引けホールド */}
              {panelsData.hold_vs_exit && Object.keys(panelsData.hold_vs_exit as Record<string, unknown>).length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-2">EXIT: 利確タイミング比較</h3>
                  <div className="rounded-xl border border-border/40 bg-card/80 p-4">
                    <table className="w-full text-sm">
                      <thead><tr className="text-muted-foreground border-b border-border/30">
                        <th className="text-left px-2 py-1.5">タイミング</th>
                        <th className="text-right px-2 py-1.5">件数</th>
                        <th className="text-right px-2 py-1.5">合計P&L</th>
                        <th className="text-right px-2 py-1.5">平均P&L</th>
                        <th className="text-right px-2 py-1.5">PF</th>
                        <th className="text-right px-2 py-1.5">勝率</th>
                      </tr></thead>
                      <tbody>{Object.entries(panelsData.hold_vs_exit as Record<string, { label?: string; n?: number; total_pnl?: number|null; avg?: number|null; pf?: number|null; win_rate?: number|null }>)
                        .filter(([k]) => k !== 'giveback_pct')
                        .map(([k, r]) => (
                        <tr key={k} className="border-b border-border/20">
                          <td className="px-2 py-1.5 text-foreground">{r.label ?? k}</td>
                          <td className="text-right px-2 py-1.5 tabular-nums text-foreground">{r.n ?? '-'}</td>
                          <td className={`text-right px-2 py-1.5 tabular-nums font-bold ${(r.total_pnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {r.total_pnl !== null && r.total_pnl !== undefined ? formatProfit(r.total_pnl) : '-'}
                          </td>
                          <td className={`text-right px-2 py-1.5 tabular-nums ${(r.avg ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {r.avg !== null && r.avg !== undefined ? formatProfit(r.avg) : '-'}
                          </td>
                          <td className={`text-right px-2 py-1.5 tabular-nums font-bold ${(r.pf ?? 0) >= 1.5 ? 'text-emerald-400' : (r.pf ?? 0) >= 1 ? 'text-foreground' : 'text-rose-400'}`}>
                            {r.pf !== null && r.pf !== undefined ? r.pf.toFixed(2) : '-'}
                          </td>
                          <td className={`text-right px-2 py-1.5 tabular-nums ${(r.win_rate ?? 0) >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {r.win_rate !== null && r.win_rate !== undefined ? `${r.win_rate.toFixed(1)}%` : '-'}
                          </td>
                        </tr>
                      ))}</tbody>
                    </table>
                    {(panelsData.hold_vs_exit as Record<string, unknown>).giveback_pct !== undefined && (
                      <div className="mt-3 pt-3 border-t border-border/30 text-sm">
                        <span className="text-muted-foreground">吐き出し率: </span>
                        <span className="text-amber-400 font-bold">
                          {((panelsData.hold_vs_exit as Record<string, unknown>).giveback_pct as number).toFixed(1)}%
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">（利益銘柄の最大含み益→引けまでに失った割合）</span>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
