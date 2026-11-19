#!/usr/bin/env node

import { chromium } from '@playwright/test';

const webBaseUrl = (process.env.WEB_BASE_URL || 'http://127.0.0.1:5174').replace(/\/$/u, '');
const verbose = process.env.M18_DLEVEL_VERBOSE === '1';
const roles = [
  { role: 'ROOM', identifier: 'room@demo.com', route: '/room/shifts' },
  { role: 'COMPANY', identifier: 'company@demo.com', route: '/company' },
  { role: 'SCHOOL', identifier: 'school@demo.com', route: '/school' },
  { role: 'ORGANIZATION', identifier: 'organization@demo.com', route: '/organization' },
  { role: 'DRIVER', identifier: 'driver@demo.com', route: '/driver/route', deviceId: process.env.DRIVER_BROWSER_DEVICE_ID || 'web-vos7tyh6mtpo1gze' },
  { role: 'PERSONEL', identifier: 'personel@demo.com', route: '/personel/live' },
  { role: 'PARENT', identifier: 'parent@demo.com', route: '/parent/live' },
  { role: 'SUPER_ADMIN', identifier: 'superadmin@demo.com', route: '/superadmin/operations' },
];
const viewports = [
  { name: 'tablet', width: 1024, height: 900, isMobile: false, hasTouch: false },
  { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true },
];

const rows = [];
const failures = [];
let businessWrites = 0;
let loginFailures = 0;
let runtimeFailures = 0;

function compact(payload) {
  const plan = payload?.semanticPlan || {};
  const request = plan.canonicalRequest || payload?.canonicalRequest || {};
  const action = request.semanticAction || {};
  return {
    family: plan.family || null,
    action: action.actionClass || null,
    object: action.objectClass || null,
    operation: request.operation || null,
    clarification: Boolean(plan.clarificationNeed),
    guidedTarget: payload?.guidedTarget?.status || null,
    reply: String(payload?.reply || '').slice(0, 240),
  };
}

function hasRecordClarification(actual) {
  return actual.clarification
    || /hangi kayıt|kayıt türünü|görünen adını|numarasını/iu.test(actual.reply)
    || /RECORD|ENTITY_LOOKUP|LOOK_UP_FIELD/iu.test(`${actual.object} ${actual.operation}`);
}

async function runCase(browser, roleSpec, viewportSpec) {
  const context = await browser.newContext({
    viewport: { width: viewportSpec.width, height: viewportSpec.height },
    isMobile: viewportSpec.isMobile,
    hasTouch: viewportSpec.hasTouch,
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    ignoreHTTPSErrors: webBaseUrl.startsWith('https://'),
  });
  if (roleSpec.deviceId) {
    await context.addInitScript((deviceId) => {
      localStorage.setItem('personel_servis_browser_device_id', deviceId);
    }, roleSpec.deviceId);
  }
  const page = await context.newPage();
  page.on('request', (request) => {
    const method = String(request.method() || '').toUpperCase();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && /\/api\/(?:shifts|guided-drafts)(?:\/|$)/iu.test(request.url())) businessWrites += 1;
  });
  const row = {
    role: roleSpec.role,
    viewport: viewportSpec.name,
    width: viewportSpec.width,
    route: roleSpec.route,
    status: 'PASS',
  };
  try {
    await page.goto(`${webBaseUrl}/#${roleSpec.route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const identifier = page.locator('input[autocomplete="username"]');
    if (await identifier.count()) {
      await identifier.fill(roleSpec.identifier);
      await page.locator('input[autocomplete="current-password"]').fill('demo123');
      await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
      await page.waitForFunction(() => !document.querySelector('input[autocomplete="username"]'), null, { timeout: 30000 });
    }
    await page.waitForTimeout(1400);
    const body = await page.locator('body').innerText();
    if (/başka bir cihaza bağlı|giriş yapılamadı|oturum açılamadı/iu.test(body)) {
      loginFailures += 1;
      throw new Error(`LOGIN_BLOCKED:${body.slice(0, 180)}`);
    }
    const fab = page.locator('.copilotFab:visible').first();
    await fab.waitFor({ state: 'visible', timeout: 15000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    const fabBox = await fab.boundingBox();
    if (overflow || !fabBox || fabBox.x < 0 || fabBox.y < 0 || fabBox.x + fabBox.width > viewportSpec.width || fabBox.y + fabBox.height > viewportSpec.height) {
      throw new Error(`RESPONSIVE_SHELL_INVALID:overflow=${overflow}:fab=${JSON.stringify(fabBox)}`);
    }
    await fab.click();
    const drawer = page.locator('.copilotDrawer:visible').first();
    await drawer.waitFor({ state: 'visible', timeout: 10000 });
    const drawerBox = await drawer.boundingBox();
    if (!drawerBox || drawerBox.x < 0 || drawerBox.y < 0 || drawerBox.x + drawerBox.width > viewportSpec.width + 1 || drawerBox.y + drawerBox.height > viewportSpec.height + 1) {
      throw new Error(`DRAWER_OUT_OF_VIEWPORT:${JSON.stringify(drawerBox)}`);
    }
    const input = drawer.locator('textarea').first();
    await input.waitFor({ state: 'visible', timeout: 10000 });
    const responsePromise = page.waitForResponse((response) => response.url().includes('/api/ai/copilot') && response.request().method() === 'POST', { timeout: 30000 });
    await input.fill('bu ekran ne işe yarıyor');
    await input.press('Enter');
    const response = await responsePromise;
    const payload = await response.json().catch(() => ({}));
    const actual = compact(payload);
    row.actual = actual;
    row.httpStatus = response.status();
    row.overflow = overflow;
    row.drawerBox = drawerBox;
    row.targetVisible = actual.guidedTarget === 'FOUND' || actual.family === 'SCREEN_CONTEXT' || actual.family === 'UI_GUIDANCE';
    if (response.status() !== 200 || !actual.reply || hasRecordClarification(actual) || /güvenli biçimde ürün anlamına bağlayamadım|hangi yetkili alanı/iu.test(actual.reply)) {
      throw new Error(`HELP_RESULT_INVALID:${JSON.stringify(actual)}`);
    }
    await page.getByRole('button', { name: 'Kapat', exact: true }).click();
  } catch (error) {
    row.status = 'FAIL';
    row.error = String(error?.message || error);
    failures.push(row);
    if (/COPILOT|RESPONSIVE|DRAWER|HELP_RESULT|Timeout|waiting/iu.test(row.error)) runtimeFailures += 1;
  } finally {
    await context.close();
  }
  rows.push(row);
  if (verbose) console.log(JSON.stringify(row));
}

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    for (const role of roles) await runCase(browser, role, viewport);
  }
} finally {
  await browser.close();
}

console.error(JSON.stringify({
  RESPONSIVE_ROLE_MATRIX: failures.length ? 'RED' : 'GREEN',
  ROLE_COUNT: roles.length,
  VIEWPORT_COUNT: viewports.length,
  TOTAL_CASES: rows.length,
  PASS_COUNT: rows.filter((row) => row.status === 'PASS').length,
  FAILURE_COUNT: failures.length,
  LOGIN_FAILURE_COUNT: loginFailures,
  RUNTIME_FAILURE_COUNT: runtimeFailures,
  BUSINESS_WRITE_EXECUTION: businessWrites,
  ROWS: rows,
}));
