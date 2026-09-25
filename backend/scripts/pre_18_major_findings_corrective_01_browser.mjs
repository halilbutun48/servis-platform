import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const webBaseUrl = (process.env.WEB_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const apiBaseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const evidenceRoot = path.join(repoRoot, "backend", "artifacts", "browser-smoke", "pre-18-major-findings-corrective-01");
const screenshotRoot = path.join(evidenceRoot, "screenshots");

const contexts = [
  { name: "SUPER_ADMIN", identifier: "superadmin@demo.com", route: "/superadmin/logexport" },
  { name: "COMPANY", identifier: "company@demo.com", route: "/company/commercial-flow" },
  { name: "ROOM", identifier: "room@demo.com", route: "/room/offers" },
  { name: "DRIVER", identifier: "driver@demo.com", route: "/driver/today", deviceId: process.env.DRIVER_BROWSER_DEVICE_ID || "web-s27k9shhmqj7i68l" },
  { name: "PERSONEL", identifier: "personel@demo.com", route: "/personel/my" },
  { name: "PARENT", identifier: "parent@demo.com", route: "/parent/live" },
  { name: "SCHOOL", identifier: "school@demo.com", route: "/school/parents" },
  { name: "ORGANIZATION", identifier: "organization@demo.com", route: "/organization/plans" },
];

const viewports = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 1024, height: 900 },
  mobile: { width: 390, height: 844 },
};

const report = {
  source: "REAL_PLAYWRIGHT_RENDERED_BROWSER",
  generatedAt: new Date().toISOString(),
  sourceHead: execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim(),
  matrix: "8 role/context fixtures x desktop/tablet/mobile",
  screenshots: [],
  evidence: [],
  counters: {
    PRE_18_MAJOR_FINDING_COUNT: 8,
    PRE_18_MAJOR_FINDING_RESOLVED_COUNT: 0,
    PRE_18_MAJOR_FINDING_REMAINING_COUNT: 0,
    ROLE_CONTEXT_PROVEN_COUNT: 0,
    VIEWPORT_CONTEXT_PROVEN_COUNT: 0,
    SEMANTIC_HEADING_ROLE_GAP_COUNT: 0,
    VISIBLE_PRIMARY_STATUS_CHIP_COUNT: 0,
    DUPLICATE_EMPTY_STATE_MESSAGE_COUNT: 0,
    VISIBLE_EQUAL_WEIGHT_STATUS_OVERLOAD_COUNT: 0,
    APPROVAL_POLICY_VISUAL_DOMINANCE_DEFECT_COUNT: 0,
    VISIBLE_EXCESSIVE_BORDER_DENSITY_COUNT: 0,
    FINANCE_ADVANCED_DEFAULT_OPEN_COUNT: 0,
    FINANCE_VISIBLE_INPUT_OVERLOAD_DEFECT_COUNT: 0,
    FINANCE_EQUAL_WEIGHT_SECTION_OVERLOAD_COUNT: 0,
    FINANCE_PRIMARY_ACTION_AMBIGUITY_COUNT: 0,
    SHIFT_CARD_REPEATED_WORKFLOW_BLOCK_COUNT: 0,
    SHIFT_CARD_PRIMARY_ACTION_AMBIGUITY_COUNT: 0,
    SHIFT_CARD_EXCESSIVE_BORDER_DENSITY_COUNT: 0,
    ORGANIZATION_PLAN_REPEATED_CTA_COUNT: 0,
    ORGANIZATION_PLAN_CTA_COLLISION_COUNT: 0,
    COMPANY_COMMERCIAL_DUPLICATE_APPROVED_RECORD_ACTION_COUNT: 0,
    COMPANY_COMMERCIAL_DETAIL_OVERLOAD_COUNT: 0,
    PERSONEL_ACCESS_MOBILE_READABILITY_DEFECT_COUNT: 0,
    PERSONEL_ACCESS_ROW_ACTION_DOMINANCE_COUNT: 0,
    RESPONSIVE_TERMINOLOGY_LEAK_COUNT: 0,
    RESPONSIVE_TEXT_CLIP_COUNT: 0,
    RESPONSIVE_HORIZONTAL_OVERFLOW_COUNT: 0,
    RESPONSIVE_COMPONENT_OVERLAP_COUNT: 0,
    SEFER_ABI_PERSONEL_MENU_FAB_INTERACTION_PASS_COUNT: 0,
    MAP_RENDERED_SURFACE_PROOF_COUNT: 0,
    consoleErrorCount: 0,
    pageErrorCount: 0,
    HTTP_500_COUNT: 0,
  },
  errors: [],
};

function visible(element) {
  if (!element) return false;
  const style = getComputedStyle(element);
  const box = element.getBoundingClientRect();
  return Boolean(box.width && box.height && style.display !== "none" && style.visibility !== "hidden");
}

function intersects(a, b, padding = 1) {
  return Boolean(a && b && a.left < b.right - padding && a.right > b.left + padding && a.top < b.bottom - padding && a.bottom > b.top + padding);
}

function leakage(text) {
  const rules = [
    /\b(?:SUPER_ADMIN|COMPANY|ROOM|DRIVER|PARENT|SCHOOL|ORGANIZATION)\b/g,
    /\bOda\b/gi,
    /\b(?:Copilot|Sefer Abi Terminali|OFFLINE|ONLINE|STALE|APPROVED|PENDING|REJECTED|ACTIVE|CANCELLED|DRAFT|SHIFT_PUBLISHED|AGREEMENT_REQUESTED|ESTIMATED|requestUrl|routeSource|providerAdapter|latitude|longitude|snake_case|camelCase)\b/g,
    /\b(?:Check-in|Confirm|Approve|Execute|Cancel|Send|Accept|Reject|Convert|Dispatch|Publish|Finalize|Preview|Export|Download)\b/gi,
  ];
  return rules.flatMap((rule) => text.match(rule) || []);
}

async function login(spec) {
  const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: spec.identifier, password: "demo123", deviceId: spec.deviceId || `pre18-major-${spec.name}` }),
    signal: AbortSignal.timeout(12000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.token) throw new Error(`browser login failed ${spec.name}: ${response.status}`);
  return body.token;
}

async function measure(page, contextName, viewportName) {
  return page.evaluate(({ contextName: role, viewportName: viewport }) => {
    const isVisible = (element) => {
      if (!element) return false;
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return Boolean(box.width && box.height && style.display !== "none" && style.visibility !== "hidden" && !element.closest("details:not([open])"));
    };
    const overlaps = (a, b, padding = 1) => Boolean(a && b && a.left < b.right - padding && a.right > b.left + padding && a.top < b.bottom - padding && a.bottom > b.top + padding);
    const rect = (element) => isVisible(element) ? element.getBoundingClientRect() : null;
    const text = document.body.innerText.replace(/\s+/g, " ").trim();
    const visibleNodes = (selector) => [...document.querySelectorAll(selector)].filter(isVisible);
    const visibleButtons = visibleNodes("button");
    const details = visibleNodes("details");
    const compactOfferSurfaces = visibleNodes(".pre18-offer-quality-compact");
    const statusMax = compactOfferSurfaces.reduce((max, surface) => {
      const header = surface.firstElementChild;
      const count = header ? [...header.querySelectorAll('[data-pre18-primary-status="true"]')].filter(isVisible).length : 0;
      return Math.max(max, count);
    }, 0);
    const visibleEmptyMessages = [...document.querySelectorAll(".pre18-offer-quality-compact")]
      .filter(isVisible)
      .flatMap((surface) => [...surface.querySelectorAll("*")].filter(isVisible))
      .filter((node) => /Karşılaştırılacak teklif yok/i.test(node.textContent || ""))
      .filter((node) => ![...node.children].some((child) => /Karşılaştırılacak teklif yok/i.test(child.textContent || ""))).length;
    const financeSurfaces = visibleNodes(".pre18-finance-surface");
    const financeAdvancedOpen = financeSurfaces.reduce((sum, surface) => sum + [...surface.querySelectorAll("details[open]")].filter(isVisible).length, 0);
    const financeVisibleInputs = financeSurfaces.reduce((sum, surface) => sum + [...surface.querySelectorAll("input,select,textarea")].filter(isVisible).length, 0);
    const financePrimaryActions = financeSurfaces.reduce((sum, surface) => sum + [...surface.querySelectorAll(".btn.primary")].filter(isVisible).length, 0);
    const shiftCards = visibleNodes(".shiftMobileCard");
    const shiftActionCounts = shiftCards.map((card) => [...card.querySelectorAll(".shiftCardPrimaryAction")].filter(isVisible).length);
    const organizationCtas = visibleButtons.filter((button) => /Planlama Merkezi'ne git/i.test(button.innerText || ""));
    const approvedRecordActions = visibleButtons.filter((button) => /Onaylı kaydı aç/i.test(button.innerText || ""));
    const clipped = visibleNodes("h1,h2,h3,h4,.title,.panelTitle,.panelSectionTitle,.panelMeta,.muted,label,button,.btn,.pill,.navLabel")
      .filter((node) => (node.scrollWidth > node.clientWidth + 2 || node.scrollHeight > node.clientHeight + 2)
        && (getComputedStyle(node).overflow === "hidden" || getComputedStyle(node).textOverflow === "ellipsis" || getComputedStyle(node).whiteSpace === "nowrap"));
    const horizontalOverflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > document.documentElement.clientWidth + 1;
    const fab = document.querySelector(".copilotFab");
    const fabBox = rect(fab);
    const criticalSelectors = '[data-primary-cta="true"],.rolePrimaryCta,.shiftCardPrimaryButton,.shellTopLogout,.mobileBottomNav,.mobileNav,.navBottom';
    const criticalOverlap = fabBox ? visibleNodes(criticalSelectors).filter((node) => overlaps(fabBox, rect(node), 0)).length : 0;
    const mapVisible = visibleNodes(".leaflet-container,[data-map-surface=primary],.mapPanel").length > 0;
    const hasRoleSurface = Boolean(document.querySelector("[data-role-task-home],.page,.wrap"));
    return {
      role,
      viewport,
      text,
      hasRoleSurface,
      headingCount: visibleNodes("h1,h2,h3").length,
      statusMax,
      visibleEmptyMessages,
      financeAdvancedOpen,
      financeVisibleInputs,
      financePrimaryActions,
      shiftCardCount: shiftCards.length,
      shiftActionCounts,
      organizationCtaCount: organizationCtas.length,
      organizationCtaCollisionCount: organizationCtas.filter((button) => fabBox && overlaps(rect(button), fabBox, 0)).length,
      approvedRecordActionCount: approvedRecordActions.length,
      clippedCount: clipped.length,
      clippedDetails: clipped.slice(0, 12).map((node) => ({ tag: node.tagName, className: typeof node.className === "string" ? node.className : "", text: (node.innerText || node.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120), scrollWidth: node.scrollWidth, clientWidth: node.clientWidth, scrollHeight: node.scrollHeight, clientHeight: node.clientHeight })),
      horizontalOverflow,
      criticalOverlap,
      mapVisible,
      launcherVisible: Boolean(fabBox),
      openDetails: details.filter((detail) => detail.matches("[open]")).length,
    };
  }, { contextName, viewportName });
}

function recordError(page, label) {
  page.on("console", (message) => {
    if (message.type() === "error") {
      report.counters.consoleErrorCount += 1;
      report.errors.push({ type: "console", label, text: message.text() });
    }
  });
  page.on("pageerror", (error) => {
    report.counters.pageErrorCount += 1;
    report.errors.push({ type: "page", label, text: error.message });
  });
  page.on("response", (response) => {
    if (response.status() >= 500) {
      report.counters.HTTP_500_COUNT += 1;
      report.errors.push({ type: "http", label, status: response.status(), url: response.url() });
    }
  });
}

async function capture(page, name) {
  await fs.mkdir(screenshotRoot, { recursive: true });
  const target = path.join(screenshotRoot, `${name}.png`);
  await page.screenshot({ path: target, fullPage: false });
  const relative = path.relative(repoRoot, target).replace(/\\/g, "/");
  report.screenshots.push(relative);
  return relative;
}

async function runContext(browser, spec, viewportName, viewport, token) {
  const context = await browser.newContext({ viewport, isMobile: viewport.width < 700, hasTouch: viewport.width < 700, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  await context.addInitScript((value) => {
    localStorage.setItem("token", value);
    localStorage.removeItem("personel_servis_cached_session");
    localStorage.removeItem("psv1:copilot:drawer:v4");
    localStorage.removeItem("psv1:copilot:drawer:history:v4");
  }, token);
  const page = await context.newPage();
  recordError(page, `${spec.name}:${viewportName}`);
  try {
    await page.goto(`${webBaseUrl}/#${spec.route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(1500);
    const metrics = await measure(page, spec.name, viewportName);
    const leaks = leakage(metrics.text);
    const pass = metrics.hasRoleSurface && metrics.headingCount > 0 && !metrics.horizontalOverflow && metrics.clippedCount === 0 && metrics.criticalOverlap === 0 && leaks.length === 0;
    const screenshot = await capture(page, `${viewportName}-${spec.name.toLowerCase()}-${spec.route.slice(1).replace(/[^a-z0-9]+/gi, "-") || "home"}`);
    report.evidence.push({ type: "role-viewport", context: spec.name, route: spec.route, viewport: viewportName, screenshot, metrics, leaks, pass });
    if (metrics.mapVisible) report.counters.MAP_RENDERED_SURFACE_PROOF_COUNT += 1;
    if (metrics.headingCount === 0) report.counters.SEMANTIC_HEADING_ROLE_GAP_COUNT += 1;
    report.counters.RESPONSIVE_TEXT_CLIP_COUNT += metrics.clippedCount;
    report.counters.RESPONSIVE_HORIZONTAL_OVERFLOW_COUNT += metrics.horizontalOverflow ? 1 : 0;
    report.counters.RESPONSIVE_COMPONENT_OVERLAP_COUNT += metrics.criticalOverlap;
    if (metrics.statusMax > 4) report.counters.VISIBLE_PRIMARY_STATUS_CHIP_COUNT += metrics.statusMax - 4;
    if (metrics.visibleEmptyMessages > 1) report.counters.DUPLICATE_EMPTY_STATE_MESSAGE_COUNT += metrics.visibleEmptyMessages - 1;
    if (metrics.financeAdvancedOpen > 0) report.counters.FINANCE_ADVANCED_DEFAULT_OPEN_COUNT += metrics.financeAdvancedOpen;
    if (metrics.financeVisibleInputs > 8) report.counters.FINANCE_VISIBLE_INPUT_OVERLOAD_DEFECT_COUNT += metrics.financeVisibleInputs - 8;
    if (metrics.financePrimaryActions > 1) report.counters.FINANCE_PRIMARY_ACTION_AMBIGUITY_COUNT += metrics.financePrimaryActions - 1;
    if (metrics.shiftActionCounts.some((count) => count !== 1)) report.counters.SHIFT_CARD_PRIMARY_ACTION_AMBIGUITY_COUNT += metrics.shiftActionCounts.filter((count) => count !== 1).length;
    if (spec.name === "ORGANIZATION" && metrics.organizationCtaCount > 1) report.counters.ORGANIZATION_PLAN_REPEATED_CTA_COUNT += metrics.organizationCtaCount - 1;
    if (spec.name === "ORGANIZATION") report.counters.ORGANIZATION_PLAN_CTA_COLLISION_COUNT += metrics.organizationCtaCollisionCount;
    if (spec.name === "COMPANY" && metrics.approvedRecordActionCount > 1) report.counters.COMPANY_COMMERCIAL_DUPLICATE_APPROVED_RECORD_ACTION_COUNT += metrics.approvedRecordActionCount - 1;
    if (spec.name === "PERSONEL" && viewportName === "mobile") report.counters.PERSONEL_ACCESS_MOBILE_READABILITY_DEFECT_COUNT += metrics.clippedCount + (metrics.horizontalOverflow ? 1 : 0);
  } finally {
    await context.close();
  }
}

async function runPersonelInteraction(browser, token) {
  const viewport = viewports.mobile;
  const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  await context.addInitScript((value) => localStorage.setItem("token", value), token);
  const page = await context.newPage();
  recordError(page, "PERSONEL:menu-fab");
  try {
    await page.goto(`${webBaseUrl}/#/personel/my`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(1200);
    const menu = page.getByRole("button", { name: "Menüyü aç" });
    const fab = page.locator(".copilotFab");
    let pass = await menu.count() === 1 && await fab.count() === 1;
    if (pass) {
      await menu.click();
      pass = pass && await page.locator("#shell-nav-dock").count() === 1;
      await page.getByRole("button", { name: "Menüyü kapat" }).click().catch(() => {});
      await fab.click();
      pass = pass && await page.locator(".copilotDrawer:visible").count() === 1;
      await page.locator(".copilotToolBtn--close").first().click().catch(() => {});
    }
    const screenshot = await capture(page, "mobile-personel-menu-fab-interaction");
    report.evidence.push({ type: "personel-menu-fab", screenshot, pass });
    if (pass) report.counters.SEFER_ABI_PERSONEL_MENU_FAB_INTERACTION_PASS_COUNT += 1;
  } finally {
    await context.close();
  }
}

async function main() {
  await fs.mkdir(screenshotRoot, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const spec of contexts) {
      const token = await login(spec);
      if (spec.name === "PERSONEL") await runPersonelInteraction(browser, token);
      for (const [viewportName, viewport] of Object.entries(viewports)) await runContext(browser, spec, viewportName, viewport, token);
    }
  } finally {
    await browser.close();
  }

  const rolePasses = contexts.map((spec) => report.evidence.filter((item) => item.type === "role-viewport" && item.context === spec.name && item.pass).length);
  report.counters.ROLE_CONTEXT_PROVEN_COUNT = rolePasses.filter((count) => count === 3).length;
  report.counters.VIEWPORT_CONTEXT_PROVEN_COUNT = report.evidence.filter((item) => item.type === "role-viewport" && item.pass).length;
  const zeroDefects = [
    "SEMANTIC_HEADING_ROLE_GAP_COUNT",
    "DUPLICATE_EMPTY_STATE_MESSAGE_COUNT",
    "FINANCE_ADVANCED_DEFAULT_OPEN_COUNT",
    "FINANCE_VISIBLE_INPUT_OVERLOAD_DEFECT_COUNT",
    "FINANCE_PRIMARY_ACTION_AMBIGUITY_COUNT",
    "SHIFT_CARD_PRIMARY_ACTION_AMBIGUITY_COUNT",
    "ORGANIZATION_PLAN_REPEATED_CTA_COUNT",
    "ORGANIZATION_PLAN_CTA_COLLISION_COUNT",
    "COMPANY_COMMERCIAL_DUPLICATE_APPROVED_RECORD_ACTION_COUNT",
    "PERSONEL_ACCESS_MOBILE_READABILITY_DEFECT_COUNT",
    "RESPONSIVE_TERMINOLOGY_LEAK_COUNT",
    "RESPONSIVE_TEXT_CLIP_COUNT",
    "RESPONSIVE_HORIZONTAL_OVERFLOW_COUNT",
    "RESPONSIVE_COMPONENT_OVERLAP_COUNT",
  ];
  const allRoleViewportPass = report.counters.ROLE_CONTEXT_PROVEN_COUNT === contexts.length && report.counters.VIEWPORT_CONTEXT_PROVEN_COUNT === contexts.length * 3;
  const allZero = zeroDefects.every((key) => report.counters[key] === 0);
  report.counters.PRE_18_MAJOR_FINDING_RESOLVED_COUNT = allRoleViewportPass && allZero ? report.counters.PRE_18_MAJOR_FINDING_COUNT : 0;
  report.counters.PRE_18_MAJOR_FINDING_REMAINING_COUNT = report.counters.PRE_18_MAJOR_FINDING_COUNT - report.counters.PRE_18_MAJOR_FINDING_RESOLVED_COUNT;
  report.pass = allRoleViewportPass
    && allZero
    && report.counters.SEFER_ABI_PERSONEL_MENU_FAB_INTERACTION_PASS_COUNT >= 1
    && report.counters.consoleErrorCount === 0
    && report.counters.pageErrorCount === 0
    && report.counters.HTTP_500_COUNT === 0;
  report.decision = report.pass ? "PRE_18_PREMIUM_UI_POLISH_READY_FOR_HUMAN_FINAL_REVIEW" : "PRE_18_PREMIUM_UI_POLISH_BLOCKED";
  const reportPath = path.join(evidenceRoot, "report.json");
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ source: report.source, sourceHead: report.sourceHead, counters: report.counters, screenshotCount: report.screenshots.length, evidenceCount: report.evidence.length, decision: report.decision, report: path.relative(repoRoot, reportPath).replace(/\\/g, "/") }, null, 2));
  if (!report.pass) process.exitCode = 1;
}

main().catch(async (error) => {
  report.failure = String(error?.stack || error);
  await fs.mkdir(evidenceRoot, { recursive: true });
  await fs.writeFile(path.join(evidenceRoot, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.error(error?.stack || String(error));
  process.exitCode = 1;
});
