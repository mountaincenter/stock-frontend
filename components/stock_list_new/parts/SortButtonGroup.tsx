"use client";

import "./sort-toggle.css";
import React from "react";
import { cn } from "@/lib/utils";
import type { SortDirection } from "../utils/sort";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

interface SortButtonGroupProps<K extends string> {
  columnKey: K;
  label: React.ReactNode;
  activeKey: K | null;
  direction: SortDirection;
  onSort: (key: K, direction: SortDirection) => void;
  align?: "left" | "center" | "right";
  className?: string;
  defaultAscending?: boolean;
  tooltip?: {
    description: string;
    formula?: string;
  };
}

export function SortButtonGroup<K extends string>({
  columnKey,
  label,
  activeKey,
  direction,
  onSort,
  align = "right",
  className,
  defaultAscending = false,
  tooltip,
}: SortButtonGroupProps<K>) {
  const isActive = activeKey === columnKey;
  const current: SortDirection = isActive ? direction : null;

  const nextDirection = (prev: SortDirection): SortDirection => {
    if (defaultAscending) {
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
      <span className="whitespace-nowrap flex items-center gap-1">
        {label}
        {tooltip && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center opacity-60 hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <HelpCircle className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-xs text-xs bg-popover/95 backdrop-blur-sm"
              >
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    {tooltip.description}
                  </p>
                  {tooltip.formula && (
                    <p className="text-muted-foreground font-mono text-[11px]">
                      {tooltip.formula}
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </span>
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
