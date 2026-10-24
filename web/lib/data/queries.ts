import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Estimate, ModelInfo, WhatIfPoint } from "@/lib/types";
import { ESTIMATOR_BASE, MARKET_BASE, paths } from "./endpoints";

/** The only place query keys exist; hooks, server prefetch and invalidation all go through here. */
export const queries = {
  estimates: () =>
    queryOptions({
      queryKey: ["estimates"],
      queryFn: () => apiFetch<Estimate[]>(ESTIMATOR_BASE + paths.estimator.estimates),
    }),
  // Nested under ["estimates"], so invalidating the list invalidates this too.
  estimatesByIds: (ids: number[]) =>
    queryOptions({
      queryKey: ["estimates", "ids", ids],
      queryFn: () => apiFetch<Estimate[]>(ESTIMATOR_BASE + paths.estimator.estimatesByIds(ids)),
      enabled: ids.length > 0,
    }),
  modelInfo: () =>
    queryOptions({
      queryKey: ["model-info"],
      queryFn: () => apiFetch<ModelInfo>(ESTIMATOR_BASE + paths.estimator.modelInfo),
      staleTime: 10 * 60_000,
    }),
  /** `body` is the serialized WhatIfParams (a string has stable identity); null disables the query. */
  whatIf: (body: string | null) =>
    queryOptions({
      queryKey: ["what-if", body],
      queryFn: () => apiFetch<WhatIfPoint[]>(MARKET_BASE + paths.market.whatIf, { method: "POST", body: body! }),
      enabled: body !== null,
    }),
};
