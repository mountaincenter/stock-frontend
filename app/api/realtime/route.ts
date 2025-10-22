// app/api/realtime/route.ts
import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

// YahooFinanceインスタンスを作成
const yahooFinance = new YahooFinance();

// キャッシュ（メモリ）
interface QuoteData {
  ticker: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  marketTime: string | null;
  open: number | null;
  high: number | null;
  low: number | null;
}

interface CacheEntry {
  data: QuoteData[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 15 * 60 * 1000; // 15分

// キャッシュのクリーンアップ（古いエントリを削除）
function cleanupCache() {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tickersParam = searchParams.get('tickers');
    const forceRefresh = searchParams.get('force') === 'true'; // キャッシュ無視フラグ

    if (!tickersParam) {
      return NextResponse.json(
        { error: 'tickers parameter is required' },
        { status: 400 }
      );
    }

    const tickers = tickersParam.split(',').map(t => t.trim());
    const cacheKey = tickers.sort().join(',');

    // キャッシュチェック（forceRefreshがtrueの場合はスキップ）
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`[Realtime API] Cache hit for: ${cacheKey}`);
        return NextResponse.json({
          data: cached.data,
          cached: true,
          timestamp: new Date(cached.timestamp).toISOString(),
        });
      }
    } else {
      console.log(`[Realtime API] Force refresh requested for: ${cacheKey}`);
    }

    console.log(`[Realtime API] Fetching ${tickers.length} tickers from Yahoo Finance`);

    // yahoo-finance2で株価取得（複数銘柄は個別に取得）
    const quotePromises = tickers.map(ticker =>
      yahooFinance.quote(ticker).catch(err => {
        console.error(`[Realtime API] Failed to fetch ${ticker}:`, err.message);
        return null;
      })
    );

    const quotes = await Promise.all(quotePromises);

    // データを整形（nullを除外）
    const formattedData = quotes
      .filter((quote): quote is NonNullable<typeof quote> => quote !== null)
      .map((quote, index: number): QuoteData => {
        // デバッグ用: 最初の銘柄のみログ出力
        if (index === 0) {
          console.log('[DEBUG Backend] First ticker:', quote.symbol);
          console.log('[DEBUG Backend] Raw quote data:', JSON.stringify(quote, null, 2));
          console.log('[DEBUG Backend] regularMarketTime:', quote.regularMarketTime);
          console.log('[DEBUG Backend] regularMarketTime type:', typeof quote.regularMarketTime);
        }

        // regularMarketTimeの型チェックと変換
        let marketTime = null;
        if (quote.regularMarketTime) {
          // 数値の場合（UNIXタイムスタンプ）
          if (typeof quote.regularMarketTime === 'number') {
            marketTime = new Date(quote.regularMarketTime * 1000).toISOString();
          }
          // 文字列の場合（ISO形式など）
          else if (typeof quote.regularMarketTime === 'string') {
            marketTime = new Date(quote.regularMarketTime).toISOString();
          }
          // Dateオブジェクトの場合
          else if (quote.regularMarketTime instanceof Date) {
            marketTime = quote.regularMarketTime.toISOString();
          }
        }

        return {
          ticker: quote.symbol,
          price: quote.regularMarketPrice || null,
          change: quote.regularMarketChange || null,
          changePercent: quote.regularMarketChangePercent || null,
          volume: quote.regularMarketVolume || null,
          marketTime: marketTime,
          open: quote.regularMarketOpen || null,
          high: quote.regularMarketDayHigh || null,
          low: quote.regularMarketDayLow || null,
        };
      });

    // キャッシュに保存
    cache.set(cacheKey, {
      data: formattedData,
      timestamp: Date.now(),
    });

    // 定期的にキャッシュをクリーンアップ
    cleanupCache();

    return NextResponse.json({
      data: formattedData,
      cached: false,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Realtime API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch realtime prices',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
