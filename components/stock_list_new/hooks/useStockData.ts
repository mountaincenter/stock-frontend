// components/stock_list_new/hooks/useStockData.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  FetchState,
  Props,
  Row,
  TechCoreRow,
} from "../types";
import { canonicalizeTag } from "@/lib/tag-utils";

const uniqueByTicker = <T extends { ticker?: string }>(items: T[]): T[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const ticker = item.ticker ? String(item.ticker) : "";
    if (!ticker) return false;
    if (seen.has(ticker)) return false;
    seen.add(ticker);
    return true;
  });
};

/**
 * 統合エンドポイント /stocks/enriched を使用
 * - 1回のAPIコールで全データ取得（メタ + 価格 + テクニカル + パフォーマンス）
 * - スパゲッティコード削減とパフォーマンス向上
 */
export function useStockData({
  apiBase,
  initialMeta,
  initialSnapshot,
  initialPerf,
  initialTag,
  tag,
}: Props & { tag: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<FetchState>("idle");

  // techRowsは/stocks/enrichedに統合されたため、互換性のために空配列を返す
  const [techRows] = useState<TechCoreRow[]>([]);
  const [techStatus] = useState<FetchState>("success");

  const base = useMemo(
    () => {
      const raw = apiBase ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
      if (!raw) return "";
      return raw.endsWith("/") ? raw.slice(0, -1) : raw;
    },
    [apiBase]
  );

  // フォーマッタ（UI へ渡す）
  const nf0 = useMemo(
    () => new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 }),
    []
  );
  const nf2 = useMemo(
    () =>
      new Intl.NumberFormat("ja-JP", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );

  /* ========== 統合データ取得 (/stocks/enriched) ========== */
  useEffect(() => {
    // SSR水和は現在未使用（将来の拡張用に残す）
    // 全てのデータを /stocks/enriched から取得する統一アプローチ

    let mounted = true;
    const ac = new AbortController();

    (async () => {
      try {
        console.log(`[useStockData] Starting fetch for tag: "${tag}"`);
        setStatus("loading");
        if (mounted) setRows([]);

        const normalizedTag = (tag ?? "").trim();
        const lowerTag = normalizedTag.toLowerCase();
        const isAll = lowerTag === "all" || lowerTag === "全て";
        const canonical = canonicalizeTag(normalizedTag);
        const queryTag = isAll
          ? undefined
          : canonical ?? (normalizedTag ? normalizedTag : undefined);

        console.log(`[useStockData] Computed - normalizedTag: "${normalizedTag}", canonical: "${canonical}", queryTag: "${queryTag}"`);

        const join = (path: string) => {
          if (!base) return path;
          if (path.startsWith("/")) return `${base}${path}`;
          return `${base}/${path}`;
        };

        const buildUrl = (
          path: string,
          params: Record<string, string | undefined> = {}
        ) => {
          const search = new URLSearchParams();
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== "") {
              search.set(key, value);
            }
          });
          const qs = search.toString();
          return `${path}${qs ? `?${qs}` : ""}`;
        };

        const fetchJsonWithFallback = async <T,>(
          urls: string[],
          {
            throwOnFailure = true,
            fallbackValue,
            context,
          }: {
            throwOnFailure?: boolean;
            fallbackValue?: T;
            context?: string;
          } = {}
        ): Promise<T> => {
          let lastError: unknown;
          let only404 = true;
          for (const url of urls) {
            try {
              console.log(`[useStockData${context ? `/${context}` : ""}] Fetching: ${url}`);
              const res = await fetch(url, {
                signal: ac.signal,
              });
              if (!res.ok) {
                const errorMsg = `HTTP ${res.status} for ${url}`;
                console.warn(`[useStockData${context ? `/${context}` : ""}] ${errorMsg}`);
                lastError = new Error(errorMsg);
                if (res.status !== 404) {
                  only404 = false;
                }
                continue;
              }
              console.log(`[useStockData${context ? `/${context}` : ""}] Success: ${url}`);
              return (await res.json()) as T;
            } catch (err) {
              if (err instanceof DOMException && err.name === "AbortError") {
                throw err;
              }
              console.error(`[useStockData${context ? `/${context}` : ""}] Fetch error for ${url}:`, err);
              lastError = err;
              only404 = false;
            }
          }
          if (throwOnFailure) {
            console.error(`[useStockData${context ? `/${context}` : ""}] All attempts failed:`, lastError);
            throw lastError ?? new Error("All fetch attempts failed");
          }
          if (!only404) {
            if (context) {
              console.warn(`[useStockData] Fallback applied for ${context}:`, lastError);
            } else {
              console.warn("[useStockData] Fallback applied:", lastError);
            }
          }
          return fallbackValue as T;
        };

        // 全タグで /stocks/enriched を使用（1回のAPIコールで全データ取得）
        const enrichedCandidates = [
          join(buildUrl("/stocks/enriched", { tag: queryTag })),
        ];
        const enrichedData = await fetchJsonWithFallback<Row[]>(enrichedCandidates, {
          throwOnFailure: false,
          fallbackValue: [],
          context: "stocks/enriched",
        });

        console.log(`[useStockData] Fetch completed - ${enrichedData.length} rows for tag "${queryTag}"`);

        if (mounted) {
          setRows(uniqueByTicker(enrichedData));
          setStatus("success");
        }
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError")) {
          console.error(e);
          if (mounted) setStatus("error");
        }
      }
    })();

    return () => {
      mounted = false;
      ac.abort();
    };
  }, [base, tag]);

  return { rows, status, nf0, nf2, techRows, techStatus };
}
