import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const RECONCILIATION_SCHEMA_VERSION = "PRE18-ROOM-TRUE-OPEN72-LINEAGE-V1";

export const RECONCILIATION_RUNTIME_POLICY = Object.freeze({
  INPUT_MODE: "IMMUTABLE_JSON_ONLY",
  REAL_BROWSER_RUN_STARTED: "NO",
  DOM_ACCESS: "NO",
});

export const DEFAULT_SOURCE_PATHS = Object.freeze({
  residual195Summary: "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion/runs/pre18-room-residual195-20260913042813101-luna-local/room-residual195-closure/summary.json",
  residual195Results: "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion/runs/pre18-room-residual195-20260913042813101-luna-local/room-residual195-closure/results.json",
  prehit246Results: "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion/runs/pre18-room-prehit-246-20260912-luna-local-final/room-prehit-246-migration/results.json",
  canonicalRoomCheckpoint: "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion/canonical-resume-checkpoints/ROLE-ROOM/canonical-checkpoint.json",
  targetHitDiagnostics: "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion/runs/pre18-room-target-hit-diagnostic-20260912-terra-b/room-target-hit-test-diagnostic/target-hit-diagnostics.json",
  exact36Selection: "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion/runs/pre18-room-exact36-final-20260914T050945Z/room-exact36-canonical-acceptance/frozen-selection.json",
  exact36Summary: "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion/runs/pre18-room-exact36-final-20260914T050945Z/room-exact36-canonical-acceptance/summary.json",
  exact36Results: "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion/runs/pre18-room-exact36-final-20260914T050945Z/room-exact36-canonical-acceptance/results.json",
});

function normalizePath(value) {
  return value.replaceAll("\\", "/");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort((left, right) => left.localeCompare(right))
        .map((key) => [key, sortValue(value[key])]),
    );
  }
  return value;
}

export function canonicalSerialize(value) {
  return JSON.stringify(sortValue(value));
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

function requireArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  return value;
}

function sourceDigestEntries(sources) {
  return Object.entries(sources)
    .map(([source, input]) => ({ SOURCE: source, PATH: input.relativePath, SHA256: input.sha256 }))
    .sort((left, right) => left.SOURCE.localeCompare(right.SOURCE));
}

export function loadReconciliationInputs({ repositoryRoot, sourcePaths = DEFAULT_SOURCE_PATHS }) {
  const sources = Object.fromEntries(
    Object.entries(sourcePaths).map(([source, relativePath]) => [
      source,
      readJsonSource({ repositoryRoot, relativePath }),
    ]),
  );

  return {
    sourcePaths: Object.fromEntries(Object.entries(sources).map(([source, input]) => [source, input.relativePath])),
    inputSourceDigests: sourceDigestEntries(sources),
    residual195: {
      summary: sources.residual195Summary.value,
      results: requireArray(sources.residual195Results.value.results, "residual195.results"),
    },
    prehit246: {
      results: requireArray(sources.prehit246Results.value.results, "prehit246.results"),
    },
    canonicalRoomCheckpoint: {
      actions: requireArray(sources.canonicalRoomCheckpoint.value.actions, "canonicalRoomCheckpoint.actions"),
    },
    targetHitDiagnostics: {
      diagnostics: requireArray(sources.targetHitDiagnostics.value.records, "targetHitDiagnostics.records"),
    },
    exact36: {
      selection: requireArray(sources.exact36Selection.value.rows, "exact36.selection.rows"),
      summary: sources.exact36Summary.value,
      results: requireArray(sources.exact36Results.value.results, "exact36.results"),
    },
  };
}

function idFor(row) {
  return row?.ACTION_CONTRACT_ID ?? row?.HISTORICAL_ACTION_CONTRACT_ID ?? row?.CONTRACT_ID ?? null;
}

function uniqueIndex(rows, { label, id = idFor }) {
  const byId = new Map();
  const duplicateIds = new Set();
  for (const row of rows) {
    const stableId = id(row);
    if (!stableId) continue;
    if (byId.has(stableId)) duplicateIds.add(stableId);
    else byId.set(stableId, row);
  }
  if (duplicateIds.size > 0) {
    throw new Error(`${label} contains duplicate stable contract identities: ${[...duplicateIds].join(", ")}`);
  }
  return byId;
}

function parseStableIdentity(stableId) {
  try {
    const identity = JSON.parse(stableId);
    if (!identity || typeof identity !== "object" || Array.isArray(identity)) throw new Error("not an object");
    return identity;
  } catch (error) {
    throw new Error(`ACTION_CONTRACT_ID is not canonical JSON: ${error.message}`);
  }
}

function parseMaterialState(identity) {
  try {
    const materialState = JSON.parse(identity.materialState ?? "{}");
    const materialFields = ["activeTab", "detailsOpen", "drawerOpen", "modalOpen", "systemNavigationDisclosure"];
    return Object.fromEntries(
      materialFields
        .filter((field) => Object.hasOwn(materialState, field))
        .map((field) => [field, materialState[field]]),
    );
  } catch {
    return {};
  }
}

function isHistoricalTrueOpen72Row(row) {
  const failureReason = String(row.failureReason ?? row.FAILURE_REASON ?? "");
  return row.PREHIT_ROOT === "PREHIT-S1"
    && row.ROOT_ORIGINAL_CLEARED !== true
    && failureReason.startsWith("ROUTE_READINESS_NOT_PROVEN:");
}

function requireEvidencePresence(candidateIds, evidenceMap, label) {
  const missing = [...candidateIds].filter((stableId) => !evidenceMap.has(stableId));
  if (missing.length > 0) {
    throw new Error(`${label} is missing ${missing.length} True-Open72 stable identity evidence row(s)`);
  }
}

function acceptedExact36RunValid(summary) {
  const rootAccounting = summary.ROOT_ACCOUNTING ?? {};
  return summary.ROOM_EXACT36_CANONICAL_EXECUTABLE === "READY"
    && summary.FROZEN_SELECTION_RESOLUTION_SUCCESS === "YES"
    && summary.RESET_OPERATION_ACCEPTANCE_STATUS === "GREEN"
    && Number(summary.TARGET_COUNT) === 36
    && Number(summary.SELECTED_UNIQUE_CONTRACT_COUNT) === 36
    && Number(rootAccounting.TRUE_ORIGINAL_ROOT_CLEARED_COUNT) === 36
    && Number(rootAccounting.TRUE_ORIGINAL_ROOT_OPEN_COUNT) === 0;
}

function exact36ClosureFacts({ stableId, selection, result, exact36RunValid }) {
  const selectionMatches = Boolean(selection && idFor(selection) === stableId);
  const resultMatches = Boolean(result && idFor(result) === stableId);
  const executionState = result?.executionState ?? result?.EXECUTION_STATE ?? null;
  const processed = resultMatches && typeof executionState === "string" && executionState.startsWith("PREHIT_CLOSED_");
  const rootFacts = result?.ORIGINAL_ROOT_FACTS;
  const originalRootProven = selectionMatches
    && processed
    && selection?.PREHIT_ROOT === "PREHIT-S1"
    && result?.PREHIT_ROOT === "PREHIT-S1"
    && rootFacts?.ROOT === "PREHIT-S1"
    && rootFacts?.AUTH_READY === true
    && rootFacts?.ROUTE_READY === true
    && rootFacts?.PREMATURE_HISTORICAL_STEP_REPLAY === false;
  const originalRootCleared = originalRootProven
    && rootFacts?.cleared === true
    && result?.ORIGINAL_ROOT_STATUS === "CLEARED";
  const explicitReopen = result?.ROOT_REOPENED_BY_DOWNSTREAM ?? result?.rootReopenedByDownstream;
  const rootReopened = explicitReopen === true;
  const terminalAcceptanceValid = exact36RunValid
    && selectionMatches
    && processed
    && originalRootCleared
    && rootReopened === false;
  return {
    selectionMatches,
    resultMatches,
    processed,
    originalRootProven,
    originalRootCleared,
    rootReopened,
    terminalAcceptanceValid,
  };
}

function yesNo(value) {
  return value ? "YES" : "NO";
}

function evidenceList({ sourcePaths, stableId, exact36Overlap }) {
  const stableTargetKey = `sha256:${sha256(stableId)}`;
  const sources = [
    sourcePaths.residual195Summary,
    sourcePaths.residual195Results,
    sourcePaths.prehit246Results,
    sourcePaths.canonicalRoomCheckpoint,
    sourcePaths.targetHitDiagnostics,
  ];
  if (exact36Overlap) {
    sources.push(sourcePaths.exact36Selection, sourcePaths.exact36Summary, sourcePaths.exact36Results);
  }
  return sources
    .sort((left, right) => left.localeCompare(right))
    .map((source) => `${source}#${stableTargetKey}`);
}

function membershipFromClosure({ exact36Overlap, facts }) {
  if (!exact36Overlap) {
    return {
      FINAL_MEMBERSHIP_CLASS: "REPLAY_REQUIRED",
      MEMBERSHIP_REASON_CODE: "HISTORICAL_OPEN_NOT_LATER_SATISFIED",
    };
  }
  if (!facts.selectionMatches || !facts.resultMatches) {
    return {
      FINAL_MEMBERSHIP_CLASS: "UNRESOLVED_MEMBERSHIP",
      MEMBERSHIP_REASON_CODE: "EXACT36_OVERLAP_IDENTITY_MISMATCH",
    };
  }
  if (!facts.originalRootProven || !facts.originalRootCleared || facts.rootReopened || !facts.terminalAcceptanceValid) {
    return {
      FINAL_MEMBERSHIP_CLASS: "UNRESOLVED_MEMBERSHIP",
      MEMBERSHIP_REASON_CODE: "EXACT36_ROOT_CLEARANCE_NOT_PROVEN",
    };
  }
  return {
    FINAL_MEMBERSHIP_CLASS: "SATISFIED_BY_ACCEPTED_EXACT36",
    MEMBERSHIP_REASON_CODE: "SAME_IDENTITY_CLOSED_BY_ACCEPTED_EXACT36",
  };
}

function canonicalRowSort(left, right) {
  return left.STABLE_CONTRACT_IDENTITY.localeCompare(right.STABLE_CONTRACT_IDENTITY);
}

function summarizedRows(rows) {
  const count = (classification) => rows.filter((row) => row.FINAL_MEMBERSHIP_CLASS === classification).length;
  return {
    HISTORICAL_CANDIDATE_COUNT: rows.length,
    HISTORICAL_UNIQUE_IDENTITY_COUNT: new Set(rows.map((row) => row.STABLE_CONTRACT_IDENTITY)).size,
    MISSING_HISTORICAL_IDENTITY_COUNT: rows.filter((row) => !row.STABLE_CONTRACT_IDENTITY).length,
    HISTORICAL_DUPLICATE_IDENTITY_COUNT: rows.length - new Set(rows.map((row) => row.STABLE_CONTRACT_IDENTITY)).size,
    EXACT36_OVERLAP_COUNT: rows.filter((row) => row.EXACT36_OVERLAP === "YES").length,
    NON_EXACT36_HISTORICAL_COUNT: rows.filter((row) => row.EXACT36_OVERLAP === "NO").length,
    REPLAY_REQUIRED_COUNT: count("REPLAY_REQUIRED"),
    SATISFIED_BY_ACCEPTED_EXACT36_COUNT: count("SATISFIED_BY_ACCEPTED_EXACT36"),
    UNRESOLVED_MEMBERSHIP_COUNT: count("UNRESOLVED_MEMBERSHIP"),
  };
}

function reconciliationDigestPayload(rows, summary) {
  return {
    SCHEMA_VERSION: RECONCILIATION_SCHEMA_VERSION,
    summary: {
      HISTORICAL_CANDIDATE_COUNT: summary.HISTORICAL_CANDIDATE_COUNT,
      HISTORICAL_UNIQUE_IDENTITY_COUNT: summary.HISTORICAL_UNIQUE_IDENTITY_COUNT,
      EXACT36_OVERLAP_COUNT: summary.EXACT36_OVERLAP_COUNT,
      NON_EXACT36_HISTORICAL_COUNT: summary.NON_EXACT36_HISTORICAL_COUNT,
      REPLAY_REQUIRED_COUNT: summary.REPLAY_REQUIRED_COUNT,
      SATISFIED_BY_ACCEPTED_EXACT36_COUNT: summary.SATISFIED_BY_ACCEPTED_EXACT36_COUNT,
      UNRESOLVED_MEMBERSHIP_COUNT: summary.UNRESOLVED_MEMBERSHIP_COUNT,
    },
    rows,
  };
}

export function reconcileTrueOpen72({ inputs, strictUniverse = true }) {
  const candidates = inputs.residual195.results.filter(isHistoricalTrueOpen72Row);
  const candidateById = uniqueIndex(candidates, { label: "residual195 True-Open72 candidates" });
  const candidateIds = new Set(candidateById.keys());
  const summaryExpected = Number(inputs.residual195.summary.PREHIT_AUTH_ROUTE_READINESS_FAILURE_COUNT);
  if (!Number.isInteger(summaryExpected) || summaryExpected !== candidates.length) {
    throw new Error("residual195 summary and per-contract ROUTE_READINESS_NOT_PROVEN candidate count disagree");
  }

  const prehitById = uniqueIndex(inputs.prehit246.results, { label: "prehit246 migration" });
  const checkpointById = uniqueIndex(inputs.canonicalRoomCheckpoint.actions, { label: "canonical ROOM checkpoint" });
  const targetHitById = uniqueIndex(inputs.targetHitDiagnostics.diagnostics, {
    label: "target-hit diagnostics",
    id: (row) => row.HISTORICAL_ACTION_CONTRACT_ID ?? row.CONTRACT_ID,
  });
  requireEvidencePresence(candidateIds, prehitById, "prehit246 migration");
  requireEvidencePresence(candidateIds, checkpointById, "canonical ROOM checkpoint");
  requireEvidencePresence(candidateIds, targetHitById, "target-hit diagnostics");

  const exact36SelectionById = uniqueIndex(inputs.exact36.selection, { label: "Exact36 frozen selection" });
  const exact36ResultsById = uniqueIndex(inputs.exact36.results, { label: "Exact36 final results" });
  const exact36RunValid = acceptedExact36RunValid(inputs.exact36.summary);
  const rows = [...candidateById.entries()].map(([stableId, historical]) => {
    const identity = parseStableIdentity(stableId);
    const exact36Selection = exact36SelectionById.get(stableId);
    const exact36Result = exact36ResultsById.get(stableId);
    const exact36Overlap = Boolean(exact36Selection || exact36Result);
    const closure = exact36ClosureFacts({
      stableId,
      selection: exact36Selection,
      result: exact36Result,
      exact36RunValid,
    });
    const membership = membershipFromClosure({ exact36Overlap, facts: closure });
    return {
      STABLE_CONTRACT_IDENTITY: stableId,
      ROLE: identity.role,
      ROUTE: identity.route,
      SURFACE_CLASS: identity.surfaceId,
      VIEWPORT_REPRESENTATION_CLASS: identity.viewport,
      ACTION_FAMILY: identity.expectedEffectClass,
      USER_INTENT: identity.userMeaning,
      BUSINESS_TARGET_TYPE: identity.ownerType,
      STABLE_TARGET_KEY: `sha256:${sha256(stableId)}`,
      EXPECTED_EFFECT_CLASS: identity.expectedEffectClass,
      SAFETY_CLASS: identity.safetyClass,
      PREREQUISITE_STATE_CLASS: canonicalSerialize(parseMaterialState(identity)),
      CONTROL_TYPE: identity.actionRole,
      ACCESSIBLE_NAME_OR_SEMANTIC_NAME: identity.actionName,
      CONTEXTUAL_OWNER_TYPE: identity.ownerType,
      CONTEXTUAL_OWNER_LABEL: identity.ownerLabel,
      BOUNDED_CONTEXTUAL_OWNER_ORDINAL: identity.ownerOrdinal ?? null,
      HISTORICAL_SOURCE_PATH: inputs.sourcePaths.residual195Results,
      HISTORICAL_SOURCE_ROW_ID: `sha256:${sha256(stableId)}`,
      PREHIT_ROOT_CLASS: historical.PREHIT_ROOT,
      HISTORICAL_TRUE_OPEN_PROOF_SOURCE: `${inputs.sourcePaths.residual195Summary}#PREHIT_AUTH_ROUTE_READINESS_FAILURE_COUNT;${inputs.sourcePaths.residual195Results}#ROUTE_READINESS_NOT_PROVEN`,
      EXACT36_OVERLAP: yesNo(exact36Overlap),
      EXACT36_CONTRACT_ID: exact36Selection ? idFor(exact36Selection) : exact36Result ? idFor(exact36Result) : null,
      EXACT36_SOURCE_PATH: exact36Overlap ? inputs.sourcePaths.exact36Selection : null,
      EXACT36_SELECTED_IDENTITY_MATCH: yesNo(closure.selectionMatches),
      EXACT36_PROCESSED: yesNo(closure.processed),
      EXACT36_ORIGINAL_ROOT_PROVEN: yesNo(closure.originalRootProven),
      EXACT36_ORIGINAL_ROOT_CLEARED: yesNo(closure.originalRootCleared),
      EXACT36_ROOT_REOPENED: yesNo(closure.rootReopened),
      TERMINAL_ACCEPTANCE_VALID: yesNo(closure.terminalAcceptanceValid),
      ...membership,
      EVIDENCE_SOURCE_LIST: evidenceList({
        sourcePaths: inputs.sourcePaths,
        stableId,
        exact36Overlap,
      }),
    };
  }).sort(canonicalRowSort).map((row, index) => ({ HISTORICAL_INDEX: index + 1, ...row }));

  const summary = summarizedRows(rows);
  summary.AMBIGUOUS_FINAL_MEMBERSHIP_COUNT = summary.UNRESOLVED_MEMBERSHIP_COUNT;
  summary.MISSING_FINAL_MEMBERSHIP_COUNT = rows.filter((row) => !row.FINAL_MEMBERSHIP_CLASS).length;
  summary.DUPLICATE_FINAL_MEMBERSHIP_COUNT = rows.length - new Set(rows.map((row) => row.STABLE_CONTRACT_IDENTITY)).size;
  if (summary.REPLAY_REQUIRED_COUNT + summary.SATISFIED_BY_ACCEPTED_EXACT36_COUNT + summary.UNRESOLVED_MEMBERSHIP_COUNT !== summary.HISTORICAL_CANDIDATE_COUNT) {
    throw new Error("final True-Open72 membership accounting does not sum to the historical universe");
  }
  if (strictUniverse && (
    summary.HISTORICAL_CANDIDATE_COUNT !== 72
    || summary.HISTORICAL_UNIQUE_IDENTITY_COUNT !== 72
    || summary.MISSING_HISTORICAL_IDENTITY_COUNT !== 0
    || summary.HISTORICAL_DUPLICATE_IDENTITY_COUNT !== 0
    || summary.EXACT36_OVERLAP_COUNT !== 18
    || summary.NON_EXACT36_HISTORICAL_COUNT !== 54
  )) {
    throw new Error(`True-Open72 immutable input universe failed cardinality gate: ${canonicalSerialize(summary)}`);
  }

  const frozen = freezeSelections({ rows, summary });
  const reconciliationPayload = reconciliationDigestPayload(rows, summary);
  return {
    schemaVersion: RECONCILIATION_SCHEMA_VERSION,
    runtimePolicy: RECONCILIATION_RUNTIME_POLICY,
    rows,
    summary,
    inputSourceDigests: inputs.inputSourceDigests ?? [],
    digests: {
      HISTORICAL72_RECONCILIATION_SHA256: sha256(canonicalSerialize(reconciliationPayload)),
      FINAL_REPLAY_SELECTION_SHA256: frozen.digests.FINAL_REPLAY_SELECTION_SHA256,
      EXACT36_SATISFIED_SELECTION_SHA256: frozen.digests.EXACT36_SATISFIED_SELECTION_SHA256,
    },
    frozen,
  };
}

function selectionRecord(row) {
  return {
    HISTORICAL_INDEX: row.HISTORICAL_INDEX,
    STABLE_CONTRACT_IDENTITY: row.STABLE_CONTRACT_IDENTITY,
    ROLE: row.ROLE,
    ROUTE: row.ROUTE,
    SURFACE_CLASS: row.SURFACE_CLASS,
    VIEWPORT_REPRESENTATION_CLASS: row.VIEWPORT_REPRESENTATION_CLASS,
    ACTION_FAMILY: row.ACTION_FAMILY,
    USER_INTENT: row.USER_INTENT,
    BUSINESS_TARGET_TYPE: row.BUSINESS_TARGET_TYPE,
    STABLE_TARGET_KEY: row.STABLE_TARGET_KEY,
    EXPECTED_EFFECT_CLASS: row.EXPECTED_EFFECT_CLASS,
    SAFETY_CLASS: row.SAFETY_CLASS,
    PREREQUISITE_STATE_CLASS: row.PREREQUISITE_STATE_CLASS,
    FINAL_MEMBERSHIP_CLASS: row.FINAL_MEMBERSHIP_CLASS,
    MEMBERSHIP_REASON_CODE: row.MEMBERSHIP_REASON_CODE,
    EVIDENCE_SOURCE_LIST: row.EVIDENCE_SOURCE_LIST,
  };
}

export function freezeSelections({ rows, summary }) {
  const canFreeze = summary.UNRESOLVED_MEMBERSHIP_COUNT === 0
    && summary.AMBIGUOUS_FINAL_MEMBERSHIP_COUNT === 0
    && summary.MISSING_FINAL_MEMBERSHIP_COUNT === 0
    && summary.DUPLICATE_FINAL_MEMBERSHIP_COUNT === 0;
  if (!canFreeze) {
    return {
      frozen: false,
      finalReplaySelection: null,
      exact36SatisfiedSelection: null,
      digests: {
        FINAL_REPLAY_SELECTION_SHA256: null,
        EXACT36_SATISFIED_SELECTION_SHA256: null,
      },
    };
  }
  const finalReplaySelection = rows
    .filter((row) => row.FINAL_MEMBERSHIP_CLASS === "REPLAY_REQUIRED")
    .map(selectionRecord);
  const exact36SatisfiedSelection = rows
    .filter((row) => row.FINAL_MEMBERSHIP_CLASS === "SATISFIED_BY_ACCEPTED_EXACT36")
    .map(selectionRecord);
  return {
    frozen: true,
    finalReplaySelection,
    exact36SatisfiedSelection,
    digests: {
      FINAL_REPLAY_SELECTION_SHA256: sha256(canonicalSerialize(finalReplaySelection)),
      EXACT36_SATISFIED_SELECTION_SHA256: sha256(canonicalSerialize(exact36SatisfiedSelection)),
    },
  };
}

export function buildLineageManifest(reconciliation) {
  return {
    SCHEMA_VERSION: RECONCILIATION_SCHEMA_VERSION,
    RUNTIME_POLICY: RECONCILIATION_RUNTIME_POLICY,
    SOURCE_HISTORICAL_COUNT: reconciliation.summary.HISTORICAL_CANDIDATE_COUNT,
    EXACT36_OVERLAP_COUNT: reconciliation.summary.EXACT36_OVERLAP_COUNT,
    REPLAY_REQUIRED_COUNT: reconciliation.summary.REPLAY_REQUIRED_COUNT,
    SATISFIED_BY_ACCEPTED_EXACT36_COUNT: reconciliation.summary.SATISFIED_BY_ACCEPTED_EXACT36_COUNT,
    UNRESOLVED_MEMBERSHIP_COUNT: reconciliation.summary.UNRESOLVED_MEMBERSHIP_COUNT,
    HISTORICAL72_RECONCILIATION_SHA256: reconciliation.digests.HISTORICAL72_RECONCILIATION_SHA256,
    FINAL_REPLAY_SELECTION_SHA256: reconciliation.digests.FINAL_REPLAY_SELECTION_SHA256,
    EXACT36_SATISFIED_SELECTION_SHA256: reconciliation.digests.EXACT36_SATISFIED_SELECTION_SHA256,
    INPUT_SOURCE_DIGESTS: reconciliation.inputSourceDigests,
  };
}
