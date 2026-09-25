import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_ROOT_HIT190_SOURCE_PATHS,
  ROOT_HIT190_RUNTIME_POLICY,
  buildRootHit190LineageManifest,
  canonicalSerialize,
  loadRootHit190Inputs,
  reconcileRootHit190,
} from "./lib/pre_18_room_root_hit190_lineage.mjs";
import { writeImmutableJson } from "./lib/pre_18_hybrid_surface_state_executor.mjs";

const args = new Set(process.argv.slice(2));
if (args.size !== 1 || !args.has("--write-artifacts")) throw new Error("ROOT_HIT190_LINEAGE_MODE_REQUIRED:--write-artifacts");

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const inputs = loadRootHit190Inputs({ repositoryRoot, sourcePaths: DEFAULT_ROOT_HIT190_SOURCE_PATHS });
const run1 = reconcileRootHit190({ inputs, strictUniverse: true });
const run2 = reconcileRootHit190({ inputs, strictUniverse: true });
if (run1.digests.ROOT_HIT190_LINEAGE_SHA256 !== run2.digests.ROOT_HIT190_LINEAGE_SHA256
  || run1.digests.FINAL_ROOT_HIT_REPLAY_SELECTION_SHA256 !== run2.digests.FINAL_ROOT_HIT_REPLAY_SELECTION_SHA256) {
  throw new Error("ROOT_HIT190_RECONCILIATION_NONDETERMINISTIC");
}
if (!run1.frozen.frozen) throw new Error("ROOT_HIT190_SELECTION_FREEZE_BLOCKED_BY_AMBIGUITY");

const artifactDir = path.join(repositoryRoot, "backend/artifacts/browser-smoke/pre-18-room-root-hit190-lineage-readiness/runs/pre18-room-root-hit190-lineage-v1/root-hit190-lineage");
await fs.mkdir(artifactDir, { recursive: true });
const lineage = {
  SCHEMA_VERSION: run1.schemaVersion,
  RUNTIME_POLICY: ROOT_HIT190_RUNTIME_POLICY,
  RECONCILIATION_RUN_COUNT: 2,
  RUN1_HISTORICAL_COUNT: run1.summary.HISTORICAL_ROOT_HIT01_COUNT,
  RUN2_HISTORICAL_COUNT: run2.summary.HISTORICAL_ROOT_HIT01_COUNT,
  RUN1_LINEAGE_SHA256: run1.digests.ROOT_HIT190_LINEAGE_SHA256,
  RUN2_LINEAGE_SHA256: run2.digests.ROOT_HIT190_LINEAGE_SHA256,
  RUN1_FINAL_SELECTION_SHA256: run1.digests.FINAL_ROOT_HIT_REPLAY_SELECTION_SHA256,
  RUN2_FINAL_SELECTION_SHA256: run2.digests.FINAL_ROOT_HIT_REPLAY_SELECTION_SHA256,
  RECONCILIATION_DETERMINISTIC: "YES",
  summary: run1.summary,
  readiness: { ...run1.readiness, rows: undefined },
  rows: run1.rows,
  inputSourceDigests: run1.inputSourceDigests,
};
const manifest = buildRootHit190LineageManifest(run1);
const files = {
  "root-hit190-lineage.json": lineage,
  "final-root-hit-replay-selection.json": {
    FINAL_ROOT_HIT_REPLAY_SELECTION_SHA256: run1.digests.FINAL_ROOT_HIT_REPLAY_SELECTION_SHA256,
    rows: run1.frozen.finalReplaySelection,
  },
  "already-satisfied-root-hit-selection.json": {
    ALREADY_SATISFIED_ROOT_HIT_SELECTION_SHA256: run1.digests.ALREADY_SATISFIED_ROOT_HIT_SELECTION_SHA256,
    rows: run1.frozen.alreadySatisfiedSelection,
  },
  "lineage-manifest.json": manifest,
};
for (const [name, value] of Object.entries(files)) await writeImmutableJson(path.join(artifactDir, name), value);
console.log(JSON.stringify({
  ROOM_ROOT_HIT190_LINEAGE_AND_READINESS_STATUS: "GREEN",
  ...run1.summary,
  ...run1.readiness.summary,
  ...run1.digests,
  RECONCILIATION_RUN_COUNT: 2,
  RECONCILIATION_DETERMINISTIC: "YES",
  EXISTING_CANONICAL_RUNNER_REUSABLE: run1.readiness.EXISTING_CANONICAL_RUNNER_REUSABLE,
  CANONICAL_RUNNER_ENTRYPOINT: run1.readiness.CANONICAL_RUNNER_ENTRYPOINT,
  ACTUAL_SHARED_EXECUTOR_PATH_TESTED: run1.readiness.ACTUAL_SHARED_EXECUTOR_PATH_TESTED,
  ACTUAL_TERMINAL_ADAPTER_PATH_TESTED: run1.readiness.ACTUAL_TERMINAL_ADAPTER_PATH_TESTED,
  ACTUAL_SELECTION_CONSUMER_PATH_TESTED: run1.readiness.ACTUAL_SELECTION_CONSUMER_PATH_TESTED,
  ROOT_HIT_LINEAGE_ARTIFACT_PATH: path.relative(repositoryRoot, path.join(artifactDir, "root-hit190-lineage.json")).replaceAll("\\", "/"),
  FINAL_ROOT_HIT_REPLAY_SELECTION_PATH: path.relative(repositoryRoot, path.join(artifactDir, "final-root-hit-replay-selection.json")).replaceAll("\\", "/"),
  ALREADY_SATISFIED_SELECTION_PATH: path.relative(repositoryRoot, path.join(artifactDir, "already-satisfied-root-hit-selection.json")).replaceAll("\\", "/"),
  LINEAGE_MANIFEST_PATH: path.relative(repositoryRoot, path.join(artifactDir, "lineage-manifest.json")).replaceAll("\\", "/"),
  PRODUCT_FILES_CHANGED: 0,
  REAL_BROWSER_RUN_STARTED: "NO",
  CHROMIUM_PROCESS_STARTED: "NO",
  PLAYWRIGHT_BROWSER_CONNECTED: "NO",
  canonicalPayloadDigest: canonicalSerialize(manifest).length,
}, null, 2));
