import test from "node:test";
import assert from "node:assert/strict";

import {
  SETTLEMENT_STATUS,
  normalizeSettlementRequest,
  assessSettlementRequest,
  buildSettlementLineage,
} from "./roomCostSettlement.js";

const baseInput = {
  accrualEntryId: 10,
  actualEntryId: 20,
  settledAmountMinor: 50000,
  currencyCode: "TRY",
  settlementRef: "MAHSUP-2026-09-10",
  idempotencyKey: "room-1-mahsup-10-20-20260910",
  evidenceRef: "FATURA-2026-09-10",
  reason: "Gerçekleşen yakıt kaydı karşılık kaydıyla eşleştirildi.",
  confirmed: true,
  confirmationToken: "MAHSUPLA",
};

const accrual = {
  id: 10,
  roomId: 1,
  recordKind: "ACCRUAL",
  lifecycle: "CONFIRMED",
  amountMinor: 100000,
  currencyCode: "TRY",
  periodStart: "2026-09-01",
  periodEnd: "2026-09-30",
  sourceRef: "ACCRUAL-FUEL-SEP",
};

const actual = {
  id: 20,
  roomId: 1,
  recordKind: "ACTUAL",
  lifecycle: "CONFIRMED",
  amountMinor: 80000,
  currencyCode: "TRY",
  periodStart: "2026-09-01",
  periodEnd: "2026-09-30",
  sourceRef: "ACTUAL-FUEL-SEP",
};

test("mahsup isteği açık onay, kanıt ve idempotency kimliği ister", () => {
  const normalized = normalizeSettlementRequest(baseInput);
  assert.equal(normalized.settledAmountMinor, 50000);
  assert.equal(normalized.confirmed, true);
  assert.equal(normalized.confirmationToken, "MAHSUPLA");
  assert.throws(
    () => normalizeSettlementRequest({ ...baseInput, confirmationToken: "" }),
    (error) => error.code === "SETTLEMENT_CONFIRMATION_REQUIRED",
  );
  assert.throws(
    () => normalizeSettlementRequest({ ...baseInput, evidenceRef: "" }),
    (error) => error.code === "SETTLEMENT_EVIDENCE_REQUIRED",
  );
});

test("mahsup yalnız aynı tenantın onaylı ACCRUAL ve ACTUAL kayıtlarını kabul eder", () => {
  assert.doesNotThrow(() => assessSettlementRequest({ accrual, actual, input: normalizeSettlementRequest(baseInput), existingSettlements: [] }));
  assert.throws(
    () => assessSettlementRequest({ accrual: { ...accrual, roomId: 2 }, actual, input: normalizeSettlementRequest(baseInput), existingSettlements: [] }),
    (error) => error.code === "SETTLEMENT_TENANT_MISMATCH",
  );
  assert.throws(
    () => assessSettlementRequest({ accrual: { ...accrual, recordKind: "ACTUAL" }, actual, input: normalizeSettlementRequest(baseInput), existingSettlements: [] }),
    (error) => error.code === "SETTLEMENT_ACCRUAL_REQUIRED",
  );
});

test("mahsup tutarı kalan tahakkuk ve gerçekleşen bakiyesini aşamaz", () => {
  const input = normalizeSettlementRequest(baseInput);
  assert.equal(assessSettlementRequest({ accrual, actual, input, existingSettlements: [{ settledAmountMinor: 25000, status: "CONFIRMED" }] }).remainingAccrualMinor, 75000);
  assert.throws(
    () => assessSettlementRequest({ accrual, actual, input: { ...input, settledAmountMinor: 56000 }, existingSettlements: [{ settledAmountMinor: 25000, status: "CONFIRMED" }] }),
    (error) => error.code === "SETTLEMENT_AMOUNT_EXCEEDS_REMAINING",
  );
});

test("iptal edilmiş mahsup tekrar toplamı etkilemez ve lineage iki dönemi korur", () => {
  const result = assessSettlementRequest({
    accrual,
    actual,
    input: normalizeSettlementRequest(baseInput),
    existingSettlements: [
      { settledAmountMinor: 10000, status: SETTLEMENT_STATUS.CANCELLED },
      { settledAmountMinor: 15000, status: SETTLEMENT_STATUS.CONFIRMED },
    ],
  });
  const lineage = buildSettlementLineage({ settlement: { id: 99, ...baseInput }, accrual, actual });
  assert.equal(result.settledBeforeMinor, 15000);
  assert.equal(result.remainingActualMinor, 65000);
  assert.deepEqual(lineage.periods, {
    accrual: { start: "2026-09-01", end: "2026-09-30" },
    actual: { start: "2026-09-01", end: "2026-09-30" },
  });
  assert.equal(lineage.noDoubleCount, true);
});

test("lineage accrual dönemini occurredAt ile korur when period alanı yoksa", () => {
  const lineage = buildSettlementLineage({
    settlement: { id: 100, ...baseInput },
    accrual: { ...accrual, periodStart: null, periodEnd: null, occurredAt: "2026-09-15T00:00:00Z" },
    actual,
  });
  assert.deepEqual(lineage.periods.accrual, {
    start: "2026-09-15T00:00:00Z",
    end: "2026-09-15T00:00:00Z",
  });
});
