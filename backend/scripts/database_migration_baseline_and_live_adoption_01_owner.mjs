#!/usr/bin/env node

import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const backendRoot = path.resolve(path.dirname(__filename), "..");
const prismaCli = path.join(backendRoot, "node_modules", "prisma", "build", "index.js");
const canonicalSchema = "prisma/schema.prisma";
const localDevelopmentDatabaseUrl = "postgresql://servis:servispass@127.0.0.1:5433/servisdb?schema=public";

function run(args) {
  const result = spawnSync(process.execPath, [prismaCli, ...args], {
    cwd: backendRoot,
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || (process.env.NODE_ENV === "production" ? "" : localDevelopmentDatabaseUrl),
      PRISMA_GENERATE_SKIP_AUTOINSTALL: "1",
      NPM_CONFIG_UPDATE_NOTIFIER: "false",
    },
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 32 * 1024 * 1024,
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  if (result.status !== 0) {
    const safe = output.replace(/postgres(?:ql)?:\/\/[^\s)]+/gi, "postgresql://[redacted]");
    console.error(safe.slice(-4000));
    process.exit(result.status ?? 1);
  }
  process.stdout.write(output);
}

function requireLiveApproval() {
  if (process.env.MIGRATION_APPROVAL !== "APPROVED") {
    throw new Error("LIVE_MIGRATION_APPROVAL_REQUIRED: set MIGRATION_APPROVAL=APPROVED at the deployment/change-control boundary");
  }
  if (!String(process.env.MIGRATION_BACKUP_ID || "").trim()) {
    throw new Error("LIVE_MIGRATION_BACKUP_REQUIRED: set MIGRATION_BACKUP_ID after the #12 backup gate");
  }
  if (!String(process.env.MIGRATION_CHANGE_CONTROL_ID || "").trim()) {
    throw new Error("LIVE_MIGRATION_CHANGE_CONTROL_REQUIRED: set MIGRATION_CHANGE_CONTROL_ID at the deployment boundary");
  }
}

const command = process.argv[2] || "status";
try {
  if (command === "status") {
    run(["migrate", "status", "--schema", canonicalSchema]);
  } else if (command === "deploy") {
    requireLiveApproval();
    run(["migrate", "deploy", "--schema", canonicalSchema]);
  } else {
    throw new Error(`UNSUPPORTED_MIGRATION_OWNER_COMMAND: ${command}`);
  }
} catch (error) {
  console.error(String(error?.message || error));
  process.exitCode = 1;
}
