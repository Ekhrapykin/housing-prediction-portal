import { createLoader, type SearchParams, createParser, parseAsFloat, parseAsInteger, parseAsStringLiteral } from "nuqs/server";
import { SEGMENT_KEYS } from "@/lib/types";
import { SORT_KEYS } from "@/lib/clients/market-paths";

/** Every URL param of the market app, shared by the server loader and the client hooks. */
export const filterParsers = {
  min_bedrooms: parseAsInteger,
  max_bedrooms: parseAsInteger,
  min_price: parseAsInteger,
  max_price: parseAsInteger,
  min_year_built: parseAsInteger,
  max_year_built: parseAsInteger,
  min_school_rating: parseAsFloat,
  max_distance: parseAsFloat,
};

/** 1-based `?page=`; anything below 1 or unparseable falls back to the default (1). */
const parseAsPage = createParser({
  parse: (v) => {
    const n = parseAsInteger.parse(v);
    return n !== null && n > 0 ? n : null;
  },
  serialize: String,
}).withDefault(1);

export const marketParsers = {
  ...filterParsers,
  by: parseAsStringLiteral(SEGMENT_KEYS).withDefault("BEDROOMS"),
};

export const propertiesParsers = {
  ...filterParsers,
  sort: parseAsStringLiteral(SORT_KEYS),
  dir: parseAsStringLiteral(["asc", "desc"] as const).withDefault("asc"),
  page: parseAsPage,
};

const load = createLoader({ ...marketParsers, ...propertiesParsers });

/** Parse a page's searchParams: `filters` apart from `by` / `sort` / `dir` / `page`. */
export function loadSearchParams(raw: SearchParams) {
  const { by, sort, dir, page, ...filters } = load(raw);
  return { by, sort, dir, page, filters };
}
