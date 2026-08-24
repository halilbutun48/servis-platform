#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  assertCanonicalProvenanceRegistryShape,
  CANONICAL_PROVENANCE_PATHS,
  CANONICAL_PROVENANCE_RECORDS,
  CANONICAL_PROVENANCE_REGISTRY_ID,
  CANONICAL_PROVENANCE_REGISTRY_VERSION,
} from "./lib/canonicalProvenanceRegistry.js";
import { CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF } from "./lib/currentHeadScopePolicy.js";
import { gitExec, gitStatusEntries } from "./lib/guardGitScope.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const REQUEST_URL_PATH = "backend/src/lib/requestUrl.js";
const REQUIRED_CANONICAL_PATHS = Object.freeze([...CANONICAL_PROVENANCE_PATHS]);
const REQUEST_URL_RECORD = CANONICAL_PROVENANCE_RECORDS.find((record) => record.path === REQUEST_URL_PATH) ?? null;
const APPROVED_CURRENT_HEAD_MAP = new Map(
  CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF.map((entry) => [
    normalizePath(entry.path),
    String(entry.sha256 || "").trim().toUpperCase(),
  ])
);

let guardCases = 0;
let passCount = 0;
let failCount = 0;

function normalizePath(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "")
    .trim();
}

function must(condition, label) {
  guardCases += 1;
  if (!condition) {
    failCount += 1;
    throw new Error(`FAIL ${label}`);
  }
  passCount += 1;
  console.log(`OK ${label}`);
}

function fail(label, message) {
  throw new Error(`FAIL ${label}: ${message}`);
}

function sha256File(relPath) {
  return createHash("sha256")
    .update(fs.readFileSync(path.join(repoRoot, normalizePath(relPath))))
    .digest("hex")
    .toUpperCase();
}

function headHasPath(relPath) {
  try {
    gitExec(["cat-file", "-e", `HEAD:${normalizePath(relPath)}`]);
    return true;
  } catch {
    return false;
  }
}

function expectFailure(label, fn, needle) {
  try {
    fn();
  } catch (error) {
    const message = String(error?.message || error);
    if (needle && !message.includes(needle)) {
      throw new Error(`FAIL ${label}: wrong failure (${message})`);
    }
    console.log(`OK ${label}`);
    return;
  }

  throw new Error(`FAIL ${label}: expected failure`);
}

function buildStatusMap(paths) {
  return new Map(
    gitStatusEntries(paths).map((entry) => [
      normalizePath(entry.path),
      { ...entry, path: normalizePath(entry.path) },
    ])
  );
}

function assertCanonicalProvenanceAgainstWorkingTree(records = CANONICAL_PROVENANCE_RECORDS) {
  const statusMap = buildStatusMap(REQUIRED_CANONICAL_PATHS);
  must(
    statusMap.size === REQUIRED_CANONICAL_PATHS.length,
    `exact canonical provenance working-tree status scope (${statusMap.size})`
  );

  for (const record of records) {
    const normalizedPath = normalizePath(record.path);
    const absPath = path.join(repoRoot, normalizedPath);
    const statusEntry = statusMap.get(normalizedPath);
    must(Boolean(statusEntry), `${normalizedPath} working-tree status entry present`);
    must(statusEntry.raw.startsWith("?? "), `${normalizedPath} is untracked`);
    must(fs.existsSync(absPath), `${normalizedPath} exists in working tree`);
    must(record.baselinePresence === "ABSENT", `${normalizedPath} baseline is absent`);
    must(record.workingTreeState === "UNTRACKED_CANONICAL_NEW_FILE", `${normalizedPath} working-tree state is canonical new file`);
    must(record.lifecycleStatus === "ACTIVE_PROVEN", `${normalizedPath} lifecycle is active proven`);
    must(record.currentSha256 === sha256File(normalizedPath), `${normalizedPath} sha256 matches working tree`);
    must(!headHasPath(normalizedPath), `${normalizedPath} is absent from HEAD`);

    if (normalizedPath === REQUEST_URL_PATH) {
      must(
        record.provenanceClass === "LEGITIMATE_CANONICAL_NEW_FILE",
        `${normalizedPath} provenance class stays LEGITIMATE_CANONICAL_NEW_FILE`
      );
      must(
        record.currentHeadPolicyState === "ABSENT",
        `${normalizedPath} stays absent from current-head policy`
      );
      must(
        !APPROVED_CURRENT_HEAD_MAP.has(normalizedPath),
        `${normalizedPath} is not present in current-head policy`
      );
      must(
        record.technicalOwner === "shared request URL sanitization",
        `${normalizedPath} technical owner is stable`
      );
      must(
        record.compositionOwner ===
          "backend/src/server.js + backend/src/bootstrap/rateLimits.js + backend/src/middleware/apiRequestLog.js + backend/src/routes/public.js",
        `${normalizedPath} composition owner is stable`
      );
      must(
        record.readWriteClass === "SUPPORT",
        `${normalizedPath} read/write class stays SUPPORT`
      );
      must(
        record.semanticDomains.join("|") === "HTTP|SANITIZATION|SECURITY|KVKK",
        `${normalizedPath} semantic domains stay fixed`
      );
      must(
        record.capabilities.join("|") === "request URL sanitization|sensitive query redaction",
        `${normalizedPath} capabilities stay fixed`
      );
      must(
        record.regressionOwners.join("|") === "check:securitykvkkfinal01|check:auditlogandapprovaltrace01",
        `${normalizedPath} regression owners stay fixed`
      );
      must(
        record.securityOwners.join("|") === "check:securitykvkkfinal01|check:auditlogandapprovaltrace01",
        `${normalizedPath} security owners stay fixed`
      );
    } else {
      must(
        record.provenanceClass === "CONCURRENT_CANONICAL",
        `${normalizedPath} provenance class stays CONCURRENT_CANONICAL`
      );
      must(
        record.currentHeadPolicyState === "APPROVED",
        `${normalizedPath} stays approved by current-head policy`
      );
      const policySha = APPROVED_CURRENT_HEAD_MAP.get(normalizedPath);
      must(Boolean(policySha), `${normalizedPath} exists in current-head policy`);
      must(
        policySha === record.currentSha256,
        `${normalizedPath} current-head policy sha matches canonical registry`
      );
      must(
        record.readWriteClass === "READ" ||
          record.readWriteClass === "WRITE" ||
          record.readWriteClass === "MIXED" ||
          record.readWriteClass === "SUPPORT",
        `${normalizedPath} read/write class remains valid`
      );

      switch (normalizedPath) {
        case "backend/src/routes/commercialCoreRoutes.js":
          must(record.technicalOwner === "commercialCore route composition", `${normalizedPath} technical owner is stable`);
          must(record.compositionOwner === "backend/src/routes/commercialCore.js", `${normalizedPath} composition owner is stable`);
          must(
            record.semanticDomains.join("|") === "COMMERCIAL_CORE|ROUTING|ROUTE_ATTACHMENT",
            `${normalizedPath} semantic domains stay fixed`
          );
          must(
            record.capabilities.join("|") ===
              "manifest endpoint|lifecycle template endpoint|rules endpoint|mounting payment routes|mounting room routes",
            `${normalizedPath} capabilities stay fixed`
          );
          must(
            record.regressionOwners.join("|") ===
              "node backend/scripts/current_head_scope_policy_01_check.js|check:roomprofitabilityandquotefloor01|check:securitykvkkfinal01",
            `${normalizedPath} regression owners stay fixed`
          );
          must(
            record.securityOwners.join("|") ===
              "check:roomprofitabilityandquotefloor01|check:securitykvkkfinal01",
            `${normalizedPath} security owners stay fixed`
          );
          must(record.readWriteClass === "SUPPORT", `${normalizedPath} read/write class stays SUPPORT`);
          break;
        case "backend/src/routes/commercialCorePaymentRoutes.js":
          must(record.technicalOwner === "commercialCore payment backbone", `${normalizedPath} technical owner is stable`);
          must(record.compositionOwner === "backend/src/routes/commercialCoreRoutes.js", `${normalizedPath} composition owner is stable`);
          must(
            record.semanticDomains.join("|") === "COMMERCIAL_CORE|PAYMENT|SETTLEMENT|APPROVAL",
            `${normalizedPath} semantic domains stay fixed`
          );
          must(
            record.capabilities.join("|") ===
              "payment backbone status/settings|payment pilot rollout|required rollout|payment account readiness|settlement planning/execution/cancel/ready|reconciliation upsert",
            `${normalizedPath} capabilities stay fixed`
          );
          must(
            record.regressionOwners.join("|") ===
              "check:pay01e|check:paysafe01|check:securitykvkkfinal01|check:auditlogandapprovaltrace01",
            `${normalizedPath} regression owners stay fixed`
          );
          must(
            record.securityOwners.join("|") ===
              "check:pay01e|check:paysafe01|check:securitykvkkfinal01|check:auditlogandapprovaltrace01",
            `${normalizedPath} security owners stay fixed`
          );
          must(record.readWriteClass === "MIXED", `${normalizedPath} read/write class stays MIXED`);
          break;
        case "backend/src/routes/commercialCorePaymentReportsRoutes.js":
          must(record.technicalOwner === "commercialCore payment reporting", `${normalizedPath} technical owner is stable`);
          must(record.compositionOwner === "backend/src/routes/commercialCorePaymentRoutes.js", `${normalizedPath} composition owner is stable`);
          must(
            record.semanticDomains.join("|") === "COMMERCIAL_CORE|PAYMENT|REPORTING|AUDIT",
            `${normalizedPath} semantic domains stay fixed`
          );
          must(
            record.capabilities.join("|") === "sources report|readiness preview|CSV export|ledger export|audit logging",
            `${normalizedPath} capabilities stay fixed`
          );
          must(
            record.regressionOwners.join("|") ===
              "check:pay01e|check:paysafe01|check:securitykvkkfinal01|check:auditlogandapprovaltrace01",
            `${normalizedPath} regression owners stay fixed`
          );
          must(
            record.securityOwners.join("|") ===
              "check:pay01e|check:paysafe01|check:securitykvkkfinal01|check:auditlogandapprovaltrace01",
            `${normalizedPath} security owners stay fixed`
          );
          must(record.readWriteClass === "MIXED", `${normalizedPath} read/write class stays MIXED`);
          break;
        case "backend/src/routes/commercialCoreRoomRoutes.js":
          must(record.technicalOwner === "commercialCore room surfaces", `${normalizedPath} technical owner is stable`);
          must(record.compositionOwner === "backend/src/routes/commercialCoreRoutes.js", `${normalizedPath} composition owner is stable`);
          must(
            record.semanticDomains.join("|") === "COMMERCIAL_CORE|ROOM|SHIFTS|PREVIEW",
            `${normalizedPath} semantic domains stay fixed`
          );
          must(
            record.capabilities.join("|") === "room summary|room financial operations preview|room items",
            `${normalizedPath} capabilities stay fixed`
          );
          must(
            record.regressionOwners.join("|") ===
              "check:roomprofitabilityandquotefloor01|check:safedrive01|check:securitykvkkfinal01",
            `${normalizedPath} regression owners stay fixed`
          );
          must(
            record.securityOwners.join("|") ===
              "check:roomprofitabilityandquotefloor01|check:securitykvkkfinal01",
            `${normalizedPath} security owners stay fixed`
          );
          must(record.readWriteClass === "READ", `${normalizedPath} read/write class stays READ`);
          break;
        case "backend/src/routes/commercialCoreRouteData.js":
          must(record.technicalOwner === "commercialCore shared route data", `${normalizedPath} technical owner is stable`);
          must(
            record.compositionOwner ===
              "backend/src/routes/commercialCorePaymentRoutes.js + backend/src/routes/commercialCorePaymentReportsRoutes.js",
            `${normalizedPath} composition owner is stable`
          );
          must(
            record.semanticDomains.join("|") === "COMMERCIAL_CORE|SHARED_SUPPORT|SCHEMA|CSV",
            `${normalizedPath} semantic domains stay fixed`
          );
          must(
            record.capabilities.join("|") === "schema validation|query parsing|CSV serialization|shared row shaping",
            `${normalizedPath} capabilities stay fixed`
          );
          must(
            record.regressionOwners.join("|") === "check:roomprofitabilityandquotefloor01|check:securitykvkkfinal01",
            `${normalizedPath} regression owners stay fixed`
          );
          must(
            record.securityOwners.join("|") === "check:securitykvkkfinal01",
            `${normalizedPath} security owners stay fixed`
          );
          must(record.readWriteClass === "SUPPORT", `${normalizedPath} read/write class stays SUPPORT`);
          break;
        default:
          fail(normalizedPath, "unexpected canonical provenance path");
      }
    }
  }
}

function assertNegativeCases(records = CANONICAL_PROVENANCE_RECORDS) {
  expectFailure(
    "duplicate provenance path is rejected",
    () =>
      assertCanonicalProvenanceRegistryShape([
        { ...records[0] },
        { ...records[0], path: records[0].path },
        ...records.slice(2),
      ]),
    "duplicate path"
  );

  expectFailure(
    "wrong sha is rejected",
    () =>
      assertCanonicalProvenanceAgainstWorkingTree([
        { ...records[0], currentSha256: "0".repeat(64) },
        ...records.slice(1),
      ]),
    "sha256 matches working tree"
  );

  expectFailure(
    "active proven with missing evidence is rejected",
    () =>
      assertCanonicalProvenanceRegistryShape([
        { ...records[0], evidenceChecks: [] },
        ...records.slice(1),
      ]),
    "evidenceChecks must not be empty"
  );

  expectFailure(
    "baseline present is rejected for canonical new file",
    () =>
      assertCanonicalProvenanceAgainstWorkingTree([
        { ...records[0], baselinePresence: "PRESENT" },
        ...records.slice(1),
      ]),
    "baseline is absent"
  );

  expectFailure(
    "malformed provenance class is rejected",
    () =>
      assertCanonicalProvenanceRegistryShape([
        { ...records[0], provenanceClass: "BROKEN" },
        ...records.slice(1),
      ]),
    "provenanceClass must be one of"
  );

  expectFailure(
    "missing regression ownership is rejected",
    () =>
      assertCanonicalProvenanceRegistryShape([
        { ...records[0], regressionOwners: [] },
        ...records.slice(1),
      ]),
    "regressionOwners must not be empty"
  );

  expectFailure(
    "duplicate conflicting canonical record is rejected",
    () =>
      assertCanonicalProvenanceRegistryShape([
        { ...records[0] },
        { ...records[0], path: records[0].path, currentSha256: "1".repeat(64) },
        ...records.slice(2),
      ]),
    "duplicate path"
  );
}

function main() {
  console.log(`=== ${CANONICAL_PROVENANCE_REGISTRY_ID} CHECK START ===`);
  console.log(`Registry version: ${CANONICAL_PROVENANCE_REGISTRY_VERSION}`);

  const shape = assertCanonicalProvenanceRegistryShape();
  must(shape.count === REQUIRED_CANONICAL_PATHS.length, "registry count matches seed scope");
  must(shape.paths.join("|") === [...REQUIRED_CANONICAL_PATHS].sort().join("|"), "registry seed path set matches");

  assertCanonicalProvenanceAgainstWorkingTree();
  assertNegativeCases();

  console.log(`guardCases=${guardCases} / passCount=${passCount} / failCount=${failCount}`);
  console.log(`=== ${CANONICAL_PROVENANCE_REGISTRY_ID} CHECK PASS ===`);
}

main();
