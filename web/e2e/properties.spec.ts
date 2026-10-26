import { expect, test } from "./fixtures";

test.describe("properties", () => {
  test("sort and page links keep the filters, sort links drop the page", async ({ page }) => {
    await page.goto("/market/properties?min_bedrooms=3&page=2");
    const sort = page.locator("th a[href*='sort=price']").first();
    const sortHref = (await sort.getAttribute("href"))!;
    expect(sortHref, "sort link keeps filters").toContain("min_bedrooms=3");
    expect(sortHref, "sort link drops page").not.toContain("page=");

    await page.goto(`/market/properties${sortHref}`);
    const pageHrefs = await page.locator("a[href*='page=']").evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
    expect(pageHrefs.length).toBeGreaterThan(0);
    for (const h of pageHrefs) {
      expect(h, "page link keeps filters").toContain("min_bedrooms=3");
      expect(h, "page link keeps sort").toContain("sort=price");
    }
  });

  test("shows the range of the total", async ({ page }) => {
    await page.goto("/market/properties?min_bedrooms=3");
    await expect(page.locator("main")).toHaveText(/Showing [^\n]*of 37/, { useInnerText: true });
  });
});
