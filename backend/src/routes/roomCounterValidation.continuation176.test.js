import assert from "node:assert/strict";
import test from "node:test";
import { roomCounterPayloadError } from "./roomCounterValidation.js";

test("room counter rejects an empty normalized payload before changing offer state", () => {
  assert.deepEqual(roomCounterPayloadError({ amountRoom: null, noteRoom: null }), {
    code: "ROOM_COUNTER_VALUE_REQUIRED",
    message: "Karşı teklif için 0'dan büyük bir tutar veya not girilmelidir.",
  });
});

test("room counter keeps confirmed and note-only contracts separate", () => {
  assert.equal(roomCounterPayloadError({ confirmed: true, amountRoom: null, noteRoom: null }), null);
  assert.equal(roomCounterPayloadError({ amountRoom: null, noteRoom: "Araç bilgisi bekleniyor" }), null);
  assert.equal(roomCounterPayloadError({ amountRoom: 1250000, noteRoom: null }), null);
});
