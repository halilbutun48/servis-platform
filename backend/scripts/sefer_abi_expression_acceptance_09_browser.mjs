import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const webBaseUrl = (process.env.WEB_BASE_URL || "http://127.0.0.1:5273").replace(/\/$/, "");
const apiBaseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:3300").replace(/\/$/, "");
const label = String(process.env.EVIDENCE_LABEL || "local-r1").replace(/[^a-z0-9_-]/gi, "-");
const artifactRoot = path.join(repoRoot, "backend", "artifacts", "browser-smoke", "sefer-abi-expression-acceptance-09", label);
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
    body: JSON.stringify({ identifier: "room@demo.com", password: "demo123", deviceId: `sefer-abi-expression-${label}` }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.token) throw new Error(`ROOM login failed ${response.status}`);
  return body.token;
}

async function avatarSnapshot(page) {
  return page.evaluate(() => [...document.querySelectorAll(".seferAbiAvatar")].map((element) => {
    const rect = element.getBoundingClientRect();
    const sprite = element.querySelector(".seferAbiAvatar__sprite");
    const expression = element.querySelector(".seferAbiAvatar__expression");
    const expressionFrame = element.querySelector(".seferAbiAvatar__expressionFrame");
    const fallback = element.querySelector(".seferAbiAvatar__fallback");
    return {
      surface: element.closest(".copilotDrawer") ? "drawer" : "launcher",
      frame: element.getAttribute("data-sprite-frame"),
      animation: element.getAttribute("data-sprite-animation"),
      error: element.getAttribute("data-sprite-error"),
      width: rect.width,
      height: rect.height,
      spriteLoaded: Boolean(
        ((sprite || expression)?.complete && (sprite || expression).naturalWidth > 0)
        || (expressionFrame && getComputedStyle(expressionFrame).backgroundImage !== "none"),
      ),
      fallbackLoaded: Boolean(fallback?.complete && fallback.naturalWidth > 0),
    };
  }));
}

async function waitForExpression(page, frame, timeout = 8000) {
  await page.waitForFunction((expected) => [...document.querySelectorAll(".seferAbiAvatar")].some((element) => (
    element.getAttribute("data-sprite-animation") === "expression"
      && element.getAttribute("data-sprite-frame") === expected
  )), frame, { timeout, polling: 50 });
}

async function waitForState(page, text, timeout = 12000) {
  await page.waitForFunction((expected) => String(document.querySelector(".copilotDrawerState")?.textContent || "").includes(expected), text, { timeout, polling: 50 });
}

async function openDrawer(page) {
  await page.locator('button[aria-label="Sefer Abi’ye Sor, operasyon yardımcısını aç"]').click();
  await page.locator(".copilotDrawer").waitFor({ state: "visible", timeout: 10000 });
}

async function captureSurface(page, name) {
  await page.screenshot({ path: path.join(screenshotRoot, name), fullPage: false });
}

async function waitForFallbackImages(page) {
  await page.waitForFunction(() => [...document.querySelectorAll(".seferAbiAvatar__fallback")].every((image) => image.complete && image.naturalWidth > 0), null, { timeout: 10000, polling: 50 });
}

async function checkDrawerLayout(page, viewport) {
  return page.evaluate((expected) => {
    const drawer = document.querySelector(".copilotDrawer");
    const composer = document.querySelector(".copilotComposer textarea");
    const close = document.querySelector('.copilotDrawer .copilotToolBtn--close[aria-label="Kapat"]');
    const rect = drawer?.getBoundingClientRect();
    return {
      drawerVisible: Boolean(drawer && rect && rect.width > 0 && rect.height > 0),
      withinViewport: Boolean(rect && rect.left >= -1 && rect.top >= -1 && rect.right <= window.innerWidth + 1 && rect.bottom <= window.innerHeight + 1),
      composerVisible: Boolean(composer && composer.getBoundingClientRect().width > 0 && composer.getBoundingClientRect().height > 0),
      closeVisible: Boolean(close && close.getBoundingClientRect().width > 0),
      noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
      expectedWidth: expected,
    };
  }, viewport.width);
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
  await page.goto(`${webBaseUrl}/#/room`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.locator('button[aria-label="Sefer Abi’ye Sor, operasyon yardımcısını aç"]').waitFor({ state: "visible", timeout: 30000 });
  await waitForFallbackImages(page);
  await page.waitForFunction(() => [...document.querySelectorAll(".seferAbiAvatar")].some((element) => element.getAttribute("data-sprite-animation") === "trial"), null, { timeout: 30000 });
  await page.waitForTimeout(250);
  const launcher = (await avatarSnapshot(page)).find((entry) => entry.surface === "launcher");
  const launcherSizeOk = launcher && Math.abs(launcher.width - viewport.launcher) <= 1 && Math.abs(launcher.height - viewport.launcher) <= 1;
  record(`${viewport.name} launcher idle sprite and size`, Boolean(launcher && launcher.animation === "trial" && launcher.spriteLoaded && launcher.fallbackLoaded && launcherSizeOk), JSON.stringify(launcher));
  await captureSurface(page, `${viewport.name}-01-launcher-idle.png`);

  await openDrawer(page);
  const layout = await checkDrawerLayout(page, viewport);
  record(`${viewport.name} drawer usable and contained`, Object.values(layout).every((value) => value === true || typeof value === "number"), JSON.stringify(layout));
  const drawer = (await avatarSnapshot(page)).find((entry) => entry.surface === "drawer");
  const drawerSizeOk = drawer && Math.abs(drawer.width - viewport.drawer) <= 1 && Math.abs(drawer.height - viewport.drawer) <= 1;
  record(`${viewport.name} drawer idle sprite and size`, Boolean(drawer && drawer.animation === "trial" && drawer.spriteLoaded && drawer.fallbackLoaded && drawerSizeOk), JSON.stringify(drawer));
  await captureSurface(page, `${viewport.name}-02-drawer-idle.png`);

  const textarea = page.locator(".copilotComposer textarea");
  await textarea.focus();
  await waitForState(page, "Seni dinliyorum");
  await waitForExpression(page, "listening");
  const listening = await avatarSnapshot(page);
  record(`${viewport.name} LISTENING expression`, listening.some((entry) => entry.surface === "drawer" && entry.animation === "expression" && entry.frame === "listening" && entry.spriteLoaded), JSON.stringify(listening));
  await captureSurface(page, `${viewport.name}-03-listening.png`);

  await textarea.fill("Bu ekranı kısaca ve yalnızca mevcut verilerle özetle.");
  await page.locator('.copilotComposer button[type="submit"]').click();
  let stateSamples = [];
  const started = Date.now();
  let last = "";
  let responseSettled = false;
  while (Date.now() - started < 20000) {
    const sample = await page.evaluate(() => ({
      state: String(document.querySelector(".copilotDrawerState")?.textContent || "").trim(),
      frames: [...document.querySelectorAll(".copilotDrawer .seferAbiAvatar")].map((e) => ({ animation: e.getAttribute("data-sprite-animation"), frame: e.getAttribute("data-sprite-frame") })),
      busy: Boolean(document.querySelector(".copilotBusy")),
      assistantMessages: document.querySelectorAll(".copilotMsg.assistant").length,
    }));
    const signature = JSON.stringify(sample);
    if (signature !== last) { stateSamples.push({ atMs: Date.now() - started, ...sample }); last = signature; }
    if (sample.assistantMessages > 0 && !sample.busy) {
      if (!responseSettled) {
        responseSettled = true;
        await page.waitForTimeout(1200);
        continue;
      }
      break;
    }
    await page.waitForTimeout(100);
  }
  const sawThinking = stateSamples.some((sample) => /düşünüyor/i.test(sample.state) || sample.frames.some((frame) => frame.frame === "thinking"));
  const sawSpeaking = stateSamples.some((sample) => /yanıtlıyor/i.test(sample.state) || sample.frames.some((frame) => frame.frame === "speaking"));
  const sawSuccess = stateSamples.some((sample) => sample.frames.some((frame) => frame.frame === "success"));
  record(`${viewport.name} THINKING expression`, sawThinking, JSON.stringify(stateSamples.slice(0, 20)));
  record(`${viewport.name} SPEAKING expression`, sawSpeaking, JSON.stringify(stateSamples.slice(0, 30)));
  record(`${viewport.name} SUCCESS response-complete expression`, sawSuccess, JSON.stringify(stateSamples.slice(-12)));
  await captureSurface(page, `${viewport.name}-04-response-complete.png`);

  const finalLayout = await checkDrawerLayout(page, viewport);
  record(`${viewport.name} composer remains usable after response`, finalLayout.composerVisible && finalLayout.closeVisible && finalLayout.withinViewport && finalLayout.noHorizontalOverflow, JSON.stringify(finalLayout));
  const errorCount = errors.filter((error) => error.viewport === viewport.name).length;
  record(`${viewport.name} no console/page errors`, errorCount === 0, JSON.stringify(errors.filter((error) => error.viewport === viewport.name)));
  const videoPathPromise = page.video()?.path() || null;
  await context.close();
  const videoPath = videoPathPromise ? await videoPathPromise : null;
  return { viewport: viewport.name, launcher, drawer, listening, stateSamples, videoPath: videoPath ? path.relative(repoRoot, videoPath).replace(/\\/g, "/") : null };
}

async function runWarningCue(browser, token) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  const page = await context.newPage();
  await page.addInitScript((value) => localStorage.setItem("token", value), token);
  await page.goto(`${webBaseUrl}/#/room/shifts`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.locator('[data-shift-id="13"]').waitFor({ state: "visible", timeout: 30000 });
  await page.locator('[data-shift-id="13"]').click();
  await openDrawer(page);
  const cue = page.locator('[data-sefer-abi-context-cue="missing-assignment"]');
  await cue.waitFor({ state: "visible", timeout: 10000 });
  await waitForExpression(page, "warning");
  const cueText = await cue.innerText();
  const warning = await page.locator('.copilotDrawer .seferAbiAvatar').getAttribute("data-sprite-frame");
  const action = page.locator('[data-sefer-abi-context-cue="missing-assignment"] button');
  const hrefBefore = page.url();
  await page.screenshot({ path: path.join(screenshotRoot, "warning-missing-assignment.png") });
  record("real missing-assignment cue is verified and actionable", /sürücüsü henüz atanmadı/i.test(cueText) && /İstersen/i.test(cueText) && await action.isVisible() && warning === "warning", JSON.stringify({ cueText, warning, hrefBefore }));
  await context.close();
}

async function checkStaticFallback(browser, token) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce", locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  const page = await context.newPage();
  await page.addInitScript((value) => localStorage.setItem("token", value), token);
  await page.goto(`${webBaseUrl}/#/room`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.locator('button[aria-label="Sefer Abi’ye Sor, operasyon yardımcısını aç"]').waitFor({ state: "visible", timeout: 30000 });
  await waitForFallbackImages(page);
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
  await runWarningCue(browser, token);
  for (const viewport of viewports) snapshots.push(await runViewport(browser, token, viewport));
} finally {
  await browser.close();
}

const report = { label, webBaseUrl, apiBaseUrl, generatedAt: new Date().toISOString(), results, snapshots, errors, video: snapshots.find((item) => item.videoPath)?.videoPath || null };
await fs.writeFile(path.join(artifactRoot, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (results.some((result) => !result.ok)) process.exitCode = 1;
