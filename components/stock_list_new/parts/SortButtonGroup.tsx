"use client";

import "./sort-toggle.css";
import React from "react";
import { cn } from "@/lib/utils";
import type { SortDirection } from "../utils/sort";

interface SortButtonGroupProps<K extends string> {
  columnKey: K;
  label: React.ReactNode;
  activeKey: K | null;
  direction: SortDirection;
  onSort: (key: K, direction: SortDirection) => void;
  align?: "left" | "center" | "right";
  className?: string;
}

export function SortButtonGroup<K extends string>({
  columnKey,
  label,
  activeKey,
  direction,
  onSort,
  align = "right",
  className,
}: SortButtonGroupProps<K>) {
  const isActive = activeKey === columnKey;
  const current: SortDirection = isActive ? direction : null;

  const nextDirection = (prev: SortDirection): SortDirection => {
    if (prev === "asc") return "desc";
    if (prev === "desc") return null;
    return "asc";
  };

  const handleCycle = () => {
    const next = nextDirection(current);
    onSort?.(columnKey, next);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs text-muted-foreground",
        align === "center" && "justify-center",
        align === "left" && "justify-start",
        align === "right" && "justify-end",
        className
      )}
    >
      <span className="whitespace-nowrap">{label}</span>
      <button
        type="button"
        onClick={handleCycle}
        className={cn("sort-toggle", current && "sort-toggle--active")}
        aria-label={`${label} の並び替えを切り替え`}
        data-state={current ?? "none"}
      >
        <span className="sr-only">sort indicator</span>
      </button>
    </div>
  );
}
