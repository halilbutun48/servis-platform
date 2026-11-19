import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRoomVehiclePlanningEvidence,
  buildReusableVehiclePlanningProfiles,
  resolveReusableVehiclePlanningProfile,
} from "./roomVehiclePlanningEvidence.js";

test("quote floor vehicle assumptions become planning-only scenario inputs", () => {
  const result = buildRoomVehiclePlanningEvidence({
    shiftId: 257,
    vehicleAlternatives: [
      { vehicleType: "MINIBUS", capacity: 16, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 24, source: "DEMO_PLANNING_ASSUMPTION" },
      { vehicleType: "MIDIBUS", capacity: 29, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 26, source: "DEMO_PLANNING_ASSUMPTION" },
      { vehicleType: "OTOBUS", capacity: 50, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 32, source: "DEMO_PLANNING_ASSUMPTION" },
    ],
  }, {
    vehicleFleet: [
      { id: 7, plate: "34ABC126", type: "MINIBUS", capacity: 16, status: "ACTIVE" },
      { id: 1, plate: "34ABC123", type: "MIDIBUS", capacity: 29, status: "STALE" },
      { id: 5, plate: "34 ABC 125", type: "OTOBUS", capacity: 50, status: "ACTIVE" },
    ],
  });

  assert.equal(result.status, "AVAILABLE");
  assert.equal(result.actual, false);
  assert.deepEqual(result.vehicleTypes, ["MINIBUS", "MIDIBUS", "OTOBUS"]);
  assert.deepEqual(result.vehicleCostInputsByType.MINIBUS.input, {
    vehicleType: "MINIBUS",
    vehicleCapacity: 16,
    vehicleCount: 1,
    fuelType: "DIESEL",
    fuelConsumptionLitersPer100Km: 24,
  });
  assert.deepEqual(result.vehicleCostInputsByType.MINIBUS.availability, { status: "ACTIVE", vehicleId: 7 });
  assert.deepEqual(result.vehicleCostInputsByType.MIDIBUS.availability, { status: "STALE", vehicleId: 1 });
  assert.deepEqual(result.vehicleCostInputsByType.OTOBUS.availability, { status: "ACTIVE", vehicleId: 5 });
  assert.match(result.reason, /planlama varsayımı/);
});

test("missing quote floor vehicle assumptions fail closed", () => {
  const result = buildRoomVehiclePlanningEvidence({ shiftId: 257, vehicleAlternatives: [{ vehicleType: "UNKNOWN", capacity: 20 }] });

  assert.equal(result.status, "MISSING");
  assert.deepEqual(result.vehicleCostInputsByType, {});
  assert.equal(result.actual, false);
});

test("period-bound forecast entries become reusable fixed-cost planning profiles without becoming actual", () => {
  const result = buildReusableVehiclePlanningProfiles({
    vehicleFleet: [{ id: 1, type: "MIDIBUS", driverId: 4 }],
    entries: [
      {
        id: 501,
        vehicleId: 1,
        categoryKey: "RENT",
        amountMinor: 70000,
        currencyCode: "TRY",
        recordKind: "FORECAST",
        occurrenceKind: "PERIODIC",
        lifecycle: "CONFIRMED",
        periodStart: "2026-11-03",
        periodEnd: "2026-11-09",
        sourceRef: "DEMO:RENT:2026-11",
      },
      {
        id: 502,
        vehicleId: 1,
        categoryKey: "TRAFFIC_INSURANCE",
        amountMinor: 30000,
        currencyCode: "TRY",
        recordKind: "FORECAST",
        occurrenceKind: "PERIODIC",
        lifecycle: "CONFIRMED",
        periodStart: "2026-11-03",
        periodEnd: "2026-11-09",
        sourceRef: "DEMO:TRAFFIC_INSURANCE:2026-11",
      },
    ],
    targetPeriod: { periodStart: "2026-11-04", periodEnd: "2026-11-06" },
  });

  assert.equal(result.byVehicleType.MIDIBUS.status, "APPLICABLE");
  assert.deepEqual(result.byVehicleType.MIDIBUS.input, {
    fixedVehicleCostMonthlyMinor: 100000,
    allocationServiceDaysPerMonth: 7,
    vehicleFixedCostAllocationMode: "per_service_day",
  });
  assert.equal(result.byVehicleType.MIDIBUS.evidence.dataClass, "INTERNAL_FORECAST_PROFILE");
  assert.deepEqual(result.byVehicleType.MIDIBUS.evidence.sourceEntryIds, [501, 502]);
  assert.equal(result.byVehicleType.MIDIBUS.evidence.actual, false);
  assert.equal(result.byVehicleType.MIDIBUS.evidence.validity.periodStart, "2026-11-03");
  assert.equal(result.byVehicleType.MIDIBUS.evidence.validity.periodEnd, "2026-11-09");
});

test("selected vehicle reuses its own period-bound profile without converting a driver monthly cost", () => {
  const profile = resolveReusableVehiclePlanningProfile({
    vehicleId: 1,
    vehicleType: "MIDIBUS",
    vehicleFleet: [
      { id: 1, type: "MIDIBUS", driverId: 2 },
      { id: 2, type: "MIDIBUS", driverId: 3 },
    ],
    entries: [
      {
        id: 511,
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
      },
      {
        id: 512,
        driverId: 2,
        categoryKey: "EMPLOYER_MONTHLY_COST",
        amountMinor: 500000,
        currencyCode: "TRY",
        recordKind: "FORECAST",
        occurrenceKind: "PERIODIC",
        lifecycle: "CONFIRMED",
        periodStart: "2026-11-01",
        periodEnd: "2026-11-30",
        sourceRef: "DEMO_PLAN_PROFILE:DRIVER_EMPLOYER",
      },
    ],
    targetPeriod: { periodStart: "2026-11-02", periodEnd: "2026-11-02" },
  });

  assert.equal(profile.status, "APPLICABLE");
  assert.deepEqual(profile.input, {
    fixedVehicleCostMonthlyMinor: 600000,
    allocationServiceDaysPerMonth: 30,
    vehicleFixedCostAllocationMode: "per_service_day",
  });
  assert.equal(profile.evidence.actual, false);
  assert.deepEqual(profile.evidence.sourceEntryIds, [511]);
});

test("mutually exclusive rent, leasing and depreciation do not become one fixed-cost profile", () => {
  const result = buildReusableVehiclePlanningProfiles({
    vehicleFleet: [{ id: 1, type: "MIDIBUS" }],
    entries: [
      { id: 601, vehicleId: 1, categoryKey: "RENT", amountMinor: 70000, currencyCode: "TRY", recordKind: "FORECAST", occurrenceKind: "PERIODIC", lifecycle: "CONFIRMED", periodStart: "2026-11-03", periodEnd: "2026-11-09", sourceRef: "DEMO:RENT" },
      { id: 602, vehicleId: 1, categoryKey: "LEASING", amountMinor: 55000, currencyCode: "TRY", recordKind: "FORECAST", occurrenceKind: "PERIODIC", lifecycle: "CONFIRMED", periodStart: "2026-11-03", periodEnd: "2026-11-09", sourceRef: "DEMO:LEASING" },
      { id: 603, vehicleId: 1, categoryKey: "DEPRECIATION", amountMinor: 45000, currencyCode: "TRY", recordKind: "FORECAST", occurrenceKind: "PERIODIC", lifecycle: "CONFIRMED", periodStart: "2026-11-03", periodEnd: "2026-11-09", sourceRef: "DEMO:DEPRECIATION" },
    ],
    targetPeriod: { periodStart: "2026-11-04", periodEnd: "2026-11-06" },
  });

  assert.equal(result.byVehicleType.MIDIBUS.status, "BLOCKED");
  assert.deepEqual(result.byVehicleType.MIDIBUS.missing, ["Araç sabit giderlerinin sahibi belirsiz"]);
  assert.deepEqual(result.byVehicleType.MIDIBUS.evidence.excludedCategoryKeys.sort(), ["DEPRECIATION", "LEASING"]);
});

test("profile outside its validity period is not applied to a new quote", () => {
  const result = buildReusableVehiclePlanningProfiles({
    vehicleFleet: [{ id: 1, type: "MIDIBUS" }],
    entries: [{
      id: 701,
      vehicleId: 1,
      categoryKey: "RENT",
      amountMinor: 70000,
      currencyCode: "TRY",
      recordKind: "FORECAST",
      occurrenceKind: "PERIODIC",
      lifecycle: "CONFIRMED",
      periodStart: "2026-11-03",
      periodEnd: "2026-11-09",
      sourceRef: "DEMO:RENT",
    }],
    targetPeriod: { periodStart: "2026-11-17", periodEnd: "2026-11-20" },
  });

  assert.equal(result.byVehicleType.MIDIBUS.status, "NOT_APPLICABLE");
  assert.deepEqual(result.byVehicleType.MIDIBUS.missing, ["Geçerli dönem maliyet profili"]);
});

test("applicable forecast profile is planning-only and keeps the candidate vehicle link", () => {
  const result = buildRoomVehiclePlanningEvidence(null, {
    baselineInput: { currencyCode: "TRY", totalDistanceKm: 10, serviceDistanceKm: 10, serviceDayCount: 1, shiftCount: 1, tripCount: 1 },
    vehicleFleet: [{ id: 1, plate: "34ABC123", type: "MIDIBUS", capacity: 29, status: "ACTIVE", driverId: 4 }],
    driverFleet: [{ id: 4, roomId: 21, status: "ACTIVE" }],
    planningCostInputs: [{
      id: 801,
      vehicleId: 1,
      categoryKey: "RENT",
      amountMinor: 70000,
      currencyCode: "TRY",
      recordKind: "FORECAST",
      occurrenceKind: "PERIODIC",
      lifecycle: "CONFIRMED",
      periodStart: "2026-11-03",
      periodEnd: "2026-11-09",
      sourceRef: "DEMO:RENT:2026-11",
    }],
    targetPeriod: { periodStart: "2026-11-04", periodEnd: "2026-11-06" },
  });

  const midibus = result.vehicleCostInputsByType.MIDIBUS;
  assert.equal(midibus.planningProfile.status, "APPLICABLE");
  assert.equal(midibus.planningComponents.vehicle_fixed_allocated.evidence.actual, false);
  assert.equal(midibus.evidence.dataClass, "INTERNAL_FORECAST_PROFILE");
  assert.equal(midibus.availability.driverId, 4);
});

test("selected actual component allocations keep their actual-derived planning provenance", () => {
  const result = buildRoomVehiclePlanningEvidence({
    shiftId: 257,
    vehicleAlternatives: [
      { vehicleType: "MINIBUS", capacity: 16, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 24, source: "DEMO_PLANNING_ASSUMPTION" },
    ],
  }, {
    baselineInput: {
      currencyCode: "TRY",
      vehicleType: "MIDIBUS",
      vehicleCount: 1,
      totalDistanceKm: 6.25,
      serviceDistanceKm: 6.25,
      serviceDayCount: 1,
      shiftCount: 1,
      tripCount: 1,
    },
    actualCostInputs: [
      { entryId: 265, componentKey: "fuel", categoryKey: "FUEL", amountMinor: 240_000, currencyCode: "TRY", recordKind: "ACTUAL", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      { entryId: 266, componentKey: "vehicle_variable", categoryKey: "MAINTENANCE", amountMinor: 550_000, currencyCode: "TRY", recordKind: "ACTUAL", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      { entryId: 267, componentKey: "driver_labor", categoryKey: "EMPLOYER_MONTHLY_COST", amountMinor: 500_000, currencyCode: "TRY", recordKind: "ACTUAL", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      { entryId: 268, componentKey: "vehicle_fixed_allocated", categoryKey: "RENT", amountMinor: 1_020_000, currencyCode: "TRY", recordKind: "ACTUAL", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      { entryId: 273, componentKey: "route_fees", categoryKey: "HGS_TOLL", amountMinor: 80_000, currencyCode: "TRY", recordKind: "ACTUAL", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
    ],
  });

  const minibus = result.vehicleCostInputsByType.MINIBUS;
  assert.equal(minibus.evidence.dataClass, "INTERNAL_ACTUAL_DERIVED");
  assert.equal(minibus.evidence.actual, false);
  assert.equal(minibus.planningComponents.driver_labor.input.driverBasePerShiftMinor, 500_000);
  assert.equal(minibus.planningComponents.vehicle_variable.input.maintenancePerKmMinor, 88_000);
  assert.equal(minibus.planningComponents.vehicle_fixed_allocated.input.explicitVehicleFixedCostAllocatedMinor, 1_020_000);
  assert.equal(minibus.planningComponents.route_fees.input.routeFeeMinor, 80_000);
  assert.deepEqual(minibus.planningComponents.route_fees.evidence.sourceEntryIds, [273]);
});

test("a service without a quote-floor draft derives all vehicle classes from canonical fleet and planning references", () => {
  const result = buildRoomVehiclePlanningEvidence(null, {
    baselineInput: {
      currencyCode: "TRY",
      vehicleType: "MIDIBUS",
      vehicleCount: 1,
      vehicleCapacity: 29,
      totalDistanceKm: 7.586,
      serviceDistanceKm: 7.586,
      serviceDayCount: 1,
      shiftCount: 1,
      tripCount: 1,
    },
    actualCostInputs: [
      { entryId: 276, componentKey: "fuel", categoryKey: "FUEL", amountMinor: 320_000, currencyCode: "TRY", recordKind: "ACTUAL", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      { entryId: 277, componentKey: "driver_labor", categoryKey: "EMPLOYER_MONTHLY_COST", amountMinor: 480_000, currencyCode: "TRY", recordKind: "ACTUAL", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
    ],
    vehicleFleet: [
      { id: 7, plate: "34ABC126", type: "MINIBUS", capacity: 16, status: "ACTIVE" },
      { id: 1, plate: "34ABC123", type: "MIDIBUS", capacity: 29, status: "STALE" },
      { id: 5, plate: "34 ABC 125", type: "OTOBUS", capacity: 50, status: "ACTIVE" },
    ],
  });

  assert.deepEqual(result.vehicleTypes, ["MINIBUS", "MIDIBUS", "OTOBUS"]);
  assert.equal(result.vehicleCostInputsByType.MINIBUS.input.vehicleCapacity, 16);
  assert.equal(result.vehicleCostInputsByType.MINIBUS.input.fuelConsumptionLitersPer100Km, 7.9);
  assert.equal(result.vehicleCostInputsByType.OTOBUS.input.vehicleCapacity, 50);
  assert.equal(result.vehicleCostInputsByType.OTOBUS.input.fuelConsumptionLitersPer100Km, 29);
  assert.equal(result.vehicleCostInputsByType.MIDIBUS.planningComponents.vehicle_variable.input.maintenancePerKmMinor, 9_500);
  assert.equal(result.vehicleCostInputsByType.MIDIBUS.planningComponents.vehicle_variable.evidence.dataClass, "DEMO_PLANNING_ASSUMPTION");
  assert.equal(result.vehicleCostInputsByType.MINIBUS.evidence.actual, false);
  assert.equal(result.source, "ROOM_FLEET_AND_TECHNICAL_REFERENCE");
  assert.equal(result.dataClass, "MIXED_EVIDENCE");
  assert.match(result.reason, /planlama varsayımı/);
});

test("public DEMO planning profile can supply bounded driver and maintenance assumptions without becoming actual ledger", () => {
  const result = buildRoomVehiclePlanningEvidence({
    vehicleAlternatives: [
      { vehicleType: "MINIBUS", capacity: 16, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 24, source: "SEFERPAKT_DEMO_2026_CANONICAL_V1:PUBLIC_VEHICLE_PROFILE" },
    ],
  }, {
    baselineInput: { currencyCode: "TRY", totalDistanceKm: 10, serviceDistanceKm: 10, serviceDayCount: 1, shiftCount: 1 },
    actualCostInputs: [],
    includeDemoPlanningDefaults: true,
  });

  const minibus = result.vehicleCostInputsByType.MINIBUS;
  assert.equal(result.status, "AVAILABLE");
  assert.equal(result.dataClass, "DEMO_PLANNING_ASSUMPTION");
  assert.equal(result.actual, false);
  assert.equal(minibus.planningComponents.driver_labor.input.driverBasePerShiftMinor, 500_000);
  assert.equal(minibus.planningComponents.vehicle_variable.input.maintenancePerKmMinor, 9_500);
  assert.equal(minibus.planningComponents.driver_labor.evidence.dataClass, "DEMO_PLANNING_ASSUMPTION");
  assert.equal(minibus.planningComponents.driver_labor.evidence.unit, "CURRENCY_PER_SHIFT_PER_VEHICLE");
  assert.equal(minibus.planningComponents.driver_labor.evidence.rateBasis, "Araç başına her planlı hareket");
  assert.equal(minibus.planningComponents.vehicle_variable.evidence.dataClass, "DEMO_PLANNING_ASSUMPTION");
});

test("ROOM filo kanıtı alternatif planın gerçek araç ve sürücü sayısını sınırlar", () => {
  const result = buildRoomVehiclePlanningEvidence({
    vehicleAlternatives: [
      { vehicleType: "MINIBUS", capacity: 16, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 24, source: "ROOM_QUOTE_FLOOR_DRAFT_PLANNING_ASSUMPTION" },
      { vehicleType: "MIDIBUS", capacity: 27, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 26, source: "ROOM_QUOTE_FLOOR_DRAFT_PLANNING_ASSUMPTION" },
      { vehicleType: "OTOBUS", capacity: 50, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 32, source: "ROOM_QUOTE_FLOOR_DRAFT_PLANNING_ASSUMPTION" },
    ],
  }, {
    baselineInput: { currencyCode: "TRY", totalDistanceKm: 5.829, serviceDistanceKm: 5.829, serviceDayCount: 1, shiftCount: 1, tripCount: 1 },
    vehicleFleet: [{ id: 8, plate: "SPD01", type: "MINIBUS", capacity: 27, status: "ACTIVE" }],
    driverFleet: [{ id: 5, roomId: 21, fullName: "SEFERPAKT DEMO SÜRÜCÜ 01" }],
  });

  assert.deepEqual(result.vehicleCostInputsByType.MINIBUS.availability, {
    status: "ACTIVE",
    vehicleId: 8,
    availabilityScope: "ROOM_FLEET",
    availableVehicleCount: 1,
    availableDriverCount: 1,
  });
  assert.deepEqual(result.vehicleCostInputsByType.MIDIBUS.availability, {
    status: "UNKNOWN",
    vehicleId: null,
    availabilityScope: "ROOM_FLEET",
    availableVehicleCount: 0,
    availableDriverCount: 1,
  });
});
