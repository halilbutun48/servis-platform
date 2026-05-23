// backend/src/routes/requests.js
import express from "express";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { createRequestSchema } from "../validators.js";
import logger from "../lib/logger.js";
import { audit } from "../audit.js";
import { emitBoardingChangeNotifications, evaluateBoardingChangeDecision, buildBoardingChangeRequestReason, formatBoardingChangeDecisionText, normalizeBoardingChangeKind } from "./boardingChangeRequestOps.js";
import { previewBoardingChangeRouteImpact } from "../services/boardingRouteImpactPreview.js";

/**
 * PickupRequestStatus enum:
 * - OPEN
 * - CANCELLED
 * - ACCEPTED
 *
 * Bu yüzden "CLOSED" diye bir status KULLANMIYORUZ.
 * ROOM tarafında "kapatma" = ACCEPTED (default) ya da CANCELLED.
 */

const DEFAULT_CLOSE_STATUS = "ACCEPTED";
const ALLOWED_CLOSE = new Set(["ACCEPTED", "CANCELLED"]);
const REQUEST_SHIFT_PREVIEW_INCLUDE = {
  include: {
    vehicle: {
      select: {
        id: true,
        plate: true,
        capacity: true,
      },
    },
    driver: {
      select: {
        id: true,
        fullName: true,
        name: true,
      },
    },
    stops: {
      select: {
        id: true,
        name: true,
        label: true,
        stopName: true,
        title: true,
        code: true,
        stationName: true,
        address: true,
        lat: true,
        lng: true,
        order: true,
        sortOrder: true,
        sequence: true,
        index: true,
      },
    },
    people: {
      select: {
        id: true,
        personelId: true,
        note: true,
      },
    },
    assignments: {
      select: {
        id: true,
        personelId: true,
        stopId: true,
        stop: {
          select: {
            id: true,
            name: true,
            label: true,
            stopName: true,
            title: true,
            code: true,
            stationName: true,
            address: true,
            lat: true,
            lng: true,
            order: true,
            sortOrder: true,
            sequence: true,
            index: true,
          },
        },
      },
    },
  },
};

export function requestsRouter(io) {
  const r = express.Router();

  // PERSONEL/PARENT: create pickup request for a shift
  r.post("/", authRequired(), requireRole("PERSONEL", "PARENT"), async (req, res) => {
    try {
      const u = req.user;

      const parsed = createRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      const requestKind = normalizeBoardingChangeKind(req.body?.kind);
      const requestReason = String(req.body?.reason || "").trim() || buildBoardingChangeRequestReason(requestKind, u.role);
      const parentChildId = Number(req.body?.childId ?? req.body?.personelId ?? 0) || null;

      let requesterUserId = u.id;
      let requesterRole = u.role;
      let personel = null;

      if (u.role === "PERSONEL") {
        personel = await prisma.personel.findFirst({
          where: { userId: u.id },
          select: { id: true, companyId: true, userId: true, fullName: true },
        });
        if (!personel) {
          return res
            .status(400)
            .json({ error: "Personel profile not found for user" });
        }
      } else {
        if (!parentChildId) {
          return res.status(400).json({ error: "childId gerekli" });
        }
        const link = await prisma.parentChild.findFirst({
          where: { parentUserId: u.id, personelId: parentChildId },
          select: { personelId: true },
        });
        if (!link) {
          return res.status(403).json({ error: "Forbidden" });
        }
        personel = await prisma.personel.findUnique({
          where: { id: parentChildId },
          select: { id: true, companyId: true, userId: true, fullName: true },
        });
        if (!personel) {
          return res.status(404).json({ error: "Child profile not found" });
        }
        requesterRole = "PARENT";
      }

      const shift = await prisma.shift.findUnique({
        where: { id: parsed.data.shiftId },
        select: {
          id: true,
          companyId: true,
          roomId: true,
          status: true,
          startAt: true,
          endAt: true,
          driverId: true,
          vehicleId: true,
          stops: { select: { id: true, name: true, lat: true, lng: true, order: true } },
        },
      });
      if (!shift) return res.status(404).json({ error: "Shift not found" });

      // Company scope check: shift must belong to the same company as the authenticated user (or the linked personel record).
      const userCompanyId = req.user?.companyId ?? null;
      const personelCompanyId = personel.companyId ?? null;

      const matchesUser = userCompanyId && shift.companyId === userCompanyId;
      const matchesPersonel = personelCompanyId && shift.companyId === personelCompanyId;

      if (!matchesUser && !matchesPersonel) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Auto-heal: if user is scoped but personel.companyId is missing/wrong, align it.
      if (matchesUser && !matchesPersonel) {
        await prisma.personel.update({
          where: { id: personel.id },
          data: { companyId: userCompanyId },
        });
      }

      // MVP: sadece APPROVED/ACTIVE shift'e istek atılsın
      if (!["APPROVED", "ACTIVE"].includes(shift.status)) {
        return res.status(400).json({
          error: `Shift not allowed for request (status=${shift.status})`,
        });
      }

      // Aynı personel + aynı shift için OPEN varsa tekrar oluşturma
      const existing = await prisma.pickupRequest.findFirst({
        where: { shiftId: shift.id, personelId: personel.id, status: "OPEN" },
        select: { id: true },
      });
      if (existing) {
        return res
          .status(409)
          .json({ error: "Request already OPEN", id: existing.id });
      }

      const decision = evaluateBoardingChangeDecision({
        kind: requestKind,
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        shift,
        now: new Date(),
      });
      const decisionState = decision.autoAccepted ? "AUTO_ACCEPTED" : (decision.cutoffReached ? "CUTOFF_REVIEW" : "MANUAL_REVIEW");
      const decisionText = formatBoardingChangeDecisionText({
        requestKind,
        requesterRole,
        decisionState,
      });
      const requestStatus = decision.autoAccepted ? "ACCEPTED" : "OPEN";

      const item = await prisma.pickupRequest.create({
        data: {
          shiftId: shift.id,
          personelId: personel.id,
          lat: parsed.data.lat,
          lng: parsed.data.lng,
          status: requestStatus,
        },
        include: { personel: true, shift: true },
      });

      await audit(req, {
        action: "BOARDING_CHANGE_REQUEST_CREATE",
        entity: "PickupRequest",
        entityId: item.id,
        meta: {
          actorId: requesterUserId,
          actorRole: requesterRole,
          requestKind,
          requestReason,
          decisionText,
          personelId: personel.id,
          shiftId: shift.id,
          companyId: shift.companyId,
          roomId: shift.roomId,
          driverId: shift.driverId,
          vehicleId: shift.vehicleId,
          lat: parsed.data.lat,
          lng: parsed.data.lng,
          nearestStopId: decision.nearestStop?.id ?? null,
          nearestStopName: decision.nearestStop?.name ?? null,
          distanceM: decision.nearestStop?.distanceM ?? null,
          cutoffReached: decision.cutoffReached,
          decisionState,
        },
      });

      if (decision.autoAccepted) {
        await audit(req, {
          action: "BOARDING_CHANGE_REQUEST_AUTO_ACCEPTED",
          entity: "PickupRequest",
          entityId: item.id,
          meta: {
            actorId: requesterUserId,
            actorRole: requesterRole,
            requestKind,
            requestReason,
            decisionText,
            shiftId: shift.id,
            nearestStopId: decision.nearestStop?.id ?? null,
            nearestStopName: decision.nearestStop?.name ?? null,
            distanceM: decision.nearestStop?.distanceM ?? null,
          },
        });
      }

      await emitBoardingChangeNotifications({
        io,
        shift,
        personel,
        requesterUserId,
        requesterRole,
        requestKind,
        requestReason,
        decisionState,
        nearestStop: decision.nearestStop,
      });

      const evt = {
        requestId: item.id,
        action: decision.autoAccepted ? "auto-accepted" : "created",
        shiftId: shift.id,
        status: item.status,
        kind: requestKind,
        reason: requestReason,
        decisionState,
        decisionText,
        nearestStop: decision.nearestStop ? {
          id: decision.nearestStop.id,
          name: decision.nearestStop.name,
          order: decision.nearestStop.order,
          distanceM: Math.round(decision.nearestStop.distanceM),
        } : null,
      };

      io.to(`company:${shift.companyId}`).emit("request:update", evt);
      io.to(`room:${shift.roomId}`).emit("request:update", evt);
      io.to(`shift:${shift.id}`).emit("request:update", evt);

      return res.json({
        ...item,
        requestKind,
        requestReason,
        decisionState,
        decisionText,
        nearestStop: decision.nearestStop ? {
          id: decision.nearestStop.id,
          name: decision.nearestStop.name,
          order: decision.nearestStop.order,
          distanceM: Math.round(decision.nearestStop.distanceM),
        } : null,
      });
    } catch (e) {
      logger.error("[requests] POST / error:", e);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // COMPANY/ROOM/SUPER_ADMIN: list pickup requests
  // query: ?onlyOpen=1&onlyActive=1
  r.get("/", authRequired(), requireRole("COMPANY", "ROOM", "SUPER_ADMIN"), async (req, res) => {
    try {
      const u = req.user;

      const onlyOpen = String(req.query.onlyOpen ?? "") === "1";
      const onlyActive = String(req.query.onlyActive ?? "") === "1";

      const where = {};
      if (onlyOpen) where.status = "OPEN";

      // relation filter (PickupRequest -> Shift)
      if (u.role === "COMPANY") {
        where.shift = {
          is: {
            companyId: u.companyId ?? -1,
            ...(onlyActive ? { status: "ACTIVE" } : {}),
          },
        };
      }

      if (u.role === "ROOM") {
        where.shift = {
          is: {
            roomId: u.roomId ?? -1,
            ...(onlyActive ? { status: "ACTIVE" } : {}),
          },
        };
      }

      if (u.role === "SUPER_ADMIN" && onlyActive) {
        where.shift = { is: { status: "ACTIVE" } };
      }

      const items = await prisma.pickupRequest.findMany({
        where,
        include: { personel: true, shift: REQUEST_SHIFT_PREVIEW_INCLUDE },
        orderBy: { id: "desc" },
        take: 200,
      });

      const ids = items.map((item) => Number(item?.id || 0)).filter((n) => Number.isFinite(n) && n > 0);
      const audits = ids.length
        ? await prisma.auditLog.findMany({
            where: {
              entity: "PickupRequest",
              entityId: { in: ids },
              action: { in: [
                "BOARDING_CHANGE_REQUEST_CREATE",
                "BOARDING_CHANGE_REQUEST_AUTO_ACCEPTED",
                "BOARDING_CHANGE_REQUEST_CLOSE_ACCEPT",
                "BOARDING_CHANGE_REQUEST_CLOSE_CANCEL",
              ] },
            },
            orderBy: { createdAt: "desc" },
          })
        : [];
      const auditMap = new Map();
      for (const row of audits) {
        const key = Number(row?.entityId || 0);
        if (!key || auditMap.has(key)) continue;
        auditMap.set(key, row);
      }

      return res.json(items.map((item) => {
        const meta = auditMap.get(Number(item.id || 0))?.meta || {};
        const closeState = String(meta.closeStatus || "").toUpperCase();
        const derivedDecisionState = closeState === "ACCEPTED"
          ? "ROOM_ACCEPTED"
          : closeState === "CANCELLED"
            ? "ROOM_CANCELLED"
            : null;
        const decisionState = meta.decisionState || derivedDecisionState || (String(item.status || "").toUpperCase() === "ACCEPTED" ? "AUTO_ACCEPTED" : "MANUAL_REVIEW");
        const decisionText = meta.decisionText || formatBoardingChangeDecisionText({
          requestKind: meta.requestKind || "DIFFERENT_STOP",
          requesterRole: meta.actorRole || "PERSONEL",
          decisionState,
        });
        const nearestStop = meta.nearestStopName ? {
          id: meta.nearestStopId ?? null,
          name: meta.nearestStopName,
          distanceM: meta.distanceM != null ? Math.round(Number(meta.distanceM)) : null,
        } : null;
        const routeImpactPreview = previewBoardingChangeRouteImpact({
          shift: item.shift || null,
          currentStops: item.shift?.stops || [],
          passengersOrPeople: item.shift?.people || [],
          boardingChange: {
            changeType: meta.requestKind || item.requestKind || item.kind || "DIFFERENT_STOP",
            personelId: item.personelId,
            personLabel: item.personel?.fullName || item.personel?.name || item.personel?.label || `#${item.personelId || "-"}`,
            requestReason: meta.requestReason || "",
            nearestStop,
            lat: item.lat,
            lng: item.lng,
          },
        });
        return {
          ...item,
          requestKind: meta.requestKind || "DIFFERENT_STOP",
          requestReason: meta.requestReason || "",
          decisionState,
          decisionText,
          nearestStop,
          routeImpactPreview,
        };
      }));
    } catch (e) {
      logger.error("[requests] GET / error:", e);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ROOM: close pickup request (OPEN -> ACCEPTED/CANCELLED)
  // Body opsiyonel: { status: "CANCELLED" } veya { status: "ACCEPTED" }
  r.post("/:id/close", authRequired(), requireRole("ROOM"), async (req, res) => {
    try {
      const u = req.user;
      if (!u.roomId) return res.status(400).json({ error: "ROOM must have roomId" });

      const requestId = Number(req.params.id);

      const item = await prisma.pickupRequest.findUnique({
        where: { id: requestId },
        include: { shift: true, personel: true },
      });
      if (!item) return res.status(404).json({ error: "Request not found" });

      if (!item.shift || item.shift.roomId !== u.roomId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      if (item.status !== "OPEN") {
        return res
          .status(409)
          .json({ error: `Request not OPEN (current=${item.status})` });
      }

      // default: ACCEPTED
      const desired = req.body?.status ?? DEFAULT_CLOSE_STATUS;
      const closeStatus = String(desired).toUpperCase();

      if (!ALLOWED_CLOSE.has(closeStatus)) {
        return res.status(400).json({
          error: "Invalid close status",
          allowed: Array.from(ALLOWED_CLOSE),
          got: closeStatus,
        });
      }

      const updated = await prisma.pickupRequest.update({
        where: { id: requestId },
        data: { status: closeStatus },
        include: { personel: true, shift: true },
      });

      await audit(req, {
        action: closeStatus === "ACCEPTED" ? "BOARDING_CHANGE_REQUEST_CLOSE_ACCEPT" : "BOARDING_CHANGE_REQUEST_CLOSE_CANCEL",
        entity: "PickupRequest",
        entityId: updated.id,
        meta: {
          actorId: u.id,
          actorRole: u.role,
          shiftId: updated.shiftId,
          personelId: updated.personelId,
          closeStatus,
          decisionState: closeStatus === "ACCEPTED" ? "ROOM_ACCEPTED" : "ROOM_CANCELLED",
          decisionText: closeStatus === "ACCEPTED"
            ? "İstek oda tarafından onaylandı."
            : "İstek oda tarafından iptal edildi.",
        },
      });

      await emitBoardingChangeNotifications({
        io,
        shift: updated.shift,
        personel: updated.personel,
        requesterUserId: updated.personel?.userId || null,
        requesterRole: "PERSONEL",
        requestKind: "DIFFERENT_STOP",
        requestReason: `İstek ${closeStatus === "ACCEPTED" ? "onaylandı" : "iptal edildi"}.`,
        decisionState: closeStatus === "ACCEPTED" ? "ROOM_ACCEPTED" : "ROOM_CANCELLED",
        nearestStop: null,
      });

      const decisionState = closeStatus === "ACCEPTED" ? "ROOM_ACCEPTED" : "ROOM_CANCELLED";
      const decisionText = closeStatus === "ACCEPTED"
        ? "İstek oda tarafından onaylandı."
        : "İstek oda tarafından iptal edildi.";
      const evt = {
        requestId: updated.id,
        action: "closed",
        shiftId: updated.shiftId,
        status: updated.status,
        kind: "DIFFERENT_STOP",
        requestKind: "DIFFERENT_STOP",
        requestReason: `İstek ${closeStatus === "ACCEPTED" ? "onaylandı" : "iptal edildi"}.`,
        decisionState,
        decisionText,
      };

      io.to(`company:${updated.shift.companyId}`).emit("request:update", evt);
      io.to(`room:${updated.shift.roomId}`).emit("request:update", evt);
      io.to(`shift:${updated.shiftId}`).emit("request:update", evt);

      return res.json({
        ...updated,
        requestKind: "DIFFERENT_STOP",
        requestReason: `İstek ${closeStatus === "ACCEPTED" ? "onaylandı" : "iptal edildi"}.`,
        decisionState,
        decisionText,
      });
    } catch (e) {
      logger.error("[requests] POST /:id/close error:", e);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });

  return r;
}
