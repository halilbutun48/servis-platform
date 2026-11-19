#!/usr/bin/env node

import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveCanonicalConversationRequest } from '../src/ai/chat/canonicalSemanticRequest.js';
import { resolveSemanticIntent } from '../src/ai/chat/semanticIntentPlanner.js';
import { buildSelectedShiftContinuationGuidance } from '../src/ai/service.js';
import {
  classifyReadOnlyBrowserRequest,
  createReadOnlyBrowserRequestLedger,
  evaluateRuntimeFreshnessProof,
  resolveAcceptanceViewport,
} from './lib/pre_18_authenticated_role_context.mjs';
import { verifyProvenanceReceipt } from './lib/m18RunScopedProvenance.mjs';

function selectContinuationProfile(role = process.env.M18_CONTINUATION_ROLE || 'COMPANY') {
  const normalized = String(role || '').trim().toUpperCase();
  const profiles = {
    COMPANY: {
      role: 'COMPANY',
      identifier: 'company@demo.com',
      route: '/company',
      initialPrompt: 'Ben vardiya oluşturmak istiyorum',
    },
    ROOM: {
      role: 'ROOM',
      identifier: 'room@demo.com',
      route: '/room/shifts',
      authMode: 'TOKEN',
      initialPrompt: 'Taşıma firması kullanıcısı olarak günlük sorumluluklarımı nereden tanıyacağım?',
    },
    ROOM_OFFER: {
      role: 'ROOM',
      identifier: 'room@demo.com',
      route: '/room',
      authMode: 'TOKEN',
      workflow: 'OFFER',
      initialPrompt: 'Tekliflerimi görmek istiyorum.',
    },
    DRIVER: {
      role: 'DRIVER',
      identifier: 'driver@demo.com',
      deviceId: 'web-vos7tyh6mtpo1gze',
      route: '/driver/today',
      authMode: 'TOKEN',
      initialPrompt: 'Sürücü olarak günlük rota akışımı adım adım nasıl takip ederim?',
    },
  };
  const profile = profiles[normalized];
  if (!profile) throw new Error('M18_CONTINUATION_ROLE_UNSUPPORTED');
  return profile;
}

function runSemanticSelfTest() {
  const user = { id: 4, role: 'DRIVER', companyId: 1, roomId: 1, companyKind: 'DEMO' };
  const screenContext = { path: '/driver/today', label: 'Bugün', role: 'DRIVER', uiHints: { visibleButtons: [], activeTabs: [] } };
  const initialMessage = 'Sürücü olarak günlük rota akışımı adım adım nasıl takip ederim?';
  const initialRequest = resolveCanonicalConversationRequest({ message: initialMessage, user, screenContext });
  const initialPlan = resolveSemanticIntent({ message: initialMessage, user, screenContext, canonicalRequest: initialRequest });
  assert.equal(initialPlan.family, 'ROLE_EXPLANATION_HELP', 'DRIVER role explanation remains canonical');
  assert.equal(initialPlan.clarificationNeed, null, 'initial DRIVER role explanation is not ambiguous');
  const state = {
    productContext: { semanticPlan: initialPlan },
    lastSettledResult: { semanticPlan: initialPlan },
    authorizedProductContext: { semanticPlan: initialPlan },
    lastProductSemanticPlan: initialPlan,
    productTeachingState: { subject: 'PRODUCT_TEACHING', sectionIndex: 1, totalSections: 4, sectionKey: 'ROLE_CAPABILITIES', role: 'DRIVER', completed: false },
    recentMessages: [
      { role: 'user', text: initialMessage },
      { role: 'assistant', text: 'Sürücü rolü açıklaması', semanticPlan: initialPlan },
    ],
  };
  const stepMessage = 'Adım adım anlat';
  const stepRequest = resolveCanonicalConversationRequest({ message: stepMessage, user, screenContext, conversationState: state });
  const stepPlan = resolveSemanticIntent({ message: stepMessage, user, screenContext, conversationState: state, canonicalRequest: stepRequest });
  assert.equal(stepPlan.family, 'CONTINUE_CURRENT_REASONING', 'step-by-step follow-up continues the server-owned teaching state');
  assert.equal(stepPlan.continuationAction, 'EXPAND', 'step-by-step follow-up expands the teaching state');
  assert.equal(stepPlan.clarificationNeed, null, 'step-by-step follow-up does not request a domain clarification');
  const backMessage = 'Geri.';
  const backRequest = resolveCanonicalConversationRequest({ message: backMessage, user, screenContext, conversationState: { ...state, productTeachingState: { ...state.productTeachingState, sectionIndex: 3 } } });
  const backPlan = resolveSemanticIntent({ message: backMessage, user, screenContext, conversationState: { ...state, productTeachingState: { ...state.productTeachingState, sectionIndex: 3 } }, canonicalRequest: backRequest });
  assert.equal(backPlan.family, 'CONTINUE_CURRENT_REASONING', 'BACK remains a teaching-state presentation transition');
  assert.equal(backPlan.continuationAction, 'BACK', 'BACK keeps its canonical direction');
  assert.equal(backPlan.clarificationNeed, null, 'BACK does not lose the teaching context');
  const shiftWalkthrough = buildSelectedShiftContinuationGuidance({ shiftId: 214, targetLabel: 'Vardiya #214 ayrıntıları', action: 'CONTINUE', depth: 1 });
  assert.match(shiftWalkthrough.reply, /1\. .*ayrıntıları.*2\. Durum.*3\. Durak\/rota.*4\. Operasyon kanıtı/iu, 'selected shift walkthrough exposes the ordered read-only steps');
  const shiftNext = buildSelectedShiftContinuationGuidance({ shiftId: 214, targetLabel: 'Vardiya #214 ayrıntıları', action: 'CONTINUE', depth: 2 });
  assert.match(shiftNext.reply, /2\. Durum.*araç\/sürücü/iu, 'selected shift continuation advances to the next concrete step');
  const shiftBack = buildSelectedShiftContinuationGuidance({ shiftId: 214, targetLabel: 'Vardiya #214 ayrıntıları', action: 'BACK', depth: 2 });
  assert.match(shiftBack.reply, /önceki güvenli adım.*1\./iu, 'selected shift BACK returns to the previous concrete step');
  const shiftRecover = buildSelectedShiftContinuationGuidance({ shiftId: 214, targetLabel: 'Vardiya #214 ayrıntıları', action: 'RECOVER', depth: 2 });
  assert.match(shiftRecover.reply, /Bulamadığın adım.*2\./iu, 'selected shift recovery keeps the current concrete step and target');
  console.log(JSON.stringify({ status: 'PASS', initialFamily: initialPlan.family, stepFamily: stepPlan.family, stepAction: stepPlan.continuationAction, backAction: backPlan.continuationAction }));
}

if (process.env.M18_CONTINUATION_SEMANTIC_SELF_TEST === '1') {
  runSemanticSelfTest();
  process.exit(0);
}

if (process.env.M18_CONTINUATION_PROFILE_SELF_TEST === '1') {
  const company = selectContinuationProfile('COMPANY');
  const driver = selectContinuationProfile('DRIVER');
  const room = selectContinuationProfile('ROOM');
  if (company.identifier !== 'company@demo.com' || company.route !== '/company') throw new Error('COMPANY_PROFILE_REGRESSION');
  if (driver.identifier !== 'driver@demo.com' || driver.route !== '/driver/today' || driver.deviceId !== 'web-vos7tyh6mtpo1gze') {
    throw new Error('DRIVER_PROFILE_REGRESSION');
  }
  if (room.identifier !== 'room@demo.com' || room.route !== '/room/shifts' || room.authMode !== 'TOKEN') throw new Error('ROOM_PROFILE_REGRESSION');
  if (selectContinuationProfile().role !== 'COMPANY') throw new Error('DEFAULT_COMPANY_PROFILE_REGRESSION');
  console.log(JSON.stringify({ status: 'PASS', profiles: ['COMPANY', 'DRIVER', 'ROOM'], defaultRole: 'COMPANY' }));
  process.exit(0);
}

const webBaseUrl = (process.env.WEB_BASE_URL || 'http://127.0.0.1:5173').replace(/\/$/u, '');
const apiBaseUrl = (process.env.M18_CONTINUATION_API_BASE || 'http://127.0.0.1:3000').replace(/\/$/u, '');
const profile = selectContinuationProfile();
const viewport = resolveAcceptanceViewport(process.env.M18_CONTINUATION_VIEWPORT || 'desktop');
if (!viewport.safe) throw new Error(`M18_CONTINUATION_VIEWPORT_UNSUPPORTED:${viewport.name}`);

function loadRuntimeFreshnessProof() {
  const receiptPath = String(process.env.M18_RUNTIME_PROVENANCE_RECEIPT_PATH || '').trim();
  if (!receiptPath) return { safe: false, failureReasons: ['RUNTIME_PROVENANCE_RECEIPT_PATH_REQUIRED'] };
  let receipt;
  try {
    receipt = JSON.parse(readFileSync(resolve(receiptPath), 'utf8'));
  } catch (error) {
    return { safe: false, failureReasons: [`RUNTIME_PROVENANCE_RECEIPT_READ_FAILED:${error.code || 'INVALID_JSON'}`] };
  }
  const verification = verifyProvenanceReceipt({
    receiptBytes: receipt,
    expectedRunId: receipt.runId,
    expectedStartSha256: receipt.startManifestSha256,
    expectedEndSha256: receipt.endManifestSha256,
  });
  const freshness = evaluateRuntimeFreshnessProof({ receiptVerified: verification.safe, receipt });
  return {
    ...freshness,
    receiptVerified: verification.safe,
    receiptFailureReasons: verification.failureReasons || [],
  };
}

const runtimeFreshness = loadRuntimeFreshnessProof();
if (!runtimeFreshness.safe) {
  console.log(JSON.stringify({
    CONTINUATION_BROWSER_SMOKE: 'BLOCKED',
    LIVE_ACCEPTANCE: 'SOURCE_GREEN_LIVE_NOT_PROVEN',
    RUNTIME_FRESHNESS: runtimeFreshness,
    VIEWPORT: { name: viewport.name, width: viewport.width, height: viewport.height },
  }, null, 2));
  process.exitCode = 2;
  process.exit();
}
const browser = await chromium.launch({ headless: true });
const requestLedger = createReadOnlyBrowserRequestLedger();
const rows = [];

async function canonicalLogin(selectedProfile) {
  const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier: selectedProfile.identifier, password: 'demo123', deviceId: selectedProfile.deviceId }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.token) throw new Error('M18_CONTINUATION_DRIVER_LOGIN_FAILED');
  return payload.token;
}

function compact(payload) {
  const plan = payload?.semanticPlan || {};
  const request = plan.canonicalRequest || payload?.canonicalRequest || {};
  const action = request.semanticAction || {};
  return {
    family: plan.family || null,
    workflowIntent: plan.workflowIntent || plan.continuationBasePlan?.workflowIntent || null,
    continuationAction: plan.continuationAction || request.continuationAction || null,
    action: action.actionClass || null,
    object: action.objectClass || null,
    operation: request.operation || null,
    clarification: plan.clarificationNeed || null,
    target: payload?.guidedTarget?.status || null,
    teachingState: payload?.teachingState ? {
      sectionIndex: Number.isInteger(payload.teachingState.sectionIndex) ? payload.teachingState.sectionIndex : null,
      sectionKey: payload.teachingState.sectionKey || null,
      totalSections: Number.isInteger(payload.teachingState.totalSections) ? payload.teachingState.totalSections : null,
    } : null,
    reply: String(payload?.reply || '').slice(0, 240),
  };
}

const context = await browser.newContext({
  viewport: { width: viewport.width, height: viewport.height },
  locale: 'tr-TR',
  timezoneId: 'Europe/Istanbul',
  ignoreHTTPSErrors: webBaseUrl.startsWith('https://'),
});
if (profile.authMode === 'TOKEN') {
  const token = await canonicalLogin(profile);
  await context.addInitScript(({ accessToken, deviceId }) => {
    localStorage.setItem('token', accessToken);
    localStorage.setItem('personel_servis_browser_device_id', deviceId);
    localStorage.removeItem('psv1:copilot:drawer:history:v4');
    localStorage.removeItem('psv1:copilot:drawer:v4');
  }, { accessToken: token, deviceId: profile.deviceId });
}
const page = await context.newPage();
await page.route('**/*', async (route) => {
  const request = route.request();
  const classification = classifyReadOnlyBrowserRequest({ method: request.method(), url: request.url() });
  requestLedger.record({ method: request.method(), url: request.url(), blocked: classification.isBusinessMutation });
  if (classification.isBusinessMutation) {
    await route.abort();
    return;
  }
  await route.continue();
});

async function ask(input) {
  const drawer = page.locator('.copilotDrawer:visible').first();
  const textarea = drawer.locator('textarea').first();
  const responsePromise = page.waitForResponse((response) => response.url().includes('/api/ai/copilot') && response.request().method() === 'POST', { timeout: 30000 });
  await textarea.fill(input);
  await textarea.press('Enter');
  const response = await responsePromise;
  const payload = await response.json().catch(() => ({}));
  const visibleReply = await drawer.locator('.copilotMsg.assistant .copilotMsgText').last().innerText().catch(() => '');
  const row = { input, httpStatus: response.status(), actual: compact(payload), visibleReply };
  rows.push(row);
  return row;
}

async function askBatch(page, input, scenarioRows) {
  await page.waitForTimeout(1100);
  const drawer = page.locator('.copilotDrawer:visible').first();
  const textarea = drawer.locator('textarea').first();
  const responsePromise = page.waitForResponse((response) => response.url().includes('/api/ai/copilot') && response.request().method() === 'POST', { timeout: 30000 });
  await textarea.fill(input);
  await textarea.press('Enter');
  const response = await responsePromise;
  const payload = await response.json().catch(() => ({}));
  const visibleReply = await drawer.locator('.copilotMsg.assistant .copilotMsgText').last().innerText().catch(() => '');
  const row = {
    input,
    httpStatus: response.status(),
    actual: compact(payload),
    visibleReply,
    guidedTarget: payload?.guidedTarget || null,
    requestScreenContext: response.request().postDataJSON()?.screenContext || null,
  };
  scenarioRows.push(row);
  return row;
}

async function openBatchDrawer(page) {
  const existing = page.locator('.copilotDrawer:visible').first();
  if (await existing.count()) {
    await existing.locator('button[aria-label="Kapat"]').click().catch(() => {});
  }
  await page.locator('.copilotFab:visible').first().click();
  const drawer = page.locator('.copilotDrawer:visible').first();
  await drawer.waitFor({ state: 'visible', timeout: 10000 });
  return drawer;
}

async function navigateBatchSurface(page, route) {
  await page.goto(`${webBaseUrl}/#${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1400);
  const identifier = page.locator('input[autocomplete="username"]');
  if (await identifier.count()) throw new Error(`M18_ROOM_BATCH_AUTH_NOT_READY:${route}`);
}

async function resetBatchConversation(page) {
  await page.evaluate(() => {
    localStorage.removeItem('psv1:copilot:drawer:history:v4');
    localStorage.removeItem('psv1:copilot:drawer:v4');
    // The shared copilot envelope survives route changes and previously
    // carried the prior scenario's selected-record/semantic plan into the
    // Operation Health scenario.  A batch scenario is an independent
    // acceptance session: preserve auth, clear only copilot conversation
    // state and the in-memory selection mirror.
    localStorage.removeItem('psv1:copilot:shared-state:v1');
    sessionStorage.clear();
    window.__psv1CopilotSelection = null;
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  const leakedState = await page.evaluate(() => ({
    sharedState: localStorage.getItem('psv1:copilot:shared-state:v1'),
    selection: window.__psv1CopilotSelection || null,
  }));
  if (leakedState.sharedState || leakedState.selection) {
    throw new Error('M18_ROOM_BATCH_SESSION_ISOLATION_FAILED');
  }
}

async function runRoomProvenanceBatch(page) {
  const roomRows = [];
  const roomToken = await canonicalLogin({ identifier: 'room@demo.com' });
  await context.addInitScript(({ accessToken }) => {
    localStorage.setItem('token', accessToken);
    localStorage.removeItem('psv1:copilot:drawer:history:v4');
    localStorage.removeItem('psv1:copilot:drawer:v4');
  }, { accessToken: roomToken });

  const scenario = async (id, route, prepare, messages, validate) => {
    const rows = [];
    try {
      await navigateBatchSurface(page, route);
      await resetBatchConversation(page);
      if (prepare) await prepare(page);
      const bodyText = await page.locator('body').innerText();
      if (typeof validate === 'function') validate({ bodyText, rows: [], phase: 'surface' });
      await openBatchDrawer(page);
      for (const message of messages) await askBatch(page, message, rows);
      const result = {
        id,
        route,
        rows,
        visibleSurface: bodyText.slice(0, 5000),
        pass: rows.every((row) => row.httpStatus === 200 && row.visibleReply && row.actual.target !== 'UNAUTHORIZED')
          && (typeof validate === 'function' ? validate({ bodyText, rows, phase: 'answers' }) : true),
      };
      roomRows.push(result);
      return result;
    } catch (error) {
      const result = {
        id,
        route,
        rows,
        visibleSurface: '',
        pass: false,
        blocked: true,
        failure: error instanceof Error ? error.message : String(error),
      };
      roomRows.push(result);
      return result;
    }
  };

  await scenario(
    'ROOM_SHIFT_168_PASSENGER_COUNT',
    '/room/shifts',
    async (currentPage) => {
      await currentPage.evaluate(() => localStorage.setItem('room:focusShiftId', '168'));
      await currentPage.reload({ waitUntil: 'domcontentloaded' });
      await currentPage.waitForTimeout(1400);
      if (!(await currentPage.locator('body').innerText()).match(/\b168\b/u)) throw new Error('M18_ROOM_BATCH_SHIFT_168_NOT_VISIBLE');
    },
    ['Bu vardiyanın kaç yolcusu var?'],
    ({ rows, phase }) => phase === 'surface' || (
      rows.length > 0
      && /18/.test(rows[0].actual.reply)
      && /yolcu/iu.test(rows[0].actual.reply)
      && !/durak|rota/iu.test(rows[0].actual.reply)
    ),
  );

  await scenario(
    'ROOM_OFFER_37_RECORD_CONTEXT',
    '/room/offers?offerId=37',
    async (currentPage) => {
      const body = await currentPage.locator('body').innerText();
      if (!/\b37\b/u.test(body)) throw new Error('M18_ROOM_BATCH_OFFER_37_NOT_VISIBLE');
    },
    ['Teklif 37\'yi göster', 'Bu teklifin ayrıntılarını anlat', 'Hangi vardiyaya ait?'],
    ({ rows, phase }) => phase === 'surface' || (
      rows.length === 3
      && rows.every((row) => /DemoCompany|37|Karşı|COUNTERED|210/iu.test(`${row.actual.reply} ${row.visibleReply}`))
      && rows.every((row) => !/Shift 168|Vardiya #168/iu.test(`${row.actual.reply} ${row.visibleReply}`))
    ),
  );

  await scenario(
    'ROOM_DRIVER_ONE_RECORD_CONTEXT',
    '/room/drivers',
    async (currentPage) => {
      const query = currentPage.locator('input[placeholder*="Ali / 05xx / 34ABC"]');
      await query.fill('Driver One');
      await currentPage.waitForTimeout(500);
      const row = currentPage.locator('tbody tr').filter({ hasText: /Driver One|34ABC123/iu }).first();
      if (!(await row.count())) throw new Error('M18_ROOM_BATCH_DRIVER_ONE_NOT_VISIBLE');
      await row.click();
      await currentPage.waitForTimeout(350);
    },
    ['Seçili sürücünün durumu ve bağlı aracını açıkla'],
    ({ rows, phase }) => phase === 'surface' || (
      rows.length > 0
      && /34ABC123/iu.test(`${rows[0].actual.reply} ${rows[0].visibleReply}`)
      && !/yetkisiz|kayıt bulunamadı|bulunamadı/iu.test(`${rows[0].actual.reply} ${rows[0].visibleReply}`)
    ),
  );

  await scenario(
    'ROOM_OPERATION_HEALTH_OPEN_ISSUES',
    '/room/operation-health',
    null,
    ['Bu ekrandaki açık sorunları açıkla'],
    ({ rows, phase }) => phase === 'surface' || (
      rows.length > 0
      && /açık sorun|risk|GPS|sürücü/iu.test(`${rows[0].actual.reply} ${rows[0].visibleReply}`)
      && !/genel yardım|hangi ekranda|rolün/iu.test(`${rows[0].actual.reply} ${rows[0].visibleReply}`)
    ),
  );

  await scenario(
    'ROOM_COMMERCIAL_FLOW_VISIBLE_RECORDS',
    '/room/commercial-flow',
    null,
    ['Görünen sözleşme, vardiya ve teklif kayıtlarını açıkla'],
    ({ rows, phase }) => phase === 'surface' || (
      rows.length > 0
      && /sözleşme|vardiya|teklif|kayıt/iu.test(`${rows[0].actual.reply} ${rows[0].visibleReply}`)
      && !/genel yardım|hangi ekranda|rolün/iu.test(`${rows[0].actual.reply} ${rows[0].visibleReply}`)
    ),
  );

  const ledger = requestLedger.snapshot();
  return {
    status: roomRows.every((row) => row.pass) && ledger.businessMutationAttemptCount === 0 ? 'GREEN' : 'RED',
    rows: roomRows,
    businessMutation: ledger,
  };
}

if (process.env.M18_ACCEPTANCE_BATCH === 'ROOM_PROVENANCE') {
  try {
    const batch = await runRoomProvenanceBatch(page);
    console.log(JSON.stringify({
      ROOM_PROVENANCE_BROWSER_BATCH: batch.status,
      RUNTIME_FRESHNESS: runtimeFreshness,
      ...batch,
      BUSINESS_WRITE_EXECUTION: batch.businessMutation.businessMutationExecutionCount,
    }, null, 2));
    process.exitCode = batch.status === 'GREEN' ? 0 : 1;
  } finally {
    await context.close();
    await browser.close();
  }
  process.exit();
}

try {
  await page.goto(`${webBaseUrl}/#${profile.route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (profile.role === 'COMPANY') {
    const identifier = page.locator('input[autocomplete="username"]');
    if (await identifier.count()) {
      await identifier.fill(profile.identifier);
      await page.locator('input[autocomplete="current-password"]').fill('demo123');
      await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
      await page.waitForFunction(() => !document.querySelector('input[autocomplete="username"]'), null, { timeout: 30000 });
    }
  }
  await page.waitForTimeout(1400);
  await page.locator('.copilotFab:visible').first().click();
  await page.locator('.copilotDrawer:visible').first().waitFor({ state: 'visible', timeout: 10000 });
  await ask(profile.initialPrompt);
  await ask('Adım adım anlat');
  await ask('Devam.');
  await ask('Geri.');
  await ask('Bulamadım.');
  const byInput = new Map(rows.map((row) => [row.input, row]));
  const continueRow = byInput.get('Devam.');
  const backRow = byInput.get('Geri.');
  const recoverRow = byInput.get('Bulamadım.');
  const semanticFailures = [
    !continueRow || continueRow.actual.family !== 'CONTINUE_CURRENT_REASONING' || continueRow.actual.action !== 'CONTINUE',
    !backRow || backRow.actual.family !== 'CONTINUE_CURRENT_REASONING' || backRow.actual.continuationAction !== 'BACK'
      || /\d+\. devam açıklaması/iu.test(String(backRow.actual.reply || ''))
      || !Number.isInteger(continueRow?.actual.teachingState?.sectionIndex)
      || !Number.isInteger(backRow?.actual.teachingState?.sectionIndex)
      || backRow.actual.teachingState.sectionIndex >= continueRow.actual.teachingState.sectionIndex,
    !recoverRow || !['CONTINUE_CURRENT_REASONING', 'EXPLAIN_CURRENT_TARGET', 'UI_GUIDANCE'].includes(String(recoverRow.actual.family || ''))
      || recoverRow.actual.continuationAction !== 'RECOVER'
      || /\d+\. devam açıklaması/iu.test(String(recoverRow.actual.reply || '')),
    profile.workflow === 'OFFER' && (
      !byInput.get('Adım adım anlat')
      || byInput.get('Adım adım anlat').actual.family !== 'CONTINUE_CURRENT_REASONING'
      || byInput.get('Adım adım anlat').actual.continuationAction !== 'EXPAND'
      || !/Teklif/iu.test(String(byInput.get('Adım adım anlat').actual.reply || ''))
    ),
  ].filter(Boolean).length;
  const bad = rows.filter((row) => row.httpStatus !== 200 || row.actual.clarification || !row.actual.reply || !row.visibleReply || row.actual.target === 'UNAUTHORIZED');
  const requestSummary = requestLedger.snapshot();
  console.log(JSON.stringify({
    CONTINUATION_BROWSER_SMOKE: bad.length || semanticFailures || requestSummary.businessMutationAttemptCount ? 'RED' : 'GREEN',
    ROLE: profile.role,
    DRIVER_DEVICE_BOUND_LOGIN: profile.role === 'DRIVER',
    API_BASE_URL: apiBaseUrl,
    WEB_BASE_URL: webBaseUrl,
    RUNTIME_FRESHNESS: {
      receiptVerified: runtimeFreshness.receiptVerified,
      runtimeKind: runtimeFreshness.runtimeKind,
      port: runtimeFreshness.port,
      sourceManifestSha256: runtimeFreshness.sourceManifestSha256,
    },
    VIEWPORT: { name: viewport.name, width: viewport.width, height: viewport.height },
    ROWS: rows,
    FAILURE_COUNT: bad.length,
    SEMANTIC_FAILURE_COUNT: semanticFailures,
    READ_ONLY_REQUEST_LEDGER: requestSummary,
    BUSINESS_WRITE_EXECUTION: requestSummary.businessMutationExecutionCount,
  }));
} finally {
  await context.close();
  await browser.close();
}
