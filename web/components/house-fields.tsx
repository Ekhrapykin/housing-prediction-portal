"use client";

import { Bath, BedDouble, CalendarDays, GraduationCap, LandPlot, type LucideIcon, MapPin, Ruler } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FIELDS, type EstimateFormValues } from "@/lib/house-schema";
import type { FeatureName, FeatureStat } from "@/lib/types";
import { featureValue } from "@/lib/format";

const ICON: Record<FeatureName, LucideIcon> = {
  square_footage: Ruler,
  bedrooms: BedDouble,
  bathrooms: Bath,
  year_built: CalendarDays,
  lot_size: LandPlot,
  distance_to_city_center: MapPin,
  school_rating: GraduationCap,
};

/** The 7 house inputs, rendered from FIELDS. Shared by the estimator form and the what-if base house. */
export function HouseFields({
  form,
  stats,
  idPrefix,
}: {
  form: UseFormReturn<EstimateFormValues>;
  stats?: Record<FeatureName, FeatureStat>;
  idPrefix: string;
}) {
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <>
      {FIELDS.map((f) => {
        const id = `${idPrefix}-${f.name}`;
        const error = errors[f.name]?.message;
        const stat = stats?.[f.name];
        const Icon = ICON[f.name];
        return (
          <div key={f.name} className="space-y-1.5">
            <Label htmlFor={id}>
              <Icon className="size-4 text-primary" aria-hidden />
              <span>
                {f.label}
                {f.unit && <span className="font-normal text-muted-foreground"> ({f.unit})</span>}
              </span>
            </Label>
            <Input
              id={id}
              type="number"
              step={f.step}
              inputMode="decimal"
              placeholder={`e.g. ${f.placeholder}`}
              className="placeholder:text-muted-foreground/60"
              aria-invalid={error ? true : undefined}
              aria-describedby={`${id}-hint ${id}-error`}
              {...register(f.name, { valueAsNumber: true })}
            />
            <p id={`${id}-hint`} className="min-h-4 text-xs text-muted-foreground">
              {stat && `Typical: ${featureValue(f.name, stat.min)}–${featureValue(f.name, stat.max)}`}
            </p>
            <p id={`${id}-error`} aria-live="polite" className="text-xs text-destructive">
              {error}
            </p>
          </div>
        );
      })}
    </>
  );
}
