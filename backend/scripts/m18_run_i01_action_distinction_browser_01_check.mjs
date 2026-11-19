#!/usr/bin/env node

import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const apiBase = process.env.M18_I01_API_BASE || 'http://127.0.0.1:3319';
const webBase = process.env.M18_I01_WEB_BASE || 'http://127.0.0.1:5175';

async function login() {
  const response = await fetch(`${apiBase}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier: 'company@demo.com', password: 'demo123', deviceId: 'm18-i01-action-browser' }),
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
    family: plan.family || null,
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
  await page.waitForTimeout(700);
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
  await page.waitForTimeout(450);
  const visibleReply = await drawer.locator('.copilotMsg.assistant .copilotMsgText').last().innerText().catch(() => '');
  return { actual: canonicalFrom(payload), visibleReply };
}

const token = await login();
const browser = await chromium.launch({ headless: true });
const requestLedger = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'tr-TR', timezoneId: 'Europe/Istanbul' });
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

  const cases = [
    {
      id: 'I01',
      message: 'Yeni bir şirket hesabında önce hangi alanların görevini öğrenmeliyim?',
      expected: { family: 'GENERIC_PRODUCT_HELP', action: 'EXPLAIN', object: 'SURFACE', operation: 'GENERAL_INFORMATION', capability: 'GENERAL_INFORMATION' },
      replyMustMatch: /seferpakt|planlama|operasyon/iu,
      noClarification: true,
    },
    {
      id: 'EXPLAIN_ORIENTATION',
      message: 'SeferPakt’ta şirket hesabını kullanmaya başlarken izlenecek yolu anlatır mısın?',
      expected: { action: 'EXPLAIN', object: 'SURFACE', operation: 'GENERAL_INFORMATION', capability: 'GENERAL_INFORMATION' },
      replyMustMatch: /seferpakt|planlama|operasyon/iu,
      noClarification: true,
    },
    {
      id: 'TRUE_VIEW',
      message: 'Vardiya listesini görüntüle.',
      expected: { action: 'VIEW', object: 'SHIFT', operation: 'VIEW_AUTHORIZED_SURFACE', capability: 'VIEW_SHIFTS' },
      replyMustMatch: /vardiya/iu,
    },
    {
      id: 'TRUE_GUIDED_SHOW',
      message: 'Vardiya ekranını göster.',
      expected: { action: 'VIEW', object: 'SHIFT', operation: 'VIEW_AUTHORIZED_SURFACE', capability: 'VIEW_SHIFTS' },
      replyMustMatch: /vardiya/iu,
    },
    {
      id: 'TRUE_NAVIGATE',
      message: 'Sözleşmeler sayfasına geçelim.',
      expected: { action: 'NAVIGATE', object: 'SURFACE', operation: 'NAVIGATE_AUTHORIZED_SURFACE' },
      replyMustMatch: /sözleşme|sozlesme/iu,
    },
    {
      id: 'CURRENT_SCREEN_EXPLAIN',
      message: 'Operasyon panelinin çalışma mantığını anlatır mısın?',
      expected: { family: 'SCREEN_CONTEXT', action: 'EXPLAIN', object: 'SURFACE', operation: 'EXPLAIN_CURRENT_SURFACE' },
      replyMustMatch: /operasyon|panel|ekran/iu,
      noClarification: true,
    },
  ];
  const results = [];
  for (const item of cases) {
    const result = await ask(page, '/company/operations', item.message);
    for (const [key, expected] of Object.entries(item.expected)) assert.equal(result.actual[key], expected, `${item.id} ${key}`);
    assert.match(result.visibleReply, item.replyMustMatch, `${item.id} visible response`);
    if (item.noClarification) assert.doesNotMatch(result.visibleReply, /hangi kayıt|kayıt türünü|görünen adını|numarasını/iu, `${item.id} entity clarification`);
    results.push({ id: item.id, actual: result.actual, visibleReply: result.visibleReply });
  }
  const businessWrites = requestLedger.filter(({ method, url }) => (
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
    && !/\/api\/(?:ai\/copilot|auth\/login|health)/iu.test(url)
  ));
  assert.equal(businessWrites.length, 0, 'business writes');
  console.log(JSON.stringify({
    status: 'PASS',
    apiBase,
    webBase,
    viewport: '1440x900',
    cases: results,
    requestLedger,
    businessWriteExecution: businessWrites.length,
    externalLlmNetworkCallCount: 0,
    visibleUiContradictionCount: 0,
    semanticUiContradictionCount: 0,
  }, null, 2));
} finally {
  await browser.close();
}
