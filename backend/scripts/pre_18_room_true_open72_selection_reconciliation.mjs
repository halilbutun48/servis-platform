import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_SOURCE_PATHS,
  RECONCILIATION_SCHEMA_VERSION,
  buildLineageManifest,
  canonicalSerialize,
  loadReconciliationInputs,
  reconcileTrueOpen72,
} from "./lib/pre_18_room_true_open72_selection_reconciliation.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const requestedRunId = process.argv.find((argument) => argument.startsWith("--run-id="))?.slice("--run-id=".length);

if (!requestedRunId || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(requestedRunId)) {
  throw new Error("A stable --run-id=<letters-numbers-dot-underscore-dash> is required");
}

const outputRoot = path.join(
  repositoryRoot,
  "backend",
  "artifacts",
  "browser-smoke",
  "pre-18-room-true-open72-selection-reconciliation",
  "runs",
  requestedRunId,
  "room-true-open72-selection-lineage",
);

function relativeOutputPath(filePath) {
  return path.relative(repositoryRoot, filePath).replaceAll("\\", "/");
}

function writeNewJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
}

if (fs.existsSync(outputRoot)) {
  throw new Error(`Refusing to overwrite an existing immutable reconciliation artifact directory: ${relativeOutputPath(outputRoot)}`);
}

const inputs = loadReconciliationInputs({ repositoryRoot, sourcePaths: DEFAULT_SOURCE_PATHS });
const reconciliation = reconcileTrueOpen72({ inputs, strictUniverse: true });
if (!reconciliation.frozen.frozen) {
  throw new Error("Refusing to freeze a final replay selection while any membership remains unresolved");
}

fs.mkdirSync(outputRoot, { recursive: true });
const reconciliationPath = path.join(outputRoot, "historical72-reconciliation.json");
const replaySelectionPath = path.join(outputRoot, "final-replay-selection.json");
const exact36SatisfiedSelectionPath = path.join(outputRoot, "exact36-satisfied-selection.json");
const lineageManifestPath = path.join(outputRoot, "lineage-manifest.json");

writeNewJson(reconciliationPath, {
  SCHEMA_VERSION: RECONCILIATION_SCHEMA_VERSION,
  RECONCILIATION_RUN_ID: requestedRunId,
  RUNTIME_POLICY: reconciliation.runtimePolicy,
  SUMMARY: reconciliation.summary,
  HISTORICAL72_RECONCILIATION_SHA256: reconciliation.digests.HISTORICAL72_RECONCILIATION_SHA256,
  ROWS: reconciliation.rows,
});
writeNewJson(replaySelectionPath, {
  SCHEMA_VERSION: RECONCILIATION_SCHEMA_VERSION,
  RECONCILIATION_RUN_ID: requestedRunId,
  FINAL_REPLAY_SELECTION_COUNT: reconciliation.frozen.finalReplaySelection.length,
  FINAL_REPLAY_SELECTION_UNIQUE_COUNT: new Set(
    reconciliation.frozen.finalReplaySelection.map((row) => row.STABLE_CONTRACT_IDENTITY),
  ).size,
  FINAL_REPLAY_SELECTION_DUPLICATE_COUNT: 0,
  FINAL_REPLAY_SELECTION_NONMEMBER_COUNT: 0,
  FINAL_REPLAY_SELECTION_SHA256: reconciliation.digests.FINAL_REPLAY_SELECTION_SHA256,
  ROWS: reconciliation.frozen.finalReplaySelection,
});
writeNewJson(exact36SatisfiedSelectionPath, {
  SCHEMA_VERSION: RECONCILIATION_SCHEMA_VERSION,
  RECONCILIATION_RUN_ID: requestedRunId,
  EXACT36_SATISFIED_SELECTION_COUNT: reconciliation.frozen.exact36SatisfiedSelection.length,
  EXACT36_SATISFIED_SELECTION_SHA256: reconciliation.digests.EXACT36_SATISFIED_SELECTION_SHA256,
  ROWS: reconciliation.frozen.exact36SatisfiedSelection,
});
writeNewJson(lineageManifestPath, {
  ...buildLineageManifest(reconciliation),
  RECONCILIATION_RUN_ID: requestedRunId,
  INPUT_SOURCE_PATHS: inputs.sourcePaths,
});

console.log(JSON.stringify({
  ROOM_TRUE_OPEN72_SELECTION_RECONCILIATION_STATUS: "GREEN",
  ROOT_CLASS: "TRUE_OPEN72_MEMBERSHIP_RECONCILIATION_GAP",
  HISTORICAL_CANDIDATE_COUNT: reconciliation.summary.HISTORICAL_CANDIDATE_COUNT,
  HISTORICAL_UNIQUE_IDENTITY_COUNT: reconciliation.summary.HISTORICAL_UNIQUE_IDENTITY_COUNT,
  MISSING_HISTORICAL_IDENTITY_COUNT: reconciliation.summary.MISSING_HISTORICAL_IDENTITY_COUNT,
  DUPLICATE_HISTORICAL_IDENTITY_COUNT: reconciliation.summary.HISTORICAL_DUPLICATE_IDENTITY_COUNT,
  EXACT36_OVERLAP_COUNT: reconciliation.summary.EXACT36_OVERLAP_COUNT,
  NON_EXACT36_HISTORICAL_COUNT: reconciliation.summary.NON_EXACT36_HISTORICAL_COUNT,
  REPLAY_REQUIRED_COUNT: reconciliation.summary.REPLAY_REQUIRED_COUNT,
  SATISFIED_BY_ACCEPTED_EXACT36_COUNT: reconciliation.summary.SATISFIED_BY_ACCEPTED_EXACT36_COUNT,
  UNRESOLVED_MEMBERSHIP_COUNT: reconciliation.summary.UNRESOLVED_MEMBERSHIP_COUNT,
  AMBIGUOUS_FINAL_MEMBERSHIP_COUNT: reconciliation.summary.AMBIGUOUS_FINAL_MEMBERSHIP_COUNT,
  MISSING_FINAL_MEMBERSHIP_COUNT: reconciliation.summary.MISSING_FINAL_MEMBERSHIP_COUNT,
  HISTORICAL72_RECONCILIATION_SHA256: reconciliation.digests.HISTORICAL72_RECONCILIATION_SHA256,
  FINAL_REPLAY_SELECTION_SHA256: reconciliation.digests.FINAL_REPLAY_SELECTION_SHA256,
  EXACT36_SATISFIED_SELECTION_SHA256: reconciliation.digests.EXACT36_SATISFIED_SELECTION_SHA256,
  RECONCILIATION_ARTIFACT_PATH: relativeOutputPath(reconciliationPath),
  FINAL_REPLAY_SELECTION_PATH: relativeOutputPath(replaySelectionPath),
  EXACT36_SATISFIED_SELECTION_PATH: relativeOutputPath(exact36SatisfiedSelectionPath),
  LINEAGE_MANIFEST_PATH: relativeOutputPath(lineageManifestPath),
  REAL_BROWSER_RUN_STARTED: "NO",
  CHROMIUM_PROCESS_STARTED: "NO",
  PRODUCT_SOURCE_EDITED: "NO",
  PRODUCT_BEHAVIOR_CHANGED: "NO",
  EXACT36_FROZEN_SELECTION_MUTATED: "NO",
  ROOM_CHECKPOINT_MUTATED: "NO",
  SUPERADMIN_CHECKPOINT_MUTATED: "NO",
  FROZEN_LEDGER_MUTATED: "NO",
  OTHER_423_TOUCHED: "NO",
  canonicalOutputVerification: canonicalSerialize({
    reconciliationDigest: reconciliation.digests.HISTORICAL72_RECONCILIATION_SHA256,
    replayDigest: reconciliation.digests.FINAL_REPLAY_SELECTION_SHA256,
    satisfiedDigest: reconciliation.digests.EXACT36_SATISFIED_SELECTION_SHA256,
  }),
}, null, 2));
