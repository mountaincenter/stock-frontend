import { DevNavLinks } from "@/components/dev";
import { buildApiUrl } from "@/lib/api-base";

export const dynamic = "force-dynamic";

type Decision = {
  ticker?: string;
  action?: "WATCH" | "NO_TRADE";
  external_context_date?: string;
  external_label?: string;
  external_value?: number;
  watch_direction?: "LONG" | "SHORT" | "NO_TRADE";
  decision_status?: string;
};

type DaytradeEtfResponse = {
  snapshot: {
    generated_at: string;
    target_session: string;
    status: string;
    decision: Decision | null;
    reason: string | null;
  };
  operational: {
    state: "watch" | "no_trade" | "waiting" | "data_unavailable" | "stale";
    headline: string;
    guidance: string;
  };
};

async function loadDecision(): Promise<DaytradeEtfResponse> {
  const response = await fetch(buildApiUrl("/api/dev/daytrade-etf"), {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`07:00判定を取得できませんでした（HTTP ${response.status}）`);
  }
  return response.json();
}

function formatJst(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function watchRule(direction?: Decision["watch_direction"]): string {
  if (direction === "SHORT") {
    return "09:09または09:10の終値が寄付を下回った場合、次の実足で売り";
  }
  if (direction === "LONG") {
    return "09:09または09:10の終値が寄付を上回った場合、次の実足で買い";
  }
  return "取引しない";
}

export default async function DaytradeEtfPage() {
  let data: DaytradeEtfResponse | null = null;
  let error: string | null = null;
  try {
    data = await loadDecision();
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "07:00判定を取得できませんでした";
  }

  const decision = data?.snapshot.decision;
  const isWatch = data?.operational.state === "watch";
  const directionLabel = isWatch
    ? decision?.watch_direction === "SHORT"
      ? "SHORT監視"
      : "LONG監視"
    : data?.operational.state === "waiting"
      ? "07:00判定待ち"
      : data?.operational.state === "data_unavailable"
        ? "判定不能"
        : data?.operational.state === "stale"
          ? "当日判定なし"
          : "NO TRADE";
  const directionClass =
    decision?.watch_direction === "SHORT" && isWatch
      ? "text-price-down"
      : decision?.watch_direction === "LONG" && isWatch
        ? "text-price-up"
        : "text-muted-foreground";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <header className="mb-4 flex flex-wrap items-center gap-3 border-b border-border/50 pb-3">
          <div>
            <h1 className="text-xl font-bold">Daytrade ETF</h1>
            <p className="text-xs text-muted-foreground">200A 07:00判定</p>
          </div>
          <DevNavLinks className="ml-auto" />
        </header>

        {error ? (
          <section className="rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-sm text-destructive">
            <h2 className="font-semibold">判定データなし</h2>
            <p className="mt-2">{error}</p>
            <p className="mt-2">判定を確認できない日は取引しない。</p>
          </section>
        ) : (
          <div className="space-y-3">
            <section className="rounded-xl border border-border bg-card px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-muted-foreground">
                    {data?.snapshot.target_session} / 200A
                  </div>
                  <div className={`mt-1 text-2xl font-bold tabular-nums ${directionClass}`}>
                    {directionLabel}
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground tabular-nums">
                  <div>生成 {data ? formatJst(data.snapshot.generated_at) : "—"}</div>
                  <div className="mt-1">
                    {decision?.external_label ?? data?.snapshot.status ?? "—"}
                    {typeof decision?.external_value === "number"
                      ? ` ${decision.external_value >= 0 ? "+" : ""}${decision.external_value.toFixed(3)}%`
                      : ""}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card px-4 py-3">
              <h2 className="text-base font-semibold">本日の固定条件</h2>
              <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm md:grid-cols-[8rem_1fr]">
                <dt className="text-muted-foreground">09:10確認</dt>
                <dd className="font-medium">{isWatch ? watchRule(decision?.watch_direction) : "取引しない"}</dd>
                <dt className="text-muted-foreground">建玉</dt>
                <dd>200A・10口</dd>
                <dt className="text-muted-foreground">Stop</dt>
                <dd>建値から逆方向へ50円（計画損失500円。ギャップ約定時は超過あり）</dd>
                <dt className="text-muted-foreground">Exit</dt>
                <dd>当日大引け・持越しなし</dd>
              </dl>
              <p className="mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                再エントリー、買い増し、ナンピン、ヘッジ、反転売買をしない。条件不成立はノートレ。
              </p>
            </section>

            <section className="rounded-xl border border-border bg-card px-4 py-3">
              <h2 className="text-sm font-semibold">過去検証</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                {[
                  ["取引", "51件"],
                  ["PF (bps)", "2.530"],
                  ["総損益", "+6,550円"],
                  ["勝率", "66.7%"],
                  ["最大DD", "-1,000円"],
                  ["最悪損失", "-500円"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-border/60 bg-background px-3 py-2">
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="mt-1 font-semibold tabular-nums">{value}</div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                2024-08-20〜2026-06-10、0 bps。特別空売り料とスリッページは未反映。過去検証値であり将来損益を保証しない。
              </p>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
