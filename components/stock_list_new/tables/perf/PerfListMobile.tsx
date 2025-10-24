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
    <div className="space-y-1">
      {rows.map((r) => (
        <Link
          key={r.ticker}
          href={`/${encodeURIComponent(r.ticker)}`}
          className="
            inline-block w-full rounded-lg
            bg-card
            hover:shadow-lg hover:shadow-primary/5 active:bg-muted/60
            transition-all duration-150
            touch-manipulation
          "
        >
          <div className="px-2 py-1.5">
            {/* 見出し：銘柄名 + コード/日付（PriceListMobile と同サイズ/トーン） */}
            <div className="min-w-0 text-left">
              <h3
                className="
                  font-semibold leading-tight text-card-foreground
                  [font-size:clamp(12px,3.8vw,15px)]
                  line-clamp-1
                "
                title={r.stock_name}
              >
                {r.stock_name}
              </h3>
              {/* ★ 金融向け：サンセリフ＋タビュラー */}
              <div className="mt-0.5 text-[11px] text-muted-foreground font-sans tabular-nums">
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
      <div className="text-[11px] text-muted-foreground">{label}</div>
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
        fixedWidthCh={7} // "+12.3%" 程度を7chで揃える（モバイルで詰める）
        className="text-[14px] font-semibold inline-block"
      />
    </div>
  );
}
