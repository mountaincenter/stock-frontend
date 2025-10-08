// app/[ticker]/lib/technical-analysis.ts
import type { RatingLabel3, IchimokuDetail } from "./types";
import { na } from "./tech-helpers";

/* ======================= ローカル計算（MA/一目） ======================= */
export function sma(seq: number[], window: number): number | null {
  if (seq.length < window) return null;
  let sum = 0;
  for (let i = seq.length - window; i < seq.length; i++) sum += seq[i];
  return sum / window;
}

export function ema(seq: number[], span: number): number | null {
  if (seq.length < span) return null;
  const alpha = 2 / (span + 1);
  let e = sma(seq.slice(0, span), span);
  if (e == null) return null;
  for (let i = span; i < seq.length; i++) e = alpha * seq[i] + (1 - alpha) * e;
  return e;
}

export function ichimokuFromOHLC(
  highs: number[],
  lows: number[],
  closes: number[]
): IchimokuDetail | null {
  const t = 9,
    k = 26,
    s = 52;
  if (highs.length < s || lows.length < s || closes.length < s) return null;

  const lastClose = closes[closes.length - 1];
  const maxN = (arr: number[], n: number) => Math.max(...arr.slice(-n));
  const minN = (arr: number[], n: number) => Math.min(...arr.slice(-n));

  const tenkan = (maxN(highs, t) + minN(lows, t)) / 2;
  const kijun = (maxN(highs, k) + minN(lows, k)) / 2;
  const spanA = (tenkan + kijun) / 2;
  const spanB = (maxN(highs, s) + minN(lows, s)) / 2;
  const cloudTop = Math.max(spanA, spanB);
  const cloudBot = Math.min(spanA, spanB);
  const chikou = closes.length > k ? closes[closes.length - 1 - k] : null;

  return { lastClose, tenkan, kijun, spanA, spanB, cloudTop, cloudBot, chikou };
}

/* ======================= 判定 ======================= */

// Osc 判定
export function judgeOsc(
  rule: "rsi" | "percentB" | "macdHist" | "smaDev",
  v: number | null | undefined
): RatingLabel3 {
  if (na(v)) return "データなし";
  const value = v as number;
  const eps = 1e-2;
  if (rule === "rsi") {
    if (value < 30) return "買い";
    if (value > 70) return "売り";
    return "中立";
  }
  if (rule === "percentB") {
    if (value < 0.05) return "買い";
    if (value > 0.95) return "売り";
    return "中立";
  }
  if (rule === "macdHist") {
    if (value > eps) return "買い";
    if (value < -eps) return "売り";
    return "中立";
  }
  // smaDev（%）
  if (value > 2.0) return "買い";
  if (value < -2.0) return "売り";
  return "中立";
}

// MA 判定
export function judgeMA(close: number | null, ma: number | null): RatingLabel3 {
  if (na(close) || na(ma)) return "データなし";
  if ((close as number) > (ma as number)) return "買い";
  if ((close as number) < (ma as number)) return "売り";
  return "中立";
}

// Ichimoku 判定
export function judgeIchiCloud(
  last: number | null,
  top: number | null,
  bot: number | null
): RatingLabel3 {
  if (na(last) || na(top) || na(bot)) return "データなし";
  if ((last as number) > (top as number)) return "買い";
  if ((last as number) < (bot as number)) return "売り";
  return "中立";
}
export function judgeIchiTK(
  tenkan: number | null,
  kijun: number | null
): RatingLabel3 {
  if (na(tenkan) || na(kijun)) return "データなし";
  if ((tenkan as number) > (kijun as number)) return "買い";
  if ((tenkan as number) < (kijun as number)) return "売り";
  return "中立";
}
export function judgeIchiLag(
  chikou: number | null,
  last: number | null
): RatingLabel3 {
  if (na(chikou) || na(last)) return "データなし";
  if ((chikou as number) > (last as number)) return "買い";
  if ((chikou as number) < (last as number)) return "売り";
  return "中立";
}
