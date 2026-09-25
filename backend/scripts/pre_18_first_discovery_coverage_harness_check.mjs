import assert from "node:assert/strict";
import {
  buildControlId,
  buildCheckpoint,
  evaluateCanary,
  normalizeExecutionResult,
  prepareCoverageRecords,
  rolesNeedingExecution,
  semanticTargetSpec,
  summarizeCoverage,
} from "./lib/pre_18_first_discovery_coverage_harness_core.mjs";

const base = {
  role: "ROOM",
  route: "/room/shifts",
  viewport: "desktop",
  state: "base",
  surface: "Shift list",
  control: {
    tag: "BUTTON",
    role: "tab",
    type: "button",
    accessibleName: "Aktif seferler",
    contextualOwner: "Seferler çalışma alanı",
  },
};

function record(overrides = {}) {
  return {
    ...base,
    ...overrides,
    control: { ...base.control, ...(overrides.control || {}) },
  };
}

function provedSafe(overrides = {}) {
  return normalizeExecutionResult(record(overrides), {
    executionState: "PROVEN_PASS",
    classification: "PASS",
    visible: true,
    enabled: true,
    safeClassification: "SAFE",
    actionAttempted: true,
    actionResult: "CLICKED",
    expectedEffect: "Selected tab becomes active",
    observedEffect: "aria-selected changed to true",
    closeOrResetResult: "NOT_REQUIRED",
    evidence: [{ kind: "aria-selected", before: "false", after: "true" }],
  });
}

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}: ${error.message}`);
    process.exitCode = 1;
  }
}

run("stable control identity separates role route viewport state and contextual owner", () => {
  const id = buildControlId(record());
  assert.notEqual(id, buildControlId(record({ role: "COMPANY" })));
  assert.notEqual(id, buildControlId(record({ route: "/room/agreements" })));
  assert.notEqual(id, buildControlId(record({ viewport: "mobile" })));
  assert.notEqual(id, buildControlId(record({ state: "drawer-open" })));
  assert.notEqual(id, buildControlId(record({ control: { contextualOwner: "Başka çalışma alanı" } })));
  assert.equal(id, buildControlId(record()));
});

run("coverage counts only rendered proof and separately counts unsafe safety boundaries", () => {
  const safePass = provedSafe();
  const safeAttempted = normalizeExecutionResult(record({ control: { accessibleName: "Filtrele" } }), {
    executionState: "ATTEMPTED",
    classification: "HARNESS_DEFECT",
    safeClassification: "SAFE",
  });
  const unsafeBoundary = normalizeExecutionResult(record({ control: { accessibleName: "Sil" } }), {
    executionState: "VALIDLY_SKIPPED",
    classification: "NOT_SAFE_TO_EXECUTE_FULLY",
    visible: true,
    enabled: true,
    safeClassification: "UNSAFE",
    actionAttempted: true,
    actionResult: "CONFIRMATION_OPENED",
    expectedEffect: "Confirmation appears without deletion",
    observedEffect: "Confirmation dialog appeared and was cancelled",
    closeOrResetResult: "CANCELLED",
    safetyFlowProven: true,
    evidence: [{ kind: "dialog", before: 0, after: 1 }],
  });
  const unsafeUnproven = normalizeExecutionResult(record({ control: { accessibleName: "Öde" } }), {
    executionState: "VALIDLY_SKIPPED",
    classification: "NOT_SAFE_TO_EXECUTE_FULLY",
    safeClassification: "UNSAFE",
  });

  const summary = summarizeCoverage([safePass, safeAttempted, unsafeBoundary, unsafeUnproven]);
  assert.equal(summary.SAFE_VISIBLE_INTERACTIVE_CONTROL_COUNT, 2);
  assert.equal(summary.SAFE_VISIBLE_INTERACTIVE_CONTROL_TESTED_COUNT, 1);
  assert.equal(summary.UNTESTED_SAFE_VISIBLE_CONTROL_COUNT, 1);
  assert.equal(summary.UNSAFE_VISIBLE_CONTROL_COUNT, 2);
  assert.equal(summary.UNSAFE_CONTROL_SAFETY_FLOW_TESTED_COUNT, 1);
  assert.equal(summary.UNSAFE_CONTROL_UNTESTED_COUNT, 1);
  assert.equal(summary.UNSAFE_CONTROL_ACCIDENTALLY_EXECUTED_COUNT, 0);
});

run("missing observed effect is never normalized as a proven pass", () => {
  const result = normalizeExecutionResult(record(), {
    executionState: "PROVEN_PASS",
    classification: "PASS",
    safeClassification: "SAFE",
    visible: true,
    enabled: true,
    actionAttempted: true,
    actionResult: "CLICKED",
    expectedEffect: "Drawer opens",
    evidence: [{ kind: "click" }],
  });
  assert.equal(result.executionState, "HARNESS_FAILURE");
  assert.equal(result.classification, "HARNESS_DEFECT");
});

run("checkpoint preserves terminal evidence and marks failures as retryable", () => {
  const proven = provedSafe();
  const failed = normalizeExecutionResult(record({ viewport: "mobile" }), {
    executionState: "HARNESS_FAILURE",
    classification: "HARNESS_DEFECT",
    safeClassification: "SAFE",
  });
  const checkpoint = buildCheckpoint([proven, failed]);
  assert.equal(checkpoint.counts.PROVEN_PASS, 1);
  assert.equal(checkpoint.counts.HARNESS_FAILURE, 1);
  assert.equal(checkpoint.counts.RETRYABLE_COUNT, 1);
  assert.equal(checkpoint.controls.find((item) => item.executionState === "PROVEN_PASS").retryable, false);
  assert.equal(checkpoint.controls.find((item) => item.executionState === "HARNESS_FAILURE").retryable, true);
});

run("resume reuses only a terminal result with the exact contextual control identity", () => {
  const desktop = record();
  const mobile = record({ viewport: "mobile" });
  const expanded = record({ state: "details-open" });
  const prior = buildCheckpoint([provedSafe()]);
  const planned = prepareCoverageRecords([desktop, mobile, expanded], prior);

  assert.equal(planned.length, 3);
  assert.equal(planned.find((item) => item.VIEWPORT === "desktop" && item.STATE === "base").executionState, "PROVEN_PASS");
  assert.equal(planned.find((item) => item.VIEWPORT === "desktop" && item.STATE === "base").control.accessibleName, "Aktif seferler");
  assert.equal(planned.find((item) => item.VIEWPORT === "mobile").executionState, "NOT_YET_TESTED");
  assert.equal(planned.find((item) => item.STATE === "details-open").executionState, "NOT_YET_TESTED");
});

run("resume reuses an unsafe result only after its cancellable safety boundary is proven", () => {
  const unsafeRecord = record({ control: { accessibleName: "Sil", unsafe: true } });
  const safetyProof = normalizeExecutionResult(unsafeRecord, {
    executionState: "VALIDLY_SKIPPED",
    classification: "NOT_SAFE_TO_EXECUTE_FULLY",
    visible: true,
    enabled: true,
    safeClassification: "UNSAFE",
    actionAttempted: true,
    actionResult: "CONFIRMATION_DISMISSED",
    expectedEffect: "Cancellable confirmation appears before mutation",
    observedEffect: "Confirmation was dismissed and no mutation occurred",
    closeOrResetResult: "CONFIRMATION_DISMISSED",
    safetyFlowProven: true,
    evidence: [{ kind: "native-confirmation" }],
  });
  const planned = prepareCoverageRecords([unsafeRecord], buildCheckpoint([safetyProof]));
  assert.equal(planned[0].executionState, "VALIDLY_SKIPPED");
  assert.equal(planned[0].safetyFlowProven, true);
});

run("resume locates a prior contextual proof through its immutable source inventory record", () => {
  const sourceRecord = record({ key: "ROOM|/room/shifts|desktop|route-row-0" });
  const contextualRecord = record({
    key: sourceRecord.key,
    contextualOwner: "Sefer satırı: Denizli merkez",
  });
  const prior = buildCheckpoint([provedSafe({
    key: contextualRecord.key,
    contextualOwner: contextualRecord.contextualOwner,
  })]);
  const planned = prepareCoverageRecords([sourceRecord], prior);

  assert.equal(planned[0].executionState, "PROVEN_PASS");
  assert.equal(planned[0].CONTEXTUAL_OWNER, "Sefer satırı: Denizli merkez");
});

run("login planning requests sessions only for records that still need execution", () => {
  const proven = provedSafe({ role: "SUPER_ADMIN" });
  const pendingRoom = normalizeExecutionResult(record({ role: "ROOM" }), {
    executionState: "NOT_YET_TESTED",
    safeClassification: "SAFE",
  });
  const pendingAdmin = normalizeExecutionResult(record({ role: "SUPER_ADMIN", viewport: "mobile" }), {
    executionState: "HARNESS_FAILURE",
    classification: "HARNESS_DEFECT",
    safeClassification: "SAFE",
  });
  assert.deepEqual(rolesNeedingExecution([proven, pendingRoom, pendingAdmin]), ["ROOM", "SUPER_ADMIN"]);
});

run("semantic target planning prefers the accessible role name and scoped occurrence", () => {
  assert.deepEqual(semanticTargetSpec(record()), {
    role: "tab",
    name: "Aktif seferler",
    occurrence: 0,
  });
  assert.deepEqual(semanticTargetSpec(record({ control: { tag: "BUTTON", role: "", type: "button", accessibleName: "Denetim Paneli", occurrence: 2 } })), {
    role: "button",
    name: "Denetim Paneli",
    occurrence: 2,
  });
});

run("canary cannot report green until every required interaction family has proof", () => {
  const families = [
    "accordion",
    "dropdown",
    "tab",
    "drawer",
    "modal",
    "filter-or-search",
    "table",
    "form-validation-cancel",
    "unsafe-boundary-cancel",
    "navigation",
  ];
  const records = families.map((canaryFamily) => {
    if (canaryFamily === "unsafe-boundary-cancel") {
      return normalizeExecutionResult(record({ control: { accessibleName: "Sil" } }), {
        executionState: "VALIDLY_SKIPPED",
        classification: "NOT_SAFE_TO_EXECUTE_FULLY",
        safeClassification: "UNSAFE",
        visible: true,
        enabled: true,
        actionAttempted: true,
        actionResult: "CONFIRMATION_OPENED",
        expectedEffect: "Confirmation is cancellable",
        observedEffect: "Confirmation was cancelled",
        closeOrResetResult: "CANCELLED",
        safetyFlowProven: true,
        evidence: [{ kind: "dialog" }],
        canaryFamily,
      });
    }
    return { ...provedSafe({ control: { accessibleName: canaryFamily } }), canaryFamily };
  });
  const green = evaluateCanary(records, families);
  assert.equal(green.status, "GREEN");
  assert.equal(green.proven.length, families.length);

  const incomplete = evaluateCanary(records.filter((item) => item.canaryFamily !== "drawer"), families);
  assert.equal(incomplete.status, "NOT_GREEN");
  assert.deepEqual(incomplete.missing, ["drawer"]);
});

run("normalized canary proof retains family signals for authoritative category counters", () => {
  const result = normalizeExecutionResult(record(), {
    executionState: "PROVEN_PASS",
    classification: "PASS",
    safeClassification: "SAFE",
    visible: true,
    enabled: true,
    actionAttempted: true,
    actionResult: "OPENED_AND_CLOSED",
    expectedEffect: "Drawer opens and closes",
    observedEffect: "visible then hidden",
    closeOrResetResult: "CLOSED",
    evidence: [{ kind: "drawer" }],
    canaryFamily: "drawer",
    canarySignals: { opened: true, closedAgain: true },
  });
  assert.deepEqual(result.canarySignals, { opened: true, closedAgain: true });
});

if (!process.exitCode) console.log("PRE_18_FIRST_DISCOVERY_COVERAGE_HARNESS_CORE_CHECK=PASS");
