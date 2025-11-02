// app/api/grok_backtest_meta/route.ts
import { NextResponse } from 'next/server';

interface BacktestMeta {
  metric: string;
  value: string;
}

// キャッシュ
let cachedData: BacktestMeta[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1時間

export async function GET() {
  try {
    const now = Date.now();

    // キャッシュが有効ならそれを返す
    if (cachedData && (now - cacheTimestamp < CACHE_TTL)) {
      console.log('[grok_backtest_meta] Returning cached data');
      return NextResponse.json(cachedData);
    }

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

    if (!API_BASE) {
      console.error('[grok_backtest_meta] NEXT_PUBLIC_API_BASE_URL is not set');
      return NextResponse.json(
        { error: 'API_BASE_URL is not configured' },
        { status: 500 }
      );
    }

    const url = `${API_BASE}/grok_backtest_meta`;
    console.log(`[grok_backtest_meta] Fetching from: ${url}`);

    const response = await fetch(url, {
      next: { revalidate: 3600 } // 1時間キャッシュ
    });

    if (!response.ok) {
      console.error(`[grok_backtest_meta] API returned ${response.status}`);

      // 404の場合は空配列を返す（データがまだ生成されていない）
      if (response.status === 404) {
        return NextResponse.json([]);
      }

      return NextResponse.json(
        { error: `API returned ${response.status}` },
        { status: response.status }
      );
    }

    const data: BacktestMeta[] = await response.json();

    // キャッシュに保存
    cachedData = data;
    cacheTimestamp = now;

    console.log(`[grok_backtest_meta] Fetched ${data.length} metrics`);
    return NextResponse.json(data);

  } catch (error) {
    console.error('[grok_backtest_meta] Error:', error);

    // エラー時は空配列を返す（フロントエンドでバナーを非表示にする）
    return NextResponse.json([]);
  }
}
