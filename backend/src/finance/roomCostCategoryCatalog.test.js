import assert from "node:assert/strict";
import test from "node:test";
import { ROOM_COST_CATEGORIES, ROOM_COST_CATEGORY_LABELS } from "./roomCostCategoryCatalog.js";
import { assertEconomicOwner, resolveEconomicOwner } from "./roomCostOwnership.js";

test("ROOM canonical catalog includes all operational categories with Turkish labels", () => {
  for (const key of ["SERVICE_DIRECT", "ROUTE_FEE", "OPERATIONS_OVERHEAD", "OTHER_OPERATION"]) {
    assert.ok(ROOM_COST_CATEGORIES.includes(key));
    assert.ok(ROOM_COST_CATEGORY_LABELS[key]);
  }
  assert.equal(new Set(ROOM_COST_CATEGORIES).size, ROOM_COST_CATEGORIES.length);
});

test("operational category ownership does not invent a vehicle or driver owner", () => {
  assert.equal(resolveEconomicOwner({ categoryKey: "OPERATIONS_OVERHEAD" }).kind, "COMPANY");
  assert.equal(resolveEconomicOwner({ categoryKey: "OTHER_OPERATION" }).kind, "COMPANY");
  assert.equal(resolveEconomicOwner({ categoryKey: "SERVICE_DIRECT", shiftId: 301 }).kind, "DIRECT_TRIP");
  assert.equal(resolveEconomicOwner({ categoryKey: "ROUTE_FEE", shiftId: 301 }).kind, "DIRECT_TRIP");
  assert.throws(
    () => assertEconomicOwner({ categoryKey: "SERVICE_DIRECT" }),
    { code: "SHIFT_REQUIRED" },
  );
});
