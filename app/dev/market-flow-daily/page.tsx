"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";

interface FlowRow {
  date?: string;
  rank?: number | null;
  prev_rank?: number | null;
  rank_change?: number | null;
  days_in_top150?: number | null;
  consecutive_days_in_top150?: number | null;
  code?: string | null;
  ticker?: string | null;
  stock_name?: string | null;
  sectors?: string | null;
  trading_value_billion?: number | null;
  open_to_close_pct?: number | null;
  is_new_top150?: boolean | null;
  is_etf?: boolean | null;
}

interface Summary {
  latest_total_turnover_bil?: number | null;
  new_non_semiconductor_count?: number | null;
  dropped_non_semiconductor_count?: number | null;
}

interface TemperatureMetric {
  label?: string;
  value?: number | null;
}

interface TemperatureComponent {
  key?: string;
  metrics?: TemperatureMetric[];
}

interface IndexMetric {
  date?: string;
  ret1_pct?: number | null;
  ret5_pct?: number | null;
  ret20_pct?: number | null;
}

interface MarketTemperature {
  label?: string | null;
  score?: number | null;
  stance?: string | null;
  warnings?: string[];
  components?: TemperatureComponent[];
  index_metrics?: {
    n225?: IndexMetric | null;
    topix_etf?: IndexMetric | null;
  };
}

interface RankSnapshot {
  date: string;
  rows?: FlowRow[];
}

interface RankFlow {
  snapshot_dates?: string[];
  snapshots?: RankSnapshot[];
  rank_cap?: number | null;
}

interface SectorRotationRow {
  key?: string;
  label?: string;
  kind?: string;
  count?: number | null;
  turnover_bil?: number | null;
  share_pct?: number | null;
  share_delta_1d_pt?: number | null;
  share_delta_5d_pt?: number | null;
  open_to_close_pct?: number | null;
  up_rate_pct?: number | null;
  top_names?: string[];
  rotation_state?: string;
}

interface SectorSnapshot {
  date: string;
  rows?: SectorRotationRow[];
}

interface SectorRotation {
  snapshot_dates?: string[];
  latest_rows?: SectorRotationRow[];
  snapshots?: SectorSnapshot[];
}

interface BenchmarkSnapshot {
  date?: string;
  tv5d_delta_pct?: number | null;
  flow_ticker?: string;
  note?: string;
}

interface MarketFlowResponse {
  available: boolean;
  reason?: string;
  latest_date?: string;
  summary?: Summary;
  market_temperature?: MarketTemperature;
  rank_flow?: RankFlow;
  sector_rotation?: SectorRotation;
  market_benchmark_snapshots?: {
    n225?: BenchmarkSnapshot[];
    topix?: BenchmarkSnapshot[];
  };
  top150?: FlowRow[];
  rank_movers?: FlowRow[];
  new_entries?: FlowRow[];
  sustained_stocks?: FlowRow[];
  risk_sources?: FlowRow[];
  dropped?: FlowRow[];
}

type RankRange = "1d" | "5d";
type DecisionKind = "follow" | "initial" | "wait";

const COLORS = {
  green: "#50d7a4",
  amber: "#f2c55e",
  red: "#ff7e8f",
  grid: "#1b2923",
};

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const signed = (value?: number | null, suffix = "%", digits = 2) =>
  isNumber(value)
    ? `${value > 0 ? "+" : ""}${value.toFixed(digits)}${suffix}`
    : "—";

const oku = (value?: number | null) =>
  isNumber(value)
    ? `${(value * 10).toLocaleString("ja-JP", { maximumFractionDigits: 0 })}億`
    : "—";

const shortDate = (value?: string | null) => {
  if (!value) return "—";
  const [, month, day] = value.split("-");
  return month && day ? `${Number(month)}/${Number(day)}` : value;
};

const fullDate = (value?: string | null) => {
  if (!value) return "データ日不明";
  const date = new Date(`${value}T00:00:00+09:00`);
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Tokyo",
  }).format(date);
};

const actorKey = (row: FlowRow) => row.ticker || row.code || "";

const positiveClass = (value?: number | null) => {
  if (!isNumber(value) || value === 0) return "text-[#829189]";
  return value > 0 ? "text-[#50d7a4]" : "text-[#ff7e8f]";
};

const decisionTone = (kind: DecisionKind) =>
  kind === "follow" ? COLORS.green : kind === "initial" ? COLORS.amber : COLORS.red;

const componentValue = (
  temperature: MarketTemperature | undefined,
  componentKey: string,
  metricLabel: string,
) =>
  temperature?.components
    ?.find((component) => component.key === componentKey)
    ?.metrics?.find((metric) => metric.label === metricLabel)?.value;

const uniqueRows = (rows: FlowRow[], limit: number) => {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = actorKey(row);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
};

function decisionRows(data: MarketFlowResponse) {
  const current = (data.top150 ?? []).filter((row) => !row.is_etf);
  const follow = current
    .filter(
      (row) =>
        (row.rank ?? 999) <= 20 &&
        (row.open_to_close_pct ?? 0) > 0 &&
        (row.consecutive_days_in_top150 ?? 0) >= 3,
    )
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  const initial = (data.new_entries ?? [])
    .filter((row) => !row.is_etf && (row.open_to_close_pct ?? 0) > 0)
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  const wait = (data.risk_sources ?? [])
    .filter((row) => !row.is_etf && (row.rank ?? 999) <= 40)
    .sort((a, b) => (b.trading_value_billion ?? 0) - (a.trading_value_billion ?? 0));

  return {
    follow: uniqueRows(follow, 3),
    initial: uniqueRows(initial, 2),
    wait: uniqueRows(wait, 2),
  };
}

function buildHeadline(data: MarketFlowResponse) {
  const n225 = data.market_temperature?.index_metrics?.n225?.ret1_pct;
  const topix = data.market_temperature?.index_metrics?.topix_etf?.ret1_pct;
  const gap = isNumber(n225) && isNumber(topix) ? topix - n225 : null;
  const indexLead = isNumber(gap)
    ? gap >= 0.3
      ? "TOPIX優位"
      : gap <= -0.3
        ? "N225優位"
        : "指数は拮抗"
    : "指数は方向確認";

  const inflows = (data.sector_rotation?.latest_rows ?? [])
    .filter((row) => (row.share_delta_5d_pt ?? 0) > 0)
    .sort((a, b) => (b.share_delta_5d_pt ?? 0) - (a.share_delta_5d_pt ?? 0))
    .slice(0, 2)
    .map((row) => row.label)
    .filter(Boolean);
  const leader = (data.top150 ?? []).find((row) => !row.is_etf);
  const newcomer = (data.new_entries ?? []).find(
    (row) => !row.is_etf && (row.open_to_close_pct ?? 0) > 0,
  );

  const destinations = inflows.length ? `${inflows.join("・")}へシェア拡大` : "流入先は分散";
  const actors = leader
    ? `${leader.stock_name ?? leader.code}が中心${newcomer ? `、${newcomer.stock_name ?? newcomer.code}が新規浮上` : ""}`
    : "主役を確認中";
  return `${indexLead}。${destinations}。${actors}。`;
}

function buildCaution(data: MarketFlowResponse) {
  const n225Flow = data.market_benchmark_snapshots?.n225?.at(-1)?.tv5d_delta_pct;
  const topixFlow = data.market_benchmark_snapshots?.topix?.at(-1)?.tv5d_delta_pct;
  if (isNumber(n225Flow) && isNumber(topixFlow) && n225Flow < 0 && topixFlow < 0) {
    return "指数連動の売買代金はともに5日平均以下。翌日も個別・業種の売買代金継続を確認する。";
  }
  const warning = data.market_temperature?.warnings?.[0];
  return warning ? `注意: ${warning}。主役の継続性を翌日の売買代金で確認する。` : "翌日も主役と流入業種の売買代金継続を確認する。";
}

function RankSlopeChart({
  rankFlow,
  range,
  onRange,
  priorityKinds,
}: {
  rankFlow?: RankFlow;
  range: RankRange;
  onRange: (value: RankRange) => void;
  priorityKinds: Map<string, DecisionKind>;
}) {
  const cap = 30;
  const snapshots = rankFlow?.snapshots ?? [];
  const selectedSnapshots = range === "1d" ? snapshots.slice(-2) : snapshots.slice(-5);
  const latest = selectedSnapshots.at(-1);
  const start = selectedSnapshots.at(0);
  const currentRows = (latest?.rows ?? [])
    .filter((row) => isNumber(row.rank) && row.rank <= cap)
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  const rankMaps = selectedSnapshots.map(
    (snapshot) => new Map(snapshot.rows?.map((row) => [actorKey(row), row.rank ?? null]) ?? []),
  );
  const startMap = rankMaps.at(0) ?? new Map<string, number | null>();
  const rowHeight = 40;
  const height = cap * rowHeight;
  const currentKeys = new Set(currentRows.map(actorKey));
  const entered = currentRows.filter((row) => {
    const rank = startMap.get(actorKey(row));
    return !isNumber(rank) || rank > cap;
  });
  const exited = (start?.rows ?? [])
    .filter((row) => isNumber(row.rank) && row.rank <= cap && !currentKeys.has(actorKey(row)))
    .slice(0, 5);

  if (!latest || !start) {
    return <p className="p-6 text-sm text-[#829189]">順位推移データが不足しています。</p>;
  }

  return (
    <div data-testid="rank-flow-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#223029] px-4 py-3 sm:px-5">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[#71827a]">RANK FLOW</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">売買代金ランクの交代</h2>
        </div>
        <div className="flex rounded-lg bg-[#0a100d] p-1">
            {(["1d", "5d"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => onRange(value)}
                className={`rounded-md px-3.5 py-2 text-xs font-medium transition ${range === value ? "bg-[#26362f] text-white" : "text-[#71827a] hover:text-white"}`}
              >
                {value === "1d" ? "前日比" : "5日前比"}
              </button>
            ))}
        </div>
      </div>

      <div className="px-3 pb-5 pt-4 sm:px-5">
        <div className="mb-3 grid grid-cols-2 items-end gap-3 text-xs text-[#829189] sm:gap-5">
          <div className="grid grid-cols-[28px_minmax(0,1fr)] items-end">
            <span className="text-[10px]">順位</span>
            <div
              className="grid text-center"
              style={{ gridTemplateColumns: `repeat(${selectedSnapshots.length}, minmax(0, 1fr))` }}
            >
              {selectedSnapshots.map((snapshot) => (
                <span key={snapshot.date} data-rank-snapshot={snapshot.date}>{shortDate(snapshot.date)}</span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_60px_60px] gap-2 px-1 sm:grid-cols-[minmax(0,1fr)_164px_100px]">
            <span>企業名</span>
            <span className="text-left">順位推移</span>
            <span className="text-right">当落</span>
          </div>
        </div>

        <div
          className="grid grid-cols-2 gap-3 sm:gap-5"
          role="img"
          aria-label={`${range === "1d" ? "前営業日" : "5営業日前"}から${shortDate(latest.date)}までの売買代金Top30順位推移`}
        >
          <div data-rank-graph className="grid grid-cols-[28px_minmax(0,1fr)]" style={{ height }}>
            <div className="relative" aria-hidden="true">
              {Array.from({ length: cap }, (_, index) => (
                <span
                  key={`rank-axis-${index + 1}`}
                  data-rank-axis-label={index + 1}
                  className="absolute inset-x-0 flex items-center justify-end pr-2 text-xs tabular-nums text-[#71827a]"
                  style={{ top: index * rowHeight, height: rowHeight }}
                >
                  {index + 1}
                </span>
              ))}
            </div>
            <div className="relative">
              <svg
                viewBox={`0 0 100 ${height}`}
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full overflow-visible"
                aria-hidden="true"
              >
                {Array.from({ length: cap + 1 }, (_, index) => {
                  const y = index * rowHeight;
                  return <line key={`grid-${index}`} data-rank-grid-line x1="0" x2="100" y1={y} y2={y} stroke={COLORS.grid} strokeWidth="1" />;
                })}
                {selectedSnapshots.map((snapshot, index) => {
                  const x = selectedSnapshots.length === 1 ? 50 : 4 + (index / (selectedSnapshots.length - 1)) * 92;
                  return <line key={snapshot.date} x1={x} x2={x} y1="0" y2={height} stroke="#1e2c25" strokeWidth="1" opacity="0.45" vectorEffect="non-scaling-stroke" />;
                })}
                {currentRows.map((row) => {
                  const key = actorKey(row);
                  const ranks = rankMaps.map((rankMap) => {
                    const rank = rankMap.get(key);
                    return isNumber(rank) && rank <= cap ? rank : null;
                  });
                  let penDown = false;
                  const path = ranks.map((rank, index) => {
                    if (!isNumber(rank)) {
                      penDown = false;
                      return "";
                    }
                    const x = ranks.length === 1 ? 50 : 4 + (index / (ranks.length - 1)) * 92;
                    const y = (rank - 0.5) * rowHeight;
                    const command = penDown ? "L" : "M";
                    penDown = true;
                    return `${command} ${x} ${y}`;
                  }).filter(Boolean).join(" ");
                  return (
                    <path key={key} data-flow-line={key} d={path} fill="none" stroke="#66736d" strokeWidth="1.5" opacity="0.38" vectorEffect="non-scaling-stroke" />
                  );
                })}
              </svg>
            </div>
          </div>

          <div data-rank-table className="relative min-w-0" style={{ height }}>
            {currentRows.map((row) => {
              const key = actorKey(row);
              const currentRank = row.rank as number;
              const rankHistory = rankMaps.map((rankMap) => rankMap.get(key));
              const firstKnownRank = rankHistory.find(isNumber);
              const rankChange = isNumber(firstKnownRank) ? firstKnownRank - currentRank : 0;
              const rankTone = rankChange > 0 ? COLORS.green : rankChange < 0 ? COLORS.red : "#dfe8e3";
              const rankDirection = rankChange > 0 ? "improved" : rankChange < 0 ? "declined" : "flat";
              const priorityKind = priorityKinds.get(key);
              return (
                <div
                  key={key}
                  data-flow-row={key}
                  data-rank-row
                  className="absolute left-0 right-0 grid min-w-0 grid-cols-[minmax(0,1fr)_60px_60px] items-center gap-2 border-b border-[#142019] px-1 sm:grid-cols-[minmax(0,1fr)_164px_100px]"
                  style={{ top: (currentRank - 1) * rowHeight, height: rowHeight }}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      data-rank-company={key}
                      data-priority-kind={priorityKind ?? "none"}
                      className="truncate text-[13px] font-medium leading-tight sm:text-sm"
                      style={{ color: priorityKind ? decisionTone(priorityKind) : "#dfe8e3" }}
                    >
                      {row.stock_name ?? row.code}
                    </p>
                    <p className="truncate text-[11px] leading-tight text-[#71827a] sm:text-xs">
                      {row.code}{row.is_etf ? " · ETF" : row.sectors ? ` · ${row.sectors}` : ""}
                    </p>
                  </div>
                  <div className="min-w-0 text-left tabular-nums">
                    <p data-rank-history={key} className="truncate whitespace-nowrap text-[9px] tracking-tight sm:text-sm">
                      {rankHistory.map((rank, index) => {
                        const latestRank = index === rankHistory.length - 1;
                        return (
                          <span key={`${key}-rank-${selectedSnapshots[index]?.date}`}>
                            {index > 0 ? <span className="text-[#536159]">→</span> : null}
                            <span
                              data-rank-current-tone={latestRank ? rankDirection : undefined}
                              className={latestRank ? "font-bold" : "font-medium text-[#829189]"}
                              style={latestRank ? { color: rankTone } : undefined}
                            >
                              {isNumber(rank) ? rank : "—"}
                            </span>
                          </span>
                        );
                      })}
                    </p>
                  </div>
                  <div className="text-right tabular-nums">
                    <p className={`text-sm font-semibold leading-tight sm:text-base ${positiveClass(row.open_to_close_pct)}`}>
                      {signed(row.open_to_close_pct)}
                    </p>
                    <p className="mt-0.5 text-sm font-medium leading-tight text-[#829189]">{oku(row.trading_value_billion)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="mt-3 border-t border-[#223029] pt-3 text-xs leading-5 text-[#829189]">
          グラフは同じ銘柄のTop30内の順位推移。31位以下はグラフに描画せず、実順位はテーブルの順位推移に表示します。
        </p>
        <div className="mt-2 grid gap-2 text-[11px] leading-5 text-[#829189] sm:grid-cols-2">
          <p><span className="font-semibold text-[#f2c55e]">IN</span> {entered.map((row) => row.stock_name).filter(Boolean).slice(0, 5).join(" / ") || "なし"}</p>
          <p><span className="font-semibold text-[#9e6b74]">OUT</span> {exited.map((row) => row.stock_name).filter(Boolean).join(" / ") || "なし"}</p>
        </div>
      </div>
    </div>
  );
}

function decisionEvidence(row: FlowRow, kind: DecisionKind) {
  if (kind === "follow") {
    return `#${row.rank ?? "—"} · ${row.consecutive_days_in_top150 ?? 0}日継続 · 引け${signed(row.open_to_close_pct)}`;
  }
  if (kind === "initial") {
    const previous = isNumber(row.prev_rank) ? `#${row.prev_rank}` : "圏外";
    return `${previous} → #${row.rank ?? "—"} · 引け${signed(row.open_to_close_pct)}`;
  }
  return `#${row.rank ?? "—"} · ${oku(row.trading_value_billion)} · 引け${signed(row.open_to_close_pct)}`;
}

function DecisionGroup({
  kind,
  title,
  condition,
  rows,
}: {
  kind: DecisionKind;
  title: string;
  condition: string;
  rows: FlowRow[];
}) {
  const tone = decisionTone(kind);
  return (
    <section className="border-t border-[#223029] py-5 first:border-t-0 lg:border-l lg:border-t-0 lg:px-5 lg:py-0">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base font-semibold" style={{ color: tone }}>{title}</h3>
        <span className="text-[11px] text-[#71827a]">{condition}</span>
      </div>
      <div className="mt-4 space-y-3.5">
        {rows.length ? rows.map((row) => (
          <div key={actorKey(row)} className="min-w-0">
            <div className="flex items-baseline justify-between gap-3">
              <p data-priority-card-company={actorKey(row)} data-priority-card-kind={kind} className="truncate text-[15px] font-medium text-[#e4ece8]">{row.stock_name ?? row.code}</p>
              <span className="shrink-0 text-xs text-[#71827a]">{row.code}</span>
            </div>
            <p className="mt-1 text-xs text-[#94a39b]">{decisionEvidence(row, kind)}</p>
          </div>
        )) : <p className="text-sm text-[#64746c]">該当なし</p>}
      </div>
    </section>
  );
}

function DecisionRail({ data }: { data: MarketFlowResponse }) {
  const groups = decisionRows(data);
  return (
    <section className="grid rounded-2xl border border-[#223029] bg-[#0e1612] p-5 sm:p-6 lg:grid-cols-[230px_repeat(3,minmax(0,1fr))]">
      <div className="pb-5 lg:pb-0 lg:pr-5">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-[#71827a]">NEXT SESSION</p>
        <h2 className="mt-1 text-xl font-semibold sm:text-2xl">翌日の優先順位</h2>
        <p className="mt-3 text-sm leading-6 text-[#8b9a92]">銘柄を増やさず、役割ごとに見る。</p>
        <p className="mt-3 text-xs leading-5 text-[#64746c]">寄り後の売買代金・VWAP・同業への波及で更新。</p>
      </div>
      <DecisionGroup kind="follow" title="継続を狙う" condition="順位 × 引け" rows={groups.follow} />
      <DecisionGroup kind="initial" title="初動を測る" condition="新規 × 波及" rows={groups.initial} />
      <DecisionGroup kind="wait" title="反転待ち" condition="大商い売り" rows={groups.wait} />
    </section>
  );
}

function Sparkline({ values, tone }: { values: Array<number | null>; tone: string }) {
  const numeric = values.filter(isNumber);
  if (numeric.length < 2) return <span className="text-[10px] text-[#536159]">—</span>;
  const min = Math.min(...numeric);
  const max = Math.max(...numeric);
  const range = Math.max(0.01, max - min);
  const points = values.map((value, index) => {
    const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 70;
    const y = isNumber(value) ? 22 - ((value - min) / range) * 18 : 22;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 70 26" className="h-8 w-[78px]" role="img" aria-label="直近5営業日の売買代金シェア推移">
      <line x1="0" x2="70" y1="23" y2="23" stroke="#26342d" strokeWidth="1" />
      <polyline points={points} fill="none" stroke={tone} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function sectorHistory(rotation: SectorRotation | undefined, key?: string) {
  if (!key) return [];
  return (rotation?.snapshots ?? []).map((snapshot) => {
    const row = snapshot.rows?.find((candidate) => candidate.key === key);
    return isNumber(row?.share_pct) ? row.share_pct : null;
  });
}

function SectorFlow({ rotation }: { rotation?: SectorRotation }) {
  const rows = rotation?.latest_rows ?? [];
  const inflows = rows
    .filter((row) => (row.share_delta_5d_pt ?? 0) > 0)
    .sort((a, b) => (b.share_delta_5d_pt ?? 0) - (a.share_delta_5d_pt ?? 0))
    .slice(0, 5);
  const outflows = rows
    .filter((row) => (row.share_delta_5d_pt ?? 0) < 0)
    .sort((a, b) => (a.share_delta_5d_pt ?? 0) - (b.share_delta_5d_pt ?? 0))
    .slice(0, 3);

  return (
    <section className="rounded-2xl border border-[#223029] bg-[#0e1612] p-5 sm:p-6" aria-labelledby="capital-destination">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[#71827a]">5-DAY ROTATION</p>
          <h2 id="capital-destination" className="mt-1 text-2xl font-semibold">資金の行き先</h2>
        </div>
        <p className="text-[11px] text-[#71827a]">X: 5営業日 / Y: Top150内シェア</p>
      </div>

      <div className="mt-5 divide-y divide-[#1d2a24]">
        {inflows.map((row) => (
          <div key={row.key ?? row.label} className="grid grid-cols-[minmax(0,1fr)_78px_64px] items-center gap-3 py-3.5 first:pt-0">
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <p className="truncate text-base font-medium">{row.label ?? "不明"}</p>
                <span className="text-[10px] text-[#71827a]">{row.kind === "sector" ? "業種" : "テーマ"}</span>
              </div>
              <p className="mt-1 truncate text-xs text-[#829189]">{row.top_names?.slice(0, 3).join(" / ") || "—"}</p>
            </div>
            <Sparkline values={sectorHistory(rotation, row.key)} tone={COLORS.green} />
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums text-[#50d7a4]">{signed(row.share_delta_5d_pt, "pt")}</p>
              <p className={`mt-1 text-[11px] tabular-nums ${positiveClass(row.open_to_close_pct)}`}>引け {signed(row.open_to_close_pct)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-[#223029] pt-4">
        <span className="mr-1 text-xs font-semibold text-[#ff7e8f]">縮小</span>
        {outflows.map((row) => (
          <span key={row.key ?? row.label} className="rounded-full bg-[#151d19] px-3 py-1.5 text-xs text-[#9aa8a1]">
            {row.label} <b className="ml-1 text-[#ff7e8f]">{signed(row.share_delta_5d_pt, "pt")}</b>
          </span>
        ))}
      </div>
    </section>
  );
}

function IndexContext({ data }: { data: MarketFlowResponse }) {
  const n225 = data.market_temperature?.index_metrics?.n225;
  const topix = data.market_temperature?.index_metrics?.topix_etf;
  const n225Flow = data.market_benchmark_snapshots?.n225?.at(-1);
  const topixFlow = data.market_benchmark_snapshots?.topix?.at(-1);
  const gap = isNumber(n225?.ret1_pct) && isNumber(topix?.ret1_pct) ? topix.ret1_pct - n225.ret1_pct : null;
  const read = isNumber(gap)
    ? gap > 0.3
      ? `TOPIXがN225を${gap.toFixed(2)}pt上回る。値嵩株だけでなく広い銘柄群へ。`
      : gap < -0.3
        ? `N225がTOPIXを${Math.abs(gap).toFixed(2)}pt上回る。値嵩主導を優先。`
        : "N225とTOPIXは拮抗。個別フローを優先。"
    : "指数差を判定できません。";

  return (
    <section className="rounded-2xl border border-[#223029] bg-[#0e1612] p-5 sm:p-6" aria-labelledby="domestic-index-context">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-[#71827a]">DOMESTIC CONTEXT</p>
      <h2 id="domestic-index-context" className="mt-1 text-2xl font-semibold">N225 / TOPIX</h2>
      <p className="mt-3 rounded-xl bg-[#09100c] p-3 text-sm leading-6 text-[#b6c2bc]">{read}</p>

      <div className="mt-4 space-y-3">
        {[
          { label: "N225", price: n225, flow: n225Flow },
          { label: "TOPIX", price: topix, flow: topixFlow },
        ].map(({ label, price, flow }) => (
          <div key={label} className="rounded-xl border border-[#1f2c26] p-3">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-base font-semibold">{label}</h3>
              <span className={`text-base font-semibold tabular-nums ${positiveClass(price?.ret1_pct)}`}>{signed(price?.ret1_pct)}</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div><p className="text-[#64746c]">5日</p><p className={`mt-1 font-semibold ${positiveClass(price?.ret5_pct)}`}>{signed(price?.ret5_pct)}</p></div>
              <div><p className="text-[#64746c]">20日</p><p className={`mt-1 font-semibold ${positiveClass(price?.ret20_pct)}`}>{signed(price?.ret20_pct)}</p></div>
              <div><p className="text-[#64746c]">資金量/5日</p><p className={`mt-1 font-semibold ${positiveClass(flow?.tv5d_delta_pct)}`}>{signed(flow?.tv5d_delta_pct)}</p></div>
            </div>
            <p className="mt-2 text-[10px] leading-4 text-[#71827a]">{flow?.note ?? "資金量データなし"}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function MarketFlowDailyPage() {
  const [data, setData] = useState<MarketFlowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rankRange, setRankRange] = useState<RankRange>("5d");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/dev/market-flow?days=20&top_n=150", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setData((await response.json()) as MarketFlowResponse);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "データ取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const headline = useMemo(() => data ? buildHeadline(data) : "", [data]);
  const caution = useMemo(() => data ? buildCaution(data) : "", [data]);
  const priorityKinds = useMemo(() => {
    const kinds = new Map<string, DecisionKind>();
    if (!data) return kinds;
    const groups = decisionRows(data);
    groups.follow.forEach((row) => kinds.set(actorKey(row), "follow"));
    groups.initial.forEach((row) => kinds.set(actorKey(row), "initial"));
    groups.wait.forEach((row) => kinds.set(actorKey(row), "wait"));
    return kinds;
  }, [data]);
  const temperature = data?.market_temperature;
  const breadth = componentValue(temperature, "breadth", "Top150 Up率");
  const top150Oc = componentValue(temperature, "breadth", "Top150 OC");
  const n225 = temperature?.index_metrics?.n225?.ret1_pct;
  const topix = temperature?.index_metrics?.topix_etf?.ret1_pct;

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070b09] px-5 py-8 text-[#e9f0ec]">
        <div className="mx-auto max-w-[1440px] animate-pulse space-y-4">
          <div className="h-12 rounded-xl bg-[#101713]" />
          <div className="h-44 rounded-2xl bg-[#101713]" />
          <div className="h-[720px] rounded-2xl bg-[#101713]" />
        </div>
      </main>
    );
  }

  if (error || !data?.available) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070b09] px-5 text-[#e9f0ec]">
        <div className="max-w-md rounded-2xl border border-[#223029] bg-[#0e1612] p-8 text-center">
          <p className="text-lg font-semibold">大引けデータを表示できません</p>
          <p className="mt-2 text-sm text-[#829189]">{error ?? data?.reason ?? "原因不明"}</p>
          <button type="button" onClick={() => void load()} className="mt-5 rounded-lg bg-[#dce7e1] px-5 py-2 text-sm font-medium text-[#0b100e]">再読み込み</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070b09] text-[#e9f0ec]">
      <div className="mx-auto max-w-[1440px] px-3 pb-12 pt-3 sm:px-5 lg:px-7">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1d2923] px-1 pb-3">
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-[#dce7e1] px-2.5 py-1 text-[10px] font-bold tracking-[0.18em] text-[#0b100e]">DAILY</span>
            <div>
              <h1 className="text-base font-semibold">大引けフロー</h1>
              <p className="text-xs text-[#71827a]">{fullDate(data.latest_date)} · J-Quants</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void load()} aria-label="データを更新" className="rounded-lg border border-[#223029] p-2 text-[#71827a] hover:bg-[#111a16] hover:text-white">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <Link href="/dev/market-flow" className="inline-flex items-center gap-1.5 rounded-lg border border-[#223029] bg-[#0d1411] px-3.5 py-2 text-xs font-medium hover:bg-[#111a16]">
              網羅版
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </header>

        <section className="mt-4 rounded-2xl border border-[#223029] bg-[radial-gradient(circle_at_top_right,_rgba(44,112,83,0.16),_transparent_35%),#0d1411] p-5 sm:p-6" aria-labelledby="daily-conclusion">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold tracking-[0.16em] text-[#71827a]">TODAY&apos;S READ</span>
                <span className="rounded-full bg-[#173b2e] px-2.5 py-0.5 text-[10px] font-semibold text-[#72deb4]">{temperature?.stance ?? "判定なし"}</span>
                <span className="text-xs tabular-nums text-[#829189]">温度 {isNumber(temperature?.score) ? temperature.score.toFixed(0) : "—"}</span>
              </div>
              <h2 id="daily-conclusion" className="mt-3 text-3xl font-semibold leading-snug tracking-[-0.025em] sm:text-4xl">{headline}</h2>
              <p className="mt-3 text-sm leading-6 text-[#9caaa3] sm:text-base">{caution}</p>
            </div>
            <div className="grid grid-cols-4 divide-x divide-[#2a3931] border-y border-[#2a3931] py-3">
              {[
                ["Top150引け", signed(top150Oc), positiveClass(top150Oc)],
                ["上昇率", signed(breadth, "%", 1), positiveClass((breadth ?? 50) - 50)],
                ["N225", signed(n225), positiveClass(n225)],
                ["TOPIX", signed(topix), positiveClass(topix)],
              ].map(([label, value, color]) => (
                <div key={label} className="min-w-0 px-2 text-center first:pl-0 last:pr-0">
                  <p className="truncate text-[10px] text-[#71827a] sm:text-xs">{label}</p>
                  <p className={`mt-1 text-sm font-semibold tabular-nums sm:text-base ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-4">
          <DecisionRail data={data} />
        </section>

        <section className="mt-4 min-w-0 overflow-hidden rounded-2xl border border-[#223029] bg-[#0d1411]">
          <RankSlopeChart rankFlow={data.rank_flow} range={rankRange} onRange={setRankRange} priorityKinds={priorityKinds} />
        </section>

        <section className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <SectorFlow rotation={data.sector_rotation} />
          <IndexContext data={data} />
        </section>

        <footer className="mt-4 border-t border-[#1d2923] px-1 pt-4 text-[10px] leading-5 text-[#64746c]">
          J-Quants大引け後の日足・売買代金Top150を使用。米国指標、CME、先物、PTS、翌朝気配は含みません。順位線は同一銘柄の推移で、銘柄間の直接的な資金移動を示すものではありません。
        </footer>
      </div>
    </main>
  );
}
