import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const webBaseUrl = (process.env.WEB_BASE_URL || "http://127.0.0.1:5273").replace(/\/$/, "");
const apiBaseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:3300").replace(/\/$/, "");
const evidenceLabel = String(process.env.EVIDENCE_LABEL || "default").replace(/[^a-z0-9_-]/giu, "-");
const artifactRoot = path.join(repoRoot, "output", "playwright", `sefer-abi-avatar-visual-quality-03-${evidenceLabel}`);
const screenshotRoot = path.join(artifactRoot, "screenshots");
const videoRoot = path.join(artifactRoot, "video");
const viewport = { name: "1440", width: 1440, height: 900 };
const results = [];
const screenshots = [];
const videos = [];
const errors = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
}

async function login() {
  const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: "room@demo.com", password: "demo123", deviceId: `sefer-abi-visual-${Date.now()}` }),
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

async function capture(page, name, target = null) {
  await fs.mkdir(screenshotRoot, { recursive: true });
  const targetPath = path.join(screenshotRoot, `${name}.png`);
  if (target) await page.locator(target).screenshot({ path: targetPath });
  else await page.screenshot({ path: targetPath, fullPage: false });
  screenshots.push(path.relative(repoRoot, targetPath).replace(/\\/g, "/"));
}

async function openDrawer(page, token, reducedMotion) {
  await page.addInitScript((value) => {
    localStorage.setItem("token", value.token);
    localStorage.removeItem("psv1:copilot:drawer:v4");
    localStorage.removeItem("psv1:copilot:drawer:history:v4");
    localStorage.removeItem("psv1:copilot:launcher-placement:v1");
  }, { token });
  await page.emulateMedia({ reducedMotion: reducedMotion ? "reduce" : "no-preference" });
  await page.goto(`${webBaseUrl}/#/room`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.locator(".copilotFab--mascot").waitFor({ state: "visible", timeout: 20_000 });
  await page.locator(".copilotFab--mascot").click();
  await page.locator(".copilotDrawer").waitFor({ state: "visible", timeout: 15_000 });
  await page.waitForTimeout(500);
}

async function centerCloseup(page) {
  await page.locator(".copilotDrawerIdentity > .seferAbiAvatar").evaluate((node) => {
    node.style.position = "fixed";
    node.style.left = "50%";
    node.style.top = "50%";
    node.style.zIndex = "99999";
    node.style.transform = "translate(-50%, -50%) scale(3.6)";
    node.style.transformOrigin = "center";
    node.style.background = "#142d55";
    const drawer = document.querySelector(".copilotDrawer");
    if (drawer) drawer.style.overflow = "visible";
  });
}

async function runMode(browser, token, reducedMotion, mode) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
    recordVideo: { dir: videoRoot, size: { width: viewport.width, height: viewport.height } },
  });
  const page = await context.newPage();
  observe(page, `${mode}-${viewport.name}`);
  try {
    await openDrawer(page, token, reducedMotion);
    await capture(page, `${mode}-normal-${viewport.name}`);
    await centerCloseup(page);
    await capture(page, `${mode}-closeup-${viewport.name}`);
    if (!reducedMotion) {
      await page.waitForFunction(() => Number(document.querySelector(".copilotDrawerIdentity > .seferAbiAvatar canvas")?.dataset.faceLid || 0) > 0.8, { timeout: 6_500 });
      await capture(page, `${mode}-closeup-blink-${viewport.name}`);
    }
    await page.waitForTimeout(reducedMotion ? 2_000 : 5_000);
    await capture(page, `${mode}-closeup-after-${viewport.name}`);
    record(`${mode} close-up evidence`, true, `reducedMotion=${reducedMotion}`);
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
    await runMode(browser, token, true, "static-reduced-motion");
    await runMode(browser, token, false, "idle-canvas");
  } finally {
    await browser.close();
  }
  const report = {
    generatedAt: new Date().toISOString(),
    webBaseUrl,
    apiBaseUrl,
    browserEvidenceType: "REAL_PLAYWRIGHT_CHROMIUM",
    evidenceScope: "diagnostic close-up; CSS enlargement is test-only and does not modify product layout",
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
