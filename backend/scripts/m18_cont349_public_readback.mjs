import { chromium } from "@playwright/test";

const base = process.env.M18_PUBLIC_URL || "https://plenty-rss-scenario-connected.trycloudflare.com/?m18cb=20261118cont349";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR" });
const page = await context.newPage();

async function login(identifier, password) {
  await page.goto(`${base}`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(1300);
  const username = page.locator('input[autocomplete="username"]');
  if (!(await username.count())) return { status: null, text: await page.locator("body").innerText() };
  await username.fill(identifier);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  const responsePromise = page.waitForResponse((r) => r.url().includes("/api/auth/login"), { timeout: 15000 }).catch(() => null);
  await page.locator('button[type="submit"]').click();
  const response = await responsePromise;
  await page.waitForTimeout(1300);
  return { status: response?.status() || null, text: await page.locator("body").innerText() };
}

const orgLogin = await login("organization@demo.com", "demo123");
await page.goto(`${base}#/organization/agreements`, { waitUntil: "domcontentloaded", timeout: 20000 });
await page.waitForTimeout(1200);
const orgText = await page.locator("body").innerText();
const orgAgreement20 = /#20[\s\S]{0,220}İptal Edildi/.test(orgText);

await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
const roomLogin = await login("room@demo.com", "demo123");
await page.goto(`${base}#/room/drivers`, { waitUntil: "domcontentloaded", timeout: 20000 });
await page.waitForTimeout(1200);
const tab = page.locator("button:visible").filter({ hasText: "Yönetim" }).first();
if (await tab.count()) await tab.click();
await page.waitForTimeout(400);
const details = page.locator("button:visible").filter({ hasText: "Yönetim detayları" }).first();
if (await details.count()) await details.click();
await page.waitForTimeout(800);
const roomText = await page.locator("body").innerText();
const driverVisible = roomText.includes("M18 CONT162 AUDIT DRIVER");
console.log(JSON.stringify({ publicOrigin: new URL(base).origin, organizationLogin: orgLogin.status, agreement20CancelledVisible: orgAgreement20, roomLogin: roomLogin.status, driver8Visible: driverVisible, asset: (await page.locator('script[src*="/assets/"]').first().getAttribute("src").catch(() => "")) || null }, null, 2));
await browser.close();
