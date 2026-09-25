/*
 * Bounded selection profiles for the one canonical ROOM replay runtime.
 * This is intentionally not an arbitrary selection loader: only frozen
 * TRUE-OPEN54 and ROOT-HIT190 artifacts are accepted.
 */
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import {
  canonicalSerialize,
  DEFAULT_ROOT_HIT190_SOURCE_PATHS,
  loadRootHit190Inputs,
} from "./pre_18_room_root_hit190_lineage.mjs";
import {
  TRUE_OPEN54_FINAL_REPLAY_SELECTION_SHA256,
  TRUE_OPEN54_FINAL_REPLAY_TARGET_COUNT,
  validateRoomTrueOpen54FrozenSelection,
} from "./pre_18_room_true_open54_replay_contract.mjs";
import { deriveImplicitAriaRole } from "./pre_18_hybrid_surface_state_executor.mjs";

export const ROOM_CANONICAL_REPLAY_PROFILE_IDS = Object.freeze({
  TRUE_OPEN54: "ROOM_TRUE_OPEN54",
  ROOT_HIT190: "ROOM_ROOT_HIT190",
  ROOT_HIT190_REMAINING7_CANARY: "ROOM_ROOT_HIT190_REMAINING7_CANARY",
  ROOT_HIT190_REMAINING4_CANARY: "ROOM_ROOT_HIT190_REMAINING4_CANARY",
  ROOT_HIT190_FINAL_FINANCIAL_CANARY: "ROOM_ROOT_HIT190_FINAL_FINANCIAL_CANARY",
  OTHER423_BATCH01_SHARED_CORE_CANARY: "ROOM_OTHER423_BATCH01_SHARED_CORE_CANARY",
});

export const ROOT_HIT190_FINAL_REPLAY_TARGET_COUNT = 190;
export const ROOT_HIT190_FINAL_REPLAY_SELECTION_SHA256 = "c5ffe972061444ea94a132fd85d50cfb400d33b5a7dc4813bafaadb49a3b3648";
export const ROOT_HIT190_LINEAGE_SHA256 = "ed1754450aafdea243f7431b0d8962527cda6c8ecfc947e5e662e12ed30a7ee2";
export const ROOT_HIT190_REPLAY_SEMANTIC_MATCH_POLICY = "EXACT_ROLE_NAME_OWNER_AND_STRUCTURAL_CONTEXT";
export const ROOT_HIT190_NO_BROWSER_PHYSICAL_CLOSURE = "NOT_REACHED";
export const ROOT_HIT190_OTHER423_IMMUTABILITY_GUARD = "PRESERVED";
export const ROOT_HIT190_REMAINING7_CANARY_TARGET_COUNT = 7;
export const ROOT_HIT190_REMAINING7_CANARY_SELECTION_SHA256 = "e1dda31212628b8c1c658cec241e82a6c7f4c0fc5649787289907657ce2833be";
export const ROOT_HIT190_REMAINING4_CANARY_TARGET_COUNT = 4;
export const ROOT_HIT190_REMAINING4_CANARY_SELECTION_SHA256 = "383cec75c1c91701bb25c63f29016fd976c8ac2f15f68b7a5cfb8b53efa22763";
export const ROOT_HIT190_FINAL_FINANCIAL_CANARY_TARGET_COUNT = 1;
export const ROOT_HIT190_FINAL_FINANCIAL_STABLE_IDENTITY_SHA256 = "95ad8d938b72ba99c62fea7c45f64432ff450bf5074c83c3eb6e55b2fe6f324a";
export const ROOT_HIT190_FINAL_FINANCIAL_CANARY_SELECTION_SHA256 = "9b34962b50d35fc5f04f16efb170f93a28f1623393675747e116a2e36c04e717";
export const OTHER423_BATCH01_SHARED_CORE_TARGET_COUNT = 5;
export const OTHER423_BATCH01_SHARED_CORE_SELECTION_SHA256 = "3b424e4a65bca8a62c1251e41c37b02f244e46e73f416d3a6284a3bb91a18b98";
export const OTHER423_REPRESENTATIVE_PROFILE_DESIGN_SHA256 = "180cb0fca957648ddc361aa01bdbef1304cb9f9cde04169e948dec60566ff2be";
export const OTHER423_INVENTORY_SHA256 = "aa16e5b398245d16d79878ae0fcf4e9f0d997295a3c1244dfbfbb3f91aedbd31";
export const OTHER423_CLUSTER_ASSIGNMENT_SHA256 = "93a6ba948d6d5296d6b158448ad959d4705f1052932d4fdc1b109cc2030f8cdd";
export const OTHER423_REPRESENTATIVE_PLAN_SHA256 = "1acc5608b06f1df11293e411f49d0ff57dc1b294d8242c7dedd967c8ae2d7ed7";

const TRUE_OPEN54_LINEAGE_SHA256 = "f878c29dda02cbd4d3dbf69fd9df8315d384a0cca626321a4ce2ff4acf7200f6";
const ROOT_HIT190_RELATIVE_DIR = "backend/artifacts/browser-smoke/pre-18-room-root-hit190-lineage-readiness/runs/pre18-room-root-hit190-lineage-v1/root-hit190-lineage";
const ROOT_HIT190_REMAINING7_CANARY_RELATIVE_PATH = "backend/artifacts/browser-smoke/pre-18-room-root-hit190-remaining7-bounded-entrypoint/approved-selection-v1/remaining7-canary-selection.json";
const ROOT_HIT190_REMAINING4_CANARY_RELATIVE_PATH = "backend/artifacts/browser-smoke/pre-18-room-root-hit190-remaining4-bounded-entrypoint/approved-selection-v1/remaining4-canary-selection.json";
const ROOT_HIT190_FINAL_FINANCIAL_CANARY_RELATIVE_PATH = "backend/artifacts/browser-smoke/pre-18-room-root-hit190-final-financial-telemetry/approved-selection-v1/final-financial-canary-selection.json";
const OTHER423_BATCH01_SELECTION_RELATIVE_PATH = "backend/artifacts/browser-smoke/pre-18-room-other423-batch01-shared-core/approved-selection-v1/batch01-shared-core-selection.json";
const OTHER423_DESIGN_RELATIVE_PATH = "backend/artifacts/browser-smoke/pre-18-room-other423-representative-profile-design/representative-profile-design.json";
const OTHER423_INVENTORY_RELATIVE_PATH = "backend/artifacts/browser-smoke/pre-18-room-other423-root-clustering/other423-members.json";
const OTHER423_CLUSTERS_RELATIVE_PATH = "backend/artifacts/browser-smoke/pre-18-room-other423-root-clustering/other423-clusters.json";
const OTHER423_REPRESENTATIVE_PLAN_RELATIVE_PATH = "backend/artifacts/browser-smoke/pre-18-room-other423-root-clustering/other423-representative-plan.json";
const OTHER423_ROOM_CHECKPOINT_RELATIVE_PATH = "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion/canonical-resume-checkpoints/ROLE-ROOM/canonical-checkpoint.json";
const ROOT_HIT190_REMAINING7_SOURCE_RESULTS_RELATIVE_PATH = "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion/runs/pre18-room-root-hit190-real-20260914-1938-01/room-root-hit190-canonical-replay/results.json";
const ROOT_HIT190_REMAINING7_SOURCE_RUN_ID = "pre18-room-root-hit190-real-20260914-1938-01";
const ROOT_HIT190_REMAINING7_SCHEMA_VERSION = "PRE18-ROOM-ROOT-HIT190-REMAINING7-CANARY-V1";
const ROOT_HIT190_REMAINING4_SCHEMA_VERSION = "PRE18-ROOM-ROOT-HIT190-REMAINING4-CANARY-V1";
const ROOT_HIT190_FINAL_FINANCIAL_SCHEMA_VERSION = "PRE18-ROOM-ROOT-HIT190-FINAL-FINANCIAL-CANARY-V1";
const OTHER423_BATCH01_SCHEMA_VERSION = "PRE18-ROOM-OTHER423-BATCH01-SHARED-CORE-CANARY-V1";
const OTHER423_BATCH01_ID = "OTHER423-BATCH-01-SHARED-CORE";
const OTHER423_BATCH01_INTENT = "PROVEN_SHARED_CORRECTIVE_VALIDATION";
const OTHER423_CLUSTER_ARTIFACT_CANONICAL_SHA256 = "617087892b464e2c5cca611fc60dfb67f256f0293acd902a854604e62a06c884";
const TRUE_OPEN54_RELATIVE_DIR = "backend/artifacts/browser-smoke/pre-18-room-true-open72-selection-reconciliation/runs/pre18-room-true-open72-lineage-run2-v1/room-true-open72-selection-lineage";
const TRUE_OPEN54_PREHIT246_RESULTS = "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion/runs/pre18-room-prehit-246-20260912-luna-local-final/room-prehit-246-migration/results.json";

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const normalizePath = (value) => String(value).replaceAll("\\", "/");
const sourceId = (row = {}) => row.ACTION_CONTRACT_ID ?? row.HISTORICAL_ACTION_CONTRACT_ID ?? row.CONTRACT_ID ?? row.STABLE_CONTRACT_IDENTITY ?? null;

async function readJson(file, label) {
  let raw;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch (error) {
    throw new Error(`${label}_FILE_UNAVAILABLE:${error.code || error.message}`);
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`${label}_JSON_INVALID:${error.message}`);
  }
}

async function readJsonWithDigest(file, label) {
  let raw;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch (error) {
    throw new Error(`${label}_FILE_UNAVAILABLE:${error.code || error.message}`);
  }
  try {
    return { value: JSON.parse(raw), sha256: sha256(raw) };
  } catch (error) {
    throw new Error(`${label}_JSON_INVALID:${error.message}`);
  }
}

function parseStableIdentity(value, label) {
  try {
    const parsed = JSON.parse(String(value));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("object required");
    if (parsed.role !== "ROOM" || !parsed.route || !parsed.surfaceId || !parsed.viewport || !parsed.actionRole || !parsed.actionName) {
      throw new Error("semantic fields required");
    }
    return parsed;
  } catch (error) {
    throw new Error(`${label}_STABLE_IDENTITY_INVALID:${error.message}`);
  }
}

function materialState(identity) {
  try {
    const parsed = JSON.parse(identity.materialState || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

const FINANCIAL_DISCLOSURE_SUMMARY = "Karşılaştırma, senaryo ve dışa aktarım";
const ADVANCED_FINANCIAL_INPUT_CONTRACT_DIGEST = "95ad8d938b72ba99c62fea7c45f64432ff450bf5074c83c3eb6e55b2fe6f324a";
const ROOT_HIT190_REMAINING10_CONTRACT_DIGESTS = new Set([
  "0b0bf39983b8693230ba87e856babae3ae5023c7bd9fafd5461123c1772debf1",
  "95ad8d938b72ba99c62fea7c45f64432ff450bf5074c83c3eb6e55b2fe6f324a",
  "725af9433fc90a753f53c63497accb7b5ab2fc16b6596eef88b50fb2c052b2d9",
  "3db84dcc1443a6c2881755326081cf5c593ce96554c474323e3581518807e1cc",
  "a49e373186856bbd77a155b75fb082b9756bb81c160c4197c57eca47497ab823",
  "1e2b52576e77336fb3ddf33e1b5037fb83ffa611757df4bf0054749a5aa055d1",
  "59caf5525089b4856dbc22b68256314d9a8023db287fdf88bad5f422031f6372",
  "28d55e597d090836fee83c1362fa7e251da823fee521e8adc2206d0ccc16968d",
  "821e8725ea6cf5ad7f760d61a4ce249a749286a66a123a69f8773c5c1b081a3b",
  "e4d5153e2314e4aaeb5dcff6b0e73eb7c4b718ab1e021431009b1af820862b2a",
]);
const ROOT_HIT190_REPLAY_SEMANTIC_IDENTITY_BY_CONTRACT_DIGEST = Object.freeze({
  // These are frozen full-contract digests, never a DOM ordinal. Their
  // evidence-backed labels and local contexts come from the current product's
  // wrapping labels and stable existing structural ownership.
  "95ad8d938b72ba99c62fea7c45f64432ff450bf5074c83c3eb6e55b2fe6f324a": Object.freeze({
    accessibleName: "Senaryo için maliyet varsayımı (kuruş)",
    contextualOwner: Object.freeze({ type: "card", label: "Gelişmiş varsayımlar · Kendi gerçek değerlerimi kullan (isteğe bağlı)" }),
    structuralContext: Object.freeze({ formControl: "input", inputType: "number" }),
    requiredState: Object.freeze({ nativeDisclosureSummary: "Gelişmiş varsayımlar · Kendi gerçek değerlerimi kullan (isteğe bağlı)" }),
    primaryDisambiguator: "FROZEN_STABLE_IDENTITY_PLUS_EXACT_SEMANTIC_CONTEXT",
  }),
  "a49e373186856bbd77a155b75fb082b9756bb81c160c4197c57eca47497ab823": Object.freeze({
    accessibleName: "Yolcu sayısı (kişi)",
    contextualOwner: Object.freeze({ type: "card", label: "Mevcut / Senaryo A / Senaryo B" }),
    structuralContext: Object.freeze({ dataTestId: "scenario-b-input-passengerCount", inputType: "number" }),
    requiredState: Object.freeze({ nativeDisclosureSummary: "Mevcut / Senaryo A / Senaryo B" }),
    primaryDisambiguator: "FROZEN_STABLE_IDENTITY_PLUS_EXACT_SEMANTIC_CONTEXT",
  }),
  "821e8725ea6cf5ad7f760d61a4ce249a749286a66a123a69f8773c5c1b081a3b": Object.freeze({
    accessibleName: "Format",
    contextualOwner: Object.freeze({ type: "field", label: "Format" }),
    structuralContext: Object.freeze({ formControl: "select" }),
    primaryDisambiguator: "EXACT_ACCESSIBLE_NAME_AND_ROLE",
  }),
  "e4d5153e2314e4aaeb5dcff6b0e73eb7c4b718ab1e021431009b1af820862b2a": Object.freeze({
    accessibleName: "Teklif akışı notları Pazarlık ve teklif yorumları kısa kalsın",
    contextualOwner: Object.freeze({ type: "card", label: "Teklif akışı notları" }),
    structuralContext: Object.freeze({ nativeDisclosureSummary: "Teklif akışı notları" }),
    primaryDisambiguator: "EXACT_ROLE_NAME_AND_OWNER",
  }),
});

function replaySemanticIdentity(contractId) {
  const value = ROOT_HIT190_REPLAY_SEMANTIC_IDENTITY_BY_CONTRACT_DIGEST[sha256(contractId)];
  return value ? structuredClone(value) : null;
}

function stepSemanticKey(step = {}) {
  return JSON.stringify({
    type: step.type || "",
    route: step.route || "",
    summary: step.summary || "",
    tab: step.tab || "",
  });
}

function mergeTypedStateSteps(primary = [], secondary = []) {
  const merged = [];
  const seen = new Map();
  for (const step of [...primary, ...secondary]) {
    const key = stepSemanticKey(step);
    const previous = seen.get(key);
    if (previous) {
      if (JSON.stringify(previous) !== JSON.stringify(step)) {
        throw new Error(`FROZEN_AND_PREHIT_RECIPE_MERGE_CONFLICT:${step.type || "UNKNOWN"}`);
      }
      continue;
    }
    seen.set(key, step);
    merged.push({ ...step });
  }
  return merged;
}

function frozenSurfaceStateRecipe(identity, contractId, semanticIdentity = null) {
  if (!ROOT_HIT190_REMAINING10_CONTRACT_DIGESTS.has(sha256(contractId))) return { produce: [], assert: [] };
  const state = materialState(identity);
  const produce = [];
  const assert = [];
  const surfaceId = String(identity.surfaceId || "");
  if (identity.route === "/room/financial-operations" && surfaceId.includes("base-karşılaştırma-senaryo-ve-dışa-aktarım")) {
    const step = {
      type: "NATIVE_DISCLOSURE_OPEN",
      route: identity.route,
      summary: FINANCIAL_DISCLOSURE_SUMMARY,
      postcondition: "NATIVE_DETAILS_OPEN",
    };
    produce.push(step);
    assert.push({ ...step });
  }
  if (identity.route === "/room/commercial-flow" && state.activeTab === "Teklifler") {
    const step = {
      type: "ROOM_ACTIVE_TAB",
      route: identity.route,
      tab: "Teklifler",
      postcondition: "ARIA_SELECTED_TRUE",
    };
    produce.push(step);
    assert.push({ ...step });
  }
  if (semanticIdentity?.requiredState?.nativeDisclosureSummary) {
    const step = {
      type: "NATIVE_DISCLOSURE_OPEN",
      route: identity.route,
      summary: semanticIdentity.requiredState.nativeDisclosureSummary,
      postcondition: "NATIVE_DETAILS_OPEN",
    };
    produce.push(step);
    // This assertion answers only whether the already-required disclosure
    // rendered the expected input.  It is deliberately not part of produce
    // and cannot manufacture a semantic candidate or bypass resolution.
    const expectedControl = sha256(contractId) === ADVANCED_FINANCIAL_INPUT_CONTRACT_DIGEST
      ? {
        role: deriveImplicitAriaRole({ tag: "input", type: "number" }),
        controlTag: "input",
        inputType: "number",
        name: semanticIdentity.accessibleName,
      }
      : null;
    assert.push(expectedControl ? { ...step, expectedControl } : { ...step });
  }
  return { produce, assert };
}

function mergeRoomReplayStateRecipe(identity, prehitRecipe = null, contractId = "", semanticIdentity = null) {
  const prehit = prehitRecipe || derivedRoomStateRecipe(identity);
  const frozen = frozenSurfaceStateRecipe(identity, contractId, semanticIdentity);
  const produce = mergeTypedStateSteps(prehit.produce || [], frozen.produce);
  const asserted = mergeTypedStateSteps(prehit.assert || [], frozen.assert);
  return {
    produce,
    assert: asserted,
    source: "MERGED_PREHIT_AND_FROZEN_SURFACE_STATE",
    frozenSurfaceRequirements: frozen.produce.map((step) => step.type),
    resolutionGate: {
      requiredAssertTypes: frozen.assert.map((step) => step.type),
      semanticResolutionAllowedOnlyAfterAssert: true,
    },
  };
}

function normalizeRoomTabSemanticIdentity(value) {
  const captured = String(value || "").replace(/\s+/gu, " ").trim();
  // Legacy discovery read tab textContent, which joins PanelSegmentTabs' label
  // and its separate presentation badge without a delimiter.  A trailing
  // compact decimal is therefore never accepted as semantic tab text here;
  // the eventual exact ARIA-tab assertion remains the strict authority.
  const labelOnly = captured.replace(/(?<=\p{L})\d+$/u, "").trim() || captured;
  return labelOnly.toLocaleLowerCase("tr-TR");
}

function targetIsInsideRoomTaskWorkspace(identity = {}) {
  return identity.route === "/room"
    && /(?:^|\|)base-ayrıntılı-çalışma-alanını-göster$/iu.test(String(identity.surfaceId || ""));
}

// This is the sole typed ROOM state-recipe identity projection.  Root-HIT and
// OTHER423 both use it; the latter supplies legacy tab requirements while the
// former intentionally preserves its frozen no-tab recipe shape.
function typedRoomTargetStateSteps(identity, state = {}, { activeTab = null } = {}) {
  const produce = [
    { type: "AUTH_SESSION_READY" },
    { type: "ROUTE_CONTENT_READY", route: identity.route },
  ];
  if (state.systemNavigationDisclosure === "SİSTEM_OPEN") produce.push({ type: "NAV_GROUP_OPEN" });
  const workspaceRequired = state.detailsOpen === true || (Boolean(activeTab) && targetIsInsideRoomTaskWorkspace(identity));
  if (workspaceRequired) produce.push({ type: "ROOM_TASK_WORKSPACE_OPEN" });
  // A tab belongs to the target only when it is part of a concrete route panel
  // or the target workspace.  A /room shell/navigation action must never
  // inherit a selected tab from hidden ambient workspace DOM.
  const targetScopedTab = activeTab && (identity.route !== "/room" || targetIsInsideRoomTaskWorkspace(identity))
    ? normalizeRoomTabSemanticIdentity(activeTab)
    : null;
  if (targetScopedTab) produce.push({ type: "ROOM_ACTIVE_TAB", route: identity.route, tab: targetScopedTab, postcondition: "ARIA_SELECTED_TRUE" });
  return produce;
}

function derivedRoomStateRecipe(identity) {
  const state = materialState(identity);
  const produce = typedRoomTargetStateSteps(identity, state);
  if (identity.route === "/room/financial-operations") produce.push({ type: "FINANCIAL_OPERATIONS_CONTENT_SETTLED", route: identity.route });
  return {
    produce,
    assert: produce.map((step) => ({ ...step, postcondition: step.type === "AUTH_SESSION_READY" ? "SESSION_LOADING_ABSENT" : undefined })),
    source: "DERIVED_FROM_FROZEN_STABLE_MATERIAL_STATE",
  };
}

function sourceRowsForRootHit(repositoryRoot) {
  const inputs = loadRootHit190Inputs({
    repositoryRoot,
    sourcePaths: DEFAULT_ROOT_HIT190_SOURCE_PATHS,
  });
  const rows = [
    ...inputs.historicalSources.targetHitDiagnostics,
    ...inputs.historicalSources.prehit246Results,
    ...inputs.historicalSources.residual195Results,
    ...(inputs.canonicalRoomCheckpoint || []),
  ];
  const map = new Map();
  for (const row of rows) {
    const id = sourceId(row);
    if (id && !map.has(id)) map.set(id, row);
  }
  return map;
}

function rootHitContract(row, sourceRow) {
  const identity = parseStableIdentity(row.STABLE_CONTRACT_IDENTITY, "ROOT_HIT190");
  const semanticIdentity = replaySemanticIdentity(row.STABLE_CONTRACT_IDENTITY);
  const stateRecipe = mergeRoomReplayStateRecipe(identity, sourceRow?.STATE_RECIPE || null, row.STABLE_CONTRACT_IDENTITY, semanticIdentity);
  return {
    ...sourceRow,
    ...row,
    ACTION_CONTRACT_ID: row.STABLE_CONTRACT_IDENTITY,
    HISTORICAL_ACTION_CONTRACT_ID: row.STABLE_CONTRACT_IDENTITY,
    ACTION_CONTRACT_VERSION: identity.version,
    ROLE: identity.role,
    ROUTE: identity.route,
    VIEWPORT: identity.viewport,
    SURFACE_ID: identity.surfaceId,
    MATERIAL_STATE_SIGNATURE: identity.materialState,
    // The immutable historical identity retains its captured textbox role.
    // This replay projection uses the established native input type so current
    // semantic resolution and native disclosure assertions share ARIA truth.
    ACTION_ROLE: semanticIdentity?.structuralContext?.inputType
      ? deriveImplicitAriaRole({ tag: semanticIdentity.structuralContext.formControl || "input", type: semanticIdentity.structuralContext.inputType })
      : identity.actionRole,
    ACTION_NAME: identity.actionName,
    USER_MEANING: identity.userMeaning || identity.actionName,
    CONTEXTUAL_OWNER_TYPE: semanticIdentity?.contextualOwner?.type || identity.ownerType,
    CONTEXTUAL_OWNER_LABEL: semanticIdentity?.contextualOwner?.label || identity.ownerLabel,
    BOUNDED_OWNER_ORDINAL: semanticIdentity ? null : identity.ownerOrdinal ?? null,
    EXPECTED_EFFECT_CLASS: identity.expectedEffectClass,
    SAFETY_CLASS: identity.safetyClass,
    BUSINESS_TARGET_TYPE: row.BUSINESS_TARGET_TYPE || identity.ownerType,
    STABLE_TARGET_KEY: row.STABLE_TARGET_KEY,
    STATE_RECIPE: stateRecipe,
    REPLAY_SEMANTIC_IDENTITY: semanticIdentity,
    REMAINING10_STATE_RECONSTRUCTION_REQUIRED: ROOT_HIT190_REMAINING10_CONTRACT_DIGESTS.has(sha256(row.STABLE_CONTRACT_IDENTITY)),
    HISTORICAL_ROOT_FAMILY: "ROOT-HIT-01",
    PREHIT_ROOT: null,
    ROOT_ORIGINAL_CLEARED: false,
  };
}

export function validateRoomRootHit190FrozenSelection(payload, { lineage } = {}) {
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  const ids = rows.map((row) => String(row?.STABLE_CONTRACT_IDENTITY || "")).filter(Boolean);
  const uniqueIds = new Set(ids);
  const suppliedDigest = String(payload?.FINAL_ROOT_HIT_REPLAY_SELECTION_SHA256 || "");
  const computedDigest = sha256(canonicalSerialize(rows));
  const lineageRows = Array.isArray(lineage?.rows) ? lineage.rows : [];
  const lineageById = new Map(lineageRows.map((row) => [String(row?.STABLE_CONTRACT_IDENTITY || ""), row]));

  if (rows.length !== ROOT_HIT190_FINAL_REPLAY_TARGET_COUNT || uniqueIds.size !== ROOT_HIT190_FINAL_REPLAY_TARGET_COUNT) {
    throw new Error(`ROOT_HIT190_SELECTION_CARDINALITY_INVALID:rows=${rows.length}:unique=${uniqueIds.size}`);
  }
  if (lineageById.size !== ROOT_HIT190_FINAL_REPLAY_TARGET_COUNT) throw new Error("ROOT_HIT190_LINEAGE_CARDINALITY_INVALID");

  let nonmemberCount = 0;
  let unresolvedCount = 0;
  let exact36OverlapCount = 0;
  for (const row of rows) {
    const id = String(row?.STABLE_CONTRACT_IDENTITY || "");
    parseStableIdentity(id, "ROOT_HIT190");
    const lineageRow = lineageById.get(id);
    if (!lineageRow) {
      nonmemberCount += 1;
      continue;
    }
    if (row.HISTORICAL_ROOT !== "ROOT-HIT-01" || lineageRow.HISTORICAL_ROOT !== "ROOT-HIT-01") {
      throw new Error("ROOT_HIT190_SELECTION_ROOT_FAMILY_INVALID");
    }
    if (row.HISTORICAL_PHYSICAL_FAILURE_CLASS !== "NESTED_SCROLL_OFFSCREEN" || lineageRow.HISTORICAL_PHYSICAL_FAILURE_CLASS !== "NESTED_SCROLL_OFFSCREEN") {
      throw new Error("ROOT_HIT190_SELECTION_PHYSICAL_CLUSTER_INVALID");
    }
    if (row.FINAL_MEMBERSHIP_CLASS !== "REPLAY_REQUIRED_ROOT_HIT01" || lineageRow.FINAL_MEMBERSHIP_CLASS !== "REPLAY_REQUIRED_ROOT_HIT01") {
      unresolvedCount += 1;
    }
    if (lineageRow.EXACT36_OVERLAP === "YES") exact36OverlapCount += 1;
  }
  if (nonmemberCount !== 0) throw new Error(`ROOT_HIT190_SELECTION_NONMEMBER_COUNT:${nonmemberCount}`);
  if (unresolvedCount !== 0) throw new Error(`ROOT_HIT190_SELECTION_UNRESOLVED_IDENTITY_COUNT:${unresolvedCount}`);
  if (exact36OverlapCount !== 14) throw new Error(`ROOT_HIT190_EXACT36_OVERLAP_INVALID:${exact36OverlapCount}`);
  if (suppliedDigest !== ROOT_HIT190_FINAL_REPLAY_SELECTION_SHA256 || computedDigest !== ROOT_HIT190_FINAL_REPLAY_SELECTION_SHA256) {
    throw new Error("ROOT_HIT190_SELECTION_DIGEST_MISMATCH");
  }

  return {
    PROFILE_ID: ROOM_CANONICAL_REPLAY_PROFILE_IDS.ROOT_HIT190,
    HISTORICAL_ROOT_FAMILY: "ROOT-HIT-01",
    HISTORICAL_LINEAGE_COUNT: ROOT_HIT190_FINAL_REPLAY_TARGET_COUNT,
    FINAL_REPLAY_TARGET_COUNT: rows.length,
    FINAL_REPLAY_SELECTION_UNIQUE_COUNT: uniqueIds.size,
    FINAL_REPLAY_SELECTION_DUPLICATE_COUNT: rows.length - uniqueIds.size,
    SELECTION_SHA256: suppliedDigest,
    COMPUTED_SELECTION_SHA256: computedDigest,
    SELECTION_DIGEST_MATCH: "YES",
    ROOT_HIT_NONMEMBER_COUNT: nonmemberCount,
    ROOT_HIT_UNRESOLVED_IDENTITY_COUNT: unresolvedCount,
    ROOT_HIT_EXACT36_OVERLAP_PRESENT_COUNT: exact36OverlapCount,
    ROOT_HIT_PHYSICAL_CLUSTER: "NESTED_SCROLL_OFFSCREEN",
    ROOT_HIT_PHYSICAL_CLUSTER_MEMBER_COUNT: rows.length,
    OTHER423_MEMBERSHIP_MUTATED: "NO",
    contracts: rows,
  };
}

async function resolveRootHit190Profile(repositoryRoot) {
  const directory = path.join(repositoryRoot, ROOT_HIT190_RELATIVE_DIR);
  const selectionPath = path.join(directory, "final-root-hit-replay-selection.json");
  const lineagePath = path.join(directory, "root-hit190-lineage.json");
  const [rawSelection, lineage] = await Promise.all([
    readJson(selectionPath, "ROOT_HIT190_SELECTION"),
    readJson(lineagePath, "ROOT_HIT190_LINEAGE"),
  ]);
  if (lineage?.RUN1_LINEAGE_SHA256 !== ROOT_HIT190_LINEAGE_SHA256
    || lineage?.RUN2_LINEAGE_SHA256 !== ROOT_HIT190_LINEAGE_SHA256
    || lineage?.RUN1_FINAL_SELECTION_SHA256 !== ROOT_HIT190_FINAL_REPLAY_SELECTION_SHA256
    || lineage?.RUN2_FINAL_SELECTION_SHA256 !== ROOT_HIT190_FINAL_REPLAY_SELECTION_SHA256
    || Number(lineage?.summary?.HISTORICAL_ROOT_HIT01_COUNT) !== 190
    || Number(lineage?.summary?.ROOT_HIT190_OVERLAP_WITH_EXACT36_COUNT) !== 14
    || Number(lineage?.summary?.UNRESOLVED_MEMBERSHIP_COUNT) !== 0) {
    throw new Error("ROOT_HIT190_LINEAGE_MANIFEST_INVALID");
  }
  const validated = validateRoomRootHit190FrozenSelection(rawSelection, { lineage });
  const sourcesById = sourceRowsForRootHit(repositoryRoot);
  const normalizedSelectionPath = normalizePath(path.relative(repositoryRoot, selectionPath));
  const contracts = validated.contracts.map((row) => {
    const sourceRow = sourcesById.get(row.STABLE_CONTRACT_IDENTITY);
    if (!sourceRow) throw new Error(`ROOT_HIT190_HISTORICAL_SOURCE_NOT_FOUND:${row.STABLE_CONTRACT_IDENTITY}`);
    return { ...rootHitContract(row, sourceRow), SOURCE_SELECTION_PATH: normalizedSelectionPath };
  });
  return {
    ...validated,
    contracts,
    RAW_SELECTION: rawSelection,
    LINEAGE: lineage,
    SOURCE_SELECTION_PATH: normalizedSelectionPath,
    SOURCE_LINEAGE_PATH: normalizePath(path.relative(repositoryRoot, lineagePath)),
    ARTIFACT_SLUG: "room-root-hit190-canonical-replay",
    EXISTING_PASS_SEMANTICS_PRESERVED: "YES",
  };
}

function remaining7CanonicalRows(rows = []) {
  return rows
    .map((row) => ({ STABLE_CONTRACT_IDENTITY: String(row?.STABLE_CONTRACT_IDENTITY || "") }))
    .sort((left, right) => left.STABLE_CONTRACT_IDENTITY.localeCompare(right.STABLE_CONTRACT_IDENTITY));
}

function remaining7DigestPayload(payload = {}) {
  return {
    SCHEMA_VERSION: String(payload.SCHEMA_VERSION || ""),
    PROFILE_ID: String(payload.PROFILE_ID || ""),
    PARENT_PROFILE_ID: String(payload.PARENT_PROFILE_ID || ""),
    ROOT_HIT190_PARENT_SELECTION_SHA256: String(payload.ROOT_HIT190_PARENT_SELECTION_SHA256 || ""),
    SOURCE_ACCEPTANCE_RUN_ID: String(payload.SOURCE_ACCEPTANCE_RUN_ID || ""),
    SOURCE_RESULTS_PATH: normalizePath(payload.SOURCE_RESULTS_PATH || ""),
    SOURCE_RESULTS_SHA256: String(payload.SOURCE_RESULTS_SHA256 || ""),
    HISTORICAL_ROOT_FAMILY: String(payload.HISTORICAL_ROOT_FAMILY || ""),
    PREVIOUS_TERMINAL_CLASS: String(payload.PREVIOUS_TERMINAL_CLASS || ""),
    PREVIOUS_CLASSIFICATION: String(payload.PREVIOUS_CLASSIFICATION || ""),
    rows: remaining7CanonicalRows(payload.rows),
  };
}

function remaining4DigestPayload(payload = {}) {
  return {
    SCHEMA_VERSION: String(payload.SCHEMA_VERSION || ""),
    PROFILE_ID: String(payload.PROFILE_ID || ""),
    PARENT_PROFILE_ID: String(payload.PARENT_PROFILE_ID || ""),
    ROOT_HIT190_PARENT_SELECTION_SHA256: String(payload.ROOT_HIT190_PARENT_SELECTION_SHA256 || ""),
    REMAINING7_PARENT_SELECTION_SHA256: String(payload.REMAINING7_PARENT_SELECTION_SHA256 || ""),
    PARENT_SELECTION_PATH: normalizePath(payload.PARENT_SELECTION_PATH || ""),
    HISTORICAL_ROOT_FAMILY: String(payload.HISTORICAL_ROOT_FAMILY || ""),
    APPROVED_MEMBER_STABLE_IDENTITY_SHA256: [...(payload.APPROVED_MEMBER_STABLE_IDENTITY_SHA256 || [])].map(String).sort(),
    rows: remaining7CanonicalRows(payload.rows),
  };
}

function finalFinancialDigestPayload(payload = {}) {
  return {
    SCHEMA_VERSION: String(payload.SCHEMA_VERSION || ""),
    PROFILE_ID: String(payload.PROFILE_ID || ""),
    PARENT_PROFILE_ID: String(payload.PARENT_PROFILE_ID || ""),
    PARENT_SELECTION_SHA256: String(payload.PARENT_SELECTION_SHA256 || ""),
    PARENT_SELECTION_PATH: normalizePath(payload.PARENT_SELECTION_PATH || ""),
    STABLE_IDENTITY_SHA256: String(payload.STABLE_IDENTITY_SHA256 || ""),
  };
}

function priorTerminalClass(row = {}) {
  return String(row.TERMINAL_CLASS ?? row.terminalClass ?? "");
}

function priorClassification(row = {}) {
  return String(row.CLASSIFICATION ?? row.classification ?? "");
}

function priorStableIdentity(row = {}) {
  return String(row.ACTION_CONTRACT_ID ?? row.STABLE_CONTRACT_IDENTITY ?? "");
}

export function validateRoomRootHit190Remaining7CanarySelection(payload, {
  parentSelection,
  priorResults,
  priorResultsSha256,
} = {}) {
  if (!parentSelection || !Array.isArray(parentSelection.contracts)) throw new Error("REMAINING7_CANARY_PARENT_SELECTION_REQUIRED");
  const expectedMetadata = {
    SCHEMA_VERSION: ROOT_HIT190_REMAINING7_SCHEMA_VERSION,
    PROFILE_ID: ROOM_CANONICAL_REPLAY_PROFILE_IDS.ROOT_HIT190_REMAINING7_CANARY,
    PARENT_PROFILE_ID: ROOM_CANONICAL_REPLAY_PROFILE_IDS.ROOT_HIT190,
    ROOT_HIT190_PARENT_SELECTION_SHA256: ROOT_HIT190_FINAL_REPLAY_SELECTION_SHA256,
    SOURCE_ACCEPTANCE_RUN_ID: ROOT_HIT190_REMAINING7_SOURCE_RUN_ID,
    SOURCE_RESULTS_PATH: ROOT_HIT190_REMAINING7_SOURCE_RESULTS_RELATIVE_PATH,
    HISTORICAL_ROOT_FAMILY: "ROOT-HIT-01",
    PREVIOUS_TERMINAL_CLASS: "HARNESS_BLOCK",
    PREVIOUS_CLASSIFICATION: "HARNESS_DEFECT",
  };
  for (const [key, expected] of Object.entries(expectedMetadata)) {
    const actual = key === "SOURCE_RESULTS_PATH" ? normalizePath(payload?.[key] || "") : String(payload?.[key] || "");
    if (actual !== expected) throw new Error(`REMAINING7_CANARY_METADATA_INVALID:${key}`);
  }
  if (path.isAbsolute(String(payload?.SOURCE_RESULTS_PATH || ""))) throw new Error("REMAINING7_CANARY_ABSOLUTE_SOURCE_PATH_FORBIDDEN");
  if (String(payload?.SOURCE_RESULTS_SHA256 || "") !== String(priorResultsSha256 || "")) {
    throw new Error("REMAINING7_CANARY_SOURCE_RESULTS_DIGEST_MISMATCH");
  }

  const rows = remaining7CanonicalRows(payload?.rows);
  const ids = rows.map((row) => row.STABLE_CONTRACT_IDENTITY);
  const uniqueIds = new Set(ids);
  if (rows.length !== ROOT_HIT190_REMAINING7_CANARY_TARGET_COUNT) {
    throw new Error(`REMAINING7_CANARY_SELECTION_CARDINALITY_INVALID:rows=${rows.length}`);
  }
  if (uniqueIds.size !== ROOT_HIT190_REMAINING7_CANARY_TARGET_COUNT) {
    throw new Error(`REMAINING7_CANARY_SELECTION_DUPLICATE_IDENTITY_COUNT:${rows.length - uniqueIds.size}`);
  }
  for (const id of ids) parseStableIdentity(id, "REMAINING7_CANARY");

  const parentIds = new Set(parentSelection.contracts.map((row) => String(row?.ACTION_CONTRACT_ID || "")));
  const nonParentMembers = ids.filter((id) => !parentIds.has(id));
  const other423Members = nonParentMembers.filter((id) => /other423/iu.test(id));
  if (other423Members.length > 0) throw new Error(`REMAINING7_CANARY_OTHER423_MEMBER_INCLUDED:${other423Members.length}`);
  if (nonParentMembers.length > 0) throw new Error(`REMAINING7_CANARY_NON_ROOT_HIT190_MEMBER_COUNT:${nonParentMembers.length}`);

  const priorRows = Array.isArray(priorResults?.results) ? priorResults.results : [];
  const previousBlockedRows = priorRows.filter((row) => (
    priorTerminalClass(row) === expectedMetadata.PREVIOUS_TERMINAL_CLASS
    && priorClassification(row) === expectedMetadata.PREVIOUS_CLASSIFICATION
  ));
  const previousBlockedIds = new Set(previousBlockedRows.map(priorStableIdentity).filter(Boolean));
  if (previousBlockedRows.length !== ROOT_HIT190_REMAINING7_CANARY_TARGET_COUNT
    || previousBlockedIds.size !== ROOT_HIT190_REMAINING7_CANARY_TARGET_COUNT) {
    throw new Error(`REMAINING7_CANARY_PREVIOUS_BLOCKED7_CARDINALITY_INVALID:rows=${previousBlockedRows.length}:unique=${previousBlockedIds.size}`);
  }
  const previousPassIds = new Set(priorRows
    .filter((row) => priorTerminalClass(row) === "PASS")
    .map(priorStableIdentity)
    .filter(Boolean));
  const previousPassIncluded = ids.filter((id) => previousPassIds.has(id));
  const outsideBlocked = ids.filter((id) => !previousBlockedIds.has(id));
  const missingExpected = [...previousBlockedIds].filter((id) => !uniqueIds.has(id));
  if (previousPassIncluded.length > 0) throw new Error(`REMAINING7_CANARY_PREVIOUS_PASS_MEMBER_INCLUDED:${previousPassIncluded.length}`);
  if (outsideBlocked.length > 0) throw new Error(`REMAINING7_CANARY_SELECTION_OUTSIDE_PREVIOUS_BLOCKED7_COUNT:${outsideBlocked.length}`);
  if (missingExpected.length > 0) throw new Error(`REMAINING7_CANARY_SELECTION_MISSING_EXPECTED_MEMBER_COUNT:${missingExpected.length}`);

  const computedDigest = sha256(canonicalSerialize(remaining7DigestPayload(payload)));
  if (String(payload?.REMAINING7_CANARY_SELECTION_SHA256 || "") !== ROOT_HIT190_REMAINING7_CANARY_SELECTION_SHA256
    || computedDigest !== ROOT_HIT190_REMAINING7_CANARY_SELECTION_SHA256) {
    throw new Error("REMAINING7_CANARY_SELECTION_DIGEST_MISMATCH");
  }

  return {
    PROFILE_ID: ROOM_CANONICAL_REPLAY_PROFILE_IDS.ROOT_HIT190_REMAINING7_CANARY,
    HISTORICAL_ROOT_FAMILY: "ROOT-HIT-01",
    HISTORICAL_LINEAGE_COUNT: ROOT_HIT190_FINAL_REPLAY_TARGET_COUNT,
    FINAL_REPLAY_TARGET_COUNT: rows.length,
    FINAL_REPLAY_SELECTION_UNIQUE_COUNT: uniqueIds.size,
    FINAL_REPLAY_SELECTION_DUPLICATE_COUNT: rows.length - uniqueIds.size,
    SELECTION_SHA256: String(payload.REMAINING7_CANARY_SELECTION_SHA256),
    COMPUTED_SELECTION_SHA256: computedDigest,
    SELECTION_DIGEST_MATCH: "YES",
    CANARY_SELECTION_COUNT: rows.length,
    CANARY_SELECTION_UNIQUE_COUNT: uniqueIds.size,
    CANARY_SELECTION_DUPLICATE_COUNT: rows.length - uniqueIds.size,
    CANARY_SELECTION_NON_ROOT_HIT190_MEMBER_COUNT: nonParentMembers.length,
    CANARY_SELECTION_OUTSIDE_PREVIOUS_BLOCKED7_COUNT: outsideBlocked.length,
    CANARY_SELECTION_MISSING_EXPECTED_MEMBER_COUNT: missingExpected.length,
    PREVIOUS_BLOCKED7_EXPECTED_COUNT: ROOT_HIT190_REMAINING7_CANARY_TARGET_COUNT,
    PREVIOUS_BLOCKED7_PRESENT_COUNT: ids.filter((id) => previousBlockedIds.has(id)).length,
    PREVIOUS_BLOCKED7_WRONGLY_EXCLUDED_COUNT: missingExpected.length,
    PREVIOUS_PASS_MEMBER_INCLUDED_IN_CANARY_COUNT: previousPassIncluded.length,
    OTHER423_MEMBER_INCLUDED_IN_CANARY_COUNT: other423Members.length,
    ROOT_HIT190_PARENT_SELECTION_COUNT: parentSelection.FINAL_REPLAY_TARGET_COUNT,
    ROOT_HIT190_PARENT_SELECTION_SHA256: parentSelection.SELECTION_SHA256,
    CANARY_SELECTION_IS_DERIVED_VIEW: "YES",
    CANARY_SELECTION_REPLACES_PARENT: "NO",
    ROOT_HIT_NONMEMBER_COUNT: nonParentMembers.length,
    ROOT_HIT_UNRESOLVED_IDENTITY_COUNT: 0,
    ROOT_HIT_EXACT36_OVERLAP_PRESENT_COUNT: 0,
    ROOT_HIT_PHYSICAL_CLUSTER: "NESTED_SCROLL_OFFSCREEN",
    ROOT_HIT_PHYSICAL_CLUSTER_MEMBER_COUNT: rows.length,
    OTHER423_MEMBERSHIP_MUTATED: "NO",
    rows,
    PREVIOUS_BLOCKED7_IDS: previousBlockedIds,
  };
}

export function validateRoomRootHit190Remaining4CanarySelection(payload, {
  remaining7Selection,
  rootHitSelection,
  priorResults,
} = {}) {
  if (!remaining7Selection || !Array.isArray(remaining7Selection.contracts)) throw new Error("REMAINING4_CANARY_REMAINING7_PARENT_REQUIRED");
  if (!rootHitSelection || !Array.isArray(rootHitSelection.contracts)) throw new Error("REMAINING4_CANARY_ROOT_HIT190_PARENT_REQUIRED");
  const expectedMetadata = {
    SCHEMA_VERSION: ROOT_HIT190_REMAINING4_SCHEMA_VERSION,
    PROFILE_ID: ROOM_CANONICAL_REPLAY_PROFILE_IDS.ROOT_HIT190_REMAINING4_CANARY,
    PARENT_PROFILE_ID: ROOM_CANONICAL_REPLAY_PROFILE_IDS.ROOT_HIT190_REMAINING7_CANARY,
    ROOT_HIT190_PARENT_SELECTION_SHA256: ROOT_HIT190_FINAL_REPLAY_SELECTION_SHA256,
    REMAINING7_PARENT_SELECTION_SHA256: ROOT_HIT190_REMAINING7_CANARY_SELECTION_SHA256,
    PARENT_SELECTION_PATH: ROOT_HIT190_REMAINING7_CANARY_RELATIVE_PATH,
    HISTORICAL_ROOT_FAMILY: "ROOT-HIT-01",
  };
  for (const [key, expected] of Object.entries(expectedMetadata)) {
    const actual = key === "PARENT_SELECTION_PATH" ? normalizePath(payload?.[key] || "") : String(payload?.[key] || "");
    if (actual !== expected) throw new Error(`REMAINING4_CANARY_METADATA_INVALID:${key}`);
  }
  if (path.isAbsolute(String(payload?.PARENT_SELECTION_PATH || ""))) throw new Error("REMAINING4_CANARY_ABSOLUTE_PARENT_PATH_FORBIDDEN");

  const rows = remaining7CanonicalRows(payload?.rows);
  const ids = rows.map((row) => row.STABLE_CONTRACT_IDENTITY);
  const uniqueIds = new Set(ids);
  if (rows.length !== ROOT_HIT190_REMAINING4_CANARY_TARGET_COUNT) {
    throw new Error(`REMAINING4_CANARY_SELECTION_CARDINALITY_INVALID:rows=${rows.length}`);
  }
  if (uniqueIds.size !== ROOT_HIT190_REMAINING4_CANARY_TARGET_COUNT) {
    throw new Error(`REMAINING4_CANARY_SELECTION_DUPLICATE_IDENTITY_COUNT:${rows.length - uniqueIds.size}`);
  }
  for (const id of ids) parseStableIdentity(id, "REMAINING4_CANARY");

  const other423Members = ids.filter((id) => /other423/iu.test(id));
  if (other423Members.length > 0) throw new Error(`REMAINING4_CANARY_OTHER423_MEMBER_INCLUDED:${other423Members.length}`);
  const rootHitIds = new Set(rootHitSelection.contracts.map((row) => String(row?.ACTION_CONTRACT_ID || "")));
  const outsideRootHit = ids.filter((id) => !rootHitIds.has(id));
  if (outsideRootHit.length > 0) throw new Error(`REMAINING4_CANARY_OUTSIDE_ROOT_HIT190_COUNT:${outsideRootHit.length}`);
  const remaining7Ids = new Set(remaining7Selection.contracts.map((row) => String(row?.ACTION_CONTRACT_ID || "")));
  const outsideRemaining7 = ids.filter((id) => !remaining7Ids.has(id));
  if (outsideRemaining7.length > 0) throw new Error(`REMAINING4_CANARY_OUTSIDE_REMAINING7_COUNT:${outsideRemaining7.length}`);

  const approvedHashes = [...(payload?.APPROVED_MEMBER_STABLE_IDENTITY_SHA256 || [])].map(String).sort();
  const approvedHashSet = new Set(approvedHashes);
  if (approvedHashes.length !== ROOT_HIT190_REMAINING4_CANARY_TARGET_COUNT
    || approvedHashSet.size !== ROOT_HIT190_REMAINING4_CANARY_TARGET_COUNT
    || approvedHashes.some((value) => !/^[a-f0-9]{64}$/u.test(value))) {
    throw new Error("REMAINING4_CANARY_APPROVED_MEMBER_IDENTITY_INVALID");
  }
  const actualHashes = ids.map((id) => sha256(id));
  const missingExpected = approvedHashes.filter((hash) => !actualHashes.includes(hash));
  const unexpectedMembers = actualHashes.filter((hash) => !approvedHashSet.has(hash));
  if (missingExpected.length > 0) throw new Error(`REMAINING4_CANARY_MISSING_EXPECTED_MEMBER_COUNT:${missingExpected.length}`);
  if (unexpectedMembers.length > 0) throw new Error(`REMAINING4_CANARY_UNEXPECTED_MEMBER_COUNT:${unexpectedMembers.length}`);

  const priorRows = Array.isArray(priorResults?.results) ? priorResults.results : [];
  const previousPassIds = new Set(priorRows
    .filter((row) => priorTerminalClass(row) === "PASS")
    .map(priorStableIdentity)
    .filter(Boolean));
  const previousPassOnly = ids.filter((id) => previousPassIds.has(id));
  if (previousPassOnly.length > 0) throw new Error(`REMAINING4_CANARY_PREVIOUS_PASS_ONLY_MEMBER_INCLUDED:${previousPassOnly.length}`);

  const computedDigest = sha256(canonicalSerialize(remaining4DigestPayload(payload)));
  if (String(payload?.REMAINING4_CANARY_SELECTION_SHA256 || "") !== ROOT_HIT190_REMAINING4_CANARY_SELECTION_SHA256
    || computedDigest !== ROOT_HIT190_REMAINING4_CANARY_SELECTION_SHA256) {
    throw new Error("REMAINING4_CANARY_SELECTION_DIGEST_MISMATCH");
  }

  return {
    PROFILE_ID: ROOM_CANONICAL_REPLAY_PROFILE_IDS.ROOT_HIT190_REMAINING4_CANARY,
    HISTORICAL_ROOT_FAMILY: "ROOT-HIT-01",
    HISTORICAL_LINEAGE_COUNT: ROOT_HIT190_FINAL_REPLAY_TARGET_COUNT,
    FINAL_REPLAY_TARGET_COUNT: rows.length,
    FINAL_REPLAY_SELECTION_UNIQUE_COUNT: uniqueIds.size,
    FINAL_REPLAY_SELECTION_DUPLICATE_COUNT: rows.length - uniqueIds.size,
    SELECTION_SHA256: String(payload.REMAINING4_CANARY_SELECTION_SHA256),
    COMPUTED_SELECTION_SHA256: computedDigest,
    SELECTION_DIGEST_MATCH: "YES",
    REMAINING4_SELECTION_COUNT: rows.length,
    REMAINING4_SELECTION_UNIQUE_COUNT: uniqueIds.size,
    REMAINING4_SELECTION_DUPLICATE_COUNT: rows.length - uniqueIds.size,
    REMAINING4_SELECTION_OUTSIDE_REMAINING7_COUNT: outsideRemaining7.length,
    REMAINING4_SELECTION_OUTSIDE_ROOT_HIT190_COUNT: outsideRootHit.length,
    REMAINING4_SELECTION_MISSING_EXPECTED_MEMBER_COUNT: missingExpected.length,
    REMAINING4_PRESENT_COUNT: ids.filter((id) => remaining7Ids.has(id)).length,
    PREVIOUS_PASS_ONLY_MEMBER_INCLUDED_COUNT: previousPassOnly.length,
    OTHER423_MEMBER_INCLUDED_COUNT: other423Members.length,
    ROOT_HIT190_PARENT_SELECTION_COUNT: rootHitSelection.FINAL_REPLAY_TARGET_COUNT,
    ROOT_HIT190_PARENT_SELECTION_SHA256: rootHitSelection.SELECTION_SHA256,
    REMAINING7_PARENT_SELECTION_COUNT: remaining7Selection.FINAL_REPLAY_TARGET_COUNT,
    REMAINING7_PARENT_SELECTION_SHA256: remaining7Selection.SELECTION_SHA256,
    REMAINING4_SELECTION_IS_DERIVED_VIEW: "YES",
    REMAINING4_SELECTION_REPLACES_PARENT: "NO",
    ROOT_HIT_NONMEMBER_COUNT: outsideRootHit.length,
    ROOT_HIT_UNRESOLVED_IDENTITY_COUNT: 0,
    ROOT_HIT_EXACT36_OVERLAP_PRESENT_COUNT: 0,
    ROOT_HIT_PHYSICAL_CLUSTER: "NESTED_SCROLL_OFFSCREEN",
    ROOT_HIT_PHYSICAL_CLUSTER_MEMBER_COUNT: rows.length,
    OTHER423_MEMBERSHIP_MUTATED: "NO",
    rows,
  };
}

async function resolveRootHit190Remaining7CanaryProfile(repositoryRoot) {
  const parentSelection = await resolveRootHit190Profile(repositoryRoot);
  const selectionPath = path.join(repositoryRoot, ROOT_HIT190_REMAINING7_CANARY_RELATIVE_PATH);
  const resultsPath = path.join(repositoryRoot, ROOT_HIT190_REMAINING7_SOURCE_RESULTS_RELATIVE_PATH);
  const [payload, sourceResults] = await Promise.all([
    readJson(selectionPath, "REMAINING7_CANARY_SELECTION"),
    readJsonWithDigest(resultsPath, "REMAINING7_CANARY_SOURCE_RESULTS"),
  ]);
  const validated = validateRoomRootHit190Remaining7CanarySelection(payload, {
    parentSelection,
    priorResults: sourceResults.value,
    priorResultsSha256: sourceResults.sha256,
  });
  const parentById = new Map(parentSelection.contracts.map((row) => [String(row.ACTION_CONTRACT_ID), row]));
  const contracts = validated.rows.map(({ STABLE_CONTRACT_IDENTITY }) => {
    const parent = parentById.get(STABLE_CONTRACT_IDENTITY);
    if (!parent) throw new Error(`REMAINING7_CANARY_PARENT_CONTRACT_NOT_FOUND:${STABLE_CONTRACT_IDENTITY}`);
    return {
      ...parent,
      SOURCE_SELECTION_PATH: normalizePath(ROOT_HIT190_REMAINING7_CANARY_RELATIVE_PATH),
      PARENT_SELECTION_PATH: parentSelection.SOURCE_SELECTION_PATH,
      SOURCE_ACCEPTANCE_RUN_ID: ROOT_HIT190_REMAINING7_SOURCE_RUN_ID,
    };
  });
  return {
    ...validated,
    contracts,
    RAW_SELECTION: payload,
    PARENT_SELECTION: parentSelection,
    PRIOR_ACCEPTED_RESULTS: sourceResults.value,
    PRIOR_BLOCKED7_IDS: validated.PREVIOUS_BLOCKED7_IDS,
    SOURCE_SELECTION_PATH: normalizePath(ROOT_HIT190_REMAINING7_CANARY_RELATIVE_PATH),
    SOURCE_RESULTS_PATH: normalizePath(ROOT_HIT190_REMAINING7_SOURCE_RESULTS_RELATIVE_PATH),
    SOURCE_RESULTS_SHA256: sourceResults.sha256,
    SOURCE_LINEAGE_PATH: parentSelection.SOURCE_LINEAGE_PATH,
    ARTIFACT_SLUG: "room-root-hit190-remaining7-canonical-canary",
    EXACT36_SATISFIED_MEMBER_INCLUDED_COUNT: 0,
    NEW_DISCOVERY_COUNT: 0,
    SUBSTITUTED_CONTRACT_COUNT: 0,
    ADDED_CONTRACT_COUNT: 0,
    REMOVED_CONTRACT_COUNT: 0,
    EXISTING_PASS_SEMANTICS_PRESERVED: "YES",
  };
}

async function resolveRootHit190Remaining4CanaryProfile(repositoryRoot) {
  const remaining7Selection = await resolveRootHit190Remaining7CanaryProfile(repositoryRoot);
  const rootHitSelection = remaining7Selection.PARENT_SELECTION;
  const selectionPath = path.join(repositoryRoot, ROOT_HIT190_REMAINING4_CANARY_RELATIVE_PATH);
  const payload = await readJson(selectionPath, "REMAINING4_CANARY_SELECTION");
  const validated = validateRoomRootHit190Remaining4CanarySelection(payload, {
    remaining7Selection,
    rootHitSelection,
    priorResults: remaining7Selection.PRIOR_ACCEPTED_RESULTS,
  });
  const remaining7ById = new Map(remaining7Selection.contracts.map((row) => [String(row.ACTION_CONTRACT_ID), row]));
  const contracts = validated.rows.map(({ STABLE_CONTRACT_IDENTITY }) => {
    const parent = remaining7ById.get(STABLE_CONTRACT_IDENTITY);
    if (!parent) throw new Error(`REMAINING4_CANARY_REMAINING7_PARENT_CONTRACT_NOT_FOUND:${STABLE_CONTRACT_IDENTITY}`);
    return {
      ...parent,
      SOURCE_SELECTION_PATH: normalizePath(ROOT_HIT190_REMAINING4_CANARY_RELATIVE_PATH),
      PARENT_REMAINING7_SELECTION_PATH: remaining7Selection.SOURCE_SELECTION_PATH,
      SOURCE_ACCEPTANCE_RUN_ID: remaining7Selection.SOURCE_ACCEPTANCE_RUN_ID,
    };
  });
  return {
    ...validated,
    contracts,
    RAW_SELECTION: payload,
    PARENT_SELECTION: remaining7Selection,
    REMAINING7_PARENT_SELECTION: remaining7Selection,
    ROOT_HIT190_PARENT_SELECTION: rootHitSelection,
    SOURCE_SELECTION_PATH: normalizePath(ROOT_HIT190_REMAINING4_CANARY_RELATIVE_PATH),
    SOURCE_LINEAGE_PATH: rootHitSelection.SOURCE_LINEAGE_PATH,
    ARTIFACT_SLUG: "room-root-hit190-remaining4-canonical-canary",
    EXACT36_SATISFIED_MEMBER_INCLUDED_COUNT: 0,
    NEW_DISCOVERY_COUNT: 0,
    SUBSTITUTED_CONTRACT_COUNT: 0,
    ADDED_CONTRACT_COUNT: 0,
    REMOVED_CONTRACT_COUNT: 0,
    EXISTING_PASS_SEMANTICS_PRESERVED: "YES",
  };
}

export function validateRoomRootHit190FinalFinancialCanarySelection(payload, { remaining4Selection } = {}) {
  if (!remaining4Selection || !Array.isArray(remaining4Selection.contracts)) throw new Error("FINAL_FINANCIAL_CANARY_REMAINING4_PARENT_REQUIRED");
  const expectedMetadata = {
    SCHEMA_VERSION: ROOT_HIT190_FINAL_FINANCIAL_SCHEMA_VERSION,
    PROFILE_ID: ROOM_CANONICAL_REPLAY_PROFILE_IDS.ROOT_HIT190_FINAL_FINANCIAL_CANARY,
    PARENT_PROFILE_ID: ROOM_CANONICAL_REPLAY_PROFILE_IDS.ROOT_HIT190_REMAINING4_CANARY,
    PARENT_SELECTION_SHA256: ROOT_HIT190_REMAINING4_CANARY_SELECTION_SHA256,
    PARENT_SELECTION_PATH: ROOT_HIT190_REMAINING4_CANARY_RELATIVE_PATH,
    STABLE_IDENTITY_SHA256: ROOT_HIT190_FINAL_FINANCIAL_STABLE_IDENTITY_SHA256,
  };
  for (const [key, expected] of Object.entries(expectedMetadata)) {
    const actual = key === "PARENT_SELECTION_PATH" ? normalizePath(payload?.[key] || "") : String(payload?.[key] || "");
    if (actual !== expected) throw new Error(`FINAL_FINANCIAL_CANARY_METADATA_INVALID:${key}`);
  }
  if (path.isAbsolute(String(payload?.PARENT_SELECTION_PATH || ""))) throw new Error("FINAL_FINANCIAL_CANARY_ABSOLUTE_PARENT_PATH_FORBIDDEN");
  const parentByHash = new Map(remaining4Selection.contracts.map((row) => [sha256(String(row?.ACTION_CONTRACT_ID || "")), row]));
  const parent = parentByHash.get(ROOT_HIT190_FINAL_FINANCIAL_STABLE_IDENTITY_SHA256);
  if (!parent) throw new Error("FINAL_FINANCIAL_CANARY_MEMBER_NOT_IN_REMAINING4");
  const computedDigest = sha256(canonicalSerialize(finalFinancialDigestPayload(payload)));
  if (String(payload?.FINAL_FINANCIAL_CANARY_SELECTION_SHA256 || "") !== ROOT_HIT190_FINAL_FINANCIAL_CANARY_SELECTION_SHA256
    || computedDigest !== ROOT_HIT190_FINAL_FINANCIAL_CANARY_SELECTION_SHA256) {
    throw new Error("FINAL_FINANCIAL_CANARY_SELECTION_DIGEST_MISMATCH");
  }
  return {
    PROFILE_ID: ROOM_CANONICAL_REPLAY_PROFILE_IDS.ROOT_HIT190_FINAL_FINANCIAL_CANARY,
    HISTORICAL_ROOT_FAMILY: "ROOT-HIT-01",
    FINAL_REPLAY_TARGET_COUNT: ROOT_HIT190_FINAL_FINANCIAL_CANARY_TARGET_COUNT,
    FINAL_REPLAY_SELECTION_UNIQUE_COUNT: 1,
    FINAL_REPLAY_SELECTION_DUPLICATE_COUNT: 0,
    SELECTION_SHA256: String(payload.FINAL_FINANCIAL_CANARY_SELECTION_SHA256),
    COMPUTED_SELECTION_SHA256: computedDigest,
    SELECTION_DIGEST_MATCH: "YES",
    PARENT_SELECTION_SHA256: ROOT_HIT190_REMAINING4_CANARY_SELECTION_SHA256,
    STABLE_IDENTITY_SHA256: ROOT_HIT190_FINAL_FINANCIAL_STABLE_IDENTITY_SHA256,
    OUTSIDE_PARENT_COUNT: 0,
    rows: [{ STABLE_CONTRACT_IDENTITY: String(parent.ACTION_CONTRACT_ID) }],
  };
}

async function resolveRootHit190FinalFinancialCanaryProfile(repositoryRoot) {
  const remaining4Selection = await resolveRootHit190Remaining4CanaryProfile(repositoryRoot);
  const selectionPath = path.join(repositoryRoot, ROOT_HIT190_FINAL_FINANCIAL_CANARY_RELATIVE_PATH);
  const payload = await readJson(selectionPath, "FINAL_FINANCIAL_CANARY_SELECTION");
  const validated = validateRoomRootHit190FinalFinancialCanarySelection(payload, { remaining4Selection });
  const parent = remaining4Selection.contracts.find((row) => sha256(String(row?.ACTION_CONTRACT_ID || "")) === ROOT_HIT190_FINAL_FINANCIAL_STABLE_IDENTITY_SHA256);
  return {
    ...validated,
    contracts: [{
      ...parent,
      SOURCE_SELECTION_PATH: normalizePath(ROOT_HIT190_FINAL_FINANCIAL_CANARY_RELATIVE_PATH),
      PARENT_REMAINING4_SELECTION_PATH: remaining4Selection.SOURCE_SELECTION_PATH,
    }],
    RAW_SELECTION: payload,
    PARENT_SELECTION: remaining4Selection,
    ROOT_HIT190_SELECTION_SHA256: ROOT_HIT190_FINAL_REPLAY_SELECTION_SHA256,
    REMAINING7_SELECTION_SHA256: ROOT_HIT190_REMAINING7_CANARY_SELECTION_SHA256,
    SOURCE_SELECTION_PATH: normalizePath(ROOT_HIT190_FINAL_FINANCIAL_CANARY_RELATIVE_PATH),
    SOURCE_LINEAGE_PATH: remaining4Selection.SOURCE_LINEAGE_PATH,
    ARTIFACT_SLUG: "room-root-hit190-final-financial-canonical-canary",
    EXACT36_SATISFIED_MEMBER_INCLUDED_COUNT: 0,
    NEW_DISCOVERY_COUNT: 0,
    SUBSTITUTED_CONTRACT_COUNT: 0,
    ADDED_CONTRACT_COUNT: 0,
    REMOVED_CONTRACT_COUNT: 0,
    CANARY_SELECTION_IS_DERIVED_VIEW: "YES",
    CANARY_SELECTION_REPLACES_PARENT: "NO",
  };
}

function canonicalDigest(value) {
  return sha256(canonicalSerialize(value));
}

function designDigestPayload(design = {}) {
  return Object.fromEntries(Object.entries(design).filter(([key]) => key !== "representativeProfileDesignSha256"));
}

function other423StateRecipeStep(token, route) {
  const value = String(token || "");
  if (value === "AUTH_SESSION_READY") return { type: value };
  if (value === "ROUTE_CONTENT_READY") return { type: value, route };
  if (value === "FINANCIAL_OPERATIONS_CONTENT_SETTLED") return { type: value, route };
  if (value.startsWith("ROOM_ACTIVE_TAB:")) {
    return { type: "ROOM_ACTIVE_TAB", route, tab: normalizeRoomTabSemanticIdentity(value.slice("ROOM_ACTIVE_TAB:".length)), postcondition: "ARIA_SELECTED_TRUE" };
  }
  throw new Error(`OTHER423_BATCH01_STATE_RECIPE_REQUIREMENT_UNSUPPORTED:${value || "MISSING"}`);
}

function other423CurrentRoute(identity) {
  const state = materialState(identity);
  const isMapSurface = identity.route === "/room"
    && state.activeTab === "Harita"
    && (
      identity.ownerLabel === "Harita"
      || identity.actionName === "Plaka / sürücü / hizmet alan firma / kayıt no"
    );
  return isMapSurface ? "/room/map" : identity.route;
}

function other423FinancialProjection(identity) {
  if (identity.route !== "/room/financial-operations"
    || identity.actionName !== "Maliyet ve operasyon ayrıntıları") return null;
  const outerSummary = "Karşılaştırma, senaryo ve dışa aktarım";
  const advancedSummary = "Gelişmiş varsayımlar · Kendi gerçek değerlerimi kullan (isteğe bağlı)";
  return {
    action: {
      role: "button",
      name: advancedSummary,
      userMeaning: "Maliyet ve operasyon ayrıntılarına ulaş",
      expectedEffectClass: "DISCLOSURE_CHANGE",
      safetyClass: "SAFE",
    },
    owner: { type: "surface", label: "root", boundedOrdinal: null },
    semanticIdentity: {
      accessibleName: advancedSummary,
      contextualOwner: { type: "surface", label: "root" },
      structuralContext: { nativeDisclosureSummary: advancedSummary, requiredParentDisclosure: outerSummary },
      primaryDisambiguator: "EXACT_CURRENT_TWO_STEP_NATIVE_DISCLOSURE",
    },
    initialDisclosure: {
      summary: outerSummary,
      expectedControl: {
        role: "button",
        controlTag: "summary",
        name: advancedSummary,
      },
    },
    successorAssertion: {
      parentSummary: advancedSummary,
      expectedControl: {
        role: "button",
        controlTag: "summary",
        name: "Maliyet ve operasyon ayrıntıları",
      },
    },
  };
}

function other423MapSearchProjection(identity) {
  if (other423CurrentRoute(identity) !== "/room/map"
    || identity.actionName !== "Plaka / sürücü / hizmet alan firma / kayıt no") return null;
  return {
    summary: "Filtreler ve yenileme",
    semanticIdentity: {
      accessibleName: "Plaka / sürücü / hizmet alan firma / kayıt no",
      contextualOwner: { type: "nativeDisclosure", label: "Filtreler ve yenileme" },
      primaryDisambiguator: "EXACT_CURRENT_MAP_FILTER_DISCLOSURE",
    },
  };
}

function other423StateRecipe(member, identity) {
  const requirement = member?.currentStateRecipeRequirement;
  if (!requirement || !Array.isArray(requirement.produce) || !Array.isArray(requirement.assert)) {
    throw new Error("OTHER423_BATCH01_STATE_RECIPE_REQUIREMENT_MISSING");
  }
  const currentRoute = other423CurrentRoute(identity);
  const currentIdentity = currentRoute === identity.route ? identity : { ...identity, route: currentRoute };
  const mapSearchProjection = other423MapSearchProjection(identity);
  const financialProjection = other423FinancialProjection(identity);
  const requiredTabToken = requirement.produce.find((token) => String(token || "").startsWith("ROOM_ACTIVE_TAB:"))
    || requirement.assert.find((token) => String(token || "").startsWith("ROOM_ACTIVE_TAB:"));
  const requiredTab = requiredTabToken ? String(requiredTabToken).slice("ROOM_ACTIVE_TAB:".length) : null;
  const state = materialState(currentIdentity);
  const targetScoped = typedRoomTargetStateSteps(currentIdentity, state, { activeTab: requiredTab });
  const preserved = (tokens) => tokens
    .filter((token) => !String(token || "").startsWith("ROOM_ACTIVE_TAB:"))
    .map((token) => other423StateRecipeStep(token, currentRoute));
  const scopedTab = targetScoped.find((step) => step.type === "ROOM_ACTIVE_TAB");
  const workspace = targetScoped.find((step) => step.type === "ROOM_TASK_WORKSPACE_OPEN");
  const project = (tokens) => {
    const steps = preserved(tokens);
    if (workspace && !steps.some((step) => step.type === "ROOM_TASK_WORKSPACE_OPEN")) {
      const routeIndex = steps.findIndex((step) => step.type === "ROUTE_CONTENT_READY");
      steps.splice(routeIndex >= 0 ? routeIndex + 1 : steps.length, 0, workspace);
    }
    if (mapSearchProjection && !steps.some((step) => step.type === "NATIVE_DISCLOSURE_OPEN" && step.summary === mapSearchProjection.summary)) {
      const routeIndex = steps.findIndex((step) => step.type === "ROUTE_CONTENT_READY");
      steps.splice(routeIndex >= 0 ? routeIndex + 1 : steps.length, 0, {
        type: "NATIVE_DISCLOSURE_OPEN",
        summary: mapSearchProjection.summary,
        postcondition: "NATIVE_DETAILS_OPEN",
      });
    }
    if (financialProjection && !steps.some((step) => step.type === "NATIVE_DISCLOSURE_OPEN" && step.summary === financialProjection.initialDisclosure.summary)) {
      const routeIndex = steps.findIndex((step) => step.type === "ROUTE_CONTENT_READY");
      steps.splice(routeIndex >= 0 ? routeIndex + 1 : steps.length, 0, {
        type: "NATIVE_DISCLOSURE_OPEN",
        ...financialProjection.initialDisclosure,
        postcondition: "NATIVE_DETAILS_OPEN",
      });
    }
    if (scopedTab) steps.push(scopedTab);
    return steps;
  };
  return {
    produce: project(requirement.produce),
    assert: project(requirement.assert),
    source: "TARGET_SCOPED_OTHER423_STATE_RECIPE_PROJECTION",
    currentRoute,
    currentSemanticIdentity: mapSearchProjection?.semanticIdentity || null,
    originalRequirement: structuredClone(requirement),
  };
}

export function validateRoomOther423Batch01Selection(payload, {
  design,
  inventory,
  clusters,
  representativePlan,
  rootHitStableIdentities = [],
  trueOpen54StableIdentities = [],
} = {}) {
  const expectedMetadata = {
    SCHEMA_VERSION: OTHER423_BATCH01_SCHEMA_VERSION,
    PROFILE_ID: ROOM_CANONICAL_REPLAY_PROFILE_IDS.OTHER423_BATCH01_SHARED_CORE_CANARY,
    BATCH_ID: OTHER423_BATCH01_ID,
    PROFILE_INTENT: OTHER423_BATCH01_INTENT,
    PARENT_DESIGN_PATH: OTHER423_DESIGN_RELATIVE_PATH,
    PARENT_DESIGN_SHA256: OTHER423_REPRESENTATIVE_PROFILE_DESIGN_SHA256,
    OTHER423_INVENTORY_PATH: OTHER423_INVENTORY_RELATIVE_PATH,
    OTHER423_INVENTORY_SHA256,
    OTHER423_CLUSTER_ASSIGNMENT_PATH: OTHER423_CLUSTERS_RELATIVE_PATH,
    OTHER423_CLUSTER_ASSIGNMENT_SHA256,
    OTHER423_REPRESENTATIVE_PLAN_PATH: OTHER423_REPRESENTATIVE_PLAN_RELATIVE_PATH,
    OTHER423_REPRESENTATIVE_PLAN_SHA256,
  };
  for (const [key, expected] of Object.entries(expectedMetadata)) {
    const actual = key.endsWith("_PATH") ? normalizePath(payload?.[key] || "") : String(payload?.[key] || "");
    if (actual !== expected) throw new Error(`OTHER423_BATCH01_METADATA_INVALID:${key}`);
  }
  for (const key of Object.keys(expectedMetadata).filter((entry) => entry.endsWith("_PATH"))) {
    if (path.isAbsolute(String(payload?.[key] || ""))) throw new Error(`OTHER423_BATCH01_ABSOLUTE_SOURCE_PATH_FORBIDDEN:${key}`);
  }

  if (!design || canonicalDigest(designDigestPayload(design)) !== OTHER423_REPRESENTATIVE_PROFILE_DESIGN_SHA256
    || String(design.representativeProfileDesignSha256 || "") !== OTHER423_REPRESENTATIVE_PROFILE_DESIGN_SHA256) {
    throw new Error("OTHER423_BATCH01_DESIGN_DIGEST_MISMATCH");
  }
  if (!inventory || canonicalDigest(inventory) !== OTHER423_INVENTORY_SHA256) {
    throw new Error("OTHER423_BATCH01_INVENTORY_DIGEST_MISMATCH");
  }
  if (!clusters || canonicalDigest(clusters) !== OTHER423_CLUSTER_ARTIFACT_CANONICAL_SHA256
    || String(clusters.inventorySha256 || "") !== OTHER423_INVENTORY_SHA256) {
    throw new Error("OTHER423_BATCH01_CLUSTER_ASSIGNMENT_DIGEST_MISMATCH");
  }
  if (!representativePlan || canonicalDigest(representativePlan) !== OTHER423_REPRESENTATIVE_PLAN_SHA256
    || String(representativePlan.inventorySha256 || "") !== OTHER423_INVENTORY_SHA256
    || String(representativePlan.clusterAssignmentSha256 || "") !== OTHER423_CLUSTER_ASSIGNMENT_SHA256) {
    throw new Error("OTHER423_BATCH01_REPRESENTATIVE_PLAN_DIGEST_MISMATCH");
  }
  if (design?.sourceArtifacts?.memberInventory?.sha256 !== OTHER423_INVENTORY_SHA256
    || design?.sourceArtifacts?.clusterAssignment?.sha256 !== OTHER423_CLUSTER_ASSIGNMENT_SHA256
    || design?.sourceArtifacts?.representativePlan?.sha256 !== OTHER423_REPRESENTATIVE_PLAN_SHA256) {
    throw new Error("OTHER423_BATCH01_DESIGN_SOURCE_DIGEST_BINDING_MISMATCH");
  }

  const approvedBatches = (design.batches || []).filter((entry) => entry?.batchId === OTHER423_BATCH01_ID);
  if (approvedBatches.length !== 1) throw new Error(`OTHER423_BATCH01_DESIGN_BATCH_CARDINALITY_INVALID:${approvedBatches.length}`);
  const approvedBatch = approvedBatches[0];
  if (approvedBatch.intent !== OTHER423_BATCH01_INTENT || approvedBatch.representativeCount !== OTHER423_BATCH01_SHARED_CORE_TARGET_COUNT) {
    throw new Error("OTHER423_BATCH01_DESIGN_BATCH_METADATA_INVALID");
  }
  const approvedRepresentatives = Array.isArray(approvedBatch.representatives) ? approvedBatch.representatives : [];
  const approvedIds = approvedRepresentatives.map((entry) => String(entry?.representativeStableIdentity || ""));
  const approvedHashes = approvedRepresentatives.map((entry) => String(entry?.representativeStableIdentitySha256 || ""));
  const approvedClusterIds = approvedRepresentatives.map((entry) => String(entry?.clusterId || ""));
  if (approvedIds.length !== OTHER423_BATCH01_SHARED_CORE_TARGET_COUNT
    || new Set(approvedIds).size !== OTHER423_BATCH01_SHARED_CORE_TARGET_COUNT
    || new Set(approvedClusterIds).size !== OTHER423_BATCH01_SHARED_CORE_TARGET_COUNT) {
    throw new Error("OTHER423_BATCH01_APPROVED_DESIGN_CARDINALITY_INVALID");
  }

  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  const ids = rows.map((row) => String(row?.STABLE_CONTRACT_IDENTITY || ""));
  const uniqueIds = new Set(ids);
  if (rows.length !== OTHER423_BATCH01_SHARED_CORE_TARGET_COUNT || uniqueIds.size !== OTHER423_BATCH01_SHARED_CORE_TARGET_COUNT) {
    throw new Error(`OTHER423_BATCH01_SELECTION_CARDINALITY_OR_DUPLICATE_INVALID:rows=${rows.length}:unique=${uniqueIds.size}`);
  }
  if (canonicalSerialize(ids) !== canonicalSerialize(approvedIds)
    || canonicalSerialize(payload?.ORDERED_STABLE_IDENTITIES || []) !== canonicalSerialize(approvedIds)) {
    throw new Error("OTHER423_BATCH01_SELECTION_ORDER_OR_APPROVED_IDENTITY_MISMATCH");
  }
  if (canonicalSerialize(payload?.CLUSTER_IDS || []) !== canonicalSerialize(approvedClusterIds)) {
    throw new Error("OTHER423_BATCH01_CLUSTER_ID_ORDER_MISMATCH");
  }

  const inventoryById = new Map((inventory.members || []).map((member) => [String(member?.stableIdentity || ""), member]));
  const clustersById = new Map((clusters.clusters || []).map((cluster) => [String(cluster?.clusterId || ""), cluster]));
  const representativesById = new Map((representativePlan.representatives || []).map((entry) => [String(entry?.representativeStableIdentity || ""), entry]));
  let outsideOther423Count = 0;
  let unapprovedRepresentativeCount = 0;
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const id = ids[index];
    const expected = approvedRepresentatives[index];
    const member = inventoryById.get(id);
    const cluster = clustersById.get(String(row?.CLUSTER_ID || ""));
    const representative = representativesById.get(id);
    parseStableIdentity(id, "OTHER423_BATCH01");
    if (!member) {
      outsideOther423Count += 1;
      continue;
    }
    if (!expected || id !== expected.representativeStableIdentity
      || sha256(id) !== expected.representativeStableIdentitySha256
      || String(row?.STABLE_IDENTITY_SHA256 || "") !== expected.representativeStableIdentitySha256
      || String(row?.CLUSTER_ID || "") !== expected.clusterId
      || row?.PROFILE_INTENT !== OTHER423_BATCH01_INTENT
      || row?.PROVEN_CORRECTIVE_OVERLAP !== expected.provenCorrectiveOverlap
      || canonicalSerialize(row?.ROOT_SIGNATURE) !== canonicalSerialize(expected.rootSignature)
      || canonicalSerialize(row?.CONTRACT_METADATA) !== canonicalSerialize(member)
      || !representative
      || representative.clusterId !== expected.clusterId
      || representative.representativeStableIdentitySha256 !== expected.representativeStableIdentitySha256
      || !cluster
      || !cluster.memberStableIdentities.includes(id)
      || canonicalSerialize(cluster.rootSignature) !== canonicalSerialize(expected.rootSignature)) {
      unapprovedRepresentativeCount += 1;
    }
  }
  const missingApprovedRepresentativeCount = approvedIds.filter((id) => !uniqueIds.has(id)).length;
  if (outsideOther423Count !== 0) throw new Error(`OTHER423_BATCH01_OUTSIDE_OTHER423_COUNT:${outsideOther423Count}`);
  if (unapprovedRepresentativeCount !== 0) throw new Error(`OTHER423_BATCH01_UNAPPROVED_REPRESENTATIVE_COUNT:${unapprovedRepresentativeCount}`);
  if (missingApprovedRepresentativeCount !== 0) throw new Error(`OTHER423_BATCH01_MISSING_APPROVED_REPRESENTATIVE_COUNT:${missingApprovedRepresentativeCount}`);

  const rootHitIds = new Set(rootHitStableIdentities.map(String));
  const trueOpenIds = new Set(trueOpen54StableIdentities.map(String));
  const rootHitOverlapCount = ids.filter((id) => rootHitIds.has(id)).length;
  const trueOpen54OverlapCount = ids.filter((id) => trueOpenIds.has(id)).length;
  if (rootHitOverlapCount !== 0) throw new Error(`OTHER423_BATCH01_ROOT_HIT190_OVERLAP_COUNT:${rootHitOverlapCount}`);
  if (trueOpen54OverlapCount !== 0) throw new Error(`OTHER423_BATCH01_TRUE_OPEN54_OVERLAP_COUNT:${trueOpen54OverlapCount}`);

  const computedDigest = canonicalDigest(rows);
  if (String(payload?.BATCH01_SELECTION_SHA256 || "") !== OTHER423_BATCH01_SHARED_CORE_SELECTION_SHA256
    || String(payload?.SELECTION_SHA256 || "") !== OTHER423_BATCH01_SHARED_CORE_SELECTION_SHA256
    || computedDigest !== OTHER423_BATCH01_SHARED_CORE_SELECTION_SHA256) {
    throw new Error("OTHER423_BATCH01_SELECTION_DIGEST_MISMATCH");
  }
  const numericMetadata = {
    SELECTION_COUNT: rows.length,
    UNIQUE_COUNT: uniqueIds.size,
    DUPLICATE_COUNT: rows.length - uniqueIds.size,
    EXPECTED_CLUSTER_COUNT: approvedClusterIds.length,
    ROOT_HIT190_OVERLAP_COUNT: rootHitOverlapCount,
    TRUE_OPEN54_OVERLAP_COUNT: trueOpen54OverlapCount,
    OUTSIDE_OTHER423_COUNT: outsideOther423Count,
    UNAPPROVED_REPRESENTATIVE_COUNT: unapprovedRepresentativeCount,
    MISSING_APPROVED_REPRESENTATIVE_COUNT: missingApprovedRepresentativeCount,
  };
  for (const [key, expected] of Object.entries(numericMetadata)) {
    if (Number(payload?.[key]) !== expected) throw new Error(`OTHER423_BATCH01_ACCOUNTING_METADATA_INVALID:${key}`);
  }
  if (payload?.SELECTION_ORDER_MATCHES_APPROVED_DESIGN !== "YES") throw new Error("OTHER423_BATCH01_SELECTION_ORDER_PROOF_MISSING");

  return {
    PROFILE_ID: ROOM_CANONICAL_REPLAY_PROFILE_IDS.OTHER423_BATCH01_SHARED_CORE_CANARY,
    BATCH_ID: OTHER423_BATCH01_ID,
    PROFILE_INTENT: OTHER423_BATCH01_INTENT,
    HISTORICAL_ROOT_FAMILY: "OTHER423",
    HISTORICAL_LINEAGE_COUNT: 423,
    FINAL_REPLAY_TARGET_COUNT: rows.length,
    FINAL_REPLAY_SELECTION_UNIQUE_COUNT: uniqueIds.size,
    FINAL_REPLAY_SELECTION_DUPLICATE_COUNT: rows.length - uniqueIds.size,
    CLUSTER_COUNT: approvedClusterIds.length,
    CLUSTER_IDS: approvedClusterIds,
    OUTSIDE_OTHER423_COUNT: outsideOther423Count,
    ROOT_HIT190_OVERLAP_COUNT: rootHitOverlapCount,
    TRUE_OPEN54_OVERLAP_COUNT: trueOpen54OverlapCount,
    UNAPPROVED_REPRESENTATIVE_COUNT: unapprovedRepresentativeCount,
    MISSING_APPROVED_REPRESENTATIVE_COUNT: missingApprovedRepresentativeCount,
    SELECTION_ORDER_MATCHES_APPROVED_DESIGN: "YES",
    SOURCE_DIGEST_BINDING_COMPLETE: "YES",
    SOURCE_DIGEST_MISMATCH_COUNT: 0,
    DESIGN_DIGEST_MATCH: "YES",
    INVENTORY_DIGEST_MATCH: "YES",
    CLUSTER_ASSIGNMENT_DIGEST_MATCH: "YES",
    REPRESENTATIVE_PLAN_DIGEST_MATCH: "YES",
    SELECTION_SHA256: computedDigest,
    COMPUTED_SELECTION_SHA256: computedDigest,
    SELECTION_DIGEST_MATCH: "YES",
    rows,
  };
}

async function resolveRoomOther423Batch01Profile(repositoryRoot) {
  const selectionPath = path.join(repositoryRoot, OTHER423_BATCH01_SELECTION_RELATIVE_PATH);
  const designPath = path.join(repositoryRoot, OTHER423_DESIGN_RELATIVE_PATH);
  const inventoryPath = path.join(repositoryRoot, OTHER423_INVENTORY_RELATIVE_PATH);
  const clustersPath = path.join(repositoryRoot, OTHER423_CLUSTERS_RELATIVE_PATH);
  const representativePlanPath = path.join(repositoryRoot, OTHER423_REPRESENTATIVE_PLAN_RELATIVE_PATH);
  const checkpointPath = path.join(repositoryRoot, OTHER423_ROOM_CHECKPOINT_RELATIVE_PATH);
  const [payload, design, inventory, clusters, representativePlan, rootHitSelection, trueOpen54Selection, checkpoint] = await Promise.all([
    readJson(selectionPath, "OTHER423_BATCH01_SELECTION"),
    readJson(designPath, "OTHER423_BATCH01_DESIGN"),
    readJson(inventoryPath, "OTHER423_BATCH01_INVENTORY"),
    readJson(clustersPath, "OTHER423_BATCH01_CLUSTERS"),
    readJson(representativePlanPath, "OTHER423_BATCH01_REPRESENTATIVE_PLAN"),
    resolveRootHit190Profile(repositoryRoot),
    resolveTrueOpen54Profile(repositoryRoot),
    readJson(checkpointPath, "OTHER423_BATCH01_ROOM_CHECKPOINT"),
  ]);
  const rootHitStableIdentities = rootHitSelection.contracts.map((row) => String(row.ACTION_CONTRACT_ID || ""));
  const trueOpen54StableIdentities = trueOpen54Selection.contracts.map((row) => String(row.ACTION_CONTRACT_ID || ""));
  const validationSources = { design, inventory, clusters, representativePlan, rootHitStableIdentities, trueOpen54StableIdentities };
  const validated = validateRoomOther423Batch01Selection(payload, validationSources);
  const checkpointById = new Map((checkpoint.actions || []).map((row) => [String(row?.ACTION_CONTRACT_ID || ""), row]));
  const contracts = validated.rows.map((selectionRow) => {
    const member = selectionRow.CONTRACT_METADATA;
    const identity = parseStableIdentity(selectionRow.STABLE_CONTRACT_IDENTITY, "OTHER423_BATCH01");
    const sourceRow = checkpointById.get(selectionRow.STABLE_CONTRACT_IDENTITY);
    if (!sourceRow) throw new Error(`OTHER423_BATCH01_CANONICAL_CHECKPOINT_CONTRACT_NOT_FOUND:${selectionRow.STABLE_IDENTITY_SHA256}`);
    if (sourceRow.ROUTE !== member.route || sourceRow.VIEWPORT !== member.viewport || sourceRow.SURFACE_ID !== member.surface
      || sourceRow.ACTION_ROLE !== member.actionRole || sourceRow.ACTION_NAME !== member.actionName
      || sourceRow.CONTEXTUAL_OWNER_TYPE !== member.owner?.type || sourceRow.CONTEXTUAL_OWNER_LABEL !== member.owner?.label) {
      throw new Error(`OTHER423_BATCH01_CANONICAL_CHECKPOINT_METADATA_MISMATCH:${selectionRow.STABLE_IDENTITY_SHA256}`);
    }
    const financialProjection = other423FinancialProjection(identity);
    const stateRecipe = other423StateRecipe(member, identity);
    const mapSearchProjection = other423MapSearchProjection(identity);
    return {
      ...sourceRow,
      ACTION_CONTRACT_ID: selectionRow.STABLE_CONTRACT_IDENTITY,
      HISTORICAL_ACTION_CONTRACT_ID: selectionRow.STABLE_CONTRACT_IDENTITY,
      ACTION_CONTRACT_VERSION: identity.version,
      ROLE: identity.role,
      ROUTE: identity.route,
      VIEWPORT: identity.viewport,
      SURFACE_ID: identity.surfaceId,
      MATERIAL_STATE_SIGNATURE: identity.materialState,
      ACTION_ROLE: identity.actionRole,
      ACTION_NAME: identity.actionName,
      USER_MEANING: identity.userMeaning || identity.actionName,
      CONTEXTUAL_OWNER_TYPE: member.owner?.type || identity.ownerType,
      CONTEXTUAL_OWNER_LABEL: member.owner?.label || identity.ownerLabel,
      BOUNDED_OWNER_ORDINAL: member.owner?.boundedOrdinal ?? identity.ownerOrdinal ?? null,
      EXPECTED_EFFECT_CLASS: identity.expectedEffectClass,
      SAFETY_CLASS: identity.safetyClass,
      BUSINESS_TARGET_TYPE: member.businessTarget?.type || sourceRow.BUSINESS_TARGET_TYPE || identity.ownerType,
      STABLE_TARGET_KEY: member.businessTarget?.stableKey || member.businessTarget?.id || sourceRow.STABLE_TARGET_KEY,
      STATE_RECIPE: stateRecipe,
      STATE_RECIPE_REQUIREMENT: structuredClone(member.currentStateRecipeRequirement),
      CURRENT_ROUTE: stateRecipe.currentRoute,
      CURRENT_REPLAY_SEMANTIC_IDENTITY: financialProjection?.semanticIdentity || mapSearchProjection?.semanticIdentity || null,
      CURRENT_REPLAY_ACTION: financialProjection?.action || null,
      CURRENT_REPLAY_OWNER: financialProjection?.owner || null,
      CURRENT_SUCCESSOR_ASSERTION: financialProjection?.successorAssertion || null,
      HISTORICAL_ROOT_FAMILY: "OTHER423",
      OTHER423_HISTORICAL_BUCKET: member.historicalBucket,
      OTHER423_CLUSTER_ID: selectionRow.CLUSTER_ID,
      OTHER423_ROOT_SIGNATURE: structuredClone(selectionRow.ROOT_SIGNATURE),
      OTHER423_PROFILE_INTENT: selectionRow.PROFILE_INTENT,
      OTHER423_PROVEN_CORRECTIVE_OVERLAP: selectionRow.PROVEN_CORRECTIVE_OVERLAP,
      PREHIT_ROOT: null,
      ROOT_ORIGINAL_CLEARED: false,
      SOURCE_SELECTION_PATH: normalizePath(OTHER423_BATCH01_SELECTION_RELATIVE_PATH),
      SOURCE_DESIGN_PATH: normalizePath(OTHER423_DESIGN_RELATIVE_PATH),
    };
  });
  return {
    ...validated,
    contracts,
    RAW_SELECTION: payload,
    VALIDATION_SOURCES: validationSources,
    SOURCE_SELECTION_PATH: normalizePath(OTHER423_BATCH01_SELECTION_RELATIVE_PATH),
    SOURCE_DESIGN_PATH: normalizePath(OTHER423_DESIGN_RELATIVE_PATH),
    SOURCE_ROOM_CHECKPOINT_PATH: normalizePath(OTHER423_ROOM_CHECKPOINT_RELATIVE_PATH),
    ARTIFACT_SLUG: "room-other423-batch01-shared-core-canary",
    EXACT36_SATISFIED_MEMBER_INCLUDED_COUNT: 0,
    NEW_DISCOVERY_COUNT: 0,
    SUBSTITUTED_CONTRACT_COUNT: 0,
    ADDED_CONTRACT_COUNT: 0,
    REMOVED_CONTRACT_COUNT: 0,
    CANARY_SELECTION_IS_DERIVED_VIEW: "YES",
    CANARY_SELECTION_REPLACES_PARENT: "NO",
  };
}

async function resolveTrueOpen54Profile(repositoryRoot) {
  const directory = path.join(repositoryRoot, TRUE_OPEN54_RELATIVE_DIR);
  const selectionPath = path.join(directory, "final-replay-selection.json");
  const lineagePath = path.join(directory, "lineage-manifest.json");
  const prehitPath = path.join(repositoryRoot, TRUE_OPEN54_PREHIT246_RESULTS);
  const [payload, lineage, prehitPayload] = await Promise.all([
    readJson(selectionPath, "TRUE_OPEN54_SELECTION"),
    readJson(lineagePath, "TRUE_OPEN54_LINEAGE"),
    readJson(prehitPath, "TRUE_OPEN54_PREHIT"),
  ]);
  const selection = validateRoomTrueOpen54FrozenSelection(payload);
  if (lineage?.HISTORICAL72_RECONCILIATION_SHA256 !== TRUE_OPEN54_LINEAGE_SHA256
    || lineage?.FINAL_REPLAY_SELECTION_SHA256 !== TRUE_OPEN54_FINAL_REPLAY_SELECTION_SHA256
    || Number(lineage?.REPLAY_REQUIRED_COUNT) !== TRUE_OPEN54_FINAL_REPLAY_TARGET_COUNT
    || Number(lineage?.SATISFIED_BY_ACCEPTED_EXACT36_COUNT) !== 18
    || Number(lineage?.UNRESOLVED_MEMBERSHIP_COUNT) !== 0) {
    throw new Error("TRUE_OPEN54_LINEAGE_MANIFEST_INVALID");
  }
  const prehitRows = Array.isArray(prehitPayload?.results) ? prehitPayload.results : [];
  const prehitByIdentity = new Map(prehitRows.map((row) => [String(row?.ACTION_CONTRACT_ID || ""), row]));
  const normalizedSelectionPath = normalizePath(path.relative(repositoryRoot, selectionPath));
  const contracts = selection.contracts.map((contract) => {
    const prehit = prehitByIdentity.get(contract.ACTION_CONTRACT_ID);
    if (!prehit || prehit.PREHIT_ROOT !== "PREHIT-S1" || !prehit.STATE_RECIPE) {
      throw new Error(`TRUE_OPEN54_PREHIT_LINEAGE_NOT_FOUND:${contract.ACTION_CONTRACT_ID}`);
    }
    if (prehit.ROUTE !== contract.ROUTE || prehit.VIEWPORT !== contract.VIEWPORT || prehit.SURFACE_ID !== contract.SURFACE_ID) {
      throw new Error(`TRUE_OPEN54_PREHIT_LINEAGE_IDENTITY_MISMATCH:${contract.ACTION_CONTRACT_ID}`);
    }
    return {
      ...prehit,
      ...contract,
      HISTORICAL_ACTION_CONTRACT_ID: contract.ACTION_CONTRACT_ID,
      ACTION_CONTRACT_ID: contract.ACTION_CONTRACT_ID,
      HISTORICAL_ROOT_FAMILY: "PREHIT-S1",
      PREHIT_ROOT: "PREHIT-S1",
      ROOT_ORIGINAL_CLEARED: false,
      SOURCE_SELECTION_PATH: normalizedSelectionPath,
    };
  });
  return {
    ...selection,
    PROFILE_ID: ROOM_CANONICAL_REPLAY_PROFILE_IDS.TRUE_OPEN54,
    HISTORICAL_ROOT_FAMILY: "PREHIT-S1",
    contracts,
    RAW_SELECTION: payload,
    LINEAGE: lineage,
    HISTORICAL72_RECONCILIATION_SHA256: lineage.HISTORICAL72_RECONCILIATION_SHA256,
    EXACT36_SATISFIED_SELECTION_SHA256: lineage.EXACT36_SATISFIED_SELECTION_SHA256,
    SOURCE_SELECTION_PATH: normalizedSelectionPath,
    SOURCE_LINEAGE_PATH: normalizePath(path.relative(repositoryRoot, lineagePath)),
    ARTIFACT_SLUG: "room-true-open54-canonical-replay",
  };
}

export async function resolveRoomCanonicalReplaySelectionProfile({ profileId, repositoryRoot = process.cwd(), selectionPath } = {}) {
  if (selectionPath !== undefined) throw new Error("ARBITRARY_SELECTION_PATH_REJECTED");
  if (profileId === ROOM_CANONICAL_REPLAY_PROFILE_IDS.TRUE_OPEN54) return resolveTrueOpen54Profile(repositoryRoot);
  if (profileId === ROOM_CANONICAL_REPLAY_PROFILE_IDS.ROOT_HIT190) return resolveRootHit190Profile(repositoryRoot);
  if (profileId === ROOM_CANONICAL_REPLAY_PROFILE_IDS.ROOT_HIT190_REMAINING7_CANARY) return resolveRootHit190Remaining7CanaryProfile(repositoryRoot);
  if (profileId === ROOM_CANONICAL_REPLAY_PROFILE_IDS.ROOT_HIT190_REMAINING4_CANARY) return resolveRootHit190Remaining4CanaryProfile(repositoryRoot);
  if (profileId === ROOM_CANONICAL_REPLAY_PROFILE_IDS.ROOT_HIT190_FINAL_FINANCIAL_CANARY) return resolveRootHit190FinalFinancialCanaryProfile(repositoryRoot);
  if (profileId === ROOM_CANONICAL_REPLAY_PROFILE_IDS.OTHER423_BATCH01_SHARED_CORE_CANARY) return resolveRoomOther423Batch01Profile(repositoryRoot);
  throw new Error(`ROOM_CANONICAL_REPLAY_PROFILE_UNSUPPORTED:${profileId || "MISSING"}`);
}
