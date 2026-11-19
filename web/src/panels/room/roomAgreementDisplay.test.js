import assert from "node:assert/strict";
import test from "node:test";
import { formatAgreementMoney, formatAgreementPriceImpact } from "./roomAgreementDisplay.js";
import { moneyTry } from "./roomAgreementsPanelHelpers.js";

test("ROOM agreement offer amounts use canonical minor-unit display", () => {
  assert.equal(formatAgreementMoney(1500000, "Maliyetli teklif taslağı"), "₺15.000,00");
  assert.equal(formatAgreementMoney(1000000, "STAGE2B DEMO"), "₺10.000,00");
  assert.equal(moneyTry(1500000), "15.000 ₺");
});

test("ROOM route-refresh price impact preserves canonical minor-unit scale", () => {
  assert.equal(
    formatAgreementPriceImpact(1000000, 1000000),
    "₺10.000,00 → ₺10.000,00 (₺0,00)",
  );
  assert.equal(
    formatAgreementPriceImpact(1000000, 1200000),
    "₺10.000,00 → ₺12.000,00 (+₺2.000,00)",
  );
});
