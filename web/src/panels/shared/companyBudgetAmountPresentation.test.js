import test from "node:test";
import assert from "node:assert/strict";
import {
  formatBudgetAmountInputFromMinor,
  parseBudgetAmountInputToMinor,
} from "./companyBudgetAmountPresentation.js";

test("budget record minor value is shown as a TL input value", () => {
  assert.equal(formatBudgetAmountInputFromMinor(20_000_000), "200000");
  assert.equal(formatBudgetAmountInputFromMinor(20_000_050), "200000.50");
});

test("TL input is converted back to the existing minor-unit payload", () => {
  assert.equal(parseBudgetAmountInputToMinor("200000"), "20000000");
  assert.equal(parseBudgetAmountInputToMinor("200000,50"), "20000050");
  assert.equal(parseBudgetAmountInputToMinor("200.000,50"), "20000050");
  assert.equal(parseBudgetAmountInputToMinor(""), "");
});
