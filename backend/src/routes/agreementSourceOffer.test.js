import test from "node:test";
import assert from "node:assert/strict";
import { agreementCommercialFieldsFromSourceOffer } from "./agreementSourceOffer.js";

test("accepted market offer amounts are carried into a shift-created agreement", () => {
  assert.deepEqual(
    agreementCommercialFieldsFromSourceOffer({
      sourceOffer: {
        amountCompany: 10000,
        amountRoom: 1000000,
        noteRoom: "Finans senaryosu · 10.000 TL",
      },
    }),
    {
      companyOfferAmount: 1000000,
      companyOfferNote: null,
      roomOfferAmount: 1000000,
      roomOfferNote: "Finans senaryosu · 10.000 TL",
    },
  );
});

test("explicit buyer amount remains editable while accepted provider amount is canonical", () => {
  const result = agreementCommercialFieldsFromSourceOffer({
    sourceOffer: { amountCompany: 10000, amountRoom: 1000000 },
    companyOfferAmount: "1200000",
    companyOfferNote: "Onaylı müşteri notu",
  });

  assert.equal(result.companyOfferAmount, 1200000);
  assert.equal(result.companyOfferNote, "Onaylı müşteri notu");
  assert.equal(result.roomOfferAmount, 1000000);
});
