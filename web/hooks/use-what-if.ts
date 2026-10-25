"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queries } from "@/lib/data/queries";
import type { WhatIfParams } from "@/lib/types";
import { useDebounce } from "./use-debounce";
import { WHAT_IF_DEBOUNCE_MS } from "@/lib/config";

export function useWhatIf(params: WhatIfParams | null) {
  // Debounce the serialized request: a string has stable identity, a fresh params object doesn't.
  const body = useDebounce(params ? JSON.stringify(params) : null, WHAT_IF_DEBOUNCE_MS);
  return useQuery({
    ...queries.whatIf(body),
    placeholderData: keepPreviousData, // keeps the chart stable while dragging
    retry: false,
  });
}
