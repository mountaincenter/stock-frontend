'use client';

import { useEffect, useState, Fragment } from 'react';
import { DevNavLinks } from '../../../components/dev';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface SegStat {
  label: string;
  pnl: number;
  wr: number;
  count: number;
}

interface GradeWeekday {
  name: string;
  count: number;
  segs: SegStat[];
}

interface GradeStat {
  grade: string;
  count: number;
  segs: SegStat[];
  weekdays: GradeWeekday[];
}

interface MonthlyGrade {
  [grade: string]: { count: number; segs: SegStat[] };
}

interface MonthlyData {
  month: string;
  grades: MonthlyGrade;
}

interface SummaryData {
  dateRange: string;
  totalRecords: number;
  wfcvRecords: number;
  modelInfo: {
    auc: number | null;
    featureCount: number;
    boundaries: number[];
  };
  gradeStats: GradeStat[];
  gradeStatsByMargin: {
    seido: GradeStat[];
    ichinichi: GradeStat[];
    ichinichiEx0: GradeStat[];
  };
  marginCounts: {
    seido: number;
    ichinichi: number;
    ichinichiEx0: number;
  };
  monthly: MonthlyData[];
  monthlyEx0: MonthlyData[];
}

type IchiFilter = 'all' | 'ex0';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

const GRADE_KEYS = ['G1', 'G2', 'G3', 'G4', 'G1+G2', '全体'];

// Color helpers (analysis と統一)
const profitClass = (val: number) =>
  val > 0 ? 'text-price-up' : val < 0 ? 'text-price-down' : 'text-foreground';

const winrateClass = (rate: number) =>
  rate > 50 ? 'text-price-up' : rate < 50 ? 'text-price-down' : 'text-foreground';

const formatProfit = (val: number) => {
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val.toLocaleString()}`;
};

const getQuadrantClasses = (me: number, p1: number, ae: number, p2: number): [string, string, string, string] => {
  const values = [me, p1, ae, p2];
  const positives = values.filter(v => v > 0);
  const negatives = values.filter(v => v < 0);
  const WHITE = 'text-foreground';
  const GREEN = 'text-price-up';
  const RED = 'text-price-down';

  if (positives.length === 4) {
    const maxVal = Math.max(...values);
    return values.map(v => v === maxVal ? GREEN : WHITE) as [string, string, string, string];
  }
  if (negatives.length === 4) {
    const minVal = Math.min(...values);
    return values.map(v => v === minVal ? RED : WHITE) as [string, string, string, string];
  }
  if (positives.length === 0 && negatives.length === 0) {
    return [WHITE, WHITE, WHITE, WHITE];
  }
  const maxPositive = positives.length > 0 ? Math.max(...positives) : null;
  const minNegative = negatives.length > 0 ? Math.min(...negatives) : null;
  return values.map(v => {
    if (v > 0 && v === maxPositive) return GREEN;
    if (v < 0 && v === minNegative) return RED;
    return WHITE;
  }) as [string, string, string, string];
};

const gradeRowBg = (g: string) => {
  if (g === 'G1') return 'bg-emerald-950/30';
  if (g === 'G2') return 'bg-emerald-950/15';
  if (g === 'G3') return '';
  if (g === 'G4') return 'bg-rose-950/15';
  if (g === 'G1+G2') return 'bg-emerald-900/20 border-t border-border/50';
  return 'border-t border-border/40';
};

const gradeLabelCls = (g: string) => {
  if (g === 'G1') return 'text-emerald-400 font-bold';
  if (g === 'G2') return 'text-emerald-500';
  if (g === 'G3') return 'text-muted-foreground';
  if (g === 'G4') return 'text-rose-400';
  if (g === 'G1+G2') return 'text-emerald-300 font-bold';
  return 'text-foreground font-bold';
};

/* 4seg PnL+WR セル描画 */
const SegCells = ({ segs, show }: { segs: SegStat[]; show: boolean }) => {
  const pnlVals = segs.map(s => s.pnl);
  const [meC, p1C, aeC, p2C] = show
    ? getQuadrantClasses(pnlVals[0] ?? 0, pnlVals[1] ?? 0, pnlVals[2] ?? 0, pnlVals[3] ?? 0)
    : ['', '', '', ''];
  const pnlClasses = [meC, p1C, aeC, p2C];

  return (
    <>
      {segs.map((s, i) => (
        <Fragment key={s.label}>
          <td className={`text-right px-2 py-2.5 tabular-nums whitespace-nowrap ${show ? pnlClasses[i] : ''}`}>
            {show ? formatProfit(s.pnl) : <span className="text-muted-foreground/30">-</span>}
          </td>
          <td className={`text-right px-2 py-2.5 tabular-nums ${show ? winrateClass(s.wr) : ''}`}>
            {show ? `${Math.round(s.wr)}%` : <span className="text-muted-foreground/30">-</span>}
          </td>
        </Fragment>
      ))}
    </>
  );
};

/* サマリーPnL表示（text-xl） */
const SummaryPnl = ({ segs }: { segs: SegStat[] }) => {
  const [meC, p1C, aeC, p2C] = segs.length === 4
    ? getQuadrantClasses(segs[0].pnl, segs[1].pnl, segs[2].pnl, segs[3].pnl)
    : ['text-foreground', 'text-foreground', 'text-foreground', 'text-foreground'];
  const cls = [meC, p1C, aeC, p2C];
  return (
    <div className="flex justify-end gap-5 mb-3 pb-3 border-b border-border/30">
      {segs.map((s, i) => (
        <div key={s.label} className="text-right">
          <div className="text-muted-foreground text-sm">{s.label}</div>
          <div className={`text-xl font-bold tabular-nums ${cls[i]}`}>
            {formatProfit(s.pnl)}
          </div>
        </div>
      ))}
    </div>
  );
};

/* Grade別テーブル（曜日カード内で使用） */
const GradeTable = ({ gradeStats, wdIdx }: { gradeStats: GradeStat[]; wdIdx: number }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="text-muted-foreground text-sm border-b border-border/30">
          <th className="text-left px-2 py-2.5 font-medium whitespace-nowrap">Grade</th>
          <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">件</th>
          <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">10:25</th>
          <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">%</th>
          <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">前場引</th>
          <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">%</th>
          <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">14:45</th>
          <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">%</th>
          <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">大引</th>
          <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">%</th>
        </tr>
      </thead>
      <tbody>
        {GRADE_KEYS.map(gn => {
          const gs = gradeStats.find(g => g.grade === gn);
          const wd = gs?.weekdays[wdIdx];
          if (!wd) return null;
          return (
            <tr key={gn} className={`${gradeRowBg(gn)} hover:bg-muted/20 transition-colors border-b border-border/20`}>
              <td className={`px-2 py-2.5 whitespace-nowrap ${gradeLabelCls(gn)}`}>{gn}</td>
              <td className="text-right px-2 py-2.5 tabular-nums text-foreground">{wd.count}</td>
              <SegCells segs={wd.segs} show={wd.count > 0} />
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

/* テーブルヘッダー（共通） */
const TABLE_HEADER = (
  <tr className="text-muted-foreground text-sm border-b border-border/30">
    <th className="text-left px-2 py-2.5 font-medium whitespace-nowrap">Grade</th>
    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">件</th>
    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">10:25</th>
    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">%</th>
    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">前場引</th>
    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">%</th>
    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">14:45</th>
    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">%</th>
    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">大引</th>
    <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">%</th>
  </tr>
);

export default function AnalysisMlPage() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedGrades, setExpandedGrades] = useState<Set<string>>(new Set(['G1+G2']));
  const [showMonthly, setShowMonthly] = useState(true);
  const [topFilter, setTopFilter] = useState<IchiFilter>('all');
  const [monthlyFilter, setMonthlyFilter] = useState<IchiFilter>('all');
  // 曜日ごとのいちにちフィルター (analysis と同じ)
  const [ichiFilters, setIchiFilters] = useState<Record<number, IchiFilter>>({});

  useEffect(() => {
    fetch(`${API_BASE}/api/dev/analysis-ml/summary`)
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleGrade = (g: string) => {
    setExpandedGrades(prev => {
      const next = new Set(prev);
      next.has(g) ? next.delete(g) : next.add(g);
      return next;
    });
  };

  const getIchiFilter = (idx: number): IchiFilter => ichiFilters[idx] || 'all';
  const setIchiFilter = (idx: number, f: IchiFilter) => {
    setIchiFilters(prev => ({ ...prev, [idx]: f }));
  };

  if (loading) {
    return (
      <main className="relative min-h-screen">
        <div className="fixed inset-0 -z-10 bg-background" />
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4 pb-3 border-b border-border/30">
            <div>
              <div className="h-6 w-48 bg-muted/50 rounded mb-2 animate-pulse" />
              <div className="h-4 w-64 bg-muted/50 rounded animate-pulse" />
            </div>
          </div>
          <div className="rounded-xl border border-border/40 bg-card/50 h-64 animate-pulse mb-4" />
          <div className="rounded-xl border border-border/40 bg-card/50 h-48 animate-pulse" />
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="relative min-h-screen">
        <div className="fixed inset-0 -z-10 bg-background" />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-destructive text-sm">Error: {error || 'No data'}</div>
        </div>
      </main>
    );
  }

  // G1+G2のサマリー用（全/除0 切替対応）
  // 除0: seido + ichinichiEx0 を合算
  const combineG12Segs = (): { segs: SegStat[]; count: number; seidoCount: number; ichiCount: number } => {
    if (topFilter === 'all') {
      const g12 = data.gradeStats.find(gs => gs.grade === 'G1+G2');
      return {
        segs: g12?.segs || [],
        count: g12?.count ?? 0,
        seidoCount: data.marginCounts.seido,
        ichiCount: data.marginCounts.ichinichi,
      };
    }
    // 除0: seido + ichinichiEx0
    const seidoG12 = data.gradeStatsByMargin.seido.find(g => g.grade === 'G1+G2');
    const ichiG12 = data.gradeStatsByMargin.ichinichiEx0.find(g => g.grade === 'G1+G2');
    const sSegs = seidoG12?.segs || [];
    const iSegs = ichiG12?.segs || [];
    const segs: SegStat[] = sSegs.map((s, idx) => {
      const is = iSegs[idx];
      const pnl = s.pnl + (is?.pnl ?? 0);
      const sC = s.count;
      const iC = is?.count ?? 0;
      const wr = (sC + iC) > 0 ? (s.wr * sC + (is?.wr ?? 0) * iC) / (sC + iC) : 0;
      return { label: s.label, pnl, wr, count: sC + iC };
    });
    return {
      segs,
      count: (seidoG12?.count ?? 0) + (ichiG12?.count ?? 0),
      seidoCount: data.marginCounts.seido,
      ichiCount: data.marginCounts.ichinichiEx0,
    };
  };
  const g12Data = combineG12Segs();
  const g12Segs = g12Data.segs;
  const [g12MeC, g12P1C, g12AeC, g12P2C] = g12Segs.length === 4
    ? getQuadrantClasses(g12Segs[0].pnl, g12Segs[1].pnl, g12Segs[2].pnl, g12Segs[3].pnl)
    : ['text-foreground', 'text-foreground', 'text-foreground', 'text-foreground'];
  const g12Classes = [g12MeC, g12P1C, g12AeC, g12P2C];

  return (
    <main className="relative min-h-screen">
      <div className="fixed inset-0 -z-10 bg-background" />

      <div className="max-w-7xl mx-auto px-4 py-4 leading-[1.8] tracking-[0.02em] font-sans">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4 pb-3 border-b border-border/30">
          <div>
            <h1 className="text-xl font-bold text-foreground">ML Grade分析</h1>
            <p className="text-muted-foreground text-sm">
              {data.dateRange} ({data.totalRecords}件 / WFCV: {data.wfcvRecords})
              {data.modelInfo.auc && <span className="ml-2">AUC: {data.modelInfo.auc.toFixed(3)}</span>}
              <span className="ml-2">{data.modelInfo.featureCount}特徴量</span>
            </p>
          </div>
          <DevNavLinks />
        </header>

        {/* G1+G2 サマリーカード (analysis の総件数+4seg と同じ5カード横並び) */}
        <section className="mb-6">
          <h2 className="text-sm md:text-base font-semibold text-foreground mb-3">G1+G2 SHORT合計</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* 総件数カード */}
            <div className="rounded-xl border border-border bg-card p-4">
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
                    >全</button>
                    <button
                      onClick={() => setTopFilter('ex0')}
                      className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                        topFilter === 'ex0'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
                      }`}
                    >除0</button>
                  </div>
                </div>
                <div className="text-2xl font-bold text-right tabular-nums text-foreground">{g12Data.count}</div>
                <div className="text-muted-foreground text-xs text-right mt-1">
                  制度{g12Data.seidoCount} / いちにち{g12Data.ichiCount}
                </div>
              </div>
            </div>

            {/* 4seg カード */}
            {g12Segs.map((s, i) => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-4">
                  <div className="relative">
                  <div className="flex items-center mb-2">
                    <span className="text-muted-foreground text-sm">{s.label}</span>
                  </div>
                  <div className={`text-2xl font-bold text-right tabular-nums whitespace-nowrap ${g12Classes[i]}`}>
                    {formatProfit(s.pnl)}円
                  </div>
                  <div className={`text-xs text-right mt-1 ${winrateClass(s.wr)}`}>
                    勝率 {Math.round(s.wr)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Grade別サマリー (combined) */}
        <section className="mb-6">
          <h2 className="text-sm md:text-base font-semibold text-foreground mb-3">Grade別サマリー (SHORT)</h2>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>{TABLE_HEADER}</thead>
                <tbody>
                  {data.gradeStats.map(gs => (
                    <Fragment key={gs.grade}>
                      <tr
                        className={`${gradeRowBg(gs.grade)} hover:bg-muted/20 cursor-pointer transition-colors border-b border-border/20`}
                        onClick={() => toggleGrade(gs.grade)}
                      >
                        <td className={`px-2 py-2.5 whitespace-nowrap ${gradeLabelCls(gs.grade)}`}>
                          <span className="inline-flex items-center gap-1">
                            {expandedGrades.has(gs.grade)
                              ? <ChevronDown className="w-3.5 h-3.5" />
                              : <ChevronRight className="w-3.5 h-3.5" />}
                            {gs.grade}
                          </span>
                        </td>
                        <td className="text-right px-2 py-2.5 tabular-nums text-foreground">{gs.count}</td>
                        <SegCells segs={gs.segs} show={true} />
                      </tr>

                      {expandedGrades.has(gs.grade) && gs.weekdays.map(wd => (
                        <tr key={`${gs.grade}-${wd.name}`} className="border-b border-border/20">
                          <td className="px-2 py-2.5 pl-9 text-muted-foreground whitespace-nowrap">{wd.name}</td>
                          <td className="text-right px-2 py-2.5 tabular-nums text-foreground">{wd.count}</td>
                          <SegCells segs={wd.segs} show={wd.count > 0} />
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 曜日別（制度/いちにちカード構成 = analysis と同じ） */}
        {['月', '火', '水', '木', '金'].map((wdName, wdIdx) => {
          const ichiFilter = getIchiFilter(wdIdx);
          const ichiStats = ichiFilter === 'ex0'
            ? data.gradeStatsByMargin.ichinichiEx0
            : data.gradeStatsByMargin.ichinichi;
          const ichiCount = ichiFilter === 'ex0'
            ? data.marginCounts.ichinichiEx0
            : data.marginCounts.ichinichi;

          // 制度 G1+G2 サマリー
          const seidoG12 = data.gradeStatsByMargin.seido.find(g => g.grade === 'G1+G2');
          const seidoG12Segs = seidoG12?.weekdays[wdIdx]?.segs || [];
          // いちにち G1+G2 サマリー
          const ichiG12 = ichiStats.find(g => g.grade === 'G1+G2');
          const ichiG12Segs = ichiG12?.weekdays[wdIdx]?.segs || [];

          return (
            <section key={wdName} className="mb-6">
              <h2 className="text-sm font-semibold text-foreground mb-3">{wdName}曜</h2>
              <div className="grid grid-cols-1 gap-4">
                {/* 制度信用カード */}
                <div className="rounded-xl border border-border bg-card p-4">
                      <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-semibold text-lg text-foreground">制度信用</span>
                      <span className="text-muted-foreground text-base">
                        {seidoG12?.weekdays[wdIdx]?.count ?? 0}件
                      </span>
                    </div>
                    {seidoG12Segs.length === 4 && <SummaryPnl segs={seidoG12Segs} />}
                    <GradeTable gradeStats={data.gradeStatsByMargin.seido} wdIdx={wdIdx} />
                  </div>
                </div>

                {/* いちにち信用カード */}
                <div className="rounded-xl border border-border bg-card p-4">
                      <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-semibold text-lg text-foreground">いちにち信用</span>
                      <span className="text-muted-foreground text-base">
                        {ichiG12?.weekdays[wdIdx]?.count ?? 0}件
                      </span>
                      <div className="flex gap-1 ml-auto">
                        <button
                          onClick={() => setIchiFilter(wdIdx, 'all')}
                          className={`px-2.5 py-1 text-sm rounded border transition-colors ${
                            ichiFilter === 'all'
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
                          }`}
                        >
                          全数
                        </button>
                        <button
                          onClick={() => setIchiFilter(wdIdx, 'ex0')}
                          className={`px-2.5 py-1 text-sm rounded border transition-colors ${
                            ichiFilter === 'ex0'
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
                          }`}
                        >
                          除0
                        </button>
                      </div>
                    </div>
                    {ichiG12Segs.length === 4 && <SummaryPnl segs={ichiG12Segs} />}
                    <GradeTable gradeStats={ichiStats} wdIdx={wdIdx} />
                  </div>
                </div>
              </div>
            </section>
          );
        })}

        {/* 月別推移 */}
        <section className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <h2
              className="text-sm md:text-base font-semibold text-foreground cursor-pointer flex items-center gap-1"
              onClick={() => setShowMonthly(!showMonthly)}
            >
              {showMonthly ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              月別推移
            </h2>
            <div className="flex gap-1">
              <button
                onClick={() => setMonthlyFilter('all')}
                className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                  monthlyFilter === 'all'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
                }`}
              >全</button>
              <button
                onClick={() => setMonthlyFilter('ex0')}
                className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                  monthlyFilter === 'ex0'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'
                }`}
              >除0</button>
            </div>
          </div>
          {showMonthly && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="relative overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground text-sm border-b border-border/30">
                      <th className="text-left px-2 py-2.5 font-medium whitespace-nowrap">月</th>
                      <th className="text-left px-2 py-2.5 font-medium whitespace-nowrap">Grade</th>
                      <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">件</th>
                      <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">10:25</th>
                      <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">%</th>
                      <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">前場引</th>
                      <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">%</th>
                      <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">14:45</th>
                      <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">%</th>
                      <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">大引</th>
                      <th className="text-right px-2 py-2.5 font-medium whitespace-nowrap">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(monthlyFilter === 'ex0' ? data.monthlyEx0 : data.monthly).map(m => (
                      <Fragment key={m.month}>
                        {['G1+G2', 'G3', 'G4', '全体'].map((gn, gi) => {
                          const gs = m.grades[gn];
                          if (!gs) return null;
                          return (
                            <tr
                              key={`${m.month}-${gn}`}
                              className={`${gi === 0 ? 'border-t border-border/40' : ''} ${gradeRowBg(gn)} hover:bg-muted/20 transition-colors border-b border-border/20`}
                            >
                              <td className="px-2 py-2.5 text-muted-foreground whitespace-nowrap">{gi === 0 ? m.month : ''}</td>
                              <td className={`px-2 py-2.5 whitespace-nowrap ${gradeLabelCls(gn)}`}>{gn}</td>
                              <td className="text-right px-2 py-2.5 tabular-nums text-foreground">{gs.count}</td>
                              <SegCells segs={gs.segs} show={gs.count > 0} />
                            </tr>
                          );
                        })}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* 解釈ガイド */}
        <div className="text-xs text-muted-foreground/60 space-y-0.5">
          <p>※ Walk-Forward CV (out-of-sample) 予測。in-sampleではない</p>
          <p>※ G1+G2 = 機械的SHORT推奨 / G3 = 裁量 / G4 = SKIP</p>
          <p>※ analysisと同じフィルター適用（11/4~, 制度信用 or いちにち信用）</p>
          <p>※ 除0 = 12/22以降のいちにち信用 在庫0件を除外</p>
        </div>
      </div>
    </main>
  );
}
