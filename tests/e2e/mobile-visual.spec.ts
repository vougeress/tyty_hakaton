import { expect, test } from "@playwright/test";

test("мобильные preset-экраны не расходятся визуально", async ({ page }) => {
  await page.goto("/calendar");
  await expect(page.locator('[data-preset-id="calendar.default"]')).toBeVisible();
  await expect(page).toHaveScreenshot("calendar-default.png", { animations: "disabled", fullPage: true, maxDiffPixelRatio: 0.015 });

  await page.goto("/conflicts/schedule-shift");
  await expect(page.locator('[data-preset-id="conflict.schedule_changed"]')).toBeVisible();
  await expect(page).toHaveScreenshot("conflict-schedule-changed.png", { animations: "disabled", fullPage: true, maxDiffPixelRatio: 0.015 });
});
