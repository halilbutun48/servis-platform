#!/usr/bin/env node

import { chromium } from '@playwright/test';

const webBaseUrl = (process.env.WEB_BASE_URL || 'http://127.0.0.1:5174').replace(/\/$/, '');
const spacingMs = Math.max(0, Number(process.env.M18_COPILOT_REQUEST_SPACING_MS || 900));
let lastRequestAt = 0;

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

const prompts = [
  ['GENERIC_HELP', 'bu program ne işe yarıyor'],
  ['GENERIC_HELP_TYPO_1', 'bu promram ne işe yarıyor'],
  ['GENERIC_HELP_TYPO_2', 'bu promgram ne işe yarıyor'],
  ['SURFACE_HELP', 'bu ekran ne işe yarıyor'],
  ['WHAT_TO_DO', 'burada ne yapabilirim'],
  ['WHAT_TO_LOOK_AT', 'nerelere bakmam gerek'],
  ['HELP', 'bana yardım et'],
  ['HOW_TO_USE', 'bu programı kullanmayı bana öğret'],
  ['HOW_TO_USE_2', 'bu programı nasıl kullanacağım'],
  ['WHERE_TO_START', 'burada nereden başlamalıyım'],
  ['RISK_HELP', 'burda sorun var mı'],
  ['RISK_HELP_2', 'burada dikkat etmem gereken bir şey var mı'],
  ['NEXT_STEP', 'ne yapmam gerekiyor'],
  ['STEP_GUIDANCE', 'bana adım adım göster'],
];

function compact(payload) {
  const plan = payload?.semanticPlan || {};
  const request = plan.canonicalRequest || payload?.canonicalRequest || {};
  const action = request.semanticAction || {};
  return {
    family: plan.family || null,
    route: plan.conversationRoute || payload?.conversationRoute || null,
    scope: request.semanticScope?.class || null,
    action: action.actionClass || null,
    object: action.objectClass || null,
    operation: request.operation || null,
    clarification: Boolean(plan.clarificationNeed),
    guidedTarget: payload?.guidedTarget?.status || null,
    reply: String(payload?.reply || '').slice(0, 220),
  };
}

function recordClarification(actual) {
  return actual.clarification
    || /hangi kayıt|kayıt türünü|görünen adını|numarasını/iu.test(actual.reply)
    || /RECORD|ENTITY_LOOKUP|LOOK_UP_FIELD/iu.test(`${actual.object} ${actual.operation}`);
}

const browser = await chromium.launch({ headless: true });
const rows = [];
const failures = [];
let businessWrites = 0;
try {
  for (const spec of roles) {
    const context = await browser.newContext({
      viewport: { width: 1024, height: 900 },
      locale: 'tr-TR',
      timezoneId: 'Europe/Istanbul',
      ignoreHTTPSErrors: webBaseUrl.startsWith('https://'),
    });
    if (spec.deviceId) await context.addInitScript((id) => localStorage.setItem('personel_servis_browser_device_id', id), spec.deviceId);
    const page = await context.newPage();
    page.on('request', (request) => {
      const method = String(request.method() || '').toUpperCase();
      if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && /\/api\/(?:shifts|guided-drafts)(?:\/|$)/i.test(request.url())) businessWrites += 1;
    });
    try {
      await page.goto(`${webBaseUrl}/#${spec.route}`, { waitUntil: 'domcontentloaded' });
      const identifier = page.locator('input[autocomplete="username"]');
      if (await identifier.count()) {
        await identifier.fill(spec.identifier);
        await page.locator('input[autocomplete="current-password"]').fill('demo123');
        await page.getByRole('button', { name: 'Giriş yap' }).click();
        await page.waitForFunction(() => !document.querySelector('input[autocomplete="username"]'), null, { timeout: 30000 });
      }
      await page.waitForTimeout(700);
      const loginText = await page.locator('body').innerText();
      if (/başka bir cihaza bağlı|giriş yapılamadı|oturum açılamadı/i.test(loginText)) throw new Error(`LOGIN_BLOCKED:${loginText.slice(0, 180)}`);
      const fab = page.locator('.copilotFab:visible').first();
      if (!(await fab.count())) throw new Error('COPILOT_LAUNCHER_MISSING');
      await fab.click();
      const drawer = page.locator('.copilotDrawer:visible').first();
      await drawer.waitFor({ state: 'visible', timeout: 10000 });
      const input = drawer.locator('textarea').first();
      for (const [id, message] of prompts) {
        const wait = Math.max(0, spacingMs - (Date.now() - lastRequestAt));
        if (wait) await page.waitForTimeout(wait);
        lastRequestAt = Date.now();
        const responsePromise = page.waitForResponse((response) => response.url().includes('/api/ai/copilot') && response.request().method() === 'POST', { timeout: 30000 });
        await input.fill(message);
        await input.press('Enter');
        const response = await responsePromise;
        const payload = await response.json().catch(() => ({}));
        const actual = compact(payload);
        const row = { role: spec.role, rawInput: message, expectedIntentFamily: id, currentRoute: page.url().split('#')[1] || spec.route, actual };
        rows.push(row);
        if (response.status() !== 200 || recordClarification(actual) || /hangi yetkili alanı|güvenli biçimde ürün anlamına bağlayamadım/iu.test(actual.reply)) {
          failures.push(row);
        }
        console.log(JSON.stringify(row));
      }
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

console.error(JSON.stringify({
  GENERIC_HELP_8_ROLE_MATRIX: failures.length ? 'RED' : 'GREEN',
  TOTAL_CASES: rows.length,
  FAILURE_COUNT: failures.length,
  RECORD_CLARIFICATION_FALSE_POSITIVE_COUNT: failures.filter((row) => recordClarification(row.actual)).length,
  LOGIN_OR_RUNTIME_FAILURE_COUNT: failures.filter((row) => /LOGIN_BLOCKED|COPILOT_LAUNCHER_MISSING/.test(JSON.stringify(row))).length,
  BUSINESS_WRITE_EXECUTION: businessWrites,
}));
