// app/[ticker]/VolatilityCard.tsx
import * as React from "react";

type Meta = { code: string; stock_name: string; ticker: string };
type Snapshot = {
  ticker: string;
  date: string | null;
  close: number | null;
  prevClose: number | null;
  diff: number | null;
  volume?: number | null;
  vol_ma10?: number | null;
  tr?: number | null;
  tr_pct?: number | null;
  atr14?: number | null;
  atr14_pct?: number | null;
};

function fmtNum(
  v: number | null | undefined,
  nf = new Intl.NumberFormat("ja-JP")
) {
  return typeof v === "number" && Number.isFinite(v) ? nf.format(v) : "―";
}

export default function VolatilityCard({
  meta,
  snap,
  nf0,
  nf2,
}: {
  meta: Meta;
  snap: Snapshot | null;
  nf0?: Intl.NumberFormat;
  nf2?: Intl.NumberFormat;
}) {
  const _nf0 =
    nf0 ??
    new Intl.NumberFormat("ja-JP", {
      maximumFractionDigits: 0,
    });
  const _nf2 =
    nf2 ??
    new Intl.NumberFormat("ja-JP", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const pct =
    snap?.diff != null &&
    snap?.prevClose != null &&
    Number.isFinite(snap.diff) &&
    Number.isFinite(snap.prevClose) &&
    snap.prevClose !== 0
      ? (snap.diff / snap.prevClose) * 100
      : null;

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      {/* 先頭3列相当: コード / 銘柄名 / 日付 */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="font-sans tabular-nums text-base font-semibold">
            {meta.code}
          </div>
          <div className="mt-0.5 text-sm font-semibold leading-tight line-clamp-1">
            {meta.stock_name}
          </div>
        </div>
        <div className="text-[12px] font-sans tabular-nums text-muted-foreground">
          {snap?.date ?? "—"}
        </div>
      </div>

      {/* 値とボラティリティ指標（PriceTableDesktop と同順） */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {/* 終値 */}
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">終値</span>
          <span className="text-right font-sans tabular-nums text-sm">
            {fmtNum(snap?.close, _nf0)}
          </span>
        </div>

        {/* 前日差 */}
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">前日差</span>
          <span
            className={
              (snap?.diff == null || !Number.isFinite(snap.diff)
                ? "text-muted-foreground"
                : snap.diff > 0
                ? "text-emerald-400"
                : snap.diff < 0
                ? "text-rose-400"
                : "text-muted-foreground") +
              " text-right font-sans tabular-nums text-sm"
            }
          >
            {snap?.diff != null && Number.isFinite(snap.diff) && snap.diff > 0
              ? "+"
              : ""}
            {fmtNum(snap?.diff, _nf0)}
          </span>
        </div>

        {/* 前日差(%) */}
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">前日差(%)</span>
          {pct == null || !Number.isFinite(pct) ? (
            <span className="text-right text-sm text-muted-foreground">―</span>
          ) : (
            <span
              className={
                (pct > 0
                  ? "text-emerald-300"
                  : pct < 0
                  ? "text-rose-300"
                  : "text-muted-foreground") +
                " text-right font-sans tabular-nums text-sm"
              }
            >
              {pct > 0 ? "+" : ""}
              {_nf2.format(pct)}%
            </span>
          )}
        </div>

        {/* TR */}
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">TR</span>
          <span className="text-right font-sans tabular-nums text-sm">
            {snap?.tr == null || !Number.isFinite(snap.tr)
              ? "―"
              : _nf2.format(snap.tr)}
          </span>
        </div>

        {/* TR(%) */}
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">TR(%)</span>
          <span className="text-right font-sans tabular-nums text-sm">
            {snap?.tr_pct == null || !Number.isFinite(snap.tr_pct)
              ? "―"
              : _nf2.format(snap.tr_pct) + "%"}
          </span>
        </div>

        {/* ATR14 */}
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">ATR14</span>
          <span className="text-right font-sans tabular-nums text-sm">
            {snap?.atr14 == null || !Number.isFinite(snap.atr14)
              ? "―"
              : _nf2.format(snap.atr14)}
          </span>
        </div>

        {/* ATR14(%) */}
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">ATR14(%)</span>
          <span className="text-right font-sans tabular-nums text-sm">
            {snap?.atr14_pct == null || !Number.isFinite(snap.atr14_pct)
              ? "―"
              : _nf2.format(snap.atr14_pct) + "%"}
          </span>
        </div>

        {/* 出来高 */}
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">出来高</span>
          <span className="text-right font-sans tabular-nums text-sm">
            {fmtNum(snap?.volume, _nf0)}
          </span>
        </div>

        {/* 出来高(10) */}
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">出来高(10)</span>
          <span className="text-right font-sans tabular-nums text-sm">
            {fmtNum(snap?.vol_ma10, _nf0)}
          </span>
        </div>
      </div>

      {/* 参考: 前日終値 */}
      <div className="mt-3 text-[11px] text-muted-foreground font-sans tabular-nums">
        前日終値: {fmtNum(snap?.prevClose, _nf0)}
      </div>
    </div>
  );
}
