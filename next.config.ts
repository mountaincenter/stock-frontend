// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/core30/:path*",
        destination: "http://192.168.0.20:8000/core30/:path*", // FastAPIが動いているホスト/ポートへ
      },
    ];
  },
};

module.exports = nextConfig;
