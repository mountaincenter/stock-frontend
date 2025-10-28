"use client";

import * as React from "react";
import Link from "next/link";
import type { Row } from "../../types";

type Props = { rows: Row[]; nf0: Intl.NumberFormat; nf2: Intl.NumberFormat };

const headerBase =
  "text-[10px] leading-none text-muted-foreground font-medium uppercase tracking-wide";
const rowBase =
  "grid items-center px-2 py-2 min-h-[56px] text-[12px] hover:bg-muted/40 transition-colors border-b border-border";

// コードと日付（サブ行）→ ★ サンセリフ＋タビュラー
const codeSub = "text-[10px] text-muted-foreground font-sans tabular-nums";
const dateSub = "text-[9px] text-muted-foreground/70 ml-1.5";

// 銘柄名：明るめ & 少し太字（デスクトップ寄せ）
const nameBig =
  "text-card-foreground font-semibold leading-tight text-[13px]";

// 価格/率：★ 金融向け（サンセリフ＋タビュラー）楽天証券スタイル
const priceBig = "font-bold font-sans tabular-nums text-[22px] leading-none";
const pctSmall = "text-[13px] font-bold font-sans tabular-nums leading-none";

export default function PriceSimpleMobile({ rows, nf0, nf2 }: Props) {
  // 日時フォーマット関数 (YYYY-MM-DD HH:mm)
  const formatDateTime = (timeStr: string | null | undefined): string => {
    if (!timeStr) return "—";
    try {
      const date = new Date(timeStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch {
      return timeStr;
    }
  };

  return (
    <div className="rounded-none border-0 overflow-hidden md:rounded-md md:border md:border-border">
      {/* ヘッダ（sticky） */}
      <div
        className="
          grid grid-cols-12 gap-2 px-2 py-1 items-center
          bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60
          sticky top-0 z-10
        "
      >
        <div className={`col-span-7 ${headerBase}`}>銘柄名 / コード</div>
        <div className={`col-span-3 text-right ${headerBase}`}>株価</div>
        <div className={`col-span-2 text-right ${headerBase} leading-tight`}>
          <div>寄付比(%)</div>
          <div>前日比</div>
        </div>
      </div>

      <div className="max-h-[calc(100vh-168px)] md:max-h-[70vh] overflow-auto">
        {rows.map((r) => {
          const diff = r.diff;
          const pct =
            r.diff != null &&
            r.prevClose != null &&
            Number.isFinite(r.diff) &&
            Number.isFinite(r.prevClose) &&
            r.prevClose !== 0
              ? (r.diff / r.prevClose) * 100
              : null;

          // 寄付比の計算（デスクトップ版と同じロジック）
          const openDiff =
            r.close != null &&
            r.open != null &&
            Number.isFinite(r.close) &&
            Number.isFinite(r.open)
              ? r.close - r.open
              : null;

          const openDiffPct =
            openDiff != null && r.open != null && r.open !== 0
              ? (openDiff / r.open) * 100
              : null;

          // 楽天証券スタイル: 高彩度・高明度の鮮やかな色（前日比用）
          const tone =
            diff == null || !Number.isFinite(diff)
              ? "text-muted-foreground"
              : diff > 0
              ? "text-[rgb(76,175,80)]" // 楽天証券の鮮やかな緑
              : diff < 0
              ? "text-[rgb(244,67,54)]" // 楽天証券の鮮やかな赤
              : "text-muted-foreground";

          // 寄付比用の色
          const openTone =
            openDiff == null || !Number.isFinite(openDiff)
              ? "text-muted-foreground"
              : openDiff > 0
              ? "text-[rgb(76,175,80)]"
              : openDiff < 0
              ? "text-[rgb(244,67,54)]"
              : "text-muted-foreground";

          // Grok銘柄の判定とreason取得
          const isGrokStock = r.categories?.includes("GROK") ?? false;
          const grokReason = isGrokStock ? r.reason : null;

          // marketTimeがあればそれを使用、なければdateを使用
          const displayDate = r.marketTime ? formatDateTime(r.marketTime) : (r.date ?? "—");

          return (
            <Link
              key={r.ticker}
              href={`/${encodeURIComponent(r.ticker)}`}
              className={`
                grid grid-cols-12 gap-2 ${rowBase}
                active:bg-muted/60 touch-manipulation
                transition-colors duration-150
              `}
            >
              {/* 銘柄名（明るめ） + コード/日付（サブ） + Grok選定理由 */}
              <div className="col-span-7 min-w-0">
                <div className={nameBig} title={r.stock_name}>
                  {r.stock_name}
                </div>
                <div className={codeSub}>
                  {r.code}
                  <span className={dateSub}>{displayDate}</span>
                </div>
                {isGrokStock && grokReason && (
                  <div className="mt-0.5 text-[10px] leading-tight text-muted-foreground/80">
                    {grokReason}
                  </div>
                )}
              </div>

              {/* 株価：前日差と同じ色トーンに合わせる */}
              <div className="col-span-3 text-right">
                {r.close == null || !Number.isFinite(r.close) ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <span className={`${priceBig} ${tone}`}>
                    {nf0.format(r.close)}
                  </span>
                )}
              </div>

              {/* 騰落 3段: 寄付比 / 寄付比% / 前日比 */}
              <div className="col-span-2 text-right leading-tight">
                <div className="inline-flex flex-col items-end gap-0.5">
                  {/* 寄付比 */}
                  {openDiff == null || !Number.isFinite(openDiff) ? (
                    <span className="text-muted-foreground text-[10px]">—</span>
                  ) : (
                    <span className={`font-bold font-sans tabular-nums text-[11px] leading-none ${openTone}`}>
                      {openDiff > 0 ? "+" : ""}
                      {nf0.format(openDiff)}
                    </span>
                  )}

                  {/* 寄付比% */}
                  {openDiffPct == null || !Number.isFinite(openDiffPct) ? (
                    <span className="text-muted-foreground text-[9px]">—</span>
                  ) : (
                    <span className={`text-[9px] font-bold font-sans tabular-nums leading-none ${openTone}`}>
                      {openDiffPct > 0 ? "+" : ""}
                      {nf2.format(openDiffPct)}%
                    </span>
                  )}

                  {/* 前日比 */}
                  {diff == null || !Number.isFinite(diff) ? (
                    <span className="text-muted-foreground text-[10px]">—</span>
                  ) : (
                    <span className={`font-bold font-sans tabular-nums text-[11px] leading-none ${tone}`}>
                      {diff > 0 ? "+" : ""}
                      {nf0.format(diff)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
