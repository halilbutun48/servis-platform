import assert from "node:assert/strict";
import test from "node:test";

import {
  buildContractlessServicePeriodPlanningScope,
  buildPeriodCostInputOverrides,
  buildPeriodPlanningSummary,
  buildServicePeriodPlanningScope,
} from "./servicePeriodPlanning.js";
import { buildRoomProfitabilityAndQuoteFloorPreview } from "./roomProfitabilityAndQuoteFloor.js";

const agreement204 = {
  id: 204,
  startDate: "2026-11-01",
  endDate: "2026-11-30",
  weekMask: 127,
  startMin: 720,
  endMin: 960,
  pattern: "ONE_WAY",
  direction: "INBOUND",
  vehicleId: 5,
  driverId: 2,
};

const linkedShifts = [
  { id: 353, agreementId: 204, startAt: "2026-11-01T09:00:00.000Z", routeSnapshotDistanceM: 2576, routeSnapshotDurationSec: 246, routeSnapshotInputHash: "same-route" },
  { id: 354, agreementId: 204, startAt: "2026-11-02T09:00:00.000Z", routeSnapshotDistanceM: 2576, routeSnapshotDurationSec: 246, routeSnapshotInputHash: "same-route" },
  { id: 355, agreementId: 204, startAt: "2026-11-03T09:00:00.000Z", routeSnapshotDistanceM: 2576, routeSnapshotDurationSec: 246, routeSnapshotInputHash: "same-route" },
];

const pendingAgreement207 = {
  id: 207,
  startDate: "2026-11-03",
  endDate: "2026-11-09",
  weekMask: 62,
  startMin: 420,
  endMin: 540,
  pattern: "ONE_WAY",
  direction: "INBOUND",
  vehicleId: null,
  driverId: null,
};

const planningTemplateShift356 = {
  id: 356,
  agreementId: null,
  status: "DRAFT",
  routeSnapshotDistanceM: 2576,
  routeSnapshotDurationSec: 246,
  routeSnapshotInputHash: "source-route-356",
};

test("contractless planning uses only the user-entered calendar and route template", () => {
  const result = buildContractlessServicePeriodPlanningScope({
    planningSchedule: {
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
      weekMask: 31,
      startMin: 360,
      endMin: 480,
      movementsPerDay: 1,
      direction: "INBOUND",
      pattern: "ONE_WAY",
    },
    planningTemplateShifts: [planningTemplateShift356],
    planningAssumptions: {
      driverBasePerShiftMinor: 500_000,
      maintenancePerKmMinor: 9_500,
    },
  });

  assert.equal(result.scopeStatus, "READY_WITH_PLANNING_ASSUMPTION");
  assert.equal(result.agreementId, null);
  assert.equal(result.scheduledServiceDayCount, 22);
  assert.equal(result.plannedMovementCount, 22);
  assert.equal(result.movementsPerDay, 1);
  assert.equal(result.scheduleSource, "USER_ENTERED_PLANNING");
  assert.equal(result.startMin, 360);
  assert.equal(result.endMin, 480);
  assert.deepEqual(result.planningTemplateSourceShiftIds, [356]);
  assert.match(result.assumptions.join(" "), /gerçekleşmiş operasyon sayılmaz/);
});

test("contractless planning stays fail-closed when calendar or frequency is absent", () => {
  const result = buildContractlessServicePeriodPlanningScope({
    planningSchedule: {
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
      startMin: 360,
      endMin: 480,
    },
    planningTemplateShifts: [planningTemplateShift356],
  });

  assert.equal(result.scopeStatus, "NOT_PROVEN");
  assert.equal(result.plannedMovementCount, null);
  assert.ok(result.missing.includes("Hizmet dönemi ve sıklığı"));
  assert.ok(result.missing.includes("Günlük sefer sıklığı"));
  assert.equal(result.scheduleSource, "USER_ENTERED_PLANNING");
});

test("contractless movement frequency scales the canonical route once per planned movement", () => {
  const scope = buildContractlessServicePeriodPlanningScope({
    planningSchedule: {
      periodStart: "2026-09-01",
      periodEnd: "2026-09-02",
      weekMask: 31,
      startMin: 360,
      endMin: 480,
      movementsPerDay: 2,
    },
    planningTemplateShifts: [planningTemplateShift356],
    planningAssumptions: { driverBasePerShiftMinor: 500_000, maintenancePerKmMinor: 9_500 },
  });
  const result = buildPeriodCostInputOverrides({
    scope,
    costInputs: { serviceDistanceKm: 2.576, totalDistanceKm: 2.576, routeDurationMinutes: 4 },
  });

  assert.equal(scope.scheduledServiceDayCount, 2);
  assert.equal(scope.plannedMovementCount, 4);
  assert.equal(result.serviceDayCount, 4);
  assert.equal(result.shiftCount, 4);
  assert.equal(result.serviceDistanceKm, 10.304);
  assert.equal(result.routeDurationMinutes, 16);
});

test("Agreement #204 counts 30 eligible plan days but only 3 observed linked shifts", () => {
  const result = buildServicePeriodPlanningScope({
    agreement: agreement204,
    shifts: linkedShifts,
    periodStart: "2026-11-01",
    periodEnd: "2026-11-30",
  });

  assert.equal(result.scopeStatus, "READY_WITH_PLANNING_ASSUMPTION");
  assert.equal(result.scheduledServiceDayCount, 30);
  assert.equal(result.plannedMovementCount, 30);
  assert.equal(result.observedLinkedShiftCount, 3);
  assert.deepEqual(result.observedShiftIds, [353, 354, 355]);
  assert.equal(result.routeTemplate.distanceM, 2576);
  assert.equal(result.routeTemplate.durationSec, 246);
  assert.match(result.assumptions.join(" "), /Her planlı günde bir sözleşme vardiyası/);
});

test("a pending agreement can use its source shift only as a planning template", () => {
  const result = buildServicePeriodPlanningScope({
    agreement: pendingAgreement207,
    shifts: [],
    planningTemplateShifts: [planningTemplateShift356],
    periodStart: "2026-11-03",
    periodEnd: "2026-11-09",
  });

  assert.equal(result.scopeStatus, "READY_WITH_PLANNING_ASSUMPTION");
  assert.equal(result.scheduledServiceDayCount, 5);
  assert.equal(result.plannedMovementCount, 5);
  assert.equal(result.observedLinkedShiftCount, 0);
  assert.deepEqual(result.observedShiftIds, []);
  assert.equal(result.routeTemplate.sourceShiftId, 356);
  assert.deepEqual(result.planningTemplateSourceShiftIds, [356]);
  assert.match(result.assumptions.join(" "), /yalnız planlama şablonudur/);
  assert.match(result.assumptions.join(" "), /gerçekleşmiş operasyon sayılmaz/);
});

test("explicit planning costs can replace missing real assignments without creating an operation", () => {
  const result = buildServicePeriodPlanningScope({
    agreement: pendingAgreement207,
    shifts: [],
    planningTemplateShifts: [planningTemplateShift356],
    planningAssumptions: {
      driverBasePerShiftMinor: 120_000,
      fixedVehicleCostMonthlyMinor: 6_000_000,
    },
    periodStart: "2026-11-03",
    periodEnd: "2026-11-09",
  });

  assert.equal(result.scopeStatus, "READY_WITH_PLANNING_ASSUMPTION");
  assert.deepEqual(result.missing, []);
  assert.equal(result.observedLinkedShiftCount, 0);
  assert.match(result.assumptions.join(" "), /gerçek tahsis kanıtı değildir/);
  assert.match(result.assumptions.join(" "), /gerçekleşmiş çalışma kanıtı değildir/);
});

test("repeated schedule does not turn three observed shifts into ninety movements", () => {
  const result = buildServicePeriodPlanningScope({
    agreement: agreement204,
    shifts: linkedShifts,
    periodStart: "2026-11-01",
    periodEnd: "2026-11-30",
  });

  assert.equal(result.plannedMovementCount, 30);
  assert.notEqual(result.plannedMovementCount, result.scheduledServiceDayCount * result.observedLinkedShiftCount);
});

test("different route templates block a full-period route assumption", () => {
  const result = buildServicePeriodPlanningScope({
    agreement: agreement204,
    shifts: [
      ...linkedShifts,
      { id: 356, agreementId: 204, startAt: "2026-11-04T09:00:00.000Z", routeSnapshotDistanceM: 4000, routeSnapshotDurationSec: 300, routeSnapshotInputHash: "different-route" },
    ],
    periodStart: "2026-11-01",
    periodEnd: "2026-11-30",
  });

  assert.equal(result.scopeStatus, "NOT_PROVEN");
  assert.equal(result.routeTemplate, null);
  assert.ok(result.missing.includes("Tekrarlanan hizmet günleri için tek rota şablonu"));
});

test("period cost overrides scale the canonical route once per planned movement", () => {
  const scope = buildServicePeriodPlanningScope({
    agreement: agreement204,
    shifts: linkedShifts,
    periodStart: "2026-11-01",
    periodEnd: "2026-11-30",
  });
  const result = buildPeriodCostInputOverrides({
    scope,
    costInputs: {
      serviceDistanceKm: 2.576,
      totalDistanceKm: 2.576,
      routeDurationMinutes: 4,
      canonicalRoute: {
        serviceDistanceKm: 2.576,
        totalDistanceKm: 2.576,
        emptyDistanceKm: null,
      },
    },
  });

  assert.equal(result.shiftCount, 30);
  assert.equal(result.serviceDayCount, 30);
  assert.equal(result.tripCount, 30);
  assert.equal(result.serviceDistanceKm, 77.28);
  assert.equal(result.totalDistanceKm, 77.28);
  assert.equal(result.routeDurationMinutes, 120);
  assert.equal(result.canonicalRoute.serviceDistanceKm, 77.28);
});

test("period cost overrides scale an explicit empty-kilometre assumption with the route", () => {
  const scope = buildServicePeriodPlanningScope({
    agreement: agreement204,
    shifts: linkedShifts,
    periodStart: "2026-11-01",
    periodEnd: "2026-11-30",
  });
  const result = buildPeriodCostInputOverrides({
    scope,
    costInputs: {
      serviceDistanceKm: 2.576,
      emptyDistanceKm: 1.5,
      canonicalRoute: {
        serviceDistanceKm: 2.576,
        emptyDistanceKm: null,
        totalDistanceKm: null,
      },
    },
  });

  assert.equal(result.serviceDistanceKm, 77.28);
  assert.equal(result.emptyDistanceKm, 45);
  assert.equal(result.totalDistanceKm, 122.28);
  assert.equal(result.canonicalRoute.totalDistanceKm, 122.28);
});

test("period planning recalculates total distance when an explicit empty-distance assumption overrides a stale route total", () => {
  const scope = buildServicePeriodPlanningScope({
    agreement: agreement204,
    shifts: linkedShifts,
    periodStart: "2026-11-01",
    periodEnd: "2026-11-30",
  });
  const result = buildPeriodCostInputOverrides({
    scope,
    costInputs: {
      emptyDistanceKm: 1.5,
      canonicalRoute: {
        serviceDistanceKm: 2.576,
        totalDistanceKm: 2.576,
        emptyDistanceKm: null,
        source: "DB_ROUTE_SNAPSHOT",
      },
    },
  });

  assert.equal(result.serviceDistanceKm, 77.28);
  assert.equal(result.emptyDistanceKm, 45);
  assert.equal(result.totalDistanceKm, 122.28);
  assert.equal(result.canonicalRoute.totalDistanceKm, 122.28);
});

test("complete explicit planning inputs make the full-period forecast comparable without proving realized net profit", () => {
  const scope = buildServicePeriodPlanningScope({
    agreement: agreement204,
    shifts: linkedShifts,
    periodStart: "2026-11-01",
    periodEnd: "2026-11-30",
  });
  const periodCostInputs = buildPeriodCostInputOverrides({
    scope,
    costInputs: {
      emptyDistanceKm: 1.5,
      fixedVehicleCostMonthlyMinor: 6_000_000,
      vehicleFixedCostAllocationMode: "per_service_day",
      allocationServiceDaysPerMonth: 60,
      driverBasePerShiftMinor: 120_000,
      driverCompensationMode: "per_shift",
      fuelUnitPriceMinor: 9_680,
      canonicalFuelProfile: { vehicleType: "BUS", fuelType: "DIESEL", actualConsumptionLitersPer100Km: 21 },
      canonicalRoute: { serviceDistanceKm: 2.576, totalDistanceKm: null, emptyDistanceKm: null, source: "DB_ROUTE_SNAPSHOT" },
    },
  });
  const preview = buildRoomProfitabilityAndQuoteFloorPreview({
    role: "ROOM",
    room: { id: 1, name: "Demo Room" },
    shift: { id: 355, roomId: 1, driverId: 2, routeSnapshotDistanceM: 2576, routeSnapshotDurationSec: 246, vehicle: { id: 5, type: "BUS", capacity: 50 } },
    agreement: agreement204,
    costInputs: periodCostInputs,
    quoteFloorInputs: { targetContributionBps: 2_000, riskReserveBps: 500, quoteScenarioAmountMinor: 20_000_000 },
  });

  const result = buildPeriodPlanningSummary({ scope, preview });

  assert.equal(result.status, "READY");
  assert.equal(result.comparisonAllowed, true);
  assert.equal(result.periodCostReady, true);
  assert.equal(result.periodPlanningCostMinor, preview.quoteFloor.baselineOperationalCostMinor);
  assert.equal(result.periodExpectedGainMinor, 20_000_000 - preview.quoteFloor.quoteFloorMinor);
  assert.equal(result.missing.length, 0);
  assert.equal(result.assumptions.some((item) => item.includes("varsayım")), true);
});

test("period summary reports the canonical model total instead of a single-component quote-floor override", () => {
  const scope = buildServicePeriodPlanningScope({
    agreement: agreement204,
    shifts: linkedShifts,
    periodStart: "2026-11-01",
    periodEnd: "2026-11-30",
  });
  const result = buildPeriodPlanningSummary({
    scope,
    preview: {
      operationalCostModel: {
        status: "complete",
        baselineOperationalCostMinor: 6_817_277,
        components: [
          { componentKey: "fuel", includedInBaseline: true },
          { componentKey: "driver_labor", includedInBaseline: true },
          { componentKey: "vehicle_fixed_allocated", includedInBaseline: true },
        ],
      },
      fuelCalculation: { status: "SCENARIO_INPUT_ESTIMATE" },
      quoteFloor: {
        computed: true,
        baselineOperationalCostMinor: 217_277,
        quoteFloorMinor: 285_177,
        missingFields: [],
      },
      roomProfitability: { scenarioOfferMinor: 20_000_000 },
    },
  });

  assert.equal(result.periodCostReady, true);
  assert.equal(result.periodPlanningCostMinor, 6_817_277);
});

test("missing route evidence blocks period scope instead of inventing a zero-cost total", () => {
  const result = buildServicePeriodPlanningScope({
    agreement: agreement204,
    shifts: [],
    periodStart: "2026-11-01",
    periodEnd: "2026-11-30",
  });

  assert.equal(result.scopeStatus, "NOT_PROVEN");
  assert.equal(result.plannedMovementCount, 30);
  assert.equal(result.routeTemplate, null);
  assert.ok(result.missing.includes("Doğrulanmış rota şablonu"));
});

test("partial period cost never becomes a full-period quote difference", () => {
  const scope = buildServicePeriodPlanningScope({
    agreement: agreement204,
    shifts: linkedShifts,
    periodStart: "2026-11-01",
    periodEnd: "2026-11-30",
  });
  const periodCostInputs = buildPeriodCostInputOverrides({
    scope,
    costInputs: {
      fuelUnitPriceMinor: 15000,
      canonicalFuelProfile: { vehicleType: "BUS", fuelType: "DIESEL", actualConsumptionLitersPer100Km: 29 },
      canonicalRoute: { serviceDistanceKm: 2.58, totalDistanceKm: 2.58, emptyDistanceKm: null, source: "DB_ROUTE_SNAPSHOT" },
    },
  });
  const preview = buildRoomProfitabilityAndQuoteFloorPreview({
    role: "ROOM",
    room: { id: 1, name: "Demo Room" },
    shift: { id: 355, roomId: 1, driverId: 2, routeSnapshotDistanceM: 2576, routeSnapshotDurationSec: 246, vehicle: { id: 5, type: "BUS", capacity: 50 } },
    agreement: agreement204,
    costInputs: periodCostInputs,
    quoteFloorInputs: { targetContributionBps: 2000, riskReserveBps: 500, quoteScenarioAmountMinor: 2000000 },
  });

  const result = buildPeriodPlanningSummary({
    scope,
    preview,
  });

  assert.equal(result.status, "NOT_PROVEN");
  assert.equal(result.comparisonAllowed, false);
  assert.equal(result.periodQuoteFloorMinor, null);
  assert.equal(result.periodExpectedGainMinor, null);
  assert.equal(result.knownRoutePlanningCostMinor, 336690);
  assert.ok(result.missing.includes("Doğrulanmış boş kilometre bilgisi"));
  assert.ok(result.missing.includes("Sürücü planlama maliyeti"));
  assert.ok(result.missing.includes("Araç dönem maliyeti"));
});
