import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const web = (process.env.WEB_BASE_URL || "https://knife-trip-liable-spyware.trycloudflare.com").replace(/\/$/, "");
const reportPath = path.resolve(process.env.CONSOLIDATED_CORRECTIVE_REPORT_PATH || path.join(root, "package1-consolidated-corrective-report.json"));
const password = process.env.DEMO_PASSWORD || "demo123";
const driverDevice = process.env.DRIVER_BROWSER_DEVICE_ID || "web-vos7tyh6mtpo1gze";

const roles = [
  { role: "SUPER_ADMIN", email: "superadmin@demo.com", home: "/superadmin" },
  { role: "ROOM", email: "room@demo.com", home: "/room/offers" },
  { role: "COMPANY", email: "company@demo.com", home: "/company/shifts" },
  { role: "SCHOOL", email: "school@demo.com", home: "/school/operations" },
  { role: "ORGANIZATION", email: "organization@demo.com", home: "/organization/operations" },
  { role: "DRIVER", email: "driver@demo.com", home: "/driver/today" },
  { role: "PERSONEL", email: "personel@demo.com", home: "/personel/my" },
  { role: "PARENT", email: "parent@demo.com", home: "/parent/live" },
];

const hardCounterNames = [
  "PRIORITY_QUERY_MISROUTED_COUNT", "NEXT_ACTION_OFF_TOPIC_MISROUTE_COUNT", "UNCERTAINTY_REASONING_FAILURE_COUNT", "FRESHNESS_OPERATION_LOSS_COUNT",
  "AMBIGUOUS_REFERENCE_DEFAULT_ENTITY_COUNT", "AMBIGUOUS_REFERENCE_UNJUSTIFIED_RESOLUTION_COUNT", "AMBIGUITY_RETRIEVAL_BEFORE_CLARIFICATION_COUNT", "AMBIGUITY_FALLTHROUGH_TO_SUMMARY_COUNT", "AMBIGUITY_FALLTHROUGH_TO_OFF_TOPIC_COUNT",
  "SAME_AUTH_ROUTE_CONTEXT_LOSS_COUNT", "NEXT_ACTION_WRONG_DOMAIN_COUNT", "FOLLOWUP_TASK_SUBSTITUTION_COUNT",
  "TOPIC_PIVOT_FAILURE_COUNT", "RETURN_TO_PRODUCT_CONTEXT_FAILURE_COUNT", "OFF_TOPIC_CONTEXT_CORRUPTION_COUNT", "RETURN_RESTORED_DOMAIN_ONLY_COUNT",
  "STYLE_ADAPTATION_FAILURE_COUNT", "STYLE_MULTI_ENTITY_CONTEXT_FAILURE_COUNT", "STYLE_OUTPUT_CONSTRAINT_IGNORED_COUNT",
  "SCOPE_RECOGNITION_FAILURE_COUNT", "EXTERNAL_SCOPE_MORPHOLOGY_LOSS_COUNT", "AUTHORIZED_QUERY_FALSE_DENIAL_COUNT",
  "CLARIFICATION_PREAUTH_LIVE_IDENTIFIER_DISCLOSURE_COUNT", "UNRELATED_LIVE_IDENTIFIER_DISCLOSURE_COUNT", "CLARIFICATION_REAL_RECORD_EXAMPLE_INJECTION_COUNT", "UNAUTHORIZED_ENTITY_EXISTENCE_DISCLOSURE_COUNT",
  "USER_VISIBLE_AUTHORIZATION_METADATA_COUNT", "USER_VISIBLE_RETRIEVAL_METADATA_COUNT", "USER_VISIBLE_INTERNAL_META_SUMMARY_COUNT", "USER_VISIBLE_INTERNAL_DOMAIN_TOKEN_COUNT", "USER_VISIBLE_UNNORMALIZED_TECHNICAL_TERM_COUNT",
  "USER_VISIBLE_BACKEND_ENUM_LEAK_COUNT", "USER_VISIBLE_TURKISH_COPY_DEFECT_COUNT", "USER_VISIBLE_UNNATURAL_MORPHOLOGY_COUNT", "FINAL_NORMALIZER_BYPASS_COUNT",
  "CROSS_TENANT_DATA_LEAK_COUNT", "SENSITIVE_FIELD_DISCLOSURE_COUNT", "RAW_PERSONAL_DATA_DISCLOSURE_COUNT", "UNAUTHORIZED_COORDINATE_DISCLOSURE_COUNT", "SECRET_FIELD_DISCLOSURE_COUNT",
  "CROSS_AUTH_CONTEXT_LEAK_COUNT", "PREVIOUS_AUTH_ENTITY_RECALL_COUNT", "DRIVER_PHANTOM_ACTIVE_ASSIGNMENT_COUNT", "STALE_DATA_PRESENTED_AS_CURRENT_COUNT", "FACT_MISMATCH_COUNT",
  "CONSOLE_ERROR_COUNT", "PAGE_ERROR_COUNT", "HTTP_500_COUNT", "UNEXPLAINED_HTTP_403_COUNT", "RENDERED_ANSWER_FAILURE_COUNT", "SETTLED_QUERY_FAILURE_COUNT",
  ...Array.from({ length: 11 }, (_, index) => `HARVEST_${String(index + 1).padStart(3, "0")}_REGRESSION_FAIL_COUNT`),
];
const counters = Object.fromEntries(hardCounterNames.map((name) => [name, 0]));
const report = {
  generatedAt: new Date().toISOString(),
  mode: "package1-consolidated-corrective-targeted-public-tunnel",
  runtime: { web, realUiLifecycle: true, syntheticEntityInjection: false, helperOnlyQueries: false, freshContexts: 0 },
  coverage: { roles: new Set(), settledQueries: 0, targetedQueries: 0, adjacentQueries: 0, conversationChains: 0 },
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
  if (!(counter in counters)) counters[counter] = 0;
  counters[counter] += 1;
  report.failures.push({ counter, detail });
}

function taskOf(body) {
  return String(body?.semanticPlan?.typedRequest?.taskType || body?.semanticPlan?.family || body?.assistantIntent || "").toUpperCase();
}

function visiblePayloadText(body, rendered) {
  const sections = Array.isArray(body?.responseSections) ? body.responseSections.flatMap((section) => [section?.title, section?.body]) : [];
  return norm([rendered, body?.reply, body?.summary, body?.reasoning, body?.nextAction, body?.safeNextStep, ...sections].filter(Boolean).join(" "));
}

function replyText(body) {
  return String(body?.reply || body?.summary || "").trim();
}

function observe(page, role) {
  page.on("console", (message) => {
    if (message.type() === "error") fail("CONSOLE_ERROR_COUNT", `${role}: ${message.text()}`);
  });
  page.on("pageerror", (error) => fail("PAGE_ERROR_COUNT", `${role}: ${String(error?.message || error)}`));
  page.on("response", (response) => {
    if (response.status() >= 500) fail("HTTP_500_COUNT", `${role}: ${response.status()} ${response.url()}`);
    if (response.status() === 403 && response.url().includes("/api/") && !response.url().includes("/api/auth")) fail("UNEXPLAINED_HTTP_403_COUNT", `${role}: ${response.url()}`);
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
  await page.waitForTimeout(2200);
  report.runtime.freshContexts += 1;
  report.coverage.roles.add(spec.role);
  return { context, page, role: spec.role };
}

function isMatchingCopilotResponse(candidate, expectedMessage = null) {
  try {
    if (new URL(candidate.url()).pathname !== "/api/ai/copilot") return false;
    const request = candidate.request();
    if (request.method() !== "POST") return false;
    const body = request.postDataJSON();
    if (String(body?.intent || "").toUpperCase() !== "CHAT_HELP") return false;
    return expectedMessage == null || String(body?.message || "").trim() === String(expectedMessage).trim();
  } catch {
    return false;
  }
}

async function ensureDrawer(session) {
  let drawer = session.page.locator(".copilotDrawer:visible").first();
  if (!(await drawer.count())) {
    const fab = session.page.locator(".copilotFab:visible").first();
    await fab.waitFor({ state: "visible" });
    await fab.click();
    drawer = session.page.locator(".copilotDrawer:visible").first();
  }
  await drawer.waitFor({ state: "visible" });
  return drawer;
}

async function renderedAfterResponse(session, drawer, beforeCount, beforeLast, body) {
  const expected = norm(replyText(body)).slice(0, 48);
  let rendered = "";
  let confirmed = false;
  for (let attempt = 0; attempt < 48; attempt += 1) {
    const messages = drawer.locator(".copilotMsg.assistant");
    const count = await messages.count();
    rendered = count ? await messages.last().innerText().catch(() => "") : "";
    const normalized = norm(rendered);
    if ((count > beforeCount || normalized !== beforeLast) && (!expected || normalized.includes(expected.slice(0, Math.min(expected.length, 28))))) {
      confirmed = true;
      break;
    }
    await session.page.waitForTimeout(250);
  }
  return { rendered: norm(rendered), confirmed };
}

async function askUi(session, query, category = "targeted") {
  const drawer = await ensureDrawer(session);
  const messages = drawer.locator(".copilotMsg.assistant");
  const beforeCount = await messages.count();
  const beforeLast = beforeCount ? norm(await messages.last().innerText()) : "";
  await drawer.locator("textarea").first().fill(query);
  const [response] = await Promise.all([
    session.page.waitForResponse((candidate) => isMatchingCopilotResponse(candidate, query), { timeout: 45000 }),
    drawer.locator('button[type="submit"]').click(),
  ]);
  const body = await response.json().catch(() => ({}));
  const renderedState = await renderedAfterResponse(session, drawer, beforeCount, beforeLast, body);
  const result = { query, category, status: response.status(), body, rendered: renderedState.rendered, renderedConfirmed: renderedState.confirmed };
  report.coverage.settledQueries += 1;
  report.coverage[category === "adjacent" ? "adjacentQueries" : "targetedQueries"] += 1;
  report.probes.push({ role: session.role, query, category, status: result.status, task: taskOf(body), rendered: result.rendered, reply: replyText(body), plan: body?.semanticPlan || null });
  if (result.status !== 200) fail("SETTLED_QUERY_FAILURE_COUNT", `${session.role}:${query}:HTTP_${result.status}`);
  if (!result.renderedConfirmed) fail("RENDERED_ANSWER_FAILURE_COUNT", `${session.role}:${query}:response was not confirmed in rendered assistant message`);
  assertLanguage(session, result);
  return result;
}

async function clickContinue(session, category = "targeted") {
  const drawer = await ensureDrawer(session);
  const button = drawer.getByRole("button", { name: /devamını anlat|devamini anlat/iu }).last();
  if (!(await button.count())) throw new Error(`${session.role}: Devamını anlat control not found`);
  const messages = drawer.locator(".copilotMsg.assistant");
  const beforeCount = await messages.count();
  const beforeLast = beforeCount ? norm(await messages.last().innerText()) : "";
  const [response] = await Promise.all([
    session.page.waitForResponse((candidate) => isMatchingCopilotResponse(candidate, "Devamını anlat"), { timeout: 45000 }),
    button.click(),
  ]);
  const body = await response.json().catch(() => ({}));
  const renderedState = await renderedAfterResponse(session, drawer, beforeCount, beforeLast, body);
  const result = { query: "[button] Devamını anlat", category, status: response.status(), body, rendered: renderedState.rendered, renderedConfirmed: renderedState.confirmed };
  report.coverage.settledQueries += 1;
  report.coverage[category === "adjacent" ? "adjacentQueries" : "targetedQueries"] += 1;
  report.probes.push({ role: session.role, query: result.query, category, status: result.status, task: taskOf(body), rendered: result.rendered, reply: replyText(body), plan: body?.semanticPlan || null });
  if (!result.renderedConfirmed) fail("RENDERED_ANSWER_FAILURE_COUNT", `${session.role}: continuation was not confirmed in rendered assistant message`);
  assertLanguage(session, result);
  return result;
}

function assertLanguage(session, result) {
  const visible = visiblePayloadText(result.body, result.rendered);
  if (/\b(?:done|ready|open|requested|accepted|rejected|pending|in_progress|no_active_shift|shifts|offers|agreements|operations)\b/iu.test(visible)) {
    fail("USER_VISIBLE_BACKEND_ENUM_LEAK_COUNT", `${session.role}:${result.query}:${visible.slice(0, 240)}`);
  }
  if (/\b(?:retrieval|projection|authorization(?:\s+gate)?|canonical|kanonik|tenant|domain|referent|clarification|allow_read|rbac|super_admin)\b/iu.test(visible)) {
    fail("USER_VISIBLE_AUTHORIZATION_METADATA_COUNT", `${session.role}:${result.query}:${visible.slice(0, 240)}`);
  }
  if (/\bretrieval\b/iu.test(visible)) fail("USER_VISIBLE_RETRIEVAL_METADATA_COUNT", `${session.role}:${result.query}`);
  if (/(?:sürücü|surucu)\s+(?:sürücü|surucu)|başkoordinat|baskoordinat/iu.test(visible)) fail("USER_VISIBLE_TURKISH_COPY_DEFECT_COUNT", `${session.role}:${result.query}:${visible.slice(0, 240)}`);
  if (/^\s*[\[{].*[\]}]\s*$/u.test(replyText(result.body))) fail("USER_VISIBLE_INTERNAL_META_SUMMARY_COUNT", `${session.role}:${result.query}`);
}

function assertTask(session, result, expected, counter, harvest) {
  const actual = taskOf(result.body);
  const accepted = Array.isArray(expected) ? expected : [expected];
  if (!accepted.includes(actual)) {
    fail(counter, `${session.role}:${result.query}:expected=${accepted.join("|")}:actual=${actual}`);
    if (harvest) fail(harvest, `${session.role}:${result.query}:actual=${actual}`);
    return false;
  }
  return true;
}

function assertText(session, result, pattern, counter, harvest) {
  const visible = visiblePayloadText(result.body, result.rendered);
  if (!pattern.test(visible)) {
    fail(counter, `${session.role}:${result.query}:missing=${pattern}:text=${visible.slice(0, 280)}`);
    if (harvest) fail(harvest, `${session.role}:${result.query}:missing answer slot`);
    return false;
  }
  return true;
}

function hasLiveLookingIdentifier(value) {
  return /(?:vardiya|teklif|sözleşme|sozlesme)\s*#\s*\d+|araç\s+\d{2}\s*[a-zçğıöşü]{1,3}\s*\d{2,4}/iu.test(String(value || ""));
}

function assertClarification(session, result) {
  const okay = assertTask(session, result, "CLARIFY", "AMBIGUOUS_REFERENCE_UNJUSTIFIED_RESOLUTION_COUNT", "HARVEST_002_REGRESSION_FAIL_COUNT");
  const visible = visiblePayloadText(result.body, result.rendered);
  if (!/netlestir|hangi kayit|hangi konu|belirt/iu.test(visible)) fail("AMBIGUITY_FALLTHROUGH_TO_SUMMARY_COUNT", `${session.role}:${result.query}:${visible.slice(0, 220)}`);
  if (/urun kapsaminin disinda|off.topic/iu.test(visible)) fail("AMBIGUITY_FALLTHROUGH_TO_OFF_TOPIC_COUNT", `${session.role}:${result.query}`);
  const records = result.body?.authorizedRecords || result.body?.records || [];
  if ((Array.isArray(records) && records.length) || result.body?.retrievedFacts?.some((fact) => hasLiveLookingIdentifier(fact))) fail("AMBIGUITY_RETRIEVAL_BEFORE_CLARIFICATION_COUNT", `${session.role}:${result.query}`);
  if (hasLiveLookingIdentifier(replyText(result.body))) fail("CLARIFICATION_REAL_RECORD_EXAMPLE_INJECTION_COUNT", `${session.role}:${result.query}:${replyText(result.body)}`);
  return okay;
}

function assertExternalScope(session, result, { superAdmin = false } = {}) {
  const plan = result.body?.semanticPlan || {};
  const typed = plan.typedRequest || {};
  const explicit = Boolean(typed.explicitExternalScope || plan.explicitExternalScope || plan.crossTenantRequested);
  if (!explicit) {
    fail("EXTERNAL_SCOPE_MORPHOLOGY_LOSS_COUNT", `${session.role}:${result.query}`);
    fail("HARVEST_006_REGRESSION_FAIL_COUNT", `${session.role}:${result.query}:scope lost`);
  }
  const records = result.body?.authorizedRecords || result.body?.records || [];
  if (!superAdmin) {
    const denied = String(plan.authorizationDecision?.status || "").toUpperCase() === "DENY" || result.body?.authorizationBoundary === true;
    if (!denied) fail("SCOPE_RECOGNITION_FAILURE_COUNT", `${session.role}:${result.query}:scope not denied`);
    if (Array.isArray(records) && records.length) fail("CROSS_TENANT_DATA_LEAK_COUNT", `${session.role}:${result.query}:records=${records.length}`);
  }
}

async function selectRoomOffer(session) {
  const cards = session.page.locator(".pre18-room-offer-card:visible").filter({ hasText: /Vardiya\s*#\s*\d+/iu });
  await cards.first().waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
  if (!(await cards.count())) {
    report.failures.push({
      counter: "HARNESS_ROOM_SELECTOR_DIAGNOSTIC",
      detail: `url=${session.page.url()}:visibleText=${norm(await session.page.locator("body").innerText().catch(() => "")).slice(0, 800)}`,
    });
    return null;
  }
  const preferred = cards.filter({ hasText: /#\s*167\b/u });
  const card = (await preferred.count()) ? preferred.first() : cards.first();
  await card.click();
  await session.page.waitForFunction(() => Number(window.__psv1CopilotSelection?.entityId || 0) > 0, null, { timeout: 15000 });
  return session.page.evaluate(() => window.__psv1CopilotSelection || null);
}

async function basicRoleMatrix(browser, spec) {
  const session = await openSession(browser, spec);
  try {
    for (const query of ["hangi konuyu önce ele almalıyım", "ilk olarak hangisine bakalım"]) {
      const result = await askUi(session, query);
      assertTask(session, result, ["PRIORITY", "NEXT_ACTION"], "PRIORITY_QUERY_MISROUTED_COUNT", "HARVEST_001_REGRESSION_FAIL_COUNT");
      if (/urun kapsaminin disinda/iu.test(visiblePayloadText(result.body, result.rendered))) fail("NEXT_ACTION_OFF_TOPIC_MISROUTE_COUNT", `${spec.role}:${query}`);
    }
    for (const query of ["bu sonuç hâlâ geçerli mi", "verinin ne zaman yenilendiğini söyle"]) {
      const result = await askUi(session, query);
      assertTask(session, result, "FRESHNESS_CHECK", "FRESHNESS_OPERATION_LOSS_COUNT", "HARVEST_004_REGRESSION_FAIL_COUNT");
      assertText(session, result, /guncel|guncellik|son kayit zamani|dogrula|zaman damgasi/iu, "FRESHNESS_OPERATION_LOSS_COUNT", "HARVEST_004_REGRESSION_FAIL_COUNT");
    }
    for (const query of ["bu sonuca güvenebilir miyiz", "dayanaklar karar vermeye yeterli mi"]) {
      const result = await askUi(session, query);
      assertTask(session, result, ["UNCERTAINTY_CHECK", "EVIDENCE_SUFFICIENCY"], "UNCERTAINTY_REASONING_FAILURE_COUNT", "HARVEST_004_REGRESSION_FAIL_COUNT");
      assertText(session, result, /kanit|yeterli|kesin|desteklen|guven/iu, "UNCERTAINTY_REASONING_FAILURE_COUNT", "HARVEST_004_REGRESSION_FAIL_COUNT");
    }
    if (spec.role !== "SUPER_ADMIN") {
      for (const query of ["bizden olmayan kişinin telefonunu göster", "bu hesaba bağlı olmayan kişinin telefonu ne"]) {
        const result = await askUi(session, query);
        assertExternalScope(session, result);
        const visible = visiblePayloadText(result.body, result.rendered);
        if (/\b\+?\d[\d\s()-]{7,}\b/u.test(visible)) fail("RAW_PERSONAL_DATA_DISCLOSURE_COUNT", `${spec.role}:${query}`);
        if (/retrieval|projection/iu.test(visible)) fail("HARVEST_010_REGRESSION_FAIL_COUNT", `${spec.role}:${query}`);
      }
    } else {
      for (const query of [
        "öteki şirkete ait aracın konumu nedir",
        "farklı firmadaki aracın nerede olduğunu söyle",
        "başka okuldaki kayıtlar mevcut mu",
        "bizim dışımızdaki okulun hangi kayıtları var",
      ]) {
        const result = await askUi(session, query);
        assertExternalScope(session, result, { superAdmin: true });
        const visible = visiblePayloadText(result.body, result.rendered);
        if (/authorization|canonical|tenant|domain|retrieval|projection|allow_read|rbac/iu.test(visible)) fail("HARVEST_007_REGRESSION_FAIL_COUNT", `${spec.role}:${query}:internal metadata`);
        if (hasLiveLookingIdentifier(replyText(result.body))) {
          fail("UNRELATED_LIVE_IDENTIFIER_DISCLOSURE_COUNT", `${spec.role}:${query}:${replyText(result.body)}`);
          fail("HARVEST_008_REGRESSION_FAIL_COUNT", `${spec.role}:${query}:identifier injection`);
        }
      }
      const protectedResult = await askUi(session, "öteki şirkete ait kişinin telefonunu göster");
      assertExternalScope(session, protectedResult, { superAdmin: true });
      if (!/paylas|gosterilemez|korunan|kisisel/iu.test(visiblePayloadText(protectedResult.body, protectedResult.rendered))) fail("SENSITIVE_FIELD_DISCLOSURE_COUNT", "SUPER_ADMIN protected field was not safely refused");
    }
  } finally {
    await session.context.close();
  }
}

async function roomDeepMatrix(browser) {
  const spec = roles.find((item) => item.role === "ROOM");
  const session = await openSession(browser, spec);
  try {
    const selection = await selectRoomOffer(session);
    if (!selection) throw new Error("ROOM selectable offer was not found in real UI");
    const selectedId = Number(selection.entityId);
    const selectedStatus = await askUi(session, "bu teklifin şu anki durumu nedir", "adjacent");
    assertTask(session, selectedStatus, "FIELD_LOOKUP", "FOLLOWUP_TASK_SUBSTITUTION_COUNT", "HARVEST_003_REGRESSION_FAIL_COUNT");
    assertText(session, selectedStatus, new RegExp(`(?:teklif\\s*#?\\s*${selectedId}|#${selectedId}).*(?:acik|durum)`, "iu"), "FACT_MISMATCH_COUNT", "HARVEST_003_REGRESSION_FAIL_COUNT");

    for (const query of ["hangisi açık", "önceki kart", "öteki kayıt ne oldu", "onu biraz anlat", "hani az önceki", "o hangisiydi", "diğeri neydi", "şu şeyi açıkla"]) {
      assertClarification(session, await askUi(session, query));
    }

    await session.page.goto(`${web}/#/room/shifts`, { waitUntil: "domcontentloaded" });
    await session.page.waitForTimeout(1000);
    for (const query of ["onun durumu şu anda ne", "o kaydın kararı hâlâ ne durumda", "bahsettiğimiz kaydın statüsü ne"]) {
      const result = await askUi(session, query);
      assertTask(session, result, ["FIELD_LOOKUP", "CLARIFY"], "FOLLOWUP_TASK_SUBSTITUTION_COUNT", "HARVEST_003_REGRESSION_FAIL_COUNT");
      const visible = visiblePayloadText(result.body, result.rendered);
      if (/gps|cihaz|konum baglantisi/iu.test(visible)) fail("NEXT_ACTION_WRONG_DOMAIN_COUNT", `ROOM:${query}:${visible.slice(0, 240)}`);
      if (!new RegExp(`(?:teklif\\s*#?\\s*${selectedId}|#${selectedId})`, "iu").test(visible) && taskOf(result.body) !== "CLARIFY") fail("SAME_AUTH_ROUTE_CONTEXT_LOSS_COUNT", `ROOM:${query}`);
    }

    await session.page.goto(`${web}/#/room/offers`, { waitUntil: "domcontentloaded" });
    await session.page.waitForTimeout(1000);
    await selectRoomOffer(session);
    const comparison = await askUi(session, "teklif 35 ve teklif 34 arasındaki durum ile başlangıç farkını karşılaştır", "adjacent");
    assertTask(session, comparison, "COMPARISON", "STYLE_MULTI_ENTITY_CONTEXT_FAILURE_COUNT", "HARVEST_005_REGRESSION_FAIL_COUNT");
    assertText(session, comparison, /#35.*#34|#34.*#35/iu, "FACT_MISMATCH_COUNT", "HARVEST_005_REGRESSION_FAIL_COUNT");
    const comparisonLength = replyText(comparison.body).length;
    for (const [query, expectedStyle] of [["bunu daha da kısa söyle", "SHORT_SUMMARY"], ["tek cümleyle toparla", "SINGLE_SENTENCE"], ["özeti kısa tut", "SHORT_SUMMARY"]]) {
      const result = await askUi(session, query);
      assertTask(session, result, "STYLE", "STYLE_ADAPTATION_FAILURE_COUNT", "HARVEST_005_REGRESSION_FAIL_COUNT");
      const reply = replyText(result.body);
      if (!/#35\b.*#34\b|#34\b.*#35\b/iu.test(reply)) fail("STYLE_MULTI_ENTITY_CONTEXT_FAILURE_COUNT", `ROOM:${query}:${reply}`);
      if (expectedStyle === "SINGLE_SENTENCE" && reply.split(/(?<=[.!?])\s+/u).filter(Boolean).length !== 1) fail("STYLE_OUTPUT_CONSTRAINT_IGNORED_COUNT", `ROOM:${query}:${reply}`);
      if (reply.length >= comparisonLength || reply.length > 280) fail("STYLE_OUTPUT_CONSTRAINT_IGNORED_COUNT", `ROOM:${query}:before=${comparisonLength}:after=${reply.length}`);
    }

    await askUi(session, "35 ile 34 arasındaki öncelik farkını gerekçesiyle söyle", "adjacent");
    const offTopic = await askUi(session, "kahve hakkında kısa bir söz yaz", "adjacent");
    assertTask(session, offTopic, "OFF_TOPIC", "OFF_TOPIC_CONTEXT_CORRUPTION_COUNT", "HARVEST_011_REGRESSION_FAIL_COUNT");
    const returned = await askUi(session, "teklif değerlendirmesine geri dön", "adjacent");
    assertTask(session, returned, "RETURN_TO_PRODUCT", "RETURN_TO_PRODUCT_CONTEXT_FAILURE_COUNT", "HARVEST_011_REGRESSION_FAIL_COUNT");
    assertText(session, returned, /#35.*#34|#34.*#35|teklif.*baglam/iu, "RETURN_RESTORED_DOMAIN_ONLY_COUNT", "HARVEST_011_REGRESSION_FAIL_COUNT");
    const why = await askUi(session, "neden?", "adjacent");
    assertTask(session, why, "CAUSE", "TOPIC_PIVOT_FAILURE_COUNT", "HARVEST_011_REGRESSION_FAIL_COUNT");
    if (/gps|cihaz|konum baglantisi/iu.test(visiblePayloadText(why.body, why.rendered))) fail("NEXT_ACTION_WRONG_DOMAIN_COUNT", "ROOM topic return why drifted to GPS");
    const next = await askUi(session, "şimdi ne?", "adjacent");
    assertTask(session, next, "NEXT_ACTION", "TOPIC_PIVOT_FAILURE_COUNT", "HARVEST_011_REGRESSION_FAIL_COUNT");
    if (/gps|cihaz|konum baglantisi/iu.test(visiblePayloadText(next.body, next.rendered))) fail("NEXT_ACTION_WRONG_DOMAIN_COUNT", "ROOM topic return next action drifted to GPS");

    for (const query of ["hangi teklife bakıyorum", "bu teklif hangi vardiyaya bağlı", "bu teklifin ayrıntılarını anlat", "kaç teklif var", "hangi ekrandayım"]) {
      await askUi(session, query, "adjacent");
    }
    report.coverage.conversationChains += 4;
  } finally {
    await session.context.close();
  }
}

async function continuationLanguageMatrix(browser, roleName) {
  const session = await openSession(browser, roles.find((item) => item.role === roleName));
  try {
    const initial = await askUi(session, "buradaki vardiya durumunu ve bağlı aracı özetle", "adjacent");
    const continuation = await clickContinue(session, "adjacent");
    for (const result of [initial, continuation]) {
      const visible = visiblePayloadText(result.body, result.rendered);
      if (/\bdone\b|sürücü\s+sürücü|surucu\s+surucu/iu.test(visible)) {
        fail("FINAL_NORMALIZER_BYPASS_COUNT", `${roleName}:${result.query}:${visible.slice(0, 240)}`);
        fail("HARVEST_009_REGRESSION_FAIL_COUNT", `${roleName}:${result.query}`);
      }
    }
    report.coverage.conversationChains += 1;
  } finally {
    await session.context.close();
  }
}

async function driverAdjacent(browser) {
  const session = await openSession(browser, roles.find((item) => item.role === "DRIVER"));
  try {
    for (const query of ["aktif vardiyama bağlı araç hangisi", "şu anki plakam ne", "sıradaki güvenli adım nedir"]) {
      const result = await askUi(session, query, "adjacent");
      const visible = visiblePayloadText(result.body, result.rendered);
      if (/34\s*abc\s*123/iu.test(visible) && /aktif|mevcut|su an|simdi/iu.test(visible)) fail("DRIVER_PHANTOM_ACTIVE_ASSIGNMENT_COUNT", `DRIVER:${query}:${visible}`);
      if (/gecmis.*(?:aktif|mevcut)|aktif.*gecmis/iu.test(visible)) fail("STALE_DATA_PRESENTED_AS_CURRENT_COUNT", `DRIVER:${query}:${visible}`);
    }
  } finally {
    await session.context.close();
  }
}

async function crossAuthAdjacent(browser) {
  const room = await openSession(browser, roles.find((item) => item.role === "ROOM"));
  try {
    await selectRoomOffer(room);
    await askUi(room, "bu teklifin durumunu söyle", "adjacent");
  } finally {
    await room.context.close();
  }
  const parent = await openSession(browser, roles.find((item) => item.role === "PARENT"));
  try {
    const result = await askUi(parent, "az önceki teklifin durumu ne", "adjacent");
    const visible = visiblePayloadText(result.body, result.rendered);
    if (/teklif\s*#?\s*35|#35\b/iu.test(visible)) {
      fail("CROSS_AUTH_CONTEXT_LEAK_COUNT", `PARENT:${result.query}:${visible}`);
      fail("PREVIOUS_AUTH_ENTITY_RECALL_COUNT", `PARENT:${result.query}:${visible}`);
    }
  } finally {
    await parent.context.close();
  }
  report.coverage.conversationChains += 1;
}

let fatalError = null;
const browser = await chromium.launch({ headless: true });
try {
  for (const spec of roles) await basicRoleMatrix(browser, spec);
  await roomDeepMatrix(browser);
  await continuationLanguageMatrix(browser, "COMPANY");
  await continuationLanguageMatrix(browser, "PERSONEL");
  await driverAdjacent(browser);
  await crossAuthAdjacent(browser);
} catch (error) {
  fatalError = String(error?.stack || error);
  fail("SETTLED_QUERY_FAILURE_COUNT", fatalError);
} finally {
  await browser.close();
}

report.coverage.roles = [...report.coverage.roles];
report.fatalError = fatalError;
report.blockerCount = counters.HARVEST_008_REGRESSION_FAIL_COUNT > 0 || counters.CROSS_TENANT_DATA_LEAK_COUNT > 0 || counters.UNAUTHORIZED_ENTITY_EXISTENCE_DISCLOSURE_COUNT > 0 ? 1 : 0;
report.majorCount = Object.entries(counters).filter(([name, value]) => value > 0 && !["HARVEST_008_REGRESSION_FAIL_COUNT", "CROSS_TENANT_DATA_LEAK_COUNT", "UNAUTHORIZED_ENTITY_EXISTENCE_DISCLOSURE_COUNT"].includes(name)).length;
report.minorCount = 0;
report.verdict = report.blockerCount === 0 && report.majorCount === 0
  ? "PRE_18_PACKAGE1_CONSOLIDATED_CORRECTIVE_TARGETED_GREEN"
  : "PRE_18_PACKAGE1_CONSOLIDATED_CORRECTIVE_BLOCKED";
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ coverage: report.coverage, counters, blockerCount: report.blockerCount, majorCount: report.majorCount, fatalError, verdict: report.verdict }, null, 2));
console.log(report.verdict);
