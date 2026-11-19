import assert from "node:assert/strict";
import test from "node:test";
import { buildRoomCounterPayload } from "./roomCounterValidation.js";

test("room counter rejects zero and other invalid numeric input before a write", () => {
  assert.deepEqual(buildRoomCounterPayload({ amountRoom: "0", noteRoom: "" }), {
    error: "Karşı teklif tutarı 0'dan büyük olmalı.",
  });
  assert.deepEqual(buildRoomCounterPayload({ amountRoom: "abc", noteRoom: "" }), {
    error: "Karşı teklif tutarı 0'dan büyük olmalı.",
  });
});

test("room counter keeps supported note-only and positive amount paths", () => {
  assert.deepEqual(buildRoomCounterPayload({ amountRoom: "", noteRoom: "Araç bilgisi bekleniyor" }), {
    amountRoom: undefined,
    noteRoom: "Araç bilgisi bekleniyor",
  });
  assert.deepEqual(buildRoomCounterPayload({ amountRoom: "12500", noteRoom: "" }), {
    amountRoom: 1250000,
    noteRoom: undefined,
  });
  assert.deepEqual(buildRoomCounterPayload({ amountRoom: "", noteRoom: "" }), {
    error: "Karşı teklif için tutar veya not gir.",
  });
});
