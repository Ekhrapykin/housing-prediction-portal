import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": new URL(".", import.meta.url).pathname } },
  // e2e/ is Playwright's.
  test: { environment: "node", exclude: [...configDefaults.exclude, "e2e/**"] },
});
