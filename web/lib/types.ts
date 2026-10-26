export type { FeatureName, HouseFeatures } from "./house-schema";
import type { FeatureName, HouseFeatures } from "./house-schema";

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
/** A page of properties as the table shows it: `page` is 1-based, `first` / `last` are 1-based row numbers (0 when empty). */
export type PropertiesView = { items: Property[]; total: number; page: number; lastPage: number; first: number; last: number };
export type WhatIfPoint = { value: number; price: number };
export type WhatIfParams = { base: HouseFeatures; feature: FeatureName; from: number; to: number; steps: number };
