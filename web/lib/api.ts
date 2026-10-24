export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Browser-side fetch. Every backend returns errors as `{ detail: string }`. */
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    const headers = init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers;
    res = await fetch(url, { ...init, headers });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    // A 5xx without `detail` comes from the Next rewrite proxy when the backend itself is down.
    const fallback = res.status >= 500 ? "The service is unavailable right now. Try again in a moment." : `Request failed (${res.status})`;
    const detail = typeof body?.detail === "string" ? body.detail : fallback;
    throw new ApiError(res.status, detail);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
