/** The estimator-api paths the portal uses: the single list, read by the client and by next.config.ts. No imports on purpose. */
export const ESTIMATOR_BASE = "/api/estimator";

export const estimatorPaths = {
  estimates: "/estimates",
  estimate: (id: number | string) => `/estimates/${id}`,
  estimatesByIds: (ids: number[]) => `/estimates?ids=${ids.join(",")}`,
  modelInfo: "/model-info",
};

/** What next.config.ts proxies; everything else (the backend's /docs, /openapi.json) stays unreachable through the portal. */
export const ESTIMATOR_PROXIED = [estimatorPaths.estimates, estimatorPaths.estimate(":id"), estimatorPaths.modelInfo];
