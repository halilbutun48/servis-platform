import test from "node:test";
import assert from "node:assert/strict";
import { resolveApprovalRetry, resolveRoomApprovalScope } from "./roomShared.js";

test("market vardiyası onayında aktör ROOM kapsamı sahiplenme kapsamı olur", () => {
  assert.deepEqual(
    resolveRoomApprovalScope({ shiftRoomId: null, userRoomId: 1 }),
    { scopeRoomId: 1, claimRoomId: 1 },
  );
});

test("atanmış vardiyada mevcut ROOM kapsamı korunur", () => {
  assert.deepEqual(
    resolveRoomApprovalScope({ shiftRoomId: 2, userRoomId: 1 }),
    { scopeRoomId: 2, claimRoomId: null },
  );
});

test("aynı onay tekrarı idempotent kararı üretir", () => {
  assert.deepEqual(
    resolveApprovalRetry({
      shiftStatus: "APPROVED",
      assignedVehicleId: 34,
      assignedDriverId: 7,
      requestedVehicleId: 34,
      requestedDriverId: 7,
    }),
    { code: "IDEMPOTENT_APPROVAL", status: 200 },
  );
});

test("onaylanmış vardiyada farklı atama onay uç noktasından değiştirilemez", () => {
  assert.deepEqual(
    resolveApprovalRetry({
      shiftStatus: "APPROVED",
      assignedVehicleId: 34,
      assignedDriverId: 7,
      requestedVehicleId: 50,
      requestedDriverId: 9,
    }),
    { code: "SHIFT_ALREADY_APPROVED", status: 409 },
  );
});
