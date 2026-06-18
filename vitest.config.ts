import { defineConfig } from "vitest/config";

// Compose-engine tests live in packages/core/test and run against the built `dist`
// (the `test` script builds core first). See packages/core/test/compose.spec.ts.
export default defineConfig({
  test: {
    include: ["packages/core/test/**/*.spec.ts"],
    environment: "node",
  },
});
