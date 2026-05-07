import express from "express";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { rememberResponse } from "../utils/responseCache.js";
import { clearResponseCacheExact } from "../utils/responseCache.js";
import { gpsStatusFromAt } from "../gps/status.js";
import { resolveGpsSourceVisibility } from "../gps/sourceVisibility.js";
import { sanitizeAuditMeta } from "../kvkk/enforcement.js";
import { buildOperationProofSummary } from "../ops/operationProof.js";
import {
  readOperationVerificationRecords,
  upsertOperationVerificationRecord,
} from "../ops/operationVerificationRecordStore.js";

const SHIFT_EVIDENCE_STATUSES = new Set(["REQUESTED", "APPROVED", "ACTIVE", "DONE", "SPLIT", "REJECTED"]);
const MANUAL_NOTE_SCOPE_TYPES = new Set(["SHIFT", "SERVICE", "AGREEMENT", "ROUTE"]);
const MANUAL_NOTE_RECORD_PREFIX = "OPERATION_PROOF_MANUAL_NOTE";
const MANUAL_NOTE_MAX_LENGTH = 500;

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
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function buildManualNoteCheckId(accessScopeKey, scopeType, scopeId) {
  return `${MANUAL_NOTE_RECORD_PREFIX}:${accessScopeKey}:${scopeType}:${scopeId}`;
}

function isManualNoteRecord(record, accessScopeKey = "") {
  const checkId = String(record?.checkId || "");
  if (!checkId.startsWith(`${MANUAL_NOTE_RECORD_PREFIX}:`)) return false;
  if (!accessScopeKey || accessScopeKey === "global") return true;
  return checkId.startsWith(`${MANUAL_NOTE_RECORD_PREFIX}:${accessScopeKey}:`);
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

async function recordAudit({ actorUserId, actorRole, action, entity, entityId, meta }) {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: actorUserId ?? null,
        actorRole: actorRole ?? null,
        action,
        entity,
        entityId,
        meta: sanitizeAuditMeta(meta ?? null),
      },
    });
  } catch {
    // audit best-effort only
  }
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

async function resolveScope(req, res) {
  const role = normalizeUpper(req.user?.role);

  if (role === "ROOM") {
    const roomId = parsePositiveId(req.user?.roomId);
    if (!roomId) {
      res.status(400).json({ error: "room scope missing" });
      return null;
    }
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, name: true },
    });
    if (!room) {
      res.status(404).json({ error: "room not found" });
      return null;
    }
    return {
      scope: { role: "ROOM", roomId: room.id },
      cacheKey: `room:${room.id}`,
      where: { roomId: room.id },
    };
  }

  if (role === "COMPANY") {
    // COMPANY rolü, SCHOOL / ORGANIZATION dahil şirket-kind scope'larını kapsar.
    const companyId = parsePositiveId(req.user?.companyId);
    if (!companyId) {
      res.status(400).json({ error: "company scope missing" });
      return null;
    }
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, kind: true },
    });
    if (!company) {
      res.status(404).json({ error: "company not found" });
      return null;
    }
    return {
      scope: { role: "COMPANY", companyId: company.id, companyKind: company.kind },
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
      res.status(404).json({ error: "room not found" });
      return null;
    }
    return {
      scope: { role: "ROOM", roomId: room.id },
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
      res.status(404).json({ error: "company not found" });
      return null;
    }
    return {
      scope: { role: "COMPANY", companyId: company.id, companyKind: company.kind },
      cacheKey: `company:${company.id}`,
      where: { companyId: company.id },
    };
  }

  return {
    scope: { role: "SUPER_ADMIN" },
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

export function operationProofRouter() {
  const r = express.Router();

  r.use(authRequired(), requireRole("SUPER_ADMIN", "ROOM", "COMPANY"));

  // GET /api/operation-proof/summary
  r.get(
    "/summary",
    asyncHandler(async (req, res) => {
      const resolvedScope = await resolveScope(req, res);
      if (!resolvedScope) return;

      const payload = await rememberResponse(
        `operation-proof:summary:${resolvedScope.cacheKey}`,
        () => buildOperationProofPayload(resolvedScope),
        {
          ttlMs: 15000,
          scope: resolvedScope.scope,
        }
      );

      return res.json(payload);
    })
  );

  // POST /api/operation-proof/manual-note
  r.post(
    "/manual-note",
    asyncHandler(async (req, res) => {
      const resolvedScope = await resolveScope(req, res);
      if (!resolvedScope) return;

      const scopeType = normalizeUpper(req.body?.scopeType);
      const scopeId = normalizeText(req.body?.scopeId);
      const note = normalizeNoteText(req.body?.note);

      if (!MANUAL_NOTE_SCOPE_TYPES.has(scopeType)) {
        return res.status(400).json({ error: "Geçerli kapsam türü girin." });
      }
      if (!hasText(scopeId)) {
        return res.status(400).json({ error: "Kapsam bilgisi gerekli." });
      }
      if (!hasText(note)) {
        return res.status(400).json({ error: "Not girin." });
      }
      if (note.length > MANUAL_NOTE_MAX_LENGTH) {
        return res.status(400).json({ error: "Not en fazla 500 karakter olabilir." });
      }

      const accessScopeKey = resolvedScope.cacheKey || "global";
      const checkId = buildManualNoteCheckId(accessScopeKey, scopeType, scopeId);
      const saved = await upsertOperationVerificationRecord(
        {
          roleId: normalizeUpper(req.user?.role) || "SUPER_ADMIN",
          checkId,
          status: "KABUL",
          proofType: "OPERATOR_NOTE",
          note,
          evidenceRef: `${scopeType}:${scopeId}`,
        },
        req.user || null
      );

      await clearResponseCacheExact("operation-proof:summary", resolvedScope.scope);

      await recordAudit({
        actorUserId: req.user?.id ?? null,
        actorRole: req.user?.role ?? null,
        action: "OPERATION_PROOF_MANUAL_NOTE",
        entity: "OperationProof",
        entityId: saved?.id || checkId,
        meta: {
          accessScopeKey,
          scopeType,
          scopeId,
          noteLength: note.length,
          notePreview: note.slice(0, 120),
        },
      });

      return res.json({
        ok: true,
        message: "Operatör notu kaydedildi.",
        proofSignal: "MANUAL_OPERATOR_NOTE",
        notePreview: note.slice(0, 120),
        nonFinalText: "Bu özet hakediş için nihai karar değildir",
      });
    })
  );

  return r;
}
