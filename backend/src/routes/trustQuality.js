import express from "express";
import { prisma } from "../prisma.js";
import { authRequired, requireRole, requireStepUpWrite } from "../auth/middleware.js";
import { audit } from "../audit.js";
import {
  getTrustQualityManifest,
  buildServiceEvaluationTemplate,
  buildProviderSignalTemplate,
  buildCompanyServiceEvaluationSummary,
  buildCompanyServiceEvaluationItems,
  submitCompanyServiceEvaluation,
  getProviderScore,
} from "../ops/trustQualityManifest.js";
import { buildOperationProofSummary } from "../ops/operationProof.js";
import { buildQualityProofSignalSummary } from "../ops/qualityProofSignals.js";
import { buildQualityDraftScore } from "../ops/qualityDraftScore.js";
import {
  QUALITY_REVIEW_STATUSES,
  buildQualityReviewDecisionSummary,
  buildQualityReviewHistorySummary,
  normalizeQualityReviewDecision,
} from "../ops/qualityReviewDecision.js";
import {
  findLatestQualityReviewDecisionRecord,
  readQualityReviewDecisionRecords,
  upsertQualityReviewDecisionRecord,
} from "../ops/qualityReviewDecisionStore.js";
import { readOperationVerificationRecords } from "../ops/operationVerificationRecordStore.js";
import { gpsStatusFromAt } from "../gps/status.js";
import { resolveGpsSourceVisibility } from "../gps/sourceVisibility.js";
import { clearResponseCache, rememberResponse } from "../utils/responseCache.js";

const SHIFT_EVIDENCE_STATUSES = new Set(["REQUESTED", "APPROVED", "ACTIVE", "DONE", "SPLIT", "REJECTED"]);

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeUpper(value) {
  return normalizeText(value).toUpperCase();
}

function parsePositiveId(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
}

function hasText(value) {
  return normalizeText(value).length > 0;
}

function normalizeNoteText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeReviewNoteText(value) {
  return normalizeNoteText(value).slice(0, 500);
}

function normalizeReviewScopeType(value) {
  const normalized = normalizeUpper(value);
  return ["SHIFT", "SERVICE", "AGREEMENT", "ROUTE", "QUALITY_DRAFT_SCORE"].includes(normalized) ? normalized : "";
}

function normalizeReviewScopeId(value) {
  return normalizeNoteText(value).slice(0, 160);
}

function buildReviewDecisionScopeKey(scopeType, scopeId) {
  const type = normalizeReviewScopeType(scopeType);
  const id = normalizeReviewScopeId(scopeId);
  return type && id ? `${type}:${id}` : "";
}

function payloadObject(value) {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function isNoBoardNotification(notification) {
  const payload = payloadObject(notification?.payloadJson);
  const kind = normalizeUpper(payload?.kind);
  const requestKind = normalizeUpper(payload?.requestKind);
  return requestKind === "NO_SHOW" || kind === "BOARDING_CHANGE_REQUEST_NO_SHOW";
}

function isManualOperatorNoteNotification(notification) {
  const payload = payloadObject(notification?.payloadJson);
  const kind = normalizeUpper(payload?.kind);
  const requestKind = normalizeUpper(payload?.requestKind);
  return requestKind === "OPERATION_NOTE" || kind.includes("OPERATION_NOTE");
}

function hasManualNote(shift) {
  return [
    shift?.companyOfferNote,
    shift?.roomOfferNote,
    shift?.roomOfferDecisionNote,
    shift?.roomOfferDriverNote,
    shift?.extendNoteCompany,
    shift?.extendNoteRoom,
  ].some(hasText);
}

function buildShiftSignalFlags(shift) {
  const status = normalizeUpper(shift?.status);
  const gpsLastAt = shift?.vehicle?.gpsLast?.at || null;
  const gpsFreshness = gpsLastAt ? gpsStatusFromAt(gpsLastAt) : { status: "OFFLINE", ageSec: null };
  const sourceKey = normalizeUpper(shift?.vehicle?.gpsState?.lastSource) || "BACKEND_VEHICLE_GPS";
  const sourceVisibility = resolveGpsSourceVisibility({
    officialSourceKey: sourceKey,
    freshness: gpsFreshness.status,
    hasActiveShift: status === "ACTIVE",
  });
  const checkinEvents = Array.isArray(shift?.checkinEvents) ? shift.checkinEvents : [];
  const notifications = Array.isArray(shift?.notifications) ? shift.notifications : [];

  return {
    shiftStarted: Boolean(shift?.progress?.startedAt || status === "ACTIVE" || status === "DONE"),
    shiftCompleted: Boolean(shift?.progress?.completedAt || status === "DONE"),
    gpsSeen: Boolean(gpsLastAt || shift?.vehicle?.gpsState?.lastSource),
    driverPhoneGpsSeen: Boolean(sourceVisibility.isDriverPhone && gpsLastAt),
    vehicleGpsSeen: Boolean(sourceVisibility.isVehicleOfficial && gpsLastAt),
    boardingRecorded: checkinEvents.some((event) => normalizeUpper(event?.eventType) === "BOARD"),
    noBoardRecorded: notifications.some(isNoBoardNotification),
    etaAvailable: Boolean(gpsLastAt && status !== "DRAFT"),
    manualOperatorNote: hasManualNote(shift) || notifications.some(isManualOperatorNoteNotification),
  };
}

function isManualNoteRecord(record, accessScopeKey = "") {
  const checkId = String(record?.checkId || "");
  if (!checkId.startsWith("OPERATION_PROOF_MANUAL_NOTE:")) return false;
  if (!accessScopeKey || accessScopeKey === "global") return true;
  return checkId.startsWith(`OPERATION_PROOF_MANUAL_NOTE:${accessScopeKey}:`);
}

function collectManualNotesForScope(records, accessScopeKey = "") {
  const items = Array.isArray(records) ? records : [];
  return items
    .filter((item) => isManualNoteRecord(item, accessScopeKey))
    .sort((a, b) => String(b?.updatedAt || b?.createdAt || "").localeCompare(String(a?.updatedAt || a?.createdAt || "")))
    .map((item) => ({
      note: normalizeNoteText(item?.note || ""),
      proofType: String(item?.proofType || ""),
      checkId: String(item?.checkId || ""),
      updatedAt: item?.updatedAt || item?.createdAt || null,
    }))
    .filter((item) => hasText(item.note));
}

async function resolveQualityScope(req, res) {
  const role = normalizeUpper(req.user?.role);

  if (role === "ROOM") {
    const roomId = parsePositiveId(req.user?.roomId);
    if (!roomId) {
      res.status(400).json({ error: "Oda kapsamı eksik." });
      return null;
    }
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, name: true },
    });
    if (!room) {
      res.status(404).json({ error: "Oda bulunamadı." });
      return null;
    }
    return {
      scope: { role: "ROOM", roomId: room.id, userId: Number(req.user?.id || 0) || null },
      cacheKey: `room:${room.id}`,
      where: { roomId: room.id },
    };
  }

  if (["COMPANY", "SCHOOL", "ORGANIZATION"].includes(role)) {
    const companyId = parsePositiveId(req.user?.companyId);
    if (!companyId) {
      res.status(400).json({ error: "Firma kapsamı eksik." });
      return null;
    }
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, kind: true },
    });
    if (!company) {
      res.status(404).json({ error: "Firma bulunamadı." });
      return null;
    }
    return {
      scope: { role, companyId: company.id, companyKind: company.kind, userId: Number(req.user?.id || 0) || null },
      cacheKey: `company:${company.id}`,
      where: { companyId: company.id },
    };
  }

  const companyId = parsePositiveId(req.query?.companyId);
  const roomId = parsePositiveId(req.query?.roomId);

  if (roomId) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, name: true },
    });
    if (!room) {
      res.status(404).json({ error: "Oda bulunamadı." });
      return null;
    }
    return {
      scope: { role: "ROOM", roomId: room.id, userId: Number(req.user?.id || 0) || null },
      cacheKey: `room:${room.id}`,
      where: { roomId: room.id },
    };
  }

  if (companyId) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, kind: true },
    });
    if (!company) {
      res.status(404).json({ error: "Firma bulunamadı." });
      return null;
    }
    return {
      scope: { role: "SUPER_ADMIN", companyId: company.id, companyKind: company.kind, userId: Number(req.user?.id || 0) || null },
      cacheKey: `company:${company.id}`,
      where: { companyId: company.id },
    };
  }

  return {
    scope: { role: "SUPER_ADMIN", userId: Number(req.user?.id || 0) || null },
    cacheKey: "global",
    where: {},
  };
}

async function buildOperationProofPayload(resolvedScope) {
  const shifts = await prisma.shift.findMany({
    where: {
      ...resolvedScope.where,
      status: { in: Array.from(SHIFT_EVIDENCE_STATUSES) },
    },
    orderBy: [{ startAt: "desc" }, { id: "desc" }],
    take: 20,
    select: {
      id: true,
      companyId: true,
      roomId: true,
      status: true,
      startAt: true,
      endAt: true,
      companyOfferNote: true,
      roomOfferNote: true,
      roomOfferDecisionNote: true,
      roomOfferDriverNote: true,
      extendNoteCompany: true,
      extendNoteRoom: true,
      progress: {
        select: {
          startedAt: true,
          completedAt: true,
        },
      },
      vehicle: {
        select: {
          id: true,
          gpsLast: { select: { at: true } },
          gpsState: {
            select: {
              lastSource: true,
              lastUiStatus: true,
              lastChangedAt: true,
              seenLiveAt: true,
            },
          },
        },
      },
      checkinEvents: {
        select: {
          eventType: true,
          source: true,
          at: true,
        },
      },
      notifications: {
        select: {
          type: true,
          payloadJson: true,
          createdAt: true,
        },
      },
    },
  });

  const counts = {
    shiftStartedCount: 0,
    shiftCompletedCount: 0,
    gpsSeenCount: 0,
    driverPhoneGpsSeenCount: 0,
    vehicleGpsSeenCount: 0,
    boardingRecordedCount: 0,
    noBoardRecordedCount: 0,
    etaAvailableCount: 0,
    manualOperatorNoteCount: 0,
  };

  for (const shift of shifts) {
    const signalFlags = buildShiftSignalFlags(shift);
    if (signalFlags.shiftStarted) counts.shiftStartedCount += 1;
    if (signalFlags.shiftCompleted) counts.shiftCompletedCount += 1;
    if (signalFlags.gpsSeen) counts.gpsSeenCount += 1;
    if (signalFlags.driverPhoneGpsSeen) counts.driverPhoneGpsSeenCount += 1;
    if (signalFlags.vehicleGpsSeen) counts.vehicleGpsSeenCount += 1;
    if (signalFlags.boardingRecorded) counts.boardingRecordedCount += 1;
    if (signalFlags.noBoardRecorded) counts.noBoardRecordedCount += 1;
    if (signalFlags.etaAvailable) counts.etaAvailableCount += 1;
    if (signalFlags.manualOperatorNote) counts.manualOperatorNoteCount += 1;
  }

  const allVerificationRecords = await readOperationVerificationRecords();
  const manualNotes = collectManualNotesForScope(allVerificationRecords, resolvedScope.cacheKey);

  return buildOperationProofSummary({
    scope: resolvedScope.scope,
    ...counts,
    manualNotes,
  });
}

async function buildDraftScorePayload(resolvedScope) {
  const proofSummary = await buildOperationProofPayload(resolvedScope);
  const scopeRole = String(resolvedScope.scope?.role || "").toUpperCase();
  const companySummary = scopeRole === "ROOM"
    ? null
    : await buildCompanyServiceEvaluationSummary({ companyId: Number(resolvedScope.scope?.companyId || 0) || 0 });
  const qualitySummary = buildQualityProofSignalSummary({
    scope: resolvedScope.scope,
    proofSummary,
    serviceSummary: companySummary,
  });

  return buildQualityDraftScore({
    scope: resolvedScope.scope,
    proofSummary,
    qualitySummary,
    serviceSummary: companySummary,
  });
}

async function buildQualityReviewDecisionPayload(resolvedScope, reviewScopeKey) {
  const draftScorePayload = await buildDraftScorePayload(resolvedScope);
  const reviewRecord = await findLatestQualityReviewDecisionRecord("QUALITY_DRAFT_SCORE", reviewScopeKey);
  return buildQualityReviewDecisionSummary({
    draftScoreSummary: draftScorePayload,
    reviewStatus: reviewRecord?.reviewStatus || QUALITY_REVIEW_STATUSES.REVIEW_PENDING,
  });
}

export function trustQualityRouter() {
  const r = express.Router();

  function userScope(user) {
    return {
      role: user?.role,
      companyId: user?.companyId,
      roomId: user?.roomId,
      userId: user?.id,
    };
  }

  r.get("/manifest", authRequired(), async (_req, res) => res.json(getTrustQualityManifest()));
  r.get("/evaluation-template", authRequired(), async (req, res) => {
    const payload = await rememberResponse("trust-quality:evaluation-template", () => buildServiceEvaluationTemplate(), { ttlMs: 60000, scope: userScope(req.user) });
    return res.json(payload);
  });
  r.get("/provider-signal-template", authRequired(), async (req, res) => {
    const payload = await rememberResponse("trust-quality:provider-signal-template", () => buildProviderSignalTemplate(), { ttlMs: 60000, scope: userScope(req.user) });
    return res.json(payload);
  });

  r.get("/company/summary", authRequired(), requireRole("COMPANY", "SUPER_ADMIN"), async (req, res) => {
    const payload = await rememberResponse("trust-quality:company-summary", () => buildCompanyServiceEvaluationSummary(req.user), { ttlMs: 45000, scope: userScope(req.user) });
    return res.json(payload);
  });
  function applyTakeLimit(list, take) {
    return list.slice(0, take);
  }

  r.get("/company/items", authRequired(), requireRole("COMPANY", "SUPER_ADMIN"), async (req, res) => {
    const q = String(req.query?.q || "").trim().toLowerCase();
    const take = Math.min(200, Math.max(1, Number(req.query?.take || 60) || 60));
    const pendingOnly = String(req.query?.pendingOnly || "") === "1" || String(req.query?.pendingOnly || "").toLowerCase() === "true";

    const cacheKey = `trust-quality:company-items:${take}:${pendingOnly ? 1 : 0}:${q}`;
    const list = await rememberResponse(cacheKey, async () => {
      return buildCompanyServiceEvaluationItems(req.user, { pendingOnly, q, take });
    }, { ttlMs: 45000, scope: userScope(req.user) });
    const items = applyTakeLimit(list, take);
    return res.json({ items, meta: { take, pendingOnly, q } });
  });
  r.post("/company/evaluations", authRequired(), requireRole("COMPANY", "SUPER_ADMIN"), requireStepUpWrite("COMPANY", "SUPER_ADMIN"), async (req, res) => {
    try {
      const saved = await submitCompanyServiceEvaluation(req.user, req.body || {});
      clearResponseCache("trust-quality:", userScope(req.user));
      return res.json({ ok: true, item: saved });
    } catch (e) {
      return res.status(400).json({ ok: false, message: e?.message || String(e) });
    }
  });
  r.get("/provider-score/:roomId", authRequired(), requireRole("COMPANY", "SCHOOL", "ORGANIZATION", "SUPER_ADMIN"), async (req, res) => {
    const roomId = Number(req.params.roomId || 0) || 0;
    const payload = await rememberResponse(`trust-quality:provider-score:${roomId}`, () => getProviderScore(roomId), { ttlMs: 45000, scope: userScope(req.user) });
    return res.json(payload);
  });
  r.get("/provider-scores", authRequired(), requireRole("COMPANY", "SCHOOL", "ORGANIZATION", "SUPER_ADMIN"), async (req, res) => {
    const ids = String(req.query.roomIds || '')
      .split(',')
      .map((x) => Number(x || 0))
      .filter((x) => Number.isFinite(x) && x > 0)
      .slice(0, 200);
    const uniqueIds = Array.from(new Set(ids));
    const byId = {};
    await Promise.all(uniqueIds.map(async (roomId) => {
      byId[String(roomId)] = await rememberResponse(`trust-quality:provider-score:${roomId}`, () => getProviderScore(roomId), { ttlMs: 45000, scope: userScope(req.user) });
    }));
    return res.json({ byId, count: uniqueIds.length });
  });

  // GET /api/trust-quality/proof-signals/summary
  r.get("/proof-signals/summary", authRequired(), requireRole("SUPER_ADMIN", "ROOM", "COMPANY", "SCHOOL", "ORGANIZATION"), async (req, res) => {
    const resolvedScope = await resolveQualityScope(req, res);
    if (!resolvedScope) return;

    const payload = await rememberResponse(
      `trust-quality:proof-signals:${resolvedScope.cacheKey}`,
      async () => {
        const proofSummary = await buildOperationProofPayload(resolvedScope);
        const scopeRole = String(resolvedScope.scope?.role || "").toUpperCase();
        const companySummary = scopeRole === "ROOM"
          ? null
          : await buildCompanyServiceEvaluationSummary({ companyId: Number(resolvedScope.scope?.companyId || 0) || 0 });
        const providerScore = scopeRole === "ROOM"
          ? await getProviderScore(resolvedScope.scope?.roomId)
          : null;

        return buildQualityProofSignalSummary({
          scope: resolvedScope.scope,
          proofSummary,
          serviceSummary: companySummary,
          providerScore,
        });
      },
      { ttlMs: 15000, scope: resolvedScope.scope }
    );

    return res.json(payload);
  });

  // GET /api/trust-quality/draft-score/summary
  r.get("/draft-score/summary", authRequired(), requireRole("SUPER_ADMIN", "ROOM", "COMPANY", "SCHOOL", "ORGANIZATION"), async (req, res) => {
    const resolvedScope = await resolveQualityScope(req, res);
    if (!resolvedScope) return;

    const payload = await rememberResponse(
      `trust-quality:draft-score:${resolvedScope.cacheKey}`,
      async () => buildDraftScorePayload(resolvedScope),
      { ttlMs: 15000, scope: resolvedScope.scope }
    );

    return res.json(payload);
  });

  // GET /api/trust-quality/review-decision/summary
  r.get("/review-decision/summary", authRequired(), requireRole("SUPER_ADMIN", "ROOM", "COMPANY", "SCHOOL", "ORGANIZATION"), async (req, res) => {
    const resolvedScope = await resolveQualityScope(req, res);
    if (!resolvedScope) return;

    const reviewScopeKey = buildReviewDecisionScopeKey("QUALITY_DRAFT_SCORE", resolvedScope.cacheKey || "global");
    const payload = await rememberResponse(
      `trust-quality:review-decision:${reviewScopeKey}`,
      async () => buildQualityReviewDecisionPayload(resolvedScope, resolvedScope.cacheKey || "global"),
      { ttlMs: 15000, scope: resolvedScope.scope }
    );

    return res.json(payload);
  });

  // GET /api/trust-quality/review-decision/history
  r.get("/review-decision/history", authRequired(), requireRole("SUPER_ADMIN", "ROOM", "COMPANY", "SCHOOL", "ORGANIZATION"), async (req, res) => {
    const resolvedScope = await resolveQualityScope(req, res);
    if (!resolvedScope) return;

    const scopeRole = String(resolvedScope.scope?.role || "").toUpperCase();
    const scopeKey = buildReviewDecisionScopeKey("QUALITY_DRAFT_SCORE", resolvedScope.cacheKey || "global");
    const historyScopeKey = `QUALITY_DRAFT_SCORE:${resolvedScope.cacheKey || "global"}`;
    // note preview limit: cleanText(record?.note, 120)
    // Bu geçmiş kesin kalite puanı değildir. Bu geçmiş hakediş veya komisyon hesabını etkilemez. Sağlayıcı sıralaması değildir.
    const records = await readQualityReviewDecisionRecords();
    const visibleRecords = scopeRole === "SUPER_ADMIN" && (resolvedScope.cacheKey || "global") === "global"
      ? records
      : records.filter((item) => buildReviewDecisionScopeKey(item?.scopeType, item?.scopeId) === historyScopeKey);

    const payload = await rememberResponse(
      `trust-quality:review-decision-history:${scopeRole}:${resolvedScope.cacheKey || "global"}`,
      async () => buildQualityReviewHistorySummary({
        historyRecords: visibleRecords.slice(0, 10),
        scopeKey,
      }),
      { ttlMs: 15000, scope: resolvedScope.scope }
    );

    return res.json(payload);
  });

  // POST /api/trust-quality/review-decision
  r.post("/review-decision", authRequired(), requireRole("SUPER_ADMIN", "ROOM", "COMPANY", "SCHOOL", "ORGANIZATION"), async (req, res) => {
    try {
      const resolvedScope = await resolveQualityScope(req, res);
      if (!resolvedScope) return;

      const scopeType = normalizeReviewScopeType(req.body?.scopeType);
      const scopeId = normalizeReviewScopeId(req.body?.scopeId);
      const decision = normalizeQualityReviewDecision(req.body?.decision);
      const note = normalizeReviewNoteText(req.body?.note);
      const expectedScopeId = normalizeReviewScopeId(resolvedScope.cacheKey || "global");

      if (!scopeType) {
        return res.status(400).json({ ok: false, message: "Kapsam türü gerekli." });
      }
      if (!scopeId) {
        return res.status(400).json({ ok: false, message: "Kapsam bilgisi gerekli." });
      }
      if (!decision || decision === QUALITY_REVIEW_STATUSES.REVIEW_PENDING) {
        return res.status(400).json({ ok: false, message: "Geçersiz kalite inceleme kararı." });
      }
      if (scopeId !== expectedScopeId) {
        return res.status(400).json({ ok: false, message: "Kapsam bu kullanıcı için geçerli değil." });
      }

      const saved = await upsertQualityReviewDecisionRecord({
        scopeType,
        scopeId,
        reviewStatus: decision,
        note,
      }, req.user || null);

      clearResponseCache("trust-quality:review-decision:", resolvedScope.scope);
      clearResponseCache("trust-quality:review-decision-history:", resolvedScope.scope);
      await audit(req, {
        action: "QUALITY_REVIEW_DECISION",
        entity: "QualityReviewDecision",
        entityId: null,
        meta: {
          scopeType: saved?.scopeType || scopeType,
          scopeId: saved?.scopeId || scopeId,
          reviewStatus: saved?.reviewStatus || decision,
          notePreview: note.slice(0, 120),
        },
      });

      return res.json({
        ok: true,
        message: "Kalite inceleme kararı kaydedildi.",
        reviewStatus: saved?.reviewStatus || decision,
        notePreview: note.slice(0, 120),
        nonFinalText: "Bu karar kesin kalite puanı değildir",
        paymentImpactText: "Bu karar hakediş veya komisyon hesabını etkilemez",
      });
    } catch (e) {
      return res.status(400).json({ ok: false, message: e?.message || "Kalite inceleme kararı kaydedilemedi." });
    }
  });

  return r;
}
