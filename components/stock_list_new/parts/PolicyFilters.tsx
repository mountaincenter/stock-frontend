"use client";

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PolicyFiltersProps {
  options: string[];
  selected: string[];
  onToggle: (value: string, checked: boolean) => void;
  onReset: () => void;
}

export function PolicyFilters({ options, selected, onToggle, onReset }: PolicyFiltersProps) {
  if (!options.length) return null;

  const selectedSet = new Set(selected);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/40 bg-card/40 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
          Policy Tags
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 rounded-full px-3 text-xs text-muted-foreground/70 transition-colors hover:text-primary"
          onClick={onReset}
          disabled={selected.length === 0}
        >
          クリア
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = selectedSet.has(option);
          return (
            <label
              key={option}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/60 px-3.5 py-1.5 text-xs text-muted-foreground/80 shadow-sm transition-all hover:border-primary/60 hover:text-primary",
                checked && "border-primary/70 bg-primary/5 text-primary"
              )}
            >
              <Checkbox
                checked={checked}
                onCheckedChange={(value) => onToggle(option, Boolean(value))}
                className="h-3.5 w-3.5 rounded-full border-border/50 data-[state=checked]:border-primary data-[state=checked]:bg-primary/80"
              />
              <span className="whitespace-nowrap">{option}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
