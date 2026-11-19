#!/usr/bin/env node

import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const apiBase = process.env.M18_TASK13_API_BASE || 'http://127.0.0.1:3400';
const webBase = process.env.M18_TASK13_WEB_BASE || 'http://127.0.0.1:5175';
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 1024, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

async function login(deviceId) {
  const response = await fetch(`${apiBase}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier: 'company@demo.com', password: 'demo123', deviceId }),
  });
  const body = await response.json();
  assert.equal(response.ok, true, `login ${deviceId}`);
  assert.ok(body.token, `token ${deviceId}`);
  return body.token;
}

function canonical(payload) {
  const plan = payload?.semanticPlan || {};
  const request = plan.canonicalRequest || payload?.canonicalRequest || {};
  const action = request.semanticAction || {};
  return {
    family: plan.family || null,
    scope: request.semanticScope?.class || null,
    action: action.actionClass || null,
    object: action.objectClass || null,
    operation: request.operation || null,
    resolution: action.resolutionStatus || null,
  };
}

async function checkViewport(browser, viewport, token) {
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
    await page.goto(`${webBase}/#/company/operations`, { waitUntil: 'domcontentloaded', timeout: 20000 });
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
    await input.fill('Vardiya ekranını göster.');
    await input.press('Enter');
    const response = await responsePromise;
    const payload = await response.json();
    await page.waitForTimeout(450);
    const actual = canonical(payload);
    const guidedTarget = payload?.guidedTarget || null;
    const visibleReply = await drawer.locator('.copilotMsg.assistant .copilotMsgText').last().innerText().catch(() => '');
    const layout = await page.evaluate(() => {
      const rect = (element) => element ? element.getBoundingClientRect().toJSON() : null;
      const composer = document.querySelector('.copilotDrawer textarea');
      const drawerNode = document.querySelector('.copilotDrawer');
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        composer: rect(composer),
        drawer: rect(drawerNode),
      };
    });
    const businessWrites = requestLedger.filter(({ method, url }) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !/\/api\/(?:ai\/copilot|auth\/login|health)/iu.test(url));
    assert.equal(response.status(), 200, `${viewport.name} HTTP status`);
    assert.equal(actual.action, 'VIEW', `${viewport.name} action`);
    assert.equal(actual.object, 'SHIFT', `${viewport.name} target object`);
    assert.equal(actual.operation, 'VIEW_AUTHORIZED_SURFACE', `${viewport.name} operation`);
    assert.match(visibleReply, /vardiya/iu, `${viewport.name} visible grounding`);
    assert.equal(guidedTarget?.status, 'FOUND', `${viewport.name} exact grounded target status`);
    assert.ok(guidedTarget?.targetKey, `${viewport.name} exact grounded target identity`);
    assert.equal(businessWrites.length, 0, `${viewport.name} business writes`);
    assert.ok(layout.scrollWidth <= layout.clientWidth + 1, `${viewport.name} horizontal overflow`);
    assert.ok(layout.composer && layout.composer.width > 0 && layout.composer.right <= viewport.width + 1, `${viewport.name} composer bounds`);
    return { viewport: `${viewport.width}x${viewport.height}`, canonical: actual, guidedTarget, visibleReply: visibleReply.slice(0, 180), layout, requestLedger };
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  const token = await login('m18-task13-responsive-shared');
  const results = [];
  for (const viewport of viewports) results.push(await checkViewport(browser, viewport, token));
  console.log(JSON.stringify({
    status: 'PASS',
    task: 'TASK13_RESPONSIVE_SAME_BUILD_ACCEPTANCE',
    sourceBuild: { apiBase, webBase },
    viewports: results,
    viewportCount: results.length,
    noHorizontalOverflow: true,
    visibleControlsWithinViewport: true,
    businessWriteExecution: 0,
    externalLlmNetworkCallCount: { observed: false, value: null, source: 'BACKEND_EGRESS_NOT_OBSERVABLE_FROM_BROWSER' },
  }, null, 2));
} finally {
  await browser.close();
}
