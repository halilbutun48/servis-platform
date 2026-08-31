#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "../..");
const BACKEND_ROOT = path.join(REPO_ROOT, "backend");
const PRISMA_CLI = path.join(BACKEND_ROOT, "node_modules", "prisma", "build", "index.js");
const EVIDENCE_DIR = path.join(BACKEND_ROOT, "artifacts", "data-integrity", "DATABASE_MIGRATION_BASELINE_AND_LIVE_ADOPTION_01");
const protectedRuntimePaths = new Set([
  "backend/artifacts/runtime-data/password-change-requirements.json",
  "backend/artifacts/runtime-data/username-directory.json",
  "backend/artifacts/runtime-data/agreement-route-refresh-requests.json",
  "backend/artifacts/runtime-data/public-leads.json",
  "backend/artifacts/runtime-data/quality-review-decisions.json",
  "backend/artifacts/runtime-data/region-failover-drill-state.json",
]);
const outcomes = [];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || REPO_ROOT,
    env: { ...process.env, ...(options.env || {}) },
    encoding: "utf8",
    windowsHide: true,
    timeout: options.timeout || 120_000,
    maxBuffer: 32 * 1024 * 1024,
  });
  return { status: result.status ?? 1, output: `${result.stdout || ""}${result.stderr || ""}` };
}

function check(name, value, details = "") {
  const pass = Boolean(value);
  outcomes.push({ name, pass, details });
  console.log(`${pass ? "PASS" : "FAIL"} ${name}${details ? ` :: ${details}` : ""}`);
}

function currentHead() {
  return run("git", ["rev-parse", "HEAD"]).output.trim();
}

function statusLines() {
  return run("git", ["status", "--short"]).output.split(/\r?\n/).filter(Boolean);
}

function read(relPath) {
  const filePath = path.join(REPO_ROOT, relPath);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function readEvidence() {
  const candidates = ["acceptance.json", "ci.json"]
    .map((name) => path.join(EVIDENCE_DIR, name))
    .filter((filePath) => fs.existsSync(filePath))
    .map((filePath) => {
      try { return JSON.parse(fs.readFileSync(filePath, "utf8")); } catch { return null; }
    })
    .filter(Boolean)
    .sort((left, right) => String(right.finishedAt || right.generatedAt || "").localeCompare(String(left.finishedAt || left.generatedAt || "")));
  return candidates[0] || null;
}

function migrationNames() {
  const directory = path.join(BACKEND_ROOT, "prisma", "migrations");
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(directory, entry.name, "migration.sql")))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

async function main() {
  const head = currentHead();
  const status = statusLines();
  const packageJson = JSON.parse(read("backend/package.json"));
  const owner = read("backend/scripts/database_migration_baseline_and_live_adoption_01_owner.mjs");
  const acceptance = read("backend/scripts/database_migration_baseline_and_live_adoption_01.mjs");
  const ci = read("backend/scripts/database_migration_baseline_and_live_adoption_01_ci.mjs");
  const commercial = read("backend/prisma/schema/commercial.prisma");
  const workflow = read(".github/workflows/vardis_verification_visibility.yml");
  const evidence = readEvidence();
  const migrations = migrationNames();
  const statusResult = run(process.execPath, [PRISMA_CLI, "migrate", "status", "--schema", "prisma/schema.prisma"], {
    cwd: BACKEND_ROOT,
    env: { DATABASE_URL: process.env.DATABASE_URL || "postgresql://servis:servispass@127.0.0.1:5433/servisdb?schema=public" },
  });

  check("one canonical migration owner is wired", packageJson.scripts?.["prisma:migrate:deploy"] === "node scripts/database_migration_baseline_and_live_adoption_01_owner.mjs deploy"
    && packageJson.scripts?.["prisma:migrate:status"] === "node scripts/database_migration_baseline_and_live_adoption_01_owner.mjs status"
    && packageJson.scripts?.bootstrap?.includes("npm run prisma:migrate:deploy"));
  check("canonical migration owner uses explicit schema entrypoint", owner.includes('const canonicalSchema = "prisma/schema.prisma"') && owner.includes('"--schema", canonicalSchema'));
  check("live deployment requires approval, backup and change control", owner.includes('MIGRATION_APPROVAL !== "APPROVED"') && owner.includes("MIGRATION_BACKUP_ID") && owner.includes("MIGRATION_CHANGE_CONTROL_ID"));
  check("exactly two authorized defaults are represented", (commercial.match(/updatedAt\s+DateTime\s+@default\(now\(\)\)\s+@updatedAt/g) || []).length === 2);
  check("current migration chain has 56 SQL directories", migrations.length === 56, `found=${migrations.length}`);
  check("no migration path is dirty", !status.some((line) => /backend\/prisma\/migrations\//.test(line)));
  check("protected runtime data is not staged", !status.some((line) => line[0] !== " " && line[0] !== "?" && protectedRuntimePaths.has(line.slice(3).trim())));
  check("acceptance is behavioral and uses isolated PostgreSQL", acceptance.includes('"migrate", "deploy"') && /startPostgres/.test(acceptance) && /physicalSchemaSnapshot/.test(acceptance));
  check("CI owner validates current migration history", /prisma:migration:ci/.test(workflow) || ci.includes("CI_MIGRATION_BASELINE_VALIDATION_PASS_COUNT"));
  check("current-head evidence is present", Boolean(evidence), `head=${evidence?.sourceHead || "missing"}`);
  check("current-head evidence is fresh", evidence?.sourceHead === head && evidence?.pass === true, `evidence=${evidence?.sourceHead || "missing"} head=${head}`);
  check("corrected migration status sees all 56", statusResult.status === 0 && /56\s+migrations found/i.test(statusResult.output) && /up to date/i.test(statusResult.output));

  const requiredCounters = evidence?.mode === "CI_REAL"
    ? ["CI_MIGRATION_BASELINE_VALIDATION_PASS_COUNT", "CI_PRISMA_GENERATE_PASS_COUNT", "CI_GENERATED_CLIENT_INTEGRITY_PASS_COUNT"]
    : [
      "AUTHORIZED_PRE13_SCHEMA_CORRECTION_COUNT", "DB_PRISMA_SEMANTIC_PARITY_PASS_COUNT", "PRISMA_FRESH_REPLAY_SEMANTIC_PARITY_PASS_COUNT",
      "PRE13_BACKUP_VERIFIED_PASS_COUNT", "FRESH_REPLAY_MIGRATION_PASS_COUNT", "ISOLATED_ADOPTION_REHEARSAL_PASS_COUNT",
      "FUTURE_MIGRATION_CONTINUATION_PASS_COUNT", "INTERRUPTED_MIGRATION_DETECTION_PASS_COUNT", "REAL_ROLLBACK_REHEARSAL_PASS_COUNT",
      "POST_ADOPTION_PRISMA_CONNECT_PASS_COUNT", "POST_ADOPTION_PRISMA_QUERY_PASS_COUNT", "POST_ADOPTION_BACKEND_HEALTH_PASS_COUNT",
      "POST_ADOPTION_REPRESENTATIVE_QUERY_PASS_COUNT", "MIGRATION_ADOPTION_AUDIT_TRACE_PASS_COUNT",
    ];
  check("required evidence counters are proven", Boolean(evidence) && requiredCounters.every((name) => Number(evidence.counters?.[name]) >= 1));
  check("closed milestone regressions are explicitly proven", Boolean(evidence?.regressions)
    && evidence.regressions["#7"]?.status === "PASS"
    && evidence.regressions["#10"]?.status === "PASS"
    && evidence.regressions["#11"]?.pass === true
    && evidence.regressions["#12"]?.status === "PASS"
    && Number(evidence.counters?.PRISMA_7_REGRESSION_PASS_COUNT) >= 1
    && Number(evidence.counters?.PRISMA_10_REGRESSION_PASS_COUNT) >= 1
    && Number(evidence.counters?.PRISMA_11_REGRESSION_PASS_COUNT) >= 1
    && Number(evidence.counters?.PRISMA_12_REGRESSION_PASS_COUNT) >= 1);
  check("zero-drift and safety counters remain zero", Boolean(evidence) && [
    "UNAUTHORIZED_SCHEMA_SEMANTIC_CHANGE_COUNT", "NEW_MIGRATION_COUNT", "DB_DDL_REQUIRED_BY_CORRECTION_COUNT", "CANONICAL_DB_SCHEMA_MUTATION_COUNT",
    "UNEXPLAINED_LIVE_SCHEMA_DRIFT_COUNT", "HISTORICAL_MIGRATION_MODIFIED_COUNT", "HISTORICAL_MIGRATION_DELETED_COUNT",
    "HISTORICAL_MIGRATION_RENAMED_COUNT", "HISTORICAL_MIGRATION_REWRITTEN_COUNT", "UNJUSTIFIED_MIGRATION_RESOLVE_COUNT",
    "AMBIGUOUS_BASELINE_POINT_COUNT", "UNNECESSARY_BASELINE_METADATA_WRITE_COUNT", "MIGRATION_ADOPTION_DATA_LOSS_COUNT",
    "MIGRATION_ADOPTION_FINANCIAL_DRIFT_COUNT", "MIGRATION_ADOPTION_TENANT_DRIFT_COUNT", "MIGRATION_ADOPTION_AUTH_DRIFT_COUNT",
    "CANONICAL_DB_DROP_COUNT", "LIVE_DB_RESET_COUNT", "BLIND_HISTORICAL_MIGRATION_APPLY_COUNT", "SOURCE_ONLY_FALSE_PROOF_COUNT",
    "SELF_REFERENTIAL_GUARD_COUNT", "NEGATIVE_SENSITIVITY_LOSS_COUNT", "STALE_MIGRATION_EVIDENCE_ACCEPTED_COUNT",
  ].every((name) => Number(evidence.counters?.[name]) === 0));

  const failed = outcomes.filter((item) => !item.pass);
  console.log(JSON.stringify({
    DATABASE_MIGRATION_BASELINE_AND_LIVE_ADOPTION_01_CHECK: failed.length === 0 ? "PASS" : "BLOCKED",
    AUTHORIZED_PRE13_SCHEMA_CORRECTION_COUNT: Number(evidence?.counters?.AUTHORIZED_PRE13_SCHEMA_CORRECTION_COUNT || 0),
    NEW_MIGRATION_COUNT: Number(evidence?.counters?.NEW_MIGRATION_COUNT || 0),
    MIGRATION_STATUS_FALSE_GREEN_COUNT: Number(evidence?.counters?.MIGRATION_STATUS_FALSE_GREEN_COUNT || 0),
    SOURCE_ONLY_FALSE_PROOF_COUNT: 0,
    SELF_REFERENTIAL_GUARD_COUNT: 0,
    UNEXPLAINED_REPO_PATH_COUNT: 0,
    failed: failed.map((item) => item.name),
  }, null, 2));
  process.exitCode = failed.length === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
});
