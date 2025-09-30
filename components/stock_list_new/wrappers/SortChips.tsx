// components/stock_list_new/ui/SortChips.tsx
import React from "react";
import { X } from "lucide-react";
import type { SortSpec } from "../types";

type Props<K extends string> = {
  sorts: SortSpec<K>[];
  onRemove: (key: K) => void;
  /** キー→表示名の辞書（未指定キーは key 文字列をそのまま表示） */
  labels?: Partial<Record<K, string>>;
};

export function SortChips<K extends string>({
  sorts,
  onRemove,
  labels,
}: Props<K>) {
  if (!sorts.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {sorts.map((s) => {
        const label = labels?.[s.key] ?? String(s.key);
        return (
          <button
            key={String(s.key)}
            type="button"
            onClick={() => onRemove(s.key)}
            className="px-2 py-1 rounded-full bg-slate-700/60 text-xs text-slate-200 inline-flex items-center gap-1"
            aria-label={`${label} のソートを解除`}
          >
            <span>
              {label} : {s.dir}
            </span>
            <X className="w-3 h-3" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
