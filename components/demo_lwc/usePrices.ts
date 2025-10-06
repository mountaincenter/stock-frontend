"use client";

import { useEffect, useState } from "react";
import type { PriceRow, RangeKey } from "./types";
import { rangeConfig } from "./range-config";

/** データ取得とソートのみ（SRP） */
export function usePrices(range: RangeKey) {
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [footnote, setFootnote] = useState<string>("");

  useEffect(() => {
    const { url, start, end, label } = rangeConfig(range);
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        if (start) url.searchParams.set("start", start);
        url.searchParams.set("end", end);

        const r = await fetch(url.toString(), { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j: PriceRow[] = await r.json();

        j.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
        setRows(j);
        setFootnote(label);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "fetch error");
        setRows([]);
        setFootnote("");
      } finally {
        setLoading(false);
      }
    })();
  }, [range]);

  return { rows, loading, err, footnote };
}
