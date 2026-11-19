import test from "node:test";
import assert from "node:assert/strict";
import { getShiftOfferPresentation } from "./shiftOfferPresentation.js";

test("market shift kartı aktif ShiftOffer tutarını gösterir", () => {
  const result = getShiftOfferPresentation({
    companyOfferAmount: null,
    roomOfferAmount: null,
    offers: [
      { id: 274, roomId: 1, status: "COUNTERED", amountCompany: null, amountRoom: 3_500_000, noteRoom: "Kanonik karşı teklif" },
    ],
  });

  assert.deepEqual(result, {
    companyOfferAmount: null,
    roomOfferAmount: 3_500_000,
    companyOfferNote: null,
    roomOfferNote: "Kanonik karşı teklif",
    roomOfferDecision: "COUNTERED",
  });
});

test("vardiya üzerindeki kanonik alanlar aktif offer özetinden önceliklidir", () => {
  const result = getShiftOfferPresentation({
    companyOfferAmount: 4_000_000,
    roomOfferAmount: 4_500_000,
    roomOfferDecision: "ACCEPTED",
    offers: [{ id: 274, status: "COUNTERED", amountRoom: 3_500_000 }],
  });

  assert.equal(result.companyOfferAmount, 4_000_000);
  assert.equal(result.roomOfferAmount, 4_500_000);
  assert.equal(result.roomOfferDecision, "ACCEPTED");
});

test("string null teklif notunu kullanıcıya göstermez", () => {
  const result = getShiftOfferPresentation({
    companyOfferNote: "null",
    roomOfferNote: "undefined",
    offers: [{ id: 275, status: "COUNTERED", noteCompany: "null", noteRoom: "undefined" }],
  });

  assert.equal(result.companyOfferNote, null);
  assert.equal(result.roomOfferNote, null);
});

test("teklif notundaki null ekonomik alanı kullanıcıya sızmaz", () => {
  const result = getShiftOfferPresentation({
    roomOfferNote: "Finans senaryosu scenario-replay · teklif tabanı null",
  });

  assert.equal(result.roomOfferNote, "Finans senaryosu scenario-replay");
});
