import test from "node:test";
import assert from "node:assert/strict";
import { baselinePlanText, selectedFinancialScenarioContext } from "./seferAbiCostAnalysisAssistant.js";
import { buildRoomFinancialDecisionExplanation } from "./financialScenarioContext.js";

test("financial assistant reads selected ROOM service ids from the live finance context", () => {
  assert.deepEqual(
    selectedFinancialScenarioContext({
      structuredFacts: { selectedAgreementId: 198, selectedShiftId: 276 },
    }),
    {
      focusAgreementId: 198,
      focusShiftId: 276,
      selectedScenarioId: null,
      selectedScenarioCostMinor: null,
      selectedScenarioPeriodPlanning: null,
      selectedOfferMinor: null,
      scenarioOverrides: {},
    },
  );
});

test("financial assistant falls back to the route-bound selected shift when facts are compacted", () => {
  assert.deepEqual(
    selectedFinancialScenarioContext({
      selectedEntityType: "shift",
      selectedEntityId: 19,
      structuredFacts: {},
    }),
    {
      focusAgreementId: null,
      focusShiftId: 19,
      selectedScenarioId: null,
      selectedScenarioCostMinor: null,
      selectedScenarioPeriodPlanning: null,
      selectedOfferMinor: null,
      scenarioOverrides: {},
    },
  );
});

test("financial assistant carries only the public selected scenario inputs forward", () => {
  assert.deepEqual(
    selectedFinancialScenarioContext({
      structuredFacts: {
        selectedAgreementId: 198,
        selectedShiftId: 276,
        selectedScenarioOverrides: {
          passengerCount: "25",
          vehicleType: "MINIBUS",
          vehicleCount: "2",
          fuelConsumptionLitersPer100Km: "24",
          comparisonCostMinor: 999999,
        },
      },
    }),
    {
      focusAgreementId: 198,
      focusShiftId: 276,
      selectedScenarioId: null,
      selectedScenarioCostMinor: null,
      selectedScenarioPeriodPlanning: null,
      selectedOfferMinor: null,
      scenarioOverrides: {
        passengerCount: 25,
        vehicleType: "MINIBUS",
        vehicleCount: 2,
        fuelConsumptionLitersPer100Km: 24,
      },
    },
  );
});

test("financial assistant leaves the canonical default untouched without a selected service", () => {
  assert.deepEqual(selectedFinancialScenarioContext({ structuredFacts: {} }), {
    focusAgreementId: null,
    focusShiftId: null,
    selectedScenarioId: null,
    selectedScenarioCostMinor: null,
    selectedScenarioPeriodPlanning: null,
    selectedOfferMinor: null,
    scenarioOverrides: {},
  });
});

test("financial assistant carries the selected period scenario without turning it into actual cost", () => {
  assert.deepEqual(
    selectedFinancialScenarioContext({
      structuredFacts: {
        selectedScenarioId: "scn_demo_413",
        selectedScenarioCostMinor: 2_333_803,
        selectedOfferMinor: 3_500_000,
        selectedScenarioPeriodPlanning: {
          periodStart: "2026-11-17",
          periodEnd: "2026-11-21",
          periodPlanningCostMinor: 2_333_803,
          periodCostReady: true,
          missing: [],
        },
      },
    }),
    {
      focusAgreementId: null,
      focusShiftId: null,
      selectedScenarioId: "scn_demo_413",
      selectedScenarioCostMinor: 2_333_803,
      selectedOfferMinor: 3_500_000,
      selectedScenarioPeriodPlanning: {
        periodStart: "2026-11-17",
        periodEnd: "2026-11-21",
        periodPlanningCostMinor: 2_333_803,
        periodCostReady: true,
        missing: [],
      },
      scenarioOverrides: {},
    },
  );
});

test("Sefer Abi uses selected scenario values in the current plan summary", () => {
  const result = baselinePlanText(
    {
      source: { label: "Seçili vardiya" },
      input: { vehicleCount: 1, passengerCount: 40, stopCount: 2, serviceDistanceKm: 5.83, routeDurationMinutes: 11, serviceDayCount: 1 },
    },
    { passengerCount: 35, vehicleCount: 1 },
  );

  assert.match(result, /Yolcu: 35 kişi/u);
  assert.doesNotMatch(result, /Yolcu: 40 kişi/u);
});

test("ROOM financial decision explanation reports the selected canonical gross cost", () => {
  const result = buildRoomFinancialDecisionExplanation({
    user: { role: "ROOM", roomId: 21 },
    message: "Benim maliyetim ne, önerdiğin fiyat neden farklı?",
    questionIntent: "OFFER_PROFITABILITY",
    screenContext: {
      path: "/room/financial-operations",
      structuredFacts: {
        roomId: 21,
        selectedShiftId: 367,
        selectedAgreementId: 209,
        periodStart: "2026-10-30",
        periodEnd: "2026-11-05",
        selectedVehicleLabel: "SPD01",
      },
    },
    decisionLayer: {
      newOfferDecision: { status: "NOT_PROVEN", distributedActualCostMinor: 302000 },
      contractMonthDecision: {
        agreementId: 209,
        periodStart: "2026-10-30",
        periodEnd: "2026-11-05",
      },
    },
    financePreview: {
      currencyCode: "TRY",
      roomProfitability: {
        actualOperationalCostMinor: 1049000,
      },
    },
    commercialContext: { type: "AGREEMENT", id: 209, roomOfferAmount: 10000000 },
  });

  assert.equal(result.handled, true);
  assert.match(result.resultText, /10\.490,00 TL/u);
  assert.match(result.resultText, /kesin net kâr değildir/u);
});

test("service-cost Sefer Abi context uses the selected service decision before an unrelated quote preview", () => {
  const result = buildRoomFinancialDecisionExplanation({
    user: { role: "ROOM", roomId: 1 },
    message: "Benim maliyetim ne, önerdiğin fiyat neden farklı?",
    questionIntent: "OFFER_PROFITABILITY",
    screenContext: {
      path: "/room/financial-operations",
      structuredFacts: {
        roomId: 1,
        financeView: "service-cost",
        selectedVehicleId: 1,
        selectedShiftId: 3,
        selectedAgreementId: 1,
        periodStart: "2026-09-01",
        periodEnd: "2026-09-30",
      },
    },
    decisionLayer: {
      contractMonthDecision: {
        agreementId: 1,
        periodStart: "2026-09-01",
        periodEnd: "2026-09-30",
        earnedRevenueMinor: 14_000_000,
        realizedActualCostMinor: 2_390_000,
        activityResultMinor: 11_610_000,
        collectedCashMinor: 8_000_000,
        blockers: ["VAT_UNKNOWN_OR_NET_PROFIT_NOT_PROVEN"],
      },
      newOfferDecision: {
        quoteFloorMinor: 1_141_875,
        baselineOperationalCostMinor: 870_000,
      },
    },
    financePreview: { currencyCode: "TRY" },
  });

  assert.equal(result.handled, true);
  assert.match(result.resultText, /23\.900,00 TL/u);
  assert.match(result.resultText, /140\.000,00 TL/u);
  assert.match(result.resultText, /kesin net kâr değildir/u);
  assert.doesNotMatch(result.reasonText, /Tam operasyon kapsamı doğrulanmadı/u);
  assert.doesNotMatch(result.resultText, /Yeni anlaşma için kanonik teklif tabanı/u);
  assert.doesNotMatch(result.resultText, /11\.418,75 TL/u);
});

test("ROOM financial decision explanation does not relabel planning baseline as actual cost", () => {
  const result = buildRoomFinancialDecisionExplanation({
    user: { role: "ROOM", roomId: 1 },
    message: "Eksik maliyet bilgisi neden gösteriliyor?",
    questionIntent: "",
    screenContext: {
      path: "/room/financial-operations",
      structuredFacts: {
        roomId: 1,
        vehicleId: 2,
        periodStart: "2026-11-01",
        periodEnd: "2026-11-30",
        actualCostMinor: null,
      },
    },
    decisionLayer: {
      vehicleMonthDecision: {
        vehicleId: 2,
        distributedActualCostMinor: null,
        grossActualCostMinor: null,
        earnedRevenueMinor: null,
        activityResultMinor: null,
        costComponents: [],
        sourceEntryIds: [],
      },
      contractMonthDecision: {},
      newOfferDecision: {},
    },
    financePreview: {
      currencyCode: "TRY",
      baselineOperationalCostMinor: 5611,
      roomProfitability: { actualOperationalCostMinor: null },
    },
  });

  assert.equal(result.handled, true);
  assert.doesNotMatch(result.resultText, /56,11 TL/u);
  assert.doesNotMatch(result.resultText, /dağıtılmış gerçekleşmiş maliyet 56,11 TL/u);
  assert.match(result.resultText, /gerçekleşmiş maliyet kanıtı|maliyet kanıtı|kesinleşmedi/u);
});

test("ROOM new-offer explanation does not expose a stale actual cost when the selected service has no actual evidence", () => {
  const result = buildRoomFinancialDecisionExplanation({
    user: { role: "ROOM", roomId: 1 },
    message: "Bu hizmetin maliyeti neden kesinleşmedi?",
    questionIntent: "OFFER_PROFITABILITY",
    screenContext: {
      path: "/room/financial-operations",
      structuredFacts: {
        roomId: 1,
        selectedShiftId: 43,
        selectedVehicleId: 2,
        actualCostMinor: null,
      },
    },
    decisionLayer: {
      newOfferDecision: { status: "NOT_PROVEN", grossActualCostMinor: 5611 },
      vehicleMonthDecision: { vehicleId: 2, grossActualCostMinor: 5611 },
      contractMonthDecision: {},
    },
    financePreview: {
      currencyCode: "TRY",
      baselineOperationalCostMinor: 5611,
      roomProfitability: { actualOperationalCostMinor: 5611 },
    },
  });

  assert.equal(result.handled, true);
  assert.doesNotMatch(result.resultText, /56,11 TL/u);
  assert.doesNotMatch(result.resultText, /Gerçekleşen maliyet/u);
  assert.match(result.resultText, /doğrulanabilir maliyet|fiyat uydurmuyorum/u);
});
