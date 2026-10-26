import { describe, expect, it } from "vitest";
import { loadSearchParams } from "./search-params";

describe("loadSearchParams", () => {
  it("applies defaults", () => {
    expect(loadSearchParams({})).toEqual({
      by: "BEDROOMS", sort: null, dir: "asc", page: 1,
      filters: {
        min_bedrooms: null, max_bedrooms: null, min_price: null, max_price: null,
        min_year_built: null, max_year_built: null, min_school_rating: null, max_distance: null,
      },
    });
  });

  it("keeps valid values and parses numbers", () => {
    const r = loadSearchParams({ by: "DECADE", sort: "price", dir: "desc", page: "3", min_bedrooms: "4", min_school_rating: "8.5" });
    expect(r).toMatchObject({ by: "DECADE", sort: "price", dir: "desc", page: 3 });
    expect(r.filters).toMatchObject({ min_bedrooms: 4, min_school_rating: 8.5 });
  });

  it("drops invalid values", () => {
    const r = loadSearchParams({ by: "nope", sort: "nope", dir: "sideways", min_bedrooms: "abc" });
    expect(r).toMatchObject({ by: "BEDROOMS", sort: null, dir: "asc" });
    expect(r.filters.min_bedrooms).toBeNull();
  });

  it.each(["0", "abc", "-2"])("page=%s falls back to 1", (page) => {
    expect(loadSearchParams({ page }).page).toBe(1);
  });

  it("takes the first value of an array", () => {
    const r = loadSearchParams({ page: ["2", "5"], min_bedrooms: ["3", "4"], by: ["DECADE", "BEDROOMS"] });
    expect(r.page).toBe(2);
    expect(r.filters.min_bedrooms).toBe(3);
    expect(r.by).toBe("DECADE");
  });
});
