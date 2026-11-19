import test from "node:test";
import assert from "node:assert/strict";
import { buildAgreementReconciliationPreview, buildReconciliationPreview, calculateRoomHakedisPreview, resolveReconciliationPeriod } from "./hakedisInvoiceReconciliation.js";

const calculationAgreement = {
  id: 209,
  status: "ACTIVE",
  startDate: "2026-10-30",
  endDate: "2026-10-30",
  weekMask: 16,
  startMin: 360,
  endMin: 480,
  roomOfferAmount: 10_000_000,
  currencyCode: "TRY",
};

const completedShift = {
  id: 367,
  status: "DONE",
  startAt: "2026-10-30T03:00:00.000Z",
  progress: { completedAt: "2026-10-30T05:00:00.000Z" },
};

const proportionalAgreement = {
  id: 301,
  status: "ACTIVE",
  startDate: "2026-10-01",
  endDate: "2026-10-30",
  weekMask: 127,
  startMin: 360,
  endMin: 480,
  roomOfferAmount: 14_000_000,
  roomOfferNote: "Eşit hizmet günü üzerinden orantılı hakediş",
  currencyCode: "TRY",
};

function completedServiceDays(count = 1) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(2026, 9, 1 + index));
    return {
      id: 500 + index,
      status: "DONE",
      startAt: `${date.toISOString().slice(0, 10)}T03:00:00.000Z`,
    };
  });
}

test("hakediş tutarı kabul edilmiş sözleşme dönemi bedelinden hesaplanır", () => {
  const result = calculateRoomHakedisPreview({
    agreement: calculationAgreement,
    periodStart: "2026-10-30",
    periodEnd: "2026-10-30",
    operations: [completedShift],
    asOfDate: "2026-11-02",
  });

  assert.equal(result.status, "READY");
  assert.equal(result.amountMinor, 10_000_000);
  assert.equal(result.pricingUnit, "CONTRACT_PERIOD_FLAT");
  assert.equal(result.completedCount, 1);
  assert.match(result.formula, /sözleşme dönemi bedeli/i);
});

test("açık eşit hizmet günü koşulunda 30 günden 1 gün orantılı hakediş hesaplanır", () => {
  const result = calculateRoomHakedisPreview({
    agreement: proportionalAgreement,
    periodStart: "2026-10-01",
    periodEnd: "2026-10-30",
    operations: completedServiceDays(1),
    asOfDate: "2026-11-02",
  });

  assert.equal(result.status, "READY");
  assert.equal(result.pricingUnit, "SERVICE_DAY_EQUAL");
  assert.equal(result.scheduledServiceDayCount, 30);
  assert.equal(result.completedServiceUnitCount, 1);
  assert.equal(result.newlyCompletedServiceUnitCount, 1);
  assert.equal(result.previouslyClaimedServiceUnitCount, 0);
  assert.equal(result.unearnedServiceUnitCount, 29);
  assert.equal(result.amountMinor, 466_667);
});

test("eşit hizmet günü hesabı 15 ve 30 tamamlanan günde doğru tutara ulaşır", () => {
  const half = calculateRoomHakedisPreview({
    agreement: proportionalAgreement,
    periodStart: "2026-10-01",
    periodEnd: "2026-10-30",
    operations: completedServiceDays(15),
    asOfDate: "2026-11-02",
  });
  const full = calculateRoomHakedisPreview({
    agreement: proportionalAgreement,
    periodStart: "2026-10-01",
    periodEnd: "2026-10-30",
    operations: completedServiceDays(30),
    asOfDate: "2026-11-02",
  });

  assert.equal(half.status, "READY");
  assert.equal(half.amountMinor, 7_000_000);
  assert.equal(full.status, "READY");
  assert.equal(full.amountMinor, 14_000_000);
  assert.equal(full.unearnedServiceUnitCount, 0);
});

test("aynı gündeki birden fazla vardiya eşit hizmet günü hesabında tek birim sayılır", () => {
  const result = calculateRoomHakedisPreview({
    agreement: proportionalAgreement,
    periodStart: "2026-10-01",
    periodEnd: "2026-10-30",
    operations: [
      { ...completedServiceDays(1)[0], id: 601 },
      { ...completedServiceDays(1)[0], id: 602, startAt: "2026-10-01T06:00:00.000Z" },
    ],
    asOfDate: "2026-11-02",
  });

  assert.equal(result.status, "READY");
  assert.equal(result.completedCount, 2);
  assert.equal(result.completedServiceUnitCount, 1);
  assert.equal(result.amountMinor, 466_667);
});

test("önceden hakedişe alınan hizmet günü tekrar sayılmaz ve küsurat toplamı sözleşmeyi aşmaz", () => {
  const result = calculateRoomHakedisPreview({
    agreement: proportionalAgreement,
    periodStart: "2026-10-01",
    periodEnd: "2026-10-30",
    operations: completedServiceDays(30),
    previouslyClaimedServiceDates: ["2026-10-01"],
    asOfDate: "2026-11-02",
  });

  assert.equal(result.status, "READY");
  assert.equal(result.previouslyClaimedServiceUnitCount, 1);
  assert.equal(result.newlyCompletedServiceUnitCount, 29);
  assert.equal(result.amountMinor, 13_533_333);
  assert.equal(result.cumulativeClaimedAmountMinor, 14_000_000);
  assert.equal(result.remainingContractAmountMinor, 0);
});

test("eşit hizmet günü yetkisi olmayan sözleşme kısmi hakedişe sessizce geçirilmez", () => {
  const result = calculateRoomHakedisPreview({
    agreement: { ...proportionalAgreement, roomOfferNote: "Aylık sabit bedel" },
    periodStart: "2026-10-01",
    periodEnd: "2026-10-01",
    operations: completedServiceDays(1),
    asOfDate: "2026-11-02",
  });

  assert.equal(result.status, "BLOCKED");
  assert.equal(result.code, "INCOME_PRICING_PERIOD_UNSUPPORTED");
});

test("eşit hizmet günü koşulundaki eksik veya iptal hizmet günü hak edilmez", () => {
  const result = calculateRoomHakedisPreview({
    agreement: proportionalAgreement,
    periodStart: "2026-10-01",
    periodEnd: "2026-10-30",
    operations: [{ ...completedServiceDays(1)[0], status: "DONE" }, { id: 699, status: "CANCELLED", startAt: "2026-10-02T03:00:00.000Z" }],
    asOfDate: "2026-11-02",
  });

  assert.equal(result.status, "READY");
  assert.equal(result.completedServiceUnitCount, 1);
  assert.equal(result.newlyCompletedServiceUnitCount, 1);
  assert.equal(result.unearnedServiceUnitCount, 29);
});

test("desteklenmeyen eşit olmayan hizmet birimi güvenle engellenir", () => {
  const result = calculateRoomHakedisPreview({
    agreement: { ...proportionalAgreement, roomOfferNote: "Vardiya başına orantılı hakediş" },
    periodStart: "2026-10-01",
    periodEnd: "2026-10-30",
    operations: completedServiceDays(1),
    asOfDate: "2026-11-02",
  });

  assert.equal(result.status, "BLOCKED");
  assert.equal(result.code, "INCOME_PRICING_UNIT_UNSUPPORTED");
});

test("sözleşme dönemi fiyatı vardiya sayısıyla ikinci kez çarpılmaz", () => {
  const result = calculateRoomHakedisPreview({
    agreement: calculationAgreement,
    periodStart: "2026-10-30",
    periodEnd: "2026-10-30",
    operations: [completedShift, { ...completedShift, id: 368, startAt: "2026-10-30T06:00:00.000Z" }],
    asOfDate: "2026-11-02",
  });

  assert.equal(result.status, "READY");
  assert.equal(result.completedCount, 2);
  assert.equal(result.amountMinor, 10_000_000);
});

test("aylık sabit bedel tek DONE vardiya ile hazır sayılmaz", () => {
  const result = calculateRoomHakedisPreview({
    agreement: {
      ...calculationAgreement,
      startDate: "2026-10-01",
      endDate: "2026-10-31",
      weekMask: 31,
    },
    periodStart: "2026-10-01",
    periodEnd: "2026-10-31",
    operations: [{ ...completedShift, id: 370, startAt: "2026-10-01T03:00:00.000Z" }],
    asOfDate: "2026-11-02",
  });

  assert.equal(result.status, "BLOCKED");
  assert.equal(result.code, "INCOME_OPERATION_SCOPE_INCOMPLETE");
  assert.equal(result.scheduledServiceDayCount, 22);
  assert.equal(result.missingServiceDayCount, 21);
});

test("aylık sabit bedel yalnız tüm planlı hizmet günleri tamamlanınca hazır olur", () => {
  const dates = [
    "2026-10-01", "2026-10-02", "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09",
    "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-19", "2026-10-20",
    "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30",
  ];
  const result = calculateRoomHakedisPreview({
    agreement: { ...calculationAgreement, startDate: "2026-10-01", endDate: "2026-10-31", weekMask: 31 },
    periodStart: "2026-10-01",
    periodEnd: "2026-10-31",
    operations: dates.map((date, index) => ({ id: 400 + index, status: "DONE", startAt: `${date}T03:00:00.000Z` })),
    asOfDate: "2026-11-02",
  });

  assert.equal(result.status, "READY");
  assert.equal(result.scheduledServiceDayCount, 22);
  assert.equal(result.completedCount, 22);
  assert.equal(result.missingServiceDayCount, 0);
});

test("iptal edilmiş hizmet planlı günü karşılamaz", () => {
  const result = calculateRoomHakedisPreview({
    agreement: calculationAgreement,
    periodStart: "2026-10-30",
    periodEnd: "2026-10-30",
    operations: [{ id: 371, status: "CANCELLED", startAt: "2026-10-30T03:00:00.000Z" }],
    asOfDate: "2026-11-02",
  });

  assert.equal(result.status, "BLOCKED");
  assert.equal(result.code, "INCOME_OPERATION_NOT_COMPLETE");
});

test("takvim dışı gerçekleşen hizmet sözleşme hakedişine katılmaz", () => {
  const result = calculateRoomHakedisPreview({
    agreement: { ...calculationAgreement, startDate: "2026-10-30", endDate: "2026-10-31" },
    periodStart: "2026-10-30",
    periodEnd: "2026-10-31",
    operations: [{ id: 372, status: "DONE", startAt: "2026-10-31T03:00:00.000Z" }],
    asOfDate: "2026-11-02",
  });

  assert.equal(result.status, "BLOCKED");
  assert.equal(result.code, "INCOME_OPERATION_OUTSIDE_SCHEDULE");
});

test("vardiya tarihi Türkiye yerel gününe göre sözleşme takvimiyle eşleşir", () => {
  const result = calculateRoomHakedisPreview({
    agreement: { ...calculationAgreement, startDate: "2026-10-30", endDate: "2026-10-30" },
    periodStart: "2026-10-30",
    periodEnd: "2026-10-30",
    operations: [{ id: 373, status: "DONE", startAt: "2026-10-29T21:30:00.000Z" }],
    asOfDate: "2026-11-02",
  });

  assert.equal(result.status, "READY");
  assert.deepEqual(result.completedShiftIds, [373]);
});

test("kısmi dönem sözleşme fiyatı için kanıtsız paylaştırma yapılmaz", () => {
  const result = calculateRoomHakedisPreview({
    agreement: { ...calculationAgreement, startDate: "2026-10-01", endDate: "2026-10-31" },
    periodStart: "2026-10-30",
    periodEnd: "2026-10-30",
    operations: [completedShift],
    asOfDate: "2026-11-02",
  });

  assert.equal(result.status, "BLOCKED");
  assert.equal(result.code, "INCOME_PRICING_PERIOD_UNSUPPORTED");
});

test("eksik sözleşme fiyatı hakediş hesaplamasını güvenle durdurur", () => {
  const result = calculateRoomHakedisPreview({
    agreement: { ...calculationAgreement, roomOfferAmount: null },
    periodStart: "2026-10-30",
    periodEnd: "2026-10-30",
    operations: [completedShift],
    asOfDate: "2026-11-02",
  });

  assert.equal(result.status, "BLOCKED");
  assert.equal(result.code, "INCOME_PRICE_NOT_PROVEN");
});

test("eksik gerçekleşmiş hizmet varken hakediş tamamlanmış gibi hesaplanmaz", () => {
  const result = calculateRoomHakedisPreview({
    agreement: calculationAgreement,
    periodStart: "2026-10-30",
    periodEnd: "2026-10-30",
    operations: [completedShift, { id: 369, status: "APPROVED", startAt: "2026-10-30T06:00:00.000Z" }],
    asOfDate: "2026-11-02",
  });

  assert.equal(result.status, "BLOCKED");
  assert.equal(result.code, "INCOME_OPERATION_SCOPE_INCOMPLETE");
});

test("aynı operasyon kimliği iki kez gelirse hakediş kapsamı reddedilir", () => {
  const result = calculateRoomHakedisPreview({
    agreement: calculationAgreement,
    periodStart: "2026-10-30",
    periodEnd: "2026-10-30",
    operations: [completedShift, completedShift],
    asOfDate: "2026-11-02",
  });

  assert.equal(result.status, "BLOCKED");
  assert.equal(result.code, "INCOME_OPERATION_DUPLICATE");
});

test("mutabakat önizlemesi otomatik hakediş hesabını kullanıcıya taşır", () => {
  const result = buildReconciliationPreview({
    agreement: calculationAgreement,
    periodStart: "2026-10-30",
    periodEnd: "2026-10-30",
    operations: [{ ...completedShift, completed: true }],
    hakedisRecords: [],
    invoiceRecords: [],
  });

  assert.equal(result.data.incomeCalculation.status, "READY");
  assert.equal(result.data.incomeCalculation.amountMinor, 10_000_000);
  assert.equal(result.data.expectedAmount, null);
});

test("mutabakat önizlemesi orantılı hakediş için kullanıcıya kalan birimleri taşır", () => {
  const result = buildReconciliationPreview({
    agreement: proportionalAgreement,
    periodStart: "2026-10-01",
    periodEnd: "2026-10-30",
    operations: [{ ...completedServiceDays(1)[0], completed: true }],
    hakedisRecords: [],
    invoiceRecords: [],
  });

  assert.equal(result.data.incomeCalculation.status, "READY");
  assert.equal(result.data.incomeCalculation.amountMinor, 466_667);
  assert.equal(result.data.incomeCalculation.previouslyClaimedServiceUnitCount, 0);
  assert.equal(result.data.incomeCalculation.unearnedServiceUnitCount, 29);
});

test("hazır hakediş ve fatura kaydı planlı hizmet kapsamı eksikse uyumlu sayılamaz", () => {
  const result = buildReconciliationPreview({
    agreement: {
      ...calculationAgreement,
      startDate: "2026-10-01",
      endDate: "2026-10-31",
      weekMask: 31,
    },
    periodStart: "2026-10-01",
    periodEnd: "2026-10-31",
    operations: [{ ...completedShift, id: 374, startAt: "2026-10-01T03:00:00.000Z", completed: true }],
    hakedisRecords: [{ id: 91, amountMinor: 10_000_000, currencyCode: "TRY", status: "FINALIZED", source: "INTERNAL_ACTUAL" }],
    invoiceRecords: [{ id: 92, amountMinor: 10_000_000, currencyCode: "TRY", status: "ISSUED", source: "INTERNAL_ACTUAL" }],
  });

  assert.equal(result.data.status, "INCOME_SERVICE_SCOPE_NOT_PROVEN");
  assert.equal(result.data.statusLabel, "Hizmet kapsamı doğrulanmadı");
  assert.equal(result.data.incomeCalculation.status, "BLOCKED");
  assert.equal(result.data.difference.amountMinor, null);
  assert.equal(result.data.confidence, "LOW");
});

test("sözleşme önizlemesi Agreement modelinde olmayan alanı istemez", async () => {
  const result = await buildAgreementReconciliationPreview({
    agreementId: 5,
    periodStart: "2026-10-30",
    periodEnd: "2026-10-30",
    prismaClient: {
      agreement: {
        findUnique: async ({ select }) => {
          assert.equal(select.currencyCode, undefined);
          return null;
        },
      },
    },
  });

  assert.equal(result.data.status, "NO_AGREEMENT");
});

test("mutabakat yanıtı yetkili müşteri bağlamını tahsilat kartına taşır", () => {
  const result = buildReconciliationPreview({
    agreement: {
      ...calculationAgreement,
      companyName: "DemoCompany",
    },
    periodStart: "2026-01-10",
    periodEnd: "2026-01-10",
    operations: [{ ...completedShift, startAt: "2026-01-10T08:00:00.000Z", completed: true }],
    hakedisRecords: [{ id: 91, reference: "internal-hakedis", amountMinor: 10_000_000, currencyCode: "TRY", status: "FINALIZED", source: "INTERNAL_ACTUAL" }],
    invoiceRecords: [{ id: 92, reference: "internal-invoice", amountMinor: 10_000_000, currencyCode: "TRY", status: "ISSUED", source: "INTERNAL_ACTUAL" }],
  });

  assert.equal(result.data.agreement.companyName, "DemoCompany");
  assert.equal(result.data.hakedisPreview.exists, true);
  assert.equal(result.data.invoice.exists, true);
});

test("uses one common canonical income period when an agreement was extended", () => {
  const result = resolveReconciliationPeriod({
    agreement: {
      startDate: "2026-09-01",
      endDate: "2026-10-31",
    },
    hakedisRecords: [{ periodStart: "2026-09-01", periodEnd: "2026-09-30", status: "FINALIZED" }],
    invoiceRecords: [{ periodStart: "2026-09-01", periodEnd: "2026-09-30", status: "ISSUED" }],
  });

  assert.deepEqual(result.period, { periodStart: "2026-09-01", periodEnd: "2026-09-30", valid: true });
  assert.equal(result.fallbackUsed, true);
});

test("does not guess a period when multiple canonical income periods exist", () => {
  const result = resolveReconciliationPeriod({
    agreement: {
      startDate: "2026-09-01",
      endDate: "2026-10-31",
    },
    hakedisRecords: [
      { periodStart: "2026-09-01", periodEnd: "2026-09-30", status: "FINALIZED" },
      { periodStart: "2026-10-01", periodEnd: "2026-10-31", status: "FINALIZED" },
    ],
    invoiceRecords: [
      { periodStart: "2026-09-01", periodEnd: "2026-09-30", status: "ISSUED" },
      { periodStart: "2026-10-01", periodEnd: "2026-10-31", status: "ISSUED" },
    ],
  });

  assert.deepEqual(result.period, { periodStart: "2026-09-01", periodEnd: "2026-10-31", valid: true });
  assert.equal(result.fallbackUsed, false);
});
