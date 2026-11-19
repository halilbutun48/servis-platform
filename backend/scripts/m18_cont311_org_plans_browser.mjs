import { chromium } from '@playwright/test';

const bases = ['http://localhost:5273', 'https://plenty-rss-scenario-connected.trycloudflare.com'];
const widths = [1440, 390, 320];
const query = 'Peki bu eski taslakta koordinat yoksa harita neyi gösteriyor?';
const results = [];

for (const base of bases) {
  for (const width of widths) {
    console.log(`START ${base} width=${width}`);
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'tr-TR', timezoneId: 'Europe/Istanbul' });
    const page = await context.newPage();
    const errors = [];
    page.on('console', (message) => { if (message.type() === 'error') errors.push(`console:${message.text()}`); });
    page.on('pageerror', (error) => errors.push(`page:${String(error.message || error)}`));
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    const username = page.locator('input[autocomplete="username"]');
    if (await username.count()) {
      console.log(`LOGIN_FORM ${base} width=${width}`);
      await username.fill('organization@demo.com');
      await page.locator('input[autocomplete="current-password"]').fill('demo123');
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(2500);
      console.log(`AFTER_LOGIN ${base} width=${width} url=${page.url()} loginStill=${await page.locator('input[autocomplete="username"]').count()} text=${(await page.locator('body').innerText()).slice(0,220).replace(/\s+/g, ' ')}`);
      if (await page.locator('input[autocomplete="username"]').count()) {
        results.push({ base, width, login: 'FAIL', url: page.url(), text: (await page.locator('body').innerText()).slice(0, 400), errors });
        await browser.close();
        continue;
      }
    }
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
    await page.waitForTimeout(900);
    const assistant = drawer.locator('.copilotMsg.assistant:visible').last();
    results.push({
      base,
      width,
      status: response.status(),
      provider: body?.provider,
      providerSummary: body?.providerSummary,
      reply: body?.reply,
      source: body?.source || null,
      questionType: body?.questionType,
      semanticFamily: body?.semanticPlan?.family || body?.semanticPlan?.intentFamily || null,
      semanticDomain: body?.semanticPlan?.canonicalRequest?.request?.domain || null,
      visible: await assistant.innerText().catch(() => ''),
      errors,
    });
    await browser.close();
  }
}

console.log(JSON.stringify(results, null, 2));
