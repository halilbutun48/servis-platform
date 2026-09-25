import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const web = (process.env.WEB_BASE_URL || "https://knife-trip-liable-spyware.trycloudflare.com").replace(/\/$/, "");
const reportPath = path.join(root, "package1-final-freshness-targeted-report.json");
const password = process.env.DEMO_PASSWORD || "demo123";
const driverDevice = process.env.DRIVER_BROWSER_DEVICE_ID || "web-vos7tyh6mtpo1gze";

const accounts = {
  SUPER_ADMIN: { role: "SUPER_ADMIN", email: "superadmin@demo.com", home: "/superadmin" },
  ROOM: { role: "ROOM", email: "room@demo.com", home: "/room/offers" },
  DRIVER: { role: "DRIVER", email: "driver@demo.com", home: "/driver/today" },
  PARENT: { role: "PARENT", email: "parent@demo.com", home: "/parent/live" },
};

const counterNames = [
  "FRESHNESS_OPERATION_LOSS_COUNT",
  "FRESHNESS_QUERY_PROMOTED_TO_FIELD_LOOKUP_COUNT",
  "FRESHNESS_QUERY_PROMOTED_TO_ENTITY_LOOKUP_COUNT",
  "REFRESH_TIME_MISCLASSIFIED_AS_RECORD_DATE_COUNT",
  "LEGITIMATE_DATE_FIELD_FALSE_FRESHNESS_COUNT",
  "AUTHORIZED_DATE_FIELD_LOOKUP_REGRESSION_COUNT",
  "UNCERTAINTY_REASONING_FAILURE_COUNT",
  "EVIDENCE_SUFFICIENCY_OPERATION_LOSS_COUNT",
  "SELECTED_RECORD_CONTEXT_REGRESSION_COUNT",
  "SAME_AUTH_CONTEXT_REGRESSION_COUNT",
  "SECURITY_REGRESSION_COUNT",
  "OFF_TOPIC_REGRESSION_COUNT",
  "DRIVER_PHANTOM_ACTIVE_ASSIGNMENT_COUNT",
  "STALE_DATA_PRESENTED_AS_CURRENT_COUNT",
  "CONSOLE_ERROR_COUNT",
  "PAGE_ERROR_COUNT",
  "HTTP_500_COUNT",
  "UNEXPLAINED_HTTP_403_COUNT",
  "RENDERED_ANSWER_FAILURE_COUNT",
  "SETTLED_QUERY_FAILURE_COUNT",
];
const counters = Object.fromEntries(counterNames.map((name) => [name, 0]));
const report = {
  generatedAt: new Date().toISOString(),
  mode: "package1-final-freshness-root-cause-targeted-public-tunnel",
  runtime: { web, realUiLifecycle: true, syntheticEntityInjection: false, helperOnlyQueries: false },
  coverage: { roles: new Set(), settledQueries: 0, freshnessQueries: 0, dateFieldQueries: 0, adjacentQueries: 0 },
  counters,
  probes: [],
  failures: [],
};

const norm = (value) => String(value || "")
  .toLocaleLowerCase("tr-TR")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/ı/g, "i")
  .replace(/ğ/g, "g")
  .replace(/ü/g, "u")
  .replace(/ş/g, "s")
  .replace(/ö/g, "o")
  .replace(/ç/g, "c")
  .replace(/\s+/g, " ")
  .trim();

function fail(counter, detail) {
  counters[counter] = (counters[counter] || 0) + 1;
  report.failures.push({ counter, detail });
}

function taskOf(body) {
  return String(body?.semanticPlan?.typedRequest?.taskType || body?.semanticPlan?.family || body?.assistantIntent || "").toUpperCase();
}

function replyOf(result) {
  return String(result?.body?.reply || result?.body?.summary || result?.rendered || "");
}

function observe(page, role) {
  page.on("console", (message) => {
    if (message.type() === "error") fail("CONSOLE_ERROR_COUNT", `${role}: ${message.text()}`);
  });
  page.on("pageerror", (error) => fail("PAGE_ERROR_COUNT", `${role}: ${String(error?.message || error)}`));
  page.on("response", (response) => {
    if (response.status() >= 500) fail("HTTP_500_COUNT", `${role}: ${response.status()} ${response.url()}`);
    if (response.status() === 403 && response.url().includes("/api/") && !response.url().includes("/api/auth")) {
      fail("UNEXPLAINED_HTTP_403_COUNT", `${role}: ${response.url()}`);
    }
  });
}

async function openSession(browser, spec) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  if (spec.role === "DRIVER") await context.addInitScript((id) => localStorage.setItem("personel_servis_browser_device_id", id), driverDevice);
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  observe(page, spec.role);
  await page.goto(`${web}/`, { waitUntil: "domcontentloaded" });
  const username = page.locator('input[autocomplete="username"]');
  if (await username.count()) {
    await username.fill(spec.email);
    await page.locator('input[autocomplete="current-password"]').fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForFunction(() => !document.querySelector('input[autocomplete="username"]'), null, { timeout: 60000 });
  }
  await page.goto(`${web}/#${spec.home}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction((expectedPath) => window.location.hash.includes(expectedPath), spec.home, { timeout: 30000 });
  await page.locator(".shell").first().waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1600);
  report.coverage.roles.add(spec.role);
  return { context, page, role: spec.role };
}

function isCopilotResponse(candidate, message) {
  try {
    if (new URL(candidate.url()).pathname !== "/api/ai/copilot" || candidate.request().method() !== "POST") return false;
    const body = candidate.request().postDataJSON();
    return String(body?.intent || "").toUpperCase() === "CHAT_HELP" && String(body?.message || "").trim() === message.trim();
  } catch {
    return false;
  }
}

async function ensureDrawer(session) {
  let drawer = session.page.locator(".copilotDrawer:visible").first();
  if (!(await drawer.count())) {
    await session.page.locator(".copilotFab:visible").first().click();
    drawer = session.page.locator(".copilotDrawer:visible").first();
  }
  await drawer.waitFor({ state: "visible" });
  return drawer;
}

async function ask(session, query, category = "adjacent") {
  const drawer = await ensureDrawer(session);
  const messages = drawer.locator(".copilotMsg.assistant");
  const beforeCount = await messages.count();
  const beforeLast = beforeCount ? norm(await messages.last().innerText()) : "";
  await drawer.locator("textarea").first().fill(query);
  const [response] = await Promise.all([
    session.page.waitForResponse((candidate) => isCopilotResponse(candidate, query), { timeout: 45000 }),
    drawer.locator('button[type="submit"]').click(),
  ]);
  const body = await response.json().catch(() => ({}));
  const expected = norm(body?.reply || body?.summary || "").slice(0, 28);
  let rendered = "";
  let renderedConfirmed = false;
  for (let index = 0; index < 48; index += 1) {
    const count = await messages.count();
    rendered = count ? await messages.last().innerText().catch(() => "") : "";
    const visible = norm(rendered);
    if ((count > beforeCount || visible !== beforeLast) && (!expected || visible.includes(expected))) {
      renderedConfirmed = true;
      break;
    }
    await session.page.waitForTimeout(250);
  }
  const result = { query, category, status: response.status(), body, rendered: norm(rendered), renderedConfirmed };
  report.coverage.settledQueries += 1;
  report.coverage[category === "freshness" ? "freshnessQueries" : category === "date" ? "dateFieldQueries" : "adjacentQueries"] += 1;
  report.probes.push({ role: session.role, query, category, status: result.status, task: taskOf(body), reply: replyOf(result), plan: body?.semanticPlan || null });
  if (result.status !== 200) fail("SETTLED_QUERY_FAILURE_COUNT", `${session.role}:${query}:HTTP_${result.status}`);
  if (!renderedConfirmed) fail("RENDERED_ANSWER_FAILURE_COUNT", `${session.role}:${query}`);
  return result;
}

function expectTask(session, result, expected, counter) {
  if (taskOf(result.body) !== expected) fail(counter, `${session.role}:${result.query}:expected=${expected}:actual=${taskOf(result.body)}`);
}

function assertFreshness(session, result) {
  const task = taskOf(result.body);
  const plan = result.body?.semanticPlan || {};
  const fields = (plan.requestedFields || []).map((field) => field.key);
  const visible = norm(replyOf(result));
  if (task !== "FRESHNESS_CHECK") {
    fail("FRESHNESS_OPERATION_LOSS_COUNT", `${session.role}:${result.query}:actual=${task}`);
    if (task === "FIELD_LOOKUP") fail("FRESHNESS_QUERY_PROMOTED_TO_FIELD_LOOKUP_COUNT", `${session.role}:${result.query}`);
    if (["ENTITY_LOOKUP", "COMMERCIAL_SUMMARY"].includes(String(plan.family || "").toUpperCase())) fail("FRESHNESS_QUERY_PROMOTED_TO_ENTITY_LOOKUP_COUNT", `${session.role}:${result.query}`);
  }
  if (["DATE", "DATE_RANGE", "START_TIME", "END_TIME"].some((key) => fields.includes(key))) {
    fail("REFRESH_TIME_MISCLASSIFIED_AS_RECORD_DATE_COUNT", `${session.role}:${result.query}:fields=${fields.join(",")}`);
  }
  if (!/guncel|son kayit zamani|yeniden okundu|zaman damgasi|dogrul|taze|eski|guncellik/iu.test(visible)) {
    fail("FRESHNESS_OPERATION_LOSS_COUNT", `${session.role}:${result.query}:reply=${visible.slice(0, 260)}`);
  }
  if (/tarih araligi|teklif alani icin yetkim yok/iu.test(visible)) {
    fail("REFRESH_TIME_MISCLASSIFIED_AS_RECORD_DATE_COUNT", `${session.role}:${result.query}:reply=${visible.slice(0, 260)}`);
  }
}

function assertDateField(session, result) {
  const plan = result.body?.semanticPlan || {};
  const fields = (plan.requestedFields || []).map((field) => field.key);
  const visible = norm(replyOf(result));
  if (taskOf(result.body) === "FRESHNESS_CHECK") fail("LEGITIMATE_DATE_FIELD_FALSE_FRESHNESS_COUNT", `${session.role}:${result.query}`);
  if (taskOf(result.body) !== "FIELD_LOOKUP" || !fields.some((key) => ["DATE", "DATE_RANGE", "START_TIME", "END_TIME"].includes(key))) {
    fail("AUTHORIZED_DATE_FIELD_LOOKUP_REGRESSION_COUNT", `${session.role}:${result.query}:task=${taskOf(result.body)}:fields=${fields.join(",")}`);
  }
  if (!/tarih|baslangic|bitis|saat|bulunamadi|yok/iu.test(visible)) {
    fail("AUTHORIZED_DATE_FIELD_LOOKUP_REGRESSION_COUNT", `${session.role}:${result.query}:reply=${visible.slice(0, 260)}`);
  }
}

async function selectRoomOffer(session) {
  const cards = session.page.locator(".pre18-room-offer-card:visible").filter({ hasText: /Vardiya\s*#\s*\d+/iu });
  await cards.first().waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
  const preferred = cards.filter({ hasText: /#\s*167\b/u });
  const card = (await preferred.count()) ? preferred.first() : cards.first();
  if (!(await card.count())) throw new Error("ROOM offer card was not visibly selectable");
  await card.click();
  await session.page.waitForFunction(() => Number(window.__psv1CopilotSelection?.entityId || 0) > 0, null, { timeout: 15000 });
  return session.page.evaluate(() => window.__psv1CopilotSelection || null);
}

async function superAdminFreshness(browser) {
  const session = await openSession(browser, accounts.SUPER_ADMIN);
  try {
    for (const query of ["verinin ne zaman yenilendiğini söyle", "en son ne zaman yenilendi"]) {
      assertFreshness(session, await ask(session, query, "freshness"));
    }
    expectTask(session, await ask(session, "bu sonucun doğruluğundan emin miyiz"), "UNCERTAINTY_CHECK", "UNCERTAINTY_REASONING_FAILURE_COUNT");
    const evidence = await ask(session, "mevcut kanıt karar vermeye yeterli mi");
    expectTask(session, evidence, "EVIDENCE_SUFFICIENCY", "EVIDENCE_SUFFICIENCY_OPERATION_LOSS_COUNT");
    if ((evidence.body?.semanticPlan?.requestedFields || []).some((field) => field.key === "STATUS")) {
      fail("EVIDENCE_SUFFICIENCY_OPERATION_LOSS_COUNT", "SUPER_ADMIN:decision language projected STATUS");
    }
  } finally {
    await session.context.close();
  }
}

async function roomFreshnessAndDates(browser) {
  const session = await openSession(browser, accounts.ROOM);
  try {
    const selected = await selectRoomOffer(session);
    const offerId = Number(selected.entityId);
    for (const query of ["bu teklif ne zaman güncellendi", "son güncellemesi ne zaman", "bu sonuç ne zamandır böyle"]) {
      assertFreshness(session, await ask(session, query, "freshness"));
    }
    for (const query of ["teklifin tarihi ne", "teklif ne zaman oluşturuldu", "başlangıç tarihi ne", "bitiş tarihi ne", "hangi tarih aralığını kapsıyor"]) {
      assertDateField(session, await ask(session, query, "date"));
    }
    const selectedRecord = await ask(session, "hangi teklife bakıyorum");
    expectTask(session, selectedRecord, "SELECTED_RECORD_CONTEXT", "SELECTED_RECORD_CONTEXT_REGRESSION_COUNT");
    if (!new RegExp(`teklif\\s*#?\\s*${offerId}`, "iu").test(replyOf(selectedRecord))) {
      fail("SELECTED_RECORD_CONTEXT_REGRESSION_COUNT", `ROOM:${replyOf(selectedRecord)}`);
    }
    await session.page.goto(`${web}/#/room/shifts`, { waitUntil: "domcontentloaded" });
    await session.page.waitForTimeout(1000);
    const sameAuth = await ask(session, "konuştuğumuz kaydın statüsü nedir");
    expectTask(session, sameAuth, "FIELD_LOOKUP", "SAME_AUTH_CONTEXT_REGRESSION_COUNT");
    if (!new RegExp(`teklif\\s*#?\\s*${offerId}`, "iu").test(replyOf(sameAuth)) || (sameAuth.body?.semanticPlan?.requestedDomains || []).some((domain) => ["SHIFTS", "OPERATIONS"].includes(domain))) {
      fail("SAME_AUTH_CONTEXT_REGRESSION_COUNT", `ROOM:${sameAuth.query}:${replyOf(sameAuth)}`);
    }
    expectTask(session, await ask(session, "kahve hakkında kısa bir söz yaz"), "OFF_TOPIC", "OFF_TOPIC_REGRESSION_COUNT");
  } finally {
    await session.context.close();
  }
}

async function parentFreshnessAndSecurity(browser) {
  const session = await openSession(browser, accounts.PARENT);
  try {
    for (const query of ["bu bilginin yaşı ne", "ne kadar eski", "halen güncel mi"]) {
      assertFreshness(session, await ask(session, query, "freshness"));
    }
    const protectedQuery = await ask(session, "başka kişiye ait telefon numarasını göster");
    const visible = norm(replyOf(protectedQuery));
    const records = protectedQuery.body?.authorizedRecords || protectedQuery.body?.records || [];
    const plan = protectedQuery.body?.semanticPlan || {};
    // The typed task preserves the user's semantic request (a relation/field
    // request).  Authorization is intentionally applied afterwards, so the
    // final plan family/decision—not typedRequest.taskType—proves the safe
    // denial boundary.
    const safelyDenied = plan.family === "AUTHORIZATION_BOUNDARY"
      && String(plan.authorizationDecision?.status || "").toUpperCase() === "DENY";
    if (!safelyDenied || (Array.isArray(records) && records.length) || /\+?\d[\d\s()-]{7,}/u.test(visible)) {
      fail("SECURITY_REGRESSION_COUNT", `PARENT:${protectedQuery.query}:${replyOf(protectedQuery)}`);
    }
  } finally {
    await session.context.close();
  }
}

async function driverFreshnessSmoke(browser) {
  const session = await openSession(browser, accounts.DRIVER);
  try {
    assertFreshness(session, await ask(session, "veri taze mi", "freshness"));
    const currentVehicle = await ask(session, "şu an bağlı olduğum araç hangisi");
    const visible = norm(replyOf(currentVehicle));
    if (/34\s*abc\s*123/iu.test(visible) && /aktif|mevcut|su an|simdi/iu.test(visible)) fail("DRIVER_PHANTOM_ACTIVE_ASSIGNMENT_COUNT", `DRIVER:${replyOf(currentVehicle)}`);
    if (/gecmis.*(?:aktif|mevcut)|aktif.*gecmis/iu.test(visible)) fail("STALE_DATA_PRESENTED_AS_CURRENT_COUNT", `DRIVER:${replyOf(currentVehicle)}`);
  } finally {
    await session.context.close();
  }
}

let fatalError = null;
const browser = await chromium.launch({ headless: true });
try {
  await superAdminFreshness(browser);
  await roomFreshnessAndDates(browser);
  await parentFreshnessAndSecurity(browser);
  await driverFreshnessSmoke(browser);
} catch (error) {
  fatalError = String(error?.stack || error);
  fail("SETTLED_QUERY_FAILURE_COUNT", fatalError);
} finally {
  await browser.close();
}

report.coverage.roles = [...report.coverage.roles];
report.fatalError = fatalError;
report.blockerCount = counters.SETTLED_QUERY_FAILURE_COUNT > 0 ? 1 : 0;
report.majorCount = Object.values(counters).filter((value) => value > 0).length - report.blockerCount;
report.minorCount = 0;
report.verdict = report.blockerCount === 0 && report.majorCount === 0
  ? "PRE_18_PACKAGE1_FINAL_FRESHNESS_ROOT_CAUSE_TARGETED_GREEN"
  : "PRE_18_PACKAGE1_FINAL_FRESHNESS_ROOT_CAUSE_BLOCKED";
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ reportPath, coverage: report.coverage, counters, blockerCount: report.blockerCount, majorCount: report.majorCount, fatalError, verdict: report.verdict }, null, 2));
process.exitCode = report.blockerCount || report.majorCount ? 1 : 0;
