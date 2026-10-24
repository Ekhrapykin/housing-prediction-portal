import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Estimate, HouseFeatures } from "@/lib/types";

const BASE = "/api/estimator/estimates";
export type EstimateInput = HouseFeatures & { label?: string | null };

export const useEstimates = () => useQuery({ queryKey: ["estimates"], queryFn: () => apiFetch<Estimate[]>(BASE) });

export const useEstimatesByIds = (ids: number[]) =>
  useQuery({
    queryKey: ["estimates", "ids", ids],
    queryFn: () => apiFetch<Estimate[]>(`${BASE}?ids=${ids.join(",")}`),
    enabled: ids.length > 0,
  });

export function useCreateEstimate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: EstimateInput) => apiFetch<Estimate>(BASE, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["estimates"] }),
  });
}

export function useDeleteEstimate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["estimates"] }),
  });
}
