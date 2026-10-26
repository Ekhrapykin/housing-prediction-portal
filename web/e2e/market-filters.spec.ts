import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

/** Move a slider thumb by `steps` with the keyboard, the way a keyboard user would. */
async function slide(page: Page, name: string, steps: number) {
  const thumb = page.getByRole("slider", { name });
  await thumb.focus();
  for (let i = 0; i < steps; i++) await thumb.press("ArrowRight");
  return thumb;
}

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
    await slide(page, "Min year built", 2005 - 1950);
    await expect(page).toHaveURL(/min_year_built=2005/);
    await expect(page.locator("main")).toHaveText(/PROPERTIES\s*14\b/i, { useInnerText: true });
  });

  test("a float slider value is kept and reaches the URL after the debounce", async ({ page }) => {
    const school = await slide(page, "Min school rating", 85);
    await expect(page).toHaveURL(/min_school_rating=8\.5/);
    await expect(school).toHaveValue("8.5");
  });

  test("export links carry the current filters", async ({ page }) => {
    await page.locator("#f-min_bedrooms").selectOption("4");
    await slide(page, "Min school rating", 85);
    const csv = page.locator('a[href*="export.csv"]');
    await expect(csv).toHaveAttribute("href", /min_bedrooms=4/);
    await expect(csv).toHaveAttribute("href", /min_school_rating=8\.5/);
  });

  test("reset clears the URL and the inputs", async ({ page }) => {
    await page.locator("#f-min_bedrooms").selectOption("4");
    await slide(page, "Min school rating", 85);
    await expect(page).toHaveURL(/min_school_rating=8\.5/);
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(page).toHaveURL((u) => u.search === "");
    await expect(page.getByRole("slider", { name: "Min school rating" })).toHaveValue("0");
    await expect(page.locator("#f-min_bedrooms")).toHaveValue("");
  });

  test("the default segment is not written to the URL", async ({ page }) => {
    await page.locator("#f-by").selectOption("DECADE");
    await expect(page).toHaveURL(/by=DECADE/);
    await page.locator("#f-by").selectOption("BEDROOMS");
    await expect(page).toHaveURL((u) => !u.search.includes("by="));
  });
});
