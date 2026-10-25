// Compares the portal's native mirrors with ../contracts/*.json. Run: npm run check:contracts
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { WHAT_IF_STEPS } from "../lib/config";
import { SORT_KEYS } from "../lib/data/endpoints";
import { filterParsers } from "../lib/data/search-params";
import { houseSchema } from "../lib/house-schema";
import { SEGMENT_KEYS } from "../lib/types";

const contract = (f: string) => JSON.parse(readFileSync(new URL(`../../contracts/${f}`, import.meta.url), "utf8"));
const house = contract("house-features.schema.json");
const market = contract("market.json");

const errors: string[] = [];
const show = (v: unknown) => JSON.stringify(v);
function expectEqual(what: string, actual: unknown, expected: unknown) {
  if (!isDeepStrictEqual(actual, expected)) errors.push(`${what}\n    web:      ${show(actual)}\n    contract: ${show(expected)}`);
}

// House features: only the keywords the contract speaks about (zod adds safe-integer bounds to .int()).
const KEEP = ["type", "minimum", "exclusiveMinimum", "maximum", "exclusiveMaximum"];
const SAFE_INT = Number.MAX_SAFE_INTEGER;
type Schema = { required?: string[]; properties: Record<string, Record<string, unknown>> };
function normaliseHouse(schema: Schema) {
  const props: Record<string, Record<string, unknown>> = {};
  for (const [name, p] of Object.entries(schema.properties).sort(([a], [b]) => a.localeCompare(b))) {
    const kept = Object.fromEntries(KEEP.filter((k) => k in p && Math.abs(p[k] as number) !== SAFE_INT).map((k) => [k, p[k]]));
    props[name] = Object.fromEntries(Object.entries(kept).sort(([a], [b]) => a.localeCompare(b)));
  }
  return { required: [...(schema.required ?? [])].sort(), properties: props };
}
const web = normaliseHouse(z.toJSONSchema(houseSchema) as Schema);
const want = normaliseHouse(house);
expectEqual("house required fields", web.required, want.required);
for (const name of new Set([...Object.keys(web.properties), ...Object.keys(want.properties)]))
  expectEqual(`house feature "${name}"`, web.properties[name], want.properties[name]);

// Market keys.
expectEqual("SEGMENT_KEYS", [...SEGMENT_KEYS].sort(), [...market.segment_keys].sort());
expectEqual("SORT_KEYS", [...SORT_KEYS].sort(), [...market.sort_keys].sort());

// Filters: nuqs parsers carry no type tag, so probe: parseAsFloat keeps "1.5", parseAsInteger truncates it.
// Web may narrow number to integer (whole-dollar prices), never widen integer to number.
const webFilters = Object.fromEntries(Object.entries(filterParsers).map(([k, p]) => [k, p.parse("1.5") === 1.5 ? "number" : "integer"]));
expectEqual("filter names", Object.keys(webFilters).sort(), Object.keys(market.filters).sort());
for (const [k, t] of Object.entries<string>(market.filters))
  if (webFilters[k] === "number" && t === "integer") errors.push(`filter "${k}" is number in web but integer in the contract`);

// What-if steps.
const { minimum, maximum } = market.what_if.steps;
if (WHAT_IF_STEPS < minimum || WHAT_IF_STEPS > maximum)
  errors.push(`WHAT_IF_STEPS=${WHAT_IF_STEPS} is outside the contract range [${minimum}, ${maximum}]`);

if (errors.length) {
  console.error(`Contract drift (web vs contracts/):\n\n${errors.map((e) => `  - ${e}`).join("\n")}\n`);
  process.exit(1);
}
console.log("web matches contracts/");
