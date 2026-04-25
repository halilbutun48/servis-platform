import crypto from "node:crypto";
import { prisma } from "../prisma.js";
import { ENV } from "../env.js";
import { haversineKm } from "../geo.js";
import { gpsStatusFromAt } from "../gps/status.js";
import { isProductionLike } from "../auth/securityPolicy.js";
import { getRedis } from "../redis/index.js";
import { hashTelematicsToken } from "./hash.js";

function distanceMeters(aLat, aLng, bLat, bLng) {
  return haversineKm(aLat, aLng, bLat, bLng) * 1000;
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

function timingSafeHexEqual(left, right) {
  const a = Buffer.from(String(left || "").trim(), "hex");
  const b = Buffer.from(String(right || "").trim(), "hex");
  if (!a.length || !b.length || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function normalizeProviderName(provider) {
  return String(provider || "").trim().toLowerCase();
}

function resolveVendorSecret(provider) {
  const key = normalizeProviderName(provider);
  const perProvider =
    key === "traccar"
      ? String(ENV.TELEMATICS_VENDOR_SECRET_TRACCAR || "").trim()
      : key === "generic"
        ? String(ENV.TELEMATICS_VENDOR_SECRET_GENERIC || "").trim()
        : "";
  if (perProvider) return { secret: perProvider, source: "provider" };

  const legacy = String(ENV.TELEMATICS_VENDOR_SHARED_SECRET || "").trim();
  if (legacy && ENV.TELEMATICS_VENDOR_SHARED_SECRET_LEGACY_ALLOWED && !isProductionLike()) {
    return { secret: legacy, source: "legacy" };
  }

  return { secret: "", source: null };
}

function readVendorTimestamp(req) {
  const raw = String(req.get("x-telematics-timestamp") || req.get("x-telematics-ts") || "").trim();
  if (!raw) return null;
  if (/^\d{10,13}$/.test(raw)) {
    const ms = raw.length === 10 ? Number(raw) * 1000 : Number(raw);
    return Number.isFinite(ms) ? ms : null;
  }
  const parsed = new Date(raw);
  const ms = parsed.getTime();
  return Number.isFinite(ms) ? ms : null;
}

function readVendorSignature(req) {
  return String(req.get("x-telematics-signature") || req.get("x-telematics-signature-v1") || "").trim();
}

function buildVendorSignatureBase(provider, normalized, timestampMs) {
  const atIso = normalized?.at instanceof Date
    ? normalized.at.toISOString()
    : normalized?.at
      ? new Date(normalized.at).toISOString()
      : "";

  return [
    normalizeProviderName(provider),
    String(timestampMs || 0),
    String(normalized?.serial || ""),
    atIso,
    String(normalized?.lat ?? ""),
    String(normalized?.lng ?? ""),
    String(normalized?.speed ?? ""),
    String(normalized?.heading ?? ""),
    String(normalized?.accuracy ?? ""),
    String(normalized?.provider || ""),
    String(normalized?.source || ""),
  ].join("|");
}

export async function verifyVendorWebhookAuth({ provider, normalized, req }) {
  const resolved = resolveVendorSecret(provider);
  if (!resolved.secret) {
    return { ok: false, status: 503, code: "VENDOR_SECRET_NOT_CONFIGURED" };
  }

  const timestampMs = readVendorTimestamp(req);
  if (!timestampMs) {
    return { ok: false, status: 400, code: "VENDOR_TIMESTAMP_REQUIRED" };
  }

  const clockSkewMs = Math.max(30_000, Number(ENV.TELEMATICS_VENDOR_REPLAY_WINDOW_SEC || 300) * 1000);
  if (Math.abs(Date.now() - timestampMs) > clockSkewMs) {
    return { ok: false, status: 401, code: "VENDOR_TIMESTAMP_OUT_OF_RANGE" };
  }

  const signature = readVendorSignature(req);
  if (!signature) {
    return { ok: false, status: 401, code: "VENDOR_SIGNATURE_REQUIRED" };
  }

  const expected = crypto
    .createHmac("sha256", resolved.secret)
    .update(buildVendorSignatureBase(provider, normalized, timestampMs), "utf8")
    .digest("hex");

  if (!timingSafeHexEqual(expected, signature)) {
    return { ok: false, status: 401, code: "VENDOR_UNAUTHORIZED" };
  }

  const redis = getRedis();
  if (!redis?.send) {
    return { ok: false, status: 503, code: "VENDOR_REPLAY_GUARD_UNAVAILABLE" };
  }

  const replayKey = `telematics:vendor:replay:v1:${normalizeProviderName(provider)}:${sha256Hex(`${timestampMs}:${signature}:${buildVendorSignatureBase(provider, normalized, timestampMs)}`)}`;
  try {
    const ttlSec = Math.max(60, Number(ENV.TELEMATICS_VENDOR_REPLAY_WINDOW_SEC || 300) + 30);
    const claimed = await redis.send("SET", replayKey, "1", "NX", "EX", String(ttlSec));
    if (String(claimed || "").toUpperCase() !== "OK") {
      return { ok: false, status: 401, code: "VENDOR_REPLAY_DETECTED" };
    }
  } catch {
    return { ok: false, status: 503, code: "VENDOR_REPLAY_GUARD_UNAVAILABLE" };
  }

  return { ok: true, secretSource: resolved.source, timestampMs };
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
