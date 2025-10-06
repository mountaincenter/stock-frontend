// app/[ticker]/page.tsx
import Link from "next/link";
import TickerDailyChart from "./TickerDailyChart";
import TechnicalDetailTable from "./TechDetailTable";
import PriceCard from "./PriceCard";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

type Meta = { code: string; stock_name: string; ticker: string };
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

async function fetchAll(ticker: string) {
  if (!API_BASE) {
    return {
      meta: null as Meta | null,
      snap: null as Snapshot | null,
      perf: null as Perf | null,
    };
  }

  const [metaRes, snapRes, perfRes] = await Promise.all([
    fetch(`${API_BASE}/core30/meta`, { cache: "no-store" }),
    fetch(`${API_BASE}/core30/prices/snapshot/last2`, { cache: "no-store" }),
    fetch(
      `${API_BASE}/core30/perf/returns?windows=5d,1mo,3mo,ytd,1y,3y,5y,all`,
      { cache: "no-store" }
    ),
  ]);

  const metas = metaRes.ok ? ((await metaRes.json()) as Meta[]) : [];
  const snaps = snapRes.ok ? ((await snapRes.json()) as Snapshot[]) : [];
  const perfs = perfRes.ok ? ((await perfRes.json()) as Perf[]) : [];

  const meta = metas.find((m) => m.ticker === ticker) ?? null;
  const snap = snaps.find((s) => s.ticker === ticker) ?? null;
  const perf = perfs.find((p) => p.ticker === ticker) ?? null;

  return { meta, snap, perf };
}

export default async function TickerPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker: raw } = await params;
  const ticker = decodeURIComponent(raw);

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
