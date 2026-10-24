import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { WhatIfTool } from "@/components/market/what-if-tool";
import { getQueryClient } from "@/lib/data/query-client";
import { prefetchModelInfo } from "@/lib/data/server";

export const metadata: Metadata = { title: "What-if" };

export default async function WhatIfPage() {
  const qc = getQueryClient();
  await prefetchModelInfo(qc);
  return (
    <>
      <PageHeader title="What-if" description="Change one feature of a house and see how the predicted price responds." />
      <HydrationBoundary state={dehydrate(qc)}>
        <WhatIfTool />
      </HydrationBoundary>
    </>
  );
}
