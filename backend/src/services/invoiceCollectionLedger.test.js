import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInvoiceCollectionSummary,
  createCollectionDraft,
  createCompanyPaymentDeclarationDraft,
  confirmCollectionDraft,
  reverseConfirmedCollection,
} from "./invoiceCollectionLedger.js";

function makePrismaFixture() {
  const invoice = {
    id: 143,
    companyId: 1,
    roomId: 1,
    agreementId: 6,
    amountMinor: 14_000_000,
    currencyCode: "TRY",
    status: "ISSUED",
    agreement: {
      id: 6,
      companyId: 1,
      roomId: 1,
      status: "ACTIVE",
      roomOfferAmount: 14_000_000,
      companyOfferAmount: 15_000_000,
    },
    company: { id: 1, name: "Demo COMPANY" },
    room: { id: 1, name: "Demo ROOM" },
  };
  const rows = [];
  let nextId = 1;
  const auditRows = [];
  const client = {
    invoiceRecord: {
      findFirst: async ({ where }) =>
        where.id === invoice.id
          && (where.roomId == null || where.roomId === invoice.roomId)
          && (where.companyId == null || where.companyId === invoice.companyId)
          ? invoice
          : null,
    },
    invoiceCollection: {
      findFirst: async ({ where }) => rows.find((row) =>
        (where.roomId == null || row.roomId === where.roomId) &&
        (where.companyId == null || row.companyId === where.companyId) &&
        row.idempotencyKey === where.idempotencyKey) || null,
      findUnique: async ({ where }) => rows.find((row) => row.id === where.id) || null,
      findMany: async ({ where } = {}) => rows.filter((row) =>
        (where.invoiceId == null || row.invoiceId === where.invoiceId) &&
        (where.roomId == null || row.roomId === where.roomId)),
      create: async ({ data }) => {
        const row = { id: nextId++, version: 1, ...data };
        rows.push(row);
        return row;
      },
      update: async ({ where, data }) => {
        const row = rows.find((item) => item.id === where.id);
        Object.assign(row, data);
        return row;
      },
      updateMany: async ({ where, data }) => {
        const row = rows.find((item) => item.id === where.id
          && (where.status == null || item.status === where.status)
          && (where.version == null || item.version === where.version));
        if (!row) return { count: 0 };
        Object.assign(row, data);
        return { count: 1 };
      },
    },
    auditLog: {
      create: async ({ data }) => {
        auditRows.push(data);
        return data;
      },
    },
    $transaction: async (callback) => callback(client),
  };
  return { client, invoice, rows, auditRows };
}

const actor = { id: 7, role: "ROOM", roomId: 1 };
const companyActor = { id: 8, role: "COMPANY", companyId: 1 };

test("COMPANY ödeme beyanı aynı faturaya bağlı tek kayıt olarak ROOM onayını bekler", async () => {
  const fixture = makePrismaFixture();
  const draft = await createCompanyPaymentDeclarationDraft({
    prisma: fixture.client,
    actor: companyActor,
    invoiceId: 143,
    amountMinor: 5_000_000,
    currencyCode: "TRY",
    collectedAt: "2026-09-30",
    paymentMethod: "BANK_TRANSFER",
    sourceRef: "COMPANY_DECLARATION_50K",
    idempotencyKey: "company-payment-50k",
  });

  assert.equal(draft.status, "DRAFT");
  assert.equal(draft.invoiceId, 143);
  assert.equal(draft.verificationStatus, "NOT_BANK_VERIFIED");

  const pending = await buildInvoiceCollectionSummary({
    prisma: fixture.client,
    actor: companyActor,
    invoiceId: 143,
  });
  assert.equal(pending.partyBinding.status, "READY");
  assert.equal(pending.partyBinding.issuer.role, "ROOM");
  assert.equal(pending.partyBinding.debtor.role, "COMPANY");
  assert.equal(pending.partyBinding.paymentDirection, "COMPANY_TO_ROOM");
  assert.equal(pending.paymentDeclaration.status, "PENDING_ROOM_CONFIRMATION");
  assert.equal(pending.paymentDeclaration.amountMinor, 5_000_000);
  assert.equal(pending.collectedAmountMinor, null);

  await confirmCollectionDraft({ prisma: fixture.client, actor, collectionId: draft.id });
  const confirmed = await buildInvoiceCollectionSummary({
    prisma: fixture.client,
    actor: companyActor,
    invoiceId: 143,
  });
  assert.equal(confirmed.paymentDeclaration.status, "ROOM_CONFIRMED_MANUAL");
  assert.equal(confirmed.collectedAmountMinor, 5_000_000);
  assert.equal(confirmed.receivableAmountMinor, 9_000_000);
  assert.equal(confirmed.paymentDeclaration.verificationStatus, "NOT_BANK_VERIFIED");
  assert.equal(fixture.rows.length, 1);
});

test("onaylı tahsilat varken yeni COMPANY beyanı ayrı bekleyen tutar olarak görünür", async () => {
  const fixture = makePrismaFixture();
  const confirmed = await createCollectionDraft({
    prisma: fixture.client,
    actor,
    invoiceId: 143,
    amountMinor: 8_000_000,
    currencyCode: "TRY",
    collectedAt: "2026-10-05",
    paymentMethod: "BANK_TRANSFER",
    sourceRef: "ROOM_CONFIRMED_80K",
    idempotencyKey: "room-confirmed-80k",
  });
  await confirmCollectionDraft({ prisma: fixture.client, actor, collectionId: confirmed.id });
  await createCompanyPaymentDeclarationDraft({
    prisma: fixture.client,
    actor: companyActor,
    invoiceId: 143,
    amountMinor: 4_000_000,
    currencyCode: "TRY",
    collectedAt: "2026-11-02",
    paymentMethod: "BANK_TRANSFER",
    sourceRef: "COMPANY_PENDING_4K",
    idempotencyKey: "company-pending-4k",
  });

  const summary = await buildInvoiceCollectionSummary({
    prisma: fixture.client,
    actor: companyActor,
    invoiceId: 143,
  });
  assert.equal(summary.paymentDeclaration.status, "ROOM_CONFIRMED_MANUAL");
  assert.equal(summary.paymentDeclaration.pendingAmountMinor, 4_000_000);
  assert.equal(summary.paymentDeclaration.pendingCount, 1);
  assert.equal(summary.collectedAmountMinor, 8_000_000);
  assert.equal(summary.receivableAmountMinor, 6_000_000);
  assert.equal(summary.records.length, 2);
});

test("COMPANY ödeme beyanı başka şirketin faturasına yazılamaz", async () => {
  const fixture = makePrismaFixture();
  await assert.rejects(
    () => createCompanyPaymentDeclarationDraft({
      prisma: fixture.client,
      actor: { ...companyActor, companyId: 2 },
      invoiceId: 143,
      amountMinor: 1_000,
      currencyCode: "TRY",
      collectedAt: "2026-09-30",
      paymentMethod: "CASH",
      idempotencyKey: "wrong-company-payment",
    }),
    (error) => error.code === "INVOICE_NOT_FOUND",
  );
});

test("fatura ile sözleşme tarafları çelişirse ticari borç bağı güvenli biçimde belirsiz kalır", async () => {
  const fixture = makePrismaFixture();
  fixture.invoice.agreement.roomId = 2;
  const summary = await buildInvoiceCollectionSummary({
    prisma: fixture.client,
    actor: companyActor,
    invoiceId: 143,
  });

  assert.equal(summary.partyBinding.status, "NOT_PROVEN");
  assert.equal(summary.paymentDeclaration.status, "NONE");
});

test("COMPANY ödeme beyanlarının toplamı faturayı aşamaz", async () => {
  const fixture = makePrismaFixture();
  await createCompanyPaymentDeclarationDraft({
    prisma: fixture.client,
    actor: companyActor,
    invoiceId: 143,
    amountMinor: 10_000_000,
    currencyCode: "TRY",
    collectedAt: "2026-09-30",
    paymentMethod: "CASH",
    idempotencyKey: "company-first-payment",
  });
  await assert.rejects(
    () => createCompanyPaymentDeclarationDraft({
      prisma: fixture.client,
      actor: companyActor,
      invoiceId: 143,
      amountMinor: 5_000_000,
      currencyCode: "TRY",
      collectedAt: "2026-09-30",
      paymentMethod: "CASH",
      idempotencyKey: "company-overpayment",
    }),
    (error) => error.code === "PAYMENT_DECLARATION_EXCEEDS_INVOICE",
  );
});

test("ROOM tahsilat taslağı faturanın kalan alacağını aşamaz", async () => {
  const fixture = makePrismaFixture();
  await createCollectionDraft({
    prisma: fixture.client,
    actor,
    invoiceId: 143,
    amountMinor: 10_000_000,
    currencyCode: "TRY",
    collectedAt: "2026-09-30",
    paymentMethod: "BANK_TRANSFER",
    idempotencyKey: "room-first-collection",
  });
  await assert.rejects(
    () => createCollectionDraft({
      prisma: fixture.client,
      actor,
      invoiceId: 143,
      amountMinor: 5_000_000,
      currencyCode: "TRY",
      collectedAt: "2026-09-30",
      paymentMethod: "BANK_TRANSFER",
      idempotencyKey: "room-overpayment",
    }),
    (error) => error.code === "COLLECTION_EXCEEDS_INVOICE",
  );
  assert.equal(fixture.rows.length, 1);
});

test("COMPANY ödeme beyanı aynı işlem anahtarıyla çoğalmaz", async () => {
  const fixture = makePrismaFixture();
  const payload = {
    prisma: fixture.client,
    actor: companyActor,
    invoiceId: 143,
    amountMinor: 5_000_000,
    currencyCode: "TRY",
    collectedAt: "2026-09-30",
    paymentMethod: "BANK_TRANSFER",
    sourceRef: "COMPANY_IDEMPOTENT",
    idempotencyKey: "company-same-key",
  };
  const first = await createCompanyPaymentDeclarationDraft(payload);
  const second = await createCompanyPaymentDeclarationDraft(payload);
  assert.equal(second.id, first.id);
  assert.equal(second.idempotentReplay, true);
  assert.equal(fixture.rows.length, 1);
});

test("confirmed partial collection produces a known balance", async () => {
  const fixture = makePrismaFixture();
  const draft = await createCollectionDraft({
    prisma: fixture.client,
    actor,
    invoiceId: 143,
    amountMinor: 5_000_000,
    currencyCode: "TRY",
    collectedAt: "2026-09-30",
    paymentMethod: "BANK_TRANSFER",
    sourceRef: "ISOLATED_ACCEPTANCE_50K",
    idempotencyKey: "isolated-50k",
  });

  await confirmCollectionDraft({ prisma: fixture.client, actor, collectionId: draft.id });
  const summary = await buildInvoiceCollectionSummary({
    prisma: fixture.client,
    actor,
    invoiceId: 143,
  });

  assert.equal(summary.collectedAmountMinor, 5_000_000);
  assert.equal(summary.receivableAmountMinor, 9_000_000);
  assert.equal(summary.status, "AVAILABLE");
  assert.equal(fixture.auditRows.length, 2);
  assert.equal(summary.records[0].verificationMode, "MANUAL");
  assert.equal(summary.records[0].verificationStatus, "NOT_BANK_VERIFIED");
});

test("TEST_SIMULATED invoice source stays visible and explicitly marked", async () => {
  const fixture = makePrismaFixture();
  fixture.invoice.source = "TEST_SIMULATED";
  const draft = await createCollectionDraft({
    prisma: fixture.client,
    actor,
    invoiceId: 143,
    amountMinor: 4_000_000,
    currencyCode: "TRY",
    collectedAt: "2026-09-30",
    paymentMethod: "BANK_TRANSFER",
    sourceRef: "SEFERPAKT_DEMO_SOURCE_LABEL",
    idempotencyKey: "demo-source-label",
  });
  await confirmCollectionDraft({ prisma: fixture.client, actor, collectionId: draft.id });

  const summary = await buildInvoiceCollectionSummary({
    prisma: fixture.client,
    actor: companyActor,
    invoiceId: 143,
  });

  assert.equal(summary.source, "TEST_SIMULATED");
  assert.equal(summary.sourceLabel, "Kontrollü DEMO simülasyonu · gerçek saha/banka kanıtı değil");
  assert.equal(summary.collectedAmountMinor, 4_000_000);
  assert.equal(summary.receivableAmountMinor, 10_000_000);
});

test("draft collection remains visible for explicit confirmation", async () => {
  const fixture = makePrismaFixture();
  const draft = await createCollectionDraft({
    prisma: fixture.client,
    actor,
    invoiceId: 143,
    amountMinor: 5_000_000,
    currencyCode: "TRY",
    collectedAt: "2026-09-30",
    paymentMethod: "BANK_TRANSFER",
    sourceRef: "ISOLATED_DRAFT_VISIBLE",
    idempotencyKey: "draft-visible",
  });

  const summary = await buildInvoiceCollectionSummary({
    prisma: fixture.client,
    actor,
    invoiceId: 143,
  });

  assert.equal(summary.status, "UNAVAILABLE");
  assert.equal(summary.collectedAmountMinor, null);
  assert.equal(summary.receivableAmountMinor, null);
  assert.equal(summary.records.length, 1);
  assert.equal(summary.records[0].id, draft.id);
  assert.equal(summary.records[0].status, "DRAFT");
  assert.equal(summary.records[0].verificationMode, "MANUAL");
});

test("manual payment does not claim bank verification", async () => {
  const fixture = makePrismaFixture();
  const draft = await createCollectionDraft({
    prisma: fixture.client,
    actor,
    invoiceId: 143,
    amountMinor: 5_000_000,
    currencyCode: "TRY",
    collectedAt: "2026-09-30",
    paymentMethod: "BANK_TRANSFER",
    sourceRef: "ISOLATED_MANUAL_TRANSFER",
    idempotencyKey: "manual-transfer",
  });

  assert.equal(draft.verificationMode, "MANUAL");
  assert.equal(draft.verificationStatus, "NOT_BANK_VERIFIED");
});

test("dekont veya işlem referansı olmadan da manuel tahsilat onaylanabilir", async () => {
  const fixture = makePrismaFixture();
  const draft = await createCollectionDraft({
    prisma: fixture.client,
    actor,
    invoiceId: 143,
    amountMinor: 5_000_000,
    currencyCode: "TRY",
    collectedAt: "2026-09-30",
    paymentMethod: "CASH",
    idempotencyKey: "optional-source-ref",
  });

  const confirmed = await confirmCollectionDraft({ prisma: fixture.client, actor, collectionId: draft.id });
  assert.equal(confirmed.status, "CONFIRMED");
  assert.equal(confirmed.sourceRef, null);
  assert.equal(fixture.auditRows.length, 2);
});

test("same idempotency key does not create a duplicate", async () => {
  const fixture = makePrismaFixture();
  const payload = {
    prisma: fixture.client,
    actor,
    invoiceId: 143,
    amountMinor: 5_000_000,
    currencyCode: "TRY",
    collectedAt: "2026-09-30",
    paymentMethod: "BANK_TRANSFER",
    sourceRef: "ISOLATED_IDEMPOTENT",
    idempotencyKey: "same-request",
  };

  const first = await createCollectionDraft(payload);
  const second = await createCollectionDraft(payload);
  assert.equal(second.id, first.id);
  assert.equal(fixture.rows.length, 1);
});

test("reversal removes the confirmed amount without deleting history", async () => {
  const fixture = makePrismaFixture();
  const draft = await createCollectionDraft({
    prisma: fixture.client,
    actor,
    invoiceId: 143,
    amountMinor: 5_000_000,
    currencyCode: "TRY",
    collectedAt: "2026-09-30",
    paymentMethod: "BANK_TRANSFER",
    sourceRef: "ISOLATED_REVERSAL",
    idempotencyKey: "reversal-source",
  });
  await confirmCollectionDraft({ prisma: fixture.client, actor, collectionId: draft.id });
  const reversal = await reverseConfirmedCollection({
    prisma: fixture.client,
    actor,
    collectionId: draft.id,
    idempotencyKey: "reversal-request",
    reason: "İzole test geri alma",
  });
  const summary = await buildInvoiceCollectionSummary({
    prisma: fixture.client,
    actor,
    invoiceId: 143,
  });

  assert.equal(reversal.direction, "REVERSAL");
  assert.equal(summary.status, "AVAILABLE");
  assert.equal(summary.collectedAmountMinor, 0);
  assert.equal(summary.receivableAmountMinor, 14_000_000);
  assert.equal(fixture.rows.length, 2);
});

test("wrong tenant and wrong currency are rejected", async () => {
  const fixture = makePrismaFixture();
  await assert.rejects(
    () => createCollectionDraft({
      prisma: fixture.client,
      actor: { ...actor, roomId: 2 },
      invoiceId: 143,
      amountMinor: 1,
      currencyCode: "TRY",
      collectedAt: "2026-09-30",
      paymentMethod: "BANK_TRANSFER",
      idempotencyKey: "wrong-room",
    }),
    (error) => error.code === "INVOICE_NOT_FOUND",
  );
  await assert.rejects(
    () => createCollectionDraft({
      prisma: fixture.client,
      actor,
      invoiceId: 143,
      amountMinor: 1,
      currencyCode: "EUR",
      collectedAt: "2026-09-30",
      paymentMethod: "BANK_TRANSFER",
      idempotencyKey: "wrong-currency",
    }),
    (error) => error.code === "COLLECTION_CURRENCY_MISMATCH",
  );
});

test("invoice cancellation and a stale confirmation fail closed", async () => {
  const fixture = makePrismaFixture();
  fixture.invoice.status = "CANCELLED";
  await assert.rejects(
    () => createCollectionDraft({
      prisma: fixture.client,
      actor,
      invoiceId: 143,
      amountMinor: 1,
      currencyCode: "TRY",
      collectedAt: "2026-09-30",
      paymentMethod: "CASH",
      sourceRef: "CANCELLED_INVOICE",
      idempotencyKey: "cancelled-invoice",
    }),
    (error) => error.code === "INVOICE_CANCELLED",
  );

  fixture.invoice.status = "ISSUED";
  const draft = await createCollectionDraft({
    prisma: fixture.client,
    actor,
    invoiceId: 143,
    amountMinor: 1_000,
    currencyCode: "TRY",
    collectedAt: "2026-09-30",
    paymentMethod: "CASH",
    sourceRef: "STALE_CONFIRMATION",
    idempotencyKey: "stale-confirmation",
  });
  const updateMany = fixture.client.invoiceCollection.updateMany;
  let injected = false;
  fixture.client.invoiceCollection.updateMany = async (args) => {
    if (!injected) {
      injected = true;
      const row = fixture.rows.find((item) => item.id === draft.id);
      row.version += 1;
    }
    return updateMany(args);
  };
  await assert.rejects(
    () => confirmCollectionDraft({ prisma: fixture.client, actor, collectionId: draft.id }),
    (error) => error.code === "COLLECTION_VERSION_CONFLICT",
  );
});
