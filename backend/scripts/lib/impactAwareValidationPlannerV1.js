import {
  CHANGE_IMPACT_REGISTRY_V1_PATHS,
  getChangeImpactForPath,
} from "./changeImpactRegistryV1.js";
import {
  buildCheckOwnershipRegistryV1,
  getChecksForImpactMetadata,
} from "./checkOwnershipRegistryV1.js";

export const IMPACT_AWARE_VALIDATION_PLANNER_V1_VERSION = "step-2-impact-aware-validation-planner-pilot";

export const IMPACT_AWARE_VALIDATION_PLANNER_V1_SUPPORTED_PATHS = Object.freeze([...CHANGE_IMPACT_REGISTRY_V1_PATHS]);

const FOUNDATION_PROTECTION_CLASSES = Object.freeze([
  "GLOBAL_CURRENT_HEAD",
  "GLOBAL_PROVENANCE",
  "WORKTREE_HYGIENE",
  "SOURCE_IDENTITY",
  "SMOKE_EVIDENCE",
  "DATA_INTEGRITY",
  "DOCUMENTATION_TRACEABILITY",
  "QUALITY_GATE",
  "TOOLING_RUNTIME",
  "SECURITY_AUTH_TENANT",
]);

const TARGETED_FOUNDATION_COMMAND_RULES = Object.freeze([
  {
    id: "current-head",
    command: "node backend/scripts/current_head_scope_policy_01_check.js",
    reason: "current-head-owned change",
    matches: (impact) =>
      Boolean(impact) &&
      (impact.currentHeadPolicyState === "APPROVED" || impact.identityOwnerCategory === "CURRENT_HEAD_APPROVED_DIFF"),
  },
  {
    id: "provenance",
    command: "node backend/scripts/canonical_provenance_registry_01_check.js",
    reason: "canonical provenance-owned change",
    matches: (impact) => Boolean(impact) && impact.identityOwnerCategory === "CANONICAL_PROVENANCE_OWNED",
  },
  {
    id: "documentation-registry",
    command: "node backend/scripts/documentation_registry_v1_check.js",
    reason: "documentation registry-owned change",
    matches: (impact) => Boolean(impact) && impact.primaryDomain === "DOCS_REGISTRY",
  },
  {
    id: "security",
    command: "npm run check:securitykvkkfinal01",
    reason: "tenant/security-sensitive change",
    matches: (impact) =>
      Boolean(impact) &&
      (impact.identityOwnerCategory === "ROLE_TENANT_SECURITY_OWNED" ||
        impact.protectionClasses.includes("AUTH_TENANT") ||
        ["AUTH", "ADMIN", "PUBLIC"].includes(impact.primaryDomain)),
  },
  {
    id: "audit",
    command: "npm run check:auditlogandapprovaltrace01",
    reason: "tenant/audit-sensitive change",
    matches: (impact) =>
      Boolean(impact) &&
      (impact.identityOwnerCategory === "ROLE_TENANT_SECURITY_OWNED" ||
        impact.protectionClasses.includes("AUTH_TENANT") ||
        ["AUTH", "ADMIN", "PUBLIC"].includes(impact.primaryDomain)),
  },
  {
    id: "role-data",
    command: "npm run check:roledataisolationredteam01",
    reason: "role-data isolation-sensitive change",
    matches: (impact) =>
      Boolean(impact) &&
      (impact.identityOwnerCategory === "ROLE_TENANT_SECURITY_OWNED" ||
        impact.protectionClasses.includes("AUTH_TENANT") ||
        ["AUTH", "ADMIN", "PUBLIC"].includes(impact.primaryDomain)),
  },
  {
    id: "data-integrity",
    command: "npm run check:dataintegrityandrecovery01",
    reason: "runtime-data integrity-sensitive change",
    matches: (impact) =>
      Boolean(impact) &&
      (impact.primaryDomain === "RUNTIME_DATA" || impact.protectionClasses.includes("DATA_INTEGRITY")),
  },
  {
    id: "quality-gate",
    command: "npm run check:qualitygatefinal01",
    reason: "quality gate baseline",
    matches: (impact) => Boolean(impact),
  },
  {
    id: "test-quality",
    command: "npm run check:testqualityandflakeaudit01",
    reason: "test quality baseline",
    matches: (impact) => Boolean(impact),
  },
  {
    id: "backend-lint",
    command: "npm --prefix backend run lint",
    reason: "backend source change",
    matches: (impact) => Boolean(impact) && normalizePath(impact.sourcePath).startsWith("backend/"),
  },
  {
    id: "web-lint",
    command: "npm --prefix web run lint",
    reason: "web source change",
    matches: (impact) => Boolean(impact) && normalizePath(impact.sourcePath).startsWith("web/"),
  },
]);

const FULL_CHAIN_FOUNDATION_COMMANDS = Object.freeze(
  TARGETED_FOUNDATION_COMMAND_RULES.map(({ id, command, reason }) =>
    Object.freeze({
      id,
      command,
      reason: `full-chain baseline: ${reason}`,
    }),
  ),
);

const PRISMA_SCHEMA_FOUNDATION_COMMAND_RULES = Object.freeze([
  {
    id: "prisma-schema-modularization",
    command: "npm --prefix backend run prisma:modularization:check",
    reason: "canonical modular Prisma schema change",
    matches: (impact) => Boolean(impact) && impact.identityModel === "prisma-schema-folder-modularization-01",
  },
  {
    id: "prisma-generation-contract",
    command: "npm --prefix backend run prisma:verify",
    reason: "canonical Prisma generation and identity contract",
    matches: (impact) => Boolean(impact) && impact.identityModel === "prisma-schema-folder-modularization-01",
  },
]);

const SMOKE_SUITE_RUNNER_COMMANDS = Object.freeze({
  ALL_PANELS: "backend/scripts/ux_all_panels_reality_audit_01.mjs",
  MOBILE_ALL_ROLES: "backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs",
  PREMIUM: "backend/scripts/ux_live_panel_premium_smoke_01.mjs",
});

function normalizePath(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "")
    .trim();
}

function uniqueStrings(items) {
  return [...new Set((items || []).map((item) => String(item || "").trim()).filter(Boolean))];
}

function freezePlainObject(value) {
  return Object.freeze({ ...value });
}

function selectCandidateRecordsForImpact(impact, registryRecords) {
  return getChecksForImpactMetadata(impact, registryRecords);
}

function toOwnershipCheck(record) {
  return Object.freeze({
    checkId: record.checkId,
    productExtensionsStep: record.productExtensionsStep,
    checkerPath: record.checkerPath,
    primaryDomain: record.primaryDomain,
    protectionClass: record.protectionClass,
    scopeClass: record.scopeClass,
    costClass: record.costClass,
    negativeSensitivityOwner: record.negativeSensitivityOwner,
    semanticGroups: Object.freeze([...record.semanticGroups]),
  });
}

function isFoundationOwnershipRecord(record) {
  return record.scopeClass === "GLOBAL" || FOUNDATION_PROTECTION_CLASSES.includes(record.protectionClass);
}

function deriveFoundationSentinels(impact, { fullChainRequired = false } = {}) {
  if (!impact || fullChainRequired) {
    if (impact?.identityModel === "prisma-schema-folder-modularization-01") {
      return Object.freeze([
        ...FULL_CHAIN_FOUNDATION_COMMANDS,
        ...PRISMA_SCHEMA_FOUNDATION_COMMAND_RULES.map(({ id, command, reason }) =>
          Object.freeze({ id, command, reason }),
        ),
      ]);
    }
    return FULL_CHAIN_FOUNDATION_COMMANDS;
  }

  const results = [];
  const rules = impact?.identityModel === "prisma-schema-folder-modularization-01"
    ? [...TARGETED_FOUNDATION_COMMAND_RULES, ...PRISMA_SCHEMA_FOUNDATION_COMMAND_RULES]
    : TARGETED_FOUNDATION_COMMAND_RULES;
  for (const rule of rules) {
    if (rule.matches(impact)) {
      results.push(
        Object.freeze({
          id: rule.id,
          command: rule.command,
          reason: rule.reason,
        }),
      );
    }
  }

  return Object.freeze(results);
}

function deriveSmokeRunnerCommands(smokeSuites) {
  const commands = [];
  for (const suite of smokeSuites || []) {
    const command = SMOKE_SUITE_RUNNER_COMMANDS[suite];
    if (command) {
      commands.push(
        Object.freeze({
          suite,
          command,
        }),
      );
    }
  }
  return Object.freeze(commands);
}

function deriveValidationMode(fullChainRequired) {
  return fullChainRequired ? "FULL_CHAIN" : "FOCUSED_DRY_RUN";
}

function buildSinglePathPlan(sourcePath, registryRecords) {
  const normalizedPath = normalizePath(sourcePath);
  const impact = getChangeImpactForPath(normalizedPath) || null;
  const resolved = Boolean(impact);
  const reasons = [];

  if (!resolved) {
    reasons.push("path-not-in-change-impact-registry");
  } else {
    if (impact.identityOwnerCategory === "IDENTITY_OWNER_MISSING") {
      reasons.push("identity-owner-missing");
    }
    if (impact.smokeSuites.length > 0) {
      reasons.push(`smoke-suite-invalidated:${impact.smokeSuites.join(",")}`);
    }
    if (impact.requiresFullRelease) {
      reasons.push("requires-full-release");
    }
  }

  const candidateSelection = resolved ? selectCandidateRecordsForImpact(impact, registryRecords) : null;
  const candidateChecks = Object.freeze(
    (candidateSelection?.records || []).map((record) => toOwnershipCheck(record)),
  );
  const globalChecks = Object.freeze(
    (candidateSelection?.globalRecords || []).map((record) => toOwnershipCheck(record)),
  );
  const domainChecks = Object.freeze(
    (candidateSelection?.domainRecords || []).map((record) => toOwnershipCheck(record)),
  );
  const mixedChecks = Object.freeze(
    (candidateSelection?.mixedRecords || []).map((record) => toOwnershipCheck(record)),
  );
  const foundationChecks = Object.freeze(
    candidateChecks.filter(
      (record) =>
        record.scopeClass === "GLOBAL" || FOUNDATION_PROTECTION_CLASSES.includes(record.protectionClass),
    ),
  );
  const fullChainRequired =
    !resolved || impact.identityOwnerCategory === "IDENTITY_OWNER_MISSING" || impact.smokeSuites.length > 0 || impact.requiresFullRelease;
  const foundationSentinels = deriveFoundationSentinels(impact, { fullChainRequired });
  const smokeRunnerCommands = resolved ? deriveSmokeRunnerCommands(impact.smokeSuites) : Object.freeze([]);

  const candidateCheckIds = uniqueStrings(candidateChecks.map((record) => record.checkId));
  const globalCheckIds = uniqueStrings(globalChecks.map((record) => record.checkId));
  const domainCheckIds = uniqueStrings(domainChecks.map((record) => record.checkId));
  const mixedCheckIds = uniqueStrings(mixedChecks.map((record) => record.checkId));
  const foundationCheckIds = uniqueStrings(foundationChecks.map((record) => record.checkId));
  const foundationSentinelIds = uniqueStrings(foundationSentinels.map((record) => record.id));

  const confidence = !resolved
    ? "FAIL_CLOSED"
    : fullChainRequired
      ? "DETERMINISTIC_FULL_CHAIN"
      : "DETERMINISTIC_FOCUSED";

  return Object.freeze({
    sourcePath: normalizedPath,
    status: resolved ? "RESOLVED" : "UNRESOLVED",
    confidence,
    fullChainRequired,
    validationMode: deriveValidationMode(fullChainRequired),
    reasons: Object.freeze(reasons),
    impact: resolved
      ? freezePlainObject({
          sourcePath: impact.sourcePath,
          primaryDomain: impact.primaryDomain,
          secondaryDomains: Object.freeze([...impact.secondaryDomains]),
          identityOwnerCategory: impact.identityOwnerCategory,
          identityOwnerRef: impact.identityOwnerRef,
          identityModel: impact.identityModel,
          currentHeadPolicyState: impact.currentHeadPolicyState,
          protectionClasses: Object.freeze([...impact.protectionClasses]),
          semanticOwnerGroups: Object.freeze([...impact.semanticOwnerGroups]),
          smokeSuites: Object.freeze([...impact.smokeSuites]),
          impactLevel: impact.impactLevel,
          requiresFullRelease: impact.requiresFullRelease,
          notes: impact.notes,
        })
      : null,
    queryTags: Object.freeze(candidateSelection?.queryTags ? [...candidateSelection.queryTags] : []),
    candidateChecks,
    globalChecks,
    domainChecks,
    mixedChecks,
    foundationChecks,
    foundationSentinels,
    smokeRunnerCommands,
    releaseChains: Object.freeze(fullChainRequired ? ["npm run check:product-extensions"] : []),
    summary: Object.freeze({
      candidateCheckCount: candidateChecks.length,
      globalCheckCount: globalChecks.length,
      domainCheckCount: domainChecks.length,
      mixedCheckCount: mixedChecks.length,
      foundationCheckCount: foundationChecks.length,
      foundationSentinelCount: foundationSentinels.length,
      smokeRunnerCount: smokeRunnerCommands.length,
      smokeSuiteCount: resolved ? impact.smokeSuites.length : 0,
    }),
    candidateCheckIds,
    globalCheckIds,
    domainCheckIds,
    mixedCheckIds,
    foundationCheckIds,
    foundationSentinelIds,
    invalidatedSmokeSuites: Object.freeze(resolved ? [...impact.smokeSuites] : []),
  });
}

function normalizeChangedPaths(changedPaths) {
  if (!Array.isArray(changedPaths)) {
    return {
      normalizedPaths: [],
      invalidInputs: ["[non-array input]"],
    };
  }

  const normalized = [];
  const invalidInputs = [];

  for (const value of changedPaths) {
    const normalizedPath = normalizePath(value);
    if (!normalizedPath) {
      invalidInputs.push(String(value));
      continue;
    }
    normalized.push(normalizedPath);
  }

  return {
    normalizedPaths: uniqueStrings(normalized),
    invalidInputs: uniqueStrings(invalidInputs),
  };
}

export function buildImpactAwareValidationPlannerV1(changedPaths = [], { registryRecords = null } = {}) {
  const ownershipRegistry = registryRecords || buildCheckOwnershipRegistryV1().records;
  const { normalizedPaths, invalidInputs } = normalizeChangedPaths(changedPaths);
  const plans = normalizedPaths.map((sourcePath) => buildSinglePathPlan(sourcePath, ownershipRegistry));
  const unresolvedPlans = plans.filter((plan) => plan.status === "UNRESOLVED");
  const allCandidateCheckIds = uniqueStrings(plans.flatMap((plan) => plan.candidateCheckIds));
  const allGlobalCheckIds = uniqueStrings(plans.flatMap((plan) => plan.globalCheckIds));
  const allDomainCheckIds = uniqueStrings(plans.flatMap((plan) => plan.domainCheckIds));
  const allMixedCheckIds = uniqueStrings(plans.flatMap((plan) => plan.mixedCheckIds));
  const allFoundationCheckIds = uniqueStrings(plans.flatMap((plan) => plan.foundationCheckIds));
  const allFoundationSentinelIds = uniqueStrings(plans.flatMap((plan) => plan.foundationSentinelIds));
  const allSmokeSuites = uniqueStrings(plans.flatMap((plan) => plan.invalidatedSmokeSuites));
  const allReleaseChains = uniqueStrings(plans.flatMap((plan) => plan.releaseChains));
  const fullChainRequired = plans.some((plan) => plan.fullChainRequired) || invalidInputs.length > 0;
  const confidence = invalidInputs.length > 0 || unresolvedPlans.length > 0
    ? "FAIL_CLOSED"
    : fullChainRequired
      ? "DETERMINISTIC_FULL_CHAIN"
      : "DETERMINISTIC_FOCUSED";

  return Object.freeze({
    version: IMPACT_AWARE_VALIDATION_PLANNER_V1_VERSION,
    changedPaths: Object.freeze([...normalizedPaths]),
    invalidInputs: Object.freeze([...invalidInputs]),
    plans: Object.freeze(plans),
    unresolvedPaths: Object.freeze(unresolvedPlans.map((plan) => plan.sourcePath)),
    confidence,
    fullChainRequired,
    validationMode: deriveValidationMode(fullChainRequired),
    focusable: confidence === "DETERMINISTIC_FOCUSED",
    candidateCheckIds: Object.freeze(allCandidateCheckIds),
    globalCheckIds: Object.freeze(allGlobalCheckIds),
    domainCheckIds: Object.freeze(allDomainCheckIds),
    mixedCheckIds: Object.freeze(allMixedCheckIds),
    foundationCheckIds: Object.freeze(allFoundationCheckIds),
    foundationSentinelIds: Object.freeze(allFoundationSentinelIds),
    invalidatedSmokeSuites: Object.freeze(allSmokeSuites),
    releaseChains: Object.freeze(allReleaseChains),
    summary: Object.freeze({
      changedPathCount: normalizedPaths.length,
      unresolvedPathCount: unresolvedPlans.length,
      planCount: plans.length,
      candidateCheckCount: allCandidateCheckIds.length,
      globalCheckCount: allGlobalCheckIds.length,
      domainCheckCount: allDomainCheckIds.length,
      mixedCheckCount: allMixedCheckIds.length,
      foundationCheckCount: allFoundationCheckIds.length,
      foundationSentinelCount: allFoundationSentinelIds.length,
      smokeSuiteCount: allSmokeSuites.length,
      releaseChainCount: allReleaseChains.length,
    }),
  });
}

function assertNoShaFields(value, label) {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      assertNoShaFields(item, `${label}[${index}]`);
    }
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (/sha/i.test(key)) {
      throw new Error(`FAIL ${label}: sha field is forbidden (${key})`);
    }
    assertNoShaFields(nestedValue, `${label}.${key}`);
  }
}

export function assertImpactAwareValidationPlannerV1Shape(plan, label = "impact aware validation planner v1") {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    throw new Error(`FAIL ${label}: plan is not an object`);
  }

  if (plan.version !== IMPACT_AWARE_VALIDATION_PLANNER_V1_VERSION) {
    throw new Error(`FAIL ${label}: version mismatch`);
  }
  if (!Array.isArray(plan.changedPaths)) {
    throw new Error(`FAIL ${label}: changedPaths is not an array`);
  }
  if (!Array.isArray(plan.invalidInputs)) {
    throw new Error(`FAIL ${label}: invalidInputs is not an array`);
  }
  if (!Array.isArray(plan.plans)) {
    throw new Error(`FAIL ${label}: plans is not an array`);
  }
  if (!Array.isArray(plan.unresolvedPaths)) {
    throw new Error(`FAIL ${label}: unresolvedPaths is not an array`);
  }
  if (!Array.isArray(plan.candidateCheckIds)) {
    throw new Error(`FAIL ${label}: candidateCheckIds is not an array`);
  }
  if (!Array.isArray(plan.globalCheckIds)) {
    throw new Error(`FAIL ${label}: globalCheckIds is not an array`);
  }
  if (!Array.isArray(plan.domainCheckIds)) {
    throw new Error(`FAIL ${label}: domainCheckIds is not an array`);
  }
  if (!Array.isArray(plan.mixedCheckIds)) {
    throw new Error(`FAIL ${label}: mixedCheckIds is not an array`);
  }
  if (!Array.isArray(plan.foundationCheckIds)) {
    throw new Error(`FAIL ${label}: foundationCheckIds is not an array`);
  }
  if (!Array.isArray(plan.foundationSentinelIds)) {
    throw new Error(`FAIL ${label}: foundationSentinelIds is not an array`);
  }
  if (!Array.isArray(plan.invalidatedSmokeSuites)) {
    throw new Error(`FAIL ${label}: invalidatedSmokeSuites is not an array`);
  }
  if (!Array.isArray(plan.releaseChains)) {
    throw new Error(`FAIL ${label}: releaseChains is not an array`);
  }
  if (!plan.summary || typeof plan.summary !== "object" || Array.isArray(plan.summary)) {
    throw new Error(`FAIL ${label}: summary is not an object`);
  }

  if (plan.fullChainRequired !== (plan.validationMode === "FULL_CHAIN")) {
    throw new Error(`FAIL ${label}: validationMode mismatch`);
  }
  if (plan.focusable !== (plan.validationMode === "FOCUSED_DRY_RUN")) {
    throw new Error(`FAIL ${label}: focusable mismatch`);
  }

  if (plan.fullChainRequired && plan.releaseChains.length === 0) {
    throw new Error(`FAIL ${label}: full-chain plan missing releaseChains`);
  }
  if (!plan.fullChainRequired && plan.releaseChains.length > 0) {
    throw new Error(`FAIL ${label}: focused plan must not expose releaseChains`);
  }

  if (plan.invalidInputs.length > 0 && plan.confidence !== "FAIL_CLOSED") {
    throw new Error(`FAIL ${label}: invalid input must fail closed`);
  }

  assertNoShaFields(plan, label);

  for (const [index, subPlan] of plan.plans.entries()) {
    const subLabel = `${label}.plans[${index}]`;
    if (!subPlan || typeof subPlan !== "object" || Array.isArray(subPlan)) {
      throw new Error(`FAIL ${subLabel}: plan is not an object`);
    }
    if (!Array.isArray(subPlan.candidateChecks)) {
      throw new Error(`FAIL ${subLabel}: candidateChecks is not an array`);
    }
    if (!Array.isArray(subPlan.foundationSentinels)) {
      throw new Error(`FAIL ${subLabel}: foundationSentinels is not an array`);
    }
    if (!Array.isArray(subPlan.smokeRunnerCommands)) {
      throw new Error(`FAIL ${subLabel}: smokeRunnerCommands is not an array`);
    }
    if (!Array.isArray(subPlan.releaseChains)) {
      throw new Error(`FAIL ${subLabel}: releaseChains is not an array`);
    }
    if (!Array.isArray(subPlan.invalidatedSmokeSuites)) {
      throw new Error(`FAIL ${subLabel}: invalidatedSmokeSuites is not an array`);
    }
    if (!Array.isArray(subPlan.globalChecks)) {
      throw new Error(`FAIL ${subLabel}: globalChecks is not an array`);
    }
    if (!Array.isArray(subPlan.domainChecks)) {
      throw new Error(`FAIL ${subLabel}: domainChecks is not an array`);
    }
    if (!Array.isArray(subPlan.mixedChecks)) {
      throw new Error(`FAIL ${subLabel}: mixedChecks is not an array`);
    }
    if (!Array.isArray(subPlan.foundationChecks)) {
      throw new Error(`FAIL ${subLabel}: foundationChecks is not an array`);
    }
    if (!Array.isArray(subPlan.candidateCheckIds)) {
      throw new Error(`FAIL ${subLabel}: candidateCheckIds is not an array`);
    }
  }

  return Object.freeze(plan);
}

export function buildImpactAwareValidationPlannerV1FromCurrentRegistry(changedPaths = []) {
  return buildImpactAwareValidationPlannerV1(changedPaths, {
    registryRecords: buildCheckOwnershipRegistryV1().records,
  });
}
