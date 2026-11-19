import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as presentation from "./roomProfitabilityPresentation.js";
import {
  buildRoomDecisionLayerDisplay,
  buildRoomDecisionRequestParams,
  buildRoomProfitabilityDisplay,
  resolveOperationalDecisionForScope,
  resultToneForMinor,
  effectiveOperationalDecisionCost,
  describePlanningBucket,
  accountingPeriodStatusLabel,
  accountingPeriodBlockerLabel,
  buildPeriodPlanningDisplay,
  resolveSelectedScenarioPeriodPlanning,
  scenarioVariantDecisionDisplay,
} from "./roomProfitabilityPresentation.js";

test("eksik maliyet kanıtı en uygun plan tutarını yayımlamaz", () => {
  const partial = scenarioVariantDecisionDisplay({
    variant: { estimatedCost: 2333901, rationale: "Otobüs" },
    costCoverageStatus: "PARTIAL",
  });
  assert.equal(partial.estimatedCost, null);
  assert.match(partial.rationale, /Eksik maliyet kanıtı/);
  assert.equal(partial.tone, "warm");

  const complete = scenarioVariantDecisionDisplay({
    variant: { estimatedCost: 2333901, rationale: "Tam kanıt" },
    costCoverageStatus: "COMPLETE",
  });
  assert.equal(complete.estimatedCost, 2333901);
  assert.equal(complete.tone, "good");
});

test("vehicle comparison can fall back to the matching vehicle-period decision cost", () => {
  assert.equal(typeof presentation.resolveVehicleComparisonCostMinor, "function");
  const resolve = presentation.resolveVehicleComparisonCostMinor;

  assert.equal(resolve({
    primaryCostMinor: null,
    vehicleMonthDecision: {
      vehicleId: 1,
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
      grossActualCostMinor: 22_685_000,
    },
    focus: {
      vehicleId: 1,
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
    },
  }), 22_685_000);

  assert.equal(resolve({
    primaryCostMinor: 0,
    vehicleMonthDecision: { vehicleId: 1, periodStart: "2026-09-01", periodEnd: "2026-09-30", grossActualCostMinor: 22_685_000 },
    focus: { vehicleId: 1, periodStart: "2026-09-01", periodEnd: "2026-09-30" },
  }), 0);

  assert.equal(resolve({
    primaryCostMinor: null,
    vehicleMonthDecision: { vehicleId: 1, periodStart: "2026-09-01", periodEnd: "2026-09-30", grossActualCostMinor: 22_685_000 },
    focus: {
      vehicleId: 99,
      periodStart: "2026-10-01",
      periodEnd: "2026-10-31",
      filterVehicleId: 1,
      filterPeriodStart: "2026-09-01",
      filterPeriodEnd: "2026-09-30",
    },
  }), 22_685_000);

  assert.equal(resolve({
    primaryCostMinor: null,
    vehicleMonthDecision: { vehicleId: 2, periodStart: "2026-09-01", periodEnd: "2026-09-30", grossActualCostMinor: 22_685_000 },
    focus: { vehicleId: 1, periodStart: "2026-09-01", periodEnd: "2026-09-30" },
  }), null);

  assert.equal(resolve({
    primaryCostMinor: null,
    vehicleMonthDecision: { vehicleId: 1, periodStart: "2026-09-01", periodEnd: "2026-09-30", grossActualCostMinor: 22_685_000 },
    focus: { vehicleId: 1, periodStart: "2026-10-01", periodEnd: "2026-10-31" },
  }), null);
});

test("service summary uses the selected service cost instead of the vehicle-wide total", () => {
  assert.equal(effectiveOperationalDecisionCost({
    decision: { grossActualCostMinor: 22685000 },
    costOverrideMinor: 4450761,
  }), 4450761);
  assert.equal(effectiveOperationalDecisionCost({
    decision: { grossActualCostMinor: 12335000 },
  }), 12335000);
});

test("service summary uses the selected service revenue and result scope", () => {
  const selectedService = resolveOperationalDecisionForScope({
    vehicleMonthDecision: {
      earnedIncomeMinor: 36_000_000,
      grossActualCostMinor: 4_090_000,
      activityResultMinor: 31_910_000,
    },
    contractMonthDecision: {
      agreementId: 1,
      earnedRevenueMinor: 14_000_000,
      realizedActualCostMinor: 2_390_000,
      activityResultMinor: 11_610_000,
    },
    serviceCostScope: { selectedAgreementId: 1, selectedShiftId: 3 },
    selectedServiceShift: {
      id: 3,
      agreementId: 1,
      companyId: 1,
      startAt: "2026-09-15T06:00:00.000Z",
      endAt: "2026-09-15T14:00:00.000Z",
      status: "DONE",
      routeSnapshotDistanceM: 6250,
    },
    selectedServiceAgreement: {
      id: 1,
      companyId: 1,
      company: { id: 1, name: "DemoCompany" },
    },
  });

  assert.equal(selectedService.realizedShiftCount, 1);
  assert.deepEqual(selectedService.shiftIds, [3]);
  assert.equal(selectedService.verifiedUsageMinutes, 480);
  assert.equal(selectedService.verifiedDistanceM, 6250);
  assert.equal(selectedService.earnedRevenueMinor, 14_000_000);
  assert.equal(selectedService.earnedIncomeMinor, 14_000_000);
  assert.equal(selectedService.realizedActualCostMinor, 2_390_000);
  assert.equal(selectedService.grossActualCostMinor, 2_390_000);
  assert.equal(selectedService.distributedActualCostMinor, 2_390_000);
  assert.equal(selectedService.activityResultMinor, 11_610_000);
  assert.deepEqual(selectedService.customerIds, [1]);
  assert.deepEqual(selectedService.customerLabels, [{ id: 1, name: "DemoCompany" }]);

  const vehicleWide = resolveOperationalDecisionForScope({
    vehicleMonthDecision: { earnedIncomeMinor: 36_000_000 },
    contractMonthDecision: { earnedRevenueMinor: 14_000_000 },
    serviceCostScope: null,
  });
  assert.equal(vehicleWide.earnedIncomeMinor, 36_000_000);
});

test("focused finance preview carries the selected period into server decision inputs", () => {
  const params = buildRoomDecisionRequestParams({
    form: { targetContributionBps: "2000" },
    focusedContext: true,
    roomCostFocus: {
      vehicleId: 1,
      shiftId: 318,
      agreementId: 202,
      periodStart: "2026-12-01",
      periodEnd: "2026-12-31",
    },
  });

  assert.deepEqual(params, {
    targetContributionBps: "2000",
    focusVehicleId: 1,
    focusShiftId: 318,
    focusAgreementId: 202,
    focusPeriodStart: "2026-12-01",
    focusPeriodEnd: "2026-12-31",
  });
});

test("focused finance preview preserves the selected open offer identity", () => {
  const params = buildRoomDecisionRequestParams({
    focusedContext: true,
    roomCostFocus: {
      focusOfferId: 13,
      shiftId: 16,
      periodStart: "2026-11-09",
      periodEnd: "2026-11-09",
    },
  });

  assert.equal(params.focusOfferId, 13);
  assert.equal(params.focusShiftId, 16);
  assert.equal(params.focusPeriodStart, "2026-11-09");
  assert.equal(params.focusPeriodEnd, "2026-11-09");
});

test("service-cost view can require an explicit service without inventing a selection", () => {
  const params = buildRoomDecisionRequestParams({
    focusedContext: true,
    serviceCostContextRequired: true,
    roomCostFocus: {},
  });

  assert.deepEqual(params, {
    serviceCostContextRequired: "true",
  });
});

test("operational filters stay separate from the selected service context", () => {
  const params = buildRoomDecisionRequestParams({
    focusedContext: true,
    roomCostFocus: {
      vehicleId: 1,
      agreementId: 195,
      filterVehicleId: 3,
      filterDriverId: 2,
      filterPeriodStart: "2026-09-01",
      filterPeriodEnd: "2026-09-30",
      operationalScope: "realized",
    },
  });

  assert.deepEqual(params, {
    focusVehicleId: 1,
    focusAgreementId: 195,
    filterVehicleId: 3,
    filterDriverId: 2,
    filterPeriodStart: "2026-09-01",
    filterPeriodEnd: "2026-09-30",
    operationalScope: "realized",
  });
});

test("decision layer keeps source categories and unknown values visible without zero fallbacks", () => {
  const display = buildRoomDecisionLayerDisplay({
    vehicleMonthDecision: {
      status: "NOT_PROVEN",
      earnedIncomeMinor: null,
      grossActualCostMinor: 410000,
      distributedActualCostMinor: 300000,
      activityResultMinor: null,
      confirmedNetProfitMinor: null,
      costComponents: [
        { categoryKey: "FUEL", amountMinor: 120000, sourceEntryIds: [325] },
        { categoryKey: "DRIVER", amountMinor: 180000, sourceEntryIds: [328] },
      ],
      missing: ["earnedIncomeEvidence", "emptyDistanceKm"],
      blockers: ["VAT_UNKNOWN_OR_NET_PROFIT_NOT_PROVEN"],
    },
  });

  assert.equal(display.vehicle.statusLabel, "Kesinleştirilemedi");
  assert.equal(display.vehicle.earnedIncomeMinor, null);
  assert.equal(display.vehicle.activityResultMinor, null);
  assert.deepEqual(display.vehicle.costComponents.map((item) => item.label), ["Yakıt", "Sürücü"]);
  assert.deepEqual(display.vehicle.missingLabels, ["Kazanılmış dönem geliri", "Boş kilometre bilgisi"]);
  assert.deepEqual(display.vehicle.blockerLabels, ["KDV durumu bilinmiyor; kesin net kâr doğrulanmadı"]);
});

test("vehicle decision does not infer revenue from an agreement-only relation", () => {
  const display = buildRoomDecisionLayerDisplay({
    vehicleMonthDecision: {
      status: "PROVISIONAL_ACTIVITY_RESULT",
      vehicleId: 1,
      earnedIncomeMinor: 36_000_000,
      grossActualCostMinor: 4_090_000,
      activityResultMinor: 31_910_000,
      incomeEvidence: {
        lines: [{
          agreementId: 1,
          amountMinor: 14_000_000,
          relationStatus: "UNIQUE_AGREEMENT_VEHICLE",
          counted: true,
        }],
      },
    },
  });

  assert.equal(display.vehicle.earnedIncomeMinor, null);
  assert.equal(display.vehicle.earnedRevenueMinor, null);
  assert.equal(display.vehicle.activityResultMinor, null);
  assert.equal(display.vehicle.incomeAttributionStatus, "NOT_PROVEN");
  assert.match(display.vehicle.blockerLabels.join(" "), /Kazanılmış gelirin araç ilişkisi eksik/);
});

test("vehicle decision keeps explicitly attributed income available", () => {
  const display = buildRoomDecisionLayerDisplay({
    vehicleMonthDecision: {
      status: "PROVISIONAL_ACTIVITY_RESULT",
      vehicleId: 1,
      earnedIncomeMinor: 14_000_000,
      grossActualCostMinor: 2_390_000,
      activityResultMinor: 11_610_000,
      incomeEvidence: [{
        agreementId: 1,
        shiftId: 3,
        vehicleId: 1,
        amountMinor: 14_000_000,
        relationStatus: "DIRECT_SHIFT",
        counted: true,
      }],
      shiftIds: [3],
    },
  });

  assert.equal(display.vehicle.incomeAttributionStatus, "PROVEN");
  assert.equal(display.vehicle.earnedIncomeMinor, 14_000_000);
  assert.equal(display.vehicle.activityResultMinor, 11_610_000);
});

test("vehicle decision requires a unique vehicle scope before showing a result", () => {
  const display = buildRoomDecisionLayerDisplay({
    vehicleMonthDecision: {
      status: "PROVISIONAL_ACTIVITY_RESULT",
      vehicleIds: [1],
      earnedIncomeMinor: 36_000_000,
      grossActualCostMinor: 4_090_000,
      activityResultMinor: 31_910_000,
      incomeEvidence: [{
        agreementId: 1,
        amountMinor: 14_000_000,
        relationStatus: "UNIQUE_AGREEMENT_VEHICLE",
        counted: true,
      }],
    },
  });

  assert.equal(display.vehicle.status, "NOT_PROVEN");
  assert.equal(display.vehicle.activityResultMinor, null);
});

test("decision layer exposes verified usage without presenting unknown capacity as idle", () => {
  const display = buildRoomDecisionLayerDisplay({
    vehicleMonthDecision: {
      status: "PROVISIONAL_ACTIVITY_RESULT",
      operationalCoverage: {
        vehicle: {
          status: "UNKNOWN",
          verifiedUsageMinutes: 120,
          verifiedIdleMinutes: null,
          unknownScope: true,
          coverageComplete: false,
        },
      },
      missing: ["operationalCoverage"],
      blockers: ["OPERATIONAL_COVERAGE_NOT_PROVEN"],
    },
  });

  assert.equal(display.vehicle.operationalCoverage.statusLabel, "Dönemin tamamı doğrulanmadı");
  assert.equal(display.vehicle.operationalCoverage.verifiedUsageMinutes, 120);
  assert.equal(display.vehicle.operationalCoverage.verifiedIdleMinutes, null);
  assert.equal(display.vehicle.operationalCoverage.unknownScope, true);
  assert.deepEqual(display.vehicle.missingLabels, ["Aylık çalışma kapsamı"]);
  assert.deepEqual(display.vehicle.blockerLabels, ["Aylık çalışma kapsamı doğrulanmadı; kalan süre boş kabul edilmedi"]);
});

test("decision layer preserves the selected driver's cross-vehicle coverage separately", () => {
  const display = buildRoomDecisionLayerDisplay({
    vehicleMonthDecision: {
      vehicleId: 1,
      driverId: 1,
      operationalCoverage: {
        vehicle: {
          subjectKind: "VEHICLE",
          subjectId: 1,
          status: "UNKNOWN",
          verifiedUsageMinutes: 120,
          verifiedIdleMinutes: null,
          unknownScope: true,
          coverageComplete: false,
        },
        drivers: [{
          subjectKind: "DRIVER",
          subjectId: 1,
          status: "UNKNOWN",
          verifiedUsageMinutes: 360,
          verifiedIdleMinutes: null,
          unknownScope: true,
          coverageComplete: false,
        }],
      },
      missing: ["operationalCoverage"],
      blockers: ["OPERATIONAL_COVERAGE_NOT_PROVEN"],
      confirmedNetProfitMinor: null,
    },
  });

  assert.equal(display.vehicle.operationalCoverage.verifiedUsageMinutes, 120);
  assert.equal(display.vehicle.driverOperationalCoverage.verifiedUsageMinutes, 360);
  assert.equal(display.vehicle.driverOperationalCoverage.statusLabel, "Dönemin tamamı doğrulanmadı");
  assert.equal(display.vehicle.driverOperationalCoverage.unknownScope, true);
});

test("decision display explains that an open accounting period blocks confirmation", () => {
  const display = buildRoomDecisionLayerDisplay({
    vehicleMonthDecision: {
      status: "NOT_PROVEN",
      blockers: ["ACCOUNTING_PERIOD_NOT_CLOSED"],
      confirmedNetProfitMinor: null,
    },
  });

  assert.deepEqual(display.vehicle.blockerLabels, [
    "Muhasebe dönemi açık; kesin net kâr için dönem kapanışı bekleniyor",
  ]);
});

test("decision layer separates contract economics and names the offer margin basis", () => {
  const display = buildRoomDecisionLayerDisplay({
    contractMonthDecision: {
      status: "NOT_PROVEN",
      contractTotalMinor: 120000,
      earnedRevenueMinor: null,
      plannedCostMinor: null,
      realizedActualCostMinor: 410000,
      collectedCashMinor: null,
      receivableMinor: null,
      missing: ["earnedRevenueEvidence"],
      blockers: ["VAT_UNKNOWN_OR_NET_PROFIT_NOT_PROVEN"],
    },
    newOfferDecision: {
      status: "READY_FOR_REVIEW",
      riskAdjustedCostMinor: 430500,
      quoteFloorMinor: 538125,
      scenarioOfferMinor: 15000000,
      scenarioActivityResultMinor: 14590000,
      scenarioContributionMarginBps: 9727,
      targetContributionBps: 2000,
      riskReserveBps: 500,
      offerSubmissionAllowed: false,
      computed: true,
      baselineSource: "CANONICAL_PERIOD_PLAN",
      missingFields: [],
    },
  });

  assert.equal(display.contract.contractTotalMinor, 120000);
  assert.equal(display.contract.earnedRevenueMinor, null);
  assert.equal(display.contract.collectedCashMinor, null);
  assert.equal(display.contract.statusLabel, "Kesinleştirilemedi");
  assert.equal(display.offer.quoteFloorMinor, 538125);
  assert.equal(display.offer.marginBasisLabel, "Hedef katkı marjı (teklif fiyatının yüzdesi)");
  assert.equal(display.offer.scenarioOfferLabel, "Senaryo teklif tutarı");
  assert.equal(display.offer.scenarioOfferNote, "Bu önizleme için girilen tutar");
  assert.equal(display.offer.scenarioResultLabel, "Maliyet sonrası fark (hedef/risk öncesi)");
  assert.equal(display.offer.scenarioResultNote, "Teklif − temel tahmini maliyet; kesin net kâr değildir");
  assert.equal(display.offer.quoteFloorNote, "Risk ayarlı maliyet + hedef katkı; teklif gönderimi yok");
  assert.equal(display.offer.planningGainNote, "Teklif − hedef katkı ve risk payı içeren planlama tabanı");
  assert.equal(display.offer.offerSubmissionLabel, "Teklif gönderimi yok");
  assert.equal(display.offer.missingLabels.length, 0);
});

test("planning gain and actual expense gap stay separate", () => {
  const display = buildRoomProfitabilityDisplay({
    currentOfferMinor: 14_000_000,
    quoteFloorMinor: 2_987_500,
    quoteFloorComputed: true,
    actualOperationalCostMinor: 2_390_000,
  });

  assert.equal(display.planningExpectedGainMinor, 11_012_500);
  assert.equal(display.actualExpenseGapMinor, 11_610_000);
  assert.notEqual(display.planningExpectedGainMinor, display.actualExpenseGapMinor);
});

test("missing planning inputs do not become a fabricated gain", () => {
  const display = buildRoomProfitabilityDisplay({
    currentOfferMinor: 10_000_000,
    quoteFloorMinor: null,
    quoteFloorComputed: false,
    actualOperationalCostMinor: 800_000,
  });

  assert.equal(display.planningExpectedGainMinor, null);
  assert.equal(display.actualExpenseGapMinor, 9_200_000);
});

test("planlama sonucu rengi işaretin anlamını korur", () => {
  assert.equal(resultToneForMinor(1_000), "good");
  assert.equal(resultToneForMinor(0), "good");
  assert.equal(resultToneForMinor(-1), "danger");
  assert.equal(resultToneForMinor(null), "danger");
});

test("VAT-only uncertainty keeps gross actual costs ready without claiming net certainty", () => {
  const display = describePlanningBucket({
    status: "INSUFFICIENT_DATA",
    entryCount: 2,
    grossAmountMinor: 800_000,
    blockers: ["VAT_UNKNOWN_NET_ROLLUP"],
  });

  assert.equal(display.label, "Brüt hazır · net belirsiz");
  assert.equal(display.netOnlyUnknown, true);
});

test("accounting period statuses stay understandable in the finance UI", () => {
  assert.equal(accountingPeriodStatusLabel("OPEN"), "Açık");
  assert.equal(accountingPeriodStatusLabel("READY_TO_CLOSE"), "Kapanış hazırlığı hazır");
  assert.equal(accountingPeriodStatusLabel("UNKNOWN"), "Açık");
  assert.equal(accountingPeriodBlockerLabel("ACCRUAL_RECONCILIATION_REQUIRED"), "Tahakkuk mahsup bağlantısı bekliyor");
});

test("period planning display separates selected shift from incomplete full-period cost", () => {
  const display = buildPeriodPlanningDisplay({
    periodPlanning: {
      status: "NOT_PROVEN",
      comparisonAllowed: false,
      periodStart: "2026-11-01",
      periodEnd: "2026-11-30",
      scheduledServiceDayCount: 30,
      plannedMovementCount: 30,
      observedLinkedShiftCount: 3,
      knownRoutePlanningCostMinor: 336690,
      periodQuoteFloorMinor: null,
      periodExpectedGainMinor: null,
      missing: ["Doğrulanmış boş kilometre bilgisi", "Sürücü planlama maliyeti", "Araç dönem maliyeti"],
    },
    selectedShiftQuoteFloorMinor: 14732,
  });

  assert.equal(display.statusLabel, "Hizmet döneminin tamamı için maliyet henüz hesaplanamadı");
  assert.equal(display.scheduledServiceDayCount, 30);
  assert.equal(display.plannedMovementCount, 30);
  assert.equal(display.observedLinkedShiftCount, 3);
  assert.equal(display.selectedShiftQuoteFloorMinor, 14732);
  assert.equal(display.knownRoutePlanningCostMinor, 336690);
  assert.equal(display.periodQuoteFloorMinor, null);
  assert.equal(display.periodExpectedGainMinor, null);
  assert.deepEqual(display.missingLabels, ["Boş kilometre bilgisi", "Sürücü planlama maliyeti", "Araç dönem maliyeti"]);
});

test("period planning display exposes the complete forecast separately from the selected shift", () => {
  const display = buildPeriodPlanningDisplay({
    periodPlanning: {
      status: "READY",
      comparisonAllowed: true,
      periodStart: "2026-11-01",
      periodEnd: "2026-11-30",
      scheduledServiceDayCount: 30,
      plannedMovementCount: 30,
      observedLinkedShiftCount: 3,
      knownRoutePlanningCostMinor: 336690,
      periodPlanningCostMinor: 5123456,
      periodQuoteFloorMinor: 6404320,
      periodExpectedGainMinor: 13595680,
      periodCostReady: true,
      assumptions: ["Boş kilometre planlama varsayımı kullanıldı."],
      missing: [],
    },
    selectedShiftQuoteFloorMinor: 14732,
  });

  assert.equal(display.statusLabel, "Dönem planı hesaplanabilir");
  assert.equal(display.periodPlanningCostMinor, 5123456);
  assert.equal(display.periodQuoteFloorMinor, 6404320);
  assert.equal(display.periodExpectedGainMinor, 13595680);
  assert.deepEqual(display.assumptions, ["Boş kilometre planlama varsayımı kullanıldı."]);
});

test("selected scenario does not inherit an unrelated or unproven period cost", () => {
  const genericPeriodPlanning = {
    status: "NOT_PROVEN",
    comparisonAllowed: false,
    periodCostReady: false,
    periodPlanningCostMinor: 0,
    periodQuoteFloorMinor: null,
    periodExpectedGainMinor: null,
  };

  assert.equal(
    resolveSelectedScenarioPeriodPlanning({
      selectedScenarioQuoteActive: true,
      selectedScenario: { scenarioId: "scn-test", costMinor: 1_170_100 },
      previewPeriodPlanning: genericPeriodPlanning,
    }),
    null,
  );

  const incompleteScenarioPeriod = resolveSelectedScenarioPeriodPlanning({
    selectedScenarioQuoteActive: true,
    selectedScenario: {
      scenarioId: "scn-test",
      costMinor: 1_170_100,
      periodPlanning: genericPeriodPlanning,
    },
    previewPeriodPlanning: null,
  });
  assert.equal(incompleteScenarioPeriod.periodPlanningCostMinor, null);
  assert.equal(incompleteScenarioPeriod.comparisonAllowed, false);

  const provenZeroScenarioPeriod = resolveSelectedScenarioPeriodPlanning({
    selectedScenarioQuoteActive: true,
    selectedScenario: {
      scenarioId: "scn-proven-zero",
      costMinor: 1_170_100,
      periodPlanning: {
        status: "READY",
        periodCostReady: true,
        periodPlanningCostMinor: 0,
        comparisonAllowed: false,
        missing: [],
      },
    },
    previewPeriodPlanning: null,
  });
  assert.equal(provenZeroScenarioPeriod.periodPlanningCostMinor, 0);
  assert.equal(provenZeroScenarioPeriod.periodCostReady, true);

  assert.equal(
    resolveSelectedScenarioPeriodPlanning({
      selectedScenarioQuoteActive: false,
      selectedScenario: null,
      previewPeriodPlanning: genericPeriodPlanning,
    }),
    genericPeriodPlanning,
  );
});

test("quote profitability gates planning gain on the period-scoped presentation", () => {
  const source = fs.readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "FinancialOperationsPanel.jsx"),
    "utf8",
  );
  assert.match(source, /quoteFloorComputed:\s*quoteFloorPresentation\.definitive/u);
  assert.match(source, /periodPlanning:\s*selectedScenarioQuoteActive \? selectedScenarioPeriodPlanning : preview\?\.periodPlanning/u);
});
