"use client";

import { ErrorState } from "@/components/error-state";

/** Shared body of every error.tsx. Server-component messages are generic in production. */
export function RouteError({ error, retry }: { error: unknown; retry: () => void }) {
  const e = error as Error & { digest?: string };
  const message = e instanceof Error && !e.digest ? e.message : "The page failed to load. A backend service may be down.";
  return <ErrorState message={message} onRetry={retry} />;
}
