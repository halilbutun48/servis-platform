import test from "node:test";
import assert from "node:assert/strict";

import { assertEconomicOwner, resolveEconomicOwner } from "./roomCostOwnership.js";
import { roomCostInputMissingFields } from "./roomCostLedger.js";

test("günlük gerçekleşen giderde belge referansı zorunlu değildir; araç dönem kaynağı korunur", () => {
  assert.deepEqual(
    roomCostInputMissingFields({ recordKind: "ACTUAL", vehicleId: 3, sourceRef: "ROOM-UI-ENTRY-1" }),
    [],
  );
  assert.deepEqual(
    roomCostInputMissingFields({ recordKind: "ACTUAL", vehicleId: 3 }),
    ["sourceRef"],
  );
});

test("HGS gideri seçili seferin doğrudan ekonomik sahibi olur", () => {
  assert.deepEqual(
    resolveEconomicOwner({ categoryKey: "HGS_TOLL", vehicleId: 3, shiftId: 324 }),
    { kind: "DIRECT_TRIP", relation: "shift" },
  );
});

test("HGS gideri sefer kanıtı olmadan araç gideri gibi kaydedilemez", () => {
  assert.throws(
    () => assertEconomicOwner({ categoryKey: "HGS_TOLL", vehicleId: 3 }),
    (error) => error?.code === "SHIFT_REQUIRED",
  );
});
