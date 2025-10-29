import { NextResponse } from "next/server";

// @ts-expect-error - parquetjs-lite has no types
import * as parquetjs from "parquetjs-lite";

const S3_BASE_URL = process.env.NEXT_PUBLIC_S3_BASE_URL || "https://d37t8j6ozpebc0.cloudfront.net";

interface BacktestRecord {
  ticker: string;
  stock_name: string;
  selection_score: number | null;
  grok_rank: number | null;
  reason: string;
  selected_time: string;
  backtest_date: string;
  buy_price: number | null;
  sell_price: number | null;
  phase1_return: number | null;
  phase1_win: boolean | null;
  profit_per_100?: number | null;
}

interface OverallStats {
  total_trades: number;
  avg_return: number | null;
  win_rate: number | null;
  max_return: number | null;
  min_return: number | null;
  total_days: number;
}

interface DailyStats {
  date: string;
  total_stocks: number;
  valid_results: number;
  avg_return: number | null;
  win_rate: number | null;
  max_return: number | null;
  min_return: number | null;
  top5_avg_return: number | null;
  top5_win_rate: number | null;
}

interface BacktestSummary {
  overall: OverallStats;
  daily_stats: DailyStats[];
}

export async function GET() {
  try {
    // S3からアーカイブparquetをダウンロード
    const archiveUrl = `${S3_BASE_URL}/parquet/backtest/grok_trending_archive.parquet`;

    const response = await fetch(archiveUrl, {
      next: { revalidate: 300 }, // 5分キャッシュ
    });

    if (!response.ok) {
      console.error(`Failed to fetch archive: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: "Failed to fetch backtest data" },
        { status: 500 }
      );
    }

    const arrayBuffer = await response.arrayBuffer();

    // Parquetデータをパース（parquetjs-lite使用）
    const buffer = Buffer.from(arrayBuffer);
    const reader = await parquetjs.ParquetReader.openBuffer(buffer);
    const cursor = reader.getCursor();

    const data: BacktestRecord[] = [];
    let row = null;
    while ((row = await cursor.next())) {
      data.push(row as BacktestRecord);
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        overall: {
          total_trades: 0,
          avg_return: null,
          win_rate: null,
          max_return: null,
          min_return: null,
          total_days: 0,
        },
        daily_stats: [],
      });
    }

    // 日付ごとにグループ化
    const dailyGroups = data.reduce((acc, record) => {
      const date = record.backtest_date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(record);
      return acc;
    }, {} as Record<string, BacktestRecord[]>);

    // 日次統計を計算
    const daily_stats: DailyStats[] = Object.entries(dailyGroups)
      .map(([date, records]) => {
        const validRecords = records.filter(r => r.phase1_return !== null);
        const top5Records = records.filter(r => r.grok_rank !== null && r.grok_rank <= 5 && r.phase1_return !== null);

        const avgReturn = validRecords.length > 0
          ? validRecords.reduce((sum, r) => sum + (r.phase1_return! * 100), 0) / validRecords.length
          : null;

        const winRate = validRecords.length > 0
          ? (validRecords.filter(r => r.phase1_win === true).length / validRecords.length) * 100
          : null;

        const returns = validRecords.map(r => r.phase1_return! * 100);
        const maxReturn = returns.length > 0 ? Math.max(...returns) : null;
        const minReturn = returns.length > 0 ? Math.min(...returns) : null;

        const top5AvgReturn = top5Records.length > 0
          ? top5Records.reduce((sum, r) => sum + (r.phase1_return! * 100), 0) / top5Records.length
          : null;

        const top5WinRate = top5Records.length > 0
          ? (top5Records.filter(r => r.phase1_win === true).length / top5Records.length) * 100
          : null;

        return {
          date,
          total_stocks: records.length,
          valid_results: validRecords.length,
          avg_return: avgReturn,
          win_rate: winRate,
          max_return: maxReturn,
          min_return: minReturn,
          top5_avg_return: top5AvgReturn,
          top5_win_rate: top5WinRate,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date)); // 新しい順

    // 全体統計を計算
    const allValidRecords = data.filter(r => r.phase1_return !== null);
    const allReturns = allValidRecords.map(r => r.phase1_return! * 100);

    const overall: OverallStats = {
      total_trades: allValidRecords.length,
      avg_return: allValidRecords.length > 0
        ? allValidRecords.reduce((sum, r) => sum + (r.phase1_return! * 100), 0) / allValidRecords.length
        : null,
      win_rate: allValidRecords.length > 0
        ? (allValidRecords.filter(r => r.phase1_win === true).length / allValidRecords.length) * 100
        : null,
      max_return: allReturns.length > 0 ? Math.max(...allReturns) : null,
      min_return: allReturns.length > 0 ? Math.min(...allReturns) : null,
      total_days: Object.keys(dailyGroups).length,
    };

    const summary: BacktestSummary = {
      overall,
      daily_stats,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error processing backtest data:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
