import test from "node:test";
import assert from "node:assert/strict";
import {
  COMPANY_BUDGET_AUDIT_ACTIONS,
  newlyAttachedAgreementIds,
  recordCompanyBudgetPlanAgreementAttached,
  recordCompanyBudgetPlanCreated,
} from "./companyBudgetAudit.js";

function auditTransaction(auditRows = []) {
  return {
    auditLog: {
      create: async ({ data }) => {
        auditRows.push(data);
        return { id: auditRows.length, ...data };
      },
    },
  };
}

test("bütçe oluşturma ve yeni Agreement bağlama canonical AuditLog olayları üretir", async () => {
  const auditRows = [];
  const tx = auditTransaction(auditRows);
  const plan = {
    id: 4,
    companyId: 1,
    status: "DRAFT",
    currencyCode: "TRY",
    budgetAmountMinor: 15_000_000,
    periodStart: new Date("2026-09-01T00:00:00.000Z"),
    periodEnd: new Date("2026-09-30T00:00:00.000Z"),
    version: 1,
  };

  await recordCompanyBudgetPlanCreated(tx, {
    actorUserId: 2,
    actorRole: "COMPANY",
    plan,
    agreementIds: [],
  });
  await recordCompanyBudgetPlanAgreementAttached(tx, {
    actorUserId: 2,
    actorRole: "COMPANY",
    plan,
    relation: { id: 10, agreementId: 195 },
  });

  assert.deepEqual(auditRows.map((row) => row.action), [
    COMPANY_BUDGET_AUDIT_ACTIONS.CREATED,
    COMPANY_BUDGET_AUDIT_ACTIONS.AGREEMENT_ATTACHED,
  ]);
  assert.deepEqual(auditRows.map((row) => row.entity), ["CompanyBudgetPlan", "CompanyBudgetPlanAgreement"]);
  assert.equal(auditRows[0].actorUserId, 2);
  assert.equal(auditRows[0].actorRole, "COMPANY");
  assert.equal(auditRows[0].meta.companyId, 1);
  assert.equal(auditRows[1].entityId, 10);
  assert.equal(auditRows[1].meta.agreementId, 195);
  assert.equal(auditRows[1].meta.budgetPlanId, 4);
  assert.equal(auditRows[1].meta.budgetAmountMinor, undefined);
});

test("aynı Agreement aynı bütçe kapsamına tekrar gönderildiğinde yeni bağlama olayı üretmez", () => {
  assert.deepEqual(newlyAttachedAgreementIds([195], [195]), []);
  assert.deepEqual(newlyAttachedAgreementIds([], [195, 195]), [195]);
  assert.deepEqual(newlyAttachedAgreementIds([195], [195, 207]), [207]);
});

test("AuditLog yazılamıyorsa işlem başarısız olur ve transaction geri alabilir", async () => {
  const tx = { auditLog: { create: async () => { throw new Error("database unavailable"); } } };

  await assert.rejects(
    () => recordCompanyBudgetPlanCreated(tx, {
      actorUserId: 2,
      actorRole: "COMPANY",
      plan: { id: 4, companyId: 1, status: "DRAFT", currencyCode: "TRY", budgetAmountMinor: 1, version: 1 },
      agreementIds: [],
    }),
    /database unavailable/,
  );

  await assert.rejects(
    () => recordCompanyBudgetPlanCreated({}, {
      actorUserId: 2,
      actorRole: "COMPANY",
      plan: { id: 4, companyId: 1 },
      agreementIds: [],
    }),
    (error) => error?.code === "AUDIT_REQUIRED",
  );
});
