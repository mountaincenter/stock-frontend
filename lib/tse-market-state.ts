/**
 * 東証マーケット状態判定ユーティリティ
 * J-Quantsカレンダーデータを使用して営業日判定
 */

export type TseMarketState = "PRE" | "REGULAR" | "BREAK" | "CLOSED";

interface TradingCalendar {
  generated_at: string;
  period: { from: string; to: string };
  business_days: string[];
}

// カレンダーデータのキャッシュ
let calendarCache: Set<string> | null = null;

/**
 * カレンダーデータを読み込み（キャッシュ付き）
 */
async function loadCalendar(): Promise<Set<string>> {
  if (calendarCache) return calendarCache;

  try {
    const res = await fetch("/data/trading-calendar.json");
    if (!res.ok) throw new Error("Calendar fetch failed");
    const data: TradingCalendar = await res.json();
    calendarCache = new Set(data.business_days);
    return calendarCache;
  } catch (e) {
    console.error("Failed to load trading calendar:", e);
    // フォールバック: 土日のみ除外（祝日は判定できない）
    return new Set();
  }
}

/**
 * 指定日が営業日かどうか判定
 */
export async function isBusinessDay(date: Date = new Date()): Promise<boolean> {
  const calendar = await loadCalendar();

  // カレンダーが空の場合はフォールバック（土日除外のみ）
  if (calendar.size === 0) {
    const day = date.getDay();
    return day !== 0 && day !== 6;
  }

  const dateStr = formatDateJST(date);
  return calendar.has(dateStr);
}

/**
 * 日付を YYYY-MM-DD 形式（JST）でフォーマット
 */
function formatDateJST(date: Date): string {
  const jst = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const year = jst.getFullYear();
  const month = String(jst.getMonth() + 1).padStart(2, "0");
  const day = String(jst.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 現在時刻を HHmm 形式（JST）で取得
 */
function getTimeJST(date: Date = new Date()): number {
  const jst = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  return jst.getHours() * 100 + jst.getMinutes();
}

/**
 * 東証マーケット状態を取得
 *
 * - PRE: 営業日 8:00-9:00（寄付前）
 * - REGULAR: 営業日 前場 9:00-11:30 / 後場 12:30-15:00
 * - BREAK: 営業日 昼休み 11:30-12:30
 * - CLOSED: 上記以外（休場）
 */
export async function getTseMarketState(date: Date = new Date()): Promise<TseMarketState> {
  const isBizDay = await isBusinessDay(date);

  if (!isBizDay) {
    return "CLOSED";
  }

  const time = getTimeJST(date);

  // 前場: 9:00-11:30
  if (time >= 900 && time < 1130) {
    return "REGULAR";
  }

  // 昼休み: 11:30-12:30
  if (time >= 1130 && time < 1230) {
    return "BREAK";
  }

  // 後場: 12:30-15:00
  if (time >= 1230 && time < 1500) {
    return "REGULAR";
  }

  // 寄付前: 8:00-9:00
  if (time >= 800 && time < 900) {
    return "PRE";
  }

  return "CLOSED";
}

/**
 * 同期版（カレンダーキャッシュ済み前提）
 * 初回ロード後に使用可能
 */
export function getTseMarketStateSync(date: Date = new Date()): TseMarketState {
  if (!calendarCache) {
    // キャッシュがない場合は土日のみ判定
    const day = date.getDay();
    if (day === 0 || day === 6) return "CLOSED";
  } else {
    const dateStr = formatDateJST(date);
    if (!calendarCache.has(dateStr)) return "CLOSED";
  }

  const time = getTimeJST(date);

  if (time >= 900 && time < 1130) return "REGULAR";
  if (time >= 1130 && time < 1230) return "BREAK";
  if (time >= 1230 && time < 1500) return "REGULAR";
  if (time >= 800 && time < 900) return "PRE";

  return "CLOSED";
}

/**
 * カレンダーを事前ロード（アプリ起動時に呼び出し推奨）
 */
export async function preloadCalendar(): Promise<void> {
  await loadCalendar();
}

/**
 * マーケット状態の日本語ラベル
 */
export function getMarketStateLabel(state: TseMarketState): string {
  switch (state) {
    case "PRE":
      return "寄付前";
    case "REGULAR":
      return "取引中";
    case "BREAK":
      return "昼休み";
    case "CLOSED":
      return "閉場";
  }
}
