import path from "node:path";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // `server-only` exists to fail a *client* bundle that imports server
      // code. Vitest builds no client bundle, so the package cannot resolve
      // here; it maps to an empty stub. The guard still holds where it counts.
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    // Server actions and route handlers are Node-side; no jsdom needed for the
    // security/money paths this suite covers.
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Prisma and next-auth are mocked per-test rather than globally so each
    // suite states exactly which boundary it is standing in for.
    clearMocks: true,
    restoreMocks: true,
  },
});
