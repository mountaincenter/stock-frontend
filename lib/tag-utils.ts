export type CanonicalTag = "高市銘柄" | "TOPIX_CORE30";

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
): "takaichi" | "core30" | undefined {
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
  return undefined;
}

export interface MetaLike {
  ticker?: string | null;
  code?: string | null;
  stock_name?: string | null;
  tag1?: string | null;
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
  if (!trimmed) return meta;

  const canonical = canonicalizeTag(trimmed);
  const acceptable: Set<string> = new Set();
  const lowered = trimmed.toLowerCase();
  acceptable.add(lowered);
  if (canonical) acceptable.add(canonical.toLowerCase());

  let hasTagInfo = false;
  const filtered = meta.filter((item) => {
    const tagCandidates = [
      item.tag1,
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
