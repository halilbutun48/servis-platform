import { chromium } from '@playwright/test';

const bases = [
  process.env.M18_LOCAL_BASE || 'http://localhost:5273',
  process.env.M18_PUBLIC_BASE || 'https://plenty-rss-scenario-connected.trycloudflare.com',
];
const browser = await chromium.launch({ headless: true });
const results = [];

for (const base of bases) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'tr-TR', timezoneId: 'Europe/Istanbul' });
  const page = await context.newPage();
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
  const username = page.locator('input[autocomplete="username"]');
  if (await username.count()) {
    await username.fill('room@demo.com');
    await page.locator('input[autocomplete="current-password"]').fill('demo123');
    const response = await Promise.all([
      page.waitForResponse((candidate) => new URL(candidate.url()).pathname === '/api/auth/login', { timeout: 30000 }),
      page.locator('button[type="submit"]').click(),
    ]).then(([candidate]) => candidate);
    if (response.status() !== 200) throw new Error(`ROOM_LOGIN_${response.status()}`);
    await page.waitForFunction(() => !document.querySelector('input[autocomplete="username"]'), null, { timeout: 30000 });
  }
  const status = await page.evaluate(async () => {
    const token = Object.values(localStorage).map(String).find((value) => value.split('.').length === 3) || '';
    const response = await fetch('/api/trust-quality/company/summary', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    return response.status;
  });
  results.push({ base, roomServiceEvaluationStatus: status, expected: 403 });
  await context.close();
}

await browser.close();
console.log(JSON.stringify({ results }, null, 2));
