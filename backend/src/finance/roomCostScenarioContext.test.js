import test from "node:test";
import assert from "node:assert/strict";
import { selectRoomCostScenarioEvidence } from "./roomCostScenarioContext.js";

test("selected ROOM cost scenario is limited to the selected shift allocation", () => {
  const selectedEntry = {
    id: 101,
    roomId: 1,
    categoryKey: "FUEL",
    amountMinor: 120000,
    currencyCode: "TRY",
    vatMode: "NOT_APPLICABLE",
    recordKind: "ACTUAL",
    lifecycle: "CONFIRMED",
    allocation: "COUNT_IN_ROLLUP",
    occurrenceKind: "PERIODIC",
    sourceRef: "DEMO:FUEL:SEPTEMBER",
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    allocationLines: [{
      allocatedAmountMinor: 120000,
      agreementId: 195,
      shiftId: 257,
      lineageKind: "COMPONENT",
    }],
  };
  const unrelatedEntry = {
    ...selectedEntry,
    id: 102,
    amountMinor: 880000,
    sourceRef: "DEMO:FUEL:OCTOBER",
    periodStart: "2026-10-01",
    periodEnd: "2026-10-31",
    allocationLines: [{
      allocatedAmountMinor: 880000,
      agreementId: 196,
      shiftId: 258,
      lineageKind: "COMPONENT",
    }],
  };

  const result = selectRoomCostScenarioEvidence({
    planningInputs: { entries: [selectedEntry, unrelatedEntry] },
    selection: { agreementId: 195, shiftId: 257 },
    targetShift: { id: 257, agreementId: 195, roomId: 1 },
  });

  assert.deepEqual(result.sourceEntries.map((entry) => entry.id), [101]);
  assert.equal(result.allocation.status, "READY");
  assert.equal(result.allocation.grossAmountMinor, 120000);
  assert.equal(result.allocation.operationalInputs.inputs[0].shiftId, 257);
  assert.equal(result.allocation.operationalInputs.inputs[0].amountMinor, 120000);
  assert.equal(result.planningEvidence.actual.entryCount, 1);
  assert.equal(result.planningEvidence.actual.grossAmountMinor, 120000);
  assert.equal(result.planningEvidence.actualEvidence, undefined);
});

test("selected ROOM service context carries proven driver, maintenance, fixed and route costs once", () => {
  const categories = [
    [201, "EMPLOYER_MONTHLY_COST", 500000, { driverId: 11 }],
    [202, "MAINTENANCE", 250000, { vehicleId: 7 }],
    [203, "RENT", 700000, { vehicleId: 7 }],
    [204, "HGS_TOLL", 80000, { vehicleId: 7 }],
  ];
  const entries = categories.map(([id, categoryKey, amountMinor, owner]) => ({
    id,
    roomId: 1,
    categoryKey,
    amountMinor,
    currencyCode: "TRY",
    vatMode: "NOT_APPLICABLE",
    recordKind: "ACTUAL",
    lifecycle: "CONFIRMED",
    allocation: "COUNT_IN_ROLLUP",
    occurrenceKind: "PERIODIC",
    sourceRef: `DEMO:${categoryKey}:SEPTEMBER`,
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    ...owner,
    allocationLines: [{
      allocatedAmountMinor: amountMinor,
      agreementId: 195,
      shiftId: 257,
      lineageKind: "COMPONENT",
    }],
  }));

  const result = selectRoomCostScenarioEvidence({
    planningInputs: { entries },
    selection: { agreementId: 195, shiftId: 257 },
    targetShift: {
      id: 257,
      agreementId: 195,
      roomId: 1,
      vehicleId: 7,
      driverId: 11,
      startAt: "2026-09-15T08:00:00Z",
      endAt: "2026-09-15T18:00:00Z",
    },
  });

  assert.equal(result.allocation.status, "READY");
  assert.equal(result.allocation.grossAmountMinor, 1530000);
  assert.deepEqual(
    result.allocation.operationalInputs.inputs
      .map((input) => [input.componentKey, input.amountMinor])
      .sort(),
    [
      ["driver_labor", 500000],
      ["route_fees", 80000],
      ["vehicle_fixed_allocated", 700000],
      ["vehicle_variable", 250000],
    ],
  );
  assert.equal(result.allocation.operationalInputs.inputs.filter((input) => input.categoryKey === "HGS_TOLL").length, 1);
});

test("selected ROOM offer forecast is tenant- and offer-scoped", () => {
  const selectedForecast = {
    id: 17,
    roomId: 1,
    categoryKey: "MAINTENANCE",
    amountMinor: 200000,
    currencyCode: "TRY",
    vatMode: "NOT_APPLICABLE",
    recordKind: "FORECAST",
    lifecycle: "CONFIRMED",
    allocation: "COUNT_IN_ROLLUP",
    sourceType: "ROOM_QUOTE_FORECAST",
    sourceRef: "ROOM-QUOTE-FORECAST-OFFER-13-MAINTENANCE",
    periodStart: "2026-11-09",
    periodEnd: "2026-11-09",
  };
  const otherOffer = {
    ...selectedForecast,
    id: 18,
    sourceRef: "ROOM-QUOTE-FORECAST-OFFER-16-MAINTENANCE",
  };
  const otherTenant = {
    ...selectedForecast,
    id: 19,
    roomId: 2,
  };

  const result = selectRoomCostScenarioEvidence({
    planningInputs: { entries: [selectedForecast, otherOffer, otherTenant] },
    selection: { offerId: 13, shiftId: 16 },
    targetShift: { id: 16, roomId: 1 },
    roomId: 1,
  });

  assert.deepEqual(result.sourceEntries.map((entry) => entry.id), [17]);
  assert.deepEqual(result.forecastCostInputs.map((input) => input.amountMinor), [200000]);
});

function commonForecastEntry(overrides = {}) {
  return {
    id: 18,
    roomId: 1,
    categoryKey: "MAINTENANCE",
    amountMinor: 346399,
    currencyCode: "TRY",
    vatMode: "UNKNOWN",
    recordKind: "FORECAST",
    lifecycle: "CONFIRMED",
    allocation: "DIRECT",
    occurrenceKind: "PERIODIC",
    vehicleId: 2,
    driverId: 1,
    sourceRef: "SEFERPAKT_DEMO_2026_CANONICAL_V1:P10_COMMON_VEHICLE_MAINTENANCE_20261109_20261116",
    evidenceRef: "SEFERPAKT_DEMO_2026_CANONICAL_V1:REF_MAINTENANCE_RATE_2026",
    periodStart: "2026-11-09",
    periodEnd: "2026-11-16",
    allocationLines: [
      {
        id: 1801,
        roomId: 1,
        entryId: 18,
        lineageKind: "REFERENCE",
        targetKind: "SHIFT",
        vehicleId: 2,
        driverId: 1,
        agreementId: null,
        shiftId: 17,
        periodStart: "2026-11-09",
        periodEnd: "2026-11-09",
        quantity: "20.447",
        unit: "KM",
        unitRateMinor: 9500,
        allocatedAmountMinor: 194247,
        sourceRef: "SEFERPAKT_DEMO_2026_CANONICAL_V1:P10_COMMON_VEHICLE_MAINTENANCE_20261109_20261116",
        evidenceRef: "SEFERPAKT_DEMO_2026_CANONICAL_V1:SHIFT_17_ROUTE_SNAPSHOT_KM",
      },
      {
        id: 1802,
        roomId: 1,
        entryId: 18,
        lineageKind: "REFERENCE",
        targetKind: "SHIFT",
        vehicleId: 2,
        driverId: 1,
        agreementId: 8,
        shiftId: 19,
        periodStart: "2026-11-16",
        periodEnd: "2026-11-16",
        quantity: "16.016",
        unit: "KM",
        unitRateMinor: 9500,
        allocatedAmountMinor: 152152,
        sourceRef: "SEFERPAKT_DEMO_2026_CANONICAL_V1:P10_COMMON_VEHICLE_MAINTENANCE_20261109_20261116",
        evidenceRef: "SEFERPAKT_DEMO_2026_CANONICAL_V1:SHIFT_19_ROUTE_SNAPSHOT_KM",
      },
    ],
    ...overrides,
  };
}

test("confirmed common forecast is projected by persisted shift shares without entering actuals", () => {
  const entry = commonForecastEntry();
  const shift17 = selectRoomCostScenarioEvidence({
    planningInputs: { entries: [entry] },
    selection: { shiftId: 17 },
    targetShift: { id: 17, roomId: 1, vehicleId: 2, driverId: 1, agreementId: null },
    roomId: 1,
  });
  const shift19 = selectRoomCostScenarioEvidence({
    planningInputs: { entries: [entry] },
    selection: { shiftId: 19, agreementId: 8 },
    targetShift: { id: 19, roomId: 1, vehicleId: 2, driverId: 1, agreementId: 8 },
    roomId: 1,
  });

  assert.equal(shift17.allocation.operationalInputs.inputs.length, 0);
  assert.equal(shift17.forecastAllocation.sourceScopeAmountMinor, 346399);
  assert.equal(shift17.forecastAllocation.allocatedAmountMinor, 346399);
  assert.equal(shift17.forecastAllocation.unallocatedAmountMinor, 0);
  assert.equal(shift17.forecastAllocation.grossAmountMinor, 194247);
  assert.deepEqual(shift17.forecastCostInputs.map((input) => [input.amountMinor, input.shiftId]), [[194247, 17]]);
  assert.equal(shift19.forecastAllocation.grossAmountMinor, 152152);
  assert.deepEqual(shift19.forecastCostInputs.map((input) => [input.amountMinor, input.shiftId]), [[152152, 19]]);
  assert.equal(shift17.planningEvidence.actual.entryCount, 0);
  assert.equal(shift17.planningEvidence.forecast.grossAmountMinor, 346399);
});

test("forecast planning scope does not invent a share for an unrelated or unmeasured service", () => {
  const entry = commonForecastEntry({
    allocationLines: [commonForecastEntry().allocationLines[0]],
  });
  const unrelated = selectRoomCostScenarioEvidence({
    planningInputs: { entries: [entry] },
    selection: { shiftId: 21, agreementId: 9 },
    targetShift: { id: 21, roomId: 1, vehicleId: null, driverId: null, agreementId: null },
    roomId: 1,
  });
  assert.deepEqual(unrelated.sourceEntries, []);
  assert.deepEqual(unrelated.forecastCostInputs, []);
});
