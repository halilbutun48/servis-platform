import test from "node:test";
import assert from "node:assert/strict";
import { getHashQueryParams } from "./router.js";

test("maliyet senaryosu route'u seçili vardiya query bağlamını okur", () => {
  const params = getHashQueryParams("#/room/cost-scenarios?focusShiftId=53&focusVehicleId=2");

  assert.equal(params.get("focusShiftId"), "53");
  assert.equal(params.get("focusVehicleId"), "2");
});
