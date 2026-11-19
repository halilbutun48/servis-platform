import test from "node:test";
import assert from "node:assert/strict";
import { roomMarketOfferQuoteReady } from "./roomOfferQuoteReadiness.js";

const readyInput = {
  canManageRoomCosts: true,
  offerId: 12,
  offerKind: "OFFER",
  offerStatus: "OPEN",
  shiftStatus: "REQUESTED",
  vehicleId: 2,
  scenarioCostMinor: 664190,
  offerAmountMinor: 1000000,
};

test("open ROOM offer can be prepared from selected vehicle scenario without period plan", () => {
  assert.equal(roomMarketOfferQuoteReady(readyInput), true);
});

test("offer preparation still requires a selected vehicle, scenario evidence, and positive user price", () => {
  assert.equal(roomMarketOfferQuoteReady({ ...readyInput, vehicleId: 0 }), false);
  assert.equal(roomMarketOfferQuoteReady({ ...readyInput, offerAmountMinor: 0 }), false);
  assert.equal(roomMarketOfferQuoteReady({ ...readyInput, scenarioCostMinor: null }), false);
});

test("partial canonical scenario evidence does not block explicit quote submission", () => {
  assert.equal(roomMarketOfferQuoteReady({ ...readyInput, scenarioCostMinor: 67890 }), true);
});
