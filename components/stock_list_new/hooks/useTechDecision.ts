"use client";

import * as React from "react";

const normalizeBase = (base: string) =>
  base.endsWith("/") ? base.slice(0, -1) : base;
const buildUrl = (base: string, path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const normalizedBase = normalizeBase(base);
  return normalizedBase ? `${normalizedBase}${normalizedPath}` : normalizedPath;
};

/** ====== 型定義（APIスキーマに準拠） ====== */
export type TechDecisionValue = {
  rsi14: number | null;
  macd_hist: number | null;
  percent_b: number | null;
  sma25_dev_pct: number | null;
  roc12: number | null;
  donchian_dist_up: number | null;
  donchian_dist_dn: number | null;
  atr14_pct: number | null;
  rv20: number | null;
  er14: number | null;
  obv_slope: number | null;
  cmf20: number | null;
  vol_z20: number | null;
};

export type VoteEntry = { score: number; label: string };

export type TechDecisionVotes = {
  // 指標名キー: -2..+2 のスコアとラベル
  [key: string]: VoteEntry;
};

export type TechDecisionItem = {
  ticker: string;
  date: string; // "YYYY-MM-DD"
  values: TechDecisionValue;
  votes: TechDecisionVotes; // { rsi14, macd_hist, percent_b, ..., ma, ichimoku }
  overall: { score: number; label: string };
};

type SnapshotState = {
  byTicker: Record<string, TechDecisionItem>;
  loading: boolean;
  error: string | null;
};

/** ====== 型ガード ====== */
function isNumberOrNull(v: unknown): v is number | null {
  return v === null || typeof v === "number";
}
function isString(v: unknown): v is string {
  return typeof v === "string";
}
function isVoteEntry(v: unknown): v is VoteEntry {
  return (
    typeof v === "object" &&
    v !== null &&
    "score" in v &&
    "label" in v &&
    typeof (v as { score: unknown }).score === "number" &&
    typeof (v as { label: unknown }).label === "string"
  );
}
function isVotes(obj: unknown): obj is TechDecisionVotes {
  if (typeof obj !== "object" || obj === null) return false;
  for (const k of Object.keys(obj as Record<string, unknown>)) {
    if (!isVoteEntry((obj as Record<string, unknown>)[k])) return false;
  }
  return true;
}
function isValues(v: unknown): v is TechDecisionValue {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  const keys: (keyof TechDecisionValue)[] = [
    "rsi14",
    "macd_hist",
    "percent_b",
    "sma25_dev_pct",
    "roc12",
    "donchian_dist_up",
    "donchian_dist_dn",
    "atr14_pct",
    "rv20",
    "er14",
    "obv_slope",
    "cmf20",
    "vol_z20",
  ];
  return keys.every((k) => isNumberOrNull(o[k]));
}
function isOverall(v: unknown): v is { score: number; label: string } {
  return isVoteEntry(v);
}
function isTechDecisionItem(x: unknown): x is TechDecisionItem {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    isString(o["ticker"]) &&
    isString(o["date"]) &&
    isValues(o["values"]) &&
    isVotes(o["votes"]) &&
    isOverall(o["overall"])
  );
}
function isTechDecisionArray(x: unknown): x is TechDecisionItem[] {
  return Array.isArray(x) && x.every((e) => isTechDecisionItem(e));
}

/** ====== スナップショット取得（一覧向け） ====== */
/**
 * /tech/decision/snapshot を 1回だけ取得して
 * { [ticker]: item } に整形して返す Hook
 */
export function useTechDecisionSnapshot(
  apiBase: string,
  interval: "1d" | "1wk" | "1mo" = "1d"
): SnapshotState {
  const [state, setState] = React.useState<SnapshotState>({
    byTicker: {},
    loading: true,
    error: null,
  });

  React.useEffect(() => {
    let aborted = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    const base = normalizeBase(apiBase ?? "");
    const urls = [
      buildUrl(
        base,
        `/tech/decision/snapshot?interval=${encodeURIComponent(interval)}`
      ),
    ];

    (async () => {
      let lastError: unknown = null;
      for (const url of urls) {
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) {
            const text = await res.text().catch(() => "");
            lastError = new Error(text || `HTTP ${res.status}`);
            continue;
          }
          const json: unknown = await res.json();
          if (!isTechDecisionArray(json)) {
            lastError = new Error("Invalid response schema for snapshot");
            continue;
          }
          if (aborted) return;
          const map: Record<string, TechDecisionItem> = {};
          for (const it of json) {
            map[it.ticker] = it;
          }
          setState({ byTicker: map, loading: false, error: null });
          return;
        } catch (e) {
          lastError = e;
        }
      }
      if (!aborted) {
        const msg =
          lastError instanceof Error
            ? lastError.message
            : String(lastError ?? "fetch error");
        setState({ byTicker: {}, loading: false, error: msg });
      }
    })();

    return () => {
      aborted = true;
    };
  }, [apiBase, interval]);

  return state;
}

/** ====== 単銘柄取得（個別ページ向け） ====== */
/**
 * /tech/decision?ticker=... を取得する Hook
 */
export function useTechDecisionItem(
  apiBase: string,
  ticker: string,
  interval: "1d" | "1wk" | "1mo" = "1d"
): { data: TechDecisionItem | null; loading: boolean; error: string | null } {
  const [data, setData] = React.useState<TechDecisionItem | null>(null);
  const [loading, setLoading] = React.useState<boolean>(
    ticker.length > 0
  );
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!ticker) {
      setLoading(false);
      setData(null);
      setError(null);
      return;
    }

    let aborted = false;
    setLoading(true);
    setError(null);

    const base = normalizeBase(apiBase ?? "");
    const urls = [
      buildUrl(
        base,
        `/tech/decision?ticker=${encodeURIComponent(
          ticker
        )}&interval=${encodeURIComponent(interval)}`
      ),
    ];

    (async () => {
      let lastError: unknown = null;
      for (const url of urls) {
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) {
            const text = await res.text().catch(() => "");
            lastError = new Error(text || `HTTP ${res.status}`);
            continue;
          }
          const json: unknown = await res.json();
          if (!isTechDecisionItem(json)) {
            lastError = new Error("Invalid response schema for item");
            continue;
          }
          if (aborted) return;
          setData(json);
          setLoading(false);
          return;
        } catch (e) {
          lastError = e;
        }
      }
      if (!aborted) {
        const msg =
          lastError instanceof Error
            ? lastError.message
            : String(lastError ?? "fetch error");
        setError(msg);
        setData(null);
        setLoading(false);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [apiBase, ticker, interval]);

  return { data, loading, error };
}
