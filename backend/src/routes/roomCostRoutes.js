import { asyncHandler } from "../middleware/asyncHandler.js";
import { authRequired as defaultAuthRequired, requireRole as defaultRequireRole, requireStepUpWrite as defaultRequireStepUpWrite } from "../auth/middleware.js";
import { audit as defaultAudit } from "../audit.js";
import { prisma as defaultPrisma } from "../prisma.js";
import { normalizeError } from "../errors/http.js";
import { assertDriverCompensationAccess as defaultAssertDriverCompensationAccess } from "../finance/roomCostAccess.js";
import { buildRealizedIncomeEvidence } from "../finance/accountingExportContract.js";
import { buildAccountingPeriodReadinessFromSources } from "../finance/roomAccountingPeriod.js";
import {
  getAccountingPeriod as defaultGetAccountingPeriod,
  transitionAccountingPeriodRecord as defaultTransitionAccountingPeriodRecord,
} from "../finance/roomAccountingPeriodLedger.js";
import {
  createCostSettlement as defaultCreateCostSettlement,
  listCostSettlements as defaultListCostSettlements,
} from "../finance/roomCostSettlement.js";
import {
  SALARY_CATEGORY_KEYS,
  listCostCategories as defaultListCostCategories,
  createCostDraft as defaultCreateCostDraft,
  updateCostDraft as defaultUpdateCostDraft,
  confirmCostDraft as defaultConfirmCostDraft,
  createCostBatchDraft as defaultCreateCostBatchDraft,
  createCostBatchDraftRow as defaultCreateCostBatchDraftRow,
  getCurrentCostBatchDraft as defaultGetCurrentCostBatchDraft,
  updateCostBatchDraftRow as defaultUpdateCostBatchDraftRow,
  removeCostBatchDraftRow as defaultRemoveCostBatchDraftRow,
  applyCostBatchDraft as defaultApplyCostBatchDraft,
  correctConfirmedCost as defaultCorrectConfirmedCost,
  upsertAllocationLine as defaultUpsertAllocationLine,
  autoAllocateCostByCanonicalUsage as defaultAutoAllocateCostByCanonicalUsage,
  listCostEntries as defaultListCostEntries,
  summarizeRoomCosts as defaultSummarizeRoomCosts,
  buildOperationalCostInputs as defaultBuildOperationalCostInputs,
} from "../finance/roomCostLedger.js";

const COSTS_BASE = "/room/financial-operations/costs";
const FILTER_KEYS = ["vehicleId", "driverId", "categoryKey", "periodStart", "periodEnd", "periodScope", "recordKind", "includeSalary"];

function routeError(code, message, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function positiveRoomId(value) {
  const roomId = Number(value);
  return Number.isSafeInteger(roomId) && roomId > 0 ? roomId : null;
}

function resolveActorRoom(req) {
  const roomId = positiveRoomId(req.user?.roomId);
  if (!roomId) {
    if (String(req.user?.role || '').trim().toUpperCase() === 'SUPER_ADMIN') {
      throw routeError("ROOM_ACCESS_DENIED", "Bu ROOM maliyet kapsamına erişim yetkiniz yok.", 403);
    }
    throw routeError("ROOM_ID_REQUIRED", "ROOM kapsamı sunucu oturumundan çözülemedi.", 400);
  }
  return roomId;
}

function queryBoolean(value) {
  return value === true || String(value ?? "").trim().toLowerCase() === "true";
}

function readFilters(req) {
  const filters = {};
  for (const key of FILTER_KEYS) {
    if (req.query?.[key] === undefined) continue;
    filters[key] = key === "includeSalary" ? queryBoolean(req.query[key]) : req.query[key];
  }
  return filters;
}

function bodyWithoutScope(body = {}, excluded = []) {
  const excludedKeys = new Set(["roomId", ...excluded]);
  return Object.fromEntries(Object.entries(body || {}).filter(([key]) => !excludedKeys.has(key)));
}

function isSalaryCategory(categoryKey) {
  return SALARY_CATEGORY_KEYS.has(String(categoryKey || "").trim().toUpperCase());
}

function contractFlags({ readOnly, draft = false, confirmed = false, missing = [], excluded = [], salaryRedacted = false, writeAction = false } = {}) {
  return {
    readOnly: Boolean(readOnly),
    draft: Boolean(draft),
    confirmed: Boolean(confirmed),
    missing: Array.isArray(missing) ? missing : [],
    excluded: Array.isArray(excluded) ? excluded : [],
    salaryRedacted: Boolean(salaryRedacted),
    writeAction: Boolean(writeAction),
  };
}

function safeErrorDetails(error) {
  const details = {};
  if (Array.isArray(error?.missing) && error.missing.length) details.missing = error.missing;
  if (Array.isArray(error?.blockers) && error.blockers.length) details.blockers = error.blockers;
  return Object.keys(details).length ? details : undefined;
}

function sendRouteError(res, error, flags = {}) {
  const normalized = normalizeError(error);
  const details = safeErrorDetails(error);
  const body = {
    ...normalized.body,
    ...contractFlags({ readOnly: true, salaryRedacted: true, ...flags }),
  };
  if (details) body.error.details = details;
  return res.status(normalized.status).json(body);
}

function safeAsync(handler, flags = {}) {
  return asyncHandler(async (req, res, next) => {
    try {
      return await handler(req, res);
    } catch (error) {
      if (res.headersSent) return next(error);
      return sendRouteError(res, error, flags);
    }
  });
}

export function attachRoomCostRoutes(router, dependencies = {}) {
  const authRequired = dependencies.authRequired || defaultAuthRequired;
  const requireRole = dependencies.requireRole || defaultRequireRole;
  const requireStepUpWrite = dependencies.requireStepUpWrite || defaultRequireStepUpWrite;
  const requireSuperAdminStepUp = requireStepUpWrite("SUPER_ADMIN");
  const assertDriverCompensationAccess = dependencies.assertDriverCompensationAccess || defaultAssertDriverCompensationAccess;
  const prisma = dependencies.prisma || defaultPrisma;
  const audit = dependencies.audit || defaultAudit;
  const ledger = {
    listCostCategories: dependencies.ledger?.listCostCategories || defaultListCostCategories,
    createCostDraft: dependencies.ledger?.createCostDraft || defaultCreateCostDraft,
    updateCostDraft: dependencies.ledger?.updateCostDraft || defaultUpdateCostDraft,
    confirmCostDraft: dependencies.ledger?.confirmCostDraft || defaultConfirmCostDraft,
    createCostBatchDraft: dependencies.ledger?.createCostBatchDraft || defaultCreateCostBatchDraft,
    createCostBatchDraftRow: dependencies.ledger?.createCostBatchDraftRow || defaultCreateCostBatchDraftRow,
    getCurrentCostBatchDraft: dependencies.ledger?.getCurrentCostBatchDraft || defaultGetCurrentCostBatchDraft,
    updateCostBatchDraftRow: dependencies.ledger?.updateCostBatchDraftRow || defaultUpdateCostBatchDraftRow,
    removeCostBatchDraftRow: dependencies.ledger?.removeCostBatchDraftRow || defaultRemoveCostBatchDraftRow,
    applyCostBatchDraft: dependencies.ledger?.applyCostBatchDraft || defaultApplyCostBatchDraft,
    correctConfirmedCost: dependencies.ledger?.correctConfirmedCost || defaultCorrectConfirmedCost,
    upsertAllocationLine: dependencies.ledger?.upsertAllocationLine || defaultUpsertAllocationLine,
    autoAllocateCostByCanonicalUsage: dependencies.ledger?.autoAllocateCostByCanonicalUsage || defaultAutoAllocateCostByCanonicalUsage,
    listCostEntries: dependencies.ledger?.listCostEntries || defaultListCostEntries,
    summarizeRoomCosts: dependencies.ledger?.summarizeRoomCosts || defaultSummarizeRoomCosts,
    buildOperationalCostInputs: dependencies.ledger?.buildOperationalCostInputs || defaultBuildOperationalCostInputs,
    getAccountingPeriod: dependencies.ledger?.getAccountingPeriod || defaultGetAccountingPeriod,
    transitionAccountingPeriodRecord: dependencies.ledger?.transitionAccountingPeriodRecord || defaultTransitionAccountingPeriodRecord,
  };
  const settlement = {
    createCostSettlement: dependencies.settlement?.createCostSettlement || defaultCreateCostSettlement,
    listCostSettlements: dependencies.settlement?.listCostSettlements || defaultListCostSettlements,
  };

  function requireRoutineRoomCostConfirmation(req, res, next) {
    if (String(req.user?.role || '').trim().toUpperCase() === 'ROOM') return next();
    return requireSuperAdminStepUp(req, res, next);
  }

  async function assertSalaryAccessIfRequested({ req, roomId, categoryKey = null, includeSalary = false }) {
    if (!includeSalary && !isSalaryCategory(categoryKey)) return;
    await assertDriverCompensationAccess({ user: req.user, roomId, prisma });
  }

  router.get(
    `${COSTS_BASE}/categories`,
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    safeAsync(async (req, res) => {
      const roomId = resolveActorRoom(req);
      const includeSalary = queryBoolean(req.query?.includeSalary);
      await assertSalaryAccessIfRequested({ req, roomId, includeSalary });
      const items = await ledger.listCostCategories({
        actor: req.user,
        roomId,
        includeInactive: queryBoolean(req.query?.includeInactive),
        includeSalary,
        prisma,
        req,
      });
      return res.json({
        ok: true,
        items,
        ...contractFlags({ readOnly: true, salaryRedacted: !includeSalary }),
      });
    }),
  );

  router.get(
    COSTS_BASE,
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    safeAsync(async (req, res) => {
      const roomId = resolveActorRoom(req);
      const filters = readFilters(req);
      await assertSalaryAccessIfRequested({ req, roomId, includeSalary: filters.includeSalary === true, categoryKey: filters.categoryKey });
      const result = await ledger.listCostEntries({ actor: req.user, roomId, filters, prisma });
      return res.json({
        ok: true,
        items: result.entries,
        entries: result.entries,
        ...contractFlags({ readOnly: true, salaryRedacted: result.salaryRedacted }),
      });
    }),
  );

  router.get(
    `${COSTS_BASE}/summary`,
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    safeAsync(async (req, res) => {
      const roomId = resolveActorRoom(req);
      const filters = readFilters(req);
      await assertSalaryAccessIfRequested({ req, roomId, includeSalary: filters.includeSalary === true, categoryKey: filters.categoryKey });
      const result = await ledger.summarizeRoomCosts({ actor: req.user, roomId, filters, prisma });
      const incomeEvidence = await buildRealizedIncomeEvidence({
        roomId,
        periodStart: filters.periodStart,
        periodEnd: filters.periodEnd,
        periodScope: filters.periodScope,
        // The canonical DEMO frontend may display explicitly labelled
        // TEST_SIMULATED income so the supported acceptance journey remains
        // visible after refresh. Production and other accounting consumers
        // keep the default INTERNAL_ACTUAL-only contract.
        allowTestSimulated: String(process.env.SEFERPAKT_DATABASE_MODE || "").toLowerCase() === "canonical_demo",
        prisma,
      });
      return res.json({ ok: true, ...result, incomeEvidence, ...contractFlags({ readOnly: true, missing: result.missing, excluded: result.excluded, salaryRedacted: result.salaryRedacted }) });
    }),
  );

  router.get(
    `${COSTS_BASE}/allocation-preview`,
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    safeAsync(async (req, res) => {
      const roomId = resolveActorRoom(req);
      const filters = readFilters(req);
      await assertSalaryAccessIfRequested({ req, roomId, includeSalary: filters.includeSalary === true, categoryKey: filters.categoryKey });
      const result = await ledger.buildOperationalCostInputs({ actor: req.user, roomId, filters, prisma });
      return res.json({
        ok: true,
        allocation: result.allocation,
        operationalInputs: result.inputs,
        known: result.known,
        missing: result.missing,
        excluded: result.excluded,
        blockers: result.blockers,
        lineage: result.lineage,
        ...contractFlags({
          readOnly: true,
          missing: result.allocation?.missing || result.missing,
          excluded: result.excluded,
          salaryRedacted: result.salaryRedacted,
        }),
      });
    }),
  );

  async function accountingPeriodReadiness({ actor, roomId, periodStart, periodEnd }) {
    const filters = { periodStart, periodEnd, periodScope: "RANGE", includeSalary: true };
    const [costInputs, incomeEvidence] = await Promise.all([
      ledger.buildOperationalCostInputs({ actor, roomId, filters, prisma }),
      buildRealizedIncomeEvidence({ roomId, periodStart, periodEnd, periodScope: "RANGE", prisma }),
    ]);
    return buildAccountingPeriodReadinessFromSources({
      costSummary: costInputs?.summary || null,
      incomeEvidence,
    });
  }

  router.get(
    `${COSTS_BASE}/accounting-periods/status`,
    authRequired(),
    requireRole("ROOM"),
    safeAsync(async (req, res) => {
      const roomId = resolveActorRoom(req);
      const periodStart = req.query?.periodStart;
      const periodEnd = req.query?.periodEnd;
      const readiness = await accountingPeriodReadiness({ actor: req.user, roomId, periodStart, periodEnd });
      const period = await ledger.getAccountingPeriod({ prisma, actor: req.user, roomId, periodStart, periodEnd, readiness });
      return res.json({
        ok: true,
        period,
        readiness,
        transitions: {
          review: period.status === "OPEN",
          readyToClose: period.status === "REVIEW" && readiness.readyForClose,
          close: false,
          reopen: false,
        },
        ...contractFlags({ readOnly: true, missing: readiness.blockers, salaryRedacted: true }),
      });
    }),
  );

  router.post(
    `${COSTS_BASE}/accounting-periods/transition`,
    authRequired(),
    requireRole("ROOM"),
    requireRoutineRoomCostConfirmation,
    safeAsync(async (req, res) => {
      const roomId = resolveActorRoom(req);
      const body = bodyWithoutScope(req.body, ["confirmed", "confirm", "targetStatus", "reason"]);
      const targetStatus = String(req.body?.targetStatus || "").trim().toUpperCase();
      if (!targetStatus) throw routeError("ACCOUNTING_PERIOD_STATUS_REQUIRED", "Dönem durumu belirtilmelidir.", 400);
      const readiness = await accountingPeriodReadiness({
        actor: req.user,
        roomId,
        periodStart: body.periodStart,
        periodEnd: body.periodEnd,
      });
      const period = await ledger.transitionAccountingPeriodRecord({
        prisma,
        actor: req.user,
        roomId,
        periodStart: body.periodStart,
        periodEnd: body.periodEnd,
        targetStatus,
        confirmed: req.body?.confirmed === true || req.body?.confirm === true,
        reason: req.body?.reason,
        readiness,
        // CLOSED and reopen transitions remain unavailable until the written accounting policy exists.
        policyApproved: false,
        audit,
        req,
      });
      return res.json({ ok: true, period, readiness, ...contractFlags({ readOnly: false, writeAction: true }) });
    }, { readOnly: false, salaryRedacted: true }),
  );

  router.get(
    `${COSTS_BASE}/settlements`,
    authRequired(),
    requireRole("ROOM"),
    safeAsync(async (req, res) => {
      const roomId = resolveActorRoom(req);
      const result = await settlement.listCostSettlements({ actor: req.user, roomId, prisma });
      return res.json({
        ok: true,
        ...result,
        ...contractFlags({ readOnly: true, salaryRedacted: false }),
      });
    }),
  );

  router.post(
    `${COSTS_BASE}/settlements`,
    authRequired(),
    requireRole("ROOM"),
    requireRoutineRoomCostConfirmation,
    safeAsync(async (req, res) => {
      const roomId = resolveActorRoom(req);
      const input = bodyWithoutScope(req.body, ["confirmed", "confirm", "confirmationToken", "token"]);
      const result = await settlement.createCostSettlement({ actor: req.user, roomId, input: { ...input, confirmed: req.body?.confirmed === true || req.body?.confirm === true, confirmationToken: req.body?.confirmationToken || req.body?.token }, prisma });
      return res.status(result.idempotent ? 200 : 201).json({
        ok: true,
        ...result,
        ...contractFlags({ readOnly: false, confirmed: true, writeAction: true }),
      });
    }, { readOnly: false, salaryRedacted: false }),
  );

  router.post(
    `${COSTS_BASE}/:id/auto-allocation`,
    authRequired(),
    requireRole("ROOM"),
    requireRoutineRoomCostConfirmation,
    safeAsync(async (req, res) => {
      const roomId = resolveActorRoom(req);
      const body = req.body || {};
      if (body.confirmed !== true && body.confirm !== true) {
        throw routeError("EXPLICIT_CONFIRMATION_REQUIRED", "Otomatik dağıtım için açık onay gerekir.", 400);
      }
      const result = await ledger.autoAllocateCostByCanonicalUsage({
        actor: req.user,
        roomId,
        entryId: req.params.id,
        prisma,
        req,
      });
      return res.json({
        ok: true,
        item: result,
        ...contractFlags({ readOnly: false, confirmed: true, writeAction: true }),
      });
    }, { readOnly: false, salaryRedacted: false }),
  );

  router.post(
    `${COSTS_BASE}/:id/allocation-lines`,
    authRequired(),
    requireRole("ROOM"),
    requireRoutineRoomCostConfirmation,
    safeAsync(async (req, res) => {
      const roomId = resolveActorRoom(req);
      const body = req.body || {};
      if (body.confirmed !== true && body.confirm !== true) {
        throw routeError("EXPLICIT_CONFIRMATION_REQUIRED", "Kullanım kanıtı için açık onay gerekir.", 400);
      }
      const input = bodyWithoutScope(body, ["confirmed", "confirm", "token", "confirmationToken"]);
      const allocatedAmountMinor = Number(input.allocatedAmountMinor);
      if (!String(input.evidenceRef || "").trim()) {
        throw routeError("ALLOCATION_EVIDENCE_REF_REQUIRED", "Kullanım kanıtı referansı gerekir.", 400);
      }
      if (!String(input.sourceRef || "").trim()) {
        throw routeError("ALLOCATION_SOURCE_REF_REQUIRED", "Canonical gider kaynak referansı gerekir.", 400);
      }
      if (!Number.isSafeInteger(allocatedAmountMinor) || allocatedAmountMinor <= 0) {
        throw routeError("ALLOCATION_AMOUNT_REQUIRED", "Servis payı 0 TL'den büyük olmalıdır.", 400);
      }
      if (!String(input.periodStart || "").trim() || !String(input.periodEnd || "").trim()) {
        throw routeError("ALLOCATION_PERIOD_REQUIRED", "Kullanım döneminin başlangıç ve bitiş tarihleri gerekir.", 400);
      }
      const item = await ledger.upsertAllocationLine({
        actor: req.user,
        roomId,
        entryId: req.params.id,
        input: {
          lineageKind: input.lineageKind || "REFERENCE",
          ...input,
        },
        prisma,
        audit,
        req,
      });
      return res.json({
        ok: true,
        item,
        ...contractFlags({ readOnly: false, confirmed: true, writeAction: true }),
      });
    }, { readOnly: false, salaryRedacted: false }),
  );

  router.post(
    `${COSTS_BASE}/:id/correction`,
    authRequired(),
    requireRole("ROOM"),
    requireRoutineRoomCostConfirmation,
    safeAsync(async (req, res) => {
      const roomId = resolveActorRoom(req);
      const body = req.body || {};
      if (body.confirmed !== true && body.confirm !== true) throw routeError("EXPLICIT_CONFIRMATION_REQUIRED", "Gider düzeltmesi için açık onay gerekir.", 400);
      if (!String(body.token ?? body.confirmationToken ?? "").trim()) throw routeError("CONFIRMATION_TOKEN_REQUIRED", "Gider düzeltmesi için açık onay belirteci gerekir.", 400);
      const input = bodyWithoutScope(body, ["version", "correctionRef", "confirmed", "confirm", "token", "confirmationToken"]);
      const result = await ledger.correctConfirmedCost({
        actor: req.user,
        roomId,
        entryId: req.params.id,
        version: body.version,
        input,
        correctionRef: body.correctionRef,
        prisma,
        audit,
        req,
      });
      return res.json({ ok: true, ...result, ...contractFlags({ readOnly: false, confirmed: true, writeAction: true }) });
    }, { readOnly: false, salaryRedacted: false }),
  );

  router.post(
    `${COSTS_BASE}/drafts`,
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    safeAsync(async (req, res) => {
      const roomId = resolveActorRoom(req);
      const input = bodyWithoutScope(req.body);
      await assertSalaryAccessIfRequested({ req, roomId, categoryKey: input.categoryKey || input.category, includeSalary: false });
      const item = await ledger.createCostDraft({ actor: req.user, roomId, input, prisma, audit, req });
      return res.status(201).json({ ok: true, item, ...contractFlags({ readOnly: false, draft: true, writeAction: true }) });
    }, { readOnly: false, salaryRedacted: false }),
  );

  router.patch(
    `${COSTS_BASE}/drafts/:id`,
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    safeAsync(async (req, res) => {
      const roomId = resolveActorRoom(req);
      const version = req.body?.version;
      const input = bodyWithoutScope(req.body, ["version"]);
      await assertSalaryAccessIfRequested({ req, roomId, categoryKey: input.categoryKey || input.category, includeSalary: false });
      const item = await ledger.updateCostDraft({ actor: req.user, roomId, draftId: req.params.id, version, input, prisma, audit, req });
      return res.json({ ok: true, item, ...contractFlags({ readOnly: false, draft: true, writeAction: true }) });
    }, { readOnly: false, salaryRedacted: false }),
  );

  router.post(
    `${COSTS_BASE}/drafts/:id/confirm`,
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    requireRoutineRoomCostConfirmation,
    safeAsync(async (req, res) => {
      const roomId = resolveActorRoom(req);
      const confirmation = bodyWithoutScope(req.body, ["version"]);
      await assertSalaryAccessIfRequested({ req, roomId, categoryKey: confirmation.categoryKey || confirmation.category, includeSalary: false });
      const item = await ledger.confirmCostDraft({
        actor: req.user,
        roomId,
        draftId: req.params.id,
        version: req.body?.version,
        confirmation: {
          ...confirmation,
          stepUpVerified: String(req.user?.role || '').trim().toUpperCase() === 'ROOM'
            || Number(req.auth?.stepUpUntil || 0) >= Date.now(),
        },
        prisma,
        audit,
        req,
      });
      return res.json({ ok: true, item, ...contractFlags({ readOnly: false, confirmed: true, writeAction: true }) });
    }, { readOnly: false, salaryRedacted: false }),
  );

  router.get(
    `${COSTS_BASE}/draft-batches/current`,
    authRequired(),
    requireRole("ROOM"),
    safeAsync(async (req, res) => {
      const roomId = resolveActorRoom(req);
      const result = await ledger.getCurrentCostBatchDraft({ actor: req.user, roomId, prisma, req });
      return res.json({ ok: true, ...result, ...contractFlags({ readOnly: true, draft: Boolean(result?.draftBatchId), salaryRedacted: false }) });
    }),
  );

  router.post(
    `${COSTS_BASE}/draft-batches`,
    authRequired(),
    requireRole("ROOM"),
    safeAsync(async (req, res) => {
      const roomId = resolveActorRoom(req);
      const input = bodyWithoutScope(req.body);
      const result = await ledger.createCostBatchDraft({ actor: req.user, roomId, input, prisma, audit, req });
      return res.status(201).json({ ok: true, ...result, ...contractFlags({ readOnly: false, draft: true, writeAction: true }) });
    }, { readOnly: false, salaryRedacted: false }),
  );

  router.post(
    `${COSTS_BASE}/draft-batches/:batchId/rows`,
    authRequired(),
    requireRole("ROOM"),
    safeAsync(async (req, res) => {
      const roomId = resolveActorRoom(req);
      const result = await ledger.createCostBatchDraftRow({
        actor: req.user,
        roomId,
        draftBatchId: req.params.batchId,
        input: bodyWithoutScope(req.body),
        prisma,
        audit,
        req,
      });
      return res.status(201).json({ ok: true, ...result, ...contractFlags({ readOnly: false, draft: true, writeAction: true }) });
    }, { readOnly: false, salaryRedacted: false }),
  );

  router.patch(
    `${COSTS_BASE}/draft-batches/:batchId/rows/:id`,
    authRequired(),
    requireRole("ROOM"),
    safeAsync(async (req, res) => {
      const roomId = resolveActorRoom(req);
      const result = await ledger.updateCostBatchDraftRow({
        actor: req.user,
        roomId,
        draftBatchId: req.params.batchId,
        draftId: req.params.id,
        version: req.body?.version,
        input: bodyWithoutScope(req.body, ["version"]),
        prisma,
        audit,
        req,
      });
      return res.json({ ok: true, ...result, ...contractFlags({ readOnly: false, draft: true, writeAction: true }) });
    }, { readOnly: false, salaryRedacted: false }),
  );

  router.delete(
    `${COSTS_BASE}/draft-batches/:batchId/rows/:id`,
    authRequired(),
    requireRole("ROOM"),
    safeAsync(async (req, res) => {
      const roomId = resolveActorRoom(req);
      const result = await ledger.removeCostBatchDraftRow({
        actor: req.user,
        roomId,
        draftBatchId: req.params.batchId,
        draftId: req.params.id,
        version: req.body?.version,
        prisma,
        audit,
        req,
      });
      return res.json({ ok: true, ...result, ...contractFlags({ readOnly: false, draft: true, writeAction: true }) });
    }, { readOnly: false, salaryRedacted: false }),
  );

  router.post(
    `${COSTS_BASE}/draft-batches/:batchId/apply`,
    authRequired(),
    requireRole("ROOM"),
    safeAsync(async (req, res) => {
      const roomId = resolveActorRoom(req);
      const confirmation = bodyWithoutScope(req.body);
      const result = await ledger.applyCostBatchDraft({ actor: req.user, roomId, draftBatchId: req.params.batchId, confirmation, prisma });
      return res.json({ ok: true, ...result, ...contractFlags({ readOnly: false, confirmed: !result.idempotent, writeAction: true }) });
    }, { readOnly: false, salaryRedacted: false }),
  );

  return router;
}
