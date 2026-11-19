#!/usr/bin/env node

import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const apiBase = process.env.M18_TASK13_API_BASE || 'http://127.0.0.1:3400';
const webBase = process.env.M18_TASK13_WEB_BASE || 'http://127.0.0.1:5175';

async function login(identifier, deviceId) {
  const response = await fetch(`${apiBase}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier, password: 'demo123', deviceId }),
  });
  const body = await response.json();
  assert.equal(response.ok, true, `login ${identifier} status=${response.status} body=${JSON.stringify(body)}`);
  assert.ok(body.token, `token ${identifier}`);
  return body.token;
}

function canonical(payload) {
  const plan = payload?.semanticPlan || {};
  const request = plan.canonicalRequest || payload?.canonicalRequest || {};
  const action = request.semanticAction || {};
  const authority = plan.canonicalRequestEnvelope?.diagnostics?.semanticAuthority
    || payload?.diagnostics?.semanticAuthority
    || null;
  return {
    family: plan.family || null,
    scope: request.semanticScope?.class || null,
    action: action.actionClass || null,
    object: action.objectClass || null,
    operation: request.operation || null,
    capability: request.capability || null,
    authorization: plan.authorizationDecision?.status || payload?.authorization?.status || null,
    resolution: action.resolutionStatus || null,
    primaryTask: plan.primaryTask || request.primaryTask || null,
    requestedStyle: plan.requestedStyle || request.answerStyle || null,
    styleOnlyRequest: plan.styleOnlyRequest === true,
    authority,
  };
}

function assertNewAuthority(actual, label) {
  assert.equal(actual.authority?.mode, 'NEW', `${label} authority mode`);
  assert.equal(actual.authority?.authoritativePath, 'NEW_TYPED_EVIDENCE', `${label} authority path`);
  assert.equal(actual.authority?.PER_REQUEST_SEMANTIC_AUTHORITY_COUNT, 1, `${label} semantic authority count`);
  assert.equal(actual.authority?.RUNTIME_SEMANTIC_FALLBACK_COUNT, 0, `${label} runtime fallback count`);
  assert.equal(actual.authority?.SHADOW_SEMANTIC_AUTHORITY_COUNT, 0, `${label} shadow authority count`);
  assert.equal(actual.authority?.DUAL_SEMANTIC_AUTHORITY_COUNT, 0, `${label} dual authority count`);
  assert.equal(actual.authority?.DOWNSTREAM_SEMANTIC_REDECISION_COUNT, 0, `${label} downstream redecision count`);
}

async function ask(browser, spec, token) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'tr-TR', timezoneId: 'Europe/Istanbul' });
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
    await page.goto(`${webBase}/#${spec.route}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
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
    await input.fill(spec.message);
    await input.press('Enter');
    const response = await responsePromise;
    const payload = await response.json();
    await page.waitForTimeout(450);
    const actual = canonical(payload);
    assertNewAuthority(actual, spec.id);
    const guidedTarget = payload?.guidedTarget || null;
    const visibleReply = await drawer.locator('.copilotMsg.assistant .copilotMsgText').last().innerText().catch(() => '');
    const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    const businessWrites = requestLedger.filter(({ method, url }) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !/\/api\/(?:ai\/copilot|auth\/login|health)/iu.test(url));
    assert.equal(response.status(), 200, `${spec.id} HTTP status`);
    assert.equal(businessWrites.length, 0, `${spec.id} business writes`);
    assert.ok(overflow.scrollWidth <= overflow.clientWidth + 1, `${spec.id} horizontal overflow`);
    assert.ok(visibleReply.trim(), `${spec.id} visible response`);
    for (const [key, expected] of Object.entries(spec.expected || {})) assert.equal(actual[key], expected, `${spec.id} ${key}`);
    if (spec.replyMustMatch) assert.match(visibleReply, spec.replyMustMatch, `${spec.id} visible grounding`);
    if (spec.noClarification) assert.doesNotMatch(visibleReply, /hangi kayıt|kayıt türünü|görünen adını|numarasını/iu, `${spec.id} unexpected clarification`);
    if (spec.clarification) assert.match(visibleReply, /hangi kayıt|konuyu kastettiğini|numarasını/iu, `${spec.id} clarification`);
    if (spec.requiresGrounding) {
      assert.equal(guidedTarget?.status, 'FOUND', `${spec.id} exact grounded target status`);
      assert.ok(guidedTarget?.targetKey, `${spec.id} exact grounded target identity`);
    }
    return {
      id: spec.id,
      route: spec.route,
      message: spec.message,
      canonical: actual,
      visibleGrounding: { matched: Boolean(spec.replyMustMatch), replyExcerpt: visibleReply.slice(0, 220) },
      guidedTarget,
      overflow,
      requestLedger,
    };
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  const cases = [
    { id: 'ROLE_HELP', identifier: 'company@demo.com', route: '/company/operations', message: 'Bu rolde hangi işlemleri yapabildiğimi özetler misin?', expected: { family: 'ROLE_EXPLANATION_HELP', scope: 'PRODUCT_EXPLICIT', action: 'EXPLAIN', object: 'SURFACE', operation: 'GENERAL_INFORMATION', authorization: 'ALLOW', resolution: 'RESOLVED', primaryTask: 'ROLE_EXPLANATION_HELP', requestedStyle: 'SHORT_SUMMARY', styleOnlyRequest: false }, replyMustMatch: /seferpakt|planlama|vardiya|teklif|sözleşme/iu, noClarification: true },
    { id: 'VIEW', identifier: 'company@demo.com', route: '/company/operations', message: 'Vardiya listesini görüntüle.', expected: { action: 'VIEW', object: 'SHIFT', operation: 'VIEW_AUTHORIZED_SURFACE', authorization: 'ALLOW', resolution: 'RESOLVED' }, replyMustMatch: /vardiya/iu, requiresGrounding: true },
    { id: 'NAVIGATE', identifier: 'company@demo.com', route: '/company/operations', message: 'Sözleşmeler sayfasına geçelim.', expected: { action: 'NAVIGATE', object: 'SURFACE', operation: 'NAVIGATE_AUTHORIZED_SURFACE', authorization: 'ALLOW', resolution: 'RESOLVED' }, replyMustMatch: /sözleşme/iu, requiresGrounding: true },
    { id: 'GUIDED_SHOW', identifier: 'company@demo.com', route: '/company/operations', message: 'Vardiya ekranını göster.', expected: { action: 'VIEW', object: 'SHIFT', operation: 'VIEW_AUTHORIZED_SURFACE', authorization: 'ALLOW', resolution: 'RESOLVED' }, replyMustMatch: /vardiya/iu, requiresGrounding: true },
    { id: 'TRUE_CLARIFICATION', identifier: 'room@demo.com', route: '/room/shifts', message: 'Şu kaydı anlat.', expected: { family: 'UNCLEAR_OR_AMBIGUOUS', scope: 'PRODUCT_AMBIGUOUS', action: 'NONE', resolution: 'UNRESOLVED' }, clarification: true },
    { id: 'GENUINE_OOS', identifier: 'company@demo.com', route: '/company/operations', message: '2+2 kaç eder?', expected: { family: 'OFF_TOPIC_SAFE', scope: 'OFF_TOPIC_GENUINE', action: 'NONE', resolution: 'NOT_APPLICABLE' }, noClarification: true },
  ];
  const companyToken = await login('company@demo.com', 'm18-task13-browser-company-shared');
  const roomToken = await login('room@demo.com', 'm18-task13-browser-room-shared');
  const results = [];
  for (const spec of cases) results.push(await ask(browser, spec, spec.identifier === 'room@demo.com' ? roomToken : companyToken));
  console.log(JSON.stringify({
    status: 'PASS',
    task: 'TASK12_BROWSER_VISIBLE_GROUNDING_ACCEPTANCE',
    sourceBuild: { apiBase, webBase },
    results,
    semanticVisibleAgreement: 'PASS',
    realGroundingEvidence: 'GUIDED_TARGET_FOUND_AND_VISIBLE_REPLY_AGREEMENT',
    businessWriteExecution: 0,
    externalLlmNetworkCallCount: { observed: false, value: null, source: 'BACKEND_EGRESS_NOT_OBSERVABLE_FROM_BROWSER' },
  }, null, 2));
} finally {
  await browser.close();
}
