// backend/src/routes/availability.js
import express from "express";
import { authRequired, requireRole } from "../auth/middleware.js";
import { findReservationConflictForRange } from "../services/reservationConflict.js";
import { prisma } from "../prisma.js";
import { findAgreementConflictsForRangeBatch } from "../services/agreementConflictBatch.js";
import { findShiftConflictsForRangeBatch } from "../services/shiftConflictBatch.js";
import { isoOffsetTR } from "../time/tr.js";
import {
  getShiftDemandSnapshot,
  buildCapacityConflict,
  buildRoomPoolSummary,
} from "../services/roomPoolPlanner.js";

const r = express.Router();

function toIntOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function toIsoOrNull(v) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? isoOffsetTR(new Date(t)) : null;
}

function slimConflict(c) {
  if (!c) return null;
  const out = { code: c.code, message: c.message };
  if (c.conflictingShift?.id) out.conflictingShiftId = c.conflictingShift.id;
  if (c.conflictingAgreement?.id) out.conflictingAgreementId = c.conflictingAgreement.id;
  return out;
}

async function checkOne({ vehicleId, driverId, startAt, endAt, excludeShiftId }) {
  const row = {
    vehicleId: vehicleId ?? null,
    driverId: driverId ?? null,
    vehicleOk: true,
    vehicleConflict: null,
    driverOk: true,
    driverConflict: null,
  };

  if (driverId) {
    const cr = await findReservationConflictForRange({
      driverId,
      startAt,
      endAt,
      excludeShiftId: excludeShiftId ?? undefined,
    });
    if (cr) {
      row.driverOk = false;
      row.driverConflict = slimConflict(cr);
    }
  }

  if (vehicleId) {
    const cr = await findReservationConflictForRange({
      vehicleId,
      startAt,
      endAt,
      excludeShiftId: excludeShiftId ?? undefined,
    });
    if (cr) {
      row.vehicleOk = false;
      row.vehicleConflict = slimConflict(cr);
    }
  }

  return row;
}

// GET /api/availability?startAt..&endAt..&driverId.. OR vehicleId..
// agreement-first
r.get("/", authRequired(), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
  try {
    const driverId = toIntOrNull(req.query.driverId);
    const vehicleId = toIntOrNull(req.query.vehicleId);
    const shiftId = toIntOrNull(req.query.shiftId);
    const excludeShiftId = toIntOrNull(req.query.excludeShiftId) ?? shiftId;

    const startAt = toIsoOrNull(req.query.startAt);
    const endAt = toIsoOrNull(req.query.endAt);

    if (!startAt || !endAt) return res.status(400).json({ error: "startAt/endAt required" });
    if (!driverId && !vehicleId) return res.status(400).json({ error: "driverId or vehicleId required" });

    let demand = null;
    let vehicle = null;
    if (vehicleId && shiftId) {
      [demand, vehicle] = await Promise.all([
        getShiftDemandSnapshot(shiftId),
        prisma.vehicle.findUnique({
          where: { id: vehicleId },
          select: { id: true, capacity: true },
        }),
      ]);

      if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });

      const capacityConflict = buildCapacityConflict({
        requiredPax: demand?.requiredPax ?? 0,
        vehicleCapacity: vehicle?.capacity ?? 0,
      });
      if (capacityConflict) return res.status(409).json(capacityConflict);
    }

    const row = await checkOne({ vehicleId, driverId, startAt, endAt, excludeShiftId });

    if (vehicleId && !row.vehicleOk) return res.status(409).json(row.vehicleConflict);
    if (driverId && !row.driverOk) return res.status(409).json(row.driverConflict);

    return res.json({
      ok: true,
      shiftId: shiftId ?? null,
      requiredPax: demand?.requiredPax ?? 0,
      vehicleCapacity: vehicle?.capacity ?? null,
    });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message ?? e) });
  }
});


// GET /api/availability/pool?shiftId=..
// Room havuzundaki müsait araç/driver kombinasyonunu özetler.
r.get("/pool", authRequired(), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
  try {
    const shiftId = toIntOrNull(req.query.shiftId);
    if (!shiftId) return res.status(400).json({ error: "shiftId required" });

    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      select: { id: true, roomId: true },
    });
    if (!shift) return res.status(404).json({ error: "Shift not found" });
    if (!shift.roomId) return res.status(400).json({ error: "Shift has no roomId" });
    if (req.user?.role === "ROOM" && Number(req.user?.roomId || 0) !== Number(shift.roomId || 0)) {
      return res.status(403).json({ error: "Shift is not in this room scope" });
    }

    const data = await buildRoomPoolSummary({ shiftId });
    return res.json(data);
  } catch (e) {
    return res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
  }
});

// POST /api/availability/batch
// Body:
// { startAt, endAt, items:[{ vehicleId, driverId? }], excludeShiftId? }
r.post("/batch", authRequired(), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
  try {
    const startAt = toIsoOrNull(req.body?.startAt);
    const endAt = toIsoOrNull(req.body?.endAt);
    const excludeShiftId = toIntOrNull(req.body?.excludeShiftId);

    if (!startAt || !endAt) return res.status(400).json({ error: "startAt/endAt required" });
    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      return res.status(400).json({ error: "endAt must be > startAt" });
    }

    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ error: "items[] required" });
    if (items.length > 500) return res.status(400).json({ error: "items too large (max 500)" });

    // basit concurrency limit
    const limit = 10;
    let idx = 0;
    const out = [];

    async function worker() {
      while (idx < items.length) {
        const i = idx++;
        const it = items[i] || {};
        const vehicleId = toIntOrNull(it.vehicleId);
        const driverId = toIntOrNull(it.driverId);

        if (!vehicleId && !driverId) continue;

        const row = await checkOne({ vehicleId, driverId, startAt, endAt, excludeShiftId });
        out.push(row);
      }
    }

    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));

    // stable order: vehicleId asc
    out.sort((a, b) => Number(a.vehicleId || 0) - Number(b.vehicleId || 0));

    return res.json({ ok: true, startAt, endAt, items: out });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message ?? e) });
  }
});

// POST /api/availability/bulk
// Body:
// {
//   startAt, endAt,
//   vehicleIds?: number[],          // optional (defaults to all room vehicles)
//   includeArchived?: boolean,
//   excludeShiftId?: number,
//   roomId?: number                 // SUPER_ADMIN only (optional)
// }
// agreement-first (deterministic) — designed for large N (e.g. 1500 vehicles)
r.post("/bulk", authRequired(), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
  try {
    const startAt = toIsoOrNull(req.body?.startAt);
    const endAt = toIsoOrNull(req.body?.endAt);
    const excludeShiftId = toIntOrNull(req.body?.excludeShiftId);
    const includeArchived = Boolean(req.body?.includeArchived);

    if (!startAt || !endAt) return res.status(400).json({ error: "startAt/endAt required" });
    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      return res.status(400).json({ error: "endAt must be > startAt" });
    }

    // Scope: ROOM -> own room; SUPER_ADMIN -> body.roomId or own room
    const roomId =
      req.user.role === "SUPER_ADMIN"
        ? toIntOrNull(req.body?.roomId) ?? toIntOrNull(req.user.roomId)
        : toIntOrNull(req.user.roomId);
    if (!roomId) return res.status(400).json({ error: "roomId required" });

    const rawIds = Array.isArray(req.body?.vehicleIds) ? req.body.vehicleIds : null;
    const vehicleIds = rawIds
      ? rawIds.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0)
      : null;
    if (vehicleIds && vehicleIds.length > 2000) {
      return res.status(400).json({ error: "vehicleIds too large (max 2000)" });
    }

    // 1) Load vehicles once (room scope)
    const vWhere = {
      roomId,
      ...(includeArchived ? {} : { archivedAt: null }),
      ...(vehicleIds ? { id: { in: vehicleIds } } : {}),
    };

    const vehicles = await prisma.vehicle.findMany({
      where: vWhere,
      select: {
        id: true,
        driverId: true,
      },
      orderBy: { id: "asc" },
    });

    const ids = vehicles.map((v) => Number(v.id));
    const driverIds = Array.from(
      new Set(vehicles.map((v) => Number(v.driverId || 0)).filter((x) => x > 0))
    );

    if (!ids.length) {
      return res.json({ ok: true, startAt, endAt, items: [] });
    }

    // 2) Agreement conflicts (batch)
    const ag = await findAgreementConflictsForRangeBatch({
      vehicleIds: ids,
      driverIds,
      startAt,
      endAt,
    });

    // 3) Shift conflicts (batch)
    const sh = await findShiftConflictsForRangeBatch({
      vehicleIds: ids,
      driverIds,
      startAt,
      endAt,
      excludeShiftId: excludeShiftId ?? undefined,
    });

    // 4) Compose rows (agreement-first)
    const out = [];
    for (const v of vehicles) {
      const vehicleId = Number(v.id);
      const driverId = Number(v.driverId || 0) || null;

      const row = {
        vehicleId,
        driverId,
        vehicleOk: true,
        vehicleConflict: null,
        driverOk: true,
        driverConflict: null,
      };

      const agV = ag?.vehicleConflictById?.get(vehicleId) ?? null;
      if (agV) {
        row.vehicleOk = false;
        row.vehicleConflict = slimConflict(agV);
      }

      if (driverId) {
        const agD = ag?.driverConflictById?.get(driverId) ?? null;
        if (agD) {
          row.driverOk = false;
          row.driverConflict = slimConflict(agD);
        }
      }

      // Shift conflicts only if agreement OK
      if (row.vehicleOk) {
        const c = sh?.vehicleConflictById?.get(vehicleId) ?? null;
        if (c) {
          row.vehicleOk = false;
          row.vehicleConflict = slimConflict(c);
        }
      }

      if (driverId && row.driverOk) {
        const c = sh?.driverConflictById?.get(driverId) ?? null;
        if (c) {
          row.driverOk = false;
          row.driverConflict = slimConflict(c);
        }
      }

      out.push(row);
    }

    return res.json({ ok: true, startAt, endAt, items: out });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message ?? e) });
  }
});

export default r;