import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const webBaseUrl = (process.env.WEB_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const apiBaseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const headless = String(process.env.HEADLESS || "true").toLowerCase() !== "false";
const artifactRoot = path.join(repoRoot, "backend", "artifacts", "browser-smoke", "pre-18-fve001-single-corrective");
const screenshotRoot = path.join(artifactRoot, "screenshots");
const reportPath = path.join(artifactRoot, "report.json");

const users = {
  SUPER_ADMIN: { identifier: "superadmin@demo.com", route: "/superadmin" },
  ROOM: { identifier: "room@demo.com", route: "/room" },
  SCHOOL: { identifier: "school@demo.com", route: "/school" },
  DRIVER: { identifier: "driver@demo.com", route: "/driver/today", deviceId: "web-vos7tyh6mtpo1gze" },
};

const viewports = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 1024, height: 900 },
  mobile: { width: 390, height: 844 },
};

const report = {
  source: "REAL_PLAYWRIGHT_RENDERED_BROWSER_FVE001_CONTRACT",
  generatedAt: new Date().toISOString(),
  webBaseUrl,
  apiBaseUrl,
  results: [],
  counters: {
    FVE_001_MOBILE_OVERLAP_LOCAL_COUNT: 0,
    FVE_001_DESKTOP_REGRESSION_COUNT: 0,
    FVE_001_TABLET_REGRESSION_COUNT: 0,
    DRAWER_CONTAINMENT_REGRESSION_COUNT: 0,
    SEFER_ABI_PRIMARY_ENTRY_COUNT: 0,
    SEFER_ABI_LAUNCHER_VISIBILITY_REGRESSION_COUNT: 0,
    RESPONSIVE_OVERFLOW_REGRESSION_COUNT: 0,
    CTA_CLIP_REGRESSION_COUNT: 0,
    CONSOLE_ERROR_COUNT: 0,
    PAGE_ERROR_COUNT: 0,
    HTTP_500_COUNT: 0,
  },
};

async function login(user) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        identifier: user.identifier,
        password: "demo123",
        deviceId: user.deviceId || `pre18-fve001-${user.identifier}`,
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok && body.token) return body.token;
    if (response.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 2500));
      continue;
    }
    throw new Error(`login ${user.identifier} HTTP ${response.status}`);
  }
  throw new Error(`login ${user.identifier} rate limited`);
}

async function openRole(browser, role, viewportName, token) {
  const viewport = viewports[viewportName];
  const context = await browser.newContext({
    viewport,
    isMobile: viewportName === "mobile",
    hasTouch: viewportName === "mobile",
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
  });
  await context.addInitScript(({ authToken, deviceId }) => {
    localStorage.setItem("token", authToken);
    if (deviceId) localStorage.setItem("personel_servis_browser_device_id", deviceId);
    localStorage.removeItem("psv1:copilot:drawer:v4");
    localStorage.removeItem("psv1:copilot:launcher-placement:v1");
  }, { authToken: token, deviceId: users[role].deviceId || "" });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  page.on("response", (response) => {
    if (response.status() >= 500) errors.push(`HTTP ${response.status()} ${response.url()}`);
  });
  await page.goto(`${webBaseUrl}/#${users[role].route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.locator(`[data-role-task-home="${role}"]`).waitFor({ state: "visible", timeout: 30000 });
  await page.locator("[data-command-center='true']").waitFor({ state: "visible", timeout: 30000 });
  await page.waitForTimeout(600);
  return { context, page, errors };
}

async function inspectClosedLauncher(page) {
  return page.evaluate(() => {
    const visible = (node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const intersects = (a, b) => Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
    const launcher = document.querySelector('button[aria-label="Sefer Abi’ye Sor, operasyon yardımcısını aç"]');
    const launcherRect = launcher?.getBoundingClientRect() || null;
    const commandText = [...document.querySelectorAll(
      "[data-command-center='true'] .roleSectionTitle, [data-command-center='true'] .roleSectionLead, [data-command-center='true'] .roleSignalCard h3, [data-command-center='true'] .roleSignalCard p, [data-command-center='true'] .roleCommandCenterEmpty",
    )]
      .filter(visible)
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          text: (node.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120),
          rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
        };
      });
    const overlaps = launcherRect ? commandText.filter((item) => intersects(launcherRect, item.rect)) : [];
    const cta = document.querySelector("[data-primary-cta='true'], .rolePrimaryCta");
    const ctaRect = cta?.getBoundingClientRect() || null;
    return {
      launcherCount: document.querySelectorAll('button[aria-label="Sefer Abi’ye Sor, operasyon yardımcısını aç"]').length,
      launcherVisible: Boolean(launcher && visible(launcher)),
      launcherRect: launcherRect ? { left: launcherRect.left, top: launcherRect.top, right: launcherRect.right, bottom: launcherRect.bottom, width: launcherRect.width, height: launcherRect.height } : null,
      launcherInsideViewport: Boolean(launcherRect && launcherRect.left >= 0 && launcherRect.top >= 0 && launcherRect.right <= innerWidth && launcherRect.bottom <= innerHeight),
      meaningfulContentOverlapCount: overlaps.length,
      overlaps,
      documentScrollWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
      cta: ctaRect ? {
        left: ctaRect.left,
        right: ctaRect.right,
        top: ctaRect.top,
        bottom: ctaRect.bottom,
        scrollWidth: cta.scrollWidth,
        clientWidth: cta.clientWidth,
      } : null,
    };
  });
}

async function inspectDrawer(page) {
  const launcher = page.getByRole("button", { name: "Sefer Abi’ye Sor, operasyon yardımcısını aç" });
  await launcher.click();
  const drawer = page.locator(".copilotDrawer");
  await drawer.waitFor({ state: "visible", timeout: 8000 });
  const metrics = await page.evaluate(() => {
    const node = document.querySelector(".copilotDrawer");
    const rect = node?.getBoundingClientRect() || null;
    return {
      exists: Boolean(node),
      inputVisible: Boolean(node?.querySelector("textarea")),
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      documentScrollWidth: document.documentElement.scrollWidth,
      rect: rect ? { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom } : null,
    };
  });
  await page.getByRole("button", { name: "Kapat", exact: true }).click();
  return metrics;
}

function record(role, viewport, name, ok, detail) {
  report.results.push({ role, viewport, name, ok, detail });
}

async function runCase(browser, role, viewportName, token) {
  const { context, page, errors } = await openRole(browser, role, viewportName, token);
  try {
    const closed = await inspectClosedLauncher(page);
    await page.screenshot({ path: path.join(screenshotRoot, `${role.toLowerCase()}-${viewportName}-closed.png`), fullPage: false });
    const mobileOverlap = viewportName === "mobile" ? closed.meaningfulContentOverlapCount : 0;
    const visualRegression = viewportName === "mobile" ? mobileOverlap > 0 : closed.meaningfulContentOverlapCount > 0;
    if (viewportName === "mobile" && visualRegression) report.counters.FVE_001_MOBILE_OVERLAP_LOCAL_COUNT += 1;
    if (viewportName === "desktop" && visualRegression) report.counters.FVE_001_DESKTOP_REGRESSION_COUNT += 1;
    if (viewportName === "tablet" && visualRegression) report.counters.FVE_001_TABLET_REGRESSION_COUNT += 1;
    report.counters.SEFER_ABI_PRIMARY_ENTRY_COUNT += closed.launcherCount;
    if (!closed.launcherVisible || !closed.launcherInsideViewport || closed.launcherCount !== 1) report.counters.SEFER_ABI_LAUNCHER_VISIBILITY_REGRESSION_COUNT += 1;
    if (closed.documentScrollWidth > closed.viewportWidth + 1) report.counters.RESPONSIVE_OVERFLOW_REGRESSION_COUNT += 1;
    const ctaClipped = !closed.cta || closed.cta.left < -0.5 || closed.cta.right > closed.viewportWidth + 0.5 || closed.cta.scrollWidth > closed.cta.clientWidth + 1;
    if (ctaClipped) report.counters.CTA_CLIP_REGRESSION_COUNT += 1;
    record(role, viewportName, "closed-launcher-contract", !visualRegression && closed.launcherVisible && closed.launcherInsideViewport && closed.launcherCount === 1 && !ctaClipped && closed.documentScrollWidth <= closed.viewportWidth + 1, closed);

    if (viewportName === "mobile") {
      const drawer = await inspectDrawer(page);
      const drawerOutOfBounds = !drawer.exists || !drawer.inputVisible || !drawer.rect
        || drawer.rect.left < -0.5 || drawer.rect.top < -0.5
        || drawer.rect.right > drawer.viewportWidth + 0.5 || drawer.rect.bottom > drawer.viewportHeight + 0.5
        || drawer.documentScrollWidth > drawer.viewportWidth + 1;
      if (drawerOutOfBounds) report.counters.DRAWER_CONTAINMENT_REGRESSION_COUNT += 1;
      record(role, viewportName, "drawer-containment", !drawerOutOfBounds, drawer);
    }

    const categorized = errors.filter((error) => /^(console:|page:|HTTP 5)/.test(error));
    report.counters.CONSOLE_ERROR_COUNT += categorized.filter((error) => error.startsWith("console:")).length;
    report.counters.PAGE_ERROR_COUNT += categorized.filter((error) => error.startsWith("page:")).length;
    report.counters.HTTP_500_COUNT += categorized.filter((error) => error.startsWith("HTTP 5")).length;
    record(role, viewportName, "browser-errors", categorized.length === 0, categorized);
  } catch (error) {
    record(role, viewportName, "runner", false, String(error?.stack || error));
  } finally {
    await context.close();
  }
}

async function main() {
  await fs.mkdir(screenshotRoot, { recursive: true });
  const browser = await chromium.launch({ headless });
  report.browserEngine = `Chromium ${browser.version()}`;
  try {
    const tokens = {};
    for (const [role, user] of Object.entries(users)) tokens[role] = await login(user);
    for (const role of Object.keys(users)) await runCase(browser, role, "mobile", tokens[role]);
    for (const role of ["SUPER_ADMIN", "ROOM"]) {
      await runCase(browser, role, "desktop", tokens[role]);
      await runCase(browser, role, "tablet", tokens[role]);
    }
  } finally {
    await browser.close();
  }

  report.pass = report.results.every((result) => result.ok)
    && report.counters.FVE_001_MOBILE_OVERLAP_LOCAL_COUNT === 0
    && report.counters.FVE_001_DESKTOP_REGRESSION_COUNT === 0
    && report.counters.FVE_001_TABLET_REGRESSION_COUNT === 0
    && report.counters.DRAWER_CONTAINMENT_REGRESSION_COUNT === 0
    && report.counters.SEFER_ABI_LAUNCHER_VISIBILITY_REGRESSION_COUNT === 0
    && report.counters.RESPONSIVE_OVERFLOW_REGRESSION_COUNT === 0
    && report.counters.CTA_CLIP_REGRESSION_COUNT === 0
    && report.counters.CONSOLE_ERROR_COUNT === 0
    && report.counters.PAGE_ERROR_COUNT === 0
    && report.counters.HTTP_500_COUNT === 0;
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  for (const [name, value] of Object.entries(report.counters)) console.log(`${name} = ${value}`);
  console.log(`REAL_BROWSER_ENGINE = ${report.browserEngine}`);
  console.log(`REPORT = ${path.relative(repoRoot, reportPath).replace(/\\/g, "/")}`);
  if (!report.pass) process.exitCode = 1;
}

main().catch(async (error) => {
  report.results.push({ role: "RUNNER", viewport: "n/a", name: "fatal", ok: false, detail: String(error?.stack || error) });
  report.pass = false;
  await fs.mkdir(artifactRoot, { recursive: true });
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.error(error?.stack || error);
  process.exitCode = 1;
});
