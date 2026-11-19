import { httpError } from "../errors/http.js";
import {
  ACCOUNTING_PERIOD_STATUS,
  buildAccountingPeriodReadiness,
  transitionAccountingPeriod,
} from "./roomAccountingPeriod.js";

function positiveId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function dateOnly(value, field) {
  const text = value instanceof Date ? value.toISOString().slice(0, 10) : String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw httpError(422, "ACCOUNTING_PERIOD_DATE_INVALID", `${field} geçerli bir tarih olmalıdır.`);
  }
  return text;
}

function assertRoomActor(actor, roomId) {
  const requestedRoomId = positiveId(roomId);
  if (String(actor?.role || "").toUpperCase() !== "ROOM" || positiveId(actor?.roomId) !== requestedRoomId) {
    throw httpError(403, "ACCOUNTING_PERIOD_ROOM_SCOPE_REQUIRED", "Muhasebe dönemi yalnızca aynı ROOM firması içinde yönetilebilir.");
  }
  return requestedRoomId;
}

function serializePeriod(row, readiness = null) {
  return {
    id: positiveId(row?.id),
    roomId: positiveId(row?.roomId),
    periodStart: row?.periodStart instanceof Date ? row.periodStart.toISOString().slice(0, 10) : row?.periodStart || null,
    periodEnd: row?.periodEnd instanceof Date ? row.periodEnd.toISOString().slice(0, 10) : row?.periodEnd || null,
    status: String(row?.status || ACCOUNTING_PERIOD_STATUS.OPEN).toUpperCase(),
    version: Number(row?.version || 1),
    closeReason: row?.closeReason || null,
    reopenReason: row?.reopenReason || null,
    policyDecisionRef: row?.policyDecisionRef || null,
    readiness: readiness || null,
    createdAt: row?.createdAt instanceof Date ? row.createdAt.toISOString() : row?.createdAt || null,
    updatedAt: row?.updatedAt instanceof Date ? row.updatedAt.toISOString() : row?.updatedAt || null,
  };
}

function periodWhere(roomId, periodStart, periodEnd) {
  return {
    roomId_periodStart_periodEnd: {
      roomId,
      periodStart: new Date(`${periodStart}T00:00:00.000Z`),
      periodEnd: new Date(`${periodEnd}T00:00:00.000Z`),
    },
  };
}

async function writeAudit(audit, req, payload) {
  if (typeof audit === "function") await audit(req, payload);
}

export async function ensureAccountingPeriod({ prisma, actor, roomId, periodStart, periodEnd, audit, req } = {}) {
  const requestedRoomId = assertRoomActor(actor, roomId);
  const start = dateOnly(periodStart, "Dönem başlangıcı");
  const end = dateOnly(periodEnd, "Dönem bitişi");
  if (start > end) throw httpError(422, "ACCOUNTING_PERIOD_ORDER_INVALID", "Dönem başlangıcı bitişinden sonra olamaz.");
  const where = periodWhere(requestedRoomId, start, end);
  const existing = await prisma.roomAccountingPeriod.findUnique({ where });
  if (existing) return serializePeriod(existing);
  const created = await prisma.roomAccountingPeriod.create({
    data: {
      roomId: requestedRoomId,
      periodStart: where.roomId_periodStart_periodEnd.periodStart,
      periodEnd: where.roomId_periodStart_periodEnd.periodEnd,
      status: ACCOUNTING_PERIOD_STATUS.OPEN,
      createdByUserId: positiveId(actor?.id),
      updatedByUserId: positiveId(actor?.id),
    },
  });
  await writeAudit(audit, req, {
    action: "ROOM_ACCOUNTING_PERIOD_CREATED",
    entity: "RoomAccountingPeriod",
    entityId: created.id,
    meta: { roomId: requestedRoomId, periodStart: start, periodEnd: end, status: created.status },
  });
  return serializePeriod(created);
}

export async function getAccountingPeriod({ prisma, actor, roomId, periodStart, periodEnd, readiness = null } = {}) {
  const requestedRoomId = assertRoomActor(actor, roomId);
  const start = dateOnly(periodStart, "Dönem başlangıcı");
  const end = dateOnly(periodEnd, "Dönem bitişi");
  if (start > end) throw httpError(422, "ACCOUNTING_PERIOD_ORDER_INVALID", "Dönem başlangıcı bitişinden sonra olamaz.");
  const row = await prisma.roomAccountingPeriod.findUnique({ where: periodWhere(requestedRoomId, start, end) });
  if (row) return serializePeriod(row, readiness);
  return serializePeriod({
    id: null,
    roomId: requestedRoomId,
    periodStart: start,
    periodEnd: end,
    status: ACCOUNTING_PERIOD_STATUS.OPEN,
    version: 0,
  }, readiness);
}

export async function transitionAccountingPeriodRecord({
  prisma,
  actor,
  roomId,
  periodStart,
  periodEnd,
  targetStatus,
  confirmed = false,
  reason = null,
  readiness = null,
  policyApproved = false,
  audit,
  req,
} = {}) {
  const requestedRoomId = assertRoomActor(actor, roomId);
  const current = await ensureAccountingPeriod({ prisma, actor, roomId: requestedRoomId, periodStart, periodEnd, audit, req });
  const normalizedReadiness = readiness && typeof readiness.readyForClose === "boolean"
    ? readiness
    : buildAccountingPeriodReadiness({ status: current.status, blockers: readiness?.blockers, missing: readiness?.missing });
  const decision = transitionAccountingPeriod({
    fromStatus: current.status,
    toStatus: targetStatus,
    actorRole: actor?.role,
    confirmed,
    reason,
    readiness: normalizedReadiness,
    policyApproved,
  });
  if (!decision.allowed) {
    const error = httpError(
      decision.reason === "ACCOUNTING_POLICY_APPROVAL_REQUIRED" ? 409 : 422,
      decision.reason,
      decision.reason === "PERIOD_BLOCKERS_REMAIN" ? "Dönem kapanış hazırlığında eksik kanıtlar bulunuyor." : "Muhasebe dönemi geçişi tamamlanamadı.",
    );
    if (decision.blockers) error.blockers = decision.blockers;
    throw error;
  }
  if (decision.idempotent) return current;

  const start = dateOnly(periodStart, "Dönem başlangıcı");
  const end = dateOnly(periodEnd, "Dönem bitişi");
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.roomAccountingPeriod.findUnique({ where: periodWhere(requestedRoomId, start, end) });
    if (!row) throw httpError(404, "ACCOUNTING_PERIOD_NOT_FOUND", "Muhasebe dönemi bulunamadı.");
    const version = Number(row.version || 1);
    const result = typeof tx.roomAccountingPeriod.updateMany === "function"
      ? await tx.roomAccountingPeriod.updateMany({
        where: { id: row.id, roomId: requestedRoomId, version },
        data: {
          status: decision.status,
          version: version + 1,
          updatedByUserId: positiveId(actor?.id),
          closeReason: decision.status === ACCOUNTING_PERIOD_STATUS.CLOSED ? String(reason || "").trim() || null : row.closeReason || null,
          reopenReason: decision.status === ACCOUNTING_PERIOD_STATUS.REOPEN_REQUESTED ? String(reason || "").trim() || null : row.reopenReason || null,
          ...(decision.status === ACCOUNTING_PERIOD_STATUS.CLOSED ? { closedByUserId: positiveId(actor?.id), closedAt: new Date() } : {}),
          ...(decision.status === ACCOUNTING_PERIOD_STATUS.REOPEN_REQUESTED ? { reopenRequestedByUserId: positiveId(actor?.id), reopenRequestedAt: new Date() } : {}),
        },
      })
      : null;
    if (result && Number(result.count) !== 1) throw httpError(409, "ACCOUNTING_PERIOD_VERSION_CONFLICT", "Muhasebe dönemi başka bir işlemle değişti; tekrar okuyun.");
    const next = result
      ? await tx.roomAccountingPeriod.findUnique({ where: { id: row.id } })
      : await tx.roomAccountingPeriod.update({ where: { id: row.id }, data: { status: decision.status, version: version + 1, updatedByUserId: positiveId(actor?.id) } });
    return next;
  });
  const actionByStatus = {
    [ACCOUNTING_PERIOD_STATUS.REVIEW]: "ROOM_ACCOUNTING_PERIOD_REVIEW_STARTED",
    [ACCOUNTING_PERIOD_STATUS.READY_TO_CLOSE]: "ROOM_ACCOUNTING_PERIOD_READY_TO_CLOSE",
    [ACCOUNTING_PERIOD_STATUS.CLOSED]: "ROOM_ACCOUNTING_PERIOD_CLOSED",
    [ACCOUNTING_PERIOD_STATUS.REOPEN_REQUESTED]: "ROOM_ACCOUNTING_PERIOD_REOPEN_REQUESTED",
    [ACCOUNTING_PERIOD_STATUS.REOPENED]: "ROOM_ACCOUNTING_PERIOD_REOPENED",
    [ACCOUNTING_PERIOD_STATUS.OPEN]: "ROOM_ACCOUNTING_PERIOD_REOPENED",
  };
  await writeAudit(audit, req, {
    action: actionByStatus[decision.status] || "ROOM_ACCOUNTING_PERIOD_UPDATED",
    entity: "RoomAccountingPeriod",
    entityId: updated.id,
    meta: {
      roomId: requestedRoomId,
      periodStart: start,
      periodEnd: end,
      previousStatus: current.status,
      status: decision.status,
      reason: String(reason || "").trim() || null,
    },
  });
  return serializePeriod(updated, normalizedReadiness);
}

export function serializeAccountingPeriod(row, readiness = null) {
  return serializePeriod(row, readiness);
}
