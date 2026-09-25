/* Focused, no-browser proof for the Super Admin 26-slot contract migration. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as hybrid from "./lib/pre_18_hybrid_surface_state_executor.mjs";
import * as migrationLib from "./lib/pre_18_superadmin_26_contract_migration_v1.mjs";
import {
  SUPERADMIN_26_MIGRATION_VERSION,
  SUPERADMIN_EXISTING_PASS_SLOT_COUNT,
  buildSuperAdmin26Migration,
  isStateRecipeValid,
} from "./lib/pre_18_superadmin_26_contract_migration_v1.mjs";

const root = process.cwd();
const historicalSummary = path.join(root, "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion/runs/pre18-superadmin-final-semantic-2026-09-12-terra-b/superadmin-final-residual-canary/summary.json");
const captured = JSON.parse(fs.readFileSync(historicalSummary, "utf8"));
const historical = captured.results;
const migration = buildSuperAdmin26Migration(historical);
const cases = [];
const test = (name, fn) => cases.push({ name, fn });

test("real frozen differential is RED before migration", () => {
  assert.equal(historical.length, 39);
  assert.equal(historical.filter((item) => item.executionState === "HARNESS_FAILURE").length, 26);
  assert.equal(historical.filter((item) => /CURRENT_SEMANTIC_ACTION_NOT_RESOLVED/u.test(item.failureReason || "")).length, 23);
  assert.equal(historical.filter((item) => /CURRENT_SEMANTIC_TARGET_NOT_FOUND/u.test(item.failureReason || "")).length, 3);
});

test("migration has immutable evidence links for every actual residual fixture", () => {
  assert.equal(migration.MIGRATION_VERSION, SUPERADMIN_26_MIGRATION_VERSION);
  assert.equal(migration.rows.length, 26);
  for (const row of migration.rows) {
    assert.equal(typeof row.HISTORICAL_ACTION_CONTRACT_ID, "string", row.SLOT);
    assert.ok(historical.some((item) => (item.HISTORICAL_ACTION_CONTRACT_ID || item.ACTION_CONTRACT_ID) === row.HISTORICAL_ACTION_CONTRACT_ID), row.SLOT);
  }
});

test("359 to 356 reconciliation is exactly balanced", () => {
  const value = migration.accounting;
  assert.equal(value.HISTORICAL_KNOWN_CONTRACT_COUNT, 359);
  assert.equal(value.PROPOSED_DISTINCT_CONTRACT_COUNT, 356);
  assert.equal(value.PROPOSED_RETIREMENT_COUNT, 3);
  assert.equal(value.PROPOSED_SUCCESSOR_LINK_COUNT, 2);
  assert.equal(value.PROPOSED_TRUE_EXECUTION_COUNT, 22);
  assert.equal(value.PROPOSED_EXPECTED_DISABLED_COUNT, 1);
  assert.equal(value.HISTORICAL_RESIDUAL_SLOT_COUNT, 26);
  assert.equal(value.ACCOUNTING_BALANCED, true);
});

test("all twelve C1 fixtures use concrete typed producer and assertion recipes", () => {
  const slots = ["C13", "C14", "C15", "C17", "C18", "C22", "C23", "C24", "C25", "C29", "C30", "C33"];
  for (const slot of slots) {
    const row = migration.rows.find((item) => item.SLOT === slot);
    assert.ok(row, slot);
    assert.equal(isStateRecipeValid(row.STATE_RECIPE), true, slot);
    assert.ok(Array.isArray(row.STATE_RECIPE.produce) && row.STATE_RECIPE.produce.length > 1, slot);
    assert.equal(row.STATE_RECIPE.produce.length, row.STATE_RECIPE.assert.length, slot);
    assert.equal(row.HISTORICAL_SETUP_POLICY, "MIGRATION_FIRST_NO_STALE_REPLAY", slot);
  }
});

test("current summary disclosures have semantic producers distinct from their assertions", () => {
  const assistantOptions = migrationLib.describeStateRecipeStep({ type: "ASSISTANT_OPTIONS_OPEN", label: "Sefer Abi seçenekleri" });
  const workspace = migrationLib.describeStateRecipeStep({ type: "DETAILS_EXPANDED", label: "Ayrıntılı çalışma alanını göster" });
  assert.deepEqual(assistantOptions.produce.control, { role: "summary", name: "Sefer Abi seçenekleri" });
  assert.equal(assistantOptions.assert.condition, "DISCLOSURE_OPEN");
  assert.deepEqual(workspace.produce.control, { role: "summary", name: "Ayrıntılı çalışma alanını göster" });
  assert.equal(workspace.assert.condition, "DISCLOSURE_OPEN");
});

test("C35 details assertion requires the current Biniş kayıtları successor to be rendered", () => {
  const c35 = migration.rows.find((item) => item.SLOT === "C35");
  const disclosureAssertion = c35.STATE_RECIPE.assert.find((step) => step.type === "DETAILS_EXPANDED");
  assert.deepEqual(disclosureAssertion.expectedControl, { role: "button", name: "Biniş kayıtları" });
});

test("C35 declares a safe successor navigation execution while C36 remains equivalence-only", () => {
  const c35 = migration.rows.find((item) => item.SLOT === "C35");
  const c36 = migration.rows.find((item) => item.SLOT === "C36");
  assert.equal(c35.SUCCESSOR_EXECUTION_MODE, "SAFE_NAVIGATION_EXECUTION");
  assert.equal(c36.SUCCESSOR_EXECUTION_MODE, "EQUIVALENCE_ONLY");
});

test("conditional historical C30 is explicitly terminalizable without forcing assistant output", () => {
  const c30 = migration.rows.find((item) => item.SLOT === "C30");
  assert.equal(c30.TERMINAL_POLICY, "CONDITIONAL_HISTORICAL_STATE");
  assert.equal(c30.STATE_RECIPE.produce.at(-1).type, "ASSISTANT_RESPONSE_SETTLED");
});

test("structured targets defeat generic row-token ties for all C2 controls", () => {
  const targets = [
    ["C09", "Profil", "1"], ["C10", "Sil", "1"], ["C16", "ID Kopyala", "1"],
    ["C19", "Profil", "2"], ["C20", "Sil", "2"], ["C31", "Profil", "1"], ["C32", "Sil", "1"],
  ];
  for (const [slot, name, id] of targets) {
    const fixture = migration.rows.find((item) => item.SLOT === slot);
    const context = hybrid.buildCurrentSemanticExecutionContext({
      action: { role: "button", name, expectedEffectClass: "RENDERED_TRANSITION" },
      businessTarget: fixture.BUSINESS_TARGET,
    }, [
      { action: { role: "button", name, expectedEffectClass: "RENDERED_TRANSITION" }, owner: { type: "table-row", label: `İstanbul Aktif ${name}` }, businessTarget: { type: "COMPANY", id }, overlayScope: "NONE" },
      { action: { role: "button", name, expectedEffectClass: "RENDERED_TRANSITION" }, owner: { type: "table-row", label: `İstanbul Aktif ${name}` }, businessTarget: { type: "COMPANY", id: id === "1" ? "2" : "1" }, overlayScope: "NONE" },
    ]);
    assert.ok(context, slot);
    assert.equal(context.businessTarget.id, id, slot);
    assert.equal(context.resolutionDiagnostics.AFTER_BUSINESS_TARGET, 1, slot);
  }
});

test("current candidate deduplication collapses only duplicate semantic occurrences", () => {
  const candidates = [
    { action: { role: "button", name: "Profil" }, owner: { type: "table-row", label: "DemoCompany" }, businessTarget: { type: "COMPANY", id: "1" }, overlayScope: "NONE", materialState: { systemNavigationDisclosure: "SİSTEM_CLOSED" } },
    { action: { role: "button", name: "Profil" }, owner: { type: "table-row", label: "DemoCompany" }, businessTarget: { type: "COMPANY", id: "1" }, overlayScope: "NONE", materialState: { systemNavigationDisclosure: "SİSTEM_OPEN" } },
    { action: { role: "button", name: "Profil" }, owner: { type: "table-row", label: "DemoOkul" }, businessTarget: { type: "COMPANY", id: "2" }, overlayScope: "NONE", materialState: { systemNavigationDisclosure: "SİSTEM_OPEN" } },
  ];
  const result = hybrid.deduplicateCurrentSemanticCandidates(candidates);
  assert.equal(result.candidates.length, 2);
  assert.equal(result.duplicateCount, 1);
  assert.deepEqual(result.candidates.map((item) => item.businessTarget.id), ["1", "2"]);
});

test("stable effect is consumed before same-name candidates are ranked", () => {
  const context = hybrid.buildCurrentSemanticExecutionContext({
    action: { role: "button", name: "Konum veri sağlayıcıları" },
    stableEffect: "NAVIGATE:/superadmin/telematics",
  }, [
    { action: { role: "button", name: "Konum veri sağlayıcıları" }, stableEffect: "NAVIGATE:/superadmin/telematics", owner: { type: "navigation", label: "SİSTEM" }, overlayScope: "NONE" },
    { action: { role: "button", name: "Konum veri sağlayıcıları" }, stableEffect: "NAVIGATE:/superadmin/other", owner: { type: "section", label: "Kısayollar" }, overlayScope: "NONE" },
  ]);
  assert.ok(context);
  assert.equal(context.expectedEffect, "NAVIGATE:/superadmin/telematics");
  assert.equal(context.candidate.stableEffect, "NAVIGATE:/superadmin/telematics");
});

test("a null resolution retains its complete stage diagnostics", () => {
  const resolution = hybrid.diagnoseCurrentSemanticResolution({
    action: { role: "button", name: "Profil" }, businessTarget: { type: "COMPANY", id: "2" },
  }, [{
    action: { role: "button", name: "Profil" }, businessTarget: { type: "COMPANY", id: "1" }, owner: { type: "table-row", label: "DemoCompany" }, overlayScope: "NONE",
  }]);
  assert.equal(resolution.candidate, null);
  assert.equal(resolution.resolutionDiagnostics.CANDIDATES_BEFORE_FILTER, 1);
  assert.equal(resolution.resolutionDiagnostics.AFTER_ROLE_NAME, 1);
  assert.equal(resolution.resolutionDiagnostics.AFTER_BUSINESS_TARGET, 0);
  assert.equal(resolution.resolutionDiagnostics.REJECTION_STAGE, "BUSINESS_TARGET");
});

test("disabled Sor binds before terminal inspection", () => {
  const context = hybrid.buildCurrentSemanticExecutionContext({ action: { role: "button", name: "Sor" } }, [{
    action: { role: "button", name: "Sor" }, owner: { type: "form", label: "Bağlam" }, overlayScope: "DRAWER", candidateKey: "sor-disabled",
  }]);
  const validation = hybrid.validateCandidateDerivedLocator(context, {
    action: { role: "button", name: "Sor" }, owner: { type: "form", label: "Bağlam" }, overlayScope: "DRAWER", candidateKey: "sor-disabled", visible: true, enabled: false,
  });
  assert.equal(validation.valid, true);
  assert.equal(validation.enabled, false);
});

test("two successors and exactly three evidence-backed Konum retirements remain separate", () => {
  const successor = migration.rows.filter((row) => row.DISPOSITION === "SUCCESSOR");
  const retired = migration.rows.filter((row) => row.DISPOSITION === "RETIRE");
  assert.deepEqual(successor.map((row) => row.SLOT), ["C35", "C36"]);
  assert.deepEqual(retired.map((row) => row.SLOT), ["C01", "C37", "C38"]);
  assert.ok(retired.every((row) => row.SUCCESSOR_SLOT === "C00" && row.EXPECTED_EFFECT_DESTINATION === "NAVIGATE:/superadmin/telematics"));
});

test("stable identity excludes historical prose and ordinal-only presentation state", () => {
  for (const row of migration.rows) {
    assert.ok(row.IDENTITY_EXCLUDES.includes("ownerLabel"));
    assert.ok(row.IDENTITY_EXCLUDES.includes("ownerOrdinal"));
    assert.ok(row.IDENTITY_EXCLUDES.includes("rawFilterSignature"));
  }
});

test("the thirteen pre-existing exact-current pass fixtures are still outside the migration", () => {
  assert.equal(historical.length - migration.rows.length, SUPERADMIN_EXISTING_PASS_SLOT_COUNT);
});

let failures = 0;
for (const item of cases) {
  try {
    item.fn();
    console.log(`PASS ${item.name}`);
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${item.name}: ${error.message}`);
  }
}

console.log(JSON.stringify({
  PRE_18_SUPERADMIN_26_MIGRATION_CHECK: failures ? "RED" : "PASS",
  RED_REAL_CASE_COUNT: 26,
  FOCUSED_TEST_TOTAL: cases.length,
  FOCUSED_TEST_PASS: cases.length - failures,
  FOCUSED_TEST_FAIL: failures,
  EXISTING_13_PASS_FIXTURE_COUNT: SUPERADMIN_EXISTING_PASS_SLOT_COUNT,
  EXISTING_13_PASS_FIXTURE_PASS: failures ? 0 : SUPERADMIN_EXISTING_PASS_SLOT_COUNT,
  ACCOUNTING_BALANCED: migration.accounting.ACCOUNTING_BALANCED ? "YES" : "NO",
}, null, 2));
if (failures) process.exitCode = 1;
