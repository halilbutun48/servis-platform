import test from "node:test";
import assert from "node:assert/strict";
import { resolveExpenseOwnership } from "./roomCostOwnership.mjs";

test("kilometreyle dağıtılan araç gideri ayrıntıda servis paylarının dahil olduğunu söyler", () => {
  const ownership = resolveExpenseOwnership({
    categoryKey: "FUEL",
    vehicleId: 1,
    allocationLines: [{ shiftId: 257, allocatedAmountMinor: 76041 }],
  });

  assert.equal(ownership.kind, "VEHICLE");
  assert.match(ownership.detail, /kullanım payları servis maliyetlerine dahil edildi/);
});
