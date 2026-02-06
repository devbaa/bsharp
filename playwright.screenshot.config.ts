import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/screenshot",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "list",
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
    },
  },
  use: {
    baseURL: "http://localhost:8080",
    ...devices["Pixel 5"],
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    command: "npx http-server dist -p 8080 -c-1 --silent",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
  },
});
