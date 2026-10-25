import type { NextConfig } from "next";
import { ESTIMATOR_API_URL, MARKET_API_URL } from "./lib/backends";
import { ESTIMATOR_BASE, MARKET_BASE, paths } from "./lib/data/endpoints";

// Only what the UI calls is proxied, so the backends' /docs and /openapi.json are not reachable through the portal.
const estimatorPaths = [paths.estimator.estimates, paths.estimator.estimate(":id"), paths.estimator.modelInfo];
const marketPaths = [paths.market.summary, paths.market.segments, paths.market.properties, paths.market.whatIf, paths.market.exportCsv, paths.market.exportPdf];

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  // frame-ancestors only: a full CSP would have to allow Next's inline scripts.
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

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
      ...estimatorPaths.map((p) => ({ source: `${ESTIMATOR_BASE}${p}`, destination: `${ESTIMATOR_API_URL}${p}` })),
      ...marketPaths.map((p) => ({ source: `${MARKET_BASE}${p}`, destination: `${MARKET_API_URL}/api/market${p}` })),
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
export default nextConfig;
