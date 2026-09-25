import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const web = (process.env.WEB_BASE_URL || "https://knife-trip-liable-spyware.trycloudflare.com").replace(/\/$/, "");
const reportPath = path.join(root, "package1-remaining-two-targeted-report.json");
const password = process.env.DEMO_PASSWORD || "demo123";
const driverDevice = process.env.DRIVER_BROWSER_DEVICE_ID || "web-vos7tyh6mtpo1gze";

const accounts = {
  SUPER_ADMIN: { role: "SUPER_ADMIN", email: "superadmin@demo.com", home: "/superadmin" },
  ROOM: { role: "ROOM", email: "room@demo.com", home: "/room/offers" },
  DRIVER: { role: "DRIVER", email: "driver@demo.com", home: "/driver/today" },
};

const counters = Object.fromEntries([
  "FRESHNESS_OPERATION_LOSS_COUNT",
  "UNCERTAINTY_REASONING_FAILURE_COUNT",
  "EVIDENCE_SUFFICIENCY_OPERATION_LOSS_COUNT",
  "TYPED_REASONING_FALLTHROUGH_TO_LEGACY_HELP_COUNT",
  "DECISION_LANGUAGE_FALSE_STATUS_FIELD_COUNT",
  "DISCOURSE_REFERENCE_RESOLUTION_FAILURE_COUNT",
  "SAME_AUTH_FIELD_LOOKUP_ENTITY_LOSS_COUNT",
  "FIELD_LOOKUP_SCREEN_DOMAIN_SUBSTITUTION_COUNT",
  "ENTITYLESS_FIELD_FIRST_FACT_SUBSTITUTION_COUNT",
  "AMBIGUOUS_FIELD_LOOKUP_WITHOUT_CLARIFICATION_COUNT",
  "RELATION_QUERY_PROMOTED_TO_COMPARISON_COUNT",
  "OFF_TOPIC_CONTEXT_CORRUPTION_COUNT",
  "DRIVER_PHANTOM_ACTIVE_ASSIGNMENT_COUNT",
  "STALE_DATA_PRESENTED_AS_CURRENT_COUNT",
  "CONSOLE_ERROR_COUNT",
  "PAGE_ERROR_COUNT",
  "HTTP_500_COUNT",
  "UNEXPLAINED_HTTP_403_COUNT",
  "RENDERED_ANSWER_FAILURE_COUNT",
  "SETTLED_QUERY_FAILURE_COUNT",
].map((name) => [name, 0]));

const report = {
  generatedAt: new Date().toISOString(),
  mode: "package1-remaining-two-root-causes-targeted-public-tunnel",
  runtime: { web, realUiLifecycle: true, syntheticEntityInjection: false, helperOnlyQueries: false },
  coverage: { roles: new Set(), settledQueries: 0, targetedQueries: 0, adjacentQueries: 0 },
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
  await page.waitForTimeout(1800);
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

async function ask(session, query, category = "targeted") {
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
  report.coverage[category === "adjacent" ? "adjacentQueries" : "targetedQueries"] += 1;
  report.probes.push({ role: session.role, query, category, status: result.status, task: taskOf(body), reply: replyOf(result), plan: body?.semanticPlan || null });
  if (result.status !== 200) fail("SETTLED_QUERY_FAILURE_COUNT", `${session.role}:${query}:HTTP_${result.status}`);
  if (!renderedConfirmed) fail("RENDERED_ANSWER_FAILURE_COUNT", `${session.role}:${query}`);
  return result;
}

function expectTask(session, result, expected, counter) {
  if (taskOf(result.body) !== expected) fail(counter, `${session.role}:${result.query}:expected=${expected}:actual=${taskOf(result.body)}`);
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

async function superAdminTargeted(browser) {
  const session = await openSession(browser, accounts.SUPER_ADMIN);
  try {
    await ask(session, "hangi konuyu önce ele almalıyım", "adjacent");
    for (const [query, task, counter] of [
      ["son değerlendirme güncelliğini koruyor mu", "FRESHNESS_CHECK", "FRESHNESS_OPERATION_LOSS_COUNT"],
      ["en son tazeleme zamanını doğrular mısın", "FRESHNESS_CHECK", "FRESHNESS_OPERATION_LOSS_COUNT"],
      ["bu bulgunun doğruluğundan emin miyiz", "UNCERTAINTY_CHECK", "UNCERTAINTY_REASONING_FAILURE_COUNT"],
      ["mevcut kanıt karar vermeye yeterli mi", "EVIDENCE_SUFFICIENCY", "EVIDENCE_SUFFICIENCY_OPERATION_LOSS_COUNT"],
      ["veriler karar almak için yeterince sağlam mı", "EVIDENCE_SUFFICIENCY", "EVIDENCE_SUFFICIENCY_OPERATION_LOSS_COUNT"],
    ]) {
      const result = await ask(session, query);
      expectTask(session, result, task, counter);
      const plan = result.body?.semanticPlan || {};
      if (task === "EVIDENCE_SUFFICIENCY" && (plan.requestedFields || []).some((field) => field.key === "STATUS")) {
        fail("DECISION_LANGUAGE_FALSE_STATUS_FIELD_COUNT", `${session.role}:${query}`);
      }
      if (/sistem durumu bandini incele|maliyet aciklamasi|baglami netlestirmem gerekiyor/iu.test(norm(replyOf(result)))) {
        fail("TYPED_REASONING_FALLTHROUGH_TO_LEGACY_HELP_COUNT", `${session.role}:${query}:${replyOf(result)}`);
      }
    }
  } finally {
    await session.context.close();
  }
}

function assertRoomOfferAnswer(session, result, offerId) {
  expectTask(session, result, "FIELD_LOOKUP", "DISCOURSE_REFERENCE_RESOLUTION_FAILURE_COUNT");
  const plan = result.body?.semanticPlan || {};
  if (Number(plan.entity?.id || 0) !== offerId || String(plan.entity?.type || "").toLowerCase() !== "offer") {
    fail("SAME_AUTH_FIELD_LOOKUP_ENTITY_LOSS_COUNT", `${session.role}:${result.query}:${JSON.stringify(plan.entity || null)}`);
  }
  if ((plan.requestedDomains || []).some((domain) => ["SHIFTS", "OPERATIONS"].includes(domain))) {
    fail("FIELD_LOOKUP_SCREEN_DOMAIN_SUBSTITUTION_COUNT", `${session.role}:${result.query}:${(plan.requestedDomains || []).join(",")}`);
  }
  if (!new RegExp(`teklif\\s*#?\\s*${offerId}`, "iu").test(replyOf(result))) {
    fail("SAME_AUTH_FIELD_LOOKUP_ENTITY_LOSS_COUNT", `${session.role}:${result.query}:${replyOf(result)}`);
  }
}

async function roomTargeted(browser) {
  const session = await openSession(browser, accounts.ROOM);
  try {
    const selected = await selectRoomOffer(session);
    const offerId = Number(selected.entityId);
    const relation = await ask(session, "bu teklif hangi vardiyaya bağlı", "adjacent");
    expectTask(session, relation, "RELATION_LOOKUP", "RELATION_QUERY_PROMOTED_TO_COMPARISON_COUNT");
    if (/karsilastir|farkli|anlasma karsilastirmasi/iu.test(norm(replyOf(relation)))) fail("RELATION_QUERY_PROMOTED_TO_COMPARISON_COUNT", `ROOM:${replyOf(relation)}`);

    await session.page.goto(`${web}/#/room/shifts`, { waitUntil: "domcontentloaded" });
    await session.page.waitForTimeout(1000);
    for (const query of [
      "konuştuğumuz kaydın statüsü nedir",
      "sözünü ettiğimiz kaydın güncel durumu ne",
      "demin konuştuğumuz teklif hangi durumda",
      "az önceki kaydın durumu neydi",
    ]) assertRoomOfferAnswer(session, await ask(session, query), offerId);

    await session.page.goto(`${web}/#/room/offers`, { waitUntil: "domcontentloaded" });
    await session.page.waitForTimeout(1000);
    await selectRoomOffer(session);
    const comparison = await ask(session, "35 ile 34 arasındaki durum farkını karşılaştır", "adjacent");
    expectTask(session, comparison, "COMPARISON", "RELATION_QUERY_PROMOTED_TO_COMPARISON_COUNT");
    await session.page.goto(`${web}/#/room/shifts`, { waitUntil: "domcontentloaded" });
    await session.page.waitForTimeout(1000);
    const ambiguous = await ask(session, "bahsettiğimiz kaydın statüsü ne");
    expectTask(session, ambiguous, "CLARIFY", "AMBIGUOUS_FIELD_LOOKUP_WITHOUT_CLARIFICATION_COUNT");
    if (!/hangi kayit|netlestir|belirt/iu.test(norm(replyOf(ambiguous)))) fail("AMBIGUOUS_FIELD_LOOKUP_WITHOUT_CLARIFICATION_COUNT", `ROOM:${replyOf(ambiguous)}`);
    const plan = ambiguous.body?.semanticPlan || {};
    if (plan.entity) fail("ENTITYLESS_FIELD_FIRST_FACT_SUBSTITUTION_COUNT", `ROOM:${JSON.stringify(plan.entity)}`);

    const offTopic = await ask(session, "kahvenin kokusu hakkında bir dize yaz", "adjacent");
    expectTask(session, offTopic, "OFF_TOPIC", "OFF_TOPIC_CONTEXT_CORRUPTION_COUNT");
  } finally {
    await session.context.close();
  }
}

async function driverAdjacent(browser) {
  const session = await openSession(browser, accounts.DRIVER);
  try {
    const result = await ask(session, "şu an bağlı olduğum araç hangisi", "adjacent");
    const visible = norm(replyOf(result));
    if (/34\s*abc\s*123/iu.test(visible) && /aktif|mevcut|su an|simdi/iu.test(visible)) fail("DRIVER_PHANTOM_ACTIVE_ASSIGNMENT_COUNT", `DRIVER:${replyOf(result)}`);
    if (/gecmis.*(?:aktif|mevcut)|aktif.*gecmis/iu.test(visible)) fail("STALE_DATA_PRESENTED_AS_CURRENT_COUNT", `DRIVER:${replyOf(result)}`);
  } finally {
    await session.context.close();
  }
}

let fatalError = null;
const browser = await chromium.launch({ headless: true });
try {
  await superAdminTargeted(browser);
  await roomTargeted(browser);
  await driverAdjacent(browser);
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
await (await import("node:fs/promises")).writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ reportPath, coverage: report.coverage, counters, blockerCount: report.blockerCount, majorCount: report.majorCount, fatalError }, null, 2));
process.exitCode = report.blockerCount || report.majorCount ? 1 : 0;
