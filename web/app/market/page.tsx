import type { Metadata } from "next";
import { ErrorState } from "@/components/error-state";
import { ExportButtons } from "@/components/market/export-buttons";
import { Filters } from "@/components/market/filters";
import { PriceScatter } from "@/components/market/price-scatter";
import { SegmentChart } from "@/components/market/segment-chart";
import { StatCard } from "@/components/stat-card";
import { PageHeader } from "@/components/page-header";
import { attempt, filterParams, getProperties, getSegments, getSummary } from "@/lib/market-server";
import { money } from "@/lib/format";
import { SEGMENT_KEYS, type SegmentKey } from "@/lib/types";

export const metadata: Metadata = { title: "Market dashboard" };

export default async function MarketPage({ searchParams }: PageProps<"/market">) {
  const raw = await searchParams;
  const sp = filterParams(raw);
  const byRaw = Array.isArray(raw.by) ? raw.by[0] : raw.by;
  const by: SegmentKey = SEGMENT_KEYS.find((k) => k === byRaw) ?? "BEDROOMS";
  const segParams = new URLSearchParams(sp);
  segParams.set("by", by);

  const [summary, segments, properties] = await Promise.all([
    attempt(getSummary(sp)),
    attempt(getSegments(segParams)),
    attempt(getProperties(sp)),
  ]);

  return (
    <>
      <PageHeader title="Market dashboard" description="Filters live in the URL, so you can share or bookmark any view." />
      <Filters>
        {!summary.ok ? (
          <ErrorState title="Couldn't load the market" message={summary.error} />
        ) : summary.data.count === 0 ? (
          <p className="rounded-lg border p-6 text-muted-foreground">No properties match these filters.</p>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard label="Properties" value={String(summary.data.count)} />
              <StatCard label="Average price" value={money(summary.data.avg_price)} />
              <StatCard label="Median price" value={money(summary.data.median_price)} />
              <StatCard label="Price range" value={`${money(summary.data.min_price)} – ${money(summary.data.max_price)}`} />
              <StatCard label="Avg $ / sq ft" value={money(summary.data.avg_price_per_sqft)} />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              {!segments.ok ? <ErrorState message={segments.error} /> : <SegmentChart data={segments.data} by={by} />}
              {!properties.ok ? <ErrorState message={properties.error} /> : <PriceScatter data={properties.data.items} />}
            </div>
            <ExportButtons query={sp.toString()} />
          </div>
        )}
      </Filters>
    </>
  );
}
