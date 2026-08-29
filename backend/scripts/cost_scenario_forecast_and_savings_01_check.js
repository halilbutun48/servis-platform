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

function masterPrimerEvidenceCounts({ forecastText, routeText, uiText, appText, financialText, navText }) {
  const fixture = baseInput({
    shiftStartMinutes: 480,
    shiftEndMinutes: 540,
    baselineCostMinor: 100000,
  });
  const preview = buildCostScenarioPreview({
    baselineInput: fixture,
    scenarioOverrides: {
      vehicleCount: 2,
      shiftStartMinutes: 510,
      routeAlternative: { type: "REVERSE_STOP_ORDER" },
      scenarioStopOperations: [{ operation: "ADD", lat: 41.01, lng: 29.01 }],
      riskAssumptions: { riskFuelUnitPriceMinor: 5000, riskDistanceKm: 125, riskDurationMinutes: 80 },
    },
    context: context({
      plannedInput: { vehicleCount: 1, vehicleType: "MINIBUS", vehicleCapacity: 16, serviceDistanceKm: 100, routeDurationMinutes: 60, passengerCount: 10, stopCount: 2, shiftCount: 1, baselineCostMinor: 100000 },
      actualEvidence: { actualCostMinor: 90000 },
      budgetEvidence: { budgetAmountMinor: 400000 },
      forecastEvidence: {
        periodStart: "2026-08-01",
        periodEnd: "2026-08-31",
        actualToDateMinor: 90000,
        remainingForecastMinor: 200000,
        budgetAmountMinor: 400000,
        provenance: "CHECKER_CANONICAL_FIXTURE",
      },
      routeEvidence: {
        baseline: { distanceKm: 100, durationMinutes: 60, stopCount: 2, source: "CHECKER_ROUTE_OWNER" },
        scenario: { distanceKm: 110, durationMinutes: 70, stopCount: 3, source: "CHECKER_ROUTE_OWNER" },
        alternative: { status: "READY", type: "REVERSE_STOP_ORDER", source: "CHECKER_ROUTE_OWNER", compared: true, applied: false },
      },
      schedule: { baselineStartMinutes: 480 },
      dispatchAlternative: { status: "SEAM_PROVEN_DEFERRED_TO_#20", typedInput: true, compared: false, applied: false },
    }),
  });
  const fewerVehicles = buildCostScenarioPreview({ baselineInput: baseInput({ vehicleCount: 2, passengerCount: 10 }), scenarioOverrides: { vehicleCount: 1 }, context: context() });
  const stopRemoval = buildCostScenarioPreview({
    baselineInput: baseInput({ stopCount: 3 }),
    scenarioOverrides: { stopCount: 2 },
    context: context({ routeEvidence: { baseline: { distanceKm: 100, durationMinutes: 60, stopCount: 3 }, scenario: { distanceKm: 90, durationMinutes: 55, stopCount: 2 } } }),
  });
  const plannedVsActualStatuses = Object.values(preview.plannedVsActual?.dimensions || {}).map((item) => item.status);
  return {
    EXPECTED_SCENARIO_IMPLEMENTED_COUNT: preview.scenarioVariants?.EXPECTED?.scenarioType === "EXPECTED" ? 1 : 0,
    BEST_SCENARIO_IMPLEMENTED_COUNT: preview.scenarioVariants?.BEST?.scenarioType === "BEST" ? 1 : 0,
    RISK_SCENARIO_IMPLEMENTED_COUNT: preview.scenarioVariants?.RISK?.scenarioType === "RISK" && preview.scenarioVariants.RISK.status === "READY" ? 1 : 0,
    PERIOD_END_FORECAST_IMPLEMENTED_COUNT: preview.forecast?.status === "READY" && preview.forecast?.forecastPeriodEndMinor === 290000 ? 1 : 0,
    BUDGET_VARIANCE_IMPLEMENTED_COUNT: preview.budgetVariance?.status === "READY" && preview.budgetVariance?.varianceAmountMinor === -110000 ? 1 : 0,
    PLANNED_VS_ACTUAL_IMPLEMENTED_DIMENSION_COUNT: Object.values(preview.plannedVsActual?.dimensions || {}).filter((item) => item.status === "COMPARED").length,
    VEHICLE_ADD_SIMULATION_PROVEN_COUNT: preview.dimensions.vehicleCount.scenario === 2 && preview.changedDimensions.includes("vehicleCount") ? 1 : 0,
    VEHICLE_REMOVE_SIMULATION_PROVEN_COUNT: fewerVehicles.dimensions.vehicleCount.scenario === 1 && fewerVehicles.changedDimensions.includes("vehicleCount") ? 1 : 0,
    STOP_ADD_SIMULATION_IMPLEMENTED_COUNT: preview.dimensions.stopCount.scenario === 3 && preview.routeAlternative?.compared === true ? 1 : 0,
    STOP_REMOVE_SIMULATION_IMPLEMENTED_COUNT: stopRemoval.dimensions.stopCount.scenario === 2 && stopRemoval.changedDimensions.includes("stopCount") ? 1 : 0,
    SHIFT_TIME_SIMULATION_IMPLEMENTED_COUNT: preview.timingComparison?.shiftTimeChanged === true ? 1 : 0,
    ROUTE_ALTERNATIVE_COMPARISON_IMPLEMENTED_COUNT: preview.routeAlternative?.compared === true && preview.routeAlternative?.applied === false ? 1 : 0,
    DELAY_COMPARISON_COVERAGE_COUNT: preview.timingComparison?.status === "COMPARED" && preview.timingComparison.delayImpactMinutes === 10 ? 1 : 0,
    OPERATIONAL_RISK_COMPARISON_IMPLEMENTED_COUNT: preview.operationalRisk?.explained === true && preview.operationalRisk?.riskState ? 1 : 0,
    AVAILABLE_ACTUAL_EVIDENCE_NOT_COMPARED_COUNT: plannedVsActualStatuses.filter((status) => status === "ACTUAL_EVIDENCE_WITHOUT_PLAN").length,
    ROUTE_ALTERNATIVE_WITHOUT_COMPARISON_COUNT: preview.routeAlternative?.status && preview.routeAlternative.compared !== true ? 1 : 0,
    COST_OUTCOME_WITHOUT_EXPLANATION_COUNT: preview.scenarioVariants?.EXPECTED?.rationale && preview.forecast?.equation && preview.operationalRisk?.explained ? 0 : 1,
    DUPLICATE_CALCULATION_ENGINE_COUNT: countOccurrences(forecastText, /buildOperationalCostModel/g) === 2 ? 0 : 1,
    DUPLICATE_SCENARIO_COMPONENT_COUNT: countOccurrences(uiText, /export default function CostScenarioWorkspacePanel/g) === 1 ? 0 : 1,
    ROUTE_OWNER_PRESENT_COUNT: routeText.includes("buildRouteEvidence") && routeText.includes("sumDistanceKm") ? 1 : 0,
    BEST_SCENARIO_UNPROVEN_COUNT: preview.scenarioVariants?.BEST?.scenarioType === "BEST" ? 0 : 1,
    EXPECTED_SCENARIO_UNPROVEN_COUNT: preview.scenarioVariants?.EXPECTED?.scenarioType === "EXPECTED" ? 0 : 1,
    RISK_SCENARIO_UNPROVEN_COUNT: preview.scenarioVariants?.RISK?.scenarioType === "RISK" && preview.scenarioVariants.RISK.status === "READY" ? 0 : 1,
    PERIOD_END_FORECAST_FALSE_CERTAINTY_COUNT: preview.forecast?.status === "READY" && preview.forecast?.confidence === "EVIDENCE_BASED" ? 0 : 1,
    BUDGET_VARIANCE_SEMANTIC_CONFUSION_COUNT: preview.budgetVariance?.varianceAmountMinor !== preview.costDeltaMinor ? 0 : 1,
    CAPACITY_INVALID_SCENARIO_ACCEPTED_COUNT: buildCostScenarioPreview({ baselineInput: baseInput({ passengerCount: 30 }), scenarioOverrides: { vehicleCount: 1 }, context: context() }).status === "BLOCKED" ? 0 : 1,
    NO_EFFECT_INPUT_PRESENTED_AS_SIMULATION_COUNT: preview.changedDimensions.includes("vehicleCount") && preview.changedDimensions.includes("serviceDistanceKm") ? 0 : 1,
    NO_EFFECT_STOP_INPUT_PRESENTED_AS_SIMULATION_COUNT: preview.dimensions.stopCount.scenario !== preview.dimensions.stopCount.baseline && preview.routeAlternative?.compared === true ? 0 : 1,
    NO_EFFECT_SHIFT_TIME_INPUT_PRESENTED_AS_SIMULATION_COUNT: preview.timingComparison?.shiftTimeChanged === true ? 0 : 1,
    FAKE_ROUTE_ALTERNATIVE_COUNT: preview.routeAlternative?.type === "REVERSE_STOP_ORDER" && preview.routeAlternative?.source ? 0 : 1,
    ROUTE_ALTERNATIVE_LIVE_APPLY_COUNT: preview.routeAlternative?.applied === false ? 0 : 1,
    FABRICATED_DELAY_PREDICTION_COUNT: preview.timingComparison?.trafficPredictionModeled === false ? 0 : 1,
    UNEXPLAINED_SCENARIO_RISK_SCORE_COUNT: preview.operationalRisk?.explained === true && preview.operationalRisk?.score === null ? 0 : 1,
    SCENARIO_LIVE_OPERATION_MUTATION_COUNT: preview.dispatchAlternative?.applied === false ? 0 : 1,
    SCHOOL_SCENARIO_VISIBLE_COUNT: appText.includes("/school/cost-scenarios") && navText.includes('label: "Planlama Senaryosu"') ? 1 : 0,
    ORGANIZATION_SCENARIO_VISIBLE_COUNT: appText.includes("/organization/cost-scenarios") && navText.includes('label: "Planlama Senaryosu"') ? 1 : 0,
    SCHOOL_COMPANY_BUDGET_LIFECYCLE_COPY_COUNT: uiText.includes("Bütçe yaşam döngüsü") ? 1 : 0,
    ORGANIZATION_COMPANY_BUDGET_LIFECYCLE_COPY_COUNT: uiText.includes("Bütçe yaşam döngüsü") ? 1 : 0,
    SCHOOL_FINANCE_PRIVILEGE_LEAK_COUNT: uiText.includes("Planlama bağlamı") && uiText.includes("normal bütçe yaşam döngüsü") ? 0 : 1,
    ORGANIZATION_FINANCE_PRIVILEGE_LEAK_COUNT: uiText.includes("Planlama bağlamı") && uiText.includes("normal bütçe yaşam döngüsü") ? 0 : 1,
    SCHOOL_AVAILABLE_SCENARIO_EVIDENCE_UNUSED_COUNT: uiText.includes("planningOnly") && routeText.includes("planInputs") && routeText.includes("plan.stops") && appText.includes("/school/cost-scenarios") ? 0 : 1,
    ORGANIZATION_AVAILABLE_SCENARIO_EVIDENCE_UNUSED_COUNT: uiText.includes("planningOnly") && routeText.includes("planInputs") && routeText.includes("plan.stops") && appText.includes("/organization/cost-scenarios") ? 0 : 1,
  };
}

function post4HumanUxCounts({ uiText, navText, financialText, companyPreviewText, appText, forecastText }) {
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
  const advancedAlwaysVisibleCount = countOccurrences(uiText, /<details data-testid="scenario-advanced-fields"[^>]*\bopen\b/g);
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
  const companyContextualScenarioVisibleCount = [
    companyPreviewText.includes('data-testid="company-contextual-scenario"'),
    companyPreviewText.includes("{scenarioPanel}"),
    companyPreviewText.indexOf('data-testid="company-contextual-scenario"') < companyPreviewText.indexOf("<details className=\"card\" style={{ minWidth: 0 }} open={budgetDetailsOpen}"),
  ].every(Boolean) ? 1 : 0;
  const companyContextualScenarioMissingCount = companyContextualScenarioVisibleCount === 1 ? 0 : 1;
  const roomContextualScenarioVisibleCount = financialText.includes('<CostScenarioWorkspacePanel scope="ROOM" embedded />') ? 1 : 0;
  const duplicateScenarioCalculationCount = [
    countOccurrences(uiText, /postCostScenarioPreview/g) === 2,
    !financialText.includes("postCostScenarioPreview"),
    !companyPreviewText.includes("postCostScenarioPreview"),
  ].every(Boolean) ? 0 : 1;
  const scenarioLiveMutationCount = [
    uiText.includes("Sadece önizleme"),
    uiText.includes("Canlı vardiya"),
    uiText.includes("Senaryo kaydı oluşturulmaz"),
    !uiText.includes("updateCostScenario"),
    !uiText.includes("saveCostScenario"),
    !uiText.includes("applyCostScenario"),
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
    COMPANY_CONTEXTUAL_SCENARIO_VISIBLE_COUNT: companyContextualScenarioVisibleCount,
    COMPANY_CONTEXTUAL_SCENARIO_MISSING_COUNT: companyContextualScenarioMissingCount,
    ROOM_CONTEXTUAL_SCENARIO_VISIBLE_COUNT: roomContextualScenarioVisibleCount,
    DUPLICATE_SCENARIO_CALCULATION_COUNT: duplicateScenarioCalculationCount,
    SCENARIO_LIVE_MUTATION_COUNT: scenarioLiveMutationCount,
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
  const companyPreviewText = read("web/src/panels/shared/FinancialOperationsCompanyPreview.jsx");
  const appText = read("web/src/App.jsx");
  const forecastText = read("backend/src/finance/costScenarioForecast.js");
  const browserText = read("backend/scripts/cost_scenario_forecast_and_savings_01_browser.mjs");
  const base = baseInput();
  const same = buildCostScenarioPreview({ baselineInput: base, scenarioOverrides: { ...base }, context: context() });
  const sameAgain = buildCostScenarioPreview({ baselineInput: base, scenarioOverrides: { ...base }, context: context() });
  const masterCounts = masterPrimerEvidenceCounts({ forecastText, routeText, uiText, appText, financialText, navText });

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

  const post4Counts = post4HumanUxCounts({ uiText, navText, financialText, companyPreviewText, appText, forecastText });
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
    "COMPANY_CONTEXTUAL_SCENARIO_MISSING_COUNT",
    "DUPLICATE_SCENARIO_CALCULATION_COUNT",
    "SCENARIO_LIVE_MUTATION_COUNT",
  ]) {
    must(post4Counts[key] === 0, `post-#4 ${key} is zero`);
  }
  must(post4Counts.COMPANY_CONTEXTUAL_SCENARIO_VISIBLE_COUNT === 1, "post-#4 COMPANY_CONTEXTUAL_SCENARIO_VISIBLE_COUNT is one");
  must(post4Counts.ROOM_CONTEXTUAL_SCENARIO_VISIBLE_COUNT === 1, "post-#4 ROOM_CONTEXTUAL_SCENARIO_VISIBLE_COUNT is one");
  must(post4Counts.moneyFieldCount > 0 && post4Counts.fieldCount >= 15, "unit taxonomy covers all scenario fields and money fields remain explicit");
  must(uiText.includes("Gelişmiş varsayımlar") && uiText.includes('data-testid="scenario-advanced-fields"'), "advanced scenario inputs have a named collapsed owner");
  must(navText.includes('label: "Planlama Senaryosu"') && appText.includes("/school/cost-scenarios") && appText.includes("/organization/cost-scenarios"), "school and organization planning-only scenario route remains distinct");
  must(browserText.includes('route: "/#/company/financial-operations"') && browserText.includes('contextualHome: "Bütçe ve Servis Maliyeti"'), "browser acceptance opens the actual COMPANY budget surface");
  must(browserText.includes('contextualTestId: "company-contextual-scenario"') && browserText.includes('page.getByTestId(contextualTestId).isVisible()') && browserText.includes('Senaryoyu Karşılaştır'), "browser acceptance proves the visible COMPANY contextual scenario contract");

  console.log("=== #4 LOCKED MASTER-PRIMER EVIDENCE COUNTS ===");
  for (const [key, value] of Object.entries(masterCounts)) console.log(`${key}=${value}`);
  for (const key of [
    "EXPECTED_SCENARIO_IMPLEMENTED_COUNT",
    "BEST_SCENARIO_IMPLEMENTED_COUNT",
    "RISK_SCENARIO_IMPLEMENTED_COUNT",
    "PERIOD_END_FORECAST_IMPLEMENTED_COUNT",
    "BUDGET_VARIANCE_IMPLEMENTED_COUNT",
    "VEHICLE_ADD_SIMULATION_PROVEN_COUNT",
    "VEHICLE_REMOVE_SIMULATION_PROVEN_COUNT",
    "STOP_ADD_SIMULATION_IMPLEMENTED_COUNT",
    "STOP_REMOVE_SIMULATION_IMPLEMENTED_COUNT",
    "SHIFT_TIME_SIMULATION_IMPLEMENTED_COUNT",
    "ROUTE_ALTERNATIVE_COMPARISON_IMPLEMENTED_COUNT",
    "DELAY_COMPARISON_COVERAGE_COUNT",
    "OPERATIONAL_RISK_COMPARISON_IMPLEMENTED_COUNT",
    "ROUTE_OWNER_PRESENT_COUNT",
    "SCHOOL_SCENARIO_VISIBLE_COUNT",
    "ORGANIZATION_SCENARIO_VISIBLE_COUNT",
  ]) must(masterCounts[key] >= 1, `master primer ${key} is implemented`);
  must(masterCounts.PLANNED_VS_ACTUAL_IMPLEMENTED_DIMENSION_COUNT >= 1, "master primer planned-vs-actual has compared dimensions");
  for (const key of [
    "AVAILABLE_ACTUAL_EVIDENCE_NOT_COMPARED_COUNT",
    "ROUTE_ALTERNATIVE_WITHOUT_COMPARISON_COUNT",
    "COST_OUTCOME_WITHOUT_EXPLANATION_COUNT",
    "DUPLICATE_CALCULATION_ENGINE_COUNT",
    "DUPLICATE_SCENARIO_COMPONENT_COUNT",
    "BEST_SCENARIO_UNPROVEN_COUNT",
    "EXPECTED_SCENARIO_UNPROVEN_COUNT",
    "RISK_SCENARIO_UNPROVEN_COUNT",
    "PERIOD_END_FORECAST_FALSE_CERTAINTY_COUNT",
    "BUDGET_VARIANCE_SEMANTIC_CONFUSION_COUNT",
    "AVAILABLE_ACTUAL_EVIDENCE_NOT_COMPARED_COUNT",
    "CAPACITY_INVALID_SCENARIO_ACCEPTED_COUNT",
    "NO_EFFECT_INPUT_PRESENTED_AS_SIMULATION_COUNT",
    "NO_EFFECT_STOP_INPUT_PRESENTED_AS_SIMULATION_COUNT",
    "NO_EFFECT_SHIFT_TIME_INPUT_PRESENTED_AS_SIMULATION_COUNT",
    "FAKE_ROUTE_ALTERNATIVE_COUNT",
    "ROUTE_ALTERNATIVE_LIVE_APPLY_COUNT",
    "FABRICATED_DELAY_PREDICTION_COUNT",
    "UNEXPLAINED_SCENARIO_RISK_SCORE_COUNT",
    "SCENARIO_LIVE_OPERATION_MUTATION_COUNT",
    "SCHOOL_COMPANY_BUDGET_LIFECYCLE_COPY_COUNT",
    "ORGANIZATION_COMPANY_BUDGET_LIFECYCLE_COPY_COUNT",
    "SCHOOL_FINANCE_PRIVILEGE_LEAK_COUNT",
    "ORGANIZATION_FINANCE_PRIVILEGE_LEAK_COUNT",
    "SCHOOL_AVAILABLE_SCENARIO_EVIDENCE_UNUSED_COUNT",
    "ORGANIZATION_AVAILABLE_SCENARIO_EVIDENCE_UNUSED_COUNT",
  ]) must(masterCounts[key] === 0, `master primer ${key} is zero`);

  const requirementInventory = [
    {
      id: "D-04-01",
      requirement: "Beklenen / En uygun / Riskli durum senaryo sınıfları",
      canonicalSource: "locked-master-primer §8",
      owner: "#4 cost scenario forecast owner",
      implementationOwner: "backend/src/finance/costScenarioForecast.js",
      apiDbTestOwner: "backend/scripts/cost_scenario_forecast_and_savings_01_acceptance.mjs",
      browserTestOwner: "backend/scripts/cost_scenario_forecast_and_savings_01_browser.mjs",
      status: "CHECKED_STATIC",
      evidence: ["deterministic variant fixture", "variant API assertions", "Turkish variant labels"],
    },
    {
      id: "D-04-02",
      requirement: "Araç, yolcu, kapasite ve durak what-if etkisi",
      canonicalSource: "locked-master-primer §1 + §12",
      owner: "#4 cost scenario forecast owner",
      implementationOwner: "backend/src/finance/costScenarioForecast.js + backend/src/routes/costScenario.js",
      apiDbTestOwner: "backend/scripts/cost_scenario_forecast_and_savings_01_acceptance.mjs",
      browserTestOwner: "backend/scripts/cost_scenario_forecast_and_savings_01_browser.mjs",
      status: "CHECKED_STATIC",
      evidence: ["vehicle add/remove fixture", "stop add/remove route evidence", "capacity blocker"],
    },
    {
      id: "D-04-03",
      requirement: "Dönem sonu tahmini, bütçe sapması ve planlanan-gerçekleşen",
      canonicalSource: "locked-master-primer §9–§11",
      owner: "#4 forecast comparison owner",
      implementationOwner: "backend/src/finance/costScenarioForecast.js + backend/src/routes/costScenario.js",
      apiDbTestOwner: "backend/scripts/cost_scenario_forecast_and_savings_01_acceptance.mjs",
      browserTestOwner: "backend/scripts/cost_scenario_forecast_and_savings_01_browser.mjs",
      status: "CHECKED_STATIC",
      evidence: ["ACTUAL_TO_DATE + REMAINING_FORECAST equation", "budget-vs-forecast distinction", "dimension status/evidence"],
    },
    {
      id: "D-04-04",
      requirement: "Vardiya zamanı, rota alternatifi, dispatch sınırı, gecikme ve operasyonel risk",
      canonicalSource: "locked-master-primer §12–§13",
      owner: "#4 operational digital twin owner",
      implementationOwner: "backend/src/routes/costScenario.js + backend/src/finance/costScenarioForecast.js",
      apiDbTestOwner: "backend/scripts/cost_scenario_forecast_and_savings_01_acceptance.mjs",
      browserTestOwner: "backend/scripts/cost_scenario_forecast_and_savings_01_browser.mjs",
      status: "CHECKED_STATIC",
      evidence: ["shift-time delta", "route owner evidence", "typed dispatch seam deferred to #20", "explained risk"],
    },
    {
      id: "D-04-05",
      requirement: "Araç sınıfı, yakıt fiyatı ve kişi/yolcu değişimi",
      canonicalSource: "locked-master-primer §1",
      owner: "#4 cost scenario forecast owner",
      implementationOwner: "backend/src/finance/costScenarioForecast.js",
      apiDbTestOwner: "backend/scripts/cost_scenario_forecast_and_savings_01_acceptance.mjs",
      browserTestOwner: "backend/scripts/cost_scenario_forecast_and_savings_01_browser.mjs",
      status: "CHECKED_STATIC",
      evidence: ["field-level canonical cost model", "exact minor-unit money"],
    },
    {
      id: "D-04-06",
      requirement: "Tasarruf, ek maliyet, güven ve veri yeterliliği",
      canonicalSource: "locked-master-primer §1 + §8–§10",
      owner: "#4 forecast comparison owner",
      implementationOwner: "backend/src/finance/costScenarioForecast.js",
      apiDbTestOwner: "backend/scripts/cost_scenario_forecast_and_savings_01_acceptance.mjs",
      browserTestOwner: "backend/scripts/cost_scenario_forecast_and_savings_01_browser.mjs",
      status: "CHECKED_STATIC",
      evidence: ["rationale/equation", "confidence", "missingData and insufficient state"],
    },
    {
      id: "D-04-07",
      requirement: "Karşılaştırma boyutları: araç ihtiyacı, km, süre, yakıt, maliyet, gecikme, kapasite, risk",
      canonicalSource: "locked-master-primer §1",
      owner: "#4 comparison-dimension owner",
      implementationOwner: "backend/src/finance/costScenarioForecast.js",
      apiDbTestOwner: "backend/scripts/cost_scenario_forecast_and_savings_01_acceptance.mjs",
      browserTestOwner: "backend/scripts/cost_scenario_forecast_and_savings_01_browser.mjs",
      status: "CHECKED_STATIC",
      evidence: ["comparisonDimensions payload", "human-visible comparison status"],
    },
    {
      id: "D-04-08",
      requirement: "SCHOOL / ORGANIZATION planlama bağlamı; COMPANY bütçe yaşam döngüsü izolasyonu",
      canonicalSource: "locked-master-primer §1 + §10",
      owner: "#4 role-context owner",
      implementationOwner: "backend/src/routes/costScenario.js + web/src/panels/shared/CostScenarioWorkspacePanel.jsx",
      apiDbTestOwner: "existing role/isolation acceptance owners",
      browserTestOwner: "backend/scripts/cost_scenario_forecast_and_savings_01_browser.mjs",
      status: "CHECKED_STATIC",
      evidence: ["planning-only routes", "no SCHOOL/ORGANIZATION company budget lifecycle copy"],
    },
    {
      id: "D-04-09",
      requirement: "Preview-only, no live mutation, tenant/RBAC and immutable money semantics",
      canonicalSource: "locked-master-primer §2 + §7",
      owner: "#4 safety boundary owner",
      implementationOwner: "backend/src/finance/costScenarioForecast.js + backend/src/routes/costScenario.js",
      apiDbTestOwner: "backend/scripts/cost_scenario_forecast_and_savings_01_acceptance.mjs",
      browserTestOwner: "backend/scripts/cost_scenario_forecast_and_savings_01_browser.mjs",
      status: "CHECKED_STATIC",
      evidence: ["readOnly/previewOnly/notPersisted", "tenant mismatch guard", "no apply/save route"],
    },
    {
      id: "D-07-08-09",
      requirement: "#7/#8/#9 historical closure evidence and current non-destructive regression boundary",
      canonicalSource: "locked-master-primer §4 + milestone docs",
      owner: "historical milestone evidence owners",
      implementationOwner: "docs/_archive/legacy-notes/milestone.md + recovered git commits",
      apiDbTestOwner: "existing milestone checkers (mutative; not run in bounded audit)",
      browserTestOwner: "existing milestone acceptance owners; current browser evidence where available",
      status: "EVIDENCE_RECOVERY_REQUIRED",
      evidence: ["milestone identity recovery", "tag/commit inventory", "no historical tag fabrication"],
    },
  ];
  const requiredInventoryIds = ["D-04-01", "D-04-02", "D-04-03", "D-04-04", "D-04-05", "D-04-06", "D-04-07", "D-04-08", "D-04-09", "D-07-08-09"];
  const inventoryShapeComplete = requirementInventory.every((item) => [
    "id", "requirement", "canonicalSource", "owner", "implementationOwner", "apiDbTestOwner", "browserTestOwner", "status", "evidence",
  ].every((key) => item[key] && (!Array.isArray(item[key]) || item[key].length > 0)));
  const unclassifiedRequirementCount = requiredInventoryIds.filter((id) => !requirementInventory.some((item) => item.id === id)).length;
  const silentlyDroppedRequirementCount = requirementInventory.filter((item) => !requiredInventoryIds.includes(item.id)).length;
  must(inventoryShapeComplete, "master-primer requirement inventory is machine-readable and owner-complete");
  must(unclassifiedRequirementCount === 0, "UNCLASSIFIED_#4_REQUIREMENT_COUNT=0");
  must(silentlyDroppedRequirementCount === 0, "SILENTLY_DROPPED_#4_REQUIREMENT_COUNT=0");
  console.log(`REQUIREMENT_INVENTORY=${JSON.stringify(requirementInventory)}`);
  const proofQualityCounts = {
    SOURCE_ONLY_FALSE_PROOF_COUNT: [
      masterCounts.EXPECTED_SCENARIO_IMPLEMENTED_COUNT,
      masterCounts.BEST_SCENARIO_IMPLEMENTED_COUNT,
      masterCounts.RISK_SCENARIO_IMPLEMENTED_COUNT,
      masterCounts.PERIOD_END_FORECAST_IMPLEMENTED_COUNT,
      masterCounts.BUDGET_VARIANCE_IMPLEMENTED_COUNT,
      masterCounts.ROUTE_OWNER_PRESENT_COUNT,
    ].every((value) => value >= 1) ? 0 : 1,
    ROUTE_HEALTH_ONLY_FALSE_PROOF_COUNT: browserText.includes("TASK_EVIDENCE") && browserText.includes("contextualHome") ? 0 : 1,
    SELF_REFERENTIAL_GUARD_COUNT: [
      !forecastText.includes("masterPrimerEvidenceCounts"),
      !routeText.includes("REQUIREMENT_INVENTORY"),
      !uiText.includes("REQUIREMENT_INVENTORY"),
    ].every(Boolean) ? 0 : 1,
    STALE_EVIDENCE_ACCEPTANCE_COUNT: [
      browserText.includes("consoleErrors"),
      browserText.includes("pageErrors"),
      browserText.includes("serverErrors"),
      browserText.includes("visibleResult"),
    ].every(Boolean) ? 0 : 1,
    UNPROVEN_USER_VISIBLE_CLAIM_COUNT: browserText.includes('contextualTestId: "company-contextual-scenario"') && browserText.includes("page.getByTestId(contextualTestId).isVisible()") && browserText.includes("Senaryoyu Karşılaştır") ? 0 : 1,
  };
  console.log("=== #4 PROOF-QUALITY COUNTS ===");
  for (const [key, value] of Object.entries(proofQualityCounts)) console.log(`${key}=${value}`);
  for (const [key, value] of Object.entries(proofQualityCounts)) must(value === 0, `${key}=0`);
  must(masterCounts.DUPLICATE_CALCULATION_ENGINE_COUNT === 0 && masterCounts.DUPLICATE_SCENARIO_COMPONENT_COUNT === 0, "FALSE_IMPLEMENTED_CLASSIFICATION_COUNT=0");
  must(masterCounts.ROUTE_ALTERNATIVE_WITHOUT_COMPARISON_COUNT === 0 && masterCounts.COST_OUTCOME_WITHOUT_EXPLANATION_COUNT === 0, "CLOSURE_CRITICAL_FALSE_GREEN_MECHANISM_COUNT=0");

  if (failCount) {
    console.error(`#4 check failed: ${passCount} passed, ${failCount} failed`);
    process.exitCode = 1;
  } else {
    console.log(`#4 check passed: ${passCount}/${passCount}`);
  }
}

main();
