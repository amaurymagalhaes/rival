import { defineConfig } from "@playwright/test";

export default defineConfig({
  webServer: [
    { command: "pnpm dev:api", port: 4000, reuseExistingServer: true },
    { command: "pnpm dev:web", port: 3000, reuseExistingServer: true },
  ],
  use: { baseURL: "http://localhost:3000" },
  testDir: "./e2e/tests",
});
