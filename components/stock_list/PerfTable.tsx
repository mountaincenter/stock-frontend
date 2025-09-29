// components/stock_list/PerfTable.tsx
import React from "react";
import Link from "next/link";
import type { Row } from "./types";
import { PerfCell } from "./Cells";

/**
 * パフォーマンス（レスポンシブ対応）
 * - md以上: 既存の14列グリッド
 * - sm: 指標を2行×4列程度のカードで詰めて表示
 */
export function PerfTable({
  rows,
  nf2,
}: {
  rows: Row[];
  nf2: Intl.NumberFormat;
}) {
  return (
    <div className="space-y-2">
      {/* ヘッダ: モバイルでは非表示 */}
      <div className="hidden md:grid grid-cols-14 gap-4 px-4 py-3 text-slate-400 text-sm font-medium border-b border-slate-700/50">
        <div className="col-span-2">コード</div>
        <div className="col-span-4">銘柄名</div>
        <div className="col-span-1 text-right">1週</div>
        <div className="col-span-1 text-right">1ヶ月</div>
        <div className="col-span-1 text-right">3ヶ月</div>
        <div className="col-span-1 text-right">年初来</div>
        <div className="col-span-1 text-right">1年</div>
        <div className="col-span-1 text-right">5年</div>
        <div className="col-span-2 text-right">全期間</div>
      </div>

      {rows.map((r) => (
        <Link
          key={r.ticker}
          href={`/${encodeURIComponent(r.ticker)}`}
          className="block premium-card rounded-xl border border-slate-700/50 hover:border-blue-500/50 hover:scale-[1.02] transition-all duration-200"
        >
          {/* md+: 既存の行グリッド */}
          <div className="hidden md:grid grid-cols-14 gap-4 px-4 py-4">
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
              <PerfCell v={r.r_5y} nf2={nf2} />
            </div>
            <div className="col-span-2 text-right">
              <PerfCell v={r.r_all} nf2={nf2} />
            </div>
          </div>

          {/* sm: カード型 */}
          <div className="md:hidden px-4 py-4 space-y-3">
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

/** ラベル付き小セル（モバイル用） */
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
        {/* PerfCell を直接使うと余白が詰まりやすいのでここで簡易表示 */}
        {v == null || !isFinite(v) ? (
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
