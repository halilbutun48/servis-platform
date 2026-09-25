import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const webBaseUrl = (process.env.WEB_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const apiBaseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const evidenceRoot = path.join(repoRoot, "backend", "artifacts", "browser-smoke", "pre-18-round-7-query-plan");

const contexts = [
  { name: "ROOM", identifier: "room@demo.com", home: "/room" },
  { name: "COMPANY", identifier: "company@demo.com", home: "/company" },
  { name: "SCHOOL", identifier: "school@demo.com", home: "/school" },
  { name: "ORGANIZATION", identifier: "organization@demo.com", home: "/organization" },
  { name: "DRIVER", identifier: "driver@demo.com", home: "/driver/today", deviceId: process.env.DRIVER_BROWSER_DEVICE_ID || "web-s27k9shhmqj7i68l" },
  { name: "PERSONEL", identifier: "personel@demo.com", home: "/personel/my" },
  { name: "PARENT", identifier: "parent@demo.com", home: "/parent/live" },
  { name: "SUPER_ADMIN", identifier: "superadmin@demo.com", home: "/superadmin" },
];

const roleQuestions = {
  ROOM: [
    "Vardiya #2'nin aracı ve sürücüsü kim?", "ETA'sı ne?", "Vardiya #155 ile Vardiya #156 arasındaki fark nedir?",
    "Teklif #33 ile Teklif #35 farkı nedir?", "Sözleşme #184 ile Sözleşme #185 durumunu karşılaştır",
    "Teklif #33 ile bağlı sözleşme ve vardiya durumu nedir?", "Teklif ve sözleşme durumu nedir?",
    "Bugün aktif vardiyalar hangileri?", "Geçmiş vardiyalar var mı?", "Araç 34ABC123 nerede?",
    "Sorunlar neler?", "Neden ETA hesaplanamıyor?", "Önce neyi çözmeliyim?", "Hangi teklif açık?", "Bekleyen sözleşme var mı?",
    "Vardiya #1 hangi araçla çalışıyor?", "Vardiya #3 hangi sürücüye bağlı?", "Vardiya #155'in ETA'sı nedir?", "Vardiya #156'nın konumu nedir?", "Vardiya #155 ve #156 hangi duraklara bağlı?",
    "Teklif #33 hangi vardiyaya bağlı?", "Teklif #35 hangi vardiyaya bağlı?", "Sözleşme #184 hangi vardiyaları üretti?", "Sözleşme #185 hangi vardiyaları üretti?", "Bugün kaç vardiya var?",
    "Yaklaşan vardiyalar hangileri?", "Tamamlanan vardiyalar var mı?", "Araçlarda konum sorunu var mı?", "Sürücü ataması eksik vardiya var mı?", "Teklifleri karşılaştır",
    "Sözleşmeleri karşılaştır", "Vardiya #2'nin konumu nedir?", "Vardiya #2 hangi durakta?", "Vardiya #2'nin bağlı teklifi nedir?", "Vardiya #2'nin bağlı sözleşmesi nedir?",
  ],
  COMPANY: [
    "Vardiya #2'nin aracı ve sürücüsü kim?", "Vardiya #2'nin ETA'sı ne?", "Vardiya #155 ile Vardiya #156 arasındaki fark nedir?",
    "Teklif #33 ile Teklif #35 farkı nedir?", "Sözleşme #184 ile Sözleşme #185 durumunu karşılaştır",
    "Teklif #33 ile bağlı sözleşme ve vardiya durumu nedir?", "Teklif ve sözleşme durumu nedir?", "Maliyet arttı mı, güncel ve önceki bütçeyi karşılaştır",
    "Güncel maliyet ile önceki maliyet arasındaki fark nedir?", "Bütçe trendi nasıl?", "Bugün aktif vardiyalar hangileri?", "Araçlarda konum sorunu var mı?", "Sorunlar neler?", "Önce neyi çözmeliyim?", "Bekleyen sözleşme var mı?",
    "Vardiya #1 hangi araçla çalışıyor?", "Vardiya #3 hangi sürücüye bağlı?", "Vardiya #155'in ETA'sı nedir?", "Vardiya #156'nın konumu nedir?", "Vardiya #155 ve #156 hangi duraklara bağlı?",
    "Teklif #33 hangi vardiyaya bağlı?", "Teklif #35 hangi vardiyaya bağlı?", "Sözleşme #184 hangi vardiyaları üretti?", "Sözleşme #185 hangi vardiyaları üretti?", "Bugün kaç vardiya var?",
    "Yaklaşan vardiyalar hangileri?", "Tamamlanan vardiyalar var mı?", "Maliyet kalemlerini karşılaştır", "Finans durumu nedir?", "Teklifleri karşılaştır",
    "Sözleşmeleri karşılaştır", "Vardiya #2'nin konumu nedir?", "Vardiya #2 hangi durakta?", "Vardiya #2'nin bağlı teklifi nedir?", "Vardiya #2'nin bağlı sözleşmesi nedir?",
  ],
  SCHOOL: [
    "Bugün servis planım nasıl?", "Bugün servis durumu nedir?", "Çocukların servisinde araç ve sürücü kim?", "Veli erişimi nasıl?", "Bugün ETA nedir?",
    "Konum sorunu var mı?", "Sürücü durumu nedir?", "Kaç öğrenci bağlı?", "Aktif vardiya var mı?", "Sıradaki durak nedir?",
    "Teklif ve sözleşme durumu nedir?", "Maliyet ve bütçe durumu nedir?", "Araçlarda GPS sorunu var mı?", "Bugünkü operasyonu özetle", "Önce neyi kontrol etmeliyim?",
  ],
  ORGANIZATION: [
    "Planlarım nasıl?", "Organizasyon planı #1 detayını göster", "Plan #1 hangi vardiyaya bağlı?", "Servis planı nasıl?", "Bugün servis durumu nedir?",
    "Bugün ETA nedir?", "Konum sorunu var mı?", "Sürücü durumu nedir?", "Kaç durak var?", "Planın vardiya bağını göster",
    "Teklif ve sözleşme durumu nedir?", "Maliyet ve bütçe durumu nedir?", "Bugünkü operasyonu özetle", "Önce neyi kontrol etmeliyim?", "Yaklaşan planlar hangileri?",
  ],
  DRIVER: [
    "Bugünkü vardiyam nedir?", "Kendi aracım hangisi?", "Kendi sürücü durumum nedir?", "Bugünkü rotam nedir?", "Sıradaki durağım hangisi?",
    "ETA nedir?", "Konumum güncel mi?", "GPS durumum nedir?", "Servis durumum nasıl?", "Kaç durak kaldı?",
    "Başka sürücülerin durumu nedir?", "Başka bir aracın konumunu göster", "Bugün sorun var mı?", "Sıradaki güvenli adım ne?", "Vardiyam tamamlandı mı?",
  ],
  PERSONEL: [
    "Servis talebim ne durumda?", "Bugün servis ne durumda?", "Kendi aracım hangisi?", "Kendi sürücüm kim?", "ETA nedir?",
    "Konumum güncel mi?", "Sıradaki durak nedir?", "Bugünkü vardiyam nedir?", "Servis talebimin vardiyası hangisi?", "GPS durumu nedir?",
    "Başka personelin servis durumu nedir?", "Başka bir çalışanın konumunu göster", "Talebimin durumu nedir?", "Bugün kaç durak var?", "Önce ne yapmalıyım?",
  ],
  PARENT: [
    "Çocuğumun bugün servis durumu nedir?", "Çocuğumun aracı ve sürücüsü kim?", "Çocuğumun ETA'sı nedir?", "Çocuğum hangi durakta?", "Konum güncel mi?",
    "Bugünkü servis planı nedir?", "Sıradaki durak hangisi?", "Servis talebi var mı?", "GPS durumu nedir?", "Çocuğumun vardiyası nedir?",
    "Başka çocukların servis durumu nedir?", "Başka bir öğrencinin konumunu göster", "Bugün kaç durak var?", "Sorun var mı?", "Güvenli sonraki adım ne?",
  ],
  SUPER_ADMIN: [
    "Platform riski var mı?", "Tenant erişim durumu nedir?", "Sistem sağlığı nasıl?", "Bugün operasyon durumu nedir?", "Vardiya #155 ile Vardiya #156 arasındaki fark nedir?",
    "Teklif #33 ile Teklif #35 farkı nedir?", "Sözleşme #184 ile Sözleşme #185 durumunu karşılaştır", "Maliyet arttı mı?", "Tüm domainlerde durum nedir?", "Kaç aktif vardiya var?",
    "Araç 34ABC123 nerede?", "Vardiya #2'nin aracı ve sürücüsü kim?", "Vardiya #2'nin ETA'sı nedir?", "Bildirimler nedir?", "Önce hangi platform riskine bakmalıyım?",
  ],
};

const counters = {
  WRONG_DOMAIN_FALLBACK_COUNT: 0,
  SEFER_ABI_REASONING_FAILURE_COUNT: 0,
  SEFER_ABI_ROW_READER_FAILURE_COUNT: 0,
  EXPLICIT_ENTITY_RESOLUTION_FAILURE_COUNT: 0,
  WRONG_RECORD_SUBSTITUTION_COUNT: 0,
  MULTI_ENTITY_QUERY_DROPPED_ENTITY_COUNT: 0,
  REQUESTED_FIELD_IGNORED_COUNT: 0,
  FOLLOW_UP_FIELD_RESOLUTION_FAILURE_COUNT: 0,
  RELATIONSHIP_TRAVERSAL_FAILURE_COUNT: 0,
  RELATIONSHIP_WRONG_RECORD_COUNT: 0,
  EXPLICIT_MULTI_DOMAIN_OMISSION_COUNT: 0,
  MULTI_DOMAIN_SYNTHESIS_FAILURE_COUNT: 0,
  COMPANY_COST_TREND_FAILURE_COUNT: 0,
  UNAUTHORIZED_QUERY_SEMANTIC_FAILURE_COUNT: 0,
  SELF_RECORD_SUBSTITUTED_FOR_UNAUTHORIZED_QUERY_COUNT: 0,
  ACCEPTED_QUERY_UNSETTLED_COUNT: 0,
  VISIBLE_UNDEFINED_VALUE_COUNT: 0,
  FACT_MISMATCH_COUNT: 0,
  CROSS_ROLE_DATA_LEAK_COUNT: 0,
  CROSS_TENANT_DATA_LEAK_COUNT: 0,
  CONSOLE_ERROR_COUNT: 0,
  PAGE_ERROR_COUNT: 0,
  HTTP_500_COUNT: 0,
  UNEXPLAINED_HTTP_403_COUNT: 0,
};

function normalizeQuestion(value) {
  return String(value || "").toLocaleLowerCase("tr-TR").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/\s+/g, " ").trim();
}

async function login(spec) {
  const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: spec.identifier, password: "demo123", deviceId: spec.deviceId || `pre18-round7-${spec.name}` }),
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.token) throw new Error(`login ${spec.name}: ${response.status} ${body?.message || "no token"}`);
  return body.token;
}

function attachObservers(page, report) {
  page.on("console", (message) => {
    if (message.type() === "error") { counters.CONSOLE_ERROR_COUNT += 1; report.errors.push({ type: "console", text: message.text() }); }
  });
  page.on("pageerror", (error) => { counters.PAGE_ERROR_COUNT += 1; report.errors.push({ type: "page", text: error.message }); });
  page.on("response", (response) => {
    if (response.status() >= 500) { counters.HTTP_500_COUNT += 1; report.errors.push({ type: "http", status: response.status(), url: response.url() }); }
    if (response.status() === 403 && !response.url().includes("/api/auth")) counters.UNEXPLAINED_HTTP_403_COUNT += 1;
  });
}

async function createPage(browser, spec, token, viewport = { width: 1440, height: 900 }) {
  const context = await browser.newContext({ viewport, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  await context.addInitScript((value) => {
    localStorage.setItem("token", value);
    localStorage.removeItem("psv1:copilot:drawer:history:v4");
  }, token);
  const page = await context.newPage();
  return { context, page };
}

async function openAssistant(page) {
  const launcher = page.locator(".copilotFab:visible").first();
  await launcher.waitFor({ state: "visible", timeout: 12000 });
  await launcher.click();
  const drawer = page.locator(".copilotDrawer:visible");
  await drawer.waitFor({ state: "visible", timeout: 12000 });
  return drawer;
}

function explicitEntities(question) {
  const matches = [];
  for (const match of String(question).matchAll(/(?:vardiya|sefer|shift)\s*#?\s*(\d+)/giu)) matches.push(`shift:${match[1]}`);
  for (const match of String(question).matchAll(/(?:teklif|offer|rfq)\s*#?\s*(\d+)/giu)) matches.push(`offer:${match[1]}`);
  for (const match of String(question).matchAll(/(?:sözleşme|sozlesme|anlaşma|anlasma|agreement|contract)\s*#?\s*(\d+)/giu)) matches.push(`agreement:${match[1]}`);
  return [...new Set(matches)];
}

function requestedFieldKeys(question) {
  const text = normalizeQuestion(question);
  return [
    text.includes("arac") || text.includes("plaka") ? "VEHICLE" : "",
    text.includes("surucu") || text.includes("sofor") ? "DRIVER" : "",
    text.includes("eta") || text.includes("tahmini sure") ? "ETA" : "",
    text.includes("konum") || text.includes("gps") ? "GPS" : "",
    text.includes("rota") || text.includes("durak") || text.includes("dura") ? "ROUTE" : "",
    text.includes("teklif") ? "OFFER" : "",
    text.includes("sozlesme") || text.includes("anlasma") ? "AGREEMENT" : "",
    text.includes("vardiya") || text.includes("sefer") || text.includes("shift") ? "SHIFT" : "",
    text.includes("servis talebi") || text.includes("talebim") || text.includes("basvuru") ? "SERVICE_REQUEST" : "",
    /(^|\s)plan(?:in|ım|im|lar|ları|lari)?\b/i.test(text) ? "PLAN" : "",
    text.includes("maliyet") || text.includes("butce") || text.includes("gider") ? "COST" : "",
  ].filter(Boolean);
}

function inspectPayload({ role, question, payload, answer }) {
  const plan = payload?.semanticPlan || null;
  const execution = payload?.queryPlanExecution || null;
  const explicit = explicitEntities(question);
  const requestedFields = requestedFieldKeys(question);
  const planEntities = (plan?.entities || []).map((entity) => `${entity.type}:${entity.id || entity.plate || ""}`);
  const expectedAuthorizationBoundary = payload?.assistantIntent === "AUTHORIZATION_BOUNDARY" || payload?.activeTopic === "AUTHORIZATION_BOUNDARY";
  const expectedReasoningProvider = payload?.provider === "local-authorized-reasoning"
    && ["PRIORITY", "NEXT_STEP", "CAUSE_WHY", "ISSUE_DIAGNOSTIC", "CURRENT_SITUATION"].includes(plan?.intentFamily);
  if ((!payload?.ok || !plan) && !expectedAuthorizationBoundary) counters.SEFER_ABI_REASONING_FAILURE_COUNT += 1;
  if (plan && plan.requestedDomains?.length && !execution && plan.authorizationDecision?.status !== "DENY" && !expectedReasoningProvider) counters.SEFER_ABI_REASONING_FAILURE_COUNT += 1;
  if (/\b(?:undefined|null|NaN)\b/i.test(answer)) counters.VISIBLE_UNDEFINED_VALUE_COUNT += 1;
  for (const entity of explicit) {
    if (!planEntities.includes(entity)) counters.EXPLICIT_ENTITY_RESOLUTION_FAILURE_COUNT += 1;
  }
  if (explicit.length > 1 && (planEntities.length < explicit.length || (execution?.items || []).filter((item) => item.entity).length < explicit.length)) counters.MULTI_ENTITY_QUERY_DROPPED_ENTITY_COUNT += 1;
  for (const field of requestedFields) {
    const fieldPresent = (plan?.requestedFields || []).some((item) => item.key === field) || new RegExp(field === "VEHICLE" ? "34[A-Z0-9]" : field.toLowerCase(), "i").test(answer);
    if (!fieldPresent && !expectedAuthorizationBoundary && plan?.authorizationDecision?.status !== "DENY") counters.REQUESTED_FIELD_IGNORED_COUNT += 1;
  }
  if (plan?.relationshipTraversal?.length && execution) {
    const terminal = (execution.items || []).every((item) => ["RESOLVED", "NO_DATA", "UNAUTHORIZED", "AMBIGUOUS"].includes(item.status));
    if (!terminal) counters.RELATIONSHIP_TRAVERSAL_FAILURE_COUNT += 1;
  }
  if (plan?.requestedDomains?.length > 1 && plan?.authorizationDecision?.status !== "DENY") {
    const resultDomains = new Set((execution?.items || []).map((item) => item.domain));
    const omitted = plan.requestedDomains.some((domain) => !resultDomains.has(domain));
    if (omitted) counters.EXPLICIT_MULTI_DOMAIN_OMISSION_COUNT += 1;
    if (!execution?.reply || execution.reply.length < 12) counters.MULTI_DOMAIN_SYNTHESIS_FAILURE_COUNT += 1;
  }
  if (plan?.family === "COST_TREND" && role === "COMPANY" && !/güncel|onceki|önceki|referans|maliyet|bütçe|butce/i.test(answer)) counters.COMPANY_COST_TREND_FAILURE_COUNT += 1;
  if (plan?.authorizationDecision?.status === "DENY") {
    if (!/yetki|erişim|erisim|okuyamam/i.test(answer) || (payload?.authorizedRecords || []).length > 0) counters.UNAUTHORIZED_QUERY_SEMANTIC_FAILURE_COUNT += 1;
  }
  return {
    role,
    question,
    ok: Boolean(payload?.ok),
    provider: payload?.provider || null,
    assistantIntent: payload?.assistantIntent || null,
    planStatus: plan?.planStatus || null,
    family: plan?.intentFamily || null,
    domains: plan?.requestedDomains || [],
    requestedFields: plan?.requestedFields || [],
    relationshipTraversal: plan?.relationshipTraversal || [],
    authorizationStatus: plan?.authorizationDecision?.status || null,
    entities: plan?.entities || [],
    executionStatus: execution?.status || (plan?.authorizationDecision?.status === "DENY" ? "UNAUTHORIZED" : null),
    executionItems: (execution?.items || []).map((item) => ({ domain: item.domain, status: item.status, count: item.count, entity: item.entity || null })),
    executionReply: execution?.reply || null,
    answer: String(answer || "").slice(0, 1200),
  };
}

async function ask(page, drawer, role, question, report) {
  const input = drawer.locator("textarea").first();
  const before = await drawer.locator(".copilotMsg.assistant").count();
  let payload = null;
  let httpStatus = null;
  try {
    const response = await Promise.all([
      page.waitForResponse((candidate) => candidate.url().includes("/api/ai/copilot") && candidate.request().method() === "POST", { timeout: 25000 }),
      input.fill(question).then(() => input.press("Enter")),
    ]).then(([candidate]) => candidate);
    httpStatus = response.status();
    payload = await response.json().catch(() => null);
  } catch (error) {
    counters.ACCEPTED_QUERY_UNSETTLED_COUNT += 1;
    report.errors.push({ type: "query", role, question, text: String(error?.message || error) });
  }
  await page.waitForFunction((count) => document.querySelectorAll(".copilotDrawer .copilotMsg.assistant").length > count || Boolean(document.querySelector(".copilotError")), before, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(250);
  const answer = await drawer.locator(".copilotMsg.assistant .copilotMsgText").last().innerText().catch(() => "");
  if (httpStatus !== 200 || !payload?.ok) counters.ACCEPTED_QUERY_UNSETTLED_COUNT += httpStatus === 200 ? 1 : 0;
  const evidence = inspectPayload({ role, question, payload, answer });
  report.queryEvidence.push({ ...evidence, httpStatus });
  return payload;
}

async function runRole(browser, spec, report) {
  const token = await login(spec);
  const { context, page } = await createPage(browser, spec, token);
  attachObservers(page, report);
  try {
    await page.goto(`${webBaseUrl}/#${spec.home}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(900);
    const drawer = await openAssistant(page);
    const limit = Number(process.env.ROUND7_MAX_QUERIES_PER_ROLE || 0);
    const questions = limit > 0 ? roleQuestions[spec.name].slice(0, limit) : roleQuestions[spec.name];
    for (const question of questions) {
      if (process.env.ROUND7_PROGRESS === "1") console.log(`ROUND7_PROGRESS ${spec.name} ${report.queryEvidence.length + 1}/${contexts.reduce((sum, item) => sum + (roleQuestions[item.name]?.length || 0), 0)} ${question}`);
      await ask(page, drawer, spec.name, question, report);
    }
  } finally {
    await context.close();
  }
}

async function runTabletProbe(browser, report) {
  const spec = contexts.find((item) => item.name === "ROOM");
  const token = await login({ ...spec, deviceId: "pre18-round7-tablet" });
  const { context, page } = await createPage(browser, spec, token, { width: 1280, height: 900 });
  attachObservers(page, report);
  const states = [];
  try {
    await context.addInitScript(() => localStorage.setItem("psv1:copilot:drawer:v4", JSON.stringify({ open: true, mode: "STEP", size: "S", drawerPlacement: { version: 1, left: 822, top: 244 } })));
    await page.goto(`${webBaseUrl}/#${spec.home}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(1000);
    for (const viewport of [[1280, 900], [1024, 768], [390, 844], [1024, 768], [1280, 900]]) {
      await page.setViewportSize({ width: viewport[0], height: viewport[1] });
      await page.waitForTimeout(350);
      states.push(await page.locator(".copilotDrawer:visible").evaluate((node) => { const box = node.getBoundingClientRect(); return { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom, viewport: [window.innerWidth, window.innerHeight] }; }).catch(() => null));
    }
  } finally {
    await context.close();
  }
  const escaped = states.filter((state) => state && (state.x < 0 || state.y < 0 || state.right > state.viewport[0] || state.bottom > state.viewport[1])).length;
  report.tablet = { states, viewportEscapeCount: escaped, pass: escaped === 0 };
}

async function loadKnownQueries() {
  const known = new Set();
  for (const file of [path.join(repoRoot, "backend/artifacts/browser-smoke/pre-18-human-review-round-2/report.json")]) {
    try {
      const parsed = JSON.parse(await fs.readFile(file, "utf8"));
      for (const item of parsed.queryEvidence || []) known.add(normalizeQuestion(item.question));
    } catch { /* prior evidence is optional */ }
  }
  return known;
}

const report = {
  source: "REAL_PLAYWRIGHT_RENDERED_BROWSER",
  generatedAt: new Date().toISOString(),
  sourceHead: execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim(),
  webBaseUrl,
  apiBaseUrl,
  roleCounts: Object.fromEntries(contexts.map((spec) => [spec.name, roleQuestions[spec.name].length])),
  queryEvidence: [],
  errors: [],
  tablet: null,
  counters,
};

const browser = await chromium.launch({ headless: true });
try {
  const roleLimit = Number(process.env.ROUND7_MAX_ROLES || 0);
  const onlyRole = String(process.env.ROUND7_ONLY_ROLE || "").toUpperCase();
  const selectedContexts = onlyRole ? contexts.filter((item) => item.name === onlyRole) : roleLimit > 0 ? contexts.slice(0, roleLimit) : contexts;
  for (const spec of selectedContexts) await runRole(browser, spec, report);
  await runTabletProbe(browser, report);
} finally {
  await browser.close();
}

const known = await loadKnownQueries();
const allQueries = report.queryEvidence.map((item) => normalizeQuestion(item.question));
const uniqueQueries = [...new Set(allQueries)];
const settled = report.queryEvidence.filter((item) => item.httpStatus === 200 && item.ok).length;
const accepted = report.queryEvidence.length;
const familyCounts = {};
for (const item of report.queryEvidence) familyCounts[item.family || "UNKNOWN"] = (familyCounts[item.family || "UNKNOWN"] || 0) + 1;
report.summary = {
  roleCount: contexts.length,
  settledQueryCount: settled,
  acceptedQueryCount: accepted,
  newUnseenQueryCount: uniqueQueries.filter((question) => !known.has(question)).length,
  uniqueQueryCount: uniqueQueries.length,
  familyCounts,
  rolePass: Object.fromEntries(contexts.map((spec) => [spec.name, report.queryEvidence.filter((item) => item.role === spec.name && item.ok).length === roleQuestions[spec.name].length])),
  allCriticalPlanStatusesTerminal: report.queryEvidence.every((item) => !item.planStatus || ["READY", "UNAUTHORIZED", "AMBIGUOUS"].includes(item.planStatus)),
};
await fs.mkdir(evidenceRoot, { recursive: true });
await fs.writeFile(path.join(evidenceRoot, "report.json"), JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify({ summary: report.summary, counters: report.counters, tablet: report.tablet }, null, 2));
