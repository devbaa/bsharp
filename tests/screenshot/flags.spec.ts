import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    // Seed session history so onboarding guess/success/retry overlays are skipped
    localStorage.setItem(
      "bsharp_session_history",
      JSON.stringify({ "100": { chord: [{ identifications: 1 }] } }),
    );
    (window as any).__bsharp_test_deterministic_color = "red";
  });
  await page.goto("/");
  // Hide the play onboarding overlay (always shown on init)
  await page.locator("#onboarding-overlay").evaluate((el) => {
    el.classList.remove("visible");
  });
});

test("baseline flag outlines", async ({ page }) => {
  await expect(page.locator("#flag-holder")).toHaveScreenshot(
    "flags-baseline.png",
  );
});

test("correct selection outline", async ({ page }) => {
  await page.locator("#play-button").click();
  await page.waitForTimeout(1000);

  // Red is the forced color, so clicking red is correct
  await page.locator("#red-flag .flag").click();

  await expect(page.locator("#red-flag .flag")).toHaveClass(/flag-correct/);
  await expect(page.locator("#flag-holder")).toHaveScreenshot(
    "flags-correct.png",
  );
});

test("incorrect selection outline", async ({ page }) => {
  await page.locator("#play-button").click();
  await page.waitForTimeout(1000);

  // Red is the forced color, so clicking yellow is wrong
  await page.locator("#yellow-flag .flag").click();

  await expect(page.locator("#yellow-flag .flag")).toHaveClass(/flag-incorrect/);
  await expect(page.locator("#flag-holder")).toHaveScreenshot(
    "flags-incorrect.png",
  );
});
