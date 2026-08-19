import { expect, test } from "@playwright/test";

const DRAFTS_STORAGE_KEY = "tutu-okno:audit-transfer-drafts";

test("проходит доступный P0 mock-flow и сохраняет переезды только как черновики", async ({ page }) => {
  await page.goto("/calendar");
  await expect(page.locator('[data-preset-id="calendar.default"]')).toBeVisible();

  await page.getByRole("link", { name: "Свободное окно, суббота с 12:20 до 18:10" }).click();
  await expect(page.getByRole("heading", { name: "Новое в плане" })).toBeVisible();
  await page.getByRole("link", { name: /Нет, подберите варианты/ }).click();

  await expect(page.locator('[data-preset-id="ideas.two_selected"]')).toBeVisible();
  await page.getByRole("link", { name: "На голосование", exact: true }).click();
  await expect(page.locator('[data-preset-id="vote.active"]')).toBeVisible();
  const yesButtons = page.getByRole("button", { name: "За", exact: true });
  await yesButtons.nth(0).click();
  await yesButtons.nth(1).click();
  await page.getByRole("link", { name: "Завершить", exact: true }).click();

  await expect(page.locator('[data-preset-id="winner.rechecked"]')).toBeVisible();
  await expect(page.getByRole("link", { name: "Перейти к оформлению в Туту" })).toBeVisible();
  await page.getByRole("button", { name: "Уже купили — закрепить вручную", exact: true }).click();
  await page.getByRole("link", { name: "Открыть календарь", exact: true }).click();

  const checkButton = page.getByRole("button", { name: "Проверить", exact: true });
  await checkButton.click();
  const checkingButton = page.getByRole("button", { name: "Проверяем…", exact: true });
  await expect(checkingButton).toBeDisabled();
  await expect(checkingButton).toHaveAttribute("aria-busy", "true");
  await expect(page).toHaveURL(/\/audit$/);

  await expect(page.locator('[data-preset-id="audit.issues_found"]')).toBeVisible();
  await expect(page.getByText("7 событий и 2 билета проверены", { exact: true })).toBeVisible();
  await expect(page.getByText("1 конфликт · 3 переезда можно добавить", { exact: true })).toBeVisible();
  await expect(page.getByText("Последняя проверка:")).toBeVisible();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), DRAFTS_STORAGE_KEY)).toBeNull();

  await page.getByRole("link", { name: /Свияжск конфликтует с ужином/ }).click();
  await expect(page.locator('[data-preset-id="conflict.schedule_changed"]')).toBeVisible();
  await page.goBack();

  await page.getByRole("button", { name: "Добавить 3 переезда как черновики", exact: true }).click();
  await expect(page.locator('[data-preset-id="audit.transfers_drafted"]')).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Переезды добавлены как черновики. План не изменён.");

  const drafts = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? "[]"), DRAFTS_STORAGE_KEY);
  expect(drafts).toHaveLength(3);
  expect(drafts.every((draft: Record<string, unknown>) => draft.status === "draft")).toBe(true);
  expect(drafts.every((draft: Record<string, unknown>) => draft.source === "audit.issues_found")).toBe(true);
  expect(drafts.every((draft: Record<string, unknown>) => !("calendarItemId" in draft))).toBe(true);

  await page.reload();
  await expect(page.locator('[data-preset-id="audit.transfers_drafted"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "Переезды добавлены", exact: true })).toBeDisabled();
});

test("показывает empty, integration error и loading состояния отчёта", async ({ page }) => {
  await page.goto("/audit?state=empty");
  await expect(page.getByRole("heading", { name: "Замечаний нет" })).toBeVisible();

  await page.goto("/audit?state=error");
  await expect(page.getByRole("heading", { name: "Проверка не завершена" })).toBeVisible();
  await expect(page.getByText("План остался без изменений.")).toBeVisible();

  await page.goto("/audit?state=loading");
  await expect(page.locator('[data-preset-id="calendar.checking"]')).toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("button", { name: "Проверяем…" })).toBeDisabled();
});
