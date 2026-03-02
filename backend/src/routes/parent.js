// backend/src/routes/parent.js
// ✅ M81: Parent role — child list + time-window live vehicles

import express from "express";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";

function uniqNums(xs) {
  return Array.from(new Set((xs || []).map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0)));
}

const VEHICLE_LIVE_SELECT = {
  id: true,
  plate: true,
  capacity: true,
  roomId: true,
  room: { select: { id: true, name: true } },
  gpsLast: { select: { lat: true, lng: true, at: true, status: true } },
  gpsState: { select: { lastUiStatus: true, lastChangeAt: true } },
};

export function parentRouter() {
  const r = express.Router();

  // GET /api/parent/children
  r.get("/children", authRequired(), requireRole("PARENT"), async (req, res) => {
    const u = req.user;

    const links = await prisma.parentChild.findMany({
      where: { parentUserId: u.id },
      orderBy: [{ id: "asc" }],
      include: {
        child: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            homeAddress: true,
            kind: true,
            company: { select: { id: true, name: true, kind: true, regionId: true, district: true } },
          },
        },
      },
    });

    const items = links
      .map((x) => x.child)
      .filter(Boolean)
      .map((c) => ({
        id: c.id,
        fullName: c.fullName,
        phone: c.phone,
        homeAddress: c.homeAddress,
        kind: c.kind,
        company: c.company,
      }));

    res.json({ items });
  });

  // GET /api/parent/live/vehicles?childId=
  // Returns minimal vehicles list like /api/live/vehicles but scoped to parent's children.
  r.get("/live/vehicles", authRequired(), requireRole("PARENT"), async (req, res) => {
    const u = req.user;
    const now = new Date();

    const childIdRaw = req.query?.childId != null ? String(req.query.childId).trim() : "";
    const childId = childIdRaw ? Number(childIdRaw) : null;

    const links = await prisma.parentChild.findMany({
      where: { parentUserId: u.id, ...(childId ? { personelId: childId } : {}) },
      select: { personelId: true },
      take: 2000,
    });

    const childIds = uniqNums(links.map((x) => x.personelId));
    if (!childIds.length) return res.json([]);

    const takeRaw = Number(req.query?.take ?? 2000);
    const take = Number.isFinite(takeRaw) ? Math.max(1, Math.min(5000, takeRaw)) : 2000;

    const shifts = await prisma.shift.findMany({
      where: {
        status: { in: ["APPROVED", "ACTIVE"] },
        vehicleId: { not: null },
        startAt: { lte: now },
        endAt: { gte: now },
        OR: [
          { people: { some: { personelId: { in: childIds } } } },
          { assignments: { some: { personelId: { in: childIds } } } },
        ],
      },
      select: { vehicleId: true },
      take: 5000,
    });

    const vehicleIds = uniqNums(shifts.map((s) => s.vehicleId));
    if (!vehicleIds.length) return res.json([]);

    const items = await prisma.vehicle.findMany({
      where: { id: { in: vehicleIds }, archivedAt: null },
      select: VEHICLE_LIVE_SELECT,
      orderBy: { id: "asc" },
      take,
    });

    return res.json(items);
  });

  return r;
}
