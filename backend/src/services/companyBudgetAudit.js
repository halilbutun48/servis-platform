const COMPANY_BUDGET_AUDIT_ACTIONS = Object.freeze({
  CREATED: "COMPANY_BUDGET_PLAN_CREATED",
  SAVED: "COMPANY_BUDGET_PLAN_SAVED",
  AGREEMENT_ATTACHED: "COMPANY_BUDGET_PLAN_AGREEMENT_ATTACHED",
  SUBMITTED: "COMPANY_BUDGET_PLAN_SUBMITTED",
  APPROVED: "COMPANY_BUDGET_PLAN_APPROVED",
  ACTIVATED: "COMPANY_BUDGET_PLAN_ACTIVATED",
  ARCHIVED: "COMPANY_BUDGET_PLAN_ARCHIVED",
});

function positiveId(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function dateOnly(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function normalizeIds(values) {
  const seen = new Set();
  const result = [];
  for (const value of Array.isArray(values) ? values : []) {
    const id = positiveId(value);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

export function newlyAttachedAgreementIds(currentAgreementIds = [], selectedAgreementIds = []) {
  const current = new Set(normalizeIds(currentAgreementIds));
  return normalizeIds(selectedAgreementIds).filter((agreementId) => !current.has(agreementId));
}

async function writeCompanyBudgetAudit(tx, { actorUserId, actorRole, action, entity, entityId = null, meta = {} }) {
  if (!tx?.auditLog?.create) {
    const error = new Error("Company budget audit is required for this transaction.");
    error.code = "AUDIT_REQUIRED";
    throw error;
  }

  return tx.auditLog.create({
    data: {
      actorUserId: positiveId(actorUserId),
      actorRole: String(actorRole || "").trim().toUpperCase() || null,
      action,
      entity,
      entityId: positiveId(entityId),
      meta,
    },
  });
}

export async function recordCompanyBudgetPlanCreated(tx, { actorUserId = null, actorRole = null, plan, agreementIds = [] }) {
  return writeCompanyBudgetAudit(tx, {
    actorUserId,
    actorRole,
    action: COMPANY_BUDGET_AUDIT_ACTIONS.CREATED,
    entity: "CompanyBudgetPlan",
    entityId: plan?.id,
    meta: {
      companyId: positiveId(plan?.companyId),
      budgetPlanId: positiveId(plan?.id),
      status: plan?.status || null,
      currencyCode: plan?.currencyCode || null,
      budgetAmountMinor: plan?.budgetAmountMinor ?? null,
      periodStart: dateOnly(plan?.periodStart),
      periodEnd: dateOnly(plan?.periodEnd),
      version: plan?.version ?? null,
      agreementIds: normalizeIds(agreementIds),
    },
  });
}

export async function recordCompanyBudgetPlanAgreementAttached(tx, { actorUserId = null, actorRole = null, plan, relation }) {
  return writeCompanyBudgetAudit(tx, {
    actorUserId,
    actorRole,
    action: COMPANY_BUDGET_AUDIT_ACTIONS.AGREEMENT_ATTACHED,
    entity: "CompanyBudgetPlanAgreement",
    entityId: relation?.id,
    meta: {
      companyId: positiveId(plan?.companyId),
      budgetPlanId: positiveId(plan?.id),
      agreementId: positiveId(relation?.agreementId),
      periodStart: dateOnly(plan?.periodStart),
      periodEnd: dateOnly(plan?.periodEnd),
      idempotent: false,
    },
  });
}

export async function recordCompanyBudgetPlanLifecycle(
  tx,
  {
    actorUserId = null,
    actorRole = null,
    action,
    plan,
    previous = null,
  },
) {
  if (!Object.values(COMPANY_BUDGET_AUDIT_ACTIONS).includes(action)) {
    throw new Error(`Unsupported company budget lifecycle audit action: ${action}`);
  }

  return writeCompanyBudgetAudit(tx, {
    actorUserId,
    actorRole,
    action,
    entity: "CompanyBudgetPlan",
    entityId: plan?.id,
    meta: {
      companyId: positiveId(plan?.companyId),
      budgetPlanId: positiveId(plan?.id),
      previousStatus: previous?.status || null,
      previousApprovalState: previous?.budgetApprovalState || null,
      previousVersion: previous?.version ?? null,
      status: plan?.status || null,
      approvalState: plan?.budgetApprovalState || null,
      currencyCode: plan?.currencyCode || null,
      budgetAmountMinor: plan?.budgetAmountMinor ?? null,
      periodStart: dateOnly(plan?.periodStart),
      periodEnd: dateOnly(plan?.periodEnd),
      version: plan?.version ?? null,
    },
  });
}

export { COMPANY_BUDGET_AUDIT_ACTIONS };
