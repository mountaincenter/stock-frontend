"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Crosshair,
  Gauge,
  Target,
} from "lucide-react";
import type {
  Decision,
  ResultStageResponse,
  SideOutcome,
  WaitOutcome,
} from "./types";

export const DECISION_LABELS: Record<Decision, string> = {
  buy: "買い",
  sell: "売り",
  wait: "静観",
};

function isSideOutcome(
  outcome: SideOutcome | WaitOutcome,
): outcome is SideOutcome {
  return "side" in outcome;
}

function money(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}¥${Math.round(value).toLocaleString("ja-JP")}`;
}

function price(value: number): string {
  return `¥${value.toLocaleString("ja-JP", {
    maximumFractionDigits: 1,
  })}`;
}

function time(value: string | null): string {
  return value ? value.slice(11, 19) : "—";
}

function profitIntervalLabel(
  interval: { start: string; end: string },
  closeTime: string,
): string {
  if (interval.start >= closeTime) {
    return `${time(closeTime)}（大引け）`;
  }
  const boundedEnd = interval.end > closeTime ? closeTime : interval.end;
  return `${time(interval.start)}–${time(boundedEnd)}`;
}

function pnlTone(value: number): string {
  if (value > 0) return "text-price-up";
  if (value < 0) return "text-price-down";
  return "text-[#a1a7b4]";
}

function Metric({
  label,
  value,
  sub,
  tone = "text-[#e4e6eb]",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-md border border-[#404551] bg-[#1e222d] px-3 py-3">
      <div className="text-[11px] text-[#a1a7b4]">{label}</div>
      <div className={`mt-1 font-mono text-lg font-semibold ${tone}`}>{value}</div>
      {sub ? <div className="mt-1 text-[11px] text-[#787d8a]">{sub}</div> : null}
    </div>
  );
}

interface ResultPanelProps {
  result: ResultStageResponse;
}

export default function ResultPanel({ result }: ResultPanelProps) {
  const { outcome, guidance, decisions } = result;
  const dailyMatch = decisions.daily === guidance.daily;
  const intradayMatch = decisions.intraday === guidance.intraday;

  return (
    <div className="space-y-4">
      <section className="rounded-md border border-[#404551] bg-[#1e222d] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-[#787d8a]">
              Judgment review
            </div>
            <h2 className="mt-1 text-lg font-semibold text-[#e4e6eb]">
              {guidance.pattern}
            </h2>
            <p className="mt-1 text-sm text-[#a1a7b4]">{guidance.lesson}</p>
          </div>
          <CheckCircle2 className="h-5 w-5 shrink-0 text-[#4d8bff]" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded border border-[#404551] bg-[#131722] p-3">
            <div className="text-[11px] text-[#787d8a]">日足判断</div>
            <div className="mt-1 text-sm font-semibold text-[#e4e6eb]">
              自分：{DECISION_LABELS[decisions.daily]}
            </div>
            <div className="mt-1 text-xs text-[#a1a7b4]">
              教材：{DECISION_LABELS[guidance.daily]} {dailyMatch ? "一致" : "相違"}
            </div>
          </div>
          <div className="rounded border border-[#404551] bg-[#131722] p-3">
            <div className="text-[11px] text-[#787d8a]">9:30判断</div>
            <div className="mt-1 text-sm font-semibold text-[#e4e6eb]">
              自分：{DECISION_LABELS[decisions.intraday]}
            </div>
            <div className="mt-1 text-xs text-[#a1a7b4]">
              教材：{DECISION_LABELS[guidance.intraday]}{" "}
              {intradayMatch ? "一致" : "相違"}
            </div>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-[#c7cbd3]">
          {guidance.rationale}
        </p>
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
          <div className="flex gap-2 rounded border border-[#404551] bg-[#131722] p-3 text-[#a1a7b4]">
            <Crosshair className="mt-0.5 h-4 w-4 shrink-0 text-[#31c5d8]" />
            <span>
              <strong className="block text-[#e4e6eb]">否定条件</strong>
              {guidance.invalidation}
            </span>
          </div>
          <div className="flex gap-2 rounded border border-[#404551] bg-[#131722] p-3 text-[#a1a7b4]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#f5a623]" />
            <span>
              <strong className="block text-[#e4e6eb]">注意</strong>
              {guidance.warning}
            </span>
          </div>
        </div>
      </section>

      {isSideOutcome(outcome) ? (
        <SideResult outcome={outcome} />
      ) : (
        <WaitResult outcome={outcome} />
      )}
    </div>
  );
}

function SideResult({ outcome }: { outcome: SideOutcome }) {
  const orderLabels = {
    neither: "どちらも未到達",
    "plus-first": "+5,000円が先",
    "stop-first": "SLが先",
    "same-time": "同時刻",
  };

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        <Metric
          label="仮定エントリー"
          value={price(outcome.entryPrice)}
          sub={`${time(outcome.entryTime)}・100株`}
        />
        <Metric
          label="大引け損益"
          value={money(outcome.closePnl)}
          sub={`${time(outcome.closeTime)} @ ${price(outcome.closePrice)}`}
          tone={pnlTone(outcome.closePnl)}
        />
        <Metric
          label="MFE"
          value={money(outcome.mfe)}
          sub={time(outcome.mfeTime)}
          tone={pnlTone(outcome.mfe)}
        />
        <Metric
          label="MAE"
          value={money(outcome.mae)}
          sub={time(outcome.maeTime)}
          tone={pnlTone(outcome.mae)}
        />
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <div className="flex gap-3 rounded-md border border-[#404551] bg-[#1e222d] p-3">
          <Target className="h-5 w-5 shrink-0 text-[#f06563]" />
          <div>
            <div className="text-xs text-[#a1a7b4]">5,000円SL到達</div>
            <div className="mt-1 text-sm font-semibold text-[#e4e6eb]">
              {outcome.stopReached ? `到達 ${time(outcome.stopTime)}` : "未到達"}
            </div>
            <div className="mt-1 text-[11px] text-[#787d8a]">
              水準 {price(outcome.stopLevel)}
            </div>
          </div>
        </div>
        <div className="flex gap-3 rounded-md border border-[#404551] bg-[#1e222d] p-3">
          <Gauge className="h-5 w-5 shrink-0 text-[#f5a623]" />
          <div>
            <div className="text-xs text-[#a1a7b4]">SL / +5,000円</div>
            <div className="mt-1 text-sm font-semibold text-[#e4e6eb]">
              {orderLabels[outcome.stopVsPlusOrder]}
            </div>
            <div className="mt-1 text-[11px] text-[#787d8a]">
              +5,000円 {time(outcome.plus5000Time)}
            </div>
          </div>
        </div>
        <div className="flex gap-3 rounded-md border border-[#404551] bg-[#1e222d] p-3">
          <Clock3 className="h-5 w-5 shrink-0 text-[#31c5d8]" />
          <div>
            <div className="text-xs text-[#a1a7b4]">初めて含み益</div>
            <div className="mt-1 text-sm font-semibold text-[#e4e6eb]">
              {time(outcome.firstProfitTime)}
            </div>
            <div className="mt-1 text-[11px] text-[#787d8a]">
              プラス観測 {outcome.positiveMinutes}分
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-[#404551] bg-[#1e222d] p-3">
        <div className="text-xs font-semibold text-[#e4e6eb]">
          含み益だった時間帯
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {outcome.profitIntervals.length ? (
            outcome.profitIntervals.map((interval) => (
              <span
                key={`${interval.start}-${interval.end}`}
                className="rounded border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 font-mono text-[11px] text-price-up"
              >
                {profitIntervalLabel(interval, outcome.closeTime)}
              </span>
            ))
          ) : (
            <span className="text-xs text-[#787d8a]">該当なし</span>
          )}
        </div>
      </div>
    </section>
  );
}

function WaitResult({ outcome }: { outcome: WaitOutcome }) {
  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        <Metric
          label="9:30後の基準価格"
          value={price(outcome.referencePrice)}
          sub={time(outcome.referenceTime)}
        />
        <Metric
          label="最大上昇余地"
          value={money(outcome.maxUp100Shares)}
          sub={time(outcome.maxUpTime)}
          tone="text-price-up"
        />
        <Metric
          label="最大下落余地"
          value={money(outcome.maxDown100Shares)}
          sub={time(outcome.maxDownTime)}
          tone="text-price-down"
        />
        <Metric
          label="大引けまでの変化"
          value={money(outcome.closeChange100Shares)}
          sub={`${time(outcome.closeTime)} @ ${price(outcome.closePrice)}`}
          tone={pnlTone(outcome.closeChange100Shares)}
        />
      </div>
      <p className="rounded-md border border-[#404551] bg-[#1e222d] p-3 text-xs leading-5 text-[#a1a7b4]">
        静観では仮想ポジションを建てません。上昇・下落余地は、見送った後の値幅を振り返る参考値です。
      </p>
    </section>
  );
}
