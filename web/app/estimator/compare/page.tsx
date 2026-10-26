import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { CompareView } from "@/components/estimator/compare-view";
import { PageHeader } from "@/components/page-header";
import { dehydrateQueries, getQueryClient } from "@/lib/data/query-client";
import { prefetchEstimatesByIds } from "@/lib/clients/server";

export const metadata: Metadata = { title: "Compare estimates" };

export default async function ComparePage({ searchParams }: PageProps<"/estimator/compare">) {
  const { ids } = await searchParams;
  const parsed = String(Array.isArray(ids) ? ids[0] : (ids ?? ""))
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 4);
  const qc = getQueryClient();
  if (parsed.length >= 2) await prefetchEstimatesByIds(qc, parsed);
  return (
    <>
      <PageHeader title="Compare" description="Properties side by side. The best value in each row is highlighted." />
      <HydrationBoundary state={dehydrateQueries(qc)}>
        <CompareView ids={parsed} />
      </HydrationBoundary>
    </>
  );
}
