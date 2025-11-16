import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-northeast-1',
});

export async function GET() {
  try {
    const bucket = process.env.S3_BUCKET || 'stock-api-data';
    const key = 'parquet/timing_analysis/timing_analysis_report.html';

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      return NextResponse.json(
        { error: 'No data found' },
        { status: 404 }
      );
    }

    const html = await response.Body.transformToString();

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error fetching timing analysis report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timing analysis report' },
      { status: 500 }
    );
  }
}
