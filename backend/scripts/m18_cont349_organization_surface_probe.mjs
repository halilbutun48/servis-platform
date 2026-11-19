import { chromium } from "@playwright/test";

const bases = [
  "http://localhost:5273",
  "https://plenty-rss-scenario-connected.trycloudflare.com",
];

const browser = await chromium.launch({ headless: true });
const results = [];
for (const base of bases) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  const page = await context.newPage();
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  const login = page.locator('input[autocomplete="username"]');
  if (await login.count()) {
    await login.fill("organization@demo.com");
    await page.locator('input[autocomplete="current-password"]').fill("demo123");
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);
  }
  for (const route of ["/organization", "/organization/agreements"]) {
    await page.goto(`${base}/#${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);
    results.push({
      base,
      route,
      title: await page.title(),
      text: (await page.locator("body").innerText()).slice(0, 5000),
      buttons: await page.locator("button:visible").allInnerTexts(),
      inputs: await page.locator("input:visible").evaluateAll((nodes) => nodes.map((node) => ({ type: node.type, placeholder: node.placeholder, aria: node.getAttribute("aria-label") }))),
    });
  }
  await context.close();
}
await browser.close();
console.log(JSON.stringify(results, null, 2));
