import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    passWithNoTests: true,
    include: [resolve(__dirname, "../../tests/packages/shared-types/**/*.test.ts")],
  },
});
