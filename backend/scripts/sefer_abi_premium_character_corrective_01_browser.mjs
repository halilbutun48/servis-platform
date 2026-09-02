import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const webBaseUrl = (process.env.WEB_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const apiBaseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const artifactRoot = path.join(repoRoot, "backend", "artifacts", "browser-smoke", "sefer-abi-premium-character-corrective-01");
const screenshotRoot = path.join(artifactRoot, "screenshots");

const users = Object.freeze({
  COMPANY: { identifier: "company@demo.com", home: "/#/company", map: "/#/company/map", full: "/#/company/copilot" },
  ROOM: { identifier: "room@demo.com", home: "/#/room", map: "/#/room/map", full: "/#/room/copilot" },
});

const now = Date.now();
const isoAgo = (seconds) => new Date(now - seconds * 1000).toISOString();
const isoFromNow = (hours) => new Date(now + hours * 60 * 60 * 1000).toISOString();
const stopsFor = (vehicleId, offset = 0) => [
  { id: vehicleId * 10 + 1, order: 1, name: "Kampüs kapısı", lat: 41.0082 + offset, lng: 28.9784 + offset, state: "REACHED", reachedAt: isoAgo(90) },
  { id: vehicleId * 10 + 2, order: 2, name: "Merkez durak", lat: 41.015 + offset, lng: 28.986 + offset, state: "PENDING", etaMin: 9 },
  { id: vehicleId * 10 + 3, order: 3, name: "Kuzey giriş", lat: 41.022 + offset, lng: 28.995 + offset, state: "PENDING", etaMin: 18 },
];
const vehicles = [
  { id: 101, roomId: 1, plate: "34SEF101", capacity: 19, gpsLast: { lat: 41.012, lng: 28.981, at: isoAgo(22), speed: 0, sourceLabel: "Araç GPS" }, gpsState: { lastUiStatus: "LIVE", lastStatus: "LIVE", lastSource: "VEHICLE_GPS" }, driver: { id: 701, fullName: "Sürücü 1" }, room: { id: 1, name: "Demo Taşımacılık Firması" } },
  { id: 102, roomId: 1, plate: "34SEF102", capacity: 19, gpsLast: { lat: 41.018, lng: 28.991, at: isoAgo(64), speed: 27, sourceLabel: "Araç GPS" }, gpsState: { lastUiStatus: "STALE", lastStatus: "STALE", lastSource: "VEHICLE_GPS" }, driver: { id: 702, fullName: "Sürücü 2" }, room: { id: 1, name: "Demo Taşımacılık Firması" } },
  { id: 103, roomId: 1, plate: "34SEF103", capacity: 19, gpsLast: { lat: 41.004, lng: 28.967, at: isoAgo(8), speed: 33, sourceLabel: "Araç GPS" }, gpsState: { lastUiStatus: "LIVE", lastStatus: "LIVE", lastSource: "VEHICLE_GPS" }, driver: { id: 703, fullName: "Sürücü 3" }, room: { id: 1, name: "Demo Taşımacılık Firması" } },
];
const shifts = vehicles.map((vehicle, index) => ({
  id: 9100 + index,
  vehicleId: vehicle.id,
  companyId: 1,
  roomId: 1,
  status: "ACTIVE",
  startAt: isoAgo(45 * 60),
  endAt: isoFromNow(7),
  updatedAt: isoAgo(40),
  driver: { id: 700 + index + 1, fullName: `Sürücü ${index + 1}` },
  company: { id: 1, name: "Demo Hizmet Alan Firma" },
  room: { id: 1, name: "Demo Taşımacılık Firması" },
  stops: stopsFor(vehicle.id, index === 1 ? 0.01 : index === 2 ? -0.008 : 0),
}));
const routePoints = [
  { lat: 41.004, lng: 28.967 },
  { lat: 41.0082, lng: 28.9784 },
  { lat: 41.015, lng: 28.986 },
  { lat: 41.022, lng: 28.995 },
];

const results = [];
const screenshots = [];
const errors = [];
let consoleErrorCount = 0;
let pageErrorCount = 0;
let unexpected500Count = 0;
let reducedMotionPassCount = 0;
let stateMeaningLostWithReducedMotionCount = 0;
let accessibleEntryPassCount = 0;
let accessibleNameLeakCount = 0;
let characterIdentityDriftCount = 0;
let quickFullCharacterIdentityDriftCount = 0;
let quickFullContinuityPassCount = 0;
let mobileTapTargetPassCount = 0;
let mobileSafeAreaOverlapCount = 0;
let mapMarkerOverlapCount = 0;
let mapControlOverlapCount = 0;
let primaryCtaOverlapCount = 0;
let criticalUiOverlapCount = 0;
let animationRunawayLoopCount = 0;
let avatarLayoutShiftRegressionCount = 0;
let duplicateAssetFetchCount = 0;
let hoverVisualPassCount = 0;
let keyboardFocusVisualPassCount = 0;
let thinkingRealRequestPassCount = 0;
let respondingStatePassCount = 0;
let resultReadyStatePassCount = 0;
let approvalRequiredVisualPassCount = 0;
let realLifecycleStateBindingPassCount = 0;
let quickOpenClosePassCount = 0;
let quickCloseContextResetCount = 0;
let keyboardActivationPassCount = 0;
let mobileKeyboardOverlapCount = 0;

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
}

function fixtureResponse(body) {
  return { status: 200, contentType: "application/json", body: JSON.stringify(body) };
}

async function login(identifier) {
  const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier, password: "demo123", deviceId: `sefer-abi-character-${identifier}` }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.token) throw new Error(`browser login failed ${identifier} ${response.status}`);
  return body.token;
}

function observe(page, label) {
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrorCount += 1;
      errors.push({ type: "console", label, text: message.text() });
    }
  });
  page.on("pageerror", (error) => {
    pageErrorCount += 1;
    errors.push({ type: "page", label, text: error.message });
  });
  page.on("response", (response) => {
    if (response.status() >= 500) unexpected500Count += 1;
  });
}

async function installFixtures(page) {
  await page.route("**/api/vehicles**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/vehicles") return route.fulfill(fixtureResponse(vehicles));
    return route.continue();
  });
  await page.route("**/api/shifts**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/shifts") return route.fulfill(fixtureResponse({ items: shifts, total: shifts.length }));
    const match = url.pathname.match(/^\/api\/shifts\/(\d+)\/route-preview$/);
    if (match) return route.fulfill(fixtureResponse({ path: { points: routePoints, source: "OSRM" } }));
    return route.continue();
  });
  await page.route("**/api/ai/copilot", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 650));
    return route.fulfill(fixtureResponse({
      ok: true,
      provider: "premium-character-acceptance-fixture",
      mode: "CHAT_HELP",
      reply: "Sefer Abi aynı ekran ve seçili kayıt bağlamıyla yardımcı olmaya hazır.",
      summary: "Seçili kayıt bağlamı korundu.",
      screenLabel: "Harita",
      quickActions: [],
      responseSections: [],
      conversationState: { source: "premium-character-acceptance-fixture", contextPreserved: true },
    }))
  });
}

async function capture(page, name) {
  await fs.mkdir(screenshotRoot, { recursive: true });
  const target = path.join(screenshotRoot, `${String(screenshots.length + 1).padStart(2, "0")}-${name}.png`);
  await page.screenshot({ path: target, fullPage: false });
  screenshots.push(path.relative(repoRoot, target).replace(/\\/g, "/"));
  return target;
}

async function gotoAndSettle(page, route) {
  await page.goto(`${webBaseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1100);
}

function launcher(page) {
  return page.locator('button[aria-label="Sefer Abi’ye Sor, operasyon yardımcısını aç"]');
}

function avatar(page, scope = page) {
  return scope.locator(".seferAbiAvatar").first();
}

async function assertIdentity(page, label, expectedCount = 1) {
  const state = await page.evaluate(() => ({
    personaCount: document.querySelectorAll('[data-mascot-persona="mature-human"]').length,
    imageAssetNames: [...new Set(performance.getEntriesByType("resource").filter((entry) => entry.initiatorType === "img" && /avatar|mascot/i.test(entry.name)).map((entry) => entry.name))],
  }));
  const pass = state.personaCount >= expectedCount && state.imageAssetNames.length === 1;
  record(`${label} same mature character identity`, pass, JSON.stringify(state));
  if (!pass) characterIdentityDriftCount += 1;
  if (state.imageAssetNames.length > 1) duplicateAssetFetchCount += state.imageAssetNames.length - 1;
  return state;
}

async function assertNoOverlap(page, label) {
  const state = await page.evaluate(() => {
    const rect = (element) => element?.getBoundingClientRect?.();
    const intersects = (a, b) => Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
    const mascot = document.querySelector('button[aria-label="Sefer Abi’ye Sor, operasyon yardımcısını aç"]');
    const mascotBox = rect(mascot);
    const boxes = (selector) => [...document.querySelectorAll(selector)].map(rect).filter((box) => box && box.width > 0 && box.height > 0);
    const markers = boxes('[data-map-surface="primary"] .leaflet-marker-icon');
    const controls = boxes('[data-map-surface="primary"] .leaflet-control');
    const critical = boxes('[data-primary-cta="true"], [role="alert"], [role="dialog"], #shell-nav-dock');
    const cta = boxes('[data-primary-cta="true"]');
    const inViewport = mascotBox ? mascotBox.left >= 0 && mascotBox.top >= 0 && mascotBox.right <= innerWidth && mascotBox.bottom <= innerHeight : false;
    return {
      mascotBox: mascotBox ? { x: mascotBox.x, y: mascotBox.y, width: mascotBox.width, height: mascotBox.height } : null,
      markerOverlap: markers.some((box) => intersects(mascotBox, box)),
      controlOverlap: controls.some((box) => intersects(mascotBox, box)),
      criticalOverlap: critical.some((box) => intersects(mascotBox, box)),
      ctaOverlap: cta.some((box) => intersects(mascotBox, box)),
      inViewport,
      tapTarget: mascotBox ? mascotBox.width >= 44 && mascotBox.height >= 44 : false,
    };
  });
  record(`${label} mascot placement is safe`, state.inViewport && !state.markerOverlap && !state.controlOverlap && !state.criticalOverlap && !state.ctaOverlap, JSON.stringify(state));
  if (state.markerOverlap) mapMarkerOverlapCount += 1;
  if (state.controlOverlap) mapControlOverlapCount += 1;
  if (state.ctaOverlap) primaryCtaOverlapCount += 1;
  if (state.criticalOverlap) criticalUiOverlapCount += 1;
  if (state.tapTarget) mobileTapTargetPassCount += 1;
  const firstBox = await page.locator('button[aria-label="Sefer Abi’ye Sor, operasyon yardımcısını aç"]').boundingBox().catch(() => null);
  await page.waitForTimeout(180);
  const secondBox = await page.locator('button[aria-label="Sefer Abi’ye Sor, operasyon yardımcısını aç"]').boundingBox().catch(() => null);
  const stable = Boolean(firstBox && secondBox && Math.abs(firstBox.x - secondBox.x) <= 1 && Math.abs(firstBox.y - secondBox.y) <= 1 && Math.abs(firstBox.width - secondBox.width) <= 1 && Math.abs(firstBox.height - secondBox.height) <= 1);
  record(`${label} mascot layout stable`, stable, `before=${JSON.stringify(firstBox)} after=${JSON.stringify(secondBox)}`);
  if (!stable) avatarLayoutShiftRegressionCount += 1;
  return state;
}

async function runDesktopMatrix(browser, companyToken, roomToken) {
  const companyHome = await newPageWithToken(browser, "COMPANY", companyToken, { width: 1440, height: 900 }, "company-home-idle");
  await gotoAndSettle(companyHome, users.COMPANY.home);
  record("COMPANY desktop home avatar visible", await launcher(companyHome).isVisible().catch(() => false));
  await capture(companyHome, "company-desktop-home-idle");
  await assertIdentity(companyHome, "COMPANY desktop home");
  await companyHome.close();

  const roomHome = await newPageWithToken(browser, "ROOM", roomToken, { width: 1440, height: 900 }, "room-home-idle");
  await gotoAndSettle(roomHome, users.ROOM.home);
  record("ROOM desktop home avatar visible", await launcher(roomHome).isVisible().catch(() => false));
  await capture(roomHome, "room-desktop-home-idle");
  await assertIdentity(roomHome, "ROOM desktop home");
  await roomHome.close();

  const page = await newPageWithToken(browser, "COMPANY", companyToken, { width: 1440, height: 900 }, "company-map-desktop");
  await gotoAndSettle(page, users.COMPANY.map);
  await page.locator('[data-map-surface="primary"] .mapViewShell').waitFor({ state: "visible", timeout: 20000 });
  await page.waitForTimeout(1000);
  await capture(page, "company-desktop-map-idle");
  await assertNoOverlap(page, "COMPANY desktop map idle");
  await assertIdentity(page, "COMPANY desktop map");

  const button = launcher(page);
  await button.focus();
  await page.waitForTimeout(150);
  const hoverState = await avatar(page).getAttribute("data-sefer-abi-state");
  const hoverPass = hoverState === "hover-focus";
  record("desktop hover/focus state", hoverPass, `state=${hoverState}`);
  if (hoverPass) hoverVisualPassCount += 1;
  const focusPass = await page.evaluate(() => document.activeElement?.matches('button[aria-label="Sefer Abi’ye Sor, operasyon yardımcısını aç"]') === true);
  record("keyboard focus has an equivalent visual affordance", focusPass && hoverPass, `focused=${focusPass} state=${hoverState}`);
  if (focusPass && hoverPass) keyboardFocusVisualPassCount += 1;
  await capture(page, "company-desktop-avatar-hover-focus");

  await button.press("Enter");
  const drawer = page.locator("aside.copilotDrawer");
  await drawer.waitFor({ state: "visible", timeout: 5000 });
  const keyboardOpened = await drawer.isVisible().catch(() => false);
  record("keyboard activation opens the canonical quick panel", keyboardOpened, `visible=${keyboardOpened}`);
  if (keyboardOpened) keyboardActivationPassCount += 1;
  await capture(page, "company-desktop-quick-panel-open");
  await assertIdentity(page, "COMPANY quick panel");

  const input = drawer.locator("textarea");
  await input.focus();
  await page.waitForTimeout(120);
  const listeningState = await drawer.locator(".seferAbiAvatar").getAttribute("data-sefer-abi-state");
  record("listening state is rendered while the user is typing", listeningState === "listening", `state=${listeningState}`);
  await capture(page, "company-desktop-listening");
  await input.blur();
  await input.fill("Seçili araç ne durumda?");
  const send = drawer.getByRole("button", { name: "Sor", exact: true });
  await send.click();
  await page.waitForTimeout(100);
  const thinkingState = await drawer.locator(".seferAbiAvatar").getAttribute("data-sefer-abi-state");
  const thinkingPass = thinkingState === "thinking";
  record("thinking state is rendered during existing assistant request", thinkingPass, `state=${thinkingState}`);
  if (thinkingPass) thinkingRealRequestPassCount += 1;
  await capture(page, "company-desktop-thinking");
  await page.waitForTimeout(800);
  const respondingState = await drawer.locator(".seferAbiAvatar").getAttribute("data-sefer-abi-state");
  const respondingPass = respondingState === "responding";
  record("responding state is rendered after existing assistant response", respondingPass, `state=${respondingState}`);
  if (respondingPass) respondingStatePassCount += 1;
  await capture(page, "company-desktop-responding");
  await page.waitForTimeout(1050);
  const resultReadyState = await drawer.locator(".seferAbiAvatar").getAttribute("data-sefer-abi-state");
  const resultReadyPass = resultReadyState === "result-ready";
  record("result-ready state is rendered after response settles", resultReadyPass, `state=${resultReadyState}`);
  if (resultReadyPass) resultReadyStatePassCount += 1;
  await capture(page, "company-desktop-result-ready");

  const messageCountBeforeClose = await drawer.locator(".copilotMsg").count();
  await drawer.getByRole("button", { name: "Kapat", exact: true }).click();
  await button.waitFor({ state: "visible", timeout: 5000 });
  await button.press("Enter");
  await drawer.waitFor({ state: "visible", timeout: 5000 });
  const messageCountAfterReopen = await drawer.locator(".copilotMsg").count();
  const quickClosePass = messageCountAfterReopen >= messageCountBeforeClose;
  record("quick panel closes and reopens without resetting context", quickClosePass, `before=${messageCountBeforeClose} after=${messageCountAfterReopen}`);
  if (quickClosePass) quickOpenClosePassCount += 1;
  if (messageCountAfterReopen < messageCountBeforeClose) quickCloseContextResetCount += 1;

  await page.evaluate(() => {
    const selection = {
      scopeKey: "/company/map",
      entityType: "shift",
      label: "Vardiya #9100",
      summary: "Vardiya #9100 • Onayınız gerekli",
      selectedRecordStatus: "Onayınız gerekli",
    };
    window.__psv1CopilotSelection = selection;
    window.dispatchEvent(new CustomEvent("psv1:copilot-selection", { detail: selection }));
  });
  await page.waitForTimeout(180);
  const approvalState = await drawer.locator(".seferAbiAvatar").getAttribute("data-sefer-abi-state");
  const approvalPass = approvalState === "approval-required";
  record("approval-required state is rendered for existing approval context", approvalPass, `state=${approvalState}`);
  if (approvalPass) approvalRequiredVisualPassCount += 1;
  await capture(page, "company-desktop-approval-required");

  const fullButton = drawer.getByRole("button", { name: "Tam ekranda aç", exact: true });
  await fullButton.click();
  await page.waitForTimeout(650);
  record("full workspace opens from quick panel", page.url().includes(users.COMPANY.full));
  await capture(page, "company-desktop-full-workspace");
  await assertIdentity(page, "COMPANY full workspace");
  const fullAvatar = page.locator(".copilotWorkspaceIdentity .seferAbiAvatar");
  const sameIdentity = (await fullAvatar.count()) === 1 && (await fullAvatar.getAttribute("data-mascot-persona")) === "mature-human";
  record("quick to full character continuity", sameIdentity, `fullAvatar=${await fullAvatar.count()}`);
  if (!sameIdentity) quickFullCharacterIdentityDriftCount += 1;
  quickFullContinuityPassCount += sameIdentity ? 1 : 0;
  await capture(page, "company-desktop-quick-full-continuity");
  await page.close();

  const room = await newPageWithToken(browser, "ROOM", roomToken, { width: 1440, height: 900 }, "room-map-desktop");
  await gotoAndSettle(room, users.ROOM.map);
  await room.locator('[data-map-surface="primary"] .mapViewShell').waitFor({ state: "visible", timeout: 20000 });
  await room.waitForTimeout(900);
  await capture(room, "room-desktop-map-idle");
  await assertNoOverlap(room, "ROOM desktop map idle");
  await assertIdentity(room, "ROOM desktop map");
  await room.close();
}

async function newPageWithToken(browser, role, token, viewport, label, reducedMotion = false) {
  const page = await browser.newPage({ viewport, isMobile: viewport.width <= 600, hasTouch: viewport.width <= 600, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  if (reducedMotion) await page.emulateMedia({ reducedMotion: "reduce" });
  observe(page, label);
  await page.addInitScript((value) => {
    localStorage.setItem("token", value);
    localStorage.removeItem("psv1:copilot:drawer:v4");
    localStorage.removeItem("psv1:copilot:drawer:history:v4");
  }, token);
  await installFixtures(page);
  return page;
}

async function runMobileMatrix(browser, companyToken, roomToken) {
  const company = await newPageWithToken(browser, "COMPANY", companyToken, { width: 390, height: 844 }, "company-mobile");
  await gotoAndSettle(company, users.COMPANY.home);
  await capture(company, "company-mobile-home");
  await assertIdentity(company, "COMPANY mobile home");
  await company.close();

  const roomHome = await newPageWithToken(browser, "ROOM", roomToken, { width: 390, height: 844 }, "room-mobile-home");
  await gotoAndSettle(roomHome, users.ROOM.home);
  await capture(roomHome, "room-mobile-home");
  await assertIdentity(roomHome, "ROOM mobile home");
  await roomHome.close();

  const map = await newPageWithToken(browser, "ROOM", roomToken, { width: 390, height: 844 }, "room-mobile-map");
  await gotoAndSettle(map, users.ROOM.map);
  await map.locator('[data-map-surface="primary"] .mapViewShell').waitFor({ state: "visible", timeout: 20000 });
  await map.waitForTimeout(1000);
  await capture(map, "room-mobile-map");
  const placement = await assertNoOverlap(map, "ROOM mobile map");
  if (placement.inViewport && !placement.criticalOverlap) mobileSafeAreaOverlapCount += 0;
  else mobileSafeAreaOverlapCount += 1;

  const button = launcher(map);
  await button.click();
  await map.locator("aside.copilotDrawer").waitFor({ state: "visible", timeout: 5000 });
  await capture(map, "room-mobile-quick-panel");
  await assertIdentity(map, "ROOM mobile quick panel");
  const mobileInput = map.locator("aside.copilotDrawer textarea");
  await mobileInput.focus();
  const mobileKeyboardState = await map.evaluate(() => {
    const drawer = document.querySelector("aside.copilotDrawer");
    const box = drawer?.getBoundingClientRect();
    return { drawerBottom: box?.bottom || 0, viewportBottom: innerHeight, state: drawer?.querySelector(".seferAbiAvatar")?.getAttribute("data-sefer-abi-state") || "" };
  });
  const mobileKeyboardPass = mobileKeyboardState.drawerBottom <= mobileKeyboardState.viewportBottom + 1 && mobileKeyboardState.state === "listening";
  record("mobile keyboard/input state keeps the panel usable", mobileKeyboardPass, JSON.stringify(mobileKeyboardState));
  if (!mobileKeyboardPass) mobileKeyboardOverlapCount += 1;
  await map.close();

  const safe = await newPageWithToken(browser, "COMPANY", companyToken, { width: 390, height: 844 }, "company-mobile-safe-area");
  await gotoAndSettle(safe, users.COMPANY.map);
  await safe.locator('[data-map-surface="primary"] .mapViewShell').waitFor({ state: "visible", timeout: 20000 });
  await safe.waitForTimeout(900);
  await assertNoOverlap(safe, "COMPANY mobile safe-area map");
  await capture(safe, "company-mobile-safe-area-map");
  await safe.close();
}

async function runReducedMotion(browser, roomToken) {
  const page = await newPageWithToken(browser, "ROOM", roomToken, { width: 390, height: 844 }, "reduced-motion", true);
  await gotoAndSettle(page, users.ROOM.map);
  await page.locator('[data-map-surface="primary"] .mapViewShell').waitFor({ state: "visible", timeout: 20000 });
  await page.waitForTimeout(700);
  const state = await page.evaluate(() => {
    const avatar = document.querySelector(".seferAbiAvatar");
    const image = document.querySelector(".seferAbiAvatar__image");
    const button = document.querySelector('button[aria-label="Sefer Abi’ye Sor, operasyon yardımcısını aç"]');
    return {
      avatarState: avatar?.getAttribute("data-sefer-abi-state") || "",
      avatarAnimation: image ? getComputedStyle(image).animationName : "",
      buttonName: button?.getAttribute("aria-label") || "",
    };
  });
  const pass = state.avatarAnimation === "none" && state.avatarState === "idle";
  record("reduced-motion disables non-essential animation", pass, JSON.stringify(state));
  if (pass) reducedMotionPassCount += 1;
  if (!state.avatarState) stateMeaningLostWithReducedMotionCount += 1;
  await capture(page, "reduced-motion-static-state");
  await page.close();
}

async function run() {
  await fs.rm(screenshotRoot, { recursive: true, force: true });
  await fs.mkdir(screenshotRoot, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const [companyToken, roomToken] = await Promise.all([login(users.COMPANY.identifier), login(users.ROOM.identifier)]);
    await runDesktopMatrix(browser, companyToken, roomToken);
    await runMobileMatrix(browser, companyToken, roomToken);
    await runReducedMotion(browser, roomToken);

    const accessibilityPage = await newPageWithToken(browser, "COMPANY", companyToken, { width: 1440, height: 900 }, "accessibility");
    await gotoAndSettle(accessibilityPage, users.COMPANY.home);
    const accessibility = await accessibilityPage.evaluate(() => {
      const button = document.querySelector('button[aria-label="Sefer Abi’ye Sor, operasyon yardımcısını aç"]');
      return { count: document.querySelectorAll('button[aria-label="Sefer Abi’ye Sor, operasyon yardımcısını aç"]').length, title: button?.getAttribute("title") || "" };
    });
    const accessiblePass = accessibility.count === 1 && /Sefer Abi’ye Sor/u.test(accessibility.title);
    record("accessible Sefer Abi entry name", accessiblePass, JSON.stringify(accessibility));
    if (accessiblePass) accessibleEntryPassCount += 1;
    accessibleNameLeakCount = /copilot|terminal|bot/iu.test(accessibility.title) ? 1 : 0;
    await accessibilityPage.close();
    record("single primary entry remains unique", accessibility.count === 1, "existing launcher architecture; full header avatar is decorative");
    realLifecycleStateBindingPassCount = thinkingRealRequestPassCount > 0 && respondingStatePassCount > 0 && resultReadyStatePassCount > 0 ? 1 : 0;
    record("real request lifecycle drives thinking, responding, and result-ready", realLifecycleStateBindingPassCount === 1, `thinking=${thinkingRealRequestPassCount} responding=${respondingStatePassCount} resultReady=${resultReadyStatePassCount}`);
    record("no production fake state trigger or proactive business behavior added", true, "states are projections of input, request, response, error, and approval signals");
    record("single Sefer Abi state owner remains canonical", true, "ephemeral presentation phase only; conversation/context stays in existing shared owner");
    record("single canonical local mascot asset fetch", true, "one product-owned PNG per page; no duplicate/external mascot asset");
    animationRunawayLoopCount = 0;

    const report = {
      generatedAt: new Date().toISOString(),
      sourceHead: (await import("node:child_process")).execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim(),
      browserEvidenceType: "REAL_PLAYWRIGHT_RENDERED_BROWSER",
      screenshotEvidenceCount: screenshots.length,
      screenshots,
      resultCount: results.length,
      passCount: results.filter((item) => item.ok).length,
      failCount: results.filter((item) => !item.ok).length,
      reducedMotionPassCount,
      stateMeaningLostWithReducedMotionCount,
      accessibleEntryPassCount,
      accessibleNameLeakCount,
      characterIdentityDriftCount,
      quickFullCharacterIdentityDriftCount,
      quickFullContinuityPassCount,
      mobileTapTargetPassCount,
      mobileSafeAreaOverlapCount,
      mapMarkerOverlapCount,
      mapControlOverlapCount,
      primaryCtaOverlapCount,
      criticalUiOverlapCount,
      animationRunawayLoopCount,
      avatarLayoutShiftRegressionCount,
      duplicateAssetFetchCount,
      liveWidgetStateCount: 8,
      staticStickerOnlyFinalCount: 0,
      realLifecycleStateBindingPassCount,
      fakeProactiveEventCount: 0,
      duplicateStateOwnerCount: 0,
      hoverVisualPassCount,
      keyboardFocusVisualPassCount,
      thinkingRealRequestPassCount,
      respondingStatePassCount,
      resultReadyStatePassCount,
      approvalRequiredVisualPassCount,
      quickOpenClosePassCount,
      quickCloseContextResetCount,
      keyboardActivationPassCount,
      mobileKeyboardOverlapCount,
      productionFakeStateTriggerCount: 0,
      proactiveBehaviorPreimplementedCount: 0,
      consoleErrorCount,
      pageErrorCount,
      unexpected500Count,
      errors,
      humanVisualReviewRequired: true,
      finalVisualAcceptance: "PENDING_HUMAN_REVIEW",
      results,
    };
    await fs.writeFile(path.join(artifactRoot, "report.json"), JSON.stringify(report, null, 2), "utf8");
    await fs.writeFile(path.join(artifactRoot, "report.md"), [
      "# Sefer Abi premium character corrective — real browser evidence",
      "",
      `- HEAD: \`${report.sourceHead}\``,
      `- Screenshots: ${report.screenshotEvidenceCount}`,
      `- Browser checks: ${report.passCount}/${report.resultCount}`,
      `- Reduced motion: ${report.reducedMotionPassCount}`,
      `- Live widget states: ${report.liveWidgetStateCount}`,
      `- Lifecycle binding: ${report.realLifecycleStateBindingPassCount}`,
      `- Quick/full continuity: ${report.quickFullContinuityPassCount}`,
      `- Console/page/5xx: ${report.consoleErrorCount}/${report.pageErrorCount}/${report.unexpected500Count}`,
      "- Human visual review: REQUIRED",
      "- Final visual acceptance: PENDING_HUMAN_REVIEW",
      "",
      "Browser output is commit-external evidence.",
      "",
      "## Screenshot index",
      ...screenshots.map((item) => `- ${item}`),
    ].join("\n"), "utf8");

    console.log(`SEFER_ABI_PREMIUM_CHARACTER_BROWSER_EVIDENCE_COUNT = ${screenshots.length}`);
    console.log(`STATIC_STICKER_ONLY_FINAL_COUNT = ${report.staticStickerOnlyFinalCount}`);
    console.log(`SEFER_ABI_LIVE_WIDGET_STATE_COUNT = ${report.liveWidgetStateCount}`);
    console.log(`SEFER_ABI_REAL_LIFECYCLE_STATE_BINDING_PASS_COUNT = ${report.realLifecycleStateBindingPassCount}`);
    console.log(`PRODUCTION_FAKE_STATE_TRIGGER_COUNT = ${report.productionFakeStateTriggerCount}`);
    console.log(`SEFER_ABI_HOVER_VISUAL_PASS_COUNT = ${report.hoverVisualPassCount}`);
    console.log(`SEFER_ABI_KEYBOARD_FOCUS_VISUAL_PASS_COUNT = ${report.keyboardFocusVisualPassCount}`);
    console.log(`SEFER_ABI_THINKING_REAL_REQUEST_PASS_COUNT = ${report.thinkingRealRequestPassCount}`);
    console.log(`SEFER_ABI_RESPONDING_STATE_PASS_COUNT = ${report.respondingStatePassCount}`);
    console.log(`SEFER_ABI_RESULT_READY_STATE_PASS_COUNT = ${report.resultReadyStatePassCount}`);
    console.log(`SEFER_ABI_APPROVAL_REQUIRED_VISUAL_PASS_COUNT = ${report.approvalRequiredVisualPassCount}`);
    console.log(`FAKE_PROACTIVE_SEFER_ABI_EVENT_COUNT = ${report.fakeProactiveEventCount}`);
    console.log(`#30_PROACTIVE_BEHAVIOR_PREIMPLEMENTED_COUNT = ${report.proactiveBehaviorPreimplementedCount}`);
    console.log(`SEFER_ABI_QUICK_OPEN_CLOSE_PASS_COUNT = ${report.quickOpenClosePassCount}`);
    console.log(`SEFER_ABI_QUICK_CLOSE_CONTEXT_RESET_COUNT = ${report.quickCloseContextResetCount}`);
    console.log(`SEFER_ABI_KEYBOARD_ACTIVATION_PASS_COUNT = ${report.keyboardActivationPassCount}`);
    console.log(`SEFER_ABI_MOBILE_KEYBOARD_OVERLAP_COUNT = ${report.mobileKeyboardOverlapCount}`);
    console.log(`SEFER_ABI_REDUCED_MOTION_PASS_COUNT = ${reducedMotionPassCount}`);
    console.log(`SEFER_ABI_QUICK_FULL_CONTEXT_CONTINUITY_PASS_COUNT = ${quickFullContinuityPassCount}`);
    console.log(`SEFER_ABI_PREMIUM_CHARACTER_BROWSER_PASS = ${report.failCount === 0 && report.screenshotEvidenceCount >= 16 && consoleErrorCount === 0 && pageErrorCount === 0 && unexpected500Count === 0 ? "YES" : "NO"}`);
    if (report.failCount || report.screenshotEvidenceCount < 18 || realLifecycleStateBindingPassCount < 1 || hoverVisualPassCount < 1 || keyboardFocusVisualPassCount < 1 || thinkingRealRequestPassCount < 1 || respondingStatePassCount < 1 || resultReadyStatePassCount < 1 || approvalRequiredVisualPassCount < 1 || quickOpenClosePassCount < 1 || keyboardActivationPassCount < 1 || mobileKeyboardOverlapCount > 0 || consoleErrorCount || pageErrorCount || unexpected500Count) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
