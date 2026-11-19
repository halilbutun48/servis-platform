import { prisma } from "../src/prisma.js";
import { ENV } from "../src/env.js";
import { hashTelematicsToken } from "../src/telematics/hash.js";
import { ingestTelematicsPosition } from "../src/telematics/service.js";

const FIXTURE_ID = "M18_CANONICAL_DEMO_ROOM_VEHICLE_3_TELEMETRY_V2";
const ROOM_ID = 1;
const VEHICLE_ID = 3;
const SHIFT_ID = 29;
const VENDOR = "GENERIC";
const SERIAL = "M18-CANONICAL-DEMO-ROOM-VEHICLE-3-GPS-V2";
const LABEL = "M18 CANONICAL DEMO SIMULATED TELEMETRY V2";
const RAW_DEVICE_TOKEN = "m18-canonical-demo-room-vehicle-3-gps-v2";
const TELEMETRY_SOURCE = "SIMULATED_DEMO";
const CANONICAL_DATABASE_PATH = "/seferpakt_clean_demo";
const DEMO_POSITION = Object.freeze({ lat: 41.0211, lng: 29.0311, speed: 24 });

function assertDemoRuntime() {
  const dbUrl = String(process.env.DATABASE_URL || "");
  let parsed;
  try {
    parsed = new URL(dbUrl);
  } catch {
    throw new Error("M18_TELEMETRY_FIXTURE_DATABASE_URL_INVALID");
  }
  if (String(process.env.NODE_ENV || "").toLowerCase() !== "development") {
    throw new Error("M18_TELEMETRY_FIXTURE_REQUIRES_DEVELOPMENT");
  }
  if (process.env.LOCAL_MAINTENANCE_MODE !== "1" || process.env.LOCAL_MAINTENANCE_SCOPE !== "DEMO_FIXTURE_ONLY") {
    throw new Error("M18_TELEMETRY_FIXTURE_MAINTENANCE_SCOPE_INVALID");
  }
  if (parsed.hostname !== "db" || parsed.pathname !== CANONICAL_DATABASE_PATH) {
    throw new Error("M18_TELEMETRY_FIXTURE_CANONICAL_DATABASE_REQUIRED");
  }
  if (ENV.TELEMATICS_ENABLED !== true) {
    throw new Error("M18_TELEMETRY_FIXTURE_TELEMATICS_DISABLED");
  }
}

async function readPrerequisites() {
  const [room, vehicle, shift, driver, device] = await Promise.all([
    prisma.room.findUnique({ where: { id: ROOM_ID }, select: { id: true, name: true } }),
    prisma.vehicle.findUnique({ where: { id: VEHICLE_ID }, select: { id: true, roomId: true, plate: true, status: true } }),
    prisma.shift.findFirst({ where: { id: SHIFT_ID, roomId: ROOM_ID, vehicleId: VEHICLE_ID, driverId: { not: null }, status: { in: ["APPROVED", "ACTIVE"] } }, select: { id: true, companyId: true, roomId: true, vehicleId: true, driverId: true, status: true, startAt: true, endAt: true } }),
    prisma.driver.findUnique({ where: { id: 2 }, select: { id: true, roomId: true, fullName: true } }),
    prisma.gpsDevice.findFirst({ where: { vendor: VENDOR, serial: SERIAL }, select: { id: true, vehicleId: true, vendor: true, serial: true, label: true, status: true, lastSeenAt: true, lastIngestAt: true } }),
  ]);
  if (!room || !vehicle || !shift || !driver) throw new Error("M18_TELEMETRY_FIXTURE_PREREQUISITE_MISSING");
  if (vehicle.roomId !== ROOM_ID || shift.roomId !== ROOM_ID || shift.vehicleId !== VEHICLE_ID || shift.driverId !== driver.id || driver.roomId !== ROOM_ID) {
    throw new Error("M18_TELEMETRY_FIXTURE_TENANT_RELATION_INVALID");
  }
  if (device && device.vehicleId !== VEHICLE_ID) throw new Error("M18_TELEMETRY_FIXTURE_DEVICE_OWNERSHIP_CONFLICT");
  return { room, vehicle, shift, driver, device };
}

async function readGpsState() {
  const [gpsLast, gpsState, points, latestPoint, vehicle] = await Promise.all([
    prisma.gpsLast.findUnique({ where: { vehicleId: VEHICLE_ID }, select: { lat: true, lng: true, speed: true, at: true, status: true } }),
    prisma.vehicleGpsState.findUnique({ where: { vehicleId: VEHICLE_ID }, select: { lastUiStatus: true, lastSource: true, lastChangedAt: true, seenLiveAt: true } }),
    prisma.gpsPoint.count({ where: { vehicleId: VEHICLE_ID } }),
    prisma.gpsPoint.findFirst({ where: { vehicleId: VEHICLE_ID }, orderBy: { id: "desc" }, select: { id: true, lat: true, lng: true, speed: true, at: true } }),
    prisma.vehicle.findUnique({ where: { id: VEHICLE_ID }, select: { status: true } }),
  ]);
  return { gpsLast, gpsState, gpsPointCount: points, latestPoint, vehicleStatus: vehicle?.status ?? null };
}

async function ensureDevice(existing) {
  const data = {
    vehicleId: VEHICLE_ID,
    vendor: VENDOR,
    serial: SERIAL,
    label: LABEL,
    status: "ACTIVE",
    authTokenHash: hashTelematicsToken(RAW_DEVICE_TOKEN),
  };
  if (existing) {
    if (existing.vehicleId !== VEHICLE_ID) throw new Error("M18_TELEMETRY_FIXTURE_DEVICE_OWNERSHIP_CONFLICT");
    const changed = Object.entries(data).some(([key, value]) => String(existing[key] ?? "") !== String(value ?? ""));
    return { device: changed ? await prisma.gpsDevice.update({ where: { id: existing.id }, data }) : existing, created: false, changed };
  }
  return { device: await prisma.gpsDevice.create({ data }), created: true, changed: true };
}

function timestampForMode(mode, now = Date.now()) {
  const bucket = Math.floor(now / 30_000) * 30_000;
  if (mode === "STALE") return new Date(bucket - 75_000);
  if (mode === "OFFLINE") return new Date(bucket - 180_000);
  return new Date(bucket - 5_000);
}

async function writeFixtureAudit(action, entity, entityId, meta) {
  await prisma.auditLog.create({
    data: {
      actorUserId: null,
      actorRole: "DEMO_FIXTURE",
      action,
      entity,
      entityId: entityId ?? null,
      meta: meta ?? {},
    },
  });
}

export async function inspectM18RoomVehicle3TelemetryFixture() {
  assertDemoRuntime();
  const preconditions = await readPrerequisites();
  const gps = await readGpsState();
  return {
    fixtureId: FIXTURE_ID,
    roomId: ROOM_ID,
    vehicleId: VEHICLE_ID,
    shiftId: SHIFT_ID,
    vendor: VENDOR,
    serial: SERIAL,
    label: LABEL,
    sourceType: TELEMETRY_SOURCE,
    preconditions,
    before: gps,
    gpsThresholds: { liveSec: ENV.GPS_STALE_SEC, offlineSec: ENV.GPS_OFFLINE_SEC },
    writeScope: "ONE_CANONICAL_DEMO_DEVICE_AND_TELEMETRY_INGEST",
    rollbackScope: "RESTORE_VEHICLE_GPS_STATE_AND_REMOVE_ONLY_POST_SNAPSHOT_FIXTURE_POINTS",
  };
}

export async function applyM18RoomVehicle3TelemetryFixture({ mode = "LIVE" } = {}) {
  const normalizedMode = String(mode || "LIVE").trim().toUpperCase();
  if (!["LIVE", "STALE", "OFFLINE"].includes(normalizedMode)) throw new Error("M18_TELEMETRY_FIXTURE_MODE_INVALID");
  const inspected = await inspectM18RoomVehicle3TelemetryFixture();
  const ensured = await ensureDevice(inspected.preconditions.device);
  const device = ensured.device;
  if (ensured.changed) {
    await writeFixtureAudit("M18_DEMO_TELEMETRY_DEVICE_READY", "GpsDevice", device.id, {
      fixtureId: FIXTURE_ID,
      vehicleId: VEHICLE_ID,
      source: TELEMETRY_SOURCE,
      created: ensured.created,
      idempotencyKey: `${FIXTURE_ID}:DEVICE:${device.id}`,
    });
  }
  const at = timestampForMode(normalizedMode);
  const io = { to: () => ({ emit: () => {} }) };
  const ingest = await ingestTelematicsPosition(io, { ...device, vehicle: inspected.preconditions.vehicle }, {
    vehicleId: VEHICLE_ID,
    lat: DEMO_POSITION.lat,
    lng: DEMO_POSITION.lng,
    speed: DEMO_POSITION.speed,
    at,
    provider: "generic",
    source: TELEMETRY_SOURCE,
  });
  const after = await readGpsState();
  return {
    fixtureId: FIXTURE_ID,
    mode: normalizedMode,
    roomId: ROOM_ID,
    vehicleId: VEHICLE_ID,
    shiftId: SHIFT_ID,
    deviceId: device.id,
    vendor: VENDOR,
    serial: SERIAL,
    label: LABEL,
    sourceType: TELEMETRY_SOURCE,
    position: DEMO_POSITION,
    timestamp: at.toISOString(),
    before: inspected.before,
    ingest,
    after,
    gpsThresholds: { liveSec: ENV.GPS_STALE_SEC, offlineSec: ENV.GPS_OFFLINE_SEC },
    deviceCreated: ensured.created,
    deviceChanged: ensured.changed,
    repeatKey: `${FIXTURE_ID}:${normalizedMode}:${at.toISOString()}`,
    externalSideEffects: false,
    businessWriteBoundary: "TELEMETRY_FIXTURE_ONLY; SEFER_ABI_NO_BUSINESS_WRITE",
    rollbackScope: "RESTORE_VEHICLE_GPS_STATE_AND_REMOVE_ONLY_POST_SNAPSHOT_FIXTURE_POINTS",
  };
}

export async function rollbackM18RoomVehicle3TelemetryFixture({ snapshot } = {}) {
  assertDemoRuntime();
  if (!snapshot?.before) throw new Error("M18_TELEMETRY_FIXTURE_ROLLBACK_SNAPSHOT_REQUIRED");
  const before = snapshot.before;
  const current = await readGpsState();
  const firstNewPointId = Number(before.latestPoint?.id || 0);
  const newPoints = firstNewPointId
    ? await prisma.gpsPoint.findMany({ where: { vehicleId: VEHICLE_ID, id: { gt: firstNewPointId } }, select: { id: true } })
    : [];
  if (newPoints.length) await prisma.gpsPoint.deleteMany({ where: { id: { in: newPoints.map((point) => point.id) } } });
  if (before.gpsLast) await prisma.gpsLast.upsert({ where: { vehicleId: VEHICLE_ID }, update: before.gpsLast, create: { vehicleId: VEHICLE_ID, ...before.gpsLast } });
  else await prisma.gpsLast.deleteMany({ where: { vehicleId: VEHICLE_ID } });
  if (before.gpsState) await prisma.vehicleGpsState.upsert({ where: { vehicleId: VEHICLE_ID }, update: before.gpsState, create: { vehicleId: VEHICLE_ID, ...before.gpsState } });
  else await prisma.vehicleGpsState.deleteMany({ where: { vehicleId: VEHICLE_ID } });
  if (before.vehicleStatus) await prisma.vehicle.update({ where: { id: VEHICLE_ID }, data: { status: before.vehicleStatus } });
  if (snapshot.deviceCreated) await prisma.gpsDevice.deleteMany({ where: { id: Number(snapshot.deviceId || 0), vehicleId: VEHICLE_ID, serial: SERIAL } });
  await writeFixtureAudit("M18_DEMO_TELEMETRY_ROLLBACK", "Vehicle", VEHICLE_ID, {
    fixtureId: FIXTURE_ID,
    source: TELEMETRY_SOURCE,
    removedGpsPointCount: newPoints.length,
    beforePointId: firstNewPointId || null,
    currentPointId: current.latestPoint?.id || null,
  });
  return { ok: true, fixtureId: FIXTURE_ID, vehicleId: VEHICLE_ID, removedGpsPointCount: newPoints.length, externalSideEffects: false };
}

export { DEMO_POSITION, FIXTURE_ID, LABEL, ROOM_ID, SERIAL, SHIFT_ID, TELEMETRY_SOURCE, VEHICLE_ID, VENDOR };
