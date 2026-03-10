import { prisma } from "../prisma.js";
import { ENV } from "../env.js";
import { haversineKm } from "../geo.js";
import { gpsStatusFromAt } from "../gps/status.js";
import { hashTelematicsToken } from "./hash.js";

function distanceMeters(aLat, aLng, bLat, bLng) {
  return haversineKm(aLat, aLng, bLat, bLng) * 1000;
}

async function writeAudit({ action, entity, entityId, meta }) {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: null,
        actorRole: "DEVICE",
        action,
        entity,
        entityId: entityId ?? null,
        meta: meta ?? {},
      },
    });
  } catch {}
}

export function readDeviceToken(req) {
  const auth = String(req.get("authorization") || "").trim();
  const m = auth.match(/^Device\s+(.+)$/i);
  if (m?.[1]) return String(m[1]).trim();
  const alt = String(req.get("x-device-key") || "").trim();
  return alt || null;
}

export function readProviderSecret(req) {
  const auth = String(req.get("authorization") || "").trim();
  const m = auth.match(/^Provider\s+(.+)$/i);
  if (m?.[1]) return String(m[1]).trim();
  const alt = String(req.get("x-telematics-secret") || "").trim();
  return alt || null;
}

export async function findDeviceByToken(rawToken) {
  if (!rawToken) return null;
  const authTokenHash = hashTelematicsToken(rawToken);
  return prisma.gpsDevice.findUnique({
    where: { authTokenHash },
    include: { vehicle: true },
  });
}

export async function findDeviceBySerial({ provider, serial }) {
  const vendor = String(provider || "").trim().toUpperCase();
  const serialNorm = String(serial || "").trim();
  if (!serialNorm) return null;

  let device = await prisma.gpsDevice.findFirst({
    where: { vendor, serial: serialNorm },
    include: { vehicle: true },
  });
  if (device) return device;

  return prisma.gpsDevice.findFirst({
    where: { serial: serialNorm },
    include: { vehicle: true },
  });
}

export async function ingestTelematicsPosition(io, device, normalized) {
  const at = normalized.at instanceof Date ? normalized.at : new Date(normalized.at || Date.now());
  if (Number.isNaN(at.getTime())) {
    const e = new Error("invalid at");
    e.status = 400;
    throw e;
  }

  const vehicleId = Number(device?.vehicleId || normalized.vehicleId || 0);
  if (!vehicleId) {
    const e = new Error("vehicle not resolved");
    e.status = 400;
    throw e;
  }
  if (String(device?.status || "") !== "ACTIVE") {
    const e = new Error("device disabled");
    e.status = 403;
    throw e;
  }

  const vehicle = device.vehicle || (await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { id: true, plate: true, roomId: true, speedLimitKmh: true },
  }));
  if (!vehicle) {
    const e = new Error("vehicle not found");
    e.status = 404;
    throw e;
  }

  const lat = Number(normalized.lat);
  const lng = Number(normalized.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    const e = new Error("lat/lng required");
    e.status = 400;
    throw e;
  }

  const last = await prisma.gpsLast.findUnique({ where: { vehicleId } });
  const prevAtMs = last?.at ? new Date(last.at).getTime() : 0;
  const sameAt = !!prevAtMs && prevAtMs === at.getTime();
  const distM = last ? distanceMeters(last.lat, last.lng, lat, lng) : Infinity;
  const deduped = !!last && sameAt && distM <= 5;

  let historyWritten = false;
  if (!deduped) {
    const ageSec = last ? Math.abs(at.getTime() - prevAtMs) / 1000 : Infinity;
    const minSec = Math.max(0, Number(ENV.TELEMATICS_HISTORY_MIN_SEC || 0));
    const minMeters = Math.max(0, Number(ENV.TELEMATICS_HISTORY_MIN_METERS || 0));
    const skipHistory = !!last && ageSec < minSec && distM < minMeters;
    if (!skipHistory) {
      await prisma.gpsPoint.create({
        data: {
          vehicleId,
          lat,
          lng,
          speed: typeof normalized.speed === "number" ? normalized.speed : null,
          at,
        },
      });
      historyWritten = true;
    }
  }

  const gpsLast = await prisma.gpsLast.upsert({
    where: { vehicleId },
    update: {
      lat,
      lng,
      speed: typeof normalized.speed === "number" ? normalized.speed : null,
      at,
      status: "OK",
    },
    create: {
      vehicleId,
      lat,
      lng,
      speed: typeof normalized.speed === "number" ? normalized.speed : null,
      at,
      status: "OK",
    },
  });

  await prisma.vehicle.update({ where: { id: vehicleId }, data: { status: "ACTIVE" } });
  await prisma.gpsDevice.update({
    where: { id: device.id },
    data: { lastSeenAt: new Date(), lastIngestAt: at },
  });

  const { status: uiStatus, ageSec } = gpsStatusFromAt(gpsLast.at);
  const rel = await prisma.shift.findMany({
    where: {
      vehicleId,
      status: { in: ["APPROVED", "ACTIVE"] },
      startAt: { lte: at },
      endAt: { gte: at },
    },
    select: { companyId: true },
  });
  const companyIds = [...new Set(rel.map((x) => x.companyId).filter(Boolean))];

  const payload = {
    vehicleId,
    plate: vehicle.plate,
    lat,
    lng,
    speed: typeof normalized.speed === "number" ? normalized.speed : null,
    at: at.toISOString(),
    status: uiStatus,
    ageSec,
    source: normalized.source || "DEVICE",
    telematics: {
      deviceId: device.id,
      provider: normalized.provider || null,
      serial: device.serial,
      historyWritten,
      deduped,
    },
  };

  io.to(`vehicle:${vehicleId}`).emit("gps:update", payload);
  io.to(`vehicle:${vehicleId}`).emit("telematics:update", payload);
  io.to(`room:${vehicle.roomId}`).emit("gps:update", payload);
  io.to(`room:${vehicle.roomId}`).emit("telematics:update", payload);
  for (const cid of companyIds) {
    io.to(`company:${cid}`).emit("gps:update", payload);
    io.to(`company:${cid}`).emit("telematics:update", payload);
  }

  await writeAudit({
    action: normalized.source === "VENDOR" ? "GPS_VENDOR_INGEST" : "GPS_DEVICE_INGEST",
    entity: "Vehicle",
    entityId: vehicleId,
    meta: {
      provider: normalized.provider || null,
      deviceId: device.id,
      serial: device.serial,
      source: normalized.source || "DEVICE",
      historyWritten,
      deduped,
      lat,
      lng,
      at: at.toISOString(),
    },
  });

  return {
    ok: true,
    vehicleId,
    deviceId: device.id,
    provider: normalized.provider || null,
    source: normalized.source || "DEVICE",
    at: at.toISOString(),
    historyWritten,
    deduped,
    companyIds,
  };
}
