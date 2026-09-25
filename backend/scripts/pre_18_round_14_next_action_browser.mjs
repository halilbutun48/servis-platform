import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const web = (process.env.WEB_BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const out = path.join(root, "backend/artifacts/browser-smoke/pre-18-round-14-targeted");
const driverDevice = process.env.DRIVER_BROWSER_DEVICE_ID || "web-pre18-round14-next-action";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const queries = [
  "sıradaki doğru işlem ne", "şimdi ne yapmalıyım", "ilk adım ne", "sırada ne var", "bundan sonra ne yapayım",
  "neyle başlayayım", "hangi işi önce yapmalıyım", "bir sonraki güvenli adım ne", "burada şimdi ne yapmam gerekiyor", "önce neyi çözeyim",
];
const roles = [
  { role: "SUPER_ADMIN", email: "superadmin@demo.com", home: "/superadmin", critical: "/superadmin/operations", selected: "/superadmin/operations" },
  { role: "ROOM", email: "room@demo.com", home: "/room", critical: "/room/offers", selected: "/room/offers" },
  { role: "COMPANY", email: "company@demo.com", home: "/company", critical: "/company/shifts", selected: "/company/shifts" },
  { role: "SCHOOL", email: "school@demo.com", home: "/school", critical: "/school/operations", selected: "/school/operations" },
  { role: "ORGANIZATION", email: "organization@demo.com", home: "/organization", critical: "/organization/operations", selected: "/organization/operations" },
  { role: "DRIVER", email: "driver@demo.com", home: "/driver/today", critical: "/driver/route", selected: "/driver/route" },
  { role: "PERSONEL", email: "personel@demo.com", home: "/personel/my", critical: "/personel/live", selected: "/personel/live" },
  { role: "PARENT", email: "parent@demo.com", home: "/parent/live", critical: "/parent/live", selected: "/parent/live" },
];

function compact(value) { return String(value || "").replace(/\s+/g, " ").trim().slice(0, 1000); }
function normalized(value) { return compact(value).toLocaleLowerCase("tr-TR").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c"); }
function isOffTopic(body) { return /OFF_TOPIC_SAFE|GENERAL_KNOWLEDGE|LIVE_EXTERNAL_DATA/.test(`${body?.family || ""} ${body?.route || ""}`); }
function isNextFamily(body) { return /NEXT_STEP|NEXT_BEST_ACTION|PRIORITY_ACTION|PRIORITY/.test(String(body?.family || "")); }

async function open(browser, spec) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  if (spec.role === "DRIVER") await context.addInitScript((id) => localStorage.setItem("personel_servis_browser_device_id", id), driverDevice);
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  await page.goto(`${web}/`, { waitUntil: "domcontentloaded" });
  const username = page.locator('input[autocomplete="username"]');
  if (await username.count()) {
    await username.fill(spec.email);
    await page.locator('input[autocomplete="current-password"]').fill("demo123");
    await page.locator('button[type="submit"]').click();
    await page.waitForFunction(() => !document.querySelector('input[autocomplete="username"]'), null, { timeout: 60000 });
  }
  return { ...spec, context, page, last: 0, drawer: null };
}

async function navigate(session, routePath) {
  await session.page.goto(`${web}/#${routePath}`, { waitUntil: "domcontentloaded" });
  await wait(500);
}

async function selectVisible(session) {
  if (session.role === "ROOM") {
    const card = session.page.locator(".pre18-room-offer-card:visible").first();
    if (await card.count()) { await card.click(); await wait(250); return true; }
  }
  const row = session.page.locator("tbody tr:visible").first();
  if (await row.count()) { await row.click(); await wait(250); return true; }
  return false;
}

async function ask(session, query) {
  const now = Date.now();
  if (now - session.last < 1100) await wait(1100 - (now - session.last));
  if (!session.drawer || !(await session.drawer.isVisible().catch(() => false))) {
    const fab = session.page.locator(".copilotFab:visible").first();
    if (await fab.count()) await fab.click();
    session.drawer = session.page.locator(".copilotDrawer:visible").first();
    await session.drawer.waitFor({ state: "visible" });
  }
  const input = session.drawer.locator("textarea").first();
  await input.fill(query);
  const responsePromise = session.page.waitForResponse((response) => response.url().includes("/api/ai/copilot") && response.request().method() === "POST", { timeout: 30000 });
  await input.press("Enter");
  const response = await responsePromise;
  session.last = Date.now();
  const body = await response.json().catch(() => ({}));
  return { status: response.status(), family: body?.semanticPlan?.family || body?.semanticPlan?.intentFamily || body?.questionType || "", route: body?.semanticPlan?.conversationRoute || body?.conversationRoute || "", reply: compact(body?.reply || body?.summary), body };
}

async function main() {
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const sessions = [];
  const rows = [];
  const failures = [];
  try {
    for (const spec of roles) sessions.push(await open(browser, spec));
    for (const session of sessions) {
      for (const routePath of [session.home, session.critical, session.selected]) {
        await navigate(session, routePath);
        const selectedAttempted = routePath === session.selected;
        const selected = selectedAttempted ? await selectVisible(session) : false;
        for (const query of queries) {
          try {
            const result = await ask(session, query);
            const row = { role: session.role, path: routePath, selected, query, ...result };
            rows.push(row);
            if (result.status !== 200 || isOffTopic(result) || !isNextFamily(result) || !result.reply) failures.push({ ...row, reason: result.status !== 200 ? "HTTP" : isOffTopic(result) ? "OFF_TOPIC" : !isNextFamily(result) ? "WRONG_FAMILY" : "EMPTY_REPLY" });
          } catch (error) {
            failures.push({ role: session.role, path: routePath, query, reason: "EXCEPTION", detail: String(error?.message || error) });
          }
        }
      }
    }
    const roleSummary = Object.fromEntries(roles.map((role) => {
      const roleRows = rows.filter((row) => row.role === role.role);
      return [role.role, { total: roleRows.length, failures: failures.filter((row) => row.role === role.role).length, families: [...new Set(roleRows.map((row) => row.family))], paths: [...new Set(roleRows.map((row) => row.path))] }];
    }));
    const report = { generatedAt: new Date().toISOString(), web, roleCount: roles.length, queryCount: rows.length, failureCount: failures.length, roleSummary, failures, rows };
    await fs.writeFile(path.join(out, "next-action-all-roles.json"), JSON.stringify(report, null, 2), "utf8");
    console.log(JSON.stringify({ generatedAt: report.generatedAt, roleCount: report.roleCount, queryCount: report.queryCount, failureCount: report.failureCount, roleSummary, failures: failures.slice(0, 25) }, null, 2));
  } finally {
    for (const session of sessions) await session.context.close().catch(() => {});
    await browser.close();
  }
}

main().catch((error) => { console.error(error?.stack || error); process.exitCode = 1; });
