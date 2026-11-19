import test from "node:test";
import assert from "node:assert/strict";
import { roomOfferScopeNote, roomOfferTitle } from "./roomOfferScopePresentation.js";

test("agreement-level ROOM offer is presented separately from selected shift revenue", () => {
  assert.equal(
    roomOfferScopeNote({ source: "AGREEMENT_ROOM_OFFER" }),
    "Sözleşme geneli ROOM teklifi; seçili vardiya geliri değildir.",
  );
});

test("shift-level ROOM offer is presented as selected shift scope", () => {
  assert.equal(roomOfferScopeNote({ source: "SHIFT_ROOM_OFFER" }), "Seçili vardiya ROOM teklifi.");
});

test("countered market offer is not presented as an accepted offer", () => {
  assert.equal(roomOfferTitle({ source: "SHIFT_MARKET_ROOM_OFFER", marketOfferStatus: "COUNTERED" }), "Karşı teklif");
  assert.equal(roomOfferTitle({ source: "SHIFT_MARKET_ROOM_OFFER", marketOfferStatus: "ACCEPTED" }), "Kabul edilmiş teklif");
});
