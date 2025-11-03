// app/api/grok/backtest-dashboard/route.ts
import { NextResponse } from 'next/server';
import type { DashboardData } from '@/lib/grok-backtest-types';

// キャッシュ（Phaseごと）
let cachedData: Record<string, DashboardData> = {};
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5分

export async function GET(request: Request) {
  try {
    const now = Date.now();

    // URLからphaseパラメータを取得
    const { searchParams } = new URL(request.url);
    const phase = searchParams.get('phase') || 'phase1';

    // Phaseごとにキャッシュを分ける
    const cacheKey = phase;
    if (cachedData && cachedData[cacheKey] && (now - cacheTimestamp < CACHE_TTL)) {
      console.log(`[backtest-dashboard] Returning cached data for ${phase}`);
      return NextResponse.json(cachedData[cacheKey]);
    }

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

    if (!API_BASE) {
      console.error('[backtest-dashboard] NEXT_PUBLIC_API_BASE_URL is not set');
      return NextResponse.json(
        { error: 'API_BASE_URL is not configured' },
        { status: 500 }
      );
    }

    // バックエンドの包括的なサマリーエンドポイントを使用
    const url = `${API_BASE}/api/dev/backtest/summary?phase=${phase}`;
    console.log(`[backtest-dashboard] Fetching from: ${url}`);

    const response = await fetch(url, {
      next: { revalidate: 300 } // 5分キャッシュ
    });

    if (!response.ok) {
      console.error(`[backtest-dashboard] API returned ${response.status}`);

      if (response.status === 404) {
        // データがまだない場合は空のダッシュボードを返す
        return NextResponse.json({
          overall_stats: {
            total_count: 0,
            valid_count: 0,
            win_count: 0,
            lose_count: 0,
            win_rate: 0,
            avg_return: 0,
            median_return: 0,
            std_return: 0,
            best_return: 0,
            worst_return: 0,
            avg_profit_per_100_shares: 0,
            total_profit_per_100_shares: 0,
            best_profit_per_100_shares: 0,
            worst_profit_per_100_shares: 0,
            total_days: 0,
          },
          top5_stats: {
            total_count: 0,
            valid_count: 0,
            win_count: 0,
            lose_count: 0,
            win_rate: 0,
            avg_return: 0,
            median_return: 0,
            std_return: 0,
            best_return: 0,
            worst_return: 0,
            avg_profit_per_100_shares: 0,
            total_profit_per_100_shares: 0,
            best_profit_per_100_shares: 0,
            worst_profit_per_100_shares: 0,
            total_days: 0,
            outperformance: 0,
            outperformance_profit_per_100_shares: 0,
          },
          daily_stats: [],
          recent_records: [],
          trend_analysis: {
            trend: 'stable',
            recent_avg: 0,
            overall_avg: 0,
            change: 0,
          },
          alerts: [{
            type: 'warning',
            title: 'データが生成されていません',
            message: 'バックテストデータはまだ生成されていません。次回の実行をお待ちください。',
          }],
        } as DashboardData);
      }

      return NextResponse.json(
        { error: `API returned ${response.status}` },
        { status: response.status }
      );
    }

    // バックエンドが既に全てのデータを計算済みなので、そのまま返す
    const dashboardData: DashboardData = await response.json();
    console.log(`[backtest-dashboard] Fetched dashboard data successfully for ${phase}`);

    // キャッシュに保存（Phaseごと）
    cachedData[cacheKey] = dashboardData;
    cacheTimestamp = now;

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('[backtest-dashboard] Error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
