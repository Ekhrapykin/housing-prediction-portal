import { queryOptions } from "@tanstack/react-query";
import { unstable_rethrow } from "next/navigation";
import type { SearchParams } from "nuqs/server";
import { loadSearchParams } from "@/lib/data/search-params";
import type { Page, Property, SegmentRow, Summary, WhatIfPoint } from "@/lib/types";
import { MARKET_BASE, marketPaths as paths } from "./market-paths";
import type { Transport } from "./transport";

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

type Filters = Record<string, number | null>;

/** Parsed filters (null = unset) to a query string for market-api; unset ones are left out. */
export function filtersQuery(filters: Filters): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v !== null) sp.set(k, String(v));
  return sp;
}

// Scatter plot input. The dataset is 50 rows today, so 100 covers it; PriceScatter says so if it ever doesn't.
const SCATTER_SIZE = 100;
const PROPERTIES_PAGE_SIZE = 15;

/**
 * Thinner than the estimator client: the reads are server loaders returning Result<T> (not TanStack prefetches,
 * so no query keys), and only what-if goes through the browser. The caller waits for `connection()` first.
 */
export function createMarketClient(t: Transport) {
  const get = <T>(path: string, sp: URLSearchParams) => t<T>("market", `${path}?${sp}`);

  return {
    queries: {
      /** `body` is the serialized WhatIfParams (a string has stable identity); null disables the query. */
      whatIf: (body: string | null) =>
        queryOptions({
          queryKey: ["what-if", body],
          queryFn: ({ signal }) => t<WhatIfPoint[]>("market", paths.whatIf, { method: "POST", body: body!, signal }),
          enabled: body !== null,
        }),
    },
    async dashboard(raw: SearchParams) {
      const { by, filters } = loadSearchParams(raw);
      const q = filtersQuery(filters);
      const [summary, segments, properties] = await Promise.all([
        attempt(get<Summary>(paths.summary, q)),
        attempt(get<SegmentRow[]>(paths.segments, new URLSearchParams({ ...Object.fromEntries(q), by }))),
        attempt(get<Page<Property>>(paths.properties, new URLSearchParams({ ...Object.fromEntries(q), size: String(SCATTER_SIZE) }))),
      ]);
      return { by, filters, summary, segments, properties };
    },
    async properties(raw: SearchParams) {
      const { sort, dir, page, filters } = loadSearchParams(raw);
      const sp = filtersQuery(filters);
      sp.set("page", String(page - 1)); // the URL is 1-based, the backend 0-based
      sp.set("size", String(PROPERTIES_PAGE_SIZE));
      if (sort) sp.set("sort", `${sort},${dir}`); // market-api's own format
      return { filters, sort, dir, properties: await attempt(get<Page<Property>>(paths.properties, sp)) };
    },
    /** A plain link into the rewrite, so the browser handles the download. */
    exportUrl(kind: "csv" | "pdf", filters: Filters): string {
      const q = filtersQuery(filters).toString();
      return `${MARKET_BASE}${kind === "csv" ? paths.exportCsv : paths.exportPdf}${q ? `?${q}` : ""}`;
    },
  };
}
