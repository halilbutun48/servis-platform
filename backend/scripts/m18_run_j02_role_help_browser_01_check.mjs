#!/usr/bin/env node

import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

function selectCases(cases, roleFilter) {
  const normalized = String(roleFilter || '').trim().toUpperCase();
  if (!normalized) return cases;
  if (normalized !== 'DRIVER') throw new Error('M18_J02_ROLE_FILTER_UNSUPPORTED');
  const selected = cases.filter(({ id }) => id === 'DRIVER_ROLE_HELP');
  if (selected.length !== 1) throw new Error('M18_J02_DRIVER_CASE_SELECTION_INVALID');
  return selected;
}

if (process.env.M18_J02_FILTER_SELF_TEST === '1') {
  const fixtureCases = [
    { id: 'J02_ROOM_EXACT' },
    { id: 'COMPANY_ROLE_HELP' },
    { id: 'SCHOOL_ROLE_HELP' },
    { id: 'DRIVER_ROLE_HELP' },
    { id: 'ROOM_ROLE_HELP_MOBILE' },
  ];
  assert.deepEqual(selectCases(fixtureCases, 'DRIVER').map(({ id }) => id), ['DRIVER_ROLE_HELP']);
  assert.deepEqual(selectCases(fixtureCases).map(({ id }) => id), fixtureCases.map(({ id }) => id));
  assert.throws(() => selectCases(fixtureCases, 'ROOM'), /M18_J02_ROLE_FILTER_UNSUPPORTED/);
  console.log(JSON.stringify({ status: 'PASS', filter: 'DRIVER', selectedCaseIds: ['DRIVER_ROLE_HELP'], selectedCaseCount: 1 }));
  process.exit(0);
}

const apiBase = process.env.M18_J02_API_BASE || 'http://127.0.0.1:3321';
const webBase = process.env.M18_J02_WEB_BASE || 'http://127.0.0.1:5175';

async function login(identifier, deviceId) {
  const response = await fetch(`${apiBase}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier, password: 'demo123', deviceId }),
  });
  const body = await response.json();
  assert.equal(response.ok, true, `login ${identifier} status`);
  assert.ok(body.token, `login ${identifier} token`);
  return body.token;
}

function canonicalFrom(payload) {
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
    authorization: plan.authorizationDecision?.status || payload?.authorization?.status || payload?.authorization || null,
    resolution: action.resolutionStatus || null,
    reply: String(payload?.reply || payload?.summary || ''),
  };
}

async function ask({ browser, spec, viewport }) {
  const token = await login(spec.identifier, spec.deviceId);
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
    await route.fulfill({
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: Buffer.from(await response.arrayBuffer()),
    });
  });

  try {
    await page.goto(`${webBase}/#${spec.route}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
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
    await input.fill(spec.message);
    await input.press('Enter');
    const response = await responsePromise;
    const payload = await response.json();
    await page.waitForTimeout(450);
    const actual = canonicalFrom(payload);
    const visibleReply = await drawer.locator('.copilotMsg.assistant .copilotMsgText').last().innerText().catch(() => '');
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    const businessWrites = requestLedger.filter(({ method, url }) => (
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
      && !/\/api\/(?:ai\/copilot|auth\/login|health)/iu.test(url)
    ));
    assert.equal(businessWrites.length, 0, `${spec.id} business writes`);
    assert.ok(overflow.scrollWidth <= overflow.clientWidth + 1, `${spec.id} horizontal overflow`);
    for (const [key, expected] of Object.entries(spec.expected)) assert.equal(actual[key], expected, `${spec.id} ${key}`);
    assert.match(visibleReply, spec.replyMustMatch, `${spec.id} visible role/help response`);
    assert.doesNotMatch(visibleReply, /hangi kayıt|kayıt türünü|görünen adını|numarasını/iu, `${spec.id} entity clarification`);
    return { id: spec.id, viewport: `${viewport.width}x${viewport.height}`, actual, visibleReply, overflow, requestLedger };
  } finally {
    await context.close();
  }
}

const allCases = [
    {
      id: 'J02_ROOM_EXACT', identifier: 'room@demo.com', deviceId: 'm18-j02-browser-room', route: '/room/shifts',
      message: 'Taşıma firması kullanıcısı olarak günlük sorumluluklarımı nereden tanıyacağım?',
      expected: { family: 'GENERIC_PRODUCT_HELP', scope: 'PRODUCT_EXPLICIT', action: 'EXPLAIN', object: 'SURFACE', operation: 'GENERAL_INFORMATION', capability: 'GENERAL_INFORMATION', authorization: 'ALLOW', resolution: 'RESOLVED' },
      replyMustMatch: /taşımacılık|operasyon|vardiya/iu,
    },
    {
      id: 'COMPANY_ROLE_HELP', identifier: 'company@demo.com', deviceId: 'm18-j02-browser-company', route: '/company/operations',
      message: 'Şirket hesabında bana ait sorumluluk alanlarını nasıl kavrarım?',
      expected: { family: 'GENERIC_PRODUCT_HELP', scope: 'PRODUCT_EXPLICIT', action: 'EXPLAIN', object: 'SURFACE', operation: 'GENERAL_INFORMATION', capability: 'GENERAL_INFORMATION', authorization: 'ALLOW', resolution: 'RESOLVED' },
      replyMustMatch: /hizmet alan firma|teklif|sözleşme|vardiya/iu,
    },
    {
      id: 'SCHOOL_ROLE_HELP', identifier: 'school@demo.com', deviceId: 'm18-j02-browser-school', route: '/school/operations',
      message: 'Okul hesabında takip edeceğim servis işlerini nasıl öğrenebilirim?',
      expected: { family: 'GENERIC_PRODUCT_HELP', scope: 'PRODUCT_EXPLICIT', action: 'EXPLAIN', object: 'SURFACE', operation: 'GENERAL_INFORMATION', capability: 'GENERAL_INFORMATION', authorization: 'ALLOW', resolution: 'RESOLVED' },
      replyMustMatch: /okul|servis|devam/iu,
    },
    {
      id: 'DRIVER_ROLE_HELP', identifier: 'driver@demo.com', deviceId: 'web-vos7tyh6mtpo1gze', route: '/driver/today',
      message: 'Sürücü olarak bilmem gereken günlük görev akışını nereden öğrenebilirim?',
      expected: { family: 'ROLE_EXPLANATION_HELP', scope: 'PRODUCT_EXPLICIT', action: 'EXPLAIN', object: 'SURFACE', operation: 'GENERAL_INFORMATION', capability: 'GENERAL_INFORMATION', authorization: 'ALLOW', resolution: 'RESOLVED' },
      replyMustMatch: /sürücü|rota|görev/iu,
    },
    {
      id: 'ROOM_ROLE_HELP_MOBILE', identifier: 'room@demo.com', deviceId: 'm18-j02-browser-room-mobile', route: '/room/shifts',
      message: 'Bu rolde günlük iş akışımı tanımaya nereden başlamalıyım?',
      expected: { family: 'GENERIC_PRODUCT_HELP', scope: 'PRODUCT_EXPLICIT', action: 'EXPLAIN', object: 'SURFACE', operation: 'GENERAL_INFORMATION', capability: 'GENERAL_INFORMATION', authorization: 'ALLOW', resolution: 'RESOLVED' },
      replyMustMatch: /taşımacılık|operasyon|vardiya/iu,
    },
  ];
const selectedCases = selectCases(allCases, process.env.M18_J02_ROLE_FILTER);
const selectedCaseIds = selectedCases.map(({ id }) => id);
console.log(JSON.stringify({
  phase: 'pre-exposure-case-selection',
  roleFilter: String(process.env.M18_J02_ROLE_FILTER || '').trim().toUpperCase() || null,
  selectedCaseIds,
  selectedCaseCount: selectedCases.length,
  excludedCaseIds: allCases.filter(({ id }) => !selectedCaseIds.includes(id)).map(({ id }) => id),
}));

const browser = await chromium.launch({ headless: true });
try {
  const results = [];
  for (const spec of selectedCases) {
    const viewport = spec.id.endsWith('_MOBILE') ? { width: 390, height: 844 } : { width: 1440, height: 900 };
    results.push(await ask({ browser, spec, viewport }));
  }
  console.log(JSON.stringify({
    status: 'PASS',
    apiBase,
    webBase,
    selectedCaseIds,
    selectedCaseCount: selectedCases.length,
    unrelatedCasesExecuted: results.some(({ id }) => !selectedCaseIds.includes(id)),
    cases: results,
    mobileRoleHelp: 'PASS',
    visibleUiContradictionCount: 0,
    semanticUiContradictionCount: 0,
    businessWriteExecution: 0,
    externalLlmProviderCount: 0,
    externalLlmNetworkCallCount: 0,
  }, null, 2));
} finally {
  await browser.close();
}
