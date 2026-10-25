/** Timings and tuning for the portal. Page sizes live next to their loaders in data/server.ts. */

/** Browser queries are fresh for 30 s: long enough to survive navigation, short enough that another tab's edits show up. */
export const QUERY_STALE_TIME_MS = 30_000;
/** The model card changes only when ml-api restarts. */
export const MODEL_INFO_STALE_TIME_MS = 10 * 60_000;

/** Server-side market reads are cached 5 min; the dataset is static while the app runs. */
export const MARKET_REVALIDATE_S = 300;

/** Wait for the slider to settle before calling market-api. */
export const WHAT_IF_DEBOUNCE_MS = 300;
/** Wait for typing to stop before the filter URL (and the server render) updates. */
export const FILTER_DEBOUNCE_MS = 400;
/** Points on the what-if curve; market-api accepts 2 to 50 (contracts/market.json). */
export const WHAT_IF_STEPS = 25;

/** Browser fetches give up after this long; a slow what-if is better surfaced than hung. */
export const REQUEST_TIMEOUT_MS = 10_000;
