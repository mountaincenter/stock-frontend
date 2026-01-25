// app/[ticker]/FinancialsCard.tsx
"use client";

import * as React from "react";

interface FinancialData {
  ticker: string;
  fiscalPeriod: string | null;
  periodEnd: string | null;
  disclosureDate: string | null;
  sales: number | null;
  operatingProfit: number | null;
  ordinaryProfit: number | null;
  netProfit: number | null;
  eps: number | null;
  totalAssets: number | null;
  equity: number | null;
  equityRatio: number | null;
  bps: number | null;
  sharesOutstanding: number | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

function DataRow({
  label,
  value,
  unit = "",
  positive,
}: {
  label: string;
  value: string | number | null;
  unit?: string;
  positive?: boolean | null;
}) {
  const colorClass =
    positive === true
      ? "text-emerald-400"
      : positive === false
      ? "text-rose-400"
      : "text-foreground";

  return (
    <div className="flex justify-between items-center py-2 border-b border-border/20 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${colorClass}`}>
        {value != null ? `${value}${unit}` : "—"}
      </span>
    </div>
  );
}

export default function FinancialsCard({ ticker }: { ticker: string }) {
  const [data, setData] = React.useState<FinancialData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchFinancials() {
      try {
        const url = API_BASE
          ? `${API_BASE}/fins/summary/${ticker}`
          : `/api/fins/${ticker}`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = await res.json();
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch");
      } finally {
        setLoading(false);
      }
    }
    fetchFinancials();
  }, [ticker]);

  if (loading) {
    return (
      <section className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 md:p-6 shadow-xl shadow-black/5 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />
        <div className="relative animate-pulse">
          <div className="h-6 w-32 bg-muted/50 rounded mb-4" />
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-4 bg-muted/30 rounded" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 md:p-6 shadow-xl shadow-black/5 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />
        <div className="relative text-center text-muted-foreground text-sm py-8">
          財務データを取得できませんでした
        </div>
      </section>
    );
  }

  // 自己資本比率を%に変換（0.256 -> 25.6）
  const equityRatioPct = data.equityRatio != null ? data.equityRatio * 100 : null;

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 md:p-6 shadow-xl shadow-black/5 backdrop-blur-xl"
      aria-label="財務データ"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/30">
          <h2 className="text-lg font-semibold text-foreground">財務データ</h2>
          <div className="text-xs text-muted-foreground">
            {data.fiscalPeriod ?? "—"}
            {data.periodEnd && <span className="ml-2">期末: {data.periodEnd}</span>}
            {data.disclosureDate && <span className="ml-2">開示: {data.disclosureDate}</span>}
          </div>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 損益計算書 */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-emerald-400/80 font-medium mb-3">
              損益計算書
            </h3>
            <DataRow label="売上高" value={data.sales} unit="億円" />
            <DataRow
              label="営業利益"
              value={data.operatingProfit}
              unit="億円"
              positive={data.operatingProfit != null ? data.operatingProfit > 0 : null}
            />
            <DataRow
              label="経常利益"
              value={data.ordinaryProfit}
              unit="億円"
              positive={data.ordinaryProfit != null ? data.ordinaryProfit > 0 : null}
            />
            <DataRow
              label="純利益"
              value={data.netProfit}
              unit="億円"
              positive={data.netProfit != null ? data.netProfit > 0 : null}
            />
            <DataRow
              label="EPS"
              value={data.eps != null ? data.eps.toFixed(2) : null}
              unit="円"
            />
          </div>

          {/* 貸借対照表 */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-blue-400/80 font-medium mb-3">
              貸借対照表
            </h3>
            <DataRow label="総資産" value={data.totalAssets} unit="億円" />
            <DataRow label="純資産" value={data.equity} unit="億円" />
            <DataRow
              label="自己資本比率"
              value={equityRatioPct != null ? equityRatioPct.toFixed(1) : null}
              unit="%"
              positive={equityRatioPct != null ? equityRatioPct >= 40 : null}
            />
            <DataRow
              label="BPS"
              value={data.bps != null ? data.bps.toFixed(2) : null}
              unit="円"
            />
          </div>

          {/* バリュエーション */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-amber-400/80 font-medium mb-3">
              バリュエーション
            </h3>
            <DataRow
              label="発行済株式数"
              value={
                data.sharesOutstanding != null
                  ? (data.sharesOutstanding / 1000000).toFixed(2)
                  : null
              }
              unit="百万株"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-border/20">
          <p className="text-[9px] text-muted-foreground/50">データソース: J-Quants API</p>
        </div>
      </div>
    </section>
  );
}
