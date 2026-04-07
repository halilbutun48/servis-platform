import express from "express";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { atTR, dateOnlyUTCFromYmd, dayBitTRFromYmd, ymdTR } from "../time/tr.js";
import { rebuildShiftRouteStateBestEffort } from "../services/shiftRouteState.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { httpError } from "../errors/http.js";

function toInt(v, def = null) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : def;
}
function toFloat(v, def = null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}
function trimOrNull(v) {
  const s = String(v ?? "").trim();
  return s ? s : null;
}
function parseDateOnly(s) {
  const v = String(s || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return dateOnlyUTCFromYmd(v);
}
function clampMin(v) {
  const n = toInt(v, null);
  if (n == null) return null;
  if (n < 0 || n > 1439) return null;
  return n;
}
function dateAtUtc(dateOnly, min) {
  return atTR(ymdTR(dateOnly), Number(min || 0));
}
function weekdayMask(dateOnly) {
  return dayBitTRFromYmd(ymdTR(dateOnly));
}
function normalizeStops(rawStops) {
  const src = Array.isArray(rawStops) ? rawStops : [];
  const out = [];
  for (let i = 0; i < src.length; i += 1) {
    const row = src[i] || {};
    const name = String(row.name || "").trim();
    const lat = toFloat(row.lat, null);
    const lng = toFloat(row.lng, null);
    if (!name || lat == null || lng == null) continue;
    out.push({
      order: i + 1,
      name,
      address: trimOrNull(row.address),
      lat,
      lng,
      passengerCount: Math.max(1, toInt(row.passengerCount, 1) || 1),
      windowStartMin: clampMin(row.windowStartMin),
      windowEndMin: clampMin(row.windowEndMin),
      note: trimOrNull(row.note),
    });
  }
  return out;
}
async function assertOrganization(req) {
  const companyId = Number(req.user?.companyId || 0);
  if (!companyId) return null;
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, kind: true, hubLat: true, hubLng: true, name: true, regionId: true },
  });
  if (!company || company.kind !== "ORGANIZATION") return null;
  return company;
}


async function loadEligibleRooms(company) {
  return prisma.room.findMany({
    where: { status: "ACTIVE", regionId: company.regionId ?? undefined },
    orderBy: [{ name: "asc" }],
    select: { id: true, name: true, regionId: true, hubLat: true, hubLng: true },
  });
}
async function ensureMarketShiftFromPlan(company, plan) {
  if (plan.publishedShiftId) {
    const existing = await prisma.shift.findUnique({ where: { id: plan.publishedShiftId } });
    if (existing) return existing;
  }
  const startAt = dateAtUtc(plan.planDate, plan.startMin);
  const endAt = dateAtUtc(plan.planDate, plan.endMin);
  const shift = await prisma.$transaction(async (tx) => {
    const created = await tx.shift.create({
      data: {
        companyId: company.id,
        roomId: null,
        startAt,
        endAt,
        status: "REQUESTED",
        hubLat: company.hubLat ?? null,
        hubLng: company.hubLng ?? null,
        direction: "OUTBOUND",
        pattern: "ONE_WAY",
        organizationPlanId: plan.id,
      },
    });
    await tx.stop.createMany({
      data: plan.stops.map((s, idx) => ({ shiftId: created.id, name: s.name, lat: s.lat, lng: s.lng, order: idx + 1, type: "MANUAL" })),
    });
    await tx.organizationPlan.update({ where: { id: plan.id }, data: { status: "SHIFT_PUBLISHED", publishedShiftId: created.id } });
    return created;
  });
  await rebuildShiftRouteStateBestEffort(shift.id);
  return shift;
}

export function organizationRouter(io) {
  const r = express.Router();

  r.use(authRequired(), requireRole("COMPANY"));

  r.get("/rooms", asyncHandler(async (req, res) => {
    const company = await assertOrganization(req);
    if (!company) throw httpError(403, "ORGANIZATION_ONLY", "organizationOnly");
    const items = await loadEligibleRooms(company);
    res.json({ items });
  }));

  r.get("/plans", asyncHandler(async (req, res) => {
    const company = await assertOrganization(req);
    if (!company) throw httpError(403, "ORGANIZATION_ONLY", "organizationOnly");

    const items = await prisma.organizationPlan.findMany({
      where: { companyId: company.id },
      orderBy: [{ id: "desc" }],
      include: { stops: { orderBy: { order: "asc" } } },
    });
    res.json({ items });
  }));

  r.get("/plans/:id", asyncHandler(async (req, res) => {
    const company = await assertOrganization(req);
    if (!company) throw httpError(403, "ORGANIZATION_ONLY", "organizationOnly");

    const id = Number(req.params.id);
    const item = await prisma.organizationPlan.findFirst({
      where: { id, companyId: company.id },
      include: { stops: { orderBy: { order: "asc" } } },
    });
    if (!item) throw httpError(404, "NOT_FOUND", "notFound");
    res.json(item);
  }));

  r.post("/plans", asyncHandler(async (req, res) => {
    const company = await assertOrganization(req);
    if (!company) throw httpError(403, "ORGANIZATION_ONLY", "organizationOnly");

    const title = String(req.body?.title || "").trim();
    const planDate = parseDateOnly(req.body?.planDate);
    const startMin = clampMin(req.body?.startMin);
    const endMin = clampMin(req.body?.endMin);
    const roomId = toInt(req.body?.roomId, null);
    const notes = trimOrNull(req.body?.notes);
    const stops = normalizeStops(req.body?.stops);

    if (!title) throw httpError(400, "TITLE_REQUIRED", "titleRequired");
    if (!planDate) throw httpError(400, "PLAN_DATE_REQUIRED", "planDateRequired");
    if (startMin == null || endMin == null) throw httpError(400, "START_END_MIN_REQUIRED", "startEndMinRequired");
    if (!stops.length) throw httpError(400, "STOPS_REQUIRED", "stopsRequired");

    const created = await prisma.$transaction(async (tx) => {
      const plan = await tx.organizationPlan.create({
        data: {
          companyId: company.id,
          title,
          planDate,
          startMin,
          endMin,
          roomId,
          notes,
          status: "DRAFT",
        },
      });
      await tx.organizationStop.createMany({
        data: stops.map((s) => ({ ...s, planId: plan.id })),
      });
      return tx.organizationPlan.findUnique({
        where: { id: plan.id },
        include: { stops: { orderBy: { order: "asc" } } },
      });
    });

    res.status(201).json(created);
  }));

  r.put("/plans/:id", asyncHandler(async (req, res) => {
    const company = await assertOrganization(req);
    if (!company) throw httpError(403, "ORGANIZATION_ONLY", "organizationOnly");

    const id = Number(req.params.id);
    const existing = await prisma.organizationPlan.findFirst({ where: { id, companyId: company.id } });
    if (!existing) throw httpError(404, "NOT_FOUND", "notFound");

    const title = String(req.body?.title || "").trim();
    const planDate = parseDateOnly(req.body?.planDate);
    const startMin = clampMin(req.body?.startMin);
    const endMin = clampMin(req.body?.endMin);
    const roomId = toInt(req.body?.roomId, null);
    const notes = trimOrNull(req.body?.notes);
    const stops = normalizeStops(req.body?.stops);

    if (!title) throw httpError(400, "TITLE_REQUIRED", "titleRequired");
    if (!planDate) throw httpError(400, "PLAN_DATE_REQUIRED", "planDateRequired");
    if (startMin == null || endMin == null) throw httpError(400, "START_END_MIN_REQUIRED", "startEndMinRequired");
    if (!stops.length) throw httpError(400, "STOPS_REQUIRED", "stopsRequired");

    const updated = await prisma.$transaction(async (tx) => {
      await tx.organizationPlan.update({
        where: { id },
        data: {
          title,
          planDate,
          startMin,
          endMin,
          roomId,
          notes,
        },
      });
      await tx.organizationStop.deleteMany({ where: { planId: id } });
      await tx.organizationStop.createMany({ data: stops.map((s) => ({ ...s, planId: id })) });
      return tx.organizationPlan.findUnique({
        where: { id },
        include: { stops: { orderBy: { order: "asc" } } },
      });
    });

    res.json(updated);
  }));

  r.delete("/plans/:id", asyncHandler(async (req, res) => {
    const company = await assertOrganization(req);
    if (!company) throw httpError(403, "ORGANIZATION_ONLY", "organizationOnly");

    const id = Number(req.params.id);
    const existing = await prisma.organizationPlan.findFirst({ where: { id, companyId: company.id } });
    if (!existing) throw httpError(404, "NOT_FOUND", "notFound");

    const item = await prisma.organizationPlan.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: { stops: { orderBy: { order: "asc" } } },
    });
    res.json(item);
  }));

  r.post("/plans/:id/publish-shift", asyncHandler(async (req, res) => {
    const company = await assertOrganization(req);
    if (!company) throw httpError(403, "ORGANIZATION_ONLY", "organizationOnly");

    const id = Number(req.params.id);
    const plan = await prisma.organizationPlan.findFirst({
      where: { id, companyId: company.id },
      include: { stops: { orderBy: { order: "asc" } } },
    });
    if (!plan) throw httpError(404, "NOT_FOUND", "notFound");
    if (!plan.stops?.length) throw httpError(400, "STOPS_REQUIRED", "stopsRequired");

    const shift = await ensureMarketShiftFromPlan(company, plan);
    io?.to?.(`company:${company.id}`)?.emit?.("organization:plan:update", { id: plan.id, kind: "marketOpened", shiftId: shift.id });
    res.json({ ok: true, shiftId: shift.id, mode: "MARKET" });
  }));

  r.post("/plans/:id/send-offers", asyncHandler(async (req, res) => {
    const company = await assertOrganization(req);
    if (!company) throw httpError(403, "ORGANIZATION_ONLY", "organizationOnly");

    const id = Number(req.params.id);
    const plan = await prisma.organizationPlan.findFirst({
      where: { id, companyId: company.id },
      include: { stops: { orderBy: { order: "asc" } } },
    });
    if (!plan) throw httpError(404, "NOT_FOUND", "notFound");
    if (!plan.stops?.length) throw httpError(400, "STOPS_REQUIRED", "stopsRequired");

    const roomIds = Array.from(new Set((Array.isArray(req.body?.roomIds) ? req.body.roomIds : []).map((x) => Number(x)).filter((x) => Number.isFinite(x))));
    if (!roomIds.length) throw httpError(400, "ROOM_IDS_REQUIRED", "roomIdsRequired");
    const amountCompany = toInt(req.body?.amountCompany, null);
    if (amountCompany == null || amountCompany <= 0) throw httpError(400, "AMOUNT_COMPANY_REQUIRED", "amountCompanyRequired");
    const noteCompany = trimOrNull(req.body?.noteCompany);

    const rooms = await prisma.room.findMany({ where: { id: { in: roomIds }, status: "ACTIVE" }, select: { id: true, name: true } });
    if (rooms.length !== roomIds.length) throw httpError(400, "SOME_ROOMS_NOT_FOUND", "someRoomsNotFound");

    const shift = await ensureMarketShiftFromPlan(company, plan);
    await prisma.$transaction(roomIds.map((roomId) => prisma.shiftOffer.upsert({
      where: { shiftId_roomId: { shiftId: shift.id, roomId } },
      create: { shiftId: shift.id, roomId, status: "OPEN", amountCompany, noteCompany },
      update: { status: "OPEN", amountCompany, noteCompany },
    })));

    io?.to?.(`company:${company.id}`)?.emit?.("organization:plan:update", { id: plan.id, kind: "offersSent", shiftId: shift.id, roomIds });
    for (const roomId of roomIds) {
      io?.to?.(`room:${roomId}`)?.emit?.("offer:update", { shiftId: shift.id, kind: "created" });
    }

    res.json({ ok: true, shiftId: shift.id, roomIds, amountCompany, mode: "DIRECT_OFFERS" });
  }));

  r.post("/plans/:id/create-agreement", asyncHandler(async (req, res) => {
    const company = await assertOrganization(req);
    if (!company) throw httpError(403, "ORGANIZATION_ONLY", "organizationOnly");

    const id = Number(req.params.id);
    const plan = await prisma.organizationPlan.findFirst({
      where: { id, companyId: company.id },
      include: { stops: { orderBy: { order: "asc" } } },
    });
    if (!plan) throw httpError(404, "NOT_FOUND", "notFound");
    if (!plan.roomId) throw httpError(400, "ROOM_ID_REQUIRED", "roomIdRequired");

    const agreement = await prisma.agreement.create({
      data: {
        companyId: company.id,
        roomId: plan.roomId,
        startDate: plan.planDate,
        endDate: plan.planDate,
        weekMask: weekdayMask(plan.planDate),
        startMin: plan.startMin,
        endMin: plan.endMin,
        status: "REQUESTED",
        hubLat: company.hubLat ?? null,
        hubLng: company.hubLng ?? null,
        direction: "OUTBOUND",
        pattern: "ONE_WAY",
        companyOfferAmount: toInt(req.body?.companyOfferAmount, null),
        companyOfferNote: trimOrNull(req.body?.companyOfferNote) || plan.notes,
      },
    });

    await prisma.organizationPlan.update({
      where: { id: plan.id },
      data: { status: "AGREEMENT_REQUESTED", linkedAgreementId: agreement.id },
    });

    io?.to?.(`company:${company.id}`)?.emit?.("organization:plan:update", { id: plan.id, kind: "agreementRequested", agreementId: agreement.id });
    io?.to?.(`room:${plan.roomId}`)?.emit?.("agreement:update", { id: agreement.id, kind: "created" });

    res.json({ ok: true, agreementId: agreement.id });
  }));

  return r;
}
