import { z } from "zod";

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

export type HouseFeatures = z.infer<typeof houseSchema>;
export type FeatureName = keyof HouseFeatures;

export const estimateSchema = houseSchema.extend({
  label: z.string().max(80, "At most 80 characters").optional(),
});
export type EstimateFormValues = z.infer<typeof estimateSchema>;

export const EXAMPLE: HouseFeatures = {
  square_footage: 1550, bedrooms: 3, bathrooms: 2, year_built: 1997,
  lot_size: 6800, distance_to_city_center: 4.1, school_rating: 7.6,
};

type Field = { name: FeatureName; label: string; unit: string; step: string };
const FIELD_DEFS: Field[] = [
  { name: "square_footage", label: "Square footage", unit: "sq ft", step: "1" },
  { name: "bedrooms", label: "Bedrooms", unit: "", step: "1" },
  { name: "bathrooms", label: "Bathrooms", unit: "", step: "0.5" },
  { name: "year_built", label: "Year built", unit: "", step: "1" },
  { name: "lot_size", label: "Lot size", unit: "sq ft", step: "1" },
  { name: "distance_to_city_center", label: "Distance to city center", unit: "km", step: "0.1" },
  { name: "school_rating", label: "School rating", unit: "/ 10", step: "0.1" },
];
/** Form fields in display order; the placeholder is the EXAMPLE value. */
export const FIELDS = FIELD_DEFS.map((f) => ({ ...f, placeholder: String(EXAMPLE[f.name]) }));

export const FIELD_LABEL = Object.fromEntries(FIELDS.map((f) => [f.name, f.label])) as Record<FeatureName, string>;

// Bounds and integer-ness are read from the schema itself, so they can't drift from the zod rules.
const jsonProps = z.toJSONSchema(houseSchema).properties as Record<FeatureName, { type: string; minimum?: number; exclusiveMinimum?: number; maximum: number }>;

/** [min, max] of a feature (what the backends accept), for clamping. An exclusive minimum (`gt(0)`) becomes the next whole number (1). */
export const bounds = (name: FeatureName): [number, number] => {
  const { minimum, exclusiveMinimum, maximum } = jsonProps[name];
  return [minimum ?? Math.floor(exclusiveMinimum!) + 1, maximum];
};

export const isInteger = (name: FeatureName) => jsonProps[name].type === "integer";
