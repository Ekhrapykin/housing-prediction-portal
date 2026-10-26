import "server-only";
import { connection } from "next/server";
import type { QueryClient } from "@tanstack/react-query";
import type { SearchParams } from "nuqs/server";
import { createEstimatorClient } from "./estimator";
import { createMarketClient } from "./market";
import { serverTransport } from "./server-transport";

const estimator = createEstimatorClient(serverTransport);
const market = createMarketClient(serverTransport);

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
async function prefetch(run: () => Promise<void>) {
  await connection(); // estimator reads are per-user; never prerender
  await run();
}

// retry: false because the render already waits for the transport timeout; "Try again" refetches in the browser.
export const prefetchModelInfo = (qc: QueryClient) => prefetch(() => qc.prefetchQuery({ ...estimator.queries.modelInfo(), retry: false }));
export const prefetchEstimates = (qc: QueryClient) => prefetch(() => qc.prefetchQuery({ ...estimator.queries.estimates(), retry: false }));
export const prefetchEstimatesByIds = (qc: QueryClient, ids: number[]) =>
  prefetch(() => qc.prefetchQuery({ ...estimator.queries.estimatesByIds(ids), retry: false }));
