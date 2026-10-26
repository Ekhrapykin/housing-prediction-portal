import { dehydrate } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/clients/errors";
import { getQueryClient } from "@/lib/data/query-client";

describe("getQueryClient dehydration", () => {
  it("dehydrates a failed prefetch with a readable error", async () => {
    const qc = getQueryClient();
    await qc.prefetchQuery({ queryKey: ["down"], retry: false, queryFn: () => Promise.reject(new ApiError(0, "The estimator service timed out")) });
    const [q] = dehydrate(qc).queries;
    expect(q.state.status).toBe("error");
    expect(q.state.error).toMatchObject({ message: "The estimator service timed out" });
  });

  it("still dehydrates successes", async () => {
    const qc = getQueryClient();
    await qc.prefetchQuery({ queryKey: ["ok"], queryFn: () => 1 });
    expect(dehydrate(qc).queries[0].state.data).toBe(1);
  });
});
