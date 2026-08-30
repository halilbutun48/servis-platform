import path from "node:path";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { prisma } from "../src/prisma.js";

const WEB_BASE_URL = (process.env.WEB_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const API_BASE_URL = (process.env.API_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const results = [];
const screenshotDir = path.resolve(process.env.SEFER_ABI_SCREENSHOT_DIR || "backend/artifacts/browser-smoke/sefer-abi-cost-analysis-assistant-01");
const screenshotPaths = {};
let consoleErrors = [];
let pageErrors = [];
let serverErrors = 0;

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
}

async function login(identifier) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier, password: "demo123", deviceId: `#5-sefer-abi-browser-${identifier}` }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.token) throw new Error(`browser login failed ${identifier}: ${response.status}`);
  return body.token;
}

async function createTemporaryAgreement(companyToken, roomToken) {
  const existing = await prisma.agreement.count({ where: { companyId: 1, roomId: 1 } });
  if (existing > 0) return null;
  const create = await fetch(`${API_BASE_URL}/api/agreements`, {
    method: "POST",
    headers: { authorization: `Bearer ${companyToken}`, "content-type": "application/json" },
    body: JSON.stringify({
      roomId: 1,
      startDate: "2099-02-01",
      endDate: "2099-02-28",
      weekMask: 127,
      startMin: 600,
      endMin: 660,
      direction: "INBOUND",
      pattern: "ONE_WAY",
      companyOfferAmount: 270000,
      sourceShiftId: 13,
    }),
  });
  const body = await create.json().catch(() => ({}));
  const agreementId = Number(body?.id || 0);
  if (!create.ok || !agreementId) throw new Error(`browser temporary Agreement create ${create.status}`);
  const counter = await fetch(`${API_BASE_URL}/api/agreements/${agreementId}/counter`, {
    method: "PUT",
    headers: { authorization: `Bearer ${roomToken}`, "content-type": "application/json" },
    body: JSON.stringify({ roomOfferAmount: 270000, roomOfferNote: "#5 browser bounded acceptance" }),
  });
  if (!counter.ok) throw new Error(`browser temporary Agreement counter ${counter.status}`);
  const accept = await fetch(`${API_BASE_URL}/api/agreements/${agreementId}/accept-counter`, {
    method: "PUT",
    headers: { authorization: `Bearer ${companyToken}`, "content-type": "application/json" },
    body: "{}",
  });
  if (!accept.ok) throw new Error(`browser temporary Agreement accept ${accept.status}`);
  const sources = await prisma.commercialSource.findMany({ where: { agreementId }, select: { id: true } });
  return { agreementId, sourceIds: sources.map((row) => row.id), notificationPrefix: `agreement:${agreementId}:` };
}

async function cleanupTemporaryAgreement(temp) {
  if (!temp?.agreementId) return { agreement: 0, sources: 0, notifications: 0, settlementPlans: 0 };
  const settlementPlans = await prisma.settlementPlan.deleteMany({ where: { commercialSourceId: { in: temp.sourceIds || [] } } }).catch(() => ({ count: 0 }));
  const sources = await prisma.commercialSource.deleteMany({ where: { id: { in: temp.sourceIds || [] }, agreementId: temp.agreementId } });
  const agreement = await prisma.agreement.deleteMany({ where: { id: temp.agreementId } });
  const notifications = await prisma.notification.deleteMany({ where: { dedupeKey: { startsWith: temp.notificationPrefix } } }).catch(() => ({ count: 0 }));
  return { agreement: agreement.count, sources: sources.count, notifications: notifications.count, settlementPlans: settlementPlans.count };
}

async function capture(page, key) {
  await mkdir(screenshotDir, { recursive: true });
  const screenshotPath = path.join(screenshotDir, `${key}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  screenshotPaths[key] = screenshotPath;
  console.log(`SCREENSHOT ${key} = ${screenshotPath}`);
}

async function askInDrawer(page, message, screenshotKey = "") {
  const composer = page.locator(".copilotComposer");
  const input = composer.locator("textarea");
  await input.fill(message);
  await composer.locator('button[type="submit"]').click();
  const assistant = page.locator(".copilotMsg.assistant").last();
  await assistant.waitFor({ state: "visible", timeout: 30000 });
  await page.locator(".copilotBusy").waitFor({ state: "hidden", timeout: 30000 }).catch(() => {});
  const details = assistant.locator("details");
  if (await details.count()) {
    if ((await details.getAttribute("open")) === null) await details.locator("summary").click();
  }
  if (screenshotKey) await capture(page, screenshotKey);
  return assistant;
}

async function visit(browser, { name, identifier, route, contextualHome, scenarioTestId, messages = [], mobileKey = "" }) {
  const token = await login(identifier);
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(`${name}: ${message.text()}`);
  });
  page.on("pageerror", (error) => pageErrors.push(`${name}: ${error.message}`));
  page.on("response", (response) => {
    if (response.status() >= 500) serverErrors += 1;
  });
  await page.addInitScript((value) => {
    localStorage.setItem("token", value);
    localStorage.removeItem("psv1:copilot:drawer:history:v4");
  }, token);
  await page.goto(`${WEB_BASE_URL}${route}`, { waitUntil: "domcontentloaded", timeout: 25000 });

  const body = page.locator("body");
  if (contextualHome) await body.getByText(contextualHome, { exact: true }).first().waitFor({ state: "visible", timeout: 20000 });
  if (scenarioTestId) {
    const scenario = page.getByTestId(scenarioTestId);
    await scenario.waitFor({ state: "visible", timeout: 20000 });
  }
  const pageText = await body.innerText();
  const navText = (await page.locator("nav").allInnerTexts()).join(" ");
  if (scenarioTestId) {
    const scenario = page.getByTestId(scenarioTestId);
    record(`${name} contextual scenario visible`, pageText.includes("Maliyet Senaryosu") && await scenario.isVisible());
    record(`${name} scenario action and safe copy`, pageText.includes("Senaryoyu Karşılaştır") && pageText.includes("Sadece önizleme") && !pageText.includes("Maliyet Senaryoları"));
  }
  if (name === "COMPANY" || name === "ROOM") record(`${name} separate scenario nav absent`, !navText.includes("Maliyet Senaryoları"));

  const copilotFab = page.getByRole("button", { name: /Sefer Abi’ye Sor/i });
  await copilotFab.click();
  const composer = page.locator(".copilotComposer");
  await composer.waitFor({ state: "visible", timeout: 10000 });
  for (const item of messages) {
    const assistant = await askInDrawer(page, item.message, item.screenshotKey);
    const reasoningText = await assistant.innerText();
    record(`${name} ${item.message} reasoning visible`, ["SONUÇ", "NEDEN", "KANIT", "FİNANSAL ETKİ", "OPERASYON ETKİSİ", "RİSK", "ÖNERİ", "EKSİK VERİ", "GÜVEN SEVİYESİ"].every((label) => reasoningText.includes(label)));
    record(`${name} ${item.message} preview-only`, reasoningText.includes("salt okunur") || reasoningText.includes("Sadece önizleme"));
  }
  if (mobileKey) {
    await page.setViewportSize({ width: 390, height: 844 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    record(`${name} mobile no horizontal overflow`, !overflow);
    await capture(page, mobileKey);
  }
  await page.close();
}

async function main() {
  console.log("=== #5 SEFER-ABI-COST-ANALYSIS-ASSISTANT-01 BROWSER ACCEPTANCE ===");
  await mkdir(screenshotDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const companyToken = await login("company@demo.com");
  const roomToken = await login("room@demo.com");
  let temporaryAgreement = null;
  try {
    temporaryAgreement = await createTemporaryAgreement(companyToken, roomToken);
    await visit(browser, {
      name: "COMPANY",
      identifier: "company@demo.com",
      route: "/#/company/financial-operations",
      contextualHome: "Bütçe ve Servis Maliyeti",
      scenarioTestId: "company-contextual-scenario",
      messages: [
        { message: "Bütçem neden aşılıyor?", screenshotKey: "E_COMPANY_BUDGET" },
        { message: "10 kişi daha gelirse?", screenshotKey: "F_COMPANY_SCENARIO_FOLLOWUP" },
      ],
      mobileKey: "L_COMPANY_MOBILE",
    });
    await visit(browser, {
      name: "ROOM",
      identifier: "room@demo.com",
      route: "/#/room/financial-operations",
      contextualHome: "Teklif ve Kârlılık",
      scenarioTestId: "cost-scenario-workspace",
      messages: [
        { message: "Bu planın maliyeti ne?", screenshotKey: "A_ROOM_PARTIAL_COST" },
        { message: "Bu sözleşme kârlı mı?", screenshotKey: "B_ROOM_CONTRACT_PROFITABILITY" },
        { message: "En pahalı rota hangisi?", screenshotKey: "C_ROOM_MULTI_ROUTE_RANKING" },
        { message: "Kaç araç daha mantıklı?", screenshotKey: "D_ROOM_VEHICLE_RECOMMENDATION" },
        { message: "Peki neden?", screenshotKey: "I_FOLLOWUP_NEDEN" },
        { message: "Bulamadım", screenshotKey: "J_RECOVERY" },
      ],
      mobileKey: "K_ROOM_MOBILE",
    });
    await visit(browser, {
      name: "SCHOOL",
      identifier: "school@demo.com",
      route: "/#/school/operations",
      messages: [{ message: "50 öğrenci olursa kaç araç gerekir?", screenshotKey: "G_SCHOOL" }],
    });
    await visit(browser, {
      name: "ORGANIZATION",
      identifier: "organization@demo.com",
      route: "/#/organization/operations",
      messages: [{ message: "80 katılımcı için hangi araç planı?", screenshotKey: "H_ORGANIZATION" }],
    });
  } finally {
    await browser.close();
    await cleanupTemporaryAgreement(temporaryAgreement);
    await prisma.$disconnect();
  }
  record("browser console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
  record("browser page errors", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
  record("browser unexpected server errors", serverErrors === 0, String(serverErrors));
  const passCount = results.filter((item) => item.ok).length;
  console.log(`COMPANY_CONTEXTUAL_SCENARIO_VISIBLE_COUNT = ${results.some((item) => item.name === "COMPANY contextual scenario visible" && item.ok) ? 1 : 0}`);
  console.log(`ROOM_CONTEXTUAL_SCENARIO_VISIBLE_COUNT = ${results.some((item) => item.name === "ROOM contextual scenario visible" && item.ok) ? 1 : 0}`);
  console.log(`COMPANY_SEPARATE_SCENARIO_NAV_ITEM_COUNT = ${results.some((item) => item.name === "COMPANY separate scenario nav absent" && !item.ok) ? 1 : 0}`);
  console.log(`ROOM_SEPARATE_SCENARIO_NAV_ITEM_COUNT = ${results.some((item) => item.name === "ROOM separate scenario nav absent" && !item.ok) ? 1 : 0}`);
  console.log(`SCREENSHOT_EVIDENCE_COUNT = ${Object.keys(screenshotPaths).length}`);
  for (const [key, screenshotPath] of Object.entries(screenshotPaths)) console.log(`SCREENSHOT_PATH_${key} = ${screenshotPath}`);
  console.log(`#5 browser acceptance: ${passCount}/${results.length} PASS`);
  if (passCount !== results.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
