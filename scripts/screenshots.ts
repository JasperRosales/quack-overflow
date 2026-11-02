/**
 * Capture the 4 Devpost screenshots at 1280×800 into deliverables/screenshots/.
 *
 *   MOCK_AI=true npm run dev      # in another terminal (mock mode gives repeatable shots)
 *   npm run screenshots           # or: npx tsx scripts/screenshots.ts --base http://localhost:3000
 */
import { mkdirSync } from "node:fs";
import { chromium, type Page } from "@playwright/test";

const base = process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : "http://localhost:3000";
const out = "deliverables/screenshots";
const dark = process.argv.includes("--dark");

async function duckReplies(page: Page, n: number) {
  await page.waitForFunction((n) => document.querySelectorAll("[data-role=duck]").length >= n, n, { timeout: 30_000 });
}

async function main() {
  mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, colorScheme: dark ? "dark" : "light" });
  await ctx.addInitScript((d) => localStorage.setItem("qo.settings.v1", JSON.stringify({ theme: d ? "dark" : "light" })), dark);
  const page = await ctx.newPage();
  const suffix = dark ? "-dark" : "";

  // 1. Landing
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/1-landing${suffix}.png` });

  // 2. Debug workspace mid-conversation (sample 4)
  await page.goto(`${base}/debug?sample=js-off-by-one`, { waitUntil: "networkidle" });
  await duckReplies(page, 1);
  await page.getByTestId("run-button").click();
  await duckReplies(page, 2);
  await page.getByTestId("chat-input").fill("It should add the three scores and print 259, but it says NaN.");
  await page.keyboard.press("Enter");
  await duckReplies(page, 3);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/2-debug-conversation${suffix}.png` });

  // 3. Hint level 3 with highlighted line
  for (const level of [1, 2, 3]) {
    await page.getByTestId(`hint-${level}`).click();
    await page.getByTestId("confirm-hint").click();
    await duckReplies(page, 3 + level);
  }
  await page.waitForSelector(".qo-highlight-line");
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/3-hint-level-3${suffix}.png` });

  // 4. Journal (with demo history so patterns are visible)
  await page.goto(`${base}/journal`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.removeItem("qo.sessions.v1"));
  await page.reload({ waitUntil: "networkidle" });
  await page.getByTestId("load-demo-journal").click();
  await page.waitForSelector("[data-testid=pattern-callout]");
  await page.waitForTimeout(1500); // let the bar animation finish
  await page.screenshot({ path: `${out}/4-journal${suffix}.png` });

  await browser.close();
  console.log(`Saved 4 screenshots to ${out}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
