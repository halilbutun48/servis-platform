/**
 * Versioned, harness-only migration for the three ROOM pre-hit readiness
 * roots.  This module deliberately does not decide interaction policy: it
 * prepares a current, positively-proven surface before the existing semantic
 * locator and physical hit-test stages run.
 */

export const ROOM_PREHIT_246_MIGRATION_VERSION = "ROOM-PREHIT-246-V1";

const SESSION_LOADING = /oturum\s+(?:bilgileri\s+)?doğrulanıyor|oturum\s+hazırlanıyor/iu;
const BLOCKING_LOADING = /(?:^|\s)yükleniyor(?:…|\.\.\.)?(?:\s|$)/iu;

function normalizedRoute(value) {
  return String(value || "").replace(/^#/, "").replace(/\/$/, "") || "/";
}

/*
 * Route readiness is evidence of the currently mounted product surface, not
 * a generic shell landmark.  Every registered ROOM route has a concrete
 * current-DOM descriptor.  A new ROOM route without one is explicitly
 * terminalized rather than silently falling back to a non-existent <main>.
 */
const ROOM_ROUTE_MARKER_REGISTRY = Object.freeze({
  "/room": {
    id: "ROOM_HOME",
    kind: "CSS",
    selector: "[data-role-task-home='ROOM']",
  },
  "/room/financial-operations": {
    id: "ROOM_FINANCIAL_OPERATIONS",
    kind: "CSS",
    selector: ".pre18-finance-surface.pre18-finance-room",
  },
  "/room/shifts": {
    id: "ROOM_SHIFTS_CURRENT_CONTENT",
    kind: "COMPOSITE",
    containerSelector: ".roomShiftsDensityScope",
    tabSurfaceSelector: ".roomShiftsDensityScope .roomShiftsTabCard [role='tablist']",
  },
  "/room/map": {
    id: "ROOM_MAP_CURRENT_CONTENT",
    kind: "MULTI_SIGNAL",
    requiredSelectors: ["[data-map-surface='primary']"],
    semanticEvidence: Object.freeze({
      kind: "ROLE",
      role: "heading",
      name: "Taşımacılık Firması • Canlı Takip",
      exact: true,
    }),
  },
  "/room/commercial-flow": {
    id: "ROOM_COMMERCIAL_FLOW",
    kind: "MULTI_SIGNAL",
    requiredSelectors: [".roomCommercialWorkspaceFull"],
    semanticEvidence: Object.freeze({
      kind: "ROLE",
      role: "heading",
      name: "Ticari Çalışma Alanı",
      exact: true,
    }),
  },
  "/room/offers": {
    id: "ROOM_OFFERS",
    kind: "MULTI_SIGNAL",
    requiredSelectors: [".wrap.wrap--fluid"],
    semanticEvidence: "Teklifler (Gelen Teklifler)",
  },
  "/room/agreements": {
    id: "ROOM_AGREEMENTS",
    kind: "MULTI_SIGNAL",
    requiredSelectors: [".roomCriticalFixScope"],
    semanticEvidence: "Taşımacılık Firması / Sözleşmeler",
  },
  "/room/operation-health": {
    id: "ROOM_OPERATION_HEALTH",
    kind: "MULTI_SIGNAL",
    requiredSelectors: [".card"],
    semanticEvidence: "Taşımacılık Firması Operasyon Paneli",
  },
});

export function listKnownRoomRouteMarkerDescriptors() {
  return Object.values(ROOM_ROUTE_MARKER_REGISTRY).map((descriptor) => ({ ...descriptor }));
}

export function countKnownRoomRouteGenericMainAuthorities() {
  return listKnownRoomRouteMarkerDescriptors().filter((descriptor) => descriptor.selector === "main" || descriptor.id === "GENERIC_MAIN").length;
}

export function resolveRoomRouteReadinessMarker(route) {
  const currentRoute = normalizedRoute(route);
  const marker = ROOM_ROUTE_MARKER_REGISTRY[currentRoute];
  if (marker) return { ...marker };
  return {
    id: currentRoute.startsWith("/room") ? "ROOM_ROUTE_MARKER_UNDEFINED" : "UNSUPPORTED_ROUTE",
    kind: "UNDEFINED",
    route: currentRoute,
  };
}

/*
 * Route descriptors may use either a legacy exact text signal or a typed,
 * accessibility-backed signal.  Typed signals prevent a navigation item and
 * a page heading that share visible copy from becoming a strict-locator
 * ambiguity.  Existing routes retain their text descriptors unchanged.
 */
export function normalizeRoomRouteSemanticEvidence(marker) {
  const evidence = marker?.semanticEvidence;
  if (typeof evidence === "string" && evidence.trim()) {
    return { kind: "TEXT", text: evidence.trim(), exact: true };
  }
  if (evidence && typeof evidence === "object" && String(evidence.kind || "").toUpperCase() === "ROLE") {
    return {
      kind: "ROLE",
      role: String(evidence.role || "").trim(),
      name: String(evidence.name || "").trim(),
      exact: evidence.exact !== false,
    };
  }
  return { kind: "NONE" };
}

export function evaluateRoomRouteSemanticEvidencePresence(evidence, {
  exactTextMatchCount = 0,
  visibleRoles = [],
} = {}) {
  if (evidence?.kind === "TEXT") return Number(exactTextMatchCount) === 1;
  if (evidence?.kind !== "ROLE") return false;
  const matches = (visibleRoles || []).filter((item) => (
    item?.visible === true
    && String(item?.role || "").toLowerCase() === String(evidence.role || "").toLowerCase()
    && (evidence.exact === false
      ? String(item?.name || "").includes(String(evidence.name || ""))
      : String(item?.name || "") === String(evidence.name || ""))
  ));
  return matches.length === 1;
}

export function evaluateRoomRouteMarkerPresence(marker, {
  genericMarkerPresent = false,
  roomShiftsContainerPresent = false,
  roomShiftsTabSurfacePresent = false,
  requiredSelectorsPresent = false,
  requiredSemanticEvidencePresent = false,
} = {}) {
  if (marker?.kind === "UNDEFINED") return false;
  if (marker?.id === "ROOM_SHIFTS_CURRENT_CONTENT") {
    return roomShiftsContainerPresent === true && roomShiftsTabSurfacePresent === true;
  }
  if (marker?.kind === "MULTI_SIGNAL") {
    return requiredSelectorsPresent === true && requiredSemanticEvidencePresent === true;
  }
  return genericMarkerPresent === true;
}

/*
 * A route descriptor may deliberately use a broad CSS class.  Playwright's
 * singular locator APIs reject such locators under strictness even when the
 * current product route is visibly correct.  Preserve cardinality as
 * telemetry and accept only an actually visible current-DOM match.
 */
export function evaluateRequiredSelectorObservation(matches = []) {
  const normalized = Array.isArray(matches) ? matches : [];
  const matchingCount = normalized.length;
  const visibleMatchingCount = normalized.filter((item) => item?.visible === true).length;
  return { matchingCount, visibleMatchingCount, satisfied: visibleMatchingCount >= 1 };
}

async function observeAnyVisibleLocator(locator) {
  const matches = await locator.evaluateAll((nodes) => nodes.map((node) => {
    const style = getComputedStyle(node);
    const box = node.getBoundingClientRect();
    return {
      visible: style.display !== "none"
        && style.visibility !== "hidden"
        && style.opacity !== "0"
        && box.width > 0
        && box.height > 0,
    };
  })).catch(() => []);
  return evaluateRequiredSelectorObservation(matches);
}

/*
 * Shared current-DOM observer used by both the residual runner and route
 * canaries. It never relaxes route equality, loading guards, or semantic
 * evidence; it only avoids treating multi-match CSS selectors as strict
 * single-node locators.
 */
export async function observeRoomRouteContentMarker(page, marker) {
  if (marker?.kind === "UNDEFINED") {
    return { present: false, markerDefined: false, selectorObservations: [] };
  }
  if (marker?.id === "ROOM_SHIFTS_CURRENT_CONTENT") {
    const [container, tabSurface] = await Promise.all([
      observeAnyVisibleLocator(page.locator(marker.containerSelector)),
      observeAnyVisibleLocator(page.locator(marker.tabSurfaceSelector)),
    ]);
    return {
      present: evaluateRoomRouteMarkerPresence(marker, { roomShiftsContainerPresent: container.satisfied, roomShiftsTabSurfacePresent: tabSurface.satisfied }),
      markerDefined: true,
      roomShiftsContainerPresent: container.satisfied,
      roomShiftsTabSurfacePresent: tabSurface.satisfied,
      selectorObservations: [container, tabSurface],
    };
  }
  if (marker?.kind === "MULTI_SIGNAL") {
    const selectorObservations = await Promise.all((marker.requiredSelectors || []).map((selector) => observeAnyVisibleLocator(page.locator(selector))));
    const requiredSelectorsPresent = selectorObservations.length > 0 && selectorObservations.every((item) => item.satisfied);
    const semanticEvidence = normalizeRoomRouteSemanticEvidence(marker);
    let requiredSemanticEvidencePresent = false;
    if (semanticEvidence.kind === "ROLE") {
      const locator = page.getByRole(semanticEvidence.role, { name: semanticEvidence.name, exact: semanticEvidence.exact });
      const observation = await observeAnyVisibleLocator(locator);
      requiredSemanticEvidencePresent = observation.matchingCount === 1 && observation.visibleMatchingCount === 1;
    } else if (semanticEvidence.kind === "TEXT") {
      const locator = page.getByText(semanticEvidence.text, { exact: semanticEvidence.exact });
      const observation = await observeAnyVisibleLocator(locator);
      requiredSemanticEvidencePresent = observation.matchingCount === 1 && observation.visibleMatchingCount === 1;
    }
    return {
      present: evaluateRoomRouteMarkerPresence(marker, { requiredSelectorsPresent, requiredSemanticEvidencePresent }),
      markerDefined: true,
      requiredSelectorsPresent,
      requiredSemanticEvidencePresent,
      selectorObservations,
    };
  }
  const generic = await observeAnyVisibleLocator(page.locator(marker.selector));
  return {
    present: evaluateRoomRouteMarkerPresence(marker, { genericMarkerPresent: generic.satisfied }),
    markerDefined: true,
    genericMarkerPresent: generic.satisfied,
    selectorObservations: [generic],
  };
}

export function auditRoomRouteMarkerAssignments(rows = []) {
  const counted = {
    TARGET_COUNT: Array.isArray(rows) ? rows.length : 0,
    COMMERCIAL_FLOW_EXPLICIT_MARKER_COUNT: 0,
    OFFERS_EXPLICIT_MARKER_COUNT: 0,
    AGREEMENTS_EXPLICIT_MARKER_COUNT: 0,
    GENERIC_MAIN_MAPPING_COUNT: 0,
    UNDEFINED_MARKER_COUNT: 0,
  };
  for (const row of rows || []) {
    const marker = resolveRoomRouteReadinessMarker(row?.ROUTE);
    if (marker.id === "ROOM_COMMERCIAL_FLOW") counted.COMMERCIAL_FLOW_EXPLICIT_MARKER_COUNT += 1;
    if (marker.id === "ROOM_OFFERS") counted.OFFERS_EXPLICIT_MARKER_COUNT += 1;
    if (marker.id === "ROOM_AGREEMENTS") counted.AGREEMENTS_EXPLICIT_MARKER_COUNT += 1;
    if (marker.id === "GENERIC_MAIN" || marker.selector === "main") counted.GENERIC_MAIN_MAPPING_COUNT += 1;
    if (marker.kind === "UNDEFINED") counted.UNDEFINED_MARKER_COUNT += 1;
  }
  return counted;
}

function diagnosticReason(record) {
  return String(record?.FAILURE_REASON || record?.failureReason || "");
}

function contractId(record) {
  return String(record?.CONTRACT_ID || record?.ACTION_CONTRACT_ID || record?.contractId || "");
}

function normalizedMaterialState(target) {
  const raw = target?.MATERIAL_STATE_SIGNATURE || target?.materialState || {};
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return raw && typeof raw === "object" ? raw : {};
}

function surfaceStepsFor(target, surfaces) {
  const expectedSurfaceId = String(target?.SURFACE_ID || target?.surfaceId || "");
  const targetRoute = normalizedRoute(target?.ROUTE);
  const targetRole = String(target?.ROLE || "");
  const targetViewport = String(target?.VIEWPORT || "");
  const surface = (surfaces || []).find((item) => (
    expectedSurfaceId
    && `${item?.role || ""}|${normalizedRoute(item?.route)}|${item?.viewport || ""}|${item?.state || ""}` === expectedSurfaceId
  )) || (surfaces || []).find((item) => (
    String(item?.role || "") === targetRole
    && normalizedRoute(item?.route) === targetRoute
    && String(item?.viewport || "") === targetViewport
  ));
  return Array.isArray(surface?.steps) ? surface.steps : [];
}

export function evaluatePositiveRouteReadiness({
  requestedRoute,
  observedRoute,
  shellMounted,
  routeContentMounted,
  routeMarkerPresent,
  routeMarkerDefined = true,
  bodyText,
} = {}) {
  const text = String(bodyText || "");
  if (SESSION_LOADING.test(text)) {
    return { ready: false, reason: "SESSION_LOADING_ACTIVE" };
  }
  if (normalizedRoute(requestedRoute) !== normalizedRoute(observedRoute)) {
    return { ready: false, reason: "ROUTE_SHELL_NOT_READY" };
  }
  if (!shellMounted) return { ready: false, reason: "ROUTE_SHELL_NOT_READY" };
  if (!routeMarkerDefined) return { ready: false, reason: "ROUTE_MARKER_UNDEFINED" };
  if (!routeContentMounted) return { ready: false, reason: "ROUTE_CONTENT_NOT_READY" };
  if (!routeMarkerPresent) return { ready: false, reason: "ROUTE_MARKER_NOT_READY" };
  if (BLOCKING_LOADING.test(text)) {
    return { ready: false, reason: "BLOCKING_LOADING_FALLBACK_ACTIVE" };
  }
  return { ready: true, reason: "READY" };
}

export function evaluateRoomTaskWorkspaceAssertion({
  detailsOpen,
  descendantCollectorPresent,
  descendantPlaywrightVisible,
} = {}) {
  if (!detailsOpen) return { ok: false, reason: "ROOM_TASK_WORKSPACE_NOT_OPEN" };
  if (!descendantCollectorPresent) return { ok: false, reason: "ROOM_TASK_WORKSPACE_DESCENDANT_NOT_COLLECTED" };
  if (!descendantPlaywrightVisible) return { ok: false, reason: "ROOM_TASK_WORKSPACE_DESCENDANT_NOT_VISIBLE" };
  return { ok: true, reason: "ROOM_TASK_WORKSPACE_OPEN_AND_VISIBLE" };
}

export function reconcileEmptyHistoricalStep({ route, step, materialState } = {}) {
  const emptySummary = String(step?.tag || "").toUpperCase() === "SUMMARY"
    && !String(step?.label || step?.name || "").trim();
  if (!emptySummary) return { status: "NOT_APPLICABLE", dropped: false, stateProducer: null };

  const systemNavigationDisclosure = materialState?.systemNavigationDisclosure;
  if (normalizedRoute(route) === "/room/financial-operations" && systemNavigationDisclosure === "SİSTEM_OPEN") {
    return {
      status: "CURRENT_STATE_SUCCESSOR",
      dropped: false,
      historicalStepRetainedAsEvidence: true,
      stateProducer: {
        type: "NAV_GROUP_OPEN",
        group: "SİSTEM",
        postcondition: "SİSTEM_OPEN",
      },
    };
  }
  return {
    status: "UNRESOLVED_EMPTY_HISTORICAL_STEP",
    dropped: false,
    historicalStepRetainedAsEvidence: true,
    stateProducer: null,
  };
}

export function partitionRoomPrehitDiagnostics(records = []) {
  const prehit = [];
  const preservedHitTest = [];
  const other = [];
  for (const record of records) {
    const reason = diagnosticReason(record);
    if (/SEMANTIC_STABILITY_NOT_PROVEN:.*TARGET_HIT_TEST/u.test(reason)) {
      preservedHitTest.push(record);
    } else if (/^(SURFACE_REPLAY_FAILED|CURRENT_SEMANTIC_TARGET_NOT_FOUND|CURRENT_SEMANTIC_ACTION_NOT_RESOLVED):/u.test(reason)) {
      prehit.push(record);
    } else {
      other.push(record);
    }
  }
  return { prehit, preservedHitTest, other };
}

export function assertRoomPrehitCheckpointIntegrity({ knownIds = [], replayIds = [] } = {}) {
  const known = new Set(knownIds.map(String));
  const replay = new Set(replayIds.map(String));
  let identityLossCount = 0;
  for (const id of known) if (!replay.has(id)) identityLossCount += 1;
  return { identityLossCount, preserved: identityLossCount === 0 };
}

function classifyPrehitRoot(reason) {
  if (reason.startsWith("SURFACE_REPLAY_FAILED:")) return "PREHIT-S1";
  if (reason.startsWith("CURRENT_SEMANTIC_TARGET_NOT_FOUND:")) return "PREHIT-L1";
  if (reason.startsWith("CURRENT_SEMANTIC_ACTION_NOT_RESOLVED:")) return "PREHIT-A1";
  return null;
}

function stateRecipeFor(target, root, historicalSteps) {
  const route = normalizedRoute(target.ROUTE);
  const materialState = normalizedMaterialState(target);
  const produce = [
    { type: "AUTH_SESSION_READY", action: "WAIT_FOR_POSITIVE_SESSION_ROUTE_READINESS", postcondition: "SESSION_LOADING_ABSENT" },
    { type: "ROUTE_CONTENT_READY", action: "WAIT_FOR_CURRENT_ROUTE_CONTENT", route, postcondition: "ROUTE_CONTENT_READY" },
  ];
  const assert = [
    { type: "AUTH_SESSION_READY", postcondition: "SESSION_LOADING_ABSENT" },
    { type: "ROUTE_CONTENT_READY", route, postcondition: "ROUTE_CONTENT_READY" },
  ];

  if (materialState.systemNavigationDisclosure === "SİSTEM_OPEN") {
    produce.push({ type: "NAV_GROUP_OPEN", group: "SİSTEM", postcondition: "SİSTEM_OPEN" });
    assert.push({ type: "NAV_GROUP_OPEN", group: "SİSTEM", postcondition: "SİSTEM_OPEN" });
  }
  if (root === "PREHIT-L1") {
    produce.push({ type: "ROOM_TASK_WORKSPACE_OPEN", summary: "Ayrıntılı çalışma alanını göster", postcondition: "HTML_DETAILS_OPEN" });
    assert.push({ type: "ROOM_TASK_WORKSPACE_OPEN", postcondition: "HTML_DETAILS_OPEN_AND_DESCENDANT_VISIBLE" });
  }
  if (root === "PREHIT-A1" || route === "/room/financial-operations") {
    produce.push({ type: "FINANCIAL_OPERATIONS_CONTENT_SETTLED", marker: ".pre18-finance-surface.pre18-finance-room", postcondition: "SUSPENSE_ABSENT_AND_FINANCIAL_SURFACE_PRESENT" });
    assert.push({ type: "FINANCIAL_OPERATIONS_CONTENT_SETTLED", postcondition: "SUSPENSE_ABSENT_AND_FINANCIAL_SURFACE_PRESENT" });
  }

  const reconciliations = historicalSteps
    .map((step) => reconcileEmptyHistoricalStep({ route, step, materialState }))
    .filter((item) => item.status !== "NOT_APPLICABLE");
  for (const reconciliation of reconciliations) {
    if (reconciliation.stateProducer && !produce.some((item) => item.type === reconciliation.stateProducer.type)) {
      produce.push(reconciliation.stateProducer);
      assert.push({ type: reconciliation.stateProducer.type, postcondition: reconciliation.stateProducer.postcondition });
    }
  }
  return { produce, assert, reconciliations };
}

export function buildRoomPrehit246Migration({ targets = [], diagnosticRecords = [], surfaces = [], allowPartial = false } = {}) {
  const diagnosticsById = new Map(diagnosticRecords.map((record) => [contractId(record), record]));
  const seen = new Set();
  const rows = [];
  let duplicateIdCount = 0;
  let missingIdCount = 0;
  for (const target of targets) {
    const id = contractId(target);
    if (seen.has(id)) { duplicateIdCount += 1; continue; }
    seen.add(id);
    const diagnostic = diagnosticsById.get(id);
    const root = classifyPrehitRoot(diagnosticReason(diagnostic));
    if (!root) { missingIdCount += 1; continue; }
    const historicalSteps = surfaceStepsFor(target, surfaces);
    const recipe = stateRecipeFor(target, root, historicalSteps);
    const materialState = normalizedMaterialState(target);
    const legacyPresentationSteps = historicalSteps.filter((step) => !(
      String(step?.tag || "").toUpperCase() === "SUMMARY"
      && !String(step?.label || step?.name || "").trim()
    ));
    rows.push({
      ...target,
      PREHIT_ROOT: root,
      MIGRATION_VERSION: ROOM_PREHIT_246_MIGRATION_VERSION,
      HISTORICAL_SETUP_POLICY: "MIGRATION_FIRST_CURRENT_STATE_THEN_BOUNDED_FALLBACK",
      STATE_RECIPE: { produce: recipe.produce, assert: recipe.assert },
      EMPTY_NAME_RECONCILIATIONS: recipe.reconciliations,
      LEGACY_PRESENTATION_STEPS: legacyPresentationSteps,
      HISTORICAL_PRESENTATION_STEPS_EVIDENCE: historicalSteps,
      MATERIAL_STATE: materialState,
    });
  }
  const counts = rows.reduce((acc, row) => ({ ...acc, [row.PREHIT_ROOT]: (acc[row.PREHIT_ROOT] || 0) + 1 }), {});
  const accounting = {
    PREHIT_S1: counts["PREHIT-S1"] || 0,
    PREHIT_L1: counts["PREHIT-L1"] || 0,
    PREHIT_A1: counts["PREHIT-A1"] || 0,
    TOTAL: rows.length,
    DUPLICATE_ID_COUNT: duplicateIdCount,
    MISSING_ID_COUNT: missingIdCount,
    BALANCED: duplicateIdCount === 0 && missingIdCount === 0
      && (allowPartial || (counts["PREHIT-S1"] === 219 && counts["PREHIT-L1"] === 12 && counts["PREHIT-A1"] === 15 && rows.length === 246)),
  };
  return { version: ROOM_PREHIT_246_MIGRATION_VERSION, rows, accounting };
}
