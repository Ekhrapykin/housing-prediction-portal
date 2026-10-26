import type { Metadata } from "next";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";
import { PropertiesTable } from "@/components/market/properties-table";
import { loadProperties } from "@/lib/clients/server";

export const metadata: Metadata = { title: "Properties" };

export default async function PropertiesPage({ searchParams }: PageProps<"/market/properties">) {
  const { filters, sort, dir, properties } = await loadProperties(await searchParams);
  return (
    <>
      <PageHeader title="Properties" description="Every property in the dataset, 15 per page. Click a column header to sort." />
      {properties.ok ? (
        <PropertiesTable data={properties.data} sort={sort} dir={dir} filters={filters} />
      ) : (
        <ErrorState title="Couldn't load properties" message={properties.error} />
      )}
    </>
  );
}
