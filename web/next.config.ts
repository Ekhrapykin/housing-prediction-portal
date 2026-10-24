import type { NextConfig } from "next";

const estimator = process.env.ESTIMATOR_API_URL ?? "http://estimator-api:8001";
const market = process.env.MARKET_API_URL ?? "http://market-api:8080";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Rewrites are fixed at build time; the docker service names never change.
  async rewrites() {
    return [
      { source: "/api/estimator/:path*", destination: `${estimator}/:path*` },
      { source: "/api/market/:path*", destination: `${market}/api/market/:path*` },
    ];
  },
};
export default nextConfig;
