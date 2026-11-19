import { createHash } from "node:crypto";
import { prisma } from "../prisma.js";
import { httpError } from "../errors/http.js";
import { buildAgreementReconciliationPreview, calculateRoomHakedisPreview, extractClaimedServiceDates, serializeClaimedServiceDates } from "../finance/hakedisInvoiceReconciliation.js";
import { TEST_SIMULATED_DATA_CLASS, TEST_SIMULATED_SERVICE_ACTION } from "./roomTestSimulatedService.js";
import { confirmedEffectiveAmount } from "./invoiceCollectionLedger.js";
import {
  buildCompanyBudgetScopeRelations,
  buildCompanyBudgetScopeView,
  enrichAgreementCommercialEvidence,
  listCompanyBudgetScopeAgreements,
  normalizeAgreementIdList,
  validateCompanyBudgetScopeSelection,
} from "./companyBudgetScope.js";
import {
  newlyAttachedAgreementIds,
  COMPANY_BUDGET_AUDIT_ACTIONS,
  recordCompanyBudgetPlanAgreementAttached,
  recordCompanyBudgetPlanCreated,
  recordCompanyBudgetPlanLifecycle,
} from "./companyBudgetAudit.js";

function compactText(value, fallback = "") {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text || String(fallback || "").trim();
}

function normalizeLower(value, fallback = "") {
  const text = compactText(value, fallback).toLowerCase();
  return text || fallback;
}

function normalizeUpper(value, fallback = "") {
  const text = compactText(value, fallback).toUpperCase();
  return text || fallback;
}

export function selectCompanyBudgetPlanForPreview(overview, requestedPlanId) {
  const items = Array.isArray(overview?.items) ? overview.items : [];
  const planId = Number(requestedPlanId);
  if (Number.isSafeInteger(planId) && planId > 0) {
    const selected = items.find((item) => Number(item?.id) === planId);
    if (selected) return selected;
  }
  return overview?.current || null;
}

function safeMinorOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : null;
}

export function buildCompanyBudgetAgreementEvidenceRecord({ companyId, agreement = null, reconciliation = null, paymentRows = [] } = {}) {
  if (!agreement || Number(agreement.companyId) !== Number(companyId)) {
    return {
      status: "TENANT_MISMATCH",
      hakedisCount: 0,
      invoiceCount: 0,
      paymentCount: 0,
      reconciliation: null,
      payment: { status: "UNAVAILABLE", amountMinor: null, currencyCode: null, recordCount: 0, reason: "Bu kayıt bu firmaya ait değil." },
    };
  }

  const invoice = reconciliation?.invoice?.exists === true ? reconciliation.invoice : null;
  const invoiceId = Number(invoice?.id || 0);
  const invoiceCurrency = String(invoice?.currencyCode || "").toUpperCase();
  const scopedRows = (Array.isArray(paymentRows) ? paymentRows : []).filter((row) =>
    Number(row?.companyId) === Number(companyId)
    && Number(row?.roomId) === Number(agreement.roomId)
    && Number(row?.invoiceId) === invoiceId
    && String(row?.status || "").toUpperCase() !== "CANCELLED"
    && ["COLLECTION", "REVERSAL"].includes(String(row?.direction || "COLLECTION").toUpperCase()),
  );
  const confirmedRows = scopedRows.filter((row) => String(row?.status || "").toUpperCase() === "CONFIRMED");
  const collectionDates = [...new Set(confirmedRows
    .filter((row) => String(row?.direction || "COLLECTION").toUpperCase() === "COLLECTION")
    .map((row) => toDateOnlyIso(row?.collectedAt))
    .filter(Boolean))].sort();
  let payment = {
    status: "UNAVAILABLE",
    amountMinor: null,
    currencyCode: invoiceCurrency || null,
    recordCount: confirmedRows.filter((row) => String(row?.direction || "COLLECTION").toUpperCase() === "COLLECTION").length,
    collectionDates,
    reason: invoice ? "Doğrulanmış tahsilat kaydı yok." : "Fatura kaydı yok.",
  };
  if (invoice && confirmedRows.length) {
    try {
      const collectedAmountMinor = confirmedEffectiveAmount(confirmedRows, invoiceCurrency);
      const invoiceAmountMinor = safeMinorOrNull(invoice.amountMinor);
      if (collectedAmountMinor < 0 || invoiceAmountMinor === null || collectedAmountMinor > invoiceAmountMinor) {
        payment = { ...payment, status: "RECONCILIATION_MISMATCH", reason: "Tahsilat toplamı fatura tutarıyla mutabık değil." };
      } else {
        payment = { ...payment, status: "AVAILABLE", amountMinor: collectedAmountMinor, reason: null };
      }
    } catch (_error) {
      payment = { ...payment, status: "RECONCILIATION_MISMATCH", reason: "Tahsilat para birimi veya tutarı doğrulanamadı." };
    }
  }

  return {
    status: String(reconciliation?.status || "EVIDENCE_MISSING").toUpperCase(),
    hakedisCount: reconciliation?.hakedisPreview?.exists === true ? 1 : 0,
    invoiceCount: invoice ? 1 : 0,
    paymentCount: payment.recordCount,
    reconciliation: reconciliation || null,
    payment,
  };
}

export function buildCompanyHistoricalFinancialEvidence({ companyId, agreement = null, evidence = null } = {}) {
  if (!agreement || Number(agreement.companyId) !== Number(companyId)) return null;
  if (String(evidence?.status || "").toUpperCase() !== "MATCHED") return null;

  const reconciliation = evidence?.reconciliation;
  if (String(reconciliation?.status || "").toUpperCase() !== "MATCHED") return null;

  const hakedis = reconciliation?.hakedisPreview;
  const invoice = reconciliation?.invoice;
  const serviceEvidence = reconciliation?.evidence?.operations;
  const period = reconciliation?.period;
  const companyContractAmountMinor = safeMinorOrNull(agreement.commercialAmountMinor);
  const companyContractAmountSource = companyContractAmountMinor === null
    ? null
    : agreement.commercialPriceSource || "CANONICAL_ACCEPTED_PRICE";
  const companyContractCurrencyCode = normalizeUpper(
    agreement.currencyCode || reconciliation?.expectedAmount?.currencyCode || invoice?.currencyCode,
    "TRY",
  );
  if (
    hakedis?.exists !== true
    || invoice?.exists !== true
    || !period?.start
    || !period?.end
    || !serviceEvidence
    || Number(serviceEvidence.completedCount || 0) < 1
    || companyContractAmountMinor === null
  ) {
    return null;
  }

  return {
    agreementId: Number(agreement.id),
    agreementStatus: normalizeUpper(agreement.status, "UNKNOWN"),
    companyContractAmountMinor,
    companyContractAmountSource,
    companyContractCurrencyCode,
    period: { start: toDateOnlyIso(period.start), end: toDateOnlyIso(period.end) },
    serviceEvidence: {
      eligibleCount: Number(serviceEvidence.eligibleCount || 0),
      completedCount: Number(serviceEvidence.completedCount || 0),
      shiftIds: Array.isArray(serviceEvidence.shiftIds) ? serviceEvidence.shiftIds.map((id) => String(id)) : [],
    },
    hakedis: {
      id: Number(hakedis.id),
      amountMinor: safeMinorOrNull(hakedis.amountMinor),
      currencyCode: normalizeUpper(hakedis.currencyCode, "TRY"),
      status: normalizeUpper(hakedis.status, "UNKNOWN"),
      periodStart: toDateOnlyIso(reconciliation?.evidence?.hakedis?.periodStart || period.start),
      periodEnd: toDateOnlyIso(reconciliation?.evidence?.hakedis?.periodEnd || period.end),
    },
    invoice: {
      id: Number(invoice.id),
      amountMinor: safeMinorOrNull(invoice.amountMinor),
      currencyCode: normalizeUpper(invoice.currencyCode, "TRY"),
      status: normalizeUpper(invoice.status, "UNKNOWN"),
      periodStart: toDateOnlyIso(reconciliation?.evidence?.invoice?.periodStart || period.start),
      periodEnd: toDateOnlyIso(reconciliation?.evidence?.invoice?.periodEnd || period.end),
    },
    payment: {
      status: normalizeUpper(evidence?.payment?.status, "UNAVAILABLE"),
      amountMinor: safeMinorOrNull(evidence?.payment?.amountMinor),
      currencyCode: normalizeUpper(evidence?.payment?.currencyCode || invoice.currencyCode, "TRY"),
      recordCount: Number(evidence?.payment?.recordCount || 0),
      collectionDates: Array.isArray(evidence?.payment?.collectionDates)
        ? evidence.payment.collectionDates.map((value) => toDateOnlyIso(value)).filter(Boolean)
        : [],
    },
    confidence: normalizeUpper(reconciliation.confidence, "UNKNOWN"),
    source: "CANONICAL_RECONCILIATION",
  };
}

export async function getCompanyHistoricalFinancialEvidence(companyId, agreementRows = []) {
  const rawCandidates = (Array.isArray(agreementRows) ? agreementRows : [])
    .filter((agreement) => Number(agreement?.companyId) === Number(companyId) && Number(agreement?.id) > 0);
  if (!rawCandidates.length) return [];

  const candidates = await enrichAgreementCommercialEvidence(prisma, rawCandidates);

  const evidenceByAgreementId = await getCompanyBudgetAgreementEvidence(
    companyId,
    candidates.map((agreement) => Number(agreement.id)),
  );

  return candidates
    .map((agreement) => buildCompanyHistoricalFinancialEvidence({
      companyId,
      agreement,
      evidence: evidenceByAgreementId[String(agreement.id)],
    }))
    .filter(Boolean);
}

function parseBpsStrict(value, field) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    throw httpError(400, "INVALID_NUMERIC_INPUT", `${field} must be an integer.`);
  }
  const parsed = Math.trunc(n);
  if (parsed < 0 || parsed > 10000) {
    throw httpError(400, "INVALID_NUMERIC_INPUT", `${field} must be between 0 and 10000.`);
  }
  return parsed;
}

function parseMinorStrict(value, field) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    throw httpError(400, "INVALID_NUMERIC_INPUT", `${field} must be an integer.`);
  }
  const parsed = Math.trunc(n);
  if (parsed < 0) {
    throw httpError(400, "INVALID_NUMERIC_INPUT", `${field} cannot be negative.`);
  }
  return parsed;
}

function normalizeYmd(value) {
  const text = compactText(value, "");
  if (!text) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return "";
  const dt = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(dt.getTime()) ? "" : text;
}

function ymdToDate(value) {
  const ymd = normalizeYmd(value);
  if (!ymd) return null;
  return new Date(`${ymd}T00:00:00.000Z`);
}

function toIso(value) {
  if (!value) return null;
  const dt = value instanceof Date ? value : new Date(value);
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
}

function toDateOnlyIso(value) {
  const iso = toIso(value);
  return iso ? iso.slice(0, 10) : null;
}

function buildOverlapLabel(startIso, endIso) {
  if (!startIso && !endIso) return "-";
  if (startIso && endIso) return `${startIso} - ${endIso}`;
  return startIso || endIso || "-";
}

function periodsOverlap(startA, endA, startB, endB) {
  if (!startA || !endA || !startB || !endB) return false;
  return startA.getTime() <= endB.getTime() && startB.getTime() <= endA.getTime();
}

function normalizeCompanyBudgetPlan(row) {
  if (!row) return null;
  const status = normalizeUpper(row.status, "DRAFT");
  const budgetApprovalState = normalizeLower(row.budgetApprovalState, status === "ACTIVE" ? "approved" : "draft");
  const periodStart = toDateOnlyIso(row.periodStart);
  const periodEnd = toDateOnlyIso(row.periodEnd);

  const agreementIds = Array.isArray(row.agreementScopes)
    ? normalizeAgreementIdList(row.agreementScopes.map((item) => item?.agreementId))
    : [];

  return {
    id: Number(row.id || 0) || null,
    companyId: Number(row.companyId || 0) || null,
    status,
    budgetApprovalState,
    lifecycleState: budgetApprovalState,
    currencyCode: normalizeUpper(row.currencyCode, "TRY"),
    budgetAmountMinor: row.budgetAmountMinor === null || row.budgetAmountMinor === undefined ? null : Number(row.budgetAmountMinor),
    periodStart,
    periodEnd,
    periodLabel: periodStart && periodEnd ? `${periodStart} - ${periodEnd}` : buildOverlapLabel(periodStart, periodEnd),
    budgetSource: compactText(row.budgetSource, "") || null,
    description: compactText(row.description, "") || null,
    warningThresholdBps: row.warningThresholdBps === null || row.warningThresholdBps === undefined ? null : Number(row.warningThresholdBps),
    version: Number(row.version || 1) || 1,
    createdByUserId: row.createdByUserId ?? null,
    updatedByUserId: row.updatedByUserId ?? null,
    activatedByUserId: row.activatedByUserId ?? null,
    activatedAt: toIso(row.activatedAt),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
    inputSnapshot: row.inputSnapshot ?? null,
    isDraft: status === "DRAFT",
    isActive: status === "ACTIVE",
    isArchived: status === "ARCHIVED",
    isEditable: status === "DRAFT",
    isSubmitted: budgetApprovalState === "submitted",
    isApproved: budgetApprovalState === "approved",
    isActivated: status === "ACTIVE",
    agreementIds,
    scope: row.scope || null,
  };
}

function normalizeRoomQuoteFloorDraft(row) {
  if (!row) return null;
  const status = normalizeUpper(row.status, "DRAFT");
  return {
    id: Number(row.id || 0) || null,
    roomId: Number(row.roomId || 0) || null,
    status,
    lifecycleState: status.toLowerCase(),
    currencyCode: normalizeUpper(row.currencyCode, "TRY"),
    manualBaselineOperationalCostMinor: row.manualBaselineOperationalCostMinor === null || row.manualBaselineOperationalCostMinor === undefined ? null : Number(row.manualBaselineOperationalCostMinor),
    targetContributionBps: row.targetContributionBps === null || row.targetContributionBps === undefined ? null : Number(row.targetContributionBps),
    riskReserveBps: row.riskReserveBps === null || row.riskReserveBps === undefined ? null : Number(row.riskReserveBps),
    quoteFloorMinor: row.quoteFloorMinor === null || row.quoteFloorMinor === undefined ? null : Number(row.quoteFloorMinor),
    quoteFloorPerPassengerMinor: row.quoteFloorPerPassengerMinor === null || row.quoteFloorPerPassengerMinor === undefined ? null : Number(row.quoteFloorPerPassengerMinor),
    baselineSource: compactText(row.baselineSource, "") || null,
    calculationVersion: compactText(row.calculationVersion, "") || null,
    version: Number(row.version || 1) || 1,
    createdByUserId: row.createdByUserId ?? null,
    updatedByUserId: row.updatedByUserId ?? null,
    appliedByUserId: row.appliedByUserId ?? null,
    appliedShiftOfferId: row.appliedShiftOfferId ?? null,
    appliedAt: toIso(row.appliedAt),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
    inputSnapshot: row.inputSnapshot ?? null,
    isDraft: status === "DRAFT",
    isApplied: status === "APPLIED",
    isArchived: status === "ARCHIVED",
    isEditable: status === "DRAFT",
  };
}

const ROOM_QUOTE_PLANNING_INPUT_FIELDS = Object.freeze([
  "emptyDistanceKm",
  "fuelType",
  "fuelConsumptionLitersPer100Km",
  "fuelUnitPriceMinor",
  "driverBasePerShiftMinor",
  "driverCompensationMode",
  "maintenancePerKmMinor",
  "vehicleLeaseMonthlyMinor",
  "fixedVehicleCostMonthlyMinor",
  "vehicleFixedCostAllocationMode",
  "allocationServiceDaysPerMonth",
]);

export function buildRoomQuoteFloorDraftScopeHash(context = {}) {
  const canonical = {
    roomId: positiveId(context.roomId),
    agreementId: positiveId(context.agreementId),
    sourceShiftId: positiveId(context.sourceShiftId),
    periodStart: normalizeYmd(context.periodStart) || null,
    periodEnd: normalizeYmd(context.periodEnd) || null,
    agreementUpdatedAt: toIso(context.agreementUpdatedAt) || null,
    sourceShiftUpdatedAt: toIso(context.sourceShiftUpdatedAt) || null,
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

function buildCompanyBudgetPlanInputSnapshot({ action, companyId, actorUserId, payload = {}, computed = {}, previous = null }) {
  return {
    kind: "CompanyBudgetPlan",
    action,
    companyId: Number(companyId || 0) || null,
    actorUserId: Number(actorUserId || 0) || null,
    previousVersion: previous?.version ?? null,
    previousStatus: previous?.status ?? null,
    previousApprovalState: previous?.budgetApprovalState ?? null,
    payload,
    computed,
  };
}

function buildRoomQuoteFloorDraftInputSnapshot({ action, roomId, actorUserId, payload = {}, computed = {}, previous = null, context = null }) {
  return {
    kind: "RoomQuoteFloorDraft",
    action,
    roomId: Number(roomId || 0) || null,
    actorUserId: Number(actorUserId || 0) || null,
    serviceContext: context || null,
    previousVersion: previous?.version ?? null,
    previousStatus: previous?.status ?? null,
    payload,
    computed,
  };
}

function normalizeCompanyBudgetPlanPayload(payload = {}) {
  const warningThresholdBps = parseBpsStrict(payload.warningThresholdBps, "warningThresholdBps");
  const hasAgreementIds = Object.prototype.hasOwnProperty.call(payload, "agreementIds");
  return {
    currencyCode: normalizeUpper(payload.currencyCode, "TRY"),
    budgetAmountMinor: parseMinorStrict(payload.budgetAmountMinor, "budgetAmountMinor"),
    periodStart: normalizeYmd(payload.periodStart),
    periodEnd: normalizeYmd(payload.periodEnd),
    budgetSource: compactText(payload.budgetSource, "") || null,
    description: compactText(payload.description, "") || null,
    warningThresholdBps,
    budgetApprovalState: normalizeLower(payload.budgetApprovalState, "draft"),
    agreementIds: hasAgreementIds ? normalizeAgreementIdList(payload.agreementIds) : null,
  };
}

function normalizeRoomQuoteFloorDraftPayload(payload = {}) {
  const targetContributionBps = parseBpsStrict(payload.targetContributionBps, "targetContributionBps");
  const riskReserveBps = parseBpsStrict(payload.riskReserveBps, "riskReserveBps");
  const quoteFloorMinor = parseMinorStrict(payload.quoteFloorMinor, "quoteFloorMinor");
  const quoteFloorPerPassengerMinor = parseMinorStrict(payload.quoteFloorPerPassengerMinor, "quoteFloorPerPassengerMinor");
  return {
    currencyCode: normalizeUpper(payload.currencyCode, "TRY"),
    manualBaselineOperationalCostMinor: parseMinorStrict(payload.manualBaselineOperationalCostMinor, "manualBaselineOperationalCostMinor"),
    targetContributionBps,
    riskReserveBps,
    quoteFloorMinor,
    quoteFloorPerPassengerMinor,
    baselineSource: compactText(payload.baselineSource, "") || null,
    calculationVersion: compactText(payload.calculationVersion, "") || "ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01",
  };
}

function ensureBudgetPlanPeriod(payload) {
  const periodStart = payload.periodStart ? ymdToDate(payload.periodStart) : null;
  const periodEnd = payload.periodEnd ? ymdToDate(payload.periodEnd) : null;

  if (payload.periodStart && !periodStart) {
    throw httpError(400, "COMPANY_BUDGET_PLAN_INVALID_PERIOD", "Budget periodStart invalid.");
  }
  if (payload.periodEnd && !periodEnd) {
    throw httpError(400, "COMPANY_BUDGET_PLAN_INVALID_PERIOD", "Budget periodEnd invalid.");
  }
  if (periodStart && periodEnd && periodStart.getTime() > periodEnd.getTime()) {
    throw httpError(409, "COMPANY_BUDGET_PLAN_INVALID_PERIOD", "Budget periodStart cannot be after periodEnd.");
  }

  return {
    periodStart,
    periodEnd,
  };
}

function requireBudgetPlanEditable(plan) {
  if (!plan) {
    throw httpError(404, "COMPANY_BUDGET_PLAN_NOT_FOUND", "Budget plan not found.");
  }
  if (plan.status !== "DRAFT") {
    throw httpError(409, "COMPANY_BUDGET_PLAN_LOCKED", "Only draft budget plans can be edited.");
  }
}

function requireRoomDraftEditable(draft) {
  if (!draft) {
    throw httpError(404, "ROOM_QUOTE_FLOOR_DRAFT_NOT_FOUND", "Quote floor draft not found.");
  }
  if (draft.status !== "DRAFT") {
    throw httpError(409, "ROOM_QUOTE_FLOOR_DRAFT_LOCKED", "Only draft quote floor items can be edited.");
  }
}

async function assertBudgetPlanOverlap(tx, { companyId, planId, periodStart, periodEnd }) {
  if (!periodStart || !periodEnd) return;

  const activePlans = await tx.companyBudgetPlan.findMany({
    where: {
      companyId,
      status: "ACTIVE",
      id: {
        not: planId || 0,
      },
    },
    select: {
      id: true,
      periodStart: true,
      periodEnd: true,
    },
  });

  for (const other of activePlans) {
    if (periodsOverlap(periodStart, periodEnd, other.periodStart, other.periodEnd)) {
      throw httpError(409, "COMPANY_BUDGET_PLAN_OVERLAP", `Budget period overlaps active plan #${other.id}.`);
    }
  }
}

async function assertNoDuplicateRoomDraftApply(tx, { roomId, appliedShiftOfferId, draftId }) {
  if (!appliedShiftOfferId) return;
  const existing = await tx.roomQuoteFloorDraft.findFirst({
    where: {
      roomId,
      appliedShiftOfferId,
      status: "APPLIED",
      id: {
        not: draftId || 0,
      },
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    throw httpError(409, "ROOM_QUOTE_FLOOR_DRAFT_APPLIED_CONFLICT", `Shift offer #${appliedShiftOfferId} already has an applied quote floor draft.`);
  }
}

export async function getCompanyBudgetPlanOverview(companyId) {
  const companyBudgetPlans = await prisma.companyBudgetPlan.findMany({
    where: {
      companyId,
    },
    orderBy: [
      {
        updatedAt: "desc",
      },
      {
        id: "desc",
      },
    ],
    take: 10,
    include: {
      agreementScopes: {
        orderBy: { id: "asc" },
        select: {
          agreementId: true,
          createdAt: true,
          createdByUserId: true,
        },
      },
    },
  });

  const companyAgreements = companyBudgetPlans.length
    ? await listCompanyBudgetScopeAgreements(prisma, companyId)
    : [];
  const normalized = companyBudgetPlans.map((row) => {
    const item = normalizeCompanyBudgetPlan(row);
    const scope = buildCompanyBudgetScopeView({
      companyId,
      periodStart: item.periodStart,
      periodEnd: item.periodEnd,
      agreements: companyAgreements,
      selectedAgreementIds: item.agreementIds,
    });
    return {
      ...item,
      agreementIds: scope.selectedAgreementIds,
      scope,
    };
  });
  const current = normalized.find((item) => item?.status === "DRAFT") || normalized.find((item) => item?.status === "ACTIVE") || normalized[0] || null;
  const active = normalized.find((item) => item?.status === "ACTIVE") || null;
  const draft = normalized.find((item) => item?.status === "DRAFT") || null;

  return {
    current,
    active,
    draft,
    items: normalized,
  };
}

export async function getCurrentCompanyBudgetPlan(companyId) {
  const overview = await getCompanyBudgetPlanOverview(companyId);
  return overview.current;
}

export function buildCompanyBudgetPlanPreviewInputs(plan = null) {
  if (!plan) return {};

  const budgetApprovalState = normalizeLower(plan.budgetApprovalState, plan.status === "ACTIVE" ? "approved" : "draft");
  const budgetAmountMinor = plan.budgetAmountMinor === null || plan.budgetAmountMinor === undefined ? null : Number(plan.budgetAmountMinor);
  const approvedBudgetAmountMinor = plan.status === "ACTIVE" || budgetApprovalState === "approved" ? budgetAmountMinor : null;

  return {
    currencyCode: normalizeUpper(plan.currencyCode, "TRY"),
    budgetAmountMinor,
    budgetSource: compactText(plan.budgetSource, "") || (plan.status === "ACTIVE" ? "approved_budget" : "draft_budget"),
    budgetApprovalState,
    approvedBudgetAmountMinor,
    revisedBudgetAmountMinor: budgetApprovalState === "approved" ? budgetAmountMinor : null,
    periodStart: plan.periodStart || null,
    periodEnd: plan.periodEnd || null,
    description: plan.description || null,
    warningThresholdBps: plan.warningThresholdBps,
  };
}

export async function getCompanyBudgetAgreementEvidence(companyId, agreementIds = []) {
  const ids = normalizeAgreementIdList(agreementIds);
  if (!ids.length) return {};

  const agreements = await prisma.agreement.findMany({
    where: { id: { in: ids } },
    select: { id: true, companyId: true, roomId: true },
  });
  const agreementById = new Map(agreements.map((agreement) => [Number(agreement.id), agreement]));
  const previews = await Promise.all(ids.map(async (agreementId) => {
    const agreement = agreementById.get(agreementId);
    if (!agreement || Number(agreement.companyId) !== Number(companyId)) {
      return { agreementId, agreement, reconciliation: null };
    }
    const result = await buildAgreementReconciliationPreview({ agreementId });
    return { agreementId, agreement, reconciliation: result?.data || null };
  }));

  const hakedisIds = previews
    .map((item) => Number(item.reconciliation?.hakedisPreview?.id || 0))
    .filter((id) => Number.isSafeInteger(id) && id > 0);
  const invoiceIds = previews
    .map((item) => Number(item.reconciliation?.invoice?.id || 0))
    .filter((id) => Number.isSafeInteger(id) && id > 0);
  const [hakedisRows, invoiceRows, paymentRows] = await Promise.all([
    hakedisIds.length
      ? prisma.hakedisRecord.findMany({ where: { id: { in: hakedisIds } }, select: { id: true, agreementId: true, companyId: true, roomId: true } })
      : [],
    invoiceIds.length
      ? prisma.invoiceRecord.findMany({ where: { id: { in: invoiceIds } }, select: { id: true, agreementId: true, companyId: true, roomId: true } })
      : [],
    invoiceIds.length
      ? prisma.invoiceCollection.findMany({
        where: { companyId: Number(companyId), invoiceId: { in: invoiceIds }, status: { not: "CANCELLED" } },
        select: { id: true, invoiceId: true, companyId: true, roomId: true, amountMinor: true, currencyCode: true, status: true, direction: true, collectedAt: true },
      })
      : [],
  ]);
  const hakedisById = new Map(hakedisRows.map((row) => [Number(row.id), row]));
  const invoiceById = new Map(invoiceRows.map((row) => [Number(row.id), row]));

  const result = {};
  for (const item of previews) {
    const agreementId = item.agreementId;
    const agreement = item.agreement;
    if (!agreement || Number(agreement.companyId) !== Number(companyId)) {
      result[String(agreementId)] = buildCompanyBudgetAgreementEvidenceRecord({ companyId, agreement: null, reconciliation: null, paymentRows: [] });
      continue;
    }
    const reconciliation = item.reconciliation;
    const hakedisId = Number(reconciliation?.hakedisPreview?.id || 0);
    const invoiceId = Number(reconciliation?.invoice?.id || 0);
    const hakedis = hakedisById.get(hakedisId);
    const invoice = invoiceById.get(invoiceId);
    const foreignEvidence = (hakedis && (Number(hakedis.companyId) !== Number(companyId) || Number(hakedis.roomId) !== Number(agreement.roomId)))
      || (invoice && (Number(invoice.companyId) !== Number(companyId) || Number(invoice.roomId) !== Number(agreement.roomId)));
    if (foreignEvidence) {
      result[String(agreementId)] = {
        status: "TENANT_MISMATCH",
        hakedisCount: 0,
        invoiceCount: 0,
        paymentCount: 0,
        reconciliation: null,
        payment: { status: "UNAVAILABLE", amountMinor: null, currencyCode: null, recordCount: 0, reason: "Finansal kanıt bu firma kapsamına ait değil." },
      };
      continue;
    }
    result[String(agreementId)] = buildCompanyBudgetAgreementEvidenceRecord({
      companyId,
      agreement,
      reconciliation,
      paymentRows: paymentRows.filter((row) => Number(row.invoiceId) === invoiceId),
    });
  }
  return result;
}

export async function saveCompanyBudgetPlanDraft({ companyId, actorUserId = null, actorRole = null, planId = null, expectedVersion = null, payload = {}, prismaClient = prisma }) {
  const normalizedPayload = normalizeCompanyBudgetPlanPayload(payload);
  const period = ensureBudgetPlanPeriod(normalizedPayload);

  if (normalizedPayload.budgetAmountMinor !== null && normalizedPayload.budgetAmountMinor < 0) {
    throw httpError(400, "COMPANY_BUDGET_PLAN_INVALID_AMOUNT", "Budget amount cannot be negative.");
  }

  return prismaClient.$transaction(async (tx) => {
    let validatedScope = null;
    if (normalizedPayload.agreementIds !== null) {
      const agreements = await listCompanyBudgetScopeAgreements(tx, companyId);
      validatedScope = validateCompanyBudgetScopeSelection({
        companyId,
        periodStart: normalizedPayload.periodStart,
        periodEnd: normalizedPayload.periodEnd,
        agreements,
        selectedAgreementIds: normalizedPayload.agreementIds,
      });
    }

    const effectiveActorRole = actorRole || (actorUserId
      ? (await tx.user.findUnique({
        where: { id: Number(actorUserId) },
        select: { role: true },
      }))?.role
      : null);

    if (planId) {
      const current = await tx.companyBudgetPlan.findUnique({
        where: {
          id: Number(planId),
        },
        include: {
          agreementScopes: {
            select: { agreementId: true },
          },
        },
      });
      if (!current || Number(current.companyId || 0) !== Number(companyId || 0)) {
        throw httpError(404, "COMPANY_BUDGET_PLAN_NOT_FOUND", "Budget plan not found.");
      }
      requireBudgetPlanEditable(current);

      const currentVersion = Number(current.version || 1) || 1;
      if (expectedVersion !== null && expectedVersion !== undefined && Number(expectedVersion) !== currentVersion) {
        throw httpError(409, "COMPANY_BUDGET_PLAN_STALE", "Budget plan version conflict.");
      }

      const currentAgreementIds = current.agreementScopes.map((item) => item.agreementId);
      const newlyAttachedIds = validatedScope
        ? newlyAttachedAgreementIds(currentAgreementIds, validatedScope.selectedAgreementIds)
        : [];

      const updated = await tx.companyBudgetPlan.update({
        where: {
          id: current.id,
        },
        data: {
          currencyCode: normalizedPayload.currencyCode,
          budgetAmountMinor: normalizedPayload.budgetAmountMinor,
          periodStart: period.periodStart,
          periodEnd: period.periodEnd,
          budgetSource: normalizedPayload.budgetSource,
          budgetApprovalState: "draft",
          description: normalizedPayload.description,
          warningThresholdBps: normalizedPayload.warningThresholdBps,
          inputSnapshot: buildCompanyBudgetPlanInputSnapshot({
            action: "save",
            companyId,
            actorUserId,
            payload: normalizedPayload,
            previous: current,
            computed: {
              periodStart: normalizedPayload.periodStart,
              periodEnd: normalizedPayload.periodEnd,
              agreementIds: validatedScope?.selectedAgreementIds ?? null,
            },
          }),
          updatedByUserId: actorUserId,
          version: {
            increment: 1,
          },
        },
      });

      await recordCompanyBudgetPlanLifecycle(tx, {
        actorUserId,
        actorRole: effectiveActorRole,
        action: COMPANY_BUDGET_AUDIT_ACTIONS.SAVED,
        plan: updated,
        previous: current,
      });

      if (validatedScope) {
        await tx.companyBudgetPlanAgreement.deleteMany({
          where: { budgetPlanId: current.id },
        });
        if (validatedScope.selectedAgreementIds.length) {
          await tx.companyBudgetPlanAgreement.createMany({
            data: buildCompanyBudgetScopeRelations(validatedScope.selectedAgreementIds, actorUserId).map((item) => ({
              budgetPlanId: current.id,
              ...item,
            })),
          });
        }
      }

      if (newlyAttachedIds.length) {
        const attachedRelations = await tx.companyBudgetPlanAgreement.findMany({
          where: {
            budgetPlanId: updated.id,
            agreementId: { in: newlyAttachedIds },
          },
          select: { id: true, agreementId: true },
        });
        for (const relation of attachedRelations) {
          await recordCompanyBudgetPlanAgreementAttached(tx, {
            actorUserId,
            actorRole: effectiveActorRole,
            plan: updated,
            relation,
          });
        }
      }

      return normalizeCompanyBudgetPlan({
        ...updated,
        agreementScopes: validatedScope
          ? validatedScope.selectedAgreementIds.map((agreementId) => ({ agreementId }))
          : current.agreementScopes,
      });
    }

    const created = await tx.companyBudgetPlan.create({
      data: {
        companyId,
        status: "DRAFT",
        currencyCode: normalizedPayload.currencyCode,
        budgetAmountMinor: normalizedPayload.budgetAmountMinor,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        budgetSource: normalizedPayload.budgetSource || "draft_budget",
        budgetApprovalState: "draft",
        description: normalizedPayload.description,
        warningThresholdBps: normalizedPayload.warningThresholdBps,
        inputSnapshot: buildCompanyBudgetPlanInputSnapshot({
          action: "create",
          companyId,
          actorUserId,
          payload: normalizedPayload,
          computed: {
            periodStart: normalizedPayload.periodStart,
            periodEnd: normalizedPayload.periodEnd,
          agreementIds: validatedScope?.selectedAgreementIds ?? null,
          },
        }),
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
        version: 1,
      },
    });

    if (validatedScope?.selectedAgreementIds.length) {
      await tx.companyBudgetPlanAgreement.createMany({
        data: buildCompanyBudgetScopeRelations(validatedScope.selectedAgreementIds, actorUserId).map((item) => ({
          budgetPlanId: created.id,
          ...item,
        })),
      });
    }

    await recordCompanyBudgetPlanCreated(tx, {
      actorUserId,
      actorRole: effectiveActorRole,
      plan: created,
      agreementIds: validatedScope?.selectedAgreementIds ?? [],
    });

    if (validatedScope?.selectedAgreementIds.length) {
      const attachedRelations = await tx.companyBudgetPlanAgreement.findMany({
        where: {
          budgetPlanId: created.id,
          agreementId: { in: validatedScope.selectedAgreementIds },
        },
        select: { id: true, agreementId: true },
      });
      for (const relation of attachedRelations) {
        await recordCompanyBudgetPlanAgreementAttached(tx, {
          actorUserId,
          actorRole: effectiveActorRole,
          plan: created,
          relation,
        });
      }
    }

    return normalizeCompanyBudgetPlan({
      ...created,
      agreementScopes: validatedScope
        ? validatedScope.selectedAgreementIds.map((agreementId) => ({ agreementId }))
        : undefined,
    });
  });
}

async function getEditableCompanyBudgetPlanOrThrow(tx, { companyId, planId, expectedVersion }) {
  const current = await tx.companyBudgetPlan.findUnique({
    where: {
      id: Number(planId),
    },
    include: {
      agreementScopes: {
        select: { agreementId: true },
      },
    },
  });

  if (!current || Number(current.companyId || 0) !== Number(companyId || 0)) {
    throw httpError(404, "COMPANY_BUDGET_PLAN_NOT_FOUND", "Budget plan not found.");
  }

  const currentVersion = Number(current.version || 1) || 1;
  if (expectedVersion !== null && expectedVersion !== undefined && Number(expectedVersion) !== currentVersion) {
    throw httpError(409, "COMPANY_BUDGET_PLAN_STALE", "Budget plan version conflict.");
  }

  return current;
}

export async function submitCompanyBudgetPlan({ companyId, planId, actorUserId = null, actorRole = null, expectedVersion = null, prismaClient = prisma }) {
  return prismaClient.$transaction(async (tx) => {
    const current = await getEditableCompanyBudgetPlanOrThrow(tx, { companyId, planId, expectedVersion });
    requireBudgetPlanEditable(current);
    if (current.budgetApprovalState !== "draft" && current.budgetApprovalState !== "rejected") {
      throw httpError(409, "COMPANY_BUDGET_PLAN_INVALID_STATE", "Only draft budget plans can be submitted.");
    }
    if (current.budgetAmountMinor === null || current.periodStart === null || current.periodEnd === null) {
      throw httpError(409, "COMPANY_BUDGET_PLAN_INCOMPLETE", "Budget amount and period are required before submit.");
    }

    const updated = await tx.companyBudgetPlan.update({
      where: {
        id: current.id,
      },
      data: {
        budgetApprovalState: "submitted",
        inputSnapshot: buildCompanyBudgetPlanInputSnapshot({
          action: "submit",
          companyId,
          actorUserId,
          payload: {
            budgetAmountMinor: current.budgetAmountMinor,
            periodStart: toDateOnlyIso(current.periodStart),
            periodEnd: toDateOnlyIso(current.periodEnd),
            budgetSource: current.budgetSource,
            currencyCode: current.currencyCode,
          },
          previous: current,
        }),
        updatedByUserId: actorUserId,
        version: {
          increment: 1,
        },
      },
    });

    await recordCompanyBudgetPlanLifecycle(tx, {
      actorUserId,
      actorRole,
      action: COMPANY_BUDGET_AUDIT_ACTIONS.SUBMITTED,
      plan: updated,
      previous: current,
    });

    return normalizeCompanyBudgetPlan({ ...updated, agreementScopes: current.agreementScopes });
  });
}

export async function approveCompanyBudgetPlan({ companyId, planId, actorUserId = null, actorRole = null, expectedVersion = null, prismaClient = prisma }) {
  return prismaClient.$transaction(async (tx) => {
    const current = await getEditableCompanyBudgetPlanOrThrow(tx, { companyId, planId, expectedVersion });
    requireBudgetPlanEditable(current);
    if (current.budgetApprovalState !== "submitted") {
      throw httpError(409, "COMPANY_BUDGET_PLAN_INVALID_STATE", "Only submitted budget plans can be approved.");
    }
    if (current.budgetAmountMinor === null || current.periodStart === null || current.periodEnd === null) {
      throw httpError(409, "COMPANY_BUDGET_PLAN_INCOMPLETE", "Budget amount and period are required before approval.");
    }

    await assertBudgetPlanOverlap(tx, {
      companyId,
      planId: current.id,
      periodStart: current.periodStart,
      periodEnd: current.periodEnd,
    });

    const updated = await tx.companyBudgetPlan.update({
      where: {
        id: current.id,
      },
      data: {
        budgetApprovalState: "approved",
        inputSnapshot: buildCompanyBudgetPlanInputSnapshot({
          action: "approve",
          companyId,
          actorUserId,
          payload: {
            budgetAmountMinor: current.budgetAmountMinor,
            periodStart: toDateOnlyIso(current.periodStart),
            periodEnd: toDateOnlyIso(current.periodEnd),
            budgetSource: current.budgetSource,
            currencyCode: current.currencyCode,
          },
          previous: current,
        }),
        updatedByUserId: actorUserId,
        version: {
          increment: 1,
        },
      },
    });

    await recordCompanyBudgetPlanLifecycle(tx, {
      actorUserId,
      actorRole,
      action: COMPANY_BUDGET_AUDIT_ACTIONS.APPROVED,
      plan: updated,
      previous: current,
    });

    return normalizeCompanyBudgetPlan({ ...updated, agreementScopes: current.agreementScopes });
  });
}

export async function activateCompanyBudgetPlan({ companyId, planId, actorUserId = null, actorRole = null, expectedVersion = null, prismaClient = prisma }) {
  return prismaClient.$transaction(async (tx) => {
    const current = await getEditableCompanyBudgetPlanOrThrow(tx, { companyId, planId, expectedVersion });
    requireBudgetPlanEditable(current);
    if (current.budgetApprovalState !== "approved") {
      throw httpError(409, "COMPANY_BUDGET_PLAN_INVALID_STATE", "Only approved budget plans can be activated.");
    }
    if (current.budgetAmountMinor === null || current.periodStart === null || current.periodEnd === null) {
      throw httpError(409, "COMPANY_BUDGET_PLAN_INCOMPLETE", "Budget amount and period are required before activation.");
    }

    await assertBudgetPlanOverlap(tx, {
      companyId,
      planId: current.id,
      periodStart: current.periodStart,
      periodEnd: current.periodEnd,
    });

    const updated = await tx.companyBudgetPlan.update({
      where: {
        id: current.id,
      },
      data: {
        status: "ACTIVE",
        activatedAt: new Date(),
        activatedByUserId: actorUserId,
        inputSnapshot: buildCompanyBudgetPlanInputSnapshot({
          action: "activate",
          companyId,
          actorUserId,
          payload: {
            budgetAmountMinor: current.budgetAmountMinor,
            periodStart: toDateOnlyIso(current.periodStart),
            periodEnd: toDateOnlyIso(current.periodEnd),
            budgetSource: current.budgetSource,
            currencyCode: current.currencyCode,
          },
          previous: current,
        }),
        updatedByUserId: actorUserId,
        version: {
          increment: 1,
        },
      },
    });

    await recordCompanyBudgetPlanLifecycle(tx, {
      actorUserId,
      actorRole,
      action: COMPANY_BUDGET_AUDIT_ACTIONS.ACTIVATED,
      plan: updated,
      previous: current,
    });

    return normalizeCompanyBudgetPlan({ ...updated, agreementScopes: current.agreementScopes });
  });
}

export async function archiveCompanyBudgetPlan({ companyId, planId, actorUserId = null, actorRole = null, expectedVersion = null, prismaClient = prisma }) {
  return prismaClient.$transaction(async (tx) => {
    const current = await getEditableCompanyBudgetPlanOrThrow(tx, { companyId, planId, expectedVersion });
    if (current.status === "ARCHIVED") {
      return normalizeCompanyBudgetPlan(current);
    }

    const updated = await tx.companyBudgetPlan.update({
      where: {
        id: current.id,
      },
      data: {
        status: "ARCHIVED",
        budgetApprovalState: "archived",
        inputSnapshot: buildCompanyBudgetPlanInputSnapshot({
          action: "archive",
          companyId,
          actorUserId,
          payload: {
            budgetAmountMinor: current.budgetAmountMinor,
            periodStart: toDateOnlyIso(current.periodStart),
            periodEnd: toDateOnlyIso(current.periodEnd),
            budgetSource: current.budgetSource,
            currencyCode: current.currencyCode,
          },
          previous: current,
        }),
        updatedByUserId: actorUserId,
        version: {
          increment: 1,
        },
      },
    });

    await recordCompanyBudgetPlanLifecycle(tx, {
      actorUserId,
      actorRole,
      action: COMPANY_BUDGET_AUDIT_ACTIONS.ARCHIVED,
      plan: updated,
      previous: current,
    });

    return normalizeCompanyBudgetPlan({ ...updated, agreementScopes: current.agreementScopes });
  });
}

export async function getRoomQuoteFloorDraftOverview(roomId) {
  const roomQuoteFloorDrafts = await prisma.roomQuoteFloorDraft.findMany({
    where: {
      roomId,
    },
    orderBy: [
      {
        updatedAt: "desc",
      },
      {
        id: "desc",
      },
    ],
    take: 10,
  });

  const normalized = roomQuoteFloorDrafts.map(normalizeRoomQuoteFloorDraft);
  const current = normalized.find((item) => item?.status === "DRAFT") || normalized.find((item) => item?.status === "APPLIED") || normalized[0] || null;
  const draft = normalized.find((item) => item?.status === "DRAFT") || null;
  const applied = normalized.find((item) => item?.status === "APPLIED") || null;

  return {
    current,
    draft,
    applied,
    items: normalized,
  };
}

export async function getCurrentRoomQuoteFloorDraft(roomId) {
  const overview = await getRoomQuoteFloorDraftOverview(roomId);
  return overview.current;
}

export function buildRoomQuoteFloorDraftPreviewInputs(draft = null) {
  if (!draft) return {};

  const snapshot = draft.inputSnapshot && typeof draft.inputSnapshot === "object"
    ? draft.inputSnapshot
    : null;
  const storedPlanningInputs = snapshot?.computed?.planningInputs
    || snapshot?.payload?.planningInputs
    || snapshot?.planningInputs
    || {};
  const planningInputs = Object.fromEntries(ROOM_QUOTE_PLANNING_INPUT_FIELDS
    .filter((field) => storedPlanningInputs?.[field] !== undefined
      && storedPlanningInputs?.[field] !== null
      && String(storedPlanningInputs[field]).trim() !== "")
    .map((field) => [field, storedPlanningInputs[field]]));
  const computedBaselineOperationalCostMinor = snapshot?.computed?.baselineOperationalCostMinor;
  const manualBaselineOperationalCostMinor = draft.manualBaselineOperationalCostMinor
    ?? (computedBaselineOperationalCostMinor === null || computedBaselineOperationalCostMinor === undefined
      ? null
      : Number(computedBaselineOperationalCostMinor));

  return {
    currencyCode: normalizeUpper(draft.currencyCode, "TRY"),
    manualBaselineOperationalCostMinor,
    targetContributionBps: draft.targetContributionBps,
    riskReserveBps: draft.riskReserveBps,
    quoteFloorMinor: draft.quoteFloorMinor,
    quoteFloorPerPassengerMinor: draft.quoteFloorPerPassengerMinor,
    baselineSource: draft.baselineSource || null,
    ...planningInputs,
  };
}

function positiveId(value) {
  const parsed = Number(value || 0);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function roomQuoteFloorDraftSnapshotCandidates(draft = null) {
  const snapshot = draft?.inputSnapshot;
  if (!snapshot || typeof snapshot !== "object") return [];

  return [
    snapshot,
    snapshot.context,
    snapshot.serviceContext,
    snapshot.payload,
    snapshot.computed,
    snapshot.payload?.context,
    snapshot.payload?.serviceContext,
    snapshot.computed?.context,
    snapshot.computed?.serviceContext,
  ].filter((candidate) => candidate && typeof candidate === "object");
}

function roomQuoteFloorDraftSnapshotContext(draft = null) {
  const context = {
    agreementId: null,
    shiftId: null,
    vehicleId: null,
    sourceShiftId: null,
    scopeHash: null,
  };

  for (const candidate of roomQuoteFloorDraftSnapshotCandidates(draft)) {
    context.agreementId ||= positiveId(candidate.agreementId ?? candidate.agreement?.id);
    context.shiftId ||= positiveId(candidate.shiftId ?? candidate.shift?.id);
    context.vehicleId ||= positiveId(candidate.vehicleId ?? candidate.vehicle?.id);
    context.sourceShiftId ||= positiveId(candidate.sourceShiftId ?? candidate.planningSourceShiftId);
    context.scopeHash ||= compactText(candidate.scopeHash, "") || null;
  }

  return context;
}

export function resolveRoomQuoteFloorDraftScope(draft = null, selection = {}) {
  const requested = {
    agreementId: positiveId(selection?.agreementId),
    shiftId: positiveId(selection?.shiftId),
    vehicleId: positiveId(selection?.vehicleId),
  };
  const hasFocus = Object.values(requested).some(Boolean);

  if (!draft) {
    return {
      compatible: false,
      reason: "DRAFT_NOT_FOUND",
      draft: null,
      inputs: {},
      context: null,
    };
  }

  const context = roomQuoteFloorDraftSnapshotContext(draft);
  const hasSavedContext = Object.values(context).some(Boolean);
  if (!hasFocus) {
    if (hasSavedContext) {
      return {
        compatible: false,
        reason: "DRAFT_SERVICE_CONTEXT_REQUIRED",
        draft: null,
        inputs: {},
        context,
      };
    }

    return {
      compatible: true,
      reason: "NO_FOCUSED_SERVICE",
      draft,
      inputs: buildRoomQuoteFloorDraftPreviewInputs(draft),
      context,
    };
  }

  if (!hasSavedContext) {
    return {
      compatible: false,
      reason: "DRAFT_SERVICE_CONTEXT_UNKNOWN",
      draft: null,
      inputs: {},
      context,
    };
  }

  const shiftMatches = requested.shiftId && context.shiftId
    ? requested.shiftId === context.shiftId
    : null;
  const agreementMatches = requested.agreementId && context.agreementId
    ? requested.agreementId === context.agreementId
    : null;
  const vehicleMatches = requested.vehicleId && context.vehicleId
    ? requested.vehicleId === context.vehicleId
    : null;

  if (shiftMatches === false || agreementMatches === false || vehicleMatches === false) {
    return {
      compatible: false,
      reason: "DRAFT_SERVICE_CONTEXT_MISMATCH",
      draft: null,
      inputs: {},
      context,
    };
  }

  // A shift is the canonical service identity. If the saved snapshot has a
  // matching shift, missing agreement/vehicle metadata does not make the
  // already-selected service unsafe. Without that anchor, an agreement or
  // vehicle-only focus must fail closed.
  const anchoredByMatchingShift = shiftMatches === true;
  const unresolvedRequestedField = (
    (requested.agreementId && agreementMatches === null) ||
    (requested.vehicleId && vehicleMatches === null) ||
    (requested.shiftId && shiftMatches === null)
  );
  if (unresolvedRequestedField && !anchoredByMatchingShift) {
    return {
      compatible: false,
      reason: "DRAFT_SERVICE_CONTEXT_UNKNOWN",
      draft: null,
      inputs: {},
      context,
    };
  }

  return {
    compatible: true,
    reason: "DRAFT_SERVICE_CONTEXT_MATCH",
    draft,
    inputs: buildRoomQuoteFloorDraftPreviewInputs(draft),
    context,
  };
}

export function scopeRoomQuoteFloorDraftOverview(overview = null, selection = {}) {
  if (!overview || typeof overview !== "object") return null;
  const hasFocus = [selection?.agreementId, selection?.shiftId, selection?.vehicleId]
    .some((value) => positiveId(value));
  if (!hasFocus) return overview;

  const compatibleItems = (Array.isArray(overview.items) ? overview.items : [])
    .filter((item) => resolveRoomQuoteFloorDraftScope(item, selection).compatible);
  const current = compatibleItems.find((item) => item?.status === "DRAFT")
    || compatibleItems.find((item) => item?.status === "APPLIED")
    || compatibleItems[0]
    || null;
  const draft = compatibleItems.find((item) => item?.status === "DRAFT") || null;
  const applied = compatibleItems.find((item) => item?.status === "APPLIED") || null;

  return {
    ...overview,
    current,
    draft,
    applied,
    items: compatibleItems,
  };
}

export function removeStaleRoomQuoteFloorDraftInputs(query = {}, scopeResult = null) {
  const input = { ...(query || {}) };
  if (!scopeResult || scopeResult.compatible !== false || !positiveId(input.roomQuoteFloorDraftId)) {
    return input;
  }

  [
    "roomQuoteFloorDraftId",
    "roomQuoteFloorDraftVersion",
    "manualBaselineOperationalCostMinor",
    "quoteFloorMinor",
    "quoteFloorPerPassengerMinor",
    "baselineSource",
  ].forEach((key) => delete input[key]);
  return input;
}

export async function saveRoomQuoteFloorDraft({ roomId, actorUserId = null, draftId = null, expectedVersion = null, payload = {}, computed = {}, context = null }) {
  const normalizedPayload = normalizeRoomQuoteFloorDraftPayload(payload);
  const authoritativeQuoteFloorMinor = computed?.quoteFloorMinor !== null && computed?.quoteFloorMinor !== undefined
    ? parseMinorStrict(computed.quoteFloorMinor, "quoteFloorMinor")
    : normalizedPayload.quoteFloorMinor;
  const authoritativeQuoteFloorPerPassengerMinor = computed?.quoteFloorPerPassengerMinor !== null && computed?.quoteFloorPerPassengerMinor !== undefined
    ? parseMinorStrict(computed.quoteFloorPerPassengerMinor, "quoteFloorPerPassengerMinor")
    : normalizedPayload.quoteFloorPerPassengerMinor;
  const authoritativeBaselineSource = compactText(computed?.baselineSource, normalizedPayload.baselineSource || "") || null;

  if (normalizedPayload.manualBaselineOperationalCostMinor !== null && normalizedPayload.manualBaselineOperationalCostMinor < 0) {
    throw httpError(400, "ROOM_QUOTE_FLOOR_DRAFT_INVALID_AMOUNT", "Manual baseline cost cannot be negative.");
  }

  return prisma.$transaction(async (tx) => {
    let effectiveDraftId = positiveId(draftId);
    let idempotent = false;
    if (!effectiveDraftId
      && compactText(context?.scopeHash, "")
      && [context?.agreementId, context?.shiftId, context?.sourceShiftId].some((value) => positiveId(value))) {
      const candidates = await tx.roomQuoteFloorDraft.findMany({
        where: {
          roomId,
          status: "DRAFT",
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: 25,
      });
      const existing = candidates.find((candidate) => {
        const savedContext = roomQuoteFloorDraftSnapshotContext(candidate);
        return savedContext.scopeHash === compactText(context.scopeHash, "");
      });
      if (existing) {
        effectiveDraftId = existing.id;
        idempotent = true;
      }
    }

    if (effectiveDraftId) {
      const current = await tx.roomQuoteFloorDraft.findUnique({
        where: {
          id: Number(effectiveDraftId),
        },
      });
      if (!current || Number(current.roomId || 0) !== Number(roomId || 0)) {
        throw httpError(404, "ROOM_QUOTE_FLOOR_DRAFT_NOT_FOUND", "Quote floor draft not found.");
      }
      requireRoomDraftEditable(current);

      const currentVersion = Number(current.version || 1) || 1;
      if (expectedVersion !== null && expectedVersion !== undefined && Number(expectedVersion) !== currentVersion) {
        throw httpError(409, "ROOM_QUOTE_FLOOR_DRAFT_STALE", "Quote floor draft version conflict.");
      }

      const updated = await tx.roomQuoteFloorDraft.update({
        where: {
          id: current.id,
        },
        data: {
          currencyCode: normalizedPayload.currencyCode,
          manualBaselineOperationalCostMinor: normalizedPayload.manualBaselineOperationalCostMinor,
          targetContributionBps: normalizedPayload.targetContributionBps,
          riskReserveBps: normalizedPayload.riskReserveBps,
          quoteFloorMinor: authoritativeQuoteFloorMinor,
          quoteFloorPerPassengerMinor: authoritativeQuoteFloorPerPassengerMinor,
          baselineSource: authoritativeBaselineSource,
          calculationVersion: normalizedPayload.calculationVersion,
          inputSnapshot: buildRoomQuoteFloorDraftInputSnapshot({
            action: "save",
            roomId,
            actorUserId,
            payload: normalizedPayload,
            computed,
            context: context || roomQuoteFloorDraftSnapshotContext(current),
            previous: current,
          }),
          updatedByUserId: actorUserId,
          version: {
            increment: 1,
          },
        },
      });

      return { ...normalizeRoomQuoteFloorDraft(updated), idempotent };
    }

    const created = await tx.roomQuoteFloorDraft.create({
      data: {
        roomId,
        status: "DRAFT",
        currencyCode: normalizedPayload.currencyCode,
        manualBaselineOperationalCostMinor: normalizedPayload.manualBaselineOperationalCostMinor,
        targetContributionBps: normalizedPayload.targetContributionBps,
        riskReserveBps: normalizedPayload.riskReserveBps,
        quoteFloorMinor: authoritativeQuoteFloorMinor,
        quoteFloorPerPassengerMinor: authoritativeQuoteFloorPerPassengerMinor,
        baselineSource: authoritativeBaselineSource,
        calculationVersion: normalizedPayload.calculationVersion,
        inputSnapshot: buildRoomQuoteFloorDraftInputSnapshot({
          action: "create",
          roomId,
          actorUserId,
          payload: normalizedPayload,
          computed,
          context,
        }),
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
        version: 1,
      },
    });

    return { ...normalizeRoomQuoteFloorDraft(created), idempotent: false };
  });
}

async function getEditableRoomQuoteFloorDraftOrThrow(tx, { roomId, draftId, expectedVersion }) {
  const current = await tx.roomQuoteFloorDraft.findUnique({
    where: {
      id: Number(draftId),
    },
  });

  if (!current || Number(current.roomId || 0) !== Number(roomId || 0)) {
    throw httpError(404, "ROOM_QUOTE_FLOOR_DRAFT_NOT_FOUND", "Quote floor draft not found.");
  }

  const currentVersion = Number(current.version || 1) || 1;
  if (expectedVersion !== null && expectedVersion !== undefined && Number(expectedVersion) !== currentVersion) {
    throw httpError(409, "ROOM_QUOTE_FLOOR_DRAFT_STALE", "Quote floor draft version conflict.");
  }

  return current;
}

export async function applyRoomQuoteFloorDraft({ roomId, draftId, actorUserId = null, expectedVersion = null, payload = {} }) {
  return prisma.$transaction(async (tx) => {
    const current = await getEditableRoomQuoteFloorDraftOrThrow(tx, { roomId, draftId, expectedVersion });
    requireRoomDraftEditable(current);
    if (current.quoteFloorMinor === null) {
      throw httpError(409, "ROOM_QUOTE_FLOOR_DRAFT_INCOMPLETE", "Quote floor amount is required before apply.");
    }

    await assertNoDuplicateRoomDraftApply(tx, {
      roomId,
      appliedShiftOfferId: payload.appliedShiftOfferId ?? current.appliedShiftOfferId ?? null,
      draftId: current.id,
    });

    const updated = await tx.roomQuoteFloorDraft.update({
      where: {
        id: current.id,
      },
      data: {
        status: "APPLIED",
        appliedByUserId: actorUserId,
        appliedAt: new Date(),
        appliedShiftOfferId: payload.appliedShiftOfferId ?? current.appliedShiftOfferId ?? null,
        inputSnapshot: buildRoomQuoteFloorDraftInputSnapshot({
          action: "apply",
          roomId,
          actorUserId,
          payload: {
            appliedShiftOfferId: payload.appliedShiftOfferId ?? current.appliedShiftOfferId ?? null,
          },
          previous: current,
          context: roomQuoteFloorDraftSnapshotContext(current),
          computed: {
            quoteFloorMinor: current.quoteFloorMinor,
            quoteFloorPerPassengerMinor: current.quoteFloorPerPassengerMinor,
          },
        }),
        updatedByUserId: actorUserId,
        version: {
          increment: 1,
        },
      },
    });

    return normalizeRoomQuoteFloorDraft(updated);
  });
}

export async function archiveRoomQuoteFloorDraft({ roomId, draftId, actorUserId = null, expectedVersion = null }) {
  return prisma.$transaction(async (tx) => {
    const current = await getEditableRoomQuoteFloorDraftOrThrow(tx, { roomId, draftId, expectedVersion });
    if (current.status === "ARCHIVED") {
      return normalizeRoomQuoteFloorDraft(current);
    }

    const updated = await tx.roomQuoteFloorDraft.update({
      where: {
        id: current.id,
      },
      data: {
        status: "ARCHIVED",
        inputSnapshot: buildRoomQuoteFloorDraftInputSnapshot({
          action: "archive",
          roomId,
          actorUserId,
          previous: current,
          context: roomQuoteFloorDraftSnapshotContext(current),
          computed: {
            quoteFloorMinor: current.quoteFloorMinor,
            quoteFloorPerPassengerMinor: current.quoteFloorPerPassengerMinor,
          },
        }),
        updatedByUserId: actorUserId,
        version: {
          increment: 1,
        },
      },
    });

    return normalizeRoomQuoteFloorDraft(updated);
  });
}

const ROOM_INCOME_SOURCE = "INTERNAL_ACTUAL";
const ROOM_INCOME_CALCULATION_VERSION = "HAKEDIS-INVOICE-RECONCILIATION-PREVIEW-01";

function positiveIncomeId(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function normalizeIncomeCurrency(value) {
  const currency = String(value || "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : null;
}

function normalizeIncomeIdempotencyKey(value) {
  const key = compactText(value, "");
  return key && key.length <= 160 ? key : null;
}

function incomeReference(kind, { agreementId, periodStart, periodEnd, idempotencyKey }) {
  const safeKey = idempotencyKey.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 48);
  return `ROOM-${kind}-${agreementId}-${periodStart}-${periodEnd}-${safeKey}`;
}

function incomeRecordMatchesPeriod(row, periodStart, periodEnd) {
  return toDateOnlyIso(row?.periodStart) === periodStart && toDateOnlyIso(row?.periodEnd) === periodEnd;
}

function incomeRecordIsActive(row) {
  return !["CANCELLED", "REJECTED"].includes(normalizeUpper(row?.status, ""));
}

function incomeRecordIsClaimed(row) {
  return ["READY", "FINALIZED"].includes(normalizeUpper(row?.status, ""));
}

function incomePublicRecord(row) {
  if (!row) return null;
  return {
    id: positiveIncomeId(row.id),
    reference: compactText(row.reference, "") || null,
    agreementId: positiveIncomeId(row.agreementId),
    companyId: positiveIncomeId(row.companyId),
    roomId: positiveIncomeId(row.roomId),
    periodStart: toDateOnlyIso(row.periodStart),
    periodEnd: toDateOnlyIso(row.periodEnd),
    amountMinor: safeMinorOrNull(row.amountMinor),
    currencyCode: normalizeIncomeCurrency(row.currencyCode),
    status: normalizeUpper(row.status, ""),
    source: normalizeUpper(row.source, "") || null,
    createdAt: toIso(row.createdAt),
    issuedAt: toIso(row.issuedAt),
  };
}

async function writeRoomIncomeAudit(tx, { action, entity, entityId, actor, agreement, periodStart, periodEnd, amountMinor, currencyCode, sourceRef, idempotencyKey, calculation = null, serviceEvidenceSource = ROOM_INCOME_SOURCE }) {
  if (!tx?.auditLog?.create) {
    throw httpError(500, "INCOME_AUDIT_REQUIRED", "Gelir zinciri audit kaydı olmadan tamamlanamaz.");
  }
  return tx.auditLog.create({
    data: {
      actorUserId: positiveIncomeId(actor?.id),
      actorRole: normalizeUpper(actor?.role, "ROOM"),
      action,
      entity,
      entityId: positiveIncomeId(entityId),
      meta: {
        agreementId: positiveIncomeId(agreement?.id),
        companyId: positiveIncomeId(agreement?.companyId),
        roomId: positiveIncomeId(agreement?.roomId),
        periodStart,
        periodEnd,
        amountMinor,
        currencyCode,
        sourceRef,
        idempotencyKey,
        serviceEvidenceSource,
        vatStatus: "NOT_PROVEN",
        netProfitStatus: "NOT_PROVEN",
        calculationVersion: calculation?.calculationVersion || ROOM_INCOME_CALCULATION_VERSION,
        pricingUnit: calculation?.pricingUnit || "CONTRACT_PERIOD_FLAT",
        eligibleOperationCount: Number(calculation?.eligibleCount || 0),
        completedOperationCount: Number(calculation?.completedCount || 0),
        calculationSource: calculation?.source || "AGREEMENT_ROOM_OFFER",
        completedServiceUnitCount: Number(calculation?.completedServiceUnitCount || 0),
        previouslyClaimedServiceUnitCount: Number(calculation?.previouslyClaimedServiceUnitCount || 0),
        newlyCompletedServiceUnitCount: Number(calculation?.newlyCompletedServiceUnitCount || 0),
        unearnedServiceUnitCount: Number(calculation?.unearnedServiceUnitCount || 0),
      },
    },
  });
}

export async function createRoomIncomeChain({ prisma: providedPrisma = prisma, actor, input = {}, runtime = {} } = {}) {
  const role = normalizeUpper(actor?.role, "");
  const roomId = positiveIncomeId(actor?.roomId);
  if (role !== "ROOM" || !roomId) {
    throw httpError(403, "INCOME_TENANT_SCOPE_REQUIRED", "Gelir zinciri yalnızca kendi ROOM kapsamından oluşturulabilir.");
  }
  if (input?.userApproval !== true) {
    throw httpError(409, "EXPLICIT_CONFIRMATION_REQUIRED", "Hakediş ve fatura oluşturmak için açık kullanıcı onayı gerekir.");
  }

  const agreementId = positiveIncomeId(input?.agreementId);
  const periodStart = normalizeYmd(input?.periodStart);
  const periodEnd = normalizeYmd(input?.periodEnd);
  const requestedAmountMinor = input?.amountMinor == null || input?.amountMinor === ""
    ? null
    : parseMinorStrict(input?.amountMinor, "amountMinor");
  const currencyCode = normalizeIncomeCurrency(input?.currencyCode || "TRY");
  const sourceRef = compactText(input?.sourceRef, "");
  const idempotencyKey = normalizeIncomeIdempotencyKey(input?.idempotencyKey);
  const serviceEvidenceSource = normalizeUpper(input?.serviceEvidenceSource || ROOM_INCOME_SOURCE);
  if (!agreementId) throw httpError(400, "INCOME_AGREEMENT_REQUIRED", "Sözleşme seçilmelidir.");
  if (!periodStart || !periodEnd || periodStart > periodEnd) throw httpError(400, "INCOME_PERIOD_INVALID", "Geçerli bir gelir dönemi seçilmelidir.");
  if (requestedAmountMinor != null && requestedAmountMinor <= 0) throw httpError(422, "INCOME_AMOUNT_INVALID", "Hakediş tutarı sözleşme ve gerçekleşen hizmetten hesaplanır; geçersiz manuel tutar kabul edilmedi.");
  if (!currencyCode) throw httpError(422, "INCOME_CURRENCY_INVALID", "Geçerli bir para birimi seçilmelidir.");
  if (!sourceRef) throw httpError(422, "INCOME_SOURCE_REF_REQUIRED", "Gelir kanıt referansı gereklidir.");
  if (!idempotencyKey) throw httpError(422, "INCOME_IDEMPOTENCY_REQUIRED", "Gelir işlemi için işlem anahtarı gereklidir.");
  if (![ROOM_INCOME_SOURCE, TEST_SIMULATED_DATA_CLASS].includes(serviceEvidenceSource)) {
    throw httpError(422, "INCOME_SERVICE_EVIDENCE_SOURCE_INVALID", "Gelir hizmet kanıtı kaynağı desteklenmiyor.");
  }
  if (serviceEvidenceSource === TEST_SIMULATED_DATA_CLASS) {
    const mode = String(runtime?.mode || process.env.SEFERPAKT_DATABASE_MODE || "").trim().toLowerCase();
    const nodeEnv = String(runtime?.nodeEnv || process.env.NODE_ENV || "").trim().toLowerCase();
    if (mode !== "canonical_demo" || nodeEnv === "production") {
      throw httpError(403, "TEST_SIMULATED_CANONICAL_DEMO_REQUIRED", "TEST_SIMULATED gelir kanıtı yalnızca güvenli canonical DEMO ortamında kullanılabilir.");
    }
    if (!/^SEFERPAKT_DEMO_[A-Z0-9][A-Z0-9_-]*$/i.test(sourceRef)) {
      throw httpError(422, "TEST_SIMULATED_SOURCE_REQUIRED", "TEST_SIMULATED gelir işlemi izlenebilir bir DEMO kaynak referansı gerektirir.");
    }
  }

  const hakedisReference = incomeReference("HAK", { agreementId, periodStart, periodEnd, idempotencyKey });
  const invoiceReference = incomeReference("FAT", { agreementId, periodStart, periodEnd, idempotencyKey });
  const db = providedPrisma;
  if (!db?.$transaction || !db?.agreement?.findUnique || !db?.hakedisRecord?.findMany || !db?.invoiceRecord?.findMany) {
    throw httpError(503, "INCOME_FOUNDATION_NOT_INSTALLED", "Gelir zinciri altyapısı bu çalışma ortamında hazır değil.");
  }

  try {
    const result = await db.$transaction(async (tx) => {
      if (typeof tx.$queryRaw === "function") {
        await tx.$queryRaw`SELECT "id" FROM "Agreement" WHERE "id" = ${agreementId} AND "roomId" = ${roomId} FOR UPDATE`;
      }
      const agreement = await tx.agreement.findUnique({ where: { id: agreementId } });
      if (!agreement || Number(agreement.roomId) !== roomId) {
        throw httpError(403, "INCOME_TENANT_SCOPE_REQUIRED", "Bu sözleşme ROOM kapsamınızda değil.");
      }
      const agreementStatus = normalizeUpper(agreement.status, "");
      if (["CANCELLED", "REJECTED"].includes(agreementStatus)) {
        throw httpError(409, "INCOME_AGREEMENT_STATE_INVALID", "İptal edilmiş sözleşme için gelir kaydı oluşturulamaz.");
      }
      const agreementStart = toDateOnlyIso(agreement.startDate);
      const agreementEnd = toDateOnlyIso(agreement.endDate);
      if (!agreementStart || !agreementEnd || periodStart < agreementStart || periodEnd > agreementEnd) {
        throw httpError(409, "INCOME_PERIOD_OUTSIDE_AGREEMENT", "Gelir dönemi sözleşme dönemi içinde olmalıdır.");
      }

      const shifts = await tx.shift.findMany({
        where: {
          agreementId,
          roomId,
          startAt: { gte: ymdToDate(periodStart), lt: new Date(`${periodEnd}T23:59:59.999Z`) },
          status: { notIn: ["DRAFT", "REJECTED"] },
        },
        select: { id: true, status: true, startAt: true, progress: { select: { completedAt: true } } },
      });
      if (serviceEvidenceSource === TEST_SIMULATED_DATA_CLASS) {
        if (typeof tx.auditLog?.findMany !== "function") {
          throw httpError(503, "TEST_SIMULATED_SERVICE_EVIDENCE_UNAVAILABLE", "TEST_SIMULATED hizmet kanıtı audit kaydı olmadan doğrulanamaz.");
        }
        const completedShiftIds = shifts
          .filter((row) => normalizeUpper(row?.status) === "DONE" || Boolean(row?.progress?.completedAt))
          .map((row) => positiveIncomeId(row?.id))
          .filter(Boolean);
        const evidenceRows = completedShiftIds.length
          ? await tx.auditLog.findMany({ where: { action: TEST_SIMULATED_SERVICE_ACTION, entity: "Shift", entityId: { in: completedShiftIds } } })
          : [];
        const evidencedShiftIds = new Set((Array.isArray(evidenceRows) ? evidenceRows : [])
          .filter((row) => normalizeUpper(row?.meta?.dataClass) === TEST_SIMULATED_DATA_CLASS && /^SEFERPAKT_DEMO_/i.test(String(row?.meta?.sourceRef || "")))
          .map((row) => positiveIncomeId(row?.entityId)));
        const missingEvidence = completedShiftIds.filter((shiftId) => !evidencedShiftIds.has(shiftId));
        if (missingEvidence.length) {
          throw httpError(409, "TEST_SIMULATED_SERVICE_EVIDENCE_REQUIRED", "TEST_SIMULATED gelir için seçilen hizmet vardiyalarının kontrollü DEMO audit kanıtı eksik.", { missingShiftIds: missingEvidence });
        }
      }
      const [hakedisRows, invoiceRows] = await Promise.all([
        tx.hakedisRecord.findMany({ where: { agreementId, roomId }, orderBy: { id: "asc" } }),
        tx.invoiceRecord.findMany({ where: { agreementId, roomId }, orderBy: { id: "asc" } }),
      ]);
      const activeHakedis = (Array.isArray(hakedisRows) ? hakedisRows : []).filter((row) => incomeRecordIsActive(row) && incomeRecordMatchesPeriod(row, periodStart, periodEnd));
      const activeInvoices = (Array.isArray(invoiceRows) ? invoiceRows : []).filter((row) => incomeRecordIsActive(row) && incomeRecordMatchesPeriod(row, periodStart, periodEnd));
      const claimedHakedis = (Array.isArray(hakedisRows) ? hakedisRows : []).filter(incomeRecordIsClaimed);
      const previouslyClaimedServiceDates = claimedHakedis.flatMap((row) => extractClaimedServiceDates(row));
      const calculation = calculateRoomHakedisPreview({
        agreement,
        periodStart,
        periodEnd,
        operations: shifts,
        previouslyClaimedServiceDates,
        asOfDate: new Date(),
      });
      if (calculation.status !== "READY") {
        throw httpError(409, calculation.code || "INCOME_CALCULATION_NOT_PROVEN", calculation.reason || "Hakediş tutarı sözleşme ve gerçekleşen hizmetten hesaplanamadı.");
      }
      if (calculation.pricingUnit === "SERVICE_DAY_EQUAL" && claimedHakedis.some((row) => extractClaimedServiceDates(row).length === 0)) {
        throw httpError(409, "INCOME_CLAIM_HISTORY_NOT_PROVEN", "Önceki hakedişin hangi hizmet günlerini kapsadığı doğrulanamadı; tekrar hakediş oluşturulmadı.");
      }
      const amountMinor = calculation.amountMinor;
      if (requestedAmountMinor != null && requestedAmountMinor !== amountMinor) {
        throw httpError(409, "INCOME_AMOUNT_DERIVATION_MISMATCH", "Hakediş tutarı sözleşme fiyatı ve gerçekleşen hizmetten hesaplanır; girilen tutar bu hesapla eşleşmiyor.");
      }
      if (activeHakedis.length || activeInvoices.length) {
        const sameReplay = activeHakedis.length === 1
          && activeInvoices.length === 1
          && activeHakedis[0].reference === hakedisReference
          && activeInvoices[0].reference === invoiceReference
          && Number(activeHakedis[0].amountMinor) === amountMinor
          && Number(activeInvoices[0].amountMinor) === amountMinor
          && normalizeIncomeCurrency(activeHakedis[0].currencyCode) === currencyCode
          && normalizeIncomeCurrency(activeInvoices[0].currencyCode) === currencyCode;
        if (sameReplay) {
          return {
            idempotent: true,
            hakedis: incomePublicRecord(activeHakedis[0]),
            invoice: incomePublicRecord(activeInvoices[0]),
            vatStatus: "NOT_PROVEN",
            netProfitStatus: "NOT_PROVEN",
            calculation,
          };
        }
        const proportionalContinuation = calculation.pricingUnit === "SERVICE_DAY_EQUAL"
          && activeHakedis.length === activeInvoices.length
          && activeHakedis.length > 0
          && activeHakedis.every((row) => extractClaimedServiceDates(row).length > 0)
          && calculation.newlyCompletedServiceUnitCount > 0;
        if (proportionalContinuation) {
          // A proportional contract may issue another invoice for newly completed
          // days; the calculation above has already excluded prior claimed days.
        } else {
          throw httpError(409, "INCOME_RECORD_ALREADY_EXISTS", "Bu sözleşme ve dönem için aktif gelir kaydı zaten bulunuyor.");
        }
      }

      const createdAt = new Date();
      const claimNote = calculation.pricingUnit === "SERVICE_DAY_EQUAL"
        ? `; ${serializeClaimedServiceDates(calculation.newlyCompletedServiceDates)}; Hesaplanan birim: eşit hizmet günü`
        : "";
      const evidenceNote = `; Kanıt türü: ${serviceEvidenceSource}`;
      const hakedis = await tx.hakedisRecord.create({
        data: {
          reference: hakedisReference,
          agreementId,
          companyId: Number(agreement.companyId),
          roomId,
          periodStart: ymdToDate(periodStart),
          periodEnd: ymdToDate(periodEnd),
          amountMinor,
          currencyCode,
          status: "FINALIZED",
          calculationVersion: ROOM_INCOME_CALCULATION_VERSION,
          source: serviceEvidenceSource,
          notes: `Kullanıcı kanıtı: ${sourceRef}${evidenceNote}${claimNote}`,
          createdByUserId: positiveIncomeId(actor.id),
          createdAt,
        },
      });
      const invoice = await tx.invoiceRecord.create({
        data: {
          reference: invoiceReference,
          agreementId,
          companyId: Number(agreement.companyId),
          roomId,
          periodStart: ymdToDate(periodStart),
          periodEnd: ymdToDate(periodEnd),
          amountMinor,
          currencyCode,
          status: "ISSUED",
          source: serviceEvidenceSource,
          notes: `Kullanıcı kanıtı: ${sourceRef}${evidenceNote}${claimNote}`,
          issuedAt: createdAt,
          createdByUserId: positiveIncomeId(actor.id),
          createdAt,
        },
      });
      await writeRoomIncomeAudit(tx, { action: "ROOM_HAKEDIS_FINALIZED", entity: "HakedisRecord", entityId: hakedis.id, actor, agreement, periodStart, periodEnd, amountMinor, currencyCode, sourceRef, idempotencyKey, calculation, serviceEvidenceSource });
      await writeRoomIncomeAudit(tx, { action: "ROOM_INVOICE_ISSUED", entity: "InvoiceRecord", entityId: invoice.id, actor, agreement, periodStart, periodEnd, amountMinor, currencyCode, sourceRef, idempotencyKey, calculation, serviceEvidenceSource });
      return {
        idempotent: false,
        hakedis: incomePublicRecord(hakedis),
        invoice: incomePublicRecord(invoice),
        vatStatus: "NOT_PROVEN",
        netProfitStatus: "NOT_PROVEN",
        calculation,
      };
    });
    return result;
  } catch (error) {
    if (String(error?.code || "") === "P2002") {
      throw httpError(409, "INCOME_RECORD_ALREADY_EXISTS", "Bu gelir işlemi daha önce oluşturulmuş olabilir; kaydı yeniden okuyun.");
    }
    throw error;
  }
}
