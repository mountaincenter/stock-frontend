// components/stock_list_new/parts/DensitySelector.tsx
"use client";

import * as React from "react";
import { Maximize2, Minimize2, Square } from "lucide-react";
import type { DisplayDensity } from "../types/density";
import { DENSITY_LABELS } from "../types/density";

type Props = {
  value: DisplayDensity;
  onChange: (density: DisplayDensity) => void;
};

const DENSITY_OPTIONS: Array<{
  value: DisplayDensity;
  icon: React.ReactNode;
  label: string;
}> = [
  {
    value: "compact",
    icon: <Minimize2 className="w-3.5 h-3.5" />,
    label: DENSITY_LABELS.compact,
  },
  {
    value: "normal",
    icon: <Square className="w-3.5 h-3.5" />,
    label: DENSITY_LABELS.normal,
  },
  {
    value: "comfortable",
    icon: <Maximize2 className="w-3.5 h-3.5" />,
    label: DENSITY_LABELS.comfortable,
  },
];

export function DensitySelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 bg-muted/30 backdrop-blur-sm border border-border/40 rounded-xl p-1 h-10 shadow-lg shadow-black/5">
      {DENSITY_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`
            flex items-center gap-1.5 px-3 h-8 rounded-lg
            text-[13px] font-medium transition-all duration-200
            ${
              value === option.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground/70 hover:text-foreground/80"
            }
          `}
          title={option.label}
        >
          {option.icon}
          <span className="hidden lg:inline">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
