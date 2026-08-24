#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
  assertChangeImpactRegistryV1Shape,
  buildChangeImpactRegistryV1,
  buildChangeImpactRegistryV1Summary,
  CHANGE_IMPACT_CANONICAL_OWNER_REFERENCES,
  CHANGE_IMPACT_REGISTRY_V1_BY_PATH,
  CHANGE_IMPACT_REGISTRY_V1_PATHS,
  CHANGE_IMPACT_VALID_CURRENT_HEAD_POLICY_STATES,
  CHANGE_IMPACT_VALID_DOMAINS,
  CHANGE_IMPACT_VALID_OWNER_CATEGORIES,
  CHANGE_IMPACT_VALID_PROTECTION_CLASSES,
  CHANGE_IMPACT_VALID_SMOKE_SUITES,
  getChangeImpactForPath,
  getIdentityOwner,
  getIdentityOwnerCategory,
  getImpactDomain,
  getImpactLevel,
  getImpactSmokeSuites,
  isChangeImpactPath,
} from "./lib/changeImpactRegistryV1.js";
import { buildPremiumSmokeEvidenceSourceFiles } from "./lib/guardSmokeEvidence.js";
import {
  CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF,
  CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_PATHS,
} from "./lib/currentHeadScopePolicy.js";
import { getCanonicalProvenanceRecord } from "./lib/canonicalProvenanceRegistry.js";
import { isAppJsxRoleTenantScopePath, repoRoot } from "./lib/guardGitScope.js";

const PILOT_VERSION = "step-1a-hot-identity-pilot";
const PILOT_SOURCE_PATHS = Object.freeze([...CHANGE_IMPACT_REGISTRY_V1_PATHS]);
const SMOKE_RUNNER_PATHS = Object.freeze({
  MOBILE_ALL_ROLES: "backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs",
  ALL_PANELS: "backend/scripts/ux_all_panels_reality_audit_01.mjs",
  PREMIUM: "backend/scripts/ux_live_panel_premium_smoke_01.mjs",
  PRODUCT_FLOW: "backend/scripts/product_flow_button_audit_01.mjs",
});

const CURRENT_HEAD_APPROVED_PATH_SET = new Set(
  CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_PATHS.map((relPath) => normalizePath(relPath)),
);
const CURRENT_HEAD_APPROVED_DIFF_MAP = new Map(
  CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF.map((entry) => [
    normalizePath(entry.path),
    String(entry.sha256 || "").trim().toUpperCase(),
  ]),
);

function normalizePath(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "")
    .trim();
}

function readText(relPath) {
  return fs.readFileSync(path.join(repoRoot, normalizePath(relPath)), "utf8");
}

function must(condition, label) {
  if (!condition) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
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

function formatCounts(counts = {}) {
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
}

function buildSmokeRunnerTexts() {
  return Object.freeze({
    MOBILE_ALL_ROLES: readText(SMOKE_RUNNER_PATHS.MOBILE_ALL_ROLES),
    ALL_PANELS: readText(SMOKE_RUNNER_PATHS.ALL_PANELS),
    PREMIUM: readText(SMOKE_RUNNER_PATHS.PREMIUM),
    PRODUCT_FLOW: readText(SMOKE_RUNNER_PATHS.PRODUCT_FLOW),
  });
}

function assertNoShaFields(record) {
  const shaKeys = Object.keys(record).filter((key) => /sha/i.test(key));
  must(shaKeys.length === 0, `${record.sourcePath} has no sha fields`);
}

function assertCurrentHeadState(record) {
  must(
    CHANGE_IMPACT_VALID_CURRENT_HEAD_POLICY_STATES.includes(record.currentHeadPolicyState),
    `${record.sourcePath} currentHeadPolicyState is valid`,
  );

  if (record.currentHeadPolicyState === "APPROVED") {
    must(
      CURRENT_HEAD_APPROVED_PATH_SET.has(record.sourcePath),
      `${record.sourcePath} is present in current-head approved path set`,
    );
    must(
      Boolean(CURRENT_HEAD_APPROVED_DIFF_MAP.get(record.sourcePath)),
      `${record.sourcePath} is present in current-head approved diff`,
    );
  } else {
    must(
      !CURRENT_HEAD_APPROVED_PATH_SET.has(record.sourcePath),
      `${record.sourcePath} is absent from current-head approved path set`,
    );
  }
}

function assertIdentityOwner(record) {
  must(
    CHANGE_IMPACT_VALID_OWNER_CATEGORIES.includes(record.identityOwnerCategory),
    `${record.sourcePath} identityOwnerCategory is valid`,
  );
  must(
    CHANGE_IMPACT_VALID_DOMAINS.includes(record.primaryDomain),
    `${record.sourcePath} primaryDomain is valid`,
  );
  must(
    CHANGE_IMPACT_VALID_PROTECTION_CLASSES.includes("DOMAIN_SEMANTIC"),
    `${record.sourcePath} protection class vocabulary is available`,
  );
  must(
    Array.isArray(record.protectionClasses) &&
      record.protectionClasses.every((value) => CHANGE_IMPACT_VALID_PROTECTION_CLASSES.includes(value)),
    `${record.sourcePath} protectionClasses are valid`,
  );
  must(
    Array.isArray(record.smokeSuites) &&
      record.smokeSuites.every((value) => CHANGE_IMPACT_VALID_SMOKE_SUITES.includes(value)),
    `${record.sourcePath} smokeSuites are valid`,
  );
  must(
    getChangeImpactForPath(record.sourcePath) !== null,
    `${record.sourcePath} resolves through the hot-identity registry`,
  );
  must(
    getImpactDomain(record.sourcePath) === record.primaryDomain,
    `${record.sourcePath} primaryDomain resolver matches`,
  );
  must(
    getIdentityOwnerCategory(record.sourcePath) === record.identityOwnerCategory,
    `${record.sourcePath} identityOwnerCategory resolver matches`,
  );
  must(
    getIdentityOwner(record.sourcePath) === record.identityOwnerRef,
    `${record.sourcePath} identityOwner resolver matches`,
  );
  must(
    getImpactLevel(record.sourcePath) === record.impactLevel,
    `${record.sourcePath} impactLevel resolver matches`,
  );
  must(
    JSON.stringify(getImpactSmokeSuites(record.sourcePath)) === JSON.stringify(record.smokeSuites),
    `${record.sourcePath} smoke suite resolver matches`,
  );
}

function assertAppJsxOwnership(record) {
  must(record.sourcePath === "web/src/App.jsx", "App.jsx canonical row selected");
  must(
    record.identityOwnerCategory === "ROLE_TENANT_SECURITY_OWNED",
    "App.jsx row keeps role/tenant security ownership",
  );
  must(
    record.identityOwnerRef === CHANGE_IMPACT_CANONICAL_OWNER_REFERENCES.ROLE_TENANT_SECURITY_OWNED,
    "App.jsx row keeps canonical owner reference",
  );
  must(
    isAppJsxRoleTenantScopePath("web/src/App.jsx") === true,
    "App.jsx exact owner helper accepts canonical path",
  );
  must(
    isAppJsxRoleTenantScopePath("web/src/AppShell.jsx") === false,
    "App.jsx exact owner helper rejects unrelated web source",
  );
}

function assertCurrentHeadApprovedOwner(record) {
  must(
    record.identityOwnerCategory === "CURRENT_HEAD_APPROVED_DIFF",
    `${record.sourcePath} remains current-head approved`,
  );
  must(
    record.identityOwnerRef === CHANGE_IMPACT_CANONICAL_OWNER_REFERENCES.CURRENT_HEAD_APPROVED_DIFF,
    `${record.sourcePath} keeps current-head approved owner reference`,
  );
  must(
    record.currentHeadPolicyState === "APPROVED",
    `${record.sourcePath} stays approved by current-head policy`,
  );
  must(
    /^([A-F0-9]{64})$/.test(CURRENT_HEAD_APPROVED_DIFF_MAP.get(record.sourcePath) || ""),
    `${record.sourcePath} current-head sha stays well formed`,
  );
}

function assertCanonicalProvenanceOwner(record) {
  const provenanceRecord = getCanonicalProvenanceRecord(record.sourcePath);
  must(Boolean(provenanceRecord), `${record.sourcePath} canonical provenance record exists`);
  must(
    record.identityOwnerCategory === "CANONICAL_PROVENANCE_OWNED",
    `${record.sourcePath} keeps canonical provenance ownership`,
  );
  must(
    record.identityOwnerRef === CHANGE_IMPACT_CANONICAL_OWNER_REFERENCES.CANONICAL_PROVENANCE_OWNED,
    `${record.sourcePath} keeps canonical provenance owner reference`,
  );
  must(
    provenanceRecord.currentHeadPolicyState === "ABSENT",
    `${record.sourcePath} canonical provenance stays absent from current-head policy`,
  );
  must(
    provenanceRecord.provenanceClass === "LEGITIMATE_CANONICAL_NEW_FILE",
    `${record.sourcePath} stays a legitimate canonical new file`,
  );
}

function assertMissingOwner(record) {
  must(record.identityOwnerCategory === "IDENTITY_OWNER_MISSING", `${record.sourcePath} keeps explicit missing owner status`);
  must(record.identityOwnerRef === null, `${record.sourcePath} missing owner does not invent a ref`);
  must(
    getCanonicalProvenanceRecord(record.sourcePath) === null,
    `${record.sourcePath} has no canonical provenance record`,
  );
}

function assertSmokeCoverage(record, runnerTexts, premiumSmokeSourceFiles) {
  const pathText = record.sourcePath;
  const allowedDirectSuites = new Set(record.smokeSuites);
  const runnerEntries = Object.entries(runnerTexts);

  for (const [runnerName, text] of runnerEntries) {
    const shouldAppearDirectly = pathText === "web/src/App.jsx" && runnerName === "MOBILE_ALL_ROLES";

    if (shouldAppearDirectly) {
      must(text.includes(pathText), `${pathText} appears directly in ${runnerName} smoke identity`);
    } else {
      must(!text.includes(pathText), `${pathText} stays out of ${runnerName} smoke identity`);
    }
  }

  if (pathText === "web/src/App.jsx") {
    must(
      runnerTexts.ALL_PANELS.includes("UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01"),
      "App.jsx all-panels runner inherits the mobile audit identity",
    );
    must(
      runnerTexts.ALL_PANELS.includes("buildSmokeEvidenceIdentity"),
      "App.jsx all-panels runner derives smoke evidence identity",
    );
    must(allowedDirectSuites.has("MOBILE_ALL_ROLES"), "App.jsx records MOBILE_ALL_ROLES as a direct smoke suite");
    must(allowedDirectSuites.has("ALL_PANELS"), "App.jsx records ALL_PANELS as a derived smoke suite");
  }

  if (pathText === "backend/src/routes/commercialCore.js" || pathText === "backend/src/routes/trustQuality.js") {
    must(
      premiumSmokeSourceFiles.has(pathText),
      `${pathText} is part of the premium smoke source-file contract`,
    );
    must(
      runnerTexts.PREMIUM.includes("buildPremiumSmokeEvidenceSourceFiles"),
      "premium runner delegates source identity ownership to the helper",
    );
    must(allowedDirectSuites.has("PREMIUM"), `${pathText} records PREMIUM as a direct smoke suite`);
  }
}

function assertPilotRow(record, runnerTexts, premiumSmokeSourceFiles) {
  assertNoShaFields(record);
  assertIdentityOwner(record);
  assertCurrentHeadState(record);

  if (record.sourcePath === "web/src/App.jsx") {
    assertAppJsxOwnership(record);
  } else if (
    record.sourcePath === "backend/src/routes/commercialCore.js" ||
    record.sourcePath === "backend/src/routes/trustQuality.js" ||
    record.sourcePath === "backend/src/routes/shifts/company.js" ||
    record.sourcePath === "backend/src/routes/companyOverview.js" ||
    record.sourcePath === "backend/src/routes/auth.js"
  ) {
    assertCurrentHeadApprovedOwner(record);
  } else if (record.sourcePath === "backend/src/lib/requestUrl.js") {
    assertCanonicalProvenanceOwner(record);
  } else if (record.sourcePath === "backend/src/ai/service.js") {
    assertMissingOwner(record);
  }

  assertSmokeCoverage(record, runnerTexts, premiumSmokeSourceFiles);
}

function assertNegativeSensitivity(registryRecords) {
  const first = registryRecords[0];

  expectFailure(
    "duplicate row is rejected",
    () =>
      assertChangeImpactRegistryV1Shape([
        first,
        { ...first },
        ...registryRecords.slice(2),
      ]),
    "duplicate path",
  );

  expectFailure(
    "invalid domain is rejected",
    () =>
      assertChangeImpactRegistryV1Shape([
        {
          ...first,
          primaryDomain: "BROKEN_DOMAIN",
        },
        ...registryRecords.slice(1),
      ]),
    "invalid primaryDomain",
  );

  expectFailure(
    "invalid smoke suite is rejected",
    () =>
      assertChangeImpactRegistryV1Shape([
        {
          ...first,
          smokeSuites: ["BROKEN_SUITE"],
        },
        ...registryRecords.slice(1),
      ]),
    "invalid value BROKEN_SUITE",
  );

  expectFailure(
    "copied sha field is rejected",
    () =>
      assertChangeImpactRegistryV1Shape([
        {
          ...first,
          sha256: "BADC0FFEEBADC0FFEEBADC0FFEEBADC0FFEEBADC0FFEEBADC0FFEEBADC0FFEE",
        },
        ...registryRecords.slice(1),
      ]),
    "sha field is forbidden",
  );

  expectFailure(
    "missing owner on a resolved source is rejected",
    () =>
      assertChangeImpactRegistryV1Shape([
        {
          ...first,
          identityOwnerRef: null,
        },
        ...registryRecords.slice(1),
      ]),
    "identityOwnerRef mismatch",
  );

  must(
    getChangeImpactForPath("backend/src/routes/unknown.js") === null,
    "unknown path is fail-closed",
  );
  must(
    isChangeImpactPath("backend/src/routes/unknown.js") === false,
    "unknown path is not treated as a hot-identity source",
  );
}

function assertSummary(summary) {
  must(summary.version === PILOT_VERSION, "registry version is step-1a-hot-identity-pilot");
  must(summary.count === 8, "pilot registry has exactly 8 rows");
  must(summary.resolvedOwnerCount === 7, "resolved owner count is 7");
  must(summary.missingOwnerCount === 1, "missing owner count is 1");
  must(summary.fullReleaseCount === 3, "full release count is 3");
  must(summary.identityOwnerCategoryCounts.ROLE_TENANT_SECURITY_OWNED === 1, "role/tenant owner count is 1");
  must(summary.identityOwnerCategoryCounts.CURRENT_HEAD_APPROVED_DIFF === 5, "current-head owner count is 5");
  must(summary.identityOwnerCategoryCounts.CANONICAL_PROVENANCE_OWNED === 1, "canonical provenance owner count is 1");
  must(summary.identityOwnerCategoryCounts.IDENTITY_OWNER_MISSING === 1, "missing owner count by category is 1");
  must(summary.currentHeadPolicyCounts.APPROVED === 5, "current-head APPROVED count is 5");
  must(summary.currentHeadPolicyCounts.ABSENT === 3, "current-head ABSENT count is 3");
  must(summary.impactLevelCounts["2"] === 5, "impact level 2 count is 5");
  must(summary.impactLevelCounts["3"] === 3, "impact level 3 count is 3");
  must(summary.smokeSuiteCounts.MOBILE_ALL_ROLES === 1, "MOBILE_ALL_ROLES smoke count is 1");
  must(summary.smokeSuiteCounts.ALL_PANELS === 1, "ALL_PANELS smoke count is 1");
  must(summary.smokeSuiteCounts.PREMIUM === 2, "PREMIUM smoke count is 2");

  const expectedDomainCounts = {
    AUTH: 1,
    AI_SEFER_ABI: 1,
    COMPANY: 1,
    FINANCE_PAYMENT: 1,
    QUALITY: 1,
    SHIFT: 1,
    TOOLING: 1,
    WEB_SHELL: 1,
  };

  for (const [domain, count] of Object.entries(expectedDomainCounts)) {
    must(summary.domainCounts[domain] === count, `${domain} domain count is ${count}`);
  }
}

function printLookup(record) {
  const smokeSuites = record.smokeSuites.length > 0 ? record.smokeSuites.join("|") : "NONE";
  const ownerRef = record.identityOwnerRef ?? "null";
  console.log(
    [
      "LOOKUP",
      record.sourcePath,
      `domain=${record.primaryDomain}`,
      `ownerCategory=${record.identityOwnerCategory}`,
      `ownerRef=${ownerRef}`,
      `currentHead=${record.currentHeadPolicyState}`,
      `impactLevel=${record.impactLevel}`,
      `smoke=${smokeSuites}`,
    ].join(" "),
  );
}

function main() {
  console.log("=== CHANGE-IMPACT-REGISTRY-V1 CHECK START ===");

  const registry = buildChangeImpactRegistryV1();
  const summary = buildChangeImpactRegistryV1Summary(registry.records);
  const runnerTexts = buildSmokeRunnerTexts();
  const premiumSmokeSourceFiles = new Set(buildPremiumSmokeEvidenceSourceFiles());

  must(assertChangeImpactRegistryV1Shape() !== null, "registry shape is valid");
  must(registry.version === PILOT_VERSION, "pilot registry version matches");
  must(PILOT_SOURCE_PATHS.length === registry.records.length, "pilot registry path count matches");
  must(
    JSON.stringify(PILOT_SOURCE_PATHS) === JSON.stringify(registry.records.map((record) => record.sourcePath)),
    "pilot registry path order is stable",
  );
  must(
    new Set(CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_PATHS).size === CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_PATHS.length,
    "current-head approved path list is unique",
  );
  must(
    CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_PATHS.length === CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF.length,
    "current-head approved path/diff cardinality matches",
  );

  assertSummary(summary);

  for (const record of registry.records) {
    assertPilotRow(record, runnerTexts, premiumSmokeSourceFiles);
    printLookup(record);
  }

  assertNegativeSensitivity(registry.records);

  console.log(`summary.version=${summary.version}`);
  console.log(`summary.count=${summary.count}`);
  console.log(`summary.resolvedOwnerCount=${summary.resolvedOwnerCount}`);
  console.log(`summary.missingOwnerCount=${summary.missingOwnerCount}`);
  console.log(`summary.fullReleaseCount=${summary.fullReleaseCount}`);
  console.log(`summary.identityOwnerCategoryCounts=${formatCounts(summary.identityOwnerCategoryCounts)}`);
  console.log(`summary.currentHeadPolicyCounts=${formatCounts(summary.currentHeadPolicyCounts)}`);
  console.log(`summary.impactLevelCounts=${formatCounts(summary.impactLevelCounts)}`);
  console.log(`summary.smokeSuiteCounts=${formatCounts(summary.smokeSuiteCounts)}`);
  console.log(`summary.domainCounts=${formatCounts(summary.domainCounts)}`);
  console.log("PASS CHANGE-IMPACT-REGISTRY-V1");
}

main();
