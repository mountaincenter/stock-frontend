"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Instrument_Serif } from "next/font/google";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { ArrowUpRight, ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "framer-motion";
import { DashboardData } from "@/lib/grok-backtest-types";
import { DevNavLinks } from "@/components/dev";

const serif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

type Phase = "phase1" | "phase2" | "phase3";
type ChartView = "cumulative" | "return" | "winrate";
type SortField = "date" | "win_rate" | "count";
type SortDir = "asc" | "desc";

const PHASES: { key: Phase; label: string; desc: string }[] = [
  { key: "phase1", label: "前場引", desc: "9:00–11:30" },
  { key: "phase2", label: "大引", desc: "9:00–15:30" },
  { key: "phase3", label: "±3%", desc: "利確損切" },
];

function fmt(n: number): string {
  return Math.round(n).toLocaleString();
}
function sign(n: number): string {
  return n >= 0 ? `+${fmt(n)}` : fmt(n);
}

export default function ClaudeDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("phase2");
  const [dateRange, setDateRange] = useState<"all" | "week" | "month">("all");
  const [chartView, setChartView] = useState<ChartView>("cumulative");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    const p = new URLSearchParams({ phase });
    setLoading(true);
    fetch(`${API}/api/dev/backtest/summary?${p}`)
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [phase]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const s = data.daily_stats.slice().sort((a, b) => a.date.localeCompare(b.date));
    return dateRange === "week" ? s.slice(-7) : dateRange === "month" ? s.slice(-30) : s;
  }, [data, dateRange]);

  const stats = useMemo(() => {
    if (!filtered.length || !data) return null;
    if (dateRange === "all") return { all: data.overall_stats, t5: data.top5_stats };
    const tc = filtered.reduce((s, d) => s + (d.count ?? 0), 0);
    const wc = filtered.reduce((s, d) => s + Math.round((d.count ?? 0) * (d.win_rate ?? 0) / 100), 0);
    const tp = filtered.reduce((s, d) => s + (d.total_profit_per_100 ?? 0), 0);
    const t5p = filtered.reduce((s, d) => s + (d.top5_total_profit_per_100 ?? 0), 0);
    const t5c = filtered.length * 5;
    const t5w = filtered.reduce((s, d) => s + Math.round(5 * (d.top5_win_rate ?? 0) / 100), 0);
    return {
      all: { win_rate: tc > 0 ? (wc / tc) * 100 : 0, valid_count: tc, avg_profit_per_100_shares: tc > 0 ? tp / tc : 0, total_profit_per_100_shares: tp, total_days: filtered.length },
      t5: { win_rate: t5c > 0 ? (t5w / t5c) * 100 : 0, avg_profit_per_100_shares: t5c > 0 ? t5p / t5c : 0, total_profit_per_100_shares: t5p },
    };
  }, [data, filtered, dateRange]);

  const chartData = useMemo(() => filtered.map((s) => ({
    d: new Date(s.date).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }),
    avg: s.avg_return ?? 0,
    t5: s.top5_avg_return ?? 0,
    wr: s.win_rate ?? 0,
    cum: s.cumulative_profit_per_100 ?? 0,
    t5c: s.cumulative_top5_profit_per_100 ?? 0,
  })), [filtered]);

  const tableData = useMemo(() => {
    const rows = filtered.filter((s) => s.date.includes(search));
    rows.sort((a, b) => {
      const av = a[sortField] ?? 0, bv = b[sortField] ?? 0;
      return typeof av === "string" && typeof bv === "string"
        ? sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
        : sortDir === "asc" ? Number(av) - Number(bv) : Number(bv) - Number(av);
    });
    return rows.slice(0, 25);
  }, [filtered, search, sortField, sortDir]);

  const toggle = (f: SortField) => {
    if (sortField === f) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(f); setSortDir("desc"); }
  };

  const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" });

  // --- colors ---
  const C = {
    gain: "#166534",     // green-800
    loss: "#b91c1c",     // red-700
    line1: "#1e3a5f",    // navy
    line2: "#9a3412",    // orange-800 (terracotta)
    grid: "#d6d3d1",     // stone-300
    axis: "#a8a29e",     // stone-400
    bg: "#faf8f5",       // warm cream
    card: "#ffffff",
    border: "#e7e5e4",
    text: "#1c1917",
    sub: "#78716c",
    accent: "#c2410c",   // orange-700
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
        <div style={{ color: C.sub, fontSize: 13, letterSpacing: "0.1em" }}>LOADING</div>
      </div>
    );
  }

  if (error || !data || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
        <div style={{ color: C.loss }}>{error || "No data"}</div>
      </div>
    );
  }

  const pl = stats.all.total_profit_per_100_shares;
  const t5pl = stats.t5.total_profit_per_100_shares;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen"
      style={{ background: C.bg, color: C.text }}
    >
      <div className="max-w-[1100px] mx-auto px-5 py-6">

        {/* ===== MASTHEAD ===== */}
        <header className="mb-1">
          <div className="flex items-center justify-between mb-2">
            <DevNavLinks />
            <div style={{ color: C.sub, fontSize: 11 }}>{today}</div>
          </div>

          <div className="border-t-[3px] border-b border-double" style={{ borderColor: C.text }}>
            <div className="py-3 flex items-baseline justify-between">
              <h1 className={`${serif.className} text-4xl sm:text-5xl tracking-tight`} style={{ lineHeight: 1 }}>
                GROK Backtest
              </h1>
              <div className="hidden sm:flex items-baseline gap-4" style={{ fontSize: 12, color: C.sub }}>
                <span>100株単位</span>
                <span className={serif.className} style={{ fontSize: 14, color: C.accent }}>
                  {PHASES.find((p) => p.key === phase)?.label} Edition
                </span>
              </div>
            </div>
          </div>

          {/* Phase + Date range selector — editorial tab style */}
          <div className="flex items-center justify-between pt-2 pb-3 border-b" style={{ borderColor: C.border }}>
            <div className="flex gap-0" style={{ fontSize: 12 }}>
              {PHASES.map(({ key, label, desc }) => (
                <button
                  key={key}
                  onClick={() => setPhase(key)}
                  className="relative px-4 py-1.5 transition-colors"
                  style={{
                    color: phase === key ? C.text : C.sub,
                    fontWeight: phase === key ? 700 : 400,
                    borderBottom: phase === key ? `2px solid ${C.accent}` : "2px solid transparent",
                  }}
                >
                  {label}
                  <span className="hidden sm:inline ml-1" style={{ fontSize: 10, color: C.sub, fontWeight: 400 }}>
                    {desc}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex gap-1" style={{ fontSize: 11 }}>
              {([["week", "7D"], ["month", "30D"], ["all", "ALL"]] as const).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setDateRange(v)}
                  className="px-2.5 py-1 transition-colors"
                  style={{
                    color: dateRange === v ? C.card : C.sub,
                    background: dateRange === v ? C.text : "transparent",
                    fontWeight: dateRange === v ? 600 : 400,
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* ===== KPI TICKER STRIP ===== */}
        <div className="grid grid-cols-3 sm:grid-cols-6 divide-x py-4 mb-1" style={{ borderColor: C.border, fontSize: 11 }}>
          {[
            { label: "累計損益", value: sign(pl), unit: "円", highlight: pl >= 0 ? C.gain : C.loss },
            { label: "勝率", value: `${stats.all.win_rate.toFixed(1)}%`, highlight: stats.all.win_rate >= 50 ? C.gain : C.loss },
            { label: "平均損益", value: sign(stats.all.avg_profit_per_100_shares), unit: "円", highlight: stats.all.avg_profit_per_100_shares >= 0 ? C.gain : C.loss },
            { label: "T5 累計", value: sign(t5pl), unit: "円", highlight: t5pl >= 0 ? C.gain : C.loss },
            { label: "T5 勝率", value: `${stats.t5.win_rate.toFixed(1)}%`, highlight: stats.t5.win_rate >= 50 ? C.gain : C.loss },
            { label: "T5 平均", value: sign(stats.t5.avg_profit_per_100_shares), unit: "円", highlight: stats.t5.avg_profit_per_100_shares >= 0 ? C.gain : C.loss },
          ].map(({ label, value, unit, highlight }, i) => (
            <div key={i} className="px-3 text-center" style={{ borderColor: C.border }}>
              <div style={{ color: C.sub, fontSize: 10, letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
              <div className="tabular-nums font-bold" style={{ color: highlight, fontSize: 18, fontFamily: "var(--font-geist-mono)", lineHeight: 1.2 }}>
                {value}
              </div>
              {unit && <div style={{ color: C.sub, fontSize: 9, marginTop: 1 }}>{unit}</div>}
            </div>
          ))}
        </div>

        <div className="border-t border-double mb-5" style={{ borderColor: C.text }} />

        {/* ===== MAIN CONTENT: CHART + TABLE ===== */}
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">

          {/* CHART */}
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className={`${serif.className} text-xl`}>Performance</h2>
              <div className="flex" style={{ fontSize: 11 }}>
                {([
                  ["cumulative", "累計"] as const,
                  ["return", "リターン"] as const,
                  ["winrate", "勝率"] as const,
                ]).map(([v, l]) => (
                  <button
                    key={v}
                    onClick={() => setChartView(v)}
                    className="px-3 py-1 border transition-colors"
                    style={{
                      borderColor: C.border,
                      background: chartView === v ? C.text : C.card,
                      color: chartView === v ? C.card : C.sub,
                      fontWeight: chartView === v ? 600 : 400,
                      marginLeft: -1,
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="border p-3" style={{ borderColor: C.border, background: C.card }}>
              <ResponsiveContainer width="100%" height={280}>
                {chartView === "cumulative" ? (
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C.line1} stopOpacity={0.12} />
                        <stop offset="100%" stopColor={C.line1} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gT" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C.line2} stopOpacity={0.12} />
                        <stop offset="100%" stopColor={C.line2} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={C.grid} strokeDasharray="2 4" vertical={false} />
                    <XAxis dataKey="d" stroke={C.grid} tick={{ fill: C.axis, fontSize: 10 }} tickLine={false} />
                    <YAxis stroke={C.grid} tick={{ fill: C.axis, fontSize: 10 }} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <ReferenceLine y={0} stroke={C.axis} strokeDasharray="3 3" />
                    <Tooltip
                      contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 0, fontSize: 12, boxShadow: "0 2px 8px rgba(0,0,0,.08)" }}
                      labelStyle={{ color: C.sub, fontSize: 11 }}
                      formatter={(v?: number, name?: string) => [`¥${(v ?? 0).toLocaleString()}`, name === "cum" ? "全体" : "Top5"]}
                    />
                    <Area type="monotone" dataKey="cum" stroke={C.line1} strokeWidth={1.5} fill="url(#gA)" name="cum" dot={false} />
                    <Area type="monotone" dataKey="t5c" stroke={C.line2} strokeWidth={1.5} fill="url(#gT)" name="t5" dot={false} />
                  </AreaChart>
                ) : chartView === "return" ? (
                  <AreaChart data={chartData}>
                    <CartesianGrid stroke={C.grid} strokeDasharray="2 4" vertical={false} />
                    <XAxis dataKey="d" stroke={C.grid} tick={{ fill: C.axis, fontSize: 10 }} tickLine={false} />
                    <YAxis stroke={C.grid} tick={{ fill: C.axis, fontSize: 10 }} tickLine={false} tickFormatter={(v) => `${v.toFixed(1)}%`} />
                    <ReferenceLine y={0} stroke={C.axis} strokeDasharray="3 3" />
                    <Tooltip
                      contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 0, fontSize: 12, boxShadow: "0 2px 8px rgba(0,0,0,.08)" }}
                      formatter={(v?: number, name?: string) => [`${(v ?? 0).toFixed(2)}%`, name === "avg" ? "全体" : "Top5"]}
                    />
                    <Area type="monotone" dataKey="avg" stroke={C.line1} strokeWidth={1.5} fill="none" name="avg" dot={false} />
                    <Area type="monotone" dataKey="t5" stroke={C.line2} strokeWidth={1.5} fill="none" name="t5" dot={false} />
                  </AreaChart>
                ) : (
                  <BarChart data={chartData}>
                    <CartesianGrid stroke={C.grid} strokeDasharray="2 4" vertical={false} />
                    <XAxis dataKey="d" stroke={C.grid} tick={{ fill: C.axis, fontSize: 10 }} tickLine={false} />
                    <YAxis stroke={C.grid} tick={{ fill: C.axis, fontSize: 10 }} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                    <ReferenceLine y={50} stroke={C.accent} strokeDasharray="4 4" strokeWidth={0.5} />
                    <Tooltip
                      contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 0, fontSize: 12, boxShadow: "0 2px 8px rgba(0,0,0,.08)" }}
                      formatter={(v?: number) => [`${(v ?? 0).toFixed(1)}%`, "勝率"]}
                    />
                    <Bar dataKey="wr" maxBarSize={16}>
                      {chartData.map((e, i) => (
                        <Cell key={i} fill={e.wr >= 50 ? C.gain : C.loss} fillOpacity={0.7} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>

              {chartView !== "winrate" && (
                <div className="flex items-center gap-5 mt-2 pl-12" style={{ fontSize: 10, color: C.sub }}>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-4 h-[2px]" style={{ background: C.line1 }} />
                    全体
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-4 h-[2px]" style={{ background: C.line2 }} />
                    Top 5
                  </span>
                </div>
              )}
            </div>

            {/* Trend analysis — newspaper aside */}
            {data.trend_analysis && (
              <div className="mt-3 flex flex-wrap items-center gap-2" style={{ fontSize: 11 }}>
                <span className="font-bold" style={{ color: C.sub, letterSpacing: "0.05em", fontSize: 10 }}>TREND</span>
                <span
                  className="px-2 py-0.5 font-semibold"
                  style={{
                    background: data.trend_analysis.trend === "improving" ? "#dcfce7" : data.trend_analysis.trend === "declining" ? "#fee2e2" : "#f5f5f4",
                    color: data.trend_analysis.trend === "improving" ? C.gain : data.trend_analysis.trend === "declining" ? C.loss : C.sub,
                  }}
                >
                  {data.trend_analysis.trend === "improving" ? "改善" : data.trend_analysis.trend === "declining" ? "悪化" : "安定"}
                </span>
                <span style={{ color: C.sub }}>
                  5日平均 {data.trend_analysis.recent_avg.toFixed(2)}% / 全体 {data.trend_analysis.overall_avg.toFixed(2)}%
                </span>
                {data.alerts.map((a, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5"
                    style={{
                      background: a.type === "success" ? "#dcfce7" : a.type === "warning" ? "#fef3c7" : "#fee2e2",
                      color: a.type === "success" ? C.gain : a.type === "warning" ? "#92400e" : C.loss,
                      fontSize: 10,
                    }}
                  >
                    {a.title}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* TABLE */}
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className={`${serif.className} text-xl`}>Daily Record</h2>
              <input
                type="text"
                placeholder="検索"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-20 px-2 py-1 border text-xs focus:outline-none"
                style={{ borderColor: C.border, background: C.card, color: C.text }}
              />
            </div>
            <div className="border overflow-hidden" style={{ borderColor: C.border, background: C.card }}>
              <div className="overflow-y-auto max-h-[380px]">
                <table className="w-full" style={{ fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#f5f5f0", borderBottom: `1px solid ${C.border}` }}>
                      <th
                        className="px-3 py-2 text-left font-semibold cursor-pointer select-none"
                        style={{ color: C.sub, fontSize: 10, letterSpacing: "0.05em" }}
                        onClick={() => toggle("date")}
                      >
                        DATE {sortField === "date" && (sortDir === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="px-2 py-2 text-right font-semibold" style={{ color: C.sub, fontSize: 10 }}>N</th>
                      <th
                        className="px-2 py-2 text-right font-semibold cursor-pointer select-none"
                        style={{ color: C.sub, fontSize: 10 }}
                        onClick={() => toggle("win_rate")}
                      >
                        WR {sortField === "win_rate" && (sortDir === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="px-2 py-2 text-right font-semibold" style={{ color: C.sub, fontSize: 10 }}>P&L</th>
                      <th className="px-2 py-2 text-right font-semibold" style={{ color: C.sub, fontSize: 10 }}>T5</th>
                      <th className="w-5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((s, i) => (
                      <tr
                        key={s.date}
                        className="group transition-colors"
                        style={{
                          borderBottom: `1px solid ${C.border}`,
                          background: i % 2 === 0 ? C.card : "#fafaf8",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#f0ebe3"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? C.card : "#fafaf8"; }}
                      >
                        <td className="px-3 py-1.5 tabular-nums" style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11 }}>{s.date}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums" style={{ color: C.sub }}>{s.count}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums" style={{ fontFamily: "var(--font-geist-mono)" }}>
                          {s.win_rate?.toFixed(0)}%
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums font-semibold" style={{ fontFamily: "var(--font-geist-mono)", color: s.total_profit_per_100 >= 0 ? C.gain : C.loss }}>
                          {sign(s.total_profit_per_100)}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums font-semibold" style={{ fontFamily: "var(--font-geist-mono)", color: s.top5_total_profit_per_100 >= 0 ? C.gain : C.loss }}>
                          {sign(s.top5_total_profit_per_100)}
                        </td>
                        <td className="px-1 py-1.5">
                          <Link
                            href={`/dev/daily/${s.date}`}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ color: C.accent }}
                          >
                            <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-2 text-right" style={{ fontSize: 10, color: C.sub }}>
              {stats.all.valid_count} trades / {stats.all.total_days} days
            </div>
          </div>
        </div>

        {/* ===== FOOTER ===== */}
        <div className="mt-8 pt-3 border-t border-double text-center" style={{ borderColor: C.text, fontSize: 10, color: C.sub, letterSpacing: "0.1em" }}>
          GROK BACKTEST — CLAUDE EDITION
        </div>
      </div>
    </motion.div>
  );
}
