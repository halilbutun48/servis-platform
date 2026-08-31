import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { prisma } from "../src/prisma.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const webBase = (process.env.WEB_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const artifactRoot = path.join(root, "backend", "artifacts", "browser-smoke", "role-based-simple-navigation-and-task-home-01");
const screenshotRoot = path.join(artifactRoot, "screenshots");
const users = {
  SUPER_ADMIN: { identifier: "superadmin@demo.com", route: "/superadmin" },
  COMPANY: { identifier: "company@demo.com", route: "/company" },
  ROOM: { identifier: "room@demo.com", route: "/room" },
  SCHOOL: { identifier: "school@demo.com", route: "/school" },
  ORGANIZATION: { identifier: "organization@demo.com", route: "/organization" },
  DRIVER: { identifier: "driver@demo.com", route: "/driver/today" },
  PERSONEL: { identifier: "personel@demo.com", route: "/personel/live" },
  PARENT: { identifier: "parent@demo.com", route: "/parent/live" },
};
const primaryRoutes = {
  SUPER_ADMIN: "/superadmin/operations",
  COMPANY: "/company/operations",
  ROOM: "/room/offers",
  SCHOOL: "/school/parents",
  ORGANIZATION: "/organization/plans",
  DRIVER: "/driver/route",
  PERSONEL: "/personel/my",
  PARENT: "/parent/live",
};
const report = {
  generatedAt: new Date().toISOString(),
  sourceHead: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  webBase,
  rolePassCount: 0,
  screenshotEvidenceCount: 0,
  mascotPrimaryEntryPassCount: 0,
  mascotOpenClosePassCount: 0,
  quickFullContinuityPassCount: 0,
  roleTaskCompletionPassCount: 0,
  summaryDisclosurePassCount: 0,
  advancedDisclosurePassCount: 0,
  commandCenterPassCount: 0,
  mapProgressiveDisclosureBrowserPassCount: 0,
  mapFiveSecondHierarchyPassCount: 0,
  mapDisclosureUnexpectedResetCount: 0,
  mapMobilePrimaryActionOverlapCount: 0,
  mapMobileBlockingPanelCount: 0,
  workingMapCapabilityLostCount: 0,
  criticalMapOperationSignalHiddenCount: 0,
  mapDefaultVisibleTechnicalOverloadCount: 0,
  userFacingTerminalLabelCount: 0,
  duplicatePrimaryEntryCount: 0,
  criticalUiOverlapCount: 0,
  consoleErrorCount: 0,
  pageErrorCount: 0,
  unexpected500Count: 0,
  rows: [],
};
const consoleErrors = [];
const pageErrors = [];

function record(role, state, ok, detail = "") {
  report.rows.push({ role, state, ok, detail });
  if (!ok) throw new Error(`FAIL ${role} ${state}${detail ? `: ${detail}` : ""}`);
}

async function capture(page, role, viewport, state) {
  const dir = path.join(screenshotRoot, viewport);
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${role.toLowerCase()}-${state}.png`);
  await page.screenshot({ path: file, fullPage: false });
  report.screenshotEvidenceCount += 1;
  return path.relative(root, file).replace(/\\/g, "/");
}

function observe(page, role) {
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(`${role}: ${message.text()}`); });
  page.on("pageerror", (error) => pageErrors.push(`${role}: ${error.message}`));
  page.on("response", (response) => { if (response.status() >= 500) report.unexpected500Count += 1; });
}

function intersects(a, b) {
  if (!a || !b) return false;
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

async function assertCriticalUiDoesNotOverlap(page, role, mascot, drawer = null) {
  const primary = page.locator('[data-primary-cta="true"]').first();
  const nav = page.locator("#shell-nav-dock").first();
  const viewport = page.viewportSize();
  const mascotBox = mascot && (await mascot.count()) ? await mascot.boundingBox() : null;
  const primaryBox = await primary.boundingBox();
  const navBox = (await nav.count()) ? await nav.boundingBox() : null;
  const drawerBox = drawer ? await drawer.boundingBox() : null;
  const criticalBoxes = [primaryBox, navBox].filter(Boolean);
  const fixedBoxes = [mascotBox, drawerBox].filter(Boolean);
  const overlap = fixedBoxes.some((fixed) => criticalBoxes.some((critical) => intersects(fixed, critical)));
  const outOfViewport = viewport && fixedBoxes.some((box) => box.x < 0 || box.y < 0 || box.x + box.width > viewport.width || box.y + box.height > viewport.height);
  if (overlap || outOfViewport) report.criticalUiOverlapCount += 1;
  record(role, "critical-ui-no-overlap", !overlap && !outOfViewport, `overlap=${overlap} outOfViewport=${outOfViewport} mascot=${JSON.stringify(mascotBox)} drawer=${JSON.stringify(drawerBox)} primary=${JSON.stringify(primaryBox)} nav=${JSON.stringify(navBox)}`);
}

async function runMapProgressiveDisclosureAcceptance(page, role, viewportName) {
  const route = role === "ROOM" ? "/room/map" : "/company/map";
  await page.goto(`${webBase}/#${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1100);

  const surface = page.locator('[data-map-surface="primary"]');
  const map = surface.locator(".mapViewShell");
  const currentState = surface.locator('[data-map-current-state="true"]');
  const primary = surface.locator('[data-primary-cta="true"]').first();
  const disclosures = page.locator('details[data-map-disclosure="secondary"]');
  const visibleStateText = await currentState.innerText().catch(() => "");
  const hasOperationalState = /GPS|Vardiya|Araç|durak|rota/i.test(visibleStateText);
  const primaryVisible = await primary.count() === 1 && await primary.isVisible().catch(() => false);
  const mapVisible = await map.count() === 1 && await map.isVisible().catch(() => false);

  record(role, `map-default-${viewportName}`, mapVisible && hasOperationalState && primaryVisible, `map=${mapVisible} state=${hasOperationalState} primary=${primaryVisible}`);
  if (!mapVisible) report.workingMapCapabilityLostCount += 1;
  record(role, `map-five-second-${viewportName}`, mapVisible && hasOperationalState && primaryVisible, `state=${visibleStateText.slice(0, 220).replace(/\s+/g, " ")}`);
  report.mapFiveSecondHierarchyPassCount += 1;
  if (!mapVisible || !hasOperationalState) report.criticalMapOperationSignalHiddenCount += 1;

  const defaultOpenCount = await disclosures.evaluateAll((items) => items.filter((item) => item.open).length);
  const technicalBodyVisible = await disclosures.locator(".mapOperationsDisclosureBody").evaluateAll((items) => items.some((item) => item.closest("details")?.open));
  const defaultSimple = defaultOpenCount === 0 && !technicalBodyVisible;
  record(role, `map-default-disclosure-${viewportName}`, defaultSimple, `open=${defaultOpenCount} bodyVisible=${technicalBodyVisible}`);
  if (!defaultSimple) report.mapDefaultVisibleTechnicalOverloadCount += 1;

  const disclosure = disclosures.filter({ has: page.locator("summary") }).first();
  const disclosureAvailable = await disclosure.count() === 1;
  record(role, `map-secondary-disclosure-available-${viewportName}`, disclosureAvailable);
  if (disclosureAvailable) {
    await disclosure.locator("summary").click();
    const opened = await disclosure.evaluate((element) => element.open);
    record(role, `map-secondary-disclosure-open-${viewportName}`, opened);
    await page.waitForTimeout(250);
    const fitButton = page.locator('button').filter({ hasText: "Tümünü Göster" }).first();
    if (await fitButton.count()) await fitButton.click().catch(() => {});
    await page.waitForTimeout(250);
    const stayedOpen = await disclosure.evaluate((element) => element.open);
    if (!stayedOpen) report.mapDisclosureUnexpectedResetCount += 1;
    record(role, `map-secondary-disclosure-stable-${viewportName}`, stayedOpen);
    await disclosure.locator("summary").click();
    const closed = !(await disclosure.evaluate((element) => element.open));
    record(role, `map-secondary-disclosure-close-${viewportName}`, closed && await map.isVisible());
    report.mapProgressiveDisclosureBrowserPassCount += 1;
  }

  const mascot = page.getByRole("button", { name: "Sefer Abi’ye Sor, operasyon yardımcısını aç" });
  await assertCriticalUiDoesNotOverlap(page, role, mascot);
  if (viewportName === "mobile") {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    const viewport = page.viewportSize();
    await primary.scrollIntoViewIfNeeded();
    const primaryBox = await primary.boundingBox();
    const primaryReachable = Boolean(primaryBox && primaryBox.y >= 0 && primaryBox.y + primaryBox.height <= (viewport?.height || 0) + 1);
    await map.scrollIntoViewIfNeeded();
    const mapBox = await map.boundingBox();
    const mapReachable = Boolean(mapBox && mapBox.y >= 0 && mapBox.y < (viewport?.height || 0) && Math.min(mapBox.y + mapBox.height, viewport?.height || 0) - mapBox.y >= 120);
    const blocked = overflow || !primaryReachable || !mapReachable;
    if (blocked) report.mapMobileBlockingPanelCount += 1;
    record(role, "map-mobile-layout", !blocked, `overflow=${overflow} primary=${JSON.stringify(primaryBox)} map=${JSON.stringify(mapBox)}`);
    await primary.scrollIntoViewIfNeeded();
    const primaryReachableBox = await primary.boundingBox();
    const mascotBox = await mascot.boundingBox();
    if (mascotBox && primaryReachableBox && intersects(mascotBox, primaryReachableBox)) report.mapMobilePrimaryActionOverlapCount += 1;
    record(role, "map-mobile-primary-action-reachable", !(mascotBox && primaryReachableBox && intersects(mascotBox, primaryReachableBox)));
  }
  await capture(page, role, viewportName, `map-${disclosureAvailable ? "disclosure-closed" : "default"}`);
}

async function login(page, role) {
  await page.goto(`${webBase}/#/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  const user = users[role];
  const identifier = page.locator('input[autocomplete="username"]');
  await identifier.waitFor({ state: "visible", timeout: 30000 });
  await identifier.fill(user.identifier);
  await page.locator('input[autocomplete="current-password"]').fill("demo123");
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await identifier.waitFor({ state: "hidden", timeout: 30000 });
  await page.waitForTimeout(1000);
}

async function checkVisibleShell(page, role) {
  const body = await page.locator("body").innerText();
  const terminalCount = (body.match(/Sefer Abi Terminali/gi) || []).length;
  report.userFacingTerminalLabelCount += terminalCount;
  if (terminalCount) record(role, "terminal-label-absent", false, `count=${terminalCount}`);
  const mascot = page.getByRole("button", { name: "Sefer Abi’ye Sor, operasyon yardımcısını aç" });
  const mascotCount = await mascot.count();
  if (mascotCount !== 1) report.duplicatePrimaryEntryCount += Math.max(0, mascotCount - 1);
  record(role, "single-mascot-entry", mascotCount === 1, `count=${mascotCount}`);
  return mascot;
}

async function runRole(browser, role, viewport = { width: 1440, height: 900 }, viewportName = "desktop") {
  const context = await browser.newContext({ viewport, isMobile: viewportName === "mobile", hasTouch: viewportName === "mobile", locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  if (role === "DRIVER") {
    const driver = await prisma.user.findUnique({ where: { email: users[role].identifier }, select: { role: true, deviceId: true } });
    if (driver?.role === "DRIVER" && driver.deviceId) {
      await context.addInitScript((deviceId) => {
        localStorage.setItem("personel_servis_browser_device_id", deviceId);
      }, String(driver.deviceId));
    }
  }
  const page = await context.newPage();
  observe(page, role);
  try {
    await login(page, role);
    await page.goto(`${webBase}/#${users[role].route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(1100);
    const home = page.locator(`[data-role-task-home="${role}"]`);
    await home.waitFor({ state: "visible", timeout: 30000 });
    const body = await page.locator("body").innerText();
    const taskHomeReady = body.includes("Bugün neye odaklanmalısın?") && await home.locator('[data-summary-next="true"]').count() === 1;
    const summaryCards = await home.locator(".roleTaskSummaryCard").allInnerTexts();
    record(role, "task-home", taskHomeReady, taskHomeReady ? "" : `heading=${body.includes("Bugün neye odaklanmalısın?")} next=${body.includes("Şimdi ne yapmalıyım?")} cards=${JSON.stringify(summaryCards)} tail=${body.slice(-420).replace(/\s+/g, " ")}`);
    await capture(page, role, viewportName, "closed");
    const mascot = await checkVisibleShell(page, role);
    await assertCriticalUiDoesNotOverlap(page, role, mascot);
    const commandCenter = page.getByRole("region", { name: "Sorunlar ve fırsatlar" });
    record(role, "command-center", (await commandCenter.count()) === 1);
    report.commandCenterPassCount += 1;
    const details = home.locator('details[data-details="task-workspace"]');
    await details.locator("summary").first().click();
    record(role, "details-disclosure", await details.evaluate((element) => element.hasAttribute("open")));
    report.summaryDisclosurePassCount += 1;
    if (viewportName === "desktop") {
      const advancedToggle = page.getByRole("button", { name: /^SİSTEM/ }).first();
      await advancedToggle.click();
      record(role, "advanced-disclosure", (await page.locator("#shell-nav-dock").innerText()).includes("SİSTEM"));
      report.advancedDisclosurePassCount += 1;
    }
    await mascot.click();
    const drawer = page.locator(".copilotDrawer");
    await drawer.waitFor({ state: "visible", timeout: 5000 });
    record(role, "mascot-open", (await drawer.count()) === 1 && (await page.locator("body").innerText()).includes("Sefer Abi’ye Sor"));
    await assertCriticalUiDoesNotOverlap(page, role, mascot, drawer);
    report.mascotPrimaryEntryPassCount += 1;
    await capture(page, role, viewportName, "quick-open");
    await page.getByRole("button", { name: "Kapat", exact: true }).click();
    await mascot.waitFor({ state: "visible", timeout: 5000 });
    record(role, "mascot-close", true);
    report.mascotOpenClosePassCount += 1;
    if (viewportName === "desktop" && role === "ROOM") {
      await mascot.click();
      await page.getByRole("button", { name: "Tam ekranda aç", exact: true }).click();
      await page.waitForTimeout(900);
      const fullBody = await page.locator("body").innerText();
      record(role, "quick-full-continuity", page.url().includes("/room/copilot") && fullBody.includes("Sefer Abi") && fullBody.includes("Canlı Takip"));
      report.quickFullContinuityPassCount += 1;
      await capture(page, role, viewportName, "full-workspace");
      await page.goto(`${webBase}/#/room`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(800);
      record(role, "single-entry-after-full", (await page.getByRole("button", { name: "Sefer Abi’ye Sor, operasyon yardımcısını aç" }).count()) === 1);
    }
    const primaryCta = page.locator('[data-primary-cta="true"]').first();
    await primaryCta.click();
    await page.waitForTimeout(750);
    record(role, "real-task-completion", page.url().includes(primaryRoutes[role]));
    report.roleTaskCompletionPassCount += 1;
    if (role === "ROOM" || role === "COMPANY") {
      await runMapProgressiveDisclosureAcceptance(page, role, viewportName);
    }
    report.rolePassCount += 1;
    return { role, viewport: viewportName, screenshot: true };
  } finally {
    await context.close();
  }
}

async function main() {
  await fs.mkdir(artifactRoot, { recursive: true });
  const browser = await chromium.launch({ headless: String(process.env.HEADLESS || "true").toLowerCase() !== "false" });
  try {
    for (const role of Object.keys(users)) await runRole(browser, role);
    await runRole(browser, "ROOM", { width: 390, height: 844 }, "mobile");
    await runRole(browser, "COMPANY", { width: 390, height: 844 }, "mobile");
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
  report.consoleErrorCount = consoleErrors.length;
  report.pageErrorCount = pageErrors.length;
  report.consoleErrors = consoleErrors.slice(0, 20);
  report.pageErrors = pageErrors.slice(0, 20);
  report.screenshotEvidence = report.rows.filter((row) => row.state === "task-home").map((row) => row.role);
  await fs.writeFile(path.join(artifactRoot, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await fs.writeFile(path.join(artifactRoot, "report.md"), `# #17 real browser evidence\n\n- HEAD: \`${report.sourceHead}\`\n- Role passes: ${report.rolePassCount}\n- Screenshots: ${report.screenshotEvidenceCount}\n- Mascot primary entry: ${report.mascotPrimaryEntryPassCount}\n- Open/close: ${report.mascotOpenClosePassCount}\n- Quick/full continuity: ${report.quickFullContinuityPassCount}\n- Map progressive disclosure: ${report.mapProgressiveDisclosureBrowserPassCount}\n- Map five-second hierarchy: ${report.mapFiveSecondHierarchyPassCount}\n- Map disclosure resets: ${report.mapDisclosureUnexpectedResetCount}\n- Map mobile overlap/blocking: ${report.mapMobilePrimaryActionOverlapCount}/${report.mapMobileBlockingPanelCount}\n- Working map capability loss: ${report.workingMapCapabilityLostCount}\n- Console errors: ${report.consoleErrorCount}\n- Page errors: ${report.pageErrorCount}\n- Unexpected 5xx: ${report.unexpected500Count}\n\nBrowser output is commit-external evidence.\n`, "utf8");
  if (report.consoleErrorCount || report.pageErrorCount || report.unexpected500Count) process.exitCode = 1;
  console.log(`ROLE_PASS_COUNT = ${report.rolePassCount}`);
  console.log(`SCREENSHOT_EVIDENCE_COUNT = ${report.screenshotEvidenceCount}`);
  console.log(`MASCOT_PRIMARY_ENTRY_PASS_COUNT = ${report.mascotPrimaryEntryPassCount}`);
  console.log(`MASCOT_OPEN_CLOSE_PASS_COUNT = ${report.mascotOpenClosePassCount}`);
  console.log(`QUICK_FULL_CONTEXT_CONTINUITY_PASS_COUNT = ${report.quickFullContinuityPassCount}`);
  console.log(`MAP_PROGRESSIVE_DISCLOSURE_BROWSER_PASS_COUNT = ${report.mapProgressiveDisclosureBrowserPassCount}`);
  console.log(`MAP_FIVE_SECOND_HIERARCHY_PASS_COUNT = ${report.mapFiveSecondHierarchyPassCount}`);
  console.log(`MAP_DISCLOSURE_UNEXPECTED_RESET_COUNT = ${report.mapDisclosureUnexpectedResetCount}`);
  console.log(`MAP_MOBILE_PRIMARY_ACTION_OVERLAP_COUNT = ${report.mapMobilePrimaryActionOverlapCount}`);
  console.log(`MAP_MOBILE_BLOCKING_PANEL_COUNT = ${report.mapMobileBlockingPanelCount}`);
  console.log(`WORKING_MAP_CAPABILITY_LOST_COUNT = ${report.workingMapCapabilityLostCount}`);
  console.log(`CONSOLE_ERROR_COUNT = ${report.consoleErrorCount}`);
  console.log(`PAGE_ERROR_COUNT = ${report.pageErrorCount}`);
  console.log(`UNEXPECTED_500_COUNT = ${report.unexpected500Count}`);
  console.log(`REPORT = ${path.relative(root, path.join(artifactRoot, "report.json")).replace(/\\/g, "/")}`);
}

main().catch(async (error) => {
  try { await fs.mkdir(artifactRoot, { recursive: true }); await fs.writeFile(path.join(artifactRoot, "report.json"), JSON.stringify({ ...report, failure: String(error?.stack || error), consoleErrors, pageErrors }, null, 2)); } catch { /* best effort */ }
  console.error(error?.stack || String(error));
  process.exit(1);
});
