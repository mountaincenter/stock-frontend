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
  type: string; count: { all: number; ex0: number };
  segments11: { all: Record<string, SegmentStats>; ex0: Record<string, SegmentStats> };
  segments4: { all: Record<string, SegmentStats>; ex0: Record<string, SegmentStats> };
  pctSegments11: { all: Record<string, SegmentStatsPct>; ex0: Record<string, SegmentStatsPct> };
  pctSegments4: { all: Record<string, SegmentStatsPct>; ex0: Record<string, SegmentStatsPct> };
  priceRanges: { all: PriceRangeData[]; ex0: PriceRangeData[] };
}
interface WeekdayData { weekday: string; seido: SeidoData; ichinichi: IchinichiData; }
interface SummaryResponse {
  timeSegments11: TimeSegment[]; timeSegments4: TimeSegment[];
  weekdays: WeekdayData[];
  gradeInfo?: { available: boolean; grades: string[] };
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
const GRADE_LABELS = ['G1', 'G2', 'G3', 'G4'] as const;

type DisplayMode = 'amount' | 'pct';
type SegmentMode = '4seg' | '11seg';
type FilterType = 'all' | 'ex0';

// ===== Helpers (from analysis-custom) =====
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

function fmtPct(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
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
  const [selectedGrades, setSelectedGrades] = useState<Set<string>>(new Set());
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<Set<string>>(new Set(PRICE_RANGE_LABELS));
  const [selectedMarginTypes, setSelectedMarginTypes] = useState<Set<string>>(new Set(MARGIN_TYPES));
  const [displayMode, setDisplayMode] = useState<'amount' | 'pct'>('amount');
  const [segmentMode, setSegmentMode] = useState<'4seg' | '11seg'>('11seg');
  const [gradesAvailable, setGradesAvailable] = useState(false);
  const [summaryData, setSummaryData] = useState<SummaryResponse | null>(null);
  const [ichFilter, setIchFilter] = useState<'all' | 'ex0'>('all');
  const [ichChartFilter, setIchChartFilter] = useState<'all' | 'ex0'>('all');

  // Fetch data (gradesなしで全データ取得、クライアントでフィルタリング)
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

      // mlGradeの有無をdetailデータから判定
      const hasGrades = detailJson.results.some(r => r.stocks.some(s => s.mlGrade !== null));
      setGradesAvailable(hasGrades);

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

  // Get current weekday data
  const weekdayGroup = useMemo(() => {
    if (!data) return null;
    return data.results.find(r => r.key === WEEKDAYS[selectedDay]) || null;
  }, [data, selectedDay]);

  // Filter stocks
  const filteredStocks = useMemo(() => {
    if (!weekdayGroup) return [];
    return weekdayGroup.stocks.filter(s => {
      if (!selectedPriceRanges.has(s.priceRange)) return false;
      if (!selectedMarginTypes.has(s.marginType)) return false;
      if (selectedGrades.size > 0 && !selectedGrades.has(s.mlGrade || '')) return false;
      return true;
    });
  }, [weekdayGroup, selectedPriceRanges, selectedMarginTypes, selectedGrades]);

  const segments = data?.timeSegments || [];

  // ===== Pareto data (P&L contribution at selected segment) =====
  const [paretoSegIdx, setParetoSegIdx] = useState(4); // default: seg_1130 (前場引け)
  const paretoData = useMemo(() => {
    const segKey = segments[paretoSegIdx]?.key;
    if (!segKey) return [];

    const items = filteredStocks
      .map(s => ({
        ticker: s.ticker,
        name: s.stockName,
        date: s.date,
        pnl: s.segments[segKey] ?? 0,
      }))
      .sort((a, b) => b.pnl - a.pnl);

    const totalPnl = items.reduce((sum, i) => sum + Math.abs(i.pnl), 0);
    let cumAbs = 0;

    return items.map((item, idx) => {
      cumAbs += Math.abs(item.pnl);
      return {
        ...item,
        rank: idx + 1,
        cumPct: totalPnl > 0 ? (cumAbs / totalPnl) * 100 : 0,
      };
    });
  }, [segments, filteredStocks, paretoSegIdx]);

  // ===== Render =====
  if (loading && !data) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-muted-foreground">読み込み中...</div>
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
            {(['mon', 'tue', 'wed', 'thu', 'fri'] as const).map((slug, i) => (
              <Link
                key={slug}
                href={`/dev/analysis-custom/${slug}`}
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
            {/* Grade */}
            {gradesAvailable && (
              <>
                <span className="text-border">|</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">Grade:</span>
                  {GRADE_LABELS.map((g) => (
                    <label key={g} className="flex items-center gap-0.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedGrades.has(g)}
                        onChange={() => {
                          setSelectedGrades(prev => {
                            const next = new Set(prev);
                            next.has(g) ? next.delete(g) : next.add(g);
                            return next;
                          });
                        }}
                        className="w-3 h-3 rounded border-cyan-500/50 bg-muted/30 text-cyan-500"
                      />
                      <span className={`text-xs ${selectedGrades.has(g) ? 'text-cyan-400' : 'text-muted-foreground'}`}>{g}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
            <span className="text-border">|</span>
            <Link href="/dev/analysis-custom" className="text-xs text-muted-foreground hover:text-foreground">
              ← カスタム分析
            </Link>
            <DevNavLinks />
          </div>
        </div>

        {/* Sub filters */}
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

      {/* ===== Summary Table (same as analysis-custom) ===== */}
      {summaryData && (() => {
        const wd = summaryData.weekdays[selectedDay];
        if (!wd) return null;
        const timeSegments = segmentMode === '11seg' ? summaryData.timeSegments11 : summaryData.timeSegments4;

        const getSegmentsData = (
          data11: Record<string, SegmentStats>, data4: Record<string, SegmentStats>,
          pct11: Record<string, SegmentStatsPct>, pct4: Record<string, SegmentStatsPct>
        ) => displayMode === 'amount' ? (segmentMode === '11seg' ? data11 : data4) : (segmentMode === '11seg' ? pct11 : pct4);

        const seidoSegs = getSegmentsData(wd.seido.segments11, wd.seido.segments4, wd.seido.pctSegments11, wd.seido.pctSegments4);
        const ichiSegs = getSegmentsData(
          ichFilter === 'ex0' ? wd.ichinichi.segments11.ex0 : wd.ichinichi.segments11.all,
          ichFilter === 'ex0' ? wd.ichinichi.segments4.ex0 : wd.ichinichi.segments4.all,
          ichFilter === 'ex0' ? wd.ichinichi.pctSegments11.ex0 : wd.ichinichi.pctSegments11.all,
          ichFilter === 'ex0' ? wd.ichinichi.pctSegments4.ex0 : wd.ichinichi.pctSegments4.all,
        );
        const ichiPriceRanges = ichFilter === 'ex0' ? wd.ichinichi.priceRanges.ex0 : wd.ichinichi.priceRanges.all;
        const ichiCount = ichFilter === 'ex0' ? wd.ichinichi.count.ex0 : wd.ichinichi.count.all;

        return (
          <div className="mb-4">
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
                                {displayMode === 'amount' ? formatProfit(value) : formatPctLabel(value)}
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
                            <th key={seg.key} className="text-right px-2 py-2.5 font-medium whitespace-nowrap">{seg.label}</th>
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
                                const winRate = stats?.winRate ?? 0;
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
                                {displayMode === 'amount' ? formatProfit(value) : formatPctLabel(value)}
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
                            <th key={seg.key} className="text-right px-2 py-2.5 font-medium whitespace-nowrap">{seg.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {ichiPriceRanges.map(pr => {
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
                                const winRate = stats?.winRate ?? 0;
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
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===== Charts: 制度信用 ===== */}
      {summaryData && (() => {
        const wd = summaryData.weekdays[selectedDay];
        if (!wd) return null;
        const tSegs = segmentMode === '11seg' ? summaryData.timeSegments11 : summaryData.timeSegments4;

        const getSegs = (s11: Record<string, SegmentStats>, s4: Record<string, SegmentStats>,
                         p11: Record<string, SegmentStatsPct>, p4: Record<string, SegmentStatsPct>) =>
          displayMode === 'amount' ? (segmentMode === '11seg' ? s11 : s4) : (segmentMode === '11seg' ? p11 : p4);

        const seidoSegs = getSegs(wd.seido.segments11, wd.seido.segments4, wd.seido.pctSegments11, wd.seido.pctSegments4);

        // テーブルと同じデータからチャートデータを作成
        const buildChartData = (segs: Record<string, SegmentStats | SegmentStatsPct>, priceRanges: PriceRangeData[]) => {
          return tSegs.map(seg => {
            const stats = segs[seg.key];
            const value = displayMode === 'amount'
              ? (stats as SegmentStats)?.profit ?? 0
              : (stats as SegmentStatsPct)?.meanPct ?? 0;
            const winRate = stats?.winRate ?? 0;

            // 価格帯別内訳
            const byPR: Record<string, number> = {};
            priceRanges.forEach(pr => {
              const prSegs = getSegs(pr.segments11, pr.segments4, pr.pctSegments11, pr.pctSegments4);
              const prStats = prSegs[seg.key];
              byPR[pr.label] = displayMode === 'amount'
                ? (prStats as SegmentStats)?.profit ?? 0
                : (prStats as SegmentStatsPct)?.meanPct ?? 0;
            });

            return { time: seg.label, value, winRate, ...byPR };
          });
        };

        // 個別銘柄データから分布を計算（信用区分×価格帯別）
        const buildDistribution = (marginType: string, filterFn?: (s: DetailStock) => boolean) => {
          const stocks = filteredStocks.filter(s => {
            if (s.marginType !== marginType) return false;
            if (filterFn && !filterFn(s)) return false;
            return true;
          });

          // 価格帯別に分布を計算
          const priceRangeGroups = PRICE_RANGE_LABELS.map(pr => {
            const prStocks = stocks.filter(s => s.priceRange === pr);
            const segData = tSegs.map(seg => {
              const values = prStocks
                .map(s => s.segments[seg.key])
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

          // 全体の分布
          const allSegData = tSegs.map(seg => {
            const values = stocks
              .map(s => s.segments[seg.key])
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

          // 価格帯ごとの全時間帯まとめた分布（箱ひげ1本ずつ）
          const summaryByPR = PRICE_RANGE_LABELS.map(pr => {
            const prStocks = stocks.filter(s => s.priceRange === pr);
            // 全時間帯の全値を1つにまとめる（銘柄×セグメントのフラット配列）
            // ここでは「最終損益（最後のseg）」を代表値とする
            const lastSegKey = tSegs[tSegs.length - 1]?.key;
            const values = prStocks
              .map(s => lastSegKey ? s.segments[lastSegKey] : null)
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
          p90: 'rgba(251,113,133,0.35)',   // 即利確ゾーン
          q3:  'rgba(251,191,36,0.25)',     // 利確検討ゾーン
          median: 'rgba(255,255,255,0.1)', // 平均的ゾーン
          q1:  'rgba(96,165,250,0.2)',     // 静観ゾーン
        };

         
        type DistSegData = typeof seidoDist.all;

        const renderDistChart = (segData: DistSegData, _label: string) => (
          <div className="mb-4">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={segData} margin={{ top: 5, right: 40, bottom: 5, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="time" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                <YAxis yAxisId="val" tick={{ fill: '#a1a1aa', fontSize: 12 }} tickFormatter={(v) => formatProfit(Math.round(v))} />
                <YAxis yAxisId="wr" orientation="right" domain={[0, 100]} tick={{ fill: '#a1a1aa', fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                <ReferenceLine yAxisId="val" y={0} stroke="rgba(255,255,255,0.2)" />
                <ReferenceLine yAxisId="wr" y={50} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <Tooltip
                  contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any) => {
                    if (name === '勝率') return [`${Number(value).toFixed(1)}%`, name];
                    return [`¥${formatProfit(Math.round(value))}`, name];
                  }}
                />
                {/* 分布バンド: P10-P90 */}
                <Bar yAxisId="val" dataKey="p10" stackId="band" fill="transparent" />
                <Bar yAxisId="val" dataKey={(d: DistSegData[0]) => d.q1 - d.p10} stackId="band" fill={bandColors.q1} name="P10-Q1（損切り検討）" />
                <Bar yAxisId="val" dataKey={(d: DistSegData[0]) => d.median - d.q1} stackId="band" fill={bandColors.median} name="Q1-中央値（静観）" />
                <Bar yAxisId="val" dataKey={(d: DistSegData[0]) => d.q3 - d.median} stackId="band" fill={bandColors.q3} name="中央値-Q3（利確検討）" />
                <Bar yAxisId="val" dataKey={(d: DistSegData[0]) => d.p90 - d.q3} stackId="band" fill={bandColors.p90} name="Q3-P90（即利確）" />
                {/* Key lines */}
                <Line yAxisId="val" type="monotone" dataKey="mean" stroke="#60a5fa" strokeWidth={2.5} dot={{ fill: '#60a5fa', r: 4 }} name="平均" />
                <Line yAxisId="val" type="monotone" dataKey="median" stroke="#fbbf24" strokeWidth={2.5} strokeDasharray="5 3" dot={{ fill: '#fbbf24', r: 4 }} name="中央値" />
                <Line yAxisId="val" type="monotone" dataKey="p90" stroke="#fb7185" strokeWidth={1.5} strokeDasharray="4 2" dot={{ fill: '#fb7185', r: 2 }} name="P90" />
                <Line yAxisId="val" type="monotone" dataKey="q3" stroke="rgba(251,191,36,0.7)" strokeWidth={1.5} strokeDasharray="4 2" dot={{ fill: '#fbbf24', r: 2 }} name="Q3" />
                <Line yAxisId="val" type="monotone" dataKey="q1" stroke="rgba(96,165,250,0.7)" strokeWidth={1.5} strokeDasharray="4 2" dot={{ fill: '#60a5fa', r: 2 }} name="Q1" />
                <Line yAxisId="val" type="monotone" dataKey="p10" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="4 2" dot={{ fill: '#a78bfa', r: 2 }} name="P10" />
                <Line yAxisId="wr" type="monotone" dataKey="winRate" stroke="#34d399" strokeWidth={2.5} dot={{ fill: '#34d399', r: 4 }} name="勝率" />
              </ComposedChart>
            </ResponsiveContainer>
            {/* 分布テーブル */}
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
                      <td className={`text-right px-2 py-2.5 tabular-nums ${d.p90 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatProfit(Math.round(d.p90))}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums ${d.q3 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatProfit(Math.round(d.q3))}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums font-semibold ${d.median >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatProfit(Math.round(d.median))}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums font-semibold ${d.mean >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>{formatProfit(Math.round(d.mean))}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums ${d.q1 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatProfit(Math.round(d.q1))}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums ${d.p10 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatProfit(Math.round(d.p10))}</td>
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

            {/* 価格帯別 P&L分布サマリー（箱ひげ1本ずつ） */}
            <h3 className="text-xs text-muted-foreground mb-2">価格帯別 P&L分布（大引け基準）</h3>
            <ResponsiveContainer width="100%" height={Math.max(200, dist.summaryByPR.length * 50 + 40)}>
              <ComposedChart data={dist.summaryByPR} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <YAxis dataKey="label" type="category" tick={{ fill: '#fafafa', fontSize: 13 }} width={110} />
                <XAxis type="number" tick={{ fill: '#a1a1aa', fontSize: 12 }} tickFormatter={(v) => formatProfit(Math.round(v))} />
                <ReferenceLine x={0} stroke="rgba(255,255,255,0.2)" />
                <Tooltip
                  contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any) => {
                    if (name === '勝率') return [`${Number(value).toFixed(1)}%`, name];
                    return [`¥${formatProfit(Math.round(value))}`, name];
                  }}
                />
                {/* 箱ひげの帯: P10→Q1→中央値→Q3→P90 */}
                <Bar dataKey="p10" stackId="box" fill="transparent" name="P10" />
                <Bar dataKey={(d: typeof dist.summaryByPR[0]) => d.q1 - d.p10} stackId="box" fill={bandColors.q1} name="P10-Q1（損切り検討）" />
                <Bar dataKey={(d: typeof dist.summaryByPR[0]) => d.median - d.q1} stackId="box" fill={bandColors.median} name="Q1-中央値（静観）" />
                <Bar dataKey={(d: typeof dist.summaryByPR[0]) => d.q3 - d.median} stackId="box" fill={bandColors.q3} name="中央値-Q3（利確検討）" />
                <Bar dataKey={(d: typeof dist.summaryByPR[0]) => d.p90 - d.q3} stackId="box" fill={bandColors.p90} name="Q3-P90（即利確）" />
              </ComposedChart>
            </ResponsiveContainer>

            {/* 分布サマリーテーブル */}
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
                        <td className={`text-right px-2 py-2.5 tabular-nums ${d.p90 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatProfit(Math.round(d.p90))}</td>
                        <td className={`text-right px-2 py-2.5 tabular-nums ${d.q3 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatProfit(Math.round(d.q3))}</td>
                        <td className={`text-right px-2 py-2.5 tabular-nums font-semibold ${d.median >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatProfit(Math.round(d.median))}</td>
                        <td className={`text-right px-2 py-2.5 tabular-nums font-semibold ${d.mean >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>{formatProfit(Math.round(d.mean))}</td>
                        <td className={`text-right px-2 py-2.5 tabular-nums ${d.q1 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatProfit(Math.round(d.q1))}</td>
                        <td className={`text-right px-2 py-2.5 tabular-nums ${d.p10 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatProfit(Math.round(d.p10))}</td>
                        <td className={`text-right px-2 py-2.5 tabular-nums ${d.winRate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{d.winRate.toFixed(1)}%</td>
                        <td className="text-right px-2 py-2.5 tabular-nums text-amber-400">{formatProfit(Math.round(iqr))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 時間帯別の分布（折りたたみ） */}
            <details className="mt-4">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                時間帯別分布を表示 ▶
              </summary>
              <div className="mt-2">
                <p className="text-[10px] text-muted-foreground/60 mb-2">
                  赤帯=即利確(Q3-P90) / 黄帯=利確検討(中央値-Q3) / 灰帯=静観(Q1-中央値) / 青帯=損切り検討(P10-Q1)
                </p>
                {renderDistChart(dist.all, '全体')}

                {/* 価格帯別の時間帯分布 */}
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
          P&L寄与度（パレート図）
          <span className="text-xs ml-2 text-muted-foreground/70">
            特定銘柄依存 or 均等分散を判定
          </span>
        </h2>
        {/* Segment selector for Pareto */}
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
            <YAxis yAxisId="pnl" tick={{ fill: '#a1a1aa', fontSize: 10 }} tickFormatter={(v) => fmt(v)} />
            <YAxis yAxisId="cum" orientation="right" domain={[0, 100]} tick={{ fill: '#a1a1aa', fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
            <ReferenceLine yAxisId="pnl" y={0} stroke="rgba(255,255,255,0.15)" />
            <Tooltip
              contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 11, color: '#fafafa' }}
              labelStyle={{ color: '#a1a1aa' }}
              itemStyle={{ color: '#fafafa' }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => {
                if (name === '累積寄与') return [`${value.toFixed(1)}%`, name];
                return [`¥${fmt(value)}`, name];
              }}
              labelFormatter={(label) => {
                const item = paretoData[Number(label) - 1];
                return item ? `#${label} ${item.ticker} ${item.name} (${item.date})` : `#${label}`;
              }}
            />
            <Bar yAxisId="pnl" dataKey="pnl" name="損益" radius={[2, 2, 0, 0]}>
              {paretoData.slice(0, 30).map((entry, idx) => (
                <Cell key={idx} fill={entry.pnl >= 0 ? 'rgba(52,211,153,0.6)' : 'rgba(251,113,133,0.6)'} />
              ))}
            </Bar>
            <Line yAxisId="cum" type="monotone" dataKey="cumPct" stroke="#60a5fa" strokeWidth={2} dot={false} name="累積寄与" />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Pareto insight */}
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

        const stocksWithGap = filteredStocks
          .filter(s => s.buyPrice && s.prevClose && s.prevClose > 0)
          .map(s => ({
            ...s,
            gapPct: ((s.buyPrice! - s.prevClose!) / s.prevClose!) * 100,
          }));

        const lastSegKey = segments[segments.length - 1]?.key;
        const amSegKey = 'seg_1130';

        const gapData = GAP_BUCKETS.map(bucket => {
          const group = stocksWithGap.filter(s => s.gapPct >= bucket.min && s.gapPct < bucket.max);
          const finalPnls = group.map(s => lastSegKey ? s.segments[lastSegKey] ?? 0 : 0);
          const amPnls = group.map(s => s.segments[amSegKey] ?? 0);
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
                <YAxis yAxisId="val" tick={{ fill: '#a1a1aa', fontSize: 12 }} tickFormatter={(v) => formatProfit(Math.round(v))} />
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
                    return [`¥${formatProfit(Math.round(value))}`, name];
                  }}
                />
                <Bar yAxisId="val" dataKey="meanFinal" name="平均損益（大引け）" radius={[3, 3, 0, 0]}>
                  {gapData.map((d, i) => (
                    <Cell key={i} fill={d.meanFinal >= 0 ? 'rgba(52,211,153,0.6)' : 'rgba(251,113,133,0.6)'} />
                  ))}
                </Bar>
                <Line yAxisId="val" type="monotone" dataKey="medianFinal" stroke="#fbbf24" strokeWidth={2.5} strokeDasharray="5 3" dot={{ fill: '#fbbf24', r: 4 }} name="中央値（大引け）" />
                <Line yAxisId="val" type="monotone" dataKey="meanAM" stroke="#a78bfa" strokeWidth={2} dot={{ fill: '#a78bfa', r: 3 }} name="平均損益（前場引け）" />
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
                      <td className={`text-right px-2 py-2.5 tabular-nums ${d.meanAM >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatProfit(Math.round(d.meanAM))}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums font-semibold ${d.meanFinal >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>{formatProfit(Math.round(d.meanFinal))}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums font-semibold ${d.medianFinal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatProfit(Math.round(d.medianFinal))}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums ${d.p90 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatProfit(Math.round(d.p90))}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums ${d.q3 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatProfit(Math.round(d.q3))}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums ${d.q1 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatProfit(Math.round(d.q1))}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums ${d.p10 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatProfit(Math.round(d.p10))}</td>
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

        const stocksWithAM = filteredStocks
          .filter(s => s.segments[amKey] !== null && s.segments[amKey] !== undefined
                    && s.segments[lastKey] !== null && s.segments[lastKey] !== undefined)
          .map(s => ({
            ...s,
            amPnl: s.segments[amKey]!,
            finalPnl: s.segments[lastKey]!,
          }));

        // 前場でプラス/マイナスに分類
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

          // 時間帯別推移
          const segTransition = segments.map(seg => {
            const vals = group.map(s => s.segments[seg.key]).filter((v): v is number => v !== null);
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

            {/* 遷移サマリーテーブル */}
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
                      <td className={`text-right px-2 py-2.5 tabular-nums ${t.avgAM >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatProfit(Math.round(t.avgAM))}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums font-semibold ${t.avgFinal >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>{formatProfit(Math.round(t.avgFinal))}</td>
                      <td className={`text-right px-2 py-2.5 tabular-nums font-semibold ${t.medianFinal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatProfit(Math.round(t.medianFinal))}</td>
                      <td className="text-right px-2 py-2.5 tabular-nums text-emerald-400">{t.finalPlus}({t.maintainRate.toFixed(0)}%)</td>
                      <td className="text-right px-2 py-2.5 tabular-nums text-rose-400">{t.finalMinus}({t.reverseRate.toFixed(0)}%)</td>
                      <td className="text-right px-2 py-2.5 tabular-nums text-emerald-400">{t.improvedRate.toFixed(1)}%</td>
                      <td className="text-right px-2 py-2.5 tabular-nums text-rose-400">{t.worsenedRate.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 前場プラス/マイナスの時間帯別推移チャート */}
            {transitions.filter(t => t.count > 0).map(t => (
              <div key={t.label} className="mb-4">
                <h3 className="text-sm text-foreground mb-2 font-semibold">{t.label}（{t.count}件）→ 時間帯別推移</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={t.segTransition} margin={{ top: 5, right: 40, bottom: 5, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="time" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                    <YAxis yAxisId="val" tick={{ fill: '#a1a1aa', fontSize: 12 }} tickFormatter={(v) => formatProfit(Math.round(v))} />
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
                        return [`¥${formatProfit(Math.round(value))}`, name];
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
    </div>
  );
}
