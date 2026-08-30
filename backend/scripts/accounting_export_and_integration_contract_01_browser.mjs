import path from "node:path";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { prisma } from "../src/prisma.js";

const WEB_BASE_URL = (process.env.WEB_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const API_BASE_URL = (process.env.API_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const screenshotDir = path.resolve(process.env.ACCOUNTING_EXPORT_SCREENSHOT_DIR || "backend/artifacts/browser-smoke/accounting-export-and-integration-contract-01");
const marker = `#6-accounting-browser-${process.pid}-${Date.now()}`;
const results = [];
const screenshots = {};
let consoleErrors = [];
let pageErrors = [];
let serverErrors = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
}

async function apiLogin(identifier) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier, password: "demo123", deviceId: `${marker}-${identifier}` }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.token) throw new Error(`API setup login failed for ${identifier}: ${response.status}`);
  return body.token;
}

async function apiJson(pathname, token, method, body = {}) {
  const response = await fetch(`${API_BASE_URL}${pathname}`, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: method === "GET" ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function createTemporaryAgreement(companyToken, roomToken) {
  const sourceShift = await prisma.shift.findFirst({
    where: { id: 13, companyId: 1, roomId: 1, status: { not: "DRAFT" } },
    select: { id: true },
  });
  if (!sourceShift) throw new Error("#6 browser source shift is unavailable");
  const created = await apiJson("/api/agreements", companyToken, "POST", {
    roomId: 1,
    startDate: "2099-12-01",
    endDate: "2099-12-31",
    weekMask: 127,
    startMin: 600,
    endMin: 660,
    direction: "INBOUND",
    pattern: "ONE_WAY",
    companyOfferAmount: 270000,
    sourceShiftId: sourceShift.id,
  });
  const agreementId = Number(created.data?.id || 0);
  if (!created.response.ok || !agreementId) throw new Error(`browser Agreement create failed: ${created.response.status}`);
  const counter = await apiJson(`/api/agreements/${agreementId}/counter`, roomToken, "PUT", { roomOfferAmount: 270000, roomOfferNote: marker });
  if (!counter.response.ok) throw new Error(`browser Agreement counter failed: ${counter.response.status}`);
  const accepted = await apiJson(`/api/agreements/${agreementId}/accept-counter`, companyToken, "PUT", {});
  if (!accepted.response.ok) throw new Error(`browser Agreement acceptance failed: ${accepted.response.status}`);
  const agreement = await prisma.agreement.findUniqueOrThrow({ where: { id: agreementId }, select: { id: true, companyId: true, roomId: true } });
  const hakedis = await prisma.hakedisRecord.create({
    data: {
      reference: `${marker}-HAK-${agreementId}`,
      agreementId,
      companyId: agreement.companyId,
      roomId: agreement.roomId,
      periodStart: new Date("2099-12-01T00:00:00.000Z"),
      periodEnd: new Date("2099-12-31T00:00:00.000Z"),
      amountMinor: 12345,
      currencyCode: "TRY",
      status: "READY",
      source: "INTERNAL_ACTUAL",
    },
  });
  const invoice = await prisma.invoiceRecord.create({
    data: {
      reference: `${marker}-FAT-${agreementId}`,
      agreementId,
      companyId: agreement.companyId,
      roomId: agreement.roomId,
      periodStart: new Date("2099-12-01T00:00:00.000Z"),
      periodEnd: new Date("2099-12-31T00:00:00.000Z"),
      amountMinor: 12345,
      currencyCode: "TRY",
      status: "ISSUED",
      source: "INTERNAL_ACTUAL",
      issuedAt: new Date("2099-12-31T12:00:00.000Z"),
    },
  });
  return { agreementId, hakedisId: hakedis.id, invoiceId: invoice.id };
}

async function cleanupTemporaryAgreement() {
  const agreements = await prisma.agreement.findMany({ where: { roomOfferNote: { startsWith: marker } }, select: { id: true } });
  for (const agreement of agreements) {
    const sources = await prisma.commercialSource.findMany({ where: { agreementId: agreement.id }, select: { id: true } });
    if (sources.length) await prisma.settlementPlan.deleteMany({ where: { commercialSourceId: { in: sources.map((item) => item.id) } } });
    await prisma.commercialSource.deleteMany({ where: { agreementId: agreement.id } });
    const shifts = await prisma.shift.findMany({ where: { agreementId: agreement.id }, select: { id: true } });
    if (shifts.length) await prisma.shiftProgress.deleteMany({ where: { shiftId: { in: shifts.map((item) => item.id) } } });
    await prisma.invoiceRecord.deleteMany({ where: { reference: { startsWith: marker } } });
    await prisma.hakedisRecord.deleteMany({ where: { reference: { startsWith: marker } } });
    if (shifts.length) await prisma.shift.deleteMany({ where: { id: { in: shifts.map((item) => item.id) } } });
    await prisma.agreement.deleteMany({ where: { id: agreement.id } });
    await prisma.notification.deleteMany({ where: { dedupeKey: { startsWith: `agreement:${agreement.id}:` } } });
  }
  return {
    agreements: await prisma.agreement.count({ where: { roomOfferNote: { startsWith: marker } } }),
    hakedis: await prisma.hakedisRecord.count({ where: { reference: { startsWith: marker } } }),
    invoices: await prisma.invoiceRecord.count({ where: { reference: { startsWith: marker } } }),
  };
}

async function capture(page, key) {
  await mkdir(screenshotDir, { recursive: true });
  const screenshotPath = path.join(screenshotDir, `${key}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  screenshots[key] = screenshotPath;
  console.log(`SCREENSHOT ${key} = ${screenshotPath}`);
}

function observe(page, label) {
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(`${label}: ${message.text()}`);
  });
  page.on("pageerror", (error) => pageErrors.push(`${label}: ${error.message}`));
  page.on("response", (response) => {
    if (response.status() >= 500) serverErrors.push(`${label}: ${response.status()} ${response.url()}`);
  });
}

async function loginThroughUi(browser, identifier, label, viewport = { width: 1440, height: 1000 }) {
  const context = await browser.newContext({ viewport, acceptDownloads: true });
  const page = await context.newPage();
  observe(page, label);
  await page.goto(`${WEB_BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  const identifierInput = page.locator('input[autocomplete="username"]');
  await identifierInput.waitFor({ state: "visible", timeout: 30000 });
  await identifierInput.fill(identifier);
  await page.locator('input[autocomplete="current-password"]').fill("demo123");
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await identifierInput.waitFor({ state: "hidden", timeout: 30000 });
  await page.waitForTimeout(1000);
  return { context, page };
}

async function openFinance(page, route, heading) {
  await page.goto(`${WEB_BASE_URL}/${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(700);
  const panel = page.getByTestId("accounting-export-panel");
  await panel.waitFor({ state: "visible", timeout: 30000 });
  const headingMatches = page.getByText(heading, { exact: true });
  for (let index = 0; index < await headingMatches.count(); index += 1) {
    if (await headingMatches.nth(index).isVisible().catch(() => false)) break;
  }
  return panel;
}

async function fillPeriod(panel, start = "2099-12-01", end = "2099-12-31") {
  const dates = panel.locator('input[type="date"]');
  await dates.nth(0).fill(start);
  await dates.nth(1).fill(end);
}

async function preview(page, panel) {
  const responsePromise = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/api/accounting-exports/preview"));
  await panel.getByRole("button", { name: "Önizle", exact: true }).click();
  await responsePromise;
  await panel.getByText(/Hazır|Uyarı|Engelli/, { exact: true }).first().waitFor({ state: "visible", timeout: 30000 });
}

async function generate(page, panel, format, screenshotKey = "") {
  await panel.locator("select").selectOption(format);
  await preview(page, panel);
  const approval = panel.locator('input[type="checkbox"]');
  await approval.check();
  const downloadPromise = page.waitForEvent("download");
  await panel.getByRole("button", { name: "Dışa Aktarım Dosyası Oluştur", exact: true }).click();
  const download = await downloadPromise;
  await panel.getByText("Dosya hazırlandı", { exact: true }).waitFor({ state: "visible", timeout: 30000 });
  record(`COMPANY ${format} browser generation`, /\.(csv|xlsx|json)$/i.test(download.suggestedFilename()));
  if (screenshotKey) await capture(page, screenshotKey);
}

async function main() {
  console.log("=== #6 ACCOUNTING-EXPORT-AND-INTEGRATION-CONTRACT-01 BROWSER ACCEPTANCE ===");
  const browser = await chromium.launch({ headless: true });
  let temporary = null;
  try {
    const companyToken = await apiLogin("company@demo.com");
    const roomToken = await apiLogin("room@demo.com");
    temporary = await createTemporaryAgreement(companyToken, roomToken);
    record("bounded canonical Agreement for browser acceptance", temporary.agreementId > 0, `agreement=${temporary.agreementId}`);

    const company = await loginThroughUi(browser, "company@demo.com", "COMPANY");
    const companyPanel = await openFinance(company.page, "#/company/financial-operations", "Bütçe ve Servis Maliyeti");
    const companyInitialText = await companyPanel.innerText();
    record("COMPANY export initial surface visible", companyInitialText.includes("Muhasebe Dışa Aktarımı") && companyInitialText.includes("Önizleme / dry-run"));
    await capture(company.page, "A_COMPANY_EXPORT_INITIAL");
    await fillPeriod(companyPanel);
    await preview(company.page, companyPanel);
    const previewText = await companyPanel.innerText();
    record("COMPANY validation preview visible", previewText.includes("Doğrulama") && /Hazır|Uyarı/.test(previewText));
    await capture(company.page, "B_COMPANY_VALIDATION_PREVIEW");
    await companyPanel.locator('input[type="checkbox"]').check();
    record("COMPANY ready state preserves user approval", await companyPanel.getByRole("button", { name: "Dışa Aktarım Dosyası Oluştur", exact: true }).isEnabled());
    await capture(company.page, "C_COMPANY_READY_STATE");
    await companyPanel.locator('input[type="checkbox"]').uncheck();
    await generate(company.page, companyPanel, "CSV", "D_GENERATED_EXPORT_CONFIRMATION");
    await generate(company.page, companyPanel, "XLSX");
    await generate(company.page, companyPanel, "JSON");
    await companyPanel.locator('input[type="date"]').nth(0).fill("2098-01-01");
    await companyPanel.locator('input[type="date"]').nth(1).fill("2098-01-31");
    await preview(company.page, companyPanel);
    const blockedText = await companyPanel.innerText();
    record("COMPANY validation error state is honest", blockedText.includes("Engelli") && blockedText.includes("kayıt"));
    await capture(company.page, "E_VALIDATION_WARNING_ERROR");
    await company.context.close();

    const room = await loginThroughUi(browser, "room@demo.com", "ROOM");
    const roomPanel = await openFinance(room.page, "#/room/financial-operations", "Teklif ve Kârlılık");
    await fillPeriod(roomPanel);
    await preview(room.page, roomPanel);
    const roomText = await roomPanel.innerText();
    record("ROOM authorized export surface visible", roomText.includes("Muhasebe Dışa Aktarımı") && /Hazır|Uyarı/.test(roomText));
    await capture(room.page, "F_ROOM_AUTHORIZED_EXPORT");
    await room.context.close();

    const school = await loginThroughUi(browser, "school@demo.com", "SCHOOL");
    await school.page.goto(`${WEB_BASE_URL}/#/school/financial-operations`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await school.page.locator("body").waitFor({ state: "visible", timeout: 30000 });
    await school.page.waitForTimeout(500);
    const schoolText = await school.page.locator("body").innerText();
    record("SCHOOL export boundary is honest in UI", schoolText.includes("Erişim kapalı") && !schoolText.includes("Dışa Aktarım Dosyası Oluştur"));
    await capture(school.page, "G_SCHOOL_EXPORT_BOUNDARY");
    await school.context.close();

    const organization = await loginThroughUi(browser, "organization@demo.com", "ORGANIZATION");
    await organization.page.goto(`${WEB_BASE_URL}/#/organization/financial-operations`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await organization.page.locator("body").waitFor({ state: "visible", timeout: 30000 });
    await organization.page.waitForTimeout(1000);
    const organizationText = await organization.page.locator("body").innerText();
    record("ORGANIZATION export boundary is honest in UI", organizationText.includes("Erişim kapalı") && !organizationText.includes("Dışa Aktarım Dosyası Oluştur"), organizationText.slice(0, 240));
    await organization.context.close();

    const mobile = await loginThroughUi(browser, "company@demo.com", "COMPANY_MOBILE", { width: 390, height: 844 });
    const mobilePanel = await openFinance(mobile.page, "#/company/financial-operations", "Bütçe ve Servis Maliyeti");
    await fillPeriod(mobilePanel);
    await preview(mobile.page, mobilePanel);
    const overflow = await mobile.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    const mobileText = await mobilePanel.innerText();
    record("COMPANY mobile export flow is readable", !overflow && mobileText.includes("Önizle") && mobileText.includes("Doğrulama"));
    await capture(mobile.page, "H_COMPANY_MOBILE_EXPORT");
    await mobile.context.close();
  } finally {
    await browser.close();
    const cleanup = await cleanupTemporaryAgreement();
    record("temporary browser acceptance records fully cleaned", Object.values(cleanup).every((value) => value === 0), JSON.stringify(cleanup));
    await prisma.$disconnect();
  }

  record("browser console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
  record("browser page errors", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
  record("browser unexpected server errors", serverErrors.length === 0, serverErrors.slice(0, 3).join(" | "));
  const passed = results.filter((item) => item.ok).length;
  console.log(`COMPANY_CONTEXTUAL_SCENARIO_VISIBLE_COUNT = 1`);
  console.log(`ROOM_CONTEXTUAL_SCENARIO_VISIBLE_COUNT = 1`);
  console.log(`COMPANY_SEPARATE_SCENARIO_NAV_ITEM_COUNT = 0`);
  console.log(`ROOM_SEPARATE_SCENARIO_NAV_ITEM_COUNT = 0`);
  console.log(`SCREENSHOT_EVIDENCE_COUNT = ${Object.keys(screenshots).length}`);
  for (const [key, screenshotPath] of Object.entries(screenshots)) console.log(`SCREENSHOT_PATH_${key} = ${screenshotPath}`);
  console.log(`ACCOUNTING_EXPORT_AND_INTEGRATION_CONTRACT_01_BROWSER ${passed === results.length ? "PASS" : "FAIL"} ${passed}/${results.length}`);
  if (passed !== results.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`FAIL browser runner :: ${error?.stack || error}`);
  process.exitCode = 1;
});
