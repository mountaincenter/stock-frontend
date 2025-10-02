// app/page.tsx  ← "use client" は付けない（Server Component）
import { StockLists as StockListsNew } from "@/components/stock_list_new";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

// SSRで初期データを1度だけ取得
async function fetchInitial() {
  if (!API_BASE) {
    return { initialMeta: [], initialSnapshot: [], initialPerf: [] };
  }

  const [metaRes, snapRes, perfRes] = await Promise.all([
    fetch(`${API_BASE}/core30/meta`, { cache: "no-store" }),
    fetch(`${API_BASE}/core30/prices/snapshot/last2`, { cache: "no-store" }),
    fetch(`${API_BASE}/core30/perf/returns`, { cache: "no-store" }),
  ]);

  const initialMeta = metaRes.ok ? await metaRes.json() : [];
  const initialSnapshot = snapRes.ok ? await snapRes.json() : [];
  const initialPerf = perfRes.ok ? await perfRes.json() : [];

  return { initialMeta, initialSnapshot, initialPerf };
}

export default async function Page() {
  const { initialMeta, initialSnapshot, initialPerf } = await fetchInitial();

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
          />
        </section>
      </div>
    </main>
  );
}
