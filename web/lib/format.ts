import type { FeatureName } from "./types";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

export const money = (n: number) => usd.format(n);
export const signedMoney = (n: number) => (n >= 0 ? "+" : "−") + usd.format(Math.abs(n));
export const number = (n: number) => num.format(n);
// Years read wrong with a thousands separator ("1,997").
const plain = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, useGrouping: false });
export const featureValue = (name: FeatureName, n: number) => (name === "year_built" ? plain : num).format(n);

/** Round $50k/$100k steps for price axes; Recharts' auto ticks give $95k, $190k, … */
export function priceTicks(max: number): number[] {
  const step = max > 250_000 ? 100_000 : 50_000;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

export const date =(iso: string) => new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
