#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "../..");
const WEB_BASE_URL = (process.env.WEB_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const API_BASE_URL = (process.env.API_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const HEADLESS = String(process.env.HEADLESS ?? "true").toLowerCase() !== "false";
const artifactRoot = path.join(repoRoot, "backend", "artifacts", "browser-smoke", "pre-18-premium-ux-live-defect-corrective");
const screenshotRoot = path.join(artifactRoot, "screenshots");
const reportPath = path.join(artifactRoot, "report.json");
const rawSeamToken = "SEAM_PROVEN_DEFERRED_TO_#20";

const roomViewports = [
  { name: "desktop", width: 1440, height: 900, isMobile: false },
  { name: "tablet", width: 1024, height: 900, isMobile: false },
  { name: "mobile", width: 390, height: 844, isMobile: true },
];

const report = {
  source: "REAL_PLAYWRIGHT_RENDERED_BROWSER",
  generatedAt: new Date().toISOString(),
  webBaseUrl: WEB_BASE_URL,
  apiBaseUrl: API_BASE_URL,
  headless: HEADLESS,
  browserEngine: "",
  results: [],
  consoleErrors: [],
  pageErrors: [],
  http500: [],
};

function record(name, ok, detail = "") {
  report.results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
}

async function login(identifier, deviceId) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier, password: "demo123", deviceId }),
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok && body.token) return body.token;
    if (response.status === 429 && attempt < 3) {
      const retryAfterMs = Math.max(1000, Number(response.headers.get("retry-after") || body.retryAfterSec || attempt + 1) * 1000);
      await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
      continue;
    }
    throw new Error(`login failed for ${identifier}: HTTP ${response.status}`);
  }
  throw new Error(`login failed for ${identifier}`);
}

function observe(page, label) {
  page.on("console", (message) => {
    if (message.type() === "error") report.consoleErrors.push({ label, text: message.text() });
  });
  page.on("pageerror", (error) => report.pageErrors.push({ label, text: error.message }));
  page.on("response", (response) => {
    if (response.status() >= 500) report.http500.push({ label, status: response.status(), url: response.url() });
  });
}

async function authenticatedPage(browser, { label, token, viewport }) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: Boolean(viewport.isMobile),
    hasTouch: Boolean(viewport.isMobile),
  });
  const page = await context.newPage();
  observe(page, label);
  await page.addInitScript((value) => localStorage.setItem("token", value), token);
  return { context, page };
}

async function openRoomComparison(page) {
  await page.goto(`${WEB_BASE_URL}/#/room/financial-operations`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.getByText("Teklif ve Kârlılık", { exact: true }).waitFor({ state: "visible", timeout: 45000 });
  const secondarySummary = page.locator("summary.panelSectionTitle").filter({ hasText: /^Karşılaştırma, senaryo ve dışa aktarım$/ });
  await secondarySummary.waitFor({ state: "visible", timeout: 30000 });
  const secondary = secondarySummary.locator("xpath=..");
  if (!(await secondary.evaluate((node) => node.open))) await secondarySummary.click();
  const workspace = page.getByTestId("cost-scenario-workspace");
  await workspace.waitFor({ state: "visible", timeout: 30000 });
  const passengerCount = page.getByTestId("scenario-input-passengerCount");
  await passengerCount.waitFor({ state: "visible", timeout: 30000 });
  const passengerValue = Number(await passengerCount.inputValue()) || 0;
  await passengerCount.fill(String(passengerValue + 1));
  const calculate = page.getByTestId("cost-scenario-calculate");
  await calculate.waitFor({ state: "visible", timeout: 30000 });
  await page.waitForFunction((button) => !button.disabled, await calculate.elementHandle(), { timeout: 30000 });
  const calculateAccessible = await calculate.isVisible() && await calculate.isEnabled();
  await calculate.click();
  const evidence = page.getByTestId("scenario-forecast-evidence");
  await evidence.waitFor({ state: "visible", timeout: 30000 });
  const assignmentLabel = evidence.getByText("Atama sınırı", { exact: true });
  await assignmentLabel.waitFor({ state: "visible", timeout: 30000 });
  return { calculateAccessible, evidence, assignmentLabel, workspace };
}

async function inspectRoomViewport(browser, token, viewport) {
  const label = `ROOM financial operations ${viewport.name}`;
  const { context, page } = await authenticatedPage(browser, { label, token, viewport });
  try {
    const { calculateAccessible, evidence, assignmentLabel, workspace } = await openRoomComparison(page);
    const visibleText = await page.locator("body").innerText();
    const rawTokenCount = (visibleText.match(new RegExp(rawSeamToken, "g")) || []).length;
    const assignmentRow = assignmentLabel.locator("..");
    const layout = await assignmentRow.evaluate((node) => {
      const row = node.getBoundingClientRect();
      const value = node.querySelector("b")?.getBoundingClientRect() || null;
      return {
        documentScrollWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        rowRight: row.right,
        valueRight: value?.right ?? null,
        valueScrollWidth: node.querySelector("b")?.scrollWidth ?? 0,
        valueClientWidth: node.querySelector("b")?.clientWidth ?? 0,
      };
    });
    const embeddedLayout = await workspace.evaluate((node) => {
      const section = node.closest("section");
      const card = section?.querySelector(":scope > .card") || null;
      const viewportWidth = document.documentElement.clientWidth;
      const box = (element) => {
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth };
      };
      return { viewportWidth, section: box(section), card: box(card), workspace: box(node) };
    });
    const screenshotPath = path.join(screenshotRoot, `room-financial-operations-${viewport.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    record(`${label}: raw internal seam token is absent`, rawTokenCount === 0, `visible=${rawTokenCount}`);
    record(`${label}: comparison status is user-facing Turkish`, !visibleText.includes(rawSeamToken) && /Atama sınırı\s+Bu senaryoda atama önerisi sunulmaz/.test(visibleText), "Atama sınırı value");
    record(`${label}: comparison row stays inside its rendered container`, layout.valueRight !== null && layout.valueRight <= Math.min(layout.rowRight, layout.viewportWidth) + 0.5, JSON.stringify(layout));
    record(`${label}: embedded scenario wrapper stays inside the detail viewport`, [embeddedLayout.section, embeddedLayout.card, embeddedLayout.workspace].every((box) => box && box.left >= -0.5 && box.right <= embeddedLayout.viewportWidth + 0.5 && box.scrollWidth <= box.clientWidth), JSON.stringify(embeddedLayout));
    record(`${label}: comparison region has no horizontal overflow`, layout.documentScrollWidth <= layout.viewportWidth, JSON.stringify(layout));
    record(`${label}: scenario action remains accessible`, calculateAccessible);
  } finally {
    await context.close();
  }
}

async function inspectCommercialSummary(browser, token) {
  const label = "SUPER_ADMIN commercial core desktop";
  const { context, page } = await authenticatedPage(browser, {
    label,
    token,
    viewport: { width: 1440, height: 900, isMobile: false },
  });
  try {
    await page.goto(`${WEB_BASE_URL}/#/superadmin/commercial-core`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.getByText("Ticari Akış Özeti", { exact: true }).waitFor({ state: "visible", timeout: 30000 });
    await page.waitForFunction(() => {
      const labelNode = [...document.querySelectorAll(".panelMeta")].find((node) => node.textContent?.trim() === "Önizleme");
      const value = labelNode?.parentElement?.querySelector(".panelStatValue")?.textContent?.trim() || "";
      return value && value !== "Bekliyor";
    }, undefined, { timeout: 30000 });
    const firstLayer = await page.evaluate(() => {
      const labelNode = [...document.querySelectorAll(".panelMeta")].find((node) => node.textContent?.trim() === "Önizleme");
      const tile = labelNode?.parentElement || null;
      const value = tile?.querySelector(".panelStatValue") || null;
      const tileRect = tile?.getBoundingClientRect() || null;
      return {
        found: Boolean(tile && value),
        valueText: value?.textContent?.trim() || "",
        height: tileRect?.height || 0,
        documentScrollWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      };
    });
    const previewTab = page.getByRole("tab", { name: "Kalite / Kanıt" });
    await previewTab.click();
    await page.getByText("Hakediş önizlemesi", { exact: true }).first().waitFor({ state: "visible", timeout: 30000 });
    await page.locator(".panelBody").filter({ hasText: /Ödeme başlatılmaz/ }).waitFor({ state: "visible", timeout: 30000 });
    const detailText = await page.locator("body").innerText();
    const screenshotPath = path.join(screenshotRoot, "superadmin-commercial-core-desktop.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });

    record(`${label}: first-layer preview value is the authoritative draft state`, firstLayer.valueText === "Taslak", JSON.stringify(firstLayer));
    record(`${label}: first-layer preview tile does not become an oversized body`, firstLayer.height > 0 && firstLayer.height <= 160, `height=${firstLayer.height}`);
    record(`${label}: long preview explanation remains in Hakediş önizleme details`, /Bu önizleme .+ taslak kayıtları gösterir\. Ödeme başlatılmaz\./.test(detailText), "detail surface");
    record(`${label}: no first-layer primary CTA competition`, await page.locator("button.primary:visible, .btn.primary:visible").count() <= 1);
    record(`${label}: no horizontal overflow`, firstLayer.documentScrollWidth <= firstLayer.viewportWidth, JSON.stringify(firstLayer));
  } finally {
    await context.close();
  }
}

async function main() {
  await fs.mkdir(screenshotRoot, { recursive: true });
  const browser = await chromium.launch({ headless: HEADLESS });
  report.browserEngine = `Chromium ${browser.version()}`;
  try {
    const roomToken = await login("room@demo.com", "pre18-ux-corrective-room");
    for (const viewport of roomViewports) await inspectRoomViewport(browser, roomToken, viewport);
    const superAdminToken = await login("superadmin@demo.com", "pre18-ux-corrective-superadmin");
    await inspectCommercialSummary(browser, superAdminToken);
  } finally {
    await browser.close();
  }

  record("browser console errors", report.consoleErrors.length === 0, JSON.stringify(report.consoleErrors.slice(0, 3)));
  record("browser page errors", report.pageErrors.length === 0, JSON.stringify(report.pageErrors.slice(0, 3)));
  record("browser HTTP 500 responses", report.http500.length === 0, JSON.stringify(report.http500.slice(0, 3)));
  report.pass = report.results.every((result) => result.ok);
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  if (!report.pass) process.exitCode = 1;
}

main().catch(async (error) => {
  report.results.push({ name: "focused browser corrective runner", ok: false, detail: error?.stack || String(error) });
  report.pass = false;
  await fs.mkdir(artifactRoot, { recursive: true });
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.error(error?.stack || error);
  process.exitCode = 1;
});
