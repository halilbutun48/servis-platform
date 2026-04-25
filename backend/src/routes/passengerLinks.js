import express from "express";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { authRequired, requireRole, requireStepUpWrite } from "../auth/middleware.js";
import { haversineKm, etaMinutes } from "../geo.js";

function sha256Hex(s) {
  return crypto.createHash("sha256").update(String(s || ""), "utf8").digest("hex");
}

function randomToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function computeEtaTo(last, targetLat, targetLng) {
  if (!last || typeof last.lat !== "number" || typeof last.lng !== "number") return null;
  if (typeof targetLat !== "number" || typeof targetLng !== "number") return null;
  const speedKmh = typeof last.speed === "number" && last.speed > 1 ? last.speed : 30;
  const km = haversineKm(last.lat, last.lng, targetLat, targetLng);
  return { km: Number(km.toFixed(2)), etaMin: Number(etaMinutes(km, speedKmh).toFixed(0)) };
}

const PASSENGER_LIVE_SHIFT_INCLUDE = {
  vehicle: { include: { gpsLast: true, gpsState: true } },
  room: { select: { id: true, name: true } },
  company: { select: { id: true, name: true, kind: true } },
  stops: { orderBy: { order: "asc" } },
};

function computeStopProgress(stops, myStopId) {
  const arr = Array.isArray(stops) ? stops.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : [];
  const pending = arr.filter((s) => s?.state === "PENDING");
  const next = pending[0] || null;
  const remainingStopsTotal = pending.length;
  const myStop = myStopId ? arr.find((s) => Number(s.id) === Number(myStopId)) || null : null;
  const myStopReached = myStop ? myStop.state === "REACHED" : null;

  let remainingStopsToMine = null;
  if (myStop) {
    if (myStopReached) remainingStopsToMine = 0;
    else if (next) {
      const from = next.order;
      const to = myStop.order;
      remainingStopsToMine = pending.filter((s) => s.order >= from && s.order <= to).length;
    } else {
      remainingStopsToMine = 0;
    }
  }

  return {
    nextStop: next ? { id: next.id, name: next.name, order: next.order, type: next.type } : null,
    remainingStopsTotal,
    myStop: myStop ? { id: myStop.id, name: myStop.name, order: myStop.order, lat: myStop.lat, lng: myStop.lng } : null,
    remainingStopsToMine,
    myStopReached,
  };
}

function pickBestStop(shift, personel, assignedStop) {
  if (assignedStop) return assignedStop;
  const stops = Array.isArray(shift?.stops) ? shift.stops : [];
  if (!stops.length) return null;
  if (typeof personel?.homeLat !== "number" || typeof personel?.homeLng !== "number") return stops[0] || null;

  let best = null;
  for (const st of stops) {
    if (typeof st.lat !== "number" || typeof st.lng !== "number") continue;
    const km = haversineKm(personel.homeLat, personel.homeLng, st.lat, st.lng);
    if (!best || km < best.km) best = { km, stop: st };
  }
  return best?.stop || stops[0] || null;
}

async function ensureShiftScope(shiftId, user) {
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    select: { id: true, companyId: true, endAt: true, startAt: true },
  });
  if (!shift) throw Object.assign(new Error("Shift not found"), { status: 404 });
  if (user.role !== "COMPANY" || !user.companyId || Number(user.companyId) !== Number(shift.companyId)) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
  return shift;
}

async function resolvePreferredPersonelShift({ companyId, personelId, now }) {
  if (!companyId || !personelId) return null;
  return prisma.shift.findFirst({
    where: {
      companyId,
      status: { in: ["APPROVED", "ACTIVE"] },
      vehicleId: { not: null },
      startAt: { lte: now },
      endAt: { gte: now },
      OR: [
        { people: { some: { personelId } } },
        { assignments: { some: { personelId } } },
      ],
    },
    orderBy: [{ startAt: "desc" }, { id: "desc" }],
    include: PASSENGER_LIVE_SHIFT_INCLUDE,
  });
}

const createSchema = z.object({
  shiftId: z.coerce.number().int().positive(),
  personelId: z.coerce.number().int().positive(),
  expiresAt: z.string().datetime().optional(),
  ttlDays: z.coerce.number().int().min(1).max(365).optional(),
  ttlHours: z.coerce.number().int().min(1).max(8760).optional(), // backward compatible
});

export function passengerLinksRouter() {
  const r = express.Router();
  r.use(authRequired(), requireRole("COMPANY"), requireStepUpWrite("COMPANY"));

  r.get("/", async (req, res) => {
    try {
      const shiftId = req.query.shiftId ? Number(req.query.shiftId) : null;
      const personelId = req.query.personelId ? Number(req.query.personelId) : null;

      const where = {
        shift: { companyId: req.user.companyId ?? -1 },
      };
      if (shiftId) where.shiftId = shiftId;
      if (personelId) where.personelId = personelId;

      const items = await prisma.passengerLiveLink.findMany({
        where,
        orderBy: [{ revokedAt: "asc" }, { createdAt: "desc" }],
        take: 200,
        include: {
          personel: { select: { id: true, fullName: true, phone: true } },
          shift: { select: { id: true, startAt: true, endAt: true, status: true } },
        },
      });

      return res.json({
        ok: true,
        items: items.map((x) => ({
          id: x.id,
          shiftId: x.shiftId,
          personelId: x.personelId,
          createdAt: x.createdAt,
          expiresAt: x.expiresAt,
          revokedAt: x.revokedAt,
          lastViewedAt: x.lastViewedAt,
          shift: x.shift,
          personel: x.personel,
        })),
      });
    } catch (e) {
      return res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
    }
  });

  r.post("/", async (req, res) => {
    try {
      const body = createSchema.parse(req.body ?? {});
      await ensureShiftScope(body.shiftId, req.user);

      const exists = await prisma.personel.findFirst({
        where: {
          id: body.personelId,
          companyId: req.user.companyId ?? -1,
          OR: [
            { shiftLinks: { some: { shiftId: body.shiftId } } },
            { assignments: { some: { shiftId: body.shiftId } } },
          ],
        },
        select: { id: true },
      });
      if (!exists) return res.status(404).json({ error: "Personel not linked to shift" });

      const now = new Date();
      let expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
      if (!expiresAt || Number.isNaN(expiresAt.getTime())) {
        const ttlDays = body.ttlDays && Number.isFinite(body.ttlDays) ? Number(body.ttlDays) : null;
        const ttlHours = body.ttlHours && Number.isFinite(body.ttlHours) ? Number(body.ttlHours) : null;
        if (ttlDays) expiresAt = new Date(now.getTime() + ttlDays * 24 * 3600_000);
        else if (ttlHours) expiresAt = new Date(now.getTime() + ttlHours * 3600_000);
        else expiresAt = new Date(now.getTime() + 7 * 24 * 3600_000);
      }
      if (expiresAt.getTime() <= now.getTime()) return res.status(400).json({ error: "expiresAt must be in the future" });

      await prisma.passengerLiveLink.updateMany({
        where: { shiftId: body.shiftId, personelId: body.personelId, revokedAt: null, expiresAt: { gt: now } },
        data: { revokedAt: now },
      });

      const rawToken = randomToken();
      const created = await prisma.passengerLiveLink.create({
        data: {
          shiftId: body.shiftId,
          personelId: body.personelId,
          tokenHash: sha256Hex(rawToken),
          expiresAt,
        },
      });

      try {
        await prisma.auditLog.create({
          data: {
            actorUserId: req.user.id,
            actorRole: req.user.role,
            action: "PASSENGER_LINK_CREATE",
            entity: "PassengerLiveLink",
            entityId: created.id,
            meta: { shiftId: body.shiftId, personelId: body.personelId, expiresAt, ttlDays: body.ttlDays ?? null, ttlHours: body.ttlHours ?? null },
          },
        });
      } catch {}

      return res.json({ ok: true, item: { id: created.id, shiftId: created.shiftId, personelId: created.personelId, expiresAt: created.expiresAt, createdAt: created.createdAt }, token: rawToken });
    } catch (e) {
      return res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
    }
  });

  r.post('/:id/revoke', async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ error: 'badId' });
      const row = await prisma.passengerLiveLink.findFirst({
        where: { id, shift: { companyId: req.user.companyId ?? -1 } },
        select: { id: true, revokedAt: true },
      });
      if (!row) return res.status(404).json({ error: 'notFound' });
      await prisma.passengerLiveLink.update({ where: { id }, data: { revokedAt: row.revokedAt || new Date() } });
      try {
        await prisma.auditLog.create({
          data: { actorUserId: req.user.id, actorRole: req.user.role, action: 'PASSENGER_LINK_REVOKE', entity: 'PassengerLiveLink', entityId: id },
        });
      } catch {}
      return res.json({ ok: true, id });
    } catch (e) {
      return res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
    }
  });

  return r;
}

export function publicPassengerLiveRouter() {
  const r = express.Router();

  r.get('/', async (req, res) => {
    try {
      const token = String(req.query.token || '').trim();
      if (!token) return res.status(400).json({ error: 'TOKEN_REQUIRED' });
      const tokenHash = sha256Hex(token);
      const row = await prisma.passengerLiveLink.findUnique({
        where: { tokenHash },
        include: {
          shift: { include: PASSENGER_LIVE_SHIFT_INCLUDE },
          personel: { select: { id: true, fullName: true, phone: true, homeLat: true, homeLng: true, homeAddress: true } },
        },
      });

      if (!row) return res.status(404).json({ error: 'LINK_NOT_FOUND' });
      if (row.revokedAt) return res.status(410).json({ error: 'LINK_REVOKED' });
      if (row.expiresAt && new Date(row.expiresAt).getTime() <= Date.now()) return res.status(410).json({ error: 'LINK_EXPIRED' });

      const personel = row.personel;
      const preferredShift = await resolvePreferredPersonelShift({
        companyId: row.shift.companyId,
        personelId: personel.id,
        now: new Date(),
      });
      const shift = preferredShift || row.shift;

      const assign = await prisma.stopAssignment.findFirst({
        where: { shiftId: shift.id, personelId: personel.id },
        include: { stop: true },
      });
      const myStop = pickBestStop(shift, personel, assign?.stop || null);
      const eta = computeEtaTo(shift.vehicle?.gpsLast, myStop?.lat ?? null, myStop?.lng ?? null);
      const progress = computeStopProgress(shift.stops, myStop?.id ?? null);

      const now = new Date();
      const phase = now < shift.startAt ? 'SCHEDULED' : now > shift.endAt ? 'ENDED' : 'LIVE';

      try {
        await prisma.passengerLiveLink.update({ where: { id: row.id }, data: { lastViewedAt: new Date() } });
      } catch {}

      return res.json({
  ok: true,
  phase,
  shift: {
    id: shift.id,
    status: shift.status,
    startAt: shift.startAt,
    endAt: shift.endAt,
  },
  company: shift.company,
  room: shift.room,
  personel: { id: personel.id, fullName: personel.fullName },
  vehicle: shift.vehicle
    ? {
        id: shift.vehicle.id,
        plate: shift.vehicle.plate,
        gpsLast: shift.vehicle.gpsLast,
        gpsState: shift.vehicle.gpsState,
      }
    : null,
  stop: progress.myStop,
  stops: (shift.stops || []).map((s) => ({
    id: s.id,
    name: s.name,
    lat: s.lat,
    lng: s.lng,
    order: s.order,
    type: s.type,
    state: s.state,
  })),
  nextStop: progress.nextStop,
  remainingStopsTotal: progress.remainingStopsTotal,
  remainingStopsToMine: progress.remainingStopsToMine,
  myStopReached: progress.myStopReached,
  etaMin: eta?.etaMin ?? null,
  etaKm: eta?.km ?? null,
});
    } catch (e) {
      return res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
    }
  });

  return r;
}
