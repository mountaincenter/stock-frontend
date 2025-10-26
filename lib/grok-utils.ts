// lib/grok-utils.ts
// GROK銘柄選定のタグパース用ユーティリティ

export interface ParsedGrokTags {
  category: string;
  score: number;
  isTop5: boolean;
  badges: string[];
  rawTags: string[];
}

/**
 * GROK銘柄のタグ文字列をパースする
 *
 * タグ構造:
 * - [0]: カテゴリ (例: "IR好材料+株クラバズ")
 * - [1]: 選定スコア (例: "143.5")
 * - [2]: Top5バッジ (例: "⭐Top5") ※該当時のみ
 *
 * @param tagsString カンマ区切りのタグ文字列
 * @param selectionScore 選定スコア（別フィールドで提供される場合）
 * @returns パース結果
 */
export function parseGrokTags(tagsString: string, selectionScore?: number | null): ParsedGrokTags {
  if (!tagsString) {
    return {
      category: '',
      score: selectionScore ?? 0,
      isTop5: false,
      badges: [],
      rawTags: [],
    };
  }

  const tags = tagsString.split(',').map(t => t.trim());

  return {
    category: tags[0] || '',
    score: selectionScore ?? (tags[1] ? parseFloat(tags[1]) : 0),
    isTop5: tags.includes('⭐Top5'),
    badges: tags.slice(2), // スコア以降のすべてのバッジ
    rawTags: tags,
  };
}

/**
 * GROK銘柄をスコアでソートする（降順）
 *
 * @param rows StockMetaの配列
 * @returns スコア降順にソートされた配列
 */
export function sortByGrokScore<T extends { tags?: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const scoreA = a.tags ? parseGrokTags(a.tags).score : 0;
    const scoreB = b.tags ? parseGrokTags(b.tags).score : 0;
    return scoreB - scoreA; // 降順
  });
}
