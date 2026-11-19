import test from "node:test";
import assert from "node:assert/strict";
import { formatOfferAmountMinor, parseOfferAmountInput } from "./offerAmountPresentation.js";

test("offer amounts use minor units at the API boundary and TL in the UI", () => {
  assert.equal(formatOfferAmountMinor(3_500_000), "35.000,00");
  assert.equal(parseOfferAmountInput("35.000"), 3_500_000);
  assert.equal(parseOfferAmountInput("35.000,50"), 3_500_050);
});

test("company offer input preserves the same TL-to-minor-unit contract", () => {
  assert.equal(parseOfferAmountInput("10000"), 1_000_000);
  assert.equal(parseOfferAmountInput("10000,00"), 1_000_000);
  assert.equal(parseOfferAmountInput("10.000,00"), 1_000_000);
  assert.equal(parseOfferAmountInput("0"), null);
  assert.equal(parseOfferAmountInput("abc"), null);
});
