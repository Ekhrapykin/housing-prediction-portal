// The URL-to-backend translation in the market client, against a recording transport.
import { describe, expect, it, vi } from "vitest";
import { createMarketClient, filtersQuery } from "./market";
import type { Transport } from "./transport";

vi.mock("server-only", () => ({}));

describe("filtersQuery", () => {
  it("skips nulls", () => {
    expect(filtersQuery({ min_bedrooms: 3, max_bedrooms: null, min_price: 0 }).toString()).toBe("min_bedrooms=3&min_price=0");
  });

  it("is empty when nothing is set, so callers leave no trailing ?", () => {
    expect(filtersQuery({ min_bedrooms: null }).toString()).toBe("");
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
    expect(sp.get("size")).toBe("15");
  });
});
