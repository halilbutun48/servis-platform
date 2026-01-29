// backend/src/routes/shifts.helpers.js
// shifts.js içindeki yardımcı fonksiyonları ayrı dosyaya alır (satır sayısını azaltmak için)

import { prisma } from "../prisma.js";

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
  io.to(`room:${shift.roomId}`).emit(event, base);
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

export async function getShiftAndCheckScopeOrThrow(shiftId, user) {
  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!shift) {
    const e = new Error("Shift not found");
    e.status = 404;
    throw e;
  }

  if (user.role === "SUPER_ADMIN") return shift;

  if (user.role === "ROOM") {
    if (!user.roomId || user.roomId !== shift.roomId) {
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
    return { delegate: _ReqDelegate, latField: _ReqLatField, lngField: _ReqLngField, statusField: _ReqStatusField };
  }

  // Yoksa request dene
  if (prisma.request) {
    _ReqDelegate = prisma.request;
    _ReqLatField = "lat";
    _ReqLngField = "lng";
    _ReqStatusField = "status";
    return { delegate: _ReqDelegate, latField: _ReqLatField, lngField: _ReqLngField, statusField: _ReqStatusField };
  }

  // Yeni schema isimleri olabilir (personelRequest vb). En azından crash olmasın.
  // Burada sadece fail fast.
  const e = new Error("Request delegate not found (pickupRequest/request)");
  e.status = 500;
  throw e;
}
