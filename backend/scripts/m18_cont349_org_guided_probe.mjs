import { chromium } from "@playwright/test";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
const page = await context.newPage();
await page.goto("http://localhost:5273/", { waitUntil: "domcontentloaded" });
const login = page.locator('input[autocomplete="username"]');
if (await login.count()) {
  await login.fill("organization@demo.com");
  await page.locator('input[autocomplete="current-password"]').fill("demo123");
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(1200);
}
await page.goto("http://localhost:5273/#/organization", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(900);
const candidates = page.getByRole("button", { name: "Plan oluştur", exact: true });
console.log("planButtons", await candidates.count());
if (await candidates.count()) {
  await candidates.first().click();
  await page.waitForTimeout(500);
}
console.log(JSON.stringify({
  url: page.url(),
  text: (await page.locator("body").innerText()).slice(-7000),
  buttons: await page.locator("button:visible").allInnerTexts(),
  inputs: await page.locator("input:visible").evaluateAll((nodes) => nodes.map((node) => ({ type: node.type, placeholder: node.placeholder, name: node.name, aria: node.getAttribute("aria-label") }))),
  selects: await page.locator("select:visible").evaluateAll((nodes) => nodes.map((node) => ({ name: node.name, aria: node.getAttribute("aria-label"), options: Array.from(node.options).map((option) => option.text).slice(0, 20) }))),
}, null, 2));
await browser.close();
