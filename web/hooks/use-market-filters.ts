"use client";

import { debounce, useQueryStates } from "nuqs";
import { useTransition } from "react";
import { marketParsers } from "@/lib/data/search-params";

const TYPING_DEBOUNCE_MS = 400;

type Params = ReturnType<typeof useQueryStates<typeof marketParsers>>[0];

/** Market filters live in the URL; the server component re-renders on every change. */
export function useMarketFilters() {
  const [isPending, startTransition] = useTransition();
  const [params, setParams] = useQueryStates(marketParsers, { shallow: false, clearOnDefault: true, startTransition });
  return {
    params,
    isPending,
    /** Immediate update (selects). */
    set: (patch: Partial<Params>) => setParams(patch),
    /** Local state updates at once; the URL (and server render) follows after typing stops. */
    setTyped: (patch: Partial<Params>) => setParams(patch, { limitUrlUpdates: debounce(TYPING_DEBOUNCE_MS) }),
    reset: () => setParams(null),
  };
}
