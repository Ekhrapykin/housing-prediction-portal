import { describe, expect, it } from "vitest";
import { featureValue, priceTicks, signedMoney } from "@/lib/format";

describe("featureValue", () => {
  it("prints year_built without a thousands separator", () => expect(featureValue("year_built", 1997)).toBe("1997"));
  it("groups the others", () => {
    expect(featureValue("square_footage", 15000)).toBe("15,000");
    expect(featureValue("lot_size", 1234567)).toBe("1,234,567");
  });
  it("keeps one decimal", () => expect(featureValue("school_rating", 7.64)).toBe("7.6"));
});

describe("priceTicks", () => {
  it("uses $50k steps up to $250k and covers max", () => {
    expect(priceTicks(120_000)).toEqual([0, 50_000, 100_000, 150_000]);
    expect(priceTicks(250_000)).toEqual([0, 50_000, 100_000, 150_000, 200_000, 250_000]);
  });
  it("uses $100k steps above that and covers max", () => {
    const t = priceTicks(480_000);
    expect(t).toEqual([0, 100_000, 200_000, 300_000, 400_000, 500_000]);
    expect(t.at(-1)).toBeGreaterThanOrEqual(480_000);
  });
});

describe("signedMoney", () => {
  it("signs positives and zero with +", () => {
    expect(signedMoney(1234)).toBe("+$1,234");
    expect(signedMoney(0)).toBe("+$0");
  });
  it("uses a real minus sign for negatives", () => expect(signedMoney(-1234)).toBe("−$1,234"));
});
