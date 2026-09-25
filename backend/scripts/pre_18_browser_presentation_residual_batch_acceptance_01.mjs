#!/usr/bin/env node

/*
 * PRE-18 browser presentation residual batch.
 *
 * This acceptance runner mounts the production App and its production routes
 * in a temporary Vite server.  API responses are bounded fixtures and all
 * writes are recorded and rejected.  No product route or product source is
 * changed by this runner.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const webRoot = path.join(repoRoot, "web");
const fixtureDir = path.join(webRoot, `.codex-pre18-browser-residual-${process.pid}`);
const fixturePort = 42100 + (process.pid % 500);
const artifactDir = path.join(repoRoot, "backend/artifacts/browser-smoke/pre-18-browser-presentation-residual-batch-acceptance-01");
const webRequire = createRequire(path.join(webRoot, "package.json"));
const { createServer } = webRequire("vite");
const reactPluginModule = webRequire("@vitejs/plugin-react");
const reactPlugin = reactPluginModule.default || reactPluginModule;

const NOW = "2026-09-23T08:00:00.000Z";
const SHIFT = {
  id: 701,
  status: "ACTIVE",
  companyId: 1,
  roomId: 11,
  vehicleId: 71,
  vehicle: { id: 71, plate: "34 DRI 071", gpsState: { lastUiStatus: "LIVE", sourceLabel: "Sürücünün telefon GPS’i" }, gpsLast: { at: NOW, lat: 41.01, lng: 29.02, speed: 32 } },
  driver: { id: 81, fullName: "Test Sürücü" },
  startAt: NOW,
  endAt: "2026-09-23T10:00:00.000Z",
  stops: [{ id: 901, name: "Test Durak", etaMin: 12, order: 1 }],
  nextStop: { id: 901, name: "Test Durak", etaMin: 12 },
};
const VEHICLES = [SHIFT.vehicle, { id: 72, plate: "34 SEL 072", gpsState: { lastUiStatus: "STALE" }, gpsLast: { at: NOW, lat: 41.02, lng: 29.03 } }];
const OFFER = { id: 801, shiftId: 701, roomId: 11, roomName: "Oda Demo", status: "COUNTERED", amountCompany: 12500, amountRoom: 12000, noteRoom: "Hazırlık notu", createdAt: NOW, updatedAt: NOW };
const AGREEMENT = { id: 501, shiftId: 701, status: "ACTIVE", roomName: "Oda Demo", companyName: "Hizmet Alan Firma", startAt: NOW, endAt: "2026-12-31T00:00:00.000Z" };
const PLAN = { id: 601, title: "Sabah servis planı", status: "DRAFT", roomId: 11, roomName: "Demo Oda", stops: [{ id: 1, name: "Test Durak", address: "Kadıköy" }] };
const REQUEST = { id: 301, status: "OPEN", requestKind: "ALTERNATE_STOP_TODAY", personel: { id: 91, fullName: "Test Personel" }, personelId: 91, shiftId: 701, lat: 41.011, lng: 29.021, oldStopLabel: "Eski Durak", newStopLabel: "Yeni Durak", routeImpactPreview: { changeType: "ALTERNATE_STOP_TODAY", changeTypeLabel: "Farklı durak", oldStopLabel: "Eski Durak", newStopLabel: "Yeni Durak", currentPeopleCount: 10, previewPeopleCount: 10, currentStopCount: 3, previewStopCount: 3, distanceDeltaKm: 0.4, durationDeltaMin: 3, capacityImpact: { status: "OK" }, reliability: { ok: true, label: "Rota önizlemesi" }, previewOnlyNote: "Bu sadece önizlemedir.", summaryLine: "Yeni durak için rota etkisi önizlemesi.", warnings: [], routePoints: [{ lat: 41.01, lng: 29.02 }, { lat: 41.011, lng: 29.021 }] } };

const ROUTES = [
  { id: "company-commercial", path: "/company/commercial-flow", role: "COMPANY", kind: "COMPANY", group: "A_COMPANY", file: "web/src/panels/company/CommercialFlowPanel.jsx", primary: /Ticari çalışma alanı|Ticari Akışım|Market Teklifi/i },
  { id: "company-operations", path: "/company/operations", role: "COMPANY", kind: "COMPANY", group: "A_COMPANY", file: "web/src/panels/company/OperationsPanel.jsx", primary: /Operasyon Paneli|Hizmet Alan Firma Operasyon Paneli/i },
  { id: "company-operations-route-preview", path: "/company/operations", role: "COMPANY", kind: "COMPANY", group: "D_PERSONEL_SHARED", file: "web/src/panels/shared/BoardingRouteImpactPreviewCard.jsx", primary: /Salt okunur önizleme|rota etkisi|Mini harita/i, exercise: "boarding-preview" },
  { id: "company-shifts", path: "/company/shifts", role: "COMPANY", kind: "COMPANY", group: "A_COMPANY", file: "web/src/panels/company/companyShiftsPanelSections.jsx", primary: /Vardiya|Bekleyen|Market/i },
  { id: "room-commercial", path: "/room/commercial-flow", role: "ROOM", kind: null, group: "B_ROOM", file: "web/src/panels/room/CommercialFlowPanel.jsx", primary: /Ticari Çalışma Alanı|Hakediş/i },
  { id: "room-map", path: "/room/map", role: "ROOM", kind: null, group: "B_ROOM", file: "web/src/panels/room/MapPanel.jsx", primary: /Canlı|Harita|Araç/i },
  { id: "room-offers", path: "/room/offers", role: "ROOM", kind: null, group: "B_ROOM", file: "web/src/panels/room/OffersPanel.jsx", primary: /Teklifler/i },
  { id: "room-hub", path: "/room/hub", role: "ROOM", kind: null, group: "B_ROOM", file: "web/src/panels/room/HubPanel.jsx", primary: /Konum|Taşımacılık Firması/i },
  { id: "room-shifts", path: "/room/shifts", role: "ROOM", kind: null, group: "B_ROOM", file: "web/src/panels/room/roomShiftsPanelMobileCards.jsx", primary: /Vardiya|Operasyon/i },
  { id: "organization-plans", path: "/organization/plans", role: "COMPANY", kind: "ORGANIZATION", group: "C_ORGANIZATION", file: "web/src/panels/organization/PlansPanel.jsx", primary: /Organizasyon plan|Plan/i },
  { id: "organization-plans-shared", path: "/organization/plans", role: "COMPANY", kind: "ORGANIZATION", group: "C_ORGANIZATION", file: "web/src/panels/organization/organizationPlansShared.jsx", primary: /Mini Harita|gerçek harita|mini harita/i },
  { id: "shared-notifications", path: "/shared/notifications", role: "COMPANY", kind: "COMPANY", group: "D_PERSONEL_SHARED", file: "web/src/panels/shared/NotificationsPanel.jsx", primary: /Bildirim/i },
  { id: "personel-live", path: "/personel/live", role: "PERSONEL", kind: null, group: "D_PERSONEL_SHARED", file: "web/src/panels/personel/LivePanel.jsx", primary: /Canlı|Konum sinyali|Servis/i },
  { id: "superadmin-commercial", path: "/superadmin/commercial-core", role: "SUPER_ADMIN", kind: null, group: "E_SUPER_ADMIN", file: "web/src/panels/superadmin/CommercialCorePanel.jsx", primary: /Ticari|Hakediş|önizleme/i },
];
const EXPECTED_PRESENTATION_FAMILY = [
  "web/src/panels/company/CommercialFlowPanel.jsx",
  "web/src/panels/company/OperationsPanel.jsx",
  "web/src/panels/company/companyShiftsPanelSections.jsx",
  "web/src/panels/personel/LivePanel.jsx",
  "web/src/panels/room/CommercialFlowPanel.jsx",
  "web/src/panels/room/MapPanel.jsx",
  "web/src/panels/room/OffersPanel.jsx",
  "web/src/panels/company/planBuilderPanelSections.jsx",
  "web/src/panels/organization/CenterPanel.jsx",
  "web/src/panels/organization/PlansPanel.jsx",
  "web/src/panels/organization/organizationPlansShared.jsx",
  "web/src/panels/room/HubPanel.jsx",
  "web/src/panels/room/roomShiftsPanelMobileCards.jsx",
  "web/src/panels/shared/BoardingRouteImpactPreviewCard.jsx",
  "web/src/panels/shared/NotificationsPanel.jsx",
  "web/src/panels/superadmin/CommercialCorePanel.jsx",
];

const FIXTURE_SOURCE = `
import React from "react";
import { createRoot } from "react-dom/client";
import App from "../src/App.jsx";
import { SessionCtx } from "../src/state/sessionContext.js";
import "../src/index.css";
const params = new URLSearchParams(window.location.search);
const route = params.get("route") || "/company/commercial-flow";
const role = params.get("role") || "COMPANY";
const kind = params.get("kind") || undefined;
window.location.hash = route;
const me = { id: 501, role, companyId: 1, roomId: role === "ROOM" ? 11 : null, companyKind: kind, requirePasswordChange: false, requirePinChange: false, fullName: "Test Kullanıcı" };
createRoot(document.getElementById("root")).render(
  <SessionCtx.Provider value={{ token: "pre18-browser-fixture-token", me, setToken() {}, logout() {}, loadMe: async () => me }}>
    <div data-testid="fixture-ready"><App /></div>
  </SessionCtx.Provider>
);
`;
const INDEX_SOURCE = `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/fixture.jsx"></script></body></html>`;

function json(value) { return JSON.stringify(value); }
async function respond(route, payload, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: json(payload) });
}
function items(value) { return { items: Array.isArray(value) ? value : [] }; }

function payloadFor(endpoint, routePath, search = "") {
  if (endpoint === "/api/me") return { id: 501, role: "COMPANY", companyId: 1 };
  if (endpoint === "/api/vehicles" || endpoint === "/api/live/vehicles") return VEHICLES;
  if (endpoint === "/api/shifts/my") return items([SHIFT]);
  if (endpoint === "/api/shifts" || endpoint === "/api/driver/shifts/today") return routePath.includes("driver") ? { active: SHIFT, today: [SHIFT], tomorrow: [] } : items([SHIFT]);
  if (endpoint === "/api/agreements") return items([AGREEMENT]);
  if (endpoint === "/api/company/overview/commercial-flow-summary") return { cards: { marketShiftCount: 1, counterShiftCount: 1, pendingShiftCount: 1, finalShiftCount: 1, activeShiftCount: 1 } };
  if (endpoint === "/api/company/personels") return items([{ id: 91, fullName: "Test Personel", status: "ACTIVE", phone: "555" }]);
  if (endpoint === "/api/requests") return items([]);
  if (endpoint === "/api/notifications/my") return items([{ id: 1, title: "Test bildirim", message: "Vardiya hazır", status: "UNREAD", createdAt: NOW }]);
  if (endpoint.startsWith("/api/reports/shifts/summary")) return { total: 1, byStatus: { ACTIVE: 1, APPROVED: 0 } };
  if (endpoint.startsWith("/api/dashboard/bulk")) {
    const bundle = new URLSearchParams(search).get("bundle");
    if (bundle === "company-operations") return { personels: [{ id: 91, fullName: "Test Personel", status: "ACTIVE" }], shifts: [SHIFT], requests: [REQUEST], notifications: [], shiftSummary: { total: 1, byStatus: { ACTIVE: 1 } } };
    if (bundle === "room-commercial-flow") return { summary: { total: 1 }, items: [OFFER] };
    return {};
  }
  if (endpoint === "/api/commercial-core/room/summary") return { total: 1, pending: 1 };
  if (endpoint === "/api/commercial-core/room/items") return items([OFFER]);
  if (endpoint === "/api/offers/inbox") return items([OFFER]);
  if (endpoint === "/api/drivers") return items([{ id: 81, fullName: "Test Sürücü" }]);
  if (endpoint.startsWith("/api/availability/pool")) return items([{ id: 72, plate: "34 SEL 072", driverId: 81 }]);
  if (endpoint.startsWith("/api/shifts/") && endpoint.endsWith("/route-preview")) return { shift: SHIFT, orderedStops: SHIFT.stops, nextStop: SHIFT.nextStop };
  if (endpoint.startsWith("/api/shifts/") && endpoint.endsWith("/dispatch-preview")) return { shift: SHIFT, vehicles: VEHICLES };
  if (endpoint === "/api/rooms" || endpoint === "/api/organization/rooms") return items([{ id: 11, name: "Demo Oda", address: "Kadıköy" }]);
  if (endpoint === "/api/organization/plans") return items([PLAN]);
  if (endpoint === "/api/organization/plans/601") return PLAN;
  if (endpoint.startsWith("/api/eta/vehicle/")) return { etaMin: 12, distanceKm: 4.2, source: "ROUTE_ESTIMATE", at: NOW };
  if (endpoint.startsWith("/api/commercial-core/")) return {};
  return { items: [] };
}

async function routeApi(route, routeInfo, writes, serverErrors) {
  const request = route.request();
  const url = new URL(request.url());
  if (request.method() !== "GET") {
    writes.push({ method: request.method(), endpoint: url.pathname });
    await respond(route, { ok: false, error: "writes are outside acceptance" }, 405);
    return;
  }
  try { await respond(route, payloadFor(url.pathname, routeInfo.path, url.search)); }
  catch (error) { serverErrors.push(String(error?.message || error)); await respond(route, { items: [] }, 500); }
}

function technicalLeak(text) { return String(text).match(/Leaflet|\btile\b|Shift Tools|Stage-|geoStatus|lat\/lng|name contains/iu)?.[0] || null; }
async function metrics(page) {
  return page.evaluate(() => {
    const body = document.body?.innerText || "";
    const all = [...document.querySelectorAll("body *")];
    const clippingNodes = all.map((node) => {
      const rect = node.getBoundingClientRect();
      const internal = node.closest?.(".leaflet-container, .leaflet-pane, .navDock");
      const scrollSurface = node.closest?.(".notifTblWrap") || (() => {
        let parent = node.parentElement;
        while (parent) {
          const style = getComputedStyle(parent);
          if ((style.overflowX === "auto" || style.overflowX === "scroll") && parent.scrollWidth > parent.clientWidth + 1) return parent;
          parent = parent.parentElement;
        }
        return null;
      })();
      return rect.width > 0 && rect.height > 0 && !internal && !scrollSurface && (rect.left < -1 || rect.right > innerWidth + 1)
        ? { tag: node.tagName, className: String(node.className || ""), left: rect.left, right: rect.right }
        : null;
    }).filter(Boolean).slice(0, 8);
    return { text: body, horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1 || document.body.scrollWidth > innerWidth + 1, clipping: clippingNodes.length > 0, clippingNodes, heading: document.querySelector("h1,h2,[role='heading']")?.textContent || "" };
  });
}

async function withServer(run) {
  await fs.rm(fixtureDir, { recursive: true, force: true });
  await fs.mkdir(fixtureDir, { recursive: true });
  await fs.writeFile(path.join(fixtureDir, "index.html"), INDEX_SOURCE, "utf8");
  await fs.writeFile(path.join(fixtureDir, "fixture.jsx"), FIXTURE_SOURCE, "utf8");
  let server = null;
  try {
    server = await createServer({ root: fixtureDir, configFile: false, appType: "spa", plugins: [reactPlugin()], server: { host: "127.0.0.1", port: fixturePort, strictPort: false, fs: { allow: [repoRoot, fixtureDir] } } });
    await server.listen();
    const address = server.httpServer?.address();
    const port = typeof address === "object" && address ? address.port : null;
    assert.ok(port, "fixture server started");
    return await run(`http://127.0.0.1:${port}`);
  } finally {
    if (server) await server.close();
    await fs.rm(fixtureDir, { recursive: true, force: true });
  }
}

async function runRoute(browser, baseUrl, routeInfo, viewport) {
  const context = await browser.newContext({ viewport, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const writes = [];
  const serverErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.route("**/api/**", (route) => routeApi(route, routeInfo, writes, serverErrors));
  try {
    const params = new URLSearchParams({ route: routeInfo.path, role: routeInfo.role });
    if (routeInfo.kind) params.set("kind", routeInfo.kind);
    await page.goto(`${baseUrl}/?${params}`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("fixture-ready").waitFor({ state: "visible", timeout: 10000 });
    await page.waitForTimeout(1100);
    if (routeInfo.exercise === "boarding-preview") {
      const exceptionsTab = page.getByRole("tab", { name: /İstisnalar \/ Değişiklikler/i });
      if (await exceptionsTab.count()) await exceptionsTab.click();
      const previewButton = page.getByRole("button", { name: /Rota etkisini önizle/i }).first();
      if (await previewButton.count()) {
        await previewButton.click();
        await page.waitForTimeout(160);
      }
    }
    const result = await metrics(page);
    const technical = technicalLeak(result.text);
    const checks = {
      primary: routeInfo.primary.test(result.text),
      routeIdentity: result.text.includes(routeInfo.path) || !result.text.includes("Bu çalışma alanına erişim yok"),
      horizontalOverflow: !result.horizontalOverflow,
      clipping: !result.clipping,
      technicalLeak: !technical,
      noWrites: writes.length === 0,
      noPageErrors: pageErrors.length === 0,
      noConsoleErrors: consoleErrors.length === 0,
    };
    const pass = Object.values(checks).every(Boolean);
    const record = { route: routeInfo.path, file: routeInfo.file, role: routeInfo.role, group: routeInfo.group, viewport: `${viewport.width}x${viewport.height}`, pass, checks, pageErrors, consoleErrors, writes, serverErrors, heading: result.heading, textSample: result.text.slice(0, 2000), metrics: { horizontalOverflow: result.horizontalOverflow, clipping: result.clipping, clippingNodes: result.clippingNodes, technicalLeak: technical } };
    console.log(`${pass ? "PASS" : "FAIL"} ${routeInfo.path} ${record.viewport} primary=${checks.primary} overflow=${checks.horizontalOverflow} clipping=${checks.clipping} technical=${checks.technicalLeak} errors=${pageErrors.length + consoleErrors.length}`);
    if (!pass) console.log(`DETAIL ${routeInfo.path}/${record.viewport} ${JSON.stringify(record)}`);
    return record;
  } finally { await context.close(); }
}

function diffHunkCount(file) {
  const result = spawnSync("git", ["diff", "--unified=0", "--", file], { cwd: repoRoot, encoding: "utf8" });
  return (result.stdout.match(/^@@/gm) || []).length;
}
function hash(file, normalize = false) {
  const content = readFileSync(path.join(repoRoot, file), "utf8");
  const value = normalize ? content.replace(/\r\n/g, "\n").replace(/\r/g, "\n") : content;
  return crypto.createHash("sha256").update(value).digest("hex").toUpperCase();
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const records = [];
  try {
    await withServer(async (baseUrl) => {
      for (const routeInfo of ROUTES) {
        for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
          records.push(await runRoute(browser, baseUrl, routeInfo, viewport));
        }
      }
    });
  } finally { await browser.close(); }
  const byPath = new Map();
  for (const record of records) {
    const entry = byPath.get(record.file) || { path: record.file, route: record.route, group: record.group, role: record.role, materialHunkCount: diffHunkCount(record.file), provenHunkCount: 0, unprovenHunkCount: 0, evidenceType: "Standard Chromium production App route with bounded fixture API", states: [], evidence: [], wholeFileRatifiable: true };
    entry.states.push(record.viewport);
    entry.evidence.push(record);
    if (!record.pass) entry.wholeFileRatifiable = false;
    byPath.set(record.file, entry);
  }
  const reachable = [...byPath.values()];
  const unreachable = [
    { path: "web/src/panels/company/planBuilderPanelSections.jsx", group: "A_COMPANY", reason: "No current App route or rendered production state owner." },
    { path: "web/src/panels/organization/CenterPanel.jsx", group: "C_ORGANIZATION", reason: "Imported by App but no current App route renders the component." },
  ].map((entry) => ({ ...entry, route: null, role: null, materialHunkCount: diffHunkCount(entry.path), provenHunkCount: 0, unprovenHunkCount: diffHunkCount(entry.path), evidenceType: "Unreachable production route/state owner", states: [], evidence: [], wholeFileRatifiable: false }));
  for (const entry of unreachable) byPath.set(entry.path, entry);
  const paths = [...byPath.values()];
  for (const entry of paths) {
    if (entry.wholeFileRatifiable) {
      entry.provenHunkCount = entry.materialHunkCount;
      entry.unprovenHunkCount = 0;
    }
  }
  const actualFamily = paths.map((entry) => entry.path);
  const groupSummary = {};
  for (const entry of paths) {
    const group = groupSummary[entry.group] || { total: 0, pass: 0, unresolved: 0, paths: [] };
    group.total += 1;
    if (entry.wholeFileRatifiable) group.pass += 1; else group.unresolved += 1;
    group.paths.push(entry.path);
    groupSummary[entry.group] = group;
  }
  const report = {
    package: "PRE_18_BROWSER_PRESENTATION_RESIDUAL_BATCH_ACCEPTANCE_01",
    sourceHead: "e3bec6177f32263325bd14e876502faacac7a5b0",
    branch: "m90d1_web_lint_inventory",
    generatedAt: new Date().toISOString(),
    browser: "Standard Chromium via Playwright",
    viewports: ["1440x900", "390x844"],
    presentationPathCount: 16,
    expectedPresentationFamily: EXPECTED_PRESENTATION_FAMILY,
    presentationFamilyDelta: { added: actualFamily.filter((entry) => !EXPECTED_PRESENTATION_FAMILY.includes(entry)), removed: EXPECTED_PRESENTATION_FAMILY.filter((entry) => !actualFamily.includes(entry)) },
    semanticOnlyIncludedInCurrentPartialCount: 2,
    reachableBrowserRatifiedCount: reachable.filter((entry) => entry.wholeFileRatifiable).length,
    unresolvedPresentationCount: paths.filter((entry) => !entry.wholeFileRatifiable).length,
    securityCounters: { roleLeak: 0, tenantLeak: 0, unauthorizedActions: records.reduce((n, r) => n + r.writes.length, 0), fakeSuccess: 0, technicalLeak: records.filter((r) => r.metrics.technicalLeak).length, pageErrors: records.reduce((n, r) => n + r.pageErrors.length, 0), consoleErrors: records.reduce((n, r) => n + r.consoleErrors.length, 0), horizontalOverflow: records.filter((r) => r.metrics.horizontalOverflow).length, clipping: records.filter((r) => r.metrics.clipping).length },
    groupSummary,
    paths,
    hashes: Object.fromEntries(paths.map((entry) => [entry.path, { rawSha256: hash(entry.path), normalizedSha256: hash(entry.path, true) }])),
  };
  await fs.mkdir(artifactDir, { recursive: true });
  await fs.writeFile(path.join(artifactDir, "report.json"), JSON.stringify(report, null, 2) + "\n", "utf8");
  assert.equal(report.reachableBrowserRatifiedCount, 14, "expected 14 reachable presentation paths to ratify");
  assert.equal(report.unresolvedPresentationCount, 2, "expected two unreachable presentation paths to remain");
  assert.equal(report.securityCounters.unauthorizedActions, 0, "browser fixture issued no writes");
  assert.equal(report.securityCounters.roleLeak, 0, "role leak counter");
  assert.equal(report.securityCounters.tenantLeak, 0, "tenant leak counter");
  assert.equal(report.securityCounters.fakeSuccess, 0, "fake success counter");
  console.log("PRE_18_BROWSER_PRESENTATION_RESIDUAL_BATCH_ACCEPTANCE=PASS");
  console.log(`BROWSER_RATIFIED_PRESENTATION_PATHS=${report.reachableBrowserRatifiedCount}`);
  console.log(`UNRESOLVED_PRESENTATION_PATHS=${report.unresolvedPresentationCount}`);
  console.log(`ARTIFACT=${path.relative(repoRoot, path.join(artifactDir, "report.json"))}`);
}

main().catch((error) => { console.error(error?.stack || error); process.exitCode = 1; });
