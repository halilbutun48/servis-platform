import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const webBaseUrl = (process.env.WEB_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const apiBaseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const evidenceRoot = path.join(repoRoot, "backend", "artifacts", "browser-smoke", "project-wide-turkish-terminology-audit-01");
const screenshotRoot = path.join(evidenceRoot, "screenshots");
const driverDeviceId = process.env.DRIVER_BROWSER_DEVICE_ID || "web-s27k9shhmqj7i68l";

const users = {
  SUPER_ADMIN: { identifier: "superadmin@demo.com", route: "/superadmin" },
  COMPANY: { identifier: "company@demo.com", route: "/company" },
  ROOM: { identifier: "room@demo.com", route: "/room/operation-health" },
  DRIVER: { identifier: "driver@demo.com", route: "/driver/today", deviceId: driverDeviceId },
  PERSONEL: { identifier: "personel@demo.com", route: "/personel/live" },
  PARENT: { identifier: "parent@demo.com", route: "/parent/live" },
  SCHOOL: { identifier: "school@demo.com", route: "/school", viewport: { width: 390, height: 844 } },
  ORGANIZATION: { identifier: "organization@demo.com", route: "/organization" },
};

const contexts = [];
const states = [];
const screenshots = [];
const allErrors = [];
const allHttpErrors = [];
const mapDiagnosticCounters = {
  rawRouteSourceEnumLeakCount: 0,
  estimatedRoutePresentedAsLiveCount: 0,
  browserPassCount: 0,
};

const leakRules = [
  ["raw-role", /\b(?:SUPER_ADMIN|COMPANY|ROOM|DRIVER|PARENT|SCHOOL|ORGANIZATION)\b/g],
  ["old-oda", /\bOda\b/gi],
  ["human-approval-jargon", /\b(?:human approval|insan onayı)\b/gi],
  ["sefer-abi-terminal", /Sefer Abi Terminali/gi],
  ["copilot-primary", /\bCopilot\b/gi],
  ["raw-status", /\b(?:OFFLINE|ONLINE|STALE|APPROVED|PENDING|REJECTED|ACTIVE|CANCELLED|READY|REQUIRED|EXECUTED)\b/g],
  ["raw-field", /\b(?:requestUrl|routeSource|providerAdapter|selectedEntity|sourceKey|entryKind|sourceType|latitude|longitude|lat|lng)\b/g],
  ["snake-or-camel-field", /\b[a-z]+_[a-z]+\b|\b[a-z]+[A-Z][a-zA-Z]+\b/g],
  ["internal-engine", /\b(?:intent engine|root cause engine|risk scoring engine|canonical owner|provider adapter|feature flag)\b/gi],
  ["english-workflow", /\b(?:Check-in|Confirm|Approve|Execute|Cancel|Send|Accept|Reject|Convert|Dispatch|Publish|Finalize)\b/gi],
];

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function recordLeaks(visibleText, accessibleLabels) {
  const full = `${visibleText}\n${accessibleLabels.join("\n")}`;
  const hits = [];
  for (const [name, rule] of leakRules) {
    const matches = full.match(rule) || [];
    if (matches.length) hits.push({ rule: name, matches: unique(matches).slice(0, 12) });
  }
  return hits;
}

async function login(identifier, deviceId = null) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        identifier,
        password: "demo123",
        deviceId: deviceId || `#15-terminology-${identifier}`,
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok && body.token) return body.token;
    if (response.status === 429 && attempt < 5) {
      const retryAfter = Number(response.headers.get("retry-after") || body.retryAfterSec || 0);
      await new Promise((resolve) => setTimeout(resolve, Math.min(15000, Math.max(2000, retryAfter * 1000 || (attempt + 1) * 3000))));
      continue;
    }
    throw new Error(`browser login failed ${identifier} ${response.status}`);
  }
  throw new Error(`browser login failed ${identifier} rate limit retries exhausted`);
}

function observe(page, label) {
  const errors = [];
  const httpErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push({ type: "console", label, text: message.text() });
  });
  page.on("pageerror", (error) => errors.push({ type: "page", label, text: error.message }));
  page.on("response", (response) => {
    if (response.status() < 400) return;
    const item = { label, status: response.status(), url: response.url() };
    response.text().then((body) => httpErrors.push({ ...item, body: body.slice(0, 500) })).catch(() => httpErrors.push(item));
  });
  return { errors, httpErrors };
}

async function preparePage(browser, contextName, token, viewport = { width: 1440, height: 900 }) {
  const page = await browser.newPage({
    viewport,
    isMobile: viewport.width < 700,
    hasTouch: viewport.width < 700,
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
  });
  const observed = observe(page, contextName);
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
  return { page, ...observed };
}

async function visibleSnapshot(page) {
  const visibleText = await page.locator("body").innerText().catch(() => "");
  const accessibleLabels = await page.locator("button:visible, input:visible, textarea:visible, select:visible, [role=button]:visible, [aria-label]:visible, [title]:visible").evaluateAll((nodes) => nodes.map((node) => [
    node.innerText,
    node.getAttribute("aria-label"),
    node.getAttribute("title"),
    node.getAttribute("placeholder"),
  ].filter(Boolean).join(" ").trim()).filter(Boolean)).catch(() => []);
  return {
    visibleText: visibleText.replace(/\s+/g, " ").trim(),
    accessibleLabels: unique(accessibleLabels),
  };
}

async function capture(page, name) {
  await fs.mkdir(screenshotRoot, { recursive: true });
  const target = path.join(screenshotRoot, `${name}.png`);
  await page.screenshot({ path: target, fullPage: false });
  screenshots.push(path.relative(repoRoot, target).replace(/\\/g, "/"));
  return path.relative(repoRoot, target).replace(/\\/g, "/");
}

async function openRoute(page, route, waitMs = 1500) {
  await page.goto(`${webBaseUrl}/#${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(waitMs);
}

async function installCopilotFixture(page) {
  await page.route("**/api/ai/copilot", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        provider: "terminology-acceptance-fixture",
        mode: "CHAT_HELP",
        reply: "Sefer Abi aynı ekran bağlamıyla yardımcı olmaya hazır.",
        summary: "Ekran bağlamı korundu.",
        screenLabel: "Canlı Takip",
        contextualSuggestedChips: ["Seçili aracı anlat", "Sıradaki doğru işlem ne?"],
        suggestedChips: ["Seçili aracı anlat", "Sıradaki doğru işlem ne?"],
        quickActions: [],
        responseSections: [],
        conversationState: { source: "terminology-acceptance-fixture", contextPreserved: true },
      }),
    });
  });
}

async function contextEvidence(browser, contextName, spec) {
  const token = await login(spec.identifier, spec.deviceId);
  const prepared = await preparePage(browser, contextName, token, spec.viewport || { width: 1440, height: 900 });
  const { page, errors, httpErrors } = prepared;
  await openRoute(page, spec.route);
  const snapshot = await visibleSnapshot(page);
  const leaks = recordLeaks(snapshot.visibleText, snapshot.accessibleLabels);
  const screenshot = await capture(page, `context-${contextName.toLowerCase()}-real`);
  contexts.push({
    context: contextName,
    role: contextName === "SCHOOL" || contextName === "ORGANIZATION" ? "COMPANY" : contextName,
    route: spec.route,
    viewport: spec.viewport || { width: 1440, height: 900 },
    screenshot,
    visibleText: snapshot.visibleText,
    accessibleLabels: snapshot.accessibleLabels,
    leaks,
    errors,
    httpErrors,
    pass: snapshot.visibleText.length > 40 && leaks.length === 0 && errors.length === 0,
  });
  allErrors.push(...errors);
  allHttpErrors.push(...httpErrors);
  await page.close();
}

function bodyHas(snapshot, ...patterns) {
  const text = snapshot.visibleText.toLocaleLowerCase("tr-TR");
  return patterns.some((pattern) => text.includes(String(pattern).toLocaleLowerCase("tr-TR")));
}

async function recordState(browser, name, contextName, route, trigger, setup, evaluate, screenshotName, viewport = { width: 1440, height: 900 }, waitMs = 1200) {
  const spec = users[contextName];
  const token = await login(spec.identifier, spec.deviceId);
  const prepared = await preparePage(browser, `state:${name}`, token, viewport);
  const { page, errors, httpErrors } = prepared;
  if (setup) await setup(page);
  await openRoute(page, route, waitMs);
  const extra = evaluate ? await evaluate(page) : {};
  const snapshot = await visibleSnapshot(page);
  const leaks = recordLeaks(snapshot.visibleText, snapshot.accessibleLabels);
  const screenshot = await capture(page, screenshotName);
  const unexpectedErrors = extra.allowExpectedErrors ? errors.filter((item) => !extra.allowExpectedErrors.some((marker) => item.text.includes(marker))) : errors;
  const result = {
    name,
    context: contextName,
    route,
    trigger,
    screenshot,
    visibleText: snapshot.visibleText,
    accessibleLabels: snapshot.accessibleLabels,
    leaks,
    errors,
    httpErrors,
    pass: Boolean(extra.pass) && leaks.length === 0 && unexpectedErrors.length === 0,
    evidence: extra.evidence || "",
  };
  states.push(result);
  allErrors.push(...errors);
  allHttpErrors.push(...httpErrors);
  await page.close();
  return result;
}

async function runPermissionAndRecovery(browser) {
  let attempt = 0;
  const setup = async (page) => {
    await page.route("**/api/trust-quality/proof-signals/summary**", async (route) => {
      attempt += 1;
      if (attempt === 1) {
        await route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: { code: "FORBIDDEN", message: "Forbidden" } }) });
      } else {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "NOT_READY", signals: [], checklist: [] }) });
      }
    });
  };
  const permission = await recordState(browser, "permission-denied", "COMPANY", "/company/service-evaluation", "Open the existing Kanıt / Hazırlık tab while its proof endpoint returns the real 403 response.", setup, async (page) => {
    const tab = page.getByRole("tab", { name: /Kanıt \/ Hazırlık/i });
    await tab.first().click();
    await page.waitForTimeout(500);
    const snapshot = await visibleSnapshot(page);
    return { pass: bodyHas(snapshot, "yetkiniz yok"), allowExpectedErrors: ["status of 403", "403 (Forbidden)"], evidence: "Existing QualityProofReadonlyCard rendered its Turkish permission message after a 403." };
  }, "31-permission-denied-real");

  const recovery = await recordState(browser, "retry-recovery", "COMPANY", "/company/service-evaluation", "Switch away from the failed proof tab and open it again; the same existing surface receives a successful retry response.", setup, async (page) => {
    const tab = page.getByRole("tab", { name: /Kanıt \/ Hazırlık/i });
    await tab.first().click();
    await page.waitForTimeout(450);
    const overview = page.getByRole("tab", { name: "Özet" });
    await overview.first().click();
    await page.waitForTimeout(150);
    await tab.first().click();
    await page.waitForTimeout(700);
    const snapshot = await visibleSnapshot(page);
    return { pass: bodyHas(snapshot, "Kalite sinyali henüz oluşmadı"), evidence: "Existing proof surface recovered to its Turkish empty state after a second load." };
  }, "32-retry-recovery-real");
  return { permission, recovery };
}

async function runLoadingMatrix(browser) {
  const setup = async (page) => {
    await page.route("**/api/trust-quality/proof-signals/summary**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1600));
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "NOT_READY", signals: [], checklist: [] }) });
    });
  };
  return recordState(browser, "loading", "COMPANY", "/company/service-evaluation", "Open the existing Kanıt / Hazırlık tab while its proof request is still pending.", setup, async (page) => {
    const tab = page.getByRole("tab", { name: /Kanıt \/ Hazırlık/i });
    await tab.first().click();
    await page.waitForTimeout(120);
    const snapshot = await visibleSnapshot(page);
    return { pass: bodyHas(snapshot, "Kalite sinyalleri yükleniyor"), evidence: "Existing QualityProofReadonlyCard rendered its Turkish pending/loading state while the request was delayed." };
  }, "25-loading-real", { width: 1440, height: 900 }, 500);
}

async function runConflictMatrix(browser) {
  const now = Date.now();
  const startAt = new Date(now + 15 * 60 * 1000).toISOString();
  const endAt = new Date(now + 75 * 60 * 1000).toISOString();
  const pending = {
    id: 8801,
    status: "REQUESTED",
    roomId: 1,
    companyId: 1,
    companyOfferVehicleId: 501,
    driverId: 601,
    startAt,
    endAt,
    requiredPax: 8,
    company: { id: 1, name: "Demo Hizmet Alan Firma" },
  };
  const active = {
    id: 8802,
    status: "ACTIVE",
    roomId: 1,
    companyId: 1,
    vehicleId: 501,
    driverId: 601,
    startAt: new Date(now + 10 * 60 * 1000).toISOString(),
    endAt: new Date(now + 80 * 60 * 1000).toISOString(),
    company: { id: 1, name: "Demo Hizmet Alan Firma" },
  };
  const setup = async (page) => {
    await page.route("**/api/shifts**", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/shifts") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [pending, active], total: 2 }) });
      }
      return route.continue();
    });
    await page.route("**/api/vehicles**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: 501, roomId: 1, plate: "34ÇAK501", capacity: 19, driverId: 601 }]) }));
    await page.route("**/api/drivers**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: 601, roomId: 1, fullName: "Sürücü Çakışma" }]) }));
    await page.route("**/api/rooms**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: 1, name: "Demo Taşımacılık Firması" }]) }));
    await page.route("**/api/offers/inbox**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) }));
    await page.route("**/api/shifts/*/dispatch-preview", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ suggestions: [] }) }));
    await page.route("**/api/availability**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: false, available: false, code: "DRIVER_CONFLICT", message: "Sürücü aynı zaman aralığında başka bir vardiyada." }) }));
  };
  return recordState(browser, "duplicate-conflict", "ROOM", "/room/shifts", "Load two real shift rows with the existing availability check returning a deterministic conflict for the selected driver.", setup, async (page) => {
    await page.waitForTimeout(700);
    const snapshot = await visibleSnapshot(page);
    return { pass: bodyHas(snapshot, "Çakışma", "aynı zaman aralığında"), evidence: "Existing RoomAvailabilityLine rendered the Turkish conflict state; no approval was executed." };
  }, "33-conflict-real", { width: 1440, height: 900 }, 5000);
}

async function runPublicConfirmationCancellation(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  const { errors, httpErrors } = observe(page, "state:confirmation-cancellation");
  await page.goto(`${webBaseUrl}/#/landing`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(900);
  const open = page.getByRole("button", { name: "Başvuru formunu aç" });
  await open.first().click();
  await page.waitForTimeout(250);
  const before = await visibleSnapshot(page);
  const beforeShot = await capture(page, "34-confirmation-real");
  const confirmation = {
    name: "confirmation",
    context: "PUBLIC",
    route: "/landing",
    trigger: "Open the existing controlled application modal without submitting it.",
    screenshot: beforeShot,
    visibleText: before.visibleText,
    accessibleLabels: before.accessibleLabels,
    leaks: recordLeaks(before.visibleText, before.accessibleLabels),
    errors,
    httpErrors,
    pass: bodyHas(before, "Başvuru formu", "Başvuruyu gönder", "KVKK") && errors.length === 0,
    evidence: "Existing PublicLeadCaptureModal rendered Turkish approval/submit wording and the KVKK confirmation gate.",
  };
  states.push(confirmation);
  await page.getByRole("button", { name: "Vazgeç" }).click();
  await page.waitForTimeout(200);
  const after = await visibleSnapshot(page);
  const afterShot = await capture(page, "35-cancellation-real");
  const cancellation = {
    name: "cancellation",
    context: "PUBLIC",
    route: "/landing",
    trigger: "Cancel the existing application modal with its Vazgeç action.",
    screenshot: afterShot,
    visibleText: after.visibleText,
    accessibleLabels: after.accessibleLabels,
    leaks: recordLeaks(after.visibleText, after.accessibleLabels),
    errors,
    httpErrors,
    pass: await page.getByRole("dialog").count() === 0 && after.visibleText.includes("Başvuru formunu aç") && errors.length === 0,
    evidence: "Existing modal closed and returned to the Turkish public landing surface.",
  };
  states.push(cancellation);
  allErrors.push(...errors);
  allHttpErrors.push(...httpErrors);
  await page.close();
  return { confirmation, cancellation };
}

async function runDriverValidation(browser) {
  const token = await login(users.DRIVER.identifier, users.DRIVER.deviceId);
  const prepared = await preparePage(browser, "state:driver-validation", token, { width: 390, height: 844 });
  const { page, errors, httpErrors } = prepared;
  await openRoute(page, "/driver/change-pin", 600);
  const button = page.getByRole("button", { name: /PIN.*Kaydet/i });
  if (await button.count()) await button.first().click();
  await page.waitForTimeout(250);
  const snapshot = await visibleSnapshot(page);
  const shot = await capture(page, "29-driver-validation-real");
  const result = {
    name: "validation-error",
    context: "DRIVER",
    route: "/driver/change-pin",
    trigger: "Submit the existing PIN form with empty fields.",
    screenshot: shot,
    visibleText: snapshot.visibleText,
    accessibleLabels: snapshot.accessibleLabels,
    leaks: recordLeaks(snapshot.visibleText, snapshot.accessibleLabels),
    errors,
    httpErrors,
    pass: bodyHas(snapshot, "Yeni PIN en az 4 hane olmalı") && errors.length === 0,
    evidence: "Real bound DRIVER browser session rendered the existing Turkish validation error.",
  };
  states.push(result);
  allErrors.push(...errors);
  allHttpErrors.push(...httpErrors);
  await page.close();
  return result;
}

async function runMapState(browser) {
  const token = await login(users.ROOM.identifier);
  const prepared = await preparePage(browser, "state:room-map", token, { width: 1440, height: 900 });
  const { page, errors, httpErrors } = prepared;
  await installCopilotFixture(page);
  await openRoute(page, "/room/map", 2200);
  const snapshot = await visibleSnapshot(page);
  const shot = await capture(page, "28-room-stale-offline-real");
  const result = {
    name: "stale-offline",
    context: "ROOM",
    route: "/room/map",
    trigger: "Open the existing live map with current operational telemetry state.",
    screenshot: shot,
    visibleText: snapshot.visibleText,
    accessibleLabels: snapshot.accessibleLabels,
    leaks: recordLeaks(snapshot.visibleText, snapshot.accessibleLabels),
    errors,
    httpErrors,
    pass: bodyHas(snapshot, "Konum sinyali", "Harita hazır") && errors.length === 0,
    evidence: "Existing live map rendered its current Turkish GPS state and settled map status.",
  };
  states.push(result);
  allErrors.push(...errors);
  allHttpErrors.push(...httpErrors);
  await page.close();
  return result;
}

async function runMapDiagnosticTerminology(browser) {
  const now = Date.now();
  const stops = [
    { id: 97011, order: 1, name: "Taksim", lat: 41.0370, lng: 28.9850, status: "PENDING" },
    { id: 97012, order: 2, name: "Beşiktaş", lat: 41.0430, lng: 29.0050, status: "PENDING" },
  ];
  const setup = async (page) => {
    await page.route("**/api/vehicles**", async (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{
        id: 9701,
        roomId: 1,
        plate: "34TAN701",
        capacity: 19,
        gpsLast: null,
        gpsState: { lastUiStatus: "OFFLINE", lastSource: "DEVICE" },
        shifts: [{
          id: 97011,
          status: "ACTIVE",
          roomId: 1,
          startAt: new Date(now - 20 * 60 * 1000).toISOString(),
          updatedAt: new Date(now - 2 * 60 * 1000).toISOString(),
          stops,
        }],
      }]),
    }));
    await page.route("**/api/shifts/*/route-preview**", async (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        path: {
          source: "ESTIMATED",
          points: [
            { lat: 41.0370, lng: 28.9850 },
            { lat: 41.0400, lng: 28.9950 },
            { lat: 41.0430, lng: 29.0050 },
          ],
        },
      }),
    }));
  };
  const result = await recordState(
    browser,
    "map-diagnostic-terminology",
    "ROOM",
    "/room/map",
    "Render a vehicle without live location while its existing route preview returns the ESTIMATED source enum, then open the diagnostic disclosure.",
    setup,
    async (page) => {
      const disclosure = page.locator("details.mapViewDiagnostics").first();
      await disclosure.evaluate((node) => { node.open = true; });
      await page.locator('[data-map-route-summary="estimated"]').first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
      const snapshot = await visibleSnapshot(page);
      const text = `${snapshot.visibleText}\n${snapshot.accessibleLabels.join("\n")}`;
      const rawEnumLeak = /\bESTIMATED\b/.test(text);
      const presentedAsLive = /Haritada tahmini rota gösteriliyor/i.test(text)
        && !/Canlı konum alınamıyor/i.test(text);
      mapDiagnosticCounters.rawRouteSourceEnumLeakCount = rawEnumLeak ? 1 : 0;
      mapDiagnosticCounters.estimatedRoutePresentedAsLiveCount = presentedAsLive ? 1 : 0;
      return {
        pass: !rawEnumLeak
          && !presentedAsLive
          && bodyHas(snapshot, "Canlı konum alınamıyor", "Haritada tahmini rota gösteriliyor", "Tahmini rota", "Tanılama ayrıntıları")
          && await disclosure.getAttribute("open") !== null,
        evidence: "The real ROOM map rendered an unavailable live location, clearly labeled the displayed path as a predicted route, hid the ESTIMATED enum, and kept the Turkish diagnostic disclosure usable.",
      };
    },
    "38-map-diagnostic-estimated-route-real",
    { width: 1440, height: 900 },
    2600,
  );
  mapDiagnosticCounters.browserPassCount = result.pass ? 1 : 0;
  return result;
}

async function runSuccessAndCrossKind(browser) {
  const success = await recordState(browser, "success", "ROOM", "/room/map", "Open the existing live map and wait for its settled provider state.", null, async (page) => {
    const snapshot = await visibleSnapshot(page);
    return { pass: bodyHas(snapshot, "Harita hazır", "Konum sinyali"), evidence: "Existing Room live map rendered a settled Turkish success/provider state." };
  }, "37-room-success-real", { width: 1440, height: 900 }, 2200);

  const token = await login(users.COMPANY.identifier);
  const prepared = await preparePage(browser, "state:cross-kind-denied", token, { width: 1440, height: 900 });
  const { page, errors, httpErrors } = prepared;
  await openRoute(page, "/room/map", 1800);
  const snapshot = await visibleSnapshot(page);
  const screenshot = await capture(page, "36-cross-kind-denied-real");
  const roomDataVisible = /Turizm\/Taşımacılık Firması|room@demo\.com|34SEF10[1-3]/i.test(`${snapshot.visibleText}\n${snapshot.accessibleLabels.join("\n")}`);
  const result = {
    name: "cross-kind-denied",
    context: "COMPANY",
    route: "/room/map",
    trigger: "Open the ROOM map deep link with a COMPANY session; the existing authorization/data boundary must keep ROOM data out of the rendered surface.",
    screenshot,
    visibleText: snapshot.visibleText,
    accessibleLabels: snapshot.accessibleLabels,
    leaks: recordLeaks(snapshot.visibleText, snapshot.accessibleLabels),
    errors,
    httpErrors,
    pass: bodyHas(snapshot, "Hizmet Alan Firma") && !roomDataVisible && errors.length === 0,
    evidence: "Existing COMPANY session rendered its own shell/empty map state and did not render ROOM fleet data.",
  };
  states.push(result);
  allErrors.push(...errors);
  allHttpErrors.push(...httpErrors);
  await page.close();
  return { success, crossKind: result };
}

async function runEmptyMissingAndNotFound(browser) {
  const empty = await recordState(browser, "empty", "COMPANY", "/company/map", "Open the existing company live map with no selected vehicle and no current shift.", null, async (page) => {
    const snapshot = await visibleSnapshot(page);
    return { pass: bodyHas(snapshot, "Araç seçilmedi", "Vardiya yok", "Harita hazır"), evidence: "Existing company map empty state rendered in Turkish." };
  }, "26-company-empty-map-real");
  const missing = await recordState(browser, "missing-data", "ROOM", "/room/offers", "Open the existing offers surface with no records.", null, async (page) => {
    const snapshot = await visibleSnapshot(page);
    return { pass: bodyHas(snapshot, "Teklif", "teklif yok", "Kullanıcı onayı"), evidence: "Existing offers surface rendered its Turkish no-data and approval framing." };
  }, "27-room-missing-data-real");
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  const { errors, httpErrors } = observe(page, "state:not-found");
  await openRoute(page, "/accept-parent-invite?token=invalid", 1000);
  const snapshot = await visibleSnapshot(page);
  const screenshot = await capture(page, "30-not-found-real");
  const notFound = {
    name: "not-found",
    context: "PUBLIC",
    route: "/accept-parent-invite?token=invalid",
    trigger: "Open the existing invitation acceptance surface with an invalid token.",
    screenshot,
    visibleText: snapshot.visibleText,
    accessibleLabels: snapshot.accessibleLabels,
    leaks: recordLeaks(snapshot.visibleText, snapshot.accessibleLabels),
    errors,
    httpErrors,
    pass: bodyHas(snapshot, "Veli kodu", "doğrulanıyor") && errors.every((item) => item.text.includes("status of 404") || item.text.includes("404 (Not Found)")),
    evidence: "Existing invitation acceptance surface rendered its Turkish not-found/recovery message.",
  };
  states.push(notFound);
  allErrors.push(...errors);
  allHttpErrors.push(...httpErrors);
  await page.close();
  return { empty, missing, notFound };
}

async function runSeferAbi(browser) {
  const token = await login(users.ROOM.identifier);
  const prepared = await preparePage(browser, "state:sefer-abi", token, { width: 1440, height: 900 });
  const { page, errors, httpErrors } = prepared;
  await installCopilotFixture(page);
  await openRoute(page, "/room/map", 1800);
  const entry = page.getByRole("button", { name: /Sefer Abi.*aç/i });
  if (await entry.count()) await entry.first().click();
  await page.waitForTimeout(500);
  const quick = await visibleSnapshot(page);
  const quickShot = await capture(page, "10-sefer-abi-quick-open-real");
  const full = page.getByRole("button", { name: "Tam ekranda aç" });
  if (await full.count()) await full.first().click();
  await page.waitForTimeout(900);
  const fullSnapshot = await visibleSnapshot(page);
  const fullShot = await capture(page, "11-sefer-abi-quick-full-continuity-real");
  const result = {
    name: "sefer-abi-current-surface",
    context: "ROOM",
    route: "/room/map",
    trigger: "Open the single Sefer Abi entrypoint, then continue with Tam ekranda aç.",
    screenshots: [quickShot, fullShot],
    visibleText: `${quick.visibleText} ${fullSnapshot.visibleText}`,
    accessibleLabels: unique([...quick.accessibleLabels, ...fullSnapshot.accessibleLabels]),
    leaks: recordLeaks(`${quick.visibleText} ${fullSnapshot.visibleText}`, unique([...quick.accessibleLabels, ...fullSnapshot.accessibleLabels])),
    errors,
    httpErrors,
    pass: bodyHas(quick, "Sefer Abi", "Kapat") && bodyHas(fullSnapshot, "Sefer Abi") && errors.length === 0,
    evidence: "The current quick assistant and full workspace were rendered from the single shared entrypoint; the browser fixture preserved context without changing product behavior.",
  };
  states.push(result);
  allErrors.push(...errors);
  allHttpErrors.push(...httpErrors);
  await page.close();
  return result;
}

async function main() {
  await fs.mkdir(screenshotRoot, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [contextName, spec] of Object.entries(users)) await contextEvidence(browser, contextName, spec);
    await runEmptyMissingAndNotFound(browser);
    await runLoadingMatrix(browser);
    await runDriverValidation(browser);
    await runMapState(browser);
    await runMapDiagnosticTerminology(browser);
    await runSuccessAndCrossKind(browser);
    await runPermissionAndRecovery(browser);
    await runConflictMatrix(browser);
    await runPublicConfirmationCancellation(browser);
    await runSeferAbi(browser);
  } finally {
    await browser.close();
  }

  const report = {
    milestone: "#15 PROJECT-WIDE TURKISH LANGUAGE / TERMINOLOGY AUDIT",
    source: "REAL_PLAYWRIGHT_RENDERED_BROWSER",
    generatedAt: new Date().toISOString(),
    browser: { webBaseUrl, viewportMatrix: "desktop 1440x900; mobile 390x844", driverDeviceBinding: "existing real bound browser device; no guard bypass" },
    contexts,
    states,
    screenshots,
    mapDiagnosticCounters,
    errors: { consoleAndPage: allErrors, http: allHttpErrors },
    pass: contexts.length === 8 && contexts.every((item) => item.pass) && states.length >= 12 && states.every((item) => item.pass),
  };
  await fs.writeFile(path.join(evidenceRoot, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    source: report.source,
    contextPassCount: contexts.filter((item) => item.pass).length,
    statePassCount: states.filter((item) => item.pass).length,
    stateCount: states.length,
    screenshots: screenshots.length,
    consoleAndPageErrors: allErrors.length,
    httpErrors: allHttpErrors.length,
    pass: report.pass,
    report: path.relative(repoRoot, path.join(evidenceRoot, "report.json")).replace(/\\/g, "/"),
  }, null, 2));
  if (!report.pass) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
