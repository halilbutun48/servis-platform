import test from "node:test";
import assert from "node:assert/strict";
import { listDriversForPendingShift } from "./roomPendingDriverScope.js";

test("responsive pending market card uses the offer room for driver scope", () => {
  const drivers = [
    { id: 1, roomId: 1, fullName: "Room Driver" },
    { id: 2, roomId: 2, fullName: "Other Room Driver" },
  ];
  const shift = { id: 28, roomId: null };
  const marketOffer = { shiftId: 28, roomId: 1 };

  assert.deepEqual(
    listDriversForPendingShift(drivers, shift, marketOffer).map((driver) => driver.id),
    [1],
  );
});
