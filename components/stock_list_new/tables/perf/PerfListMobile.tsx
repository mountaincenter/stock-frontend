// components/stock_list_new/tables/perf/PerfListMobile.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import type { Row } from "../../types";
import { PerfCell } from "../../parts/Cells";

type Props = {
  rows: Row[];
  nf2: Intl.NumberFormat; // 互換のために残す（smart=trueでは未使用）
};

export default function PerfListMobile({ rows }: Props) {
  return (
    <div className="space-y-2">
      {rows.map((r) => (
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
            {/* 見出し：銘柄名 + コード/日付（PriceListMobile と同サイズ/トーン） */}
            <div className="min-w-0 text-left">
              <h3
                className="
                  text-slate-50 font-semibold leading-tight
                  [font-size:clamp(14px,4.2vw,18px)]
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

            {/* 上段：1週 / 1ヶ月 / 3ヶ月 / 年初来 */}
            <div className="mt-2 grid grid-cols-4 gap-x-3 gap-y-1">
              <Kpi label="1週" v={r.r_5d} />
              <Kpi label="1ヶ月" v={r.r_1mo} />
              <Kpi label="3ヶ月" v={r.r_3mo} />
              <Kpi label="年初来" v={r.r_ytd} />
            </div>

            {/* 下段：1年 / 5年 / 全期間 */}
            <div className="mt-1 grid grid-cols-4 gap-x-3 gap-y-1">
              <Kpi label="1年" v={r.r_1y} />
              <Kpi label="3年" v={r.r_3y} />
              <Kpi label="5年" v={r.r_5y} />
              <Kpi label="全期間" v={r.r_all} />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

/* 小コンポーネント：明るめトーン + 賢い丸め + 桁揃え */
function Kpi({ label, v }: { label: string; v: number | null }) {
  return (
    <div className="text-right">
      <div className="text-[11px] text-slate-400">{label}</div>
      <PerfCell
        v={v}
        // nf2 は型互換のために渡すが、smart=true では未使用
        nf2={
          new Intl.NumberFormat("ja-JP", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        }
        smart={true} // 10%以上0桁, 1%以上1桁, それ未満2桁
        fixedWidthCh={7} // “+12.3%” 程度を7chで揃える（モバイルで詰める）
        className="text-[14px] font-semibold inline-block"
      />
    </div>
  );
}
