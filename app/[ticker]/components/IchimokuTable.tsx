// app/[ticker]/components/IchimokuTable.tsx
import React from "react";
import IndicatorRow from "./IndicatorRow";
import { formatNumber, nf0, toneBySign, na } from "../lib/tech-helpers";
import { judgeIchiCloud, judgeIchiTK, judgeIchiLag } from "../lib/technical-analysis";
import type { IchimokuDetail } from "../lib/types";

interface IchimokuTableProps {
  ichi: IchimokuDetail | null;
}

export default function IchimokuTable({ ichi }: IchimokuTableProps) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/40">
      <div className="px-3 py-2.5 text-sm font-bold border-b border-border/30">
        一目均衡表（9,26,52）
      </div>
      <table className="w-full text-sm leading-6 border-separate border-spacing-y-1">
        <thead>
          <tr className="text-xs font-semibold text-muted-foreground/80">
            <th className="text-left px-2 py-1.5">指標</th>
            <th className="text-right px-2 py-1.5">現在値</th>
            <th className="text-right px-2 py-1.5">閾値</th>
            <th className="text-right px-2 py-1.5">乖離</th>
            <th className="text-center px-2 py-1.5">判定</th>
          </tr>
        </thead>
        <tbody>
          {ichi ? (
            <>
              <IndicatorRow
                name="価格 vs 雲"
                currentValue={formatNumber(ichi.lastClose, nf0)}
                threshold={`雲 ${formatNumber(ichi.cloudBot, nf0)}〜${formatNumber(ichi.cloudTop, nf0)}`}
                delta={(() => {
                  if (na(ichi.lastClose) || na(ichi.cloudTop) || na(ichi.cloudBot)) return "データなし";
                  const last = ichi.lastClose!;
                  const top = ichi.cloudTop!;
                  const bot = ichi.cloudBot!;
                  const d = last > top ? last - top : last < bot ? last - bot : 0;
                  return nf0.format(d);
                })()}
                deltaClassName={toneBySign(
                  (() => {
                    if (na(ichi.lastClose) || na(ichi.cloudTop) || na(ichi.cloudBot)) return null;
                    const last = ichi.lastClose!;
                    const top = ichi.cloudTop!;
                    const bot = ichi.cloudBot!;
                    if (last > top) return last - top;
                    if (last < bot) return last - bot;
                    return 0;
                  })()
                )}
                action={judgeIchiCloud(ichi.lastClose, ichi.cloudTop, ichi.cloudBot)}
              />
              <IndicatorRow
                name="転換線 vs 基準線"
                currentValue={formatNumber(ichi.tenkan, nf0)}
                threshold={`基準 ${formatNumber(ichi.kijun, nf0)}`}
                delta={na(ichi.tenkan) || na(ichi.kijun) ? "データなし" : nf0.format(ichi.tenkan! - ichi.kijun!)}
                deltaClassName={toneBySign(na(ichi.tenkan) || na(ichi.kijun) ? null : ichi.tenkan! - ichi.kijun!)}
                action={judgeIchiTK(ichi.tenkan, ichi.kijun)}
              />
              <IndicatorRow
                name="遅行スパン vs 価格"
                currentValue={formatNumber(ichi.chikou, nf0)}
                threshold={`価格 ${formatNumber(ichi.lastClose, nf0)}`}
                delta={na(ichi.chikou) || na(ichi.lastClose) ? "データなし" : nf0.format(ichi.chikou! - ichi.lastClose!)}
                deltaClassName={toneBySign(na(ichi.chikou) || na(ichi.lastClose) ? null : ichi.chikou! - ichi.lastClose!)}
                action={judgeIchiLag(ichi.chikou, ichi.lastClose)}
              />
            </>
          ) : (
            <tr className="bg-card/60">
              <td className="px-2 py-2 text-center" colSpan={5}>
                データなし
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
