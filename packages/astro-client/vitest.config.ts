import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    passWithNoTests: true,
    include: [resolve(__dirname, "../../tests/packages/astro-client/**/*.test.ts")],
  },
});
