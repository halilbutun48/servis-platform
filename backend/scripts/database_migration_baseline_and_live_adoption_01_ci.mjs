#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "@prisma/client";
import {
  BACKEND_ROOT,
  collectPrismaIdentity,
  collectSchemaIdentity,
  validateGeneratedClientIdentity,
} from "./prisma_cross_platform_client_hardening_01.mjs";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "../..");
const PRISMA_CLI = path.join(BACKEND_ROOT, "node_modules", "prisma", "build", "index.js");
const EVIDENCE_DIR = path.join(BACKEND_ROOT, "artifacts", "data-integrity", "DATABASE_MIGRATION_BASELINE_AND_LIVE_ADOPTION_01");
const EVIDENCE_PATH = path.join(EVIDENCE_DIR, "ci.json");
const EXPECTED_MIGRATION_COUNT = 56;
const DEFAULT_DATABASE_URL = "postgresql://prisma_ci:prisma_ci@127.0.0.1:5432/prisma_ci?schema=public";

function safeUrl(value) {
  return String(value || "").replace(/(postgres(?:ql)?:\/\/[^:]+:)[^@]+@/i, "$1[redacted]@");
}

function safeOutput(value) {
  return String(value || "").replace(/postgres(?:ql)?:\/\/[^\s)]+/gi, "postgresql://[redacted]").slice(-5000);
}

function gitHead() {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT, encoding: "utf8", windowsHide: true });
  if (result.status !== 0) throw new Error("unable to resolve CI source HEAD");
  return result.stdout.trim();
}

function runCli(args, databaseUrl) {
  const result = spawnSync(process.execPath, [PRISMA_CLI, ...args], {
    cwd: BACKEND_ROOT,
    env: { ...process.env, DATABASE_URL: databaseUrl, PRISMA_GENERATE_SKIP_AUTOINSTALL: "1", NPM_CONFIG_UPDATE_NOTIFIER: "false" },
    encoding: "utf8",
    windowsHide: true,
    timeout: 600_000,
    maxBuffer: 32 * 1024 * 1024,
  });
  return { status: result.status ?? 1, output: `${result.stdout || ""}${result.stderr || ""}` };
}

async function migrationRows(databaseUrl) {
  const client = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    return await client.$queryRawUnsafe("SELECT migration_name, checksum, finished_at, rolled_back_at FROM \"_prisma_migrations\" ORDER BY started_at, migration_name");
  } finally {
    await client.$disconnect().catch(() => {});
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  const report = {
    evidenceVersion: "DATABASE-MIGRATION-BASELINE-AND-LIVE-ADOPTION-01-CI",
    mode: "CI_REAL",
    generatedAt: new Date().toISOString(),
    sourceHead: gitHead(),
    platform: `${process.platform}-${process.arch}`,
    nodeVersion: process.version,
    database: safeUrl(databaseUrl),
    schemaEntrypoint: "backend/prisma/schema.prisma",
    counters: {
      CI_MIGRATION_BASELINE_VALIDATION_PASS_COUNT: 0,
      CI_PRISMA_GENERATE_PASS_COUNT: 0,
      CI_GENERATED_CLIENT_INTEGRITY_PASS_COUNT: 0,
      STALE_MIGRATION_EVIDENCE_ACCEPTED_COUNT: 0,
    },
    pass: false,
  };
  try {
    const status = runCli(["migrate", "status", "--schema", "prisma/schema.prisma"], databaseUrl);
    if (status.status !== 0 || !new RegExp(`${EXPECTED_MIGRATION_COUNT}\\s+migrations found`, "i").test(status.output) || !/up to date/i.test(status.output)) throw new Error(`CI migration status did not prove ${EXPECTED_MIGRATION_COUNT}/up-to-date: ${safeOutput(status.output)}`);
    const rows = await migrationRows(databaseUrl);
    const failed = rows.filter((row) => row.finished_at == null || row.rolled_back_at != null);
    if (rows.length !== EXPECTED_MIGRATION_COUNT || failed.length !== 0) throw new Error(`CI migration metadata is not ${EXPECTED_MIGRATION_COUNT}/0 failed: rows=${rows.length} failed=${failed.length}`);
    const diff = runCli(["migrate", "diff", "--from-url", databaseUrl, "--to-schema-datamodel", "prisma", "--script"], databaseUrl);
    if (diff.status !== 0 || !/empty migration/i.test(diff.output)) throw new Error(`CI DB/schema parity is not empty: ${safeOutput(diff.output)}`);
    const identity = await collectPrismaIdentity();
    const validation = validateGeneratedClientIdentity(identity);
    if (identity.runtimeError || !validation.ok || !identity.runtimeModel.requiredModelsPresent) throw new Error(`CI generated client integrity failed: ${safeOutput(JSON.stringify({ runtimeError: identity.runtimeError, validation }))}`);
    report.identities = {
      schemaId: collectSchemaIdentity().sourceSetSha256,
      runtimeModelId: identity.runtimeModelIdentity,
      clientApiId: identity.clientApiIdentity,
      prismaVersion: identity.prismaVersion.clientVersion,
    };
    report.migrationRows = rows.length;
    report.failedMigrationRows = failed.length;
    report.status = "UP_TO_DATE";
    report.dbSchemaParity = "EXACT_SEMANTIC_PARITY";
    report.counters.CI_MIGRATION_BASELINE_VALIDATION_PASS_COUNT = 1;
    report.counters.CI_PRISMA_GENERATE_PASS_COUNT = 1;
    report.counters.CI_GENERATED_CLIENT_INTEGRITY_PASS_COUNT = 1;
    report.counters.STALE_MIGRATION_EVIDENCE_ACCEPTED_COUNT = 0;
    report.pass = true;
  } catch (error) {
    report.failure = safeOutput(error?.stack || error?.message || error);
  }
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  fs.writeFileSync(EVIDENCE_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.pass ? 0 : 1;
}

main().catch((error) => {
  console.error(safeOutput(error?.stack || error?.message || error));
  process.exitCode = 1;
});
