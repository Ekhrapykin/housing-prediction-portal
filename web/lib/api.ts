import { REQUEST_TIMEOUT_MS } from "@/lib/config";

/** Correlates one request across the portal's backends (contracts/README.md); echoed by every backend response. */
export const REQUEST_ID_HEADER = "X-Request-ID";
const REF_LENGTH = 8;

export class ApiError extends Error {
  constructor(public status: number, message: string, public requestId?: string | null) {
    super(message);
  }
}

type FastApiIssue = { loc?: (string | number)[]; msg?: string };

// `detail` is a string everywhere except FastAPI validation 422s, where it's a list of issues.
function readDetail(detail: unknown): string | null {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0)
    return (detail as FastApiIssue[]).map((d) => (d.loc?.length ? `${d.loc.at(-1)}: ${d.msg}` : d.msg)).join("; ");
  return null;
}

/**
 * Browser-side fetch. Every backend returns errors as `{ detail }`. `init.signal` cancels the request
 * (the abort is re-thrown untouched so TanStack treats it as a cancellation); a timeout becomes an ApiError.
 */
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  let res: Response;
  try {
    const headers = init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers;
    res = await fetch(url, { ...init, headers, signal });
  } catch (e) {
    if (init?.signal?.aborted) throw e;
    if (timeout.aborted) throw new ApiError(0, "The request timed out. Try again.");
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    // A 5xx without `detail` comes from the Next rewrite proxy when the backend itself is down.
    const fallback = res.status >= 500 ? "The service is unavailable right now. Try again in a moment." : `Request failed (${res.status})`;
    const detail = readDetail(body?.detail) ?? fallback;
    throw new ApiError(res.status, detail, res.headers.get(REQUEST_ID_HEADER));
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

/** Toast text. Appends a short reference to the request id so a user can quote it and the logs can be searched. */
export const errorMessage = (e: unknown) => {
  if (!(e instanceof Error)) return "Something went wrong";
  return e instanceof ApiError && e.requestId ? `${e.message} · ref ${e.requestId.slice(0, REF_LENGTH)}` : e.message;
};
