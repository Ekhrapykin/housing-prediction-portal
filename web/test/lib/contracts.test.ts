// The portal's native mirrors against ../../../contracts/*.json. A failure here means web drifted from the contract.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { WHAT_IF_STEPS } from "@/lib/config";
import { SEGMENT_KEYS, SORT_KEYS, filterParsers } from "@/lib/data/search-params";
import { houseSchema } from "@/lib/house-schema";

const contract = (f: string) => JSON.parse(readFileSync(new URL(`../../../contracts/${f}`, import.meta.url), "utf8"));
const house = contract("house-features.schema.json");
const market = contract("market.json");

// Only the keywords the contract speaks about (zod adds safe-integer bounds to .int()).
const KEEP = ["type", "minimum", "exclusiveMinimum", "maximum", "exclusiveMaximum"];
type Schema = { required?: string[]; properties: Record<string, Record<string, unknown>> };
const feature = (p: Record<string, unknown>) =>
  Object.fromEntries(KEEP.filter((k) => k in p && Math.abs(p[k] as number) !== Number.MAX_SAFE_INTEGER).map((k) => [k, p[k]]));

const web = z.toJSONSchema(houseSchema) as Schema;
const sorted = (a: readonly string[]) => [...a].sort();

describe("house features", () => {
  it("required fields match", () => {
    expect(sorted(web.required ?? []), "houseSchema required fields vs contract").toEqual(sorted(house.required ?? []));
  });

  it.each(Object.keys(house.properties))("feature %s matches", (name) => {
    expect(web.properties[name] && feature(web.properties[name]), `houseSchema "${name}" vs contract`).toEqual(feature(house.properties[name]));
  });

  it("has no feature the contract lacks", () => {
    expect(sorted(Object.keys(web.properties))).toEqual(sorted(Object.keys(house.properties)));
  });
});

describe("market", () => {
  it("SEGMENT_KEYS match", () => expect(sorted(SEGMENT_KEYS), "SEGMENT_KEYS vs contract").toEqual(sorted(market.segment_keys)));
  it("SORT_KEYS match", () => expect(sorted(SORT_KEYS), "SORT_KEYS vs contract").toEqual(sorted(market.sort_keys)));

  it("filter names match", () => {
    expect(sorted(Object.keys(filterParsers)), "filter parser names vs contract").toEqual(sorted(Object.keys(market.filters)));
  });

  // nuqs parsers carry no type tag, so probe: parseAsFloat keeps "1.5", parseAsInteger truncates it.
  // Web may narrow number to integer (whole-dollar prices), never widen integer to number.
  it.each(Object.entries<string>(market.filters))("filter %s (%s) is not wider than the contract", (name, type) => {
    const isFloat = filterParsers[name as keyof typeof filterParsers].parse("1.5") === 1.5;
    expect(isFloat && type === "integer", `filter "${name}" is number in web but integer in the contract`).toBe(false);
  });

  it("WHAT_IF_STEPS is inside the contract range", () => {
    const { minimum, maximum } = market.what_if.steps;
    expect(WHAT_IF_STEPS, `WHAT_IF_STEPS vs [${minimum}, ${maximum}]`).toBeGreaterThanOrEqual(minimum);
    expect(WHAT_IF_STEPS, `WHAT_IF_STEPS vs [${minimum}, ${maximum}]`).toBeLessThanOrEqual(maximum);
  });
});
