import { ErrorState } from "@/components/error-state";
import { ExportButtons } from "@/components/market/export-buttons";
import { PriceScatter } from "@/components/market/price-scatter";
import { SegmentChart } from "@/components/market/segment-chart";
import { StatCard } from "@/components/stat-card";
import type { SearchParams } from "nuqs/server";
import { loadMarketDashboard } from "@/lib/data/server";
import { money } from "@/lib/format";

/** The data regions of the market page; async so the filter bar can render while this streams. */
export async function Dashboard({ raw }: { raw: SearchParams }) {
  const { by, filters, summary, segments, properties } = await loadMarketDashboard(raw);

  if (!summary.ok) return <ErrorState title="Couldn't load the market" message={summary.error} />;
  if (summary.data.count === 0) return <p className="rounded-lg border p-6 text-muted-foreground">No properties match these filters.</p>;

  return (
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
        {!properties.ok ? (
          <ErrorState message={properties.error} />
        ) : (
          <PriceScatter data={properties.data.items} total={properties.data.total} />
        )}
      </div>
      <ExportButtons filters={filters} />
    </div>
  );
}
