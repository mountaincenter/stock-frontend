// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});
const notoJP = Noto_Sans_JP({
  variable: "--font-noto-jp",
  weight: ["400", "500", "700"],
  display: "swap",
  preload: true, // ← 先読み
  // ※ subsets は指定しない（Noto_Sans_JP は内部で CJK を含む）
});

export const metadata: Metadata = {
  title: "株価分析 | YMNK.JP",
  description: "リアルタイムの株価データとテクニカル分析を提供。TOPIX Core 30銘柄のパフォーマンス、テクニカル指標、チャート分析を確認できます。",
  metadataBase: new URL("https://www.ymnk.jp"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "株価分析 | YMNK.JP",
    description: "リアルタイムの株価データとテクニカル分析",
    url: "https://www.ymnk.jp",
    siteName: "YMNK.JP",
    locale: "ja_JP",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ja"
      suppressHydrationWarning
      className={[notoJP.className].join(" ")} // ← html に本文フォントを直指定
    >
      <body
        className={[
          notoJP.variable, // CSS変数（Tailwindの --font-sans が拾う）
          geistSans.variable,
          geistMono.variable,
          "antialiased font-sans",
        ].join(" ")}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
