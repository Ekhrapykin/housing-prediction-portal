import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { HistoryTable } from "@/components/estimator/history-table";
import { PageHeader } from "@/components/page-header";
import { dehydrateQueries, getQueryClient } from "@/lib/data/query-client";
import { prefetch, serverEstimator } from "@/lib/clients/server";

export const metadata: Metadata = { title: "Estimate history" };

export default async function HistoryPage() {
  const qc = getQueryClient();
  await prefetch(qc, serverEstimator.estimates());
  return (
    <>
      <PageHeader title="History" description="Past estimates. Select 2–4 to compare them." />
      <HydrationBoundary state={dehydrateQueries(qc)}>
        <HistoryTable />
      </HydrationBoundary>
    </>
  );
}
