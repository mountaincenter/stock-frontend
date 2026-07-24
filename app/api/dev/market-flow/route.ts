import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "");

export async function GET(request: NextRequest) {
  try {
    if (!API_BASE) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_API_BASE_URL is not configured" },
        { status: 500 }
      );
    }
    const qs = request.nextUrl.searchParams.toString();
    const url = `${API_BASE}/api/dev/market-flow${qs ? `?${qs}` : ""}`;
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch market flow" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching market flow:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
