export type HouseFeatures = {
  square_footage: number;
  bedrooms: number;
  bathrooms: number;
  year_built: number;
  lot_size: number;
  distance_to_city_center: number;
  school_rating: number;
};
export type FeatureName = keyof HouseFeatures;

export type Estimate = {
  id: number;
  label: string | null;
  features: HouseFeatures;
  price: number;
  warnings: string[];
  created_at: string;
};

export type FeatureStat = { min: number; max: number; mean: number };

export type ModelInfo = {
  model_type: string;
  intercept: number;
  coefficients: Record<FeatureName, number>;
  feature_stats: Record<FeatureName, FeatureStat>;
  metrics: { cv_5fold: { r2: number; rmse: number; mae: number } };
  n_samples: number;
  trained_at: string;
};

export type Summary = {
  count: number;
  avg_price: number;
  median_price: number;
  min_price: number;
  max_price: number;
  avg_price_per_sqft: number;
};
export type SegmentRow = { segment: string; count: number; avg_price: number; avg_price_per_sqft: number };
export type Property = HouseFeatures & { id: number; price: number };
export type Page<T> = { items: T[]; total: number; page: number; size: number };
export type WhatIfPoint = { value: number; price: number };
export type WhatIfParams = { base: HouseFeatures; feature: FeatureName; from: number; to: number; steps: number };

export const SEGMENT_KEYS = ["BEDROOMS", "SCHOOL_RATING", "DISTANCE", "DECADE"] as const;
export type SegmentKey = (typeof SEGMENT_KEYS)[number];
