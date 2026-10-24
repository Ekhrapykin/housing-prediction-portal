import "server-only";
import type { Page, Property, SegmentRow, Summary } from "./types";

const BASE = process.env.MARKET_API_URL ?? "http://market-api:8080";

async function get<T>(path: string, sp: URLSearchParams): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/api/market${path}?${sp}`, { next: { revalidate: 300 } });
  } catch {
    throw new Error("The market service is unreachable. Try again in a moment.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(typeof body?.detail === "string" ? body.detail : `Market service failed (${res.status})`);
  }
  return res.json();
}

export const getSummary = (sp: URLSearchParams) => get<Summary>("/summary", sp);
export const getSegments = (sp: URLSearchParams) => get<SegmentRow[]>("/segments", sp);
export const getProperties = (sp: URLSearchParams) => {
  const q = new URLSearchParams(sp);
  q.set("size", "100");
  return get<Page<Property>>("/properties", q);
};

/** Resolve a promise to data or a readable message (prod strips error messages thrown in server components). */
export async function attempt<T>(p: Promise<T>): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    return { ok: true, data: await p };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Market service failed" };
  }
}

const FILTER_KEYS = [
  "min_bedrooms", "max_bedrooms", "min_price", "max_price",
  "min_school_rating", "max_distance", "min_year_built", "max_year_built",
];

/** Keep only the filters market-api knows; searchParams values can be string | string[]. */
export function filterParams(raw: Record<string, string | string[] | undefined>): URLSearchParams {
  const sp = new URLSearchParams();
  for (const k of FILTER_KEYS) {
    const v = Array.isArray(raw[k]) ? raw[k][0] : raw[k];
    if (v) sp.set(k, v);
  }
  return sp;
}
