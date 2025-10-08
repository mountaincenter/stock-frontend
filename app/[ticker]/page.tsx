// app/[ticker]/page.tsx
import Link from "next/link";
import TickerDailyChart from "./TickerDailyChart";
import TechnicalDetailTable from "./TechDetailTable";
import PriceCard from "./PriceCard";
import { canonicalizeTag } from "@/lib/tag-utils";

const RAW_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const API_BASE = RAW_API_BASE.endsWith("/")
  ? RAW_API_BASE.slice(0, -1)
  : RAW_API_BASE;

type Meta = {
  code: string;
  stock_name: string;
  ticker: string;
  tag1?: string | null;
};
type Snapshot = {
  ticker: string;
  date: string | null;
  close: number | null;
  prevClose: number | null;
  diff: number | null;
  volume?: number | null;
  vol_ma10?: number | null;
  tr?: number | null;
  tr_pct?: number | null;
  atr14?: number | null;
  atr14_pct?: number | null;
};
type Perf = Record<string, number | string | null> & {
  ticker: string;
  date: string;
};

function join(path: string) {
  if (!API_BASE) return path;
  return path.startsWith("/") ? `${API_BASE}${path}` : `${API_BASE}/${path}`;
}

async function fetchWithFallback<T>(
  urls: string[],
  fallbackValue: T
): Promise<T> {
  let lastError: unknown = null;
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        lastError = new Error(`HTTP ${res.status} for ${url}`);
        continue;
      }
      return (await res.json()) as T;
    } catch (err) {
      lastError = err;
    }
  }
  if (lastError) {
    console.warn("[ticker] fallback:", lastError);
  }
  return fallbackValue;
}

async function fetchAll(ticker: string) {
  const normalizedTicker = ticker.trim().toUpperCase();
  const windows = "5d,1mo,3mo,ytd,1y,3y,5y,all";

  const metaCandidates = [join("/meta"), join("/stocks")];
  const metas = await fetchWithFallback<Meta[]>(metaCandidates, []);
  const meta =
    metas.find(
      (m) => (m.ticker ?? "").trim().toUpperCase() === normalizedTicker
    ) ?? null;

  const tag = canonicalizeTag(meta?.tag1 ?? undefined);

  const snapshotCandidates = [
    join(
      `/prices/snapshot/last2${
        tag ? `?tag=${encodeURIComponent(tag)}` : ""
      }`
    ),
  ];
  const snaps = await fetchWithFallback<Snapshot[]>(snapshotCandidates, []);
  const snap =
    snaps.find(
      (s) => (s.ticker ?? "").trim().toUpperCase() === normalizedTicker
    ) ?? null;

  const perfCandidates = [
    join(
      `/perf/returns?windows=${encodeURIComponent(windows)}${
        tag ? `&tag=${encodeURIComponent(tag)}` : ""
      }`
    ),
    join(`/prices/perf/returns?windows=${encodeURIComponent(windows)}`),
  ];
  const perfs = await fetchWithFallback<Perf[]>(perfCandidates, []);
  const perf =
    perfs.find(
      (p) => (p.ticker ?? "").trim().toUpperCase() === normalizedTicker
    ) ?? null;

  return { meta, snap, perf };
}

export default async function TickerPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker: rawTicker } = await params;
  const ticker = decodeURIComponent(rawTicker);

  const { meta, snap, perf } = await fetchAll(ticker);

  if (!meta) {
    return (
      <main className="flex flex-col gap-4 py-6 md:py-8">
        <div className="w-full md:w-[85%] xl:w-[83%] 2xl:w-[80%] mx-auto">
          <div className="rounded-lg border border-border bg-background p-4">
            <h1 className="text-lg font-semibold">銘柄が見つかりません</h1>
            <p className="text-sm text-muted-foreground mt-1">
              指定されたティッカー <span className="font-mono">{ticker}</span>{" "}
              は一覧に存在しません。
            </p>
            <div className="mt-4">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-md px-3 py-2 text-primary text-sm font-medium hover:bg-muted/60 transition-colors"
              >
                一覧に戻る
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col py-4 md:py-6">
      <div className="w-full md:w-[85%] xl:w-[83%] 2xl:w-[80%] mx-auto space-y-4">
        {/* 戻るリンク（タップ領域拡大） */}
        <div className="flex justify-end">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md px-3 py-2 text-primary text-sm font-medium hover:bg-muted/60 transition-colors"
          >
            一覧へ戻る
          </Link>
        </div>

        {/* 価格＋ボラティリティ（ヘッダ含めて集約） */}
        <PriceCard meta={meta} snap={snap} />

        {/* チャート（日足・直近1年） */}
        <div className="rounded-lg border border-border bg-background p-4">
          <TickerDailyChart ticker={ticker} perf={perf ?? undefined} />
        </div>

        {/* テクニカル詳細（表のみ。中身はクライアント側で v2 / legacy を吸収） */}
        <TechnicalDetailTable ticker={ticker} />

        {/* 補助リンク（下部） */}
        <div className="text-xs text-muted-foreground">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md px-2 py-1 text-primary hover:bg-muted/60 transition-colors"
          >
            &larr; 一覧へ戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
