import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const webBaseUrl = (process.env.WEB_BASE_URL || "http://127.0.0.1:5174").replace(/\/$/, "");
const apiBaseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:3300").replace(/\/$/, "");
const spriteQuery = process.env.SPRITE_QUERY || "";
const label = String(process.env.EVIDENCE_LABEL || "sprite-blink-trial-08").replace(/[^a-z0-9_-]/gi, "-");
const artifactRoot = path.join(repoRoot, "backend", "artifacts", "browser-smoke", "sefer-abi-sprite-blink-trial-08", label);
const screenshotRoot = path.join(artifactRoot, "screenshots");
const videoRoot = path.join(artifactRoot, "video");
const viewports = [
  { name: "desktop-1440", width: 1440, height: 900, launcher: 80, drawer: 112 },
  { name: "tablet-1024", width: 1024, height: 900, launcher: 72, drawer: 104 },
  { name: "mobile-390", width: 390, height: 844, launcher: 64, drawer: 100 },
  { name: "mobile-320", width: 320, height: 844, launcher: 64, drawer: 100 },
];
const results = [];
const errors = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
}

async function login() {
  const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: "room@demo.com", password: "demo123", deviceId: `sefer-abi-sprite-${label}` }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.token) throw new Error(`ROOM login failed ${response.status}`);
  return body.token;
}

async function avatarSnapshot(page) {
  return page.evaluate(() => [...document.querySelectorAll(".seferAbiAvatar")].map((element) => {
    const rect = element.getBoundingClientRect();
    const sprite = element.querySelector(".seferAbiAvatar__sprite");
    const fallback = element.querySelector(".seferAbiAvatar__fallback");
    return {
      surface: element.closest(".copilotDrawer") ? "drawer" : "launcher",
      frame: element.getAttribute("data-sprite-frame"),
      animation: element.getAttribute("data-sprite-animation"),
      error: element.getAttribute("data-sprite-error"),
      width: rect.width,
      height: rect.height,
      spriteLoaded: Boolean(sprite?.complete && sprite.naturalWidth > 0),
      fallbackLoaded: Boolean(fallback?.complete && fallback.naturalWidth > 0),
    };
  }));
}

async function openSurface(page) {
  await page.goto(`${webBaseUrl}/#/room${spriteQuery}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.locator('button[aria-label="Sefer Abi’ye Sor, operasyon yardımcısını aç"]').waitFor({ state: "visible", timeout: 30000 });
  await page.waitForFunction(() => [...document.querySelectorAll(".seferAbiAvatar")].some((element) => element.getAttribute("data-sprite-animation") === "trial"), null, { timeout: 30000 });
}

async function openDrawer(page) {
  await page.locator('button[aria-label="Sefer Abi’ye Sor, operasyon yardımcısını aç"]').click();
  await page.locator(".copilotDrawer").waitFor({ state: "visible", timeout: 10000 });
  await page.waitForFunction(() => document.querySelector(".copilotDrawer .seferAbiAvatar")?.getAttribute("data-sprite-animation") === "trial", null, { timeout: 30000 });
}

async function runViewport(browser, token, viewport) {
  const isVideo = viewport.width === 1440;
  const contextOptions = {
    viewport: { width: viewport.width, height: viewport.height },
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
    isMobile: viewport.width <= 600,
    hasTouch: viewport.width <= 600,
  };
  if (isVideo) contextOptions.recordVideo = { dir: videoRoot, size: { width: viewport.width, height: viewport.height } };
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  page.on("console", (message) => { if (message.type() === "error") errors.push({ viewport: viewport.name, type: "console", text: message.text() }); });
  page.on("pageerror", (error) => errors.push({ viewport: viewport.name, type: "page", text: error.message }));
  await page.addInitScript((value) => {
    localStorage.setItem("token", value);
    localStorage.removeItem("psv1:copilot:drawer:v4");
    localStorage.removeItem("psv1:copilot:launcher-placement:v1");
  }, token);
  await openSurface(page);
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(screenshotRoot, `${viewport.name}-launcher-trial-open.png`) });
  const launcherInitial = (await avatarSnapshot(page)).filter((entry) => entry.surface === "launcher");
  let launcherClosedObserved = false;
  await page.waitForFunction(() => document.querySelector('.copilotFab--mascot .seferAbiAvatar')?.getAttribute("data-sprite-frame") === "closed", null, { polling: 10, timeout: 12000 });
  launcherClosedObserved = true;
  await page.screenshot({ path: path.join(screenshotRoot, `${viewport.name}-launcher-trial-closed.png`) });
  const launcherClosed = (await avatarSnapshot(page)).filter((entry) => entry.surface === "launcher");
  await openDrawer(page);
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(screenshotRoot, `${viewport.name}-drawer-trial-open.png`) });
  const drawerInitial = (await avatarSnapshot(page)).filter((entry) => entry.surface === "drawer");
  await page.waitForFunction(() => [...document.querySelectorAll(".seferAbiAvatar")].some((element) => element.getAttribute("data-sprite-frame") === "halfClose"), null, { polling: 10, timeout: 12000 });
  await page.screenshot({ path: path.join(screenshotRoot, `${viewport.name}-drawer-trial-half-close.png`) });
  let closedObserved = false;
  await page.waitForFunction(() => [...document.querySelectorAll(".seferAbiAvatar")].some((element) => element.getAttribute("data-sprite-frame") === "closed"), null, { polling: 10, timeout: 12000 });
  closedObserved = true;
  await page.screenshot({ path: path.join(screenshotRoot, `${viewport.name}-drawer-trial-closed.png`) });
  const closed = (await avatarSnapshot(page)).filter((entry) => entry.surface === "drawer");
  const allInitial = launcherInitial.concat(drawerInitial);
  const stableSize = allInitial.concat(launcherClosed, closed).every((entry) => {
    const expected = entry.surface === "drawer" ? viewport.drawer : viewport.launcher;
    return Math.abs(entry.width - expected) <= 1 && Math.abs(entry.height - expected) <= 1;
  });
  const trialActive = allInitial.length >= 2 && allInitial.every((entry) => entry.animation === "trial" && entry.spriteLoaded && entry.fallbackLoaded);
  const noError = allInitial.concat(launcherClosed, closed).every((entry) => entry.error !== "true");
  record(`${viewport.name} default sprite blink`, trialActive && noError, JSON.stringify({ launcherInitial, drawerInitial, launcherClosed, closed }));
  record(`${viewport.name} stable launcher/drawer geometry through blink`, stableSize, JSON.stringify({ launcherInitial, drawerInitial, launcherClosed, closed }));
  record(`${viewport.name} launcher closed frame observed`, launcherClosedObserved, JSON.stringify({ observed: launcherClosedObserved, snapshotAfterCapture: launcherClosed }));
  record(`${viewport.name} drawer closed frame observed`, closedObserved, JSON.stringify({ observed: closedObserved, snapshotAfterCapture: closed }));
  record(`${viewport.name} no console/page errors`, errors.every((error) => error.viewport !== viewport.name), JSON.stringify(errors.filter((error) => error.viewport === viewport.name)));
  const videoPathPromise = page.video()?.path() || null;
  await context.close();
  const videoPath = videoPathPromise ? await videoPathPromise : null;
  return { viewport: viewport.name, launcherInitial, drawerInitial, launcherClosed, closed, videoPath: videoPath ? path.relative(repoRoot, videoPath).replace(/\\/g, "/") : null };
}

async function checkStaticFallback(browser, token) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce", locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  const page = await context.newPage();
  await page.addInitScript((value) => localStorage.setItem("token", value), token);
  await page.goto(`${webBaseUrl}/#/room${spriteQuery}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.locator('button[aria-label="Sefer Abi’ye Sor, operasyon yardımcısını aç"]').waitFor({ state: "visible", timeout: 30000 });
  await page.waitForTimeout(800);
  const snapshot = await avatarSnapshot(page);
  const ok = snapshot.length >= 1 && snapshot.every((entry) => entry.animation === "static" && entry.frame === "open" && entry.fallbackLoaded && !entry.spriteLoaded);
  record("prefers-reduced-motion keeps original static fallback", ok, JSON.stringify(snapshot));
  await context.close();
}

await fs.mkdir(screenshotRoot, { recursive: true });
await fs.mkdir(videoRoot, { recursive: true });
const token = await login();
const browser = await chromium.launch({ headless: true });
const snapshots = [];
try {
  await checkStaticFallback(browser, token);
  for (const viewport of viewports) snapshots.push(await runViewport(browser, token, viewport));
} finally {
  await browser.close();
}

const report = { label, webBaseUrl, apiBaseUrl, generatedAt: new Date().toISOString(), results, snapshots, errors, video: snapshots.find((item) => item.videoPath)?.videoPath || null };
await fs.writeFile(path.join(artifactRoot, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (results.some((result) => !result.ok)) process.exitCode = 1;
