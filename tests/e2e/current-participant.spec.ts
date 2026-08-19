import { expect, test } from "@playwright/test";

const PARTICIPANT_STORAGE_KEY = "tutu-okno:participantId";

test("использует сохранённого участника в шапке, фильтре и мобильной раскладке", async ({ page }) => {
  await page.addInitScript(([key, participantId]) => {
    window.localStorage.setItem(key, participantId);
  }, [PARTICIPANT_STORAGE_KEY, "anna"]);

  await page.goto("/calendar");

  await expect(page.getByRole("link", { name: "Профиль Анна" })).toHaveText("А");
  await expect(page.getByRole("button", { name: "Я", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator('[data-preset-id="calendar.default"]')).toHaveCSS("max-width", "430px");

  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(horizontalOverflow).toBeLessThanOrEqual(0);

  await page.getByRole("button", { name: "Я", exact: true }).click();
  await expect(page.getByRole("button", { name: "Я", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("link", { name: /Казанский Кремль/ })).toBeVisible();
});

test("игнорирует participantId из другой поездки", async ({ page }) => {
  await page.addInitScript(([key, participantId]) => {
    window.localStorage.setItem(key, participantId);
  }, [PARTICIPANT_STORAGE_KEY, "participant-from-another-trip"]);

  await page.goto("/calendar");
  await expect(page.getByRole("link", { name: "Профиль Никита" })).toHaveText("Н");
});
