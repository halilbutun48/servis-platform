import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const subjectUrl = new URL("./lib/pre_18_room_root_hit190_lineage.mjs", import.meta.url);
const requiredExports = [
  "ROOT_HIT190_SCHEMA_VERSION",
  "ROOT_HIT190_RUNTIME_POLICY",
  "DEFAULT_ROOT_HIT190_SOURCE_PATHS",
  "loadRootHit190Inputs",
  "reconcileRootHit190",
  "freezeRootHit190Selections",
  "buildRootHit190Readiness",
  "buildRootHit190LineageManifest",
  "canonicalSerialize",
];

const requiredCases = [
  "materializes all 190 immutable ROOT-HIT-01 identities",
  "rejects duplicate stable identities",
  "does not silently retain an accepted Exact36 physical-root closure for replay",
  "does not silently retain an accepted TRUE-OPEN54 physical-root closure for replay",
  "does not treat shared corrective source presence as closure evidence",
  "maps every replay-required member to the corrected shared executor path",
  "preserves legitimate descendant-hit semantics",
  "keeps unresolved physical subtype from becoming a fake pass",
  "keeps final membership accounting equal to 190",
  "refuses selection freeze while membership is ambiguous",
  "orders canonical rows deterministically",
  "produces identical SHA-256 digests on two immutable runs",
  "excludes OTHER-423 membership from the ROOT-HIT-01 selection",
  "does not require product files for lineage/readiness",
  "has no browser or DOM dependency for lineage/readiness",
];

let subject = null;
let importFailure = null;
try {
  subject = await import(subjectUrl.href);
} catch (error) {
  importFailure = error;
}

if (!subject) {
  for (const name of requiredCases) {
    console.error(`RED_OBSERVED ${name}: ROOT_HIT190_LINEAGE_OWNER_ABSENT (${importFailure?.code || importFailure?.name || "UNKNOWN"})`);
  }
  console.error(JSON.stringify({
    CORRECTIVE_RED_TEST_COUNT: requiredCases.length,
    CORRECTIVE_RED_OBSERVED_COUNT: requiredCases.length,
    CORRECTIVE_RED_UNEXPECTED_PASS_COUNT: 0,
    status: "RED_EXPECTED",
  }, null, 2));
  process.exitCode = 1;
} else {
  for (const exportName of requiredExports) {
    assert.ok(exportName in subject, `ROOT_HIT190_REQUIRED_EXPORT_MISSING:${exportName}`);
  }
  const inputs = subject.loadRootHit190Inputs({ repositoryRoot });
  const result = subject.reconcileRootHit190({ inputs, strictUniverse: true });
  const clone = (value) => structuredClone(value);
  const first = result.rows[0];
  const firstId = first.STABLE_CONTRACT_IDENTITY;

  const checks = [
    {
      name: requiredCases[0],
      run() {
        assert.equal(result.summary.HISTORICAL_ROOT_HIT01_COUNT, 190);
        assert.equal(result.summary.HISTORICAL_ROOT_HIT01_UNIQUE_IDENTITY_COUNT, 190);
        assert.equal(result.summary.MISSING_ROOT_HIT01_IDENTITY_COUNT, 0);
        assert.equal(result.rows.length, 190);
      },
    },
    {
      name: requiredCases[1],
      run() {
        const duplicate = clone(inputs);
        duplicate.historicalSources.targetHitDiagnostics.push(clone(duplicate.historicalSources.targetHitDiagnostics[0]));
        assert.throws(() => subject.reconcileRootHit190({ inputs: duplicate, strictUniverse: false }), /duplicate.*stable.*identities/i);
      },
    },
    {
      name: requiredCases[2],
      run() {
        const closed = subject.reconcileRootHit190({
          inputs,
          strictUniverse: true,
          acceptedPhysicalClosures: new Map([[firstId, { SOURCE: "EXACT36", SAME_PHYSICAL_ROOT_CLEARED: true }]]),
        });
        assert.equal(closed.rows.find((row) => row.STABLE_CONTRACT_IDENTITY === firstId).FINAL_MEMBERSHIP_CLASS, "ALREADY_SATISFIED_BY_ACCEPTED_LATER_EVIDENCE");
      },
    },
    {
      name: requiredCases[3],
      run() {
        const closed = subject.reconcileRootHit190({
          inputs,
          strictUniverse: true,
          acceptedPhysicalClosures: new Map([[firstId, { SOURCE: "TRUE_OPEN54", SAME_PHYSICAL_ROOT_CLEARED: true }]]),
        });
        assert.equal(closed.rows.find((row) => row.STABLE_CONTRACT_IDENTITY === firstId).FINAL_MEMBERSHIP_CLASS, "ALREADY_SATISFIED_BY_ACCEPTED_LATER_EVIDENCE");
      },
    },
    {
      name: requiredCases[4],
      run() {
        const row = result.rows.find((candidate) => candidate.STABLE_CONTRACT_IDENTITY === firstId);
        assert.equal(row.FINAL_MEMBERSHIP_CLASS, "REPLAY_REQUIRED_ROOT_HIT01");
        assert.equal(row.LATER_ACCEPTED_CLOSURE_SOURCE, null);
      },
    },
    {
      name: requiredCases[5],
      run() {
        assert.equal(result.readiness.summary.SHARED_CORRECTIVE_APPLIES_DIRECTLY_COUNT, result.summary.REPLAY_REQUIRED_ROOT_HIT01_COUNT);
        assert.equal(result.readiness.summary.UNRESOLVED_EXECUTION_PATH_COUNT, 0);
      },
    },
    {
      name: requiredCases[6],
      run() {
        const descendant = subject.classifyHistoricalPhysicalFailure({ TARGET_HIT_TEST: true, TOPMOST_IS_DESCENDANT: true });
        assert.equal(descendant, "LEGITIMATE_DESCENDANT_HIT");
      },
    },
    {
      name: requiredCases[7],
      run() {
        assert.equal(subject.classifyHistoricalPhysicalFailure({}), "UNRESOLVED_PHYSICAL_CLASS");
      },
    },
    {
      name: requiredCases[8],
      run() {
        const summary = result.summary;
        assert.equal(summary.REPLAY_REQUIRED_ROOT_HIT01_COUNT + summary.ALREADY_SATISFIED_BY_ACCEPTED_LATER_EVIDENCE_COUNT + summary.UNRESOLVED_MEMBERSHIP_COUNT, 190);
      },
    },
    {
      name: requiredCases[9],
      run() {
        const ambiguous = clone(result.rows);
        ambiguous[0].FINAL_MEMBERSHIP_CLASS = "UNRESOLVED_MEMBERSHIP";
        const frozen = subject.freezeRootHit190Selections({ rows: ambiguous, summary: { ...result.summary, UNRESOLVED_MEMBERSHIP_COUNT: 1 } });
        assert.equal(frozen.frozen, false);
      },
    },
    {
      name: requiredCases[10],
      run() {
        const reordered = clone(inputs);
        reordered.historicalSources.targetHitDiagnostics.reverse();
        reordered.historicalSources.prehit246Results.reverse();
        reordered.historicalSources.residual195Results.reverse();
        const rerun = subject.reconcileRootHit190({ inputs: reordered, strictUniverse: true });
        assert.equal(subject.canonicalSerialize(result.rows), subject.canonicalSerialize(rerun.rows));
      },
    },
    {
      name: requiredCases[11],
      run() {
        const rerun = subject.reconcileRootHit190({ inputs, strictUniverse: true });
        assert.equal(result.digests.ROOT_HIT190_LINEAGE_SHA256, rerun.digests.ROOT_HIT190_LINEAGE_SHA256);
        assert.equal(result.digests.FINAL_ROOT_HIT_REPLAY_SELECTION_SHA256, rerun.digests.FINAL_ROOT_HIT_REPLAY_SELECTION_SHA256);
      },
    },
    {
      name: requiredCases[12],
      run() {
        assert.equal(result.rows.some((row) => row.HISTORICAL_ROOT !== "ROOT-HIT-01"), false);
      },
    },
    {
      name: requiredCases[13],
      run() {
        assert.equal(result.readiness.PRODUCT_FILES_REQUIRED, "NO");
      },
    },
    {
      name: requiredCases[14],
      run() {
        assert.deepEqual(subject.ROOT_HIT190_RUNTIME_POLICY, {
          INPUT_MODE: "IMMUTABLE_JSON_AND_SOURCE_WIRING_ONLY",
          REAL_BROWSER_RUN_STARTED: "NO",
          DOM_ACCESS: "NO",
        });
      },
    },
  ];

  let passed = 0;
  for (const check of checks) {
    check.run();
    passed += 1;
    console.log(`PASS ${check.name}`);
  }
  console.log(JSON.stringify({ FOCUSED_TEST_TOTAL: checks.length, FOCUSED_TEST_PASS: passed, FOCUSED_TEST_FAIL: 0, status: "GREEN" }, null, 2));
}
