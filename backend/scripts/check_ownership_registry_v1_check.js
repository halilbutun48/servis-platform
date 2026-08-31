#!/usr/bin/env node

import {
  CHANGE_IMPACT_REGISTRY_V1_BY_PATH,
  buildChangeImpactRegistryV1Summary,
} from "./lib/changeImpactRegistryV1.js";
import {
  assertCheckOwnershipRegistryV1Shape,
  buildCheckOwnershipRegistryV1,
  buildCheckOwnershipRegistryV1Summary,
  getCheckOwnershipForId,
  getCheckOwnershipForStep,
  getChecksForImpactMetadata,
} from "./lib/checkOwnershipRegistryV1.js";

function pass(label, details = "") {
  console.log(details ? `PASS ${label} :: ${details}` : `PASS ${label}`);
}

function fail(label, details) {
  throw new Error(details instanceof Error ? `FAIL ${label}: ${details.message}` : `FAIL ${label}: ${details}`);
}

function expectFailure(label, fn, expectedFragment = null) {
  try {
    fn();
  } catch (err) {
    const message = String(err?.message || err);
    if (!message.startsWith("FAIL ")) {
      throw err;
    }
    if (expectedFragment && !message.includes(expectedFragment)) {
      throw new Error(`FAIL ${label}: expected "${expectedFragment}" in "${message}"`);
    }
    pass(label, message);
    return;
  }

  throw new Error(`FAIL ${label}: expected failure`);
}

function cloneRecord(record) {
  const cloned = { ...record };
  if (Array.isArray(record.secondaryDomains)) {
    cloned.secondaryDomains = [...record.secondaryDomains];
  }
  if (Array.isArray(record.semanticGroups)) {
    cloned.semanticGroups = [...record.semanticGroups];
  }
  return cloned;
}

function cloneRecords(records) {
  return records.map((record) => cloneRecord(record));
}

function pickRecord(byCheckId, candidates, label) {
  for (const candidate of candidates) {
    const record = byCheckId[candidate];
    if (record) {
      return record;
    }
  }

  throw new Error(`FAIL ${label}: no candidate resolved (${candidates.join(", ")})`);
}

function printLookup(label, record) {
  console.log(
    `LOOKUP ${label} :: ${JSON.stringify({
      checkId: record.checkId,
      step: record.productExtensionsStep,
      path: record.checkerPath,
      domain: record.primaryDomain,
      protectionClass: record.protectionClass,
      scopeClass: record.scopeClass,
      costClass: record.costClass,
      negativeSensitivityOwner: record.negativeSensitivityOwner,
    })}`,
  );
}

function main() {
  console.log("=== CHECK OWNERSHIP REGISTRY V1 CHECK ===");

  const registry = buildCheckOwnershipRegistryV1();
  const summary = buildCheckOwnershipRegistryV1Summary(registry.records);
  const changeImpactSummary = buildChangeImpactRegistryV1Summary();

  if (summary.count !== 202) {
    fail("baseline count", `expected 202, got ${summary.count}`);
  }
  if (summary.missingPathResolutionCount !== 0) {
    fail("baseline resolution", `expected 0 missing paths, got ${summary.missingPathResolutionCount}`);
  }
  if (summary.manualOverrideCount !== 0 || summary.manualOverridePct !== 0) {
    fail("baseline manual overrides", `expected 0, got count=${summary.manualOverrideCount} pct=${summary.manualOverridePct}`);
  }
  if (summary.derivedGlobalCount + summary.derivedDomainCount + summary.derivedMixedCount !== summary.count) {
    fail("baseline scope counts", "scope counts do not add up to total");
  }

  if (changeImpactSummary.count !== 8 || changeImpactSummary.resolvedOwnerCount !== 7 || changeImpactSummary.missingOwnerCount !== 1) {
    fail(
      "step-1a baseline",
      `expected 8/7/1, got ${changeImpactSummary.count}/${changeImpactSummary.resolvedOwnerCount}/${changeImpactSummary.missingOwnerCount}`,
    );
  }

  console.log(
    JSON.stringify(
      {
        checkOwnership: {
          version: summary.version,
          count: summary.count,
          checkerPathCount: summary.checkerPathCount,
          multiStepCheckerCount: summary.multiStepCheckerCount,
          missingPathResolutionCount: summary.missingPathResolutionCount,
          nonJsCheckCount: summary.nonJsCheckCount,
          manualOverrideCount: summary.manualOverrideCount,
          manualOverridePct: summary.manualOverridePct,
          derivedGlobalCount: summary.derivedGlobalCount,
          derivedDomainCount: summary.derivedDomainCount,
          derivedMixedCount: summary.derivedMixedCount,
          primaryDomainCounts: summary.primaryDomainCounts,
          protectionClassCounts: summary.protectionClassCounts,
          scopeClassCounts: summary.scopeClassCounts,
          costClassCounts: summary.costClassCounts,
          negativeSensitivityCounts: summary.negativeSensitivityCounts,
        },
        step1aBaseline: {
          count: changeImpactSummary.count,
          resolvedOwnerCount: changeImpactSummary.resolvedOwnerCount,
          missingOwnerCount: changeImpactSummary.missingOwnerCount,
          fullReleaseCount: changeImpactSummary.fullReleaseCount,
        },
      },
      null,
      2,
    ),
  );

  pass("baseline", `202 rows, ${summary.checkerPathCount} unique checker paths, ${summary.multiStepCheckerCount} multi-step checkers`);
  pass("step-1a baseline", "8 pilot rows, 7 resolved owners, 1 explicit missing owner");

  if (getCheckOwnershipForId("__unknown__") !== null) {
    fail("unknown check id", "expected null");
  }
  if (getCheckOwnershipForStep("__unknown__") !== null) {
    fail("unknown step id", "expected null");
  }
  pass("unknown check id", "fail-closed");

  const records = registry.records;

  expectFailure(
    "duplicate row",
    () => {
      const mutated = cloneRecords(records);
      mutated[mutated.length - 1] = cloneRecord(mutated[0]);
      assertCheckOwnershipRegistryV1Shape(mutated, "duplicate row");
    },
    "duplicate",
  );

  expectFailure(
    "duplicate checker metadata",
    () => {
      const mutated = cloneRecords(records);
      mutated[1].checkId = mutated[0].checkId;
      assertCheckOwnershipRegistryV1Shape(mutated, "duplicate checker metadata");
    },
    "duplicate checkId",
  );

  expectFailure(
    "invalid domain",
    () => {
      const mutated = cloneRecords(records);
      mutated[0].primaryDomain = "NOT_A_DOMAIN";
      assertCheckOwnershipRegistryV1Shape(mutated, "invalid domain");
    },
    "invalid primaryDomain",
  );

  expectFailure(
    "invalid protection class",
    () => {
      const mutated = cloneRecords(records);
      mutated[0].protectionClass = "NOT_A_CLASS";
      assertCheckOwnershipRegistryV1Shape(mutated, "invalid protection class");
    },
    "invalid protectionClass",
  );

  expectFailure(
    "invalid cost class",
    () => {
      const mutated = cloneRecords(records);
      mutated[0].costClass = "NOT_A_COST";
      assertCheckOwnershipRegistryV1Shape(mutated, "invalid cost class");
    },
    "invalid costClass",
  );

  expectFailure(
    "missing productExtensions step",
    () => {
      const mutated = cloneRecords(records);
      mutated[0].productExtensionsStep = "";
      assertCheckOwnershipRegistryV1Shape(mutated, "missing productExtensions step");
    },
    "missing productExtensionsStep",
  );

  expectFailure(
    "manual sha field",
    () => {
      const mutated = cloneRecords(records);
      mutated[0].sha256 = "ABC123";
      assertCheckOwnershipRegistryV1Shape(mutated, "manual sha field");
    },
    "sha field is forbidden",
  );

  expectFailure(
    "manual source-to-checker pair structure",
    () => {
      const mutated = cloneRecords(records);
      mutated[0].sourceToCheckerPairs = ["check:bad"];
      assertCheckOwnershipRegistryV1Shape(mutated, "manual source-to-checker pair structure");
    },
    "unexpected field sourceToCheckerPairs",
  );

  const representativeDefinitions = [
    {
      label: "AUTH / SECURITY",
      candidates: ["check:securitykvkkfinal01", "check:authstepupdevtoggle01", "check:authstepupproviderlocaldefault01"],
    },
    {
      label: "COMPANY",
      candidates: ["check:companybudgetandservicecost01", "check:companybudgetandservicecost01"],
    },
    {
      label: "ROOM",
      candidates: ["check:roomprofitabilityandquotefloor01", "check:uxroompanelclarity01"],
    },
    {
      label: "AGREEMENT",
      candidates: ["check:agreementsourceshiftlineage01", "check:copilotshifttoagreementprep01"],
    },
    {
      label: "OFFER",
      candidates: ["check:copilotofferanalysis01", "check:copilotofferrecommendation01", "check:verifiedsupplier01"],
    },
    {
      label: "FINANCE / PAYMENT",
      candidates: ["check:pay01e", "check:paysafe01", "check:qltpaybridge01"],
    },
    {
      label: "QUALITY",
      candidates: ["check:qlt04b", "check:offerrankingquality01"],
    },
    {
      label: "ROUTE / DISPATCH",
      candidates: ["check:boardingops01a", "check:routechangefinal01", "check:copilotroutereviewhumanapproval01"],
    },
    {
      label: "AI / SEFER ABI",
      candidates: ["check:seferabireasoningassistant01", "check:seferabiallrolesreasoningassistant01", "check:copilotworkflowreasoningengine01"],
    },
    {
      label: "WEB / UX",
      candidates: ["check:web01a", "check:web01b", "check:uxpanelstandardarchitecture01"],
    },
    {
      label: "MOBILE",
      candidates: ["check:uxmobileallrolespanelfix01", "check:uxmobileallrolespanelaudit01", "check:m98e2d"],
    },
    {
      label: "SMOKE",
      candidates: ["check:uxlivepanelsmokeaudit01", "check:uxsmokepassminusevidence01", "check:uxsmokepassminuszero01", "check:finaluxsmoke01"],
    },
    {
      label: "FOUNDATION",
      candidates: ["node backend/scripts/current_head_scope_policy_01_check.js"],
    },
  ];

  console.log("REPRESENTATIVE CHECK OWNERSHIP LOOKUPS");
  for (const definition of representativeDefinitions) {
    printLookup(definition.label, pickRecord(registry.byCheckId, definition.candidates, definition.label));
  }

  console.log("PILOT IMPACT RESOLUTION");
  const hotSources = [
    "web/src/App.jsx",
    "backend/src/routes/commercialCore.js",
    "backend/src/routes/trustQuality.js",
    "backend/src/routes/shifts/company.js",
    "backend/src/routes/companyOverview.js",
    "backend/src/routes/auth.js",
    "backend/src/ai/service.js",
    "backend/src/lib/requestUrl.js",
  ];

  for (const sourcePath of hotSources) {
    const impact = CHANGE_IMPACT_REGISTRY_V1_BY_PATH[sourcePath];
    if (!impact) {
      throw new Error(`FAIL pilot impact resolution: missing impact row for ${sourcePath}`);
    }
    const impactSelection = getChecksForImpactMetadata(impact, registry.records);
    console.log(
      `IMPACT ${sourcePath} :: ${JSON.stringify({
        primaryDomain: impact.primaryDomain,
        secondaryDomains: impact.secondaryDomains,
        smokeSuites: impact.smokeSuites,
        queryTags: impactSelection.queryTags,
        derivedCheckCount: impactSelection.records.length,
        globalCount: impactSelection.globalRecords.length,
        smokeCount: impactSelection.smokeRecords.length,
        domainCount: impactSelection.domainRecords.length,
        mixedCount: impactSelection.mixedRecords.length,
      })}`,
    );
  }

  pass("check ownership registry v1", "foundation pass");
}

try {
  main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}
