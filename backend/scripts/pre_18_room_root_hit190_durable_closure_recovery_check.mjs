import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, "..", "..");
const ownerUrl = new URL("./lib/pre_18_room_root_hit190_durable_closure_recovery.mjs", import.meta.url);

let owner = null;
let ownerImportError = null;
try {
  owner = await import(ownerUrl);
} catch (error) {
  ownerImportError = error;
}

const ROOT_DIGEST = "c5ffe972061444ea94a132fd85d50cfb400d33b5a7dc4813bafaadb49a3b3648";
const REMAINING4_DIGEST = "383cec75c1c91701bb25c63f29016fd976c8ac2f15f68b7a5cfb8b53efa22763";
const EXACT1_DIGEST = "9b34962b50d35fc5f04f16efb170f93a28f1623393675747e116a2e36c04e717";
const FINANCIAL_CONTRACT = "financial-contract";

function requiredOwner() {
  if (!owner || typeof owner.evaluateRootHit190ClosureEvidence !== "function") {
    throw new Error(`RECOVERY_EVIDENCE_PRECEDENCE_OWNER_ABSENT:${ownerImportError?.code || ownerImportError?.name || "MISSING_EXPORT"}`);
  }
  return owner;
}

function parentRun(overrides = {}) {
  return {
    runId: "full190-green",
    profileId: "ROOM_ROOT_HIT190",
    runKind: "ROOM_ROOT_HIT190_FINAL_REPLAY",
    chronologyTimestamp: "2026-09-15T08:34:54.659Z",
    selectionCount: 190,
    selectionSha256: ROOT_DIGEST,
    selectionDigestMatch: "YES",
    processedCount: 190,
    terminalizedCount: 190,
    resultRowCount: 190,
    resultUniqueContractCount: 190,
    resultMissingContractCount: 0,
    passCount: 189,
    validNonPassTerminalCount: 1,
    harnessBlockCount: 0,
    productDefectCount: 0,
    unresolvedCount: 0,
    rootHitClosedCount: 190,
    rootHitOpenCount: 0,
    evidenceGapCount: 0,
    unsafeAccidentalExecutionCount: 0,
    total429Count: 0,
    genericBudgetViolationCount: 0,
    genericUnknownTerminalCount: 0,
    teardownEscapeCount: 0,
    establishedPassRegressionCount: 0,
    lifecycleAccepted: true,
    ...overrides,
  };
}

function remaining4Run(overrides = {}) {
  return {
    runId: "remaining4-failed",
    profileId: "ROOM_ROOT_HIT190_REMAINING4_CANARY",
    runKind: "ROOM_ROOT_HIT190_REMAINING4_CANARY_FINAL_REPLAY",
    chronologyTimestamp: "2026-09-15T05:40:13.357Z",
    selectionCount: 4,
    selectionSha256: REMAINING4_DIGEST,
    selectionDigestMatch: "YES",
    processedCount: 4,
    terminalizedCount: 4,
    passCount: 3,
    harnessBlockCount: 1,
    productDefectCount: 0,
    unresolvedCount: 0,
    otherValidTerminalCount: 0,
    historicalBlockedContractIds: [FINANCIAL_CONTRACT],
    ...overrides,
  };
}

function exact1Run(overrides = {}) {
  return {
    runId: "exact1-green",
    profileId: "ROOM_ROOT_HIT190_FINAL_FINANCIAL_CANARY",
    runKind: "ROOM_ROOT_HIT190_FINAL_FINANCIAL_CANARY_FINAL_REPLAY",
    chronologyTimestamp: "2026-09-15T08:29:00.234Z",
    selectionCount: 1,
    selectionSha256: EXACT1_DIGEST,
    selectionDigestMatch: "YES",
    processedCount: 1,
    terminalizedCount: 1,
    passCount: 1,
    harnessBlockCount: 0,
    productDefectCount: 0,
    unresolvedCount: 0,
    clearedContractIds: [FINANCIAL_CONTRACT],
    ...overrides,
  };
}

function evidence(overrides = {}) {
  return {
    runs: [remaining4Run(), exact1Run(), parentRun()],
    other423ClusteringStatus: "GREEN",
    generateAnalysisRequiredForRootHitClosure: false,
    ...overrides,
  };
}

function evaluate(input) {
  return requiredOwner().evaluateRootHit190ClosureEvidence(input);
}

const cases = [
  ["RED-1 older remaining4 3/4 plus later Exact1 and final190 must close", () => assert.equal(evaluate(evidence()).status, "CLOSED_GREEN")],
  ["RED-2 valid final190 supersedes older intermediate failure", () => assert.equal(evaluate(evidence()).remaining4IntermediateFailureSuperseded, "YES")],
  ["RED-3 failed remaining4 remains visible in history", () => assert.equal(evaluate(evidence()).remaining4HistoricalResult, "3_PASS_1_HARNESS_BLOCK")],
  ["RED-4 final190 harness block cannot supersede", () => assert.equal(evaluate(evidence({ runs: [remaining4Run(), exact1Run(), parentRun({ harnessBlockCount: 1 })] })).status, "FINAL190_EXISTS_NOT_GREEN")],
  ["RED-5 final190 unresolved row cannot close", () => assert.equal(evaluate(evidence({ runs: [remaining4Run(), exact1Run(), parentRun({ unresolvedCount: 1 })] })).status, "FINAL190_EXISTS_NOT_GREEN")],
  ["RED-6 final190 digest mismatch cannot close", () => assert.equal(evaluate(evidence({ runs: [remaining4Run(), exact1Run(), parentRun({ selectionDigestMatch: "NO" })] })).status, "FINAL190_EXISTS_NOT_GREEN")],
  ["RED-7 final190 missing result row cannot close", () => assert.equal(evaluate(evidence({ runs: [remaining4Run(), exact1Run(), parentRun({ resultMissingContractCount: 1, resultRowCount: 189 })] })).status, "FINAL190_EXISTS_NOT_GREEN")],
  ["RED-8 final190 evidence gap cannot close", () => assert.equal(evaluate(evidence({ runs: [remaining4Run(), exact1Run(), parentRun({ evidenceGapCount: 1 })] })).status, "FINAL190_EXISTS_NOT_GREEN")],
  ["RED-9 final190 unsafe execution cannot close", () => assert.equal(evaluate(evidence({ runs: [remaining4Run(), exact1Run(), parentRun({ unsafeAccidentalExecutionCount: 1 })] })).status, "FINAL190_EXISTS_NOT_GREEN")],
  ["RED-10 newer full190 failure blocks an older green full190", () => assert.equal(evaluate(evidence({ runs: [remaining4Run(), exact1Run(), parentRun(), parentRun({ runId: "full190-newer-failure", chronologyTimestamp: "2026-09-15T09:00:00.000Z", harnessBlockCount: 1 })] })).status, "FINAL190_EXISTS_NOT_GREEN")],
  ["RED-11 newer contradictory canonical evidence wins", () => assert.equal(evaluate(evidence({ runs: [remaining4Run(), exact1Run(), parentRun(), parentRun({ runId: "full190-newer-contradiction", chronologyTimestamp: "2026-09-15T09:00:00.000Z", evidenceGapCount: 1 })] })).newerContradictoryCanonicalEvidenceBlocksClosure, "YES")],
  ["RED-12 intermediate canary pass alone cannot manufacture parent closure", () => assert.notEqual(evaluate(evidence({ runs: [remaining4Run({ passCount: 4, harnessBlockCount: 0 }), exact1Run()] })).status, "CLOSED_GREEN")],
  ["RED-13 Exact1 pass alone cannot close ROOT-HIT190", () => assert.notEqual(evaluate(evidence({ runs: [remaining4Run(), exact1Run()] })).status, "CLOSED_GREEN")],
  ["RED-14 valid final190 authorizes the next phase", () => assert.equal(evaluate(evidence()).other423NextPhaseAuthorized, "YES")],
  ["RED-15 existing OTHER423 clustering is reused", () => assert.equal(evaluate(evidence()).other423ClusteringReused, "YES")],
  ["RED-16 generate-analysis absence is not a closure prerequisite", () => assert.equal(evaluate(evidence({ generateAnalysisRequiredForRootHitClosure: false })).generateAnalysisRequiredForRootHitClosure, "NO")],
  ["RED-17 historical artifact mutation is unnecessary", () => assert.equal(evaluate(evidence()).historicalArtifactMutationRequired, "NO")],
  ["RED-18 actual durable artifacts validate through the recovery entrypoint", async () => {
    const result = await requiredOwner().readDurableRootHit190ClosureRecovery({ repositoryRoot });
    assert.equal(result.status, "CLOSED_GREEN");
    assert.equal(result.final190Authoritative, "YES");
    assert.equal(result.other423NextPhaseAuthorized, "YES");
  }],
];

async function runCases({ red = false } = {}) {
  let observed = 0;
  let unexpectedPass = 0;
  for (const [name, check] of cases) {
    try {
      await check();
      if (red) {
        unexpectedPass += 1;
        console.log(`UNEXPECTED_PASS ${name}`);
      } else {
        console.log(`PASS ${name}`);
      }
    } catch (error) {
      if (red) {
        observed += 1;
        console.log(`RED_OBSERVED ${name}: ${error.message}`);
      } else {
        throw error;
      }
    }
  }
  return { observed, unexpectedPass };
}

if (process.argv.includes("--red")) {
  const outcome = await runCases({ red: true });
  console.log(JSON.stringify({
    RECOVERY_PRECEDENCE_RED_TEST_COUNT: cases.length,
    RECOVERY_PRECEDENCE_RED_OBSERVED_COUNT: outcome.observed,
    RECOVERY_PRECEDENCE_RED_UNEXPECTED_PASS_COUNT: outcome.unexpectedPass,
  }));
  process.exitCode = outcome.observed === cases.length && outcome.unexpectedPass === 0 ? 1 : 2;
} else {
  await runCases();
  console.log(JSON.stringify({
    FOCUSED_TEST_TOTAL: cases.length,
    FOCUSED_TEST_PASS: cases.length,
    FOCUSED_TEST_FAIL: 0,
    ACTUAL_DURABLE_RECOVERY_ENTRYPOINT_EXECUTED_IN_TEST: "YES",
    ACTUAL_FINAL190_ARTIFACT_VALIDATION_EXECUTED_IN_TEST: "YES",
    ACTUAL_OTHER423_AUTHORIZATION_GATE_EXECUTED_IN_TEST: "YES",
  }));
}
