import assert from "node:assert/strict";
import test from "node:test";
import { buildCostScenarioPreview } from "./costScenarioForecast.js";
import { buildRoomVehiclePlanningEvidence } from "./roomVehiclePlanningEvidence.js";
import { buildContractlessServicePeriodPlanningScope, buildPeriodCostInputOverrides } from "./servicePeriodPlanning.js";

const BASELINE_INPUT = Object.freeze({
  currencyCode: "TRY",
  vehicleType: "MIDIBUS",
  vehicleCount: 1,
  vehicleCapacity: 29,
  passengerCount: 20,
  stopCount: 2,
  serviceDistanceKm: 6.25,
  totalDistanceKm: 6.25,
  routeDurationMinutes: 706 / 60,
  serviceDayCount: 1,
  shiftCount: 1,
  tripCount: 1,
  fuelType: "DIESEL",
});

const ACTUAL_COST_INPUTS = Object.freeze([
  { entryId: 265, componentKey: "fuel", categoryKey: "FUEL", amountMinor: 240_000, currencyCode: "TRY", recordKind: "ACTUAL", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
  { entryId: 266, componentKey: "vehicle_variable", categoryKey: "MAINTENANCE", amountMinor: 180_000, currencyCode: "TRY", recordKind: "ACTUAL", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
  { entryId: 267, componentKey: "driver_labor", categoryKey: "EMPLOYER_MONTHLY_COST", amountMinor: 500_000, currencyCode: "TRY", recordKind: "ACTUAL", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
  { entryId: 268, componentKey: "vehicle_fixed_allocated", categoryKey: "RENT", amountMinor: 600_000, currencyCode: "TRY", recordKind: "ACTUAL", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
  { entryId: 269, componentKey: "vehicle_variable", categoryKey: "REPAIR", amountMinor: 220_000, currencyCode: "TRY", recordKind: "ACTUAL", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
  { entryId: 270, componentKey: "vehicle_variable", categoryKey: "TIRE_RIM", amountMinor: 150_000, currencyCode: "TRY", recordKind: "ACTUAL", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
  { entryId: 271, componentKey: "vehicle_fixed_allocated", categoryKey: "TRAFFIC_INSURANCE", amountMinor: 300_000, currencyCode: "TRY", recordKind: "ACTUAL", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
  { entryId: 272, componentKey: "vehicle_fixed_allocated", categoryKey: "MTV", amountMinor: 120_000, currencyCode: "TRY", recordKind: "ACTUAL", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
  { entryId: 273, componentKey: "route_fees", categoryKey: "HGS_TOLL", amountMinor: 80_000, currencyCode: "TRY", recordKind: "ACTUAL", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
]);

const CONTEXT = Object.freeze({
  scope: "ROOM",
  role: "ROOM",
  companyKind: "COMPANY",
  tenantScope: "room_demo",
  baselineReference: "shift_257",
  baselineDataClass: "INTERNAL_ACTUAL",
  actualCostInputs: ACTUAL_COST_INPUTS,
  actualEvidence: {
    actualCostMinor: 2_390_000,
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
  },
  baselineConfidence: { level: "HIGH", score: 95, missingFields: [] },
  routeEvidence: {
    baseline: {
      distanceKm: 6.25,
      durationMinutes: 706 / 60,
      stopCount: 2,
      source: "DB_ROUTE_SNAPSHOT",
    },
  },
  schedule: { baselineStartMinutes: 360 },
});

const FUEL_REFERENCE = Object.freeze({
  freshness: "FRESH",
  marketReference: {
    dataClass: "EXTERNAL_REFERENCE",
    family: "FUEL_DIESEL",
    unit: "CURRENCY_PER_L",
    valueMinor: 9673,
    valueDecimal: "96.73",
    currencyCode: "TRY",
    sourceName: "Controlled test fuel reference",
    providerKey: "CONTROLLED_TEST_REFERENCE",
    asOf: "2026-10-23T00:00:00.000Z",
    freshness: "FRESH",
    confidence: "MEDIUM",
  },
});

test("FULL_DATA variant status and best recommendation require valid comparison evidence", () => {
  const preview = buildCostScenarioPreview({
    baselineInput: BASELINE_INPUT,
    scenarioOverrides: { useExternalFuelPrice: true },
    context: CONTEXT,
    externalReference: FUEL_REFERENCE,
  });

  assert.equal(preview.status, "READY");
  assert.equal(preview.scenarioVariants.EXPECTED.status, "READY");
  assert.equal(preview.scenarioVariants.BEST.status, "INCOMPLETE");
  assert.equal(preview.scenarioVariants.BEST.estimatedCost, null);
  assert.match(preview.scenarioVariants.BEST.rationale, /karşılaştırılabilir|öneri/i);
  assert.equal(preview.vehiclePlanAlternatives.recommendation, null);
});

test("vehicle comparison stays incomplete when the selected service lacks route and passenger evidence", () => {
  const preview = buildCostScenarioPreview({
    baselineInput: {
      currencyCode: "TRY",
      vehicleType: "MIDIBUS",
      vehicleCount: 1,
      vehicleCapacity: 29,
      stopCount: null,
      passengerCount: null,
      serviceDistanceKm: null,
      totalDistanceKm: null,
      routeDurationMinutes: null,
      serviceDayCount: 1,
      shiftCount: 1,
      tripCount: 1,
      fuelType: "DIESEL",
      roomCostLedgerInputs: [
        { entryId: 278, componentKey: "fuel", categoryKey: "FUEL", amountMinor: 380_000, currencyCode: "TRY", recordKind: "ACTUAL", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      ],
    },
    scenarioOverrides: {},
    context: {
      scope: "ROOM",
      actualCostInputs: [
        { entryId: 278, componentKey: "fuel", categoryKey: "FUEL", amountMinor: 380_000, currencyCode: "TRY", recordKind: "ACTUAL", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      ],
      actualEvidence: { actualCostMinor: 380_000, periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      routeEvidence: { baseline: { distanceKm: null, durationMinutes: null, stopCount: null, source: "DB_ROUTE_SNAPSHOT" } },
    },
  });

  assert.equal(preview.status, "INCOMPLETE");
  assert.match(preview.statusLabel, /Eksik veri/i);
  assert.ok(preview.missingData.some((item) => /rota|kişi|durak/i.test(item)));
  assert.equal(preview.scenarioVariants.EXPECTED.status, "INCOMPLETE");
  assert.equal(preview.scenarioVariants.BEST.status, "INCOMPLETE");
  assert.notEqual(preview.vehiclePlanAlternatives.status, "RESOLVED");
  assert.equal(preview.vehiclePlanAlternatives.recommendation, null);
});

test("planning-only alternatives show a bounded estimate but cannot become best without full comparable costs", () => {
  const preview = buildCostScenarioPreview({
    baselineInput: BASELINE_INPUT,
    scenarioOverrides: { useExternalFuelPrice: true },
    context: {
      ...CONTEXT,
      vehicleCostInputsByType: {
        MINIBUS: { input: { vehicleType: "MINIBUS", vehicleCapacity: 16, vehicleCount: 2, fuelType: "DIESEL", fuelConsumptionLitersPer100Km: 7.9 } },
        OTOBUS: { input: { vehicleType: "OTOBUS", vehicleCapacity: 44, vehicleCount: 1, fuelType: "DIESEL", fuelConsumptionLitersPer100Km: 29 } },
      },
    },
    externalReference: FUEL_REFERENCE,
  });

  const minibus = preview.vehiclePlanAlternatives.items.find((item) => item.vehicleType === "MINIBUS");
  const bus = preview.vehiclePlanAlternatives.items.find((item) => item.vehicleType === "OTOBUS");
  assert.ok(minibus.costMinor > 0);
  assert.ok(bus.costMinor > 0);
  assert.equal(minibus.costEvidenceSource, "PLANLAMA_VARSAYIMI");
  assert.equal(minibus.costCoverage.status, "PARTIAL");
  assert.equal(minibus.recommendationEligible, false);
  assert.equal(preview.vehiclePlanAlternatives.recommendation, null);
  assert.equal(preview.scenarioVariants.BEST.status, "INCOMPLETE");
  assert.equal(preview.scenarioVariants.BEST.estimatedCost, null);
});

test("contractless period alternatives expose missing fixed, route and AdBlue evidence before recommending a plan", () => {
  const preview = buildCostScenarioPreview({
    baselineInput: BASELINE_INPUT,
    scenarioOverrides: { useExternalFuelPrice: true },
    context: {
      ...CONTEXT,
      periodPlanning: { scopeStatus: "READY_WITH_PLANNING_ASSUMPTION" },
      vehicleCostInputsByType: {
        MINIBUS: { input: { vehicleType: "MINIBUS", vehicleCapacity: 16, vehicleCount: 1, fuelType: "DIESEL", fuelConsumptionLitersPer100Km: 7.9, driverBasePerShiftMinor: 500000, maintenancePerKmMinor: 9500 } },
        OTOBUS: { input: { vehicleType: "OTOBUS", vehicleCapacity: 44, vehicleCount: 1, fuelType: "DIESEL", fuelConsumptionLitersPer100Km: 29, driverBasePerShiftMinor: 500000, maintenancePerKmMinor: 9500 } },
      },
    },
    externalReference: FUEL_REFERENCE,
  });

  assert.equal(preview.vehiclePlanAlternatives.recommendation, null);
  for (const item of preview.vehiclePlanAlternatives.items.filter((candidate) => ["MINIBUS", "OTOBUS"].includes(candidate.vehicleType))) {
    assert.equal(item.recommendationEligible, false);
    const missingKeys = item.missingOptionalCosts.map((cost) => cost.key);
    assert.ok(missingKeys.includes("vehicle_fixed"));
    assert.ok(missingKeys.includes("route_fees"));
    assert.ok(missingKeys.includes("adblue"));
  }
  assert.equal(preview.scenarioVariants.BEST.status, "INCOMPLETE");
});

test("ROOM filo kanıtı gereken araç ve sürücü sayısını karşılamıyorsa alternatifi bloklar", () => {
  const preview = buildCostScenarioPreview({
    baselineInput: {
      ...BASELINE_INPUT,
      vehicleType: "MINIBUS",
      vehicleCapacity: 27,
      passengerCount: 40,
    },
    scenarioOverrides: { useExternalFuelPrice: true },
    context: {
      ...CONTEXT,
      vehicleCostInputsByType: {
        MINIBUS: {
          input: { vehicleType: "MINIBUS", vehicleCapacity: 27, vehicleCount: 1, fuelType: "DIESEL", fuelConsumptionLitersPer100Km: 7.9 },
          availability: { status: "UNKNOWN", availabilityScope: "ROOM_FLEET", availableVehicleCount: 1, availableDriverCount: 1 },
        },
        MIDIBUS: {
          input: { vehicleType: "MIDIBUS", vehicleCapacity: 25, vehicleCount: 1, fuelType: "DIESEL", fuelConsumptionLitersPer100Km: 21 },
          availability: { status: "UNKNOWN", availabilityScope: "ROOM_FLEET", availableVehicleCount: 0, availableDriverCount: 1 },
        },
        OTOBUS: {
          input: { vehicleType: "OTOBUS", vehicleCapacity: 44, vehicleCount: 1, fuelType: "DIESEL", fuelConsumptionLitersPer100Km: 29 },
          availability: { status: "UNKNOWN", availabilityScope: "ROOM_FLEET", availableVehicleCount: 0, availableDriverCount: 1 },
        },
      },
    },
    externalReference: FUEL_REFERENCE,
  });

  const minibus = preview.vehiclePlanAlternatives.items.find((item) => item.vehicleType === "MINIBUS");
  const midibus = preview.vehiclePlanAlternatives.items.find((item) => item.vehicleType === "MIDIBUS");
  const bus = preview.vehiclePlanAlternatives.items.find((item) => item.vehicleType === "OTOBUS");
  assert.equal(minibus.requiredVehicleCount, 2);
  assert.equal(minibus.status, "BLOCKED");
  assert.equal(minibus.costMinor, null);
  assert.match(minibus.missingData.join(" "), /aktif ROOM aracı|eşzamanlı ROOM sürücüsü/i);
  assert.equal(midibus.status, "BLOCKED");
  assert.equal(bus.status, "BLOCKED");
  assert.equal(preview.vehiclePlanAlternatives.recommendation, null);
});

test("canonical component-derived planning inputs make all vehicle alternatives comparable without actualizing them", () => {
  const planningEvidence = buildRoomVehiclePlanningEvidence({
    vehicleAlternatives: [
      { vehicleType: "MINIBUS", capacity: 16, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 24, source: "DEMO_PLANNING_ASSUMPTION" },
      { vehicleType: "MIDIBUS", capacity: 29, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 26, source: "DEMO_PLANNING_ASSUMPTION" },
      { vehicleType: "OTOBUS", capacity: 50, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 32, source: "DEMO_PLANNING_ASSUMPTION" },
    ],
  }, { baselineInput: BASELINE_INPUT, actualCostInputs: ACTUAL_COST_INPUTS });
  const preview = buildCostScenarioPreview({
    baselineInput: BASELINE_INPUT,
    scenarioOverrides: { useExternalFuelPrice: true },
    context: { ...CONTEXT, vehicleCostInputsByType: planningEvidence.vehicleCostInputsByType },
    externalReference: FUEL_REFERENCE,
  });

  const minibus = preview.vehiclePlanAlternatives.items.find((item) => item.vehicleType === "MINIBUS");
  const midibus = preview.vehiclePlanAlternatives.items.find((item) => item.vehicleType === "MIDIBUS");
  const bus = preview.vehiclePlanAlternatives.items.find((item) => item.vehicleType === "OTOBUS");
  assert.equal(minibus.capacity, 16);
  assert.equal(minibus.requiredVehicleCount, 2);
  assert.equal(bus.capacity, 50);
  assert.equal(minibus.status, "READY");
  assert.equal(bus.status, "READY");
  assert.equal(minibus.costCoverage.status, "COMPLETE");
  assert.equal(bus.costCoverage.status, "COMPLETE");
  assert.equal(minibus.costEvidenceSource, "INTERNAL_DATA_PLANNING_ESTIMATE");
  assert.equal(minibus.fuelConsumptionReference.sourceKind, "DEMO_PLANNING_ASSUMPTION");
  assert.equal(minibus.costMinor > 0, true);
  assert.equal(bus.costMinor > 0, true);
  assert.ok(preview.vehiclePlanAlternatives.recommendation);
  assert.equal(preview.scenarioVariants.BEST.status, "READY");
  assert.equal(midibus.costMinor, 2_390_000);
  assert.equal(midibus.costEvidenceSource, "MEVCUT_PLAN_KANITI");
});

test("multi-vehicle alternatives use partitioned route distance once instead of multiplying one route", () => {
  const planningEvidence = buildRoomVehiclePlanningEvidence({
    vehicleAlternatives: [
      { vehicleType: "MINIBUS", capacity: 16, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 24, source: "DEMO_PLANNING_ASSUMPTION" },
      { vehicleType: "MIDIBUS", capacity: 29, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 26, source: "DEMO_PLANNING_ASSUMPTION" },
      { vehicleType: "OTOBUS", capacity: 50, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 32, source: "DEMO_PLANNING_ASSUMPTION" },
    ],
  }, { baselineInput: BASELINE_INPUT, actualCostInputs: ACTUAL_COST_INPUTS });
  const preview = buildCostScenarioPreview({
    baselineInput: { ...BASELINE_INPUT, passengerCount: 25 },
    scenarioOverrides: { useExternalFuelPrice: true },
    context: {
      ...CONTEXT,
      vehicleCostInputsByType: planningEvidence.vehicleCostInputsByType,
      routeEvidence: {
        ...CONTEXT.routeEvidence,
        vehiclePartitionsByCount: {
          "2": {
            status: "READY",
            totalDistanceKm: 9.5,
            durationMinutes: 14,
            source: "OSRM_ROUTE_PARTITION",
            allocationBasis: "ORDER_BALANCED_PLANNING_ONLY",
            routes: [
              { vehicleIndex: 1, stopOrders: [1], distanceKm: 4.2, durationMinutes: 8 },
              { vehicleIndex: 2, stopOrders: [2], distanceKm: 5.3, durationMinutes: 6 },
            ],
          },
        },
        vehiclePassageEvidenceByCount: {
          "2": {
            status: "PROVEN",
            totalMinor: 30_000,
            vehicleTotalsMinor: [12_000, 18_000],
            vehicles: [{ vehicleIndex: 1, status: "PROVEN" }, { vehicleIndex: 2, status: "PROVEN" }],
            missingReasons: [],
          },
        },
      },
    },
    externalReference: FUEL_REFERENCE,
  });

  const minibus = preview.vehiclePlanAlternatives.items.find((item) => item.vehicleType === "MINIBUS");
  assert.equal(minibus.requiredVehicleCount, 2);
  assert.equal(minibus.routeDistanceKm, 9.5);
  assert.equal(minibus.routeDistanceBasis, "PARTITIONED_ROUTES");
  assert.equal(minibus.routePartition.status, "READY");
  assert.equal(minibus.routePartition.routes.length, 2);
  assert.equal(minibus.fuelRequirementLiters, Number((9.5 * 24 / 100).toFixed(2)));
  assert.equal(minibus.passageEvidence.status, "PROVEN");
  assert.equal(minibus.passageEvidence.totalMinor, 30_000);
  assert.equal(minibus.planningComponentBreakdown.find((item) => item.key === "route_fees")?.amountMinor, 30_000);
});

test("35 kişilik iki duraklı talep 16 koltuklu minibüs için üç ayrı rota ve dengeli yolcu dağılımı üretir", () => {
  const planningEvidence = buildRoomVehiclePlanningEvidence({
    vehicleAlternatives: [
      { vehicleType: "MINIBUS", capacity: 16, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 24, source: "DEMO_PLANNING_ASSUMPTION" },
      { vehicleType: "MIDIBUS", capacity: 27, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 26, source: "DEMO_PLANNING_ASSUMPTION" },
      { vehicleType: "OTOBUS", capacity: 50, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 32, source: "DEMO_PLANNING_ASSUMPTION" },
    ],
  }, { baselineInput: { ...BASELINE_INPUT, passengerCount: 35 }, actualCostInputs: ACTUAL_COST_INPUTS });
  const preview = buildCostScenarioPreview({
    baselineInput: { ...BASELINE_INPUT, passengerCount: 35 },
    scenarioOverrides: { useExternalFuelPrice: true },
    context: {
      ...CONTEXT,
      vehicleCostInputsByType: planningEvidence.vehicleCostInputsByType,
      routeEvidence: {
        ...CONTEXT.routeEvidence,
        vehiclePartitionEvidenceRequested: true,
        passengerAllocationEvidenceRequested: true,
        vehiclePartitionsByCount: {
          "2": {
            status: "READY",
            totalDistanceKm: 9.4,
            durationMinutes: 14,
            source: "OSRM_ROUTE_PARTITION",
            passengerAllocationEvidenceRequested: true,
            routes: [
              { vehicleIndex: 1, passengerCount: 18, stopOrders: [1], distanceKm: 4.1, durationMinutes: 7 },
              { vehicleIndex: 2, passengerCount: 17, stopOrders: [2], distanceKm: 5.3, durationMinutes: 7 },
            ],
          },
          "3": {
            status: "READY",
            totalDistanceKm: 13.2,
            durationMinutes: 9,
            source: "OSRM_ROUTE_PARTITION",
            allocationBasis: "ORDER_BALANCED_PLANNING_ONLY_SHARED_STOPS_ALLOWED",
            passengerAllocationBasis: "BALANCED_PASSENGER_PLANNING_ONLY",
            passengerCount: 35,
            passengerAllocationEvidenceRequested: true,
            routes: [
              { vehicleIndex: 1, passengerCount: 12, stopOrders: [1], distanceKm: 4.4, durationMinutes: 8 },
              { vehicleIndex: 2, passengerCount: 12, stopOrders: [2], distanceKm: 4.4, durationMinutes: 8 },
              { vehicleIndex: 3, passengerCount: 11, stopOrders: [1, 2], distanceKm: 4.4, durationMinutes: 9 },
            ],
          },
        },
      },
    },
    externalReference: FUEL_REFERENCE,
  });

  const alternatives = Object.fromEntries(preview.vehiclePlanAlternatives.items.map((item) => [item.vehicleType, item]));
  const minibus = alternatives.MINIBUS;
  assert.equal(minibus.capacity, 16);
  assert.equal(minibus.requiredVehicleCount, 3);
  assert.notEqual(minibus.requiredVehicleCount, 2);
  assert.equal(minibus.driverCount, 3);
  assert.equal(minibus.routePartition.routes.length, 3);
  assert.deepEqual(minibus.routePartition.routes.map((route) => route.passengerCount), [12, 12, 11]);
  assert.equal(minibus.routePartition.routes.reduce((sum, route) => sum + route.passengerCount, 0), 35);
  assert.ok(minibus.routePartition.routes.every((route) => route.passengerCount <= minibus.capacity));
  assert.equal(alternatives.MIDIBUS.requiredVehicleCount, 2);
  assert.equal(alternatives.OTOBUS.requiredVehicleCount, 1);
});

test("tek araç adayı seçili çoklu araç planının rotasını devralmaz", () => {
  const planningEvidence = buildRoomVehiclePlanningEvidence({
    vehicleAlternatives: [
      { vehicleType: "MINIBUS", capacity: 16, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 24, source: "DEMO_PLANNING_ASSUMPTION" },
      { vehicleType: "MIDIBUS", capacity: 29, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 26, source: "DEMO_PLANNING_ASSUMPTION" },
      { vehicleType: "OTOBUS", capacity: 50, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 32, source: "DEMO_PLANNING_ASSUMPTION" },
    ],
  }, {
    baselineInput: { ...BASELINE_INPUT, passengerCount: 35 },
    actualCostInputs: [],
    includeDemoPlanningDefaults: true,
  });
  const preview = buildCostScenarioPreview({
    baselineInput: { ...BASELINE_INPUT, passengerCount: 35 },
    scenarioOverrides: { vehicleType: "MINIBUS", vehicleCount: 3, vehicleCapacity: 16, useExternalFuelPrice: true },
    context: {
      ...CONTEXT,
      actualCostInputs: [],
      actualEvidence: null,
      baselineDataClass: "INTERNAL_PLANNED",
      periodPlanning: { plannedMovementCount: 1 },
      vehicleCostInputsByType: planningEvidence.vehicleCostInputsByType,
      routeEvidence: {
        baseline: { distanceKm: 6.25, durationMinutes: 12, stopCount: 2, source: "OSRM_BASELINE" },
        scenario: { distanceKm: 32, durationMinutes: 36, stopCount: 2, source: "OSRM_SELECTED_MULTI_VEHICLE" },
        vehiclePartitionEvidenceRequested: true,
        passengerAllocationEvidenceRequested: true,
        vehiclePartitionsByCount: {
          "3": {
            status: "READY",
            totalDistanceKm: 32,
            durationMinutes: 36,
            source: "OSRM_ROUTE_PARTITION",
            passengerAllocationEvidenceRequested: true,
            passengerCount: 35,
            routes: [
              { vehicleIndex: 1, passengerCount: 12, distanceKm: 10, durationMinutes: 12 },
              { vehicleIndex: 2, passengerCount: 12, distanceKm: 11, durationMinutes: 12 },
              { vehicleIndex: 3, passengerCount: 11, distanceKm: 11, durationMinutes: 12 },
            ],
          },
        },
      },
    },
    externalReference: FUEL_REFERENCE,
  });

  const minibus = preview.vehiclePlanAlternatives.items.find((item) => item.vehicleType === "MINIBUS");
  const bus = preview.vehiclePlanAlternatives.items.find((item) => item.vehicleType === "OTOBUS");
  assert.equal(minibus.routeDistanceKm, 32);
  assert.equal(bus.routeDistanceKm, 6.25);
  assert.equal(bus.routeEvidenceSource, "OSRM_BASELINE");
});

test("tek araç adayının dönem maliyeti yakıt ve araç değişken giderini planlı hareket sayısına göre toplar", () => {
  const planningEvidence = buildRoomVehiclePlanningEvidence({
    vehicleAlternatives: [
      { vehicleType: "MINIBUS", capacity: 16, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 7.9, source: "DEMO_PLANNING_ASSUMPTION" },
      { vehicleType: "MIDIBUS", capacity: 29, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 21, source: "DEMO_PLANNING_ASSUMPTION" },
      { vehicleType: "OTOBUS", capacity: 50, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 29, source: "DEMO_PLANNING_ASSUMPTION" },
    ],
  }, {
    baselineInput: { ...BASELINE_INPUT, passengerCount: 35 },
    actualCostInputs: [],
    includeDemoPlanningDefaults: true,
  });
  const preview = buildCostScenarioPreview({
    baselineInput: { ...BASELINE_INPUT, passengerCount: 35 },
    scenarioOverrides: { vehicleType: "MINIBUS", vehicleCount: 3, vehicleCapacity: 16, useExternalFuelPrice: true },
    context: {
      ...CONTEXT,
      actualCostInputs: [],
      actualEvidence: null,
      baselineDataClass: "INTERNAL_PLANNED",
      periodPlanning: { plannedMovementCount: 4 },
      vehicleCostInputsByType: planningEvidence.vehicleCostInputsByType,
      routeEvidence: {
        baseline: { distanceKm: 27.128, durationMinutes: 44.4667, stopCount: 2, source: "OSRM_BASELINE_PERIOD" },
        scenario: { distanceKm: 29.32, durationMinutes: 48, stopCount: 2, source: "OSRM_SELECTED_MULTI_VEHICLE_PERIOD" },
        vehiclePartitionEvidenceRequested: true,
        passengerAllocationEvidenceRequested: true,
        vehiclePartitionsByCount: {
          "3": {
            status: "READY",
            totalDistanceKm: 29.32,
            durationMinutes: 48,
            source: "OSRM_ROUTE_PARTITION_PERIOD",
            passengerAllocationEvidenceRequested: true,
            passengerCount: 35,
            routes: [
              { vehicleIndex: 1, passengerCount: 12, distanceKm: 9.5, durationMinutes: 16 },
              { vehicleIndex: 2, passengerCount: 12, distanceKm: 9.8, durationMinutes: 16 },
              { vehicleIndex: 3, passengerCount: 11, distanceKm: 10.02, durationMinutes: 16 },
            ],
          },
        },
      },
    },
    externalReference: FUEL_REFERENCE,
  });

  const bus = preview.vehiclePlanAlternatives.items.find((item) => item.vehicleType === "OTOBUS");
  const includedComponentTotal = bus.planningComponentBreakdown
    .filter((component) => component.includedInBaseline)
    .reduce((sum, component) => sum + component.amountMinor, 0);
  assert.equal(bus.routeDistanceKm, 27.128);
  assert.equal(bus.planningCostMinor, includedComponentTotal);
  assert.ok(bus.planningCostMinor > 0);
});

test("contractless period preview scales each planning alternative by the user-entered movement count", () => {
  const planningEvidence = buildRoomVehiclePlanningEvidence(null, {
    baselineInput: BASELINE_INPUT,
    actualCostInputs: [],
    includeDemoPlanningDefaults: true,
  });
  const periodScope = buildContractlessServicePeriodPlanningScope({
    planningSchedule: {
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
      weekMask: 31,
      startMin: 360,
      endMin: 480,
      movementsPerDay: 1,
    },
    planningTemplateShifts: [{ routeSnapshotDistanceM: 6250, routeSnapshotDurationSec: 706 }],
    planningAssumptions: { driverBasePerShiftMinor: 500_000, maintenancePerKmMinor: 9_500 },
  });
  const periodInputs = buildPeriodCostInputOverrides({ scope: periodScope, costInputs: BASELINE_INPUT });
  const periodPreview = buildCostScenarioPreview({
    baselineInput: periodInputs,
    scenarioOverrides: { useExternalFuelPrice: true, serviceDayCount: 22, shiftCount: 22, tripCount: 22 },
    context: {
      ...CONTEXT,
      actualCostInputs: [],
      actualEvidence: null,
      baselineDataClass: "INTERNAL_PLANNED",
      periodPlanning: periodScope,
      routeEvidence: {
        baseline: { distanceKm: 137.5, durationMinutes: 258.8667, stopCount: 2, source: "DB_ROUTE_SNAPSHOT" },
        scenario: { distanceKm: 137.5, durationMinutes: 258.8667, stopCount: 2, source: "DB_ROUTE_SNAPSHOT" },
      },
      vehicleCostInputsByType: planningEvidence.vehicleCostInputsByType,
    },
    externalReference: FUEL_REFERENCE,
  });
  const dailyPreview = buildCostScenarioPreview({
    baselineInput: BASELINE_INPUT,
    scenarioOverrides: { useExternalFuelPrice: true },
    context: {
      ...CONTEXT,
      actualCostInputs: [],
      actualEvidence: null,
      baselineDataClass: "INTERNAL_PLANNED",
      vehicleCostInputsByType: planningEvidence.vehicleCostInputsByType,
    },
    externalReference: FUEL_REFERENCE,
  });

  const periodBus = periodPreview.vehiclePlanAlternatives.items.find((item) => item.vehicleType === "OTOBUS");
  const dailyBus = dailyPreview.vehiclePlanAlternatives.items.find((item) => item.vehicleType === "OTOBUS");
  assert.equal(periodScope.plannedMovementCount, 22);
  assert.ok(periodBus.planningCostMinor > dailyBus.planningCostMinor * 10);
  assert.ok(periodBus.planningCostMinor < dailyBus.planningCostMinor * 30);
  assert.equal(periodBus.periodMovementCount, 22);
});

test("a missing multi-vehicle route never becomes zero fuel", () => {
  const planningEvidence = buildRoomVehiclePlanningEvidence({
    vehicleAlternatives: [
      { vehicleType: "MINIBUS", capacity: 16, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 24, source: "DEMO_PLANNING_ASSUMPTION" },
      { vehicleType: "MIDIBUS", capacity: 27, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 26, source: "DEMO_PLANNING_ASSUMPTION" },
      { vehicleType: "OTOBUS", capacity: 50, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 32, source: "DEMO_PLANNING_ASSUMPTION" },
    ],
  }, { baselineInput: { ...BASELINE_INPUT, passengerCount: 35 }, actualCostInputs: ACTUAL_COST_INPUTS });
  const preview = buildCostScenarioPreview({
    baselineInput: { ...BASELINE_INPUT, passengerCount: 35 },
    scenarioOverrides: { useExternalFuelPrice: true },
    context: {
      ...CONTEXT,
      vehicleCostInputsByType: planningEvidence.vehicleCostInputsByType,
      routeEvidence: {
        ...CONTEXT.routeEvidence,
        vehiclePartitionEvidenceRequested: true,
        vehiclePartitionsByCount: {
          "3": { status: "INSUFFICIENT_DATA", totalDistanceKm: null, durationMinutes: null, routes: [], reason: "3 araç için yeterli durak yok" },
        },
      },
    },
    externalReference: FUEL_REFERENCE,
  });
  const minibus = preview.vehiclePlanAlternatives.items.find((item) => item.vehicleType === "MINIBUS");
  assert.equal(minibus.routePartition.status, "INSUFFICIENT_DATA");
  assert.equal(minibus.fuelRequirementLiters, null);
  assert.equal(minibus.comparisonCostMinor, null);
});

test("service actual stays separate while a canonical planning profile makes the selected vehicle comparable", () => {
  const planningEvidence = buildRoomVehiclePlanningEvidence(null, {
    baselineInput: {
      ...BASELINE_INPUT,
      totalDistanceKm: 7.586,
      serviceDistanceKm: 7.586,
      passengerCount: 1,
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
  const preview = buildCostScenarioPreview({
    baselineInput: { ...BASELINE_INPUT, totalDistanceKm: 7.586, serviceDistanceKm: 7.586, passengerCount: 1 },
    scenarioOverrides: { useExternalFuelPrice: true },
    context: {
      ...CONTEXT,
      actualCostInputs: [
        { entryId: 276, componentKey: "fuel", categoryKey: "FUEL", amountMinor: 320_000, currencyCode: "TRY", recordKind: "ACTUAL", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
        { entryId: 277, componentKey: "driver_labor", categoryKey: "EMPLOYER_MONTHLY_COST", amountMinor: 480_000, currencyCode: "TRY", recordKind: "ACTUAL", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      ],
      actualEvidence: { actualCostMinor: 800_000, periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      vehicleCostInputsByType: planningEvidence.vehicleCostInputsByType,
    },
    externalReference: FUEL_REFERENCE,
  });

  const midibus = preview.vehiclePlanAlternatives.items.find((item) => item.vehicleType === "MIDIBUS");
  assert.equal(midibus.actualCostMinor, 800_000);
  assert.ok(midibus.planningCostMinor > 0);
  assert.notEqual(midibus.planningCostMinor, midibus.actualCostMinor);
  assert.equal(midibus.planningCostBasis, "INTERNAL_DATA_PLANNING_ESTIMATE");
  assert.ok(preview.vehiclePlanAlternatives.items.every((item) => item.comparisonCostMinor > 0));
  assert.ok(preview.vehiclePlanAlternatives.recommendation);
});

test("capacity matrix keeps vehicle and driver counts class-specific for 1, 4, 20 and 30 passengers", () => {
  const planningEvidence = buildRoomVehiclePlanningEvidence({
    vehicleAlternatives: [
      { vehicleType: "MINIBUS", capacity: 16, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 24, source: "DEMO_PLANNING_ASSUMPTION" },
      { vehicleType: "MIDIBUS", capacity: 29, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 26, source: "DEMO_PLANNING_ASSUMPTION" },
      { vehicleType: "OTOBUS", capacity: 50, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 32, source: "DEMO_PLANNING_ASSUMPTION" },
    ],
  }, { baselineInput: BASELINE_INPUT, actualCostInputs: ACTUAL_COST_INPUTS });

  const expectedCounts = {
    1: { MINIBUS: 1, MIDIBUS: 1, OTOBUS: 1 },
    4: { MINIBUS: 1, MIDIBUS: 1, OTOBUS: 1 },
    20: { MINIBUS: 2, MIDIBUS: 1, OTOBUS: 1 },
    30: { MINIBUS: 2, MIDIBUS: 2, OTOBUS: 1 },
  };

  for (const [passengerCount, counts] of Object.entries(expectedCounts)) {
    const preview = buildCostScenarioPreview({
      baselineInput: { ...BASELINE_INPUT, passengerCount: Number(passengerCount) },
      scenarioOverrides: { useExternalFuelPrice: true },
      context: { ...CONTEXT, vehicleCostInputsByType: planningEvidence.vehicleCostInputsByType },
      externalReference: FUEL_REFERENCE,
    });
    const alternatives = Object.fromEntries(preview.vehiclePlanAlternatives.items.map((item) => [item.vehicleType, item]));
    for (const vehicleType of Object.keys(counts)) {
      assert.equal(alternatives[vehicleType].requiredVehicleCount, counts[vehicleType], `${passengerCount} pax ${vehicleType} vehicle count`);
      assert.equal(alternatives[vehicleType].driverCount, counts[vehicleType], `${passengerCount} pax ${vehicleType} driver count`);
      assert.equal(alternatives[vehicleType].planningCostCoverage.status, "COMPLETE");
      assert.ok(alternatives[vehicleType].comparisonCostMinor > 0);
    }
  }
});

test("passenger growth scales the selected plan from canonical planning components instead of blocking or repeating actuals", () => {
  const planningEvidence = buildRoomVehiclePlanningEvidence({
    vehicleAlternatives: [
      { vehicleType: "MINIBUS", capacity: 16, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 24, source: "DEMO_PLANNING_ASSUMPTION" },
      { vehicleType: "MIDIBUS", capacity: 29, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 26, source: "DEMO_PLANNING_ASSUMPTION" },
      { vehicleType: "OTOBUS", capacity: 50, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 32, source: "DEMO_PLANNING_ASSUMPTION" },
    ],
  }, { baselineInput: BASELINE_INPUT, actualCostInputs: ACTUAL_COST_INPUTS });
  const preview = buildCostScenarioPreview({
    baselineInput: BASELINE_INPUT,
    scenarioOverrides: {
      passengerCount: 40,
      useExternalFuelPrice: true,
      riskAssumptions: {
        riskFuelUnitPriceMinor: 11_608,
        riskDistanceKm: 7.5,
        riskDurationMinutes: 14.12,
      },
    },
    context: { ...CONTEXT, vehicleCostInputsByType: planningEvidence.vehicleCostInputsByType },
    externalReference: FUEL_REFERENCE,
  });

  assert.equal(preview.baseline.costMinor, 2_390_000);
  assert.equal(preview.baseline.requiredVehicleCount, 1);
  assert.equal(preview.scenarioPlanning.requiredVehicleCount, 2);
  assert.equal(preview.scenario.requiredVehicleCount, 2);
  assert.equal(preview.scenario.costBasis, "INTERNAL_DATA_PLANNING_ESTIMATE");
  assert.ok(preview.scenario.costMinor > preview.baseline.costMinor);
  assert.equal(preview.scenarioVariants.EXPECTED.status, "READY");
  assert.equal(preview.scenarioVariants.EXPECTED.vehicleRequirement, 2);
  assert.equal(preview.scenarioVariants.EXPECTED.estimatedCost, preview.scenario.costMinor);
  assert.equal(preview.scenarioVariants.RISK.status, "READY");
  assert.equal(preview.scenarioVariants.RISK.vehicleRequirement, 2);
  assert.ok(preview.scenarioVariants.RISK.estimatedCost > preview.scenarioVariants.EXPECTED.estimatedCost);
  const scaledMidibus = preview.vehiclePlanAlternatives.items.find((item) => item.vehicleType === "MIDIBUS");
  assert.equal(scaledMidibus.requiredVehicleCount, 2);
  assert.equal(scaledMidibus.costEvidenceSource, "INTERNAL_DATA_PLANNING_ESTIMATE");
  assert.equal(scaledMidibus.costCoverage.status, "COMPLETE");
  assert.equal(scaledMidibus.costMinor, preview.scenario.costMinor);
});

test("risk stress uses the same route/cost engine and reports incremental cost against forecast baseline", () => {
  const preview = buildCostScenarioPreview({
    baselineInput: BASELINE_INPUT,
    scenarioOverrides: {
      useExternalFuelPrice: true,
      riskAssumptions: {
        riskFuelUnitPriceMinor: 12_000,
        riskDistanceKm: 8,
        riskDurationMinutes: 15,
      },
    },
    context: CONTEXT,
    externalReference: FUEL_REFERENCE,
  });

  const risk = preview.scenarioVariants.RISK;
  assert.equal(risk.status, "READY");
  assert.equal(risk.distance, 8);
  assert.equal(risk.duration, 15);
  assert.ok(risk.delayImpact > 0);
  assert.ok(risk.estimatedCost > 0);
  assert.ok(risk.additionalCost > 0);
  assert.equal(risk.savings, null);
  assert.match(risk.costNote, /tahmin|gerçekleşen/i);
  assert.equal(risk.costReconciliation.actualBaselineCostMinor, 2_390_000);
  assert.equal(risk.costReconciliation.planningBaselineCostMinor, 2_162_696);
  assert.equal(risk.costReconciliation.riskCostMinor, 2_170_160);
  assert.equal(risk.costReconciliation.additionalCostVsPlanningBaselineMinor, 7_464);
  assert.equal(risk.costReconciliation.deltaVsActualBaselineMinor, -219_840);

  const longerPreview = buildCostScenarioPreview({
    baselineInput: BASELINE_INPUT,
    scenarioOverrides: {
      useExternalFuelPrice: true,
      riskAssumptions: {
        riskFuelUnitPriceMinor: 12_000,
        riskDistanceKm: 10,
        riskDurationMinutes: 15,
      },
    },
    context: CONTEXT,
    externalReference: FUEL_REFERENCE,
  });
  assert.ok(longerPreview.scenarioVariants.RISK.estimatedCost > risk.estimatedCost);
  assert.equal(longerPreview.scenarioVariants.RISK.costReconciliation.riskCostMinor, 2_175_200);
  assert.equal(longerPreview.scenarioVariants.RISK.costReconciliation.additionalCostVsPlanningBaselineMinor, 12_504);
});

test("risk planning stays fail-closed when there is no actual fuel ledger", () => {
  const preview = buildCostScenarioPreview({
    baselineInput: {
      ...BASELINE_INPUT,
      fuelConsumptionLitersPer100Km: 26,
      fuelUnitPriceMinor: 9_673,
    },
    scenarioOverrides: {
      riskAssumptions: {
        riskFuelUnitPriceMinor: 12_000,
        riskDistanceKm: 8,
        riskDurationMinutes: 15,
      },
    },
    context: {
      ...CONTEXT,
      actualCostInputs: [],
      actualEvidence: null,
      baselineDataClass: "INTERNAL_PLANNED",
    },
  });

  assert.equal(preview.fuelComparison.actualLedgerMinor, null);
  assert.equal(preview.fuelComparison.scenarioUsesActualFuelLedger, false);
  assert.equal(preview.scenarioVariants.RISK.costReconciliation.actualFuelLedgerMinor, null);
  assert.equal(preview.scenarioVariants.RISK.costReconciliation.planningBaselineCostMinor, preview.baseline.costMinor);
});

test("history-free period planning keeps distance, shift and component units aligned", () => {
  const preview = buildCostScenarioPreview({
    baselineInput: {
      currencyCode: "TRY",
      vehicleType: "MIDIBUS",
      vehicleCount: 1,
      vehicleCapacity: 29,
      passengerCount: 20,
      serviceDistanceKm: 6.77,
      totalDistanceKm: 6.77,
      routeDurationMinutes: 11.65,
      serviceDayCount: 1,
      shiftCount: 1,
      tripCount: 1,
      fuelType: "DIESEL",
      fuelUnitPriceMinor: 9_682,
      fuelConsumptionLitersPer100Km: 21,
    },
    scenarioOverrides: {
      vehicleType: "MINIBUS",
      vehicleCount: 1,
      vehicleCapacity: 16,
      passengerCount: 16,
      serviceDistanceKm: 880,
      totalDistanceKm: 968,
      routeDurationMinutes: 1_980,
      serviceDayCount: 22,
      shiftCount: 44,
      tripCount: 44,
    },
    context: {
      scope: "ROOM",
      independentRouteQuoteAdvice: true,
      scenarioPlanningInput: {
        requiredVehicleCount: 1,
        input: {
          vehicleType: "MINIBUS",
          vehicleCapacity: 16,
          fuelConsumptionLitersPer100Km: 7.9,
          maintenancePerKmMinor: 9_500,
          driverBasePerShiftMinor: 500_000,
          driverCompensationMode: "per_shift",
        },
        evidence: {
          vehicle_variable: { dataClass: "DEMO_PLANNING_ASSUMPTION" },
          driver_labor: { dataClass: "DEMO_PLANNING_ASSUMPTION" },
        },
        componentKeys: ["vehicle_variable", "driver_labor"],
        source: "INTERNAL_DATA_PLANNING_ESTIMATE",
      },
    },
  });

  const components = Object.fromEntries(
    preview.scenario.componentBreakdown.map((item) => [item.key, item]),
  );
  assert.equal(preview.status, "READY");
  assert.equal(preview.confidence.level, "MEDIUM");
  assert.equal(preview.dimensions.serviceDistanceKm.scenario, 880);
  assert.equal(preview.dimensions.totalDistanceKm.scenario, 968);
  assert.equal(preview.dimensions.serviceDayCount.scenario, 22);
  assert.equal(components.fuel.amountMinor, 740_402);
  assert.equal(components.vehicle_variable.amountMinor, 9_196_000);
  assert.equal(components.driver_labor.amountMinor, 22_000_000);
  assert.equal(components.vehicle_fixed_allocated.includedInBaseline, false);
  assert.equal(preview.scenario.costMinor, 31_936_402);
  assert.equal(
    preview.scenario.costMinor,
    [components.fuel, components.vehicle_variable, components.driver_labor]
      .reduce((total, item) => total + item.amountMinor, 0),
  );
});

test("read-only user cost assumptions override the canonical planning component", () => {
  const preview = buildCostScenarioPreview({
    baselineInput: {
      currencyCode: "TRY",
      vehicleType: "MINIBUS",
      vehicleCount: 1,
      vehicleCapacity: 16,
      passengerCount: 16,
      serviceDistanceKm: 40,
      totalDistanceKm: 44,
      routeDurationMinutes: 90,
      serviceDayCount: 22,
      shiftCount: 44,
      tripCount: 44,
      fuelType: "DIESEL",
      fuelUnitPriceMinor: 9680,
      fuelConsumptionLitersPer100Km: 7.9,
    },
    scenarioOverrides: {
      serviceDistanceKm: 880,
      totalDistanceKm: 968,
      routeDurationMinutes: 1980,
      serviceDayCount: 22,
      shiftCount: 44,
      tripCount: 44,
      driverBasePerShiftMinor: 600_000,
    },
    context: {
      independentRouteQuoteAdvice: true,
      scenarioPlanningInput: {
        requiredVehicleCount: 1,
        input: {
          vehicleType: "MINIBUS",
          vehicleCapacity: 16,
          fuelConsumptionLitersPer100Km: 7.9,
          maintenancePerKmMinor: 9_500,
          driverBasePerShiftMinor: 500_000,
          driverCompensationMode: "per_shift",
        },
        evidence: {
          vehicle_variable: { dataClass: "DEMO_PLANNING_ASSUMPTION" },
          driver_labor: { dataClass: "DEMO_PLANNING_ASSUMPTION" },
        },
        componentKeys: ["vehicle_variable", "driver_labor"],
        source: "INTERNAL_DATA_PLANNING_ESTIMATE",
        userAssumptionUsed: true,
      },
    },
  });

  const driver = preview.scenario.componentBreakdown.find((item) => item.key === "driver_labor");
  assert.equal(driver.amountMinor, 26_400_000);
  assert.equal(preview.scenario.costMinor, 36_336_249);
});

test("confirmed quote forecast input updates the canonical scenario cost without changing actual evidence", () => {
  const preview = buildCostScenarioPreview({
    baselineInput: {
      ...BASELINE_INPUT,
      fuelUnitPriceMinor: 9680,
      fuelConsumptionLitersPer100Km: 7.9,
    },
    scenarioOverrides: {},
    context: {
      scope: "ROOM",
      independentRouteQuoteAdvice: true,
      scenarioPlanningInput: {
        requiredVehicleCount: 1,
        input: {
          vehicleType: "MIDIBUS",
          vehicleCapacity: 29,
          fuelConsumptionLitersPer100Km: 7.9,
          maintenancePerKmMinor: 9500,
          driverBasePerShiftMinor: 500000,
          driverCompensationMode: "per_shift",
        },
        evidence: {
          vehicle_variable: { dataClass: "DEMO_PLANNING_ASSUMPTION" },
          driver_labor: { dataClass: "DEMO_PLANNING_ASSUMPTION" },
        },
        componentKeys: ["vehicle_variable", "driver_labor"],
        source: "INTERNAL_DATA_PLANNING_ESTIMATE",
      },
      forecastCostInputs: [{
        entryId: 916,
        componentKey: "other_direct_cost",
        categoryKey: "OTHER_OPERATION",
        amountMinor: 125000,
        currencyCode: "TRY",
        recordKind: "FORECAST",
        lifecycle: "CONFIRMED",
        sourceRef: "ROOM-QUOTE-FORECAST-OFFER-16-OTHER_OPERATION",
        sourceType: "ROOM_QUOTE_FORECAST",
        shiftId: 21,
      }],
    },
  });

  const other = preview.scenario.componentBreakdown.find((item) => item.key === "other_direct_cost");
  assert.equal(other.amountMinor, 125000);
  assert.equal(preview.scenario.costMinor > 125000, true);
  assert.equal(preview.baseline.componentBreakdown.find((item) => item.key === "other_direct_cost")?.includedInBaseline, false);
});

test("offer forecast maintenance supplements canonical planning maintenance once", () => {
  const preview = buildCostScenarioPreview({
    baselineInput: {
      ...BASELINE_INPUT,
      fuelUnitPriceMinor: 9680,
      fuelConsumptionLitersPer100Km: 7.9,
    },
    scenarioOverrides: {},
    context: {
      scope: "ROOM",
      independentRouteQuoteAdvice: true,
      scenarioPlanningInput: {
        requiredVehicleCount: 1,
        input: {
          vehicleType: "MIDIBUS",
          vehicleCapacity: 29,
          fuelConsumptionLitersPer100Km: 7.9,
          maintenancePerKmMinor: 9500,
          driverBasePerShiftMinor: 500000,
          driverCompensationMode: "per_shift",
        },
        evidence: {
          vehicle_variable: { dataClass: "DEMO_PLANNING_ASSUMPTION" },
          driver_labor: { dataClass: "DEMO_PLANNING_ASSUMPTION" },
        },
        componentKeys: ["vehicle_variable", "driver_labor"],
        source: "INTERNAL_DATA_PLANNING_ESTIMATE",
      },
      forecastCostInputs: [{
        entryId: 17,
        componentKey: "vehicle_variable",
        categoryKey: "MAINTENANCE",
        amountMinor: 200000,
        currencyCode: "TRY",
        recordKind: "FORECAST",
        lifecycle: "CONFIRMED",
        occurrenceKind: "PERIODIC",
        sourceRef: "ROOM-QUOTE-FORECAST-OFFER-13-MAINTENANCE",
        sourceType: "ROOM_QUOTE_FORECAST",
      }],
    },
  });

  const vehicleVariable = preview.scenario.componentBreakdown.find((item) => item.key === "vehicle_variable");
  assert.equal(vehicleVariable.amountMinor, 259375);
  assert.equal(preview.scenario.costMinor >= 200000, true);
  assert.equal(preview.baseline.componentBreakdown.find((item) => item.key === "vehicle_variable")?.includedInBaseline, false);
});

test("kanıtlı rota geçiş ücreti senaryo maliyetine bir kez eklenir; kanıtsız ücret eklenmez", () => {
  const planningContext = {
    independentRouteQuoteAdvice: true,
    routeEvidence: {
      baseline: { distanceKm: 40, durationMinutes: 90, stopCount: 2, source: "OSRM_ROUTE", passage: { status: "NOT_PROVEN", totalMinor: null } },
      scenario: {
        distanceKm: 40,
        durationMinutes: 90,
        stopCount: 2,
        source: "OSRM_ROUTE",
        routeFeeMinor: 12_000,
        passage: { status: "PROVEN", totalMinor: 12_000, currencyCode: "TRY", items: [] },
      },
    },
    scenarioPlanningInput: {
      requiredVehicleCount: 1,
      input: {
        vehicleType: "MINIBUS",
        vehicleCapacity: 16,
        fuelConsumptionLitersPer100Km: 7.9,
        maintenancePerKmMinor: 9_500,
        driverBasePerShiftMinor: 500_000,
        driverCompensationMode: "per_shift",
      },
      evidence: {
        vehicle_variable: { dataClass: "DEMO_PLANNING_ASSUMPTION" },
        driver_labor: { dataClass: "DEMO_PLANNING_ASSUMPTION" },
      },
      componentKeys: ["vehicle_variable", "driver_labor"],
      source: "INTERNAL_DATA_PLANNING_ESTIMATE",
    },
  };
  const preview = buildCostScenarioPreview({
    baselineInput: {
      currencyCode: "TRY",
      vehicleType: "MINIBUS",
      vehicleCount: 1,
      vehicleCapacity: 16,
      passengerCount: 16,
      serviceDistanceKm: 40,
      totalDistanceKm: 40,
      routeDurationMinutes: 90,
      serviceDayCount: 1,
      shiftCount: 1,
      tripCount: 1,
      fuelType: "DIESEL",
      fuelUnitPriceMinor: 9_682,
      fuelConsumptionLitersPer100Km: 7.9,
    },
    scenarioOverrides: {},
    context: planningContext,
  });
  assert.equal(preview.routePassage.baseline.status, "NOT_PROVEN");
  assert.equal(preview.routePassage.scenario.status, "PROVEN");
  assert.equal(preview.scenario.componentBreakdown.find((item) => item.key === "route_fees")?.amountMinor, 12_000);
  assert.equal(preview.baseline.componentBreakdown.find((item) => item.key === "route_fees")?.includedInBaseline, false);
});
