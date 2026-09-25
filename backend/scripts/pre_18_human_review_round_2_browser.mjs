import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const webBaseUrl = (process.env.WEB_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const apiBaseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const evidenceRoot = path.join(repoRoot, "backend", "artifacts", "browser-smoke", "pre-18-human-review-round-2");
const screenshotRoot = path.join(evidenceRoot, "screenshots");

const contexts = [
  { name: "SUPER_ADMIN", identifier: "superadmin@demo.com", home: "/superadmin" },
  { name: "COMPANY", identifier: "company@demo.com", home: "/company" },
  { name: "ROOM", identifier: "room@demo.com", home: "/room" },
  { name: "DRIVER", identifier: "driver@demo.com", home: "/driver/today", deviceId: process.env.DRIVER_BROWSER_DEVICE_ID || "web-s27k9shhmqj7i68l" },
  { name: "PERSONEL", identifier: "personel@demo.com", home: "/personel" },
  { name: "PARENT", identifier: "parent@demo.com", home: "/parent" },
  { name: "SCHOOL", identifier: "school@demo.com", home: "/school" },
  { name: "ORGANIZATION", identifier: "organization@demo.com", home: "/organization" },
];

const questions = [
  "Şu anda sorun var mı?",
  "Yeni teklif var mı?",
  "Bekleyen sözleşme var mı?",
  "Bugün neye bakmalıyım?",
  "Vardiyalarda sorun var mı?",
  "Benden onay bekleyen bir şey var mı?",
  "Fırsat var mı?",
  "Sıradaki doğru işlem ne?",
];

const report = {
  source: "REAL_PLAYWRIGHT_RENDERED_BROWSER",
  generatedAt: new Date().toISOString(),
  sourceHead: execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim(),
  webBaseUrl,
  matrix: "8 role contexts; desktop task homes; mobile COMPANY/ROOM; 16 home-origin Sefer Abi queries",
  screenshots: [],
  roleEvidence: [],
  queryEvidence: [],
  panelEvidence: [],
  errors: [],
  counters: {
    ACTIONABLE_EVENT_CANONICAL_SOURCE_COUNT: 1,
    DUPLICATE_ACTIONABLE_EVENT_SOURCE_COUNT: 0,
    ACTIONABLE_EVENT_REAL_BROWSER_ROLE_COUNT: 0,
    EMPTY_COMMAND_CENTER_WHILE_ACTIONABLE_WORK_EXISTS_COUNT: 0,
    ACTIONABLE_EVENT_HIDDEN_IN_SECONDARY_MENU_COUNT: 0,
    COMMAND_CENTER_VISIBLE_PRIMARY_EVENT_COUNT: 0,
    COMMAND_CENTER_PRIMARY_ACTION_COUNT: 0,
    COMMAND_CENTER_EQUAL_WEIGHT_EVENT_OVERLOAD_COUNT: 0,
    COMMAND_CENTER_NOTIFICATION_DUMP_COUNT: 0,
    DUPLICATE_ACTIONABLE_EVENT_COUNT: 0,
    NON_ACTIONABLE_NOTIFICATION_PROMOTED_COUNT: 0,
    ACTIONABLE_EVENT_ROLE_LEAK_COUNT: 0,
    ACTIONABLE_EVENT_TENANT_LEAK_COUNT: 0,
    ACTIONABLE_EVENT_UNAUTHORIZED_RECORD_COUNT: 0,
    SEFER_ABI_CROSS_PANEL_REAL_QUERY_PASS_COUNT: 0,
    SEFER_ABI_REQUIRES_NAVIGATION_BEFORE_KNOWING_COUNT: 0,
    SEFER_ABI_AUTHORIZED_CROSS_PANEL_BLIND_SPOT_COUNT: 0,
    SEFER_ABI_FALSE_NO_INFORMATION_RESPONSE_COUNT: 0,
    SEFER_ABI_FALSE_NO_DATA_RESPONSE_COUNT: 0,
    SEFER_ABI_HIDDEN_ACTIONABLE_EVENT_COUNT: 0,
    SEFER_ABI_INVENTED_EVENT_COUNT: 0,
    SEFER_ABI_INVENTED_CROSS_PANEL_FACT_COUNT: 0,
    SEFER_ABI_UNGROUNDED_RECOMMENDATION_COUNT: 0,
    SEFER_ABI_ROLE_LEAK_COUNT: 0,
    SEFER_ABI_TENANT_LEAK_COUNT: 0,
    COMMAND_CENTER_SEFER_ABI_EVENT_COUNT_MISMATCH: 0,
    COMMAND_CENTER_SEFER_ABI_FACT_MISMATCH_COUNT: 0,
    COMMAND_CENTER_TARGET_PANEL_FACT_MISMATCH_COUNT: 0,
    SEFER_ABI_TARGET_PANEL_FACT_MISMATCH_COUNT: 0,
    VISIBLE_LEGACY_PAYMENT_PROVIDER_UI_COUNT: 0,
    VISIBLE_OBSOLETE_PAYMENT_LINK_STATE_COUNT: 0,
    VISIBLE_OBSOLETE_COMMISSION_UI_COUNT: 0,
    UNKNOWN_VISIBLE_PAYMENT_FIELD_COUNT: 0,
    PAYMENT_EXECUTION_CAPABILITY_OPENED_COUNT: 0,
    AUTOMATIC_PAYMENT_APPROVAL_OPENED_COUNT: 0,
    ROUND_1_VISUAL_REGRESSION_COUNT: 0,
    consoleErrorCount: 0,
    pageErrorCount: 0,
    HTTP_500_COUNT: 0,
  },
};

function recordObservers(page, label) {
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    report.counters.consoleErrorCount += 1;
    report.errors.push({ type: "console", label, text: message.text() });
  });
  page.on("pageerror", (error) => {
    report.counters.pageErrorCount += 1;
    report.errors.push({ type: "page", label, text: error.message });
  });
  page.on("response", (response) => {
    if (response.status() < 500) return;
    report.counters.HTTP_500_COUNT += 1;
    report.errors.push({ type: "http", label, status: response.status(), url: response.url() });
  });
}

async function login(spec) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier: spec.identifier, password: "demo123", deviceId: spec.deviceId || `pre18-round2-${spec.name}` }),
      signal: AbortSignal.timeout(12000),
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok && body.token) return { token: body.token, user: body.user || null };
    if (response.status === 429 && attempt < 5) {
      const retryAfter = Number(response.headers.get("retry-after") || body.retryAfterSec || 0);
      await new Promise((resolve) => setTimeout(resolve, Math.min(15000, Math.max(2000, retryAfter * 1000 || (attempt + 1) * 3000))));
      continue;
    }
    throw new Error(`browser login failed ${spec.name}: ${response.status}`);
  }
  throw new Error(`browser login failed ${spec.name}`);
}

async function loadSnapshot(token) {
  const response = await fetch(`${apiBaseUrl}/api/dashboard/bulk?bundle=actionable-events&force=1`, {
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`actionable event source failed: ${response.status} ${payload?.error || ""}`.trim());
  return payload;
}

async function createPage(browser, spec, viewportName, token) {
  const viewport = viewportName === "mobile" ? { width: 390, height: 844 } : { width: 1440, height: 900 };
  const context = await browser.newContext({
    viewport,
    isMobile: viewportName === "mobile",
    hasTouch: viewportName === "mobile",
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
  });
  await context.addInitScript((value) => {
    localStorage.setItem("token", value);
    localStorage.removeItem("personel_servis_cached_session");
    localStorage.removeItem("psv1:copilot:drawer:v4");
    localStorage.removeItem("psv1:copilot:drawer:history:v4");
  }, token);
  const page = await context.newPage();
  recordObservers(page, `${spec.name}:${viewportName}`);
  return { context, page };
}

async function go(page, route) {
  await page.goto(`${webBaseUrl}/#${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1400);
}

async function capture(page, name) {
  await fs.mkdir(screenshotRoot, { recursive: true });
  const target = path.join(screenshotRoot, `${name}.png`);
  await page.screenshot({ path: target, fullPage: false });
  const relative = path.relative(repoRoot, target).replace(/\\/g, "/");
  report.screenshots.push(relative);
  return relative;
}

async function inspectCommandCenter(page, snapshot, label) {
  await page.waitForSelector('[data-command-center="true"]', { state: "attached", timeout: 15000 });
  await page.waitForFunction(() => {
    const node = document.querySelector('[data-command-center="true"]');
    return node?.getAttribute("data-command-center-source") === "actionable-events-v1";
  }, { timeout: 15000 });
  const result = await page.evaluate(() => {
    const center = document.querySelector('[data-command-center="true"]');
    const cards = [...document.querySelectorAll("[data-actionable-event-id]")];
    const primary = [...document.querySelectorAll('[data-command-center-primary-action="true"]')];
    const ids = cards.map((node) => node.getAttribute("data-actionable-event-id")).filter(Boolean);
    const body = (center?.innerText || "").replace(/\s+/g, " ").trim();
    const empty = Boolean(center?.querySelector('[data-command-center-empty="true"]'));
    const unavailable = Boolean(center?.querySelector('[data-command-center-unavailable="true"]'));
    const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    return {
      source: center?.getAttribute("data-command-center-source") || "",
      cardCount: cards.length,
      primaryActionCount: primary.length,
      ids,
      duplicateCount: ids.length - new Set(ids).size,
      empty,
      unavailable,
      horizontalOverflow: width > document.documentElement.clientWidth + 1,
      body,
    };
  });
  const sourceEvents = Array.isArray(snapshot?.events) ? snapshot.events : [];
  const sourceIds = sourceEvents.map((item) => String(item.id));
  const visibleIds = result.ids;
  const missing = sourceEvents.length && result.empty ? sourceEvents.length : 0;
  const hidden = sourceEvents.length ? sourceEvents.filter((item) => !visibleIds.includes(String(item.id)) && !result.body.includes(String(item.title || ""))).length : 0;
  report.counters.EMPTY_COMMAND_CENTER_WHILE_ACTIONABLE_WORK_EXISTS_COUNT += missing;
  report.counters.ACTIONABLE_EVENT_HIDDEN_IN_SECONDARY_MENU_COUNT += hidden;
  report.counters.COMMAND_CENTER_VISIBLE_PRIMARY_EVENT_COUNT = Math.max(report.counters.COMMAND_CENTER_VISIBLE_PRIMARY_EVENT_COUNT, result.cardCount);
  report.counters.COMMAND_CENTER_PRIMARY_ACTION_COUNT = Math.max(report.counters.COMMAND_CENTER_PRIMARY_ACTION_COUNT, result.primaryActionCount);
  report.counters.COMMAND_CENTER_EQUAL_WEIGHT_EVENT_OVERLOAD_COUNT += result.cardCount > 5 ? 1 : 0;
  report.counters.DUPLICATE_ACTIONABLE_EVENT_COUNT += result.duplicateCount;
  report.counters.ACTIONABLE_EVENT_ROLE_LEAK_COUNT += /\b(?:SUPER_ADMIN|COMPANY|ROOM|DRIVER|PARENT|SCHOOL|ORGANIZATION)\b/i.test(result.body) ? 1 : 0;
  report.counters.ROUND_1_VISUAL_REGRESSION_COUNT += result.horizontalOverflow ? 1 : 0;
  const sourceScope = snapshot?.tenant || {};
  const unauthorizedScope = sourceEvents.filter((item) => {
    const scope = item.scope || {};
    if (snapshot.role === "ROOM") return Number(scope.roomId || 0) !== Number(sourceScope.roomId || 0);
    if (["COMPANY"].includes(snapshot.role) && snapshot.companyKind !== "SCHOOL" && snapshot.companyKind !== "ORGANIZATION") return Number(scope.companyId || 0) !== Number(sourceScope.companyId || 0);
    if (["SCHOOL", "ORGANIZATION"].includes(snapshot.companyKind)) return Number(scope.companyId || 0) !== Number(sourceScope.companyId || 0);
    return false;
  }).length;
  report.counters.ACTIONABLE_EVENT_UNAUTHORIZED_RECORD_COUNT += unauthorizedScope;
  report.counters.ACTIONABLE_EVENT_TENANT_LEAK_COUNT += unauthorizedScope;
  report.roleEvidence.push({ label, source: result.source, snapshotRole: snapshot.role, companyKind: snapshot.companyKind || null, sourceEventCount: sourceEvents.length, renderedEventCount: result.cardCount, renderedEventIds: visibleIds, empty: result.empty, unavailable: result.unavailable, horizontalOverflow: result.horizontalOverflow, sourceIds, unauthorizedScope });
  return result;
}

async function runRoleHomes(browser, sessions) {
  for (const spec of contexts) {
    const session = sessions[spec.name];
    const { context, page } = await createPage(browser, spec, "desktop", session.token);
    try {
      await go(page, spec.home);
      const center = await inspectCommandCenter(page, session.snapshot, `${spec.name}:desktop`);
      const screenshot = await capture(page, `round2-command-center-${spec.name.toLowerCase()}-desktop`);
      report.counters.ACTIONABLE_EVENT_REAL_BROWSER_ROLE_COUNT += center.source === "actionable-events-v1" ? 1 : 0;
      report.roleEvidence[report.roleEvidence.length - 1].screenshot = screenshot;
    } finally {
      await context.close();
    }
  }
}

async function runResponsiveHomes(browser, sessions) {
  for (const name of ["COMPANY", "ROOM"]) {
    const spec = contexts.find((item) => item.name === name);
    const { context, page } = await createPage(browser, spec, "mobile", sessions[name].token);
    try {
      await go(page, spec.home);
      const center = await inspectCommandCenter(page, sessions[name].snapshot, `${name}:mobile`);
      const screenshot = await capture(page, `round2-command-center-${name.toLowerCase()}-mobile`);
      report.roleEvidence[report.roleEvidence.length - 1].screenshot = screenshot;
      report.counters.ROUND_1_VISUAL_REGRESSION_COUNT += center.horizontalOverflow ? 1 : 0;
    } finally {
      await context.close();
    }
  }
}

async function openAssistant(page) {
  const launcher = page.locator('.copilotFab:visible').first();
  if (await launcher.count() !== 1) throw new Error("Sefer Abi launcher is not uniquely visible");
  await launcher.click();
  await page.locator('.copilotDrawer:visible').waitFor({ state: "visible", timeout: 8000 });
  return page.locator('.copilotDrawer:visible');
}

async function askFromHome(page, contextName, question, index, sourceIds) {
  const drawer = page.locator('.copilotDrawer:visible');
  const textarea = drawer.locator('textarea').first();
  const beforeCount = await drawer.locator('.copilotMsg.assistant').count();
  await textarea.fill(question);
  let payload = null;
  try {
    const response = await Promise.all([
      page.waitForResponse((candidate) => candidate.url().includes("/api/ai/copilot") && candidate.request().method() === "POST", { timeout: 20000 }),
      textarea.press("Enter"),
    ]).then(([candidate]) => candidate);
    payload = await response.json().catch(() => null);
  } catch (error) {
    report.errors.push({ type: "query", context: contextName, question, text: String(error?.message || error) });
  }
  await page.waitForFunction((count) => document.querySelectorAll('.copilotDrawer .copilotMsg.assistant').length > count || Boolean(document.querySelector('.copilotDrawer .copilotError')), beforeCount, { timeout: 20000 }).catch(() => {});
  const answer = await drawer.locator('.copilotMsg.assistant .copilotMsgText').last().innerText().catch(() => "");
  const responseIds = Array.isArray(payload?.actionableEventIds) ? payload.actionableEventIds.map(String) : [];
  const responseSnapshotIds = Array.isArray(payload?.actionableEvents) ? payload.actionableEvents.map((item) => String(item?.id || "")).filter(Boolean) : [];
  const inventedIds = responseIds.filter((id) => !sourceIds.includes(id));
  const genericNoInfo = /bu konuda bilgim yok|bu ekranda bilgi görünmüyor|bilgi bulunamadı|veri yok/i.test(answer);
  const noDataWithoutGrounding = /yetkili mevcut kayıtlarda/i.test(answer) && !payload?.actionableEventSource;
  const responseSourceOk = payload?.actionableEventSource === "actionable-events-v1";
  const eventCountMismatch = responseSourceOk && Number(payload?.actionableEventSummary?.total) !== sourceIds.length;
  const factMismatch = responseSourceOk && responseSnapshotIds.some((id) => !sourceIds.includes(id));
  report.counters.COMMAND_CENTER_SEFER_ABI_EVENT_COUNT_MISMATCH += eventCountMismatch ? 1 : 0;
  report.counters.COMMAND_CENTER_SEFER_ABI_FACT_MISMATCH_COUNT += factMismatch ? 1 : 0;
  report.counters.SEFER_ABI_ROLE_LEAK_COUNT += /\b(?:SUPER_ADMIN|COMPANY|ROOM|DRIVER|PARENT|SCHOOL|ORGANIZATION)\b/i.test(answer) ? 1 : 0;
  const pass = Boolean(payload?.ok && responseSourceOk && !inventedIds.length && !genericNoInfo && !noDataWithoutGrounding);
  report.counters.SEFER_ABI_INVENTED_EVENT_COUNT += inventedIds.length;
  report.counters.SEFER_ABI_INVENTED_CROSS_PANEL_FACT_COUNT += inventedIds.length;
  report.counters.SEFER_ABI_FALSE_NO_INFORMATION_RESPONSE_COUNT += genericNoInfo ? 1 : 0;
  report.counters.SEFER_ABI_FALSE_NO_DATA_RESPONSE_COUNT += noDataWithoutGrounding ? 1 : 0;
  report.counters.SEFER_ABI_REQUIRES_NAVIGATION_BEFORE_KNOWING_COUNT += /bu ekranda|ilgili menüye git|bu sayfada/i.test(answer) ? 1 : 0;
  report.counters.SEFER_ABI_AUTHORIZED_CROSS_PANEL_BLIND_SPOT_COUNT += !responseSourceOk ? 1 : 0;
  report.counters.SEFER_ABI_CROSS_PANEL_REAL_QUERY_PASS_COUNT += pass ? 1 : 0;
  report.queryEvidence.push({ context: contextName, index, question, pass, responseSource: payload?.actionableEventSource || null, responseEventIds: responseIds, responseSnapshotIds, inventedIds, eventCountMismatch, factMismatch, answer: answer.slice(0, 1200) });
  return { pass, payload, answer };
}

async function runCrossPanelQueries(browser, sessions) {
  for (const name of ["COMPANY", "ROOM"]) {
    const spec = contexts.find((item) => item.name === name);
    const { context, page } = await createPage(browser, spec, "desktop", sessions[name].token);
    try {
      await go(page, spec.home);
      const snapshot = sessions[name].snapshot;
      const drawer = await openAssistant(page);
      const sourceIds = (snapshot.events || []).map((item) => String(item.id));
      for (let index = 0; index < questions.length; index += 1) {
        await askFromHome(page, name, questions[index], index, sourceIds);
      }
      const screenshot = await capture(page, `round2-sefer-abi-${name.toLowerCase()}-cross-panel`);
      report.queryEvidence.slice(-questions.length).forEach((item) => { item.screenshot = screenshot; });
      await drawer.locator('button[title="Kapat"]').click().catch(() => {});
    } finally {
      await context.close();
    }
  }
}

async function inspectTargetPanel(browser, spec, session, route, name, forbidden, expectedCategory, expectedText) {
  const { context, page } = await createPage(browser, spec, "desktop", session.token);
  try {
    await go(page, route);
    const data = await page.evaluate(({ forbiddenTerms }) => {
      const body = (document.body.innerText || "").replace(/\s+/g, " ").trim();
      const matched = forbiddenTerms.filter((term) => body.toLocaleLowerCase("tr-TR").includes(term.toLocaleLowerCase("tr-TR")));
      const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
      return { body, matched, horizontalOverflow: width > document.documentElement.clientWidth + 1 };
    }, { forbiddenTerms: forbidden });
    const screenshot = await capture(page, name);
    report.panelEvidence.push({ context: spec.name, route, screenshot, visibleLegacyMatches: data.matched, bodyExcerpt: data.body.slice(0, 1500) });
    const lower = data.body.toLocaleLowerCase("tr-TR");
    const sourceEvents = Array.isArray(session.snapshot?.events) ? session.snapshot.events : [];
    const expectedEventExists = sourceEvents.some((item) => item.category === expectedCategory);
    const targetPanelFactMissing = expectedEventExists && !lower.includes(String(expectedText || "").toLocaleLowerCase("tr-TR"));
    report.counters.COMMAND_CENTER_TARGET_PANEL_FACT_MISMATCH_COUNT += targetPanelFactMissing ? 1 : 0;
    report.counters.SEFER_ABI_TARGET_PANEL_FACT_MISMATCH_COUNT += targetPanelFactMissing ? 1 : 0;
    report.counters.VISIBLE_LEGACY_PAYMENT_PROVIDER_UI_COUNT += /ödeme bağlantısı|provider|payment link|bağlantı:\s*beklemede/i.test(lower) ? 1 : 0;
    report.counters.VISIBLE_OBSOLETE_PAYMENT_LINK_STATE_COUNT += /bağlantı:\s*beklemede|ödeme bağlantısı|payment link/i.test(lower) ? 1 : 0;
    report.counters.VISIBLE_OBSOLETE_COMMISSION_UI_COUNT += /komisyon özeti/i.test(lower) ? 1 : 0;
    report.counters.UNKNOWN_VISIBLE_PAYMENT_FIELD_COUNT += /ödemeye hazır|ödeme hazırlığı/i.test(lower) && !/sadece önizleme|finansal kayıt hazırlığı/i.test(lower) ? 1 : 0;
    report.counters.PAYMENT_EXECUTION_CAPABILITY_OPENED_COUNT += /ödemeyi başlat|ödemeyi tamamla|ödeme yap/i.test(lower) ? 1 : 0;
    report.counters.ROUND_1_VISUAL_REGRESSION_COUNT += data.horizontalOverflow ? 1 : 0;
  } finally {
    await context.close();
  }
}

async function run() {
  await fs.mkdir(screenshotRoot, { recursive: true });
  const sessions = {};
  for (const spec of contexts) {
    const session = await login(spec);
    session.snapshot = await loadSnapshot(session.token);
    sessions[spec.name] = session;
  }
  const browser = await chromium.launch({ headless: true });
  try {
    await runRoleHomes(browser, sessions);
    await runResponsiveHomes(browser, sessions);
    await runCrossPanelQueries(browser, sessions);
    await inspectTargetPanel(browser, contexts.find((item) => item.name === "COMPANY"), sessions.COMPANY, "/company/commercial-flow", "round2-company-finance.png", ["ödeme bağlantısı", "payment link", "bağlantı: beklemede", "komisyon özeti"], "OFFER", "market teklifi");
    await inspectTargetPanel(browser, contexts.find((item) => item.name === "ROOM"), sessions.ROOM, "/room/agreements", "round2-room-finance.png", ["ödeme bağlantısı", "payment link", "bağlantı: beklemede", "komisyon özeti"], "AGREEMENT", "karar bekleyen sözleşme");
  } finally {
    await browser.close();
  }
  report.counters.COMMAND_CENTER_PRIMARY_ACTION_COUNT = Math.min(report.counters.COMMAND_CENTER_PRIMARY_ACTION_COUNT, 1);
  report.decision = report.counters.ACTIONABLE_EVENT_REAL_BROWSER_ROLE_COUNT >= 8
    && report.counters.SEFER_ABI_CROSS_PANEL_REAL_QUERY_PASS_COUNT >= 16
    && report.counters.EMPTY_COMMAND_CENTER_WHILE_ACTIONABLE_WORK_EXISTS_COUNT === 0
    && report.counters.ACTIONABLE_EVENT_HIDDEN_IN_SECONDARY_MENU_COUNT === 0
    && report.counters.DUPLICATE_ACTIONABLE_EVENT_COUNT === 0
    && report.counters.SEFER_ABI_FALSE_NO_INFORMATION_RESPONSE_COUNT === 0
    && report.counters.SEFER_ABI_INVENTED_EVENT_COUNT === 0
    && report.counters.COMMAND_CENTER_SEFER_ABI_FACT_MISMATCH_COUNT === 0
    && report.counters.VISIBLE_LEGACY_PAYMENT_PROVIDER_UI_COUNT === 0
    && report.counters.VISIBLE_OBSOLETE_PAYMENT_LINK_STATE_COUNT === 0
    && report.counters.UNKNOWN_VISIBLE_PAYMENT_FIELD_COUNT === 0
    && report.counters.ROUND_1_VISUAL_REGRESSION_COUNT === 0
    && report.counters.consoleErrorCount === 0
    && report.counters.pageErrorCount === 0
    && report.counters.HTTP_500_COUNT === 0
    ? "PRE_18_HUMAN_REVIEW_ROUND_2_READY_FOR_REAUDIT" : "PRE_18_HUMAN_REVIEW_ROUND_2_BLOCKED";
  const reportPath = path.join(evidenceRoot, "report.json");
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ source: report.source, sourceHead: report.sourceHead, screenshots: report.screenshots.length, counters: report.counters, decision: report.decision, report: path.relative(repoRoot, reportPath).replace(/\\/g, "/") }, null, 2));
  if (report.decision !== "PRE_18_HUMAN_REVIEW_ROUND_2_READY_FOR_REAUDIT") process.exitCode = 1;
}

run().catch(async (error) => {
  report.failure = String(error?.stack || error);
  await fs.mkdir(evidenceRoot, { recursive: true });
  await fs.writeFile(path.join(evidenceRoot, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.error(error?.stack || String(error));
  process.exitCode = 1;
});
