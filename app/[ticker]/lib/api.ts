// app/[ticker]/lib/api.ts
import { buildApiUrl } from "@/lib/api-base";
import type { DecisionItem, PriceRow } from "./types";

export async function fetchDecisionV2(
  ticker: string
): Promise<DecisionItem | null> {
  const candidates = [
    buildApiUrl(`/tech/decision?ticker=${encodeURIComponent(ticker)}`),
  ];

  for (const url of candidates) {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) continue;
      const d = (await r.json()) as unknown;
      if (
        typeof d === "object" &&
        d !== null &&
        typeof (d as Record<string, unknown>).ticker === "string" &&
        typeof (d as Record<string, unknown>).date === "string"
      ) {
        return d as DecisionItem;
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}

export async function fetchPrices1d(ticker: string): Promise<PriceRow[]> {
  const candidates = [
    buildApiUrl(`/prices/1d?ticker=${encodeURIComponent(ticker)}`),
  ];

  for (const url of candidates) {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) continue;
      const rows = (await r.json()) as PriceRow[];
      return rows.filter(
        (x) =>
          Number.isFinite(x.Open) &&
          Number.isFinite(x.High) &&
          Number.isFinite(x.Low) &&
          Number.isFinite(x.Close)
      );
    } catch {
      // try next candidate
    }
  }
  return [];
}
