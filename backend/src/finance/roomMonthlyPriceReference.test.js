import test from "node:test";
import assert from "node:assert/strict";
import { buildRoomMonthlyPriceReference } from "./roomMonthlyPriceReference.js";
import { buildRoomProfitabilityAndQuoteFloorPreview } from "./roomProfitabilityAndQuoteFloor.js";

const selectedAgreement = {
  id: 207,
  roomId: 1,
  status: "APPROVED",
  startDate: "2026-11-01",
  endDate: "2026-11-30",
  weekMask: 127,
  pattern: "ONE_WAY",
  direction: "INBOUND",
  vehicle: { id: 1, type: "MINIBUS", capacity: 27 },
};

const currentPeriodPlanning = {
  status: "READY",
  comparisonAllowed: true,
  periodCostReady: true,
  periodPlanningCostMinor: 6_943_601,
  periodQuoteFloorMinor: 9_113_478,
  periodStart: "2026-11-01",
  periodEnd: "2026-11-30",
  plannedMovementCount: 30,
  scheduledServiceDayCount: 30,
  observedLinkedShiftCount: 3,
  assumptions: ["Planlı hareket sayısı açık planlama varsayımıdır."],
  missing: [],
};

const currentPeriodPreview = {
  operationalCostModel: {
    status: "complete",
    baselineOperationalCostMinor: 6_943_601,
    components: [
      { componentKey: "fuel", label: "Yakıt", amountMinor: 2_172_770, includedInBaseline: true, status: "complete" },
      { componentKey: "driver_labor", label: "Sürücü planlama maliyeti", amountMinor: 1_800_000, includedInBaseline: true, status: "complete" },
      { componentKey: "vehicle_fixed_allocated", label: "Araç dönem maliyeti", amountMinor: 2_970_831, includedInBaseline: true, status: "complete" },
    ],
  },
  quoteFloor: { quoteFloorMinor: 9_113_478, computed: true },
};

test("aynı ROOM'un geçmiş anlaşma fiyatını güncel dönem tahmininden ayrı gösterir", () => {
  const result = buildRoomMonthlyPriceReference({
    roomId: 1,
    selectedAgreement,
    historicalAgreements: [
      {
        id: 195,
        roomId: 1,
        status: "DONE",
        startDate: "2026-09-01",
        endDate: "2026-09-30",
        weekMask: 127,
        pattern: "ONE_WAY",
        direction: "INBOUND",
        roomOfferAmount: 14_000_000,
        vehicle: { id: 1, type: "MINIBUS", capacity: 27 },
        shifts: [{ id: 257, routeSnapshotDistanceM: 6250, routeSnapshotDurationSec: 706 }],
      },
    ],
    periodPlanning: currentPeriodPlanning,
    periodPreview: currentPeriodPreview,
  });

  assert.equal(result.status, "READY");
  assert.equal(result.historicalReference.amountMinor, 14_000_000);
  assert.equal(result.currentPeriod.estimatedCostMinor, 6_943_601);
  assert.equal(result.currentPeriod.quoteFloorMinor, 9_113_478);
  assert.notEqual(result.historicalReference.amountMinor, result.currentPeriod.estimatedCostMinor);
  assert.equal(result.currentPeriod.plannedMovementCount, 30);
  assert.equal(result.currentPeriod.observedLinkedShiftCount, 3);
  assert.equal(result.safety.readOnly, true);
  assert.equal(result.safety.noPersistence, true);
});

test("seçili anlaşmanın canonical ticari ve operasyon kanıtlarını da ayrı döndürür", () => {
  const result = buildRoomMonthlyPriceReference({
    roomId: 1,
    selectedAgreement: {
      ...selectedAgreement,
      companyOfferAmount: 1_500_000,
      roomOfferAmount: null,
      auditLogs: [{ id: 163845, action: "COMPANY_AGREEMENT_DECISION", meta: { decision: "ACCEPT", roomOfferAmountMinor: 1_500_000 } }],
    },
    periodPlanning: currentPeriodPlanning,
    periodPreview: currentPeriodPreview,
  });

  assert.equal(result.commercialReference.status, "READY");
  assert.equal(result.commercialReference.amountMinor, 1_500_000);
  assert.equal(result.commercialReference.source, "COMPANY_ACCEPT_AUDIT");
  assert.equal(result.negotiationEvidence.status, "PARTIAL");
  assert.equal(result.operationalEvidence.status, "NOT_PROVEN");
  assert.equal(result.operationalEvidence.actualCostEvidence, "NOT_PROVEN");
});

test("başka ROOM fiyatını ve mevcut seçili anlaşmayı referansa almaz", () => {
  const result = buildRoomMonthlyPriceReference({
    roomId: 1,
    selectedAgreement,
    historicalAgreements: [
      {
        id: 206,
        roomId: 2,
        status: "DONE",
        startDate: "2026-10-01",
        endDate: "2026-10-31",
        roomOfferAmount: 99_000_000,
      },
      {
        ...selectedAgreement,
        id: 207,
        roomOfferAmount: 15_000_000,
      },
    ],
    periodPlanning: currentPeriodPlanning,
    periodPreview: currentPeriodPreview,
  });

  assert.equal(result.historicalReference, null);
  assert.match(result.referenceMissing.join(" "), /geçmiş ROOM anlaşması/i);
  assert.equal(result.status, "READY");
  assert.equal(result.risk.status, "GREEN");
});

test("geçmiş anlaşma yoksa yeterli güncel canonical dönem hesabı yine gösterilir", () => {
  const result = buildRoomMonthlyPriceReference({
    roomId: 1,
    selectedAgreement,
    historicalAgreements: [],
    periodPlanning: currentPeriodPlanning,
    periodPreview: currentPeriodPreview,
  });

  assert.equal(result.status, "READY");
  assert.equal(result.currentPeriod.estimatedCostMinor, 6_943_601);
  assert.equal(result.currentPeriod.quoteFloorMinor, 9_113_478);
  assert.equal(result.historicalReference, null);
  assert.equal(result.comparison.currentEstimatedCostMinusHistoricalPriceMinor, null);
  assert.match(result.referenceMissing.join(" "), /geçmiş ROOM anlaşması/i);
});

test("bağlantısız seçili vardiya başka bir anlaşmanın dönemini devralmaz", () => {
  const result = buildRoomMonthlyPriceReference({
    roomId: 1,
    selectedAgreement: null,
    historicalAgreements: [],
    periodPlanning: null,
    periodPreview: null,
    singleShiftPreview: {
      quoteFloor: { baselineOperationalCostMinor: 138_503 },
    },
    selectedPeriodStart: "2026-09-04",
    selectedPeriodEnd: "2026-09-04",
  });

  assert.equal(result.currentPeriod.periodStart, "2026-09-04");
  assert.equal(result.currentPeriod.periodEnd, "2026-09-04");
  assert.equal(result.currentPeriod.singleShiftCostMinor, 138_503);
  assert.equal(result.commercialReference.status, "NOT_PROVEN");
});

test("en güncel sınırlı kayıt yerine aynı hizmet şekline daha yakın geçmiş fiyatı seçer", () => {
  const result = buildRoomMonthlyPriceReference({
    roomId: 1,
    selectedAgreement,
    historicalAgreements: [
      {
        id: 199,
        roomId: 1,
        status: "ACTIVE",
        startDate: "2026-10-01",
        endDate: "2026-10-31",
        weekMask: 1,
        pattern: "ONE_WAY",
        direction: "INBOUND",
        roomOfferAmount: 12_000_000,
        vehicle: { id: 1, type: "MINIBUS", capacity: 27 },
        shifts: [],
      },
      {
        id: 195,
        roomId: 1,
        status: "DONE",
        startDate: "2026-09-01",
        endDate: "2026-09-30",
        weekMask: 127,
        pattern: "ONE_WAY",
        direction: "INBOUND",
        roomOfferAmount: 14_000_000,
        vehicle: { id: 1, type: "MINIBUS", capacity: 27 },
        shifts: [],
      },
    ],
    periodPlanning: currentPeriodPlanning,
    periodPreview: currentPeriodPreview,
  });

  assert.equal(result.historicalReference.agreementId, 195);
  assert.equal(result.historicalReference.comparability, "LIMITED");
  assert.equal(result.comparison.status, "NOT_PROVEN");
});

test("tam dönem maliyeti hazır değilse aylık fiyat referansını kesinleştirmez", () => {
  const result = buildRoomMonthlyPriceReference({
    roomId: 1,
    selectedAgreement,
    historicalAgreements: [{
      id: 195,
      roomId: 1,
      status: "DONE",
      startDate: "2026-09-01",
      endDate: "2026-09-30",
      weekMask: 127,
      pattern: "ONE_WAY",
      direction: "INBOUND",
      roomOfferAmount: 14_000_000,
      vehicle: { id: 1, type: "MINIBUS", capacity: 27 },
      shifts: [],
    }],
    periodPlanning: { ...currentPeriodPlanning, comparisonAllowed: false, periodCostReady: false, periodPlanningCostMinor: null, periodQuoteFloorMinor: null, missing: ["Sürücü planlama maliyeti"] },
    periodPreview: { ...currentPeriodPreview, operationalCostModel: { ...currentPeriodPreview.operationalCostModel, status: "incomplete" } },
  });

  assert.equal(result.status, "INSUFFICIENT_DATA");
  assert.equal(result.currentPeriod.estimatedCostMinor, null);
  assert.equal(result.currentPeriod.quoteFloorMinor, null);
  assert.equal(result.historicalReference.amountMinor, 14_000_000);
  assert.equal(result.risk.status, "GRAY");
});

test("tek vardiya bilgisi aylık maliyet gibi sunulmaz", () => {
  const result = buildRoomMonthlyPriceReference({
    roomId: 1,
    selectedAgreement,
    historicalAgreements: [],
    periodPlanning: { ...currentPeriodPlanning, periodPlanningCostMinor: null, periodQuoteFloorMinor: null, comparisonAllowed: false, periodCostReady: false, missing: ["Tam dönem"] },
    periodPreview: {
      ...currentPeriodPreview,
      quoteFloor: { quoteFloorMinor: 14732, computed: true },
      operationalCostModel: { ...currentPeriodPreview.operationalCostModel, baselineOperationalCostMinor: 14732 },
    },
  });

  assert.equal(result.currentPeriod.estimatedCostMinor, null);
  assert.equal(result.currentPeriod.singleShiftCostMinor, 14732);
  assert.equal(result.currentPeriod.singleShiftIsMonthly, false);
  assert.match(result.missing.join(" "), /tam dönem/i);
});

test("canonical maliyet bileşenleri kullanıcı dilinde ve aynı motor kapsamıyla sunulur", () => {
  const result = buildRoomMonthlyPriceReference({
    roomId: 1,
    selectedAgreement,
    historicalAgreements: [],
    periodPlanning: currentPeriodPlanning,
    periodPreview: currentPeriodPreview,
  });

  assert.deepEqual(result.currentCostComponents.map((component) => component.label), [
    "Yakıt",
    "Sürücü planlama maliyeti",
    "Kira, sigorta, vergi ve araç sabit gider payı",
  ]);
  assert.equal(result.currentCostComponents.every((component) => component.statusLabel === "Hesaba dahil"), true);
});

test("kayıtlı planlama senaryosunu güncel dönem maliyetinden ayrı gösterir", () => {
  const result = buildRoomMonthlyPriceReference({
    roomId: 1,
    selectedAgreement,
    historicalAgreements: [],
    periodPlanning: {
      ...currentPeriodPlanning,
      periodCostReady: false,
      comparisonAllowed: false,
      periodPlanningCostMinor: null,
      periodQuoteFloorMinor: null,
      missing: ["Doğrulanmış boş kilometre bilgisi", "Sürücü planlama maliyeti", "Araç dönem maliyeti"],
    },
    periodPreview: {
      ...currentPeriodPreview,
      operationalCostModel: {
        ...currentPeriodPreview.operationalCostModel,
        components: [{ componentKey: "fuel", amountMinor: 674216, includedInBaseline: true, status: "complete" }],
      },
    },
    savedPlanningDraft: {
      id: 10,
      roomId: 1,
      version: 4,
      updatedAt: "2026-10-28T12:57:37.754Z",
      inputSnapshot: {
        roomId: 1,
        serviceContext: { roomId: 1, agreementId: 207, sourceShiftId: 356, periodStart: "2026-11-03", periodEnd: "2026-11-09" },
        computed: {
          periodPlanning: {
            periodStart: "2026-11-03",
            periodEnd: "2026-11-09",
            plannedMovementCount: 5,
            scheduledServiceDayCount: 5,
            periodPlanningCostMinor: 1789322,
            periodQuoteFloorMinor: 2348487,
            periodExpectedGainMinor: -848487,
            assumptions: ["Boş kilometre açık varsayımdır."],
            routeTemplate: { sourceShiftId: 356, distanceM: 66323, durationSec: 3617 },
          },
          planningInputs: {
            emptyDistanceKm: "1.5",
            fuelUnitPriceMinor: "9680",
            fuelConsumptionLitersPer100Km: "21",
            driverBasePerShiftMinor: "120000",
            fixedVehicleCostMonthlyMinor: "6000000",
            allocationServiceDaysPerMonth: "60",
          },
        },
      },
    },
  });

  assert.equal(result.currentPeriod.estimatedCostMinor, null);
  assert.equal(result.currentPeriod.quoteFloorMinor, null);
  assert.equal(result.storedPlanningScenario.draftId, 10);
  assert.equal(result.storedPlanningScenario.estimatedCostMinor, 1789322);
  assert.equal(result.storedPlanningScenario.quoteFloorMinor, 2348487);
  assert.equal(result.storedPlanningScenario.notRealizedCost, true);
  assert.equal(result.risk.status, "GRAY");
});

test("tam dönem hazır değilken bilinen yakıt kısmi kanıt olarak toplam dışı kalır", () => {
  const result = buildRoomMonthlyPriceReference({
    roomId: 1,
    selectedAgreement,
    periodPlanning: {
      ...currentPeriodPlanning,
      periodCostReady: false,
      comparisonAllowed: false,
      periodPlanningCostMinor: null,
      periodQuoteFloorMinor: null,
      missing: ["Doğrulanmış boş kilometre bilgisi"],
    },
    periodPreview: {
      ...currentPeriodPreview,
      operationalCostModel: {
        ...currentPeriodPreview.operationalCostModel,
        components: [{ componentKey: "fuel", label: "Yakıt", amountMinor: 674216, includedInBaseline: true, status: "complete" }],
      },
    },
  });

  assert.equal(result.currentCostComponents[0].amountMinor, 674216);
  assert.equal(result.currentCostComponents[0].statusLabel, "Kısmi bilgi");
  assert.equal(result.currentCostComponents[0].includedInPeriodTotal, false);
});

test("sınırlı geçmiş anlaşma için doğrudan fark veya kilometre başı referans üretmez", () => {
  const result = buildRoomMonthlyPriceReference({
    roomId: 1,
    selectedAgreement,
    historicalAgreements: [{
      id: 199,
      roomId: 1,
      status: "ACTIVE",
      startDate: "2026-09-01",
      endDate: "2026-10-31",
      weekMask: 1,
      pattern: "ONE_WAY",
      direction: "INBOUND",
      roomOfferAmount: 12000000,
      vehicle: { type: "MINIBUS", capacity: 27 },
      shifts: [{ id: 1, startAt: "2026-09-01T04:00:00", routeSnapshotDistanceM: 66323, routeSnapshotDurationSec: 3617 }],
    }],
    periodPlanning: currentPeriodPlanning,
    periodPreview: currentPeriodPreview,
  });

  assert.equal(result.historicalReference.comparability, "LIMITED");
  assert.equal(result.comparison.currentEstimatedCostMinusHistoricalPriceMinor, null);
  assert.equal(result.comparison.currentQuoteFloorMinusHistoricalPriceMinor, null);
  assert.equal(result.comparison.monthlyChangePercentBps, null);
  assert.equal(result.historicalReference.pricePerKmMinor, null);
});

test("aynı hizmet şekli ve hareket kapsamı kanıtlıysa dönem değişimini üretir", () => {
  const result = buildRoomMonthlyPriceReference({
    roomId: 1,
    selectedAgreement: { ...selectedAgreement, weekMask: 31 },
    historicalAgreements: [{
      id: 195,
      roomId: 1,
      status: "DONE",
      startDate: "2026-09-01",
      endDate: "2026-09-05",
      weekMask: 31,
      pattern: "ONE_WAY",
      direction: "INBOUND",
      roomOfferAmount: 14000000,
      vehicle: { type: "MINIBUS", capacity: 27 },
      shifts: Array.from({ length: 5 }, (_, index) => ({
        id: index + 1,
        startAt: `2026-09-0${index + 1}T04:00:00`,
        routeSnapshotDistanceM: 66323,
        routeSnapshotDurationSec: 3617,
        routeSnapshotInputHash: "same-route",
      })),
    }],
    periodPlanning: {
      ...currentPeriodPlanning,
      plannedMovementCount: 5,
      scheduledServiceDayCount: 5,
      routeTemplate: { distanceM: 66323, durationSec: 3617, inputHash: "same-route" },
    },
    periodPreview: currentPeriodPreview,
  });

  assert.equal(result.historicalReference.comparability, "COMPARABLE");
  assert.equal(result.comparison.currentEstimatedCostMinusHistoricalPriceMinor, -7056399);
  assert.equal(result.comparison.monthlyChangePercentBps, -5040);
  assert.equal(result.historicalReference.pricePerKmMinor, 42217);
});

test("geçmiş kapsamı eksikse kayıt fiyat karşılaştırmasına dahil edilmez", () => {
  const result = buildRoomMonthlyPriceReference({
    roomId: 1,
    selectedAgreement: { ...selectedAgreement, weekMask: 31, pattern: "ONE_WAY" },
    historicalAgreements: [{
      id: 195,
      roomId: 1,
      status: "DONE",
      startDate: "2026-09-01",
      endDate: "2026-09-05",
      weekMask: 31,
      pattern: "ONE_WAY",
      direction: "INBOUND",
      roomOfferAmount: 14000000,
      vehicle: { type: "MINIBUS", capacity: 27 },
      shifts: [],
    }],
    periodPlanning: {
      ...currentPeriodPlanning,
      plannedMovementCount: 5,
      scheduledServiceDayCount: 5,
      routeTemplate: { distanceM: 66323, durationSec: 3617 },
    },
    periodPreview: currentPeriodPreview,
  });

  assert.equal(result.historicalReference.comparability, "LIMITED");
  assert.equal(result.comparison.status, "NOT_PROVEN");
  assert.equal(result.comparison.currentEstimatedCostMinusHistoricalPriceMinor, null);
  assert.match(result.historicalReference.comparabilityNote, /kanıt/i);
});

test("aktif geçmiş anlaşma tamamlanmış hizmet olmasa da ticari fiyat karşılaştırmasına girebilir", () => {
  const result = buildRoomMonthlyPriceReference({
    roomId: 1,
    selectedAgreement: { ...selectedAgreement, weekMask: 31, pattern: "ONE_WAY" },
    historicalAgreements: [{
      id: 199,
      roomId: 1,
      status: "ACTIVE",
      startDate: "2026-09-01",
      endDate: "2026-09-05",
      weekMask: 31,
      pattern: "ONE_WAY",
      direction: "INBOUND",
      roomOfferAmount: 12000000,
      vehicle: { type: "MINIBUS", capacity: 27 },
      shifts: Array.from({ length: 5 }, (_, index) => ({
        id: index + 1,
        startAt: `2026-09-0${index + 1}T04:00:00`,
        routeSnapshotDistanceM: 66323,
        routeSnapshotDurationSec: 3617,
        routeSnapshotInputHash: "same-route",
      })),
    }],
    periodPlanning: {
      ...currentPeriodPlanning,
      plannedMovementCount: 5,
      scheduledServiceDayCount: 5,
      routeTemplate: { distanceM: 66323, durationSec: 3617, inputHash: "same-route" },
    },
    periodPreview: currentPeriodPreview,
  });

  assert.equal(result.historicalReference.comparability, "COMPARABLE");
  assert.equal(result.comparison.currentQuoteFloorMinusHistoricalPriceMinor, -2_886_522);
  assert.equal(result.historicalReference.operationalEvidence.status, "PARTIAL");
});

test("aynı kapsamlı iki canonical dönem arasında maliyet ve teklif tabanı değişimini bileşenleriyle gösterir", () => {
  const result = buildRoomMonthlyPriceReference({
    roomId: 1,
    selectedAgreement: {
      ...selectedAgreement,
      startDate: "2026-10-01",
      endDate: "2026-10-05",
      weekMask: 31,
    },
    historicalAgreements: [{
      id: 195,
      roomId: 1,
      status: "DONE",
      startDate: "2026-09-01",
      endDate: "2026-09-05",
      weekMask: 31,
      pattern: "ONE_WAY",
      direction: "INBOUND",
      roomOfferAmount: 9_000_000,
      vehicle: { type: "MINIBUS", capacity: 27 },
      shifts: Array.from({ length: 5 }, (_, index) => ({
        id: index + 1,
        startAt: `2026-09-0${index + 1}T04:00:00`,
        routeSnapshotDistanceM: 66323,
        routeSnapshotDurationSec: 3617,
        routeSnapshotInputHash: "same-route",
      })),
    }],
    periodPlanning: {
      ...currentPeriodPlanning,
      periodStart: "2026-10-01",
      periodEnd: "2026-10-05",
      plannedMovementCount: 5,
      scheduledServiceDayCount: 5,
      periodPlanningCostMinor: 10_800_000,
      periodQuoteFloorMinor: 12_960_000,
      routeTemplate: { distanceM: 66323, durationSec: 3617, inputHash: "same-route" },
    },
    periodPreview: {
      operationalCostModel: {
        status: "complete",
        baselineOperationalCostMinor: 10_800_000,
        components: [
          { componentKey: "fuel", label: "Yakıt", amountMinor: 2_400_000, includedInBaseline: true, status: "complete" },
          { componentKey: "driver_labor", label: "Sürücü planlama maliyeti", amountMinor: 4_400_000, includedInBaseline: true, status: "complete" },
          { componentKey: "vehicle_fixed_allocated", label: "Araç dönem maliyeti", amountMinor: 4_000_000, includedInBaseline: true, status: "complete" },
        ],
      },
      quoteFloor: { quoteFloorMinor: 12_960_000, computed: true },
    },
    historicalPeriodPlanning: {
      periodStart: "2026-09-01",
      periodEnd: "2026-09-05",
      periodCostReady: true,
      periodPlanningCostMinor: 9_000_000,
      periodQuoteFloorMinor: 10_800_000,
    },
    historicalPeriodPreview: {
      operationalCostModel: {
        status: "complete",
        baselineOperationalCostMinor: 9_000_000,
        components: [
          { componentKey: "fuel", label: "Yakıt", amountMinor: 2_000_000, includedInBaseline: true, status: "complete" },
          { componentKey: "driver_labor", label: "Sürücü planlama maliyeti", amountMinor: 4_000_000, includedInBaseline: true, status: "complete" },
          { componentKey: "vehicle_fixed_allocated", label: "Araç dönem maliyeti", amountMinor: 3_000_000, includedInBaseline: true, status: "complete" },
        ],
      },
      quoteFloor: { quoteFloorMinor: 10_800_000, computed: true },
    },
  });

  assert.equal(result.historicalReference.comparability, "COMPARABLE");
  assert.equal(result.monthlyCostChange.status, "READY");
  assert.equal(result.monthlyCostChange.costDifferenceMinor, 1_800_000);
  assert.equal(result.monthlyCostChange.costChangePercentBps, 2_000);
  assert.equal(result.monthlyCostChange.quoteFloorDifferenceMinor, 2_160_000);
  assert.deepEqual(result.monthlyCostChange.components.map((item) => [item.componentKey, item.differenceMinor]), [
    ["fuel", 400_000],
    ["driver_labor", 400_000],
    ["vehicle_fixed_allocated", 1_000_000],
  ]);
});

test("karşılaştırılan dönem maliyeti eksikse aylık değişimi sıfır varsaymaz", () => {
  const result = buildRoomMonthlyPriceReference({
    roomId: 1,
    selectedAgreement: { ...selectedAgreement, weekMask: 31 },
    historicalAgreements: [{
      id: 195,
      roomId: 1,
      status: "DONE",
      startDate: "2026-09-01",
      endDate: "2026-09-05",
      weekMask: 31,
      pattern: "ONE_WAY",
      direction: "INBOUND",
      roomOfferAmount: 9_000_000,
      vehicle: { type: "MINIBUS", capacity: 27 },
      shifts: Array.from({ length: 5 }, (_, index) => ({
        id: index + 1,
        startAt: `2026-09-0${index + 1}T04:00:00`,
        routeSnapshotDistanceM: 66323,
        routeSnapshotDurationSec: 3617,
        routeSnapshotInputHash: "same-route",
      })),
    }],
    periodPlanning: { ...currentPeriodPlanning, weekMask: 31, plannedMovementCount: 5, scheduledServiceDayCount: 5, routeTemplate: { distanceM: 66323, durationSec: 3617, inputHash: "same-route" } },
    periodPreview: currentPeriodPreview,
    historicalPeriodPlanning: {
      periodStart: "2026-09-01",
      periodEnd: "2026-09-05",
      periodCostReady: false,
      periodPlanningCostMinor: null,
      periodQuoteFloorMinor: null,
    },
    historicalPeriodPreview: { operationalCostModel: { status: "incomplete", components: [] } },
  });

  assert.equal(result.monthlyCostChange.status, "NOT_PROVEN");
  assert.equal(result.monthlyCostChange.costDifferenceMinor, null);
  assert.equal(result.monthlyCostChange.costChangePercentBps, null);
  assert.equal(result.monthlyCostChange.components.length, 0);
});

test("aylık değişim fixture'ı aynı canonical maliyet motoru çıktılarıyla hesaplanır", () => {
  const buildCanonicalPreview = ({ agreementId, fixedVehicleCostMonthlyMinor, fuelUnitPriceMinor, driverBasePerShiftMinor }) => buildRoomProfitabilityAndQuoteFloorPreview({
    role: "ROOM",
    companyKind: "COMPANY",
    room: { id: 1, name: "Demo Room" },
    shift: {
      id: agreementId,
      roomId: 1,
      companyId: 1,
      vehicleId: 1,
      driverId: 1,
      status: "DONE",
      routeSnapshotDistanceM: 66323,
      routeSnapshotDurationSec: 3617,
      vehicle: { id: 1, type: "MINIBUS", capacity: 27 },
    },
    agreement: { id: agreementId, roomId: 1, companyId: 1, driverId: 1 },
    roomSummary: {},
    costInputs: {
      canonicalFuelProfile: { vehicleType: "MINIBUS", fuelType: "DIESEL", actualConsumptionLitersPer100Km: 21 },
      canonicalRoute: { serviceDistanceKm: 66.323, totalDistanceKm: 66.323, source: "DB_ROUTE_SNAPSHOT" },
      serviceDistanceKm: 66.323,
      totalDistanceKm: 66.323,
      routeDurationMinutes: 60.2833,
      shiftCount: 5,
      serviceDayCount: 5,
      fuelUnitPriceMinor,
      driverBasePerShiftMinor,
      driverCompensationMode: "per_shift",
      fixedVehicleCostMonthlyMinor,
      vehicleFixedCostAllocationMode: "per_service_day",
      allocationServiceDaysPerMonth: 5,
      allocationShiftsPerMonth: 5,
    },
    quoteFloorInputs: { targetContributionBps: 2000, riskReserveBps: 0 },
  });
  const historicalPreview = buildCanonicalPreview({ agreementId: 501, fixedVehicleCostMonthlyMinor: 3_000_000, fuelUnitPriceMinor: 10_000, driverBasePerShiftMinor: 800_000 });
  const currentPreview = buildCanonicalPreview({ agreementId: 502, fixedVehicleCostMonthlyMinor: 4_000_000, fuelUnitPriceMinor: 12_000, driverBasePerShiftMinor: 880_000 });
  const result = buildRoomMonthlyPriceReference({
    roomId: 1,
    selectedAgreement: { ...selectedAgreement, startDate: "2026-10-01", endDate: "2026-10-05", weekMask: 31 },
    historicalAgreements: [{
      id: 195,
      roomId: 1,
      status: "DONE",
      startDate: "2026-09-01",
      endDate: "2026-09-05",
      weekMask: 31,
      pattern: "ONE_WAY",
      direction: "INBOUND",
      roomOfferAmount: 9_000_000,
      vehicle: { type: "MINIBUS", capacity: 27 },
      shifts: Array.from({ length: 5 }, (_, index) => ({
        id: index + 1,
        startAt: `2026-09-0${index + 1}T04:00:00`,
        routeSnapshotDistanceM: 66323,
        routeSnapshotDurationSec: 3617,
        routeSnapshotInputHash: "same-route",
      })),
    }],
    periodPlanning: {
      ...currentPeriodPlanning,
      periodStart: "2026-10-01",
      periodEnd: "2026-10-05",
      plannedMovementCount: 5,
      scheduledServiceDayCount: 5,
      periodPlanningCostMinor: currentPreview.operationalCostModel.baselineOperationalCostMinor,
      periodQuoteFloorMinor: currentPreview.quoteFloor.quoteFloorMinor,
      routeTemplate: { distanceM: 66323, durationSec: 3617, inputHash: "same-route" },
    },
    periodPreview: currentPreview,
    historicalPeriodPlanning: {
      periodStart: "2026-09-01",
      periodEnd: "2026-09-05",
      periodCostReady: true,
      periodPlanningCostMinor: historicalPreview.operationalCostModel.baselineOperationalCostMinor,
      periodQuoteFloorMinor: historicalPreview.quoteFloor.quoteFloorMinor,
    },
    historicalPeriodPreview: historicalPreview,
  });

  assert.equal(result.monthlyCostChange.status, "READY");
  assert.equal(result.monthlyCostChange.costDifferenceMinor, currentPreview.operationalCostModel.baselineOperationalCostMinor - historicalPreview.operationalCostModel.baselineOperationalCostMinor);
  assert.equal(result.monthlyCostChange.quoteFloorDifferenceMinor, currentPreview.quoteFloor.quoteFloorMinor - historicalPreview.quoteFloor.quoteFloorMinor);
  assert.equal(result.monthlyCostChange.components.some((item) => item.componentKey === "fuel"), true);
  assert.equal(result.monthlyCostChange.components.some((item) => item.componentKey === "driver_labor"), true);
  assert.equal(result.monthlyCostChange.components.some((item) => item.componentKey === "vehicle_fixed_allocated"), true);
});
