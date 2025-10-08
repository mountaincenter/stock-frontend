// components/stock_list_new/hooks/useStockData.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  FetchState,
  Props,
  Row,
  StockMeta,
  SnapshotRow,
  PerfRow,
  TechCoreRow,
} from "../types";
import {
  isDecisionArray,
  mapDecisionSnapshotToTechRows,
} from "../utils/tech_v2";
import {
  filterMetaByTag,
  pickAllowedTickers,
  canonicalizeTag,
} from "@/lib/tag-utils";

const DEFAULT_RETURN_WINDOWS = "5d,1mo,3mo,ytd,1y,3y,5y,all";

function mergeRows(
  meta: StockMeta[],
  snapshot: SnapshotRow[],
  perf: PerfRow[]
): Row[] {
  const snapMap = new Map(snapshot.map((s) => [s.ticker, s]));
  const perfMap = new Map(perf.map((p) => [p.ticker, p]));
  return meta.map((m) => {
    const s = snapMap.get(m.ticker);
    const p = perfMap.get(m.ticker) as PerfRow | undefined;
    return {
      ...m,
      date: (s?.date as string) ?? (p?.date as string) ?? null,
      close: (s?.close as number) ?? null,
      prevClose: (s?.prevClose as number) ?? null,
      diff: (s?.diff as number) ?? null,
      volume: (s?.volume as number) ?? null,
      vol_ma10: (s?.vol_ma10 as number) ?? null,
      tr: (s?.["tr"] as number) ?? null,
      tr_pct: (s?.["tr_pct"] as number) ?? null,
      atr14: (s?.["atr14"] as number) ?? null,
      atr14_pct: (s?.["atr14_pct"] as number) ?? null,
      r_5d: (p?.["r_5d"] as number) ?? null,
      r_1mo: (p?.["r_1mo"] as number) ?? null,
      r_3mo: (p?.["r_3mo"] as number) ?? null,
      r_ytd: (p?.["r_ytd"] as number) ?? null,
      r_1y: (p?.["r_1y"] as number) ?? null,
      r_3y: (p?.["r_3y"] as number) ?? null,
      r_5y: (p?.["r_5y"] as number) ?? null,
      r_all: (p?.["r_all"] as number) ?? null,
    };
  });
}

/**
 * 役割分離（SRP）
 * - 価格/パフォーマンス: meta + snapshot + returns
 * - テクニカル: v2 decision/snapshot を TechCoreRow[] に変換
 * 型・バリデーション・マッピングは utils/tech_v2 に集約（DRY）
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

  const [techRows, setTechRows] = useState<TechCoreRow[]>([]);
  const [techStatus, setTechStatus] = useState<FetchState>("idle");

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

  /* ========== 価格/スナップショット/パフォーマンス ========== */
  useEffect(() => {
    // initial* からの水和（SSR/SSG → CSR）
    const hydrateFromInitial = () => {
      if (!initialMeta || !initialSnapshot || !initialPerf) return false;
      const normalizedTag = (tag ?? "").trim().toLowerCase();
      const normalizedInitial = (initialTag ?? "").trim().toLowerCase();
      if (normalizedInitial) {
        if (normalizedTag !== normalizedInitial) return false;
      } else if (normalizedTag) {
        return false;
      }
      const hydrateTarget = tag ?? initialTag;
      const hydrateCanonical = canonicalizeTag(hydrateTarget);
      const preparedMeta = filterMetaByTag(initialMeta, hydrateTarget, {
        allowMissingTagInfo: hydrateCanonical === "TOPIX_CORE30",
      });
      setRows(mergeRows(preparedMeta, initialSnapshot, initialPerf));
      setStatus("success");
      return true;
    };

    if (hydrateFromInitial()) return;

    let mounted = true;
    const ac = new AbortController();

    (async () => {
      try {
        setStatus("loading");
        if (mounted) setRows([]);

        const normalizedTag = (tag ?? "").trim();
        const canonical = canonicalizeTag(normalizedTag);
        const queryTag = normalizedTag || canonical || undefined;

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
              const res = await fetch(url, {
                cache: "no-store",
                signal: ac.signal,
              });
              if (!res.ok) {
                lastError = new Error(`HTTP ${res.status} for ${url}`);
                if (res.status !== 404) {
                  only404 = false;
                }
                continue;
              }
              return (await res.json()) as T;
            } catch (err) {
              if (err instanceof DOMException && err.name === "AbortError") {
                throw err;
              }
              lastError = err;
              only404 = false;
            }
          }
          if (throwOnFailure) {
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

        const metaCandidates = [
          join(buildUrl("/stocks", { tag: queryTag })),
          join(buildUrl("/meta", { tag: queryTag })),
        ];

        const snapshotCandidates = [
          join(buildUrl("/prices/snapshot/last2", { tag: queryTag })),
        ];

        const perfCandidates = [
          join(
            buildUrl("/perf/returns", {
              tag: queryTag,
              windows: DEFAULT_RETURN_WINDOWS,
            })
          ),
          join(
            buildUrl("/prices/perf/returns", {
              tag: queryTag,
              windows: DEFAULT_RETURN_WINDOWS,
            })
          ),
        ];

        let meta = await fetchJsonWithFallback<StockMeta[]>(metaCandidates, {
          throwOnFailure: false,
          fallbackValue: [],
          context: "meta",
        });
        if ((meta?.length ?? 0) === 0 && queryTag) {
          const unfilteredCandidates = [
            join(buildUrl("/stocks")),
            join(buildUrl("/meta")),
          ];
          const unfiltered = await fetchJsonWithFallback<StockMeta[]>(
            unfilteredCandidates,
            {
              throwOnFailure: false,
              fallbackValue: [],
              context: "meta(unfiltered)",
            }
          );
          if (unfiltered.length > 0) {
            meta = filterMetaByTag(unfiltered, queryTag, {
              allowMissingTagInfo: canonical === "TOPIX_CORE30",
            });
          }
        }
        const [snapshot, perf] = await Promise.all([
          fetchJsonWithFallback<SnapshotRow[]>(snapshotCandidates, {
            throwOnFailure: false,
            fallbackValue: [],
            context: "snapshot",
          }),
          fetchJsonWithFallback<PerfRow[]>(perfCandidates, {
            throwOnFailure: false,
            fallbackValue: [],
            context: "performance",
          }),
        ]);

        const preparedMeta = filterMetaByTag(meta, queryTag, {
          allowMissingTagInfo: canonical === "TOPIX_CORE30",
        });
        const allowedTickers = pickAllowedTickers(preparedMeta);
        const filteredSnapshot =
          snapshot?.filter((s) => allowedTickers.has(s.ticker)) ?? [];
        const filteredPerf =
          perf?.filter((p) => allowedTickers.has(p.ticker)) ?? [];
        const merged = mergeRows(preparedMeta, filteredSnapshot, filteredPerf);

        if (mounted) {
          setRows(merged);
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
  }, [base, initialMeta, initialPerf, initialSnapshot, initialTag, tag]);

  /* ========== テクニカル（v2 decision/snapshot） ========== */
  useEffect(() => {
    let mounted = true;
    const ac = new AbortController();

    (async () => {
      try {
        if (!base) {
          setTechStatus("error");
          return;
        }
        setTechStatus("loading");
        if (mounted) setTechRows([]);

        const normalizedTag = (tag ?? "").trim();
        const canonical = canonicalizeTag(normalizedTag);
        const queryTag = normalizedTag || canonical || undefined;

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

        const fetchJsonWithFallback = async (urls: string[]) => {
          let lastError: unknown;
          for (const url of urls) {
            try {
              const res = await fetch(url, {
                cache: "no-store",
                signal: ac.signal,
              });
              if (!res.ok) {
                lastError = new Error(`HTTP ${res.status} for ${url}`);
                continue;
              }
              return await res.json();
            } catch (err) {
              if (err instanceof DOMException && err.name === "AbortError") {
                throw err;
              }
              lastError = err;
            }
          }
          throw lastError ?? new Error("All fetch attempts failed");
        };

        const techCandidates = [
          join(
            buildUrl("/tech/decision/snapshot", {
              interval: "1d",
              tag: queryTag,
            })
          ),
          join(buildUrl("/tech/decision/snapshot", { interval: "1d" })),
        ];

        const json: unknown = await fetchJsonWithFallback(techCandidates);

        if (!isDecisionArray(json)) {
          throw new Error("Invalid v2 decision/snapshot schema");
        }
        const arr = json;

        // meta を ticker->meta に（SSR初期・rowsどちらからでも）
        const metaMap = new Map<string, StockMeta>();
        const techTarget = queryTag ?? initialTag;
        const techCanonical = canonicalizeTag(techTarget);
        const initialFiltered = filterMetaByTag(initialMeta ?? [], techTarget, {
          allowMissingTagInfo: techCanonical === "TOPIX_CORE30",
        });
        initialFiltered.forEach((m) => metaMap.set(m.ticker, m));
        if (metaMap.size === 0 && rows.length > 0) {
          rows.forEach((r) =>
            metaMap.set(r.ticker, {
              ticker: r.ticker,
              code: r.code,
              stock_name: r.stock_name,
            })
          );
        }

        const allowedTickers =
          rows.length > 0
            ? new Set(rows.map((r) => r.ticker))
            : pickAllowedTickers(initialFiltered);
        const mapped = mapDecisionSnapshotToTechRows(arr, metaMap).filter((t) =>
          allowedTickers.has(t.ticker)
        );

        if (mounted) {
          setTechRows(mapped);
          setTechStatus("success");
        }
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError")) {
          console.error(e);
          if (mounted) setTechStatus("error");
        }
      }
    })();

    return () => {
      mounted = false;
      ac.abort();
    };
  }, [base, initialMeta, initialTag, rows, tag]);

  return { rows, status, nf0, nf2, techRows, techStatus };
}
