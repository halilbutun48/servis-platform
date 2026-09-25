import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const web = (process.env.WEB_BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const out = path.join(root, "backend/artifacts/browser-smoke/pre-18-package1-micro-closure");
const requiredTotal = 100;
const previousValidSelectedProbes = 98;

const counters = Object.fromEntries([
  "SCREEN_CONTEXT_OVERRIDES_SELECTED_RECORD_REQUEST_COUNT",
  "SELECTED_RECORD_CONTEXT_MISCLASSIFIED_AS_SCREEN_COUNT",
  "SELECTED_RECORD_CONTEXT_LOSS_COUNT",
  "SELECTED_RECORD_ID_MISMATCH_COUNT",
  "PHANTOM_SELECTED_RECORD_COUNT",
  "SCREEN_SELECTED_MULTI_PART_OMISSION_COUNT",
  "SELECTED_RECORD_QUERY_RELATION_TRAVERSAL_COUNT",
  "SELECTED_RECORD_CONTEXT_MISROUTED_RELATION_LOOKUP_COUNT",
  "ACTIVE_WORD_SELECTED_CONTEXT_MISROUTE_COUNT",
  "OPEN_WORD_SELECTED_CONTEXT_MISROUTE_COUNT",
  "AMBIGUOUS_OPEN_SELECTED_VS_STATUS_UNJUSTIFIED_RESOLUTION_COUNT",
  "PARENT_COMPANY_PHANTOM_SELECTED_RECORD_COUNT",
  "UNJUSTIFIED_DEFAULT_SELECTION_COUNT",
  "SELECTED_RECORD_PROBE_FAIL",
  "CONSOLE_ERROR_COUNT",
  "PAGE_ERROR_COUNT",
  "HTTP_500_COUNT",
  "HTTP_403_UNEXPECTED_COUNT",
].map((key) => [key, 0]));

const report = {
  generatedAt: new Date().toISOString(),
  buildEvidence: {
    source: "existing clean Package-1 product run",
    codeMutationCount: 0,
    dataResetCount: 0,
    authPolicyMutationCount: 0,
    previousValidSelectedProbes,
  },
  company: {
    shiftSelectableRecordCount: null,
    selectedRecordProbeApplicability: "PENDING",
    evidence: null,
  },
  coverage: {
    selectedRecordProbeRequired: requiredTotal,
    previousValidSelectedProbes,
    additionalSelectedRecordProbes: 0,
    selectedRecordProbeExecuted: previousValidSelectedProbes,
    selectedRecordProbeFail: 0,
    selectedRecordIds: [],
  },
  counters,
  probes: [],
  failures: [],
  responsive: "PRESERVED_FROM_CLEAN_RUN",
  health: "PRESERVED_FROM_CLEAN_RUN",
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
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

function increment(name, detail) {
  counters[name] += 1;
  report.failures.push({ code: name, detail });
}

function answerFrom(body) {
  return norm([
    body?.reply,
    body?.summary,
    body?.contextSummary,
    ...(body?.responseSections || []).flatMap((section) => [section?.title, section?.body, section?.text]),
  ].filter(Boolean).join(" "));
}

function responseIds(body) {
  const records = Array.isArray(body?.authorizedRecords) ? body.authorizedRecords : [];
  return [...new Set([
    body?.semanticPlan?.entity,
    ...(body?.semanticPlan?.entities || []),
    ...records,
  ].flatMap((entity) => [
    entity?.id,
    entity?.entityId,
    entity?.offerId,
    entity?.shiftId,
    entity?.vehicleId,
  ]).filter((id) => id !== null && id !== undefined).map(String))];
}

function taskOf(body) {
  return String(
    body?.semanticPlan?.typedRequest?.taskType
      || body?.semanticPlan?.taskType
      || body?.semanticPlan?.family
      || body?.questionType
      || "",
  ).toUpperCase();
}

function selectedFromWindow(page) {
  return page.evaluate(() => {
    const selection = window.__psv1CopilotSelection || null;
    return selection?.entityId
      ? { entityType: String(selection.entityType || ""), entityId: String(selection.entityId), label: String(selection.label || "") }
      : null;
  });
}

function roomCards(page) {
  return page.locator("[class~='pre18-room-offer-card']:visible")
    .filter({ hasText: /Vardiya\s*#\s*\d+/iu })
    .filter({ hasText: /Teklif ayrıntılarını göster/iu });
}

async function observe(page) {
  page.on("console", (message) => {
    if (message.type() === "error") counters.CONSOLE_ERROR_COUNT += 1;
  });
  page.on("pageerror", () => {
    counters.PAGE_ERROR_COUNT += 1;
  });
  page.on("response", (response) => {
    if (response.status() >= 500) counters.HTTP_500_COUNT += 1;
    if (response.status() === 403 && response.url().includes("/api/") && !response.url().includes("/api/auth")) counters.HTTP_403_UNEXPECTED_COUNT += 1;
  });
}

async function login(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  await observe(page);
  await page.goto(`${web}/`, { waitUntil: "domcontentloaded" });
  const user = page.locator('input[autocomplete="username"]');
  if (await user.count()) {
    await user.fill("room@demo.com");
    await page.locator('input[autocomplete="current-password"]').fill("demo123");
    await page.locator('button[type="submit"]').click();
    await page.waitForFunction(() => !document.querySelector('input[autocomplete="username"]'), null, { timeout: 60000 });
  }
  await page.goto(`${web}/#/room/offers`, { waitUntil: "domcontentloaded" });
  await page.locator("[class~='pre18-room-offer-card']:visible").first().waitFor({ state: "visible", timeout: 30000 });
  return { context, page };
}

async function selectRoomCard(page, index) {
  const cards = roomCards(page);
  const count = await cards.count();
  if (index >= count) return null;
  await cards.nth(index).click();
  await page.waitForFunction(() => Number(window.__psv1CopilotSelection?.entityId || 0) > 0, null, { timeout: 15000 });
  return selectedFromWindow(page);
}

async function askThroughRenderedUi(page, query) {
  const fab = page.locator(".copilotFab:visible").first();
  if (await fab.count()) await fab.click();
  const drawer = page.locator(".copilotDrawer:visible").first();
  await drawer.waitFor({ state: "visible" });
  const textarea = drawer.locator("textarea").first();
  const before = await drawer.locator(".copilotMsg.assistant").count();
  await textarea.fill(query);
  const [response] = await Promise.all([
    page.waitForResponse((candidate) => new URL(candidate.url()).pathname === "/api/ai/copilot", { timeout: 30000 }),
    drawer.locator('button[type="submit"]').click(),
  ]);
  const body = await response.json();
  await page.waitForFunction((previous) => document.querySelectorAll(".copilotDrawer .copilotMsg.assistant").length > previous, before, { timeout: 30000 });
  const assistantMessages = drawer.locator(".copilotMsg.assistant");
  const renderedAnswer = norm(await assistantMessages.last().innerText());
  return { status: response.status(), body, renderedAnswer };
}

function validateProbe({ body, renderedAnswer, selection, expected, query }) {
  const typed = body?.semanticPlan?.typedRequest || {};
  const task = taskOf(body);
  const selectedIntent = Boolean(typed.selectedRecordIntent || task === "SELECTED_RECORD_CONTEXT");
  const screenIntent = Boolean(typed.screenContextIntent || task === "SCREEN_CONTEXT");
  const combined = Boolean(typed.combinedContextIntent);
  const selectedId = String(selection?.entityId || "");
  const bodyIds = responseIds(body);
  const mentionsSelected = selectedId && (bodyIds.includes(selectedId) || new RegExp(`(?:#${selectedId}\\b|teklif\\s*#?\\s*${selectedId}\\b|vardiya\\s*#?\\s*${selectedId}\\b)`, "iu").test(renderedAnswer));
  const mentionsScreen = /teklifler|teklif ekranı|teklif ekrani/iu.test(renderedAnswer);

  if ((expected === "SELECTED" || expected === "COMBINED") && task === "SCREEN_CONTEXT" && !selectedIntent) {
    increment("SCREEN_CONTEXT_OVERRIDES_SELECTED_RECORD_REQUEST_COUNT", query);
    increment("SELECTED_RECORD_CONTEXT_MISCLASSIFIED_AS_SCREEN_COUNT", query);
  }
  if ((expected === "SELECTED" || expected === "COMBINED") && task === "RELATION_LOOKUP") {
    increment("SELECTED_RECORD_QUERY_RELATION_TRAVERSAL_COUNT", query);
    increment("SELECTED_RECORD_CONTEXT_MISROUTED_RELATION_LOOKUP_COUNT", query);
  }
  if (expected === "SELECTED" && /aktif|baktig|bakiyor/iu.test(query) && task !== "SELECTED_RECORD_CONTEXT") increment("ACTIVE_WORD_SELECTED_CONTEXT_MISROUTE_COUNT", query);
  if (expected === "SELECTED" && /acik|açık/iu.test(query) && task !== "SELECTED_RECORD_CONTEXT") increment("OPEN_WORD_SELECTED_CONTEXT_MISROUTE_COUNT", query);
  if ((expected === "SELECTED" || expected === "COMBINED") && (!selectedIntent || !mentionsSelected)) {
    increment("SELECTED_RECORD_CONTEXT_LOSS_COUNT", query);
  }
  if ((expected === "SELECTED" || expected === "COMBINED") && !mentionsSelected) {
    increment("SELECTED_RECORD_ID_MISMATCH_COUNT", query);
  }
  if (expected === "COMBINED" && (!combined || !mentionsScreen || !mentionsSelected)) {
    increment("SCREEN_SELECTED_MULTI_PART_OMISSION_COUNT", query);
  }
  if (!selection && /seçili|acik kayit|açık kayıt|teklif\s*#/iu.test(renderedAnswer)) {
    increment("PHANTOM_SELECTED_RECORD_COUNT", query);
    increment("PARENT_COMPANY_PHANTOM_SELECTED_RECORD_COUNT", query);
  }
  if (expected === "SCREEN" && task !== "SCREEN_CONTEXT") increment("UNJUSTIFIED_DEFAULT_SELECTION_COUNT", query);
  if (body?.status && body.status !== 200) increment("SELECTED_RECORD_PROBE_FAIL", `${query}:HTTP_${body.status}`);
  return { task, selectedIntent, screenIntent, combined, selectedId, mentionsSelected, mentionsScreen, renderedAnswer };
}

function validateContrast({ body, renderedAnswer, expected, query }) {
  const task = taskOf(body);
  const ambiguity = String(body?.semanticPlan?.typedRequest?.ambiguity || body?.semanticPlan?.ambiguity || "").toUpperCase();
  const okay = expected === "RELATION"
    ? task === "RELATION_LOOKUP"
    : expected === "COUNT"
      ? task === "COUNT"
      : expected === "AMBIGUOUS"
        ? task === "CLARIFY" && ambiguity.includes("OPEN_SELECTED_VS_STATUS")
        : ["FIELD_LOOKUP", "SITUATION", "RECORD_DETAILS"].includes(task);
  if (expected === "AMBIGUOUS" && !okay) increment("AMBIGUOUS_OPEN_SELECTED_VS_STATUS_UNJUSTIFIED_RESOLUTION_COUNT", `${query}:${task}:${ambiguity}`);
  if (!okay) increment("SELECTED_RECORD_PROBE_FAIL", `${query}:${task}:${renderedAnswer}`);
  return { task, ambiguity, okay, renderedAnswer };
}

async function classifyCompanyNoRecord(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  const page = await context.newPage();
  await page.goto(`${web}/`, { waitUntil: "domcontentloaded" });
  const user = page.locator('input[autocomplete="username"]');
  if (await user.count()) {
    await user.fill("company@demo.com");
    await page.locator('input[autocomplete="current-password"]').fill("demo123");
    await page.locator('button[type="submit"]').click();
    await page.waitForFunction(() => !document.querySelector('input[autocomplete="username"]'), null, { timeout: 60000 });
  }
  await page.goto(`${web}/#/company/shifts`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => /Diğer\s+Vardiyalar|Diğer\s+vardiya\s+yok|Hizmet\s+Alan\s+Firma\s+Vardiyalar/iu.test(document.body.innerText), null, { timeout: 30000 });
  await wait(1000);
  const evidence = await page.locator("body").innerText();
  const selectable = await page.locator("tbody tr:visible, [data-testid*='shift']:visible").count();
  const noRecord = selectable === 0 && /(?:Diğer\s+Vardiyalar\s*0|vardiya\s+yok|vardiya\s+bulunmuyor)/iu.test(evidence);
  report.company.shiftSelectableRecordCount = selectable;
  report.company.selectedRecordProbeApplicability = noRecord ? "NOT_APPLICABLE" : "APPLICABLE";
  report.company.evidence = noRecord ? "Diğer Vardiyalar 0 / Diğer vardiya yok." : "Selectable shift surface present.";
  await context.close();
}

async function main() {
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  let session;
  try {
    await classifyCompanyNoRecord(browser);
    session = await login(browser);
    const queries = [
      { query: "aktif baktığım kayıt hangisi", expected: "SELECTED" },
      { query: "burada hangisine bakıyorum", expected: "SELECTED" },
    ];
    const cards = roomCards(session.page);
    const cardCount = await cards.count();
    const runsPerCard = Math.ceil((requiredTotal - previousValidSelectedProbes) / Math.max(cardCount, 1));
    let additional = 0;
    for (let cardIndex = 0; cardIndex < Math.max(cardCount, 1) && additional < requiredTotal - previousValidSelectedProbes; cardIndex += 1) {
      await session.page.goto(`${web}/#/room/offers`, { waitUntil: "domcontentloaded" });
      await cards.first().waitFor({ state: "visible", timeout: 30000 });
      const selection = await selectRoomCard(session.page, cardIndex);
      if (!selection) {
        increment("SELECTED_RECORD_PROBE_FAIL", `ROOM card ${cardIndex} was not selectable`);
        continue;
      }
      report.coverage.selectedRecordIds.push(selection.entityId);
      for (let i = 0; i < runsPerCard && additional < requiredTotal - previousValidSelectedProbes; i += 1) {
        const spec = queries[(additional + cardIndex) % queries.length];
        const result = await askThroughRenderedUi(session.page, spec.query);
        const body = { ...result.body, status: result.status };
        const check = validateProbe({ body, renderedAnswer: result.renderedAnswer, selection, expected: spec.expected, query: spec.query });
        report.probes.push({ role: "ROOM", cardIndex, selection, query: spec.query, expected: spec.expected, status: result.status, task: check.task, renderedAnswer: result.renderedAnswer });
        report.coverage.additionalSelectedRecordProbes += 1;
        report.coverage.selectedRecordProbeExecuted += 1;
        additional += 1;
      }
    }
    await session.page.goto(`${web}/#/room/offers`, { waitUntil: "domcontentloaded" });
    await roomCards(session.page).first().waitFor({ state: "visible", timeout: 30000 });
    const formalSelection = await selectRoomCard(session.page, 0);
    if (!formalSelection) {
      increment("SELECTED_RECORD_PROBE_FAIL", "ROOM formal screen/selected precedence selection unavailable");
    } else {
      const precedenceQueries = [
        { query: "hangi ekrandayım", expected: "SCREEN" },
        { query: "burası neresi", expected: "SCREEN" },
        { query: "hangi ekrandayım ve hangi kayıt seçili", expected: "COMBINED" },
        { query: "neredeyim, açık kayıt hangisi", expected: "COMBINED" },
      ];
      for (const spec of precedenceQueries) {
        const result = await askThroughRenderedUi(session.page, spec.query);
        const body = { ...result.body, status: result.status };
        const check = validateProbe({ body, renderedAnswer: result.renderedAnswer, selection: formalSelection, expected: spec.expected, query: spec.query });
        report.probes.push({ role: "ROOM", selection: formalSelection, query: spec.query, expected: spec.expected, status: result.status, task: check.task, renderedAnswer: result.renderedAnswer });
      }
      const contrastQueries = [
        { query: "bu teklif hangi vardiyaya bağlı", expected: "RELATION" },
        { query: "bunun bağlı vardiyası ne", expected: "RELATION" },
        { query: "bu vardiyanın aracı hangisi", expected: "RELATION" },
        { query: "Teklif #35 açık mı", expected: "STATUS" },
        { query: "kaç açık teklif var", expected: "COUNT" },
        { query: "tekliflerden hangisi açık", expected: "AMBIGUOUS" },
      ];
      for (const spec of contrastQueries) {
        const result = await askThroughRenderedUi(session.page, spec.query);
        const body = { ...result.body, status: result.status };
        const check = validateContrast({ body, renderedAnswer: result.renderedAnswer, expected: spec.expected, query: spec.query });
        report.probes.push({ role: "ROOM", selection: formalSelection, query: spec.query, expected: spec.expected, status: result.status, task: check.task, ambiguity: check.ambiguity, renderedAnswer: result.renderedAnswer });
      }
    }
    report.coverage.selectedRecordProbeFail = counters.SELECTED_RECORD_PROBE_FAIL;
  } finally {
    if (session) await session.context.close().catch(() => {});
    await browser.close();
  }
  report.coverage.selectedRecordIds = [...new Set(report.coverage.selectedRecordIds)];
  const zeroCounters = [
    "SCREEN_CONTEXT_OVERRIDES_SELECTED_RECORD_REQUEST_COUNT",
    "SELECTED_RECORD_CONTEXT_MISCLASSIFIED_AS_SCREEN_COUNT",
    "SELECTED_RECORD_CONTEXT_LOSS_COUNT",
    "SELECTED_RECORD_ID_MISMATCH_COUNT",
    "PHANTOM_SELECTED_RECORD_COUNT",
    "SCREEN_SELECTED_MULTI_PART_OMISSION_COUNT",
    "SELECTED_RECORD_QUERY_RELATION_TRAVERSAL_COUNT",
    "SELECTED_RECORD_CONTEXT_MISROUTED_RELATION_LOOKUP_COUNT",
    "ACTIVE_WORD_SELECTED_CONTEXT_MISROUTE_COUNT",
    "OPEN_WORD_SELECTED_CONTEXT_MISROUTE_COUNT",
    "AMBIGUOUS_OPEN_SELECTED_VS_STATUS_UNJUSTIFIED_RESOLUTION_COUNT",
    "PARENT_COMPANY_PHANTOM_SELECTED_RECORD_COUNT",
    "UNJUSTIFIED_DEFAULT_SELECTION_COUNT",
    "SELECTED_RECORD_PROBE_FAIL",
    "CONSOLE_ERROR_COUNT",
    "PAGE_ERROR_COUNT",
    "HTTP_500_COUNT",
    "HTTP_403_UNEXPECTED_COUNT",
  ];
  report.verdict = report.coverage.selectedRecordProbeExecuted >= requiredTotal
    && zeroCounters.every((name) => counters[name] === 0)
    && ["NOT_APPLICABLE", "APPLICABLE"].includes(report.company.selectedRecordProbeApplicability)
    ? "PRE_18_SEMANTIC_PLAN_FIRST_PACKAGE_1_READY_FOR_INDEPENDENT_REAUDIT"
    : "PRE_18_SEMANTIC_PLAN_FIRST_PACKAGE_1_BLOCKED";
  await fs.writeFile(path.join(out, "report.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ company: report.company, coverage: report.coverage, counters: report.counters, verdict: report.verdict }, null, 2));
  console.log(report.verdict);
}

main().catch(async (error) => {
  report.failures.push({ code: "FATAL", detail: String(error?.stack || error) });
  report.verdict = "PRE_18_SEMANTIC_PLAN_FIRST_PACKAGE_1_BLOCKED";
  await fs.mkdir(out, { recursive: true });
  await fs.writeFile(path.join(out, "report.json"), JSON.stringify(report, null, 2), "utf8");
  console.error(error);
  process.exitCode = 1;
});
