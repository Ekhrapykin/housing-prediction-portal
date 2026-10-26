import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { EstimateForm } from "@/components/estimator/estimate-form";
import { PageHeader } from "@/components/page-header";
import { dehydrateQueries, getQueryClient } from "@/lib/data/query-client";
import { prefetch, serverEstimator } from "@/lib/clients/server";

export const metadata: Metadata = { title: "Estimator" };

export default async function EstimatorPage() {
  const qc = getQueryClient();
  await prefetch(qc, serverEstimator.modelInfo());
  return (
    <>
      <PageHeader title="Price estimator" description="Enter a house's features to predict its price." />
      <HydrationBoundary state={dehydrateQueries(qc)}>
        <EstimateForm />
      </HydrationBoundary>
    </>
  );
}
