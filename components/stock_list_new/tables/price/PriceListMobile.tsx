"use client";

import * as React from "react";
import Link from "next/link";
import type { Row } from "../../types";
import { CloseCell, DiffBadge, NumCell } from "../../parts/Cells";

export default function PriceListMobile({
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

              {/* 1段目: 終値 / 前日差 / 前日差(%) */}
              <div className="grid grid-cols-3 gap-3">
                <Metric label="終値">
                  <CloseCell v={r.close} nf0={nf0} />
                </Metric>

                <Metric label="前日差">
                  <DiffBadge diff={r.diff} nf0={nf0} />
                </Metric>

                <Metric label="前日差(%)">
                  {pct == null || !Number.isFinite(pct) ? (
                    <span className="text-slate-400">―</span>
                  ) : (
                    <span
                      className={
                        pct > 0
                          ? "text-emerald-300"
                          : pct < 0
                          ? "text-rose-300"
                          : "text-slate-300"
                      }
                    >
                      {pct > 0 ? "+" : ""}
                      {nf2.format(pct)}%
                    </span>
                  )}
                </Metric>
              </div>

              {/* 2段目: 出来高 / 出来高(10) */}
              <div className="grid grid-cols-2 gap-3">
                <Metric label="出来高">
                  <span className="text-white">
                    <NumCell v={r.volume} nf0={nf0} />
                  </span>
                </Metric>
                <Metric label="出来高(10)">
                  <span className="text-white">
                    <NumCell v={r.vol_ma10} nf0={nf0} />
                  </span>
                </Metric>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function Metric({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="text-right">
      <div className="text-slate-400 text-[11px]">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}
