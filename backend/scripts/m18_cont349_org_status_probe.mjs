import { chromium } from "@playwright/test";

const base = process.env.M18_BASE_URL || "http://localhost:5273";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR" });
const page = await context.newPage();
await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(900);
if (await page.locator('input[autocomplete="username"]').count()) {
  await page.locator('input[autocomplete="username"]').fill("organization@demo.com");
  await page.locator('input[autocomplete="current-password"]').fill("demo123");
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(1200);
}
await page.goto(`${base}/#/organization/agreements`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
const row = page.locator("tr").filter({ hasText: "#20" }).last();
const text = await page.locator("body").innerText();
console.log(JSON.stringify({ route: page.url(), rowFound: Boolean(await row.count()), cancelledVisible: /İptal Edildi/.test(text), rowText: (await row.innerText().catch(() => "")).slice(0, 500) }, null, 2));
await browser.close();
