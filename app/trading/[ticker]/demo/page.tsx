import type { Metadata } from "next";
import TradingReplayClient from "./TradingReplayClient";

interface TradingReplayPageProps {
  params: Promise<{ ticker: string }>;
}

export async function generateMetadata({
  params,
}: TradingReplayPageProps): Promise<Metadata> {
  const { ticker } = await params;
  const decoded = decodeURIComponent(ticker).toUpperCase();
  return {
    title: `${decoded} Trading Replay | YMNK.JP`,
    description: "日足と9:30時点の分足・tickを使った盲検エントリー判断学習",
    robots: { index: false, follow: false },
  };
}

export default async function TradingReplayPage({
  params,
}: TradingReplayPageProps) {
  const { ticker } = await params;
  return <TradingReplayClient ticker={ticker} />;
}
