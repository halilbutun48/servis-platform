import { chromium } from '@playwright/test';

const bases = ['http://localhost:5273', 'https://plenty-rss-scenario-connected.trycloudflare.com'];
const widths = [1440, 1024, 390, 320];
const query = 'Peki bu eski taslakta koordinat yoksa harita neyi gösteriyor?';
const results = [];

for (const base of bases) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'tr-TR', timezoneId: 'Europe/Istanbul' });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console:${message.text()}`); });
  page.on('pageerror', (error) => errors.push(`page:${String(error.message || error)}`));
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
  const username = page.locator('input[autocomplete="username"]');
  if (await username.count()) {
    await username.fill('organization@demo.com');
    await page.locator('input[autocomplete="current-password"]').fill('demo123');
    const loginResponse = await Promise.all([
      page.waitForResponse((candidate) => {
        try { return new URL(candidate.url()).pathname === '/api/auth/login'; } catch { return false; }
      }, { timeout: 30000 }),
      page.locator('button[type="submit"]').click(),
    ]).then(([response]) => response);
    if (loginResponse.status() !== 200) {
      results.push({ base, login: 'FAIL', status: loginResponse.status(), errors });
      await browser.close();
      continue;
    }
    await page.waitForFunction(() => !document.querySelector('input[autocomplete="username"]'), null, { timeout: 30000 });
  }
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${base}/#/organization/plans`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    let drawer = page.locator('.copilotDrawer:visible').first();
    if (!(await drawer.count())) {
      const fab = page.locator('.copilotFab:visible').first();
      if (await fab.count()) { await fab.click(); drawer = page.locator('.copilotDrawer:visible').first(); }
    }
    await drawer.waitFor({ state: 'visible', timeout: 15000 });
    const [response] = await Promise.all([
      page.waitForResponse((candidate) => {
        try { return new URL(candidate.url()).pathname === '/api/ai/copilot' && candidate.request().method() === 'POST'; } catch { return false; }
      }, { timeout: 45000 }),
      drawer.locator('textarea').first().fill(query).then(() => drawer.locator('button[type="submit"]').click()),
    ]);
    const body = await response.json();
    await page.waitForTimeout(700);
    const assistant = drawer.locator('.copilotMsg.assistant:visible').last();
    results.push({
      base,
      width,
      status: response.status(),
      provider: body?.provider,
      source: body?.source || null,
      reply: body?.reply,
      visible: await assistant.innerText().catch(() => ''),
      errors: [...errors],
    });
  }
  await browser.close();
}

console.log(JSON.stringify(results, null, 2));
