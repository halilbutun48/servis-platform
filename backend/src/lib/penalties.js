import { prisma } from "../prisma.js";

export function normalizePenalty(row) {
  if (!row) return null;
  const endsAt = row.endsAt ? new Date(row.endsAt) : null;
  const now = Date.now();
  const expired = endsAt && Number.isFinite(endsAt.getTime()) && endsAt.getTime() < now;
  return {
    ...row,
    effectiveStatus: row.status === "ACTIVE" && expired ? "EXPIRED" : row.status,
    isActive: row.status === "ACTIVE" && !expired,
  };
}

export async function getActivePenaltyForDriver(driverId, at = new Date()) {
  const id = Number(driverId || 0);
  if (!id) return null;
  const row = await prisma.driverPenalty.findFirst({
    where: {
      driverId: id,
      type: "NO_SHOW",
      status: "ACTIVE",
      startsAt: { lte: at },
      endsAt: { gte: at },
    },
    orderBy: { endsAt: "desc" },
    include: { shift: true, createdBy: { select: { id: true, fullName: true, role: true } } },
  });
  return normalizePenalty(row);
}

export async function createNoShowPenalty({ driverId, shiftId, reason, durationDays, createdByUserId }) {
  const did = Number(driverId || 0);
  const sid = Number(shiftId || 0) || null;
  const uid = Number(createdByUserId || 0);
  const days = Math.max(1, Math.min(14, Number(durationDays || 1)));
  if (!did || !uid) {
    const err = new Error("driverId and createdByUserId required");
    err.status = 400;
    throw err;
  }
  const driver = await prisma.driver.findUnique({ where: { id: did } });
  if (!driver) {
    const err = new Error("Driver not found");
    err.status = 404;
    throw err;
  }
  if (sid) {
    const shift = await prisma.shift.findUnique({ where: { id: sid } });
    if (!shift) { const err = new Error("Shift not found"); err.status = 404; throw err; }
    if (Number(shift.driverId || 0) !== did) { const err = new Error("Shift driver mismatch"); err.status = 409; err.code = "SHIFT_DRIVER_MISMATCH"; throw err; }
  }
  const existing = await prisma.driverPenalty.findFirst({
    where: { driverId: did, shiftId: sid, type: "NO_SHOW", status: "ACTIVE", endsAt: { gte: new Date() } },
  });
  if (existing) {
    const err = new Error("Bu vardiya için aktif gelmedi kaydı zaten var.");
    err.status = 409;
    err.code = "NO_SHOW_ALREADY_EXISTS";
    err.penalty = existing;
    throw err;
  }
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + days * 24 * 60 * 60 * 1000);
  const row = await prisma.driverPenalty.create({
    data: {
      driverId: did,
      shiftId: sid,
      type: "NO_SHOW",
      status: "ACTIVE",
      reason: String(reason || "").trim() || null,
      startsAt,
      endsAt,
      createdByUserId: uid,
    },
    include: { shift: true, createdBy: { select: { id: true, fullName: true, role: true } } },
  });
  return normalizePenalty(row);
}

export async function cancelPenalty(penaltyId) {
  const id = Number(penaltyId || 0);
  if (!id) { const err = new Error("bad penaltyId"); err.status = 400; throw err; }
  const row = await prisma.driverPenalty.update({
    where: { id },
    data: { status: "CANCELLED" },
    include: { shift: true, createdBy: { select: { id: true, fullName: true, role: true } } },
  });
  return normalizePenalty(row);
}

export async function assertDriverAssignable({ driverId, shiftId, at = new Date() }) {
  const penalty = await getActivePenaltyForDriver(driverId, at);
  if (!penalty) return null;
  const err = new Error("Bu sürücü için aktif gelmedi kaydı var. Bu nedenle atama yapılamaz.");
  err.status = 409;
  err.code = "ACTIVE_NO_SHOW_PENALTY";
  err.penalty = penalty;
  err.shiftId = Number(shiftId || 0) || null;
  throw err;
}
