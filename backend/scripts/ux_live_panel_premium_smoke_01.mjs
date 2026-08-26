#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { prisma } from "../src/prisma.js";
import { PREMIUM_SMOKE_COVERAGE_SOURCES, buildPremiumSmokeEvidenceSourceFiles, buildSmokeEvidenceIdentity } from "./lib/guardSmokeEvidence.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const WEB_BASE_URL = (process.env.WEB_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const API_BASE_URL = (process.env.API_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const HEADLESS = String(process.env.HEADLESS ?? "true").toLowerCase() !== "false";
const SLOW_MO = Number(process.env.SLOW_MO || 0) || 0;

const artifactRoot = path.join(
  repoRoot,
  "backend",
  "artifacts",
  "browser-smoke",
  "UX_LIVE_PANEL_PREMIUM_SMOKE_01"
);
const screenshotRoot = path.join(artifactRoot, "screenshots");
const reportJsonPath = path.join(artifactRoot, "report.json");
const reportMdPath = path.join(artifactRoot, "report.md");
const chromiumDebugLogPath = path.join(artifactRoot, "chromium-debug.log");
let chromiumWorkingDir = null;

const SMOKE_SCHEMA_PATH = "backend/prisma/schema.prisma";
const SMOKE_EVIDENCE_SOURCE_FILES = buildPremiumSmokeEvidenceSourceFiles();

async function relocateRepoDebugLogIfPresent() {
  const debugLogPath = chromiumWorkingDir ? path.join(chromiumWorkingDir, "debug.log") : path.join(repoRoot, "debug.log");
  try {
    await fs.access(debugLogPath);
  } catch {
    return;
  }

  await ensureDir(artifactRoot);
  await fs.rm(chromiumDebugLogPath, { force: true });
  await fs.rename(debugLogPath, chromiumDebugLogPath);
}

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  { name: "mobile", width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
];

const DEMO_USERS = {
  superadmin: { identifier: "superadmin@demo.com", password: "demo123" },
  room: { identifier: "room@demo.com", password: "demo123" },
  company: { identifier: "company@demo.com", password: "demo123" },
  school: { identifier: "school@demo.com", password: "demo123" },
  organization: { identifier: "organization@demo.com", password: "demo123" },
  driver: { identifier: "driver@demo.com", password: "demo123" },
  personel: { identifier: "personel@demo.com", password: "demo123" },
  parent: { identifier: "parent@demo.com", password: "demo123" },
};

const ROUTE_GROUPS = [
  {
    role: "public",
    auth: false,
    routes: [
      { route: "/#/landing", label: "Public Landing", baseline: "PASS", kind: "publicLanding" },
      { route: "/#/public/landing", label: "Public Landing Alias", baseline: "PASS", kind: "publicLanding" },
      { route: "/#/", label: "Login Root", baseline: "PASS", kind: "loginRoot" },
    ],
  },
  {
    role: "superadmin",
    auth: true,
    routes: [
      { route: "/#/superadmin", label: "Super Admin Overview", baseline: "PASS", kind: "overview" },
      { route: "/#/superadmin/onboarding-review", label: "Super Admin Onboarding Review", baseline: "PASS", kind: "reviewQueue" },
      { route: "/#/superadmin/operations", label: "Super Admin Operations", baseline: "PASS", kind: "ops" },
      { route: "/#/superadmin/audit", label: "Super Admin Audit", baseline: "PASS", kind: "audit" },
      { route: "/#/superadmin/trust-quality", label: "Super Admin Trust Quality", baseline: "PASS", kind: "quality" },
      { route: "/#/superadmin/commercial-core", label: "Super Admin Commercial Core", baseline: "UX-FIX", kind: "commercial" },
    ],
  },
  {
    role: "room",
    auth: true,
    routes: [
      { route: "/#/room/shifts", label: "Room Shifts", baseline: "UX-FIX", kind: "dispatch" },
      { route: "/#/room/agreements", label: "Room Agreements", baseline: "PASS", kind: "agreementPreview" },
      { route: "/#/room/commercial-flow", label: "Room Commercial Flow", baseline: "UX-FIX", kind: "commercialFlow" },
      { route: "/#/room/operation-health", label: "Room Operation Health", baseline: "PASS", kind: "routePreview" },
      { route: "/#/room/live", label: "Room Live", baseline: "PASS", kind: "liveMap" },
      { route: "/#/room/map", label: "Room Map", baseline: "PASS", kind: "liveMap" },
      { route: "/#/room/vehicles", label: "Room Vehicles", baseline: "PASS", kind: "density" },
      { route: "/#/room/drivers", label: "Room Drivers", baseline: "PASS", kind: "density" },
    ],
  },
  {
    role: "company",
    auth: true,
    routes: [
      { route: "/#/company", label: "Company Overview", baseline: "PASS", kind: "overview" },
      { route: "/#/company/shifts", label: "Company Shifts", baseline: "UX-FIX", kind: "convertToAgreement" },
      { route: "/#/company/agreements", label: "Company Agreements", baseline: "PASS", kind: "agreementPreview" },
      { route: "/#/company/commercial-flow", label: "Company Commercial Flow", baseline: "UX-FIX", kind: "commercialFlow" },
      { route: "/#/company/operations", label: "Company Operations", baseline: "PASS", kind: "routePreview" },
      { route: "/#/company/map", label: "Company Map", baseline: "PASS", kind: "liveMap" },
    ],
  },
  {
    role: "school",
    auth: true,
    routes: [
      { route: "/#/school", label: "School Overview", baseline: "PASS", kind: "overview" },
      { route: "/#/school/operations", label: "School Operations", baseline: "PASS", kind: "ops" },
      { route: "/#/school/commercial-flow", label: "School Commercial Flow", baseline: "UX-FIX", kind: "commercialFlow" },
      { route: "/#/school/shifts", label: "School Shifts", baseline: "PASS", kind: "shifts" },
      { route: "/#/school/agreements", label: "School Agreements", baseline: "PASS", kind: "agreementPreview" },
    ],
  },
  {
    role: "organization",
    auth: true,
    routes: [
      { route: "/#/organization", label: "Organization Overview", baseline: "PASS", kind: "overview" },
      { route: "/#/organization/operations", label: "Organization Operations", baseline: "PASS", kind: "ops" },
      { route: "/#/organization/commercial-flow", label: "Organization Commercial Flow", baseline: "UX-FIX", kind: "commercialFlow" },
      { route: "/#/organization/shifts", label: "Organization Shifts", baseline: "PASS", kind: "shifts" },
      { route: "/#/organization/agreements", label: "Organization Agreements", baseline: "PASS", kind: "agreementPreview" },
    ],
  },
  {
    role: "driver",
    auth: true,
    routes: [
      { route: "/#/driver/today", label: "Driver Today", baseline: "PASS", kind: "driverToday" },
      { route: "/#/driver/route", label: "Driver Route", baseline: "PASS", kind: "driverRoute" },
      { route: "/#/driver/map", label: "Driver Map", baseline: "PASS", kind: "liveMap" },
      { route: "/#/driver/checkin", label: "Driver Check-in", baseline: "PASS", kind: "driverCheckin" },
    ],
  },
  {
    role: "personel",
    auth: true,
    routes: [
      { route: "/#/personel/live", label: "Personel Live", baseline: "PASS", kind: "liveMap" },
      { route: "/#/personel/my", label: "Personel My Ride", baseline: "PASS", kind: "personelMy" },
    ],
  },
  {
    role: "parent",
    auth: true,
    routes: [
      { route: "/#/parent/live", label: "Parent Live", baseline: "PASS", kind: "liveMap" },
      { route: "/#/parent", label: "Parent Overview", baseline: "PASS", kind: "parentOverview" },
    ],
  },
];

const STATUS_RANK = {
  PASS: 0,
  "PASS-": 1,
  "UX-FIX": 2,
  BLOCKER: 3,
  "AUTH-BLOCKED": 4,
  "NOT-FOUND": 5,
};

const TECH_TERMS = [
  "payload",
  "token",
  "hash",
  "debug",
  "internal",
  "enum",
  "raw",
  "json",
  "technical",
  "stale",
  "null",
  "undefined",
  "previewonly",
  "payablenow",
  "caninvoice",
  "cancollect",
  "sourceconfidence",
  "operationproof",
];

const BAD_AI_PHRASES = [
  "chatgpt",
  "autopilot",
  "her seyi sefer abi'ye birak",
  "her şeyi sefer abi'ye bırak",
  "ai otomatik karar verir",
  "ai operasyonu yonetir",
  "ai operasyonu yönetir",
  "otomatik onay",
];

function normalize(text) {
  return String(text || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function makeSlug(parts) {
  return normalize(parts.join(" "))
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function bumpStatus(current, candidate) {
  const currentRank = STATUS_RANK[current] ?? 0;
  const candidateRank = STATUS_RANK[candidate] ?? 0;
  return candidateRank > currentRank ? candidate : current;
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function resolveDriverDeviceId(email = "driver@demo.com") {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true, deviceId: true },
  });
  if (!user || user.role !== "DRIVER") {
    throw new Error(`Driver user not found for ${email}`);
  }
  return String(user.deviceId || "").trim() || "ux-live-panel-premium-driver";
}

async function loginRole(role) {
  if (!DEMO_USERS[role]) return { role, token: null, loginInfo: null, error: null };

  const credentials = DEMO_USERS[role];
  const body = {
    identifier: credentials.identifier,
    password: credentials.password,
    deviceId: role === "driver"
      ? await resolveDriverDeviceId(credentials.identifier)
      : `ux-live-panel-premium-${role}`,
    deviceName: "UX Live Panel Premium Smoke",
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const rawText = await response.text();
    let loginInfo = null;
    try {
      loginInfo = rawText ? JSON.parse(rawText) : null;
    } catch {
      loginInfo = { rawText };
    }

    if (!response.ok || !loginInfo?.token) {
      return {
        role,
        token: null,
        loginInfo,
        error: `LOGIN_FAIL ${role} ${response.status}${rawText ? ` ${rawText.slice(0, 180)}` : ""}`,
      };
    }

    return { role, token: loginInfo.token, loginInfo, error: null };
  } catch (error) {
    return { role, token: null, loginInfo: null, error: `LOGIN_EXCEPTION ${role} ${error?.message || String(error)}` };
  }
}

async function screenshot(page, scenario, viewportName, stage) {
  const safeRole = makeSlug([scenario.role]);
  const safeLabel = makeSlug([scenario.label]);
  const fileName = `${safeRole}-${safeLabel}-${viewportName}-${stage}.png`;
  const relPath = path.join("screenshots", viewportName, fileName).replace(/\\/g, "/");
  const absPath = path.join(screenshotRoot, viewportName, fileName);
  await ensureDir(path.dirname(absPath));
  await page.screenshot({ path: absPath, fullPage: false });
  return relPath;
}

async function getText(page) {
  try {
    return await page.locator("body").innerText({ timeout: 8000 });
  } catch {
    return "";
  }
}

async function getHeadings(page) {
  try {
    return (await page.locator("h1, h2, h3").allTextContents()).map((item) => item.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

async function getButtons(page) {
  try {
    const items = await page.locator("button, a[role='button']").allTextContents();
    return items.map((item) => item.trim()).filter(Boolean).slice(0, 20);
  } catch {
    return [];
  }
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function termMatchesVisibleText(haystack, term) {
  const pattern = new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(term)}(?:$|[^a-z0-9])`);
  return pattern.test(haystack);
}

async function getVisibleText(page) {
  try {
    return await page.evaluate(() => {
      const blockedTags = new Set(["script", "style", "template", "noscript"]);
      const isVisibleElement = (el) => {
        for (let node = el; node && node.nodeType === Node.ELEMENT_NODE; node = node.parentElement) {
          const tag = String(node.tagName || "").toLowerCase();
          if (blockedTags.has(tag)) return false;
          if (node.hidden || node.getAttribute("aria-hidden") === "true") return false;
          const style = getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          if (
            style.display === "none" ||
            style.visibility === "hidden" ||
            Number.parseFloat(style.opacity || "1") === 0 ||
            rect.width <= 0 ||
            rect.height <= 0
          ) {
            return false;
          }
        }
        return true;
      };

      const root = document.body || document.documentElement;
      if (!root) return "";
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const parts = [];
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const text = String(node.nodeValue || "").replace(/\s+/g, " ").trim();
        if (!text) continue;
        if (!isVisibleElement(node.parentElement)) continue;
        parts.push(text);
      }
      return parts.join(" ");
    }).catch(() => "");
  } catch {
    return "";
  }
}

async function getVisibleSurfaceText(page) {
  const text = await getVisibleText(page);
  const controlValues = await page.locator("input, textarea, select").evaluateAll((elements) => {
    const isVisible = (element) => {
      for (let node = element; node && node.nodeType === Node.ELEMENT_NODE; node = node.parentElement) {
        if (node.hidden || node.getAttribute("aria-hidden") === "true") return false;
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        if (style.display === "none" || style.visibility === "hidden" || Number.parseFloat(style.opacity || "1") === 0 || rect.width <= 0 || rect.height <= 0) {
          return false;
        }
      }
      return true;
    };
    return elements
      .filter(isVisible)
      .flatMap((element) => [element.value, element.placeholder].map((value) => String(value || "").trim()).filter(Boolean));
  }).catch(() => []);
  return [text, ...controlValues].filter(Boolean).join(" ");
}

async function getDispatchSemanticState(page, viewportName) {
  try {
    return await page.evaluate((vp) => {
      const isVisibleElement = (el) => {
        for (let node = el; node && node.nodeType === Node.ELEMENT_NODE; node = node.parentElement) {
          const tag = String(node.tagName || "").toLowerCase();
          if (["script", "style", "template", "noscript"].includes(tag)) return false;
          if (node.hidden || node.getAttribute("aria-hidden") === "true") return false;
          const style = getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          if (
            style.display === "none" ||
            style.visibility === "hidden" ||
            Number.parseFloat(style.opacity || "1") === 0 ||
            rect.width <= 0 ||
            rect.height <= 0
          ) {
            return false;
          }
        }
        return true;
      };
      const countVisible = (selector) =>
        Array.from(document.querySelectorAll(selector)).filter((el) => isVisibleElement(el)).length;
      const selectedCount = vp === "desktop"
        ? countVisible("tbody tr")
        : countVisible("article.shiftCard, .shiftCard");
      const applyButton = Array.from(document.querySelectorAll("button")).find((btn) => {
        if (!isVisibleElement(btn)) return false;
        return /Önizlemeyi Uygula: Böl & Onayla/i.test(String(btn.textContent || "").trim());
      }) || null;
      return {
        selectedCount,
        applyVisible: Boolean(applyButton),
        applyEnabled: Boolean(applyButton && !applyButton.disabled),
      };
    }, viewportName);
  } catch {
    return { selectedCount: 0, applyVisible: false, applyEnabled: false };
  }
}

async function waitForDispatchSemanticReadiness(page, viewportName, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  let lastState = { selectedCount: 0, applyVisible: false, applyEnabled: false };
  while (Date.now() < deadline) {
    lastState = await getDispatchSemanticState(page, viewportName);
    if (lastState.selectedCount > 0 && lastState.applyVisible) {
      return lastState;
    }
    await page.waitForTimeout(250);
  }
  return lastState;
}

async function isVisible(page, role, name) {
  try {
    return await page.getByRole(role, { name }).first().isVisible({ timeout: 3000 });
  } catch {
    return false;
  }
}

async function clickIfVisible(page, role, name) {
  const locator = page.getByRole(role, { name }).first();
  try {
    if (await locator.isVisible({ timeout: 3000 })) {
      await locator.click({ timeout: 5000 });
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

async function runRoomFinancialOperationsAdvancedAssertion(context, viewportName) {
  const page = await context.newPage();
  const result = {
    scope: "ROOM",
    route: "/#/room/financial-operations",
    viewport: viewportName,
    passed: false,
    detailsOpened: false,
    inputDetailsOpened: false,
    rawFieldKeysVisible: [],
    rawFieldKeyVisibleCount: 0,
    rawInternalCodesVisible: [],
    rawInternalCodeVisibleCount: 0,
    minorTokenVisibleCount: 0,
    bpsTokenVisibleCount: 0,
    humanLabelsVisible: [],
    manualOverrideHintVisible: false,
    consoleErrors: [],
    pageErrors: [],
    notes: [],
  };
  const rawFieldKeys = ["targetContributionBps", "riskReserveBps"];
  const humanLabels = [
    "Hedef katkı oranı (%)",
    "Risk payı (%)",
    "Manuel maliyet tabanı (₺)",
    "Yakıt birim fiyatı (₺/L)",
    "Sürücü temel maliyeti (₺/vardiya)",
    "Km başı bakım maliyeti (₺/km)",
    "Aylık araç kira maliyeti (₺/ay)",
  ];

  page.on("console", (msg) => {
    if (msg.type() === "error") result.consoleErrors.push(msg.text());
  });
  page.on("pageerror", (error) => {
    result.pageErrors.push(error?.message || String(error));
  });

  try {
    await page.goto(`${WEB_BASE_URL}${result.route}`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1300);

    const advancedDetails = page.locator("details").filter({ hasText: "Gelişmiş bilgiler" }).first();
    const summary = advancedDetails.locator("summary").first();
    if (!(await summary.isVisible({ timeout: 5000 }))) {
      throw new Error("ROOM advanced details summary is not visible");
    }
    if (!(await advancedDetails.evaluate((element) => Boolean(element.open)))) {
      await summary.click({ timeout: 5000 });
    }
    await page.waitForTimeout(250);
    result.detailsOpened = await advancedDetails.evaluate((element) => Boolean(element.open));

    const inputSummary = page.locator("summary").filter({ hasText: "Maliyet girdileri" }).first();
    const offerSummary = page.locator("summary").filter({ hasText: "Teklif detayları" }).first();
    if (await offerSummary.isVisible({ timeout: 5000 })) {
      const offerDetails = offerSummary.locator("xpath=..");
      if (!(await offerDetails.evaluate((element) => Boolean(element.open)))) {
        await offerSummary.click({ timeout: 5000 });
        await page.waitForTimeout(200);
      }
    }
    if (!(await inputSummary.isVisible({ timeout: 5000 }))) {
      throw new Error("ROOM cost inputs summary is not visible");
    }
    const inputDetails = inputSummary.locator("xpath=..");
    if (!(await inputDetails.evaluate((element) => Boolean(element.open)))) {
      await inputSummary.click({ timeout: 5000 });
    }
    await page.waitForTimeout(250);
    result.inputDetailsOpened = await inputDetails.evaluate((element) => Boolean(element.open));

    const visibleText = await getVisibleSurfaceText(page);
    result.rawFieldKeysVisible = rawFieldKeys.filter((key) => visibleText.includes(key));
    result.rawFieldKeyVisibleCount = result.rawFieldKeysVisible.length;
    result.rawInternalCodesVisible = ["targetContributionBps", "riskReserveBps", "fuelUnitPriceMinor", "TRY", "minor", "bps"].filter((token) => visibleText.includes(token));
    result.rawInternalCodeVisibleCount = result.rawInternalCodesVisible.length;
    result.minorTokenVisibleCount = (visibleText.match(/\bminor\b/gi) || []).length;
    result.bpsTokenVisibleCount = (visibleText.match(/\bbps\b/gi) || []).length;
    result.manualOverrideHintVisible = /manuel düzeltme/i.test(visibleText);
    result.humanLabelsVisible = humanLabels.filter((label) => visibleText.includes(label));
    if (result.rawFieldKeyVisibleCount > 0) {
      result.notes.push(`Ham alan adı görünür: ${result.rawFieldKeysVisible.join(", ")}.`);
    }
    if (result.humanLabelsVisible.length !== humanLabels.length) {
      result.notes.push(`Beklenen kullanıcı etiketleri eksik: ${humanLabels.filter((label) => !result.humanLabelsVisible.includes(label)).join(", ")}.`);
    }
    result.passed = result.detailsOpened
      && result.inputDetailsOpened
      && result.rawFieldKeyVisibleCount === 0
      && result.rawInternalCodeVisibleCount === 0
      && result.minorTokenVisibleCount === 0
      && result.bpsTokenVisibleCount === 0
      && result.manualOverrideHintVisible
      && result.humanLabelsVisible.length === humanLabels.length
      && result.consoleErrors.length === 0
      && result.pageErrors.length === 0;
  } catch (error) {
    result.notes.push(error?.message || String(error));
  }

  await page.close().catch(() => {});
  return result;
}

async function runCompanyFinancialOperationsAdvancedAssertion(context, viewportName) {
  const page = await context.newPage();
  const result = {
    scope: "COMPANY",
    route: "/#/company/financial-operations",
    viewport: viewportName,
    passed: false,
    detailsOpened: false,
    advancedDetailsOpened: false,
    rawFieldKeysVisible: [],
    rawFieldKeyVisibleCount: 0,
    rawInternalCodesVisible: [],
    rawInternalCodeVisibleCount: 0,
    minorTokenVisibleCount: 0,
    bpsTokenVisibleCount: 0,
    humanLabelsVisible: [],
    systemFieldInputLabels: [],
    consoleErrors: [],
    pageErrors: [],
    notes: [],
  };
  const rawFieldKeys = [
    "budgetPlanId",
    "budgetPlanVersion",
    "budgetAmountMinor",
    "periodStart",
    "periodEnd",
    "budgetSource",
    "budgetApprovalState",
    "warningThresholdBps",
    "currencyCode",
  ];
  const rawInternalCodes = ["draft_budget", "draft", "TRY", "DRAFT_BUDGET", "APPROVED_BUDGET"];
  const humanLabels = ["Bütçe ayrıntıları", "Bütçe tutarı", "Başlangıç", "Bitiş", "Para birimi", "Bütçe kaynağı", "Onay durumu", "Uyarı eşiği"];

  page.on("console", (msg) => {
    if (msg.type() === "error") result.consoleErrors.push(msg.text());
  });
  page.on("pageerror", (error) => {
    result.pageErrors.push(error?.message || String(error));
  });

  try {
    await page.goto(`${WEB_BASE_URL}${result.route}`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1300);

    const budgetSummary = page.locator("summary").filter({ hasText: "Bütçe detayları" }).first();
    if (!(await budgetSummary.isVisible({ timeout: 5000 }))) {
      throw new Error("COMPANY budget details summary is not visible");
    }
    const budgetDetails = budgetSummary.locator("xpath=..");
    if (!(await budgetDetails.evaluate((element) => Boolean(element.open)))) {
      await budgetSummary.click({ timeout: 5000 });
    }
    await page.waitForTimeout(200);
    result.detailsOpened = await budgetDetails.evaluate((element) => Boolean(element.open));

    const advancedSummary = page.locator("summary").filter({ hasText: "Bütçe ayrıntıları" }).first();
    if (!(await advancedSummary.isVisible({ timeout: 5000 }))) {
      throw new Error("COMPANY budget advanced summary is not visible");
    }
    const advancedDetails = advancedSummary.locator("xpath=..");
    if (!(await advancedDetails.evaluate((element) => Boolean(element.open)))) {
      await advancedSummary.click({ timeout: 5000 });
    }
    await page.waitForTimeout(250);
    result.advancedDetailsOpened = await advancedDetails.evaluate((element) => Boolean(element.open));

    const visibleText = await getVisibleSurfaceText(page);
    result.rawFieldKeysVisible = rawFieldKeys.filter((key) => visibleText.includes(key));
    result.rawFieldKeyVisibleCount = result.rawFieldKeysVisible.length;
    result.rawInternalCodesVisible = rawInternalCodes.filter((token) => visibleText.includes(token));
    result.rawInternalCodeVisibleCount = result.rawInternalCodesVisible.length;
    result.minorTokenVisibleCount = (visibleText.match(/\bminor\b/gi) || []).length;
    result.bpsTokenVisibleCount = (visibleText.match(/\bbps\b/gi) || []).length;
    result.humanLabelsVisible = humanLabels.filter((label) => visibleText.includes(label));
    result.systemFieldInputLabels = await page.locator("label").evaluateAll((labels) => labels
      .filter((label) => /^(?:Para birimi|Bütçe kaynağı|Onay durumu)/i.test(String(label.textContent || "").trim()))
      .filter((label) => label.querySelector("input, textarea, select"))
      .map((label) => String(label.textContent || "").trim().split(/\s+/).slice(0, 4).join(" "))).catch(() => []);
    if (result.rawFieldKeyVisibleCount > 0) {
      result.notes.push(`Ham alan adı görünür: ${result.rawFieldKeysVisible.join(", ")}.`);
    }
    if (result.rawInternalCodeVisibleCount > 0) {
      result.notes.push(`Ham iç kod görünür: ${result.rawInternalCodesVisible.join(", ")}.`);
    }
    if (result.systemFieldInputLabels.length > 0) {
      result.notes.push(`Sistem alanı düzenlenebilir: ${result.systemFieldInputLabels.join(", ")}.`);
    }
    result.passed = result.detailsOpened
      && result.advancedDetailsOpened
      && result.rawFieldKeyVisibleCount === 0
      && result.rawInternalCodeVisibleCount === 0
      && result.minorTokenVisibleCount === 0
      && result.bpsTokenVisibleCount === 0
      && result.systemFieldInputLabels.length === 0
      && result.humanLabelsVisible.length === humanLabels.length
      && result.consoleErrors.length === 0
      && result.pageErrors.length === 0;
  } catch (error) {
    result.notes.push(error?.message || String(error));
  }

  await page.close().catch(() => {});
  return result;
}

function classifyTextSignals(text, status, notes) {
  const hay = normalize(text);
  const techHits = TECH_TERMS.filter((term) => termMatchesVisibleText(hay, term));
  const badAiHits = BAD_AI_PHRASES.filter((term) => termMatchesVisibleText(hay, term));

  if (badAiHits.length > 0) {
    status = bumpStatus(status, "BLOCKER");
    notes.push(`Yanlış AI konumlandırması: ${badAiHits[0]}.`);
  } else if (techHits.length > 0) {
    status = bumpStatus(status, "UX-FIX");
    notes.push(`Teknik kelimeler görünür metinde kaldı: ${techHits.slice(0, 3).join(", ")}.`);
  }

  return status;
}

function loginRootSeen(text) {
  const hay = normalize(text);
  return hay.includes("giris") && hay.includes("demo kullanicilar") && hay.includes("sifre");
}

function notFoundSeen(text) {
  const hay = normalize(text);
  return hay.includes("sayfa bulunamadi") || hay.includes("404") || hay.includes("not found") || hay.includes("bilinmeyen rota");
}

async function runScenario(page, scenario, viewportName, output) {
  const result = {
    role: scenario.role,
    label: scenario.label,
    route: scenario.route,
    viewport: viewportName,
    baseline: scenario.baseline,
    kind: scenario.kind,
    url: "",
    title: "",
    status: "PASS",
    notes: [],
    consoleErrors: [],
    pageErrors: [],
    screenshots: [],
    headings: [],
    buttons: [],
    textPreview: "",
    textLength: 0,
    scrollHeight: 0,
    checks: {},
  };

  page.on("console", (msg) => {
    if (msg.type() === "error") result.consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => {
    result.pageErrors.push(err?.message || String(err));
  });

  let navError = null;
  try {
    await page.goto(`${WEB_BASE_URL}${scenario.route}`, { waitUntil: "domcontentloaded", timeout: 25000 });
  } catch (error) {
    navError = error?.message || String(error);
  }

  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  // Give the backend a little more breathing room between consecutive route probes.
  await page.waitForTimeout(1300);

  result.url = page.url();
  result.title = await page.title().catch(() => "");
  let bodyText = await getVisibleText(page);
  result.textLength = bodyText.length;
  result.textPreview = bodyText.slice(0, 4000);
  result.headings = await getHeadings(page);
  result.buttons = await getButtons(page);
  result.scrollHeight = await page.evaluate(() => document.body?.scrollHeight || 0).catch(() => 0);

  if (navError) {
    result.notes.push(`Navigation warning: ${navError.split("\n")[0]}`);
  }

  if (!bodyText || notFoundSeen(bodyText)) {
    const seen = notFoundSeen(bodyText) ? "route not found" : "empty body";
    result.status = bumpStatus(result.status, "NOT-FOUND");
    result.notes.push(`Route görünümü yok: ${seen}.`);
    result.screenshots.push(await screenshot(page, scenario, viewportName, "initial"));
    output.push(result);
    return result;
  }

  const isLogin = loginRootSeen(bodyText);
  const routeIsPublic = scenario.role === "public";
  const launcherVisible = await isVisible(page, "button", /Sefer Abi/i);
  result.checks.seferAbiLauncherVisible = launcherVisible;

  if (routeIsPublic && isLogin && scenario.kind !== "loginRoot") {
    result.status = bumpStatus(result.status, "BLOCKER");
    result.notes.push("Public route login ekranına düştü.");
  }

  if (!routeIsPublic && isLogin) {
    result.status = bumpStatus(result.status, "AUTH-BLOCKED");
    result.notes.push("Kimlik doğrulama gerekli veya oturum geçersiz.");
  }

  if (scenario.kind === "loginRoot") {
    if (!isLogin) {
      result.status = bumpStatus(result.status, "BLOCKER");
      result.notes.push("Login root beklenen formu göstermiyor.");
    } else {
      result.notes.push("Login root görünür ve anlaşılır.");
    }
  }

  if (result.consoleErrors.length > 0) {
    result.notes.push(`Console error sayısı: ${result.consoleErrors.length}.`);
    result.status = bumpStatus(result.status, "UX-FIX");
  }
  if (result.pageErrors.length > 0) {
    result.notes.push(`Page error sayısı: ${result.pageErrors.length}.`);
    result.status = bumpStatus(result.status, "BLOCKER");
  }

  result.screenshots.push(await screenshot(page, scenario, viewportName, "before"));

  if (scenario.kind === "publicLanding") {
    const mainCtas = [
      /Demo talep et/i,
      /Canl[ıi] destekle g[öo]r[üu][sş]/i,
      /Servis ihtiyac[ıi]m[ıi] anlat/i,
      /Tedarik[çc]i olarak ba[sş]vur/i,
    ];
    const ctaHits = mainCtas.filter((rx) => result.buttons.some((text) => rx.test(text))).length;
    result.checks.publicCtaCount = ctaHits;
    if (ctaHits < 4) {
      result.notes.push(`Public CTA sayısı eksik: ${ctaHits}/4.`);
      result.status = bumpStatus(result.status, "UX-FIX");
    } else {
      result.notes.push("Public CTA hiyerarşisi görünür.");
    }
    if (normalize(bodyText).includes("sefer abi / operasyon copilot'u")) {
      result.notes.push("Sefer Abi yardımcı kartı secondary olarak görünür.");
    }
    const demoClicked = await clickIfVisible(page, "button", /Demo talep et/i);
    if (demoClicked) {
      await page.waitForTimeout(750);
      const modalText = await getText(page);
      const modalOk = /kvkk onayi|kvkk onayı|basvuru formu|başvuru formu|demo talebi/i.test(normalize(modalText));
      result.checks.demoModalOpened = modalOk;
      if (!modalOk) {
        result.status = bumpStatus(result.status, "UX-FIX");
        result.notes.push("Demo CTA modal açılmadı veya okunur değil.");
      } else {
        result.notes.push("Demo CTA lead modal açıyor.");
      }
      result.screenshots.push(await screenshot(page, scenario, viewportName, "after"));
    }
  }

  if (scenario.kind === "reviewQueue") {
    const reviewButtons = ["İncelemeye al", "Ek bilgi gerekli", "Reddet"];
    const visibleCount = reviewButtons.filter((label) => result.buttons.some((text) => normalize(text).includes(normalize(label)))).length;
    result.checks.reviewActionCount = visibleCount;
    if (visibleCount < 3) {
      result.notes.push(`Review actions incomplete: ${visibleCount}/3.`);
    } else {
      result.notes.push("Review queue actions visible.");
    }
  }

  if (scenario.kind === "dispatch") {
    const readiness = await waitForDispatchSemanticReadiness(page, viewportName);
    result.checks.dispatchReadySelectionCount = readiness.selectedCount;
    result.checks.dispatchReadyApplyVisible = readiness.applyVisible;
    result.checks.dispatchReadyApplyEnabled = readiness.applyEnabled;
    if (readiness.selectedCount <= 0 || !readiness.applyVisible) {
      result.status = bumpStatus(result.status, "BLOCKER");
      result.notes.push("ROOM shifts seeded selection readiness timeout.");
    } else {
      bodyText = await getVisibleText(page);
      result.textPreview = bodyText.slice(0, 4000);
      result.textLength = bodyText.length;
    }
    const applyButton = page.getByRole("button", { name: /Önizlemeyi Uygula: Böl & Onayla/i }).first();
    if (await applyButton.count().catch(() => 0)) {
      const enabled = await applyButton.isEnabled().catch(() => false);
      result.checks.dispatchApplyEnabled = enabled;
      if (!enabled) {
        result.status = bumpStatus(result.status, "BLOCKER");
        result.notes.push("Dispatch apply button disabled on seeded selection.");
      } else {
        result.notes.push("Dispatch apply button enabled on seeded selection.");
      }
    } else {
      result.notes.push("Dispatch apply button not visible.");
      result.status = bumpStatus(result.status, "UX-FIX");
    }
    if (normalize(bodyText).includes("önce tüm önerilerde uygun araç ve şoför seçimini tamamla")) {
      result.notes.push("Dispatch warning text visible.");
    }
  }

  if (scenario.kind === "convertToAgreement") {
    const convertButton = page.getByRole("button", { name: /Sözleşmeye Dönüştür|Yeniden Dönüştür/i }).first();
    if (await convertButton.count().catch(() => 0)) {
      const enabled = await convertButton.isEnabled().catch(() => false);
      result.checks.convertButtonEnabled = enabled;
      if (!enabled) {
        result.status = bumpStatus(result.status, "BLOCKER");
        result.notes.push("Company shift conversion button disabled.");
      } else {
        let clicked = false;
        try {
          await convertButton.click({ timeout: 5000 });
          clicked = true;
        } catch (error) {
          result.notes.push(`Conversion click failed: ${error?.message || String(error)}`);
          try {
            await convertButton.click({ timeout: 5000, force: true });
            clicked = true;
            result.notes.push("Conversion button force click ile test edildi.");
          } catch (forcedError) {
            result.notes.push(`Conversion force click failed: ${forcedError?.message || String(forcedError)}`);
          }
        }
        if (!clicked) {
          result.status = bumpStatus(result.status, "BLOCKER");
          result.notes.push("Vardiyayı sözleşmeye dönüştür butonu tıklanamadı.");
        }
        await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(900);
        const afterText = await getText(page);
        const afterUrl = page.url();
        const movedToAgreement =
          /\/company\/agreements/i.test(afterUrl) ||
          /sözleşme taslağı|hızlı sözleşme|sözleşme oluşturma kuralı/i.test(normalize(afterText));
        result.checks.convertedToAgreementDraft = movedToAgreement;
        if (!movedToAgreement) {
          result.status = bumpStatus(result.status, "BLOCKER");
          result.notes.push("Vardiyayı sözleşmeye dönüştür akışı taslak ekranına gitmedi.");
        } else {
          result.status = bumpStatus(result.status, "PASS");
          result.notes.push(`Sözleşme taslak bağlamı açıldı: ${afterUrl}`);
          result.screenshots.push(await screenshot(page, scenario, viewportName, "after"));
          result.textPreview = afterText.slice(0, 4000);
          result.textLength = afterText.length;
        }
      }
    } else {
      result.status = bumpStatus(result.status, "BLOCKER");
      result.notes.push("Vardiyayı sözleşmeye dönüştür butonu bulunamadı.");
    }
  }

  if (scenario.kind === "agreementPreview") {
    let detailButton = null;
    if (/\/room\/agreements/i.test(scenario.route)) {
      const scoped = page.locator(".roomCriticalFixScope").getByRole("button", { name: /Detayı aç/i }).first();
      if (await scoped.count().catch(() => 0)) {
        detailButton = scoped;
      }
    }
    if (!detailButton && /\/company\/agreements/i.test(scenario.route)) {
      const scoped = page.locator(".companyActionCTA").getByRole("button", { name: /Detayı aç/i }).first();
      if (await scoped.count().catch(() => 0)) {
        detailButton = scoped;
      }
    }
    if (!detailButton) {
      const generic = page.getByRole("button", { name: /Detayı aç/i }).first();
      if (await generic.count().catch(() => 0)) {
        detailButton = generic;
      }
    }
    if (detailButton && await detailButton.count().catch(() => 0)) {
      await detailButton.click({ timeout: 5000 }).catch((error) => {
        result.notes.push(`Detay açma click failed: ${error?.message || String(error)}`);
      });
      await page.waitForFunction(
        () => {
          try {
            const text = String(document.body?.innerText || "");
            const hay = text.normalize("NFKD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/ı/g, "i")
              .toLowerCase();
            return (
              hay.includes("detayi kapat") ||
              hay.includes("detayi gizle") ||
              hay.includes("ayrintilari gizle") ||
              hay.includes("secili sozlesme yok") ||
              hay.includes("bu okul/kurum gorunumunde secili sozlesme yok") ||
              hay.includes("bu baglanti icin henuz vardiya uretilmedi") ||
              hay.includes("bu sozlesmeden henuz uretilmis vardiya yok")
            );
          } catch {
            return false;
          }
        },
        { timeout: 5000 }
      ).catch(() => {});
      await page.waitForTimeout(1500);
      const afterText = await getText(page);
      const normalizedAfterText = normalize(afterText);
      const openToggleVisible = await page.getByRole("button", { name: /Detayı gizle|Ayrıntıları gizle|Detayı kapat/i }).first().isVisible({ timeout: 3000 }).catch(() => false);
      const hasOpenDetailsText =
        normalizedAfterText.includes("detayi kapat") ||
        normalizedAfterText.includes("detayi gizle") ||
        normalizedAfterText.includes("ayrintilari gizle");
      const hasExplicitFallback = [
        "secili sozlesme yok",
        "bu okul/kurum gorunumunde secili sozlesme yok",
        "bu baglanti icin henuz vardiya uretilmedi",
        "bu sozlesmeden henuz uretilmis vardiya yok",
      ].some((needle) => normalizedAfterText.includes(needle));
      const hasCanonicalEmptyState =
        normalizedAfterText.includes("gosterilen: 0 / toplam: 0") &&
        (normalizedAfterText.includes("kayit yok") ||
          normalizedAfterText.includes("operasyon koprusu icin bir sozlesme sec"));
      result.checks.detailsOpen = openToggleVisible || hasOpenDetailsText;
      if (!result.checks.detailsOpen && (hasExplicitFallback || hasCanonicalEmptyState)) {
        result.status = bumpStatus(result.status, "PASS");
        result.notes.push("Operasyon köprüsü boş/fallback durumda okunur.");
      } else if (!result.checks.detailsOpen) {
        result.notes.push("Operasyon köprüsü detayları açılmadı ya da okunur değil.");
      } else {
        result.notes.push("Operasyon köprüsü detayları collapse içinde açılıyor.");
      }
      result.screenshots.push(await screenshot(page, scenario, viewportName, "after"));
      result.textPreview = afterText.slice(0, 4000);
      result.textLength = afterText.length;
    } else {
      const emptyStateText = normalize(await getText(page));
      const hasCanonicalEmptyState =
        (emptyStateText.includes("gosterilen: 0 / toplam: 0") &&
          (emptyStateText.includes("kayit yok") || emptyStateText.includes("operasyon koprusu icin bir sozlesme sec"))) ||
        emptyStateText.includes("bu okul/kurum gorunumunde secili sozlesme yok");
      if (hasCanonicalEmptyState) {
        result.checks.emptyCanonicalState = true;
        result.notes.push("Operasyon köprüsü boş/fallback durumda okunur.");
      } else {
        result.notes.push("Detayı aç butonu görünmüyor.");
        result.status = bumpStatus(result.status, "UX-FIX");
      }
    }
  }

  if (scenario.kind === "routePreview") {
    const previewButton = page.getByRole("button", { name: /Rota etkisini önizle/i }).first();
    const previewCard = page.locator('[data-role="boarding-route-impact-preview"]').first();
    const readPreviewText = async () => {
      try {
        return await previewCard.innerText({ timeout: 3000 });
      } catch {
        return await getText(page);
      }
    };
    if (await previewButton.count().catch(() => 0)) {
      await previewButton.click({ timeout: 5000 }).catch((error) => {
        result.notes.push(`Rota önizleme click failed: ${error?.message || String(error)}`);
      });
      await page.waitForTimeout(700);
      const afterText = await readPreviewText();
      const afterHay = normalize(afterText);
      const hasCompactSummary =
        /karar ozeti|asama|denge|sonraki adim|ayrintilari ac|ayrintilari gizle/i.test(afterHay);
      result.checks.compactRoutePreview = hasCompactSummary;
      if (!hasCompactSummary) {
        result.status = bumpStatus(result.status, "UX-FIX");
        result.notes.push("Rota önizleme compact summary-first görünmüyor.");
      } else {
        result.status = bumpStatus(result.status, "PASS");
        result.notes.push("Rota önizleme kısa karar kartı halinde açılıyor.");
      }
      result.screenshots.push(await screenshot(page, scenario, viewportName, "after"));
      result.textPreview = afterText.slice(0, 4000);
      result.textLength = afterText.length;
    } else if (scenario.role === "room") {
      const afterText = await readPreviewText();
      const afterHay = normalize(afterText);
      const hasCompactSummary =
        /readonly onizleme|bir satir secince rota\/durak etkisi burada gorunur|ozet ustte|ayrintilar tablarda kalir|canli saglik ve risk ozeti/i.test(
          afterHay
        );
      result.checks.compactRoutePreview = hasCompactSummary;
      if (!hasCompactSummary) {
        result.status = bumpStatus(result.status, "UX-FIX");
        result.notes.push("Rota önizleme compact summary-first görünmüyor.");
      } else {
        result.notes.push("Rota önizleme kısa karar kartı olarak zaten açık.");
      }
      result.screenshots.push(await screenshot(page, scenario, viewportName, "after"));
      result.textPreview = afterText.slice(0, 4000);
      result.textLength = afterText.length;
    }
  }

  if (scenario.kind === "commercialFlow") {
    if (/iptal/i.test(normalize(bodyText)) && !/kabul|onay|uygulan/i.test(normalize(bodyText))) {
      result.notes.push("Commercial flow iptal bucket'ı baskın görünüyor.");
    }
    if (/onay|kabul|uygulan/i.test(normalize(bodyText))) {
      result.notes.push("Commercial flow accepted/applied bucket görünür.");
    }
  }

  if (scenario.kind === "density") {
    if (result.scrollHeight > (scenario.route.includes("/drivers") ? 3200 : 3000)) {
      result.notes.push(`Uzun panel yüksekliği: ${result.scrollHeight}px.`);
      result.status = bumpStatus(result.status, "UX-FIX");
    }
  }

  if (scenario.kind === "liveMap") {
    if (result.scrollHeight > 3200) {
      result.notes.push(`Canlı takip / harita yüzeyi uzun: ${result.scrollHeight}px.`);
    }
    if (/harita|gps|canli/i.test(normalize(bodyText))) {
      result.notes.push("Harita / canlı takip dili görünür.");
    }
  }

  if (scenario.kind === "driverToday") {
    if (!/bugün|rota|check[- ]?in/i.test(normalize(bodyText))) {
      result.notes.push("Driver Today ana sinyalleri kısmen belirsiz.");
    }
  }

  if (scenario.kind === "driverCheckin") {
    if (!/check[- ]?in|görev|gorev|bugün|bugun/i.test(normalize(bodyText))) {
      result.status = bumpStatus(result.status, "UX-FIX");
      result.notes.push("Driver check-in yüzeyi sade ama sinyal sınırlı.");
    }
  }

  if (scenario.kind === "personelMy") {
    if (!/servis|rota|bugün|konum/i.test(normalize(bodyText))) {
      result.status = bumpStatus(result.status, "PASS");
      result.notes.push("Personel My Ride minimal ve anlaşılır.");
    }
  }

  if (scenario.kind === "parentOverview") {
    if (!/servis|araç|saat|canli/i.test(normalize(bodyText))) {
      result.notes.push("Parent overview sade ve düşük yoğunlukta.");
    }
  }

  if (scenario.role !== "public" && !launcherVisible) {
    result.notes.push("Sefer Abi launcher görünmüyor.");
    result.status = bumpStatus(result.status, "UX-FIX");
  }
  if (scenario.role !== "public" && launcherVisible) {
    result.notes.push("Sefer Abi launcher secondary copilot olarak görünür.");
  }

  result.status = classifyTextSignals(bodyText, result.status, result.notes);

  // If we navigated away in a scenario, refresh the final snapshot before exit.
  if (result.screenshots.length === 1) {
    const finalShot = await screenshot(page, scenario, viewportName, "after");
    result.screenshots.push(finalShot);
  }

  const finalText = await getText(page);
  result.textPreview = finalText.slice(0, 4000);
  result.textLength = finalText.length;
  result.headings = await getHeadings(page);
  result.buttons = await getButtons(page);

  // A couple of public landing assertions are stronger than the generic density rules.
  if (scenario.kind === "publicLanding") {
    const text = result.textPreview;
    if (!/kurumsal servis operasyon platformu|servis tedarikinden saha denetimine|hakedişe tek kurumsal platform/i.test(text)) {
      result.notes.push("Platform-first ana mesaj beklenenden zayıf.");
      result.status = bumpStatus(result.status, "UX-FIX");
    }
    if (/chatgpt|autopilot|her şeyi sefer abi'ye bırak|ai operasyonu yönetir|ai otomatik karar verir/i.test(normalize(text))) {
      result.status = bumpStatus(result.status, "BLOCKER");
      result.notes.push("Public landing yanlış AI konumlandırması içeriyor.");
    }
  }

  if (scenario.kind === "reviewQueue" && /invite|user create|payment|billing|contract|settlement/i.test(normalize(bodyText))) {
    result.notes.push("Review queue yalnızca inceleme statüsü göstermeli, write flow değil.");
  }

  output.push(result);
  return result;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# UX Live Panel Premium Smoke 01");
  lines.push("");
  lines.push(`- Generated at: \`${report.generatedAt}\``);
  lines.push(`- Git HEAD: \`${report.gitHead}\``);
  lines.push(`- Schema SHA256: \`${report.schemaSha256}\``);
  lines.push(`- Source identity SHA256: \`${report.sourceIdentitySha256}\``);
  lines.push(`- Web base URL: \`${report.webBaseUrl}\``);
  lines.push(`- API base URL: \`${report.apiBaseUrl}\``);
  lines.push(`- Playwright: \`${report.playwrightVersion}\``);
  lines.push(`- Chromium: \`${report.browserVersion}\``);
  lines.push(`- Headless: \`${report.headless}\``);
  lines.push(`- Slow Mo: \`${report.slowMo}\``);
  lines.push(`- Routes tested: \`${report.routeCount}\``);
  lines.push(`- Screenshots: \`${report.screenshotCount}\``);
  lines.push(`- Console errors: \`${report.consoleErrorCount}\``);
  lines.push(`- Page errors: \`${report.pageErrorCount}\``);
  lines.push(`- Artifact root: \`${report.artifactRoot}\``);
  lines.push("");
  lines.push("## Coverage Sources");
  lines.push("");
  for (const source of report.coverageSources || []) {
    lines.push(`- \`${source}\``);
  }
  lines.push("");
  lines.push("");
  lines.push("## Status Counts");
  lines.push("");
  lines.push("| Status | Count |");
  lines.push("| --- | ---: |");
  for (const status of ["PASS", "PASS-", "UX-FIX", "BLOCKER", "AUTH-BLOCKED", "NOT-FOUND"]) {
    lines.push(`| ${status} | ${report.statusCounts[status] || 0} |`);
  }
  lines.push("");
  lines.push("## Top UX Fixes");
  lines.push("");
  const fixRows = report.routes.filter((row) => ["PASS-", "UX-FIX", "BLOCKER", "AUTH-BLOCKED", "NOT-FOUND"].includes(row.status)).slice(0, 10);
  if (fixRows.length === 0) {
    lines.push("- Yok.");
  } else {
    for (const row of fixRows) {
      lines.push(`- [${row.role}] ${row.label} (${row.viewport}) -> **${row.status}**`);
      for (const note of row.notes.slice(0, 3)) {
        lines.push(`  - ${note}`);
      }
    }
  }
  lines.push("");
  lines.push("## Route Summary");
  lines.push("");
  lines.push("| Role | Route | Viewport | Status | Screenshot | Notes |");
  lines.push("| --- | --- | --- | --- | --- | --- |");
  for (const row of report.routes) {
    lines.push(
      `| ${row.role} | ${row.route} | ${row.viewport} | ${row.status} | ${row.screenshots.join("<br>")} | ${row.notes.slice(0, 2).join(" / ").replace(/\|/g, "\\|")} |`
    );
  }
  lines.push("");
  lines.push("## Errors");
  lines.push("");
  const errorRows = report.routes.filter((row) => row.consoleErrors.length || row.pageErrors.length);
  if (errorRows.length === 0) {
    lines.push("- Console/page error yok.");
  } else {
    for (const row of errorRows) {
      lines.push(`- [${row.role}] ${row.label} (${row.viewport})`);
      for (const err of row.consoleErrors.slice(0, 3)) lines.push(`  - console: ${err}`);
      for (const err of row.pageErrors.slice(0, 3)) lines.push(`  - page: ${err}`);
    }
  }
  lines.push("");
  lines.push("## Notes");
  lines.push("");
  lines.push("- Playwright smoke runner browser artifacts ve screenshot'ları commit dışı bırakılır.");
  lines.push("- Windows host üzerinde browser automation çalıştırılır; backend Docker içinden servis edilir.");
  lines.push("- Public landing platform-first; Sefer Abi secondary copilot olarak kalır.");
  lines.push("- Company vardiya -> sözleşme akışı liste ekranına düşmemelidir.");
  lines.push("- Room / Operasyon Köprüsü summary-first kalmalıdır.");
  return lines.join("\n");
}

async function main() {
  console.log("=== UX LIVE PANEL PREMIUM SMOKE 01 ===");
  console.log(`Repo root: ${repoRoot}`);
  console.log(`Web base URL: ${WEB_BASE_URL}`);
  console.log(`API base URL: ${API_BASE_URL}`);
  console.log(`Headless: ${HEADLESS}`);
  console.log(`Slow Mo: ${SLOW_MO}`);

  await ensureDir(artifactRoot);
  await ensureDir(screenshotRoot);
  const originalCwd = process.cwd();
  chromiumWorkingDir = await fs.mkdtemp(path.join(artifactRoot, "ux-live-panel-premium-smoke-"));
  process.chdir(chromiumWorkingDir);

  try {
    const rootPkg = JSON.parse(await fs.readFile(path.join(repoRoot, "package.json"), "utf8"));
    const playwrightVersionSpec = rootPkg.devDependencies?.["@playwright/test"] || "unknown";

    const browser = await chromium.launch({
      headless: HEADLESS,
      slowMo: SLOW_MO,
      env: {
        ...process.env,
        CHROME_LOG_FILE: chromiumDebugLogPath,
      },
    });
    const browserVersion = browser.version();
    const evidenceIdentity = buildSmokeEvidenceIdentity({ repoRoot, sourceFiles: SMOKE_EVIDENCE_SOURCE_FILES, schemaPath: SMOKE_SCHEMA_PATH });

    const report = {
      generatedAt: new Date().toISOString(),
      repoRoot,
      artifactRoot: path.relative(repoRoot, artifactRoot).replace(/\\/g, "/"),
      webBaseUrl: WEB_BASE_URL,
      apiBaseUrl: API_BASE_URL,
      headless: HEADLESS,
      slowMo: SLOW_MO,
      playwrightVersion: playwrightVersionSpec,
      browserVersion,
      coverageSources: PREMIUM_SMOKE_COVERAGE_SOURCES,
      gitHead: evidenceIdentity.gitHead,
      schemaSha256: evidenceIdentity.schemaSha256,
      sourceIdentityFiles: evidenceIdentity.sourceIdentityFiles,
      sourceIdentityFileHashes: evidenceIdentity.sourceIdentityFileHashes,
      sourceIdentitySha256: evidenceIdentity.sourceIdentitySha256,
      routeCount: 0,
      screenshotCount: 0,
      consoleErrorCount: 0,
      pageErrorCount: 0,
      statusCounts: { PASS: 0, "PASS-": 0, "UX-FIX": 0, BLOCKER: 0, "AUTH-BLOCKED": 0, "NOT-FOUND": 0 },
      routes: [],
      authResults: [],
      financeAssertions: [],
      totalLoginFailures: 0,
      success: true,
    };

    for (const group of ROUTE_GROUPS) {
      let authState = { role: group.role, token: null, loginInfo: null, error: null };
      let sharedStorageState = null;
      if (group.auth) {
        authState = await loginRole(group.role);
        report.authResults.push(authState);
        if (authState.error) {
          report.totalLoginFailures += 1;
          console.log(`AUTH ${group.role}: ${authState.error}`);
        } else {
          console.log(`AUTH ${group.role}: ok`);
        }
      }

      for (const viewport of VIEWPORTS) {
        const contextOptions = {
          viewport: { width: viewport.width, height: viewport.height },
          deviceScaleFactor: viewport.deviceScaleFactor,
          isMobile: viewport.isMobile,
          hasTouch: viewport.hasTouch,
          locale: "tr-TR",
          timezoneId: "Europe/Istanbul",
        };

        if (sharedStorageState) {
          contextOptions.storageState = sharedStorageState;
        }

        const context = await browser.newContext(contextOptions);

        if (authState.token) {
          await context.addInitScript((token) => {
            localStorage.setItem("token", token);
          }, authState.token);
        }

        for (const scenario of group.routes) {
          const page = await context.newPage();
          const row = await runScenario(page, { ...scenario, role: group.role }, viewport.name, report.routes);
          report.routeCount += 1;
          report.screenshotCount += row.screenshots.length;
          report.consoleErrorCount += row.consoleErrors.length;
          report.pageErrorCount += row.pageErrors.length;
          report.statusCounts[row.status] = (report.statusCounts[row.status] || 0) + 1;
          report.success = report.success && !["BLOCKER", "NOT-FOUND"].includes(row.status);
          console.log(`${row.status} [${group.role}/${viewport.name}] ${scenario.route} -> ${scenario.label}`);
          await page.close().catch(() => {});
        }

        if (group.role === "room") {
          const financeAssertion = await runRoomFinancialOperationsAdvancedAssertion(context, viewport.name);
          report.financeAssertions.push(financeAssertion);
          report.consoleErrorCount += financeAssertion.consoleErrors.length;
          report.pageErrorCount += financeAssertion.pageErrors.length;
          report.success = report.success && financeAssertion.passed;
          console.log(`${financeAssertion.passed ? "PASS" : "BLOCKER"} [room/${viewport.name}] ROOM financial advanced text assertion`);
        }

        if (group.role === "company") {
          const financeAssertion = await runCompanyFinancialOperationsAdvancedAssertion(context, viewport.name);
          report.financeAssertions.push(financeAssertion);
          report.consoleErrorCount += financeAssertion.consoleErrors.length;
          report.pageErrorCount += financeAssertion.pageErrors.length;
          report.success = report.success && financeAssertion.passed;
          console.log(`${financeAssertion.passed ? "PASS" : "BLOCKER"} [company/${viewport.name}] COMPANY financial advanced text assertion`);
        }

        if (viewport.name === "desktop") {
          sharedStorageState = await context.storageState().catch(() => null);
        }

        await context.close().catch(() => {});
      }
    }

    await browser.close().catch(() => {});

    const md = renderMarkdown(report);
    await fs.writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    await fs.writeFile(reportMdPath, `${md}\n`, "utf8");
    await relocateRepoDebugLogIfPresent();

    console.log(`WROTE ${path.relative(repoRoot, reportJsonPath).replace(/\\/g, "/")}`);
    console.log(`WROTE ${path.relative(repoRoot, reportMdPath).replace(/\\/g, "/")}`);
    console.log(`STATUS PASS: ${report.statusCounts.PASS || 0}`);
    console.log(`STATUS PASS-: ${report.statusCounts["PASS-"] || 0}`);
    console.log(`STATUS UX-FIX: ${report.statusCounts["UX-FIX"] || 0}`);
    console.log(`STATUS BLOCKER: ${report.statusCounts.BLOCKER || 0}`);
    console.log(`STATUS AUTH-BLOCKED: ${report.statusCounts["AUTH-BLOCKED"] || 0}`);
    console.log(`STATUS NOT-FOUND: ${report.statusCounts["NOT-FOUND"] || 0}`);

    if (!report.success) {
      console.error("Smoke found blocker or 404 outcomes; see report files for details.");
      process.exit(1);
    }
  } finally {
    process.chdir(originalCwd);
    await fs.rm(chromiumWorkingDir, { recursive: true, force: true }).catch(() => {});
    chromiumWorkingDir = null;
  }
}

main().catch(async (error) => {
  try {
    await ensureDir(artifactRoot);
    await relocateRepoDebugLogIfPresent();
    const failureReport = {
      generatedAt: new Date().toISOString(),
      repoRoot,
      artifactRoot: path.relative(repoRoot, artifactRoot).replace(/\\/g, "/"),
      webBaseUrl: WEB_BASE_URL,
      apiBaseUrl: API_BASE_URL,
      headless: HEADLESS,
      slowMo: SLOW_MO,
      error: error?.stack || error?.message || String(error),
    };
    await fs.writeFile(reportJsonPath, `${JSON.stringify(failureReport, null, 2)}\n`, "utf8");
    await fs.writeFile(reportMdPath, `# UX Live Panel Premium Smoke 01\n\nSmoke runner failed before completion.\n\n\`\`\`\n${failureReport.error}\n\`\`\`\n`, "utf8");
  } catch {
    // ignore secondary write failures
  }
  console.error(error?.stack || String(error));
  process.exit(1);
});
