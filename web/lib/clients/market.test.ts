// The URL-to-backend translation in the market client, against a recording transport.
import { describe, expect, it, vi } from "vitest";
import { loadSearchParams } from "@/lib/data/search-params";
import { PROPERTIES_PAGE_SIZE, SCATTER_SIZE, createMarketClient, filtersQuery, pagingQuery, urlPage } from "./market";
import type { Transport } from "./transport";

vi.mock("server-only", () => ({}));

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
  const transport = (async (_b: string, path: string) => (seen.push(path), { content: [] })) as Transport;
  const run = async (raw: Parameters<ReturnType<typeof createMarketClient>["properties"]>[0]) => {
    seen.length = 0;
    await createMarketClient(transport).properties(raw);
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
  // URL (1-based page, sort + dir) -> market-api (0-based page, "sort,dir") and back.
  it.each([1, 2, 7])("page %i survives the round trip", (page) => {
    const sp = pagingQuery(new URLSearchParams(), { page, sort: null, dir: "asc" }, 15);
    expect(urlPage(Number(sp.get("page")))).toBe(page);
  });

  it("sort and dir round-trip through market-api's format", () => {
    const sp = pagingQuery(new URLSearchParams(), { page: 1, sort: "school_rating", dir: "desc" }, 15);
    expect(sp.get("sort")!.split(",")).toEqual(["school_rating", "desc"]);
  });

  it("keeps the filters already in the query", () => {
    const sp = pagingQuery(filtersQuery({ ...NONE, min_bedrooms: 2 }), { page: 1, sort: null, dir: "asc" }, 15);
    expect(sp.get("min_bedrooms")).toBe("2");
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
