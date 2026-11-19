import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const webBaseUrl = (process.env.WEB_BASE_URL || "http://127.0.0.1:5273").replace(/\/$/, "");
const apiBaseUrl = (process.env.API_BASE_URL || webBaseUrl).replace(/\/$/, "");
const label = String(process.env.EVIDENCE_LABEL || "actionable-bubbles-r1").replace(/[^a-z0-9_-]/gi, "-");
const artifactRoot = path.join(repoRoot, "backend", "artifacts", "browser-smoke", "sefer-abi-proactive-bubbles", label);
const screenshotRoot = path.join(artifactRoot, "screenshots");
const videoRoot = path.join(artifactRoot, "video");
const viewports = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "tablet-1024", width: 1024, height: 900 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-320", width: 320, height: 844 },
];
const results = [];
const errors = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
}

async function login(identifier, suffix) {
  const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier, password: "demo123", deviceId: `sefer-abi-bubble-${suffix}-${label}` }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.token) throw new Error(`${identifier} login failed ${response.status}`);
  return body.token;
}

async function assertBubbleForRole(browser, viewport, { identifier, rolePrefix, routePrefix, suffix }) {
  const token = await login(identifier, suffix);
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
    isMobile: viewport.width <= 600,
    hasTouch: viewport.width <= 600,
    ...(viewport.width === 1440 ? { recordVideo: { dir: videoRoot, size: { width: viewport.width, height: viewport.height } } } : {}),
  });
  const page = await context.newPage();
  page.on("console", (message) => { if (message.type() === "error") errors.push({ viewport: viewport.name, role: identifier, type: "console", text: message.text() }); });
  page.on("pageerror", (error) => errors.push({ viewport: viewport.name, role: identifier, type: "page", text: error.message }));
  await page.addInitScript((value) => {
    localStorage.setItem("token", value);
    localStorage.removeItem("psv1:copilot:proactive-actionable-event:v1:" + value.slice(-12));
    localStorage.removeItem("psv1:copilot:drawer:v4");
  }, token);
  await page.goto(`${webBaseUrl}/#/${identifier.startsWith("company") ? "company" : "room"}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  const bubble = page.locator('[data-sefer-abi-proactive-bubble="true"]');
  await bubble.waitFor({ state: "visible", timeout: 30000 });
  const snapshot = await bubble.evaluate((node) => ({
    eventId: node.getAttribute("data-actionable-event-id"),
    message: node.querySelector('[data-actionable-event-message="true"]')?.textContent || "",
    actionLabel: node.querySelector(".copilotProactiveBubbleAction")?.textContent || "",
    rect: (() => { const box = node.getBoundingClientRect(); return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height }; })(),
  }));
  const contained = snapshot.rect.left >= -1 && snapshot.rect.right <= viewport.width + 1 && snapshot.rect.top >= -1 && snapshot.rect.bottom <= viewport.height + 1;
  record(`${identifier} ${viewport.name} real actionable bubble is visible and contained`, Boolean(snapshot.eventId?.startsWith(rolePrefix) && snapshot.message && contained), JSON.stringify(snapshot));
  await page.screenshot({ path: path.join(screenshotRoot, `${identifier.startsWith("company") ? "company" : "room"}-${viewport.name}-bubble.png`), fullPage: false });

  await bubble.locator(".copilotProactiveBubbleClose").click();
  await page.waitForFunction((dismissedId) => ![...document.querySelectorAll('[data-sefer-abi-proactive-bubble="true"]')].some((node) => node.getAttribute("data-actionable-event-id") === dismissedId), snapshot.eventId, { timeout: 5000 });
  record(`${identifier} ${viewport.name} bubble can be dismissed`, true, JSON.stringify({ dismissedEventId: snapshot.eventId }));
  await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("psv1:copilot:proactive-actionable-event:v1:")).forEach((key) => localStorage.removeItem(key)));
  await page.reload({ waitUntil: "domcontentloaded" });
  await bubble.waitFor({ state: "visible", timeout: 30000 });
  record(`${identifier} ${viewport.name} bubble reappears when its dismissal state is cleared`, await bubble.isVisible());

  const eventId = snapshot.eventId;
  const message = snapshot.message;
  await bubble.locator(".copilotProactiveBubbleAction").click();
  await page.waitForTimeout(250);
  const routed = page.url().includes(routePrefix);
  record(`${identifier} ${viewport.name} bubble action follows canonical actionPath`, routed, JSON.stringify({ eventId, message, url: page.url() }));

  const video = page.video();
  await context.close();
  const videoPath = video ? await video.path() : null;
  return { identifier, viewport: viewport.name, eventId, message, routed, videoPath: videoPath ? path.relative(repoRoot, videoPath).replace(/\\/g, "/") : null };
}

await fs.mkdir(screenshotRoot, { recursive: true });
await fs.mkdir(videoRoot, { recursive: true });
const browser = await chromium.launch({ headless: true });
const snapshots = [];
try {
  for (const viewport of viewports) {
    snapshots.push(await assertBubbleForRole(browser, viewport, { identifier: "room@demo.com", rolePrefix: "room:", routePrefix: "#/room/", suffix: "room" }));
    snapshots.push(await assertBubbleForRole(browser, viewport, { identifier: "company@demo.com", rolePrefix: "company:", routePrefix: "#/company/", suffix: "company" }));
  }
} finally {
  await browser.close();
}

const roleIsolation = snapshots.filter((entry) => entry.eventId).every((entry) => (
  entry.identifier.startsWith("room") ? entry.eventId.startsWith("room:") : entry.eventId.startsWith("company:")
));
record("ROOM/COMPANY actionable event tenant-role isolation", roleIsolation, JSON.stringify(snapshots.map(({ identifier, viewport, eventId }) => ({ identifier, viewport, eventId }))));
record("actionable bubble browser surfaces have no console/page errors", errors.length === 0, JSON.stringify(errors));
const report = { label, webBaseUrl, apiBaseUrl, generatedAt: new Date().toISOString(), results, snapshots, errors };
await fs.writeFile(path.join(artifactRoot, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (results.some((result) => !result.ok)) process.exitCode = 1;
