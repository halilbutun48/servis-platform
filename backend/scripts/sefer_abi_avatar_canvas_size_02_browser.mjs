import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const webBaseUrl = (process.env.WEB_BASE_URL || "http://127.0.0.1:5273").replace(/\/$/, "");
const apiBaseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:3300").replace(/\/$/, "");
const evidenceLabel = String(process.env.EVIDENCE_LABEL || "default").replace(/[^a-z0-9_-]/giu, "-");
const artifactRoot = path.join(repoRoot, "output", "playwright", `sefer-abi-avatar-size-02-${evidenceLabel}`);
const screenshotRoot = path.join(artifactRoot, "screenshots");
const videoRoot = path.join(artifactRoot, "video");
const viewports = [
  { name: "1440", width: 1440, height: 900 },
  { name: "1024", width: 1024, height: 900 },
  { name: "390", width: 390, height: 844 },
  { name: "320", width: 320, height: 700 },
];

const results = [];
const errors = [];
const screenshots = [];
const videos = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
}

async function login() {
  const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: "room@demo.com", password: "demo123", deviceId: `sefer-abi-size-${Date.now()}` }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.token) throw new Error(`ROOM login failed ${response.status}`);
  return body.token;
}

function observe(page, label) {
  page.on("console", (message) => {
    if (message.type() === "error") errors.push({ type: "console", label, text: message.text() });
  });
  page.on("pageerror", (error) => errors.push({ type: "page", label, text: error.message }));
  page.on("response", (response) => {
    if (response.status() >= 500) errors.push({ type: "http", label, status: response.status(), url: response.url() });
  });
}

async function createPage(browser, token, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.width <= 600,
    hasTouch: viewport.width <= 600,
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
    recordVideo: { dir: videoRoot, size: { width: viewport.width, height: viewport.height } },
  });
  const page = await context.newPage();
  observe(page, viewport.name);
  await page.addInitScript((value) => {
    localStorage.setItem("token", value);
    localStorage.removeItem("psv1:copilot:drawer:v4");
    localStorage.removeItem("psv1:copilot:drawer:history:v4");
    localStorage.removeItem("psv1:copilot:launcher-placement:v1");
  }, token);
  return { context, page };
}

async function settle(page) {
  await page.goto(`${webBaseUrl}/#/room`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.locator('.copilotFab--mascot').waitFor({ state: "visible", timeout: 20_000 });
  await page.locator('.seferAbiAvatar[data-sefer-abi-state="idle"]').first().waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForTimeout(850);
}

async function capture(page, name) {
  await fs.mkdir(screenshotRoot, { recursive: true });
  const target = path.join(screenshotRoot, `${name}.png`);
  await page.screenshot({ path: target, fullPage: false });
  screenshots.push(path.relative(repoRoot, target).replace(/\\/g, "/"));
}

async function measureSurface(page, selector, excludedSelector) {
  return page.evaluate(({ selector: targetSelector, excluded }) => {
    const node = document.querySelector(targetSelector);
    const rect = node?.getBoundingClientRect();
    const visibleRect = rect && rect.width > 0 && rect.height > 0 ? rect : null;
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const insideViewport = Boolean(visibleRect
      && visibleRect.left >= 0
      && visibleRect.top >= 0
      && visibleRect.right <= viewport.width
      && visibleRect.bottom <= viewport.height);
    const center = visibleRect
      ? { x: Math.round(visibleRect.left + visibleRect.width / 2), y: Math.round(visibleRect.top + visibleRect.height / 2) }
      : null;
    const centeredElement = center ? document.elementFromPoint(center.x, center.y) : null;
    const clickPass = Boolean(centeredElement && (centeredElement === node || node.contains(centeredElement)));
    const intersects = (a, b) => Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
    const box = (element) => element.getBoundingClientRect();
    const protectedElements = [...document.querySelectorAll(
      'button, a, input, select, textarea, summary, [role="button"], [data-primary-cta="true"], [role="alert"], [role="status"]',
    )].filter((element) => {
      const candidate = box(element);
      return element !== node && !node?.contains(element) && !element.closest(excluded) && candidate.width > 0 && candidate.height > 0;
    });
    const collisions = visibleRect
      ? protectedElements.filter((element) => intersects(visibleRect, box(element))).slice(0, 8).map((element) => {
        const protectedRect = box(element);
        return {
          tag: element.tagName,
          text: String(element.textContent || "").trim().slice(0, 50),
          rect: { left: protectedRect.left, top: protectedRect.top, right: protectedRect.right, bottom: protectedRect.bottom },
        };
      })
      : [];
    const canvas = node?.querySelector("canvas");
    return {
      rect: visibleRect && { left: visibleRect.left, top: visibleRect.top, width: visibleRect.width, height: visibleRect.height, right: visibleRect.right, bottom: visibleRect.bottom },
      canvas: canvas && { width: canvas.width, height: canvas.height, ready: node.getAttribute("data-canvas-ready") },
      state: node?.getAttribute("data-sefer-abi-state") || "",
      insideViewport,
      clickPass,
      collisions,
      horizontalOverflow: document.documentElement.scrollWidth > viewport.width + 1,
    };
  }, { selector, excluded: excludedSelector });
}

async function runViewport(browser, token, viewport) {
  const { context, page } = await createPage(browser, token, viewport);
  try {
    await settle(page);
    const launcher = await measureSurface(page, ".copilotFab--mascot", ".copilotFab--mascot,.copilotDrawer");
    const launcherExpected = viewport.width >= 1181 ? 80 : viewport.width >= 721 ? 72 : 64;
    const launcherAvatarExpected = viewport.width >= 1181 ? 64 : viewport.width >= 721 ? 56 : 48;
    const launcherAvatarWidth = await page.locator(".copilotFab--mascot .seferAbiAvatar").first().evaluate((node) => node.getBoundingClientRect().width);
    const launcherSizePass = Math.abs((launcher.rect?.width || 0) - launcherExpected) < 1
      && Math.abs((launcher.rect?.height || 0) - launcherExpected) < 1
      && Math.abs(launcherAvatarWidth - launcherAvatarExpected) < 1;
    record(`${viewport.name}px launcher target and Canvas size`, launcherSizePass, JSON.stringify({ launcher, launcherExpected, launcherAvatarExpected, launcherAvatarWidth }));
    record(`${viewport.name}px launcher visible/clickable`, launcher.insideViewport && launcher.clickPass, JSON.stringify({ insideViewport: launcher.insideViewport, clickPass: launcher.clickPass }));
    record(`${viewport.name}px launcher avoids protected controls`, launcher.collisions.length === 0, JSON.stringify({ collisions: launcher.collisions }));
    record(`${viewport.name}px closed layout has no horizontal overflow`, launcher.horizontalOverflow === false, JSON.stringify({ horizontalOverflow: launcher.horizontalOverflow }));
    await page.waitForFunction(() => Number(document.querySelector(".copilotFab--mascot canvas")?.dataset.faceLid || 0) > 0.5, { timeout: 6_500 });
    record(`${viewport.name}px enlarged launcher still reaches IDLE blink`, true, "Canvas face-lid > 0.5 observed");
    await capture(page, `closed-${viewport.name}`);

    await page.locator('.copilotFab--mascot').click();
    await page.locator('.copilotDrawer').waitFor({ state: "visible", timeout: 15_000 });
    await page.waitForTimeout(400);
    const drawer = await measureSurface(page, ".copilotDrawer", ".copilotDrawer");
    const drawerAvatar = await page.locator(".copilotDrawerIdentity > .seferAbiAvatar").first().evaluate((node) => ({
      width: node.getBoundingClientRect().width,
      height: node.getBoundingClientRect().height,
      canvasWidth: node.querySelector("canvas")?.width || 0,
      canvasHeight: node.querySelector("canvas")?.height || 0,
      state: node.getAttribute("data-sefer-abi-state"),
    }));
    const expectedDrawer = viewport.width >= 1181 ? 112 : viewport.width >= 721 ? 104 : 100;
    const drawerSizePass = Math.abs(drawerAvatar.width - expectedDrawer) < 1 && Math.abs(drawerAvatar.height - expectedDrawer) < 1 && drawerAvatar.canvasWidth >= expectedDrawer;
    record(`${viewport.name}px open-panel avatar target and Canvas size`, drawerSizePass, JSON.stringify({ drawerAvatar, expectedDrawer }));
    record(`${viewport.name}px open panel remains visible and contained`, drawer.insideViewport && drawer.horizontalOverflow === false, JSON.stringify({ insideViewport: drawer.insideViewport, horizontalOverflow: drawer.horizontalOverflow, rect: drawer.rect }));
    record(`${viewport.name}px open panel avoids outside protected controls`, drawer.collisions.length === 0, JSON.stringify({ collisions: drawer.collisions }));
    await capture(page, `open-${viewport.name}`);
  } finally {
    const video = page.video();
    await context.close();
    if (video) videos.push(path.relative(repoRoot, await video.path()).replace(/\\/g, "/"));
  }
}

async function run() {
  await fs.rm(artifactRoot, { recursive: true, force: true });
  await fs.mkdir(videoRoot, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const token = await login();
    for (const viewport of viewports) await runViewport(browser, token, viewport);
  } finally {
    await browser.close();
  }

  const report = {
    generatedAt: new Date().toISOString(),
    webBaseUrl,
    apiBaseUrl,
    browserEvidenceType: "REAL_PLAYWRIGHT_CHROMIUM",
    screenshots,
    videos,
    results,
    passCount: results.filter((item) => item.ok).length,
    failCount: results.filter((item) => !item.ok).length,
    errors,
    errorCount: errors.length,
  };
  await fs.writeFile(path.join(artifactRoot, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
  if (report.failCount > 0 || report.errorCount > 0) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
