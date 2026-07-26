"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  Download,
  Eye,
  LockKeyhole,
  RotateCcw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  listReplayCases,
  loadDailyStage,
  loadIntradayStage,
  loadResultStage,
} from "./api";
import DecisionButtons from "./DecisionButtons";
import { DailyReplayChart, IntradayReplayCharts } from "./ReplayCharts";
import ResultPanel, { DECISION_LABELS } from "./ResultPanel";
import type {
  CaseListResponse,
  DailyContext,
  DailyStageResponse,
  IntradayContext,
  IntradayStageResponse,
  ReplayCaseSummary,
  ResultStageResponse,
  StoredAttempt,
} from "./types";

const STORAGE_KEY = "ymnk-trading-replay-attempts-v1";

type Stage = "daily" | "intraday" | "result";
type AttemptStore = Record<string, StoredAttempt>;

function readAttemptStore(): AttemptStore {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function persistAttempt(caseId: string, attempt: StoredAttempt) {
  const store = readAttemptStore();
  store[caseId] = attempt;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function removeAttempt(caseId: string) {
  const store = readAttemptStore();
  delete store[caseId];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function number(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("ja-JP", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function signed(value: number | null | undefined, suffix = ""): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value > 0 ? "+" : ""}${number(value, 2)}${suffix}`;
}

function compact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("ja-JP", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function time(value: string | null | undefined): string {
  return value ? value.slice(11, 19) : "—";
}

function initialStage(attempt: StoredAttempt): Stage {
  if (
    attempt.dailyDecision &&
    attempt.intradayDecision &&
    attempt.revealedAt
  ) {
    return "result";
  }
  return attempt.dailyDecision && attempt.dailyLockedAt ? "intraday" : "daily";
}

function Fact({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="border-b border-[#2a2e39] py-2 last:border-b-0">
      <div className="text-[10px] uppercase tracking-wide text-[#787d8a]">
        {label}
      </div>
      <div className={`mt-1 font-sans text-sm font-medium tabular-nums ${tone || "text-[#e4e6eb]"}`}>
        {value}
      </div>
    </div>
  );
}

function StageRail({ stage }: { stage: Stage }) {
  const current = stage === "daily" ? 0 : stage === "intraday" ? 1 : 2;
  const steps = [
    ["01", "日足判断"],
    ["02", "9:30判断"],
    ["03", "結果検証"],
  ];
  return (
    <div className="grid grid-cols-3 overflow-hidden rounded-md border border-[#404551] bg-[#1e222d]">
      {steps.map(([numberText, label], index) => (
        <div
          key={numberText}
          className={[
            "relative flex items-center gap-2 border-r border-[#404551] px-3 py-2 last:border-r-0",
            index === current ? "bg-[#2a2e39]" : "",
          ].join(" ")}
        >
          <span
            className={[
              "font-sans text-[10px] tabular-nums",
              index <= current ? "text-[#4d8bff]" : "text-[#787d8a]",
            ].join(" ")}
          >
            {numberText}
          </span>
          <span
            className={[
              "text-xs font-medium",
              index === current ? "text-[#e4e6eb]" : "text-[#787d8a]",
            ].join(" ")}
          >
            {label}
          </span>
          {index < 2 ? (
            <ChevronRight className="absolute -right-2 z-10 h-4 w-4 text-[#404551]" />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function DailyFacts({ context }: { context: DailyContext }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-x-4">
        <Fact label="前日終値" value={`¥${number(context.previousClose)}`} />
        <Fact label="前日高値 / 安値" value={`${number(context.previousHigh)} / ${number(context.previousLow)}`} />
        <Fact label="25SMA乖離" value={signed(context.sma25DistancePct, "%")} />
        <Fact label="75SMA乖離" value={signed(context.sma75DistancePct, "%")} />
        <Fact label="25SMA 5日傾き" value={signed(context.sma25Slope5)} />
        <Fact label="75SMA 5日傾き" value={signed(context.sma75Slope5)} />
        <Fact label="20日高値 / 安値" value={`${number(context.recentHigh20)} / ${number(context.recentLow20)}`} />
        <Fact label="前日出来高" value={compact(context.previousVolume)} />
      </div>
      <details className="mt-3 rounded border border-[#404551] bg-[#131722] p-3">
        <summary className="cursor-pointer text-xs font-medium text-[#a1a7b4]">
          補助指標と直近の窓
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-x-4">
          <Fact label="RSI(14)" value={number(context.indicators.rsi14)} />
          <Fact label="MACD" value={number(context.indicators.macd, 2)} />
        </div>
        <div className="mt-2 space-y-1 text-[11px] text-[#787d8a]">
          {context.recentGaps.length ? (
            context.recentGaps.map((gap) => (
              <div key={`${gap.date}-${gap.direction}`}>
                {gap.date} {gap.direction === "up" ? "上窓" : "下窓"}{" "}
                {number(gap.lower)}–{number(gap.upper)}
              </div>
            ))
          ) : (
            <div>直近の窓なし</div>
          )}
        </div>
      </details>
    </>
  );
}

function IntradayFacts({ context }: { context: IntradayContext }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-x-4">
        <Fact label="9:30時点価格" value={`¥${number(context.lastVisiblePrice)}`} />
        <Fact label="寄付" value={`¥${number(context.open)}`} />
        <Fact label="見えている高値" value={`¥${number(context.visibleHigh)}`} />
        <Fact label="見えている安値" value={`¥${number(context.visibleLow)}`} />
        <Fact label="VWAP" value={`¥${number(context.indicators.vwap)}`} />
        <Fact label="SMA5 / SMA20" value={`${number(context.indicators.sma5)} / ${number(context.indicators.sma20)}`} />
        <Fact label="見えている出来高" value={compact(context.visibleVolume)} />
        <Fact label="直近30秒平均約定" value={`${number(context.tickTrades30sAverage)}件`} />
      </div>
      <div className="mt-3 rounded border border-[#404551] bg-[#131722] p-3 text-[11px] leading-5 text-[#a1a7b4]">
        初約定 {time(context.firstTradeTime)}
        {context.lateOpen ? "（9:00より後）" : ""}
        <br />
        {context.marketSectorStatus}
      </div>
      <details className="mt-3 rounded border border-[#404551] bg-[#131722] p-3">
        <summary className="cursor-pointer text-xs font-medium text-[#a1a7b4]">
          BB・RSI・MACD
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-x-4">
          <Fact label="RSI(14)" value={number(context.indicators.rsi14)} />
          <Fact label="MACD" value={number(context.indicators.macd, 2)} />
          <Fact label="BB上限" value={number(context.indicators.bb_upper)} />
          <Fact label="BB下限" value={number(context.indicators.bb_lower)} />
        </div>
      </details>
    </>
  );
}

interface TradingReplayClientProps {
  ticker: string;
}

export default function TradingReplayClient({
  ticker,
}: TradingReplayClientProps) {
  const normalizedTicker = decodeURIComponent(ticker).trim().toUpperCase();
  const [caseList, setCaseList] = useState<CaseListResponse | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [daily, setDaily] = useState<DailyStageResponse | null>(null);
  const [intraday, setIntraday] = useState<IntradayStageResponse | null>(null);
  const [result, setResult] = useState<ResultStageResponse | null>(null);
  const [attempt, setAttempt] = useState<StoredAttempt>({});
  const [stage, setStage] = useState<Stage>("daily");
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    listReplayCases(normalizedTicker)
      .then((payload) => {
        if (!active) return;
        setCaseList(payload);
        setSelectedCaseId(payload.cases[0]?.id || "");
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : String(reason));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [normalizedTicker]);

  useEffect(() => {
    if (!selectedCaseId) return;
    let active = true;
    const saved = readAttemptStore()[selectedCaseId] || {};
    const restoredStage = initialStage(saved);
    setAttempt(saved);
    setStage(restoredStage);
    setDaily(null);
    setIntraday(null);
    setResult(null);
    setError(null);
    setTransitioning(true);

    const requests: Array<Promise<unknown>> = [
      loadDailyStage(selectedCaseId).then((payload) => {
        if (active) setDaily(payload);
      }),
    ];
    if (restoredStage === "intraday") {
      requests.push(
        loadIntradayStage(selectedCaseId).then((payload) => {
          if (active) setIntraday(payload);
        }),
      );
    }
    if (
      restoredStage === "result" &&
      saved.dailyDecision &&
      saved.intradayDecision
    ) {
      requests.push(
        loadResultStage(
          selectedCaseId,
          saved.dailyDecision,
          saved.intradayDecision,
        ).then((payload) => {
          if (active) setResult(payload);
        }),
      );
    }

    Promise.all(requests)
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : String(reason));
        }
      })
      .finally(() => {
        if (active) setTransitioning(false);
      });
    return () => {
      active = false;
    };
  }, [selectedCaseId]);

  const selectedCase = useMemo<ReplayCaseSummary | null>(
    () =>
      caseList?.cases.find((item) => item.id === selectedCaseId) || null,
    [caseList, selectedCaseId],
  );

  const updateAttempt = (patch: Partial<StoredAttempt>) => {
    if (!selectedCaseId) return;
    setAttempt((current) => {
      const next = { ...current, ...patch };
      persistAttempt(selectedCaseId, next);
      return next;
    });
  };

  const lockDaily = async () => {
    if (!attempt.dailyDecision || !selectedCaseId) return;
    const next = {
      ...attempt,
      dailyLockedAt: new Date().toISOString(),
    };
    persistAttempt(selectedCaseId, next);
    setAttempt(next);
    setTransitioning(true);
    setError(null);
    try {
      setIntraday(await loadIntradayStage(selectedCaseId));
      setStage("intraday");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setTransitioning(false);
    }
  };

  const revealResult = async () => {
    if (
      !attempt.dailyDecision ||
      !attempt.intradayDecision ||
      !selectedCaseId
    ) {
      return;
    }
    setTransitioning(true);
    setError(null);
    const now = new Date().toISOString();
    const next = {
      ...attempt,
      intradayLockedAt: now,
      revealedAt: now,
    };
    try {
      const payload = await loadResultStage(
        selectedCaseId,
        attempt.dailyDecision,
        attempt.intradayDecision,
      );
      persistAttempt(selectedCaseId, next);
      setAttempt(next);
      setResult(payload);
      setStage("result");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setTransitioning(false);
    }
  };

  const resetAttempt = () => {
    if (!selectedCaseId) return;
    removeAttempt(selectedCaseId);
    setAttempt({});
    setIntraday(null);
    setResult(null);
    setStage("daily");
  };

  const exportAttempts = () => {
    const records = Object.entries(readAttemptStore())
      .filter(([, value]) => value.dailyDecision || value.intradayDecision)
      .map(([caseId, value]) => ({ caseId, ...value }));
    const blob = new Blob(
      [
        JSON.stringify(
          { exportedAt: new Date().toISOString(), records },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "trading_replay_attempts.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (loading) {
    return (
      <main className="tv-dark min-h-screen bg-[#131722] p-4 text-[#e4e6eb]">
        <div className="mx-auto max-w-[1600px] animate-pulse space-y-3">
          <div className="h-14 rounded bg-[#1e222d]" />
          <div className="h-[600px] rounded bg-[#1e222d]" />
        </div>
      </main>
    );
  }

  if (!caseList?.cases.length) {
    return (
      <main className="tv-dark min-h-screen bg-[#131722] p-4 text-[#e4e6eb]">
        <div className="mx-auto max-w-3xl rounded-md border border-[#404551] bg-[#1e222d] p-6">
          <h1 className="text-xl font-semibold">
            {normalizedTicker} の教材ケースは未作成です
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#a1a7b4]">
            指定銘柄の教材はまだありません。下の収録済み銘柄から選べます。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {caseList?.availableTickers.map((available) => (
              <Link
                key={available}
                href={`/trading/${encodeURIComponent(available)}/demo`}
                className="rounded border border-[#404551] bg-[#131722] px-3 py-2 font-sans text-xs tabular-nums text-[#4d8bff] hover:border-[#4d8bff]"
              >
                {available}
              </Link>
            ))}
          </div>
          <Link
            href="/trading"
            className="mt-6 inline-flex items-center gap-2 text-sm text-[#a1a7b4] hover:text-[#e4e6eb]"
          >
            <ArrowLeft className="h-4 w-4" />
            Tradingへ戻る
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="tv-dark min-h-screen bg-[#131722] text-[#e4e6eb]">
      <header className="border-b border-[#404551] bg-[#1e222d]">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/trading"
              className="rounded p-1.5 text-[#a1a7b4] hover:bg-[#2a2e39] hover:text-[#e4e6eb]"
              aria-label="Tradingへ戻る"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[#787d8a]">
                YMNK Trading Replay
              </div>
              <h1 className="font-sans text-lg font-semibold tabular-nums">
                {selectedCase?.ticker}{" "}
                <span className="font-sans text-sm font-normal text-[#a1a7b4]">
                  {selectedCase?.name}
                </span>
              </h1>
            </div>
            <span className="rounded border border-[#4d8bff]/40 bg-[#4d8bff]/10 px-2 py-1 font-sans text-[10px] tabular-nums text-[#75a3ff]">
              BLIND {selectedCase?.cutoff}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-[#787d8a]" htmlFor="case-date">
              対象日
            </label>
            <select
              id="case-date"
              value={selectedCaseId}
              onChange={(event) => setSelectedCaseId(event.target.value)}
              className="h-8 rounded border border-[#404551] bg-[#131722] px-2 font-sans text-xs tabular-nums text-[#e4e6eb]"
            >
              {caseList.cases.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.date}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={exportAttempts}
              className="inline-flex h-8 items-center gap-1.5 rounded border border-[#404551] bg-[#131722] px-2.5 text-xs text-[#a1a7b4] hover:text-[#e4e6eb]"
            >
              <Download className="h-3.5 w-3.5" />
              JSON
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] space-y-3 px-4 py-4">
        <StageRail stage={stage} />
        {error ? (
          <div className="rounded border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-[#ff9b9a]">
            {error}
          </div>
        ) : null}

        {stage === "daily" && daily ? (
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_390px]">
            <section className="rounded-md border border-[#404551] bg-[#1e222d] p-3">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">対象日前日までの日足</h2>
                  <p className="mt-1 text-[11px] text-[#787d8a]">
                    対象日の日足とザラ場データはまだ取得していません。
                  </p>
                </div>
                <LockKeyhole className="h-4 w-4 text-[#787d8a]" />
              </div>
              <DailyReplayChart rows={daily.daily} />
            </section>
            <aside className="rounded-md border border-[#404551] bg-[#1e222d] p-4">
              <h2 className="text-sm font-semibold">日足だけで判断</h2>
              <p className="mt-1 text-xs leading-5 text-[#a1a7b4]">
                必須回答は「買い・売り・静観」の1つだけです。
              </p>
              <div className="mt-4">
                <DailyFacts context={daily.dailyContext} />
              </div>
              <div className="mt-4 border-t border-[#404551] pt-4">
                <DecisionButtons
                  value={attempt.dailyDecision}
                  onChange={(dailyDecision) => updateAttempt({ dailyDecision })}
                />
                <textarea
                  value={attempt.note || ""}
                  onChange={(event) => updateAttempt({ note: event.target.value })}
                  placeholder="任意メモ"
                  className="mt-3 min-h-20 w-full resize-y rounded border border-[#404551] bg-[#131722] p-2 text-sm text-[#e4e6eb] placeholder:text-[#787d8a]"
                />
                <button
                  type="button"
                  disabled={!attempt.dailyDecision || transitioning}
                  onClick={() => void lockDaily()}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded bg-[#4d8bff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3d7ae8] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <LockKeyhole className="h-4 w-4" />
                  日足判断を固定して9:30へ
                </button>
              </div>
            </aside>
          </div>
        ) : null}

        {stage === "intraday" && intraday && daily ? (
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_390px]">
            <section className="rounded-md border border-[#404551] bg-[#1e222d] p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold">9:30時点のザラ場</h2>
                  <p className="mt-1 text-[11px] text-[#787d8a]">
                    9:30より後の分足・tick・当日確定値は未取得です。
                  </p>
                </div>
                <span className="rounded border border-[#404551] bg-[#131722] px-2 py-1 text-xs text-[#a1a7b4]">
                  日足判断：{" "}
                  <strong className="text-[#e4e6eb]">
                    {attempt.dailyDecision
                      ? DECISION_LABELS[attempt.dailyDecision]
                      : "—"}
                  </strong>
                </span>
              </div>
              <IntradayReplayCharts
                rows={intraday.intraday}
                tempo={intraday.tickTempo}
                cutoff={intraday.case.cutoff}
                previousClose={daily.dailyContext.previousClose}
              />
            </section>
            <aside className="rounded-md border border-[#404551] bg-[#1e222d] p-4">
              <h2 className="text-sm font-semibold">ザラ場を加えて再判断</h2>
              <p className="mt-1 text-xs leading-5 text-[#a1a7b4]">
                日足判断と異なる方向へ変更しても構いません。
              </p>
              <div className="mt-4">
                <IntradayFacts context={intraday.intradayContext} />
              </div>
              <div className="mt-4 border-t border-[#404551] pt-4">
                <DecisionButtons
                  value={attempt.intradayDecision}
                  onChange={(intradayDecision) =>
                    updateAttempt({ intradayDecision })
                  }
                />
                <textarea
                  value={attempt.note || ""}
                  onChange={(event) => updateAttempt({ note: event.target.value })}
                  placeholder="任意メモ"
                  className="mt-3 min-h-20 w-full resize-y rounded border border-[#404551] bg-[#131722] p-2 text-sm text-[#e4e6eb] placeholder:text-[#787d8a]"
                />
                <button
                  type="button"
                  disabled={!attempt.intradayDecision || transitioning}
                  onClick={() => void revealResult()}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded bg-[#4d8bff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3d7ae8] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Eye className="h-4 w-4" />
                  2つの判断を固定して結果を開く
                </button>
              </div>
            </aside>
          </div>
        ) : null}

        {stage === "result" && result && daily ? (
          <div className="space-y-3">
            <section className="rounded-md border border-[#404551] bg-[#1e222d] p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold">結果開示・全時間リプレイ</h2>
                  <p className="mt-1 text-[11px] text-[#787d8a]">
                    9:30の次に成立した実約定を仮定エントリーとしています。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetAttempt}
                  className="inline-flex items-center gap-1.5 rounded border border-[#404551] bg-[#131722] px-3 py-2 text-xs text-[#a1a7b4] hover:text-[#e4e6eb]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  このケースをやり直す
                </button>
              </div>
              <IntradayReplayCharts
                rows={result.fullIntraday}
                tempo={result.fullTickTempo}
                cutoff={result.case.cutoff}
                previousClose={daily.dailyContext.previousClose}
                revealed
                entryPrice={
                  "entryPrice" in result.outcome
                    ? result.outcome.entryPrice
                    : result.outcome.referencePrice
                }
              />
            </section>
            <ResultPanel result={result} />
          </div>
        ) : null}

        {transitioning ? (
          <div className="fixed inset-x-0 bottom-4 mx-auto flex w-fit items-center gap-2 rounded border border-[#404551] bg-[#1e222d] px-4 py-2 text-xs text-[#a1a7b4] shadow-xl">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#4d8bff]" />
            データを切り替えています
          </div>
        ) : null}
      </div>
    </main>
  );
}
