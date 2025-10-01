// components/stock_list_new/tables/price/PriceListMobile.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import type { Row } from "../../types";

type Props = {
  rows: Row[];
  nf0: Intl.NumberFormat;
  nf2: Intl.NumberFormat;
};

export default function PriceListMobile({ rows, nf0, nf2 }: Props) {
  // “桁揃え”用：数値表示の最小幅（等幅数字で9桁ぶん）
  const valueWidth = "min-w-[11ch] whitespace-nowrap";

  return (
    // 2カラムカード
    <div className="grid grid-cols-2 gap-2">
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
            ? "text-slate-400"
            : diff > 0
            ? "text-emerald-400"
            : diff < 0
            ? "text-rose-400"
            : "text-slate-300";

        return (
          <Link
            key={r.ticker}
            href={`/${encodeURIComponent(r.ticker)}`}
            className="
              block rounded-xl border border-slate-700/60 
              bg-slate-900/40 hover:border-blue-500/50
              transition-colors
            "
          >
            <div className="px-3 py-3">
              {/* 銘柄名/コード/日付（左寄せ） */}
              <div className="min-w-0 text-left">
                <h3
                  className="
                    text-slate-50 font-semibold leading-tight 
                    [font-size:clamp(12px,3.8vw,15px)]
                    line-clamp-1
                  "
                  title={r.stock_name}
                >
                  {r.stock_name}
                </h3>
                <div className="mt-0.5 text-[11px] text-slate-400 font-mono tabular-nums">
                  {r.code} {r.date ? ` ${r.date}` : " —"}
                </div>
              </div>

              {/* 価格・前日差（右寄せ） */}
              <div className="mt-2">
                <div className="text-right">
                  {r.close == null || !Number.isFinite(r.close) ? (
                    <span className="text-slate-400">—</span>
                  ) : (
                    <span
                      className={`
                        font-mono tabular-nums font-extrabold
                        [font-size:clamp(18px,6vw,28px)]
                        ${tone}
                      `}
                    >
                      {nf0.format(r.close)}
                    </span>
                  )}
                </div>

                {/* 前日差：1行（値 + スペース + (率)）右寄せ */}
                <div className="mt-0.5 text-right">
                  {diff == null || !Number.isFinite(diff) ? (
                    <span className="text-slate-400 text-[12px]">—</span>
                  ) : (
                    <span
                      className={`font-mono tabular-nums ${tone} text-[13px]`}
                    >
                      {diff > 0 ? "+" : ""}
                      {nf0.format(diff)}
                      {pct == null || !Number.isFinite(pct) ? (
                        ""
                      ) : (
                        <>
                          {" "}
                          ({pct > 0 ? "+" : ""}
                          {nf2.format(pct)}%)
                        </>
                      )}
                    </span>
                  )}
                </div>
              </div>

              {/* 下段：出来高（2段・右寄せ・最大桁合わせ） */}
              <div className="mt-2 space-y-1">
                {/* 1段目：出来高 */}
                <div className="flex items-baseline justify-between">
                  <div className="text-[11px] text-slate-400">出来高</div>
                  <span
                    className={`text-[13px] text-slate-100 font-mono tabular-nums inline-block text-right ${valueWidth}`}
                  >
                    {r.volume == null || !Number.isFinite(r.volume)
                      ? "—"
                      : nf0.format(r.volume)}
                  </span>
                </div>

                {/* 2段目：出来高(10) */}
                <div className="flex items-baseline justify-between">
                  <div className="text-[11px] text-slate-400">出来高(10)</div>
                  <span
                    className={`text-[13px] text-slate-100 font-mono tabular-nums inline-block text-right ${valueWidth}`}
                  >
                    {r.vol_ma10 == null || !Number.isFinite(r.vol_ma10)
                      ? "—"
                      : nf0.format(r.vol_ma10)}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
