import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const webBaseUrl = (process.env.WEB_BASE_URL || "http://127.0.0.1:5273").replace(/\/$/, "");
const apiBaseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:3300").replace(/\/$/, "");
const label = String(process.env.EVIDENCE_LABEL || "current").replace(/[^a-z0-9_-]/gi, "-");
const artifactRoot = path.join(repoRoot, "backend", "artifacts", "browser-smoke", "sefer-abi-frameless-07", label);
const screenshotRoot = path.join(artifactRoot, "screenshots");
const videoRoot = path.join(artifactRoot, "video");
const viewports = [
  { name: "desktop-1440", width: 1440, height: 900, expectedLauncher: 80, expectedDrawer: 112 },
  { name: "tablet-1024", width: 1024, height: 900, expectedLauncher: 72, expectedDrawer: 104 },
  { name: "mobile-390", width: 390, height: 844, expectedLauncher: 64, expectedDrawer: 100 },
  { name: "mobile-320", width: 320, height: 844, expectedLauncher: 64, expectedDrawer: 100 },
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
    body: JSON.stringify({ identifier: "room@demo.com", password: "demo123", deviceId: `sefer-abi-frameless-${label}` }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.token) throw new Error(`ROOM login failed ${response.status}`);
  return body.token;
}

async function inspectSurface(page, expected) {
  return page.evaluate(({ expectedLauncher, expectedDrawer }) => {
    const launcher = document.querySelector('button[aria-label="Sefer Abi’ye Sor, operasyon yardımcısını aç"]');
    const drawer = document.querySelector(".copilotDrawer");
    const launcherAvatar = launcher?.querySelector(".seferAbiAvatar");
    const drawerAvatar = drawer?.querySelector(".seferAbiAvatar");
    const computed = (element) => element ? getComputedStyle(element) : null;
    const pseudo = (element, name) => element ? getComputedStyle(element, name) : null;
    const rect = (element) => {
      const box = element?.getBoundingClientRect?.();
      return box ? { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom } : null;
    };
    const launcherStyle = computed(launcher);
    const avatarStyle = computed(launcherAvatar);
    const drawerAvatarStyle = computed(drawerAvatar);
    const before = pseudo(launcherAvatar, "::before");
    const after = pseudo(launcherAvatar, "::after");
    const image = launcherAvatar?.querySelector(".seferAbiAvatar__fallback");
    const drawerImage = drawerAvatar?.querySelector(".seferAbiAvatar__fallback");
    const inViewport = (box) => Boolean(box && box.x >= 0 && box.y >= 0 && box.right <= innerWidth && box.bottom <= innerHeight);
    const intersects = (a, b) => Boolean(a && b && a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y);
    const launcherBox = rect(launcher);
    const visibleInteractiveBoxes = [...document.querySelectorAll("button, a, input, select, textarea, summary")]
      .filter((element) => element !== launcher && !element.closest(".copilotFab") && !element.closest(".copilotDrawer"))
      .map(rect)
      .filter((box) => box && box.width > 0 && box.height > 0);
    return {
      launcher: {
        className: launcher?.className || "",
        rect: rect(launcher),
        backgroundColor: launcherStyle?.backgroundColor || "",
        borderWidth: launcherStyle?.borderWidth || "",
        borderRadius: launcherStyle?.borderRadius || "",
        boxShadow: launcherStyle?.boxShadow || "",
        inViewport: inViewport(rect(launcher)),
        expectedSize: Boolean(launcher && Math.abs(launcher.getBoundingClientRect().width - expectedLauncher) <= 1 && Math.abs(launcher.getBoundingClientRect().height - expectedLauncher) <= 1),
        interactiveOverlap: visibleInteractiveBoxes.some((box) => intersects(launcherBox, box)),
      },
      launcherAvatar: {
        className: launcherAvatar?.className || "",
        rect: rect(launcherAvatar),
        backgroundColor: avatarStyle?.backgroundColor || "",
        borderWidth: avatarStyle?.borderWidth || "",
        borderRadius: avatarStyle?.borderRadius || "",
        boxShadow: avatarStyle?.boxShadow || "",
        filter: avatarStyle?.filter || "",
        pseudoBeforeDisplay: before?.display || "",
        pseudoAfterDisplay: after?.display || "",
        stateMarkDisplay: computed(launcherAvatar?.querySelector(".seferAbiAvatar__stateMark"))?.display || "",
        staticFallback: launcherAvatar?.getAttribute("data-facial-animation") === "static" && Boolean(image?.complete && image.naturalWidth > 0),
      },
      drawer: {
        visible: Boolean(drawer && getComputedStyle(drawer).display !== "none"),
        rect: rect(drawer),
        inViewport: inViewport(rect(drawer)),
      },
      drawerAvatar: {
        className: drawerAvatar?.className || "",
        rect: rect(drawerAvatar),
        expectedSize: Boolean(drawerAvatar && Math.abs(drawerAvatar.getBoundingClientRect().width - expectedDrawer) <= 1 && Math.abs(drawerAvatar.getBoundingClientRect().height - expectedDrawer) <= 1),
        backgroundColor: drawerAvatarStyle?.backgroundColor || "",
        borderWidth: drawerAvatarStyle?.borderWidth || "",
        borderRadius: drawerAvatarStyle?.borderRadius || "",
        boxShadow: drawerAvatarStyle?.boxShadow || "",
        staticFallback: drawerAvatar?.getAttribute("data-facial-animation") === "static" && Boolean(drawerImage?.complete && drawerImage.naturalWidth > 0),
      },
    };
  }, { expectedLauncher: expected.expectedLauncher, expectedDrawer: expected.expectedDrawer });
}

function framelessPass(snapshot) {
  const launcher = snapshot.launcher;
  const avatar = snapshot.launcherAvatar;
  const drawer = snapshot.drawer;
  const drawerAvatar = snapshot.drawerAvatar;
  const transparent = (value) => value === "rgba(0, 0, 0, 0)" || value === "transparent";
  const noBorder = (value) => value === "0px" || value === "none";
  return Boolean(
    launcher.className.includes("copilotFab--frameless")
      && launcher.expectedSize
      && launcher.inViewport
      && transparent(launcher.backgroundColor)
      && noBorder(launcher.borderWidth)
      && launcher.boxShadow === "none"
      && avatar.className.includes("seferAbiAvatar--frameless")
      && transparent(avatar.backgroundColor)
      && noBorder(avatar.borderWidth)
      && avatar.pseudoBeforeDisplay === "none"
      && avatar.pseudoAfterDisplay === "none"
      && avatar.stateMarkDisplay === "none"
      && launcher.interactiveOverlap === false
      && avatar.staticFallback
      && drawer.visible
      && drawerAvatar.className.includes("seferAbiAvatar--frameless")
      && drawerAvatar.expectedSize
      && drawerAvatar.staticFallback
      && drawerAvatar.inViewport !== false
  );
}

async function runViewport(browser, token, viewport) {
  const recordVideo = process.env.RECORD_VIDEO === "1" && viewport.width === 1440;
  const contextOptions = {
    viewport: { width: viewport.width, height: viewport.height },
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
    isMobile: viewport.width <= 600,
    hasTouch: viewport.width <= 600,
  };
  if (recordVideo) contextOptions.recordVideo = { dir: videoRoot, size: { width: viewport.width, height: viewport.height } };
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
  await page.waitForTimeout(900);
  const launcherPath = recordVideo ? null : path.join(screenshotRoot, `${viewport.name}-launcher.png`);
  if (launcherPath) await page.screenshot({ path: launcherPath, clip: { x: 0, y: 0, width: viewport.width, height: viewport.height } });
  const launcherSnapshot = await inspectSurface(page, viewport);
  await page.locator('button[aria-label="Sefer Abi’ye Sor, operasyon yardımcısını aç"]').click();
  await page.locator(".copilotDrawer").waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(450);
  const drawerPath = recordVideo ? null : path.join(screenshotRoot, `${viewport.name}-drawer.png`);
  if (drawerPath) await page.screenshot({ path: drawerPath, clip: { x: 0, y: 0, width: viewport.width, height: viewport.height } });
  const drawerSnapshot = await inspectSurface(page, viewport);
  const snapshot = {
    launcher: launcherSnapshot.launcher,
    launcherAvatar: launcherSnapshot.launcherAvatar,
    drawer: drawerSnapshot.drawer,
    drawerAvatar: drawerSnapshot.drawerAvatar,
  };
  record(`${viewport.name} frameless launcher and drawer`, framelessPass(snapshot), JSON.stringify(snapshot));
  record(`${viewport.name} no unexpected 5xx/page errors`, errors.every((error) => error.viewport !== viewport.name), JSON.stringify(errors.filter((error) => error.viewport === viewport.name)));
  const videoPathPromise = page.video()?.path() || null;
  await context.close();
  const videoPath = videoPathPromise ? await videoPathPromise : null;
  return {
    viewport: viewport.name,
    snapshot,
    launcherPath: launcherPath ? path.relative(repoRoot, launcherPath).replace(/\\/g, "/") : null,
    drawerPath: drawerPath ? path.relative(repoRoot, drawerPath).replace(/\\/g, "/") : null,
    videoPath: videoPath ? path.relative(repoRoot, videoPath).replace(/\\/g, "/") : null,
  };
}

await fs.mkdir(screenshotRoot, { recursive: true });
await fs.mkdir(videoRoot, { recursive: true });
const token = await login();
const browser = await chromium.launch({ headless: true });
const snapshots = [];
try {
  for (const viewport of viewports) snapshots.push(await runViewport(browser, token, viewport));
} finally {
  await browser.close();
}

const report = {
  label,
  webBaseUrl,
  apiBaseUrl,
  generatedAt: new Date().toISOString(),
  results,
  snapshots,
  errors,
  video: snapshots.find((snapshot) => snapshot.videoPath)?.videoPath || null,
};
await fs.writeFile(path.join(artifactRoot, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (results.some((result) => !result.ok)) process.exitCode = 1;
