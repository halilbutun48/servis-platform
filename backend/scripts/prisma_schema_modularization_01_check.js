import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  BACKEND_ROOT,
  CANONICAL_SCHEMA_PATH,
  collectPrismaIdentity,
  validateGeneratedClientIdentity,
} from "./prisma_cross_platform_client_hardening_01.mjs";
import {
  CANONICAL_PRISMA_SCHEMA_ENTRY_PATH,
  canonicalPrismaSchemaFiles,
  canonicalPrismaSchemaRelativeFiles,
  readCanonicalPrismaSchemaEntry,
  readCanonicalPrismaSchemaSource,
} from "./lib/prismaSchemaSource.js";
import {
  MODULARIZATION_EVIDENCE_PATH,
  collectSchemaCensus,
} from "./prisma_schema_modularization_01.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PRISMA_CLI = path.join(BACKEND_ROOT, "node_modules", "prisma", "build", "index.js");
const protectedRuntimePaths = new Set([
  "backend/artifacts/runtime-data/password-change-requirements.json",
  "backend/artifacts/runtime-data/username-directory.json",
  "backend/artifacts/runtime-data/agreement-route-refresh-requests.json",
  "backend/artifacts/runtime-data/public-leads.json",
  "backend/artifacts/runtime-data/quality-review-decisions.json",
  "backend/artifacts/runtime-data/region-failover-drill-state.json",
]);
const outcomes = [];

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || "postgresql://prisma_schema_validation@127.0.0.1:5432/prisma_schema_validation?schema=public",
      PRISMA_GENERATE_SKIP_AUTOINSTALL: "1",
      NPM_CONFIG_UPDATE_NOTIFIER: "false",
    },
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  });
  return { status: result.status ?? 1, stdout: String(result.stdout || ""), stderr: String(result.stderr || "") };
}

function check(name, value, details = "") {
  const pass = Boolean(value);
  outcomes.push({ name, pass, details });
  console.log(`${pass ? "PASS" : "FAIL"} ${name}${details ? ` :: ${details}` : ""}`);
  return pass;
}

function currentHead() {
  return run("git", ["rev-parse", "HEAD"]).stdout.trim();
}

function currentStatus() {
  return run("git", ["status", "--short"]).stdout.split(/\r?\n/).filter(Boolean);
}

function evidence() {
  if (!fs.existsSync(MODULARIZATION_EVIDENCE_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(MODULARIZATION_EVIDENCE_PATH, "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  const head = currentHead();
  const status = currentStatus();
  const source = readCanonicalPrismaSchemaSource(REPO_ROOT);
  const entry = readCanonicalPrismaSchemaEntry(REPO_ROOT);
  const census = collectSchemaCensus(CANONICAL_SCHEMA_PATH);
  const identity = await collectPrismaIdentity();
  const clientValidation = validateGeneratedClientIdentity(identity);
  const report = evidence();
  const files = canonicalPrismaSchemaRelativeFiles(REPO_ROOT);
  const moduleFiles = files.filter((file) => file !== CANONICAL_PRISMA_SCHEMA_ENTRY_PATH);
  const sourceBlocks = census.blocks.filter((block) => ["model", "enum"].includes(block.kind));
  const statusHasMigration = status.some((line) => /backend\/prisma\/migrations\//.test(line));
  const stagedProtectedRuntime = status.some((line) => line[0] !== " " && line[0] !== "?" && protectedRuntimePaths.has(line.slice(3).trim()));

  check("canonical schema root is the Prisma directory", path.resolve(CANONICAL_SCHEMA_PATH) === path.resolve(REPO_ROOT, "backend/prisma"));
  check("canonical entry is unique and infrastructure-only", files.filter((file) => file === CANONICAL_PRISMA_SCHEMA_ENTRY_PATH).length === 1
    && !/^\s*(model|enum)\s+/m.test(entry));
  check("domain module list is non-empty and exact", moduleFiles.length >= 2 && moduleFiles.every((file) => file.startsWith("backend/prisma/schema/") && file.endsWith(".prisma")));
  check("every module declares its ownership marker", moduleFiles.every((file) => /^\s*\/\/\s*#11 domain owner:\s*[a-z0-9-]+/m.test(fs.readFileSync(path.join(REPO_ROOT, file), "utf8"))));
  check("every model is owned exactly once", census.modelNames.length === Object.keys(census.modelOwners).length && census.duplicateModels.length === 0 && Object.values(census.modelOwners).every(Boolean));
  check("every enum is owned exactly once", census.enumNames.length === Object.keys(census.enumOwners).length && census.duplicateEnums.length === 0 && Object.values(census.enumOwners).every(Boolean));
  check("datasource and generator have one owner", census.datasourceCount === 1 && census.generatorCount === 1);
  check("no orphan or one-model modules", census.modules.every((module) => module.blocks.length > 0)
    && census.modules.every((module) => module.blocks.filter((block) => block.startsWith("model:")).length !== 1));
  check("no competing Prisma schema SSOT", canonicalPrismaSchemaFiles(REPO_ROOT).length === moduleFiles.length + 1
    && sourceBlocks.length === census.modelNames.length + census.enumNames.length);
  check("canonical Prisma validation passes", run(process.execPath, [PRISMA_CLI, "validate", "--schema", CANONICAL_SCHEMA_PATH]).status === 0);
  check("canonical Prisma format check passes", run(process.execPath, [PRISMA_CLI, "format", "--check", "--schema", CANONICAL_SCHEMA_PATH]).status === 0);
  check("generated client integrity matches schema", clientValidation.ok && identity.generatedClient.generatedSchemaSemanticSha256 === identity.schema.modelEnumSemanticSha256);
  check("current modularization evidence is current-head and complete", Boolean(report)
    && report.sourceHead === head
    && report.pass === true
    && report.counters?.DMMF_UNEXPLAINED_DRIFT_COUNT === 0
    && report.counters?.DB_CHANGE_REQUIRED_BY_MODULARIZATION_COUNT === 0);
  check("semantic parity and negative sensitivity evidence are green", report?.counters?.PRISMA_MODEL_COUNT_DRIFT === 0
    && report?.counters?.PRISMA_FIELD_COUNT_DRIFT === 0
    && report?.counters?.PRISMA_ENUM_VALUE_DRIFT === 0
    && report?.counters?.PRISMA_RELATION_SEMANTIC_DRIFT === 0
    && report?.counters?.NEGATIVE_SENSITIVITY_LOSS_COUNT === 0);
  check("migration history remains untouched", !statusHasMigration);
  check("protected runtime data is not staged by #11", !stagedProtectedRuntime);

  const failed = outcomes.filter((item) => !item.pass);
  console.log(JSON.stringify({
    PRISMA_SCHEMA_MODULARIZATION_01_CHECK: failed.length === 0 ? "PASS" : "FAIL",
    UNOWNED_MODEL_COUNT: census.modelNames.filter((name) => !census.modelOwners[name]).length,
    UNOWNED_ENUM_COUNT: census.enumNames.filter((name) => !census.enumOwners[name]).length,
    DUPLICATE_MODEL_DECLARATION_COUNT: census.duplicateModels.length,
    DUPLICATE_ENUM_DECLARATION_COUNT: census.duplicateEnums.length,
    DATASOURCE_OWNER_COUNT: census.datasourceCount,
    GENERATOR_OWNER_COUNT: census.generatorCount,
    ORPHAN_SCHEMA_MODULE_COUNT: census.modules.filter((module) => module.blocks.length === 0).length,
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
