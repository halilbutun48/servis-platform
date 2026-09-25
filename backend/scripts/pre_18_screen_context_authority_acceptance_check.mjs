#!/usr/bin/env node

/*
 * Bounded PRE-#18 acceptance for the screen-context authority corrective.
 *
 * The check deliberately consumes production policy, metadata, shared-state,
 * and backend catalog modules. It does not recreate authorization rules.
 * Vite is only used to load client ESM in Node; no browser is launched.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createServer } from "../../web/node_modules/vite/dist/node/index.js";
import * as screenCatalog from "../src/ai/jobGuide/screenCatalog.js";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "../..");
const webRoot = path.join(repoRoot, "web");
const redMode = process.argv.includes("--red");

const localValues = new Map();
globalThis.localStorage = {
  getItem(key) { return localValues.has(key) ? localValues.get(key) : null; },
  setItem(key, value) { localValues.set(key, String(value)); },
  removeItem(key) { localValues.delete(key); },
};
globalThis.window = {
  dispatchEvent() { return true; },
};

const vite = await createServer({
  root: webRoot,
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});

const roleNavigation = await vite.ssrLoadModule("/src/utils/roleNavigation.js");
const screenRegistry = await vite.ssrLoadModule("/src/copilot/screenRegistry.js");
const sharedState = await vite.ssrLoadModule("/src/utils/copilotSharedState.js");

const appSource = fs.readFileSync(path.join(webRoot, "src/App.jsx"), "utf8");
const shellSource = fs.readFileSync(path.join(webRoot, "src/layout/AppShell.jsx"), "utf8");
const floatingSource = fs.readFileSync(path.join(webRoot, "src/components/copilot/FloatingCopilotDrawer.jsx"), "utf8");
const panelSource = fs.readFileSync(path.join(webRoot, "src/panels/shared/CopilotPanel.jsx"), "utf8");
const serviceSource = fs.readFileSync(path.join(repoRoot, "backend/src/ai/service.js"), "utf8");

const ROOM = Object.freeze({ id: 701, role: "ROOM", roomId: 17, companyId: 71 });
const COMPANY = Object.freeze({ id: 702, role: "COMPANY", companyKind: "COMPANY", companyId: 72 });
const SCHOOL = Object.freeze({ id: 703, role: "COMPANY", companyKind: "SCHOOL", companyId: 73 });
const SUPER_ADMIN = Object.freeze({ id: 704, role: "SUPER_ADMIN" });

const cases = [];
function test(name, run, { expectedRed = false } = {}) {
  cases.push({ name, run, expectedRed });
}

function routeScope(user, route) {
  return roleNavigation.resolveRouteScope(user, route);
}

function routeState(scope, path) {
  return { status: scope, path };
}

function writeAllowedState(scopeKey) {
  sharedState.writeCopilotSharedState({
    scopeKey,
    routeContextStatus: "ALLOW",
    screenPath: "/room/map",
    screenLabel: "Canlı Takip",
    selection: { scopeKey, entityType: "shift", entityId: 9, label: "Vardiya 9" },
    selectedContext: { scopeKey, entityType: "shift", entityId: 9, label: "Vardiya 9" },
    messages: [{ role: "assistant", text: "Önceki ekran mesajı" }],
  });
}

// Group 1 — canonical route policy preservation.
test("route policy allows ROOM exact home and map routes", () => {
  assert.equal(routeScope(ROOM, "/room"), "ALLOW");
  assert.equal(routeScope(ROOM, "/room/map"), "ALLOW");
});
test("route policy allows ROOM live route", () => assert.equal(routeScope(ROOM, "/room/live"), "ALLOW"));
test("route policy allows ROOM cost-scenarios route", () => assert.equal(routeScope(ROOM, "/room/cost-scenarios"), "ALLOW"));
test("route policy preserves ROOM namespace allowance while App owns rendered-route unknown classification", () => assert.equal(routeScope(ROOM, "/room/not-a-screen"), "ALLOW"));
test("route policy permits SUPER_ADMIN on ROOM path", () => assert.equal(routeScope(SUPER_ADMIN, "/room/map"), "ALLOW"));
test("route policy denies COMPANY access to ROOM path", () => assert.equal(routeScope(COMPANY, "/room/map"), "DENY"));
test("route policy denies ROOM access to COMPANY path", () => assert.equal(routeScope(ROOM, "/company/shifts"), "DENY"));
test("route policy preserves applicable shared-route access", () => assert.equal(routeScope(ROOM, "/shared/notifications"), "ALLOW"));

// Group 2 — App policy and registry metadata must be separate truths.
test("registry result is metadata-only and has no authorization field", () => {
  const result = screenRegistry.resolveCopilotScreenContext("/room/live", ROOM);
  assert.equal(Object.hasOwn(result, "unauthorized"), false, "registry must not emit an authorization decision");
  assert.equal(result.requestedPath, "/room/live");
}, { expectedRed: true });
test("allowed rendered route with absent registry metadata is explicit metadata-missing without fallback", () => {
  const result = screenRegistry.resolveCopilotScreenContext("/room/live", ROOM);
  assert.equal(routeScope(ROOM, "/room/live"), "ALLOW");
  assert.equal(result.screen, null, "registry miss must not substitute the first screen");
  assert.equal(result.metadataStatus, "METADATA_MISSING");
}, { expectedRed: true });
test("App exposes its rendered route outcome to AppShell without another route-policy owner", () => {
  assert.match(appSource, /routeContextStatus/, "App must expose a rendered route-context status");
  assert.match(appSource, /<AppShell\s+path=\{path\}\s+routeContext=\{routeContext\}/, "App must pass the already determined route result to AppShell");
  assert.match(shellSource, /function AppShell\(\{\s*path,\s*routeContext,\s*children\s*\}\)/, "AppShell must receive only the propagated route context");
}, { expectedRed: true });

// Group 3 — exact App-rendered route semantics; no slash canonicalization.
test("trailing slash cannot become a positive registered /room/map context", () => {
  const result = screenRegistry.resolveCopilotScreenContext("/room/map/", ROOM);
  assert.equal(result.requestedPath, "/room/map/");
  assert.equal(result.screen, null);
  assert.equal(result.metadataStatus, "METADATA_MISSING");
}, { expectedRed: true });

// Group 4 — explicit null and deny/unknown transitions clear route-bound state.
test("explicit null clears an existing route-bound selection and screen fields", () => {
  const scopeKey = "red-explicit-null";
  writeAllowedState(scopeKey);
  const next = sharedState.writeCopilotSharedState({
    scopeKey,
    screenPath: null,
    screenLabel: null,
    selection: null,
    selectedContext: null,
  });
  assert.equal(next.screenPath, null);
  assert.equal(next.screenLabel, null);
  assert.equal(next.selection, null);
  assert.equal(next.selectedContext, null);
}, { expectedRed: true });
test("DENY atomically clears route-bound selection and handoff", () => {
  const scopeKey = "red-deny";
  writeAllowedState(scopeKey);
  const next = sharedState.writeCopilotSharedState({ scopeKey, routeContextStatus: "DENY" });
  assert.equal(next.routeContextStatus, "DENY");
  assert.equal(next.screenPath, null);
  assert.equal(next.selection, null);
  assert.equal(next.selectedContext, null);
}, { expectedRed: true });
test("UNKNOWN atomically clears route-bound selection and handoff", () => {
  const scopeKey = "red-unknown";
  writeAllowedState(scopeKey);
  const next = sharedState.writeCopilotSharedState({ scopeKey, routeContextStatus: "UNKNOWN" });
  assert.equal(next.routeContextStatus, "UNKNOWN");
  assert.equal(next.screenPath, null);
  assert.equal(next.selection, null);
  assert.equal(next.selectedContext, null);
}, { expectedRed: true });

// Group 5 — both Copilot surfaces consume the same propagated contract.
test("Floating Copilot consumes App route context rather than registry authorization", () => {
  assert.match(floatingSource, /routeContext/, "Floating Copilot must consume the propagated route context");
  assert.doesNotMatch(floatingSource, /screenContext\.unauthorized/, "Floating Copilot must not consume registry authorization");
}, { expectedRed: true });
test("full Copilot consumes the same App route context and has no inherited first-screen fallback", () => {
  assert.match(panelSource, /routeContext/, "full Copilot must consume the propagated route context");
  assert.doesNotMatch(panelSource, /screenOptionsFromMe\[0\]\s*\|\|\s*null/, "full Copilot must not select a first screen as inherited context fallback");
}, { expectedRed: true });
test("both Copilot surfaces discard a response after their route context is no longer current", () => {
  assert.match(floatingSource, /routeContextKey/, "Floating Copilot must guard responses with a route-context key");
  assert.match(panelSource, /routeContextKey/, "full Copilot must guard responses with a route-context key");
}, { expectedRed: true });

// Group 6 — client screen hints cannot change the effective backend role.
test("ROOM client hint cannot project a COMPANY static screen", () => {
  assert.equal(screenCatalog.getScreenDefinitionForUser(ROOM, { path: "/company/shifts" }), null);
}, { expectedRed: true });
test("COMPANY client hint cannot project a ROOM static screen", () => {
  assert.equal(screenCatalog.getScreenDefinitionForUser(COMPANY, { path: "/room/map" }), null);
}, { expectedRed: true });
test("spoofed company kind cannot outrank server-derived SCHOOL context", () => {
  assert.equal(typeof screenCatalog.resolveAuthorizedScreenContext, "function", "catalog must expose the authoritative hint validator");
  const result = screenCatalog.resolveAuthorizedScreenContext(SCHOOL, { path: "/organization/plans", companyKind: "ORGANIZATION" });
  assert.notEqual(result?.screen?.catalogRoleKey, "ORGANIZATION");
  assert.equal(result?.effectiveRoleKey, "SCHOOL");
}, { expectedRed: true });
test("service validates screen identity before canonical conversation state", () => {
  const validationIndex = serviceSource.indexOf("const authorizedScreenContext");
  const canonicalIndex = serviceSource.indexOf("const canonicalState = getCanonicalConversationState");
  assert.ok(validationIndex >= 0 && validationIndex < canonicalIndex, "authorized screen validation must precede canonical conversation state");
}, { expectedRed: true });

// Group 7 — permitted hints remain usable without changing the authenticated role.
test("same-role screen path and unique own screen id remain resolvable", () => {
  const byPath = screenCatalog.getScreenDefinitionForUser(ROOM, { path: "/room/map" });
  const byId = screenCatalog.getScreenDefinitionForUser(ROOM, {}, 1101);
  assert.equal(byPath?.path, "/room/map");
  assert.equal(byPath?.roleKey, "ROOM");
  assert.equal(byId?.id, 1101);
});
test("SCHOOL catalog resolution remains server-derived", () => {
  const result = screenCatalog.getScreenDefinitionForUser(SCHOOL, { path: "/school/shifts", companyKind: "ORGANIZATION" });
  assert.equal(result?.path, "/school/shifts");
  assert.equal(result?.roleKey, "SCHOOL");
}, { expectedRed: true });
test("server-permitted shared screen hint remains resolvable for ROOM", () => {
  const result = screenCatalog.getScreenDefinitionForUser(ROOM, { path: "/shared/notifications" });
  assert.equal(result?.path, "/shared/notifications");
  assert.equal(result?.roleKey, "ROOM");
});
test("SUPER_ADMIN cross-catalog metadata does not change effective authenticated role", () => {
  assert.equal(typeof screenCatalog.resolveAuthorizedScreenContext, "function", "catalog must expose the authoritative hint validator");
  const result = screenCatalog.resolveAuthorizedScreenContext(SUPER_ADMIN, { path: "/room/map" });
  assert.equal(result?.screen?.path, "/room/map");
  assert.equal(result?.effectiveRoleKey, "SUPER_ADMIN");
  assert.equal(result?.screen?.roleKey, "SUPER_ADMIN");
  assert.equal(result?.screen?.catalogRoleKey, "ROOM");
}, { expectedRed: true });

// Group 8 — unknown and invalid hints cannot manufacture a screen context.
test("unknown explicit path returns no manufactured screen context", () => {
  assert.equal(screenCatalog.getScreenDefinitionForUser(ROOM, { path: "/room/not-a-screen" }), null);
}, { expectedRed: true });
test("empty invalid screen hint returns no invented screen context", () => {
  assert.equal(screenCatalog.getScreenDefinitionForUser(ROOM, {}, 999999), null);
}, { expectedRed: true });

// Group 9 — preserved isolation primitive; this remains independent of route hints.
test("authenticated shared-state scope remains distinct across user role and tenant", () => {
  const base = sharedState.copilotAuthScopeKey("token-a", ROOM);
  assert.notEqual(base, sharedState.copilotAuthScopeKey("token-a", { ...ROOM, id: 999 }));
  assert.notEqual(base, sharedState.copilotAuthScopeKey("token-a", { ...ROOM, role: "COMPANY", companyId: 71 }));
  assert.notEqual(base, sharedState.copilotAuthScopeKey("token-a", { ...ROOM, roomId: 18 }));
});

let passCount = 0;
const failures = [];
try {
  for (const item of cases) {
    try {
      item.run();
      passCount += 1;
      console.log(`PASS ${item.name}`);
    } catch (error) {
      const failure = { name: item.name, expectedRed: item.expectedRed, message: error?.message || String(error) };
      failures.push(failure);
      console.log(`FAIL ${item.name}: ${failure.message}`);
    }
  }
} finally {
  await vite.close();
}

const expectedRedFailures = failures.filter((failure) => failure.expectedRed);
const unexpectedFailures = failures.filter((failure) => !failure.expectedRed);
if (redMode) {
  console.log("TOTAL_PLANNED_ASSERTIONS=29");
  console.log("RED_PLANNED_COUNT=17");
  console.log(`RED_ACTUAL_COUNT=${expectedRedFailures.length}`);
  console.log(`PRESERVATION_PASS_COUNT=${cases.filter((item) => !item.expectedRed).length - unexpectedFailures.length}`);
  console.log(`UNEXPECTED_FAILURE_COUNT=${unexpectedFailures.length}`);
  if (expectedRedFailures.length < 17 || unexpectedFailures.length !== 0) process.exitCode = 1;
} else {
  console.log(`GREEN_TOTAL_COUNT=${cases.length}`);
  console.log(`GREEN_PASS_COUNT=${passCount}`);
  console.log(`GREEN_FAIL_COUNT=${failures.length}`);
  if (failures.length) process.exitCode = 1;
}
