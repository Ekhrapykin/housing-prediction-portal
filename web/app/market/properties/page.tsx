import type { Metadata } from "next";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";
import { PropertiesTable } from "@/components/market/properties-table";
import { attempt, getProperties } from "@/lib/market-server";

export const metadata: Metadata = { title: "Properties" };
// Needs the backend at request time; never prerender (the build has no market-api).
export const dynamic = "force-dynamic";

export default async function PropertiesPage() {
  const result = await attempt(getProperties(new URLSearchParams()));
  return (
    <>
      <PageHeader title="Properties" description="Every property in the dataset. Click a column header to sort." />
      {result.ok ? <PropertiesTable data={result.data.items} /> : <ErrorState title="Couldn't load properties" message={result.error} />}
    </>
  );
}
