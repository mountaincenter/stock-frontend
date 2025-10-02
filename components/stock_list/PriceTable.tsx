// components/stock_list/PriceTable.tsx
import React from "react";
import Link from "next/link";
import type { Row } from "./types";
import { CloseCell, DiffBadge, NumCell } from "./Cells";

/**
 * 価格タブ（レスポンシブ対応）
 * - md以上: 既存の18列グリッドを踏襲
 * - sm: 1段目= 終値/前日差/前日差(%)、2段目= 出来高/出来高(10)
 * - 注意: 出来高の色付けは行わない（終値=無色、出来高=無色、diffのみ緑/赤）
 */
export function PriceTable({
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
      {/* ヘッダ: モバイルでは隠す */}
      <div
        className="
            hidden md:grid grid-cols-18 gap-4 px-4 py-3
            text-slate-400 text-sm font-medium
            border-b border-slate-700/50
            sticky top-0 z-20
            backdrop-blur
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
          isFinite(r.diff) &&
          isFinite(r.prevClose) &&
          r.prevClose !== 0
            ? (r.diff / r.prevClose) * 100
            : null;

        return (
          <Link
            key={r.ticker}
            href={`/${encodeURIComponent(r.ticker)}`}
            className="block premium-card rounded-xl border border-slate-700/50 hover:border-blue-500/50 hover:scale-[1.02] transition-all duration-200"
          >
            {/* md以上: 従来の行グリッド */}
            <div className="hidden md:grid grid-cols-18 gap-4 px-4 py-4">
              <div className="col-span-2">
                <span className="text-white font-mono font-bold text-lg">
                  {r.code}
                </span>
              </div>
              <div className="col-span-6">
                <h3 className=" font-bold text-base leading-tight transition-colors">
                  {r.stock_name}
                </h3>
                <div className="text-xs mt-0.5">{r.date ?? "—"}</div>
              </div>
              <div className="col-span-2">
                <CloseCell v={r.close} nf0={nf0} />
              </div>
              <div className="col-span-2 text-right">
                {/* diff は数値のみ（%は表示しない） */}
                <DiffBadge
                  diff={r.diff}
                  base={r.prevClose}
                  nf0={nf0}
                  nf2={nf2}
                />
              </div>
              <div className="col-span-2 text-right">
                {pct == null || !isFinite(pct) ? (
                  <span>―</span>
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
              </div>
              <div className="col-span-2 ">
                <NumCell v={r.volume} nf0={nf0} />
              </div>
              <div className="col-span-2 text-right text-white">
                <NumCell v={r.vol_ma10} nf0={nf0} />
              </div>
            </div>

            {/* sm: カード型（指定の並び） */}
            <div className="md:hidden px-4 py-4 space-y-3">
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
                  {/* diff は数値のみ（%は表示しない） */}
                  <DiffBadge
                    diff={r.diff}
                    base={r.prevClose}
                    nf0={nf0}
                    nf2={nf2}
                  />
                </Metric>

                <Metric label="前日差(%)">
                  {pct == null || !isFinite(pct) ? (
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

              {/* 2段目: 出来高 / 出来高(10)（無色に戻す） */}
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

/** モバイル用のラベル付きミニセル */
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
