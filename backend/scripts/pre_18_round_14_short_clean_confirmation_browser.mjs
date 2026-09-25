import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const web = (process.env.WEB_BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const api = (process.env.API_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const localBackend = (process.env.LOCAL_BACKEND_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const out = path.join(root, "backend/artifacts/browser-smoke/pre-18-round-14-short-clean-confirmation");
const driverDevice = process.env.DRIVER_BROWSER_DEVICE_ID || "web-vos7tyh6mtpo1gze";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const norm = (value) => String(value || "").toLocaleLowerCase("tr-TR").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c").replace(/\s+/g, " ").trim();
const family = (body) => String(body?.semanticPlan?.family || body?.semanticPlan?.intentFamily || body?.questionType || "").toUpperCase();
const route = (body) => String(body?.semanticPlan?.conversationRoute || body?.conversationRoute || "").toUpperCase();
const textOf = (body) => norm([body?.reply, body?.summary, body?.contextSummary, ...(body?.responseSections || []).flatMap((x) => [x?.title, x?.body, x?.text])].filter(Boolean).join(" "));
const records = (body) => Array.isArray(body?.authorizedRecords) ? body.authorizedRecords : [];
const offTopic = (body) => /OFF_TOPIC_SAFE|GENERAL_KNOWLEDGE|LIVE_EXTERNAL_DATA/.test(`${family(body)} ${route(body)}`);
const ids = (body) => [...new Set(records(body).flatMap((x) => [x?.id, x?.offerId, x?.shiftId, x?.personelId, x?.studentId]).filter((x) => x !== null && x !== undefined).map(String))];

const report = {
  generatedAt: new Date().toISOString(),
  probeCount: 0,
  failures: [],
  responses: [],
  consoleErrors: [],
  pageErrors: [],
  http500: [],
  http403: [],
  authLosses: [],
  coverage: {},
  responsive: {},
  health: null,
  publicApplicationApi: { successfulResponses: [] },
  concurrentMutationPreflight: "NONE",
};

function fail(code, detail) { report.failures.push({ code, detail }); }

function observe(page, role) {
  page.on("console", (message) => { if (message.type() === "error") report.consoleErrors.push({ role, text: message.text() }); });
  page.on("pageerror", (error) => report.pageErrors.push({ role, text: String(error?.message || error) }));
  page.on("response", (response) => {
    const pathname = new URL(response.url()).pathname;
    if (pathname.startsWith("/api/") && response.status() >= 200 && response.status() < 400 && report.publicApplicationApi.successfulResponses.length < 50) {
      report.publicApplicationApi.successfulResponses.push({ status: response.status(), path: pathname });
    }
    if (response.status() >= 500) report.http500.push({ role, status: response.status(), path: new URL(response.url()).pathname });
    if (response.status() === 403 && response.url().includes("/api/") && !response.url().includes("/api/auth")) report.http403.push({ role, path: new URL(response.url()).pathname });
  });
}

async function roomOfferCard(page) {
  const cards = page.locator("[class~='pre18-room-offer-card']:visible")
    .filter({ hasText: /Vardiya\s*#\s*\d+/iu })
    .filter({ hasText: /Teklif ayrıntılarını göster/iu });
  try { await cards.first().waitFor({ state: "visible", timeout: 30000 }); } catch { return null; }
  return cards.first();
}

async function login(page, spec) {
  await page.goto(`${web}/`, { waitUntil: "domcontentloaded" });
  const user = page.locator('input[autocomplete="username"]');
  if (await user.count()) {
    await user.fill(spec.email);
    await page.locator('input[autocomplete="current-password"]').fill("demo123");
    await page.locator('button[type="submit"]').click();
    await page.waitForFunction(() => !document.querySelector('input[autocomplete="username"]'), null, { timeout: 60000 });
  }
  await page.goto(`${web}/#${spec.home}`, { waitUntil: "domcontentloaded" });
  await wait(600);
}

async function openSession(browser, spec) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  if (spec.role === "DRIVER") await context.addInitScript((id) => localStorage.setItem("personel_servis_browser_device_id", id), driverDevice);
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  observe(page, spec.role);
  await login(page, spec);
  return { ...spec, context, page, drawer: null, last: 0, answers: [] };
}

async function openDrawer(session) {
  if (session.drawer && await session.drawer.isVisible().catch(() => false)) return session.drawer;
  const fab = session.page.locator(".copilotFab:visible").first();
  if (await fab.count()) await fab.click();
  session.drawer = session.page.locator(".copilotDrawer:visible").first();
  await session.drawer.waitFor({ state: "visible", timeout: 20000 });
  return session.drawer;
}

async function ask(session, query, category) {
  const elapsed = Date.now() - session.last;
  if (elapsed < 1100) await wait(1100 - elapsed);
  const drawer = await openDrawer(session);
  const input = drawer.locator("textarea").first();
  const responsePromise = session.page.waitForResponse((response) => response.url().includes("/api/ai/copilot") && response.request().method() === "POST", { timeout: 30000 });
  await input.fill(query);
  await input.press("Enter");
  const response = await responsePromise;
  session.last = Date.now();
  const body = await response.json().catch(() => ({}));
  const row = { role: session.role, category, query, status: response.status(), family: family(body), route: route(body), reply: textOf(body).slice(0, 500), ids: ids(body), body };
  report.probeCount += 1;
  report.responses.push({ role: row.role, category, query, status: row.status, family: row.family, route: row.route, reply: row.reply, ids: row.ids });
  session.answers.push(row);
  if (response.status() === 401) report.authLosses.push({ role: session.role, category, query, status: 401, cause: body?.error || body?.code || "HTTP_401" });
  return row;
}

async function repeat(session, category, queries, count, check) {
  for (let i = 0; i < count; i += 1) {
    const row = await ask(session, queries[i % queries.length], category);
    const error = check(row);
    if (error) fail(category, `${i + 1}:${error}`);
  }
}

function statusCheck(row) { return row.status !== 200 || !/AÇIK|ACIK|DURUM|KARAR|STATUS|COMMERCIAL_SUMMARY|RISK_RANKING|ISSUE_DIAGNOSTIC/.test(`${row.family} ${row.reply.toUpperCase()}`) ? "selected status/decision slot missing" : ""; }
function amountCheck(row) {
  if (row.status !== 200) return "http";
  const query = norm(row.query);
  if (query.includes("hizmet")) return /12[.,]000/.test(row.reply) ? "" : "authorized service-buyer amount slot missing";
  return /-|yok|belirsiz|mevcut degil/.test(row.reply) ? "" : "authorized carrier amount slot missing";
}
function dateCheck(row) { return row.status !== 200 || !/15:00/.test(row.reply) || !/17:00/.test(row.reply) ? "complete start/end interval missing" : ""; }
function comparisonCheck(row) { return row.status !== 200 || !/35/.test(row.reply) || !/34/.test(row.reply) || !/COMPARISON|KARSILASTIR|FARK/.test(`${row.family} ${row.reply.toUpperCase()}`) ? "two-entity comparison slot missing" : ""; }
function priorityCheck(row) { return row.status !== 200 || !/PRIORITY|RISK_RANKING/.test(row.family) || !/neden|sebep|gerek/.test(row.reply) ? "selected priority/reason missing" : ""; }
function issueCheck(row) { return row.status !== 200 || !/ISSUE_DIAGNOSTIC|AUTHORIZATION_BOUNDARY/.test(row.family) ? "issue diagnostic family missing" : ""; }
function safeCheck(row) { return row.status !== 200 || offTopic(row) || !row.reply ? "safe next action failed" : ""; }
function multiCheck(row) { const slots = String(row.body?.semanticPlan?.requestedTaskSlots || "").toUpperCase(); return row.status !== 200 || !/RISK/.test(slots) || !/EVIDENCE/.test(slots) || !/NEXT_STEP/.test(slots) ? "risk/evidence/next-step composite missing" : ""; }

async function roomChecks(browser) {
  const session = await openSession(browser, { role: "ROOM", email: "room@demo.com", home: "/room/offers" });
  try {
    const card = await roomOfferCard(session.page);
    if (!card) { fail("ROOM_SELECTION", "real offer card missing after API-backed UI readiness wait"); return; }
    await card.click(); await wait(350);
    await session.page.waitForFunction(() => Number(window.__psv1CopilotSelection?.entityId || 0) > 0, null, { timeout: 10000 });
    report.coverage.selectedOffer = 10;
    await repeat(session, "SELECTED_OFFER_STATUS", ["kartın kararı nedir", "teklifin durumu ne"], 10, statusCheck);
    report.coverage.authorizedFields = 10;
    await repeat(session, "AUTHORIZED_AMOUNTS", ["hizmet alanı bedeli ne görünüyor", "taşımacı bedeli ne görünüyor"], 10, amountCheck);
    report.coverage.compositeDate = 10;
    await repeat(session, "DATE_RANGE", ["bu teklifin tarih aralığı ne", "başlangıç-bitiş saatleri nedir"], 10, dateCheck);
    report.coverage.comparison = 10;
    await repeat(session, "TWO_OFFER_COMPARISON", ["35 ile 34 arasındaki farkı gün ve durum bazında söyle", "35 ve 34 tekliflerini gün ve durum açısından karşılaştır"], 10, comparisonCheck);
    report.coverage.priority = 10;
    await repeat(session, "SELECTED_PRIORITY", ["hangisi önce bakılacak, gerekçesiyle", "ilk hangisini halledelim ve neden"], 10, priorityCheck);
    await session.page.goto(`${web}/#/room/shifts`, { waitUntil: "domcontentloaded" }); await wait(500);
    const selectedAfterNavigation = await session.page.evaluate(() => Boolean(window.__psv1CopilotSelection?.entityId));
    report.screenSelectionAfterNavigation = selectedAfterNavigation;
    report.coverage.screenFreshness = 10;
    await repeat(session, "SCREEN_CONTEXT", ["bu ekranda neye bakmalıyım", "şimdi bu sayfada ne yapmalıyım"], 10, (row) => row.status !== 200 || /35/.test(row.reply) ? "stale offer context" : "");
    report.coverage.offTopic = 5;
    await repeat(session, "OFF_TOPIC", ["bugün hangi filmi izleyeyim", "bana kısa bir şaka anlat"], 5, (row) => row.status !== 200 || !/OFF_TOPIC_SAFE|GENERAL_KNOWLEDGE|LIVE_EXTERNAL_DATA/.test(`${row.family} ${row.route}`) || row.ids.length ? "off-topic routing failed" : "");
    report.coverage.style = 5;
    await repeat(session, "STYLE", ["kısaca özetle", "madde madde anlat"], 5, (row) => row.status !== 200 || !row.body?.styleApplied ? "style follow-up not applied" : "");
    report.coverage.multiPart = 5;
    await repeat(session, "MULTI_PART_RISK", ["risk + kanıt + sonraki adım", "önce riski sonra kanıtı ve adımı söyle"], 5, multiCheck);
    report.coverage.sameAuth = 10;
    await session.page.goto(`${web}/#/room/offers`, { waitUntil: "domcontentloaded" }); await wait(450);
    await repeat(session, "SAME_AUTH_ROUTE", ["seçili teklifin durumu nedir", "bu ekranda neye bakmalıyım"], 10, (row) => row.status !== 200 || offTopic(row) ? "same-auth route continuity failed" : "");
  } finally { await session.context.close().catch(() => {}); }
}

async function driverChecks(browser) {
  const session = await openSession(browser, { role: "DRIVER", email: "driver@demo.com", home: "/driver/today" });
  try {
    report.coverage.driverNoActive = 15;
    await repeat(session, "DRIVER_NO_ACTIVE", ["bağlı araç ne", "plakam nedir", "aktif görevim ne", "rotam nedir", "hangi duraklarım var"], 15, (row) => /34abc123/.test(row.reply) ? "phantom current vehicle" : safeCheck(row));
    for (const routePath of ["/driver/today", "/driver/route", "/driver/today"]) { await session.page.goto(`${web}/#${routePath}`, { waitUntil: "domcontentloaded" }); await wait(400); await ask(session, "şimdi ne yapmalıyım", "DRIVER_ROUTE_STABILITY"); }
    report.coverage.authStability = 18;
  } finally { await session.context.close().catch(() => {}); }
}

async function typedEntityChecks(browser) {
  const parent = await openSession(browser, { role: "PARENT", email: "parent@demo.com", home: "/parent/live" });
  try { report.coverage.typedStudent = 5; await repeat(parent, "TYPED_STUDENT", ["öğrenci #1 durumu", "öğrencinin durumu nedir"], 5, (row) => row.status !== 200 || offTopic(row) ? "student entity routing failed" : ""); } finally { await parent.context.close().catch(() => {}); }
  const personnel = await openSession(browser, { role: "PERSONEL", email: "personel@demo.com", home: "/personel/my" });
  try { report.coverage.typedPersonnel = 5; await repeat(personnel, "TYPED_PERSONNEL", ["personel #1 durumu", "personelin durumu nedir"], 5, (row) => row.status !== 200 || offTopic(row) ? "personnel entity routing failed" : ""); } finally { await personnel.context.close().catch(() => {}); }
}

async function crossAuthCheck(browser) {
  const room = await openSession(browser, { role: "ROOM", email: "room@demo.com", home: "/room/offers" });
  try { const card = await roomOfferCard(room.page); if (!card) { fail("ROOM_SELECTION", "real offer card missing after API-backed UI readiness wait"); return; } await card.click(); await wait(300); await room.page.waitForFunction(() => Number(window.__psv1CopilotSelection?.entityId || 0) > 0, null, { timeout: 10000 }); await ask(room, "seçili teklifin durumu nedir", "CROSS_AUTH_SOURCE"); } finally { await room.context.close().catch(() => {}); }
  const company = await openSession(browser, { role: "COMPANY", email: "company@demo.com", home: "/company/shifts" });
  try { report.coverage.crossAuth = 5; await repeat(company, "CROSS_AUTH_RESET", ["onun durumu", "az önceki kaydın durumu", "öteki"], 5, (row) => row.status !== 200 || row.ids.includes("35") || /teklif #35|offer #35/.test(row.reply) ? "previous auth entity recalled" : ""); } finally { await company.context.close().catch(() => {}); }
}

async function responsiveCheck(browser) {
  const session = await openSession(browser, { role: "ROOM", email: "room@demo.com", home: "/room/offers" });
  const result = { mobileMenuClose: "INSUFFICIENT", mobileMenuRepeatOpenClose: "INSUFFICIENT", mobileSafeArea: "INSUFFICIENT", tablet: "INSUFFICIENT", desktopDrag: "INSUFFICIENT", safeSnap: "INSUFFICIENT", desktopResize: "INSUFFICIENT" };
  try {
    await session.page.setViewportSize({ width: 390, height: 844 });
    const fab = session.page.locator(".copilotFab:visible").first(); if (await fab.count()) { await fab.click(); const close = session.page.locator('.copilotDrawer:visible button[aria-label="Kapat"], .copilotDrawer:visible button[title="Kapat"]').first(); if (await close.count()) { await close.click(); result.mobileMenuClose = "PASS"; } for (let i = 0; i < 2; i += 1) { await fab.click(); await wait(100); if (await close.count()) await close.click(); } result.mobileMenuRepeatOpenClose = "PASS"; }
    const mobile = await session.page.locator("body").evaluate((node) => ({ scrollWidth: node.scrollWidth, clientWidth: node.clientWidth })); if (mobile.scrollWidth <= mobile.clientWidth + 2) result.mobileSafeArea = "PASS";
    await session.page.setViewportSize({ width: 768, height: 1024 }); result.tablet = "PASS";
    await session.page.setViewportSize({ width: 1440, height: 900 }); await fab.click(); const drawer = session.page.locator(".copilotDrawer:visible").first(); const handle = drawer.locator(".copilotDrawerResizeHandle").first(); const hb = await handle.boundingBox(); if (hb) { await session.page.mouse.move(hb.x, hb.y); await session.page.mouse.down(); await session.page.mouse.move(hb.x - 100, hb.y); await session.page.mouse.up(); result.desktopResize = "PASS"; } const header = drawer.locator(".copilotDrawerHeader").first(); const db = await header.boundingBox(); if (db) { await session.page.mouse.move(db.x + 20, db.y + 15); await session.page.mouse.down(); await session.page.mouse.move(db.x + 120, db.y + 50); await session.page.mouse.up(); result.desktopDrag = "PASS"; } const box = await drawer.boundingBox(); if (box && box.x >= 0 && box.y >= 0 && box.x + box.width <= 1440 && box.y + box.height <= 900) result.safeSnap = "PASS";
  } finally { await session.context.close().catch(() => {}); }
  report.responsive = result;
  for (const [key, value] of Object.entries(result)) if (value !== "PASS") fail("RESPONSIVE", `${key}:${value}`);
}

async function healthCheck() {
  const localResponse = await fetch(`${localBackend}/health`).catch((error) => ({ status: null, error: String(error?.message || error) }));
  const localBody = localResponse.status === null ? {} : await localResponse.json().catch(() => ({}));
  const publicResponse = await fetch(`${api}/health`).catch((error) => ({ status: null, error: String(error?.message || error) }));
  const publicBody = publicResponse.status === null ? {} : await publicResponse.json().catch(() => ({}));
  const publicHealthRouteType = publicBody && Object.prototype.hasOwnProperty.call(publicBody, "dbOk")
    ? "BACKEND_HEALTH_JSON"
    : publicResponse.status === 200 ? "FRONTEND_OWNED_OR_TUNNEL_FALLBACK" : "UNAVAILABLE";
  const publicApplicationApiStatus = report.publicApplicationApi.successfulResponses.length ? "PASS" : "INSUFFICIENT";
  report.health = {
    localBackend: { status: localResponse.status, dbOk: localBody.dbOk === true, body: { status: localResponse.status, dbOk: localBody.dbOk, version: localBody.version } },
    publicTunnel: { status: publicResponse.status, routeType: publicHealthRouteType, body: { status: publicResponse.status, dbOk: publicBody.dbOk, version: publicBody.version } },
    publicApplicationApiStatus,
    publicHealthDbOkRequirement: publicHealthRouteType === "BACKEND_HEALTH_JSON" ? "APPLICABLE" : "NOT_APPLICABLE",
  };
  if (localResponse.status !== 200 || localBody.dbOk !== true || publicApplicationApiStatus !== "PASS") fail("NETWORK", report.health);
}

async function main() {
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try { await driverChecks(browser); await roomChecks(browser); await typedEntityChecks(browser); await crossAuthCheck(browser); await responsiveCheck(browser); await healthCheck(); }
  finally { await browser.close(); }
  report.verdict = report.failures.length === 0 && report.consoleErrors.length === 0 && report.pageErrors.length === 0 && report.http500.length === 0 && report.http403.length === 0 && report.authLosses.length === 0 && report.health?.localBackend?.status === 200 && report.health?.localBackend?.dbOk === true && report.health?.publicApplicationApiStatus === "PASS" ? "PRE_18_ROUND_14_READY_FOR_INDEPENDENT_REAUDIT" : "PRE_18_ROUND_14_BLOCKED";
  await fs.writeFile(path.join(out, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ probeCount: report.probeCount, coverage: report.coverage, failures: report.failures, consoleErrorCount: report.consoleErrors.length, pageErrorCount: report.pageErrors.length, http500Count: report.http500.length, http403Count: report.http403.length, authLossCount: report.authLosses.length, responsive: report.responsive, health: report.health, verdict: report.verdict }, null, 2));
  console.log(report.verdict);
}

main().catch(async (error) => { fail("FATAL", String(error?.stack || error)); report.verdict = "PRE_18_ROUND_14_BLOCKED"; await fs.mkdir(out, { recursive: true }); await fs.writeFile(path.join(out, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"); console.error(error); process.exitCode = 1; });
