import fs from "node:fs/promises";
import path from "node:path";

export const ROOT_HIT190_PROFILE_ID = "ROOM_ROOT_HIT190";
export const REMAINING4_PROFILE_ID = "ROOM_ROOT_HIT190_REMAINING4_CANARY";
export const FINAL_FINANCIAL_PROFILE_ID = "ROOM_ROOT_HIT190_FINAL_FINANCIAL_CANARY";
export const ROOT_HIT190_SELECTION_SHA256 = "c5ffe972061444ea94a132fd85d50cfb400d33b5a7dc4813bafaadb49a3b3648";
export const REMAINING4_SELECTION_SHA256 = "383cec75c1c91701bb25c63f29016fd976c8ac2f15f68b7a5cfb8b53efa22763";
export const FINAL_FINANCIAL_SELECTION_SHA256 = "9b34962b50d35fc5f04f16efb170f93a28f1623393675747e116a2e36c04e717";

const RUNS_RELATIVE_PATH = "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion/runs";
const OTHER423_SUMMARY_RELATIVE_PATH = "backend/artifacts/browser-smoke/pre-18-room-other423-root-clustering/summary.json";
const KNOWN_PROFILES = new Set([ROOT_HIT190_PROFILE_ID, REMAINING4_PROFILE_ID, FINAL_FINANCIAL_PROFILE_ID]);

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function yes(value) {
  return value === true || String(value || "").toUpperCase() === "YES";
}

function asTimestamp(value) {
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function rowsFromResults(results) {
  const candidates = [
    results?.summary?.RESULTS,
    results?.RESULTS,
    results?.results,
  ];
  return candidates.find(Array.isArray) || [];
}

function classificationCount(rows, classification) {
  return rows.filter((row) => String(row?.CLASSIFICATION || row?.classification || "") === classification).length;
}

function terminalCount(rows, terminalClass) {
  return rows.filter((row) => String(row?.TERMINAL_CLASS || "") === terminalClass).length;
}

function numericRowTotal(rows, field) {
  return rows.reduce((total, row) => total + number(row?.[field]), 0);
}

function firstNumeric(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return number(value);
  }
  return 0;
}

function profileTimestamp(record) {
  return asTimestamp(record?.chronologyTimestamp || record?.generatedAt || record?.runId);
}

function chronologyCompare(left, right) {
  const delta = profileTimestamp(left) - profileTimestamp(right);
  if (delta !== 0) return delta;
  return String(left?.runId || "").localeCompare(String(right?.runId || ""));
}

function latest(runs, profileId) {
  return runs.filter((run) => run?.profileId === profileId).sort(chronologyCompare).at(-1) || null;
}

function isAfter(left, right) {
  return profileTimestamp(left) > profileTimestamp(right);
}

function historicalResult(run) {
  if (!run) return "NOT_FOUND";
  return `${number(run.passCount)}_PASS_${number(run.harnessBlockCount)}_HARNESS_BLOCK`;
}

function rootClosureCounts(rows) {
  return {
    rootHitClosedCount: rows.filter((row) => String(row?.ROOT_CLOSURE_OUTCOME || "") === "YES" && String(row?.ORIGINAL_ROOT_STATUS || "") === "CLEARED").length,
    rootHitOpenCount: rows.filter((row) => String(row?.ROOT_CLOSURE_OUTCOME || "") !== "YES" || String(row?.ORIGINAL_ROOT_STATUS || "") !== "CLEARED").length,
  };
}

function contractIds(rows, predicate) {
  return rows.filter(predicate).map((row) => String(row?.ACTION_CONTRACT_ID || row?.HISTORICAL_ACTION_CONTRACT_ID || "")).filter(Boolean);
}

function sourceSummary(results) {
  return results?.summary && typeof results.summary === "object" ? results.summary : results;
}

function rootAccounting(summary) {
  return summary?.ROOT_ACCOUNTING && typeof summary.ROOT_ACCOUNTING === "object" ? summary.ROOT_ACCOUNTING : {};
}

function lifecycleAccepts(lifecycle) {
  const dispatch = number(lifecycle?.GENERIC_DISPATCH_COUNT);
  const terminal = number(lifecycle?.GENERIC_TERMINAL_COUNT);
  const unknown = number(lifecycle?.GENERIC_UNKNOWN_TERMINAL_COUNT);
  const active = number(lifecycle?.ACTIVE_GENERIC_REQUEST_COUNT);
  const reservations = number(lifecycle?.IN_FLIGHT_RESERVATION_COUNT);
  return dispatch === terminal && unknown === 0 && active === 0 && reservations === 0;
}

export function validateFinal190ClosureRun(run) {
  const blockingReasons = [];
  const expectedDigest = ROOT_HIT190_SELECTION_SHA256;
  if (!run) return { valid: false, blockingReasons: ["FINAL190_NOT_FOUND"] };
  if (run.profileId !== ROOT_HIT190_PROFILE_ID) blockingReasons.push("FINAL190_PROFILE_INVALID");
  if (run.runKind !== "ROOM_ROOT_HIT190_FINAL_REPLAY") blockingReasons.push("FINAL190_RUN_KIND_INVALID");
  if (number(run.selectionCount) !== 190) blockingReasons.push("FINAL190_SELECTION_COUNT_INVALID");
  if (String(run.selectionSha256 || "") !== expectedDigest || String(run.selectionDigestMatch || "") !== "YES") blockingReasons.push("FINAL190_SELECTION_DIGEST_INVALID");
  if (number(run.processedCount) !== 190 || number(run.terminalizedCount) !== 190) blockingReasons.push("FINAL190_PROCESSING_INCOMPLETE");
  if (number(run.resultRowCount) !== 190 || number(run.resultUniqueContractCount) !== 190 || number(run.resultMissingContractCount) !== 0) blockingReasons.push("FINAL190_RESULT_ACCOUNTING_INVALID");
  if (number(run.harnessBlockCount) !== 0) blockingReasons.push("FINAL190_HARNESS_BLOCK_PRESENT");
  if (number(run.productDefectCount) !== 0) blockingReasons.push("FINAL190_PRODUCT_DEFECT_PRESENT");
  if (number(run.unresolvedCount) !== 0) blockingReasons.push("FINAL190_UNRESOLVED_PRESENT");
  if (number(run.rootHitClosedCount) !== 190 || number(run.rootHitOpenCount) !== 0) blockingReasons.push("FINAL190_ROOT_CLOSURE_INVALID");
  if (number(run.evidenceGapCount) !== 0) blockingReasons.push("FINAL190_EVIDENCE_GAP_PRESENT");
  if (number(run.unsafeAccidentalExecutionCount) !== 0) blockingReasons.push("FINAL190_UNSAFE_EXECUTION_PRESENT");
  if (number(run.total429Count) !== 0 || number(run.genericBudgetViolationCount) !== 0 || number(run.genericUnknownTerminalCount) !== 0) blockingReasons.push("FINAL190_NETWORK_ACCOUNTING_INVALID");
  if (number(run.teardownEscapeCount) !== 0) blockingReasons.push("FINAL190_TEARDOWN_ESCAPE_PRESENT");
  if (number(run.establishedPassRegressionCount) !== 0) blockingReasons.push("FINAL190_REGRESSION_PRESENT");
  if (run.lifecycleAccepted !== true) blockingReasons.push("FINAL190_LIFECYCLE_INCOMPLETE");
  return { valid: blockingReasons.length === 0, blockingReasons };
}

export function evaluateRootHit190ClosureEvidence({ runs = [], other423ClusteringStatus = "UNKNOWN", generateAnalysisRequiredForRootHitClosure = false } = {}) {
  const chronology = [...runs].sort(chronologyCompare);
  const remaining4 = latest(chronology, REMAINING4_PROFILE_ID);
  const exact1 = latest(chronology, FINAL_FINANCIAL_PROFILE_ID);
  const final190 = latest(chronology, ROOT_HIT190_PROFILE_ID);
  const final190Validation = validateFinal190ClosureRun(final190);
  const olderValidFinal190 = chronology
    .filter((run) => run.profileId === ROOT_HIT190_PROFILE_ID && run !== final190)
    .some((run) => validateFinal190ClosureRun(run).valid);
  const remaining4Failed = Boolean(remaining4 && (number(remaining4.harnessBlockCount) > 0 || number(remaining4.productDefectCount) > 0 || number(remaining4.unresolvedCount) > 0));
  const exact1CoveredIds = new Set(exact1?.clearedContractIds || []);
  const remaining4BlockedIds = remaining4?.historicalBlockedContractIds || [];
  const exact1Passes = Boolean(exact1
    && isAfter(exact1, remaining4)
    && number(exact1.selectionCount) === 1
    && number(exact1.passCount) === 1
    && number(exact1.harnessBlockCount) === 0
    && number(exact1.productDefectCount) === 0
    && number(exact1.unresolvedCount) === 0
    && remaining4BlockedIds.length > 0
    && remaining4BlockedIds.every((id) => exact1CoveredIds.has(id)));
  const final190SupersedesRemaining4 = Boolean(remaining4Failed && final190Validation.valid && isAfter(final190, remaining4));

  let status = "DURABLE_EVIDENCE_INCOMPLETE";
  if (!final190) {
    if (remaining4 && number(remaining4.passCount) === 4 && number(remaining4.harnessBlockCount) === 0 && number(remaining4.productDefectCount) === 0 && number(remaining4.unresolvedCount) === 0) {
      status = "REMAINING4_GREEN_FINAL190_MISSING";
    } else if (remaining4) {
      status = "REMAINING4_NOT_GREEN";
    }
  } else if (final190Validation.valid) {
    status = "CLOSED_GREEN";
  } else {
    status = "FINAL190_EXISTS_NOT_GREEN";
  }

  const closedGreen = status === "CLOSED_GREEN";
  return {
    status,
    rootCause: "STALE_INTERMEDIATE_GATE_NOT_SUPERSEDED_BY_LATER_CANONICAL_PARENT_CLOSURE",
    remaining4,
    exact1,
    final190,
    final190Validation,
    remaining4HistoricalResult: historicalResult(remaining4),
    remaining4IntermediateFailureSuperseded: final190SupersedesRemaining4 ? "YES" : "NO",
    supersededByExact1: exact1Passes ? "PARTIAL/TARGETED" : "NO",
    supersededByFinal190: final190SupersedesRemaining4 ? "YES/COMPLETE" : "NO",
    final190Authoritative: final190Validation.valid ? "YES" : "NO",
    final190IsAuthoritativeClosureEvidence: final190Validation.valid ? "YES" : "NO",
    olderIntermediateFailurePreservedInHistory: remaining4 ? "YES" : "NO",
    olderIntermediateFailureOverridesLaterFinal190: final190SupersedesRemaining4 ? "NO" : "YES",
    newerContradictoryCanonicalEvidenceBlocksClosure: "YES",
    newerContradictoryCanonicalEvidencePresent: !final190Validation.valid && olderValidFinal190 ? "YES" : "NO",
    historicalRemaining4RerunRequiredForClosure: final190Validation.valid ? "NO" : "YES",
    rootHit190ClosedGreen: closedGreen ? "YES" : "NO",
    other423ClusteringStatus,
    other423ClusteringReused: other423ClusteringStatus === "GREEN" ? "YES" : "NO",
    other423NextPhaseAuthorized: closedGreen && other423ClusteringStatus === "GREEN" ? "YES" : "NO",
    generateAnalysisRequiredForRootHitClosure: generateAnalysisRequiredForRootHitClosure ? "YES" : "NO",
    historicalArtifactMutationRequired: "NO",
    realBrowserRunStarted: "NO",
  };
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function artifactRecord({ runDirectory, artifactDirectory, manifest }) {
  const artifactPath = path.join(runDirectory, artifactDirectory);
  const [summary, results, lifecycle] = await Promise.all([
    readJson(path.join(artifactPath, "summary.json")),
    readJson(path.join(artifactPath, "results.json")),
    readJson(path.join(artifactPath, "request-lifecycle.json")),
  ]);
  const summaryRecord = sourceSummary(summary);
  const resultSummary = sourceSummary(results);
  const rows = rowsFromResults(results);
  const profileId = String(manifest.CANONICAL_SELECTION_PROFILE_ID || "");
  const classPassCount = classificationCount(rows, "PASS");
  const classHarnessCount = rows.filter((row) => ["HARNESS_BLOCK", "HARNESS_DEFECT"].includes(String(row?.CLASSIFICATION || row?.classification || "")) || String(row?.TERMINAL_CLASS || "") === "HARNESS_BLOCK").length;
  const classificationProductCount = rows.filter((row) => String(row?.CLASSIFICATION || row?.classification || "") === "PRODUCT_DEFECT" || String(row?.TERMINAL_CLASS || "") === "PRODUCT_DEFECT").length;
  const classificationUnresolvedCount = rows.filter((row) => String(row?.CLASSIFICATION || row?.classification || "") === "UNRESOLVED" || String(row?.TERMINAL_CLASS || "") === "UNRESOLVED").length;
  const rootClosure = rootClosureCounts(rows);
  const accounting = rootAccounting(summaryRecord);
  const selectedDigest = String(manifest.FINAL_REPLAY_SELECTION_SHA256 || "");
  const reportedDigest = String(summaryRecord.ROOT_HIT_SELECTION_SHA256 || summaryRecord.FINAL_REPLAY_SELECTION_SHA256 || "");
  const reportedMatch = String(summaryRecord.ROOT_HIT_SELECTION_DIGEST_MATCH || summaryRecord.SELECTION_DIGEST_MATCH || "");
  const resultUniqueContractCount = new Set(rows.map((row) => String(row?.ACTION_CONTRACT_ID || "")).filter(Boolean)).size;
  const targetCount = number(manifest.TARGET_COUNT);
  const validNonPassTerminalCount = rows.filter((row) => {
    const terminal = String(row?.TERMINAL_CLASS || row?.CLASSIFICATION || "");
    return terminal && terminal !== "PASS" && terminal !== "HARNESS_BLOCK" && terminal !== "HARNESS_DEFECT" && terminal !== "PRODUCT_DEFECT" && terminal !== "UNRESOLVED";
  }).length;
  const total429Count = number(accounting.AUTH_429_COUNT)
    + number(accounting.GENERIC_READ_429_COUNT)
    + number(accounting.SPECIAL_LIMITER_429_COUNT)
    + number(accounting.OTHER_429_COUNT);
  const establishedPassRegressionCount = numericRowTotal(rows, "EXECUTION_REVALIDATION_UI_MUTATION_COUNT")
    + numericRowTotal(rows, "PURE_REVALIDATION_NAV_CLICK_COUNT")
    + numericRowTotal(rows, "HARNESS_CAUSED_SCROLL_RESET_COUNT");

  return {
    runId: String(manifest.RUN_ID || path.basename(runDirectory)),
    profileId,
    runKind: String(manifest.RUN_KIND || ""),
    chronologyTimestamp: String(manifest.generatedAt || ""),
    selectionCount: targetCount,
    selectionSha256: selectedDigest,
    selectionDigestMatch: reportedMatch === "YES" && reportedDigest === selectedDigest ? "YES" : "NO",
    processedCount: rows.length,
    terminalizedCount: rows.filter((row) => String(row?.CONTRACT_TERMINALIZED || "") === "YES").length,
    resultRowCount: rows.length,
    resultUniqueContractCount,
    resultMissingContractCount: Math.max(0, targetCount - resultUniqueContractCount),
    passCount: classPassCount,
    validNonPassTerminalCount,
    harnessBlockCount: classHarnessCount,
    productDefectCount: classificationProductCount,
    unresolvedCount: classificationUnresolvedCount,
    otherValidTerminalCount: validNonPassTerminalCount,
    rootHitClosedCount: rootClosure.rootHitClosedCount,
    rootHitOpenCount: rootClosure.rootHitOpenCount,
    evidenceGapCount: firstNumeric(summaryRecord.ROOT_HIT_UNRESOLVED_IDENTITY_COUNT, 0),
    unsafeAccidentalExecutionCount: firstNumeric(summaryRecord.ACCIDENTAL_UNSAFE_EXECUTION_COUNT, 0),
    total429Count,
    genericBudgetViolationCount: firstNumeric(lifecycle.GENERIC_BUDGET_VIOLATION_COUNT, summaryRecord.GENERIC_BUDGET_VIOLATION_COUNT),
    genericUnknownTerminalCount: firstNumeric(lifecycle.GENERIC_UNKNOWN_TERMINAL_COUNT, summaryRecord.GENERIC_UNKNOWN_TERMINAL_COUNT),
    teardownEscapeCount: firstNumeric(summaryRecord.TEARDOWN_ESCAPE_COUNT, 0),
    establishedPassRegressionCount,
    lifecycleAccepted: lifecycleAccepts(lifecycle),
    historicalBlockedContractIds: contractIds(rows, (row) => String(row?.TERMINAL_CLASS || "") === "HARNESS_BLOCK"),
    clearedContractIds: contractIds(rows, (row) => String(row?.TERMINAL_CLASS || row?.CLASSIFICATION || "") === "PASS" && String(row?.ORIGINAL_ROOT_STATUS || "") === "CLEARED"),
    artifactPaths: {
      manifest: path.join(artifactPath, "manifest.json"),
      results: path.join(artifactPath, "results.json"),
      summary: path.join(artifactPath, "summary.json"),
      requestLifecycle: path.join(artifactPath, "request-lifecycle.json"),
    },
  };
}

export async function discoverRootHit190DurableRuns({ repositoryRoot = process.cwd() } = {}) {
  const runsDirectory = path.join(repositoryRoot, RUNS_RELATIVE_PATH);
  const runEntries = await fs.readdir(runsDirectory, { withFileTypes: true });
  const discovered = [];
  for (const runEntry of runEntries.filter((entry) => entry.isDirectory())) {
    const runDirectory = path.join(runsDirectory, runEntry.name);
    const artifactEntries = await fs.readdir(runDirectory, { withFileTypes: true });
    for (const artifactEntry of artifactEntries.filter((entry) => entry.isDirectory())) {
      const manifestPath = path.join(runDirectory, artifactEntry.name, "manifest.json");
      try {
        const manifest = await readJson(manifestPath);
        if (!KNOWN_PROFILES.has(String(manifest.CANONICAL_SELECTION_PROFILE_ID || ""))) continue;
        discovered.push(await artifactRecord({ runDirectory, artifactDirectory: artifactEntry.name, manifest }));
      } catch (error) {
        if (error?.code === "ENOENT") continue;
        throw error;
      }
    }
  }
  return discovered.sort(chronologyCompare);
}

export async function readDurableRootHit190ClosureRecovery({ repositoryRoot = process.cwd() } = {}) {
  const [runs, other423Summary] = await Promise.all([
    discoverRootHit190DurableRuns({ repositoryRoot }),
    readJson(path.join(repositoryRoot, OTHER423_SUMMARY_RELATIVE_PATH)),
  ]);
  const other423ClusteringStatus = String(other423Summary.ROOM_OTHER423_ROOT_CLUSTERING_STATUS || other423Summary.status || "UNKNOWN").toUpperCase();
  return evaluateRootHit190ClosureEvidence({
    runs,
    other423ClusteringStatus,
    generateAnalysisRequiredForRootHitClosure: false,
  });
}
