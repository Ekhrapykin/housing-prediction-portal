import type { Metadata } from "next";
import { EstimateForm } from "@/components/estimator/estimate-form";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Estimator" };

export default function EstimatorPage() {
  return (
    <>
      <PageHeader title="Price estimator" description="Enter a house's features to predict its price." />
      <EstimateForm />
    </>
  );
}
