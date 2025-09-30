"use client";

import * as React from "react";
import Link from "next/link";
import type { Row } from "../../types";

export default function PerfListMobile({
  rows,
  nf2,
}: {
  rows: Row[];
  nf2: Intl.NumberFormat;
}) {
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <Link
          key={r.ticker}
          href={`/${encodeURIComponent(r.ticker)}`}
          className="block premium-card rounded-xl border border-slate-700/50 hover:border-blue-500/50 hover:scale-[1.02] transition-all duration-200"
        >
          <div className="px-4 py-4 space-y-3">
            {/* 上部：銘柄基本情報 */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono font-bold text-base">
                    {r.code}
                  </span>
                  <span className="text-slate-500 text-xs">
                    {r.date ?? "—"}
                  </span>
                </div>
                <h3 className="text-white font-semibold text-sm leading-tight mt-0.5 line-clamp-2">
                  {r.stock_name}
                </h3>
              </div>
            </div>

            {/* 指標グリッド */}
            <div className="grid grid-cols-2 gap-3">
              <L v={r.r_5d} label="1週" nf2={nf2} />
              <L v={r.r_1mo} label="1ヶ月" nf2={nf2} />
              <L v={r.r_3mo} label="3ヶ月" nf2={nf2} />
              <L v={r.r_ytd} label="年初来" nf2={nf2} />
              <L v={r.r_1y} label="1年" nf2={nf2} />
              <L v={r.r_5y} label="5年" nf2={nf2} />
              <L v={r.r_all} label="全期間" nf2={nf2} />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function L({
  v,
  label,
  nf2,
}: {
  v: number | null;
  label: string;
  nf2: Intl.NumberFormat;
}) {
  return (
    <div className="text-right">
      <div className="text-slate-400 text-[11px]">{label}</div>
      <div className="text-sm">
        {v == null || !Number.isFinite(v) ? (
          <span className="text-slate-400">—</span>
        ) : (
          <span
            className={
              v > 0
                ? "text-emerald-300"
                : v < 0
                ? "text-rose-300"
                : "text-slate-300"
            }
          >
            {v > 0 ? "+" : ""}
            {nf2.format(v)}%
          </span>
        )}
      </div>
    </div>
  );
}
