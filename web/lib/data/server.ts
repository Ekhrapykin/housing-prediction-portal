import "server-only";
import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import type { QueryClient } from "@tanstack/react-query";
import type { Estimate, ModelInfo, Page, Property, SegmentRow, Summary } from "@/lib/types";
import type { SearchParams } from "nuqs/server";
import { filtersQuery, paths } from "./endpoints";
import { queries } from "./queries";
import { loadSearchParams } from "./search-params";
import { MARKET_CACHE_TAG, MARKET_REVALIDATE_S } from "@/lib/config";
import { ESTIMATOR_API_URL as ESTIMATOR, MARKET_API_URL as MARKET } from "@/lib/backends";

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function request<T>(service: string, url: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    unstable_rethrow(e);
    throw new Error(`The ${service} service is unreachable. Try again in a moment.`);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(typeof body?.detail === "string" ? body.detail : `The ${service} service failed (${res.status})`);
  }
  return res.json();
}

// Market data is shared and cheap to cache; estimates are user data, so never cached.
const market = <T>(path: string, sp: URLSearchParams) =>
  request<T>("market", `${MARKET}/api/market${path}?${sp}`, { next: { revalidate: MARKET_REVALIDATE_S, tags: [MARKET_CACHE_TAG] } });
const estimator = <T>(path: string) => request<T>("estimator", `${ESTIMATOR}${path}`, { cache: "no-store" });

/** Resolve to data or a readable message (production strips messages thrown from server components). */
async function attempt<T>(p: Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await p };
  } catch (e) {
    unstable_rethrow(e);
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" };
  }
}

// Scatter plot input. The dataset is 50 rows today, so 100 covers it; PriceScatter says so if it ever doesn't.
const SCATTER_SIZE = 100;
const PROPERTIES_PAGE_SIZE = 15;

export async function loadMarketDashboard(raw: SearchParams) {
  await connection(); // needs the backend at request time; never prerender
  const { by, filters } = loadSearchParams(raw);
  const q = filtersQuery(filters);
  const [summary, segments, properties] = await Promise.all([
    attempt(market<Summary>(paths.market.summary, q)),
    attempt(market<SegmentRow[]>(paths.market.segments, new URLSearchParams({ ...Object.fromEntries(q), by }))),
    attempt(market<Page<Property>>(paths.market.properties, new URLSearchParams({ ...Object.fromEntries(q), size: String(SCATTER_SIZE) }))),
  ]);
  return { by, filters, summary, segments, properties };
}

export async function loadProperties(raw: SearchParams) {
  await connection();
  const { sort, dir, page, filters } = loadSearchParams(raw);
  const sp = filtersQuery(filters);
  sp.set("page", String(page - 1)); // the URL is 1-based, the backend 0-based
  sp.set("size", String(PROPERTIES_PAGE_SIZE));
  if (sort) sp.set("sort", `${sort},${dir}`); // market-api's own format
  return { filters, sort, dir, properties: await attempt(market<Page<Property>>(paths.market.properties, sp)) };
}

/**
 * Seed the client cache for a page. prefetchQuery swallows fetch errors, and a failed query is left out
 * of the dehydrated state, so the client hook fetches again and renders its own error state.
 */
async function prefetch(run: () => Promise<void>) {
  await connection(); // estimator reads are per-user; never prerender
  await run();
}

export const prefetchModelInfo = (qc: QueryClient) =>
  prefetch(() => qc.prefetchQuery({ ...queries.modelInfo(), queryFn: () => estimator<ModelInfo>(paths.estimator.modelInfo) }));

export const prefetchEstimates = (qc: QueryClient) =>
  prefetch(() => qc.prefetchQuery({ ...queries.estimates(), queryFn: () => estimator<Estimate[]>(paths.estimator.estimates) }));

export const prefetchEstimatesByIds = (qc: QueryClient, ids: number[]) =>
  prefetch(() =>
    qc.prefetchQuery({ ...queries.estimatesByIds(ids), queryFn: () => estimator<Estimate[]>(paths.estimator.estimatesByIds(ids)) }),
  );
