import type { Metadata } from "next";
import { HistoryTable } from "@/components/estimator/history-table";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Estimate history" };

export default function HistoryPage() {
  return (
    <>
      <PageHeader title="History" description="Past estimates. Select 2–4 to compare them." />
      <HistoryTable />
    </>
  );
}
