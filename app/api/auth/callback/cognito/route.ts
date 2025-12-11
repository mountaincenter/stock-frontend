import { NextResponse } from 'next/server';

// OAuthコールバックはクライアントサイドで処理されるため、
// このルートは単にstock-resultsにリダイレクトする
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_OUT || 'http://localhost:3000';
  return NextResponse.redirect(new URL('/dev/stock-results', baseUrl));
}
