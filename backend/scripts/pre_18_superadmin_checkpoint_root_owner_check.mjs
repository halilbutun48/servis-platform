import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import * as hybrid from "./lib/pre_18_hybrid_surface_state_executor.mjs";

const cases = [];
const test = (name, fn) => cases.push({ name, fn });

function contract(index, overrides = {}) {
  return hybrid.captureActionContract({
    role: "SUPER_ADMIN",
    route: "/superadmin",
    viewport: "desktop",
    surface: { id: "SUPER_ADMIN|/superadmin|desktop|base", title: "base" },
    materialState: { activeTab: "Sistem Detayları", ...(overrides.materialState || {}) },
    action: {
      role: "button",
      name: `Eylem ${index}`,
      userMeaning: `Eylem ${index}`,
      expectedEffectClass: "RENDERED_TRANSITION",
      safetyClass: "SAFE",
      ...(overrides.action || {}),
    },
    owner: { type: "section", label: `Bölüm ${index}`, ...(overrides.owner || {}) },
  });
}

function terminal(record, state = "PROVEN_PASS") {
  const classification = state === "PROVEN_PRODUCT_DEFECT" ? "PRODUCT_DEFECT"
    : state === "NOT_SAFE_TO_EXECUTE_FULLY" ? "NOT_SAFE_TO_EXECUTE_FULLY"
      : state === "VALIDLY_SKIPPED" ? "CURRENT_SEMANTIC_ABSENCE" : "PASS";
  return {
    ...record,
    executionState: state,
    EXECUTION_STATE: state,
    classification,
    CLASSIFICATION: classification,
    visible: true,
    enabled: true,
    actionAttempted: true,
    actionResult: state === "NOT_SAFE_TO_EXECUTE_FULLY" ? "confirmation-dismissed" : "rendered-transition",
    expectedEffect: "rendered-transition",
    observedEffect: "rendered-transition-observed",
    safetyFlowProven: state === "NOT_SAFE_TO_EXECUTE_FULLY",
    unsafeMutationExecuted: false,
    evidence: ["evidence.png"],
  };
}

function failure(record, state = "HARNESS_FAILURE") {
  return {
    ...record,
    executionState: state,
    EXECUTION_STATE: state,
    classification: state === "HARNESS_FAILURE" ? "HARNESS_DEFECT" : null,
    CLASSIFICATION: state === "HARNESS_FAILURE" ? "HARNESS_DEFECT" : null,
    visible: true,
    enabled: true,
    actionAttempted: state === "ATTEMPTED",
    evidence: [],
  };
}

function merge(previous, current) {
  return hybrid.mergeActionCheckpoints(
    hybrid.buildActionCheckpoint(previous, { runId: "before", runKind: "SELF_CHECK" }),
    current,
    { runId: "after", runKind: "SELF_CHECK" },
  );
}

test("A partial enumeration cannot replace the 73 known action contracts", () => {
  const previous = Array.from({ length: 73 }, (_, index) => failure(contract(index)));
  const current = previous.slice(0, 46);
  assert.equal(merge(previous, current).actions.length, 73);
});

test("B a PROVEN_PASS survives resume", () => {
  const prior = terminal(contract(1));
  assert.equal(merge([prior], []).actions[0].executionState, "PROVEN_PASS");
});

test("C a PRODUCT_DEFECT terminal survives resume", () => {
  const prior = terminal(contract(2), "PROVEN_PRODUCT_DEFECT");
  assert.equal(merge([prior], []).actions[0].executionState, "PROVEN_PRODUCT_DEFECT");
});

test("D an unsafe safety-boundary terminal survives resume", () => {
  const prior = terminal(contract(3, { action: { safetyClass: "UNSAFE" } }), "NOT_SAFE_TO_EXECUTE_FULLY");
  assert.equal(merge([prior], []).actions[0].executionState, "NOT_SAFE_TO_EXECUTE_FULLY");
});

test("E HARNESS_FAILURE remains retryable", () => {
  const prior = failure(contract(4));
  const result = merge([prior], []);
  assert.equal(result.actions[0].executionState, "HARNESS_FAILURE");
  assert.equal(result.actions[0].retryable, true);
});

test("F NOT_YET_TESTED survives resume", () => {
  const prior = failure(contract(5), "NOT_YET_TESTED");
  assert.equal(merge([prior], []).actions[0].executionState, "NOT_YET_TESTED");
});

test("G a newly discovered action is unioned without deleting old records", () => {
  const prior = [terminal(contract(6))];
  const added = failure(contract(7));
  const result = merge(prior, [added]);
  assert.equal(result.actions.length, 2);
  assert.ok(result.actions.some((item) => item.ACTION_CONTRACT_ID === prior[0].ACTION_CONTRACT_ID));
  assert.ok(result.actions.some((item) => item.ACTION_CONTRACT_ID === added.ACTION_CONTRACT_ID));
});

test("H conflicting terminal results resolve deterministically without dropping evidence", () => {
  const prior = terminal(contract(8));
  const incoming = terminal(contract(8), "PROVEN_PRODUCT_DEFECT");
  const result = merge([prior], [incoming]).actions[0];
  assert.equal(result.executionState, "PROVEN_PASS");
  assert.equal(result.terminalConflict?.incomingState, "PROVEN_PRODUCT_DEFECT");
});

test("I a partial run cannot reduce the known contract set", () => {
  const prior = Array.from({ length: 4 }, (_, index) => failure(contract(10 + index)));
  const result = merge(prior, [terminal(prior[0])]);
  assert.equal(result.actions.length, 4);
});

test("J atomic persistence leaves a complete canonical checkpoint", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "pre18-checkpoint-"));
  const file = path.join(directory, "canonical.json");
  const checkpoint = hybrid.buildActionCheckpoint([terminal(contract(20))], { runId: "atomic", runKind: "SELF_CHECK" });
  const replacement = hybrid.buildActionCheckpoint([terminal(contract(21))], { runId: "atomic", runKind: "SELF_CHECK" });
  await hybrid.atomicWriteJson(file, checkpoint);
  const circular = { replacement }; circular.self = circular;
  await assert.rejects(() => hybrid.atomicWriteJson(file, circular));
  assert.deepEqual(JSON.parse(await fs.readFile(file, "utf8")), checkpoint, "a pre-replace write failure must retain the prior valid checkpoint");
  await hybrid.atomicWriteJson(file, replacement);
  assert.deepEqual(JSON.parse(await fs.readFile(file, "utf8")), replacement);
  assert.equal((await fs.readdir(directory)).filter((name) => name.includes(".tmp")).length, 0);
  await fs.rm(directory, { recursive: true, force: true });
});

test("K immutable run history cannot be overwritten", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "pre18-immutable-"));
  const file = path.join(directory, "history.json");
  await hybrid.writeImmutableJson(file, { version: 1 });
  await assert.rejects(() => hybrid.writeImmutableJson(file, { version: 2 }));
  await fs.rm(directory, { recursive: true, force: true });
});

test("L schema differences do not silently delete known records", () => {
  const prior = hybrid.buildActionCheckpoint([terminal(contract(30))], { runId: "old", runKind: "SELF_CHECK" });
  prior.schemaVersion = "pre18-hybrid-surface-state-checkpoint-v0";
  const result = hybrid.mergeActionCheckpoints(prior, [], { runId: "new", runKind: "SELF_CHECK" });
  assert.equal(result.actions.length, 1);
  assert.equal(result.previousSchemaVersion, "pre18-hybrid-surface-state-checkpoint-v0");
});

test("M an action inside a labelled section never falls back to root", () => {
  const outcome = hybrid.classifyRootOwnerFallback([{ type: "section", semanticLabel: "İşlem kayıtları", depth: 1 }], { role: "button", name: "Dışa aktar" });
  assert.equal(outcome.owner.label, "İşlem kayıtları");
  assert.equal(outcome.classification, "LOCAL_OWNER");
});

test("N a local navigation item never falls back to root", () => {
  const outcome = hybrid.classifyRootOwnerFallback([{ type: "navigation", semanticLabel: "SİSTEM › İşlem Kayıtları", depth: 0 }], { role: "button", name: "İşlem Kayıtları" });
  assert.equal(outcome.owner.label, "SİSTEM › İşlem Kayıtları");
  assert.equal(outcome.classification, "LOCAL_OWNER");
});

test("O a row action retains the row owner", () => {
  const outcome = hybrid.classifyRootOwnerFallback([{ type: "table-row", semanticLabel: "Kayıt: 42", depth: 1 }], { role: "button", name: "Aç" });
  assert.equal(outcome.owner.type, "table-row");
});

test("P a card-local action retains the card owner", () => {
  const outcome = hybrid.classifyRootOwnerFallback([{ type: "card", semanticLabel: "Ticari özet", depth: 1 }], { role: "button", name: "İncele" });
  assert.equal(outcome.owner.type, "card");
});

test("Q a form-local action retains the form owner", () => {
  const outcome = hybrid.classifyRootOwnerFallback([{ type: "form", semanticLabel: "Filtreler", depth: 1 }], { role: "button", name: "Uygula" });
  assert.equal(outcome.owner.type, "form");
});

test("R two ambiguous root actions never collide into a PASS", () => {
  const outcome = hybrid.classifyRootOwnerFallback([], { role: "button", name: "Aç", globalUnique: false });
  assert.equal(outcome.classification, "HARNESS_OWNER_FAILURE");
});

test("S a unique global action may use root", () => {
  const outcome = hybrid.classifyRootOwnerFallback([], { role: "button", name: "Yenile", globalUnique: true });
  assert.equal(outcome.classification, "LEGITIMATE_ROOT_OWNER");
});

test("T an unlabelled ambiguous action is an accessibility candidate", () => {
  const outcome = hybrid.classifyRootOwnerFallback([], { role: "button", name: null, globalUnique: false });
  assert.equal(outcome.classification, "ACCESSIBILITY_PRODUCT_DEFECT_CANDIDATE");
});

test("U an idempotent corrective sources historical root failures from immutable legacy evidence", () => {
  const historicalRootFailure = failure(contract(40, { owner: { type: "surface", label: "root" } }));
  const legacy = hybrid.buildActionCheckpoint([historicalRootFailure], { runId: "legacy", runKind: "SELF_CHECK" });
  const canonical = hybrid.buildActionCheckpoint([
    terminal({ ...historicalRootFailure, executionState: "VALIDLY_SKIPPED", EXECUTION_STATE: "VALIDLY_SKIPPED" }, "VALIDLY_SKIPPED"),
  ], { runId: "canonical", runKind: "SELF_CHECK" });
  assert.equal(hybrid.selectHistoricalRootOwnerFailures(legacy).length, 1);
  assert.equal(hybrid.selectHistoricalRootOwnerFailures(canonical).length, 0);
});

let failures = 0;
for (const item of cases) {
  try {
    await item.fn();
    console.log(`PASS ${item.name}`);
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${item.name}: ${error.message}`);
  }
}

console.log(`PRE_18_SUPERADMIN_CHECKPOINT_ROOT_OWNER_CHECK=${failures ? "RED" : "PASS"} (${failures}/${cases.length})`);
if (failures) process.exitCode = 1;
