// components/stock_list_new/parts/GrokTags.tsx
"use client";

import React from "react";
import { parseGrokTags } from "@/lib/grok-utils";
import { cn } from "@/lib/utils";

interface GrokTagsProps {
  tags: string | string[] | null;
  selectionScore?: number | null;  // GROK stocks have this as a separate field
  className?: string;
}

/**
 * GROK銘柄のタグを表示するコンポーネント
 * - カテゴリタグ
 * - スコア (小さく表示)
 * - Top5バッジ (primary色で強調)
 */
export function GrokTags({ tags, selectionScore, className }: GrokTagsProps) {
  if (!tags) return null;

  // tagsが配列の場合は最初の要素、文字列の場合はそのまま使用
  const tagsString = Array.isArray(tags) ? tags[0] || "" : tags;
  const parsed = parseGrokTags(tagsString, selectionScore);

  if (!parsed.category && !parsed.score && !parsed.isTop5) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {/* カテゴリタグ */}
      {parsed.category && (
        <span className="inline-flex items-center rounded-full border border-border/50 bg-card/60 px-2.5 py-0.5 text-[10px] text-muted-foreground/80">
          {parsed.category}
        </span>
      )}

      {/* スコア */}
      {parsed.score > 0 && (
        <span className="inline-flex items-center rounded-full bg-muted/40 px-2 py-0.5 text-[9px] font-mono text-muted-foreground/60">
          {parsed.score.toFixed(1)}
        </span>
      )}

      {/* Top5バッジ */}
      {parsed.isTop5 && (
        <span className="inline-flex items-center rounded-full border border-primary/70 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
          ⭐ Top5
        </span>
      )}
    </div>
  );
}
