"use client";

import { Eye, TrendingDown, TrendingUp } from "lucide-react";
import type { Decision } from "./types";

const OPTIONS: Array<{
  value: Decision;
  label: string;
  description: string;
  icon: typeof TrendingUp;
}> = [
  {
    value: "buy",
    label: "買い",
    description: "上方向のエントリー",
    icon: TrendingUp,
  },
  {
    value: "sell",
    label: "売り",
    description: "下方向のエントリー",
    icon: TrendingDown,
  },
  {
    value: "wait",
    label: "静観",
    description: "条件が揃うまで見送る",
    icon: Eye,
  },
];

interface DecisionButtonsProps {
  value?: Decision;
  onChange: (decision: Decision) => void;
  disabled?: boolean;
}

export default function DecisionButtons({
  value,
  onChange,
  disabled = false,
}: DecisionButtonsProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {OPTIONS.map((option) => {
        const selected = value === option.value;
        const Icon = option.icon;
        const tone =
          option.value === "buy"
            ? "text-price-up"
            : option.value === "sell"
              ? "text-price-down"
              : "text-amber-300";
        const selectedBorder =
          option.value === "buy"
            ? "border-emerald-400/70 bg-emerald-400/10"
            : option.value === "sell"
              ? "border-red-400/70 bg-red-400/10"
              : "border-amber-300/70 bg-amber-300/10";

        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={[
              "flex min-h-20 items-center gap-3 rounded-md border px-3 py-3 text-left transition-colors",
              selected
                ? selectedBorder
                : "border-[#404551] bg-[#1e222d] hover:border-[#5d6370] hover:bg-[#262b37]",
              disabled ? "cursor-default opacity-70" : "",
            ].join(" ")}
          >
            <Icon className={`h-5 w-5 shrink-0 ${tone}`} aria-hidden="true" />
            <span>
              <span className={`block text-sm font-semibold ${tone}`}>
                {option.label}
              </span>
              <span className="mt-1 block text-[11px] leading-4 text-[#a1a7b4]">
                {option.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
