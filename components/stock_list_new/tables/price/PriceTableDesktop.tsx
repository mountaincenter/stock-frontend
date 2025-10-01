"use client";

import * as React from "react";
import Link from "next/link";
import type { Row } from "../../types";
import { CloseCell, DiffBadge, NumCell } from "../../parts/Cells";

export default function PriceTableDesktop({
  rows,
  nf0,
  nf2,
}: {
  rows: Row[];
  nf0: Intl.NumberFormat;
  nf2: Intl.NumberFormat;
}) {
  return (
    <div className="space-y-2">
      {/* ヘッダ：sticky */}
      <div
        className="
          grid grid-cols-18 gap-4 px-4 py-3
          text-slate-400 text-sm font-medium
          border-b border-slate-700/50
          sticky top-0 z-20
          bg-slate-900/85 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60
        "
      >
        <div className="col-span-2">コード</div>
        <div className="col-span-6">銘柄名</div>
        <div className="col-span-2 text-right">終値</div>
        <div className="col-span-2 text-right">前日差</div>
        <div className="col-span-2 text-right">前日差(%)</div>
        <div className="col-span-2 text-right">出来高</div>
        <div className="col-span-2 text-right">出来高(10)</div>
      </div>

      {rows.map((r) => {
        const pct =
          r.diff != null &&
          r.prevClose != null &&
          Number.isFinite(r.diff) &&
          Number.isFinite(r.prevClose) &&
          r.prevClose !== 0
            ? (r.diff / r.prevClose) * 100
            : null;

        return (
          <Link
            key={r.ticker}
            href={`/${encodeURIComponent(r.ticker)}`}
            className="block premium-card rounded-xl border border-slate-700/50 hover:border-blue-500/50 hover:scale-[1.02] transition-all duration-200"
          >
            <div className="grid grid-cols-18 gap-4 px-4 py-4">
              <div className="col-span-2">
                {/* ★ 金融向け：サンセリフ＋タビュラー */}
                <span className="text-white font-sans tabular-nums font-bold text-lg">
                  {r.code}
                </span>
              </div>

              <div className="col-span-6">
                <h3 className="text-white font-bold text-base leading-tight hover:text-blue-300 transition-colors">
                  {r.stock_name}
                </h3>
                <div className="text-slate-500 text-xs mt-0.5 font-sans tabular-nums">
                  {r.date ?? "—"}
                </div>
              </div>

              <div className="col-span-2 text-right text-white">
                <CloseCell v={r.close} nf0={nf0} />
              </div>

              <div className="col-span-2 text-right">
                {/* 前日差（数値） */}
                <DiffBadge diff={r.diff} nf0={nf0} />
              </div>

              <div className="col-span-2 text-right">
                {pct == null || !Number.isFinite(pct) ? (
                  <span className="text-slate-400">―</span>
                ) : (
                  <span
                    className={
                      (pct > 0
                        ? "text-emerald-300"
                        : pct < 0
                        ? "text-rose-300"
                        : "text-slate-300") + " font-sans tabular-nums"
                    }
                  >
                    {pct > 0 ? "+" : ""}
                    {nf2.format(pct)}%
                  </span>
                )}
              </div>

              <div className="col-span-2 text-right text-white">
                <NumCell v={r.volume} nf0={nf0} />
              </div>

              <div className="col-span-2 text-right text-white">
                <NumCell v={r.vol_ma10} nf0={nf0} />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
