// app/[ticker]/TechDetailTable.tsx
// Server Component（"use client" は付けない）
// v2 API（/core30/tech/decision, /core30/prices/1d）のみ使用
// 欠損は「データなし」を表示（中立にしない）
// レイアウト：上段4ラベル＋下段3列（Osc/MA/Ichimoku）
// 各列テーブル：指標 | 現在値 | 閾値 | 乖離 | 判定（血液検査票のように縦スキャン最適化）

import React from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  Minus,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/* ======================= 型 ======================= */
type RatingLabel5 = "強い買い" | "買い" | "中立" | "売り" | "強い売り";
type RatingLabel3 = "買い" | "中立" | "売り" | "データなし";

type VoteEntry = { score: number; label: RatingLabel5 };

type DecisionItem = {
  ticker: string;
  date: string;
  values: {
    rsi14: number | null;
    macd_hist: number | null;
    percent_b: number | null; // APIは percent_b
    sma25_dev_pct: number | null;
  };
  votes: Record<string, VoteEntry>; // ma, ichimoku など含む
  overall: VoteEntry;
};

type PriceRow = {
  date: string; // ISO
  ticker: string;
  Open: number | null;
  High: number | null;
  Low: number | null;
  Close: number | null;
};

/* ======================= 数値表示 ======================= */
const nf0 = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const nf2 = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function fmt(
  v: number | null | undefined,
  f: Intl.NumberFormat,
  suffix = ""
): string {
  return typeof v === "number" && Number.isFinite(v)
    ? `${f.format(v)}${suffix}`
    : "データなし";
}
function toneBySign(v: number | null | undefined): string {
  if (typeof v !== "number" || !Number.isFinite(v) || v === 0)
    return "text-muted-foreground";
  return v > 0 ? "text-emerald-400" : "text-rose-400";
}

/* ======================= 判定ラベル → アイコン＋色 ======================= */
/** 色は「買い系=緑 / 売り系=赤 / 中立・データなし=ミュート」。強弱で色は変えない */
function colorClassByLabel(
  label: RatingLabel5 | RatingLabel3 | "データなし"
): string {
  if (label === "強い買い" || label === "買い") return "text-emerald-400";
  if (label === "強い売り" || label === "売り") return "text-rose-400";
  return "text-muted-foreground";
}
function iconByLabel(label: RatingLabel5 | RatingLabel3 | "データなし") {
  const cls = "inline-block align-[-2px] mr-1 w-3.5 h-3.5";
  if (label === "強い買い") return <ChevronsUp className={cls} />;
  if (label === "買い") return <ChevronUp className={cls} />;
  if (label === "強い売り") return <ChevronsDown className={cls} />;
  if (label === "売り") return <ChevronDown className={cls} />;
  return <Minus className={cls} />;
}
function renderAction(label: RatingLabel5 | RatingLabel3 | "データなし") {
  return (
    <span className={`inline-flex items-center ${colorClassByLabel(label)}`}>
      {iconByLabel(label)}
      {label}
    </span>
  );
}

/* ======================= フェッチ（サーバ側） ======================= */
async function fetchDecisionV2(ticker: string): Promise<DecisionItem | null> {
  if (!API_BASE) return null;
  const r = await fetch(
    `${API_BASE}/core30/tech/decision?ticker=${encodeURIComponent(ticker)}`,
    {
      cache: "no-store",
    }
  );
  if (!r.ok) return null;
  const d = (await r.json()) as unknown;
  // unknown → 簡易バリデーションで狭める
  if (
    typeof d !== "object" ||
    d === null ||
    typeof (d as Record<string, unknown>).ticker !== "string" ||
    typeof (d as Record<string, unknown>).date !== "string"
  ) {
    return null;
  }
  return d as DecisionItem;
}

async function fetchPrices1d(ticker: string): Promise<PriceRow[]> {
  if (!API_BASE) return [];
  const r = await fetch(
    `${API_BASE}/core30/prices/1d?ticker=${encodeURIComponent(ticker)}`,
    {
      cache: "no-store",
    }
  );
  if (!r.ok) return [];
  const rows = (await r.json()) as PriceRow[];
  return rows.filter(
    (x) =>
      Number.isFinite(x.Open) &&
      Number.isFinite(x.High) &&
      Number.isFinite(x.Low) &&
      Number.isFinite(x.Close)
  );
}

/* ======================= ローカル計算（MA/一目） ======================= */
function sma(seq: number[], window: number): number | null {
  if (seq.length < window) return null;
  let sum = 0;
  for (let i = seq.length - window; i < seq.length; i++) sum += seq[i];
  return sum / window;
}
function ema(seq: number[], span: number): number | null {
  if (seq.length < span) return null;
  const alpha = 2 / (span + 1);
  let e = sma(seq.slice(0, span), span);
  if (e == null) return null;
  for (let i = span; i < seq.length; i++) e = alpha * seq[i] + (1 - alpha) * e;
  return e;
}

type IchimokuDetail = {
  lastClose: number;
  tenkan: number;
  kijun: number;
  spanA: number;
  spanB: number;
  cloudTop: number;
  cloudBot: number;
  chikou: number | null; // 26本前の終値
};

function ichimokuFromOHLC(
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

/* ======================= 判定 & 閾値/乖離 ======================= */
function na<T>(v: T | null | undefined): v is null | undefined {
  return v == null || (typeof v === "number" && !Number.isFinite(v as number));
}

// Osc 判定
function judgeOsc(
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
function judgeMA(close: number | null, ma: number | null): RatingLabel3 {
  if (na(close) || na(ma)) return "データなし";
  if ((close as number) > (ma as number)) return "買い";
  if ((close as number) < (ma as number)) return "売り";
  return "中立";
}

// Ichimoku 判定
function judgeIchiCloud(
  last: number | null,
  top: number | null,
  bot: number | null
): RatingLabel3 {
  if (na(last) || na(top) || na(bot)) return "データなし";
  if ((last as number) > (top as number)) return "買い";
  if ((last as number) < (bot as number)) return "売り";
  return "中立";
}
function judgeIchiTK(
  tenkan: number | null,
  kijun: number | null
): RatingLabel3 {
  if (na(tenkan) || na(kijun)) return "データなし";
  if ((tenkan as number) > (kijun as number)) return "買い";
  if ((tenkan as number) < (kijun as number)) return "売り";
  return "中立";
}
function judgeIchiLag(
  chikou: number | null,
  last: number | null
): RatingLabel3 {
  if (na(chikou) || na(last)) return "データなし";
  if ((chikou as number) > (last as number)) return "買い";
  if ((chikou as number) < (last as number)) return "売り";
  return "中立";
}

/* ===== 閾値と乖離（血液検査票スタイル） ===== */
function nearestDelta(
  value: number,
  a: number,
  b?: number
): { ref: string; delta: number } {
  if (b == null || !Number.isFinite(b)) {
    return { ref: nf2.format(a), delta: value - a };
  }
  const da = Math.abs(value - a);
  const db = Math.abs(value - b);
  const refv = da <= db ? a : b;
  return { ref: `${nf2.format(a)} / ${nf2.format(b)}`, delta: value - refv };
}

/* ======================= 本体 ======================= */
export default async function TechDetailTable({ ticker }: { ticker: string }) {
  const [decision, prices] = await Promise.all([
    fetchDecisionV2(ticker),
    fetchPrices1d(ticker),
  ]);

  // 価格系列（計算用）
  const closes: number[] = prices.map((p) => p.Close as number);
  const highs: number[] = prices.map((p) => p.High as number);
  const lows: number[] = prices.map((p) => p.Low as number);
  const lastClose: number | null =
    closes.length && Number.isFinite(closes[closes.length - 1])
      ? closes[closes.length - 1]
      : null;

  // MA（EMA/SMA 10,20,30,50,100,200）
  const periods = [10, 20, 30, 50, 100, 200] as const;
  const maRows = periods
    .map((p) => {
      const e = ema(closes, p);
      const s = sma(closes, p);
      return [
        { name: `EMA(${p})`, value: e, action: judgeMA(lastClose, e) },
        { name: `SMA(${p})`, value: s, action: judgeMA(lastClose, s) },
      ] as const;
    })
    .flat();

  // 一目（高安終値ベース）
  const ichi = ichimokuFromOHLC(highs, lows, closes);

  // v2 から4ラベル
  const overall_rating: RatingLabel5 | "データなし" =
    decision?.overall?.label ?? "データなし";
  const ma_rating: RatingLabel5 | "データなし" =
    (decision?.votes?.ma?.label as RatingLabel5 | undefined) ?? "データなし";
  const ichimoku_rating: RatingLabel5 | "データなし" =
    (decision?.votes?.ichimoku?.label as RatingLabel5 | undefined) ??
    "データなし";
  const tech_rating: RatingLabel5 | "データなし" = (() => {
    if (!decision?.votes) return "データなし";
    const keys = ["rsi14", "percent_b", "macd_hist", "sma25_dev_pct"] as const;
    const nums = keys
      .map((k) => decision.votes[k]?.score)
      .filter((x): x is number => typeof x === "number" && Number.isFinite(x));
    const avg =
      nums.length > 0
        ? Math.round(
            Math.max(
              -2,
              Math.min(2, nums.reduce((a, b) => a + b, 0) / nums.length)
            )
          )
        : 0;
    return avg >= 2
      ? "強い買い"
      : avg === 1
      ? "買い"
      : avg === 0
      ? "中立"
      : avg === -1
      ? "売り"
      : "強い売り";
  })();

  /* ======================= UI ======================= */
  return (
    <section className="rounded-xl border border-border/50 bg-background p-6">
      <h2 className="text-lg font-bold">
        テクニカル判断の内訳（最新日）
      </h2>

      {/* 上段：4ラベル（アイコン＋色） */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { k: "総合", v: overall_rating },
          { k: "オシレーター", v: tech_rating },
          { k: "移動平均", v: ma_rating },
          { k: "一目", v: ichimoku_rating },
        ].map((x) => (
          <div key={x.k} className="px-3 py-3 rounded-lg bg-card/50 text-center border border-border/30">
            <div className="text-xs font-medium text-muted-foreground/70 mb-1.5">{x.k}</div>
            <div className="text-base font-bold">
              {renderAction(x.v as RatingLabel5 | "データなし")}
            </div>
          </div>
        ))}
      </div>

      {/* 下段：3列（Osc / MA / Ichimoku） */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* === 1) オシレーター === */}
        <div className="rounded-lg border border-border/50 bg-card/40">
          <div className="px-3 py-2.5 text-sm font-bold border-b border-border/30">オシレーター</div>
          <table className="w-full text-sm leading-6 border-separate border-spacing-y-1">
            <thead>
              <tr className="text-xs font-semibold text-muted-foreground/80">
                <th className="text-left px-2 py-1.5">指標</th>
                <th className="text-right px-2 py-1.5">現在値</th>
                <th className="text-right px-2 py-1.5">閾値</th>
                <th className="text-right px-2 py-1.5">乖離</th>
                <th className="text-center px-2 py-1.5">判定</th>
              </tr>
            </thead>
            <tbody>
              {/* RSI(14) */}
              <tr className="bg-card/60">
                <td className="px-2 py-1">RSI(14)</td>
                <td className="px-2 py-1 text-right font-sans tabular-nums">
                  {fmt(decision?.values.rsi14 ?? null, nf1)}
                </td>
                <td className="px-2 py-1 text-right font-sans tabular-nums">
                  30 / 70
                </td>
                <td
                  className={`px-2 py-1 text-right font-sans tabular-nums ${toneBySign(
                    ((): number | null => {
                      const v = decision?.values.rsi14 ?? null;
                      if (na(v)) return null;
                      const { delta } = nearestDelta(v as number, 30, 70);
                      return delta;
                    })()
                  )}`}
                >
                  {(() => {
                    const v = decision?.values.rsi14 ?? null;
                    if (na(v)) return "データなし";
                    const { delta } = nearestDelta(v as number, 30, 70);
                    return nf1.format(delta);
                  })()}
                </td>
                <td className="px-2 py-1 text-center">
                  {renderAction(judgeOsc("rsi", decision?.values.rsi14))}
                </td>
              </tr>

              {/* %b */}
              <tr className="bg-card/60">
                <td className="px-2 py-1">%b (20,2σ)</td>
                <td className="px-2 py-1 text-right font-sans tabular-nums">
                  {fmt(decision?.values.percent_b ?? null, nf2)}
                </td>
                <td className="px-2 py-1 text-right font-sans tabular-nums">
                  0.05 / 0.95
                </td>
                <td
                  className={`px-2 py-1 text-right font-sans tabular-nums ${toneBySign(
                    ((): number | null => {
                      const v = decision?.values.percent_b ?? null;
                      if (na(v)) return null;
                      const { delta } = nearestDelta(v as number, 0.05, 0.95);
                      return delta;
                    })()
                  )}`}
                >
                  {(() => {
                    const v = decision?.values.percent_b ?? null;
                    if (na(v)) return "データなし";
                    const { delta } = nearestDelta(v as number, 0.05, 0.95);
                    return nf2.format(delta);
                  })()}
                </td>
                <td className="px-2 py-1 text-center">
                  {renderAction(
                    judgeOsc("percentB", decision?.values.percent_b)
                  )}
                </td>
              </tr>

              {/* MACD Hist */}
              <tr className="bg-card/60">
                <td className="px-2 py-1">MACD Hist</td>
                <td
                  className={`px-2 py-1 text-right font-sans tabular-nums ${toneBySign(
                    decision?.values.macd_hist ?? null
                  )}`}
                >
                  {fmt(decision?.values.macd_hist ?? null, nf2)}
                </td>
                <td className="px-2 py-1 text-right font-sans tabular-nums">
                  0
                </td>
                <td
                  className={`px-2 py-1 text-right font-sans tabular-nums ${toneBySign(
                    (decision?.values.macd_hist ?? null) as number | null
                  )}`}
                >
                  {fmt(
                    ((): number | null => {
                      const v = decision?.values.macd_hist ?? null;
                      if (na(v)) return null;
                      return v as number; // 基準0との差
                    })(),
                    nf2
                  )}
                </td>
                <td className="px-2 py-1 text-center">
                  {renderAction(
                    judgeOsc("macdHist", decision?.values.macd_hist)
                  )}
                </td>
              </tr>

              {/* 乖離%(25) */}
              <tr className="bg-card/60">
                <td className="px-2 py-1">乖離%(25)</td>
                <td
                  className={`px-2 py-1 text-right font-sans tabular-nums ${toneBySign(
                    decision?.values.sma25_dev_pct ?? null
                  )}`}
                >
                  {fmt(decision?.values.sma25_dev_pct ?? null, nf1, "%")}
                </td>
                <td className="px-2 py-1 text-right font-sans tabular-nums">
                  ±2.0%
                </td>
                <td
                  className={`px-2 py-1 text-right font-sans tabular-nums ${toneBySign(
                    ((): number | null => {
                      const v = decision?.values.sma25_dev_pct ?? null;
                      if (na(v)) return null;
                      const { delta } = nearestDelta(v as number, 2.0, -2.0);
                      return delta;
                    })()
                  )}`}
                >
                  {(() => {
                    const v = decision?.values.sma25_dev_pct ?? null;
                    if (na(v)) return "データなし";
                    const { delta } = nearestDelta(v as number, 2.0, -2.0);
                    return nf1.format(delta) + "%";
                  })()}
                </td>
                <td className="px-2 py-1 text-center">
                  {renderAction(
                    judgeOsc("smaDev", decision?.values.sma25_dev_pct)
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* === 2) 移動平均 === */}
        <div className="rounded-lg border border-border/50 bg-card/40">
          <div className="px-3 py-2.5 text-sm font-bold border-b border-border/30">移動平均</div>
          <table className="w-full text-sm leading-6 border-separate border-spacing-y-1">
            <thead>
              <tr className="text-xs font-semibold text-muted-foreground/80">
                <th className="text-left px-2 py-1.5">指標</th>
                <th className="text-right px-2 py-1.5">現在値</th>
                <th className="text-right px-2 py-1.5">閾値</th>
                <th className="text-right px-2 py-1.5">乖離</th>
                <th className="text-center px-2 py-1.5">判定</th>
              </tr>
            </thead>
            <tbody>
              {maRows.length ? (
                maRows.map((r) => {
                  const maVal = r.value;
                  const close = lastClose;
                  const deltaPct =
                    !na(close) && !na(maVal) && (maVal as number) !== 0
                      ? ((close as number) - (maVal as number)) /
                        (maVal as number)
                      : null;
                  return (
                    <tr key={r.name} className="bg-card/60">
                      <td className="px-2 py-1">{r.name}</td>
                      <td className="px-2 py-1 text-right font-sans tabular-nums">
                        {fmt(close ?? null, nf0)}
                      </td>
                      <td className="px-2 py-1 text-right font-sans tabular-nums">
                        {fmt(maVal ?? null, nf0)}
                      </td>
                      <td
                        className={`px-2 py-1 text-right font-sans tabular-nums ${toneBySign(
                          deltaPct
                        )}`}
                      >
                        {fmt(
                          ((): number | null => {
                            if (deltaPct == null || !Number.isFinite(deltaPct))
                              return null;
                            return deltaPct * 100;
                          })(),
                          nf1,
                          "%"
                        )}
                      </td>
                      <td className="px-2 py-1 text-center">
                        {renderAction(r.action)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr className="bg-card/60">
                  <td className="px-2 py-2 text-center" colSpan={5}>
                    データなし
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* === 3) 一目均衡表 === */}
        <div className="rounded-lg border border-border/50 bg-card/40">
          <div className="px-3 py-2.5 text-sm font-bold border-b border-border/30">
            一目均衡表（9,26,52）
          </div>
          <table className="w-full text-sm leading-6 border-separate border-spacing-y-1">
            <thead>
              <tr className="text-xs font-semibold text-muted-foreground/80">
                <th className="text-left px-2 py-1.5">指標</th>
                <th className="text-right px-2 py-1.5">現在値</th>
                <th className="text-right px-2 py-1.5">閾値</th>
                <th className="text-right px-2 py-1.5">乖離</th>
                <th className="text-center px-2 py-1.5">判定</th>
              </tr>
            </thead>
            <tbody>
              {ichi ? (
                <>
                  {/* 価格 vs 雲 */}
                  <tr className="bg-card/60">
                    <td className="px-2 py-1">価格 vs 雲</td>
                    <td className="px-2 py-1 text-right font-sans tabular-nums">
                      {fmt(ichi.lastClose, nf0)}
                    </td>
                    <td className="px-2 py-1 text-right font-sans tabular-nums">
                      雲 {fmt(ichi.cloudBot, nf0)}〜{fmt(ichi.cloudTop, nf0)}
                    </td>
                    <td
                      className={`px-2 py-1 text-right font-sans tabular-nums ${toneBySign(
                        ((): number | null => {
                          if (
                            na(ichi.lastClose) ||
                            na(ichi.cloudTop) ||
                            na(ichi.cloudBot)
                          )
                            return null;
                          const last = ichi.lastClose;
                          const top = ichi.cloudTop;
                          const bot = ichi.cloudBot;
                          if (last > top) return last - top;
                          if (last < bot) return last - bot;
                          return 0; // 雲内
                        })()
                      )}`}
                    >
                      {(() => {
                        if (
                          na(ichi.lastClose) ||
                          na(ichi.cloudTop) ||
                          na(ichi.cloudBot)
                        )
                          return "データなし";
                        const last = ichi.lastClose;
                        const top = ichi.cloudTop;
                        const bot = ichi.cloudBot;
                        const d =
                          last > top ? last - top : last < bot ? last - bot : 0;
                        return nf0.format(d);
                      })()}
                    </td>
                    <td className="px-2 py-1 text-center">
                      {renderAction(
                        judgeIchiCloud(
                          ichi.lastClose,
                          ichi.cloudTop,
                          ichi.cloudBot
                        )
                      )}
                    </td>
                  </tr>

                  {/* 転換 vs 基準 */}
                  <tr className="bg-card/60">
                    <td className="px-2 py-1">転換線 vs 基準線</td>
                    <td className="px-2 py-1 text-right font-sans tabular-nums">
                      {fmt(ichi.tenkan, nf0)}
                    </td>
                    <td className="px-2 py-1 text-right font-sans tabular-nums">
                      基準 {fmt(ichi.kijun, nf0)}
                    </td>
                    <td
                      className={`px-2 py-1 text-right font-sans tabular-nums ${toneBySign(
                        ((): number | null => {
                          if (na(ichi.tenkan) || na(ichi.kijun)) return null;
                          return ichi.tenkan - ichi.kijun;
                        })()
                      )}`}
                    >
                      {(() => {
                        if (na(ichi.tenkan) || na(ichi.kijun))
                          return "データなし";
                        return nf0.format(ichi.tenkan - ichi.kijun);
                      })()}
                    </td>
                    <td className="px-2 py-1 text-center">
                      {renderAction(judgeIchiTK(ichi.tenkan, ichi.kijun))}
                    </td>
                  </tr>

                  {/* 遅行 vs 価格 */}
                  <tr className="bg-card/60">
                    <td className="px-2 py-1">遅行スパン vs 価格</td>
                    <td className="px-2 py-1 text-right font-sans tabular-nums">
                      {fmt(ichi.chikou, nf0)}
                    </td>
                    <td className="px-2 py-1 text-right font-sans tabular-nums">
                      価格 {fmt(ichi.lastClose, nf0)}
                    </td>
                    <td
                      className={`px-2 py-1 text-right font-sans tabular-nums ${toneBySign(
                        ((): number | null => {
                          if (na(ichi.chikou) || na(ichi.lastClose))
                            return null;
                          return ichi.chikou - ichi.lastClose;
                        })()
                      )}`}
                    >
                      {(() => {
                        if (na(ichi.chikou) || na(ichi.lastClose))
                          return "データなし";
                        return nf0.format(ichi.chikou - ichi.lastClose);
                      })()}
                    </td>
                    <td className="px-2 py-1 text-center">
                      {renderAction(judgeIchiLag(ichi.chikou, ichi.lastClose))}
                    </td>
                  </tr>
                </>
              ) : (
                <tr className="bg-card/60">
                  <td className="px-2 py-2 text-center" colSpan={5}>
                    データなし
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
