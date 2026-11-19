import test from "node:test";
import assert from "node:assert/strict";
import { buildRoomIncomeChainRequest } from "./reconciliationIncomeChainPresentation.js";

test("ROOM gelir formu canonical dönemi ve kanıtı taşır; tutar sunucuda hesaplanır", () => {
  const result = buildRoomIncomeChainRequest({
    agreementId: 209,
    data: { period: { start: "2026-10-30", end: "2026-10-30" } },
    form: { sourceRef: "DEMO-209-KABUL" },
    currencyCode: "TRY",
  });

  assert.deepEqual(result, {
    periodStart: "2026-10-30",
    periodEnd: "2026-10-30",
    currencyCode: "TRY",
    sourceRef: "DEMO-209-KABUL",
    idempotencyKey: "room-income-209-2026-10-30-2026-10-30",
    userApproval: true,
  });
});

test("ROOM gelir formu eksik kanıtı sessizce yazıya dönüştürmez", () => {
  assert.deepEqual(buildRoomIncomeChainRequest({
    agreementId: 209,
    data: { period: { start: "2026-10-30", end: "2026-10-30" } },
    form: { sourceRef: "" },
    currencyCode: "TRY",
  }), { error: "SOURCE_REQUIRED" });
});

test("kısmi hakediş işlemi yeni tamamlanan günleri işlem anahtarına bağlar", () => {
  const result = buildRoomIncomeChainRequest({
    agreementId: 301,
    data: {
      period: { start: "2026-10-01", end: "2026-10-30" },
      incomeCalculation: { newlyCompletedServiceDates: ["2026-10-01", "2026-10-02"] },
    },
    form: { sourceRef: "DEMO-PARTIAL" },
    currencyCode: "TRY",
  });

  assert.equal(result.idempotencyKey, "room-income-301-2026-10-01-2026-10-30-1v0bhz6");
});
