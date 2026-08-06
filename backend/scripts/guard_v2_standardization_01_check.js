#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

function must(condition, label) {
  if (!condition) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

function contains(text, needle) {
  return String(text || "").includes(String(needle || ""));
}

function scan(label, text, needles) {
  for (const needle of needles) {
    must(contains(text, needle), `${label} contains ${needle}`);
  }
}

function main() {
  console.log("=== GUARD-V2-STANDARDIZATION-01 CHECK ===");

  const pkg = read("package.json");
  const textIntegrity = read("backend/scripts/lib/guardTextIntegrity.js");
  const gitScope = read("backend/scripts/lib/guardGitScope.js");
  const validationEnv = read("backend/scripts/lib/guardValidationEnvironment.js");
  const runnerContracts = read("backend/scripts/lib/guardRunnerContracts.js");
  const tiers = read("backend/scripts/lib/guardRegressionTiers.js");
  const runner = read("backend/scripts/run_guard_regression_chain.js");
  const policy = read("docs/GUARD_V2_STANDARDIZATION_01.md");

  scan("package.json", pkg, [
    '"check:guardv2standardization01"',
    '"check:core-regression"',
    '"check:extended-regression"',
    '"check:release-regression"',
  ]);

  scan("guardTextIntegrity", textIntegrity, [
    "normalizedTextSha256",
    "bare CR not allowed",
    "BOM not allowed",
    'new TextDecoder("utf-8", { fatal: true })',
    '.replace(/\\r\\n/g, "\\n")',
  ]);

  scan("guardGitScope", gitScope, [
    "mustExactGitPaths",
    "mustNoDiffExcept",
    "mustNoStagedPrefix",
    "gitStatusEntries",
  ]);

  scan("guardValidationEnvironment", validationEnv, [
    "mustCleanCommittedState",
    "working tree hygiene",
    "stage stays empty",
  ]);

  scan("guardRunnerContracts", runnerContracts, [
    "runScriptChain",
    "runNpmScript",
  ]);

  scan("guardRegressionTiers", tiers, [
    "coreRegressionScripts",
    "extendedRegressionScripts",
    "releaseRegressionScripts",
  ]);

  scan("run_guard_regression_chain", runner, [
    "--tier core",
    "--tier extended",
    "--tier release",
  ]);

  scan("policy", policy, [
    "raw migration.sql hashing",
    "dirty-path expectations for committed product files",
    "historical guards automatically entering core regression",
    "Windows/Linux checkout stability",
  ]);

  console.log("=== GUARD-V2-STANDARDIZATION-01 CHECK PASS ===");
}

try {
  main();
} catch (error) {
  console.error(error?.stack || String(error));
  process.exit(1);
}
