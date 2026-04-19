import { defineConfig } from "vitest/config";
import path from "node:path";

// Unit-test config. Node environment (no jsdom) keeps the suite fast — add
// `environment: "jsdom"` to an individual test file via an
// `// @vitest-environment jsdom` comment if you need the DOM later.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  css: {
    // Skip Tailwind v4 PostCSS pipeline — none of our unit tests need CSS.
    postcss: { plugins: [] },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    globals: false,
  },
});
