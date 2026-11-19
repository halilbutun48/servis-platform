import { chromium } from '@playwright/test';

const base = process.env.M18_BASE || 'http://localhost:5273';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 900 }, locale: 'tr-TR', timezoneId: 'Europe/Istanbul' });
const page = await context.newPage();
await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
const username = page.locator('input[autocomplete="username"]');
if (await username.count()) {
  await username.fill('school@demo.com');
  await page.locator('input[autocomplete="current-password"]').fill('demo123');
  const response = await Promise.all([
    page.waitForResponse((candidate) => new URL(candidate.url()).pathname === '/api/auth/login', { timeout: 30000 }),
    page.locator('button[type="submit"]').click(),
  ]).then(([candidate]) => candidate);
  if (response.status() !== 200) throw new Error(`LOGIN_${response.status()}`);
  await page.waitForFunction(() => !document.querySelector('input[autocomplete="username"]'), null, { timeout: 30000 });
}
const results = [];
for (const width of [1440, 1024, 390, 320]) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${base}/#/school/agreements`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  const metrics = await page.evaluate(() => {
    const w = window.innerWidth;
    const nodes = [...document.querySelectorAll('body *')].map((el) => {
      const rect = el.getBoundingClientRect();
      return { tag: el.tagName, cls: String(el.className || '').slice(0, 160), text: String(el.textContent || '').trim().slice(0, 80), left: rect.left, right: rect.right, width: rect.width, overflowX: getComputedStyle(el).overflowX, position: getComputedStyle(el).position };
    }).filter((x) => x.right > w + 1 || x.left < -1).sort((a, b) => (b.right - w) - (a.right - w)).slice(0, 12);
    return { innerWidth: w, clientWidth: document.documentElement.clientWidth, docScrollWidth: document.documentElement.scrollWidth, bodyScrollWidth: document.body.scrollWidth, nodes };
  });
  results.push({ width, metrics });
}
console.log(JSON.stringify(results, null, 2));
await browser.close();
