"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/error-state";

/** Shared body of every error.tsx. Server-component messages are generic in production. */
export function RouteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => console.error(error), [error]);
  const message = error.digest ? "The page failed to load. A backend service may be down." : error.message;
  return <ErrorState message={message} onRetry={retry} />;
}
