// lib/market-hours.ts
import tradingCalendarData from '@/data/trading_calendar.json';

interface TradingDay {
  Date: string;
  HolidayDivision: string;
}

interface TradingCalendarData {
  trading_calendar: TradingDay[];
}

/**
 * 営業日カレンダーをキャッシュ
 */
let tradingDaysCache: Set<string> | null = null;

/**
 * ローカルファイルから営業日カレンダーを取得（同期処理）
 */
function getTradingDays(): Set<string> {
  // キャッシュがあれば返す
  if (tradingDaysCache) {
    return tradingDaysCache;
  }

  // HolidayDivision が "1" の日付のみ抽出
  const data = tradingCalendarData as TradingCalendarData;
  tradingDaysCache = new Set(
    data.trading_calendar
      .filter(day => day.HolidayDivision === "1")
      .map(day => day.Date)
  );

  return tradingDaysCache;
}

/**
 * 指定日が営業日かチェック
 */
export function isTradingDay(date?: Date): boolean {
  const tradingDays = getTradingDays();
  const targetDate = date || new Date();
  const dateStr = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD
  return tradingDays.has(dateStr);
}

/**
 * 指定時刻がデータ取得可能時間（9:00-16:00 JST）かチェック
 * 大引け15:30 + 20分遅延 = 16:00まで取得可能
 */
export function isMarketHours(date?: Date): boolean {
  const now = date || new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  // 9:00-16:00 (大引け15:30のデータは20分遅延で16:00に取得可能)
  if (hour === 9 && minute >= 0) return true;
  if (hour > 9 && hour < 16) return true;
  if (hour === 16 && minute === 0) return true;

  return false;
}

/**
 * リアルタイム株価を取得すべきかチェック
 * - 営業日 && データ取得可能時間（9:00-16:00）の場合のみtrue
 * - 開発環境では常にtrueを返す（時間制限を無効化）
 */
export function shouldFetchRealtimePrice(date?: Date): boolean {
  // 開発環境では常にtrueを返す（16時以降も取得可能）
  console.log('[Market Hours] Development mode: Always allowing realtime fetch');
  return true;

  // 本番環境用のコード（コメントアウト）
  // const targetDate = date || new Date();
  // const isTradingDayToday = isTradingDay(targetDate);
  // const isMarketOpen = isMarketHours(targetDate);
  // console.log('[Market Hours] Trading day:', isTradingDayToday, '| Market hours:', isMarketOpen);
  // return isTradingDayToday && isMarketOpen;
}

/**
 * 営業時間の詳細ステータスを取得
 */
export function getMarketStatus(date?: Date): {
  isTradingDay: boolean;
  isMarketHours: boolean;
  shouldFetchRealtime: boolean;
  status: 'open' | 'closed' | 'holiday';
  message: string;
} {
  const targetDate = date || new Date();
  const isTradingDayValue = isTradingDay(targetDate);
  const isMarketHoursValue = isMarketHours(targetDate);
  const shouldFetch = isTradingDayValue && isMarketHoursValue;

  let status: 'open' | 'closed' | 'holiday';
  let message: string;

  if (!isTradingDayValue) {
    status = 'holiday';
    message = '本日は休場日です';
  } else if (isMarketHoursValue) {
    status = 'open';
    message = 'データ取得可能時間です (9:00-16:00)';
  } else {
    status = 'closed';
    message = 'データ取得時間外です';
  }

  return {
    isTradingDay: isTradingDayValue,
    isMarketHours: isMarketHoursValue,
    shouldFetchRealtime: shouldFetch,
    status,
    message,
  };
}
