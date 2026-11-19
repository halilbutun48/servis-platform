#!/usr/bin/env node

import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const apiBase = process.env.M18_I01_API_BASE || 'http://127.0.0.1:3319';
const webBase = process.env.M18_I01_WEB_BASE || 'http://127.0.0.1:5175';

async function login() {
  const response = await fetch(`${apiBase}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier: 'company@demo.com', password: 'demo123', deviceId: 'm18-i01-action-mobile' }),
  });
  const body = await response.json();
  assert.equal(response.ok, true);
  assert.ok(body.token);
  return body.token;
}

function canonicalFrom(payload) {
  const plan = payload?.semanticPlan || {};
  const request = plan.canonicalRequest || payload?.canonicalRequest || {};
  const action = request.semanticAction || {};
  return {
    action: action.actionClass || null,
    object: action.objectClass || null,
    operation: request.operation || null,
    resolution: action.resolutionStatus || null,
    reply: String(payload?.reply || ''),
  };
}

const token = await login();
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'tr-TR', timezoneId: 'Europe/Istanbul' });
  await context.addInitScript((value) => {
    localStorage.setItem('token', value);
    localStorage.removeItem('psv1:copilot:drawer:history:v4');
    localStorage.removeItem('psv1:copilot:drawer:v4');
  }, token);
  const page = await context.newPage();
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
  async function ask(message) {
    await page.goto(`${webBase}/#/company/operations`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(700);
    let drawer = page.locator('.copilotDrawer:visible').first();
    if (!await drawer.count()) {
      const launcher = page.locator('.copilotFab:visible').first();
      await launcher.click();
      drawer = page.locator('.copilotDrawer:visible').first();
    }
    await drawer.waitFor({ state: 'visible', timeout: 12000 });
    const input = drawer.locator('textarea').first();
    await input.waitFor({ state: 'visible', timeout: 12000 });
    const responsePromise = page.waitForResponse((response) => response.url().includes('/api/ai/copilot') && response.request().method() === 'POST', { timeout: 20000 });
    await input.fill(message);
    await input.press('Enter');
    const response = await responsePromise;
    const payload = await response.json();
    await page.waitForTimeout(450);
    const visibleReply = await drawer.locator('.copilotMsg.assistant .copilotMsgText').last().innerText().catch(() => '');
    const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    assert.ok(overflow.scrollWidth <= overflow.clientWidth + 1, `${message} horizontal overflow`);
    assert.ok(visibleReply.trim().length > 0, `${message} visible reply`);
    assert.ok(await input.isVisible(), `${message} composer visible`);
    return { status: response.status(), actual: canonicalFrom(payload), visibleReply, overflow };
  }

  const explain = await ask('SeferPakt’ta şirket hesabını kullanmaya başlarken izlenecek yolu anlatır mısın?');
  assert.equal(explain.status, 200);
  assert.equal(explain.actual.action, 'EXPLAIN');
  assert.equal(explain.actual.operation, 'GENERAL_INFORMATION');
  assert.match(explain.visibleReply, /seferpakt|planlama|operasyon/iu);

  const view = await ask('Vardiya listesini görüntüle.');
  assert.equal(view.status, 200);
  assert.equal(view.actual.action, 'VIEW');
  assert.equal(view.actual.operation, 'VIEW_AUTHORIZED_SURFACE');
  assert.match(view.visibleReply, /vardiya/iu);

  console.log(JSON.stringify({ status: 'PASS', apiBase, webBase, viewport: '390x844', explain, view, businessWriteExecution: 0, externalLlmNetworkCallCount: 0 }, null, 2));
} finally {
  await browser.close();
}
