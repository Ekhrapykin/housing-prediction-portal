import "server-only";
import { connection } from "next/server";
import type { FetchQueryOptions, QueryClient, QueryKey } from "@tanstack/react-query";
import type { SearchParams } from "nuqs/server";
import { createEstimatorQueries } from "./estimator";
import { createMarketLoaders } from "./market";
import { serverTransport } from "./server-transport";

/** The estimator queries over the server transport; pages pass them to `prefetch`. */
export const serverEstimator = createEstimatorQueries(serverTransport);
const market = createMarketLoaders(serverTransport);

// Both backends need to be reachable at request time; never prerender.
export async function loadMarketDashboard(raw: SearchParams) {
  await connection();
  return market.dashboard(raw);
}

export async function loadProperties(raw: SearchParams) {
  await connection();
  return market.properties(raw);
}

/**
 * Seed the client cache for a page with the SAME queryOptions the browser uses (same key and path, server fetcher).
 * prefetchQuery swallows fetch errors; getQueryClient() dehydrates the failed query, so the client hydrates
 * straight into the error state (and does not refetch on mount, see retryOnMount there).
 */
export async function prefetch<T, K extends QueryKey>(qc: QueryClient, opts: FetchQueryOptions<T, Error, T, K>) {
  await connection(); // estimator reads are per-user; never prerender
  // retry: false because the render already waits for the transport timeout; "Try again" refetches in the browser.
  await qc.prefetchQuery({ ...opts, retry: false });
}
