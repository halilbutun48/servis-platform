import { chromium } from '@playwright/test';

const bases = [
  process.env.M18_LOCAL_BASE || 'http://localhost:5273',
  process.env.M18_PUBLIC_BASE || 'https://plenty-rss-scenario-connected.trycloudflare.com',
];
const roles = [
  { name: 'SCHOOL', username: 'school@demo.com', route: '/school/service-evaluation' },
  { name: 'ORGANIZATION', username: 'organization@demo.com', route: '/organization/service-evaluation' },
];
const viewports = [1440, 1024, 390, 320];
const browser = await chromium.launch({ headless: true });
const results = [];

for (const base of bases) {
  for (const role of roles) {
    for (const width of viewports) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, locale: 'tr-TR', timezoneId: 'Europe/Istanbul' });
      const page = await context.newPage();
      const errors = [];
      page.on('console', (message) => { if (message.type() === 'error') errors.push(`console:${message.text()}`); });
      page.on('pageerror', (error) => errors.push(`page:${String(error.message || error)}`));
      try {
        await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
        const username = page.locator('input[autocomplete="username"]');
        if (await username.count()) {
          await username.fill(role.username);
          await page.locator('input[autocomplete="current-password"]').fill('demo123');
          const response = await Promise.all([
            page.waitForResponse((candidate) => new URL(candidate.url()).pathname === '/api/auth/login', { timeout: 30000 }),
            page.locator('button[type="submit"]').click(),
          ]).then(([candidate]) => candidate);
          if (response.status() !== 200) throw new Error(`${role.name}_LOGIN_${response.status()}`);
          await page.waitForFunction(() => !document.querySelector('input[autocomplete="username"]'), null, { timeout: 30000 });
        }
        await page.goto(`${base}/#${role.route}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(900);
        const api = await page.evaluate(async () => {
          const token = Object.values(localStorage).map(String).find((value) => value.split('.').length === 3) || '';
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          const [summary, items] = await Promise.all([
            fetch('/api/trust-quality/company/summary', { headers }),
            fetch('/api/trust-quality/company/items?take=12&pendingOnly=1', { headers }),
          ]);
          const summaryBody = await summary.json().catch(() => null);
          const itemsBody = await items.json().catch(() => null);
          return {
            summaryStatus: summary.status,
            itemsStatus: items.status,
            summary: summaryBody,
            itemCount: Array.isArray(itemsBody?.items) ? itemsBody.items.length : null,
          };
        });
        const bodyText = await page.locator('body').innerText();
        results.push({ base, role: role.name, width, route: page.url(), api, visibleEmptyState: /Henüz değerlendirme ekranına düşen tamamlanmış hizmet yok/i.test(bodyText), bodyText: bodyText.slice(0, 700), errors });
      } catch (error) {
        results.push({ base, role: role.name, width, error: String(error?.message || error), errors });
      } finally {
        await context.close();
      }
    }
  }
}

await browser.close();
console.log(JSON.stringify({ results }, null, 2));
