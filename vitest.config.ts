import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
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
