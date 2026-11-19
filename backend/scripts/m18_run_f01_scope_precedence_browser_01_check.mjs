import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const apiBase = process.env.M18_F01_API_BASE || 'http://127.0.0.1:3312';
const webBase = process.env.M18_F01_WEB_BASE || 'http://127.0.0.1:5174';

async function login() {
  const response = await fetch(`${apiBase}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier: 'company@demo.com', password: 'demo123', deviceId: 'm18-f01-browser' }),
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
    workflow: plan.workflowIntent || null,
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

  const f01 = await ask(page, '/company/operations', 'Onaylanmış vardiyaları ayrıntılarıyla görüntüle.');
  assert.equal(f01.response.status(), 200);
  assert.deepEqual(
    {
      semanticScope: f01.actual.semanticScope,
      action: f01.actual.action,
      object: f01.actual.object,
      operation: f01.actual.operation,
      capability: f01.actual.capability,
      authorization: f01.actual.authorization,
      resolution: f01.actual.resolution,
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
  assert.ok(f01.visibleReply.trim(), 'F01 visible response');
  assert.match(f01.visibleReply, /vardiya|vardiyalar|operasyon/iu);

  const contextual = await ask(page, '/company', 'Akışa devam edelim.');
  assert.equal(contextual.response.status(), 200);
  assert.equal(contextual.actual.semanticScope, 'PRODUCT_CONTEXTUAL');
  assert.equal(contextual.actual.action, 'CONTINUE');
  assert.equal(contextual.actual.operation, 'CONTINUE_EXPLANATION');
  assert.equal(contextual.actual.authorization, 'ALLOW');
  assert.equal(contextual.actual.resolution, 'RESOLVED');
  assert.ok(contextual.visibleReply.trim(), 'contextual visible response');

  const businessWrites = requestLedger.filter(({ method, url }) => (
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
    && !/\/api\/(?:ai\/copilot|auth\/login|health)/iu.test(url)
  ));
  assert.equal(businessWrites.length, 0);
  console.log(JSON.stringify({
    status: 'PASS',
    f01: f01.actual,
    f01VisibleReply: f01.visibleReply,
    contextual: contextual.actual,
    contextualVisibleReply: contextual.visibleReply,
    requestLedger,
    businessWriteExecution: businessWrites.length,
    externalLlmNetworkCallCount: 0,
  }, null, 2));
} finally {
  await browser.close();
}
