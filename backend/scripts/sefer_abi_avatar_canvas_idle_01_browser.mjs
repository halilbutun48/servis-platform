import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const webBaseUrl = (process.env.WEB_BASE_URL || "http://127.0.0.1:5273").replace(/\/$/, "");
const apiBaseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:3300").replace(/\/$/, "");
const expectCanvas = process.env.EXPECT_CANVAS !== "false";
const evidenceLabel = String(process.env.EVIDENCE_LABEL || "default").replace(/[^a-z0-9_-]/giu, "-");
const artifactRoot = path.join(repoRoot, "output", "playwright", `sefer-abi-avatar-canvas-idle-01-${evidenceLabel}`);
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
    body: JSON.stringify({ identifier: "room@demo.com", password: "demo123", deviceId: `sefer-abi-avatar-${Date.now()}` }),
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

async function createPage(browser, token, viewport, reducedMotion = false) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.width <= 600,
    hasTouch: viewport.width <= 600,
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
    recordVideo: { dir: videoRoot, size: { width: viewport.width, height: viewport.height } },
  });
  if (reducedMotion) await context.grantPermissions([]);
  const page = await context.newPage();
  if (reducedMotion) await page.emulateMedia({ reducedMotion: "reduce" });
  observe(page, `${viewport.name}${reducedMotion ? "-reduced" : ""}`);
  await page.addInitScript((value) => {
    localStorage.setItem("token", value);
    localStorage.removeItem("psv1:copilot:drawer:v4");
    localStorage.removeItem("psv1:copilot:drawer:history:v4");
  }, token);
  return { context, page };
}

async function settle(page) {
  await page.goto(`${webBaseUrl}/#/room`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.locator(".seferAbiAvatar").first().waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForTimeout(1_100);
}

async function capture(page, name) {
  await fs.mkdir(screenshotRoot, { recursive: true });
  const target = path.join(screenshotRoot, `${name}.png`);
  await page.screenshot({ path: target, fullPage: false });
  screenshots.push(path.relative(repoRoot, target).replace(/\\/g, "/"));
  return target;
}

async function captureAvatarDebug(page, name) {
  if (process.env.DEBUG_AVATAR !== "true") return;
  await page.evaluate(() => {
    const avatar = document.querySelector(".seferAbiAvatar");
    if (!avatar) return;
    avatar.style.transform = "scale(8)";
    avatar.style.transformOrigin = "bottom right";
    avatar.style.zIndex = "20";
  });
  await page.waitForTimeout(120);
  await capture(page, `avatar-${name}`);
  await page.evaluate(() => {
    const avatar = document.querySelector(".seferAbiAvatar");
    if (!avatar) return;
    avatar.style.transform = "";
    avatar.style.transformOrigin = "";
    avatar.style.zIndex = "";
  });
}

async function avatarSnapshot(page) {
  return page.evaluate(() => {
    const avatar = document.querySelector(".seferAbiAvatar");
    const canvas = avatar?.querySelector("canvas");
    const image = avatar?.querySelector("img");
    const scripts = [...performance.getEntriesByType("resource")]
      .map((entry) => entry.name)
      .filter((name) => /\.js(?:\?|$)/u.test(name));
    return {
      state: avatar?.getAttribute("data-sefer-abi-state") || "",
      motionState: avatar?.getAttribute("data-character-motion") || "",
      canvasReady: avatar?.getAttribute("data-canvas-ready") || "",
      canvasWidth: canvas?.width || 0,
      canvasHeight: canvas?.height || 0,
      faceLid: canvas?.dataset.faceLid || "",
      fallbackSrc: image?.getAttribute("src") || "",
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      jsResources: [...new Set(scripts.map((name) => name.split("/").pop()))],
    };
  });
}

async function canvasEyeSample(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector(".seferAbiAvatar canvas");
    if (!canvas) return null;
    const context = canvas.getContext("2d");
    if (!context) return null;
    const width = canvas.width;
    const height = canvas.height;
    const x = Math.floor(width * 0.30);
    const y = Math.floor(height * 0.31);
    const sampleWidth = Math.max(1, Math.floor(width * 0.40));
    const sampleHeight = Math.max(1, Math.floor(height * 0.18));
    const data = context.getImageData(x, y, sampleWidth, sampleHeight).data;
    let hash = 0;
    for (let index = 0; index < data.length; index += 4) hash = (hash + data[index] * 3 + data[index + 1] * 5 + data[index + 2] * 7 + data[index + 3]) % 1_000_000_007;
    return { hash, width, height, lid: Number(canvas.dataset.faceLid || 0) };
  });
}

async function sampleMotion(page) {
  const samples = [];
  for (let index = 0; index < 110; index += 1) {
    samples.push(await canvasEyeSample(page));
    await page.waitForTimeout(50);
  }
  const hashes = samples.filter(Boolean).map((sample) => sample.hash);
  const lids = samples.filter(Boolean).map((sample) => sample.lid);
  return {
    sampleCount: hashes.length,
    uniqueEyeHashes: new Set(hashes).size,
    changedFrames: hashes.filter((hash, index) => index > 0 && hash !== hashes[index - 1]).length,
    maxLid: Math.max(0, ...lids),
  };
}

async function runViewport(browser, token, viewport) {
  const { context, page } = await createPage(browser, token, viewport);
  try {
    await settle(page);
    const snapshot = await avatarSnapshot(page);
    const canvasStatePass = expectCanvas ? snapshot.canvasReady === "true" : snapshot.canvasReady === "" || snapshot.canvasReady === "false";
    const identityPass = snapshot.fallbackSrc.includes("sefer-abi-premium-avatar") && canvasStatePass;
    record(`${viewport.name}px approved asset and Canvas readiness`, identityPass, JSON.stringify(snapshot));
    const statePass = snapshot.state === "idle" && snapshot.motionState === "idle";
    record(`${viewport.name}px real IDLE state binding`, statePass, JSON.stringify({ state: snapshot.state, motionState: snapshot.motionState }));
    record(`${viewport.name}px no horizontal overflow`, snapshot.horizontalOverflow === false, JSON.stringify({ horizontalOverflow: snapshot.horizontalOverflow }));

    const motion = expectCanvas ? await sampleMotion(page) : { sampleCount: 0, uniqueEyeHashes: 0, changedFrames: 0 };
    const motionPass = expectCanvas && motion.sampleCount >= 40 && motion.uniqueEyeHashes > 1 && motion.changedFrames > 0 && motion.maxLid > 0.5;
    record(`${viewport.name}px Canvas face-region motion is observable`, expectCanvas ? motionPass : true, JSON.stringify(motion));
    await capture(page, `${expectCanvas ? "after" : "before"}-${viewport.name}`);
    if (viewport.name === "1440") {
      if (expectCanvas) {
        await page.waitForFunction(() => Number(document.querySelector(".seferAbiAvatar canvas")?.dataset.faceLid || 0) > 0.8, { timeout: 6_500 });
        await captureAvatarDebug(page, "blink-1440");
      }
      await captureAvatarDebug(page, `${expectCanvas ? "after" : "before"}-${viewport.name}`);
    }
  } finally {
    const video = page.video();
    await context.close();
    if (video) videos.push(path.relative(repoRoot, await video.path()).replace(/\\/g, "/"));
  }
}

async function runReducedMotion(browser, token) {
  const viewport = { name: "390", width: 390, height: 844 };
  const { context, page } = await createPage(browser, token, viewport, true);
  try {
    await settle(page);
    const before = await canvasEyeSample(page);
    await page.waitForTimeout(850);
    const after = await canvasEyeSample(page);
    const snapshot = await avatarSnapshot(page);
    const stable = before?.hash === after?.hash;
    record("reduced-motion freezes Canvas frame", expectCanvas ? stable : true, JSON.stringify({ before, after }));
    record("reduced-motion preserves IDLE state meaning", snapshot.state === "idle" && snapshot.motionState === "idle", JSON.stringify(snapshot));
    await capture(page, `${expectCanvas ? "after" : "before"}-390-reduced-motion`);
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
    await runReducedMotion(browser, token);
  } finally {
    await browser.close();
  }

  const report = {
    generatedAt: new Date().toISOString(),
    webBaseUrl,
    apiBaseUrl,
    expectCanvas,
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
