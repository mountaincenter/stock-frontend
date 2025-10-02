import { useEffect, useMemo, useState } from "react";
import type {
  FetchState,
  Props,
  Row,
  StockMeta,
  SnapshotRow,
  PerfRow,
} from "../types";
import type { TechCoreRow } from "../types";

/**
 * データ取得と初期水和（SRP）。
 * - 価格/パフォーマンス: meta + snapshot + returns
 * - テクニカル: 事実4指標 + 評価4カラム（/core30/tech/snapshot）
 */
export function useStockData({
  apiBase,
  initialMeta,
  initialSnapshot,
  initialPerf,
}: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<FetchState>(
    initialMeta && initialSnapshot && initialPerf ? "success" : "idle"
  );

  // ★ テクニカル（4指標 + 評価4カラム）
  const [techRows, setTechRows] = useState<TechCoreRow[]>([]);
  const [techStatus, setTechStatus] = useState<FetchState>("idle");

  const base = useMemo(
    () => apiBase ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
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

  // 価格/スナップショット/パフォーマンス（既存）
  useEffect(() => {
    // initial* からの水和（SSR/SSG → CSR）
    const hydrateFromInitial = () => {
      if (!initialMeta || !initialSnapshot || !initialPerf) return false;
      const snapMap = new Map(initialSnapshot.map((s) => [s.ticker, s]));
      const perfMap = new Map(initialPerf.map((p) => [p.ticker, p]));
      const merged: Row[] = initialMeta.map((m) => {
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
          r_5d: (p?.["r_5d"] as number) ?? null,
          r_1mo: (p?.["r_1mo"] as number) ?? null,
          r_3mo: (p?.["r_3mo"] as number) ?? null,
          r_ytd: (p?.["r_ytd"] as number) ?? null,
          r_1y: (p?.["r_1y"] as number) ?? null,
          r_3y: (p?.["r_3y"] as number) ?? null, // ← 追加
          r_5y: (p?.["r_5y"] as number) ?? null,
          r_all: (p?.["r_all"] as number) ?? null,
        };
      });
      setRows(merged);
      setStatus("success");
      return true;
    };

    if (hydrateFromInitial()) return;

    let mounted = true;
    const ac = new AbortController();

    (async () => {
      try {
        setStatus("loading");
        const [metaRes, snapRes, perfRes] = await Promise.all([
          fetch(`${base}/core30/meta`, {
            cache: "no-store",
            signal: ac.signal,
          }),
          fetch(`${base}/core30/prices/snapshot/last2`, {
            cache: "no-store",
            signal: ac.signal,
          }),
          // 3y を確実に取るため windows を明示
          fetch(
            `${base}/core30/perf/returns?windows=5d,1mo,3mo,ytd,1y,3y,5y,all`,
            { cache: "no-store", signal: ac.signal }
          ),
        ]);
        if (!metaRes.ok) throw new Error(`meta HTTP ${metaRes.status}`);
        if (!snapRes.ok) throw new Error(`snapshot HTTP ${snapRes.status}`);
        if (!perfRes.ok) throw new Error(`perf HTTP ${perfRes.status}`);

        const meta = (await metaRes.json()) as StockMeta[];
        const snapshot = (await snapRes.json()) as SnapshotRow[];
        const perf = (await perfRes.json()) as PerfRow[];

        const snapMap = new Map(snapshot.map((s) => [s.ticker, s]));
        const perfMap = new Map(perf.map((p) => [p.ticker, p]));
        const merged: Row[] = meta.map((m) => {
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
            r_5d: (p?.["r_5d"] as number) ?? null,
            r_1mo: (p?.["r_1mo"] as number) ?? null,
            r_3mo: (p?.["r_3mo"] as number) ?? null,
            r_ytd: (p?.["r_ytd"] as number) ?? null,
            r_1y: (p?.["r_1y"] as number) ?? null,
            r_3y: (p?.["r_3y"] as number) ?? null, // ← 追加
            r_5y: (p?.["r_5y"] as number) ?? null,
            r_all: (p?.["r_all"] as number) ?? null,
          };
        });

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
  }, [base, initialMeta, initialPerf, initialSnapshot]);

  // ★ テクニカル（4指標 + 評価4カラム）は別エフェクトで取得
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
        // 旧: /core30/tech/mobile/core → 新: /core30/tech/snapshot
        const res = await fetch(`${base}/core30/tech/snapshot`, {
          cache: "no-store",
          signal: ac.signal,
        });
        if (!res.ok) throw new Error(`tech HTTP ${res.status}`);
        const data = (await res.json()) as TechCoreRow[];
        if (mounted) {
          setTechRows(Array.isArray(data) ? data : []);
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
  }, [base]);

  return { rows, status, nf0, nf2, techRows, techStatus };
}
