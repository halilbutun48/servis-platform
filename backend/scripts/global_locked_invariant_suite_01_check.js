#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF,
  CURRENT_HEAD_APPROVED_PRESENTATION_IDENTITY,
  CURRENT_HEAD_APPROVED_SCREEN_CONTEXT_AUTHORITY_ACCEPTANCE,
  CURRENT_HEAD_APPROVED_SEFER_ABI_SEMANTIC_REASONING_ACCEPTANCE,
} from "./lib/currentHeadScopePolicy.js";
import { CURRENT_CLOSURE_PRODUCT_SOURCE_ENTRIES } from "./lib/pre18LifecycleClassification.js";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "../..");
const registryPath = path.join(repoRoot, "docs", "LOCKED_INVARIANT_REGISTRY_V1.json");
const jsonLedgerPath = path.join(repoRoot, "docs", "LOCKED_INVARIANT_VIOLATION_LEDGER_V1.json");
const markdownLedgerPath = path.join(repoRoot, "docs", "LOCKED_INVARIANT_VIOLATION_LEDGER_V1.md");

function readJson(filePath) { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
function git(args) {
  try { return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { return "UNKNOWN"; }
}
function rel(filePath) { return path.relative(repoRoot, filePath).replaceAll("\\", "/"); }
function normalizedPath(value) { return String(value || "").replaceAll("\\", "/").replace(/^\.\//, "").trim(); }
function currentSourceIdentity() {
  const authorityGroups = [
    ["CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF", CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF],
    ["CURRENT_HEAD_APPROVED_PRESENTATION_IDENTITY", CURRENT_HEAD_APPROVED_PRESENTATION_IDENTITY],
    ["CURRENT_HEAD_APPROVED_SCREEN_CONTEXT_AUTHORITY_ACCEPTANCE", CURRENT_HEAD_APPROVED_SCREEN_CONTEXT_AUTHORITY_ACCEPTANCE],
    ["CURRENT_HEAD_APPROVED_SEFER_ABI_SEMANTIC_REASONING_ACCEPTANCE", CURRENT_HEAD_APPROVED_SEFER_ABI_SEMANTIC_REASONING_ACCEPTANCE],
    ["CURRENT_CLOSURE_PRODUCT_SOURCE_ENTRIES", CURRENT_CLOSURE_PRODUCT_SOURCE_ENTRIES],
  ];
  const byPath = new Map();
  for (const [authority, entries] of authorityGroups) {
    for (const entry of entries) {
      const filePath = normalizedPath(entry.path);
      if (!byPath.has(filePath)) byPath.set(filePath, new Set());
      byPath.get(filePath).add(authority);
    }
  }
  const files = [...byPath.keys()].sort();
  const records = files.map((filePath) => {
    const absolute = path.join(repoRoot, filePath);
    try {
      const bytes = fs.statSync(absolute).size;
      const rawSha256 = createHash("sha256").update(fs.readFileSync(absolute)).digest("hex").toUpperCase();
      return { path: filePath, bytes, rawSha256, authority: [...byPath.get(filePath)].sort() };
    } catch (error) {
      return { path: filePath, bytes: null, rawSha256: null, authority: [...byPath.get(filePath)].sort(), error: error.code || "READ_FAILED" };
    }
  });
  return {
    authority: "existing current-head/current-closure identity owners",
    algorithm: "RAW_SHA256_PER_FILE",
    sourceSets: authorityGroups.map(([name]) => name),
    files: records,
    missingOrUnreadable: records.filter((record) => !record.rawSha256).map((record) => record.path),
  };
}
function phaseIndex(registry, phase) {
  const index = registry.phaseOrder.indexOf(phase);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}
function isDueNow(registry, phases) {
  const currentIndex = phaseIndex(registry, registry.currentPhase);
  return (phases || ["ALWAYS"]).some((phase) => phaseIndex(registry, phase) <= currentIndex);
}
function runtimeCommandArgs(command) {
  const parts = String(command).trim().split(/\s+/);
  if (parts.length < 2 || parts[0] !== "node") throw new Error(`Unsupported runtime proof command: ${command}`);
  return [path.join(repoRoot, normalizedPath(parts[1])), ...parts.slice(2)];
}
function runDynamicProofContracts(registry) {
  const failures = new Map();
  const states = new Map();
  const evidence = new Map();
  for (const item of registry.invariants || []) {
    const runtimeContract = item.proofAdapter?.runtimeContract;
    const command = item.proofAdapter?.runtimeCheckCommand;
    if (!runtimeContract || !command || !item.regressionOwner) continue;
    const ownerScript = path.join(repoRoot, normalizedPath(item.regressionOwner));
    try {
      const args = item.proofAdapter?.runtimeProtocol === "EXECUTION_GOVERNANCE_BOUNDED_PROGRESS_PROOF_V1"
        ? runtimeCommandArgs(command)
        : [ownerScript];
      const output = execFileSync(process.execPath, args, {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      if (item.proofAdapter?.runtimeProtocol === "EXECUTION_GOVERNANCE_BOUNDED_PROGRESS_PROOF_V1") {
        const proof = JSON.parse(output);
        for (const [subruleKey, result] of Object.entries(proof.subrules || {})) {
          const key = `${item.invariantId}/${subruleKey}`;
          states.set(key, result.proofState);
          evidence.set(key, result.evidence || null);
          if (result.proofState === "PROVEN_FAIL") failures.set(key, result.evidence || "Bounded-progress proof reported PROVEN_FAIL.");
        }
      }
    } catch (error) {
      const output = `${error?.stdout || ""}\n${error?.stderr || ""}`.trim().replace(/\s+/g, " ");
      for (const subrule of item.subrules || []) {
        if (subrule.subruleKey === "RAW_INTERNAL_TOKEN_LEAK_ZERO") {
          failures.set(`${item.invariantId}/${subrule.subruleKey}`, `Dynamic proof ${command} failed: ${output.slice(0, 600)}`);
        }
      }
    }
  }
  return { failures, states, evidence };
}

function proofState(item, dueNow, runtimeProof = {}, subrule = null) {
  if (!dueNow) return "NOT_DUE_YET";
  const key = subrule ? `${item.invariantId}/${subrule.subruleKey}` : null;
  const runtimeState = key ? runtimeProof.states?.get(key) : null;
  if (runtimeState) return runtimeState;
  const runtimeFailure = key ? runtimeProof.failures?.get(key) : null;
  if (runtimeFailure) return "PROVEN_FAIL";
  if (item.currentCoverageState === "PROVEN") return "PROVEN_PASS";
  const classification = item.proofAdapter?.classification;
  if (classification === "CURRENT_REPO_STATE_BLOCK") return "REPO_STATE_BLOCK";
  if (classification === "CURRENT_ENVIRONMENT_BLOCK") return "ENVIRONMENT_BLOCK";
  if (classification === "PROVEN_FAIL") return "PROVEN_FAIL";
  return "UNPROVEN";
}
function blockerFor(item, state, dueNow, phases, runtimeProof = {}, subrule = null) {
  if (!dueNow) return `Activation phase ${phases.join(", ")} has not begun.`;
  if (state === "PROVEN_PASS") return null;
  const key = subrule ? `${item.invariantId}/${subrule.subruleKey}` : null;
  const runtimeFailure = key ? runtimeProof.failures?.get(key) : null;
  if (runtimeFailure) return runtimeFailure;
  const runtimeEvidence = key ? runtimeProof.evidence?.get(key) : null;
  if (runtimeEvidence) return runtimeEvidence;
  return item.proofAdapter?.evidence || `Registry state is ${item.currentCoverageState}.`;
}
function whyFor(item, state, dueNow) {
  if (!dueNow) return "The rule remains registered and active, but it is not due in the current lifecycle phase.";
  if (state === "PROVEN_PASS") return "Current canonical proof is registered and passing.";
  if (state === "REPO_STATE_BLOCK") return "Proof is due now, but the repository-state prerequisite currently blocks the proof adapter.";
  if (state === "ENVIRONMENT_BLOCK") return "Proof is due now, but the required runtime environment currently blocks the proof adapter.";
  if (state === "PROVEN_FAIL") return "Concrete failing evidence is registered.";
  return "Proof is due now and the current owner does not yet provide sufficient proof.";
}
function entryFor(registry, item, subrule, runtimeProof = {}) {
  const phases = subrule.activationPhases || item.activationPhases || ["ALWAYS"];
  const dueNow = isDueNow(registry, phases);
  const state = proofState(item, dueNow, runtimeProof, subrule);
  return {
    invariantId: item.invariantId,
    subruleKey: subrule.subruleKey,
    canonicalSubrule: subrule.canonicalSubrule,
    family: item.family,
    canonicalRule: item.canonicalRule,
    severity: item.severity,
    applicability: item.applicability,
    currentPhase: registry.currentPhase,
    activationPhases: phases,
    activationPhase: phases.join(", "),
    ruleLifecycleStatus: subrule.ruleLifecycleStatus || "ACTIVE",
    lifecycleAudit: subrule.lifecycleAudit || null,
    dueNow,
    proofState: state,
    coverageState: state === "UNPROVEN" ? "COVERAGE_GAP" : state,
    blocker: blockerFor(item, state, dueNow, phases, runtimeProof, subrule),
    why: whyFor(item, state, dueNow),
    expectedState: "PROVEN_PASS",
    actualState: state,
    status: state,
    role: null,
    tenantEntityClass: null,
    route: null,
    surface: null,
    workflowStep: null,
    viewport: null,
    runtimeBuildIdentity: null,
    firstFailingProbe: state === "PROVEN_PASS" || state === "NOT_DUE_YET" ? null : "registry proof state",
    evidence: state === "PROVEN_PASS" ? null : runtimeProof.evidence?.get(`${item.invariantId}/${subrule.subruleKey}`) || item.proofAdapter?.evidence || null,
    actualVisibleOrSemanticResult: null,
    networkBusinessWriteResult: null,
    permanentOwner: subrule.permanentOwner || item.permanentOwner,
    regressionOwner: subrule.regressionOwner || item.regressionOwner,
    proofAdapter: item.proofAdapter,
    sourceProvenance: item.sourceProvenance,
    classification: state === "PROVEN_FAIL" ? "CONCRETE_PROVEN_FAIL" : state === "NOT_DUE_YET" ? "PHASE_NOT_DUE_YET" : state === "PROVEN_PASS" ? "CURRENT_PROOF_PASS" : item.proofAdapter?.classification || "UNPROVEN"
  };
}
function markdown(ledger) {
  const lines = [
    "# Locked invariant status ledger", "",
    `Generated by \`global_locked_invariant_suite_01_check.js\` at ${ledger.generatedAt}.`, "",
    "## ACTUAL_CURRENT_STATUS", "",
    `- **GLOBAL_LOCKED_INVARIANT_SUITE:** ${ledger.result}`,
    `- **Current phase:** ${ledger.currentPhase}`,
    `- **TOTAL_INVARIANTS:** ${ledger.totalInvariants}`,
    `- **TOTAL_SUBRULES:** ${ledger.subruleCount}`,
    `- **DUE_NOW_INVARIANTS:** ${ledger.dueNowInvariantCount}`,
    `- **NOT_DUE_YET_INVARIANTS:** ${ledger.notDueYetInvariantCount}`,
    `- **DUE_NOW_SUBRULES:** ${ledger.dueNowSubruleCount}`,
    `- **NOT_DUE_YET_SUBRULES:** ${ledger.notDueYetSubruleCount}`,
    `- **PROVEN_PASS_DUE_NOW:** ${ledger.provenPassDueNow}`,
    `- **PROVEN_FAIL_DUE_NOW:** ${ledger.provenFailDueNow}`,
    `- **UNPROVEN_DUE_NOW:** ${ledger.unprovenDueNow}`,
    `- **COVERAGE_GAP_DUE_NOW:** ${ledger.coverageGapDueNow}`,
    `- **REPO_STATE_BLOCK_DUE_NOW:** ${ledger.repoStateBlockDueNow}`,
    `- **ENVIRONMENT_BLOCK_DUE_NOW:** ${ledger.environmentBlockDueNow}`,
    `- **UNKNOWN_OWNER_DUE_NOW:** ${ledger.unknownOwnerDueNow}`,
    `- **VIOLATED_INVARIANT_IDS:** ${ledger.violatedInvariantIds.join(", ") || "None"}`,
    `- **UNPROVEN_INVARIANT_IDS:** ${ledger.unprovenInvariantIds.join(", ") || "None"}`,
    `- **BLOCKED_INVARIANT_IDS:** ${ledger.blockedInvariantIds.join(", ") || "None"}`,
    `- **NOT_DUE_YET_INVARIANT_IDS:** ${ledger.notDueYetInvariantIds.join(", ") || "None"}`, "",
    `- **MIXED_PHASE_INVARIANT_IDS:** ${ledger.mixedPhaseInvariantIds.join(", ") || "None"}`, "",
    `- **RULE_LIFECYCLE_COUNTS:** ACTIVE=${ledger.ruleLifecycleCounts.ACTIVE}; REVISED=${ledger.ruleLifecycleCounts.REVISED}; SUPERSEDED=${ledger.ruleLifecycleCounts.SUPERSEDED}; RETIRED=${ledger.ruleLifecycleCounts.RETIRED}; CONTEXTUAL=${ledger.ruleLifecycleCounts.CONTEXTUAL}; REQUIRES_REVIEW=${ledger.ruleLifecycleCounts.REQUIRES_REVIEW}`,
    "- Invariant phase counts are non-exclusive when one invariant contains both due-now and future-phase subrules.",
    "## FUTURE_PACKAGE_REQUIREMENT", "",
    "Before progression from the current phase, every DUE_NOW subrule must be PROVEN_PASS.",
    "Required values: DUE_NOW_PROVEN_FAIL = 0; DUE_NOW_UNPROVEN = 0; DUE_NOW_COVERAGE_GAP = 0; DUE_NOW_UNKNOWN_OWNER = 0.",
    "Required value at the applicable closure phases: GLOBAL_LOCKED_INVARIANT_SUITE = PASS.", "",
    `## DUE_NOW (${ledger.dueNowEntries.length})`, ""
  ];
  if (!ledger.dueNowEntries.length) lines.push("None.", "");
  for (const item of ledger.dueNowEntries) lines.push(`- **${item.invariantId}/${item.subruleKey}:** lifecycle=${item.ruleLifecycleStatus}; ${item.proofState}; blocker=${item.blocker || "none"}`);
  lines.push("", `## NOT_DUE_YET (${ledger.notDueYetEntries.length})`, "");
  if (!ledger.notDueYetEntries.length) lines.push("None.", "");
  for (const item of ledger.notDueYetEntries) lines.push(`- **${item.invariantId}/${item.subruleKey}:** lifecycle=${item.ruleLifecycleStatus}; activation=${item.activationPhase}`);
  lines.push("", `## PROVEN_FAIL (${ledger.violations.length})`, "");
  if (!ledger.violations.length) lines.push("None.", "");
  for (const item of ledger.violations) lines.push(`- **${item.invariantId}/${item.subruleKey}:** ${item.evidence || "concrete failure"}`);
  return `${lines.join("\n").replace(/\n+$/u, "")}\n`;
}
function main() {
  const registry = readJson(registryPath);
  const invariants = registry.invariants || [];
  const duplicateIds = invariants.length - new Set(invariants.map((item) => item.invariantId)).size;
  const runtimeProof = runDynamicProofContracts(registry);
  const entries = invariants.flatMap((item) => (item.subrules || []).map((subrule) => entryFor(registry, item, subrule, runtimeProof)));
  const dueNowEntries = entries.filter((entry) => entry.dueNow);
  const notDueYetEntries = entries.filter((entry) => !entry.dueNow);
  const provenFailEntries = dueNowEntries.filter((entry) => entry.proofState === "PROVEN_FAIL");
  const unprovenEntries = dueNowEntries.filter((entry) => entry.proofState === "UNPROVEN");
  const blockedEntries = dueNowEntries.filter((entry) => ["REPO_STATE_BLOCK", "ENVIRONMENT_BLOCK"].includes(entry.proofState));
  const unknownOwnerEntries = dueNowEntries.filter((entry) => !entry.permanentOwner || !entry.regressionOwner);
  const lifecycleStatuses = ["ACTIVE", "REVISED", "SUPERSEDED", "RETIRED", "CONTEXTUAL", "REQUIRES_REVIEW"];
  const ruleLifecycleCounts = Object.fromEntries(lifecycleStatuses.map((status) => [status, entries.filter((entry) => entry.ruleLifecycleStatus === status).length]));
  const ids = (records) => [...new Set(records.map((entry) => entry.invariantId))];
  const dueIds = ids(dueNowEntries);
  // A family can contain both due-now and future-phase subrules. Such a mixed
  // family is not itself NOT_DUE_YET; its subrules retain their individual
  // lifecycle state and the due-now subrules remain blocking when unproven.
  const notDueIds = ids(notDueYetEntries.filter((entry) => !dueIds.includes(entry.invariantId)));
  const mixedPhaseIds = ids(notDueYetEntries.filter((entry) => dueIds.includes(entry.invariantId)));
  const provenFailIds = ids(provenFailEntries);
  const unprovenIds = ids(unprovenEntries);
  const blockedIds = ids(blockedEntries);
  const dueNowInvariantCount = dueIds.length;
  const notDueYetInvariantCount = notDueIds.length;
  const provenPassDueNow = dueIds.filter((id) => dueNowEntries.filter((entry) => entry.invariantId === id).every((entry) => entry.proofState === "PROVEN_PASS")).length;
  const runtimeBuildIdentity = `branch=${git(["branch", "--show-current"])};head=${git(["rev-parse", "HEAD"])};phase=${registry.currentPhase}`;
  const currentSource = currentSourceIdentity();
  const ledger = {
    ledgerId: "LOCKED_INVARIANT_VIOLATION_LEDGER_V1",
    generatedAt: new Date().toISOString(),
    runtimeBuildIdentity,
    currentSourceIdentity: currentSource,
    committedHeadIdentity: {
      branch: git(["branch", "--show-current"]),
      head: git(["rev-parse", "HEAD"]),
      closureChecksRemainMandatory: true,
      note: "Current-source proof records deterministic working-tree identities; committed-head/tag/push/remote-parity checks remain separate closure phases.",
    },
    currentPhase: registry.currentPhase,
    phaseOrder: registry.phaseOrder,
    phaseCountSemantics: "Invariant phase counts are non-exclusive for mixed-phase invariants; subrule due-now state is authoritative.",
    ruleLifecycleStatusValues: lifecycleStatuses,
    ruleLifecycleCounts,
    lifecycleAudit: registry.lifecycleAudit || null,
    dynamicProofFailures: Object.fromEntries(runtimeProof.failures.entries()),
    dynamicProofStates: Object.fromEntries(runtimeProof.states.entries()),
    result: provenFailEntries.length === 0 && unprovenEntries.length === 0 && blockedEntries.length === 0 && unknownOwnerEntries.length === 0 && duplicateIds === 0 ? "PASS" : "FAIL",
    totalInvariants: invariants.length,
    totalSubrules: entries.length,
    applicableInvariants: invariants.filter((item) => item.currentCoverageState !== "NOT_APPLICABLE" && item.currentCoverageState !== "RETIRED").length,
    dueNowInvariantCount,
    notDueYetInvariantCount,
    dueNowSubruleCount: dueNowEntries.length,
    notDueYetSubruleCount: notDueYetEntries.length,
    provenPass: invariants.filter((item) => item.currentCoverageState === "PROVEN").length,
    provenPassDueNow,
    provenFail: provenFailIds.length,
    provenFailDueNow: provenFailIds.length,
    coverageGap: unprovenIds.length,
    coverageGapDueNow: unprovenIds.length,
    unprovenDueNow: unprovenIds.length,
    repoStateBlockDueNow: ids(dueNowEntries.filter((entry) => entry.proofState === "REPO_STATE_BLOCK")).length,
    environmentBlockDueNow: ids(dueNowEntries.filter((entry) => entry.proofState === "ENVIRONMENT_BLOCK")).length,
    skippedNotApplicable: invariants.filter((item) => item.currentCoverageState === "NOT_APPLICABLE" || item.currentCoverageState === "RETIRED").length,
    duplicateInvariant: duplicateIds,
    contradictoryInvariant: 0,
    ownerUnknown: unknownOwnerEntries.length ? ids(unknownOwnerEntries).length : 0,
    unknownOwnerDueNow: ids(unknownOwnerEntries).length,
    unprovenApplicableInvariant: ids(dueNowEntries.filter((entry) => entry.proofState !== "PROVEN_PASS")).length,
    subruleCount: entries.length,
    coverageGapSubruleCount: unprovenEntries.length,
    blockedSubruleCount: blockedEntries.length,
    dueNowInvariantIds: dueIds,
    violatedInvariantIds: provenFailIds,
    unprovenInvariantIds: unprovenIds,
    blockedInvariantIds: blockedIds,
    notDueYetInvariantIds: notDueIds,
    mixedPhaseInvariantIds: mixedPhaseIds,
    lifecycleChangedEntries: entries.filter((entry) => ["REVISED", "SUPERSEDED", "RETIRED"].includes(entry.ruleLifecycleStatus)).map((entry) => ({
      invariantId: entry.invariantId,
      subruleKey: entry.subruleKey,
      status: entry.ruleLifecycleStatus,
      oldRule: entry.lifecycleAudit?.oldRule || null,
      currentRule: entry.lifecycleAudit?.currentRule || entry.canonicalSubrule,
      canonicalReason: entry.lifecycleAudit?.canonicalReason || null,
      supersedingSource: entry.lifecycleAudit?.supersedingSource || null,
      effectOnTestOwner: entry.lifecycleAudit?.effectOnTestOwner || null,
    })),
    dueNowEntries,
    notDueYetEntries,
    findings: dueNowEntries.filter((entry) => entry.proofState !== "PROVEN_PASS"),
    violations: provenFailEntries,
    VIOLATED_INVARIANT_IDS: provenFailIds,
    UNPROVEN_INVARIANT_IDS: unprovenIds,
    BLOCKED_INVARIANT_IDS: blockedIds,
    NOT_DUE_YET_INVARIANT_IDS: notDueIds,
    MIXED_PHASE_INVARIANT_IDS: mixedPhaseIds,
    DUE_NOW_PROVEN_FAIL: provenFailIds.length,
    DUE_NOW_UNPROVEN: unprovenIds.length,
    DUE_NOW_COVERAGE_GAP: unprovenIds.length,
    DUE_NOW_UNKNOWN_OWNER: ids(unknownOwnerEntries).length,
    ACTUAL_CURRENT_STATUS: {
      GLOBAL_LOCKED_INVARIANT_SUITE: provenFailEntries.length === 0 && unprovenEntries.length === 0 && blockedEntries.length === 0 && unknownOwnerEntries.length === 0 && duplicateIds === 0 ? "PASS" : "FAIL",
      currentPhase: registry.currentPhase
    },
    FUTURE_PACKAGE_REQUIREMENT: {
      DUE_NOW_PROVEN_FAIL: 0,
      DUE_NOW_UNPROVEN: 0,
      DUE_NOW_COVERAGE_GAP: 0,
      DUE_NOW_UNKNOWN_OWNER: 0,
      GLOBAL_LOCKED_INVARIANT_SUITE: "PASS"
    }
  };
  fs.writeFileSync(jsonLedgerPath, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
  fs.writeFileSync(markdownLedgerPath, markdown(ledger), "utf8");
  console.log(JSON.stringify({ suite: "GLOBAL_LOCKED_INVARIANT_SUITE", ...ledger, ledger: rel(jsonLedgerPath) }, null, 2));
  if (ledger.result !== "PASS") process.exitCode = 1;
}
try { main(); } catch (error) { console.error(error.stack || String(error)); process.exit(1); }
