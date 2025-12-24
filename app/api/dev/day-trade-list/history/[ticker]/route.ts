import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;

    const response = await fetch(
      `${API_BASE}/dev/day-trade-list/history/${encodeURIComponent(ticker)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch day trade history' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching day trade history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
