import test from "node:test";
import assert from "node:assert/strict";
import {
  buildVehicleStopBuckets,
  resolveRoomBaselineAgreement,
  resolveCompanyScenarioContext,
  buildRoomFocusShiftWhere,
  isContractlessMarketShift,
  classifyShiftBaselineDataClass,
  shouldUseContractlessPlanningDefaults,
  buildContractlessPeriodPlanning,
  buildCostScenarioPreviewFromBaseline,
  roomScenarioVehicleSelect,
} from "./costScenario.js";

test("P9 sonrası senaryo araç seçimi doğrulanmış HGS sınıfını taşır", () => {
  const select = roomScenarioVehicleSelect();
  assert.equal(select.hgsClass, true);
  assert.deepEqual(select, {
    id: true,
    plate: true,
    capacity: true,
    type: true,
    status: true,
    driverId: true,
    hgsClass: true,
  });
});

test("iki duraklı hizmet üç araçlı önizlemeyi gereksiz yere bloke etmez", () => {
  const buckets = buildVehicleStopBuckets([
    { id: 11, order: 1, lat: 41.01, lng: 29.01 },
    { id: 12, order: 2, lat: 41.02, lng: 29.02 },
  ], 3);

  assert.equal(buckets.length, 3);
  assert.deepEqual(buckets.map((bucket) => bucket.map((stop) => stop.id)), [[11], [12], [11]]);
  assert.ok(buckets.every((bucket) => bucket.length > 0));
});

test("geçersiz veya boş durak kümesi sessizce rota uydurmaz", () => {
  assert.deepEqual(buildVehicleStopBuckets([], 3), []);
  assert.deepEqual(buildVehicleStopBuckets([{ id: 11, order: 1, lat: 41.01, lng: 29.01 }], 1), []);
});

test("sözleşmesiz seçili vardiya oda sözleşmesine sessizce bağlanmaz", () => {
  const latestAgreement = { id: 199, status: "APPROVED" };
  assert.equal(resolveRoomBaselineAgreement({
    explicitlySelected: true,
    selectedAgreement: null,
    shiftAgreement: null,
    fallbackAgreement: latestAgreement,
  }), null);
  assert.equal(resolveRoomBaselineAgreement({
    explicitlySelected: true,
    selectedAgreement: null,
    shiftAgreement: { id: 207, status: "APPROVED" },
    fallbackAgreement: latestAgreement,
  }).id, 207);
  assert.equal(resolveRoomBaselineAgreement({
    explicitlySelected: false,
    selectedAgreement: null,
    shiftAgreement: null,
    fallbackAgreement: latestAgreement,
  }).id, 199);
});

test("COMPANY senaryo bağlamı yalnız aynı talep sözleşmesi ve vardiyayı birlikte çözer", () => {
  const selectedAgreement = { id: 2, companyId: 1, startDate: "2026-10-01", endDate: "2026-10-31" };
  const selectedShift = { id: 4, companyId: 1, agreementId: 2, startAt: "2026-10-22T05:00:00.000Z" };
  const unrelatedShift = { id: 3, companyId: 1, agreementId: 1, startAt: "2026-09-15T05:00:00.000Z" };

  const resolved = resolveCompanyScenarioContext({
    companyId: 1,
    focusAgreementId: 2,
    focusShiftId: 4,
    selectedAgreement,
    selectedShift,
    fallbackAgreement: { id: 1, companyId: 1 },
    fallbackShift: unrelatedShift,
  });
  assert.equal(resolved.status, "RESOLVED");
  assert.equal(resolved.agreement.id, 2);
  assert.equal(resolved.shift.id, 4);

  const mismatch = resolveCompanyScenarioContext({
    companyId: 1,
    focusAgreementId: 2,
    focusShiftId: 3,
    selectedAgreement,
    selectedShift: unrelatedShift,
    fallbackAgreement: { id: 1, companyId: 1 },
    fallbackShift: unrelatedShift,
  });
  assert.equal(mismatch.status, "NO_CANONICAL_CONTEXT");
  assert.equal(mismatch.agreement, null);
  assert.equal(mismatch.shift, null);
});

test("ROOM seçili market vardiyasını yalnız aktif kendi teklifinden okuyabilir", () => {
  assert.deepEqual(buildRoomFocusShiftWhere({ roomId: 21, focusShiftId: 356 }), {
    id: 356,
    status: { not: "DRAFT" },
    OR: [
      { roomId: 21 },
      {
        roomId: null,
        offers: {
          some: {
            roomId: 21,
            status: { in: ["OPEN", "COUNTERED", "ACCEPTED"] },
          },
        },
      },
    ],
  });
});

test("sözleşmesiz market talebi gerçekleşen vardiya gibi sınıflandırılmaz", () => {
  const marketShift = {
    id: 412,
    roomId: null,
    agreementId: null,
    vehicleId: null,
    driverId: null,
    status: "REQUESTED",
  };
  assert.equal(isContractlessMarketShift(marketShift), true);
  assert.equal(classifyShiftBaselineDataClass(marketShift), "INTERNAL_PLANNED");
  const actualShift = {
    id: 367,
    roomId: 21,
    agreementId: 209,
    vehicleId: 8,
    driverId: 5,
    status: "DONE",
  };
  assert.equal(isContractlessMarketShift(actualShift), false);
  assert.equal(classifyShiftBaselineDataClass(actualShift), "INTERNAL_ACTUAL");
});

test("sözleşmesiz market planı yalnız planlama profilini kullanabilir", () => {
  const marketShift = {
    id: 412,
    roomId: null,
    agreementId: null,
    vehicleId: null,
    driverId: null,
    status: "REQUESTED",
  };
  const actualShift = {
    id: 367,
    roomId: 21,
    agreementId: 209,
    vehicleId: 8,
    driverId: 5,
    status: "DONE",
  };

  assert.equal(shouldUseContractlessPlanningDefaults(marketShift), true);
  assert.equal(shouldUseContractlessPlanningDefaults(actualShift), false);
});

test("sözleşmesiz dönem planı takvim yoksa kesin toplam üretmez", () => {
  const result = buildContractlessPeriodPlanning({
    baseline: {
      routeShift: { id: 412, roomId: null, agreementId: null, vehicleId: null, driverId: null, status: "REQUESTED" },
      input: {},
      vehicleCostInputsByType: {},
    },
    planningSchedule: null,
  });

  assert.equal(result.scopeStatus, "NOT_PROVEN");
  assert.ok(result.missing.includes("Hizmet dönemi ve sıklığı"));
  assert.equal(result.plannedMovementCount, null);
});

test("sözleşmesiz dönem planı seçili canonical rota ile yalnız önizleme kapsamı oluşturur", () => {
  const result = buildContractlessPeriodPlanning({
    baseline: {
      routeShift: {
        id: 412,
        roomId: null,
        agreementId: null,
        vehicleId: null,
        driverId: null,
        status: "REQUESTED",
        routeSnapshotDistanceM: 5829,
        routeSnapshotDurationSec: 638,
        routeSnapshotInputHash: "route-412",
      },
      input: {},
      vehicleCostInputsByType: {
        OTOBUS: {
          input: { vehicleType: "OTOBUS", vehicleCapacity: 50 },
          planningComponents: {
            driver_labor: { input: { driverBasePerShiftMinor: 500_000 } },
            vehicle_variable: { input: { maintenancePerKmMinor: 9_500 } },
          },
        },
      },
    },
    scenarioOverrides: { vehicleType: "OTOBUS" },
    planningSchedule: {
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
      weekMask: 31,
      startMin: 360,
      endMin: 480,
      movementsPerDay: 1,
    },
  });

  assert.equal(result.scopeStatus, "READY_WITH_PLANNING_ASSUMPTION");
  assert.equal(result.scheduledServiceDayCount, 22);
  assert.equal(result.plannedMovementCount, 22);
  assert.equal(result.routeTemplate.distanceM, 5829);
  assert.equal(result.readOnly, true);
  assert.equal(result.writeAction, false);
});

test("sözleşmesiz teklif önizlemesi bağımsız canonical planlama maliyetini gösterir", async () => {
  const baseline = {
    scope: "ROOM",
    companyKind: "COMPANY",
    tenantScope: "room_1",
    baselineReference: "base_contractless_fixture",
    baselineConfidence: { level: "LOW", score: 50, missingFields: [] },
    source: { type: "SHIFT", shiftId: 413 },
    input: {
      passengerCount: 35,
      stopCount: 2,
      serviceDistanceKm: 10,
      totalDistanceKm: 10,
      routeDurationMinutes: 30,
      currencyCode: "TRY",
    },
    vehicleCostInputsByType: {
      MINIBUS: {
        dataClass: "DEMO_PLANNING_ASSUMPTION",
        input: {
          vehicleType: "MINIBUS",
          vehicleCapacity: 16,
          vehicleCount: 1,
          fuelType: "DIESEL",
          fuelConsumptionLitersPer100Km: 7.9,
        },
        planningComponents: {
          vehicle_variable: {
            input: { maintenancePerKmMinor: 9500 },
            evidence: { dataClass: "DEMO_PLANNING_ASSUMPTION", actual: false, componentKey: "vehicle_variable", sourceRefs: ["fixture:maintenance"] },
          },
          driver_labor: {
            input: { driverBasePerShiftMinor: 500000, driverCompensationMode: "per_shift" },
            evidence: { dataClass: "DEMO_PLANNING_ASSUMPTION", actual: false, componentKey: "driver_labor", sourceRefs: ["fixture:driver"] },
          },
        },
      },
    },
  };
  const result = await buildCostScenarioPreviewFromBaseline({
    user: { role: "ROOM", roomId: 1 },
    baseline,
    scenarioOverrides: {
      vehicleType: "MINIBUS",
      vehicleCount: 3,
      vehicleCapacity: 16,
      serviceDistanceKm: 40,
      totalDistanceKm: 40,
      routeDurationMinutes: 120,
      shiftCount: 4,
      serviceDayCount: 4,
      tripCount: 4,
    },
    externalReference: {
      marketReference: {
        valueMinor: 9684,
        valueDecimal: "96.84",
        currencyCode: "TRY",
        family: "FUEL_DIESEL",
        unit: "CURRENCY_PER_L",
        providerKey: "EPDK_PETROL_BULLETIN",
        freshness: "FRESH",
        confidence: "MEDIUM",
        asOf: "2026-10-30T22:15:08.814Z",
      },
    },
    independentRouteQuoteAdvice: true,
  });

  assert.equal(result.status, "READY");
  assert.equal(result.scenario.requiredVehicleCount, 3);
  assert.ok(Number.isSafeInteger(result.scenario.costMinor));
  assert.equal(result.scenario.costBasis, "INTERNAL_DATA_PLANNING_ESTIMATE");
  assert.equal(result.confidence.level, "MEDIUM");
  assert.match(result.summaryText, /Sözleşmesiz talep/i);
  assert.equal(result.costCoverage.scenario.status, "PARTIAL");
  assert.deepEqual(
    result.costCoverage.scenario.missingOptionalCosts.map((item) => item.key).sort(),
    ["adblue", "route_fees", "vehicle_fixed"],
  );
});

test("bağımsız sözleşmesiz önizleme planlama kapasitesini ve araç rotası bölümlerini korur", async () => {
  const planningComponents = {
    vehicle_variable: {
      input: { maintenancePerKmMinor: 9500 },
      evidence: { dataClass: "DEMO_PLANNING_ASSUMPTION", actual: false, componentKey: "vehicle_variable", sourceRefs: ["fixture:maintenance"] },
    },
    driver_labor: {
      input: { driverBasePerShiftMinor: 500000, driverCompensationMode: "per_shift" },
      evidence: { dataClass: "DEMO_PLANNING_ASSUMPTION", actual: false, componentKey: "driver_labor", sourceRefs: ["fixture:driver"] },
    },
  };
  const baseline = {
    scope: "ROOM",
    companyKind: "COMPANY",
    tenantScope: "room_1",
    baselineReference: "base_contractless_route_fixture",
    baselineConfidence: { level: "LOW", score: 50, missingFields: [] },
    source: { type: "SHIFT", shiftId: 413 },
    input: { passengerCount: 35, stopCount: 2, serviceDistanceKm: 10, totalDistanceKm: 10, routeDurationMinutes: 30, currencyCode: "TRY" },
    vehicleCostInputsByType: {
      MINIBUS: { dataClass: "DEMO_PLANNING_ASSUMPTION", input: { vehicleType: "MINIBUS", vehicleCapacity: 16, fuelType: "DIESEL", fuelConsumptionLitersPer100Km: 7.9 }, planningComponents },
      MIDIBUS: { dataClass: "DEMO_PLANNING_ASSUMPTION", input: { vehicleType: "MIDIBUS", vehicleCapacity: 29, fuelType: "DIESEL", fuelConsumptionLitersPer100Km: 21 }, planningComponents },
      OTOBUS: { dataClass: "DEMO_PLANNING_ASSUMPTION", input: { vehicleType: "OTOBUS", vehicleCapacity: 50, fuelType: "DIESEL", fuelConsumptionLitersPer100Km: 29 }, planningComponents },
    },
  };
  const routeEvidenceOverride = {
    baseline: { distanceKm: 10, durationMinutes: 30, source: "OSRM_ROUTE", stopCount: 2, passage: { status: "NOT_PROVEN", totalMinor: null, currencyCode: "TRY", items: [], missingReasons: ["fixture"] } },
    scenario: { distanceKm: 10, durationMinutes: 30, source: "OSRM_ROUTE", stopCount: 2, passage: { status: "NOT_PROVEN", totalMinor: null, currencyCode: "TRY", items: [], missingReasons: ["fixture"] } },
    vehiclePartitionEvidenceRequested: true,
    passengerAllocationEvidenceRequested: true,
    vehiclePartitionsByCount: {
      "2": { status: "READY", totalDistanceKm: 21, durationMinutes: 34, source: "OSRM_ROUTE_PARTITION", passengerAllocationEvidenceRequested: true, passengerCount: 35, routes: [{ passengerCount: 18, distanceKm: 10, durationMinutes: 30 }, { passengerCount: 17, distanceKm: 11, durationMinutes: 34 }] },
      "3": { status: "READY", totalDistanceKm: 32, durationMinutes: 36, source: "OSRM_ROUTE_PARTITION", passengerAllocationEvidenceRequested: true, passengerCount: 35, routes: [{ passengerCount: 12, distanceKm: 10, durationMinutes: 30 }, { passengerCount: 12, distanceKm: 11, durationMinutes: 32 }, { passengerCount: 11, distanceKm: 11, durationMinutes: 36 }] },
    },
    vehiclePassageEvidenceByCount: {},
    alternative: { status: "NOT_REQUESTED", type: null, source: "OSRM_ROUTE", compared: false, applied: false, stopOperations: [], errors: [], reason: "fixture" },
  };
  const result = await buildCostScenarioPreviewFromBaseline({
    user: { role: "ROOM", roomId: 1 },
    baseline,
    scenarioOverrides: { vehicleType: "MINIBUS", vehicleCount: 3, vehicleCapacity: 16, passengerCount: 35, serviceDistanceKm: 32, totalDistanceKm: 32, routeDurationMinutes: 36 },
    externalReference: { marketReference: { valueMinor: 9684, valueDecimal: "96.84", currencyCode: "TRY", family: "FUEL_DIESEL", unit: "CURRENCY_PER_L", providerKey: "EPDK_PETROL_BULLETIN", freshness: "FRESH", confidence: "MEDIUM", asOf: "2026-10-30T22:15:08.814Z" } },
    independentRouteQuoteAdvice: true,
    routeEvidenceOverride,
  });

  const minibus = result.vehiclePlanAlternatives.alternatives.find((item) => item.vehicleType === "MINIBUS");
  const midibus = result.vehiclePlanAlternatives.alternatives.find((item) => item.vehicleType === "MIDIBUS");
  assert.equal(minibus.requiredVehicleCount, 3);
  assert.equal(minibus.capacity, 16);
  assert.deepEqual(minibus.routePartition.routes.map((route) => route.passengerCount), [12, 12, 11]);
  assert.equal(midibus.requiredVehicleCount, 2);
  assert.equal(midibus.capacity, 29);
});

test("bağımsız sözleşmesiz alternatifler planlanan hareket sayısını rota ve değişken maliyete uygular", async () => {
  const planningComponents = {
    vehicle_variable: {
      input: { maintenancePerKmMinor: 9500 },
      evidence: { dataClass: "DEMO_PLANNING_ASSUMPTION", actual: false, componentKey: "vehicle_variable", sourceRefs: ["fixture:maintenance"] },
    },
    driver_labor: {
      input: { driverBasePerShiftMinor: 500000, driverCompensationMode: "per_shift" },
      evidence: { dataClass: "DEMO_PLANNING_ASSUMPTION", actual: false, componentKey: "driver_labor", sourceRefs: ["fixture:driver"] },
    },
  };
  const baseline = {
    scope: "ROOM",
    companyKind: "COMPANY",
    tenantScope: "room_1",
    baselineReference: "base_contractless_period_route_fixture",
    baselineConfidence: { level: "LOW", score: 50, missingFields: [] },
    source: { type: "SHIFT", shiftId: 413 },
    input: { passengerCount: 35, stopCount: 2, serviceDistanceKm: 10, totalDistanceKm: 10, routeDurationMinutes: 30, currencyCode: "TRY" },
    vehicleCostInputsByType: {
      MINIBUS: { dataClass: "DEMO_PLANNING_ASSUMPTION", input: { vehicleType: "MINIBUS", vehicleCapacity: 16, fuelType: "DIESEL", fuelConsumptionLitersPer100Km: 7.9 }, planningComponents },
      MIDIBUS: { dataClass: "DEMO_PLANNING_ASSUMPTION", input: { vehicleType: "MIDIBUS", vehicleCapacity: 29, fuelType: "DIESEL", fuelConsumptionLitersPer100Km: 21 }, planningComponents },
      OTOBUS: { dataClass: "DEMO_PLANNING_ASSUMPTION", input: { vehicleType: "OTOBUS", vehicleCapacity: 50, fuelType: "DIESEL", fuelConsumptionLitersPer100Km: 29 }, planningComponents },
    },
  };
  const result = await buildCostScenarioPreviewFromBaseline({
    user: { role: "ROOM", roomId: 1 },
    baseline,
    scenarioOverrides: {
      vehicleType: "MINIBUS",
      vehicleCount: 3,
      vehicleCapacity: 16,
      passengerCount: 35,
      serviceDistanceKm: 32,
      totalDistanceKm: 32,
      routeDurationMinutes: 36,
      shiftCount: 4,
      serviceDayCount: 4,
      tripCount: 4,
    },
    periodPlanning: { plannedMovementCount: 4 },
    externalReference: { marketReference: { valueMinor: 9684, valueDecimal: "96.84", currencyCode: "TRY", family: "FUEL_DIESEL", unit: "CURRENCY_PER_L", providerKey: "EPDK_PETROL_BULLETIN", freshness: "FRESH", confidence: "MEDIUM", asOf: "2026-10-30T22:15:08.814Z" } },
    independentRouteQuoteAdvice: true,
    routeEvidenceOverride: {
      baseline: { distanceKm: 10, durationMinutes: 30, source: "OSRM_ROUTE", stopCount: 2, passage: { status: "NOT_PROVEN", totalMinor: null, currencyCode: "TRY", items: [], missingReasons: ["fixture"] } },
      scenario: { distanceKm: 10, durationMinutes: 30, source: "OSRM_ROUTE", stopCount: 2, passage: { status: "NOT_PROVEN", totalMinor: null, currencyCode: "TRY", items: [], missingReasons: ["fixture"] } },
      vehiclePartitionEvidenceRequested: true,
      passengerAllocationEvidenceRequested: true,
      vehiclePartitionsByCount: {
        "2": { status: "READY", totalDistanceKm: 21, durationMinutes: 34, source: "OSRM_ROUTE_PARTITION", passengerAllocationEvidenceRequested: true, passengerCount: 35, routes: [{ passengerCount: 18, distanceKm: 10, durationMinutes: 30 }, { passengerCount: 17, distanceKm: 11, durationMinutes: 34 }] },
        "3": { status: "READY", totalDistanceKm: 32, durationMinutes: 36, source: "OSRM_ROUTE_PARTITION", passengerAllocationEvidenceRequested: true, passengerCount: 35, routes: [{ passengerCount: 12, distanceKm: 10, durationMinutes: 30 }, { passengerCount: 12, distanceKm: 11, durationMinutes: 32 }, { passengerCount: 11, distanceKm: 11, durationMinutes: 36 }] },
      },
      vehiclePassageEvidenceByCount: {},
      alternative: { status: "NOT_REQUESTED", type: null, source: "OSRM_ROUTE", compared: false, applied: false, stopOperations: [], errors: [], reason: "fixture" },
    },
  });

  const minibus = result.vehiclePlanAlternatives.alternatives.find((item) => item.vehicleType === "MINIBUS");
  assert.equal(minibus.periodMovementCount, 4);
  assert.equal(minibus.routeDistanceKm, 128);
  assert.equal(minibus.planningComponentBreakdown.find((item) => item.key === "vehicle_variable")?.amountMinor, 1_216_000);
  const minibusDriver = minibus.planningComponentBreakdown.find((item) => item.key === "driver_labor");
  assert.equal(minibusDriver?.amountMinor, 6_000_000);
  assert.match(minibusDriver?.calculationEvidence?.join("; ") || "", /1500000.*4/);
  assert.equal(result.vehiclePlanAlternatives.alternatives.find((item) => item.vehicleType === "MIDIBUS")?.planningComponentBreakdown.find((item) => item.key === "driver_labor")?.amountMinor, 4_000_000);
  assert.equal(result.scenario.costMinor, minibus.planningCostMinor);
});
