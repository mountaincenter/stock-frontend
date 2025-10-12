"use client";

import "./sort-toggle.css";
import React from "react";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
  SelectItem,
} from "@/components/ui/select";
import type { SortDirection, SortableColumn } from "../utils/sort";

interface MobileSortToolbarProps<K extends string> {
  columns: SortableColumn<K>[];
  activeKey: K | null;
  direction: SortDirection;
  onSort: (key: K, direction: SortDirection) => void;
}

export function MobileSortToolbar<K extends string>({
  columns,
  activeKey,
  direction,
  onSort,
}: MobileSortToolbarProps<K>) {
  if (!columns.length) return null;

  const selectedKey = activeKey ?? columns[0].key;

  const handleSelectChange = (value: string) => {
    const key = value as K;
    // カラムが変更された際は、そのカラムのデフォルト方向を使用
    const defaultAsc = key === "code" || key === "stock_name";
    onSort(key, defaultAsc ? "asc" : "desc");
  };

  const current: SortDirection = activeKey === selectedKey ? direction : null;

  const nextDirection = (prev: SortDirection, key: K): SortDirection => {
    const defaultAsc = key === "code" || key === "stock_name";
    if (defaultAsc) {
      // 昇順デフォルト: null → asc → desc → null
      if (prev === "asc") return "desc";
      if (prev === "desc") return null;
      return "asc";
    } else {
      // 降順デフォルト: null → desc → asc → null
      if (prev === "desc") return "asc";
      if (prev === "asc") return null;
      return "desc";
    }
  };

  const handleCycle = () => {
    const next = nextDirection(current, selectedKey);
    onSort(selectedKey, next);
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/50 bg-card/50 p-2">
      <div className="flex items-center gap-2">
        <Select value={selectedKey} onValueChange={handleSelectChange}>
          <SelectTrigger className="h-8 flex-1 rounded-full border-border/50 bg-card/60 text-xs shadow-none focus-visible:ring-0 focus-visible:ring-offset-0">
            <SelectValue placeholder="ソート対象" />
          </SelectTrigger>
          <SelectContent>
            {columns.map((column) => (
              <SelectItem key={column.key} value={column.key}>
                {column.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          type="button"
          onClick={handleCycle}
          className={`sort-toggle sort-toggle--lg${current ? " sort-toggle--active" : ""}`}
          aria-label="ソート順を切り替え"
          data-state={current ?? "none"}
        >
          <span className="sr-only">sort indicator</span>
        </button>
      </div>
    </div>
  );
}
