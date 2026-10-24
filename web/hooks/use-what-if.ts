"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queries } from "@/lib/data/queries";
import type { WhatIfParams } from "@/lib/types";
import { useDebounce } from "./use-debounce";

export function useWhatIf(params: WhatIfParams | null) {
  // Debounce the serialized request: a string has stable identity, a fresh params object doesn't.
  const body = useDebounce(params ? JSON.stringify(params) : null, 300);
  return useQuery({
    ...queries.whatIf(body),
    placeholderData: keepPreviousData, // keeps the chart stable while dragging
    retry: false,
  });
}
