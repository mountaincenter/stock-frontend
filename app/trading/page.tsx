import type { Metadata } from "next";
import TradingLandingClient from "./TradingLandingClient";

export const metadata: Metadata = {
  title: "Trading Replay | YMNK.JP",
  description: "日足から9:30のザラ場へ進む盲検エントリー判断学習",
  robots: { index: false, follow: false },
};

export default function TradingPage() {
  return <TradingLandingClient />;
}
