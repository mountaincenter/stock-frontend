import { NextRequest, NextResponse } from "next/server";

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
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { error: "Missing required parameter: date" },
        { status: 400 }
      );
    }

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

    // 指定日付のデータをフィルタ
    const dailyData = data.filter(r => r.backtest_date === date);

    if (dailyData.length === 0) {
      return NextResponse.json(
        { error: "No data found for the specified date" },
        { status: 404 }
      );
    }

    // grok_rankでソート（nullは最後）
    dailyData.sort((a, b) => {
      if (a.grok_rank === null) return 1;
      if (b.grok_rank === null) return -1;
      return a.grok_rank - b.grok_rank;
    });

    return NextResponse.json({
      date,
      stocks: dailyData,
    });
  } catch (error) {
    console.error("Error processing daily backtest data:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
