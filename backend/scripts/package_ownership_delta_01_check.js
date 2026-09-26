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
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  ACTIVE_UNOWNED_CURRENT_CHANGE_PATHS,
  assertLifecycleClassificationIntegrity,
} from "./lib/pre18LifecycleClassification.js";
import {
  activeMilestoneTouchedPaths,
  assertMilestoneOwnershipAuthorityIntegrity,
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

function normalizePath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\.\//, "").trim();
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex").toUpperCase();
}

function fileIdentity(relativePath) {
  const absolute = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
    return { rawSha256: null, normalizedSha256: null };
  }
  const raw = fs.readFileSync(absolute);
  const text = raw.toString("utf8");
  return {
    rawSha256: sha256(raw),
    normalizedSha256: sha256(text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")),
  };
}

function gitStatusEntries() {
  const output = execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  return output.split(/\r?\n/).filter(Boolean).map((line) => {
    const status = line.slice(0, 2);
    const relativePath = normalizePath(line.slice(3));
    const identity = fileIdentity(relativePath);
    return { path: relativePath, status, ...identity };
  });
}

function currentEntriesIncludingCommittedBaseline(manifest, activeTouchedPaths = []) {
  const statusEntries = gitStatusEntries();
  const statusByPath = new Map(statusEntries.map((entry) => [entry.path, entry]));
  const authorityPaths = new Set([
    ...manifest.baselineStatusEntries.map((entry) => normalizePath(entry.path)),
    ...activeTouchedPaths.map((entry) => normalizePath(entry.path)),
  ]);
  const authorityCurrent = [...authorityPaths].map((normalizedPath) => statusByPath.get(normalizedPath) || {
    path: normalizedPath,
    status: "  ",
    ...fileIdentity(normalizedPath),
  });
  return authorityCurrent.concat(statusEntries.filter((entry) => !authorityPaths.has(entry.path)));
}

function isTransientArtifact(relativePath) {
  const normalized = normalizePath(relativePath);
  return TRANSIENT_ARTIFACT_ROOTS.some((root) => normalized === root.replace(/\/$/, "") || normalized.startsWith(root));
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

function sameIdentity(left, right) {
  // Git status codes describe index/worktree placement (for example ` M`
  // becomes `M ` after an unchanged inherited file is staged). Ownership
  // deltas are content/lifecycle deltas, so staging alone must not turn an
  // inherited accepted path into a new package change.
  return left?.rawSha256 === right?.rawSha256
    && left?.normalizedSha256 === right?.normalizedSha256;
}

function validateTouchedRecord(record, current, { skipIdentityHash = false } = {}) {
  const errors = [];
  if (!record.owner || record.owner === "UNKNOWN") errors.push("owner");
  if (!record.acceptance || record.acceptance !== "PASS") errors.push("acceptance");
  if (record.identityRegistered !== true) errors.push("identityRegistered");
  if (!record.lifecycle || record.lifecycle === "UNKNOWN") errors.push("lifecycle");
  if (record.path.includes("*") || record.path.includes("..")) errors.push("wildcard-or-traversal");
  if (current && !skipIdentityHash && (record.identityMode || "NORMALIZED_TEXT_SHA256") !== "CONTRACT_SELF") {
    if (record.rawSha256 !== current.rawSha256 || record.normalizedSha256 !== current.normalizedSha256) errors.push("identity-hash");
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

export function mergeOwnershipTouchedPaths({ historicalTouchedPaths, activeTouchedPaths = [], historicalCurrentHeadEntries = [] }) {
  const merged = mapByPath(historicalTouchedPaths);
  const active = mapByPath(activeTouchedPaths);
  const historicalCurrentHead = historicalCurrentHeadByPath(historicalCurrentHeadEntries);
  for (const [relativePath, entry] of active) {
    const historical = merged.get(relativePath);
    if (historical && (entry.supersedesHistoricalIdentity !== true || !entry.historicalOwner)) {
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

export function evaluatePackageDelta({ baselineEntries, currentEntries, touchedPaths, activeTouchedPaths = [], historicalCurrentHeadEntries = [] }) {
  const baseline = mapByPath(baselineEntries);
  const current = mapByPath(currentEntries);
  const touched = mapByPath(mergeOwnershipTouchedPaths({
    historicalTouchedPaths: touchedPaths,
    activeTouchedPaths,
    historicalCurrentHeadEntries,
  }));
  const changed = new Set();
  for (const [relativePath, currentEntry] of current) {
    const baselineEntry = baseline.get(relativePath);
    if (!baselineEntry || !sameIdentity(baselineEntry, currentEntry)) changed.add(relativePath);
  }
  for (const relativePath of baseline.keys()) {
    if (!current.has(relativePath)) changed.add(relativePath);
  }
  const unexplained = [...changed].filter((relativePath) => !touched.has(relativePath) && !isTransientArtifact(relativePath));
  const missingEvidence = [...changed]
    .filter((relativePath) => touched.has(relativePath))
    .flatMap((relativePath) => validateTouchedRecord(touched.get(relativePath), current.get(relativePath), {
      skipIdentityHash: touched.get(relativePath)?.identityMode === "CONTRACT_SELF",
    }).map((reason) => `${relativePath}:${reason}`));
  const touchedChanged = [...touched.keys()].filter((relativePath) => changed.has(relativePath));
  const staleTouched = [...touched.keys()].filter((relativePath) => !changed.has(relativePath));
  return { baseline, current, touched, changed, unexplained, missingEvidence, touchedChanged, staleTouched };
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
  return {
    negativeCaseCount: results.filter((test) => test.negative).length,
    negativeCasePassCount: results.filter((test) => test.negative && test.pass).length,
    positiveCaseCount: results.filter((test) => !test.negative).length,
    positiveCasePassCount: results.filter((test) => !test.negative && test.pass).length,
  };
}

function main() {
  const authority = readMilestoneOwnershipAuthority();
  const authorityIntegrity = assertMilestoneOwnershipAuthorityIntegrity();
  const manifest = readHistoricalManifest(authority);
  const activeTouchedPaths = activeMilestoneTouchedPaths(authority);
  const allTouchedPaths = mergeOwnershipTouchedPaths({
    historicalTouchedPaths: manifest.touchedPaths,
    activeTouchedPaths,
    historicalCurrentHeadEntries: PRE18_HISTORICAL_CURRENT_HEAD_IDENTITIES,
  });
  assertLifecycleClassificationIntegrity();
  const statusEntries = gitStatusEntries();
  const statusPathSet = new Set(statusEntries.map((entry) => entry.path));
  // A final closure commit removes accepted paths from `git status`, but that
  // does not make their package delta unexplained. Rehydrate baseline paths
  // from the committed worktree so ownership compares content/lifecycle rather
  // than whether Git currently reports a status row.
  const currentEntries = currentEntriesIncludingCommittedBaseline(manifest, activeTouchedPaths);
  const result = evaluatePackageDelta({
    baselineEntries: manifest.baselineStatusEntries,
    currentEntries,
    touchedPaths: manifest.touchedPaths,
    activeTouchedPaths,
    historicalCurrentHeadEntries: PRE18_HISTORICAL_CURRENT_HEAD_IDENTITIES,
  });
  const inherited = new Set(ACTIVE_UNOWNED_CURRENT_CHANGE_PATHS);
  const inheritedUnchanged = [...inherited].filter((relativePath) => result.baseline.has(relativePath) && !result.changed.has(relativePath));
  const inheritedTouched = [...inherited].filter((relativePath) => result.changed.has(relativePath));
  const selfTests = runNegativeAndPositiveTests();
  const unownedDelta = result.unexplained.length + result.missingEvidence.length;
  const unexplainedDelta = result.unexplained.length;
  // Only a touched path that is still present in the live status is required
  // to be a current package delta. Once a closure path is committed, its
  // baseline identity is intentionally rehydrated above and staleTouched is
  // expected for that historical package record.
  const staleTouchedInLiveStatus = [...result.touched.keys()].filter(
    (relativePath) => statusPathSet.has(relativePath) && !result.changed.has(relativePath),
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
  console.log(`INHERITED_ACTIVE_UNOWNED_UNCHANGED_COUNT=${report.inheritedActiveUnownedUnchangedCount}`);
  console.log(`INHERITED_DEBT_APPROVED_COUNT=${report.inheritedDebtApprovedCount}`);
  console.log(`WILDCARD_DEBT_EXEMPTION_COUNT=${report.wildcardDebtExemptionCount}`);
  console.log(`NEGATIVE_CASE_COUNT=${report.negativeCaseCount}`);
  console.log(`NEGATIVE_CASE_PASS_COUNT=${report.negativeCasePassCount}`);
  console.log(`POSITIVE_CASE_COUNT=${report.positiveCaseCount}`);
  console.log(`POSITIVE_CASE_PASS_COUNT=${report.positiveCasePassCount}`);
  if (report.unownedDeltaCount !== 0 || report.unexplainedDeltaCount !== 0 || report.negativeCasePassCount !== report.negativeCaseCount || report.positiveCasePassCount !== report.positiveCaseCount || staleTouchedInLiveStatus.length !== 0) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
    return;
  }
  console.log("PACKAGE_DELTA_STATUS=PASS");
}

main();
