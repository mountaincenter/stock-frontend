// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // パフォーマンス最適化
  compress: true, // gzip圧縮を有効化

  // 本番環境での最適化
  productionBrowserSourceMaps: false, // ソースマップを無効化してサイズ削減

  // 画像最適化
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  async redirects() {
    return [
      {
        source: "/:path*",
        // apex ドメイン（ymnk.jp）でアクセスされた場合のみ一致
        has: [{ type: "host", value: "ymnk.jp" }],
        destination: "https://www.ymnk.jp/:path*",
        permanent: true, // = 308 Permanent Redirect
      },
    ];
  },

  // ヘッダー最適化
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png|gif|ico|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
