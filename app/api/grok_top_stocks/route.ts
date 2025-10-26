// app/api/grok_top_stocks/route.ts
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

interface TopStock {
  target_date: string;
  ticker: string;
  company_name: string;
  selection_score: number;
  rank: number;
  category: string;
  sentiment_score?: number;
  policy_link?: string;
  has_mention?: boolean;
  morning_change_pct?: number;
  daily_change_pct?: number;
}

// キャッシュ
let cachedTop5: TopStock[] | null = null;
let cachedTop10: TopStock[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1時間

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || 'top5';

    const now = Date.now();

    // キャッシュが有効ならそれを返す
    if (now - cacheTimestamp < CACHE_TTL) {
      const cachedData = category === 'top5' ? cachedTop5 : cachedTop10;
      if (cachedData) {
        console.log(`[grok_top_stocks] Returning cached data for ${category}`);
        return NextResponse.json(cachedData);
      }
    }

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

    if (!API_BASE) {
      console.error('[grok_top_stocks] NEXT_PUBLIC_API_BASE_URL is not set');
      return NextResponse.json(
        { error: 'API_BASE_URL is not configured' },
        { status: 500 }
      );
    }

    const url = `${API_BASE}/grok_top_stocks?category=${category}`;
    console.log(`[grok_top_stocks] Fetching from: ${url}`);

    const response = await fetch(url, {
      next: { revalidate: 3600 } // 1時間キャッシュ
    });

    if (!response.ok) {
      console.error(`[grok_top_stocks] API returned ${response.status}`);

      // 404の場合は空配列を返す（データがまだ生成されていない）
      if (response.status === 404) {
        return NextResponse.json([]);
      }

      return NextResponse.json(
        { error: `API returned ${response.status}` },
        { status: response.status }
      );
    }

    const data: TopStock[] = await response.json();

    // キャッシュに保存
    if (category === 'top5') {
      cachedTop5 = data;
    } else {
      cachedTop10 = data;
    }
    cacheTimestamp = now;

    console.log(`[grok_top_stocks] Fetched ${data.length} stocks for ${category}`);
    return NextResponse.json(data);

  } catch (error) {
    console.error('[grok_top_stocks] Error:', error);

    // エラー時は空配列を返す
    return NextResponse.json([]);
  }
}
