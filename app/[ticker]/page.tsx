// app/[ticker]/page.tsx
import Link from "next/link";
import TickerDailyChart from "./TickerDailyChart";
import TechnicalDetailTable from "./TechDetailTable";
import PriceCard from "./PriceCard";
import BackToListButton from "./BackToListButton";
import { canonicalizeTag } from "@/lib/tag-utils";

const RAW_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const API_BASE = RAW_API_BASE.endsWith("/")
  ? RAW_API_BASE.slice(0, -1)
  : RAW_API_BASE;

type Meta = {
  code: string;
  stock_name: string;
  ticker: string;
  categories?: string[] | null;
  tags?: string[] | null;
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
  const windows = "1d,5d,1mo,3mo,6mo,ytd,1y,3y,5y,all";

  const metaCandidates = [join("/meta"), join("/stocks")];
  const metas = await fetchWithFallback<Meta[]>(metaCandidates, []);
  const meta =
    metas.find(
      (m) => (m.ticker ?? "").trim().toUpperCase() === normalizedTicker
    ) ?? null;

  // categories配列の最初の要素を使用（TOPIX_CORE30 or 高市銘柄）
  const tag = canonicalizeTag(
    Array.isArray(meta?.categories) && meta.categories.length > 0
      ? meta.categories[0]
      : undefined
  );

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
      <main className="relative flex flex-col min-h-[100svh] md:min-h-screen overflow-hidden">
        {/* Premium background - same as root page */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
          <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-primary/8 via-primary/3 to-transparent blur-3xl animate-pulse-slow" />
          <div className="absolute -bottom-1/3 -left-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-accent/10 via-accent/4 to-transparent blur-3xl animate-pulse-slower" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
        </div>

        <div className="flex-1 py-8 md:py-12">
          <div className="w-full md:w-[92%] lg:w-[88%] xl:w-[85%] 2xl:w-[82%] mx-auto px-4 md:px-0">
            <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-8 shadow-xl shadow-black/5 backdrop-blur-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent" />
              <div className="relative">
                <h1 className="text-xl font-bold mb-2">銘柄が見つかりません</h1>
                <p className="text-sm text-muted-foreground">
                  指定されたティッカー <span className="font-mono font-semibold text-foreground/80">{ticker}</span>{" "}
                  は一覧に存在しません。
                </p>
                <div className="mt-6">
                  <BackToListButton variant="button" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex flex-col min-h-[100svh] md:min-h-screen overflow-hidden">
      {/* Premium background - same as root page */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-primary/8 via-primary/3 to-transparent blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-1/3 -left-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-accent/10 via-accent/4 to-transparent blur-3xl animate-pulse-slower" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      </div>

      <div className="flex-1 py-4 md:py-5 lg:py-6">
        <div className="w-full md:w-[92%] lg:w-[90%] xl:w-[88%] 2xl:w-[86%] mx-auto px-3 md:px-4 space-y-4">
          {/* Premium navigation header */}
          <div className="flex justify-end">
            <BackToListButton />
          </div>

          {/* 価格＋ボラティリティ（ヘッダ含めて集約） */}
          <PriceCard meta={meta} snap={snap} />

          {/* チャート（日足・直近1年） */}
          <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 md:p-6 shadow-xl shadow-black/5 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <TickerDailyChart ticker={ticker} perf={perf ?? undefined} />
            </div>
          </div>

          {/* テクニカル詳細（表のみ。中身はクライアント側で v2 / legacy を吸収） */}
          <TechnicalDetailTable ticker={ticker} />

          {/* Elegant bottom navigation */}
          <div className="flex items-center justify-center pt-1">
            <div className="flex items-center gap-2">
              <div className="h-px w-8 bg-gradient-to-r from-transparent to-border/40" />
              <BackToListButton variant="minimal" />
              <div className="h-px w-8 bg-gradient-to-l from-transparent to-border/40" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
