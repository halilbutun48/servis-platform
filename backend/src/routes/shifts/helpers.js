// backend/src/routes/shifts.helpers.js
// shifts.js iÃ§indeki yardÄ±mcÄ± fonksiyonlarÄ± ayrÄ± dosyaya alÄ±r (satÄ±r sayÄ±sÄ±nÄ± azaltmak iÃ§in)

import prisma from "../../prisma.js";
import { listAgreementRouteRefreshRequests } from "../../services/agreementRouteRefreshStore.js";

export function isEditableStatus(status) {
  return status === "DRAFT" || status === "REQUESTED";
}

export function trimOrNull(s) {
  const t = String(s ?? "").trim();
  return t ? t : null;
}

export function parseDateOrThrow(s, fieldName) {
  const d = new Date(s);
  if (!d || Number.isNaN(d.getTime())) {
    const e = new Error(`Invalid date for ${fieldName}`);
    e.status = 400;
    throw e;
  }
  return d;
}

// WS helper
export function emitShift(io, shift, event, payload = {}) {
  if (!io || !shift) return;
  const base = { shiftId: shift.id, ...payload };
  io.to(`company:${shift.companyId}`).emit(event, base);
  // âœ… M24: market shift olabilir (roomId null)
  if (shift.roomId) io.to(`room:${shift.roomId}`).emit(event, base);
  io.to(`shift:${shift.id}`).emit(event, base);
}

// --- M7 helpers ---
export function haversineM(aLat, aLng, bLat, bLng) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function clusterPoints(points, radiusM) {
  const left = new Set(points.map((_, i) => i));
  const clusters = [];

  while (left.size) {
    const seed = left.values().next().value;
    left.delete(seed);

    const q = [seed];
    const members = [seed];

    while (q.length) {
      const i = q.shift();
      for (const j of Array.from(left)) {
        const d = haversineM(points[i].lat, points[i].lng, points[j].lat, points[j].lng);
        if (d <= radiusM) {
          left.delete(j);
          q.push(j);
          members.push(j);
        }
      }
    }
    clusters.push(members);
  }

  return clusters;
}

export async function getShiftAndCheckScopeOrThrow(shiftId, user, opts = {}) {
  // opts is mostly Prisma findUnique args (include/select, etc).
  // We also allow a custom flag for ROOM access via marketplace offers.
  const { allowRoomOfferScope = false, allowRoomRouteRefreshScope = false, ...prismaOpts } = opts || {};

  const shift = await prisma.shift.findUnique({ where: { id: shiftId }, ...(prismaOpts || {}) });
  if (!shift) {
    const e = new Error("Shift not found");
    e.status = 404;
    throw e;
  }

  if (user.role === "SUPER_ADMIN") return shift;

  if (user.role === "ROOM") {
    const roomId = user.roomId ? Number(user.roomId) : null;
    if (!roomId) {
      const e = new Error("Forbidden");
      e.status = 403;
      throw e;
    }

    // Normal scope: shift already assigned to this room
    if (roomId === shift.roomId) return shift;

    // Optional scope: allow ROOM to read market/offered shifts BEFORE assignment
    // only if there is an active offer (OPEN/COUNTERED/ACCEPTED) for this room.
    if (allowRoomOfferScope) {
      const offer = await prisma.shiftOffer.findFirst({
        where: {
          shiftId: shift.id,
          roomId,
          status: { in: ["OPEN", "COUNTERED", "ACCEPTED"] },
        },
        select: { id: true },
      });
      if (offer) return shift;
    }

    // Optional scope: allow ROOM to preview pending agreement route-refresh draft/source shifts
    // from the room's own decision surface before the draft shift is formally assigned.
    if (allowRoomRouteRefreshScope) {
      const items = await listAgreementRouteRefreshRequests({ roomId, status: "PENDING" });
      const match = items.find((item) => {
        const sourceShiftId = Number(item?.sourceShiftId || 0);
        const draftIds = Array.isArray(item?.draftShiftIds)
          ? item.draftShiftIds.map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)
          : [];
        return sourceShiftId === Number(shift.id) || draftIds.includes(Number(shift.id));
      });
      if (match) return shift;
    }

    const e = new Error("Forbidden");
    e.status = 403;
    throw e;
  }

  

  if (user.role === "DRIVER") {
    const drv = await prisma.driver.findFirst({ where: { userId: user.id }, select: { id: true } });
    if (!drv || !shift.driverId || shift.driverId !== drv.id) {
      const e = new Error("Forbidden");
      e.status = 403;
      throw e;
    }
    return shift;
  }
if (user.role === "COMPANY") {
    if (!user.companyId || user.companyId !== shift.companyId) {
      const e = new Error("Forbidden");
      e.status = 403;
      throw e;
    }
    return shift;
  }

  const e = new Error("Forbidden");
  e.status = 403;
  throw e;
}

// --- M7: Request delegate detect (prisma.request olmayabilir) ---
let _ReqDelegate = null;
let _ReqLatField = "lat";
let _ReqLngField = "lng";
let _ReqStatusField = "status";

export async function getRequestDelegateOrThrow() {
  // PickupRequest varsa HER ZAMAN onu kullan
  if (prisma.pickupRequest) {
    _ReqDelegate = prisma.pickupRequest;
    _ReqLatField = "lat";
    _ReqLngField = "lng";
    _ReqStatusField = "status";
    return {
      delegate: _ReqDelegate,
      d: _ReqDelegate,
      Req: _ReqDelegate,
      latField: _ReqLatField,
      lngField: _ReqLngField,
      statusField: _ReqStatusField,
      latF: _ReqLatField,
      lngF: _ReqLngField,
      statusF: _ReqStatusField,
    };
  }

  // Yoksa request dene
  if (prisma.request) {
    _ReqDelegate = prisma.request;
    _ReqLatField = "lat";
    _ReqLngField = "lng";
    _ReqStatusField = "status";
    return {
      delegate: _ReqDelegate,
      d: _ReqDelegate,
      Req: _ReqDelegate,
      latField: _ReqLatField,
      lngField: _ReqLngField,
      statusField: _ReqStatusField,
      latF: _ReqLatField,
      lngF: _ReqLngField,
      statusF: _ReqStatusField,
    };
  }

  // Yeni schema isimleri olabilir (personelRequest vb). En azÄ±ndan crash olmasÄ±n.
  // Burada sadece fail fast.
  const e = new Error("Request delegate not found (pickupRequest/request)");
  e.status = 500;
  throw e;
}


// Robust resolver for scripts/routes that expect {d, latF, lngF, statusF}
export async function resolveRequestDelegateSafe() {
  let Req = null;
  let latF = "lat";
  let lngF = "lng";
  let statusF = "status";

  try {
    const d = await getRequestDelegateOrThrow();
    Req = d?.d ?? d?.Req ?? d?.delegate ?? null;
    latF = d?.latF ?? d?.latField ?? latF;
    lngF = d?.lngF ?? d?.lngField ?? lngF;
    statusF = d?.statusF ?? d?.statusField ?? statusF;
  } catch {
    // ignore; fallback below
  }

  // Fallback: canonical model (routes/requests.js ile uyumlu)
  if (!Req || typeof Req.findMany !== "function") {
    Req = prisma.pickupRequest ?? prisma.request ?? null;
    latF = "lat";
    lngF = "lng";
    statusF = "status";
  }

  return { Req, latF, lngF, statusF };
}

// =======================
// Shared list filters
// =======================
// build Prisma where for /api/shifts (ROOM/COMPANY/SUPER_ADMIN)
export function buildShiftsWhereFromQuery(query, user) {
  const where = {};

  // Scope
  if (user?.role === "ROOM") {
    if (!user.roomId) throw Object.assign(new Error("Forbidden"), { status: 403 });
    where.roomId = user.roomId;
  } else if (user?.role === "COMPANY") {
    if (!user.companyId) throw Object.assign(new Error("Forbidden"), { status: 403 });
    where.companyId = user.companyId;
  } else if (user?.role === "SUPER_ADMIN") {
    const qRoomId = Number(query?.roomId);
    const qCompanyId = Number(query?.companyId);
    if (Number.isFinite(qRoomId)) where.roomId = qRoomId;
    if (Number.isFinite(qCompanyId)) where.companyId = qCompanyId;
  } else {
    // should never happen because route guard exists, but keep safe
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }

  // Filters
  const statusRaw = (query?.status ?? "").toString().trim();
  const onlyOpen = String(query?.onlyOpen ?? "").trim() === "1";
  const includeDrafts = String(query?.includeDrafts ?? "").trim() === "1";

  if (statusRaw) {
    let statuses = statusRaw
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    if (!includeDrafts && (user?.role === "COMPANY" || user?.role === "SUPER_ADMIN")) {
      statuses = statuses.filter((s) => s !== "DRAFT");
      if (!statuses.length) {
        where.id = -1;
        return where;
      }
    }
    if (statuses.length === 1) where.status = statuses[0];
    else if (statuses.length > 1) where.status = { in: statuses };
  } else if (onlyOpen) {
    where.status = { in: ["REQUESTED", "APPROVED", "ACTIVE"] };
  } else if (!includeDrafts && (user?.role === "COMPANY" || user?.role === "SUPER_ADMIN")) {
    where.status = { not: "DRAFT" };
  }

  const driverId = Number(query?.driverId);
  if (Number.isFinite(driverId)) where.driverId = driverId;

  const vehicleId = Number(query?.vehicleId);
  if (Number.isFinite(vehicleId)) where.vehicleId = vehicleId;

  const from = query?.from ? new Date(String(query.from)) : null;
  const to = query?.to ? new Date(String(query.to)) : null;
  const hasFrom = from && !Number.isNaN(from.getTime());
  const hasTo = to && !Number.isNaN(to.getTime());
  if (hasFrom || hasTo) {
    where.startAt = {};
    if (hasFrom) where.startAt.gte = from;
    if (hasTo) where.startAt.lte = to;
  }

  return where;
}

// =======================
// Identity helpers (used by /api/shifts/my)
// =======================
export async function getDriverIdOrThrow(user) {
  const row = await prisma.driver.findFirst({ where: { userId: user.id }, select: { id: true } });
  if (!row?.id) throw Object.assign(new Error("Driver profile missing"), { status: 400 });
  return row.id;
}

export async function getPersonelIdOrThrow(user) {
  const row = await prisma.personel.findFirst({ where: { userId: user.id }, select: { id: true } });
  if (!row?.id) throw Object.assign(new Error("Personel profile missing"), { status: 400 });
  return row.id;
}

// Build payload for /api/shifts/my. Keep response stable for scripts + UI.
export async function getMyShiftPayload(query, user) {
  const take = Math.min(200, Math.max(1, Number(query?.take ?? 50)));
  const onlyOpen = String(query?.onlyOpen ?? "1") === "1";

  // Common include (UI expects stops+progress)
  const include = {
    stops: { orderBy: { order: "asc" } },
    progress: true,
    vehicle: { include: { gpsLast: true, gpsState: true } },
    driver: true,
    company: true,
    room: true,
  };

  if (user.role === "DRIVER") {
    const driverId = await getDriverIdOrThrow(user);
    const where = { driverId };
    if (onlyOpen) where.status = { in: ["APPROVED", "ACTIVE"] };
    return {
      items: await prisma.shift.findMany({ where, include, orderBy: { id: "desc" }, take }),
    };
  }

  if (user.role === "PERSONEL") {
    const personelId = await getPersonelIdOrThrow(user);
    // shifts where personel has a pickupRequest
    const reqs = await prisma.pickupRequest.findMany({
      where: { personelId },
      select: { shiftId: true },
      distinct: ["shiftId"],
    });
    const shiftIds = (reqs ?? []).map((r) => r.shiftId).filter((x) => Number.isFinite(x));
    if (!shiftIds.length) return { items: [] };
    const where = { id: { in: shiftIds } };
    if (onlyOpen) where.status = { in: ["REQUESTED", "APPROVED", "ACTIVE"] };
    return {
      items: await prisma.shift.findMany({ where, include, orderBy: { id: "desc" }, take }),
    };
  }

  // For ROOM/COMPANY/SUPER_ADMIN, behave like list (scoped) for convenience.
  const where = buildShiftsWhereFromQuery(query, user);
  return {
    items: await prisma.shift.findMany({ where, include, orderBy: { id: "desc" }, take }),
  };
}

// =======================
// Company offer helpers
// =======================

/**
 * Validates company offer update intent and returns a normalized patch.
 * NOTE: Route layer already runs Zod; this is a second safety net + normalization.
 */
export function validateOfferInputOrThrow({ shift, user, data }) {
  if (!data || typeof data !== "object") {
    throw Object.assign(new Error("Invalid offer payload"), { status: 400 });
  }

  // prevent updates after decision or after shift finished
  if (shift?.status && ["ACTIVE", "DONE", "CANCELLED"].includes(shift.status)) {
    throw Object.assign(new Error("Cannot update offer for active/done shift"), { status: 400 });
  }
  if (shift?.roomOfferDecision && ["ACCEPTED", "REJECTED"].includes(shift.roomOfferDecision)) {
    throw Object.assign(new Error("Room already decided on offer"), { status: 400 });
  }

  const patch = {};
  if (Object.prototype.hasOwnProperty.call(data, "companyOfferVehicleId")) {
    patch.companyOfferVehicleId = data.companyOfferVehicleId;
  }
  if (Object.prototype.hasOwnProperty.call(data, "companyOfferAmount")) {
    patch.companyOfferAmount = data.companyOfferAmount;
  }
  if (Object.prototype.hasOwnProperty.call(data, "companyOfferNote")) {
    patch.companyOfferNote = data.companyOfferNote;
  }

  if (!Object.keys(patch).length) {
    throw Object.assign(new Error("At least one field required"), { status: 400 });
  }

  // stamp offer time whenever anything changes
  patch.companyOfferAt = new Date();
  return patch;
}

/**
 * Permission/business rule gate for company offer update.
 * Scope/company ownership is already checked by getShiftAndCheckScopeOrThrow().
 */
export function canCompanyUpdateOfferOrThrow(shift, user) {
  if (!shift) throw Object.assign(new Error("Shift not found"), { status: 404 });
  // defensive: ensure company role
  if (user?.role !== "COMPANY" && user?.role !== "SUPER_ADMIN") {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
  // Disallow editing once shift is running/closed
  if (["ACTIVE", "DONE", "CANCELLED"].includes(shift.status)) {
    throw Object.assign(new Error("Cannot update offer at this stage"), { status: 400 });
  }
  return true;
}

/**
 * Keeps patching logic in one place (future: can include additional derived fields).
 */
export function patchShiftFromOffer(patch) {
  return patch;
}
