import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { WhatIfParams, WhatIfPoint } from "@/lib/types";
import { useDebounce } from "./use-debounce";

export function useWhatIf(params: WhatIfParams | null) {
  // Debounce the serialized request: a string has stable identity, a fresh params object doesn't.
  const body = useDebounce(params ? JSON.stringify(params) : null, 300);
  return useQuery({
    queryKey: ["what-if", body],
    queryFn: () => apiFetch<WhatIfPoint[]>("/api/market/what-if", { method: "POST", body: body! }),
    enabled: body !== null,
    placeholderData: keepPreviousData, // keeps the chart stable while dragging
    retry: false,
  });
}
