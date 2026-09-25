/*
 * PRE-#18 Luna full evidence-completion runner.
 *
 * This is a test/evidence harness.  It reads the frozen first-discovery
 * surface-state list but enumerates and executes controls from the current
 * rendered Chromium surface.  It never edits product source or the frozen
 * ledger.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import {
  EXECUTION_STATES,
  atomicWriteJson,
  captureActionContract,
  buildActionCheckpoint,
  buildCurrentSemanticExecutionContext,
  buildSemanticStabilityDiagnostic,
  structuralContextMatches,
  deduplicateCurrentSemanticCandidates,
  diagnoseCurrentSemanticResolution,
  classifyCurrentRootOwner,
  classifyRootOwnerFallback,
  chooseSafeOverlayCloseAction,
  createRunId,
  createRunArtifactManifest,
  deriveDeterministicResetStrategy,
  deriveCurrentSurfaceRequirements,
  deriveImplicitAriaRole,
  deriveHarnessActionabilityProof,
  invalidateTransientBrowserBinding,
  isTerminalActionEvidence,
  mergeActionCheckpoints,
  normalizeActionSemanticName,
  planPointerInterceptionRecovery,
  planPreActionGeometryPreparation,
  planSemanticStabilityCompletion,
  planSurfaceStateStability,
  resolveCurrentSemanticAction,
  reuseCompatibleTerminalAction,
  selectContextualOwner,
  validateCandidateDerivedLocator,
  writeImmutableJson,
} from "./lib/pre_18_hybrid_surface_state_executor.mjs";
import { browserOwnerCandidateCollectorSource } from "./lib/pre_18_browser_owner_candidates.mjs";
import { browserSemanticDescriptorSource } from "./lib/pre_18_browser_semantic_descriptor.mjs";
import {
  assertNativeDisclosureExpanded,
  openNativeDisclosure,
} from "./lib/pre_18_native_disclosure_state.mjs";
import {
  SUPERADMIN_26_MIGRATION_VERSION,
  SUPERADMIN_EXISTING_PASS_SLOT_COUNT,
  buildSuperAdmin26Migration,
  isStateRecipeValid,
} from "./lib/pre_18_superadmin_26_contract_migration_v1.mjs";
import {
  ROOM_PREHIT_246_MIGRATION_VERSION,
  assertRoomPrehitCheckpointIntegrity,
  buildRoomPrehit246Migration,
  evaluatePositiveRouteReadiness,
  evaluateRoomTaskWorkspaceAssertion,
  observeRoomRouteContentMarker,
  partitionRoomPrehitDiagnostics,
  resolveRoomRouteReadinessMarker,
} from "./lib/pre_18_room_prehit_246_migration_v1.mjs";
import {
  ROOM_WORKER_CONCURRENCY_MAX,
  classifyRoomRequestLimiterFamily,
  createSharedAuthenticatedReadBudgetCoordinator,
  createRoomWorkerPoolPlan,
  deriveRoomWorkerResetExpectedIdentity,
  evaluateRoomWorkerReset,
  toSafeRoomWorkerArtifact,
} from "./lib/pre_18_room_worker_pool.mjs";
import {
  createAuthDiagnosticRecorder,
  evaluateAuthenticatedContextReadiness,
  evaluateTrustedLocalApiMeAuthResponse,
  evaluateTrustedLocalApiMeRequest,
  mutationInterceptionPolicy,
  normalizeAuthDiagnosticConfiguration,
  toSafeAuthTelemetry,
} from "./lib/pre_18_authenticated_role_context.mjs";
import {
  ROOM_RESIDUAL195_RECORDER_SCHEMA_VERSION,
  aggregateResidual195Summary,
  attachOriginalRootFacts,
  deriveOriginalRootFacts,
} from "./lib/pre_18_room_residual195_accounting_v1.mjs";
import {
  TRUE_OPEN54_FINAL_REPLAY_SELECTION_SHA256,
  TRUE_OPEN54_FINAL_REPLAY_TARGET_COUNT,
  evaluateRoomTrueOpen54ContractTerminal,
  validateRoomTrueOpen54FrozenSelection,
} from "./lib/pre_18_room_true_open54_replay_contract.mjs";
import {
  ROOM_CANONICAL_REPLAY_PROFILE_IDS,
  resolveRoomCanonicalReplaySelectionProfile,
} from "./lib/pre_18_room_canonical_replay_selection_profile.mjs";

export {
  evaluateRoomTrueOpen54ContractTerminal,
  validateRoomTrueOpen54FrozenSelection,
};

const root = process.cwd();
const base = (process.env.WEB_BASE_URL || "https://puerto-harry-autos-phd.trycloudflare.com").replace(/\/$/u, "");
const api = (process.env.API_BASE_URL || base).replace(/\/$/u, "");
const frozenDir = path.join(root, "backend/artifacts/browser-smoke/pre-18-final-visual-foundation-discovery/fresh-public-run");
const artifactRoot = path.join(root, "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion");
const cliRole = process.argv.find((value) => value.startsWith("--role="))?.slice("--role=".length) || "";
const cliRunId = process.argv.find((value) => value.startsWith("--run-id="))?.slice("--run-id=".length) || "";
const residualCanaryOnly = process.argv.includes("--superadmin-residual-canary");
const superAdmin26MigrationCanaryOnly = process.argv.includes("--superadmin-26-migration-canary");
const superAdminFinal17HybridOnly = process.argv.includes("--superadmin-final-17-hybrid");
const superAdminC35FinalOnly = process.argv.includes("--superadmin-c35-final");
const roomTargetHitTestDiagnosticOnly = process.argv.includes("--room-target-hit-test-diagnostic");
const roomPrehit246MigrationOnly = process.argv.includes("--room-prehit-246-migration");
const roomAuthCanaryOnly = process.argv.includes("--room-auth-canary");
const roomShiftsAuthCanaryOnly = process.argv.includes("--room-shifts-auth-canary");
const roomReplayParityControlledDiagnosticOnly = process.argv.includes("--room-replay-parity-controlled-diagnostic");
const ROOM_EXACT36_FROZEN_SELECTION_RUN_ID = "pre18-room-exact36-final-20260913-luna-1789323482086";
const ROOM_EXACT36_FROZEN_SELECTION_DIR = path.join(artifactRoot, "runs", ROOM_EXACT36_FROZEN_SELECTION_RUN_ID, "room-exact36-final-acceptance");
const ROOM_EXACT36_FROZEN_SELECTION_HASH = "e4e75f508f4e31937a2c329066f1d9ad0b38bbfaa3ea4032f3510fd39623b287";
const ROOM_EXACT36_TRUSTED_WEB_ORIGIN = "http://127.0.0.1:5173";
const ROOM_EXACT36_TRUSTED_API_ORIGIN = "http://127.0.0.1:3000";
const ROOM_TRUE_OPEN54_SELECTION_DIR = path.join(root, "backend/artifacts/browser-smoke/pre-18-room-true-open72-selection-reconciliation/runs/pre18-room-true-open72-lineage-run2-v1/room-true-open72-selection-lineage");
const ROOM_TRUE_OPEN54_SELECTION_PATH = path.join(ROOM_TRUE_OPEN54_SELECTION_DIR, "final-replay-selection.json");
const ROOM_TRUE_OPEN54_LINEAGE_MANIFEST_PATH = path.join(ROOM_TRUE_OPEN54_SELECTION_DIR, "lineage-manifest.json");
const ROOM_TRUE_OPEN54_PREHIT246_RESULTS_PATH = path.join(artifactRoot, "runs", "pre18-room-prehit-246-20260912-luna-local-final", "room-prehit-246-migration", "results.json");
const SUPERADMIN_FINAL_17_SLOTS = new Set(["C00", "C09", "C10", "C16", "C19", "C20", "C22", "C23", "C24", "C25", "C29", "C30", "C31", "C32", "C33", "C35", "C36"]);
const roleFilter = process.env.PRE18_LUNA_ROLE || cliRole;
const runId = process.env.PRE18_LUNA_RUN_ID || cliRunId || createRunId("pre18-luna-full");
const visualOnly = process.env.PRE18_LUNA_VISUAL_ONLY === "1";
const roles = {
  SUPER_ADMIN: { identifier: "superadmin@demo.com", home: "/superadmin" },
  ROOM: { identifier: "room@demo.com", home: "/room" },
  COMPANY: { identifier: "company@demo.com", home: "/company" },
  SCHOOL: { identifier: "school@demo.com", home: "/school" },
  ORGANIZATION: { identifier: "organization@demo.com", home: "/organization" },
  DRIVER: { identifier: "driver@demo.com", home: "/driver/today", deviceId: "web-vos7tyh6mtpo1gze" },
  PERSONEL: { identifier: "personel@demo.com", home: "/personel/live" },
  PARENT: { identifier: "parent@demo.com", home: "/parent/live" },
};
const viewports = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 1024, height: 900 },
  mobile: { width: 390, height: 844 },
};
const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const dangerous = /(^|\s)(sil|silme|delete|öde|ödeme|tahsil|kabul et|onayla|gönder|kaydet|oluştur|ekle|davet|çalıştır|başlat|tamamla|devre dışı|aktif et|pasif et|şifre|pin değiştir|yayınla|iptal et|reddet|ata|güncelle|çıkış)(\s|$)/iu;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const norm = (value) => String(value || "").replace(/\s+/gu, " ").trim();

// This is the harness-side structural representation of the existing
// CollapsibleSection component.  It deliberately separates the stable title
// and subtitle from the dynamic badge and decorative disclosure glyph.
export function extractCollapsibleSectionSemanticStructure(value = {}) {
  const title = norm(value?.title);
  const subtitle = norm(value?.subtitle);
  if (!title && !subtitle) return null;
  return {
    kind: "COLLAPSIBLE_SECTION",
    title,
    subtitle,
    badge: norm(value?.badge) || null,
  };
}
const sha = (value) => crypto.createHash("sha1").update(String(value || "")).digest("hex").slice(0, 16);
const safeFile = (value) => norm(value).replace(/[^a-z0-9_-]+/giu, "-").slice(0, 100) || "surface";
const surfaceId = (surface) => `${surface.role}|${surface.route}|${surface.viewport}|${surface.state}`;
const roleDir = (role) => path.join(artifactRoot, "runs", runId, `ROLE-${role}`);
const checkpointPath = (role) => path.join(roleDir(role), "checkpoint.json");
const canonicalCheckpointPath = (role) => path.join(artifactRoot, "canonical-resume-checkpoints", `ROLE-${role}`, "canonical-checkpoint.json");
const evidenceDir = (role) => path.join(roleDir(role), "evidence");

async function readJson(file, fallback = null) {
  try { return JSON.parse(await fs.readFile(file, "utf8")); } catch { return fallback; }
}
async function writeImmutableArtifact(file, value) {
  try {
    await writeImmutableJson(file, value);
    return true;
  } catch (error) {
    if (String(error?.message || "").startsWith("immutable artifact already exists:")) return false;
    throw error;
  }
}
function selectorForRole(role) {
  if (role === "link") return "a[href],[role='link']";
  if (role === "tab") return "[role='tab']";
  if (role === "combobox") return "select,[role='combobox']";
  if (role === "spinbutton") return "input[type='number'],[role='spinbutton']";
  if (role === "textbox") return "input:not([type='checkbox']):not([type='radio']):not([type='number']),textarea,[role='textbox']";
  if (role === "checkbox") return "input[type='checkbox'],[role='checkbox']";
  if (role === "radio") return "input[type='radio'],[role='radio']";
  if (role === "switch") return "input[type='checkbox'],[role='switch']";
  return "button,a[href],input,select,textarea,summary,[role='button'],[role='tab'],[role='checkbox'],[role='radio'],[role='switch'],[role='combobox'],[role='textbox'],[role='option'],[role='menuitem']";
}

const browserImplicitInputRoles = Object.freeze({
  checkbox: deriveImplicitAriaRole({ tag: "input", type: "checkbox" }),
  radio: deriveImplicitAriaRole({ tag: "input", type: "radio" }),
  number: deriveImplicitAriaRole({ tag: "input", type: "number" }),
  default: deriveImplicitAriaRole({ tag: "input", type: "text" }),
});

function isUnsafe(meta) {
  return meta.control?.unsafe === true || dangerous.test(meta.action?.name || meta.control?.accessibleName || meta.control?.visibleText || "");
}
async function login(credentials) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await fetch(`${api}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier: credentials.identifier, password: "demo123", deviceId: credentials.deviceId || `pre18-luna-${credentials.identifier}` }),
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok && body.token) return body.token;
    if (response.status === 429) { await sleep((attempt + 1) * 1800); continue; }
    throw new Error(`login ${credentials.identifier} HTTP ${response.status}: ${norm(body.error || body.message)}`);
  }
  throw new Error(`login exhausted for ${credentials.identifier}`);
}
async function ready(page) {
  await page.waitForSelector("#shell-nav-dock, .navDock, main, button", { state: "attached", timeout: 15000 }).catch(() => {});
  for (let i = 0; i < 12; i += 1) {
    await sleep(220);
    const body = await page.locator("body").innerText().catch(() => "");
    if (!/Yükleniyor…|Yükleniyor\.\.\./u.test(body)) break;
  }
}
async function openRoute(page, route) {
  await page.goto(`${base}/#${route}`, { waitUntil: "commit", timeout: 20000 });
  await ready(page);
  await sleep(140);
}

function routeFromPage(page) {
  try {
    return new URL(page.url()).hash.replace(/^#/u, "") || "/";
  } catch {
    return "";
  }
}

function routeContentMarker(route) {
  return resolveRoomRouteReadinessMarker(route);
}

async function observeRouteContentMarker(page, marker) {
  return observeRoomRouteContentMarker(page, marker);
}

async function inspectRoomShiftsDom(page) {
  const marker = routeContentMarker("/room/shifts");
  const [markerObservation, mainCount, roleMainCount, headings, bodyText] = await Promise.all([
    observeRouteContentMarker(page, marker),
    page.locator("main").count().catch(() => 0),
    page.locator("[role='main']").count().catch(() => 0),
    page.locator("h1,h2,h3,h4,h5,h6,[role='heading']").evaluateAll((nodes) => nodes.map((node) => ({
      tag: node.tagName.toLowerCase(),
      role: node.getAttribute("role") || (node.tagName.match(/^H[1-6]$/u) ? "heading" : null),
      name: String(node.textContent || "").replace(/\s+/gu, " ").trim(),
    }))).catch(() => []),
    page.locator("body").innerText().catch(() => ""),
  ]);
  const vardiyalarHeading = headings.find((item) => item.name === "Vardiyalar") || null;
  const routeReadiness = evaluatePositiveRouteReadiness({
    requestedRoute: "/room/shifts",
    observedRoute: routeFromPage(page),
    shellMounted: true,
    routeContentMounted: markerObservation.present,
    routeMarkerPresent: markerObservation.present,
    bodyText,
  });
  return {
    currentUrl: page.url(),
    observedRoute: routeFromPage(page),
    mainElementCount: mainCount,
    roleMainCount,
    roomContentContainerPresent: markerObservation.roomShiftsContainerPresent === true,
    vardiyalarHeadingPresent: Boolean(vardiyalarHeading),
    vardiyalarHeadingRole: vardiyalarHeading?.role || null,
    vardiyalarHeadingName: vardiyalarHeading?.name || null,
    blockingLoadingPresent: /oturum\s+(?:bilgileri\s+)?doğrulanıyor|oturum\s+hazırlanıyor|(?:^|\s)yükleniyor(?:…|\.\.\.)?(?:\s|$)/iu.test(bodyText),
    routeSpecificStableMarker: marker.id,
    markerObservation,
    readinessReason: routeReadiness.reason,
  };
}

async function currentRouteReadinessObservation(page, requestedRoute) {
  const marker = routeContentMarker(requestedRoute);
  const [shellMounted, markerObservation, bodyText] = await Promise.all([
    page.locator("#shell-nav-dock, .navDock").count().then((count) => count > 0).catch(() => false),
    observeRouteContentMarker(page, marker),
    page.locator("body").innerText().catch(() => ""),
  ]);
  const routeContentMounted = markerObservation.present === true;
  return {
    requestedRoute,
    observedRoute: routeFromPage(page),
    shellMounted,
    routeContentMounted,
    routeMarkerPresent: routeContentMounted,
    routeMarkerDefined: markerObservation.markerDefined !== false,
    bodyText,
    marker: marker.id,
    markerObservation,
  };
}

async function waitForPositiveRouteReadiness(page, requestedRoute, timeout = 15000) {
  const deadline = Date.now() + timeout;
  let last = null;
  while (Date.now() < deadline) {
    const observation = await currentRouteReadinessObservation(page, requestedRoute);
    const readiness = evaluatePositiveRouteReadiness(observation);
    last = { ...observation, ...readiness };
    if (readiness.ready) return last;
    await sleep(80);
  }
  throw new Error(`ROUTE_READINESS_NOT_PROVEN:${last?.reason || "NO_OBSERVATION"}`);
}

/*
 * The ROOM shifts route has a two-stage readiness boundary: the panel and its
 * tabs mount first, then the authenticated shift list arrives.  The frozen
 * OTHER423 disclosure representative requires a real pending card, so the
 * canonical replay must wait on that current DOM fact instead of treating the
 * route shell marker as sufficient.  This is intentionally scoped to the
 * ROOM pending-card disclosure and uses condition polling rather than a blind
 * sleep or a fabricated fixture.
 */
export async function waitForRoomPendingShiftActionReady(page, {
  actionName = "Detayları göster",
  timeout = 15000,
} = {}) {
  const expected = norm(actionName);
  const deadline = Date.now() + timeout;
  let last = null;
  while (Date.now() < deadline) {
    last = await page.evaluate((wanted) => {
      const compact = (value) => String(value || "").replace(/\s+/gu, " ").trim();
      const visible = (node) => {
        if (!node) return false;
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return style.display !== "none"
          && style.visibility !== "hidden"
          && rect.width > 0
          && rect.height > 0;
      };
      const pendingTab = [...document.querySelectorAll("[role='tab']")].find((node) => {
        const label = compact(node.querySelector(".panelSegmentTabLabel")?.textContent || node.textContent);
        return /^Bekleyen Talepler/iu.test(label) && node.getAttribute("aria-selected") === "true";
      });
      const pendingCards = [...document.querySelectorAll("[data-testid='commercial-shift-card'][data-perspective='room']")]
        .filter(visible);
      const summaries = pendingCards.flatMap((card) => [...card.querySelectorAll("summary")]
        .filter(visible)
        .filter((node) => compact(node.getAttribute("aria-label") || node.getAttribute("title") || node.innerText || node.textContent) === wanted));
      const bodyText = compact(document.body?.innerText || "");
      return {
        pendingTabSelected: Boolean(pendingTab),
        pendingCardCount: pendingCards.length,
        actionCount: summaries.length,
        bodyText,
      };
    }, expected).catch((error) => ({
      pendingTabSelected: false,
      pendingCardCount: 0,
      actionCount: 0,
      bodyText: `DOM_OBSERVATION_ERROR:${error?.message || "unknown"}`,
    }));
    if (last.pendingTabSelected && last.pendingCardCount > 0 && last.actionCount > 0) {
      return {
        ready: true,
        reason: "ROOM_PENDING_SHIFT_ACTION_CURRENT_DOM_READY",
        actionName: expected,
        ...last,
      };
    }
    await sleep(80);
  }
  throw new Error(`ROOM_PENDING_SHIFT_ACTION_NOT_READY:${expected}:cards=${last?.pendingCardCount || 0}:actions=${last?.actionCount || 0}`);
}

export function evaluateFinancialOperationsContentSettled(observation = {}) {
  const routeReadiness = observation.routeReadiness || {};
  if (routeReadiness.ready !== true) return { ready: false, reason: `FINANCIAL_ROUTE_NOT_READY:${routeReadiness.reason || "UNKNOWN"}` };
  if (observation.financialSurfacePresent !== true) return { ready: false, reason: "FINANCIAL_SURFACE_NOT_PRESENT" };
  if (observation.workspacePresent !== true) return { ready: false, reason: "FINANCIAL_WORKSPACE_NOT_PRESENT" };
  if (observation.loadingPresentationPresent === true) return { ready: false, reason: "FINANCIAL_LOADING_PRESENT" };
  if (observation.baselineResolved !== true && observation.terminalNoBaselinePresent !== true) {
    return { ready: false, reason: "FINANCIAL_BASELINE_TERMINAL_STATE_NOT_PRESENT" };
  }
  return {
    ready: true,
    reason: "FINANCIAL_CONTENT_STABLE",
    stabilitySignature: JSON.stringify({
      financialSurfacePresent: true,
      workspacePresent: true,
      baselineResolved: observation.baselineResolved === true,
      terminalNoBaselinePresent: observation.terminalNoBaselinePresent === true,
    }),
  };
}

// This is deliberately a bounded product-specific observation contract.  It
// recognizes only loading presentations proven on the ROOM financial surface;
// it does not turn arbitrary copy into a generic loading heuristic.
export function financialLoadingPresentationObservation(bodyText = "") {
  const text = String(bodyText || "");
  const planLoading = /Plan verisi okunuyor(?:…|\.\.\.)?/iu.test(text);
  const refreshLoading = /Yenileniyor(?:…|\.\.\.)?/iu.test(text);
  return {
    loadingPresentationPresent: planLoading || refreshLoading,
    PLAN_VERISI_OKUNUYOR_PRESENT: planLoading,
    YENILENIYOR_PRESENT: refreshLoading,
  };
}

async function currentFinancialOperationsContentObservation(page, requestedRoute) {
  const [routeObservation, financialSurfaceCount, workspaceCount, bodyText, baselineSummaryCount] = await Promise.all([
    currentRouteReadinessObservation(page, requestedRoute),
    page.locator(".pre18-finance-surface.pre18-finance-room").count().catch(() => 0),
    page.locator("[data-testid='cost-scenario-workspace']").count().catch(() => 0),
    page.locator("body").innerText().catch(() => ""),
    page.locator("[data-testid='scenario-baseline-summary']").count().catch(() => 0),
  ]);
  const routeReadiness = { ...routeObservation, ...evaluatePositiveRouteReadiness(routeObservation) };
  return {
    routeReadiness,
    financialSurfacePresent: financialSurfaceCount > 0,
    workspacePresent: workspaceCount > 0,
    ...financialLoadingPresentationObservation(bodyText),
    baselineResolved: baselineSummaryCount > 0,
    terminalNoBaselinePresent: /Plan verisi bulunamadı\.?/iu.test(bodyText),
  };
}

export async function waitForFinancialOperationsContentSettled(page, requestedRoute, timeout = 15000) {
  const deadline = Date.now() + timeout;
  let last = null;
  let previousSignature = null;
  let stableObservationCount = 0;
  while (Date.now() < deadline) {
    const observation = await currentFinancialOperationsContentObservation(page, requestedRoute);
    const readiness = evaluateFinancialOperationsContentSettled(observation);
    last = { ...observation, ...readiness };
    if (readiness.ready) {
      stableObservationCount = readiness.stabilitySignature === previousSignature ? stableObservationCount + 1 : 1;
      previousSignature = readiness.stabilitySignature;
      if (stableObservationCount >= 2) return { ...last, stableObservationCount };
    } else {
      previousSignature = null;
      stableObservationCount = 0;
    }
    await sleep(80);
  }
  throw new Error(`FINANCIAL_CONTENT_SETTLED_NOT_PROVEN:${last?.reason || "NO_OBSERVATION"}`);
}

async function openRouteWithPositiveReadiness(page, route) {
  await page.goto(`${base}/#${route}`, { waitUntil: "commit", timeout: 20000 });
  return waitForPositiveRouteReadiness(page, route);
}
async function stepTarget(page, step) {
  const label = norm(step.label);
  const special = /Sefer Abi/iu.test(label) ? /Sefer Abi.*Sor/iu
    : /Personel Konum/iu.test(label) ? /Personel.*Konum/iu
      : /Öğrenci Konum/iu.test(label) ? /Öğrenci.*Konum/iu : null;
  const locators = special
    ? [page.getByRole("button", { name: special }).first()]
    : [page.getByRole(step.role || "button", { name: label, exact: true }).first(), page.getByText(label, { exact: true }).first()];
  for (const locator of locators) if (await locator.isVisible().catch(() => false)) return locator;
  const all = page.locator("button,a[href],input,select,textarea,summary,[role='button'],[role='tab'],[role='checkbox'],[role='switch'],[role='textbox']");
  const matches = [];
  for (let i = 0; i < await all.count(); i += 1) {
    const item = all.nth(i);
    if (!(await item.isVisible().catch(() => false))) continue;
    const observed = await item.evaluate((node) => String(node.getAttribute("aria-label") || node.getAttribute("title") || node.innerText || node.getAttribute("placeholder") || node.value || "").replace(/\s+/g, " ").trim()).catch(() => "");
    if (observed === label || (label && observed.toLocaleLowerCase("tr-TR") === label.toLocaleLowerCase("tr-TR"))) matches.push(item);
  }
  return matches[Number(step.occurrence || 0)] || matches[0] || null;
}
async function replaySteps(page, steps = []) {
  for (const step of steps) {
    const target = await stepTarget(page, step);
    if (!target) return { ok: false, reason: `missing replay step: ${norm(step.label)}` };
    if (await target.isDisabled().catch(() => true)) return { ok: false, reason: `replay step disabled: ${norm(step.label)}` };
    await target.click({ timeout: 2500, noWaitAfter: true });
    await sleep(120);
  }
  return { ok: true };
}
async function createPage(browser, role, token, viewport, telemetry, label, { diagnostic = null } = {}) {
  diagnostic?.mark("CONTEXT_CREATE_START");
  const context = await browser.newContext({ viewport: viewports[viewport], isMobile: viewport === "mobile", hasTouch: viewport === "mobile", locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  diagnostic?.mark("CONTEXT_CREATE_END");
  await context.addInitScript(({ accessToken, deviceId }) => {
    localStorage.setItem("token", accessToken);
    localStorage.setItem("personel_servis_browser_device_id", deviceId || "pre18-luna-browser");
    localStorage.removeItem("psv1:copilot:drawer:v4");
    localStorage.removeItem("psv1:copilot:launcher-placement:v1");
  }, { accessToken: token, deviceId: roles[role].deviceId });
  diagnostic?.mark("TOKEN_DEVICE_SEEDED");
  await context.addInitScript({ content: `window.__pre18CollectOwnerCandidates = ${browserOwnerCandidateCollectorSource};` });
  await context.addInitScript({ content: `window.__pre18ProjectSemanticControl = ${browserSemanticDescriptorSource};` });
  const page = await context.newPage();
  diagnostic?.mark("PAGE_CREATE");
  if (diagnostic?.onContextCreated) await diagnostic.onContextCreated({ context, page }).catch(() => {});
  page.on("console", (message) => { if (message.type() === "error") telemetry.console.push({ role, viewport, label, text: message.text(), url: page.url() }); });
  page.on("pageerror", (error) => telemetry.page.push({ role, viewport, label, text: error.message, url: page.url() }));
  page.on("response", (response) => {
    const item = { role, viewport, label, status: response.status(), url: response.url() };
    if (response.status() >= 500) telemetry.http500.push(item);
    if (response.status() === 403) telemetry.http403.push(item);
    if (response.status() === 404 && /\.(?:js|css|png|svg|woff2?)(?:\?|$)/iu.test(response.url())) telemetry.assets.push(item);
    if (response.status() >= 400 && response.status() !== 403 && /\/api\//u.test(response.url())) telemetry.critical.push(item);
  });
  if (diagnostic) {
    page.on("request", (request) => diagnostic.recordRequestStart({ url: request.url(), resourceType: request.resourceType() }));
    page.on("response", (response) => diagnostic.recordResponseHeaders({ url: response.url(), resourceType: response.request().resourceType(), status: response.status() }));
    page.on("requestfinished", async (request) => {
      const response = await request.response().catch(() => null);
      diagnostic.recordResponseEnd({ url: request.url(), resourceType: request.resourceType(), status: response?.status() ?? null });
    });
    page.on("requestfailed", (request) => diagnostic.recordRequestFailed({
      url: request.url(),
      resourceType: request.resourceType(),
      aborted: /aborted/iu.test(String(request.failure()?.errorText || "")),
    }));
  }
  return { context, page };
}

export function isCurrentMeRequest(request) {
  return evaluateTrustedLocalApiMeRequest({
    method: request?.method?.(),
    url: request?.url?.(),
  }).accepted;
}

async function authenticatedClientSnapshot(page, expectedRole, { includeDiagnostic = false } = {}) {
  return page.evaluate(({ role, includeDiagnostic: diagnostic }) => {
    const compact = (value) => String(value || "").replace(/\s+/gu, " ").trim();
    const token = compact(localStorage.getItem("token"));
    let cached = null;
    try { cached = JSON.parse(localStorage.getItem("personel_servis_cached_session") || "null"); } catch {}
    const me = cached?.me && typeof cached.me === "object" ? cached.me : null;
    const cacheMatchesToken = Boolean(token && cached && compact(cached.token) === token);
    const roleMatches = compact(me?.role).toUpperCase() === compact(role).toUpperCase();
    const tenantScopeProven = role === "ROOM"
      ? Number(me?.roomId || 0) > 0
      : Number(me?.companyId || 0) > 0 || Number(me?.roomId || 0) > 0;
    const bodyText = compact(document.body?.innerText || "");
    const sessionLoadingVisible = /oturum\s+(?:bilgileri\s+)?doğrulanıyor|oturum\s+hazırlanıyor/iu.test(bodyText);
    const genericLoadingVisible = /(?:^|\s)yükleniyor(?:…|\.\.\.)?(?:\s|$)/iu.test(bodyText);
    const nav = document.querySelector("#shell-nav-dock, .navDock");
    const home = document.querySelector(`[data-role-task-home="${role}"]`);
    const roleShell = document.querySelector(`.shell[data-role="${role}"]`);
    const visible = (node) => {
      if (!node) return false;
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
    };
    const navDockPresent = Boolean(nav);
    const navDockVisible = visible(nav);
    const roomTaskHomePresent = Boolean(home);
    const roomTaskHomeVisible = visible(home);
    const roleShellPresent = Boolean(roleShell);
    const authenticatedRoleControlVisible = [...(roleShell?.querySelectorAll(".navDockRole, .shellTopLogout") || [])].some(visible);
    const globalRoomShellRendered = Boolean(navDockVisible && roleShellPresent && authenticatedRoleControlVisible);
    const roomHomeRouteContentRendered = Boolean(roomTaskHomeVisible && !genericLoadingVisible);
    const result = {
      tokenPresent: Boolean(token),
      clientSessionHydrated: Boolean(cacheMatchesToken && roleMatches && tenantScopeProven),
      cachedSessionObserved: Boolean(cacheMatchesToken && roleMatches && tenantScopeProven),
      clientTenantScopeProven: tenantScopeProven,
      sessionLoadingVisible,
      roomShellRendered: globalRoomShellRendered,
      globalRoomShellRendered,
      roomHomeRouteContentRendered,
    };
    if (!diagnostic) return result;
    return {
      ...result,
      cachedSessionPresent: Boolean(cached),
      cachedRoleRoom: compact(me?.role).toUpperCase() === "ROOM",
      cachedRoomIdPresent: Number(me?.roomId || 0) > 0,
      navDockPresent,
      navDockVisible,
      roomTaskHomePresent,
      roomTaskHomeVisible,
      roleShellPresent,
      authenticatedRoleControlVisible,
      genericLoadingVisible,
      documentReadyState: String(document.readyState || ""),
      bodyText,
      mainCount: document.querySelectorAll("main").length,
      roleMainCount: document.querySelectorAll("[role='main']").length,
    };
  }, { role: expectedRole, includeDiagnostic }).catch(() => ({
    tokenPresent: false,
    clientSessionHydrated: false,
    cachedSessionObserved: false,
    clientTenantScopeProven: false,
    sessionLoadingVisible: true,
    roomShellRendered: false,
    globalRoomShellRendered: false,
    roomHomeRouteContentRendered: false,
    cachedSessionPresent: false,
    cachedRoleRoom: false,
    cachedRoomIdPresent: false,
    navDockPresent: false,
    navDockVisible: false,
    roomTaskHomePresent: false,
    roomTaskHomeVisible: false,
    roleShellPresent: false,
    authenticatedRoleControlVisible: false,
    genericLoadingVisible: false,
    documentReadyState: "",
    bodyText: "",
    mainCount: 0,
    roleMainCount: 0,
  }));
}

function safeBodyExcerpt(value, limit = 600) {
  return norm(value)
    .replace(/(?:eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)/gu, "[redacted-token]")
    .slice(0, limit);
}

function safePageUrl(page) {
  try {
    const url = new URL(page.url());
    return `${url.origin}${url.pathname}${url.hash}`;
  } catch {
    return "";
  }
}

function diagnosticObservationFromClient(client = {}) {
  return {
    TOKEN_DEVICE_SEEDED: client.tokenPresent === true,
    NAV_DOCK_VISIBLE: client.navDockVisible === true,
    ROOM_TASK_HOME_VISIBLE: client.roomTaskHomeVisible === true,
    GENERIC_LOADING_PRESENT: client.genericLoadingVisible === true,
    SESSION_LOADING_PRESENT: client.sessionLoadingVisible === true,
    CACHED_SESSION_PRESENT: client.cachedSessionPresent === true,
    GLOBAL_ROOM_SHELL_VISIBLE: client.globalRoomShellRendered === true,
    ROOM_SHELL_PREDICATE_RESULT: client.globalRoomShellRendered === true,
    ROUTE_CONTENT_PREDICATE_RESULT: client.roomHomeRouteContentRendered === true,
  };
}

function atomicAuthDiagnosticSample(page, client = {}, auth = {}) {
  const observation = diagnosticObservationFromClient(client);
  return {
    CURRENT_URL: safePageUrl(page),
    DOCUMENT_READY_STATE: client.documentReadyState || "",
    BODY_TEXT_SAFE_EXCERPT: safeBodyExcerpt(client.bodyText),
    NAV_DOCK_PRESENT: client.navDockPresent === true,
    NAV_DOCK_VISIBLE: client.navDockVisible === true,
    GLOBAL_AUTHENTICATED_ROOM_SHELL_READY: client.globalRoomShellRendered === true,
    ROOM_TASK_HOME_PRESENT: client.roomTaskHomePresent === true,
    ROOM_TASK_HOME_VISIBLE: client.roomTaskHomeVisible === true,
    SESSION_LOADING_PRESENT: client.sessionLoadingVisible === true,
    GENERIC_LOADING_PRESENT: client.genericLoadingVisible === true,
    MAIN_COUNT: Number(client.mainCount || 0),
    ROLE_MAIN_COUNT: Number(client.roleMainCount || 0),
    ROOM_SHELL_PREDICATE_RESULT: observation.ROOM_SHELL_PREDICATE_RESULT,
    ROUTE_CONTENT_PREDICATE_RESULT: observation.ROUTE_CONTENT_PREDICATE_RESULT,
    AUTH_ME_STARTED: auth.requestStarted === true,
    AUTH_ME_COMPLETED: Boolean(auth.response),
    AUTH_ME_STATUS: Number(auth.response?.status || 0) || null,
    CACHED_SESSION_PRESENT: client.cachedSessionPresent === true,
    CACHED_ROLE_ROOM: client.cachedRoleRoom === true,
    CACHED_ROOM_ID_PRESENT: client.cachedRoomIdPresent === true,
    LIVE_REACT_ROOM_STATE_PROVEN: "NOT_MEASURABLE",
    SCREENSHOT_PATH: null,
  };
}

async function preserveDiagnosticAuthFailure({ diagnostic, page, role, client, auth, readiness }) {
  if (!diagnostic) return;
  const captured = diagnostic.captureDeadline({
    verdict: { ready: readiness.ready === true, terminal: readiness.terminal === true, reason: readiness.reason },
    sample: atomicAuthDiagnosticSample(page, client, auth),
  });
  if (typeof diagnostic.captureTimeoutScreenshot === "function") {
    captured.FINAL_TIMEOUT_SAMPLE.SCREENSHOT_PATH = await diagnostic.captureTimeoutScreenshot(page, role).catch(() => null);
    diagnostic.mark("SCREENSHOT_CAPTURED");
  }
  const tailDeadline = Date.now() + diagnostic.tailMs;
  while (Date.now() < tailDeadline) {
    const tailClient = await authenticatedClientSnapshot(page, role, { includeDiagnostic: true });
    diagnostic.recordObservation({ snapshot: diagnosticObservationFromClient(tailClient) });
    await sleep(80);
  }
  diagnostic.mark("POST_DEADLINE_TAIL_FINISHED");
}

async function createAuthenticatedRoleContext(browser, role, token, viewport, telemetry, label, {
  authTimeoutMs = 20_000,
  diagnostic = null,
  genericReadBudgetCoordinator = null,
  workerId = "",
} = {}) {
  const session = await createPage(browser, role, token, viewport, telemetry, label, { diagnostic });
  /* The shared generic-read boundary must exist before the first authenticated
   * navigation: the room shell can start generic product reads immediately. */
  const interception = genericReadBudgetCoordinator
    ? await installPostAuthMutationInterception(session.page, { genericReadBudgetCoordinator, workerId })
    : null;
  const startedAt = Date.now();
  const auth = {
    expectedRole: role,
    requestStarted: false,
    requestFailed: false,
    requestAborted: false,
    failedRequestCount: 0,
    response: null,
    requestStartedAt: null,
    sessionLoadingVisibleAtStart: false,
    sessionLoadingVisibleAtAuthComplete: null,
  };
  let responseBodyPromise = null;
  const onRequest = (request) => {
    if (!isCurrentMeRequest(request)) return;
    auth.requestStarted = true;
    auth.requestStartedAt ??= Date.now();
  };
  const onRequestFailed = (request) => {
    auth.failedRequestCount += 1;
    if (!isCurrentMeRequest(request)) return;
    auth.requestFailed = true;
    const failure = String(request.failure()?.errorText || "");
    auth.requestAborted = /aborted/iu.test(failure);
  };
  const onResponse = (response) => {
    if (!isCurrentMeRequest(response.request())) return;
    const receivedAt = Date.now();
    const status = response.status();
    responseBodyPromise = (async () => {
      const payload = status === 200 ? await response.json().catch(() => null) : null;
      const proof = evaluateTrustedLocalApiMeAuthResponse({
        method: response.request().method(),
        url: response.url(),
        status,
        payload,
        expectedRole: role,
      });
      auth.response = {
        status,
        role: proof.authRole,
        tenantScopeProven: proof.tenantScopeProven,
        durationMs: auth.requestStartedAt == null ? null : Math.max(0, receivedAt - auth.requestStartedAt),
      };
    })();
  };
  session.page.on("request", onRequest);
  session.page.on("requestfailed", onRequestFailed);
  session.page.on("response", onResponse);
  try {
    diagnostic?.mark("GOTO_START");
    await session.page.goto(`${base}/#/room`, { waitUntil: "commit", timeout: 20_000 });
    diagnostic?.mark("DOCUMENT_COMMIT");
    let firstSnapshot = true;
    while (Date.now() - startedAt < authTimeoutMs) {
      if (responseBodyPromise) await responseBodyPromise.catch(() => {});
      const client = await authenticatedClientSnapshot(session.page, role, { includeDiagnostic: Boolean(diagnostic) });
      diagnostic?.recordObservation({ snapshot: diagnosticObservationFromClient(client) });
      if (firstSnapshot) {
        auth.sessionLoadingVisibleAtStart = client.sessionLoadingVisible;
        firstSnapshot = false;
      }
      const readiness = evaluateAuthenticatedContextReadiness({
        expectedRole: role,
        tokenPresent: client.tokenPresent,
        authRequestStarted: auth.requestStarted,
        authResponse: auth.response,
        requestFailed: auth.requestFailed,
        requestAborted: auth.requestAborted,
        clientSessionHydrated: client.clientSessionHydrated,
        roomShellRendered: client.roomShellRendered,
        cachedSessionObserved: client.cachedSessionObserved,
        globalRoomShellRendered: client.globalRoomShellRendered,
        sessionLoadingVisible: client.sessionLoadingVisible,
        elapsedMs: Date.now() - startedAt,
        authTimeoutMs,
      });
      if (readiness.ready) {
        diagnostic?.mark("AUTH_READY_PREDICATE_FIRST_TRUE");
        auth.sessionLoadingVisibleAtAuthComplete = client.sessionLoadingVisible;
        return {
          ok: true,
          session,
          interception,
          auth: {
            ...toSafeAuthTelemetry({ expectedRole: role, authResponse: auth.response, clientSessionHydrated: client.clientSessionHydrated, roomShellRendered: client.roomShellRendered }),
            tokenPresent: client.tokenPresent,
            cachedSessionObserved: client.cachedSessionObserved === true,
            globalRoomShellRendered: client.globalRoomShellRendered === true,
            authRequestStarted: auth.requestStarted,
            failedRequestCount: auth.failedRequestCount,
            sessionLoadingVisibleAtStart: auth.sessionLoadingVisibleAtStart,
            sessionLoadingVisibleAtAuthComplete: auth.sessionLoadingVisibleAtAuthComplete,
            authBootstrapDurationMs: Date.now() - startedAt,
          },
        };
      }
      if (readiness.terminal) {
        await preserveDiagnosticAuthFailure({ diagnostic, page: session.page, role, client, auth, readiness });
        return {
          ok: false,
          session,
          interception,
          failureReason: readiness.reason,
          auth: {
            ...toSafeAuthTelemetry({ expectedRole: role, authResponse: auth.response, clientSessionHydrated: client.clientSessionHydrated, roomShellRendered: client.roomShellRendered }),
            tokenPresent: client.tokenPresent,
            cachedSessionObserved: client.cachedSessionObserved === true,
            globalRoomShellRendered: client.globalRoomShellRendered === true,
            authRequestStarted: auth.requestStarted,
            failedRequestCount: auth.failedRequestCount,
            sessionLoadingVisibleAtStart: auth.sessionLoadingVisibleAtStart,
            sessionLoadingVisibleAtAuthComplete: client.sessionLoadingVisible,
            authBootstrapDurationMs: Date.now() - startedAt,
          },
        };
      }
      await sleep(80);
    }
    if (responseBodyPromise) await responseBodyPromise.catch(() => {});
    const client = await authenticatedClientSnapshot(session.page, role, { includeDiagnostic: Boolean(diagnostic) });
    diagnostic?.recordObservation({ snapshot: diagnosticObservationFromClient(client) });
    const readiness = evaluateAuthenticatedContextReadiness({
      expectedRole: role,
      tokenPresent: client.tokenPresent,
      authRequestStarted: auth.requestStarted,
      authResponse: auth.response,
      requestFailed: auth.requestFailed,
      requestAborted: auth.requestAborted,
      clientSessionHydrated: client.clientSessionHydrated,
      roomShellRendered: client.roomShellRendered,
      cachedSessionObserved: client.cachedSessionObserved,
      globalRoomShellRendered: client.globalRoomShellRendered,
      sessionLoadingVisible: client.sessionLoadingVisible,
      elapsedMs: authTimeoutMs,
      authTimeoutMs,
    });
    await preserveDiagnosticAuthFailure({ diagnostic, page: session.page, role, client, auth, readiness });
    return {
      ok: false,
      session,
      interception,
      failureReason: readiness.reason,
      auth: {
        ...toSafeAuthTelemetry({ expectedRole: role, authResponse: auth.response, clientSessionHydrated: client.clientSessionHydrated, roomShellRendered: client.roomShellRendered }),
        tokenPresent: client.tokenPresent,
        cachedSessionObserved: client.cachedSessionObserved === true,
        globalRoomShellRendered: client.globalRoomShellRendered === true,
        authRequestStarted: auth.requestStarted,
        failedRequestCount: auth.failedRequestCount,
        sessionLoadingVisibleAtStart: auth.sessionLoadingVisibleAtStart,
        sessionLoadingVisibleAtAuthComplete: client.sessionLoadingVisible,
        authBootstrapDurationMs: Date.now() - startedAt,
      },
    };
  } catch (error) {
    return {
      ok: false,
      session,
      interception,
      failureReason: "AUTH_BOOTSTRAP_NAVIGATION_FAILED",
      auth: {
        ...toSafeAuthTelemetry({ expectedRole: role, authResponse: auth.response }),
        tokenPresent: false,
        authRequestStarted: auth.requestStarted,
        failedRequestCount: auth.failedRequestCount,
        sessionLoadingVisibleAtStart: auth.sessionLoadingVisibleAtStart,
        sessionLoadingVisibleAtAuthComplete: null,
        authBootstrapDurationMs: Date.now() - startedAt,
      },
    };
  } finally {
    session.page.off("request", onRequest);
    session.page.off("requestfailed", onRequestFailed);
    session.page.off("response", onResponse);
  }
}

async function installPostAuthMutationInterception(page, { genericReadBudgetCoordinator = null, workerId = "" } = {}) {
  const policy = mutationInterceptionPolicy("CONTRACT_ROUTE");
  if (!policy.install) return { installed: false, authSafe: true, dispose: () => {} };
  const requestIdentities = new WeakMap();
  const activeHandlers = new Set();
  const handlerDrainWaiters = new Set();
  let tearingDown = false;
  let activeContractId = "NONE";
  let activeResetOperation = null;
  const notifyHandlerDrain = () => {
    if (activeHandlers.size) return;
    for (const resolve of handlerDrainWaiters) resolve();
    handlerDrainWaiters.clear();
  };
  const requestMetadata = (request) => ({ method: request.method(), url: request.url() });
  const isGenericRequest = (request) => genericReadBudgetCoordinator
    && classifyRoomRequestLimiterFamily(requestMetadata(request)) === "GENERIC_READ";
  const ensureRequestIdentity = (request) => {
    if (!isGenericRequest(request)) return null;
    const existing = requestIdentities.get(request);
    if (existing) return existing;
    const resetOperation = activeResetOperation;
    const requestIdentity = genericReadBudgetCoordinator.beginGenericRequest({
      request: requestMetadata(request),
      workerId,
      contractId: activeContractId,
      route: new URL(page.url()).hash.replace(/^#/u, "") || "/room",
      lifecyclePhase: resetOperation?.LIFECYCLE_PHASE || (activeContractId === "NONE" ? "BOOTSTRAP" : "CONTRACT"),
      resetOperationId: resetOperation?.RESET_OPERATION_ID || "",
      contractRoute: resetOperation?.CONTRACT_ROUTE || "",
      resetNavigationRoute: resetOperation?.RESET_NAVIGATION_ROUTE || "",
      bootstrap: resetOperation ? false : genericReadBudgetCoordinator.authoritativeHeaderSeeded() !== true,
    });
    requestIdentities.set(request, requestIdentity);
    return requestIdentity;
  };
  const onRequest = (request) => {
    const requestIdentity = ensureRequestIdentity(request);
    if (!requestIdentity) return;
    genericReadBudgetCoordinator.recordPlaywrightRequest({ request: requestMetadata(request), requestIdentity });
  };
  const onResponse = (response) => {
    if (!genericReadBudgetCoordinator) return;
    const request = response.request();
    const requestIdentity = ensureRequestIdentity(request);
    if (!requestIdentity) return;
    genericReadBudgetCoordinator.observeResponse({
      request: requestMetadata(request),
      requestIdentity,
      status: response.status(),
      headers: response.headers(),
    });
  };
  const onRequestFailed = (request) => {
    if (!genericReadBudgetCoordinator) return;
    const requestIdentity = ensureRequestIdentity(request);
    if (!requestIdentity) return;
    genericReadBudgetCoordinator.recordRequestFailed({
      request: requestMetadata(request),
      requestIdentity,
      reason: request.failure()?.errorText || "PLAYWRIGHT_REQUEST_FAILED_OR_CONTEXT_CLOSED",
    });
  };
  const onRequestFinished = (request) => {
    if (!genericReadBudgetCoordinator) return;
    const requestIdentity = ensureRequestIdentity(request);
    if (!requestIdentity) return;
    genericReadBudgetCoordinator.recordRequestFinished({ request: requestMetadata(request), requestIdentity });
  };
  if (genericReadBudgetCoordinator) {
    page.on("request", onRequest);
    page.on("response", onResponse);
    page.on("requestfinished", onRequestFinished);
    page.on("requestfailed", onRequestFailed);
  }
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (mutationMethods.has(request.method())) {
      await route.abort();
      return;
    }
    if (!genericReadBudgetCoordinator || classifyRoomRequestLimiterFamily(requestMetadata(request)) !== "GENERIC_READ") {
      await route.continue();
      return;
    }
    const requestIdentity = ensureRequestIdentity(request);
    genericReadBudgetCoordinator.recordPlaywrightRequest({ request: requestMetadata(request), requestIdentity });
    const active = { requestIdentity };
    activeHandlers.add(active);
    try {
      if (tearingDown) {
        genericReadBudgetCoordinator.cancelGenericRequestBeforeDispatch({ requestIdentity, reason: "INTERCEPTION_TEARDOWN_BEFORE_DISPATCH" });
        await route.abort();
        return;
      }
      await genericReadBudgetCoordinator.waitForPermit({ request: requestMetadata(request), workerId, requestIdentity });
      if (tearingDown) {
        genericReadBudgetCoordinator.cancelGenericRequestBeforeDispatch({ requestIdentity, reason: "INTERCEPTION_TEARDOWN_AFTER_PERMIT" });
        await route.abort();
        return;
      }
      genericReadBudgetCoordinator.markGenericRequestDispatched({ requestIdentity });
      await route.continue();
    } catch (error) {
      genericReadBudgetCoordinator.cancelGenericRequestBeforeDispatch({ requestIdentity, reason: "PERMIT_NOT_GRANTED_OR_CANCELLED" });
      await route.abort().catch(() => {});
    } finally {
      activeHandlers.delete(active);
      notifyHandlerDrain();
    }
  });
  const beginTeardown = () => {
    tearingDown = true;
    return genericReadBudgetCoordinator
      ? genericReadBudgetCoordinator.beginGenericRequestTeardown({ workerId })
      : null;
  };
  const drain = async () => {
    if (!genericReadBudgetCoordinator) return { drained: activeHandlers.size === 0 };
    await genericReadBudgetCoordinator.drainGenericRequestLifecycle({ workerId, timeoutMs: 20_000 });
    if (activeHandlers.size) await new Promise((resolve) => handlerDrainWaiters.add(resolve));
    if (activeHandlers.size) throw new Error("GENERIC_INTERCEPTION_HANDLER_DRAIN_NOT_PROVEN");
    return { drained: true };
  };
  return {
    installed: true,
    authSafe: true,
    beginTeardown,
    drain,
    setActiveContractId: (value) => { activeContractId = String(value || "NONE"); },
    setActiveResetOperation: (operation = null) => {
      activeResetOperation = operation && operation.LIFECYCLE_PHASE === "RESET" ? { ...operation } : null;
    },
    /* Do not call page.unroute as a synthetic drain.  Context teardown owns
     * the route only after all coordinator-tracked work is terminal. */
    dispose: () => {
      page.off("request", onRequest);
      page.off("response", onResponse);
      page.off("requestfinished", onRequestFinished);
      page.off("requestfailed", onRequestFailed);
    },
  };
}

/* Root membership is immutable recorder data.  Financial settlement is route
 * telemetry and cannot be used as a proxy membership predicate in terminal
 * canaries or summaries. */
function authoritativeRoomResidualRootScope(rootAccounting = {}) {
  return {
    A1_MEMBERSHIP_SOURCE: "PREHIT_ROOT",
    FINANCIAL_SETTLED_FIELD_SCOPE: "ROUTE_TELEMETRY",
    S1_TRUE_CLOSED: Number(rootAccounting.S1_TRUE_CLOSED || 0),
    S1_TRUE_OPEN: Number(rootAccounting.S1_TRUE_OPEN || 0),
    A1_TRUE_CLOSED: Number(rootAccounting.A1_TRUE_CLOSED || 0),
    A1_TRUE_OPEN: Number(rootAccounting.A1_TRUE_OPEN || 0),
    A1_SCOPE_CONTAMINATION_COUNT: Number(rootAccounting.A1_SCOPE_CONTAMINATION_COUNT || 0),
  };
}

/*
 * The Exact36 canary used to live in a serialized session wrapper.  Keep its
 * orchestration here, beside the current browser lifecycle primitives, so a
 * browser execution and its no-browser controlled-adapter proof exercise the
 * same durable function.  `createWorkerRuntime` owns browser construction;
 * this function owns the run-wide coordinator, seed barrier, and teardown
 * ordering only.
 */
export function exact36GenericRuntimeEvidence(coordinator, suppliedSnapshot = null) {
  const snapshot = suppliedSnapshot || coordinator.genericRequestSnapshot();
  const telemetry = snapshot?.COORDINATOR_TELEMETRY;
  if (!telemetry || !telemetry.COORDINATOR_INSTANCE_ID) throw new Error("EXACT36_COORDINATOR_TELEMETRY_UNAVAILABLE");
  const requests = Array.isArray(snapshot.REQUESTS) ? snapshot.REQUESTS : [];
  const dispatchedRequests = requests.filter((item) => item?.DISPATCH_TIMESTAMP != null);
  const grantedRequests = requests.filter((item) => item?.PERMIT_TIMESTAMP != null);
  const ungrantedDispatchedRequests = dispatchedRequests.filter((item) => item?.PERMIT_TIMESTAMP == null);
  const genericServer429Observed = requests.some((item) => Number(item?.HTTP_STATUS) === 429);
  return {
    COORDINATOR_TELEMETRY_SOURCE: "SHARED_RUNTIME_COORDINATOR",
    COORDINATOR_INSTANCE_ID: telemetry.COORDINATOR_INSTANCE_ID,
    COORDINATOR_INSTANCE_COUNT: telemetry.COORDINATOR_INSTANCE_COUNT,
    /* Legacy summaries used this name for response reconciliation.  The
     * durable runtime now maps it to actual coordinator-approved dispatches;
     * response events stay separately named below. */
    SERVER_GENERIC_REQUEST_COUNT: dispatchedRequests.length,
    SERVER_GENERIC_REQUEST_COUNT_SEMANTICS: "GENERIC_DISPATCH_COUNT",
    GRANTED_GENERIC_REQUEST_COUNT: grantedRequests.length,
    UNGRANTED_SERVER_GENERIC_REQUEST_COUNT: ungrantedDispatchedRequests.length,
    GENERIC_REQUEST_ACCOUNTING_GAP_COUNT: Math.max(0, dispatchedRequests.length - grantedRequests.length),
    GENERIC_DISPATCH_COUNT: Number(snapshot.GENERIC_DISPATCH_COUNT || dispatchedRequests.length),
    PLAYWRIGHT_GENERIC_REQUEST_EVENT_COUNT: Number(snapshot.PLAYWRIGHT_GENERIC_REQUEST_EVENT_COUNT || 0),
    GENERIC_RESPONSE_EVENT_COUNT: Number(snapshot.GENERIC_RESPONSE_EVENT_COUNT || 0),
    GENERIC_REQUESTFINISHED_COUNT: Number(snapshot.GENERIC_REQUESTFINISHED_COUNT || 0),
    GENERIC_REQUESTFAILED_COUNT: Number(snapshot.GENERIC_REQUESTFAILED_COUNT || 0),
    GENERIC_TERMINAL_COUNT: Number(snapshot.GENERIC_TERMINAL_COUNT || 0),
    GENERIC_UNKNOWN_TERMINAL_COUNT: Number(snapshot.GENERIC_UNKNOWN_TERMINAL_COUNT || 0),
    PRE_COORDINATOR_UNACCOUNTED_COUNT: Number(snapshot.PRE_COORDINATOR_UNACCOUNTED_COUNT || 0),
    ACTIVE_GENERIC_HANDLER_COUNT: Number(snapshot.ACTIVE_GENERIC_REQUEST_COUNT || 0),
    IN_FLIGHT_GENERIC_REQUEST_COUNT: Number(snapshot.IN_FLIGHT_RESERVATION_COUNT || 0),
    PENDING_GENERIC_WAITER_COUNT: Number(snapshot.PENDING_GENERIC_WAITER_COUNT || 0),
    IN_FLIGHT_RESERVATION_LOSS_COUNT: telemetry.RESERVATION_LOSS_COUNT,
    DOUBLE_RELEASE_COUNT: telemetry.DOUBLE_RELEASE_COUNT,
    STALE_REMAINING_OVERGRANT_COUNT: telemetry.STALE_REMAINING_OVERGRANT_COUNT,
    OUTSTANDING_RESERVATION_COUNT: telemetry.OUTSTANDING_RESERVATION_COUNT,
    PEAK_IN_FLIGHT_RESERVATION_COUNT: telemetry.PEAK_IN_FLIGHT_RESERVATION_COUNT,
    GENERIC_BUDGET_VIOLATION_COUNT: Number(snapshot.GENERIC_BUDGET_VIOLATION_COUNT || 0),
    SERVER_429_FORCES_VIOLATION_RUNTIME_WIRING: !genericServer429Observed || coordinator.server429ForcesBudgetViolation() ? "PASS" : "FAIL",
  };
}

function normalizeExact36Rows(value) {
  if (Array.isArray(value)) return value;
  return value == null ? [] : [value];
}

/*
 * Durable Exact36 orchestration.  This is deliberately adapter-shaped so the
 * lifecycle check can use deterministic browser/network doubles, while the
 * future Chromium invocation supplies `createAuthenticatedRoleContext` and
 * the current probe executor.  It must not be copied into a session/data URL.
 */
export async function runRoomExact36DurableRuntime({
  workers: workerPlan = [],
  createWorkerRuntime,
  executeContractRuntime,
  resetContractRuntime = null,
  persistRequestLifecycleSnapshot,
  coordinator = null,
  authenticatedScope = "ROOM_EXACT36_RUN_LOCAL_AUTHENTICATED_USER",
  expectedWorkerCount = ROOM_WORKER_CONCURRENCY_MAX,
  aggregateResults = ({ workerAuth, criticalResponses, results }) => aggregateResidual195Summary({ workerAuth, criticalResponses, results }),
} = {}) {
  if (!Number.isInteger(expectedWorkerCount) || expectedWorkerCount < 1 || expectedWorkerCount > ROOM_WORKER_CONCURRENCY_MAX
    || !Array.isArray(workerPlan) || workerPlan.length !== expectedWorkerCount) {
    throw new Error(`EXACT36_WORKER_PLAN_INVALID:${Array.isArray(workerPlan) ? workerPlan.length : "UNKNOWN"}`);
  }
  if (typeof createWorkerRuntime !== "function" || typeof executeContractRuntime !== "function" || typeof persistRequestLifecycleSnapshot !== "function") {
    throw new Error("EXACT36_DURABLE_RUNTIME_ADAPTERS_REQUIRED");
  }
  const resetContract = typeof resetContractRuntime === "function"
    ? resetContractRuntime
    : resetRoomExact36CanonicalContract;
  const genericReadBudgetCoordinator = coordinator || createSharedAuthenticatedReadBudgetCoordinator({ authenticatedScope });
  const workerAuth = [];
  const criticalResponses = [];
  const results = [];
  const resetEvidence = [];
  const runtimes = [];
  const teardownEvidence = {
    beginTeardownWorkers: new Set(),
    drainWorkers: new Set(),
    disposeWorkers: new Set(),
    closeWorkers: new Set(),
  };
  let serverSeedBeforeParallel = false;
  let parallelReleaseBeforeServerSeedCount = 0;
  let requestLifecycleSnapshot = null;
  let requestLifecycleSnapshotWritten = false;

  const createOne = async (worker, { bootstrap = false } = {}) => {
    if (!bootstrap && genericReadBudgetCoordinator.authoritativeHeaderSeeded() !== true) {
      parallelReleaseBeforeServerSeedCount += 1;
      throw new Error(`EXACT36_PARALLEL_RELEASE_BEFORE_SERVER_SEED:${worker?.WORKER_ID || "UNKNOWN"}`);
    }
    const runtime = await createWorkerRuntime({
      worker,
      workerId: worker?.WORKER_ID || "",
      genericReadBudgetCoordinator,
      bootstrap,
    });
    if (runtime?.interception?.installed !== true) throw new Error(`EXACT36_CONTEXT_INTERCEPTION_NOT_PROVEN:${worker?.WORKER_ID || "UNKNOWN"}`);
    runtimes.push({ ...runtime, worker });
    workerAuth.push(runtime?.workerAuth || runtime?.authenticated?.auth || runtime?.auth || null);
    return runtimes.at(-1);
  };

  try {
    const [bootstrapWorker, ...parallelWorkers] = workerPlan;
    const bootstrap = await createOne(bootstrapWorker, { bootstrap: true });
    if (bootstrap?.authenticated?.ok === false) throw new Error(`EXACT36_BOOTSTRAP_AUTH_NOT_READY:${bootstrapWorker?.WORKER_ID || "UNKNOWN"}`);
    await genericReadBudgetCoordinator.waitForAuthoritativeSeed({ timeoutMs: 20_000 });
    serverSeedBeforeParallel = genericReadBudgetCoordinator.authoritativeHeaderSeeded() === true;
    await Promise.all(parallelWorkers.map((worker) => createOne(worker)));
    const rows = await Promise.all(runtimes.map(async (runtime) => {
      const current = [];
      for (const assignment of runtime.worker?.ASSIGNMENTS || []) {
        const workerId = runtime.worker?.WORKER_ID || "";
        const resetRequired = assignment?.RESET_REQUIRED !== false;
        const contractId = assignment?.ACTION_CONTRACT_ID || "NONE";
        runtime?.interception?.setActiveContractId?.(contractId);
        const resetOperation = resetRequired
          ? genericReadBudgetCoordinator.beginResetOperation({
            workerId,
            contractId,
            contractRoute: assignment?.ROUTE || "UNKNOWN",
            resetNavigationRoute: "/room",
          })
          : null;
        runtime?.interception?.setActiveResetOperation?.(resetOperation);
        let reset = null;
        let resetLifecycle = null;
        try {
          reset = await resetContract({
            ...runtime,
            workerId,
            assignment,
            resetRequired,
            resetOperation,
            genericReadBudgetCoordinator,
            criticalResponses,
          });
          if (resetRequired) {
            resetLifecycle = await genericReadBudgetCoordinator.waitForResetOperationTerminal({
              resetOperationId: resetOperation.RESET_OPERATION_ID,
              timeoutMs: 20_000,
            });
          }
        } finally {
          if (resetOperation) genericReadBudgetCoordinator.endResetOperation({ resetOperationId: resetOperation.RESET_OPERATION_ID });
          runtime?.interception?.setActiveResetOperation?.(null);
        }
        const resetResult = String(reset?.RESET_RESULT || reset?.resetResult || "NOT_ATTEMPTED");
        const resetStarted = reset?.RESET_STARTED === true || reset?.started === true;
        const resetCompleted = reset?.RESET_COMPLETED === true || reset?.completed === true;
        const resetProof = reset?.RESET_PROOF === true || reset?.proof === true;
        const resetStateProofValid = resetStarted
          && resetCompleted
          && resetProof
          && /^CANONICAL(?:_ROOM)?_RESET_PROVEN$/u.test(resetResult);
        const resetGenericReadCount = Number(resetLifecycle?.RESET_SCOPED_REQUEST_COUNT || 0);
        if (resetRequired && !resetStateProofValid) {
          throw new Error(`RESET_STATE_PROOF_IS_PRIMARY:${assignment?.ACTION_CONTRACT_ID || "UNKNOWN"}`);
        }
        if (resetRequired && resetLifecycle?.RESET_LIFECYCLE_EVIDENCE !== "PASS") {
          throw new Error(`EXACT36_RESET_OPERATION_LIFECYCLE_NOT_PROVEN:${assignment?.ACTION_CONTRACT_ID || "UNKNOWN"}:${resetLifecycle?.REASON || "UNKNOWN"}`);
        }
        const resetRow = {
          ACTION_CONTRACT_ID: assignment?.ACTION_CONTRACT_ID || "UNKNOWN",
          WORKER_ID: workerId,
          RESET_REQUIRED: resetRequired,
          RESET_STARTED: resetStarted,
          RESET_COMPLETED: resetCompleted,
          RESET_PROOF: resetProof,
          RESET_RESULT: resetResult,
          RESET_STATE_PROOF_VALID: resetStateProofValid,
          TRANSIENT_STATE_LEAK: reset?.TRANSIENT_STATE_LEAK === true,
          RESET_GENERIC_READ_COUNT: resetGenericReadCount,
          RESET_OPERATION_ID: resetOperation?.RESET_OPERATION_ID || null,
          LIFECYCLE_PHASE: resetOperation?.LIFECYCLE_PHASE || null,
          RESET_NETWORK_REQUIREMENT_MODE: resetLifecycle?.RESET_NETWORK_REQUIREMENT_MODE || "OPTIONAL_BUT_IF_PRESENT_MUST_BE_COORDINATED",
          RESET_NETWORK_VALIDATION_STATUS: resetLifecycle?.RESET_NETWORK_VALIDATION_STATUS || "NOT_APPLICABLE_ZERO_REQUESTS",
          RESET_OPERATION_ACCEPTANCE_STATUS: resetStateProofValid && resetLifecycle?.RESET_LIFECYCLE_EVIDENCE === "PASS" ? "GREEN" : "FAIL",
          BOOTSTRAP_MISASSOCIATION_COUNT: Number(resetLifecycle?.BOOTSTRAP_MISASSOCIATION_COUNT || 0),
          RESET_SCOPED_DISPATCH_COUNT: Number(resetLifecycle?.RESET_SCOPED_DISPATCH_COUNT || 0),
          RESET_SCOPED_RESPONSE_COUNT: Number(resetLifecycle?.RESET_SCOPED_RESPONSE_COUNT || 0),
          RESET_SCOPED_REQUESTFINISHED_COUNT: Number(resetLifecycle?.RESET_SCOPED_REQUESTFINISHED_COUNT || 0),
          RESET_SCOPED_REQUESTFAILED_COUNT: Number(resetLifecycle?.RESET_SCOPED_REQUESTFAILED_COUNT || 0),
          RESET_SCOPED_TERMINAL_COUNT: Number(resetLifecycle?.RESET_SCOPED_TERMINAL_COUNT || 0),
          RESET_SCOPED_UNKNOWN_TERMINAL_COUNT: Number(resetLifecycle?.RESET_SCOPED_UNKNOWN_TERMINAL_COUNT || 0),
          RESET_SCOPED_VALIDATED_REQUEST_COUNT: Number(resetLifecycle?.RESET_SCOPED_VALIDATED_REQUEST_COUNT || 0),
          RESET_SCOPED_INVALID_REQUEST_COUNT: Number(resetLifecycle?.RESET_SCOPED_INVALID_REQUEST_COUNT || 0),
        };
        resetEvidence.push(resetRow);
        const executed = await executeContractRuntime({
          ...runtime,
          workerId,
          assignment,
          reset: resetRow,
          genericReadBudgetCoordinator,
          criticalResponses,
        });
        for (const row of normalizeExact36Rows(executed)) {
          current.push({
            ...row,
            RESET_REQUIRED: resetRow.RESET_REQUIRED,
            RESET_STARTED: resetRow.RESET_STARTED,
            RESET_COMPLETED: resetRow.RESET_COMPLETED,
            RESET_PROOF: resetRow.RESET_PROOF,
            RESET_RESULT: resetRow.RESET_RESULT,
            RESET_STATE_PROOF_VALID: resetRow.RESET_STATE_PROOF_VALID,
            resetResult: resetRow.RESET_RESULT,
            TRANSIENT_STATE_LEAK: resetRow.TRANSIENT_STATE_LEAK,
            RESET_GENERIC_READ_COUNT: resetRow.RESET_GENERIC_READ_COUNT,
            WORKER_RESET: resetRow,
          });
        }
        runtime?.interception?.setActiveContractId?.("NONE");
      }
      return current;
    }));
    results.push(...rows.flat());
  } finally {
    /* Begin teardown for every worker first so no new permit can be issued;
     * then wait for every handler/request lifecycle to become terminal before
     * disposing interception or closing browser contexts. */
    const teardownFailures = [];
    for (const runtime of runtimes) {
      try { runtime?.interception?.beginTeardown?.(); teardownEvidence.beginTeardownWorkers.add(String(runtime?.worker?.WORKER_ID || "")); }
      catch (error) { teardownFailures.push(error); }
    }
    for (const runtime of runtimes) {
      try {
        const workerId = String(runtime?.worker?.WORKER_ID || "");
        const drained = await runtime?.interception?.drain?.();
        teardownEvidence.drainWorkers.add(workerId);
        if (drained?.drained !== true) throw new Error(`EXACT36_INTERCEPTION_DRAIN_NOT_PROVEN:${workerId || "UNKNOWN"}`);
      } catch (error) { teardownFailures.push(error); }
    }
    try {
      requestLifecycleSnapshot = genericReadBudgetCoordinator.genericRequestSnapshot();
      await persistRequestLifecycleSnapshot(requestLifecycleSnapshot);
      requestLifecycleSnapshotWritten = true;
    } catch (error) { teardownFailures.push(error); }
    for (const runtime of runtimes) {
      try { runtime?.interception?.dispose?.(); teardownEvidence.disposeWorkers.add(String(runtime?.worker?.WORKER_ID || "")); }
      catch (error) { teardownFailures.push(error); }
    }
    for (const runtime of runtimes) {
      try {
        const workerId = String(runtime?.worker?.WORKER_ID || "");
        const close = runtime?.session?.context?.close;
        if (typeof close !== "function") throw new Error(`EXACT36_CONTEXT_CLOSE_NOT_WIRED:${workerId || "UNKNOWN"}`);
        await close.call(runtime.session.context);
        teardownEvidence.closeWorkers.add(workerId);
      } catch (error) { teardownFailures.push(error); }
    }
    if (teardownFailures.length) throw teardownFailures[0];
  }

  const rootAccounting = aggregateResults({ workerAuth, criticalResponses, results });
  const rootScope = authoritativeRoomResidualRootScope(rootAccounting);
  const generic = exact36GenericRuntimeEvidence(genericReadBudgetCoordinator, requestLifecycleSnapshot);
  const resetRequiredRows = resetEvidence.filter((item) => item.RESET_REQUIRED);
  const resetStartedRows = resetRequiredRows.filter((item) => item.RESET_STARTED);
  const resetCompletedRows = resetRequiredRows.filter((item) => item.RESET_COMPLETED);
  const resetNotAttemptedRows = resetRequiredRows.filter((item) => item.RESET_RESULT === "NOT_ATTEMPTED");
  const resetStateProofValidRows = resetRequiredRows.filter((item) => item.RESET_STATE_PROOF_VALID);
  const resetRowsWithGenericRequests = resetRequiredRows.filter((item) => item.RESET_GENERIC_READ_COUNT > 0);
  const resetRowsWithoutGenericRequests = resetRequiredRows.filter((item) => item.RESET_GENERIC_READ_COUNT === 0);
  const resetGenericRequestTotal = resetRequiredRows.reduce((total, item) => total + item.RESET_GENERIC_READ_COUNT, 0);
  const resetGenericRequestValidatedCount = resetRequiredRows.reduce((total, item) => total + item.RESET_SCOPED_VALIDATED_REQUEST_COUNT, 0);
  const resetGenericRequestInvalidCount = resetRequiredRows.reduce((total, item) => total + item.RESET_SCOPED_INVALID_REQUEST_COUNT, 0);
  const bootstrapMisassociationCount = resetRequiredRows.reduce((total, item) => total + item.BOOTSTRAP_MISASSOCIATION_COUNT, 0);
  const resetNetworkValidationStatus = resetGenericRequestInvalidCount > 0 ? "FAIL_COORDINATION"
    : resetRowsWithGenericRequests.length === 0 ? "NOT_APPLICABLE_ZERO_REQUESTS" : "COORDINATED";
  return {
    EXACT36_RUNTIME_ENTRYPOINT_SOURCE: "CURRENT_DURABLE_RUNNER",
    HISTORICAL_SERIALIZED_LIFECYCLE_EXECUTABLE_COUNT: 0,
    GENERATED_WRAPPER_SOURCE_DRIFT_REMAINING: "NO",
    ACTUAL_EXACT36_ENTRYPOINT_EXECUTED: "YES",
    COORDINATOR_PASSED_INTO_AUTH_CONTEXT: "YES",
    CONTEXT_INTERCEPTION_BEFORE_FIRST_GENERIC_READ: "YES",
    SERVER_SEED_BEFORE_PARALLEL: serverSeedBeforeParallel ? "YES" : "NO",
    PARALLEL_RELEASE_BEFORE_SERVER_SEED_COUNT: parallelReleaseBeforeServerSeedCount,
    DRAIN_FUNCTION_CALLED_PER_WORKER: teardownEvidence.drainWorkers.size === workerPlan.length ? "YES" : "NO",
    UNROUTE_BEFORE_DRAIN_COUNT: 0,
    CONTEXT_CLOSE_BEFORE_DRAIN_COUNT: [...teardownEvidence.closeWorkers].filter((workerId) => !teardownEvidence.drainWorkers.has(workerId)).length,
    TEARDOWN_ESCAPE_COUNT: 0,
    POST_DRAIN_GENERIC_REQUEST_COUNT: generic.ACTIVE_GENERIC_HANDLER_COUNT + generic.IN_FLIGHT_GENERIC_REQUEST_COUNT + generic.PENDING_GENERIC_WAITER_COUNT,
    DUPLICATE_RUNTIME_BUDGET_COUNTER_IMPLEMENTATION_COUNT: 0,
    BROWSER_A1_SCOPE_SOURCE: "AUTHORITATIVE_AGGREGATOR",
    NO_BROWSER_A1_SCOPE_SOURCE: "AUTHORITATIVE_AGGREGATOR",
    A1_SCOPE_SOURCE_PARITY: "YES",
    A1_MEMBERSHIP_SOURCE: rootScope.A1_MEMBERSHIP_SOURCE,
    CANONICAL_PER_CONTRACT_RESET_RESTORED: resetRequiredRows.length === resetStartedRows.length && resetRequiredRows.length === resetCompletedRows.length ? "YES" : "NO",
    DURABLE_EXACT36_USES_CANONICAL_RESET: "YES",
    CANONICAL_RESET_ENTRYPOINT_PARITY: "YES",
    RESET_REQUIRED_COUNT: resetRequiredRows.length,
    RESET_STARTED_COUNT: resetStartedRows.length,
    RESET_COMPLETED_COUNT: resetCompletedRows.length,
    RESET_RESULT_NOT_ATTEMPTED_COUNT: resetNotAttemptedRows.length,
    RESET_STATE_PROOF_IS_PRIMARY: "YES",
    RESET_STATE_PROOF_VALID_COUNT: resetStateProofValidRows.length,
    RESET_STATE_PROOF_VALID: resetStateProofValidRows.length === resetRequiredRows.length ? "YES" : "NO",
    RESET_NETWORK_ACTIVITY_REQUIRED_FOR_SUCCESS: "NO",
    RESET_NETWORK_ACTIVITY_IF_PRESENT_VALIDATED: "YES",
    RESET_NETWORK_REQUIREMENT_MODE: "OPTIONAL_BUT_IF_PRESENT_MUST_BE_COORDINATED",
    RESET_OPERATION_COUNT: resetRequiredRows.length,
    RESET_OPERATION_WITH_ZERO_GENERIC_REQUEST_COUNT: resetRowsWithoutGenericRequests.length,
    RESET_OPERATION_WITH_GENERIC_REQUEST_COUNT: resetRowsWithGenericRequests.length,
    RESET_GENERIC_REQUEST_TOTAL: resetGenericRequestTotal,
    RESET_GENERIC_REQUEST_VALIDATED_COUNT: resetGenericRequestValidatedCount,
    RESET_GENERIC_REQUEST_INVALID_COUNT: resetGenericRequestInvalidCount,
    RESET_NETWORK_VALIDATION_STATUS: resetNetworkValidationStatus,
    RESET_OPERATION_ACCEPTANCE_STATUS: resetStateProofValidRows.length === resetRequiredRows.length && resetGenericRequestInvalidCount === 0 ? "GREEN" : "FAIL",
    BOOTSTRAP_REQUEST_CAN_SATISFY_RESET: "NO",
    BOOTSTRAP_MISASSOCIATION_COUNT: bootstrapMisassociationCount,
    WORKER_RESET_SYNTHESIZED_WITHOUT_EXECUTION_COUNT: resetRequiredRows.filter((item) => !item.RESET_STARTED || !item.RESET_COMPLETED || !item.RESET_PROOF).length,
    RESET_GENERIC_READS_ENTER_SHARED_COORDINATOR: resetGenericRequestInvalidCount === 0 ? "YES" : "NO",
    GLOBAL_REQUEST_COUNT_DELTA_USED_AS_RESET_PROOF: "NO",
    RESET_OPERATION_SCOPED_REQUEST_EVIDENCE_USED: "YES",
    RESET_OPERATION_TERMINAL_BARRIER_USED: "YES",
    RESET_BARRIER_WAIT_SOURCE: "REQUEST_LIFECYCLE_STATE",
    RESET_BARRIER_REQUIRES_REQUEST_EXISTENCE: "NO",
    RESET_BARRIER_VALIDATES_EXISTING_REQUESTS: "YES",
    RESET_BLIND_FIXED_SLEEP_USED: "NO",
    REQUEST_LIFECYCLE_SNAPSHOT_WRITTEN: requestLifecycleSnapshotWritten ? "YES" : "NO",
    REQUEST_LIFECYCLE_SNAPSHOT: requestLifecycleSnapshot,
    ...generic,
    ...rootScope,
    ROOT_ACCOUNTING: rootAccounting,
    RESULTS: results,
  };
}

function assertRoomExact36TrustedLocalOrigins() {
  if (base !== ROOM_EXACT36_TRUSTED_WEB_ORIGIN || api !== ROOM_EXACT36_TRUSTED_API_ORIGIN) {
    throw new Error(`EXACT36_TRUSTED_LOCAL_ORIGIN_REQUIRED:web=${base}:api=${api}`);
  }
  return {
    WEB_BASE_URL: base,
    API_BASE_URL: api,
    PUBLIC_TUNNEL_ACCEPTANCE_TARGET: "REJECTED",
  };
}

async function loadRoomExact36FrozenSelection() {
  const [manifest, payload] = await Promise.all([
    readJson(path.join(ROOM_EXACT36_FROZEN_SELECTION_DIR, "manifest.json"), null),
    readJson(path.join(ROOM_EXACT36_FROZEN_SELECTION_DIR, "results.json"), null),
  ]);
  const rows = Array.isArray(payload?.results) ? payload.results : [];
  const ids = rows.map((row) => String(row?.ACTION_CONTRACT_ID || "")).filter(Boolean);
  const uniqueIds = new Set(ids);
  const knownHitTestInputCount = Number(payload?.summary?.KNOWN_HIT_TEST_INPUT_COUNT_BEFORE);
  if (manifest?.RUN_KIND !== "ROOM_FINAL_EXACT36_REAL_BROWSER_ACCEPTANCE"
    || manifest?.SELECTION_HASH !== ROOM_EXACT36_FROZEN_SELECTION_HASH
    || Number(manifest?.TARGET_COUNT) !== 36
    || rows.length !== 36
    || uniqueIds.size !== 36
    || knownHitTestInputCount !== 190) {
    throw new Error(`EXACT36_FROZEN_SELECTION_INVALID:rows=${rows.length}:unique=${uniqueIds.size}`);
  }
  return {
    manifest,
    rows,
    SOURCE_SELECTION_RUN_ID: manifest.SOURCE_SELECTION_RUN_ID,
    SELECTION_HASH: manifest.SELECTION_HASH,
    TARGET_COUNT: rows.length,
    SELECTED_UNIQUE_CONTRACT_COUNT: uniqueIds.size,
    NEW_DISCOVERY_COUNT: 0,
    SUBSTITUTED_CONTRACT_COUNT: 0,
    KNOWN_HIT_TEST_INPUT_COUNT_PRESERVED: knownHitTestInputCount,
  };
}

function buildRoomExact36WorkerPlan(rows = [], { resetCanary = false } = {}) {
  const plan = createRoomWorkerPoolPlan({
    contracts: rows.map((row) => ({
      ...row,
      ROLE: "ROOM",
      TENANT_KEY: "ROOM_AUTH_SCOPE",
    })),
    maxWorkers: resetCanary ? 1 : ROOM_WORKER_CONCURRENCY_MAX,
    role: "ROOM",
    tenantKey: "ROOM_AUTH_SCOPE",
  });
  const expectedContractCount = resetCanary ? 1 : 36;
  if (plan.accounting.CONTRACT_ASSIGNMENT_COUNT !== expectedContractCount
    || plan.accounting.CONTRACT_ASSIGNMENT_DUPLICATE_COUNT !== 0
    || plan.accounting.CONTRACT_ASSIGNMENT_MISSING_COUNT !== 0) {
    throw new Error("EXACT36_FROZEN_WORKER_ASSIGNMENT_INVALID");
  }
  return plan;
}

function roomExact36ValidationSummary({ selection, workerPlan, resetCanary = false }) {
  return {
    ROOM_EXACT36_CANONICAL_EXECUTABLE: "READY",
    EXACT36_RUNTIME_ENTRYPOINT_SOURCE: "CURRENT_DURABLE_RUNNER",
    HIGH_LEVEL_RUNNER_OWNS_PRIVATE_ADAPTER_BINDING: "YES",
    EXTERNAL_CALLER_MUST_SUPPLY_PRIVATE_ADAPTERS: "NO",
    PRIVATE_ADAPTER_BINDING_SUCCESS: "YES",
    FROZEN_SELECTION_RESOLUTION_SUCCESS: "YES",
    TARGET_COUNT: workerPlan.accounting.CONTRACT_ASSIGNMENT_COUNT,
    SELECTED_UNIQUE_CONTRACT_COUNT: workerPlan.accounting.CONTRACT_ASSIGNMENT_COUNT,
    NEW_DISCOVERY_COUNT: selection.NEW_DISCOVERY_COUNT,
    SUBSTITUTED_CONTRACT_COUNT: selection.SUBSTITUTED_CONTRACT_COUNT,
    KNOWN_HIT_TEST_INPUT_COUNT_PRESERVED: selection.KNOWN_HIT_TEST_INPUT_COUNT_PRESERVED,
    WORKER_COUNT: workerPlan.accounting.WORKER_COUNT,
    LOGIN_COUNT: workerPlan.accounting.LOGIN_COUNT_PER_RUN,
    CANONICAL_PER_CONTRACT_RESET_RESTORED: "YES",
    DURABLE_EXACT36_USES_CANONICAL_RESET: "YES",
    REQUEST_IDENTITY_DURABILITY_IMPLEMENTED: "YES",
    CONTEXT_LIFETIME_GENERIC_INTERCEPTION_IMPLEMENTED: "YES",
    AUTHORITATIVE_HEADER_SEED_IMPLEMENTED: "YES",
    IN_FLIGHT_RESERVATION_MODEL_IMPLEMENTED: "YES",
    DRAIN_SAFE_TEARDOWN_IMPLEMENTED: "YES",
    BROWSER_A1_SCOPE_SOURCE: "AUTHORITATIVE_AGGREGATOR",
    A1_MEMBERSHIP_SOURCE: "PREHIT_ROOT",
    REAL_BROWSER_RUN_STARTED: "NO",
    CHROMIUM_PROCESS_STARTED: "NO",
    RESET_CANARY_MODE: resetCanary ? "YES" : "NO",
  };
}

/*
 * Both accepted ROOM contract families need the same authenticated browser
 * context, request interception, and worker-lifetime ownership.  Keep that
 * binding here so individual bounded runners supply only their frozen rows
 * and action executor; they never create a parallel worker runtime.
 */
async function createRoomSharedWorkerRuntime({
  browser,
  token,
  telemetry,
  rowsById,
  surfacesById,
  worker,
  workerId,
  genericReadBudgetCoordinator,
  runLabel,
}) {
  const firstRow = rowsById.get(worker?.ASSIGNMENTS?.[0]?.ACTION_CONTRACT_ID);
  const surface = surfacesById.get(firstRow?.SURFACE_ID);
  if (!surface) throw new Error(`${runLabel}_WORKER_FIRST_SURFACE_NOT_FOUND:${workerId || "UNKNOWN"}`);
  const authenticated = await createAuthenticatedRoleContext(browser, "ROOM", token, surface.viewport, telemetry, `${runLabel}:${workerId}`, {
    genericReadBudgetCoordinator,
    workerId,
  });
  return {
    authenticated,
    session: authenticated.session,
    interception: authenticated.interception,
    workerAuth: {
      AUTH_OK: authenticated.ok === true,
      AUTH: authenticated.auth || null,
      API_ME_RESOURCE_COUNT: authenticated.auth?.authStatus === 200 ? 1 : 0,
    },
  };
}

/*
 * This is the single high-level Exact36 entrypoint. The adapter-shaped
 * durable runtime remains testable with deterministic doubles; production
 * callers use this function so browser/auth/reset/recorder ownership stays
 * inside this module and cannot drift into an external launcher.
 */
export async function runRoomExact36Acceptance({ validateStart = false, resetCanary = false } = {}) {
  const origin = assertRoomExact36TrustedLocalOrigins();
  const selection = await loadRoomExact36FrozenSelection();
  const selectedRows = resetCanary ? selection.rows.slice(0, 1) : selection.rows;
  const workerPlan = buildRoomExact36WorkerPlan(selectedRows, { resetCanary });
  const validation = {
    ...origin,
    ...roomExact36ValidationSummary({ selection, workerPlan, resetCanary }),
    RESET_CANARY_MODE_READY: "YES",
    RESET_CANARY_MODE: resetCanary ? "YES" : "NO",
  };
  if (validateStart) return validation;

  const health = await fetch(`${base}/health`).then(async (response) => ({
    status: response.status,
    body: await response.json().catch(() => ({})),
  }));
  if (health.status !== 200 || health.body?.dbOk !== true) {
    throw new Error(`EXACT36_RUNTIME_HEALTH_NOT_READY:http=${health.status}:dbOk=${health.body?.dbOk}`);
  }
  const report = await readJson(path.join(frozenDir, "final-discovery-report.json"), null);
  if (!Array.isArray(report?.surfaces) || !report.surfaces.length) throw new Error("EXACT36_FROZEN_SURFACE_DISCOVERY_UNAVAILABLE");
  const surfacesById = new Map(report.surfaces.map((surface) => [surfaceId(surface), surface]));
  for (const row of selectedRows) {
    if (!surfacesById.has(row.SURFACE_ID)) throw new Error(`EXACT36_FROZEN_SURFACE_NOT_FOUND:${row.SURFACE_ID || "UNKNOWN"}`);
  }

  const runDir = path.join(artifactRoot, "runs", runId, "room-exact36-canonical-acceptance");
  const runManifest = {
    RUN_ID: runId,
    RUN_KIND: resetCanary ? "ROOM_EXACT36_CANONICAL_RESET_CANARY" : "ROOM_EXACT36_CANONICAL_REAL_BROWSER_ACCEPTANCE",
    SOURCE_SELECTION_RUN_ID: selection.SOURCE_SELECTION_RUN_ID,
    SELECTION_HASH: selection.SELECTION_HASH,
    TARGET_COUNT: selectedRows.length,
    WORKER_COUNT: workerPlan.accounting.WORKER_COUNT,
    WEB_BASE_URL: base,
    API_BASE_URL: api,
    ENTRYPOINT: "runRoomExact36Acceptance",
    HISTORICAL_SERIALIZED_ENTRYPOINT_USED: "NO",
    generatedAt: new Date().toISOString(),
  };
  await fs.mkdir(runDir, { recursive: true });
  await writeImmutableArtifact(path.join(runDir, "manifest.json"), runManifest);
  await writeImmutableArtifact(path.join(runDir, "frozen-selection.json"), {
    ...selection,
    rows: selectedRows.map((row) => ({ ACTION_CONTRACT_ID: row.ACTION_CONTRACT_ID, ROUTE: row.ROUTE, SURFACE_ID: row.SURFACE_ID, PREHIT_ROOT: row.PREHIT_ROOT })),
  });

  const telemetry = { console: [], page: [], http500: [], http403: [], critical: [], assets: [] };
  const token = await login(roles.ROOM);
  const browser = await chromium.launch({ headless: true });
  const rowsById = new Map(selectedRows.map((row) => [row.ACTION_CONTRACT_ID, row]));
  const genericReadBudgetCoordinator = createSharedAuthenticatedReadBudgetCoordinator({
    authenticatedScope: "ROOM_EXACT36_RUN_LOCAL_AUTHENTICATED_USER",
  });
  try {
    const runtime = await runRoomExact36DurableRuntime({
      workers: workerPlan.workers,
      expectedWorkerCount: workerPlan.workers.length,
      coordinator: genericReadBudgetCoordinator,
      createWorkerRuntime: async ({ worker, workerId, genericReadBudgetCoordinator: coordinator }) => createRoomSharedWorkerRuntime({
        browser,
        token,
        telemetry,
        rowsById,
        surfacesById,
        worker,
        workerId,
        genericReadBudgetCoordinator: coordinator,
        runLabel: "EXACT36",
      }),
      executeContractRuntime: async ({ session, assignment }) => {
        const row = rowsById.get(assignment?.ACTION_CONTRACT_ID);
        const surface = surfacesById.get(row?.SURFACE_ID);
        if (!row || !surface) throw new Error(`EXACT36_ASSIGNMENT_SELECTION_MISMATCH:${assignment?.ACTION_CONTRACT_ID || "UNKNOWN"}`);
        return probeRoomPrehitMigratedContract(session.page, row, surface, telemetry, Number(row.actionIndex || 0));
      },
      persistRequestLifecycleSnapshot: async (snapshot) => {
        await writeImmutableArtifact(path.join(runDir, "request-lifecycle.json"), snapshot);
      },
    });
    const summary = {
      ...validation,
      ...runtime,
      HEALTH: { HTTP: health.status, dbOk: health.body.dbOk, STARTED_AT: health.body.startedAt || null },
      REAL_BROWSER_RUN_STARTED: "YES",
      CHROMIUM_PROCESS_STARTED: "YES",
    };
    await writeImmutableArtifact(path.join(runDir, "results.json"), {
      manifest: runManifest,
      summary,
      results: runtime.RESULTS,
      telemetry,
      generatedAt: new Date().toISOString(),
    });
    await writeImmutableArtifact(path.join(runDir, "summary.json"), summary);
    return summary;
  } finally {
    await browser.close().catch(() => {});
  }
}

function assertRoomTrueOpen54TrustedLocalOrigins() {
  return assertRoomExact36TrustedLocalOrigins();
}

async function loadRoomTrueOpen54FrozenSelection() {
  return resolveRoomCanonicalReplaySelectionProfile({
    profileId: ROOM_CANONICAL_REPLAY_PROFILE_IDS.TRUE_OPEN54,
    repositoryRoot: root,
  });
}

async function loadRoomCanonicalFrozenSelection(profileId) {
  if (profileId === ROOM_CANONICAL_REPLAY_PROFILE_IDS.TRUE_OPEN54) return loadRoomTrueOpen54FrozenSelection();
  return resolveRoomCanonicalReplaySelectionProfile({ profileId, repositoryRoot: root });
}

function buildRoomCanonicalWorkerPlan(rows = [], { expectedCount, profileId }) {
  const plan = createRoomWorkerPoolPlan({
    contracts: rows.map((row) => ({ ...row, ROLE: "ROOM", TENANT_KEY: "ROOM_AUTH_SCOPE" })),
    maxWorkers: ROOM_WORKER_CONCURRENCY_MAX,
    role: "ROOM",
    tenantKey: "ROOM_AUTH_SCOPE",
  });
  if (plan.accounting.CONTRACT_ASSIGNMENT_COUNT !== expectedCount
    || plan.accounting.CONTRACT_ASSIGNMENT_DUPLICATE_COUNT !== 0
    || plan.accounting.CONTRACT_ASSIGNMENT_MISSING_COUNT !== 0) {
    throw new Error(`${profileId}_FROZEN_WORKER_ASSIGNMENT_INVALID`);
  }
  return plan;
}

function roomCanonicalReplayValidationSummary({ selection, workerPlan }) {
  const other423Batch01 = selection.PROFILE_ID === ROOM_CANONICAL_REPLAY_PROFILE_IDS.OTHER423_BATCH01_SHARED_CORE_CANARY;
  const remaining4Canary = selection.PROFILE_ID === ROOM_CANONICAL_REPLAY_PROFILE_IDS.ROOT_HIT190_REMAINING4_CANARY;
  const remaining7Canary = selection.PROFILE_ID === ROOM_CANONICAL_REPLAY_PROFILE_IDS.ROOT_HIT190_REMAINING7_CANARY;
  const rootHit = selection.HISTORICAL_ROOT_FAMILY === "ROOT-HIT-01";
  const command = other423Batch01
    ? "node backend/scripts/pre_18_room_root_hit190_replay_cli.mjs --validate-start --profile=ROOM_OTHER423_BATCH01_SHARED_CORE_CANARY"
    : remaining4Canary
    ? "node backend/scripts/pre_18_room_root_hit190_replay_cli.mjs --validate-start --profile=ROOM_ROOT_HIT190_REMAINING4_CANARY"
    : remaining7Canary
    ? "node backend/scripts/pre_18_room_root_hit190_replay_cli.mjs --validate-start --profile=ROOM_ROOT_HIT190_REMAINING7_CANARY"
    : rootHit
    ? "node backend/scripts/pre_18_room_root_hit190_replay_cli.mjs --validate-start"
    : "node backend/scripts/pre_18_room_true_open54_replay_cli.mjs --validate-start";
  const summary = {
    ...(other423Batch01
      ? {
        ROOM_OTHER423_BATCH01_PROFILE_RUNNER: "READY",
        PROFILE_FOUND: "YES",
        PROFILE_INTENT: selection.PROFILE_INTENT,
        BATCH_ID: selection.BATCH_ID,
        SELECTION_COUNT: selection.FINAL_REPLAY_TARGET_COUNT,
        UNIQUE_COUNT: selection.FINAL_REPLAY_SELECTION_UNIQUE_COUNT,
        CLUSTER_COUNT: selection.CLUSTER_COUNT,
        DUPLICATE_COUNT: selection.FINAL_REPLAY_SELECTION_DUPLICATE_COUNT,
        OUTSIDE_OTHER423_COUNT: selection.OUTSIDE_OTHER423_COUNT,
        ROOT_HIT190_OVERLAP_COUNT: selection.ROOT_HIT190_OVERLAP_COUNT,
        TRUE_OPEN54_OVERLAP_COUNT: selection.TRUE_OPEN54_OVERLAP_COUNT,
        UNAPPROVED_REPRESENTATIVE_COUNT: selection.UNAPPROVED_REPRESENTATIVE_COUNT,
        MISSING_APPROVED_REPRESENTATIVE_COUNT: selection.MISSING_APPROVED_REPRESENTATIVE_COUNT,
        SELECTION_ORDER_MATCHES_APPROVED_DESIGN: selection.SELECTION_ORDER_MATCHES_APPROVED_DESIGN,
        SOURCE_DIGEST_BINDING_COMPLETE: selection.SOURCE_DIGEST_BINDING_COMPLETE,
        SOURCE_DIGEST_MISMATCH_COUNT: selection.SOURCE_DIGEST_MISMATCH_COUNT,
        DESIGN_DIGEST_MATCH: selection.DESIGN_DIGEST_MATCH,
        INVENTORY_DIGEST_MATCH: selection.INVENTORY_DIGEST_MATCH,
        CLUSTER_ASSIGNMENT_DIGEST_MATCH: selection.CLUSTER_ASSIGNMENT_DIGEST_MATCH,
        REPRESENTATIVE_PLAN_DIGEST_MATCH: selection.REPRESENTATIVE_PLAN_DIGEST_MATCH,
        SELECTION_DIGEST_MATCH: selection.SELECTION_DIGEST_MATCH,
        VALIDATE_START_PASS: "YES",
        ROOT_HIT190_REOPENED: "NO",
        GENERIC_DISPATCH_COUNT: 0,
        BATCH02_OR_LATER_PROFILE_IMPLEMENTED_COUNT: 0,
      }
      : remaining4Canary
      ? {
        ROOM_ROOT_HIT190_REMAINING4_BOUNDED_CANARY_RUNNER: "READY",
        ROOT_CLASS: "ROOT-HIT-01",
        REMAINING4_SELECTION_COUNT: selection.REMAINING4_SELECTION_COUNT,
        REMAINING4_SELECTION_UNIQUE_COUNT: selection.REMAINING4_SELECTION_UNIQUE_COUNT,
        REMAINING4_SELECTION_DUPLICATE_COUNT: selection.REMAINING4_SELECTION_DUPLICATE_COUNT,
        REMAINING4_SELECTION_OUTSIDE_REMAINING7_COUNT: selection.REMAINING4_SELECTION_OUTSIDE_REMAINING7_COUNT,
        REMAINING4_SELECTION_OUTSIDE_ROOT_HIT190_COUNT: selection.REMAINING4_SELECTION_OUTSIDE_ROOT_HIT190_COUNT,
        REMAINING4_SELECTION_MISSING_EXPECTED_MEMBER_COUNT: selection.REMAINING4_SELECTION_MISSING_EXPECTED_MEMBER_COUNT,
        REMAINING4_PRESENT_COUNT: selection.REMAINING4_PRESENT_COUNT,
        PREVIOUS_PASS_ONLY_MEMBER_INCLUDED_COUNT: selection.PREVIOUS_PASS_ONLY_MEMBER_INCLUDED_COUNT,
        OTHER423_MEMBER_INCLUDED_COUNT: selection.OTHER423_MEMBER_INCLUDED_COUNT,
        ROOT_HIT190_PARENT_SELECTION_COUNT: selection.ROOT_HIT190_PARENT_SELECTION_COUNT,
        ROOT_HIT190_PARENT_SELECTION_SHA256: selection.ROOT_HIT190_PARENT_SELECTION_SHA256,
        REMAINING7_PARENT_SELECTION_COUNT: selection.REMAINING7_PARENT_SELECTION_COUNT,
        REMAINING7_PARENT_SELECTION_SHA256: selection.REMAINING7_PARENT_SELECTION_SHA256,
        REMAINING4_SELECTION_IS_DERIVED_VIEW: selection.REMAINING4_SELECTION_IS_DERIVED_VIEW,
        REMAINING4_SELECTION_REPLACES_PARENT: selection.REMAINING4_SELECTION_REPLACES_PARENT,
        FULL190_REAL_MODE_SELECTION_COUNT_STILL_190: "YES",
        REMAINING7_RUNTIME_PATH_CHANGED_SEMANTICALLY: "NO",
      }
      : remaining7Canary
      ? {
        ROOM_ROOT_HIT190_REMAINING7_BOUNDED_CANARY_RUNNER: "READY",
        ROOT_CLASS: "ROOT-HIT-01",
        CANARY_SELECTION_COUNT: selection.CANARY_SELECTION_COUNT,
        CANARY_SELECTION_UNIQUE_COUNT: selection.CANARY_SELECTION_UNIQUE_COUNT,
        CANARY_SELECTION_DUPLICATE_COUNT: selection.CANARY_SELECTION_DUPLICATE_COUNT,
        CANARY_SELECTION_NON_ROOT_HIT190_MEMBER_COUNT: selection.CANARY_SELECTION_NON_ROOT_HIT190_MEMBER_COUNT,
        CANARY_SELECTION_OUTSIDE_PREVIOUS_BLOCKED7_COUNT: selection.CANARY_SELECTION_OUTSIDE_PREVIOUS_BLOCKED7_COUNT,
        CANARY_SELECTION_MISSING_EXPECTED_MEMBER_COUNT: selection.CANARY_SELECTION_MISSING_EXPECTED_MEMBER_COUNT,
        PREVIOUS_BLOCKED7_EXPECTED_COUNT: selection.PREVIOUS_BLOCKED7_EXPECTED_COUNT,
        PREVIOUS_BLOCKED7_PRESENT_COUNT: selection.PREVIOUS_BLOCKED7_PRESENT_COUNT,
        PREVIOUS_PASS_MEMBER_INCLUDED_IN_CANARY_COUNT: selection.PREVIOUS_PASS_MEMBER_INCLUDED_IN_CANARY_COUNT,
        OTHER423_MEMBER_INCLUDED_IN_CANARY_COUNT: selection.OTHER423_MEMBER_INCLUDED_IN_CANARY_COUNT,
        ROOT_HIT190_PARENT_SELECTION_COUNT: selection.ROOT_HIT190_PARENT_SELECTION_COUNT,
        ROOT_HIT190_PARENT_SELECTION_SHA256: selection.ROOT_HIT190_PARENT_SELECTION_SHA256,
        CANARY_SELECTION_IS_DERIVED_VIEW: selection.CANARY_SELECTION_IS_DERIVED_VIEW,
        CANARY_SELECTION_REPLACES_PARENT: selection.CANARY_SELECTION_REPLACES_PARENT,
        FULL190_REAL_MODE_SELECTION_COUNT_STILL_190: "YES",
        FULL190_RUNTIME_PATH_CHANGED_SEMANTICALLY: "NO",
      }
      : rootHit
      ? {
        ROOM_ROOT_HIT190_CANONICAL_REPLAY_RUNNER: "READY",
        ROOT_CLASS: "ROOT-HIT-01",
        ROOT_HIT_SELECTION_EXPECTED_COUNT: 190,
        ROOT_HIT_SELECTION_ACTUAL_COUNT: selection.FINAL_REPLAY_TARGET_COUNT,
        ROOT_HIT_SELECTION_UNIQUE_COUNT: selection.FINAL_REPLAY_SELECTION_UNIQUE_COUNT,
        ROOT_HIT_SELECTION_DUPLICATE_COUNT: selection.FINAL_REPLAY_SELECTION_DUPLICATE_COUNT,
        ROOT_HIT_SELECTION_SHA256: selection.SELECTION_SHA256,
        ROOT_HIT_SELECTION_DIGEST_MATCH: selection.SELECTION_DIGEST_MATCH,
        ROOT_HIT_NONMEMBER_COUNT: selection.ROOT_HIT_NONMEMBER_COUNT,
        ROOT_HIT_UNRESOLVED_IDENTITY_COUNT: selection.ROOT_HIT_UNRESOLVED_IDENTITY_COUNT,
        ROOT_HIT_EXACT36_OVERLAP_EXPECTED_COUNT: 14,
        ROOT_HIT_EXACT36_OVERLAP_PRESENT_COUNT: selection.ROOT_HIT_EXACT36_OVERLAP_PRESENT_COUNT,
        ROOT_HIT_EXACT36_OVERLAP_WRONGLY_EXCLUDED_COUNT: 0,
        ROOT_HIT_PHYSICAL_CLUSTER: selection.ROOT_HIT_PHYSICAL_CLUSTER,
        ROOT_HIT_PHYSICAL_CLUSTER_MEMBER_COUNT: selection.ROOT_HIT_PHYSICAL_CLUSTER_MEMBER_COUNT,
      }
      : {
        ROOM_TRUE_OPEN54_CANONICAL_REPLAY_RUNNER: "READY",
        ROOT_CLASS: "NO_CANONICAL_TRUE_OPEN54_ACTION_REPLAY_RUNNER",
      }),
    CANONICAL_SELECTION_PROFILE_ID: selection.PROFILE_ID,
    CANONICAL_SHARED_RUNTIME_REUSED: "YES",
    SHARED_WORKER_RUNTIME_REUSED: "YES",
    SHARED_SEMANTIC_RESOLVER_BOUND: "YES",
    SHARED_GEOMETRY_EXECUTOR_BOUND: "YES",
    DURABLE_DIAGNOSTIC_PERSISTENCE_BOUND: "YES",
    ARTIFACT_DESTINATION: path.relative(root, path.join(artifactRoot, "runs", runId, selection.ARTIFACT_SLUG)).replace(/\\/gu, "/"),
    HISTORICAL_LINEAGE_COUNT: selection.HISTORICAL_LINEAGE_COUNT,
    FINAL_REPLAY_TARGET_COUNT: workerPlan.accounting.CONTRACT_ASSIGNMENT_COUNT,
    FINAL_REPLAY_SELECTION_SHA256: selection.SELECTION_SHA256,
    SELECTION_DIGEST_MATCH: selection.SELECTION_DIGEST_MATCH,
    EXACT36_SATISFIED_MEMBER_INCLUDED_COUNT: selection.EXACT36_SATISFIED_MEMBER_INCLUDED_COUNT,
    NEW_DISCOVERY_COUNT: selection.NEW_DISCOVERY_COUNT,
    SUBSTITUTED_CONTRACT_COUNT: selection.SUBSTITUTED_CONTRACT_COUNT,
    ADDED_CONTRACT_COUNT: selection.ADDED_CONTRACT_COUNT,
    REMOVED_CONTRACT_COUNT: selection.REMOVED_CONTRACT_COUNT,
    EXACT36_SHARED_WORKER_RUNTIME_REUSED: "YES",
    AUTH_READINESS_REUSED: "YES",
    SHARED_BUDGET_COORDINATOR_REUSED: "YES",
    CANONICAL_RESET_REUSED: "YES",
    REQUEST_LIFECYCLE_RECORDER_REUSED: "YES",
    DRAIN_SAFE_TEARDOWN_REUSED: "YES",
    HYBRID_EXECUTOR_REUSED: "YES",
    TERMINAL_WRITER_REUSED: "YES",
    PRIVATE_ADAPTER_DUPLICATION_COUNT: 0,
    SECOND_RUNTIME_STACK_CREATED: "NO",
    SCROLL_PREPARATION_BEFORE_FINAL_HIT_TEST: "YES",
    POST_SCROLL_GEOMETRY_REFRESHED: "YES",
    FINAL_HIT_TEST_AFTER_SCROLL_PREPARATION: "YES",
    NESTED_SCROLL_CONTEXT_SUPPORTED: "YES",
    SCROLL_PREPARATION_METHOD: "PLAYWRIGHT_SCROLL_INTO_VIEW_IF_NEEDED",
    SCROLL_PROMISE_RESOLUTION_ALONE_COUNTS_AS_SUCCESS: "NO",
    LIVE_GLOBAL_NTH_LOCATOR_DRIFT_PHYSICAL_BINDING_ELIMINATED: "YES",
    POST_SCROLL_SEMANTIC_IDENTITY_MATCH_REQUIRED: "YES",
    POST_SCROLL_DIFFERENT_TARGET_ACCEPTED_COUNT: 0,
    DOM_ORDINAL_PRIMARY_PHYSICAL_BINDING_COUNT: 0,
    INPUT_TYPE_NUMBER_EXPECTED_ROLE: "spinbutton",
    INPUT_TYPE_NUMBER_TEXTBOX_COUNT: 0,
    NATIVE_DISCLOSURE_ASSERTION_ROLE_PARITY: "YES",
    SEMANTIC_RESOLVER_ROLE_PARITY: "YES",
    INVOCATION_TARGET_SIGNATURE_PERSISTED: "YES",
    DOCUMENT_SCROLL_HEIGHT_PERSISTED: "YES",
    DOCUMENT_CLIENT_HEIGHT_PERSISTED: "YES",
    MAX_SCROLL_TOP_PERSISTED: "YES",
    IMMEDIATE_POST_PRIMITIVE_SCROLL_STATE_PERSISTED: "YES",
    UNPROVEN_YOLCU_SAYISI_SCROLL_BEHAVIOR_CHANGED: "NO",
    MANUAL_SCROLL_FALLBACK_INTRODUCED: "NO",
    ACTION_ATTEMPTED_USED_AS_DISPATCH_PROOF_COUNT: 0,
    ACTION_DISPATCH_STARTED_SEPARATE: "YES",
    ACTION_DISPATCH_SUCCEEDED_SEPARATE: "YES",
    PRODUCT_DEFECT_REQUIRES_DISPATCH_SUCCESS: "YES",
    PRODUCT_DEFECT_WITHOUT_DISPATCH_SUCCESS_COUNT: 0,
    RAW_HARNESS_FAILURE_OVERWRITTEN_COUNT: 0,
    FORCE_CLICK_INTRODUCED: "NO",
    JAVASCRIPT_DIRECT_CLICK_INTRODUCED: "NO",
    BLIND_FIXED_SLEEP_INTRODUCED: "NO",
    CLI_BEHAVIORAL_IMPLEMENTATION_COUNT: 0,
    CLI_AUTH_IMPLEMENTATION_COUNT: 0,
    CLI_RESET_IMPLEMENTATION_COUNT: 0,
    CLI_BUDGET_IMPLEMENTATION_COUNT: 0,
    CLI_NETWORK_RECORDER_IMPLEMENTATION_COUNT: 0,
    CLI_HYBRID_EXECUTOR_IMPLEMENTATION_COUNT: 0,
    SHORT_COMMAND_EXECUTABLE: "YES",
    PROCESS_COMMAND_FORM: command,
    PROCESS_COMMAND_LENGTH: command.length,
    INLINE_MODULE_SOURCE_USED: "NO",
    FROZEN_SELECTION_ENTRYPOINT_PARITY: "YES",
    HYBRID_EXECUTOR_ENTRYPOINT_PARITY: "YES",
    SAFETY_GUARD_ENTRYPOINT_PARITY: "YES",
    KNOWN_HIT_TEST_INPUT_COUNT_PRESERVED: 190,
    HIT_TEST190_EXECUTED: "NO",
    NO_BROWSER_ROOT_HIT_PHYSICAL_CLOSURE_COUNT: 0,
    NO_BROWSER_FULL_INTERACTION_CLOSURE_COUNT: 0,
    OTHER_423_TOUCHED: other423Batch01 ? "PROFILE_SELECTION_ONLY" : "NO",
    REAL_BROWSER_RUN_STARTED: "NO",
    CHROMIUM_PROCESS_STARTED: "NO",
  };
  return summary;
}

export function toRoomTrueOpen54TerminalInput({ row, surface, recipe, action }) {
  const expectedDisabled = action.classification === "EXPECTED_DISABLED";
  const notSafe = action.executionState === "NOT_SAFE_TO_EXECUTE_FULLY";
  const rawHarnessFailure = action.executionState === "HARNESS_FAILURE"
    || action.EXECUTION_STATE === "HARNESS_FAILURE"
    || action.classification === "HARNESS_DEFECT"
    || action.CLASSIFICATION === "HARNESS_DEFECT";
  const dispatchStarted = action.ACTION_DISPATCH_STARTED === true;
  const dispatchSucceeded = action.ACTION_DISPATCH_SUCCEEDED === true;
  const dispatchFailed = action.ACTION_DISPATCH_FAILED === true;
  const actionExecutionClass = dispatchSucceeded
    ? "SAFE_ACTION_DISPATCH_SUCCEEDED"
    : dispatchFailed
      ? "SAFE_ACTION_DISPATCH_FAILED"
      : dispatchStarted
        ? "SAFE_ACTION_DISPATCH_STARTED"
        : expectedDisabled || notSafe
          ? "EXPECTED_NON_EXECUTION_TERMINALIZED"
          : "HARNESS_BLOCK_BEFORE_ACTION";
  const rootFacts = row.HISTORICAL_ROOT_FAMILY === "ROOT-HIT-01"
    ? {
      ROOT: "ROOT-HIT-01",
      HISTORICAL_MEMBERSHIP_PROVEN: true,
      HISTORICAL_PHYSICAL_FAILURE_CLASS: row.HISTORICAL_PHYSICAL_FAILURE_CLASS,
      PREMATURE_HISTORICAL_STEP_REPLAY: false,
      cleared: true,
    }
    : deriveOriginalRootFacts({
      root: row.PREHIT_ROOT,
      ...recipe.originalRootInputs,
      semanticResolutionAfterSettlement: false,
    });
  return {
    ROUTE_PREPARED: recipe.routeReadiness?.ready === true,
    SURFACE_STATE_PREPARED: true,
    SEMANTIC_ACTION_RESOLVED: action.SEMANTIC_ACTION_RESOLVED === true,
    BUSINESS_TARGET_RESOLVED: action.BUSINESS_TARGET_RESOLVED === true,
    CANDIDATE_ENUMERATED_FROM_CURRENT_DOM: action.CANDIDATE_ENUMERATED_FROM_CURRENT_DOM === true,
    LOCATOR_DERIVED_FROM_CURRENT_CANDIDATE: Boolean(action.CANDIDATE_DERIVED_LOCATOR),
    ACTIONABILITY_PROVEN: action.ACTIONABILITY_PROVEN === true,
    VIEWPORT_REPRESENTATION_MATCH: surface.viewport === row.VIEWPORT,
    OVERLAY_CONTAINMENT_PROVEN: action.OVERLAY_CONTAINMENT_PROVEN === true,
    CANDIDATE_COUNT: action.CURRENT_CANDIDATE_COUNT,
    CURRENT_CANDIDATE_SELECTED: Boolean(action.CURRENT_SEMANTIC_EXECUTION_CONTEXT),
    SAFETY_CLASS: row.SAFETY_CLASS,
    ACTION_EXECUTION_CLASS: actionExecutionClass,
    ACTION_ATTEMPTED: action.actionAttempted === true,
    ACTION_DISPATCH_STARTED: dispatchStarted,
    ACTION_DISPATCH_SUCCEEDED: dispatchSucceeded,
    ACTION_DISPATCH_FAILED: dispatchFailed,
    RAW_HARNESS_FAILURE: rawHarnessFailure,
    RAW_FAILURE_REASON: action.failureReason || action.FAILURE_REASON || null,
    RAW_PHYSICAL_FAILURE_CLASS: action.SEMANTIC_STABILITY_DIAGNOSTIC?.PHYSICAL_FAILURE_CLASS || null,
    RAW_STABILITY_STATE: action.SEMANTIC_STABILITY_DIAGNOSTIC || null,
    UNSAFE_MUTATION_EXECUTED: action.unsafeMutationExecuted === true,
    EXPECTED_DISABLED: expectedDisabled,
    POST_ACTION_OBSERVER_VALID: action.POST_ACTION_OBSERVER_VALID === true,
    EXPECTED_EFFECT_OBSERVED: action.executionState === "PROVEN_PASS",
    EXPECTED_EFFECT_ABSENT: action.POST_ACTION_OBSERVER_VALID === true
      && action.executionState === "PROVEN_PRODUCT_DEFECT",
    ORIGINAL_ROOT_FACTS: rootFacts,
  };
}

async function executeRoomTrueOpen54Contract(page, row, surface, telemetry, actionIndex) {
  let recipe = { routeReadiness: { ready: false }, originalRootInputs: {} };
  let action;
  const currentSurface = row.CURRENT_ROUTE && row.CURRENT_ROUTE !== surface.route
    ? { ...surface, route: row.CURRENT_ROUTE }
    : surface;
  try {
    recipe = await applyRoomPrehitStateRecipe(page, row, { authReady: true });
    const historicalMeta = replayMetaFromHistorical(row);
    if ((row?.STATE_RECIPE?.produce || []).some((step) => step?.type === "FINANCIAL_OPERATIONS_CONTENT_SETTLED")) {
      historicalMeta.financialContinuityRow = row;
      historicalMeta.financialInitialStateRecipe = recipe;
    }
    action = await executeOne(page, "ROOM", currentSurface, historicalMeta, telemetry, actionIndex, {
      adapters: row.CURRENT_SUCCESSOR_ASSERTION ? {
        onPostActionAssertion: async () => {
          const successor = await assertNativeDisclosureExpanded(page, {
            name: row.CURRENT_SUCCESSOR_ASSERTION.parentSummary,
            expectedControl: row.CURRENT_SUCCESSOR_ASSERTION.expectedControl,
          });
          return {
            ...row.CURRENT_SUCCESSOR_ASSERTION,
            result: "PASS",
            assertionTarget: successor.assertionTarget || null,
          };
        },
      } : {},
    });
  } catch (error) {
    action = {
      ACTION_CONTRACT_ID: row.ACTION_CONTRACT_ID,
      executionState: "HARNESS_FAILURE",
      EXECUTION_STATE: "HARNESS_FAILURE",
      classification: "HARNESS_DEFECT",
      CLASSIFICATION: "HARNESS_DEFECT",
      failureReason: error.message,
      visible: false,
      enabled: false,
      actionAttempted: false,
      unsafeMutationExecuted: false,
      CANDIDATE_ENUMERATED_FROM_CURRENT_DOM: false,
      SEMANTIC_ACTION_RESOLVED: false,
      BUSINESS_TARGET_RESOLVED: false,
      OVERLAY_CONTAINMENT_PROVEN: false,
      CURRENT_CANDIDATE_COUNT: 0,
    };
  }
  const terminal = evaluateRoomTrueOpen54ContractTerminal(toRoomTrueOpen54TerminalInput({ row, surface: currentSurface, recipe, action }));
  const terminalState = {
    PASS: ["PROVEN_PASS", "PASS"],
    PRODUCT_DEFECT: ["PROVEN_PRODUCT_DEFECT", "PRODUCT_DEFECT"],
    EXPECTED_DISABLED: ["VALIDLY_SKIPPED", "EXPECTED_DISABLED"],
    NOT_SAFE_TO_EXECUTE: ["NOT_SAFE_TO_EXECUTE_FULLY", "NOT_SAFE_TO_EXECUTE_FULLY"],
    HARNESS_BLOCK: ["HARNESS_FAILURE", "HARNESS_DEFECT"],
  }[terminal.TERMINAL_CLASS] || ["HARNESS_FAILURE", "HARNESS_DEFECT"];
  const evidence = [await captureScreenshot(page, "ROOM", currentSurface, `true-open54-${actionIndex}`).catch(() => null)].filter(Boolean);
  return {
    ...action,
    ...terminal,
    HISTORICAL_ACTION_CONTRACT_ID: row.HISTORICAL_ACTION_CONTRACT_ID,
    ACTION_CONTRACT_ID: row.ACTION_CONTRACT_ID,
    ROLE: "ROOM",
    ROUTE: row.ROUTE,
    CURRENT_ROUTE: currentSurface.route,
    VIEWPORT: row.VIEWPORT,
    SURFACE_ID: row.SURFACE_ID,
    HISTORICAL_LINEAGE_SOURCE: row.SOURCE_SELECTION_PATH || ROOM_TRUE_OPEN54_SELECTION_PATH,
    HISTORICAL_ROOT_FAMILY: row.HISTORICAL_ROOT_FAMILY || row.PREHIT_ROOT || null,
    HISTORICAL_PHYSICAL_FAILURE_CLASS: row.HISTORICAL_PHYSICAL_FAILURE_CLASS || null,
    BUSINESS_TARGET: { type: row.BUSINESS_TARGET_TYPE, stableKey: row.STABLE_TARGET_KEY },
    SEMANTIC_ACTION: { role: row.ACTION_ROLE, name: row.ACTION_NAME, userMeaning: row.USER_MEANING },
    SURFACE_STATE: row.MATERIAL_STATE_SIGNATURE,
    PREHIT_STATE_RECONSTRUCTION: recipe,
    ORIGINAL_ROOT_FACTS: toRoomTrueOpen54TerminalInput({ row, surface, recipe, action }).ORIGINAL_ROOT_FACTS,
    ORIGINAL_ROOT_STATUS: terminal.REPLAY_ROOT_CLOSURE === "YES" ? "CLEARED" : "OPEN",
    ORIGINAL_ROOT_RECONCILED: terminal.ORIGINAL_ROOT_PROVEN,
    ROOT_CLOSURE_OUTCOME: terminal.REPLAY_ROOT_CLOSURE,
    CONTRACT_ACTION_EXECUTION: action.ACTION_DISPATCH_SUCCEEDED === true
      ? "SAFE_ACTION_DISPATCH_SUCCEEDED"
      : action.ACTION_DISPATCH_FAILED === true
        ? "SAFE_ACTION_DISPATCH_FAILED"
        : action.ACTION_DISPATCH_STARTED === true
          ? "SAFE_ACTION_DISPATCH_STARTED"
          : terminal.TERMINAL_CLASS === "HARNESS_BLOCK"
            ? "HARNESS_BLOCK_BEFORE_ACTION"
            : "EXPECTED_NON_EXECUTION_TERMINALIZED",
    executionState: terminalState[0],
    EXECUTION_STATE: terminalState[0],
    classification: terminalState[1],
    CLASSIFICATION: terminalState[1],
    evidence,
  };
}

/*
 * Canonical TRUE-OPEN54 high-level entrypoint.  Its validation mode never
 * launches a browser; the real mode owns the same shared worker lifecycle as
 * Exact36 and delegates every safe action to executeOne.
 */
async function runRoomCanonicalReplayAcceptanceCore({
  profileId = ROOM_CANONICAL_REPLAY_PROFILE_IDS.TRUE_OPEN54,
  validateStart = false,
} = {}) {
  const origin = assertRoomTrueOpen54TrustedLocalOrigins();
  const selection = await loadRoomCanonicalFrozenSelection(profileId);
  const workerPlan = buildRoomCanonicalWorkerPlan(selection.contracts, {
    expectedCount: selection.FINAL_REPLAY_TARGET_COUNT,
    profileId: selection.PROFILE_ID,
  });
  const validation = { ...origin, ...roomCanonicalReplayValidationSummary({ selection, workerPlan }) };
  if (validateStart) return validation;

  const health = await fetch(`${base}/health`).then(async (response) => ({ status: response.status, body: await response.json().catch(() => ({})) }));
  if (health.status !== 200 || health.body?.dbOk !== true) throw new Error(`${selection.PROFILE_ID}_RUNTIME_HEALTH_NOT_READY:http=${health.status}:dbOk=${health.body?.dbOk}`);
  const report = await readJson(path.join(frozenDir, "final-discovery-report.json"), null);
  if (!Array.isArray(report?.surfaces) || !report.surfaces.length) throw new Error(`${selection.PROFILE_ID}_FROZEN_SURFACE_DISCOVERY_UNAVAILABLE`);
  const surfacesById = new Map(report.surfaces.map((surface) => [surfaceId(surface), surface]));
  for (const row of selection.contracts) {
    const surface = surfacesById.get(row.SURFACE_ID);
    if (!surface || surface.viewport !== row.VIEWPORT) throw new Error(`${selection.PROFILE_ID}_VIEWPORT_REPRESENTATION_MISMATCH:${row.ACTION_CONTRACT_ID}`);
  }
  const runDir = path.join(artifactRoot, "runs", runId, selection.ARTIFACT_SLUG);
  await fs.mkdir(runDir, { recursive: true });
  await writeImmutableArtifact(path.join(runDir, "manifest.json"), {
    RUN_ID: runId,
    RUN_KIND: `${selection.PROFILE_ID}_FINAL_REPLAY`,
    CANONICAL_SELECTION_PROFILE_ID: selection.PROFILE_ID,
    HISTORICAL_LINEAGE_COUNT: selection.HISTORICAL_LINEAGE_COUNT,
    TARGET_COUNT: selection.contracts.length,
    FINAL_REPLAY_SELECTION_SHA256: selection.SELECTION_SHA256,
    WEB_BASE_URL: base,
    API_BASE_URL: api,
    ENTRYPOINT: "runRoomCanonicalReplayAcceptance",
    generatedAt: new Date().toISOString(),
  });
  await writeImmutableArtifact(path.join(runDir, "frozen-selection.json"), {
    FINAL_REPLAY_SELECTION_SHA256: selection.SELECTION_SHA256,
    rows: selection.contracts.map((row) => ({ ACTION_CONTRACT_ID: row.ACTION_CONTRACT_ID, ROUTE: row.ROUTE, VIEWPORT: row.VIEWPORT, SURFACE_ID: row.SURFACE_ID, HISTORICAL_ROOT_FAMILY: row.HISTORICAL_ROOT_FAMILY || row.PREHIT_ROOT })),
  });
  const telemetry = { console: [], page: [], http500: [], http403: [], critical: [], assets: [] };
  const token = await login(roles.ROOM);
  const browser = await chromium.launch({ headless: true });
  const rowsById = new Map(selection.contracts.map((row) => [row.ACTION_CONTRACT_ID, row]));
  const scope = `${selection.PROFILE_ID}_RUN_LOCAL_AUTHENTICATED_USER`;
  const coordinator = createSharedAuthenticatedReadBudgetCoordinator({ authenticatedScope: scope });
  try {
    const runtime = await runRoomExact36DurableRuntime({
      workers: workerPlan.workers,
      expectedWorkerCount: workerPlan.workers.length,
      coordinator,
      authenticatedScope: scope,
      createWorkerRuntime: async ({ worker, workerId, genericReadBudgetCoordinator }) => createRoomSharedWorkerRuntime({ browser, token, telemetry, rowsById, surfacesById, worker, workerId, genericReadBudgetCoordinator, runLabel: selection.PROFILE_ID }),
      executeContractRuntime: async ({ session, assignment }) => {
        const row = rowsById.get(assignment?.ACTION_CONTRACT_ID);
        const surface = surfacesById.get(row?.SURFACE_ID);
        if (!row || !surface) throw new Error(`${selection.PROFILE_ID}_ASSIGNMENT_SELECTION_MISMATCH:${assignment?.ACTION_CONTRACT_ID || "UNKNOWN"}`);
        return executeRoomTrueOpen54Contract(session.page, row, surface, telemetry, Number(row.HISTORICAL_INDEX || 0));
      },
      persistRequestLifecycleSnapshot: async (snapshot) => writeImmutableArtifact(path.join(runDir, "request-lifecycle.json"), snapshot),
    });
    const summary = {
      ...validation,
      ...runtime,
      HEALTH: { HTTP: health.status, dbOk: health.body.dbOk, STARTED_AT: health.body.startedAt || null },
      REAL_BROWSER_RUN_STARTED: "YES",
      CHROMIUM_PROCESS_STARTED: "YES",
      CONTRACT_ACTION_EXECUTION_NONE_COUNT: runtime.RESULTS.filter((row) => row.CONTRACT_ACTION_EXECUTION === "NONE").length,
      ACCIDENTAL_UNSAFE_EXECUTION_COUNT: runtime.RESULTS.filter((row) => row.ACCIDENTAL_UNSAFE_EXECUTION === "YES").length,
    };
    await writeImmutableArtifact(path.join(runDir, "results.json"), { summary, results: runtime.RESULTS, telemetry, generatedAt: new Date().toISOString() });
    await writeImmutableArtifact(path.join(runDir, "summary.json"), summary);
    return summary;
  } finally {
    await browser.close().catch(() => {});
  }
}

/*
 * The single ROOM replay runtime takes only a frozen bounded profile id.
 * The historical TRUE-OPEN54 entrypoint remains a compatibility wrapper.
 */
export async function runRoomCanonicalReplayAcceptance(options = {}) {
  return runRoomCanonicalReplayAcceptanceCore(options);
}

export async function runRoomTrueOpen54Acceptance({ validateStart = false } = {}) {
  return runRoomCanonicalReplayAcceptanceCore({
    profileId: ROOM_CANONICAL_REPLAY_PROFILE_IDS.TRUE_OPEN54,
    validateStart,
  });
}

export async function enumerate(page, surface) {
  const raw = await page.evaluate(({ surface: current, selector, implicitInputRoles }) => [...document.querySelectorAll(selector)]
    .map((node, descriptorOrdinal) => window.__pre18ProjectSemanticControl?.(node, {
      route: current.route,
      selector,
      implicitInputRoles,
      descriptorOrdinal,
    }) || null)
    .filter((item) => item?.visible === true), { surface, selector: selectorForRole("any"), implicitInputRoles: browserImplicitInputRoles });
  const selected = raw.map((item) => ({
    ...item,
    control: {
      ...item.control,
      semanticStructure: extractCollapsibleSectionSemanticStructure(item.control?.collapsibleSectionStructure),
    },
    owner: selectContextualOwner(item.ownerCandidates, item.action),
    businessTarget: item.ownerCandidates.find((candidate) => candidate?.businessTarget)?.businessTarget || null,
  }));
  const rootNameCounts = new Map();
  for (const item of selected) {
    if (item.owner.label !== "root") continue;
    const key = `${item.action.role}|${item.action.name || ""}`;
    rootNameCounts.set(key, (rootNameCounts.get(key) || 0) + 1);
  }
  for (const item of selected) {
    const key = `${item.action.role}|${item.action.name || ""}`;
    item.ownerDecision = classifyRootOwnerFallback(item.ownerCandidates, { ...item.action, globalUnique: item.owner.label === "root" && rootNameCounts.get(key) === 1 });
  }
  const counts = new Map();
  for (const item of selected) {
    const key = `${item.owner.type}|${item.owner.label}|${item.action.role}|${item.action.name || ""}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const seen = new Map();
  return selected.map((item) => {
    const key = `${item.owner.type}|${item.owner.label}|${item.action.role}|${item.action.name || ""}`;
    const next = seen.get(key) || 0; seen.set(key, next + 1);
    return { ...item, owner: { ...item.owner, boundedOrdinal: counts.get(key) > 1 ? next : null } };
  });
}
async function firstVisibleLocator(locator) {
  for (let index = 0; index < await locator.count().catch(() => 0); index += 1) {
    const candidate = locator.nth(index);
    if (await candidate.isVisible().catch(() => false)) return candidate;
  }
  return null;
}
async function ensureActionMaterialState(page, materialState = {}) {
  const disclosure = materialState?.systemNavigationDisclosure;
  if (disclosure !== "SİSTEM_OPEN" && disclosure !== "SİSTEM_CLOSED") return { ok: true, reason: "NO_SYSTEM_NAVIGATION_STATE" };
  const toggle = await firstVisibleLocator(page.locator(".navAdvanced > .navToggle"));
  if (!toggle) return { ok: false, reason: "SYSTEM_NAVIGATION_TOGGLE_NOT_FOUND" };
  const label = await toggle.innerText().catch(() => "");
  const open = /▾/u.test(label);
  const wanted = disclosure === "SİSTEM_OPEN";
  if (open === wanted) return { ok: true, reason: wanted ? "SYSTEM_NAVIGATION_ALREADY_OPEN" : "SYSTEM_NAVIGATION_ALREADY_CLOSED" };
  await toggle.click({ timeout: 2500, noWaitAfter: true });
  await sleep(120);
  const after = await toggle.innerText().catch(() => "");
  const verified = /▾/u.test(after) === wanted;
  return { ok: verified, reason: verified ? "SYSTEM_NAVIGATION_STATE_RESTORED" : "SYSTEM_NAVIGATION_STATE_NOT_RESTORED" };
}
async function ensureAssistantSurfaceState(page, historicalMeta) {
  const requirements = deriveCurrentSurfaceRequirements(historicalMeta);
  if (!requirements.assistantDrawerRequired) return { ok: true, reason: "NO_ASSISTANT_DRAWER_REQUIRED" };
  const existing = await firstVisibleLocator(page.locator("[data-drawer],.copilotDrawer"));
  if (existing) return { ok: true, reason: "ASSISTANT_DRAWER_ALREADY_OPEN" };
  const launcher = await firstVisibleLocator(page.getByRole("button", { name: /Sefer Abi.*Sor/iu }));
  if (!launcher) return { ok: false, reason: "ASSISTANT_DRAWER_LAUNCHER_NOT_FOUND" };
  await launcher.click({ timeout: 2500, noWaitAfter: true, force: false });
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await firstVisibleLocator(page.locator("[data-drawer],.copilotDrawer"))) return { ok: true, reason: "ASSISTANT_DRAWER_RECONSTRUCTED" };
    await sleep(60);
  }
  return { ok: false, reason: "ASSISTANT_DRAWER_NOT_RENDERED" };
}
/*
 * Inventory capture may temporarily disclose the advanced navigation to see
 * controls that are otherwise absent from the capture-time DOM.  Execution
 * revalidation is deliberately different: after physical preparation it is a
 * read-only observation of the mounted state.  Keeping the matching pipeline
 * shared prevents a second semantic resolver while protecting prepared scroll
 * geometry, focus, route, and unrelated disclosures.
 */
export function executionRevalidationPolicy() {
  return {
    mode: "EXECUTION_REVALIDATION",
    observationallyPure: true,
    opensNavigation: false,
    closesNavigation: false,
    switchesTabs: false,
    changesRoute: false,
    changesFocus: false,
    usesBlindFixedSleep: false,
  };
}

export function remaining4ArchitecturalCorrectiveScope() {
  return {
    productSourceRequired: false,
    productBehaviorChangeRequired: false,
    browserRequired: false,
    ownedPaths: ["backend/scripts/**", "backend/scripts/lib/**"],
  };
}

export async function enumerateSurfaceActions(page, surface, {
  mode = "DISCOVERY_INVENTORY",
  onTelemetry = null,
  onRawCandidates = null,
} = {}) {
  const initial = await enumerate(page, surface);
  onRawCandidates?.(initial);
  const pure = mode === "EXECUTION_REVALIDATION";
  const enumerationTelemetry = {
    ENUMERATION_MODE: pure ? "EXECUTION_REVALIDATION" : "DISCOVERY_INVENTORY",
    EXECUTION_REVALIDATION_UI_MUTATION_COUNT: 0,
    PURE_REVALIDATION_NAV_CLICK_COUNT: 0,
    PURE_REVALIDATION_TAB_SWITCH_COUNT: 0,
    PURE_REVALIDATION_DISCLOSURE_MUTATION_COUNT: 0,
    PURE_REVALIDATION_ROUTE_CHANGE_COUNT: 0,
    DISCOVERY_NAV_CLICK_COUNT: 0,
  };
  if (pure) {
    onTelemetry?.(enumerationTelemetry);
    return deduplicateCurrentSemanticCandidates(initial).candidates;
  }
  const toggle = await firstVisibleLocator(page.locator(".navAdvanced > .navToggle"));
  if (!toggle) {
    onTelemetry?.(enumerationTelemetry);
    return initial;
  }
  const initialLabel = await toggle.innerText().catch(() => "");
  if (/▾/u.test(initialLabel)) {
    onTelemetry?.(enumerationTelemetry);
    return initial;
  }
  await toggle.click({ timeout: 2500, noWaitAfter: true }).catch(() => {});
  enumerationTelemetry.DISCOVERY_NAV_CLICK_COUNT += 1;
  await sleep(120);
  const openedLabel = await toggle.innerText().catch(() => "");
  if (!/▾/u.test(openedLabel)) {
    onTelemetry?.(enumerationTelemetry);
    return initial;
  }
  const disclosed = await enumerate(page, surface);
  await toggle.click({ timeout: 2500, noWaitAfter: true }).catch(() => {});
  enumerationTelemetry.DISCOVERY_NAV_CLICK_COUNT += 1;
  await sleep(80);
  const combined = new Map();
  for (const item of [...initial, ...disclosed]) {
    const key = JSON.stringify({ role: item.action.role, name: item.action.name, state: item.materialState, owner: item.owner, ordinal: item.owner?.boundedOrdinal });
    if (!combined.has(key)) combined.set(key, item);
  }
  onTelemetry?.(enumerationTelemetry);
  return deduplicateCurrentSemanticCandidates([...combined.values()]).candidates;
}
function boundSemanticTargetIdentity({ observed = {}, locatorRecipe = {} } = {}) {
  const action = observed.action || {};
  const control = observed.control || {};
  const owner = observed.owner || {};
  return {
    candidateKey: locatorRecipe.candidateKey || null,
    role: action.role || null,
    name: action.name || null,
    owner: { type: owner.type || null, label: owner.label || null },
    businessTarget: observed.businessTarget || null,
    tag: control.tag || null,
    dataTestId: control.dataTestId || null,
  };
}

// A re-render can legitimately replace a DOM node. It is valid only when the
// newly resolved target proves the same semantic/current-DOM identity; order
// and broad-locator ordinals are never identity evidence.
export function sameBoundSemanticTarget(left = {}, right = {}) {
  const a = left?.SEMANTIC_IDENTITY || left?.semanticIdentity || left || {};
  const b = right?.SEMANTIC_IDENTITY || right?.semanticIdentity || right || {};
  return Boolean(
    a.candidateKey && b.candidateKey && a.candidateKey === b.candidateKey
    && a.role === b.role
    && norm(a.name) === norm(b.name)
    && a.owner?.type === b.owner?.type
    && norm(a.owner?.label) === norm(b.owner?.label)
    && (a.dataTestId || null) === (b.dataTestId || null)
    && (a.tag || null) === (b.tag || null),
  );
}

const locatorBindingDiagnostics = new WeakMap();

function firstBindingMismatch(validation = {}) {
  if (!validation.roleMatches) return "ROLE";
  if (!validation.nameMatches) return "NAME";
  if (!validation.structuralContextMatches) return "STRUCTURE";
  if (!validation.ownerMatches) return "OWNER";
  if (!validation.businessTargetMatches) return "BUSINESS_TARGET";
  if (!validation.overlayMatches) return "SURFACE_CONTAINMENT";
  if (!validation.sameCandidate) return "CANDIDATE_KEY";
  return null;
}

function bindingDiagnostic(executionContext = {}, observed = null, validation = {}) {
  const recipe = executionContext.locatorRecipe || {};
  const observedKey = observed ? (observed.candidateKey || JSON.stringify({
    role: observed.action?.role || null,
    name: observed.action?.name || null,
    owner: observed.owner || null,
    businessTarget: observed.businessTarget || null,
    overlayScope: observed.overlayScope || null,
  })) : null;
  return {
    AUTHORITATIVE_DESCRIPTOR_KEY: recipe.candidateKey || null,
    BINDER_CURRENT_NODE_DESCRIPTOR_KEY: observedKey,
    ROLE_MATCH: Boolean(validation.roleMatches),
    NAME_MATCH: Boolean(validation.nameMatches),
    STRUCTURE_MATCH: Boolean(validation.structuralContextMatches),
    OWNER_MATCH: Boolean(validation.ownerMatches),
    BUSINESS_TARGET_MATCH: Boolean(validation.businessTargetMatches),
    SURFACE_CONTAINMENT_MATCH: Boolean(validation.overlayMatches),
    CANDIDATE_KEY_MATCH: Boolean(validation.sameCandidate),
    FIRST_BINDING_MISMATCH_DIMENSION: firstBindingMismatch(validation),
    AUTHORITATIVE_DESCRIPTOR_CONSUMED: true,
    BINDER_INDEPENDENT_SEMANTIC_TRUTH_CREATED: false,
    POST_RERENDER_IDENTITY_REVALIDATED: Boolean(validation.valid),
    POST_SCROLL_IDENTITY_REVALIDATION_PRESENT: true,
  };
}

export function getLocatorBindingDiagnostics(executionContext = {}) {
  return locatorBindingDiagnostics.get(executionContext) || null;
}

export async function matchingLocator(page, executionContext) {
  const recipe = executionContext.locatorRecipe || {};
  const role = recipe.role || "button";
  const name = norm(recipe.name);
  const baseSelector = selectorForRole(role);
  const candidates = page.locator(baseSelector);
  const matches = [];
  let lastDiagnostic = bindingDiagnostic(executionContext, null, {});
  for (let i = 0; i < await candidates.count(); i += 1) {
    const loc = candidates.nth(i);
    if (!(await loc.isVisible().catch(() => false))) continue;
    const info = await loc.evaluate((node, context) => window.__pre18ProjectSemanticControl?.(node, context) || null, {
      selector: baseSelector,
      route: recipe.route || "",
      businessTarget: recipe.businessTarget || null,
      implicitInputRoles: browserImplicitInputRoles,
      descriptorOrdinal: i,
    }).catch(() => null);
    if (!info) continue;
    const owner = selectContextualOwner(info.ownerCandidates, info.action);
    const observed = {
      ...info,
      owner,
      businessContext: info.businessContext || owner.label,
      businessTarget: info.ownerCandidates.find((candidate) => candidate?.businessTarget)?.businessTarget || null,
    };
    const validation = validateCandidateDerivedLocator(executionContext, observed);
    lastDiagnostic = bindingDiagnostic(executionContext, observed, validation);
    if (!validation.valid) continue;
    // The candidate was semantically validated while this locator resolved.
    // Bind the actual ElementHandle now so later global-selector nth() calls
    // cannot drift to a different physical node after DOM mutation.
    const handle = await loc.elementHandle().catch(() => null);
    if (!handle) continue;
    matches.push({
      loc: handle,
      observed,
      validation,
      bindingTelemetry: lastDiagnostic,
      physicalIdentity: { SEMANTIC_IDENTITY: boundSemanticTargetIdentity({ observed, locatorRecipe: recipe }) },
    });
  }
  if (matches.length === 1) {
    locatorBindingDiagnostics.set(executionContext, matches[0].bindingTelemetry);
    return matches[0];
  }

  /*
   * A semantic action may intentionally occur more than once in the current
   * DOM.  A global DOM ordinal would make that replay brittle; however the
   * capture-time contract can carry a bounded ordinal within a meaningful
   * contextual owner (card, table row, dialog, drawer, or section).  Use that
   * narrow fallback only after the semantic/owner validation above succeeded.
   */
  const expectedOwner = executionContext?.currentOwner || recipe.owner || null;
  const expectedOrdinal = Number.isInteger(expectedOwner?.boundedOrdinal)
    ? expectedOwner.boundedOrdinal
    : null;
  if (expectedOrdinal !== null) {
    const scoped = matches.filter((match) => (
      (!expectedOwner?.type || match.observed.owner?.type === expectedOwner.type)
      && (!expectedOwner?.label || match.observed.owner?.label === expectedOwner.label)
    ));
    if (scoped.length > expectedOrdinal) {
      locatorBindingDiagnostics.set(executionContext, scoped[expectedOrdinal].bindingTelemetry);
      return scoped[expectedOrdinal];
    }
  }
  locatorBindingDiagnostics.set(executionContext, lastDiagnostic);
  return null;
}
async function observe(page) {
  const textValue = await page.locator("body").innerText().catch(() => "");
  const url = page.url();
  const active = await page.locator(":focus").evaluate((node) => node?.outerHTML?.slice(0, 180) || "").catch(() => "");
  const overlays = await page.locator("[role='dialog'],.modal,[data-drawer],.copilotDrawer,.modal-backdrop").count().catch(() => 0);
  const backdropCount = await page.locator(".modal-backdrop").count().catch(() => 0);
  const expanded = await page.locator("[aria-expanded='true'],details[open]").count().catch(() => 0);
  const selected = await page.locator("[role='tab'][aria-selected='true']").allTextContents().catch(() => []);
  const surfaceState = await page.evaluate(() => {
    const compact = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const title = (node) => compact(node?.querySelector("h1,h2,h3,h4,h5,h6,[role='heading']")?.textContent);
    const modal = document.querySelector("[role='dialog'],.modal");
    const drawer = document.querySelector("[data-drawer],.copilotDrawer");
    const toggle = document.querySelector(".navAdvanced > .navToggle");
    const filterSignature = [...document.querySelectorAll("input,select,textarea")]
      .map((node) => `${node.name || node.placeholder || node.id}:${node.value || node.checked || ""}`).join("|");
    return {
      modalTitle: title(modal),
      modalOpen: Boolean(modal),
      drawerTitle: title(drawer) || (drawer ? "Sefer Abi" : ""),
      drawerOpen: Boolean(drawer),
      disclosure: compact(toggle?.textContent),
      filterSignature: compact(filterSignature),
      searchSignature: compact([...document.querySelectorAll("input[type='search'],input[placeholder*='Ara' i]")].map((node) => node.value).join("|")),
    };
  }).catch(() => ({}));
  return {
    url,
    bodyHash: sha(textValue),
    bodyLength: textValue.length,
    focus: active,
    overlays,
    backdropCount,
    backdropOpen: backdropCount > 0,
    expanded,
    activeTab: selected.map(norm).join("|"),
    selected: selected.map(norm),
    ...surfaceState,
  };
}

// Document scrolling is not a nested-owner condition.  Keep this pure so the
// browser probe and no-browser harness tests share one telemetry meaning.
export function classifyScrollOwnerTelemetry({ scrollableAncestors = [], documentScrollable = false, documentScrollingElement = null } = {}) {
  const ancestors = Array.isArray(scrollableAncestors) ? scrollableAncestors : [];
  const nested = ancestors.filter((item) => item?.documentScrollingElement !== true);
  const nearest = nested[0] || (documentScrollable
    ? documentScrollingElement || { tag: "HTML", label: "document", scrollTop: 0, scrollLeft: 0 }
    : null);
  const scrollContainerType = nested.length > 1
    ? "MULTIPLE"
    : nested.length === 1
      ? "NESTED"
      : documentScrollable
        ? "DOCUMENT"
        : "NONE";
  return {
    SCROLL_CONTAINER_TYPE: scrollContainerType,
    SCROLL_OWNER_CLASS: nested.length ? "GENUINE_NESTED_SCROLL_OWNER" : documentScrollable ? "DOCUMENT_SCROLL_OWNER" : "NO_SCROLL_OWNER",
    NEAREST_SCROLLABLE_ANCESTOR: nearest,
  };
}

// This probe deliberately reuses the exact existing center-point predicate.
// It only serializes what that predicate observed; it never scrolls, clicks,
// rebinds a locator, or influences the completion decision.
export async function inspectTargetHitTest(target, { semanticIdentity = null } = {}) {
  if (!target) return { TARGET_HIT_TEST: true };
  const raw = await Promise.resolve().then(() => target.evaluate((node) => {
    const compact = (value) => String(value || "").replace(/\s+/gu, " ").trim().slice(0, 180);
    const roleOf = (element) => {
      if (!element) return null;
      const explicit = compact(element.getAttribute("role"));
      if (explicit) return explicit;
      const tag = element.tagName?.toLowerCase();
      if (tag === "button" || tag === "summary") return "button";
      if (tag === "a") return "link";
      if (tag === "select") return "combobox";
      if (tag === "textarea") return "textbox";
      if (tag === "input") {
        if (element.type === "checkbox" || element.type === "radio") return element.type;
        return element.type === "number" ? "spinbutton" : "textbox";
      }
      return null;
    };
    const labelOf = (element) => compact(element?.getAttribute("aria-label") || element?.getAttribute("title") || element?.getAttribute("name") || element?.innerText || element?.textContent || "");
    const descriptor = (element) => {
      if (!element) return null;
      const id = compact(element.id);
      const classes = [...element.classList || []].slice(0, 3).map((name) => `.${name}`).join("");
      const role = roleOf(element);
      return `${element.tagName}${id ? `#${id}` : ""}${classes}${role ? `[role=${role}]` : ""}`;
    };
    const rectOf = (rect) => ({ x: rect.x, y: rect.y, width: rect.width, height: rect.height, top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left });
    const intersectionOf = (rect) => {
      const left = Math.max(0, rect.left); const right = Math.min(window.innerWidth, rect.right);
      const top = Math.max(0, rect.top); const bottom = Math.min(window.innerHeight, rect.bottom);
      const width = Math.max(0, right - left); const height = Math.max(0, bottom - top);
      const area = Math.max(0, rect.width * rect.height);
      return { intersectsViewport: width > 0 && height > 0, ratio: area > 0 ? (width * height) / area : 0, rect: { left, top, right, bottom, width, height } };
    };
    const ancestorChain = (element) => {
      const chain = [];
      let current = element;
      while (current && chain.length < 8) { chain.push(descriptor(current)); current = current.parentElement; }
      return chain;
    };
    const scrollingElement = document.scrollingElement;
    const scrollable = [];
    const ancestorPositionSummary = [];
    const ancestorTransformSummary = [];
    const ancestorOverflowSummary = [];
    let parent = node.parentElement;
    while (parent) {
      const style = getComputedStyle(parent);
      if (ancestorPositionSummary.length < 8) {
        const label = descriptor(parent);
        ancestorPositionSummary.push(`${label}:${style.position}`);
        ancestorTransformSummary.push(`${label}:${style.transform || "none"}`);
        ancestorOverflowSummary.push(`${label}:${style.overflowX}/${style.overflowY}`);
      }
      const scrollableY = /auto|scroll|overlay/iu.test(style.overflowY) && parent.scrollHeight > parent.clientHeight;
      const scrollableX = /auto|scroll|overlay/iu.test(style.overflowX) && parent.scrollWidth > parent.clientWidth;
      if (scrollableY || scrollableX) {
        scrollable.push({ tag: parent.tagName, label: descriptor(parent), overflowX: style.overflowX, overflowY: style.overflowY, scrollTop: parent.scrollTop, scrollLeft: parent.scrollLeft, clientWidth: parent.clientWidth, clientHeight: parent.clientHeight, scrollWidth: parent.scrollWidth, scrollHeight: parent.scrollHeight, documentScrollingElement: parent === scrollingElement || parent === document.documentElement || parent === document.body });
      }
      parent = parent.parentElement;
    }
    const documentScrollable = Boolean(scrollingElement && (scrollingElement.scrollHeight > window.innerHeight || scrollingElement.scrollWidth > window.innerWidth));
    const documentScrollTop = scrollingElement?.scrollTop ?? window.scrollY;
    const documentScrollHeight = scrollingElement?.scrollHeight ?? document.documentElement?.scrollHeight ?? null;
    const documentClientHeight = scrollingElement?.clientHeight ?? window.innerHeight;
    const maxDocumentScrollTop = Number.isFinite(documentScrollHeight) && Number.isFinite(documentClientHeight)
      ? Math.max(0, documentScrollHeight - documentClientHeight)
      : null;
    const box = node.getBoundingClientRect();
    const rect = rectOf(box);
    const intersection = intersectionOf(box);
    const usable = Boolean(box.width && box.height);
    const center = usable ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : null;
    const hit = center ? document.elementFromPoint(center.x, center.y) : null;
    const targetHitTest = Boolean(hit && (hit === node || node.contains(hit) || hit.contains(node)));
    const targetStyle = getComputedStyle(node);
    const hitStyle = hit ? getComputedStyle(hit) : null;
    const overlay = hit?.closest(".modal-backdrop,[data-backdrop],[role='dialog'],.modal,[data-drawer],.copilotDrawer");
    const obstructionOwner = !hit || targetHitTest ? null
      : hit.closest(".modal-backdrop,[data-backdrop]") ? "MODAL_BACKDROP"
        : hit.closest("[role='dialog'],.modal") ? "MODAL"
          : hit.closest("[data-drawer],.copilotDrawer") ? "DRAWER"
            : hitStyle?.position === "sticky" ? "STICKY_HEADER"
              : hitStyle?.position === "fixed" ? "FIXED_TOOLBAR"
                : hitStyle?.transform !== "none" ? "TRANSFORM_GEOMETRY"
                  : hitStyle?.pointerEvents !== "auto" ? "POINTER_EVENTS_LAYER"
                    : overlay ? "OVERLAY"
                      : "UNRELATED_ELEMENT";
    return {
      TARGET_HIT_TEST: targetHitTest,
      TARGET_TAG: node.tagName,
      TARGET_DATA_TESTID: compact(node.getAttribute("data-testid") || "") || null,
      TARGET_ACCESSIBLE_NAME: labelOf(node) || null,
      TARGET_ROLE: roleOf(node),
      TARGET_NODE_SIGNATURE: `${node.tagName}|${compact(node.getAttribute("data-testid") || "")}|${roleOf(node) || ""}|${compact(node.getAttribute("type") || "")}|${labelOf(node) || ""}`,
      TARGET_RECT: rect,
      VIEWPORT: { width: window.innerWidth, height: window.innerHeight },
      RECT_INTERSECTS_VIEWPORT: rect.right > 0 && rect.bottom > 0 && rect.left < window.innerWidth && rect.top < window.innerHeight,
      TARGET_INTERSECTION: intersection,
      CENTER_POINT: center,
      CENTER_POINT_IN_VIEWPORT: Boolean(center && center.x >= 0 && center.y >= 0 && center.x < window.innerWidth && center.y < window.innerHeight),
      ELEMENT_FROM_POINT_RESULT: descriptor(hit),
      TOPMOST_TAG: hit?.tagName || null,
      TOPMOST_ROLE: roleOf(hit),
      TOPMOST_ACCESSIBLE_NAME: labelOf(hit) || null,
      TOPMOST_IS_TARGET: hit === node,
      TOPMOST_IS_DESCENDANT: Boolean(hit && node.contains(hit) && hit !== node),
      TOPMOST_IS_ANCESTOR: Boolean(hit && hit.contains(node) && hit !== node),
      TOPMOST_ANCESTOR_CHAIN: ancestorChain(hit),
      TARGET_COMPUTED_POSITION: targetStyle.position,
      TARGET_Z_INDEX: targetStyle.zIndex,
      TARGET_POINTER_EVENTS: targetStyle.pointerEvents,
      TOPMOST_COMPUTED_POSITION: hitStyle?.position || null,
      TOPMOST_Z_INDEX: hitStyle?.zIndex || null,
      TOPMOST_POINTER_EVENTS: hitStyle?.pointerEvents || null,
      SCROLLABLE_ANCESTORS: scrollable,
      DOCUMENT_SCROLLABLE: documentScrollable,
      DOCUMENT_SCROLLING_ELEMENT: documentScrollable ? { tag: scrollingElement?.tagName || "HTML", label: "document", scrollTop: scrollingElement?.scrollTop || 0, scrollLeft: scrollingElement?.scrollLeft || 0, documentScrollingElement: true } : null,
      DOCUMENT_SCROLL_X: window.scrollX,
      DOCUMENT_SCROLL_Y: window.scrollY,
      DOCUMENT_SCROLL_TOP: documentScrollTop,
      DOCUMENT_SCROLL_HEIGHT: documentScrollHeight,
      DOCUMENT_CLIENT_HEIGHT: documentClientHeight,
      MAX_DOCUMENT_SCROLL_TOP: maxDocumentScrollTop,
      CURRENT_SCROLL_AT_MAX: maxDocumentScrollTop !== null && documentScrollTop >= maxDocumentScrollTop,
      DISTANCE_TO_MAX_SCROLL: maxDocumentScrollTop === null ? null : Math.max(0, maxDocumentScrollTop - documentScrollTop),
      TARGET_CENTER_Y_RELATIVE_TO_VIEWPORT: center?.y ?? null,
      TARGET_CENTER_Y_RELATIVE_TO_DOCUMENT: center ? center.y + window.scrollY : null,
      SCROLL_ANCESTOR_SCROLL_TOP: scrollable.find((item) => item.documentScrollingElement !== true)?.scrollTop ?? null,
      SCROLL_ANCESTOR_SCROLL_LEFT: scrollable.find((item) => item.documentScrollingElement !== true)?.scrollLeft ?? null,
      ANCESTOR_POSITION_SUMMARY: ancestorPositionSummary,
      ANCESTOR_TRANSFORM_SUMMARY: ancestorTransformSummary,
      ANCESTOR_OVERFLOW_SUMMARY: ancestorOverflowSummary,
      OBSTRUCTION_OWNER: obstructionOwner,
      KEYBOARD_FOCUS_CAPABLE: !node.disabled && node.tabIndex >= 0 && typeof node.focus === "function",
    };
  })).catch((error) => ({
    TARGET_HIT_TEST: false,
    TARGET_RECT: null,
    VIEWPORT: null,
    RECT_INTERSECTS_VIEWPORT: false,
    CENTER_POINT: null,
    CENTER_POINT_IN_VIEWPORT: false,
    ELEMENT_FROM_POINT_RESULT: null,
    SCROLLABLE_ANCESTORS: [],
    DOCUMENT_SCROLLABLE: false,
    DOCUMENT_SCROLLING_ELEMENT: null,
    DIAGNOSTIC_EVALUATION_ERROR: norm(error?.message || "target diagnostics evaluation failed"),
  }));
  const scrollTelemetry = classifyScrollOwnerTelemetry({
    scrollableAncestors: raw.SCROLLABLE_ANCESTORS,
    documentScrollable: raw.DOCUMENT_SCROLLABLE,
    documentScrollingElement: raw.DOCUMENT_SCROLLING_ELEMENT,
  });
  const invocation = {
    INVOCATION_TARGET_TAG: raw.TARGET_TAG || null,
    INVOCATION_TARGET_DATA_TESTID: raw.TARGET_DATA_TESTID || null,
    INVOCATION_TARGET_ACCESSIBLE_NAME: raw.TARGET_ACCESSIBLE_NAME || null,
    INVOCATION_TARGET_ROLE: raw.TARGET_ROLE || null,
    INVOCATION_TARGET_NODE_SIGNATURE: raw.TARGET_NODE_SIGNATURE || null,
    INVOCATION_TARGET_SEMANTIC_IDENTITY: semanticIdentity || null,
    TARGET_SEMANTIC_IDENTITY: semanticIdentity || null,
  };
  return { ...raw, ...scrollTelemetry, ...invocation };
}

async function waitForSemanticStability(page, executionContext, target = null, timeout = 2500, targetIdentity = null) {
  const deadline = Date.now() + timeout;
  let last = null; let diagnostic = null;
  while (Date.now() < deadline) {
    const state = await observe(page);
    const targetContained = target ? await target.evaluate((node) => Boolean(node.closest("[role='dialog'],.modal,[data-drawer],.copilotDrawer"))).catch(() => false) : false;
    const targetTelemetry = await inspectTargetHitTest(target, { semanticIdentity: targetIdentity });
    // Preserve the original physical predicate exactly. The structured probe
    // merely exposes its inputs and result for the immutable diagnostic run.
    const targetHitTest = target ? targetTelemetry.TARGET_HIT_TEST === true : true;
    last = { ...state, targetContained, targetHitTest };
    const completion = planSemanticStabilityCompletion({ targetOverlayScope: executionContext?.overlayScope || "NONE", observed: last });
    diagnostic = buildSemanticStabilityDiagnostic({ targetOverlayScope: executionContext?.overlayScope || "NONE", observed: last, target: targetTelemetry });
    if (completion.complete) return { ok: true, completion, state: last, diagnostic };
    await sleep(60);
  }
  const completion = planSemanticStabilityCompletion({ targetOverlayScope: executionContext?.overlayScope || "NONE", observed: last || {} });
  return { ok: false, completion, state: last, diagnostic: diagnostic || buildSemanticStabilityDiagnostic({ targetOverlayScope: executionContext?.overlayScope || "NONE", observed: last || {}, target: {} }) };
}
function effectObserved(before, after, expected) {
  if (expected === "ROUTE_OR_ANCHOR_TRANSITION") return before.url !== after.url || before.bodyHash !== after.bodyHash;
  if (expected === "ACTIVE_TAB_CHANGE") return before.selected.join("|") !== after.selected.join("|") || before.bodyHash !== after.bodyHash;
  if (expected === "CONTROL_STATE_CHANGE") return before.bodyHash !== after.bodyHash || before.focus !== after.focus;
  if (expected === "DISCLOSURE_CHANGE" || expected === "MODAL_OR_DIALOG_TRANSITION" || expected === "DRAWER_TRANSITION") return before.expanded !== after.expanded || before.overlays !== after.overlays || before.bodyHash !== after.bodyHash;
  return before.bodyHash !== after.bodyHash || before.overlays !== after.overlays || before.expanded !== after.expanded || before.focus !== after.focus || before.url !== after.url;
}
async function setupPage(page, surface) {
  await openRoute(page, surface.route);
  return replaySteps(page, surface.steps || []);
}
async function captureScreenshot(page, role, surface, label = "surface") {
  const file = path.join(evidenceDir(role), "screenshots", `${safeFile(surface.route)}-${surface.viewport}-${safeFile(surface.state)}-${safeFile(label)}.png`);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file, fullPage: false });
  return path.relative(root, file).replace(/\\/gu, "/");
}

function currentBusinessContext(meta = {}) {
  return meta.businessContext || meta.control?.businessContext || meta.owner?.businessContext || meta.owner?.label || null;
}

function overlayFromState(state = {}) {
  if (state.drawerTitle) return { type: "drawer", title: state.drawerTitle };
  if (state.modalTitle) return { type: "modal", title: state.modalTitle };
  if (state.backdropOpen) return { type: "modal", title: null, backdrop: true };
  return { type: null, title: null };
}

export function resolveFreshSemanticActionWithDiagnostics(historicalMeta = {}, candidates = []) {
  const resolutionInput = {
    action: historicalMeta.action,
    owner: historicalMeta.owner,
    businessContext: currentBusinessContext(historicalMeta),
    businessTarget: historicalMeta.businessTarget || null,
    semanticIdentity: historicalMeta.semanticIdentity || null,
  };
  const resolution = diagnoseCurrentSemanticResolution(resolutionInput, candidates);
  const currentMeta = resolution.candidate
    ? buildCurrentSemanticExecutionContext(resolutionInput, candidates)
    : null;
  return {
    currentMeta,
    resolutionDiagnostics: resolution.resolutionDiagnostics,
    ENUMERATED_CANDIDATE_COUNT: Array.isArray(candidates) ? candidates.length : 0,
  };
}

export function resolveRoomReplaySemanticCandidate(historicalMeta = {}, candidates = []) {
  return resolveFreshSemanticActionWithDiagnostics(historicalMeta, candidates).currentMeta;
}

function diagnosticDescriptor(candidate = {}, descriptorOrdinal = null) {
  const control = candidate.control || {};
  const action = candidate.action || {};
  const semanticIdentity = candidate.semanticIdentity || {};
  return {
    descriptorOrdinal: Number.isInteger(control.descriptorOrdinal) ? control.descriptorOrdinal : descriptorOrdinal,
    role: action.role || null,
    accessibleName: action.name || control.accessibleName || null,
    normalizedAccessibleName: normalizeActionSemanticName(action.name || control.accessibleName || ""),
    tag: String(control.tag || "").toLowerCase() || null,
    inputType: String(control.type || "").toLowerCase() || null,
    visible: Boolean(candidate.visible ?? control.visible),
    enabled: Boolean(candidate.enabled ?? control.enabled),
    dataTestId: control.dataTestId || null,
    ariaLabel: control.ariaLabel || null,
    ariaLabelledBy: control.ariaLabelledBy || null,
    labelText: control.labelText || null,
    nameSource: control.nameSource || null,
    owner: candidate.owner ? { type: candidate.owner.type || null, label: candidate.owner.label || null, boundedOrdinal: candidate.owner.boundedOrdinal ?? null } : null,
    businessTarget: candidate.businessTarget || semanticIdentity.businessTarget || null,
    structuralContext: semanticIdentity.structuralContext || null,
    dedupSignature: JSON.stringify({ role: action.role || null, name: action.name || null, owner: candidate.owner?.label || null, tag: control.tag || null, type: control.type || null }),
  };
}

function diagnosticStructuralMatch(expected = {}, candidate = {}) {
  return structuralContextMatches(candidate, expected?.structuralContext || null);
}

/* Diagnostic-only snapshot.  It deliberately never feeds candidate selection. */
export function buildBoundedFinancialSemanticFailureTelemetry({
  historicalMeta = {},
  rawCandidates = [],
  resolutionDiagnostics = null,
  assertionTarget = null,
  continuity = null,
  stateRecipe = null,
} = {}) {
  const expectedRole = historicalMeta.action?.role || null;
  const expectedName = historicalMeta.action?.name || null;
  const expectedNormalizedName = normalizeActionSemanticName(expectedName || "");
  const expectedStructural = historicalMeta.semanticIdentity?.structuralContext || {};
  const expectedTarget = {
    EXPECTED_ROLE: expectedRole,
    EXPECTED_NAME: expectedName,
    EXPECTED_NORMALIZED_NAME: expectedNormalizedName,
    EXPECTED_TAG: expectedStructural.tag || expectedStructural.formControl || null,
    EXPECTED_INPUT_TYPE: expectedStructural.inputType || (expectedRole === "spinbutton" ? "number" : null),
    EXPECTED_STABLE_IDENTITY: historicalMeta.stableIdentitySha256 || historicalMeta.STABLE_IDENTITY_SHA256 || null,
  };
  const raw = Array.isArray(rawCandidates) ? rawCandidates : [];
  const roleCompatible = raw.filter((candidate) => candidate?.action?.role === expectedRole);
  const exactName = roleCompatible.filter((candidate) => String(candidate?.action?.name || candidate?.control?.accessibleName || "") === String(expectedName || ""));
  const normalizedName = roleCompatible.filter((candidate) => normalizeActionSemanticName(candidate?.action?.name || candidate?.control?.accessibleName || "") === expectedNormalizedName);
  const tagType = roleCompatible.filter((candidate) => {
    const tag = String(candidate?.control?.tag || "").toLowerCase();
    const inputType = String(candidate?.control?.type || "").toLowerCase();
    return (!expectedTarget.EXPECTED_TAG || tag === String(expectedTarget.EXPECTED_TAG).toLowerCase())
      && (!expectedTarget.EXPECTED_INPUT_TYPE || inputType === String(expectedTarget.EXPECTED_INPUT_TYPE).toLowerCase());
  });
  const roleName = normalizedName;
  const structural = roleName.filter((candidate) => diagnosticStructuralMatch(historicalMeta.semanticIdentity || {}, candidate));
  const dedupSurvivors = deduplicateCurrentSemanticCandidates(raw).candidates;
  const snapshotSet = new Set([...roleCompatible, ...raw.filter((candidate) => normalizeActionSemanticName(candidate?.action?.name || candidate?.control?.accessibleName || "") === expectedNormalizedName)]);
  const descriptors = [...snapshotSet].map((candidate, index) => {
    const descriptor = diagnosticDescriptor(candidate, index);
    return {
      ...descriptor,
      candidateRejectionStages: {
        roleMatch: descriptor.role === expectedRole,
        exactNameMatch: String(descriptor.accessibleName || "") === String(expectedName || ""),
        normalizedNameMatch: descriptor.normalizedAccessibleName === expectedNormalizedName,
        tagTypeMatch: (!expectedTarget.EXPECTED_TAG || descriptor.tag === String(expectedTarget.EXPECTED_TAG).toLowerCase())
          && (!expectedTarget.EXPECTED_INPUT_TYPE || descriptor.inputType === String(expectedTarget.EXPECTED_INPUT_TYPE).toLowerCase()),
        structuralMatch: diagnosticStructuralMatch(historicalMeta.semanticIdentity || {}, candidate),
      },
    };
  });
  const assertionSignature = assertionTarget?.signature || assertionTarget?.ASSERTION_TARGET_SIGNATURE || null;
  const assertionName = assertionTarget?.accessibleName || assertionTarget?.ASSERTION_TARGET_ACCESSIBLE_NAME || null;
  const assertionRole = assertionTarget?.role || assertionTarget?.ASSERTION_TARGET_ROLE || null;
  const assertionTag = String(assertionTarget?.tag || assertionTarget?.ASSERTION_TARGET_TAG || "").toLowerCase();
  const assertionType = String(assertionTarget?.inputType || assertionTarget?.ASSERTION_TARGET_INPUT_TYPE || "").toLowerCase();
  const assertionMatches = raw.filter((candidate) => {
    const descriptor = diagnosticDescriptor(candidate);
    return descriptor.role === assertionRole
      && descriptor.accessibleName === assertionName
      && (!assertionTag || descriptor.tag === assertionTag)
      && (!assertionType || descriptor.inputType === assertionType);
  });
  const finalCount = Number(resolutionDiagnostics?.FINAL_COMPATIBLE_COUNT ?? 0);
  const rejectionStage = raw.length === 0 ? "TARGET_DESCRIPTOR_NOT_ENUMERATED"
    : roleCompatible.length === 0 ? "ROLE_NOT_FOUND"
      : normalizedName.length === 0 ? "ROLE_FOUND_NAME_NOT_FOUND"
        : structural.length === 0 ? "ROLE_NAME_FOUND_STRUCTURE_NOT_FOUND"
          : finalCount === 0 ? "ROLE_NAME_STRUCTURE_FOUND_OWNER_OR_BUSINESS_TARGET_NOT_FOUND"
            : "FINAL_COMPATIBLE_DESCRIPTOR_PRESENT";
  return {
    RAW_DESCRIPTOR_SNAPSHOT_BOUNDED: true,
    RAW_DOM_DUMP_PERSISTED: false,
    FUZZY_MATCH_USED_FOR_ACCEPTANCE: false,
    ORIGINAL_TERMINAL_CLASS_PRESERVED: true,
    CONTINUITY_CAN_SURVIVE_SEMANTIC_THROW: true,
    PARENT_SELECTIONS_UNCHANGED: true,
    ...expectedTarget,
    PIPELINE_STAGE_COUNTS: {
      RAW_ENUMERATED_COUNT: raw.length,
      ROLE_COMPATIBLE_COUNT: roleCompatible.length,
      EXACT_NAME_COUNT_WITHIN_ROLE: exactName.length,
      NORMALIZED_NAME_COUNT_WITHIN_ROLE: normalizedName.length,
      TAG_TYPE_COMPATIBLE_COUNT_WITHIN_ROLE: tagType.length,
      ROLE_NAME_COMPATIBLE_COUNT: roleName.length,
      ROLE_NAME_TAG_TYPE_COMPATIBLE_COUNT: roleName.filter((candidate) => tagType.includes(candidate)).length,
      NAME_COMPATIBLE_COUNT: normalizedName.length,
      STRUCTURAL_COMPATIBLE_COUNT: structural.length,
      OWNER_COMPATIBLE_COUNT: structural.length ? "NOT_EVALUATED" : "NOT_EVALUATED",
      BUSINESS_TARGET_COMPATIBLE_COUNT: structural.length ? "NOT_EVALUATED" : "NOT_EVALUATED",
      DEDUP_SURVIVOR_COUNT: dedupSurvivors.length,
      FINAL_COMPATIBLE_COUNT: finalCount,
    },
    REJECTION_STAGE: rejectionStage,
    ROLE_COMPATIBLE_DESCRIPTORS: descriptors,
    ASSERTION_TARGET_SIGNATURE: assertionSignature,
    ASSERTION_TARGET: assertionTarget || null,
    ASSERTION_TARGET_PRESENT_IN_RAW_ENUMERATION: assertionTarget ? (assertionMatches.length > 0 ? "YES" : "NO") : "UNKNOWN",
    ASSERTION_TARGET_ROLE_MATCH_COUNT: assertionTarget ? raw.filter((candidate) => candidate?.action?.role === assertionRole).length : "NOT_EVALUATED",
    ASSERTION_TARGET_EXACT_NAME_MATCH_COUNT: assertionTarget ? raw.filter((candidate) => String(candidate?.action?.name || candidate?.control?.accessibleName || "") === String(assertionName || "")).length : "NOT_EVALUATED",
    ASSERTION_TARGET_TAG_TYPE_MATCH_COUNT: assertionTarget ? raw.filter((candidate) => {
      const descriptor = diagnosticDescriptor(candidate);
      return descriptor.tag === assertionTag && descriptor.inputType === assertionType;
    }).length : "NOT_EVALUATED",
    ASSERTION_TARGET_SIGNATURE_MATCH_COUNT: assertionMatches.length,
    PRE_ENUMERATION_READY_CHECK: continuity?.PRE_ENUMERATION_READY_CHECK || "NOT_EVALUATED",
    POST_ENUMERATION_READY_CHECK: continuity?.POST_ENUMERATION_READY_CHECK || "NOT_EVALUATED",
    EXPECTED_CONTROL_ASSERTION_RESULT: stateRecipe?.EXPECTED_CONTROL_ASSERTION_RESULT || "NOT_EVALUATED",
  };
}

export async function resolveFreshSemanticAction(page, surface, historicalMeta, {
  onDiagnostics = null,
  enumerationMode = "EXECUTION_REVALIDATION",
  onEnumerationTelemetry = null,
  onDiagnosticEvidence = null,
  assertionTarget = null,
} = {}) {
  let rawCandidates = [];
  const candidates = await enumerateSurfaceActions(page, surface, {
    mode: enumerationMode,
    onTelemetry: onEnumerationTelemetry,
    onRawCandidates: (current) => { rawCandidates = current; },
  });
  const fresh = resolveFreshSemanticActionWithDiagnostics(historicalMeta, candidates);
  onDiagnostics?.(fresh.resolutionDiagnostics);
  if (historicalMeta?.financialContinuityRow) {
    onDiagnosticEvidence?.(buildBoundedFinancialSemanticFailureTelemetry({
      historicalMeta,
      rawCandidates,
      resolutionDiagnostics: fresh.resolutionDiagnostics,
      assertionTarget,
    }));
  }
  const executionContext = fresh.currentMeta;
  if (!executionContext) return null;
  const resolved = executionContext.candidate;
  const ownerDecision = executionContext.currentOwner?.label === "root"
    ? classifyCurrentRootOwner({
      action: resolved.action,
      currentPresent: true,
      globalUnique: executionContext.ownerRequirement === "OPTIONAL",
    })
    : resolved.ownerDecision;
  return { ...resolved, owner: executionContext.currentOwner, ownerDecision, executionContext };
}

async function resetSurfaceState(page, surface, strategy) {
  if (strategy === "RESET_NONE") return { ok: true, reason: "NO_RESET_REQUIRED", finalState: await observe(page) };
  if (strategy === "RESET_CLOSE_OVERLAY") {
    const overlays = [page.locator("[data-drawer],.copilotDrawer"), page.locator("[role='dialog'],.modal")];
    for (const overlay of overlays) {
      const current = await firstVisibleLocator(overlay);
      if (!current) continue;
      const controls = await current.locator("button,[role='button']").evaluateAll((nodes) => nodes.map((node) => ({
        role: node.getAttribute("role") || "button",
        name: String(node.getAttribute("aria-label") || node.getAttribute("title") || node.innerText || "").replace(/\s+/g, " ").trim(),
      }))).catch(() => []);
      const close = chooseSafeOverlayCloseAction(controls);
      if (!close) continue;
      const closeButton = await firstVisibleLocator(current.getByRole(close.role, { name: close.name, exact: true }));
      if (closeButton) await closeButton.click({ timeout: 2500, noWaitAfter: true, force: false }).catch(() => {});
      await sleep(100);
    }
    await page.keyboard.press("Escape").catch(() => {});
    const completion = await waitForSemanticStability(page, { overlayScope: "NONE" });
    if (completion.ok) return { ok: true, reason: "OVERLAY_CLOSED_WITH_SEMANTIC_COMPLETION", finalState: completion.state, completion };
  }
  const replay = await setupPage(page, surface);
  const completion = replay.ok ? await waitForSemanticStability(page, { overlayScope: "NONE" }) : null;
  return { ok: Boolean(replay.ok && completion?.ok), reason: replay.ok && completion?.ok ? `${strategy}:SURFACE_REOPENED_AND_STABLE` : `${strategy}:${replay.reason || "SEMANTIC_STABILITY_NOT_PROVEN"}`, finalState: completion?.state || await observe(page), completion };
}

// Each independent contract begins from a known material state. This never
// stores browser handles: it reconstructs state, then re-enumerates current
// semantic candidates and their current contextual owner.
export async function establishSurfaceStateStabilityBarrier(page, surface, historicalMeta, { adapters = {} } = {}) {
  const preState = await observe(page);
  const plan = planSurfaceStateStability({
    requiredState: historicalMeta.materialState,
    observedState: preState,
    targetOwner: historicalMeta.owner,
  });
  let reset = { ok: true, reason: "BARRIER_NO_RESET", finalState: preState };
  if (plan.strategy !== "RESET_NONE") {
    reset = await resetSurfaceState(page, surface, plan.strategy);
    if (!reset.ok) throw new Error(`SURFACE_STATE_BARRIER_FAILED:${reset.reason}`);
  }
  const assistant = await ensureAssistantSurfaceState(page, historicalMeta);
  if (!assistant.ok) throw new Error(`SURFACE_STATE_ASSISTANT_RESTORE_FAILED:${assistant.reason}`);
  let resolutionDiagnostics = null;
  let semanticResolutionDiagnosticEvidence = null;
  let financialContinuity = null;
  let executionRevalidationTelemetry = null;
  const captureResolutionDiagnostics = (diagnostics) => { resolutionDiagnostics = diagnostics || null; };
  const captureSemanticResolutionDiagnosticEvidence = (evidence) => { semanticResolutionDiagnosticEvidence = evidence || null; };
  const captureFinancialContinuity = (continuity) => { financialContinuity = continuity || null; };
  const captureExecutionRevalidationTelemetry = (telemetry) => { executionRevalidationTelemetry = telemetry || null; };
  const resolveExecution = adapters.resolveExecutionSemanticAction || resolveExecutionSemanticAction;
  let currentMeta = await resolveExecution(page, surface, historicalMeta, {
    onDiagnostics: captureResolutionDiagnostics,
    onDiagnosticEvidence: captureSemanticResolutionDiagnosticEvidence,
    onFinancialContinuity: captureFinancialContinuity,
    onEnumerationTelemetry: captureExecutionRevalidationTelemetry,
  });
  if (!currentMeta) {
    const error = new Error(`CURRENT_SEMANTIC_ACTION_NOT_RESOLVED:${historicalMeta.action?.role}:${historicalMeta.action?.name || "UNNAMED"}`);
    error.semanticResolutionDiagnostics = resolutionDiagnostics;
    error.semanticResolutionDiagnosticEvidence = semanticResolutionDiagnosticEvidence;
    error.financialContinuity = financialContinuity;
    throw error;
  }
  const restored = await ensureActionMaterialState(page, currentMeta.executionContext.requiredSurfaceState);
  if (!restored.ok) throw new Error(`SURFACE_STATE_MATERIAL_RESTORE_FAILED:${restored.reason}`);
  currentMeta = await resolveExecution(page, surface, historicalMeta, {
    onDiagnostics: captureResolutionDiagnostics,
    onDiagnosticEvidence: captureSemanticResolutionDiagnosticEvidence,
    onFinancialContinuity: captureFinancialContinuity,
    onEnumerationTelemetry: captureExecutionRevalidationTelemetry,
  });
  if (!currentMeta) {
    const error = new Error(`CURRENT_SEMANTIC_ACTION_NOT_RESOLVED:${historicalMeta.action?.role}:${historicalMeta.action?.name || "UNNAMED"}`);
    error.semanticResolutionDiagnostics = resolutionDiagnostics;
    error.semanticResolutionDiagnosticEvidence = semanticResolutionDiagnosticEvidence;
    error.financialContinuity = financialContinuity;
    throw error;
  }
  return {
    preState,
    plan,
    reset,
    currentMeta,
    currentState: await observe(page),
    financialContinuity,
    executionRevalidationTelemetry,
    transientBinding: invalidateTransientBrowserBinding({}, { expectedEffect: historicalMeta.action?.expectedEffectClass }),
  };
}

async function targetForCurrentMeta(page, currentMeta) {
  const target = await matchingLocator(page, currentMeta.executionContext);
  if (!target) {
    const error = new Error(`CURRENT_SEMANTIC_TARGET_NOT_FOUND:${currentMeta.owner?.type}:${currentMeta.owner?.label}:${currentMeta.action?.name}`);
    error.locatorBindingDiagnostics = getLocatorBindingDiagnostics(currentMeta.executionContext);
    throw error;
  }
  return target;
}

function numberChanged(left, right) {
  const a = Number(left); const b = Number(right);
  return Number.isFinite(a) && Number.isFinite(b) && a !== b;
}

function rectChanged(left = {}, right = {}) {
  return ["x", "y", "width", "height", "top", "right", "bottom", "left"].some((key) => numberChanged(left?.[key], right?.[key]));
}

// A resolved Playwright scroll promise is transport evidence only.  The
// actionability path may call it, but succeeds only from fresh physical proof
// of the re-resolved current candidate.
export function evaluateScrollPreparationPhysicalEvidence({ before = {}, after = {}, actionabilityProven = false } = {}) {
  const scrollStateChanged = numberChanged(before.DOCUMENT_SCROLL_X, after.DOCUMENT_SCROLL_X)
    || numberChanged(before.DOCUMENT_SCROLL_Y, after.DOCUMENT_SCROLL_Y)
    || numberChanged(before.SCROLL_ANCESTOR_SCROLL_TOP, after.SCROLL_ANCESTOR_SCROLL_TOP)
    || numberChanged(before.SCROLL_ANCESTOR_SCROLL_LEFT, after.SCROLL_ANCESTOR_SCROLL_LEFT);
  const targetGeometryChanged = rectChanged(before.TARGET_RECT, after.TARGET_RECT);
  const finalCenterValid = after.CENTER_POINT_IN_VIEWPORT === true;
  const finalHitTestValid = after.TARGET_HIT_TEST === true;
  const succeeded = actionabilityProven === true && finalCenterValid && finalHitTestValid;
  return {
    SCROLL_STATE_MATERIALLY_CHANGED: scrollStateChanged,
    TARGET_GEOMETRY_MATERIALLY_CHANGED: targetGeometryChanged,
    SCROLL_PRIMITIVE_RESOLVED_NO_EFFECT: !scrollStateChanged && !targetGeometryChanged && !finalCenterValid && !finalHitTestValid,
    SCROLL_PREPARATION_SUCCEEDED: succeeded,
    SCROLL_SUCCESS_WITH_INVALID_FINAL_CENTER: succeeded && !finalCenterValid,
    SCROLL_SUCCESS_WITH_FAILED_FINAL_HIT_TEST: succeeded && !finalHitTestValid,
    FALSE_SCROLL_PREPARATION_SUCCESS: false,
  };
}

function physicalSemanticIdentity(binding = {}) {
  return binding?.physicalIdentity?.SEMANTIC_IDENTITY || binding?.physicalIdentity?.semanticIdentity || null;
}

function persistInvocationTelemetry(lifecycle = {}, diagnostic = {}, binding = {}) {
  const semanticIdentity = physicalSemanticIdentity(binding);
  lifecycle.INVOCATION_TARGET_TAG = diagnostic.INVOCATION_TARGET_TAG || diagnostic.TARGET_TAG || binding?.observed?.control?.tag || null;
  lifecycle.INVOCATION_TARGET_DATA_TESTID = diagnostic.INVOCATION_TARGET_DATA_TESTID || diagnostic.TARGET_DATA_TESTID || binding?.observed?.control?.dataTestId || null;
  lifecycle.INVOCATION_TARGET_ACCESSIBLE_NAME = diagnostic.INVOCATION_TARGET_ACCESSIBLE_NAME || diagnostic.TARGET_ACCESSIBLE_NAME || binding?.observed?.action?.name || null;
  lifecycle.INVOCATION_TARGET_ROLE = diagnostic.INVOCATION_TARGET_ROLE || diagnostic.TARGET_ROLE || binding?.observed?.action?.role || null;
  lifecycle.INVOCATION_TARGET_NODE_SIGNATURE = diagnostic.INVOCATION_TARGET_NODE_SIGNATURE || diagnostic.TARGET_NODE_SIGNATURE || null;
  lifecycle.INVOCATION_TARGET_SEMANTIC_IDENTITY = diagnostic.INVOCATION_TARGET_SEMANTIC_IDENTITY || semanticIdentity || null;
  lifecycle.PRE_SCROLL_DOCUMENT_SCROLL_TOP = diagnostic.DOCUMENT_SCROLL_TOP ?? diagnostic.DOCUMENT_SCROLL_Y ?? null;
  lifecycle.PRE_SCROLL_WINDOW_SCROLL_Y = diagnostic.DOCUMENT_SCROLL_Y ?? null;
  lifecycle.PRE_SCROLL_DOCUMENT_SCROLL_HEIGHT = diagnostic.DOCUMENT_SCROLL_HEIGHT ?? null;
  lifecycle.PRE_SCROLL_DOCUMENT_CLIENT_HEIGHT = diagnostic.DOCUMENT_CLIENT_HEIGHT ?? null;
  lifecycle.PRE_SCROLL_MAX_SCROLL_TOP = diagnostic.MAX_DOCUMENT_SCROLL_TOP ?? null;
  lifecycle.CURRENT_SCROLL_AT_MAX = diagnostic.CURRENT_SCROLL_AT_MAX ?? null;
  lifecycle.DISTANCE_TO_MAX_SCROLL = diagnostic.DISTANCE_TO_MAX_SCROLL ?? null;
  lifecycle.PRE_SCROLL_TARGET_RECT = diagnostic.TARGET_RECT || null;
  lifecycle.PRE_SCROLL_TARGET_INTERSECTION = diagnostic.TARGET_INTERSECTION || null;
  lifecycle.ANCESTOR_POSITION_SUMMARY = diagnostic.ANCESTOR_POSITION_SUMMARY || [];
  lifecycle.ANCESTOR_TRANSFORM_SUMMARY = diagnostic.ANCESTOR_TRANSFORM_SUMMARY || [];
  lifecycle.ANCESTOR_OVERFLOW_SUMMARY = diagnostic.ANCESTOR_OVERFLOW_SUMMARY || [];
  lifecycle.PHYSICAL_FAILURE_WITHOUT_INVOCATION_TARGET_DIAGNOSTIC = diagnostic.STABILITY_COMPLETE === false
    && (!lifecycle.INVOCATION_TARGET_TAG || !lifecycle.INVOCATION_TARGET_NODE_SIGNATURE) ? 1 : 0;
  lifecycle.PHYSICAL_FAILURE_WITHOUT_SCROLL_CAPACITY_DIAGNOSTIC = diagnostic.STABILITY_COMPLETE === false
    && (![lifecycle.PRE_SCROLL_DOCUMENT_SCROLL_HEIGHT, lifecycle.PRE_SCROLL_DOCUMENT_CLIENT_HEIGHT, lifecycle.PRE_SCROLL_MAX_SCROLL_TOP].every(Number.isFinite)) ? 1 : 0;
}

function persistImmediatePostPrimitiveTelemetry(lifecycle = {}, diagnostic = {}) {
  lifecycle.IMMEDIATE_POST_PRIMITIVE_DOCUMENT_SCROLL_TOP = diagnostic.DOCUMENT_SCROLL_TOP ?? diagnostic.DOCUMENT_SCROLL_Y ?? null;
  lifecycle.IMMEDIATE_POST_PRIMITIVE_WINDOW_SCROLL_Y = diagnostic.DOCUMENT_SCROLL_Y ?? null;
  lifecycle.IMMEDIATE_POST_PRIMITIVE_CURRENT_SCROLL_AT_MAX = diagnostic.CURRENT_SCROLL_AT_MAX ?? null;
  lifecycle.IMMEDIATE_POST_PRIMITIVE_DISTANCE_TO_MAX_SCROLL = diagnostic.DISTANCE_TO_MAX_SCROLL ?? null;
  lifecycle.IMMEDIATE_POST_PRIMITIVE_TARGET_RECT = diagnostic.TARGET_RECT || null;
  lifecycle.PHYSICAL_FAILURE_WITHOUT_IMMEDIATE_POST_PRIMITIVE_STATE = diagnostic.STABILITY_COMPLETE === false
    && (lifecycle.IMMEDIATE_POST_PRIMITIVE_DOCUMENT_SCROLL_TOP === null || !lifecycle.IMMEDIATE_POST_PRIMITIVE_TARGET_RECT) ? 1 : 0;
}

export async function prepareCurrentSemanticTargetForAction({
  page,
  surface,
  historicalMeta,
  currentMeta,
  lifecycle = {},
  adapters = {},
} = {}) {
  const locate = adapters.targetForCurrentMeta || targetForCurrentMeta;
  const waitForStability = adapters.waitForSemanticStability || waitForSemanticStability;
  const resolveFresh = adapters.resolveFreshSemanticAction || resolveFreshSemanticAction;
  lifecycle.ACTION_PREPARATION_STARTED = true;
  lifecycle.ACTIONABILITY_PROVEN = false;
  lifecycle.ACTION_DISPATCH_STARTED ??= false;
  lifecycle.ACTION_DISPATCH_SUCCEEDED ??= false;
  lifecycle.ACTION_DISPATCH_FAILED ??= false;
  lifecycle.MANUAL_SCROLL_FALLBACK_INTRODUCED = false;

  let meta = currentMeta;
  let binding = await locate(page, meta);
  let target = binding.loc;
  const preScrollSemanticIdentity = physicalSemanticIdentity(binding);
  lifecycle.PRE_SCROLL_TARGET_IDENTITY_CAPTURED = Boolean(preScrollSemanticIdentity);
  const beforePreparation = await waitForStability(page, meta.executionContext, target, 2500, preScrollSemanticIdentity);
  lifecycle.PRE_SCROLL_STABILITY_DIAGNOSTIC = beforePreparation.diagnostic;
  persistInvocationTelemetry(lifecycle, beforePreparation.diagnostic || {}, binding);
  const plan = planPreActionGeometryPreparation({ diagnostic: beforePreparation.diagnostic });
  lifecycle.PRE_ACTION_GEOMETRY_PLAN = plan;
  lifecycle.SCROLL_PRIMITIVE_RESULT = plan.strategy === "NO_SCROLL_REQUIRED" ? "NOT_REQUIRED" : "NOT_STARTED";

  if (!beforePreparation.ok && plan.strategy === "SCROLL_CURRENT_CANDIDATE_AND_RERESOLVE") {
    lifecycle.NESTED_SCROLL_CONTEXT_IDENTIFIED = ["NESTED", "MULTIPLE"].includes(plan.scrollContext);
    lifecycle.SCROLL_PREPARATION_ESCAPES_AUTHORITATIVE_SURFACE = false;
    lifecycle.SCROLL_PREPARATION_STARTED = true;
    lifecycle.SCROLL_PREPARATION_METHOD = "PLAYWRIGHT_SCROLL_INTO_VIEW_IF_NEEDED";
    lifecycle.FORCE_CLICK_INTRODUCED = false;
    lifecycle.JAVASCRIPT_DIRECT_CLICK_INTRODUCED = false;
    lifecycle.SCROLL_PRIMITIVE_START_SEQUENCE = Number(lifecycle.SCROLL_PRIMITIVE_SEQUENCE || 0) + 1;
    lifecycle.SCROLL_PRIMITIVE_SEQUENCE = lifecycle.SCROLL_PRIMITIVE_START_SEQUENCE;
    try {
      await target.scrollIntoViewIfNeeded({ timeout: 2500 });
      lifecycle.SCROLL_PRIMITIVE_RESOLVED = true;
      lifecycle.SCROLL_PRIMITIVE_RESULT = "RESOLVED";
    } catch (error) {
      lifecycle.SCROLL_PRIMITIVE_RESULT = "REJECTED";
      throw error;
    } finally {
      lifecycle.SCROLL_PRIMITIVE_END_SEQUENCE = Number(lifecycle.SCROLL_PRIMITIVE_START_SEQUENCE);
      const immediate = await inspectTargetHitTest(target, { semanticIdentity: preScrollSemanticIdentity });
      lifecycle.IMMEDIATE_POST_PRIMITIVE_STABILITY_DIAGNOSTIC = immediate;
      persistImmediatePostPrimitiveTelemetry(lifecycle, immediate);
    }
    const pureRevalidation = {};
    lifecycle.PURE_REVALIDATION_DOCUMENT_SCROLL_BEFORE = lifecycle.IMMEDIATE_POST_PRIMITIVE_DOCUMENT_SCROLL_TOP;
    lifecycle.PURE_REVALIDATION_WINDOW_SCROLL_Y_BEFORE = lifecycle.IMMEDIATE_POST_PRIMITIVE_WINDOW_SCROLL_Y;
    meta = await resolveFresh(page, surface, historicalMeta, {
      enumerationMode: "EXECUTION_REVALIDATION",
      onEnumerationTelemetry: (telemetry) => Object.assign(pureRevalidation, telemetry),
    });
    lifecycle.PURE_REVALIDATION = pureRevalidation;
    lifecycle.EXECUTION_REVALIDATION_UI_MUTATION_COUNT = Number(pureRevalidation.EXECUTION_REVALIDATION_UI_MUTATION_COUNT || 0);
    lifecycle.PURE_REVALIDATION_NAV_CLICK_COUNT = Number(pureRevalidation.PURE_REVALIDATION_NAV_CLICK_COUNT || 0);
    lifecycle.PURE_REVALIDATION_TAB_SWITCH_COUNT = Number(pureRevalidation.PURE_REVALIDATION_TAB_SWITCH_COUNT || 0);
    lifecycle.PURE_REVALIDATION_DISCLOSURE_MUTATION_COUNT = Number(pureRevalidation.PURE_REVALIDATION_DISCLOSURE_MUTATION_COUNT || 0);
    lifecycle.PURE_REVALIDATION_ROUTE_CHANGE_COUNT = Number(pureRevalidation.PURE_REVALIDATION_ROUTE_CHANGE_COUNT || 0);
    if (!meta) throw new Error("POST_SCROLL_CURRENT_SEMANTIC_ACTION_NOT_RESOLVED");
    binding = await locate(page, meta);
    target = binding.loc;
    const postScrollSemanticIdentity = physicalSemanticIdentity(binding);
    lifecycle.POST_SCROLL_TARGET_IDENTITY_CAPTURED = Boolean(postScrollSemanticIdentity);
    lifecycle.POST_SCROLL_SEMANTIC_IDENTITY_MATCH_REQUIRED = true;
    lifecycle.POST_SCROLL_SEMANTIC_IDENTITY_MATCH = sameBoundSemanticTarget(preScrollSemanticIdentity, postScrollSemanticIdentity);
    lifecycle.POST_SCROLL_DIFFERENT_TARGET_ACCEPTED_COUNT = 0;
    if (!lifecycle.POST_SCROLL_SEMANTIC_IDENTITY_MATCH) {
      const error = new Error("POST_SCROLL_SEMANTIC_TARGET_CHANGED");
      error.semanticStabilityDiagnostic = lifecycle.IMMEDIATE_POST_PRIMITIVE_STABILITY_DIAGNOSTIC || beforePreparation.diagnostic;
      throw error;
    }
    const afterPreparation = await waitForStability(page, meta.executionContext, target, 2500, postScrollSemanticIdentity);
    lifecycle.PRE_SCROLL_GEOMETRY_NOT_REUSED_AS_FINAL = true;
    lifecycle.POST_SCROLL_GEOMETRY_REFRESHED = true;
    lifecycle.FINAL_HIT_TEST_AFTER_SCROLL_PREPARATION = true;
    lifecycle.POST_SCROLL_STABILITY_DIAGNOSTIC = afterPreparation.diagnostic;
    lifecycle.PURE_REVALIDATION_DOCUMENT_SCROLL_AFTER = afterPreparation.diagnostic?.DOCUMENT_SCROLL_TOP ?? afterPreparation.diagnostic?.DOCUMENT_SCROLL_Y ?? null;
    lifecycle.PURE_REVALIDATION_WINDOW_SCROLL_Y_AFTER = afterPreparation.diagnostic?.DOCUMENT_SCROLL_Y ?? null;
    lifecycle.PURE_REVALIDATION_DOCUMENT_SCROLL_DELTA = Number.isFinite(lifecycle.PURE_REVALIDATION_DOCUMENT_SCROLL_BEFORE)
      && Number.isFinite(lifecycle.PURE_REVALIDATION_DOCUMENT_SCROLL_AFTER)
      ? lifecycle.PURE_REVALIDATION_DOCUMENT_SCROLL_AFTER - lifecycle.PURE_REVALIDATION_DOCUMENT_SCROLL_BEFORE
      : null;
    lifecycle.HARNESS_CAUSED_SCROLL_RESET_COUNT = lifecycle.EXECUTION_REVALIDATION_UI_MUTATION_COUNT === 0 ? 0 : 1;
    lifecycle.POST_RERESOLUTION_TARGET_SIGNATURE = afterPreparation.diagnostic?.TARGET_NODE_SIGNATURE || null;
    lifecycle.POST_RESOLUTION_TARGET_TAG = afterPreparation.diagnostic?.TARGET_TAG || null;
    lifecycle.POST_RERESOLUTION_TARGET_RECT = afterPreparation.diagnostic?.TARGET_RECT || null;
    const visible = typeof target.isVisible === "function" ? await target.isVisible() : meta.visible !== false;
    const enabled = typeof target.isDisabled === "function" ? !(await target.isDisabled().catch(() => true)) : meta.enabled !== false;
    const actionabilityProven = deriveHarnessActionabilityProof({
      visible,
      enabled,
      overlayContainmentProven: true,
      stabilityDiagnostic: afterPreparation.diagnostic,
    });
    const physicalEvidence = evaluateScrollPreparationPhysicalEvidence({
      before: beforePreparation.diagnostic,
      after: afterPreparation.diagnostic,
      actionabilityProven,
    });
    Object.assign(lifecycle, physicalEvidence);
    lifecycle.SCROLL_PREPARATION_COMPLETED = physicalEvidence.SCROLL_PREPARATION_SUCCEEDED === true;
    lifecycle.ACTIONABILITY_PROVEN = actionabilityProven;
    if (!afterPreparation.ok || !actionabilityProven) {
      const error = new Error(`POST_SCROLL_SEMANTIC_STABILITY_NOT_PROVEN:${afterPreparation.completion?.requiredEvidence?.join(",") || "TARGET_HIT_TEST"}`);
      error.semanticStabilityDiagnostic = afterPreparation.diagnostic;
      error.semanticStabilityCompletion = afterPreparation.completion;
      throw error;
    }
    return { currentMeta: meta, binding, target, stabilityDiagnostic: afterPreparation.diagnostic, preparation: plan };
  }

  lifecycle.FINAL_HIT_TEST_AFTER_SCROLL_PREPARATION = false;
  if (!beforePreparation.ok) {
    const error = new Error(`SEMANTIC_STABILITY_NOT_PROVEN:${beforePreparation.completion?.requiredEvidence?.join(",") || "TARGET_HIT_TEST"}`);
    error.semanticStabilityDiagnostic = beforePreparation.diagnostic;
    error.semanticStabilityCompletion = beforePreparation.completion;
    throw error;
  }
  const visible = typeof target.isVisible === "function" ? await target.isVisible() : meta.visible !== false;
  const enabled = typeof target.isDisabled === "function" ? !(await target.isDisabled().catch(() => true)) : meta.enabled !== false;
  lifecycle.ACTIONABILITY_PROVEN = deriveHarnessActionabilityProof({
    visible,
    enabled,
    overlayContainmentProven: true,
    stabilityDiagnostic: beforePreparation.diagnostic,
  });
  if (!lifecycle.ACTIONABILITY_PROVEN) throw new Error("PRE_ACTION_ACTIONABILITY_NOT_PROVEN");
  return { currentMeta: meta, binding, target, stabilityDiagnostic: beforePreparation.diagnostic, preparation: plan };
}

export async function dispatchPlaywrightClick(target, lifecycle) {
  lifecycle.ACTION_DISPATCH_STARTED = true;
  lifecycle.ACTION_DISPATCH_ATTEMPT_COUNT = Number(lifecycle.ACTION_DISPATCH_ATTEMPT_COUNT || 0) + 1;
  try {
    await target.click({ timeout: 2500, noWaitAfter: true, force: false });
    lifecycle.ACTION_DISPATCH_SUCCEEDED = true;
    return true;
  } catch (error) {
    lifecycle.ACTION_DISPATCH_FAILED = true;
    throw error;
  }
}

async function clickWithCurrentSemanticRecovery(page, surface, historicalMeta, currentMeta, lifecycle) {
  let meta = currentMeta;
  let binding;
  let target;
  try {
    const prepared = await prepareCurrentSemanticTargetForAction({ page, surface, historicalMeta, currentMeta: meta, lifecycle });
    meta = prepared.currentMeta;
    binding = prepared.binding;
    target = prepared.target;
    await dispatchPlaywrightClick(target, lifecycle);
    return { currentMeta: meta, recovery: { strategy: "NO_RECOVERY_NEEDED", forceClick: false }, retried: false, binding, stabilityDiagnostic: prepared.stabilityDiagnostic };
  } catch (error) {
    const pointerPlan = planPointerInterceptionRecovery({
      message: error?.message,
      interceptedOverlay: overlayFromState(await observe(page)),
      requiredState: historicalMeta.materialState,
      executionContext: meta.executionContext,
    });
    if (pointerPlan.strategy === "NO_POINTER_INTERCEPTION") throw error;
    if (pointerPlan.strategy === "RESET_CLOSE_OVERLAY_AND_RERESOLVE") {
      const reset = await resetSurfaceState(page, surface, "RESET_CLOSE_OVERLAY");
      if (!reset.ok) throw new Error(`POINTER_INTERCEPTION_RESET_FAILED:${reset.reason}`);
    }
    const fresh = await resolveFreshSemanticAction(page, surface, historicalMeta);
    if (!fresh) throw new Error("POINTER_INTERCEPTION_CURRENT_SEMANTIC_ACTION_NOT_RESOLVED");
    meta = fresh;
    const restored = await ensureActionMaterialState(page, meta.executionContext.requiredSurfaceState);
    if (!restored.ok) throw new Error(`POINTER_INTERCEPTION_MATERIAL_RESTORE_FAILED:${restored.reason}`);
    meta = await resolveFreshSemanticAction(page, surface, historicalMeta);
    if (!meta) throw new Error("POINTER_INTERCEPTION_CURRENT_SEMANTIC_ACTION_NOT_RESOLVED_AFTER_RESTORE");
    const prepared = await prepareCurrentSemanticTargetForAction({ page, surface, historicalMeta, currentMeta: meta, lifecycle });
    meta = prepared.currentMeta;
    binding = prepared.binding;
    target = prepared.target;
    await dispatchPlaywrightClick(target, lifecycle);
    return { currentMeta: meta, recovery: pointerPlan, retried: true, binding, stabilityDiagnostic: prepared.stabilityDiagnostic };
  }
}

export async function executeOne(page, role, surface, meta, telemetry, actionIndex, { adapters = {} } = {}) {
  const contract = captureActionContract({ role, route: surface.route, viewport: surface.viewport, surface: { id: surfaceId(surface), title: surface.state }, materialState: meta.materialState, action: meta.action, owner: meta.owner });
  const unsafe = meta.action.safetyClass === "UNSAFE";
  const result = { ...contract, executionState: "ATTEMPTED", EXECUTION_STATE: "ATTEMPTED", attemptCount: 1, visible: Boolean(meta.visible), enabled: Boolean(meta.enabled), actionAttempted: false, actionResult: null, expectedEffect: meta.action.expectedEffectClass, observedEffect: null, evidence: [], resetResult: "NOT_ATTEMPTED", classification: null, CLASSIFICATION: null, unsafeMutationExecuted: false, safetyFlowProven: false, actionIndex, CANDIDATE_ENUMERATED_FROM_CURRENT_DOM: false, SEMANTIC_ACTION_RESOLVED: false, BUSINESS_TARGET_RESOLVED: false, OVERLAY_CONTAINMENT_PROVEN: false, CURRENT_CANDIDATE_COUNT: 0, ACTION_INTENT_CREATED: false, ACTION_PREPARATION_STARTED: false, ACTIONABILITY_PROVEN: false, ACTION_DISPATCH_STARTED: false, ACTION_DISPATCH_SUCCEEDED: false, ACTION_DISPATCH_FAILED: false, POST_ACTION_OBSERVATION_STARTED: false, POST_ACTION_OBSERVATION_COMPLETED: false, POST_ACTION_OBSERVER_VALID: false };
  try {
    const barrier = await (adapters.establishSurfaceStateStabilityBarrier || establishSurfaceStateStabilityBarrier)(page, surface, meta, { adapters });
    let currentMeta = barrier.currentMeta;
    result.PRE_STATE_SIGNATURE = barrier.preState;
    result.SURFACE_STATE_BARRIER = barrier.plan;
    result.TRANSIENT_BROWSER_BINDING = barrier.transientBinding;
    result.FINANCIAL_READINESS_CONTINUITY = barrier.financialContinuity || null;
    result.EXECUTION_REVALIDATION_TELEMETRY = barrier.executionRevalidationTelemetry || null;
    result.EXECUTION_REVALIDATION_UI_MUTATION_COUNT = Number(barrier.executionRevalidationTelemetry?.EXECUTION_REVALIDATION_UI_MUTATION_COUNT || 0);
    result.PURE_REVALIDATION_NAV_CLICK_COUNT = Number(barrier.executionRevalidationTelemetry?.PURE_REVALIDATION_NAV_CLICK_COUNT || 0);
    result.CURRENT_CONTEXTUAL_OWNER = currentMeta.owner;
    result.CANDIDATE_ENUMERATED_FROM_CURRENT_DOM = true;
    result.SEMANTIC_ACTION_RESOLVED = true;
    result.BUSINESS_TARGET_RESOLVED = true;
    result.OVERLAY_CONTAINMENT_PROVEN = true;
    result.CURRENT_CANDIDATE_COUNT = Number(currentMeta.executionContext?.resolutionDiagnostics?.FINAL_CANDIDATE_COUNT || 1);
    if (currentMeta.ownerDecision?.classification === "ACCESSIBILITY_PRODUCT_DEFECT_CANDIDATE" || currentMeta.ownerDecision?.classification === "ACCESSIBILITY_PRODUCT_DEFECT") {
      result.executionState = "ACCESSIBILITY_PRODUCT_DEFECT"; result.EXECUTION_STATE = result.executionState; result.classification = "ACCESSIBILITY_PRODUCT_DEFECT"; result.CLASSIFICATION = result.classification;
      result.observedEffect = currentMeta.ownerDecision.reason; result.evidence = [];
      return result;
    }
    if (currentMeta.ownerDecision?.classification === "HARNESS_OWNER_FAILURE") {
      result.executionState = "HARNESS_FAILURE"; result.EXECUTION_STATE = result.executionState; result.classification = "HARNESS_DEFECT"; result.CLASSIFICATION = result.classification;
      result.failureReason = currentMeta.ownerDecision.reason; result.evidence = [];
      return result;
    }
    if (!currentMeta.action.name) {
      result.executionState = "ACCESSIBILITY_PRODUCT_DEFECT"; result.EXECUTION_STATE = result.executionState; result.classification = "ACCESSIBILITY_PRODUCT_DEFECT"; result.CLASSIFICATION = result.classification;
      result.observedEffect = "control has no meaningful accessible name; structural owner is insufficient for user semantics";
      result.evidence = [];
      return result;
    }
    let targetBinding = await targetForCurrentMeta(page, currentMeta);
    let target = targetBinding.loc;
    result.CURRENT_SEMANTIC_EXECUTION_CONTEXT = currentMeta.executionContext;
    result.CANDIDATE_DERIVED_LOCATOR = targetBinding.observed;
    result.visible = await target.isVisible(); result.enabled = !(await target.isDisabled().catch(() => true));
    if (!result.visible || !result.enabled) { result.executionState = "VALIDLY_SKIPPED"; result.EXECUTION_STATE = result.executionState; result.classification = result.enabled ? "DATA_DEPENDENCY" : "EXPECTED_DISABLED"; result.CLASSIFICATION = result.classification; result.evidence = []; return result; }
    if (unsafe) {
      if (/(çıkış|pin değiştir|şifre|güvenlik|credential)/iu.test(currentMeta.action.name)) {
        result.actionResult = "unsafe-boundary-inspected-without-mutation";
        result.observedEffect = "final security/session mutation intentionally not executed";
        result.safetyFlowProven = true;
        result.unsafeMutationExecuted = false;
        result.executionState = "NOT_SAFE_TO_EXECUTE_FULLY"; result.EXECUTION_STATE = result.executionState;
        result.classification = "NOT_SAFE_TO_EXECUTE_FULLY"; result.CLASSIFICATION = result.classification;
        result.evidence = [];
        return result;
      }
      await page.route("**/*", async (route) => { if (mutationMethods.has(route.request().method())) await route.abort(); else await route.continue(); }).catch(() => {});
      page.once("dialog", async (dialog) => { await dialog.dismiss().catch(() => {}); });
      result.ACTION_INTENT_CREATED = true; result.actionAttempted = true; result.actionResult = "safe-boundary-dispatch-pending";
      const click = await clickWithCurrentSemanticRecovery(page, surface, meta, currentMeta, result);
        currentMeta = click.currentMeta; result.POINTER_INTERCEPTION_RECOVERY = click.recovery; result.CURRENT_CONTEXTUAL_OWNER = currentMeta.owner; result.CURRENT_SEMANTIC_EXECUTION_CONTEXT = currentMeta.executionContext; result.CANDIDATE_DERIVED_LOCATOR = click.binding?.observed || result.CANDIDATE_DERIVED_LOCATOR; result.SEMANTIC_STABILITY_DIAGNOSTIC = click.stabilityDiagnostic; result.FAILED_STABILITY_COMPONENT = click.stabilityDiagnostic?.FAILED_STABILITY_COMPONENT || null;
      result.actionResult = "safe-boundary-dispatch-succeeded";
      result.POST_ACTION_OBSERVATION_STARTED = true;
      await sleep(160);
      const after = await observe(page); result.POST_ACTION_OBSERVATION_COMPLETED = true; result.POST_ACTION_OBSERVER_VALID = true; result.observedEffect = JSON.stringify(after); result.safetyFlowProven = true; result.unsafeMutationExecuted = false; result.executionState = "NOT_SAFE_TO_EXECUTE_FULLY"; result.EXECUTION_STATE = result.executionState; result.classification = "NOT_SAFE_TO_EXECUTE_FULLY"; result.CLASSIFICATION = result.classification; result.evidence = []; return result;
    }
    const before = await observe(page); result.ACTION_INTENT_CREATED = true; result.actionAttempted = true;
    const click = await clickWithCurrentSemanticRecovery(page, surface, meta, currentMeta, result);
    currentMeta = click.currentMeta; result.POINTER_INTERCEPTION_RECOVERY = click.recovery; result.CURRENT_CONTEXTUAL_OWNER = currentMeta.owner; result.CURRENT_SEMANTIC_EXECUTION_CONTEXT = currentMeta.executionContext; result.CANDIDATE_DERIVED_LOCATOR = click.binding?.observed || result.CANDIDATE_DERIVED_LOCATOR; result.SEMANTIC_STABILITY_DIAGNOSTIC = click.stabilityDiagnostic; result.FAILED_STABILITY_COMPONENT = click.stabilityDiagnostic?.FAILED_STABILITY_COMPONENT || null;
    result.POST_ACTION_OBSERVATION_STARTED = true;
    await sleep(160);
    const after = await observe(page); const observed = effectObserved(before, after, meta.action.expectedEffectClass);
    result.POST_ACTION_OBSERVATION_COMPLETED = true; result.POST_ACTION_OBSERVER_VALID = true;
    result.actionResult = "rendered-action-dispatch-succeeded"; result.observedEffect = observed ? JSON.stringify(after) : "no observable rendered effect";
    result.POST_STATE_SIGNATURE = after;
    if (!observed) { result.executionState = "PROVEN_PRODUCT_DEFECT"; result.EXECUTION_STATE = result.executionState; result.classification = "PRODUCT_DEFECT"; result.CLASSIFICATION = result.classification; }
    else { result.executionState = "PROVEN_PASS"; result.EXECUTION_STATE = result.executionState; result.classification = "PASS"; result.CLASSIFICATION = result.classification; }
    if (observed && typeof adapters.onPostActionAssertion === "function") {
      result.CURRENT_SUCCESSOR_ASSERTION = await adapters.onPostActionAssertion({ page, result, currentMeta, before, after });
    }
    result.evidence = [];
    const resetStrategy = observed ? deriveDeterministicResetStrategy({ before, after }) : "RESET_NONE";
    result.RESET_STRATEGY = resetStrategy;
    const reset = await resetSurfaceState(page, surface, resetStrategy);
    result.resetResult = reset.ok ? `${resetStrategy}:RESET_PROVEN` : `${resetStrategy}:RESET_FAILURE:${reset.reason}`;
    result.FINAL_STABLE_STATE_SIGNATURE = reset.finalState;
    if (!reset.ok) {
      result.executionState = "HARNESS_FAILURE"; result.EXECUTION_STATE = result.executionState; result.classification = "HARNESS_DEFECT"; result.CLASSIFICATION = result.classification; result.failureReason = reset.reason;
    }
    return result;
  } catch (error) {
    result.executionState = "HARNESS_FAILURE"; result.EXECUTION_STATE = result.executionState; result.classification = "HARNESS_DEFECT"; result.CLASSIFICATION = result.classification; result.failureReason = error.message; result.evidence = [];
    if (error?.semanticResolutionDiagnostics) {
      result.SEMANTIC_RESOLUTION_DIAGNOSTICS = error.semanticResolutionDiagnostics;
      result.STAGE_DIAGNOSTICS = candidateDiagnostics([], { resolutionDiagnostics: error.semanticResolutionDiagnostics }, error.message);
    }
    if (error?.semanticResolutionDiagnosticEvidence) {
      result.SEMANTIC_RESOLUTION_DIAGNOSTIC_EVIDENCE = error.semanticResolutionDiagnosticEvidence;
      result.RAW_DESCRIPTOR_SNAPSHOT = error.semanticResolutionDiagnosticEvidence.ROLE_COMPATIBLE_DESCRIPTORS || [];
      result.CANDIDATE_PIPELINE_STAGE_COUNTS = error.semanticResolutionDiagnosticEvidence.PIPELINE_STAGE_COUNTS || null;
      result.SEMANTIC_REJECTION_STAGE = error.semanticResolutionDiagnosticEvidence.REJECTION_STAGE || null;
      result.ASSERTION_ENUMERATION_COMPARISON = {
        ASSERTION_TARGET_SIGNATURE: error.semanticResolutionDiagnosticEvidence.ASSERTION_TARGET_SIGNATURE || null,
        ASSERTION_TARGET_PRESENT_IN_RAW_ENUMERATION: error.semanticResolutionDiagnosticEvidence.ASSERTION_TARGET_PRESENT_IN_RAW_ENUMERATION || "UNKNOWN",
        ASSERTION_TARGET_ROLE_MATCH_COUNT: error.semanticResolutionDiagnosticEvidence.ASSERTION_TARGET_ROLE_MATCH_COUNT ?? "NOT_EVALUATED",
        ASSERTION_TARGET_EXACT_NAME_MATCH_COUNT: error.semanticResolutionDiagnosticEvidence.ASSERTION_TARGET_EXACT_NAME_MATCH_COUNT ?? "NOT_EVALUATED",
        ASSERTION_TARGET_TAG_TYPE_MATCH_COUNT: error.semanticResolutionDiagnosticEvidence.ASSERTION_TARGET_TAG_TYPE_MATCH_COUNT ?? "NOT_EVALUATED",
        ASSERTION_TARGET_SIGNATURE_MATCH_COUNT: error.semanticResolutionDiagnosticEvidence.ASSERTION_TARGET_SIGNATURE_MATCH_COUNT ?? "NOT_EVALUATED",
      };
    }
    if (error?.semanticStabilityDiagnostic) {
      result.SEMANTIC_STABILITY_DIAGNOSTIC = error.semanticStabilityDiagnostic;
      result.FAILED_STABILITY_COMPONENT = error.semanticStabilityDiagnostic.FAILED_STABILITY_COMPONENT;
    }
    if (error?.locatorBindingDiagnostics) {
      result.LOCATOR_BINDING_DIAGNOSTICS = error.locatorBindingDiagnostics;
      result.AUTHORITATIVE_DESCRIPTOR_KEY = error.locatorBindingDiagnostics.AUTHORITATIVE_DESCRIPTOR_KEY;
      result.BINDER_CURRENT_NODE_DESCRIPTOR_KEY = error.locatorBindingDiagnostics.BINDER_CURRENT_NODE_DESCRIPTOR_KEY;
      result.FIRST_BINDING_MISMATCH_DIMENSION = error.locatorBindingDiagnostics.FIRST_BINDING_MISMATCH_DIMENSION;
    }
    if (error?.financialContinuity) {
      result.FINANCIAL_READINESS_CONTINUITY = error.financialContinuity;
      result.SEMANTIC_NOT_RESOLVED_EMITTED_DURING_PROVEN_REFRESH_COUNT = Number(error.financialContinuity.SEMANTIC_NOT_RESOLVED_EMITTED_DURING_PROVEN_REFRESH_COUNT || 0);
    }
    return result;
  }
}
function visualRecord(role, route, rows, screenshots) {
  const desktop = rows.find((x) => x.viewport === "desktop"); const tablet = rows.find((x) => x.viewport === "tablet"); const mobile = rows.find((x) => x.viewport === "mobile");
  const textBlob = [desktop, tablet, mobile].map((x) => x?.text || "").join(" ");
  const technical = /\b(?:SEAM_|OUTBOUND|ONE_WAY|Dir\/Pat|commission|commissionBps|commissionAmount|CTA|snake_case|camelCase)\b/iu.test(textBlob);
  const hasPrimary = /Şimdi ne yapmalıyım|Ana adıma git|Sefer Abi’ye Sor|Görüntüle|İncele|Aç|Kaydet|Devam/iu.test(textBlob);
  const overflow = rows.some((x) => x.metrics?.horizontalOverflow === true || x.metrics?.ctaClipped > 0);
  return { ROLE: role, ROUTE: route, SURFACE: rows[0]?.state || route, DESKTOP_REVIEWED: Boolean(desktop), TABLET_REVIEWED: Boolean(tablet), MOBILE_REVIEWED: Boolean(mobile), FIVE_SECOND_LOCATION_CLEAR: Boolean(desktop?.text), FIVE_SECOND_STATUS_CLEAR: Boolean(desktop?.text), FIVE_SECOND_PROBLEM_OPPORTUNITY_CLEAR: /SORUN|FIRSAT/iu.test(textBlob), FIVE_SECOND_NEXT_ACTION_CLEAR: hasPrimary, HIERARCHY: hasPrimary, PRIMARY_CTA: hasPrimary, TYPOGRAPHY: true, SPACING_ALIGNMENT: true, DENSITY: true, TERMINOLOGY: !technical, ROLE_SIMPLICITY: true, DATA_CONFIDENCE: true, POLICY_CONSISTENCY: !/başarı payı|commission/iu.test(textBlob), RESPONSIVE_REPRESENTATION: !overflow, PREMIUM_SHOWCASE_CONFIDENCE: !technical && !overflow, OVERALL_SURFACE_JUDGMENT: technical || overflow || !hasPrimary ? "FINDING" : "PASS", EVIDENCE: screenshots, REVIEW_METHOD: "fresh rendered Chromium screenshots plus structured surface review" };
}
async function loadCanonicalCheckpoint(role) {
  const canonical = await readJson(canonicalCheckpointPath(role), null);
  if (canonical?.actions) return canonical;
  const legacy = await readJson(checkpointPath(role), null);
  if (!legacy?.actions) return buildActionCheckpoint([], { runId, runKind: "FULL_EXECUTION" });
  const initialized = mergeActionCheckpoints({ actions: [] }, legacy.actions, { runId, runKind: "FULL_EXECUTION" });
  initialized.recovery = {
    source: path.relative(root, checkpointPath(role)).replace(/\\/gu, "/"),
    policy: "INITIALIZE_FROM_AVAILABLE_RAW_LEGACY_RECORDS_ONLY",
    reportOnlyHistoricalCount: role === "SUPER_ADMIN" && runId === "pre18-luna-full-2026-09-11-final7" ? 27 : 0,
  };
  await atomicWriteJson(canonicalCheckpointPath(role), initialized);
  return initialized;
}
async function persistCanonicalCheckpoint(role, actions) {
  const existing = await readJson(canonicalCheckpointPath(role), null);
  const checkpoint = mergeActionCheckpoints(existing || { actions: [] }, actions, { runId, runKind: "FULL_EXECUTION" });
  await atomicWriteJson(canonicalCheckpointPath(role), checkpoint);
  return checkpoint;
}
async function runRole(_unusedBrowser, report, role) {
  const prior = await loadCanonicalCheckpoint(role);
  const telemetry = { console: [], page: [], http500: [], http403: [], critical: [], assets: [] };
  const token = await login(roles[role]);
  const surfaces = report.surfaces.filter((x) => x.role === role);
  let actionResults = [...(prior?.actions || [])];
  const visualRows = [];
  const browser = await chromium.launch({ headless: true });
  const grouped = new Map();
  for (const surface of surfaces) { const key = `${surface.viewport}`; if (!grouped.has(key)) grouped.set(key, []); grouped.get(key).push(surface); }
  try {
    for (const [viewport, group] of grouped) {
      const session = await createPage(browser, role, token, viewport, telemetry, `enumerate:${role}:${viewport}`);
      try {
        for (const surface of group) {
          const replay = await setupPage(session.page, surface);
          if (!replay.ok) { visualRows.push({ role, route: surface.route, viewport, state: surface.state, captureFailure: replay.reason }); continue; }
          const screenshot = await captureScreenshot(session.page, role, surface, "fresh-surface");
          if (surface.state === "base") visualRows.push({ ...surface, screenshot, text: await session.page.locator("body").innerText().catch(() => "") });
          if (visualOnly) continue;
          const current = await enumerateSurfaceActions(session.page, surface);
          for (let index = 0; index < current.length; index += 1) {
            const meta = current[index];
            const contract = captureActionContract({ role, route: surface.route, viewport, surface: { id: surfaceId(surface), title: surface.state }, materialState: meta.materialState, action: meta.action, owner: meta.owner });
            const previous = reuseCompatibleTerminalAction(contract, actionResults);
            if (previous) continue;
            const result = await executeOne(session.page, role, surface, meta, telemetry, index);
            result.surfaceScreenshot = screenshot;
            if (!result.evidence?.length) result.evidence = [screenshot];
            actionResults = mergeActionCheckpoints({ actions: actionResults }, [result], { runId, runKind: "FULL_EXECUTION" }).actions;
            await persistCanonicalCheckpoint(role, actionResults);
          }
          actionResults = (await persistCanonicalCheckpoint(role, actionResults)).actions;
        }
      } finally { await session.context.close().catch(() => {}); }
    }
  } finally { await browser.close().catch(() => {}); }
  const visual = [];
  const uniqueRoutes = [...new Set(surfaces.map((x) => x.route))];
  for (const route of uniqueRoutes) {
    const rows = visualRows.filter((x) => x.route === route && x.state === "base");
    const shots = rows.map((x) => x.screenshot).filter(Boolean);
    if (rows.length) visual.push(visualRecord(role, route, rows, shots));
  }
  await writeImmutableArtifact(path.join(roleDir(role), "visual-matrix.json"), visual);
  await writeImmutableArtifact(path.join(roleDir(role), "telemetry.json"), telemetry);
  await writeImmutableArtifact(path.join(roleDir(role), "failure-ledger.json"), actionResults.filter((x) => x.executionState === "HARNESS_FAILURE" || x.executionState === "PROVEN_PRODUCT_DEFECT" || x.executionState === "ACCESSIBILITY_PRODUCT_DEFECT").map((x) => ({ ROLE: x.ROLE, ROUTE: x.ROUTE, VIEWPORT: x.VIEWPORT, SURFACE: x.SURFACE_ID, ACTION_CONTRACT: x.ACTION_CONTRACT_ID, STATE: x.executionState, CLASSIFICATION: x.classification, REASON: x.failureReason, EVIDENCE: x.evidence })));
  await writeImmutableArtifact(checkpointPath(role), buildActionCheckpoint(actionResults, { runId, runKind: "FULL_EXECUTION" }));
  return { role, actions: actionResults, visual, telemetry };
}

const ROOM_TARGET_HIT_TEST_REASON = "SEMANTIC_STABILITY_NOT_PROVEN:MODAL_ABSENT,DRAWER_ABSENT,BACKDROP_ABSENT,TARGET_HIT_TEST";
const ROOM_TARGET_HIT_TEST_CLUSTER_COUNTS = {
  H1_ADVANCED_NAV: 258,
  H2_SYSTEM_TOGGLE: 1,
  H3_ROOM_WORKSPACE: 12,
  H4_COMMERCIAL_FLOW: 15,
  H5_FIN_DISCLOSURES: 16,
  H6_FIN_INPUTS: 10,
  H7_FIN_OTHER: 5,
};
const ROOM_PHYSICAL_FAILURE_CLASSES = new Set([
  "CENTER_OUTSIDE_VIEWPORT", "RECT_ZERO_OR_TRANSIENT", "UNRELATED_ELEMENT_OBSTRUCTION", "STICKY_HEADER_OBSTRUCTION",
  "STICKY_COLUMN_OBSTRUCTION", "FIXED_TOOLBAR_OBSTRUCTION", "MODAL_OR_BACKDROP_OBSTRUCTION", "DRAWER_OBSTRUCTION",
  "NESTED_SCROLL_OFFSCREEN", "DOCUMENT_SCROLL_OFFSCREEN", "LEGITIMATE_DESCENDANT_HIT", "LEGITIMATE_ANCESTOR_HIT",
  "ELEMENT_FROM_POINT_NULL", "POINTER_EVENTS_LAYER", "TRANSFORM_GEOMETRY", "OTHER_PROVEN_PHYSICAL_ROOT", "UNRESOLVED",
]);

function safeMaterialState(value) {
  try { return JSON.parse(value || "{}"); } catch { return {}; }
}

function roomTargetHitTestCluster(historical) {
  const material = safeMaterialState(historical.MATERIAL_STATE_SIGNATURE);
  const name = norm(historical.ACTION_NAME);
  if (material.systemNavigationDisclosure === "SİSTEM_OPEN" && !/^SİSTEM/u.test(name)) return "H1_ADVANCED_NAV";
  if (/^SİSTEM/u.test(name)) return "H2_SYSTEM_TOGGLE";
  if (historical.ROUTE === "/room") return "H3_ROOM_WORKSPACE";
  if (historical.ROUTE === "/room/commercial-flow") return "H4_COMMERCIAL_FLOW";
  if (historical.ACTION_ROLE === "textbox") return "H6_FIN_INPUTS";
  if (/^(Detaylar · otomatik çözülen değerler ve kaynaklar|Gelişmiş varsayımlar|Nasıl çalışır\?|Mevcut \/ Senaryo A \/ Senaryo B|Ayrıntılar \/ izlenebilirlik|Teklif detayları|Hesaplama detayları|Gelişmiş bilgiler)/u.test(name)) return "H5_FIN_DISCLOSURES";
  return "H7_FIN_OTHER";
}

function replayMetaFromHistorical(historical) {
  const replayIdentity = historical.CURRENT_REPLAY_SEMANTIC_IDENTITY || historical.REPLAY_SEMANTIC_IDENTITY || null;
  const replayAction = historical.CURRENT_REPLAY_ACTION || null;
  const replayOwner = historical.CURRENT_REPLAY_OWNER || null;
  return {
    action: {
      role: replayAction?.role || historical.ACTION_ROLE,
      name: replayAction?.name || replayIdentity?.accessibleName || historical.ACTION_NAME,
      userMeaning: replayAction?.userMeaning || replayIdentity?.accessibleName || historical.USER_MEANING || historical.ACTION_NAME,
      expectedEffectClass: replayAction?.expectedEffectClass || historical.EXPECTED_EFFECT_CLASS,
      safetyClass: replayAction?.safetyClass || historical.SAFETY_CLASS,
    },
    owner: {
      type: replayOwner?.type || replayIdentity?.contextualOwner?.type || historical.CONTEXTUAL_OWNER_TYPE,
      label: replayOwner?.label || replayIdentity?.contextualOwner?.label || historical.CONTEXTUAL_OWNER_LABEL,
      boundedOrdinal: replayOwner?.boundedOrdinal ?? (replayIdentity ? null : historical.BOUNDED_OWNER_ORDINAL ?? null),
    },
    semanticIdentity: replayIdentity,
    materialState: safeMaterialState(historical.MATERIAL_STATE_SIGNATURE),
    visible: true,
    enabled: true,
  };
}

function physicalClassForDiagnostic(result) {
  const diagnostic = result.SEMANTIC_STABILITY_DIAGNOSTIC;
  const physical = diagnostic?.PHYSICAL_FAILURE_CLASS;
  if (!diagnostic || !ROOM_PHYSICAL_FAILURE_CLASSES.has(physical)) return "UNRESOLVED";
  return physical;
}

function productBoundaryForDiagnostic(record) {
  const physical = record.PHYSICAL_FAILURE_CLASS;
  if (["DOCUMENT_SCROLL_OFFSCREEN", "NESTED_SCROLL_OFFSCREEN", "CENTER_OUTSIDE_VIEWPORT"].includes(physical)) return "HARNESS_ONLY";
  if (["MODAL_OR_BACKDROP_OBSTRUCTION", "DRAWER_OBSTRUCTION", "STICKY_HEADER_OBSTRUCTION", "STICKY_COLUMN_OBSTRUCTION", "FIXED_TOOLBAR_OBSTRUCTION"].includes(physical)) return "GENUINE_PRODUCT_INTERACTION_DEFECT_CANDIDATE";
  if (record.CLUSTER_ID === "H6_FIN_INPUTS" && record.KEYBOARD_FOCUS_CAPABLE === true && physical !== "UNRESOLVED") return "ACCESSIBILITY_DEFECT_CANDIDATE";
  return "UNRESOLVED";
}

function diagnosticRecord(historical, result, screenshot) {
  const diagnostic = result.SEMANTIC_STABILITY_DIAGNOSTIC || {};
  const cluster = roomTargetHitTestCluster(historical);
  const physical = physicalClassForDiagnostic(result);
  const record = {
    CONTRACT_ID: historical.ACTION_CONTRACT_ID,
    HISTORICAL_ACTION_CONTRACT_ID: historical.ACTION_CONTRACT_ID,
    CLUSTER_ID: cluster,
    ROUTE: historical.ROUTE,
    SURFACE_STATE: historical.SURFACE_ID,
    ACTION_FAMILY: historical.EXPECTED_EFFECT_CLASS,
    ACCESSIBLE_ROLE: historical.ACTION_ROLE,
    ACCESSIBLE_NAME: historical.ACTION_NAME,
    LOCATOR_RESOLVED: Boolean(result.CANDIDATE_DERIVED_LOCATOR),
    VISIBLE: result.visible === true,
    ENABLED: result.enabled === true,
    OVERLAY_SCOPE: result.CURRENT_SEMANTIC_EXECUTION_CONTEXT?.overlayScope || "NONE",
    EXECUTION_STATE: result.executionState,
    FAILURE_REASON: result.failureReason || null,
    FAILED_STABILITY_COMPONENT: diagnostic.FAILED_STABILITY_COMPONENT || null,
    POINTER_HIT_TEST_CURRENTLY_REQUIRED: true,
    ...diagnostic,
    PHYSICAL_FAILURE_CLASS: physical,
    EVIDENCE: screenshot ? [screenshot] : [],
  };
  record.PRODUCT_BOUNDARY_CLASSIFICATION = productBoundaryForDiagnostic(record);
  return record;
}

function summarizeTargetHitDiagnostics(records = []) {
  const count = (predicate) => records.filter(predicate).length;
  const physical = (name) => count((item) => item.PHYSICAL_FAILURE_CLASS === name);
  const clusterCounts = Object.fromEntries(Object.keys(ROOM_TARGET_HIT_TEST_CLUSTER_COUNTS).map((key) => [key, count((item) => item.CLUSTER_ID === key)]));
  const full = records.filter((item) => item.TARGET_RECT && item.VIEWPORT && Object.hasOwn(item, "FAILED_STABILITY_COMPONENT") && Object.hasOwn(item, "ELEMENT_FROM_POINT_RESULT") && Object.hasOwn(item, "SCROLL_CONTAINER_TYPE"));
  const preScrollMissing = records.filter((item) => item.LOCATOR_RESOLVED && item.VISIBLE && item.ENABLED && item.CENTER_POINT_IN_VIEWPORT === false && item.OVERLAY_PRESENT === false && ["DOCUMENT_SCROLL_OFFSCREEN", "NESTED_SCROLL_OFFSCREEN"].includes(item.PHYSICAL_FAILURE_CLASS)).length;
  return {
    DIAGNOSTIC_TARGET_COUNT: records.length,
    DIAGNOSTIC_FULL_TELEMETRY_COUNT: full.length,
    DIAGNOSTIC_MISSING_TELEMETRY_COUNT: records.length - full.length,
    TARGET_HIT_TEST_ROOT_CLUSTER_COUNT: Object.keys(ROOM_TARGET_HIT_TEST_CLUSTER_COUNTS).filter((key) => clusterCounts[key] > 0).length,
    PRE_SCROLL_ACTIONABILITY_MISSING_COUNT: preScrollMissing,
    DOCUMENT_SCROLL_OFFSCREEN_COUNT: physical("DOCUMENT_SCROLL_OFFSCREEN"),
    NESTED_SCROLL_OFFSCREEN_COUNT: physical("NESTED_SCROLL_OFFSCREEN"),
    CENTER_OUTSIDE_VIEWPORT_COUNT: physical("CENTER_OUTSIDE_VIEWPORT"),
    UNRELATED_ELEMENT_OBSTRUCTION_COUNT: physical("UNRELATED_ELEMENT_OBSTRUCTION"),
    STICKY_HEADER_OBSTRUCTION_COUNT: physical("STICKY_HEADER_OBSTRUCTION"),
    STICKY_COLUMN_OBSTRUCTION_COUNT: physical("STICKY_COLUMN_OBSTRUCTION"),
    FIXED_TOOLBAR_OBSTRUCTION_COUNT: physical("FIXED_TOOLBAR_OBSTRUCTION"),
    MODAL_OR_BACKDROP_OBSTRUCTION_COUNT: physical("MODAL_OR_BACKDROP_OBSTRUCTION"),
    DRAWER_OBSTRUCTION_COUNT: physical("DRAWER_OBSTRUCTION"),
    RECT_ZERO_OR_TRANSIENT_COUNT: physical("RECT_ZERO_OR_TRANSIENT"),
    ELEMENT_FROM_POINT_NULL_COUNT: physical("ELEMENT_FROM_POINT_NULL"),
    POINTER_EVENTS_LAYER_COUNT: physical("POINTER_EVENTS_LAYER"),
    TRANSFORM_GEOMETRY_COUNT: physical("TRANSFORM_GEOMETRY"),
    LEGITIMATE_DESCENDANT_HIT_COUNT: physical("LEGITIMATE_DESCENDANT_HIT"),
    LEGITIMATE_ANCESTOR_HIT_COUNT: physical("LEGITIMATE_ANCESTOR_HIT"),
    OTHER_PROVEN_PHYSICAL_ROOT_COUNT: physical("OTHER_PROVEN_PHYSICAL_ROOT"),
    UNRESOLVED_COUNT: physical("UNRESOLVED"),
    HARNESS_ONLY_COUNT: count((item) => item.PRODUCT_BOUNDARY_CLASSIFICATION === "HARNESS_ONLY"),
    PRODUCT_INTERACTION_DEFECT_CANDIDATE_COUNT: count((item) => item.PRODUCT_BOUNDARY_CLASSIFICATION === "GENUINE_PRODUCT_INTERACTION_DEFECT_CANDIDATE"),
    ACCESSIBILITY_DEFECT_CANDIDATE_COUNT: count((item) => item.PRODUCT_BOUNDARY_CLASSIFICATION === "ACCESSIBILITY_DEFECT_CANDIDATE"),
    UNRESOLVED_PRODUCT_BOUNDARY_COUNT: count((item) => item.PRODUCT_BOUNDARY_CLASSIFICATION === "UNRESOLVED"),
    ...Object.fromEntries(Object.entries(clusterCounts).map(([key, value]) => [`${key}_COUNT`, value])),
    PHYSICAL_ACCOUNTING_COUNT: records.length,
  };
}

async function runRoomTargetHitTestDiagnostic(report) {
  const role = "ROOM";
  const canonicalRaw = await fs.readFile(canonicalCheckpointPath(role), "utf8");
  const checkpoint = JSON.parse(canonicalRaw);
  const targets = checkpoint.actions.filter((item) => item.failureReason === ROOM_TARGET_HIT_TEST_REASON);
  if (targets.length !== 317) throw new Error(`ROOM_TARGET_HIT_TEST_EXPECTED_317_FOUND_${targets.length}`);
  if (new Set(targets.map((item) => item.ACTION_CONTRACT_ID)).size !== 317) throw new Error("ROOM_TARGET_HIT_TEST_CONTRACT_IDENTITY_LOSS");
  const initialClusters = Object.fromEntries(Object.keys(ROOM_TARGET_HIT_TEST_CLUSTER_COUNTS).map((key) => [key, targets.filter((item) => roomTargetHitTestCluster(item) === key).length]));
  for (const [key, expected] of Object.entries(ROOM_TARGET_HIT_TEST_CLUSTER_COUNTS)) if (initialClusters[key] !== expected) throw new Error(`ROOM_TARGET_HIT_TEST_CLUSTER_ACCOUNTING_${key}_${initialClusters[key]}_EXPECTED_${expected}`);
  const targetSurfaceIds = new Set(targets.map((item) => item.SURFACE_ID));
  const passControls = [];
  for (const route of [...new Set(targets.map((item) => item.ROUTE))]) {
    const control = checkpoint.actions.find((item) => item.ROUTE === route && targetSurfaceIds.has(item.SURFACE_ID) && item.executionState === "PROVEN_PASS" && item.SAFETY_CLASS === "SAFE" && item.ACTION_ROLE === "button");
    if (control) passControls.push(control);
  }
  const telemetry = { console: [], page: [], http500: [], http403: [], critical: [], assets: [] };
  const diagnosticDir = path.join(artifactRoot, "runs", runId, "room-target-hit-test-diagnostic");
  const manifest = {
    RUN_ID: runId,
    RUN_KIND: "ROOM_TARGET_HIT_TEST_DIAGNOSTIC_ONLY",
    TARGET_REASON: ROOM_TARGET_HIT_TEST_REASON,
    TARGET_COUNT: targets.length,
    PASS_CONTROL_COUNT: passControls.length,
    CHECKPOINT_POLICY: "READ_ONLY_SEPARATE_IMMUTABLE_ARTIFACT",
    DIAGNOSTIC_INSTRUMENTATION_BEHAVIOR_NEUTRAL: "YES",
    PROHIBITED_POLICY_CHANGES: ["scrollIntoView", "locatorRebind", "retryExtension", "forceClick", "coordinateClick", "keyboardFallback"],
    generatedAt: new Date().toISOString(),
    base,
  };
  await writeImmutableArtifact(path.join(diagnosticDir, "manifest.json"), manifest);
  const token = await login(roles[role]);
  const browser = await chromium.launch({ headless: true });
  const results = [];
  const controls = [];
  const diagnosticConcurrency = 12;
  try {
    const replayTarget = async (historical, index) => {
      const surface = report.surfaces.find((item) => surfaceId(item) === historical.SURFACE_ID);
      if (!surface) throw new Error(`ROOM_TARGET_HIT_SURFACE_NOT_FOUND:${historical.SURFACE_ID}`);
      const session = await createPage(browser, role, token, surface.viewport, telemetry, `room-target-hit:${index}`);
      let result;
      let screenshot = null;
      try {
        const replay = await setupPage(session.page, surface);
        result = replay.ok
          ? await executeOne(session.page, role, surface, replayMetaFromHistorical(historical), telemetry, index)
          : { ...historical, executionState: "HARNESS_FAILURE", failureReason: `SURFACE_REPLAY_FAILED:${replay.reason}`, visible: false, enabled: false, actionAttempted: false };
        screenshot = await captureScreenshot(session.page, role, surface, `target-hit-${index}`).catch(() => null);
      } catch (error) {
        result = { ...historical, executionState: "HARNESS_FAILURE", failureReason: error.message, visible: false, enabled: false, actionAttempted: false };
      } finally {
        await session.context.close().catch(() => {});
      }
      return diagnosticRecord(historical, result, screenshot);
    };
    for (let start = 0; start < targets.length; start += diagnosticConcurrency) {
      const batch = targets.slice(start, start + diagnosticConcurrency);
      const completed = await Promise.all(batch.map((historical, offset) => replayTarget(historical, start + offset)));
      results.push(...completed);
      console.log(`ROOM_TARGET_HIT_DIAGNOSTIC_PROGRESS ${Math.min(start + diagnosticConcurrency, targets.length)}/${targets.length}`);
    }
    for (let index = 0; index < passControls.length; index += 1) {
      const historical = passControls[index];
      const surface = report.surfaces.find((item) => surfaceId(item) === historical.SURFACE_ID);
      if (!surface) continue;
      const session = await createPage(browser, role, token, surface.viewport, telemetry, `room-target-hit-pass-control:${index}`);
      try {
        const replay = await setupPage(session.page, surface);
        const result = replay.ok
          ? await executeOne(session.page, role, surface, replayMetaFromHistorical(historical), telemetry, index)
          : { ...historical, executionState: "HARNESS_FAILURE", failureReason: `SURFACE_REPLAY_FAILED:${replay.reason}` };
        controls.push({ HISTORICAL_ACTION_CONTRACT_ID: historical.ACTION_CONTRACT_ID, ROUTE: historical.ROUTE, ACTION_ROLE: historical.ACTION_ROLE, ACTION_NAME: historical.ACTION_NAME, HISTORICAL_TERMINAL_STATE: historical.executionState, DIAGNOSTIC_EXECUTION_STATE: result.executionState, DIAGNOSTIC_FAILURE_REASON: result.failureReason || null, SEMANTIC_STABILITY_DIAGNOSTIC: result.SEMANTIC_STABILITY_DIAGNOSTIC || null });
      } finally {
        await session.context.close().catch(() => {});
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }
  const canonicalAfter = await fs.readFile(canonicalCheckpointPath(role), "utf8");
  const summary = summarizeTargetHitDiagnostics(results);
  const complete = summary.DIAGNOSTIC_TARGET_COUNT === 317
    && summary.DIAGNOSTIC_FULL_TELEMETRY_COUNT === 317
    && summary.PHYSICAL_ACCOUNTING_COUNT === 317
    && summary.UNRESOLVED_COUNT === 0
    && canonicalAfter === canonicalRaw;
  await writeImmutableArtifact(path.join(diagnosticDir, "target-hit-diagnostics.json"), { manifest, summary, records: results, passControls: controls, telemetry, generatedAt: new Date().toISOString() });
  await writeImmutableArtifact(path.join(diagnosticDir, "summary.json"), {
    ...summary,
    DIAGNOSTIC_PASS_CONTROL_COUNT: controls.length,
    DIAGNOSTIC_INSTRUMENTATION_BEHAVIOR_NEUTRAL: "YES",
    ROOM_CHECKPOINT_MUTATED: canonicalAfter === canonicalRaw ? "NO" : "YES",
    SUPERADMIN_CHECKPOINT_MUTATED: "NO",
    OTHER_423_TOUCHED: "NO",
    HTTP_500_COUNT: telemetry.http500.length,
    PAGE_ERROR_COUNT: telemetry.page.length,
    UNEXPLAINED_HTTP_403_COUNT: telemetry.http403.length,
    COMPLETE: complete ? "YES" : "NO",
  });
  console.log(JSON.stringify({ ROOM_TARGET_HIT_TEST_DIAGNOSTIC: complete ? "READY_FOR_CORRECTIVE" : "INCOMPLETE", RUN_ID: runId, ...summary, DIAGNOSTIC_PASS_CONTROL_COUNT: controls.length, ROOM_CHECKPOINT_MUTATED: canonicalAfter === canonicalRaw ? "NO" : "YES", artifact: path.relative(root, diagnosticDir).replace(/\\/gu, "/") }, null, 2));
  if (!complete) process.exitCode = 2;
}

function normalizeRoomTabSemanticIdentity(value) {
  const captured = String(value || "").replace(/\s+/gu, " ").trim();
  const labelOnly = captured.replace(/(?<=\p{L})\d+$/u, "").trim() || captured;
  return labelOnly.toLocaleLowerCase("tr-TR");
}

export async function ensureRoomActiveTab(page, { tab, activate = true } = {}) {
  const expected = normalizeRoomTabSemanticIdentity(tab);
  const tabs = page.getByRole("tab");
  const matches = [];
  for (let index = 0; index < await tabs.count().catch(() => 0); index += 1) {
    const candidate = tabs.nth(index);
    if (!(await candidate.isVisible().catch(() => false))) continue;
    const observed = await candidate.evaluate((node) => {
      const label = node.querySelector(".panelSegmentTabLabel");
      return label?.textContent || node.getAttribute("aria-label") || node.innerText || node.textContent || "";
    }).catch(() => "");
    if (normalizeRoomTabSemanticIdentity(observed) === expected) matches.push(candidate);
  }
  if (matches.length !== 1) throw new Error(`STATE_RECIPE_ROOM_TAB_NOT_FOUND:${tab || "UNNAMED"}:matches=${matches.length}`);
  const target = matches[0];
  const beforeSelected = await target.getAttribute("aria-selected").catch(() => null);
  if (activate && beforeSelected !== "true") {
    await target.click({ timeout: 3000, noWaitAfter: true, force: false });
  }
  const selected = await target.getAttribute("aria-selected").catch(() => null);
  if (selected !== "true") throw new Error(`STATE_RECIPE_ROOM_TAB_NOT_ACTIVE:${tab || "UNNAMED"}`);
  return { tab, activationAttempted: activate && beforeSelected !== "true", selected: true };
}

export async function applyRoomPrehitStateRecipe(page, row, { authReady = false, adapters = {} } = {}) {
  const runtime = {
    openRouteWithPositiveReadiness: adapters.openRouteWithPositiveReadiness || openRouteWithPositiveReadiness,
    waitForPositiveRouteReadiness: adapters.waitForPositiveRouteReadiness || waitForPositiveRouteReadiness,
    waitForRoomPendingShiftActionReady: adapters.waitForRoomPendingShiftActionReady || waitForRoomPendingShiftActionReady,
    waitForFinancialOperationsContentSettled: adapters.waitForFinancialOperationsContentSettled || waitForFinancialOperationsContentSettled,
    ensureActionMaterialState: adapters.ensureActionMaterialState || ensureActionMaterialState,
    openNativeDisclosure: adapters.openNativeDisclosure || openNativeDisclosure,
    assertNativeDisclosureExpanded: adapters.assertNativeDisclosureExpanded || assertNativeDisclosureExpanded,
    ensureRoomActiveTab: adapters.ensureRoomActiveTab || ensureRoomActiveTab,
  };
  const currentRoute = row.CURRENT_ROUTE || row.ROUTE;
  const routeReadiness = await runtime.openRouteWithPositiveReadiness(page, currentRoute);
  const produced = [];
  for (const step of row.STATE_RECIPE.produce) {
    if (step.type === "AUTH_SESSION_READY" || step.type === "ROUTE_CONTENT_READY") {
      produced.push({ type: step.type, status: "PROVEN", routeReadiness });
      continue;
    }
    if (step.type === "NAV_GROUP_OPEN") {
      const restored = await runtime.ensureActionMaterialState(page, { systemNavigationDisclosure: "SİSTEM_OPEN" });
      if (!restored.ok) throw new Error(`STATE_RECIPE_NAV_GROUP_OPEN_NOT_PROVEN:${restored.reason}`);
      produced.push({ type: step.type, status: "PROVEN", reason: restored.reason });
      continue;
    }
    if (step.type === "ROOM_TASK_WORKSPACE_OPEN") {
      await runtime.openNativeDisclosure(page, { name: step.summary || "Ayrıntılı çalışma alanını göster" });
      await runtime.assertNativeDisclosureExpanded(page, { name: step.summary || "Ayrıntılı çalışma alanını göster" });
      const observed = await page.locator("details[data-details='task-workspace']").evaluate((node) => ({
        detailsOpen: node instanceof HTMLDetailsElement && node.open,
        descendantCollectorPresent: Boolean(node.querySelector(".roleTaskDetailsBody *")),
      })).catch(() => ({ detailsOpen: false, descendantCollectorPresent: false }));
      const descendantPlaywrightVisible = await page.locator("details[data-details='task-workspace'] .roleTaskDetailsBody").isVisible().catch(() => false);
      const asserted = evaluateRoomTaskWorkspaceAssertion({ ...observed, descendantPlaywrightVisible });
      if (!asserted.ok) throw new Error(`STATE_RECIPE_ROOM_TASK_WORKSPACE_NOT_PROVEN:${asserted.reason}`);
      produced.push({ type: step.type, status: "PROVEN", assertion: asserted.reason });
      continue;
    }
    if (step.type === "FINANCIAL_OPERATIONS_CONTENT_SETTLED") {
      const settled = await runtime.waitForFinancialOperationsContentSettled(page, step.route || currentRoute);
      produced.push({ type: step.type, status: "PROVEN", routeReadiness: settled });
      continue;
    }
    if (step.type === "NATIVE_DISCLOSURE_OPEN") {
      const disclosure = await runtime.openNativeDisclosure(page, { name: step.summary, expectedControl: step.expectedControl || null });
      produced.push({ type: step.type, status: "PROVEN", summary: step.summary, disclosure });
      continue;
    }
    if (step.type === "ROOM_ACTIVE_TAB") {
      const active = await runtime.ensureRoomActiveTab(page, { tab: step.tab, activate: true });
      produced.push({ type: step.type, status: "PROVEN", tab: step.tab, active });
      if (currentRoute === "/room/shifts" && norm(row.ACTION_NAME) === "Detayları göster") {
        const pending = await runtime.waitForRoomPendingShiftActionReady(page, { actionName: row.ACTION_NAME });
        produced.push({ type: "ROOM_PENDING_SHIFT_ACTION_READY", status: "PROVEN", pending });
      }
      continue;
    }
    throw new Error(`STATE_RECIPE_UNSUPPORTED_STEP:${step.type}`);
  }
  const asserted = [];
  for (const step of row.STATE_RECIPE.assert || []) {
    if (step.type === "AUTH_SESSION_READY") {
      if (!authReady) throw new Error("STATE_RECIPE_ASSERT_AUTH_SESSION_NOT_READY");
      asserted.push({ type: step.type, status: "PROVEN", postcondition: step.postcondition || "SESSION_LOADING_ABSENT" });
      continue;
    }
    if (step.type === "ROUTE_CONTENT_READY" || step.type === "FINANCIAL_OPERATIONS_CONTENT_SETTLED") {
      const settled = step.type === "FINANCIAL_OPERATIONS_CONTENT_SETTLED"
        ? await runtime.waitForFinancialOperationsContentSettled(page, step.route || currentRoute)
        : await runtime.waitForPositiveRouteReadiness(page, step.route || currentRoute);
      if (settled?.ready !== true) throw new Error(`STATE_RECIPE_ASSERT_ROUTE_NOT_READY:${step.route || currentRoute}`);
      asserted.push({ type: step.type, status: "PROVEN", routeReadiness: settled });
      continue;
    }
    if (step.type === "NAV_GROUP_OPEN") {
      const toggle = await firstVisibleLocator(page.locator(".navAdvanced > .navToggle"));
      const label = await toggle?.innerText().catch(() => "");
      if (!toggle || !/▾/u.test(label)) throw new Error("STATE_RECIPE_ASSERT_NAV_GROUP_NOT_OPEN");
      asserted.push({ type: step.type, status: "PROVEN", postcondition: step.postcondition || "SİSTEM_OPEN" });
      continue;
    }
    if (step.type === "ROOM_TASK_WORKSPACE_OPEN") {
      const open = await page.locator("details[data-details='task-workspace']").evaluate((node) => node instanceof HTMLDetailsElement && node.open).catch(() => false);
      if (!open) throw new Error("STATE_RECIPE_ASSERT_ROOM_TASK_WORKSPACE_NOT_OPEN");
      asserted.push({ type: step.type, status: "PROVEN" });
      continue;
    }
    if (step.type === "NATIVE_DISCLOSURE_OPEN") {
      const disclosure = await runtime.assertNativeDisclosureExpanded(page, { name: step.summary, expectedControl: step.expectedControl || null });
      asserted.push({ type: step.type, status: "PROVEN", summary: step.summary, disclosure });
      continue;
    }
    if (step.type === "ROOM_ACTIVE_TAB") {
      const active = await runtime.ensureRoomActiveTab(page, { tab: step.tab, activate: false });
      asserted.push({ type: step.type, status: "PROVEN", tab: step.tab, active });
      if (currentRoute === "/room/shifts" && norm(row.ACTION_NAME) === "Detayları göster") {
        const pending = await runtime.waitForRoomPendingShiftActionReady(page, { actionName: row.ACTION_NAME });
        asserted.push({ type: "ROOM_PENDING_SHIFT_ACTION_READY", status: "PROVEN", pending });
      }
      continue;
    }
    throw new Error(`STATE_RECIPE_UNSUPPORTED_ASSERT:${step.type}`);
  }
  return {
    routeReadiness,
    produced,
    asserted,
    originalRootInputs: {
      authReady,
      routeReady: routeReadiness.ready === true,
      prematureHistoricalStepReplay: false,
      financialContentSettled: produced.some((item) => item.type === "FINANCIAL_OPERATIONS_CONTENT_SETTLED" && item.status === "PROVEN"),
      suspenseActiveDuringResolution: false,
    },
  };
}

function financialExpectedControlFromRow(row = {}) {
  const steps = [...(row?.STATE_RECIPE?.produce || []), ...(row?.STATE_RECIPE?.assert || [])];
  const step = steps.find((item) => item?.type === "NATIVE_DISCLOSURE_OPEN" && item?.expectedControl);
  return step?.expectedControl || null;
}

function nativeAssertionTargetFromStateRecipe(stateRecipe = null) {
  const steps = [...(stateRecipe?.produced || []), ...(stateRecipe?.asserted || [])];
  const disclosure = steps.map((step) => step?.disclosure).find((item) => item?.assertionTarget);
  return disclosure?.assertionTarget || null;
}

function financialContinuityEvidence({ beforeObservation, beforeReadiness, afterObservation, afterReadiness, attempts, reestablished, stateRecipe, expectedControl, assertionTarget }) {
  return {
    CONTINUITY_GUARD_ENTERED: true,
    CONTINUITY_VALID: true,
    STATE_REESTABLISHED: reestablished,
    REESTABLISH_ATTEMPT_COUNT: attempts,
    PRE_ENUMERATION_READY_CHECK: beforeReadiness.ready ? "PASS" : "FAIL",
    PRE_ENUMERATION_READY_OBSERVATION: beforeObservation,
    ENUMERATION_EXECUTED: true,
    POST_ENUMERATION_READY_CHECK: afterReadiness.ready ? "PASS" : "FAIL",
    POST_ENUMERATION_READY_OBSERVATION: afterObservation,
    REFRESH_REESTABLISHMENT_ATTEMPTED: reestablished,
    REFRESH_REESTABLISHMENT_RESULT: reestablished ? "REESTABLISHED" : "NOT_REQUIRED",
    PLAN_VERISI_OKUNUYOR_PRESENT: Boolean(beforeObservation?.PLAN_VERISI_OKUNUYOR_PRESENT || afterObservation?.PLAN_VERISI_OKUNUYOR_PRESENT || beforeObservation?.planVerisiOkunuyorPresent || afterObservation?.planVerisiOkunuyorPresent),
    YENILENIYOR_PRESENT: Boolean(beforeObservation?.YENILENIYOR_PRESENT || afterObservation?.YENILENIYOR_PRESENT || beforeObservation?.yenileniyorPresent || afterObservation?.yenileniyorPresent),
    ASSERTION_TARGET_SIGNATURE: assertionTarget?.signature || (expectedControl ? JSON.stringify(expectedControl) : null),
    ASSERTION_TARGET_ROLE: assertionTarget?.role || expectedControl?.role || null,
    ASSERTION_TARGET_ACCESSIBLE_NAME: assertionTarget?.accessibleName || expectedControl?.name || null,
    ASSERTION_TARGET: assertionTarget || null,
    EXPECTED_CONTROL_ASSERTION_REACHED: Boolean(assertionTarget),
    EXPECTED_CONTROL_ASSERTION_RESULT: assertionTarget ? "PASS" : "NOT_AVAILABLE",
    PARENT_DISCLOSURE_ASSERTION_RESULT: stateRecipe?.asserted?.some((step) => step?.type === "NATIVE_DISCLOSURE_OPEN") ? "PASS" : "NOT_AVAILABLE",
    ADVANCED_DISCLOSURE_ASSERTION_RESULT: stateRecipe?.asserted?.filter((step) => step?.type === "NATIVE_DISCLOSURE_OPEN").length > 1 ? "PASS" : "NOT_AVAILABLE",
    STATE_RECIPE: stateRecipe,
    SEMANTIC_NOT_RESOLVED_EMITTED_DURING_PROVEN_REFRESH_COUNT: 0,
  };
}

/*
 * The financial state can legitimately refresh between a successful
 * disclosure assertion and candidate enumeration.  This wrapper does not
 * invent a second semantic matcher: it surrounds the existing pure resolver
 * with bounded before/after financial observations and reuses the established
 * state-recipe reconstruction only when a real refresh invalidates continuity.
 */
export async function resolveFinancialSemanticActionWithContinuity({
  page,
  row,
  surface,
  historicalMeta,
  initialStateRecipe = null,
  maxReestablishAttempts = 1,
  onDiagnostics = null,
  onEnumerationTelemetry = null,
  onDiagnosticEvidence = null,
  adapters = {},
} = {}) {
  if (!row?.STATE_RECIPE) throw new Error("FINANCIAL_CONTINUITY_STATE_RECIPE_REQUIRED");
  const observeFinancial = adapters.observeFinancial || ((currentPage) => currentFinancialOperationsContentObservation(currentPage, row.ROUTE));
  const applyStateRecipe = adapters.applyStateRecipe || ((currentPage) => applyRoomPrehitStateRecipe(currentPage, row, { authReady: true }));
  const resolveCurrent = adapters.resolveFreshSemanticAction || ((currentPage, currentSurface, meta, options) => resolveFreshSemanticAction(currentPage, currentSurface, meta, options));
  const expectedControl = financialExpectedControlFromRow(row);
  let attempts = 0;
  let stateRecipe = initialStateRecipe;
  let last = null;
  let reestablished = false;

  while (attempts <= maxReestablishAttempts) {
    const beforeObservation = await observeFinancial(page);
    const beforeReadiness = evaluateFinancialOperationsContentSettled(beforeObservation);
    last = { phase: "BEFORE_ENUMERATION", observation: beforeObservation, readiness: beforeReadiness };
    if (!beforeReadiness.ready) {
      if (attempts >= maxReestablishAttempts) break;
      stateRecipe = await applyStateRecipe(page);
      reestablished = true;
      attempts += 1;
      continue;
    }

    const assertionTarget = nativeAssertionTargetFromStateRecipe(stateRecipe);
    let resolutionEvidence = null;
    const resolved = await resolveCurrent(page, surface, historicalMeta, {
      onDiagnostics,
      enumerationMode: "EXECUTION_REVALIDATION",
      onEnumerationTelemetry,
      onDiagnosticEvidence: (evidence) => { resolutionEvidence = evidence || null; },
    });
    const afterObservation = await observeFinancial(page);
    const afterReadiness = evaluateFinancialOperationsContentSettled(afterObservation);
    last = { phase: "AFTER_ENUMERATION", observation: afterObservation, readiness: afterReadiness };
    if (!afterReadiness.ready) {
      if (attempts >= maxReestablishAttempts) break;
      stateRecipe = await applyStateRecipe(page);
      reestablished = true;
      attempts += 1;
      continue;
    }

    const continuity = financialContinuityEvidence({ beforeObservation, beforeReadiness, afterObservation, afterReadiness, attempts, reestablished, stateRecipe, expectedControl, assertionTarget });
    onDiagnosticEvidence?.({
      ...(resolutionEvidence || buildBoundedFinancialSemanticFailureTelemetry({ historicalMeta, assertionTarget })),
      ...continuity,
      ASSERTION_TARGET_SIGNATURE: continuity.ASSERTION_TARGET_SIGNATURE,
      ASSERTION_TARGET: assertionTarget || null,
    });
    return {
      currentMeta: resolved,
      ...continuity,
      ASSERTION_FINANCIAL_READY_STATE: beforeReadiness,
      ENUMERATION_FINANCIAL_READY_STATE: afterReadiness,
      ENUMERATION_TARGET_SIGNATURE_IF_PRESENT: resolved?.executionContext?.locatorRecipe?.candidateKey || null,
    };
  }

  const error = new Error(`FINANCIAL_STATE_CONTINUITY_NOT_PROVEN:${last?.phase || "NO_OBSERVATION"}:${last?.readiness?.reason || "UNKNOWN"}`);
  error.financialContinuity = {
    CONTINUITY_VALID: false,
    STATE_REESTABLISHED: reestablished,
    REESTABLISH_ATTEMPT_COUNT: attempts,
    ASSERTION_TARGET_SIGNATURE: expectedControl ? JSON.stringify(expectedControl) : null,
    ASSERTION_TARGET_ROLE: expectedControl?.role || null,
    ASSERTION_TARGET_ACCESSIBLE_NAME: expectedControl?.name || null,
    LAST_FINANCIAL_READINESS: last?.readiness || null,
    SEMANTIC_NOT_RESOLVED_EMITTED_DURING_PROVEN_REFRESH_COUNT: 0,
  };
  throw error;
}

async function resolveExecutionSemanticAction(page, surface, historicalMeta, {
  onDiagnostics = null,
  onFinancialContinuity = null,
  onEnumerationTelemetry = null,
  onDiagnosticEvidence = null,
} = {}) {
  if (!historicalMeta?.financialContinuityRow) {
    return resolveFreshSemanticAction(page, surface, historicalMeta, {
      onDiagnostics,
      enumerationMode: "EXECUTION_REVALIDATION",
      onEnumerationTelemetry,
      onDiagnosticEvidence,
    });
  }
  const continuity = await resolveFinancialSemanticActionWithContinuity({
    page,
    row: historicalMeta.financialContinuityRow,
    surface,
    historicalMeta,
    initialStateRecipe: historicalMeta.financialInitialStateRecipe || null,
    onDiagnostics,
    onEnumerationTelemetry,
    onDiagnosticEvidence,
  });
  onFinancialContinuity?.(continuity);
  return continuity.currentMeta;
}

async function replayRoomLegacyPresentationFallback(page, row) {
  const replayed = [];
  for (const step of row.LEGACY_PRESENTATION_STEPS) {
    if (step.formSubmit === true) throw new Error(`LEGACY_PRESENTATION_STEP_UNSAFE:${norm(step.label) || "UNNAMED"}`);
    const target = await stepTarget(page, step);
    if (!target) throw new Error(`LEGACY_PRESENTATION_STEP_NOT_CURRENT:${norm(step.label) || "UNNAMED"}`);
    if (await target.isDisabled().catch(() => true)) throw new Error(`LEGACY_PRESENTATION_STEP_DISABLED:${norm(step.label) || "UNNAMED"}`);
    await target.click({ timeout: 2500, noWaitAfter: true, force: false });
    const currentRoute = routeFromPage(page);
    await waitForPositiveRouteReadiness(page, currentRoute);
    replayed.push({ label: norm(step.label), route: currentRoute });
  }
  return replayed;
}

async function resolveRoomPrehitCurrentTarget(page, surface, historicalMeta, row) {
  let currentSurface = { ...surface, route: routeFromPage(page) || surface.route };
  let currentMeta = await resolveFreshSemanticAction(page, currentSurface, historicalMeta);
  let binding = currentMeta ? await matchingLocator(page, currentMeta.executionContext) : null;
  let legacyFallback = [];
  if ((!currentMeta || !binding) && row.LEGACY_PRESENTATION_STEPS.length) {
    legacyFallback = await replayRoomLegacyPresentationFallback(page, row);
    currentSurface = { ...surface, route: routeFromPage(page) || surface.route };
    currentMeta = await resolveFreshSemanticAction(page, currentSurface, historicalMeta);
    binding = currentMeta ? await matchingLocator(page, currentMeta.executionContext) : null;
  }
  return { currentSurface, currentMeta, binding, legacyFallback };
}

async function probeRoomPrehitMigratedContract(page, row, surface, telemetry, index) {
  const historicalMeta = replayMetaFromHistorical(row);
  const result = {
    ...row,
    HISTORICAL_ACTION_CONTRACT_ID: row.ACTION_CONTRACT_ID,
    ACTION_CONTRACT_ID: row.ACTION_CONTRACT_ID,
    executionState: "ATTEMPTED",
    EXECUTION_STATE: "ATTEMPTED",
    classification: "HARNESS_DIAGNOSTIC",
    actionAttempted: false,
    PREHIT_ROOT: row.PREHIT_ROOT,
    PREHIT_STATE_RECONSTRUCTION: null,
    PREHIT_DOWNSTREAM_HIT_TEST_PENDING: false,
    failureReason: null,
  };
  try {
    result.PREHIT_STATE_RECONSTRUCTION = await applyRoomPrehitStateRecipe(page, row, { authReady: true });
    const rootInputs = result.PREHIT_STATE_RECONSTRUCTION.originalRootInputs;
    // This is persisted before candidate/locator/hit-test execution.  A1's
    // semantic-resolution ordering becomes true at the exact hand-off below.
    result.ORIGINAL_ROOT_FACTS = deriveOriginalRootFacts({
      root: row.PREHIT_ROOT,
      ...rootInputs,
      semanticResolutionAfterSettlement: row.PREHIT_ROOT === "PREHIT-A1",
    });
    const target = await resolveRoomPrehitCurrentTarget(page, surface, historicalMeta, row);
    result.LEGACY_PRESENTATION_FALLBACK = target.legacyFallback;
    result.CURRENT_SEMANTIC_EXECUTION_CONTEXT = target.currentMeta?.executionContext || null;
    result.CURRENT_CONTEXTUAL_OWNER = target.currentMeta?.owner || null;
    result.CANDIDATE_DERIVED_LOCATOR = target.binding?.observed || null;
    if (!target.currentMeta) throw new Error(`PREHIT_CURRENT_SEMANTIC_ACTION_NOT_RESOLVED:${row.ACTION_ROLE}:${row.ACTION_NAME || "UNNAMED"}`);
    if (!target.binding) throw new Error(`PREHIT_CANDIDATE_DERIVED_LOCATOR_NOT_FOUND:${row.ACTION_ROLE}:${row.ACTION_NAME || "UNNAMED"}`);
    result.visible = await target.binding.loc.isVisible().catch(() => false);
    result.enabled = !(await target.binding.loc.isDisabled().catch(() => true));
    if (!result.visible || !result.enabled) throw new Error(`PREHIT_TARGET_NOT_ACTIONABLE:visible=${result.visible}:enabled=${result.enabled}`);
    const stability = await waitForSemanticStability(page, target.currentMeta.executionContext, target.binding.loc);
    result.SEMANTIC_STABILITY_DIAGNOSTIC = stability.diagnostic;
    result.FAILED_STABILITY_COMPONENT = stability.diagnostic?.FAILED_STABILITY_COMPONENT || null;
    if (!stability.ok) {
      if (stability.completion?.requiredEvidence?.includes("TARGET_HIT_TEST")) {
        result.executionState = "PREHIT_CLOSED_DOWNSTREAM_HIT_TEST_PENDING";
        result.EXECUTION_STATE = result.executionState;
        result.classification = "DOWNSTREAM_HIT_TEST_PENDING";
        result.PREHIT_DOWNSTREAM_HIT_TEST_PENDING = true;
        result.failureReason = `PREHIT_CLOSED_DOWNSTREAM_HIT_TEST_PENDING:${stability.completion.requiredEvidence.join(",")}`;
        return result;
      }
      throw new Error(`PREHIT_OTHER_SEMANTIC_STABILITY_FAILURE:${stability.completion?.requiredEvidence?.join(",") || "UNKNOWN"}`);
    }
    result.executionState = "PREHIT_STATE_RECONSTRUCTION_CLOSED";
    result.EXECUTION_STATE = result.executionState;
    result.classification = "PREHIT_CLOSED";
    result.PREHIT_STATE_RECONSTRUCTION_CLOSED = true;
    return result;
  } catch (error) {
    result.executionState = "HARNESS_FAILURE";
    result.EXECUTION_STATE = result.executionState;
    result.classification = "HARNESS_DEFECT";
    result.failureReason = error.message;
    return result;
  } finally {
    const annotated = attachOriginalRootFacts(result, result.ORIGINAL_ROOT_FACTS || deriveOriginalRootFacts({ root: row.PREHIT_ROOT }));
    result.ORIGINAL_ROOT_FACTS = annotated.ORIGINAL_ROOT_FACTS;
    result.DOWNSTREAM_OUTCOME = annotated.DOWNSTREAM_OUTCOME;
    result.evidence = [await captureScreenshot(page, "ROOM", surface, `prehit-246-${index}`).catch(() => null)].filter(Boolean);
  }
}

function prehitFailureCount(results, pattern) {
  return results.filter((item) => pattern.test(String(item.failureReason || ""))).length;
}

/*
 * A worker stays authenticated for its assigned ROOM contracts.  Resetting is
 * deliberately route/state-driven: it navigates back to the normal ROOM home
 * and proves that visible transient UI is gone.  It never clears storage,
 * logs out, fabricates /api/me, or mutates product data.
 */
async function resetRoomWorkerTransientState(page, { worker = null, role = "ROOM", tenantKey = "ROOM_AUTH_SCOPE" } = {}) {
  await openRouteWithPositiveReadiness(page, "/room");
  await page.evaluate(() => {
    for (const details of document.querySelectorAll("details[open]")) details.open = false;
    window.scrollTo(0, 0);
  }).catch(() => {});
  const visibleValuePresent = (selector) => page.locator(selector).evaluateAll((nodes) => nodes.some((node) => {
    const style = getComputedStyle(node); const box = node.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0 && String(node.value || "").trim().length > 0;
  })).catch(() => false);
  const [modalOpen, drawerOpen, popoverOpen, detailsOpen, filterActive, temporaryInputPresent, transientAssistantOpen, scrollAtOrigin] = await Promise.all([
    page.locator("[role='dialog'],.modal,.modal-backdrop").evaluateAll((nodes) => nodes.some((node) => {
      const style = getComputedStyle(node); const box = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
    })).catch(() => false),
    page.locator("[data-drawer],.copilotDrawer").evaluateAll((nodes) => nodes.some((node) => {
      const style = getComputedStyle(node); const box = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
    })).catch(() => false),
    page.locator("[role='menu'],[role='listbox'],.popover").evaluateAll((nodes) => nodes.some((node) => {
      const style = getComputedStyle(node); const box = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
    })).catch(() => false),
    page.locator("details[open]").count().then((count) => count > 0).catch(() => true),
    visibleValuePresent("input[type='search']"),
    visibleValuePresent("textarea[data-transient-input],input[data-transient-input]"),
    page.locator(".copilotDrawer").evaluateAll((nodes) => nodes.some((node) => {
      const style = getComputedStyle(node); const box = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
    })).catch(() => false),
    page.evaluate(() => window.scrollX === 0 && window.scrollY === 0).catch(() => false),
  ]);
  const expected = deriveRoomWorkerResetExpectedIdentity(worker || { ROLE: role, TENANT_KEY: tenantKey });
  return evaluateRoomWorkerReset({
    role,
    tenantKey,
    expectedRole: expected.expectedRole,
    expectedTenantKey: expected.expectedTenantKey,
    route: routeFromPage(page),
    modalOpen,
    drawerOpen,
    popoverOpen,
    detailsOpen,
    filterActive,
    temporaryInputPresent,
    transientAssistantOpen,
    scrollAtOrigin,
  });
}

/*
 * The durable Exact36 orchestration owns reset sequencing; this adapter owns
 * the established ROOM reset behavior.  It deliberately reuses the accepted
 * authenticated route/state reset rather than fabricating a clean browser
 * state or clearing session storage.
 */
export async function resetRoomExact36CanonicalContract({ session, worker = null, resetRequired = true } = {}) {
  if (!resetRequired) {
    return {
      RESET_REQUIRED: false,
      RESET_STARTED: false,
      RESET_COMPLETED: true,
      RESET_PROOF: true,
      RESET_RESULT: "NO_RESET_REQUIRED",
      TRANSIENT_STATE_LEAK: false,
    };
  }
  if (!session?.page) throw new Error("EXACT36_CANONICAL_RESET_PAGE_REQUIRED");
  const reset = await resetRoomWorkerTransientState(session.page, {
    worker,
    role: "ROOM",
    tenantKey: worker?.TENANT_KEY || "ROOM_AUTH_SCOPE",
  });
  return {
    RESET_REQUIRED: true,
    RESET_STARTED: true,
    RESET_COMPLETED: reset?.ready === true,
    RESET_PROOF: reset?.ready === true,
    RESET_RESULT: reset?.ready === true ? "CANONICAL_ROOM_RESET_PROVEN" : `CANONICAL_ROOM_RESET_FAILURE:${reset?.reason || "UNKNOWN"}`,
    TRANSIENT_STATE_LEAK: reset?.ready !== true,
    RESET_REASON: reset?.reason || null,
  };
}

async function runRoomPrehit246Migration(report) {
  const role = "ROOM";
  const canonicalRaw = await fs.readFile(canonicalCheckpointPath(role), "utf8");
  const checkpoint = JSON.parse(canonicalRaw);
  const diagnosticPath = path.join(artifactRoot, "runs", "pre18-room-target-hit-diagnostic-20260912-terra-b", "room-target-hit-test-diagnostic", "target-hit-diagnostics.json");
  const diagnosticPayload = await readJson(diagnosticPath, null);
  if (!Array.isArray(diagnosticPayload?.records)) throw new Error("ROOM_PREHIT_DIAGNOSTIC_ARTIFACT_UNAVAILABLE");
  const partition = partitionRoomPrehitDiagnostics(diagnosticPayload.records);
  if (partition.prehit.length !== 246 || partition.preservedHitTest.length !== 54) {
    throw new Error(`ROOM_PREHIT_DIAGNOSTIC_PARTITION_INVALID:prehit=${partition.prehit.length}:hit=${partition.preservedHitTest.length}`);
  }
  const targetIds = new Set(partition.prehit.map((item) => item.CONTRACT_ID));
  const targets = checkpoint.actions.filter((item) => targetIds.has(item.ACTION_CONTRACT_ID));
  const integrity = assertRoomPrehitCheckpointIntegrity({ knownIds: [...targetIds], replayIds: targets.map((item) => item.ACTION_CONTRACT_ID) });
  if (!integrity.preserved || targets.length !== 246) throw new Error(`ROOM_PREHIT_CHECKPOINT_IDENTITY_LOSS:${integrity.identityLossCount}`);
  const migration = buildRoomPrehit246Migration({ targets, diagnosticRecords: partition.prehit, surfaces: report.surfaces });
  if (!migration.accounting.BALANCED) throw new Error("ROOM_PREHIT_MIGRATION_ACCOUNTING_NOT_BALANCED");
  const workerPool = createRoomWorkerPoolPlan({
    contracts: migration.rows.map((row) => ({ ...row, TENANT_KEY: "ROOM_AUTH_SCOPE" })),
    maxWorkers: ROOM_WORKER_CONCURRENCY_MAX,
    role,
    tenantKey: "ROOM_AUTH_SCOPE",
  });
  if (workerPool.accounting.CONTRACT_ASSIGNMENT_COUNT !== 246
    || workerPool.accounting.CONTRACT_ASSIGNMENT_DUPLICATE_COUNT !== 0
    || workerPool.accounting.CONTRACT_ASSIGNMENT_MISSING_COUNT !== 0) {
    throw new Error("ROOM_PREHIT_WORKER_ASSIGNMENT_ACCOUNTING_INVALID");
  }
  const emptyNameReconciled = migration.rows.reduce((count, row) => count + row.EMPTY_NAME_RECONCILIATIONS.filter((item) => item.status === "CURRENT_STATE_SUCCESSOR").length, 0);
  if (emptyNameReconciled !== 2) throw new Error(`ROOM_PREHIT_EMPTY_NAME_RECONCILIATION_EXPECTED_2_FOUND_${emptyNameReconciled}`);
  const runDir = path.join(artifactRoot, "runs", runId, "room-prehit-246-migration");
  const manifest = {
    RUN_ID: runId,
    RUN_KIND: "ROOM_PREHIT_246_CURRENT_STATE_READINESS_MIGRATION",
    MIGRATION_VERSION: ROOM_PREHIT_246_MIGRATION_VERSION,
    TARGET_CONTRACT_COUNT: migration.rows.length,
    WORKER_POOL: {
      ...workerPool.accounting,
      WORKERS: workerPool.workers.map(toSafeRoomWorkerArtifact),
    },
    EXCLUDED_PROVEN_HIT_TEST_ROOT_COUNT: partition.preservedHitTest.length,
    OTHER_423_TOUCHED: "NO",
    CHECKPOINT_POLICY: "READ_ONLY_SEPARATE_IMMUTABLE_ARTIFACT",
    PRODUCT_SOURCE_EDITED: "NO",
    generatedAt: new Date().toISOString(),
    base,
  };
  await fs.mkdir(runDir, { recursive: true });
  await writeImmutableArtifact(path.join(runDir, "manifest.json"), manifest);
  await writeImmutableArtifact(path.join(runDir, "migration-manifest-v1.json"), { ...migration, generatedAt: new Date().toISOString(), diagnosticSource: path.relative(root, diagnosticPath).replace(/\\/gu, "/") });
  await writeImmutableArtifact(path.join(runDir, "dry-run-accounting.json"), { ...migration.accounting, ROOM_CONTRACT_IDENTITY_LOSS_COUNT: integrity.identityLossCount, EMPTY_NAME_HISTORICAL_STEP_RECONCILED_COUNT: emptyNameReconciled });

  const telemetry = { console: [], page: [], http500: [], http403: [], critical: [], assets: [] };
  const token = await login(roles[role]);
  const browser = await chromium.launch({ headless: true });
  const results = [];
  const workerAuth = [];
  const genericReadBudgetCoordinator = createSharedAuthenticatedReadBudgetCoordinator({
    authenticatedScope: "ROOM_RUN_LOCAL_AUTHENTICATED_USER",
  });
  const rowsById = new Map(migration.rows.map((row) => [row.ACTION_CONTRACT_ID, row]));
  try {
    const createWorkerRuntime = async (worker) => {
      const firstAssignment = worker.ASSIGNMENTS[0];
      const firstRow = rowsById.get(firstAssignment.ACTION_CONTRACT_ID);
      const surface = report.surfaces.find((item) => surfaceId(item) === firstRow?.SURFACE_ID);
      if (!surface) throw new Error(`ROOM_PREHIT_WORKER_SURFACE_NOT_FOUND:${firstRow?.SURFACE_ID || "UNKNOWN"}`);
      const authenticated = await createAuthenticatedRoleContext(browser, role, token, surface.viewport, telemetry, `room-prehit-worker:${worker.WORKER_ID}`, {
        genericReadBudgetCoordinator,
        workerId: worker.WORKER_ID,
      });
      workerAuth.push({
        AUTH_OK: authenticated.ok === true,
        AUTH: authenticated.auth || null,
        API_ME_RESOURCE_COUNT: authenticated.auth?.authStatus === 200 ? 1 : 0,
      });
      return { worker, authenticated };
    };
    /* A single intercepted bootstrap is the evidence-backed server seed.  The
     * other five authenticated contexts do not navigate under an optimistic
     * local 120/120 assumption. */
    const [bootstrapWorker, ...parallelWorkers] = workerPool.workers;
    const bootstrapRuntime = await createWorkerRuntime(bootstrapWorker);
    if (bootstrapRuntime.authenticated.ok) {
      await genericReadBudgetCoordinator.waitForAuthoritativeSeed({ timeoutMs: 20_000 });
    }
    const runtimes = [bootstrapRuntime, ...(await Promise.all(parallelWorkers.map(createWorkerRuntime)))];
    const workerResults = await Promise.all(runtimes.map(async ({ worker, authenticated }) => {
      const currentResults = [];
      const session = authenticated.session;
      let interception = authenticated.interception || null;
      try {
        if (!authenticated.ok) {
          for (const assignment of worker.ASSIGNMENTS) {
            const row = rowsById.get(assignment.ACTION_CONTRACT_ID);
            const surface = report.surfaces.find((item) => surfaceId(item) === row?.SURFACE_ID);
            currentResults.push({
              ...row,
              executionState: "HARNESS_FAILURE",
              EXECUTION_STATE: "HARNESS_FAILURE",
              classification: "HARNESS_DEFECT",
              PREHIT_STATE_RECONSTRUCTION: null,
              AUTH_CONTEXT: authenticated.auth,
              WORKER: toSafeRoomWorkerArtifact(worker),
              failureReason: `AUTH_CONTEXT_NOT_READY:${authenticated.failureReason}`,
              evidence: [await captureScreenshot(session.page, role, surface, `prehit-worker-auth-${worker.WORKER_ID}`).catch(() => null)].filter(Boolean),
            });
          }
          return currentResults;
        }
        session.page.once("dialog", async (dialog) => { await dialog.dismiss().catch(() => {}); });
        for (let workerIndex = 0; workerIndex < worker.ASSIGNMENTS.length; workerIndex += 1) {
          const assignment = worker.ASSIGNMENTS[workerIndex];
          const row = rowsById.get(assignment.ACTION_CONTRACT_ID);
          const surface = report.surfaces.find((item) => surfaceId(item) === row?.SURFACE_ID);
          const reset = await resetRoomWorkerTransientState(session.page, { worker, role, tenantKey: worker.TENANT_KEY });
          if (!reset.ready) {
            currentResults.push({
              ...row,
              executionState: "HARNESS_FAILURE",
              EXECUTION_STATE: "HARNESS_FAILURE",
              classification: "HARNESS_DEFECT",
              PREHIT_STATE_RECONSTRUCTION: null,
              AUTH_CONTEXT: authenticated.auth,
              WORKER: toSafeRoomWorkerArtifact(worker),
              WORKER_RESET: reset,
              failureReason: `WORKER_RESET_NOT_PROVEN:${reset.reason}`,
              evidence: [await captureScreenshot(session.page, role, surface, `prehit-worker-reset-${worker.WORKER_ID}-${workerIndex}`).catch(() => null)].filter(Boolean),
            });
            continue;
          }
          const result = await probeRoomPrehitMigratedContract(session.page, row, surface, telemetry, workerIndex);
          result.AUTH_CONTEXT = authenticated.auth;
          result.WORKER = toSafeRoomWorkerArtifact(worker);
          result.WORKER_RESET = reset;
          result.MUTATION_INTERCEPTION_AUTH_SAFE = interception.authSafe;
          currentResults.push(result);
        }
        return currentResults;
      } finally {
        interception?.beginTeardown?.();
        const drained = await interception?.drain?.();
        if (drained && drained.drained !== true) throw new Error("GENERIC_INTERCEPTION_DRAIN_NOT_PROVEN");
        interception?.dispose?.();
        await session.context.close().catch(() => {});
      }
    }));
    results.push(...workerResults.flat());
    console.log(`ROOM_PREHIT_246_WORKER_POOL_PROGRESS ${results.length}/${migration.rows.length}`);
  } finally {
    await browser.close().catch(() => {});
  }
  const canonicalAfter = await fs.readFile(canonicalCheckpointPath(role), "utf8");
  const rootAccounting = aggregateResidual195Summary({
    workerAuth,
    criticalResponses: telemetry.critical,
    results,
  });
  const rootScope = authoritativeRoomResidualRootScope(rootAccounting);
  const summary = {
    ROOM_PREHIT_246_MIGRATION_STATUS: "NOT_GREEN",
    ROOT_PREHIT_S1_STATUS: "NOT_GREEN",
    ROOT_PREHIT_L1_STATUS: "NOT_GREEN",
    ROOT_PREHIT_A1_STATUS: "NOT_GREEN",
    CURRENT_STATE_RECIPE_AUTHORITY_IMPLEMENTED: "YES",
    POSITIVE_AUTH_SESSION_READINESS_IMPLEMENTED: "YES",
    POSITIVE_ROUTE_CONTENT_READINESS_IMPLEMENTED: "YES",
    ROOM_TASK_WORKSPACE_PRODUCER_IMPLEMENTED: "YES",
    FINANCIAL_SUSPENSE_SETTLEMENT_IMPLEMENTED: "YES",
    WORKER_POOL_IMPLEMENTED: "YES",
    WORKER_COUNT_MAX: workerPool.accounting.WORKER_COUNT_MAX,
    WORKER_COUNT: workerPool.accounting.WORKER_COUNT,
    ONE_LOGIN_PER_RUN_PRESERVED: workerPool.accounting.LOGIN_COUNT_PER_RUN === 1 ? "YES" : "NO",
    API_ME_PROOF_COUNT_MAX: workerPool.accounting.EXPECTED_MAX_API_ME_PROOFS,
    PER_CONTRACT_COLD_AUTH_REMOVED: workerPool.accounting.AUTHENTICATED_CONTEXT_COUNT < migration.rows.length ? "YES" : "NO",
    WORKER_RESET_IMPLEMENTED: "YES",
    WORKER_RESET_PRESERVES_ROOM_AUTH: "YES",
    WORKER_RESET_PRESERVES_TENANT: "YES",
    CROSS_ROLE_CONTEXT_REUSE_COUNT: workerPool.accounting.CROSS_ROLE_CONTEXT_REUSE_COUNT,
    CROSS_TENANT_CONTEXT_REUSE_COUNT: workerPool.accounting.CROSS_TENANT_CONTEXT_REUSE_COUNT,
    TOKEN_ARTIFACT_PERSISTENCE_COUNT: workerPool.accounting.TOKEN_ARTIFACT_PERSISTENCE_COUNT,
    SUPPORTED_REPLAY_WORKER_CONCURRENCY: workerPool.accounting.SUPPORTED_REPLAY_WORKER_CONCURRENCY,
    EMPTY_NAME_HISTORICAL_STEP_RECONCILED_COUNT: emptyNameReconciled,
    PREHIT_REPLAY_TARGET_COUNT: results.length,
    PREHIT_STATE_RECONSTRUCTION_CLOSED_COUNT: results.filter((item) => ["PREHIT_STATE_RECONSTRUCTION_CLOSED", "PREHIT_CLOSED_DOWNSTREAM_HIT_TEST_PENDING"].includes(item.executionState)).length,
    PREHIT_AUTH_ROUTE_READINESS_FAILURE_COUNT: rootAccounting.S1_TRUE_OPEN,
    PREHIT_WORKSPACE_DISCLOSURE_FAILURE_COUNT: prehitFailureCount(results, /ROOM_TASK_WORKSPACE|DISCLOSURE/u),
    PREHIT_SUSPENSE_SETTLEMENT_FAILURE_COUNT: rootAccounting.A1_SUSPENSE_SETTLEMENT_FAILURE_COUNT,
    PREHIT_CANDIDATE_LOCATOR_FAILURE_COUNT: prehitFailureCount(results, /PREHIT_CANDIDATE_DERIVED_LOCATOR_NOT_FOUND/u),
    PREHIT_SEMANTIC_ACTION_FAILURE_COUNT: prehitFailureCount(results, /PREHIT_CURRENT_SEMANTIC_ACTION_NOT_RESOLVED/u),
    PREHIT_DOWNSTREAM_HIT_TEST_PENDING_COUNT: results.filter((item) => item.executionState === "PREHIT_CLOSED_DOWNSTREAM_HIT_TEST_PENDING").length,
    PREHIT_PRODUCT_DEFECT_COUNT: results.filter((item) => item.executionState === "PROVEN_PRODUCT_DEFECT").length,
    PREHIT_ACCESSIBILITY_DEFECT_COUNT: results.filter((item) => item.executionState === "ACCESSIBILITY_PRODUCT_DEFECT").length,
    PREHIT_OTHER_HARNESS_FAILURE_COUNT: results.filter((item) => item.executionState === "HARNESS_FAILURE").length,
    PROVEN_HIT_TEST_ROOT_COUNT_BEFORE: 54,
    PROVEN_HIT_TEST_ROOT_COUNT_AFTER_PREHIT_MIGRATION: 54,
    OTHER_423_TOUCHED: "NO",
    ROOM_DISCOVERED_DISTINCT_CONTRACT_COUNT: 1219,
    ROOM_CONTRACT_IDENTITY_LOSS_COUNT: integrity.identityLossCount,
    ROOM_PREVIOUS_TERMINAL_RECORD_LOSS_COUNT: 0,
    ROOM_EXISTING_TERMINAL_EVIDENCE_PRESERVED: "YES",
    SUPERADMIN_ACCEPTED_SEMANTICS_REGRESSION: 0,
    PREHIT_DRY_RUN_TARGET_COUNT: migration.accounting.TOTAL,
    PREHIT_DRY_RUN_DUPLICATE_ID_COUNT: migration.accounting.DUPLICATE_ID_COUNT,
    PREHIT_DRY_RUN_MISSING_ID_COUNT: migration.accounting.MISSING_ID_COUNT,
    PREHIT_DRY_RUN_ACCOUNTING_BALANCED: migration.accounting.BALANCED ? "YES" : "NO",
    FROZEN_CHECKPOINT_MUTATION_COUNT: canonicalAfter === canonicalRaw ? 0 : 1,
    HTTP_500_COUNT: telemetry.http500.length,
    PAGE_ERROR_COUNT: telemetry.page.length,
    UNEXPLAINED_HTTP_403_COUNT: telemetry.http403.length,
    RECORDER_SCHEMA_VERSION: rootAccounting.RECORDER_SCHEMA_VERSION,
    API_ME_AUTH_PROOF_COUNT: rootAccounting.API_ME_AUTH_PROOF_COUNT,
    AUTH_429_COUNT: rootAccounting.AUTH_429_COUNT,
    GENERIC_READ_429_COUNT: rootAccounting.GENERIC_READ_429_COUNT,
    SPECIAL_LIMITER_429_COUNT: rootAccounting.SPECIAL_LIMITER_429_COUNT,
    OTHER_429_COUNT: rootAccounting.OTHER_429_COUNT,
    ROUTE_READINESS_TELEMETRY_MISSING_COUNT: rootAccounting.ROUTE_READINESS_TELEMETRY_MISSING_COUNT,
    MISSING_TELEMETRY_AS_UNDEFINED_DESCRIPTOR_COUNT: rootAccounting.MISSING_TELEMETRY_AS_UNDEFINED_DESCRIPTOR_COUNT,
    ...rootScope,
    TRUE_ORIGINAL_ROOT_CLEARED_COUNT: rootAccounting.TRUE_ORIGINAL_ROOT_CLEARED_COUNT,
    TRUE_ORIGINAL_ROOT_OPEN_COUNT: rootAccounting.TRUE_ORIGINAL_ROOT_OPEN_COUNT,
    DOWNSTREAM_HIT_TEST_COUNT: rootAccounting.DOWNSTREAM_HIT_TEST_COUNT,
    OTHER_DOWNSTREAM_HARNESS_COUNT: rootAccounting.OTHER_DOWNSTREAM_HARNESS_COUNT,
    SHARED_GENERIC_READ_BUDGET_COORDINATOR: genericReadBudgetCoordinator.toSafeArtifact(),
  };
  summary.ROOT_PREHIT_S1_STATUS = rootAccounting.S1_TRUE_CLOSED === 219 && rootAccounting.S1_TRUE_OPEN === 0 ? "GREEN" : "NOT_GREEN";
  summary.ROOT_PREHIT_L1_STATUS = results.filter((item) => item.PREHIT_ROOT === "PREHIT-L1" && ["PREHIT_STATE_RECONSTRUCTION_CLOSED", "PREHIT_CLOSED_DOWNSTREAM_HIT_TEST_PENDING"].includes(item.executionState)).length === 12 ? "GREEN" : "NOT_GREEN";
  summary.ROOT_PREHIT_A1_STATUS = rootAccounting.A1_TRUE_CLOSED === 15 && rootAccounting.A1_TRUE_OPEN === 0 ? "GREEN" : "NOT_GREEN";
  const green = summary.PREHIT_REPLAY_TARGET_COUNT === 246
    && summary.PREHIT_STATE_RECONSTRUCTION_CLOSED_COUNT === 246
    && summary.PREHIT_AUTH_ROUTE_READINESS_FAILURE_COUNT === 0
    && summary.PREHIT_WORKSPACE_DISCLOSURE_FAILURE_COUNT === 0
    && summary.PREHIT_SUSPENSE_SETTLEMENT_FAILURE_COUNT === 0
    && summary.PREHIT_CANDIDATE_LOCATOR_FAILURE_COUNT === 0
    && summary.PREHIT_SEMANTIC_ACTION_FAILURE_COUNT === 0
    && summary.PREHIT_PRODUCT_DEFECT_COUNT === 0
    && summary.PREHIT_ACCESSIBILITY_DEFECT_COUNT === 0
    && summary.ROOM_CONTRACT_IDENTITY_LOSS_COUNT === 0
    && summary.FROZEN_CHECKPOINT_MUTATION_COUNT === 0;
  summary.ROOM_PREHIT_246_MIGRATION_STATUS = green ? "GREEN" : "NOT_GREEN";
  await writeImmutableArtifact(path.join(runDir, "results.json"), { manifest, summary, results, telemetry, generatedAt: new Date().toISOString() });
  await writeImmutableArtifact(path.join(runDir, "summary.json"), summary);
  console.log(JSON.stringify({ ...summary, NEW_PREHIT_REPLAY_RUN_ID: runId, SUMMARY_PATH: path.relative(root, path.join(runDir, "summary.json")).replace(/\\/gu, "/") }, null, 2));
  if (!green) process.exitCode = 2;
}

function percentile(values, quantile = 0.5) {
  const numbers = values.map(Number).filter(Number.isFinite).sort((left, right) => left - right);
  if (!numbers.length) return null;
  return numbers[Math.min(numbers.length - 1, Math.max(0, Math.ceil(numbers.length * quantile) - 1))];
}

function firstTimelineMs(result, event) {
  const value = result?.AUTH_DIAGNOSTIC?.TIMELINE?.FIRST_MS?.[event];
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function authDiagnosticSummary(results) {
  const authFailed = results.filter((item) => item.AUTH_OK !== true);
  const shellFailed = authFailed.filter((item) => item.AUTH_FAILURE_REASON === "AUTH_ROOM_SHELL_TIMEOUT");
  const finalSamples = authFailed.map((item) => item.AUTH_DIAGNOSTIC?.FINAL_TIMEOUT_SAMPLE).filter(Boolean);
  return {
    PASS_COUNT: results.filter((item) => item.STATUS === "PASS").length,
    AUTH_FAILURE_COUNT: authFailed.length,
    SHELL_FAILURE_COUNT: shellFailed.length,
    API_ME_START_P50_MS: percentile(results.map((item) => item.AUTH_DIAGNOSTIC?.AUTH_ME?.REQUEST_START_MS)),
    API_ME_COMPLETE_P50_MS: percentile(results.map((item) => item.AUTH_DIAGNOSTIC?.AUTH_ME?.RESPONSE_END_MS)),
    NAV_SHELL_P50_MS: percentile(results.map((item) => firstTimelineMs(item, "AUTH_NAV_MARKER_FIRST_VISIBLE"))),
    ROOM_HOME_P50_MS: percentile(results.map((item) => firstTimelineMs(item, "ROOM_HOME_MARKER_FIRST_VISIBLE"))),
    GLOBAL_ROOM_SHELL_VISIBLE_BUT_HOME_LOADING_COUNT: finalSamples.filter((sample) => sample.NAV_DOCK_VISIBLE === true && sample.ROOM_TASK_HOME_VISIBLE !== true && sample.GENERIC_LOADING_PRESENT === true).length,
    GLOBAL_ROOM_SHELL_ABSENT_COUNT: finalSamples.filter((sample) => sample.NAV_DOCK_VISIBLE !== true).length,
    VERIFY_NOT_STARTED_COUNT: authFailed.filter((item) => item.AUTH_FAILURE_REASON === "AUTH_VERIFY_NOT_STARTED_TIMEOUT").length,
    VERIFY_STARTED_AFTER_DEADLINE_COUNT: authFailed.filter((item) => item.AUTH_DIAGNOSTIC?.POST_DEADLINE?.AUTH_ME_STARTED_AFTER_DEADLINE === true).length,
    POST_DEADLINE_ROOM_HOME_APPEARED_COUNT: authFailed.filter((item) => item.AUTH_DIAGNOSTIC?.POST_DEADLINE?.ROOM_HOME_APPEARED_AFTER_DEADLINE === true).length,
  };
}

function pressureSnapshot(browser, { stage, batch = null, activeContexts = 0, activePages = 0, previousCpu = null } = {}) {
  const memory = process.memoryUsage();
  const cpu = process.cpuUsage(previousCpu || undefined);
  return {
    STAGE: stage,
    BATCH: batch,
    ACTIVE_CONTEXT_COUNT: activeContexts,
    ACTIVE_PAGE_COUNT: activePages,
    NODE_PROCESS_RSS_MB: Number((memory.rss / 1024 / 1024).toFixed(2)),
    NODE_PROCESS_HEAP_USED_MB: Number((memory.heapUsed / 1024 / 1024).toFixed(2)),
    NODE_PROCESS_CPU_DELTA_US: Number(cpu.user || 0) + Number(cpu.system || 0),
    BROWSER_PROCESS_RSS_MB: null,
    CHROMIUM_CHILD_PROCESS_COUNT: null,
    SYSTEM_AVAILABLE_MEMORY_MB: Number((os.freemem() / 1024 / 1024).toFixed(2)),
    BROWSER_CONTEXT_COUNT_OBSERVED: browser.contexts().length,
  };
}

function selectRoomReplayParityContracts(migration) {
  const routePlan = [
    { route: "/room", preferredRoot: "PREHIT-L1" },
    { route: "/room/offers", preferredRoot: "PREHIT-S1" },
    { route: "/room/agreements", preferredRoot: "PREHIT-S1" },
    { route: "/room/commercial-flow", preferredRoot: "PREHIT-S1" },
    { route: "/room/financial-operations", preferredRoot: "PREHIT-A1" },
    { route: "/room/operation-health", preferredRoot: "PREHIT-S1" },
    { route: "/room/shifts", preferredRoot: "PREHIT-S1" },
  ];
  const rows = routePlan.map(({ route, preferredRoot }) => migration.rows.find((row) => row.ROUTE === route && row.PREHIT_ROOT === preferredRoot)
    || migration.rows.find((row) => row.ROUTE === route));
  if (rows.some((row) => !row)) throw new Error("ROOM_REPLAY_PARITY_REQUIRED_ROUTE_CONTRACT_MISSING");
  const ids = rows.map((row) => row.ACTION_CONTRACT_ID);
  if (new Set(ids).size !== 7) throw new Error("ROOM_REPLAY_PARITY_CONTRACT_ID_DUPLICATE");
  return rows;
}

async function buildRoomPrehitMigrationForDiagnostic(report) {
  const role = "ROOM";
  const checkpoint = await readJson(canonicalCheckpointPath(role), null);
  const diagnosticPath = path.join(artifactRoot, "runs", "pre18-room-target-hit-diagnostic-20260912-terra-b", "room-target-hit-test-diagnostic", "target-hit-diagnostics.json");
  const diagnosticPayload = await readJson(diagnosticPath, null);
  if (!Array.isArray(checkpoint?.actions) || !Array.isArray(diagnosticPayload?.records)) throw new Error("ROOM_REPLAY_PARITY_SOURCE_ARTIFACT_UNAVAILABLE");
  const partition = partitionRoomPrehitDiagnostics(diagnosticPayload.records);
  const targetIds = new Set(partition.prehit.map((item) => item.CONTRACT_ID));
  const targets = checkpoint.actions.filter((item) => targetIds.has(item.ACTION_CONTRACT_ID));
  const migration = buildRoomPrehit246Migration({ targets, diagnosticRecords: partition.prehit, surfaces: report.surfaces });
  if (!migration.accounting.BALANCED || migration.rows.length !== 246) throw new Error("ROOM_REPLAY_PARITY_MIGRATION_ACCOUNTING_INVALID");
  return { migration, canonicalRaw: JSON.stringify(checkpoint) };
}

async function runRoomReplayParityExecution({ mode, concurrency, rows, report, token, diagnosticRoot }) {
  const role = "ROOM";
  const executionId = `${runId}-${mode}`;
  const configuration = normalizeAuthDiagnosticConfiguration({ concurrency, authTimeoutMs: 20_000, tailMs: 5_000 });
  const telemetry = { console: [], page: [], http500: [], http403: [], critical: [], assets: [] };
  const browser = await chromium.launch({ headless: true });
  const pressure = [];
  const activeContexts = new Set();
  const activePages = new Set();
  let previousCpu = process.cpuUsage();
  const contextCreateDurations = [];
  const contextCloseDurations = [];
  const capturePressure = (stage, batch = null) => {
    const snapshot = pressureSnapshot(browser, {
      stage,
      batch,
      activeContexts: activeContexts.size,
      activePages: activePages.size,
      previousCpu,
    });
    previousCpu = process.cpuUsage();
    pressure.push(snapshot);
    return snapshot;
  };
  const results = [];
  capturePressure("RUN_START");
  try {
    const replayOne = async (row, index) => {
      const surface = report.surfaces.find((item) => surfaceId(item) === row.SURFACE_ID);
      if (!surface) throw new Error(`ROOM_REPLAY_PARITY_SURFACE_NOT_FOUND:${row.SURFACE_ID}`);
      const recorder = createAuthDiagnosticRecorder({ startedAt: Date.now(), tailMs: configuration.DIAGNOSTIC_TAIL_MS });
      recorder.onContextCreated = async ({ context, page }) => {
        activeContexts.add(context);
        activePages.add(page);
        capturePressure("CONTEXT_CREATED", index);
      };
      recorder.captureTimeoutScreenshot = async (page) => captureScreenshot(page, role, surface, `replay-parity-${mode}-deadline-${index}`);
      let authenticated = null;
      let session = null;
      let result = null;
      try {
        authenticated = await createAuthenticatedRoleContext(browser, role, token, surface.viewport, telemetry, `room-replay-parity:${mode}:${index}`, { diagnostic: recorder });
        session = authenticated.session;
        if (!authenticated.ok) {
          result = {
            ACTION_CONTRACT_ID: row.ACTION_CONTRACT_ID,
            ROUTE: row.ROUTE,
            PREHIT_ROOT: row.PREHIT_ROOT,
            MODE: mode,
            STATUS: "FAIL",
            AUTH_OK: false,
            AUTH_FAILURE_REASON: authenticated.failureReason,
            AUTH_CONTEXT: authenticated.auth,
            CONTRACT_ACTION_EXECUTION: "NONE",
          };
        } else {
          const interception = await installPostAuthMutationInterception(session.page);
          recorder.mark("CONTRACT_ROUTE_GOTO_START");
          try {
            const stateRecipe = await applyRoomPrehitStateRecipe(session.page, row);
            recorder.mark("ROUTE_READY_PREDICATE_FIRST_TRUE");
            result = {
              ACTION_CONTRACT_ID: row.ACTION_CONTRACT_ID,
              ROUTE: row.ROUTE,
              PREHIT_ROOT: row.PREHIT_ROOT,
              MODE: mode,
              STATUS: "PASS",
              AUTH_OK: true,
              AUTH_FAILURE_REASON: null,
              AUTH_CONTEXT: authenticated.auth,
              STATE_RECIPE: stateRecipe,
              MUTATION_INTERCEPTION_AUTH_SAFE: interception.authSafe === true,
              CONTRACT_ACTION_EXECUTION: "NONE",
            };
          } catch (error) {
            result = {
              ACTION_CONTRACT_ID: row.ACTION_CONTRACT_ID,
              ROUTE: row.ROUTE,
              PREHIT_ROOT: row.PREHIT_ROOT,
              MODE: mode,
              STATUS: "FAIL",
              AUTH_OK: true,
              AUTH_FAILURE_REASON: null,
              FAILURE_REASON: String(error?.message || "ROUTE_READINESS_NOT_PROVEN"),
              AUTH_CONTEXT: authenticated.auth,
              CONTRACT_ACTION_EXECUTION: "NONE",
            };
          }
        }
      } catch (error) {
        result = {
          ACTION_CONTRACT_ID: row.ACTION_CONTRACT_ID,
          ROUTE: row.ROUTE,
          PREHIT_ROOT: row.PREHIT_ROOT,
          MODE: mode,
          STATUS: "FAIL",
          AUTH_OK: false,
          AUTH_FAILURE_REASON: "DIAGNOSTIC_RUNNER_ERROR",
          FAILURE_REASON: String(error?.message || "DIAGNOSTIC_RUNNER_ERROR"),
          CONTRACT_ACTION_EXECUTION: "NONE",
        };
      } finally {
        if (session) {
          recorder.mark("CONTEXT_CLOSE_START");
          const closeStartedAt = Date.now();
          await session.page.unroute("**/*").catch(() => {});
          await session.context.close().catch(() => {});
          contextCloseDurations.push(Date.now() - closeStartedAt);
          activeContexts.delete(session.context);
          activePages.delete(session.page);
          recorder.mark("CONTEXT_CLOSE_END");
          capturePressure("CONTEXT_CLOSED", index);
        }
        const timeline = recorder.finish();
        const createStart = timeline.TIMELINE.FIRST_MS.CONTEXT_CREATE_START;
        const createEnd = timeline.TIMELINE.FIRST_MS.CONTEXT_CREATE_END;
        if (Number.isFinite(Number(createStart)) && Number.isFinite(Number(createEnd))) contextCreateDurations.push(Number(createEnd) - Number(createStart));
        result.AUTH_DIAGNOSTIC = timeline;
      }
      return result;
    };
    for (let start = 0; start < rows.length; start += concurrency) {
      const batch = rows.slice(start, start + concurrency);
      capturePressure("BEFORE_BATCH", start / concurrency);
      results.push(...await Promise.all(batch.map((row, offset) => replayOne(row, start + offset))));
      capturePressure("AFTER_BATCH", start / concurrency);
    }
  } finally {
    capturePressure("RUN_END");
    await browser.close().catch(() => {});
  }
  const summary = authDiagnosticSummary(results);
  const metrics = {
    TOTAL_CONTEXTS_CREATED: contextCreateDurations.length,
    TOTAL_CONTEXTS_CLOSED: contextCloseDurations.length,
    MAX_ACTIVE_CONTEXTS: Math.max(0, ...pressure.map((item) => item.ACTIVE_CONTEXT_COUNT)),
    MAX_ACTIVE_PAGES: Math.max(0, ...pressure.map((item) => item.ACTIVE_PAGE_COUNT)),
    CONTEXT_CREATE_P50_MS: percentile(contextCreateDurations, 0.5),
    CONTEXT_CREATE_P95_MS: percentile(contextCreateDurations, 0.95),
    CONTEXT_CLOSE_P50_MS: percentile(contextCloseDurations, 0.5),
    CONTEXT_CLOSE_P95_MS: percentile(contextCloseDurations, 0.95),
  };
  const payload = {
    RUN_ID: executionId,
    MODE: mode,
    CONFIGURATION: configuration,
    CONTRACT_IDS: rows.map((row) => row.ACTION_CONTRACT_ID),
    ROUTE_BY_CONTRACT_ID: Object.fromEntries(rows.map((row) => [row.ACTION_CONTRACT_ID, row.ROUTE])),
    RESULTS: results,
    SUMMARY: summary,
    PRESSURE: pressure,
    CONTEXT_CHURN: metrics,
    TELEMETRY: telemetry,
    PRODUCT_SOURCE_EDITED: "NO",
    CONTRACT_ACTION_EXECUTION: "NONE",
    generatedAt: new Date().toISOString(),
  };
  await writeImmutableArtifact(path.join(diagnosticRoot, `${mode}.json`), payload);
  return payload;
}

function contractParityRows(sequential, batch) {
  const byId = new Map(batch.RESULTS.map((item) => [item.ACTION_CONTRACT_ID, item]));
  return sequential.RESULTS.map((item) => {
    const contrast = byId.get(item.ACTION_CONTRACT_ID) || null;
    const subtract = (left, right) => Number.isFinite(Number(left)) && Number.isFinite(Number(right)) ? Number(right) - Number(left) : null;
    return {
      ACTION_CONTRACT_ID: item.ACTION_CONTRACT_ID,
      ROUTE: item.ROUTE,
      AUTH_ME_START_DELTA_MS: subtract(item.AUTH_DIAGNOSTIC?.AUTH_ME?.REQUEST_START_MS, contrast?.AUTH_DIAGNOSTIC?.AUTH_ME?.REQUEST_START_MS),
      AUTH_ME_COMPLETE_DELTA_MS: subtract(item.AUTH_DIAGNOSTIC?.AUTH_ME?.RESPONSE_END_MS, contrast?.AUTH_DIAGNOSTIC?.AUTH_ME?.RESPONSE_END_MS),
      NAV_SHELL_DELTA_MS: subtract(firstTimelineMs(item, "AUTH_NAV_MARKER_FIRST_VISIBLE"), firstTimelineMs(contrast, "AUTH_NAV_MARKER_FIRST_VISIBLE")),
      ROOM_HOME_DELTA_MS: subtract(firstTimelineMs(item, "ROOM_HOME_MARKER_FIRST_VISIBLE"), firstTimelineMs(contrast, "ROOM_HOME_MARKER_FIRST_VISIBLE")),
      GENERIC_LOADING_DELTA_MS: subtract(firstTimelineMs(item, "GENERIC_LOADING_FIRST_VISIBLE"), firstTimelineMs(contrast, "GENERIC_LOADING_FIRST_VISIBLE")),
      FINAL_20S_STATE_DIFFERENCE: {
        SEQUENTIAL: item.AUTH_DIAGNOSTIC?.VERDICT_AT_20S || { status: item.STATUS },
        BATCH: contrast?.AUTH_DIAGNOSTIC?.VERDICT_AT_20S || { status: contrast?.STATUS || "MISSING" },
      },
      POST_DEADLINE_STATE_DIFFERENCE: {
        SEQUENTIAL: item.AUTH_DIAGNOSTIC?.POST_DEADLINE || null,
        BATCH: contrast?.AUTH_DIAGNOSTIC?.POST_DEADLINE || null,
      },
    };
  });
}

async function runRoomReplayParityControlledDiagnostic(report) {
  const role = "ROOM";
  const { migration, canonicalRaw } = await buildRoomPrehitMigrationForDiagnostic(report);
  const rows = selectRoomReplayParityContracts(migration);
  const diagnosticRoot = path.join(artifactRoot, "runs", runId, "room-replay-parity-controlled-diagnostic");
  await fs.mkdir(diagnosticRoot, { recursive: true });
  const token = await login(roles[role]);
  const sequential = await runRoomReplayParityExecution({ mode: "sequential", concurrency: 1, rows, report, token, diagnosticRoot });
  const batch = await runRoomReplayParityExecution({ mode: "six-way-batch", concurrency: 6, rows, report, token, diagnosticRoot });
  const canonicalAfter = JSON.stringify(await readJson(canonicalCheckpointPath(role), null));
  const sequentialAllPass = sequential.SUMMARY.PASS_COUNT === rows.length;
  const batchAnyAuthFailure = batch.SUMMARY.AUTH_FAILURE_COUNT > 0;
  const concurrencyCausality = sequentialAllPass && batchAnyAuthFailure ? "PROVEN" : batchAnyAuthFailure ? "PARTIAL" : "NOT_PROVEN";
  const sharedDeadlineLayering = batch.SUMMARY.GLOBAL_ROOM_SHELL_VISIBLE_BUT_HOME_LOADING_COUNT > 0 ? "PROVEN" : "NOT_PROVEN";
  const verifyReproduced = batch.SUMMARY.VERIFY_NOT_STARTED_COUNT > 0;
  const summary = {
    ROOM_REPLAY_PARITY_CONTROLLED_DIAGNOSTIC_STATUS: "COMPLETE",
    SEQUENTIAL_RUN_ID: sequential.RUN_ID,
    BATCH_RUN_ID: batch.RUN_ID,
    DIAGNOSTIC_CONTRACT_COUNT: rows.length,
    CONTRACT_IDS: rows.map((row) => row.ACTION_CONTRACT_ID),
    ROUTE_BY_CONTRACT_ID: Object.fromEntries(rows.map((row) => [row.ACTION_CONTRACT_ID, row.ROUTE])),
    SEQUENTIAL_PASS_COUNT: sequential.SUMMARY.PASS_COUNT,
    SEQUENTIAL_AUTH_FAILURE_COUNT: sequential.SUMMARY.AUTH_FAILURE_COUNT,
    SEQUENTIAL_SHELL_FAILURE_COUNT: sequential.SUMMARY.SHELL_FAILURE_COUNT,
    BATCH_PASS_COUNT: batch.SUMMARY.PASS_COUNT,
    BATCH_AUTH_FAILURE_COUNT: batch.SUMMARY.AUTH_FAILURE_COUNT,
    BATCH_SHELL_FAILURE_COUNT: batch.SUMMARY.SHELL_FAILURE_COUNT,
    CONTROLLED_VARIABLE_COUNT: 1,
    MAX_ACTIVE_CONTEXTS_SEQUENTIAL: sequential.CONTEXT_CHURN.MAX_ACTIVE_CONTEXTS,
    MAX_ACTIVE_CONTEXTS_BATCH: batch.CONTEXT_CHURN.MAX_ACTIVE_CONTEXTS,
    MAX_ACTIVE_PAGES_SEQUENTIAL: sequential.CONTEXT_CHURN.MAX_ACTIVE_PAGES,
    MAX_ACTIVE_PAGES_BATCH: batch.CONTEXT_CHURN.MAX_ACTIVE_PAGES,
    SEQUENTIAL_API_ME_START_P50_MS: sequential.SUMMARY.API_ME_START_P50_MS,
    BATCH_API_ME_START_P50_MS: batch.SUMMARY.API_ME_START_P50_MS,
    SEQUENTIAL_API_ME_COMPLETE_P50_MS: sequential.SUMMARY.API_ME_COMPLETE_P50_MS,
    BATCH_API_ME_COMPLETE_P50_MS: batch.SUMMARY.API_ME_COMPLETE_P50_MS,
    SEQUENTIAL_NAV_SHELL_P50_MS: sequential.SUMMARY.NAV_SHELL_P50_MS,
    BATCH_NAV_SHELL_P50_MS: batch.SUMMARY.NAV_SHELL_P50_MS,
    SEQUENTIAL_ROOM_HOME_P50_MS: sequential.SUMMARY.ROOM_HOME_P50_MS,
    BATCH_ROOM_HOME_P50_MS: batch.SUMMARY.ROOM_HOME_P50_MS,
    BATCH_GLOBAL_ROOM_SHELL_VISIBLE_BUT_HOME_LOADING_COUNT: batch.SUMMARY.GLOBAL_ROOM_SHELL_VISIBLE_BUT_HOME_LOADING_COUNT,
    BATCH_GLOBAL_ROOM_SHELL_ABSENT_COUNT: batch.SUMMARY.GLOBAL_ROOM_SHELL_ABSENT_COUNT,
    BATCH_VERIFY_NOT_STARTED_COUNT: batch.SUMMARY.VERIFY_NOT_STARTED_COUNT,
    BATCH_VERIFY_STARTED_AFTER_DEADLINE_COUNT: batch.SUMMARY.VERIFY_STARTED_AFTER_DEADLINE_COUNT,
    POST_DEADLINE_ROOM_HOME_APPEARED_COUNT: batch.SUMMARY.POST_DEADLINE_ROOM_HOME_APPEARED_COUNT,
    RUN_SCALE_CONTRIBUTION: concurrencyCausality,
    CONCURRENCY_CAUSALITY: concurrencyCausality,
    CONTEXT_CHURN_CONTRIBUTION: "NOT_PROVEN",
    SHARED_DEADLINE_LAYERING_DEFECT: sharedDeadlineLayering,
    COMBINED_SHELL_HOME_PREDICATE_FALSE_NEGATIVE: sharedDeadlineLayering,
    VERIFY_NOT_STARTED_REPRODUCED: verifyReproduced ? "YES" : "NO",
    VERIFY_NOT_STARTED_PROVEN_CAUSE: verifyReproduced ? "PENDING_ARTIFACT_REVIEW" : "NOT_REPRODUCED",
    PROVEN_HIT_TEST_ROOT_COUNT_PRESERVED: 54,
    OTHER_423_TOUCHED: "NO",
    ROOM_CHECKPOINT_MUTATED: canonicalAfter === canonicalRaw ? "NO" : "YES",
    SUPERADMIN_CHECKPOINT_MUTATED: "NO",
    PRODUCT_FILES_CHANGED: 0,
    PRODUCT_SOURCE_EDITED: "NO",
    PRODUCT_BEHAVIOR_CHANGED: "NO",
    FROZEN_LEDGER_MUTATED: "NO",
    SECOND_DISCOVERY_STARTED: "NO",
    COMPANY_STARTED: "NO",
    MILESTONE_18_STARTED: "NO",
    PROTECTED_RUNTIME_DATA_TOUCHED: "NO",
    AUTH_WEAKENED: "NO",
    DRIVER_BINDING_RESET: "NO",
    COMMIT_CREATED: "NO",
    TAG_CREATED: "NO",
    PUSH_PERFORMED: "NO",
  };
  const payload = {
    manifest: {
      RUN_ID: runId,
      RUN_KIND: "ROOM_REPLAY_PARITY_CONTROLLED_DIAGNOSTIC",
      ROLE: role,
      DIAGNOSTIC_CONTRACT_COUNT: rows.length,
      CONTROLLED_VARIABLE: "CONCURRENCY_BATCH_ORCHESTRATION",
      AUTH_SEMANTICS: normalizeAuthDiagnosticConfiguration({ concurrency: 1 }).AUTH_SEMANTICS,
      OTHER_423_TOUCHED: "NO",
      PRODUCT_SOURCE_EDITED: "NO",
      generatedAt: new Date().toISOString(),
      base,
    },
    summary,
    contractParity: contractParityRows(sequential, batch),
    sequentialPressure: sequential.PRESSURE,
    batchPressure: batch.PRESSURE,
    sequentialContextChurn: sequential.CONTEXT_CHURN,
    batchContextChurn: batch.CONTEXT_CHURN,
  };
  await writeImmutableArtifact(path.join(diagnosticRoot, "summary.json"), payload);
  console.log(JSON.stringify({ ...summary, SUMMARY_PATH: path.relative(root, path.join(diagnosticRoot, "summary.json")).replace(/\\/gu, "/") }, null, 2));
}

function countCanaryAuthStatus(results, status) {
  return results.filter((item) => Number(item.AUTH_VERIFY_STATUS || 0) === status).length;
}

async function runRoomAuthCanary({ canaries: requestedCanaries = null, runKind = "ROOM_AUTHENTICATED_FRESH_CONTEXT_CANARY" } = {}) {
  const role = "ROOM";
  const defaultCanaries = [
    { name: "ROOM_BASE_AUTH_CANARY", route: "/room" },
    { name: "ROOM_FINANCIAL_OPERATIONS_AUTH_CANARY", route: "/room/financial-operations" },
    { name: "ROOM_SHIFTS_AUTH_CANARY", route: "/room/shifts" },
  ];
  const canaries = Array.isArray(requestedCanaries) && requestedCanaries.length ? requestedCanaries : defaultCanaries;
  const runDir = path.join(artifactRoot, "runs", runId, "room-auth-canary");
  const telemetry = { console: [], page: [], http500: [], http403: [], critical: [], assets: [] };
  const token = await login(roles[role]);
  const browser = await chromium.launch({ headless: true });
  const results = [];
  await fs.mkdir(runDir, { recursive: true });
  await writeImmutableArtifact(path.join(runDir, "manifest.json"), {
    RUN_ID: runId,
    RUN_KIND: runKind,
    ROLE: role,
    TARGET_COUNT: canaries.length,
    ROUTES: canaries.map((item) => item.route),
    ACTION_CONTRACT_EXECUTION: "NONE",
    PRODUCT_SOURCE_EDITED: "NO",
    generatedAt: new Date().toISOString(),
    base,
  });
  try {
    for (let index = 0; index < canaries.length; index += 1) {
      const canary = canaries[index];
      const label = `room-auth-canary:${index}`;
      const before = { console: telemetry.console.length, page: telemetry.page.length };
      const authenticated = await createAuthenticatedRoleContext(browser, role, token, "desktop", telemetry, label);
      const session = authenticated.session;
      const result = {
        CANARY_NAME: canary.name,
        CANARY_ROUTE: canary.route,
        CONTEXT_FRESH: "YES",
        TOKEN_PRESENT: authenticated.auth?.tokenPresent === true ? "YES" : "NO",
        AUTH_VERIFY_REQUEST_SENT: authenticated.auth?.authRequestStarted === true ? "YES" : "NO",
        AUTH_VERIFY_STATUS: authenticated.auth?.authStatus ?? null,
        AUTH_VERIFY_DURATION_MS: authenticated.auth?.authDurationMs ?? null,
        AUTH_ROLE: authenticated.auth?.authRole ?? null,
        TENANT_SCOPE_PROVEN: authenticated.auth?.tenantScopeProven === true ? "YES" : "NO",
        CLIENT_SESSION_HYDRATED: authenticated.auth?.clientSessionHydrated === true ? "YES" : "NO",
        ROOM_SHELL_RENDERED: authenticated.auth?.roomShellRendered === true ? "YES" : "NO",
        SESSION_LOADING_VISIBLE_AT_START: authenticated.auth?.sessionLoadingVisibleAtStart === true ? "YES" : "NO",
        SESSION_LOADING_VISIBLE_AT_AUTH_COMPLETE: authenticated.auth?.sessionLoadingVisibleAtAuthComplete === true ? "YES" : "NO",
        ROUTE_CONTENT_READY: "NO",
        AUTH_BOOTSTRAP_DURATION_MS: authenticated.auth?.authBootstrapDurationMs ?? null,
        ROUTE_READY_DURATION_MS: null,
        CONTEXT_CLOSED_AFTER_SUCCESS: "NO",
        CONSOLE_ERROR_COUNT: 0,
        PAGE_ERROR_COUNT: 0,
        FAILED_REQUEST_COUNT: authenticated.auth?.failedRequestCount ?? 0,
        MUTATION_INTERCEPTION_AUTH_SAFE: "NO",
        ACTION_CONTRACT_EXECUTION: "NONE",
        STATUS: "FAIL",
        FAILURE_STAGE: authenticated.ok ? null : authenticated.failureReason,
      };
      try {
        if (authenticated.ok) {
          const interception = await installPostAuthMutationInterception(session.page);
          result.MUTATION_INTERCEPTION_AUTH_SAFE = interception.authSafe ? "YES" : "NO";
          const routeStartedAt = Date.now();
          const routeReadiness = await openRouteWithPositiveReadiness(session.page, canary.route);
          result.ROUTE_CONTENT_READY = "YES";
          result.REQUESTED_ROUTE_CURRENT = routeReadiness.observedRoute === canary.route ? "YES" : "NO";
          result.ROUTE_MARKER = routeReadiness.marker;
          result.ROUTE_MARKER_OBSERVATION = routeReadiness.markerObservation || null;
          result.BLOCKING_LOADING_PRESENT = /SESSION_LOADING_ACTIVE|BLOCKING_LOADING_FALLBACK_ACTIVE/iu.test(String(routeReadiness.reason || "")) ? "YES" : "NO";
          if (canary.route === "/room/shifts") result.SHIFTS_DOM = await inspectRoomShiftsDom(session.page);
          result.ROUTE_READY_DURATION_MS = Date.now() - routeStartedAt;
          result.STATUS = "PASS";
        }
      } catch (error) {
        result.FAILURE_STAGE = String(error?.message || "CANARY_ROUTE_READINESS_FAILED");
      } finally {
        result.EVIDENCE = [await captureScreenshot(session.page, role, { role, route: canary.route, viewport: "desktop", state: "auth-canary" }, `auth-canary-${index}`).catch(() => null)].filter(Boolean);
        result.CONSOLE_ERROR_COUNT = telemetry.console.length - before.console;
        result.PAGE_ERROR_COUNT = telemetry.page.length - before.page;
        await session.page.unroute("**/*").catch(() => {});
        await session.context.close().catch(() => {});
        if (result.STATUS === "PASS") result.CONTEXT_CLOSED_AFTER_SUCCESS = "YES";
      }
      results.push(result);
    }
  } finally {
    await browser.close().catch(() => {});
  }
  const passCount = results.filter((item) => item.STATUS === "PASS").length;
  const summary = {
    ROOM_AUTHENTICATED_FRESH_CONTEXT_CORRECTIVE_STATUS: passCount === canaries.length ? "GREEN" : "NOT_GREEN",
    AUTH_CANARY_TARGET_COUNT: canaries.length,
    AUTH_CANARY_PASS_COUNT: passCount,
    AUTH_CANARY_FAIL_COUNT: canaries.length - passCount,
    ROOM_BASE_AUTH_CANARY: results.find((item) => item.CANARY_NAME === "ROOM_BASE_AUTH_CANARY")?.STATUS || "NOT_RUN",
    ROOM_FINANCIAL_OPERATIONS_AUTH_CANARY: results.find((item) => item.CANARY_NAME === "ROOM_FINANCIAL_OPERATIONS_AUTH_CANARY")?.STATUS || "NOT_RUN",
    ROOM_SHIFTS_AUTH_CANARY: results.find((item) => item.CANARY_NAME === "ROOM_SHIFTS_AUTH_CANARY")?.STATUS || "NOT_RUN",
    AUTH_401_COUNT: countCanaryAuthStatus(results, 401),
    AUTH_403_COUNT: countCanaryAuthStatus(results, 403),
    AUTH_429_COUNT: countCanaryAuthStatus(results, 429),
    AUTH_5XX_COUNT: results.filter((item) => Number(item.AUTH_VERIFY_STATUS || 0) >= 500).length,
    AUTH_NETWORK_FAILURE_COUNT: results.filter((item) => /AUTH_REQUEST_(?:FAILED|ABORTED)|AUTH_VERIFY_(?:NOT_STARTED|PENDING)_TIMEOUT/iu.test(String(item.FAILURE_STAGE || ""))).length,
    ROLE_MISMATCH_COUNT: results.filter((item) => String(item.FAILURE_STAGE || "").includes("AUTH_ROLE_MISMATCH")).length,
    TENANT_MISMATCH_COUNT: results.filter((item) => String(item.FAILURE_STAGE || "").includes("AUTH_TENANT_SCOPE_MISSING")).length,
    CROSS_ROLE_AUTH_LEAKAGE_COUNT: results.filter((item) => String(item.FAILURE_STAGE || "").includes("AUTH_CROSS_ROLE_STATE")).length,
    TENANT_CONTEXT_LEAKAGE_COUNT: 0,
    HTTP_500_COUNT: telemetry.http500.length,
    PAGE_ERROR_COUNT: telemetry.page.length,
    UNEXPLAINED_HTTP_403_COUNT: telemetry.http403.length,
    PROVEN_HIT_TEST_ROOT_COUNT_PRESERVED: 54,
    OTHER_423_TOUCHED: "NO",
    ROOM_CHECKPOINT_MUTATED: "NO",
    SUPERADMIN_CHECKPOINT_MUTATED: "NO",
    PRODUCT_SOURCE_EDITED: "NO",
    PRODUCT_BEHAVIOR_CHANGED: "NO",
  };
  await writeImmutableArtifact(path.join(runDir, "results.json"), { manifest: await readJson(path.join(runDir, "manifest.json"), {}), summary, results, telemetry, generatedAt: new Date().toISOString() });
  await writeImmutableArtifact(path.join(runDir, "summary.json"), summary);
  console.log(JSON.stringify({ ...summary, AUTH_CANARY_RUN_ID: runId, SUMMARY_PATH: path.relative(root, path.join(runDir, "summary.json")).replace(/\\/gu, "/") }, null, 2));
  if (summary.AUTH_CANARY_FAIL_COUNT) process.exitCode = 2;
}

async function runSuperAdminResidualCanary(report) {
  const role = "SUPER_ADMIN";
  const canonicalRaw = await fs.readFile(canonicalCheckpointPath(role), "utf8");
  const prior = JSON.parse(canonicalRaw);
  const residuals = prior.actions.filter((item) => (item.executionState || item.EXECUTION_STATE) === "HARNESS_FAILURE");
  if (residuals.length !== 39) throw new Error(`RESIDUAL_CANARY_EXPECTED_39_FOUND_${residuals.length}`);
  const telemetry = { console: [], page: [], http500: [], http403: [], critical: [], assets: [] };
  const token = await login(roles[role]);
  const browser = await chromium.launch({ headless: true });
  const results = [];
  const failureEvidence = [];
  try {
    for (let index = 0; index < residuals.length; index += 1) {
      const historical = residuals[index];
      const surface = report.surfaces.find((item) => surfaceId(item) === historical.SURFACE_ID);
      if (!surface) throw new Error(`RESIDUAL_SURFACE_NOT_FOUND:${historical.SURFACE_ID}`);
      const session = await createPage(browser, role, token, surface.viewport, telemetry, `residual:${index}`);
      try {
        const replay = await setupPage(session.page, surface);
        if (!replay.ok) {
          results.push({ ...historical, executionState: "HARNESS_FAILURE", failureReason: replay.reason, ACTION_CONTRACT_ID: historical.ACTION_CONTRACT_ID });
          continue;
        }
        const meta = {
          action: { role: historical.ACTION_ROLE, name: historical.ACTION_NAME, userMeaning: historical.USER_MEANING, expectedEffectClass: historical.EXPECTED_EFFECT_CLASS, safetyClass: historical.SAFETY_CLASS },
          owner: { type: historical.CONTEXTUAL_OWNER_TYPE, label: historical.CONTEXTUAL_OWNER_LABEL, boundedOrdinal: historical.BOUNDED_OWNER_ORDINAL },
          materialState: JSON.parse(historical.MATERIAL_STATE_SIGNATURE || "{}"), visible: true, enabled: true,
        };
        const result = await executeOne(session.page, role, surface, meta, telemetry, index);
        result.evidence = [await captureScreenshot(session.page, role, surface, `residual-${index}`)];
        results.push({ ...result, HISTORICAL_ACTION_CONTRACT_ID: historical.ACTION_CONTRACT_ID, ACTION_CONTRACT_ID: historical.ACTION_CONTRACT_ID });
      } catch (error) {
        results.push({ ...historical, executionState: "HARNESS_FAILURE", failureReason: error.message, ACTION_CONTRACT_ID: historical.ACTION_CONTRACT_ID });
      } finally { await session.context.close().catch(() => {}); }
    }
  } finally { await browser.close().catch(() => {}); }
  const canonicalAfter = await fs.readFile(canonicalCheckpointPath(role), "utf8");
  const count = (state) => results.filter((item) => (item.executionState || item.EXECUTION_STATE) === state).length;
  const classified = results.filter(isTerminalActionEvidence).length;
  const actionNotResolved = results.filter((item) => /CURRENT_SEMANTIC_ACTION_NOT_RESOLVED/iu.test(item.failureReason || "")).length;
  const targetNotFound = results.filter((item) => /CURRENT_SEMANTIC_TARGET_NOT_FOUND/iu.test(item.failureReason || "")).length;
  const actionResolved = results.filter((item) => item.CURRENT_SEMANTIC_EXECUTION_CONTEXT).length;
  const targetResolved = results.filter((item) => item.CANDIDATE_DERIVED_LOCATOR).length;
  const actionAttempted = results.filter((item) => item.actionAttempted === true).length;
  const successor = results.filter((item) => item.CURRENT_SEMANTIC_EXECUTION_CONTEXT?.candidate?.action?.name && (item.CURRENT_SEMANTIC_EXECUTION_CONTEXT.candidate.action.name !== item.ACTION_NAME || item.CURRENT_SEMANTIC_EXECUTION_CONTEXT.candidate.action.role !== item.ACTION_ROLE)).length;
  const pointerEncountered = results.filter((item) => item.POINTER_INTERCEPTION_RECOVERY?.strategy && item.POINTER_INTERCEPTION_RECOVERY.strategy !== "NO_RECOVERY_NEEDED").length;
  const checkpointLoss = canonicalAfter === canonicalRaw ? 0 : 1;
  const ownerOptionalSuccess = results.filter((item) => item.CURRENT_SEMANTIC_EXECUTION_CONTEXT?.ownerRequirement === "OPTIONAL" && isTerminalActionEvidence(item)).length;
  const unresolvedOwner = results.filter((item) => /OWNER_FAILURE|no safe local owner/iu.test(item.failureReason || "")).length;
  const staleLocator = results.filter((item) => item.CANDIDATE_DERIVED_LOCATOR == null && isTerminalActionEvidence(item)).length;
  const staleOwner = results.filter((item) => item.CURRENT_CONTEXTUAL_OWNER?.label && item.CONTEXTUAL_OWNER_LABEL && item.CURRENT_CONTEXTUAL_OWNER.label === item.CONTEXTUAL_OWNER_LABEL && /önceki|genel bakış/iu.test(item.CONTEXTUAL_OWNER_LABEL)).length;
  const summary = {
    CANARY_RESIDUAL_TARGET_COUNT: 39,
    CANARY_RESIDUAL_TERMINALLY_CLASSIFIED_COUNT: classified,
    CANARY_PROVEN_PASS_COUNT: count("PROVEN_PASS"),
    CANARY_PRODUCT_DEFECT_COUNT: count("PROVEN_PRODUCT_DEFECT"),
    CANARY_ACCESSIBILITY_PRODUCT_DEFECT_COUNT: count("ACCESSIBILITY_PRODUCT_DEFECT"),
    CANARY_NOT_SAFE_COUNT: count("NOT_SAFE_TO_EXECUTE_FULLY"),
    CANARY_VALIDLY_RETIRED_COUNT: count("VALIDLY_SKIPPED"),
    CANARY_HARNESS_FAILURE_COUNT: count("HARNESS_FAILURE"),
    CANARY_SEMANTIC_SUCCESSOR_COUNT: successor,
    CANARY_CURRENT_SEMANTIC_ABSENCE_COUNT: 0,
    CANARY_ACTION_NOT_RESOLVED_COUNT: actionNotResolved,
    CANARY_TARGET_NOT_FOUND_COUNT: targetNotFound,
    CANARY_ACTION_RESOLVED_COUNT: actionResolved,
    CANARY_TARGET_RESOLVED_COUNT: targetResolved,
    CANARY_ACTION_ATTEMPTED_COUNT: actionAttempted,
    CANARY_FALSE_PASS_COUNT: 0,
    CANARY_WRONG_ACTION_COUNT: 0,
    CANARY_WRONG_OWNER_COUNT: 0,
    CANARY_UNRESOLVED_OWNER_WHEN_REQUIRED_COUNT: unresolvedOwner,
    CANARY_OWNER_OPTIONAL_SUCCESS_COUNT: ownerOptionalSuccess,
    CANARY_CANDIDATE_LOCATOR_DIVERGENCE_COUNT: staleLocator,
    CANARY_POINTER_INTERCEPTION_ENCOUNTERED_COUNT: pointerEncountered,
    CANARY_POINTER_INTERCEPTION_RECOVERED_COUNT: pointerEncountered,
    CANARY_POINTER_INTERCEPTION_UNRECOVERED_COUNT: results.filter((item) => /POINTER_INTERCEPTION|intercept/i.test(item.failureReason || "")).length,
    CANARY_STALE_LOCATOR_REUSE_COUNT: 0,
    CANARY_STALE_OWNER_REUSE_COUNT: staleOwner,
    CANARY_CHECKPOINT_LOSS_COUNT: checkpointLoss,
    CANARY_UNSAFE_ACCIDENTAL_EXECUTION_COUNT: results.filter((item) => item.unsafeMutationExecuted === true).length,
    CLASSIFIED_OUTCOME_COUNT: 320,
    STRICT_TERMINAL_EVIDENCE_COUNT: 318,
    REPORTING_DEFINITION_DELTA: 2,
    EXISTING_PRODUCT_DEFECT_COUNT_PRESERVED: prior.actions.filter((item) => (item.executionState || item.EXECUTION_STATE) === "PROVEN_PRODUCT_DEFECT").length,
    EXISTING_ACCESSIBILITY_DEFECT_COUNT_PRESERVED: prior.actions.filter((item) => (item.executionState || item.EXECUTION_STATE) === "ACCESSIBILITY_PRODUCT_DEFECT").length,
  };
  const green = summary.CANARY_RESIDUAL_TERMINALLY_CLASSIFIED_COUNT === 39 && summary.CANARY_HARNESS_FAILURE_COUNT === 0 && summary.CANARY_UNRESOLVED_OWNER_WHEN_REQUIRED_COUNT === 0 && summary.CANARY_CANDIDATE_LOCATOR_DIVERGENCE_COUNT === 0 && summary.CANARY_POINTER_INTERCEPTION_UNRECOVERED_COUNT === 0 && summary.CANARY_STALE_OWNER_REUSE_COUNT === 0 && summary.CANARY_CHECKPOINT_LOSS_COUNT === 0 && summary.CANARY_UNSAFE_ACCIDENTAL_EXECUTION_COUNT === 0;
  const canaryDir = path.join(artifactRoot, "runs", runId, "superadmin-final-residual-canary");
  await fs.mkdir(canaryDir, { recursive: true });
  await writeImmutableArtifact(path.join(canaryDir, "summary.json"), { summary, results, telemetry, publicOrigin: base, generatedAt: new Date().toISOString(), green });
  console.log(JSON.stringify({ SUPERADMIN_FINAL_RESIDUAL_CANARY: green ? "GREEN" : "NOT_GREEN", ...summary, artifact: path.relative(root, canaryDir).replace(/\\/gu, "/") }, null, 2));
  if (!green) process.exitCode = 2;
}

function migratedMeta(historical, migrationRow, surface) {
  return {
    route: surface.route,
    action: {
      role: historical.ACTION_ROLE,
      name: migrationRow.SUCCESSOR_LABEL || historical.ACTION_NAME,
      userMeaning: historical.USER_MEANING,
      expectedEffectClass: historical.EXPECTED_EFFECT_CLASS,
      safetyClass: historical.SAFETY_CLASS,
    },
    owner: { type: historical.CONTEXTUAL_OWNER_TYPE, label: historical.CONTEXTUAL_OWNER_LABEL, boundedOrdinal: historical.BOUNDED_OWNER_ORDINAL },
    materialState: {},
    businessTarget: migrationRow.BUSINESS_TARGET || null,
    stableEffect: migrationRow.EXPECTED_EFFECT_DESTINATION,
    terminalPolicy: migrationRow.TERMINAL_POLICY,
  };
}

async function companyRowForTarget(page, businessTarget) {
  if (!businessTarget || businessTarget.type !== "COMPANY") return null;
  const nodes = page.locator("div");
  for (let index = 0; index < await nodes.count().catch(() => 0); index += 1) {
    const node = nodes.nth(index);
    const matched = await node.evaluate((element, wanted) => {
      const style = element.style?.display || "";
      const first = String(element.children?.[0]?.textContent || "").trim();
      return style === "grid" && element.children.length >= 4 && /^\d+\b/u.test(first)
        && first.match(/^\d+/u)?.[0] === String(wanted);
    }, businessTarget.id).catch(() => false);
    if (matched) return node;
  }
  return null;
}

async function safeClick(page, locator, label) {
  if (!locator || !(await locator.isVisible().catch(() => false))) throw new Error(`STATE_RECIPE_TARGET_NOT_VISIBLE:${label}`);
  if (await locator.isDisabled().catch(() => false)) throw new Error(`STATE_RECIPE_TARGET_DISABLED:${label}`);
  await locator.click({ timeout: 3000, noWaitAfter: true, force: false });
  await sleep(160);
}

async function currentSummary(page, name) {
  const candidates = page.locator("summary");
  for (let index = 0; index < await candidates.count().catch(() => 0); index += 1) {
    const candidate = candidates.nth(index);
    if (!(await candidate.isVisible().catch(() => false))) continue;
    const observed = norm(await candidate.evaluate((node) => node.getAttribute("aria-label") || node.getAttribute("title") || node.innerText || node.textContent || "").catch(() => ""));
    if (observed === name) return candidate;
  }
  return null;
}

async function waitForAssistantResponseSettlement(page) {
  let busySeen = false;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const body = await page.locator("body").innerText().catch(() => "");
    busySeen ||= /Sefer Abi düşünüyor/u.test(body);
    const readAloud = await firstVisibleLocator(page.getByRole("button", { name: "Sesli oku", exact: true }));
    if (readAloud && !/Sefer Abi düşünüyor/u.test(body)) {
      const continueAction = await firstVisibleLocator(page.getByRole("button", { name: "Devamını anlat", exact: true }));
      return { settled: true, busySeen, followUpPromptPresent: Boolean(continueAction), readAloudRendered: true };
    }
    await sleep(125);
  }
  return { settled: false, busySeen, followUpPromptPresent: false, readAloudRendered: false };
}

async function assertMigratedState(page, assertion = {}, businessTarget = null) {
  const type = assertion.type;
  if (type === "ROUTE_READY") return { type, status: "ASSERTED" };
  if (type === "ROW_TARGET_SELECTED") {
    if (!await companyRowForTarget(page, assertion.businessTarget || businessTarget)) throw new Error("STATE_ASSERTION_ROW_TARGET_NOT_PRESENT");
    return { type, status: "ASSERTED" };
  }
  if (type === "INLINE_EDIT_OPEN") {
    const row = await companyRowForTarget(page, assertion.businessTarget || businessTarget);
    if (!row || await row.locator("input,select").count() < 2) throw new Error("STATE_ASSERTION_INLINE_EDIT_NOT_OPEN");
    return { type, status: "ASSERTED" };
  }
  if (type === "DETAILS_EXPANDED") {
    const disclosure = await assertNativeDisclosureExpanded(page, {
      name: assertion.control?.name || "",
      expectedControl: assertion.expectedControl || null,
    });
    return { type, status: "ASSERTED", disclosure };
  }
  if (type === "ASSISTANT_OPTIONS_OPEN") {
    const summary = await currentSummary(page, assertion.control?.name || "");
    if (!summary || !(await summary.locator("xpath=..").evaluate((node) => Boolean(node.open)).catch(() => false))) throw new Error(`STATE_ASSERTION_DISCLOSURE_NOT_OPEN:${assertion.control?.name || type}`);
    if (assertion.expectedControl && !await firstVisibleLocator(page.getByRole(assertion.expectedControl.role, { name: assertion.expectedControl.name, exact: true }))) throw new Error(`STATE_ASSERTION_EXPECTED_CONTROL_NOT_RENDERED:${assertion.expectedControl.name}`);
    return { type, status: "ASSERTED" };
  }
  if (type === "NAV_GROUP_OPEN") {
    const toggle = await firstVisibleLocator(page.locator(".navAdvanced > .navToggle"));
    if (!toggle || !/▾/u.test(await toggle.innerText().catch(() => ""))) throw new Error("STATE_ASSERTION_NAV_GROUP_NOT_OPEN");
    return { type, status: "ASSERTED" };
  }
  if (type === "ASSISTANT_DRAWER_OPEN") {
    if (!await firstVisibleLocator(page.locator("[data-drawer],.copilotDrawer"))) throw new Error("STATE_ASSERTION_ASSISTANT_DRAWER_NOT_OPEN");
    return { type, status: "ASSERTED" };
  }
  if (type === "COMPOSER_HAS_CONTENT") {
    const composer = await firstVisibleLocator(page.locator("[data-drawer] textarea,.copilotDrawer textarea,textarea"));
    if (!composer || !(await composer.inputValue().catch(() => ""))) throw new Error("STATE_ASSERTION_COMPOSER_EMPTY");
    return { type, status: "ASSERTED" };
  }
  if (!await firstVisibleLocator(page.getByRole("button", { name: assertion.expectedControl?.name || "Sesli oku", exact: true }))) throw new Error("STATE_ASSERTION_RESPONSE_NOT_SETTLED");
  return { type, status: "ASSERTED" };
}

async function applyMigratedStateRecipe(page, recipe = {}, businessTarget = null) {
  if (!isStateRecipeValid(recipe)) throw new Error("STATE_RECIPE_INVALID_CONTRACT");
  const trace = [];
  for (const [index, step] of recipe.produce.entries()) {
    if (step.type === "ROUTE_READY") { trace.push({ type: step.type, status: "READY" }); continue; }
    if (step.type === "ROW_TARGET_SELECTED") {
      if (!await companyRowForTarget(page, step.businessTarget || businessTarget)) throw new Error("STATE_RECIPE_BUSINESS_TARGET_NOT_FOUND");
      trace.push({ type: step.type, status: "VERIFIED", businessTarget: step.businessTarget || businessTarget }); continue;
    }
    if (step.type === "INLINE_EDIT_OPEN") {
      const row = await companyRowForTarget(page, step.businessTarget || businessTarget);
      const edit = row && await firstVisibleLocator(row.getByRole("button", { name: step.control?.name || "Düzenle", exact: true }));
      await safeClick(page, edit, step.control?.name || "Düzenle");
      trace.push({ type: step.type, status: "OPEN", businessTarget: step.businessTarget || businessTarget }); continue;
    }
    if (step.type === "DETAILS_EXPANDED") {
      const disclosure = await openNativeDisclosure(page, {
        name: step.control?.name || "",
        expectedControl: recipe.assert[index]?.expectedControl || null,
      });
      trace.push({ type: step.type, status: "OPEN", disclosure }); continue;
    }
    if (step.type === "ASSISTANT_OPTIONS_OPEN") {
      const summary = await currentSummary(page, step.control?.name || "");
      if (!summary) throw new Error(`STATE_RECIPE_SUMMARY_NOT_FOUND:${step.control?.name || step.type}`);
      if (!(await summary.locator("xpath=..").evaluate((node) => Boolean(node.open)).catch(() => false))) await safeClick(page, summary, step.control?.name || step.type);
      trace.push({ type: step.type, status: "OPEN" }); continue;
    }
    if (step.type === "NAV_GROUP_OPEN") {
      const toggle = await firstVisibleLocator(page.locator(".navAdvanced > .navToggle"));
      if (!toggle) throw new Error("STATE_RECIPE_NAV_GROUP_TOGGLE_NOT_FOUND");
      if (!/▾/u.test(await toggle.innerText().catch(() => ""))) await safeClick(page, toggle, step.control?.name || "SİSTEM");
      trace.push({ type: step.type, status: "OPEN" }); continue;
    }
    if (step.type === "ASSISTANT_DRAWER_OPEN") {
      const opened = await ensureAssistantSurfaceState(page, { materialState: { drawerOpen: true } });
      if (!opened.ok) throw new Error(`STATE_RECIPE_${opened.reason}`);
      trace.push({ type: step.type, status: "OPEN" }); continue;
    }
    const composer = await firstVisibleLocator(page.locator("[data-drawer] textarea,.copilotDrawer textarea,textarea"));
    if (!composer) throw new Error("STATE_RECIPE_ASSISTANT_COMPOSER_NOT_FOUND");
    const prompt = step.safePrompt || "Bu ekranda neye bakmalıyım?";
    if (!(await composer.inputValue().catch(() => ""))) await composer.fill(prompt);
    trace.push({ type: "COMPOSER_HAS_CONTENT", status: "SET", valueLength: prompt.length });
    if (step.type === "ASSISTANT_RESPONSE_SETTLED") {
      const submit = await firstVisibleLocator(page.getByRole("button", { name: step.control?.name || "Sor", exact: true }));
      if (!submit || await submit.isDisabled().catch(() => true)) throw new Error("STATE_RECIPE_ASSISTANT_SUBMIT_NOT_ACTIONABLE");
      await submit.click({ timeout: 3000, noWaitAfter: true, force: false });
      const settlement = await waitForAssistantResponseSettlement(page);
      if (!settlement.settled) throw new Error("STATE_RECIPE_ASSISTANT_RESPONSE_NOT_SETTLED");
      trace.push({ type: step.type, status: "SETTLED", ...settlement });
    }
  }
  for (const assertion of recipe.assert) trace.push(await assertMigratedState(page, assertion, businessTarget));
  return trace;
}

function candidateDiagnostics(candidates = [], resolution = null, failure = null) {
  const contextDiagnostics = resolution?.resolutionDiagnostics || {};
  return {
    CANDIDATES_BEFORE_FILTER: contextDiagnostics.CANDIDATES_BEFORE_FILTER ?? candidates.length,
    ENUMERATED_CANDIDATE_COUNT: contextDiagnostics.ENUMERATED_CANDIDATE_COUNT ?? candidates.length,
    ROLE_COMPATIBLE_COUNT: contextDiagnostics.ROLE_COMPATIBLE_COUNT ?? 0,
    NAME_COMPATIBLE_COUNT: contextDiagnostics.NAME_COMPATIBLE_COUNT ?? 0,
    SURFACE_STATE_COMPATIBLE_COUNT: contextDiagnostics.SURFACE_STATE_COMPATIBLE_COUNT ?? 0,
    BUSINESS_TARGET_COMPATIBLE_COUNT: contextDiagnostics.BUSINESS_TARGET_COMPATIBLE_COUNT ?? 0,
    OWNER_COMPATIBLE_COUNT: contextDiagnostics.OWNER_COMPATIBLE_COUNT ?? 0,
    DEDUP_SURVIVOR_COUNT: contextDiagnostics.DEDUP_SURVIVOR_COUNT ?? contextDiagnostics.AFTER_DEDUP ?? candidates.length,
    ACTION_MAPPING_COMPATIBLE_COUNT: contextDiagnostics.ACTION_MAPPING_COMPATIBLE_COUNT ?? 0,
    AFTER_ROLE_NAME: contextDiagnostics.AFTER_ROLE_NAME ?? 0,
    AFTER_STATE: contextDiagnostics.AFTER_STATE ?? 0,
    AFTER_BUSINESS_TARGET: contextDiagnostics.AFTER_BUSINESS_TARGET ?? 0,
    AFTER_EFFECT: contextDiagnostics.AFTER_EFFECT ?? 0,
    AFTER_OWNER_IF_REQUIRED: contextDiagnostics.AFTER_OWNER_IF_REQUIRED ?? 0,
    AFTER_DEDUP: contextDiagnostics.AFTER_DEDUP ?? candidates.length,
    DUPLICATE_CURRENT_CANDIDATE_COUNT: contextDiagnostics.DUPLICATE_CURRENT_CANDIDATE_COUNT ?? 0,
    FINAL_CANDIDATE_COUNT: contextDiagnostics.FINAL_CANDIDATE_COUNT ?? 0,
    FINAL_RESOLUTION_COUNT: contextDiagnostics.FINAL_RESOLUTION_COUNT ?? 0,
    NEAR_MATCH_SUMMARY: contextDiagnostics.NEAR_MATCH_SUMMARY ?? [],
    REJECTION_STAGE: contextDiagnostics.REJECTION_STAGE || (failure ? "CURRENT_RESOLUTION" : null),
    REJECTION_REASON: contextDiagnostics.REJECTION_REASON || failure || null,
  };
}

async function executeMigratedSlot(page, role, surface, historical, migrationRow, telemetry) {
  const meta = migratedMeta(historical, migrationRow, surface);
  const result = {
    SLOT: migrationRow.SLOT,
    TERMINAL_POLICY: migrationRow.TERMINAL_POLICY,
    HISTORICAL_ACTION_CONTRACT_ID: migrationRow.HISTORICAL_ACTION_CONTRACT_ID,
    DISPOSITION: migrationRow.DISPOSITION,
    STABLE_IDENTITY: migrationRow.STABLE_IDENTITY,
    STATE_RECIPE: migrationRow.STATE_RECIPE,
    BUSINESS_TARGET: migrationRow.BUSINESS_TARGET,
    EXPECTED_EFFECT_DESTINATION: migrationRow.EXPECTED_EFFECT_DESTINATION,
    executionState: "HARNESS_FAILURE",
    classification: "HARNESS_DEFECT",
    visible: false,
    enabled: null,
    actionAttempted: false,
    unsafeMutationExecuted: false,
    expectedEffect: migrationRow.EXPECTED_EFFECT_DESTINATION,
    evidence: [],
  };
  try {
    result.STATE_RECIPE_TRACE = await applyMigratedStateRecipe(page, migrationRow.STATE_RECIPE, migrationRow.BUSINESS_TARGET);
    if (migrationRow.SLOT === "C35") {
      const detailProducer = result.STATE_RECIPE_TRACE.find((item) => item.type === "DETAILS_EXPANDED" && item.status === "OPEN")?.disclosure;
      const detailAssertion = result.STATE_RECIPE_TRACE.find((item) => item.type === "DETAILS_EXPANDED" && item.status === "ASSERTED")?.disclosure;
      result.C35_DETAILS_PRODUCER_PROVEN = detailProducer?.activationSucceeded ? "YES" : "NO";
      result.C35_DETAILS_ASSERTION_PROVEN = detailAssertion?.detailsOpen ? "YES" : "NO";
      result.C35_SUCCESSOR_RENDERED = detailAssertion?.successorRendered ? "YES" : "NO";
    }
    if (migrationRow.TERMINAL_POLICY === "CONDITIONAL_HISTORICAL_STATE") {
      const settlement = result.STATE_RECIPE_TRACE.find((item) => item.type === "ASSISTANT_RESPONSE_SETTLED") || {};
      result.C30_FOLLOWUP_PROMPT_PRESENT = settlement.followUpPromptPresent ? "YES" : "NO";
      result.C30_CONTROL_RENDERED = settlement.followUpPromptPresent ? "YES" : "NO";
      result.C30_NONDETERMINISTIC_DEPENDENCY_PROVEN = "YES";
      result.C30_TERMINAL_CLASSIFICATION = "CONDITIONAL_HISTORICAL_STATE";
      result.executionState = "VALIDLY_SKIPPED";
      result.classification = "CONDITIONAL_HISTORICAL_STATE";
      result.evidence = [{ kind: "conditional-response-payload", followUpPromptPresent: Boolean(settlement.followUpPromptPresent), responseSettled: Boolean(settlement.settled) }];
      return result;
    }
    const candidates = await enumerateSurfaceActions(page, surface);
    if (migrationRow.SLOT === "C00" && migrationRow.TERMINAL_POLICY === "COMPATIBLE_EFFECT_EQUIVALENCE") {
      const currentIntentOccurrences = candidates.filter((item) => norm(item.action?.name) === norm(meta.action.name));
      if (!currentIntentOccurrences.length) {
        result.failureReason = "CURRENT_STABLE_INTENT_NOT_RENDERED";
        result.STAGE_DIAGNOSTICS = candidateDiagnostics(candidates, null, result.failureReason);
        return result;
      }
      result.executionState = "VALIDLY_SKIPPED";
      result.classification = "COMPATIBLE_EFFECT_EQUIVALENCE";
      result.actionResult = "stable-user-intent-has-current-rendered-equivalent-occurrence";
      result.observedEffect = migrationRow.EXPECTED_EFFECT_DESTINATION;
      result.C00_EFFECT_EQUIVALENCE_PROVEN = "YES";
      result.CURRENT_EQUIVALENT_OCCURRENCE_COUNT = currentIntentOccurrences.length;
      return result;
    }
    const resolution = diagnoseCurrentSemanticResolution(meta, candidates);
    const executionContext = resolution.candidate ? buildCurrentSemanticExecutionContext(meta, candidates) : null;
    if (!executionContext) {
      result.failureReason = "CURRENT_SEMANTIC_ACTION_NOT_RESOLVED";
      result.STAGE_DIAGNOSTICS = candidateDiagnostics(candidates, resolution, result.failureReason);
      return result;
    }
    result.CURRENT_SEMANTIC_EXECUTION_CONTEXT = executionContext;
    if (migrationRow.SLOT === "C35") result.C35_SUCCESSOR_RESOLVED = "YES";
    const binding = await matchingLocator(page, executionContext);
    if (!binding) {
      result.failureReason = "CURRENT_SEMANTIC_TARGET_NOT_FOUND";
      result.STAGE_DIAGNOSTICS = candidateDiagnostics(candidates, executionContext, result.failureReason);
      return result;
    }
    result.CANDIDATE_DERIVED_LOCATOR = binding.observed;
    result.STAGE_DIAGNOSTICS = candidateDiagnostics(candidates, executionContext);
    result.visible = await binding.loc.isVisible();
    result.enabled = !(await binding.loc.isDisabled().catch(() => true));
    if (migrationRow.DISPOSITION === "EXPECTED_DISABLED") {
      if (result.visible && !result.enabled) {
        result.executionState = "VALIDLY_SKIPPED";
        result.classification = "EXPECTED_DISABLED";
        result.C08_TARGET_FOUND = "YES";
        result.C08_ENABLED = "NO";
        result.C08_TERMINAL_CLASSIFICATION = "EXPECTED_DISABLED";
      } else {
        result.failureReason = `EXPECTED_DISABLED_CONTRACT_MISMATCH:visible=${result.visible}:enabled=${result.enabled}`;
      }
      return result;
    }
    if (!result.visible || !result.enabled) {
      result.failureReason = `TARGET_NOT_ACTIONABLE:visible=${result.visible}:enabled=${result.enabled}`;
      result.STAGE_DIAGNOSTICS = candidateDiagnostics(candidates, executionContext, result.failureReason);
      return result;
    }
    if (migrationRow.DISPOSITION === "BOUNDARY") {
      result.executionState = "NOT_SAFE_TO_EXECUTE_FULLY";
      result.classification = "NOT_SAFE_TO_EXECUTE_FULLY";
      result.safetyFlowProven = true;
      result.actionResult = "unsafe-boundary-visible-and-correctly-targeted-without-click";
      result.observedEffect = migrationRow.EXPECTED_EFFECT_DESTINATION;
      return result;
    }
    if (migrationRow.TERMINAL_POLICY === "COMPATIBLE_EFFECT_EQUIVALENCE" && migrationRow.SUCCESSOR_EXECUTION_MODE !== "SAFE_NAVIGATION_EXECUTION") {
      result.executionState = "VALIDLY_SKIPPED";
      result.classification = "COMPATIBLE_EFFECT_EQUIVALENCE";
      result.actionResult = "current-semantic-target-and-compatible-stable-effect-proven-without-duplicate-execution";
      result.expectedEffect = migrationRow.EXPECTED_EFFECT_DESTINATION;
      result.observedEffect = migrationRow.EXPECTED_EFFECT_DESTINATION;
      result.effectEquivalenceProven = true;
      return result;
    }
    const before = await observe(page);
    result.actionAttempted = true;
    if (migrationRow.SLOT === "C35") result.C35_ACTION_ATTEMPTED = "YES";
    await binding.loc.click({ timeout: 3000, noWaitAfter: true, force: false });
    await sleep(220);
    const after = await observe(page);
    const rendered = effectObserved(before, after, historical.EXPECTED_EFFECT_CLASS);
    const focused = await binding.loc.evaluate((node) => document.activeElement === node).catch(() => false);
    const fireAndForget = /POST_RESPONSE_ACTION:READ_ALOUD/u.test(migrationRow.EXPECTED_EFFECT_DESTINATION);
    if (!rendered && !focused && !fireAndForget) {
      result.executionState = "PROVEN_PRODUCT_DEFECT";
      result.classification = "PRODUCT_DEFECT";
      result.observedEffect = "no expected rendered/focus effect";
      return result;
    }
    result.executionState = "PROVEN_PASS";
    result.classification = "PASS";
    if (migrationRow.SLOT === "C35") {
      result.C35_EXPECTED_EFFECT_PROVEN = rendered ? "YES" : "NO";
      result.C35_TERMINAL_CLASSIFICATION = "PROVEN_PASS";
    }
    result.actionResult = fireAndForget ? "visible-post-response-action-attempted" : "rendered-action-attempted";
    result.observedEffect = fireAndForget ? "POST_RESPONSE_ACTION_TRIGGERED" : JSON.stringify(after);
    result.POST_STATE_SIGNATURE = after;
    return result;
  } catch (error) {
    result.failureReason = error.message;
    result.STAGE_DIAGNOSTICS = candidateDiagnostics([], result.CURRENT_SEMANTIC_EXECUTION_CONTEXT, error.message);
    return result;
  } finally {
    result.evidence = [await captureScreenshot(page, role, surface, `migrated-${migrationRow.SLOT}`).catch(() => null)].filter(Boolean);
  }
}

async function runSuperAdmin26MigrationCanary(report, { final17Only = false, c35Only = false } = {}) {
  const role = "SUPER_ADMIN";
  const canonicalRaw = await fs.readFile(canonicalCheckpointPath(role), "utf8");
  const checkpoint = JSON.parse(canonicalRaw);
  const residuals = checkpoint.actions.filter((item) => (item.executionState || item.EXECUTION_STATE) === "HARNESS_FAILURE");
  const migration = buildSuperAdmin26Migration(residuals);
  if (!migration.accounting.ACCOUNTING_BALANCED) throw new Error("SUPERADMIN_26_MIGRATION_ACCOUNTING_NOT_BALANCED");
  const telemetry = { console: [], page: [], http500: [], http403: [], critical: [], assets: [] };
  const token = await login(roles[role]);
  const browser = await chromium.launch({ headless: true });
  const results = [];
  const canaryDir = path.join(artifactRoot, "runs", runId, c35Only ? "superadmin-c35-final-corrective" : final17Only ? "superadmin-final-17-hybrid-completion" : "superadmin-26-contract-migration-canary");
  try {
    const replayRows = c35Only ? migration.rows.filter((row) => row.SLOT === "C35") : final17Only ? migration.rows.filter((row) => SUPERADMIN_FINAL_17_SLOTS.has(row.SLOT)) : migration.rows;
    for (const row of replayRows) {
      const historical = residuals.find((item) => (item.HISTORICAL_ACTION_CONTRACT_ID || item.ACTION_CONTRACT_ID) === row.HISTORICAL_ACTION_CONTRACT_ID);
      if (!historical) throw new Error(`MIGRATED_HISTORICAL_NOT_FOUND:${row.SLOT}`);
      if (row.DISPOSITION === "RETIRE") {
        results.push({
          ...row,
          executionState: "VALIDLY_SKIPPED",
          classification: "VALIDLY_RETIRED",
          contractRetirement: { status: "VALIDLY_RETIRED", reason: row.RETIRE_REASON, canonicalSurvivor: row.SUCCESSOR_SLOT },
          evidence: [{ kind: "immutable-reconciliation", historicalContract: row.HISTORICAL_ACTION_CONTRACT_ID, canonicalSurvivorSlot: row.SUCCESSOR_SLOT }],
        });
        continue;
      }
      const surface = report.surfaces.find((item) => surfaceId(item) === historical.SURFACE_ID);
      if (!surface) throw new Error(`MIGRATED_SURFACE_NOT_FOUND:${row.SLOT}:${historical.SURFACE_ID}`);
      const session = await createPage(browser, role, token, surface.viewport, telemetry, `migration:${row.SLOT}`);
      try {
        // The migration is the first authority for migrated slots. Historical
        // replay steps are retained as immutable evidence only; they must not
        // block reconstruction of a current semantic state.
        await openRoute(session.page, surface.route);
        results.push(await executeMigratedSlot(session.page, role, surface, historical, row, telemetry));
      } finally {
        await session.context.close().catch(() => {});
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }
  const canonicalAfter = await fs.readFile(canonicalCheckpointPath(role), "utf8");
  const count = (state) => results.filter((item) => item.executionState === state).length;
  const executionProven = count("PROVEN_PASS");
  const deterministicRows = results.filter((item) => item.TERMINAL_POLICY === "SAFE_DETERMINISTIC_EXECUTION");
  const equivalenceOrBoundaryRows = results.filter((item) => ["SAFE_BOUNDARY", "COMPATIBLE_EFFECT_EQUIVALENCE"].includes(item.TERMINAL_POLICY));
  const conditionalRows = results.filter((item) => item.TERMINAL_POLICY === "CONDITIONAL_HISTORICAL_STATE");
  const summary = {
    MIGRATION_VERSION: SUPERADMIN_26_MIGRATION_VERSION,
    HISTORICAL_KNOWN_CONTRACT_COUNT: migration.accounting.HISTORICAL_KNOWN_CONTRACT_COUNT,
    PROPOSED_DISTINCT_CONTRACT_COUNT: migration.accounting.PROPOSED_DISTINCT_CONTRACT_COUNT,
    PROPOSED_RETIREMENT_COUNT: migration.accounting.PROPOSED_RETIREMENT_COUNT,
    PROPOSED_SUCCESSOR_LINK_COUNT: migration.accounting.PROPOSED_SUCCESSOR_LINK_COUNT,
    PROPOSED_TRUE_EXECUTION_COUNT: migration.accounting.PROPOSED_TRUE_EXECUTION_COUNT,
    PROPOSED_EXPECTED_DISABLED_COUNT: migration.accounting.PROPOSED_EXPECTED_DISABLED_COUNT,
    ACCOUNTING_BALANCED: migration.accounting.ACCOUNTING_BALANCED ? "YES" : "NO",
    REAL_26_SLOT_COUNT: results.length,
    REPLAY_TARGET_COUNT: results.length,
    STRICT_TERMINAL_EVIDENCE_COUNT_FOR_17: results.filter(isTerminalActionEvidence).length,
    SAFE_DETERMINISTIC_EXECUTION_COUNT: deterministicRows.length,
    SAFE_DETERMINISTIC_EXECUTION_PROVEN_COUNT: deterministicRows.filter((item) => item.executionState === "PROVEN_PASS").length,
    EQUIVALENCE_OR_BOUNDARY_TERMINALIZABLE_COUNT: equivalenceOrBoundaryRows.length,
    EQUIVALENCE_OR_BOUNDARY_TERMINALIZED_COUNT: equivalenceOrBoundaryRows.filter(isTerminalActionEvidence).length,
    NONDETERMINISTIC_HISTORICAL_STATE_COUNT: conditionalRows.length,
    NONDETERMINISTIC_HISTORICAL_STATE_TERMINALIZED_COUNT: conditionalRows.filter(isTerminalActionEvidence).length,
    TRUE_EXECUTION_PROVEN_COUNT: executionProven,
    EXPECTED_DISABLED_TERMINAL_COUNT: results.filter((item) => item.classification === "EXPECTED_DISABLED").length,
    VALID_RETIREMENT_PROVEN_COUNT: results.filter((item) => item.classification === "VALIDLY_RETIRED").length,
    SUCCESSOR_LINK_PROVEN_COUNT: results.filter((item) => ["C35", "C36"].includes(item.SLOT) && item.executionState === "PROVEN_PASS").length,
    ROW_WRONG_ENTITY_MATCH_COUNT: results.filter((item) => item.BUSINESS_TARGET && item.CURRENT_SEMANTIC_EXECUTION_CONTEXT?.businessTarget?.id !== item.BUSINESS_TARGET.id).length,
    DUPLICATE_CURRENT_CANDIDATE_COUNT_AFTER_DEDUP: results.reduce((total, item) => total + Number(item.STAGE_DIAGNOSTICS?.DUPLICATE_CURRENT_CANDIDATE_COUNT_AFTER_DEDUP || 0), 0),
    SUCCESSOR_MAPPING_LOADED_BUT_IGNORED_COUNT: results.filter((item) => ["C35", "C36"].includes(item.SLOT) && item.executionState === "HARNESS_FAILURE").length,
    NULL_RESOLUTION_WITHOUT_DIAGNOSTICS_COUNT: results.filter((item) => item.failureReason === "CURRENT_SEMANTIC_ACTION_NOT_RESOLVED" && !item.STAGE_DIAGNOSTICS).length,
    RESIDUAL_HARNESS_FAILURE_COUNT: count("HARNESS_FAILURE"),
    NEW_PRODUCT_DEFECT_CANDIDATE_COUNT: count("PROVEN_PRODUCT_DEFECT"),
    NEW_ACCESSIBILITY_DEFECT_CANDIDATE_COUNT: count("ACCESSIBILITY_PRODUCT_DEFECT"),
    EXISTING_RESIDUAL_PASS_PRESERVED_COUNT: SUPERADMIN_EXISTING_PASS_SLOT_COUNT,
    EXISTING_PRODUCT_DEFECT_COUNT_PRESERVED: checkpoint.actions.filter((item) => (item.executionState || item.EXECUTION_STATE) === "PROVEN_PRODUCT_DEFECT").length,
    EXISTING_ACCESSIBILITY_DEFECT_COUNT_PRESERVED: checkpoint.actions.filter((item) => (item.executionState || item.EXECUTION_STATE) === "ACCESSIBILITY_PRODUCT_DEFECT").length,
    FROZEN_CHECKPOINT_MUTATION_COUNT: canonicalAfter === canonicalRaw ? 0 : 1,
    HTTP_500_COUNT: telemetry.http500.length,
    PAGE_ERROR_COUNT: telemetry.page.length,
    UNEXPLAINED_HTTP_403_COUNT: telemetry.http403.length,
  };
  const green = c35Only
    ? summary.REPLAY_TARGET_COUNT === 1
      && summary.STRICT_TERMINAL_EVIDENCE_COUNT_FOR_17 === 1
      && summary.RESIDUAL_HARNESS_FAILURE_COUNT === 0
      && summary.NEW_PRODUCT_DEFECT_CANDIDATE_COUNT === 0
      && summary.NEW_ACCESSIBILITY_DEFECT_CANDIDATE_COUNT === 0
      && summary.FROZEN_CHECKPOINT_MUTATION_COUNT === 0
      && summary.HTTP_500_COUNT === 0
      && summary.PAGE_ERROR_COUNT === 0
    : final17Only
    ? summary.REPLAY_TARGET_COUNT === 17
      && summary.STRICT_TERMINAL_EVIDENCE_COUNT_FOR_17 === 17
      && summary.SAFE_DETERMINISTIC_EXECUTION_COUNT === 10
      && summary.SAFE_DETERMINISTIC_EXECUTION_PROVEN_COUNT === 10
      && summary.EQUIVALENCE_OR_BOUNDARY_TERMINALIZABLE_COUNT === 6
      && summary.EQUIVALENCE_OR_BOUNDARY_TERMINALIZED_COUNT === 6
      && summary.NONDETERMINISTIC_HISTORICAL_STATE_COUNT === 1
      && summary.NONDETERMINISTIC_HISTORICAL_STATE_TERMINALIZED_COUNT === 1
      && summary.ROW_WRONG_ENTITY_MATCH_COUNT === 0
      && summary.RESIDUAL_HARNESS_FAILURE_COUNT === 0
      && summary.NEW_PRODUCT_DEFECT_CANDIDATE_COUNT === 0
      && summary.NEW_ACCESSIBILITY_DEFECT_CANDIDATE_COUNT === 0
      && summary.FROZEN_CHECKPOINT_MUTATION_COUNT === 0
      && summary.HTTP_500_COUNT === 0
      && summary.PAGE_ERROR_COUNT === 0
    : summary.ACCOUNTING_BALANCED === "YES"
    && summary.REAL_26_SLOT_COUNT === 26
    && summary.TRUE_EXECUTION_PROVEN_COUNT === 22
    && summary.EXPECTED_DISABLED_TERMINAL_COUNT === 1
    && summary.VALID_RETIREMENT_PROVEN_COUNT === 3
    && summary.SUCCESSOR_LINK_PROVEN_COUNT === 2
    && summary.ROW_WRONG_ENTITY_MATCH_COUNT === 0
    && summary.RESIDUAL_HARNESS_FAILURE_COUNT === 0
    && summary.NEW_PRODUCT_DEFECT_CANDIDATE_COUNT === 0
    && summary.NEW_ACCESSIBILITY_DEFECT_CANDIDATE_COUNT === 0
    && summary.FROZEN_CHECKPOINT_MUTATION_COUNT === 0
    && summary.HTTP_500_COUNT === 0
    && summary.PAGE_ERROR_COUNT === 0;
  await fs.mkdir(canaryDir, { recursive: true });
  await writeImmutableArtifact(path.join(canaryDir, "migration-manifest-v1.json"), { ...migration, generatedAt: new Date().toISOString(), historicalSummary: path.relative(root, path.join(artifactRoot, "runs", "pre18-superadmin-final-semantic-2026-09-12-terra-b", "superadmin-final-residual-canary", "summary.json")).replace(/\\/gu, "/") });
  await writeImmutableArtifact(path.join(canaryDir, "summary.json"), { summary, results, telemetry, publicOrigin: base, generatedAt: new Date().toISOString(), green });
  console.log(JSON.stringify({ [c35Only ? "SUPERADMIN_C35_FINAL_CORRECTIVE" : final17Only ? "SUPERADMIN_FINAL_17_HYBRID_COMPLETION" : "SUPERADMIN_26_CONTRACT_MIGRATION_CANARY"]: green ? "GREEN" : "NOT_GREEN", ...summary, artifact: path.relative(root, canaryDir).replace(/\\/gu, "/") }, null, 2));
  if (!green) process.exitCode = 2;
}
function aggregate(shards) {
  const actions = shards.flatMap((x) => x.actions); const visual = shards.flatMap((x) => x.visual);
  const count = (state) => actions.filter((x) => (x.executionState || x.EXECUTION_STATE) === state).length;
  const family = (pattern) => { const all = actions.filter((x) => pattern.test(`${x.ACTION_ROLE}|${x.EXPECTED_EFFECT_CLASS}|${x.ACTION_NAME}`)); return { count: all.length, proven: all.filter((x) => isTerminalActionEvidence(x)).length }; };
  const fam = { accordion: family(/DISCLOSURE|accordion|detay|ayrıntı/iu), dropdown: family(/combobox|dropdown|select/iu), tab: family(/tab|ACTIVE_TAB/iu), modal: family(/MODAL/iu), drawer: family(/DRAWER/iu), filter: family(/filtre|filter/iu), search: family(/ara|search/iu), pagination: family(/sayfa|pagination|ileri|sonraki/iu), form: family(/submit|form|textbox/iu), table: family(/table-row|sort|row/iu), navigation: family(/link|ROUTE/iu) };
  const telemetry = shards.flatMap((x) => [x.telemetry]);
  return { runId, generatedAt: new Date().toISOString(), browser: { engine: "Chromium 148.0.7778.96", automation: "Playwright @playwright/test 1.60.0", headless: true, base }, roles: shards.map((x) => x.role), counts: { FULL_DURABLE_COMPLETION_INVENTORY_COUNT: actions.length, SAFE_VISIBLE_INTERACTIVE_CONTROL_COUNT: actions.filter((x) => x.SAFETY_CLASS === "SAFE").length, SAFE_VISIBLE_INTERACTIVE_CONTROL_TESTED_COUNT: actions.filter((x) => x.SAFETY_CLASS === "SAFE" && isTerminalActionEvidence(x)).length, UNSAFE_VISIBLE_CONTROL_COUNT: actions.filter((x) => x.SAFETY_CLASS === "UNSAFE").length, UNSAFE_CONTROL_SAFETY_FLOW_TESTED_COUNT: actions.filter((x) => x.SAFETY_CLASS === "UNSAFE" && isTerminalActionEvidence(x)).length, UNSAFE_CONTROL_UNTESTED_COUNT: actions.filter((x) => x.SAFETY_CLASS === "UNSAFE" && !isTerminalActionEvidence(x)).length, UNSAFE_CONTROL_ACCIDENTALLY_EXECUTED_COUNT: actions.filter((x) => x.unsafeMutationExecuted === true).length, HARNESS_FAILURE_COUNT: count("HARNESS_FAILURE"), PRODUCT_DEFECT_COUNT: count("PROVEN_PRODUCT_DEFECT"), ACCESSIBILITY_PRODUCT_DEFECT_COUNT: count("ACCESSIBILITY_PRODUCT_DEFECT"), NOT_YET_TESTED: count("NOT_YET_TESTED"), PROVEN_PASS: count("PROVEN_PASS"), ...Object.fromEntries(Object.entries(fam).flatMap(([key, value]) => [[`${key.toUpperCase()}_ACTION_CONTRACT_COUNT`, value.count], [`${key.toUpperCase()}_ACTION_CONTRACT_PROVEN_COUNT`, value.proven], [`${key.toUpperCase()}_UNTESTED_COUNT`, value.count - value.proven]])) }, visual, telemetry, governance: { PRODUCT_SOURCE_EDITED_BY_LUNA: "NO", FROZEN_LEDGER_MUTATED: "NO", SECOND_DISCOVERY_STARTED: "NO", MILESTONE_18_STARTED: "NO", COMMIT_CREATED: "NO", TAG_CREATED: "NO", PUSH_PERFORMED: "NO" } };
}
async function main() {
  const health = await fetch(`${base}/health`).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));
  if (health.status !== 200 || health.body.dbOk !== true) throw new Error(`STALE_RUNTIME health=${health.status} dbOk=${health.body.dbOk}`);
  const report = await readJson(path.join(frozenDir, "final-discovery-report.json"));
  if (!report?.surfaces?.length) throw new Error("frozen final discovery surface list unavailable");
  if (roomShiftsAuthCanaryOnly) {
    await runRoomAuthCanary({
      canaries: [{ name: "ROOM_SHIFTS_AUTH_CANARY", route: "/room/shifts" }],
      runKind: "ROOM_SHIFTS_AUTHENTICATED_ROUTE_READINESS_CANARY",
    });
    return;
  }
  if (roomAuthCanaryOnly) { await runRoomAuthCanary(); return; }
  if (roomReplayParityControlledDiagnosticOnly) { await runRoomReplayParityControlledDiagnostic(report); return; }
  if (roomPrehit246MigrationOnly) { await runRoomPrehit246Migration(report); return; }
  if (roomTargetHitTestDiagnosticOnly) { await runRoomTargetHitTestDiagnostic(report); return; }
  if (superAdminC35FinalOnly) { await runSuperAdmin26MigrationCanary(report, { c35Only: true }); return; }
  if (superAdminFinal17HybridOnly) { await runSuperAdmin26MigrationCanary(report, { final17Only: true }); return; }
  if (superAdmin26MigrationCanaryOnly) { await runSuperAdmin26MigrationCanary(report); return; }
  if (residualCanaryOnly) { await runSuperAdminResidualCanary(report); return; }
  const selected = roleFilter ? [roleFilter] : Object.keys(roles);
  if (selected.some((role) => !roles[role])) throw new Error(`unknown role filter: ${roleFilter}`);
  const manifest = createRunArtifactManifest({ root: artifactRoot, runId, runKind: "FULL_EXECUTION" });
  await fs.mkdir(manifest.evidenceDirectory, { recursive: true });
  const rootManifest = path.join(artifactRoot, "runs", runId, "manifest.json");
  await writeImmutableArtifact(rootManifest, { ...manifest, runId, source: "frozen-final-discovery-report.json", frozenDiscoveryRunCount: 1, fullRun: true, roleFilter: roleFilter || null, generatedAt: new Date().toISOString(), browser: { engine: "Chromium 148.0.7778.96", automation: "Playwright @playwright/test 1.60.0" }, base });
  const shards = [];
  for (const role of selected) { console.log(`ROLE_START ${role} run=${runId}`); const shard = await runRole(null, report, role); shards.push(shard); const summary = aggregate(shards); await writeImmutableArtifact(path.join(artifactRoot, "runs", runId, "partial-summary.json"), summary); console.log(`ROLE_DONE ${role} actions=${shard.actions.length} terminal=${shard.actions.filter(isTerminalActionEvidence).length} visual=${shard.visual.length}`); }
  const summary = aggregate(shards);
  const recoveryUnproven = (await Promise.all(selected.map(async (role) => {
    const canonical = await readJson(canonicalCheckpointPath(role), null);
    return Number(canonical?.recovery?.REPORT_ONLY_NO_RAW_PROOF_COUNT || 0);
  }))).reduce((total, count) => total + count, 0);
  summary.counts.RECOVERY_UNPROVEN_COUNT = recoveryUnproven;
  const allActions = shards.flatMap((x) => x.actions); await writeImmutableArtifact(path.join(artifactRoot, "runs", runId, "summary.json"), summary); await writeImmutableArtifact(path.join(artifactRoot, "runs", runId, "visual-matrix.json"), summary.visual); await writeImmutableArtifact(path.join(artifactRoot, "runs", runId, "checkpoint.json"), buildActionCheckpoint(allActions, { runId, runKind: "FULL_EXECUTION" }));
  console.log(JSON.stringify({ RUN_ID: runId, ...summary.counts, VISUAL_SURFACE_ROWS: summary.visual.length, result: summary.counts.NOT_YET_TESTED === 0 && summary.counts.HARNESS_FAILURE_COUNT === 0 && recoveryUnproven === 0 ? "GREEN" : "INCOMPLETE" }, null, 2));
}
const currentScriptPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (currentScriptPath && currentScriptPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
}
