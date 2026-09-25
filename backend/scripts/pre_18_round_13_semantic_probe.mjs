import { chromium } from "@playwright/test";

const base = (process.env.WEB_BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const driverDeviceId = process.env.DRIVER_BROWSER_DEVICE_ID || "web-vos7tyh6mtpo1gze";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const roles = [
  ["SUPER_ADMIN", "superadmin@demo.com", "/superadmin/operations"],
  ["ROOM", "room@demo.com", "/room/offers"],
  ["COMPANY", "company@demo.com", "/company/operations"],
  ["SCHOOL", "school@demo.com", "/school/operations"],
  ["ORGANIZATION", "organization@demo.com", "/organization/operations"],
  ["DRIVER", "driver@demo.com", "/driver/today"],
  ["PERSONEL", "personel@demo.com", "/personel/live"],
  ["PARENT", "parent@demo.com", "/parent/live"],
].map(([role, email, route]) => ({ role, email, route }));
const activeRoles = process.env.ROUND13_FOCUS_ROLE ? roles.filter((spec) => spec.role === process.env.ROUND13_FOCUS_ROLE) : roles;

function compact(value) { return String(value || "").replace(/\s+/g, " ").trim().slice(0, 700); }
function digest(row) {
  const body = row.body || {};
  const plan = body.semanticPlan || {};
  return {
    role: row.role,
    query: row.query,
    status: row.status,
    path: row.request?.screenContext?.path,
    screen: row.request?.screenContext?.label,
    family: plan.family || plan.intentFamily || body.questionType || null,
    route: plan.conversationRoute || body.conversationRoute || null,
    taskVariant: plan.taskVariant || null,
    style: plan.requestedStyle || null,
    slots: plan.requestedTaskSlots || null,
    domains: plan.requestedDomains || null,
    entities: plan.entities || (plan.entity ? [plan.entity] : []),
    answer: compact(body.reply || body.summary),
    sections: Array.isArray(body.responseSections) ? body.responseSections.map((x) => ({ title: x?.title, body: compact(x?.body || x?.text) })) : [],
  };
}

async function open(browser, spec) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  if (spec.role === "DRIVER") await context.addInitScript((id) => localStorage.setItem("personel_servis_browser_device_id", id), driverDeviceId);
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  const username = page.locator('input[autocomplete="username"]');
  if (await username.count()) {
    await username.fill(spec.email);
    await page.locator('input[autocomplete="current-password"]').fill("demo123");
    await page.locator('button[type="submit"]').click();
    await page.waitForFunction(() => !document.querySelector('input[autocomplete="username"]'), null, { timeout: 20000 });
  }
  await page.goto(`${base}/#${spec.route}`, { waitUntil: "domcontentloaded" });
  await wait(600);
  return { ...spec, context, page, last: 0 };
}

async function ask(session, query) {
  const elapsed = Date.now() - session.last;
  if (elapsed < 1100) await wait(1100 - elapsed);
  let drawer = session.page.locator(".copilotDrawer:visible").first();
  if (!(await drawer.count())) { await session.page.locator(".copilotFab:visible").first().click(); drawer = session.page.locator(".copilotDrawer:visible").first(); }
  const input = drawer.locator("textarea").first();
  await input.fill(query);
  const responsePromise = session.page.waitForResponse((r) => r.url().includes("/api/ai/copilot") && r.request().method() === "POST", { timeout: 30000 });
  await input.press("Enter");
  const response = await responsePromise;
  session.last = Date.now();
  return { role: session.role, query, status: response.status(), request: response.request().postDataJSON?.() || {}, body: await response.json().catch(() => ({})) };
}

const browser = await chromium.launch({ headless: true });
const sessions = [];
const rows = [];
try {
  for (const spec of activeRoles) {
    const session = await open(browser, spec);
    sessions.push(session);
    for (const query of [
      "durumda aksayan ne",
      "Bu ekranda neye bakmalıyım?",
      "sorun var mı",
      "nasıl çözelim",
      "hangisinden başlayalım",
      "boşver rotayı iki satırlık sakin bir mesaj yaz",
      "ekrandaki durumu özetle",
      "çocuk gibi anlat",
      "daha kısa",
      "maddeler halinde anlat",
      "risk + kanıt + sonraki adım",
      "öteki kaydın durumu ne",
      "sıradaki doğru işlem ne",
    ]) rows.push(digest(await ask(session, query)));
  }
  const school = sessions.find((s) => s.role === "SCHOOL");
  if (school) rows.push(digest(await ask(school, "öğrenci sayısı nedir")));
  const room = sessions.find((s) => s.role === "ROOM");
  if (room) {
    await room.page.goto(`${base}/#/room/shifts`, { waitUntil: "domcontentloaded" });
    await wait(700);
    rows.push(digest(await ask(room, "hangi ekrandayım")));
  }
  const focusQueries = new Set(["Bu ekranda neye bakmalıyım?", "boşver rotayı iki satırlık sakin bir mesaj yaz", "çocuk gibi anlat", "daha kısa", "maddeler halinde anlat", "risk + kanıt + sonraki adım", "öğrenci sayısı nedir", "hangi ekrandayım"]);
  console.log(JSON.stringify(rows.filter((row) => focusQueries.has(row.query)), null, 2));
} finally {
  for (const session of sessions) await session.context.close().catch(() => {});
  await browser.close();
}
