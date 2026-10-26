import { mutationOptions, queryOptions, type QueryClient } from "@tanstack/react-query";
import { MODEL_INFO_STALE_TIME_MS } from "@/lib/config";
import type { Estimate, HouseFeatures, ModelInfo } from "@/lib/types";
import { estimatorPaths as paths } from "./estimator-paths";
import type { Get, Transport } from "./transport";

export type EstimateInput = HouseFeatures & { label?: string | null };

const keys = {
  estimates: ["estimates"] as const,
  // Nested under ["estimates"], so invalidating the list invalidates this too.
  estimatesByIds: (ids: number[]) => ["estimates", "ids", ids] as const,
  modelInfo: ["model-info"] as const,
};

/** Paths, query keys and queryOptions for estimator-api. Takes a `Get`, so browser and server prefetch share them. */
export function createEstimatorQueries(get: Get) {
  const read = <T>(path: string, signal?: AbortSignal) => get<T>("estimator", path, { signal });
  return {
    estimates: () => queryOptions({ queryKey: keys.estimates, queryFn: ({ signal }) => read<Estimate[]>(paths.estimates, signal) }),
    estimatesByIds: (ids: number[]) =>
      queryOptions({
        queryKey: keys.estimatesByIds(ids),
        queryFn: ({ signal }) => read<Estimate[]>(paths.estimatesByIds(ids), signal),
        enabled: ids.length > 0,
      }),
    modelInfo: () =>
      queryOptions({
        queryKey: keys.modelInfo,
        queryFn: ({ signal }) => read<ModelInfo>(paths.modelInfo, signal),
        staleTime: MODEL_INFO_STALE_TIME_MS,
      }),
  };
}

/** Browser only (needs POST / DELETE): create and delete, both invalidate the estimates. */
export function createEstimatorMutations(t: Transport) {
  const invalidateEstimates = (qc: QueryClient) => qc.invalidateQueries({ queryKey: keys.estimates });
  return {
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
  };
}
