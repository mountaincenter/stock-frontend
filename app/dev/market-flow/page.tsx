"use client";

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Activity, ArrowDownRight, ArrowUpRight, CheckCircle2, Layers, LockKeyhole, RefreshCw, ShieldAlert, Target } from "lucide-react";
import { DevNavLinks } from "@/components/dev";

interface Summary {
  latest_total_turnover_bil?: number | null;
  semiconductor_turnover_bil?: number | null;
  semiconductor_share_pct?: number | null;
  semiconductor_open_to_close_pct?: number | null;
  etf_turnover_bil?: number | null;
  etf_share_pct?: number | null;
  etf_open_to_close_pct?: number | null;
  non_semiconductor_top31_150_turnover_bil?: number | null;
  non_semiconductor_top31_150_count?: number | null;
  new_non_semiconductor_count?: number | null;
  dropped_non_semiconductor_count?: number | null;
  kioxia_turnover_bil?: number | null;
  kioxia_share_pct?: number | null;
  kioxia_open_to_close_pct?: number | null;
  semicon_core_turnover_bil?: number | null;
  semicon_core_share_pct?: number | null;
  semicon_core_open_to_close_pct?: number | null;
  semicon_main_turnover_bil?: number | null;
  semicon_main_share_pct?: number | null;
  semicon_main_open_to_close_pct?: number | null;
  theme_peripheral_turnover_bil?: number | null;
  theme_peripheral_share_pct?: number | null;
  theme_peripheral_open_to_close_pct?: number | null;
  other_turnover_bil?: number | null;
  other_share_pct?: number | null;
  other_open_to_close_pct?: number | null;
}

interface FlowRow {
  date?: string;
  rank?: number | null;
  prev_rank?: number | null;
  rank_change?: number | null;
  rank_band?: string | null;
  days_in_top150?: number | null;
  consecutive_days_in_top150?: number | null;
  positive_streak_days?: number | null;
  persistence_score?: number | null;
  code?: string | null;
  ticker?: string | null;
  stock_name?: string | null;
  market?: string | null;
  sectors?: string | null;
  trading_value_billion?: number | null;
  open_to_close_pct?: number | null;
  price_diff?: number | null;
  is_new_top150?: boolean | null;
  is_semiconductor?: boolean | null;
  is_etf?: boolean | null;
  theme_bucket?: string | null;
  theme_label?: string | null;
  is_semicon_main?: boolean | null;
  is_theme_peripheral?: boolean | null;
  flow_trigger?: string | null;
}

interface MarketRegime {
  primary?: string | null;
  secondary?: string[];
  semicon_main_share_pct?: number | null;
  semicon_main_open_to_close_pct?: number | null;
  peripheral_share_pct?: number | null;
  peripheral_open_to_close_pct?: number | null;
  other_share_pct?: number | null;
  other_open_to_close_pct?: number | null;
  semicon_core_share_pct?: number | null;
  semicon_core_open_to_close_pct?: number | null;
  kioxia_share_pct?: number | null;
  kioxia_open_to_close_pct?: number | null;
  kioxia_close_to_close_pct?: number | null;
  kioxia_gap_pct?: number | null;
  kioxia_breakdown?: boolean | null;
  semicon_ex_kioxia_share_pct?: number | null;
  semicon_ex_kioxia_open_to_close_pct?: number | null;
  mlcc_share_pct?: number | null;
  mlcc_open_to_close_pct?: number | null;
  all_open_to_close_pct?: number | null;
  all_up_rate_pct?: number | null;
}

interface TemperatureMetric {
  label: string;
  value?: number | null;
  format?: "pct" | "pct1" | "number" | string | null;
}

interface TemperatureComponent {
  key: string;
  label: string;
  score?: number | null;
  tone?: Tone | string | null;
  headline?: string | null;
  metrics?: TemperatureMetric[];
}

interface MarketTemperature {
  label?: string | null;
  score?: number | null;
  tone?: Tone | string | null;
  stance?: string | null;
  action?: string | null;
  warnings?: string[];
  components?: TemperatureComponent[];
  risk_pressure?: number | null;
}

interface FlowAnalysisAlert {
  key: string;
  severity?: "high" | "medium" | "warn" | "info" | string | null;
  title: string;
  scope?: string | null;
  evidence?: string[];
  note?: string | null;
  metrics?: Record<string, unknown>;
}

interface FlowAnalysisTradeLens {
  key: string;
  priority?: "high" | "medium" | "low" | string | null;
  title: string;
  evidence?: string[];
  watch?: string[];
  avoid?: string[];
  next_day_checks?: string[];
}

interface FlowAnalysisCheck {
  key: string;
  label: string;
  status: string;
  evidence?: string[];
}

interface FlowAnalysisStock {
  rank?: number | null;
  rank_change?: number | null;
  ticker?: string | null;
  code?: string | null;
  name?: string | null;
  turnover_bil?: number | null;
  open_to_close_pct?: number | null;
  rank_band?: string | null;
}

interface FlowAnalysisFocusGroup {
  key: string;
  label: string;
  status: string;
  evidence?: string[];
  top_stocks?: FlowAnalysisStock[];
  positive_leaders?: FlowAnalysisStock[];
  weak_laggards?: FlowAnalysisStock[];
}

interface FlowAnalysis {
  version?: number;
  market_state?: {
    label?: string | null;
    summary?: string | null;
    stance?: string | null;
    signal_score?: number | null;
    basis?: string | null;
  };
  point_alerts?: FlowAnalysisAlert[];
  line_alerts?: FlowAnalysisAlert[];
  surface_alerts?: FlowAnalysisAlert[];
  not_observed?: FlowAnalysisAlert[];
  trade_lens?: FlowAnalysisTradeLens[];
  hypothesis_checks?: FlowAnalysisCheck[];
  focus_groups?: FlowAnalysisFocusGroup[];
}

interface BucketRow {
  date?: string | null;
  bucket: string;
  label: string;
  count: number;
  turnover_bil?: number | null;
  turnover_share_pct?: number | null;
  avg_open_to_close_pct?: number | null;
  up_rate_pct?: number | null;
  top1_30_count?: number | null;
  top31_150_count?: number | null;
  new_count?: number | null;
  rank_up_count?: number | null;
  active_days?: number | null;
  active_streak_days?: number | null;
  positive_days?: number | null;
  positive_streak_days?: number | null;
  persistence_score?: number | null;
  avg_daily_turnover_bil?: number | null;
  avg_5d_turnover_bil?: number | null;
  baseline_days?: number | null;
  latest_turnover_bil?: number | null;
  latest_vs_avg?: number | null;
  latest_vs_5d_avg?: number | null;
  latest_count?: number | null;
  avg_up_rate_pct?: number | null;
  top_names?: string[];
}

interface OtherLeadRow {
  sector: string;
  turnover_bil?: number | null;
  turnover_share_pct?: number | null;
  avg_open_to_close_pct?: number | null;
  up_rate_pct?: number | null;
  count?: number | null;
  active_days?: number | null;
  active_streak_days?: number | null;
  positive_days?: number | null;
  positive_streak_days?: number | null;
  persistence_score?: number | null;
  rank_up_count?: number | null;
  new_count?: number | null;
  promotion_score?: number | null;
  top_names?: string[];
}

type OtherSortMode = "watch" | "turnover" | "weak";
type FlowViewMode = "visual" | "table";
type BenchmarkKey = "n225" | "topix";

interface MarketBenchmarkRow {
  key: BenchmarkKey | string;
  label: string;
  date: string;
  oc_pct?: number | null;
  turnover_bil?: number | null;
  avg_5d_turnover_bil?: number | null;
  latest_vs_5d_avg?: number | null;
  tv5d_delta_pct?: number | null;
  price_ticker?: string | null;
  flow_ticker?: string | null;
  note?: string | null;
}

interface OtherSectorGroup {
  sector: string;
  stocks: FlowRow[];
  count: number;
  turnover_bil: number;
  other_share_pct: number | null;
  avg_open_to_close_pct: number | null;
  up_rate_pct: number | null;
  rank_up_count: number;
  new_count: number;
  promotion_score: number;
  active_streak_days: number;
  positive_streak_days: number;
  persistence_score: number;
  top_names: string[];
}

interface SectorDailyRow {
  sector: string;
  count: number;
  turnover_bil?: number | null;
  turnover_share_pct?: number | null;
  non_semiconductor_turnover_bil?: number | null;
  avg_open_to_close_pct?: number | null;
  up_count?: number | null;
  top_code?: string | null;
  top_ticker?: string | null;
  top_name?: string | null;
  top_rank?: number | null;
  top1_30_count?: number | null;
  top31_100_count?: number | null;
  top101_150_count?: number | null;
  semiconductor_count?: number | null;
  active_days?: number | null;
  active_streak_days?: number | null;
  positive_days?: number | null;
  positive_streak_days?: number | null;
  persistence_score?: number | null;
}

interface SectorWeeklyRow {
  sector: string;
  active_days: number;
  avg_daily_turnover_bil?: number | null;
  latest_turnover_bil?: number | null;
  latest_vs_avg?: number | null;
  latest_count?: number | null;
  avg_count?: number | null;
}

interface ForwardRoute {
  rule_id: string;
  priority?: number | null;
  side?: "long" | "short" | string | null;
  signal_time?: string | null;
  exit_time?: string | null;
  definition?: string | null;
}

interface ForwardRecord extends ForwardRoute {
  trade_date?: string | null;
  signal_available?: boolean | null;
  triggered?: boolean | null;
  primary_selected?: boolean | null;
  execution_status?: string | null;
  entry_time?: string | null;
  entry_price?: number | null;
  exit_price?: number | null;
  net_return_bps?: number | null;
  shadow_pnl_yen_30?: number | null;
}

interface PhaseStatus {
  strategy_version?: string | null;
  frozen_at?: string | null;
  forward_start_date?: string | null;
  mode?: string | null;
  phase3_live_eligible?: boolean | null;
  automatic_ordering?: boolean | null;
  phase3_stage1_shares?: number | null;
  gate?: Record<string, number>;
  gate_checks?: Record<string, boolean>;
  blocked_reasons?: string[];
  forward_metrics?: {
    completed_primary_signals?: number | null;
    selected_primary_signals?: number | null;
    execution_completion_rate_pct?: number | null;
    net_average_bps?: number | null;
    net_profit_factor?: number | null;
    maximum_consecutive_losses?: number | null;
    total_shadow_pnl_yen_30?: number | null;
    maximum_shadow_drawdown_yen_30?: number | null;
  };
  latest_primary?: ForwardRecord | null;
  routes?: ForwardRoute[];
}

interface ExecutionProgram {
  available: boolean;
  reason?: string | null;
  warning?: string | null;
  phase_status?: PhaseStatus;
  latest_route_date?: string | null;
  latest_routes?: ForwardRecord[];
  recent_primary?: ForwardRecord[];
}

interface MarketFlowResponse {
  available: boolean;
  reason?: string;
  generated_at?: string;
  source?: string;
  source_environment?: string;
  source_data_mode?: "local" | "s3" | string;
  latest_date?: string;
  previous_date?: string;
  history_rows?: number;
  recent_dates?: string[];
  summary?: Summary;
  market_regime?: MarketRegime;
  market_temperature?: MarketTemperature;
  execution_program?: ExecutionProgram;
  flow_analysis?: FlowAnalysis;
  bucket_daily?: BucketRow[];
  bucket_weekly?: BucketRow[];
  bucket_snapshot_dates?: string[];
  bucket_snapshots?: BucketRow[];
  market_benchmark_snapshots?: Record<string, MarketBenchmarkRow[]>;
  risk_sources?: FlowRow[];
  other_leads?: OtherLeadRow[];
  promotion_candidates?: OtherLeadRow[];
  sustained_buckets?: BucketRow[];
  sustained_other_sectors?: OtherLeadRow[];
  sustained_stocks?: FlowRow[];
  sector_daily?: SectorDailyRow[];
  sector_weekly?: SectorWeeklyRow[];
  flow_leads?: FlowRow[];
  rank_movers?: FlowRow[];
  new_entries?: FlowRow[];
  dropped?: FlowRow[];
  top150?: FlowRow[];
}

const fmt = (value?: number | null, digits = 1) =>
  value == null || Number.isNaN(value)
    ? "-"
    : value.toLocaleString("ja-JP", {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      });

const pct = (value?: number | null, digits = 2) =>
  value == null || Number.isNaN(value)
    ? "-"
    : `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`;

const plainPct = (value?: number | null, digits = 1) =>
  value == null || Number.isNaN(value) ? "-" : `${value.toFixed(digits)}%`;

const mult = (value?: number | null) =>
  value == null || Number.isNaN(value) ? "-" : `${value.toFixed(2)}x`;

const oku = (value?: number | null) =>
  value == null || Number.isNaN(value)
    ? "-"
    : `${(value * 10).toLocaleString("ja-JP", { maximumFractionDigits: 0 })}億`;

const tonePct = (value?: number | null) => {
  if (value == null || Number.isNaN(value)) return "text-muted-foreground";
  if (value > 0) return "text-emerald-500";
  if (value < 0) return "text-rose-500";
  return "text-muted-foreground";
};

type Tone = "neutral" | "good" | "bad" | "warn";

const toneColor = (tone: Tone) => {
  const map: Record<Tone, string> = {
    neutral: "#64748B",
    good: "#15803D",
    bad: "#BE123C",
    warn: "#B45309",
  };
  return map[tone];
};

const normalizeTone = (tone?: Tone | string | null): Tone => {
  if (tone === "good" || tone === "bad" || tone === "warn" || tone === "neutral") return tone;
  return "neutral";
};

const toneTextClass = (tone?: Tone | string | null) => {
  const normalized = normalizeTone(tone);
  if (normalized === "good") return "text-emerald-600";
  if (normalized === "bad") return "text-rose-600";
  if (normalized === "warn") return "text-amber-600";
  return "text-foreground";
};

const names = (values?: string[]) => values?.filter(Boolean).join(" / ") || "-";

const regimeLabel = (value?: string | null) => {
  const map: Record<string, string> = {
    "Kioxia Breakdown": "半導体売り優勢",
    "Kioxia Sell / MLCC Selective Bid": "キオクシア売り / MLCC選別買い",
    "Kioxia Sell / Semicon Selective Bid": "キオクシア売り / 中核選別買い",
    "Semicon Core Risk-Off": "半導体中核リスクオフ",
    "Semicon Core Risk-On": "半導体中核リスクオン",
    "Broad Risk-Off": "全面リスクオフ",
    "Relative Strength Outside Semicon": "半導体外が相対優位",
    "Mixed / Neutral": "中立・まちまち",
  };
  return value ? map[value] || value : "-";
};

const clampShare = (value?: number | null) => {
  if (value == null || Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, value));
};

const FLOW_COLORS = {
  kioxia: "#8F3A84",
  semicon: "#3451B2",
  peripheral: "#0F766E",
  etf: "#6B5CA5",
  other: "#667085",
};

const flowColor = (bucket?: string | null) => {
  if (bucket === "kioxia") return FLOW_COLORS.kioxia;
  if (bucket === "semicon_main") return FLOW_COLORS.semicon;
  if (["dc_cable_optical", "electronics_parts", "ai_power_heavy", "robotics_factory_auto"].includes(bucket || "")) {
    return FLOW_COLORS.peripheral;
  }
  if (["semicon_etf", "index_bull", "index_inverse", "index_other"].includes(bucket || "")) {
    return FLOW_COLORS.etf;
  }
  return FLOW_COLORS.other;
};

interface ShareSegment {
  label: string;
  share?: number | null;
  turnover?: number | null;
  oc?: number | null;
  count: number;
  color: string;
}

interface MarketReadRow {
  key: string;
  label: string;
  value: string;
  detail: string;
  tone?: Tone;
}

type DirectionBias = "ロング" | "ロング気配" | "フラット" | "ショート気配" | "ショート";
type ExecutionBias = "静観" | "小ロット" | "積極";

interface TradeStance {
  direction: DirectionBias;
  execution: ExecutionBias;
  title: string;
  summary: string;
  watch: string[];
  avoid: string[];
  entry: string[];
  invalidation: string[];
}

const DIRECTION_STEPS: DirectionBias[] = ["ショート", "ショート気配", "フラット", "ロング気配", "ロング"];
const EXECUTION_STEPS: ExecutionBias[] = ["静観", "小ロット", "積極"];

const compactSector = (value?: string | null) => {
  const map: Record<string, string> = {
    "銀行業": "銀行",
    "輸送用機器": "輸送",
    "情報･通信業": "情報通信",
    "医薬品": "医薬品",
    "保険業": "保険",
    "海運業": "海運",
    "不動産業": "不動産",
    "その他金融業": "金融",
    "鉄鋼": "鉄鋼",
  };
  if (!value) return "";
  return map[value] || value.replace(/業$/u, "");
};

const triggerLabel = (value?: string | null) => {
  const map: Record<string, string> = {
    new: "新規",
    rank_up: "順位上昇",
    early_rank_up: "初動上昇",
    watch: "監視",
  };
  return value ? map[value] || value : "-";
};

const bandLabel = (value?: string | null) => {
  const map: Record<string, string> = {
    top1_30: "1-30",
    top31_100: "31-100",
    top101_150: "101-150",
  };
  return value ? map[value] || value : "-";
};

const persistenceText = (active?: number | null, positive?: number | null) =>
  `${fmt(active, 0)} / ${fmt(positive, 0)}`;

const flowPressure = (row: BucketRow) =>
  ((row.turnover_bil ?? 0) * (row.avg_open_to_close_pct ?? 0)) / 100;

const tv5dDeltaPct = (row: BucketRow) =>
  row.latest_vs_5d_avg == null || Number.isNaN(row.latest_vs_5d_avg)
    ? null
    : (row.latest_vs_5d_avg - 1) * 100;

const marketReadRows = (
  regime?: MarketRegime,
  bucketRows: BucketRow[] = [],
  bucketWeeklyRows: BucketRow[] = [],
  otherLeads: OtherLeadRow[] = [],
): MarketReadRow[] => {
  const semiconExOc = regime?.semicon_ex_kioxia_open_to_close_pct;
  const mlccOc = regime?.mlcc_open_to_close_pct;
  const semiconCoreOc = regime?.semicon_core_open_to_close_pct;
  const semiconWeak =
    semiconExOc != null &&
    semiconExOc < 0 &&
    mlccOc != null &&
    mlccOc < 0;
  const semiconValue = semiconWeak
    ? "内側も弱い"
    : (semiconExOc ?? -1) >= 0.25 || (mlccOc ?? -1) >= 1
      ? "濃淡あり"
      : (semiconCoreOc ?? 0) < 0
        ? "売り優勢"
        : "方向確認";

  const dailyByBucket = new Map(bucketRows.map((row) => [row.bucket, row]));
  const expansionRows = bucketWeeklyRows
    .filter((row) => !["kioxia", "index_other"].includes(row.bucket))
    .map((row) => ({
      row,
      delta: tv5dDeltaPct(row),
      daily: dailyByBucket.get(row.bucket),
    }))
    .filter((item) => item.delta != null && item.delta > 2 && (item.row.latest_turnover_bil ?? 0) > 20)
    .sort((a, b) => (b.delta ?? -999) - (a.delta ?? -999))
    .slice(0, 2);

  const expansionValue = expansionRows.length
    ? expansionRows.map((item) => item.row.label).join(" / ")
    : "目立つ増加なし";
  const expansionDetail = expansionRows.length
    ? expansionRows
        .map((item) => `${item.row.label} ${pct(item.delta, 1)} / OC ${pct(item.daily?.avg_open_to_close_pct, 1)}`)
        .join(" ・ ")
    : "TV5dで確認";

  const otherBucket = dailyByBucket.get("other");
  const sectors = otherLeads
    .filter((row) => (row.promotion_score ?? 0) >= 5)
    .slice(0, 3)
    .map((row) => compactSector(row.sector))
    .filter(Boolean);
  const otherValue = sectors.length ? sectors.join(" / ") : "絞り込み待ち";
  const otherDetail = otherBucket
    ? `全体は耐性止まり / OC ${pct(otherBucket.avg_open_to_close_pct, 1)} / 構成比 ${plainPct(otherBucket.turnover_share_pct, 1)}`
    : "その他内の業種を確認";

  return [
    {
      key: "semicon",
      label: "半導体内訳",
      value: semiconValue,
      detail: `中核ex ${pct(semiconExOc, 1)} / MLCC ${pct(mlccOc, 1)}`,
      tone: semiconWeak ? "bad" : semiconValue === "濃淡あり" ? "warn" : "neutral",
    },
    {
      key: "expansion",
      label: "売買代金増",
      value: expansionValue,
      detail: expansionDetail,
      tone: expansionRows.some((item) => (item.daily?.avg_open_to_close_pct ?? 0) > 0) ? "good" : "warn",
    },
    {
      key: "other",
      label: "その他監視",
      value: otherValue,
      detail: otherDetail,
      tone: (otherBucket?.avg_open_to_close_pct ?? 0) > 0 ? "good" : "neutral",
    },
  ];
};

const positiveExpansionBuckets = (bucketRows: BucketRow[] = [], bucketWeeklyRows: BucketRow[] = []) => {
  const dailyByBucket = new Map(bucketRows.map((row) => [row.bucket, row]));
  return bucketWeeklyRows
    .filter((row) => !["kioxia", "index_bull", "index_inverse", "index_other"].includes(row.bucket))
    .map((row) => ({
      row,
      delta: tv5dDeltaPct(row),
      daily: dailyByBucket.get(row.bucket),
    }))
    .filter((item) =>
      item.delta != null &&
      item.delta >= 5 &&
      (item.row.latest_turnover_bil ?? 0) >= 50 &&
      (item.daily?.avg_open_to_close_pct ?? -999) > 0 &&
      (item.daily?.up_rate_pct ?? 0) >= 50
    )
    .sort((a, b) => (b.delta ?? -999) - (a.delta ?? -999));
};

const buildTradeStance = (
  regime?: MarketRegime,
  temperature?: MarketTemperature,
  bucketRows: BucketRow[] = [],
  bucketWeeklyRows: BucketRow[] = [],
  otherLeads: OtherLeadRow[] = [],
): TradeStance => {
  const kioxiaBreakdown = Boolean(regime?.kioxia_breakdown);
  const semiconCoreOc = regime?.semicon_core_open_to_close_pct;
  const semiconExOc = regime?.semicon_ex_kioxia_open_to_close_pct;
  const mlccOc = regime?.mlcc_open_to_close_pct;
  const allOc = regime?.all_open_to_close_pct;
  const allUp = regime?.all_up_rate_pct;
  const otherOc = regime?.other_open_to_close_pct;
  const score = temperature?.score;
  const expansionBuckets = positiveExpansionBuckets(bucketRows, bucketWeeklyRows).slice(0, 2);
  const strongOther = otherLeads
    .filter((row) =>
      (row.promotion_score ?? 0) >= 6 &&
      (row.avg_open_to_close_pct ?? -999) > 0 &&
      (row.up_rate_pct ?? 0) >= 75 &&
      (row.count ?? 0) >= 2
    )
    .slice(0, 3);

  const watch = [
    ...expansionBuckets.map((item) => item.row.label),
    ...strongOther.map((row) => compactSector(row.sector)),
  ].filter(Boolean);
  const uniqueWatch = Array.from(new Set(watch)).slice(0, 5);

  let direction: DirectionBias = "フラット";
  let execution: ExecutionBias = "静観";
  let title = "方向確認";
  let summary = "強弱が割れているため、主戦場が固まるまで条件待ち。";

  const semiconInsideWeak =
    (semiconExOc != null && semiconExOc < 0) &&
    (mlccOc != null && mlccOc < 0);
  const broadShort =
    allOc != null &&
    allOc <= -2 &&
    allUp != null &&
    allUp < 40;
  const longBreadth =
    allOc != null &&
    allOc > 0 &&
    allUp != null &&
    allUp >= 60;
  const hasLongPocket = uniqueWatch.length > 0 && (otherOc ?? 0) >= 0;

  if (broadShort) {
    direction = "ショート";
    execution = "小ロット";
    title = "下方向優位";
    summary = "広く売られている。戻り売り以外は条件を厳しく見る。";
  } else if (kioxiaBreakdown && semiconInsideWeak) {
    direction = "ショート気配";
    execution = "静観";
    title = "半導体は戻り確認";
    summary = hasLongPocket
      ? "全面ショートではない。攻めるなら半導体外の強い場所だけを小さく見る。"
      : "半導体の左尾が大きい。主戦場が見えるまで待つ。";
  } else if (kioxiaBreakdown || (semiconCoreOc ?? 0) < -1) {
    direction = "フラット";
    execution = "静観";
    title = "売り圧の消化待ち";
    summary = "半導体の重さが残る。強いbucketだけを候補に残す。";
  } else if (longBreadth && expansionBuckets.length >= 2 && (score ?? 0) >= 60) {
    direction = "ロング";
    execution = "積極";
    title = "上方向優位";
    summary = "売買代金、騰落、広がりが揃う。主戦場を絞って攻める。";
  } else if (hasLongPocket) {
    direction = "ロング気配";
    execution = (score ?? 0) >= 50 ? "小ロット" : "静観";
    title = "選別ロング候補";
    summary = "全体ではなく、売買代金増と陽線が揃う場所だけを見る。";
  }

  return {
    direction,
    execution,
    title,
    summary,
    watch: uniqueWatch.length ? uniqueWatch : ["継続候補待ち"],
    avoid: kioxiaBreakdown
      ? ["半導体ETF一括ロング", "キオクシア逆張り", "売買代金増×下落"]
      : ["根拠の薄いETF一括", "VWAP下の追随", "単日だけの急騰追い"],
    entry: ["VWAP上維持", "売買代金増の継続", "Top150全体が崩れない"],
    invalidation: [
      "主力がVWAP下に沈む",
      "売買代金増が下落に転ぶ",
      kioxiaBreakdown ? "半導体急落が周辺へ波及" : "監視bucketのUp率が低下",
    ],
  };
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const compactLabel = (value?: string | null, limit = 10) => {
  if (!value) return "-";
  return value.length > limit ? `${value.slice(0, limit)}...` : value;
};

const quadrantLabel = (tvDelta?: number | null, oc?: number | null) => {
  const tvUp = (tvDelta ?? 0) >= 0;
  const priceUp = (oc ?? 0) >= 0;
  if (tvUp && priceUp) return "資金増 × 上昇";
  if (tvUp && !priceUp) return "資金増 × 下落";
  if (!tvUp && priceUp) return "資金減 × 上昇";
  return "資金減 × 下落";
};

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="border-t border-border/70 pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function RankDelta({ value, isNew }: { value?: number | null; isNew?: boolean | null }) {
  if (isNew) {
    return <span className="rounded border border-emerald-500/30 px-1.5 py-0.5 text-xs text-emerald-500">NEW</span>;
  }
  if (value == null || Number.isNaN(value)) return <span className="text-muted-foreground">-</span>;
  const cls = value > 0 ? "text-emerald-500" : value < 0 ? "text-rose-500" : "text-muted-foreground";
  return <span className={cls}>{value > 0 ? "+" : ""}{Math.round(value)}</span>;
}

function TickerLink({ row }: { row: FlowRow }) {
  const label = row.code || row.ticker || "-";
  if (!row.ticker) return <span>{label}</span>;
  return (
    <Link href={`/${row.ticker}`} className="font-medium text-foreground hover:underline">
      {label}
    </Link>
  );
}

function BucketStockTable({ rows }: { rows: FlowRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-sm">
        <thead className="bg-muted/30 text-xs text-muted-foreground">
          <tr>
            <th className="px-2 py-2 text-right font-medium">Rank</th>
            <th className="px-2 py-2 text-right font-medium">Δ</th>
            <th className="px-2 py-2 text-left font-medium">Code</th>
            <th className="px-2 py-2 text-left font-medium">Name</th>
            <th className="px-2 py-2 text-left font-medium">Sector</th>
            <th className="px-2 py-2 text-right font-medium">売買代金</th>
            <th className="px-2 py-2 text-right font-medium">OC</th>
            <th className="px-2 py-2 text-right font-medium">継続/陽線</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.date}-${row.ticker}-${row.rank}`} className="border-t hover:bg-muted/30">
              <td className="px-2 py-2 text-right">{fmt(row.rank, 0)}</td>
              <td className="px-2 py-2 text-right"><RankDelta value={row.rank_change} isNew={row.is_new_top150} /></td>
              <td className="px-2 py-2"><TickerLink row={row} /></td>
              <td className="max-w-[260px] truncate px-2 py-2">{row.stock_name || "-"}</td>
              <td className="max-w-[160px] truncate px-2 py-2">{row.sectors || "-"}</td>
              <td className="px-2 py-2 text-right">{oku(row.trading_value_billion)}</td>
              <td className={`px-2 py-2 text-right ${tonePct(row.open_to_close_pct)}`}>{pct(row.open_to_close_pct, 2)}</td>
              <td className="px-2 py-2 text-right">{persistenceText(row.consecutive_days_in_top150, row.positive_streak_days)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TemperatureGauge({
  value,
  tone,
}: {
  value?: number | null;
  tone?: Tone | string | null;
}) {
  const safeValue = value == null || Number.isNaN(value) ? null : clamp(value, 0, 100);
  const angle = -180 + ((safeValue ?? 0) / 100) * 180;
  const needleX = 80 + Math.cos((angle * Math.PI) / 180) * 52;
  const needleY = 74 + Math.sin((angle * Math.PI) / 180) * 52;
  const color = toneColor(normalizeTone(tone));

  return (
    <svg viewBox="0 0 160 96" className="h-[96px] w-full" role="img" aria-label={`短期温度 ${safeValue ?? "-"}`}>
      <defs>
        <linearGradient id="market-flow-temperature-gauge" x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="#BE123C" />
          <stop offset="50%" stopColor="#B45309" />
          <stop offset="100%" stopColor="#15803D" />
        </linearGradient>
      </defs>
      <path
        d="M 20 74 A 60 60 0 0 1 140 74"
        fill="none"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
        className="text-muted"
      />
      <path
        d="M 20 74 A 60 60 0 0 1 140 74"
        fill="none"
        stroke="url(#market-flow-temperature-gauge)"
        strokeWidth="10"
        strokeLinecap="round"
        opacity="0.42"
      />
      <line x1="80" y1="74" x2={needleX} y2={needleY} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="80" cy="74" r="4" fill={color} />
      <text x="20" y="91" className="fill-muted-foreground text-[10px]">0</text>
      <text x="80" y="20" textAnchor="middle" className="fill-muted-foreground text-[10px]">50</text>
      <text x="140" y="91" textAnchor="end" className="fill-muted-foreground text-[10px]">100</text>
    </svg>
  );
}

function MarketTemperatureCard({
  temperature,
  regime,
  summary,
  bucketRows,
  bucketWeeklyRows,
  otherLeads,
}: {
  temperature?: MarketTemperature;
  regime?: MarketRegime;
  summary?: Summary;
  bucketRows?: BucketRow[];
  bucketWeeklyRows?: BucketRow[];
  otherLeads?: OtherLeadRow[];
}) {
  const score = temperature?.score;
  const scoreValue = score == null || Number.isNaN(score) ? null : Math.round(score);
  const components = temperature?.components ?? [];
  const reads = marketReadRows(regime, bucketRows, bucketWeeklyRows, otherLeads);
  const subtitle = regime?.primary === "Kioxia Breakdown"
    ? "商いの逃げ先を確認"
    : temperature?.label || "-";

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="grid border-b lg:grid-cols-[minmax(0,1fr)_224px]">
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium text-muted-foreground">
              地合い
            </span>
            <span className="rounded border px-2 py-0.5 text-[11px] text-muted-foreground">
              {temperature?.stance || "-"}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
            <h2 className="text-xl font-semibold tracking-normal">{regimeLabel(regime?.primary)}</h2>
            <span className="text-sm text-muted-foreground">{subtitle}</span>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {reads.map((row) => (
              <div key={row.key} className="min-w-0 rounded-md border bg-muted/10 px-2.5 py-2">
                <div className="text-[10px] font-medium text-muted-foreground">{row.label}</div>
                <div className={`mt-1 truncate text-sm font-semibold ${toneTextClass(row.tone)}`}>{row.value}</div>
                <div className="mt-1 truncate text-[11px] text-muted-foreground">{row.detail}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t p-4 lg:border-l lg:border-t-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-medium text-muted-foreground">短期温度</div>
              <div className={`mt-1 text-3xl font-semibold tracking-normal tabular-nums ${toneTextClass(temperature?.tone)}`}>
                {scoreValue ?? "-"}
              </div>
            </div>
            <div className="w-[118px] shrink-0">
              <TemperatureGauge value={scoreValue} tone={temperature?.tone} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid border-b sm:grid-cols-2 xl:grid-cols-4">
        {components.map((component) => (
          <div key={component.key} className="border-t p-3 xl:border-r xl:border-t-0 xl:last:border-r-0">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs font-medium text-muted-foreground">{component.label}</span>
              <span className={`text-sm font-semibold tabular-nums ${toneTextClass(component.tone)}`}>
                {fmt(component.score, 0)}
              </span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${clamp(component.score ?? 0, 0, 100)}%`,
                  backgroundColor: toneColor(normalizeTone(component.tone)),
                }}
              />
            </div>
            <div className="mt-2 truncate text-xs text-foreground">{component.headline || "-"}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3">
        <div className="border-t p-3 md:border-r md:border-t-0">
          <div className="text-[11px] font-medium text-muted-foreground">集中</div>
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium">キオクシア</span>
            <span className="text-sm font-semibold tabular-nums">{plainPct(summary?.kioxia_share_pct, 1)}</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-3 text-xs">
            <span className="text-muted-foreground">中核OC</span>
            <span className={`font-medium tabular-nums ${tonePct(summary?.semicon_core_open_to_close_pct)}`}>
              {pct(summary?.semicon_core_open_to_close_pct, 2)}
            </span>
          </div>
        </div>
        <div className="border-t p-3 md:border-r md:border-t-0">
          <div className="text-[11px] font-medium text-muted-foreground">半導体外</div>
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium">その他</span>
            <span className={`text-sm font-semibold tabular-nums ${tonePct(summary?.other_open_to_close_pct)}`}>
              {pct(summary?.other_open_to_close_pct, 2)}
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-3 text-xs">
            <span className="text-muted-foreground">構成比</span>
            <span className="font-medium tabular-nums">{plainPct(summary?.other_share_pct, 1)}</span>
          </div>
        </div>
        <div className="border-t p-3 md:border-t-0">
          <div className="text-[11px] font-medium text-muted-foreground">騰落</div>
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium">Top150 上昇率</span>
            <span className="text-sm font-semibold tabular-nums">{plainPct(regime?.all_up_rate_pct, 1)}</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-3 text-xs">
            <span className="text-muted-foreground">新規 / 脱落</span>
            <span className="font-medium tabular-nums">
              {fmt(summary?.new_non_semiconductor_count, 0)} / {fmt(summary?.dropped_non_semiconductor_count, 0)}
            </span>
          </div>
        </div>
      </div>

      {temperature?.warnings?.length ? (
        <div className="border-t px-4 py-2 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="font-medium text-foreground">注記</span>
            {temperature?.warnings?.map((warning) => (
              <span key={warning} className="rounded-sm border px-1.5 py-0.5 text-[11px]">
                {warning}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AxisRail<T extends string>({ label, steps, active }: { label: string; steps: T[]; active: T }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">{label}</div>
      <div
        className="grid overflow-hidden rounded-md border bg-muted/20"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      >
        {steps.map((step) => (
          <div
            key={step}
            className={`border-r px-2 py-1.5 text-center text-[11px] font-medium last:border-r-0 ${
              step === active ? "bg-foreground text-background" : "text-muted-foreground"
            }`}
          >
            {step}
          </div>
        ))}
      </div>
    </div>
  );
}

function CompactList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-[11px] font-medium text-muted-foreground">{title}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span key={item} className="rounded-sm border bg-background px-2 py-1 text-[11px] text-foreground">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function TradeStanceCard({ stance }: { stance: TradeStance }) {
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="grid border-b lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium text-muted-foreground">売買スタンス</span>
            <span className="rounded border px-2 py-0.5 text-[11px] text-muted-foreground">方向 × 実行</span>
          </div>
          <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
            <h2 className="text-xl font-semibold tracking-normal">{stance.title}</h2>
            <span className="text-sm text-muted-foreground">{stance.direction} / {stance.execution}</span>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{stance.summary}</p>
        </div>
        <div className="grid gap-3 border-t p-4 lg:border-l lg:border-t-0">
          <AxisRail label="方向" steps={DIRECTION_STEPS} active={stance.direction} />
          <AxisRail label="実行" steps={EXECUTION_STEPS} active={stance.execution} />
        </div>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
        <CompactList title="見る" items={stance.watch} />
        <CompactList title="控える" items={stance.avoid} />
        <CompactList title="入る条件" items={stance.entry} />
        <CompactList title="無効化" items={stance.invalidation} />
      </div>
    </section>
  );
}

const GATE_LABELS: Record<string, string> = {
  sample_count: "標本数",
  profit_factor: "PF",
  average_return: "平均損益",
  execution_completion: "執行完了率",
  loss_streak: "連敗上限",
};

const ROUTE_LABELS: Record<string, string> = {
  S_0930_SELF_TO_1400: "09:30 弱含みショート",
  S_1000_BREADTH_TO_1130: "10:00 面確認ショート",
  L_1400_STRICT_TO_1530: "14:00 厳格ロング",
};

function ExecutionProgramPanel({ program }: { program?: ExecutionProgram }) {
  if (!program?.available || !program.phase_status) {
    return (
      <section className="rounded-lg border bg-card p-4">
        <div className="text-xs font-medium text-muted-foreground">200A Execution Program</div>
        <div className="mt-1 text-sm">{program?.reason || "Phase 2データ未作成"}</div>
      </section>
    );
  }

  const status = program.phase_status;
  const metrics = status.forward_metrics ?? {};
  const checks = status.gate_checks ?? {};
  const minimumSignals = status.gate?.minimum_completed_primary_signals ?? 20;
  const eligible = Boolean(status.phase3_live_eligible);
  const latestByRule = new Map((program.latest_routes ?? []).map((row) => [row.rule_id, row]));
  const metricRows = [
    ["完了primary", `${metrics.completed_primary_signals ?? 0} / ${minimumSignals}`],
    ["Net PF", fmt(metrics.net_profit_factor, 2)],
    ["平均", metrics.net_average_bps == null ? "-" : `${fmt(metrics.net_average_bps, 1)} bps`],
    ["執行完了", plainPct(metrics.execution_completion_rate_pct, 1)],
    ["最大連敗", fmt(metrics.maximum_consecutive_losses, 0)],
    ["Shadow 30株", metrics.total_shadow_pnl_yen_30 == null ? "-" : `${fmt(metrics.total_shadow_pnl_yen_30, 0)}円`],
  ];

  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="grid border-b lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium text-muted-foreground">200A Execution Program</span>
            <span className={`rounded-sm border px-2 py-0.5 text-[11px] font-semibold ${eligible ? "border-emerald-500/40 text-emerald-600" : "border-amber-500/40 text-amber-600"}`}>
              {eligible ? "PHASE 3 ELIGIBLE" : "PHASE 2 SHADOW"}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            {eligible ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <LockKeyhole className="h-5 w-5 text-amber-600" />}
            <h2 className="text-lg font-semibold">
              {eligible ? `${status.phase3_stage1_shares ?? 1}株の手動実弾へ昇格可` : "実弾ロック"}
            </h2>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            version {status.strategy_version || "-"} / forward {status.forward_start_date || "-"} / 自動発注なし
          </div>
        </div>
        <div className="border-t p-4 lg:border-l lg:border-t-0">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-[10px] text-muted-foreground">昇格標本</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {metrics.completed_primary_signals ?? 0}
                <span className="ml-1 text-xs font-normal text-muted-foreground">/ {minimumSignals}</span>
              </div>
            </div>
            <div className="text-right text-[11px] text-muted-foreground">
              凍結基準 {status.frozen_at || "-"}
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={eligible ? "h-full bg-emerald-500" : "h-full bg-amber-500"}
              style={{ width: `${Math.min(100, ((metrics.completed_primary_signals ?? 0) / minimumSignals) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid border-b sm:grid-cols-3 lg:grid-cols-6">
        {metricRows.map(([label, value]) => (
          <div key={`metric-${label}`} className="border-t px-3 py-2.5 sm:border-r sm:first:border-t-0 lg:border-t-0 lg:last:border-r-0">
            <div className="text-[10px] text-muted-foreground">{label}</div>
            <div className="mt-0.5 text-sm font-medium tabular-nums">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid md:grid-cols-3">
          {(status.routes ?? []).map((route) => {
            const latest = latestByRule.get(route.rule_id);
            return (
              <div key={route.rule_id} className="border-t p-3 md:border-r md:border-t-0 md:last:border-r-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">{ROUTE_LABELS[route.rule_id] || route.rule_id}</div>
                  <span className={route.side === "long" ? "text-xs font-semibold text-emerald-600" : "text-xs font-semibold text-rose-600"}>
                    {route.side?.toUpperCase()}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {route.signal_time} → {route.exit_time}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="rounded-sm border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {latest?.triggered ? "TRIGGER" : latest?.signal_available ? "NO SIGNAL" : "WAIT DATA"}
                  </span>
                  {latest?.primary_selected ? (
                    <span className="rounded-sm border border-primary/40 px-1.5 py-0.5 text-[10px] font-semibold text-primary">PRIMARY</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        <div className="border-t p-3 lg:border-l lg:border-t-0">
          <div className="text-[11px] font-medium text-muted-foreground">Phase 3 Gate</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(checks).map(([key, passed]) => (
              <span key={key} className={`rounded-sm border px-1.5 py-0.5 text-[10px] font-medium ${passed ? "border-emerald-500/30 text-emerald-600" : "border-amber-500/30 text-amber-600"}`}>
                {passed ? "PASS" : "WAIT"} {GATE_LABELS[key] || key}
              </span>
            ))}
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">
            最新判定日: {program.latest_route_date || "未開始"}
          </div>
        </div>
      </div>
    </section>
  );
}

const severityLabel = (severity?: string | null) => {
  if (severity === "high") return "HIGH";
  if (severity === "medium") return "MED";
  if (severity === "warn") return "WARN";
  return "INFO";
};

const severityClass = (severity?: string | null) => {
  if (severity === "high") return "border-rose-500/40 bg-rose-500/5 text-rose-600";
  if (severity === "medium" || severity === "warn") return "border-amber-500/40 bg-amber-500/5 text-amber-600";
  return "border-slate-400/30 bg-muted/20 text-muted-foreground";
};

function FlowAlertColumn({
  title,
  icon,
  alerts,
}: {
  title: string;
  icon: ReactNode;
  alerts?: FlowAnalysisAlert[];
}) {
  const rows = alerts ?? [];
  return (
    <div className="border-t p-3 lg:border-t-0 lg:border-r lg:last:border-r-0">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon}
        {title}
      </div>
      <div className="mt-3 space-y-2">
        {rows.length ? rows.slice(0, 4).map((alert) => (
          <div key={alert.key} className="space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm font-medium leading-snug">{alert.title}</div>
              <span className={`shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold ${severityClass(alert.severity)}`}>
                {severityLabel(alert.severity)}
              </span>
            </div>
            {alert.evidence?.length ? (
              <div className="flex flex-wrap gap-1">
                {alert.evidence.slice(0, 4).map((item) => (
                  <span key={item} className="rounded-sm border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
            {alert.note ? <div className="text-[11px] leading-relaxed text-muted-foreground">{alert.note}</div> : null}
          </div>
        )) : (
          <div className="text-xs text-muted-foreground">該当なし</div>
        )}
      </div>
    </div>
  );
}

const stockLabel = (stock: FlowAnalysisStock) =>
  `${stock.name || stock.ticker || "-"} ${pct(stock.open_to_close_pct, 1)}`;

function HypothesisChecks({ checks }: { checks?: FlowAnalysisCheck[] }) {
  const rows = checks ?? [];
  if (!rows.length) return null;
  return (
    <div className="grid border-b md:grid-cols-3">
      {rows.map((check) => (
        <div key={check.key} className="border-t p-3 md:border-r md:border-t-0 md:last:border-r-0">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-medium text-muted-foreground">{check.label}</div>
            <span className="rounded-sm border bg-muted/20 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {check.status}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {check.evidence?.map((item) => (
              <span key={item} className="rounded-sm border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
                {item}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FocusGroups({ groups }: { groups?: FlowAnalysisFocusGroup[] }) {
  const rows = groups ?? [];
  return (
    <div className="border-b">
      <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">重点確認</div>
      <div className="grid lg:grid-cols-2">
        {rows.length ? rows.map((group) => (
          <div key={group.key} className="border-t p-3 lg:border-r lg:border-t-0 lg:last:border-r-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium">{group.label}</div>
              <span className="rounded-sm border bg-muted/20 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {group.status}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {group.evidence?.map((item) => (
                <span key={item} className="rounded-sm border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
                  {item}
                </span>
              ))}
            </div>
            <div className="mt-3 grid gap-2 text-xs md:grid-cols-2">
              <div>
                <div className="text-muted-foreground">強い</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {group.positive_leaders?.length ? group.positive_leaders.slice(0, 4).map((stock) => (
                    <span key={`${group.key}-positive-${stock.ticker}`} className="rounded-sm border px-1.5 py-0.5 text-emerald-600">
                      {stockLabel(stock)}
                    </span>
                  )) : <span className="text-muted-foreground">目立たず</span>}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">弱い</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {group.weak_laggards?.length ? group.weak_laggards.slice(0, 3).map((stock) => (
                    <span key={`${group.key}-weak-${stock.ticker}`} className="rounded-sm border px-1.5 py-0.5 text-rose-600">
                      {stockLabel(stock)}
                    </span>
                  )) : <span className="text-muted-foreground">目立たず</span>}
                </div>
              </div>
            </div>
          </div>
        )) : (
          <div className="p-3 text-xs text-muted-foreground">該当なし</div>
        )}
      </div>
    </div>
  );
}

function FlowAnalysisPanel({ analysis }: { analysis?: FlowAnalysis }) {
  if (!analysis) return null;
  const state = analysis.market_state;
  const rawScore = state?.signal_score;
  const score = rawScore == null || Number.isNaN(rawScore) ? null : Math.round(rawScore);
  const tradeLens = analysis.trade_lens?.[0];

  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="grid border-b lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="p-4">
          <div className="text-[11px] font-medium text-muted-foreground">Top150資金フロー</div>
          <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-1">
            <h2 className="text-xl font-semibold tracking-normal">{state?.label || "-"}</h2>
            <span className="text-sm text-muted-foreground">{state?.stance || "-"}</span>
          </div>
          <p className="mt-2 max-w-4xl text-sm leading-relaxed text-muted-foreground">
            {state?.summary || "点・線・面の信号を確認中。"}
          </p>
        </div>
        <div className="border-t p-4 lg:border-l lg:border-t-0">
          <div className="text-[11px] font-medium text-muted-foreground">信号強度</div>
          <div className="mt-1 text-3xl font-semibold tabular-nums">{score ?? "-"}</div>
          <div className="mt-2 h-1 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${clamp(score ?? 0, 0, 100)}%` }}
            />
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">観測ベース</div>
        </div>
      </div>

      <HypothesisChecks checks={analysis.hypothesis_checks} />
      <FocusGroups groups={analysis.focus_groups} />

      <div className="grid lg:grid-cols-3">
        <FlowAlertColumn
          title="個別・ETF"
          icon={<Target className="h-3.5 w-3.5" />}
          alerts={analysis.point_alerts}
        />
        <FlowAlertColumn
          title="相対比較"
          icon={<Activity className="h-3.5 w-3.5" />}
          alerts={analysis.line_alerts}
        />
        <FlowAlertColumn
          title="テーマ"
          icon={<Layers className="h-3.5 w-3.5" />}
          alerts={analysis.surface_alerts}
        />
      </div>

      <div className="grid border-t lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="p-3 lg:border-r">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <ShieldAlert className="h-3.5 w-3.5" />
            未成立
          </div>
          <div className="mt-3 space-y-2">
            {(analysis.not_observed ?? []).length ? analysis.not_observed?.map((alert) => (
              <div key={alert.key}>
                <div className="text-sm font-medium">{alert.title}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {alert.evidence?.map((item) => (
                    <span key={item} className="rounded-sm border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )) : <div className="text-xs text-muted-foreground">該当なし</div>}
          </div>
        </div>
        <div className="p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <ArrowUpRight className="h-3.5 w-3.5" />
            方針
          </div>
          <div className="mt-2 text-sm font-medium">{tradeLens?.title || "-"}</div>
          <div className="mt-2 grid gap-3 text-xs md:grid-cols-3">
            <div>
              <div className="text-muted-foreground">見る</div>
              <div className="mt-1 leading-relaxed">{tradeLens?.watch?.join(" / ") || "-"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">避ける</div>
              <div className="mt-1 leading-relaxed">{tradeLens?.avoid?.join(" / ") || "-"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">翌日確認</div>
              <div className="mt-1 leading-relaxed">{tradeLens?.next_day_checks?.join(" / ") || "-"}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ShareCompositionCard({
  totalTurnover,
  historyRows,
  segments,
}: {
  totalTurnover?: number | null;
  historyRows?: number | null;
  segments: ShareSegment[];
}) {
  const sortedSegments = [...segments].sort((a, b) => (b.share ?? 0) - (a.share ?? 0));
  const leader = sortedSegments[0];
  const positiveCount = segments.filter((segment) => (segment.oc ?? 0) > 0).length;
  const negativeCount = segments.filter((segment) => (segment.oc ?? 0) < 0).length;

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-medium text-muted-foreground">
              売買代金構成
            </div>
            <div className="mt-1 text-xl font-semibold tracking-normal">Top150 {oku(totalTurnover)}</div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>履歴 {fmt(historyRows, 0)}行</div>
            <div className="mt-1">上昇 {fmt(positiveCount, 0)} / 下落 {fmt(negativeCount, 0)} 分類</div>
          </div>
        </div>

        <div className="mt-4 flex h-3 overflow-hidden rounded-sm border bg-muted/30">
          {segments.map((segment) => (
            <div
              key={segment.label}
              className="h-full min-w-[2px]"
              style={{ width: `${clampShare(segment.share)}%`, backgroundColor: segment.color }}
              title={`${segment.label} ${plainPct(segment.share, 1)} / ${fmt(segment.count, 0)}銘柄`}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 border-b text-xs">
        <div className="p-3">
          <div className="text-muted-foreground">最大</div>
          <div className="mt-1 truncate font-semibold">{leader?.label || "-"}</div>
        </div>
        <div className="border-l p-3 text-right">
          <div className="text-muted-foreground">構成比</div>
          <div className="mt-1 font-semibold tabular-nums">{plainPct(leader?.share, 1)}</div>
        </div>
        <div className="border-l p-3 text-right">
          <div className="text-muted-foreground">OC</div>
          <div className={`mt-1 font-semibold tabular-nums ${tonePct(leader?.oc)}`}>{pct(leader?.oc, 2)}</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-muted/30 text-[11px] text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">分類</th>
              <th className="px-3 py-2 text-right font-medium">銘柄数</th>
              <th className="px-3 py-2 text-right font-medium">構成比</th>
              <th className="px-3 py-2 text-right font-medium">売買代金</th>
              <th className="px-3 py-2 text-right font-medium">OC</th>
            </tr>
          </thead>
          <tbody>
            {segments.map((segment) => (
              <tr key={segment.label} className="border-t">
                <td className="px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: segment.color }} />
                    <span className="truncate font-medium">{segment.label}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmt(segment.count, 0)}</td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">{plainPct(segment.share, 1)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{oku(segment.turnover)}</td>
                <td className={`px-3 py-2 text-right font-medium tabular-nums ${tonePct(segment.oc)}`}>{pct(segment.oc, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PersistencePanel({
  buckets,
  sectors,
  stocks,
}: {
  buckets: BucketRow[];
  sectors: OtherLeadRow[];
  stocks: FlowRow[];
}) {
  return (
    <Section title="持続性チェック">
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-lg border bg-card p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium">継続Bucket</span>
            <span className="text-muted-foreground">継続 / 陽線</span>
          </div>
          <div className="space-y-2">
            {buckets.slice(0, 6).map((row) => (
              <div key={row.bucket} className="grid grid-cols-[minmax(0,1fr)_64px_72px] items-center gap-2 text-sm">
                <div className="truncate font-medium">{row.label}</div>
                <div className="text-right tabular-nums">{persistenceText(row.active_streak_days, row.positive_streak_days)}</div>
                <div className={`text-right tabular-nums ${tonePct(row.avg_open_to_close_pct)}`}>{pct(row.avg_open_to_close_pct, 2)}</div>
              </div>
            ))}
            {buckets.length === 0 && <div className="py-3 text-center text-sm text-muted-foreground">-</div>}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium">その他業種</span>
            <span className="text-muted-foreground">継続 / 陽線</span>
          </div>
          <div className="space-y-2">
            {sectors.slice(0, 6).map((row) => (
              <div key={row.sector} className="grid grid-cols-[minmax(0,1fr)_64px_72px] items-center gap-2 text-sm">
                <div className="truncate font-medium">{row.sector}</div>
                <div className="text-right tabular-nums">{persistenceText(row.active_streak_days, row.positive_streak_days)}</div>
                <div className={`text-right tabular-nums ${tonePct(row.avg_open_to_close_pct)}`}>{pct(row.avg_open_to_close_pct, 2)}</div>
              </div>
            ))}
            {sectors.length === 0 && <div className="py-3 text-center text-sm text-muted-foreground">-</div>}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium">継続個別</span>
            <span className="text-muted-foreground">継続 / 陽線</span>
          </div>
          <div className="space-y-2">
            {stocks.slice(0, 7).map((row) => (
              <div key={`${row.ticker}-${row.rank}`} className="grid grid-cols-[42px_minmax(0,1fr)_64px_72px] items-center gap-2 text-sm">
                <div className="text-right text-muted-foreground">#{fmt(row.rank, 0)}</div>
                <div className="min-w-0">
                  <div className="truncate font-medium">{row.stock_name || row.code || "-"}</div>
                  <div className="text-[11px] text-muted-foreground">{row.sectors || "-"}</div>
                </div>
                <div className="text-right tabular-nums">{persistenceText(row.consecutive_days_in_top150, row.positive_streak_days)}</div>
                <div className={`text-right tabular-nums ${tonePct(row.open_to_close_pct)}`}>{pct(row.open_to_close_pct, 2)}</div>
              </div>
            ))}
            {stocks.length === 0 && <div className="py-3 text-center text-sm text-muted-foreground">-</div>}
          </div>
        </div>
      </div>
    </Section>
  );
}

function BucketBubblePlot({ rows, benchmark }: { rows: BucketRow[]; benchmark?: MarketBenchmarkRow | null }) {
  type BubbleHover = {
    row: BucketRow;
    x: number;
    y: number;
    tvDelta: number | null;
    oc: number;
    isClipped: boolean;
  };

  const [hovered, setHovered] = useState<BubbleHover | null>(null);
  const source = rows.filter((row) => (row.turnover_bil ?? 0) > 0);
  const xAbsMax = 100;
  const yMax = 10;
  const maxShare = Math.max(...source.map((row) => row.turnover_share_pct ?? 0), 1);
  const plot = { left: 82, top: 28, width: 768, height: 444 };
  const xScale = (value?: number | null) => plot.left + (((value ?? 0) + xAbsMax) / (xAbsMax * 2 || 1)) * plot.width;
  const yScale = (value?: number | null) => plot.top + ((yMax - (value ?? 0)) / (yMax * 2)) * plot.height;
  const zeroY = yScale(0);
  const baseX = xScale(0);
  const benchmarkTv = benchmark?.tv5d_delta_pct ?? null;
  const benchmarkOc = benchmark?.oc_pct ?? null;
  const benchmarkX = benchmarkTv == null ? null : xScale(clamp(benchmarkTv, -xAbsMax, xAbsMax));
  const benchmarkY = benchmarkOc == null ? null : yScale(clamp(benchmarkOc, -yMax, yMax));
  const hoverTransform = hovered
    ? `translate(${hovered.x > 650 ? "calc(-100% - 16px)" : "16px"}, ${hovered.y > 420 ? "-100%" : hovered.y < 130 ? "0" : "-50%"})`
    : undefined;

  return (
    <div className="relative rounded-lg border bg-card p-3">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-medium">TV5dΔ × OC</span>
        <span className="text-muted-foreground">円サイズ=Share</span>
      </div>
      <svg viewBox="0 0 900 560" className="h-[560px] w-full overflow-visible">
        <rect x={plot.left} y={plot.top} width={plot.width} height={plot.height} fill="none" stroke="currentColor" className="text-border" strokeWidth="1" />
        <line x1={plot.left} y1={zeroY} x2={plot.left + plot.width} y2={zeroY} stroke="currentColor" className="text-border" strokeWidth="1.5" />
        <line x1={baseX} y1={plot.top} x2={baseX} y2={plot.top + plot.height} stroke="currentColor" className="text-muted-foreground" strokeDasharray="5 5" strokeWidth="1.5" />
        {benchmarkX != null && (
          <>
            <line x1={benchmarkX} y1={plot.top} x2={benchmarkX} y2={plot.top + plot.height} stroke="#2563eb" strokeDasharray="8 6" strokeWidth="2" opacity="0.72" />
            <text x={benchmarkX + 6} y={plot.top + 16} className="fill-blue-600 text-[12px] font-medium">
              {benchmark?.label} TV
            </text>
          </>
        )}
        {benchmarkY != null && (
          <>
            <line x1={plot.left} y1={benchmarkY} x2={plot.left + plot.width} y2={benchmarkY} stroke="#2563eb" strokeDasharray="8 6" strokeWidth="2" opacity="0.72" />
            <text x={plot.left + plot.width - 6} y={benchmarkY - 6} textAnchor="end" className="fill-blue-600 text-[12px] font-medium">
              {benchmark?.label} OC
            </text>
          </>
        )}
        <text x={plot.left - 14} y={plot.top + 6} textAnchor="end" className="fill-muted-foreground text-[13px]">{pct(yMax, 0)}</text>
        <text x={plot.left - 14} y={zeroY + 5} textAnchor="end" className="fill-muted-foreground text-[13px]">0%</text>
        <text x={plot.left - 14} y={plot.top + plot.height} textAnchor="end" className="fill-muted-foreground text-[13px]">{pct(-yMax, 0)}</text>
        <text x={plot.left} y={plot.top + plot.height + 30} className="fill-muted-foreground text-[13px]">{pct(-xAbsMax, 0)}</text>
        <text x={baseX} y={plot.top + plot.height + 30} textAnchor="middle" className="fill-muted-foreground text-[13px]">0%</text>
        <text x={plot.left + plot.width - 6} y={plot.top + plot.height + 30} textAnchor="end" className="fill-muted-foreground text-[13px]">
          {pct(xAbsMax, 0)}
        </text>
        <text x={plot.left + plot.width / 2} y={plot.top + plot.height + 56} textAnchor="middle" className="fill-muted-foreground text-[13px]">
          TV5dΔ
        </text>
        {source.map((row, index) => {
          const tvDelta = tv5dDeltaPct(row);
          const oc = row.avg_open_to_close_pct ?? 0;
          const clampedTvDelta = clamp(tvDelta ?? 0, -xAbsMax, xAbsMax);
          const clampedOc = clamp(oc, -yMax, yMax);
          const isClipped = clampedTvDelta !== (tvDelta ?? 0) || clampedOc !== oc;
          const x = xScale(clampedTvDelta);
          const y = yScale(clampedOc);
          const radius = 10 + Math.sqrt((row.turnover_share_pct ?? 0) / maxShare) * 30;
          const isPositive = oc > 0;
          return (
            <g
              key={row.bucket}
              tabIndex={0}
              className="outline-none"
              onBlur={() => setHovered(null)}
              onFocus={() => setHovered({ row, x, y, tvDelta, oc, isClipped })}
              onMouseEnter={() => setHovered({ row, x, y, tvDelta, oc, isClipped })}
              onMouseLeave={() => setHovered(null)}
            >
              <circle
                cx={x}
                cy={y}
                r={radius}
                fill={flowColor(row.bucket)}
                opacity={0.72}
                stroke={isPositive ? "#047857" : "#be123c"}
                strokeWidth={isClipped ? 3 : 2}
                strokeDasharray={isClipped ? "5 3" : undefined}
                aria-label={`${row.label} Share ${plainPct(row.turnover_share_pct, 1)} TV5dΔ ${pct(tvDelta, 1)} OC ${pct(row.avg_open_to_close_pct, 2)}`}
              />
              <text
                x={x + radius + 4}
                y={y + (index % 2 === 0 ? -4 : 10)}
                className="fill-foreground text-[13px] font-medium"
              >
                {compactLabel(row.label, 11)}
              </text>
              <text x={x} y={y + 5} textAnchor="middle" className="fill-white text-[12px] font-semibold">
                {plainPct(row.turnover_share_pct, row.turnover_share_pct && row.turnover_share_pct >= 10 ? 0 : 1)}
              </text>
            </g>
          );
        })}
      </svg>
      {hovered && (
        <div
          className="pointer-events-none absolute z-20 w-72 rounded-md border bg-popover p-3 text-xs text-popover-foreground shadow-md"
          style={{
            left: `${(hovered.x / 900) * 100}%`,
            top: `${(hovered.y / 560) * 100}%`,
            transform: hoverTransform,
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{hovered.row.label}</div>
              <div className="mt-0.5 text-muted-foreground">{quadrantLabel(hovered.tvDelta, hovered.oc)}</div>
            </div>
            {hovered.isClipped && (
              <span className="shrink-0 rounded border border-amber-500/30 px-1.5 py-0.5 text-[10px] text-amber-600">
                範囲外
              </span>
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
            <div className="text-muted-foreground">Share</div>
            <div className="text-right font-medium tabular-nums">{plainPct(hovered.row.turnover_share_pct, 1)}</div>
            <div className="text-muted-foreground">TV5dΔ</div>
            <div className={`text-right font-medium tabular-nums ${tonePct(hovered.tvDelta)}`}>{pct(hovered.tvDelta, 1)}</div>
            <div className="text-muted-foreground">OC</div>
            <div className={`text-right font-medium tabular-nums ${tonePct(hovered.oc)}`}>{pct(hovered.oc, 2)}</div>
            <div className="text-muted-foreground">売買代金</div>
            <div className="text-right font-medium tabular-nums">{oku(hovered.row.turnover_bil)}</div>
            <div className="text-muted-foreground">5日平均</div>
            <div className="text-right font-medium tabular-nums">{oku(hovered.row.avg_5d_turnover_bil)}</div>
            <div className="text-muted-foreground">銘柄数</div>
            <div className="text-right font-medium tabular-nums">{fmt(hovered.row.count, 0)}</div>
            <div className="text-muted-foreground">継続/陽線</div>
            <div className="text-right font-medium tabular-nums">{persistenceText(hovered.row.active_streak_days, hovered.row.positive_streak_days)}</div>
            {benchmark && (
              <>
                <div className="text-muted-foreground">vs {benchmark.label} TV</div>
                <div className={`text-right font-medium tabular-nums ${tonePct((hovered.tvDelta ?? 0) - (benchmark.tv5d_delta_pct ?? 0))}`}>
                  {pct((hovered.tvDelta ?? 0) - (benchmark.tv5d_delta_pct ?? 0), 1)}
                </div>
                <div className="text-muted-foreground">vs {benchmark.label} OC</div>
                <div className={`text-right font-medium tabular-nums ${tonePct(hovered.oc - (benchmark.oc_pct ?? 0))}`}>
                  {pct(hovered.oc - (benchmark.oc_pct ?? 0), 2)}
                </div>
              </>
            )}
          </div>
          <div className="mt-2 truncate border-t pt-2 text-muted-foreground">
            {names(hovered.row.top_names)}
          </div>
        </div>
      )}
    </div>
  );
}

function BucketMiniList({
  title,
  rows,
  mode,
}: {
  title: string;
  rows: BucketRow[];
  mode: "risk" | "positive" | "persistence";
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-2 text-xs font-medium">{title}</div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={`${title}-${row.bucket}`} className="grid grid-cols-[minmax(0,1fr)_76px_64px] items-center gap-2 text-sm">
            <div className="min-w-0">
              <div className="truncate font-medium">{row.label}</div>
              <div className="text-[11px] text-muted-foreground">{fmt(row.count, 0)}銘柄 / {plainPct(row.turnover_share_pct, 1)}</div>
            </div>
            <div className="text-right tabular-nums">
              {mode === "persistence" ? persistenceText(row.active_streak_days, row.positive_streak_days) : oku(Math.abs(flowPressure(row)))}
            </div>
            <div className={`text-right tabular-nums ${tonePct(row.avg_open_to_close_pct)}`}>{pct(row.avg_open_to_close_pct, 1)}</div>
          </div>
        ))}
        {rows.length === 0 && <div className="py-3 text-center text-sm text-muted-foreground">-</div>}
      </div>
    </div>
  );
}

function VisualBucketFlowPanel({
  rows,
  snapshotDates = [],
  selectedDate,
  onDateChange,
  benchmarkKey,
  onBenchmarkChange,
  benchmark,
}: {
  rows: BucketRow[];
  snapshotDates: string[];
  selectedDate?: string;
  onDateChange: (date: string) => void;
  benchmarkKey: BenchmarkKey;
  onBenchmarkChange: (key: BenchmarkKey) => void;
  benchmark?: MarketBenchmarkRow | null;
}) {
  const riskRows = [...rows]
    .filter((row) => flowPressure(row) < 0)
    .sort((a, b) => Math.abs(flowPressure(b)) - Math.abs(flowPressure(a)))
    .slice(0, 4);
  const positiveRows = [...rows]
    .filter((row) => flowPressure(row) > 0)
    .sort((a, b) => flowPressure(b) - flowPressure(a))
    .slice(0, 4);
  const persistentRows = [...rows]
    .sort((a, b) =>
      (b.persistence_score ?? 0) - (a.persistence_score ?? 0)
      || (b.positive_streak_days ?? 0) - (a.positive_streak_days ?? 0)
      || (b.turnover_bil ?? 0) - (a.turnover_bil ?? 0)
    )
    .slice(0, 4);

  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">B案 グラフ中心</div>
          <h2 className="mt-1 text-sm font-semibold">Bucket別フロー</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>色=資金分類</span>
          <span>縁色=騰落</span>
          <label className="flex items-center gap-1.5">
            <span>基準</span>
            <select
              value={benchmarkKey}
              onChange={(event) => onBenchmarkChange(event.target.value as BenchmarkKey)}
              className="h-7 rounded-md border bg-background px-2 text-xs text-foreground"
            >
              <option value="n225">N225</option>
              <option value="topix">TOPIX</option>
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            <span>日付</span>
            <select
              value={selectedDate || ""}
              onChange={(event) => onDateChange(event.target.value)}
              className="h-7 rounded-md border bg-background px-2 text-xs text-foreground"
            >
              {snapshotDates.map((date) => (
                <option key={date} value={date}>{date}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <BucketBubblePlot rows={rows} benchmark={benchmark} />
          <div className="mt-2 text-xs text-muted-foreground">
            注: OC=Open to Close。TV5dΔ=(当日売買代金 - 直近5営業日平均) ÷ 直近5営業日平均。Share=Top150内の売買代金シェア。市場基準のTV5dΔはETF売買代金proxy。
            {benchmark?.note ? ` ${benchmark.note}。` : ""}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <BucketMiniList title="売り圧力" rows={riskRows} mode="risk" />
          <BucketMiniList title="買い耐性" rows={positiveRows} mode="positive" />
          <BucketMiniList title="継続確認" rows={persistentRows} mode="persistence" />
        </div>
      </div>
    </section>
  );
}

function MarketFlowContent() {
  const [data, setData] = useState<MarketFlowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [otherSort, setOtherSort] = useState<OtherSortMode>("watch");
  const [flowView, setFlowView] = useState<FlowViewMode>("visual");
  const [selectedFlowDate, setSelectedFlowDate] = useState<string>("");
  const [selectedBenchmark, setSelectedBenchmark] = useState<BenchmarkKey>("n225");
  const [expandedBuckets, setExpandedBuckets] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/dev/market-flow?days=20&top_n=150", {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const json = (await response.json()) as MarketFlowResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch market flow");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const dates = data?.bucket_snapshot_dates?.length
      ? data.bucket_snapshot_dates
      : data?.recent_dates?.slice(-5) ?? [];
    if (!dates.length) return;
    setSelectedFlowDate((current) => dates.includes(current) ? current : dates[dates.length - 1]);
  }, [data]);

  const summary = data?.summary;
  const regime = data?.market_regime;
  const temperature = data?.market_temperature;
  const executionProgram = data?.execution_program;
  const flowAnalysis = data?.flow_analysis;
  const bucketRows = useMemo(() => data?.bucket_daily ?? [], [data]);
  const bucketWeeklyRows = useMemo(() => data?.bucket_weekly ?? [], [data]);
  const bucketSnapshotDates = useMemo(
    () => data?.bucket_snapshot_dates?.length ? data.bucket_snapshot_dates : data?.recent_dates?.slice(-5) ?? [],
    [data],
  );
  const sectorRows = useMemo(() => data?.sector_daily?.slice(0, 12) ?? [], [data]);
  const weeklyRows = useMemo(() => data?.sector_weekly?.slice(0, 12) ?? [], [data]);
  const riskRows = data?.risk_sources ?? [];
  const otherRows = useMemo(() => data?.other_leads?.slice(0, 12) ?? [], [data]);
  const promotionRows = data?.promotion_candidates ?? [];
  const sustainedBuckets = data?.sustained_buckets ?? [];
  const sustainedOtherSectors = data?.sustained_other_sectors ?? [];
  const sustainedStocks = data?.sustained_stocks ?? [];
  const flowRows = data?.flow_leads ?? [];
  const droppedRows = data?.dropped ?? [];
  const tradeStance = useMemo(
    () => buildTradeStance(regime, temperature, bucketRows, bucketWeeklyRows, otherRows),
    [regime, temperature, bucketRows, bucketWeeklyRows, otherRows],
  );
  const stocksByBucket = useMemo(() => {
    const grouped = new Map<string, FlowRow[]>();
    for (const stock of data?.top150 ?? []) {
      const bucket = stock.theme_bucket || "other";
      grouped.set(bucket, [...(grouped.get(bucket) ?? []), stock]);
    }
    for (const [bucket, stocks] of grouped.entries()) {
      grouped.set(bucket, [...stocks].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)));
    }
    return grouped;
  }, [data]);
  const otherSectorGroups = useMemo<OtherSectorGroup[]>(() => {
    const otherStocks = (data?.top150 ?? []).filter((row) => row.theme_bucket === "other" && !row.is_etf);
    const totalOtherTurnover = otherStocks.reduce((sum, row) => sum + (row.trading_value_billion ?? 0), 0);
    const leadBySector = new Map((data?.other_leads ?? []).map((row) => [row.sector, row]));
    const grouped = new Map<string, FlowRow[]>();

    for (const stock of otherStocks) {
      const sector = stock.sectors || "UNKNOWN";
      grouped.set(sector, [...(grouped.get(sector) ?? []), stock]);
    }

    const rows = Array.from(grouped.entries()).map(([sector, stocks]) => {
      const turnover = stocks.reduce((sum, row) => sum + (row.trading_value_billion ?? 0), 0);
      let ocNumerator = 0;
      let ocDenominator = 0;
      for (const stock of stocks) {
        const stockTurnover = stock.trading_value_billion ?? 0;
        const oc = stock.open_to_close_pct;
        if (!stockTurnover || oc == null || Number.isNaN(oc)) continue;
        ocNumerator += stockTurnover * oc;
        ocDenominator += stockTurnover;
      }
      const lead = leadBySector.get(sector);
      const sortedStocks = [...stocks].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
      return {
        sector,
        stocks: sortedStocks,
        count: stocks.length,
        turnover_bil: turnover,
        other_share_pct: totalOtherTurnover ? (turnover / totalOtherTurnover) * 100 : null,
        avg_open_to_close_pct: ocDenominator ? ocNumerator / ocDenominator : null,
        up_rate_pct: stocks.length ? (stocks.filter((row) => (row.open_to_close_pct ?? 0) > 0).length / stocks.length) * 100 : null,
        rank_up_count: stocks.filter((row) => (row.rank_change ?? 0) > 0).length,
        new_count: stocks.filter((row) => row.is_new_top150).length,
        promotion_score: lead?.promotion_score ?? 0,
        active_streak_days: lead?.active_streak_days ?? 0,
        positive_streak_days: lead?.positive_streak_days ?? 0,
        persistence_score: lead?.persistence_score ?? 0,
        top_names: sortedStocks.map((row) => row.stock_name || row.code || "").filter(Boolean).slice(0, 3),
      };
    });

    return rows.sort((a, b) => {
      if (otherSort === "turnover") return b.turnover_bil - a.turnover_bil;
      if (otherSort === "weak") {
        return (
          (a.avg_open_to_close_pct ?? 0) - (b.avg_open_to_close_pct ?? 0)
          || (a.up_rate_pct ?? 0) - (b.up_rate_pct ?? 0)
          || b.turnover_bil - a.turnover_bil
        );
      }
      return (
        b.promotion_score - a.promotion_score
        || (b.avg_open_to_close_pct ?? 0) - (a.avg_open_to_close_pct ?? 0)
        || (b.rank_up_count + b.new_count) - (a.rank_up_count + a.new_count)
        || b.turnover_bil - a.turnover_bil
      );
    });
  }, [data, otherSort]);
  const etfOc = (() => {
    let numerator = 0;
    let denominator = 0;
    for (const row of bucketRows) {
      if (!["semicon_etf", "index_bull", "index_inverse", "index_other"].includes(row.bucket)) continue;
      const turnover = row.turnover_bil ?? 0;
      const oc = row.avg_open_to_close_pct;
      if (!turnover || oc == null || Number.isNaN(oc)) continue;
      numerator += turnover * oc;
      denominator += turnover;
    }
    return denominator ? numerator / denominator : null;
  })();
  const bucketCount = (buckets: string[]) =>
    bucketRows
      .filter((row) => buckets.includes(row.bucket))
      .reduce((sum, row) => sum + (row.count ?? 0), 0);
  const shareSegments = [
    {
      label: "キオクシア",
      share: summary?.kioxia_share_pct,
      turnover: summary?.kioxia_turnover_bil,
      oc: summary?.kioxia_open_to_close_pct,
      count: bucketCount(["kioxia"]),
      color: FLOW_COLORS.kioxia,
    },
    {
      label: "中核 exキオクシア",
      share: summary?.semicon_main_share_pct,
      turnover: summary?.semicon_main_turnover_bil,
      oc: summary?.semicon_main_open_to_close_pct,
      count: bucketCount(["semicon_main"]),
      color: FLOW_COLORS.semicon,
    },
    {
      label: "半導体周辺",
      share: summary?.theme_peripheral_share_pct,
      turnover: summary?.theme_peripheral_turnover_bil,
      oc: summary?.theme_peripheral_open_to_close_pct,
      count: bucketCount(["dc_cable_optical", "electronics_parts", "ai_power_heavy", "robotics_factory_auto"]),
      color: FLOW_COLORS.peripheral,
    },
    {
      label: "ETF",
      share: summary?.etf_share_pct,
      turnover: summary?.etf_turnover_bil,
      oc: summary?.etf_open_to_close_pct ?? etfOc,
      count: bucketCount(["semicon_etf", "index_bull", "index_inverse", "index_other"]),
      color: FLOW_COLORS.etf,
    },
    {
      label: "その他",
      share: summary?.other_share_pct,
      turnover: summary?.other_turnover_bil,
      oc: summary?.other_open_to_close_pct,
      count: bucketCount(["other"]),
      color: FLOW_COLORS.other,
    },
  ];
  const latestBucketChartRows = useMemo(() => {
    const weeklyByBucket = new Map(bucketWeeklyRows.map((row) => [row.bucket, row]));
    return bucketRows.map((row) => ({
      ...row,
      ...(weeklyByBucket.get(row.bucket) ?? {}),
      turnover_bil: row.turnover_bil,
      turnover_share_pct: row.turnover_share_pct,
      avg_open_to_close_pct: row.avg_open_to_close_pct,
      up_rate_pct: row.up_rate_pct,
      count: row.count,
    }));
  }, [bucketRows, bucketWeeklyRows]);
  const selectedBucketDate = selectedFlowDate || bucketSnapshotDates[bucketSnapshotDates.length - 1] || data?.latest_date || "";
  const bucketChartRows = useMemo(() => {
    const snapshots = data?.bucket_snapshots ?? [];
    const selectedRows = snapshots.filter((row) => row.date === selectedBucketDate);
    return selectedRows.length ? selectedRows : latestBucketChartRows;
  }, [data, selectedBucketDate, latestBucketChartRows]);
  const selectedBenchmarkSnapshot = useMemo(() => {
    const rows = data?.market_benchmark_snapshots?.[selectedBenchmark] ?? [];
    return rows.find((row) => row.date === selectedBucketDate) ?? rows[rows.length - 1] ?? null;
  }, [data, selectedBenchmark, selectedBucketDate]);
  const maxBucketTurnover = Math.max(...latestBucketChartRows.map((row) => row.turnover_bil ?? 0), 1);
  const toggleBucket = (bucket: string) => {
    setExpandedBuckets((current) => {
      const next = new Set(current);
      if (next.has(bucket)) {
        next.delete(bucket);
      } else {
        next.add(bucket);
      }
      return next;
    });
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-3 py-4 md:px-5">
        <div className="flex flex-col gap-3 border-b border-border/70 pb-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-card">
              <Activity className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold">Market Flow</h1>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {data?.latest_date ? `${data.latest_date} / ${data.previous_date ?? "-"} 比較` : "Top150 history"}
                {data?.source_data_mode ? ` / ${data.source_data_mode.toUpperCase()}` : ""}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <DevNavLinks className="overflow-x-auto" />
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium hover:bg-muted"
              disabled={loading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              更新
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-sm text-rose-500">
            {error}
          </div>
        )}

        {!loading && data && !data.available && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-600">
            {data.reason || "market flow data is not available"}
          </div>
        )}

        <section className="grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
          <MarketTemperatureCard
            temperature={temperature}
            regime={regime}
            summary={summary}
            bucketRows={bucketRows}
            bucketWeeklyRows={bucketWeeklyRows}
            otherLeads={otherRows}
          />

          <ShareCompositionCard
            totalTurnover={summary?.latest_total_turnover_bil}
            historyRows={data?.history_rows}
            segments={shareSegments}
          />
        </section>

        <TradeStanceCard stance={tradeStance} />

        <ExecutionProgramPanel program={executionProgram} />

        <FlowAnalysisPanel analysis={flowAnalysis} />

        <PersistencePanel
          buckets={sustainedBuckets}
          sectors={sustainedOtherSectors}
          stocks={sustainedStocks}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
          <div>
            <h2 className="text-sm font-semibold">資金フロー表示</h2>
            <div className="mt-0.5 text-xs text-muted-foreground">データ基準日: {data?.latest_date || "-"}</div>
          </div>
          <div className="inline-flex rounded-lg border bg-muted/30 p-1 text-xs">
            {[
              ["visual", "B グラフ"],
              ["table", "A 表"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFlowView(key as FlowViewMode)}
                className={`rounded-md px-3 py-1.5 font-medium ${
                  flowView === key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {flowView === "visual" ? (
          <VisualBucketFlowPanel
            rows={bucketChartRows}
            snapshotDates={bucketSnapshotDates}
            selectedDate={selectedBucketDate}
            onDateChange={setSelectedFlowDate}
            benchmarkKey={selectedBenchmark}
            onBenchmarkChange={setSelectedBenchmark}
            benchmark={selectedBenchmarkSnapshot}
          />
        ) : (
          <>
        <section className="rounded-lg border bg-card p-4">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs text-muted-foreground">売買代金 × 騰落</div>
              <h2 className="mt-1 text-sm font-semibold">Bucket別フロー</h2>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>棒色=資金分類</span>
              <span>OC色=騰落</span>
              <span>データ基準日: {data?.latest_date || "-"}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[720px] space-y-2">
              {latestBucketChartRows.map((row) => {
                const width = Math.max(2, ((row.turnover_bil ?? 0) / maxBucketTurnover) * 100);
                return (
                  <div key={row.bucket} className="grid grid-cols-[112px_minmax(0,1fr)_112px_72px] items-center gap-2 text-sm">
                    <div className="truncate font-medium">{row.label}</div>
                    <div className="h-7 rounded bg-muted">
                      <div
                        className="flex h-7 items-center justify-end rounded px-2 text-[11px] font-medium text-white"
                        style={{ width: `${width}%`, backgroundColor: flowColor(row.bucket) }}
                      >
                        {plainPct(row.turnover_share_pct, 1)}
                      </div>
                    </div>
                    <div className="text-right tabular-nums">{oku(row.turnover_bil)}</div>
                    <div className={`text-right tabular-nums ${tonePct(row.avg_open_to_close_pct)}`}>{pct(row.avg_open_to_close_pct, 2)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <Section
          title="テーマ別資金"
          action={
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Layers className="h-3.5 w-3.5" />
              <span>Top150 資金分類</span>
            </div>
          }
        >
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[1040px] text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 text-left font-medium">分類</th>
                  <th className="px-2 py-2 text-right font-medium">Count</th>
                  <th className="px-2 py-2 text-right font-medium">Share</th>
                  <th className="px-2 py-2 text-right font-medium">売買代金</th>
                  <th className="px-2 py-2 text-right font-medium">OC</th>
                  <th className="px-2 py-2 text-right font-medium">Up率</th>
                  <th className="px-2 py-2 text-right font-medium">1-30</th>
                  <th className="px-2 py-2 text-right font-medium">31-150</th>
                  <th className="px-2 py-2 text-right font-medium">継続/陽線</th>
                  <th className="px-2 py-2 text-right font-medium">New/Up</th>
                  <th className="px-2 py-2 text-left font-medium">Top Names</th>
                </tr>
              </thead>
              <tbody>
                {bucketRows.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-2 py-6 text-center text-muted-foreground">-</td>
                  </tr>
                )}
                {bucketRows.map((row) => {
                  const isExpanded = expandedBuckets.has(row.bucket);
                  const bucketStocks = stocksByBucket.get(row.bucket) ?? [];
                  return (
                    <Fragment key={row.bucket}>
                      <tr className="border-t hover:bg-muted/30">
                        <td className="px-2 py-2 font-medium">
                          <button
                            type="button"
                            onClick={() => toggleBucket(row.bucket)}
                            className="flex max-w-[220px] items-center gap-2 text-left hover:text-primary"
                            aria-expanded={isExpanded}
                          >
                            <span className="w-4 shrink-0 text-muted-foreground">{isExpanded ? "-" : "+"}</span>
                            <span className="truncate">{row.label}</span>
                          </button>
                        </td>
                        <td className="px-2 py-2 text-right">{fmt(row.count, 0)}</td>
                        <td className="px-2 py-2 text-right">{plainPct(row.turnover_share_pct, 1)}</td>
                        <td className="px-2 py-2 text-right">{oku(row.turnover_bil)}</td>
                        <td className={`px-2 py-2 text-right ${tonePct(row.avg_open_to_close_pct)}`}>{pct(row.avg_open_to_close_pct)}</td>
                        <td className="px-2 py-2 text-right">{plainPct(row.up_rate_pct, 1)}</td>
                        <td className="px-2 py-2 text-right">{fmt(row.top1_30_count, 0)}</td>
                        <td className="px-2 py-2 text-right">{fmt(row.top31_150_count, 0)}</td>
                        <td className="px-2 py-2 text-right">{persistenceText(row.active_streak_days, row.positive_streak_days)}</td>
                        <td className="px-2 py-2 text-right">{fmt(row.new_count, 0)} / {fmt(row.rank_up_count, 0)}</td>
                        <td className="max-w-[360px] truncate px-2 py-2">{names(row.top_names)}</td>
                      </tr>
                      {isExpanded && (
                        <tr className="border-t bg-muted/10">
                          <td colSpan={11} className="p-3">
                            {row.bucket === "other" ? (
                              <div className="space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div className="text-xs text-muted-foreground">
                                    その他は業種で一段階絞ってから個別銘柄を確認します。
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {[
                                      ["watch", "注目順"],
                                      ["turnover", "売買代金順"],
                                      ["weak", "悪化順"],
                                    ].map(([key, label]) => (
                                      <button
                                        key={key}
                                        type="button"
                                        onClick={() => setOtherSort(key as OtherSortMode)}
                                        className={`rounded-md border px-2.5 py-1 text-xs ${
                                          otherSort === key
                                            ? "border-primary bg-primary text-primary-foreground"
                                            : "border-border bg-background text-muted-foreground hover:bg-muted"
                                        }`}
                                      >
                                        {label}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="overflow-x-auto">
                                  <div className="mb-1 grid min-w-[1000px] grid-cols-[140px_56px_88px_112px_72px_72px_72px_76px_72px_minmax(0,1fr)] gap-2 px-3 text-xs text-muted-foreground">
                                    <div>業種</div>
                                    <div className="text-right">銘柄</div>
                                    <div className="text-right">Other内</div>
                                    <div className="text-right">売買代金</div>
                                    <div className="text-right">OC</div>
                                    <div className="text-right">Up率</div>
                                    <div className="text-right">New/Up</div>
                                    <div className="text-right">継続/陽線</div>
                                    <div className="text-right">Score</div>
                                    <div>主な銘柄</div>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  {otherSectorGroups.map((group) => (
                                    <details key={group.sector} className="rounded-md border bg-background">
                                      <summary className="cursor-pointer list-none px-3 py-2 hover:bg-muted/30">
                                        <div className="overflow-x-auto">
                                          <div className="grid min-w-[1000px] grid-cols-[140px_56px_88px_112px_72px_72px_72px_76px_72px_minmax(0,1fr)] items-center gap-2 text-sm">
                                            <div className="flex min-w-0 items-center gap-2">
                                              <span className="truncate font-medium">{group.sector}</span>
                                              {group.promotion_score >= 4 && (
                                                <span className="rounded border border-emerald-500/30 px-1.5 py-0.5 text-[10px] text-emerald-500">
                                                  昇格候補
                                                </span>
                                              )}
                                            </div>
                                            <div className="text-right tabular-nums">{fmt(group.count, 0)}</div>
                                            <div className="text-right tabular-nums">{plainPct(group.other_share_pct, 1)}</div>
                                            <div className="text-right tabular-nums">{oku(group.turnover_bil)}</div>
                                            <div className={`text-right tabular-nums ${tonePct(group.avg_open_to_close_pct)}`}>{pct(group.avg_open_to_close_pct, 2)}</div>
                                            <div className="text-right tabular-nums">{plainPct(group.up_rate_pct, 1)}</div>
                                            <div className="text-right tabular-nums">{fmt(group.new_count, 0)} / {fmt(group.rank_up_count, 0)}</div>
                                            <div className="text-right tabular-nums">{persistenceText(group.active_streak_days, group.positive_streak_days)}</div>
                                            <div className="text-right tabular-nums">{fmt(group.promotion_score, 0)}</div>
                                            <div className="truncate text-muted-foreground">{names(group.top_names)}</div>
                                          </div>
                                        </div>
                                      </summary>
                                      <div className="border-t">
                                        <BucketStockTable rows={group.stocks} />
                                      </div>
                                    </details>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <BucketStockTable rows={bucketStocks} />
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
          </>
        )}

        <div className="grid gap-5 xl:grid-cols-2">
          <Section
            title="Risk Source"
            action={
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                <span>{fmt(riskRows.length, 0)} names</span>
              </div>
            }
          >
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 text-right font-medium">Rank</th>
                    <th className="px-2 py-2 text-right font-medium">Δ</th>
                    <th className="px-2 py-2 text-left font-medium">Code</th>
                    <th className="px-2 py-2 text-left font-medium">Name</th>
                    <th className="px-2 py-2 text-left font-medium">分類</th>
                    <th className="px-2 py-2 text-right font-medium">売買代金</th>
                    <th className="px-2 py-2 text-right font-medium">OC</th>
                    <th className="px-2 py-2 text-right font-medium">Days</th>
                  </tr>
                </thead>
                <tbody>
                  {riskRows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-2 py-6 text-center text-muted-foreground">-</td>
                    </tr>
                  )}
                  {riskRows.map((row) => (
                    <tr key={`${row.date}-${row.ticker}-${row.rank}`} className="border-t hover:bg-muted/30">
                      <td className="px-2 py-2 text-right">{fmt(row.rank, 0)}</td>
                      <td className="px-2 py-2 text-right"><RankDelta value={row.rank_change} isNew={row.is_new_top150} /></td>
                      <td className="px-2 py-2"><TickerLink row={row} /></td>
                      <td className="max-w-[200px] truncate px-2 py-2">{row.stock_name || "-"}</td>
                      <td className="px-2 py-2">{row.theme_label || "-"}</td>
                      <td className="px-2 py-2 text-right">{oku(row.trading_value_billion)}</td>
                      <td className={`px-2 py-2 text-right ${tonePct(row.open_to_close_pct)}`}>{pct(row.open_to_close_pct)}</td>
                      <td className="px-2 py-2 text-right">{fmt(row.days_in_top150, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section
            title="Other Leads"
            action={
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Target className="h-3.5 w-3.5 text-emerald-500" />
                <span>{fmt(promotionRows.length, 0)} candidates</span>
              </div>
            }
          >
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 text-right font-medium">Score</th>
                    <th className="px-2 py-2 text-left font-medium">Sector</th>
                    <th className="px-2 py-2 text-right font-medium">Count</th>
                    <th className="px-2 py-2 text-right font-medium">Share</th>
                    <th className="px-2 py-2 text-right font-medium">売買代金</th>
                    <th className="px-2 py-2 text-right font-medium">OC</th>
                    <th className="px-2 py-2 text-right font-medium">Up率</th>
                    <th className="px-2 py-2 text-right font-medium">Active</th>
                    <th className="px-2 py-2 text-right font-medium">継続/陽線</th>
                    <th className="px-2 py-2 text-right font-medium">New/Up</th>
                    <th className="px-2 py-2 text-left font-medium">Top Names</th>
                  </tr>
                </thead>
                <tbody>
                  {otherRows.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-2 py-6 text-center text-muted-foreground">-</td>
                    </tr>
                  )}
                  {otherRows.map((row) => (
                    <tr key={row.sector} className="border-t hover:bg-muted/30">
                      <td className="px-2 py-2 text-right font-medium">{fmt(row.promotion_score, 0)}</td>
                      <td className="px-2 py-2">{row.sector}</td>
                      <td className="px-2 py-2 text-right">{fmt(row.count, 0)}</td>
                      <td className="px-2 py-2 text-right">{plainPct(row.turnover_share_pct, 1)}</td>
                      <td className="px-2 py-2 text-right">{oku(row.turnover_bil)}</td>
                      <td className={`px-2 py-2 text-right ${tonePct(row.avg_open_to_close_pct)}`}>{pct(row.avg_open_to_close_pct)}</td>
                      <td className="px-2 py-2 text-right">{plainPct(row.up_rate_pct, 1)}</td>
                      <td className="px-2 py-2 text-right">{fmt(row.active_days, 0)}</td>
                      <td className="px-2 py-2 text-right">{persistenceText(row.active_streak_days, row.positive_streak_days)}</td>
                      <td className="px-2 py-2 text-right">{fmt(row.new_count, 0)} / {fmt(row.rank_up_count, 0)}</td>
                      <td className="max-w-[280px] truncate px-2 py-2">{names(row.top_names)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </div>

        <Section title="端緒候補">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 text-left font-medium">Trigger</th>
                  <th className="px-2 py-2 text-right font-medium">Rank</th>
                  <th className="px-2 py-2 text-right font-medium">Δ</th>
                  <th className="px-2 py-2 text-left font-medium">Code</th>
                  <th className="px-2 py-2 text-left font-medium">Name</th>
                  <th className="px-2 py-2 text-left font-medium">Sector</th>
                  <th className="px-2 py-2 text-right font-medium">売買代金</th>
                  <th className="px-2 py-2 text-right font-medium">OC</th>
                  <th className="px-2 py-2 text-right font-medium">Days</th>
                </tr>
              </thead>
              <tbody>
                {flowRows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-2 py-6 text-center text-muted-foreground">-</td>
                  </tr>
                )}
                {flowRows.map((row) => (
                  <tr key={`${row.date}-${row.ticker}-${row.rank}`} className="border-t hover:bg-muted/30">
                    <td className="px-2 py-2">{triggerLabel(row.flow_trigger)}</td>
                    <td className="px-2 py-2 text-right">{fmt(row.rank, 0)}</td>
                    <td className="px-2 py-2 text-right"><RankDelta value={row.rank_change} isNew={row.is_new_top150} /></td>
                    <td className="px-2 py-2"><TickerLink row={row} /></td>
                    <td className="max-w-[220px] truncate px-2 py-2">{row.stock_name || "-"}</td>
                    <td className="px-2 py-2">{row.sectors || "-"}</td>
                    <td className="px-2 py-2 text-right">{oku(row.trading_value_billion)}</td>
                    <td className={`px-2 py-2 text-right ${tonePct(row.open_to_close_pct)}`}>{pct(row.open_to_close_pct)}</td>
                    <td className="px-2 py-2 text-right">{fmt(row.days_in_top150, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <div className="grid gap-5 xl:grid-cols-2">
          <Section title="セクター日次">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[840px] text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 text-left font-medium">Sector</th>
                    <th className="px-2 py-2 text-right font-medium">Count</th>
                    <th className="px-2 py-2 text-right font-medium">Share</th>
                    <th className="px-2 py-2 text-right font-medium">売買代金</th>
                    <th className="px-2 py-2 text-right font-medium">OC</th>
                    <th className="px-2 py-2 text-right font-medium">継続/陽線</th>
                    <th className="px-2 py-2 text-left font-medium">Top</th>
                    <th className="px-2 py-2 text-right font-medium">31-150</th>
                  </tr>
                </thead>
                <tbody>
                  {sectorRows.map((row) => (
                    <tr key={row.sector} className="border-t hover:bg-muted/30">
                      <td className="px-2 py-2">{row.sector}</td>
                      <td className="px-2 py-2 text-right">{fmt(row.count, 0)}</td>
                      <td className="px-2 py-2 text-right">{plainPct(row.turnover_share_pct, 1)}</td>
                      <td className="px-2 py-2 text-right">{oku(row.turnover_bil)}</td>
                      <td className={`px-2 py-2 text-right ${tonePct(row.avg_open_to_close_pct)}`}>{pct(row.avg_open_to_close_pct)}</td>
                      <td className="px-2 py-2 text-right">{persistenceText(row.active_streak_days, row.positive_streak_days)}</td>
                      <td className="max-w-[180px] truncate px-2 py-2">#{row.top_rank} {row.top_name}</td>
                      <td className="px-2 py-2 text-right">
                        {fmt((row.top31_100_count ?? 0) + (row.top101_150_count ?? 0), 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="セクター週次">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 text-left font-medium">Sector</th>
                    <th className="px-2 py-2 text-right font-medium">Active</th>
                    <th className="px-2 py-2 text-right font-medium">Latest</th>
                    <th className="px-2 py-2 text-right font-medium">Avg</th>
                    <th className="px-2 py-2 text-right font-medium">VsAvg</th>
                    <th className="px-2 py-2 text-right font-medium">Names</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyRows.map((row) => (
                    <tr key={row.sector} className="border-t hover:bg-muted/30">
                      <td className="px-2 py-2">{row.sector}</td>
                      <td className="px-2 py-2 text-right">{fmt(row.active_days, 0)}</td>
                      <td className="px-2 py-2 text-right">{oku(row.latest_turnover_bil)}</td>
                      <td className="px-2 py-2 text-right">{oku(row.avg_daily_turnover_bil)}</td>
                      <td className="px-2 py-2 text-right">{mult(row.latest_vs_avg)}</td>
                      <td className="px-2 py-2 text-right">{fmt(row.latest_count, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </div>

        <Section
          title="脱落"
          action={
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
              <span>rank up</span>
              <ArrowDownRight className="h-3.5 w-3.5 text-rose-500" />
              <span>dropped</span>
            </div>
          }
        >
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 text-right font-medium">Prev Rank</th>
                  <th className="px-2 py-2 text-left font-medium">Code</th>
                  <th className="px-2 py-2 text-left font-medium">Name</th>
                  <th className="px-2 py-2 text-left font-medium">Sector</th>
                  <th className="px-2 py-2 text-right font-medium">売買代金</th>
                  <th className="px-2 py-2 text-right font-medium">Band</th>
                  <th className="px-2 py-2 text-right font-medium">OC</th>
                </tr>
              </thead>
              <tbody>
                {droppedRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-2 py-6 text-center text-muted-foreground">-</td>
                  </tr>
                )}
                {droppedRows.map((row) => (
                  <tr key={`${row.date}-${row.ticker}-${row.rank}`} className="border-t hover:bg-muted/30">
                    <td className="px-2 py-2 text-right">{fmt(row.rank, 0)}</td>
                    <td className="px-2 py-2"><TickerLink row={row} /></td>
                    <td className="max-w-[220px] truncate px-2 py-2">{row.stock_name || "-"}</td>
                    <td className="px-2 py-2">{row.sectors || "-"}</td>
                    <td className="px-2 py-2 text-right">{oku(row.trading_value_billion)}</td>
                    <td className="px-2 py-2 text-right">{bandLabel(row.rank_band)}</td>
                    <td className={`px-2 py-2 text-right ${tonePct(row.open_to_close_pct)}`}>{pct(row.open_to_close_pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </main>
  );
}

export default function MarketFlowPage() {
  return <MarketFlowContent />;
}
