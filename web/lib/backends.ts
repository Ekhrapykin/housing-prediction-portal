/**
 * Backend base URLs, shared by next.config.ts (rewrites, fixed at build) and lib/clients/server-transport.ts (fetches, at runtime).
 * Defaults are the compose service names; `next dev` defaults to localhost so it works without .env.local.
 * No imports on purpose: next.config.ts loads this file.
 */
const dev = process.env.NODE_ENV === "development";

export const ESTIMATOR_API_URL = process.env.ESTIMATOR_API_URL ?? (dev ? "http://localhost:8001" : "http://estimator-api:8001");
export const MARKET_API_URL = process.env.MARKET_API_URL ?? (dev ? "http://localhost:8080" : "http://market-api:8080");
