// stock_lists.tsx
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
  volume?: number | null; // ← 追加
  vol_ma10?: number | null; // ← 追加
}

export interface PerfRow {
  ticker: string;
  date: string; // YYYY-MM-DD
  [key: string]: string | number | null;
}

type FetchState = "idle" | "loading" | "success" | "error";

interface Props {
  apiBase?: string;
  initialMeta?: StockMeta[];
  initialSnapshot?: SnapshotRow[];
  initialPerf?: PerfRow[];
}

type Row = StockMeta & {
  // 価格タブ
  date: string | null;
  close: number | null;
  prevClose: number | null;
  diff: number | null;
  volume: number | null; // ← 追加
  vol_ma10: number | null; // ← 追加
  // パフォーマンス
  r_5d: number | null;
  r_1mo: number | null;
  r_3mo: number | null;
  r_ytd: number | null;
  r_1y: number | null;
  r_5y: number | null;
  r_all: number | null;
};

export default function StockLists({
  apiBase,
  initialMeta,
  initialSnapshot,
  initialPerf,
}: Props) {
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
          volume: (s?.volume as number) ?? null, // ← 追加
          vol_ma10: (s?.vol_ma10 as number) ?? null, // ← 追加
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
            volume: (s?.volume as number) ?? null, // ← 追加
            vol_ma10: (s?.vol_ma10 as number) ?? null, // ← 追加
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

  const DiffBadge = ({
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
      return <span className="text-slate-400">―</span>;
    }
    const pct = (diff / base) * 100;
    const cls =
      diff > 0
        ? "text-emerald-300"
        : diff < 0
        ? "text-rose-300"
        : "text-slate-300";
    return (
      <span className={cls}>
        {diff > 0 ? "+" : ""}
        {nf0.format(diff)} ({nf2.format(pct)}%)
      </span>
    );
  };

  const CloseCell = ({ v }: { v: number | null }) =>
    v == null || !isFinite(v) ? (
      <span className="text-slate-400">―</span>
    ) : (
      <span className="font-mono">{nf0.format(v)}</span>
    );

  const NumCell = ({ v }: { v: number | null }) =>
    v == null || !isFinite(v) ? (
      <span className="text-slate-400">―</span>
    ) : (
      <span className="font-mono">{nf0.format(v)}</span>
    );

  const PerfCell = ({ v }: { v: number | null }) => {
    if (v == null || !isFinite(v))
      return <span className="text-slate-400">—</span>;
    const cls =
      v > 0 ? "text-emerald-300" : v < 0 ? "text-rose-300" : "text-slate-300";
    const sign = v > 0 ? "+" : "";
    return (
      <span className={cls}>
        {sign}
        {nf2.format(v)}%
      </span>
    );
  };

  if (status === "loading" || status === "idle") {
    return (
      <div className="space-y-4">
        <div className="h-10 w-full bg-slate-800/60 rounded-xl animate-pulse" />
        <div className="h-96 w-full bg-slate-800/40 rounded-xl animate-pulse" />
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
        データ取得に失敗しました（/core30/meta, /core30/prices/snapshot/last2,
        /core30/perf/returns）。 サーバを確認してください。
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex">
        <input
          type="text"
          placeholder="銘柄名、コードで検索…（ティッカーも検索対象）"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 backdrop-blur-sm"
        />
      </div>

      <div className="text-slate-400 text-sm">
        {filtered.length}銘柄を表示中 (全{rows.length}銘柄)
      </div>

      <Tabs defaultValue="price" className="w-full">
        <TabsList className="grid w-fit grid-cols-2 bg-slate-800/50 border border-slate-600/50">
          <TabsTrigger value="price" className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4" />
            価格
          </TabsTrigger>
          <TabsTrigger value="perf" className="flex items-center gap-2">
            <List className="w-4 h-4" />
            パフォーマンス
          </TabsTrigger>
        </TabsList>

        {/* 価格タブ：列追加 */}
        <TabsContent value="price" className="mt-6">
          <div className="space-y-2">
            <div className="grid grid-cols-18 gap-4 px-4 py-3 text-slate-400 text-sm font-medium border-b border-slate-700/50">
              <div className="col-span-2">コード</div>
              <div className="col-span-6">銘柄名</div>
              <div className="col-span-2 text-right">終値</div>
              <div className="col-span-2 text-right">前日差</div>
              <div className="col-span-2 text-right">前日差(%)</div>
              <div className="col-span-2 text-right">出来高</div>
              <div className="col-span-2 text-right">出来高(10)</div>
            </div>
            {filtered.map((r) => {
              const pct =
                r.diff != null &&
                r.prevClose != null &&
                isFinite(r.diff) &&
                isFinite(r.prevClose) &&
                r.prevClose !== 0
                  ? (r.diff / r.prevClose) * 100
                  : null;
              return (
                <Link
                  key={r.ticker}
                  href={`/${encodeURIComponent(r.ticker)}`}
                  className="grid grid-cols-18 gap-4 px-4 py-4 premium-card rounded-xl hover:scale-[1.02] transition-all duration-200 border border-slate-700/50 hover:border-blue-500/50"
                >
                  <div className="col-span-2">
                    <span className="text-white font-mono font-bold text-lg">
                      {r.code}
                    </span>
                  </div>
                  <div className="col-span-6">
                    <h3 className="text-white font-bold text-base leading-tight hover:text-blue-300 transition-colors">
                      {r.stock_name}
                    </h3>
                    <div className="text-slate-500 text-xs mt-0.5">
                      {r.date ?? "—"}
                    </div>
                  </div>
                  <div className="col-span-2 text-right text-white">
                    <CloseCell v={r.close} />
                  </div>
                  <div className="col-span-2 text-right">
                    <DiffBadge diff={r.diff} base={r.prevClose} />
                  </div>
                  <div className="col-span-2 text-right">
                    {pct == null || !isFinite(pct) ? (
                      <span className="text-slate-400">―</span>
                    ) : (
                      <span
                        className={
                          pct > 0
                            ? "text-emerald-300"
                            : pct < 0
                            ? "text-rose-300"
                            : "text-slate-300"
                        }
                      >
                        {pct > 0 ? "+" : ""}
                        {nf2.format(pct)}%
                      </span>
                    )}
                  </div>
                  <div className="col-span-2 text-right text-white">
                    <NumCell v={r.volume} />
                  </div>
                  <div className="col-span-2 text-right text-white">
                    <NumCell v={r.vol_ma10} />
                  </div>
                </Link>
              );
            })}
          </div>
        </TabsContent>

        {/* パフォーマンスタブ */}
        <TabsContent value="perf" className="mt-6">
          <div className="space-y-2">
            <div className="grid grid-cols-14 gap-4 px-4 py-3 text-slate-400 text-sm font-medium border-b border-slate-700/50">
              <div className="col-span-2">コード</div>
              <div className="col-span-4">銘柄名</div>
              <div className="col-span-1 text-right">1週</div>
              <div className="col-span-1 text-right">1ヶ月</div>
              <div className="col-span-1 text-right">3ヶ月</div>
              <div className="col-span-1 text-right">年初来</div>
              <div className="col-span-1 text-right">1年</div>
              <div className="col-span-1 text-right">5年</div>
              <div className="col-span-2 text-right">全期間</div>
            </div>
            {filtered.map((r) => (
              <Link
                key={r.ticker}
                href={`/${encodeURIComponent(r.ticker)}`}
                className="grid grid-cols-14 gap-4 px-4 py-4 premium-card rounded-xl hover:scale-[1.02] transition-all duration-200 border border-slate-700/50 hover:border-blue-500/50"
              >
                <div className="col-span-2">
                  <span className="text-white font-mono font-bold text-lg">
                    {r.code}
                  </span>
                </div>
                <div className="col-span-4">
                  <h3 className="text-white font-bold text-base leading-tight hover:text-blue-300 transition-colors">
                    {r.stock_name}
                  </h3>
                  <div className="text-slate-500 text-xs mt-0.5">
                    {r.date ?? "—"}
                  </div>
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
        </TabsContent>
      </Tabs>

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="text-center py-12">
          <div className="text-slate-400 text-lg mb-2">
            該当する銘柄が見つかりません
          </div>
          <div className="text-slate-500 text-sm">
            検索条件を変更してお試しください
          </div>
        </div>
      )}
    </div>
  );
}
