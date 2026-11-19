import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRoomFinanceOfferOptions,
  isRoomFinanceOfferSelectable,
} from "./roomFinanceOfferSelection.js";

test("accepted offer closes its source shift in the ROOM finance selector", () => {
  const options = buildRoomFinanceOfferOptions({
    offers: [{ id: 16, shiftId: 21, status: "ACCEPTED" }],
    shifts: [{ id: 21, status: "REQUESTED", agreementId: null }],
  });

  assert.deepEqual(options, []);
});

test("an open offer remains selectable while an unrelated request remains visible", () => {
  const options = buildRoomFinanceOfferOptions({
    offers: [{ id: 13, shiftId: 16, status: "OPEN" }],
    shifts: [
      { id: 16, status: "REQUESTED", agreementId: null },
      { id: 21, status: "REQUESTED", agreementId: null },
    ],
  });

  assert.equal(isRoomFinanceOfferSelectable({ status: "OPEN" }, { status: "REQUESTED" }), true);
  assert.deepEqual(options.map((option) => `${option.kind}:${option.offerId || option.shiftId}`), ["REQUEST:21", "OFFER:13"]);
});
