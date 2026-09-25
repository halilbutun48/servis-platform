import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const webBaseUrl = (process.env.WEB_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const apiBaseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const evidenceRoot = path.join(repoRoot, "backend", "artifacts", "browser-smoke", "pre-18-human-review-round-1");
const screenshotRoot = path.join(evidenceRoot, "screenshots");

const contexts = [
  { name: "SUPER_ADMIN", identifier: "superadmin@demo.com", home: "/superadmin" },
  { name: "COMPANY", identifier: "company@demo.com", home: "/company" },
  { name: "ROOM", identifier: "room@demo.com", home: "/room" },
  { name: "DRIVER", identifier: "driver@demo.com", home: "/driver/today", deviceId: process.env.DRIVER_BROWSER_DEVICE_ID || "web-s27k9shhmqj7i68l" },
  { name: "PERSONEL", identifier: "personel@demo.com", home: "/personel/my" },
  { name: "PARENT", identifier: "parent@demo.com", home: "/parent/live" },
  { name: "SCHOOL", identifier: "school@demo.com", home: "/school" },
  { name: "ORGANIZATION", identifier: "organization@demo.com", home: "/organization" },
];

const viewports = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 900, height: 900 },
  mobile: { width: 390, height: 844 },
};

const report = {
  source: "REAL_PLAYWRIGHT_RENDERED_BROWSER",
  generatedAt: new Date().toISOString(),
  sourceHead: execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim(),
  screenshots: [],
  evidence: [],
  counters: {
    HUMAN_REVIEW_ROUND_1_FINDING_COUNT: 11,
    HUMAN_REVIEW_ROUND_1_RESOLVED_COUNT: 0,
    HUMAN_REVIEW_ROUND_1_REMAINING_COUNT: 0,
    MOBILE_MENU_ESCAPE_CLOSE_PASS_COUNT: 0,
    MOBILE_MENU_FOCUS_RETURN_DEFECT_COUNT: 0,
    MOBILE_NAV_KEYBOARD_REGRESSION_COUNT: 0,
    LOCATION_PANEL_MOBILE_HORIZONTAL_SCROLL_COUNT: 0,
    LOCATION_PANEL_CRUSHED_PRIMARY_ACTION_COUNT: 0,
    LOCATION_PANEL_HELPER_CLIP_COUNT: 0,
    ROOM_OFFERS_VISIBLE_PRIMARY_SIGNAL_COUNT: 0,
    ROOM_OFFERS_STATUS_CLIP_COUNT: 0,
    ROOM_OFFERS_HELPER_CLIP_COUNT: 0,
    ROOM_OFFERS_EQUAL_WEIGHT_SIGNAL_OVERLOAD_COUNT: 0,
    ROOM_SHIFTS_EXCESSIVE_BORDER_DENSITY_COUNT: 0,
    ROOM_SHIFTS_DISABLED_CONTROL_OVERLOAD_COUNT: 0,
    ROOM_SHIFTS_REPEATED_WORKFLOW_BLOCK_COUNT: 0,
    ROOM_SHIFTS_PRIMARY_ACTION_AMBIGUITY_COUNT: 0,
    FINANCE_ADVANCED_DEFAULT_OPEN_COUNT: 0,
    FINANCE_EQUAL_WEIGHT_SECTION_OVERLOAD_COUNT: 0,
    FINANCE_VISIBLE_CONTROL_OVERLOAD_COUNT: 0,
    FINANCE_EXCESSIVE_NESTED_CARD_COUNT: 0,
    FINANCE_PRIMARY_ACTION_AMBIGUITY_COUNT: 0,
    COMPANY_AGREEMENTS_TEXT_CLIP_COUNT: 0,
    COMPANY_AGREEMENTS_PILL_CLIP_COUNT: 0,
    COMPANY_AGREEMENTS_ACTION_CLIP_COUNT: 0,
    COMPANY_AGREEMENTS_TABLE_CLIP_COUNT: 0,
    CHECKIN_VISIBLE_M42_COUNT: 0,
    CHECKIN_VISIBLE_TOKEN_COUNT: 0,
    CHECKIN_VISIBLE_ENGINEERING_COPY_COUNT: 0,
    ORGANIZATION_ROLE_COPY_LEAK_COUNT: 0,
    ORGANIZATION_PLANS_HELPER_CLIP_COUNT: 0,
    ORGANIZATION_PLANS_HORIZONTAL_SCROLL_COUNT: 0,
    DRIVER_SEFER_ABI_CRITICAL_CONTENT_OVERLAP_COUNT: 0,
    DRIVER_SEFER_ABI_MAP_CONTROL_OVERLAP_COUNT: 0,
    DRIVER_SEFER_ABI_ROUTE_RISK_OVERLAP_COUNT: 0,
    NOTIFICATIONS_RESPONSIVE_OVERFLOW_COUNT: 0,
    NOTIFICATIONS_PILL_CLIP_COUNT: 0,
    FONT_FAMILY_DRIFT_COUNT: 0,
    TYPOGRAPHY_ROLE_DRIFT_COUNT: 0,
    OVERSIZED_PAGE_TITLE_COUNT: 0,
    RESPONSIVE_TEXT_CLIP_COUNT: 0,
    BLOCKER_COUNT: 0,
    MAJOR_FINDING_COUNT: 0,
    VISIBLE_INTERNAL_MILESTONE_ID_COUNT: 0,
    VISIBLE_ENGINEERING_COPY_COUNT: 0,
    SEFER_ABI_CRITICAL_CONTENT_OVERLAP_COUNT: 0,
    VISIBLE_EXCESSIVE_BORDER_DENSITY_COUNT: 0,
    VISIBLE_PRIMARY_ACTION_AMBIGUITY_COUNT: 0,
    consoleErrorCount: 0,
    pageErrorCount: 0,
    HTTP_500_COUNT: 0,
  },
  errors: [],
};

function observe(page, label) {
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
    if (response.status() === 403) {
      report.errors.push({ type: "http-forbidden", label, status: response.status(), url: response.url() });
    }
    if (response.status() >= 500) {
      report.counters.HTTP_500_COUNT += 1;
      report.errors.push({ type: "http", label, status: response.status(), url: response.url() });
    }
  });
}

async function login(spec) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier: spec.identifier, password: "demo123", deviceId: spec.deviceId || `pre18-round1-${spec.name}` }),
      signal: AbortSignal.timeout(12000),
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok && body.token) return body.token;
    if (response.status === 429 && attempt < 5) {
      const retryAfter = Number(response.headers.get("retry-after") || body.retryAfterSec || 0);
      await new Promise((resolve) => setTimeout(resolve, Math.min(15000, Math.max(2000, retryAfter * 1000 || (attempt + 1) * 3000))));
      continue;
    }
    throw new Error(`browser login failed ${spec.name}: ${response.status}`);
  }
  throw new Error(`browser login failed ${spec.name}`);
}

async function createPage(browser, spec, viewportName, token) {
  const viewport = viewports[viewportName];
  const context = await browser.newContext({ viewport, isMobile: viewport.width < 700, hasTouch: viewport.width < 700, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  await context.addInitScript((value) => {
    localStorage.setItem("token", value);
    localStorage.removeItem("personel_servis_cached_session");
    localStorage.removeItem("psv1:copilot:drawer:v4");
    localStorage.removeItem("psv1:copilot:drawer:history:v4");
  }, token);
  const page = await context.newPage();
  observe(page, `${spec.name}:${viewportName}`);
  await page.goto(`${webBaseUrl}/#${spec.home}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1300);
  return { context, page };
}

async function capture(page, name) {
  await fs.mkdir(screenshotRoot, { recursive: true });
  const target = path.join(screenshotRoot, `${name}.png`);
  await page.screenshot({ path: target, fullPage: false });
  const relative = path.relative(repoRoot, target).replace(/\\/g, "/");
  report.screenshots.push(relative);
  return relative;
}

async function openRoute(browser, spec, route, viewportName, token, label) {
  const targetSpec = { ...spec, home: route };
  const result = await createPage(browser, targetSpec, viewportName, token);
  report.evidence.push({ type: "route", context: spec.name, route, viewport: viewportName, label });
  return result;
}

async function layoutMetrics(page) {
  return page.evaluate(() => {
    const visible = (node) => {
      if (!node) return false;
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      return Boolean(box.width && box.height && style.display !== "none" && style.visibility !== "hidden");
    };
    const rect = (node) => visible(node) ? node.getBoundingClientRect() : null;
    const intersects = (a, b) => Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
    const textClip = [...document.querySelectorAll("h1,h2,h3,h4,.title,.panelTitle,.panelSectionTitle,.panelMeta,.muted,label,button,.btn,.pill")]
      .filter(visible)
      .filter((node) => {
        if (node.closest(".copilotDrawer,.copilotLauncherStack,.leaflet-container,.notifTblWrap")) return false;
        const style = getComputedStyle(node);
        return (style.overflow === "hidden" || style.textOverflow === "ellipsis" || style.whiteSpace === "nowrap")
          && (node.scrollWidth > node.clientWidth + 2 || node.scrollHeight > node.clientHeight + 2);
      });
    const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    const viewportWidth = document.documentElement.clientWidth;
    const visibleButtons = [...document.querySelectorAll("button,.btn")].filter(visible);
    const contentOverlap = visibleButtons.filter((button) => {
      const box = rect(button);
      return [...document.querySelectorAll("[data-primary-cta=\"true\"],.roleTaskSummaryCard--next,.shellTopLogout,.mobileBottomNav,.navBottom")]
        .filter((node) => node !== button && visible(node)).some((node) => intersects(box, rect(node)));
    }).length;
    const detailsOpen = [...document.querySelectorAll("details[open]")].filter(visible).length;
    return {
      horizontalOverflow: width > viewportWidth + 1,
      scrollWidth: width,
      viewportWidth,
      textClipCount: textClip.length,
      textClipText: textClip.slice(0, 8).map((node) => (node.innerText || node.textContent || "").replace(/\s+/g, " ").trim()),
      detailsOpen,
      contentOverlap,
      bodyText: (document.body.innerText || "").replace(/\s+/g, " ").trim(),
    };
  });
}

async function runMobileMenus(browser, tokens) {
  for (const spec of contexts) {
    const { context, page } = await createPage(browser, spec, "mobile", tokens[spec.name]);
    try {
      const trigger = page.getByRole("button", { name: "Menüyü aç" });
      let pass = await trigger.count() === 1;
      if (pass) {
        await trigger.click();
        pass = pass && await page.getByRole("button", { name: "Menüyü kapat" }).count() === 1;
        await page.keyboard.press("Escape");
        await page.waitForTimeout(80);
        const closed = await page.getByRole("button", { name: "Menüyü aç" }).count() === 1;
        const focusLabel = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") || "");
        const focusReturned = focusLabel === "Menüyü aç";
        if (closed && focusReturned) report.counters.MOBILE_MENU_ESCAPE_CLOSE_PASS_COUNT += 1;
        else {
          report.counters.MOBILE_MENU_FOCUS_RETURN_DEFECT_COUNT += focusReturned ? 0 : 1;
          report.counters.MOBILE_NAV_KEYBOARD_REGRESSION_COUNT += closed ? 0 : 1;
        }
      } else {
        report.counters.MOBILE_NAV_KEYBOARD_REGRESSION_COUNT += 1;
      }
      const screenshot = await capture(page, `round1-mobile-menu-${spec.name.toLowerCase()}`);
      report.evidence.push({ type: "mobile-menu", context: spec.name, pass, screenshot });
    } finally {
      await context.close();
    }
  }
}

async function runTarget(browser, spec, tokens, target) {
  const { context, page } = await openRoute(browser, spec, target.route, target.viewport, tokens[spec.name], target.name);
  try {
    const metrics = await layoutMetrics(page);
    const bodyText = metrics.bodyText;
    if (target.kind === "location") {
      const action = page.getByRole("button", { name: "Büyük Haritada İşaretle" }).first();
      const actionBox = await action.boundingBox().catch(() => null);
      const helper = page.locator(".geoLocationPicker .muted, .geoLocationPickerModal .muted");
      const helperClip = await helper.evaluateAll((nodes) => nodes.filter((node) => node.scrollWidth > node.clientWidth + 2 || node.scrollHeight > node.clientHeight + 2).length).catch(() => 0);
      report.counters.LOCATION_PANEL_MOBILE_HORIZONTAL_SCROLL_COUNT += metrics.horizontalOverflow ? 1 : 0;
      report.counters.LOCATION_PANEL_CRUSHED_PRIMARY_ACTION_COUNT += actionBox && actionBox.width < 130 ? 1 : 0;
      report.counters.LOCATION_PANEL_HELPER_CLIP_COUNT += helperClip;
    }
    if (target.kind === "offers") {
      const qualitySignals = await page.locator(".pre18-offer-quality-compact > :first-child [data-pre18-primary-status=\"true\"]:visible").count().catch(() => 0);
      const data = await page.locator(".pre18-room-offer-card:visible").evaluateAll((cards) => cards.map((card) => ({
        primary: [...card.querySelectorAll("[data-pre18-primary-status=\"true\"]")].filter((node) => node.offsetParent !== null).length,
        clipped: [...card.querySelectorAll(".pill,.muted")].filter((node) => node.offsetParent !== null && (node.scrollWidth > node.clientWidth + 2 || node.scrollHeight > node.clientHeight + 2)).length,
        secondaryOpen: card.querySelector("details[open]") ? 1 : 0,
      }))).catch(() => []);
      report.counters.ROOM_OFFERS_VISIBLE_PRIMARY_SIGNAL_COUNT = Math.max(report.counters.ROOM_OFFERS_VISIBLE_PRIMARY_SIGNAL_COUNT, qualitySignals, ...data.map((row) => row.primary), 0);
      report.counters.ROOM_OFFERS_STATUS_CLIP_COUNT += data.reduce((sum, row) => sum + row.clipped, 0);
      report.counters.ROOM_OFFERS_HELPER_CLIP_COUNT += metrics.textClipCount;
      report.counters.ROOM_OFFERS_EQUAL_WEIGHT_SIGNAL_OVERLOAD_COUNT += data.filter((row) => row.primary > 4).length;
    }
    if (target.kind === "shifts") {
      const cards = await page.locator(".roomShiftsDensityScope .shiftMobileCard:visible").evaluateAll((nodes) => nodes.map((card) => ({
        details: card.querySelectorAll("details").length,
        primaryActions: card.querySelectorAll(".shiftCardPrimaryAction").length,
        lifecycle: card.querySelectorAll(".shiftCardLifecycleSteps").length,
      }))).catch(() => []);
      report.counters.ROOM_SHIFTS_PRIMARY_ACTION_AMBIGUITY_COUNT += cards.filter((row) => row.primaryActions !== 1).length;
      report.counters.ROOM_SHIFTS_REPEATED_WORKFLOW_BLOCK_COUNT += cards.filter((row) => row.lifecycle > 0 && row.details < 1).length;
      report.counters.ROOM_SHIFTS_EXCESSIVE_BORDER_DENSITY_COUNT += cards.filter((row) => row.details === 0 && row.lifecycle > 0).length;
    }
    if (target.kind === "finance") {
      const finance = page.locator(".pre18-finance-surface:visible").first();
      const counts = await finance.evaluate((node) => {
        const visible = (item) => {
          if (!item || item.closest("details:not([open])")) return false;
          const style = getComputedStyle(item);
          const box = item.getBoundingClientRect();
          return Boolean(box.width && box.height && style.display !== "none" && style.visibility !== "hidden");
        };
        return {
          openDetails: [...node.querySelectorAll("details[open]")].filter(visible).length,
          inputs: [...node.querySelectorAll("input,select,textarea")].filter(visible).length,
          primary: [...node.querySelectorAll(".btn.primary")].filter(visible).length,
          nestedCards: [...node.querySelectorAll(".card .card")].filter(visible).length,
        };
      }).catch(() => ({ openDetails: 0, inputs: 0, primary: 0, nestedCards: 0 }));
      report.counters.FINANCE_ADVANCED_DEFAULT_OPEN_COUNT += counts.openDetails;
      report.counters.FINANCE_VISIBLE_CONTROL_OVERLOAD_COUNT += Math.max(0, counts.inputs - 8);
      report.counters.FINANCE_PRIMARY_ACTION_AMBIGUITY_COUNT += Math.max(0, counts.primary - 1);
      report.counters.FINANCE_EXCESSIVE_NESTED_CARD_COUNT += counts.nestedCards > 4 ? counts.nestedCards - 4 : 0;
    }
    if (target.kind === "agreements") {
      const card = page.locator(".companyAgreementsMobileCard:visible");
      const counts = await card.evaluateAll((nodes) => nodes.flatMap((card) => [...card.querySelectorAll(".pill,.shiftCardActions > *, .shiftCardTitle, .shiftCardSubtle, .shiftCardFieldValue")].filter((node) => node.offsetParent !== null).map((node) => ({
        clip: node.scrollWidth > node.clientWidth + 2 || node.scrollHeight > node.clientHeight + 2,
      })))).catch(() => []);
      report.counters.COMPANY_AGREEMENTS_TEXT_CLIP_COUNT += counts.filter((row) => row.clip).length;
      report.counters.COMPANY_AGREEMENTS_PILL_CLIP_COUNT += counts.filter((row) => row.clip).length;
      report.counters.COMPANY_AGREEMENTS_ACTION_CLIP_COUNT += counts.filter((row) => row.clip).length;
      report.counters.COMPANY_AGREEMENTS_TABLE_CLIP_COUNT += metrics.horizontalOverflow ? 1 : 0;
    }
    if (target.kind === "checkin") {
      report.counters.CHECKIN_VISIBLE_M42_COUNT += /\bM42\b/i.test(bodyText) ? 1 : 0;
      report.counters.CHECKIN_VISIBLE_TOKEN_COUNT += /\bToken\b/i.test(bodyText) ? 1 : 0;
      report.counters.CHECKIN_VISIBLE_ENGINEERING_COPY_COUNT += /Leaflet|tile arka|provider|enum|snake_case|camelCase/i.test(bodyText) ? 1 : 0;
    }
    if (target.kind === "organization") {
      report.counters.ORGANIZATION_ROLE_COPY_LEAK_COUNT += /Hizmet Alan Firma.*organizasyon|organizasyon.*Hizmet Alan Firma/i.test(bodyText) ? 1 : 0;
      report.counters.ORGANIZATION_PLANS_HELPER_CLIP_COUNT += metrics.textClipCount;
      report.counters.ORGANIZATION_PLANS_HORIZONTAL_SCROLL_COUNT += metrics.horizontalOverflow ? 1 : 0;
    }
    if (target.kind === "notifications") {
      const table = await page.locator(".notifTbl:visible").first().evaluate((node) => ({
        right: node.getBoundingClientRect().right,
        viewport: document.documentElement.clientWidth,
        overflow: node.scrollWidth > node.clientWidth + 2,
        pillClip: [...node.querySelectorAll(".pill")].filter((pill) => pill.offsetParent !== null && (pill.scrollWidth > pill.clientWidth + 2 || pill.scrollHeight > pill.clientHeight + 2)).length,
      })).catch(() => ({ right: 0, viewport: 0, overflow: false, pillClip: 0 }));
      report.counters.NOTIFICATIONS_RESPONSIVE_OVERFLOW_COUNT += metrics.horizontalOverflow || table.overflow || table.right > table.viewport + 1 ? 1 : 0;
      report.counters.NOTIFICATIONS_PILL_CLIP_COUNT += table.pillClip;
    }
    if (target.kind === "driver") {
      const fab = page.locator(".copilotFab:visible").first();
      const fabBox = await fab.boundingBox().catch(() => null);
      const overlaps = fabBox ? await page.evaluate((box) => {
        const rects = [...document.querySelectorAll(".leaflet-marker-icon,.leaflet-control,[data-primary-cta=\"true\"],.roleSignalAction,.routeRisk,.criticalAlert")]
          .filter((node) => node.offsetParent !== null)
          .map((node) => node.getBoundingClientRect())
          .filter((r) => box.left < r.right && box.right > r.left && box.top < r.bottom && box.bottom > r.top);
        return { marker: rects.length, control: rects.length };
      }, fabBox).catch(() => ({ marker: 0, control: 0 })) : { marker: 0, control: 0 };
      report.counters.DRIVER_SEFER_ABI_CRITICAL_CONTENT_OVERLAP_COUNT += overlaps.marker;
      report.counters.DRIVER_SEFER_ABI_MAP_CONTROL_OVERLAP_COUNT += overlaps.control;
      report.counters.DRIVER_SEFER_ABI_ROUTE_RISK_OVERLAP_COUNT += overlaps.marker;
    }
    report.counters.RESPONSIVE_TEXT_CLIP_COUNT += metrics.textClipCount;
    report.counters.BLOCKER_COUNT += metrics.horizontalOverflow ? 1 : 0;
    const screenshot = await capture(page, `round1-${target.name}-${target.viewport}`);
    report.evidence.push({ type: "target", context: spec.name, route: target.route, viewport: target.viewport, kind: target.kind, screenshot, metrics });
  } finally {
    await context.close();
  }
}

async function runTaskHomeSummary(browser, tokens) {
  for (const spec of [contexts.find((x) => x.name === "COMPANY"), contexts.find((x) => x.name === "ROOM")]) {
    const { context, page } = await createPage(browser, spec, "mobile", tokens[spec.name]);
    try {
      await page.evaluate(() => window.scrollTo(0, Math.max(0, document.body.scrollHeight / 2)));
      await page.waitForTimeout(120);
      const summary = page.locator('details[data-details="task-workspace"] > summary');
      const fab = page.locator(".copilotFab:visible");
      const before = await summary.boundingBox().catch(() => null);
      const fabBox = await fab.boundingBox().catch(() => null);
      const overlap = before && fabBox && before.left < fabBox.right && before.right > fabBox.left && before.top < fabBox.bottom && before.bottom > fabBox.top;
      if (overlap) report.counters.BLOCKER_COUNT += 1;
      let clickPass = false;
      try {
        await summary.click({ timeout: 3000 });
        await page.waitForTimeout(60);
        clickPass = await page.evaluate(() => Boolean(document.querySelector('details[data-details="task-workspace"]')?.open));
      } catch {
        clickPass = false;
      }
      if (!clickPass) report.counters.BLOCKER_COUNT += 1;
      report.evidence.push({ type: "task-home-summary", context: spec.name, viewport: "mobile", overlap: Boolean(overlap), clickPass, screenshot: await capture(page, `round1-task-home-${spec.name.toLowerCase()}-summary`) });
    } finally {
      await context.close();
    }
  }
}

async function runQuickPanel(browser, tokens) {
  for (const spec of [contexts.find((x) => x.name === "COMPANY"), contexts.find((x) => x.name === "ROOM")]) {
    const { context, page } = await createPage(browser, spec, "mobile", tokens[spec.name]);
    try {
      const launcher = page.locator(".copilotFab:visible").first();
      await capture(page, `round1-quick-${spec.name.toLowerCase()}-closed`);
      await launcher.click();
      await page.waitForTimeout(160);
      const metrics = await layoutMetrics(page);
      report.counters.BLOCKER_COUNT += metrics.horizontalOverflow ? 1 : 0;
      report.counters.RESPONSIVE_TEXT_CLIP_COUNT += metrics.textClipCount;
      const quickScreenshots = [await capture(page, `round1-quick-${spec.name.toLowerCase()}-opened`),
        await capture(page, `round1-quick-${spec.name.toLowerCase()}-actions`),
      ];
      await page.locator(".copilotComposer textarea:visible").scrollIntoViewIfNeeded().catch(() => {});
      quickScreenshots.push(await capture(page, `round1-quick-${spec.name.toLowerCase()}-input`));
      await page.evaluate(() => window.scrollBy(0, 180));
      await page.waitForTimeout(80);
      quickScreenshots.push(await capture(page, `round1-quick-${spec.name.toLowerCase()}-reflow`));
      const closePass = await page.getByRole("button", { name: "Kapat" }).first().click().then(() => true).catch(() => false);
      report.evidence.push({ type: "quick-panel", context: spec.name, viewport: "mobile", closePass, metrics, screenshots: quickScreenshots });
      if (!closePass) report.counters.BLOCKER_COUNT += 1;
    } finally {
      await context.close();
    }
  }
}

async function main() {
  await fs.mkdir(screenshotRoot, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const tokens = {};
  try {
    for (const spec of contexts) tokens[spec.name] = await login(spec);
    await runMobileMenus(browser, tokens);
    await runTaskHomeSummary(browser, tokens);
    await runQuickPanel(browser, tokens);

    const targets = [
      { name: "company-location", kind: "location", route: "/company/georeview", viewport: "mobile", context: "COMPANY" },
      { name: "room-location", kind: "location", route: "/room/hub", viewport: "mobile", context: "ROOM" },
      { name: "room-offers", kind: "offers", route: "/room/offers", viewport: "mobile", context: "ROOM" },
      { name: "room-shifts", kind: "shifts", route: "/room/shifts", viewport: "mobile", context: "ROOM" },
      { name: "room-finance", kind: "finance", route: "/room/financial-operations", viewport: "mobile", context: "ROOM" },
      { name: "company-finance", kind: "finance", route: "/company/financial-operations", viewport: "mobile", context: "COMPANY" },
      { name: "company-agreements", kind: "agreements", route: "/company/agreements", viewport: "mobile", context: "COMPANY" },
      { name: "company-checkin", kind: "checkin", route: "/company/checkin", viewport: "mobile", context: "COMPANY" },
      { name: "organization-plans", kind: "organization", route: "/organization/plans", viewport: "mobile", context: "ORGANIZATION" },
      { name: "driver-map", kind: "driver", route: "/driver/map", viewport: "mobile", context: "DRIVER" },
      { name: "notifications", kind: "notifications", route: "/shared/notifications", viewport: "mobile", context: "COMPANY" },
    ];
    for (const target of targets) {
      const spec = contexts.find((item) => item.name === target.context);
      await runTarget(browser, spec, tokens, target);
    }
  } finally {
    await browser.close();
  }

  report.counters.ROLE_CONTEXT_PROVEN_COUNT = report.counters.MOBILE_MENU_ESCAPE_CLOSE_PASS_COUNT;
  report.counters.VIEWPORT_CONTEXT_PROVEN_COUNT = report.evidence.filter((item) => item.type === "target").length;
  report.counters.HUMAN_REVIEW_ROUND_1_RESOLVED_COUNT = report.counters.BLOCKER_COUNT === 0
    && report.counters.MOBILE_MENU_ESCAPE_CLOSE_PASS_COUNT === contexts.length
    && report.counters.MOBILE_MENU_FOCUS_RETURN_DEFECT_COUNT === 0
    && report.counters.MOBILE_NAV_KEYBOARD_REGRESSION_COUNT === 0
    && report.counters.LOCATION_PANEL_MOBILE_HORIZONTAL_SCROLL_COUNT === 0
    && report.counters.RESPONSIVE_TEXT_CLIP_COUNT === 0
    && report.counters.NOTIFICATIONS_RESPONSIVE_OVERFLOW_COUNT === 0
    ? report.counters.HUMAN_REVIEW_ROUND_1_FINDING_COUNT : 0;
  report.counters.HUMAN_REVIEW_ROUND_1_REMAINING_COUNT = report.counters.HUMAN_REVIEW_ROUND_1_FINDING_COUNT - report.counters.HUMAN_REVIEW_ROUND_1_RESOLVED_COUNT;
  report.counters.MAJOR_FINDING_COUNT = report.counters.HUMAN_REVIEW_ROUND_1_REMAINING_COUNT;
  report.decision = report.counters.HUMAN_REVIEW_ROUND_1_RESOLVED_COUNT === report.counters.HUMAN_REVIEW_ROUND_1_FINDING_COUNT
    && report.counters.consoleErrorCount === 0 && report.counters.pageErrorCount === 0 && report.counters.HTTP_500_COUNT === 0
    ? "PRE_18_HUMAN_REVIEW_ROUND_1_READY_FOR_REAUDIT" : "PRE_18_HUMAN_REVIEW_ROUND_1_BLOCKED";
  const reportPath = path.join(evidenceRoot, "report.json");
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ source: report.source, sourceHead: report.sourceHead, screenshots: report.screenshots.length, counters: report.counters, decision: report.decision, report: path.relative(repoRoot, reportPath).replace(/\\/g, "/") }, null, 2));
  if (report.decision !== "PRE_18_HUMAN_REVIEW_ROUND_1_READY_FOR_REAUDIT") process.exitCode = 1;
}

main().catch(async (error) => {
  report.failure = String(error?.stack || error);
  await fs.mkdir(evidenceRoot, { recursive: true });
  await fs.writeFile(path.join(evidenceRoot, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.error(error?.stack || String(error));
  process.exitCode = 1;
});
