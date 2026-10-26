import { expect, test } from "./fixtures";

test("rapid feature changes cancel stale requests without an error toast", async ({ page }) => {
  await page.goto("/market/what-if");
  await expect(page.locator(".recharts-line-curve")).toBeVisible();

  for (const f of ["bedrooms", "bathrooms", "school_rating", "square_footage"]) {
    await page.locator("#wi-feature").selectOption(f);
    await page.waitForTimeout(120); // faster than the request, so earlier ones get cancelled
  }
  await page.waitForLoadState("networkidle");
  await expect(page.locator(".recharts-line-curve")).toBeVisible();
  await expect(page.locator("[data-sonner-toast]")).toHaveCount(0);
});
