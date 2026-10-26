import { expect, test as base } from "@playwright/test";

/** Every test also fails on an uncaught page error or a console error (failed resource loads excluded). */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => m.type() === "error" && !m.text().includes("Failed to load resource") && errors.push(m.text()));
      await use(errors);
      expect(errors, "page/console errors").toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };
