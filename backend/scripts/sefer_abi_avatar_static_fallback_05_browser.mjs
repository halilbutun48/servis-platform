import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const webBaseUrl = (process.env.WEB_BASE_URL || "http://127.0.0.1:5273").replace(/\/$/, "");
const apiBaseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:3300").replace(/\/$/, "");
const evidenceLabel = String(process.env.EVIDENCE_LABEL || "default").replace(/[^a-z0-9_-]/giu, "-");
const artifactRoot = path.join(repoRoot, "output", "playwright", `sefer-abi-avatar-static-fallback-05-${evidenceLabel}`);
const screenshotRoot = path.join(artifactRoot, "screenshots");
const videoRoot = path.join(artifactRoot, "video");
const viewports = [
  { name: "1440", width: 1440, height: 900 },
  { name: "1024", width: 1024, height: 900 },
  { name: "390", width: 390, height: 844 },
  { name: "320", width: 320, height: 700 },
];
const results = [];
const screenshots = [];
const videos = [];
const errors = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
}

function hash(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
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

async function login() {
  const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: "room@demo.com", password: "demo123", deviceId: `sefer-abi-static-${Date.now()}` }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.token) throw new Error(`ROOM login failed ${response.status}`);
  return body.token;
}

async function openDrawer(page, token) {
  await page.addInitScript((value) => {
    localStorage.setItem("token", value.token);
    localStorage.removeItem("psv1:copilot:drawer:v4");
    localStorage.removeItem("psv1:copilot:drawer:history:v4");
    localStorage.removeItem("psv1:copilot:launcher-placement:v1");
  }, { token });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${webBaseUrl}/#/room`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.locator(".copilotFab--mascot").waitFor({ state: "visible", timeout: 20_000 });
  await page.locator(".copilotFab--mascot").click();
  await page.locator(".copilotDrawer").waitFor({ state: "visible", timeout: 15_000 });
  await page.locator(".copilotDrawerIdentity > .seferAbiAvatar").waitFor({ state: "visible", timeout: 10_000 });
  await page.waitForTimeout(500);
}

async function capture(page, name, locator = null) {
  await fs.mkdir(screenshotRoot, { recursive: true });
  const targetPath = path.join(screenshotRoot, `${name}.png`);
  if (locator) await page.locator(locator).screenshot({ path: targetPath });
  else await page.screenshot({ path: targetPath, fullPage: false });
  screenshots.push(path.relative(repoRoot, targetPath).replace(/\\/g, "/"));
}

async function inspectPortrait(page) {
  return page.locator(".copilotDrawerIdentity > .seferAbiAvatar").evaluate((avatar) => {
    const image = avatar.querySelector(".seferAbiAvatar__fallback");
    const canvas = avatar.querySelector(".seferAbiAvatar__canvas");
    const imageStyle = image ? getComputedStyle(image) : null;
    const canvasStyle = canvas ? getComputedStyle(canvas) : null;
    const rect = avatar.getBoundingClientRect();
    return {
      facialAnimation: avatar.dataset.facialAnimation,
      state: avatar.dataset.seferAbiState,
      canvasReady: avatar.dataset.canvasReady,
      fallbackOpacity: imageStyle?.opacity,
      fallbackAnimation: imageStyle?.animationName,
      imageComplete: Boolean(image?.complete),
      imageWidth: image?.naturalWidth || 0,
      imageHeight: image?.naturalHeight || 0,
      canvasOpacity: canvasStyle?.opacity,
      canvasVisibility: canvasStyle?.visibility,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    };
  });
}

async function runViewport(browser, token, viewport, recordVideo) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
    ...(recordVideo ? { recordVideo: { dir: videoRoot, size: { width: viewport.width, height: viewport.height } } } : {}),
  });
  const page = await context.newPage();
  const label = `${evidenceLabel}-${viewport.name}`;
  observe(page, label);
  try {
    await openDrawer(page, token);
    // Let the desktop drawer's async safe-placement pass settle before taking
    // the first portrait sample; this avoids hashing a transition frame.
    await page.waitForTimeout(1_200);
    const first = await inspectPortrait(page);
    const firstPortrait = await page.locator(".copilotDrawerIdentity > .seferAbiAvatar .seferAbiAvatar__fallback").screenshot();
    await capture(page, `static-${viewport.name}`);
    await capture(page, `static-avatar-${viewport.name}`, ".copilotDrawerIdentity > .seferAbiAvatar");
    await page.waitForTimeout(2_000);
    const second = await inspectPortrait(page);
    const secondPortrait = await page.locator(".copilotDrawerIdentity > .seferAbiAvatar .seferAbiAvatar__fallback").screenshot();
    const stablePortrait = hash(firstPortrait) === hash(secondPortrait);
    const inViewport = first.rect.x >= 0
      && first.rect.y >= 0
      && first.rect.x + first.rect.width <= viewport.width
      && first.rect.y + first.rect.height <= viewport.height;
    const staticContract = first.facialAnimation === "static"
      && first.canvasReady === "false"
      && first.fallbackOpacity !== "0"
      && first.fallbackAnimation === "none"
      && first.canvasOpacity === "0"
      && first.canvasVisibility === "hidden"
      && first.imageComplete
      && first.imageWidth === 512
      && first.imageHeight === 512;
    record(`static portrait contract ${viewport.name}`, staticContract, JSON.stringify(first));
    record(`portrait stable after 2s ${viewport.name}`, stablePortrait, `${hash(firstPortrait)} -> ${hash(secondPortrait)}`);
    record(`avatar visible in viewport ${viewport.name}`, inViewport, JSON.stringify(first.rect));
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
    for (const viewport of viewports) {
      await runViewport(browser, token, viewport, viewport.name === "1440");
    }
  } finally {
    await browser.close();
  }
  const report = {
    generatedAt: new Date().toISOString(),
    webBaseUrl,
    apiBaseUrl,
    browserEvidenceType: "REAL_PLAYWRIGHT_CHROMIUM",
    evidenceScope: "product static fallback after rejecting artificial facial overlays; reduced-motion path; no DOM state injection",
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
