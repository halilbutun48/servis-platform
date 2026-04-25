import express from "express";
import { authRequired, requireRole } from "../auth/middleware.js";
import { audit } from "../audit.js";
import { prisma } from "../prisma.js";
import { createAndEmitNotification } from "../notifications/service.js";
import { getPersonelIdOrThrow } from "./shifts/helpers.js";
import { cancelPenalty, createNoShowPenalty, normalizePenalty } from "../lib/penalties.js";

const SELF_NO_SHOW_SHIFT_SELECT = {
  id: true,
  driverId: true,
  vehicleId: true,
  roomId: true,
  companyId: true,
  status: true,
  startAt: true,
  endAt: true,
  driver: { select: { id: true, fullName: true } },
  vehicle: { select: { id: true, plate: true } },
  room: { select: { id: true, name: true } },
  company: { select: { id: true, name: true } },
};

function httpError(status, code, message) {
  const err = new Error(message || code || "Error");
  err.status = status;
  err.code = code || null;
  return err;
}

function trimOrNull(v) {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function buildNoShowMessage(targetName, stopName, canSkipStop) {
  const base = `${targetName || "Bir kişi"} bugün gelmeyecek.`;
  const stopPart = stopName ? ` Durak: ${stopName}.` : "";
  const suggestion = canSkipStop
    ? " Bu durakta başka kimse yok; durağı atlamayı düşünebilirsiniz."
    : " Bu durakta başka yolcular da var; durağı atlamamalısınız.";
  return `${base}${stopPart}${suggestion}`;
}

async function resolveSelfNoShowContext(req) {
  const now = new Date();
  const role = String(req.user?.role || "").toUpperCase();

  if (role === "PERSONEL") {
    const personelId = await getPersonelIdOrThrow(req.user);
    const personel = await prisma.personel.findUnique({
      where: { id: personelId },
      select: { id: true, fullName: true },
    });
    const latestReq = await prisma.pickupRequest.findFirst({
      where: { personelId, status: { in: ["OPEN", "ACCEPTED"] } },
      orderBy: { createdAt: "desc" },
      select: { shiftId: true },
    });
    if (!latestReq?.shiftId) throw httpError(404, "NO_ACTIVE_SHIFT", "Aktif vardiya bulunamadı.");

    const shift = await prisma.shift.findUnique({
      where: { id: Number(latestReq.shiftId) },
      select: SELF_NO_SHOW_SHIFT_SELECT,
    });
    if (!shift) throw httpError(404, "SHIFT_NOT_FOUND", "Vardiya bulunamadı.");
    if (!["APPROVED", "ACTIVE"].includes(String(shift.status || "").toUpperCase())) {
      throw httpError(409, "SHIFT_NOT_ACTIVE", "Bu vardiya aktif değil.");
    }

    const assignment = await prisma.stopAssignment.findFirst({
      where: { shiftId: shift.id, personelId },
      select: {
        id: true,
        stopId: true,
        stop: { select: { id: true, name: true, order: true } },
      },
    });

    return {
      personelId,
      targetName: personel?.fullName || `#${personelId}`,
      shift,
      assignment,
      requestedAt: now,
    };
  }

  if (role === "PARENT") {
    const childId = Number(req.body?.childId ?? req.body?.personelId ?? 0);
    if (!childId) throw httpError(400, "BAD_CHILD_ID", "childId gerekli.");

    const link = await prisma.parentChild.findFirst({
      where: { parentUserId: req.user.id, personelId: childId },
      select: { personelId: true },
    });
    if (!link) throw httpError(403, "FORBIDDEN", "Bu çocuk için yetkiniz yok.");

    const child = await prisma.personel.findUnique({
      where: { id: childId },
      select: { id: true, fullName: true },
    });

    const shift = await prisma.shift.findFirst({
      where: {
        status: { in: ["APPROVED", "ACTIVE"] },
        startAt: { lte: now },
        endAt: { gte: now },
        OR: [
          { people: { some: { personelId: childId } } },
          { assignments: { some: { personelId: childId } } },
        ],
      },
      select: SELF_NO_SHOW_SHIFT_SELECT,
    });
    if (!shift) throw httpError(404, "NO_ACTIVE_SHIFT", "Çocuk için aktif vardiya bulunamadı.");

    const assignment = await prisma.stopAssignment.findFirst({
      where: { shiftId: shift.id, personelId: childId },
      select: {
        id: true,
        stopId: true,
        stop: { select: { id: true, name: true, order: true } },
      },
    });

    return {
      personelId: childId,
      targetName: child?.fullName || `#${childId}`,
      shift,
      assignment,
      requestedAt: now,
    };
  }

  throw httpError(403, "FORBIDDEN", "Yetkisiz işlem.");
}

export function penaltiesRouter(io) {
  const r = express.Router();

  r.post('/no-show', authRequired(), requireRole('ROOM', 'SUPER_ADMIN'), async (req, res) => {
    try {
      const row = await createNoShowPenalty({
        driverId: req.body?.driverId,
        shiftId: req.body?.shiftId,
        reason: req.body?.reason,
        durationDays: req.body?.durationDays,
        createdByUserId: req.user?.id,
      });
      await audit(req, { action: 'DRIVER_NO_SHOW_CREATE', entity: 'DriverPenalty', entityId: row.id, meta: { driverId: row.driverId, shiftId: row.shiftId, endsAt: row.endsAt } });
      return res.json({ ok: true, item: row });
    } catch (e) {
      return res.status(e?.status || 500).json({ error: e?.message || 'Penalty create failed', code: e?.code || null, penalty: e?.penalty || null });
    }
  });

  r.post("/self/no-show", authRequired(), requireRole("PERSONEL", "PARENT"), async (req, res) => {
    try {
      const ctx = await resolveSelfNoShowContext(req);
      const shift = ctx.shift;
      const assignment = ctx.assignment;
      const stopName = assignment?.stop?.name || null;
      const stopId = assignment?.stopId || null;

      const sameStopCount = stopId
        ? await prisma.stopAssignment.count({
            where: { shiftId: shift.id, stopId },
          })
        : 0;
      const canSkipStop = Boolean(stopId && sameStopCount <= 1);
      const reason = trimOrNull(req.body?.reason) || "Bugün gelmiyorum";
      const penalty = await createNoShowPenalty({
        driverId: shift.driverId,
        shiftId: shift.id,
        reason,
        durationDays: req.body?.durationDays,
        createdByUserId: req.user?.id,
      });

      const message = buildNoShowMessage(ctx.targetName, stopName, canSkipStop);
      await createAndEmitNotification({
        io,
        type: "DRIVER_NO_SHOW_REPORTED",
        scope: "DRIVER",
        driverId: shift.driverId,
        vehicleId: shift.vehicleId ?? null,
        shiftId: shift.id,
        payload: {
          v: 1,
          kind: "driver:noShowReported",
          title: "Bugün gelmiyor bildirimi",
          message,
        },
        dedupeKey: `driver:no-show:${shift.id}:${ctx.personelId}:${stopId || "no-stop"}`,
      });

      await audit(req, {
        action: "NO_SHOW_REPORTED",
        entity: "DriverPenalty",
        entityId: penalty.id,
        meta: {
          reporterRole: req.user?.role,
          targetPersonelId: ctx.personelId,
          driverId: shift.driverId,
          shiftId: shift.id,
          stopId,
          canSkipStop,
        },
      });

      return res.json({
        ok: true,
        item: penalty,
        targetPersonelId: ctx.personelId,
        targetName: ctx.targetName,
        shiftId: shift.id,
        driverId: shift.driverId,
        stop: assignment?.stop || null,
        sameStopCount,
        canSkipStop,
        suggestion: canSkipStop
          ? "Bu durakta başka kimse yok; durağı atlamayı düşünebilirsiniz."
          : "Bu durakta başka yolcular da var; durağı atlamamalısınız.",
      });
    } catch (e) {
      return res.status(e?.status || 500).json({
        error: e?.message || "No-show report failed",
        code: e?.code || null,
      });
    }
  });

  r.get('/drivers/:driverId', authRequired(), requireRole('ROOM', 'COMPANY', 'SUPER_ADMIN'), async (req, res) => {
    try {
      const driverId = Number(req.params.driverId || 0);
      if (!driverId) return res.status(400).json({ error: 'bad driverId' });
      const rows = await prisma.driverPenalty.findMany({
        where: { driverId },
        include: { shift: true, createdBy: { select: { id: true, fullName: true, role: true } } },
        orderBy: [{ createdAt: 'desc' }],
      });
      return res.json({ ok: true, items: rows.map(normalizePenalty) });
    } catch (e) {
      return res.status(500).json({ error: String(e?.message || e) });
    }
  });

  r.post('/:id/cancel', authRequired(), requireRole('ROOM', 'SUPER_ADMIN'), async (req, res) => {
    try {
      const row = await cancelPenalty(req.params.id);
      await audit(req, { action: 'DRIVER_NO_SHOW_CANCEL', entity: 'DriverPenalty', entityId: row.id, meta: { driverId: row.driverId } });
      return res.json({ ok: true, item: row });
    } catch (e) {
      return res.status(e?.status || 500).json({ error: String(e?.message || e) });
    }
  });

  return r;
}

export default penaltiesRouter;
