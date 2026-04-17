// backend/src/routes/agreements.js
import express from "express";
import { prisma } from "../prisma.js";
import { buildAgreementCommercialBackboneMap, upsertAgreementCommercialBackbone } from "../services/paymentBackbone.js";
import { dateOnlyUTCFromYmd } from "../time/tr.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { httpError, sendErrorResponse } from "../errors/http.js";
import { createAndEmitNotification } from "../notifications/service.js";
import { ymdTR, addDaysTR, atTR } from "../time/tr.js";
// ✅ M59: agreement UI shift stats helper endpoint

import { computeFirstStartAtUTC } from "../services/agreementConflict.js";
import { findReservationConflictForAgreement } from "../services/reservationConflict.js";
import { validateAgreementSlotItems } from "../services/agreementSlots.js";

function parseDateOnly(s) {
  const v = String(s || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return dateOnlyUTCFromYmd(v);
}
function toInt(v, def = null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}
function toFloat(v, def = null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}
function clampMin(v) {
  const n = toInt(v, null);
  if (n == null) return null;
  if (n < 0 || n > 1439) return null;
  return n;
}
function clampWeekMask(v) {
  const n = toInt(v, null);
  if (n == null) return null;
  if (n < 1 || n > 127) return null;
  return n;
}

function trimOrNull(v) {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function agreementRef(id) {
  return `Sözleşme #${id}`;
}

function offerSummary(amount, note) {
  return `${amount ?? "-"}${note ? " — " + note : ""}`;
}

function directCreateBlockedMessage() {
  return "Doğrudan sözleşme açma kapalı. Önce vardiya oluşturup “Sözleşmeye Dönüştür” kullan.";
}

async function requireSourceShiftForAgreementCreate(tx, { sourceShiftId, companyId, roomId }) {
  const id = Number(sourceShiftId || 0);
  if (id <= 0) throw httpError(400, "SOURCE_SHIFT_REQUIRED", directCreateBlockedMessage());
  const shift = await tx.shift.findUnique({
    where: { id },
    select: { id: true, companyId: true, roomId: true, status: true },
  });
  if (!shift || Number(shift.companyId || 0) !== Number(companyId || 0)) {
    throw httpError(400, "SOURCE_SHIFT_INVALID", "Kaynak vardiya bulunamadı.");
  }
  if (Number(roomId || 0) > 0 && Number(shift.roomId || 0) !== Number(roomId || 0)) {
    throw httpError(400, "SOURCE_SHIFT_ROOM_MISMATCH", "Kaynak vardiya ile seçilen oda aynı olmalı.");
  }
  if (String(shift.status || "").toUpperCase() === "DRAFT") {
    throw httpError(400, "SOURCE_SHIFT_INVALID_STATUS", "Taslak vardiyadan sözleşme açılamaz.");
  }
  return shift;
}

function parseOfferAmount(v) {
  const n = toInt(v, null);
  if (n == null) return null;
  if (n <= 0) return null;
  return n;
}

function parseOfferAmountNullable(v) {
  const raw = v == null ? "" : String(v).trim();
  if (!raw) return null;
  return parseOfferAmount(raw);
}

function normDirection(v) {
  const s = String(v || "INBOUND").trim().toUpperCase();
  if (s === "INBOUND" || s === "OUTBOUND") return s;
  return null;
}
function normPattern(v) {
  const s = String(v || "ONE_WAY").trim().toUpperCase();
  if (s === "ONE_WAY" || s === "LOOP") return s;
  return null;
}
function parseHub(body) {
  const lat = body?.hubLat == null || body?.hubLat === "" ? null : toFloat(body.hubLat, null);
  const lng = body?.hubLng == null || body?.hubLng === "" ? null : toFloat(body.hubLng, null);
  if (lat == null && lng == null) return { hubLat: null, hubLng: null };
  if (lat == null || lng == null) return { error: "hubLat+hubLng birlikte olmalı" };
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return { error: "hubLat/hubLng range invalid" };
  return { hubLat: lat, hubLng: lng };
}

export function agreementsRouter(io) {
  const r = express.Router();

  // LIST
  r.get("/", authRequired(), requireRole("COMPANY", "ROOM", "SUPER_ADMIN"), async (req, res) => {
    const take = Math.min(200, Math.max(1, Number(req.query.take || 50)));
    const status = String(req.query.status || "").trim() || null;
    const q = String(req.query.q || "").trim();

    const where = {};
    if (status) where.status = status;

    // scope
    if (req.user.role === "COMPANY") where.companyId = req.user.companyId ?? -1;
    if (req.user.role === "ROOM") where.roomId = req.user.roomId ?? -1;

    if (q) {
      where.OR = [
        { room: { is: { name: { contains: q, mode: "insensitive" } } } },
        { companyOfferNote: { contains: q, mode: "insensitive" } },
        { roomOfferNote: { contains: q, mode: "insensitive" } },
      ];
      if (Number.isFinite(Number(q)) && Number(q) > 0) {
        where.OR.push({ id: Number(q) });
      }
    }

    const items = await prisma.agreement.findMany({
      where,
      take,
      orderBy: { id: "desc" },
      include: q ? { room: { select: { id: true, name: true } } } : undefined,
    });

    const commercialBackboneByAgreementId = await buildAgreementCommercialBackboneMap(items.map((item) => item.id));
    const mapped = items.map((item) => ({
      ...item,
      commercialBackbone: commercialBackboneByAgreementId[Number(item.id)] || null,
    }));

    res.json({ items: mapped });
  });

  // ✅ M59: SHIFT STATS (for UI clarity)
  // Body: { agreementIds: number[], horizonDays?: number }
  // Returns: { byId: { [id]: { todayTotal, todayDone, horizonOpen } } }
  r.post("/shift-stats", authRequired(), requireRole("COMPANY", "ROOM", "SUPER_ADMIN"), async (req, res) => {
    const ids = Array.isArray(req.body?.agreementIds) ? req.body.agreementIds.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0) : [];
    const horizonDays = Math.min(30, Math.max(1, Number(req.body?.horizonDays ?? 7)));

    if (!ids.length) return res.json({ byId: {} });

    const now = new Date();
    const todayYmd = ymdTR(now);
    const todayStart = atTR(todayYmd, 0);
    const tomorrowStart = atTR(addDaysTR(todayYmd, 1), 0);
    const horizonEnd = atTR(addDaysTR(todayYmd, horizonDays), 0);

    const scope = { agreementId: { in: ids } };
    if (req.user.role === "COMPANY") scope.companyId = req.user.companyId ?? -1;
    if (req.user.role === "ROOM") scope.roomId = req.user.roomId ?? -1;

    const todayWhere = { ...scope, startAt: { gte: todayStart, lt: tomorrowStart }, status: { not: "DRAFT" } };
    const horizonWhere = { ...scope, startAt: { gte: now, lt: horizonEnd }, status: { in: ["APPROVED", "ACTIVE"] } };

    const [todayTotal, todayDone, horizonOpen] = await Promise.all([
      prisma.shift.groupBy({ by: ["agreementId"], where: todayWhere, _count: { _all: true } }),
      prisma.shift.groupBy({ by: ["agreementId"], where: { ...todayWhere, status: "DONE" }, _count: { _all: true } }),
      prisma.shift.groupBy({ by: ["agreementId"], where: horizonWhere, _count: { _all: true } }),
    ]);

    const byId = {};
    for (const id of ids) byId[id] = { todayTotal: 0, todayDone: 0, horizonOpen: 0 };

    for (const row of (todayTotal || [])) {
      const id = Number(row.agreementId);
      if (!byId[id]) byId[id] = { todayTotal: 0, todayDone: 0, horizonOpen: 0 };
      byId[id].todayTotal = Number(row?._count?._all ?? 0);
    }
    for (const row of (todayDone || [])) {
      const id = Number(row.agreementId);
      if (!byId[id]) byId[id] = { todayTotal: 0, todayDone: 0, horizonOpen: 0 };
      byId[id].todayDone = Number(row?._count?._all ?? 0);
    }
    for (const row of (horizonOpen || [])) {
      const id = Number(row.agreementId);
      if (!byId[id]) byId[id] = { todayTotal: 0, todayDone: 0, horizonOpen: 0 };
      byId[id].horizonOpen = Number(row?._count?._all ?? 0);
    }

    res.json({ byId, meta: { todayStart, tomorrowStart, horizonEnd, horizonDays } });
  });
  // M91-D: OPERATION BRIDGE SUMMARY
  // Body: { agreementIds:number[] }
  // Returns: { byId: { [id]: { generatedCount, lastShift, agreementVehicle, agreementDriver } } }
  r.post("/ops-bridge", authRequired(), requireRole("COMPANY", "ROOM", "SUPER_ADMIN"), async (req, res) => {
    const ids = Array.isArray(req.body?.agreementIds) ? req.body.agreementIds.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0) : [];
    if (!ids.length) return res.json({ byId: {} });

    const agreementWhere = { id: { in: ids } };
    if (req.user.role === "COMPANY") agreementWhere.companyId = req.user.companyId ?? -1;
    if (req.user.role === "ROOM") agreementWhere.roomId = req.user.roomId ?? -1;

    const agreements = await prisma.agreement.findMany({
      where: agreementWhere,
      select: {
        id: true,
        vehicleId: true,
        driverId: true,
        hubLat: true,
        hubLng: true,
        direction: true,
        pattern: true,
        startMin: true,
        endMin: true,
        weekMask: true,
        vehicle: { select: { id: true, plate: true } },
        driver: { select: { id: true, fullName: true } },
      },
    });

    const allowedIds = agreements.map((row) => Number(row.id)).filter((n) => Number.isFinite(n) && n > 0);
    if (!allowedIds.length) return res.json({ byId: {} });

    const sourceRows = await prisma.commercialSource.findMany({
      where: { agreementId: { in: allowedIds }, shiftRootId: { not: null } },
      select: { agreementId: true, shiftRootId: true },
      orderBy: { id: "asc" },
    });
    const sourceShiftIdByAgreement = Object.create(null);
    for (const row of sourceRows || []) {
      const aid = Number(row?.agreementId || 0);
      const sid = Number(row?.shiftRootId || 0);
      if (aid > 0 && sid > 0 && !sourceShiftIdByAgreement[aid]) sourceShiftIdByAgreement[aid] = sid;
    }
    const sourceShiftIds = Array.from(new Set(Object.values(sourceShiftIdByAgreement).map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0)));
    const sourceShiftRows = sourceShiftIds.length
      ? await prisma.shift.findMany({
          where: { id: { in: sourceShiftIds } },
          select: {
            id: true,
            routeSnapshotValidatedAt: true,
            routeSnapshotDistanceM: true,
            routeSnapshotDurationSec: true,
            _count: { select: { stops: true, people: true } },
          },
        })
      : [];
    const sourceShiftById = Object.create(null);
    for (const row of sourceShiftRows || []) sourceShiftById[Number(row.id)] = row;

    const shiftWhere = { agreementId: { in: allowedIds }, status: { not: "DRAFT" } };
    if (req.user.role === "COMPANY") shiftWhere.companyId = req.user.companyId ?? -1;
    if (req.user.role === "ROOM") shiftWhere.roomId = req.user.roomId ?? -1;

    const [counts, lastShifts] = await Promise.all([
      prisma.shift.groupBy({ by: ["agreementId"], where: shiftWhere, _count: { _all: true } }),
      prisma.shift.findMany({
        where: shiftWhere,
        orderBy: [{ startAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          agreementId: true,
          startAt: true,
          endAt: true,
          status: true,
          vehicleId: true,
          driverId: true,
          hubLat: true,
          hubLng: true,
          direction: true,
          pattern: true,
          routeSnapshotValidatedAt: true,
          routeSnapshotDistanceM: true,
          routeSnapshotDurationSec: true,
          vehicle: { select: { id: true, plate: true } },
          driver: { select: { id: true, fullName: true } },
          _count: { select: { stops: true, people: true } },
        },
      }),
    ]);

    const countMap = Object.create(null);
    for (const row of counts || []) countMap[Number(row.agreementId)] = Number(row?._count?._all ?? 0);

    const lastByAgreement = Object.create(null);
    for (const row of lastShifts || []) {
      const aid = Number(row?.agreementId || 0);
      if (!aid || lastByAgreement[aid]) continue;
      const sourceShift = sourceShiftById[Number(sourceShiftIdByAgreement[aid] || 0)] || null;
      const generatedStopCount = Number(row?._count?.stops ?? 0) || 0;
      const generatedPeopleCount = Number(row?._count?.people ?? 0) || 0;
      const sourceStopCount = Number(sourceShift?._count?.stops ?? 0) || 0;
      const sourcePeopleCount = Number(sourceShift?._count?.people ?? 0) || 0;
      const stopCount = generatedStopCount > 1 ? generatedStopCount : Math.max(generatedStopCount, sourceStopCount);
      const peopleCount = generatedPeopleCount > 0 ? generatedPeopleCount : sourcePeopleCount;
      const previewAvailable = Boolean(row?.routeSnapshotValidatedAt || sourceShift?.routeSnapshotValidatedAt || stopCount || peopleCount || sourceShiftIdByAgreement[aid]);
      lastByAgreement[aid] = {
        id: row.id,
        startAt: row.startAt,
        endAt: row.endAt,
        status: row.status,
        vehicleId: row.vehicleId,
        driverId: row.driverId,
        hubLat: row.hubLat,
        hubLng: row.hubLng,
        direction: row.direction,
        pattern: row.pattern,
        routeSnapshotValidatedAt: row.routeSnapshotValidatedAt || sourceShift?.routeSnapshotValidatedAt || null,
        routeSnapshotDistanceM: row.routeSnapshotDistanceM ?? sourceShift?.routeSnapshotDistanceM ?? null,
        routeSnapshotDurationSec: row.routeSnapshotDurationSec ?? sourceShift?.routeSnapshotDurationSec ?? null,
        stopCount,
        peopleCount,
        previewAvailable,
        vehicle: row.vehicle ? { id: row.vehicle.id, plate: row.vehicle.plate || null } : null,
        driver: row.driver ? { id: row.driver.id, fullName: row.driver.fullName || null } : null,
      };
    }

    const byId = {};
    for (const ag of agreements) {
      byId[ag.id] = {
        generatedCount: Number(countMap[Number(ag.id)] || 0),
        agreementVehicle: ag.vehicle ? { id: ag.vehicle.id, plate: ag.vehicle.plate || null } : (ag.vehicleId ? { id: ag.vehicleId, plate: null } : null),
        agreementDriver: ag.driver ? { id: ag.driver.id, fullName: ag.driver.fullName || null } : (ag.driverId ? { id: ag.driverId, fullName: null } : null),
        plan: {
          hubLat: ag.hubLat,
          hubLng: ag.hubLng,
          direction: ag.direction,
          pattern: ag.pattern,
          startMin: ag.startMin,
          endMin: ag.endMin,
          weekMask: ag.weekMask,
        },
        lastShift: lastByAgreement[Number(ag.id)] || null,
      };
    }

    res.json({ byId });
  });

  // GET by id (debug + checks)
  r.get("/:id", authRequired(), requireRole("COMPANY", "ROOM", "SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);
    const ag = await prisma.agreement.findUnique({ where: { id } });
    if (!ag) return sendErrorResponse(res, httpError(404, "notFound"));

    if (req.user.role === "COMPANY" && ag.companyId !== req.user.companyId) {
      return sendErrorResponse(res, httpError(403, "Forbidden"));
    }
    if (req.user.role === "ROOM" && ag.roomId !== req.user.roomId) {
      return sendErrorResponse(res, httpError(403, "Forbidden"));
    }

    res.json(ag);
  });

  // M91-F: BUNDLE CREATE (COMPANY)
  // Body: { roomId,startDate,endDate,weekMask,items:[{startMin,endMin,direction,pattern,label?}], hubLat?,hubLng?, companyOfferAmount?, companyOfferNote? }
  r.post("/bundle", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const companyId = req.user.companyId;
    if (!companyId) return sendErrorResponse(res, httpError(400, "companyId required"));

    const roomId = Number(req.body.roomId);
    const room = await prisma.room.findUnique({ where: { id: roomId }, select: { id: true, status: true } });
    if (!room || room.status === "DELETED") return sendErrorResponse(res, httpError(400, "invalidRoomId"));

    const startDate = parseDateOnly(req.body.startDate);
    const endDate = parseDateOnly(req.body.endDate);
    const weekMask = clampWeekMask(req.body.weekMask);
    if (!startDate || !endDate) return sendErrorResponse(res, httpError(400, "startDate/endDate required"));
    if (endDate < startDate) return sendErrorResponse(res, httpError(400, "endDate must be >= startDate"));
    if (weekMask == null) return sendErrorResponse(res, httpError(400, "weekMask required (1..127)"));

    const slotValidation = validateAgreementSlotItems(req.body?.items);
    if (!slotValidation?.ok) return sendErrorResponse(res, httpError(400, "BAD_REQUEST", slotValidation?.message || "invalidSlotBundle"));

    const hub = parseHub(req.body);
    if (hub?.error) return sendErrorResponse(res, httpError(400, "BAD_REQUEST", hub.error));
    const sourceShiftId = Number(req.body?.sourceShiftId || 0);

    await requireSourceShiftForAgreementCreate(prisma, { sourceShiftId, companyId, roomId });

    const created = await prisma.$transaction(async (tx) => {
      const rows = [];
      for (const slot of slotValidation.slots) {
        const row = await tx.agreement.create({
          data: {
            companyId,
            roomId,
            startDate,
            endDate,
            weekMask,
            startMin: slot.startMin,
            endMin: slot.endMin,
            status: "REQUESTED",
            hubLat: hub.hubLat,
            hubLng: hub.hubLng,
            direction: slot.direction,
            pattern: slot.pattern,
            companyOfferAmount: toInt(req.body.companyOfferAmount, null),
            companyOfferNote: req.body.companyOfferNote ? String(req.body.companyOfferNote) : null,
          },
        });
        rows.push(row);
      }
      return rows;
    });

    for (const row of created) {
      await upsertAgreementCommercialBackbone(row.id, { sourceShiftId }).catch(() => null);
      await createAndEmitNotification({
        io,
        type: "AGREEMENT_REQUESTED",
        scope: "ROOM",
        roomId,
        companyId,
        payload: {
          v: 1,
          kind: "agreement:requested",
          title: "Yeni sözleşme talebi",
          message: `${agreementRef(row.id)} • teklif: ${offerSummary(row.companyOfferAmount, row.companyOfferNote)}`,
        },
        dedupeKey: `agreement:${row.id}:requested`,
      });
      io?.to?.(`company:${companyId}`)?.emit?.("agreement:update", { id: row.id, kind: "created" });
      io?.to?.(`room:${roomId}`)?.emit?.("agreement:update", { id: row.id, kind: "created" });
    }

    return res.json({ ok: true, createdIds: created.map((row) => Number(row.id)), items: created });
  });

  // CREATE (COMPANY)
  r.post("/", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const companyId = req.user.companyId;
    if (!companyId) return sendErrorResponse(res, httpError(400, "companyId required"));

    const roomId = Number(req.body.roomId);
    const room = await prisma.room.findUnique({ where: { id: roomId }, select: { id: true, status: true } });
    if (!room || room.status === "DELETED") return sendErrorResponse(res, httpError(400, "invalidRoomId"));

    const startDate = parseDateOnly(req.body.startDate);
    const endDate = parseDateOnly(req.body.endDate);
    const weekMask = clampWeekMask(req.body.weekMask);
    const startMin = clampMin(req.body.startMin);
    const endMin = clampMin(req.body.endMin);

    if (!startDate || !endDate) return sendErrorResponse(res, httpError(400, "startDate/endDate required"));
    if (endDate < startDate) return sendErrorResponse(res, httpError(400, "endDate must be >= startDate"));
    if (weekMask == null) return sendErrorResponse(res, httpError(400, "weekMask required (1..127)"));
    if (startMin == null || endMin == null) return sendErrorResponse(res, httpError(400, "startMin/endMin required (0..1439)"));

    // ✅ M19: routing meta
    const direction = normDirection(req.body.direction);
    const pattern = normPattern(req.body.pattern);
    if (!direction) return sendErrorResponse(res, httpError(400, "direction invalid (INBOUND|OUTBOUND)"));
    if (!pattern) return sendErrorResponse(res, httpError(400, "pattern invalid (ONE_WAY|LOOP)"));
    const hub = parseHub(req.body);
    if (hub?.error) return sendErrorResponse(res, httpError(400, "BAD_REQUEST", hub.error));

    const sourceShiftId = Number(req.body?.sourceShiftId || 0);

    await requireSourceShiftForAgreementCreate(prisma, { sourceShiftId, companyId, roomId });

    const created = await prisma.agreement.create({
      data: {
        companyId,
        roomId,
        startDate,
        endDate,
        weekMask,
        startMin,
        endMin,
        status: "REQUESTED",
        hubLat: hub.hubLat,
        hubLng: hub.hubLng,
        direction,
        pattern,
        companyOfferAmount: toInt(req.body.companyOfferAmount, null),
        companyOfferNote: req.body.companyOfferNote ? String(req.body.companyOfferNote) : null,
      },
    });

    await upsertAgreementCommercialBackbone(created.id, { sourceShiftId }).catch(() => null);

    // ✅ M53: notify ROOM (company offer visible)
    await createAndEmitNotification({
      io,
      type: "AGREEMENT_REQUESTED",
      scope: "ROOM",
      roomId: roomId,
      companyId,
      payload: {
        v: 1,
        kind: "agreement:requested",
        title: "Yeni sözleşme talebi",
        message: `${agreementRef(created.id)} • teklif: ${offerSummary(created.companyOfferAmount, created.companyOfferNote)}`,
      },
      dedupeKey: `agreement:${created.id}:requested`,
    });

    io?.to?.(`company:${companyId}`)?.emit?.("agreement:update", { id: created.id, kind: "created" });
    io?.to?.(`room:${roomId}`)?.emit?.("agreement:update", { id: created.id, kind: "created" });

    res.json(created);
  });

  // APPROVE (ROOM): assign vehicle+driver + conflict check
  r.put("/:id/approve", authRequired(), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);
    const ag = await prisma.agreement.findUnique({ where: { id } });
    if (!ag) return sendErrorResponse(res, httpError(404, "notFound"));

    if (req.user.role === "ROOM" && ag.roomId !== req.user.roomId) {
      return sendErrorResponse(res, httpError(403, "Forbidden"));
    }

    const st = String(ag.status || "").toUpperCase();
    if (st === "COUNTERED") {
      return res.status(409).json({
        error: "Counter pending: company decision required",
        code: "AGREEMENT_NEEDS_COMPANY_DECISION",
      });
    }
    if (st === "CANCELLED" || st === "REJECTED" || st === "DONE") {
      return res.status(409).json({
        error: `invalidState:${st}`,
        code: "AGREEMENT_INVALID_STATE",
      });
    }

    const vehicleId = Number(req.body.vehicleId);
    const driverId = Number(req.body.driverId);
    if (!vehicleId || !driverId) return sendErrorResponse(res, httpError(400, "vehicleId+driverId required"));

    const conflict = await findReservationConflictForAgreement({
      agreementId: ag.id,
      vehicleId,
      driverId,
      startDate: ag.startDate,
      endDate: ag.endDate,
      weekMask: ag.weekMask,
      startMin: ag.startMin,
      endMin: ag.endMin,
    });
    if (conflict) {
      return res.status(409).json(conflict);
    }

    const now = new Date();
    const firstStart = computeFirstStartAtUTC(ag);

    const nextStatus = now >= firstStart ? "ACTIVE" : "APPROVED";

    const updated = await prisma.agreement.update({
      where: { id: ag.id },
      data: {
        vehicleId,
        driverId,
        // NOTE: pricing pazarlÄ±ÄŸÄ± M57 itibariyle Agreement seviyesinde yapÄ±lÄ±r.
        // roomOfferAmount/note burada opsiyonel bÄ±rakÄ±ldÄ± (geriye dÃ¶nÃ¼k uyum).
        roomOfferAmount: toInt(req.body.roomOfferAmount, null),
        roomOfferNote: req.body.roomOfferNote ? String(req.body.roomOfferNote) : null,
        status: nextStatus,
      },
    });


    // ✅ M53: notify COMPANY (room approved / assigned)
    await createAndEmitNotification({
      io,
      type: "AGREEMENT_APPROVED",
      scope: "COMPANY",
      companyId: updated.companyId,
      roomId: updated.roomId,
      payload: {
        v: 1,
        kind: "agreement:approved",
        title: "Sözleşme kabul edildi",
        message: `${agreementRef(updated.id)} kabul edildi. Araç=${updated.vehicleId} Sürücü=${updated.driverId}`,
      },
      dedupeKey: `agreement:${updated.id}:approved`,
    });

    io?.to?.(`company:${updated.companyId}`)?.emit?.("agreement:update", { id: updated.id, kind: "approved" });
    io?.to?.(`room:${updated.roomId}`)?.emit?.("agreement:update", { id: updated.id, kind: "approved" });

    await upsertAgreementCommercialBackbone(updated.id).catch(() => null);
    res.json(updated);
  });

  // COUNTER (ROOM): propose price (no vehicle/driver assignment)
  r.put("/:id/counter", authRequired(), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);
    const ag = await prisma.agreement.findUnique({ where: { id } });
    if (!ag) return sendErrorResponse(res, httpError(404, "notFound"));

    if (req.user.role === "ROOM" && ag.roomId !== req.user.roomId) {
      return sendErrorResponse(res, httpError(403, "Forbidden"));
    }

    const st = String(ag.status || "").toUpperCase();
    if (st === "CANCELLED" || st === "REJECTED" || st === "DONE") {
      return sendErrorResponse(res, httpError(409, "AGREEMENT_INVALID_STATE", `invalidState:${st}`));
    }
    if (st === "APPROVED" || st === "ACTIVE") {
      return sendErrorResponse(res, httpError(409, "AGREEMENT_ALREADY_APPROVED", `alreadyApproved:${st}`));
    }

    const roomOfferAmount = parseOfferAmount(req.body.roomOfferAmount);
    if (roomOfferAmount == null) return sendErrorResponse(res, httpError(400, "roomOfferAmount required (>0)"));

    const roomOfferNote = trimOrNull(req.body.roomOfferNote);

    const updated = await prisma.agreement.update({
      where: { id },
      data: {
        roomOfferAmount,
        roomOfferNote,
        status: "COUNTERED",
      },
    });

    // notify COMPANY
    await createAndEmitNotification({
      io,
      type: "AGREEMENT_COUNTERED",
      scope: "COMPANY",
      companyId: updated.companyId,
      roomId: updated.roomId,
      payload: {
        v: 1,
        kind: "agreement:countered",
        title: "Karşı teklif",
        message: `${agreementRef(updated.id)} • karşı teklif: ${offerSummary(updated.roomOfferAmount, updated.roomOfferNote)}`,
      },
      dedupeKey: `agreement:${updated.id}:counter`,
    });

    io?.to?.(`company:${updated.companyId}`)?.emit?.("agreement:update", { id: updated.id, kind: "countered" });
    io?.to?.(`room:${updated.roomId}`)?.emit?.("agreement:update", { id: updated.id, kind: "countered" });

    await upsertAgreementCommercialBackbone(updated.id).catch(() => null);
    res.json(updated);
  });

  // ACCEPT COUNTER (COMPANY): accept room price -> back to REQUESTED (waiting room approval/assignment)
  r.put("/:id/accept-counter", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const id = Number(req.params.id);
    const ag = await prisma.agreement.findUnique({ where: { id } });
    if (!ag) return sendErrorResponse(res, httpError(404, "notFound"));
    if (ag.companyId !== req.user.companyId) return sendErrorResponse(res, httpError(403, "Forbidden"));

    const st = String(ag.status || "").toUpperCase();
    if (st !== "COUNTERED") {
      return sendErrorResponse(res, httpError(409, "AGREEMENT_COUNTER_NOT_PENDING", `notCountered:${st}`));
    }
    if (ag.roomOfferAmount == null) return sendErrorResponse(res, httpError(400, "roomOfferAmount missing"));

    const updated = await prisma.agreement.update({
      where: { id },
      data: {
        companyOfferAmount: ag.roomOfferAmount,
        companyOfferNote: ag.roomOfferNote ?? ag.companyOfferNote ?? null,
        status: "REQUESTED",
      },
    });

    // notify ROOM
    await createAndEmitNotification({
      io,
      type: "AGREEMENT_COUNTER_ACCEPTED",
      scope: "ROOM",
      roomId: updated.roomId,
      companyId: updated.companyId,
      payload: {
        v: 1,
        kind: "agreement:counterAccepted",
        title: "Karşı teklif kabul edildi",
        message: `${agreementRef(updated.id)} • teklif kabul edildi: ${updated.companyOfferAmount ?? "-"}`,
      },
      dedupeKey: `agreement:${updated.id}:counterAccepted:${updated.companyOfferAmount ?? "X"}`,
    });

    io?.to?.(`company:${updated.companyId}`)?.emit?.("agreement:update", { id: updated.id, kind: "counterAccepted" });
    io?.to?.(`room:${updated.roomId}`)?.emit?.("agreement:update", { id: updated.id, kind: "counterAccepted" });

    await upsertAgreementCommercialBackbone(updated.id).catch(() => null);
    res.json(updated);
  });

  // COMPANY COUNTER (COMPANY): send a revised company offer after room counter
  r.put("/:id/company-counter", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const id = Number(req.params.id);
    const ag = await prisma.agreement.findUnique({ where: { id } });
    if (!ag) return sendErrorResponse(res, httpError(404, "notFound"));
    if (ag.companyId !== req.user.companyId) return sendErrorResponse(res, httpError(403, "Forbidden"));

    const st = String(ag.status || "").toUpperCase();
    if (st !== "COUNTERED") {
      return sendErrorResponse(res, httpError(409, "AGREEMENT_COUNTER_NOT_PENDING", `notCountered:${st}`));
    }

    const companyOfferAmount = parseOfferAmount(req.body.companyOfferAmount);
    if (companyOfferAmount == null) return sendErrorResponse(res, httpError(400, "companyOfferAmount required (>0)"));

    const companyOfferNote = trimOrNull(req.body.companyOfferNote);

    const updated = await prisma.agreement.update({
      where: { id },
      data: {
        companyOfferAmount,
        companyOfferNote,
        status: "REQUESTED",
      },
    });

    await createAndEmitNotification({
      io,
      type: "AGREEMENT_COMPANY_COUNTERED",
      scope: "ROOM",
      roomId: updated.roomId,
      companyId: updated.companyId,
      payload: {
        v: 1,
        kind: "agreement:companyCountered",
        title: "Şirket yeni teklif gönderdi",
        message: `${agreementRef(updated.id)} • yeni teklif: ${offerSummary(updated.companyOfferAmount, updated.companyOfferNote)}`,
      },
      dedupeKey: `agreement:${updated.id}:companyCounter:${updated.companyOfferAmount ?? "X"}`,
    });

    io?.to?.(`company:${updated.companyId}`)?.emit?.("agreement:update", { id: updated.id, kind: "companyCountered" });
    io?.to?.(`room:${updated.roomId}`)?.emit?.("agreement:update", { id: updated.id, kind: "companyCountered" });

    await upsertAgreementCommercialBackbone(updated.id).catch(() => null);
    res.json(updated);
  });

  // REJECT COUNTER (COMPANY): reject and return to REQUESTED (clears roomOffer*)
  r.put("/:id/reject-counter", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const id = Number(req.params.id);
    const ag = await prisma.agreement.findUnique({ where: { id } });
    if (!ag) return sendErrorResponse(res, httpError(404, "notFound"));
    if (ag.companyId !== req.user.companyId) return sendErrorResponse(res, httpError(403, "Forbidden"));

    const st = String(ag.status || "").toUpperCase();
    if (st !== "COUNTERED") {
      return sendErrorResponse(res, httpError(409, "AGREEMENT_COUNTER_NOT_PENDING", `notCountered:${st}`));
    }

    const updated = await prisma.agreement.update({
      where: { id },
      data: {
        roomOfferAmount: null,
        roomOfferNote: null,
        status: "REQUESTED",
      },
    });

    await createAndEmitNotification({
      io,
      type: "AGREEMENT_COUNTER_REJECTED",
      scope: "ROOM",
      roomId: updated.roomId,
      companyId: updated.companyId,
      payload: {
        v: 1,
        kind: "agreement:counterRejected",
        title: "Karşı teklif reddedildi",
        message: `${agreementRef(updated.id)} • karşı teklif reddedildi. Yeni teklif gönderebilirsin.`,
      },
      dedupeKey: `agreement:${updated.id}:counterRejected`,
    });

    io?.to?.(`company:${updated.companyId}`)?.emit?.("agreement:update", { id: updated.id, kind: "counterRejected" });
    io?.to?.(`room:${updated.roomId}`)?.emit?.("agreement:update", { id: updated.id, kind: "counterRejected" });

    await upsertAgreementCommercialBackbone(updated.id).catch(() => null);
    res.json(updated);
  });

  // REJECT (ROOM): reject agreement request / negotiation
  r.put("/:id/reject", authRequired(), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);
    const ag = await prisma.agreement.findUnique({ where: { id } });
    if (!ag) return sendErrorResponse(res, httpError(404, "notFound"));

    if (req.user.role === "ROOM" && ag.roomId !== req.user.roomId) {
      return sendErrorResponse(res, httpError(403, "Forbidden"));
    }

    const st = String(ag.status || "").toUpperCase();
    if (st === "CANCELLED" || st === "REJECTED" || st === "DONE") {
      return sendErrorResponse(res, httpError(409, "AGREEMENT_INVALID_STATE", `invalidState:${st}`));
    }
    if (st === "APPROVED" || st === "ACTIVE") {
      return sendErrorResponse(res, httpError(409, "AGREEMENT_ALREADY_APPROVED", `alreadyApproved:${st}`));
    }

    const updated = await prisma.agreement.update({
      where: { id },
      data: { status: "REJECTED" },
    });

    await createAndEmitNotification({
      io,
      type: "AGREEMENT_REJECTED",
      scope: "COMPANY",
      companyId: updated.companyId,
      roomId: updated.roomId,
      payload: {
        v: 1,
        kind: "agreement:rejected",
        title: "Sözleşme reddedildi",
        message: `${agreementRef(updated.id)} reddedildi.`,
      },
      dedupeKey: `agreement:${updated.id}:rejected`,
    });

    io?.to?.(`company:${updated.companyId}`)?.emit?.("agreement:update", { id: updated.id, kind: "rejected" });
    io?.to?.(`room:${updated.roomId}`)?.emit?.("agreement:update", { id: updated.id, kind: "rejected" });

    await upsertAgreementCommercialBackbone(updated.id).catch(() => null);
    res.json(updated);
  });

  // CANCEL (COMPANY)
  r.put("/:id/cancel", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const id = Number(req.params.id);
    const ag = await prisma.agreement.findUnique({ where: { id } });
    if (!ag) return sendErrorResponse(res, httpError(404, "notFound"));
    if (ag.companyId !== req.user.companyId) return sendErrorResponse(res, httpError(403, "Forbidden"));

    const updated = await prisma.agreement.update({
      where: { id },
      data: { status: "CANCELLED" },
    });


    // ✅ M53: notify ROOM (company cancelled)
    await createAndEmitNotification({
      io,
      type: "AGREEMENT_CANCELLED",
      scope: "ROOM",
      roomId: updated.roomId,
      companyId: updated.companyId,
      payload: {
        v: 1,
        kind: "agreement:cancelled",
        title: "Sözleşme iptal edildi",
        message: `${agreementRef(updated.id)} iptal edildi.`,
      },
      dedupeKey: `agreement:${updated.id}:cancelled`,
    });

    io?.to?.(`company:${updated.companyId}`)?.emit?.("agreement:update", { id: updated.id, kind: "cancelled" });
    io?.to?.(`room:${updated.roomId}`)?.emit?.("agreement:update", { id: updated.id, kind: "cancelled" });

    await upsertAgreementCommercialBackbone(updated.id).catch(() => null);
    res.json(updated);
  });


  // ✅ M57: AGREEMENT EXTEND NEGOTIATION
  // Model:
  // - Company sends extend-request (new endDate + optional new offer amount/note)
  // - Room can accept/reject OR counter price (then company accepts/rejects counter)
  // - Old /extend endpoint kept for backward compatibility; it behaves like extend-request.

  function ymdOfDateOnly(d) {
    try {
      return ymdTR(d);
    } catch {
      return "";
    }
  }

  async function assertNoExtendConflictOr409(ag, proposedEndDate, res) {
    if (!ag.vehicleId && !ag.driverId) return true;

    const conflict = await findReservationConflictForAgreement({
      agreementId: ag.id,
      vehicleId: ag.vehicleId ?? undefined,
      driverId: ag.driverId ?? undefined,
      startDate: ag.startDate,
      endDate: proposedEndDate,
      weekMask: ag.weekMask,
      startMin: ag.startMin,
      endMin: ag.endMin,
    });
    if (conflict) {
      res.status(409).json(conflict);
      return false;
    }
    return true;
  }

  function computeReactivatedStatus(ag, proposedEndDate) {
    const now = new Date();
    const firstStart = computeFirstStartAtUTC(ag);
    return now >= firstStart ? "ACTIVE" : "APPROVED";
  }

  // EXTEND REQUEST (COMPANY)
  r.put("/:id/extend-request", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const id = Number(req.params.id);
    const ag = await prisma.agreement.findUnique({ where: { id } });
    if (!ag) return sendErrorResponse(res, httpError(404, "notFound"));
    if (ag.companyId !== req.user.companyId) return sendErrorResponse(res, httpError(403, "Forbidden"));

    const st = String(ag.status || "").toUpperCase();
    if (st === "CANCELLED" || st === "REJECTED") {
      return sendErrorResponse(res, httpError(409, "AGREEMENT_INVALID_STATE", `invalidState:${st}`));
    }

    const endDate = parseDateOnly(req.body.endDate);
    if (!endDate) return sendErrorResponse(res, httpError(400, "endDate required (YYYY-MM-DD)"));
    if (endDate < ag.startDate) return sendErrorResponse(res, httpError(400, "endDate must be >= startDate"));
    if (endDate <= ag.endDate) return sendErrorResponse(res, httpError(400, "endDate must be > current endDate"));

    // if room already countered, do not overwrite the negotiation
    const ex = String(ag.extendStatus || "NONE").toUpperCase();
    if (ex === "COUNTERED") {
      return sendErrorResponse(res, httpError(409, "AGREEMENT_EXTEND_COUNTER_PENDING", "extendCounterPending"));
    }

    // optional offer update
    const offerAmount = parseOfferAmountNullable(req.body.extendOfferAmount);
    if (String(req.body.extendOfferAmount || "").trim() && offerAmount == null) {
      return sendErrorResponse(res, httpError(400, "extendOfferAmount invalid (>0)"));
    }
    const offerNote = trimOrNull(req.body.extendOfferNote);

    // if assigned, we can early-check conflicts (so room doesn't waste time)
    const ok = await assertNoExtendConflictOr409(ag, endDate, res);
    if (!ok) return;

    const updated = await prisma.agreement.update({
      where: { id },
      data: {
        extendStatus: "PENDING",
        extendRequestedEndDate: endDate,
        extendRequestedAt: new Date(),
        extendOfferAmount: offerAmount,
        extendOfferNote: offerNote,
        extendCounterAmount: null,
        extendCounterNote: null,
        extendDecisionAt: null,
      },
    });

    await createAndEmitNotification({
      io,
      type: "AGREEMENT_EXTEND_REQUESTED",
      scope: "ROOM",
      roomId: updated.roomId,
      companyId: updated.companyId,
      payload: {
        v: 1,
        kind: "agreement:extendRequested",
        title: "Sözleşme uzatma teklifi",
        message: `${agreementRef(updated.id)} • yeni bitiş: ${ymdOfDateOnly(updated.extendRequestedEndDate)} • teklif: ${offerSummary(offerAmount, offerNote)}`,
      },
      dedupeKey: `agreement:${updated.id}:extendReq:${ymdOfDateOnly(updated.extendRequestedEndDate)}`,
    });

    io?.to?.(`company:${updated.companyId}`)?.emit?.("agreement:update", { id: updated.id, kind: "extendRequested" });
    io?.to?.(`room:${updated.roomId}`)?.emit?.("agreement:update", { id: updated.id, kind: "extendRequested" });

    await upsertAgreementCommercialBackbone(updated.id).catch(() => null);
    res.json(updated);
  });

  // EXTEND DECISION (ROOM): accept / reject company extend-request
  r.put("/:id/extend-decision", authRequired(), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);
    const ag = await prisma.agreement.findUnique({ where: { id } });
    if (!ag) return sendErrorResponse(res, httpError(404, "notFound"));

    if (req.user.role === "ROOM" && ag.roomId !== req.user.roomId) {
      return sendErrorResponse(res, httpError(403, "Forbidden"));
    }

    const ex = String(ag.extendStatus || "NONE").toUpperCase();
    if (ex !== "PENDING") {
      return sendErrorResponse(res, httpError(409, "AGREEMENT_EXTEND_NOT_PENDING", `extendNotPending:${ex}`));
    }
    if (!ag.extendRequestedEndDate) return sendErrorResponse(res, httpError(400, "extendRequestedEndDate missing"));

    const decision = String(req.body.decision || "").trim().toUpperCase();
    if (decision !== "ACCEPT" && decision !== "REJECT") {
      return sendErrorResponse(res, httpError(400, "decision must be ACCEPT|REJECT"));
    }

    if (decision === "REJECT") {
      const updated = await prisma.agreement.update({
        where: { id },
        data: {
          extendStatus: "NONE",
          extendRequestedEndDate: null,
          extendRequestedAt: null,
          extendOfferAmount: null,
          extendOfferNote: null,
          extendCounterAmount: null,
          extendCounterNote: null,
          extendDecisionAt: new Date(),
        },
      });

      await createAndEmitNotification({
        io,
        type: "AGREEMENT_EXTEND_REJECTED",
        scope: "COMPANY",
        companyId: updated.companyId,
        roomId: updated.roomId,
        payload: {
          v: 1,
          kind: "agreement:extendRejected",
          title: "Uzatma reddedildi",
          message: `${agreementRef(updated.id)} uzatma teklifi reddedildi.`,
        },
        dedupeKey: `agreement:${updated.id}:extendRejected:${Date.now()}`,
      });

      io?.to?.(`company:${updated.companyId}`)?.emit?.("agreement:update", { id: updated.id, kind: "extendRejected" });
      io?.to?.(`room:${updated.roomId}`)?.emit?.("agreement:update", { id: updated.id, kind: "extendRejected" });

      return res.json(updated);
    }

    // ACCEPT: conflict check + apply endDate (+ optional offer update), reactivate if needed
    const proposedEndDate = ag.extendRequestedEndDate;
    const ok = await assertNoExtendConflictOr409(ag, proposedEndDate, res);
    if (!ok) return;

    const offerAmount = ag.extendOfferAmount;
    const offerNote = ag.extendOfferNote;

    const nextStatus = String(ag.status || "").toUpperCase() === "DONE" ? computeReactivatedStatus(ag, proposedEndDate) : ag.status;

    const updated = await prisma.agreement.update({
      where: { id },
      data: {
        endDate: proposedEndDate,
        status: nextStatus,
        // apply offer only if provided
        companyOfferAmount: offerAmount != null ? offerAmount : ag.companyOfferAmount,
        companyOfferNote: offerAmount != null ? (offerNote ?? ag.companyOfferNote ?? null) : ag.companyOfferNote,
        extendStatus: "NONE",
        extendRequestedEndDate: null,
        extendRequestedAt: null,
        extendOfferAmount: null,
        extendOfferNote: null,
        extendCounterAmount: null,
        extendCounterNote: null,
        extendDecisionAt: new Date(),
      },
    });

    await createAndEmitNotification({
      io,
      type: "AGREEMENT_EXTEND_ACCEPTED",
      scope: "COMPANY",
      companyId: updated.companyId,
      roomId: updated.roomId,
      payload: {
        v: 1,
        kind: "agreement:extendAccepted",
        title: "Uzatma kabul edildi",
        message: `${agreementRef(updated.id)} • yeni bitiş: ${ymdOfDateOnly(updated.endDate)}`,
      },
      dedupeKey: `agreement:${updated.id}:extendAccepted:${ymdOfDateOnly(updated.endDate)}`,
    });

    io?.to?.(`company:${updated.companyId}`)?.emit?.("agreement:update", { id: updated.id, kind: "extendAccepted" });
    io?.to?.(`room:${updated.roomId}`)?.emit?.("agreement:update", { id: updated.id, kind: "extendAccepted" });

    await upsertAgreementCommercialBackbone(updated.id).catch(() => null);
    res.json(updated);
  });

  // EXTEND COUNTER (ROOM): counter price for extension (keeps requested endDate)
  r.put("/:id/extend-counter", authRequired(), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);
    const ag = await prisma.agreement.findUnique({ where: { id } });
    if (!ag) return sendErrorResponse(res, httpError(404, "notFound"));

    if (req.user.role === "ROOM" && ag.roomId !== req.user.roomId) {
      return sendErrorResponse(res, httpError(403, "Forbidden"));
    }

    const ex = String(ag.extendStatus || "NONE").toUpperCase();
    if (ex !== "PENDING") {
      return sendErrorResponse(res, httpError(409, "AGREEMENT_EXTEND_NOT_PENDING", `extendNotPending:${ex}`));
    }
    if (!ag.extendRequestedEndDate) return sendErrorResponse(res, httpError(400, "extendRequestedEndDate missing"));

    const amount = parseOfferAmount(req.body.extendCounterAmount);
    if (amount == null) return sendErrorResponse(res, httpError(400, "extendCounterAmount required (>0)"));
    const note = trimOrNull(req.body.extendCounterNote);

    const updated = await prisma.agreement.update({
      where: { id },
      data: {
        extendStatus: "COUNTERED",
        extendCounterAmount: amount,
        extendCounterNote: note,
        extendDecisionAt: new Date(),
      },
    });

    await createAndEmitNotification({
      io,
      type: "AGREEMENT_EXTEND_COUNTERED",
      scope: "COMPANY",
      companyId: updated.companyId,
      roomId: updated.roomId,
      payload: {
        v: 1,
        kind: "agreement:extendCountered",
        title: "Uzatma karşı teklifi",
        message: `${agreementRef(updated.id)} • yeni bitiş: ${ymdOfDateOnly(updated.extendRequestedEndDate)} • karşı teklif: ${offerSummary(updated.extendCounterAmount, updated.extendCounterNote)}`,
      },
      dedupeKey: `agreement:${updated.id}:extendCounter:${ymdOfDateOnly(updated.extendRequestedEndDate)}:${updated.extendCounterAmount}`,
    });

    io?.to?.(`company:${updated.companyId}`)?.emit?.("agreement:update", { id: updated.id, kind: "extendCountered" });
    io?.to?.(`room:${updated.roomId}`)?.emit?.("agreement:update", { id: updated.id, kind: "extendCountered" });

    await upsertAgreementCommercialBackbone(updated.id).catch(() => null);
    res.json(updated);
  });

  // EXTEND ACCEPT COUNTER (COMPANY): accept room counter -> apply endDate and new price
  r.put("/:id/extend-accept-counter", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const id = Number(req.params.id);
    const ag = await prisma.agreement.findUnique({ where: { id } });
    if (!ag) return sendErrorResponse(res, httpError(404, "notFound"));
    if (ag.companyId !== req.user.companyId) return sendErrorResponse(res, httpError(403, "Forbidden"));

    const ex = String(ag.extendStatus || "NONE").toUpperCase();
    if (ex !== "COUNTERED") {
      return sendErrorResponse(res, httpError(409, "AGREEMENT_EXTEND_COUNTER_NOT_PENDING", `extendNotCountered:${ex}`));
    }
    if (!ag.extendRequestedEndDate) return sendErrorResponse(res, httpError(400, "extendRequestedEndDate missing"));
    if (ag.extendCounterAmount == null) return sendErrorResponse(res, httpError(400, "extendCounterAmount missing"));

    const proposedEndDate = ag.extendRequestedEndDate;
    const ok = await assertNoExtendConflictOr409(ag, proposedEndDate, res);
    if (!ok) return;

    const nextStatus = String(ag.status || "").toUpperCase() === "DONE" ? computeReactivatedStatus(ag, proposedEndDate) : ag.status;

    const updated = await prisma.agreement.update({
      where: { id },
      data: {
        endDate: proposedEndDate,
        status: nextStatus,
        companyOfferAmount: ag.extendCounterAmount,
        companyOfferNote: ag.extendCounterNote ?? ag.companyOfferNote ?? null,
        extendStatus: "NONE",
        extendRequestedEndDate: null,
        extendRequestedAt: null,
        extendOfferAmount: null,
        extendOfferNote: null,
        extendCounterAmount: null,
        extendCounterNote: null,
        extendDecisionAt: new Date(),
      },
    });

    await createAndEmitNotification({
      io,
      type: "AGREEMENT_EXTEND_COUNTER_ACCEPTED",
      scope: "ROOM",
      roomId: updated.roomId,
      companyId: updated.companyId,
      payload: {
        v: 1,
        kind: "agreement:extendCounterAccepted",
        title: "Uzatma karşı teklifi kabul edildi",
        message: `${agreementRef(updated.id)} • yeni bitiş: ${ymdOfDateOnly(updated.endDate)} • yeni teklif: ${updated.companyOfferAmount ?? "-"}`,
      },
      dedupeKey: `agreement:${updated.id}:extendCounterAccepted:${ymdOfDateOnly(updated.endDate)}:${updated.companyOfferAmount ?? "X"}`,
    });

    io?.to?.(`company:${updated.companyId}`)?.emit?.("agreement:update", { id: updated.id, kind: "extendCounterAccepted" });
    io?.to?.(`room:${updated.roomId}`)?.emit?.("agreement:update", { id: updated.id, kind: "extendCounterAccepted" });

    await upsertAgreementCommercialBackbone(updated.id).catch(() => null);
    res.json(updated);
  });

  // EXTEND REJECT COUNTER (COMPANY): reject room counter -> back to pending (room can accept original offer or counter again)
  r.put("/:id/extend-reject-counter", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const id = Number(req.params.id);
    const ag = await prisma.agreement.findUnique({ where: { id } });
    if (!ag) return sendErrorResponse(res, httpError(404, "notFound"));
    if (ag.companyId !== req.user.companyId) return sendErrorResponse(res, httpError(403, "Forbidden"));

    const ex = String(ag.extendStatus || "NONE").toUpperCase();
    if (ex !== "COUNTERED") {
      return sendErrorResponse(res, httpError(409, "AGREEMENT_EXTEND_COUNTER_NOT_PENDING", `extendNotCountered:${ex}`));
    }

    const updated = await prisma.agreement.update({
      where: { id },
      data: {
        extendStatus: "PENDING",
        extendCounterAmount: null,
        extendCounterNote: null,
        extendDecisionAt: new Date(),
      },
    });

    await createAndEmitNotification({
      io,
      type: "AGREEMENT_EXTEND_COUNTER_REJECTED",
      scope: "ROOM",
      roomId: updated.roomId,
      companyId: updated.companyId,
      payload: {
        v: 1,
        kind: "agreement:extendCounterRejected",
        title: "Karşı teklif reddedildi",
        message: `${agreementRef(updated.id)} • uzatma teklifi hâlâ beklemede. İstersen kabul et veya yeni karşı teklif gönder.`,
      },
      dedupeKey: `agreement:${updated.id}:extendCounterRejected:${Date.now()}`,
    });

    io?.to?.(`company:${updated.companyId}`)?.emit?.("agreement:update", { id: updated.id, kind: "extendCounterRejected" });
    io?.to?.(`room:${updated.roomId}`)?.emit?.("agreement:update", { id: updated.id, kind: "extendCounterRejected" });

    await upsertAgreementCommercialBackbone(updated.id).catch(() => null);
    res.json(updated);
  });

  // BACKCOMPAT: EXTEND (COMPANY) behaves like extend-request (kept for older UIs)
  r.put("/:id/extend", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const id = Number(req.params.id);
    const ag = await prisma.agreement.findUnique({ where: { id } });
    if (!ag) return sendErrorResponse(res, httpError(404, "notFound"));
    if (ag.companyId !== req.user.companyId) return sendErrorResponse(res, httpError(403, "Forbidden"));

    const st = String(ag.status || "").toUpperCase();
    if (st === "CANCELLED" || st === "REJECTED") {
      return sendErrorResponse(res, httpError(409, "AGREEMENT_INVALID_STATE", `invalidState:${st}`));
    }

    const endDate = parseDateOnly(req.body.endDate);
    if (!endDate) return sendErrorResponse(res, httpError(400, "endDate required (YYYY-MM-DD)"));
    if (endDate < ag.startDate) return sendErrorResponse(res, httpError(400, "endDate must be >= startDate"));
    if (endDate <= ag.endDate) return sendErrorResponse(res, httpError(400, "endDate must be > current endDate"));

    const ex = String(ag.extendStatus || "NONE").toUpperCase();
    if (ex === "COUNTERED") {
      return sendErrorResponse(res, httpError(409, "AGREEMENT_EXTEND_COUNTER_PENDING", "extendCounterPending"));
    }

    const offerAmount = parseOfferAmountNullable(req.body.extendOfferAmount);
    if (String(req.body.extendOfferAmount || "").trim() && offerAmount == null) {
      return sendErrorResponse(res, httpError(400, "extendOfferAmount invalid (>0)"));
    }
    const offerNote = trimOrNull(req.body.extendOfferNote);

    const ok = await assertNoExtendConflictOr409(ag, endDate, res);
    if (!ok) return;

    const updated = await prisma.agreement.update({
      where: { id },
      data: {
        extendStatus: "PENDING",
        extendRequestedEndDate: endDate,
        extendRequestedAt: new Date(),
        extendOfferAmount: offerAmount,
        extendOfferNote: offerNote,
        extendCounterAmount: null,
        extendCounterNote: null,
        extendDecisionAt: null,
      },
    });

    io?.to?.(`company:${updated.companyId}`)?.emit?.("agreement:update", { id: updated.id, kind: "extendRequested" });
    io?.to?.(`room:${updated.roomId}`)?.emit?.("agreement:update", { id: updated.id, kind: "extendRequested" });

    await upsertAgreementCommercialBackbone(updated.id).catch(() => null);
    res.json(updated);
  });


  return r;
}
