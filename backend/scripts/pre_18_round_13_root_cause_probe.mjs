import { chromium } from "@playwright/test";

const base = (process.env.WEB_BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const driverDeviceId = process.env.DRIVER_BROWSER_DEVICE_ID || "web-abira4usmtq9fups";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 1400);
}
function plan(body) {
  const p = body?.semanticPlan || {};
  return {
    family: p.family || p.intentFamily || body?.questionType || null,
    route: p.conversationRoute || body?.conversationRoute || null,
    domain: p.domain || p.domains || null,
    entity: p.entity ? { type: p.entity.type, id: p.entity.id, source: p.entity.source, label: p.entity.label } : null,
    entities: Array.isArray(p.entities) ? p.entities.map((x) => ({ type: x.type, id: x.id, source: x.source, label: x.label })) : [],
    temporalMode: p.temporalMode || null,
    requestedFields: p.requestedFields || p.requestedFieldGroups || null,
    taskSlots: p.taskSlots || p.slots || null,
  };
}
function responseSummary(body) {
  return {
    reply: compact(body?.reply || body?.summary || body?.contextSummary),
    plan: plan(body),
    records: Array.isArray(body?.authorizedRecords) ? body.authorizedRecords.slice(0, 5) : [],
    queryPlanExecution: body?.queryPlanExecution || null,
    facts: body?.retrievedFacts || body?.facts || null,
  };
}

async function open(browser, role, email, route) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  if (role === "DRIVER") await context.addInitScript((id) => localStorage.setItem("personel_servis_browser_device_id", id), driverDeviceId);
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  const username = page.locator('input[autocomplete="username"]');
  if (await username.count()) {
    await username.fill(email);
    await page.locator('input[autocomplete="current-password"]').fill("demo123");
    await page.locator('button[type="submit"]').click();
    try {
      await page.waitForFunction(() => !document.querySelector('input[autocomplete="username"]'), null, { timeout: 20000 });
    } catch (error) {
      console.error(JSON.stringify({ loginRole: role, url: page.url(), body: (await page.locator("body").innerText().catch(() => "")).slice(0, 2500), error: String(error?.message || error) }));
      throw error;
    }
  }
  await page.goto(`${base}/#${route}`, { waitUntil: "domcontentloaded" });
  await wait(700);
  return { context, page, role, last: 0 };
}

async function ask(session, text) {
  const elapsed = Date.now() - session.last;
  if (elapsed < 1100) await wait(1100 - elapsed);
  let drawer = session.page.locator(".copilotDrawer:visible").first();
  if (!(await drawer.count())) {
    await session.page.locator(".copilotFab:visible").first().click();
    drawer = session.page.locator(".copilotDrawer:visible").first();
  }
  const input = drawer.locator("textarea").first();
  await input.fill(text);
  const responsePromise = session.page.waitForResponse((r) => r.url().includes("/api/ai/copilot") && r.request().method() === "POST", { timeout: 30000 });
  await input.press("Enter");
  const response = await responsePromise;
  session.last = Date.now();
  const body = await response.json().catch(() => ({}));
  return { query: text, status: response.status(), request: response.request().postDataJSON?.() || {}, response: responseSummary(body) };
}

async function clickFirstVisibleRecord(session) {
  const rows = session.page.locator("tbody tr:visible");
  if (await rows.count()) {
    await rows.first().click();
    await wait(450);
    return true;
  }
  return false;
}

const browser = await chromium.launch({ headless: true });
const sessions = [];
try {
  const driver = await open(browser, "DRIVER", "driver@demo.com", "/driver/today");
  sessions.push(driver);
  const driverRows = [];
  for (const text of ["aktif vardiyam var mı", "bağlı araç ne", "plaka var mı", "sıradaki durak", "rota ne", "geçmiş vardiyam hangisi"]) driverRows.push(await ask(driver, text));

  const room = await open(browser, "ROOM", "room@demo.com", "/room/offers");
  sessions.push(room);
  const roomBefore = await ask(room, "ekrandaki teklifleri ve önemli tarihleri özetle");
  const roomClicked = await clickFirstVisibleRecord(room);
  const roomAfter = [];
  for (const text of ["seçili kaydın durumunu ve tarihlerini özetle", "seçili teklif ile vardiyayı karşılaştır", "ekrandaki seçili kaydın kanıtını göster"]) roomAfter.push(await ask(room, text));

  const digest = (row) => ({
    query: row.query,
    status: row.status,
    requestPath: row.request?.screenContext?.path,
    selected: row.request?.screenContext?.selectedEntityType ? { type: row.request.screenContext.selectedEntityType, id: row.request.screenContext.selectedEntityId, label: row.request.screenContext.selectedLabel } : null,
    family: row.response.plan.family,
    route: row.response.plan.route,
    entity: row.response.plan.entity,
    temporalMode: row.response.plan.temporalMode,
    fields: row.response.plan.requestedFields,
    reply: row.response.reply,
    records: row.response.records,
    facts: row.response.facts,
    queryPlanStatus: row.response.queryPlanExecution?.status || null,
  });
  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), driver: driverRows.map(digest), room: { clicked: roomClicked, before: digest(roomBefore), after: roomAfter.map(digest) } }, null, 2));
} finally {
  for (const session of sessions) await session.context.close().catch(() => {});
  await browser.close();
}
