import { z } from "zod";
import type { FeatureName, HouseFeatures } from "./types";

// An empty number input arrives as NaN (valueAsNumber), so report it as missing, not as "not a number".
const num = (name: string) =>
  z.number({ error: (iss) => (iss.input === undefined || Number.isNaN(iss.input) ? `${name} is required` : `${name} must be a number`) });

// Bounds mirror estimator-api/app/schemas.py and ml-api/app/schemas.py.
export const houseSchema = z.object({
  square_footage: num("Square footage").gt(0, "Must be greater than 0").max(20_000, "At most 20,000"),
  bedrooms: num("Bedrooms").int("Whole number").min(0, "At least 0").max(20, "At most 20"),
  bathrooms: num("Bathrooms").min(0, "At least 0").max(20, "At most 20"),
  year_built: num("Year built").int("Whole number").min(1800, "At least 1800").max(2100, "At most 2100"),
  lot_size: num("Lot size").gt(0, "Must be greater than 0").max(1_000_000, "At most 1,000,000"),
  distance_to_city_center: num("Distance").min(0, "At least 0").max(500, "At most 500"),
  school_rating: num("School rating").min(0, "At least 0").max(10, "At most 10"),
});

export const estimateSchema = houseSchema.extend({
  label: z.string().max(80, "At most 80 characters").optional(),
});
export type EstimateFormValues = z.infer<typeof estimateSchema>;

export const FIELDS: { name: FeatureName; label: string; unit: string; step: string; placeholder: string; integer: boolean }[] = [
  { name: "square_footage", label: "Square footage", unit: "sq ft", step: "1", placeholder: "1550", integer: false },
  { name: "bedrooms", label: "Bedrooms", unit: "", step: "1", placeholder: "3", integer: true },
  { name: "bathrooms", label: "Bathrooms", unit: "", step: "0.5", placeholder: "2", integer: false },
  { name: "year_built", label: "Year built", unit: "", step: "1", placeholder: "1997", integer: true },
  { name: "lot_size", label: "Lot size", unit: "sq ft", step: "1", placeholder: "6800", integer: false },
  { name: "distance_to_city_center", label: "Distance to city center", unit: "km", step: "0.1", placeholder: "4.1", integer: false },
  { name: "school_rating", label: "School rating", unit: "/ 10", step: "0.1", placeholder: "7.6", integer: false },
];

export const FIELD_LABEL = Object.fromEntries(FIELDS.map((f) => [f.name, f.label])) as Record<FeatureName, string>;

export const EXAMPLE: HouseFeatures = {
  square_footage: 1550, bedrooms: 3, bathrooms: 2, year_built: 1997,
  lot_size: 6800, distance_to_city_center: 4.1, school_rating: 7.6,
};

/** Hard limits per feature (what the backends accept); used to clamp what-if ranges. */
export const BOUNDS: Record<FeatureName, [number, number]> = {
  square_footage: [1, 20_000],
  bedrooms: [0, 20],
  bathrooms: [0, 20],
  year_built: [1800, 2100],
  lot_size: [1, 1_000_000],
  distance_to_city_center: [0, 500],
  school_rating: [0, 10],
};
