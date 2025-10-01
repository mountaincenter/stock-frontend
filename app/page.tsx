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
    // モバイルは極限まで余白を削り、デスクトップは従来の余白を維持
    <main className="flex flex-col min-h-[100svh] md:min-h-screen md:p-6 p-2">
      {/* ここが唯一の“本番”ブロック。子は Client でもフェッチしない */}
      <section className="tight-mobile">
        <StockListsNew
          apiBase={API_BASE}
          initialMeta={initialMeta}
          initialSnapshot={initialSnapshot}
          initialPerf={initialPerf}
        />
      </section>
    </main>
  );
}
