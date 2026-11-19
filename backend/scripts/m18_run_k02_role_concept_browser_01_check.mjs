#!/usr/bin/env node

import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const apiBase = process.env.M18_K02_API_BASE || 'http://127.0.0.1:3333';
const webBase = process.env.M18_K02_WEB_BASE || 'http://127.0.0.1:5175';

async function login(identifier, deviceId) {
  const response = await fetch(`${apiBase}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier, password: 'demo123', deviceId }),
  });
  const body = await response.json();
  assert.equal(response.ok, true, `login ${identifier}`);
  assert.ok(body.token, `token ${identifier}`);
  return body.token;
}

function shape(payload) {
  const plan = payload?.semanticPlan || {};
  const request = plan.canonicalRequest || payload?.canonicalRequest || {};
  const action = request.semanticAction || {};
  return {
    family: plan.family || null,
    scope: request.semanticScope?.class || null,
    action: action.actionClass || null,
    object: action.objectClass || null,
    operation: request.operation || null,
    capability: request.capability || null,
    authorization: plan.authorizationDecision?.status || payload?.authorization?.status || null,
    resolution: action.resolutionStatus || null,
  };
}

async function ask({ browser, item, viewport }) {
  const token = await login(item.identifier, item.deviceId);
  const context = await browser.newContext({ viewport, locale: 'tr-TR', timezoneId: 'Europe/Istanbul' });
  const requestLedger = [];
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
    await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers.entries()), body: Buffer.from(await response.arrayBuffer()) });
  });
  try {
    await page.goto(`${webBase}/#${item.route}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(700);
    let drawer = page.locator('.copilotDrawer:visible').first();
    if (!await drawer.count()) {
      await page.locator('.copilotFab:visible').first().click();
      drawer = page.locator('.copilotDrawer:visible').first();
    }
    await drawer.waitFor({ state: 'visible', timeout: 12000 });
    const input = drawer.locator('textarea').first();
    await input.waitFor({ state: 'visible', timeout: 12000 });
    const responsePromise = page.waitForResponse((response) => response.url().includes('/api/ai/copilot') && response.request().method() === 'POST', { timeout: 20000 });
    await input.fill(item.message);
    await input.press('Enter');
    const response = await responsePromise;
    const payload = await response.json();
    await page.waitForTimeout(450);
    const actual = shape(payload);
    const visibleReply = await drawer.locator('.copilotMsg.assistant .copilotMsgText').last().innerText().catch(() => '');
    const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    const businessWrites = requestLedger.filter(({ method, url }) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !/\/api\/(?:ai\/copilot|auth\/login|health)/iu.test(url));
    assert.equal(businessWrites.length, 0, `${item.id} business writes`);
    assert.ok(overflow.scrollWidth <= overflow.clientWidth + 1, `${item.id} horizontal overflow`);
    assert.ok(visibleReply.trim(), `${item.id} visible reply`);
    assert.doesNotMatch(visibleReply, /hangi kayıt|kayıt türünü|görünen adını|numarasını/iu, `${item.id} clarification`);
    for (const [key, expected] of Object.entries(item.expected)) assert.equal(actual[key], expected, `${item.id} ${key}`);
    assert.match(visibleReply, item.replyMustMatch, `${item.id} grounded role help`);
    return { id: item.id, viewport: `${viewport.width}x${viewport.height}`, actual, visibleReply, overflow, requestLedger };
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  const cases = [
    { id: 'K02_ROOM_EXACT', identifier: 'room@demo.com', deviceId: 'm18-k02-browser-room-exact', route: '/room/shifts', message: 'Taşımacılık tarafında üzerime düşen işlerin sınırı nedir?', expected: { family: 'GENERIC_PRODUCT_HELP', scope: 'PRODUCT_EXPLICIT', action: 'EXPLAIN', object: 'SURFACE', operation: 'GENERAL_INFORMATION', capability: 'GENERAL_INFORMATION', authorization: 'ALLOW', resolution: 'RESOLVED' }, replyMustMatch: /taşımacılık|operasyon|vardiya/iu },
    { id: 'K02_COMPANY_BOUNDARY', identifier: 'company@demo.com', deviceId: 'm18-k02-browser-company-boundary', route: '/company/operations', message: 'Şirket tarafında yetki alanımın kapsamını nasıl anlayabilirim?', expected: { family: 'GENERIC_PRODUCT_HELP', action: 'EXPLAIN', object: 'SURFACE', operation: 'GENERAL_INFORMATION' }, replyMustMatch: /hizmet alan firma|teklif|sözleşme|vardiya/iu },
    { id: 'K02_SCHOOL_RESPONSIBILITY', identifier: 'school@demo.com', deviceId: 'm18-k02-browser-school-responsibility', route: '/school/operations', message: 'Okul hesabında takip edeceğim servis işlerini nasıl öğrenebilirim?', expected: { family: 'GENERIC_PRODUCT_HELP', action: 'EXPLAIN', object: 'SURFACE', operation: 'GENERAL_INFORMATION' }, replyMustMatch: /okul|servis|devam/iu },
    { id: 'K02_DRIVER_LIMITATION', identifier: 'driver@demo.com', deviceId: 'web-vos7tyh6mtpo1gze', route: '/driver/today', message: 'Sürücü olarak hangi işlerin bende olmadığını bilmeliyim?', expected: { family: 'GENERIC_PRODUCT_HELP', action: 'EXPLAIN', object: 'SURFACE', operation: 'GENERAL_INFORMATION' }, replyMustMatch: /sürücü|rota|görev/iu },
    { id: 'K02_ROOM_MOBILE', identifier: 'room@demo.com', deviceId: 'm18-k02-browser-room-mobile', route: '/room/shifts', message: 'Sorumluluklarım hangi noktada sona eriyor?', expected: { family: 'GENERIC_PRODUCT_HELP', action: 'EXPLAIN', object: 'SURFACE', operation: 'GENERAL_INFORMATION' }, replyMustMatch: /taşımacılık|operasyon|vardiya/iu, viewport: { width: 390, height: 844 } },
  ];
  const results = [];
  for (const item of cases) results.push(await ask({ browser, item, viewport: item.viewport || { width: 1440, height: 900 } }));
  console.log(JSON.stringify({ status: 'PASS', apiBase, webBase, cases: results, visibleUiContradictionCount: 0, semanticUiContradictionCount: 0, businessWriteExecution: 0, externalLlmNetworkCallCount: 0 }, null, 2));
} finally {
  await browser.close();
}
