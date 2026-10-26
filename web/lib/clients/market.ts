import { queryOptions } from "@tanstack/react-query";
import { unstable_rethrow } from "next/navigation";
import type { SearchParams } from "nuqs/server";
import { loadSearchParams, type MarketFilters, type SortKey } from "@/lib/data/search-params";
import type { Page, Property, PropertiesView, SegmentRow, Summary, WhatIfPoint } from "@/lib/types";
import { MARKET_BASE, marketPaths as paths } from "./market-paths";
import type { Get, Transport } from "./transport";

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

/** Resolve to data or a readable message (production strips messages thrown from server components). */
async function attempt<T>(p: Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await p };
  } catch (e) {
    unstable_rethrow(e);
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" };
  }
}

/** Parsed filters (null = unset) to a query string for market-api; unset ones are left out. */
export function filtersQuery(filters: MarketFilters): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v !== null) sp.set(k, String(v));
  return sp;
}

/** Adds the paging of the properties list: the URL is 1-based and `sort` + `dir` are two params, market-api is 0-based with `sort=price,desc`. */
export function pagingQuery(sp: URLSearchParams, { page, sort, dir }: { page: number; sort: SortKey | null; dir: "asc" | "desc" }, size: number) {
  sp.set("page", String(page - 1));
  sp.set("size", String(size));
  if (sort) sp.set("sort", `${sort},${dir}`);
  return sp;
}
/** The inverse translation: market-api's 0-based page to the table's 1-based view. A page past the end is shown as is, not clamped. */
export function toPropertiesView(p: Page<Property>): PropertiesView {
  const offset = p.page * p.size;
  return {
    items: p.items,
    total: p.total,
    page: p.page + 1,
    lastPage: Math.max(Math.ceil(p.total / p.size), 1),
    first: p.items.length ? offset + 1 : 0,
    last: p.items.length ? offset + p.items.length : 0,
  };
}

// Scatter plot input. The dataset is 50 rows today, so 100 covers it; PriceScatter says so if it ever doesn't.
// Must stay <= market-api's max-page-size (application.yml), which clamps silently.
export const SCATTER_SIZE = 100;
export const PROPERTIES_PAGE_SIZE = 15;

/** A plain link into the rewrite, so the browser handles the download. */
export function exportUrl(kind: "csv" | "pdf", filters: MarketFilters): string {
  const q = filtersQuery(filters).toString();
  return `${MARKET_BASE}${kind === "csv" ? paths.exportCsv : paths.exportPdf}${q ? `?${q}` : ""}`;
}

/**
 * Server loaders returning Result<T> (not TanStack prefetches, so no query keys). GET only; the caller waits for `connection()` first.
 */
export function createMarketLoaders(get: Get) {
  const read = <T>(path: string, sp: URLSearchParams) => get<T>("market", `${path}?${sp}`);

  return {
    async dashboard(raw: SearchParams) {
      const { by, filters } = loadSearchParams(raw);
      const q = filtersQuery(filters);
      const [summary, segments, properties] = await Promise.all([
        attempt(read<Summary>(paths.summary, q)),
        attempt(read<SegmentRow[]>(paths.segments, new URLSearchParams({ ...Object.fromEntries(q), by }))),
        attempt(read<Page<Property>>(paths.properties, new URLSearchParams({ ...Object.fromEntries(q), size: String(SCATTER_SIZE) }))),
      ]);
      return { by, filters, summary, segments, properties };
    },
    async properties(raw: SearchParams) {
      const { sort, dir, page, filters } = loadSearchParams(raw);
      const sp = pagingQuery(filtersQuery(filters), { page, sort, dir }, PROPERTIES_PAGE_SIZE);
      return { filters, sort, dir, properties: await attempt(read<Page<Property>>(paths.properties, sp).then(toPropertiesView)) };
    },
  };
}

/** Browser only (what-if POSTs). */
export function createMarketQueries(t: Transport) {
  return {
    /** `body` is the serialized WhatIfParams (a string has stable identity); null disables the query. */
    whatIf: (body: string | null) =>
      queryOptions({
        queryKey: ["what-if", body],
        queryFn: ({ signal }) => t<WhatIfPoint[]>("market", paths.whatIf, { method: "POST", body: body!, signal }),
        enabled: body !== null,
      }),
  };
}
