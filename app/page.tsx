// app/page.tsx  ← "use client" は付けない（Server Component）
import {
  StockLists as StockListsNew,
  type PerfRow,
  type SnapshotRow,
  type StockMeta,
  type Row,
} from "@/components/stock_list_new";
import {
  canonicalizeTag,
  filterMetaByTag,
  pickAllowedTickers,
} from "@/lib/tag-utils";

// キャッシュ戦略: 60秒間キャッシュし、その後バックグラウンドで再検証
export const revalidate = 60;

const RAW_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const API_BASE = RAW_API_BASE.endsWith("/") ? RAW_API_BASE.slice(0, -1) : RAW_API_BASE;
const DEFAULT_TAG = "takaichi";
const RETURN_WINDOWS = "5d,1mo,3mo,ytd,1y,3y,5y,all";

// SSRで初期データを1度だけ取得
async function fetchInitial(tag: string) {
  if (!API_BASE) {
    return { initialMeta: [], initialSnapshot: [], initialPerf: [], initialTag: tag };
  }

  const join = (path: string) =>
    path.startsWith("/") ? `${API_BASE}${path}` : `${API_BASE}/${path}`;

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
          next: { revalidate: 60 } // 60秒間キャッシュ
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
        lastError = err;
        only404 = false;
      }
    }
    if (throwOnFailure) {
      throw lastError ?? new Error("All fetch attempts failed");
    }
    if (!only404) {
      if (context) {
        console.warn(`[fetchInitial] Fallback applied for ${context}:`, lastError);
      } else {
        console.warn("[fetchInitial] Fallback applied:", lastError);
      }
    }
    return fallbackValue as T;
  };

  const normalizedTag = tag.trim();
  const canonical = canonicalizeTag(normalizedTag);
  const isCore30 = canonical === "TOPIX_CORE30";
  const isScalpingEntry = normalizedTag === "scalping_entry" || canonical === "SCALPING_ENTRY";
  const isScalpingActive = normalizedTag === "scalping_active" || canonical === "SCALPING_ACTIVE";
  const tagParam = normalizedTag || canonical || undefined;

  try {
    // スキャルピングの場合は専用エンドポイントから直接取得
    if (isScalpingEntry || isScalpingActive) {
      // クライアント側のuseStockDataでも同じendpointを使うため、ここでは空を返す
      // (SSRでのプリフェッチは不要)
      return {
        initialMeta: [],
        initialSnapshot: [],
        initialPerf: [],
        initialTag: tag,
      };
    }

    const metaCandidates = [
      join(buildUrl("/stocks", { tag: tagParam })),
      join(buildUrl("/meta", { tag: tagParam })),
    ];

    const snapshotCandidates = [
      join(buildUrl("/prices/snapshot/last2", { tag: tagParam })),
    ];

    const perfCandidates = [
      join(
        buildUrl("/perf/returns", {
          tag: tagParam,
          windows: RETURN_WINDOWS,
        })
      ),
      join(
        buildUrl("/prices/perf/returns", {
          tag: tagParam,
          windows: RETURN_WINDOWS,
        })
      ),
    ];

    // 全てのAPIコールを並列実行
    const [initialMeta, rawSnapshot, rawPerf] = await Promise.all([
      (async () => {
        let meta = await fetchJsonWithFallback<StockMeta[]>(metaCandidates, {
          throwOnFailure: false,
          fallbackValue: [],
          context: "meta",
        });
        if ((meta?.length ?? 0) === 0 && tagParam) {
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
            meta = filterMetaByTag(unfiltered, tagParam, {
              allowMissingTagInfo: isCore30,
            });
          }
        }
        return meta;
      })(),
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

    const filteredMeta = filterMetaByTag(initialMeta, tagParam, {
      allowMissingTagInfo: isCore30,
    });
    const allowedTickers = pickAllowedTickers(filteredMeta);
    const initialSnapshot = rawSnapshot.filter((s) =>
      allowedTickers.has(s.ticker)
    );
    const initialPerf = rawPerf.filter((p) => allowedTickers.has(p.ticker));

    return {
      initialMeta: filteredMeta,
      initialSnapshot,
      initialPerf,
      initialTag: tag,
    };
  } catch (error) {
    console.error("Failed to prefetch initial stock data:", error);
    return { initialMeta: [], initialSnapshot: [], initialPerf: [], initialTag: tag };
  }
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag: tagParam } = await searchParams;
  const requestedTag = tagParam || DEFAULT_TAG;
  const { initialMeta, initialSnapshot, initialPerf, initialTag } = await fetchInitial(requestedTag);

  return (
    <main className="relative flex flex-col min-h-[100svh] md:min-h-screen">
      {/* TradingView-inspired animated gradient background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        {/* Primary gradient layer */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />

        {/* Animated accent gradients */}
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-primary/8 via-primary/3 to-transparent blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-1/3 -left-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-accent/10 via-accent/4 to-transparent blur-3xl animate-pulse-slower" />

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      </div>

      <div className="py-3 md:py-4">
        {/* Container with premium width constraints */}
        <div className="w-full md:w-[92%] lg:w-[90%] xl:w-[88%] 2xl:w-[86%] mx-auto px-3 md:px-4">
          <section className="tight-mobile">
            <StockListsNew
              apiBase={API_BASE}
              initialMeta={initialMeta}
              initialSnapshot={initialSnapshot}
              initialPerf={initialPerf}
              initialTag={initialTag}
            />
          </section>

          {/* Disclaimer and Data Attribution */}
          <div className="mt-6 pt-4 border-t border-border/20">
            <div className="text-[9px] text-muted-foreground/40 leading-relaxed max-w-4xl mx-auto">
              <p className="mb-2">
                <span className="font-semibold">データ出典:</span> Yahoo Finance (yfinance)
              </p>
              <p className="mb-1">
                本サービスで提供される情報は、投資判断の参考として提供するものであり、投資勧誘を目的としたものではありません。
              </p>
              <p>
                投資に関する最終決定は、利用者ご自身の判断でなさるようお願いいたします。
                本サービスの情報に基づいて被ったいかなる損害についても、当方は一切の責任を負いかねます。
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
