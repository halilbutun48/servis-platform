import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCommercialReferenceText,
  buildRoomCanonicalRoutePlanningInputs,
  mergeRoomCanonicalPlanningInputs,
  buildRoomQuoteFloorInputsForSelectedContext,
  publicVehiclePlanFleetAvailabilitySummary,
  resolveAuthorizedActualCostMinor,
  costCompleteness,
  isCompanyBudgetDraftStatusQuestion,
  buildCompanyBudgetDraftStatusResponse,
  buildForecastPlanningShareExplanation,
  isCostScenarioPreviewTruthQuestion,
  isCostScenarioPreviewMissingDataQuestion,
} from "./seferAbiCostAnalysisAssistant.js";

test("Maliyet Senaryosu önizlemesi ödeme veya kesin kâr olarak yorumlanmaz", () => {
  assert.equal(isCostScenarioPreviewTruthQuestion({
    screenPath: "/room/cost-scenarios",
    message: "Bu senaryo gerçekleşmiş ödeme veya kesin kâr mı?",
  }), true);
  assert.equal(isCostScenarioPreviewTruthQuestion({
    screenPath: "/room/financial-operations",
    message: "Bu senaryo gerçekleşmiş ödeme veya kesin kâr mı?",
  }), false);
});

test("Maliyet Senaryosu takip sorusu bakım ve KDV eksikliğini açıklar", () => {
  assert.equal(isCostScenarioPreviewMissingDataQuestion({
    screenPath: "/room/cost-scenarios",
    message: "Peki eksik bakım maliyeti ve KDV ne anlama geliyor?",
  }), true);
});

test("Sefer Abi explains a ROOM forecast allocation as planning-only and not definitive profit", () => {
  const text = buildForecastPlanningShareExplanation({
    forecastAllocation: {
      status: "READY",
      sourceScopeAmountMinor: 346399,
      allocatedAmountMinor: 346399,
      grossAmountMinor: 194247,
      pendingAmountMinor: 152152,
      unallocatedAmountMinor: 0,
    },
    currencyCode: "TRY",
    actualCostMinor: null,
  });

  assert.match(text, /1\.942,47/);
  assert.match(text, /3\.463,99/);
  assert.match(text, /yalnızca.*planlama/i);
  assert.match(text, /gerçekleşmiş.*değil/i);
  assert.match(text, /kesin.*kâr/i);
});

test("Sefer Abi explains when every ROOM vehicle alternative is blocked by the real fleet", () => {
  const summary = publicVehiclePlanFleetAvailabilitySummary({
    items: [
      {
        vehicleLabel: "Minibüs",
        requiredVehicleCount: 2,
        availability: { availabilityScope: "ROOM_FLEET", availableVehicleCount: 1, availableDriverCount: 1, availableForPlan: false },
      },
      {
        vehicleLabel: "Otobüs",
        requiredVehicleCount: 1,
        availability: { availabilityScope: "ROOM_FLEET", availableVehicleCount: 0, availableDriverCount: 1, availableForPlan: false },
      },
    ],
  });

  assert.match(summary, /Minibüs: ROOM filosunda 1 aktif araç ve 1 sürücü var; plan 2 araç ve 2 sürücü gerektiriyor/);
  assert.match(summary, /Otobüs: ROOM filosunda 0 aktif araç ve 1 sürücü var; plan 1 araç ve 1 sürücü gerektiriyor/);
  assert.match(summary, /plan yayımlanmadı/);
});

test("Sefer Abi omits fleet warning when no ROOM fleet evidence is present", () => {
  assert.equal(publicVehiclePlanFleetAvailabilitySummary({ items: [{ vehicleLabel: "Minibüs", requiredVehicleCount: 2 }] }), "");
});

test("Sefer Abi does not publish zero-valued plan or offer amounts when cost evidence is incomplete", () => {
  const text = buildCommercialReferenceText({
    scope: "ROOM",
    message: "Bu hizmetin maliyeti neden kesinleşmedi?",
    currentCanonicalCostMinor: 0,
    currentCanonicalCostLabel: "Seçili senaryo planlama maliyeti",
    currentOfferMinor: 0,
    recommendedOfferMinor: 0,
  });

  assert.doesNotMatch(text, /₺0,00/);
  assert.doesNotMatch(text, /Seçili senaryo planlama maliyeti/);
  assert.doesNotMatch(text, /Seçili taşımacı teklifi/);
  assert.match(text, /Karşılaştırılabilir kabul edilmiş geçmiş fiyat kanıtı bulunamadı/);
});

test("Sefer Abi keeps positive canonical amounts and their planning difference", () => {
  const text = buildCommercialReferenceText({
    scope: "ROOM",
    message: "Bu hizmetin maliyeti nedir?",
    currentCanonicalCostMinor: 123450,
    currentCanonicalCostLabel: "Güncel kanonik planlama maliyeti",
    currentOfferMinor: 150000,
  });

  assert.match(text, /Güncel kanonik planlama maliyeti: ₺1\.234,50/);
  assert.match(text, /Seçili taşımacı teklifi: ₺1\.500,00/);
  assert.match(text, /Teklif ile planlama maliyeti arasındaki fark: ₺265,50/);
});

test("Sefer Abi labels an incomplete quote floor as a non-definitive planning preview", () => {
  const text = buildCommercialReferenceText({
    scope: "ROOM",
    message: "Bu hizmetin teklif tabanı nedir?",
    recommendedOfferMinor: 7537,
    quoteFloorEvidence: {
      baselineSource: "incomplete",
      missingFields: [],
    },
  });

  assert.match(text, /Kısmi planlama teklif önizlemesi: ₺75,37/);
  assert.match(text, /kesin teklif tabanı değildir/);
  assert.doesNotMatch(text, /Yeni anlaşma için doğrulanmış teklif tabanı/);
});

test("Sefer Abi reuses a matching ROOM quote draft for the selected contractless shift", () => {
  const inputs = buildRoomQuoteFloorInputsForSelectedContext({
    selectedShiftId: 19,
    selectedVehicleId: 1,
    selectedAgreementId: null,
    structuredFacts: {
      manualBaselineOperationalCostMinor: null,
      targetContributionBps: null,
      riskReserveBps: null,
      quoteScenarioAmountMinor: null,
    },
    quoteDraft: {
      id: 2,
      roomId: 1,
      targetContributionBps: 2000,
      riskReserveBps: 500,
      inputSnapshot: {
        serviceContext: { roomId: 1, shiftId: 19, vehicleId: 1, agreementId: null },
        computed: {
          planningInputs: {
            fuelType: "DIESEL",
            fuelConsumptionLitersPer100Km: "21",
            fuelUnitPriceMinor: "10050",
            vehicleLeaseMonthlyMinor: "600000",
          },
        },
      },
    },
  });

  assert.equal(inputs.targetContributionBps, 2000);
  assert.equal(inputs.riskReserveBps, 500);
  assert.equal(inputs.fuelType, "DIESEL");
  assert.equal(inputs.fuelUnitPriceMinor, "10050");
  assert.equal(inputs.vehicleLeaseMonthlyMinor, "600000");
});

test("Sefer Abi does not reuse an incomplete draft's computed baseline over the live preview", () => {
  const inputs = buildRoomQuoteFloorInputsForSelectedContext({
    selectedShiftId: 19,
    selectedVehicleId: 1,
    structuredFacts: {
      plannedCostMinor: 25741,
      manualBaselineOperationalCostMinor: null,
    },
    quoteDraft: {
      id: 2,
      baselineSource: "incomplete",
      manualBaselineOperationalCostMinor: null,
      inputSnapshot: {
        serviceContext: { shiftId: 19, vehicleId: 1 },
        computed: { baselineOperationalCostMinor: 5741 },
      },
    },
  });

  assert.equal(inputs.manualBaselineOperationalCostMinor, null);
});

test("Sefer Abi carries draft planning inputs into the canonical cost owner but not stale computed totals", () => {
  const inputs = mergeRoomCanonicalPlanningInputs({
    baselineInput: { serviceDistanceKm: 2.724 },
    quoteFloorInputs: {
      fuelType: "DIESEL",
      fuelConsumptionLitersPer100Km: "21",
      fuelUnitPriceMinor: "10050",
      vehicleLeaseMonthlyMinor: "600000",
      baselineOperationalCostMinor: 5741,
      quoteFloorMinor: 7537,
      baselineSource: "incomplete",
    },
    reusableProfileInputs: {
      fixedVehicleCostMonthlyMinor: 600000,
      allocationServiceDaysPerMonth: 30,
      vehicleFixedCostAllocationMode: "per_service_day",
    },
  });

  assert.equal(inputs.fuelUnitPriceMinor, "10050");
  assert.equal(inputs.vehicleLeaseMonthlyMinor, "600000");
  assert.equal(inputs.fixedVehicleCostMonthlyMinor, undefined);
  assert.equal(inputs.baselineOperationalCostMinor, undefined);
  assert.equal(inputs.quoteFloorMinor, undefined);
  assert.equal(inputs.baselineSource, undefined);
});

test("Sefer Abi applies a reusable fixed-cost profile when no ownership input exists", () => {
  const inputs = mergeRoomCanonicalPlanningInputs({
    quoteFloorInputs: { fuelType: "DIESEL" },
    reusableProfileInputs: {
      fixedVehicleCostMonthlyMinor: 600000,
      allocationServiceDaysPerMonth: 30,
      vehicleFixedCostAllocationMode: "per_service_day",
    },
  });

  assert.equal(inputs.fixedVehicleCostMonthlyMinor, 600000);
  assert.equal(inputs.allocationServiceDaysPerMonth, 30);
});

test("Sefer Abi uses the canonical rounded route snapshot instead of raw legacy distance", () => {
  const inputs = buildRoomCanonicalRoutePlanningInputs({
    routeSnapshotDistanceM: 2724,
    pattern: "ONE_WAY",
  });

  assert.deepEqual(inputs.canonicalRoute, {
    serviceDistanceKm: 2.72,
    totalDistanceKm: 2.72,
    emptyDistanceKm: null,
    source: "DB_ROUTE_SNAPSHOT",
  });
  assert.equal(inputs.serviceDistanceKm, 2.72);
  assert.equal(inputs.totalDistanceKm, 2.72);
});

test("Sefer Abi ignores a quote draft from another selected ROOM shift", () => {
  const inputs = buildRoomQuoteFloorInputsForSelectedContext({
    selectedShiftId: 19,
    selectedVehicleId: 1,
    structuredFacts: {},
    quoteDraft: {
      id: 1,
      roomId: 1,
      targetContributionBps: 2000,
      riskReserveBps: 500,
      inputSnapshot: {
        serviceContext: { roomId: 1, shiftId: 3, vehicleId: 1 },
        computed: { planningInputs: { fuelType: "DIESEL" } },
      },
    },
  });

  assert.equal(inputs.targetContributionBps, null);
  assert.equal(inputs.fuelType, undefined);
});

test("Sefer Abi does not promote a planning preview to actual cost when ROOM facts explicitly say actual is missing", () => {
  assert.equal(
    resolveAuthorizedActualCostMinor({
      scope: "ROOM",
      screenContext: { structuredFacts: { actualCostMinor: null } },
      financePreview: { roomProfitability: { actualOperationalCostMinor: 5611 } },
      actualCostFallbackMinor: 5611,
    }),
    null,
  );
});

test("Sefer Abi preserves authorized ROOM actual cost when the screen supplies it", () => {
  assert.equal(
    resolveAuthorizedActualCostMinor({
      scope: "ROOM",
      screenContext: { structuredFacts: { actualCostMinor: 1500000 } },
      financePreview: { roomProfitability: { actualOperationalCostMinor: 5611 } },
      actualCostFallbackMinor: 5611,
    }),
    1500000,
  );
});

test("Sefer Abi does not treat a zero decision fallback as actual evidence", () => {
  assert.equal(
    resolveAuthorizedActualCostMinor({
      scope: "ROOM",
      screenContext: { structuredFacts: {} },
      financePreview: { roomProfitability: { actualOperationalCostMinor: null } },
      actualCostFallbackMinor: 0,
    }),
    null,
  );
});

test("Sefer Abi does not promote missing COMPANY actual evidence to zero-valued actual cost", () => {
  const result = costCompleteness({
    scope: "COMPANY",
    baseline: { actualEvidence: { actualCostMinor: null, provenance: "#3_NO_COMPARABLE_INTERNAL_ACTUAL" } },
    scenarioPreview: {
      scenario: { costMinor: 4700, componentBreakdown: [] },
      costCoverage: { scenario: { status: "PARTIAL", missingOptionalCosts: [] } },
    },
    referenceLayers: { layers: [] },
  });

  assert.equal(result.actualCostMinor, null);
  assert.notEqual(result.costLevel, "ACTUAL");
});

test("Sefer Abi explains why a selected COMPANY budget remains a draft", () => {
  const screenContext = {
    path: "/company/financial-operations",
    structuredFacts: {
      selectedBudgetPlanId: 1,
      budgetStatus: "DRAFT",
      budgetAmountMinor: 7000000,
      budgetCurrencyCode: "TRY",
      periodStart: "2026-10-01",
      periodEnd: "2026-10-31",
    },
  };
  assert.equal(isCompanyBudgetDraftStatusQuestion({
    role: "COMPANY",
    screenPath: screenContext.path,
    screenContext,
    message: "Bütçe #1 neden taslak?",
  }), true);
  const response = buildCompanyBudgetDraftStatusResponse({ screenContext });
  assert.match(response.reply, /henüz aktifleştirilmemiş/u);
  assert.match(response.reply, /Bütçeyi gönder/u);
  assert.doesNotMatch(response.reply, /Gerçekleşen maliyet/u);
  assert.doesNotMatch(response.reply, /hakediş.*fatura.*ödeme.*oluşturdu/iu);
  const followUp = buildCompanyBudgetDraftStatusResponse({
    screenContext,
    message: "Peki gerçekleşen harcama var mı?",
  });
  assert.match(followUp.reply, /Doğrulanmış gerçekleşen harcama.*Doğrulanmadı/iu);
  assert.doesNotMatch(followUp.reply, /Gerçekleşen maliyet:/u);
});
