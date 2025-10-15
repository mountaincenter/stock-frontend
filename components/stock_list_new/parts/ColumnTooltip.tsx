// components/stock_list_new/parts/ColumnTooltip.tsx
import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

interface ColumnTooltipProps {
  label: string;
  description: string;
  formula?: string;
  className?: string;
}

export function ColumnTooltip({
  label,
  description,
  formula,
  className,
}: ColumnTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors ${
              className ?? ""
            }`}
          >
            {label}
            <HelpCircle className="h-3 w-3 opacity-60" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs text-xs bg-popover/95 backdrop-blur-sm"
        >
          <div className="space-y-1">
            <p className="font-medium text-foreground">{description}</p>
            {formula && (
              <p className="text-muted-foreground font-mono text-[11px]">
                {formula}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
