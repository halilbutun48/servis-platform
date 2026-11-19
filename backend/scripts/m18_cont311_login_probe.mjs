import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'tr-TR' });
const page = await context.newPage();
page.on('response', async (response) => {
  if (response.url().includes('/api/auth')) {
    console.log(JSON.stringify({ status: response.status(), url: response.url(), body: (await response.text().catch(() => '')).slice(0, 500) }));
  }
});
page.on('console', (message) => { if (message.type() === 'error') console.log(`CONSOLE ${message.text()}`); });
await page.goto('http://localhost:5273/', { waitUntil: 'domcontentloaded' });
console.log(`BEFORE url=${page.url()} login=${await page.locator('input[autocomplete="username"]').count()}`);
await page.locator('input[autocomplete="username"]').fill('organization@demo.com');
await page.locator('input[autocomplete="current-password"]').fill('demo123');
await page.locator('button[type="submit"]').click();
await page.waitForTimeout(7000);
console.log(`AFTER url=${page.url()} login=${await page.locator('input[autocomplete="username"]').count()} text=${(await page.locator('body').innerText()).slice(0, 900).replace(/\s+/g, ' ')}`);
await browser.close();
