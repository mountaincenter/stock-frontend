import React from "react";
import { PRICE_LABELS } from "../constants";
import type { PriceSortKey, SortSpec, SortDir } from "../types";
import { Button } from "@/components/ui/button"; // shadcn/ui

export function ToolbarDesktop({
  sorts,
  onAddOrToggle,
  onReset,
}: {
  sorts: SortSpec<PriceSortKey>[];
  onAddOrToggle: (key: PriceSortKey, next: SortDir) => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
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
      ).map((k) => {
        const cur = sorts.find((s) => s.key === k)?.dir;
        return (
          <div key={k} className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">
              {PRICE_LABELS[k]}
            </span>
            <Button
              size="sm"
              variant={cur === "asc" ? "default" : "outline"}
              onClick={() => onAddOrToggle(k, "asc")}
            >
              Asc
            </Button>
            <Button
              size="sm"
              variant={cur === "desc" ? "default" : "outline"}
              onClick={() => onAddOrToggle(k, "desc")}
            >
              Desc
            </Button>
          </div>
        );
      })}
      <Button
        size="sm"
        variant="secondary"
        className="ml-auto"
        onClick={onReset}
      >
        リセット
      </Button>
    </div>
  );
}
