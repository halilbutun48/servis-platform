import crypto from "node:crypto";

import { canonicalSerialize } from "./pre_18_room_true_open72_selection_reconciliation.mjs";

export const TRUE_OPEN54_FINAL_REPLAY_TARGET_COUNT = 54;
export const TRUE_OPEN54_HISTORICAL_LINEAGE_COUNT = 72;
export const TRUE_OPEN54_FINAL_REPLAY_SELECTION_SHA256 = "0a3da6a35da5ad2540ccb65c79a0e481217f446db7cb815a4713d46f0b439abc";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function parseStableIdentity(value) {
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    return parsed;
  } catch (error) {
    throw new Error(`TRUE_OPEN54_STABLE_IDENTITY_INVALID:${error.message}`);
  }
}

function normalizedCount(value) {
  return Number(value ?? 0);
}

function rootFactsProven(facts = {}) {
  const prehit = facts?.ROOT === "PREHIT-S1"
    && facts?.AUTH_READY === true
    && facts?.ROUTE_READY === true
    && facts?.PREMATURE_HISTORICAL_STEP_REPLAY === false
    && facts?.cleared === true;
  const rootHit = facts?.ROOT === "ROOT-HIT-01"
    && facts?.HISTORICAL_MEMBERSHIP_PROVEN === true
    && facts?.HISTORICAL_PHYSICAL_FAILURE_CLASS === "NESTED_SCROLL_OFFSCREEN"
    && facts?.PREMATURE_HISTORICAL_STEP_REPLAY === false
    && facts?.cleared === true;
  return prehit || rootHit;
}

export function validateRoomTrueOpen54FrozenSelection(payload) {
  const rows = Array.isArray(payload?.ROWS) ? payload.ROWS : [];
  const ids = rows.map((row) => String(row?.STABLE_CONTRACT_IDENTITY || "")).filter(Boolean);
  const uniqueIds = new Set(ids);
  const suppliedDigest = String(payload?.FINAL_REPLAY_SELECTION_SHA256 || "");
  const computedDigest = sha256(canonicalSerialize(rows));
  const nonFrozenCounters = [
    normalizedCount(payload?.NEW_DISCOVERY_COUNT),
    normalizedCount(payload?.SUBSTITUTED_CONTRACT_COUNT),
    normalizedCount(payload?.ADDED_CONTRACT_COUNT),
    normalizedCount(payload?.REMOVED_CONTRACT_COUNT),
  ];

  if (rows.length !== TRUE_OPEN54_FINAL_REPLAY_TARGET_COUNT || uniqueIds.size !== TRUE_OPEN54_FINAL_REPLAY_TARGET_COUNT) {
    throw new Error(`TRUE_OPEN54_SELECTION_CARDINALITY_INVALID:rows=${rows.length}:unique=${uniqueIds.size}`);
  }
  if (nonFrozenCounters.some((count) => count !== 0)) {
    throw new Error("TRUE_OPEN54_SELECTION_NONFROZEN_MUTATION");
  }
  if (rows.some((row) => row?.FINAL_MEMBERSHIP_CLASS !== "REPLAY_REQUIRED")) {
    throw new Error("EXACT36_SATISFIED_MEMBER_INCLUDED");
  }
  if (suppliedDigest !== TRUE_OPEN54_FINAL_REPLAY_SELECTION_SHA256 || computedDigest !== TRUE_OPEN54_FINAL_REPLAY_SELECTION_SHA256) {
    throw new Error("TRUE_OPEN54_SELECTION_DIGEST_MISMATCH");
  }

  const contracts = rows.map((row) => {
    const identity = parseStableIdentity(row.STABLE_CONTRACT_IDENTITY);
    if (identity.role !== "ROOM" || !identity.route || !identity.surfaceId || !identity.viewport || !identity.actionRole || !identity.actionName) {
      throw new Error("TRUE_OPEN54_STABLE_IDENTITY_SEMANTICS_INVALID");
    }
    return {
      ...row,
      ACTION_CONTRACT_ID: row.STABLE_CONTRACT_IDENTITY,
      ACTION_CONTRACT_VERSION: identity.version,
      ROLE: identity.role,
      ROUTE: identity.route,
      VIEWPORT: identity.viewport,
      SURFACE_ID: identity.surfaceId,
      MATERIAL_STATE_SIGNATURE: identity.materialState,
      ACTION_ROLE: identity.actionRole,
      ACTION_NAME: identity.actionName,
      USER_MEANING: identity.userMeaning,
      CONTEXTUAL_OWNER_TYPE: identity.ownerType,
      CONTEXTUAL_OWNER_LABEL: identity.ownerLabel,
      BOUNDED_OWNER_ORDINAL: identity.ownerOrdinal ?? null,
      EXPECTED_EFFECT_CLASS: identity.expectedEffectClass,
      SAFETY_CLASS: identity.safetyClass,
      PREHIT_ROOT: "PREHIT-S1",
      TENANT_KEY: "ROOM_AUTH_SCOPE",
      ROOT_ORIGINAL_CLEARED: false,
    };
  });
  return {
    HISTORICAL_LINEAGE_COUNT: TRUE_OPEN54_HISTORICAL_LINEAGE_COUNT,
    FINAL_REPLAY_TARGET_COUNT: contracts.length,
    FINAL_REPLAY_SELECTION_UNIQUE_COUNT: uniqueIds.size,
    FINAL_REPLAY_SELECTION_DUPLICATE_COUNT: contracts.length - uniqueIds.size,
    SELECTION_SHA256: suppliedDigest,
    COMPUTED_SELECTION_SHA256: computedDigest,
    SELECTION_DIGEST_MATCH: "YES",
    NEW_DISCOVERY_COUNT: 0,
    SUBSTITUTED_CONTRACT_COUNT: 0,
    ADDED_CONTRACT_COUNT: 0,
    REMOVED_CONTRACT_COUNT: 0,
    EXACT36_SATISFIED_MEMBER_INCLUDED_COUNT: 0,
    contracts,
  };
}

export function evaluateRoomTrueOpen54ContractTerminal(input = {}) {
  const terminal = (TERMINAL_CLASS, REASON_CODE, {
    ACTION_ATTEMPT_REQUIRED = "NO",
    ACCIDENTAL_UNSAFE_EXECUTION = input.UNSAFE_MUTATION_EXECUTED === true ? "YES" : "NO",
  } = {}) => {
    const rootReady = rootFactsProven(input.ORIGINAL_ROOT_FACTS);
    const acceptedInteraction = ["PASS", "EXPECTED_DISABLED", "NOT_SAFE_TO_EXECUTE", "VALID_NON_EXECUTION"].includes(TERMINAL_CLASS);
    return {
      TERMINAL_CLASS,
      REASON_CODE,
      ACTION_ATTEMPT_REQUIRED,
      ACCIDENTAL_UNSAFE_EXECUTION,
      STRICT_MULTI_MATCH_FALSE_NEGATIVE: "NO",
      ORIGINAL_ROOT_PROVEN: rootReady ? "YES" : "NO",
      REPLAY_ROOT_CLOSURE: rootReady && acceptedInteraction ? "YES" : "NO",
      CONTRACT_TERMINALIZED: "YES",
    };
  };

  if (input.VIEWPORT_REPRESENTATION_MATCH !== true) {
    return terminal("HARNESS_BLOCK", "VIEWPORT_REPRESENTATION_MISMATCH");
  }
  if (input.ROUTE_PREPARED !== true || input.SURFACE_STATE_PREPARED !== true) {
    return terminal("HARNESS_BLOCK", "ROUTE_OR_SURFACE_STATE_NOT_PREPARED");
  }
  if (input.CANDIDATE_ENUMERATED_FROM_CURRENT_DOM !== true || input.LOCATOR_DERIVED_FROM_CURRENT_CANDIDATE !== true) {
    return terminal("HARNESS_BLOCK", "CURRENT_DOM_ENUMERATION_OR_STALE_LOCATOR_REJECTED");
  }
  if (input.SEMANTIC_ACTION_RESOLVED !== true || input.BUSINESS_TARGET_RESOLVED !== true || input.OVERLAY_CONTAINMENT_PROVEN !== true) {
    return terminal("HARNESS_BLOCK", "CURRENT_SEMANTIC_OR_OVERLAY_CONTAINMENT_NOT_PROVEN");
  }
  if (Number(input.CANDIDATE_COUNT || 0) > 1 && input.CURRENT_CANDIDATE_SELECTED !== true) {
    return terminal("HARNESS_BLOCK", "MULTI_MATCH_CURRENT_CANDIDATE_NOT_SELECTED");
  }
  if (input.UNSAFE_MUTATION_EXECUTED === true) {
    return terminal("PRODUCT_DEFECT", "UNSAFE_MUTATION_EXECUTED", { ACCIDENTAL_UNSAFE_EXECUTION: "YES" });
  }
  if (input.EXPECTED_DISABLED === true) {
    if (input.ACTION_DISPATCH_STARTED === true) return terminal("HARNESS_BLOCK", "EXPECTED_DISABLED_WAS_DISPATCHED");
    return terminal("EXPECTED_DISABLED", "EXPECTED_DISABLED_CURRENT_DOM", { ACTION_ATTEMPT_REQUIRED: "NO" });
  }
  if (input.SAFETY_CLASS === "UNSAFE") {
    return terminal("NOT_SAFE_TO_EXECUTE", "UNSAFE_BOUNDARY_PROVEN", { ACTION_ATTEMPT_REQUIRED: "NO" });
  }
  if (input.RAW_HARNESS_FAILURE === true) {
    if (input.ACTION_DISPATCH_STARTED === true && input.ACTION_DISPATCH_FAILED === true && input.ACTION_DISPATCH_SUCCEEDED !== true) {
      return terminal("HARNESS_BLOCK", "ACTION_DISPATCH_FAILED");
    }
    return terminal(
      "HARNESS_BLOCK",
      input.ACTION_DISPATCH_SUCCEEDED === true
        ? "RAW_HARNESS_FAILURE_AFTER_DISPATCH"
        : "RAW_HARNESS_FAILURE_BEFORE_DISPATCH",
    );
  }
  if (input.ACTIONABILITY_PROVEN !== true) {
    return terminal("HARNESS_BLOCK", "SAFE_TARGET_ACTIONABILITY_NOT_PROVEN");
  }
  if (input.ACTION_DISPATCH_STARTED !== true || input.ACTION_DISPATCH_SUCCEEDED !== true) {
    if (input.ACTION_DISPATCH_FAILED === true) return terminal("HARNESS_BLOCK", "ACTION_DISPATCH_FAILED");
    return terminal("HARNESS_BLOCK", "ACTION_DISPATCH_NOT_PROVEN");
  }
  if (input.POST_ACTION_OBSERVER_VALID !== true) {
    return terminal("HARNESS_BLOCK", "POST_ACTION_OBSERVER_NOT_VALID");
  }
  if (input.EXPECTED_EFFECT_OBSERVED !== true && input.EXPECTED_EFFECT_ABSENT !== true) {
    return terminal("HARNESS_BLOCK", "EXPECTED_EFFECT_OBSERVER_INCOMPLETE");
  }
  if (input.EXPECTED_EFFECT_ABSENT === true) {
    return terminal("PRODUCT_DEFECT", "EXPECTED_RENDERED_EFFECT_NOT_OBSERVED", { ACTION_ATTEMPT_REQUIRED: "YES" });
  }
  return terminal("PASS", "SAFE_ACTION_EXECUTED_AND_EFFECT_OBSERVED", { ACTION_ATTEMPT_REQUIRED: "YES" });
}
