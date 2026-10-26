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

/** Sortable columns (contracts/market.json). Lives here because the search-params parsers need it without the client. */
export const SORT_KEYS = [
  "id", "square_footage", "bedrooms", "bathrooms", "year_built",
  "lot_size", "distance_to_city_center", "school_rating", "price",
] as const;
export type SortKey = (typeof SORT_KEYS)[number];
