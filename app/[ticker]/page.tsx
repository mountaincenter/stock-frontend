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
  const windows = "1d,5d,1mo,3mo,6mo,ytd,1y,3y,5y,all";

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
            <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card/95 via-card/90 to-card/95 p-8 shadow-xl shadow-black/5 backdrop-blur-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent" />
              <div className="relative">
                <h1 className="text-xl font-bold mb-2">銘柄が見つかりません</h1>
                <p className="text-sm text-muted-foreground">
                  指定されたティッカー <span className="font-mono font-semibold text-foreground/80">{ticker}</span>{" "}
                  は一覧に存在しません。
                </p>
                <div className="mt-6">
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-medium bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/30 transition-all duration-200 hover:shadow-lg hover:shadow-primary/10"
                  >
                    一覧に戻る
                  </Link>
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

      <div className="flex-1 py-6 md:py-8 lg:py-10">
        <div className="w-full md:w-[92%] lg:w-[88%] xl:w-[85%] 2xl:w-[82%] mx-auto px-4 md:px-0 space-y-5">
          {/* Premium navigation header */}
          <div className="flex justify-end">
            <Link
              href="/"
              className="group inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-medium bg-card/60 hover:bg-card/80 border border-border/40 hover:border-primary/30 backdrop-blur-sm transition-all duration-200 hover:shadow-lg hover:shadow-primary/5"
            >
              <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              一覧へ戻る
            </Link>
          </div>

          {/* 価格＋ボラティリティ（ヘッダ含めて集約） */}
          <PriceCard meta={meta} snap={snap} />

          {/* チャート（日足・直近1年） */}
          <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card/60 via-card/80 to-card/60 p-5 md:p-6 shadow-xl shadow-black/5 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <TickerDailyChart ticker={ticker} perf={perf ?? undefined} />
            </div>
          </div>

          {/* テクニカル詳細（表のみ。中身はクライアント側で v2 / legacy を吸収） */}
          <TechnicalDetailTable ticker={ticker} />

          {/* Elegant bottom navigation */}
          <div className="flex items-center justify-center pt-2">
            <div className="flex items-center gap-3">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-border/40" />
              <Link
                href="/"
                className="group inline-flex items-center gap-2 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                一覧へ戻る
              </Link>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-border/40" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
