import { mutationOptions, queryOptions, type QueryClient } from "@tanstack/react-query";
import { MODEL_INFO_STALE_TIME_MS } from "@/lib/config";
import type { Estimate, HouseFeatures, ModelInfo } from "@/lib/types";
import { estimatorPaths as paths } from "./estimator-paths";
import type { Transport } from "./transport";

export type EstimateInput = HouseFeatures & { label?: string | null };

/**
 * Everything the portal knows about estimator-api: paths (estimator-paths.ts), query keys, queryOptions, mutations
 * and what they invalidate. The transport decides how the request travels, so browser and server prefetch share these.
 */
export function createEstimatorClient(t: Transport) {
  const get = <T>(path: string, signal?: AbortSignal) => t<T>("estimator", path, { signal });
  const keys = {
    estimates: ["estimates"] as const,
    // Nested under ["estimates"], so invalidating the list invalidates this too.
    estimatesByIds: (ids: number[]) => ["estimates", "ids", ids] as const,
    modelInfo: ["model-info"] as const,
  };
  const invalidateEstimates = (qc: QueryClient) => qc.invalidateQueries({ queryKey: keys.estimates });

  return {
    queries: {
      estimates: () => queryOptions({ queryKey: keys.estimates, queryFn: ({ signal }) => get<Estimate[]>(paths.estimates, signal) }),
      estimatesByIds: (ids: number[]) =>
        queryOptions({
          queryKey: keys.estimatesByIds(ids),
          queryFn: ({ signal }) => get<Estimate[]>(paths.estimatesByIds(ids), signal),
          enabled: ids.length > 0,
        }),
      modelInfo: () =>
        queryOptions({
          queryKey: keys.modelInfo,
          queryFn: ({ signal }) => get<ModelInfo>(paths.modelInfo, signal),
          staleTime: MODEL_INFO_STALE_TIME_MS,
        }),
    },
    mutations: {
      create: (qc: QueryClient) =>
        mutationOptions({
          mutationFn: (body: EstimateInput) => t<Estimate>("estimator", paths.estimates, { method: "POST", body: JSON.stringify(body) }),
          onSuccess: () => invalidateEstimates(qc),
        }),
      delete: (qc: QueryClient) =>
        mutationOptions({
          mutationFn: (id: number) => t<void>("estimator", paths.estimate(id), { method: "DELETE" }),
          onSuccess: () => invalidateEstimates(qc),
        }),
    },
  };
}
