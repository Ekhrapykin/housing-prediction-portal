import { expect, test } from "./fixtures";

test.describe("market filters", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/market");
  });

  test("rapid select changes persist and the KPI follows", async ({ page }) => {
    await page.locator("#f-min_bedrooms").selectOption("4");
    await page.locator("#f-by").selectOption("DECADE");
    await expect(page).toHaveURL(/min_bedrooms=4/);
    await expect(page).toHaveURL(/by=DECADE/);
    await expect(page.locator("main")).toHaveText(/PROPERTIES\s*15\b/i, { useInnerText: true });
  });

  test("min year built reaches the URL and narrows the KPI", async ({ page }) => {
    await page.locator("#f-min_year_built").fill("2005");
    await expect(page).toHaveURL(/min_year_built=2005/);
    await expect(page.locator("main")).toHaveText(/PROPERTIES\s*14\b/i, { useInnerText: true });
  });

  test("a typed float is kept and reaches the URL after the debounce", async ({ page }) => {
    const school = page.locator("#f-min_school_rating");
    await school.click();
    await school.pressSequentially("8.5", { delay: 60 });
    await expect(page).toHaveURL(/min_school_rating=8\.5/);
    await expect(school).toHaveValue("8.5");
  });

  test("export links carry the current filters", async ({ page }) => {
    await page.locator("#f-min_bedrooms").selectOption("4");
    const school = page.locator("#f-min_school_rating");
    await school.click();
    await school.pressSequentially("8.5", { delay: 60 });
    const csv = page.locator('a[href*="export.csv"]');
    await expect(csv).toHaveAttribute("href", /min_bedrooms=4/);
    await expect(csv).toHaveAttribute("href", /min_school_rating=8\.5/);
  });

  test("reset clears the URL and the inputs", async ({ page }) => {
    await page.locator("#f-min_bedrooms").selectOption("4");
    await page.locator("#f-min_school_rating").fill("8.5");
    await expect(page).toHaveURL(/min_school_rating=8\.5/);
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(page).toHaveURL((u) => u.search === "");
    await expect(page.locator("#f-min_school_rating")).toHaveValue("");
    await expect(page.locator("#f-min_bedrooms")).toHaveValue("");
  });

  test("the default segment is not written to the URL", async ({ page }) => {
    await page.locator("#f-by").selectOption("DECADE");
    await expect(page).toHaveURL(/by=DECADE/);
    await page.locator("#f-by").selectOption("BEDROOMS");
    await expect(page).toHaveURL((u) => !u.search.includes("by="));
  });
});
