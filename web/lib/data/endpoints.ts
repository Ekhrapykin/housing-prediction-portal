import { SEGMENT_KEYS, type SegmentKey } from "@/lib/types";

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

/** searchParams from a page, or a URLSearchParams from the browser. */
export type RawParams = URLSearchParams | Record<string, string | string[] | undefined>;

const first = (raw: RawParams, key: string) => {
  if (raw instanceof URLSearchParams) return raw.get(key) ?? undefined;
  const v = raw[key];
  return Array.isArray(v) ? v[0] : v;
};

const FILTER_KEYS = [
  "min_bedrooms", "max_bedrooms", "min_price", "max_price",
  "min_school_rating", "max_distance", "min_year_built", "max_year_built",
];

/** Keep only the filters market-api knows. */
export function parseFilters(raw: RawParams): URLSearchParams {
  const sp = new URLSearchParams();
  for (const k of FILTER_KEYS) {
    const v = first(raw, k);
    if (v) sp.set(k, v);
  }
  return sp;
}

export function parseSegmentKey(raw: RawParams): SegmentKey {
  const v = first(raw, "by");
  return SEGMENT_KEYS.find((k) => k === v) ?? "BEDROOMS";
}

export const SORT_KEYS = [
  "id", "square_footage", "bedrooms", "bathrooms", "year_built",
  "lot_size", "distance_to_city_center", "school_rating", "price",
] as const;
export type Sort = { key: (typeof SORT_KEYS)[number]; dir: "asc" | "desc" };

/** `?sort=price,desc` → `{ key: "price", dir: "desc" }`; anything unknown means unsorted. */
export function parseSort(raw: RawParams): Sort | null {
  const [key, dir = "asc"] = (first(raw, "sort") ?? "").split(",");
  const k = SORT_KEYS.find((s) => s === key);
  return k && (dir === "asc" || dir === "desc") ? { key: k, dir } : null;
}

/** 1-based `?page=`; the backend is 0-based. */
export function parsePage(raw: RawParams): number {
  const n = Number(first(raw, "page"));
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export function exportUrl(kind: "csv" | "pdf", filters: URLSearchParams): string {
  const q = filters.toString();
  return `${MARKET_BASE}/export.${kind}${q ? `?${q}` : ""}`;
}
