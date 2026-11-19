import test from "node:test";
import assert from "node:assert/strict";
import { buildRealizedIncomeEvidence, deriveOfferLineage } from "./accountingExportContract.js";

function recordBase(overrides = {}) {
  return {
    roomId: 1,
    agreementId: 191,
    amountMinor: 14000000,
    currencyCode: "TRY",
    periodStart: new Date("2026-09-01T00:00:00.000Z"),
    periodEnd: new Date("2026-09-30T00:00:00.000Z"),
    source: "INTERNAL_ACTUAL",
    ...overrides,
  };
}

function fakePrisma({ collectionRows } = {}) {
  return {
    hakedisRecord: { findMany: async () => [recordBase({ id: 158, reference: "HAKEDIS-158", status: "FINALIZED" })] },
    invoiceRecord: { findMany: async () => [recordBase({ id: 143, reference: "INVOICE-143", status: "ISSUED" })] },
    invoiceCollection: { findMany: async () => collectionRows || [] },
  };
}

function fakePeriodPrisma({ hakedisRows, invoiceRows, collectionRows = [] } = {}) {
  return {
    hakedisRecord: { findMany: async () => hakedisRows },
    invoiceRecord: { findMany: async () => invoiceRows },
    invoiceCollection: { findMany: async () => collectionRows },
  };
}

test("hakedis ve fatura aynı ekonomik geliri tek kez sayar, tahsilatı ayrıca mutabıklar", async () => {
  const evidence = await buildRealizedIncomeEvidence({
    roomId: 1,
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    asOfDate: new Date("2026-10-22T00:00:00.000Z"),
    prisma: fakePrisma({
      collectionRows: [{
        id: 1,
        invoiceId: 143,
        amountMinor: 5000000,
        currencyCode: "TRY",
        collectedAt: new Date("2026-09-30T00:00:00.000Z"),
        paymentMethod: "BANK_TRANSFER",
        direction: "COLLECTION",
        status: "CONFIRMED",
        sourceRef: "TEST-COLLECTION-143",
        reversalOfId: null,
      }],
    }),
  });

  assert.equal(evidence.status, "AVAILABLE");
  assert.equal(evidence.amountMinor, 14000000);
  assert.equal(evidence.includedCount, 1);
  assert.equal(evidence.hakedisEvidence.amountMinor, 14000000);
  assert.equal(evidence.invoiceEvidence.amountMinor, 14000000);
  assert.equal(evidence.collectionEvidence.amountMinor, 5000000);
  assert.equal(evidence.receivableEvidence.amountMinor, 9000000);
});

test("tahsilat modeli veya kaydı yoksa gelir yine çift sayılmaz, tahsilat bilinmiyor kalır", async () => {
  const evidence = await buildRealizedIncomeEvidence({
    roomId: 1,
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    asOfDate: new Date("2026-10-22T00:00:00.000Z"),
    prisma: {
      hakedisRecord: { findMany: async () => [recordBase({ id: 158, status: "FINALIZED" })] },
      invoiceRecord: { findMany: async () => [recordBase({ id: 143, status: "ISSUED" })] },
    },
  });

  assert.equal(evidence.status, "AVAILABLE");
  assert.equal(evidence.amountMinor, 14000000);
  assert.equal(evidence.collectionEvidence.status, "UNAVAILABLE");
  assert.equal(evidence.receivableEvidence.status, "UNAVAILABLE");
  assert.equal(evidence.collectionEvidence.amountMinor, null);
  assert.equal(evidence.receivableEvidence.amountMinor, null);
});

test("canonical DEMO okuması TEST_SIMULATED faturayı gerçek saha geliri saymadan görünür kılar", async () => {
  const evidence = await buildRealizedIncomeEvidence({
    roomId: 1,
    periodStart: "2026-11-10",
    periodEnd: "2026-11-16",
    asOfDate: new Date("2026-11-16T12:00:00.000Z"),
    allowTestSimulated: true,
    prisma: fakePeriodPrisma({
      hakedisRows: [recordBase({ id: 404, agreementId: 9, status: "FINALIZED", source: "TEST_SIMULATED", amountMinor: 1000000, periodStart: new Date("2026-11-10T00:00:00.000Z"), periodEnd: new Date("2026-11-16T00:00:00.000Z") })],
      invoiceRows: [recordBase({ id: 405, agreementId: 9, status: "ISSUED", source: "TEST_SIMULATED", amountMinor: 1000000, periodStart: new Date("2026-11-10T00:00:00.000Z"), periodEnd: new Date("2026-11-16T00:00:00.000Z") })],
      collectionRows: [{ id: 406, invoiceId: 405, amountMinor: 400000, currencyCode: "TRY", collectedAt: new Date("2026-11-16T00:00:00.000Z"), paymentMethod: "BANK_TRANSFER", direction: "COLLECTION", status: "CONFIRMED", sourceRef: "SEFERPAKT_DEMO_COLLECTION", reversalOfId: null }],
    }),
  });

  assert.equal(evidence.status, "TEST_SIMULATED");
  assert.equal(evidence.authoritative, false);
  assert.equal(evidence.amountMinor, 1000000);
  assert.equal(evidence.hakedisEvidence.status, "TEST_SIMULATED");
  assert.equal(evidence.invoiceEvidence.status, "TEST_SIMULATED");
  assert.equal(evidence.collectionEvidence.amountMinor, 400000);
  assert.equal(evidence.receivableEvidence.amountMinor, 600000);
  assert.equal(evidence.lines[0].source, "TEST_SIMULATED");
});

test("gelir satırı sözleşmedeki müşteri adını tahsilat ekranına taşır", async () => {
  const evidence = await buildRealizedIncomeEvidence({
    roomId: 1,
    periodStart: "2026-11-10",
    periodEnd: "2026-11-16",
    asOfDate: new Date("2026-11-16T12:00:00.000Z"),
    allowTestSimulated: true,
    prisma: fakePeriodPrisma({
      hakedisRows: [{
        ...recordBase({ id: 504, agreementId: 9, status: "FINALIZED", source: "TEST_SIMULATED", amountMinor: 1000000, periodStart: new Date("2026-11-10T00:00:00.000Z"), periodEnd: new Date("2026-11-16T00:00:00.000Z") }),
        agreement: { company: { name: "DemoCompany" } },
      }],
      invoiceRows: [{
        ...recordBase({ id: 505, agreementId: 9, status: "ISSUED", source: "TEST_SIMULATED", amountMinor: 1000000, periodStart: new Date("2026-11-10T00:00:00.000Z"), periodEnd: new Date("2026-11-16T00:00:00.000Z") }),
        agreement: { company: { name: "DemoCompany" } },
      }],
    }),
  });

  assert.equal(evidence.lines[0].companyName, "DemoCompany");
});

test("tek kabul edilmiş teklif gelir satırında faturanın kaynak teklifini gösterir", async () => {
  const evidence = await buildRealizedIncomeEvidence({
    roomId: 1,
    periodStart: "2026-11-10",
    periodEnd: "2026-11-16",
    asOfDate: new Date("2026-11-16T12:00:00.000Z"),
    allowTestSimulated: true,
    prisma: fakePeriodPrisma({
      hakedisRows: [{
        ...recordBase({ id: 504, agreementId: 9, status: "FINALIZED", source: "TEST_SIMULATED", amountMinor: 1000000, periodStart: new Date("2026-11-10T00:00:00.000Z"), periodEnd: new Date("2026-11-16T00:00:00.000Z") }),
        agreement: {
          company: { id: 3, name: "DemoCompany" },
          shifts: [{ id: 22, offers: [{ id: 701, status: "ACCEPTED", amountCompany: 1000000, amountRoom: 900000 }] }],
        },
      }],
      invoiceRows: [],
    }),
  });

  assert.equal(evidence.lines[0].offerLineageStatus, "READY");
  assert.equal(evidence.lines[0].offerId, 701);
  assert.equal(evidence.lines[0].offerShiftId, 22);
  assert.equal(evidence.lines[0].offerAmountCompanyMinor, 1000000);
  assert.equal(evidence.lines[0].offerAmountRoomMinor, 900000);
});

test("teklif yoksa tahsilat ekranı için teklif bağlantısı kanıtlanmamış kalır", () => {
  assert.deepEqual(deriveOfferLineage({ shifts: [{ id: 22, offers: [] }] }), {
    status: "NOT_PROVEN",
    offerId: null,
    offerShiftId: null,
    offerStatus: null,
    offerAmountCompanyMinor: null,
    offerAmountRoomMinor: null,
  });
});

test("birden çok kabul edilmiş teklif varsa kaynak teklif bağı belirsiz kalır", () => {
  const result = deriveOfferLineage({
    shifts: [{
      id: 22,
      offers: [
        { id: 701, status: "ACCEPTED", amountCompany: 1000000, amountRoom: 900000 },
        { id: 702, status: "ACCEPTED", amountCompany: 1100000, amountRoom: 950000 },
      ],
    }],
  });
  assert.equal(result.status, "AMBIGUOUS");
  assert.equal(result.offerId, null);
  assert.equal(result.offerShiftId, null);
});

test("ALL kapsamı tüm dönemlerdeki gelirleri toplar, hakediş ve faturayı çift saymaz", async () => {
  const hakedisRows = [
    recordBase({ id: 158, reference: "HAKEDIS-158", status: "FINALIZED", amountMinor: 14000000 }),
    recordBase({ id: 159, reference: "HAKEDIS-159", status: "FINALIZED", amountMinor: 9000000, periodStart: new Date("2026-10-01T00:00:00.000Z"), periodEnd: new Date("2026-10-31T00:00:00.000Z") }),
  ];
  const invoiceRows = [
    recordBase({ id: 143, reference: "INVOICE-143", status: "ISSUED", amountMinor: 14000000 }),
    recordBase({ id: 144, reference: "INVOICE-144", status: "ISSUED", amountMinor: 9000000, periodStart: new Date("2026-10-01T00:00:00.000Z"), periodEnd: new Date("2026-10-31T00:00:00.000Z") }),
  ];
  const evidence = await buildRealizedIncomeEvidence({
    roomId: 1,
    periodScope: "ALL",
    asOfDate: new Date("2026-11-01T00:00:00.000Z"),
    prisma: fakePeriodPrisma({
      hakedisRows,
      invoiceRows,
      collectionRows: [
        { id: 1, invoiceId: 143, amountMinor: 8000000, currencyCode: "TRY", collectedAt: new Date("2026-10-05T00:00:00.000Z"), paymentMethod: "BANK_TRANSFER", direction: "COLLECTION", status: "CONFIRMED", sourceRef: "COLLECTION-143", reversalOfId: null },
        { id: 2, invoiceId: 144, amountMinor: 3000000, currencyCode: "TRY", collectedAt: new Date("2026-11-01T00:00:00.000Z"), paymentMethod: "BANK_TRANSFER", direction: "COLLECTION", status: "CONFIRMED", sourceRef: "COLLECTION-144", reversalOfId: null },
      ],
    }),
  });

  assert.equal(evidence.status, "AVAILABLE");
  assert.equal(evidence.periodScope, "ALL");
  assert.equal(evidence.periodStart, null);
  assert.equal(evidence.periodEnd, null);
  assert.equal(evidence.amountMinor, 23000000);
  assert.equal(evidence.includedCount, 2);
  assert.equal(evidence.hakedisEvidence.amountMinor, 23000000);
  assert.equal(evidence.invoiceEvidence.amountMinor, 23000000);
  assert.equal(evidence.collectionEvidence.amountMinor, 11000000);
  assert.equal(evidence.receivableEvidence.amountMinor, 12000000);
  assert.deepEqual(evidence.lines.map((line) => [line.hakedisId, line.invoiceId]), [[158, 143], [159, 144]]);
});

test("özel çok aylı aralıkta seçili aralığa tamamen sığan gelir dönemlerini ve tahsilatı kapsar", async () => {
  const septemberHakedis = recordBase({
    id: 158,
    reference: "HAKEDIS-158",
    status: "FINALIZED",
  });
  const septemberInvoice = recordBase({
    id: 143,
    reference: "INVOICE-143",
    status: "ISSUED",
  });
  const octoberHakedis = recordBase({
    id: 159,
    reference: "HAKEDIS-159",
    status: "FINALIZED",
    amountMinor: 9000000,
    periodStart: new Date("2026-10-01T00:00:00.000Z"),
    periodEnd: new Date("2026-10-31T00:00:00.000Z"),
  });
  const octoberInvoice = recordBase({
    id: 144,
    reference: "INVOICE-144",
    status: "ISSUED",
    amountMinor: 9000000,
    periodStart: new Date("2026-10-01T00:00:00.000Z"),
    periodEnd: new Date("2026-10-31T00:00:00.000Z"),
  });
  const evidence = await buildRealizedIncomeEvidence({
    roomId: 1,
    periodStart: "2026-09-01",
    periodEnd: "2026-10-31",
    asOfDate: new Date("2026-11-01T00:00:00.000Z"),
    prisma: fakePeriodPrisma({
      hakedisRows: [septemberHakedis, octoberHakedis, recordBase({ id: 170, periodStart: new Date("2026-08-01T00:00:00.000Z"), periodEnd: new Date("2026-08-31T00:00:00.000Z") })],
      invoiceRows: [septemberInvoice, octoberInvoice, recordBase({ id: 171, periodStart: new Date("2026-11-01T00:00:00.000Z"), periodEnd: new Date("2026-11-30T00:00:00.000Z") })],
      collectionRows: [
        { id: 1, invoiceId: 143, amountMinor: 5000000, currencyCode: "TRY", collectedAt: new Date("2026-09-30T00:00:00.000Z"), paymentMethod: "BANK_TRANSFER", direction: "COLLECTION", status: "CONFIRMED", sourceRef: "COLLECTION-143", reversalOfId: null },
        { id: 2, invoiceId: 144, amountMinor: 3000000, currencyCode: "TRY", collectedAt: new Date("2026-10-31T00:00:00.000Z"), paymentMethod: "BANK_TRANSFER", direction: "COLLECTION", status: "CONFIRMED", sourceRef: "COLLECTION-144", reversalOfId: null },
      ],
    }),
  });

  assert.equal(evidence.status, "AVAILABLE");
  assert.equal(evidence.amountMinor, 23000000);
  assert.equal(evidence.includedCount, 2);
  assert.equal(evidence.collectionEvidence.amountMinor, 8000000);
  assert.equal(evidence.receivableEvidence.amountMinor, 15000000);
  assert.deepEqual(evidence.lines.map((line) => [line.hakedisId, line.invoiceId, line.periodStart, line.periodEnd]), [
    [158, 143, "2026-09-01", "2026-09-30"],
    [159, 144, "2026-10-01", "2026-10-31"],
  ]);
});
