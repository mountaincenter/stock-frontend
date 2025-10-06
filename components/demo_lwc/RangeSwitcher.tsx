"use client";

import type { RangeKey } from "./types";
import { RANGE_LABELS } from "./types";

/** UI だけ（SRP） */
export function RangeSwitcher({
  value,
  onChange,
}: {
  value: RangeKey;
  onChange: (v: RangeKey) => void;
}) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1 rounded-full border px-1 py-1">
      {RANGE_LABELS.map((key) => {
        const active = key === value;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={[
              "px-3 py-1 text-xs rounded-full transition-colors",
              active
                ? "bg-foreground text-background"
                : "hover:bg-black/5 dark:hover:bg-white/10",
            ].join(" ")}
          >
            {key}
          </button>
        );
      })}
    </div>
  );
}
