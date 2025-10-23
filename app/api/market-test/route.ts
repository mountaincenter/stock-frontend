import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

// YahooFinanceインスタンスを作成
const yahooFinance = new YahooFinance();

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MARKET_TICKERS = [
  { symbol: '^N225', name: '日経225 (指数)' },
  { symbol: '1321.T', name: '日経225連動ETF' },
  { symbol: '^TOPX', name: 'TOPIX (指数)' },
  { symbol: '1306.T', name: 'TOPIX連動ETF' },
  { symbol: '2516.T', name: 'グロース市場ETF' },
  { symbol: 'JPY=X', name: 'ドル円' },
  { symbol: 'EURJPY=X', name: 'ユーロ円' },
];

export async function GET(_request: NextRequest) {
  try {
    console.log('[Market Test] Testing market tickers...');

    const results = [];

    // 各ティッカーを個別にテスト
    for (const ticker of MARKET_TICKERS) {
      try {
        console.log(`[Market Test] Testing: ${ticker.symbol} (${ticker.name})`);

        const quote = await yahooFinance.quote(ticker.symbol);

        results.push({
          symbol: ticker.symbol,
          name: ticker.name,
          status: 'success',
          data: {
            regularMarketPrice: quote.regularMarketPrice,
            regularMarketChange: quote.regularMarketChange,
            regularMarketChangePercent: quote.regularMarketChangePercent,
            regularMarketPreviousClose: quote.regularMarketPreviousClose,
            regularMarketTime: quote.regularMarketTime,
            currency: quote.currency,
            longName: quote.longName,
            shortName: quote.shortName,
          },
        });

        console.log(`[Market Test] ✅ ${ticker.symbol}: ${quote.regularMarketPrice}`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Market Test] ❌ ${ticker.symbol}:`, errorMessage);

        results.push({
          symbol: ticker.symbol,
          name: ticker.name,
          status: 'error',
          error: errorMessage,
        });
      }
    }

    // まとめ
    const successful = results.filter((r) => r.status === 'success');
    const failed = results.filter((r) => r.status === 'error');

    console.log(`[Market Test] Summary: ${successful.length}/${MARKET_TICKERS.length} successful`);

    return NextResponse.json(
      {
        success: true,
        summary: {
          total: MARKET_TICKERS.length,
          successful: successful.length,
          failed: failed.length,
        },
        results,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Market Test] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
