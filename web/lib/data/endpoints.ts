/** Browser-side bases; next.config.ts rewrites them to the backends. The server loaders prepend the env URLs instead. */
export const MARKET_BASE = "/api/market";
export const ESTIMATOR_BASE = "/api/estimator";

/** Every backend path, relative to the base of the side that calls it. */
export const paths = {
  market: {
    summary: "/summary",
    segments: "/segments",
    properties: "/properties",
    whatIf: "/what-if",
  },
  estimator: {
    estimates: "/estimates",
    estimate: (id: number) => `/estimates/${id}`,
    estimatesByIds: (ids: number[]) => `/estimates?ids=${ids.join(",")}`,
    modelInfo: "/model-info",
  },
};

export const SORT_KEYS = [
  "id", "square_footage", "bedrooms", "bathrooms", "year_built",
  "lot_size", "distance_to_city_center", "school_rating", "price",
] as const;
export type SortKey = (typeof SORT_KEYS)[number];

/** Parsed filters (null = unset) to a query string for market-api; unset ones are left out. */
export function filtersQuery(filters: Record<string, number | null>): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v !== null) sp.set(k, String(v));
  return sp;
}

export function exportUrl(kind: "csv" | "pdf", filters: Record<string, number | null>): string {
  const q = filtersQuery(filters).toString();
  return `${MARKET_BASE}/export.${kind}${q ? `?${q}` : ""}`;
}
