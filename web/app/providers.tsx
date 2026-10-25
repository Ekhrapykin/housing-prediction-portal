"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "@/components/ui/sonner";
import { getQueryClient } from "@/lib/data/query-client";

export function Providers({ children }: { children: React.ReactNode }) {
  // Not useState: React may throw away state if the first render suspends; getQueryClient is a browser singleton.
  const client = getQueryClient();
  return (
    <QueryClientProvider client={client}>
      <NuqsAdapter>{children}</NuqsAdapter>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
