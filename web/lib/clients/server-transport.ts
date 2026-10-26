import "server-only";
import { unstable_rethrow } from "next/navigation";
import { ESTIMATOR_API_URL, MARKET_API_URL } from "@/lib/backends";
import { MARKET_REVALIDATE_S, SERVER_REQUEST_TIMEOUT_MS } from "@/lib/config";
import { ApiError, readDetail, REQUEST_ID_HEADER } from "./errors";
import { MARKET_BACKEND_PREFIX } from "./market-paths";
import type { Backend, Options, Transport } from "./transport";

// Market data is shared and cheap to cache; estimates are user data, so never cached.
// Only the uncached estimator reads carry a fresh request id: Next puts request headers in the fetch cache key,
// so a per-request id on the market reads would turn every one of them into a cache miss.
const TARGETS: Record<Backend, (path: string) => { url: string; init: () => RequestInit }> = {
  estimator: (path) => ({
    url: ESTIMATOR_API_URL + path,
    init: () => ({ cache: "no-store", headers: { [REQUEST_ID_HEADER]: crypto.randomUUID() } }),
  }),
  market: (path) => ({ url: MARKET_API_URL + MARKET_BACKEND_PREFIX + path, init: () => ({ next: { revalidate: MARKET_REVALIDATE_S } }) }),
};

/** Server transport: calls the backends directly, GET only. Errors are readable messages (production strips thrown server-component messages). */
export function createServerTransport({ fetch: doFetch = (u, i) => fetch(u, i), timeoutMs = SERVER_REQUEST_TIMEOUT_MS }: Options = {}): Transport {
  return async <T>(backend: Backend, path: string): Promise<T> => {
    const { url, init } = TARGETS[backend](path);
    const timeout = AbortSignal.timeout(timeoutMs);
    let res: Response;
    try {
      res = await doFetch(url, { ...init(), signal: timeout });
    } catch (e) {
      unstable_rethrow(e); // Next's own errors (dynamic usage, notFound, redirect) must propagate; a timeout is not one
      throw new ApiError(0, `The ${backend} service ${timeout.aborted ? "timed out" : "is unreachable"}. Try again in a moment.`);
    }
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new ApiError(res.status, readDetail(body?.detail) ?? `The ${backend} service failed (${res.status})`, res.headers.get(REQUEST_ID_HEADER));
    }
    return res.json();
  };
}

export const serverTransport = createServerTransport();
