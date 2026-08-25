import { prisma } from "../prisma.js";
import { httpError } from "../errors/http.js";

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

function buildRoomQuoteFloorDraftInputSnapshot({ action, roomId, actorUserId, payload = {}, computed = {}, previous = null }) {
  return {
    kind: "RoomQuoteFloorDraft",
    action,
    roomId: Number(roomId || 0) || null,
    actorUserId: Number(actorUserId || 0) || null,
    previousVersion: previous?.version ?? null,
    previousStatus: previous?.status ?? null,
    payload,
    computed,
  };
}

function normalizeCompanyBudgetPlanPayload(payload = {}) {
  const warningThresholdBps = parseBpsStrict(payload.warningThresholdBps, "warningThresholdBps");
  return {
    currencyCode: normalizeUpper(payload.currencyCode, "TRY"),
    budgetAmountMinor: parseMinorStrict(payload.budgetAmountMinor, "budgetAmountMinor"),
    periodStart: normalizeYmd(payload.periodStart),
    periodEnd: normalizeYmd(payload.periodEnd),
    budgetSource: compactText(payload.budgetSource, "") || null,
    description: compactText(payload.description, "") || null,
    warningThresholdBps,
    budgetApprovalState: normalizeLower(payload.budgetApprovalState, "draft"),
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
  });

  const normalized = companyBudgetPlans.map(normalizeCompanyBudgetPlan);
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

export async function saveCompanyBudgetPlanDraft({ companyId, actorUserId = null, planId = null, expectedVersion = null, payload = {} }) {
  const normalizedPayload = normalizeCompanyBudgetPlanPayload(payload);
  const period = ensureBudgetPlanPeriod(normalizedPayload);

  if (normalizedPayload.budgetAmountMinor !== null && normalizedPayload.budgetAmountMinor < 0) {
    throw httpError(400, "COMPANY_BUDGET_PLAN_INVALID_AMOUNT", "Budget amount cannot be negative.");
  }

  return prisma.$transaction(async (tx) => {
    if (planId) {
      const current = await tx.companyBudgetPlan.findUnique({
        where: {
          id: Number(planId),
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
            },
          }),
          updatedByUserId: actorUserId,
          version: {
            increment: 1,
          },
        },
      });

      return normalizeCompanyBudgetPlan(updated);
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
          },
        }),
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
        version: 1,
      },
    });

    return normalizeCompanyBudgetPlan(created);
  });
}

async function getEditableCompanyBudgetPlanOrThrow(tx, { companyId, planId, expectedVersion }) {
  const current = await tx.companyBudgetPlan.findUnique({
    where: {
      id: Number(planId),
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

export async function submitCompanyBudgetPlan({ companyId, planId, actorUserId = null, expectedVersion = null }) {
  return prisma.$transaction(async (tx) => {
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

    return normalizeCompanyBudgetPlan(updated);
  });
}

export async function approveCompanyBudgetPlan({ companyId, planId, actorUserId = null, expectedVersion = null }) {
  return prisma.$transaction(async (tx) => {
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

    return normalizeCompanyBudgetPlan(updated);
  });
}

export async function activateCompanyBudgetPlan({ companyId, planId, actorUserId = null, expectedVersion = null }) {
  return prisma.$transaction(async (tx) => {
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

    return normalizeCompanyBudgetPlan(updated);
  });
}

export async function archiveCompanyBudgetPlan({ companyId, planId, actorUserId = null, expectedVersion = null }) {
  return prisma.$transaction(async (tx) => {
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

    return normalizeCompanyBudgetPlan(updated);
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

  return {
    currencyCode: normalizeUpper(draft.currencyCode, "TRY"),
    manualBaselineOperationalCostMinor: draft.manualBaselineOperationalCostMinor,
    targetContributionBps: draft.targetContributionBps,
    riskReserveBps: draft.riskReserveBps,
    quoteFloorMinor: draft.quoteFloorMinor,
    quoteFloorPerPassengerMinor: draft.quoteFloorPerPassengerMinor,
    baselineSource: draft.baselineSource || null,
  };
}

export async function saveRoomQuoteFloorDraft({ roomId, actorUserId = null, draftId = null, expectedVersion = null, payload = {}, computed = {} }) {
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
    if (draftId) {
      const current = await tx.roomQuoteFloorDraft.findUnique({
        where: {
          id: Number(draftId),
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
            previous: current,
          }),
          updatedByUserId: actorUserId,
          version: {
            increment: 1,
          },
        },
      });

      return normalizeRoomQuoteFloorDraft(updated);
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
        }),
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
        version: 1,
      },
    });

    return normalizeRoomQuoteFloorDraft(created);
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
