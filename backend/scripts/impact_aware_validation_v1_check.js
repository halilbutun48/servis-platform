#!/usr/bin/env node

import {
  IMPACT_AWARE_VALIDATION_EXECUTOR_V1_MODES,
  assertImpactAwareValidationExecutorV1Shape,
  buildImpactAwareValidationExecutionPlanV1,
  runImpactAwareValidationV1,
} from "./lib/impactAwareValidationExecutorV1.js";
import {
  buildImpactAwareValidationPlannerV1,
  assertImpactAwareValidationPlannerV1Shape,
} from "./lib/impactAwareValidationPlannerV1.js";
import { CHANGE_IMPACT_REGISTRY_V1_PATHS } from "./lib/changeImpactRegistryV1.js";

function must(condition, label) {
  if (!condition) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

function sameArray(actual, expected, label) {
  must(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  );
}

function expectSelectionPlan(result, expected) {
  assertImpactAwareValidationExecutorV1Shape(result, `executor result ${expected.label}`);
  must(result.requestedMode === expected.requestedMode, `${expected.label} requested mode matches`);
  must(result.executionMode === expected.executionMode, `${expected.label} execution mode matches`);
  must(result.selection.selectedStepCount === expected.selectedStepCount, `${expected.label} selected step count matches`);
  must(result.selection.releaseChainCount === expected.releaseChainCount, `${expected.label} release chain count matches`);
  must(result.selection.focusedSelectedCount === expected.focusedSelectedCount, `${expected.label} focused selected count matches`);
  must(result.selection.focusedCandidateCount === expected.focusedCandidateCount, `${expected.label} focused candidate count matches`);
  must(result.selection.focusedFoundationCount === expected.focusedFoundationCount, `${expected.label} focused foundation count matches`);
  must(result.selection.focusedDuplicateCommandCount === expected.focusedDuplicateCommandCount, `${expected.label} focused duplicate count matches`);
  if (expected.fallbackReasons) {
    sameArray(result.selection.fallbackReasons, expected.fallbackReasons, `${expected.label} fallback reasons`);
  }
  if (expected.unresolvedCandidateCheckIds) {
    sameArray(result.selection.unresolvedCandidateCheckIds, expected.unresolvedCandidateCheckIds, `${expected.label} unresolved candidate checks`);
  }
}

async function main() {
  console.log("=== IMPACT-AWARE VALIDATION EXECUTOR V1 CHECK ===");

  must(
    JSON.stringify(IMPACT_AWARE_VALIDATION_EXECUTOR_V1_MODES) === JSON.stringify(["PLAN_ONLY", "FOCUSED", "FULL_CHAIN_REQUIRED"]),
    "executor mode vocabulary is stable",
  );

  const planner = buildImpactAwareValidationPlannerV1(CHANGE_IMPACT_REGISTRY_V1_PATHS);
  assertImpactAwareValidationPlannerV1Shape(planner, "pilot planner");
  must(planner.fullChainRequired === true, "pilot planner still requires full chain");
  must(planner.summary.candidateCheckCount === 198, "pilot planner candidate count is 198");
  must(planner.summary.foundationSentinelCount === 11, "pilot planner foundation count is 11");

  const focusedPlanOnly = buildImpactAwareValidationExecutionPlanV1(
    ["backend/src/routes/companyOverview.js"],
    { mode: "PLAN_ONLY" },
  );
  expectSelectionPlan(focusedPlanOnly, {
    label: "focused plan-only companyOverview",
    requestedMode: "PLAN_ONLY",
    executionMode: "FOCUSED",
    selectedStepCount: focusedPlanOnly.selection.focusedSelectedCount,
    releaseChainCount: 0,
    focusedSelectedCount: focusedPlanOnly.selection.focusedSelectedCount,
    focusedCandidateCount: focusedPlanOnly.selection.focusedCandidateCount,
    focusedFoundationCount: focusedPlanOnly.selection.focusedFoundationCount,
    focusedDuplicateCommandCount: focusedPlanOnly.selection.focusedDuplicateCommandCount,
    fallbackReasons: [],
  });
  must(focusedPlanOnly.planner.fullChainRequired === false, "companyOverview stays focused");
  must(focusedPlanOnly.selection.focusedSelectedCount > 0, "companyOverview focused selection is non-empty");
  must(focusedPlanOnly.selection.focusedSelectedCount < 198, "companyOverview focused selection narrows below full chain");
  must(focusedPlanOnly.selection.releaseChainCount === 0, "companyOverview focused preview has no release chain");

  const focusedExecution = await runImpactAwareValidationV1(
    ["backend/src/routes/companyOverview.js"],
    { mode: "FOCUSED" },
  );
  assertImpactAwareValidationExecutorV1Shape(focusedExecution, "focused execution companyOverview");
  must(focusedExecution.executed === true, "focused execution ran");
  must(focusedExecution.exitCode === 0, "focused execution exits cleanly");
  must(focusedExecution.executionMode === "FOCUSED", "focused execution mode remains focused");
  must(focusedExecution.selection.selectedStepCount === focusedPlanOnly.selection.focusedSelectedCount, "focused execution step count matches plan");

  const fullChainPlanOnly = buildImpactAwareValidationExecutionPlanV1(
    ["web/src/App.jsx"],
    { mode: "PLAN_ONLY" },
  );
  expectSelectionPlan(fullChainPlanOnly, {
    label: "plan-only App.jsx",
    requestedMode: "PLAN_ONLY",
    executionMode: "FULL_CHAIN_REQUIRED",
    selectedStepCount: fullChainPlanOnly.selection.releaseChainCount,
    releaseChainCount: fullChainPlanOnly.selection.releaseChainCount,
    focusedSelectedCount: fullChainPlanOnly.selection.focusedSelectedCount,
    focusedCandidateCount: fullChainPlanOnly.selection.focusedCandidateCount,
    focusedFoundationCount: fullChainPlanOnly.selection.focusedFoundationCount,
    focusedDuplicateCommandCount: fullChainPlanOnly.selection.focusedDuplicateCommandCount,
    fallbackReasons: fullChainPlanOnly.selection.fallbackReasons,
  });
  must(fullChainPlanOnly.planner.fullChainRequired === true, "App.jsx requires full chain");
  must(fullChainPlanOnly.selection.releaseChainCount === 1, "App.jsx release chain count is 1");
  must(fullChainPlanOnly.selection.selectedStepCount === 1, "App.jsx selected step count collapses to release chain");
  sameArray(fullChainPlanOnly.selection.fallbackReasons, ["planner-full-chain-required"], "App.jsx fallback reason");

  const unknownPlanOnly = buildImpactAwareValidationExecutionPlanV1(
    ["backend/src/does/not/exist.js"],
    { mode: "PLAN_ONLY" },
  );
  expectSelectionPlan(unknownPlanOnly, {
    label: "unknown plan-only",
    requestedMode: "PLAN_ONLY",
    executionMode: "FULL_CHAIN_REQUIRED",
    selectedStepCount: 1,
    releaseChainCount: 1,
    focusedSelectedCount: 0,
    focusedCandidateCount: 0,
    focusedFoundationCount: 0,
    focusedDuplicateCommandCount: 0,
    fallbackReasons: ["planner-fail-closed"],
    unresolvedCandidateCheckIds: [],
  });
  must(unknownPlanOnly.planner.confidence === "FAIL_CLOSED", "unknown path fails closed in planner");
  must(unknownPlanOnly.planner.unresolvedPaths.length === 1, "unknown path keeps unresolved count");
  must(unknownPlanOnly.selection.selectedStepCount === 1, "unknown path falls back to release chain");

  const forcedFullChain = buildImpactAwareValidationExecutionPlanV1(
    ["backend/src/routes/companyOverview.js"],
    { mode: "FULL_CHAIN_REQUIRED" },
  );
  must(forcedFullChain.executionMode === "FULL_CHAIN_REQUIRED", "forced full-chain mode stays full chain");
  must(forcedFullChain.selection.selectedStepCount === 1, "forced full-chain mode selects release chain");
  sameArray(
    forcedFullChain.selection.fallbackReasons,
    ["requested-full-chain-required"],
    "forced full-chain fallback reason",
  );

  console.log(
    JSON.stringify(
      {
        planner: {
          changedPathCount: planner.summary.changedPathCount,
          candidateCheckCount: planner.summary.candidateCheckCount,
          globalCheckCount: planner.summary.globalCheckCount,
          domainCheckCount: planner.summary.domainCheckCount,
          mixedCheckCount: planner.summary.mixedCheckCount,
          foundationCheckCount: planner.summary.foundationCheckCount,
          foundationSentinelCount: planner.summary.foundationSentinelCount,
          smokeSuiteCount: planner.summary.smokeSuiteCount,
          releaseChainCount: planner.summary.releaseChainCount,
          confidence: planner.confidence,
          validationMode: planner.validationMode,
        },
        focusedPlanOnly: {
          executionMode: focusedPlanOnly.executionMode,
          focusedSelectedCount: focusedPlanOnly.selection.focusedSelectedCount,
          focusedDuplicateCommandCount: focusedPlanOnly.selection.focusedDuplicateCommandCount,
          selectedStepCount: focusedPlanOnly.selection.selectedStepCount,
        },
        appJsxPlanOnly: {
          executionMode: fullChainPlanOnly.executionMode,
          selectedStepCount: fullChainPlanOnly.selection.selectedStepCount,
          fallbackReasons: fullChainPlanOnly.selection.fallbackReasons,
        },
        unknownPlanOnly: {
          executionMode: unknownPlanOnly.executionMode,
          selectedStepCount: unknownPlanOnly.selection.selectedStepCount,
          fallbackReasons: unknownPlanOnly.selection.fallbackReasons,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
