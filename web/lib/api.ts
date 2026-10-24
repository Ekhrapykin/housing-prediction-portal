export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Browser-side fetch. Every backend returns errors as `{ detail: string }`. */
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = typeof body?.detail === "string" ? body.detail : `Request failed (${res.status})`;
    throw new ApiError(res.status, detail);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
