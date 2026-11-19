import test from "node:test";
import assert from "node:assert/strict";
import {
  validateIncomePeriodCorrection,
  resolveEffectiveIncomePeriod,
  shouldExcludeInvoiceForCorrectedHakedis,
  applyIncomePeriodCorrection,
} from "./incomePeriodCorrection.js";
import { buildRealizedIncomeEvidence } from "./accountingExportContract.js";

test("gelir dönemi düzeltmesi kanıt ve gerekçe olmadan kabul edilmez", () => {
  assert.throws(
    () => validateIncomePeriodCorrection({
      hakedisId: 191,
      recognizedPeriodStart: "2026-10-01",
      recognizedPeriodEnd: "2026-10-31",
      evidenceRef: "",
      reason: "",
    }),
    (error) => error.code === "INCOME_PERIOD_EVIDENCE_REQUIRED",
  );
});

test("gelir dönemi düzeltmesi hizmet dönemini ve fatura tarihini taşımaz", () => {
  const source = { id: 191, agreementId: 195, periodStart: "2026-09-01", periodEnd: "2026-09-30" };
  const correction = { hakedisId: 191, recognizedPeriodStart: "2026-10-01", recognizedPeriodEnd: "2026-10-31" };

  assert.deepEqual(resolveEffectiveIncomePeriod(source, correction), {
    sourcePeriodStart: "2026-09-01",
    sourcePeriodEnd: "2026-09-30",
    recognizedPeriodStart: "2026-10-01",
    recognizedPeriodEnd: "2026-10-31",
    corrected: true,
  });
  assert.equal(
    shouldExcludeInvoiceForCorrectedHakedis(
      { id: 176, agreementId: 195, periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      source,
      correction,
    ),
    true,
  );
});

test("ilgisiz fatura dönem düzeltmesi nedeniyle dışlanmaz", () => {
  assert.equal(
    shouldExcludeInvoiceForCorrectedHakedis(
      { id: 178, agreementId: 198, periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      { id: 191, agreementId: 195, periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      { hakedisId: 191, recognizedPeriodStart: "2026-10-01", recognizedPeriodEnd: "2026-10-31" },
    ),
    false,
  );
});

test("aktif dönem düzeltmesi eski dönemi dışlar ve yeni dönemde aynı geliri tek satır taşır", async () => {
  const hakedis = {
    id: 191,
    reference: "HAK-191",
    agreementId: 195,
    roomId: 1,
    periodStart: new Date("2026-09-01T00:00:00.000Z"),
    periodEnd: new Date("2026-09-30T00:00:00.000Z"),
    amountMinor: 1500000,
    currencyCode: "TRY",
    status: "FINALIZED",
    source: "INTERNAL_ACTUAL",
  };
  const invoice = {
    id: 176,
    reference: "FAT-176",
    agreementId: 195,
    roomId: 1,
    periodStart: new Date("2026-09-01T00:00:00.000Z"),
    periodEnd: new Date("2026-09-30T00:00:00.000Z"),
    amountMinor: 1500000,
    currencyCode: "TRY",
    status: "ISSUED",
    source: "INTERNAL_ACTUAL",
  };
  const correction = {
    id: 1,
    hakedisId: 191,
    roomId: 1,
    sourcePeriodStart: new Date("2026-09-01T00:00:00.000Z"),
    sourcePeriodEnd: new Date("2026-09-30T00:00:00.000Z"),
    recognizedPeriodStart: new Date("2026-10-01T00:00:00.000Z"),
    recognizedPeriodEnd: new Date("2026-10-31T00:00:00.000Z"),
    evidenceRef: "EVIDENCE-191",
    reason: "Hizmet gerçekleşme belgesi Ekim döneminde kesinleşti.",
    status: "ACTIVE",
    version: 1,
  };
  const fakePrisma = {
    hakedisRecord: { findMany: async () => [hakedis] },
    invoiceRecord: { findMany: async () => [invoice] },
    hakedisIncomePeriodCorrection: { findMany: async () => [correction] },
  };

  const september = await buildRealizedIncomeEvidence({
    roomId: 1,
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    asOfDate: "2026-10-31",
    prisma: fakePrisma,
  });
  const october = await buildRealizedIncomeEvidence({
    roomId: 1,
    periodStart: "2026-10-01",
    periodEnd: "2026-10-31",
    asOfDate: "2026-10-31",
    prisma: fakePrisma,
  });

  assert.notEqual(september.status, "AVAILABLE");
  assert.equal(october.status, "AVAILABLE");
  assert.equal(october.amountMinor, 1500000);
  assert.equal(october.lines.length, 1);
  assert.equal(october.lines[0].hakedisId, 191);
  assert.equal(october.lines[0].invoiceId, 176);
  assert.equal(october.lines[0].sourcePeriodStart, "2026-09-01");
  assert.equal(october.lines[0].recognizedPeriodStart, "2026-10-01");
});

test("gelir dönemi düzeltmesi ROOM kapsamını sunucu tarafında korur", async () => {
  let observedSourceWhere = null;
  let createCalled = false;
  const fakePrisma = {
    $transaction: async (callback) => callback({
      hakedisIncomePeriodCorrection: {
        findUnique: async () => null,
        findFirst: async () => null,
        create: async () => {
          createCalled = true;
          return null;
        },
      },
      hakedisRecord: {
        findFirst: async ({ where }) => {
          observedSourceWhere = where;
          return null;
        },
      },
    }),
  };

  await assert.rejects(
    applyIncomePeriodCorrection({
      prisma: fakePrisma,
      roomId: 2,
      actorUserId: 3,
      input: {
        hakedisId: 191,
        recognizedPeriodStart: "2026-10-01",
        recognizedPeriodEnd: "2026-10-31",
        evidenceRef: "TENANT-NEGATIVE-191",
        reason: "Yetkisiz ROOM kapsamı negatif testi.",
        idempotencyKey: "TENANT-NEGATIVE-191-ROOM-2",
      },
    }),
    (error) => error.code === "INCOME_PERIOD_SOURCE_NOT_FOUND" && error.status === 404,
  );
  assert.deepEqual(observedSourceWhere, { id: 191, roomId: 2 });
  assert.equal(createCalled, false);
});
