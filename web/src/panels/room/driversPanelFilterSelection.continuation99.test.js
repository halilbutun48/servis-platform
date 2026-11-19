import test from "node:test";
import assert from "node:assert/strict";
import { shouldKeepDriverContext } from "./driverFilterSelection.js";

test("driver context is hidden when the active status filter has no matching row", () => {
  const keep = shouldKeepDriverContext({
    focusDriverId: 1,
    filteredDrivers: [],
    visibleStatusDrivers: [],
    q: "__NO_SUCH_DRIVER__",
  });
  assert.equal(keep, false);
});

test("driver context returns after filters are cleared or the selected row remains visible", () => {
  assert.equal(shouldKeepDriverContext({ focusDriverId: 1, filteredDrivers: [{ id: 1 }] }), true);
  assert.equal(shouldKeepDriverContext({ focusDriverId: 1, filteredDrivers: [], q: "__NO_SUCH_DRIVER__" }), false);
});
