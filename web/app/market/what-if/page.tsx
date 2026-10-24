import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { WhatIfTool } from "@/components/market/what-if-tool";

export const metadata: Metadata = { title: "What-if" };

export default function WhatIfPage() {
  return (
    <>
      <PageHeader title="What-if" description="Change one feature of a house and see how the predicted price responds." />
      <WhatIfTool />
    </>
  );
}
