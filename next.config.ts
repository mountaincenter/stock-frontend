// next.config.js（apex→www への恒久リダイレクトのみを追加）
/** @type {import('next').NextConfig} */
const nextConfig = {
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
};

module.exports = nextConfig;
