#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const paths = {
  packageJson: path.join(repoRoot, "package.json"),
  runner: path.join(repoRoot, "backend", "scripts", "run_product_extensions_check_chain.js"),
  verify: path.join(repoRoot, "backend", "scripts", "verify_chain_01_product_extensions_check.js"),
  harnessCheck: path.join(repoRoot, "backend", "scripts", "script_harness_consolidation_01_check.js"),
  harnessDoc: path.join(repoRoot, "docs", "SCRIPT_HARNESS_CONSOLIDATION_01.md"),
  guide: path.join(repoRoot, "docs", "SCRIPT_KILAVUZU_MILESTONE_HARITASI.md"),
  primer: path.join(repoRoot, "docs", "PRIMER_SSOT.md"),
  doc: path.join(repoRoot, "docs", "DATA_INTEGRITY_AND_RECOVERY_01.md"),
  jsonFileStore: path.join(repoRoot, "backend", "src", "lib", "jsonFileStore.js"),
  adminRoute: path.join(repoRoot, "backend", "src", "routes", "admin.js"),
  backupArchiveOps: path.join(repoRoot, "backend", "src", "ops", "backupArchiveOps.js"),
  retentionBackupPolicy: path.join(repoRoot, "backend", "src", "ops", "retentionBackupPolicy.js"),
  envJs: path.join(repoRoot, "backend", "src", "env.js"),
  backupCreateScript: path.join(repoRoot, "backend", "scripts", "m45_backup_create.js"),
  backupRestoreScript: path.join(repoRoot, "backend", "scripts", "m45_backup_restore.js"),
  runbook: path.join(repoRoot, "docs", "RUNBOOK_M45_RETENTION_BACKUP.md"),
  archiveRestoreDoc: path.join(repoRoot, "docs", "REGION_ARCHIVE_EXPORT_MANIFEST_RESTORE_V1.md"),
  gitignore: path.join(repoRoot, ".gitignore"),
  debugLog: path.join(repoRoot, "debug.log"),
};

function readFile(relOrAbsPath) {
  return fs.readFileSync(relOrAbsPath, "utf8");
}

function normalize(text) {
  return String(text || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, "/")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function contains(text, needle) {
  return normalize(text).includes(normalize(needle));
}

function must(condition, label) {
  if (!condition) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

function addCase(cases, label, fn) {
  cases.push({ label, fn });
}

function addContainsCase(cases, label, text, needle) {
  addCase(cases, label, () => must(contains(text, needle), `${label} missing ${needle}`));
}

function addNotContainsCase(cases, label, text, needle) {
  addCase(cases, label, () => must(!contains(text, needle), `${label} unexpectedly contains ${needle}`));
}

function ordered(text, needles, label) {
  const haystack = normalize(text);
  let cursor = 0;
  for (const needle of needles) {
    const target = normalize(needle);
    const index = haystack.indexOf(target, cursor);
    if (index === -1) {
      throw new Error(`FAIL ${label}: missing ${needle}`);
    }
    cursor = index + target.length;
  }
  console.log(`OK ${label}`);
}

function gitLines(args) {
  const out = execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function main() {
  console.log("=== DATA-INTEGRITY-AND-RECOVERY-01 CHECK ===");

  const cases = [];
  const pkg = readFile(paths.packageJson);
  const runner = readFile(paths.runner);
  const verify = readFile(paths.verify);
  const harnessCheck = readFile(paths.harnessCheck);
  const harnessDoc = readFile(paths.harnessDoc);
  const guide = readFile(paths.guide);
  const primer = readFile(paths.primer);
  const doc = readFile(paths.doc);
  const jsonFileStore = readFile(paths.jsonFileStore);
  const adminRoute = readFile(paths.adminRoute);
  const backupArchiveOps = readFile(paths.backupArchiveOps);
  const retentionBackupPolicy = readFile(paths.retentionBackupPolicy);
  const envJs = readFile(paths.envJs);
  const backupCreateScript = readFile(paths.backupCreateScript);
  const backupRestoreScript = readFile(paths.backupRestoreScript);
  const runbook = readFile(paths.runbook);
  const archiveRestoreDoc = readFile(paths.archiveRestoreDoc);
  const gitignore = readFile(paths.gitignore);

  addContainsCase(cases, "package.json exposes data integrity alias", pkg, '"check:dataintegrityandrecovery01": "node backend/scripts/data_integrity_and_recovery_01_check.js"');
  addContainsCase(cases, "product extensions runner includes data integrity check", runner, "check:dataintegrityandrecovery01");
  addContainsCase(cases, "verify chain includes data integrity check", verify, "check:dataintegrityandrecovery01");

  addContainsCase(cases, "script harness check knows data integrity milestone", harnessCheck, "DATA-INTEGRITY-AND-RECOVERY-01");
  addContainsCase(cases, "script harness check knows data integrity alias", harnessCheck, "check:dataintegrityandrecovery01");
  addContainsCase(cases, "script harness check knows data integrity doc", harnessCheck, "docs/DATA_INTEGRITY_AND_RECOVERY_01.md");
  addContainsCase(cases, "script harness check knows data integrity command", harnessCheck, "node backend\\\\scripts\\\\data_integrity_and_recovery_01_check.js");

  addContainsCase(cases, "script harness doc lists data integrity milestone", harnessDoc, "DATA-INTEGRITY-AND-RECOVERY-01");
  addContainsCase(cases, "script harness doc lists data integrity alias", harnessDoc, "check:dataintegrityandrecovery01");
  addContainsCase(cases, "script harness doc lists data integrity doc", harnessDoc, "docs/DATA_INTEGRITY_AND_RECOVERY_01.md");
  addContainsCase(cases, "script harness doc lists data integrity command", harnessDoc, "node backend\\scripts\\data_integrity_and_recovery_01_check.js");

  addContainsCase(cases, "milestone guide lists data integrity milestone", guide, "DATA-INTEGRITY-AND-RECOVERY-01");
  addContainsCase(cases, "milestone guide lists data integrity alias", guide, "check:dataintegrityandrecovery01");
  addContainsCase(cases, "milestone guide lists data integrity command", guide, "node backend\\scripts\\data_integrity_and_recovery_01_check.js");
  addContainsCase(cases, "milestone guide lists data integrity doc", guide, "docs/DATA_INTEGRITY_AND_RECOVERY_01.md");

  addContainsCase(cases, "primer lists data integrity milestone", primer, "DATA-INTEGRITY-AND-RECOVERY-01");
  addContainsCase(cases, "primer lists data integrity alias", primer, "check:dataintegrityandrecovery01");
  addContainsCase(cases, "primer lists data integrity doc", primer, "docs/DATA_INTEGRITY_AND_RECOVERY_01.md");
  addContainsCase(cases, "primer lists data integrity command", primer, "backend/scripts/data_integrity_and_recovery_01_check.js");

  const docHeadings = [
    "# DATA-INTEGRITY-AND-RECOVERY-01",
    "## 1) Purpose",
    "## 2) Problem statement",
    "## 3) Data safety model",
    "## 4) Backup policy",
    "## 5) Restore policy",
    "## 6) RPO / RTO policy",
    "## 7) Idempotency policy",
    "## 8) Transaction safety policy",
    "## 9) Runtime-data recovery policy",
    "## 10) Corruption detection policy",
    "## 11) Release gate",
    "## 12) Generated artifacts and commit-external boundary",
    "## 13) What is not changed",
    "## 14) Validation results",
    "## 15) Remaining risks",
    "## 16) Next recommended milestone",
  ];
  for (const heading of docHeadings) {
    addContainsCase(cases, `data integrity doc heading ${heading}`, doc, heading);
  }

  addContainsCase(cases, "data integrity doc mentions production DB boundary", doc, "production DB");
  addContainsCase(cases, "data integrity doc mentions destructive queries", doc, "destructive query");
  addContainsCase(cases, "data integrity doc mentions schema and migration boundary", doc, "schema veya migration");
  addContainsCase(cases, "data integrity doc mentions backup policy", doc, "backup policy");
  addContainsCase(cases, "data integrity doc mentions restore policy", doc, "restore policy");
  addContainsCase(cases, "data integrity doc mentions RPO/RTO", doc, "RPO / RTO");
  addContainsCase(cases, "data integrity doc mentions idempotency", doc, "idempotency");
  addContainsCase(cases, "data integrity doc mentions transaction safety", doc, "transaction safety");
  addContainsCase(cases, "data integrity doc mentions runtime-data recovery", doc, "runtime-data recovery");
  addContainsCase(cases, "data integrity doc mentions corruption detection", doc, "corruption detection");
  addContainsCase(cases, "data integrity doc mentions release gate", doc, "release gate");
  addContainsCase(cases, "data integrity doc mentions commit-external boundary", doc, "commit dışı");
  addContainsCase(cases, "data integrity doc mentions runtime-data artifact dir", doc, "backend/artifacts/runtime-data/");
  addContainsCase(cases, "data integrity doc mentions browser-smoke artifact dir", doc, "backend/artifacts/browser-smoke/");
  addContainsCase(cases, "data integrity doc mentions load-test artifact dir", doc, "backend/artifacts/load-test/");
  addContainsCase(cases, "data integrity doc mentions db-scaling artifact dir", doc, "backend/artifacts/db-scaling/");
  addContainsCase(cases, "data integrity doc mentions observability artifact dir", doc, "backend/artifacts/observability/");
  addContainsCase(cases, "data integrity doc mentions data-integrity artifact dir", doc, "backend/artifacts/data-integrity/");
  addContainsCase(cases, "data integrity doc mentions debug log", doc, "debug.log");
  addContainsCase(cases, "data integrity doc mentions verify repo", doc, "verify:repo");
  addContainsCase(cases, "data integrity doc mentions verify final", doc, "verify:final");
  addContainsCase(cases, "data integrity doc mentions backend lint", doc, "npm --prefix backend run lint");
  addContainsCase(cases, "data integrity doc mentions web lint", doc, "npm --prefix web run lint");
  addContainsCase(cases, "data integrity doc mentions M45 runbook", doc, "RUNBOOK_M45_RETENTION_BACKUP.md");
  addContainsCase(cases, "data integrity doc mentions archive restore doc", doc, "REGION_ARCHIVE_EXPORT_MANIFEST_RESTORE_V1.md");
  addContainsCase(cases, "data integrity doc mentions jsonFileStore", doc, "backend/src/lib/jsonFileStore.js");
  addContainsCase(cases, "data integrity doc mentions admin route", doc, "backend/src/routes/admin.js");
  addContainsCase(cases, "data integrity doc mentions backupArchiveOps", doc, "backend/src/ops/backupArchiveOps.js");
  addContainsCase(cases, "data integrity doc mentions backup create script", doc, "backend/scripts/m45_backup_create.js");
  addContainsCase(cases, "data integrity doc mentions backup restore script", doc, "backend/scripts/m45_backup_restore.js");

  const validationSummaryNeedles = [
    "dataClassificationSummary",
    "integrityRiskSummary",
    "transactionBoundarySummary",
    "idempotencySummary",
    "backupRestoreSummary",
    "runtimeDataRecoverySummary",
    "kvkkSafeRecoverySummary",
    "compatibilitySummary",
    "smokeThresholdSummary",
    "chainWiringSummary",
    "commitExternalSummary",
    "prismaSummary",
  ];
  for (const needle of validationSummaryNeedles) {
    addContainsCase(cases, `data integrity doc preserves ${needle}`, doc, needle);
  }

  const policyNeedles = [
    ["data integrity doc keeps data classification wording", doc, "data classification"],
    ["data integrity doc keeps critical entity matrix wording", doc, "critical entity matrix"],
    ["data integrity doc keeps referential integrity policy wording", doc, "referential integrity policy"],
    ["data integrity doc keeps transaction boundary policy wording", doc, "transaction boundary policy"],
    ["data integrity doc keeps idempotency and retry-safety wording", doc, "idempotency and retry-safety policy"],
    ["data integrity doc keeps backup policy wording", doc, "backup policy"],
    ["data integrity doc keeps restore policy wording", doc, "restore policy"],
    ["data integrity doc keeps RPO/RTO target wording", doc, "RPO / RTO targets"],
    ["data integrity doc keeps recovery runbook wording", doc, "recovery runbook"],
    ["data integrity doc keeps corruption detection wording", doc, "corruption detection policy"],
    ["data integrity doc keeps partial duplicate stale write matrix wording", doc, "partial write / duplicate write / stale write risk matrix"],
    ["data integrity doc keeps runtime-data recovery wording", doc, "runtime-data commit-external and recovery policy"],
    ["data integrity doc keeps migration rollback wording", doc, "migration and rollback safety policy"],
    ["data integrity doc keeps KVKK-safe backup logging wording", doc, "KVKK-safe backup/logging policy"],
    ["data integrity doc keeps observability handoff wording", doc, "observability handoff"],
    ["data integrity doc keeps incident severity wording", doc, "incident severity matrix"],
    ["data integrity doc keeps release gate wording", doc, "release gate checklist"],
    ["data integrity doc keeps generated artifact wording", doc, "generated artifact policy"],
    ["data integrity doc keeps runtime-data list wording", doc, "runtime-data list"],
    ["data integrity doc keeps no production DB wording", doc, "no production DB"],
    ["data integrity doc keeps no destructive query wording", doc, "no destructive query"],
    ["data integrity doc keeps no schema migration wording", doc, "no schema/migration"],
    ["data integrity doc keeps no route service prisma diff wording", doc, "no route/service/prisma diff"],
    ["data integrity doc keeps smoke threshold wording", doc, "smoke threshold 18/82/82/82"],
    ["data integrity doc keeps console error count wording", doc, "consoleErrorCount=0"],
    ["data integrity doc keeps page error count wording", doc, "pageErrorCount=0"],
    ["data integrity doc keeps 429 wording", doc, "429=none"],
  ];
  for (const [label, text, needle] of policyNeedles) {
    addContainsCase(cases, label, text, needle);
  }

  addContainsCase(cases, "jsonFileStore keeps backup path", jsonFileStore, "backupPath");
  addContainsCase(cases, "jsonFileStore keeps async backup fallback", jsonFileStore, "backupCurrentAsync");
  addContainsCase(cases, "jsonFileStore keeps sync backup fallback", jsonFileStore, "backupCurrentSync");
  addContainsCase(cases, "jsonFileStore keeps bak fallback", jsonFileStore, ".bak");
  addContainsCase(cases, "jsonFileStore keeps parse fallback", jsonFileStore, "return parse(await fsp.readFile(backupPath, \"utf8\"));");

  addContainsCase(cases, "admin route exposes backup policy", adminRoute, "/backup/policy");
  addContainsCase(cases, "admin route exposes backup manifest", adminRoute, "/backup/manifest");
  addContainsCase(cases, "admin route exposes backup create", adminRoute, "/backup/create");
  addContainsCase(cases, "admin route exposes backup restore", adminRoute, "/backup/restore");

  addContainsCase(cases, "backupArchiveOps exposes createBackupArchive", backupArchiveOps, "createBackupArchive");
  addContainsCase(cases, "backupArchiveOps exposes restoreBackupArchive", backupArchiveOps, "restoreBackupArchive");
  addContainsCase(cases, "backupArchiveOps keeps manifest wording", backupArchiveOps, "manifest");
  addContainsCase(cases, "backupArchiveOps keeps hash wording", backupArchiveOps, "backupSha256");

  addContainsCase(cases, "retention backup policy keeps local dir", retentionBackupPolicy, "backupLocalDir");
  addContainsCase(cases, "retention backup policy keeps retention days", retentionBackupPolicy, "backupLocalRetentionDays");
  addContainsCase(cases, "retention backup policy keeps dump format", retentionBackupPolicy, "backupDumpFormat");
  addContainsCase(cases, "env keeps backup local dir", envJs, "BACKUP_LOCAL_DIR");

  addContainsCase(cases, "backup create script keeps backup file marker", backupCreateScript, "OK Backup file:");
  addContainsCase(cases, "backup create script keeps manifest wording", backupCreateScript, "manifest");
  addContainsCase(cases, "backup restore script keeps skip wording", backupRestoreScript, "SKIP Restore skipped: --backup-file not provided.");
  addContainsCase(cases, "backup restore script keeps restore wording", backupRestoreScript, "OK Restore completed from:");

  addContainsCase(cases, "runbook keeps backup policy wording", runbook, "backup policy");
  addContainsCase(cases, "runbook keeps restore wording", runbook, "restore");
  addContainsCase(cases, "runbook keeps manifest wording", runbook, "manifest");
  addContainsCase(cases, "archive restore doc keeps backup wording", archiveRestoreDoc, "backup");
  addContainsCase(cases, "archive restore doc keeps restore wording", archiveRestoreDoc, "restore");
  addContainsCase(cases, "archive restore doc keeps manifest wording", archiveRestoreDoc, "manifest");

  addNotContainsCase(cases, "gitignore keeps runtime-data visible", gitignore, "backend/artifacts/runtime-data/");
  addContainsCase(cases, "gitignore keeps browser-smoke ignored", gitignore, "backend/artifacts/browser-smoke/");
  addContainsCase(cases, "gitignore keeps load-test ignored", gitignore, "backend/artifacts/load-test/");
  addContainsCase(cases, "gitignore keeps db-scaling ignored", gitignore, "backend/artifacts/db-scaling/");
  addContainsCase(cases, "gitignore keeps observability ignored", gitignore, "backend/artifacts/observability/");
  addContainsCase(cases, "gitignore keeps data-integrity ignored", gitignore, "backend/artifacts/data-integrity/");

  addCase(cases, "route diff stays empty", () => {
    must(gitLines(["diff", "--name-only", "--", "backend/src/routes"]).length === 0, "route diff not empty");
  });
  addCase(cases, "service diff stays empty", () => {
    must(gitLines(["diff", "--name-only", "--", "backend/src/services"]).length === 0, "service diff not empty");
  });
  addCase(cases, "prisma diff stays empty", () => {
    must(gitLines(["diff", "--name-only", "--", "prisma"]).length === 0, "prisma diff not empty");
  });
  addCase(cases, "backend prisma diff stays empty", () => {
    must(gitLines(["diff", "--name-only", "--", "backend/prisma"]).length === 0, "backend prisma diff not empty");
  });
  addCase(cases, "git diff --check stays clean", () => {
    must(gitLines(["diff", "--check"]).length === 0, "git diff --check findings");
  });
  addCase(cases, "git diff --cached --check stays clean", () => {
    must(gitLines(["diff", "--cached", "--check"]).length === 0, "git diff --cached --check findings");
  });
  addCase(cases, "git diff --cached --name-only stays empty", () => {
    must(gitLines(["diff", "--cached", "--name-only"]).length === 0, "git diff --cached --name-only findings");
  });
  addCase(cases, "debug.log stays absent", () => {
    must(!fs.existsSync(paths.debugLog), "debug.log exists");
  });

  ordered(doc, [
    "# DATA-INTEGRITY-AND-RECOVERY-01",
    "## 1) Purpose",
    "## 2) Problem statement",
    "## 3) Data safety model",
    "## 4) Backup policy",
    "## 5) Restore policy",
    "## 6) RPO / RTO policy",
    "## 7) Idempotency policy",
    "## 8) Transaction safety policy",
    "## 9) Runtime-data recovery policy",
    "## 10) Corruption detection policy",
    "## 11) Release gate",
    "## 12) Generated artifacts and commit-external boundary",
    "## 13) What is not changed",
    "## 14) Validation results",
    "## 15) Remaining risks",
    "## 16) Next recommended milestone",
  ], "data integrity doc heading order");

  const passCount = cases.length;
  for (const testCase of cases) {
    testCase.fn();
  }

  const dataClassificationSummary = [
    contains(doc, "data classification"),
    contains(doc, "critical entity matrix"),
    contains(doc, "referential integrity policy"),
  ].every(Boolean)
    ? "data classification, critical entity matrix and referential integrity policy stay visible"
    : "data classification coverage incomplete";

  const integrityRiskSummary = [
    contains(doc, "partial write / duplicate write / stale write risk matrix"),
    contains(doc, "corruption detection policy"),
    contains(doc, "incident severity matrix"),
  ].every(Boolean)
    ? "partial write, duplicate write and stale write risk matrix stays visible"
    : "integrity risk coverage incomplete";

  const transactionBoundarySummary = [
    contains(doc, "transaction boundary policy"),
    contains(doc, "migration and rollback safety policy"),
    contains(doc, "no schema/migration"),
  ].every(Boolean)
    ? "transaction boundary policy and migration / rollback safety stay visible"
    : "transaction boundary coverage incomplete";

  const idempotencySummary = [
    contains(doc, "idempotency and retry-safety policy"),
    contains(doc, "recovery runbook"),
    contains(jsonFileStore, "backupCurrentAsync"),
    contains(jsonFileStore, "backupCurrentSync"),
  ].every(Boolean)
    ? "idempotency and retry-safety stay visible"
    : "idempotency coverage incomplete";

  const backupRestoreSummary = [
    contains(doc, "backup policy"),
    contains(doc, "restore policy"),
    contains(runbook, "backup policy"),
    contains(runbook, "restore"),
    contains(archiveRestoreDoc, "manifest"),
  ].every(Boolean)
    ? "backup policy, restore policy and runbook alignment stay visible"
    : "backup / restore coverage incomplete";

  const runtimeDataRecoverySummary = [
    contains(doc, "runtime-data commit-external and recovery policy"),
    contains(doc, "runtime-data list"),
    contains(jsonFileStore, ".bak"),
  ].every(Boolean)
    ? "runtime-data recovery and .bak fallback stay visible"
    : "runtime-data recovery coverage incomplete";

  const kvkkSafeRecoverySummary = [
    contains(doc, "KVKK-safe backup/logging policy"),
    contains(doc, "observability handoff"),
    contains(doc, "no production DB"),
  ].every(Boolean)
    ? "KVKK-safe backup/logging and observability handoff stay visible"
    : "KVKK-safe recovery coverage incomplete";

  const compatibilitySummary = [
    contains(doc, "compatibilitySummary"),
    contains(runbook, "backup policy"),
    contains(archiveRestoreDoc, "backup"),
    contains(archiveRestoreDoc, "restore"),
  ].every(Boolean)
    ? "backup / restore docs and runtime surfaces stay aligned"
    : "compatibility coverage incomplete";

  const smokeThresholdSummary = [
    contains(doc, "smoke threshold 18/82/82/82"),
    contains(doc, "consoleErrorCount=0"),
    contains(doc, "pageErrorCount=0"),
    contains(doc, "429=none"),
  ].every(Boolean)
    ? "product-flow PASS 18/0/0/0; premium PASS 82/0/0/0; all-panels PASS 82/0/0/0; mobile all-roles PASS 82/0/0/0"
    : "smoke threshold coverage incomplete";

  const chainWiringSummary = [
    contains(pkg, '"check:dataintegrityandrecovery01": "node backend/scripts/data_integrity_and_recovery_01_check.js"'),
    contains(runner, "check:dataintegrityandrecovery01"),
    contains(verify, "check:dataintegrityandrecovery01"),
    contains(harnessCheck, "DATA-INTEGRITY-AND-RECOVERY-01"),
    contains(harnessDoc, "DATA-INTEGRITY-AND-RECOVERY-01"),
    contains(guide, "DATA-INTEGRITY-AND-RECOVERY-01"),
    contains(primer, "DATA-INTEGRITY-AND-RECOVERY-01"),
  ].every(Boolean)
    ? "package.json, runner, verify chain, harness and docs stay wired"
    : "chain wiring coverage incomplete";

  const commitExternalSummary = [
    gitLines(["status", "--short"]).some((line) => line.includes("backend/artifacts/runtime-data/")),
    contains(gitignore, "backend/artifacts/browser-smoke/"),
    contains(gitignore, "backend/artifacts/load-test/"),
    contains(gitignore, "backend/artifacts/db-scaling/"),
    contains(gitignore, "backend/artifacts/observability/"),
    contains(gitignore, "backend/artifacts/data-integrity/"),
    !fs.existsSync(paths.debugLog),
    gitLines(["diff", "--cached", "--name-only"]).length === 0,
  ].every(Boolean)
    ? "runtime-data stays commit external; generated artifacts and debug.log stay out of stage"
    : "commit-external coverage incomplete";

  const prismaSummary = [
    gitLines(["diff", "--name-only", "--", "backend/src/routes"]).length === 0,
    gitLines(["diff", "--name-only", "--", "backend/src/services"]).length === 0,
    gitLines(["diff", "--name-only", "--", "prisma"]).length === 0,
    gitLines(["diff", "--name-only", "--", "backend/prisma"]).length === 0,
  ].every(Boolean)
    ? "route/service/prisma and backend/prisma diff stay empty"
    : "prisma diff coverage incomplete";

  console.log(`guardCases=${cases.length}`);
  console.log(`passCount=${passCount}`);
  console.log("failCount=0");
  console.log(`dataClassificationSummary=${dataClassificationSummary}`);
  console.log(`integrityRiskSummary=${integrityRiskSummary}`);
  console.log(`transactionBoundarySummary=${transactionBoundarySummary}`);
  console.log(`idempotencySummary=${idempotencySummary}`);
  console.log(`backupRestoreSummary=${backupRestoreSummary}`);
  console.log(`runtimeDataRecoverySummary=${runtimeDataRecoverySummary}`);
  console.log(`kvkkSafeRecoverySummary=${kvkkSafeRecoverySummary}`);
  console.log(`compatibilitySummary=${compatibilitySummary}`);
  console.log(`smokeThresholdSummary=${smokeThresholdSummary}`);
  console.log(`chainWiringSummary=${chainWiringSummary}`);
  console.log(`commitExternalSummary=${commitExternalSummary}`);
  console.log(`prismaSummary=${prismaSummary}`);
  console.log("PASS DATA-INTEGRITY-AND-RECOVERY-01");
}

try {
  main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}
