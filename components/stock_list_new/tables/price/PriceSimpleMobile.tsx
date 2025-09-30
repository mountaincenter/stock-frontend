"use client";

import * as React from "react";
import Link from "next/link";
import type { Row } from "../../types";

type Props = {
  rows: Row[];
  nf0: Intl.NumberFormat;
  nf2: Intl.NumberFormat;
};

const headerBase =
  "text-[10px] leading-none text-slate-400 font-medium uppercase tracking-wide";
const rowBase =
  "grid items-center px-3 h-10 text-xs hover:bg-slate-800/40 transition-colors border-b border-slate-800/60";
const numCls = "font-mono tabular-nums";
const codeCls = "text-slate-200 font-mono font-semibold";
const // 銘柄名は幅に応じて 10px〜12px で可変
  nameCls =
    "text-slate-100 truncate leading-snug [font-size:clamp(10px,3.2vw,12px)]";
const dateSub = "text-[9px] text-slate-500 mt-0.5";

export default function PriceSimpleMobile({ rows, nf0, nf2 }: Props) {
  return (
    <div className="rounded-md border border-slate-800/80 overflow-hidden">
      {/* ヘッダ（sticky） */}
      <div className="grid grid-cols-12 gap-2 px-3 h-8 items-center bg-slate-950/70 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60 sticky top-0 z-10">
        <div className={`col-span-2 ${headerBase}`}>コード</div>
        <div className={`col-span-6 ${headerBase}`}>銘柄名</div>
        <div className={`col-span-2 text-right ${headerBase}`}>終値</div>
        <div className={`col-span-2 text-right ${headerBase}`}>前日差</div>
      </div>

      <div className="max-h-[70vh] overflow-auto">
        {rows.map((r) => {
          const pct =
            r.diff != null &&
            r.prevClose != null &&
            Number.isFinite(r.diff) &&
            Number.isFinite(r.prevClose) &&
            r.prevClose !== 0
              ? (r.diff / r.prevClose) * 100
              : null;

          const diffPos = (r.diff ?? 0) > 0;
          const diffCls =
            r.diff == null || !Number.isFinite(r.diff)
              ? "text-slate-400"
              : diffPos
              ? "text-emerald-400"
              : r.diff! < 0
              ? "text-rose-400"
              : "text-slate-300";

          return (
            <Link
              key={r.ticker}
              href={`/${encodeURIComponent(r.ticker)}`}
              className={`grid grid-cols-12 gap-2 ${rowBase}`}
            >
              {/* コード */}
              <div className="col-span-2">
                <span className={codeCls}>{r.code}</span>
              </div>

              {/* 銘柄名（可変フォント＋サブに日付） */}
              <div className="col-span-6 min-w-0">
                <div className={nameCls} title={r.stock_name}>
                  {r.stock_name}
                </div>
                <div className={dateSub}>{r.date ?? "—"}</div>
              </div>

              {/* 終値 */}
              <div className="col-span-2 text-right">
                {r.close == null || !Number.isFinite(r.close) ? (
                  <span className="text-slate-400">—</span>
                ) : (
                  <span className={`${numCls} text-slate-100`}>
                    {nf0.format(r.close)}
                  </span>
                )}
              </div>

              {/* 前日差（数値 + % を1セル内でコンパクトに） */}
              <div className="col-span-2 text-right">
                {r.diff == null || !Number.isFinite(r.diff) ? (
                  <span className="text-slate-400">—</span>
                ) : (
                  <span className={`${numCls} ${diffCls}`}>
                    {r.diff > 0 ? "+" : ""}
                    {nf0.format(r.diff)}
                    {pct == null || !Number.isFinite(pct) ? (
                      ""
                    ) : (
                      <> ({nf2.format(pct)}%)</>
                    )}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
