import { chromium } from '@playwright/test';

const base = process.env.M18_BASE || 'http://localhost:5273';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'tr-TR', timezoneId: 'Europe/Istanbul' });
const page = await context.newPage();
const errors = [];
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console:${message.text()}`); });
page.on('pageerror', (error) => errors.push(`page:${String(error.message || error)}`));

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
await page.goto(`${base}/#/room/shifts`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
const storage = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).map(([key, value]) => [key, String(value).slice(0, 160)])));
const apiRead = await page.evaluate(async () => {
  const token = Object.values(localStorage).map(String).find((value) => value.split('.').length === 3) || '';
  const response = await fetch('/api/shifts?take=200&includeOffered=1', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const body = await response.json().catch(() => null);
  const items = Array.isArray(body?.items) ? body.items : [];
  return {
    status: response.status,
    items: items.map((shift) => ({
      id: shift.id,
      status: shift.status,
      startAt: shift.startAt,
      endAt: shift.endAt,
      companyId: shift.companyId,
      companyName: shift.company?.name,
      agreementId: shift.agreementId,
      vehicleId: shift.vehicleId,
      driverId: shift.driverId,
      assignmentCount: shift.assignmentCount,
      peopleCount: shift.peopleCount,
      testEligible: Number(shift?.agreementId || 0) > 0 && Number(shift?.vehicleId || 0) > 0 && Number(shift?.driverId || 0) > 0 && ['APPROVED', 'ACTIVE'].includes(String(shift?.status || '').toUpperCase()),
    })),
  };
});
const candidates = await page.locator('[data-testid^="room-test-simulated-completion-"]').evaluateAll((buttons) => buttons.map((button) => ({
  testId: button.getAttribute('data-testid'),
  text: button.textContent?.trim(),
  disabled: button.disabled,
  parentText: button.parentElement?.parentElement?.innerText?.slice(0, 500) || '',
})));
console.log(JSON.stringify({ base, route: page.url(), apiRead, candidates, errors, bodyText: (await page.locator('body').innerText()).slice(0, 5000) }, null, 2));
await browser.close();
