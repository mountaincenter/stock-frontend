// app/page.tsx  ← "use client" は付けない（Server Component）
import {
  StockLists as StockListsNew,
  type PerfRow,
  type SnapshotRow,
  type StockMeta,
} from "@/components/stock_list_new";
import {
  canonicalizeTag,
  filterMetaByTag,
  pickAllowedTickers,
} from "@/lib/tag-utils";

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
        const res = await fetch(url, { cache: "no-store" });
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
  const tagParam = normalizedTag || canonical || undefined;

  try {
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

    let initialMeta = await fetchJsonWithFallback<StockMeta[]>(metaCandidates, {
      throwOnFailure: false,
      fallbackValue: [],
      context: "meta",
    });
    if ((initialMeta?.length ?? 0) === 0 && tagParam) {
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
        initialMeta = filterMetaByTag(unfiltered, tagParam, {
          allowMissingTagInfo: isCore30,
        });
      }
    }
    const [rawSnapshot, rawPerf] = await Promise.all([
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

export default async function Page() {
  const { initialMeta, initialSnapshot, initialPerf, initialTag } = await fetchInitial(DEFAULT_TAG);

  return (
    <main className="flex flex-col min-h-[100svh] md:min-h-screen py-4 md:py-6">
      {/* 画面幅に応じて中央 90% → 88% → 85% */}
      <div className="w-full md:w-[85%] xl:w-[83%] 2xl:w-[80%] mx-auto">
        {/* 子は Client でもフェッチしない */}
        <section className="tight-mobile">
          <StockListsNew
            apiBase={API_BASE}
            initialMeta={initialMeta}
            initialSnapshot={initialSnapshot}
            initialPerf={initialPerf}
            initialTag={initialTag}
          />
        </section>
      </div>
    </main>
  );
}
