import { defineConfig } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const useWebServer = !process.env.PLAYWRIGHT_BASE_URL;
const webPort = Number(process.env.PLAYWRIGHT_WEB_PORT ?? "3000");
const apiPort = Number(process.env.PLAYWRIGHT_API_PORT ?? "4101");

export default defineConfig({
  webServer: useWebServer
    ? [
        { command: "pnpm dev:api", port: apiPort, reuseExistingServer: true },
        { command: "pnpm dev:web", port: webPort, reuseExistingServer: true },
      ]
    : undefined,
  use: { baseURL },
  testDir: "./e2e/tests",
  testMatch: "*.spec.ts",
  timeout: 60000,
});
