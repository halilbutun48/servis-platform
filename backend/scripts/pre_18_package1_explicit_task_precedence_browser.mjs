import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const web = (process.env.WEB_BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const reportPath = process.env.EXPLICIT_TASK_REPORT_PATH
  ? path.resolve(process.env.EXPLICIT_TASK_REPORT_PATH)
  : path.join(root, "explicit-task-precedence-report.json");

const counters = Object.fromEntries([
  "REFERENTIAL_ENTITY_MISCLASSIFIED_AS_IDENTITY_TASK_COUNT",
  "SELECTED_RECORD_IDENTITY_CUE_OVERRIDES_EXPLICIT_TASK_COUNT",
  "MULTI_PART_REQUEST_OMISSION_COUNT",
  "REQUESTED_SLOT_LOSS_COUNT",
  "SELECTED_RECORD_CONTEXT_LOSS_COUNT",
  "SELECTED_RECORD_ID_MISMATCH_COUNT",
  "PHANTOM_SELECTED_RECORD_COUNT",
  "USER_VISIBLE_BACKEND_ENUM_LEAK_COUNT",
  "HTTP_500_COUNT",
  "HTTP_403_UNEXPECTED_COUNT",
  "CONSOLE_ERROR_COUNT",
  "PAGE_ERROR_COUNT",
].map((key) => [key, 0]));

const report = {
  generatedAt: new Date().toISOString(),
  runtime: { web, freshContexts: 0, syntheticEntityInjection: false },
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

function fail(code, detail) {
  counters[code] += 1;
  report.failures.push({ code, detail });
}

function taskOf(body) {
  return String(body?.semanticPlan?.typedRequest?.taskType
    || body?.semanticPlan?.taskType
    || body?.semanticPlan?.family
    || "").toUpperCase();
}

function answerText(body, rendered) {
  return norm([rendered, body?.reply, body?.summary].filter(Boolean).join(" "));
}

function observe(page) {
  page.on("console", (message) => {
    if (message.type() === "error") fail("CONSOLE_ERROR_COUNT", message.text());
  });
  page.on("pageerror", (error) => fail("PAGE_ERROR_COUNT", String(error?.message || error)));
  page.on("response", (response) => {
    if (response.status() >= 500) fail("HTTP_500_COUNT", `${response.status()} ${response.url()}`);
    if (response.status() === 403 && response.url().includes("/api/") && !response.url().includes("/api/auth")) fail("HTTP_403_UNEXPECTED_COUNT", response.url());
  });
}

async function loginAndSelect(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  observe(page);
  await page.goto(`${web}/`, { waitUntil: "domcontentloaded" });
  await page.locator('input[autocomplete="username"]').fill("room@demo.com");
  await page.locator('input[autocomplete="current-password"]').fill("demo123");
  await page.locator('button[type="submit"]').click();
  await page.waitForFunction(() => !document.querySelector('input[autocomplete="username"]'), null, { timeout: 60000 });
  await page.goto(`${web}/#/room/offers`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const cards = page.locator("[class~='pre18-room-offer-card']:visible")
    .filter({ hasText: /Vardiya\s*#\s*\d+/iu })
    .filter({ hasText: /Teklif ayrıntılarını göster|Teklif ayrintilarini goster/iu });
  await cards.first().waitFor({ state: "visible", timeout: 30000 });
  await cards.first().click();
  await page.waitForFunction(() => Number(window.__psv1CopilotSelection?.entityId || 0) > 0, null, { timeout: 15000 });
  const selection = await page.evaluate(() => window.__psv1CopilotSelection || null);
  report.runtime.freshContexts += 1;
  return { context, page, selection };
}

async function ask(session, query) {
  const fab = session.page.locator(".copilotFab:visible").first();
  if (await fab.count()) await fab.click();
  const drawer = session.page.locator(".copilotDrawer:visible").first();
  await drawer.waitFor({ state: "visible" });
  const before = await drawer.locator(".copilotMsg.assistant").count();
  await drawer.locator("textarea").first().fill(query);
  const [response] = await Promise.all([
    session.page.waitForResponse((candidate) => new URL(candidate.url()).pathname === "/api/ai/copilot", { timeout: 30000 }),
    drawer.locator('button[type="submit"]').click(),
  ]);
  const body = await response.json();
  await session.page.waitForFunction((previous) => document.querySelectorAll(".copilotDrawer .copilotMsg.assistant").length > previous, before, { timeout: 30000 });
  return { status: response.status(), body, rendered: norm(await drawer.locator(".copilotMsg.assistant").last().innerText()) };
}

function assertProbe({ session, query, expectedTask, expectedTasks = [], requiredText = [], identity = false }) {
  return ask(session, query).then((result) => {
    const task = taskOf(result.body);
    const typed = result.body?.semanticPlan?.typedRequest || {};
    const text = answerText(result.body, result.rendered);
    const selectedId = String(session.selection?.entityId || "");
    report.probes.push({
      query,
      status: result.status,
      task,
      requestedTasks: typed.requestedTasks || [],
      slots: result.body?.semanticPlan?.requestedTaskSlots || [],
      rendered: result.rendered,
      executionFacts: result.body?.queryPlanExecution?.structuredFacts || [],
    });
    if (result.status !== 200) fail("HTTP_500_COUNT", `${query}:HTTP_${result.status}`);
    if (/\b(?:requested|open|countered|approved|active|draft|incomplete|high)\b/iu.test(text)) fail("USER_VISIBLE_BACKEND_ENUM_LEAK_COUNT", query);
    if (task !== expectedTask) {
      fail("REFERENTIAL_ENTITY_MISCLASSIFIED_AS_IDENTITY_TASK_COUNT", `${query}:expected=${expectedTask}:actual=${task}`);
      if (task === "SELECTED_RECORD_CONTEXT" && expectedTask !== "SELECTED_RECORD_CONTEXT") fail("SELECTED_RECORD_IDENTITY_CUE_OVERRIDES_EXPLICIT_TASK_COUNT", query);
    }
    for (const taskName of expectedTasks) {
      if (!typed.requestedTasks?.includes(taskName)) {
        fail("REQUESTED_SLOT_LOSS_COUNT", `${query}:missing-task=${taskName}`);
        if (expectedTasks.length > 1) fail("MULTI_PART_REQUEST_OMISSION_COUNT", `${query}:missing-task=${taskName}`);
      }
    }
    for (const pattern of requiredText) {
      if (!pattern.test(text)) {
        fail(expectedTasks.length > 1 ? "MULTI_PART_REQUEST_OMISSION_COUNT" : "REQUESTED_SLOT_LOSS_COUNT", `${query}:missing-rendered-slot=${pattern}`);
      }
    }
    if (identity) {
      if (!selectedId) fail("PHANTOM_SELECTED_RECORD_COUNT", `${query}:no canonical selection`);
      if (selectedId && !new RegExp(`#?${selectedId}\\b`).test(text)) fail("SELECTED_RECORD_ID_MISMATCH_COUNT", `${query}:selected=${selectedId}`);
      if (task !== "SELECTED_RECORD_CONTEXT") fail("SELECTED_RECORD_CONTEXT_LOSS_COUNT", `${query}:actual=${task}`);
    }
  });
}

const browser = await chromium.launch({ headless: true });
let session;
try {
  session = await loginAndSelect(browser);
  if (!session.selection?.entityId) fail("PHANTOM_SELECTED_RECORD_COUNT", "ROOM selected offer was unavailable");
  const identity = { expectedTask: "SELECTED_RECORD_CONTEXT", identity: true };
  const targeted = [
    { query: "bu teklif hangisi", ...identity },
    { query: "hangi teklife bakıyorum", ...identity },
    { query: "seçili teklif ne", ...identity },
    { query: "bu teklifin riski ne", expectedTask: "RISK", expectedTasks: ["RISK"], requiredText: [/risk|yuksek/] },
    { query: "bunun riskli tarafı ne", expectedTask: "RISK", expectedTasks: ["RISK"], requiredText: [/risk|yuksek/] },
    { query: "bu teklif için şimdi ne yapmalıyım", expectedTask: "NEXT_ACTION", expectedTasks: ["NEXT_ACTION"], requiredText: [/sonraki|adim/] },
    { query: "bunun sonraki adımı ne", expectedTask: "NEXT_ACTION", expectedTasks: ["NEXT_ACTION"], requiredText: [/sonraki|adim/] },
    { query: "bu teklifin riski ve sonraki adımı ne", expectedTask: "RISK", expectedTasks: ["RISK", "NEXT_ACTION"], requiredText: [/risk|yuksek/, /sonraki|adim/] },
    { query: "bunun durumu, riski ve ne yapmam gerektiğini söyle", expectedTask: "RISK", expectedTasks: ["FIELD_LOOKUP", "RISK", "NEXT_ACTION"], requiredText: [/acik/, /risk|yuksek/, /sonraki|adim/] },
    { query: "bu teklifin tutarı ne", expectedTask: "FIELD_LOOKUP", expectedTasks: ["FIELD_LOOKUP"], requiredText: [/12[.\s]?000/] },
    { query: "bu teklifin içeriği ne", expectedTask: "RECORD_DETAILS", expectedTasks: ["RECORD_DETAILS"], requiredText: [/teklif\s*#?\s*35/] },
    { query: "bu teklif hangi vardiyaya bağlı", expectedTask: "RELATION_LOOKUP", expectedTasks: ["RELATION_LOOKUP"], requiredText: [/vardiya\s*#?\s*167/] },
    { query: "bu teklif neden önemli", expectedTask: "CAUSE", expectedTasks: ["CAUSE"], requiredText: [/neden|gerekce|risk|eksik/] },
  ];
  for (const probe of targeted) await assertProbe({ session, ...probe });
} finally {
  if (session) await session.context.close();
  await browser.close();
}

report.verdict = Object.values(counters).every((value) => value === 0)
  ? "PRE_18_PACKAGE1_EXPLICIT_TASK_PRECEDENCE_TARGETED_GREEN"
  : "PRE_18_PACKAGE1_EXPLICIT_TASK_PRECEDENCE_TARGETED_BLOCKED";
await fs.mkdir(path.dirname(reportPath), { recursive: true });
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
console.log(report.verdict);
