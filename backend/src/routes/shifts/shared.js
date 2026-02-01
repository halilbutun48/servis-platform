// backend/src/routes/shifts/shared.js
import prisma from "../../prisma.js";
import { authRequired, requireRole } from "../../auth/middleware.js";

// NOTE: Avoid named-importing helpers (stale mount risk).
import * as H from "./helpers.js";

const buildShiftsWhereFromQuery =
  H.buildShiftsWhereFromQuery ??
  function buildShiftsWhereFromQueryFallback(q = {}, user) {
    const where = {};

    // Scope
    if (user?.role === "ROOM" && user?.roomId) where.roomId = user.roomId;
    if (user?.role === "COMPANY" && user?.companyId) where.companyId = user.companyId;

    // Filters
    if (q.roomId) where.roomId = Number(q.roomId);
    if (q.companyId) where.companyId = Number(q.companyId);
    if (q.driverId) where.driverId = Number(q.driverId);
    if (q.vehicleId) where.vehicleId = Number(q.vehicleId);

    const onlyOpen = String(q.onlyOpen ?? "0") === "1";
    if (onlyOpen) where.status = { in: ["REQUESTED", "APPROVED", "ACTIVE"] };

    if (q.status) {
      const raw = String(q.status)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (raw.length === 1) where.status = raw[0];
      if (raw.length > 1) where.status = { in: raw };
    }

    if (q.from) where.startAt = { ...(where.startAt ?? {}), gte: new Date(q.from) };
    if (q.to) where.startAt = { ...(where.startAt ?? {}), lte: new Date(q.to) };

    if (q.q) {
      const s = String(q.q);
      where.OR = [
        { routeName: { contains: s, mode: "insensitive" } },
        { vehicle: { plate: { contains: s, mode: "insensitive" } } },
        { driver: { fullName: { contains: s, mode: "insensitive" } } },
      ];
    }

    return where;
  };

const getDriverIdOrThrow = H.getDriverIdOrThrow;
const getPersonelIdOrThrow = H.getPersonelIdOrThrow;

// Shared endpoints: list, my, detail
export function attachShiftSharedRoutes(r) {
  // list shifts (ROOM/COMPANY/SUPER_ADMIN) with filters
  // query: status, onlyOpen=1, roomId, companyId, driverId, vehicleId, from,to, q, take
  r.get(
    "/",
    authRequired(),
    requireRole("ROOM", "COMPANY", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const where = buildShiftsWhereFromQuery(req.query, req.user);
        const take = Math.min(Number(req.query.take ?? 200), 500);

        const items = await prisma.shift.findMany({
          where,
          orderBy: { startAt: "desc" },
          take: Number.isFinite(take) ? take : 200,
          include: {
            company: { select: { id: true, name: true } },
            room: { select: { id: true, name: true } },
            driver: { select: { id: true, fullName: true, phone: true } },
            vehicle: { select: { id: true, plate: true, status: true } },
            stops: { orderBy: { order: "asc" } },
          },
        });

        // IMPORTANT:
        // Prisma include => shift scalar alanlar (roomOffer*, companyOffer*, vb) otomatik gelir.
        return res.json({ items });
      } catch (e) {
        return res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
      }
    }
  );

  // DRIVER/PERSONEL: my shift (current/next) + stops + progress
  r.get(
    "/my",
    authRequired(),
    requireRole("DRIVER", "PERSONEL"),
    async (req, res) => {
      try {
        const now = new Date();
        let shift = null;

        if (req.user.role === "DRIVER") {
          const driverId = await getDriverIdOrThrow(req.user);
          shift = await prisma.shift.findFirst({
            where: {
              driverId,
              status: { in: ["APPROVED", "ACTIVE"] },
              endAt: { gt: now },
            },
            orderBy: { startAt: "asc" },
            include: {
              stops: { orderBy: { order: "asc" } },
              progress: true,
              vehicle: true,
              company: true,
              room: true,
            },
          });
        }

        if (req.user.role === "PERSONEL") {
          const personelId = await getPersonelIdOrThrow(req.user);
          const latestReq = await prisma.pickupRequest.findFirst({
            where: { personelId, status: { in: ["OPEN", "ACCEPTED"] } },
            orderBy: { createdAt: "desc" },
            select: { shiftId: true },
          });

          if (latestReq?.shiftId) {
            shift = await prisma.shift.findUnique({
              where: { id: latestReq.shiftId },
              include: {
                stops: { orderBy: { order: "asc" } },
                progress: true,
                vehicle: true,
                company: true,
                room: true,
              },
            });
          }
        }

        if (!shift) return res.json({ items: [] });
        return res.json({ items: [shift] });
      } catch (e) {
        return res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
      }
    }
  );

  // Shift detail (include stops)
  r.get(
    "/:id(\\d+)",
    authRequired(),
    requireRole("ROOM", "COMPANY", "DRIVER", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const id = Number(req.params.id);

        const shift = await prisma.shift.findUnique({
          where: { id },
          include: {
            stops: { orderBy: { order: "asc" } },
            progress: true,
            vehicle: true,
            driver: true,
            company: true,
            room: true,
          },
        });

        if (!shift) return res.status(404).json({ error: "Shift not found" });

        // scope check
        if (req.user.role === "ROOM") {
          if (!req.user.roomId || req.user.roomId !== shift.roomId) {
            return res.status(403).json({ error: "Forbidden" });
          }
        }

        if (req.user.role === "COMPANY") {
          if (!req.user.companyId || req.user.companyId !== shift.companyId) {
            return res.status(403).json({ error: "Forbidden" });
          }
        }

        if (req.user.role === "DRIVER") {
          const driver = await prisma.driver.findFirst({
            where: { userId: req.user.id },
            select: { id: true },
          });
          if (!driver) return res.status(400).json({ error: "Driver profile missing" });
          if (shift.driverId !== driver.id) return res.status(403).json({ error: "Forbidden" });
        }

        return res.json(shift);
      } catch (e) {
        return res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
      }
    }
  );
}
