import type { Metadata } from "next";
import { CompareView } from "@/components/estimator/compare-view";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Compare estimates" };

export default async function ComparePage({ searchParams }: PageProps<"/estimator/compare">) {
  const { ids } = await searchParams;
  const parsed = String(Array.isArray(ids) ? ids[0] : (ids ?? ""))
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 4);
  return (
    <>
      <PageHeader title="Compare" description="Properties side by side. The best value in each row is highlighted." />
      <CompareView ids={parsed} />
    </>
  );
}
