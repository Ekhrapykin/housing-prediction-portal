"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useTransition } from "react";

/** Market filters live in the URL; the server component re-renders on every change. */
export function useMarketFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // The URL (and window.location) only update once a navigation commits, so changes made while one is
  // in flight build on this instead; otherwise the second change would overwrite the first.
  const inFlight = useRef<string | null>(null);
  useEffect(() => {
    if (!isPending) inFlight.current = null;
  }, [isPending]);

  const go = useCallback(
    (qs: string) => {
      inFlight.current = qs;
      startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [router, pathname],
  );

  const set = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(inFlight.current ?? window.location.search);
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      go(next.toString());
    },
    [go],
  );
  const reset = useCallback(() => go(""), [go]);

  return { params, get: (k: string) => params.get(k) ?? "", set, reset, isPending };
}
