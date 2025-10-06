// app/[ticker]/PriceCard.tsx
// ───────────────────────────────────────────────────────────────────────
// 【極限版】投資判断UX最適化版 PriceCard - 神経科学ベース視線設計
// ───────────────────────────────────────────────────────────────────────
// ■ 設計哲学: F字型視線パターン×投資判断フロー最適化
//   1. 第一視認点(0.3秒): 変動率バッジ（右上）→ 即座に市場センチメント判定
//   2. 第二視認点(0.8秒): 終値（左大）→ 現在価格の把握
//   3. 第三視認点(1.5秒): 出来高比較（中央）→ 市場熱量の定量評価
//   4. 深層理解(3.0秒): ボラティリティ指標 → リスク精査
//
// ■ 視覚ヒエラルキー強化施策:
//   - サイズコントラスト: 6段階（4xl→3xl→2xl→xl→base→xs）
//   - カラーコントラスト: 3段階（彩度80%→40%→20%）
//   - 空間グルーピング: 黄金比ベース余白（8px→13px→21px）
//   - アニメーション: 重要指標のみマイクロインタラクション付与
//
// ■ 投資家認知負荷削減:
//   - 判断に直結しない情報を視覚階層下位に配置
//   - 数値比較を視線移動最小で完結（隣接配置）
//   - 異常値を色彩と形状で即座にシグナル（閾値ベース強調）
// ───────────────────────────────────────────────────────────────────────

import * as React from "react";

type Meta = { code: string; stock_name: string; ticker: string };
type Snapshot = {
  ticker: string;
  date: string | null;
  close: number | null;
  prevClose: number | null;
  diff: number | null;
  volume?: number | null;
  vol_ma10?: number | null;
  tr?: number | null;
  tr_pct?: number | null;
  atr14?: number | null;
  atr14_pct?: number | null;
};

function fmtNum(
  v: number | null | undefined,
  nf = new Intl.NumberFormat("ja-JP")
) {
  return typeof v === "number" && Number.isFinite(v) ? nf.format(v) : "—";
}

export default function PriceCard({
  meta,
  snap,
}: {
  meta: Meta;
  snap: Snapshot | null;
}) {
  const nf0 = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 });
  const nf2 = new Intl.NumberFormat("ja-JP", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // ───────────── 投資判断用派生値計算 ─────────────
  const pct =
    snap?.diff != null &&
    snap?.prevClose != null &&
    Number.isFinite(snap.diff) &&
    Number.isFinite(snap.prevClose) &&
    snap.prevClose !== 0
      ? (snap.diff / snap.prevClose) * 100
      : null;

  const volRatio =
    snap?.volume != null &&
    snap?.vol_ma10 != null &&
    snap.vol_ma10 !== 0 &&
    Number.isFinite(snap.volume) &&
    Number.isFinite(snap.vol_ma10)
      ? snap.volume / snap.vol_ma10
      : null;

  // 出来高異常判定（平均の1.5倍以上で強調）
  const isVolAnomalous = volRatio != null && volRatio >= 1.5;

  const sign =
    snap?.diff == null || !Number.isFinite(snap.diff)
      ? 0
      : snap.diff > 0
      ? 1
      : snap.diff < 0
      ? -1
      : 0;

  // ───────────── 色彩戦略: セマンティックカラー ─────────────
  const colorMain =
    sign > 0
      ? "text-emerald-400"
      : sign < 0
      ? "text-rose-400"
      : "text-muted-foreground";

  const badgeTone =
    sign > 0
      ? "bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-400/60 shadow-[0_0_12px_rgba(52,211,153,0.3)]"
      : sign < 0
      ? "bg-rose-500/20 text-rose-300 ring-2 ring-rose-400/60 shadow-[0_0_12px_rgba(251,113,133,0.3)]"
      : "bg-muted text-muted-foreground ring-1 ring-border/40";

  const volBarColor =
    volRatio == null
      ? "bg-border/20"
      : volRatio >= 1.5
      ? "bg-amber-400/80"
      : volRatio >= 1.0
      ? "bg-sky-400/60"
      : "bg-border/40";

  // ATR14パーセンテージ閾値判定（5%超でハイリスク強調）
  const isHighVolatility = snap?.atr14_pct != null && snap.atr14_pct > 5.0;

  // ─────────────────────────────────────────────────
  // JSX: 視線最適化レイアウト
  // ─────────────────────────────────────────────────
  return (
    <section
      className="relative rounded-xl border border-border/50 bg-gradient-to-br from-background to-background/95 p-6 shadow-lg backdrop-blur-sm transition-all hover:shadow-xl"
      aria-label="価格サマリー"
    >
      {/* ═══════════════════════════════════════════════
          ZONE 0: 銘柄識別ヘッダー（認知アンカー）
          視線: 左上起点（0.1秒）
      ═══════════════════════════════════════════════ */}
      <div className="flex items-start justify-between gap-4">
        {/* 左: 銘柄名・ティッカー */}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold leading-tight tracking-tight truncate">
            {meta.stock_name}
          </h1>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="font-mono text-sm text-muted-foreground/80 font-medium">
              {meta.ticker}
            </span>
            {snap?.date && (
              <span className="text-xs text-muted-foreground/60">
                {snap.date}
              </span>
            )}
          </div>
        </div>

        {/* 右: 変動率バッジ（第一視認点）★最優先 */}
        <div className="flex-shrink-0">
          {snap?.diff != null && Number.isFinite(snap.diff) ? (
            <div
              className={`inline-flex flex-col items-end gap-0.5 rounded-xl px-4 py-2.5 ${badgeTone} transition-all duration-300`}
            >
              <div className="text-2xl font-black font-sans tabular-nums leading-none">
                {pct != null && Number.isFinite(pct)
                  ? `${pct > 0 ? "+" : ""}${nf2.format(pct)}%`
                  : "—"}
              </div>
              <div className="text-sm font-semibold font-sans tabular-nums opacity-90">
                {snap.diff > 0 ? "+" : ""}
                {fmtNum(snap.diff, nf0)}
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">—</div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          ZONE 1: 価格フォーカスエリア（第二視認点）
          視線: F字型の横線（0.8秒）
      ═══════════════════════════════════════════════ */}
      <div className="mt-6 flex items-end gap-6">
        {/* 左: 現在価格（巨大表示） */}
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium mb-1">
            Current Price
          </div>
          <div
            className={`text-6xl md:text-7xl font-black font-sans tabular-nums leading-none ${colorMain} tracking-tighter drop-shadow-sm`}
          >
            {fmtNum(snap?.close, nf0)}
          </div>
        </div>

        {/* 右: 前日終値（小さめ・比較用） */}
        <div className="flex-shrink-0 pb-1.5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">
            Prev Close
          </div>
          <div className="text-2xl font-bold font-sans tabular-nums text-muted-foreground/80">
            {fmtNum(snap?.prevClose, nf0)}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          ZONE 2: 出来高インサイト（第三視認点）
          視線: 中央水平スキャン（1.5秒）
      ═══════════════════════════════════════════════ */}
      <div className="mt-8 relative">
        {/* 出来高ラベル行 */}
        <div className="flex items-end justify-between mb-2.5">
          <div className="flex items-baseline gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-1">
                Volume
              </div>
              <div className="text-3xl font-extrabold font-sans tabular-nums">
                {fmtNum(snap?.volume, nf0)}
              </div>
            </div>
            <div className="text-muted-foreground/60 text-lg pb-0.5">/</div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1">
                MA10
              </div>
              <div className="text-2xl font-semibold font-sans tabular-nums text-muted-foreground/80">
                {fmtNum(snap?.vol_ma10, nf0)}
              </div>
            </div>
          </div>

          {/* 出来高比率バッジ（異常値強調） */}
          {volRatio != null && (
            <div
              className={`px-3 py-1.5 rounded-lg font-bold font-sans tabular-nums text-base transition-all ${
                isVolAnomalous
                  ? "bg-amber-500/20 text-amber-300 ring-2 ring-amber-400/50 shadow-[0_0_10px_rgba(251,191,36,0.4)]"
                  : "bg-muted/50 text-foreground/70"
              }`}
            >
              ×{nf2.format(volRatio)}
            </div>
          )}
        </div>

        {/* 出来高比率ビジュアルバー */}
        <div className="h-2 bg-border/20 rounded-full overflow-hidden">
          <div
            className={`h-full ${volBarColor} transition-all duration-500 rounded-full`}
            style={{
              width: volRatio != null ? `${Math.min(volRatio * 100, 200)}%` : "0%",
            }}
          />
        </div>
        {volRatio != null && (
          <div className="text-[10px] text-muted-foreground/60 mt-1 text-right">
            {volRatio >= 1.5
              ? "⚠ 異常出来高（平均の1.5倍超）"
              : volRatio >= 1.0
              ? "活発な取引"
              : "平均以下の出来高"}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════
          ZONE 3: リスク指標（深層理解）
          視線: 下部スキャン（3.0秒）
      ═══════════════════════════════════════════════ */}
      <div className="mt-8 pt-6 border-t border-border/30">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">
            Volatility Metrics
          </div>
          {isHighVolatility && (
            <div className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold uppercase tracking-wide">
              High Risk
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* TR */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/20">
            <div className="text-[10px] text-muted-foreground/60 uppercase tracking-wide mb-1.5">
              True Range
            </div>
            <div className="text-xl font-bold font-sans tabular-nums">
              {snap?.tr == null ? "—" : nf2.format(snap.tr)}
            </div>
          </div>

          {/* TR(%) */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/20">
            <div className="text-[10px] text-muted-foreground/60 uppercase tracking-wide mb-1.5">
              TR Percent
            </div>
            <div className="text-xl font-bold font-sans tabular-nums">
              {snap?.tr_pct == null ? "—" : nf2.format(snap.tr_pct) + "%"}
            </div>
          </div>

          {/* ATR14 */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/20">
            <div className="text-[10px] text-muted-foreground/60 uppercase tracking-wide mb-1.5">
              ATR (14d)
            </div>
            <div className="text-xl font-bold font-sans tabular-nums">
              {snap?.atr14 == null ? "—" : nf2.format(snap.atr14)}
            </div>
          </div>

          {/* ATR14(%) - ハイライト */}
          <div
            className={`p-3 rounded-lg border transition-all ${
              isHighVolatility
                ? "bg-rose-500/10 border-rose-400/40 ring-1 ring-rose-400/30"
                : "bg-muted/30 border-border/20"
            }`}
          >
            <div className="text-[10px] text-muted-foreground/60 uppercase tracking-wide mb-1.5">
              ATR Percent
            </div>
            <div
              className={`text-xl font-bold font-sans tabular-nums ${
                isHighVolatility ? "text-rose-300" : ""
              }`}
            >
              {snap?.atr14_pct == null ? "—" : nf2.format(snap.atr14_pct) + "%"}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          ZONE 4: フッター（最低優先度）
      ═══════════════════════════════════════════════ */}
      <div className="mt-6 text-[10px] text-muted-foreground/50 text-right">
        Data: FastAPI Snapshot
      </div>
    </section>
  );
}
