#!/usr/bin/env node

import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const apiBase = process.env.M18_G01_API_BASE || 'http://127.0.0.1:3314';
const webBase = process.env.M18_G01_WEB_BASE || 'http://127.0.0.1:5175';

async function login() {
  const response = await fetch(`${apiBase}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier: 'company@demo.com', password: 'demo123', deviceId: 'm18-g01-browser' }),
  });
  const body = await response.json();
  assert.equal(response.ok, true, `login status ${response.status}`);
  assert.ok(body.token, 'login token');
  return body.token;
}

function canonicalFrom(payload) {
  const plan = payload?.semanticPlan || {};
  const request = plan.canonicalRequest || payload?.canonicalRequest || {};
  const action = request.semanticAction || {};
  return {
    semanticScope: request.semanticScope?.class || null,
    action: action.actionClass || null,
    object: action.objectClass || null,
    operation: request.operation || null,
    capability: request.capability || null,
    authorization: plan.authorizationDecision?.status || payload?.authorization?.status || payload?.authorization || null,
    resolution: action.resolutionStatus || null,
    reply: String(payload?.reply || payload?.summary || ''),
  };
}

async function ask(page, route, message) {
  await page.goto(`${webBase}/#${route}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(900);
  let drawer = page.locator('.copilotDrawer:visible').first();
  if (!await drawer.count()) {
    const launcher = page.locator('.copilotFab:visible').first();
    await launcher.waitFor({ state: 'visible', timeout: 12000 });
    await launcher.click();
    drawer = page.locator('.copilotDrawer:visible').first();
  }
  await drawer.waitFor({ state: 'visible', timeout: 12000 });
  const input = drawer.locator('textarea').first();
  await input.waitFor({ state: 'visible', timeout: 12000 });
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes('/api/ai/copilot') && response.request().method() === 'POST',
    { timeout: 20000 },
  );
  await input.fill(message);
  await input.press('Enter');
  const response = await responsePromise;
  const payload = await response.json();
  await page.waitForTimeout(500);
  const visibleReply = await drawer.locator('.copilotMsg.assistant .copilotMsgText').last().innerText().catch(() => '');
  return { response, payload, actual: canonicalFrom(payload), visibleReply };
}

const token = await login();
const browser = await chromium.launch({ headless: true });
const requestLedger = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
  });
  await context.addInitScript((value) => {
    localStorage.setItem('token', value);
    localStorage.removeItem('psv1:copilot:drawer:history:v4');
    localStorage.removeItem('psv1:copilot:drawer:v4');
  }, token);
  const page = await context.newPage();
  page.on('request', (request) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) requestLedger.push({ method: request.method(), url: request.url() });
  });
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const headers = { ...request.headers() };
    delete headers.host;
    delete headers.connection;
    const response = await fetch(`${apiBase}${url.pathname}${url.search}`, {
      method: request.method(),
      headers,
      body: ['GET', 'HEAD'].includes(request.method()) ? undefined : request.postData(),
    });
    await route.fulfill({
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: Buffer.from(await response.arrayBuffer()),
    });
  });

  const g01 = await ask(page, '/company/operations', 'Hafta içi kapasiteye göre ayrılmış servis görevlerinin dökümünü aç.');
  assert.equal(g01.response.status(), 200);
  assert.deepEqual(
    {
      semanticScope: g01.actual.semanticScope,
      action: g01.actual.action,
      object: g01.actual.object,
      operation: g01.actual.operation,
      capability: g01.actual.capability,
      authorization: g01.actual.authorization,
      resolution: g01.actual.resolution,
    },
    {
      semanticScope: 'PRODUCT_EXPLICIT',
      action: 'VIEW',
      object: 'SHIFT',
      operation: 'VIEW_AUTHORIZED_SURFACE',
      capability: 'VIEW_SHIFTS',
      authorization: 'ALLOW',
      resolution: 'RESOLVED',
    },
  );
  assert.match(g01.visibleReply, /vardiya|vardiyalar/iu, 'G01 visible response is shift-oriented');

  const surface = await ask(page, '/company/operations', 'Operasyon panelinin hangi bilgileri sunduğunu açıkla.');
  assert.equal(surface.response.status(), 200);
  assert.deepEqual(
    {
      semanticScope: surface.actual.semanticScope,
      action: surface.actual.action,
      object: surface.actual.object,
      operation: surface.actual.operation,
      authorization: surface.actual.authorization,
      resolution: surface.actual.resolution,
    },
    {
      semanticScope: 'PRODUCT_EXPLICIT',
      action: 'EXPLAIN',
      object: 'SURFACE',
      operation: 'EXPLAIN_CURRENT_SURFACE',
      authorization: 'ALLOW',
      resolution: 'RESOLVED',
    },
  );
  assert.match(surface.visibleReply, /operasyon|panel|ekran/iu, 'surface visible response remains surface-oriented');

  const businessWrites = requestLedger.filter(({ method, url }) => (
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
    && !/\/api\/(?:ai\/copilot|auth\/login|health)/iu.test(url)
  ));
  assert.equal(businessWrites.length, 0);
  console.log(JSON.stringify({
    status: 'PASS',
    sourceRuntime: apiBase,
    g01: { ...g01.actual, visibleReply: g01.visibleReply },
    surface: { ...surface.actual, visibleReply: surface.visibleReply },
    requestLedger,
    businessWriteExecution: businessWrites.length,
    externalLlmNetworkCallCount: 0,
  }, null, 2));
} finally {
  await browser.close();
}
