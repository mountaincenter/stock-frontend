"use client";

import * as React from "react";
import Link from "next/link";
import type { Row } from "../../types";

type Props = { rows: Row[]; nf0: Intl.NumberFormat; nf2: Intl.NumberFormat };

const headerBase =
  "text-[11px] leading-none text-muted-foreground font-medium uppercase tracking-wide";
const rowBase =
  "grid items-center px-3 h-14 text-[13px] hover:bg-muted/40 transition-colors border-b border-border";

// コードと日付（サブ行）→ ★ サンセリフ＋タビュラー
const codeSub = "text-[11px] text-muted-foreground font-sans tabular-nums";
const dateSub = "text-[10px] text-muted-foreground/70 ml-2";

// 銘柄名：明るめ & 少し太字（デスクトップ寄せ）
const nameBig =
  "text-card-foreground font-semibold leading-tight [font-size:clamp(13px,3.6vw,15px)]";

// 価格/率：★ 金融向け（サンセリフ＋タビュラー）
const priceBig = "font-semibold font-sans tabular-nums text-base";
const pctSmall = "text-[11px] font-sans tabular-nums";

export default function PriceSimpleMobile({ rows, nf0, nf2 }: Props) {
  return (
    <div className="rounded-none border-0 overflow-hidden md:rounded-md md:border md:border-border">
      {/* ヘッダ（sticky） */}
      <div
        className="
          grid grid-cols-12 gap-2 px-3 h-8 items-center
          bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60
          sticky top-0 z-10
        "
      >
        <div className={`col-span-7 ${headerBase}`}>銘柄名 / コード</div>
        <div className={`col-span-3 text-right ${headerBase}`}>株価</div>
        <div className={`col-span-2 text-right ${headerBase}`}>前日比</div>
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

          const tone =
            diff == null || !Number.isFinite(diff)
              ? "text-muted-foreground"
              : diff > 0
              ? "text-green-600 dark:text-green-500"
              : diff < 0
              ? "text-red-600 dark:text-red-500"
              : "text-muted-foreground";

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
              {/* 銘柄名（明るめ） + コード/日付（サブ） */}
              <div className="col-span-7 min-w-0">
                <div className={nameBig} title={r.stock_name}>
                  {r.stock_name}
                </div>
                <div className={codeSub}>
                  {r.code}
                  <span className={dateSub}>{r.date ?? "—"}</span>
                </div>
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

              {/* 前日差 2段: 値 / (率) */}
              <div className="col-span-2 text-right leading-tight">
                {diff == null || !Number.isFinite(diff) ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <div className="inline-flex flex-col items-end">
                    <span className={`font-sans tabular-nums ${tone}`}>
                      {diff > 0 ? "+" : ""}
                      {nf0.format(diff)}
                    </span>
                    <span className={`${pctSmall} ${tone}`}>
                      {pct == null || !Number.isFinite(pct)
                        ? "—"
                        : `${pct > 0 ? "+" : ""}${nf2.format(pct)}%`}
                    </span>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
