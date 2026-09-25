import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const web = (process.env.WEB_BASE_URL || "https://knife-trip-liable-spyware.trycloudflare.com").replace(/\/$/u, "");
const reportPath = path.resolve(process.env.PACKAGE1_LEDGER_TARGETED_REPORT_PATH || path.join(root, "package1-final-ledger-targeted-report.json"));
const password = process.env.DEMO_PASSWORD || "demo123";
const driverDevice = process.env.DRIVER_BROWSER_DEVICE_ID || "web-package1-ledger-targeted";

const roles = {
  ROOM: { email: "room@demo.com", home: "/room/offers" },
  COMPANY: { email: "company@demo.com", home: "/company/agreements" },
  PARENT: { email: "parent@demo.com", home: "/parent/live" },
  DRIVER: { email: "driver@demo.com", home: "/driver/today" },
};

const defectIds = [
  "PKG1-LIVE-BLOCKER-001",
  ...Array.from({ length: 12 }, (_, index) => `PKG1-LIVE-MAJOR-${String(index + 2).padStart(3, "0")}`),
  ...Array.from({ length: 3 }, (_, index) => `PKG1-LIVE-MINOR-${String(index + 14).padStart(3, "0")}`),
];

const securityCounters = [
  "CROSS_TENANT_DATA_LEAK_COUNT", "UNAUTHORIZED_ENTITY_EXISTENCE_DISCLOSURE_COUNT", "SENSITIVE_FIELD_DISCLOSURE_COUNT",
  "RAW_PERSONAL_DATA_DISCLOSURE_COUNT", "UNAUTHORIZED_COORDINATE_DISCLOSURE_COUNT", "SECRET_FIELD_DISCLOSURE_COUNT",
  "CROSS_AUTH_CONTEXT_LEAK_COUNT", "PREVIOUS_AUTH_ENTITY_RECALL_COUNT",
];
const hardCounters = [
  ...securityCounters,
  "FACT_MISMATCH_COUNT", "SELECTED_RECORD_ID_MISMATCH_COUNT", "STALE_RECORD_PROJECTION_COUNT", "MULTI_ENTITY_QUERY_DROPPED_ENTITY_COUNT",
  "AMBIGUOUS_REFERENCE_UNJUSTIFIED_RESOLUTION_COUNT", "FOLLOWUP_STATE_LOSS_COUNT", "STYLE_FOLLOWUP_FAILURE_COUNT", "CONTINUATION_STAGNATION_COUNT",
  "OFF_TOPIC_COMMERCIAL_ALIAS_FALSE_POSITIVE_COUNT", "DRIVER_PHANTOM_ACTIVE_ASSIGNMENT_COUNT", "RAW_TIME_OUTPUT_COUNT",
  "PRIORITY_QUERY_WITHOUT_REASON_COUNT", "PRIORITY_ENTITY_COUNT_FALLBACK_COUNT", "PRIORITY_SELECTED_IDENTITY_FALLBACK_COUNT",
  "PRIORITY_UNGROUNDED_REASON_COUNT", "PRIORITY_MISSING_SAFE_NEXT_STEP_COUNT",
  "CONSOLE_ERROR_COUNT", "PAGE_ERROR_COUNT", "HTTP_500_COUNT", "UNEXPLAINED_HTTP_403_COUNT", "SETTLED_QUERY_FAILURE_COUNT", "RENDERED_ANSWER_FAILURE_COUNT",
];
const counters = Object.fromEntries(hardCounters.map((name) => [name, 0]));
const report = {
  generatedAt: new Date().toISOString(),
  mode: "package1-final-ledger-targeted-public-tunnel",
  publicUrl: web,
  realUiLifecycle: true,
  freshContexts: 0,
  defectLedger: Object.fromEntries(defectIds.map((id) => [id, { id, probes: [], status: "NOT_RUN" }])),
  counters,
  probes: [],
  failures: [],
  priorityWithReason: { probeCount: 0, probes: [], status: "NOT_RUN" },
};

const norm = (value) => String(value || "")
  .toLocaleLowerCase("tr-TR")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c")
  .replace(/\s+/g, " ").trim();

function fail(counter, detail, id = null) {
  counters[counter] = Number(counters[counter] || 0) + 1;
  report.failures.push({ counter, detail, id });
  if (id && report.defectLedger[id]) report.defectLedger[id].status = "FAIL";
}

function taskOf(body) {
  return String(body?.semanticPlan?.typedRequest?.taskType || body?.semanticPlan?.family || "").toUpperCase();
}

function answerOf(result) {
  return norm([result?.rendered, result?.body?.reply, result?.body?.summary].filter(Boolean).join(" "));
}

function record(id, session, result, pass, assertion) {
  const entry = {
    role: session.role,
    query: result.query,
    status: result.status,
    task: taskOf(result.body),
    rendered: result.rendered,
    reply: String(result.body?.reply || ""),
    selectedEntity: result.body?.semanticPlan?.entity || null,
    assertion,
    pass,
  };
  report.defectLedger[id].probes.push(entry);
  if (pass && report.defectLedger[id].status !== "FAIL") report.defectLedger[id].status = "PASS";
}

function observe(page, role) {
  page.on("console", (message) => {
    if (message.type() === "error") fail("CONSOLE_ERROR_COUNT", `${role}:${message.text()}`);
  });
  page.on("pageerror", (error) => fail("PAGE_ERROR_COUNT", `${role}:${String(error?.message || error)}`));
  page.on("response", (response) => {
    if (response.status() >= 500) fail("HTTP_500_COUNT", `${role}:${response.status()} ${response.url()}`);
    if (response.status() === 403 && response.url().includes("/api/") && !response.url().includes("/api/auth")) fail("UNEXPLAINED_HTTP_403_COUNT", `${role}:${response.url()}`);
  });
}

async function openSession(browser, role, route = null) {
  const spec = roles[role];
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  if (role === "DRIVER") await context.addInitScript((id) => localStorage.setItem("personel_servis_browser_device_id", id), driverDevice);
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  observe(page, role);
  await page.goto(`${web}/`, { waitUntil: "domcontentloaded" });
  const username = page.locator('input[autocomplete="username"]');
  if (await username.count()) {
    await username.fill(spec.email);
    await page.locator('input[autocomplete="current-password"]').fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForFunction(() => !document.querySelector('input[autocomplete="username"]'), null, { timeout: 60000 });
  }
  const target = route || spec.home;
  await page.goto(`${web}/#${target}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction((path) => location.hash.includes(path), target, { timeout: 30000 });
  await page.waitForTimeout(1200);
  report.freshContexts += 1;
  return { role, context, page };
}

async function drawerFor(session) {
  let drawer = session.page.locator(".copilotDrawer:visible").first();
  if (!(await drawer.count())) {
    await session.page.locator(".copilotFab:visible").first().click();
    drawer = session.page.locator(".copilotDrawer:visible").first();
  }
  await drawer.waitFor({ state: "visible" });
  return drawer;
}

function copilotResponse(query) {
  return (candidate) => {
    try {
      if (new URL(candidate.url()).pathname !== "/api/ai/copilot" || candidate.request().method() !== "POST") return false;
      const request = candidate.request().postDataJSON();
      return String(request?.intent || "").toUpperCase() === "CHAT_HELP" && String(request?.message || "").trim() === query;
    } catch {
      return false;
    }
  };
}

async function ask(session, query) {
  const drawer = await drawerFor(session);
  const messages = drawer.locator(".copilotMsg.assistant");
  const before = await messages.count();
  await drawer.locator("textarea").first().fill(query);
  const [response] = await Promise.all([
    session.page.waitForResponse(copilotResponse(query), { timeout: 60000 }),
    drawer.locator('button[type="submit"]').click(),
  ]);
  const body = await response.json().catch(() => ({}));
  let rendered = "";
  let renderedConfirmed = false;
  const expected = norm(body?.reply || body?.summary || "").slice(0, 28);
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const count = await messages.count();
    rendered = count ? await messages.last().innerText().catch(() => "") : "";
    if (count > before && (!expected || norm(rendered).includes(expected))) {
      renderedConfirmed = true;
      break;
    }
    await session.page.waitForTimeout(250);
  }
  const result = { query, status: response.status(), body, rendered, renderedConfirmed };
  report.probes.push({ role: session.role, query, status: result.status, task: taskOf(body), rendered, reply: body?.reply || "", semanticPlan: body?.semanticPlan || null });
  if (result.status !== 200) fail("SETTLED_QUERY_FAILURE_COUNT", `${session.role}:${query}:HTTP_${result.status}`);
  if (!renderedConfirmed) fail("RENDERED_ANSWER_FAILURE_COUNT", `${session.role}:${query}`);
  await session.page.waitForTimeout(1100);
  return result;
}

async function selectRoomOffer(session) {
  const cards = session.page.locator(".pre18-room-offer-card:visible");
  await cards.first().waitFor({ state: "visible" });
  const preferred = cards.filter({ hasText: /#\s*35\b/u });
  const card = await preferred.count() ? preferred.first() : cards.first();
  await card.click();
  await session.page.waitForFunction(() => Number(window.__psv1CopilotSelection?.entityId || 0) > 0, null, { timeout: 15000 });
  return session.page.evaluate(() => window.__psv1CopilotSelection || null);
}

async function selectedUiEntity(session, expectedType) {
  await session.page.waitForFunction((type) => String(window.__psv1CopilotSelection?.entityType || "").toLowerCase() === type && Number(window.__psv1CopilotSelection?.entityId || 0) > 0, expectedType, { timeout: 15000 });
  return session.page.evaluate(() => window.__psv1CopilotSelection || null);
}

async function selectVisibleEntity(session, { id, type, text }) {
  const choices = session.page.locator("button, [role=button], tr, .card, [data-testid]").filter({ hasText: text });
  const count = await choices.count();
  if (!count) return selectedUiEntity(session, type);
  await choices.first().click();
  await session.page.waitForFunction(({ expectedId, expectedType }) => {
    const selection = window.__psv1CopilotSelection || {};
    return Number(selection.entityId || 0) === expectedId && String(selection.entityType || "").toLowerCase() === expectedType;
  }, { expectedId: id, expectedType: type }, { timeout: 15000 });
  return selectedUiEntity(session, type);
}

function noProtectedLeak(result) {
  const text = answerOf(result);
  return !/(?:teklif|vardiya|sozlesme|sözleşme)\s*#\s*\d+/iu.test(text) && !/\b\+?\d[\d\s()\-]{7,}\b/u.test(text);
}

function recordPriorityWithReason(session, result, selectedId, uiText) {
  const answer = answerOf(result);
  const task = taskOf(result.body);
  const selected = Number(result.body?.semanticPlan?.entity?.id || 0);
  const hasWhatFirst = new RegExp(`(?:once|birinci oncelik|baslangic noktasi).{0,80}#${selectedId}\\b|#${selectedId}\\b.{0,80}(?:once|birinci oncelik|baslangic noktasi)`, "iu").test(answer);
  const hasReason = /\b(?:gerekce|neden)\s*:/iu.test(answer);
  // Offer #35 visibly shows an unentered carrier amount.  The read model may
  // phrase that evidence as risk/quality, but it must expose a concrete,
  // authorized reason rather than an ungrounded generic sentence.
  const hasGroundedEvidence = /(?:tasimaci|tasiyici|bedel|risk|kalite|eksik|arac|surucu|durum|baslangic)/iu.test(answer);
  const hasSafeNextStep = /sonraki guvenli adim\s*:/iu.test(answer);
  const countFallback = /\b\d+\s+teklif\s+kaydi\b/iu.test(answer);
  const identityFallback = /secilen oncelik\s*:/iu.test(answer) && !hasWhatFirst;
  const pass = task === "PRIORITY" && selected === selectedId && hasWhatFirst && hasReason && hasGroundedEvidence && hasSafeNextStep && !countFallback && !identityFallback;
  const entry = { role: session.role, query: result.query, status: result.status, task, selectedEntity: result.body?.semanticPlan?.entity || null, uiText, rendered: result.rendered, reply: result.body?.reply || "", pass };
  report.priorityWithReason.probes.push(entry);
  report.priorityWithReason.probeCount += 1;
  if (!hasReason) fail("PRIORITY_QUERY_WITHOUT_REASON_COUNT", `ROOM:${result.query}:reason absent`);
  if (countFallback) fail("PRIORITY_ENTITY_COUNT_FALLBACK_COUNT", `ROOM:${result.query}:count fallback`);
  if (identityFallback) fail("PRIORITY_SELECTED_IDENTITY_FALLBACK_COUNT", `ROOM:${result.query}:selected identity fallback`);
  if (!hasGroundedEvidence) fail("PRIORITY_UNGROUNDED_REASON_COUNT", `ROOM:${result.query}:grounded evidence absent`);
  if (!hasSafeNextStep) fail("PRIORITY_MISSING_SAFE_NEXT_STEP_COUNT", `ROOM:${result.query}:safe next step absent`);
  return pass;
}

async function roomLedger(browser) {
  const session = await openSession(browser, "ROOM");
  try {
    const selection = await selectRoomOffer(session);
    const selectedId = Number(selection.entityId);
    const selectedCard = session.page.locator(".pre18-room-offer-card:visible").filter({ hasText: new RegExp(`#\\s*${selectedId}\\b`, "u") }).first();
    const selectedUiText = await selectedCard.innerText();
    const priorityVariants = [
      "önce neyi çözeyim",
      "ilk neye bakmalıyım",
      "hangisini önce ele alayım",
      "önceliğim ne olmalı",
      "şimdi ilk işim ne",
      "önce neyle uğraşayım",
      "en önce neyi halletmeliyim",
    ];
    for (const query of priorityVariants) {
      const priorityResult = await ask(session, query);
      recordPriorityWithReason(session, priorityResult, selectedId, selectedUiText);
    }
    const external = await ask(session, "bizim kapsamın dışındaki kaydın tarihi nedir");
    const externalPass = String(external.body?.semanticPlan?.authorizationDecision?.status || "").toUpperCase() === "DENY" && Boolean(external.body?.semanticPlan?.crossTenantRequested) && noProtectedLeak(external);
    record("PKG1-LIVE-BLOCKER-001", session, external, externalPass, "explicit external scope denied without selected-record substitution");
    if (!externalPass) fail("CROSS_TENANT_DATA_LEAK_COUNT", `ROOM:${external.query}`, "PKG1-LIVE-BLOCKER-001");

    const setProbe = await ask(session, "Teklif #35 ile Teklif #34 için durumları ayrı ayrı karşılaştır");
    const setPass = taskOf(setProbe.body) === "COMPARISON" && /#35\b.*#34\b|#34\b.*#35\b/iu.test(answerOf(setProbe));
    record("PKG1-LIVE-MAJOR-002", session, setProbe, setPass, "active two-offer set retained");
    if (!setPass) fail("MULTI_ENTITY_QUERY_DROPPED_ENTITY_COUNT", "ROOM multi-entity set collapsed", "PKG1-LIVE-MAJOR-002");

    const difference = await ask(session, "bu iki teklif arasındaki fark ne, sayı sayma");
    const differencePass = taskOf(difference.body) === "COMPARISON" && /#35\b.*#34\b|#34\b.*#35\b/iu.test(answerOf(difference)) && !/\b\d+ teklif kaydı\b/iu.test(answerOf(difference));
    record("PKG1-LIVE-MAJOR-003", session, difference, differencePass, "difference resolves as comparison rather than count");
    if (!differencePass) fail("MULTI_ENTITY_QUERY_DROPPED_ENTITY_COUNT", "ROOM difference collapsed", "PKG1-LIVE-MAJOR-003");

    const priority = await ask(session, "bu ikisinden hangisine önce bakalım, neden");
    const priorityPass = ["PRIORITY", "CAUSE"].includes(taskOf(priority.body)) && /#35\b.*#34\b|#34\b.*#35\b/iu.test(answerOf(priority)) && /neden|gerekce|öncelik|oncelik/iu.test(answerOf(priority));
    record("PKG1-LIVE-MAJOR-004", session, priority, priorityPass, "priority reads the active comparison set");
    if (!priorityPass) fail("MULTI_ENTITY_QUERY_DROPPED_ENTITY_COUNT", "ROOM comparison priority lost set", "PKG1-LIVE-MAJOR-004");

    const risk = await ask(session, `Teklif #${selectedId} için riski, kanıtı ve sonraki güvenli adımı söyle`);
    const evidence = await ask(session, "kanıtın nedir");
    const impact = await ask(session, "etkisi ne olur");
    const followPass = ["EVIDENCE_SUFFICIENCY", "EVIDENCE"].includes(taskOf(evidence.body)) && taskOf(impact.body) === "CAUSE" && /kanit|dayanak|delil/iu.test(answerOf(evidence)) && /etki|nedenle|sonuc/iu.test(answerOf(impact));
    record("PKG1-LIVE-MAJOR-008", session, impact, followPass, "evidence and impact follow the settled risk task");
    if (!followPass) fail("FOLLOWUP_STATE_LOSS_COUNT", "ROOM risk follow-up intent lost", "PKG1-LIVE-MAJOR-008");

    const initial = await ask(session, `Teklif #${selectedId} için durum ve risk sonucunu ver`);
    const resultOnly = await ask(session, "sadece sonucu");
    const expanded = await ask(session, "biraz açar mısın");
    const stylePass = taskOf(resultOnly.body) === "STYLE" && taskOf(expanded.body) === "STYLE" && !/sonraki güvenli adım|ayrıntı/i.test(String(resultOnly.body?.reply || "")) && /sonraki güvenli adım|ayrıntı/i.test(String(expanded.body?.reply || "")) && String(expanded.body?.reply || "") !== String(resultOnly.body?.reply || "") && new RegExp(`#${selectedId}\\b`, "iu").test(answerOf(resultOnly));
    record("PKG1-LIVE-MAJOR-009", session, expanded, stylePass, "style transforms last settled authorized result");
    if (!stylePass) fail("STYLE_FOLLOWUP_FAILURE_COUNT", "ROOM style context/transform failed", "PKG1-LIVE-MAJOR-009");

    const generalA = await ask(session, "müşteri hakkında iki cümlelik kısa bir tanım yaz");
    const generalB = await ask(session, "rakam kelimesiyle örnek cümle yaz");
    const generalPass = taskOf(generalA.body) === "OFF_TOPIC" && taskOf(generalB.body) === "OFF_TOPIC" && !generalA.body?.semanticPlan?.entity && !generalB.body?.semanticPlan?.entity && !(generalA.body?.semanticPlan?.requestedDomains || []).length && !(generalB.body?.semanticPlan?.requestedDomains || []).length;
    record("PKG1-LIVE-MAJOR-010", session, generalB, generalPass, "commercial words do not force product retrieval");
    if (!generalPass) fail("OFF_TOPIC_COMMERCIAL_ALIAS_FALSE_POSITIVE_COUNT", "ROOM metalinguistic request entered product domain", "PKG1-LIVE-MAJOR-010");

    const ambiguous = await ask(session, "az önceki şey neydi");
    const ambiguousPass = taskOf(ambiguous.body) === "CLARIFY" && /hangi|netleştir|netlestir|belirt/iu.test(answerOf(ambiguous)) && !/#\d+/u.test(answerOf(ambiguous));
    record("PKG1-LIVE-MAJOR-011", session, ambiguous, ambiguousPass, "ambiguous reference clarifies without a default record");
    if (!ambiguousPass) fail("AMBIGUOUS_REFERENCE_UNJUSTIFIED_RESOLUTION_COUNT", "ROOM ambiguous reference defaulted", "PKG1-LIVE-MAJOR-011");

    const selected = await ask(session, "burada hangisi seçilmiş");
    const selectedPass = taskOf(selected.body) === "SELECTED_RECORD_CONTEXT" && new RegExp(`#${selectedId}\\b`, "iu").test(answerOf(selected));
    record("PKG1-LIVE-MINOR-014", session, selected, selectedPass, "selected record beats screen identity");
    if (!selectedPass) fail("SELECTED_RECORD_ID_MISMATCH_COUNT", "ROOM selected record context mismatch", "PKG1-LIVE-MINOR-014");
  } finally {
    await session.context.close();
  }
}

async function companyLedger(browser) {
  const session = await openSession(browser, "COMPANY", "/company/agreements");
  try {
    const selection = await selectedUiEntity(session, "agreement");
    const agreementId = Number(selection.entityId);
    const agreement = await ask(session, "seçili sözleşmenin numarası, durumu ve bağlı vardiyası ne");
    const agreementPass = new RegExp(`#${agreementId}\\b`, "iu").test(answerOf(agreement)) && Number(agreement.body?.semanticPlan?.entity?.id || 0) === agreementId;
    record("PKG1-LIVE-MAJOR-005", session, agreement, agreementPass, "current visible selected agreement remains the resolved entity");
    if (!agreementPass) fail("SELECTED_RECORD_ID_MISMATCH_COUNT", "COMPANY agreement selection projected another agreement", "PKG1-LIVE-MAJOR-005");

    const agreementFollow = await ask(session, "onun tarih aralığı ve bağlı vardiya ayrıntısı ne");
    const agreementFollowPass = new RegExp(`#${agreementId}\\b`, "iu").test(answerOf(agreementFollow)) && Number(agreementFollow.body?.semanticPlan?.entity?.id || 0) === agreementId;
    record("PKG1-LIVE-MAJOR-006", session, agreementFollow, agreementFollowPass, "agreement follow-up does not project stale shift facts");
    if (!agreementFollowPass) fail("STALE_RECORD_PROJECTION_COUNT", "COMPANY agreement follow-up projected stale shift", "PKG1-LIVE-MAJOR-006");

    const dateRange = await ask(session, "seçili sözleşmenin başlangıç ve bitiş tarih aralığını tam yaz");
    const datePass = /tarih araligi|tarih aralığı/iu.test(answerOf(dateRange)) && /[0-3]?\d\.[0-1]?\d\.\d{4}/u.test(answerOf(dateRange)) && !/\b\d{2}:\d{2}:\d{2}\b/u.test(answerOf(dateRange));
    record("PKG1-LIVE-MINOR-015", session, dateRange, datePass, "complete formatted date/time range");
    if (!datePass) fail("RAW_TIME_OUTPUT_COUNT", "COMPANY date range incomplete or raw", "PKG1-LIVE-MINOR-015");
  } finally {
    await session.context.close();
  }

  const shiftSession = await openSession(browser, "COMPANY", "/company/shifts");
  try {
    const shiftSelection = await selectedUiEntity(shiftSession, "shift");
    const shiftId = Number(shiftSelection.entityId);
    const stops = await ask(shiftSession, "bu vardiyanın kaç durağı var");
    const stopPass = taskOf(stops.body) === "FIELD_LOOKUP" && /durak sayisi|durak sayısı/iu.test(answerOf(stops)) && !/\b\d+ vardiya kaydı\b/iu.test(answerOf(stops));
    record("PKG1-LIVE-MAJOR-007", shiftSession, stops, stopPass, "selected shift stop count remains a field lookup");
    if (!stopPass) fail("FACT_MISMATCH_COUNT", "COMPANY stop count became entity count", "PKG1-LIVE-MAJOR-007");

    const base = await ask(shiftSession, "bu vardiyanın durumu ve riski nedir");
    const continued = await ask(shiftSession, "Devamını anlat");
    const continuationPass = taskOf(continued.body) === "CONTINUE_CURRENT_REASONING" && new RegExp(`#${shiftId}\\b`, "iu").test(answerOf(continued)) && String(continued.body?.reply || "") !== String(base.body?.reply || "") && String(continued.body?.reply || "").length > 30;
    record("PKG1-LIVE-MAJOR-013", shiftSession, continued, continuationPass, "continuation adds grounded content for the settled entity");
    if (!continuationPass) fail("CONTINUATION_STAGNATION_COUNT", "COMPANY continuation lost base task or stagnated", "PKG1-LIVE-MAJOR-013");
  } finally {
    await shiftSession.context.close();
  }
}

async function parentLedger(browser) {
  const session = await openSession(browser, "PARENT");
  try {
    await session.page.waitForFunction(() => String(window.__psv1CopilotSelection?.entityType || "").toLowerCase() === "personnel", null, { timeout: 15000 });
    const selectedLabel = await session.page.evaluate(() => String(window.__psv1CopilotSelection?.selectedLabel || window.__psv1CopilotSelection?.selectedRecordLabel || ""));
    const selectedName = norm(selectedLabel.split("•").at(-1));
    const result = await ask(session, "seçili çocuğun aktif servisi ve araç durumu ne");
    const reply = answerOf(result);
    const pass = /aktif servis.*gorunmuyor|arac:\s*0|arac gorunmuyor/iu.test(reply)
      && (!selectedName || reply.includes(selectedName))
      && !/yetkim yok|urun kapsami disinda/iu.test(reply);
    record("PKG1-LIVE-MAJOR-012", session, result, pass, "authorized visible parent no-service/vehicle-zero fact is readable");
    if (!pass) fail("FACT_MISMATCH_COUNT", "PARENT visible no-service fact unavailable", "PKG1-LIVE-MAJOR-012");
  } finally {
    await session.context.close();
  }
}

async function generalLedger(browser) {
  const session = await openSession(browser, "ROOM");
  try {
    const multiply = await ask(session, "6 kere 9");
    const subtract = await ask(session, "18'den 7 çıkar");
    const pass = taskOf(multiply.body) === "OFF_TOPIC" && taskOf(subtract.body) === "OFF_TOPIC" && /54/u.test(answerOf(multiply)) && /11/u.test(answerOf(subtract));
    record("PKG1-LIVE-MINOR-016", session, subtract, pass, "general arithmetic remains general knowledge");
    if (!pass) fail("OFF_TOPIC_COMMERCIAL_ALIAS_FALSE_POSITIVE_COUNT", "general arithmetic was not handled safely", "PKG1-LIVE-MINOR-016");
  } finally {
    await session.context.close();
  }
}

async function adjacent(browser) {
  const driver = await openSession(browser, "DRIVER");
  try {
    const current = await ask(driver, "şu an bana bağlı aktif araç hangisi");
    const text = answerOf(current);
    if (/34\s*abc\s*123/iu.test(text) && /aktif|şu an|su an|mevcut/iu.test(text)) fail("DRIVER_PHANTOM_ACTIVE_ASSIGNMENT_COUNT", "DRIVER stale vehicle presented as current");
  } finally {
    await driver.context.close();
  }
  const room = await openSession(browser, "ROOM");
  try {
    await selectRoomOffer(room);
    await ask(room, "bu teklifin durumu ne");
  } finally {
    await room.context.close();
  }
  const parent = await openSession(browser, "PARENT");
  try {
    const oldContext = await ask(parent, "az önceki teklifin durumu ne");
    if (/#35\b|teklif\s*#?\s*35/iu.test(answerOf(oldContext))) fail("CROSS_AUTH_CONTEXT_LEAK_COUNT", "PARENT recalled prior ROOM offer");
  } finally {
    await parent.context.close();
  }
}

let fatalError = null;
const browser = await chromium.launch({ headless: true });
try {
  await roomLedger(browser);
  await companyLedger(browser);
  await parentLedger(browser);
  await generalLedger(browser);
  await adjacent(browser);
} catch (error) {
  fatalError = String(error?.stack || error);
  fail("SETTLED_QUERY_FAILURE_COUNT", fatalError);
} finally {
  await browser.close();
}

for (const entry of Object.values(report.defectLedger)) {
  if (entry.status === "NOT_RUN") entry.status = "FAIL";
}
report.fatalError = fatalError;
report.allDefectIdsPassed = Object.values(report.defectLedger).every((entry) => entry.status === "PASS");
report.securityStatus = securityCounters.every((name) => counters[name] === 0) ? "PASS" : "FAIL";
const priorityCounters = [
  "PRIORITY_QUERY_WITHOUT_REASON_COUNT", "PRIORITY_ENTITY_COUNT_FALLBACK_COUNT", "PRIORITY_SELECTED_IDENTITY_FALLBACK_COUNT",
  "PRIORITY_UNGROUNDED_REASON_COUNT", "PRIORITY_MISSING_SAFE_NEXT_STEP_COUNT",
];
report.priorityWithReason.status = report.priorityWithReason.probeCount >= 7 && priorityCounters.every((name) => counters[name] === 0)
  ? "PASS"
  : "FAIL";
report.verdict = report.allDefectIdsPassed && report.securityStatus === "PASS" && report.priorityWithReason.status === "PASS" && Object.values(counters).every((value) => value === 0)
  ? "PRE_18_PACKAGE1_PRIORITY_WITH_REASON_TARGETED_GREEN"
  : "PRE_18_PACKAGE1_PRIORITY_WITH_REASON_BLOCKED";
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ freshContexts: report.freshContexts, counters, defectLedger: report.defectLedger, fatalError, verdict: report.verdict }, null, 2));
console.log(report.verdict);
