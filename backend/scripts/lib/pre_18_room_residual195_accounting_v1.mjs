/*
 * Versioned, harness-only accounting for ROOM residual-195.  Original
 * readiness-root facts and later execution outcomes are intentionally
 * separate dimensions so a locator or hit-test outcome cannot rewrite the
 * historical root predicate.
 */

import { classifyRoomRequestLimiterFamily } from "./pre_18_room_worker_pool.mjs";

export const ROOM_RESIDUAL195_RECORDER_SCHEMA_VERSION = "ROOM-RESIDUAL195-V1";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function boolean(value) {
  return value === true || value === "YES";
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizedRoot(value) {
  const root = String(value || "").toUpperCase();
  if (root === "PREHIT-S1" || root === "PREHIT-A1") return root;
  return "UNKNOWN";
}

export function deriveOriginalRootFacts({
  root,
  authReady = false,
  routeReady = false,
  prematureHistoricalStepReplay = false,
  financialContentSettled = false,
  semanticResolutionAfterSettlement = false,
  suspenseActiveDuringResolution = false,
} = {}) {
  const normalized = normalizedRoot(root);
  if (normalized === "PREHIT-S1") {
    const cleared = boolean(authReady) && boolean(routeReady) && !boolean(prematureHistoricalStepReplay);
    return Object.freeze({
      ROOT: normalized,
      AUTH_READY: boolean(authReady),
      ROUTE_READY: boolean(routeReady),
      PREMATURE_HISTORICAL_STEP_REPLAY: boolean(prematureHistoricalStepReplay),
      cleared,
      OPEN_REASON: cleared ? null : !boolean(authReady) ? "AUTH_NOT_READY" : !boolean(routeReady) ? "ROUTE_NOT_READY" : "PREMATURE_HISTORICAL_STEP_REPLAY",
    });
  }
  if (normalized === "PREHIT-A1") {
    const cleared = boolean(financialContentSettled) && boolean(semanticResolutionAfterSettlement) && !boolean(suspenseActiveDuringResolution);
    return Object.freeze({
      ROOT: normalized,
      FINANCIAL_CONTENT_SETTLED: boolean(financialContentSettled),
      SEMANTIC_RESOLUTION_AFTER_SETTLEMENT: boolean(semanticResolutionAfterSettlement),
      SUSPENSE_ACTIVE_DURING_RESOLUTION: boolean(suspenseActiveDuringResolution),
      cleared,
      OPEN_REASON: cleared ? null : !boolean(financialContentSettled) ? "FINANCIAL_CONTENT_NOT_SETTLED" : !boolean(semanticResolutionAfterSettlement) ? "SEMANTIC_RESOLUTION_BEFORE_SETTLEMENT" : "SUSPENSE_ACTIVE_DURING_RESOLUTION",
    });
  }
  return Object.freeze({ ROOT: normalized, cleared: false, OPEN_REASON: "ROOT_UNKNOWN" });
}

export function classifyDownstreamOutcome(result = {}) {
  const state = String(result?.executionState || result?.EXECUTION_STATE || "");
  const reason = String(result?.failureReason || result?.FAILURE_REASON || "");
  if (state === "PREHIT_CLOSED_DOWNSTREAM_HIT_TEST_PENDING") return "HIT_TEST_PENDING";
  if (/PREHIT_CANDIDATE_DERIVED_LOCATOR_NOT_FOUND/iu.test(reason)) return "CANDIDATE_LOCATOR_FAILURE";
  if (/PREHIT_CURRENT_SEMANTIC_ACTION_NOT_RESOLVED/iu.test(reason)) return "SEMANTIC_ACTION_FAILURE";
  if (/PREHIT_TARGET_NOT_ACTIONABLE:.*enabled=false/iu.test(reason)) return "EXPECTED_DISABLED";
  if (state === "PREHIT_STATE_RECONSTRUCTION_CLOSED") return "PREHIT_CLOSED";
  if (state === "HARNESS_FAILURE") return "OTHER_HARNESS_FAILURE";
  return "NOT_CLASSIFIED";
}

export function attachOriginalRootFacts(result = {}, facts = {}) {
  return {
    ...result,
    ORIGINAL_ROOT_FACTS: facts,
    DOWNSTREAM_OUTCOME: classifyDownstreamOutcome(result),
  };
}

function authoritativeWorkerAuthProof(worker = {}) {
  const auth = worker?.AUTH || worker?.auth || worker?.AUTH_CONTEXT || {};
  const status = number(auth?.authStatus ?? auth?.status ?? worker?.AUTH_VERIFY_STATUS);
  const role = String(auth?.authRole ?? auth?.role ?? worker?.AUTH_ROLE ?? "").toUpperCase();
  const tenant = boolean(auth?.tenantScopeProven ?? worker?.TENANT_SCOPE_PROVEN);
  const apiMe = number(worker?.API_ME_RESOURCE_COUNT ?? auth?.API_ME_RESOURCE_COUNT);
  return boolean(worker?.AUTH_OK ?? worker?.authOk ?? status === 200) && status === 200 && role === "ROOM" && tenant && apiMe >= 1;
}

function rootFactsFor(result = {}) {
  const existing = result?.ORIGINAL_ROOT_FACTS;
  if (existing && typeof existing === "object" && typeof existing.cleared === "boolean") return existing;
  return deriveOriginalRootFacts({ root: result?.PREHIT_ROOT });
}

export function aggregateResidual195Summary({
  schemaVersion = ROOM_RESIDUAL195_RECORDER_SCHEMA_VERSION,
  workerAuth = [],
  criticalResponses = [],
  results = [],
} = {}) {
  if (schemaVersion !== ROOM_RESIDUAL195_RECORDER_SCHEMA_VERSION) throw new Error(`RECORDER_SCHEMA_UNSUPPORTED:${schemaVersion}`);
  const rows = asArray(results);
  const s1 = rows.filter((item) => normalizedRoot(item?.PREHIT_ROOT) === "PREHIT-S1");
  const a1 = rows.filter((item) => normalizedRoot(item?.PREHIT_ROOT) === "PREHIT-A1");
  const rootRows = [...s1, ...a1];
  const responseFamilies = asArray(criticalResponses).filter((item) => number(item?.status) === 429).map((item) => classifyRoomRequestLimiterFamily({ method: item?.method || "GET", url: item?.url }));
  const downstream = rootRows.map((item) => classifyDownstreamOutcome(item));
  const missingTelemetry = s1.filter((item) => item?.ROUTE_READINESS_TELEMETRY == null && item?.ROUTE_MARKER_DEFINED === true).length;
  return {
    RECORDER_SCHEMA_VERSION: ROOM_RESIDUAL195_RECORDER_SCHEMA_VERSION,
    API_ME_AUTH_PROOF_COUNT: asArray(workerAuth).filter(authoritativeWorkerAuthProof).length,
    TENANT_SCOPE_PROOF_COUNT: asArray(workerAuth).filter(authoritativeWorkerAuthProof).length,
    AUTH_429_COUNT: responseFamilies.filter((family) => family === "AUTH_SPECIAL").length,
    GENERIC_READ_429_COUNT: responseFamilies.filter((family) => family === "GENERIC_READ").length,
    SPECIAL_LIMITER_429_COUNT: responseFamilies.filter((family) => family === "SPECIAL_READ").length,
    OTHER_429_COUNT: responseFamilies.filter((family) => !["AUTH_SPECIAL", "GENERIC_READ", "SPECIAL_READ"].includes(family)).length,
    ROUTE_READINESS_TELEMETRY_MISSING_COUNT: missingTelemetry,
    MISSING_TELEMETRY_AS_UNDEFINED_DESCRIPTOR_COUNT: 0,
    S1_TRUE_CLOSED: s1.filter((item) => rootFactsFor(item).cleared === true).length,
    S1_TRUE_OPEN: s1.filter((item) => rootFactsFor(item).cleared !== true).length,
    A1_TRUE_CLOSED: a1.filter((item) => rootFactsFor(item).cleared === true).length,
    A1_TRUE_OPEN: a1.filter((item) => rootFactsFor(item).cleared !== true).length,
    TRUE_ORIGINAL_ROOT_CLEARED_COUNT: rootRows.filter((item) => rootFactsFor(item).cleared === true).length,
    TRUE_ORIGINAL_ROOT_OPEN_COUNT: rootRows.filter((item) => rootFactsFor(item).cleared !== true).length,
    DOWNSTREAM_HIT_TEST_COUNT: downstream.filter((item) => item === "HIT_TEST_PENDING").length,
    OTHER_DOWNSTREAM_HARNESS_COUNT: downstream.filter((item) => ["CANDIDATE_LOCATOR_FAILURE", "SEMANTIC_ACTION_FAILURE", "EXPECTED_DISABLED", "OTHER_HARNESS_FAILURE"].includes(item)).length,
    A1_SUSPENSE_SETTLEMENT_FAILURE_COUNT: a1.filter((item) => rootFactsFor(item).SUSPENSE_ACTIVE_DURING_RESOLUTION === true).length,
    A1_SCOPE_CONTAMINATION_COUNT: 0,
  };
}
