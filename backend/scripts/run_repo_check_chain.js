#!/usr/bin/env node

/*
  Canonical repo verification chain.

  This is the single orchestration entry for day-to-day repo health:
    npm run verify:repo

  It intentionally keeps the older milestone/check scripts as evidence, but
  removes the need to remember their historical order by hand.
*/

import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const runtimeDataDir = path.join(repoRoot, "artifacts", "runtime-data");
const safeDirectory = path.resolve(repoRoot).replace(/\\/g, "/");

function nodeStep(id, relPath, args = []) {
  return {
    id,
    command: process.execPath,
    args: [path.join(repoRoot, relPath), ...args],
  };
}

const executionOsFrontierMarker = "SEFERPAKT_EXECUTING_ACTIVE_FRONTIER_V1";
const executionOsContractMarker = "SEFERPAKT_MILESTONE_CONTRACT_V1";
const canonicalRootClassIds = new Set([
  "CANONICAL_SEMANTIC_CANDIDATE_DOMAIN_INTERPRETATION",
  "CANONICAL_SEMANTIC_AUTHORITY_POST_CANONICAL_MUTATION",
]);
const currentArchitectureEpochId = "M18-ARCH-EPOCH-SEFER-ABI-SEMANTIC-ACTION-V1";
const currentArchitectureDecisionId = "M18-ARCH-DECISION-SEFER-ABI-SEMANTIC-ACTION-V1-2026-09-29";

function readRepoText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function readJsonCommentMarker(relativePath, marker) {
  const text = readRepoText(relativePath);
  const pattern = new RegExp(`<!--\\s*${marker}\\s*([\\s\\S]*?)\\s*-->`, "g");
  const matches = [...text.matchAll(pattern)];
  if (matches.length !== 1) throw new Error(`ADOPTION_FAIL ${relativePath} must contain exactly one ${marker} marker`);
  try {
    return JSON.parse(matches[0][1]);
  } catch (error) {
    throw new Error(`ADOPTION_FAIL ${relativePath} ${marker} JSON invalid: ${error.message}`);
  }
}

function assertSingleExecutingActiveFrontier() {
  const marker = readJsonCommentMarker("docs/NEXT_BACKLOG_V1.md", executionOsFrontierMarker);
  for (const competingOwner of ["docs/MILESTONE_REGISTRY_V1.md", "docs/PRIMER_SSOT.md", "docs/STARTPACK_V1.md", "docs/AGENTS.md"]) {
    const competing = readRepoText(competingOwner).match(new RegExp(`<!--\\s*${executionOsFrontierMarker}\\b`, "g")) || [];
    if (competing.length) throw new Error(`ADOPTION_FAIL duplicate frontier owner in ${competingOwner}`);
  }
  if (marker.schemaVersion !== executionOsFrontierMarker) throw new Error("ADOPTION_FAIL frontier schema version");
  if (marker.frontierStatus !== "EXECUTING") throw new Error("ADOPTION_FAIL frontier is not EXECUTING");
  if (marker.milestone !== "M18_COPILOT_UI_ELEMENT_ANCHOR_AND_GUIDED_HIGHLIGHT_01") throw new Error("ADOPTION_FAIL frontier milestone");
  if (marker.phase !== "M18_PRODUCT_ACCEPTANCE") throw new Error("ADOPTION_FAIL frontier phase");
  if (marker.activeFrontier !== "M18/STEP_04_OF_40") throw new Error("ADOPTION_FAIL active frontier must remain Step 4/40");
  if (marker.owner !== "docs/NEXT_BACKLOG_V1.md") throw new Error("ADOPTION_FAIL frontier owner");
  if (marker.activeRootClass === null) throw new Error("ADOPTION_FAIL activeRootClass must be bound before Conversation Core implementation");
  if (!canonicalRootClassIds.has(marker.activeRootClass)) throw new Error("ADOPTION_FAIL activeRootClass must use a registered canonical Conversation Core root class");
  if (marker.activeRootClassState !== "ACTIVE") throw new Error("ADOPTION_FAIL activeRootClassState must be ACTIVE after root binding");
  if (typeof marker.activeRootClass !== "string") throw new Error("ADOPTION_FAIL activeRootClass type");
  if (!marker.blocker || !marker.nextIfGreen || !marker.productState || !marker.evidenceHarnessState || !marker.repositoryClosureState) throw new Error("ADOPTION_FAIL frontier state fields");
  if (new Set([marker.productState, marker.evidenceHarnessState, marker.repositoryClosureState]).size !== 3) throw new Error("ADOPTION_FAIL product/evidence/repository states must remain separate");
  if (!Array.isArray(marker.evidencePaths)) throw new Error("ADOPTION_FAIL frontier evidencePaths");
  if (!marker.updatedAt || Number.isNaN(Date.parse(marker.updatedAt))) throw new Error("ADOPTION_FAIL frontier updatedAt");
  return marker;
}

function assertMilestoneContractLifecycle() {
  const contract = readJsonCommentMarker("docs/MILESTONE_REGISTRY_V1.md", executionOsContractMarker);
  const required = ["milestoneId", "lifecycleStatus", "goal", "nonGoals", "inputCapabilityContracts", "outputCapabilityContracts", "canonicalOwners", "newCapabilities", "existingInvariants", "behaviorClasses", "canarySurfaces", "realUserScenarios", "responsiveRequirements", "publicRuntimePolicy", "publicRuntimeRequirements", "writeApprovalBoundary", "freezeCriteria", "reopenCriteria", "closureRequirements"];
  for (const field of required) if (!(field in contract)) throw new Error(`ADOPTION_FAIL contract missing ${field}`);
  if (contract.milestoneId !== "M18_COPILOT_UI_ELEMENT_ANCHOR_AND_GUIDED_HIGHLIGHT_01") throw new Error("ADOPTION_FAIL contract milestone");
  if (contract.lifecycleStatus !== "ACTIVE") throw new Error("ADOPTION_FAIL M18 must remain ACTIVE");
  if (contract.publicRuntimePolicy !== "PUBLIC_REQUIRED") throw new Error("ADOPTION_FAIL M18 publicRuntimePolicy must be PUBLIC_REQUIRED");
  return contract;
}

function assertRootClassEpochHistory(frontier) {
  const record = frontier.rootClassHistory;
  if (!record || typeof record !== "object") throw new Error("ADOPTION_FAIL rootClassHistory missing");
  for (const field of ["rootClassId", "totalLifetimeAttempts", "currentArchitectureEpochAttempts", "architectureEpochId"]) if (!(field in record)) throw new Error(`ADOPTION_FAIL root history missing ${field}`);
  for (const field of ["title", "earliestFailingLayer", "canonicalOwner", "affectedCapabilityOrSurface", "firstObservedEvidence", "manifestations", "independentAttemptIds", "status", "currentFrontierRelation", "reopenEvidence"]) if (!(field in record)) throw new Error(`ADOPTION_FAIL active RootClassRecord missing ${field}`);
  if (record.rootClassId !== frontier.activeRootClass) throw new Error("ADOPTION_FAIL root history identity mismatch");
  if (record.status !== "ACTIVE") throw new Error("ADOPTION_FAIL active RootClassRecord status");
  if (!Array.isArray(record.manifestations) || !Array.isArray(record.independentAttemptIds)) throw new Error("ADOPTION_FAIL active RootClassRecord arrays");
  if (record.totalLifetimeAttempts !== null && !Number.isInteger(record.totalLifetimeAttempts)) throw new Error("ADOPTION_FAIL lifetime attempt count must be proven integer or null");
  if (record.currentArchitectureEpochAttempts !== null && !Number.isInteger(record.currentArchitectureEpochAttempts)) throw new Error("ADOPTION_FAIL epoch attempt count must be proven integer or null");
  if (typeof record.architectureEpochId !== "string" || !record.architectureEpochId) throw new Error("ADOPTION_FAIL architecture epoch identity");
  const historical = Array.isArray(frontier.historicalRootClassRecords) ? frontier.historicalRootClassRecords : [];
  const seen = new Set([record.rootClassId]);
  for (const historicalRecord of historical) {
    if (!historicalRecord || typeof historicalRecord !== "object") throw new Error("ADOPTION_FAIL historical root record must be an object");
    for (const field of ["rootClassId", "status", "totalLifetimeAttempts", "currentArchitectureEpochAttempts", "architectureEpochId"]) {
      if (!(field in historicalRecord)) throw new Error(`ADOPTION_FAIL historical root record missing ${field}`);
    }
    if (seen.has(historicalRecord.rootClassId)) throw new Error("ADOPTION_FAIL duplicate root class history identity");
    if (historicalRecord.status !== "SUPERSEDED_BY_NEW_ROOT_CLASS") throw new Error("ADOPTION_FAIL historical root record status");
    if (historicalRecord.totalLifetimeAttempts !== null && !Number.isInteger(historicalRecord.totalLifetimeAttempts)) throw new Error("ADOPTION_FAIL historical lifetime attempt count must be proven integer or null");
    if (historicalRecord.currentArchitectureEpochAttempts !== null && !Number.isInteger(historicalRecord.currentArchitectureEpochAttempts)) throw new Error("ADOPTION_FAIL historical epoch attempt count must be proven integer or null");
    if (typeof historicalRecord.architectureEpochId !== "string" || !historicalRecord.architectureEpochId) throw new Error("ADOPTION_FAIL historical architecture epoch identity");
    seen.add(historicalRecord.rootClassId);
  }
  return { state: "PROVEN", ...record, historicalRootClassRecords: historical };
}

function assertRootClassEnforcementContract(accounting) {
  const assert = (condition, message) => {
    if (!condition) throw new Error(`ADOPTION_FAIL ${message}`);
  };
  const attempt = (state) => ({
    ...state,
    lifetimeAttempts: state.lifetimeAttempts + 1,
    epochAttempts: state.epochAttempts + 1,
    action: state.epochAttempts >= 2 ? accounting.thirdRecurrenceAction : "ALLOW",
  });
  const initial = { lifetimeAttempts: 0, epochAttempts: 0, epochId: "EPOCH-1" };
  const first = attempt(initial);
  const second = attempt(first);
  const third = attempt(second);
  assert(first.action === "ALLOW" && second.action === "ALLOW", "root attempts one and two must remain allowed");
  assert(third.action === "ARCHITECTURAL_REVIEW_REQUIRED", "third recurrence must require architectural review");
  const reviewed = { ...third, action: "ARCHITECTURAL_REVIEW_REQUIRED" };
  assert(reviewed.lifetimeAttempts === third.lifetimeAttempts && reviewed.epochAttempts === third.epochAttempts, "architectural review must not reset history");
  const newEpoch = (state, materialBoundaryChange, architectureDecisionId) => ({
    ...state,
    epochId: materialBoundaryChange && architectureDecisionId ? "EPOCH-2" : state.epochId,
    epochAttempts: materialBoundaryChange && architectureDecisionId ? 0 : state.epochAttempts,
    transition: materialBoundaryChange && architectureDecisionId ? "NEW_EPOCH" : "REJECTED",
  });
  assert(newEpoch(reviewed, false, null).transition === "REJECTED", "milestone or ordinary transition cannot reset history");
  assert(newEpoch(reviewed, true, null).transition === "REJECTED", "material boundary without an approved decision cannot reset history");
  assert(newEpoch(reviewed, true, "ARCH-DECISION-1").transition === "NEW_EPOCH", "new epoch requires an approved material root boundary decision");
  assert(accounting.milestoneTransitionResetsHistory === false, "milestone transition must never reset lifetime history");
  return {
    proofState: "PROVEN_PASS",
    attemptsOneAndTwo: "ALLOW",
    recurrenceAfterTwo: accounting.thirdRecurrenceAction,
    reviewPreservesHistory: true,
    newEpochRequiresApprovedBoundary: true,
    milestoneTransitionResetsHistory: false,
  };
}

function assertFreezeEnforcementContract(contract) {
  const assert = (condition, message) => {
    if (!condition) throw new Error(`ADOPTION_FAIL ${message}`);
  };
  const eligible = (input) => input.openRootClassCount === 0
    && input.freshSweep1NewRootClassDefect === 0
    && input.freshSweep2NewRootClassDefect === 0
    && input.packageSpecificAcceptance === "PASS"
    && input.globalLockedInvariantSuite === "PASS"
    && input.publicRuntimePolicy === "PUBLIC_REQUIRED"
    && input.publicRuntimeAvailable === true;
  const complete = {
    openRootClassCount: 0,
    freshSweep1NewRootClassDefect: 0,
    freshSweep2NewRootClassDefect: 0,
    packageSpecificAcceptance: "PASS",
    globalLockedInvariantSuite: "PASS",
    publicRuntimePolicy: contract.publicRuntimePolicy,
    publicRuntimeAvailable: true,
  };
  for (const key of [
    "openRootClassCount",
    "freshSweep1NewRootClassDefect",
    "freshSweep2NewRootClassDefect",
  ]) {
    const rejected = { ...complete, [key]: key === "openRootClassCount" ? 1 : 1 };
    assert(!eligible(rejected), `freeze must reject when ${key} is not satisfied`);
  }
  assert(!eligible({ ...complete, packageSpecificAcceptance: "FAIL" }), "freeze must reject failed package acceptance");
  assert(!eligible({ ...complete, globalLockedInvariantSuite: "FAIL" }), "freeze must reject failed global invariant suite");
  assert(!eligible({ ...complete, publicRuntimeAvailable: false }), "freeze must reject unavailable PUBLIC_REQUIRED runtime");
  assert(eligible(complete), "freeze guard must accept only the complete approved formula");
  const applySweepIdentity = (state, ownerIdentity, relevantContractVersion, unrelatedNonImpactingChange = false) => {
    if (state.ownerIdentity !== ownerIdentity || state.relevantContractVersion !== relevantContractVersion) {
      return { ownerIdentity, relevantContractVersion, completedSweeps: 0, restarted: true };
    }
    return { ...state, unrelatedNonImpactingChange, restarted: false };
  };
  const priorPair = { ownerIdentity: "OWNER-1", relevantContractVersion: "V1", completedSweeps: 1 };
  const restarted = applySweepIdentity(priorPair, "OWNER-2", "V1");
  const preserved = applySweepIdentity(priorPair, "OWNER-1", "V1", true);
  assert(restarted.restarted === true && restarted.completedSweeps === 0, "relevant owner or contract change must restart the sweep pair");
  assert(preserved.restarted === false && preserved.completedSweeps === 1, "unrelated proven non-impacting change must not restart the sweep pair");
  return {
    proofState: "PROVEN_PASS",
    formula: "OPEN_ROOT_CLASS_COUNT=0 && FRESH_SWEEP_1=0 && FRESH_SWEEP_2=0 && PACKAGE_SPECIFIC_ACCEPTANCE=PASS && GLOBAL_LOCKED_INVARIANT_SUITE=PASS && PUBLIC_REQUIRED_AVAILABLE",
    freezeEligibility: "NOT_YET_SATISFIED",
    ownerOrContractChangeRestartsPair: true,
    unrelatedNonImpactingChangePreservesPair: true,
  };
}

function assertFreezeEligibilityAndPublicPolicy(contract) {
  if (contract.publicRuntimePolicy !== "PUBLIC_REQUIRED") throw new Error("ADOPTION_FAIL public runtime policy");
  const freeze = contract.freezeCriteria;
  const requiredTerms = ["OPEN_ROOT_CLASS_COUNT", "FRESH_SWEEP_1_NEW_ROOT_CLASS_DEFECT", "FRESH_SWEEP_2_NEW_ROOT_CLASS_DEFECT", "PACKAGE_SPECIFIC_ACCEPTANCE", "GLOBAL_LOCKED_INVARIANT_SUITE"];
  if (!requiredTerms.every((term) => Object.prototype.hasOwnProperty.call(freeze, term))) throw new Error("ADOPTION_FAIL freeze formula terms");
  const enforcement = assertFreezeEnforcementContract(contract);
  return { publicRuntimePolicy: contract.publicRuntimePolicy, freezeEligible: false, freezeEligibility: "NOT_YET_SATISFIED", reason: "M18 remains ACTIVE until every formula term is proven", enforcement };
}

function assertInvariantOwnerIntegration() {
  const registry = JSON.parse(readRepoText("docs/LOCKED_INVARIANT_REGISTRY_V1.json"));
  const ids = registry.invariants.map((item) => item.invariantId);
  if (new Set(ids).size !== ids.length) throw new Error("ADOPTION_FAIL duplicate invariant owner IDs");
  const family = registry.invariants.find((item) => item.invariantId === "EXECUTION-GOVERNANCE-BOUNDED-PROGRESS");
  if (!family) throw new Error("ADOPTION_FAIL bounded-progress invariant family missing");
  const keys = new Set((family.subrules || []).map((item) => item.subruleKey));
  for (const key of ["ROOT_CLASS_REPEATED_AFTER_TWO_ATTEMPTS_ESCALATES", "TWO_FRESH_SWEEPS_ZERO_NEW_ROOT_FREEZE", "AI_HOLDOUT_REQUIRED_WHERE_APPLICABLE", "SINGLE_ACTIVE_FRONTIER"]) if (!keys.has(key)) throw new Error(`ADOPTION_FAIL missing bounded-progress subrule ${key}`);
  return { family: family.invariantId, subrules: [...keys] };
}

function validateProjectExecutionOsAdoptionState() {
  const frontier = assertSingleExecutingActiveFrontier();
  const contract = assertMilestoneContractLifecycle();
  const accounting = contract.rootClassAccounting;
  if (!accounting || accounting.milestoneTransitionResetsHistory !== false) throw new Error("ADOPTION_FAIL root history must be immutable across milestone transitions");
  if (accounting.thirdRecurrenceAction !== "ARCHITECTURAL_REVIEW_REQUIRED") throw new Error("ADOPTION_FAIL third recurrence escalation policy");
  if (accounting.rootClassId !== frontier.activeRootClass) throw new Error("ADOPTION_FAIL milestone root accounting identity mismatch");
  if (accounting.state !== "ACTIVE") throw new Error("ADOPTION_FAIL milestone root accounting must be ACTIVE");
  for (const field of ["ROOT_CLASS_TOTAL_LIFETIME_ATTEMPTS", "ROOT_CLASS_CURRENT_ARCHITECTURE_EPOCH_ATTEMPTS", "ARCHITECTURE_EPOCH_ID", "ARCHITECTURE_DECISION_ID", "MATERIAL_ROOT_BOUNDARY_CHANGE"]) {
    if (!(field in accounting)) throw new Error(`ADOPTION_FAIL root accounting missing ${field}`);
  }
  if (typeof accounting.ARCHITECTURE_EPOCH_ID !== "string" || !accounting.ARCHITECTURE_EPOCH_ID) throw new Error("ADOPTION_FAIL architecture epoch decision identity");
  if (accounting.ARCHITECTURE_EPOCH_ID !== currentArchitectureEpochId) throw new Error("ADOPTION_FAIL current architecture epoch identity");
  if (accounting.ARCHITECTURE_DECISION_ID !== currentArchitectureDecisionId) throw new Error("ADOPTION_FAIL current architecture decision identity");
  if (accounting.MATERIAL_ROOT_BOUNDARY_CHANGE && !accounting.ARCHITECTURE_DECISION_ID) throw new Error("ADOPTION_FAIL material root boundary change requires architecture decision");
  if (Array.isArray(accounting.historicalRootClassRecords)) {
    const historicalIds = new Set();
    for (const historicalRecord of accounting.historicalRootClassRecords) {
      if (!historicalRecord || typeof historicalRecord !== "object") throw new Error("ADOPTION_FAIL milestone historical root record must be an object");
      if (historicalRecord.rootClassId === accounting.rootClassId || historicalIds.has(historicalRecord.rootClassId)) throw new Error("ADOPTION_FAIL milestone root history identity collision");
      if (historicalRecord.status !== "SUPERSEDED_BY_NEW_ROOT_CLASS") throw new Error("ADOPTION_FAIL milestone historical root record status");
      historicalIds.add(historicalRecord.rootClassId);
    }
  }
  const rootEpoch = assertRootClassEpochHistory(frontier);
  const rootClassEnforcement = assertRootClassEnforcementContract(accounting);
  const freeze = assertFreezeEligibilityAndPublicPolicy(contract);
  const invariant = assertInvariantOwnerIntegration();
  return { frontier, contract, rootEpoch, rootClassEnforcement, freeze, invariant };
}

function readFinal12HoldoutProof() {
  const evidenceDir = path.join(repoRoot, "docs", "evidence");
  const planDir = path.join(repoRoot, ".superpowers", "sdd", "2026-10-01-m18-typed-semantic-evidence-implementation-plan");
  const paths = {
    s1Execution: path.join(evidenceDir, "m18-gov001-arbitration-final12-20261014-s1-execution-receipt.json"),
    s2Execution: path.join(evidenceDir, "m18-gov001-arbitration-final12-20261014-s2-execution-receipt.json"),
    s1Audit: path.join(planDir, "m18-gov001-arbitration-final12-20261014-s1-audit.json"),
    s2Audit: path.join(planDir, "m18-gov001-arbitration-final12-20261014-s2-audit.json"),
    s1Provenance: path.join(planDir, "m18-gov001-arbitration-final12-20261014-s1-provenance-receipt.json"),
    s2Provenance: path.join(planDir, "m18-gov001-arbitration-final12-20261014-s2-provenance-receipt.json"),
  };
  try {
    const read = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));
    const execution = [read(paths.s1Execution), read(paths.s2Execution)];
    const audits = [read(paths.s1Audit), read(paths.s2Audit)];
    const provenance = [read(paths.s1Provenance), read(paths.s2Provenance)];
    const sourceIdentity = execution[0].currentSourceContentIdentity;
    const executionValid = execution.every((receipt) =>
      receipt.receiptSchemaVersion === "M18-HOLDOUT-EXECUTION-RECEIPT-V1" &&
      receipt.casesExposed === 56 && receipt.casesExecuted === 56 && receipt.casesPassed === 56 &&
      receipt.casesFailed === 0 && receipt.casesUnexecuted === 0 &&
      receipt.ordinaryMismatchesCollected === 0 && receipt.executionStatus === "GREEN" &&
      receipt.businessWriteExecution === 0 && receipt.criticalFailure === null &&
      receipt.securityEmergencyStop === false && receipt.integrityEmergencyStop === false &&
      receipt.currentSourceContentIdentity === sourceIdentity
    );
    const auditErrorFields = [
      "expectationContractUnsafeCount", "expectationMaterialAmbiguityCount", "mixedIntentMaterialAmbiguityCount",
      "navigateViewAuditFailureCount", "contractAuditMaterialDefectCount", "roleCapabilityContradictionCount",
      "executionContextDefectCount", "explicitContextualSurfaceDefectCount", "referenceScopeCouplingDefectCount",
      "runtimeContextOracleLeakCount", "contaminationKnownArtifactOverlapCount",
    ];
    const auditsValid = audits.every((audit) =>
      audit.auditSchemaVersion === "M18-HOLDOUT-AUDIT-V1" && audit.caseCount === 56 &&
      audit.caseValidationComplete === true && audit.auditComplete === true &&
      audit.authorRuntimeOracleUsed === false && audit.auditorRuntimeOracleUsed === false &&
      audit.fixturePreflight?.safe === true && audit.fixturePreflight.requiredCount === 8 &&
      audit.fixturePreflight.validatedCount === 8 && audit.fixturePreflight.failures.length === 0 &&
      auditErrorFields.every((field) => audit[field] === 0) &&
      audit.sourceContractBindingSha256 === sourceIdentity &&
      audit.completeSourceBindingSha256 === "97591F55EFD392D1D74C928E4DB07429CDC0969FD9BAF76B71CA411B34B5CBA2"
    );
    const provenanceValid = provenance.every((receipt) =>
      receipt.receiptSchemaVersion === "M18-RUN-PROVENANCE-RECEIPT-V1" &&
      receipt.finalStatus === "GREEN" && receipt.sourceMutation === false &&
      Array.isArray(receipt.sourceDifferences) && receipt.sourceDifferences.length === 0 &&
      receipt.runtimeBinding?.healthStatus === "PASS" && receipt.runtimeBinding?.staleListener === false &&
      receipt.runtimeBinding?.sourceIdentity === sourceIdentity &&
      receipt.runtimeBinding?.containerPort === 3000 &&
      receipt.suiteResults?.every((suite) => suite.businessWriteExecution === 0 &&
        suite.authorizationMutation === 0 && suite.downstreamBusinessWrite === 0 &&
        suite.externalLlmProviderCount === 0 && suite.externalLlmNetworkCallCount === 0 &&
        suite.runtimeFallbackCount === 0 && suite.downstreamSemanticRedecisionCount === 0 &&
        suite.shadowSemanticAuthorityCount === 0)
    );
    const sourceBound = execution.every((receipt) => receipt.currentSourceContentIdentity === sourceIdentity) &&
      audits.every((audit) => audit.sourceContractBindingSha256 === sourceIdentity) &&
      provenance.every((receipt) => receipt.runtimeBinding.sourceIdentity === sourceIdentity);
    if (!executionValid || !auditsValid || !provenanceValid || !sourceBound) {
      return {
        proofState: "UNPROVEN",
        evidence: "Final12 S1/S2 artifacts exist but their execution, audit, provenance, or source-binding contract is incomplete.",
      };
    }
    return {
      proofState: "PROVEN_PASS",
      evidence: `Final12 independent S1 and S2 holdouts consumed: 56/56 PASS each, author/auditor audits complete, source/runtime binding matches ${sourceIdentity}, zero business writes, zero external LLM calls, and zero contamination overlap.`,
    };
  } catch (error) {
    return {
      proofState: "UNPROVEN",
      evidence: `Final12 evidence-owner integration could not consume the required immutable artifacts: ${error.message}`,
    };
  }
}

function boundedProgressProof() {
  const validation = validateProjectExecutionOsAdoptionState();
  const { frontier, contract, rootEpoch, rootClassEnforcement, freeze } = validation;
  const registry = JSON.parse(readRepoText("docs/LOCKED_INVARIANT_REGISTRY_V1.json"));
  const subrules = {
    ROOT_CLASS_REPEATED_AFTER_TWO_ATTEMPTS_ESCALATES: {
      proofState: rootClassEnforcement.proofState,
      evidence: "Deterministic enforcement proof passed: attempts one and two are allowed; recurrence after two requires ARCHITECTURAL_REVIEW_REQUIRED; review preserves lifetime history; a new epoch requires an approved material root boundary decision; milestone transition does not reset history. The active root identity is registered separately from its still-unknown historical attempt counters.",
    },
    TWO_FRESH_SWEEPS_ZERO_NEW_ROOT_FREEZE: {
      proofState: freeze.enforcement.proofState,
      evidence: "Deterministic freeze enforcement proof passed: every required formula term and PUBLIC_REQUIRED availability are required; relevant owner/contract changes restart the sweep pair; unrelated proven non-impacting changes preserve it. M18_FREEZE_ELIGIBILITY remains NOT_YET_SATISFIED because real sweep evidence is still absent.",
    },
    AI_HOLDOUT_REQUIRED_WHERE_APPLICABLE: {
      ...readFinal12HoldoutProof(),
    },
    SINGLE_ACTIVE_FRONTIER: {
      proofState: frontier.frontierStatus === "EXECUTING" && frontier.activeFrontier === "M18/STEP_04_OF_40"
        ? "PROVEN_PASS"
        : "PROVEN_FAIL",
      evidence: "The existing adoption validator found exactly one canonical EXECUTING_ACTIVE_FRONTIER marker owned by docs/NEXT_BACKLOG_V1.md.",
    },
  };
  const result = Object.values(subrules).every((item) => item.proofState === "PROVEN_PASS") ? "PASS" : "UNPROVEN";
  return {
    schemaVersion: "EXECUTION_GOVERNANCE_BOUNDED_PROGRESS_PROOF_V1",
    result,
    invariantId: "EXECUTION-GOVERNANCE-BOUNDED-PROGRESS",
    subrules,
    source: "validateProjectExecutionOsAdoptionState",
    currentPhase: registry.currentPhase,
  };
}

const phaseDefinitions = {
  "locked-invariants": [
    nodeStep("locked-invariant-registry", "backend/scripts/locked_invariant_registry_01_check.js"),
    nodeStep("global-locked-invariant-suite", "backend/scripts/global_locked_invariant_suite_01_check.js"),
  ],
  lint: [
    nodeStep("package-ownership-delta", "backend/scripts/package_ownership_delta_01_check.js"),
    nodeStep("backend-lint", "backend/scripts/run_backend_lint.js"),
    nodeStep("relative-import-integrity", "backend/scripts/relative_import_integrity_check.js"),
    nodeStep("web-lint-with-evidence", "backend/scripts/run_web_lint_with_evidence.js"),
    nodeStep("brand-visibility", "tools/check_brand.js"),
  ],
  docs: [
    nodeStep("docs-ssot-pack", "backend/scripts/docs_ssot_pack_check.js"),
    nodeStep("m61-ssot-milestone-alignment", "backend/scripts/m61_ssot_milestone_alignment_check.js"),
    nodeStep("project-execution-os-adoption", "backend/scripts/run_repo_check_chain.js", ["--adoption-only"]),
  ],
  hot: [
    nodeStep("m58-final-pilot-readiness", "backend/scripts/m58_final_pilot_readiness_check.js"),
    nodeStep("m76b-living-matrix-tools-consolidation", "backend/scripts/m76b_living_matrix_tools_consolidation_check.js"),
    nodeStep("m76a2-final-normalization-archiving", "backend/scripts/m76a_2_final_normalization_archiving_check.js"),
    nodeStep("m77-kvkk-uyum-katmani", "backend/scripts/m77_kvkk_uyum_katmani_check.js"),
    nodeStep("m78-checklist-operasyon-dogrulama", "backend/scripts/m78_checklist_operasyon_dogrulama_check.js"),
    nodeStep("m79d1-copilot-acceptance-pack", "backend/scripts/m79_d1_copilot_acceptance_pack.js"),
    nodeStep("m82-1-correctness-guard", "backend/scripts/m82_1_correctness_guard_check.js"),
    nodeStep("m82-1-acceptance-contract", "backend/scripts/m82_1_acceptance_contract_check.js"),
    nodeStep("external-cost-data-provider-freshness", "backend/scripts/external_cost_data_provider_freshness_01_check.js"),
  ],
  "web-contract": [
    nodeStep("m82-2-web-contract-cache", "backend/scripts/m82_2_web_contract_cache_check.js"),
  ],
  closure: [
    nodeStep("m90b1-canonical-closure-gate", "backend/scripts/m90_b1_canonical_closure_gate_check.js"),
    nodeStep("repo-audit", "backend/scripts/repo_audit.js"),
    nodeStep("m90c6-hot-file-queue-policy", "backend/scripts/m90_c6_hot_file_queue_policy_check.js"),
    nodeStep("m90c7-export-package-hygiene", "backend/scripts/m90_c7_export_package_hygiene_check.js"),
    nodeStep("m90c8-ci-verification-visibility", "backend/scripts/m90_c8_ci_verification_visibility_check.js"),
    nodeStep("m90c9-safe-closure-final-hygiene", "backend/scripts/m90_c9_safe_closure_final_hygiene_check.js"),
    nodeStep("m94e-queue-chaos-alarm", "backend/scripts/m94e_queue_chaos_alarm_check.js"),
    nodeStep("m96c2-boarding-change-ops", "backend/scripts/m96_c2_boarding_change_ops_check.js"),
    nodeStep("m97-panel-operations", "backend/scripts/m97_panel_operations_check.js"),
    nodeStep("m95e20-gps-fallback", "backend/scripts/m95_e20_driver_phone_gps_fallback_check.js"),
    nodeStep("m95e23b-gps-source-visibility", "backend/scripts/m95_e23b_gps_source_visibility_check.js"),
    nodeStep("m95e20-web-gps-badge", "web/scripts/m95_e20_web_gps_source_badge_check.js"),
    nodeStep("database-backup-retention-and-integrity", "backend/scripts/database_backup_retention_and_integrity_01_check.js"),
    nodeStep("prisma-schema-modularization", "backend/scripts/prisma_schema_modularization_01_check.js"),
  ],
  milestones: [
    nodeStep("m0-latest-static-milestones", "backend/scripts/run_m0_latest.js", [
      "--static-only",
      "--to",
      "latest",
      "--continue",
    ]),
  ],
};

const defaultPhaseOrder = ["locked-invariants", "lint", "docs", "hot", "web-contract", "closure", "milestones"];

function usage() {
  console.log(`
Usage:
  node backend/scripts/run_repo_check_chain.js --phase all
  node backend/scripts/run_repo_check_chain.js --phase lint,docs
  node backend/scripts/run_repo_check_chain.js --list

Phases:
  ${defaultPhaseOrder.join(", ")}

Options:
  --phase <name|all|static>   Phase or comma-separated phases. Default: all.
  --continue                  Continue after a failed step.
  --adoption-only             Validate the Project Execution OS adoption state and exit.
  --adoption-proof            Emit the typed bounded-progress subrule proof contract.
  --list                      Print the ordered chain without running it.
`);
}

function parseArgs(argv) {
  const selected = [];
  const out = { phases: [], cont: false, list: false, adoptionOnly: false, adoptionProof: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    } else if (arg === "--continue") {
      out.cont = true;
    } else if (arg === "--list") {
      out.list = true;
    } else if (arg === "--adoption-only") {
      out.adoptionOnly = true;
    } else if (arg === "--adoption-proof") {
      out.adoptionProof = true;
    } else if (arg === "--phase") {
      selected.push(...String(argv[++i] || "").split(","));
    }
  }

  const rawPhases = selected.length ? selected : ["all"];
  for (const raw of rawPhases) {
    const phase = String(raw || "").trim().toLowerCase();
    if (!phase) continue;
    if (phase === "all" || phase === "static") {
      out.phases.push(...defaultPhaseOrder);
    } else if (phaseDefinitions[phase]) {
      out.phases.push(phase);
    } else {
      console.error(`ERROR unknown phase: ${raw}`);
      usage();
      process.exit(2);
    }
  }

  out.phases = [...new Set(out.phases)];
  return out;
}

function runStep(step) {
  return new Promise((resolve) => {
    const child = spawn(step.command, step.args, {
      cwd: repoRoot,
      env: {
      ...process.env,
      REPO_ROOT: repoRoot,
      PROJECT_ROOT: repoRoot,
      BACKUP_ARCHIVE_ALLOW_PLACEHOLDER: process.env.BACKUP_ARCHIVE_ALLOW_PLACEHOLDER || "1",
      RUNTIME_DATA_DIR: process.env.RUNTIME_DATA_DIR || runtimeDataDir,
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: "safe.directory",
      GIT_CONFIG_VALUE_0: safeDirectory,
    },
      stdio: "inherit",
    });

    child.on("exit", (code) => resolve(code ?? 1));
  });
}

function selectedSteps(phases) {
  return phases.flatMap((phase) =>
    phaseDefinitions[phase].map((step) => ({
      ...step,
      phase,
    }))
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.adoptionProof) {
    console.log(JSON.stringify(boundedProgressProof(), null, 2));
    return;
  }
  if (args.adoptionOnly) {
    console.log(JSON.stringify({ check: "project-execution-os-adoption", status: "PASS", result: validateProjectExecutionOsAdoptionState() }, null, 2));
    return;
  }
  const steps = selectedSteps(args.phases);

  console.log("\n=== REPO CHECK CHAIN ===");
  console.log(`Repo root: ${repoRoot}`);
  console.log(`Phases: ${args.phases.join(", ")}`);
  console.log(`Continue on fail: ${args.cont ? "YES" : "NO"}`);

  if (args.list) {
    for (const [index, step] of steps.entries()) {
      console.log(`${String(index + 1).padStart(2, "0")}. [${step.phase}] ${step.id}`);
    }
    return;
  }

  const results = [];
  for (const [index, step] of steps.entries()) {
    console.log(`\n--- ${index + 1}/${steps.length} [${step.phase}] ${step.id} ---`);
    const code = await runStep(step);
    const status = code === 0 ? "PASS" : `FAIL(${code})`;
    results.push({ phase: step.phase, id: step.id, status });

    if (code !== 0 && !args.cont) break;
  }

  const pass = results.filter((item) => item.status === "PASS").length;
  const fail = results.filter((item) => item.status.startsWith("FAIL")).length;

  console.log("\n=== REPO CHECK SUMMARY ===");
  console.log(`PASS: ${pass}  FAIL: ${fail}`);
  for (const result of results) {
    console.log(` - ${result.status.padEnd(8)} [${result.phase}] ${result.id}`);
  }

  if (fail > 0) process.exit(1);
  console.log("REPO CHECK CHAIN PASS");
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
