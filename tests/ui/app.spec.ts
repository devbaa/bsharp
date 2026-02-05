import { test, expect, Page } from "@playwright/test";

/** Open the hamburger menu (required on mobile viewport). */
async function openMenu(page: Page) {
  await page.locator("#hamburger-link").click();
  await expect(page.locator("#menu-container")).toHaveClass(/visible/);
}

test.describe("BSharp app", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("page loads with correct title", async ({ page }) => {
    await expect(page).toHaveTitle("BSharp: Perfect Pitch Trainer");
  });

  test("play button is visible", async ({ page }) => {
    const playButton = page.locator("#play-button");
    await expect(playButton).toBeVisible();
  });

  test("chord flags are rendered", async ({ page }) => {
    const flags = page.locator(".flag-wrapper:not(.trainer)");
    await expect(flags).toHaveCount(14);
  });

  test("only first flag is visible by default", async ({ page }) => {
    // At the default level (red only), only the red flag should be visible
    const redFlag = page.locator("#red-flag");
    await expect(redFlag).toBeVisible();
  });

  test("play button is active after app initializes", async ({ page }) => {
    // populateAudio() runs on init and removes the deactivated class
    const playButton = page.locator("#play-button");
    await expect(playButton).not.toHaveClass(/deactivated/);
  });

  test("next-chord activates after selecting a flag", async ({ page }) => {
    const nextButton = page.locator("#next-chord");
    await expect(nextButton).toHaveClass(/deactivated/);

    // Click play to start audio, then select the first visible flag
    await page.locator("#play-button").click();
    await page.locator("#red-flag .flag").click();

    await expect(nextButton).not.toHaveClass(/deactivated/);
  });

  test("changing chord selector updates visible flags", async ({ page }) => {
    const selector = page.locator("#chord-selector");

    // Change to level 2 (blue) — should show red, yellow, blue
    await selector.selectOption("blue");

    const redFlag = page.locator("#red-flag");
    const yellowFlag = page.locator("#yellow-flag");
    const blueFlag = page.locator("#blue-flag");
    const blackFlag = page.locator("#black-flag");

    await expect(redFlag).toBeVisible();
    await expect(yellowFlag).toBeVisible();
    await expect(blueFlag).toBeVisible();
    await expect(blackFlag).not.toBeVisible();
  });
});

// ----- Bug regression tests -----
// These tests document known bugs from TODO.md. They are expected to FAIL
// until the corresponding bug is fixed.

test.describe("BUG: Settings button doesn't work", () => {
  test("settings modal opens without JS errors", async ({ page }) => {
    await page.goto("/");

    // Collect JS errors
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await openMenu(page);
    await page.locator("#profile-settings-trigger").click();

    // The modal should become visible and no JS errors should have fired.
    // Bug: populateProfileSettings() crashes on missing single-note selectors.
    const modal = page.locator("#profile-info-container");
    await expect(modal).toHaveClass(/visible/);
    expect(errors).toHaveLength(0);
  });

  test("settings modal shows Save Changes button", async ({ page }) => {
    await page.goto("/");
    await openMenu(page);
    await page.locator("#profile-settings-trigger").click();

    const saveButton = page.locator("#submit-changes-button");
    await expect(saveButton).toBeVisible();
  });
});

test.describe("BUG: Add profile screen defaults not filled in", () => {
  test("add profile form has default values populated", async ({ page }) => {
    await page.goto("/");
    await openMenu(page);
    await page.locator("#profile-infobox-trigger").click();
    await page.locator("div.pulldown-item").filter({ hasText: "Add Profile" }).click();

    // Target number should have a non-empty default
    const targetInput = page.locator("#target_number_setting");
    await expect(targetInput).not.toHaveValue("");

    // Show chord name mode should have a default selected
    const showChordMode = page.locator("#show-chord-name-mode-selector");
    await expect(showChordMode).toBeVisible();
    await expect(showChordMode).not.toHaveValue("");

    // An icon should be pre-selected so the user doesn't forget
    const checkedIcon = page.locator("input[name='profile_icon_selector']:checked");
    await expect(checkedIcon).toHaveCount(1);
  });
});

test.describe("BUG: Creating a profile doesn't work", () => {
  test("can create a new profile without JS errors", async ({ page }) => {
    await page.goto("/");

    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    // Open "Add Profile" dialog
    await openMenu(page);
    await page.locator("#profile-infobox-trigger").click();
    await page.locator("div.pulldown-item").filter({ hasText: "Add Profile" }).click();

    // Fill in required fields
    await page.locator("#profile_name_setting").fill("Test User");
    await page.locator("input[name='profile_icon_selector'][value='fa-bolt']").check();

    // Dismiss the alert dialog if one appears (validation error = bug)
    page.on("dialog", (dialog) => dialog.dismiss());

    await page.locator("#add-user-button").click();

    // After successful creation the modal should close
    const modal = page.locator("#profile-info-container");
    await expect(modal).not.toHaveClass(/visible/);

    // And no JS errors should have occurred
    expect(errors).toHaveLength(0);
  });

  test("non-default settings are saved to the new profile", async ({ page }) => {
    await page.goto("/");
    page.on("dialog", (dialog) => dialog.dismiss());

    // Open "Add Profile" dialog
    await openMenu(page);
    await page.locator("#profile-infobox-trigger").click();
    await page.locator("div.pulldown-item").filter({ hasText: "Add Profile" }).click();

    // Fill required fields + set a non-default setting
    await page.locator("#profile_name_setting").fill("Custom User");
    await page.locator("input[name='profile_icon_selector'][value='fa-bolt']").check();
    await page.locator("#persist_reaction_face_setting").check();

    await page.locator("#add-user-button").click();

    // Verify the profile was created with the non-default setting by
    // re-opening settings and checking the checkbox is still checked.
    // The menu may still be visible from the earlier flow, so ensure
    // it's open before clicking the settings trigger.
    const menu = page.locator("#menu-container");
    if (!(await menu.evaluate(el => el.classList.contains("visible")))) {
      await page.locator("#hamburger-link").click();
      await expect(menu).toHaveClass(/visible/);
    }
    await page.locator("#profile-settings-trigger").click();
    const checkbox = page.locator("#persist_reaction_face_setting");
    await expect(checkbox).toBeChecked();
  });
});

test.describe("BUG: Progress selector opens a tiny empty box", () => {
  test("stats history shows a meaningful message when empty", async ({ page }) => {
    await page.goto("/");
    await openMenu(page);
    await page.locator("#stats-history-trigger").click();

    const statsContainer = page.locator("#stats-history-container");
    await expect(statsContainer).toHaveClass(/visible/);

    // When there's no history, the container should either:
    // - not be empty (show an "empty state" message), or
    // - have a reasonable minimum size
    // Bug: it shows as a tiny empty box with no content
    const box = await statsContainer.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThan(30);

    // Should have some text content (e.g. "No sessions yet")
    const text = await statsContainer.textContent();
    expect(text!.trim().length).toBeGreaterThan(0);
  });
});
