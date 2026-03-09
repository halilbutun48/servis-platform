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
        let where = buildShiftsWhereFromQuery(req.query, req.user);

        // ✅ ROOM: market/offered shift'leri listeye dahil et (roomId null olsa bile)
        // UI bunu /room/shifts içinde “tek ekranda” görmek için kullanır.
        // Query: includeOffered=1
        if (req.user?.role === "ROOM" && req.user?.roomId && String(req.query.includeOffered || "0") === "1") {
          const roomId = req.user.roomId;

          // buildShiftsWhereFromQuery scope olarak where.roomId=roomId koyuyor.
          // Offered shift'lerde shift.roomId null → bu yüzden scope'u OR'a çeviriyoruz.
          const base = { ...(where || {}) };
          delete base.roomId;

          const scopeOr = {
            OR: [
              { roomId },
              // ✅ SECURITY: only treat as "offered" if there is an ACTIVE offer for this room.
              // CANCELLED offers must NOT leak shift details to other rooms.
              { offers: { some: { roomId, status: { in: ["OPEN", "COUNTERED"] } } } },
            ],
          };

          // base zaten OR içeriyorsa AND ile bağla ki filtreler kaybolmasın.
          where = { AND: [scopeOr, base] };
        }
        // ✅ KVKK: onlyNow=1 -> sadece şu an aralığında (startAt<=now<=endAt)
        const onlyNow = String(req.query.onlyNow ?? "0") === "1";
        if (onlyNow) {
          const now = new Date();
          const nowCond = { startAt: { lte: now }, endAt: { gte: now } };
          if (where && typeof where === "object" && Object.prototype.hasOwnProperty.call(where, "AND")) {
            const arr = Array.isArray(where.AND) ? where.AND : [where.AND];
            where = { ...where, AND: [...arr, nowCond] };
          } else {
            where = { AND: [where, nowCond] };
          }
        }

        const take = Math.min(Number(req.query.take ?? 200), 500);

        const items = await prisma.shift.findMany({
          where,
          orderBy: { startAt: "desc" },
          take: Number.isFinite(take) ? take : 200,
          include: {
            company: { select: { id: true, name: true } },
            room: { select: { id: true, name: true } },
            driver: { select: { id: true, fullName: true, phone: true } },
            vehicle: { select: { id: true, plate: true, status: true, capacity: true } },
            stops: { orderBy: { order: "asc" } },
            offers: { select: { id: true, roomId: true, status: true } },
            organizationPlan: { select: { stops: { select: { passengerCount: true } } } },
            _count: { select: { assignments: true, people: true } },
          },
        });

        const mapped = items.map((s) => {
          const assignmentCount = Number(s?._count?.assignments || 0);
          const peopleCount = Number(s?._count?.people || 0);
          const orgPassengerCount = Array.isArray(s?.organizationPlan?.stops)
            ? s.organizationPlan.stops.reduce(
                (sum, st) => sum + Math.max(0, Number(st?.passengerCount || 0)),
                0
              )
            : 0;
          const requiredPaxOverride = Math.max(0, Number(s?.requiredPaxOverride || 0));
          const requiredPax = Math.max(assignmentCount, peopleCount, Number(orgPassengerCount || 0), requiredPaxOverride, 0);

          return {
            ...s,
            assignmentCount,
            peopleCount,
            orgPassengerCount,
            requiredPaxOverride,
            requiredPax,
          };
        });

        // IMPORTANT:
        // Prisma include => shift scalar alanlar (roomOffer*, companyOffer*, vb) otomatik gelir.
        return res.json({ items: mapped });
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

    // Shift stops (Shift Tools): list stops + assignmentCount
  r.get(
    "/:id/stops",
    authRequired(),
    requireRole("ROOM", "COMPANY", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const id = Number(req.params.id);

        const shift = await prisma.shift.findUnique({
          where: { id },
          select: { id: true, roomId: true, companyId: true },
        });

        if (!shift) return res.status(404).json({ error: "Shift not found" });

        // scope check
        if (req.user.role === "ROOM") {
          const roomId = req.user.roomId;
          if (!roomId) return res.status(403).json({ error: "Forbidden" });
          if (shift.roomId !== roomId) {
            // market/offered shift: roomId null olabilir; teklif varsa erişime izin ver
            const offer = await prisma.shiftOffer.findFirst({
              where: { shiftId: shift.id, roomId, status: { in: ["OPEN", "COUNTERED", "ACCEPTED"] } },
              select: { id: true },
            });
            if (!offer) return res.status(403).json({ error: "Forbidden" });
          }
        }

        if (req.user.role === "COMPANY") {
          if (!req.user.companyId || req.user.companyId !== shift.companyId) {
            return res.status(403).json({ error: "Forbidden" });
          }
        }

        const stops = await prisma.stop.findMany({
          where: { shiftId: shift.id },
          orderBy: { order: "asc" },
          select: {
            id: true,
            name: true,
            lat: true,
            lng: true,
            order: true,
            type: true,
            state: true,
            _count: { select: { assignments: true } },
          },
        });

        return res.json({
          items: stops.map((s) => ({
            id: s.id,
            title: s.name,
            name: s.name,
            order: s.order,
            lat: s.lat,
            lng: s.lng,
            type: s.type,
            state: s.state,
            assignmentCount: s._count?.assignments ?? 0,
          })),
        });
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
          const roomId = req.user.roomId;
          if (!roomId) return res.status(403).json({ error: "Forbidden" });
          if (shift.roomId !== roomId) {
            const offer = await prisma.shiftOffer.findFirst({
              where: { shiftId: shift.id, roomId, status: { in: ["OPEN", "COUNTERED", "ACCEPTED"] } },
              select: { id: true },
            });
            if (!offer) return res.status(403).json({ error: "Forbidden" });
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
