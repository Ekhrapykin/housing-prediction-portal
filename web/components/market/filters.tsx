"use client";

import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMarketFilters } from "@/hooks/use-market-filters";
import { SEGMENT_KEYS, type SegmentKey } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filters = ReturnType<typeof useMarketFilters>;
type NumberKey = "min_price" | "max_price" | "min_school_rating" | "max_distance";

function NumberFilter({ name, label, step, filters }: { name: NumberKey; label: string; step?: string; filters: Filters }) {
  const value = filters.params[name];
  return (
    <div className="space-y-1.5">
      <Label htmlFor={`f-${name}`}>{label}</Label>
      <Input
        id={`f-${name}`}
        type="number"
        step={step}
        min={0}
        value={value ?? ""}
        onChange={(e) => filters.setTyped({ [name]: e.target.value === "" ? null : Number(e.target.value) })}
      />
    </div>
  );
}

/** Filter bar + the server-rendered dashboard (children), dimmed while the server re-renders. */
export function Filters({ children }: { children: React.ReactNode }) {
  const filters = useMarketFilters();
  return (
    <>
      <form
        onSubmit={(e) => e.preventDefault()}
        aria-label="Market filters"
        className="mb-6 grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-3 lg:grid-cols-7"
      >
        <div className="space-y-1.5">
          <Label htmlFor="f-min_bedrooms">Min bedrooms</Label>
          <NativeSelect id="f-min_bedrooms" className="w-full" value={filters.params.min_bedrooms ?? ""} onChange={(e) => filters.set({ min_bedrooms: e.target.value ? Number(e.target.value) : null })}>
            <option value="">Any</option>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}+
              </option>
            ))}
          </NativeSelect>
        </div>
        <NumberFilter name="min_price" label="Min price ($)" step="1000" filters={filters} />
        <NumberFilter name="max_price" label="Max price ($)" step="1000" filters={filters} />
        <NumberFilter name="min_school_rating" label="Min school rating" step="0.1" filters={filters} />
        <NumberFilter name="max_distance" label="Max distance (km)" step="0.5" filters={filters} />
        <div className="space-y-1.5">
          <Label htmlFor="f-by">Group by</Label>
          <NativeSelect id="f-by" className="w-full" value={filters.params.by} onChange={(e) => filters.set({ by: e.target.value as SegmentKey })}>
            {SEGMENT_KEYS.map((k) => (
              <option key={k} value={k}>
                {k.replace("_", " ").toLowerCase()}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex items-end">
          <Button type="button" variant="outline" onClick={filters.reset}>
            Reset
          </Button>
        </div>
      </form>
      <div aria-busy={filters.isPending} className={cn("transition-opacity", filters.isPending && "opacity-60")}>
        {children}
      </div>
    </>
  );
}
