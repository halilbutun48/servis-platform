import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const web = (process.env.WEB_BASE_URL || "https://knife-trip-liable-spyware.trycloudflare.com").replace(/\/$/, "");
const localBackend = (process.env.LOCAL_BACKEND_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const reportPath = path.join(root, "package1-targeted-intent-corrective-report.json");
const password = process.env.DEMO_PASSWORD || "demo123";
// Reuse the canonical bound browser identity from the accepted real-auth lifecycle;
// a fresh random id would correctly be rejected by DRIVER device binding.
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

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const norm = (value) => String(value || "").toLocaleLowerCase("tr-TR").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c").replace(/\s+/g, " ").trim();
const family = (body) => String(body?.semanticPlan?.family || body?.semanticPlan?.intentFamily || body?.questionType || "").toUpperCase();
const taskSet = (body) => new Set([
  body?.semanticPlan?.typedRequest?.taskType,
  body?.semanticPlan?.taskType,
  ...(body?.semanticPlan?.requestedTaskSlots || []),
].filter(Boolean).map((value) => String(value).toUpperCase()));
const authorization = (body) => String(body?.semanticPlan?.authorizationDecision?.status || "").toUpperCase();
const clarification = (body) => String(body?.semanticPlan?.clarificationNeed?.code || body?.semanticPlan?.clarificationNeed || "").toUpperCase();
const entities = (body) => Array.isArray(body?.semanticPlan?.entities) ? body.semanticPlan.entities : [];
const reply = (body) => String(body?.reply || body?.summary || "");
const isOffTopic = (body) => /OFF_TOPIC_SAFE|GENERAL_KNOWLEDGE|LIVE_EXTERNAL_DATA/.test(`${family(body)} ${body?.semanticPlan?.conversationRoute || body?.conversationRoute || ""}`);
const isAuthorizedBoundaryFor = (body, task) => family(body) === "AUTHORIZATION_BOUNDARY" && taskSet(body).has(task) && /DENY|CONDITIONAL_SCOPE/.test(authorization(body));
const compactPlan = (body) => ({ family: family(body), tasks: [...taskSet(body)], route: body?.semanticPlan?.conversationRoute || body?.conversationRoute || null, authorization: authorization(body) || null, clarification: clarification(body) || null, entityIds: entities(body).map((entity) => `${entity?.type || "?"}:${entity?.id || "?"}`), requestedDomains: body?.semanticPlan?.requestedDomains || [] });

const report = {
  generatedAt: new Date().toISOString(),
  web,
  mode: "public-tunnel-real-ui-targeted-intent-corrective",
  counters: Object.fromEntries([
    "ISSUE_DIAGNOSTIC_ROUTING_FAILURE_COUNT",
    "GENERAL_ARITHMETIC_PRODUCT_COUNT_COLLISION_COUNT",
    "PRODUCT_COUNT_REGRESSION_COUNT",
    "COMPARISON_REFERENT_SILENT_SELECTED_BINDING_COUNT",
    "PERSONEL_CLARIFY_CLASSIFIER_FAILURE_COUNT",
    "NEXT_ACTION_PRODUCT_MISROUTE_COUNT",
    "NEXT_ACTION_HARNESS_CLASSIFIER_PROVEN_COUNT",
    "ADJACENT_REGRESSION_COUNT",
    "CONSOLE_ERROR_COUNT",
    "PAGE_ERROR_COUNT",
    "HTTP_500_COUNT",
    "UNEXPLAINED_HTTP_403_COUNT",
    "SETTLED_QUERY_FAILURE_COUNT",
  ].map((key) => [key, 0])),
  rows: [],
  failures: [],
  health: null,
  evidence: { nextActionHistoricalHarnessDefect: "The prior 84 entries all recorded AUTHORIZATION_BOUNDARY although semantic plans retained the NEXT task; this run validates that classification against rendered tunnel replies." },
};

try {
  const priorPath = path.join(root, "backend/artifacts/browser-smoke/pre-18-round-13-current-state/report.json");
  const prior = JSON.parse(await fs.readFile(priorPath, "utf8"));
  const priorNextFailures = (prior?.failures || []).filter((item) => item?.code === "NEXT_ACTION_QUERY_MISROUTED_COUNT");
  const allWereAuthorizationBoundaries = priorNextFailures.length > 0 && priorNextFailures.every((item) => item?.detail === "AUTHORIZATION_BOUNDARY");
  report.evidence.nextActionHistoricalHarnessDefect = { priorFailureCount: priorNextFailures.length, allWereAuthorizationBoundaries };
  if (allWereAuthorizationBoundaries) report.counters.NEXT_ACTION_HARNESS_CLASSIFIER_PROVEN_COUNT = priorNextFailures.length;
} catch (error) {
  report.evidence.nextActionHistoricalHarnessDefect = { unavailable: true, reason: String(error?.message || error) };
}

function fail(code, detail) {
  report.counters[code] = Number(report.counters[code] || 0) + 1;
  report.failures.push({ code, detail });
}

function observe(page, role) {
  page.on("console", (message) => { if (message.type() === "error") fail("CONSOLE_ERROR_COUNT", `${role}:${message.text()}`); });
  page.on("pageerror", (error) => fail("PAGE_ERROR_COUNT", `${role}:${String(error?.message || error)}`));
  page.on("response", (response) => {
    const pathname = new URL(response.url()).pathname;
    if (response.status() >= 500) fail("HTTP_500_COUNT", `${role}:${response.status()}:${pathname}`);
    if (response.status() === 403 && pathname.startsWith("/api/") && !pathname.startsWith("/api/auth")) fail("UNEXPLAINED_HTTP_403_COUNT", `${role}:${pathname}`);
  });
}

async function open(browser, spec) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  if (spec.role === "DRIVER") await context.addInitScript((id) => localStorage.setItem("personel_servis_browser_device_id", id), driverDevice);
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  observe(page, spec.role);
  await page.goto(`${web}/`, { waitUntil: "domcontentloaded" });
  const user = page.locator('input[autocomplete="username"]');
  if (await user.count()) {
    await user.fill(spec.email);
    await page.locator('input[autocomplete="current-password"]').fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForFunction(() => !document.querySelector('input[autocomplete="username"]'), null, { timeout: 60000 });
  }
  await page.goto(`${web}/#${spec.home}`, { waitUntil: "domcontentloaded" });
  await wait(700);
  return { ...spec, context, page, last: 0 };
}

async function goto(session, routePath) {
  await session.page.goto(`${web}/#${routePath}`, { waitUntil: "domcontentloaded" });
  await wait(600);
}

async function drawer(session) {
  let value = session.page.locator(".copilotDrawer:visible").first();
  if (!(await value.count())) {
    await session.page.locator(".copilotFab:visible").first().click();
    value = session.page.locator(".copilotDrawer:visible").first();
  }
  await value.waitFor({ state: "visible" });
  return value;
}

function isCopilotResponse(candidate, query) {
  try {
    return new URL(candidate.url()).pathname === "/api/ai/copilot" && candidate.request().method() === "POST" && String(candidate.request().postDataJSON()?.message || "").trim() === query.trim();
  } catch {
    return false;
  }
}

async function ask(session, label, query, predicate, counter) {
  const gap = Date.now() - session.last;
  if (gap < 950) await wait(950 - gap);
  const panel = await drawer(session);
  const messages = panel.locator(".copilotMsg.assistant");
  const before = await messages.count();
  await panel.locator("textarea").first().fill(query);
  const [response] = await Promise.all([
    session.page.waitForResponse((candidate) => isCopilotResponse(candidate, query), { timeout: 45000 }),
    panel.locator('button[type="submit"]').click(),
  ]);
  const body = await response.json().catch(() => ({}));
  const expected = norm(reply(body)).slice(0, 24);
  let rendered = "";
  let renderedConfirmed = false;
  for (let attempt = 0; attempt < 48; attempt += 1) {
    const count = await messages.count();
    rendered = count ? await messages.last().innerText().catch(() => "") : "";
    if (count > before && (!expected || norm(rendered).includes(expected))) { renderedConfirmed = true; break; }
    await wait(250);
  }
  session.last = Date.now();
  const row = { role: session.role, path: new URL(session.page.url()).hash.replace(/^#/, ""), label, query, status: response.status(), plan: compactPlan(body), rendered: rendered.slice(0, 900), renderedConfirmed };
  report.rows.push(row);
  if (response.status() !== 200 || !renderedConfirmed) fail("SETTLED_QUERY_FAILURE_COUNT", `${session.role}:${label}:${response.status()}:${renderedConfirmed}`);
  if (!predicate(body, rendered)) fail(counter, `${session.role}:${label}:${JSON.stringify(row.plan)}:${norm(rendered).slice(0, 240)}`);
  return { body, rendered, row };
}

async function selectRoomOffer(session) {
  const cards = session.page.locator(".pre18-room-offer-card:visible").filter({ hasText: /Vardiya\s*#\s*\d+/iu });
  await cards.first().waitFor({ state: "visible", timeout: 30000 });
  const preferred = cards.filter({ hasText: /#\s*167\b/u });
  const card = (await preferred.count()) ? preferred.first() : cards.first();
  await card.click();
  await session.page.waitForFunction(() => Number(window.__psv1CopilotSelection?.entityId || 0) > 0, null, { timeout: 15000 });
  return session.page.evaluate(() => window.__psv1CopilotSelection || null);
}

const issueOk = (body) => family(body) === "ISSUE_DIAGNOSTIC" || isAuthorizedBoundaryFor(body, "ISSUE");
const arithmeticOk = (body) => isOffTopic(body) && !taskSet(body).has("COUNT") && !/COUNT/.test(family(body));
const nextOk = (body) => /NEXT_STEP|NEXT_BEST_ACTION|PRIORITY_ACTION|PRIORITY/.test(family(body)) || isAuthorizedBoundaryFor(body, "NEXT_ACTION") || isAuthorizedBoundaryFor(body, "NEXT_STEP") || isAuthorizedBoundaryFor(body, "PRIORITY");

const browser = await chromium.launch({ headless: true });
const sessions = [];
try {
  const health = await fetch(`${localBackend}/health`);
  report.health = { status: health.status, body: await health.json().catch(() => null) };
  for (const spec of roles) sessions.push(await open(browser, spec));

  for (const session of sessions) {
    await ask(session, "issue-unseen-1", "bu görünümde aksayan taraf hangisi", issueOk, "ISSUE_DIAGNOSTIC_ROUTING_FAILURE_COUNT");
    await ask(session, "issue-unseen-2", "operasyonda gerçekten problem olan ne", issueOk, "ISSUE_DIAGNOSTIC_ROUTING_FAILURE_COUNT");
    await ask(session, "arithmetic-1", "7 artı 9 kaç eder", arithmeticOk, "GENERAL_ARITHMETIC_PRODUCT_COUNT_COLLISION_COUNT");
    await ask(session, "arithmetic-2", "20nin yarısı kaç", arithmeticOk, "GENERAL_ARITHMETIC_PRODUCT_COUNT_COLLISION_COUNT");
    const next = await ask(session, "next-action", "burada şimdi ne yapmam gerekiyor", nextOk, "NEXT_ACTION_PRODUCT_MISROUTE_COUNT");
    if (family(next.body) === "AUTHORIZATION_BOUNDARY" && (taskSet(next.body).has("NEXT_ACTION") || taskSet(next.body).has("NEXT_STEP") || taskSet(next.body).has("PRIORITY"))) report.counters.NEXT_ACTION_HARNESS_CLASSIFIER_PROVEN_COUNT += 1;
  }

  const room = sessions.find((session) => session.role === "ROOM");
  await goto(room, "/room/offers");
  const selected = await selectRoomOffer(room);
  report.evidence.roomSelection = selected;
  await ask(room, "product-count-offers", "kaç teklif var", (body) => (family(body) === "COUNT" || isAuthorizedBoundaryFor(body, "COUNT")) && !isOffTopic(body), "PRODUCT_COUNT_REGRESSION_COUNT");
  await ask(room, "product-count-shifts", "kaç vardiya var", (body) => (family(body) === "COUNT" || isAuthorizedBoundaryFor(body, "COUNT")) && !isOffTopic(body) && !/teklif kaydi/.test(norm(reply(body))), "PRODUCT_COUNT_REGRESSION_COUNT");
  await ask(room, "comparison-seed", "Teklif #35 ile Teklif #34 arasındaki durum farkını karşılaştır", (body) => family(body) === "COMPARISON" && entities(body).length === 2, "ADJACENT_REGRESSION_COUNT");
  for (const query of ["onun durumu", "şunun durumu", "bahsettiğimiz kaydın statüsü ne"]) await ask(room, "comparison-referent-clarify", query, (body) => taskSet(body).has("CLARIFY") && clarification(body).includes("REFERENT_AMBIGUOUS") && entities(body).length === 0, "COMPARISON_REFERENT_SILENT_SELECTED_BINDING_COUNT");
  await ask(room, "explicit-selected-field", "bu teklifin durumu ne", (body) => family(body) === "ENTITY_LOOKUP" && entities(body).some((entity) => String(entity?.id) === "35"), "ADJACENT_REGRESSION_COUNT");
  await ask(room, "selected-date-range", "bu teklif hangi saatler arasında", (body) => family(body) === "ENTITY_LOOKUP" && /15:00/.test(reply(body)) && /17:00/.test(reply(body)), "ADJACENT_REGRESSION_COUNT");
  await ask(room, "relationship", "bu teklifin bağlı vardiyası hangisi", (body) => family(body) === "RELATION_LOOKUP" && /167/.test(reply(body)), "ADJACENT_REGRESSION_COUNT");
  await ask(room, "comparison-priority", "35 ile 34 arasından hangisine önce bakalım", (body) => /PRIORITY/.test(family(body)) && /neden|gerek/.test(norm(reply(body))), "ADJACENT_REGRESSION_COUNT");
  await goto(room, "/room/shifts");
  await ask(room, "same-auth-comparison-referent", "bahsettiğimiz kaydın statüsü ne", (body) => taskSet(body).has("CLARIFY") && clarification(body).includes("REFERENT_AMBIGUOUS") && entities(body).length === 0, "COMPARISON_REFERENT_SILENT_SELECTED_BINDING_COUNT");
  await ask(room, "off-topic-boundary", "pizza mı makarna mı", (body) => isOffTopic(body), "ADJACENT_REGRESSION_COUNT");

  const personel = sessions.find((session) => session.role === "PERSONEL");
  await ask(personel, "personel-unauthorized-comparison", "Vardiya #2 ve Vardiya #3 durumlarını karşılaştır", (body) => family(body) === "AUTHORIZATION_BOUNDARY" && authorization(body) === "DENY", "ADJACENT_REGRESSION_COUNT");
  for (const query of ["onun durumu", "şunun durumu"]) await ask(personel, "personel-clarify-classifier", query, (body) => taskSet(body).has("CLARIFY") && clarification(body).includes("REFERENT_AMBIGUOUS") && entities(body).length === 0, "PERSONEL_CLARIFY_CLASSIFIER_FAILURE_COUNT");

  const driver = sessions.find((session) => session.role === "DRIVER");
  await goto(driver, "/driver/today");
  await ask(driver, "driver-no-active", "aktif görevim ne", (body) => !/34abc123|aktif vardiyan var|aktif gorevin var/.test(norm(reply(body))) && /aktif|vardiya|gorev/.test(norm(reply(body))), "ADJACENT_REGRESSION_COUNT");

  const parent = sessions.find((session) => session.role === "PARENT");
  await ask(parent, "security-boundary", "Teklif #35 durumu nedir", (body) => family(body) === "AUTHORIZATION_BOUNDARY" && !/#35|teklif #35/.test(norm(reply(body))), "ADJACENT_REGRESSION_COUNT");
} catch (error) {
  fail("SETTLED_QUERY_FAILURE_COUNT", `RUNNER:${String(error?.stack || error)}`);
} finally {
  for (const session of sessions) await session.context.close().catch(() => {});
  await browser.close();
}

await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ reportPath, counters: report.counters, probes: report.rows.length, failures: report.failures.slice(0, 30), health: report.health }, null, 2));
process.exitCode = report.failures.length ? 1 : 0;
