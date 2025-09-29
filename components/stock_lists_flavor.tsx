// stock_lists_tradingview_flavor.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../components/ui/tabs";
import { LayoutGrid, List } from "lucide-react";

export interface StockMeta {
  code: string;
  stock_name: string;
  ticker: string;
}

export interface SnapshotRow {
  ticker: string;
  date: string | null;
  close: number | null;
  prevClose: number | null;
  diff: number | null;
}

export interface PerfRow {
  ticker: string;
  date: string; // YYYY-MM-DD
  [key: string]: string | number | null;
}

type FetchState = "idle" | "loading" | "success" | "error";

interface Props {
  apiBase?: string; // 例: http://localhost:8050
  initialMeta?: StockMeta[];
  initialSnapshot?: SnapshotRow[];
  initialPerf?: PerfRow[];
}

type Row = StockMeta & {
  date: string | null;
  close: number | null;
  prevClose: number | null;
  diff: number | null;
  r_5d: number | null;
  r_1mo: number | null;
  r_3mo: number | null;
  r_ytd: number | null;
  r_1y: number | null;
  r_5y: number | null;
  r_all: number | null;
};

export default function StockListsTradingViewFlavor({
  apiBase,
  initialMeta,
  initialSnapshot,
  initialPerf,
}: Props) {
  // ---------- 状態とフォーマッタ ----------
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<FetchState>(
    initialMeta && initialSnapshot && initialPerf ? "success" : "idle"
  );
  const [searchTerm, setSearchTerm] = useState("");

  const base = useMemo(
    () => apiBase ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
    [apiBase]
  );

  const nf0 = useMemo(
    () =>
      new Intl.NumberFormat("ja-JP", {
        maximumFractionDigits: 0,
      }),
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

  // ---------- データ取得（元ファイルと同一ロジック） ----------
  useEffect(() => {
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
          r_5d: (p?.["r_5d"] as number) ?? null,
          r_1mo: (p?.["r_1mo"] as number) ?? null,
          r_3mo: (p?.["r_3mo"] as number) ?? null,
          r_ytd: (p?.["r_ytd"] as number) ?? null,
          r_1y: (p?.["r_1y"] as number) ?? null,
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
    (async () => {
      try {
        setStatus("loading");
        const [metaRes, snapRes, perfRes] = await Promise.all([
          fetch(`${base}/core30/meta`, { cache: "no-store" }),
          fetch(`${base}/core30/prices/snapshot/last2`, { cache: "no-store" }),
          fetch(`${base}/core30/perf/returns`, { cache: "no-store" }),
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
            r_5d: (p?.["r_5d"] as number) ?? null,
            r_1mo: (p?.["r_1mo"] as number) ?? null,
            r_3mo: (p?.["r_3mo"] as number) ?? null,
            r_ytd: (p?.["r_ytd"] as number) ?? null,
            r_1y: (p?.["r_1y"] as number) ?? null,
            r_5y: (p?.["r_5y"] as number) ?? null,
            r_all: (p?.["r_all"] as number) ?? null,
          };
        });

        if (mounted) {
          setRows(merged);
          setStatus("success");
        }
      } catch (e) {
        console.error(e);
        if (mounted) setStatus("error");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [base, initialMeta, initialPerf, initialSnapshot]);

  // ---------- フィルタ ----------
  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (s) =>
        s.stock_name.toLowerCase().includes(q) ||
        s.code.includes(searchTerm) ||
        s.ticker.toLowerCase().includes(q)
    );
  }, [rows, searchTerm]);

  // ---------- セル系（見た目のみ調整） ----------
  const CloseCell = ({ v }: { v: number | null }) =>
    v == null || !isFinite(v) ? (
      <span className="text-slate-400">—</span>
    ) : (
      <span className="font-mono tabular-nums">{nf0.format(v)}</span>
    );

  const DiffCell = ({
    diff,
    base,
  }: {
    diff: number | null;
    base: number | null;
  }) => {
    if (
      diff == null ||
      base == null ||
      !isFinite(diff) ||
      !isFinite(base) ||
      base === 0
    ) {
      return <span className="text-slate-400">—</span>;
    }
    const pct = (diff / base) * 100;
    const pos = diff > 0;
    const cls = pos
      ? "text-emerald-400"
      : diff < 0
      ? "text-rose-400"
      : "text-slate-300";
    return (
      <span className={`font-mono tabular-nums ${cls}`}>
        {diff > 0 ? "+" : ""}
        {nf0.format(diff)} ({nf2.format(pct)}%)
      </span>
    );
  };

  const PerfCell = ({ v }: { v: number | null }) => {
    if (v == null || !isFinite(v))
      return <span className="text-slate-400">—</span>;
    const cls =
      v > 0 ? "text-emerald-400" : v < 0 ? "text-rose-400" : "text-slate-300";
    const sign = v > 0 ? "+" : "";
    return (
      <span className={`font-mono tabular-nums ${cls}`}>
        {sign}
        {nf2.format(v)}%
      </span>
    );
  };

  // ---------- ローディング/エラー ----------
  if (status === "loading" || status === "idle") {
    return (
      <div className="space-y-3">
        <div className="h-8 w-full bg-slate-800/60 rounded-md animate-pulse" />
        <div className="h-72 w-full bg-slate-800/40 rounded-md animate-pulse" />
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-red-200 text-sm">
        データ取得に失敗しました（/core30/meta, /core30/prices/snapshot/last2,
        /core30/perf/returns）。
      </div>
    );
  }

  // ---------- TradingView 風の“詰め”スタイル ----------
  const headerBase =
    "text-xs text-slate-400 font-medium uppercase tracking-wide";
  const rowBase =
    "grid items-center px-3 h-10 text-sm hover:bg-slate-800/40 transition-colors border-b border-slate-800/60";
  const codeCls = "text-slate-200 font-mono font-semibold";
  const nameCls = "text-slate-100 truncate";
  const dateSub = "text-[10px] text-slate-500 mt-0.5";

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex">
        <input
          type="text"
          placeholder="銘柄名、コードで検索…（ティッカーも検索対象）"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-9 px-3 bg-slate-900/60 border border-slate-700/60 rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40"
        />
      </div>

      <div className="text-slate-400 text-xs">
        {filtered.length}銘柄を表示中 (全{rows.length}銘柄)
      </div>

      <Tabs defaultValue="price" className="w-full">
        <TabsList className="grid w-fit grid-cols-2 bg-slate-900/60 border border-slate-700/60 rounded-md">
          <TabsTrigger value="price" className="px-3 py-1.5">
            <LayoutGrid className="w-4 h-4 mr-1" />
            価格
          </TabsTrigger>
          <TabsTrigger value="perf" className="px-3 py-1.5">
            <List className="w-4 h-4 mr-1" />
            パフォーマンス
          </TabsTrigger>
        </TabsList>

        {/* 価格タブ */}
        <TabsContent value="price" className="mt-2">
          <div className="rounded-md border border-slate-800/80 overflow-hidden">
            {/* sticky header */}
            <div className="grid grid-cols-12 gap-2 px-3 h-9 items-center bg-slate-950/70 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60 sticky top-0 z-10">
              <div className={`col-span-2 ${headerBase}`}>コード</div>
              <div className={`col-span-6 ${headerBase}`}>銘柄名</div>
              <div className={`col-span-2 text-right ${headerBase}`}>終値</div>
              <div className={`col-span-2 text-right ${headerBase}`}>
                前日比
              </div>
            </div>

            <div className="max-h-[70vh] overflow-auto">
              {filtered.map((r) => (
                <Link
                  key={r.ticker}
                  href={`/${encodeURIComponent(r.ticker)}`}
                  className={`grid grid-cols-12 gap-2 ${rowBase}`}
                >
                  <div className="col-span-2">
                    <span className={codeCls}>{r.code}</span>
                  </div>
                  <div className="col-span-6">
                    <div className={nameCls} title={r.stock_name}>
                      {r.stock_name}
                    </div>
                    <div className={dateSub}>{r.date ?? "—"}</div>
                  </div>
                  <div className="col-span-2 text-right">
                    <CloseCell v={r.close} />
                  </div>
                  <div className="col-span-2 text-right">
                    <DiffCell diff={r.diff} base={r.prevClose} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* パフォーマンスタブ */}
        <TabsContent value="perf" className="mt-2">
          <div className="rounded-md border border-slate-800/80 overflow-hidden">
            <div className="grid grid-cols-14 gap-2 px-3 h-9 items-center bg-slate-950/70 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60 sticky top-0 z-10">
              <div className={`col-span-2 ${headerBase}`}>コード</div>
              <div className={`col-span-4 ${headerBase}`}>銘柄名</div>
              <div className={`col-span-1 text-right ${headerBase}`}>1週</div>
              <div className={`col-span-1 text-right ${headerBase}`}>1ヶ月</div>
              <div className={`col-span-1 text-right ${headerBase}`}>3ヶ月</div>
              <div className={`col-span-1 text-right ${headerBase}`}>
                年初来
              </div>
              <div className={`col-span-1 text-right ${headerBase}`}>1年</div>
              <div className={`col-span-1 text-right ${headerBase}`}>5年</div>
              <div className={`col-span-2 text-right ${headerBase}`}>
                全期間
              </div>
            </div>

            <div className="max-h-[70vh] overflow-auto">
              {filtered.map((r) => (
                <Link
                  key={r.ticker}
                  href={`/${encodeURIComponent(r.ticker)}`}
                  className={`grid grid-cols-14 gap-2 ${rowBase}`}
                >
                  <div className="col-span-2">
                    <span className={codeCls}>{r.code}</span>
                  </div>
                  <div className="col-span-4">
                    <div className={nameCls} title={r.stock_name}>
                      {r.stock_name}
                    </div>
                    <div className={dateSub}>{r.date ?? "—"}</div>
                  </div>
                  <div className="col-span-1 text-right">
                    <PerfCell v={r.r_5d} />
                  </div>
                  <div className="col-span-1 text-right">
                    <PerfCell v={r.r_1mo} />
                  </div>
                  <div className="col-span-1 text-right">
                    <PerfCell v={r.r_3mo} />
                  </div>
                  <div className="col-span-1 text-right">
                    <PerfCell v={r.r_ytd} />
                  </div>
                  <div className="col-span-1 text-right">
                    <PerfCell v={r.r_1y} />
                  </div>
                  <div className="col-span-1 text-right">
                    <PerfCell v={r.r_5y} />
                  </div>
                  <div className="col-span-2 text-right">
                    <PerfCell v={r.r_all} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="text-center py-10 text-slate-400 text-sm">
          該当する銘柄が見つかりません。検索条件を変更してお試しください。
        </div>
      )}
    </div>
  );
}
