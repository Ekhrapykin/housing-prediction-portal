import { REQUEST_TIMEOUT_MS } from "@/lib/config";
import { ApiError, toApiError } from "./errors";
import { ESTIMATOR_BASE } from "./estimator-paths";
import { MARKET_BASE } from "./market-paths";

export type Backend = "estimator" | "market";
export type Req = { method?: "POST" | "DELETE"; body?: string; signal?: AbortSignal };
/**
 * GET-only reach into a backend: `path` is the backend path (with query string), the transport adds base URL, timeout and errors.
 * `method` / `body` are `undefined`-only so a function that can't send them (the server transport) is not assignable to `Transport`.
 */
export type Get = <T>(backend: Backend, path: string, req?: { signal?: AbortSignal; method?: undefined; body?: undefined }) => Promise<T>;
/** Get plus POST / DELETE: what the browser can do. */
export type Transport = <T>(backend: Backend, path: string, req?: Req) => Promise<T>;

/** Injection points for tests. */
export type Options = { fetch?: typeof fetch; timeoutMs?: number };

const BASES: Record<Backend, string> = { estimator: ESTIMATOR_BASE, market: MARKET_BASE };

/**
 * Browser transport: calls the `/api/*` rewrites. `req.signal` cancels (the abort is re-thrown untouched so
 * TanStack treats it as a cancellation); a timeout becomes an ApiError. No X-Request-ID: the backend generates it.
 */
export function createBrowserTransport({ fetch: doFetch = (u, i) => fetch(u, i), timeoutMs = REQUEST_TIMEOUT_MS }: Options = {}): Transport {
  return async <T>(backend: Backend, path: string, req?: Req): Promise<T> => {
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = req?.signal ? AbortSignal.any([req.signal, timeout]) : timeout;
    let res: Response;
    try {
      const headers = req?.body ? { "Content-Type": "application/json" } : undefined;
      res = await doFetch(BASES[backend] + path, { method: req?.method, body: req?.body, headers, signal });
    } catch (e) {
      if (req?.signal?.aborted) throw e;
      if (timeout.aborted) throw new ApiError(0, "The request timed out. Try again.");
      throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
    }
    // A 5xx without `detail` comes from the Next rewrite proxy when the backend itself is down.
    if (!res.ok) throw await toApiError(res, res.status >= 500 ? "The service is unavailable right now. Try again in a moment." : `Request failed (${res.status})`);
    return res.status === 204 ? (undefined as T) : res.json();
  };
}

export const browserTransport = createBrowserTransport();
