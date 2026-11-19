import { chromium } from '@playwright/test';

const bases = ['http://localhost:5273', 'https://plenty-rss-scenario-connected.trycloudflare.com'];
const cases = [];
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
    await username.fill('parent@demo.com');
    await page.locator('input[autocomplete="current-password"]').fill('demo123');
    const response = await Promise.all([
      page.waitForResponse((candidate) => new URL(candidate.url()).pathname === '/api/auth/login', { timeout: 30000 }),
      page.locator('button[type="submit"]').click(),
    ]).then(([candidate]) => candidate);
    if (response.status() !== 200) throw new Error(`PARENT_LOGIN_${response.status()}`);
    await page.waitForFunction(() => !document.querySelector('input[autocomplete="username"]'), null, { timeout: 30000 });
  }
  await page.goto(`${base}/#/parent/live`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const bodyBefore = await page.locator('body').innerText();
  let drawer = page.locator('.copilotDrawer:visible').first();
  if (!(await drawer.count())) {
    const fab = page.locator('.copilotFab:visible').first();
    if (await fab.count()) { await fab.click(); drawer = page.locator('.copilotDrawer:visible').first(); }
  }
  await drawer.waitFor({ state: 'visible', timeout: 15000 });
  const prompts = ['Öğrencimin servisi nerede?', 'Peki bugün görünmüyorsa ne yapmalıyım?'];
  const replies = [];
  for (const prompt of prompts) {
    const response = await Promise.all([
      page.waitForResponse((candidate) => new URL(candidate.url()).pathname === '/api/ai/copilot' && candidate.request().method() === 'POST', { timeout: 45000 }),
      drawer.locator('textarea').first().fill(prompt).then(() => drawer.locator('button[type="submit"]').click()),
    ]).then(([candidate]) => candidate);
    const json = await response.json();
    await page.waitForTimeout(500);
    replies.push({ prompt, status: response.status(), reply: json?.reply, provider: json?.provider, source: json?.source || null, visible: await drawer.locator('.copilotMsg.assistant:visible').last().innerText().catch(() => '') });
  }
  cases.push({ base, route: page.url(), bodyHasParentSurface: /Veli|Canlı Takip|Öğrenci/iu.test(bodyBefore), replies, errors });
  await browser.close();
}
console.log(JSON.stringify(cases, null, 2));
