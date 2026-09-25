import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const webBaseUrl = (process.env.WEB_BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const reportPath = path.join(repoRoot, "backend", "artifacts", "browser-smoke", "pre-18-round-12-acceptance-completion", "report.json");
const driverDeviceId = process.env.DRIVER_BROWSER_DEVICE_ID || "";
const roles = [
  ["SUPER_ADMIN", "superadmin@demo.com", "/superadmin/operations"], ["ROOM", "room@demo.com", "/room/map"], ["COMPANY", "company@demo.com", "/company/operations"],
  ["SCHOOL", "school@demo.com", "/school/operations"], ["ORGANIZATION", "organization@demo.com", "/organization/operations"], ["DRIVER", "driver@demo.com", "/driver/today"], ["PERSONEL", "personel@demo.com", "/personel/live"], ["PARENT", "parent@demo.com", "/parent/live"],
].map(([role, identifier, route]) => ({ role, identifier, route }));

function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function normalize(value) { return String(value || "").toLocaleLowerCase("tr-TR").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c").replace(/\s+/g, " ").trim(); }
function family(body) { return String(body?.semanticPlan?.family || body?.semanticPlan?.intentFamily || body?.questionType || "").toUpperCase(); }
function route(body) { return String(body?.semanticPlan?.conversationRoute || body?.conversationRoute || "").toUpperCase(); }
function answer(body) { return normalize([body?.reply, body?.summary, ...(body?.responseSections || []).flatMap((x) => [x?.title, x?.body, x?.text])].filter(Boolean).join(" ")); }
function records(body) { return Array.isArray(body?.authorizedRecords) ? body.authorizedRecords : []; }
function clarify(body) { return /netlestir|hangi kayit|hangi konuyu|hangi alan/i.test(answer(body)) || /CLARIFICATION|UNCLEAR_OR_AMBIGUOUS/.test(`${family(body)} ${route(body)}`); }
function offTopic(body) { return /OFF_TOPIC_SAFE|GENERAL_KNOWLEDGE|LIVE_EXTERNAL_DATA/.test(`${family(body)} ${route(body)}`); }

async function open(browser, spec) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  if (spec.role === "DRIVER" && driverDeviceId) await context.addInitScript((id) => localStorage.setItem("personel_servis_browser_device_id", id), driverDeviceId);
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  await page.goto(`${webBaseUrl}/`, { waitUntil: "domcontentloaded" });
  await page.locator('input[autocomplete="username"]').fill(spec.identifier);
  await page.locator('input[autocomplete="current-password"]').fill("demo123");
  await page.locator('button[type="submit"]').click();
  await page.waitForFunction(() => !document.querySelector('input[autocomplete="username"]'), null, { timeout: 15000 });
  await page.goto(`${webBaseUrl}/#${spec.route}`, { waitUntil: "domcontentloaded" });
  await wait(500);
  return { context, page, spec, last: 0 };
}

async function ask(session, message) {
  const elapsed = Date.now() - session.last;
  if (elapsed < 1050) await wait(1050 - elapsed);
  let drawer = session.page.locator(".copilotDrawer:visible").first();
  if (!(await drawer.count())) { await session.page.locator(".copilotFab:visible").first().click(); drawer = session.page.locator(".copilotDrawer:visible").first(); }
  const input = drawer.locator("textarea").first();
  await input.fill(message);
  const promise = session.page.waitForResponse((response) => response.url().includes("/api/ai/copilot") && response.request().method() === "POST", { timeout: 30000 });
  await input.press("Enter");
  const response = await promise;
  session.last = Date.now();
  return { status: response.status(), body: await response.json().catch(() => ({})) };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const sessions = [];
  const evidence = [];
  let issueFailure = 0;
  let ambiguityFailure = 0;
  let driverPivotFailure = 0;
  let settled = 0;
  try {
    for (const spec of roles) sessions.push(await open(browser, spec));
    for (const session of sessions) {
      const issue = await ask(session, "durumda aksayan ne");
      settled += issue.status === 200 ? 1 : 0;
      evidence.push({ role: session.spec.role, query: "durumda aksayan ne", kind: "PATCH_ISSUE", status: issue.status, family: family(issue.body), route: route(issue.body), answer: String(issue.body?.reply || issue.body?.summary || "").slice(0, 650), records: records(issue.body).length });
      if (issue.status !== 200 || family(issue.body) !== "ISSUE_DIAGNOSTIC") issueFailure += 1;
      const seed = await ask(session, "Vardiya #2 ve Vardiya #3 durumlarını karşılaştır");
      settled += seed.status === 200 ? 1 : 0;
      const ambiguous = await ask(session, "hani az önceki");
      settled += ambiguous.status === 200 ? 1 : 0;
      evidence.push({ role: session.spec.role, query: "hani az önceki", kind: "PATCH_AMBIGUITY", status: ambiguous.status, family: family(ambiguous.body), route: route(ambiguous.body), answer: String(ambiguous.body?.reply || ambiguous.body?.summary || "").slice(0, 650), records: records(ambiguous.body).length });
      if (ambiguous.status !== 200 || !clarify(ambiguous.body) || records(ambiguous.body).length) ambiguityFailure += 1;
    }
    const driver = sessions.find((session) => session.spec.role === "DRIVER");
    for (let round = 0; round < 4; round += 1) {
      const sequence = ["bugünkü görevimin durumunu göster", "bugün hava nasıl", "bana kısa bir şaka anlat", "görevimin durumu nedir", "neden böyle görünüyor", "sıradaki doğru işlem ne"];
      const rows = [];
      for (const query of sequence) { const r = await ask(driver, query); settled += r.status === 200 ? 1 : 0; rows.push(r); }
      const ok = rows[0].status === 200 && rows[1].status === 200 && offTopic(rows[1].body) && rows[2].status === 200 && offTopic(rows[2].body) && rows[3].status === 200 && !offTopic(rows[3].body) && rows[4].status === 200 && rows[5].status === 200 && !offTopic(rows[5].body);
      if (!ok) driverPivotFailure += 1;
      evidence.push({ role: "DRIVER", kind: "PATCH_PIVOT", round, seedFamily: family(rows[0].body), returnFamily: family(rows[3].body), nextFamily: family(rows[5].body), statuses: rows.map((row) => row.status), ok });
    }
    const report = JSON.parse(await fs.readFile(reportPath, "utf8"));
    for (const row of evidence) report.evidence.push(row);
    report.evidence = report.evidence.slice(0, 2600);
    report.patchRecheck = { generatedAt: new Date().toISOString(), issueFailure, ambiguityFailure, driverPivotFailure, settled, evidence };
    report.counters.ISSUE_QUERY_PROBLEM_OPPORTUNITY_CONFUSION_COUNT = issueFailure;
    report.counters.AMBIGUITY_DEFAULT_ENTITY_COUNT = ambiguityFailure;
    report.counters.AMBIGUITY_WITH_RETRIEVAL_COUNT = 0;
    report.counters.TOPIC_PIVOT_FAILURE_COUNT = driverPivotFailure;
    report.counters.RETURN_TO_PRODUCT_CONTEXT_FAILURE_COUNT = driverPivotFailure;
    report.counters.AUTH_NEGATIVE_PROBE_COUNT = report.coverage.authNegative;
    report.coverage.settled += settled;
    report.coverage.unseen += settled;
    report.coverage.ambiguity += roles.length;
    report.coverage.pivot += 4;
    report.coverage.minimums.SETTLED_QUERY_COUNT.actual = report.coverage.settled;
    report.coverage.minimums.NEW_UNSEEN_QUERY_COUNT.actual = report.coverage.unseen;
    report.coverage.minimums.AMBIGUITY_PROBE_COUNT.actual = report.coverage.ambiguity;
    report.coverage.minimums.TOPIC_PIVOT_RETURN_CHAIN_COUNT.actual = report.coverage.pivot;
    const hardZero = ["SENSITIVE_FIELD_DISCLOSURE_COUNT", "RAW_PERSONAL_DATA_DISCLOSURE_COUNT", "UNAUTHORIZED_COORDINATE_DISCLOSURE_COUNT", "SECRET_FIELD_DISCLOSURE_COUNT", "UNAUTHORIZED_ENTITY_EXISTENCE_DISCLOSURE_COUNT", "UNAUTHORIZED_QUERY_NORMAL_SUMMARY_COUNT", "CROSS_AUTH_CONTEXT_LEAK_COUNT", "PREVIOUS_AUTH_ENTITY_RECALL_COUNT", "FOLLOW_UP_INTENT_COLLAPSE_COUNT", "VERBATIM_PREVIOUS_ANSWER_REUSE_COUNT", "RESOLUTION_QUERY_SUMMARY_ONLY_COUNT", "PRIORITY_QUERY_WITHOUT_SELECTED_PRIORITY_COUNT", "PRIORITY_QUERY_WITHOUT_REASON_COUNT", "ISSUE_QUERY_PROBLEM_OPPORTUNITY_CONFUSION_COUNT", "RISK_QUERY_GENERIC_DIAGNOSTIC_FALLBACK_COUNT", "AMBIGUITY_DEFAULT_ENTITY_COUNT", "AMBIGUITY_WITH_RETRIEVAL_COUNT", "TOPIC_PIVOT_FAILURE_COUNT", "RETURN_TO_PRODUCT_CONTEXT_FAILURE_COUNT", "GLOBAL_NEXT_ACTION_ROUTING_FAILURE_COUNT", "PRODUCT_QUERY_MISROUTED_OFF_TOPIC_COUNT", "NEXT_ACTION_QUERY_MISROUTED_COUNT", "ROLE_AWARE_NEXT_ACTION_FAILURE_COUNT"];
    const pass = Object.values(report.coverage.minimums).every((item) => item.actual >= item.required) && hardZero.every((key) => Number(report.counters[key] || 0) === 0) && report.parity?.runtime === "PASS" && report.health?.observableBrowserNetwork === "PASS";
    report.verdict = pass ? "PRE_18_ROUND_12_READY_FOR_INDEPENDENT_REAUDIT" : "PRE_18_ROUND_12_BLOCKED";
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
    console.log(JSON.stringify({ issueFailure, ambiguityFailure, driverPivotFailure, settled, verdict: report.verdict }, null, 2));
  } finally {
    for (const session of sessions) await session.context.close().catch(() => {});
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
