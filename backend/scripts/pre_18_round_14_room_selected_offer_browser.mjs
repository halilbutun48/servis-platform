import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const web = (process.env.WEB_BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const out = path.join(root, "backend/artifacts/browser-smoke/pre-18-round-14-targeted");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const queries = [
  "kartın kararı nedir",
  "hizmet alanı bedeli ve taşımacı bedeli ne görünüyor",
  "bu teklifin tarih aralığı ne",
  "35 ile 34 arasındaki farkı gün ve durum bazında söyle",
  "hangisi önce bakılacak, gerekçesiyle",
  "sorun var mı",
  "gerçek sorun hangisi",
  "riskleri karşılaştır",
  "en acil risk hangisi",
];

function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 2000);
}

async function loginAndOpen(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  await page.goto(`${web}/`, { waitUntil: "domcontentloaded" });
  const username = page.locator('input[autocomplete="username"]');
  if (await username.count()) {
    await username.fill("room@demo.com");
    await page.locator('input[autocomplete="current-password"]').fill("demo123");
    await page.locator('button[type="submit"]').click();
    await page.waitForFunction(() => !document.querySelector('input[autocomplete="username"]'), null, { timeout: 20000 });
  }
  await page.goto(`${web}/#/room/offers`, { waitUntil: "domcontentloaded" });
  await wait(700);
  const card = page.locator(".pre18-room-offer-card:visible").first();
  if (!(await card.count())) throw new Error("ROOM offer card was not visible");
  await card.click();
  await page.waitForFunction(() => Number(window.__psv1CopilotSelection?.entityId || 0) > 0, null, { timeout: 10000 });
  const fab = page.locator(".copilotFab:visible").first();
  if (await fab.count()) await fab.click();
  const drawer = page.locator(".copilotDrawer:visible").first();
  await drawer.waitFor({ state: "visible" });
  return { context, page, drawer };
}

async function ask(session, query) {
  if (!(await session.drawer.isVisible().catch(() => false))) {
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
  const body = await response.json().catch(() => ({}));
  await wait(200);
  const request = response.request().postDataJSON?.() || {};
  const requestSelection = request?.screenContext?.selectedEntityType && request?.screenContext?.selectedEntityId
    ? { type: request.screenContext.selectedEntityType, id: request.screenContext.selectedEntityId, path: request.screenContext.path }
    : null;
  return {
    query,
    status: response.status(),
    selected: await session.page.evaluate(() => window.__psv1CopilotSelection || null),
    requestSelection,
    family: body?.semanticPlan?.family || body?.semanticPlan?.intentFamily || null,
    route: body?.semanticPlan?.conversationRoute || body?.conversationRoute || null,
    fields: body?.semanticPlan?.requestedFields || [],
    entities: body?.semanticPlan?.entities || [],
    comparison: body?.queryPlanExecution?.comparison || null,
    queryPlanStatus: body?.queryPlanExecution?.status || null,
    reply: compact(body?.reply || body?.summary),
    body,
  };
}

async function main() {
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  let session;
  try {
    session = await loginAndOpen(browser);
    const results = [];
    for (const query of queries) {
      results.push(await ask(session, query));
      await wait(1150);
    }
    await session.page.goto(`${web}/#/room/shifts`, { waitUntil: "domcontentloaded" });
    await wait(500);
    const screenContextAfterNavigation = await ask(session, "bu ekranda neye bakmalıyım");
    const report = { generatedAt: new Date().toISOString(), web, selected: results[0]?.selected || null, results, screenContextAfterNavigation };
    await fs.writeFile(path.join(out, "room-selected-offer.json"), JSON.stringify(report, null, 2), "utf8");
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await session?.context?.close().catch(() => {});
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
