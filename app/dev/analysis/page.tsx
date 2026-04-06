'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { DevNavLinks } from '../../../components/dev';

// ---- Types ----
interface SegmentStats {
  profit: number; winRate: number | null; count: number; mean: number | null; pf: number | null;
}
interface SegmentStatsPct {
  pctReturn: number; winRate: number | null; count: number; meanPct: number | null; pf: number | null;
}
interface TimeSegment { key: string; label: string; time: string; }

interface MarginStats {
  count: number;
  segments4: Record<string, SegmentStats>;
  segments11: Record<string, SegmentStats>;
  pctSegments4: Record<string, SegmentStatsPct>;
  pctSegments11: Record<string, SegmentStatsPct>;
}

interface WeekdayRow {
  weekday: string; count: number;
  seido: MarginStats; ichinichi: MarginStats; ichinichi_ex0: MarginStats;
}

interface BlockData {
  count: number;
  seido: MarginStats; ichinichi: MarginStats; ichinichi_ex0: MarginStats;
  weekdays: WeekdayRow[];
}

interface ApiResponse {
  generatedAt: string;
  timeSegments4: TimeSegment[];
  timeSegments11: TimeSegment[];
  dateRange: { from: string; to: string; tradingDays: number };
  overall: BlockData;
  buckets: { SHORT?: BlockData; DISC?: BlockData; LONG?: BlockData };
  excludeExtreme: boolean;
  filters: { priceMin: number; priceMax: number; priceStep: number };
  thresholds: { short: number; long: number };
}

type SegMode = '4seg' | '11seg';
type DisplayMode = 'amount' | 'pct';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

// ---- Formatters ----
const fmt = (v: number) => v >= 0 ? `+${v.toLocaleString()}` : v.toLocaleString();
const fmtPct = (v: number | null) => v == null ? '-' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
const fmtPF = (pf: number | null) => pf == null ? '-' : pf.toFixed(2);
const pfCls = (pf: number | null) => pf == null ? 'text-muted-foreground' : pf >= 1.5 ? 'text-emerald-400' : pf >= 1.2 ? 'text-sky-400' : pf >= 1.0 ? 'text-foreground' : 'text-rose-400';
const valCls = (v: number) => v > 0 ? 'text-emerald-400' : v < 0 ? 'text-rose-400' : 'text-foreground';

// ---- Helpers ----
function getSegs(mode: SegMode, segs4: TimeSegment[], segs11: TimeSegment[]) {
  return mode === '4seg' ? segs4 : segs11;
}
function getStats(ms: MarginStats, mode: SegMode, disp: DisplayMode, key: string) {
  if (disp === 'amount') return mode === '4seg' ? ms.segments4[key] : ms.segments11[key];
  return mode === '4seg' ? ms.pctSegments4[key] : ms.pctSegments11[key];
}
function dispVal(stats: SegmentStats | SegmentStatsPct | undefined, disp: DisplayMode): number {
  if (!stats) return 0;
  return disp === 'amount' ? (stats as SegmentStats).profit ?? 0 : (stats as SegmentStatsPct).meanPct ?? 0;
}

// ---- Sub-components ----
function SegCards({ ms, segs, mode, disp }: { ms: MarginStats; segs: TimeSegment[]; mode: SegMode; disp: DisplayMode }) {
  return (
    <div className="flex gap-3 flex-wrap">
      {segs.map(seg => {
        const stats = getStats(ms, mode, disp, seg.key);
        const v = dispVal(stats, disp);
        const pf = stats?.pf ?? null;
        const wr = stats?.winRate ?? null;
        return (
          <div key={seg.key} className="flex-1 min-w-25 rounded-lg border border-border/30 bg-card/60 p-3 text-right">
            <div className="text-muted-foreground text-xs mb-1">{seg.label}</div>
            <div className={`text-lg font-bold tabular-nums ${valCls(v)}`}>
              {disp === 'amount' ? fmt(v) : fmtPct(v)}
            </div>
            <div className={`text-xs ${pfCls(pf)}`}>PF {fmtPF(pf)}</div>
            <div className="text-xs text-muted-foreground">{wr != null ? `${Math.round(wr)}%` : '-'}</div>
          </div>
        );
      })}
    </div>
  );
}

function MarginSection({
  label, ms, segs, mode, disp, showEx0Toggle, ex0, onToggleEx0,
}: {
  label: string; ms: MarginStats; segs: TimeSegment[]; mode: SegMode; disp: DisplayMode;
  showEx0Toggle?: boolean; ex0?: boolean; onToggleEx0?: () => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{ms.count}件</span>
        {showEx0Toggle && (
          <button
            onClick={onToggleEx0}
            className={`px-2 py-0.5 text-xs rounded border transition-colors ${
              ex0 ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-muted/30 text-muted-foreground border-border/30'
            }`}
          >
            除0
          </button>
        )}
      </div>
      <SegCards ms={ms} segs={segs} mode={mode} disp={disp} />
    </div>
  );
}

function WeekdayTable({
  weekdays, segs, mode, disp, ex0,
}: {
  weekdays: WeekdayRow[]; segs: TimeSegment[]; mode: SegMode; disp: DisplayMode; ex0: boolean;
}) {
  const WEEKDAY_SHORTS = ['月', '火', '水', '木', '金'];
  return (
    <div className="overflow-x-auto mt-3">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border/30 text-muted-foreground">
            <th className="text-left px-2 py-1.5 w-8">曜</th>
            <th className="text-right px-2 py-1.5">制度(n)</th>
            {segs.map(s => <th key={`s-${s.key}`} className="text-right px-2 py-1.5 whitespace-nowrap">{s.label}</th>)}
            <th className="text-right px-2 py-1.5 border-l border-border/20">一日(n)</th>
            {segs.map(s => <th key={`i-${s.key}`} className="text-right px-2 py-1.5 whitespace-nowrap">{s.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {weekdays.map((wd, idx) => {
            const ichiMs = ex0 ? wd.ichinichi_ex0 : wd.ichinichi;
            return (
              <tr key={wd.weekday} className={`border-b border-border/20 ${idx === 2 ? 'opacity-60' : ''}`}>
                <td className="px-2 py-1.5 font-medium text-foreground">{WEEKDAY_SHORTS[idx]}</td>
                <td className="px-2 py-1.5 text-right text-muted-foreground">{wd.seido.count}</td>
                {segs.map(s => {
                  const stats = getStats(wd.seido, mode, disp, s.key);
                  const pf = stats?.pf ?? null;
                  return (
                    <td key={`s-${s.key}`} className="px-2 py-1.5 text-right">
                      <span className={pfCls(pf)}>PF {fmtPF(pf)}</span>
                    </td>
                  );
                })}
                <td className="px-2 py-1.5 text-right text-muted-foreground border-l border-border/20">{ichiMs.count}</td>
                {segs.map(s => {
                  const stats = getStats(ichiMs, mode, disp, s.key);
                  const pf = stats?.pf ?? null;
                  return (
                    <td key={`i-${s.key}`} className="px-2 py-1.5 text-right">
                      <span className={pfCls(pf)}>PF {fmtPF(pf)}</span>
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
}

function BlockSection({
  title, titleColor, data, segs, mode, disp, ex0, onToggleEx0,
}: {
  title: string; titleColor: string; data: BlockData;
  segs: TimeSegment[]; mode: SegMode; disp: DisplayMode; ex0: boolean; onToggleEx0: () => void;
}) {
  const ichiMs = ex0 ? data.ichinichi_ex0 : data.ichinichi;
  return (
    <div className="rounded-xl border border-border/40 bg-card/50 p-4 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <h2 className={`text-base font-bold ${titleColor}`}>{title}</h2>
        <span className="text-xs text-muted-foreground">{data.count}件</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <MarginSection label="制度信用" ms={data.seido} segs={segs} mode={mode} disp={disp} />
        <MarginSection
          label="いちにち信用" ms={ichiMs} segs={segs} mode={mode} disp={disp}
          showEx0Toggle ex0={ex0} onToggleEx0={onToggleEx0}
        />
      </div>
      <WeekdayTable weekdays={data.weekdays} segs={segs} mode={mode} disp={disp} ex0={ex0} />
    </div>
  );
}

// ---- Main Page ----
export default function AnalysisPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [segMode, setSegMode] = useState<SegMode>('4seg');
  const [dispMode, setDispMode] = useState<DisplayMode>('amount');
  const [excludeExtreme, setExcludeExtreme] = useState(false);
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(999999);
  const [priceStep, setPriceStep] = useState(0);
  const [customMin, setCustomMin] = useState('');
  const [customMax, setCustomMax] = useState('');

  // 除0トグル: overall / SHORT / DISC / LONG それぞれ独立
  const [ex0Overall, setEx0Overall] = useState(true);
  const [ex0Short, setEx0Short] = useState(true);
  const [ex0Disc, setEx0Disc] = useState(true);
  const [ex0Long, setEx0Long] = useState(true);

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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [excludeExtreme, priceMin, priceMax, priceStep]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const PRICE_PRESETS = [
    { label: '全価格帯', min: 0, max: 999999 },
    { label: '~500', min: 0, max: 500 },
    { label: '500~1,000', min: 500, max: 1000 },
    { label: '1,000~3,000', min: 1000, max: 3000 },
    { label: '3,000~', min: 3000, max: 999999 },
  ];

  if (loading) return (
    <main className="flex items-center justify-center min-h-screen">
      <div className="text-muted-foreground text-sm animate-pulse">Loading...</div>
    </main>
  );
  if (error || !data) return (
    <main className="flex items-center justify-center min-h-screen">
      <div className="text-rose-400 text-sm">Error: {error || 'No data'}</div>
    </main>
  );

  const segs = getSegs(segMode, data.timeSegments4, data.timeSegments11);
  const { overall, buckets, dateRange, thresholds } = data;

  return (
    <main className="relative min-h-screen">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 font-sans">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4 pb-3 border-b border-border/30">
          <div>
            <h1 className="text-xl font-bold text-foreground">SHORT分析</h1>
            <p className="text-muted-foreground text-sm">
              {dateRange.from} ~ {dateRange.to} ({dateRange.tradingDays}営業日)
              {'　'}SHORT≤{thresholds.short} / LONG≥{thresholds.long}
              {excludeExtreme && <span className="ml-2 text-amber-400">(異常日除外中)</span>}
            </p>
          </div>
          <DevNavLinks />
        </header>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* seg mode */}
          <div className="flex gap-1">
            {(['4seg', '11seg'] as SegMode[]).map(m => (
              <button key={m} onClick={() => setSegMode(m)}
                className={`px-3 py-1 text-xs rounded-md border transition-colors ${segMode === m ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'}`}>
                {m}
              </button>
            ))}
          </div>
          <span className="text-border">|</span>
          {/* disp mode */}
          <div className="flex gap-1">
            {([['amount', '実額'], ['pct', '比率']] as [DisplayMode, string][]).map(([m, l]) => (
              <button key={m} onClick={() => setDispMode(m)}
                className={`px-3 py-1 text-xs rounded-md border transition-colors ${dispMode === m ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50'}`}>
                {l}
              </button>
            ))}
          </div>
          <span className="text-border">|</span>
          {/* extreme */}
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={excludeExtreme} onChange={e => setExcludeExtreme(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-amber-500/50 bg-muted/30 text-amber-500" />
            <span className="text-xs text-amber-400">異常日除外</span>
          </label>
        </div>

        {/* Price presets */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {PRICE_PRESETS.map((p, i) => (
            <button key={i} onClick={() => { setPriceMin(p.min); setPriceMax(p.max); setCustomMin(''); setCustomMax(''); }}
              className={`px-3 py-1 text-xs rounded-md border transition-colors ${priceMin === p.min && priceMax === p.max ? 'bg-muted/50 border-border/60 text-foreground' : 'bg-transparent border-border/30 text-muted-foreground hover:bg-muted/30'}`}>
              {p.label}
            </button>
          ))}
          <span className="text-border mx-1">|</span>
          <input type="number" value={customMin} onChange={e => setCustomMin(e.target.value)}
            placeholder="下限" className="w-20 px-2 py-1 text-xs rounded border border-border/40 bg-muted/30 text-foreground" />
          <span className="text-muted-foreground text-xs">~</span>
          <input type="number" value={customMax} onChange={e => setCustomMax(e.target.value)}
            placeholder="上限" className="w-20 px-2 py-1 text-xs rounded border border-border/40 bg-muted/30 text-foreground" />
          <button onClick={() => {
            if (customMin) setPriceMin(parseInt(customMin));
            if (customMax) setPriceMax(parseInt(customMax));
          }} className="px-3 py-1 text-xs rounded-md border border-primary bg-primary/20 text-primary hover:bg-primary/30">
            適用
          </button>
        </div>

        {/* === Overall === */}
        <BlockSection
          title="全体"
          titleColor="text-foreground"
          data={overall}
          segs={segs}
          mode={segMode}
          disp={dispMode}
          ex0={ex0Overall}
          onToggleEx0={() => setEx0Overall(v => !v)}
        />

        {/* === Buckets === */}
        {buckets.SHORT && (
          <BlockSection
            title={`SHORT bucket (prob ≤ ${thresholds.short})`}
            titleColor="text-rose-400"
            data={buckets.SHORT}
            segs={segs}
            mode={segMode}
            disp={dispMode}
            ex0={ex0Short}
            onToggleEx0={() => setEx0Short(v => !v)}
          />
        )}
        {buckets.DISC && (
          <BlockSection
            title={`DISC bucket (${thresholds.short} < prob ≤ ${thresholds.long})`}
            titleColor="text-amber-400"
            data={buckets.DISC}
            segs={segs}
            mode={segMode}
            disp={dispMode}
            ex0={ex0Disc}
            onToggleEx0={() => setEx0Disc(v => !v)}
          />
        )}
        {buckets.LONG && (
          <BlockSection
            title={`LONG bucket (prob > ${thresholds.long})`}
            titleColor="text-emerald-400"
            data={buckets.LONG}
            segs={segs}
            mode={segMode}
            disp={dispMode}
            ex0={ex0Long}
            onToggleEx0={() => setEx0Long(v => !v)}
          />
        )}

        <div className="mt-4 text-xs text-muted-foreground text-right">
          生成: {new Date(data.generatedAt).toLocaleString('ja-JP')}
          {'　'}
          <Link href="/dev/analysis/exit" className="hover:text-primary">イグジット分析 →</Link>
        </div>
      </div>
    </main>
  );
}
