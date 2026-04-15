import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/v1": {
        target: (process.env["VITE_API_URL"] as string | undefined) ?? "http://localhost:8000",
        changeOrigin: true,
      },
      "/health": {
        target: (process.env["VITE_API_URL"] as string | undefined) ?? "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react-dom") || id.includes("node_modules/react/")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/react-router") || id.includes("node_modules/@remix-run")) {
            return "vendor-router";
          }
          if (id.includes("node_modules/@tanstack")) {
            return "vendor-query";
          }
          if (id.includes("node_modules/zustand")) {
            return "vendor-zustand";
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@astro-app/shared-types": path.resolve(__dirname, "../../packages/shared-types/src"),
      "@astro-app/chart-renderer": path.resolve(__dirname, "../../packages/chart-renderer/src"),
      "@astro-app/astro-client": path.resolve(__dirname, "../../packages/astro-client/src"),
      "@astro-app/approx-engine": path.resolve(__dirname, "../../packages/approx-engine/src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});
