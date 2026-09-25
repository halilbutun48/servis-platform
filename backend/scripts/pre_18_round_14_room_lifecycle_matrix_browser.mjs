import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const web = (process.env.WEB_BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const out = path.join(root, "backend/artifacts/browser-smoke/pre-18-round-14-targeted");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const categories = {
  SELECTED_OFFER: ["seçili teklifin durumu nedir", "bu kartın kararı ne", "seçili kaydın önemli alanlarını söyle", "teklif kartını özetle"],
  AUTHORIZED_SELECTED_FIELDS: ["kartın kararı nedir", "hizmet alanı bedeli ne görünüyor", "taşımacı bedeli ne görünüyor", "teklifin risk durumu nedir", "kalite durumu ne"],
  COMPOSITE_FIELDS: ["bu teklifin tarih aralığı ne", "başlangıç-bitiş saatleri nedir", "hangi saatler arasında", "teklifin tarihlerini söyle"],
  TWO_OFFER_COMPARISON: ["35 ile 34 arasındaki farkı gün ve durum bazında söyle", "35 ve 34 tekliflerini gün ve durum açısından karşılaştır", "iki teklifin tarih ve durum farkı ne", "35 ile 34 hangisinde ne değişiyor"],
  SELECTED_PRIORITY: ["hangisi önce bakılacak, gerekçesiyle", "önce hangi teklifi inceleyelim", "ilk hangisini halledelim ve neden", "en acil teklif hangisi"],
  SCREEN_CONTEXT_NAVIGATION: ["bu ekranda neye bakmalıyım", "buradaki önemli kayıt ne", "şimdi bu sayfada ne yapmalıyım", "mevcut ekranın önceliği ne"],
};
const counts = { SELECTED_OFFER: 80, TWO_OFFER_COMPARISON: 60, AUTHORIZED_SELECTED_FIELDS: 80, COMPOSITE_FIELDS: 50, SELECTED_PRIORITY: 60, SCREEN_CONTEXT_NAVIGATION: 50 };

function compact(value) { return String(value || "").replace(/\s+/g, " ").trim(); }
function family(body) { return String(body?.semanticPlan?.family || body?.semanticPlan?.intentFamily || body?.questionType || ""); }
function offTopic(body) { return /OFF_TOPIC_SAFE|GENERAL_KNOWLEDGE|LIVE_EXTERNAL_DATA/.test(`${family(body)} ${body?.semanticPlan?.conversationRoute || body?.conversationRoute || ""}`); }

async function openRoom(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  const page = await context.newPage(); page.setDefaultTimeout(20000);
  await page.goto(`${web}/`, { waitUntil: "domcontentloaded" });
  const username = page.locator('input[autocomplete="username"]');
  if (await username.count()) { await username.fill("room@demo.com"); await page.locator('input[autocomplete="current-password"]').fill("demo123"); await page.locator('button[type="submit"]').click(); await page.waitForFunction(() => !document.querySelector('input[autocomplete="username"]'), null, { timeout: 20000 }); }
  await page.goto(`${web}/#/room/offers`, { waitUntil: "domcontentloaded" }); await wait(500);
  const card = page.locator(".pre18-room-offer-card:visible").first(); if (!(await card.count())) throw new Error("ROOM offer card not found");
  await card.click(); await wait(250); await page.waitForFunction(() => Number(window.__psv1CopilotSelection?.entityId || 0) > 0, null, { timeout: 10000 });
  const fab = page.locator(".copilotFab:visible").first(); if (await fab.count()) await fab.click();
  const drawer = page.locator(".copilotDrawer:visible").first(); await drawer.waitFor({ state: "visible" });
  return { context, page, drawer, last: 0 };
}

async function ask(session, query) {
  const elapsed = Date.now() - session.last; if (elapsed < 1100) await wait(1100 - elapsed);
  if (!(await session.drawer.isVisible().catch(() => false))) { const fab = session.page.locator(".copilotFab:visible").first(); if (await fab.count()) await fab.click(); session.drawer = session.page.locator(".copilotDrawer:visible").first(); await session.drawer.waitFor({ state: "visible" }); }
  const input = session.drawer.locator("textarea").first(); await input.fill(query);
  const responsePromise = session.page.waitForResponse((r) => r.url().includes("/api/ai/copilot") && r.request().method() === "POST", { timeout: 30000 });
  await input.press("Enter"); const response = await responsePromise; session.last = Date.now(); const body = await response.json().catch(() => ({}));
  return { status: response.status(), family: family(body), route: body?.semanticPlan?.conversationRoute || body?.conversationRoute || "", reply: compact(body?.reply || body?.summary), body };
}

async function main() {
  await fs.mkdir(out, { recursive: true }); const browser = await chromium.launch({ headless: true }); const session = await openRoom(browser); const rows = []; const failures = [];
  try {
    for (const [category, required] of Object.entries(counts)) {
      const variants = categories[category];
      if (category === "TWO_OFFER_COMPARISON") { /* The first comparison establishes the active comparison set. */ }
      if (category === "SELECTED_PRIORITY" && !rows.some((row) => row.category === "TWO_OFFER_COMPARISON")) await ask(session, categories.TWO_OFFER_COMPARISON[0]);
      if (category === "SCREEN_CONTEXT_NAVIGATION") {
        await session.page.goto(`${web}/#/room/shifts`, { waitUntil: "domcontentloaded" }); await wait(450);
      }
      for (let index = 0; index < required; index += 1) {
        const query = variants[index % variants.length];
        const result = await ask(session, query);
        const row = { category, index: index + 1, query, ...result, selectedId: result.body?.semanticPlan?.entity?.id || null };
        rows.push(row);
        const requiredFamily = category === "TWO_OFFER_COMPARISON" ? /COMPARISON/ : category === "SELECTED_PRIORITY" ? /PRIORITY|RISK_RANKING/ : category === "SCREEN_CONTEXT_NAVIGATION" ? /SCREEN_OR_SITUATION_SUMMARY|MULTI_DOMAIN_SUMMARY|NEXT_STEP|PRIORITY/ : /COMMERCIAL_SUMMARY|STATUS|RISK_RANKING|ISSUE_DIAGNOSTIC/;
        if (result.status !== 200 || offTopic(result.body) || !requiredFamily.test(result.family) || !result.reply) failures.push({ category, index: index + 1, query, status: result.status, family: result.family, route: result.route, reply: result.reply });
      }
    }
    const report = { generatedAt: new Date().toISOString(), web, required: counts, actual: Object.fromEntries(Object.keys(counts).map((key) => [key, rows.filter((row) => row.category === key).length])), failureCount: failures.length, failures, rows };
    await fs.writeFile(path.join(out, "room-lifecycle-matrix.json"), JSON.stringify(report, null, 2), "utf8");
    console.log(JSON.stringify({ generatedAt: report.generatedAt, required: report.required, actual: report.actual, failureCount: report.failureCount, failures: failures.slice(0, 12) }, null, 2));
  } finally { await session.context.close().catch(() => {}); await browser.close(); }
}

main().catch((error) => { console.error(error?.stack || error); process.exitCode = 1; });
