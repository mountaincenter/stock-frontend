"use client";

import { useEffect, useMemo, useState } from "react";
import Plot from "react-plotly.js";

// shadcn/ui の Table（導入済み前提）
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type MetaItem = {
  code: string;
  stock_name: string;
  ticker: string;
};

export default function Care30Table() {
  const [data, setData] = useState<MetaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL!;
    const url = `${base}/core30/meta`;
    (async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const json: MetaItem[] = await res.json();
        setData(json);
      } catch (e: any) {
        setErr(e?.message ?? "fetch error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Plotly Table 用データ（列ごとに配列）
  const plotly = useMemo(() => {
    const codes = data.map((r) => r.code);
    const tickers = data.map((r) => r.ticker);
    const names = data.map((r) => r.stock_name);

    return {
      data: [
        {
          type: "table",
          header: {
            values: ["<b>Code</b>", "<b>Ticker</b>", "<b>名称</b>"],
            align: "left",
            fill: { color: "#f4f4f5" }, // 既定色でもOK（未指定でも可）
            height: 28,
          },
          cells: {
            values: [codes, tickers, names],
            align: "left",
            height: 24,
          },
          columnwidth: [80, 120, 300],
        } as Partial<Plotly.TableData>,
      ],
      layout: {
        title: "Core30（Plotly Table）",
        margin: { t: 40, r: 10, b: 10, l: 10 },
        height: 520,
      } as Partial<Plotly.Layout>,
      config: { displayModeBar: false },
    };
  }, [data]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4">
      {/* 左：shadcn/ui Table */}
      <div className="border rounded-xl p-4">
        <h2 className="text-xl font-semibold mb-3">
          Core30（shadcn/ui Table）
        </h2>
        {loading ? (
          <div className="text-sm text-muted-foreground">読み込み中…</div>
        ) : err ? (
          <div className="text-sm text-red-500">エラー: {err}</div>
        ) : (
          <div className="overflow-auto max-h-[70vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Code</TableHead>
                  <TableHead className="w-[160px]">Ticker</TableHead>
                  <TableHead>名称</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.ticker}>
                    <TableCell className="font-mono">{row.code}</TableCell>
                    <TableCell className="font-mono">{row.ticker}</TableCell>
                    <TableCell>{row.stock_name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* 右：Plotly Table */}
      <div className="border rounded-xl p-4">
        <h2 className="text-xl font-semibold mb-3">Core30（Plotly Table）</h2>
        {loading ? (
          <div className="text-sm text-muted-foreground">読み込み中…</div>
        ) : err ? (
          <div className="text-sm text-red-500">エラー: {err}</div>
        ) : (
          <Plot
            data={plotly.data as any}
            layout={plotly.layout as any}
            config={plotly.config as any}
            style={{ width: "100%", height: 520 }}
            useResizeHandler
          />
        )}
      </div>
    </div>
  );
}
