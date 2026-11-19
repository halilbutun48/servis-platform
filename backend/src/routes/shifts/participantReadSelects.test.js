import test from "node:test";
import assert from "node:assert/strict";

import { participantVehicleSelect } from "./participantReadSelects.js";

test("katılımcı vardiya okuması P9 hgsClass sütununa bağımlı değildir", () => {
  const select = participantVehicleSelect();

  assert.equal(select.hgsClass, undefined);
  assert.deepEqual(select.gpsLast, true);
  assert.deepEqual(select.gpsState, true);
  assert.equal(select.id, true);
  assert.equal(select.plate, true);
  assert.equal(select.capacity, true);
  assert.equal(select.status, true);
  assert.equal(select.speedLimitKmh, true);
  assert.equal(select.type, true);
  assert.equal(select.roomId, true);
  assert.equal(select.driverId, true);
});
