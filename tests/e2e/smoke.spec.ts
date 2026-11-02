import { expect, test } from "@playwright/test";

test("sample 4: run → chat → hint 3 highlights a line → mark solved → journal updated", async ({ page }) => {
  await page.goto("/debug?sample=js-off-by-one");
  const duck = page.locator("[data-role=duck]");
  await expect(duck.first()).toBeVisible();

  // Run the buggy program: output appears in the chat and the duck responds to it.
  await page.getByTestId("run-button").click();
  await expect(page.getByTestId("run-output").last()).toContainText("Adding score: undefined");
  await expect(duck).toHaveCount(2);

  // Chat.
  await page.getByTestId("chat-input").fill("It should add up all three scores to 259.");
  await page.keyboard.press("Enter");
  await expect(duck).toHaveCount(3);

  // Climb the hint ladder to level 3 (each step needs confirmation).
  for (const level of [1, 2, 3]) {
    await page.getByTestId(`hint-${level}`).click();
    await expect(page.getByRole("dialog")).toContainText("Are you sure?");
    await page.getByTestId("confirm-hint").click();
    await expect(duck).toHaveCount(3 + level);
  }
  await expect(page.getByTestId("code-editor")).toHaveAttribute("data-highlight-lines", "3");
  await expect(page.locator(".qo-highlight-line")).toHaveCount(1);

  // Mark as solved.
  await page.getByTestId("mark-solved").click();
  await expect(page.getByTestId("solved-banner")).toContainText("You learned");

  // Journal updated.
  await page.goto("/journal");
  await expect(page.getByTestId("journal-stats")).toContainText("Bugs solved");
  await expect(page.getByTestId("journal-stats")).toContainText("1");
  await expect(page.getByTestId("lessons")).toContainText("total of scores is NaN");
  await expect(page.getByTestId("pattern-callout")).toContainText("off-by-one");
});

test("landing page links into the app", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("refuses");
  await page.getByRole("link", { name: "Try a sample bug" }).click();
  await expect(page).toHaveURL(/sample=js-off-by-one/);
});
