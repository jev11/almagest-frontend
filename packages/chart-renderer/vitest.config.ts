import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: [resolve(__dirname, "../../tests/packages/chart-renderer/**/*.test.ts")],
  },
});
