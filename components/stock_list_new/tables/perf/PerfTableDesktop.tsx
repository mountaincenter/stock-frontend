// components/stock_list_new/tables/perf/PerfTableDesktop.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import type { Row } from "../../types";
import { PerfCell } from "../../parts/Cells";

export default function PerfTableDesktop({
  rows,
  nf2,
}: {
  rows: Row[];
  nf2: Intl.NumberFormat;
}) {
  return (
    <div className="space-y-2">
      {/* ヘッダ: sticky */}
      <div
        className="
          grid grid-cols-15 gap-4 px-4 py-3
          text-slate-400 text-sm font-medium
          border-b border-slate-700/50
          sticky top-0 z-20
          bg-slate-900/85 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60
        "
      >
        <div className="col-span-2">コード</div>
        <div className="col-span-4">銘柄名</div>
        <div className="col-span-1 text-right">1週</div>
        <div className="col-span-1 text-right">1ヶ月</div>
        <div className="col-span-1 text-right">3ヶ月</div>
        <div className="col-span-1 text-right">年初来</div>
        <div className="col-span-1 text-right">1年</div>
        <div className="col-span-1 text-right">3年</div>
        <div className="col-span-1 text-right">5年</div>
        <div className="col-span-2 text-right">全期間</div>
      </div>

      {rows.map((r) => (
        <Link
          key={r.ticker}
          href={`/${encodeURIComponent(r.ticker)}`}
          className="block premium-card rounded-xl border border-slate-700/50 hover:border-blue-500/50 hover:scale-[1.02] transition-all duration-200"
        >
          <div className="grid grid-cols-15 gap-4 px-4 py-4">
            <div className="col-span-2">
              <span className="text-white font-mono font-bold text-lg">
                {r.code}
              </span>
            </div>

            <div className="col-span-4">
              <h3 className="text-white font-bold text-base leading-tight hover:text-blue-300 transition-colors">
                {r.stock_name}
              </h3>
              <div className="text-slate-500 text-xs mt-0.5">
                {r.date ?? "—"}
              </div>
            </div>

            <div className="col-span-1 text-right">
              <PerfCell v={r.r_5d} nf2={nf2} />
            </div>
            <div className="col-span-1 text-right">
              <PerfCell v={r.r_1mo} nf2={nf2} />
            </div>
            <div className="col-span-1 text-right">
              <PerfCell v={r.r_3mo} nf2={nf2} />
            </div>
            <div className="col-span-1 text-right">
              <PerfCell v={r.r_ytd} nf2={nf2} />
            </div>
            <div className="col-span-1 text-right">
              <PerfCell v={r.r_1y} nf2={nf2} />
            </div>
            <div className="col-span-1 text-right">
              <PerfCell v={r.r_3y} nf2={nf2} />
            </div>
            <div className="col-span-1 text-right">
              <PerfCell v={r.r_5y} nf2={nf2} />
            </div>
            <div className="col-span-2 text-right">
              <PerfCell v={r.r_all} nf2={nf2} />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
