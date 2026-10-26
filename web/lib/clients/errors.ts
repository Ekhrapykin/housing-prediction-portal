/** Correlates one request across the portal's backends (contracts/README.md); echoed by every backend response. */
export const REQUEST_ID_HEADER = "X-Request-ID";

const REF_LENGTH = 8;

export class ApiError extends Error {
  constructor(public status: number, message: string, public requestId?: string | null) {
    super(message);
  }
}

type FastApiIssue = { loc?: (string | number)[]; msg?: string };

/** `detail` is a string everywhere except FastAPI validation 422s, where it's a list of issues. Pure; both transports use it. */
export function readDetail(detail: unknown): string | null {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0)
    return (detail as FastApiIssue[]).map((d) => (d.loc?.length ? `${d.loc.at(-1)}: ${d.msg}` : d.msg)).join("; ");
  return null;
}

/** A failed response as an ApiError: `detail` if the body has one, else `fallback`; the request id rides along. Both transports use it. */
export async function toApiError(res: Response, fallback: string): Promise<ApiError> {
  const body = await res.json().catch(() => null);
  return new ApiError(res.status, readDetail(body?.detail) ?? fallback, res.headers.get(REQUEST_ID_HEADER));
}

/** Toast text. Appends a short reference to the request id so a user can quote it and the logs can be searched. */
export const errorMessage = (e: unknown) => {
  if (!(e instanceof Error)) return "Something went wrong";
  return e instanceof ApiError && e.requestId ? `${e.message} · ref ${e.requestId.slice(0, REF_LENGTH)}` : e.message;
};
