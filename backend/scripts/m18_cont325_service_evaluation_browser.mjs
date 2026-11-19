import { chromium } from '@playwright/test';

const localBase = process.env.M18_LOCAL_BASE || 'http://localhost:5273';
const publicBase = process.env.M18_PUBLIC_BASE || 'https://plenty-rss-scenario-connected.trycloudflare.com';
const allBases = [
  { name: 'local', url: localBase },
  { name: 'public', url: publicBase },
];
const bases = process.env.M18_SKIP_PUBLIC === '1' ? allBases.slice(0, 1) : allBases;
const fixture = {
  SCHOOL: Number(process.env.M18_SCHOOL_SHIFT_ID || 62),
  ORGANIZATION: Number(process.env.M18_ORGANIZATION_SHIFT_ID || 63),
};
const roles = {
  ROOM: { username: 'room@demo.com', route: '/room/shifts' },
  SCHOOL: { username: 'school@demo.com', route: '/school/service-evaluation' },
  ORGANIZATION: { username: 'organization@demo.com', route: '/organization/service-evaluation' },
};
const viewports = [
  { width: 1440, height: 1000 },
  { width: 1024, height: 900 },
  { width: 390, height: 844 },
  { width: 320, height: 800 },
];

const browser = await chromium.launch({ headless: true });
const results = [];
const sessionStates = new Map();

async function login(page, role) {
  await page.goto(`${page.baseURL}/`, { waitUntil: 'domcontentloaded' });
  const username = page.locator('input[autocomplete="username"]');
  if (await username.count()) {
    await username.fill(roles[role].username);
    await page.locator('input[autocomplete="current-password"]').fill('demo123');
    const response = await Promise.all([
      page.waitForResponse((candidate) => new URL(candidate.url()).pathname === '/api/auth/login', { timeout: 30000 }),
      page.locator('button[type="submit"]').click(),
    ]).then(([candidate]) => candidate);
    if (response.status() !== 200) throw new Error(`${role}_LOGIN_${response.status()}`);
    await page.waitForFunction(() => !document.querySelector('input[autocomplete="username"]'), null, { timeout: 30000 });
  }
}

async function apiSnapshot(page) {
  return page.evaluate(async () => {
    const values = Object.values(localStorage).map(String);
    const token = values.find((value) => value.split('.').length === 3) || '';
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await fetch('/api/trust-quality/company/items?take=20&pendingOnly=1', { headers });
    return { status: response.status, body: await response.json().catch(() => null) };
  });
}

async function firstVisible(locator) {
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    if (await candidate.isVisible()) return candidate;
  }
  throw new Error('VISIBLE_CONTROL_NOT_FOUND');
}

async function completeFixtureThroughRoom(page, shiftId) {
  await page.goto(`${page.baseURL}/#${roles.ROOM.route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  const contractTab = page.locator('button[data-copilot-semantic-id="product:room:shifts:tab:contract"]');
  await contractTab.waitFor({ state: 'visible', timeout: 30000 });
  await contractTab.click();
  await page.waitForTimeout(900);
  const card = page.locator(`article[data-testid="commercial-shift-card"][data-shift-id="${shiftId}"]`).first();
  const buttons = page.locator(`[data-testid="room-test-simulated-completion-${shiftId}"]`);
  if (!(await buttons.count())) {
    return { status: 200, alreadyDone: true, shiftId };
  }
  let button = buttons.last();
  if (!(await button.isVisible())) {
    const otherActions = card.locator('details.shiftCardOtherActions > summary').first();
    await otherActions.waitFor({ state: 'visible', timeout: 30000 });
    await otherActions.click({ force: true });
    await page.waitForTimeout(350);
    button = buttons.last();
  }
  await button.waitFor({ state: 'visible', timeout: 30000 });
  await button.scrollIntoViewIfNeeded();
  page.once('dialog', (dialog) => dialog.accept());
  const response = await Promise.all([
    page.waitForResponse((candidate) => new URL(candidate.url()).pathname.endsWith(`/test-simulated-completion`), { timeout: 30000 }),
    button.click(),
  ]).then(([candidate]) => candidate);
  const responseBody = await response.json().catch(() => null);
  await page.waitForTimeout(500);
  const text = await page.locator('body').innerText();
  return {
    status: response.status(),
    responseBody,
    visibleConfirmation: /TEST_SIMULATED|kontrollü DEMO hizmet kanıtı kaydedildi/i.test(text),
    bodyExcerpt: text.slice(0, 1200),
  };
}

async function submitEvaluation(page, role, shiftId) {
  await page.goto(`${page.baseURL}/#${roles[role].route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  const before = await apiSnapshot(page);
  const evaluateButton = page.getByRole('button', { name: 'Değerlendir', exact: true }).first();
  await evaluateButton.waitFor({ state: 'visible', timeout: 30000 });
  await evaluateButton.click();
  const starCandidates = page.locator('button');
  const starIndexes = [];
  const buttonCount = await starCandidates.count();
  for (let index = 0; index < buttonCount; index += 1) {
    const candidate = starCandidates.nth(index);
    if (await candidate.isVisible() && /^[☆★]$/.test((await candidate.innerText()).trim())) starIndexes.push(index);
  }
  if (starIndexes.length < 30) throw new Error(`${role}_RATING_BUTTONS_${starIndexes.length}_BUTTONS_${(await starCandidates.allTextContents()).slice(-20).join('|')}`);
  for (let index = 4; index < 30; index += 5) await starCandidates.nth(starIndexes[index]).click();
  await page.locator('textarea[placeholder="Kısa yorum yaz"]').fill(`TEST_SIMULATED ${role} hizmet değerlendirmesi #${shiftId}`);
  await page.locator('select').selectOption('true');
  const response = await Promise.all([
    page.waitForResponse((candidate) => new URL(candidate.url()).pathname === '/api/trust-quality/company/evaluations', { timeout: 30000 }),
    page.getByRole('button', { name: 'Kaydet' }).click(),
  ]).then(([candidate]) => candidate);
  const responseBody = await response.json().catch(() => null);
  await page.waitForTimeout(800);
  const after = await apiSnapshot(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const reloaded = await apiSnapshot(page);
  const bodyText = await page.locator('body').innerText();
  return {
    status: response.status(),
    responseBody,
    beforePending: before.body?.items?.map((item) => item.shiftId) || [],
    afterPending: after.body?.items?.map((item) => item.shiftId) || [],
    reloadedPending: reloaded.body?.items?.map((item) => item.shiftId) || [],
    visiblePersistedState: !new RegExp(`TEST_SIMULATED ${role} hizmet değerlendirmesi #${shiftId}`, 'i').test(bodyText),
    bodyExcerpt: bodyText.slice(0, 900),
  };
}

async function assertTenantNegative(page, actorRole, forbiddenShiftId) {
  const result = await page.evaluate(async ({ actorRole, forbiddenShiftId }) => {
    const values = Object.values(localStorage).map(String);
    const token = values.find((value) => value.split('.').length === 3) || '';
    const response = await fetch('/api/trust-quality/company/evaluations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        shiftId: forbiddenShiftId,
        ratings: { timeliness: 5, vehicleSuitability: 5, driverBehavior: 5, operationOrder: 5, liveTrackingConfidence: 5, overallSatisfaction: 5 },
        note: `TENANT_NEGATIVE_${actorRole}`,
        recommendAgain: true,
      }),
    });
    return { status: response.status, body: await response.json().catch(() => null) };
  }, { actorRole, forbiddenShiftId });
  return result;
}

for (const base of bases) {
  const roomContext = await browser.newContext({ viewport: viewports[0], locale: 'tr-TR', timezoneId: 'Europe/Istanbul' });
  const roomPage = await roomContext.newPage();
  roomPage.baseURL = base.url;
  const errors = [];
  roomPage.on('pageerror', (error) => errors.push(String(error.message || error)));
  roomPage.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  try {
    await login(roomPage, 'ROOM');
    const roomActions = [];
    for (const shiftId of [fixture.SCHOOL, fixture.ORGANIZATION]) {
      roomActions.push({ shiftId, ...(await completeFixtureThroughRoom(roomPage, shiftId)) });
    }
    results.push({ base: base.name, role: 'ROOM', roomActions, errors });
  } catch (error) {
    results.push({ base: base.name, role: 'ROOM', error: String(error?.message || error), errors });
  } finally {
    await roomContext.close();
  }

  for (const role of ['SCHOOL', 'ORGANIZATION']) {
    const context = await browser.newContext({ viewport: viewports[0], locale: 'tr-TR', timezoneId: 'Europe/Istanbul' });
    const page = await context.newPage();
    page.baseURL = base.url;
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error.message || error)));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    try {
      await login(page, role);
      sessionStates.set(`${base.name}:${role}`, await context.storageState());
      const evaluation = await submitEvaluation(page, role, fixture[role]);
      const forbidden = role === 'SCHOOL' ? fixture.ORGANIZATION : fixture.SCHOOL;
      const tenantNegative = await assertTenantNegative(page, role, forbidden);
      results.push({ base: base.name, role, evaluation, tenantNegative, errors });
    } catch (error) {
      results.push({ base: base.name, role, error: String(error?.message || error), errors });
    } finally {
      await context.close();
    }
  }
}

for (const base of bases) {
  for (const role of ['SCHOOL', 'ORGANIZATION']) {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport,
        locale: 'tr-TR',
        timezoneId: 'Europe/Istanbul',
        storageState: sessionStates.get(`${base.name}:${role}`),
      });
      const page = await context.newPage();
      page.baseURL = base.url;
      try {
        await page.goto(`${base.url}/#${roles[role].route}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(600);
        const layout = await page.evaluate(() => ({
          innerWidth: window.innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
          visible: document.body.innerText.includes('Hizmet Değerlendirme'),
        }));
        results.push({ base: base.name, role, viewport: viewport.width, layout });
      } catch (error) {
        results.push({ base: base.name, role, viewport: viewport.width, error: String(error?.message || error) });
      } finally {
        await context.close();
      }
    }
  }
}

await browser.close();
console.log(JSON.stringify({ fixture, results }, null, 2));
