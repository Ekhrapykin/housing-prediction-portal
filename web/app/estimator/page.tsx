import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { EstimateForm } from "@/components/estimator/estimate-form";
import { PageHeader } from "@/components/page-header";
import { getQueryClient } from "@/lib/data/query-client";
import { prefetchModelInfo } from "@/lib/data/server";

export const metadata: Metadata = { title: "Estimator" };

export default async function EstimatorPage() {
  const qc = getQueryClient();
  await prefetchModelInfo(qc);
  return (
    <>
      <PageHeader title="Price estimator" description="Enter a house's features to predict its price." />
      <HydrationBoundary state={dehydrate(qc)}>
        <EstimateForm />
      </HydrationBoundary>
    </>
  );
}
