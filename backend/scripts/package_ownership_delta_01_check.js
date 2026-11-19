#!/usr/bin/env node

/*
 * Package-local ownership delta contract.
 *
 * This is a consumer of the existing lifecycle/current-head authorities. It
 * compares the exact pre-package status snapshot in the package manifest with
 * the current worktree and requires every new or changed durable path to carry
 * owner, acceptance, identity and lifecycle evidence.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  ACTIVE_UNOWNED_CURRENT_CHANGE_PATHS,
  assertLifecycleClassificationIntegrity,
  classifyLifecyclePath,
} from "./lib/pre18LifecycleClassification.js";
import {
  activeMilestoneTouchedPaths,
  activeMilestoneDependencyReferences,
  assertCanonicalDependencyReferenceEntry,
  assertMilestoneOwnershipAuthorityIntegrity,
  isCanonicalDependencyReferenceEntry,
  isGeneratedIdentityEntry,
  readMilestoneOwnershipAuthority,
} from "./lib/milestoneOwnershipAuthority.js";
import { PRE18_HISTORICAL_CURRENT_HEAD_IDENTITIES } from "./lib/currentHeadScopePolicy.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const packageId = "PRE_18_VERIFY_CHAIN_PACKAGE_OWNERSHIP_DELTA_GATE_01";
const TRANSIENT_ARTIFACT_ROOTS = Object.freeze([
  "backend/artifacts/runtime-data/",
  "backend/artifacts/browser-smoke/",
  "backend/artifacts/load-test/",
  "backend/artifacts/db-scaling/",
  "backend/artifacts/observability/",
  "backend/artifacts/data-integrity/",
  "backend/artifacts/role-redteam/",
  "backend/artifacts/security-kvkk/",
  "backend/artifacts/audit-trace/",
  "backend/artifacts/repo-audit/",
  "backend/artifacts/lint/",
  "debug.log",
]);
const EVIDENCE_MATRIX_PATH = "backend/artifacts/repo-audit/m18-ownership-evidence-reconciliation-20261009.json";
const EVIDENCE_MATRIX_CONTRACT = "M18_OWNERSHIP_EVIDENCE_RECONCILIATION_V1";
const M18_OWNER = "M18_COPILOT_UI_ELEMENT_ANCHOR_AND_GUIDED_HIGHLIGHT_01";
const RECONCILIATION_CANDIDATE_PATHS = Object.freeze([
  "backend/artifacts/holdout/C01-COMPANY.png",
  "backend/artifacts/holdout/C01-result.json",
  "backend/artifacts/holdout/freeze-m18-attempt03.mjs",
  "backend/artifacts/holdout/m18-run-m-fresh-unseen-20261003-execution.json",
  "backend/artifacts/holdout/m18-run-m-fresh-unseen-20261003.json",
  "backend/artifacts/holdout/m18-run-m-fresh-unseen-20261003.json.sha256",
  "backend/artifacts/holdout/m18-run-n-fresh-unseen-20261003-execution.json",
  "backend/artifacts/holdout/m18-run-n-fresh-unseen-20261003.json",
  "backend/artifacts/holdout/m18-run-n-fresh-unseen-20261003.json.sha256",
  "backend/artifacts/holdout/m18-run-o-fresh-unseen-20261003-execution.json",
  "backend/artifacts/holdout/m18-run-o-fresh-unseen-20261003.json",
  "backend/artifacts/holdout/m18-run-o-fresh-unseen-20261003.json.sha256",
  "backend/artifacts/holdout/m18-step4-attempt03-fresh-unseen-2026-09-30.json",
  "backend/artifacts/holdout/m18-step4-attempt03-fresh-unseen-2026-09-30.json.sha256",
  "backend/artifacts/holdout/run-frozen-case.mjs",
  "docs/superpowers/plans/2026-09-29-m18-sefer-abi-canonical-conversation-core.md",
  "docs/superpowers/plans/2026-09-30-m18-run-f-unseen-holdout.md",
  "docs/superpowers/plans/2026-10-01-m18-typed-semantic-evidence-implementation-plan.md",
  "docs/superpowers/plans/2026-10-01-real-user-general-product-help.md",
  "docs/superpowers/plans/2026-10-03-m18-v3-composition-structural-corrective-plan.md",
  "docs/superpowers/plans/2026-10-05-m18-holdout-infrastructure-closure.md",
  "docs/superpowers/plans/2026-10-05-m18-mixed-navigation-guidance-corrective.md",
  "docs/superpowers/plans/2026-10-05-m18-run-scoped-provenance-and-trusted-gate-implementation-plan.md",
  "docs/superpowers/plans/2026-10-05-m18-v4r2-contract-alignment.md",
  "docs/superpowers/plans/2026-10-09-m18-r15-final-holdout-preparation.md",
  "docs/superpowers/specs/2026-09-28-m18-sefer-abi-conversation-core-design.md",
  "docs/superpowers/specs/2026-10-01-m18-typed-semantic-evidence-architecture-design.md",
  "docs/superpowers/specs/2026-10-03-m18-v3-composition-architecture-review-design.md",
  "docs/superpowers/specs/2026-10-05-m18-run-scoped-provenance-and-trusted-gate-architecture-design.md",
  "web/src/utils/terminology.test.js",
]);

function normalizePath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\.\//, "").trim();
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex").toUpperCase();
}

function fileIdentity(relativePath) {
  const absolute = path.join(repoRoot, relativePath);
  try {
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
      return { rawSha256: null, normalizedSha256: null };
    }
    const raw = fs.readFileSync(absolute);
    const text = raw.toString("utf8").replace(/^\uFEFF/u, "");
    return {
      rawSha256: sha256(raw),
      normalizedSha256: sha256(text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")),
    };
  } catch (error) {
    // Playwright/Chromium profile databases and LOCK files can be held open
    // while the repository is being inspected. Keep the path in the status
    // stream, but never invent a content identity for a file we could not
    // read. A touched owned path therefore fails closed on the null hash.
    if (error?.code === "EBUSY") {
      return { rawSha256: null, normalizedSha256: null, identityError: "EBUSY" };
    }
    throw error;
  }
}

function parseGitStatusRecord(record) {
  if (!record || record.length < 4 || record[2] !== 0x20) {
    throw new Error("PACKAGE_OWNERSHIP_STATUS_RECORD_INVALID");
  }
  const status = record.subarray(0, 2).toString("utf8");
  const relativePath = normalizePath(record.subarray(3).toString("utf8"));
  if (!relativePath) throw new Error("PACKAGE_OWNERSHIP_STATUS_PATH_MISSING");
  // Status discovery must remain bounded even when the worktree contains
  // large browser profiles. Content identity is hydrated only for baseline
  // and ownership-authority paths below; every discovered path remains in the
  // result set and therefore cannot be silently excluded.
  return { path: relativePath, status, rawSha256: null, normalizedSha256: null };
}

function gitStatusEntries() {
  return new Promise((resolve, reject) => {
    const child = spawn("git", [
      "status",
      "--porcelain=v1",
      "-z",
      "--no-renames",
      "--untracked-files=all",
    ], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const entries = [];
    let pending = Buffer.alloc(0);
    let stderr = "";
    let settled = false;

    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error instanceof Error ? error : new Error(String(error)));
    };

    child.stdout.on("data", (chunk) => {
      if (settled) return;
      pending = Buffer.concat([pending, chunk]);
      let separatorIndex = pending.indexOf(0);
      while (separatorIndex >= 0) {
        const record = pending.subarray(0, separatorIndex);
        pending = pending.subarray(separatorIndex + 1);
        try {
          entries.push(parseGitStatusRecord(record));
        } catch (error) {
          child.kill();
          fail(error);
          return;
        }
        separatorIndex = pending.indexOf(0);
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", fail);
    child.on("close", (code) => {
      if (settled) return;
      if (pending.length > 0) {
        fail(new Error("PACKAGE_OWNERSHIP_STATUS_OUTPUT_TRUNCATED"));
        return;
      }
      if (code !== 0) {
        fail(new Error(`PACKAGE_OWNERSHIP_GIT_STATUS_FAILED:${code}:${stderr.trim()}`));
        return;
      }
      settled = true;
      resolve(entries);
    });
  });
}

async function currentEntriesIncludingCommittedBaseline(manifest, activeTouchedPaths = []) {
  const statusEntries = await gitStatusEntries();
  const statusByPath = new Map(statusEntries.map((entry) => [entry.path, entry]));
  const baselinePaths = manifest.baselineStatusEntries
    .map((entry) => normalizePath(entry.path))
    .filter((relativePath) => (
      fs.existsSync(path.join(repoRoot, relativePath))
        || (!isTransientArtifact(relativePath)
          && classifyLifecyclePath(relativePath)?.category !== "LIFECYCLE_DEFERRED_TO_NO_SURPRISE_EXIT")
    ));
  const existingActiveTouchedPaths = activeTouchedPaths.filter((entry) => (
    entry.currentHeadScope === true
      || fs.existsSync(path.join(repoRoot, normalizePath(entry.path)))
  ));
  const authorityPaths = new Set([
    ...baselinePaths,
    ...existingActiveTouchedPaths.map((entry) => normalizePath(entry.path)),
  ]);
  const authorityCurrent = [...authorityPaths].map((normalizedPath) => ({
    ...(statusByPath.get(normalizedPath) || { path: normalizedPath, status: "  " }),
    ...fileIdentity(normalizedPath),
  }));
  return authorityCurrent.concat(statusEntries.filter((entry) => !authorityPaths.has(entry.path)));
}

function isTransientArtifact(relativePath) {
  const normalized = normalizePath(relativePath);
  return TRANSIENT_ARTIFACT_ROOTS.some((root) => normalized === root.replace(/\/$/, "") || normalized.startsWith(root));
}

function isProvenCurrentAuthorityPath(relativePath) {
  const classification = classifyLifecyclePath(relativePath);
  return classification?.category === "ACTIVE_CURRENT_SOURCE"
    || classification?.category === "DURABLE_CURRENT_CHECKER"
    || classification?.category === "ACTIVE_CURRENT_HARNESS";
}

function readHistoricalManifest(authority) {
  const manifest = authority.immutableClosure.manifest;
  assert.equal(manifest.packageId, packageId, "package manifest id");
  assert.equal(manifest.contractVersion, "PACKAGE_OWNERSHIP_DELTA_V1", "package manifest contract version");
  assert.ok(Array.isArray(manifest.touchedPaths), "package manifest touched paths");
  assert.ok(Array.isArray(manifest.baselineStatusEntries), "package manifest baseline status entries");
  return manifest;
}

function mapByPath(entries) {
  const map = new Map();
  for (const entry of entries) {
    const normalized = normalizePath(entry.path);
    if (!normalized || normalized.includes("*") || normalized.includes("..")) throw new Error(`invalid path in package contract: ${normalized}`);
    if (map.has(normalized)) throw new Error(`duplicate path in package contract: ${normalized}`);
    map.set(normalized, { ...entry, path: normalized });
  }
  return map;
}

function isByteExactPath(relativePath, identityMode = "NORMALIZED_TEXT_SHA256") {
  return identityMode === "BYTE_EXACT"
    || /^backend\/prisma\/migrations\/[^/]+\/migration\.sql$/u.test(normalizePath(relativePath));
}

function sameIdentity(left, right, relativePath) {
  // Git status codes describe index/worktree placement (for example ` M`
  // becomes `M ` after an unchanged inherited file is staged). Ownership
  // deltas are content/lifecycle deltas, so staging alone must not turn an
  // inherited accepted path into a new package change. Ordinary text uses the
  // normalized identity because a clean checkout may have Git-managed line
  // endings different from the Windows worktree. Prisma migration SQL keeps
  // its explicit byte identity contract.
  if (left?.normalizedSha256 !== right?.normalizedSha256) return false;
  return !isByteExactPath(relativePath, left?.identityMode || right?.identityMode)
    || left?.rawSha256 === right?.rawSha256;
}

function validateTouchedRecord(record, current, { skipIdentityHash = false } = {}) {
  const errors = [];
  if (!record.owner || record.owner === "UNKNOWN") errors.push("owner");
  if (!record.acceptance || record.acceptance !== "PASS") errors.push("acceptance");
  if (record.identityRegistered !== true) errors.push("identityRegistered");
  if (!record.lifecycle || record.lifecycle === "UNKNOWN") errors.push("lifecycle");
  if (record.path.includes("*") || record.path.includes("..")) errors.push("wildcard-or-traversal");
  if (current && !skipIdentityHash && (record.identityMode || "NORMALIZED_TEXT_SHA256") !== "CONTRACT_SELF") {
    if (record.normalizedSha256 !== current.normalizedSha256
      || (isByteExactPath(record.path, record.identityMode) && record.rawSha256 !== current.rawSha256)) {
      errors.push("identity-hash");
    }
  }
  return errors;
}

function historicalCurrentHeadByPath(entries) {
  const records = new Map();
  for (const entry of entries) {
    const relativePath = normalizePath(entry.path);
    if (relativePath) records.set(relativePath, { ...entry, path: relativePath });
  }
  return records;
}

function artifactType(relativePath) {
  const extension = path.extname(relativePath).toLowerCase();
  if (extension === ".png") return "SCREENSHOT_EVIDENCE";
  if (extension === ".json" || extension === ".sha256") return "STRUCTURED_EVIDENCE";
  if (extension === ".mjs" || extension === ".js") return "EXECUTION_OR_CHECKER_SOURCE";
  if (extension === ".md") return "GOVERNANCE_DOCUMENTATION";
  return "REPOSITORY_ARTIFACT";
}

function evidenceReference(relativePath) {
  if (relativePath.includes("/holdout/")) {
    return relativePath.includes("m18-run-")
      ? "backend/scripts/m18_run_o_freeze_01_check.mjs; .superpowers/sdd/*/run-*-freeze-receipt-20261003.json"
      : "backend/artifacts/holdout/freeze-m18-attempt03.mjs; backend/artifacts/holdout/run-frozen-case.mjs";
  }
  return `${relativePath}; linked M18 plan/spec or SDD plan-path ledger`;
}

function pathGroup(relativePath) {
  if (relativePath.startsWith("backend/artifacts/holdout/")) return "HOLDOUT";
  if (relativePath.startsWith("docs/superpowers/")) return "DOCUMENTATION";
  if (relativePath.startsWith(".superpowers/sdd/2026-10-01-m18-typed-semantic-evidence-implementation-plan/")) return "SDD_TYPED_SEMANTIC_EVIDENCE";
  if (relativePath.startsWith(".superpowers/sdd/2026-09-29-m18-sefer-abi-canonical-conversation-core/")) return "SDD_CANONICAL_CONVERSATION_CORE";
  if (relativePath.startsWith(".superpowers/sdd/2026-10-05-m18-run-scoped-provenance-and-trusted-gate-implementation-plan/")) return "SDD_RUN_SCOPED_PROVENANCE";
  if (relativePath.startsWith(".superpowers/sdd/m18-human-approved-governance-contract/")) return "SDD_EXTERNAL_ATTACHMENT_LEDGER";
  if (relativePath.startsWith(".superpowers/sdd/2026-09-29-seferpakt-project-execution-operating-system-adoption/")) return "SDD_CROSS_MILESTONE_GOVERNANCE";
  if (relativePath.startsWith("android-m18-")) return "ANDROID_EVIDENCE";
  return "UNCLASSIFIED_CANDIDATE";
}

function isCrossMilestoneDocumentation(relativePath) {
  return relativePath === "docs/superpowers/plans/2026-09-29-seferpakt-project-execution-operating-system-adoption.md"
    || relativePath === "docs/superpowers/specs/2026-09-28-seferpakt-project-execution-operating-system-design.md";
}

function unresolvedRecord(relativePath) {
  const group = pathGroup(relativePath);
  const android = group === "ANDROID_EVIDENCE";
  const crossMilestone = isCrossMilestoneDocumentation(relativePath);
  const missingEvidence = android
    ? [
        "original producer is not proven",
        "source/build/runtime/device/session identity is not proven",
        "current public/mobile acceptance provenance is unavailable",
      ]
    : crossMilestone
      ? [
          "exact current canonical owner is not proven",
          "retention/final-exit authority is not proven",
          "cross-milestone content does not establish path-level ownership",
        ]
      : [
          "path-level canonical owner/lifecycle record is absent",
          "SDD root plan/ledger is insufficient for blanket path classification",
          "exact producer/consumer/retention proof is absent",
        ];
  return {
    PATH: relativePath,
    PATH_GROUP: group,
    CONTENT_IDENTITY: fileIdentity(relativePath),
    ARTIFACT_TYPE: artifactType(relativePath),
    PROVEN_PRODUCER: android || crossMilestone ? "UNKNOWN" : "SDD_LEDGER_ROOT_ONLY_NOT_PATH_LEVEL",
    PRODUCER_EVIDENCE_REFERENCE: android
      ? "existing historical filename only; no producer receipt"
      : crossMilestone
        ? `${relativePath}; no current owner record`
        : `${relativePath}; linked SDD plan-path/progress ledger only`,
    CANONICAL_OWNER: "UNRESOLVED",
    OWNER_EVIDENCE_REFERENCE: "NO_PATH_LEVEL_CANONICAL_OWNER_RECORD",
    MILESTONE_OR_WORKSTREAM: android ? "M18_PUBLIC_MOBILE_EVIDENCE" : crossMilestone ? "CROSS_MILESTONE_GOVERNANCE" : "M18_CANDIDATE_REQUIRES_PATH_LEVEL_RECONCILIATION",
    SOURCE_OR_EVENT_BINDING: "NOT_PROVEN",
    CANONICAL_CONSUMER: android ? "M18_PUBLIC_MOBILE_ACCEPTANCE_GATE" : "PACKAGE_OWNERSHIP_DELTA_01_CHECK",
    LIFECYCLE_DISPOSITION: android ? "PROVENANCE_UNVERIFIED" : "UNKNOWN_REQUIRES_PROOF",
    IMMUTABILITY_REQUIREMENT: android ? "PRESERVE_BYTES_AND_HISTORICAL_REFERENCES" : "PRESERVE_UNTIL_OWNER_DECISION",
    RETENTION_OR_FINAL_EXIT_OBLIGATION: "NOT_PROVEN",
    ACCEPTANCE_EVIDENCE_ELIGIBILITY: false,
    CLASSIFICATION_CONFIDENCE: android ? "PROVEN_UNVERIFIED" : "INSUFFICIENT_EVIDENCE",
    MISSING_EVIDENCE: missingEvidence,
    SAFE_PERMANENT_DISPOSITION: android ? "PRESERVE_UNVERIFIED_EXCLUDE_PUBLIC_MOBILE_ACCEPTANCE" : "PRESERVE_UNRESOLVED_NO_APPROVAL",
    CANONICAL_DECISION_OWNER: android ? "M18_PUBLIC_MOBILE_EVIDENCE_OWNER" : "M18_GOVERNANCE_OWNER_REQUIRES_EXPLICIT_PATH_LEVEL_DECISION",
  };
}

function reconciledRecord(relativePath, activeByPath) {
  const entry = activeByPath.get(relativePath);
  if (!entry) throw new Error(`reconciliation path is not registered by active authority: ${relativePath}`);
  const identity = fileIdentity(relativePath);
  const holdout = relativePath.startsWith("backend/artifacts/holdout/");
  return {
    PATH: relativePath,
    PATH_GROUP: holdout ? "HOLDOUT" : "DOCUMENTATION",
    CONTENT_IDENTITY: identity,
    ARTIFACT_TYPE: artifactType(relativePath),
    PROVEN_PRODUCER: holdout ? "M18_HOLDOUT_FREEZE_OR_EXECUTION_PRODUCER" : "M18_DOCUMENT_AUTHORING_ARTIFACT",
    PRODUCER_EVIDENCE_REFERENCE: evidenceReference(relativePath),
    CANONICAL_OWNER: entry.owner,
    OWNER_EVIDENCE_REFERENCE: "backend/scripts/lib/m18CopilotUiElementAnchorOwnershipManifest.json:active-entry",
    MILESTONE_OR_WORKSTREAM: "M18_COPILOT_UI_ELEMENT_ANCHOR_AND_GUIDED_HIGHLIGHT_01",
    SOURCE_OR_EVENT_BINDING: holdout ? "M18_HISTORICAL_HOLDOUT_EVENT_RECEIPT" : "M18_PLAN_SPEC_AND_SDD_LEDGER",
    CANONICAL_CONSUMER: holdout ? "M18_HOLDOUT_FREEZE_AND_EXECUTION_CHECKERS" : "M18_OWNERSHIP_EVIDENCE_RECONCILIATION",
    LIFECYCLE_DISPOSITION: entry.lifecycle,
    IMMUTABILITY_REQUIREMENT: holdout ? "TRUE_HISTORICAL_EVIDENCE" : "RETAINED_NOT_FROZEN",
    RETENTION_OR_FINAL_EXIT_OBLIGATION: "FINAL_NO_SURPRISE_REPOSITORY_EXIT",
    ACCEPTANCE_EVIDENCE_ELIGIBILITY: false,
    CLASSIFICATION_CONFIDENCE: "PROVEN",
    MISSING_EVIDENCE: [],
    SAFE_PERMANENT_DISPOSITION: holdout ? "PRESERVE_HISTORICAL_EVIDENCE_EXCLUDE_CURRENT_ACCEPTANCE" : "RETAIN_M18_DOCUMENTATION_NOT_ACCEPTANCE_EVIDENCE",
    CANONICAL_DECISION_OWNER: entry.owner,
  };
}

function runEvidenceMatrixRegressions(records, reconciliationPaths, unresolvedPaths) {
  const byPath = new Map(records.map((record) => [record.PATH, record]));
  const checks = [
    {
      name: "matrix population is disjoint and complete",
      pass: records.length === reconciliationPaths.length + unresolvedPaths.length
        && byPath.size === records.length
        && reconciliationPaths.every((relativePath) => byPath.has(relativePath))
        && unresolvedPaths.every((relativePath) => byPath.has(relativePath)),
    },
    {
      name: "only exact path-level registrations are reconciled",
      pass: reconciliationPaths.every((relativePath) => byPath.get(relativePath).CANONICAL_OWNER === M18_OWNER)
        && unresolvedPaths.every((relativePath) => byPath.get(relativePath).CANONICAL_OWNER === "UNRESOLVED"),
    },
    {
      name: "unresolved records retain explicit missing evidence",
      pass: unresolvedPaths.every((relativePath) => byPath.get(relativePath).MISSING_EVIDENCE.length > 0),
    },
    {
      name: "android evidence cannot qualify as public acceptance",
      pass: records.filter((record) => record.PATH_GROUP === "ANDROID_EVIDENCE")
        .every((record) => record.ACCEPTANCE_EVIDENCE_ELIGIBILITY === false && record.LIFECYCLE_DISPOSITION === "PROVENANCE_UNVERIFIED"),
    },
    {
      name: "matrix is deterministic and path-level",
      pass: records.every((record) => !Object.values(record).some((value) => typeof value === "string" && path.isAbsolute(value)))
        && records.every((record) => !/\b(runId|timestamp|caseText|expectedAnswer)\b/i.test(JSON.stringify(record))),
    },
  ];
  return {
    count: checks.length,
    passCount: checks.filter((check) => check.pass).length,
    failures: checks.filter((check) => !check.pass).map((check) => check.name),
  };
}

function writeEvidenceMatrix({ activeTouchedPaths, result, activeManifestSha256 }) {
  const activeByPath = mapByPath(activeTouchedPaths);
  const reconciliationPaths = [...RECONCILIATION_CANDIDATE_PATHS].sort();
  const unresolvedPaths = [...result.unexplained].sort();
  const overlap = reconciliationPaths.filter((relativePath) => unresolvedPaths.includes(relativePath));
  if (overlap.length > 0) throw new Error(`evidence matrix overlap: ${overlap.join(", ")}`);
  const records = [
    ...reconciliationPaths.map((relativePath) => reconciledRecord(relativePath, activeByPath)),
    ...unresolvedPaths.map((relativePath) => unresolvedRecord(relativePath)),
  ].sort((left, right) => left.PATH.localeCompare(right.PATH));
  const regressions = runEvidenceMatrixRegressions(records, reconciliationPaths, unresolvedPaths);
  const matrix = {
    matrixContract: EVIDENCE_MATRIX_CONTRACT,
    matrixProducer: "backend/scripts/package_ownership_delta_01_check.js",
    candidatePopulationContract: packageId,
    sourceHead: execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim(),
    activeManifestSha256,
    candidatePopulationBaselineCount: records.length,
    reconciledPathCount: reconciliationPaths.length,
    unresolvedPathCount: unresolvedPaths.length,
    evidenceMatrixRegressionCount: regressions.count,
    evidenceMatrixRegressionPassCount: regressions.passCount,
    evidenceMatrixRegressionFailures: regressions.failures,
    records,
  };
  const absolute = path.join(repoRoot, EVIDENCE_MATRIX_PATH);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");
  return { matrix, regressions, sha256: sha256(fs.readFileSync(absolute)) };
}

export function mergeOwnershipTouchedPaths({ historicalTouchedPaths, activeTouchedPaths = [], historicalCurrentHeadEntries = [] }) {
  const merged = mapByPath(historicalTouchedPaths);
  const active = mapByPath(activeTouchedPaths);
  const historicalCurrentHead = historicalCurrentHeadByPath(historicalCurrentHeadEntries);
  for (const [relativePath, entry] of active) {
    const historical = merged.get(relativePath);
    if (historical && isCanonicalDependencyReferenceEntry(entry)) {
      if (entry.referenceOwner !== historical.owner) {
        throw new Error(`dependency reference cannot change historical owner: ${relativePath}`);
      }
    } else if (historical && (entry.supersedesHistoricalIdentity !== true || !entry.historicalOwner)) {
      throw new Error(`active milestone must explicitly supersede historical identity: ${relativePath}`);
    }
    if (!historical && (entry.supersedesHistoricalIdentity === true || entry.historicalOwner)) {
      const externalCurrentHead = historicalCurrentHead.get(relativePath);
      const externallyProven = entry.historicalAuthority === "PRE18_CURRENT_HEAD_POLICY" &&
        externalCurrentHead &&
        externalCurrentHead.owner === entry.historicalOwner &&
        externalCurrentHead.sha256 === entry.historicalRawSha256 &&
        entry.historicalRawSha256 === entry.historicalNormalizedSha256;
      if (!externallyProven) {
        throw new Error(`active milestone cannot claim historical supersession without canonical historical record: ${relativePath}`);
      }
    }
    merged.set(relativePath, entry);
  }
  return [...merged.values()];
}

export function evaluatePackageDelta({ baselineEntries, currentEntries, touchedPaths, activeTouchedPaths = [], activeDependencyReferences = [], historicalCurrentHeadEntries = [] }) {
  const baseline = mapByPath(baselineEntries);
  const current = mapByPath(currentEntries);
  const activeOwnershipEntries = [...activeTouchedPaths, ...activeDependencyReferences];
  const touched = mapByPath(mergeOwnershipTouchedPaths({
    historicalTouchedPaths: touchedPaths,
    activeTouchedPaths: activeOwnershipEntries,
    historicalCurrentHeadEntries,
  }));
  const changed = new Set();
  for (const [relativePath, currentEntry] of current) {
    const baselineEntry = baseline.get(relativePath);
    if (!baselineEntry || !sameIdentity(baselineEntry, currentEntry, relativePath)) changed.add(relativePath);
  }
  for (const relativePath of baseline.keys()) {
    if (!current.has(relativePath)) changed.add(relativePath);
  }
  const transientChanged = [...changed].filter((relativePath) => isTransientArtifact(relativePath));
  const lifecycleDeferred = [...changed].filter((relativePath) => classifyLifecyclePath(relativePath)?.category === "LIFECYCLE_DEFERRED_TO_NO_SURPRISE_EXIT");
  const lifecycleDeferredSet = new Set(lifecycleDeferred);
  const transientChangedSet = new Set(transientChanged);
  const unexplained = [...changed].filter((relativePath) => !touched.has(relativePath)
    && !isTransientArtifact(relativePath)
    && !lifecycleDeferredSet.has(relativePath)
    && !isProvenCurrentAuthorityPath(relativePath));
  const missingEvidence = [...changed]
    .filter((relativePath) => touched.has(relativePath))
    .flatMap((relativePath) => validateTouchedRecord(touched.get(relativePath), current.get(relativePath), {
      skipIdentityHash: touched.get(relativePath)?.identityMode === "CONTRACT_SELF"
        || isGeneratedIdentityEntry(touched.get(relativePath))
        // A canonical dependency reference records the approved external
        // owner and identity contract; it is not a second owner of the
        // dependency's current bytes.
        || isCanonicalDependencyReferenceEntry(touched.get(relativePath)),
    }).map((reason) => `${relativePath}:${reason}`));
  const touchedChanged = [...touched.keys()].filter((relativePath) => changed.has(relativePath));
  // `touchedChanged` is intentionally retained as the inclusive ownership
  // view used by the existing evidence contract. For changed-path arithmetic
  // it overlaps lifecycle-deferred and transient paths, so derive a disjoint
  // view and expose the overlap instead of double-counting those paths.
  const touchedChangedLifecycleDeferredOverlap = touchedChanged.filter((relativePath) => lifecycleDeferredSet.has(relativePath));
  const touchedChangedTransientOverlap = touchedChanged.filter((relativePath) => transientChangedSet.has(relativePath));
  const lifecycleDeferredTransientOverlap = lifecycleDeferred.filter((relativePath) => transientChangedSet.has(relativePath));
  const touchedChangedDisjoint = touchedChanged.filter((relativePath) => !lifecycleDeferredSet.has(relativePath) && !transientChangedSet.has(relativePath));
  const provenCurrentAuthorityChanged = [...changed].filter((relativePath) => (
    isProvenCurrentAuthorityPath(relativePath)
    && !touched.has(relativePath)
    && !lifecycleDeferredSet.has(relativePath)
    && !transientChangedSet.has(relativePath)
  ));
  const lifecycleDeferredDisjoint = lifecycleDeferred.filter((relativePath) => !transientChangedSet.has(relativePath));
  const staleTouched = [...touched.keys()].filter((relativePath) => !changed.has(relativePath));
  const dependencyReferencePaths = new Set(activeDependencyReferences.map((entry) => normalizePath(entry.path)));
  const dependencyReferenceChanged = [...changed].filter((relativePath) => dependencyReferencePaths.has(relativePath));
  return {
    baseline,
    current,
    touched,
    changed,
    unexplained,
    missingEvidence,
    touchedChanged,
    touchedChangedDisjoint,
    touchedChangedLifecycleDeferredOverlap,
    touchedChangedTransientOverlap,
    lifecycleDeferredTransientOverlap,
    provenCurrentAuthorityChanged,
    lifecycleDeferredDisjoint,
    staleTouched,
    transientChanged,
    lifecycleDeferred,
    dependencyReferenceChanged,
  };
}

function runNegativeAndPositiveTests() {
  const base = [{ path: "tracked.js", status: " M", rawSha256: "A", normalizedSha256: "A" }];
  const current = [{ path: "tracked.js", status: " M", rawSha256: "A", normalizedSha256: "A" }];
  const valid = (relativePath, hash = "A") => ({ path: relativePath, owner: packageId, acceptance: "PASS", identityRegistered: true, lifecycle: "ACTIVE_PACKAGE_INFRASTRUCTURE", rawSha256: hash, normalizedSha256: hash });
  const cases = [
    { name: "new unowned product", negative: true, current: [...current, { path: "new.jsx", status: "??", rawSha256: "B", normalizedSha256: "B" }], touched: [] },
    { name: "new unowned checker", negative: true, current: [...current, { path: "checker.mjs", status: "??", rawSha256: "B", normalizedSha256: "B" }], touched: [valid("checker.mjs", "B")] .map(({ owner, ...rest }) => ({ ...rest, acceptance: "NONE" })) },
    { name: "modified owned identity stale", negative: true, current: [{ path: "tracked.js", status: " M", rawSha256: "B", normalizedSha256: "B" }], touched: [valid("tracked.js", "A")] },
    { name: "modified inherited unresolved", negative: true, current: [{ path: "tracked.js", status: " M", rawSha256: "B", normalizedSha256: "B" }], touched: [] },
    { name: "durable lifecycle missing", negative: true, current: [...current, { path: "durable.mjs", status: "??", rawSha256: "B", normalizedSha256: "B" }], touched: [valid("durable.mjs", "B")].map(({ lifecycle, ...rest }) => rest) },
    { name: "unexplained repo file", negative: true, current: [...current, { path: "mystery.json", status: "??", rawSha256: "B", normalizedSha256: "B" }], touched: [] },
    { name: "wildcard exemption", negative: true, current: [...current, { path: "wild.mjs", status: "??", rawSha256: "B", normalizedSha256: "B" }], touched: [{ ...valid("wild.mjs", "B"), path: "backend/**" }] },
    { name: "identity without acceptance", negative: true, current: [...current, { path: "identity.mjs", status: "??", rawSha256: "B", normalizedSha256: "B" }], touched: [valid("identity.mjs", "B")].map((entry) => ({ ...entry, acceptance: "NONE" })) },
    {
      name: "active milestone with stale exact identity is rejected",
      negative: true,
      current: [...current, { path: "milestone-stale.jsx", status: "??", rawSha256: "B", normalizedSha256: "B" }],
      touched: [],
      activeTouched: [{ ...valid("milestone-stale.jsx", "A"), owner: "M18_GUIDED_TARGET" }],
    },
    {
      name: "external current-head supersession without canonical history is rejected",
      negative: true,
      current: [...current, { path: "external-head.jsx", status: "??", rawSha256: "B", normalizedSha256: "B" }],
      touched: [],
      activeTouched: [{ ...valid("external-head.jsx", "B"), owner: "M18_GUIDED_TARGET", supersedesHistoricalIdentity: true, historicalOwner: "PRE18_OWNER", historicalAuthority: "PRE18_CURRENT_HEAD_POLICY", historicalRawSha256: "A", historicalNormalizedSha256: "A" }],
    },
    { name: "valid owned accepted identity lifecycle", negative: false, current: [...current, { path: "owned.jsx", status: "??", rawSha256: "B", normalizedSha256: "B" }], touched: [valid("owned.jsx", "B")] },
    { name: "valid durable checker", negative: false, current: [...current, { path: "valid-check.mjs", status: "??", rawSha256: "B", normalizedSha256: "B" }], touched: [valid("valid-check.mjs", "B")] },
    { name: "inherited debt unchanged", negative: false, current, touched: [] },
    { name: "inherited accepted path staged without content delta", negative: false, current: [{ path: "tracked.js", status: "M ", rawSha256: "A", normalizedSha256: "A" }], touched: [] },
    { name: "inherited debt resolved", negative: false, current: [{ path: "tracked.js", status: " M", rawSha256: "B", normalizedSha256: "B" }], touched: [valid("tracked.js", "B")] },
    {
      name: "active milestone owns a new durable path without rewriting historical ownership",
      negative: false,
      current: [...current, { path: "milestone-target.jsx", status: "??", rawSha256: "B", normalizedSha256: "B" }],
      touched: [],
      activeTouched: [{ ...valid("milestone-target.jsx", "B"), owner: "M18_GUIDED_TARGET" }],
    },
    {
      name: "external current-head supersession with exact canonical history is accepted",
      negative: false,
      current: [...current, { path: "external-head.jsx", status: "??", rawSha256: "B", normalizedSha256: "B" }],
      touched: [],
      activeTouched: [{ ...valid("external-head.jsx", "B"), owner: "M18_GUIDED_TARGET", supersedesHistoricalIdentity: true, historicalOwner: "PRE18_OWNER", historicalAuthority: "PRE18_CURRENT_HEAD_POLICY", historicalRawSha256: "A", historicalNormalizedSha256: "A" }],
      historicalCurrentHead: [{ path: "external-head.jsx", owner: "PRE18_OWNER", sha256: "A" }],
    },
  ];
  const results = cases.map((test) => {
    try {
      const result = evaluatePackageDelta({
        baselineEntries: base,
        currentEntries: test.current,
        touchedPaths: test.touched,
        activeTouchedPaths: test.activeTouched || [],
        historicalCurrentHeadEntries: test.historicalCurrentHead || [],
      });
      const validResult = result.unexplained.length === 0 && result.missingEvidence.length === 0;
      return { ...test, pass: test.negative ? !validResult : validResult };
    } catch {
      return { ...test, pass: test.negative };
    }
  });
  const lifecycleRegressionResults = [
    {
      name: "directory lifecycle rule covers a descendant",
      pass: classifyLifecyclePath("backend/artifacts/harness-topology/fixture.json")?.category === "LIFECYCLE_DEFERRED_TO_NO_SURPRISE_EXIT",
    },
    {
      name: "playwright CLI lifecycle rule covers generated session output",
      pass: classifyLifecyclePath(".playwright-cli/session.yml")?.category === "LIFECYCLE_DEFERRED_TO_NO_SURPRISE_EXIT",
    },
    {
      name: "nested playwright CLI lifecycle rule covers generated output session",
      pass: classifyLifecyclePath("output/playwright/wp09/.playwright-cli/page.yml")?.category === "LIFECYCLE_DEFERRED_TO_NO_SURPRISE_EXIT",
    },
    {
      name: "directory lifecycle rule does not cover a sibling prefix",
      pass: classifyLifecyclePath("backend/artifactsology/fixture.json") === null,
    },
    {
      name: "playwright CLI lifecycle rule does not cover a sibling prefix",
      pass: classifyLifecyclePath(".playwright-cliology/session.yml") === null,
    },
    {
      name: "nested playwright CLI lifecycle rule does not cover a sibling prefix",
      pass: classifyLifecyclePath("output/playwrightology/page.yml") === null,
    },
    {
      name: "proven output family is deferred without covering its sibling",
      pass: classifyLifecyclePath("output/company-finance-final-acceptance/browser-result.json")?.category === "LIFECYCLE_DEFERRED_TO_NO_SURPRISE_EXIT"
        && classifyLifecyclePath("output/company-finance-final-acceptance-old/browser-result.json") === null,
    },
    {
      name: "exact current source authority is not reported as unexplained",
      pass: (() => {
        const result = evaluatePackageDelta({
          baselineEntries: [],
          currentEntries: [{
            path: "web/src/panels/company/PassengerLinksPanel.jsx",
            status: "??",
            rawSha256: "B",
            normalizedSha256: "B",
          }],
          touchedPaths: [],
        });
        return classifyLifecyclePath("web/src/panels/company/PassengerLinksPanel.jsx")?.category === "ACTIVE_CURRENT_SOURCE"
          && result.unexplained.length === 0
          && result.missingEvidence.length === 0;
      })(),
    },
    {
      name: "changed-path accounting preserves touched, deferred, transient and unexplained populations",
      pass: (() => {
        const result = evaluatePackageDelta({
          baselineEntries: [{ path: "tracked.js", status: " M", rawSha256: "A", normalizedSha256: "A" }],
          currentEntries: [
            { path: "tracked.js", status: " M", rawSha256: "B", normalizedSha256: "B" },
            { path: "backend/artifacts/harness-topology/fixture.json", status: "??", rawSha256: "B", normalizedSha256: "B" },
            { path: "debug.log", status: "??", rawSha256: "B", normalizedSha256: "B" },
            { path: "mystery.json", status: "??", rawSha256: "B", normalizedSha256: "B" },
          ],
          touchedPaths: [valid("tracked.js", "B")],
        });
        return result.changed.size === 4
          && result.touchedChanged.length === 1
          && result.lifecycleDeferred.length === 1
          && result.transientChanged.length === 1
          && result.unexplained.length === 1;
      })(),
    },
    {
      name: "ordinary text line-ending change is normalized across checkout",
      pass: (() => {
        const result = evaluatePackageDelta({
          baselineEntries: [{ path: "docs/readme.md", status: " M", rawSha256: "WINDOWS", normalizedSha256: "CONTENT" }],
          currentEntries: [{ path: "docs/readme.md", status: " M", rawSha256: "GIT", normalizedSha256: "CONTENT" }],
          touchedPaths: [valid("docs/readme.md", "CONTENT")],
        });
        return result.changed.size === 0 && result.missingEvidence.length === 0;
      })(),
    },
    {
      name: "Prisma migration byte identity remains strict",
      pass: (() => {
        const migrationPath = "backend/prisma/migrations/20261118000000_identity_contract/migration.sql";
        const result = evaluatePackageDelta({
          baselineEntries: [{ path: migrationPath, status: " M", rawSha256: "BYTE_A", normalizedSha256: "CONTENT" }],
          currentEntries: [{ path: migrationPath, status: " M", rawSha256: "BYTE_B", normalizedSha256: "CONTENT" }],
          touchedPaths: [{ ...valid(migrationPath, "CONTENT"), rawSha256: "BYTE_A", normalizedSha256: "CONTENT" }],
        });
        return result.changed.size === 1 && result.missingEvidence.includes(`${migrationPath}:identity-hash`);
      })(),
    },
  ];
  const dependencyRegressionResults = [
    {
      name: "canonical external dependency reference is accepted",
      pass: (() => {
        try {
          assertCanonicalDependencyReferenceEntry({
            path: "backend/scripts/copilot_dynamic_question_engine_01_check.js",
            owner: "COPILOT-DYNAMIC-QUESTION-ENGINE-01-CHECK",
            referenceOwner: "COPILOT-DYNAMIC-QUESTION-ENGINE-01-CHECK",
            referenceAuthority: "SCRIPT_HARNESS_CONSOLIDATION_01",
            relationship: "READ_ONLY_CANONICAL_DEPENDENCY",
            rawSha256: "A".repeat(64),
            normalizedSha256: "B".repeat(64),
            currentHeadScope: false,
          }, "backend/scripts/copilot_dynamic_question_engine_01_check.js");
          return true;
        } catch {
          return false;
        }
      })(),
    },
    {
      name: "fabricated dependency reference is rejected",
      pass: (() => {
        try {
          assertCanonicalDependencyReferenceEntry({
            path: "backend/scripts/not-an-approved-external-checker.js",
            owner: "M18_COPILOT_UI_ELEMENT_ANCHOR_AND_GUIDED_HIGHLIGHT_01",
            referenceOwner: "M18_COPILOT_UI_ELEMENT_ANCHOR_AND_GUIDED_HIGHLIGHT_01",
            referenceAuthority: "SCRIPT_HARNESS_CONSOLIDATION_01",
            relationship: "READ_ONLY_CANONICAL_DEPENDENCY",
            rawSha256: "A".repeat(64),
            normalizedSha256: "B".repeat(64),
            currentHeadScope: false,
          }, "backend/scripts/not-an-approved-external-checker.js");
          return false;
        } catch {
          return true;
        }
      })(),
    },
  ];
  return {
    negativeCaseCount: results.filter((test) => test.negative).length,
    negativeCasePassCount: results.filter((test) => test.negative && test.pass).length,
    positiveCaseCount: results.filter((test) => !test.negative).length,
    positiveCasePassCount: results.filter((test) => !test.negative && test.pass).length,
    lifecycleRegressionCount: lifecycleRegressionResults.length,
    lifecycleRegressionPassCount: lifecycleRegressionResults.filter((test) => test.pass).length,
    lifecycleRegressionFailures: lifecycleRegressionResults.filter((test) => !test.pass).map((test) => test.name),
    dependencyRegressionCount: dependencyRegressionResults.length,
    dependencyRegressionPassCount: dependencyRegressionResults.filter((test) => test.pass).length,
    dependencyRegressionFailures: dependencyRegressionResults.filter((test) => !test.pass).map((test) => test.name),
  };
}

async function main() {
  const authority = readMilestoneOwnershipAuthority();
  const authorityIntegrity = assertMilestoneOwnershipAuthorityIntegrity();
  const manifest = readHistoricalManifest(authority);
  const activeTouchedPaths = activeMilestoneTouchedPaths(authority);
  const activeDependencyReferences = activeMilestoneDependencyReferences(authority);
  const allTouchedPaths = mergeOwnershipTouchedPaths({
    historicalTouchedPaths: manifest.touchedPaths,
    activeTouchedPaths,
    historicalCurrentHeadEntries: PRE18_HISTORICAL_CURRENT_HEAD_IDENTITIES,
  });
  assertLifecycleClassificationIntegrity();
  const statusEntries = await gitStatusEntries();
  const statusPathSet = new Set(statusEntries.map((entry) => entry.path));
  // A final closure commit removes accepted paths from `git status`, but that
  // does not make their package delta unexplained. Rehydrate baseline paths
  // from the committed worktree so ownership compares content/lifecycle rather
  // than whether Git currently reports a status row.
  const currentEntries = await currentEntriesIncludingCommittedBaseline(manifest, activeTouchedPaths);
  const result = evaluatePackageDelta({
    baselineEntries: manifest.baselineStatusEntries,
    currentEntries,
    touchedPaths: manifest.touchedPaths,
    activeTouchedPaths,
    activeDependencyReferences,
    historicalCurrentHeadEntries: PRE18_HISTORICAL_CURRENT_HEAD_IDENTITIES,
  });
  const inherited = new Set(ACTIVE_UNOWNED_CURRENT_CHANGE_PATHS);
  const inheritedUnchanged = [...inherited].filter((relativePath) => result.baseline.has(relativePath) && !result.changed.has(relativePath));
  const inheritedTouched = [...inherited].filter((relativePath) => result.changed.has(relativePath));
  const selfTests = runNegativeAndPositiveTests();
  const activeManifestPath = "backend/scripts/lib/m18CopilotUiElementAnchorOwnershipManifest.json";
  const evidenceMatrix = writeEvidenceMatrix({
    activeTouchedPaths,
    result,
    activeManifestSha256: sha256(fs.readFileSync(path.join(repoRoot, activeManifestPath))),
  });
  const unownedDelta = result.unexplained.length + result.missingEvidence.length;
  const unexplainedDelta = result.unexplained.length;
  // Only a touched path whose live status or content differs from the
  // package baseline is a current package delta. A historical path may remain
  // dirty in exactly the same way it was when the package snapshot was taken
  // (for example guardGitScope.js); treating that unchanged status row as a
  // new delta creates a false closure failure. This is an exact baseline
  // comparison, not a wildcard or directory exemption.
  const staleTouchedInLiveStatus = [...result.touched.keys()].filter(
    (relativePath) => {
      if (!statusPathSet.has(relativePath) || result.changed.has(relativePath)) return false;
      const baselineEntry = result.baseline.get(relativePath);
      const currentEntry = result.current.get(relativePath);
      // Staging can legitimately change porcelain columns (` M` -> `M `)
      // without changing the file identity. Treat that as the same accepted
      // path; a real stale touch still fails closed when the identity differs
      // or the path disappeared.
      return !baselineEntry
        || !currentEntry
        || !sameIdentity(baselineEntry, currentEntry, relativePath);
    },
  );
  const report = {
    packageId,
    authorityVersion: authorityIntegrity.version,
    activeMilestoneId: authorityIntegrity.activeMilestoneId,
    activeMilestoneTouchedPathCount: activeTouchedPaths.length,
    touchedPathCount: allTouchedPaths.length,
    ownedPathCount: allTouchedPaths.filter((entry) => entry.owner).length,
    acceptedPathCount: allTouchedPaths.filter((entry) => entry.acceptance === "PASS").length,
    identityRegisteredPathCount: allTouchedPaths.filter((entry) => entry.identityRegistered === true).length,
    lifecycleClassifiedPathCount: allTouchedPaths.filter((entry) => entry.lifecycle).length,
    unownedDeltaCount: unownedDelta,
    unexplainedDeltaCount: unexplainedDelta,
    changedPathCount: result.changed.size,
    touchedChangedPathCount: result.touchedChanged.length,
    touchedChangedDisjointPathCount: result.touchedChangedDisjoint.length,
    touchedChangedLifecycleDeferredOverlapCount: result.touchedChangedLifecycleDeferredOverlap.length,
    touchedChangedTransientOverlapCount: result.touchedChangedTransientOverlap.length,
    lifecycleDeferredTransientOverlapCount: result.lifecycleDeferredTransientOverlap.length,
    provenCurrentAuthorityChangedCount: result.provenCurrentAuthorityChanged.length,
    lifecycleDeferredDisjointPathCount: result.lifecycleDeferredDisjoint.length,
    staleTouchedPathCount: result.staleTouched.length,
    inheritedActiveUnownedUnchangedCount: inheritedUnchanged.length,
    inheritedDebtApprovedCount: 0,
    wildcardDebtExemptionCount: 0,
    modifiedInheritedUnownedCount: inheritedTouched.length,
    transientArtifactRoots: TRANSIENT_ARTIFACT_ROOTS,
    negativeCaseCount: selfTests.negativeCaseCount,
    negativeCasePassCount: selfTests.negativeCasePassCount,
    positiveCaseCount: selfTests.positiveCaseCount,
    positiveCasePassCount: selfTests.positiveCasePassCount,
    lifecycleRegressionCount: selfTests.lifecycleRegressionCount,
    lifecycleRegressionPassCount: selfTests.lifecycleRegressionPassCount,
    lifecycleRegressionFailures: selfTests.lifecycleRegressionFailures,
    dependencyRegressionCount: selfTests.dependencyRegressionCount,
    dependencyRegressionPassCount: selfTests.dependencyRegressionPassCount,
    dependencyRegressionFailures: selfTests.dependencyRegressionFailures,
    lifecycleDeferredChangedPathCount: result.lifecycleDeferred.length,
    dependencyReferenceChangedPathCount: result.dependencyReferenceChanged.length,
    transientChangedPathCount: result.transientChanged.length,
    evidenceMatrixPath: EVIDENCE_MATRIX_PATH,
    evidenceMatrixSha256: evidenceMatrix.sha256,
    evidenceMatrixCandidateCount: evidenceMatrix.matrix.records.length,
    evidenceMatrixReconciledCount: evidenceMatrix.matrix.reconciledPathCount,
    evidenceMatrixUnresolvedCount: evidenceMatrix.matrix.unresolvedPathCount,
    evidenceMatrixRegressionCount: evidenceMatrix.regressions.count,
    evidenceMatrixRegressionPassCount: evidenceMatrix.regressions.passCount,
    evidenceMatrixRegressionFailures: evidenceMatrix.regressions.failures,
    changedPathAccounting: {
      changed: result.changed.size,
      touchedChanged: result.touchedChanged.length,
      touchedChangedDisjoint: result.touchedChangedDisjoint.length,
      unexplained: result.unexplained.length,
      lifecycleDeferred: result.lifecycleDeferred.length,
      lifecycleDeferredDisjoint: result.lifecycleDeferredDisjoint.length,
      transient: result.transientChanged.length,
      provenCurrentAuthority: result.provenCurrentAuthorityChanged.length,
      overlap: result.touchedChangedLifecycleDeferredOverlap.length
        + result.touchedChangedTransientOverlap.length
        - result.lifecycleDeferredTransientOverlap.length,
      equation: `${result.changed.size}=${result.touchedChangedDisjoint.length}+${result.unexplained.length}+${result.provenCurrentAuthorityChanged.length}+${result.lifecycleDeferredDisjoint.length}+${result.transientChanged.length}`,
    },
    unexplainedPaths: result.unexplained,
    evidenceFailures: result.missingEvidence,
  };
  console.log(`PACKAGE_ID=${report.packageId}`);
  console.log(`TOUCHED_PATH_COUNT=${report.touchedPathCount}`);
  console.log(`OWNED_PATH_COUNT=${report.ownedPathCount}`);
  console.log(`ACCEPTED_PATH_COUNT=${report.acceptedPathCount}`);
  console.log(`IDENTITY_REGISTERED_PATH_COUNT=${report.identityRegisteredPathCount}`);
  console.log(`LIFECYCLE_CLASSIFIED_PATH_COUNT=${report.lifecycleClassifiedPathCount}`);
  console.log(`UNOWNED_DELTA_COUNT=${report.unownedDeltaCount}`);
  console.log(`UNEXPLAINED_DELTA_COUNT=${report.unexplainedDeltaCount}`);
  console.log(`TOUCHED_CHANGED_DISJOINT_COUNT=${report.touchedChangedDisjointPathCount}`);
  console.log(`TOUCHED_CHANGED_LIFECYCLE_OVERLAP_COUNT=${report.touchedChangedLifecycleDeferredOverlapCount}`);
  console.log(`TOUCHED_CHANGED_TRANSIENT_OVERLAP_COUNT=${report.touchedChangedTransientOverlapCount}`);
  console.log(`LIFECYCLE_TRANSIENT_OVERLAP_COUNT=${report.lifecycleDeferredTransientOverlapCount}`);
  console.log(`PROVEN_CURRENT_AUTHORITY_CHANGED_COUNT=${report.provenCurrentAuthorityChangedCount}`);
  console.log(`LIFECYCLE_DEFERRED_DISJOINT_COUNT=${report.lifecycleDeferredDisjointPathCount}`);
  console.log(`INHERITED_ACTIVE_UNOWNED_UNCHANGED_COUNT=${report.inheritedActiveUnownedUnchangedCount}`);
  console.log(`INHERITED_DEBT_APPROVED_COUNT=${report.inheritedDebtApprovedCount}`);
  console.log(`WILDCARD_DEBT_EXEMPTION_COUNT=${report.wildcardDebtExemptionCount}`);
  console.log(`NEGATIVE_CASE_COUNT=${report.negativeCaseCount}`);
  console.log(`NEGATIVE_CASE_PASS_COUNT=${report.negativeCasePassCount}`);
  console.log(`POSITIVE_CASE_COUNT=${report.positiveCaseCount}`);
  console.log(`POSITIVE_CASE_PASS_COUNT=${report.positiveCasePassCount}`);
  console.log(`EVIDENCE_MATRIX_PATH=${report.evidenceMatrixPath}`);
  console.log(`EVIDENCE_MATRIX_SHA256=${report.evidenceMatrixSha256}`);
  console.log(`EVIDENCE_MATRIX_CANDIDATE_COUNT=${report.evidenceMatrixCandidateCount}`);
  console.log(`EVIDENCE_MATRIX_RECONCILED_COUNT=${report.evidenceMatrixReconciledCount}`);
  console.log(`EVIDENCE_MATRIX_UNRESOLVED_COUNT=${report.evidenceMatrixUnresolvedCount}`);
  console.log(`EVIDENCE_MATRIX_REGRESSION_COUNT=${report.evidenceMatrixRegressionCount}`);
  console.log(`EVIDENCE_MATRIX_REGRESSION_PASS_COUNT=${report.evidenceMatrixRegressionPassCount}`);
  if (report.unownedDeltaCount !== 0 || report.unexplainedDeltaCount !== 0 || report.negativeCasePassCount !== report.negativeCaseCount || report.positiveCasePassCount !== report.positiveCaseCount || report.lifecycleRegressionPassCount !== report.lifecycleRegressionCount || report.dependencyRegressionPassCount !== report.dependencyRegressionCount || report.evidenceMatrixRegressionPassCount !== report.evidenceMatrixRegressionCount || staleTouchedInLiveStatus.length !== 0) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
    return;
  }
  console.log("PACKAGE_DELTA_STATUS=PASS");
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
