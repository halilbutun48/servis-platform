import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRoomQuoteDraftPreview,
  buildRoomQuoteDraftServiceContext,
  rebaseStaleRoomQuoteFloorDraftInputs,
} from "./commercialCoreRoomRoutes.js";

test("contractless selected shift can own a quote-floor draft context", () => {
  const context = buildRoomQuoteDraftServiceContext({
    room: { id: 1 },
    agreement: null,
    latestShift: {
      id: 19,
      roomId: 1,
      companyId: 1,
      vehicleId: 1,
      startAt: "2026-11-02T04:00:00.000Z",
      endAt: "2026-11-02T06:00:00.000Z",
      updatedAt: "2026-11-01T11:47:23.230Z",
    },
  });

  assert.ok(context);
  assert.equal(context.roomId, 1);
  assert.equal(context.agreementId, null);
  assert.equal(context.shiftId, 19);
  assert.equal(context.sourceShiftId, 19);
  assert.equal(context.vehicleId, 1);
  assert.equal(context.periodStart, "2026-11-02");
  assert.equal(context.periodEnd, "2026-11-02");
  assert.match(context.scopeHash, /^[a-f0-9]{64}$/);
});

test("contractless quote preview reuses the selected vehicle's period rent profile", () => {
  const result = buildRoomQuoteDraftPreview({
    room: { id: 1, name: "Temiz DEMO ROOM" },
    context: {
      room: { id: 1 },
      roomSummary: {},
      latestShift: {
        id: 19,
        roomId: 1,
        companyId: 1,
        vehicleId: 1,
        driverId: 2,
        status: "APPROVED",
        startAt: "2026-11-02T04:00:00.000Z",
        endAt: "2026-11-02T06:00:00.000Z",
        routeSnapshotDistanceM: 2720,
        routeSnapshotDurationSec: 300,
        pattern: "ONE_WAY",
        vehicle: { id: 1, type: "MIDIBUS", capacity: 29 },
        _count: { people: 3, stops: 2 },
      },
      latestAgreement: null,
      planningSourceShift: null,
      planningInputs: {
        entries: [{
          id: 17,
          vehicleId: 1,
          categoryKey: "RENT",
          amountMinor: 600000,
          currencyCode: "TRY",
          recordKind: "FORECAST",
          occurrenceKind: "PERIODIC",
          lifecycle: "CONFIRMED",
          periodStart: "2026-11-01",
          periodEnd: "2026-11-30",
          sourceRef: "DEMO_PLAN_PROFILE:RENT",
        }],
      },
      vehicleFleet: [{ id: 1, plate: "34ABC123", type: "MIDIBUS", capacity: 29, status: "ACTIVE", driverId: 2 }],
      driverFleet: [{ id: 2, roomId: 1, status: "ACTIVE" }],
      canonicalFuelReference: null,
      agreementLinkedShifts: [],
    },
    selection: { shiftId: 19, vehicleId: 1 },
    requestInputs: {
      fuelType: "DIESEL",
      fuelConsumptionLitersPer100Km: 21,
      fuelUnitPriceMinor: 10050,
      targetContributionBps: 2000,
      riskReserveBps: 500,
    },
    role: "ROOM",
    companyKind: "COMPANY",
  });

  const fixed = result.preview.operationalCostModel.components
    .find((component) => component.componentKey === "vehicle_fixed_allocated");
  assert.equal(fixed?.includedInBaseline, true);
  assert.equal(fixed?.amountMinor, 20000);
  assert.equal(result.preview.roomPlanningProfileEvidence?.selectedVehicleId, 1);
  assert.deepEqual(result.preview.roomPlanningProfileEvidence?.appliedFields, [
    "fixedVehicleCostMonthlyMinor",
    "allocationServiceDaysPerMonth",
    "vehicleFixedCostAllocationMode",
    "serviceDayCount",
    "shiftCount",
    "tripCount",
  ]);
});

test("selected contractless shift uses one planned movement instead of the ROOM-wide active shift count", () => {
  const result = buildRoomQuoteDraftPreview({
    room: { id: 1, name: "Temiz DEMO ROOM" },
    context: {
      room: { id: 1 },
      roomSummary: { cards: { approvedOrActiveShifts: 17 } },
      latestShift: {
        id: 19,
        roomId: 1,
        companyId: 1,
        vehicleId: 1,
        driverId: 2,
        status: "APPROVED",
        startAt: "2026-11-02T04:00:00.000Z",
        endAt: "2026-11-02T06:00:00.000Z",
        routeSnapshotDistanceM: 2720,
        routeSnapshotDurationSec: 300,
        pattern: "ONE_WAY",
        vehicle: { id: 1, type: "MIDIBUS", capacity: 29 },
        _count: { people: 3, stops: 2 },
      },
      latestAgreement: null,
      planningSourceShift: null,
      planningInputs: {
        entries: [{
          id: 17,
          vehicleId: 1,
          categoryKey: "RENT",
          amountMinor: 600000,
          currencyCode: "TRY",
          recordKind: "FORECAST",
          occurrenceKind: "PERIODIC",
          lifecycle: "CONFIRMED",
          periodStart: "2026-11-01",
          periodEnd: "2026-11-30",
          sourceRef: "DEMO_PLAN_PROFILE:RENT",
        }],
      },
      vehicleFleet: [{ id: 1, plate: "34ABC123", type: "MIDIBUS", capacity: 29, status: "ACTIVE", driverId: 2 }],
      driverFleet: [{ id: 2, roomId: 1, status: "ACTIVE" }],
      canonicalFuelReference: null,
      agreementLinkedShifts: [],
    },
    selection: { shiftId: 19, vehicleId: 1 },
    requestInputs: {
      fuelType: "DIESEL",
      fuelConsumptionLitersPer100Km: 21,
      fuelUnitPriceMinor: 10050,
      driverBasePerShiftMinor: 500000,
      driverCompensationMode: "per_shift",
      maintenancePerKmMinor: 9500,
      targetContributionBps: 2000,
      riskReserveBps: 500,
    },
    role: "ROOM",
    companyKind: "COMPANY",
  });

  assert.equal(result.preview.modelInput.shiftCount, 1);
  assert.equal(result.preview.operationalCostModel.components.find((component) => component.componentKey === "driver_labor")?.amountMinor, 500000);
});

test("incomplete quote draft cannot override a newly resolved vehicle profile", () => {
  const inputs = rebaseStaleRoomQuoteFloorDraftInputs(
    {
      draft: {
        baselineSource: "incomplete",
        manualBaselineOperationalCostMinor: null,
      },
    },
    {
      manualBaselineOperationalCostMinor: 5741,
      vehicleLeaseMonthlyMinor: 600000,
      targetContributionBps: 2000,
    },
    { status: "APPLICABLE" },
  );

  assert.equal(inputs.manualBaselineOperationalCostMinor, undefined);
  assert.equal(inputs.vehicleLeaseMonthlyMinor, 600000);
  assert.equal(inputs.targetContributionBps, 2000);
});

test("saved computed quote totals are not re-read as a manual baseline", () => {
  const inputs = rebaseStaleRoomQuoteFloorDraftInputs(
    {
      draft: {
        baselineSource: "complete",
        manualBaselineOperationalCostMinor: null,
      },
    },
    {
      baselineOperationalCostMinor: 551581,
      quoteFloorMinor: 723952,
      quoteFloorPerPassengerMinor: 241317,
      baselineSource: "complete",
      targetContributionBps: 2000,
    },
    { status: "APPLICABLE" },
  );

  assert.equal(inputs.baselineOperationalCostMinor, undefined);
  assert.equal(inputs.quoteFloorMinor, undefined);
  assert.equal(inputs.quoteFloorPerPassengerMinor, undefined);
  assert.equal(inputs.baselineSource, undefined);
  assert.equal(inputs.targetContributionBps, 2000);
});
