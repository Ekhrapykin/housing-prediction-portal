import type { NextConfig } from "next";

const estimator = process.env.ESTIMATOR_API_URL ?? "http://estimator-api:8001";
const market = process.env.MARKET_API_URL ?? "http://market-api:8080";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Rewrite destinations are fixed at `next build` (they land in the routes manifest), unlike the server
  // loaders in lib/data/server.ts, which read the same env vars at runtime. Provide the same
  // ESTIMATOR_API_URL / MARKET_API_URL at build time too (Docker build args), or the browser hits the defaults.
  async rewrites() {
    return [
      { source: "/api/estimator/:path*", destination: `${estimator}/:path*` },
      { source: "/api/market/:path*", destination: `${market}/api/market/:path*` },
    ];
  },
};
export default nextConfig;
