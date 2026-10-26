// The URL-to-backend translation in the market client, against a recording fake.
import { describe, expect, it } from "vitest";
import { loadSearchParams } from "@/lib/data/search-params";
import type { Property } from "@/lib/types";
import { PROPERTIES_PAGE_SIZE, SCATTER_SIZE, createMarketLoaders, filtersQuery, pagingQuery, toPropertiesView } from "@/lib/clients/market";
import type { Get } from "@/lib/clients/transport";

const NONE = loadSearchParams({}).filters;

describe("filtersQuery", () => {
  it("skips nulls", () => {
    expect(filtersQuery({ ...NONE, min_bedrooms: 3, min_price: 0 }).toString()).toBe("min_bedrooms=3&min_price=0");
  });

  it("is empty when nothing is set, so callers leave no trailing ?", () => {
    expect(filtersQuery(NONE).toString()).toBe("");
  });
});

describe("properties loader", () => {
  const seen: string[] = [];
  const get = (async (_b: string, path: string) => (seen.push(path), { items: [], total: 0, page: 0, size: PROPERTIES_PAGE_SIZE })) as Get;
  const run = async (raw: Parameters<ReturnType<typeof createMarketLoaders>["properties"]>[0]) => {
    seen.length = 0;
    await createMarketLoaders(get).properties(raw);
    return new URL(seen[0], "http://x").searchParams;
  };

  it("sends sort,dir in market-api's format", async () => {
    expect((await run({ sort: "price", dir: "desc" })).get("sort")).toBe("price,desc");
  });

  it("omits sort when none is chosen", async () => {
    expect((await run({})).has("sort")).toBe(false);
  });

  it("turns the 1-based page into the backend's 0-based one", async () => {
    expect((await run({})).get("page")).toBe("0");
    expect((await run({ page: "3" })).get("page")).toBe("2");
  });

  it("passes filters through and sets the page size", async () => {
    const sp = await run({ min_bedrooms: "3" });
    expect(sp.get("min_bedrooms")).toBe("3");
    expect(sp.get("size")).toBe(String(PROPERTIES_PAGE_SIZE));
  });
});

describe("paging translation", () => {
  // URL (1-based page, sort + dir) -> market-api (0-based page, "sort,dir").
  it("sort and dir round-trip through market-api's format", () => {
    const sp = pagingQuery(new URLSearchParams(), { page: 1, sort: "school_rating", dir: "desc" }, 15);
    expect(sp.get("sort")!.split(",")).toEqual(["school_rating", "desc"]);
  });

  it("keeps the filters already in the query", () => {
    const sp = pagingQuery(filtersQuery({ ...NONE, min_bedrooms: 2 }), { page: 1, sort: null, dir: "asc" }, 15);
    expect(sp.get("min_bedrooms")).toBe("2");
  });
});

describe("toPropertiesView", () => {
  const rows = (n: number) => Array.from({ length: n }, () => ({}) as Property);
  const view = (page: number, total: number, n: number) => {
    const { items, ...rest } = toPropertiesView({ items: rows(n), total, page, size: 15 });
    expect(items).toHaveLength(n);
    return rest;
  };

  it("turns the backend's 0-based page into a 1-based view", () => {
    expect(view(2, 40, 10)).toEqual({ total: 40, page: 3, lastPage: 3, first: 31, last: 40 });
  });

  it("has one page and no rows when empty", () => {
    expect(view(0, 0, 0)).toEqual({ total: 0, page: 1, lastPage: 1, first: 0, last: 0 });
  });

  it("does not clamp a page past the end", () => {
    expect(view(98, 50, 0)).toEqual({ total: 50, page: 99, lastPage: 4, first: 0, last: 0 });
  });
});

describe("page sizes", () => {
  // market-api clamps size silently (market-api application.yml: max-page-size), which would drop scatter points.
  const BACKEND_MAX_PAGE_SIZE = 200;
  it("stay within market-api's max page size", () => {
    expect(SCATTER_SIZE).toBeLessThanOrEqual(BACKEND_MAX_PAGE_SIZE);
    expect(PROPERTIES_PAGE_SIZE).toBeLessThanOrEqual(BACKEND_MAX_PAGE_SIZE);
  });
});
