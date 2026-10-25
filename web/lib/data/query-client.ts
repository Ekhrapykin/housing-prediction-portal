import { defaultShouldDehydrateQuery, isServer, QueryClient } from "@tanstack/react-query";
import { QUERY_STALE_TIME_MS } from "@/lib/config";

const make = () =>
  new QueryClient({
    defaultOptions: {
      queries: { staleTime: QUERY_STALE_TIME_MS, retry: 1 },
      dehydrate: { shouldDehydrateQuery: (q) => defaultShouldDehydrateQuery(q) || q.state.status === "pending" },
    },
  });

let browserClient: QueryClient | undefined;

/** A fresh client per server request (never share user data), one singleton in the browser. */
export function getQueryClient() {
  if (isServer) return make();
  return (browserClient ??= make());
}
