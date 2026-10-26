import type { NextConfig } from "next";
import { ESTIMATOR_API_URL, MARKET_API_URL } from "./lib/backends";
import { ESTIMATOR_BASE, ESTIMATOR_PROXIED } from "./lib/clients/estimator-paths";
import { MARKET_BACKEND_PREFIX, MARKET_BASE, MARKET_PROXIED } from "./lib/clients/market-paths";

// Only what the UI calls is proxied (the per-backend path modules list it), so the backends' /docs and /openapi.json
// are not reachable through the portal. Those modules have no imports: this file must not pull in React or server-only.

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
  // loaders in lib/clients/server-transport.ts, which read the same env vars at runtime. Provide the same
  // ESTIMATOR_API_URL / MARKET_API_URL at build time too (Docker build args), or the browser hits the defaults.
  async rewrites() {
    return [
      ...ESTIMATOR_PROXIED.map((p) => ({ source: `${ESTIMATOR_BASE}${p}`, destination: `${ESTIMATOR_API_URL}${p}` })),
      ...MARKET_PROXIED.map((p) => ({ source: `${MARKET_BASE}${p}`, destination: `${MARKET_API_URL}${MARKET_BACKEND_PREFIX}${p}` })),
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
export default nextConfig;
