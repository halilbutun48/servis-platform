import { chromium } from '@playwright/test';

const results = [];
for (const base of ['http://localhost:5273', 'https://plenty-rss-scenario-connected.trycloudflare.com']) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'tr-TR', timezoneId: 'Europe/Istanbul' });
  const page = await context.newPage();
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
  const username = page.locator('input[autocomplete="username"]');
  if (await username.count()) {
    await username.fill('organization@demo.com');
    await page.locator('input[autocomplete="current-password"]').fill('demo123');
    const [login] = await Promise.all([
      page.waitForResponse((response) => { try { return new URL(response.url()).pathname === '/api/auth/login'; } catch { return false; } }, { timeout: 30000 }),
      page.locator('button[type="submit"]').click(),
    ]);
    if (login.status() !== 200) { results.push({ base, status: login.status(), boundary: 'LOGIN_BLOCKED' }); await browser.close(); continue; }
    await page.waitForFunction(() => !document.querySelector('input[autocomplete="username"]'), null, { timeout: 30000 });
  }
  await page.goto(`${base}/#/organization/plans`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  let drawer = page.locator('.copilotDrawer:visible').first();
  if (!(await drawer.count())) { await page.locator('.copilotFab:visible').first().click(); drawer = page.locator('.copilotDrawer:visible').first(); }
  await drawer.waitFor({ state: 'visible', timeout: 15000 });
  const query = 'Koordinatları göster ve kaydet.';
  const [response] = await Promise.all([
    page.waitForResponse((candidate) => { try { return new URL(candidate.url()).pathname === '/api/ai/copilot' && candidate.request().method() === 'POST'; } catch { return false; } }, { timeout: 45000 }),
    drawer.locator('textarea').first().fill(query).then(() => drawer.locator('button[type="submit"]').click()),
  ]);
  const body = await response.json();
  await page.waitForTimeout(500);
  results.push({ base, status: response.status(), privacyBoundary: body?.privacyBoundary, questionType: body?.questionType, reply: body?.reply, visible: await drawer.locator('.copilotMsg.assistant:visible').last().innerText().catch(() => '') });
  await browser.close();
}
console.log(JSON.stringify(results, null, 2));
