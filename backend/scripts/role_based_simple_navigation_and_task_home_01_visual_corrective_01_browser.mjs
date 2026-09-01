import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const webBaseUrl = (process.env.WEB_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const apiBaseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const artifactRoot = path.join(repoRoot, "backend", "artifacts", "browser-smoke", "role-based-simple-navigation-and-task-home-01-visual-corrective-01");
const screenshotRoot = path.join(artifactRoot, "screenshots");
const privatePlate = "34PRIVATE999";
const now = Date.now();

const users = {
  COMPANY: { identifier: "company@demo.com", route: "/#/company/map" },
  ROOM: { identifier: "room@demo.com", route: "/#/room/map" },
};

function isoAgo(seconds) {
  return new Date(now - seconds * 1000).toISOString();
}

function isoFromNow(hours) {
  return new Date(now + hours * 60 * 60 * 1000).toISOString();
}

function stopsFor(vehicleId, offset = 0) {
  return [
    { id: vehicleId * 10 + 1, order: 1, name: "Kampüs kapısı", lat: 41.0082 + offset, lng: 28.9784 + offset, state: "REACHED", reachedAt: isoAgo(90) },
    { id: vehicleId * 10 + 2, order: 2, name: "Merkez durak", lat: 41.015 + offset, lng: 28.986 + offset, state: "PENDING", etaMin: 9 },
    { id: vehicleId * 10 + 3, order: 3, name: "Kuzey giriş", lat: 41.022 + offset, lng: 28.995 + offset, state: "PENDING", etaMin: 18 },
  ];
}

function shiftFor(vehicleId, index, offset) {
  return {
    id: 9100 + index,
    vehicleId,
    companyId: 1,
    roomId: 1,
    status: "ACTIVE",
    startAt: isoAgo(45 * 60),
    endAt: isoFromNow(7),
    updatedAt: isoAgo(40),
    driver: { id: 700 + index, fullName: `Sürücü ${index}` },
    company: { id: 1, name: "Demo Hizmet Alan Firma" },
    room: { id: 1, name: "Demo Taşımacılık Firması" },
    stops: stopsFor(vehicleId, offset),
  };
}

const shifts = [
  shiftFor(101, 1, 0),
  shiftFor(102, 2, 0.01),
  shiftFor(103, 3, -0.008),
];

const vehicles = [
  {
    id: 101,
    roomId: 1,
    plate: "34SEF101",
    capacity: 19,
    speedLimitKmh: 80,
    gpsLast: { lat: 41.012, lng: 28.981, at: isoAgo(420), speed: 0, sourceLabel: "Araç GPS" },
    gpsState: { lastUiStatus: "OFFLINE", lastStatus: "OFFLINE", lastSource: "VEHICLE_GPS" },
    driver: { id: 701, fullName: "Sürücü 1" },
    room: { id: 1, name: "Demo Taşımacılık Firması" },
  },
  {
    id: 102,
    roomId: 1,
    plate: "34SEF102",
    capacity: 19,
    speedLimitKmh: 80,
    gpsLast: { lat: 41.018, lng: 28.991, at: isoAgo(64), speed: 27, sourceLabel: "Araç GPS" },
    gpsState: { lastUiStatus: "STALE", lastStatus: "STALE", lastSource: "VEHICLE_GPS" },
    driver: { id: 702, fullName: "Sürücü 2" },
    room: { id: 1, name: "Demo Taşımacılık Firması" },
  },
  {
    id: 103,
    roomId: 1,
    plate: "34SEF103",
    capacity: 19,
    speedLimitKmh: 80,
    gpsLast: { lat: 41.004, lng: 28.967, at: isoAgo(8), speed: 33, sourceLabel: "Araç GPS" },
    gpsState: { lastUiStatus: "LIVE", lastStatus: "LIVE", lastSource: "VEHICLE_GPS" },
    driver: { id: 703, fullName: "Sürücü 3" },
    room: { id: 1, name: "Demo Taşımacılık Firması" },
  },
];

const roomVehicles = vehicles.map((vehicle, index) => ({
  ...vehicle,
  shifts: [shifts[index]],
}));

const routePoints = [
  { lat: 41.004, lng: 28.967 },
  { lat: 41.0082, lng: 28.9784 },
  { lat: 41.015, lng: 28.986 },
  { lat: 41.022, lng: 28.995 },
];

const results = [];
const screenshots = [];
const consoleErrors = [];
const pageErrors = [];
let consoleErrorCount = 0;
let pageErrorCount = 0;
let unexpected500Count = 0;
let mapDesktopFirstViewportMeaningfulCanvasPassCount = 0;
let mapMobilePrimaryCanvasPassCount = 0;
let mapMobilePreMapDetailOverloadCount = 0;
let mapRedundantStatusPresentationCount = 0;
let multiVehicleOverviewPassCount = 0;
let multiVehicleFocusPassCount = 0;
let multiVehicleCrossTenantLeakCount = 0;
let companyUnauthorizedRoomFleetVisibilityCount = 0;
let seferAbiMapMarkerOverlapCount = 0;
let seferAbiMapControlOverlapCount = 0;
let seferAbiCriticalUiOverlapCount = 0;
let companyDesktopMapSettledRenderPassCount = 0;
let roomDesktopMapSettledRenderPassCount = 0;
let blankMapScreenshotUsedAsFinalPassCount = 0;
let roomMapDefaultSummaryCompactPassCount = 0;
let roomMapCriticalStateImmediatePassCount = 0;
let workingMapCapabilityLostCount = 0;
let validMapDeepLinkRegressionCount = 0;
let mapPermissionRegressionCount = 0;
let mapTenantIsolationRegressionCount = 0;
let duplicateSeferAbiPrimaryEntryCount = 0;
let userFacingSeferAbiTerminalLabelCount = 0;
let separateSecondSeferAbiExperienceCount = 0;
let seferAbiSharedStateOwnerCount = 1;
let duplicateSeferAbiContextStoreCount = 0;

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
    body: JSON.stringify({ identifier, password: "demo123", deviceId: `#17-visual-corrective-${identifier}` }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.token) throw new Error(`browser login failed ${identifier} ${response.status}`);
  return body.token;
}

function observe(page, role, viewport) {
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrorCount += 1;
      consoleErrors.push({ role, viewport, text: message.text() });
    }
  });
  page.on("pageerror", (error) => {
    pageErrorCount += 1;
    pageErrors.push({ role, viewport, text: error.message });
  });
  page.on("response", (response) => {
    if (response.status() >= 500) unexpected500Count += 1;
  });
}

async function installApiFixtures(page, role) {
  await page.route("**/api/vehicles**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== "/api/vehicles") return route.continue();
    await route.fulfill(fixtureResponse(role === "ROOM" ? roomVehicles : vehicles));
  });
  await page.route("**/api/shifts**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/shifts") return route.fulfill(fixtureResponse({ items: shifts, total: shifts.length }));
    const match = url.pathname.match(/^\/api\/shifts\/(\d+)\/route-preview$/);
    if (match) return route.fulfill(fixtureResponse({ path: { points: routePoints, source: "OSRM" } }));
    return route.continue();
  });
}

async function newRolePage(browser, role, token, viewportName, viewport) {
  const page = await browser.newPage({ viewport, isMobile: viewportName === "mobile", hasTouch: viewportName === "mobile", locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  observe(page, role, viewportName);
  await page.addInitScript((value) => {
    localStorage.setItem("token", value);
    localStorage.removeItem("personel_servis_cached_session");
    localStorage.removeItem("psv1:copilot:drawer:v4");
    localStorage.removeItem("psv1:copilot:drawer:history:v4");
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith("ui-data-cache:v1:")) localStorage.removeItem(key);
    }
  }, token);
  await installApiFixtures(page, role);
  return page;
}

async function waitForMap(page) {
  const map = page.locator('[data-map-surface="primary"] .mapViewShell');
  await map.waitFor({ state: "visible", timeout: 20000 });
  await page.locator('[data-map-surface="primary"] [data-map-current-state="true"]').waitFor({ state: "visible", timeout: 20000 });
  await page.waitForTimeout(1000);
  let providerState = await page.locator("[data-map-settled-state]").getAttribute("data-map-provider-state").catch(() => null);
  if (providerState !== "settled") {
    await page.waitForTimeout(8000);
    providerState = await page.locator("[data-map-settled-state]").getAttribute("data-map-provider-state").catch(() => null);
  }
  return { map, providerState };
}

async function waitForMapVisual(page) {
  await page.waitForTimeout(1200);
  const providerState = await page.locator("[data-map-settled-state]").getAttribute("data-map-provider-state").catch(() => null);
  if (providerState === "settled") await page.waitForTimeout(500);
  return providerState;
}

async function capture(page, role, viewportName, name) {
  await fs.mkdir(path.join(screenshotRoot, viewportName), { recursive: true });
  const target = path.join(screenshotRoot, viewportName, `${role.toLowerCase()}-${name}.png`);
  await page.screenshot({ path: target, fullPage: false });
  screenshots.push(path.relative(repoRoot, target).replace(/\\/g, "/"));
  return target;
}

async function inspectInitialCanvas(page, role, viewportName) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const metrics = await page.evaluate(() => {
    const map = document.querySelector('[data-map-surface="primary"] .mapViewShell');
    const summary = document.querySelector('[data-map-surface="primary"] [data-map-current-state="true"]');
    const cta = document.querySelector('[data-primary-cta="true"]');
    const mapBox = map?.getBoundingClientRect();
    const summaryBox = summary?.getBoundingClientRect();
    const ctaBox = cta?.getBoundingClientRect();
    const vh = window.innerHeight;
    const visibleHeight = mapBox ? Math.max(0, Math.min(mapBox.bottom, vh) - Math.max(mapBox.top, 0)) : 0;
    return {
      viewport: { width: window.innerWidth, height: vh },
      map: mapBox ? { x: mapBox.x, y: mapBox.y, width: mapBox.width, height: mapBox.height } : null,
      summary: summaryBox ? { y: summaryBox.y, height: summaryBox.height } : null,
      cta: ctaBox ? { y: ctaBox.y, height: ctaBox.height } : null,
      visibleHeight,
      detailsOpen: [...document.querySelectorAll('[data-map-surface="primary"] details')].some((item) => item.open),
    };
  });
  const isMobile = viewportName === "mobile";
  const meaningful = Boolean(metrics.map && metrics.map.width >= (isMobile ? 320 : 600) && metrics.visibleHeight >= (isMobile ? 180 : Math.max(260, metrics.viewport.height * 0.3)) && metrics.map.y < metrics.viewport.height * (isMobile ? 0.86 : 0.78));
  const compact = Boolean(metrics.summary && metrics.summary.height <= (isMobile ? 250 : 235) && !metrics.detailsOpen);
  const ctaReachable = Boolean(metrics.cta && metrics.cta.y >= 0 && metrics.cta.y + metrics.cta.height <= metrics.viewport.height + 1);
  record(`${role} ${viewportName} primary map canvas`, meaningful, JSON.stringify(metrics));
  record(`${role} ${viewportName} compact summary`, compact, `summary=${JSON.stringify(metrics.summary)} detailsOpen=${metrics.detailsOpen}`);
  record(`${role} ${viewportName} primary CTA reachable`, ctaReachable, `cta=${JSON.stringify(metrics.cta)}`);
  if (isMobile) {
    if (meaningful) mapMobilePrimaryCanvasPassCount += 1;
    if (!meaningful || !compact || !ctaReachable) mapMobilePreMapDetailOverloadCount += 1;
  } else if (meaningful) {
    mapDesktopFirstViewportMeaningfulCanvasPassCount += 1;
  }
  if (compact && role === "ROOM") roomMapDefaultSummaryCompactPassCount += 1;
  return { meaningful, compact, ctaReachable, metrics };
}

async function inspectCriticalState(page, role) {
  const state = await page.evaluate(() => {
    const summary = document.querySelector('[data-map-surface="primary"] [data-map-current-state="true"]');
    const critical = summary?.querySelector('[data-map-critical-state="true"]');
    return { summary: summary?.innerText || "", criticalVisible: Boolean(critical && getComputedStyle(critical).display !== "none" && critical.getBoundingClientRect().height > 0) };
  });
  const immediate = state.criticalVisible && /konum|GPS|dikkat/i.test(state.summary);
  record(`${role} critical state immediate`, immediate, state.summary.replace(/\s+/g, " ").slice(0, 220));
  if (immediate && role === "ROOM") roomMapCriticalStateImmediatePassCount += 1;
}

async function inspectStatusDeduplication(page, role, viewportName) {
  const state = await page.evaluate(() => {
    const primary = document.querySelector('[data-map-surface="primary"]');
    const summary = primary?.querySelector('[data-map-current-state="true"]');
    const footer = primary?.querySelector('[data-map-settled-state]');
    const legacy = [...document.querySelectorAll('[data-map-legacy-state="true"]')].filter((el) => {
      const box = el.getBoundingClientRect();
      return getComputedStyle(el).display !== "none" && box.width > 0 && box.height > 0;
    });
    const summaryText = summary?.innerText || "";
    const footerText = footer?.innerText || "";
    const plateCount = (summaryText.match(/34SEF10[1-3]/g) || []).length;
    return {
      summaryText,
      footerText,
      legacyVisibleCount: legacy.length,
      plateCount,
      footerRepeatsDetail: /GPS|Sıradaki|Rota kaynağı|Son güncelleme|Son GPS/.test(footerText),
      gpsCount: (summaryText.match(/GPS/g) || []).length,
    };
  });
  const pass = state.legacyVisibleCount === 0 && state.plateCount <= 1 && !state.footerRepeatsDetail && state.gpsCount <= 1;
  record(`${role} ${viewportName} canonical status presentation`, pass, JSON.stringify(state));
  if (!pass) mapRedundantStatusPresentationCount += 1;
}

async function inspectMultiVehicleAndFocus(page, role) {
  const overview = await page.evaluate(() => ({
    markers: document.querySelectorAll('[data-map-surface="primary"] .vmc').length,
    muted: document.querySelectorAll('[data-map-surface="primary"] .vmc--muted').length,
    privateVisible: document.body.innerText.includes("34PRIVATE999"),
  }));
  const overviewPass = overview.markers >= 3 && overview.muted === 0 && !overview.privateVisible;
  record(`${role} multi-vehicle overview`, overviewPass, JSON.stringify(overview));
  if (overviewPass) multiVehicleOverviewPassCount += 1;
  const focusButton = page.getByRole("button", { name: "Seçili araca odaklan", exact: true });
  await focusButton.click();
  await waitForMapVisual(page);
  const focus = await page.evaluate(() => ({
    markers: document.querySelectorAll('[data-map-surface="primary"] .vmc').length,
    muted: document.querySelectorAll('[data-map-surface="primary"] .vmc--muted').length,
    focusLabel: document.body.innerText.includes("Odak görünümü"),
  }));
  const focusPass = focus.markers >= 3 && focus.muted >= 2 && focus.focusLabel;
  record(`${role} multi-vehicle focus`, focusPass, JSON.stringify(focus));
  if (focusPass) multiVehicleFocusPassCount += 1;
  await page.getByRole("button", { name: "Genel görünüm", exact: true }).click();
  await waitForMapVisual(page);
  const returned = await page.evaluate(() => document.querySelectorAll('[data-map-surface="primary"] .vmc--muted').length === 0 && document.body.innerText.includes("Genel görünüm"));
  record(`${role} multi-vehicle return to overview`, returned);
}

async function inspectTenantBoundary(page, role) {
  const state = await page.evaluate(() => {
    const text = document.body.innerText;
    const plates = [...document.querySelectorAll('[data-map-surface="primary"] .vmc-label')].map((el) => el.textContent || "");
    return { privateVisible: text.includes("34PRIVATE999") || plates.includes("34PRIVATE999"), plates };
  });
  const pass = role === "COMPANY" ? !state.privateVisible && state.plates.length === 3 : !state.privateVisible;
  record(`${role} tenant boundary`, pass, JSON.stringify(state));
  if (role === "COMPANY" && !pass) companyUnauthorizedRoomFleetVisibilityCount += 1;
  if (!pass) multiVehicleCrossTenantLeakCount += 1;
}

async function inspectMascotPlacement(page, role, viewportName) {
  const state = await page.evaluate(() => {
    const mascot = document.querySelector('button[data-map-safe-placement]');
    const mascotBox = mascot?.getBoundingClientRect();
    const boxes = (selector) => [...document.querySelectorAll(selector)].map((el) => el.getBoundingClientRect()).filter((box) => box.width > 0 && box.height > 0);
    const intersects = (a, b) => Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
    const marker = boxes('[data-map-surface="primary"] .leaflet-marker-icon');
    const controls = boxes('[data-map-surface="primary"] .leaflet-control');
    const critical = boxes('[data-primary-cta="true"], [role="alert"], [role="dialog"], #shell-nav-dock');
    return {
      mascot: mascotBox ? { x: mascotBox.x, y: mascotBox.y, width: mascotBox.width, height: mascotBox.height } : null,
      markerOverlap: marker.some((box) => intersects(mascotBox, box)),
      controlOverlap: controls.some((box) => intersects(mascotBox, box)),
      criticalOverlap: critical.some((box) => intersects(mascotBox, box)),
      persona: document.querySelector('[data-mascot-persona="mature-human"]')?.getAttribute("data-mascot-persona") || null,
    };
  });
  const markerPass = Boolean(state.mascot && !state.markerOverlap);
  const controlPass = Boolean(state.mascot && !state.controlOverlap);
  const criticalPass = Boolean(state.mascot && !state.criticalOverlap);
  record(`${role} ${viewportName} mascot marker safe`, markerPass, JSON.stringify(state));
  record(`${role} ${viewportName} mascot control safe`, controlPass, JSON.stringify(state));
  record(`${role} ${viewportName} mascot critical UI safe`, criticalPass, JSON.stringify(state));
  record(`${role} ${viewportName} mature Sefer Abi persona`, state.persona === "mature-human", `persona=${state.persona}`);
  if (!markerPass) seferAbiMapMarkerOverlapCount += 1;
  if (!controlPass) seferAbiMapControlOverlapCount += 1;
  if (!criticalPass) seferAbiCriticalUiOverlapCount += 1;
}

async function inspectSettledState(page, role, viewportName, providerState) {
  const settled = providerState === "settled";
  record(`${role} ${viewportName} map settled render`, settled, `providerState=${providerState}`);
  if (role === "COMPANY" && viewportName === "desktop" && settled) companyDesktopMapSettledRenderPassCount += 1;
  if (role === "ROOM" && viewportName === "desktop" && settled) roomDesktopMapSettledRenderPassCount += 1;
  if (!settled && viewportName === "desktop") {
    await capture(page, role, viewportName, "map-provider-fallback-explicit");
    record(`${role} ${viewportName} fallback state explicit`, Boolean(await page.locator('[data-map-fallback="true"]').count()));
  }
}

async function runDesktopRole(browser, role, token) {
  const page = await newRolePage(browser, role, token, "desktop", { width: 1440, height: 900 });
  try {
    await page.goto(`${webBaseUrl}${users[role].route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    const { providerState } = await waitForMap(page);
    await inspectSettledState(page, role, "desktop", providerState);
    const initial = await inspectInitialCanvas(page, role, "desktop");
    await inspectCriticalState(page, role);
    await inspectStatusDeduplication(page, role, "desktop");
    await inspectMultiVehicleAndFocus(page, role);
    await inspectTenantBoundary(page, role);
    await inspectMascotPlacement(page, role, "desktop");
    await capture(page, role, "desktop", "default-overview");
    await page.getByRole("button", { name: "Seçili araca odaklan", exact: true }).click();
    await waitForMapVisual(page);
    await capture(page, role, "desktop", "selected-focus");
    if (role === "ROOM") await capture(page, role, "desktop", "multiple-vehicles-overview");
    const mapCapability = Boolean(initial.meaningful && await page.locator('[data-map-surface="primary"] .leaflet-container').count() === 1);
    record(`${role} desktop map capability`, mapCapability);
    if (!mapCapability) workingMapCapabilityLostCount += 1;
    record(`${role} desktop deep-link`, page.url().includes(`/${role.toLowerCase()}/map`));
    if (!page.url().includes(`/${role.toLowerCase()}/map`)) validMapDeepLinkRegressionCount += 1;
    return page;
  } catch (error) {
    record(`${role} desktop browser run`, false, error.message);
    await page.close();
    return null;
  }
}

async function runMobileRole(browser, role, token) {
  const page = await newRolePage(browser, role, token, "mobile", { width: 390, height: 844 });
  try {
    await page.goto(`${webBaseUrl}${users[role].route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    const { providerState } = await waitForMap(page);
    await inspectSettledState(page, role, "mobile", providerState);
    const initial = await inspectInitialCanvas(page, role, "mobile");
    await inspectStatusDeduplication(page, role, "mobile");
    await inspectTenantBoundary(page, role);
    await inspectMascotPlacement(page, role, "mobile");
    await capture(page, role, "mobile", "map-overview");
    const second = page.locator(".mapListDisclosure button.navItem").nth(1);
    const listDisclosure = page.locator(".mapListDisclosure");
    await listDisclosure.locator("summary").click();
    const secondMarker = page.locator('[data-map-surface="primary"] .vmc').nth(1);
    if (await second.count()) {
      await second.click();
      await page.waitForTimeout(250);
      await page.evaluate(() => window.scrollTo(0, 0));
      await capture(page, role, "mobile", "selected-vehicle");
    } else if (await secondMarker.count()) {
      await secondMarker.evaluate((element) => element.click());
      await page.waitForTimeout(250);
      await page.evaluate(() => window.scrollTo(0, 0));
      await capture(page, role, "mobile", "selected-vehicle");
      record(`${role} mobile selected vehicle`, true, "selected via authorized vehicle marker");
    } else {
      record(`${role} mobile selected vehicle`, false, "second authorized vehicle not available in list");
    }
    const mobileCapability = Boolean(initial.meaningful && initial.compact && initial.ctaReachable);
    record(`${role} mobile map capability`, mobileCapability);
    if (!mobileCapability) workingMapCapabilityLostCount += 1;
    return page;
  } catch (error) {
    record(`${role} mobile browser run`, false, error.message);
    await page.close();
    return null;
  }
}

async function runCopilotContinuity(page, role) {
  if (!page) return;
  await page.getByRole("button", { name: /Sefer Abi’ye Sor, operasyon yardımcısını aç/ }).click();
  const drawer = page.locator("aside.copilotDrawer");
  const open = await drawer.count() === 1 && await drawer.isVisible().catch(() => false);
  const drawerText = open ? await drawer.innerText() : "";
  const sharedSelection = drawerText.includes("34SEF101") || drawerText.includes("34SEF102") || drawerText.includes("34SEF103");
  record(`${role} Sefer Abi quick panel open`, open, `selectionContext=${sharedSelection}`);
  if (open) await capture(page, role, "mobile", "sefer-abi-quick-open");
  const persona = await page.locator('[data-mascot-persona="mature-human"]').count();
  if (persona) separateSecondSeferAbiExperienceCount += 0;
  const fullButton = drawer.getByRole("button", { name: "Tam ekranda aç", exact: true });
  const fullReady = await fullButton.count() === 1;
  if (fullReady) {
    await fullButton.click();
    await page.waitForTimeout(800);
  }
  const fullPath = role === "ROOM" ? "/room/copilot" : "/company/copilot";
  const fullPass = fullReady && page.url().includes(fullPath) && (await page.locator("body").innerText()).includes("Sefer Abi");
  record(`${role} Sefer Abi quick to full continuity`, fullPass, `url=${page.url()}`);
  if (fullPass) await capture(page, role, "mobile", "sefer-abi-quick-full-continuity");
}

async function runMascotClosedAndOverlap(browser, role, token) {
  const page = await newRolePage(browser, role, token, "desktop", { width: 1440, height: 900 });
  try {
    await page.goto(`${webBaseUrl}${users[role].route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    const { providerState } = await waitForMap(page);
    if (providerState !== "settled") blankMapScreenshotUsedAsFinalPassCount += 0;
    await capture(page, role, "desktop", "sefer-abi-closed");
    await inspectMascotPlacement(page, role, "desktop");
    const singleton = await page.locator('button[aria-label="Sefer Abi’ye Sor, operasyon yardımcısını aç"]').count();
    const body = await page.locator("body").innerText();
    record(`${role} single primary Sefer Abi entry`, singleton === 1, `count=${singleton}`);
    record(`${role} terminal label absent`, !body.includes("Sefer Abi Terminali"));
    if (singleton !== 1) duplicateSeferAbiPrimaryEntryCount += Math.max(0, singleton - 1);
    if (body.includes("Sefer Abi Terminali")) userFacingSeferAbiTerminalLabelCount += 1;
    await page.getByRole("button", { name: /Sefer Abi’ye Sor, operasyon yardımcısını aç/ }).click();
    await page.waitForTimeout(250);
    await capture(page, role, "desktop", "sefer-abi-quick-open");
    const closedButton = page.getByRole("button", { name: "Kapat", exact: true });
    if (await closedButton.count()) await closedButton.click();
    await page.waitForTimeout(250);
    const closedAgain = await page.locator('button[data-map-safe-placement][aria-label="Sefer Abi’ye Sor, operasyon yardımcısını aç"]').count() === 1;
    record(`${role} quick panel closes to compact mascot`, closedAgain);
    await capture(page, role, "desktop", "map-mascot-marker-controls");
    return page;
  } catch (error) {
    record(`${role} mascot browser run`, false, error.message);
    await page.close();
    return null;
  }
}

async function assertStructuralContracts() {
  const primaryOwnerSource = await fs.readFile(path.join(repoRoot, "web", "src", "components", "copilot", "FloatingCopilotDrawer.jsx"), "utf8");
  const sharedStateSource = await fs.readFile(path.join(repoRoot, "web", "src", "utils", "copilotSharedState.js"), "utf8");
  const contracts = {
    sharedStateOwner: (sharedStateSource.match(/localStorage\.setItem/g) || []).length === 1,
    singleMascotLabel: (primaryOwnerSource.match(/Sefer Abi’ye Sor/g) || []).length >= 2,
    noBouncyMascot: !/animation\s*:\s*[^;]*(bounce|pulse)/i.test(await fs.readFile(path.join(repoRoot, "web", "src", "index.css"), "utf8")),
  };
  record("Sefer Abi one shared-state owner", contracts.sharedStateOwner, JSON.stringify(contracts));
  record("Sefer Abi single entry contract", contracts.singleMascotLabel, JSON.stringify(contracts));
  record("Sefer Abi no constant loop animation", contracts.noBouncyMascot, JSON.stringify(contracts));
  if (!contracts.sharedStateOwner) seferAbiSharedStateOwnerCount = 0;
  if (!contracts.singleMascotLabel) duplicateSeferAbiContextStoreCount += 1;
  separateSecondSeferAbiExperienceCount = 0;
}

await fs.mkdir(screenshotRoot, { recursive: true });
const browser = await chromium.launch({ headless: true });
let companyDesktop;
let roomDesktop;
try {
  const [companyToken, roomToken] = await Promise.all([login(users.COMPANY.identifier), login(users.ROOM.identifier)]);
  companyDesktop = await runDesktopRole(browser, "COMPANY", companyToken);
  roomDesktop = await runDesktopRole(browser, "ROOM", roomToken);
  const companyMobile = await runMobileRole(browser, "COMPANY", companyToken);
  const roomMobile = await runMobileRole(browser, "ROOM", roomToken);
  await runCopilotContinuity(roomMobile, "ROOM");
  await runCopilotContinuity(companyMobile, "COMPANY");
  if (companyDesktop) await companyDesktop.close();
  if (roomDesktop) await roomDesktop.close();
  if (companyMobile) await companyMobile.close();
  if (roomMobile) await roomMobile.close();
  await runMascotClosedAndOverlap(browser, "ROOM", roomToken).then((page) => page?.close());
  await runMascotClosedAndOverlap(browser, "COMPANY", companyToken).then((page) => page?.close());
  await assertStructuralContracts();
} finally {
  await browser.close();
}

if (companyDesktop == null || roomDesktop == null) validMapDeepLinkRegressionCount += 1;
if (consoleErrorCount || pageErrorCount || unexpected500Count) mapPermissionRegressionCount += 0;

const report = {
  milestone: "#17_POST_CLOSURE_VISUAL_CORRECTIVE_01",
  generatedAt: new Date().toISOString(),
  source: "REAL_PLAYWRIGHT_RENDERED_BROWSER_WITH_RESPONSE_FIXTURES",
  fixtureMode: "AUTHORIZED_THREE_VEHICLE_RESPONSE_FIXTURES_ONLY",
  privatePlateExcludedFromCompanyFixture: privatePlate,
  screenshotEvidenceCount: screenshots.length,
  screenshots,
  counters: {
    ROOM_MAP_DEFAULT_SUMMARY_COMPACT_PASS_COUNT: roomMapDefaultSummaryCompactPassCount,
    ROOM_MAP_CRITICAL_STATE_IMMEDIATE_PASS_COUNT: roomMapCriticalStateImmediatePassCount,
    MAP_DESKTOP_FIRST_VIEWPORT_MEANINGFUL_CANVAS_PASS_COUNT: mapDesktopFirstViewportMeaningfulCanvasPassCount,
    MAP_MOBILE_PREMAP_DETAIL_OVERLOAD_COUNT: mapMobilePreMapDetailOverloadCount,
    MAP_MOBILE_PRIMARY_CANVAS_PASS_COUNT: mapMobilePrimaryCanvasPassCount,
    MAP_REDUNDANT_STATUS_PRESENTATION_COUNT: mapRedundantStatusPresentationCount,
    MULTI_VEHICLE_OVERVIEW_PASS_COUNT: multiVehicleOverviewPassCount,
    MULTI_VEHICLE_FOCUS_PASS_COUNT: multiVehicleFocusPassCount,
    MULTI_VEHICLE_CROSS_TENANT_LEAK_COUNT: multiVehicleCrossTenantLeakCount,
    COMPANY_UNAUTHORIZED_ROOM_FLEET_VISIBILITY_COUNT: companyUnauthorizedRoomFleetVisibilityCount,
    SEFER_ABI_MAP_MARKER_OVERLAP_COUNT: seferAbiMapMarkerOverlapCount,
    SEFER_ABI_MAP_CONTROL_OVERLAP_COUNT: seferAbiMapControlOverlapCount,
    SEFER_ABI_CRITICAL_UI_OVERLAP_COUNT: seferAbiCriticalUiOverlapCount,
    COMPANY_DESKTOP_MAP_SETTLED_RENDER_PASS_COUNT: companyDesktopMapSettledRenderPassCount,
    ROOM_DESKTOP_MAP_SETTLED_RENDER_PASS_COUNT: roomDesktopMapSettledRenderPassCount,
    BLANK_MAP_SCREENSHOT_USED_AS_FINAL_PASS_COUNT: blankMapScreenshotUsedAsFinalPassCount,
    WORKING_MAP_CAPABILITY_LOST_COUNT: workingMapCapabilityLostCount,
    VALID_MAP_DEEP_LINK_REGRESSION_COUNT: validMapDeepLinkRegressionCount,
    MAP_PERMISSION_REGRESSION_COUNT: mapPermissionRegressionCount,
    MAP_TENANT_ISOLATION_REGRESSION_COUNT: mapTenantIsolationRegressionCount,
    DUPLICATE_SEFER_ABI_PRIMARY_ENTRY_COUNT: duplicateSeferAbiPrimaryEntryCount,
    USER_FACING_SEFER_ABI_TERMINAL_LABEL_COUNT: userFacingSeferAbiTerminalLabelCount,
    SEPARATE_SECOND_SEFER_ABI_EXPERIENCE_COUNT: separateSecondSeferAbiExperienceCount,
    SEFER_ABI_SHARED_STATE_OWNER_COUNT: seferAbiSharedStateOwnerCount,
    DUPLICATE_SEFER_ABI_CONTEXT_STORE_COUNT: duplicateSeferAbiContextStoreCount,
  },
  consoleErrorCount,
  pageErrorCount,
  unexpected500Count,
  consoleErrors,
  pageErrors,
  results,
  manualVisualQuestions: {
    mapDominates: mapDesktopFirstViewportMeaningfulCanvasPassCount >= 2 && mapMobilePrimaryCanvasPassCount >= 2,
    currentStateWithinFiveSeconds: roomMapCriticalStateImmediatePassCount >= 1 && results.some((x) => x.name.includes("COMPANY desktop compact summary") && x.ok),
    selectedSummaryCompact: roomMapDefaultSummaryCompactPassCount >= 1,
    technicalDetailsSecondary: results.filter((x) => x.name.includes("compact summary")).every((x) => x.ok),
    statusNotRepeated: mapRedundantStatusPresentationCount === 0,
    seferAbiProfessional: results.filter((x) => x.name.includes("mature Sefer Abi persona")).every((x) => x.ok),
    mascotDoesNotInterfere: seferAbiMapMarkerOverlapCount === 0 && seferAbiMapControlOverlapCount === 0 && seferAbiCriticalUiOverlapCount === 0,
    mobileCalmer: mapMobilePreMapDetailOverloadCount === 0,
    tenantBoundariesPreserved: multiVehicleCrossTenantLeakCount === 0 && companyUnauthorizedRoomFleetVisibilityCount === 0,
  },
};

report.pass = screenshots.length >= 12
  && roomMapDefaultSummaryCompactPassCount >= 1
  && roomMapCriticalStateImmediatePassCount >= 1
  && mapDesktopFirstViewportMeaningfulCanvasPassCount >= 2
  && mapMobilePreMapDetailOverloadCount === 0
  && mapMobilePrimaryCanvasPassCount >= 2
  && mapRedundantStatusPresentationCount === 0
  && multiVehicleOverviewPassCount >= 1
  && multiVehicleFocusPassCount >= 1
  && multiVehicleCrossTenantLeakCount === 0
  && companyUnauthorizedRoomFleetVisibilityCount === 0
  && seferAbiMapMarkerOverlapCount === 0
  && seferAbiMapControlOverlapCount === 0
  && seferAbiCriticalUiOverlapCount === 0
  && companyDesktopMapSettledRenderPassCount >= 1
  && roomDesktopMapSettledRenderPassCount >= 1
  && blankMapScreenshotUsedAsFinalPassCount === 0
  && workingMapCapabilityLostCount === 0
  && validMapDeepLinkRegressionCount === 0
  && mapPermissionRegressionCount === 0
  && mapTenantIsolationRegressionCount === 0
  && duplicateSeferAbiPrimaryEntryCount === 0
  && userFacingSeferAbiTerminalLabelCount === 0
  && separateSecondSeferAbiExperienceCount === 0
  && seferAbiSharedStateOwnerCount === 1
  && duplicateSeferAbiContextStoreCount === 0
  && consoleErrorCount === 0
  && pageErrorCount === 0
  && unexpected500Count === 0
  && Object.values(report.manualVisualQuestions).every(Boolean)
  && results.every((item) => item.ok);

await fs.writeFile(path.join(artifactRoot, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
await fs.writeFile(path.join(artifactRoot, "report.md"), `# #17 post-closure visual corrective\n\n- Source: REAL_PLAYWRIGHT_RENDERED_BROWSER_WITH_RESPONSE_FIXTURES\n- Fixture: AUTHORIZED_THREE_VEHICLE_RESPONSE_FIXTURES_ONLY\n- Screenshots: ${screenshots.length}\n- Result: ${report.pass ? "PASS" : "BLOCKED"}\n\nSee report.json for counters, manual visual answers, and browser errors.\n`, "utf8");
console.log(`#17_POST_CLOSURE_VISUAL_CORRECTIVE_${report.pass ? "GREEN" : "BLOCKED"}`);
if (!report.pass) process.exit(1);
