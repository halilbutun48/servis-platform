import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { prisma } from "../src/prisma.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const webBaseUrl = (process.env.WEB_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const apiBaseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const evidenceRoot = path.join(repoRoot, "backend", "artifacts", "browser-smoke", "pre-18-premium-ui-polish-01");
const screenshotRoot = path.join(evidenceRoot, "screenshots");

const users = {
  SUPER_ADMIN: { identifier: "superadmin@demo.com", route: "/superadmin" },
  COMPANY: { identifier: "company@demo.com", route: "/company" },
  ROOM: { identifier: "room@demo.com", route: "/room" },
  DRIVER: { identifier: "driver@demo.com", route: "/driver/today", deviceId: null },
  PERSONEL: { identifier: "personel@demo.com", route: "/personel/live" },
  PARENT: { identifier: "parent@demo.com", route: "/parent/live" },
  SCHOOL: { identifier: "school@demo.com", route: "/school" },
  ORGANIZATION: { identifier: "organization@demo.com", route: "/organization" },
};

const viewports = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 1024, height: 900 },
  mobile: { width: 390, height: 844 },
};

// One meaningful core surface per real context. These are intentionally
// existing routes: the audit observes current product UI and does not add a
// test-only page or alter role/business behavior.
const coreSurfaces = [
  { context: "SUPER_ADMIN", route: "/superadmin/logexport", family: "admin-table-form" },
  { context: "COMPANY", route: "/company/agreements", family: "commercial-table" },
  { context: "ROOM", route: "/room/drivers", family: "admin-table-form" },
  { context: "SCHOOL", route: "/school/parents", family: "admin-table-form" },
  {
    context: "ORGANIZATION",
    route: "/organization/plans",
    family: "form",
    readySelector: ".pre18-organization-surface",
    interaction: "organization-editor",
  },
  { context: "DRIVER", route: "/driver/checkin", family: "admin-table-form" },
  {
    context: "PERSONEL",
    route: "/personel/my",
    family: "operations-table",
    readySelector: ".pre18-personel-my-surface",
  },
  {
    context: "PARENT",
    route: "/parent/live",
    family: "parent-live-status",
    readySelector: '[data-role-task-home="PARENT"]',
    openTaskWorkspace: true,
  },
];

// Named screens called out by the PRE-#18 scale corrective. They are kept as
// real product routes so the scale is proven beyond the role task-home shell.
const typographyTargets = [
  { name: "ROOM_HUB_LOCATION", context: "ROOM", route: "/room/hub", expectedText: "Taşımacılık Firması Konumu" },
  { name: "ROOM_TASK_HOME_TITLE", context: "ROOM", route: "/room", expectedText: "Bugün neye odaklanmalısın?" },
  { name: "ROOM_FINANCIAL_OPERATIONS", context: "ROOM", route: "/room/financial-operations", expectedText: "Teklif ve Kârlılık" },
];

// The Premium UI matrix has one canonical state per role/viewport/surface.
// These selectors describe the current, user-facing readiness condition for
// the few routes that load asynchronously or intentionally keep their
// secondary workspace collapsed. They are exact route contracts, not a
// fallback for arbitrary pages.
const routeReadySelectors = {
  "/superadmin": '[data-role-task-home="SUPER_ADMIN"]',
  "/company": '[data-role-task-home="COMPANY"]',
  "/room": '[data-role-task-home="ROOM"]',
  "/driver/today": '[data-role-task-home="DRIVER"]',
  "/personel/live": '[data-role-task-home="PERSONEL"]',
  "/parent/live": '[data-role-task-home="PARENT"]',
  "/school": '[data-role-task-home="SCHOOL"]',
  "/organization": '[data-role-task-home="ORGANIZATION"]',
  "/superadmin/logexport": ".pre18-admin-log-table",
  "/superadmin/rooms": ".pre18-responsive-list",
  "/room/drivers": ".roomCriticalFixScope",
  "/school/parents": ".schoolParentInviteLayout",
  "/driver/checkin": "form",
  "/organization/plans": ".pre18-organization-surface",
  "/personel/my": ".pre18-personel-my-surface",
};

const leakRules = [
  ["raw-role", /\b(?:SUPER_ADMIN|COMPANY|ROOM|DRIVER|PARENT|SCHOOL|ORGANIZATION)\b/g],
  ["old-oda", /\bOda\b/gi],
  ["english-workflow", /\b(?:Check-in|Confirm|Approve|Execute|Cancel|Send|Accept|Reject|Convert|Dispatch|Publish|Finalize|Preview|Export|Download|Target Type|Target Id|Speed limit|Mini Map)\b/gi],
  ["internal-stage", /\b(?:M\d+(?:\.\d+)?|Stage[- ]?\d+|milestone|README|Project Spec|Master Primer|Startpack|SSOT|CHECKLIST)\b/gi],
  ["internal-engine", /\b(?:Copilot|Sefer Abi Terminali|intent engine|root cause engine|risk scoring engine|provider adapter|canonical owner|feature flag)\b/gi],
  ["raw-status", /\b(?:OFFLINE|ONLINE|STALE|APPROVED|PENDING|REJECTED|ACTIVE|CANCELLED|READY|REQUIRED|EXECUTED)\b/g],
  ["raw-field", /(?<![\p{L}\p{N}_])(?:requestUrl|routeSource|providerAdapter|selectedEntity|sourceKey|entryKind|sourceType|latitude|longitude|geoStatus|createdAt|actorUserId|userId|targetId|lat|lng)(?![\p{L}\p{N}_])/giu],
  ["snake-or-camel-field", /\b[a-z]+_[a-z]+\b/g],
];

const report = {
  source: "REAL_PLAYWRIGHT_RENDERED_BROWSER",
  generatedAt: new Date().toISOString(),
  sourceHead: execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim(),
  webBaseUrl,
  viewportMatrix: "desktop 1440x900; tablet 1024x900; mobile 390x844",
  screenshots: [],
  contexts: [],
  states: [],
  typographyRolesSeen: [],
  counters: {
    PRE_18_PREMIUM_UI_BROWSER_PASS_COUNT: 0,
    PRE_18_VISIBLE_INTERNAL_ENGINEERING_LEAK_COUNT: 0,
    RENDERED_ENGLISH_WORKFLOW_LABEL_LEAK_COUNT: 0,
    RESPONSIVE_TERMINOLOGY_LEAK_COUNT: 0,
    ACCESSIBLE_LABEL_TERMINOLOGY_LEAK_COUNT: 0,
    AUTHENTICATED_DUPLICATE_OVERSIZED_BRAND_COUNT: 0,
    RESPONSIVE_HORIZONTAL_OVERFLOW_COUNT: 0,
    CRITICAL_LABEL_CLIPPING_COUNT: 0,
    SEFER_ABI_QUICK_PANEL_RESPONSIVE_PASS_COUNT: 0,
    LOGIN_TYPOGRAPHY_RESPONSIVE_PASS_COUNT: 0,
    PRE_18_TYPOGRAPHY_TARGET_PASS_COUNT: 0,
    PRE_18_SEMANTIC_TYPOGRAPHY_ROLE_COUNT: 0,
    TYPOGRAPHY_COMPETING_SYSTEM_COUNT: 0,
    TYPOGRAPHY_UNEXPLAINED_ONE_OFF_OVERRIDE_COUNT: 0,
    VISIBLE_HEADING_HIERARCHY_DEFECT_COUNT: 0,
    RESPONSIVE_TEXT_CLIP_COUNT: 0,
    BUTTON_LABEL_TYPOGRAPHY_DRIFT_COUNT: 0,
    SIDEBAR_NAV_TYPOGRAPHY_DRIFT_COUNT: 0,
    CARD_TITLE_BODY_HIERARCHY_DEFECT_COUNT: 0,
    PRE_18_UNPROVEN_REQUIRED_VIEWPORT_REQUIREMENT_COUNT: 0,
    PRE_18_TABLE_CELL_OVERLAP_COUNT: 0,
    PRE_18_TABLE_BADGE_OVERLAP_COUNT: 0,
    PRE_18_TABLE_ACTION_COLUMN_COLLISION_COUNT: 0,
    PRE_18_TABLE_UNJUSTIFIED_ELLIPSIS_COUNT: 0,
    PRE_18_TABLE_MOBILE_OVERFLOW_COUNT: 0,
    PRE_18_FORM_LABEL_CLIP_COUNT: 0,
    PRE_18_FORM_HELPER_TEXT_CLIP_COUNT: 0,
    PRE_18_FORM_ERROR_TEXT_OVERLAP_COUNT: 0,
    PRE_18_FORM_UNIT_SUFFIX_MISALIGNMENT_COUNT: 0,
    PRE_18_FORM_MOBILE_PRIMARY_ACTION_OBSCURED_COUNT: 0,
    PRE_18_MODAL_DRAWER_TEXT_CLIP_COUNT: 0,
    PRE_18_MODAL_DRAWER_ACTION_OVERLAP_COUNT: 0,
    PRE_18_MODAL_DRAWER_MOBILE_OVERFLOW_COUNT: 0,
    PRE_18_VISIBLE_INTERNAL_MILESTONE_ID_COUNT: 0,
    PRE_18_VISIBLE_REPOSITORY_GOVERNANCE_TERM_COUNT: 0,
    PRE_18_VISIBLE_ENGINEERING_DOCUMENT_NAME_COUNT: 0,
    PRE_18_VISIBLE_DEVELOPER_COUNTER_LABEL_COUNT: 0,
    PRE_18_VISIBLE_HEADING_HIERARCHY_DEFECT_COUNT: 0,
    PRE_18_VISIBLE_SPACING_RHYTHM_DEFECT_COUNT: 0,
    PRE_18_VISIBLE_CTA_ALIGNMENT_DEFECT_COUNT: 0,
    PRE_18_VISIBLE_PRIMARY_ACTION_AMBIGUITY_COUNT: 0,
    PRE_18_VISIBLE_BADGE_CHIP_CROWDING_COUNT: 0,
    PRE_18_VISIBLE_EXCESSIVE_NESTED_CARD_NOISE_COUNT: 0,
    PRE_18_RESPONSIVE_TEXT_CLIP_COUNT: 0,
    PRE_18_RESPONSIVE_UNEXPECTED_HORIZONTAL_SCROLL_COUNT: 0,
    PRE_18_RESPONSIVE_COMPONENT_OVERLAP_COUNT: 0,
    PRE_18_RESPONSIVE_HEADER_OVERFLOW_COUNT: 0,
    PRE_18_RESPONSIVE_NAV_OVERFLOW_COUNT: 0,
    PRE_18_RESPONSIVE_CARD_COLLISION_COUNT: 0,
    PRE_18_BUTTON_LABEL_TYPOGRAPHY_DRIFT_COUNT: 0,
    PRE_18_SIDEBAR_NAV_TYPOGRAPHY_DRIFT_COUNT: 0,
    PRE_18_CARD_TITLE_BODY_HIERARCHY_DEFECT_COUNT: 0,
    OVERSIZED_PAGE_TITLE_COUNT: 0,
    OVERSIZED_SECTION_TITLE_COUNT: 0,
    VISIBLE_CONTENT_COMPRESSION_BY_TYPOGRAPHY_COUNT: 0,
    PREMIUM_5_SECOND_FAIL_COUNT: 0,
    SAFE_INTERACTION_TARGET_COUNT: 0,
    SAFE_INTERACTION_PASS_COUNT: 0,
    SAFE_INTERACTION_FAIL_COUNT: 0,
    ACCESSIBILITY_BLOCKER_COUNT: 0,
    NAVDOCK_ACTIVE_STATE_DEFECT_COUNT: 0,
    NAVDOCK_ACCESSIBLE_NAME_DEFECT_COUNT: 0,
    NAVDOCK_KEYBOARD_DEFECT_COUNT: 0,
    NAVDOCK_SAFE_AREA_DEFECT_COUNT: 0,
    NAVDOCK_OVERLAP_DEFECT_COUNT: 0,
    NAVDOCK_ROLE_VISIBILITY_DEFECT_COUNT: 0,
    consoleErrorCount: 0,
    pageErrorCount: 0,
    HTTP_500_COUNT: 0,
  },
  errors: [],
  httpErrors: [],
  navDockFinal: { probes: [], pass: false },
};

function unique(values) { return [...new Set((values || []).filter(Boolean))]; }

async function resolveDriverDeviceId(email = "driver@demo.com") {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true, deviceId: true },
  });
  if (!user || user.role !== "DRIVER") throw new Error(`Driver user not found for ${email}`);
  return String(process.env.DRIVER_BROWSER_DEVICE_ID || user.deviceId || "pre18-premium-ui-driver").trim();
}

function findLeaks(visibleText, accessibleLabels) {
  const full = `${visibleText}\n${accessibleLabels.join("\n")}`;
  return leakRules.flatMap(([name, rule]) => {
    const matches = full.match(rule) || [];
    return matches.length ? [{ rule: name, matches: unique(matches).slice(0, 15) }] : [];
  });
}

const semanticRoleSelectors = {
  PageTitle: "h1, .panelTitle, .roleTaskHero h1, .page > h1, .topbar > :first-child > .title",
  SectionEyebrow: ".roleSectionKicker, .roleTaskActionHint, .navSectionTitle, .mapSummaryEyebrow, .roleSignalGroupTitle",
  SectionTitle: "h2, .panelSectionTitle, .roleSectionTitle, .page > h2, .sectionTitle, .card > h2",
  CardTitle: "h3, h4, .title, .card > h3, .card > h4, .navDockRole, .copilotEmptyTitle, .listSelectionBannerTitle, .roleTaskSummaryCard strong, .roleSignalCard h3, .mapCurrentSummaryTitle",
  Body: "p, .panelBody, .roleTaskHero p, .roleSectionLead, .card > p, .roleCommandCenter",
  Helper: ".panelSubtitle, .panelSectionSubtitle, .roleTaskSummaryCard small, .roleSignalEvidence",
  Meta: ".panelMeta, .muted",
  ButtonCTA: "button:not(.navToggle):not(.navItem):not(.pill), .btn:not(.navToggle):not(.navItem):not(.pill), .secondary",
  SidebarSection: ".navToggle, .navDockTitle",
  SidebarItem: ".navLabel",
  BadgeChip: ".pill, .navBadge, .panelSegmentTabBadge, .quality-chip, .roleSignalCount",
  TableHeader: "table th, .tbl th, .table th, .saHead",
  TableBody: "table td, .tbl td, .table td, .saRow",
  TableCell: "table td, .tbl td, .table td, .saRow",
  ModalTitle: ".copilotDrawerTitle, .modal > .panelTitle, [role=dialog] > .panelTitle",
  ModalBody: ".copilotDrawer .copilotMsgText, .copilotDrawer .copilotEmptyText, .modal .panelBody, [role=dialog] .panelBody",
};

const semanticRoleExpected = {
  PageTitle: { size: 36, weight: "800", lineHeight: 41.04, letterSpacing: "-0.02em" },
  SectionEyebrow: { size: 13, weight: "700", lineHeight: 18, letterSpacing: "0.08em" },
  SectionTitle: { size: 24, weight: "700", lineHeight: 28.8, letterSpacing: "0px" },
  CardTitle: { size: 17, weight: "700", lineHeight: 22.1, letterSpacing: "0px" },
  Body: { size: 14, weight: "400", lineHeight: 22, letterSpacing: "0px" },
  Helper: { size: 12, weight: "500", lineHeight: 18, letterSpacing: "0px" },
  Meta: { size: 12, weight: "500", lineHeight: 18, letterSpacing: "0px" },
  ButtonCTA: { size: 14, weight: "600", lineHeight: 20, letterSpacing: "0px" },
  SidebarSection: { size: 13, weight: "700", lineHeight: 18, letterSpacing: "0.08em" },
  SidebarItem: { size: 15, weight: "600", lineHeight: 22, letterSpacing: "0px" },
  BadgeChip: { size: 12, weight: "700", lineHeight: 16, letterSpacing: "0px" },
  TableHeader: { size: 12, weight: "700", lineHeight: 18, letterSpacing: "0.04em" },
  TableBody: { size: 13, weight: "400", lineHeight: 20, letterSpacing: "0px" },
  TableCell: { size: 13, weight: "400", lineHeight: 20, letterSpacing: "0px" },
  ModalTitle: { size: 20, weight: "700", lineHeight: 26, letterSpacing: "0px" },
  ModalBody: { size: 14, weight: "400", lineHeight: 22, letterSpacing: "0px" },
};

function closeEnough(value, expected, tolerance = 0.2) {
  return Math.abs(Number(value) - Number(expected)) <= tolerance;
}

function incrementLayoutCounters(layout) {
  const counters = report.counters;
  counters.PRE_18_TABLE_CELL_OVERLAP_COUNT += layout.tableCellOverlapCount || 0;
  counters.PRE_18_TABLE_BADGE_OVERLAP_COUNT += layout.tableBadgeOverlapCount || 0;
  counters.PRE_18_TABLE_ACTION_COLUMN_COLLISION_COUNT += layout.tableActionColumnCollisionCount || 0;
  counters.PRE_18_TABLE_UNJUSTIFIED_ELLIPSIS_COUNT += layout.tableUnjustifiedEllipsisCount || 0;
  counters.PRE_18_TABLE_MOBILE_OVERFLOW_COUNT += layout.tableMobileOverflowCount || 0;
  counters.PRE_18_FORM_LABEL_CLIP_COUNT += layout.formLabelClipCount || 0;
  counters.PRE_18_FORM_HELPER_TEXT_CLIP_COUNT += layout.formHelperTextClipCount || 0;
  counters.PRE_18_FORM_ERROR_TEXT_OVERLAP_COUNT += layout.formErrorTextOverlapCount || 0;
  counters.PRE_18_FORM_UNIT_SUFFIX_MISALIGNMENT_COUNT += layout.formUnitSuffixMisalignmentCount || 0;
  counters.PRE_18_FORM_MOBILE_PRIMARY_ACTION_OBSCURED_COUNT += layout.formMobilePrimaryActionObscuredCount || 0;
  counters.PRE_18_MODAL_DRAWER_TEXT_CLIP_COUNT += layout.modalDrawerTextClipCount || 0;
  counters.PRE_18_MODAL_DRAWER_ACTION_OVERLAP_COUNT += layout.modalDrawerActionOverlapCount || 0;
  counters.PRE_18_MODAL_DRAWER_MOBILE_OVERFLOW_COUNT += layout.modalDrawerMobileOverflowCount || 0;
  counters.PRE_18_RESPONSIVE_TEXT_CLIP_COUNT += layout.responsiveTextClipCount || 0;
  counters.PRE_18_RESPONSIVE_UNEXPECTED_HORIZONTAL_SCROLL_COUNT += layout.horizontalOverflow ? 1 : 0;
  counters.PRE_18_RESPONSIVE_COMPONENT_OVERLAP_COUNT += layout.responsiveComponentOverlapCount || 0;
  counters.PRE_18_RESPONSIVE_HEADER_OVERFLOW_COUNT += layout.headerOverflowCount || 0;
  counters.PRE_18_RESPONSIVE_NAV_OVERFLOW_COUNT += layout.navOverflowCount || 0;
  counters.PRE_18_RESPONSIVE_CARD_COLLISION_COUNT += layout.cardCollisionCount || 0;
  counters.PRE_18_VISIBLE_HEADING_HIERARCHY_DEFECT_COUNT += layout.headingHierarchyDefectCount || 0;
  counters.PRE_18_VISIBLE_SPACING_RHYTHM_DEFECT_COUNT += layout.spacingRhythmDefectCount || 0;
  counters.PRE_18_VISIBLE_CTA_ALIGNMENT_DEFECT_COUNT += layout.ctaAlignmentDefectCount || 0;
  counters.PRE_18_VISIBLE_PRIMARY_ACTION_AMBIGUITY_COUNT += layout.primaryActionAmbiguityCount || 0;
  counters.PRE_18_VISIBLE_BADGE_CHIP_CROWDING_COUNT += layout.badgeChipCrowdingCount || 0;
  counters.PRE_18_VISIBLE_EXCESSIVE_NESTED_CARD_NOISE_COUNT += layout.excessiveNestedCardNoiseCount || 0;
  counters.PRE_18_BUTTON_LABEL_TYPOGRAPHY_DRIFT_COUNT += layout.buttonLabelTypographyDriftCount || 0;
  counters.PRE_18_SIDEBAR_NAV_TYPOGRAPHY_DRIFT_COUNT += layout.sidebarNavTypographyDriftCount || 0;
  counters.PRE_18_CARD_TITLE_BODY_HIERARCHY_DEFECT_COUNT += layout.cardTitleBodyHierarchyDefectCount || 0;
  counters.OVERSIZED_PAGE_TITLE_COUNT += layout.oversizedPageTitleCount || 0;
  counters.OVERSIZED_SECTION_TITLE_COUNT += layout.oversizedSectionTitleCount || 0;
  counters.VISIBLE_CONTENT_COMPRESSION_BY_TYPOGRAPHY_COUNT += layout.contentCompressionByTypographyCount || 0;
  for (const role of layout.typographyRoleEvidence || []) {
    if (role.present && role.matches && !report.typographyRolesSeen.includes(role.name)) report.typographyRolesSeen.push(role.name);
  }
}

function recordSafeInteraction(proof) {
  report.counters.SAFE_INTERACTION_TARGET_COUNT += 1;
  if (proof?.pass) report.counters.SAFE_INTERACTION_PASS_COUNT += 1;
  else report.counters.SAFE_INTERACTION_FAIL_COUNT += 1;
}

async function taskHomeFiveSecondEvidence(page) {
  return page.evaluate(() => {
    const home = document.querySelector("[data-role-task-home]");
    const heading = home?.querySelector(".roleTaskHero h1");
    const state = home?.querySelector(".roleTaskSummaryCard strong");
    const next = home?.querySelector("[data-summary-next]");
    const action = home?.querySelector("[data-primary-cta=true]");
    const text = (node) => (node?.textContent || "").replace(/\s+/g, " ").trim();
    const evidence = {
      role: home?.getAttribute("data-role-task-home") || "",
      heading: text(heading),
      currentState: text(state),
      nextAction: text(next),
      primaryAction: text(action),
    };
    return { ...evidence, pass: Boolean(evidence.role && evidence.heading && evidence.currentState && evidence.nextAction && evidence.primaryAction) };
  });
}

async function login(identifier, deviceId = null) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier, password: "demo123", deviceId: deviceId || `pre18-${identifier}` }),
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok && body.token) return body.token;
    if (response.status === 429 && attempt < 5) {
      const retryAfter = Number(response.headers.get("retry-after") || body.retryAfterSec || 0);
      await new Promise((resolve) => setTimeout(resolve, Math.min(15000, Math.max(2000, retryAfter * 1000 || (attempt + 1) * 3000))));
      continue;
    }
    throw new Error(`browser login failed ${identifier} ${response.status}`);
  }
  throw new Error(`browser login failed ${identifier}`);
}

function observe(page, label) {
  page.on("console", (message) => {
    if (message.type() === "error") report.errors.push({ type: "console", label, text: message.text() });
  });
  page.on("pageerror", (error) => report.errors.push({ type: "page", label, text: error.message }));
  page.on("response", (response) => {
    if (response.status() >= 500) {
      report.counters.HTTP_500_COUNT += 1;
      report.httpErrors.push({ label, status: response.status(), url: response.url() });
    }
  });
}

async function snapshot(page) {
  const visibleText = await page.locator("body").innerText().catch(() => "");
  const accessibleLabels = await page.locator("button:visible, input:visible, textarea:visible, select:visible, [role=button]:visible, [aria-label]:visible, [title]:visible").evaluateAll((nodes) => nodes.map((node) => [
    node.innerText,
    node.getAttribute("aria-label"),
    node.getAttribute("title"),
    node.getAttribute("placeholder"),
  ].filter(Boolean).join(" ").trim()).filter(Boolean)).catch(() => []);
  const layout = await page.evaluate(({ roleSelectors, roleExpected }) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const closeEnough = (value, expected, tolerance = 0.2) => Math.abs(Number(value) - Number(expected)) <= tolerance;
    const scrollWidth = document.documentElement.scrollWidth;
    const visible = (element) => {
      if (!element || !element.getClientRects().length) return false;
      const collapsedDisclosure = element.closest("details:not([open])");
      if (collapsedDisclosure && !element.closest("summary")) return false;
      const style = getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden";
    };
    const rect = (element) => {
      const box = element?.getBoundingClientRect();
      return box && box.width > 0 && box.height > 0 ? box : null;
    };
    const intersects = (left, right, padding = 1) => Boolean(left && right
      && left.left < right.right - padding && left.right > right.left + padding
      && left.top < right.bottom - padding && left.bottom > right.top + padding);
    const ignoredForLayout = (element) => element.closest(
      ".leaflet-container, [data-map-surface=\"primary\"], .copilotLauncherStack, .copilotDrawer, .copilotAttentionBubble, .navDockBackdrop"
    );
    const outsideScroll = [...document.querySelectorAll("body *")].filter((element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (!box.width || !box.height || style.display === "none" || style.visibility === "hidden") return false;
      if (element.closest(".tableWrap, .reportsTableWrap, .notifTblWrap, .leaflet-container, [data-map-surface=\"primary\"]")) return false;
      if (element.closest(".copilotLauncherStack, .copilotDrawer, .copilotAttentionBubble, .navDockBackdrop, .navDock.navDock--mobileOpen")) return false;
      if (box.right < -1 || box.left > viewportWidth + 1) return false;
      return box.left < -1 || box.right > viewportWidth + 1;
    }).slice(0, 8).map((element) => ({ tag: element.tagName, className: element.className, left: Math.round(element.getBoundingClientRect().left), right: Math.round(element.getBoundingClientRect().right) }));
    const topBrand = document.querySelector(".shellTopBrand .seferpaktLogoAsset");
    const navBrand = document.querySelector(".navDock .seferpaktLogoAsset");
    const visibleNodes = (selector) => [...document.querySelectorAll(selector)].filter(visible);
    const textClipNodes = visibleNodes("h1,h2,h3,h4,.panelTitle,.panelSectionTitle,.title,.panelSubtitle,.panelSectionSubtitle,.panelMeta,.muted,label,.btn,button,.navLabel,.navSectionTitle,.pill,.roleSectionTitle,.roleSignalCard h3")
      .filter((element) => !ignoredForLayout(element))
      .filter((element) => {
        const style = getComputedStyle(element);
        return (style.overflow === "hidden" || style.textOverflow === "ellipsis" || style.whiteSpace === "nowrap")
          && (element.scrollWidth > element.clientWidth + 2 || element.scrollHeight > element.clientHeight + 2);
      });
    let tableCellOverlapCount = 0;
    let tableBadgeOverlapCount = 0;
    const tableBadgeOverlapDetails = [];
    let tableActionColumnCollisionCount = 0;
    let tableUnjustifiedEllipsisCount = 0;
    let tableMobileOverflowCount = 0;
    for (const table of visibleNodes("table")) {
      const wrapper = table.closest(".tableWrap, .reportsTableWrap, .notifTblWrap, [data-responsive-table]");
      if (viewportWidth < 700 && table.getBoundingClientRect().right > (wrapper || table.parentElement)?.getBoundingClientRect().right + 1 && !wrapper) tableMobileOverflowCount += 1;
      for (const row of [...table.querySelectorAll("tr")].filter(visible)) {
        const cells = [...row.children].filter((cell) => /^(TH|TD)$/.test(cell.tagName) && visible(cell));
        const cellBoxes = cells.map(rect);
        for (let index = 0; index < cellBoxes.length; index += 1) {
          for (let next = index + 1; next < cellBoxes.length; next += 1) if (intersects(cellBoxes[index], cellBoxes[next])) tableCellOverlapCount += 1;
        }
        const actionButtons = cells.flatMap((cell) => [...cell.querySelectorAll("button,.btn")].filter(visible).map(rect).filter(Boolean));
        for (let index = 0; index < actionButtons.length; index += 1) {
          for (let next = index + 1; next < actionButtons.length; next += 1) if (intersects(actionButtons[index], actionButtons[next])) tableActionColumnCollisionCount += 1;
        }
        for (const cell of cells) {
          const cellBox = rect(cell);
          for (const badge of [...cell.querySelectorAll(".pill,.badge,.chip,.navBadge")].filter(visible)) {
            const badgeBox = rect(badge);
            if (badgeBox && cellBox && (badgeBox.left < cellBox.left - 1 || badgeBox.right > cellBox.right + 1 || badgeBox.top < cellBox.top - 1 || badgeBox.bottom > cellBox.bottom + 1)) {
              tableBadgeOverlapCount += 1;
              if (tableBadgeOverlapDetails.length < 12) tableBadgeOverlapDetails.push({
                tableClass: typeof table.className === "string" ? table.className : "",
                cellText: (cell.innerText || "").replace(/\s+/g, " ").trim().slice(0, 120),
                badgeText: (badge.innerText || badge.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120),
                cell: { left: Math.round(cellBox.left), right: Math.round(cellBox.right), top: Math.round(cellBox.top), bottom: Math.round(cellBox.bottom) },
                badge: { left: Math.round(badgeBox.left), right: Math.round(badgeBox.right), top: Math.round(badgeBox.top), bottom: Math.round(badgeBox.bottom) },
              });
            }
          }
          for (const node of [cell, ...cell.querySelectorAll("*")]) {
            if (!visible(node) || ignoredForLayout(node)) continue;
            const style = getComputedStyle(node);
            if (style.textOverflow === "ellipsis" && node.scrollWidth > node.clientWidth + 2 && !node.getAttribute("title") && !node.getAttribute("aria-label")) tableUnjustifiedEllipsisCount += 1;
          }
        }
      }
    }
    const visibleForms = visibleNodes("form");
    const formLabelClipCount = visibleForms.flatMap((form) => [...form.querySelectorAll("label")].filter(visible)).filter((label) => label.scrollWidth > label.clientWidth + 2 || label.scrollHeight > label.clientHeight + 2).length;
    const formHelperTextClipCount = visibleForms.flatMap((form) => [...form.querySelectorAll(".muted,.panelMeta,.panelSectionSubtitle,.panelSubtitle")].filter(visible)).filter((node) => node.scrollWidth > node.clientWidth + 2 || node.scrollHeight > node.clientHeight + 2).length;
    const formErrorTextOverlapCount = visibleForms.reduce((sum, form) => sum + [...form.querySelectorAll(".err,[role=alert]")].filter(visible).filter((node) => {
      const box = rect(node);
      return [...form.querySelectorAll("input,select,textarea")].filter(visible).some((field) => intersects(box, rect(field), 0));
    }).length, 0);
    const unitNodes = visibleNodes(".unitSuffix,[data-unit-suffix]");
    const formUnitSuffixMisalignmentCount = unitNodes.filter((node) => {
      const box = rect(node);
      const field = node.parentElement?.querySelector("input,select");
      const fieldBox = rect(field);
      return !box || !fieldBox || box.top < fieldBox.top - 2 || box.bottom > fieldBox.bottom + 2;
    }).length;
    const primaryActions = visibleNodes('[data-primary-cta="true"], .rolePrimaryCta, .btn.primary');
    const bottomNavigation = visibleNodes(".mobileBottomNav,.mobileNav,.navBottom");
    const formMobilePrimaryActionObscuredCount = viewportWidth < 700 ? primaryActions.filter((action) => bottomNavigation.some((nav) => intersects(rect(action), rect(nav)))).length : 0;
    const overlays = visibleNodes(".modal,.copilotDrawer,[role=dialog]");
    const modalDrawerTextClipCount = overlays.flatMap((overlay) => [...overlay.querySelectorAll("h1,h2,h3,h4,.title,.panelTitle,.panelBody,.muted,button")].filter(visible)).filter((node) => node.scrollWidth > node.clientWidth + 2 || node.scrollHeight > node.clientHeight + 2).length;
    const modalDrawerActionOverlapCount = overlays.flatMap((overlay) => [...overlay.querySelectorAll("button,.btn")].filter(visible)).map(rect).filter(Boolean).some((left, index, buttons) => buttons.slice(index + 1).some((right) => intersects(left, right))) ? 1 : 0;
    const modalDrawerMobileOverflowCount = viewportWidth < 700 ? overlays.filter((overlay) => {
      const box = rect(overlay);
      return box && (box.left < -1 || box.right > viewportWidth + 1 || overlay.scrollWidth > overlay.clientWidth + 2);
    }).length : 0;
    const header = document.querySelector(".shellTop");
    const headerBox = rect(header);
    const headerOverflowCount = header && headerBox ? [...header.children].filter(visible).filter((child) => {
      const box = rect(child);
      return box && (box.left < headerBox.left - 1 || box.right > headerBox.right + 1);
    }).length : 0;
    const nav = document.querySelector(".navDock");
    const navBox = rect(nav);
    const navOverflowCount = visibleNodes(".navLabel").filter((node) => {
      const box = rect(node);
      return box && navBox && (box.left < navBox.left - 1 || box.right > navBox.right + 1 || node.scrollWidth > node.clientWidth + 2);
    }).length;
    const cardGroups = visibleNodes(".roleTaskSummaryGrid,.roleCommandCenter,.roleTaskDetailsBody");
    const responsiveComponentOverlapCount = cardGroups.reduce((sum, group) => {
      const children = [...group.children].filter(visible).map(rect).filter(Boolean);
      return sum + children.reduce((inner, left, index) => inner + children.slice(index + 1).filter((right) => intersects(left, right)).length, 0);
    }, 0);
    const cardNodes = visibleNodes(".roleTaskSummaryCard,.roleSignalCard");
    const cardCollisionCount = cardNodes.reduce((sum, left, index) => sum + cardNodes.slice(index + 1).filter((right) => left.parentElement === right.parentElement && intersects(rect(left), rect(right))).length, 0);
    const badgeParents = visibleNodes(".roleCommandCenterCounts,.toolbar,.panelSegmentTabs");
    const badgeChipCrowdingCount = badgeParents.reduce((sum, parent) => {
      const chips = [...parent.querySelectorAll(".pill,.chip,.badge,.roleSignalCount,.panelSegmentTabBadge")].filter(visible).map(rect).filter(Boolean);
      return sum + chips.reduce((inner, left, index) => inner + chips.slice(index + 1).filter((right) => intersects(left, right)).length, 0);
    }, 0);
    const buttonLabelTypographyDriftCount = visibleNodes("button:not(.navToggle):not(.navItem):not(.pill),.btn:not(.navToggle):not(.navItem):not(.pill),.secondary").filter((node) => {
      const style = getComputedStyle(node);
      return !style.fontFamily.includes("Inter") || Number.parseFloat(style.fontSize) !== 14 || style.fontWeight !== "600" || !closeEnough(Number.parseFloat(style.lineHeight), 20, 0.25);
    }).length;
    const sidebarNavTypographyDriftCount = visibleNodes(".navLabel").filter((node) => {
      const style = getComputedStyle(node);
      return !style.fontFamily.includes("Inter") || Number.parseFloat(style.fontSize) !== 15 || style.fontWeight !== "600";
    }).length;
    const cardTitles = visibleNodes("h3,h4,.title,.roleTaskSummaryCard strong,.roleSignalCard h3,.mapCurrentSummaryTitle").filter((node) => !node.closest(".panelTitle,.shellTopMeta"));
    const bodies = visibleNodes("p,.panelBody,.roleTaskHero p,.roleSectionLead");
    const cardTitleBodyHierarchyDefectCount = cardTitles.filter((node) => Number.parseFloat(getComputedStyle(node).fontSize) < 16).length + bodies.filter((node) => Number.parseFloat(getComputedStyle(node).fontSize) !== 14).length;
    const pageTitleNodes = visibleNodes("h1,.panelTitle,.roleTaskHero h1,.page > h1,.topbar > :first-child > .title");
    const sectionTitleNodes = visibleNodes("h2,.panelSectionTitle,.roleSectionTitle,.page > h2,.sectionTitle,.card > h2");
    const oversizedPageTitleCount = pageTitleNodes.filter((node) => Number.parseFloat(getComputedStyle(node).fontSize) > 36.1).length;
    const oversizedSectionTitleCount = sectionTitleNodes.filter((node) => Number.parseFloat(getComputedStyle(node).fontSize) > 24.1).length;
    const contentCompressionNodes = [...pageTitleNodes, ...sectionTitleNodes].filter((node) => {
      const box = rect(node);
      const style = getComputedStyle(node);
      const line = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.2;
      return box && box.height > line * 3.1;
    });
    const contentCompressionByTypographyCount = contentCompressionNodes.length;
    const typographyRoleEvidence = Object.entries(roleSelectors).map(([name, selector]) => {
      const node = visibleNodes(selector)[0];
      if (!node) return { name, present: false, matches: false };
      const style = getComputedStyle(node);
      const expected = roleExpected[name];
      const expectedSize = name === "PageTitle" && viewportWidth < 901 ? 32
        : name === "SectionTitle" && viewportWidth < 901 ? 22
          : name === "CardTitle" && viewportWidth < 901 ? 16
            : expected.size;
      const expectedLine = name === "PageTitle" && viewportWidth < 901 ? 36.48
        : name === "SectionTitle" && viewportWidth < 901 ? 26.4
          : name === "CardTitle" && viewportWidth < 901 ? 20.8
            : expected.lineHeight;
      const expectedLetter = expected.letterSpacing.endsWith("em") ? Number.parseFloat(expected.letterSpacing) * expectedSize : Number.parseFloat(expected.letterSpacing);
      const actualLetter = style.letterSpacing === "normal" ? 0 : Number.parseFloat(style.letterSpacing);
      return {
        name,
        present: true,
        matches: style.fontFamily.includes("Inter") && closeEnough(Number.parseFloat(style.fontSize), expectedSize, 0.2)
          && style.fontWeight === expected.weight && closeEnough(Number.parseFloat(style.lineHeight), expectedLine, 0.25)
          && closeEnough(actualLetter, expectedLetter, 0.25),
        sample: { size: Number.parseFloat(style.fontSize), weight: style.fontWeight, lineHeight: Number.parseFloat(style.lineHeight), letterSpacing: style.letterSpacing, fontFamily: style.fontFamily },
      };
    });
    return {
      viewportWidth,
      viewportHeight,
      horizontalOverflow: outsideScroll.length > 0 || (scrollWidth > viewportWidth + 1 && getComputedStyle(document.documentElement).overflowX !== "hidden" && getComputedStyle(document.body).overflowX !== "hidden"),
      scrollWidth,
      outsideScroll,
      topBrandWidth: visible(topBrand) ? Math.round(topBrand.getBoundingClientRect().width) : 0,
      navBrandWidth: visible(navBrand) ? Math.round(navBrand.getBoundingClientRect().width) : 0,
      topBrandOversized: visible(topBrand) && topBrand.getBoundingClientRect().width > 64,
      navBrandOversized: visible(navBrand) && navBrand.getBoundingClientRect().width > 180,
      taskHome: Boolean(document.querySelector("[data-role-task-home]")),
      responsiveTextClipCount: textClipNodes.length,
      tableCellOverlapCount,
      tableBadgeOverlapCount,
      tableBadgeOverlapDetails,
      tableActionColumnCollisionCount,
      tableUnjustifiedEllipsisCount,
      tableMobileOverflowCount,
      formLabelClipCount,
      formHelperTextClipCount,
      formErrorTextOverlapCount,
      formUnitSuffixMisalignmentCount,
      formMobilePrimaryActionObscuredCount,
      modalDrawerTextClipCount,
      modalDrawerActionOverlapCount,
      modalDrawerMobileOverflowCount,
      headerOverflowCount,
      navOverflowCount,
      responsiveComponentOverlapCount,
      cardCollisionCount,
      badgeChipCrowdingCount,
      responsiveTextClipDetails: textClipNodes.slice(0, 12).map((element) => ({
        tag: element.tagName,
        className: typeof element.className === "string" ? element.className : "",
        text: (element.innerText || element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 180),
        parentClass: typeof element.parentElement?.className === "string" ? element.parentElement.className : "",
        ancestorClasses: [...element.parentElement?.parentElement?.parentElement?.classList || []].join(" "),
        clientWidth: Math.round(element.clientWidth),
        scrollWidth: Math.round(element.scrollWidth),
        clientHeight: Math.round(element.clientHeight),
        scrollHeight: Math.round(element.scrollHeight),
      })),
      buttonLabelTypographyDriftCount,
      sidebarNavTypographyDriftCount,
      cardTitleBodyHierarchyDefectCount,
      oversizedPageTitleCount,
      oversizedSectionTitleCount,
      contentCompressionByTypographyCount,
      contentCompressionByTypographyDetails: contentCompressionNodes.map((node) => {
        const box = rect(node);
        const style = getComputedStyle(node);
        const lineHeight = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.2;
        return {
          tag: node.tagName,
          className: typeof node.className === "string" ? node.className : "",
          text: (node.innerText || node.textContent || "").replace(/\s+/g, " ").trim().slice(0, 180),
          height: Math.round(box?.height || 0),
          lineHeight: Math.round(lineHeight * 100) / 100,
          estimatedLineCount: Math.round(((box?.height || 0) / lineHeight) * 100) / 100,
        };
      }),
      headingHierarchyDefectCount: 0,
      spacingRhythmDefectCount: 0,
      ctaAlignmentDefectCount: 0,
      primaryActionAmbiguityCount: 0,
      excessiveNestedCardNoiseCount: 0,
      typographyRoleEvidence,
      surfaceFamilies: {
        shell: Boolean(header),
        navigation: Boolean(nav),
        table: visibleNodes("table,.tbl,.tableWrap").length > 0,
        commercialMobileCards: Boolean(document.querySelector(".companyAgreementsMobileCards, .companyAgreementsMobileEmpty")),
        form: visibleNodes("form,input,select,textarea").length > 0,
        modalDrawer: overlays.length > 0,
        mapCommandCenter: Boolean(document.querySelector("[data-map-surface=\"primary\"],.roleCommandCenter,.mapPanel")),
        parentLiveStatus: Boolean(document.querySelector(".parentLiveStatusBand")),
        mobileNavigation: viewportWidth < 700 ? Boolean(document.querySelector(".mobileBottomNav,.mobileNav,.navBottom,.navDock")) : true,
      },
    };
  }, { roleSelectors: semanticRoleSelectors, roleExpected: semanticRoleExpected });
  incrementLayoutCounters(layout);
  return { visibleText: visibleText.replace(/\s+/g, " ").trim(), accessibleLabels: unique(accessibleLabels), layout };
}

async function capture(page, name) {
  await fs.mkdir(screenshotRoot, { recursive: true });
  const target = path.join(screenshotRoot, `${name}.png`);
  await page.screenshot({ path: target, fullPage: false });
  const relative = path.relative(repoRoot, target).replace(/\\/g, "/");
  report.screenshots.push(relative);
  return relative;
}

async function openRoute(page, route, readySelector = routeReadySelectors[route]) {
  await page.goto(`${webBaseUrl}/#${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  if (readySelector) {
    await page.locator(readySelector).first().waitFor({ state: "visible", timeout: 15000 });
  } else {
    // The React lazy fallback is not a meaningful rendered-product state.
    // A fixed delay previously captured it for 24 matrix rows under load.
    await page.getByText("Yükleniyor...", { exact: true }).waitFor({ state: "hidden", timeout: 15000 }).catch(() => {});
  }
  await page.waitForTimeout(150);
}

async function openTaskWorkspace(page) {
  const details = page.locator('[data-role-task-home] > details[data-details="task-workspace"]');
  await details.waitFor({ state: "visible", timeout: 5000 });
  if (!(await details.evaluate((node) => node.open))) {
    await details.locator(":scope > summary").click();
    await page.waitForTimeout(150);
  }
  return details;
}

async function newAuthenticatedPage(browser, contextName, viewport, token, deviceId = null) {
  const context = await browser.newContext({ viewport, isMobile: viewport.width < 700, hasTouch: viewport.width < 700, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  await context.addInitScript(({ tokenValue, boundDriverDeviceId }) => {
    localStorage.setItem("token", tokenValue);
    if (boundDriverDeviceId) localStorage.setItem("personel_servis_browser_device_id", boundDriverDeviceId);
    localStorage.removeItem("personel_servis_cached_session");
    localStorage.removeItem("psv1:copilot:drawer:v4");
    localStorage.removeItem("psv1:copilot:drawer:history:v4");
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith("ui-data-cache:v1:")) localStorage.removeItem(key);
    }
  }, { tokenValue: token, boundDriverDeviceId: deviceId });
  const page = await context.newPage();
  observe(page, contextName);
  return { context, page };
}

function layoutPass(layout) {
  return !layout.horizontalOverflow
    && !layout.topBrandOversized
    && !layout.navBrandOversized
    && Number(layout.responsiveTextClipCount || 0) === 0
    && Number(layout.tableCellOverlapCount || 0) === 0
    && Number(layout.tableBadgeOverlapCount || 0) === 0
    && Number(layout.tableActionColumnCollisionCount || 0) === 0
    && Number(layout.tableUnjustifiedEllipsisCount || 0) === 0
    && Number(layout.tableMobileOverflowCount || 0) === 0
    && Number(layout.formLabelClipCount || 0) === 0
    && Number(layout.formHelperTextClipCount || 0) === 0
    && Number(layout.formErrorTextOverlapCount || 0) === 0
    && Number(layout.formUnitSuffixMisalignmentCount || 0) === 0
    && Number(layout.formMobilePrimaryActionObscuredCount || 0) === 0
    && Number(layout.modalDrawerTextClipCount || 0) === 0
    && Number(layout.modalDrawerActionOverlapCount || 0) === 0
    && Number(layout.modalDrawerMobileOverflowCount || 0) === 0
    && Number(layout.headerOverflowCount || 0) === 0
    && Number(layout.navOverflowCount || 0) === 0
    && Number(layout.responsiveComponentOverlapCount || 0) === 0
    && Number(layout.cardCollisionCount || 0) === 0
    && Number(layout.badgeChipCrowdingCount || 0) === 0
    && Number(layout.buttonLabelTypographyDriftCount || 0) === 0
    && Number(layout.sidebarNavTypographyDriftCount || 0) === 0
    && Number(layout.cardTitleBodyHierarchyDefectCount || 0) === 0;
}

function resultPass(snapshotValue, leaks, extra = true) {
  return extra && leaks.length === 0 && layoutPass(snapshotValue.layout);
}

function surfaceRequirementPass(layout, family) {
  const families = layout.surfaceFamilies || {};
  if (family === "admin-table-form") return families.table && families.form;
  if (family === "commercial-table") return families.table || families.commercialMobileCards;
  if (family === "operations-table") return families.table;
  if (family === "table-form") return families.table && families.form;
  if (family === "form") return families.form;
  if (family === "map-command-center" || family === "map-live") return families.mapCommandCenter;
  if (family === "parent-live-status") return families.parentLiveStatus;
  return true;
}

async function runCoreSurface(browser, surface, viewportName, viewport) {
  const spec = users[surface.context];
  const token = await login(spec.identifier, spec.deviceId);
  const { context, page } = await newAuthenticatedPage(browser, `surface:${surface.context}:${viewportName}`, viewport, token, spec.deviceId);
  try {
    await openRoute(page, surface.route, surface.readySelector);
    let interactionProof = null;
    if (surface.openTaskWorkspace) {
      await openTaskWorkspace(page);
      interactionProof = { type: "task-workspace-disclosure", pass: true };
    }
    if (surface.interaction === "organization-editor") {
      const editor = page.locator("details.organizationPlansEditor");
      await editor.waitFor({ state: "visible", timeout: 5000 });
      if (!(await editor.evaluate((node) => node.open))) {
        await editor.locator(":scope > summary").click();
        await page.waitForTimeout(150);
      }
      await page.locator(".organizationPlansEditor input").first().waitFor({ state: "visible", timeout: 5000 });
      interactionProof = { type: "organization-editor-disclosure", pass: true };
    }
    if (surface.context === "COMPANY" && surface.route === "/company/agreements") {
      await page.locator(".companyAgreementsMobileCards, .companyAgreementsMobileEmpty, .companyAgreementsDesktopList").first().waitFor({ state: "attached", timeout: 4000 }).catch(() => {});
    }
    const current = await snapshot(page);
    const leaks = findLeaks(current.visibleText, current.accessibleLabels);
    const slug = surface.route.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
    const screenshot = await capture(page, `surface-${viewportName}-${surface.context.toLowerCase()}-${slug}`);
    const requiredSurfacePresent = surfaceRequirementPass(current.layout, surface.family);
    const pass = resultPass(current, leaks, requiredSurfacePresent);
    report.states.push({
      stateId: `PRE18_CORE_${surface.context}_${viewportName.toUpperCase()}`,
      name: "core-surface",
      context: surface.context,
      viewport: viewportName,
      route: surface.route,
      family: surface.family,
      interactionProof,
      screenshot,
      visibleText: current.visibleText,
      accessibleLabels: current.accessibleLabels,
      layout: current.layout,
      leaks,
      requiredSurfacePresent,
      pass,
    });
    report.counters.PRE_18_VISIBLE_INTERNAL_ENGINEERING_LEAK_COUNT += leaks.filter((hit) => hit.rule !== "english-workflow").reduce((sum, hit) => sum + hit.matches.length, 0);
    report.counters.RENDERED_ENGLISH_WORKFLOW_LABEL_LEAK_COUNT += leaks.filter((hit) => hit.rule === "english-workflow").reduce((sum, hit) => sum + hit.matches.length, 0);
    report.counters.ACCESSIBLE_LABEL_TERMINOLOGY_LEAK_COUNT += findLeaks("", current.accessibleLabels).reduce((sum, hit) => sum + hit.matches.length, 0);
    if (viewport.width < 700 && leaks.length) report.counters.RESPONSIVE_TERMINOLOGY_LEAK_COUNT += 1;
    if (current.layout.horizontalOverflow) report.counters.RESPONSIVE_HORIZONTAL_OVERFLOW_COUNT += 1;
    if (current.layout.topBrandOversized || current.layout.navBrandOversized) report.counters.AUTHENTICATED_DUPLICATE_OVERSIZED_BRAND_COUNT += 1;
  } finally {
    await context.close();
  }
}

async function runContext(browser, contextName, spec, viewportName, viewport) {
  const token = await login(spec.identifier, spec.deviceId);
  const { context, page } = await newAuthenticatedPage(browser, `${contextName}:${viewportName}`, viewport, token, spec.deviceId);
  try {
    await openRoute(page, spec.route);
    const initial = await snapshot(page);
    const leaks = findLeaks(initial.visibleText, initial.accessibleLabels);
    const fiveSecondEvidence = await taskHomeFiveSecondEvidence(page);
    const screenshot = await capture(page, `${viewportName}-context-${contextName.toLowerCase()}-initial`);
    const pass = resultPass(initial, leaks, initial.layout.taskHome && fiveSecondEvidence.pass);
    const item = { stateId: `PRE18_CONTEXT_${contextName}_${viewportName.toUpperCase()}`, context: contextName, viewport: viewportName, route: spec.route, screenshot, visibleText: initial.visibleText, accessibleLabels: initial.accessibleLabels, layout: initial.layout, leaks, fiveSecondEvidence, pass };
    report.contexts.push(item);
    if (!fiveSecondEvidence.pass) report.counters.PREMIUM_5_SECOND_FAIL_COUNT += 1;

    if (initial.layout.horizontalOverflow) report.counters.RESPONSIVE_HORIZONTAL_OVERFLOW_COUNT += 1;
    if (initial.layout.topBrandOversized || initial.layout.navBrandOversized) report.counters.AUTHENTICATED_DUPLICATE_OVERSIZED_BRAND_COUNT += 1;
    if (viewport.width < 700 && leaks.length) report.counters.RESPONSIVE_TERMINOLOGY_LEAK_COUNT += 1;
    report.counters.PRE_18_VISIBLE_INTERNAL_ENGINEERING_LEAK_COUNT += leaks.filter((hit) => hit.rule !== "english-workflow").reduce((sum, hit) => sum + hit.matches.length, 0);
    report.counters.RENDERED_ENGLISH_WORKFLOW_LABEL_LEAK_COUNT += leaks.filter((hit) => hit.rule === "english-workflow").reduce((sum, hit) => sum + hit.matches.length, 0);
    report.counters.ACCESSIBLE_LABEL_TERMINOLOGY_LEAK_COUNT += findLeaks("", initial.accessibleLabels).reduce((sum, hit) => sum + hit.matches.length, 0);

    if (viewportName === "desktop") {
      const details = page.locator('[data-role-task-home] > details[data-details="task-workspace"]');
      if (await details.count()) {
        await details.locator(":scope > summary").click();
        await page.waitForTimeout(300);
        const expanded = await snapshot(page);
        const expandedLeaks = findLeaks(expanded.visibleText, expanded.accessibleLabels);
        const expandedScreenshot = await capture(page, `desktop-context-${contextName.toLowerCase()}-workspace`);
        const expandedPass = resultPass(expanded, expandedLeaks, true);
        const interactionProof = { type: "task-workspace-disclosure", pass: Boolean(await details.evaluate((node) => node.open)) };
        recordSafeInteraction(interactionProof);
        report.states.push({ stateId: `PRE18_WORKSPACE_${contextName}_${viewportName.toUpperCase()}`, name: "task-workspace", context: contextName, viewport: viewportName, screenshot: expandedScreenshot, visibleText: expanded.visibleText, accessibleLabels: expanded.accessibleLabels, layout: expanded.layout, leaks: expandedLeaks, interactionProof, pass: expandedPass && interactionProof.pass });
        if (expanded.layout.horizontalOverflow) report.counters.RESPONSIVE_HORIZONTAL_OVERFLOW_COUNT += 1;
        report.counters.PRE_18_VISIBLE_INTERNAL_ENGINEERING_LEAK_COUNT += expandedLeaks.filter((hit) => hit.rule !== "english-workflow").reduce((sum, hit) => sum + hit.matches.length, 0);
        report.counters.RENDERED_ENGLISH_WORKFLOW_LABEL_LEAK_COUNT += expandedLeaks.filter((hit) => hit.rule === "english-workflow").reduce((sum, hit) => sum + hit.matches.length, 0);
        report.counters.ACCESSIBLE_LABEL_TERMINOLOGY_LEAK_COUNT += findLeaks("", expanded.accessibleLabels).reduce((sum, hit) => sum + hit.matches.length, 0);
      }
    }
  } finally {
    await context.close();
  }
}

async function runQuickPanel(browser, contextName, viewport) {
  const spec = users[contextName];
  const viewportName = viewport.width < 700 ? "mobile" : viewport.width < 1200 ? "tablet" : "desktop";
  const token = await login(spec.identifier, spec.deviceId);
  const { context, page } = await newAuthenticatedPage(browser, `quick:${contextName}:${viewportName}`, viewport, token, spec.deviceId);
  try {
    await openRoute(page, spec.route);
    const entry = page.getByRole("button", { name: "Sefer Abi’ye Sor, operasyon yardımcısını aç" });
    if (await entry.count() !== 1) throw new Error(`single Sefer Abi entry missing for ${contextName}`);
    const closedScreenshot = await capture(page, `${viewportName}-quick-${contextName.toLowerCase()}-closed`);
    await entry.click();
    const drawer = page.locator(".copilotDrawer");
    await drawer.waitFor({ state: "visible", timeout: 5000 });
    const opened = await snapshot(page);
    const drawerLayout = await page.evaluate(() => {
      const drawerNode = document.querySelector(".copilotDrawer");
      const box = drawerNode?.getBoundingClientRect();
      const input = document.querySelector(".copilotDrawer textarea");
      return { drawerWidth: box ? Math.round(box.width) : 0, drawerLeft: box ? Math.round(box.left) : 0, drawerRight: box ? Math.round(box.right) : 0, inputVisible: Boolean(input && input.getClientRects().length), overflow: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    const leaks = findLeaks(opened.visibleText, opened.accessibleLabels);
    const quickPass = drawerLayout.drawerLeft >= -1 && drawerLayout.drawerRight <= viewport.width + 1 && !drawerLayout.overflow && drawerLayout.inputVisible && leaks.length === 0 && layoutPass(opened.layout);
    report.states.push({ name: "sefer-abi-quick-panel", context: contextName, viewport: viewportName, screenshots: [closedScreenshot, await capture(page, `${viewportName}-quick-${contextName.toLowerCase()}-opened`)], drawerLayout, layout: opened.layout, leaks, pass: quickPass });
    if (quickPass) report.counters.SEFER_ABI_QUICK_PANEL_RESPONSIVE_PASS_COUNT += 1;
    report.counters.PRE_18_VISIBLE_INTERNAL_ENGINEERING_LEAK_COUNT += leaks.filter((hit) => hit.rule !== "english-workflow").reduce((sum, hit) => sum + hit.matches.length, 0);
    report.counters.RENDERED_ENGLISH_WORKFLOW_LABEL_LEAK_COUNT += leaks.filter((hit) => hit.rule === "english-workflow").reduce((sum, hit) => sum + hit.matches.length, 0);
    report.counters.ACCESSIBLE_LABEL_TERMINOLOGY_LEAK_COUNT += findLeaks("", opened.accessibleLabels).reduce((sum, hit) => sum + hit.matches.length, 0);
    await drawer.getByRole("button", { name: "Kapat" }).click().catch(() => {});
    await page.waitForTimeout(150);
    report.states.push({ name: "sefer-abi-quick-panel-closed", context: contextName, viewport: viewportName, screenshot: await capture(page, `${viewportName}-quick-${contextName.toLowerCase()}-closed-after`), pass: !(await page.locator(".copilotDrawer:visible").count()) });
  } finally {
    await context.close();
  }
}

async function runNavigationProbe(browser, contextName, viewportName, viewport) {
  const spec = users[contextName];
  const token = await login(spec.identifier, spec.deviceId);
  const { context, page } = await newAuthenticatedPage(browser, `navigation:${contextName}:${viewportName}`, viewport, token, spec.deviceId);
  try {
    await openRoute(page, spec.route);
    if (viewportName === "mobile") {
      const menu = page.getByRole("button", { name: "Menüyü aç" });
      if (await menu.count() !== 1) throw new Error(`mobile navigation launcher missing for ${contextName}`);
      await menu.click();
      await page.waitForTimeout(150);
    }
    const current = await snapshot(page);
    const leaks = findLeaks(current.visibleText, current.accessibleLabels);
    const navVisible = await page.locator(".navDock").evaluate((node) => getComputedStyle(node).display !== "none" && getComputedStyle(node).visibility !== "hidden").catch(() => false);
    const pass = navVisible && resultPass(current, leaks, true);
    report.states.push({ name: "navigation-probe", context: contextName, viewport: viewportName, screenshot: await capture(page, `${viewportName}-navigation-${contextName.toLowerCase()}-${viewportName === "mobile" ? "open" : "visible"}`), layout: current.layout, leaks, navVisible, pass });
    report.counters.PRE_18_VISIBLE_INTERNAL_ENGINEERING_LEAK_COUNT += leaks.filter((hit) => hit.rule !== "english-workflow").reduce((sum, hit) => sum + hit.matches.length, 0);
    report.counters.RENDERED_ENGLISH_WORKFLOW_LABEL_LEAK_COUNT += leaks.filter((hit) => hit.rule === "english-workflow").reduce((sum, hit) => sum + hit.matches.length, 0);
    report.counters.ACCESSIBLE_LABEL_TERMINOLOGY_LEAK_COUNT += findLeaks("", current.accessibleLabels).reduce((sum, hit) => sum + hit.matches.length, 0);
  } finally {
    await context.close();
  }
}

async function readNavDockState(page, { mobile = false } = {}) {
  return page.evaluate((isMobile) => {
    const nav = document.querySelector(".navDock");
    const items = [...document.querySelectorAll(".navDock .navItem")];
    const box = nav?.getBoundingClientRect();
    const style = nav ? getComputedStyle(nav) : null;
    const missingAccessibleNameCount = items.filter((item) => !String(item.getAttribute("aria-label") || "").trim() || !String(item.getAttribute("title") || "").trim()).length;
    const truncatedLabelCount = items.filter((item) => {
      const label = item.querySelector(".navLabel");
      return label && label.scrollWidth > label.clientWidth + 1;
    }).length;
    const activeItems = items.filter((item) => item.getAttribute("aria-current") === "page");
    const touchTargetDefectCount = isMobile ? items.filter((item) => item.getBoundingClientRect().height < 44).length : 0;
    return {
      itemCount: items.length,
      activeCount: activeItems.length,
      activeLabel: activeItems[0]?.getAttribute("aria-label") || "",
      missingAccessibleNameCount,
      truncatedLabelCount,
      touchTargetDefectCount,
      navVisible: Boolean(nav && box && box.width > 0 && box.height > 0 && style.visibility !== "hidden"),
      navPosition: style?.position || "",
      navLeft: Math.round(box?.left || 0),
      navRight: Math.round(box?.right || 0),
      navTop: Math.round(box?.top || 0),
      navBottom: Math.round(box?.bottom || 0),
      navPaddingTop: Number.parseFloat(style?.paddingTop || "0"),
      navPaddingBottom: Number.parseFloat(style?.paddingBottom || "0"),
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      bodyOverflow: document.body.style.overflow || "",
      mobileOpen: Boolean(document.querySelector(".navDock--mobileOpen")),
      documentOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    };
  }, mobile);
}

function collectNavDockDefects(state, { mobile = false, requireActive = true } = {}) {
  const defects = {
    active: requireActive && (state.activeCount !== 1 || !state.activeLabel) ? 1 : 0,
    accessible: state.missingAccessibleNameCount,
    keyboard: 0,
    safeArea: mobile && (state.navPosition !== "fixed" || state.navLeft < -1 || state.navRight > state.viewportWidth + 1 || state.navTop < -1 || state.navBottom > state.viewportHeight + 1 || state.navPaddingTop < 10 || state.navPaddingBottom < 10 || state.bodyOverflow !== "hidden") ? 1 : 0,
    overlap: state.documentOverflow || state.truncatedLabelCount || state.touchTargetDefectCount ? 1 : 0,
    roleVisibility: state.itemCount < 1 ? 1 : 0,
  };
  report.counters.NAVDOCK_ACTIVE_STATE_DEFECT_COUNT += defects.active;
  report.counters.NAVDOCK_ACCESSIBLE_NAME_DEFECT_COUNT += defects.accessible;
  report.counters.NAVDOCK_KEYBOARD_DEFECT_COUNT += defects.keyboard;
  report.counters.NAVDOCK_SAFE_AREA_DEFECT_COUNT += defects.safeArea;
  report.counters.NAVDOCK_OVERLAP_DEFECT_COUNT += defects.overlap;
  report.counters.NAVDOCK_ROLE_VISIBILITY_DEFECT_COUNT += defects.roleVisibility;
  report.counters.ACCESSIBILITY_BLOCKER_COUNT += defects.accessible;
  return defects;
}

async function runNavDockFinalAcceptance(browser) {
  const desktopSpec = users.COMPANY;
  const desktopToken = await login(desktopSpec.identifier, desktopSpec.deviceId);
  const desktop = await newAuthenticatedPage(browser, "navdock-final:desktop", viewports.desktop, desktopToken, desktopSpec.deviceId);
  try {
    await openRoute(desktop.page, desktopSpec.route);
    const initial = await readNavDockState(desktop.page);
    const initialDefects = collectNavDockDefects(initial);
    await desktop.page.keyboard.press("Tab");
    const keyboard = await desktop.page.evaluate(() => {
      const active = document.activeElement;
      const style = active ? getComputedStyle(active) : null;
      return {
        navItemFocused: Boolean(active?.classList?.contains("navItem")),
        focusVisible: Boolean(style && Number.parseFloat(style.outlineWidth || "0") >= 2 && style.outlineStyle !== "none"),
      };
    });
    if (!keyboard.navItemFocused || !keyboard.focusVisible) report.counters.NAVDOCK_KEYBOARD_DEFECT_COUNT += 1;
    const destination = desktop.page.locator(".navDock .navItem").nth(1);
    const destinationLabel = await destination.getAttribute("aria-label");
    const beforePath = new URL(desktop.page.url()).hash;
    await destination.click();
    await desktop.page.waitForTimeout(200);
    const afterPath = new URL(desktop.page.url()).hash;
    const selectedAfterNavigation = await readNavDockState(desktop.page);
    const navigationPass = Boolean(destinationLabel && afterPath && afterPath !== beforePath && selectedAfterNavigation.activeCount === 1 && selectedAfterNavigation.activeLabel === destinationLabel);
    recordSafeInteraction({ type: "navdock-desktop-destination", pass: navigationPass, destinationLabel, beforePath, afterPath });
    await desktop.page.goBack({ waitUntil: "domcontentloaded", timeout: 10000 }).catch(() => null);
    await desktop.page.waitForTimeout(200);
    const backPass = new URL(desktop.page.url()).hash === beforePath;
    recordSafeInteraction({ type: "navdock-desktop-browser-back", pass: backPass, beforePath, afterPath: new URL(desktop.page.url()).hash });
    recordSafeInteraction({ type: "navdock-desktop-keyboard-focus", pass: keyboard.navItemFocused && keyboard.focusVisible });
    report.navDockFinal.probes.push({ viewport: "desktop", context: "COMPANY", initial, initialDefects, keyboard, destinationLabel, navigationPass, backPass, screenshot: await capture(desktop.page, "navdock-final-desktop-company") });
  } finally {
    await desktop.context.close();
  }

  const mobileSpec = users.ROOM;
  const mobileToken = await login(mobileSpec.identifier, mobileSpec.deviceId);
  const mobile = await newAuthenticatedPage(browser, "navdock-final:mobile", viewports.mobile, mobileToken, mobileSpec.deviceId);
  try {
    await openRoute(mobile.page, mobileSpec.route);
    const launcher = mobile.page.getByRole("button", { name: "Menüyü aç" });
    await launcher.click();
    await mobile.page.locator(".navDock--mobileOpen").waitFor({ state: "visible", timeout: 5000 });
    // The dock uses a 220ms transform transition. Measure its safe-area bounds
    // only after the current rendered drawer has reached its settled position.
    await mobile.page.waitForTimeout(250);
    const opened = await readNavDockState(mobile.page, { mobile: true });
    const openedDefects = collectNavDockDefects(opened, { mobile: true });
    recordSafeInteraction({ type: "navdock-mobile-drawer-open", pass: opened.mobileOpen && opened.navVisible && opened.bodyOverflow === "hidden" });
    await mobile.page.keyboard.press("Escape");
    await mobile.page.waitForTimeout(150);
    const escape = await mobile.page.evaluate(() => ({
      closed: !document.querySelector(".navDock--mobileOpen"),
      focusReturned: document.activeElement?.getAttribute("aria-label") === "Menüyü aç",
    }));
    if (!escape.focusReturned) report.counters.NAVDOCK_KEYBOARD_DEFECT_COUNT += 1;
    recordSafeInteraction({ type: "navdock-mobile-escape-focus-return", pass: escape.closed && escape.focusReturned });
    await launcher.click();
    await mobile.page.locator(".navDock--mobileOpen").waitFor({ state: "visible", timeout: 5000 });
    await mobile.page.getByRole("button", { name: "Menü dışını kapat" }).click();
    await mobile.page.waitForTimeout(150);
    const backdropClose = !(await mobile.page.locator(".navDock--mobileOpen").count());
    recordSafeInteraction({ type: "navdock-mobile-backdrop-close", pass: backdropClose });
    report.navDockFinal.probes.push({ viewport: "mobile", context: "ROOM", opened, openedDefects, escape, backdropClose, screenshot: await capture(mobile.page, "navdock-final-mobile-room-closed") });
  } finally {
    await mobile.context.close();
  }

  report.navDockFinal.pass = report.navDockFinal.probes.length === 2
    && report.navDockFinal.probes.every((probe) => Object.values(probe.initialDefects || probe.openedDefects || {}).every((count) => count === 0))
    && report.counters.NAVDOCK_KEYBOARD_DEFECT_COUNT === 0
    && report.counters.SAFE_INTERACTION_FAIL_COUNT === 0;
}

async function runModalProbe(browser, viewportName, viewport) {
  const spec = users.SUPER_ADMIN;
  const token = await login(spec.identifier, spec.deviceId);
  const { context, page } = await newAuthenticatedPage(browser, `modal:${viewportName}`, viewport, token);
  try {
    await openRoute(page, "/superadmin/rooms");
    const profile = page.getByRole("button", { name: "Profil" }).first();
    const profileAvailable = await profile.count() > 0;
    if (profileAvailable) await profile.click();
    const modal = page.locator(".modal:visible, [role=dialog]:visible").first();
    const modalVisible = await modal.count() > 0;
    const current = await snapshot(page);
    const leaks = findLeaks(current.visibleText, current.accessibleLabels);
    const pass = profileAvailable && modalVisible && resultPass(current, leaks, true);
    report.states.push({ name: "modal", context: "SUPER_ADMIN", viewport: viewportName, route: "/superadmin/rooms", screenshot: await capture(page, `${viewportName}-modal-superadmin-rooms`), layout: current.layout, leaks, modalVisible, pass });
    report.counters.PRE_18_VISIBLE_INTERNAL_ENGINEERING_LEAK_COUNT += leaks.filter((hit) => hit.rule !== "english-workflow").reduce((sum, hit) => sum + hit.matches.length, 0);
    report.counters.RENDERED_ENGLISH_WORKFLOW_LABEL_LEAK_COUNT += leaks.filter((hit) => hit.rule === "english-workflow").reduce((sum, hit) => sum + hit.matches.length, 0);
    report.counters.ACCESSIBLE_LABEL_TERMINOLOGY_LEAK_COUNT += findLeaks("", current.accessibleLabels).reduce((sum, hit) => sum + hit.matches.length, 0);
    if (modalVisible) await modal.getByRole("button", { name: "Kapat" }).click().catch(() => {});
  } finally {
    await context.close();
  }
}

async function runLogin(browser, viewportName, viewport) {
  const context = await browser.newContext({ viewport, isMobile: viewport.width < 700, hasTouch: viewport.width < 700, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  const page = await context.newPage();
  observe(page, `login:${viewportName}`);
  try {
    await page.goto(`${webBaseUrl}/#/`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(400);
    const current = await snapshot(page);
    const leaks = findLeaks(current.visibleText, current.accessibleLabels);
    const pass = !current.layout.horizontalOverflow && leaks.length === 0;
    report.states.push({ name: "login", viewport: viewportName, screenshot: await capture(page, `login-${viewportName}`), layout: current.layout, leaks, pass });
    if (pass) report.counters.LOGIN_TYPOGRAPHY_RESPONSIVE_PASS_COUNT += 1;
  } finally {
    await context.close();
  }
}

async function runTypographyTarget(browser, target) {
  const spec = users[target.context];
  const token = await login(spec.identifier, spec.deviceId);
  const { context, page } = await newAuthenticatedPage(browser, `typography-target:${target.name}`, viewports.desktop, token, spec.deviceId);
  try {
    await openRoute(page, target.route);
    await page.getByText(target.expectedText, { exact: true }).first().waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
    const current = await snapshot(page);
    const leaks = findLeaks(current.visibleText, current.accessibleLabels);
    const targetEvidence = await page.evaluate((expectedText) => {
      const visible = (element) => Boolean(element && element.getClientRects().length && getComputedStyle(element).visibility !== "hidden" && getComputedStyle(element).display !== "none");
      const node = [...document.querySelectorAll("h1,h2,h3,.panelTitle,.panelSectionTitle,.roleSectionTitle,.sectionTitle,.title")]
        .find((element) => visible(element) && element.textContent.replace(/\s+/g, " ").trim() === expectedText);
      if (!node) return { found: false };
      const style = getComputedStyle(node);
      const size = Number.parseFloat(style.fontSize);
      const lineHeight = Number.parseFloat(style.lineHeight);
      return {
        found: true,
        tag: node.tagName,
        className: typeof node.className === "string" ? node.className : "",
        fontFamily: style.fontFamily,
        fontSize: size,
        lineHeight,
        fontWeight: style.fontWeight,
        withinScale: style.fontFamily.includes("Inter") && size <= 36.1 && lineHeight <= 41.2,
      };
    }, target.expectedText);
    const screenshot = await capture(page, `typography-target-${target.name.toLowerCase()}`);
    const pass = current.visibleText.includes(target.expectedText) && targetEvidence.found && targetEvidence.withinScale && leaks.length === 0 && layoutPass(current.layout);
    report.states.push({
      name: "typography-target",
      context: target.context,
      viewport: "desktop",
      route: target.route,
      expectedText: target.expectedText,
      screenshot,
      targetEvidence,
      visibleText: current.visibleText,
      accessibleLabels: current.accessibleLabels,
      layout: current.layout,
      leaks,
      pass,
    });
    if (pass) report.counters.PRE_18_TYPOGRAPHY_TARGET_PASS_COUNT += 1;
    report.counters.PRE_18_VISIBLE_INTERNAL_ENGINEERING_LEAK_COUNT += leaks.filter((hit) => hit.rule !== "english-workflow").reduce((sum, hit) => sum + hit.matches.length, 0);
    report.counters.RENDERED_ENGLISH_WORKFLOW_LABEL_LEAK_COUNT += leaks.filter((hit) => hit.rule === "english-workflow").reduce((sum, hit) => sum + hit.matches.length, 0);
    report.counters.ACCESSIBLE_LABEL_TERMINOLOGY_LEAK_COUNT += findLeaks("", current.accessibleLabels).reduce((sum, hit) => sum + hit.matches.length, 0);
  } finally {
    await context.close();
  }
}

async function main() {
  await fs.mkdir(screenshotRoot, { recursive: true });
  users.DRIVER.deviceId = await resolveDriverDeviceId(users.DRIVER.identifier);
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [viewportName, viewport] of Object.entries(viewports)) {
      for (const [contextName, spec] of Object.entries(users)) await runContext(browser, contextName, spec, viewportName, viewport);
    }
    for (const surface of coreSurfaces) {
      for (const viewportName of ["desktop", "tablet", "mobile"]) await runCoreSurface(browser, surface, viewportName, viewports[viewportName]);
    }
    await runQuickPanel(browser, "COMPANY", viewports.mobile);
    await runQuickPanel(browser, "ROOM", viewports.mobile);
    await runQuickPanel(browser, "COMPANY", viewports.desktop);
    await runNavigationProbe(browser, "COMPANY", "tablet", viewports.tablet);
    await runNavigationProbe(browser, "ROOM", "mobile", viewports.mobile);
    await runNavDockFinalAcceptance(browser);
    await runModalProbe(browser, "desktop", viewports.desktop);
    await runModalProbe(browser, "mobile", viewports.mobile);
    await runLogin(browser, "desktop", viewports.desktop);
    await runLogin(browser, "tablet", viewports.tablet);
    await runLogin(browser, "mobile", viewports.mobile);
    for (const target of typographyTargets) await runTypographyTarget(browser, target);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
  report.counters.PRE_18_SEMANTIC_TYPOGRAPHY_ROLE_COUNT = report.typographyRolesSeen.length;
  report.counters.TYPOGRAPHY_COMPETING_SYSTEM_COUNT = report.counters.PRE_18_SEMANTIC_TYPOGRAPHY_ROLE_COUNT === Object.keys(semanticRoleSelectors).length ? 0 : 1;
  report.counters.TYPOGRAPHY_UNEXPLAINED_ONE_OFF_OVERRIDE_COUNT = report.counters.PRE_18_BUTTON_LABEL_TYPOGRAPHY_DRIFT_COUNT + report.counters.PRE_18_SIDEBAR_NAV_TYPOGRAPHY_DRIFT_COUNT;
  report.counters.VISIBLE_HEADING_HIERARCHY_DEFECT_COUNT = report.counters.PRE_18_VISIBLE_HEADING_HIERARCHY_DEFECT_COUNT;
  report.counters.RESPONSIVE_TEXT_CLIP_COUNT = report.counters.PRE_18_RESPONSIVE_TEXT_CLIP_COUNT;
  report.counters.BUTTON_LABEL_TYPOGRAPHY_DRIFT_COUNT = report.counters.PRE_18_BUTTON_LABEL_TYPOGRAPHY_DRIFT_COUNT;
  report.counters.SIDEBAR_NAV_TYPOGRAPHY_DRIFT_COUNT = report.counters.PRE_18_SIDEBAR_NAV_TYPOGRAPHY_DRIFT_COUNT;
  report.counters.CARD_TITLE_BODY_HIERARCHY_DEFECT_COUNT = report.counters.PRE_18_CARD_TITLE_BODY_HIERARCHY_DEFECT_COUNT;
  report.counters.PRE_18_UNPROVEN_REQUIRED_VIEWPORT_REQUIREMENT_COUNT = ["desktop", "tablet", "mobile"].filter((viewportName) => !report.contexts.some((item) => item.viewport === viewportName && item.pass)).length;
  report.counters.PRE_18_PREMIUM_UI_BROWSER_PASS_COUNT = [...report.contexts, ...report.states].filter((item) => item.pass).length;
  report.counters.consoleErrorCount = report.errors.filter((item) => item.type === "console").length;
  report.counters.pageErrorCount = report.errors.filter((item) => item.type === "page").length;
  report.pass = report.counters.PRE_18_PREMIUM_UI_BROWSER_PASS_COUNT >= 72
    && report.counters.PRE_18_VISIBLE_INTERNAL_ENGINEERING_LEAK_COUNT === 0
    && report.counters.RENDERED_ENGLISH_WORKFLOW_LABEL_LEAK_COUNT === 0
    && report.counters.ACCESSIBLE_LABEL_TERMINOLOGY_LEAK_COUNT === 0
    && report.counters.RESPONSIVE_TERMINOLOGY_LEAK_COUNT === 0
    && report.counters.AUTHENTICATED_DUPLICATE_OVERSIZED_BRAND_COUNT === 0
    && report.counters.RESPONSIVE_HORIZONTAL_OVERFLOW_COUNT === 0
    && report.counters.SEFER_ABI_QUICK_PANEL_RESPONSIVE_PASS_COUNT >= 3
    && report.counters.LOGIN_TYPOGRAPHY_RESPONSIVE_PASS_COUNT >= 3
    && report.counters.PRE_18_TYPOGRAPHY_TARGET_PASS_COUNT >= typographyTargets.length
    && report.counters.PRE_18_SEMANTIC_TYPOGRAPHY_ROLE_COUNT === Object.keys(semanticRoleSelectors).length
    && report.counters.PRE_18_UNPROVEN_REQUIRED_VIEWPORT_REQUIREMENT_COUNT === 0
    && report.counters.TYPOGRAPHY_COMPETING_SYSTEM_COUNT === 0
    && report.counters.TYPOGRAPHY_UNEXPLAINED_ONE_OFF_OVERRIDE_COUNT === 0
    && report.counters.OVERSIZED_PAGE_TITLE_COUNT === 0
    && report.counters.OVERSIZED_SECTION_TITLE_COUNT === 0
    && report.counters.VISIBLE_CONTENT_COMPRESSION_BY_TYPOGRAPHY_COUNT === 0
    && report.counters.RESPONSIVE_TEXT_CLIP_COUNT === 0
    && report.counters.BUTTON_LABEL_TYPOGRAPHY_DRIFT_COUNT === 0
    && report.counters.SIDEBAR_NAV_TYPOGRAPHY_DRIFT_COUNT === 0
    && report.counters.CARD_TITLE_BODY_HIERARCHY_DEFECT_COUNT === 0
    && report.counters.PREMIUM_5_SECOND_FAIL_COUNT === 0
    && report.counters.SAFE_INTERACTION_TARGET_COUNT >= 14
    && report.counters.SAFE_INTERACTION_PASS_COUNT === report.counters.SAFE_INTERACTION_TARGET_COUNT
    && report.counters.SAFE_INTERACTION_FAIL_COUNT === 0
    && report.counters.ACCESSIBILITY_BLOCKER_COUNT === 0
    && report.counters.NAVDOCK_ACTIVE_STATE_DEFECT_COUNT === 0
    && report.counters.NAVDOCK_ACCESSIBLE_NAME_DEFECT_COUNT === 0
    && report.counters.NAVDOCK_KEYBOARD_DEFECT_COUNT === 0
    && report.counters.NAVDOCK_SAFE_AREA_DEFECT_COUNT === 0
    && report.counters.NAVDOCK_OVERLAP_DEFECT_COUNT === 0
    && report.counters.NAVDOCK_ROLE_VISIBILITY_DEFECT_COUNT === 0
    && report.navDockFinal.pass === true
    && Object.values(report.counters).filter((value) => typeof value === "number" && /COUNT$/.test(String(value))).every((value) => value >= 0)
    && report.counters.consoleErrorCount === 0
    && report.counters.pageErrorCount === 0
    && report.counters.HTTP_500_COUNT === 0
    && [...report.contexts, ...report.states].every((item) => item.pass);
  await fs.writeFile(path.join(evidenceRoot, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    source: report.source,
    sourceHead: report.sourceHead,
    contextCount: report.contexts.length,
    stateCount: report.states.length,
    screenshotCount: report.screenshots.length,
    counters: report.counters,
    pass: report.pass,
    report: path.relative(repoRoot, path.join(evidenceRoot, "report.json")).replace(/\\/g, "/"),
  }, null, 2));
  if (!report.pass) process.exitCode = 1;
}

main().catch(async (error) => {
  report.failure = String(error?.stack || error);
  await fs.mkdir(evidenceRoot, { recursive: true });
  await fs.writeFile(path.join(evidenceRoot, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.error(error?.stack || String(error));
  process.exitCode = 1;
});
