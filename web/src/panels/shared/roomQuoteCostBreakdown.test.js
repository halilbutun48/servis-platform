import test from "node:test";
import assert from "node:assert/strict";
import { buildRoomQuoteCostBreakdown, quoteCostComponentSourceLabel } from "./roomQuoteCostBreakdown.js";

test("quote breakdown keeps canonical included components visible and missing evidence separate", () => {
  const result = buildRoomQuoteCostBreakdown({
    planningCostMinor: 664190,
    planningComponentBreakdown: [
      { key: "fuel", includedInBaseline: true, status: "complete", amountMinor: 12038 },
      { key: "vehicle_variable", includedInBaseline: true, status: "complete", amountMinor: 152152 },
      { key: "driver_labor", includedInBaseline: true, status: "complete", amountMinor: 500000 },
      { key: "vehicle_fixed_allocated", includedInBaseline: false, status: "excluded", amountMinor: 0 },
      { key: "route_fees", includedInBaseline: false, status: "excluded", amountMinor: 0 },
    ],
  });

  assert.equal(result.totalMinor, null);
  assert.equal(result.partialTotalMinor, 664190);
  assert.deepEqual(result.included.map((item) => item.key), ["fuel", "driver_labor", "vehicle_variable"]);
  assert.deepEqual(result.missing.map((item) => item.key), ["vehicle_fixed_allocated", "route_fees", "waiting_and_overtime", "operations_overhead", "other_direct_cost"]);
  assert.equal(result.adblueSupported, false);
});

test("fuel-only planning output is not presented as a complete quote total", () => {
  const result = buildRoomQuoteCostBreakdown({
    planningCostMinor: 56414,
    planningComponentBreakdown: [
      { key: "fuel", includedInBaseline: true, status: "complete", amountMinor: 56414 },
      { key: "driver_labor", includedInBaseline: false, status: "excluded", amountMinor: 0 },
      { key: "vehicle_variable", includedInBaseline: false, status: "excluded", amountMinor: 0 },
    ],
  });

  assert.equal(result.totalMinor, null);
  assert.equal(result.partialTotalMinor, 56414);
  assert.deepEqual(result.missing.map((item) => item.key), [
    "driver_labor",
    "vehicle_variable",
    "vehicle_fixed_allocated",
    "route_fees",
    "waiting_and_overtime",
    "operations_overhead",
    "other_direct_cost",
  ]);
});

test("source label distinguishes planning assumptions from actual-derived evidence", () => {
  assert.equal(quoteCostComponentSourceLabel({ dataClass: "DEMO_PLANNING_ASSUMPTION" }), "Planlama varsayımı; gerçekleşmiş gider değil");
  assert.equal(quoteCostComponentSourceLabel({ dataClass: "INTERNAL_ACTUAL_DERIVED" }), "Gerçek giderden türetilen planlama kanıtı");
});
