#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildDocumentationRegistryV1,
  compareDocumentationRegistryV1,
  currentGitStateSummaryForRegistry,
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

function formatCounts(counts) {
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

function summarizeDiffs(diffs) {
  const counts = new Map();
  for (const diff of diffs) {
    counts.set(diff.type, (counts.get(diff.type) || 0) + 1);
  }

  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, count]) => `${type}=${count}`)
    .join(" ");
}

function printPreview(diffs, limit = 20) {
  for (const diff of diffs.slice(0, limit)) {
    if (diff.type === "SUMMARY_MISMATCH") {
      console.log(`DIFF ${diff.type} ${diff.field} expected=${JSON.stringify(diff.expected)} actual=${JSON.stringify(diff.actual)}`);
      continue;
    }
    if (diff.type === "CLASSIFICATION_COUNT_MISMATCH" || diff.type === "SUMMARY_FIELD_MISMATCH") {
      console.log(`DIFF ${diff.type} ${diff.key} expected=${JSON.stringify(diff.expected)} actual=${JSON.stringify(diff.actual)}`);
      continue;
    }
    if (diff.expected !== undefined || diff.actual !== undefined) {
      console.log(`DIFF ${diff.type} ${diff.path || diff.field || ""} expected=${JSON.stringify(diff.expected)} actual=${JSON.stringify(diff.actual)}`.trim());
      continue;
    }
    console.log(`DIFF ${JSON.stringify(diff)}`);
  }
}

function main() {
  console.log("DOCUMENTATION-REGISTRY-V1 CHECK");
  must(fs.existsSync(registryPath), `registry exists: ${registryPath}`);

  const actual = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  const expected = buildDocumentationRegistryV1();
  const gitState = currentGitStateSummaryForRegistry();
  const diffs = compareDocumentationRegistryV1(expected, actual);

  console.log(`rows=${actual.entries.length}`);
  console.log(`tracked=${actual.census?.tracked ?? 0}`);
  console.log(`untracked=${actual.census?.untracked ?? 0}`);
  console.log(`gitTracked=${gitState.trackedCount}`);
  console.log(`gitIgnoredOrGenerated=${gitState.ignoredCount}`);
  console.log(`gitStatusUntracked=${gitState.actualUntrackedCount}`);
  console.log(`classificationCounts=${formatCounts(actual.summaryCounts?.classificationCounts || {})}`);
  console.log(`archiveBlocked=${actual.summaryCounts?.archiveBlocked ?? 0}`);
  console.log(`checkerDependent=${actual.summaryCounts?.checkerDependent ?? 0}`);
  console.log(`generated=${actual.summaryCounts?.generated ?? 0}`);
  console.log(`activeCanonical=${actual.summaryCounts?.activeCanonical ?? 0}`);

  if (diffs.length > 0) {
    console.log(`diffCount=${diffs.length}`);
    console.log(`diffSummary=${summarizeDiffs(diffs)}`);
    printPreview(diffs);
    console.log("PASS=NO");
    process.exit(1);
  }

  console.log("PASS DOCUMENTATION-REGISTRY-V1");
  console.log("diffCount=0");
  console.log(`rows=${expected.entries.length}`);
  console.log(`classificationCounts=${formatCounts(expected.summaryCounts.classificationCounts)}`);
  console.log(`archiveBlocked=${expected.summaryCounts.archiveBlocked}`);
  console.log(`checkerDependent=${expected.summaryCounts.checkerDependent}`);
  console.log(`generated=${expected.summaryCounts.generated}`);
  console.log(`activeCanonical=${expected.summaryCounts.activeCanonical}`);
}

main();
