import { expect, test } from "./fixtures";

// One estimate per run: estimator writes are limited to 20/min per client IP, and nothing here depends on earlier runs.
test("fill example and estimate returns a price", async ({ page }) => {
  await page.goto("/estimator");
  await page.getByRole("button", { name: "Fill example", exact: true }).click();
  await page.getByRole("button", { name: "Estimate price", exact: true }).click();
  await expect(page.locator("main")).toHaveText(/\$\d{3},\d{3}/, { useInnerText: true });
});
