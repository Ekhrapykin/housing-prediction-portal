/** The market-api paths the portal uses: the single list, read by the client and by next.config.ts. No imports on purpose. */
export const MARKET_BASE = "/api/market";
/** market-api serves everything under this prefix itself (the rewrite target and the server transport add it). */
export const MARKET_BACKEND_PREFIX = "/api/market";

export const marketPaths = {
  summary: "/summary",
  segments: "/segments",
  properties: "/properties",
  whatIf: "/what-if",
  exportCsv: "/export.csv",
  exportPdf: "/export.pdf",
};

/** What next.config.ts proxies; everything else stays unreachable through the portal. */
export const MARKET_PROXIED = Object.values(marketPaths);
