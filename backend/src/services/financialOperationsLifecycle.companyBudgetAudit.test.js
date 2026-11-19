import test from "node:test";
import assert from "node:assert/strict";
import {
  activateCompanyBudgetPlan,
  approveCompanyBudgetPlan,
  saveCompanyBudgetPlanDraft,
  submitCompanyBudgetPlan,
} from "./financialOperationsLifecycle.js";

function budgetAgreement() {
  return {
    id: 195,
    companyId: 1,
    status: "APPROVED",
    startDate: new Date("2026-09-01T00:00:00.000Z"),
    endDate: new Date("2026-09-30T00:00:00.000Z"),
    companyOfferAmount: 15_000_000,
    room: { id: 1, name: "DemoRoom" },
    _count: { shifts: 1 },
  };
}

function fakePrisma({ existingPlan = null, auditFailure = false } = {}) {
  const auditRows = [];
  const relations = existingPlan?.agreementScopes?.map((item, index) => ({ id: index + 1, agreementId: item.agreementId })) || [];
  let nextRelationId = relations.length + 1;
  let nextPlanId = existingPlan?.id || 90;
  let rolledBack = false;

  const tx = {
    agreement: {
      findMany: async () => [budgetAgreement()],
    },
    user: {
      findUnique: async () => ({ role: "COMPANY" }),
    },
    companyBudgetPlan: {
      findUnique: async () => existingPlan,
      findMany: async () => [],
      create: async ({ data }) => ({
        id: nextPlanId,
        ...data,
        createdAt: new Date("2026-10-29T00:00:00.000Z"),
        updatedAt: new Date("2026-10-29T00:00:00.000Z"),
      }),
      update: async ({ data }) => ({
        ...existingPlan,
        ...data,
        version: Number(existingPlan.version || 1) + 1,
        updatedAt: new Date("2026-10-29T00:00:00.000Z"),
      }),
    },
    companyBudgetPlanAgreement: {
      deleteMany: async () => {
        relations.splice(0, relations.length);
        return { count: 1 };
      },
      createMany: async ({ data }) => {
        for (const item of data) relations.push({ id: nextRelationId++, agreementId: item.agreementId });
        return { count: data.length };
      },
      findMany: async ({ where } = {}) => relations.filter((item) => where?.agreementId?.in?.includes(item.agreementId)),
    },
    auditLog: {
      create: async ({ data }) => {
        if (auditFailure) throw new Error("audit unavailable");
        auditRows.push(data);
        return { id: auditRows.length, ...data };
      },
      findMany: async () => [],
    },
  };

  return {
    auditRows,
    get relations() { return relations; },
    get rolledBack() { return rolledBack; },
    $transaction: async (callback) => {
      try {
        return await callback(tx);
      } catch (error) {
        rolledBack = true;
        throw error;
      }
    },
  };
}

test("canonical budget save writes create and Agreement attachment audit in one transaction", async () => {
  const db = fakePrisma();
  const result = await saveCompanyBudgetPlanDraft({
    prismaClient: db,
    companyId: 1,
    actorUserId: 2,
    payload: {
      currencyCode: "TRY",
      budgetAmountMinor: 15_000_000,
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
      agreementIds: [195],
    },
  });

  assert.equal(result.id, 90);
  assert.deepEqual(db.auditRows.map((row) => row.action), [
    "COMPANY_BUDGET_PLAN_CREATED",
    "COMPANY_BUDGET_PLAN_AGREEMENT_ATTACHED",
  ]);
  assert.equal(db.auditRows[0].entityId, 90);
  assert.equal(db.auditRows[1].meta.agreementId, 195);
  assert.equal(db.auditRows[0].actorRole, "COMPANY");
});

test("aynı kapsamın yeniden kaydında Agreement bağlama audit'i mükerrerleşmez", async () => {
  const db = fakePrisma({
    existingPlan: {
      id: 4,
      companyId: 1,
      status: "DRAFT",
      currencyCode: "TRY",
      budgetAmountMinor: 15_000_000,
      periodStart: new Date("2026-09-01T00:00:00.000Z"),
      periodEnd: new Date("2026-09-30T00:00:00.000Z"),
      version: 2,
      agreementScopes: [{ agreementId: 195 }],
    },
  });

  await saveCompanyBudgetPlanDraft({
    prismaClient: db,
    companyId: 1,
    planId: 4,
    expectedVersion: 2,
    actorUserId: 2,
    actorRole: "COMPANY",
    payload: {
      currencyCode: "TRY",
      budgetAmountMinor: 15_000_000,
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
      agreementIds: [195],
    },
  });

  assert.deepEqual(db.auditRows.map((row) => row.action), ["COMPANY_BUDGET_PLAN_SAVED"]);
  assert.equal(db.auditRows[0].entityId, 4);
  assert.equal(db.auditRows[0].meta.previousVersion, 2);
});

test("taslak bütçe güncellemesi ayrı bir kaydetme audit'i üretir", async () => {
  const db = fakePrisma({
    existingPlan: {
      id: 4,
      companyId: 1,
      status: "DRAFT",
      currencyCode: "TRY",
      budgetAmountMinor: 7_000_000,
      periodStart: new Date("2026-11-20T00:00:00.000Z"),
      periodEnd: new Date("2026-11-26T00:00:00.000Z"),
      version: 1,
      agreementScopes: [],
    },
  });

  await saveCompanyBudgetPlanDraft({
    prismaClient: db,
    companyId: 1,
    planId: 4,
    expectedVersion: 1,
    actorUserId: 2,
    actorRole: "COMPANY",
    payload: {
      currencyCode: "TRY",
      budgetAmountMinor: 8_000_000,
      periodStart: "2026-11-20",
      periodEnd: "2026-11-26",
      description: "DEMO TEST_SIMULATED company bütçe taslağı",
      agreementIds: [],
    },
  });

  assert.equal(db.auditRows.length, 1);
  assert.equal(db.auditRows[0].action, "COMPANY_BUDGET_PLAN_SAVED");
  assert.equal(db.auditRows[0].entityId, 4);
  assert.equal(db.auditRows[0].meta.previousVersion, 1);
  assert.equal(db.auditRows[0].meta.version, 2);
});

test("audit yazma hatası bütçe transaction'ını başarısız bırakır", async () => {
  const db = fakePrisma({ auditFailure: true });

  await assert.rejects(
    () => saveCompanyBudgetPlanDraft({
      prismaClient: db,
      companyId: 1,
      actorUserId: 2,
      actorRole: "COMPANY",
      payload: {
        currencyCode: "TRY",
        budgetAmountMinor: 15_000_000,
        periodStart: "2026-09-01",
        periodEnd: "2026-09-30",
      },
    }),
    /audit unavailable/,
  );

  assert.equal(db.rolledBack, true);
  assert.equal(db.auditRows.length, 0);
});

test("tenant veya dönem kapsamı reddedilince bütçe/audit yazımı başlamaz", async () => {
  const foreignTenantDb = fakePrisma();
  await assert.rejects(
    () => saveCompanyBudgetPlanDraft({
      prismaClient: foreignTenantDb,
      companyId: 2,
      actorUserId: 2,
      payload: {
        budgetAmountMinor: 15_000_000,
        periodStart: "2026-09-01",
        periodEnd: "2026-09-30",
        agreementIds: [195],
      },
    }),
    (error) => error?.code === "COMPANY_BUDGET_SCOPE_UNAUTHORIZED",
  );
  assert.equal(foreignTenantDb.auditRows.length, 0);

  const wrongPeriodDb = fakePrisma();
  await assert.rejects(
    () => saveCompanyBudgetPlanDraft({
      prismaClient: wrongPeriodDb,
      companyId: 1,
      actorUserId: 2,
      payload: {
        budgetAmountMinor: 15_000_000,
        periodStart: "2026-10-01",
        periodEnd: "2026-10-31",
        agreementIds: [195],
      },
    }),
    (error) => error?.code === "COMPANY_BUDGET_SCOPE_INVALID",
  );
  assert.equal(wrongPeriodDb.auditRows.length, 0);
});

function lifecyclePlan(overrides = {}) {
  return {
    id: 1,
    companyId: 1,
    status: "DRAFT",
    budgetApprovalState: "draft",
    currencyCode: "TRY",
    budgetAmountMinor: 7_000_000,
    periodStart: new Date("2026-10-01T00:00:00.000Z"),
    periodEnd: new Date("2026-10-31T00:00:00.000Z"),
    version: 1,
    agreementScopes: [],
    ...overrides,
  };
}

test("bütçe gönderme, onaylama ve aktifleştirme geçişleri ayrı audit üretir", async () => {
  const cases = [
    {
      fn: submitCompanyBudgetPlan,
      plan: lifecyclePlan(),
      action: "COMPANY_BUDGET_PLAN_SUBMITTED",
      nextState: "submitted",
    },
    {
      fn: approveCompanyBudgetPlan,
      plan: lifecyclePlan({ budgetApprovalState: "submitted" }),
      action: "COMPANY_BUDGET_PLAN_APPROVED",
      nextState: "approved",
    },
    {
      fn: activateCompanyBudgetPlan,
      plan: lifecyclePlan({ budgetApprovalState: "approved" }),
      action: "COMPANY_BUDGET_PLAN_ACTIVATED",
      nextState: "approved",
    },
  ];

  for (const item of cases) {
    const db = fakePrisma({ existingPlan: item.plan });
    const result = await item.fn({
      prismaClient: db,
      companyId: 1,
      planId: 1,
      expectedVersion: 1,
      actorUserId: 2,
      actorRole: "COMPANY",
    });

    assert.equal(result.id, 1);
    assert.equal(db.auditRows.length, 1);
    assert.equal(db.auditRows[0].action, item.action);
    assert.equal(db.auditRows[0].actorRole, "COMPANY");
    assert.equal(db.auditRows[0].meta.budgetPlanId, 1);
    assert.equal(db.auditRows[0].meta.previousApprovalState, item.plan.budgetApprovalState);
    assert.equal(db.auditRows[0].meta.approvalState, item.nextState);
  }
});
