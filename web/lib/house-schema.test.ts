import { describe, expect, it } from "vitest";
import { BOUNDS, EXAMPLE, houseSchema } from "./house-schema";
import type { FeatureName } from "./types";

const ok = (name: FeatureName, v: number) => houseSchema.safeParse({ ...EXAMPLE, [name]: v }).success;

describe("houseSchema", () => {
  it("accepts EXAMPLE", () => expect(houseSchema.safeParse(EXAMPLE).success).toBe(true));

  // Exclusive lower bounds (gt 0) are the integer-or-fraction cases: 0 is out, a tiny positive is in.
  const exclusiveLow: FeatureName[] = ["square_footage", "lot_size"];

  describe.each(Object.entries(BOUNDS) as [FeatureName, [number, number]][])("%s", (name, [lo, hi]) => {
    it("accepts both edges", () => {
      expect(ok(name, lo)).toBe(true);
      expect(ok(name, hi)).toBe(true);
    });
    it("rejects just above the maximum", () => expect(ok(name, hi + 0.5)).toBe(false));
    it("rejects just below the minimum", () => {
      expect(ok(name, exclusiveLow.includes(name) ? 0 : lo - 0.5)).toBe(false);
    });
  });

  it("rejects school_rating 11", () => expect(ok("school_rating", 11)).toBe(false));

  it("rejects fractional bedrooms and year_built", () => {
    expect(ok("bedrooms", 2.5)).toBe(false);
    expect(ok("year_built", 1999.5)).toBe(false);
  });

  it("reports an empty number input (NaN) as required", () => {
    const r = houseSchema.safeParse({ ...EXAMPLE, bedrooms: NaN, school_rating: NaN });
    const msgs = r.error?.issues.map((i) => i.message);
    expect(msgs).toEqual(["Bedrooms is required", "School rating is required"]);
  });

  it("reports a non-number as 'must be a number'", () => {
    const r = houseSchema.safeParse({ ...EXAMPLE, bathrooms: "x" });
    expect(r.error?.issues[0].message).toBe("Bathrooms must be a number");
  });
});
