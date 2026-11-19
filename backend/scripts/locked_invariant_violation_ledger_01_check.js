#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "../..");
const registryPath = path.join(repoRoot, "docs", "LOCKED_INVARIANT_REGISTRY_V1.json");
const ledgerPath = path.join(repoRoot, "docs", "LOCKED_INVARIANT_VIOLATION_LEDGER_V1.json");
const phaseOrder = ["ALWAYS", "BOUNDED_PACKAGE", "M18_PRODUCT_ACCEPTANCE", "FINAL_REAL_ACCEPTANCE", "REPOSITORY_EXIT", "PRE_COMMIT", "POST_COMMIT", "TAG_AND_PUSH", "REMOTE_PARITY", "MILESTONE_CLOSURE"];
const lifecycleValues = ["ACTIVE", "REVISED", "SUPERSEDED", "RETIRED", "CONTEXTUAL", "REQUIRES_REVIEW"];

function phaseIndex(phase) {
  const index = phaseOrder.indexOf(phase);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}
function dueNow(currentPhase, phases) { return phases.some((phase) => phaseIndex(phase) <= phaseIndex(currentPhase)); }

function main() {
  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
  const byId = new Map(registry.invariants.map((item) => [item.invariantId, item]));
  if (ledger.currentPhase !== registry.currentPhase) throw new Error("ledger current phase mismatch");
  if (JSON.stringify(ledger.phaseOrder) !== JSON.stringify(registry.phaseOrder)) throw new Error("ledger phase order mismatch");
  if (ledger.currentSourceIdentity?.algorithm !== registry.currentSourceIdentityMethod?.algorithm) throw new Error("ledger current-source identity method mismatch");
  if (!ledger.committedHeadIdentity?.closureChecksRemainMandatory) throw new Error("ledger must preserve committed-head closure checks");
  const expected = [];
  const expectedDue = [];
  const expectedNotDue = [];
  for (const item of registry.invariants) {
    for (const subrule of item.subrules || []) {
      const key = `${item.invariantId}/${subrule.subruleKey}`;
      expected.push(key);
      (dueNow(registry.currentPhase, subrule.activationPhases || item.activationPhases) ? expectedDue : expectedNotDue).push(key);
    }
  }
  const keyOf = (entry) => `${entry.invariantId}/${entry.subruleKey}`;
  const findings = ledger.findings || [];
  const findingKeys = new Set(findings.map(keyOf));
  const violationKeys = new Set((ledger.violations || []).map(keyOf));
  for (const entry of [...findings, ...(ledger.violations || [])]) {
    if (!entry.invariantId || !entry.subruleKey || !entry.canonicalSubrule) throw new Error("ledger entry lacks invariant/subrule traceability");
    const item = byId.get(entry.invariantId);
    if (!item) throw new Error(`ledger references unknown invariant ${entry.invariantId}`);
    const subrule = item.subrules.find((candidate) => candidate.subruleKey === entry.subruleKey);
    if (!subrule) throw new Error(`ledger references unknown subrule ${entry.invariantId}/${entry.subruleKey}`);
    if (entry.canonicalSubrule !== subrule.canonicalSubrule) throw new Error(`ledger canonical subrule mismatch for ${keyOf(entry)}`);
    if (!entry.proofState || !entry.status || !entry.permanentOwner || !entry.regressionOwner) throw new Error(`ledger entry incomplete for ${keyOf(entry)}`);
    if (!lifecycleValues.includes(entry.ruleLifecycleStatus) || entry.ruleLifecycleStatus !== subrule.ruleLifecycleStatus) throw new Error(`ledger lifecycle mismatch for ${keyOf(entry)}`);
  }
  const actualDue = new Set((ledger.dueNowEntries || []).map(keyOf));
  const actualNotDue = new Set((ledger.notDueYetEntries || []).map(keyOf));
  const missingDue = expectedDue.filter((key) => !actualDue.has(key));
  const missingNotDue = expectedNotDue.filter((key) => !actualNotDue.has(key));
  if (missingDue.length || missingNotDue.length) throw new Error(`ledger phase coverage mismatch: due=${missingDue.join(",")}; notDue=${missingNotDue.join(",")}`);
  const unexpectedDue = [...actualDue].filter((key) => !expectedDue.includes(key));
  const unexpectedNotDue = [...actualNotDue].filter((key) => !expectedNotDue.includes(key));
  if (unexpectedDue.length || unexpectedNotDue.length) throw new Error(`ledger has unexpected phase entries: due=${unexpectedDue.join(",")}; notDue=${unexpectedNotDue.join(",")}`);
  const expectedFindings = (ledger.dueNowEntries || []).filter((entry) => entry.proofState !== "PROVEN_PASS").map(keyOf);
  const missingFindings = expectedFindings.filter((key) => !findingKeys.has(key));
  if (missingFindings.length) throw new Error(`ledger missing due-now findings: ${missingFindings.join(",")}`);
  for (const entry of ledger.violations || []) if (entry.proofState !== "PROVEN_FAIL") throw new Error(`non-failing entry listed as violation: ${keyOf(entry)}`);
  const violationIdSet = new Set([...violationKeys].map((key) => key.split("/")[0]));
  if ((ledger.violatedInvariantIds || []).some((id) => !violationIdSet.has(id))) throw new Error("violatedInvariantIds contains non-failing invariant");
  if (ledger.coverageGap !== (ledger.unprovenInvariantIds || []).length) throw new Error("coverage gap count mismatch");
  if (ledger.coverageGapSubruleCount !== (ledger.findings || []).filter((entry) => entry.proofState === "UNPROVEN").length) throw new Error("coverage gap subrule count mismatch");
  const expectedLifecycleCounts = Object.fromEntries(lifecycleValues.map((status) => [status, expected.filter((key) => {
    const [id, subruleKey] = key.split("/");
    return byId.get(id).subrules.find((subrule) => subrule.subruleKey === subruleKey).ruleLifecycleStatus === status;
  }).length]));
  if (JSON.stringify(ledger.ruleLifecycleCounts || {}) !== JSON.stringify(expectedLifecycleCounts)) throw new Error("rule lifecycle counts mismatch");
  console.log(JSON.stringify({
    check: "locked-invariant-violation-ledger-01",
    status: "PASS",
    currentPhase: ledger.currentPhase,
    dueNowSubrules: expectedDue.length,
    notDueYetSubrules: expectedNotDue.length,
    dueNowFindings: expectedFindings.length,
    violatedInvariantIds: ledger.violatedInvariantIds,
    unprovenInvariantIds: ledger.unprovenInvariantIds,
    blockedInvariantIds: ledger.blockedInvariantIds,
    notDueYetInvariantIds: ledger.notDueYetInvariantIds
  }, null, 2));
}
try { main(); } catch (error) { console.error(error.stack || String(error)); process.exit(1); }
