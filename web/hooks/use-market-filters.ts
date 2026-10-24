"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

/** Market filters live in the URL; the server component re-renders on every change. */
export function useMarketFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    startTransition(() => router.replace(`${pathname}?${next}`, { scroll: false }));
  };
  const reset = () => startTransition(() => router.replace(pathname, { scroll: false }));

  return { params, get: (k: string) => params.get(k) ?? "", set, reset, isPending };
}
