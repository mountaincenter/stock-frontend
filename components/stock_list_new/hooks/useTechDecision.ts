"use client";

import * as React from "react";

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
 * /core30/tech/decision/snapshot を 1回だけ取得して
 * { [ticker]: item } に整形して返す Hook
 */
export function useTechDecisionSnapshot(
  apiBase: string,
  interval: "1d" | "1wk" | "1mo" = "1d"
): SnapshotState {
  const [state, setState] = React.useState<SnapshotState>({
    byTicker: {},
    loading: apiBase.length > 0,
    error: null,
  });

  React.useEffect(() => {
    if (!apiBase) {
      setState((s) => ({ ...s, loading: false, error: "API_BASE is empty" }));
      return;
    }

    let aborted = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    const url = `${apiBase}/core30/tech/decision/snapshot?interval=${encodeURIComponent(
      interval
    )}`;

    fetch(url, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `HTTP ${res.status}`);
        }
        const json: unknown = await res.json();
        if (!isTechDecisionArray(json)) {
          throw new Error("Invalid response schema for snapshot");
        }
        return json;
      })
      .then((arr) => {
        if (aborted) return;
        const map: Record<string, TechDecisionItem> = {};
        for (const it of arr) {
          map[it.ticker] = it;
        }
        setState({ byTicker: map, loading: false, error: null });
      })
      .catch((e: unknown) => {
        if (aborted) return;
        const msg = e instanceof Error ? e.message : String(e);
        setState({ byTicker: {}, loading: false, error: msg });
      });

    return () => {
      aborted = true;
    };
  }, [apiBase, interval]);

  return state;
}

/** ====== 単銘柄取得（個別ページ向け） ====== */
/**
 * /core30/tech/decision?ticker=... を取得する Hook
 */
export function useTechDecisionItem(
  apiBase: string,
  ticker: string,
  interval: "1d" | "1wk" | "1mo" = "1d"
): { data: TechDecisionItem | null; loading: boolean; error: string | null } {
  const [data, setData] = React.useState<TechDecisionItem | null>(null);
  const [loading, setLoading] = React.useState<boolean>(
    apiBase.length > 0 && ticker.length > 0
  );
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!apiBase || !ticker) {
      setLoading(false);
      setData(null);
      setError(!apiBase ? "API_BASE is empty" : null);
      return;
    }

    let aborted = false;
    setLoading(true);
    setError(null);

    const url = `${apiBase}/core30/tech/decision?ticker=${encodeURIComponent(
      ticker
    )}&interval=${encodeURIComponent(interval)}`;

    fetch(url, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `HTTP ${res.status}`);
        }
        const json: unknown = await res.json();
        if (!isTechDecisionItem(json)) {
          throw new Error("Invalid response schema for item");
        }
        return json;
      })
      .then((it) => {
        if (aborted) return;
        setData(it);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (aborted) return;
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setData(null);
        setLoading(false);
      });

    return () => {
      aborted = true;
    };
  }, [apiBase, ticker, interval]);

  return { data, loading, error };
}
