// components/stock_list_new/wrappers/ToolbarMobile.tsx
"use client";

import React from "react";
import { PRICE_LABELS } from "../constants";
import type { PriceSortKey, SortSpec, SortDir } from "../types";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SortChips } from "./SortChips";

export function ToolbarMobile({
  sorts,
  onAdd,
  onRemove,
  onReset,
}: {
  sorts: SortSpec<PriceSortKey>[];
  onAdd: (key: PriceSortKey, dir: SortDir) => void;
  onRemove: (key: PriceSortKey) => void;
  onReset: () => void;
}) {
  const [sel, setSel] = React.useState<PriceSortKey | "">("");
  const [dir, setDir] = React.useState<SortDir>("desc");

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-1">
        <Select value={sel} onValueChange={(v) => setSel(v as PriceSortKey)}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="列" />
          </SelectTrigger>
          <SelectContent align="start" className="text-sm">
            {(
              [
                "code",
                "stock_name",
                "close",
                "diff",
                "pct_diff",
                "volume",
                "vol_ma10",
              ] as PriceSortKey[]
            ).map((k) => (
              <SelectItem key={k} value={k}>
                {PRICE_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={dir} onValueChange={(v) => setDir(v as SortDir)}>
          <SelectTrigger className="h-8 w-24 text-xs">
            <SelectValue placeholder="順序" />
          </SelectTrigger>
          <SelectContent align="start" className="text-sm">
            <SelectItem value="asc">昇順</SelectItem>
            <SelectItem value="desc">降順</SelectItem>
          </SelectContent>
        </Select>

        <Button
          className="h-8 px-2 text-xs"
          onClick={() => sel && onAdd(sel, dir)}
        >
          追加
        </Button>

        <Button
          variant="secondary"
          className="h-8 px-2 text-xs ml-auto"
          onClick={onReset}
        >
          リセット
        </Button>
      </div>

      {/* チップは横スクロールで省スペース */}
      <div className="-mx-2 px-2 overflow-x-auto">
        <div className="inline-flex gap-1">
          <SortChips sorts={sorts} onRemove={onRemove} />
        </div>
      </div>
    </div>
  );
}
