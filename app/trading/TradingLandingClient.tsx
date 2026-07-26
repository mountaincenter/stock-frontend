"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, Clock3, Layers3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { listReplayCases } from "./[ticker]/demo/api";
import type {
  CaseListResponse,
  ReplayCaseSummary,
} from "./[ticker]/demo/types";

export default function TradingLandingClient() {
  const [payload, setPayload] = useState<CaseListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listReplayCases("")
      .then(setPayload)
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : String(reason)),
      );
  }, []);

  const latestByTicker = useMemo(() => {
    const result = new Map<string, ReplayCaseSummary>();
    payload?.cases.forEach((item) => {
      const current = result.get(item.ticker);
      if (!current || item.date > current.date) result.set(item.ticker, item);
    });
    return Array.from(result.values()).sort((a, b) =>
      a.ticker.localeCompare(b.ticker),
    );
  }, [payload]);

  return (
    <main className="tv-dark min-h-screen bg-[#131722] text-[#e4e6eb]">
      <header className="border-b border-[#404551] bg-[#1e222d]">
        <div className="mx-auto max-w-[1400px] px-4 py-5">
          <div className="text-[10px] uppercase tracking-[0.24em] text-[#787d8a]">
            YMNK.JP
          </div>
          <h1 className="mt-1 text-2xl font-semibold">Trading Replay</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#a1a7b4]">
            対象日前日までの日足と、9:30までの分足・tickを分けて判断する盲検トレーニングです。
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5">
        <section className="grid gap-3 md:grid-cols-3">
          {[
            {
              icon: Layers3,
              label: "STEP 01",
              title: "日足判断",
              text: "対象日前日までの構造だけで買い・売り・静観を選択",
            },
            {
              icon: Clock3,
              label: "STEP 02",
              title: "9:30判断",
              text: "分足・VWAP・SMA・30秒約定テンポを追加して再判断",
            },
            {
              icon: BarChart3,
              label: "STEP 03",
              title: "結果検証",
              text: "SL、MFE、MAE、大引け損益と利益化時間帯を確認",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.label}
                className="rounded-md border border-[#404551] bg-[#1e222d] p-4"
              >
                <div className="flex items-center gap-2 text-[#4d8bff]">
                  <Icon className="h-4 w-4" />
                  <span className="font-mono text-[10px]">{item.label}</span>
                </div>
                <h2 className="mt-3 text-base font-semibold">{item.title}</h2>
                <p className="mt-1 text-xs leading-5 text-[#a1a7b4]">
                  {item.text}
                </p>
              </article>
            );
          })}
        </section>

        <section className="rounded-md border border-[#404551] bg-[#1e222d]">
          <div className="border-b border-[#404551] px-4 py-3">
            <h2 className="text-sm font-semibold">検証済みケース</h2>
            <p className="mt-1 text-[11px] text-[#787d8a]">
              全ケースの判断時刻は9:30です。
            </p>
          </div>
          {error ? (
            <div className="p-4 text-sm text-[#ff9b9a]">{error}</div>
          ) : !payload ? (
            <div className="p-4 text-sm text-[#a1a7b4]">読み込み中…</div>
          ) : (
            <div className="grid gap-px bg-[#404551] sm:grid-cols-2 lg:grid-cols-3">
              {latestByTicker.map((item) => (
                <Link
                  key={item.id}
                  href={`/trading/${encodeURIComponent(item.ticker)}/demo`}
                  className="group flex items-center justify-between bg-[#1e222d] px-4 py-4 hover:bg-[#262b37]"
                >
                  <div>
                    <div className="font-mono text-base font-semibold">
                      {item.ticker}
                    </div>
                    <div className="mt-1 text-xs text-[#a1a7b4]">
                      {item.name}
                    </div>
                    <div className="mt-2 font-mono text-[10px] text-[#787d8a]">
                      {item.date}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#787d8a] transition-transform group-hover:translate-x-1 group-hover:text-[#4d8bff]" />
                </Link>
              ))}
            </div>
          )}
        </section>

        <Link
          href="/"
          className="inline-flex text-xs text-[#a1a7b4] hover:text-[#e4e6eb]"
        >
          YMNK.JPへ戻る
        </Link>
      </div>
    </main>
  );
}
