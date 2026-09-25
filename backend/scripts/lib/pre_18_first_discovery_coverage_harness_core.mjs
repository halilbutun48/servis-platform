const TERMINAL_STATES = new Set([
  "PROVEN_PASS",
  "PROVEN_PRODUCT_DEFECT",
  "VALIDLY_SKIPPED",
]);

const EXECUTION_STATES = [
  "DISCOVERED",
  "ATTEMPTED",
  "PROVEN_PASS",
  "PROVEN_PRODUCT_DEFECT",
  "VALIDLY_SKIPPED",
  "HARNESS_FAILURE",
  "NOT_YET_TESTED",
];

function text(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function valueOf(source, camel, upper) {
  return source?.[camel] ?? source?.[upper];
}

function controlType(control = {}) {
  return [text(control.tag), text(control.role), text(control.type)].join("/");
}

function accessibleName(control = {}) {
  return text(control.accessibleName || control.semanticName || control.label || control.href);
}

function accessibleRole(control = {}) {
  if (text(control.role)) return text(control.role);
  const tag = text(control.tag).toUpperCase();
  const type = text(control.type).toLowerCase();
  if (tag === "A") return "link";
  if (tag === "BUTTON" || tag === "SUMMARY") return "button";
  if (tag === "SELECT") return "combobox";
  if (tag === "TEXTAREA") return "textbox";
  if (tag === "INPUT" && ["checkbox", "radio"].includes(type)) return type;
  if (tag === "INPUT") return "textbox";
  return "";
}

export function semanticTargetSpec(record = {}) {
  const control = record.control || {};
  const role = accessibleRole(control);
  const name = accessibleName(control);
  if (!role || !name) return null;
  return { role, name, occurrence: Number.isInteger(control.occurrence) ? control.occurrence : 0 };
}

function contextualOwner(record = {}) {
  return text(record.contextualOwner || record.control?.contextualOwner || record.surface || record.state || "root");
}

export function buildControlId(record = {}) {
  const control = record.control || {};
  return JSON.stringify({
    v: "pre18-coverage-v1",
    role: text(record.role),
    route: text(record.route),
    viewport: text(record.viewport),
    state: text(record.state),
    surface: text(record.surface),
    controlType: controlType(control),
    accessibleName: accessibleName(control),
    contextualOwner: contextualOwner(record),
    href: text(control.href),
  });
}

function invalidProof(result, missing) {
  return {
    ...result,
    executionState: "HARNESS_FAILURE",
    EXECUTION_STATE: "HARNESS_FAILURE",
    classification: "HARNESS_DEFECT",
    CLASSIFICATION: "HARNESS_DEFECT",
    detail: `missing required rendered proof: ${missing.join(", ")}`,
  };
}

function requiresRenderedProof(result) {
  return result.executionState === "PROVEN_PASS" || result.executionState === "PROVEN_PRODUCT_DEFECT";
}

export function normalizeExecutionResult(record = {}, patch = {}) {
  const control = record.control || {};
  const sourceRecordKey = text(record.sourceRecordKey || record.key);
  const safeClassification = valueOf(patch, "safeClassification", "SAFE_CLASSIFICATION") || (control.unsafe ? "UNSAFE" : "SAFE");
  const executionState = valueOf(patch, "executionState", "EXECUTION_STATE") || "NOT_YET_TESTED";
  const classification = valueOf(patch, "classification", "CLASSIFICATION") || null;
  const evidence = valueOf(patch, "evidence", "EVIDENCE") || [];
  const result = {
    CONTROL_ID: buildControlId(record),
    SOURCE_RECORD_KEY: sourceRecordKey,
    ROLE: text(record.role),
    ROUTE: text(record.route),
    SURFACE: text(record.surface || record.state || "base"),
    VIEWPORT: text(record.viewport),
    STATE: text(record.state || "base"),
    CONTROL_TYPE: controlType(control),
    ACCESSIBLE_NAME: accessibleName(control),
    CONTEXTUAL_OWNER: contextualOwner(record),
    VISIBLE: valueOf(patch, "visible", "VISIBLE") ?? null,
    ENABLED: valueOf(patch, "enabled", "ENABLED") ?? null,
    SAFE_CLASSIFICATION: safeClassification,
    ACTION_ATTEMPTED: valueOf(patch, "actionAttempted", "ACTION_ATTEMPTED") ?? false,
    ACTION_RESULT: text(valueOf(patch, "actionResult", "ACTION_RESULT")),
    EXPECTED_EFFECT: text(valueOf(patch, "expectedEffect", "EXPECTED_EFFECT")),
    OBSERVED_EFFECT: text(valueOf(patch, "observedEffect", "OBSERVED_EFFECT")),
    CLOSE_OR_RESET_RESULT: text(valueOf(patch, "closeOrResetResult", "CLOSE_OR_RESET_RESULT")),
    EVIDENCE: evidence,
    CLASSIFICATION: classification,
    executionState,
    classification,
    sourceRecordKey,
    visible: valueOf(patch, "visible", "VISIBLE") ?? null,
    enabled: valueOf(patch, "enabled", "ENABLED") ?? null,
    safeClassification,
    actionAttempted: valueOf(patch, "actionAttempted", "ACTION_ATTEMPTED") ?? false,
    actionResult: text(valueOf(patch, "actionResult", "ACTION_RESULT")),
    expectedEffect: text(valueOf(patch, "expectedEffect", "EXPECTED_EFFECT")),
    observedEffect: text(valueOf(patch, "observedEffect", "OBSERVED_EFFECT")),
    closeOrResetResult: text(valueOf(patch, "closeOrResetResult", "CLOSE_OR_RESET_RESULT")),
    evidence,
    safetyFlowProven: Boolean(valueOf(patch, "safetyFlowProven", "SAFETY_FLOW_PROVEN")),
    unsafeMutationExecuted: Boolean(valueOf(patch, "unsafeMutationExecuted", "UNSAFE_MUTATION_EXECUTED")),
    canaryFamily: text(patch.canaryFamily),
    canarySignals: patch.canarySignals || {},
    detail: text(patch.detail),
  };

  if (!EXECUTION_STATES.includes(result.executionState)) {
    return invalidProof(result, ["valid execution state"]);
  }
  if (requiresRenderedProof(result)) {
    const missing = [];
    if (result.VISIBLE !== true) missing.push("VISIBLE=true");
    if (result.ENABLED !== true) missing.push("ENABLED=true");
    if (!result.ACTION_ATTEMPTED) missing.push("ACTION_ATTEMPTED=true");
    if (!result.ACTION_RESULT) missing.push("ACTION_RESULT");
    if (!result.EXPECTED_EFFECT) missing.push("EXPECTED_EFFECT");
    if (!result.OBSERVED_EFFECT) missing.push("OBSERVED_EFFECT");
    if (!result.EVIDENCE.length) missing.push("EVIDENCE");
    if (!result.CLASSIFICATION) missing.push("CLASSIFICATION");
    if (missing.length) return invalidProof(result, missing);
  }
  return result;
}

export function isRetryable(result = {}) {
  return !TERMINAL_STATES.has(result.executionState);
}

export function rolesNeedingExecution(records = []) {
  return [...new Set(records.filter(isRetryable).map((record) => text(record.role || record.ROLE)).filter(Boolean))].sort();
}

function hasReusableTerminalProof(result = {}) {
  if (result.executionState === "PROVEN_PASS" || result.executionState === "PROVEN_PRODUCT_DEFECT") {
    return result.VISIBLE === true
      && result.ENABLED === true
      && result.ACTION_ATTEMPTED === true
      && Boolean(result.ACTION_RESULT)
      && Boolean(result.EXPECTED_EFFECT)
      && Boolean(result.OBSERVED_EFFECT)
      && Array.isArray(result.EVIDENCE)
      && result.EVIDENCE.length > 0
      && Boolean(result.CLASSIFICATION);
  }
  return result.executionState === "VALIDLY_SKIPPED"
    && result.CLASSIFICATION === "NOT_SAFE_TO_EXECUTE_FULLY"
    && result.safetyFlowProven === true;
}

export function prepareCoverageRecords(records = [], priorCheckpoint = {}) {
  const priorById = new Map((priorCheckpoint.controls || []).map((item) => [item.CONTROL_ID, item]));
  const priorBySourceRecord = new Map((priorCheckpoint.controls || [])
    .filter((item) => item.SOURCE_RECORD_KEY)
    .map((item) => [item.SOURCE_RECORD_KEY, item]));
  return records.map((record) => {
    const sourceRecordKey = text(record.sourceRecordKey || record.key);
    const prior = priorById.get(buildControlId(record)) || priorBySourceRecord.get(sourceRecordKey);
    if (prior && hasReusableTerminalProof(prior)) {
      const contextualRecord = prior.CONTEXTUAL_OWNER
        ? { ...record, contextualOwner: prior.CONTEXTUAL_OWNER }
        : record;
      return { ...contextualRecord, ...normalizeExecutionResult(contextualRecord, prior), resumed: true };
    }
    return { ...record, ...normalizeExecutionResult(record, {
      executionState: "NOT_YET_TESTED",
      classification: null,
      safeClassification: record.control?.unsafe ? "UNSAFE" : "SAFE",
      detail: prior ? "prior result is not reusable proof" : "not yet attempted",
    }) };
  });
}

export function buildCheckpoint(records = []) {
  const counts = Object.fromEntries(EXECUTION_STATES.map((state) => [state, 0]));
  for (const record of records) counts[record.executionState] = (counts[record.executionState] || 0) + 1;
  const terminalClassified = counts.PROVEN_PASS + counts.PROVEN_PRODUCT_DEFECT + counts.VALIDLY_SKIPPED;
  return {
    schemaVersion: "pre18-coverage-checkpoint-v1",
    progress: {
      meaning: "terminal classified controls, never loop iterations",
      inventory: records.length,
      terminalClassified,
      remaining: records.length - terminalClassified,
    },
    counts: { ...counts, TERMINAL_CLASSIFIED_COUNT: terminalClassified, RETRYABLE_COUNT: records.filter(isRetryable).length },
    controls: records.map((record) => ({ ...record, retryable: isRetryable(record) })),
  };
}

export function summarizeCoverage(records = []) {
  const safe = records.filter((record) => record.safeClassification === "SAFE");
  const unsafe = records.filter((record) => record.safeClassification === "UNSAFE");
  const safeProven = safe.filter((record) => record.executionState === "PROVEN_PASS" && record.classification === "PASS");
  const unsafeSafetyProven = unsafe.filter((record) => record.safetyFlowProven && record.executionState === "VALIDLY_SKIPPED" && record.classification === "NOT_SAFE_TO_EXECUTE_FULLY");
  return {
    VISIBLE_INTERACTIVE_CONTROL_INVENTORY_COUNT: records.length,
    SAFE_VISIBLE_INTERACTIVE_CONTROL_COUNT: safe.length,
    SAFE_VISIBLE_INTERACTIVE_CONTROL_TESTED_COUNT: safeProven.length,
    UNTESTED_SAFE_VISIBLE_CONTROL_COUNT: safe.length - safeProven.length,
    UNSAFE_VISIBLE_CONTROL_COUNT: unsafe.length,
    UNSAFE_CONTROL_SAFETY_FLOW_TESTED_COUNT: unsafeSafetyProven.length,
    UNSAFE_CONTROL_UNTESTED_COUNT: unsafe.length - unsafeSafetyProven.length,
    UNSAFE_CONTROL_ACCIDENTALLY_EXECUTED_COUNT: unsafe.filter((record) => record.unsafeMutationExecuted).length,
  };
}

function isCanaryProof(record) {
  if (record.safeClassification === "SAFE") {
    return record.executionState === "PROVEN_PASS" && record.classification === "PASS";
  }
  return record.executionState === "VALIDLY_SKIPPED"
    && record.classification === "NOT_SAFE_TO_EXECUTE_FULLY"
    && record.safetyFlowProven;
}

export function evaluateCanary(records = [], requiredFamilies = []) {
  const targeted = [...new Set(records.map((record) => record.canaryFamily).filter(Boolean))];
  const proven = [...new Set(records.filter(isCanaryProof).map((record) => record.canaryFamily).filter(Boolean))];
  const missing = requiredFamilies.filter((family) => !proven.includes(family));
  const harnessFailures = records.filter((record) => record.executionState === "HARNESS_FAILURE");
  const productDefectCandidates = records.filter((record) => record.executionState === "PROVEN_PRODUCT_DEFECT");
  return {
    status: missing.length || harnessFailures.length || productDefectCandidates.length ? "NOT_GREEN" : "GREEN",
    targeted,
    proven,
    missing,
    harnessFailures,
    productDefectCandidates,
  };
}
