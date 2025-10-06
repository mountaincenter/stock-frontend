/** API ベースURL（.env で設定済み前提） */
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!;

/** クエリは常に YYYY-MM-DD のみを送る */
export function fmtDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function startOfYTD(today = new Date()) {
  return new Date(today.getFullYear(), 0, 1);
}

/** ISO/日付文字列 → UTCTimestamp 秒（LWC推奨） */
export function toUtcSeconds(t: string): number {
  return Math.floor(new Date(t).getTime() / 1000);
}
