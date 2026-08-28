#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildCostScenarioPreview,
  COST_SCENARIO_FORECAST_MODEL_VERSION,
  normalizeCostScenarioInput,
} from "../src/finance/costScenarioForecast.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let passCount = 0;
let failCount = 0;

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function must(condition, label) {
  if (!condition) {
    failCount += 1;
    console.error(`FAIL ${label}`);
    return;
  }
  passCount += 1;
  console.log(`OK ${label}`);
}

function baseInput(overrides = {}) {
  return {
    currencyCode: "TRY",
    vehicleCount: 1,
    vehicleType: "MINIBUS",
    vehicleCapacity: 16,
    passengerCount: 10,
    stopCount: 2,
    serviceDistanceKm: 100,
    totalDistanceKm: 100,
    routeDurationMinutes: 60,
    serviceDayCount: 10,
    shiftsPerServiceDay: 1,
    shiftCount: 10,
    tripCount: 10,
    fuelConsumptionLitersPer100Km: 10,
    fuelUnitPriceMinor: 4000,
    driverBasePerShiftMinor: 10000,
    maintenancePerKmMinor: 100,
    ...overrides,
  };
}

function context(overrides = {}) {
  return {
    scope: "COMPANY",
    role: "COMPANY",
    companyKind: "COMPANY",
    tenantScope: "company_demo",
    requestedBy: "user_demo",
    baselineReference: "base_demo",
    baselineDataClass: "INTERNAL_ACTUAL",
    ...overrides,
  };
}

function freshExternal(valueMinor = 5000, freshness = "FRESH") {
  return {
    freshness,
    confidence: freshness === "FRESH" ? "HIGH" : "MEDIUM",
    marketReference: {
      dataClass: "EXTERNAL_REFERENCE",
      family: "FUEL_DIESEL",
      unit: "CURRENCY_PER_L",
      valueMinor,
      valueDecimal: String(valueMinor / 100),
      currencyCode: "TRY",
      sourceName: "Controlled test source",
      providerKey: "MANUAL_CONTROLLED_REFERENCE",
      asOf: "2026-08-28T08:00:00.000Z",
      regionCode: "TR",
      scopeType: "GLOBAL",
      scopeKey: "GLOBAL",
      freshness,
      confidence: freshness === "FRESH" ? "HIGH" : "MEDIUM",
    },
    actualInternalData: null,
  };
}

function countOccurrences(text, pattern) {
  return [...String(text || "").matchAll(pattern)].length;
}

function post4HumanUxCounts({ uiText, navText, financialText, appText, forecastText }) {
  const fieldRows = [...uiText.matchAll(/\{ key: "([^"]+)", label: "([^"]+)", [^}]*unit: "([^"]+)"[^}]*classification: "([^"]+)"/g)]
    .map((match) => ({ key: match[1], label: match[2], unit: match[3], classification: match[4] }));
  const expectedLabelUnits = {
    vehicleCount: "(adet)",
    passengerCount: "(kişi)",
    serviceDistanceKm: "(km)",
    serviceDayCount: "(gün)",
    vehicleCapacity: "(kişi)",
    stopCount: "(durak)",
    totalDistanceKm: "(km)",
    routeDurationMinutes: "(dk)",
    shiftCount: "(sefer)",
    tripCount: "(yolculuk)",
    fuelConsumptionLitersPer100Km: "(L/100 km)",
  };
  const moneyFields = fieldRows.filter((field) => field.unit === "MONEY");
  const nonMoneyFields = fieldRows.filter((field) => field.unit !== "MONEY");
  const summaryStart = uiText.indexOf("function InputSummary");
  const summaryEnd = uiText.indexOf("export default function CostScenarioWorkspacePanel");
  const summarySource = summaryStart >= 0 && summaryEnd > summaryStart ? uiText.slice(summaryStart, summaryEnd) : "";
  const roomNavSource = navText.split('} else if (role === "COMPANY")', 1)[0];
  const companyNavSource = navText.split('} else if (role === "COMPANY")', 2)[1]?.split('} else if (role === "DRIVER")', 1)[0] || "";
  const companySeparateScenarioNavCount = countOccurrences(companyNavSource, /\{ label: "Maliyet Senaryoları"/g);
  const roomSeparateScenarioNavCount = countOccurrences(roomNavSource, /\{ label: "Maliyet Senaryoları"/g);
  const currencyLabelCount = nonMoneyFields.filter((field) => /₺|para birimi|türk lirası|currency/i.test(field.label)).length;
  const summaryCurrencyLabelCount = countOccurrences(summarySource, /Para birimi|Türk lirası|currencyCode/gi);
  const wrongUnitLabelCount = fieldRows.filter((field) => {
    if (field.unit === "MONEY") return !field.label.includes("₺");
    const expected = expectedLabelUnits[field.key];
    return expected ? !field.label.includes(expected) : false;
  }).length;
  const requiredUnits = ["(adet)", "(kişi)", "(km)", "(gün)", "(dk)", "(durak)", "(sefer)", "(yolculuk)", "(L/100 km)"];
  const missingRequiredUnitCount = requiredUnits.filter((unit) => !uiText.includes(unit)).length;
  const advancedAlwaysVisibleCount = countOccurrences(uiText, /<details className="card" data-testid="scenario-advanced-assumptions"[^>]*\bopen\b/g);
  const scenarioCapabilityLossCount = [
    "vehicleType", "vehicleCount", "vehicleCapacity", "passengerCount", "stopCount", "serviceDistanceKm",
    "totalDistanceKm", "routeDurationMinutes", "serviceDayCount", "shiftCount", "tripCount",
    "fuelConsumptionLitersPer100Km", "fuelUnitPriceMinor", "driverBasePerShiftMinor", "maintenancePerKmMinor",
  ].filter((key) => !fieldRows.some((field) => field.key === key)).length;
  const unexplainedDuplicateScenarioNavCount = roomSeparateScenarioNavCount + companySeparateScenarioNavCount;
  const unknownScenarioEntryPointCount = [
    navText.includes('Finansal Operasyonlar'),
    navText.includes('Bütçe ve Servis Maliyeti'),
    financialText.includes('scenarioPanel={<CostScenarioWorkspacePanel scope="COMPANY" embedded />}'),
    financialText.includes('<CostScenarioWorkspacePanel scope="ROOM" embedded />'),
  ].every(Boolean) ? 0 : 1;
  const deepLinkRegressionCount = [
    /path === "\/room\/cost-scenarios"[^\n]*CostScenarioWorkspacePanel/.test(appText),
    /path === "\/company\/cost-scenarios"[^\n]*CostScenarioWorkspacePanel/.test(appText),
  ].every(Boolean) ? 0 : 1;
  const contextualEntryRegressionCount = [
    financialText.includes('preferredScopeTitle("ROOM")'),
    financialText.includes('preferredScopeTitle("COMPANY")'),
    financialText.includes('CostScenarioWorkspacePanel'),
  ].every(Boolean) ? 0 : 1;
  const manualBaselineOverridesCanonicalTruthCount = uiText.includes("mevcut planın gerçek veya kanonik planlanan maliyetini değiştirmez") &&
    forecastText.indexOf("buildOperationalCostModel") < forecastText.indexOf("buildAnchorAmount") ? 0 : 1;
  const ambiguousBaselineMoneyInputCount = uiText.includes("Mevcut plan maliyet tabanı (₺)") || uiText.includes("Varsa güvenli tutar") ? 1 : 0;

  return {
    NON_MONEY_FIELD_WITH_CURRENCY_LABEL_COUNT: currencyLabelCount + summaryCurrencyLabelCount,
    WRONG_UNIT_LABEL_COUNT: wrongUnitLabelCount,
    MISSING_REQUIRED_UNIT_COUNT: missingRequiredUnitCount,
    UNKNOWN_SCENARIO_ENTRY_POINT_COUNT: unknownScenarioEntryPointCount,
    UNEXPLAINED_DUPLICATE_SCENARIO_NAV_COUNT: unexplainedDuplicateScenarioNavCount,
    ADVANCED_INPUT_ALWAYS_VISIBLE_COUNT: advancedAlwaysVisibleCount,
    SCENARIO_CAPABILITY_LOSS_COUNT: scenarioCapabilityLossCount,
    MANUAL_BASELINE_OVERRIDES_CANONICAL_TRUTH_COUNT: manualBaselineOverridesCanonicalTruthCount,
    AMBIGUOUS_BASELINE_MONEY_INPUT_COUNT: ambiguousBaselineMoneyInputCount,
    COMPANY_SEPARATE_SCENARIO_NAV_ITEM_COUNT: companySeparateScenarioNavCount,
    ROOM_SEPARATE_SCENARIO_NAV_ITEM_COUNT: roomSeparateScenarioNavCount,
    SCENARIO_DEEP_LINK_REGRESSION_COUNT: deepLinkRegressionCount,
    SCENARIO_CONTEXTUAL_ENTRY_REGRESSION_COUNT: contextualEntryRegressionCount,
    moneyFieldCount: moneyFields.length,
    fieldCount: fieldRows.length,
  };
}

function main() {
  console.log(`=== #4 ${COST_SCENARIO_FORECAST_MODEL_VERSION} CHECK ===`);
  const packageText = read("package.json");
  const routeText = read("backend/src/routes/costScenario.js");
  const mountText = read("backend/src/bootstrap/routeMounts.js");
  const docsText = read("docs/COST_SCENARIO_FORECAST_AND_SAVINGS_01.md");
  const uiText = read("web/src/panels/shared/CostScenarioWorkspacePanel.jsx");
  const navText = read("web/src/layout/NavDock.jsx");
  const financialText = read("web/src/panels/shared/FinancialOperationsPanel.jsx");
  const appText = read("web/src/App.jsx");
  const forecastText = read("backend/src/finance/costScenarioForecast.js");
  const base = baseInput();
  const same = buildCostScenarioPreview({ baselineInput: base, scenarioOverrides: { ...base }, context: context() });
  const sameAgain = buildCostScenarioPreview({ baselineInput: base, scenarioOverrides: { ...base }, context: context() });

  must(packageText.includes('"check:costscenarioforecastandsavings01": "node backend/scripts/cost_scenario_forecast_and_savings_01_check.js"'), "canonical #4 check is exposed");
  must(routeText.includes("/baseline") && routeText.includes("/preview") && routeText.includes("getExternalCostReference"), "scenario API has baseline and preview owners");
  must(routeText.includes('requireRole("COMPANY", "ROOM", "SUPER_ADMIN")'), "scenario API role boundary is explicit");
  must(routeText.includes("SCENARIO_TENANT_MISMATCH") && routeText.includes("baselineReferenceId"), "scenario API tenant and baseline guards are explicit");
  must(mountText.includes('app.use("/api/cost-scenarios"'), "scenario API is mounted in the canonical server route map");
  must(docsText.includes("COST-SCENARIO-FORECAST-AND-SAVINGS-01") && docsText.includes("notPersisted"), "#4 architecture document records version and ephemeral persistence");

  must(same.status === "READY", "same complete plan is ready");
  must(same.costDeltaMinor === 0 && same.savingsMinor === null && same.additionalCostMinor === null, "same plan has zero delta without fake savings");
  must(same.scenarioId === sameAgain.scenarioId, "same inputs produce deterministic scenario id");
  must(same.safety.readOnly && same.safety.previewOnly && same.safety.writeAction === false, "preview safety flags are immutable");
  must(same.safety.notPersisted && same.safety.noLiveMutation && same.provenance.status === "PREVIEW", "preview has no persistence or live mutation");
  must(same.provenance.baselineDataClass === "INTERNAL_ACTUAL" && same.provenance.scenarioDataClass === "USER_SCENARIO_OVERRIDE", "actual and user scenario provenance stay separate");

  const moreVehicles = buildCostScenarioPreview({ baselineInput: base, scenarioOverrides: { vehicleCount: 2 }, context: context() });
  must(moreVehicles.status === "READY" && moreVehicles.scenario.costMinor > moreVehicles.baseline.costMinor, "vehicle-count increase changes cost through canonical components");
  must(moreVehicles.dimensions.vehicleCount.scenario === 2 && moreVehicles.changedDimensions.includes("vehicleCount"), "vehicle-count change is visible in comparison");

  const insufficient = buildCostScenarioPreview({ baselineInput: baseInput({ passengerCount: 30 }), scenarioOverrides: { vehicleCount: 1 }, context: context() });
  must(insufficient.status === "BLOCKED" && insufficient.scenario.costMinor === null, "insufficient capacity blocks scenario cost claims");
  const enough = buildCostScenarioPreview({ baselineInput: baseInput({ passengerCount: 30, vehicleCount: 2 }), scenarioOverrides: { vehicleCount: 2 }, context: context() });
  must(enough.status === "READY" && enough.scenario.requiredVehicleCount === 2, "required vehicle capacity uses deterministic ceiling");

  const shorter = buildCostScenarioPreview({ baselineInput: base, scenarioOverrides: { serviceDistanceKm: 50, totalDistanceKm: 50 }, context: context() });
  must(shorter.status === "READY" && shorter.savingsMinor > 0 && shorter.costDeltaMinor < 0, "shorter distance produces explainable savings");
  const longer = buildCostScenarioPreview({ baselineInput: base, scenarioOverrides: { serviceDistanceKm: 150, totalDistanceKm: 150 }, context: context() });
  must(longer.status === "READY" && longer.additionalCostMinor > 0 && longer.costDeltaMinor > 0, "longer distance produces explainable additional cost");

  const fewerDays = buildCostScenarioPreview({ baselineInput: base, scenarioOverrides: { serviceDayCount: 5 }, context: context() });
  must(fewerDays.status === "READY" && fewerDays.scenario.costMinor < fewerDays.baseline.costMinor, "service-day change scales per-shift assumptions");
  const fuelChange = buildCostScenarioPreview({ baselineInput: base, scenarioOverrides: { fuelUnitPriceMinor: 5000 }, context: context() });
  must(fuelChange.status === "READY" && fuelChange.additionalCostMinor > 0 && fuelChange.fuelDeltaMinor > 0, "fuel-price change is isolated in fuel component delta");
  const passengerChange = buildCostScenarioPreview({ baselineInput: base, scenarioOverrides: { passengerCount: 12 }, context: context() });
  must(passengerChange.status === "READY" && passengerChange.dimensions.passengerCount.scenario === 12, "passenger change is accepted without inventing a per-passenger cost");
  const vehicleTypeChange = buildCostScenarioPreview({ baselineInput: base, scenarioOverrides: { vehicleType: "MIDIBUS", vehicleCapacity: 25 }, context: context() });
  must(vehicleTypeChange.status === "READY" && vehicleTypeChange.dimensions.vehicleType.scenario === "MIDIBUS", "vehicle type and capacity are explicit scenario dimensions");

  const missing = buildCostScenarioPreview({ baselineInput: { currencyCode: "TRY", passengerCount: 10, vehicleCapacity: 16 }, scenarioOverrides: { vehicleCount: 1 }, context: context() });
  must(missing.status === "INCOMPLETE" && missing.baseline.costMinor === null && missing.missingData.length > 0, "missing critical cost inputs stay missing");
  const anchor = buildCostScenarioPreview({ baselineInput: { currencyCode: "TRY", baselineCostMinor: "100000", vehicleCount: 1, serviceDayCount: 10 }, scenarioOverrides: { vehicleCount: 2 }, context: context({ baselineDataClass: "INTERNAL_PLANNED" }) });
  must(anchor.status === "READY" && anchor.baseline.costMinor === 100000 && anchor.scenario.costMinor === 200000, "planned cost anchor scales only supported dimensions");
  const anchorUnsupported = buildCostScenarioPreview({ baselineInput: { currencyCode: "TRY", baselineCostMinor: "100000", vehicleCount: 1, serviceDayCount: 10, totalDistanceKm: 100 }, scenarioOverrides: { totalDistanceKm: 200 }, context: context({ baselineDataClass: "INTERNAL_PLANNED" }) });
  must(anchorUnsupported.status === "INCOMPLETE" && anchorUnsupported.scenario.costMinor === null, "planned anchor refuses unsupported distance claims");

  const external = buildCostScenarioPreview({ baselineInput: baseInput({ fuelUnitPriceMinor: undefined }), scenarioOverrides: { useExternalFuelPrice: true }, externalReference: freshExternal(5000), context: context() });
  must(external.status === "READY" && external.provenance.externalReference?.dataClass === "EXTERNAL_REFERENCE" && external.provenance.externalReference.usedForActualTruth === false, "external fuel reference can inform forecast but never becomes actual truth");
  const stale = buildCostScenarioPreview({ baselineInput: baseInput({ fuelUnitPriceMinor: undefined }), scenarioOverrides: { useExternalFuelPrice: true }, externalReference: freshExternal(5000, "STALE"), context: context() });
  must(stale.status === "READY" && stale.confidence.level === "MEDIUM" && stale.warnings.some((item) => item.includes("eski")), "stale reference remains explicit and lowers confidence");
  const expired = buildCostScenarioPreview({ baselineInput: baseInput({ fuelUnitPriceMinor: undefined }), scenarioOverrides: { useExternalFuelPrice: true }, externalReference: { ...freshExternal(5000, "EXPIRED"), marketReference: null }, context: context() });
  must(expired.status === "INCOMPLETE" && expired.baseline.costMinor === null, "expired reference cannot fill a missing price");

  const unsafeMoney = normalizeCostScenarioInput({ currencyCode: "TRY", fuelUnitPriceMinor: "12.5" }, "test");
  must(unsafeMoney.issues.blockers.length > 0 && unsafeMoney.issues.invalidFields.includes("fuelUnitPriceMinor"), "fractional minor money is rejected");
  const negativeMoney = normalizeCostScenarioInput({ currencyCode: "TRY", fuelUnitPriceMinor: -1 }, "test");
  must(negativeMoney.issues.blockers.length > 0, "negative money is rejected");
  const mixedCurrency = buildCostScenarioPreview({ baselineInput: base, scenarioOverrides: { currencyCode: "USD" }, context: context() });
  must(mixedCurrency.status === "BLOCKED" && mixedCurrency.costDeltaMinor === null, "mixed currency comparison is blocked");
  const huge = normalizeCostScenarioInput({ currencyCode: "TRY", fuelUnitPriceMinor: "9007199254740992" }, "test");
  must(huge.issues.blockers.length > 0, "unsafe integer money is rejected");

  must(!JSON.stringify(same).includes("paymentExecute") && !JSON.stringify(same).includes("accountingPosting"), "scenario output has no payment or posting action");
  must(!JSON.stringify(same).includes("actualInternalData"), "scenario result does not promote internal data through external response");
  must(same.formulaTrace.some((item) => item.includes("operational cost model")), "scenario formula trace names the canonical cost owner");

  const post4Counts = post4HumanUxCounts({ uiText, navText, financialText, appText, forecastText });
  console.log("=== POST-#4 HUMAN UX SEMANTIC COUNTS ===");
  for (const [key, value] of Object.entries(post4Counts)) console.log(`${key}=${value}`);
  for (const key of [
    "NON_MONEY_FIELD_WITH_CURRENCY_LABEL_COUNT",
    "WRONG_UNIT_LABEL_COUNT",
    "MISSING_REQUIRED_UNIT_COUNT",
    "UNKNOWN_SCENARIO_ENTRY_POINT_COUNT",
    "UNEXPLAINED_DUPLICATE_SCENARIO_NAV_COUNT",
    "ADVANCED_INPUT_ALWAYS_VISIBLE_COUNT",
    "SCENARIO_CAPABILITY_LOSS_COUNT",
    "MANUAL_BASELINE_OVERRIDES_CANONICAL_TRUTH_COUNT",
    "AMBIGUOUS_BASELINE_MONEY_INPUT_COUNT",
    "COMPANY_SEPARATE_SCENARIO_NAV_ITEM_COUNT",
    "ROOM_SEPARATE_SCENARIO_NAV_ITEM_COUNT",
    "SCENARIO_DEEP_LINK_REGRESSION_COUNT",
    "SCENARIO_CONTEXTUAL_ENTRY_REGRESSION_COUNT",
  ]) {
    must(post4Counts[key] === 0, `post-#4 ${key} is zero`);
  }
  must(post4Counts.moneyFieldCount > 0 && post4Counts.fieldCount >= 15, "unit taxonomy covers all scenario fields and money fields remain explicit");
  must(uiText.includes("Gelişmiş varsayımlar") && uiText.includes('data-testid="scenario-advanced-fields"'), "advanced scenario inputs have a named collapsed owner");
  must(navText.includes('label: "Planlama Senaryosu"') && appText.includes("/school/cost-scenarios") && appText.includes("/organization/cost-scenarios"), "school and organization planning-only scenario route remains distinct");

  if (failCount) {
    console.error(`#4 check failed: ${passCount} passed, ${failCount} failed`);
    process.exitCode = 1;
  } else {
    console.log(`#4 check passed: ${passCount}/${passCount}`);
  }
}

main();
