import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  BACKEND_ROOT,
  collectPrismaIdentity,
  validateGeneratedClientIdentity,
} from "./prisma_cross_platform_client_hardening_01.mjs";
import { readCanonicalPrismaSchemaSource } from "./lib/prismaSchemaSource.js";

const REPO_ROOT = path.resolve(BACKEND_ROOT, "..");
const workflowPath = path.join(REPO_ROOT, ".github", "workflows", "vardis_verification_visibility.yml");
const lockfilePath = path.join(BACKEND_ROOT, "package-lock.json");
const ownerPath = path.join(BACKEND_ROOT, "scripts", "prisma_cross_platform_client_hardening_01.mjs");
const evidencePath = process.env.PRISMA_HARDENING_EVIDENCE_PATH || "";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function cacheIdentity(files) {
  return sha256(files.map(({ name, content }) => `${name}\0${content.length}\0${content}`).join("\0"));
}

function changedIdentity(base, suffix) {
  return cacheIdentity(base.map((item) => ({ ...item, content: item.content + suffix })));
}

function writeEvidence(value) {
  if (!evidencePath) return;
  const resolved = path.resolve(evidencePath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main() {
  const identity = await collectPrismaIdentity();
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prisma-ci-negative-"));
  const changedSchemaPath = path.join(tempRoot, "schema.prisma");
  fs.writeFileSync(changedSchemaPath, `${readCanonicalPrismaSchemaSource(REPO_ROOT)}\n\nmodel StaleCiSchemaProbe {\n  id Int @id\n}\n`, "utf8");

  const staleSchemaRejected = !validateGeneratedClientIdentity(identity, { expectedSchemaPath: changedSchemaPath }).ok;
  const versionDriftRejected = !validateGeneratedClientIdentity(identity, { expectedPrismaVersion: "0.0.0" }).ok;
  const incomplete = JSON.parse(JSON.stringify(identity));
  incomplete.generatedClient.requiredFiles[0].exists = false;
  const incompleteRejected = !validateGeneratedClientIdentity(incomplete).ok;

  const cacheInputs = [
    { name: "backend/prisma/schema.prisma", content: readCanonicalPrismaSchemaSource(REPO_ROOT) },
    { name: "backend/package-lock.json", content: fs.readFileSync(lockfilePath, "utf8") },
    { name: "backend/scripts/prisma_cross_platform_client_hardening_01.mjs", content: fs.readFileSync(ownerPath, "utf8") },
  ];
  const cacheIdentityBase = cacheIdentity(cacheInputs);
  const schemaChangeChangesKey = cacheIdentityBase !== changedIdentity(cacheInputs, "\n// schema identity change");
  const lockfileChangeChangesKey = cacheIdentityBase !== changedIdentity(cacheInputs, "\n// package lock identity change");
  const ownerChangeChangesKey = cacheIdentityBase !== changedIdentity(cacheInputs, "\n// generation owner identity change");
  const workflow = fs.readFileSync(workflowPath, "utf8");
  const workflowKeyContract = /hashFiles\('backend\/prisma\/\*\*\/\*\.prisma', 'backend\/package-lock\.json', 'backend\/scripts\/prisma_cross_platform_client_hardening_01\.mjs'\)/.test(workflow);

  const evidence = {
    evidenceVersion: "PRISMA-CROSS-PLATFORM-CLIENT-HARDENING-01-CI-NEGATIVE",
    generatedAt: new Date().toISOString(),
    sourceHead: process.env.PRISMA_SOURCE_HEAD || "UNKNOWN",
    schemaIdentity: identity.schema.normalizedSha256,
    prismaVersion: identity.prismaVersion.clientVersion,
    cacheInputIdentity: cacheIdentityBase,
    staleSchemaRejected,
    versionDriftRejected,
    incompleteRejected,
    schemaChangeChangesKey,
    lockfileChangeChangesKey,
    ownerChangeChangesKey,
    workflowKeyContract,
    pass: staleSchemaRejected && versionDriftRejected && incompleteRejected && schemaChangeChangesKey
      && lockfileChangeChangesKey && ownerChangeChangesKey && workflowKeyContract,
  };
  writeEvidence(evidence);
  console.log(`CI_STALE_CACHE_NEGATIVE=${evidence.pass ? "PASS" : "FAIL"}`);
  console.log(`CI_CACHE_KEY_IDENTITY=${evidence.cacheInputIdentity}`);
  process.exitCode = evidence.pass ? 0 : 1;
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

main().catch((error) => {
  console.error(`CI stale-cache negative acceptance failed: ${error?.message || String(error)}`);
  process.exitCode = 1;
});
