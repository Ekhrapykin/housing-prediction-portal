import type { Metadata } from "next";
import { Suspense } from "react";
import { Dashboard } from "@/components/market/dashboard";
import { DashboardSkeleton } from "@/components/market/dashboard-skeleton";
import { Filters } from "@/components/market/filters";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Market dashboard" };

export default async function MarketPage({ searchParams }: PageProps<"/market">) {
  const raw = await searchParams;
  return (
    <>
      <PageHeader title="Market dashboard" description="Filters live in the URL, so you can share or bookmark any view." />
      <Filters>
        <Suspense key={JSON.stringify(raw)} fallback={<DashboardSkeleton />}>
          <Dashboard raw={raw} />
        </Suspense>
      </Filters>
    </>
  );
}
