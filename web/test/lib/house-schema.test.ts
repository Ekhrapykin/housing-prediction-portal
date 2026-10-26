import { describe, expect, it } from "vitest";
import { EXAMPLE, FIELDS, bounds, houseSchema, isInteger, type FeatureName } from "@/lib/house-schema";

const ok = (name: FeatureName, v: number) => houseSchema.safeParse({ ...EXAMPLE, [name]: v }).success;

describe("houseSchema", () => {
  it("accepts EXAMPLE", () => expect(houseSchema.safeParse(EXAMPLE).success).toBe(true));

  // Exclusive lower bounds (gt 0) are the integer-or-fraction cases: 0 is out, a tiny positive is in.
  const exclusiveLow: FeatureName[] = ["square_footage", "lot_size"];

  describe.each(FIELDS.map((f) => [f.name, ...bounds(f.name)] as const))("%s", (name, lo, hi) => {
    it("accepts both edges", () => {
      expect(ok(name, lo)).toBe(true);
      expect(ok(name, hi)).toBe(true);
    });
    it("rejects just above the maximum", () => expect(ok(name, hi + 0.5)).toBe(false));
    it("rejects just below the minimum", () => {
      expect(ok(name, exclusiveLow.includes(name) ? 0 : lo - 0.5)).toBe(false);
    });
  });

  it("bounds() reads min and max from the schema", () => {
    expect(bounds("bedrooms")).toEqual([0, 20]);
    expect(bounds("year_built")).toEqual([1800, 2100]);
    expect(bounds("school_rating")).toEqual([0, 10]);
  });

  it("bounds() floors an exclusive minimum (gt 0) at 1", () => {
    expect(bounds("square_footage")).toEqual([1, 20_000]);
    expect(bounds("lot_size")).toEqual([1, 1_000_000]);
  });

  it("isInteger() is true only for the .int() fields", () => {
    expect(FIELDS.filter((f) => isInteger(f.name)).map((f) => f.name)).toEqual(["bedrooms", "year_built"]);
  });

  it("placeholders come from EXAMPLE", () => {
    expect(FIELDS.every((f) => f.placeholder === String(EXAMPLE[f.name]))).toBe(true);
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
