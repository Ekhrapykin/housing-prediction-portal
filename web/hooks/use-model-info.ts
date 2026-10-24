import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { ModelInfo } from "@/lib/types";

export const useModelInfo = () =>
  useQuery({
    queryKey: ["model-info"],
    queryFn: () => apiFetch<ModelInfo>("/api/estimator/model-info"),
    staleTime: 10 * 60_000,
  });
