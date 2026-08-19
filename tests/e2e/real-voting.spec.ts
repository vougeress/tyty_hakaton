import { expect, test } from "@playwright/test";

const POLL_ID = "00000000-0000-4000-8000-000000002001";
const NIKITA_ID = "00000000-0000-4000-8000-000000000101";
const ANNA_ID = "00000000-0000-4000-8000-000000000102";

test("два участника видят общий прогресс, меняют голос и организатор открывает победителя", async ({ browser }) => {
  const ownerContext = await browser.newContext();
  const memberContext = await browser.newContext();
  await ownerContext.addInitScript((participantId) => localStorage.setItem("tutu-okno:participantId", participantId), NIKITA_ID);
  await memberContext.addInitScript((participantId) => localStorage.setItem("tutu-okno:participantId", participantId), ANNA_ID);

  const owner = await ownerContext.newPage();
  const member = await memberContext.newPage();
  await Promise.all([owner.goto(`/polls/${POLL_ID}`), member.goto(`/polls/${POLL_ID}`)]);

  const museum = member.getByRole("article").filter({ has: member.getByRole("heading", { name: "Музей чак-чака" }) });
  await museum.getByRole("button", { name: "Можно", exact: true }).click();
  await expect(museum.getByRole("button", { name: "Можно", exact: true })).toHaveAttribute("aria-pressed", "true");

  const ownerMuseum = owner.getByRole("article").filter({ has: owner.getByRole("heading", { name: "Музей чак-чака" }) });
  await expect(ownerMuseum.getByText("Можно 1", { exact: true })).toBeVisible({ timeout: 5_000 });
  await expect(member.getByRole("button", { name: "Завершить раньше" })).toBeDisabled();

  await owner.getByRole("button", { name: "Завершить раньше" }).click();
  const winnerLink = owner.getByRole("link", { name: "Открыть победителя" });
  await expect(winnerLink).toBeVisible();
  await winnerLink.click();
  await expect(owner.locator('[data-preset-id="winner.rechecked"][data-recheck-status="idle"]')).toBeVisible();
  await expect(owner.getByText("Нужно перепроверить", { exact: true })).toBeVisible();
  await owner.getByRole("button", { name: "Перепроверить цену и места" }).click();
  await expect(owner.locator('[data-preset-id="winner.rechecked"]')).toHaveAttribute("data-recheck-status", /available|price_changed/);
  await expect(owner.getByRole("link", { name: "Перейти на Туту" })).toBeVisible();
  await owner.getByRole("button", { name: "Уже купили - подтвердить" }).click();
  await expect(owner.locator('[data-recheck-status="confirmed"]')).toBeVisible();
  await owner.reload();
  await expect(owner.locator('[data-recheck-status="confirmed"]')).toBeVisible();
  await expect(owner.getByText("Бронирование подтверждено", { exact: true })).toBeVisible();

  await ownerContext.close();
  await memberContext.close();
});
