export type CanonicalTag = "高市銘柄" | "TOPIX_CORE30" | "SCALPING_ENTRY" | "SCALPING_ACTIVE" | "GROK";

const TAG_CANONICAL_MAP: Record<string, CanonicalTag> = {
  takaichi: "高市銘柄",
  takaichi_stock: "高市銘柄",
  "高市": "高市銘柄",
  "高市銘柄": "高市銘柄",
  core30: "TOPIX_CORE30",
  "topix core30": "TOPIX_CORE30",
  topix: "TOPIX_CORE30",
  topix_core30: "TOPIX_CORE30",
  topixcore30: "TOPIX_CORE30",
  TOPIX_CORE30: "TOPIX_CORE30",
  scalping_entry: "SCALPING_ENTRY",
  scalping_active: "SCALPING_ACTIVE",
  SCALPING_ENTRY: "SCALPING_ENTRY",
  SCALPING_ACTIVE: "SCALPING_ACTIVE",
  "スキャルピング entry": "SCALPING_ENTRY",
  "スキャルピング active": "SCALPING_ACTIVE",
  grok: "GROK",
  grok_trending: "GROK",
  "grok トレンド": "GROK",
  "grokトレンド": "GROK",
  "GROK トレンド": "GROK",
  "GROKトレンド": "GROK",
  GROK: "GROK",
};

export function canonicalizeTag(tag?: string): CanonicalTag | undefined {
  if (!tag) return undefined;
  const trimmed = tag.trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase();
  return TAG_CANONICAL_MAP[lower] ?? TAG_CANONICAL_MAP[trimmed] ?? undefined;
}

export function normalizeSelectTag(
  value?: string
): "takaichi" | "core30" | "grok" | "all" | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase();
  if (
    lower === "takaichi" ||
    lower === "takaichi_stock" ||
    trimmed === "高市銘柄" ||
    trimmed === "高市"
  ) {
    return "takaichi";
  }
  if (
    lower === "core30" ||
    lower === "topix_core30" ||
    lower === "topixcore30" ||
    lower === "topix" ||
    lower === "topix core30" ||
    trimmed === "TOPIX_CORE30" ||
    trimmed === "TOPIX Core30"
  ) {
    return "core30";
  }
  if (
    lower === "grok" ||
    lower === "grok_trending" ||
    lower === "grok トレンド" ||
    lower === "grokトレンド" ||
    trimmed === "GROK" ||
    trimmed === "GROK トレンド" ||
    trimmed === "GROKトレンド"
  ) {
    return "grok";
  }
  if (lower === "all" || trimmed === "全て") {
    return "all";
  }
  return undefined;
}

export interface MetaLike {
  ticker?: string | null;
  code?: string | null;
  stock_name?: string | null;
  categories?: string[] | null;
  tags?: string[] | null;
  tag?: string | null;
  tag_primary?: string | null;
}

export function filterMetaByTag<T extends MetaLike>(
  meta: T[],
  tag?: string,
  options: { allowMissingTagInfo?: boolean } = {}
): T[] {
  if (!tag) return meta;

  const trimmed = tag.trim();
  if (!trimmed || trimmed.toLowerCase() === "all") return meta;

  const canonical = canonicalizeTag(trimmed);
  const acceptable: Set<string> = new Set();
  const lowered = trimmed.toLowerCase();
  acceptable.add(lowered);
  if (canonical) acceptable.add(canonical.toLowerCase());

  let hasTagInfo = false;
  const filtered = meta.filter((item) => {
    // categories と tags を配列として展開
    const categoriesArray = Array.isArray(item.categories) ? item.categories : [];
    const tagsArray = Array.isArray(item.tags) ? item.tags : [];

    const tagCandidates = [
      ...categoriesArray,
      ...tagsArray,
      (item as Record<string, unknown>).tag,
      (item as Record<string, unknown>).tag_primary,
    ]
      .map((value) =>
        value == null ? "" : String(value).trim()
      )
      .filter((value) => value !== "");

    if (tagCandidates.length === 0) {
      return false;
    }
    hasTagInfo = true;
    return tagCandidates.some((candidate) => {
      const lower = candidate.toLowerCase();
      return acceptable.has(lower) || acceptable.has(candidate);
    });
  });

  if (!hasTagInfo) {
    return options.allowMissingTagInfo ? meta : [];
  }
  return filtered;
}

export function pickAllowedTickers(meta: MetaLike[]): Set<string> {
  const allowed = new Set<string>();
  meta.forEach((item) => {
    const ticker = item.ticker;
    if (!ticker) return;
    allowed.add(String(ticker));
  });
  return allowed;
}
