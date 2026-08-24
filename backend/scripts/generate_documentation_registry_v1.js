#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildDocumentationRegistryV1,
  currentGitStateSummaryForRegistry,
  serializeDocumentationRegistryV1,
  writeDocumentationRegistryV1,
} from "./lib/documentationRegistryV1.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const registryPath = path.join(repoRoot, "backend", "indexes", "documentation_registry_v1.json");

function must(condition, label) {
  if (!condition) {
    throw new Error(`FAIL ${label}`);
  }
}

function parseArgs(argv) {
  return new Set(argv.map((arg) => String(arg).trim()));
}

function formatClassificationCounts(counts) {
  return [
    ["CANONICAL_SSOT", counts.CANONICAL_SSOT || 0],
    ["ACTIVE_DOMAIN_DOC", counts.ACTIVE_DOMAIN_DOC || 0],
    ["REFERENCE_POINTER", counts.REFERENCE_POINTER || 0],
    ["HISTORICAL_EVIDENCE", counts.HISTORICAL_EVIDENCE || 0],
    ["DERIVED_GENERATED", counts.DERIVED_GENERATED || 0],
    ["STALE_CONTRADICTORY", counts.STALE_CONTRADICTORY || 0],
    ["UNKNOWN_NEEDS_REVIEW", counts.UNKNOWN_NEEDS_REVIEW || 0],
    ["CHECKER_DEPENDENT", counts.CHECKER_DEPENDENT || 0],
    ["ARCHIVE_CANDIDATE", counts.ARCHIVE_CANDIDATE || 0],
    ["DUPLICATE", counts.DUPLICATE || 0],
    ["ORPHAN", counts.ORPHAN || 0],
  ]
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
}

function main() {
  const flags = parseArgs(process.argv.slice(2));
  const shouldWrite = flags.has("--write");

  const registry = buildDocumentationRegistryV1();
  const gitState = currentGitStateSummaryForRegistry();
  const serialized = serializeDocumentationRegistryV1(registry);

  console.log("DOCUMENTATION-REGISTRY-V1 GENERATOR");
  console.log(`registryPath=${registryPath}`);
  console.log(`rows=${registry.entries.length}`);
  console.log(`tracked=${registry.census.tracked}`);
  console.log(`untracked=${registry.census.untracked}`);
  console.log(`gitTracked=${gitState.trackedCount}`);
  console.log(`gitIgnoredOrGenerated=${gitState.ignoredCount}`);
  console.log(`gitStatusUntracked=${gitState.actualUntrackedCount}`);
  console.log(`classificationCounts=${formatClassificationCounts(registry.summaryCounts.classificationCounts)}`);
  console.log(`archiveBlocked=${registry.summaryCounts.archiveBlocked}`);
  console.log(`checkerDependent=${registry.summaryCounts.checkerDependent}`);
  console.log(`generated=${registry.summaryCounts.generated}`);
  console.log(`activeCanonical=${registry.summaryCounts.activeCanonical}`);

  if (!shouldWrite) {
    console.log("dryRun=PASS");
    return;
  }

  const { absPath } = writeDocumentationRegistryV1();
  must(fs.existsSync(absPath), "registry write path exists");
  console.log(`wrote=${absPath}`);
  console.log(`bytes=${Buffer.byteLength(serialized, "utf8")}`);
  console.log("write=PASS");
}

main();
