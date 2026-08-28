#!/usr/bin/env node

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const WEB_BASE_URL = (process.env.WEB_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const API_BASE_URL = (process.env.API_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const artifactRoot = path.join(repoRoot, "backend", "artifacts", "browser-smoke", "UX_COMMERCIAL_SHIFT_CARD_CLOSURE_01");
const screenshotRoot = path.join(artifactRoot, "screenshots");
const reportJsonPath = path.join(artifactRoot, "report.json");
const reportMdPath = path.join(artifactRoot, "report.md");
const chromiumDebugLogPath = path.join(artifactRoot, "chromium-debug.log");

const USERS = Object.freeze({
  company: { identifier: "company@demo.com", password: "demo123" },
  room: { identifier: "room@demo.com", password: "demo123" },
  school: { identifier: "school@demo.com", password: "demo123" },
  organization: { identifier: "organization@demo.com", password: "demo123" },
});

const FORBIDDEN_COMMERCIAL_TOKENS = Object.freeze([
  "Ticari özet",
  "Hakediş",
  "Ödeme Hazırlığı",
  "Sözleşmeye Dönüştür",
  "Sözleşmeyi Aç",
  "Teklif Gönder",
  "Teklifleri Aç",
  "settlement",
]);

const LEGACY_CARD_TOKENS = Object.freeze([
  "R→C",
  "C→R",
  "R→D",
  "Legacy Durum",
  "ACCEPTED",
  "Komisyon snapshot",
  "settlement",
  "Tahsilat",
  "Platform",
  "Sağlayıcı",
]);

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function login(role) {
  const credentials = USERS[role];
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: credentials.identifier,
      password: credentials.password,
      deviceId: `ux-commercial-shift-card-${role}`,
      deviceName: "Commercial shift card UX acceptance",
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.token) {
    throw new Error(`LOGIN_FAIL ${role} ${response.status}`);
  }
  return payload;
}

async function capture(page, name) {
  const absolutePath = path.join(screenshotRoot, name);
  await ensureDir(path.dirname(absolutePath));
  await page.screenshot({ path: absolutePath, fullPage: false });
  return path.relative(repoRoot, absolutePath).replace(/\\/g, "/");
}

async function attachHealth(page, result) {
  page.on("console", (message) => {
    if (message.type() === "error") result.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => {
    result.pageErrors.push(error?.message || String(error));
  });
  page.on("response", (response) => {
    if (response.status() === 500) result.unexpected500 += 1;
    if (response.status() === 429) result.unexpected429 += 1;
  });
}

async function openPage(context, token, route, pageResult) {
  const page = await context.newPage();
  await attachHealth(page, pageResult);
  await page.addInitScript((value) => {
    window.localStorage.setItem("token", value);
  }, token);
  await page.goto(`${WEB_BASE_URL}${route}`, { waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1400);
  return page;
}

async function runShiftCardScenario({ role, token, viewport, browser, result }) {
  const route = role === "company" ? "/#/company/shifts" : "/#/room/shifts";
  const perspective = role === "company" ? "company" : "room";
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: viewport.width < 600 ? 2 : 1,
    isMobile: viewport.width < 600,
    hasTouch: viewport.width < 600,
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
  });
  const pageResult = {
    role,
    route,
    viewport: viewport.width < 600 ? "mobile" : "desktop",
    screenshots: [],
    cards: 0,
    primaryActionCount: 0,
    rawLegacyTokens: [],
    detailsRawLegacyTokens: [],
    duplicatedAcceptedStatusCount: 0,
    horizontalOverflow: false,
    consoleErrors: [],
    pageErrors: [],
    unexpected500: 0,
    unexpected429: 0,
    pass: false,
  };
  const page = await openPage(context, token, route, pageResult);

  try {
    const cards = page.locator('[data-testid="commercial-shift-card"]');
    await cards.first().waitFor({ state: "visible", timeout: 10000 });
    pageResult.cards = await cards.count();
    const firstCard = cards.first();
    const collapsedText = await firstCard.innerText();
    pageResult.primaryActionCount = await firstCard.locator('[data-testid="shift-card-primary-action"] button').count();
    pageResult.rawLegacyTokens = LEGACY_CARD_TOKENS.filter((tokenValue) => collapsedText.includes(tokenValue));
    pageResult.duplicatedAcceptedStatusCount = Math.max(0, (collapsedText.match(/Kabul Edildi/g) || []).length - 1);
    pageResult.horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    await firstCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);

    if (viewport.width >= 600) {
      pageResult.screenshots.push(await capture(page, `${perspective}/desktop-collapsed.png`));
      const detailsSummary = firstCard.locator("summary").filter({ hasText: "Detayları göster" }).first();
      await detailsSummary.click({ timeout: 5000 });
      await page.waitForTimeout(200);
      const detailsText = await firstCard.innerText();
      pageResult.detailsRawLegacyTokens = LEGACY_CARD_TOKENS.filter((tokenValue) => detailsText.includes(tokenValue));
      pageResult.duplicatedAcceptedStatusCount = Math.max(pageResult.duplicatedAcceptedStatusCount, Math.max(0, (detailsText.match(/Kabul Edildi/g) || []).length - 1));
      pageResult.screenshots.push(await capture(page, `${perspective}/desktop-details.png`));
      const otherSummary = firstCard.locator("summary").filter({ hasText: "Diğer işlemler" }).first();
      await otherSummary.click({ timeout: 5000 });
      await page.waitForTimeout(200);
      pageResult.screenshots.push(await capture(page, `${perspective}/desktop-other-actions.png`));
    } else {
      pageResult.screenshots.push(await capture(page, `${perspective}/mobile.png`));
    }

    const expectedCounterparty = role === "company" ? "Taşımacılık Firması" : "Hizmet Alan Firma";
    const normalizedCollapsedText = collapsedText.toLowerCase();
    const normalizedCounterparty = expectedCounterparty.toLowerCase();
    pageResult.pass = pageResult.cards > 0
      && pageResult.primaryActionCount === 1
      && normalizedCollapsedText.includes(normalizedCounterparty)
      && pageResult.rawLegacyTokens.length === 0
      && pageResult.detailsRawLegacyTokens.length === 0
      && pageResult.duplicatedAcceptedStatusCount === 0
      && !pageResult.horizontalOverflow
      && pageResult.consoleErrors.length === 0
      && pageResult.pageErrors.length === 0
      && pageResult.unexpected500 === 0
      && pageResult.unexpected429 === 0;
  } finally {
    pageResult.unexpected500 = pageResult.unexpected500 || 0;
    pageResult.unexpected429 = pageResult.unexpected429 || 0;
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  }

  result.shiftCards.push(pageResult);
  result.consoleErrorCount += pageResult.consoleErrors.length;
  result.pageErrorCount += pageResult.pageErrors.length;
  result.unexpected500 += pageResult.unexpected500;
  result.unexpected429 += pageResult.unexpected429;
}

async function runCommercialEntryScenario({ role, token, browser, result }) {
  const route = role === "company" ? "/#/company/commercial-flow" : "/#/room/commercial-flow";
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
  });
  const pageResult = { role, route, screenshots: [], consoleErrors: [], pageErrors: [], unexpected500: 0, unexpected429: 0, pass: false };
  const page = await openPage(context, token, route, pageResult);
  try {
    const text = await page.locator("body").innerText();
    pageResult.screenshots.push(await capture(page, `${role}/desktop-${role === "company" ? "hakedis-entry-point" : "hakedis-entry-point"}.png`));
    if (role === "room") {
      pageResult.screenshots.push(await capture(page, "room/desktop-payment-preparation.png"));
    }
    const hasHakedisEntry = role === "company"
      ? text.includes("Hakediş") && text.includes("mutabakat")
      : text.includes("Hakediş");
    const hasPaymentReadiness = role === "room" ? text.includes("Ödeme Hazırlığı") : true;
    pageResult.pass = hasHakedisEntry && hasPaymentReadiness
      && pageResult.consoleErrors.length === 0
      && pageResult.pageErrors.length === 0
      && pageResult.unexpected500 === 0
      && pageResult.unexpected429 === 0;
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  }
  result.commercialEntries.push(pageResult);
  result.consoleErrorCount += pageResult.consoleErrors.length;
  result.pageErrorCount += pageResult.pageErrors.length;
  result.unexpected500 += pageResult.unexpected500;
  result.unexpected429 += pageResult.unexpected429;
}

async function runCompanyKindGuard({ role, token, browser, result }) {
  const route = role === "school" ? "/#/school/shifts" : "/#/organization/shifts";
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
  });
  const pageResult = { role, route, cards: 0, companyKind: null, forbiddenTokens: [], consoleErrors: [], pageErrors: [], unexpected500: 0, unexpected429: 0, pass: false };
  const page = await openPage(context, token, route, pageResult);
  try {
    const cards = page.locator('[data-testid="commercial-shift-card"]');
    pageResult.cards = await cards.count();
    if (pageResult.cards > 0) {
      const card = cards.first();
      pageResult.companyKind = await card.getAttribute("data-company-kind");
      const cardText = await card.innerText();
      pageResult.forbiddenTokens = FORBIDDEN_COMMERCIAL_TOKENS.filter((tokenValue) => cardText.includes(tokenValue));
      const primaryButtons = await card.locator('[data-testid="shift-card-primary-action"] button').allTextContents();
      pageResult.pass = pageResult.companyKind === role.toUpperCase()
        && pageResult.forbiddenTokens.length === 0
        && primaryButtons.length === 1
        && primaryButtons[0] === "Operasyon Kaydı";
    } else {
      pageResult.pass = role === "organization";
    }
    pageResult.pass = pageResult.pass
      && pageResult.consoleErrors.length === 0
      && pageResult.pageErrors.length === 0
      && pageResult.unexpected500 === 0
      && pageResult.unexpected429 === 0;
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  }
  result.companyKindGuards.push(pageResult);
  result.consoleErrorCount += pageResult.consoleErrors.length;
  result.pageErrorCount += pageResult.pageErrors.length;
  result.unexpected500 += pageResult.unexpected500;
  result.unexpected429 += pageResult.unexpected429;
}

function buildMarkdown(report) {
  const lines = [
    "# Post-#3 Commercial Shift Card UX Closure",
    "",
    `- Web: \`${report.webBaseUrl}\``,
    `- API: \`${report.apiBaseUrl}\``,
    `- Shift card scenarios: \`${report.shiftCards.filter((item) => item.pass).length}/${report.shiftCards.length}\` PASS`,
    `- Commercial entry scenarios: \`${report.commercialEntries.filter((item) => item.pass).length}/${report.commercialEntries.length}\` PASS`,
    `- SCHOOL/ORGANIZATION guards: \`${report.companyKindGuards.filter((item) => item.pass).length}/${report.companyKindGuards.length}\` PASS`,
    `- consoleErrorCount: \`${report.consoleErrorCount}\``,
    `- pageErrorCount: \`${report.pageErrorCount}\``,
    `- unexpected500: \`${report.unexpected500}\``,
    `- unexpected429: \`${report.unexpected429}\``,
    `- Result: **${report.pass ? "PASS" : "FAIL"}**`,
    "",
    "## Screenshots",
    ...[...report.shiftCards, ...report.commercialEntries].flatMap((item) => item.screenshots || []).map((item) => `- \`${item}\``),
    "",
    "## Safety",
    "- Read-only browser acceptance; no shift, agreement, offer, payment, or finance mutation.",
    "- SCHOOL and ORGANIZATION use companyKind-specific restricted card presentation.",
    "- No new backend lifecycle or financial calculation was introduced.",
  ];
  return `${lines.join("\n")}\n`;
}

async function main() {
  await ensureDir(screenshotRoot);
  const originalCwd = process.cwd();
  const chromiumWorkingDir = await fs.mkdtemp(path.join(os.tmpdir(), "ux-commercial-shift-card-"));
  process.chdir(chromiumWorkingDir);
  const browser = await chromium.launch({
    headless: String(process.env.HEADLESS ?? "true").toLowerCase() !== "false",
    env: { ...process.env, CHROME_LOG_FILE: chromiumDebugLogPath },
  });
  const report = {
    generatedAt: new Date().toISOString(),
    webBaseUrl: WEB_BASE_URL,
    apiBaseUrl: API_BASE_URL,
    shiftCards: [],
    commercialEntries: [],
    companyKindGuards: [],
    consoleErrorCount: 0,
    pageErrorCount: 0,
    unexpected500: 0,
    unexpected429: 0,
    pass: false,
  };

  try {
    const company = await login("company");
    const room = await login("room");
    const school = await login("school");
    const organization = await login("organization");
    report.browser = { version: browser.version(), viewportLocale: "tr-TR / Europe/Istanbul" };

    await runShiftCardScenario({ role: "company", token: company.token, viewport: { width: 1440, height: 900 }, browser, result: report });
    await runShiftCardScenario({ role: "room", token: room.token, viewport: { width: 1440, height: 900 }, browser, result: report });
    await runShiftCardScenario({ role: "company", token: company.token, viewport: { width: 390, height: 844 }, browser, result: report });
    await runShiftCardScenario({ role: "room", token: room.token, viewport: { width: 390, height: 844 }, browser, result: report });
    await runCommercialEntryScenario({ role: "company", token: company.token, browser, result: report });
    await runCommercialEntryScenario({ role: "room", token: room.token, browser, result: report });
    await runCompanyKindGuard({ role: "school", token: school.token, browser, result: report });
    await runCompanyKindGuard({ role: "organization", token: organization.token, browser, result: report });
  } finally {
    await browser.close().catch(() => {});
    process.chdir(originalCwd);
    await fs.rm(chromiumWorkingDir, { recursive: true, force: true }).catch(() => {});
  }

  report.browser = report.browser || { version: "unknown", viewportLocale: "tr-TR / Europe/Istanbul" };
  report.pass = report.shiftCards.length === 0 ? false : report.shiftCards.every((item) => item.pass)
    && report.commercialEntries.every((item) => item.pass)
    && report.companyKindGuards.every((item) => item.pass)
    && report.consoleErrorCount === 0
    && report.pageErrorCount === 0
    && report.unexpected500 === 0
    && report.unexpected429 === 0;
  await fs.writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await fs.writeFile(reportMdPath, buildMarkdown(report), "utf8");
  console.log(JSON.stringify({
    pass: report.pass,
    shiftCards: report.shiftCards.map((item) => ({ role: item.role, viewport: item.viewport, pass: item.pass, screenshots: item.screenshots })),
    commercialEntries: report.commercialEntries.map((item) => ({ role: item.role, pass: item.pass, screenshots: item.screenshots })),
    companyKindGuards: report.companyKindGuards.map((item) => ({ role: item.role, pass: item.pass, cards: item.cards, companyKind: item.companyKind, forbiddenTokens: item.forbiddenTokens })),
    consoleErrorCount: report.consoleErrorCount,
    pageErrorCount: report.pageErrorCount,
    unexpected500: report.unexpected500,
    unexpected429: report.unexpected429,
    report: path.relative(repoRoot, reportJsonPath).replace(/\\/g, "/"),
  }, null, 2));
  if (!report.pass) process.exitCode = 1;
}

await main();
