#!/usr/bin/env node

import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const apiBase = process.env.M18_BASIC_HELP_API_BASE || 'http://127.0.0.1:3315';
const webBase = process.env.M18_BASIC_HELP_WEB_BASE || 'http://127.0.0.1:5175';
const manualMessage = 'Bana bu programı öğret';

async function login(deviceId = 'm18-basic-help-red') {
  const response = await fetch(`${apiBase}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier: 'company@demo.com', password: 'demo123', deviceId }),
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
    conversationRoute: plan.conversationRoute || payload?.conversationRoute || null,
    questionType: payload?.questionType || null,
    semanticScope: request.semanticScope?.class || null,
    action: action.actionClass || null,
    object: action.objectClass || null,
    operation: request.operation || null,
    capability: request.capability || null,
    resolution: action.resolutionStatus || null,
    clarificationNeed: plan.clarificationNeed || null,
    reply: String(payload?.reply || payload?.summary || ''),
  };
}

async function ask(page, message, route = '/company/operations') {
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

async function askInCurrentDrawer(page, message) {
  const drawer = page.locator('.copilotDrawer:visible').first();
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

const cases = [
  { id: 'GENUINE_OOS', message: '2+2 kaç eder?', expectedFamily: 'OFF_TOPIC_SAFE' },
  { id: 'MANUAL_PRODUCT_HELP', message: manualMessage, expectedFamily: 'GENERIC_PRODUCT_HELP' },
  { id: 'PRODUCT_OVERVIEW', message: 'Bu uygulamanın genel işleyişini anlatır mısın?', expectedFamily: 'GENERIC_PRODUCT_HELP' },
  { id: 'BASIC_USAGE', message: 'Sistemi kullanmaya nasıl başlayacağım?', expectedFamily: 'GENERIC_PRODUCT_HELP' },
  { id: 'BARE_USAGE', message: 'Nasıl kullanirim', expectedFamily: 'GENERIC_PRODUCT_HELP' },
  { id: 'H03_ROLE_HELP', message: 'Okul rolümle sistemde hangi işleri yürütebilirim?', expectedFamily: 'GENERIC_PRODUCT_HELP' },
  { id: 'ROLE_HELP', message: 'Bu rolde ne yapabilirim?', expectedFamily: 'GENERIC_PRODUCT_HELP' },
  { id: 'WHERE_TO_START', message: 'Başlangıç yolunu adım adım gösterebilir misin?', expectedFamily: 'GENERIC_PRODUCT_HELP' },
  { id: 'FIRST_TIME_USER', message: 'İlk kez giriyorum, başlangıç yolunu göster.', expectedFamily: 'GENERIC_PRODUCT_HELP' },
  { id: 'ASSISTANT_CAPABILITIES', message: 'Sefer Abi bana hangi konularda yol gösterebilir?', expectedFamily: 'GENERIC_PRODUCT_HELP' },
  { id: 'STEP_BY_STEP', message: 'Bu programı adım adım anlat.', expectedFamily: 'GENERIC_PRODUCT_HELP' },
  { id: 'CURRENT_SCREEN_HELP', message: 'Bu ekranı nasıl kullanacağım?', expectedFamily: 'SCREEN_CONTEXT' },
  { id: 'ENTITY_CLARIFICATION', message: 'Şu kaydı anlat.', expectedFamily: 'UNCLEAR_OR_AMBIGUOUS' },
  { id: 'AMBIGUOUS_DEICTIC', message: 'Onu anlat.', expectedFamily: 'UNCLEAR_OR_AMBIGUOUS' },
  { id: 'SPECIFIC_WORKFLOW_HELP', message: 'Vardiya oluşturma ekranına nasıl giderim?', expectedFamily: null },
];

const token = await login();
const browser = await chromium.launch({ headless: true });
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
  const requestLedger = [];
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

  const results = [];
  for (const item of cases) {
    const result = await ask(page, item.message, item.route || '/company/operations');
    assert.equal(result.response.status(), 200, `${item.id} response status`);
    if (item.expectedFamily) assert.equal(result.actual.family, item.expectedFamily, `${item.id} semantic family`);
    if (item.expectedFamily === 'GENERIC_PRODUCT_HELP') {
      assert.equal(result.actual.semanticScope, 'PRODUCT_EXPLICIT', `${item.id} semantic scope`);
      assert.equal(result.actual.action, 'EXPLAIN', `${item.id} action`);
      assert.equal(result.actual.object, 'SURFACE', `${item.id} object`);
      assert.equal(result.actual.operation, 'GENERAL_INFORMATION', `${item.id} operation`);
      assert.equal(result.actual.resolution, 'RESOLVED', `${item.id} resolution`);
      assert.ok(result.visibleReply.length >= 80, `${item.id} useful reply`);
      assert.doesNotMatch(result.visibleReply, /hangi kayıt|kayıt türünü|görünen adını|numarasını/iu, `${item.id} must not ask for record identity`);
      assert.match(result.visibleReply, /seferpakt|planlama|vardiya|teklif|sözleşme/iu, `${item.id} grounded product help`);
    }
    if (item.expectedFamily === 'SCREEN_CONTEXT') {
      assert.equal(result.actual.object, 'SURFACE', `${item.id} object`);
      assert.doesNotMatch(result.visibleReply, /hangi kayıt|kayıt türünü|görünen adını|numarasını/iu, `${item.id} must not ask for record identity`);
    }
    if (item.expectedFamily === 'UNCLEAR_OR_AMBIGUOUS') {
      assert.match(result.visibleReply, /hangi kayıt|konuyu kastettiğini|numarasını/iu, `${item.id} real clarification`);
    }
    if (item.expectedFamily === 'OFF_TOPIC_SAFE') {
      assert.equal(result.actual.semanticScope, 'OFF_TOPIC_GENUINE', `${item.id} scope`);
      assert.doesNotMatch(result.visibleReply, /hangi kayıt|kayıt türünü|görünen adını|numarasını/iu, `${item.id} must not enter entity clarification`);
    }
    results.push({ id: item.id, message: item.message, canonical: result.actual, visibleReply: result.visibleReply });
  }

  const multiContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
  });
  const multiToken = await login('m18-basic-help-multiturn');
  await multiContext.addInitScript((value) => {
    localStorage.setItem('token', value);
    localStorage.removeItem('psv1:copilot:drawer:history:v4');
    localStorage.removeItem('psv1:copilot:drawer:v4');
  }, multiToken);
  const multiPage = await multiContext.newPage();
  await multiPage.route('**/api/**', async (route) => {
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
  const clarificationTurn = await ask(multiPage, 'Şu kaydı anlat.');
  assert.equal(clarificationTurn.actual.family, 'UNCLEAR_OR_AMBIGUOUS', 'multi-turn genuine clarification');
  assert.match(clarificationTurn.visibleReply, /hangi kayıt|konuyu kastettiğini|numarasını/iu, 'multi-turn first clarification');
  const helpTurn = await askInCurrentDrawer(multiPage, 'Bu sistemde ilk adımı nasıl atacağımı anlatır mısın?');
  assert.equal(helpTurn.actual.family, 'GENERIC_PRODUCT_HELP', 'new help intent overrides clarification');
  assert.doesNotMatch(helpTurn.visibleReply, /hangi kayıt|kayıt türünü|görünen adını|numarasını/iu, 'new help must override clarification');
  const continuationTurn = await askInCurrentDrawer(multiPage, 'Devamını anlat');
  assert.equal(continuationTurn.actual.action, 'CONTINUE', 'help continuation action');
  assert.equal(continuationTurn.actual.resolution, 'RESOLVED', 'help continuation resolution');
  assert.doesNotMatch(continuationTurn.visibleReply, /hangi kayıt|kayıt türünü|görünen adını|numarasını/iu, 'help continuation must not resurrect clarification');
  assert.ok(continuationTurn.visibleReply.length >= 40, 'help continuation useful reply');
  await multiContext.close();

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileResult = await ask(page, manualMessage);
  const mobileNoHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  assert.equal(mobileResult.actual.family, 'GENERIC_PRODUCT_HELP', 'mobile basic help family');
  assert.ok(mobileResult.visibleReply.length >= 80, 'mobile basic help visible response');
  assert.equal(mobileNoHorizontalOverflow, true, 'mobile basic help has no horizontal overflow');

  const businessWrites = requestLedger.filter(({ method, url }) => (
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
    && !/\/api\/(?:ai\/copilot|auth\/login|health)/iu.test(url)
  ));
  assert.equal(businessWrites.length, 0, 'basic help smoke must not execute business writes');
  console.log(JSON.stringify({
    status: 'PASS',
    sourceRuntime: apiBase,
    caseCount: results.length,
    results,
    multiTurn: {
      clarification: { canonical: clarificationTurn.actual, visibleReply: clarificationTurn.visibleReply },
      helpOverride: { canonical: helpTurn.actual, visibleReply: helpTurn.visibleReply },
      continuation: { canonical: continuationTurn.actual, visibleReply: continuationTurn.visibleReply },
    },
    mobile: { canonical: mobileResult.actual, visibleReply: mobileResult.visibleReply, noHorizontalOverflow: mobileNoHorizontalOverflow },
    requestLedger,
    businessWriteExecution: businessWrites.length,
    externalLlmNetworkCallCount: 0,
  }, null, 2));
} finally {
  await browser.close();
}
