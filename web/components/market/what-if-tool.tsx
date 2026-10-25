"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { ErrorState } from "@/components/error-state";
import { HouseFields } from "@/components/house-fields";
import { WhatIfChart } from "@/components/market/what-if-chart";
import { NativeSelect } from "@/components/native-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { useModelInfo } from "@/hooks/use-model-info";
import { useWhatIf } from "@/hooks/use-what-if";
import { BOUNDS, FIELDS, FIELD_LABEL, estimateSchema, houseSchema, type EstimateFormValues } from "@/lib/house-schema";
import { featureValue, number, signedMoney } from "@/lib/format";
import type { FeatureName, FeatureStat, HouseFeatures, ModelInfo } from "@/lib/types";
import { WHAT_IF_STEPS } from "@/lib/config";

/** Size of the "+N unit ≈ +$X" sentence per feature. */
const DELTA: Record<FeatureName, [number, string]> = {
  square_footage: [100, "sq ft"],
  bedrooms: [1, "bedroom"],
  bathrooms: [1, "bathroom"],
  year_built: [10, "years"],
  lot_size: [1000, "sq ft of lot"],
  distance_to_city_center: [1, "km from the center"],
  school_rating: [1, "school rating point"],
};

const clamp = (feature: FeatureName, v: number) => Math.min(Math.max(v, BOUNDS[feature][0]), BOUNDS[feature][1]);

function ranges(feature: FeatureName, s: FeatureStat) {
  const span = s.max - s.min || 1;
  const integer = FIELDS.find((f) => f.name === feature)!.integer;
  const round = (v: number) => (integer ? Math.round(v) : Math.round(v * 100) / 100);
  return {
    // Default: training range ± 20%; slider domain: ± 50%.
    from: round(clamp(feature, s.min - 0.2 * span)),
    to: round(clamp(feature, s.max + 0.2 * span)),
    lo: round(clamp(feature, s.min - 0.5 * span)),
    hi: round(clamp(feature, s.max + 0.5 * span)),
    step: integer ? 1 : span / 200,
  };
}

function typicalHouse(info: ModelInfo): HouseFeatures {
  const out = {} as HouseFeatures;
  for (const f of FIELDS) {
    const mean = info.feature_stats[f.name].mean;
    out[f.name] = f.integer ? Math.round(mean) : Math.round(mean * 10) / 10;
  }
  return out;
}

function WhatIf({ info }: { info: ModelInfo }) {
  const form = useForm<EstimateFormValues>({ resolver: zodResolver(estimateSchema), defaultValues: typicalHouse(info), mode: "onChange" });
  const [feature, setFeature] = useState<FeatureName>("square_footage");
  const [range, setRange] = useState<[number, number]>(() => {
    const r = ranges("square_footage", info.feature_stats.square_footage);
    return [r.from, r.to];
  });

  const parsed = houseSchema.safeParse(useWatch({ control: form.control }));
  const base = parsed.success ? parsed.data : null;
  const r = ranges(feature, info.feature_stats[feature]);
  const [from, to] = range;
  const query = useWhatIf(base && from < to ? { base, feature, from, to, steps: WHAT_IF_STEPS } : null);

  const changeFeature = (f: FeatureName) => {
    const nr = ranges(f, info.feature_stats[f]);
    setFeature(f);
    setRange([nr.from, nr.to]);
  };

  const pts = query.data;
  const [delta, unit] = DELTA[feature];
  const slope = pts && pts.length > 1 ? (pts[pts.length - 1].price - pts[0].price) / (pts[pts.length - 1].value - pts[0].value) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Base house</CardTitle>
        </CardHeader>
        <CardContent>
          <form noValidate onSubmit={(e) => e.preventDefault()} className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
            <HouseFields form={form} stats={info.feature_stats} idPrefix="wi" />
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="wi-feature">Feature to vary</Label>
              <NativeSelect id="wi-feature" value={feature} onChange={(e) => changeFeature(e.target.value as FeatureName)}>
                {FIELDS.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  From <output className="font-medium tabular-nums">{featureValue(feature, from)}</output>
                </span>
                <span>
                  To <output className="font-medium tabular-nums">{featureValue(feature, to)}</output>
                </span>
              </div>
              <Slider
                aria-label={`${FIELD_LABEL[feature]} range`}
                min={r.lo}
                max={r.hi}
                step={r.step}
                value={range}
                onValueChange={(v) => Array.isArray(v) && setRange([v[0], v[1]])}
              />
              <p className="text-xs text-muted-foreground">
                Training data covers {featureValue(feature, info.feature_stats[feature].min)}–{featureValue(feature, info.feature_stats[feature].max)}. The shaded area is extrapolation.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Price vs {FIELD_LABEL[feature].toLowerCase()} {query.isFetching && <span className="text-xs font-normal text-muted-foreground">updating…</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!base && <p className="text-sm text-muted-foreground">Fix the base house inputs to see the curve.</p>}
            {query.isError && <ErrorState title="Couldn't compute the curve" message={query.error.message} />}
            {base && !pts && !query.isError && <Skeleton className="h-80 w-full" />}
            {base && pts && (
              <WhatIfChart feature={feature} data={pts} baseValue={base[feature]} stat={info.feature_stats[feature]} from={from} to={to} />
            )}
            {slope !== null && (
              <p aria-live="polite" className="text-sm">
                +{number(delta)} {unit} ≈ <strong>{signedMoney(slope * delta)}</strong> on average across this range.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function WhatIfTool() {
  const { data, isPending, isError, error, refetch } = useModelInfo();
  if (isPending) return <Skeleton className="h-96 w-full" />;
  if (isError) return <ErrorState title="What-if is unavailable" message={error.message} onRetry={() => refetch()} />;
  return <WhatIf info={data} />;
}
