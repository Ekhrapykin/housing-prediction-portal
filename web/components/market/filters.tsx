"use client";

import { CalendarDays, GraduationCap, type LucideIcon, MapPin, RotateCcw, Tag } from "lucide-react";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useMarketFilters } from "@/hooks/use-market-filters";
import { SEGMENT_KEYS, type SegmentKey } from "@/lib/data/search-params";
import { money, number } from "@/lib/format";
import { cn } from "@/lib/utils";

type Filters = ReturnType<typeof useMarketFilters>;
type NumberKey = "min_price" | "max_price" | "min_year_built" | "max_year_built" | "min_school_rating" | "max_distance";

/**
 * A slider over fixed track limits; the selection lives in the URL as before.
 * A thumb at its end of the track means "no limit", so it clears that param.
 */
function SliderFilter({
  label,
  icon: Icon,
  min,
  max,
  step,
  keys,
  format,
  filters,
}: {
  label: string;
  icon: LucideIcon;
  min: number;
  max: number;
  step: number;
  /** [lower, upper] param; null where that side isn't filterable. */
  keys: [NumberKey | null, NumberKey | null];
  format: (n: number) => string;
  filters: Filters;
}) {
  const [loKey, hiKey] = keys;
  const lo = loKey ? (filters.params[loKey] ?? min) : null;
  const hi = hiKey ? (filters.params[hiKey] ?? max) : null;
  const value = [lo, hi].filter((v) => v !== null);
  const thumbKeys = [loKey, hiKey].filter((k) => k !== null);
  const atMin = lo === null || lo === min;
  const atMax = hi === null || hi === max;
  const summary = atMin && atMax ? "Any" : atMax ? `${format(lo!)}+` : atMin ? `up to ${format(hi!)}` : `${format(lo!)} – ${format(hi!)}`;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 font-medium">
          <Icon className="size-4 text-primary" aria-hidden />
          {label}
        </span>
        <span className="tabular-nums text-muted-foreground">{summary}</span>
      </div>
      <Slider
        aria-label={label}
        getThumbLabel={(i) => `${thumbKeys[i] === loKey ? "Min" : "Max"} ${label.toLowerCase()}`}
        min={min}
        max={max}
        step={step}
        value={value}
        onValueChange={(v) => {
          const vs = Array.isArray(v) ? v : [v];
          filters.setTyped(
            Object.fromEntries(thumbKeys.map((k, i) => [k, vs[i] === (k === loKey ? min : max) ? null : vs[i]])),
          );
        }}
      />
    </div>
  );
}

function BedroomsFilter({ name, label, filters }: { name: "min_bedrooms" | "max_bedrooms"; label: string; filters: Filters }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={`f-${name}`}>{label}</Label>
      <NativeSelect id={`f-${name}`} className="w-full" value={filters.params[name] ?? ""} onChange={(e) => filters.set({ [name]: e.target.value ? Number(e.target.value) : null })}>
        <option value="">Any</option>
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <option key={n} value={n}>
            {n}
            {name === "min_bedrooms" ? "+" : ""}
          </option>
        ))}
      </NativeSelect>
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
        className="mb-6 grid gap-x-8 gap-y-5 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <SliderFilter label="Price" icon={Tag} min={0} max={600_000} step={5_000} keys={["min_price", "max_price"]} format={money} filters={filters} />
        <SliderFilter label="Year built" icon={CalendarDays} min={1950} max={2025} step={1} keys={["min_year_built", "max_year_built"]} format={String} filters={filters} />
        <SliderFilter label="School rating" icon={GraduationCap} min={0} max={10} step={0.1} keys={["min_school_rating", null]} format={number} filters={filters} />
        <SliderFilter label="Distance to center" icon={MapPin} min={0} max={20} step={0.5} keys={[null, "max_distance"]} format={(n) => `${number(n)} km`} filters={filters} />
        <BedroomsFilter name="min_bedrooms" label="Min bedrooms" filters={filters} />
        <BedroomsFilter name="max_bedrooms" label="Max bedrooms" filters={filters} />
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
            <RotateCcw aria-hidden />
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
