// components/stock_list_new/utils/tech_v2.ts
import type {
  RatingLabel,
  StockMeta,
  TechCoreRow,
  TechDecisionItem,
  TechDecisionValues,
  VoteEntry,
} from "../types";

/* =========================
   共通：型ガード & 変換 & ラベル
   ========================= */

export function isNumberOrNull(v: unknown): v is number | null {
  return v === null || typeof v === "number";
}
function isString(v: unknown): v is string {
  return typeof v === "string";
}
function isVoteEntry(v: unknown): v is VoteEntry {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.score === "number" && typeof o.label === "string";
}
function isValues(v: unknown): v is TechDecisionValues {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  const keys: (keyof TechDecisionValues)[] = [
    "rsi14",
    "macd_hist",
    "percent_b",
    "sma25_dev_pct",
    "roc12",
    "donchian_dist_up",
    "donchian_dist_dn",
    "atr14_pct",
    "rv20",
    "er14",
    "obv_slope",
    "cmf20",
    "vol_z20",
  ];
  return keys.every((k) => isNumberOrNull(o[k]));
}
export function isDecisionItem(x: unknown): x is TechDecisionItem {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  if (!isString(o["ticker"]) || !isString(o["date"])) return false;
  if (!isValues(o["values"])) return false;
  const votes = o["votes"];
  if (typeof votes !== "object" || votes === null) return false;
  // 最低限のキーだけ検査（存在時はVoteEntry）
  for (const k of [
    "rsi14",
    "percent_b",
    "macd_hist",
    "sma25_dev_pct",
    "ma",
    "ichimoku",
  ]) {
    const v = (votes as Record<string, unknown>)[k];
    if (v != null && !isVoteEntry(v)) return false;
  }
  if (!isVoteEntry(o["overall"])) return false;
  return true;
}
export function isDecisionArray(x: unknown): x is TechDecisionItem[] {
  return Array.isArray(x) && x.every(isDecisionItem);
}

/* -2..2 → 5段階日本語ラベル */
export function labelFromScore5(score: number): RatingLabel {
  if (score >= 2) return "強い買い";
  if (score === 1) return "買い";
  if (score === 0) return "中立";
  if (score === -1) return "売り";
  return "強い売り";
}

/* votes からテクニカル合成（RSI/%b/MACD/乖離） */
export function toTechLabel(votes: Record<string, VoteEntry>): RatingLabel {
  const keys = ["rsi14", "percent_b", "macd_hist", "sma25_dev_pct"] as const;
  const scores: number[] = [];
  for (const k of keys) {
    const ve = votes[k];
    if (ve && Number.isFinite(ve.score)) scores.push(ve.score);
  }
  const avg =
    scores.length > 0
      ? Math.round(
          Math.max(
            -2,
            Math.min(2, scores.reduce((a, b) => a + b, 0) / scores.length)
          )
        )
      : 0;
  return labelFromScore5(avg);
}

/* v2 decision snapshot → TechCoreRow[] へ変換（UI用） */
export function mapDecisionSnapshotToTechRows(
  arr: TechDecisionItem[],
  metaMap: Map<string, StockMeta>
): TechCoreRow[] {
  const out: TechCoreRow[] = [];
  for (const it of arr) {
    const meta = metaMap.get(it.ticker);
    if (!meta) continue;
    out.push({
      ticker: it.ticker,
      code: meta.code,
      stock_name: meta.stock_name,
      date: it.date ?? null,

      // UIの表示キーに合わせて percent_b → bb_percent_b にリネーム
      rsi14: it.values.rsi14,
      macd_hist: it.values.macd_hist,
      bb_percent_b: it.values.percent_b,
      sma25_dev_pct: it.values.sma25_dev_pct,

      tech_rating: toTechLabel(it.votes),
      ma_rating: (it.votes.ma?.label ?? "中立") as RatingLabel,
      ichimoku_rating: (it.votes.ichimoku?.label ?? "中立") as RatingLabel,
      overall_rating: (it.overall.label ?? "中立") as RatingLabel,
    });
  }
  return out;
}
