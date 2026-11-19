import assert from "node:assert/strict";
import test from "node:test";

import {
  buildContractMonthDecisionSummary,
  buildNewOfferDecisionSummary,
  buildVatAdjustedProfitabilitySummary,
  buildRoomProfitabilityAndQuoteFloorPreview,
  resolveAutomaticFuelInputs,
  selectContractShiftIds,
} from "./roomProfitabilityAndQuoteFloor.js";

const base = {
  snapshot: { vehicleType: "BUS", routeDistanceKm: 6.25 },
  costInputs: {
    canonicalFuelProfile: {
      vehicleType: "BUS",
      fuelType: "DIESEL",
      actualConsumptionLitersPer100Km: 21,
    },
    canonicalRoute: {
      serviceDistanceKm: 6.25,
      source: "DB_ROUTE_SNAPSHOT",
    },
  },
  fuelReference: {
    valueMinor: 9677,
    currencyCode: "TRY",
    sourceName: "EPDK",
    asOf: "2026-10-25",
    freshness: "CURRENT",
    confidence: "HIGH",
  },
};

test("fuel preview reports missing empty-kilometre evidence instead of implying zero", () => {
  const result = resolveAutomaticFuelInputs(base);

  assert.equal(result.fuelResolution.status, "INCOMPLETE_REFERENCE");
  assert.equal(result.fuelResolution.emptyDistanceKm, null);
  assert.ok(result.fuelResolution.missing.includes("Doğrulanmış boş kilometre bilgisi"));
});

test("fuel preview remains computable when explicit empty-kilometre evidence exists", () => {
  const result = resolveAutomaticFuelInputs({
    ...base,
    costInputs: {
      ...base.costInputs,
      canonicalRoute: {
        ...base.costInputs.canonicalRoute,
        emptyDistanceKm: 2,
        totalDistanceKm: 8.25,
      },
    },
  });

  assert.equal(result.fuelResolution.status, "AUTO_REFERENCE_ESTIMATE");
  assert.equal(result.fuelResolution.emptyDistanceKm, 2);
  assert.deepEqual(result.fuelResolution.missing, []);
});

test("fuel preview keeps an explicit price as a read-only planning scenario", () => {
  const result = resolveAutomaticFuelInputs({
    ...base,
    costInputs: {
      ...base.costInputs,
      fuelUnitPriceMinor: 15000,
      canonicalRoute: {
        ...base.costInputs.canonicalRoute,
        emptyDistanceKm: 2,
        totalDistanceKm: 8.25,
      },
    },
  });

  assert.equal(result.fuelResolution.status, "SCENARIO_INPUT_ESTIMATE");
  assert.equal(result.fuelResolution.priceMinor, 15000);
  assert.equal(result.fuelResolution.priceSourceKind, "SCENARIO_INPUT");
  assert.equal(result.fuelResolution.priceSourceName, "Kullanıcı senaryo varsayımı");
  assert.equal(result.modelInputs.fuelUnitPriceMinor, 15000);
  assert.equal(result.fuelResolution.estimatedAmountMinor, 25988);
});

test("fuel preview accepts an explicit empty-kilometre planning assumption", () => {
  const result = resolveAutomaticFuelInputs({
    ...base,
    costInputs: {
      ...base.costInputs,
      emptyDistanceKm: 1.5,
    },
  });

  assert.equal(result.fuelResolution.status, "AUTO_REFERENCE_ESTIMATE");
  assert.equal(result.fuelResolution.emptyDistanceKm, 1.5);
  assert.equal(result.fuelResolution.emptyDistanceSource, "SCENARIO_INPUT");
  assert.equal(result.fuelResolution.totalDistanceKm, 7.75);
  assert.equal(result.fuelResolution.distanceSource, "SCENARIO_INPUT");
});

test("period preview passes shared vehicle allocation and driver planning inputs to the canonical model", () => {
  const result = buildRoomProfitabilityAndQuoteFloorPreview({
    role: "ROOM",
    room: { id: 1, name: "Demo Room" },
    shift: { id: 355, roomId: 1, driverId: 2, routeSnapshotDistanceM: 2576, routeSnapshotDurationSec: 246, vehicle: { id: 5, type: "BUS", capacity: 50 } },
    agreement: { id: 204, roomId: 1, companyId: 2, driverId: 2 },
    costInputs: {
      emptyDistanceKm: 1.5,
      fixedVehicleCostMonthlyMinor: 6_000_000,
      vehicleFixedCostAllocationMode: "per_service_day",
      allocationServiceDaysPerMonth: 60,
      driverBasePerShiftMinor: 120_000,
      driverCompensationMode: "per_shift",
      shiftCount: 30,
      serviceDayCount: 30,
      canonicalFuelProfile: { vehicleType: "BUS", fuelType: "DIESEL", actualConsumptionLitersPer100Km: 21 },
      canonicalRoute: { serviceDistanceKm: 77.28, emptyDistanceKm: 45, totalDistanceKm: 122.28, source: "SCENARIO_INPUT" },
      fuelUnitPriceMinor: 9_680,
      serviceDistanceKm: 77.28,
      totalDistanceKm: 122.28,
      routeDurationMinutes: 123,
    },
    quoteFloorInputs: {
      targetContributionBps: 2_000,
      riskReserveBps: 500,
      quoteScenarioAmountMinor: 20_000_000,
    },
  });

  const components = new Map(result.operationalCostModel.components.map((item) => [item.componentKey, item]));
  assert.equal(components.get("fuel")?.includedInBaseline, true);
  assert.equal(components.get("driver_labor")?.amountMinor, 3_600_000);
  assert.equal(components.get("vehicle_fixed_allocated")?.amountMinor, 3_000_000);
  assert.equal(result.roomProfitability.confirmedProfitMinor, null);
});

test("canonical preview keeps the selected driver id when the relation is not hydrated", () => {
  const result = buildRoomProfitabilityAndQuoteFloorPreview({
    role: "ROOM",
    companyKind: "COMPANY",
    room: { id: 1, name: "Demo Room" },
    shift: {
      id: 355,
      roomId: 1,
      companyId: 2,
      driverId: 2,
      status: "APPROVED",
      routeSnapshotDistanceM: 2576,
      routeSnapshotDurationSec: 246,
      vehicle: { id: 5, plate: "34 ABC 125", capacity: 27, type: "BUS" },
      _count: { people: 0, stops: 1 },
    },
    agreement: { id: 204, roomId: 1, companyId: 2, driverId: 2 },
    roomSummary: {},
    costInputs: {},
    quoteFloorInputs: {},
  });

  assert.equal(result.snapshot.driverId, 2);
});

test("period preview keeps agreement-period provenance instead of selected-shift provenance", () => {
  const result = buildRoomProfitabilityAndQuoteFloorPreview({
    role: "ROOM",
    companyKind: "COMPANY",
    room: { id: 1, name: "Demo Room" },
    shift: {
      id: 355,
      roomId: 1,
      companyId: 2,
      driverId: 2,
      status: "APPROVED",
      routeSnapshotDistanceM: 2576,
      routeSnapshotDurationSec: 246,
      vehicle: { id: 5, plate: "34 ABC 125", capacity: 27, type: "BUS" },
      _count: { people: 0, stops: 1 },
    },
    agreement: { id: 204, roomId: 1, companyId: 2, driverId: 2 },
    roomSummary: {},
    costInputs: {
      sourceRef: "agreement-204-period-2026-11-01-2026-11-30",
      routeRef: "agreement-204-period-route",
      shiftRef: null,
      serviceDistanceKm: 77.28,
      totalDistanceKm: 137.28,
      routeDurationMinutes: 123,
      shiftCount: 30,
      serviceDayCount: 30,
      tripCount: 30,
    },
    quoteFloorInputs: {},
  });

  assert.equal(result.operationalCostModel.normalizedInput.sourceRef, "agreement-204-period-2026-11-01-2026-11-30");
  assert.equal(result.operationalCostModel.normalizedInput.routeRef, "agreement-204-period-route");
  assert.equal(result.operationalCostModel.normalizedInput.shiftRef, "");
  assert.equal(result.operationalCostModel.normalizedInput.shiftCount, 30);
});

test("fuel scenario estimate does not masquerade as realized cost evidence", () => {
  const result = buildRoomProfitabilityAndQuoteFloorPreview({
    role: "ROOM",
    companyKind: "COMPANY",
    room: { id: 1, name: "Demo Room" },
    shift: {
      id: 355,
      roomId: 1,
      companyId: 2,
      driverId: 2,
      status: "APPROVED",
      routeSnapshotDistanceM: 2576,
      routeSnapshotDurationSec: 246,
      vehicle: { id: 5, plate: "34 ABC 125", capacity: 27, type: "BUS" },
      _count: { people: 0, stops: 1 },
    },
    agreement: { id: 204, roomId: 1, companyId: 2, driverId: 2 },
    roomSummary: {},
    costInputs: {
      fuelUnitPriceMinor: 15000,
      canonicalFuelProfile: { vehicleType: "BUS", fuelType: "DIESEL", actualConsumptionLitersPer100Km: 21 },
      canonicalRoute: { serviceDistanceKm: 2.576, emptyDistanceKm: 2, totalDistanceKm: 4.576, source: "DB_ROUTE_SNAPSHOT" },
      canonicalFuelReference: { valueMinor: 9677, currencyCode: "TRY", sourceName: "EPDK" },
      roomCostPlanningEvidence: { actual: { grossAmountMinor: null } },
    },
    quoteFloorInputs: {},
  });

  assert.equal(result.roomProfitability.actualOperationalCostMinor, null);
  assert.equal(result.roomProfitability.baselineOperationalCostMinor, 14414);
});

test("contract month summary separates contract total, earned revenue, actual cost, collection and plan", () => {
  const result = buildContractMonthDecisionSummary({
    agreementId: 202,
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    contractTotalMinor: 2000000,
    realizedIncomeEvidence: {
      status: "AVAILABLE",
      authoritative: true,
      lines: [{ agreementId: 202, hakedisId: 190, invoiceId: 191, amountMinor: 1000000, currencyCode: "TRY", periodStart: "2026-09-01", periodEnd: "2026-09-30" }],
      collectionEvidence: { status: "AVAILABLE", amountMinor: 400000, currencyCode: "TRY" },
      receivableEvidence: { status: "AVAILABLE", amountMinor: 600000, currencyCode: "TRY" },
    },
    plannedCostMinor: 900000,
    shiftIds: [301],
    costEntries: [
      { id: 501, categoryKey: "FUEL", amountMinor: 300000, currencyCode: "TRY", lifecycle: "CONFIRMED", recordKind: "ACTUAL", agreementId: 202, periodStart: "2026-09-01", periodEnd: "2026-09-30", vatMode: "UNKNOWN", allocationLines: [{ agreementId: 202, shiftId: 301, allocatedAmountMinor: 300000 }] },
      { id: 502, categoryKey: "BASE_SALARY", amountMinor: 200000, currencyCode: "TRY", lifecycle: "CONFIRMED", recordKind: "ACTUAL", shiftId: 301, periodStart: "2026-09-01", periodEnd: "2026-09-30", vatMode: "NOT_APPLICABLE", allocationLines: [] },
      { id: 503, categoryKey: "FUEL", amountMinor: 900000, currencyCode: "TRY", lifecycle: "CONFIRMED", recordKind: "PLAN", agreementId: 202, periodStart: "2026-09-01", periodEnd: "2026-09-30", vatMode: "UNKNOWN", allocationLines: [] },
    ],
  });

  assert.equal(result.contractTotalMinor, 2000000);
  assert.equal(result.earnedRevenueMinor, 1000000);
  assert.equal(result.collectedCashMinor, 400000);
  assert.equal(result.receivableMinor, 600000);
  assert.equal(result.realizedActualCostMinor, 500000);
  assert.equal(result.plannedCostMinor, 900000);
  assert.equal(result.activityResultMinor, 500000);
  assert.equal(result.confirmedNetProfitMinor, null);
  assert.equal(result.status, "PROVISIONAL_ACTIVITY_RESULT");
  assert.deepEqual(result.costLineage.map((item) => item.entryId), [501, 502]);
  assert.ok(result.blockers.includes("VAT_UNKNOWN_OR_NET_PROFIT_NOT_PROVEN"));
});

test("contract month summary scopes collection and receivable to selected agreement invoices", () => {
  const result = buildContractMonthDecisionSummary({
    agreementId: 195,
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    contractTotalMinor: 14000000,
    realizedIncomeEvidence: {
      status: "AVAILABLE",
      authoritative: true,
      lines: [
        { agreementId: 195, hakedisId: 191, invoiceId: 176, amountMinor: 14000000, currencyCode: "TRY", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
        { agreementId: 198, hakedisId: 193, invoiceId: 178, amountMinor: 10000000, currencyCode: "TRY", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      ],
      collectionEvidence: {
        status: "AVAILABLE",
        amountMinor: 13000000,
        currencyCode: "TRY",
        records: [
          { id: 1, invoiceId: 176, amountMinor: 8000000, direction: "COLLECTION", status: "CONFIRMED", currencyCode: "TRY" },
          { id: 2, invoiceId: 178, amountMinor: 5000000, direction: "COLLECTION", status: "CONFIRMED", currencyCode: "TRY" },
        ],
      },
      receivableEvidence: {
        status: "AVAILABLE",
        amountMinor: 11000000,
        currencyCode: "TRY",
        records: [
          { id: 1, invoiceId: 176, amountMinor: 8000000, direction: "COLLECTION", status: "CONFIRMED", currencyCode: "TRY" },
          { id: 2, invoiceId: 178, amountMinor: 5000000, direction: "COLLECTION", status: "CONFIRMED", currencyCode: "TRY" },
        ],
      },
    },
    shiftIds: [],
    costEntries: [],
  });

  assert.equal(result.earnedRevenueMinor, 14000000);
  assert.equal(result.collectedCashMinor, 8000000);
  assert.equal(result.receivableMinor, 6000000);
});

test("contract scope excludes other customer shifts from a vehicle-wide operational selection", () => {
  const shiftIds = selectContractShiftIds({
    agreementId: 195,
    shifts: [
      { id: 257, agreementId: 195 },
      { id: 276, agreementId: 198 },
      { id: 278, agreementId: 199 },
    ],
  });

  assert.deepEqual(shiftIds, [257]);
});

test("contract month summary keeps a complete but open period provisional", () => {
  const result = buildContractMonthDecisionSummary({
    agreementId: 202,
    periodStart: "2026-10-01",
    periodEnd: "2026-10-31",
    accountingPeriodClosed: false,
    realizedIncomeEvidence: {
      status: "AVAILABLE",
      authoritative: true,
      lines: [{ agreementId: 202, hakedisId: 190, invoiceId: 191, amountMinor: 14000000, currencyCode: "TRY", periodStart: "2026-10-01", periodEnd: "2026-10-31" }],
    },
    shiftIds: [401],
    costEntries: [{
      id: 601,
      categoryKey: "FUEL",
      amountMinor: 100000,
      currencyCode: "TRY",
      lifecycle: "CONFIRMED",
      recordKind: "ACTUAL",
      agreementId: 202,
      shiftId: 401,
      periodStart: "2026-10-01",
      periodEnd: "2026-10-31",
      vatMode: "NOT_APPLICABLE",
      vatClassification: "OUT_OF_SCOPE",
      vatEvidenceRef: "VAT-NOT-APPLICABLE-601",
      vatClassificationReason: "Belge ve yetkili muhasebe değerlendirmesi.",
      allocationLines: [],
    }],
  });

  assert.equal(result.activityResultMinor, 13900000);
  assert.equal(result.confirmedNetProfitMinor, null);
  assert.ok(result.blockers.includes("ACCOUNTING_PERIOD_NOT_CLOSED"));
});

test("new offer decision uses contribution margin on price and keeps submission read-only", () => {
  const result = buildNewOfferDecisionSummary({
    baselineOperationalCostMinor: 100000,
    targetContributionBps: 2000,
    riskReserveBps: 500,
    scenarioOfferMinor: 150000,
    passengerCount: 10,
  });

  assert.equal(result.status, "READY_FOR_REVIEW");
  assert.equal(result.quoteFloorMinor, 131250);
  assert.equal(result.quoteFloorPerPassengerMinor, 13125);
  assert.equal(result.scenarioOfferMinor, 150000);
  assert.equal(result.scenarioActivityResultMinor, 50000);
  assert.equal(result.scenarioContributionMarginBps, 3333);
  assert.equal(result.offerSubmissionAllowed, false);
  assert.match(result.formula, /1 - hedef katkı marjı/);
});

test("20k offer keeps planning and realized bases economically distinct", () => {
  const planning = buildNewOfferDecisionSummary({
    baselineOperationalCostMinor: 2_390_000,
    targetContributionBps: 2_000,
    riskReserveBps: 500,
    scenarioOfferMinor: 2_000_000,
  });
  const realized = buildNewOfferDecisionSummary({
    baselineOperationalCostMinor: 4_450_761,
    targetContributionBps: 2_000,
    riskReserveBps: 500,
    scenarioOfferMinor: 2_000_000,
  });

  assert.equal(planning.riskAdjustedCostMinor, 2_509_500);
  assert.equal(planning.quoteFloorMinor, 3_136_875);
  assert.equal(planning.scenarioActivityResultMinor, -390_000);
  assert.equal(realized.quoteFloorMinor, 5_841_625);
  assert.equal(realized.scenarioActivityResultMinor, -2_450_761);
  assert.notEqual(planning.quoteFloorMinor, realized.quoteFloorMinor);
});

test("KDV ayrıştırılmış operasyonel kâr belgeli çıkış ve indirilebilir giriş KDV'sini bir kez düşer", () => {
  const result = buildVatAdjustedProfitabilitySummary({
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    earnedIncomeLines: [{
      id: 1901,
      amountMinor: 1180000,
      currencyCode: "TRY",
      vatMode: "INCLUDED",
      vatAmountMinor: 180000,
      vatClassification: "DOCUMENTED_VAT",
      vatEvidenceRef: "FATURA-GELIR-1901",
      vatClassificationReason: "Gelir belgesindeki KDV satırı doğrulandı.",
    }],
    costEntries: [{
      id: 2901,
      amountMinor: 236000,
      currencyCode: "TRY",
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
      recordKind: "ACTUAL",
      lifecycle: "CONFIRMED",
      vatMode: "INCLUDED",
      vatAmountMinor: 36000,
      vatClassification: "DOCUMENTED_VAT",
      vatDeductibility: "DEDUCTIBLE",
      vatEvidenceRef: "FATURA-GIDER-2901",
      vatClassificationReason: "Gider belgesi ve indirilebilirlik dayanağı doğrulandı.",
    }],
  });

  assert.equal(result.grossEarnedRevenueMinor, 1180000);
  assert.equal(result.documentedOutputVatMinor, 180000);
  assert.equal(result.netEarnedRevenueMinor, 1000000);
  assert.equal(result.grossActualCostMinor, 236000);
  assert.equal(result.deductibleInputVatMinor, 36000);
  assert.equal(result.costForProfitMinor, 200000);
  assert.equal(result.vatAdjustedOperatingProfitMinor, 800000);
  assert.equal(result.vatPositionMinor, 144000);
  assert.equal(result.vatAdjustedOperatingProfitStatus, "READY");
});

test("KDV_UNKNOWN brüt maliyeti korur ve kanıtsız vergi sonrası tahmini kâr üretmez", () => {
  const result = buildVatAdjustedProfitabilitySummary({
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    earnedIncomeLines: [{
      id: 1902,
      amountMinor: 1000000,
      currencyCode: "TRY",
      vatMode: "INCLUDED",
      vatAmountMinor: 180000,
      vatClassification: "DOCUMENTED_VAT",
      vatEvidenceRef: "FATURA-GELIR-1902",
      vatClassificationReason: "Gelir belgesi doğrulandı.",
    }],
    costEntries: [{
      id: 2902,
      amountMinor: 118000,
      currencyCode: "TRY",
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
      recordKind: "ACTUAL",
      lifecycle: "CONFIRMED",
      vatMode: "UNKNOWN",
      vatClassification: "UNKNOWN",
    }],
  });

  assert.equal(result.grossActualCostMinor, 118000);
  assert.equal(result.documentedOutputVatMinor, 180000);
  assert.equal(result.deductibleInputVatMinor, null);
  assert.equal(result.vatAdjustedOperatingProfitMinor, null);
  assert.equal(result.estimatedAfterTaxNetProfitMinor, null);
  assert.equal(result.vatAdjustedOperatingProfitStatus, "NOT_PROVEN");
  assert.ok(result.blockers.includes("VAT_UNKNOWN_OR_NET_PROFIT_NOT_PROVEN"));
  assert.deepEqual(result.profitabilityEvidence.unknownVatSourceIds, [2902]);
});

test("vergi girdisi olmadan operasyonel sonuç korunur, vergi sonrası sonuç null kalır", () => {
  const result = buildVatAdjustedProfitabilitySummary({
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    earnedIncomeLines: [{
      id: 1903,
      amountMinor: 1000000,
      currencyCode: "TRY",
      vatMode: "NOT_APPLICABLE",
      vatClassification: "OUT_OF_SCOPE",
      vatEvidenceRef: "GELIR-KAPSAM-DISI-1903",
      vatClassificationReason: "İşlem için KDV uygulanmadığı yetkili dayanakla doğrulandı.",
    }],
    costEntries: [{
      id: 2903,
      amountMinor: 250000,
      currencyCode: "TRY",
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
      recordKind: "ACTUAL",
      lifecycle: "CONFIRMED",
      vatMode: "NOT_APPLICABLE",
      vatClassification: "OUT_OF_SCOPE",
      vatEvidenceRef: "GIDER-KAPSAM-DISI-2903",
      vatClassificationReason: "İşlem için KDV uygulanmadığı yetkili dayanakla doğrulandı.",
    }],
  });

  assert.equal(result.vatAdjustedOperatingProfitMinor, 750000);
  assert.equal(result.estimatedOperationalNetProfitMinor, 750000);
  assert.equal(result.estimatedAfterTaxNetProfitMinor, null);
  assert.equal(result.estimatedAfterTaxNetProfitStatus, "NOT_PROVEN");
  assert.ok(result.blockers.includes("VERIFIED_TAX_BASIS_MISSING"));
});
