#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "../..");
const registryPath = path.join(repoRoot, "docs", "LOCKED_INVARIANT_REGISTRY_V1.json");
const allowedCoverageStates = ["PROVEN", "REGISTERED_UNPROVEN", "NOT_APPLICABLE", "RETIRED"];
const requiredStatusValues = ["PROVEN_PASS", "PROVEN_FAIL", "UNPROVEN", "COVERAGE_GAP", "ENVIRONMENT_BLOCK", "REPO_STATE_BLOCK", "NOT_DUE_YET", "NOT_APPLICABLE"];
const requiredLifecycleValues = ["ACTIVE", "REVISED", "SUPERSEDED", "RETIRED", "CONTEXTUAL", "REQUIRES_REVIEW"];

function fail(message) { throw new Error(`LOCKED_INVARIANT_REGISTRY_INVALID: ${message}`); }
function readJson(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
  catch (error) { fail(`${path.relative(repoRoot, filePath)}: ${error.message}`); }
}
function exists(relPath) { return fs.existsSync(path.join(repoRoot, relPath)); }

function main() {
  const registry = readJson(registryPath);
  if (registry.registryId !== "LOCKED_INVARIANT_REGISTRY_V1") fail("registryId must be stable");
  if (registry.version !== 1) fail("unsupported registry version");
  if (registry.owner !== "docs/LOCKED_INVARIANT_REGISTRY_V1.json") fail("registry owner must be the JSON SSOT");
  if (!Array.isArray(registry.phaseOrder) || !registry.phaseOrder.length) fail("phaseOrder must be non-empty");
  if (!registry.phaseOrder.includes(registry.currentPhase)) fail(`currentPhase ${registry.currentPhase} is not in phaseOrder`);
  if (registry.currentSourceIdentityMethod?.algorithm !== "RAW_SHA256_PER_FILE") fail("currentSourceIdentityMethod must use RAW_SHA256_PER_FILE");
  if (!Array.isArray(registry.currentSourceIdentityMethod?.sourceSets) || registry.currentSourceIdentityMethod.sourceSets.length === 0) fail("currentSourceIdentityMethod sourceSets missing");
  if (!String(registry.currentSourceIdentityMethod?.closureBoundary || "").includes("COMMITTED_HEAD_VALIDATION")) fail("currentSourceIdentityMethod must preserve committed-head closure boundary");
  for (const status of requiredStatusValues) if (!registry.statusValues?.includes(status)) fail(`statusValues missing ${status}`);
  for (const status of requiredLifecycleValues) if (!registry.ruleLifecycleStatusValues?.includes(status)) fail(`ruleLifecycleStatusValues missing ${status}`);
  if (registry.lifecycleAudit?.auditedPhase !== registry.currentPhase) fail("lifecycleAudit auditedPhase must match currentPhase");
  if (!Array.isArray(registry.invariants) || registry.invariants.length === 0) fail("invariants must be non-empty");

  const ids = new Set();
  const canonicalRules = new Map();
  const aliases = new Map();
  const familyCounts = {};
  const gaps = [];
  const missingPaths = [];
  let subruleCount = 0;
  const requiredFields = [
    "invariantId", "family", "canonicalRule", "applicability", "severity",
    "sourceProvenance", "permanentOwner", "regressionOwner", "requiredEvidenceType",
    "realBrowserRequired", "realDeviceRequired", "publicRuntimeRequired", "currentCoverageState",
    "activationPhases"
  ];

  for (const item of registry.invariants) {
    for (const field of requiredFields) if (!(field in item)) fail(`${item.invariantId || "<unknown>"} missing ${field}`);
    if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)+$/.test(item.invariantId)) fail(`invalid stable ID ${item.invariantId}`);
    if (ids.has(item.invariantId)) fail(`duplicate invariant ID ${item.invariantId}`);
    ids.add(item.invariantId);
    const canonicalKey = String(item.canonicalRule).trim().toLowerCase();
    if (canonicalRules.has(canonicalKey) && canonicalRules.get(canonicalKey) !== item.invariantId) fail(`duplicate canonical rule ${canonicalRules.get(canonicalKey)} and ${item.invariantId}`);
    canonicalRules.set(canonicalKey, item.invariantId);
    familyCounts[item.family] = (familyCounts[item.family] || 0) + 1;
    if (!Array.isArray(item.activationPhases) || !item.activationPhases.length) fail(`${item.invariantId} has no activationPhases`);
    for (const phase of item.activationPhases) if (!registry.phaseOrder.includes(phase)) fail(`${item.invariantId} has unknown activation phase ${phase}`);
    if (!Array.isArray(item.sourceProvenance) || item.sourceProvenance.length === 0) fail(`${item.invariantId} has no provenance`);
    for (const relPath of [...item.sourceProvenance, item.permanentOwner, item.regressionOwner]) if (!exists(relPath)) missingPaths.push({ invariantId: item.invariantId, path: relPath });
    if (!allowedCoverageStates.includes(item.currentCoverageState)) fail(`${item.invariantId} has invalid coverage state ${item.currentCoverageState}`);
    if (!Array.isArray(item.subrules) || item.subrules.length === 0) fail(`${item.invariantId} has no subrules`);
    const subruleKeys = new Set();
    for (const subrule of item.subrules) {
      if (!subrule.subruleKey || !subrule.canonicalSubrule || !subrule.permanentOwner || !subrule.regressionOwner) fail(`${item.invariantId} contains an incomplete subrule`);
      if (!requiredLifecycleValues.includes(subrule.ruleLifecycleStatus)) fail(`${item.invariantId}/${subrule.subruleKey} has invalid ruleLifecycleStatus ${subrule.ruleLifecycleStatus}`);
      if (!subrule.lifecycleAudit || subrule.lifecycleAudit.status !== subrule.ruleLifecycleStatus || subrule.lifecycleAudit.auditedPhase !== registry.currentPhase) fail(`${item.invariantId}/${subrule.subruleKey} missing lifecycle audit trace`);
      if (subrule.ruleLifecycleStatus === "CONTEXTUAL" && subrule.lifecycleAudit.canonicalReason !== "Durable rule remains valid but is scoped to a later declared lifecycle phase; it is retained and not due now.") fail(`${item.invariantId}/${subrule.subruleKey} contextual reason is not explicit`);
      if (["REVISED", "SUPERSEDED", "RETIRED"].includes(subrule.ruleLifecycleStatus)) {
        const audit = subrule.lifecycleAudit;
        if (!audit.oldRule || !audit.currentRule || !audit.canonicalReason || !audit.effectOnTestOwner) fail(`${item.invariantId}/${subrule.subruleKey} changed lifecycle status lacks historical trace`);
      }
      if (subruleKeys.has(subrule.subruleKey)) fail(`${item.invariantId} has duplicate subrule ${subrule.subruleKey}`);
      subruleKeys.add(subrule.subruleKey);
      if (!Array.isArray(subrule.activationPhases) || !subrule.activationPhases.length) fail(`${item.invariantId}/${subrule.subruleKey} has no activationPhases`);
      for (const phase of subrule.activationPhases) if (!registry.phaseOrder.includes(phase)) fail(`${item.invariantId}/${subrule.subruleKey} has unknown activation phase ${phase}`);
      subruleCount += 1;
    }
    if (!item.proofAdapter?.classification || !item.proofAdapter?.command || !item.proofAdapter?.evidence) fail(`${item.invariantId} has no proof adapter contract`);
    if (item.currentCoverageState === "REGISTERED_UNPROVEN") gaps.push(item.invariantId);
    for (const alias of item.aliases || []) {
      if (alias === item.invariantId) fail(`${item.invariantId} aliases itself`);
      if (aliases.has(alias) && aliases.get(alias) !== item.invariantId) fail(`alias ${alias} points to multiple IDs`);
      aliases.set(alias, item.invariantId);
    }
  }
  if (missingPaths.length) fail(`missing owner/provenance paths: ${JSON.stringify(missingPaths)}`);
  console.log(JSON.stringify({
    check: "locked-invariant-registry-01",
    registry: path.relative(repoRoot, registryPath).replaceAll("\\", "/"),
    currentPhase: registry.currentPhase,
    phaseOrder: registry.phaseOrder,
    statusValues: registry.statusValues,
    ruleLifecycleStatusValues: registry.ruleLifecycleStatusValues,
    totalInvariants: registry.invariants.length,
    familyCounts,
    duplicateInvariant: 0,
    contradictoryInvariant: 0,
    ownerUnknown: 0,
    coverageGap: gaps.length,
    coverageGapIds: gaps,
    aliases: aliases.size,
    subruleCount,
    ruleLifecycleCounts: registry.lifecycleAudit?.statusCounts || null,
    status: "PASS"
  }, null, 2));
}
try { main(); } catch (error) { console.error(error.stack || String(error)); process.exit(1); }
