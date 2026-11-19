import test from "node:test";
import assert from "node:assert/strict";
import { focusedExpenseEditorKind, normalizeExpensePrefill, resolveFocusedExpenseEntry, shouldWaitForFocusedExpenseAuthorization } from "./roomCostLedgerFocus.js";

test("focused confirmed expense opens its auditable correction form", () => {
  const entry = resolveFocusedExpenseEntry([
    { id: 267, lifecycle: "CONFIRMED", categoryKey: "EMPLOYER_MONTHLY_COST", isReversal: false },
  ], "267");

  assert.equal(focusedExpenseEditorKind(entry, { salaryRedacted: false }), "CORRECTION");
});

test("focused draft expense opens its draft editor", () => {
  const entry = resolveFocusedExpenseEntry([
    { id: 301, lifecycle: "DRAFT", categoryKey: "FUEL" },
  ], 301);

  assert.equal(focusedExpenseEditorKind(entry), "DRAFT");
});

test("salary correction remains closed when the user cannot see salary data", () => {
  const entry = resolveFocusedExpenseEntry([
    { id: 275, lifecycle: "CONFIRMED", categoryKey: "EMPLOYER_MONTHLY_COST", isReversal: false },
  ], 275);

  assert.equal(focusedExpenseEditorKind(entry, { salaryRedacted: true }), null);
});

test("focused salary correction waits for the authorization result before opening", () => {
  const entry = { id: 275, lifecycle: "CONFIRMED", categoryKey: "EMPLOYER_MONTHLY_COST", isReversal: false };

  assert.equal(shouldWaitForFocusedExpenseAuthorization(entry, { salaryRedacted: true, salaryAccessResolved: false }), true);
  assert.equal(shouldWaitForFocusedExpenseAuthorization(entry, { salaryRedacted: true, salaryAccessResolved: true }), false);
  assert.equal(shouldWaitForFocusedExpenseAuthorization({ ...entry, categoryKey: "FUEL" }, { salaryRedacted: true, salaryAccessResolved: false }), false);
});

test("expense completion carries an explicit form prefill without creating a ledger filter", () => {
  assert.deepEqual(normalizeExpensePrefill({ vehicleId: "1", driverId: 2 }), {
    vehicleId: "1",
    driverId: "2",
  });
});
