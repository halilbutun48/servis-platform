import test from "node:test";
import assert from "node:assert/strict";
import { buildCompanyBudgetOfferComparison } from "./companyBudgetOfferComparison.js";

const budgetPlan = {
  id: 3,
  companyId: 1,
  status: "DRAFT",
  currencyCode: "TRY",
  budgetAmountMinor: 300000,
  periodStart: "2026-11-01",
  periodEnd: "2026-11-30",
  agreementIds: [207],
};

const commitmentSummary = {
  budgetAmountMinor: 300000,
  committedAmountMinor: 1500000,
  remainingBudgetMinor: -1200000,
  status: "complete",
};

function offer(overrides = {}) {
  return {
    id: 271,
    shiftId: 356,
    status: "ACCEPTED",
    amountCompany: 15000,
    currencyCode: "TRY",
    shift: {
      companyId: 1,
      agreementId: null,
      status: "REQUESTED",
      startAt: "2026-11-03T04:00:00.000Z",
      endAt: "2026-11-03T06:00:00.000Z",
    },
    room: { id: 1, name: "DemoRoom" },
    ...overrides,
  };
}

test("#271 aynı dönem teklifini gösterir ama tek vardiya kapsamını tam dönem bütçe farkı saymaz", () => {
  const result = buildCompanyBudgetOfferComparison({
    companyId: 1,
    budgetPlan,
    commitmentSummary,
    offers: [offer()],
  });

  assert.equal(result.status, "scope_unproven");
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].amountMinor, 15000);
  assert.equal(result.candidates[0].amountMajor, 150);
  assert.equal(result.candidates[0].amountCurrency, "TRY");
  assert.equal(result.candidates[0].scopeStatus, "shift_only");
  assert.equal(result.candidates[0].possibleRemainingBudgetMinor, null);
  assert.equal(result.commitmentSummaryUnchanged, true);
  assert.equal(result.candidates[0].isCommitment, false);
});

test("dönem dışı teklifler aday karşılaştırmaya alınmaz", () => {
  const result = buildCompanyBudgetOfferComparison({
    companyId: 1,
    budgetPlan,
    commitmentSummary,
    offers: [
      offer({ id: 237, shiftId: 322, amountCompany: 2500000, shift: { ...offer().shift, startAt: "2026-10-28T04:00:00.000Z", endAt: "2026-10-28T06:00:00.000Z" } }),
      offer({ id: 238, shiftId: 323, amountCompany: 2500000, shift: { ...offer().shift, startAt: "2027-01-15T04:00:00.000Z", endAt: "2027-01-15T06:00:00.000Z" } }),
    ],
  });

  assert.equal(result.candidates.length, 0);
  assert.equal(result.excluded.filter((item) => item.reasonCode === "PERIOD_MISMATCH").length, 2);
});

test("Agreement bağlantısı olan teklif tekrar taahhüt sayılmaz", () => {
  const result = buildCompanyBudgetOfferComparison({
    companyId: 1,
    budgetPlan,
    commitmentSummary,
    offers: [offer({ shift: { ...offer().shift, agreementId: 207 } })],
  });

  assert.equal(result.candidates.length, 0);
  assert.equal(result.excluded[0].reasonCode, "ALREADY_COMMITTED");
});

test("iptal/reddedilmiş, eksik ve yabancı teklif güvenle dışlanır; geçerli sıfır korunur", () => {
  const result = buildCompanyBudgetOfferComparison({
    companyId: 1,
    budgetPlan,
    commitmentSummary,
    offers: [
      offer({ id: 1, status: "CANCELLED" }),
      offer({ id: 2, status: "REJECTED" }),
      offer({ id: 3, amountCompany: null }),
      offer({ id: 4, amountCompany: 0 }),
      offer({ id: 5, shift: { ...offer().shift, companyId: 2 } }),
    ],
  });

  assert.deepEqual(result.candidates.map((item) => item.offerId), [4]);
  assert.equal(result.candidates[0].amountMinor, 0);
  assert.ok(result.excluded.some((item) => item.reasonCode === "STATUS_NOT_ACTIVE"));
  assert.ok(result.excluded.some((item) => item.reasonCode === "AMOUNT_MISSING"));
  assert.ok(result.excluded.some((item) => item.reasonCode === "TENANT_MISMATCH"));
});

test("alternatif teklifler toplanmaz ve ROOM iç maliyeti taşınmaz", () => {
  const result = buildCompanyBudgetOfferComparison({
    companyId: 1,
    budgetPlan,
    commitmentSummary,
    offers: [offer(), offer({ id: 272, shiftId: 357, amountCompany: 20000 })],
  });

  assert.equal(result.candidates.length, 2);
  assert.equal(result.totalPossibleImpactMinor, null);
  assert.equal("roomInternalCostMinor" in result.candidates[0], false);
  assert.equal("marginMinor" in result.candidates[0], false);
});

test("FULL işareti tek vardiyayı tam bütçe dönemi saymaz", () => {
  const result = buildCompanyBudgetOfferComparison({
    companyId: 1,
    budgetPlan,
    commitmentSummary,
    offers: [offer({ periodCoverage: "FULL" })],
  });

  assert.equal(result.candidates[0].scopeStatus, "shift_only");
  assert.equal(result.candidates[0].possibleRemainingBudgetMinor, null);
});

test("tam dönem vardiyasında ROOM karşı teklifi kullanılır ve bütçe etkisi hesaplanır", () => {
  const result = buildCompanyBudgetOfferComparison({
    companyId: 1,
    budgetPlan: {
      ...budgetPlan,
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
    },
    commitmentSummary: {
      ...commitmentSummary,
      remainingBudgetMinor: 5_000_000,
    },
    offers: [offer({
      amountCompany: 1_000_000,
      amountRoom: 3_500_000,
      shift: {
        ...offer().shift,
        startAt: "2026-09-01T00:00:00.000Z",
        endAt: "2026-09-30T23:59:59.000Z",
        requiredPaxOverride: 40,
        routeSnapshotDistanceM: 8_300,
        routeSnapshotDurationSec: 840,
        _count: { stops: 2, people: 0 },
      },
    })],
  });

  assert.equal(result.status, "ready");
  assert.equal(result.candidates[0].amountMinor, 3_500_000);
  assert.equal(result.candidates[0].amountSource, "ROOM_OFFER");
  assert.equal(result.candidates[0].scopeStatus, "full_period");
  assert.equal(result.candidates[0].possibleRemainingBudgetMinor, 1_500_000);
  assert.deepEqual(result.candidates[0].serviceConditions, {
    passengerCount: 40,
    stopCount: 2,
    distanceKm: 8.3,
    durationMinutes: 14,
  });
});
