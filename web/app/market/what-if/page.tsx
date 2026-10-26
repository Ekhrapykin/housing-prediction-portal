import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { WhatIfTool } from "@/components/market/what-if-tool";
import { dehydrateQueries, getQueryClient } from "@/lib/data/query-client";
import { prefetch, serverEstimator } from "@/lib/clients/server";

export const metadata: Metadata = { title: "What-if" };

export default async function WhatIfPage() {
  const qc = getQueryClient();
  await prefetch(qc, serverEstimator.modelInfo());
  return (
    <>
      <PageHeader title="What-if" description="Change one feature of a house and see how the predicted price responds." />
      <HydrationBoundary state={dehydrateQueries(qc)}>
        <WhatIfTool />
      </HydrationBoundary>
    </>
  );
}
