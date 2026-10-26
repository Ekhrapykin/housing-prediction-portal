import { defaultShouldDehydrateQuery, dehydrate, isServer, QueryClient } from "@tanstack/react-query";
import { QUERY_STALE_TIME_MS } from "@/lib/config";

const make = () =>
  new QueryClient({
    defaultOptions: {
      // retryOnMount: false, so a query hydrated in the error state shows its error at once instead of refetching
      // (and hanging for the browser timeout) on mount; "Try again" calls refetch().
      queries: { staleTime: QUERY_STALE_TIME_MS, retry: 1, retryOnMount: false },
      dehydrate: {
        // Failed server prefetches are dehydrated too, so the client renders the error state straight away.
        shouldDehydrateQuery: (q) => defaultShouldDehydrateQuery(q) || q.state.status === "pending" || q.state.status === "error",
      },
    },
  });

let browserClient: QueryClient | undefined;

/** A fresh client per server request (never share user data), one singleton in the browser. */
export function getQueryClient() {
  if (isServer) return make();
  return (browserClient ??= make());
}

/**
 * `dehydrate(qc)` for `<HydrationBoundary state=...>`. React strips the message of an Error passed from a server to a
 * client component in production, so a dehydrated error is flattened to a plain `{message}` (our messages are `{detail}`
 * texts or our own timeout text, safe to show). `shouldRedactErrors` doesn't apply: it only covers pending promises.
 */
export function dehydrateQueries(qc: QueryClient) {
  const state = dehydrate(qc);
  for (const q of state.queries) if (q.state.error) q.state.error = { message: q.state.error.message } as Error;
  return state;
}
