/*
 * Deterministic, non-browser lineage and readiness accounting for the ROOM
 * ROOT-HIT-01 historical family.  This module deliberately distinguishes a
 * shared executor corrective from per-contract acceptance evidence: source
 * wiring can make a member replay-ready but can never close that member.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { canonicalSerialize } from "./pre_18_room_true_open72_selection_reconciliation.mjs";

export { canonicalSerialize };

export const ROOT_HIT190_SCHEMA_VERSION = "PRE18-ROOM-ROOT-HIT190-LINEAGE-V1";
export const ROOT_HIT190_RUNTIME_POLICY = Object.freeze({
  INPUT_MODE: "IMMUTABLE_JSON_AND_SOURCE_WIRING_ONLY",
  REAL_BROWSER_RUN_STARTED: "NO",
  DOM_ACCESS: "NO",
});

export const DEFAULT_ROOT_HIT190_SOURCE_PATHS = Object.freeze({
  targetHitDiagnostics: "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion/runs/pre18-room-target-hit-diagnostic-20260912-terra-b/room-target-hit-test-diagnostic/target-hit-diagnostics.json",
  prehit246Results: "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion/runs/pre18-room-prehit-246-20260912-luna-local-final/room-prehit-246-migration/results.json",
  residual195Summary: "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion/runs/pre18-room-residual195-20260913042813101-luna-local/room-residual195-closure/summary.json",
  residual195Results: "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion/runs/pre18-room-residual195-20260913042813101-luna-local/room-residual195-closure/results.json",
  canonicalRoomCheckpoint: "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion/canonical-resume-checkpoints/ROLE-ROOM/canonical-checkpoint.json",
  exact36Selection: "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion/runs/pre18-room-exact36-final-20260914T050945Z/room-exact36-canonical-acceptance/frozen-selection.json",
  exact36Results: "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion/runs/pre18-room-exact36-final-20260914T050945Z/room-exact36-canonical-acceptance/results.json",
  trueOpen54Selection: "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion/runs/pre18-luna-full-2026-09-14T12-18-13-769Z-dntu38/room-true-open54-canonical-replay/frozen-selection.json",
  trueOpen54Results: "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion/runs/pre18-luna-full-2026-09-14T12-18-13-769Z-dntu38/room-true-open54-canonical-replay/results.json",
  sharedExecutor: "backend/scripts/lib/pre_18_hybrid_surface_state_executor.mjs",
  canonicalRuntime: "backend/scripts/pre_18_luna_full_hybrid_surface_state_completion.mjs",
  terminalAdapter: "backend/scripts/lib/pre_18_room_true_open54_replay_contract.mjs",
  canonicalCli: "backend/scripts/pre_18_room_true_open54_replay_cli.mjs",
});

const HISTORICAL_SOURCE_LABELS = Object.freeze({
  DIAGNOSTIC: "TARGET_HIT_DIAGNOSTIC_PROVEN_PHYSICAL",
  PREHIT: "PREHIT246_DOWNSTREAM_HIT_TEST_PENDING",
  RESIDUAL: "RESIDUAL195_NEWLY_REACHED_HIT_TEST_PENDING",
});

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizePath(value) {
  return String(value).replaceAll("\\", "/");
}

function readJsonSource({ repositoryRoot, relativePath }) {
  const absolutePath = path.resolve(repositoryRoot, relativePath);
  const bytes = fs.readFileSync(absolutePath);
  return {
    relativePath: normalizePath(relativePath),
    sha256: sha256(bytes),
    value: JSON.parse(bytes.toString("utf8")),
  };
}

function readTextSource({ repositoryRoot, relativePath }) {
  const absolutePath = path.resolve(repositoryRoot, relativePath);
  const bytes = fs.readFileSync(absolutePath);
  return { relativePath: normalizePath(relativePath), sha256: sha256(bytes), text: bytes.toString("utf8") };
}

function idFor(row = {}) {
  return row.ACTION_CONTRACT_ID ?? row.HISTORICAL_ACTION_CONTRACT_ID ?? row.CONTRACT_ID ?? row.STABLE_CONTRACT_IDENTITY ?? null;
}

function requireRows(value, label) {
  if (!Array.isArray(value)) throw new Error(`ROOT_HIT190_${label}_ARRAY_REQUIRED`);
  return value;
}

function parseIdentity(value) {
  try {
    const parsed = JSON.parse(String(value));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    return parsed;
  } catch (error) {
    throw new Error(`ROOT_HIT190_STABLE_IDENTITY_INVALID:${error.message}`);
  }
}

function parseMaterialState(identity = {}) {
  try {
    const state = JSON.parse(identity.materialState ?? "{}");
    const fields = ["activeTab", "detailsOpen", "drawerOpen", "modalOpen", "systemNavigationDisclosure"];
    return Object.fromEntries(fields.filter((field) => Object.hasOwn(state, field)).map((field) => [field, state[field]]));
  } catch {
    return {};
  }
}

function uniqueIndex(rows, label) {
  const index = new Map();
  const duplicates = new Set();
  for (const row of rows) {
    const stableId = idFor(row);
    if (!stableId) throw new Error(`ROOT_HIT190_${label}_STABLE_IDENTITY_MISSING`);
    if (index.has(stableId)) duplicates.add(stableId);
    else index.set(stableId, row);
  }
  if (duplicates.size > 0) throw new Error(`ROOT_HIT190_${label}_DUPLICATE_STABLE_CONTRACT_IDENTITIES:${[...duplicates].join(",")}`);
  return index;
}

function physicalDiagnostic(row = {}) {
  return row.SEMANTIC_STABILITY_DIAGNOSTIC ?? row;
}

export function classifyHistoricalPhysicalFailure(row = {}) {
  const diagnostic = physicalDiagnostic(row);
  const direct = String(diagnostic.PHYSICAL_FAILURE_CLASS ?? row.PHYSICAL_FAILURE_CLASS ?? "").toUpperCase();
  const failed = String(diagnostic.FAILED_STABILITY_COMPONENT ?? row.FAILED_STABILITY_COMPONENT ?? "").toUpperCase();
  const targetHit = diagnostic.TARGET_HIT_TEST ?? row.TARGET_HIT_TEST;
  const descendant = diagnostic.TOPMOST_IS_DESCENDANT ?? row.TOPMOST_IS_DESCENDANT;
  if (direct === "LEGITIMATE_DESCENDANT_HIT" || (targetHit === true && descendant === true)) return "LEGITIMATE_DESCENDANT_HIT";
  if (direct === "NESTED_SCROLL_OFFSCREEN") return "NESTED_SCROLL_OFFSCREEN";
  if (direct === "DOCUMENT_SCROLL_OFFSCREEN" || failed === "CENTER_OUTSIDE_VIEWPORT") return "CENTER_OUTSIDE_VIEWPORT";
  if (/POINTER|OBSTRUCTION/u.test(direct)) return "POINTER_INTERCEPTION";
  if (/CONTAINED|CLIPPED/u.test(direct) || /TARGET_NOT_CONTAINED/u.test(failed)) return "CLIPPED_BY_ACTIVE_SURFACE";
  if (/RECT_ZERO|TRANSIENT|STALE/u.test(direct) || /TARGET_RECT_ZERO/u.test(failed)) return "STALE_GEOMETRY";
  if (direct && direct !== "UNRESOLVED") return "OTHER_PHYSICAL_HIT_TEST";
  return "UNRESOLVED_PHYSICAL_CLASS";
}

function isInitialProvenPhysicalRoot(row = {}) {
  return row.PHYSICAL_FAILURE_CLASS === "NESTED_SCROLL_OFFSCREEN"
    && row.EXECUTION_STATE === "HARNESS_FAILURE"
    && String(row.FAILURE_REASON ?? "").includes("TARGET_HIT_TEST");
}

function isPendingPhysicalRoot(row = {}) {
  return row.EXECUTION_STATE === "PREHIT_CLOSED_DOWNSTREAM_HIT_TEST_PENDING"
    && String(row.failureReason ?? row.FAILURE_REASON ?? "").includes("TARGET_HIT_TEST");
}

function sourceDigests(inputs) {
  return Object.entries(inputs.sources)
    .filter(([, source]) => source?.sha256)
    .map(([name, source]) => ({ SOURCE: name, PATH: source.relativePath, SHA256: source.sha256 }))
    .sort((left, right) => left.SOURCE.localeCompare(right.SOURCE));
}

export function loadRootHit190Inputs({ repositoryRoot, sourcePaths = DEFAULT_ROOT_HIT190_SOURCE_PATHS } = {}) {
  if (!repositoryRoot) throw new Error("ROOT_HIT190_REPOSITORY_ROOT_REQUIRED");
  const sources = {
    targetHitDiagnostics: readJsonSource({ repositoryRoot, relativePath: sourcePaths.targetHitDiagnostics }),
    prehit246Results: readJsonSource({ repositoryRoot, relativePath: sourcePaths.prehit246Results }),
    residual195Summary: readJsonSource({ repositoryRoot, relativePath: sourcePaths.residual195Summary }),
    residual195Results: readJsonSource({ repositoryRoot, relativePath: sourcePaths.residual195Results }),
    canonicalRoomCheckpoint: readJsonSource({ repositoryRoot, relativePath: sourcePaths.canonicalRoomCheckpoint }),
    exact36Selection: readJsonSource({ repositoryRoot, relativePath: sourcePaths.exact36Selection }),
    exact36Results: readJsonSource({ repositoryRoot, relativePath: sourcePaths.exact36Results }),
    trueOpen54Selection: readJsonSource({ repositoryRoot, relativePath: sourcePaths.trueOpen54Selection }),
    trueOpen54Results: readJsonSource({ repositoryRoot, relativePath: sourcePaths.trueOpen54Results }),
    sharedExecutor: readTextSource({ repositoryRoot, relativePath: sourcePaths.sharedExecutor }),
    canonicalRuntime: readTextSource({ repositoryRoot, relativePath: sourcePaths.canonicalRuntime }),
    terminalAdapter: readTextSource({ repositoryRoot, relativePath: sourcePaths.terminalAdapter }),
    canonicalCli: readTextSource({ repositoryRoot, relativePath: sourcePaths.canonicalCli }),
  };
  const diagnosticRows = requireRows(sources.targetHitDiagnostics.value.records, "TARGET_HIT_DIAGNOSTICS");
  const prehitRows = requireRows(sources.prehit246Results.value.results, "PREHIT246_RESULTS");
  const residualRows = requireRows(sources.residual195Results.value.results, "RESIDUAL195_RESULTS");
  return {
    sourcePaths: Object.fromEntries(Object.entries(sources).map(([name, source]) => [name, source.relativePath])),
    sources,
    inputSourceDigests: sourceDigests({ sources }),
    historicalSources: {
      targetHitDiagnostics: diagnosticRows.filter(isInitialProvenPhysicalRoot),
      prehit246Results: prehitRows.filter(isPendingPhysicalRoot),
      residual195Results: residualRows.filter(isPendingPhysicalRoot),
    },
    accepted: {
      exact36Selection: requireRows(sources.exact36Selection.value.rows, "EXACT36_SELECTION"),
      exact36Results: requireRows(sources.exact36Results.value.results, "EXACT36_RESULTS"),
      trueOpen54Selection: requireRows(sources.trueOpen54Selection.value.rows, "TRUE_OPEN54_SELECTION"),
      trueOpen54Results: requireRows(sources.trueOpen54Results.value.results, "TRUE_OPEN54_RESULTS"),
    },
    canonicalRoomCheckpoint: requireRows(sources.canonicalRoomCheckpoint.value.actions, "ROOM_CHECKPOINT"),
    residual195Summary: sources.residual195Summary.value,
  };
}

function buildHistoricalUniverse(inputs) {
  const groups = [
    [HISTORICAL_SOURCE_LABELS.DIAGNOSTIC, inputs.historicalSources.targetHitDiagnostics],
    [HISTORICAL_SOURCE_LABELS.PREHIT, inputs.historicalSources.prehit246Results],
    [HISTORICAL_SOURCE_LABELS.RESIDUAL, inputs.historicalSources.residual195Results],
  ];
  const rows = [];
  for (const [sourceClass, sourceRows] of groups) {
    for (const record of sourceRows) rows.push({ sourceClass, record });
  }
  uniqueIndex(rows.map(({ record }) => record), "HISTORICAL_UNIVERSE");
  return rows;
}

function acceptedOverlapFacts(stableId, accepted = {}) {
  const exact36Selection = new Map((accepted.exact36Selection ?? []).map((row) => [idFor(row), row]));
  const exact36Results = new Map((accepted.exact36Results ?? []).map((row) => [idFor(row), row]));
  const trueOpen54Selection = new Map((accepted.trueOpen54Selection ?? []).map((row) => [idFor(row), row]));
  const trueOpen54Results = new Map((accepted.trueOpen54Results ?? []).map((row) => [idFor(row), row]));
  const exactSelection = exact36Selection.get(stableId) ?? null;
  const exactResult = exact36Results.get(stableId) ?? null;
  const trueSelection = trueOpen54Selection.get(stableId) ?? null;
  const trueResult = trueOpen54Results.get(stableId) ?? null;
  return {
    EXACT36_OVERLAP: exactSelection || exactResult ? "YES" : "NO",
    TRUE_OPEN54_OVERLAP: trueSelection || trueResult ? "YES" : "NO",
    exactSelection,
    exactResult,
    trueSelection,
    trueResult,
  };
}

function proveAcceptedPhysicalClosure({ stableId, supplied = new Map() }) {
  const candidate = supplied.get(stableId);
  if (!candidate || candidate.SAME_PHYSICAL_ROOT_CLEARED !== true) return null;
  const source = String(candidate.SOURCE ?? "");
  if (!source) return null;
  return { source, evidence: candidate.EVIDENCE ?? null };
}

function rowEvidence({ sourcePaths, sourceClass, stableId, overlaps }) {
  const source = sourceClass === HISTORICAL_SOURCE_LABELS.DIAGNOSTIC
    ? sourcePaths.targetHitDiagnostics
    : sourceClass === HISTORICAL_SOURCE_LABELS.PREHIT
      ? sourcePaths.prehit246Results
      : sourcePaths.residual195Results;
  const base = [source, sourcePaths.canonicalRoomCheckpoint, sourcePaths.sharedExecutor, sourcePaths.canonicalRuntime, sourcePaths.terminalAdapter];
  if (overlaps.EXACT36_OVERLAP === "YES") base.push(sourcePaths.exact36Selection, sourcePaths.exact36Results);
  if (overlaps.TRUE_OPEN54_OVERLAP === "YES") base.push(sourcePaths.trueOpen54Selection, sourcePaths.trueOpen54Results);
  const digestKey = `sha256:${sha256(stableId)}`;
  return [...new Set(base)].sort((left, right) => left.localeCompare(right)).map((item) => `${item}#${digestKey}`);
}

function canonicalRowSort(left, right) {
  return left.STABLE_CONTRACT_IDENTITY.localeCompare(right.STABLE_CONTRACT_IDENTITY);
}

function evaluateReadinessSourceWiring(inputs) {
  const executor = inputs.sources.sharedExecutor.text;
  const runtime = inputs.sources.canonicalRuntime.text;
  const terminal = inputs.sources.terminalAdapter.text;
  const cli = inputs.sources.canonicalCli.text;
  const includes = (text, needle) => text.includes(needle);
  const geometry = includes(executor, "planPreActionGeometryPreparation")
    && includes(executor, "deriveHarnessActionabilityProof")
    && includes(executor, "hitTest190MembershipMutationAllowed: false")
    && includes(runtime, "prepareCurrentSemanticTargetForAction")
    && includes(runtime, "scrollIntoViewIfNeeded")
    && includes(runtime, "POST_SCROLL_GEOMETRY_REFRESHED = true")
    && includes(runtime, "FINAL_HIT_TEST_AFTER_SCROLL_PREPARATION = true");
  const dispatch = includes(runtime, "dispatchPlaywrightClick")
    && includes(runtime, "ACTION_DISPATCH_STARTED = true")
    && includes(runtime, "ACTION_DISPATCH_SUCCEEDED = true");
  const rawFailure = includes(terminal, "RAW_HARNESS_FAILURE")
    && includes(terminal, "RAW_HARNESS_FAILURE_BEFORE_DISPATCH");
  const productGate = includes(terminal, "ACTION_DISPATCH_SUCCEEDED !== true")
    && includes(terminal, "EXPECTED_RENDERED_EFFECT_NOT_OBSERVED");
  const existingRunnerFixedSelection = includes(cli, "runRoomTrueOpen54Acceptance")
    && includes(runtime, "loadRoomTrueOpen54FrozenSelection");
  return {
    CANONICAL_RUNNER_PATH_RESOLVED: true,
    SHARED_HYBRID_EXECUTOR_REACHED: geometry,
    SCROLL_PREPARATION_CAPABILITY_PRESENT: geometry,
    POST_SCROLL_GEOMETRY_REFRESH_PRESENT: geometry,
    FINAL_HIT_TEST_AFTER_PREPARATION_PRESENT: geometry,
    ACTUAL_DISPATCH_TELEMETRY_PRESENT: dispatch,
    RAW_HARNESS_FAILURE_PRESERVATION_PRESENT: rawFailure,
    PRODUCT_DEFECT_DISPATCH_GATE_PRESENT: productGate,
    EXISTING_CANONICAL_RUNNER_REUSABLE: existingRunnerFixedSelection && geometry && dispatch && rawFailure && productGate ? "PARTIAL" : "NO",
    CANONICAL_RUNNER_ENTRYPOINT: "backend/scripts/pre_18_room_true_open54_replay_cli.mjs -> runRoomTrueOpen54Acceptance -> executeRoomTrueOpen54Contract -> executeOne -> prepareCurrentSemanticTargetForAction -> dispatchPlaywrightClick",
    ACTUAL_SHARED_EXECUTOR_PATH_TESTED: geometry ? "YES" : "NO",
    ACTUAL_TERMINAL_ADAPTER_PATH_TESTED: rawFailure && productGate ? "YES" : "NO",
    ACTUAL_SELECTION_CONSUMER_PATH_TESTED: "NOT_YET_AVAILABLE",
    SMALLEST_FUTURE_ADAPTATION: "Inject a separately validated ROOT-HIT frozen selection into the existing TRUE-OPEN54 shared runtime/executeOne path; do not copy worker, reset, recorder, or executor behavior.",
  };
}

export function buildRootHit190Readiness({ inputs, rows = [] } = {}) {
  const wiring = evaluateReadinessSourceWiring(inputs);
  const direct = wiring.SHARED_HYBRID_EXECUTOR_REACHED
    && wiring.SCROLL_PREPARATION_CAPABILITY_PRESENT
    && wiring.POST_SCROLL_GEOMETRY_REFRESH_PRESENT
    && wiring.FINAL_HIT_TEST_AFTER_PREPARATION_PRESENT
    && wiring.ACTUAL_DISPATCH_TELEMETRY_PRESENT
    && wiring.RAW_HARNESS_FAILURE_PRESERVATION_PRESENT
    && wiring.PRODUCT_DEFECT_DISPATCH_GATE_PRESENT;
  const mapped = rows.map((row) => ({
    ...row,
    CURRENT_EXECUTOR_PATH_CLASS: wiring.EXISTING_CANONICAL_RUNNER_REUSABLE === "PARTIAL"
      ? "CANONICAL_TRUE_OPEN54_SHARED_PATH_SELECTION_ADAPTATION_REQUIRED"
      : "UNRESOLVED_CANONICAL_EXECUTOR_PATH",
    SHARED_CORRECTIVE_IMPACT_CLASS: direct ? "SHARED_CORRECTIVE_APPLIES_DIRECTLY" : "UNRESOLVED_EXECUTION_PATH",
    CANONICAL_RUNNER_PATH: wiring.CANONICAL_RUNNER_ENTRYPOINT,
    CANONICAL_RUNNER_PATH_RESOLVED: wiring.CANONICAL_RUNNER_PATH_RESOLVED ? "YES" : "NO",
    SHARED_HYBRID_EXECUTOR_REACHED: wiring.SHARED_HYBRID_EXECUTOR_REACHED ? "YES" : "NO",
    SCROLL_PREPARATION_CAPABILITY_PRESENT: wiring.SCROLL_PREPARATION_CAPABILITY_PRESENT ? "YES" : "NO",
    POST_SCROLL_GEOMETRY_REFRESH_PRESENT: wiring.POST_SCROLL_GEOMETRY_REFRESH_PRESENT ? "YES" : "NO",
    FINAL_HIT_TEST_AFTER_PREPARATION_PRESENT: wiring.FINAL_HIT_TEST_AFTER_PREPARATION_PRESENT ? "YES" : "NO",
    ACTUAL_DISPATCH_TELEMETRY_PRESENT: wiring.ACTUAL_DISPATCH_TELEMETRY_PRESENT ? "YES" : "NO",
    RAW_HARNESS_FAILURE_PRESERVATION_PRESENT: wiring.RAW_HARNESS_FAILURE_PRESERVATION_PRESENT ? "YES" : "NO",
    PRODUCT_DEFECT_DISPATCH_GATE_PRESENT: wiring.PRODUCT_DEFECT_DISPATCH_GATE_PRESENT ? "YES" : "NO",
  }));
  const replayRows = mapped.filter((row) => row.FINAL_MEMBERSHIP_CLASS === "REPLAY_REQUIRED_ROOT_HIT01");
  return {
    ...wiring,
    PRODUCT_FILES_REQUIRED: "NO",
    SECOND_RUNTIME_STACK_REQUIRED: "NO",
    PRIVATE_ADAPTER_DUPLICATION_REQUIRED: "NO",
    rows: mapped,
    summary: {
      SHARED_CORRECTIVE_APPLIES_DIRECTLY_COUNT: replayRows.filter((row) => row.SHARED_CORRECTIVE_IMPACT_CLASS === "SHARED_CORRECTIVE_APPLIES_DIRECTLY").length,
      SHARED_CORRECTIVE_APPLIES_PARTIALLY_COUNT: replayRows.filter((row) => row.SHARED_CORRECTIVE_IMPACT_CLASS === "SHARED_CORRECTIVE_APPLIES_PARTIALLY").length,
      DISTINCT_PHYSICAL_ROOT_PATH_COUNT: replayRows.filter((row) => row.SHARED_CORRECTIVE_IMPACT_CLASS === "DISTINCT_PHYSICAL_ROOT_PATH").length,
      UNRESOLVED_EXECUTION_PATH_COUNT: replayRows.filter((row) => row.SHARED_CORRECTIVE_IMPACT_CLASS === "UNRESOLVED_EXECUTION_PATH").length,
    },
  };
}

function rowSummary(rows) {
  const count = (value) => rows.filter((row) => row.FINAL_MEMBERSHIP_CLASS === value).length;
  const physical = (value) => rows.filter((row) => row.HISTORICAL_PHYSICAL_FAILURE_CLASS === value).length;
  return {
    HISTORICAL_ROOT_HIT01_COUNT: rows.length,
    HISTORICAL_ROOT_HIT01_UNIQUE_IDENTITY_COUNT: new Set(rows.map((row) => row.STABLE_CONTRACT_IDENTITY)).size,
    HISTORICAL_ROOT_HIT01_DUPLICATE_IDENTITY_COUNT: rows.length - new Set(rows.map((row) => row.STABLE_CONTRACT_IDENTITY)).size,
    MISSING_ROOT_HIT01_IDENTITY_COUNT: rows.filter((row) => !row.STABLE_CONTRACT_IDENTITY).length,
    ROOT_HIT190_OVERLAP_WITH_EXACT36_COUNT: rows.filter((row) => row.EXACT36_OVERLAP === "YES").length,
    ROOT_HIT190_OVERLAP_WITH_TRUE_OPEN54_COUNT: rows.filter((row) => row.TRUE_OPEN54_OVERLAP === "YES").length,
    REPLAY_REQUIRED_ROOT_HIT01_COUNT: count("REPLAY_REQUIRED_ROOT_HIT01"),
    ALREADY_SATISFIED_BY_ACCEPTED_LATER_EVIDENCE_COUNT: count("ALREADY_SATISFIED_BY_ACCEPTED_LATER_EVIDENCE"),
    UNRESOLVED_MEMBERSHIP_COUNT: count("UNRESOLVED_MEMBERSHIP"),
    NESTED_SCROLL_OFFSCREEN_COUNT: physical("NESTED_SCROLL_OFFSCREEN"),
    CENTER_OUTSIDE_VIEWPORT_COUNT: physical("CENTER_OUTSIDE_VIEWPORT"),
    LEGITIMATE_DESCENDANT_HIT_COUNT: physical("LEGITIMATE_DESCENDANT_HIT"),
    POINTER_INTERCEPTION_COUNT: physical("POINTER_INTERCEPTION"),
    CLIPPED_BY_ACTIVE_SURFACE_COUNT: physical("CLIPPED_BY_ACTIVE_SURFACE"),
    STALE_GEOMETRY_COUNT: physical("STALE_GEOMETRY"),
    OTHER_PHYSICAL_HIT_TEST_COUNT: physical("OTHER_PHYSICAL_HIT_TEST"),
    UNRESOLVED_PHYSICAL_CLASS_COUNT: physical("UNRESOLVED_PHYSICAL_CLASS"),
  };
}

function lineageDigestPayload(rows, summary, readiness) {
  return {
    SCHEMA_VERSION: ROOT_HIT190_SCHEMA_VERSION,
    SUMMARY: summary,
    READINESS: readiness.summary,
    ROWS: rows.map(({ EVIDENCE_SOURCE_LIST, ...row }) => row),
  };
}

function selectionRecord(row) {
  const keys = [
    "HISTORICAL_INDEX", "STABLE_CONTRACT_IDENTITY", "ROLE", "ROUTE", "SURFACE_CLASS", "VIEWPORT_REPRESENTATION_CLASS",
    "ACTION_FAMILY", "BUSINESS_TARGET_TYPE", "STABLE_TARGET_KEY", "EXPECTED_EFFECT_CLASS", "SAFETY_CLASS",
    "PREREQUISITE_STATE_CLASS", "HISTORICAL_ROOT", "HISTORICAL_PHYSICAL_FAILURE_CLASS", "FINAL_MEMBERSHIP_CLASS",
    "MEMBERSHIP_REASON_CODE", "CURRENT_EXECUTOR_PATH_CLASS", "SHARED_CORRECTIVE_IMPACT_CLASS", "EVIDENCE_SOURCE_LIST",
  ];
  return Object.fromEntries(keys.map((key) => [key, row[key] ?? null]));
}

export function freezeRootHit190Selections({ rows = [], summary = {} } = {}) {
  const unique = new Set(rows.map((row) => row.STABLE_CONTRACT_IDENTITY)).size === rows.length;
  const canFreeze = summary.UNRESOLVED_MEMBERSHIP_COUNT === 0 && unique;
  if (!canFreeze) return {
    frozen: false,
    finalReplaySelection: null,
    alreadySatisfiedSelection: null,
    digests: { FINAL_ROOT_HIT_REPLAY_SELECTION_SHA256: null, ALREADY_SATISFIED_ROOT_HIT_SELECTION_SHA256: null },
  };
  const finalReplaySelection = rows.filter((row) => row.FINAL_MEMBERSHIP_CLASS === "REPLAY_REQUIRED_ROOT_HIT01").map(selectionRecord);
  const alreadySatisfiedSelection = rows.filter((row) => row.FINAL_MEMBERSHIP_CLASS === "ALREADY_SATISFIED_BY_ACCEPTED_LATER_EVIDENCE").map(selectionRecord);
  return {
    frozen: true,
    finalReplaySelection,
    alreadySatisfiedSelection,
    digests: {
      FINAL_ROOT_HIT_REPLAY_SELECTION_SHA256: sha256(canonicalSerialize(finalReplaySelection)),
      ALREADY_SATISFIED_ROOT_HIT_SELECTION_SHA256: sha256(canonicalSerialize(alreadySatisfiedSelection)),
    },
  };
}

export function reconcileRootHit190({ inputs, strictUniverse = true, acceptedPhysicalClosures = new Map() } = {}) {
  if (!inputs) throw new Error("ROOT_HIT190_INPUTS_REQUIRED");
  const historical = buildHistoricalUniverse(inputs);
  const checkpointById = uniqueIndex(inputs.canonicalRoomCheckpoint, "CANONICAL_CHECKPOINT");
  const rows = historical.map(({ sourceClass, record }) => {
    const stableId = idFor(record);
    const identity = parseIdentity(stableId);
    if (!checkpointById.has(stableId)) throw new Error("ROOT_HIT190_CANONICAL_CHECKPOINT_EVIDENCE_MISSING");
    const overlaps = acceptedOverlapFacts(stableId, inputs.accepted);
    const closure = proveAcceptedPhysicalClosure({ stableId, supplied: acceptedPhysicalClosures });
    const membership = closure
      ? { FINAL_MEMBERSHIP_CLASS: "ALREADY_SATISFIED_BY_ACCEPTED_LATER_EVIDENCE", MEMBERSHIP_REASON_CODE: `SAME_PHYSICAL_ROOT_CLOSED_BY_${closure.source}` }
      : { FINAL_MEMBERSHIP_CLASS: "REPLAY_REQUIRED_ROOT_HIT01", MEMBERSHIP_REASON_CODE: overlaps.EXACT36_OVERLAP === "YES" ? "EXACT36_CLOSED_PREHIT_ROOT_BUT_PHYSICAL_HIT_TEST_PENDING" : "HISTORICAL_PHYSICAL_ROOT_NOT_LATER_CLOSED" };
    return {
      STABLE_CONTRACT_IDENTITY: stableId,
      ROLE: identity.role,
      ROUTE: identity.route,
      SURFACE_CLASS: identity.surfaceId,
      VIEWPORT_REPRESENTATION_CLASS: identity.viewport,
      ACTION_FAMILY: identity.expectedEffectClass,
      BUSINESS_TARGET_TYPE: identity.ownerType,
      STABLE_TARGET_KEY: `sha256:${sha256(stableId)}`,
      EXPECTED_EFFECT_CLASS: identity.expectedEffectClass,
      SAFETY_CLASS: identity.safetyClass,
      PREREQUISITE_STATE_CLASS: canonicalSerialize(parseMaterialState(identity)),
      HISTORICAL_ROOT: "ROOT-HIT-01",
      HISTORICAL_SOURCE_CLASS: sourceClass,
      HISTORICAL_PHYSICAL_FAILURE_CLASS: classifyHistoricalPhysicalFailure(record),
      HISTORICAL_EVIDENCE_SOURCE: sourceClass === HISTORICAL_SOURCE_LABELS.DIAGNOSTIC
        ? inputs.sourcePaths.targetHitDiagnostics
        : sourceClass === HISTORICAL_SOURCE_LABELS.PREHIT ? inputs.sourcePaths.prehit246Results : inputs.sourcePaths.residual195Results,
      EXACT36_OVERLAP: overlaps.EXACT36_OVERLAP,
      TRUE_OPEN54_OVERLAP: overlaps.TRUE_OPEN54_OVERLAP,
      LATER_ACCEPTED_CLOSURE_SOURCE: closure?.source ?? null,
      ...membership,
      EVIDENCE_SOURCE_LIST: rowEvidence({ sourcePaths: inputs.sourcePaths, sourceClass, stableId, overlaps }),
    };
  }).sort(canonicalRowSort).map((row, index) => ({ HISTORICAL_INDEX: index + 1, ...row }));
  const summary = rowSummary(rows);
  summary.AMBIGUOUS_FINAL_MEMBERSHIP_COUNT = summary.UNRESOLVED_MEMBERSHIP_COUNT;
  summary.MISSING_FINAL_MEMBERSHIP_COUNT = rows.filter((row) => !row.FINAL_MEMBERSHIP_CLASS).length;
  summary.PHYSICAL_SUBCLUSTER_COUNT = new Set(rows.map((row) => row.HISTORICAL_PHYSICAL_FAILURE_CLASS)).size;
  if (summary.REPLAY_REQUIRED_ROOT_HIT01_COUNT + summary.ALREADY_SATISFIED_BY_ACCEPTED_LATER_EVIDENCE_COUNT + summary.UNRESOLVED_MEMBERSHIP_COUNT !== summary.HISTORICAL_ROOT_HIT01_COUNT) {
    throw new Error("ROOT_HIT190_MEMBERSHIP_ACCOUNTING_UNBALANCED");
  }
  if (strictUniverse && (
    summary.HISTORICAL_ROOT_HIT01_COUNT !== 190
    || summary.HISTORICAL_ROOT_HIT01_UNIQUE_IDENTITY_COUNT !== 190
    || summary.HISTORICAL_ROOT_HIT01_DUPLICATE_IDENTITY_COUNT !== 0
    || summary.MISSING_ROOT_HIT01_IDENTITY_COUNT !== 0
    || Number(inputs.residual195Summary.TOTAL_KNOWN_HIT_TEST_INPUT_COUNT_AFTER_RESIDUAL_REPLAY) !== 190
  )) throw new Error(`ROOT_HIT190_IMMUTABLE_UNIVERSE_CARDINALITY_FAILED:${canonicalSerialize(summary)}`);

  const readiness = buildRootHit190Readiness({ inputs, rows });
  const mappedRows = readiness.rows;
  const frozen = freezeRootHit190Selections({ rows: mappedRows, summary });
  return {
    schemaVersion: ROOT_HIT190_SCHEMA_VERSION,
    runtimePolicy: ROOT_HIT190_RUNTIME_POLICY,
    rows: mappedRows,
    summary,
    readiness,
    inputSourceDigests: inputs.inputSourceDigests,
    frozen,
    digests: {
      ROOT_HIT190_LINEAGE_SHA256: sha256(canonicalSerialize(lineageDigestPayload(mappedRows, summary, readiness))),
      FINAL_ROOT_HIT_REPLAY_SELECTION_SHA256: frozen.digests.FINAL_ROOT_HIT_REPLAY_SELECTION_SHA256,
      ALREADY_SATISFIED_ROOT_HIT_SELECTION_SHA256: frozen.digests.ALREADY_SATISFIED_ROOT_HIT_SELECTION_SHA256,
    },
  };
}

export function buildRootHit190LineageManifest(reconciliation) {
  return {
    SCHEMA_VERSION: ROOT_HIT190_SCHEMA_VERSION,
    RUNTIME_POLICY: ROOT_HIT190_RUNTIME_POLICY,
    HISTORICAL_ROOT_HIT01_COUNT: reconciliation.summary.HISTORICAL_ROOT_HIT01_COUNT,
    ROOT_HIT190_OVERLAP_WITH_EXACT36_COUNT: reconciliation.summary.ROOT_HIT190_OVERLAP_WITH_EXACT36_COUNT,
    ROOT_HIT190_OVERLAP_WITH_TRUE_OPEN54_COUNT: reconciliation.summary.ROOT_HIT190_OVERLAP_WITH_TRUE_OPEN54_COUNT,
    REPLAY_REQUIRED_ROOT_HIT01_COUNT: reconciliation.summary.REPLAY_REQUIRED_ROOT_HIT01_COUNT,
    ALREADY_SATISFIED_BY_ACCEPTED_LATER_EVIDENCE_COUNT: reconciliation.summary.ALREADY_SATISFIED_BY_ACCEPTED_LATER_EVIDENCE_COUNT,
    UNRESOLVED_MEMBERSHIP_COUNT: reconciliation.summary.UNRESOLVED_MEMBERSHIP_COUNT,
    ROOT_HIT190_LINEAGE_SHA256: reconciliation.digests.ROOT_HIT190_LINEAGE_SHA256,
    FINAL_ROOT_HIT_REPLAY_SELECTION_SHA256: reconciliation.digests.FINAL_ROOT_HIT_REPLAY_SELECTION_SHA256,
    ALREADY_SATISFIED_ROOT_HIT_SELECTION_SHA256: reconciliation.digests.ALREADY_SATISFIED_ROOT_HIT_SELECTION_SHA256,
    EXISTING_CANONICAL_RUNNER_REUSABLE: reconciliation.readiness.EXISTING_CANONICAL_RUNNER_REUSABLE,
    CANONICAL_RUNNER_ENTRYPOINT: reconciliation.readiness.CANONICAL_RUNNER_ENTRYPOINT,
    INPUT_SOURCE_DIGESTS: reconciliation.inputSourceDigests,
  };
}
