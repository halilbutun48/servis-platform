#!/usr/bin/env node

import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const WEB = String(process.env.WEB_BASE_URL || 'http://127.0.0.1:5173').replace(/\/$/u, '');
const API = String(process.env.M18_AGREEMENT_API_BASE || 'http://127.0.0.1:3000').replace(/\/$/u, '');
const OUT = process.env.M18_OUT || 'backend/artifacts/browser-smoke/m18-room-agreement-bridge-goster-20261013.json';
const SCREEN = 'backend/artifacts/browser-smoke';
const BRIDGE_PREFIX = 'room:agreements:agreement:';
const RECORD_SWITCH_SETTLE_MS = Number(process.env.M18_RECORD_SWITCH_SETTLE_MS || 350);

function compact(payload) {
  const plan = payload?.semanticPlan || {};
  const request = plan?.canonicalRequest || payload?.canonicalRequest || {};
  return {
    family: plan.family || null,
    operation: request.operation || null,
    object: request.semanticAction?.objectClass || null,
    agreementOperationBridgeIntent: Boolean(plan.agreementOperationBridgeIntent || plan.typedRequest?.agreementOperationBridgeIntent),
    entity: plan.entity || null,
    target: payload?.guidedTarget || null,
    reply: String(payload?.reply || '').slice(0, 1600),
  };
}

async function login(identifier = 'room@demo.com') {
  const response = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier, password: 'demo123' }),
  });
  const payload = await response.json().catch(() => ({}));
  assert.equal(response.ok, true, `ROOM_LOGIN_${response.status}`);
  assert.ok(payload.token, 'ROOM_LOGIN_TOKEN');
  return payload.token;
}

async function openDrawer(page) {
  const current = page.locator('.copilotDrawer:visible').first();
  if (await current.count()) return current;
  await page.locator('.copilotFab:visible').first().click();
  const drawer = page.locator('.copilotDrawer:visible').first();
  await drawer.waitFor({ state: 'visible', timeout: 10000 });
  return drawer;
}

async function clearConversation(page) {
  await page.evaluate(() => {
    localStorage.removeItem('psv1:copilot:drawer:history:v4');
    localStorage.removeItem('psv1:copilot:drawer:v4');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1100);
}

async function targetEvidence(page, target) {
  if (!target || target.status !== 'FOUND') return { status: target?.status || null, domMatches: 0, matches: [], highlight: null };
  return page.evaluate((expected) => {
    const matches = [...document.querySelectorAll('[data-copilot-target]')]
      .filter((element) => element.getAttribute('data-copilot-target') === expected.targetKey);
    const overlay = document.querySelector('[data-copilot-resolved-target-key]');
    const rect = overlay?.getBoundingClientRect?.() || null;
    return {
      status: expected.status,
      domMatches: matches.length,
      matches: matches.map((element) => {
        const r = element.getBoundingClientRect();
        return {
          text: (element.innerText || element.getAttribute('aria-label') || '').replace(/\s+/gu, ' ').trim(),
          semanticId: element.getAttribute('data-copilot-semantic-id'),
          rect: { x: r.x, y: r.y, width: r.width, height: r.height },
          visible: r.width > 0 && r.height > 0,
          inViewport: r.right >= 0 && r.bottom >= 0 && r.left <= window.innerWidth && r.top <= window.innerHeight,
        };
      }),
      highlight: overlay ? {
        targetKey: overlay.getAttribute('data-copilot-resolved-target-key'),
        identitySource: overlay.getAttribute('data-copilot-resolved-identity-source'),
        rect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
        visible: Boolean(rect && rect.width > 0 && rect.height > 0),
        inViewport: Boolean(rect && rect.right >= 0 && rect.bottom >= 0 && rect.left <= window.innerWidth && rect.top <= window.innerHeight),
      } : null,
      mobileNavigationOpen: Boolean(document.querySelector('#shell-nav-dock.navDock--mobileOpen')),
      scroll: { x: window.scrollX, y: window.scrollY },
      visualViewport: window.visualViewport ? {
        width: window.visualViewport.width,
        height: window.visualViewport.height,
        offsetLeft: window.visualViewport.offsetLeft,
        offsetTop: window.visualViewport.offsetTop,
        pageLeft: window.visualViewport.pageLeft,
        pageTop: window.visualViewport.pageTop,
      } : null,
      documentMetrics: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        documentClientHeight: document.documentElement.clientHeight,
        documentScrollHeight: document.documentElement.scrollHeight,
        bodyScrollHeight: document.body?.scrollHeight || null,
        targetDocumentTop: matches[0] ? matches[0].getBoundingClientRect().top + window.scrollY : null,
      },
      drawerRect: (() => { const drawer = document.querySelector('.copilotDrawer'); const r = drawer?.getBoundingClientRect?.(); return r ? { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom } : null; })(),
      scrollContainers: (() => {
        const rows = [];
        let node = matches[0]?.parentElement || null;
        while (node && node !== document.body) {
          const style = getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          const scrollable = /(auto|scroll)/i.test(`${style.overflowY} ${style.overflow}`) && node.scrollHeight > node.clientHeight;
          if (scrollable || node.scrollTop || node.scrollHeight > node.clientHeight) {
            rows.push({
              tag: node.tagName,
              id: node.id || null,
              className: String(node.className || '').slice(0, 160),
              overflowY: style.overflowY,
              scrollTop: node.scrollTop,
              clientHeight: node.clientHeight,
              scrollHeight: node.scrollHeight,
              rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
            });
          }
          node = node.parentElement;
        }
        return rows;
      })(),
      navigationRect: (() => { const nav = document.querySelector('#shell-nav-dock.navDock--mobileOpen'); const r = nav?.getBoundingClientRect?.(); return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null; })(),
    };
  }, target);
}

async function ask(page, message) {
  const drawer = await openDrawer(page);
  const textarea = drawer.locator('textarea').first();
  const requestPromise = page.waitForRequest((request) => request.url().includes('/api/ai/copilot') && request.method() === 'POST', { timeout: 30000 });
  const responsePromise = page.waitForResponse((response) => response.url().includes('/api/ai/copilot') && response.request().method() === 'POST', { timeout: 30000 });
  await textarea.fill(message);
  await textarea.press('Enter');
  const request = await requestPromise;
  const response = await responsePromise;
  const payload = await response.json().catch(() => ({}));
  await page.waitForTimeout(500);
  const visibleReply = await drawer.locator('.copilotMsg.assistant .copilotMsgText').last().innerText().catch(() => '');
  const summary = compact(payload);
  const requestBody = request.postDataJSON?.() || {};
  const requestSelection = requestBody?.conversationState || {};
  const requestScreen = requestBody?.screenContext || {};
  const requestSurface = requestScreen?.uiHints || requestSelection?.uiSurface || {};
  return {
    input: message,
    httpStatus: response.status(),
    compact: summary,
    requestTrace: {
      screenPath: requestScreen.path || requestSelection.lastScreenPath || null,
      screenId: requestScreen.id || requestBody.entityId || null,
      selectedEntityType: requestScreen.selectedEntityType || requestSelection.selectedEntityType || null,
      selectedEntityId: requestScreen.selectedEntityId || requestSelection.selectedEntityId || null,
      selectedLabel: requestScreen.selectedLabel || requestSelection.selectedLabel || null,
      activeTabs: Array.isArray(requestSurface.activeTabs) ? requestSurface.activeTabs : [],
      visibleTargetKeys: Array.isArray(requestSurface.visibleButtons)
        ? requestSurface.visibleButtons.map((item) => item?.targetKey).filter(Boolean).slice(0, 12)
        : [],
    },
    visibleReply,
    targetEvidence: await targetEvidence(page, summary.target),
  };
}

async function surfaceState(page) {
  return page.evaluate(() => {
    const body = document.body.innerText || '';
    const ids = [...body.matchAll(/Sözleşme ID (\d+)/gu)].map((match) => Number(match[1])).filter(Boolean);
    return {
      url: location.href,
      selectedAgreementIdsInView: [...new Set(ids)],
      body: body.slice(0, 7000),
      buttons: [...document.querySelectorAll('button')]
        .filter((element) => {
          const r = element.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        })
        .map((element) => ({
          text: (element.innerText || element.getAttribute('aria-label') || '').replace(/\s+/gu, ' ').trim(),
          targetKey: element.getAttribute('data-copilot-target'),
        }))
        .filter((row) => row.text || row.targetKey)
        .slice(0, 60),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      },
    };
  });
}

async function directNegative(token, { role = 'ROOM', selectedAgreementId = null, path = '/room/agreements', visibleButtons = [] } = {}) {
  const body = {
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 1106,
    message: 'Sözleşmenin operasyon bağlantısını göster.',
    conversationState: { recentMessages: [], lastScreenPath: path, selectedEntityType: selectedAgreementId ? 'agreement' : '', selectedEntityId: selectedAgreementId, uiSurface: { visibleButtons, activeTabs: ['bridge'] } },
    screenContext: { id: 1106, path, label: path === '/room/agreements' ? 'Sözleşmeler' : 'Vardiyalar', role, selectedEntityType: selectedAgreementId ? 'agreement' : '', selectedEntityId: selectedAgreementId, uiHints: { visibleButtons, activeTabs: ['bridge'] } },
    format: 'json',
  };
  const response = await fetch(`${API}/api/ai/copilot`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({}));
  return { httpStatus: response.status, compact: compact(payload) };
}

async function runViewport(token, viewport, label) {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.M18_CHROMIUM_EXECUTABLE || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const context = await browser.newContext({ viewport, locale: 'tr-TR', timezoneId: 'Europe/Istanbul' });
  await context.addInitScript(({ accessToken }) => {
    localStorage.setItem('token', accessToken);
    localStorage.removeItem('psv1:copilot:drawer:history:v4');
    localStorage.removeItem('psv1:copilot:drawer:v4');
  }, { accessToken: token });
  await context.route('**/*', async (route) => {
    const method = route.request().method().toUpperCase();
    const allowed = method === 'GET' || route.request().url().includes('/api/auth/login') || route.request().url().includes('/api/ai/copilot');
    if (!allowed) return route.abort();
    return route.continue();
  });
  const page = await context.newPage();
  await page.goto(`${WEB}/#/room/agreements`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);
  const initial = await surfaceState(page);
  await page.screenshot({ path: `${SCREEN}/m18-room-agreement-bridge-${label}-initial.png`, fullPage: true });

  const bridge = await ask(page, 'Sözleşmenin operasyon bağlantısını göster.');
  assert.equal(bridge.httpStatus, 200, `${label}: bridge HTTP`);
  assert.equal(bridge.compact.target?.status, 'FOUND', `${label}: bridge target found`);
  assert.match(String(bridge.compact.target?.targetKey || ''), /^room:agreements:agreement:\d+:operation-bridge$/u, `${label}: selected bridge key`);
  assert.equal(bridge.targetEvidence.domMatches, 1, `${label}: one real bridge DOM target`);
  assert.equal(bridge.targetEvidence.highlight?.targetKey, bridge.compact.target.targetKey, `${label}: highlight key`);
  assert.equal(bridge.targetEvidence.highlight?.visible, true, `${label}: highlight visible`);
  assert.equal(bridge.targetEvidence.highlight?.inViewport, true, `${label}: highlight in viewport`);

  const target = page.locator(`[data-copilot-target="${bridge.compact.target.targetKey}"]`).first();
  await target.click();
  await page.waitForTimeout(250);
  const afterSafeOpen = await surfaceState(page);
  assert.match(afterSafeOpen.body, /Operasyon Köprüsü/iu, `${label}: bridge remains visible after safe disclosure`);
  assert.match(afterSafeOpen.body, /Sadece önizleme/iu, `${label}: read-only bridge disclosure`);
  await page.screenshot({ path: `${SCREEN}/m18-room-agreement-bridge-${label}-after.png`, fullPage: true });

  await clearConversation(page);
  const generic = await ask(page, 'Operasyon merkezine gitmek istiyorum.');
  const genericSurface = await surfaceState(page);
  generic.verdict = generic.compact.target?.targetKey === 'room:home'
    && generic.targetEvidence.domMatches === 1
    && generic.targetEvidence.highlight?.targetKey === 'room:home'
    && generic.targetEvidence.highlight?.visible === true
    && generic.targetEvidence.highlight?.inViewport === true
    && (viewport.width > 720 || generic.targetEvidence.mobileNavigationOpen)
    ? 'PASS_BOUNDED'
    : 'STALE_RUNTIME_NOT_PROVEN';
  generic.surface = {
    horizontalOverflow: genericSurface.viewport.horizontalOverflow,
    mobileNavigationOpen: generic.targetEvidence.mobileNavigationOpen,
    visibleTargetButtons: genericSurface.buttons.filter((button) => button.targetKey || /Operasyon Merkezi|Menü/iu.test(button.text)),
  };

  await clearConversation(page);
  const otherTab = page.locator('button').filter({ hasText: /Diğer Sözleşmeler/iu }).first();
  let recordSwitch = { status: 'NOT_EXECUTED' };
  if (await otherTab.count()) {
    await otherTab.click();
    await page.waitForTimeout(500);
    const rows = page.locator('tbody tr');
    if (await rows.count() > 1) {
      await rows.nth(1).click();
      await page.waitForTimeout(300);
      const bridgeTab = page.locator('button').filter({ hasText: /^Operasyon Köprüsü/iu }).first();
      if (await bridgeTab.count()) {
        await bridgeTab.click();
        await page.waitForTimeout(RECORD_SWITCH_SETTLE_MS);
      }
      const switched = await ask(page, 'Seçtiğim sözleşmenin operasyonla ilişkisini nereden görebilirim?');
      const switchedSurface = await surfaceState(page);
      const switchedBridgeTabCount = await page.locator('button').filter({ hasText: /^Operasyon Köprüsü/iu }).count();
      recordSwitch = {
        status: switched.compact.target?.status === 'FOUND'
          && switched.compact.target.targetKey !== bridge.compact.target.targetKey
          ? 'PASS_BOUNDED'
          : 'NOT_PROVEN',
        selectedIdsInView: (await surfaceState(page)).selectedAgreementIdsInView,
        targetKey: switched.compact.target?.targetKey || null,
        targetStatus: switched.compact.target?.status || null,
        visibleReply: switched.visibleReply,
        compact: switched.compact,
        requestTrace: switched.requestTrace,
        targetEvidence: switched.targetEvidence,
        surface: {
          selectedAgreementIdsInView: switchedSurface.selectedAgreementIdsInView,
          url: switchedSurface.url,
          horizontalOverflow: switchedSurface.viewport.horizontalOverflow,
          bridgeTabCount: switchedBridgeTabCount,
          visibleTargetButtons: switchedSurface.buttons.filter((button) => button.targetKey || /Operasyon|Detayı|Ayrıntı|Sözleşme/iu.test(button.text)),
        },
      };
    } else {
      recordSwitch = { status: 'NOT_EXECUTED', reason: 'other-agreements tab opened but no selectable second table row was present' };
    }
  } else {
    recordSwitch = { status: 'NOT_EXECUTED', reason: 'other-agreements tab was not present in this viewport' };
  }

  let recovery = { status: 'NOT_EXECUTED' };
  const pendingTab = page.locator('button').filter({ hasText: /^Bekleyen/iu }).first();
  if (await pendingTab.count()) {
    await pendingTab.click();
    await page.waitForTimeout(RECORD_SWITCH_SETTLE_MS);
    const pendingRows = page.locator('tbody tr');
    if (await pendingRows.count()) {
      await pendingRows.first().click();
      await page.waitForTimeout(RECORD_SWITCH_SETTLE_MS);
      const bridgeTab = page.locator('button').filter({ hasText: /^Operasyon Köprüsü/iu }).first();
      if (await bridgeTab.count()) {
        await bridgeTab.click();
        await page.waitForTimeout(RECORD_SWITCH_SETTLE_MS);
      }
      const recovered = await ask(page, 'Bu sözleşmenin operasyon bağlantısını göster.');
      recovery = {
        status: recovered.compact.target?.targetKey === bridge.compact.target?.targetKey
          && recovered.targetEvidence.domMatches === 1
          && recovered.targetEvidence.highlight?.targetKey === recovered.compact.target.targetKey
          ? 'PASS_BOUNDED'
          : 'NOT_PROVEN',
        selectedIdsInView: (await surfaceState(page)).selectedAgreementIdsInView,
        requestTrace: recovered.requestTrace,
        targetKey: recovered.compact.target?.targetKey || null,
        targetStatus: recovered.compact.target?.status || null,
        targetEvidence: recovered.targetEvidence,
      };
    }
  }

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1100);
  const reloaded = await ask(page, 'Bu sözleşmenin operasyon bağlantısını göster.');
  await page.screenshot({ path: `${SCREEN}/m18-room-agreement-bridge-${label}-post-reload.png`, fullPage: true });
  const reloadVisible = reloaded.compact.target?.status === 'FOUND'
    && reloaded.targetEvidence.domMatches === 1
    && reloaded.targetEvidence.highlight?.visible === true
    && reloaded.targetEvidence.highlight?.inViewport === true;
  assert.equal(reloadVisible, true, `${label}: post-reload bridge highlight must be visible in viewport`);
  const reloadRecovery = {
    status: reloadVisible
      ? 'PASS_BOUNDED'
      : 'NOT_PROVEN',
    selectedIdsInView: (await surfaceState(page)).selectedAgreementIdsInView,
    requestTrace: reloaded.requestTrace,
    targetKey: reloaded.compact.target?.targetKey || null,
    targetStatus: reloaded.compact.target?.status || null,
    targetEvidence: reloaded.targetEvidence,
  };

  await page.goto(`${WEB}/#/room/shifts`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(900);
  const stale = await ask(page, 'Aynı sözleşmenin operasyon bağlantısını göster.');
  assert.notEqual(stale.compact.target?.status, 'FOUND', `${label}: stale route has no target`);
  await context.close();
  await browser.close();
  return { label, viewport, initial, bridge, afterSafeOpen, generic, recordSwitch, recovery, reloadRecovery, stale };
}

const token = await login();
const companyToken = await login('company@demo.com');
const canonicalVisibleButtons = [
  { label: 'Sözleşmeler', targetKey: 'room:agreements', identitySource: 'CANONICAL', semanticType: 'button' },
  { label: 'Detayı aç', targetKey: 'room:agreements:agreement:184:operation-bridge', identitySource: 'CANONICAL', semanticType: 'button' },
];
const negatives = {
  missingSelectedAgreement: await directNegative(token, { selectedAgreementId: null, visibleButtons: canonicalVisibleButtons.slice(0, 1) }),
  wrongRole: await directNegative(companyToken, { role: 'ROOM', selectedAgreementId: 184, visibleButtons: canonicalVisibleButtons }),
  wrongTenantOrUnavailableTarget: await directNegative(token, { selectedAgreementId: 999999, visibleButtons: [{ label: 'Sözleşmeler', targetKey: 'room:agreements', identitySource: 'CANONICAL', semanticType: 'button' }] }),
  staleRoute: await directNegative(token, { path: '/room/shifts', selectedAgreementId: 184, visibleButtons: canonicalVisibleButtons }),
};
assert.notEqual(negatives.missingSelectedAgreement.compact.target?.status, 'FOUND', 'missing selected agreement fails closed');
assert.notEqual(negatives.wrongRole.compact.target?.status, 'FOUND', 'wrong role fails closed');
assert.notEqual(negatives.wrongTenantOrUnavailableTarget.compact.target?.status, 'FOUND', 'unavailable target fails closed');
assert.notEqual(negatives.staleRoute.compact.target?.status, 'FOUND', 'stale route fails closed');

const browsers = {
  desktop: await runViewport(token, { width: 1440, height: 900 }, 'desktop'),
  mobile: await runViewport(token, { width: 390, height: 844 }, 'mobile'),
  narrow: await runViewport(token, { width: 320, height: 844 }, 'narrow'),
};
const result = {
  generatedAt: new Date().toISOString(),
  head: process.env.M18_HEAD || 'd85ea52218adcfcbacbdac279526ca0e767c4d0d',
  branch: process.env.M18_BRANCH || 'm90d1_web_lint_inventory',
  role: 'ROOM',
  fixture: { roomId: 1, selectedAgreementBeforeSwitch: 184, status: 'REQUESTED / İnceleme bekliyor', totalVisible: 5, pendingReview: 1 },
  negatives,
  browsers,
  businessMutations: 0,
};
await mkdir(SCREEN, { recursive: true });
await writeFile(OUT, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ status: 'PASS_BOUNDED', output: OUT, viewports: ['desktop', 'mobile', 'narrow'], initialTargetKeys: Object.fromEntries(Object.entries(browsers).map(([key, value]) => [key, value.bridge.compact.target.targetKey])), recordSwitch: Object.fromEntries(Object.entries(browsers).map(([key, value]) => [key, value.recordSwitch])), negatives: Object.fromEntries(Object.entries(negatives).map(([key, value]) => [key, value.compact.target?.status || null])) }, null, 2));
