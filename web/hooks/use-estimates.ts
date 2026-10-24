"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { ESTIMATOR_BASE, paths } from "@/lib/data/endpoints";
import { queries } from "@/lib/data/queries";
import type { Estimate, HouseFeatures } from "@/lib/types";

export type EstimateInput = HouseFeatures & { label?: string | null };

export const useEstimates = () => useQuery(queries.estimates());

export const useEstimatesByIds = (ids: number[]) => useQuery(queries.estimatesByIds(ids));

export function useCreateEstimate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: EstimateInput) =>
      apiFetch<Estimate>(ESTIMATOR_BASE + paths.estimator.estimates, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queries.estimates().queryKey }),
  });
}

export function useDeleteEstimate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(ESTIMATOR_BASE + paths.estimator.estimate(id), { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queries.estimates().queryKey }),
  });
}
