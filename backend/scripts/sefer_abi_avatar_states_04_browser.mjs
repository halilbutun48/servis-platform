import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const webBaseUrl = (process.env.WEB_BASE_URL || "http://127.0.0.1:5273").replace(/\/$/, "");
const apiBaseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:3300").replace(/\/$/, "");
const evidenceLabel = String(process.env.EVIDENCE_LABEL || "default").replace(/[^a-z0-9_-]/giu, "-");
const artifactRoot = path.join(repoRoot, "output", "playwright", `sefer-abi-avatar-states-04-${evidenceLabel}`);
const screenshotRoot = path.join(artifactRoot, "screenshots");
const videoRoot = path.join(artifactRoot, "video");
const results = [];
const screenshots = [];
const videos = [];
const errors = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "NOT_PROVEN"} ${name}${detail ? ` :: ${detail}` : ""}`);
}

async function login() {
  const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: "room@demo.com", password: "demo123", deviceId: `sefer-abi-states-${Date.now()}` }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.token) throw new Error(`ROOM login failed ${response.status}`);
  return body.token;
}

function observe(page, { ignoreExpectedAbort = false } = {}) {
  page.on("console", (message) => {
    if (message.type() === "error" && !(ignoreExpectedAbort && message.text().includes("ERR_FAILED"))) errors.push({ type: "console", text: message.text() });
  });
  page.on("pageerror", (error) => errors.push({ type: "page", text: error.message }));
  page.on("response", (response) => {
    if (response.status() >= 500) errors.push({ type: "http", status: response.status(), url: response.url() });
  });
}

async function capture(page, name) {
  await fs.mkdir(screenshotRoot, { recursive: true });
  const target = path.join(screenshotRoot, `${name}.png`);
  await page.screenshot({ path: target, fullPage: false });
  screenshots.push(path.relative(repoRoot, target).replace(/\\/g, "/"));
}

async function currentState(page) {
  return page.locator(".copilotDrawer .seferAbiAvatar").getAttribute("data-sefer-abi-state");
}

async function waitForState(page, expected, timeout = 3_000) {
  try {
    await page.waitForFunction((state) => document.querySelector(".copilotDrawer .seferAbiAvatar")?.getAttribute("data-sefer-abi-state") === state, expected, { timeout });
    return true;
  } catch {
    return false;
  }
}

async function run() {
  await fs.rm(artifactRoot, { recursive: true, force: true });
  await fs.mkdir(videoRoot, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const token = await login();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
    recordVideo: { dir: videoRoot, size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();
  observe(page);
  await page.addInitScript((value) => {
    localStorage.setItem("token", value);
    localStorage.removeItem("psv1:copilot:drawer:v4");
    localStorage.removeItem("psv1:copilot:drawer:history:v4");
    localStorage.removeItem("psv1:copilot:launcher-placement:v1");
  }, token);
  await page.goto(`${webBaseUrl}/#/room`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.locator(".copilotFab--mascot").waitFor({ state: "visible", timeout: 20_000 });
  await page.locator(".copilotFab--mascot").click();
  await page.locator(".copilotDrawer").waitFor({ state: "visible", timeout: 15_000 });
  await page.waitForTimeout(400);

  record("IDLE is bound on drawer open", (await currentState(page)) === "idle", await currentState(page));
  await capture(page, "01-idle");

  const textarea = page.locator(".copilotDrawer textarea");
  await textarea.focus();
  record("LISTENING is bound to real composer focus", await waitForState(page, "listening"), await currentState(page));
  await capture(page, "02-listening");

  await textarea.fill("Bu ekranı kısaca açıkla");
  await page.getByRole("button", { name: "Sor", exact: true }).click();
  const observed = new Set();
  const startedAt = Date.now();
  while (Date.now() - startedAt < 8_000) {
    observed.add(await currentState(page));
    await page.waitForTimeout(50);
  }
  record("THINKING or RESPONDING is bound to real request lifecycle", observed.has("thinking") || observed.has("responding"), JSON.stringify([...observed]));
  record("RESULT-READY is bound to real response completion", observed.has("result-ready"), JSON.stringify([...observed]));
  await capture(page, "03-response-complete");

  await context.close();
  const video = page.video();
  if (video) videos.push(path.relative(repoRoot, await video.path()).replace(/\\/g, "/"));

  const warningContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  const warningPage = await warningContext.newPage();
  observe(warningPage, { ignoreExpectedAbort: true });
  await warningPage.addInitScript((value) => {
    localStorage.setItem("token", value);
    localStorage.removeItem("psv1:copilot:drawer:v4");
    localStorage.removeItem("psv1:copilot:drawer:history:v4");
  }, token);
  await warningPage.route("**/api/ai/copilot", (route) => route.abort());
  await warningPage.goto(`${webBaseUrl}/#/room`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await warningPage.locator(".copilotFab--mascot").click();
  await warningPage.locator(".copilotDrawer").waitFor({ state: "visible", timeout: 15_000 });
  const warningTextarea = warningPage.locator(".copilotDrawer textarea");
  await warningTextarea.fill("Bağlantı hatasını göster");
  await warningPage.getByRole("button", { name: "Sor", exact: true }).click();
  record("WARNING is bound to a real request error", await waitForState(warningPage, "attention", 5_000), await currentState(warningPage));
  await warningContext.close();
  await browser.close();

  const report = {
    generatedAt: new Date().toISOString(),
    webBaseUrl,
    apiBaseUrl,
    browserEvidenceType: "REAL_PLAYWRIGHT_CHROMIUM",
    stateEvidence: "real focus, submit, response and request-error events; no DOM state injection",
    screenshots,
    videos,
    results,
    passCount: results.filter((item) => item.ok).length,
    notProvenCount: results.filter((item) => !item.ok).length,
    errors,
    errorCount: errors.length,
  };
  await fs.writeFile(path.join(artifactRoot, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
  if (report.errorCount > 0) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
