/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        // /api/auth 경로는 프론트의 NextAuth가 처리하고, 그 외의 모든 /api/ 경로는 NestJS 백엔드로 포워딩
        source: "/api/:path((?!auth).*)",
        destination: "http://localhost:4000/api/:path",
      },
    ];
  },
};

export default nextConfig;
