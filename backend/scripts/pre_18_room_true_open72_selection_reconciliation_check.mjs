import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_SOURCE_PATHS,
  RECONCILIATION_RUNTIME_POLICY,
  canonicalSerialize,
  freezeSelections,
  loadReconciliationInputs,
  reconcileTrueOpen72,
} from "./lib/pre_18_room_true_open72_selection_reconciliation.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const baseInputs = loadReconciliationInputs({ repositoryRoot, sourcePaths: DEFAULT_SOURCE_PATHS });

function clone(value) {
  return structuredClone(value);
}

function reconcile(inputs = baseInputs) {
  return reconcileTrueOpen72({
    inputs,
    strictUniverse: inputs === baseInputs,
  });
}

function firstOverlap(result) {
  const row = result.rows.find((candidate) => candidate.EXACT36_OVERLAP === "YES");
  assert.ok(row, "fixture must contain an Exact36 overlap");
  return row;
}

const checks = [
  {
    name: "materializes every historical True-Open72 identity exactly once",
    run() {
      const result = reconcile();
      assert.equal(result.summary.HISTORICAL_CANDIDATE_COUNT, 72);
      assert.equal(result.summary.HISTORICAL_UNIQUE_IDENTITY_COUNT, 72);
      assert.equal(result.summary.MISSING_HISTORICAL_IDENTITY_COUNT, 0);
      assert.equal(result.summary.HISTORICAL_DUPLICATE_IDENTITY_COUNT, 0);
      assert.equal(result.rows.length, 72);
      assert.equal(new Set(result.rows.map((row) => row.STABLE_CONTRACT_IDENTITY)).size, 72);
    },
  },
  {
    name: "detects the 18 Exact36 overlaps only by accepted stable contract identity",
    run() {
      const result = reconcile();
      assert.equal(result.summary.EXACT36_OVERLAP_COUNT, 18);
      assert.equal(result.summary.NON_EXACT36_HISTORICAL_COUNT, 54);
      assert.equal(result.rows.filter((row) => row.EXACT36_OVERLAP === "YES").length, 18);
    },
  },
  {
    name: "requires all four non-browser lineage evidence families for every historical identity",
    run() {
      const result = reconcile();
      for (const row of result.rows) {
        const evidence = row.EVIDENCE_SOURCE_LIST.join("\n");
        assert.match(evidence, /prehit-246/);
        assert.match(evidence, /canonical-resume-checkpoints/);
        assert.match(evidence, /target-hit-diagnostic/);
        assert.match(evidence, /residual195/);
      }
    },
  },
  {
    name: "does not treat a matching visible label with a different identity as Exact36 closure",
    run() {
      const inputs = clone(baseInputs);
      const overlap = firstOverlap(reconcile(inputs));
      const selected = inputs.exact36.selection.find(
        (entry) => entry.ACTION_CONTRACT_ID === overlap.STABLE_CONTRACT_IDENTITY,
      );
      assert.ok(selected, "accepted selection must include the overlap identity");
      selected.ACTION_CONTRACT_ID = `${selected.ACTION_CONTRACT_ID}--different-stable-identity`;
      const resultEntry = inputs.exact36.results.find(
        (entry) => entry.ACTION_CONTRACT_ID === overlap.STABLE_CONTRACT_IDENTITY,
      );
      assert.ok(resultEntry, "accepted result must include the overlap identity");
      resultEntry.ACTION_CONTRACT_ID = `${resultEntry.ACTION_CONTRACT_ID}--different-stable-identity`;

      const result = reconcile(inputs);
      const row = result.rows.find((candidate) => candidate.STABLE_CONTRACT_IDENTITY === overlap.STABLE_CONTRACT_IDENTITY);
      assert.equal(row.EXACT36_OVERLAP, "NO");
      assert.equal(row.FINAL_MEMBERSHIP_CLASS, "REPLAY_REQUIRED");
      assert.equal(row.MEMBERSHIP_REASON_CODE, "HISTORICAL_OPEN_NOT_LATER_SATISFIED");
    },
  },
  {
    name: "keeps an accepted-selection overlap unresolved when same-identity result evidence is absent",
    run() {
      const inputs = clone(baseInputs);
      const overlap = firstOverlap(reconcile(inputs));
      inputs.exact36.results = inputs.exact36.results.filter(
        (entry) => entry.ACTION_CONTRACT_ID !== overlap.STABLE_CONTRACT_IDENTITY,
      );

      const result = reconcile(inputs);
      const row = result.rows.find((candidate) => candidate.STABLE_CONTRACT_IDENTITY === overlap.STABLE_CONTRACT_IDENTITY);
      assert.equal(row.EXACT36_OVERLAP, "YES");
      assert.equal(row.FINAL_MEMBERSHIP_CLASS, "UNRESOLVED_MEMBERSHIP");
      assert.equal(row.MEMBERSHIP_REASON_CODE, "EXACT36_OVERLAP_IDENTITY_MISMATCH");
    },
  },
  {
    name: "keeps an Exact36 overlap unresolved when original-root clearance proof is missing",
    run() {
      const inputs = clone(baseInputs);
      const overlap = firstOverlap(reconcile(inputs));
      const resultEntry = inputs.exact36.results.find(
        (entry) => entry.ACTION_CONTRACT_ID === overlap.STABLE_CONTRACT_IDENTITY,
      );
      assert.ok(resultEntry, "accepted result must include the overlap identity");
      delete resultEntry.ORIGINAL_ROOT_FACTS;
      delete resultEntry.ORIGINAL_ROOT_STATUS;

      const result = reconcile(inputs);
      const row = result.rows.find((candidate) => candidate.STABLE_CONTRACT_IDENTITY === overlap.STABLE_CONTRACT_IDENTITY);
      assert.equal(row.FINAL_MEMBERSHIP_CLASS, "UNRESOLVED_MEMBERSHIP");
      assert.equal(row.MEMBERSHIP_REASON_CODE, "EXACT36_ROOT_CLEARANCE_NOT_PROVEN");
    },
  },
  {
    name: "keeps an Exact36 overlap unresolved when downstream evidence reopens its original root",
    run() {
      const inputs = clone(baseInputs);
      const overlap = firstOverlap(reconcile(inputs));
      const resultEntry = inputs.exact36.results.find(
        (entry) => entry.ACTION_CONTRACT_ID === overlap.STABLE_CONTRACT_IDENTITY,
      );
      resultEntry.ROOT_REOPENED_BY_DOWNSTREAM = true;

      const result = reconcile(inputs);
      const row = result.rows.find((candidate) => candidate.STABLE_CONTRACT_IDENTITY === overlap.STABLE_CONTRACT_IDENTITY);
      assert.equal(row.EXACT36_ROOT_REOPENED, "YES");
      assert.equal(row.FINAL_MEMBERSHIP_CLASS, "UNRESOLVED_MEMBERSHIP");
      assert.equal(row.MEMBERSHIP_REASON_CODE, "EXACT36_ROOT_CLEARANCE_NOT_PROVEN");
    },
  },
  {
    name: "requires accepted same-identity original-root clearance before excluding an overlap",
    run() {
      const result = reconcile();
      const overlapRows = result.rows.filter((row) => row.EXACT36_OVERLAP === "YES");
      assert.equal(overlapRows.length, 18);
      for (const row of overlapRows) {
        assert.equal(row.EXACT36_SELECTED_IDENTITY_MATCH, "YES");
        assert.equal(row.EXACT36_PROCESSED, "YES");
        assert.equal(row.EXACT36_ORIGINAL_ROOT_PROVEN, "YES");
        assert.equal(row.EXACT36_ORIGINAL_ROOT_CLEARED, "YES");
        assert.equal(row.EXACT36_ROOT_REOPENED, "NO");
        assert.equal(row.FINAL_MEMBERSHIP_CLASS, "SATISFIED_BY_ACCEPTED_EXACT36");
      }
    },
  },
  {
    name: "prefers accepted per-contract original-root facts over the stale legacy clearance flag",
    run() {
      const result = reconcile();
      const overlap = firstOverlap(result);
      const legacyResult = baseInputs.exact36.results.find(
        (entry) => entry.ACTION_CONTRACT_ID === overlap.STABLE_CONTRACT_IDENTITY,
      );
      assert.ok(legacyResult, "accepted Exact36 result must exist");
      assert.equal(legacyResult.ROOT_ORIGINAL_CLEARED, false);
      assert.equal(legacyResult.ORIGINAL_ROOT_FACTS.cleared, true);
      assert.equal(legacyResult.ORIGINAL_ROOT_STATUS, "CLEARED");
      assert.equal(overlap.FINAL_MEMBERSHIP_CLASS, "SATISFIED_BY_ACCEPTED_EXACT36");
    },
  },
  {
    name: "keeps membership accounting exact and freezes only when ambiguity is zero",
    run() {
      const result = reconcile();
      assert.equal(result.summary.REPLAY_REQUIRED_COUNT, 54);
      assert.equal(result.summary.SATISFIED_BY_ACCEPTED_EXACT36_COUNT, 18);
      assert.equal(result.summary.UNRESOLVED_MEMBERSHIP_COUNT, 0);
      assert.equal(
        result.summary.REPLAY_REQUIRED_COUNT
          + result.summary.SATISFIED_BY_ACCEPTED_EXACT36_COUNT
          + result.summary.UNRESOLVED_MEMBERSHIP_COUNT,
        72,
      );
      const frozen = freezeSelections(result);
      assert.equal(frozen.frozen, true);
      assert.equal(frozen.finalReplaySelection.length, 54);
      assert.equal(frozen.exact36SatisfiedSelection.length, 18);

      const ambiguousInputs = clone(baseInputs);
      const overlap = firstOverlap(reconcile(ambiguousInputs));
      ambiguousInputs.exact36.results = ambiguousInputs.exact36.results.filter(
        (entry) => entry.ACTION_CONTRACT_ID !== overlap.STABLE_CONTRACT_IDENTITY,
      );
      const ambiguous = freezeSelections(reconcile(ambiguousInputs));
      assert.equal(ambiguous.frozen, false);
      assert.equal(ambiguous.finalReplaySelection, null);
      assert.equal(ambiguous.exact36SatisfiedSelection, null);
    },
  },
  {
    name: "uses canonical ordering and produces identical normalized reconciliation digests",
    run() {
      const run1 = reconcile();
      const reordered = clone(baseInputs);
      reordered.residual195.results.reverse();
      reordered.prehit246.results.reverse();
      reordered.canonicalRoomCheckpoint.actions.reverse();
      reordered.targetHitDiagnostics.diagnostics.reverse();
      reordered.exact36.selection.reverse();
      reordered.exact36.results.reverse();
      const run2 = reconcile(reordered);

      assert.equal(run1.digests.HISTORICAL72_RECONCILIATION_SHA256, run2.digests.HISTORICAL72_RECONCILIATION_SHA256);
      assert.equal(canonicalSerialize(run1.rows), canonicalSerialize(run2.rows));
    },
  },
  {
    name: "uses immutable JSON evidence only and has no browser or DOM execution dependency",
    run() {
      assert.deepEqual(RECONCILIATION_RUNTIME_POLICY, {
        INPUT_MODE: "IMMUTABLE_JSON_ONLY",
        REAL_BROWSER_RUN_STARTED: "NO",
        DOM_ACCESS: "NO",
      });
      const result = reconcile();
      assert.deepEqual(result.runtimePolicy, RECONCILIATION_RUNTIME_POLICY);
    },
  },
  {
    name: "does not use current UI text, ordinal, or timestamp-only metadata to decide membership",
    run() {
      const inputs = clone(baseInputs);
      const historical = inputs.residual195.results.find((entry) => (
        entry.PREHIT_ROOT === "PREHIT-S1"
        && entry.ROOT_ORIGINAL_CLEARED !== true
        && String(entry.failureReason ?? "").startsWith("ROUTE_READINESS_NOT_PROVEN:")
      ));
      assert.ok(historical, "fixture must contain a True-Open72 historical row");
      historical.ACTION_NAME = "untrusted current visible copy";
      historical.USER_MEANING = "untrusted current visible copy";
      historical.actionIndex = 999999;
      historical.CAPTURE_METADATA = { timestamp: "2099-01-01T00:00:00.000Z" };
      historical.CURRENT_CONTEXTUAL_OWNER = { ordinal: 999999 };

      const baseline = reconcile();
      const mutated = reconcile(inputs);
      assert.equal(
        baseline.digests.HISTORICAL72_RECONCILIATION_SHA256,
        mutated.digests.HISTORICAL72_RECONCILIATION_SHA256,
      );
    },
  },
];

let passed = 0;
for (const check of checks) {
  check.run();
  passed += 1;
  console.log(`PASS ${check.name}`);
}

console.log(JSON.stringify({
  FOCUSED_TEST_TOTAL: checks.length,
  FOCUSED_TEST_PASS: passed,
  FOCUSED_TEST_FAIL: 0,
  status: "GREEN",
}, null, 2));
