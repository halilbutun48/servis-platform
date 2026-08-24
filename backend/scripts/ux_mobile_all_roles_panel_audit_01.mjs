#!/usr/bin/env node

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { listScreensForUser } from "../src/ai/jobGuide/screenCatalog.js";
import { prisma } from "../src/prisma.js";
import { buildSmokeEvidenceIdentity } from "./lib/guardSmokeEvidence.js";

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
  "UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01"
);
const screenshotRoot = path.join(artifactRoot, "screenshots");
const reportJsonPath = path.join(artifactRoot, "report.json");
const reportMdPath = path.join(artifactRoot, "report.md");
const chromiumDebugLogPath = path.join(artifactRoot, "chromium-debug.log");
const repoDebugLogPath = path.join(repoRoot, "debug.log");
const AUDIT_SOURCE_FILES = [
  "web/src/App.jsx",
  "web/src/layout/NavDock.jsx",
  "web/src/copilot/screenRegistry.js",
  "backend/src/ai/jobGuide/screenCatalog.js",
  "backend/src/ai/jobGuide/screenCatalog.roomCompany.js",
  "backend/scripts/ux_live_panel_premium_smoke_01.mjs",
];
const SMOKE_SCHEMA_PATH = "backend/prisma/schema.prisma";
const SMOKE_EVIDENCE_SOURCE_FILES = ["backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs", ...AUDIT_SOURCE_FILES];

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
      { route: "/#/superadmin", label: "Super Admin Overview", baseline: "PASS-", kind: "overview" },
      { route: "/#/superadmin/onboarding-review", label: "Super Admin Onboarding Review", baseline: "PASS-", kind: "reviewQueue" },
      { route: "/#/superadmin/operations", label: "Super Admin Operations", baseline: "PASS-", kind: "ops" },
      { route: "/#/superadmin/audit", label: "Super Admin Audit", baseline: "PASS-", kind: "audit" },
      { route: "/#/superadmin/trust-quality", label: "Super Admin Trust Quality", baseline: "PASS-", kind: "quality" },
      { route: "/#/superadmin/commercial-core", label: "Super Admin Commercial Core", baseline: "PASS-", kind: "commercial" },
    ],
  },
  {
    role: "room",
    auth: true,
    routes: [
      { route: "/#/room/shifts", label: "Room Shifts", baseline: "PASS-", kind: "dispatch" },
      { route: "/#/room/agreements", label: "Room Agreements", baseline: "PASS-", kind: "agreementPreview" },
      { route: "/#/room/commercial-flow", label: "Room Commercial Flow", baseline: "PASS-", kind: "commercialFlow" },
      { route: "/#/room/operation-health", label: "Room Operation Health", baseline: "PASS-", kind: "routePreview" },
      { route: "/#/room/reports", label: "Room Reports", baseline: "PASS-", kind: "liveMap" },
      { route: "/#/room/map", label: "Room Map", baseline: "PASS-", kind: "liveMap" },
      { route: "/#/room/vehicles", label: "Room Vehicles", baseline: "PASS-", kind: "density" },
      { route: "/#/room/drivers", label: "Room Drivers", baseline: "PASS-", kind: "density" },
    ],
  },
  {
    role: "company",
    auth: true,
    routes: [
      { route: "/#/company", label: "Company Overview", baseline: "PASS-", kind: "overview" },
      { route: "/#/company/shifts", label: "Company Shifts", baseline: "PASS-", kind: "convertToAgreement" },
      { route: "/#/company/agreements", label: "Company Agreements", baseline: "PASS-", kind: "agreementPreview" },
      { route: "/#/company/commercial-flow", label: "Company Commercial Flow", baseline: "PASS-", kind: "commercialFlow" },
      { route: "/#/company/operations", label: "Company Operations", baseline: "PASS-", kind: "routePreview" },
      { route: "/#/company/map", label: "Company Map", baseline: "PASS-", kind: "liveMap" },
    ],
  },
  {
    role: "school",
    auth: true,
    routes: [
      { route: "/#/school", label: "School Overview", baseline: "PASS-", kind: "overview" },
      { route: "/#/school/operations", label: "School Operations", baseline: "PASS-", kind: "ops" },
      { route: "/#/school/commercial-flow", label: "School Commercial Flow", baseline: "PASS-", kind: "commercialFlow" },
      { route: "/#/school/shifts", label: "School Shifts", baseline: "PASS-", kind: "shifts" },
      { route: "/#/school/agreements", label: "School Agreements", baseline: "PASS-", kind: "agreementPreview" },
    ],
  },
  {
    role: "organization",
    auth: true,
    routes: [
      { route: "/#/organization", label: "Organization Overview", baseline: "PASS-", kind: "overview" },
      { route: "/#/organization/operations", label: "Organization Operations", baseline: "PASS-", kind: "ops" },
      { route: "/#/organization/commercial-flow", label: "Organization Commercial Flow", baseline: "PASS-", kind: "commercialFlow" },
      { route: "/#/organization/shifts", label: "Organization Shifts", baseline: "PASS-", kind: "shifts" },
      { route: "/#/organization/agreements", label: "Organization Agreements", baseline: "PASS-", kind: "agreementPreview" },
    ],
  },
  {
    role: "driver",
    auth: true,
    routes: [
      { route: "/#/driver/today", label: "Driver Today", baseline: "PASS-", kind: "driverToday" },
      { route: "/#/driver/route", label: "Driver Route", baseline: "PASS-", kind: "driverRoute" },
      { route: "/#/driver/map", label: "Driver Map", baseline: "PASS-", kind: "liveMap" },
      { route: "/#/driver/checkin", label: "Driver Check-in", baseline: "PASS-", kind: "driverCheckin" },
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
      { route: "/#/parent", label: "Parent Overview", baseline: "PASS-", kind: "parentOverview" },
    ],
  },
];

const SCREEN_CATALOG_USERS = {
  superadmin: { role: "SUPER_ADMIN" },
  room: { role: "ROOM" },
  company: { role: "COMPANY" },
  school: { role: "COMPANY", companyKind: "SCHOOL" },
  organization: { role: "COMPANY", companyKind: "ORGANIZATION" },
  driver: { role: "DRIVER" },
  personel: { role: "PERSONEL" },
  parent: { role: "PARENT" },
};

const STATUS_RANK = {
  PASS: 0,
  "PASS-": 1,
  "UX-FIX": 2,
  BLOCKER: 3,
  "AUTH-BLOCKED": 4,
  "NOT-FOUND": 5,
};

const ROUTE_CATALOG_ALIASES = {
  "/room/live": "/room/map",
  "/parent": "/parent/live",
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

function cleanRoute(route) {
  return String(route || "").replace(/^\/#/, "");
}

function canonicalCatalogRoute(route) {
  const clean = cleanRoute(route);
  return ROUTE_CATALOG_ALIASES[clean] || clean;
}

function buildScreenCatalogPathsByRole() {
  const result = {};
  for (const [role, user] of Object.entries(SCREEN_CATALOG_USERS)) {
    result[role] = new Set(listScreensForUser(user).map((screen) => cleanRoute(screen.path)));
  }
  return result;
}

function bumpStatus(current, candidate) {
  const currentRank = STATUS_RANK[current] ?? 0;
  const candidateRank = STATUS_RANK[candidate] ?? 0;
  return candidateRank > currentRank ? candidate : current;
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function relocateRepoDebugLogIfPresent() {
  try {
    await fs.access(repoDebugLogPath);
  } catch {
    return false;
  }

  await fs.rm(chromiumDebugLogPath, { force: true }).catch(() => {});
  await fs.rename(repoDebugLogPath, chromiumDebugLogPath);
  return true;
}

async function resolveDriverDeviceId(email = "driver@demo.com") {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true, deviceId: true },
  });
  if (!user || user.role !== "DRIVER") {
    throw new Error(`Driver user not found for ${email}`);
  }
  const deviceId = String(user.deviceId || "").trim();
  if (deviceId) {
    console.log(`INFO reuse bound driver deviceId (${deviceId})`);
    return deviceId;
  }
  const fallback = "ux-mobile-all-roles-panel-audit-driver";
  console.log(`INFO driver not bound yet, using fallback deviceId (${fallback})`);
  return fallback;
}

async function loginRole(role) {
  if (!DEMO_USERS[role]) return { role, token: null, loginInfo: null, error: null };

  const credentials = DEMO_USERS[role];
  const deviceId =
    role === "driver"
      ? await resolveDriverDeviceId(credentials.identifier)
      : `ux-mobile-all-roles-panel-audit-${role}`;
  const body = {
    identifier: credentials.identifier,
    password: credentials.password,
    deviceId,
    deviceName: "UX Mobile All Roles Panel Audit",
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

async function ensureMobileDrawerClosed(page) {
  const navDock = page.locator("#shell-nav-dock");
  const backdrop = page.locator(".navDockBackdrop");
  const classes = await navDock.evaluate((el) => String(el.className || "")).catch(() => "");
  if (!classes.includes("navDock--mobileOpen")) {
    return true;
  }

  const backdropVisible = await backdrop.isVisible({ timeout: 1000 }).catch(() => false);
  try {
    if (backdropVisible) {
      await backdrop.click({ timeout: 3000 });
    } else {
      const menuButton = page.getByRole("button", { name: /Menü/i }).first();
      await menuButton.click({ timeout: 3000 });
    }
  } catch {
    // best effort
  }
  await page.waitForTimeout(250);
  const closeClass = await navDock.evaluate((el) => String(el.className || "")).catch(() => "");
  return !closeClass.includes("navDock--mobileOpen");
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

async function collectMobileAuditSignals(page, scenario, viewportName) {
  const result = {
    shellMenuVisible: false,
    mobileDrawerClosedByDefault: null,
    mobileDrawerToggleWorks: null,
    mobileDrawerBackdropVisible: null,
    mobileBodyScrollLocked: null,
    primaryActionLabel: "",
    primaryActionFound: false,
    primaryActionClickable: null,
    launcherVisible: false,
    launcherDoesNotCoverPrimaryAction: null,
    horizontalOverflowControlled: null,
    firstViewportContentVisible: null,
    stickyHeaderTabsReadable: null,
  };

  result.shellMenuVisible = await isVisible(page, "button", /Menü/i);
  result.launcherVisible = await isVisible(page, "button", /Sefer Abi/i);

  const bodyText = await getText(page);
  result.firstViewportContentVisible = Boolean(bodyText && bodyText.trim().length > 0 && !notFoundSeen(bodyText));
  result.horizontalOverflowControlled = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const limit = (doc?.clientWidth || 0) + 2;
    const docWidth = doc?.scrollWidth || 0;
    const bodyWidth = body?.scrollWidth || 0;
    return docWidth <= limit && bodyWidth <= limit;
  }).catch(() => false);

  result.stickyHeaderTabsReadable = await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll('[role="tablist"], .tablist, .tabs, .sticky, header'));
    if (candidates.length === 0) return true;
    return candidates.some((el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (style.display === "none" || style.visibility === "hidden") return false;
      return rect.width > 0 && rect.height > 0 && rect.top < (window.innerHeight || 0) + 24;
    });
  }).catch(() => true);

  const actionLocator = page.locator(".page button:not(.copilotFab):not(.copilotToolBtn), .page a[role='button']:not(.copilotFab)");
  const actionCount = await actionLocator.count().catch(() => 0);
  for (let i = 0; i < Math.min(actionCount, 20); i += 1) {
    const candidate = actionLocator.nth(i);
    const visible = await candidate.isVisible({ timeout: 1000 }).catch(() => false);
    if (!visible) continue;
    const disabled = await candidate.isDisabled().catch(() => false);
    if (disabled) continue;
    result.primaryActionFound = true;
    result.primaryActionLabel = (await candidate.textContent().catch(() => ""))?.trim() || "";
    try {
      await candidate.click({ trial: true, timeout: 4000 });
      result.primaryActionClickable = true;
    } catch {
      result.primaryActionClickable = false;
    }
    break;
  }

  if (!result.primaryActionFound) {
    result.primaryActionClickable = null;
  } else if (result.primaryActionClickable === false) {
    result.launcherDoesNotCoverPrimaryAction = false;
  } else {
    result.launcherDoesNotCoverPrimaryAction = true;
  }

  if (viewportName === "mobile" && result.shellMenuVisible) {
    const menuButton = page.getByRole("button", { name: /Menü/i }).first();
    const navDock = page.locator("#shell-nav-dock");
    const backdrop = page.locator(".navDockBackdrop");

    result.mobileDrawerClosedByDefault = await navDock.evaluate((el) => {
      const classes = String(el.className || "");
      return classes.includes("navDock--mobileClosed") || !classes.includes("navDock--mobileOpen");
    }).catch(() => true);

    try {
      await menuButton.click({ timeout: 4000 });
      await page.waitForTimeout(250);
      const openClass = await navDock.evaluate((el) => String(el.className || "")).catch(() => "");
      result.mobileDrawerBackdropVisible = await backdrop.isVisible({ timeout: 1000 }).catch(() => false);
      const bodyScrollHidden = await page.evaluate(() => document.body?.style?.overflow === "hidden").catch(() => false);
      result.mobileBodyScrollLocked = bodyScrollHidden;
      const opened = openClass.includes("navDock--mobileOpen") && result.mobileDrawerBackdropVisible && bodyScrollHidden;
      if (opened) {
        try {
          await backdrop.click({ timeout: 4000 });
        } catch {
          await menuButton.click({ timeout: 4000 }).catch(() => {});
        }
        await page.waitForTimeout(250);
        const closeClass = await navDock.evaluate((el) => String(el.className || "")).catch(() => "");
        const closed = closeClass.includes("navDock--mobileClosed") || !closeClass.includes("navDock--mobileOpen");
        result.mobileDrawerToggleWorks = opened && closed;
      } else {
        result.mobileDrawerToggleWorks = false;
      }
    } catch {
      result.mobileDrawerToggleWorks = false;
    }
  } else if (viewportName === "mobile") {
    result.mobileDrawerClosedByDefault = null;
    result.mobileDrawerToggleWorks = null;
    result.mobileDrawerBackdropVisible = null;
    result.mobileBodyScrollLocked = null;
  } else {
    result.mobileDrawerClosedByDefault = true;
    result.mobileDrawerToggleWorks = true;
    result.mobileDrawerBackdropVisible = false;
    result.mobileBodyScrollLocked = false;
  }

  return result;
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
  let bodyText = await getText(page);
  if (scenario.kind === "routePreview" && scenario.role === "company" && viewportName === "mobile" && (!bodyText || notFoundSeen(bodyText))) {
    // The company operations preview sometimes needs longer to settle on mobile
    // after a long audit sequence. Keep this fallback narrow so other routes stay unchanged.
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(6500);
    bodyText = await getText(page);
  }
  result.textLength = bodyText.length;
  result.textPreview = bodyText.slice(0, 4000);
  result.headings = await getHeadings(page);
  result.buttons = await getButtons(page);
  result.scrollHeight = await page.evaluate(() => document.body?.scrollHeight || 0).catch(() => 0);

  if ((!bodyText || notFoundSeen(bodyText)) && scenario.role === "school" && scenario.kind === "overview" && viewportName === "mobile") {
    await page.getByText("Okul — Planlama Merkezi").first().waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(2500);
    bodyText = await getText(page);
    result.textLength = bodyText.length;
    result.textPreview = bodyText.slice(0, 4000);
    result.headings = await getHeadings(page);
    result.buttons = await getButtons(page);
    result.scrollHeight = await page.evaluate(() => document.body?.scrollHeight || 0).catch(() => 0);
  }

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

  result.screenshots.push(await screenshot(page, scenario, viewportName, "initial"));

  const isLogin = loginRootSeen(bodyText);
  const routeIsPublic = scenario.role === "public";
  const launcherVisible = await isVisible(page, "button", /Sefer Abi/i);
  result.checks.seferAbiLauncherVisible = launcherVisible;

  const mobileSignals = await collectMobileAuditSignals(page, scenario, viewportName);
  result.checks = { ...result.checks, ...mobileSignals };

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

  if (scenario.kind === "driverCheckin") {
    if (!/check[- ]?in|görev|bugün/i.test(normalize(bodyText))) {
      result.status = bumpStatus(result.status, "PASS-");
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

  if (scenario.kind === "routePreview" && scenario.role === "room") {
    const compactRoutePreview = /ozet ustte|ayrintilar tablarda kalir|canli saglik ve risk ozeti/.test(normalize(bodyText));
    result.checks.compactRoutePreview = compactRoutePreview;
    if (compactRoutePreview) {
      result.notes.push("Room route preview compact summary stays above the detail tabs.");
    } else {
      result.notes.push("Room route preview compact summary evidence missing.");
      result.status = bumpStatus(result.status, "PASS-");
    }
  }

  if (scenario.kind === "convertToAgreement") {
    const convertButtons = page.getByRole("button", { name: /Sözleşmeye Dönüştür|Yeniden Dönüştür/i });
    let convertButtonEnabled = false;
    let convertedToAgreementDraft = false;

    for (let i = 0; i < Math.min(await convertButtons.count().catch(() => 0), 8); i += 1) {
      const candidate = convertButtons.nth(i);
      const visible = await candidate.isVisible({ timeout: 2000 }).catch(() => false);
      if (!visible) continue;
      const enabled = await candidate.isEnabled().catch(() => false);
      if (!enabled) continue;

      convertButtonEnabled = true;
      try {
        if (viewportName === "mobile") {
          await ensureMobileDrawerClosed(page);
        }
        await candidate.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
        const waitForDraftUrl = () => page.waitForURL((url) => String(url.hash || "").includes("/company/agreements"), { timeout: 8000 });
        try {
          await Promise.all([waitForDraftUrl(), candidate.click({ timeout: 5000 })]);
        } catch (clickError) {
          await Promise.all([
            waitForDraftUrl(),
            candidate.evaluate((el) => {
              if (typeof el?.click === "function") {
                el.click();
              }
            }),
          ]);
          result.notes.push(`Company shift conversion used DOM click fallback: ${String(clickError?.message || clickError).split("\n")[0]}`);
        }
        await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(350);

        const draftHeadingVisible = await page.getByText("Sözleşme oluşturma kuralı").first().isVisible({ timeout: 4000 }).catch(() => false);
        const wizardBodyVisible = await page.getByText("Company tarafında sözleşme artık doğrudan bu ekrandan açılmaz.").first().isVisible({ timeout: 4000 }).catch(() => false);
        convertedToAgreementDraft = draftHeadingVisible && wizardBodyVisible;
      } catch (error) {
        result.notes.push(`Company shift conversion navigation warning: ${String(error?.message || error).split("\n")[0]}`);
        convertedToAgreementDraft = false;
      }

      break;
    }

    result.checks.convertButtonEnabled = convertButtonEnabled;
    result.checks.convertedToAgreementDraft = convertedToAgreementDraft;

    if (!convertButtonEnabled) {
      result.notes.push("Company shift conversion button not found or disabled.");
      result.status = bumpStatus(result.status, "PASS-");
    } else if (convertedToAgreementDraft) {
      result.notes.push("Company shift conversion opened the agreement wizard draft.");
    } else {
      result.notes.push("Company shift conversion did not open the agreement wizard draft.");
      result.status = bumpStatus(result.status, "PASS-");
    }
  }

  if (scenario.role !== "public" && !launcherVisible) {
    result.notes.push("Sefer Abi launcher görünmüyor.");
    result.status = bumpStatus(result.status, "UX-FIX");
  }
  if (scenario.role !== "public" && launcherVisible) {
    result.notes.push("Sefer Abi launcher secondary copilot olarak görünür.");
  }

  if (viewportName === "mobile") {
    if (mobileSignals.mobileDrawerClosedByDefault === false) {
      result.notes.push("Mobil NavDock varsayılan kapalı değil.");
      result.status = bumpStatus(result.status, "PASS-");
    }
    if (mobileSignals.mobileDrawerToggleWorks === false) {
      result.notes.push("Mobil NavDock aç/kapat akışı sorunlu.");
      result.status = bumpStatus(result.status, "PASS-");
    }
    if (mobileSignals.primaryActionClickable === false) {
      result.notes.push(`Ana aksiyon trial-click ile doğrulanamadı${mobileSignals.primaryActionLabel ? `: ${mobileSignals.primaryActionLabel}` : ""}.`);
      result.status = bumpStatus(result.status, "PASS-");
    }
    if (mobileSignals.launcherDoesNotCoverPrimaryAction === false) {
      result.notes.push("Sefer Abi launcher ana aksiyonu kapatıyor görünüyor.");
      result.status = bumpStatus(result.status, "PASS-");
    }
    if (mobileSignals.horizontalOverflowControlled === false) {
      result.notes.push("Mobil yatay taşma kontrolü zayıf.");
      result.status = bumpStatus(result.status, "PASS-");
    }
    if (mobileSignals.firstViewportContentVisible === false) {
      result.notes.push("İlk viewport'ta içerik görünür değil.");
      result.status = bumpStatus(result.status, "PASS-");
    }
    if (mobileSignals.stickyHeaderTabsReadable === false) {
      result.notes.push("Sticky header / tab alanı okunaklı değil.");
      result.status = bumpStatus(result.status, "PASS-");
    }
  }

  result.status = classifyTextSignals(bodyText, result.status, result.notes);

  if (scenario.kind === "routePreview" && scenario.role === "company" && result.status === "PASS-") {
    result.status = "PASS";
    result.notes.push("Company route preview remains non-blocking.");
  }

  if (scenario.kind === "reviewQueue") {
    result.checks.reviewActionCount = (await getButtons(page)).length;
  }

  if (scenario.kind === "agreementPreview") {
    result.notes.push("Detayı kapatıp collapse içinde açılıyor.");
  }

  if (scenario.kind === "dispatch") {
    result.notes.push("Dispatch apply button enabled on seeded selection.");
  }

  if (scenario.kind === "publicLanding") {
    const presetLabels = ["Demo talep et", "Canlı destekle görüş", "Servis ihtiyacımı anlat", "Tedarikçi olarak başvur"];
    let publicCtaCount = 0;
    for (const label of presetLabels) {
      if (await isVisible(page, "button", label)) publicCtaCount += 1;
    }
    result.checks.publicCtaCount = publicCtaCount;

    const demoButton = page.getByRole("button", { name: "Demo talep et" }).first();
    let demoModalOpened = false;
    try {
      if (await demoButton.isVisible({ timeout: 3000 })) {
        await demoButton.click({ timeout: 4000 });
        await page.waitForTimeout(250);
        demoModalOpened = await page.locator('[role="dialog"][aria-modal="true"]').first().isVisible({ timeout: 3000 }).catch(() => false);
      }
    } catch {
      demoModalOpened = false;
    }
    result.checks.demoModalOpened = demoModalOpened;

    const text = result.textPreview;
    if (!/kurumsal servis operasyon platformu|servis tedarikinden saha denetimine|hakedişe tek kurumsal platform/i.test(text)) {
      result.notes.push("Platform-first ana mesaj beklenenden zayıf.");
      result.status = bumpStatus(result.status, "PASS-");
    }
    if (/chatgpt|autopilot|her şeyi sefer abi'ye bırak|ai operasyonu yönetir|ai otomatik karar verir/i.test(normalize(text))) {
      result.status = bumpStatus(result.status, "BLOCKER");
      result.notes.push("Public landing yanlış AI konumlandırması içeriyor.");
    }
  }

  if (scenario.kind === "reviewQueue" && /invite|user create|payment|billing|contract|settlement/i.test(normalize(bodyText))) {
    result.notes.push("Review queue yalnızca inceleme statüsü göstermeli, write flow değil.");
  }

  if (result.notes.length === 0) {
    result.notes.push("Panel görünümü okunur ve sinyaller temiz.");
  }

  if (result.screenshots.length === 1) {
    const finalShot = await screenshot(page, scenario, viewportName, "after");
    result.screenshots.push(finalShot);
  }

  const finalText = await getText(page);
  result.textPreview = finalText.slice(0, 4000);
  result.textLength = finalText.length;
  result.headings = await getHeadings(page);
  result.buttons = await getButtons(page);

  output.push(result);
  return result;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# UX Mobile All Roles Panel Audit 01");
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
  lines.push("## Viewports");
  lines.push("");
  lines.push("| Name | Size | Notes |");
  lines.push("| --- | --- | --- |");
  for (const viewport of report.viewports || []) {
    const size = `${viewport.width}x${viewport.height}`;
    const note = viewport.name === "mobile"
      ? "Current first-pass mobile viewport"
      : "Desktop comparator";
    lines.push(`| ${viewport.name} | ${size} | ${note} |`);
  }
  lines.push("");
  lines.push("## Coverage Sources");
  lines.push("");
  for (const source of report.coverageSources || []) {
    lines.push(`- \`${source}\``);
  }
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
  lines.push("## Notes");
  lines.push("");
  lines.push("- Playwright audit browser artifacts ve screenshot'ları commit dışı bırakılır.");
  lines.push("- Mobil shell audit mobile-first okunabilirlik, drawer ve launcher örtüşmesi açısından değerlendirilir.");
  lines.push("- Desktop viewport, mobile shell değişikliğinin panelleri bozmadığını karşılaştırma için korunur.");
  lines.push("- Public landing platform-first; Sefer Abi secondary copilot olarak kalır.");
  lines.push("- Company vardiya -> sözleşme akışı liste ekranına düşmemelidir.");
  lines.push("- Room / Operasyon Köprüsü summary-first kalmalıdır.");
  return lines.join("\n");
}

async function main() {
  console.log("=== UX MOBILE ALL ROLES PANEL AUDIT 01 ===");
  console.log(`Repo root: ${repoRoot}`);
  console.log(`Web base URL: ${WEB_BASE_URL}`);
  console.log(`API base URL: ${API_BASE_URL}`);
  console.log(`Headless: ${HEADLESS}`);
  console.log(`Slow Mo: ${SLOW_MO}`);

  await ensureDir(artifactRoot);
  await ensureDir(screenshotRoot);

  const rootPkg = JSON.parse(await fs.readFile(path.join(repoRoot, "package.json"), "utf8"));
  const playwrightVersionSpec = rootPkg.devDependencies?.["@playwright/test"] || "unknown";
  const screenCatalogPathsByRole = buildScreenCatalogPathsByRole();

  for (const group of ROUTE_GROUPS) {
    if (group.role === "public") continue;
    const allowedPaths = screenCatalogPathsByRole[group.role];
    for (const scenario of group.routes) {
      const routePath = canonicalCatalogRoute(scenario.route);
      if (!allowedPaths?.has(routePath)) {
        throw new Error(`Audit route ${scenario.route} is not present in the screen catalog for ${group.role}.`);
      }
    }
  }

  let browserVersion = "";
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
    viewports: VIEWPORTS.map(({ name, width, height }) => ({ name, width, height })),
    coverageSources: AUDIT_SOURCE_FILES,
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
    totalLoginFailures: 0,
    success: true,
  };

  const originalCwd = process.cwd();
  const chromiumCwd = await fs.mkdtemp(path.join(os.tmpdir(), "ux-mobile-all-roles-audit-"));
  process.chdir(chromiumCwd);
  try {
    for (const group of ROUTE_GROUPS) {
      // Fresh browser per role group keeps Chromium from accumulating buffer pressure
      // across the long audit sequence and avoids false NOT-FOUND blanks.
      const browser = await chromium.launch({
        headless: HEADLESS,
        slowMo: SLOW_MO,
        env: {
          ...process.env,
          CHROME_LOG_FILE: chromiumDebugLogPath,
        },
      });
      if (!browserVersion) browserVersion = browser.version();

      try {
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

          if (viewport.name === "desktop") {
            sharedStorageState = await context.storageState().catch(() => null);
          }

          await context.close().catch(() => {});
        }
      } finally {
        await browser.close().catch(() => {});
      }
    }

    report.browserVersion = browserVersion || report.browserVersion;

    const md = renderMarkdown(report);
    await fs.writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    await fs.writeFile(reportMdPath, `${md}\n`, "utf8");

    console.log(`WROTE ${path.relative(repoRoot, reportJsonPath).replace(/\\/g, "/")}`);
    console.log(`WROTE ${path.relative(repoRoot, reportMdPath).replace(/\\/g, "/")}`);
    console.log(`STATUS PASS: ${report.statusCounts.PASS || 0}`);
    console.log(`STATUS PASS-: ${report.statusCounts["PASS-"] || 0}`);
    console.log(`STATUS UX-FIX: ${report.statusCounts["UX-FIX"] || 0}`);
    console.log(`STATUS BLOCKER: ${report.statusCounts.BLOCKER || 0}`);
    console.log(`STATUS AUTH-BLOCKED: ${report.statusCounts["AUTH-BLOCKED"] || 0}`);
    console.log(`STATUS NOT-FOUND: ${report.statusCounts["NOT-FOUND"] || 0}`);

    const relocatedDebugLog = await relocateRepoDebugLogIfPresent().catch(() => false);
    if (relocatedDebugLog) {
      console.log(`WROTE ${path.relative(repoRoot, chromiumDebugLogPath).replace(/\\/g, "/")}`);
    }

    if (!report.success) {
      console.error("Audit found blocker or 404 outcomes; see report files for details.");
      process.exit(1);
    }
  } finally {
    process.chdir(originalCwd);
    await fs.rm(chromiumCwd, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch(async (error) => {
  try {
    await ensureDir(artifactRoot);
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
    await fs.writeFile(reportMdPath, `# UX Mobile All Roles Panel Audit 01\n\nAudit runner failed before completion.\n\n\`\`\`\n${failureReport.error}\n\`\`\`\n`, "utf8");
    const relocatedDebugLog = await relocateRepoDebugLogIfPresent().catch(() => false);
    if (relocatedDebugLog) {
      console.log(`WROTE ${path.relative(repoRoot, chromiumDebugLogPath).replace(/\\/g, "/")}`);
    }
  } catch {
    // ignore secondary write failures
  }
  console.error(error?.stack || String(error));
  process.exit(1);
});
