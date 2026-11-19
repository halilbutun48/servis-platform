import test from "node:test";
import assert from "node:assert/strict";
import { createRoomIncomeChain } from "./financialOperationsLifecycle.js";

const actor = { id: 21, role: "ROOM", roomId: 21 };
const runtime = { mode: "canonical_demo", nodeEnv: "development" };
const agreement = {
  id: 209,
  companyId: 1,
  roomId: 21,
  status: "ACTIVE",
  startDate: new Date("2026-10-30T00:00:00.000Z"),
  endDate: new Date("2026-10-30T00:00:00.000Z"),
  weekMask: 16,
  startMin: 360,
  endMin: 480,
  roomOfferAmount: 10_000_000,
  companyOfferAmount: 10_000_000,
  currencyCode: "TRY",
};

function buildDb({ existingHakedis = [], existingInvoices = [], shifts = [{ id: 367, status: "DONE", startAt: new Date("2026-10-30T03:00:00.000Z"), progress: null }], agreementRecord = agreement, audits = [] } = {}) {
  const state = {
    hakedis: existingHakedis.map((row) => ({ ...row })),
    invoices: existingInvoices.map((row) => ({ ...row })),
    shifts: shifts.map((row) => ({ ...row })),
    audits: audits.map((row) => ({ ...row })),
    nextHakedisId: 500,
    nextInvoiceId: 500,
  };
  const db = {
    state,
    agreement: {
      findUnique: async ({ where }) => Number(where.id) === agreementRecord.id ? { ...agreementRecord } : null,
    },
    shift: {
      findMany: async () => state.shifts,
    },
    hakedisRecord: {
      findMany: async () => state.hakedis,
      create: async ({ data }) => {
        const row = { id: state.nextHakedisId++, ...data };
        state.hakedis.push(row);
        return row;
      },
    },
    invoiceRecord: {
      findMany: async () => state.invoices,
      create: async ({ data }) => {
        const row = { id: state.nextInvoiceId++, ...data };
        state.invoices.push(row);
        return row;
      },
    },
    auditLog: {
      findMany: async () => state.audits,
      create: async ({ data }) => {
        state.audits.push(data);
        return data;
      },
    },
    $transaction: async (callback) => callback(db),
  };
  return db;
}

const input = {
  agreementId: 209,
  periodStart: "2026-10-30",
  periodEnd: "2026-10-30",
  currencyCode: "TRY",
  sourceRef: "DEMO-ROOM-209-ACCEPTED-CONTRACT",
  idempotencyKey: "room-209-income-20261030-v1",
  userApproval: true,
};

test("ROOM gelir zinciri tamamlanmış vardiyadan tek transaction içinde hakediş ve fatura üretir", async () => {
  const db = buildDb();
  const result = await createRoomIncomeChain({ prisma: db, actor, input });

  assert.equal(result.idempotent, false);
  assert.equal(result.hakedis.status, "FINALIZED");
  assert.equal(result.hakedis.source, "INTERNAL_ACTUAL");
  assert.equal(result.hakedis.amountMinor, agreement.roomOfferAmount);
  assert.equal(result.invoice.status, "ISSUED");
  assert.equal(result.invoice.source, "INTERNAL_ACTUAL");
  assert.equal(result.invoice.amountMinor, agreement.roomOfferAmount);
  assert.equal(result.invoice.currencyCode, "TRY");
  assert.deepEqual(db.state.audits.map((row) => row.action), [
    "ROOM_HAKEDIS_FINALIZED",
    "ROOM_INVOICE_ISSUED",
  ]);
  assert.equal(result.vatStatus, "NOT_PROVEN");
  assert.equal(result.netProfitStatus, "NOT_PROVEN");
  assert.equal(result.calculation.pricingUnit, "CONTRACT_PERIOD_FLAT");
  assert.equal(result.calculation.completedCount, 1);
});

test("TEST_SIMULATED hizmet kanıtı yalnız açık DEMO audit'iyle gelir zincirine bağlanır", async () => {
  const sourceRef = "SEFERPAKT_DEMO_CONT251_SHIFT367";
  const db = buildDb({
    audits: [{
      action: "ROOM_TEST_SIMULATED_SERVICE_COMPLETED",
      entity: "Shift",
      entityId: 367,
      meta: { dataClass: "TEST_SIMULATED", sourceRef },
    }],
  });
  const result = await createRoomIncomeChain({
    prisma: db,
    actor,
    runtime,
    input: { ...input, sourceRef, serviceEvidenceSource: "TEST_SIMULATED", idempotencyKey: "room-209-income-simulated-v1" },
  });
  assert.equal(result.hakedis.source, "TEST_SIMULATED");
  assert.equal(result.invoice.source, "TEST_SIMULATED");
  assert.match(db.state.hakedis[0].notes, /TEST_SIMULATED/);
});

test("aynı ekonomik içerikle aynı anahtarın tekrarı yeni gelir kaydı oluşturmaz", async () => {
  const db = buildDb();
  const first = await createRoomIncomeChain({ prisma: db, actor, input });
  const replay = await createRoomIncomeChain({ prisma: db, actor, input });

  assert.equal(replay.idempotent, true);
  assert.equal(replay.hakedis.id, first.hakedis.id);
  assert.equal(replay.invoice.id, first.invoice.id);
  assert.equal(db.state.hakedis.length, 1);
  assert.equal(db.state.invoices.length, 1);
  assert.equal(db.state.audits.length, 2);
});

test("ROOM başka tenant sözleşmesinde gelir zinciri yazamaz", async () => {
  const db = buildDb();
  db.agreement.findUnique = async () => ({ ...agreement, roomId: 22 });

  await assert.rejects(
    createRoomIncomeChain({ prisma: db, actor, input }),
    (error) => error?.status === 403 && error?.code === "INCOME_TENANT_SCOPE_REQUIRED",
  );
});

test("tamamlanmış operasyon kanıtı yoksa gelir zinciri açılmaz", async () => {
  const db = buildDb({ shifts: [{ id: 367, status: "APPROVED", startAt: new Date("2026-10-30T03:00:00.000Z"), progress: null }] });

  await assert.rejects(
    createRoomIncomeChain({ prisma: db, actor, input }),
    (error) => error?.status === 409 && error?.code === "INCOME_OPERATION_NOT_COMPLETE",
  );
});

test("gelecekteki DONE vardiya gerçekleşmiş gelir kanıtı değildir", async () => {
  const db = buildDb({
    agreementRecord: {
      ...agreement,
      // Keep the negative fixture deterministically after every supported
      // current demo date; the production rule still compares against now.
      startDate: new Date("2099-11-03T00:00:00.000Z"),
      endDate: new Date("2099-11-09T00:00:00.000Z"),
      weekMask: 2,
    },
    shifts: [{
      id: 368,
      status: "DONE",
      startAt: new Date("2099-11-03T03:00:00.000Z"),
      progress: null,
    }],
  });

  await assert.rejects(
    createRoomIncomeChain({
      prisma: db,
      actor,
      input: {
        ...input,
        periodStart: "2099-11-03",
        periodEnd: "2099-11-09",
        sourceRef: "DEMO-ROOM-209-FUTURE-DONE-NEGATIVE",
        idempotencyKey: "room-209-income-future-20261103-v1",
      },
    }),
    (error) => error?.status === 409 && error?.code === "INCOME_OPERATION_NOT_COMPLETE",
  );

  assert.equal(db.state.hakedis.length, 0);
  assert.equal(db.state.invoices.length, 0);
});

test("açık kullanıcı onayı olmadan gelir yazılmaz", async () => {
  const db = buildDb();

  await assert.rejects(
    createRoomIncomeChain({ prisma: db, actor, input: { ...input, userApproval: false } }),
    (error) => error?.status === 409 && error?.code === "EXPLICIT_CONFIRMATION_REQUIRED",
  );
});

test("aynı sözleşme ve dönemde farklı idempotency ile ikinci gelir kaydı reddedilir", async () => {
  const db = buildDb();
  await createRoomIncomeChain({ prisma: db, actor, input });

  await assert.rejects(
    createRoomIncomeChain({
      prisma: db,
      actor,
      input: { ...input, idempotencyKey: "room-209-income-20261030-v2" },
    }),
    (error) => error?.status === 409 && error?.code === "INCOME_RECORD_ALREADY_EXISTS",
  );
});

test("manuel tutar sözleşme hesabını değiştiremez", async () => {
  const db = buildDb();

  await assert.rejects(
    createRoomIncomeChain({
      prisma: db,
      actor,
      input: { ...input, amountMinor: 9_999_999, idempotencyKey: "room-209-income-manual-mismatch-v1" },
    }),
    (error) => error?.status === 409 && error?.code === "INCOME_AMOUNT_DERIVATION_MISMATCH",
  );
  assert.equal(db.state.hakedis.length, 0);
  assert.equal(db.state.invoices.length, 0);
});

test("kabul edilmiş sözleşme fiyatı yoksa otomatik hakediş yazılmaz", async () => {
  const db = buildDb();
  db.agreement.findUnique = async () => ({ ...agreement, roomOfferAmount: null });

  await assert.rejects(
    createRoomIncomeChain({
      prisma: db,
      actor,
      input: { ...input, idempotencyKey: "room-209-income-missing-price-v1" },
    }),
    (error) => error?.status === 409 && error?.code === "INCOME_PRICE_NOT_PROVEN",
  );
  assert.equal(db.state.hakedis.length, 0);
  assert.equal(db.state.invoices.length, 0);
});

test("sözleşme dışı dönem reddedilir", async () => {
  const db = buildDb();

  await assert.rejects(
    createRoomIncomeChain({
      prisma: db,
      actor,
      input: { ...input, periodStart: "2026-09-01", periodEnd: "2026-09-30" },
    }),
    (error) => error?.status === 409 && error?.code === "INCOME_PERIOD_OUTSIDE_AGREEMENT",
  );
});

test("açık eşit hizmet günü koşulunda gelir zinciri ilk tamamlanan gün için orantılı tutar üretir", async () => {
  const monthlyAgreement = {
    ...agreement,
    id: 301,
    startDate: new Date("2026-10-01T00:00:00.000Z"),
    endDate: new Date("2026-10-30T00:00:00.000Z"),
    weekMask: 127,
    roomOfferAmount: 14_000_000,
    roomOfferNote: "Eşit hizmet günü üzerinden orantılı hakediş",
  };
  const db = buildDb({
    agreementRecord: monthlyAgreement,
    shifts: [{ id: 701, status: "DONE", startAt: new Date("2026-10-01T03:00:00.000Z"), progress: null }],
  });
  const result = await createRoomIncomeChain({
    prisma: db,
    actor,
    input: {
      ...input,
      agreementId: monthlyAgreement.id,
      periodStart: "2026-10-01",
      periodEnd: "2026-10-30",
      sourceRef: "DEMO-PARTIAL-1-OF-30",
      idempotencyKey: "room-301-income-day-01-v1",
    },
  });

  assert.equal(result.hakedis.amountMinor, 466_667);
  assert.equal(result.invoice.amountMinor, 466_667);
  assert.equal(result.calculation.newlyCompletedServiceUnitCount, 1);
  assert.match(db.state.hakedis[0].notes || "", /Hakediş hizmet günleri: 2026-10-01/);
  assert.equal(db.state.hakedis.length, 1);
  assert.equal(db.state.invoices.length, 1);
});

test("orantılı hakediş ikinci işlemde önceki hizmet gününü tekrar saymaz ve toplamı kapatır", async () => {
  const monthlyAgreement = {
    ...agreement,
    id: 302,
    startDate: new Date("2026-10-01T00:00:00.000Z"),
    endDate: new Date("2026-10-30T00:00:00.000Z"),
    weekMask: 127,
    roomOfferAmount: 14_000_000,
    roomOfferNote: "Eşit hizmet günü üzerinden orantılı hakediş",
  };
  const db = buildDb({
    agreementRecord: monthlyAgreement,
    shifts: [{ id: 702, status: "DONE", startAt: new Date("2026-10-01T03:00:00.000Z"), progress: null }],
  });
  const first = await createRoomIncomeChain({
    prisma: db,
    actor,
    input: {
      ...input,
      agreementId: monthlyAgreement.id,
      periodStart: "2026-10-01",
      periodEnd: "2026-10-30",
      sourceRef: "DEMO-PARTIAL-1-OF-30",
      idempotencyKey: "room-302-income-day-01-v1",
    },
  });
  db.state.shifts.push(...Array.from({ length: 29 }, (_, index) => ({
    id: 703 + index,
    status: "DONE",
    startAt: new Date(Date.UTC(2026, 9, 2 + index, 3)),
    progress: null,
  })));
  const second = await createRoomIncomeChain({
    prisma: db,
    actor,
    input: {
      ...input,
      agreementId: monthlyAgreement.id,
      periodStart: "2026-10-01",
      periodEnd: "2026-10-30",
      sourceRef: "DEMO-PARTIAL-2-TO-30",
      idempotencyKey: "room-302-income-day-02-to-30-v2",
    },
  });

  assert.equal(first.hakedis.amountMinor, 466_667);
  assert.equal(second.hakedis.amountMinor, 13_533_333);
  assert.equal(second.calculation.previouslyClaimedServiceUnitCount, 1);
  assert.equal(second.calculation.newlyCompletedServiceUnitCount, 29);
  assert.equal(second.calculation.cumulativeClaimedAmountMinor, 14_000_000);
  assert.equal(db.state.hakedis.reduce((sum, row) => sum + row.amountMinor, 0), 14_000_000);
  assert.equal(db.state.invoices.reduce((sum, row) => sum + row.amountMinor, 0), 14_000_000);
});

test("orantılı sözleşmede eski hakediş hizmet kapsamı taşımıyorsa tekrar hesabı güvenle durur", async () => {
  const monthlyAgreement = {
    ...agreement,
    id: 303,
    startDate: new Date("2026-10-01T00:00:00.000Z"),
    endDate: new Date("2026-10-30T00:00:00.000Z"),
    weekMask: 127,
    roomOfferAmount: 14_000_000,
    roomOfferNote: "Eşit hizmet günü üzerinden orantılı hakediş",
  };
  const db = buildDb({
    agreementRecord: monthlyAgreement,
    existingHakedis: [{ id: 801, agreementId: 303, roomId: 21, status: "FINALIZED", amountMinor: 4_666_667, periodStart: new Date("2026-10-01"), periodEnd: new Date("2026-10-30"), reference: "OLD-H", currencyCode: "TRY", source: "INTERNAL_ACTUAL", notes: "Eski demo hakedişi" }],
    existingInvoices: [{ id: 802, agreementId: 303, roomId: 21, status: "ISSUED", amountMinor: 4_666_667, periodStart: new Date("2026-10-01"), periodEnd: new Date("2026-10-30"), reference: "OLD-I", currencyCode: "TRY", source: "INTERNAL_ACTUAL" }],
    shifts: [{ id: 704, status: "DONE", startAt: new Date("2026-10-01T03:00:00.000Z"), progress: null }],
  });

  await assert.rejects(
    createRoomIncomeChain({
      prisma: db,
      actor,
      input: {
        ...input,
        agreementId: monthlyAgreement.id,
        periodStart: "2026-10-01",
        periodEnd: "2026-10-30",
        sourceRef: "DEMO-PARTIAL-UNKNOWN-HISTORY",
        idempotencyKey: "room-303-income-history-unknown-v1",
      },
    }),
    (error) => error?.status === 409 && error?.code === "INCOME_CLAIM_HISTORY_NOT_PROVEN",
  );
  assert.equal(db.state.hakedis.length, 1);
  assert.equal(db.state.invoices.length, 1);
});
