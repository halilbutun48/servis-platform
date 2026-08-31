#!/usr/bin/env node

import { runStructuredScriptChain } from "./lib/guardRunnerContracts.js";
import { buildChangeImpactRegistryV1Summary, CHANGE_IMPACT_REGISTRY_V1_PATHS, getChangeImpactForPath } from "./lib/changeImpactRegistryV1.js";
import {
  buildCheckOwnershipRegistryV1,
  buildCheckOwnershipRegistryV1Summary,
} from "./lib/checkOwnershipRegistryV1.js";
import {
  assertImpactAwareValidationPlannerV1Shape,
  buildImpactAwareValidationPlannerV1,
} from "./lib/impactAwareValidationPlannerV1.js";
import { productExtensionsChecks } from "./lib/productExtensionsRegistry.js";

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

function expectPlan(plan, expected) {
  must(plan !== null && typeof plan === "object", `${expected.path} plan exists`);
  must(plan.sourcePath === expected.path, `${expected.path} sourcePath matches`);
  must(plan.status === expected.status, `${expected.path} status matches`);
  must(plan.confidence === expected.confidence, `${expected.path} confidence matches`);
  must(plan.fullChainRequired === expected.fullChainRequired, `${expected.path} fullChainRequired matches`);
  must(plan.validationMode === expected.validationMode, `${expected.path} validationMode matches`);
  must(plan.candidateCheckIds.length === expected.candidateCount, `${expected.path} candidate count matches`);
  must(plan.foundationSentinelIds.length === expected.foundationSentinelCount, `${expected.path} foundation count matches`);
  must(plan.releaseChains.length === expected.releaseChainCount, `${expected.path} release chain count matches`);
  if (expected.smokeSuites) {
    sameArray(plan.invalidatedSmokeSuites, expected.smokeSuites, `${expected.path} smoke suites`);
  }
  if (expected.foundationSentinels) {
    sameArray(plan.foundationSentinelIds, expected.foundationSentinels, `${expected.path} foundation sentinels`);
  }
  if (expected.reasons) {
    for (const reason of expected.reasons) {
      must(plan.reasons.includes(reason), `${expected.path} reason includes ${reason}`);
    }
  }
  if (expected.smokeRunnerCount != null) {
    must(plan.smokeRunnerCommands.length === expected.smokeRunnerCount, `${expected.path} smoke runner count matches`);
  }
}

async function main() {
  console.log("=== IMPACT-AWARE VALIDATION PLANNER V1 CHECK ===");

  const changeImpactSummary = buildChangeImpactRegistryV1Summary();
  const ownershipRegistry = buildCheckOwnershipRegistryV1();
  const ownershipSummary = buildCheckOwnershipRegistryV1Summary(ownershipRegistry.records);

  must(changeImpactSummary.count === 8, "change impact registry count is 8");
  must(changeImpactSummary.resolvedOwnerCount === 7, "change impact registry resolved owner count is 7");
  must(changeImpactSummary.missingOwnerCount === 1, "change impact registry missing owner count is 1");

  must(ownershipSummary.count === 202, "check ownership registry count is 202");
  must(ownershipSummary.checkerPathCount === 200, "check ownership registry unique checker path count is 200");
  must(ownershipSummary.multiStepCheckerCount === 2, "check ownership registry multi-step checker count is 2");
  must(ownershipSummary.missingPathResolutionCount === 0, "check ownership registry missing path resolution count is 0");
  must(ownershipSummary.manualOverrideCount === 0, "check ownership registry manual override count is 0");

  const pilotPlan = buildImpactAwareValidationPlannerV1(CHANGE_IMPACT_REGISTRY_V1_PATHS, {
    registryRecords: ownershipRegistry.records,
  });
  assertImpactAwareValidationPlannerV1Shape(pilotPlan, "pilot planner");

  console.log(
    JSON.stringify(
      {
        planner: {
          version: pilotPlan.version,
          changedPathCount: pilotPlan.summary.changedPathCount,
          unresolvedPathCount: pilotPlan.summary.unresolvedPathCount,
          planCount: pilotPlan.summary.planCount,
          candidateCheckCount: pilotPlan.summary.candidateCheckCount,
          globalCheckCount: pilotPlan.summary.globalCheckCount,
          domainCheckCount: pilotPlan.summary.domainCheckCount,
          mixedCheckCount: pilotPlan.summary.mixedCheckCount,
          foundationCheckCount: pilotPlan.summary.foundationCheckCount,
          foundationSentinelCount: pilotPlan.summary.foundationSentinelCount,
          smokeSuiteCount: pilotPlan.summary.smokeSuiteCount,
          releaseChainCount: pilotPlan.summary.releaseChainCount,
          confidence: pilotPlan.confidence,
          validationMode: pilotPlan.validationMode,
          releaseChains: pilotPlan.releaseChains,
          invalidatedSmokeSuites: pilotPlan.invalidatedSmokeSuites,
        },
        ownership: {
          count: ownershipSummary.count,
          checkerPathCount: ownershipSummary.checkerPathCount,
          multiStepCheckerCount: ownershipSummary.multiStepCheckerCount,
          global: ownershipSummary.derivedGlobalCount,
          domain: ownershipSummary.derivedDomainCount,
          mixed: ownershipSummary.derivedMixedCount,
        },
      },
      null,
      2,
    ),
  );

  sameArray(pilotPlan.changedPaths, [...CHANGE_IMPACT_REGISTRY_V1_PATHS], "pilot changed paths");
  must(pilotPlan.confidence === "DETERMINISTIC_FULL_CHAIN", "pilot plan confidence is deterministic full chain");
  must(pilotPlan.fullChainRequired === true, "pilot plan requires full chain");
  must(pilotPlan.validationMode === "FULL_CHAIN", "pilot plan validation mode is full chain");
  must(pilotPlan.focusable === false, "pilot plan is not focusable");
  must(pilotPlan.unresolvedPaths.length === 0, "pilot plan has no unresolved paths");
  must(pilotPlan.candidateCheckIds.length === 202, "pilot plan candidate check count is 202");
  must(pilotPlan.globalCheckIds.length === 24, "pilot plan global check count is 24");
  must(pilotPlan.domainCheckIds.length === 108, "pilot plan domain check count is 108");
  must(pilotPlan.mixedCheckIds.length === 70, "pilot plan mixed check count is 70");
  must(pilotPlan.foundationCheckIds.length === 42, "pilot plan foundation check count is 42");
  must(pilotPlan.foundationSentinelIds.length === 11, "pilot plan foundation sentinel count is 11");
  must(pilotPlan.invalidatedSmokeSuites.length === 3, "pilot plan smoke suite count is 3");
  must(pilotPlan.releaseChains.length === 1, "pilot plan release chain count is 1");
  sameArray(
    pilotPlan.invalidatedSmokeSuites,
    ["MOBILE_ALL_ROLES", "ALL_PANELS", "PREMIUM"],
    "pilot plan invalidated smoke suites",
  );
  sameArray(
    pilotPlan.releaseChains,
    ["npm run check:product-extensions"],
    "pilot plan release chains",
  );

  const modularSchemaPath = "backend/prisma/schema/tenant.prisma";
  const modularSchemaImpact = getChangeImpactForPath(modularSchemaPath);
  must(modularSchemaImpact?.identityModel === "prisma-schema-folder-modularization-01", "modular schema path resolves to #11 owner");
  const modularSchemaPlan = buildImpactAwareValidationPlannerV1([modularSchemaPath], {
    registryRecords: ownershipRegistry.records,
  });
  must(modularSchemaPlan.unresolvedPaths.length === 0, "modular schema path is resolved");
  must(modularSchemaPlan.fullChainRequired === true, "modular schema path requires full chain");
  must(modularSchemaPlan.foundationSentinelIds.includes("prisma-schema-modularization"), "modular schema path runs #11 checker");
  must(modularSchemaPlan.foundationSentinelIds.includes("prisma-generation-contract"), "modular schema path runs #10 generation contract");

  const planByPath = new Map(pilotPlan.plans.map((plan) => [plan.sourcePath, plan]));

  expectPlan(planByPath.get("web/src/App.jsx"), {
    path: "web/src/App.jsx",
    status: "RESOLVED",
    confidence: "DETERMINISTIC_FULL_CHAIN",
    fullChainRequired: true,
    validationMode: "FULL_CHAIN",
    candidateCount: 192,
    foundationSentinelCount: 11,
    releaseChainCount: 1,
    smokeSuites: ["MOBILE_ALL_ROLES", "ALL_PANELS"],
    smokeRunnerCount: 2,
    foundationSentinels: [
      "current-head",
      "provenance",
      "documentation-registry",
      "security",
      "audit",
      "role-data",
      "data-integrity",
      "quality-gate",
      "test-quality",
      "backend-lint",
      "web-lint",
    ],
  });

  expectPlan(planByPath.get("backend/src/routes/commercialCore.js"), {
    path: "backend/src/routes/commercialCore.js",
    status: "RESOLVED",
    confidence: "DETERMINISTIC_FULL_CHAIN",
    fullChainRequired: true,
    validationMode: "FULL_CHAIN",
    candidateCount: 188,
    foundationSentinelCount: 11,
    releaseChainCount: 1,
    smokeSuites: ["PREMIUM"],
    smokeRunnerCount: 1,
    foundationSentinels: [
      "current-head",
      "provenance",
      "documentation-registry",
      "security",
      "audit",
      "role-data",
      "data-integrity",
      "quality-gate",
      "test-quality",
      "backend-lint",
      "web-lint",
    ],
  });

  expectPlan(planByPath.get("backend/src/routes/trustQuality.js"), {
    path: "backend/src/routes/trustQuality.js",
    status: "RESOLVED",
    confidence: "DETERMINISTIC_FULL_CHAIN",
    fullChainRequired: true,
    validationMode: "FULL_CHAIN",
    candidateCount: 187,
    foundationSentinelCount: 11,
    releaseChainCount: 1,
    smokeSuites: ["PREMIUM"],
    smokeRunnerCount: 1,
    foundationSentinels: [
      "current-head",
      "provenance",
      "documentation-registry",
      "security",
      "audit",
      "role-data",
      "data-integrity",
      "quality-gate",
      "test-quality",
      "backend-lint",
      "web-lint",
    ],
  });

  expectPlan(planByPath.get("backend/src/routes/shifts/company.js"), {
    path: "backend/src/routes/shifts/company.js",
    status: "RESOLVED",
    confidence: "DETERMINISTIC_FOCUSED",
    fullChainRequired: false,
    validationMode: "FOCUSED_DRY_RUN",
    candidateCount: 184,
    foundationSentinelCount: 7,
    releaseChainCount: 0,
    foundationSentinels: [
      "current-head",
      "security",
      "audit",
      "role-data",
      "quality-gate",
      "test-quality",
      "backend-lint",
    ],
  });

  expectPlan(planByPath.get("backend/src/routes/companyOverview.js"), {
    path: "backend/src/routes/companyOverview.js",
    status: "RESOLVED",
    confidence: "DETERMINISTIC_FOCUSED",
    fullChainRequired: false,
    validationMode: "FOCUSED_DRY_RUN",
    candidateCount: 184,
    foundationSentinelCount: 7,
    releaseChainCount: 0,
    foundationSentinels: [
      "current-head",
      "security",
      "audit",
      "role-data",
      "quality-gate",
      "test-quality",
      "backend-lint",
    ],
  });

  expectPlan(planByPath.get("backend/src/routes/auth.js"), {
    path: "backend/src/routes/auth.js",
    status: "RESOLVED",
    confidence: "DETERMINISTIC_FOCUSED",
    fullChainRequired: false,
    validationMode: "FOCUSED_DRY_RUN",
    candidateCount: 190,
    foundationSentinelCount: 7,
    releaseChainCount: 0,
    foundationSentinels: [
      "current-head",
      "security",
      "audit",
      "role-data",
      "quality-gate",
      "test-quality",
      "backend-lint",
    ],
  });

  expectPlan(planByPath.get("backend/src/ai/service.js"), {
    path: "backend/src/ai/service.js",
    status: "RESOLVED",
    confidence: "DETERMINISTIC_FULL_CHAIN",
    fullChainRequired: true,
    validationMode: "FULL_CHAIN",
    candidateCount: 185,
    foundationSentinelCount: 11,
    releaseChainCount: 1,
    reasons: ["identity-owner-missing"],
    foundationSentinels: [
      "current-head",
      "provenance",
      "documentation-registry",
      "security",
      "audit",
      "role-data",
      "data-integrity",
      "quality-gate",
      "test-quality",
      "backend-lint",
      "web-lint",
    ],
  });

  expectPlan(planByPath.get("backend/src/lib/requestUrl.js"), {
    path: "backend/src/lib/requestUrl.js",
    status: "RESOLVED",
    confidence: "DETERMINISTIC_FOCUSED",
    fullChainRequired: false,
    validationMode: "FOCUSED_DRY_RUN",
    candidateCount: 192,
    foundationSentinelCount: 4,
    releaseChainCount: 0,
    foundationSentinels: ["provenance", "quality-gate", "test-quality", "backend-lint"],
  });

  const unknownPlan = buildImpactAwareValidationPlannerV1(["backend/src/does/not/exist.js"], {
    registryRecords: ownershipRegistry.records,
  });
  assertImpactAwareValidationPlannerV1Shape(unknownPlan, "unknown path plan");
  must(!Object.prototype.hasOwnProperty.call(unknownPlan, "status"), "unknown path plan does not expose top-level status");
  must(unknownPlan.confidence === "FAIL_CLOSED", "unknown path fails closed");
  must(unknownPlan.fullChainRequired === true, "unknown path requires full chain");
  must(unknownPlan.validationMode === "FULL_CHAIN", "unknown path validation mode is full chain");
  must(unknownPlan.unresolvedPaths.length === 1, "unknown path unresolved count is 1");
  must(unknownPlan.candidateCheckIds.length === 0, "unknown path has no candidate checks");
  must(unknownPlan.foundationSentinelIds.length === 11, "unknown path has full baseline sentinels");
  sameArray(
    unknownPlan.releaseChains,
    ["npm run check:product-extensions"],
    "unknown path release chains",
  );

  const dedupedPlan = buildImpactAwareValidationPlannerV1(
    ["backend/src/routes/auth.js", "web/src/App.jsx", "web/src/App.jsx"],
    {
      registryRecords: ownershipRegistry.records,
    },
  );
  assertImpactAwareValidationPlannerV1Shape(dedupedPlan, "deduped path plan");
  sameArray(
    dedupedPlan.changedPaths,
    ["backend/src/routes/auth.js", "web/src/App.jsx"],
    "deduped changed paths",
  );
  must(dedupedPlan.fullChainRequired === true, "deduped mixed plan still requires full chain");

  must(
    new Set(pilotPlan.candidateCheckIds).size === pilotPlan.candidateCheckIds.length,
    "pilot plan candidate check ids are unique",
  );
  must(
    new Set(pilotPlan.foundationCheckIds).size === pilotPlan.foundationCheckIds.length,
    "pilot plan foundation check ids are unique",
  );
  must(
    new Set(pilotPlan.foundationSentinelIds).size === pilotPlan.foundationSentinelIds.length,
    "pilot plan foundation sentinel ids are unique",
  );

  must(
    pilotPlan.candidateCheckIds.length === 202 &&
      pilotPlan.globalCheckIds.length === 24 &&
      pilotPlan.domainCheckIds.length === 108 &&
      pilotPlan.mixedCheckIds.length === 70 &&
      pilotPlan.foundationCheckIds.length === 42,
    "pilot plan aggregated checker counts stay stable",
  );

  const code = await runStructuredScriptChain(productExtensionsChecks, {
    label: "PRODUCT EXTENSIONS CHECK CHAIN",
  });
  if (code !== 0) {
    throw new Error(`FAIL product extensions chain: exit code ${code}`);
  }
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
